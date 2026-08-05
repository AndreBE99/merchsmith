/* projects-page.js — Your Projects home */
(function(){
  const P = window.PROJECTS;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const av = n => { const u=window.MSAvatar&&MSAvatar.url(n); return u?`<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(); };
  const AVC = ['#7b85c5','#51768c','#c66a4a','#3a9d6b','#8246af','#d2453a'];
  const grid = document.getElementById('grid');
  // distributor viewing a specific customer's projects (?customer=Name)
  (function(){ try{ const cn=new URLSearchParams(location.search).get('customer'); const isDist=(localStorage.getItem('ms-role')==='dist'); const t=document.getElementById('projTitle');
    if(cn && t){ t.innerHTML=esc(cn)+' <span style="font-size:15px;font-weight:600;color:var(--text-soft)">· Projects</span>'; if(isDist){ const b=document.createElement('div'); b.style.cssText='background:var(--tint-peri);color:var(--periwinkle-ink);font-size:13px;font-weight:600;border-radius:10px;padding:9px 14px;margin:14px 0 0'; b.innerHTML='Viewing <b>'+esc(cn)+"</b>'s projects as the distributor. <a href=\"Merchsmith Organisations.html#tab=customers\" style=\"color:var(--periwinkle-deep);font-weight:700\">← Back to Organisations</a>"; const ph=document.querySelector('.phead'); if(ph&&ph.parentNode) ph.parentNode.insertBefore(b, ph.nextSibling); } }
  }catch(e){} })();

  // item status meta
  const ST = {
    idea:{cls:'si-idea',icon:'p-bulb',lbl:'Idea'},
    prog:{cls:'si-prog',icon:'p-prog',lbl:'In progress'},
    ready:{cls:'si-ready',icon:'p-box',lbl:'Ready to order'},
    ordered:{cls:'si-ordered',icon:'p-truck',lbl:'Ordered'},
    deliver:{cls:'si-deliver',icon:'p-check',lbl:'Delivered'},
    action:{cls:'si-action',icon:'p-bang',lbl:'Action required'}
  };
  const ORDER = {idea:0,prog:1,ready:2,ordered:3,deliver:4,action:1};
  function progress(p){ // % through pipeline
    const w={idea:5,prog:45,ready:70,ordered:90,deliver:100,action:40};
    return Math.round(p.items.reduce((a,i)=>a+(w[i.st]||0),0)/p.items.length);
  }
  function summary(p){
    const act=p.items.filter(i=>i.st==='action').length;
    if(act) return {txt:act+' action'+(act>1?'s':'')+' required', urgent:true};
    const ready=p.items.filter(i=>i.st==='ready').length;
    if(ready) return {txt:ready+' ready to order', urgent:false};
    return null;
  }
  const sel=new Set(); let selMode=false, scope='open', q='', sortBy='recent';

  function card(p){
    const items=p.items;
    const sm=summary(p);
    const team=p.team.slice(0,3);
    return `<div class="pcard ${sel.has(p.id)?'sel':''}" data-id="${p.id}">
      <div class="pc-top">
        <span class="pc-flag ${p.flag?'on':''}" data-flag="${p.id}" title="${p.flag?'Flagged — click to clear':'Flag this project'}"><svg class="icn"><use href="#p-flag"/></svg></span>
        <span class="pc-cmt" data-cmt="${p.id}"><svg class="icn"><use href="#p-cmt"/></svg>${p.comments?`<span class="b">${p.comments}</span>`:''}</span>
        ${p.items.some(it=>it.crit)?'':''}
        ${sm&&sm.urgent?`<span class="pc-urgentchip">${esc(sm.txt)}</span>`:(sm?`<span class="pc-urgentchip" style="color:var(--green-deep);background:var(--tint-green)">${esc(sm.txt)}</span>`:'')}
      </div>
      <h3 class="pc-title" data-open="${p.id}">${esc(p.name)}</h3>
      <div class="pc-date">Created: ${esc(p.created)}</div>
      <div class="pc-prog" title="${progress(p)}% through pipeline"><i style="width:${progress(p)}%"></i></div>
      <div class="pc-itemshd"><span>${p.items.length} item${p.items.length>1?'s':''}</span><span>Status</span></div>
      <ul class="pc-items">${items.map(it=>{ const m=ST[it.st]||ST.idea; const k=it.st in ST?it.st:'idea'; return `<li class="pc-item"><span class="nm">${esc(it.n)}${it.crit?'<span class="critdot" title="Critical delivery date"><svg class="icn"><use href="#p-clock"/></svg></span>':''}</span><span class="pstat"><span class="slbl l-${k}">${m.lbl}</span><span class="sic ${m.cls}" title="${m.lbl}"><svg class="icn"><use href="#${m.icon}"/></svg></span></span></li>`; }).join('')}</ul>
      <div class="pc-foot">
        <span class="pc-check ${sel.has(p.id)?'on':''}" data-check="${p.id}"><svg class="icn"><use href="#p-check"/></svg></span>
        <span class="pc-team">${team.map((t,i)=>`<span class="av" style="background:${AVC[(p.name.length+i)%AVC.length]}">${av(t)}</span>`).join('')}<span class="add" title="Add member"><svg class="icn"><use href="#p-plus"/></svg></span></span>
      </div>
    </div>`;
  }

  function render(){
    let list=P.slice();
    if(scope==='open') list=list.filter(p=>!p.delivered);
    else if(scope==='delivered') list=list.filter(p=>p.delivered);
    if(q) list=list.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()) || p.items.some(i=>i.n.toLowerCase().includes(q.toLowerCase())));
    if(sortBy==='recent') list.sort((a,b)=>b.ts-a.ts);
    else if(sortBy==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortBy==='items') list.sort((a,b)=>b.items.length-a.items.length);
    document.getElementById('count').textContent=list.length+' project'+(list.length===1?'':'s');
    grid.innerHTML=list.length?list.map(card).join(''):'<p style="color:var(--muted);padding:30px">No projects match.</p>';
    renderMeta(list);
  }
  function renderMeta(list){
    const el=document.getElementById('pmeta'); if(!el) return;
    let items=0,prog=0,ready=0,ordered=0,deliver=0,action=0;
    list.forEach(p=>p.items.forEach(i=>{ items++; if(i.st==='prog')prog++; else if(i.st==='ready')ready++; else if(i.st==='ordered')ordered++; else if(i.st==='deliver')deliver++; else if(i.st==='action')action++; }));
    const mi=(b,s,extra='')=>`<span class="mi ${extra}">${b!=null?`<b>${b}</b> `:''}${s}</span>`;
    el.innerHTML =
      mi(list.length,'projects')+
      mi(items,'products')+
      mi(prog,'<span class="dot" style="background:var(--periwinkle)"></span> in progress')+
      mi(ready,'<span class="dot" style="background:var(--sky,#51768c)"></span> ready to order')+
      mi(ordered,'<span class="dot" style="background:var(--blossom,#c66a4a)"></span> ordered')+
      (deliver?mi(deliver,'<span class="dot" style="background:var(--green-deep,#2f8f5b)"></span> delivered'):'');
  }

  // interactions
  grid.addEventListener('click', e=>{
    const cm=e.target.closest('[data-cmt]'); if(cm){ e.stopPropagation(); openComments(cm.dataset.cmt); return; }
    const fl=e.target.closest('[data-flag]'); if(fl){ e.stopPropagation(); const p=P.find(x=>x.id===fl.dataset.flag); if(p){ p.flag=!p.flag; render(); } return; }
    const chk=e.target.closest('[data-check]'); if(chk){ const id=chk.dataset.check; sel.has(id)?sel.delete(id):sel.add(id); render(); return; }
    const open=e.target.closest('[data-open]'); if(open){ location.href='Merchsmith Project - Autumn Giveaways.html'; return; }
    const add=e.target.closest('.add'); if(add){ e.stopPropagation(); toast('Add team member'); return; }
    const c=e.target.closest('.pcard'); if(c){ if(selMode){ const id=c.dataset.id; sel.has(id)?sel.delete(id):sel.add(id); render(); } else location.href='Merchsmith Project - Autumn Giveaways.html'; }
  });
  document.getElementById('scopeSeg').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; scope=b.dataset.s; document.querySelectorAll('#scopeSeg button').forEach(x=>x.classList.toggle('on',x===b)); render(); });
  document.getElementById('searchBtn').onclick=()=>{ const sb=document.getElementById('searchbox'); sb.classList.toggle('on'); if(sb.classList.contains('on')) document.getElementById('search').focus(); };
  document.getElementById('search').oninput=e=>{ q=e.target.value; render(); };
  document.getElementById('sortBtn').onclick=()=>{ sortBy = sortBy==='recent'?'name':sortBy==='name'?'items':'recent'; toast('Sorted by '+({recent:'most recent',name:'name',items:'item count'})[sortBy]); render(); };
  document.getElementById('selBtn').onclick=function(){ selMode=!selMode; this.classList.toggle('on',selMode); if(!selMode){ sel.clear(); render(); } toast(selMode?'Select mode on — tap cards to select':'Select mode off'); };
  document.getElementById('filterBtn').onclick=()=>toast('Filter panel (status, owner, supplier) — to build');
  document.getElementById('createBtn').onclick=()=>{ window.location.href='Merchsmith Create Project.html'; };

  // ---- comments drawer ----
  const AVCC=['#7b85c5','#51768c','#c66a4a','#3a9d6b','#8246af','#d2453a'];
  const CMT={
    autumn:[ {who:'Cara Lyon',when:'2h ago',t:'Proof for the Tote is back from studio — needs your sign-off.'},
             {who:'Jess Doyle',when:'Yesterday',t:'Tech Travel Bag delivery is critical for the 15th — flagged with supplier.'},
             {who:'Raf Price',when:'3d ago',t:'Updated the Wheat Straw mouse artwork to v2.'} ],
    summer:[ {who:'Sara Kemp',when:'1h ago',t:'Recycled Tote needs a decision today or we miss the window.'} ]
  };
  let cmtCur=null, cmtTab='comments';
  const ACT={
    autumn:[ {t:'<b>Cara Lyon</b> approved the price for Tech Travel Bag',w:'2h ago'},
             {t:'<b>Raf Price</b> uploaded proof v2 for Wheat Straw Mouse',w:'1d ago'},
             {t:'<b>Jess Doyle</b> confirmed a critical delivery date',w:'3d ago'},
             {t:'Project <b>Autumn Giveaways</b> created',w:'22 Aug 2025'} ],
    summer:[ {t:'<b>Sara Kemp</b> flagged Recycled Tote for action',w:'1h ago'},
             {t:'Project <b>Summer Event 2026</b> created',w:'4 Jun 2026'} ]
  };
  const cmtDrawer=document.getElementById('cmtDrawer'), cmtScrim=document.getElementById('cmtScrim');
  function openComments(id){
    const p=P.find(x=>x.id===id); if(!p) return; cmtCur=id; cmtTab='comments';
    p._cmts = p._cmts || (CMT[id]?CMT[id].slice():[]);
    p._acts = p._acts || (ACT[id]?ACT[id].slice():[]);
    document.getElementById('cmtSub').textContent=p.name;
    document.querySelectorAll('.cmt-tab').forEach(t=>t.classList.toggle('on',t.dataset.ct==='comments'));
    renderDrawer(p);
    cmtScrim.classList.add('on'); cmtDrawer.classList.add('on'); cmtDrawer.setAttribute('aria-hidden','false');
  }
  function renderDrawer(p){
    const list=document.getElementById('cmtList'), compose=document.getElementById('cmtCompose');
    if(cmtTab==='activity'){
      compose.style.display='none';
      list.innerHTML = p._acts.length ? p._acts.map(a=>`<div class="cmt-act"><span class="dot"></span><div class="body"><p>${a.t}</p><span class="when">${esc(a.w)}</span></div></div>`).join('') : '<div class="cmt-empty">No activity yet.</div>';
    } else {
      compose.style.display='';
      list.innerHTML = p._cmts.length ? p._cmts.map(c=>`<div class="cmt-c"><span class="av" style="background:${AVCC[(c.who.length)%AVCC.length]}">${av(c.who)}</span><div class="body"><b>${esc(c.who)}</b><span class="when">${esc(c.when)}</span><p>${esc(c.t)}</p></div></div>`).join('') : '<div class="cmt-empty">No comments yet. Start the conversation below.</div>';
    }
  }
  document.querySelectorAll('.cmt-tab').forEach(t=>t.onclick=()=>{ cmtTab=t.dataset.ct; document.querySelectorAll('.cmt-tab').forEach(x=>x.classList.toggle('on',x===t)); const p=P.find(x=>x.id===cmtCur); if(p) renderDrawer(p); });
  function closeComments(){ cmtScrim.classList.remove('on'); cmtDrawer.classList.remove('on'); cmtDrawer.setAttribute('aria-hidden','true'); }
  document.getElementById('cmtClose').onclick=closeComments;
  cmtScrim.onclick=closeComments;
  function sendCmt(){ const inp=document.getElementById('cmtInput'); const v=inp.value.trim(); if(!v||!cmtCur) return; const p=P.find(x=>x.id===cmtCur); p._cmts.push({who:'Jess Doyle',when:'Just now',t:v}); p.comments=(p.comments||0)+1; if(p._acts) p._acts.unshift({t:'<b>Jess Doyle</b> commented',w:'Just now'}); if(window.MSComments) MSComments.add({text:v, ctxType:'project', ctxLabel:p.name, deepLink:'Merchsmith Project - Autumn Giveaways.html'}); inp.value=''; renderDrawer(p); render(); }
  document.getElementById('cmtSend').onclick=sendCmt;
  document.getElementById('cmtInput').addEventListener('keydown',e=>{ if(e.key==='Enter') sendCmt(); });

  // mini toast
  let tEl; function toast(m){ if(!tEl){ tEl=document.createElement('div'); tEl.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#23231f;color:#fff;font-size:13.5px;font-weight:600;padding:11px 18px;border-radius:11px;z-index:200;box-shadow:0 12px 30px rgba(0,0,0,.25);transition:opacity .2s'; document.body.appendChild(tEl);} tEl.textContent=m; tEl.style.opacity='1'; clearTimeout(tEl._t); tEl._t=setTimeout(()=>tEl.style.opacity='0',2000); }

  render();
})();
