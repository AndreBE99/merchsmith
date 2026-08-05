/* ============================================================
   chat.js — shared org chat: bottom-right launcher, conversation
   list, thread view, plus a global slide-out profile pane.
   Include after identity.js on any live page.
   Exposes window.MSChat.open(), .openPerson(id), .openProfile(id).
   ============================================================ */
(function(){
  if(window.MSChat) return;

  /* ---- mock directory, keyed by identity; who you can chat with ---- */
  const ME = { name:'You', initial:'JD' };
  const PEOPLE = [
    { id:'cara',  name:'Cara Lyon',  role:'Account Manager', org:'mojo (your team)', accent:'#7b85c5', online:true,  last:'Proof’s back from studio 👍', when:'2m', unread:2 },
    { id:'raf',   name:'Raf Price',  role:'Senior Designer', org:'mojo (your team)', accent:'#c66a4a', online:true,  last:'Uploading v2 now', when:'18m', unread:0 },
    { id:'ben',   name:'Ben Shaw',   role:'Account Manager', org:'mojo (your team)', accent:'#51768c', online:false, last:'Can you confirm the Lumen date?', when:'1h', unread:0 },
    { id:'sara',  name:'Sara Kemp',  role:'Head of Brand · Northwind', org:'Northwind Ltd', accent:'#3a9d6b', online:true,  last:'Approved the tote — thanks!', when:'3h', unread:0 },
    { id:'tom',   name:'Tom Reed',   role:'Production · BagWorks', org:'BagWorks UK', accent:'#8246af', online:false, last:'Stock confirmed, reserving to Fri', when:'1d', unread:0 },
    { id:'sarah', name:'Sarah Hill', role:'Account Mgr · PrintHouse', org:'PrintHouse Studio', accent:'#2f8f5b', online:false, last:'Setup quote attached', when:'2d', unread:0 }
  ];
  const byId = id => PEOPLE.find(p=>p.id===id);
  const THREADS = {
    cara:[ {me:0,t:'Hey — studio sent the Tote proof back.',w:'09:14'},{me:0,t:'Proof’s back from studio 👍',w:'09:15'} ],
    raf:[ {me:1,t:'How’s the mouse artwork looking?',w:'08:40'},{me:0,t:'Uploading v2 now',w:'08:52'} ],
    ben:[ {me:0,t:'Can you confirm the Lumen date?',w:'Yesterday'} ],
    sara:[ {me:0,t:'The Recycled Cotton Tote proof is ready for you.',w:'06:02'},{me:1,t:'Approved the tote — thanks!',w:'06:30'} ],
    tom:[ {me:0,t:'Stock confirmed, reserving to Fri',w:'Mon'} ],
    sarah:[ {me:0,t:'Setup quote attached',w:'Fri'} ]
  };
  const av = n => { const u=window.MSAvatar&&MSAvatar.url(n); return u?`<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(); };
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');

  const css = `
  .chat-fab{position:fixed;bottom:24px;right:24px;z-index:130;width:58px;height:58px;border-radius:50%;border:0;background:var(--periwinkle-deep,#4a4ac2);color:#fff;box-shadow:0 10px 28px rgba(40,44,80,.34);cursor:pointer;display:grid;place-items:center;transition:transform .16s;}
  .chat-fab:hover{transform:scale(1.06);}
  .chat-fab svg{width:25px;height:25px;}
  .chat-fab .fab-b{position:absolute;top:-2px;right:-2px;background:var(--flare,#d2453a);color:#fff;font-size:11px;font-weight:800;border-radius:999px;min-width:20px;height:20px;display:grid;place-items:center;border:2px solid #fff;padding:0 4px;}
  .chat-panel{position:fixed;bottom:24px;right:24px;z-index:131;width:min(380px,92vw);height:min(560px,78vh);background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(20,22,45,.3);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.98);opacity:0;pointer-events:none;transition:transform .22s cubic-bezier(.4,0,.2,1),opacity .22s;}
  .chat-panel.on{transform:none;opacity:1;pointer-events:auto;}
  .chat-hd{background:var(--periwinkle-deep,#4a4ac2);color:#fff;padding:15px 18px;display:flex;align-items:center;gap:11px;}
  .chat-hd .back{background:none;border:0;color:#fff;cursor:pointer;display:none;padding:0;}
  .chat-hd.thread .back{display:grid;place-items:center;}
  .chat-hd h3{margin:0;font-size:16px;font-weight:700;flex:1;font-family:var(--sans);}
  .chat-hd .sub{font-size:11.5px;opacity:.8;font-weight:500;}
  .chat-hd .x{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1;opacity:.85;}
  .chat-hd .hav{width:34px;height:34px;border-radius:50%;display:none;place-items:center;font-size:12px;font-weight:800;color:#fff;flex:none;}
  .chat-hd.thread .hav{display:grid;}
  .chat-list{flex:1;overflow-y:auto;}
  .chat-search{padding:10px 14px;border-bottom:1px solid var(--line-soft,#e7e4dd);}
  .chat-search input{width:100%;border:1px solid var(--line-soft,#e7e4dd);border-radius:9px;padding:8px 12px;font:inherit;font-size:13px;outline:none;}
  .chat-search input:focus{border-color:var(--periwinkle);}
  .chat-row{display:flex;align-items:center;gap:11px;padding:11px 15px;cursor:pointer;border-bottom:1px solid var(--paper-2,#f1efe8);}
  .chat-row:hover{background:var(--paper,#f6f4ee);}
  .chat-av{position:relative;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;flex:none;}
  .chat-av .dot{position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;border:2px solid #fff;background:var(--muted);}
  .chat-av .dot.on{background:#3a9d6b;}
  .chat-meta{flex:1;min-width:0;}
  .chat-meta b{font-size:13.5px;display:block;}
  .chat-meta .last{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chat-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;}
  .chat-side .when{font-size:11px;color:var(--muted);}
  .chat-side .unread{background:var(--periwinkle-deep);color:#fff;font-size:10.5px;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;}
  .chat-thread{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:9px;background:var(--paper,#f6f4ee);}
  .chat-msg{max-width:78%;padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.45;}
  .chat-msg.them{align-self:flex-start;background:#fff;border:1px solid var(--line-soft,#e7e4dd);border-bottom-left-radius:5px;}
  .chat-msg.me{align-self:flex-end;background:var(--periwinkle-deep,#4a4ac2);color:#fff;border-bottom-right-radius:5px;}
  .chat-msg .w{display:block;font-size:10px;opacity:.6;margin-top:3px;}
  .chat-compose{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line-soft,#e7e4dd);}
  .chat-compose input{flex:1;border:1px solid var(--line-soft,#e7e4dd);border-radius:999px;padding:10px 15px;font:inherit;font-size:13.5px;outline:none;}
  .chat-compose input:focus{border-color:var(--periwinkle);}
  .chat-compose button{border:0;background:var(--periwinkle-deep,#4a4ac2);color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;display:grid;place-items:center;flex:none;}

  /* profile slide-out */
  .prof-scrim{position:fixed;inset:0;background:rgba(22,24,28,.4);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .25s;z-index:140;}
  .prof-scrim.on{opacity:1;pointer-events:auto;}
  .prof-pane{position:fixed;top:0;right:0;height:100vh;width:min(380px,92vw);background:#fff;box-shadow:-14px 0 44px rgba(20,22,45,.2);transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);z-index:141;display:flex;flex-direction:column;}
  .prof-pane.on{transform:none;}
  .prof-top{padding:26px 24px;text-align:center;border-bottom:1px solid var(--line-soft,#e7e4dd);position:relative;}
  .prof-top .x{position:absolute;top:14px;right:16px;border:0;background:none;font-size:20px;color:var(--muted);cursor:pointer;}
  .prof-big{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:26px;margin:0 auto 12px;position:relative;}
  .prof-big .dot{position:absolute;bottom:4px;right:4px;width:16px;height:16px;border-radius:50%;border:3px solid #fff;background:var(--muted);}
  .prof-big .dot.on{background:#3a9d6b;}
  .prof-top h3{margin:0;font-family:var(--serif,Georgia);font-weight:500;font-size:22px;}
  .prof-top .role{font-size:13px;color:var(--text-soft,#6d685f);margin-top:3px;}
  .prof-top .org{font-size:12px;color:var(--muted);margin-top:1px;}
  .prof-act{display:flex;gap:10px;padding:18px 24px;}
  .prof-act button{flex:1;border:0;border-radius:11px;padding:11px;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;}
  .prof-chat{background:var(--periwinkle-deep,#4a4ac2);color:#fff;}
  .prof-email{background:var(--paper-2,#f1efe8);color:var(--ink);}
  .prof-body{flex:1;overflow-y:auto;padding:6px 24px 30px;}
  .prof-sec{padding:16px 0;border-top:1px solid var(--line-soft,#e7e4dd);}
  .prof-sec h4{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);}
  .prof-kv{display:grid;grid-template-columns:90px 1fr;gap:8px 12px;font-size:13.5px;}
  .prof-kv .k{color:var(--text-soft,#6d685f);}
  .prof-kv .v{font-weight:600;color:var(--ink);}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  const ICN={ chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/></svg>',
    back:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    send:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>' };

  let panel, fab, curId=null;
  function totalUnread(){ return PEOPLE.reduce((a,p)=>a+(p.unread||0),0); }

  function build(){
    fab=document.createElement('button'); fab.className='chat-fab'; fab.title='Messages';
    const u=totalUnread();
    fab.innerHTML=ICN.chat+(u?`<span class="fab-b">${u}</span>`:'');
    fab.onclick=toggle; document.body.appendChild(fab);

    panel=document.createElement('div'); panel.className='chat-panel';
    document.body.appendChild(panel);
    renderList();
  }
  function toggle(){ panel.classList.contains('on')?close():open(); }
  function open(){ if(curId) renderThread(curId); else renderList(); panel.classList.add('on'); }
  function close(){ panel.classList.remove('on'); }

  function renderList(){
    curId=null;
    panel.innerHTML=`
      <div class="chat-hd"><h3>Messages</h3><button class="x" data-x>&times;</button></div>
      <div class="chat-search"><input placeholder="Search people…" id="chatSearch"></div>
      <div class="chat-list" id="chatList"></div>`;
    const list=panel.querySelector('#chatList');
    const draw=(q='')=>{ list.innerHTML=PEOPLE.filter(p=>p.name.toLowerCase().includes(q)||p.org.toLowerCase().includes(q)).map(p=>`
      <div class="chat-row" data-open="${p.id}">
        <span class="chat-av" style="background:${p.accent}">${av(p.name)}<span class="dot ${p.online?'on':''}"></span></span>
        <span class="chat-meta"><b>${esc(p.name)}</b><span class="last">${esc(p.last)}</span></span>
        <span class="chat-side"><span class="when">${p.when}</span>${p.unread?`<span class="unread">${p.unread}</span>`:''}</span>
      </div>`).join(''); };
    draw();
    panel.querySelector('#chatSearch').oninput=e=>draw(e.target.value.toLowerCase());
    panel.querySelector('[data-x]').onclick=close;
    list.onclick=e=>{ const r=e.target.closest('[data-open]'); if(r) openPerson(r.dataset.open); };
  }

  function renderThread(id){
    const p=byId(id); if(!p) return renderList();
    curId=id; p.unread=0; refreshFab();
    const msgs=THREADS[id]||[];
    panel.innerHTML=`
      <div class="chat-hd thread">
        <button class="back" data-back>${ICN.back}</button>
        <span class="hav" style="background:${p.accent}">${av(p.name)}</span>
        <div style="flex:1"><h3 style="font-size:15px">${esc(p.name)}</h3><div class="sub">${p.online?'Online':'Offline'} · ${esc(p.role)}</div></div>
        <button class="x" data-x>&times;</button>
      </div>
      <div class="chat-thread" id="chatThread">${msgs.map(m=>`<div class="chat-msg ${m.me?'me':'them'}">${esc(m.t)}<span class="w">${m.w}</span></div>`).join('')}</div>
      <div class="chat-compose"><input id="chatInput" placeholder="Message ${esc(p.name.split(' ')[0])}…"><button data-send>${ICN.send}</button></div>`;
    const thread=panel.querySelector('#chatThread'); thread.scrollTop=thread.scrollHeight;
    panel.querySelector('[data-back]').onclick=renderList;
    panel.querySelector('[data-x]').onclick=close;
    const input=panel.querySelector('#chatInput'), send=()=>{ const v=input.value.trim(); if(!v)return; (THREADS[id]=THREADS[id]||[]).push({me:1,t:v,w:'now'}); p.last=v; p.when='now'; input.value=''; const t=panel.querySelector('#chatThread'); t.insertAdjacentHTML('beforeend',`<div class="chat-msg me">${esc(v)}<span class="w">now</span></div>`); t.scrollTop=t.scrollHeight; };
    panel.querySelector('[data-send]').onclick=send;
    input.addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
    input.focus();
  }
  function refreshFab(){ const u=totalUnread(); fab.innerHTML=ICN.chat+(u?`<span class="fab-b">${u}</span>`:''); }
  function openPerson(id){ if(!panel) build(); renderThread(id); panel.classList.add('on'); }

  /* ---- profile slide-out (global) ---- */
  let scrim, pane;
  function buildProfile(){
    scrim=document.createElement('div'); scrim.className='prof-scrim'; document.body.appendChild(scrim);
    pane=document.createElement('aside'); pane.className='prof-pane'; document.body.appendChild(pane);
    scrim.onclick=closeProfile;
  }
  function openProfile(idOrPerson){
    const p = typeof idOrPerson==='string' ? (byId(idOrPerson)|| {name:idOrPerson, role:'', org:'', accent:'#7b85c5'}) : idOrPerson;
    if(!pane) buildProfile();
    pane.innerHTML=`
      <div class="prof-top"><button class="x" data-px>&times;</button>
        <div class="prof-big" style="background:${p.accent||'#7b85c5'}">${av(p.name)}<span class="dot ${p.online?'on':''}"></span></div>
        <h3>${esc(p.name)}</h3><div class="role">${esc(p.role||'')}</div><div class="org">${esc(p.org||'')}</div></div>
      <div class="prof-act">
        <button class="prof-chat" data-pchat="${p.id||''}">${ICN.chat.replace('stroke-width="2"','stroke-width="2" width="16" height="16"')}Chat</button>
        <button class="prof-email">Email</button>
      </div>
      <div class="prof-body">
        <div class="prof-sec"><h4>Contact</h4><div class="prof-kv">
          <span class="k">Status</span><span class="v">${p.online?'Online now':'Offline'}</span>
          <span class="k">Email</span><span class="v">${(p.id||'name')}@${(p.org||'org').toLowerCase().includes('mojo')?'mojo.co':'company.com'}</span>
          <span class="k">Organisation</span><span class="v">${esc(p.org||'—')}</span>
        </div></div>
        <div class="prof-sec"><h4>Role</h4><div class="prof-kv">
          <span class="k">Title</span><span class="v">${esc(p.role||'—')}</span>
        </div></div>
      </div>`;
    pane.querySelector('[data-px]').onclick=closeProfile;
    const ch=pane.querySelector('[data-pchat]'); if(ch) ch.onclick=()=>{ closeProfile(); if(p.id) openPerson(p.id); else { if(!panel)build(); open(); } };
    scrim.classList.add('on'); pane.classList.add('on');
  }
  function closeProfile(){ if(pane){ pane.classList.remove('on'); scrim.classList.remove('on'); } }

  // delegate: any avatar with [data-person] opens that person's profile
  document.addEventListener('click', e=>{
    const a=e.target.closest('[data-person]'); if(a){ e.stopPropagation(); openProfile(a.dataset.person); }
  });

  window.MSChat={ open:()=>{ if(!panel)build(); open(); }, openPerson, openProfile, people:PEOPLE };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
