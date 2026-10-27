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
  const sel=new Set(); let selMode=false, scope='open', q='', sortBy='recent', stF='', who='', fCrit=false, fFlag=false, fSts=new Set();
  const LS=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||d; }catch(e){ return d; } }, LSP=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const ARCH=new Set(LS('ms-proj-archived',[])), saveArch=()=>LSP('ms-proj-archived',[...ARCH]);
  const TEAMX=LS('ms-proj-team',{}); P.forEach(p=>{ if(TEAMX[p.id]) p.team=TEAMX[p.id]; });
  const DAY=864e5, hh=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  // order-by deadline: the project's own date, else a demo date a few days ahead for anything not yet ordered
  P.forEach(p=>{ if(!p.orderBy&&!p.delivered&&p.items.some(i=>['idea','prog','ready','action'].includes(i.st))){ const d=new Date(); d.setHours(17,0,0,0); d.setDate(d.getDate()+2+hh(p.id)%14); p.orderBy=d.toISOString(); } });
  const left=p=>p.orderBy?Math.ceil((new Date(p.orderBy)-new Date())/DAY):null;
  const D=window.ORG_DATA||{}, mojo=((D.mojoTeams||[]).flatMap(t=>t.users||[])).map(u=>u.n), custT=(((D.customers||[]).find(c=>c.id==='citrix')||{}).teams||[]).flatMap(t=>t.users||[]).map(u=>u.n);
  const orgOf=n=>mojo.includes(n)?'Mojo Promotions':'Citrix';
  const ROLE=(window.MSID&&MSID.current&&MSID.current())||'customer', isAdmin=ROLE!=='customer'||!window.MSPEOPLE||true;

  // product thumbnail: store image by name when the feed is loaded, else the category picture
  const TH=[[/cable|charg/i,'cable'],[/mouse/i,'mouse'],[/pen\b|pencil/i,'pen'],[/notebook|journal|paper/i,'book'],[/bag|tote/i,'bag'],[/garden|seed|plant/i,'garden'],[/cup|mug|bottle|tumbler/i,'drinkware'],[/tooth|bamboo/i,'lifestyle'],[/desk/i,'desk']];
  function thumb(n){ try{ const L=(window.MSCAT&&MSCAT.all&&MSCAT.all())||[], p=L.find(x=>x.name===n); if(p&&(p.imgUrl||p.img)) return p.imgUrl||('assets/products/'+p.img+'.png'); }catch(e){}
    const m=TH.find(([r])=>r.test(n)); return 'assets/products/'+(m?m[1]:'tech')+'.png'; }
  function card(p){
    const items=p.items;
    const sm=summary(p);
    const team=p.team.slice(0,3);
    return `<div class="pcard ${sel.has(p.id)?'sel':''}" data-id="${p.id}">
      <div class="pc-top">
        <span class="pc-flag ${p.flag?'on':''}" data-flag="${p.id}" title="${p.flag?'Flagged — click to clear':'Flag this project'}"><svg class="icn"><use href="#p-flag"/></svg></span>
        <span class="pc-arch" data-arch="${p.id}" title="${ARCH.has(p.id)?'Unarchive':'Archive'} this project" aria-label="${ARCH.has(p.id)?'Unarchive':'Archive'} ${esc(p.name)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/></svg></span>
        <span class="pc-cmt" data-cmt="${p.id}"><svg class="icn"><use href="#p-cmt"/></svg>${p.comments?`<span class="b">${p.comments}</span>`:''}</span>
        ${p.items.some(it=>it.crit)?'':''}
      </div>
      <h3 class="pc-title" data-open="${p.id}">${esc(p.name)}</h3>
      <div class="pc-date">Created: ${esc(p.created)}${ARCH.has(p.id)?' · <b class="pc-archd">Archived</b>':''}</div>
      <div class="pc-duerow">${left(p)!=null?(d=>`<div class="pc-due ${d<=3?'r':d<=7?'a':''}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${d<0?'Order deadline passed':d===0?'Order today to keep your dates':'Order within <b>'+d+' day'+(d===1?'':'s')+'</b>'}<span>by ${new Date(p.orderBy).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span></div>`)(left(p)):'<span></span>'}${sm&&sm.urgent?`<span class="pc-urgentchip">${esc(sm.txt)}</span>`:(sm?`<span class="pc-urgentchip" style="color:var(--green-deep);background:var(--tint-green)">${esc(sm.txt)}</span>`:'')}</div>
      <div class="pc-prog" title="${progress(p)}% through pipeline"><i style="width:${progress(p)}%"></i></div>
      <div class="pc-itemshd"><span>${p.items.length} item${p.items.length>1?'s':''}</span><span>Status</span></div>
      <ul class="pc-items">${items.map(it=>{ const m=ST[it.st]||ST.idea; const k=it.st in ST?it.st:'idea'; return `<li class="pc-item"><span class="pc-th"><img src="${thumb(it.n)}" alt="" loading="lazy"></span><span class="nm"><a class="pc-plk" href="Merchsmith Project - Autumn Giveaways.html#product=${encodeURIComponent(it.n)}" data-prod="1">${esc(it.n)}</a>${it.crit?'<span class="pc-crit" title="Critical delivery date">Critical</span>':''}</span><span class="pstat"><span class="slbl l-${k}">${m.lbl}</span><span class="sdot d-${k}" title="${m.lbl}" aria-hidden="true"></span></span></li>`; }).join('')}</ul>
      <div class="pc-foot">
        <span class="pc-check ${sel.has(p.id)?'on':''}" data-check="${p.id}"><svg class="icn"><use href="#p-check"/></svg></span>
        <span class="pc-team">${team.map((t,i)=>`<span class="av" style="background:${AVC[(p.name.length+i)%AVC.length]}" data-operson="${esc(t)}" data-oporg="${esc(orgOf(t))}" data-tip="${esc(t)} · ${esc(orgOf(t))}" role="button" tabindex="0">${av(t)}</span>`).join('')}${p.team.length>3?`<span class="av more" data-tip="${esc(p.team.slice(3).join(', '))}">+${p.team.length-3}</span>`:''}<span class="add" title="Add a collaborator" data-addc="${p.id}"><svg class="icn"><use href="#p-plus"/></svg></span></span>
      </div>
    </div>`;
  }

  function render(){
    let list=P.slice();
    if(scope==='drafts') list=[]; else if(scope==='archived') list=list.filter(p=>ARCH.has(p.id)); else { list=list.filter(p=>!ARCH.has(p.id)); if(scope==='open') list=list.filter(p=>!p.delivered); else if(scope==='delivered') list=list.filter(p=>p.delivered); }
    if(stF) list=list.filter(p=>p.items.some(i=>stF==='act'?i.st==='action':i.st===stF));
    if(who) list=list.filter(p=>p.team.includes(who));
    if(fCrit) list=list.filter(p=>p.items.some(i=>i.crit)); if(fFlag) list=list.filter(p=>p.flag); if(fSts.size) list=list.filter(p=>p.items.some(i=>fSts.has(i.st)));
    if(q) list=list.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()) || p.items.some(i=>i.n.toLowerCase().includes(q.toLowerCase())));
    if(sortBy==='recent') list.sort((a,b)=>b.ts-a.ts);
    else if(sortBy==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortBy==='items') list.sort((a,b)=>b.items.length-a.items.length);
    else if(sortBy==='deadline') list.sort((a,b)=>(a.orderBy?+new Date(a.orderBy):9e15)-(b.orderBy?+new Date(b.orderBy):9e15));
    else if(sortBy==='action') list.sort((a,b)=>b.items.filter(i=>i.st==='action').length-a.items.filter(i=>i.st==='action').length||b.ts-a.ts);
    window.__pjList=list; drawBulk();
    const drafts=(()=>{ const out=[]; try{ const cur=JSON.parse(localStorage.getItem('ms-project-draft')||'null'); if(cur&&(cur.name||cur.desc)) out.push(Object.assign({id:'cur',cur:true},cur)); (JSON.parse(localStorage.getItem('ms-project-drafts')||'[]')).forEach(d=>out.push(d)); }catch(e){} return out; })();
    window.__pjDrafts=(scope==='archived'||stF||who||fCrit||fFlag||fSts.size)?[]:drafts.filter(d=>!q||String(d.name||'').toLowerCase().includes(q.toLowerCase()));
    document.getElementById('count').textContent=list.length+' project'+(list.length===1?'':'s');
    const STEPN=['Basics','Budget & timing','Brand & finish','Products','Review'];
    const dcard=d=>{ const st=Math.max(0,Math.min(4,+d.step||0)), pc=Math.round((st+1)/5*100), when=d.at?new Date(d.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'today';
      return `<div class="pcard pc-draftc" data-draft="${esc(d.id)}"><div class="pc-top"><span class="pc-arch" data-ddel="${esc(d.id)}" title="Delete draft" aria-label="Delete draft ${esc(d.name||'Untitled')}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></span></div>
        <div class="pc-title">${esc(d.name||'Untitled project')}</div><div class="pc-date"><span class="pc-dtag">Draft</span> Saved ${when}</div>
        ${d.desc?`<p class="pc-ddesc">${esc(String(d.desc).slice(0,140))}</p>`:''}
        <div class="pc-dprog"><span>Step ${st+1} of 5 · ${STEPN[st]}</span><span class="pc-dbar"><i style="width:${pc}%"></i></span></div>
        <div class="pc-dfoot"><button type="button" class="pc-dbtn" data-dres="${esc(d.id)}">Continue setup<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div></div>`; };
    const DR=window.__pjDrafts||[];
    grid.innerHTML=(DR.length||list.length)?DR.map(dcard).join('')+list.map(card).join(''):'<p style="color:var(--muted);padding:30px">No projects match.</p>';
    renderMeta(list);
  }
  function renderMeta(list){
    const el=document.getElementById('pmeta'); if(!el) return;
    let items=0,prog=0,ready=0,ordered=0,deliver=0,action=0;
    list.forEach(p=>p.items.forEach(i=>{ items++; if(i.st==='prog')prog++; else if(i.st==='ready')ready++; else if(i.st==='ordered')ordered++; else if(i.st==='deliver')deliver++; else if(i.st==='action')action++; }));
    const I={fold:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',alert:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'};
    const st=(ic,n,lb,dot,k)=>`<a class="pm-st${k&&stF===k?' on':''}${k?'':' nf'}" href="#" ${k?`data-stf="${k}"`:''}><span class="pm-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${I[ic]}</svg></span><span class="pm-tx"><b>${n}</b><span>${dot?`<i class="sdot d-${dot}"></i>`:''}${lb}</span></span></a>`;
    el.onclick=e=>{ const a=e.target.closest('[data-stf]'); e.preventDefault(); if(!a) return; stF=stF===a.dataset.stf?'':a.dataset.stf; render(); };
    el.innerHTML=st('fold',list.length,'Projects')+st('box',items,'Products','')+st('alert',action,'Need your action','action','act')+st('clock',prog,'In progress','prog','prog')+st('box',ready,'Ready to order','ready','ready')+st('truck',ordered,'Ordered','ordered','ordered')+st('check',deliver,'Delivered','deliver','deliver');
  }

  // interactions
  grid.addEventListener('click', e=>{
    const cm=e.target.closest('[data-cmt]'); if(cm){ e.stopPropagation(); openComments(cm.dataset.cmt); return; }
    const fl=e.target.closest('[data-flag]'); if(fl){ e.stopPropagation(); const p=P.find(x=>x.id===fl.dataset.flag); if(p){ p.flag=!p.flag; render(); } return; }
    const chk=e.target.closest('[data-check]'); if(chk){ const id=chk.dataset.check; sel.has(id)?sel.delete(id):sel.add(id); render(); return; }
    if(e.target.closest('[data-prod]')){ e.stopPropagation(); return; }
    const open=e.target.closest('[data-open]'); if(open){ location.href='Merchsmith Project - Autumn Giveaways.html'; return; }
    const dres=e.target.closest('[data-dres]'), dcd=!dres&&!e.target.closest('[data-ddel]')&&e.target.closest('[data-draft]');
    if(dres||dcd){ const id=(dres||dcd).dataset.dres||(dres||dcd).dataset.draft; if(id!=='cur'){ const D=JSON.parse(localStorage.getItem('ms-project-drafts')||'[]'), d=D.find(x=>x.id===id); const cur=localStorage.getItem('ms-project-draft'); if(cur&&cur.length>2){ try{ const cd=JSON.parse(cur); if(cd&&(cd.name||cd.desc)) D.unshift(Object.assign({id:'dr'+Date.now().toString(36),at:new Date().toISOString()},cd)); }catch(e2){} } if(d){ localStorage.setItem('ms-project-draft',JSON.stringify(d)); localStorage.setItem('ms-project-drafts',JSON.stringify(D.filter(x=>x.id!==id))); } } location.href='Merchsmith Create Project.html'; return; }
    const ddel=e.target.closest('[data-ddel]'); if(ddel){ e.stopPropagation(); if(!confirm('Delete this unfinished project?')) return; const id=ddel.dataset.ddel; if(id==='cur') localStorage.setItem('ms-project-draft',''); else localStorage.setItem('ms-project-drafts',JSON.stringify(JSON.parse(localStorage.getItem('ms-project-drafts')||'[]').filter(x=>x.id!==id))); toast('Draft deleted'); render(); return; }
    const ar=e.target.closest('[data-arch]'); if(ar){ e.stopPropagation(); const id=ar.dataset.arch, on=ARCH.has(id); on?ARCH.delete(id):ARCH.add(id); saveArch(); toast(on?'Project unarchived':'Project archived · find it under Archived'); render(); return; }
    const pr=e.target.closest('[data-operson]'); if(pr){ e.stopPropagation(); return; }
    const add=e.target.closest('[data-addc]'); if(add){ e.stopPropagation(); addCollab(add.dataset.addc); return; }
    const c=e.target.closest('.pcard'); if(c){ if(selMode){ const id=c.dataset.id; sel.has(id)?sel.delete(id):sel.add(id); render(); } else location.href='Merchsmith Project - Autumn Giveaways.html'; }
  });
  document.getElementById('scopeSeg').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; scope=b.dataset.s; document.querySelectorAll('#scopeSeg button').forEach(x=>x.classList.toggle('on',x===b)); render(); });
  document.getElementById('searchBtn').onclick=()=>{ const sb=document.getElementById('searchbox'); sb.classList.toggle('on'); if(sb.classList.contains('on')) document.getElementById('search').focus(); };
  document.getElementById('search').oninput=e=>{ q=e.target.value; render(); };
  // small popover menus anchored to a tool button
  function pop(btn,html,wire){ document.querySelectorAll('.pj-pop').forEach(x=>x.remove()); const m=document.createElement('div'); m.className='pj-pop'; m.innerHTML=html; document.body.appendChild(m); const r=btn.getBoundingClientRect(); m.style.top=(r.bottom+8+scrollY)+'px'; m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,r.right-m.offsetWidth))+'px'; btn.classList.add('on');
    const off=e=>{ if(!m.contains(e.target)&&!btn.contains(e.target)){ m.remove(); btn.classList.toggle('on',btn.id==='filterBtn'&&(fCrit||fFlag||fSts.size>0)); document.removeEventListener('mousedown',off); } }; setTimeout(()=>document.addEventListener('mousedown',off),0); wire(m); return m; }
  const SORTS=[['recent','Most recent'],['deadline','Order deadline (soonest)'],['action','Needs action first'],['name','Name A–Z'],['items','Most products']];
  document.getElementById('sortBtn').onclick=function(){ const b=this; pop(b,'<b class="pj-ph">Sort by</b>'+SORTS.map(([k,l])=>`<button type="button" class="pj-pi${sortBy===k?' on':''}" data-sort="${k}">${l}<i>✓</i></button>`).join(''),m=>m.querySelectorAll('[data-sort]').forEach(x=>x.onclick=()=>{ sortBy=x.dataset.sort; m.remove(); b.classList.remove('on'); b.title='Sort: '+SORTS.find(s=>s[0]===sortBy)[1]; render(); })); };
  document.getElementById('selBtn').onclick=function(){ selMode=!selMode; this.classList.toggle('on',selMode); if(!selMode) sel.clear(); render(); };
  function drawBulk(){ let b=document.getElementById('pjBulk'); const fb=document.querySelector('.filterbar'); if(!fb) return; if(!b){ b=document.createElement('div'); b.id='pjBulk'; b.className='pj-bulk'; fb.after(b); }
    const L=window.__pjList||[]; const on=selMode||sel.size>0; b.hidden=!on; if(!on){ b.innerHTML=''; return; } const n=sel.size, all=L.length&&L.every(p=>sel.has(p.id));
    b.innerHTML=`<b>${n} selected</b><button type="button" data-ba="all">${all?'Clear all':'Select all '+L.length}</button>${n?'<button type="button" data-ba="arch">'+(scope==='archived'?'Unarchive':'Archive')+'</button><button type="button" data-ba="flag">Flag</button>':''}<span></span><button type="button" data-ba="done">Done</button>`;
    b.querySelectorAll('[data-ba]').forEach(x=>x.onclick=()=>{ const a=x.dataset.ba; if(a==='all'){ if(all) sel.clear(); else L.forEach(p=>sel.add(p.id)); } if(a==='arch'){ sel.forEach(id=>scope==='archived'?ARCH.delete(id):ARCH.add(id)); saveArch(); toast(n+' project'+(n>1?'s':'')+(scope==='archived'?' unarchived':' archived')); sel.clear(); } if(a==='flag'){ sel.forEach(id=>{ const p=P.find(z=>z.id===id); if(p) p.flag=true; }); toast(n+' flagged'); } if(a==='done'){ selMode=false; sel.clear(); document.getElementById('selBtn').classList.remove('on'); } render(); }); }
  const FST=[['action','Action required'],['prog','In progress'],['ready','Ready to order'],['ordered','Ordered'],['deliver','Delivered'],['idea','Idea']];
  document.getElementById('filterBtn').onclick=function(){ const b=this; const draw=m=>{ m.innerHTML='<b class="pj-ph">Show projects with</b>'+FST.map(([k,l])=>`<label class="pj-pc"><input type="checkbox" data-fs="${k}"${fSts.has(k)?' checked':''}><i class="sdot d-${k}"></i>${l}</label>`).join('')+`<hr><label class="pj-pc"><input type="checkbox" data-fd${scope==='drafts'?' checked':''}> Drafts only</label><label class="pj-pc"><input type="checkbox" data-fc${fCrit?' checked':''}> Critical delivery dates</label><label class="pj-pc"><input type="checkbox" data-ff${fFlag?' checked':''}> Flagged only</label><div class="pj-pf"><button type="button" data-fx>Clear</button><span>${(window.__pjList||[]).length} project${(window.__pjList||[]).length===1?'':'s'}</span></div>`;
      m.querySelectorAll('[data-fs]').forEach(i=>i.onchange=()=>{ i.checked?fSts.add(i.dataset.fs):fSts.delete(i.dataset.fs); render(); draw(m); }); m.querySelector('[data-fd]').onchange=e=>{ scope=e.target.checked?'drafts':'open'; document.querySelectorAll('#scopeSeg button').forEach(x=>x.classList.toggle('on',x.dataset.s===scope)); render(); draw(m); }; m.querySelector('[data-fc]').onchange=e=>{ fCrit=e.target.checked; render(); draw(m); }; m.querySelector('[data-ff]').onchange=e=>{ fFlag=e.target.checked; render(); draw(m); };
      m.querySelector('[data-fx]').onclick=()=>{ fSts.clear(); fCrit=false; fFlag=false; render(); draw(m); }; b.classList.toggle('dot',fCrit||fFlag||fSts.size>0); };
    pop(b,'',draw); };
  document.getElementById('createBtn').onclick=()=>{ let d=null; try{ d=JSON.parse(localStorage.getItem('ms-project-draft')||'null'); }catch(e){} if(d&&(d.name||d.desc)&&!confirm('You have an unfinished project “'+(d.name||'Untitled')+'”. Start a new one anyway? The draft stays in Your Projects.')) return; if(d&&(d.name||d.desc)){ const D=JSON.parse(localStorage.getItem('ms-project-drafts')||'[]'); D.unshift(Object.assign({id:'dr'+Date.now().toString(36),at:new Date().toISOString()},d)); localStorage.setItem('ms-project-drafts',JSON.stringify(D.slice(0,10))); localStorage.setItem('ms-project-draft',''); } window.location.href='Merchsmith Create Project.html?new=1'; };

  function addCollab(id){ const p=P.find(x=>x.id===id); if(!p) return; const pool=[...new Set([...custT,...mojo])].filter(n=>!p.team.includes(n));
    const w=document.createElement('div'); w.className='pj-scrim'; w.innerHTML=`<div class="pj-modal" role="dialog" aria-modal="true" aria-label="Add a collaborator"><div class="pj-mh"><b>Add collaborators · ${esc(p.name)}</b><button type="button" data-x aria-label="Close">×</button></div>
      <input class="pj-q" placeholder="Search people" aria-label="Search people"><div class="pj-list">${pool.map(n=>`<label class="pj-p"><input type="checkbox" value="${esc(n)}"><span class="av" style="background:${AVC[hh(n)%AVC.length]}">${av(n)}</span><span><b>${esc(n)}</b><small>${esc(orgOf(n))}</small></span></label>`).join('')||'<p class="pj-none">Everyone is already on this project.</p>'}</div>
      <div class="pj-cur"><span>On this project</span>${p.team.map(n=>`<span class="pj-tag">${esc(n)}${p.team.length>1?`<button type="button" data-rm="${esc(n)}" aria-label="Remove ${esc(n)}">×</button>`:''}</span>`).join('')}</div>
      <div class="pj-mf"><button type="button" class="a-ghost" data-x>Cancel</button><button type="button" class="a-primary" data-ok>Add</button></div></div>`;
    document.body.appendChild(w); const close=()=>w.remove(); w.querySelectorAll('[data-x]').forEach(b=>b.onclick=close); w.addEventListener('mousedown',e=>{ if(e.target===w) close(); });
    const qi=w.querySelector('.pj-q'); qi.oninput=()=>w.querySelectorAll('.pj-p').forEach(l=>l.hidden=!l.textContent.toLowerCase().includes(qi.value.toLowerCase())); qi.focus();
    const keep=()=>{ TEAMX[p.id]=p.team; LSP('ms-proj-team',TEAMX); };
    w.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ p.team=p.team.filter(n=>n!==b.dataset.rm); keep(); close(); render(); addCollab(id); });
    w.querySelector('[data-ok]').onclick=()=>{ const ns=[...w.querySelectorAll('.pj-p input:checked')].map(i=>i.value); if(!ns.length){ close(); return; } p.team=p.team.concat(ns); keep(); close(); toast(ns.length+' collaborator'+(ns.length>1?'s':'')+' added'); render(); }; }
  // people filter (customer admins see everyone's projects)
  (function(){ const bar=document.querySelector('.filterbar .tools'); if(!bar) return; const people=[...new Set(P.flatMap(p=>p.team))].sort(); const s=document.createElement('select'); s.className='pj-who'; s.setAttribute('aria-label','Filter by person'); s.innerHTML='<option value="">Everyone’s projects</option>'+people.map(n=>`<option>${esc(n)}</option>`).join(''); s.onchange=()=>{ who=s.value; render(); }; bar.insertBefore(s,bar.firstChild); })();
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
