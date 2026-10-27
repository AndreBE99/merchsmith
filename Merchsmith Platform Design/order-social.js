/* ============================================================
   order-social.js — on the order page: warning flags + comments for the
   whole order and for each product, and the Project team card.

   Flags (distributor only): MSFLAG keys 'order:<orderId>' and
     'oline:<orderId>:<lineIndex>'. A flagged product gets a coloured edge +
     pill; the heading shows "N flagged"; the Orders list has a Flag column.
   Comments: three separate audiences per thread —
     internal  · distributor team only
     customer  · distributor ↔ customer
     supplier  · distributor ↔ that supplier (the customer never sees it,
                 and the supplier never sees the customer thread)
   Store: localStorage 'ms-order-comments' {orderId:{threadKey:[{id,at,who,role,aud,sup,text}]}}
     threadKey = 'order' or 'line:<i>'.
   Project team: grouped by project; distributor team + customer team with
     message / email / call / book a meeting. Not shown to suppliers.
   window.MSOSOC: heroHTML · lineHTML · teamHTML · lineClass · orderFlagState
   ============================================================ */
window.MSOSOC=window.MSOSOC||(function(){
  const KEY='ms-order-comments';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const save=A=>{ try{ localStorage.setItem(KEY,JSON.stringify(A)); }catch(e){} };
  const role=()=>{ const r=window.MSID&&MSID.current?MSID.current():'distributor'; return r==='admin'?'distributor':r; };
  const meName=()=>{ const r=role(); if(r==='supplier') return 'BagWorks UK'; return (window.MSChat&&MSChat.me&&MSChat.me().name)||(r==='customer'?'Sara Kemp':'Jess Doyle'); };
  const fDT=t=>new Date(t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const I={flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',chat:'<path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',cal:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',down:'<path d="m6 9 6 6 6-6"/>'};
  const ic=(k,sz)=>`<svg viewBox="0 0 24 24" width="${sz||16}" height="${sz||16}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  /* ---------- flags ---------- */
  const fkOrder=id=>'order:'+id, fkLine=(id,i)=>'oline:'+id+':'+i;
  const flagOf=k=>window.MSFLAG?MSFLAG.get(k):null;
  const flagBtn=(k,label)=>window.MSFLAG?MSFLAG.cell(k,label):'';
  function orderFlagState(o){ const own=flagOf(fkOrder(o.id)); const lines=(o.lines||[]).map((l,i)=>flagOf(fkLine(o.id,i))).filter(Boolean);
    const lv=[own,...lines].filter(Boolean).some(f=>f.level==='red')?'red':(own||lines.length)?'amber':null; return {own,lines:lines.length,level:lv}; }
  const lineClass=(o,i)=>{ if(role()!=='distributor') return ''; const f=flagOf(fkLine(o.id,i)); return f?' os-flagged l-'+f.level:''; };
  const flagPill=f=>f?`<span class="os-fpill l-${f.level}" title="${esc(f.note||'')}">${ic('flag',12)}${esc(window.MSFLAG.LV[f.level])}${f.note?': '+esc(f.note):''}</span>`:'';

  /* ---------- comments ---------- */
  const thread=(oid,key)=>((all()[oid]||{})[key]||[]);
  // which audiences the current viewer can use for this thread
  function auds(sups){ const r=role(); if(r==='customer') return [['customer','Mojo Promotions']]; if(r==='supplier') return [['supplier:'+meName(),'Mojo Promotions']];
    return [['internal','Internal'],['customer','Customer'],...(sups||[]).map(s=>['supplier:'+s,sups.length>1?s:'Supplier'])]; }
  const visible=(oid,key,sups)=>auds(sups).flatMap(a=>full(oid,key,a[0]));
  const cmtBtn=(oid,key,label,sups)=>{ const n=visible(oid,key,sups).length;
    return `<button type="button" class="os-cbtn${n?' has':''}" data-oscmt="${esc(oid)}" data-oskey="${esc(key)}" data-oslabel="${esc(label)}" data-ossups="${esc((sups||[]).join('|'))}" title="${n?n+' comment'+(n>1?'s':''):'Add a comment'}" aria-label="Comments on ${esc(label)}${n?', '+n:''}">${ic('chat',15)}${n?`<b>${n}</b>`:''}</button>`; };

  // legacy order messages (the old "Messages" section) are shown in the matching thread, read-only
  const ops=oid=>{ try{ return (JSON.parse(localStorage.getItem('ms-order-ops')||'{}'))[oid]||null; }catch(e){ return null; } };
  function legacy(oid,key,aud){ if(key!=='order') return []; const x=ops(oid); if(!x) return [];
    if(aud==='customer') return (x.chat||[]).map(m=>({at:m.at,who:m.who,role:m.role,aud,text:m.text,old:1}));
    if(aud==='internal') return (x.notes||[]).map(m=>({at:m.at,who:m.who,role:'distributor',aud,text:m.text,old:1}));
    if(aud.indexOf('supplier:')===0) return ((x.sup||{})[aud.slice(9)]||[]).map(m=>({at:m.at,who:m.who,role:m.role,aud,text:m.text,old:1}));
    return []; }
  const full=(oid,key,aud)=>[...legacy(oid,key,aud),...thread(oid,key).filter(c=>c.aud===aud)].sort((p,q)=>new Date(p.at)-new Date(q.at));
  function activity(oid,key,label){ const x=ops(oid); if(!x) return []; const r=role(), nm=key==='order'?'':String(label||'');
    return (x.activity||[]).filter(e=>r==='distributor'||(e.role!=='internal'&&!(r==='customer'&&/supplier|acknowledg|chase|PO |purchase order/i.test(e.t)&&e.role!=='customer')))
      .filter(e=>r!=='supplier'||e.role!=='internal').filter(e=>!nm||String(e.t).includes(nm)||String(e.t).includes(nm.split(' ')[0])); }
  const avHTML=n=>{ const u=window.MSAvatar&&MSAvatar.url?MSAvatar.url(n):''; return `<span class="av">${u?`<img src="${u}" alt="${esc(n)}">`:esc(String(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`; };
  const dayOf=t=>new Date(t).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  let DR=null;
  function drawer(){ if(DR) return DR; DR=document.createElement('div'); DR.className='cdrawer os-dr'; DR.setAttribute('aria-hidden','true');
    DR.innerHTML=`<div class="cdrawer-scrim" data-osdx></div><div class="cdrawer-panel" role="dialog" aria-modal="true" aria-label="Comments &amp; activity">
      <div class="cd-head"><span class="thumb" data-osth></span><div class="ttl"><div class="nm" data-osnm></div><div class="sub">Comments &amp; activity</div></div>
        <button class="cd-close" data-osdx aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="cd-tabs" data-ostabs></div><p class="os-dnote" data-osnote></p><div class="cd-body" data-osbody></div>
      <div class="cd-foot" data-osfoot><textarea rows="1" data-ostxt placeholder="Write a comment…"></textarea><button class="cd-send" data-ossend aria-label="Send" disabled><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 20 5l-4 15-4.5-5.5L5 12z"/><path d="M11.5 14.5 16 5"/></svg></button></div></div>`;
    document.body.appendChild(DR); DR.querySelectorAll('[data-osdx]').forEach(b=>b.onclick=closeDr); document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&DR.classList.contains('open')) closeDr(); }); return DR; }
  function closeDr(){ DR.classList.remove('open'); DR.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  function openComments(oid,key,label,sups,thumb){ const A=auds(sups), d=drawer(); let tab=A[0][0]; const r=role();
    d.querySelector('[data-osnm]').textContent=label; d.querySelector('[data-osth]').innerHTML=thumb?`<img src="${esc(thumb)}" alt="">`:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>`;
    const ta=d.querySelector('[data-ostxt]'), send=d.querySelector('[data-ossend]');
    const draw=()=>{ d.dataset.tab=tab==='activity'?'activity':'comments';
      d.querySelector('[data-ostabs]').innerHTML=[...A,['activity','Activity']].map(([k2,l2])=>{ const n=k2==='activity'?0:full(oid,key,k2).length; return `<button class="cd-tab${k2===tab?' active':''}" data-ostab="${esc(k2)}">${k2==='internal'?ic('lock',12)+' ':''}${esc(l2)}${n?` <em>${n}</em>`:''}</button>`; }).join('');
      d.querySelectorAll('[data-ostab]').forEach(b=>b.onclick=()=>{ tab=b.dataset.ostab; draw(); });
      const note=tab==='activity'?'':tab==='internal'?'Only your team sees these.':tab==='customer'?(r==='customer'?'Your comments go to Mojo Promotions.':'Shared with the customer. Suppliers can’t see this.'):(r==='supplier'?'Your comments go to Mojo Promotions.':'Shared with '+tab.slice(9)+'. The customer can’t see this.');
      const nn=d.querySelector('[data-osnote]'); nn.textContent=note; nn.hidden=!note;
      const body=d.querySelector('[data-osbody]');
      if(tab==='activity'){ const E=activity(oid,key,label); body.innerHTML=E.length?`<div class="cd-act">${E.map(e=>`<div class="cd-evt"><span class="dot">${ic('chat',14).replace(I.chat,'<circle cx="12" cy="12" r="3.5"/>')}</span><div class="ev-main"><div class="ev-txt">${String(e.t).indexOf(e.who)===0?esc(e.t):'<b>'+esc(e.who)+'</b> · '+esc(e.t)}</div><div class="ev-tm">${fDT(e.at)}</div></div></div>`).join('')}</div>`:'<div class="cd-empty">No activity yet.</div>'; return; }
      const L=full(oid,key,tab); let last='';
      body.innerHTML=L.length?L.map(c=>{ const dd=dayOf(c.at), hd=dd!==last?`<div class="cd-day">${dd}</div>`:''; last=dd; const me=c.who===meName();
        return hd+`<div class="cd-msg${me?' me':''}${c.aud==='internal'?' int':''}">${avHTML(c.who)}<div class="bubble"><div class="meta"><span class="nm">${esc(c.who)}</span><span class="tm">${new Date(c.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span></div><div class="txt">${esc(c.text)}</div></div></div>`; }).join('')
        :`<div class="cd-empty"><div class="ec">${ic('chat',24)}</div>No comments yet.<br>Start the conversation below.</div>`;
      body.scrollTop=body.scrollHeight; ta.placeholder=tab==='internal'?'Add an internal comment…':'Write a comment…'; };
    ta.value=''; send.disabled=true; ta.oninput=()=>{ send.disabled=!ta.value.trim(); ta.style.height='auto'; ta.style.height=Math.min(120,ta.scrollHeight)+'px'; };
    const post=()=>{ const t=ta.value.trim(); if(!t||tab==='activity') return; const S=all(); S[oid]=S[oid]||{}; (S[oid][key]=S[oid][key]||[]).push({id:'c'+Date.now().toString(36),at:new Date().toISOString(),who:meName(),role:r,aud:tab,text:t}); save(S);
      try{ if(window.MSNOTIF&&MSNOTIF.push&&tab!=='internal'){ const to=r==='distributor'?(tab==='customer'?'customer':'supplier'):'distributor'; MSNOTIF.push(to,{ev:'chat',title:meName()+' commented on '+label,body:t.slice(0,120),href:'Merchsmith Orders.html#order='+oid}); } }catch(e){}
      ta.value=''; send.disabled=true; ta.style.height=''; draw(); refresh(); };
    send.onclick=post; ta.onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); post(); } };
    draw(); d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; setTimeout(()=>ta.focus(),250); }
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-oscmt]'); if(!b) return; e.preventDefault(); e.stopPropagation();
    const card=b.closest('[data-item]'), im=card&&card.querySelector('.od-thb img'); openComments(b.dataset.oscmt,b.dataset.oskey,b.dataset.oslabel,b.dataset.ossups?b.dataset.ossups.split('|'):[],im?im.src:''); },true);

  /* ---------- rendering hooks ---------- */
  function heroHTML(o,sups){ const r=role(), st=orderFlagState(o);
    return `<span class="os-tools" data-oshero="${esc(o.id)}">${r==='distributor'?flagBtn(fkOrder(o.id),'Order '+o.ref):''}${cmtBtn(o.id,'order','Order '+o.ref,sups)}${r==='distributor'&&(st.own||st.lines)?`<span class="os-chip l-${st.level}">${ic('flag',12)}${st.own?'Order flagged':''}${st.own&&st.lines?' · ':''}${st.lines?st.lines+' product'+(st.lines>1?'s':'')+' flagged':''}</span>`:''}</span>`; }
  function lineHTML(o,i,name,sup){ const r=role();
    return `<span class="os-tools" data-osline="${esc(o.id)}:${i}">${r==='distributor'?flagBtn(fkLine(o.id,i),name):''}${cmtBtn(o.id,'line:'+i,name,r==='distributor'?[sup]:[sup])}</span>`; }
  const lineFlagPill=(o,i)=>role()==='distributor'?flagPill(flagOf(fkLine(o.id,i))):'';

  /* ---------- project team ---------- */
  const people=()=>{ const D=window.ORG_DATA||{}; const L=[]; (D.mojoTeams||[]).forEach(t=>(t.users||[]).forEach(u=>L.push(Object.assign({org:'Mojo Promotions',side:'dist'},u))));
    (D.customers||[]).forEach(c=>(c.teams||[]).forEach(t=>(t.users||[]).forEach(u=>L.push(Object.assign({org:c.name,orgId:c.id,side:'cust'},u))))); return L; };
  const find=n=>people().find(u=>u.n===n);
  const TEAMS={'Autumn Giveaways':{dist:[['Jess Doyle','Account manager'],['Mara Whitfield','Finance'],['Alex Stone','Studio']]}};
  function teamFor(o,proj){ const t=TEAMS[proj]||{}, D=window.ORG_DATA||{}, cust=(D.customers||[]).find(c=>c.id===o.customer)||(D.customers||[])[0]||{};
    let dist=(t.dist||[]).map(([n,r])=>Object.assign({},find(n)||{n},{prole:r}));
    if(!dist.length){ const am=window.MSAM&&MSAM.get?MSAM.get(cust.id):null; dist=[Object.assign({},am||find('Jess Doyle')||{n:'Jess Doyle'},{prole:'Account manager'})]; const st=people().find(u=>u.side==='dist'&&/studio/i.test(u.role||'')); if(st) dist.push(Object.assign({},st,{prole:'Studio'})); }
    const cu=people().filter(u=>u.side==='cust'&&u.orgId===cust.id&&u.status!=='deactivated');
    const names=[...new Set([o.placedBy,cust.contactName].filter(Boolean))];
    let custT=names.map(n=>Object.assign({},cu.find(u=>u.n===n)||{n,org:cust.name},{prole:(()=>{ const u=cu.find(x=>x.n===n)||{}; if(n!==cust.contactName) return 'Placed this order'; return [u.title||'',n===o.placedBy?'Placed this order':''].filter(Boolean).join(' · '); })(),main:n===cust.contactName}));
    cu.filter(u=>/approv|finance/i.test((u.role||'')+' '+(u.title||''))&&!names.includes(u.n)).slice(0,2).forEach(u=>custT.push(Object.assign({},u,{prole:u.title||u.role})));
    return {dist,cust:custT,custName:cust.name||'Customer'}; }
  const av=(u,s)=>window.MSPEOPLE&&MSPEOPLE.avHTML?MSPEOPLE.avHTML(u,s):`<span class="os-avi" style="width:${s}px;height:${s}px">${esc(String(u.n||'?').split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`;
  function person(u,org){ const r=role();
    return `<div class="os-p"><span class="os-pav">${av(u,34)}</span><div class="os-pi"><b>${esc(u.n)}${u.main?' <em>Main contact</em>':''}</b><span>${esc(u.prole||u.title||'')}</span></div>
      <div class="os-pa"><button type="button" data-osmsg="${esc(u.n)}" data-osorg="${esc(org)}" data-osem="${esc(u.email||'')}" title="Message ${esc(u.n)}" aria-label="Message ${esc(u.n)}">${ic('chat',14)}</button>${u.email?`<a href="mailto:${esc(u.email)}" title="Email ${esc(u.n)}" aria-label="Email ${esc(u.n)}">${ic('mail',14)}</a>`:''}${r!=='customer'&&u.tel?`<button type="button" data-oscall="${esc(u.n)}" data-ostel="${esc(u.tel)}" title="Call ${esc(u.n)}" aria-label="Call ${esc(u.n)}">${ic('phone',14)}</button>`:''}<button type="button" data-osmeet="${esc(u.n)}" data-osorg="${esc(org)}" data-osem="${esc(u.email||'')}" title="Book a meeting with ${esc(u.n)}" aria-label="Book a meeting with ${esc(u.n)}">${ic('cal',14)}</button></div></div>`; }
  function teamHTML(o,projects){ if(role()==='supplier') return ''; const P=[...new Set((projects&&projects.length?projects:[o.project]).filter(Boolean))]; if(!P.length) return '';
    const T=P.map(p=>[p,teamFor(o,p)]), everyone=T.flatMap(([,t])=>[...t.dist,...t.cust]), uniq=[...new Map(everyone.map(u=>[u.n,u])).values()];
    return `<div class="cf-blk os-team"><h4>Project team</h4>
      <button type="button" class="os-tsum" data-ostog aria-expanded="false"><span class="os-stack">${uniq.slice(0,5).map(u=>`<span>${av(u,28)}</span>`).join('')}${uniq.length>5?`<span class="os-more">+${uniq.length-5}</span>`:''}</span><span class="os-tl">${uniq.length} people${P.length>1?' · '+P.length+' projects':''}</span>${ic('down',15)}</button>
      <div class="os-tbody" hidden>${T.map(([p,t])=>`<div class="os-proj"><a class="os-pn" href="Merchsmith Project - Autumn Giveaways.html">${esc(p)}</a>
        <div class="os-grp"><span class="os-gl">${role()==='customer'?'Mojo Promotions':'Your team'}</span>${t.dist.map(u=>person(u,'Mojo Promotions')).join('')}</div>
        <div class="os-grp"><span class="os-gl">${role()==='customer'?'Your team':esc(t.custName)}</span>${t.cust.map(u=>person(u,t.custName)).join('')}</div></div>`).join('')}</div></div>`; }
  document.addEventListener('click',e=>{ const t=e.target.closest&&e.target.closest('[data-ostog],[data-osmsg],[data-oscall],[data-osmeet]'); if(!t) return;
    if(t.dataset.ostog!=null){ const b=t.parentElement.querySelector('.os-tbody'); const o=b.hidden; b.hidden=!o; t.setAttribute('aria-expanded',o); t.classList.toggle('open',o); return; }
    const m={name:t.dataset.osmsg||t.dataset.oscall||t.dataset.osmeet,email:t.dataset.osem,orgName:t.dataset.osorg};
    if(t.dataset.osmsg){ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith(m); return; }
    if(t.dataset.oscall){ if(window.MSCALLS&&MSCALLS.dial) MSCALLS.dial({name:m.name,number:t.dataset.ostel}); else location.href='tel:'+t.dataset.ostel.replace(/\s/g,''); return; }
    if(t.dataset.osmeet){ const p=window.MSChat&&MSChat.resolve?MSChat.resolve(m):null; location.href='Merchsmith Calendar.html#tab=cal&with='+encodeURIComponent(p?p.id:''); } });

  /* ---------- people + supplier previews ---------- */
  const NEED=[['ORG_DATA','org-data.js?v=11'],['MSPEOPLE','people.js?v=15'],['MSAM','acct-manager.js?v=3'],['MSNOTES','product-notes.js?v=5'],['MSFLAG','flags.js?v=2'],['MSUSER','dist-users.js?v=18']];
  const load=src=>new Promise(res=>{ if(document.querySelector('script[src^="'+src.split('?')[0]+'"]')&&!/dist-users/.test(src)) return setTimeout(res,50); const s=document.createElement('script'); s.src=src; s.onload=s.onerror=res; document.body.appendChild(s); });
  async function openPerson(q){ for(const [g,src] of NEED) if(!window[g]) await load(src); if(window.MSUSER) MSUSER.open(q); }
  const supRec=n=>{ const L=(window.ORG_DATA&&ORG_DATA.suppliers)||[]; return L.find(s=>s.name===n)||L.find(s=>s.name.split(' ')[0]===String(n).split(' ')[0])||null; };
  function openSupplier(name){ const s=supRec(name)||{name,initials:String(name).split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()}, d=drawer(), KIND={product:'Product supplier',branding:'Branding supplier',both:'Product + branding'};
    d.dataset.tab='activity'; d.querySelector('[data-osnm]').textContent=s.name; d.querySelector('.cd-head .sub').textContent=[KIND[s.kind]||'Supplier',s.status?s.status.charAt(0).toUpperCase()+s.status.slice(1):''].filter(Boolean).join(' · ');
    const logo=window.MSLOGOS&&(MSLOGOS.has(s.name)?s.name:MSLOGOS.names().find(k2=>k2.split(' ')[0]===s.name.split(' ')[0])); d.querySelector('[data-osth]').innerHTML=logo?MSLOGOS.svg(logo,44):`<b style="font-size:14px;color:var(--periwinkle-deep)">${esc(s.initials||'')}</b>`;
    d.querySelector('[data-ostabs]').innerHTML=''; const nn=d.querySelector('[data-osnote]'); nn.hidden=true;
    const kv=(k2,v)=>v?`<div class="os-kv"><span>${k2}</span><b>${v}</b></div>`:'';
    const bar=(k2,v)=>v!=null?`<div class="os-bar"><span>${k2}</span><i><em style="width:${Math.max(0,Math.min(100,v))}%"></em></i><b>${v}%</b></div>`:'';
    const sv=s.service||{};
    d.querySelector('[data-osbody]').innerHTML=s.id?`<div class="os-sp">
      ${s.about?`<p class="os-spa">${esc(s.about)}</p>`:''}
      <div class="os-stats">${[['Products',s.products?Number(s.products).toLocaleString('en-GB'):'—'],['Orders',s.totalOrders!=null?s.totalOrders:'—'],['Spend',esc(s.totalSpend||'—')],['Since',esc(s.since||'—')]].map(([a,b])=>`<div><b>${b}</b><span>${a}</span></div>`).join('')}</div>
      <div class="os-card"><h5>Main contact</h5><button class="os-pbtn" data-operson="${esc(s.contactName||'')}" data-opem="${esc(s.contactEmail||'')}" data-oporg="${esc(s.name)}">${avHTML(s.contactName||s.name)}<span><b>${esc(s.contactName||'—')}</b><i>${esc(s.contactEmail||'')}</i></span></button></div>
      <div class="os-card"><h5>Details</h5>${kv('Website',s.website?`<a href="https://${esc(String(s.website).replace(/^https?:\/\//,''))}" target="_blank" rel="noopener">${esc(s.website)}</a>`:'')}${kv('Phone',esc(s.phone||''))}${kv('Address',esc(s.address||''))}${kv('Payment terms',esc(s.paymentTerms||''))}${kv('Feed',esc(s.feed||''))}${kv('Last order',esc(s.lastOrder||''))}</div>
      ${sv.deliveryMet!=null||sv.proofAccuracy!=null?`<div class="os-card"><h5>Service</h5>${bar('Delivery dates met',sv.deliveryMet)}${bar('Proof accuracy',sv.proofAccuracy)}${bar('Acknowledgement accuracy',sv.ackAccuracy)}${sv.responseSpeed?kv('Response time',esc(sv.responseSpeed)):''}</div>`:''}
      <a class="os-full" href="Merchsmith Organisations.html#org=${esc(s.id)}">Open full supplier profile →</a></div>`
      :`<div class="cd-empty"><div class="ec">${ic('flag',22)}</div><b>${esc(s.name)}</b><br>Not in your supplier directory yet.</div>`;
    d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function openCustomer(name){ const L=(window.ORG_DATA&&ORG_DATA.customers)||[], c=L.find(x=>x.id===name||x.name===name)||{name,initials:String(name).split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()}, d=drawer();
    d.dataset.tab='activity'; d.querySelector('[data-osnm]').textContent=c.name; d.querySelector('.cd-head .sub').textContent=['Customer',c.status?c.status.charAt(0).toUpperCase()+c.status.slice(1):''].filter(Boolean).join(' · ');
    const logo=window.MSLOGOS&&MSLOGOS.has(c.name)?c.name:null; d.querySelector('[data-osth]').innerHTML=logo?MSLOGOS.svg(logo,44):`<b style="font-size:14px;color:var(--periwinkle-deep)">${esc(c.initials||'')}</b>`;
    d.querySelector('[data-ostabs]').innerHTML=''; const nn=d.querySelector('[data-osnote]'); nn.hidden=true;
    const kv=(k2,v)=>v?`<div class="os-kv"><span>${k2}</span><b>${v}</b></div>`:'';
    const am=window.MSAM&&c.id?MSAM.get(c.id):null, main=c.contactName||((c.teams||[]).flatMap(t=>t.users||[]).find(u=>/admin/i.test(u.role||''))||{}).n||'';
    d.querySelector('[data-osbody]').innerHTML=c.id?`<div class="os-sp">
      <div class="os-stats">${[['Projects',c.projects!=null?c.projects:'—'],['Spend',esc(c.totalSpend||'—')],['Last 12 months',esc(c.spend12||'—')],['Since',esc(c.since||'—')]].map(([a,b])=>`<div><b>${b}</b><span>${a}</span></div>`).join('')}</div>
      <div class="os-card"><h5>Main contact</h5><button class="os-pbtn" data-operson="${esc(main)}" data-oporg="${esc(c.name)}">${avHTML(main||c.name)}<span><b>${esc(main||'—')}</b><i>${esc(c.domain||'')}</i></span></button></div>
      ${am?`<div class="os-card"><h5>Account manager</h5><button class="os-pbtn" data-operson="${esc(am.n)}" data-opem="${esc(am.email||'')}" data-oporg="Mojo Promotions">${avHTML(am.n)}<span><b>${esc(am.n)}</b><i>${esc(am.title||'')}</i></span></button></div>`:''}
      <div class="os-card"><h5>Details</h5>${kv('Website',c.website?`<a href="https://${esc(String(c.website).replace(/^https?:\/\//,''))}" target="_blank" rel="noopener">${esc(c.website)}</a>`:'')}${kv('Address',esc(c.address&&c.address!=='—'?c.address:''))}${kv('Payment terms',esc(c.paymentTerms||''))}${kv('Credit limit',esc(c.creditLimit||''))}${kv('Discount',esc(c.standingDiscount||''))}${kv('Last order',esc(c.lastOrder||''))}</div>
      <a class="os-full" href="Merchsmith Organisations.html#org=${esc(c.id)}">Open full customer profile →</a></div>`
      :`<div class="cd-empty"><b>${esc(c.name)}</b><br>Not in your customer list yet.</div>`;
    d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  // Orders table: customers and suppliers go straight to their full profile panel on the Organisations page
  const fullOrg=(kind,key)=>{ const D=window.ORG_DATA||{}, L=(kind==='cust'?D.customers:D.suppliers)||[], r=L.find(x=>x.id===key||x.name===key)||(kind==='sup'?supRec(key):null);
    if(!r||!r.id) return false; orgPanel(r.id); return true; };
  // full organisation profile panel, slid in from the right over the current page (the page behind doesn't change)
  function orgPanel(id){ let w=document.getElementById('msOrgPanel');
    if(!w){ w=document.createElement('div'); w.id='msOrgPanel'; w.innerHTML='<div class="mop-scrim" data-mopx></div><div class="mop-dr" role="dialog" aria-modal="true" aria-label="Organisation profile"><iframe title="Organisation profile"></iframe></div>'; document.body.appendChild(w);
      const st=document.createElement('style'); st.textContent='#msOrgPanel .mop-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:1490;opacity:0;pointer-events:none;transition:opacity .2s;} #msOrgPanel .mop-dr{position:fixed;top:0;right:0;height:100vh;width:min(560px,100%);background:var(--paper,#f6f5f2);z-index:1500;transform:translateX(100%);transition:transform .28s cubic-bezier(.22,.61,.36,1);box-shadow:-20px 0 60px rgba(20,22,45,.25);} #msOrgPanel .mop-dr iframe{border:0;width:100%;height:100%;display:block;} #msOrgPanel.mop-on .mop-scrim{opacity:1;pointer-events:auto;} #msOrgPanel.mop-on .mop-dr{transform:none;}';
      document.head.appendChild(st);
      w.querySelector('[data-mopx]').addEventListener('click',e=>{ if(!e.isTrusted||Date.now()-(w._at||0)<600) return; closeOrgPanel(); });
      addEventListener('message',e=>{ if(e.data&&e.data.msOrgPanel==='close') closeOrgPanel(); });
      addEventListener('keydown',e=>{ if(e.key==='Escape'&&w.classList.contains('mop-on')) closeOrgPanel(); }); }
    w.querySelector('iframe').src='Merchsmith Organisations.html?panel=1#org='+encodeURIComponent(id);
    w._at=Date.now(); requestAnimationFrame(()=>w.classList.add('mop-on')); document.body.style.overflow='hidden'; }
  function closeOrgPanel(){ const w=document.getElementById('msOrgPanel'); if(!w) return; w.classList.remove('mop-on'); document.body.style.overflow=''; setTimeout(()=>{ if(!w.classList.contains('mop-on')) w.querySelector('iframe').src='about:blank'; },300); }
  document.addEventListener('click',e=>{ const cu=e.target.closest&&e.target.closest('[data-ocust]'); if(cu){ e.preventDefault(); e.stopPropagation(); if(cu.closest('.os-dr')) closeDr(); if(!fullOrg('cust',cu.dataset.ocust)) openCustomer(cu.dataset.ocust); return; }
    const spx=e.target.closest&&e.target.closest('[data-oxroot] [data-osupp]'); if(spx){ e.preventDefault(); e.stopPropagation(); if(!fullOrg('sup',spx.dataset.osupp)) openSupplier(spx.dataset.osupp); return; }
    const p=e.target.closest&&e.target.closest('[data-operson]'); if(p){ e.preventDefault(); e.stopPropagation(); if(p.closest('.os-dr')) closeDr(); openPerson({name:p.dataset.operson,email:p.dataset.opem,org:p.dataset.oporg}); return; }
    const sp=e.target.closest&&e.target.closest('[data-osupp]'); if(sp){ e.preventDefault(); e.stopPropagation(); if(sp.closest('.os-dr')) closeDr(); openSupplier(sp.dataset.osupp); } },true);

  /* ---------- keep counts / flags live without a full re-render ---------- */
  function refresh(){ document.querySelectorAll('[data-oshero]').forEach(el=>{ const o=window.MSOrders&&MSOrders.getOrder?MSOrders.getOrder(el.dataset.oshero):null; if(!o) return;
      const s=el.dataset.sups||''; el.outerHTML=heroHTML(o,s?s.split('|'):[]); });
    document.querySelectorAll('[data-osline]').forEach(el=>{ const [oid,i]=el.dataset.osline.split(':'), o=window.MSOrders&&MSOrders.getOrder?MSOrders.getOrder(oid):null; if(!o) return;
      const card=el.closest('[data-item]'), sup=el.dataset.sup||''; const nm=(o.lines[+i]||{}).name||'';
      const n=document.createElement('span'); n.innerHTML=lineHTML(o,+i,nm,sup); const nx=n.firstChild; nx.dataset.sup=sup; el.replaceWith(nx);
      if(card){ card.classList.remove('os-flagged','l-amber','l-red'); const c=lineClass(o,+i).trim(); if(c) c.split(' ').forEach(k=>card.classList.add(k)); const pw=card.querySelector('[data-osfpill]'); if(pw) pw.innerHTML=lineFlagPill(o,+i); } }); }
  window.addEventListener('ms-flag-change',()=>setTimeout(refresh,0));

  const css=`
  .od-ifig .os-ifr{display:grid!important;grid-template-columns:1fr auto auto;justify-content:end;justify-items:end;align-items:center;gap:8px;max-width:none;margin-left:auto;width:100%;}
  .od-ifig{align-items:flex-end!important;}
  .od-ifig .os-ifr>.os-tools{grid-column:2;grid-row:1;justify-self:end;} .od-ifig .os-ifr>.od-mintg{grid-column:3;grid-row:1;} .od-ifig .os-ifr>.opill{grid-column:1/-1;grid-row:2;justify-self:end;white-space:nowrap;}
  .od-ifig .os-ifr>.od-reptab{grid-column:1/-1;grid-row:3;justify-self:end;position:relative;margin:0;}
  .od-ifig .os-ifr>.od-reptab>div{position:absolute;right:0;top:calc(100% + 6px);z-index:20;width:280px;max-width:min(280px,80vw);white-space:normal!important;text-align:left;line-height:1.45;overflow-wrap:break-word;box-sizing:border-box;}
  .od-ifig .os-ifr>.od-reptab>summary{white-space:nowrap;}
  /* one pill style on product cards: colour meaning is carried by the status dot + next-step panel */
  .od-item2 .opill,.od-pini .opill,.od-hero .opill{color:var(--periwinkle-deep)!important;background:var(--tint-peri,#eceef9)!important;}
  .od-ifig .os-ifr .os-tools{justify-content:flex-end;}
  section.od-item2 .od-ih .od-iname a.od-pnl,section.od-item2 .od-ih .od-iname>a{display:block!important;height:auto!important;min-height:0!important;max-height:none!important;white-space:normal!important;overflow:visible!important;-webkit-line-clamp:unset!important;line-clamp:none!important;text-overflow:clip!important;line-height:1.3!important;}
  section.od-item2 .od-ih .od-iname{height:auto!important;max-height:none!important;overflow:visible!important;}
  /* flag + comment: same tiles as the project gallery cards */
  .os-tools{display:inline-flex;align-items:center;gap:8px;}
  .os-tools .fl-btn,.os-cbtn{position:relative;width:34px!important;height:34px!important;min-width:0;padding:0!important;margin:0;border-radius:10px!important;background:rgba(255,255,255,.96)!important;border:1px solid var(--line-soft,#e4e7ec)!important;box-shadow:0 1px 3px rgba(20,22,45,.1)!important;display:inline-grid!important;place-items:center;color:var(--ink-3,#5b5f77);cursor:pointer;transition:border-color .15s,color .15s,box-shadow .15s,transform .15s;}
  .os-tools .fl-btn svg,.os-cbtn svg{width:16px!important;height:16px!important;}
  .os-tools .fl-btn:hover,.os-cbtn:hover{border-color:var(--periwinkle)!important;color:var(--periwinkle-deep)!important;box-shadow:0 3px 10px rgba(20,22,45,.14)!important;transform:translateY(-1px);}
  .os-tools .fl-btn.on{color:var(--flare)!important;border-color:color-mix(in srgb,var(--flare) 35%,#fff)!important;background:color-mix(in srgb,var(--flare) 8%,#fff)!important;}
  .os-tools .fl-btn.on.l-amber{color:#d98a0b!important;border-color:color-mix(in srgb,#e0a526 40%,#fff)!important;background:color-mix(in srgb,#e0a526 10%,#fff)!important;}
  .os-tools .fl-btn.on svg{fill:currentColor;}
  .os-cbtn.has{color:var(--ink-2,#3b3e55);}
  .os-cbtn b{position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;border-radius:999px;background:var(--flare);color:#fff;font-size:10.5px;font-weight:800;line-height:1;display:grid;place-items:center;padding:0 4px;border:2px solid #fff;}
  .od-hl .os-tools{margin-left:10px;}
  .os-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px;margin-left:4px;white-space:nowrap;} .os-chip.l-amber,.os-fpill.l-amber{background:#fdf1dc;color:#9a5b06;} .os-chip.l-red,.os-fpill.l-red{background:#fde7e5;color:#b42318;}
  .os-chip svg,.os-fpill svg{fill:currentColor;}
  .os-fpill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;border-radius:8px;padding:3px 9px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .od-item.os-flagged{box-shadow:inset 4px 0 0 #e0a526;} .od-item.os-flagged.l-red{box-shadow:inset 4px 0 0 #d6453d;}
  [data-osfpill]:empty{display:none;} [data-osfpill]{display:block;margin-top:6px;}
  .cdrawer{position:fixed;inset:0;z-index:2100;display:none;} .cdrawer.open{display:block;} .cdrawer-scrim{position:absolute;inset:0;background:rgba(60,66,121,.4);}
  .cdrawer-panel{position:absolute;top:0;right:0;height:100%;width:392px;max-width:92vw;background:#fff;display:flex;flex-direction:column;box-shadow:-14px 0 40px rgba(20,22,45,.18);animation:osdrin .3s cubic-bezier(.22,.61,.36,1);}
  @keyframes osdrin{from{transform:translateX(100%);}to{transform:none;}}
  .cd-head{display:flex;align-items:center;gap:13px;padding:20px 22px 16px;} .cd-head .thumb{width:44px;height:44px;border-radius:10px;background:#fff;border:1px solid var(--line-soft);display:grid;place-items:center;overflow:hidden;flex:none;color:var(--periwinkle-deep);} .cd-head .thumb img{width:100%;height:100%;object-fit:contain;padding:4px;}
  .cd-head .ttl{flex:1;min-width:0;} .cd-head .ttl .nm{font-weight:700;font-size:15px;line-height:1.25;} .cd-head .ttl .sub{font-size:12px;color:var(--muted);font-weight:600;}
  .cd-close{width:34px;height:34px;border-radius:50%;border:0;background:var(--paper-2);color:var(--ink);display:grid;place-items:center;cursor:pointer;flex:none;transition:background .15s,transform .15s;} .cd-close:hover{background:var(--flare);color:#fff;transform:rotate(90deg);}
  .cd-tabs{display:flex;flex-wrap:wrap;gap:0 4px;padding:0 16px;border-bottom:1px solid var(--line-soft);background:#fff;} .cd-tab{flex:1 0 auto;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;padding:11px 8px;font-weight:700;font-size:13px;color:var(--muted);background:none;border:0;border-bottom:2.5px solid transparent;cursor:pointer;font-family:var(--sans);}
  .cd-tab:hover{color:var(--periwinkle-deep);} .cd-tab.active{color:var(--periwinkle-deep);border-color:var(--periwinkle);} .cd-tab em{font-style:normal;font-size:10.5px;background:var(--paper-2);color:var(--ink-2);border-radius:999px;padding:1px 6px;}
  .os-dnote{margin:0;padding:8px 22px;font-size:12px;color:var(--muted);background:var(--paper);border-bottom:1px solid var(--line-soft);} .os-dnote[hidden]{display:none;}
  .cd-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:18px;background:var(--paper);}
  .cd-day{text-align:center;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:2px 0;}
  .cd-msg{display:flex;gap:11px;align-items:flex-start;} .cd-msg .av{width:32px;height:32px;border-radius:50%;overflow:hidden;flex:none;background:var(--paper-2);display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--periwinkle-deep);} .cd-msg .av img{width:100%;height:100%;object-fit:cover;}
  .cd-msg .bubble{background:#fff;border:1px solid var(--line-soft);border-radius:4px 14px 14px 14px;padding:11px 14px;max-width:80%;} .cd-msg .meta{display:flex;gap:8px;align-items:baseline;margin-bottom:4px;} .cd-msg .meta .nm{font-weight:700;font-size:13px;} .cd-msg .meta .tm{font-size:11px;color:var(--muted);margin-left:auto;white-space:nowrap;}
  .cd-msg .txt{font-size:14px;line-height:1.5;color:var(--ink-2);white-space:pre-wrap;} .cd-msg.me{flex-direction:row-reverse;} .cd-msg.me .bubble{background:var(--periwinkle);border-color:var(--periwinkle);border-radius:14px 4px 14px 14px;} .cd-msg.me .meta .nm,.cd-msg.me .txt{color:#fff;} .cd-msg.me .meta .tm{color:rgba(255,255,255,.75);}
  .cd-msg.int:not(.me) .bubble{background:#fff8e6;border-color:#f5e2b3;}
  .cd-empty{margin:auto;text-align:center;color:var(--muted);font-size:14px;padding:40px 10px;} .cd-empty .ec{width:54px;height:54px;border-radius:50%;background:var(--paper-2);display:grid;place-items:center;color:var(--periwinkle-deep);margin:0 auto 14px;}
  .cd-evt{display:flex;gap:13px;align-items:flex-start;padding:0 0 18px;position:relative;} .cd-evt .dot{width:30px;height:30px;border-radius:50%;background:#fff;border:1.6px solid var(--line);color:var(--periwinkle-deep);display:grid;place-items:center;flex:none;z-index:1;}
  .cd-evt::before{content:"";position:absolute;left:14.5px;top:30px;bottom:-2px;width:2px;background:var(--line-soft);} .cd-evt:last-child::before{display:none;} .cd-evt .ev-main{padding-top:4px;} .cd-evt .ev-txt{font-size:13.5px;line-height:1.45;color:var(--ink-2);} .cd-evt .ev-txt b{font-weight:700;color:var(--ink);} .cd-evt .ev-tm{font-size:11.5px;color:var(--muted);margin-top:3px;}
  .cd-foot{padding:14px 16px;border-top:1px solid var(--line-soft);display:flex;gap:10px;align-items:flex-end;background:#fff;} .cdrawer[data-tab="activity"] .cd-foot{display:none;}
  .cd-foot textarea{flex:1;border:1.5px solid var(--line);border-radius:12px;padding:11px 13px;font-family:var(--sans);font-size:14px;font-weight:500;color:var(--ink);resize:none;max-height:120px;outline:none;line-height:1.4;} .cd-foot textarea:focus{border-color:var(--periwinkle);}
  .cd-send{width:44px;height:44px;border-radius:50%;border:0;background:var(--periwinkle);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;} .cd-send:hover{background:var(--periwinkle-deep);} .cd-send:disabled{background:var(--paper-2);color:var(--muted);cursor:default;}
  @media(max-width:520px){.cdrawer-panel{width:100%;max-width:100%;}}
  .os-sp{display:flex;flex-direction:column;gap:14px;} .os-spa{margin:0;font-size:13.5px;line-height:1.5;color:var(--ink-2);}
  .os-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;} .os-stats>div{background:#fff;border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;} .os-stats b{display:block;font-size:15px;color:var(--ink);} .os-stats span{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);}
  .os-card{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;} .os-card h5{margin:0 0 2px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
  .os-kv{display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px;font-size:13px;} .os-kv span{color:var(--muted);} .os-kv b{font-weight:600;color:var(--ink);overflow-wrap:anywhere;} .os-kv a{color:var(--periwinkle-deep);}
  .os-pbtn{display:flex;align-items:center;gap:10px;border:0;background:none;padding:4px;margin:-4px;border-radius:10px;font:inherit;text-align:left;cursor:pointer;} .os-pbtn:hover{background:var(--paper);} .os-pbtn .av{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--paper-2);font-size:11px;font-weight:800;color:var(--periwinkle-deep);flex:none;} .os-pbtn .av img{width:100%;height:100%;object-fit:cover;}
  .os-pbtn b{display:block;font-size:13.5px;color:var(--ink);} .os-pbtn i{font-style:normal;font-size:12px;color:var(--muted);}
  .os-bar{display:grid;grid-template-columns:150px 1fr 40px;gap:8px;align-items:center;font-size:12.5px;} .os-bar span{color:var(--ink-2);} .os-bar i{height:6px;border-radius:6px;background:var(--paper-2);overflow:hidden;} .os-bar em{display:block;height:100%;background:#17b26a;border-radius:6px;} .os-bar b{text-align:right;font-weight:700;}
  .os-full{font-size:13.5px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;align-self:flex-start;} .os-full:hover{text-decoration:underline;}
  .od-plink{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left;} .od-plink:hover{color:var(--periwinkle-deep);text-decoration:underline;text-underline-offset:3px;}
  .os-scrim{position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:2100;display:grid;place-items:center;padding:16px;}
  .os-modal{background:#fff;border-radius:16px;width:min(560px,100%);max-height:86vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(16,24,40,.3);overflow:hidden;}
  .os-mh{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 10px;} .os-mh>div{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;} .os-mh b{font-family:var(--serif);font-weight:500;font-size:22px;color:var(--g900,var(--ink));} .os-mh span{font-size:13px;color:var(--g500,var(--muted));}
  .os-x{border:0;background:none;font-size:24px;line-height:1;color:var(--g500,var(--muted));cursor:pointer;}
  .os-tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--g200,#e4e7ec);overflow-x:auto;scrollbar-width:none;} .os-tabs button{flex:none;display:inline-flex;align-items:center;gap:6px;border:0;background:none;font:inherit;font-size:13.5px;font-weight:600;color:var(--g500,#667085);padding:10px 10px;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;white-space:nowrap;}
  .os-tabs button.on{color:var(--periwinkle-deep);border-bottom-color:var(--periwinkle-deep);} .os-tabs em{font-style:normal;font-size:11px;background:var(--g100,#f2f4f7);color:var(--g700,#344054);border-radius:999px;padding:1px 7px;}
  .os-note{margin:10px 20px 0;font-size:12.5px;color:var(--g500,var(--muted));}
  .os-list{flex:1;overflow:auto;padding:12px 20px;display:flex;flex-direction:column;gap:8px;min-height:120px;}
  .os-c{background:var(--g50,#f9fafb);border:1px solid var(--g200,#e4e7ec);border-radius:12px;padding:10px 12px;max-width:88%;} .os-c.me{align-self:flex-end;background:var(--tint-peri,#eceef9);border-color:transparent;} .os-c.int{background:#fff8e6;border-color:#f5e2b3;}
  .os-ch{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;} .os-ch span{color:var(--g500,var(--muted));white-space:nowrap;} .os-c p{margin:4px 0 0;font-size:13.5px;line-height:1.5;color:var(--g800,#1d2939);white-space:pre-wrap;}
  .os-empty{margin:auto 0;align-self:stretch;text-align:center;color:var(--g500,var(--muted));font-size:13.5px;}
  .os-send{display:flex;gap:8px;align-items:flex-end;padding:12px 20px 16px;border-top:1px solid var(--g200,#e4e7ec);} .os-send textarea{flex:1;font:inherit;font-size:14px;border:1px solid var(--g300,#d0d5dd);border-radius:10px;padding:9px 11px;resize:vertical;} .os-send textarea:focus{outline:0;border-color:var(--periwinkle-deep);box-shadow:0 0 0 3px var(--tint-peri,#eceef9);}
  .os-b{font:inherit;font-size:13.5px;font-weight:700;background:var(--periwinkle-deep);color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;white-space:nowrap;}
  .os-team h4{margin-bottom:8px;} .os-tsum{display:flex;align-items:center;gap:10px;width:100%;border:1px solid var(--g200,#e4e7ec);background:#fff;border-radius:12px;padding:8px 10px;font:inherit;cursor:pointer;text-align:left;} .os-tsum:hover{border-color:var(--g300,#d0d5dd);} .os-tsum>svg{margin-left:auto;color:var(--g500,#667085);transition:transform .15s;} .os-tsum.open>svg{transform:rotate(180deg);}
  .os-stack{display:flex;align-items:center;} .os-stack>span{display:grid;place-items:center;border-radius:50%;box-shadow:0 0 0 2px #fff;overflow:hidden;width:28px;height:28px;} .os-stack>span+span{margin-left:-8px;} .os-stack img{width:100%;height:100%;object-fit:cover;} .os-more{background:var(--g100,#f2f4f7);color:var(--g700,#344054);font-size:11px;font-weight:700;}
  .os-tl{font-size:13px;font-weight:600;color:var(--g700,#344054);white-space:nowrap;}
  .os-tbody{display:flex;flex-direction:column;gap:14px;margin-top:12px;} .os-tbody[hidden]{display:none;} .os-pn{font-size:13px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;} .os-pn:hover{text-decoration:underline;}
  .os-grp{display:flex;flex-direction:column;gap:2px;margin-top:8px;} .os-gl{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--g500,#667085);margin-bottom:2px;}
  .os-p{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 0;} .os-pav{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;} .os-pav img{width:100%;height:100%;object-fit:cover;}
  .os-avi{display:grid;place-items:center;border-radius:50%;background:var(--periwinkle);color:#fff;font-size:11px;font-weight:800;}
  .os-pi{display:flex;flex-direction:column;min-width:0;} .os-pi b{font-size:13.5px;font-weight:600;color:var(--g900,#101828);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .os-pi b em{font-style:normal;font-size:10.5px;font-weight:700;color:var(--periwinkle-deep);background:var(--tint-peri,#eceef9);border-radius:5px;padding:1px 5px;margin-left:4px;} .os-pi span{font-size:12px;color:var(--g500,#667085);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .os-pa{display:flex;gap:2px;} .os-pa>*{width:28px;height:28px;border-radius:8px;border:0;background:none;color:var(--g500,#667085);display:grid;place-items:center;cursor:pointer;} .os-pa>*:hover{background:var(--g100,#f2f4f7);color:var(--periwinkle-deep);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {heroHTML,lineHTML,teamHTML,teamFor,lineClass,lineFlagPill,orderFlagState,refresh};
})();
