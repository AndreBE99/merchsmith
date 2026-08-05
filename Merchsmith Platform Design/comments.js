/* ============================================================
   Merchsmith — shared product activity drawer
   Comments + Activity history in one right-hand slide-over.
   Self-contained: injects styles + markup, seeds threads &
   history, wires the comment icons, auto-logs status changes.
   Include AFTER the page's main script:  <script src="comments.js"></script>
   Page must expose: window.ordered, window.commentCellHTML,
   window.__currentModalProduct (optional).
   Public: window.MSlog(p,{type,icon,label,who}), window.MSlatest(p),
           window.__openComments(p).
   ============================================================ */
(function(){
  if(window.__msComments) return; window.__msComments = true;

  const PEOPLE = [
    {n:'Jess Doyle', img:'assets/avatars/av1.jpg', role:'Buyer'},
    {n:'Mara Kessler', img:'assets/avatars/av2.jpg', role:'Account Manager'},
    {n:'Alex Stone', img:'assets/avatars/av3.jpg', role:'Studio'}
  ];
  const first = w => (PEOPLE[w]||PEOPLE[0]).n.split(' ')[0];

  // ---- seed comment threads ----
  const SNIPPETS = [
    [0,'Can we push the logo a touch larger on the front?'],
    [2,'Updated proof attached — bumped it ~12%. Let me know.'],
    [1,'Pricing looks good against budget. Happy to proceed.'],
    [0,'Lovely, thanks both. Approving the design now.'],
    [2,'Stock confirmed with the supplier for the full run.'],
    [1,'Sample is on its way — should land Thursday.'],
    [0,'Quick one: can we do a recycled mailer for this?'],
    [2,'Yes — switched the spec to 100% recycled board.']
  ];
  const DAYS = ['Mon 18 Aug','Tue 19 Aug','Wed 20 Aug','Thu 21 Aug','Fri 22 Aug'];
  function seedThread(p, i){
    const total = p.comments ? (p.comments.unread||0)+(p.comments.read||0) : 0;
    const n = Math.min(8, Math.max(total, p.comments?2:0));
    const msgs = [];
    for(let k=0;k<n;k++){
      const s = SNIPPETS[(i*3+k)%SNIPPETS.length];
      msgs.push({ who:s[0], text:s[1], time:`${DAYS[(i+k)%DAYS.length]}, ${9+((i+k)%8)}:${(k*7+10)%60<10?'0':''}${(k*7+10)%60}` });
    }
    p.thread = msgs;
    p.unreadCount = p.comments && p.comments.unread ? p.comments.unread : 0;
  }
  // ---- seed activity history ----
  function seedHistory(p, i){
    const h=[{who:1, type:'added', icon:'ic-plus', label:'added this product to the project', time:`Mon 18 Aug, 09:0${i%6}`}];
    const ev=[
      {who:2, type:'status', icon:'ic-clock', label:'started the design with the studio', time:'Mon 18 Aug, 11:20'},
      {who:0, type:'comment', icon:'ic-chat', label:'left a comment', time:'Tue 19 Aug, 09:14'},
      {who:2, type:'status', icon:'ic-hourglass', label:'submitted the proof for approval', time:'Wed 20 Aug, 15:40'},
      {who:1, type:'status', icon:'ic-check', label:'approved the price', time:'Thu 21 Aug, 10:05'}
    ];
    for(let k=0;k<((i%4)+1);k++) h.push(ev[k]);
    if(p.status.type==='order') h.push({who:1, type:'status', icon:'ic-bag', label:'marked this ready to order', time:'Fri 22 Aug, 14:10'});
    if(p.status.type==='pause') h.push({who:1, type:'paused', icon:'ic-pause', label:'paused this product', time:'Fri 22 Aug, 16:30'});
    if(p.status.type==='archived') h.push({who:1, type:'archived', icon:'ic-archive', label:'archived this product', time:'Tue 12 Aug, 09:00'});
    p.history=h;
  }
  (window.ordered||[]).forEach((p,i)=>{ seedThread(p,i); seedHistory(p,i); });

  // ---- project-level entity (whole project thread + activity) ----
  const projName = (document.querySelector('.ptitle')||{}).textContent || 'Project';
  const project = {
    name: projName, isProject:true, comments:{read:4},
    thread:[
      {who:1, text:'Welcome team — let’s get this project moving.', time:'Mon 18 Aug, 09:05'},
      {who:0, text:'Thanks Mara. I’ve added the first six products.', time:'Mon 18 Aug, 09:12'},
      {who:2, text:'Studio’s on the cable and mouse designs this week.', time:'Tue 19 Aug, 10:20'},
      {who:1, text:'Great — budget is £2,500 across the project, keep an eye on the totals.', time:'Tue 19 Aug, 10:24'}
    ],
    history:[
      {who:0, type:'added', icon:'ic-plus', label:'created the project', time:'Mon 18 Aug, 09:00'},
      {who:0, type:'status', icon:'ic-box', label:'added 6 products', time:'Mon 18 Aug, 09:11'},
      {who:1, type:'status', icon:'ic-chat', label:'invited Alex Stone (Studio)', time:'Mon 18 Aug, 09:30'},
      {who:2, type:'status', icon:'ic-clock', label:'started design on 2 products', time:'Tue 19 Aug, 10:15'}
    ]
  };

  const css = `
  .cdrawer{position:fixed;inset:0;z-index:120;display:none;}
  .cdrawer.open{display:block;}
  .cdrawer-scrim{position:absolute;inset:0;background:rgba(60,66,121,.4);opacity:0;transition:opacity .25s;}
  .cdrawer.open .cdrawer-scrim{opacity:1;}
  .cdrawer-panel{position:absolute;top:0;right:0;height:100%;width:392px;max-width:92vw;background:#fff;display:flex;flex-direction:column;
    box-shadow:-14px 0 40px rgba(20,22,45,.18);transform:translateX(100%);transition:transform .3s cubic-bezier(.22,.61,.36,1);}
  .cdrawer.open .cdrawer-panel{transform:none;}
  .cd-head{display:flex;align-items:center;gap:13px;padding:20px 22px 16px;}
  .cd-head .thumb{width:44px;height:44px;border-radius:10px;background:#fff;border:1px solid var(--line-soft);display:grid;place-items:center;overflow:hidden;flex:none;}
  .cd-head .thumb img{width:100%;height:100%;object-fit:contain;padding:4px;}
  .cd-head .ttl{flex:1;min-width:0;}
  .cd-head .ttl .nm{font-weight:700;font-size:15px;line-height:1.25;}
  .cd-head .ttl .sub{font-size:12px;color:var(--muted);font-weight:600;}
  .cd-close{width:34px;height:34px;border-radius:50%;border:0;background:var(--paper-2);color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none;transition:background .15s,transform .15s;}
  .cd-close:hover{background:var(--flare);color:#fff;transform:rotate(90deg);}
  .cd-close .icn{width:16px;height:16px;}
  .cd-tabs{display:flex;gap:6px;padding:0 16px;border-bottom:1px solid var(--line-soft);background:#fff;}
  .cd-tab{flex:1;text-align:center;padding:11px 8px;font-weight:700;font-size:13px;color:var(--muted);background:none;border:0;border-bottom:2.5px solid transparent;cursor:pointer;font-family:var(--sans);transition:color .15s;}
  .cd-tab:hover{color:var(--periwinkle-deep);}
  .cd-tab.active{color:var(--periwinkle-deep);border-color:var(--periwinkle);}
  .cd-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:18px;background:var(--paper);}
  .cd-day{text-align:center;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:2px 0;}
  .cd-msg{display:flex;gap:11px;align-items:flex-start;}
  .cd-msg .av{width:32px;height:32px;border-radius:50%;overflow:hidden;flex:none;background:var(--paper-2);}
  .cd-msg .av img{width:100%;height:100%;object-fit:cover;}
  .cd-msg .bubble{background:#fff;border:1px solid var(--line-soft);border-radius:4px 14px 14px 14px;padding:11px 14px;max-width:80%;}
  .cd-msg .meta{display:flex;gap:8px;align-items:baseline;margin-bottom:4px;}
  .cd-msg .meta .nm{font-weight:700;font-size:13px;}
  .cd-msg .meta .rl{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--periwinkle-deep);}
  .cd-msg .meta .tm{font-size:11px;color:var(--muted);margin-left:auto;white-space:nowrap;}
  .cd-msg .txt{font-size:14px;line-height:1.5;color:var(--ink-2);}
  .cd-msg.me{flex-direction:row-reverse;}
  .cd-msg.me .bubble{background:var(--periwinkle);border-color:var(--periwinkle);color:#fff;border-radius:14px 4px 14px 14px;}
  .cd-msg.me .meta .nm{color:#fff;} .cd-msg.me .meta .rl{color:var(--zest);} .cd-msg.me .meta .tm{color:rgba(255,255,255,.75);} .cd-msg.me .txt{color:#fff;}
  .cd-empty{margin:auto;text-align:center;color:var(--muted);font-size:14px;padding:40px 10px;}
  .cd-empty .ec{width:54px;height:54px;border-radius:50%;background:var(--paper-2);display:grid;place-items:center;color:var(--periwinkle-deep);margin:0 auto 14px;}
  .cd-empty .ec .icn{width:24px;height:24px;}
  /* activity timeline */
  .cd-act{display:block;}
  .cd-evt{display:flex;gap:13px;align-items:flex-start;padding:0 0 18px;position:relative;}
  .cd-evt .dot{width:30px;height:30px;border-radius:50%;background:#fff;border:1.6px solid var(--line);color:var(--periwinkle-deep);display:grid;place-items:center;flex:none;z-index:1;}
  .cd-evt .dot .icn{width:15px;height:15px;}
  .cd-evt::before{content:"";position:absolute;left:14.5px;top:30px;bottom:-2px;width:2px;background:var(--line-soft);}
  .cd-evt:last-child::before{display:none;}
  .cd-evt .ev-main{padding-top:4px;}
  .cd-evt .ev-txt{font-size:13.5px;line-height:1.45;color:var(--ink-2);}
  .cd-evt .ev-txt b{font-weight:700;color:var(--ink);}
  .cd-evt .ev-tm{font-size:11.5px;color:var(--muted);margin-top:3px;}
  .cd-evt.added .dot{background:var(--periwinkle);border-color:var(--periwinkle);color:#fff;}
  .cd-evt.archived .dot,.cd-evt.paused .dot{color:var(--muted);}
  .cd-foot{padding:14px 16px;border-top:1px solid var(--line-soft);display:flex;gap:10px;align-items:flex-end;background:#fff;}
  .cdrawer[data-tab="activity"] .cd-foot{display:none;}
  .cd-foot textarea{flex:1;border:1.5px solid var(--line);border-radius:12px;padding:11px 13px;font-family:var(--sans);font-size:14px;font-weight:500;color:var(--ink);resize:none;max-height:120px;outline:none;transition:border-color .15s;line-height:1.4;}
  .cd-foot textarea:focus{border-color:var(--periwinkle);}
  .cd-send{width:44px;height:44px;border-radius:50%;border:0;background:var(--periwinkle);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;transition:background .15s,transform .12s;}
  .cd-send:hover{background:var(--periwinkle-deep);transform:translateY(-1px);}
  .cd-send:disabled{background:var(--paper-2);color:var(--muted);cursor:default;transform:none;}
  .cd-send .icn{width:19px;height:19px;}
  @media(max-width:520px){.cdrawer-panel{width:100%;}}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

  const drawer=document.createElement('div'); drawer.className='cdrawer'; drawer.setAttribute('aria-hidden','true'); drawer.setAttribute('data-tab','comments');
  drawer.innerHTML=`
    <div class="cdrawer-scrim" data-close></div>
    <div class="cdrawer-panel" role="dialog" aria-modal="true" aria-label="Product activity">
      <div class="cd-head">
        <span class="thumb"><img id="cdThumb" alt=""></span>
        <div class="ttl"><div class="nm" id="cdName">—</div><div class="sub" id="cdSub">Activity &amp; comments</div></div>
        <button class="cd-close" data-close aria-label="Close"><svg class="icn"><use href="#ic-x"/></svg></button>
      </div>
      <div class="cd-tabs">
        <button class="cd-tab active" data-cdtab="comments">Comments</button>
        <button class="cd-tab" data-cdtab="activity">Activity</button>
      </div>
      <div class="cd-body" id="cdBody"></div>
      <div class="cd-foot">
        <textarea id="cdInput" rows="1" placeholder="Write a comment…"></textarea>
        <button class="cd-send" id="cdSend" aria-label="Send" disabled><svg class="icn"><use href="#ic-send"/></svg></button>
      </div>
    </div>`;
  document.body.appendChild(drawer);

  const sprite=document.querySelector('svg[aria-hidden="true"]')||document.body;
  function ensureSym(id, inner){
    if(document.getElementById(id)) return;
    const ns='http://www.w3.org/2000/svg';
    const sym=document.createElementNS(ns,'symbol'); sym.setAttribute('id',id); sym.setAttribute('viewBox','0 0 24 24');
    sym.setAttribute('fill','none'); sym.setAttribute('stroke','currentColor'); sym.setAttribute('stroke-width','1.7'); sym.setAttribute('stroke-linecap','round'); sym.setAttribute('stroke-linejoin','round');
    sym.innerHTML=inner; sprite.appendChild(sym);
  }
  ensureSym('ic-send','<path d="M5 12 20 5l-4 15-4.5-5.5L5 12z"/><path d="M11.5 14.5 16 5"/>');
  ensureSym('ic-x','<path d="M6 6l12 12M18 6 6 18"/>');

  const body=drawer.querySelector('#cdBody'), input=drawer.querySelector('#cdInput'), sendBtn=drawer.querySelector('#cdSend');
  let current=null, activeTab='comments';

  function av(who){ const ppl=PEOPLE[who]||PEOPLE[0]; const u=(window.MSAvatar&&MSAvatar.url(ppl.n))||ppl.img; return `<span class="av">${u?`<img src="${u}" alt="${ppl.n}">`:ppl.n.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>`; }
  function msgHTML(m){
    const ppl=PEOPLE[m.who]||PEOPLE[0]; const me=m.who===0;
    return `<div class="cd-msg ${me?'me':''}">${av(m.who)}<div class="bubble"><div class="meta"><span class="nm">${ppl.n}</span><span class="rl">${ppl.role}</span><span class="tm">${m.time}</span></div><div class="txt">${m.text.replace(/</g,'&lt;')}</div></div></div>`;
  }
  function evtHTML(e){
    return `<div class="cd-evt ${e.type||''}"><span class="dot"><svg class="icn"><use href="#${e.icon||'ic-clock'}"/></svg></span><div class="ev-main"><div class="ev-txt"><b>${first(e.who)}</b> ${e.label}</div><div class="ev-tm">${e.time}</div></div></div>`;
  }
  function render(){
    const p=current; if(!p) return;
    if(activeTab==='comments'){
      if(!p.thread || !p.thread.length){ body.innerHTML=`<div class="cd-empty"><div class="ec"><svg class="icn"><use href="#ic-chat"/></svg></div>No comments yet.<br>Start the conversation below.</div>`; return; }
      let html='', lastDay='';
      p.thread.forEach(m=>{ const day=m.time.split(',')[0]; if(day!==lastDay){ html+=`<div class="cd-day">${day}</div>`; lastDay=day; } html+=msgHTML(m); });
      body.innerHTML=html; body.scrollTop=body.scrollHeight;
    } else {
      const h=(p.history||[]).slice().reverse();
      if(!h.length){ body.innerHTML=`<div class="cd-empty"><div class="ec"><svg class="icn"><use href="#ic-clock"/></svg></div>No activity recorded yet.</div>`; return; }
      body.innerHTML=`<div class="cd-act">${h.map(evtHTML).join('')}</div>`;
      body.scrollTop=0;
    }
  }
  function setTab(t){
    activeTab=t; drawer.setAttribute('data-tab',t);
    drawer.querySelectorAll('.cd-tab').forEach(b=>b.classList.toggle('active', b.dataset.cdtab===t));
    render();
    if(t==='comments') setTimeout(()=>input.focus(),50);
  }
  drawer.querySelectorAll('.cd-tab').forEach(b=>b.addEventListener('click', ()=>setTab(b.dataset.cdtab)));

  function open(p, tab){
    if(window.__msCommentsProxy && window.__msCommentsProxy(p,tab)) return; // embed → full-window overlay in the parent
    current=p;
    drawer.querySelector('#cdName').textContent=p.name;
    const thumb=drawer.querySelector('.cd-head .thumb');
    if(p.isProject){ thumb.innerHTML='<svg class="icn" style="width:24px;height:24px;color:var(--periwinkle)"><use href="#i-mark"/></svg>'; }
    else { thumb.innerHTML='<img id="cdThumb" alt="">'; const t=thumb.querySelector('#cdThumb'); t.src=`assets/products/${p.img}.png`; t.alt=p.name; }
    drawer.querySelector('#cdSub').textContent = p.isProject ? 'Project activity & comments' : 'Activity & comments';
    setTab(tab||'comments');
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    p.unreadCount=0; if(p.comments && p.comments.unread){ p.comments={read:(p.comments.unread+(p.comments.read||0))}; }
    refreshIcon(p);
    if((tab||'comments')==='comments') setTimeout(()=>input.focus(),320);
  }
  function close(){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); current=null; }

  function refreshIcon(p){
    const i=(window.ordered||[]).indexOf(p);
    const host=document.querySelectorAll('#rows .row, #rows .gcard')[i];
    if(typeof window.commentCellHTML==='function' && host){
      host.querySelectorAll('.statactions').forEach(c=>{ const u=c.querySelector('use'); if(u&&u.getAttribute('href')==='#ic-chat'){ c.outerHTML=window.commentCellHTML(p); } });
      rewireOne(host);
    }
  }
  function total(p){ return p.thread? p.thread.length : 0; }
  function nowStr(){ const n=new Date(); return `Today, ${n.getHours()}:${String(n.getMinutes()).padStart(2,'0')}`; }

  function autosize(){ input.style.height='auto'; input.style.height=Math.min(120,input.scrollHeight)+'px'; sendBtn.disabled=!input.value.trim(); }
  input.addEventListener('input', autosize);
  function send(){
    const v=input.value.trim(); if(!v||!current) return;
    current.thread=current.thread||[];
    current.thread.push({who:0, text:v, time:nowStr()});
    current.comments = {read: total(current)};
    logActivity(current, {type:'comment', icon:'ic-chat', label:'left a comment', who:0}, true);
    input.value=''; autosize(); render(); refreshIcon(current);
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); } });

  drawer.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', close));
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && drawer.classList.contains('open')) close(); });

  // ---- activity logging ----
  function logActivity(p, e, silent){
    if(!p) return;
    p.history=p.history||[];
    p.history.push({who:(e.who==null?0:e.who), type:e.type||'status', icon:e.icon||'ic-clock', label:e.label||'made a change', time:e.time||nowStr()});
    // refresh open drawer activity view + modal latest line
    if(!silent && current===p && activeTab==='activity') render();
    updateModalLatest(p);
  }
  function latestHTML(p){
    const h=p && p.history && p.history.length ? p.history[p.history.length-1] : null;
    if(!h) return '';
    return `<svg class="icn"><use href="#${h.icon||'ic-clock'}"/></svg><span><b>${first(h.who)}</b> ${h.label} · ${h.time.split(',')[0]}</span>`;
  }
  function updateModalLatest(p){
    const el=document.getElementById('pmLatest'); if(!el) return;
    const cur=window.__currentModalProduct && window.__currentModalProduct();
    if(cur===p) el.innerHTML=latestHTML(p);
  }

  function productForHost(host){ return (window.ordered||[])[[...document.querySelectorAll('#rows .row, #rows .gcard')].indexOf(host)]; }
  function rewireOne(host){
    host.querySelectorAll('.statactions .it').forEach(it=>{
      const u=it.querySelector('use'); if(!u||u.getAttribute('href')!=='#ic-chat') return;
      if(it.__cw) return; it.__cw=true; it.style.cursor='pointer';
    });
  }
  document.querySelectorAll('#rows .row, #rows .gcard').forEach(rewireOne);
  document.head.insertAdjacentHTML('beforeend','<style>#rows .statactions .it:has(use[href="#ic-chat"]){cursor:pointer;}</style>');
  // delegated — works for rows rendered or re-rendered at any time (incl. embed-injected projects)
  document.addEventListener('click', e=>{
    const it=e.target.closest('#rows .statactions .it'); if(!it) return;
    const u=it.querySelector('use'); if(!u||u.getAttribute('href')!=='#ic-chat') return;
    e.stopPropagation();
    const host=it.closest('.row,.gcard'); const p=host&&productForHost(host); if(p) open(p);
  }, true);

  const pmChat=document.querySelector('.pm-tools .it:nth-child(2)');
  if(pmChat){ pmChat.style.cursor='pointer'; pmChat.addEventListener('click', ()=>{ const p=window.__currentModalProduct&&window.__currentModalProduct(); if(p) open(p); }); }

  // project-level comment icon in the title toolbar
  const projChat=[...document.querySelectorAll('.titletools .it')].find(it=>{ const u=it.querySelector('use'); return u && u.getAttribute('href')==='#ic-chat'; });
  if(projChat){ projChat.style.cursor='pointer'; projChat.addEventListener('click', e=>{ e.stopPropagation(); open(project); const b=projChat.querySelector('.badge'); if(b) b.remove(); }); }

  window.__openComments = open;
  window.__openProjectComments = function(tab){ open(project, tab); };
  window.MSlog = logActivity;
  window.MSlatest = latestHTML;
})();
