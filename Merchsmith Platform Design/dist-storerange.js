/* ============================================================
   dist-storerange.js — Distributor "Store range" settings panel.
   Lets the distributor choose how their store is stocked:
     • Use the Merchsmith Curated range as-is
     • Curated range + their own add/remove edits
     • A fully bespoke range built from the product database
   Reads/writes the shared catalogue (MSCAT.dist*). Renders into
   #panel-storerange.
   ============================================================ */
(function(){
  if(!window.MSCAT) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const toast=(()=>{ let el=document.getElementById('toast'); if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el);} let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();
  const MODES=[
    ['curated','Merchsmith Curated range','Use the curated range exactly as Merchsmith maintains it. New curated products appear automatically — zero upkeep. Merchsmith-promoted products (Featured / Spotlight) show their placements in your store.'],
    ['edited','Curated range + your edits','Start from the curated range, then add extra products or hide ones you don\'t want. Curated updates still flow through except where you\'ve overridden. Promoted placements (Featured / Spotlight) still apply.'],
    ['bespoke','Fully bespoke range','Build your store from scratch — only the products you pick from the database appear. Full control, no curated baseline, and no Merchsmith-promoted placements in your store.']
  ];
  const MODELBL={curated:'Curated range',edited:'Curated + edits',bespoke:'Bespoke'};

  let browse=false, bf={q:'',dept:''};
  const bsel=new Set();

  function panel(){ return document.getElementById('panel-storerange'); }
  function render(){
    const p=panel(); if(!p) return;
    const cfg=MSCAT.distConfig(); const st=MSCAT.distStats();
    p.innerHTML=`
      <div class="card">
        <div class="card-h"><h2>Store range</h2><span class="tag">${st.count} products live</span></div>
        <p class="sr-intro">Choose how your customer-facing store is stocked. You can always switch mode without losing the database.</p>
        <div class="sr-modes">${MODES.map(([v,t,d])=>`<button class="sr-mode ${cfg.mode===v?'on':''}" data-mode="${v}"><span class="sr-radio"></span><div><b>${t}</b><span>${d}</span></div></button>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Your range</h2><span class="tag">${MODELBL[cfg.mode]}${cfg.mode==='edited'?` · +${st.added} / −${st.removed}`:''}</span></div>
        ${rangeSummary(cfg,st)}
        <div class="sr-actions">
          ${cfg.mode!=='curated'?`<button class="btn" id="srBrowse">＋ Add products from database</button>`:''}
          ${cfg.mode!=='curated'?`<button class="btn ghost" id="srReset">Reset to curated</button>`:''}
        </div>
        <div id="srRangeList">${rangeList(cfg)}</div>
      </div>`;
    p.querySelectorAll('.sr-mode').forEach(b=>b.onclick=()=>{ MSCAT.setDistMode(b.dataset.mode); render(); toast('Store mode: '+MODELBL[b.dataset.mode]); });
    const br=p.querySelector('#srBrowse'); if(br)br.onclick=()=>{ browse=true; openBrowser(); };
    const rs=p.querySelector('#srReset'); if(rs)rs.onclick=()=>{ MSCAT.setDistMode('curated'); render(); toast('Range reset to the Merchsmith curated range'); };
    wireRangeList();
  }

  function rangeSummary(cfg,st){
    if(cfg.mode==='curated') return `<div class="sr-note"><svg class="icn"><use href="#i-check"/></svg><div><b>Mirroring the Merchsmith curated range.</b> ${st.count} products, kept up to date automatically. Switch to "+ your edits" to customise.</div></div>`;
    if(cfg.mode==='edited') return `<div class="sr-note"><div><b>Curated range + your edits.</b> ${st.count} products live — ${st.added} added, ${st.removed} hidden from the curated baseline.</div></div>`;
    return `<div class="sr-note"><div><b>Fully bespoke.</b> ${st.count} hand-picked products. Curated updates won't change your store.</div></div>`;
  }

  function rangeList(cfg){
    const list=MSCAT.distRange().slice().sort((a,b)=>a.dept.localeCompare(b.dept)||a.name.localeCompare(b.name));
    if(!list.length) return `<div class="sr-empty">No products in your range yet. ${cfg.mode!=='curated'?'Add some from the database.':''}</div>`;
    return `<table class="sr-tbl"><thead><tr><th>Product</th><th>Supplier</th><th>Dept</th><th>From</th><th>Source</th><th></th></tr></thead><tbody>
      ${list.map(p=>{ const added=cfg.mode!=='curated'&&!p.curated; return `<tr data-srp="${p.id}">
        <td><b>${esc(p.name)}</b>${(window.MSOV&&MSOV.count(p.id))?`<span class="srb-sub">${(MSOV.val(p.id,'alias')||MSOV.val(p.id,'name'))?esc(MSOV.val(p.id,'alias')||'')+(MSOV.val(p.id,'alias')?' · ':''):''}feed: ${esc(p.name)}</span>`:''}</td><td>${esc(p.supplier)}</td><td>${p.dept}</td><td class="scell">${gbp(p.priceFrom)}</td>
        <td>${p.curated?`<span class="sr-src cur">Curated${p.promoted?' · promo':''}</span>`:`<span class="sr-src own">Added</span>`}${(window.MSOV&&MSOV.count(p.id))?`<span class="sr-src ov" title="You’ve overridden ${MSOV.count(p.id)} field${MSOV.count(p.id)===1?'':'s'} on this product">Edited · ${MSOV.count(p.id)}</span>`:''}</td>
        <td>${cfg.mode!=='curated'?`<button class="sr-rm" data-srrm="${p.id}" title="Remove from your store">×</button>`:''}</td>
      </tr>`; }).join('')}
    </tbody></table>`;
  }
  function wireRangeList(){ const p=panel(); if(!p)return; p.querySelectorAll('[data-srrm]').forEach(b=>b.onclick=()=>{ MSCAT.distToggle(b.dataset.srrm); render(); }); }

  /* ---------- product browser (add to bespoke / edited) ---------- */
  function openBrowser(){
    let pk=document.getElementById('srBrowser'); if(!pk){ pk=document.createElement('div'); pk.id='srBrowser'; pk.className='sr-scrim'; document.body.appendChild(pk); }
    function draw(){
      const all=MSCAT.all().filter(p=>{ if(bf.dept&&p.dept!==bf.dept)return false; if(bf.q){ const q=bf.q.toLowerCase(); if(!(p.name.toLowerCase().includes(q)||p.supplier.toLowerCase().includes(q)))return false; } return true; });
      pk.querySelector('#srbRows').innerHTML=all.slice(0,150).map(p=>{ const inR=MSCAT.distInRange(p.id); return `<tr><td class="chkcol"><input type="checkbox" class="srbchk" data-srbchk="${p.id}" ${bsel.has(p.id)?'checked':''}></td><td><b>${esc(p.name)}</b><span class="srb-sub">${esc(p.supplier)} · ${p.dept}</span></td><td class="scell">${gbp(p.priceFrom)}</td><td>${p.curated?'<span class="sr-src cur">Curated</span>':''}</td><td class="srb-acts"><button class="srb-proj" data-srbproj="${p.id}" title="Add straight to a project without adding to your range">→ Project</button><button class="srb-add ${inR?'in':''}" data-srbtog="${p.id}">${inR?'✓ In store':'+ Add'}</button></td></tr>`; }).join('');
      pk.querySelectorAll('[data-srbtog]').forEach(b=>b.onclick=()=>{ MSCAT.distToggle(b.dataset.srbtog); draw(); });
      pk.querySelectorAll('[data-srbproj]').forEach(b=>b.onclick=()=>addToProjectDirect(MSCAT.get(b.dataset.srbproj), b));
      pk.querySelectorAll('.srbchk').forEach(c=>c.onclick=()=>{ if(c.checked)bsel.add(c.dataset.srbchk); else bsel.delete(c.dataset.srbchk); syncBrowserBulk(); });
      const allChk=pk.querySelector('#srbChkAll'); if(allChk){ const ids=all.slice(0,150).map(p=>p.id); allChk.checked=ids.length&&ids.every(id=>bsel.has(id)); allChk.onclick=()=>{ if(allChk.checked)ids.forEach(id=>bsel.add(id)); else ids.forEach(id=>bsel.delete(id)); draw(); syncBrowserBulk(); }; }
      syncBrowserBulk();
    }
    function syncBrowserBulk(){
      const bar=pk.querySelector('#srbBulk'); if(!bar)return;
      if(!bsel.size){ bar.hidden=true; bar.innerHTML=''; return; }
      const picked=[...bsel].map(id=>MSCAT.get(id)).filter(Boolean);
      const nOut=picked.filter(p=>!MSCAT.distInRange(p.id)).length, nIn=picked.length-nOut;
      bar.hidden=false;
      bar.innerHTML=`<span class="bulkn"><b>${bsel.size}</b> selected</span><div class="bulkacts">${nOut?`<button class="btn sm" data-sbadd>＋ Add ${nOut} to store</button>`:''}${nIn?`<button class="btn ghost sm" data-sbrm>Remove ${nIn}</button>`:''}<button class="bulkclear" data-sbclear>Clear</button></div>`;
      const a=bar.querySelector('[data-sbadd]'); if(a)a.onclick=()=>{ picked.forEach(p=>{ if(!MSCAT.distInRange(p.id))MSCAT.distToggle(p.id); }); toast(`Added ${nOut} product${nOut===1?'':'s'} to your store`); draw(); };
      const r=bar.querySelector('[data-sbrm]'); if(r)r.onclick=()=>{ picked.forEach(p=>{ if(MSCAT.distInRange(p.id))MSCAT.distToggle(p.id); }); toast(`Removed ${nIn} from your store`); draw(); };
      bar.querySelector('[data-sbclear]').onclick=()=>{ bsel.clear(); draw(); };
    }
    pk.innerHTML=`<div class="sr-browser"><div class="srb-hd"><h3>Add products to your store</h3><button class="dwr-x" data-srx>×</button></div>
      <div class="srb-tools"><div class="search"><svg class="icn"><use href="#i-search"/></svg><input id="srbQ" placeholder="Search products…"></div>
        <select id="srbDept"><option value="">All departments</option>${MSCAT.depts().map(d=>`<option ${bf.dept===d?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="srb-scroll"><div id="srbBulk" class="bulkbar" hidden></div><table class="sr-tbl"><thead><tr><th class="chkcol"><input type="checkbox" id="srbChkAll" aria-label="Select all"></th><th>Product</th><th>From</th><th></th><th></th></tr></thead><tbody id="srbRows"></tbody></table></div>
      <div class="srb-foot"><button class="btn" data-srx>Done</button></div></div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); render(); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-srx]')) cx(); });
    pk.querySelector('#srbQ').oninput=e=>{ bf.q=e.target.value; draw(); };
    pk.querySelector('#srbDept').onchange=e=>{ bf.dept=e.target.value; draw(); };
    draw();
  }

  /* ---------- add a product straight to a project (bypasses the range) ---------- */
  const PROJECTS=[['autumn','Autumn Giveaways'],['charity','2026 Charity Expo'],['staff','Staff Gifts']];
  function addToProjectDirect(p, btn){
    if(!p) return;
    // build a tiny inline picker beside the button
    document.querySelectorAll('.srb-pjpop').forEach(x=>x.remove());
    const pop=document.createElement('div'); pop.className='srb-pjpop';
    pop.innerHTML=`<div class="srb-pjhd">Add “${esc(p.name)}” to…</div>${PROJECTS.map(([id,nm])=>`<button data-pj="${id}">${esc(nm)}</button>`).join('')}<div class="srb-pjnote">Added direct — not added to your store range.</div>`;
    btn.parentElement.appendChild(pop);
    const close=e=>{ if(!pop.contains(e.target)&&e.target!==btn){ pop.remove(); document.removeEventListener('click',close); } };
    setTimeout(()=>document.addEventListener('click',close),0);
    pop.querySelectorAll('[data-pj]').forEach(b=>b.onclick=()=>{ writeDirect(p, b.dataset.pj); pop.remove(); toast(`“${p.name}” added to ${PROJECTS.find(x=>x[0]===b.dataset.pj)[1]}`); });
  }
  function writeDirect(p, projId){
    let store={}; try{ store=JSON.parse(localStorage.getItem('ms-project-brief')||'{}'); }catch(e){}
    const proj=store[projId]=store[projId]||{items:[]}; proj.items=proj.items||[];
    proj.items.push({ id:'it'+Date.now(), type:p.name, cat:p.dept, qty:p.moq||100, unit:p.priceFrom||0,
      fulfilledBy:p.name, fulfilledId:p.id, fulfilledUnit:p.priceFrom||0, direct:true });
    try{ localStorage.setItem('ms-project-brief', JSON.stringify(store)); }catch(e){}
  }

  /* ---------- styles ---------- */
  (function(){ if(document.getElementById('sr-style'))return; const st=document.createElement('style'); st.id='sr-style';
    st.textContent=`
    .sr-intro{font-size:14px;color:var(--text-soft);line-height:1.55;margin:0 0 18px;}
    .sr-modes{display:flex;flex-direction:column;gap:10px;}
    .sr-mode{display:flex;gap:13px;align-items:flex-start;text-align:left;border:1.5px solid var(--line-soft);background:#fff;border-radius:13px;padding:15px 17px;cursor:pointer;transition:border-color .15s,background .15s;}
    .sr-mode:hover{border-color:var(--periwinkle);}
    .sr-mode.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);box-shadow:0 0 0 1px var(--periwinkle-deep);}
    .sr-radio{width:19px;height:19px;border-radius:50%;border:2px solid var(--line);flex:none;margin-top:2px;position:relative;}
    .sr-mode.on .sr-radio{border-color:var(--periwinkle-deep);}
    .sr-mode.on .sr-radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--periwinkle-deep);}
    .sr-mode b{display:block;font-size:15px;color:var(--ink);margin-bottom:3px;}
    .sr-mode span{font-size:13px;color:var(--text-soft);line-height:1.5;}
    .sr-note{display:flex;gap:11px;align-items:flex-start;background:var(--paper-2);border-radius:12px;padding:14px 16px;font-size:13.5px;line-height:1.55;color:var(--ink-2);margin-bottom:16px;}
    .sr-note .icn{width:18px;height:18px;stroke:var(--green-deep);flex:none;margin-top:1px;}
    .sr-note b{color:var(--ink);}
    .sr-actions{display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap;}
    .sr-empty{text-align:center;color:var(--muted);padding:36px;}
    .sr-tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
    .sr-tbl th{text-align:left;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);padding:9px 10px;border-bottom:1px solid var(--line-soft);}
    .sr-tbl td{padding:11px 10px;border-bottom:1px solid var(--paper-2);}
    .sr-tbl .scell{font-variant-numeric:tabular-nums;}
    .srb-sub{display:block;font-size:11.5px;color:var(--muted);}
    .sr-src{font-size:10.5px;font-weight:800;border-radius:6px;padding:2px 8px;}
    .sr-src.cur{background:var(--tint-peri);color:var(--periwinkle-deep);}
    .sr-src.own{background:var(--tint-green);color:var(--green-deep);}
    .sr-src.ov{background:#fdf6e7;color:#9a6b1f;margin-left:5px;}
    .sr-rm{width:30px;height:30px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:16px;line-height:1;color:var(--muted);cursor:pointer;}
    .sr-rm:hover{border-color:var(--flare);color:var(--flare);}
    /* browser */
    .sr-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:200;opacity:0;transition:opacity .2s;}
    .sr-scrim.open{opacity:1;}
    .sr-browser{position:fixed;top:0;right:0;height:100vh;width:min(560px,100%);background:var(--paper);box-shadow:-20px 0 60px rgba(20,22,45,.3);transform:translateX(100%);transition:transform .24s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column;}
    .sr-scrim.open .sr-browser{transform:none;}
    .srb-hd{display:flex;align-items:center;padding:18px 22px;border-bottom:1px solid var(--line-soft);background:#fff;}
    .srb-hd h3{margin:0;font-family:var(--serif);font-weight:500;font-size:20px;}
    .srb-hd .dwr-x{margin-left:auto;border:0;background:none;font-size:24px;line-height:1;color:var(--muted);cursor:pointer;}
    .srb-tools{display:flex;gap:10px;padding:14px 22px;border-bottom:1px solid var(--line-soft);}
    .srb-tools .search{flex:1;display:flex;align-items:center;gap:8px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;background:#fff;}
    .srb-tools .search .icn{width:16px;height:16px;stroke:var(--muted);}
    .srb-tools .search input{border:0;outline:0;font:inherit;font-size:13.5px;width:100%;background:none;}
    .srb-tools select{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;background:#fff;}
    .srb-scroll{flex:1;overflow-y:auto;padding:8px 22px;}
    .srb-add{border:1.5px solid var(--periwinkle-deep);background:#fff;color:var(--periwinkle-deep);border-radius:999px;padding:5px 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;}
    .srb-add.in{background:var(--periwinkle-deep);color:#fff;}
    .chkcol{width:36px;text-align:center;}
    .chkcol input{width:16px;height:16px;cursor:pointer;accent-color:var(--periwinkle-deep);}
    .bulkbar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--periwinkle-deep);color:#fff;border-radius:11px;padding:9px 13px;margin-bottom:10px;position:sticky;top:0;z-index:2;}
    .bulkbar .bulkn b{font-size:15px;}
    .bulkbar .bulkacts{display:flex;align-items:center;gap:8px;}
    .bulkbar .btn{background:#fff;color:var(--periwinkle-deep);}
    .bulkbar .btn.ghost{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5);}
    .bulkbar .bulkclear{background:none;border:0;color:#fff;font:inherit;font-size:12.5px;font-weight:700;text-decoration:underline;cursor:pointer;opacity:.85;}
    .srb-acts{display:flex;gap:6px;justify-content:flex-end;align-items:center;position:relative;}
    .srb-proj{border:1.5px solid var(--line-soft);background:#fff;color:var(--ink-2);border-radius:999px;padding:5px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;}
    .srb-proj:hover{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);}
    .srb-pjpop{position:absolute;top:calc(100% + 6px);right:0;z-index:5;background:#fff;border:1px solid var(--line-soft);border-radius:11px;box-shadow:0 12px 34px rgba(20,22,45,.18);padding:7px;min-width:210px;text-align:left;}
    .srb-pjhd{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);padding:6px 9px 8px;}
    .srb-pjpop [data-pj]{display:block;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13.5px;font-weight:600;color:var(--ink);padding:8px 9px;border-radius:8px;cursor:pointer;}
    .srb-pjpop [data-pj]:hover{background:var(--tint-peri);color:var(--periwinkle-deep);}
    .srb-pjnote{font-size:11px;color:var(--muted);padding:7px 9px 4px;line-height:1.4;border-top:1px solid var(--paper-2);margin-top:4px;}
    .srb-foot{padding:14px 22px;border-top:1px solid var(--line-soft);background:#fff;}
    `;
    document.head.appendChild(st);
  })();

  let inited=false;
  function init(){ if(inited)return; inited=true; render(); }
  // render when the Store range tab is opened
  document.addEventListener('click',e=>{ if(e.target.closest('.settab[data-panel="storerange"]')) setTimeout(init,0); });
  window.MSDistRange={ render };
})();
