/* admin-page.js — Merchsmith platform admin: login, directory, ghost mode */
(function(){
  const A = window.ADMIN;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const STLBL = {active:'Active',trial:'Trial',past_due:'Past due',suspended:'Suspended',pending:'Pending',invited:'Invited',needs_attention:'Needs attention'};
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
    const s=A.stats;
    document.getElementById('statbar').innerHTML=[
      ['Distributors',s.distributors],['Active',s.activeDistributors],['Suppliers',s.suppliers],['Platform MRR',s.mrr],['GMV (12mo)',s.gmv]
    ].map(([l,v])=>`<div class="sb"><b>${v}</b><span>${l}</span></div>`).join('');
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
  let distQ='', distSt='';
  function renderDist(){
    const rows=A.distributors.filter(d=>{
      const m=(d.name+d.owner+d.domain+d.ownerEmail).toLowerCase().includes(distQ.toLowerCase());
      const stMatch = !distSt || (distSt==='trial'?d.status==='trial':d.status===distSt);
      return m && stMatch;
    });
    document.getElementById('distRows').innerHTML = rows.length?rows.map(d=>`
      <tr data-dist="${d.id}">
        <td><div class="orgcell"><div class="orglogo dist">${d.initials}</div><div><b>${esc(d.name)}</b><span>${esc(d.owner)} · ${esc(d.domain)}</span></div></div></td>
        <td><span class="plan">${d.plan}</span></td>
        <td class="scell">${d.customers}</td>
        <td class="scell">${d.gmv}</td>
        <td class="scell">${d.mrr}</td>
        <td><span class="stbadge st-${d.status}">${STLBL[d.status]}</span></td>
        <td><div class="rowact">
          <button class="iconbtn" data-view="${d.id}"><svg class="icn"><use href="#a-eye"/></svg>View</button>
          <button class="iconbtn ghost-act" data-ghost="${d.id}"><svg class="icn"><use href="#a-ghost"/></svg>Ghost</button>
        </div></td>
      </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:34px">No distributors match.</td></tr>`;
  }
  document.getElementById('distSearch').oninput=e=>{ distQ=e.target.value; renderDist(); };
  document.getElementById('distFilters').onclick=e=>{ const b=e.target.closest('.fbtn'); if(!b)return; document.querySelectorAll('#distFilters .fbtn').forEach(x=>x.classList.toggle('on',x===b)); distSt=b.dataset.st; renderDist(); };

  /* ---------- suppliers ---------- */
  let supQ='', supK='';
  function renderSup(){
    const rows=A.suppliers.filter(s=>{
      const m=(s.name+s.domain+s.region).toLowerCase().includes(supQ.toLowerCase());
      return m && (!supK||s.kind===supK);
    });
    document.getElementById('supRows').innerHTML = rows.length?rows.map(s=>`
      <tr data-sup="${s.id}">
        <td><div class="orgcell"><div class="orglogo ${kindCls(s.kind)}">${s.initials}</div><div><b>${esc(s.name)}</b><span>${esc(s.domain)} · ${s.region}</span></div></div></td>
        <td>${KLBL[s.kind]||'Product'}</td>
        <td>${esc(s.feed)}</td>
        <td class="scell">${s.products?s.products.toLocaleString():'—'}</td>
        <td class="scell">${s.usedBy} distributor${s.usedBy===1?'':'s'}</td>
        <td><span class="stbadge st-${s.status}">${STLBL[s.status]}</span></td>
        <td><div class="rowact"><button class="iconbtn" data-viewsup="${s.id}"><svg class="icn"><use href="#a-eye"/></svg>View</button></div></td>
      </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:34px">No suppliers match.</td></tr>`;
  }
  document.getElementById('supSearch').oninput=e=>{ supQ=e.target.value; renderSup(); };
  document.getElementById('supFilters').onclick=e=>{ const b=e.target.closest('.fbtn'); if(!b)return; document.querySelectorAll('#supFilters .fbtn').forEach(x=>x.classList.toggle('on',x===b)); supK=b.dataset.k; renderSup(); };

  /* ---------- drawer ---------- */
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  function open(html){ drawer.innerHTML=html; scrim.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow='hidden'; drawer.querySelectorAll('[data-x]').forEach(b=>b.onclick=close); }
  function close(){ scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow=''; }
  scrim.onclick=close;
  const flagBanner=o=>o.flag?`<div class="flagbar fb-${o.flag.level}"><svg class="icn"><use href="#a-flag"/></svg><div><b>${o.flag.level==='red'?'Action needed':o.flag.level==='amber'?'Attention':'Note'}</b><span>${esc(o.flag.note)}</span></div></div>`:'';

  function distDrawer(d){
    return `<div class="dwr-head"><div class="orglogo dist" style="width:46px;height:46px">${d.initials}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(d.name)}</h2>
      <div style="font-size:13px;color:var(--text-soft);margin-top:2px">Distributor · ${d.plan} plan · since ${d.since}</div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      ${flagBanner(d)}
      <div class="dwr-sec"><h4>Account</h4><div class="kv">
        <span class="k">Owner</span><span class="v">${esc(d.owner)}</span>
        <span class="k">Email</span><span class="v"><a href="mailto:${esc(d.ownerEmail)}" style="color:var(--periwinkle-deep);text-decoration:none">${esc(d.ownerEmail)}</a></span>
        <span class="k">Domain</span><span class="v">${esc(d.domain)}</span>
        <span class="k">Region</span><span class="v">${d.region}</span>
        <span class="k">Status</span><span class="v">${STLBL[d.status]}</span>
        <span class="k">Plan / MRR</span><span class="v">${d.plan} · ${d.mrr}</span>
        <span class="k">Last active</span><span class="v">${esc(d.lastActive)}</span>
      </div></div>
      <div class="dwr-sec"><h4>Usage</h4><div class="statgrid">
        <div class="stat"><b>${d.customers}</b><span>Customers</span></div>
        <div class="stat"><b>${d.suppliers}</b><span>Suppliers</span></div>
        <div class="stat"><b>${d.users}</b><span>Team users</span></div>
        <div class="stat"><b>${d.activeProjects}</b><span>Active projects</span></div>
        <div class="stat"><b>${d.gmv}</b><span>GMV (12mo)</span></div>
        <div class="stat"><b>${d.mrr}</b><span>MRR</span></div>
      </div></div>
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
      return `<div class="dwr-sec"><h4>Catalogue</h4><div class="as-note" style="margin:0"><svg class="icn" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><p>${(s.products||0).toLocaleString()} products arrive automatically from the ${esc(s.feed)} feed.</p></div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn ghost sm" data-addproduct="${s.id}">+ Add product manually</button></div></div>`;
    }
    if(fed){
      return `<div class="dwr-sec"><h4>Catalogue · ${(s.products||0).toLocaleString()} on feed</h4><div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><button class="btn ghost sm" data-addproduct="${s.id}">+ Add product</button></div><div class="supprods">${cat.map(p=>`<div class="supprod" data-prod="${p.id}"><span class="supprodimg">${esc((p.name||'?').slice(0,1))}</span><div class="supprodm"><b>${esc(p.name)}</b><span>${esc(p.dept||'—')}${p.cat?' · '+esc(p.cat):''} · MOQ ${p.moq||'—'} · manual</span></div><b class="supprodp">${p.priceBreaks&&p.priceBreaks[0]?'£'+(+p.priceBreaks[0].unit).toFixed(2):'—'}</b><button class="as-udel" data-delproduct="${s.id}:${p.id}" title="Remove">×</button></div>`).join('')}</div></div>`;
    }
    const rows = cat.map(p=>`<div class="supprod" data-prod="${p.id}"><span class="supprodimg">${esc((p.name||'?').slice(0,1))}</span><div class="supprodm"><b>${esc(p.name)}</b><span>${esc(p.dept||'—')}${p.cat?' · '+esc(p.cat):''} · MOQ ${p.moq||'—'}</span></div><b class="supprodp">${p.priceBreaks&&p.priceBreaks[0]?'£'+(+p.priceBreaks[0].unit).toFixed(2):'—'}</b><button class="as-udel" data-delproduct="${s.id}:${p.id}" title="Remove">×</button></div>`).join('');
    return `<div class="dwr-sec"><h4>Catalogue · ${cat.length} manual product${cat.length===1?'':'s'}</h4>
      <div class="supprods">${rows||'<p class="as-emptyrow">No manual products yet.</p>'}</div>
      <button class="btn ghost sm" data-addproduct="${s.id}" style="margin-top:12px">+ Add product</button></div>`;
  }
  // connection & mapping hub — field mapping (connect-time) + category mapping (post-sync), revisitable
  function supConnectionSection(s){
    const isProd = s.kind==='product'||s.kind==='both';
    const isApi = s.connection==='api' || /api/i.test(s.feed||'');
    if(s.kind==='branding' || !isProd) return '';
    const gaps = (window.MSSupplierMap&&s.fieldMap)?MSSupplierMap.requiredGaps(s):0;
    const fmStat = (window.MSSupplierMap&&s.fieldMap)?MSSupplierMap.fieldMapStats(s):null;
    const fmLine = isApi ? (s.fieldMap ? (gaps>0?`<span class="map-warn">${gaps} field${gaps===1?'':'s'} need mapping</span>`:`<span class="map-ok">${fmStat?fmStat.mappedReq:5}/${fmStat?fmStat.reqTotal:5} required mapped</span>`) : '<span class="map-warn">Not yet mapped</span>') : '<span class="map-na">n/a · not an API feed</span>';
    const editBtn = isApi ? `<button class="btn ghost sm" data-editfmap="${s.id}">${s.fieldMap?'Edit field mapping':'Map fields'}</button>` : '';
    return `<div class="dwr-sec"><h4>Connection &amp; mapping</h4>
      ${gaps>0?`<div class="flagbar fb-amber"><svg class="icn"><use href="#a-flag"/></svg><div><b>Mapping incomplete</b><span>${gaps} required field${gaps===1?'':'s'} unmapped — products won't sync until resolved.</span></div></div>`:''}
      <div class="kv">
        <span class="k">Connection</span><span class="v">${esc(s.feed||'—')}</span>
        <span class="k">Field mapping</span><span class="v">${fmLine}</span>
      </div>
      <div class="map-actions">${editBtn}</div>
    </div>`;
  }
  window.__openSupplier = id => { const s=A.suppliers.find(x=>x.id===id); if(s) open(supDrawer(s)); };
  window.__supplierById = id => A.suppliers.find(x=>x.id===id);
  function supDrawer(s){
    return `<div class="dwr-head"><div class="orglogo ${kindCls(s.kind)}" style="width:46px;height:46px">${s.initials}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(s.name)}</h2>
      <div style="font-size:13px;color:var(--text-soft);margin-top:2px">${KLBL[s.kind]||'Product'} supplier · ${s.region} · since ${s.since}</div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      ${s.status==='invited'?`<div class="flagbar fb-grey"><svg class="icn"><use href="#a-flag"/></svg><div><b>Invitation sent</b><span>Awaiting the supplier to complete onboarding. They can invite their own users.</span></div></div>`:''}
      <div class="dwr-sec"><h4>Supplier</h4><div class="kv">
        <span class="k">Domain</span><span class="v"><a href="https://${esc(s.domain)}" target="_blank" rel="noopener" style="color:var(--periwinkle-deep);text-decoration:none">${esc(s.domain)} ↗</a></span>
        <span class="k">Type</span><span class="v">${s.kind==='branding'?'Branding only':(s.kind==='both'?'Product + Branding':'Product (blanks)')}</span>
        <span class="k">Product feed</span><span class="v">${esc(s.feed)}</span>
        <span class="k">Catalogue</span><span class="v">${s.products?s.products.toLocaleString()+' products':'Manual / decoration'}</span>
        <span class="k">Lead time</span><span class="v">${s.lead}</span>
        <span class="k">Status</span><span class="v">${STLBL[s.status]}</span>
        ${s.matchDomains&&s.matchDomains.length?`<span class="k">Match domains</span><span class="v">${esc(s.matchDomains.join(', '))}</span>`:''}
      </div></div>
      <div class="dwr-sec"><h4>Platform usage</h4><div class="statgrid">
        <div class="stat"><b>${s.usedBy}</b><span>Distributors using</span></div>
        <div class="stat"><b>${s.products?s.products.toLocaleString():'—'}</b><span>Products on feed</span></div>
        <div class="stat"><b style="font-size:15px">${KLBL[s.kind]||'Product'}</b><span>Type</span></div>
      </div></div>
      ${window.MSSupplierTeam?MSSupplierTeam.section(s):((s.users&&s.users.length)?`<div class="dwr-sec"><h4>Users${s.canInviteUsers?' · supplier can invite their own':''}</h4><div class="suplist">${s.users.map(u=>`<div class="suprow"><span class="supav">${av(u.name||u.email||'?')}</span><div class="supmeta"><b>${esc(u.name||'—')}</b><span>${esc(u.email||'')}</span></div><span class="suprole">${({owner:'Owner',member:'Member',production:'Production'})[u.role]||'Member'}</span>${s.status==='invited'?'<span class="stbadge st-invited">Invited</span>':''}</div>`).join('')}</div></div>`:'')}
      ${s.notes?`<div class="dwr-sec"><h4>Notes</h4><p class="supnote">${esc(s.notes)}</p></div>`:''}
      ${(s.agreements&&s.agreements.length)?`<div class="dwr-sec"><h4>Agreements &amp; documents</h4><div class="supdocs">${s.agreements.map(a=>`<span class="supdoc"><svg class="icn" style="width:14px;height:14px"><use href="#a-box"/></svg>${esc(a.name||a)}</span>`).join('')}</div></div>`:''}
      ${importBlock(s)}
      ${supImportSection(s)}
      ${supConnectionSection(s)}
      ${supCatalogueSection(s)}
      <div class="dwr-foot"><button class="btn ghost" data-x>Close</button></div>
    </div>`;
  }
  // supplier-anchored product import — the primary "import against this supplier" action
  function importBlock(s){
    if(s.kind==='branding') return '';
    const imported = window.MSCAT?MSCAT.all().filter(p=>p.ingested&&p.supplier===s.name):[];
    const n=imported.length;
    return `<div class="dwr-sec"><h4>Products</h4>
      <p class="supnote" style="margin:0 0 11px">Import this supplier's catalogue from a CSV or JSON feed. Imported products appear here and in the master product database.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn sm" data-importsup="${s.id}"><svg class="icn" style="width:15px;height:15px"><use href="#a-box"/></svg>Import products</button>
        ${n?`<button class="btn ghost sm" data-viewsupcat="${esc(s.name)}">View ${n.toLocaleString()} imported →</button>`:'<span style="font-size:12px;color:var(--muted)">None imported yet</span>'}
      </div></div>`;
  }
  // import history — one record per feed import, kept under the supplier
  function supImportSection(s){
    if(!window.MSCAT||!MSCAT.importLog) return '';
    const log=MSCAT.importLog(s.name); if(!log.length) return '';
    return `<div class="dwr-sec"><h4>Imports</h4>${log.map(r=>{
      const d=new Date(r.at); const ds=isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      return `<div class="imprec"><div class="imprec-h"><b>${r.total} products</b><span>${esc(ds)}</span></div>
        <div class="imprec-meta">${esc(r.source||'feed')} · ${r.priced} priced${r.gaps?` · <span class="imprec-warn">${r.gaps} needs-attention</span>`:''}${r.filed?` · ${r.filed} auto-filed`:''}</div>
        ${(r.notes&&r.notes.length)?`<ul class="imprec-notes">${r.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}</div>`;
    }).join('')}</div>`;
  }

  /* ---------- row + button clicks ---------- */
  document.addEventListener('click', e=>{
    const ghost=e.target.closest('[data-ghost]'); if(ghost){ e.stopPropagation(); startGhost(ghost.dataset.ghost); return; }
    const ghostgo=e.target.closest('[data-ghostgo]'); if(ghostgo){ startGhost(ghostgo.dataset.ghostgo); close(); return; }
    const view=e.target.closest('[data-view]'); if(view){ e.stopPropagation(); const d=A.distributors.find(x=>x.id===view.dataset.view); if(d) open(distDrawer(d)); return; }
    const vs=e.target.closest('[data-viewsup]'); if(vs){ e.stopPropagation(); const s=A.suppliers.find(x=>x.id===vs.dataset.viewsup); if(s) open(supDrawer(s)); return; }
    const drow=e.target.closest('tr[data-dist]'); if(drow){ const d=A.distributors.find(x=>x.id===drow.dataset.dist); if(d) open(distDrawer(d)); return; }
    const srow=e.target.closest('tr[data-sup]'); if(srow){ const s=A.suppliers.find(x=>x.id===srow.dataset.sup); if(s) open(supDrawer(s)); return; }
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
    toast('Entered ghost mode — opening '+d.name+'’s dashboard');
    window.open('Merchsmith Project - Autumn Giveaways.html','_blank');
    document.getElementById('ghostExit').onclick=()=>{ bar.classList.remove('on'); try{localStorage.removeItem('ms-ghost');}catch(e){} toast('Exited ghost mode'); };
  }
})();
