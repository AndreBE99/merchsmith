/* admin-page.js — Merchsmith platform admin: login, directory, ghost mode */
(function(){
  const A = window.ADMIN;
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const STLBL = {active:'Active',past_due:'Past due',suspended:'Suspended',pending:'Pending',invited:'Invited',needs_attention:'Needs attention'};
  const KLBL = {product:'Product',branding:'Branding',both:'Product + Branding'};
  const kindCls = k => k==='branding'?'brand':(k==='both'?'both':'prod');
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();

  /* ---------- login ---------- */
  const loginForm=document.getElementById('loginForm');
  loginForm.addEventListener('submit',e=>{ e.preventDefault(); document.getElementById('step1').style.display='none'; document.getElementById('step2').style.display='block'; document.getElementById('loginH').textContent='Two-factor verification'; document.getElementById('loginSub').textContent='One more step to keep the platform secure.'; const f=document.querySelector('.twofa input'); if(f)f.focus(); });
  document.getElementById('ssoBtn').onclick=()=>enterApp();
  document.getElementById('verify2fa').onclick=()=>enterApp();
  // 2fa auto-advance
  const fa=[...document.querySelectorAll('.twofa input')];
  fa.forEach((inp,i)=>inp.addEventListener('input',()=>{ if(inp.value&&fa[i+1]) fa[i+1].focus(); }));
  function enterApp(){ document.getElementById('loginWrap').style.display='none'; document.getElementById('app').classList.add('on'); try{ localStorage.setItem('ms-admin-session','1'); }catch(e){} render(); }
  document.getElementById('logout').onclick=()=>{ try{ localStorage.removeItem('ms-admin-session'); }catch(e){} document.getElementById('app').classList.remove('on'); document.getElementById('loginWrap').style.display='grid'; document.getElementById('step1').style.display='block'; document.getElementById('step2').style.display='none'; document.getElementById('loginH').textContent='Sign in to Merchsmith'; document.getElementById('loginSub').textContent='Operator console — manage distributors, suppliers & the platform.'; };
  // stay signed in across visits until explicit logout
  try{ if(localStorage.getItem('ms-admin-session')) enterApp(); }catch(e){}
  // enterApp() above runs mid-parse during initial script load — before later
  // modules finish loading. Re-render the directory once the document is fully
  // parsed so the distributor/supplier tables reliably populate.
  function __deferredRender(){ try{ if(document.getElementById('app').classList.contains('on')) render(); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', __deferredRender);
  else setTimeout(__deferredRender, 0);

  /* ---------- stats + tabs ---------- */
  function render(){
    const s=A.stats, np=window.MSCAT?MSCAT.stats().products.toLocaleString():'—';
    document.getElementById('statbar').innerHTML=[
      ['Distributors',s.distributors,'distributors'],['Customers',A.distributors.reduce((n,d)=>n+(+d.customers||0),0).toLocaleString('en-GB')],['Suppliers',s.suppliers,'suppliers'],['Products',np,'products'],['Platform MRR',s.mrr,'subscriptions'],['GMV (12mo)',s.gmv]
    ].map(([l,v,n])=>n?`<a class="sb sblink" data-nav="${n}" href="#" onclick="event.preventDefault()"><b>${v}</b><span>${l} ›</span></a>`:`<div class="sb"><b>${v}</b><span>${l}</span></div>`).join('');
    document.getElementById('ctDist').textContent=A.distributors.length;
    document.getElementById('ctSup').textContent=A.suppliers.length;
    renderDist(); renderSup();
  }
  window.__adminRender = render;
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===t));
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+t.dataset.tab));
  });

  /* ---------- distributors ---------- */
  let distQ='', distSt='', dSort={k:'name',dir:1};
  const dF={plan:'',range:'',country:'',domain:''};
  const RANGELBL={curated:'Recommended range',edited:'Recommended + edits',bespoke:'Bespoke range'};
  const STORELBL={live:'Live',draft:'Draft',offline:'Offline'};
  const REAL='acme';   // the one distributor with a real store, range and team in this prototype
  const fmtD=iso=>{ const d=new Date(iso); return isNaN(d)?'—':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); };
  const num=s=>parseFloat(String(s||'').replace(/[^\d.]/g,''))||0;
  const rangeOf=d=>{ if(d.id===REAL&&window.MSCAT&&MSCAT.distConfig){ try{ return MSCAT.distConfig().mode; }catch(e){} } return d.rangeMode||'curated'; };
  const contactOf=d=>({name:d.contactName||d.owner, email:d.contactEmail||d.ownerEmail});
  // monthly billing on the join day; past due shows the missed date, suspended bills nothing
  function renewal(d){
    if(d.status==='invited') return {t:'Not started',sub:'Awaiting onboarding',at:Infinity};
    if(d.status==='suspended'||!d.joined) return {t:'Paused',at:Infinity};
    const j=new Date(d.joined), now=new Date(), day=j.getDate();
    let n=new Date(now.getFullYear(),now.getMonth(),day); if(n<=now) n=new Date(now.getFullYear(),now.getMonth()+1,day);
    if(d.status==='past_due'){ const m=new Date(n.getFullYear(),n.getMonth()-1,day); return {t:fmtD(m),sub:'Overdue',warn:1,at:m.getTime()}; }
    return {t:fmtD(n),sub:Math.ceil((n-now)/864e5)+' days',at:n.getTime()}; }
  // unread = notes/comments on the org written by someone else since this operator last opened it
  const SEENKEY='ms-admin-dist-seen';
  const seenMap=()=>{ try{ return JSON.parse(localStorage.getItem(SEENKEY)||'{}')||{}; }catch(e){ return {}; } };
  function unread(d,seenK){ if(!window.MSNOTES) return 0; const k='org:'+d.id, since=seenMap()[seenK||d.id]||'', me=((window.MSID&&MSID.get&&MSID.get())||{}).who||'';
    try{ return MSNOTES.notes(k).concat(MSNOTES.comments(k)).filter(x=>(!since||x.at>since)&&(!me||x.who!==me)).length; }catch(e){ return 0; } }
  function markSeen(id){ const m=seenMap(); m[id]=new Date().toISOString(); try{ localStorage.setItem(SEENKEY,JSON.stringify(m)); }catch(e){} }
  // lifetime subscription revenue: full months billed since joining × monthly charge (estimate until billing history exists).
  // Past due drops the missed month; suspended accounts stop at their last activity, billed at plan base.
  function revenue(d){
    if(!d.joined) return 0; const s=A.seatInfo(d), j=new Date(d.joined);
    const end=d.status==='suspended'&&d.lastLoginAt?new Date(d.lastLoginAt):new Date();
    let m=(end.getFullYear()-j.getFullYear())*12+(end.getMonth()-j.getMonth())+(end.getDate()>=j.getDate()?1:0);
    if(d.status==='past_due') m--; m=Math.max(0,m);
    return m*(d.status==='suspended'?s.plan.base:s.total); }
  const DCOLS=[
    ['name','Distributor',d=>d.name.toLowerCase()],['contact','Main contact',d=>contactOf(d).name.toLowerCase()],
    ['country','Region',d=>d.country],['plan','Plan',d=>d.plan],['seats','Seats',d=>A.seatInfo(d).used],
    ['customers','Customers',d=>d.customers],['mrr','MRR',d=>A.seatInfo(d).total],['arr','Annual revenue',d=>A.seatInfo(d).total*12],['rev','Total revenue',d=>revenue(d)],
    ['status','Status',d=>d.status],['joined','Joined',d=>d.joined||''],
    ['last','Last active',d=>d.lastLoginAt?-new Date(d.lastLoginAt):Infinity]];
  function renderDistHead(){
    document.getElementById('distHead').innerHTML=DCOLS.map(([k,l])=>`<th data-sort="${k}">${l}<span class="sarr">${dSort.k===k?(dSort.dir>0?'↑':'↓'):''}</span></th>`).join('')+'<th></th>';
    const opts=(key,lbl,vals)=>`<select data-df="${key}" class="${dF[key]?'on':''}"><option value="">${lbl}: all</option>${vals.map(([v,t])=>`<option value="${esc(v)}"${dF[key]===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
    const countries=[...new Set(A.distributors.map(d=>d.country).filter(Boolean))].sort();
    const any=Object.values(dF).some(Boolean);
    document.getElementById('distMore').innerHTML=
      opts('plan','Plan',(A.plans||[]).map(p=>[p.name,p.name]))+
      opts('range','Range',Object.entries(RANGELBL))+
      opts('country','Region',countries.map(c=>[c,c]))+
      (window.MSDOMAIN?opts('domain','Domain',Object.entries(MSDOMAIN.STATUS).map(([k,v])=>[k,v.label])):'')+
      (any?`<button class="dfclear" data-dfclear>Clear filters</button>`:'');
  }
  function renderDist(){
    renderDistHead();
    const col=DCOLS.find(c=>c[0]===dSort.k)||DCOLS[0];
    const rows=A.distributors.filter(d=>{
      const c=contactOf(d);
      const m=(d.name+d.owner+d.domain+d.ownerEmail+c.name+c.email+d.country).toLowerCase().includes(distQ.toLowerCase());
      return m && (!distSt||d.status===distSt) && (!dF.plan||d.plan===dF.plan) && (!dF.range||rangeOf(d)===dF.range)
        && (!dF.country||d.country===dF.country) && (!dF.domain||!window.MSDOMAIN||MSDOMAIN.statusOf(d.id)===dF.domain);
    }).sort((a,b)=>{ const x=col[2](a), y=col[2](b); return (x<y?-1:x>y?1:0)*dSort.dir || a.name.localeCompare(b.name); });
    document.getElementById('distRows').innerHTML = rows.length?rows.map(d=>{ const c=contactOf(d), u=unread(d);
      return `<tr data-dist="${d.id}">
        <td><div class="orgcell"><div class="orglogo dist"${d.logo?' style="background:#fff;border:1px solid var(--line-soft)"':''}>${d.logo?`<img src="${d.logo}" alt="" style="width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box">`:d.initials}</div><div><b class="dname">${esc(d.name)}${u?`<i class="dtag unread" title="New notes or comments since you last opened this distributor">${u} new</i>`:''}</b><span>${window.MSDOMAIN?MSDOMAIN.chip(d):''}${esc((window.MSDOMAIN&&MSDOMAIN.get(d.id)||{}).host||d.domain)}</span></div></div></td>
        <td><div style="display:flex;align-items:center;gap:10px"><span style="width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;overflow:hidden;background:var(--tint-peri);color:var(--periwinkle-ink);font-size:11.5px;font-weight:800">${window.MSPEOPLE?MSPEOPLE.avHTML({n:c.name,email:c.email},32):esc(c.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''))}</span><div class="dsub" style="min-width:0"><b>${esc(c.name)}</b>${esc(c.email||'')}</div></div></td>
        <td class="dsub">${esc(d.country)||'—'}</td>
        <td>${d.plan?`<span class="plan pl-${String(d.plan).toLowerCase()}">${d.plan}</span><span class="drange">${RANGELBL[rangeOf(d)]}</span>`:'<span class="drange" style="margin:0">Chosen at onboarding</span>'}</td>
        <td>${d.status==='invited'?'<span class="drange" style="margin:0">—</span>':(window.__seatCell?__seatCell(A.seatInfo(d)):'')}</td>
        <td class="scell">${d.customers}</td>
        <td class="scell">${d.mrr}</td>
        <td class="scell" title="MRR × 12">${A.money(d.cur,A.seatInfo(d).total*12)}</td>
        <td class="scell" title="Months billed since joining × monthly charge">${A.money(d.cur,revenue(d))}</td>
        <td><span class="stbadge st-${d.status}">${STLBL[d.status]}</span></td>
        <td class="dsub">${fmtD(d.joined)}</td>
        <td class="dsub" title="${d.lastLoginAt?esc(new Date(d.lastLoginAt).toLocaleString('en-GB')):''}">${esc(d.lastActive||'—')}</td>
        <td><div class="rowact">
          <button class="iconbtn" data-view="${d.id}"><svg class="icn"><use href="#a-eye"/></svg>View</button>
          <button class="iconbtn dmenu-btn" data-dmenu="${d.id}" title="More actions" aria-label="More actions">•••</button>
        </div></td>
      </tr>`; }).join('') : `<tr><td colspan="${DCOLS.length+1}" style="text-align:center;color:var(--muted);padding:34px">No distributors match.</td></tr>`;
  }
  document.getElementById('distHead').onclick=e=>{ const th=e.target.closest('th[data-sort]'); if(!th) return; const k=th.dataset.sort;
    dSort = dSort.k===k ? {k,dir:-dSort.dir} : {k,dir:1}; renderDist(); };
  document.getElementById('distMore').onchange=e=>{ const s=e.target.closest('[data-df]'); if(!s) return; dF[s.dataset.df]=s.value; renderDist(); };
  document.getElementById('distMore').onclick=e=>{ if(e.target.closest('[data-dfclear]')){ Object.keys(dF).forEach(k=>dF[k]=''); renderDist(); } };

  /* quick actions menu */
  const pendingInvites=d=>d.status==='invited'?[{n:d.owner,email:d.ownerEmail,_owner:1}]:d.id===REAL&&window.ORG_DATA?(ORG_DATA.mojoTeams||[]).flatMap(t=>t.users||[]).filter(u=>u.status==='invited'):[];
  function closeDMenu(){ const m=document.getElementById('dmenu'); if(m) m.remove(); }
  function openDMenu(btn,d){
    closeDMenu(); const inv=pendingInvites(d), real=d.id===REAL;
    const m=document.createElement('div'); m.id='dmenu'; m.className='dmenu';
    m.innerHTML=`<button data-dm="store"${real?'':' disabled'}>Open store<span>${real?esc(d.domain):'Only Mojo Promotions has a store in this prototype'}</span></button>
      <button data-dm="msg">Message ${esc(d.owner.split(' ')[0])}<span>Owner · opens chat</span></button>
      <button data-dm="ghost">Ghost into account<span>Needs the distributor's permission</span></button>
      <button data-dm="invite"${inv.length?'':' disabled'}>Resend invites<span>${inv.length?inv.length+' pending: '+esc(inv.map(u=>u.n).join(', ')):'No pending invites'}</span></button>`;
    document.body.appendChild(m);
    const r=btn.getBoundingClientRect(), h=m.offsetHeight, w=m.offsetWidth;
    m.style.left=Math.max(8,r.right-w)+'px'; m.style.top=(r.bottom+6+h>innerHeight?Math.max(8,r.top-h-6):r.bottom+6)+'px';
    m.onclick=e=>{ const b=e.target.closest('[data-dm]'); if(!b||b.disabled) return; e.stopPropagation(); closeDMenu(); dAction(b.dataset.dm,d,inv); };
  }
  function dAction(a,d,inv){
    if(a==='store'){ window.open('Merchsmith Store.html','_blank'); return; }
    if(a==='ghost'){ startGhost(d.id); return; }
    if(a==='msg'){ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith({name:d.owner,email:d.ownerEmail}); else toast('Chat is still loading — try again'); return; }
    if(a==='invite'){ const P=window.MSPEOPLE, at=new Date().toISOString();
      if(d.status==='invited'){ d.invitedAt=at; try{ const k='ms-admin-invited-dists', l=JSON.parse(localStorage.getItem(k)||'[]'); l.forEach(x=>{ if(x.id===d.id) x.invitedAt=at; }); localStorage.setItem(k,JSON.stringify(l)); }catch(e){}
        if(window.MSNOTES) MSNOTES.log('org:'+d.id,'invite','Invitation resent to '+d.ownerEmail); toast('Invite resent to '+d.owner+' ('+d.ownerEmail+')'); return; }
      inv.forEach(u=>{ if(P){ P.saveUser('mojo',u,{invitedAt:at}); P.log('mojo',u,'invited','Invitation resent by Merchsmith'); } u.invitedAt=at; });
      toast(`Invite${inv.length===1?'':'s'} resent to ${inv.map(u=>u.n).join(', ')}`); return; }
  }
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-dmenu]');
    if(b){ e.stopPropagation(); const open=document.getElementById('dmenu'); if(open&&open.dataset.for===b.dataset.dmenu){ closeDMenu(); return; }
      const d=A.distributors.find(x=>x.id===b.dataset.dmenu); if(d){ openDMenu(b,d); document.getElementById('dmenu').dataset.for=d.id; } return; }
    if(!e.target.closest('#dmenu')&&!e.target.closest('[data-smenu]')) closeDMenu(); },true);
  window.addEventListener('scroll',closeDMenu,true);
  document.getElementById('distSearch').oninput=e=>{ distQ=e.target.value; renderDist(); };
  document.getElementById('distFilters').onclick=e=>{ const b=e.target.closest('.fbtn'); if(!b)return; document.querySelectorAll('#distFilters .fbtn').forEach(x=>x.classList.toggle('on',x===b)); distSt=b.dataset.st; renderDist(); };

  /* ---------- suppliers ---------- */
  let supQ='', supK='', sSort={k:'name',dir:1};
  const sF={country:'',conn:'',status:''};
  const connOf=s=>s.kind==='branding'?'decoration':/api/i.test((s.connection||'')+' '+(s.feed||''))?'api':/csv/i.test((s.connection||'')+' '+(s.feed||''))?'csv':'manual';
  const CONNLBL={api:'API feed',csv:'CSV upload',manual:'Manual',decoration:'Decoration only'};
  const sCountry=s=>(A.countryName?A.countryName(s.region):s.region)||'';
  function supContact(s){
    let u=null; try{ const o=window.MSAdminOrgs&&MSAdminOrgs.orgOf({kind:'sup',rec:s}); const all=o?o.teams.flatMap(t=>t.users).filter(x=>x.status!=='deactivated'):[];
      u=all.find(x=>/admin/i.test(x.role||''))||all[0]||null; }catch(e){}
    return u?{name:u.n,email:u.email||'',u}:{name:s.contactName||'',email:s.contactEmail||'',u:null}; }
  function supPending(s){ try{ const o=window.MSAdminOrgs&&MSAdminOrgs.orgOf({kind:'sup',rec:s}); return o?o.teams.flatMap(t=>t.users).filter(x=>x.status==='invited').map(u=>Object.assign(u,{_org:o.key})):[]; }catch(e){ return []; } }
  const supUnread=s=>unread({id:s.id},'s:'+s.id);
  function supCounts(){ const m={}; if(window.MSCAT) MSCAT.all().forEach(x=>{ const c=m[x.supplier]=m[x.supplier]||{all:0,rec:0}; c.all++; if(x.curated) c.rec++; }); return m; }
  function lastImport(s){ const l=window.MSCAT&&MSCAT.importLog?MSCAT.importLog(s.name):[]; return l.length?l[0].at:null; }
  const SCOLS=[
    ['name','Supplier',s=>s.name.toLowerCase()],['contact','Main contact',s=>supContact(s).name.toLowerCase()],['country','Region',s=>sCountry(s)],
    ['kind','Type',s=>KLBL[s.kind]||''],['conn','Feed',s=>CONNLBL[connOf(s)]],['products','Products',(s,C)=>((C[s.name]||{}).all)||s.products||0],
    ['rec','In Recommended',(s,C)=>(C[s.name]||{}).rec||0],['used','Used by',s=>s.usedBy||0],['status','Status',s=>s.status],
    ['since','Since',s=>String(s.since||'')],['imp','Last import',s=>lastImport(s)||'']];
  function renderSupHead(){
    document.getElementById('supHead').innerHTML=SCOLS.map(([k,l])=>`<th data-sort="${k}">${l}<span class="sarr">${sSort.k===k?(sSort.dir>0?'\u2191':'\u2193'):''}</span></th>`).join('')+'<th></th>';
    const opts=(key,lbl,vals)=>`<select data-sf="${key}" class="${sF[key]?'on':''}"><option value="">${lbl}: all</option>${vals.map(([v,t])=>`<option value="${esc(v)}"${sF[key]===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
    const cs=[...new Set(A.suppliers.map(sCountry).filter(Boolean))].sort(), sts=[...new Set(A.suppliers.map(s=>s.status))];
    document.getElementById('supMore').innerHTML=opts('country','Region',cs.map(c=>[c,c]))+opts('conn','Feed',Object.entries(CONNLBL))+opts('status','Status',sts.map(s=>[s,STLBL[s]||s]))
      +(Object.values(sF).some(Boolean)?'<button class="dfclear" data-sfclear>Clear filters</button>':'');
  }
  function renderSup(){
    renderSupHead(); const C=supCounts(), col=SCOLS.find(c=>c[0]===sSort.k)||SCOLS[0];
    const rows=A.suppliers.filter(s=>{ const c=supContact(s);
      const m=(s.name+s.domain+s.region+sCountry(s)+c.name+c.email).toLowerCase().includes(supQ.toLowerCase());
      return m && (!supK||s.kind===supK) && (!sF.country||sCountry(s)===sF.country) && (!sF.conn||connOf(s)===sF.conn) && (!sF.status||s.status===sF.status);
    }).sort((x,y)=>{ const a=col[2](x,C), b=col[2](y,C); return (a<b?-1:a>b?1:0)*sSort.dir || x.name.localeCompare(y.name); });
    document.getElementById('supRows').innerHTML = rows.length?rows.map(s=>{ const c=supContact(s), n=C[s.name]||{}, u=supUnread(s), li=lastImport(s), prods=n.all||s.products||0;
      return `<tr data-sup="${s.id}">
        <td><div class="orgcell"><div class="orglogo ${kindCls(s.kind)}"${s.logo?' style="background:#fff;border:1px solid var(--line-soft)"':''}>${s.logo?`<img src="${esc(s.logo)}" alt="" style="width:100%;height:100%;object-fit:contain;padding:3px;box-sizing:border-box">`:s.initials}</div><div><b class="dname">${esc(s.name)}${u?`<i class="dtag unread" title="New notes or comments since you last opened this supplier">${u} new</i>`:''}</b><span>${esc(s.domain||'')}</span></div></div></td>
        <td>${c.name?`<div style="display:flex;align-items:center;gap:10px"><span style="width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;overflow:hidden;background:var(--tint-peri);color:var(--periwinkle-ink);font-size:11.5px;font-weight:800">${window.MSPEOPLE?MSPEOPLE.avHTML(c.u||{n:c.name},32):esc(c.name.slice(0,2))}</span><div class="dsub" style="min-width:0"><b>${esc(c.name)}</b>${esc(c.email)}</div></div>`:'<span class="drange" style="margin:0">No contact yet</span>'}</td>
        <td class="dsub">${esc(sCountry(s))||'\u2014'}</td>
        <td><span class="stype st-${kindCls(s.kind)}">${KLBL[s.kind]||'Product'}</span></td>
        <td class="dsub"><b>${CONNLBL[connOf(s)]}</b>${esc(s.feed||'')}</td>
        <td class="scell">${prods?prods.toLocaleString():'\u2014'}</td>
        <td class="scell">${s.kind==='branding'?'\u2014':(n.rec||0).toLocaleString()}</td>
        <td class="scell">${s.usedBy||0} distributor${s.usedBy===1?'':'s'}</td>
        <td><span class="stbadge st-${s.status}">${STLBL[s.status]||s.status}</span></td>
        <td class="dsub">${esc(s.since||'\u2014')}</td>
        <td class="dsub">${li?fmtD(li):'\u2014'}</td>
        <td><div class="rowact">
          <button class="iconbtn" data-viewsup="${s.id}"><svg class="icn"><use href="#a-eye"/></svg>View</button>
          <button class="iconbtn dmenu-btn" data-smenu="${s.id}" title="More actions" aria-label="More actions">\u2022\u2022\u2022</button>
        </div></td></tr>`; }).join('') : `<tr><td colspan="${SCOLS.length+1}" style="text-align:center;color:var(--muted);padding:34px">No suppliers match.</td></tr>`;
  }
  document.getElementById('supHead').onclick=e=>{ const th=e.target.closest('th[data-sort]'); if(!th) return; const k=th.dataset.sort; sSort=sSort.k===k?{k,dir:-sSort.dir}:{k,dir:1}; renderSup(); };
  document.getElementById('supMore').onchange=e=>{ const s=e.target.closest('[data-sf]'); if(!s) return; sF[s.dataset.sf]=s.value; renderSup(); };
  document.getElementById('supMore').onclick=e=>{ if(e.target.closest('[data-sfclear]')){ Object.keys(sF).forEach(k=>sF[k]=''); renderSup(); } };
  function openSMenu(btn,s){
    closeDMenu(); const inv=supPending(s), c=supContact(s), prod=s.kind!=='branding';
    const m=document.createElement('div'); m.id='dmenu'; m.className='dmenu'; m.dataset.for='s:'+s.id;
    m.innerHTML=`<button data-sm="msg"${c.name?'':' disabled'}>Message ${c.name?esc(c.name.split(' ')[0]):'contact'}<span>${c.name?'Main contact \u00b7 opens chat':'No contact yet'}</span></button>
      <button data-sm="import"${prod?'':' disabled'}>Import products<span>${prod?'Upload or sync their feed':'Branding-only supplier'}</span></button>
      <button data-sm="products"${prod?'':' disabled'}>View their products<span>Opens the product database, filtered</span></button>
      <button data-sm="invite"${inv.length?'':' disabled'}>Resend invites<span>${inv.length?inv.length+' pending: '+esc(inv.map(u=>u.n).join(', ')):'No pending invites'}</span></button>
      <hr><a data-sm="site" href="https://${esc(s.domain||'')}" target="_blank" rel="noopener" style="font-size:13.5px;text-decoration:none;color:var(--ink);border-radius:8px;padding:9px 11px;display:flex;flex-direction:column;gap:1px">Open website \u2197<span style="font-size:11.5px;color:var(--muted)">${esc(s.domain||'')}</span></a>`;
    document.body.appendChild(m);
    const r=btn.getBoundingClientRect(), h=m.offsetHeight, w=m.offsetWidth;
    m.style.left=Math.max(8,r.right-w)+'px'; m.style.top=(r.bottom+6+h>innerHeight?Math.max(8,r.top-h-6):r.bottom+6)+'px';
    m.onclick=e=>{ const b=e.target.closest('[data-sm]'); if(!b||b.disabled) return; e.stopPropagation(); closeDMenu(); const a=b.dataset.sm;
      if(a==='msg'){ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith({name:c.name,email:c.email,orgName:s.name,orgType:'supplier'}); else toast('Chat is still loading \u2014 try again'); }
      else if(a==='import'){ if(window.MSImport) MSImport.open({supplier:s.name,supId:s.id}); }
      else if(a==='products'){ if(window.MSProducts&&MSProducts.openSupplier) MSProducts.openSupplier(s.name); }
      else if(a==='invite'){ const P=window.MSPEOPLE, at=new Date().toISOString();
        inv.forEach(u=>{ if(P){ P.saveUser(u._org,u,{invitedAt:at}); P.log(u._org,u,'invited','Invitation resent by Merchsmith'); } u.invitedAt=at; });
        toast(`Invite${inv.length===1?'':'s'} resent to ${inv.map(u=>u.n).join(', ')}`); } };
  }
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-smenu]'); if(!b) return; e.stopPropagation();
    const o=document.getElementById('dmenu'); if(o&&o.dataset.for==='s:'+b.dataset.smenu){ closeDMenu(); return; }
    const s=A.suppliers.find(x=>x.id===b.dataset.smenu); if(s) openSMenu(b,s); },true);
  document.getElementById('supSearch').oninput=e=>{ supQ=e.target.value; renderSup(); };
  document.getElementById('supFilters').onclick=e=>{ const b=e.target.closest('.fbtn'); if(!b)return; document.querySelectorAll('#supFilters .fbtn').forEach(x=>x.classList.toggle('on',x===b)); supK=b.dataset.k; renderSup(); };

  /* ---------- drawer ---------- */
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  function open(html,ctx){ drawer.classList.remove('ao-brand');
    if(ctx&&ctx.kind==='dist'&&ctx.rec){ drawer.dataset.distid=ctx.rec.id; markSeen(ctx.rec.id); } else delete drawer.dataset.distid;
    if(ctx&&ctx.kind==='sup'&&ctx.rec){ drawer.dataset.supid=ctx.rec.id; markSeen('s:'+ctx.rec.id); } else delete drawer.dataset.supid; drawer.innerHTML=html;
    if(window.MSNOTES&&MSNOTES.wire) drawer.querySelectorAll('[data-entkey]').forEach(h=>{ try{ MSNOTES.wire(h,h.dataset.entkey); }catch(e){} }); scrim.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow='hidden'; drawer.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);
    if(ctx&&ctx.kind==='dist'&&window.MSDOMAIN) MSDOMAIN.wireAdmin(drawer,ctx.rec,()=>{ open(distDrawer(ctx.rec),ctx); renderDist(); });
    if(ctx&&window.MSAdminOrgs) MSAdminOrgs.enhance(drawer,ctx,()=>open(ctx.kind==='dist'?distDrawer(ctx.rec):supDrawer(ctx.rec),ctx));
    drawer.querySelectorAll('[data-aoeditbtn]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const p=drawer.querySelector('[data-aoedit]'); if(p) p.click(); });
    if(ctx&&ctx.rec&&window.MSNOTES){ const body=drawer.querySelector('.dwr-body'); const k='org:'+ctx.rec.id;
      if(body&&!body.querySelector('[data-entkey]')){ const h=document.createElement('div'); h.className='dwr-sec'; h.dataset.entkey=k; h.innerHTML=MSNOTES.panelHTML(k);
        const foot=body.querySelector(':scope > .dwr-foot'); if(foot) body.insertBefore(h,foot); else body.appendChild(h); MSNOTES.wire(h,k); } } }
  function close(){ scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow='';
    if(drawer.dataset.distid){ markSeen(drawer.dataset.distid); delete drawer.dataset.distid; renderDist(); }
    if(drawer.dataset.supid){ markSeen('s:'+drawer.dataset.supid); delete drawer.dataset.supid; renderSup(); } }
  scrim.onclick=close;
  const flagBanner=o=>o.flag?`<div class="flagbar fb-${o.flag.level}"><svg class="icn"><use href="#a-flag"/></svg><div><b>${o.flag.level==='red'?'Action needed':o.flag.level==='amber'?'Attention':'Note'}</b><span>${esc(o.flag.note)}</span></div></div>`:'';

  // same shape as the distributor's customer panel: at a glance (linked), key contacts, overview, notes
  function distGlance(d){ const si=A.seatInfo(d), K=[['Customers',d.customers||0,'#nav=users'],['Suppliers',d.suppliers||0,'#nav=suppliers'],['Team users',d.users||(d.team||[]).length+1,'#nav=users'],['Active projects',d.activeProjects||0,''],['GMV (12mo)',d.gmv||'£0','#nav=subscriptions'],['MRR',si.totalTxt||d.mrr||'£0','#nav=subscriptions']];
    if(!document.getElementById('adGlCss')){ const s=document.createElement('style'); s.id='adGlCss'; s.textContent='.ad-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;} .ad-kpis>*{display:block;text-decoration:none;color:var(--ink);border:1px solid var(--line-soft);border-radius:12px;padding:10px 12px;background:#fff;} .ad-kpis>a:hover{border-color:var(--periwinkle);box-shadow:0 4px 14px rgba(40,44,80,.08);} .ad-kpis>a:hover span{color:var(--periwinkle-deep);} .ad-kpis b{display:block;font-family:var(--serif);font-weight:500;font-size:20px;line-height:1.2;} .ad-kpis span{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);} .kc{display:flex;flex-direction:column;gap:6px;} .kc-row{display:flex;align-items:center;gap:11px;border:1px solid var(--line-soft);border-radius:12px;padding:9px 12px;background:#fff;} .kc-row .av{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--paper-2);font-size:11.5px;font-weight:800;color:var(--ink-3);overflow:hidden;} .kc-row .av img{width:100%;height:100%;object-fit:cover;} .kc-t{flex:1;min-width:0;display:flex;flex-direction:column;} .kc-t b{font-size:14px;} .kc-t i{font-style:normal;font-size:12px;color:var(--muted);} .kc-t a{color:var(--periwinkle-deep);text-decoration:none;} .kc-row em{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:6px;padding:3px 8px;white-space:nowrap;background:var(--paper-2);color:var(--ink-3);} .kc-row.cust{border-color:color-mix(in srgb,var(--spearmint) 55%,#fff);background:color-mix(in srgb,var(--spearmint) 8%,#fff);} .kc-row.cust em{background:color-mix(in srgb,var(--spearmint) 30%,#fff);color:#1d6b58;} .kc-row.dist{border-color:var(--periwinkle);background:var(--tint-peri);} .kc-row.dist em{background:var(--periwinkle-deep);color:#fff;} @media(max-width:420px){.ad-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}}'; document.head.appendChild(s); }
    return '<div class="dwr-sec"><div class="sec-hd"><h4>At a glance</h4></div><div class="ad-kpis">'+K.map(([l,v,h])=>h?'<a href="'+h+'"><b>'+esc(v)+'</b><span>'+esc(l)+' ›</span></a>':'<div><b>'+esc(v)+'</b><span>'+esc(l)+'</span></div>').join('')+'</div></div>'; }
  function distContacts(d){ const ini=n=>String(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(), ph=n=>window.MSPEOPLE&&MSPEOPLE.photo?MSPEOPLE.photo({n}):'';
    const av=n=>{ const p=ph(n); return p?'<img src="'+esc(p)+'" alt="">':esc(ini(n)); };
    const row=(n,sub,tag,cls)=>'<div class="kc-row '+cls+'"><span class="av">'+av(n)+'</span><span class="kc-t"><b>'+esc(n)+'</b><i>'+sub+'</i></span>'+(tag?'<em>'+esc(tag)+'</em>':'')+'</div>';
    const mc=(A.team||[]).find(u=>u.n===d.onboardingOwner)||(A.team||[]).find(u=>u.role==='Admin')||(A.team||[])[0], fin=(d.team||[]).find(u=>/finance/i.test(u.role||''));
    return '<div class="dwr-sec"><div class="sec-hd"><h4>Key contacts</h4></div><div class="kc">'
      +(d.owner?row(d.owner,esc(d.ownerTitle||'Owner')+' · '+esc(d.name)+(d.ownerEmail?' · <a href="mailto:'+esc(d.ownerEmail)+'">'+esc(d.ownerEmail)+'</a>':''),'Distributor main contact','cust'):'')
      +(mc?row(mc.n,esc(mc.title||mc.role||'')+' · Merchsmith','Your main contact','dist'):'')
      +(fin?row(fin.n||fin.email,esc(fin.role)+(fin.email?' · <a href="mailto:'+esc(fin.email)+'">'+esc(fin.email)+'</a>':'')+(fin.status==='invited'?' · invited':''),'Finance',''):'')
      +'</div></div>'; }
  function distDrawer(d){
    return `<div class="dwr-head"><div class="orglogo dist" style="width:46px;height:46px${d.logo?';background:#fff;border:1px solid var(--line-soft)':''}">${d.logo?`<img src="${d.logo}" alt="" style="width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box">`:d.initials}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(d.name)}</h2>
      <div style="font-size:13px;color:var(--text-soft);margin-top:2px">Distributor · ${d.plan?d.plan+' plan':'Plan not chosen yet'} · ${d.status==='invited'?'invited':'since'} ${d.since}</div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      ${flagBanner(d)}
      ${distGlance(d)}
      ${distContacts(d)}
      <div class="dwr-sec"><h4>Overview</h4><div class="kv">
        <span class="k">Domain</span><span class="v">${esc(d.domain||'—')}</span>
        <span class="k">Region</span><span class="v">${esc(d.region||'—')}</span>
        ${d.address?`<span class="k">Address</span><span class="v">${esc(d.address)}</span>`:''}
        ${d.theme&&d.theme.vars?`<span class="k">Colourway</span><span class="v" style="display:flex;gap:4px;align-items:center">${Object.values(d.theme.vars).map(c=>`<i style="width:18px;height:18px;border-radius:5px;background:${esc(c)};border:1px solid var(--line-soft)"></i>`).join('')}</span>`:(d.brand&&d.brand.colours?`<span class="k">Colourway</span><span class="v" style="display:flex;gap:4px;align-items:center">${Object.values(d.brand.colours).map(c=>`<i style="width:18px;height:18px;border-radius:5px;background:${esc(c)};border:1px solid var(--line-soft)"></i>`).join('')}</span>`:'')}
        <span class="k">Status</span><span class="v">${STLBL[d.status]||esc(d.status)}</span>
        <span class="k">Last active</span><span class="v">${esc(d.lastActive||'—')}</span>
      </div></div>
      <div class="dwr-sec"><div class="sec-hd"><h4>Subscription &amp; billing</h4><a class="seclink" href="#nav=subscriptions">Subscriptions ›</a></div><div class="kv">
        <span class="k">Plan</span><span class="v">${d.plan?d.plan+' · '+A.seatInfo(d).baseTxt+'/mo base':'Chosen at onboarding'}</span>
        <span class="k">MRR</span><span class="v">${A.seatInfo(d).totalTxt}${A.seatInfo(d).extra?' incl. overage':''}</span>
        ${window.MSBILL?MSBILL.adminLines(d):''}
        ${(()=>{ const r=renewal(d); return `<span class="k">Next billing</span><span class="v"${r.warn?' style="color:#b4232c;font-weight:600"':''}>${r.t}${r.sub?' · '+r.sub:''}</span>`; })()}
      </div></div>
      <div data-aopeople></div>
      ${window.MSADMP?MSADMP.orders('dist',d)+MSADMP.service('dist',d):''}
      ${window.MSDOMAIN?MSDOMAIN.adminSection(d):''}
      ${window.MSNOTES&&MSNOTES.panelHTML?`<div class="dwr-sec"><div data-entkey="dist:${esc(d.id)}">${MSNOTES.panelHTML('dist:'+d.id)}</div></div>`:''}
      <div class="dwr-foot">
        <button class="btn" style="flex:1" data-ghostgo="${d.id}"><svg class="icn" style="width:16px;height:16px"><use href="#a-ghost"/></svg>Ghost into ${esc(d.name)}</button>
        <button class="btn ghost" data-x>Close</button>
      </div>
      <p style="font-size:11.5px;color:var(--muted);margin-top:10px">Ghosting opens the distributor's own platform as a read-through session — every action is logged to the audit trail.</p>
    </div>`;
  }
  // manual catalogue section in the supplier drawer
  function supCatalogueSection(s){
    const isProd = s.kind==='product'||s.kind==='both';
    const fedConn = s.connection==='api'||s.connection==='csv' || /api|csv|feed/i.test(s.feed||'') || (s.products||0)>0;
    const fed = isProd && fedConn;
    const cat = s.catalogue||[];
    if(s.kind==='branding'){
      return `<div class="dwr-sec"><h4>Catalogue</h4><div class="as-note" style="margin:0"><svg class="icn" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><p>Branding-only supplier — provides decoration, not products.</p></div></div>`;
    }
    if(fed && !cat.length){
      return `<details class="dwr-sec sd-subfold"><summary><h4>Manual products</h4><span class="sd-chev" aria-hidden="true"></span></summary><p class="supnote" style="margin:0 0 10px">None yet. Add one-off products the feed doesn't carry.</p><button class="btn ghost sm" data-addproduct="${s.id}">+ Add product manually</button></details>`;
    }
    if(fed){
      return `<div class="dwr-sec"><h4>Products on the feed · ${(s.products||0).toLocaleString()}</h4><div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><button class="btn ghost sm" data-addproduct="${s.id}">+ Add product</button></div><div class="supprods">${cat.map(p=>`<div class="supprod" data-prod="${p.id}"><span class="supprodimg">${esc((p.name||'?').slice(0,1))}</span><div class="supprodm"><b>${esc(p.name)}</b><span>${esc(p.dept||'—')}${p.cat?' · '+esc(p.cat):''} · MOQ ${p.moq||'—'} · manual</span></div><b class="supprodp">${p.priceBreaks&&p.priceBreaks[0]?'£'+(+p.priceBreaks[0].unit).toFixed(2):'—'}</b><button class="as-udel" data-delproduct="${s.id}:${p.id}" title="Remove">×</button></div>`).join('')}</div></div>`;
    }
    const rows = cat.map(p=>`<div class="supprod" data-prod="${p.id}"><span class="supprodimg">${esc((p.name||'?').slice(0,1))}</span><div class="supprodm"><b>${esc(p.name)}</b><span>${esc(p.dept||'—')}${p.cat?' · '+esc(p.cat):''} · MOQ ${p.moq||'—'}</span></div><b class="supprodp">${p.priceBreaks&&p.priceBreaks[0]?'£'+(+p.priceBreaks[0].unit).toFixed(2):'—'}</b><button class="as-udel" data-delproduct="${s.id}:${p.id}" title="Remove">×</button></div>`).join('');
    return `<details class="dwr-sec sd-subfold"><summary><h4>Manual products · ${cat.length}</h4><span class="sd-chev" aria-hidden="true"></span></summary>
      <div class="supprods">${rows||'<p class="as-emptyrow">No manual products yet.</p>'}</div>
      <button class="btn ghost sm" data-addproduct="${s.id}" style="margin-top:12px">+ Add product</button></details>`;
  }
  // connection & mapping hub — field mapping (connect-time) + category mapping (post-sync), revisitable
  function supConnectionSection(s){
    const isProd = s.kind==='product'||s.kind==='both';
    const isApi = s.connection==='api' || /api/i.test(s.feed||'');
    if(s.kind==='branding' || !isProd) return '';
    const gaps = (window.MSSupplierMap&&s.fieldMap)?MSSupplierMap.requiredGaps(s):0;
    const fmStat = (window.MSSupplierMap&&s.fieldMap)?MSSupplierMap.fieldMapStats(s):null;
    const fmLine = isApi ? (s.fieldMap ? (gaps>0?`<span class="map-warn">${gaps} field${gaps===1?'':'s'} need mapping</span>`:`<span class="map-ok">${fmStat?fmStat.mappedReq:5}/${fmStat?fmStat.reqTotal:5} required mapped</span>`) : '<span class="map-warn">Not yet mapped</span>') : '<span class="map-na">n/a · not an API feed</span>';
    const editBtn = (isApi&&s.fieldMap) ? `<button class="btn ghost sm" data-editfmap="${s.id}">Edit field mapping</button>` : '';
    return `<details class="dwr-sec sd-subfold"><summary><h4>Connection &amp; mapping</h4><span class="sd-chev" aria-hidden="true"></span></summary>
      ${gaps>0?`<div class="flagbar fb-amber"><svg class="icn"><use href="#a-flag"/></svg><div><b>Mapping incomplete</b><span>${gaps} required field${gaps===1?'':'s'} unmapped — products won't sync until resolved.</span></div></div>`:''}
      <div class="kv">
        <span class="k">Connection</span><span class="v">${esc(s.feed||'—')}</span>
        <span class="k">Field mapping</span><span class="v">${fmLine}</span>
      </div>
      <div class="map-actions">${editBtn}</div>
    </details>`;
  }
  window.__openSupplier = id => { const s=A.suppliers.find(x=>x.id===id); if(s) open(supDrawer(s),{kind:'sup',rec:s}); };
  window.__supplierById = id => A.suppliers.find(x=>x.id===id);
  function supDrawer(s){ if(window.MSADMP) MSADMP.supGlance(s,0);
    const typeLbl = s.kind==='branding'?'Branding only':(s.kind==='both'?'Product + branding':'Product (blanks)');
    return `<div class="dwr-head"><div class="orglogo ${kindCls(s.kind)}" style="width:46px;height:46px">${s.initials}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(s.name)}</h2>
      <div class="sd-sub"><span class="stbadge st-${s.status}">${STLBL[s.status]}</span><span>${typeLbl} supplier</span><span>${esc(s.region||'')}</span></div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      ${s.status==='invited'?`<div class="flagbar fb-grey"><svg class="icn"><use href="#a-flag"/></svg><div><b>Invitation sent</b><span>Awaiting the supplier to complete onboarding. They can invite their own people once they join.</span></div></div>`:''}
      ${window.MSADMP?MSADMP.supGlance(s,s.products||0)+MSADMP.supContacts(s,supContact(s),A.team):''}
      <details class="dwr-sec sd-fold" open><summary><h4>Details</h4><span class="sd-sumr"><button class="btn ghost sm" data-aoeditbtn>Edit organisation</button><span class="sd-chev" aria-hidden="true"></span></span></summary><div class="kv">
        <span class="k">Website</span><span class="v"><a href="https://${esc(s.domain)}" target="_blank" rel="noopener" style="color:var(--periwinkle-deep);text-decoration:none">${esc(s.domain)} ↗</a></span>
        ${s.matchDomains&&s.matchDomains.length?`<span class="k">Email domains</span><span class="v">${esc(s.matchDomains.join(', '))}</span>`:''}
        ${s.companyNo?`<span class="k">Company number</span><span class="v">${esc(s.companyNo)}</span>`:''}
        ${(()=>{ const b=window.MSPEOPLE?MSPEOPLE.addrBook(s).sort((x,y)=>(y.isDefault?1:0)-(x.isDefault?1:0)):[]; if(!b.length) return '';
          return `<span class="k">${b.length>1?'Addresses':'Address'}</span><span class="v sd-abook">${b.map(x=>`<details class="sd-aent"><summary><b>${esc(x.title||'Address')}${x.isDefault?' <i>Default</i>':''}</b><em>${esc(MSPEOPLE.lineText(x).join(', '))}</em></summary>${MSPEOPLE.lineText(x).map(l=>`<span>${esc(l)}</span>`).join('')}</details>`).join('')}</span>`; })()}
        ${(s.specialisms&&s.specialisms.length)?`<span class="k">Specialism</span><span class="v sd-specs">${s.specialisms.map(t=>`<span class="sd-spec">${esc(t)}</span>`).join('')}</span>`:''}
        ${(s.kind==='branding')?`<span class="k">Product feed</span><span class="v">${esc(s.feed||'—')}</span>`:''}
      </div></details>
      <div data-aopeople></div>
      ${window.MSADMP?MSADMP.orders('sup',s)+MSADMP.service('sup',s)+MSADMP.products(s):''}
      ${s.notes?`<div class="dwr-sec"><h4>Notes</h4><p class="supnote">${esc(s.notes)}</p></div>`:''}
      ${(s.agreements&&s.agreements.length)?`<div class="dwr-sec"><h4>Agreements &amp; documents</h4><div class="supdocs">${s.agreements.map(a=>`<span class="supdoc"><svg class="icn" style="width:14px;height:14px"><use href="#a-box"/></svg>${esc(a.name||a)}</span>`).join('')}</div></div>`:''}
      ${s.kind==='branding'?supCatalogueSection(s):`<details class="sd-group sd-fold"><summary><h3 class="sd-gh">Product Feed</h3><span class="sd-chev" aria-hidden="true"></span></summary>
        <div class="sd-foldbody">
        ${supConnectionSection(s)}
        ${supImportSection(s)}
        ${importBlock(s)}
        </div>
      </details>`}
      <div class="dwr-foot"><button class="btn ghost" data-x>Close</button></div>
    </div>`;
  }
  // supplier-anchored product import — the primary "import against this supplier" action
  function importBlock(s){
    if(s.kind==='branding') return '';
    const imported = window.MSCAT?MSCAT.all().filter(p=>p.ingested&&p.supplier===s.name):[];
    const n=imported.length;
    return `<div class="dwr-sec sd-feedact">
      <button class="btn sm" data-importsup="${s.id}"><svg class="icn" style="width:15px;height:15px"><use href="#a-box"/></svg>Import products</button>
    </div>`;
  }
  // import history — one record per feed import, kept under the supplier
  function supImportSection(s){
    if(!window.MSCAT||!MSCAT.importLog) return '';
    const log=MSCAT.importLog(s.name); if(!log.length) return '';
    return `<details class="dwr-sec sd-subfold"><summary><h4>Import history · ${log.length}</h4><span class="sd-chev" aria-hidden="true"></span></summary>${log.map(r=>{
      const d=new Date(r.at); const ds=isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      return `<div class="imprec"><div class="imprec-h"><b>${r.total} products</b><span>${esc(ds)}</span></div>
        <div class="imprec-meta">${esc(r.source||'feed')} · ${r.priced} priced${r.gaps?` · <span class="imprec-warn">${r.gaps} needs-attention</span>`:''}${r.filed?` · ${r.filed} auto-filed`:''}</div>
        </div>`;
    }).join('')}</details>`;
  }

  /* ---------- row + button clicks ---------- */
  document.addEventListener('click', e=>{
    const ghost=e.target.closest('[data-ghost]'); if(ghost){ e.stopPropagation(); startGhost(ghost.dataset.ghost); return; }
    const ghostgo=e.target.closest('[data-ghostgo]'); if(ghostgo){ startGhost(ghostgo.dataset.ghostgo); close(); return; }
    const view=e.target.closest('[data-view]'); if(view){ e.stopPropagation(); const d=A.distributors.find(x=>x.id===view.dataset.view); if(d) open(distDrawer(d),{kind:'dist',rec:d}); return; }
    const vs=e.target.closest('[data-viewsup]'); if(vs){ e.stopPropagation(); const s=A.suppliers.find(x=>x.id===vs.dataset.viewsup); if(s) open(supDrawer(s),{kind:'sup',rec:s}); return; }
    const drow=e.target.closest('tr[data-dist]'); if(drow){ const d=A.distributors.find(x=>x.id===drow.dataset.dist); if(d) open(distDrawer(d),{kind:'dist',rec:d}); return; }
    const srow=e.target.closest('tr[data-sup]'); if(srow){ const s=A.suppliers.find(x=>x.id===srow.dataset.sup); if(s) open(supDrawer(s),{kind:'sup',rec:s}); return; }
    const importsup=e.target.closest('[data-importsup]'); if(importsup){ e.stopPropagation(); const s=A.suppliers.find(x=>x.id===importsup.dataset.importsup); if(s&&window.MSImport) MSImport.open({supplier:s.name, supId:s.id}); return; }
    const vsc=e.target.closest('[data-viewsupcat]'); if(vsc){ e.stopPropagation(); close(); if(window.MSProducts&&MSProducts.openSupplier) MSProducts.openSupplier(vsc.dataset.viewsupcat); return; }
  });

  /* ---------- ghost mode ---------- */
  function startGhost(id){
    const d=A.distributors.find(x=>x.id===id); if(!d) return;
    let ov=document.getElementById('ghostConsent');
    if(!ov){ ov=document.createElement('div'); ov.id='ghostConsent'; ov.className='fm-scrim'; document.body.appendChild(ov); }
    ov.innerHTML=`<div class="fm-modal"><div class="fm-head"><h3>Ghost ${esc(d.name)}</h3><button class="dwr-x" data-gx>&times;</button></div>
      <div class="fm-body">
        <div class="ghost-note"><svg class="icn" style="width:18px;height:18px;color:var(--periwinkle-deep);flex:none"><use href="#a-eye"/></svg><p>Ghosting lets you operate the platform <b>as ${esc(d.name)}</b> (${esc(d.owner)}). It requires the distributor's <b>permission</b> and every ghosted session is <b>audit-logged</b>.</p></div>
        <label class="fm-f"><span>Reason for access</span><select id="ghReason"><option>Support request</option><option>Troubleshooting an issue</option><option>Billing / subscription assistance</option><option>Onboarding / training</option></select></label>
        <label class="gchk"><input type="checkbox" id="ghConsent"> I confirm <b>${esc(d.name)}</b> has granted permission for this ghosted session.</label>
        <p class="ghost-fine">A consent request can also be sent to the distributor's admin to approve in-app.</p>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-gx>Cancel</button><button class="btn" id="ghStart" disabled>Enter ghost mode</button></div></div>`;
    ov.classList.add('open');
    const closeOv=()=>ov.classList.remove('open');
    ov.querySelectorAll('[data-gx]').forEach(b=>b.onclick=closeOv);
    ov.onclick=e=>{ if(e.target===ov) closeOv(); };
    const cb=ov.querySelector('#ghConsent'), go=ov.querySelector('#ghStart');
    cb.onchange=()=>{ go.disabled=!cb.checked; };
    go.onclick=()=>{ closeOv(); beginGhost(d); };
  }
  function beginGhost(d){
    const bar=document.getElementById('ghostbar');
    document.getElementById('ghostlbl').innerHTML=`Ghosting <b>${esc(d.name)}</b> — you're seeing the platform as ${esc(d.owner)}. Actions are audit-logged.`;
    bar.classList.add('on');
    try{ localStorage.setItem('ms-ghost', d.name); }catch(e){}
    // not live yet → ghost lands where they are: their onboarding
    const setup=window.MSDINV&&!MSDINV.ready(d.id);
    toast('Entered ghost mode — opening '+d.name+(setup?'’s setup':'’s dashboard'));
    window.open(setup?'Merchsmith Distributor Onboarding.html?d='+encodeURIComponent(d.id)+'&ghost=1':'Merchsmith Project - Autumn Giveaways.html','_blank');
    document.getElementById('ghostExit').onclick=()=>{ bar.classList.remove('on'); try{localStorage.removeItem('ms-ghost');}catch(e){} toast('Exited ghost mode'); };
  }
})();
