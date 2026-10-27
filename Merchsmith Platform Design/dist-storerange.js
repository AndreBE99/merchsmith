/* ============================================================
   dist-storerange.js — Distributor "Store range" settings panel.
   Lets the distributor choose how their store is stocked:
     • Use the Merchsmith Recommended range as-is
     • Recommended range + their own add/remove edits
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
    ['curated','Merchsmith Recommended range','Use the recommended range exactly as Merchsmith maintains it. New recommended products appear automatically — zero upkeep. Merchsmith-promoted products (Featured) show their placements in your store.'],
    ['edited','Recommended range + your edits','Start from the recommended range, then add extra products or hide ones you don\'t want. Recommended-range updates still flow through except where you\'ve overridden. Promoted placements (Featured) still apply.'],
    ['bespoke','Fully bespoke range','Build your store from scratch — only the products you pick from the database appear. Full control, no recommended baseline, and no Merchsmith-promoted placements in your store.']
  ];
  const MODELBL={curated:'Recommended range',edited:'Recommended + edits',bespoke:'Bespoke'};

  /* Range management mirrors the Platform Admin product-database table — same search,
     select, chip-filter, sort, bulk-action and load-more mechanics — re-scoped to the
     suppliers this distributor has an approved relationship with. Department is a
     read-only tag here: only Merchsmith may reassign a product's department. */
  const filt={q:'',supplier:'',sub:'',brand:'',tag:'',view:'',sort:'name',dir:1};
  let page=1; const PAGE=40; let viewMode='table';
  let groupBy='';                      // '' | 'supplier' | 'sub'
  const collapsed=new Set();
  const sel=new Set();

  function panel(){ return document.getElementById('panel-storerange'); }
  function render(){
    const p=panel(); if(!p) return;
    const cfg=MSCAT.distConfig(); const st=MSCAT.distStats();
    p.innerHTML=`
      <div class="card">
        <div class="sr-hd">
          <div class="sr-hdl">
            <div class="sr-seg" role="group" aria-label="How your store is stocked">${MODES.map(([v,t,d])=>
              `<button class="${cfg.mode===v?'on':''}" data-mode="${v}" title="${esc(d)}" aria-pressed="${cfg.mode===v}">${MODELBL[v]}</button>`).join('')}</div>
            <span class="sr-hdsum">${rangeSummary(cfg,st)}</span>
          </div>
          <div class="sr-hdacts"><button class="btn ghost sm" id="srManageTags">Manage tags</button>${cfg.mode!=='curated'?(isRangeAdmin()
            ?`<button class="btn ghost sm" id="srReset">Reset</button>`
            :`<button class="btn ghost sm" id="srReset" disabled title="Only a distributor Admin or Owner can reset the range">Reset</button>`):''}</div>
        </div>
        ${tableHTML(cfg)}
      </div>
      ${changesHTML(cfg)}`;
    wireHead(p);
    // keep a removed product by adopting it into your own range
    p.querySelectorAll('[data-keep]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.keep, prod=MSCAT.get(id);
      if(MSCAT.distConfig().mode==='curated') MSCAT.setDistMode('edited');   // adopting implies edits
      if(!MSCAT.distInRange(id)) MSCAT.distToggle(id);
      dismiss(id); render(); toast(`"${prod?prod.name:'Product'}" kept in your store`); });
    p.querySelectorAll('[data-dism]').forEach(b=>b.onclick=()=>{ dismiss(b.dataset.dism); render(); });
    const da=p.querySelector('#srChgAll'); if(da)da.onclick=()=>{ recent().forEach(e=>dismiss(e.id)); render(); toast('Change notices cleared'); };
    wireTable();
  }

  /* ---------- notices: what Merchsmith changed in the Recommended range ----------
     A removal silently empties a shelf, so the distributor is told and can adopt the
     product into their own range instead. Dismissals are remembered per distributor. */
  const NKEY='ms-dist-seen-changes';
  function seen(){ try{ return JSON.parse(localStorage.getItem(NKEY)||'[]')||[]; }catch(e){ return []; } }
  function dismiss(id){ const s=seen(); if(s.indexOf(id)<0) s.push(id);
    try{ localStorage.setItem(NKEY,JSON.stringify(s.slice(-300))); }catch(e){} }
  function recent(){
    if(!MSCAT.curLog) return [];
    const s=seen(), cut=Date.now()-90*86400000;
    const out=[], hit={};
    MSCAT.curLog().forEach(e=>{
      if(hit[e.id]||s.indexOf(e.id)>-1) return;
      if(new Date(e.at).getTime()<cut) return;
      if(e.act!=='removed'&&e.act!=='tier'&&e.act!=='approved') return;
      hit[e.id]=1; out.push(e);
    });
    return out.slice(0,8);
  }
  const fmtD=iso=>{ const x=new Date(iso); return isNaN(x)?'—':x.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); };
  function changesHTML(cfg){
    const list=recent(); if(!list.length) return '';
    const WORD={removed:['removed from','out'],approved:['added to','in'],tier:['moved tier in','']};
    return `<div class="card sr-chg">
      <div class="card-h"><h2>Changes to the Recommended range</h2><button class="sr-chgall" id="srChgAll">Dismiss all</button></div>
      <p class="sr-chgsub">Merchsmith maintains the recommended baseline. When a product leaves it, your store loses it too — unless you keep it in your own range.</p>
      ${list.map(e=>{ const w=WORD[e.act]||['changed in','']; const gone=e.act==='removed';
        const inMine=MSCAT.distInRange(e.id);
        return `<div class="sr-chgrow ${w[1]}">
          <span class="sr-chgdot"></span>
          <span class="sr-chgtx"><b>${esc(e.name)}</b> ${w[0]} the ${e.tier==='featured'?'Featured':'Recommended'} range<span class="sr-chgmeta">${esc(e.supplier||'')} · ${fmtD(e.at)}</span></span>
          <span class="sr-chgact">
            ${gone&&!inMine?`<button class="btn sm" data-keep="${e.id}">Keep in my store</button>`:''}
            ${gone&&inMine?'<span class="sr-kept">Kept in your range</span>':''}
            <button class="sr-dism" data-dism="${e.id}" title="Dismiss">×</button>
          </span>
        </div>`; }).join('')}
    </div>`;
  }

  function rangeSummary(cfg,st){
    const m=MODES.find(x=>x[0]===cfg.mode);
    const extra=cfg.mode==='edited'?` <b>${st.added} added, ${st.removed} hidden.</b>`:'';
    return (m?esc(m[2]):'')+extra;
  }

  /* ---------- the range table (admin product-database mechanics, distributor scope) ---------- */
  const VIEWS_ALL=[['','All'],['in','In your range'],['out','Not in range'],['rec','Recommended'],['own','Added by you']];
  const VIEWS_MIRROR=[['','All'],['in','In your range'],['out','Not in range']];
  function pool(){ return MSCAT.distCatalogue(); }
  // Sub-categories come from the store taxonomy (MSSTORE), keyed by department id.
  // Read-only here: filing a product is Merchsmith's job, not the distributor's.
  const deptId=p=>String(p.dept||'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  function subNames(p){
    if(!window.MSSTORE) return [];
    const ids=MSSTORE.subcatsForProduct(p.id); if(!ids.length) return [];
    const subs=MSSTORE.subcatsOf(deptId(p));
    return ids.map(id=>{ const x=subs.find(y=>y.id===id); return x?x.name:null; }).filter(Boolean);
  }
  // every sub-category present in the distributor's pool, grouped by department
  function subIndex(){
    const map={};
    if(!window.MSSTORE) return map;
    pool().forEach(p=>{ subNames(p).forEach(n=>{ (map[n]=map[n]||{n:n,dept:p.dept,count:0}).count++; }); });
    return map;
  }
  function rows(cfg){
    const ok=pool();
    let out=ok.filter(p=>{
      const inR=MSCAT.distInRange(p.id);
      if(filt.supplier&&p.supplier!==filt.supplier) return false;
      if(filt.sub&&subNames(p).indexOf(filt.sub)<0) return false;
      if(filt.tag){
        const [scope,...r]=filt.tag.split(':'), t=r.join(':');
        if(scope==='ms'){ if(!window.MSTAGS||MSTAGS.tagsOf(p.id).indexOf(t)<0) return false; }
        else if(scope==='my'){ if(!window.MSDTAGS||MSDTAGS.tagsOf(p.id).indexOf(t)<0) return false; }
        else if(scope==='none'){ if((window.MSDTAGS?MSDTAGS.tagsOf(p.id).length:0)) return false; }
      }
      if(filt.brand&&window.MSBRANDS){ const b=MSBRANDS.brandOf(p.id);
        if(filt.brand==='__none'){ if(b) return false; } else if(b!==filt.brand) return false; }
      if(filt.view==='in'&&!inR) return false;
      if(filt.view==='out'&&inR) return false;
      if(filt.view==='rec'&&!p.curated) return false;
      if(filt.view==='own'&&(p.curated||!inR)) return false;
      if(filt.q){ const q=filt.q.toLowerCase();
        if(!((p.name||'').toLowerCase().includes(q)||String(p.code||'').toLowerCase().includes(q)||(p.supplier||'').toLowerCase().includes(q))) return false; }
      return true;
    });
    const K={name:p=>(p.name||'').toLowerCase(),price:p=>p.priceFrom||0,supplier:p=>(p.supplier||'').toLowerCase(),
      sub:p=>(subNames(p)[0]||'zzz').toLowerCase(),
      brand:p=>((window.MSBRANDS&&MSBRANDS.brandOf(p.id))||'zzz').toLowerCase(),moq:p=>p.moq||0,
      created:p=>+asDate(p.created||0)||0,
      updated:p=>+asDate(updatedOf(p)||0)||0,
      added:p=>+asDate(MSCAT.distAddedOn(p.id)||0)||0};
    const k=K[filt.sort]||K.name;
    out.sort((a,b)=>{ const x=k(a),y=k(b); return (x<y?-1:x>y?1:0)*filt.dir; });
    return out;
  }
  function tableHTML(cfg){
    const ok=pool(), list=rows(cfg), shown=list.slice(0,page*PAGE);
    lastIds=shown.map(p=>p.id);
    const inCount=ok.filter(p=>MSCAT.distInRange(p.id)).length;
    const sups=[...new Set(ok.map(p=>p.supplier))].sort();
    const subs=Object.values(subIndex()).sort((a,b)=>b.count-a.count||a.n.localeCompare(b.n));
    const locked=cfg.mode==='curated';
    return `
      <div class="statbar sr-stats">
        <div class="sb"><b>${inCount.toLocaleString()}</b><span>In your range</span></div>
        <div class="sb"><b>${ok.length.toLocaleString()}</b><span>Available to you</span></div>
        <div class="sb"><b>${sups.length}</b><span>Approved suppliers</span></div>
      </div>
      ${supplierStrip()}
      <div class="toolbar sr-tools2">
        <div class="search"><svg class="icn"><use href="#i-search"/></svg><input id="srQ" placeholder="Search by name, SKU code, supplier…" value="${esc(filt.q)}"></div>
        <select class="prod-sel" id="srSup"><option value="">All your suppliers</option>${sups.map(n=>`<option value="${esc(n)}" ${filt.supplier===n?'selected':''}>${esc(n)} (${ok.filter(p=>p.supplier===n).length})</option>`).join('')}</select>
        <select class="prod-sel" id="srTag"><option value="">All tags</option>${(function(){
          let out='';
          if(window.MSDTAGS){ const c=MSDTAGS.counts(); const l=MSDTAGS.list();
            out+=`<optgroup label="Your tags">${l.map(t=>`<option value="my:${esc(t)}" ${filt.tag==='my:'+t?'selected':''}>${esc(t)} (${c[t]||0})</option>`).join('')}<option value="none:" ${filt.tag==='none:'?'selected':''}>— None of yours —</option></optgroup>`; }
          if(window.MSTAGS&&showMsTags()){ const c=MSTAGS.counts();
            const l=MSTAGS.list().filter(t=>(c[t]||0)>0);
            if(l.length) out+=`<optgroup label="Merchsmith tags">${l.map(t=>`<option value="ms:${esc(t)}" ${filt.tag==='ms:'+t?'selected':''}>${esc(t)} (${c[t]})</option>`).join('')}</optgroup>`; }
          return out;
        })()}</select>
        <select class="prod-sel" id="srBrand"><option value="">All brands</option><option value="__none" ${filt.brand==='__none'?'selected':''}>— Untagged —</option>${(function(){
          if(!window.MSBRANDS) return '';
          const counts={}; ok.forEach(p=>{ const b=MSBRANDS.brandOf(p.id); if(b) counts[b]=(counts[b]||0)+1; });
          return Object.keys(counts).sort().map(b=>`<option value="${esc(b)}" ${filt.brand===b?'selected':''}>${esc(b)} (${counts[b]})</option>`).join('');
        })()}</select>
        <select class="prod-sel" id="srSub"><option value="">All sub-categories</option>${(function(){
          const by={}; subs.forEach(x=>{ (by[x.dept]=by[x.dept]||[]).push(x); });
          return Object.keys(by).sort().map(dp=>`<optgroup label="${esc(dp)}">${by[dp].map(x=>`<option value="${esc(x.n)}" ${filt.sub===x.n?'selected':''}>${esc(x.n)} (${x.count})</option>`).join('')}</optgroup>`).join('');
        })()}</select>
        <select class="prod-sel" id="srGroup" title="Group products">
          <option value="" ${groupBy===''?'selected':''}>No grouping</option>
          <option value="supplier" ${groupBy==='supplier'?'selected':''}>Group by supplier</option>
          <option value="sub" ${groupBy==='sub'?'selected':''}>Group by sub-category</option>
        </select>
        <select class="prod-sel" id="srSort">${[['name','Name'],['price','Price'],['supplier','Supplier'],['sub','Sub-category'],['brand','Brand'],['moq','MOQ'],['created','Created'],['updated','Updated'],['added','Added by you']].map(([k,l])=>`<option value="${k}" ${filt.sort===k?'selected':''}>${l} ${filt.sort===k?(filt.dir>0?'↑':'↓'):''}</option>`).join('')}</select>
      </div>
      <div class="sr-chiprow">
        <div class="fbtns sr-chips">${(cfg.mode==='curated'?VIEWS_MIRROR:VIEWS_ALL).map(([v,l])=>`<button class="fbtn ${filt.view===v?'on':''}" data-srv="${v}">${l}</button>`).join('')}</div>
        ${(filt.q||filt.supplier||filt.sub||filt.brand||filt.tag||filt.view||groupBy)?'<button class="sr-clear" id="srClear">Clear all filters</button>':''}
        <div class="vtoggle" id="srVM" role="group" aria-label="Switch layout">
          <button class="${viewMode==='gallery'?'on':''}" data-srvm="gallery" title="Gallery view" aria-label="Gallery view" aria-pressed="${viewMode==='gallery'}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg></button>
          <button class="${viewMode==='table'?'on':''}" data-srvm="table" title="List view" aria-label="List view" aria-pressed="${viewMode==='table'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
        </div>
      </div>

      <div id="srBulk" class="bulkbar" hidden></div>
      ${viewMode==='gallery'
        ? `${shown.length&&!locked?`<div class="sr-galtools"><button class="fbtn" id="srSelPage">Select all ${shown.length} on page</button></div>`:''}
           ${shown.length?groupsOf(shown).map(g=>(g.label?`<div class="sr-ghd">${srHdr(g)}</div>`:'')+(collapsed.has(g.key)?'':`<div class="sr-gal">${g.items.map(p=>galHTML(p,locked)).join('')}</div>`)).join(''):'<div class="sr-empty">Nothing matches those filters.</div>'}`
        : `<div class="prodtbl-wrap"><table class="dirtable prodtbl sr-rangetbl"><thead><tr>
        <th class="chkcol"><input type="checkbox" id="srChkAll" aria-label="Select all"></th>
        <th>Product</th><th>Supplier</th><th>Sub-category</th><th>Brand</th><th>Tags</th><th class="scell">From</th><th>Created</th><th>Updated</th>${cfg.mode==='curated'?'':'<th>Added by you</th>'}<th>Status</th><th></th>
      </tr></thead><tbody id="srRows">${shown.length
        ? groupsOf(shown).map(g=>(g.label?`<tr class="sr-grouprow"><td colspan="${cfg.mode==='curated'?11:12}">${srHdr(g)}</td></tr>`:'')+(collapsed.has(g.key)?'':g.items.map(p=>rowHTML(p,locked)).join(''))).join('')
        : `<tr><td colspan="${cfg.mode==='curated'?11:12}"><div class="sr-empty">Nothing matches those filters.</div></td></tr>`}</tbody></table></div>`}
      <div class="prodtbl-foot">${shown.length.toLocaleString()} of ${list.length.toLocaleString()}${list.length>shown.length?` · <button class="sr-more" id="srMore">Load ${Math.min(PAGE,list.length-shown.length)} more</button>`:''}</div>`;
  }
  // The relationship set itself, made visible: connected suppliers are what you can stock;
  // anything else in the Merchsmith catalogue is listed but not browsable.
  function supplierStrip(){
    const ok=MSCAT.distSuppliers();
    const others=MSCAT.suppliers().filter(x=>ok.indexOf(x.name)<0);
    return `<div class="sr-supstrip">
      <div class="sr-supline"><span class="sr-suplbl">Your suppliers</span>
        ${ok.map(n=>{ const hit=MSCAT.suppliers().find(x=>x.name===n);
          return `<button class="sr-sup ok ${filt.supplier===n?'on':''}" data-srsup="${esc(n)}" title="${filt.supplier===n?'Showing only this supplier — click to clear':'Show only '+esc(n)}" aria-pressed="${filt.supplier===n}">${esc(n)}<i>${hit?hit.count.toLocaleString():0}</i></button>`; }).join('')}
        <a class="sr-supadd" href="Merchsmith Organisations.html#tab=suppliers&amp;connect=1" title="Connect a supplier you already work with"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Connect a supplier</a></div>
      ${others.length?`<div class="sr-supline"><span class="sr-suplbl">Not connected</span>
        ${others.map(x=>`<span class="sr-sup no" title="No approved relationship — ask Merchsmith to connect this supplier">${esc(x.name)}<i>${x.count.toLocaleString()}</i></span>`).join('')}</div>`:''}
    </div>`;
  }
  function rowHTML(p,locked){
    const inR=MSCAT.distInRange(p.id), ov=(window.MSOV&&MSOV.count(p.id))||0;
    const img=p.image?`<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:esc((p.name||'?').slice(0,1));
    return `<tr data-srp="${p.id}" class="${inR?'inrange':''}">
      <td class="chkcol"><input type="checkbox" class="srchk" data-srchk="${p.id}" ${sel.has(p.id)?'checked':''}></td>
      <td><span class="orgcell"><a class="srthumb" href="${storeHref(p)}" title="Open in the store">${img}</a><span><a class="sr-pname" href="${storeHref(p)}" title="Open “${esc(p.name)}” in the store">${esc(p.name)}</a>${p.code?`<span class="sr-pref">${esc(p.code)}</span>`:''}</span></span></td>
      <td>${esc(p.supplier)}</td>
      <td>${(function(){ const n=subNames(p);
        if(!n.length) return `<span class="subnone" title="Not filed under a sub-category yet — filing is set by Merchsmith">—</span>`;
        return `<span class="subcell" title="Sub-categories are set by Merchsmith and cannot be changed here">${n.slice(0,2).map(x=>`<span class="depttag">${esc(x)}</span>`).join('')}${n.length>2?`<span class="depttag more">+${n.length-2}</span>`:''}</span>`; })()}</td>
      <td>${(function(){ const b=window.MSBRANDS?MSBRANDS.brandOf(p.id):'';
        return b?`<span class="depttag">${esc(b)}</span>`:'<span class="subnone">—</span>'; })()}</td>
      <td>${tagChips(p)}</td>
      <td class="scell">${p.priceFrom?gbp(p.priceFrom):'<span class="sr-poa">POA</span>'}</td>
      <td class="sr-date">${fmtDate(p.created)}</td>
      <td class="sr-date">${(function(){ const u=updatedOf(p);
        return u?`<span title="${ov?'Your last edit to this product':'Last feed update'}">${fmtDate(u)}</span>`:'<span class="subnone">—</span>'; })()}</td>
      ${MSCAT.distConfig().mode==='curated'?'':`<td class="sr-date">${inR?fmtDate(MSCAT.distAddedOn(p.id)):'<span class="subnone">—</span>'}</td>`}
      <td>${p.curated?`<span class="sr-src cur">Recommended${p.promoted?' · featured':''}</span>`:(inR?'<span class="sr-src own">Added by you</span>':'<span class="sr-src none">—</span>')}${ov?`<span class="sr-src ov" title="You’ve overridden ${ov} field${ov===1?'':'s'}">Edited · ${ov}</span>`:''}</td>
      <td class="sr-actcol">${locked?'':`<button class="srb-add ${inR?'in':''}" data-srtog="${p.id}">${inR?'✓ In your range':'＋ Add'}</button>`}<button class="sr-eye" data-srview="${p.id}" title="Preview product"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg></button></td>
    </tr>`;
  }
  let lastIds=[];
  const storeHref=p=>'Merchsmith Store.html#product='+encodeURIComponent(p.id);
  const updatedOf=p=>{ const rec=(window.MSOV&&MSOV.get(p.id))||{};
    return rec.updated||p.imported||''; };
  // MSOV stamps dd/mm/yyyy (en-GB), which Date() misreads — parse that shape explicitly
  const asDate=v=>{ const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v||''));
    return m?new Date(+m[3],+m[2]-1,+m[1]):new Date(v); };
  const fmtDate=v=>{ if(!v) return '<span class="subnone">—</span>'; const d=asDate(v);
    return isNaN(d)?'<span class="subnone">—</span>':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); };
  // Grouping applies to the products currently loaded, as in the admin table.
  function groupsOf(list){
    if(!groupBy) return [{key:'',label:null,items:list}];
    const map=new Map();
    list.forEach(p=>{ const k=(groupBy==='supplier'?p.supplier:(subNames(p)[0]||'— Not filed —'))||'—';
      if(!map.has(k)) map.set(k,[]); map.get(k).push(p); });
    return [...map.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
      .map(([k,items])=>({key:k,label:k,items}));
  }
  const srHdr=g=>`<button class="sr-gtoggle ${collapsed.has(g.key)?'off':''}" data-srgroup="${esc(g.key)}"><span class="gcar">▾</span>${esc(g.label)}<em>${g.items.length}</em></button>`;
  function galHTML(p,locked){
    const inR=MSCAT.distInRange(p.id), subs=subNames(p);
    const img=p.image?`<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:esc((p.name||'?').slice(0,1));
    return `<div class="sr-gcard ${inR?'inrange':''}" data-srp="${p.id}">
      <label class="sr-gchk"><input type="checkbox" class="srchk" data-srchk="${p.id}" ${sel.has(p.id)?'checked':''}></label>
      <a class="sr-gimg" href="${storeHref(p)}" title="Open in the store">${img}<span class="sr-gacts"><button class="sr-gicon" data-srview="${p.id}" title="Preview product" onclick="event.preventDefault();event.stopPropagation()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg></button><span class="sr-gicon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/></svg></span></span></a>
      <a class="sr-gname" href="${storeHref(p)}">${esc(p.name)}</a>
      <span class="sr-gsub">${esc(p.supplier)}${subs.length?' · '+esc(subs[0]):''}</span>
      <div class="sr-gtags">${tagChips(p)}</div>
      <div class="sr-gfoot"><b>${p.priceFrom?gbp(p.priceFrom):'<span class="sr-poa">POA</span>'}</b>${locked?'':`<button class="srb-add ${inR?'in':''}" data-srtog="${p.id}">${inR?'✓ In range':'＋ Add'}</button>`}</div>
    </div>`;
  }
  // Merchsmith's labels are shown read-only; only the distributor's own are clickable.
  // A bespoke range has no Merchsmith baseline, so Merchsmith's merchandising
  // labels carry no meaning in it — show only the distributor's own.
  const showMsTags=()=>{ try{ return MSCAT.distConfig().mode!=='bespoke'; }catch(e){ return true; } };
  function tagChips(p){
    const mine=window.MSDTAGS?MSDTAGS.tagsOf(p.id):[];
    const ms=(window.MSTAGS&&showMsTags())?MSTAGS.tagsOf(p.id):[];
    return `<span class="tagcell">${ms.slice(0,2).map(t=>`<span class="ptagchip ms" title="Merchsmith tag — set by Merchsmith">${esc(t)}</span>`).join('')}${mine.map(t=>`<span class="ptagchip mine">${esc(t)}</span>`).join('')}<button class="tagbtn" data-dtag="${p.id}" title="Your tags">${mine.length?'✎':'＋ Tag'}</button></span>`;
  }
  // small popover of the distributor's own tags
  function openTagPicker(id,anchor){
    document.querySelectorAll('.tagpop').forEach(x=>x.remove());
    if(!window.MSDTAGS) return;
    const pop=document.createElement('div'); pop.className='tagpop';
    const draw=()=>{ const on=MSDTAGS.tagsOf(id);
      pop.innerHTML=`<div class="tagpop-h">Your tags</div>${MSDTAGS.list().map(t=>`<button class="tagpop-o ${on.indexOf(t)>-1?'on':''}" data-tp="${esc(t)}">${esc(t)}</button>`).join('')||'<p class="tagpop-e">No tags yet.</p>'}<button class="tagpop-new" data-tpnew>+ New tag…</button>`;
      pop.querySelectorAll('[data-tp]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); MSDTAGS.toggle(id,b.dataset.tp); draw(); refresh(); });
      pop.querySelector('[data-tpnew]').onclick=ev=>{ ev.stopPropagation(); const n=prompt('New tag name:');
        if(n&&n.trim()){ MSDTAGS.add(n); MSDTAGS.toggle(id,n.trim()); draw(); refresh(); } };
    };
    draw();
    document.body.appendChild(pop);
    const r=anchor.getBoundingClientRect();
    pop.style.top=(window.scrollY+r.bottom+6)+'px';
    pop.style.left=Math.max(10,Math.min(window.scrollX+r.left, window.scrollX+window.innerWidth-pop.offsetWidth-12))+'px';
    const away=e=>{ if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('mousedown',away); } };
    setTimeout(()=>document.addEventListener('mousedown',away),0);
  }
  // the distributor's OWN tag list — Merchsmith's platform tags are not editable here
  function openTagManager(){
    let pk=document.getElementById('dTagMgr'); if(!pk){ pk=document.createElement('div'); pk.id='dTagMgr'; pk.className='sr-scrim'; document.body.appendChild(pk); }
    function draw(){
      const tags=MSDTAGS.list(), c=MSDTAGS.counts();
      pk.innerHTML=`<div class="sr-browser" style="width:min(440px,100%)"><div class="srb-hd"><h3>Your tags</h3><button class="dwr-x" data-tx>×</button></div>
        <div class="srb-scroll">
          <p class="sr-scope">Your own labels for organising your range. <b>Merchsmith's tags are separate</b> and can't be edited here — you can still filter by them.</p>
          <div class="bm-add"><input id="dtNew" placeholder="New tag name…"><button class="btn sm" id="dtAdd">Add</button></div>
          <div class="bm-list">${tags.length?tags.map(t=>`<div class="bm-row"><input class="bm-name" data-dtname="${esc(t)}" value="${esc(t)}"><span class="bm-ct">${(c[t]||0).toLocaleString()} tagged</span><button class="bm-del" data-dtdel="${esc(t)}" title="Remove">×</button></div>`).join(''):'<p class="sr-empty">No tags yet. Add your first above.</p>'}</div>
        </div>
        <div class="srb-foot"><button class="btn" data-tx>Done</button></div></div>`;
      const add=()=>{ const v=pk.querySelector('#dtNew').value.trim(); if(v){ MSDTAGS.add(v); draw(); } };
      pk.querySelector('#dtAdd').onclick=add;
      pk.querySelector('#dtNew').onkeydown=e=>{ if(e.key==='Enter')add(); };
      pk.querySelectorAll('[data-dtname]').forEach(inp=>inp.onchange=()=>{ const o=inp.dataset.dtname,n=inp.value.trim(); if(n&&n!==o){ MSDTAGS.rename(o,n); draw(); } });
      pk.querySelectorAll('[data-dtdel]').forEach(b=>b.onclick=()=>{ const nm=b.dataset.dtdel, ct=MSDTAGS.productsTagged(nm).length;
        if(!ct||confirm(`Remove "${nm}"? It will be cleared from ${ct} product${ct===1?'':'s'}.`)){ MSDTAGS.remove(nm); draw(); } });
    }
    draw();
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); render(); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-tx]')) cx(); });
  }
  function wireTable(){
    const p=panel(); if(!p) return;
    const cfg=MSCAT.distConfig();
    const q=p.querySelector('#srQ');
    if(q) q.oninput=()=>{ const pos=q.selectionStart; filt.q=q.value; page=1; refresh();
      const n=document.getElementById('srQ'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } };
    const sp=p.querySelector('#srSup'); if(sp) sp.onchange=()=>{ filt.supplier=sp.value; page=1; refresh(); };
    const grp=p.querySelector('#srGroup'); if(grp) grp.onchange=()=>{ groupBy=grp.value; collapsed.clear(); refresh(); };
    const clr=p.querySelector('#srClear'); if(clr) clr.onclick=()=>{
      Object.keys(filt).forEach(k=>{ if(k!=='sort'&&k!=='dir') filt[k]=''; });
      groupBy=''; collapsed.clear(); page=1; render(); };
    p.querySelectorAll('[data-srgroup]').forEach(b=>b.onclick=e=>{ e.stopPropagation();
      const k=b.dataset.srgroup; if(collapsed.has(k)) collapsed.delete(k); else collapsed.add(k); refresh(); });
    const so=p.querySelector('#srSort'); if(so) so.onchange=()=>{ if(filt.sort===so.value) filt.dir=-filt.dir; else { filt.sort=so.value; filt.dir=1; } refresh(); };
    p.querySelectorAll('[data-srv]').forEach(b=>b.onclick=()=>{ filt.view=b.dataset.srv; page=1; refresh(); });
    const sb=p.querySelector('#srSub'); if(sb) sb.onchange=()=>{ filt.sub=sb.value; page=1; refresh(); };
    const br=p.querySelector('#srBrand'); if(br) br.onchange=()=>{ filt.brand=br.value; page=1; refresh(); };
    const tg=p.querySelector('#srTag'); if(tg) tg.onchange=()=>{ filt.tag=tg.value; page=1; refresh(); };
    const mt=p.querySelector('#srManageTags'); if(mt) mt.onclick=openTagManager;
    p.querySelectorAll('[data-dtag]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation();
      openTagPicker(b.dataset.dtag,b); });
    p.querySelectorAll('[data-srvm]').forEach(b=>b.onclick=()=>{ viewMode=b.dataset.srvm; refresh(); });
    p.querySelectorAll('[data-srview]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); openPreview(b.dataset.srview); });
    p.querySelectorAll('[data-srsup]').forEach(b=>b.onclick=()=>{ const n=b.dataset.srsup;
      filt.supplier = filt.supplier===n ? '' : n; page=1; refresh(); });
    const sp2=p.querySelector('#srSelPage');
    if(sp2) sp2.onclick=()=>{ const ids=[...p.querySelectorAll('.srchk')].map(x=>x.dataset.srchk);
      const allOn=ids.length&&ids.every(id=>sel.has(id));
      ids.forEach(id=>allOn?sel.delete(id):sel.add(id)); refresh(); };
    const more=p.querySelector('#srMore'); if(more) more.onclick=()=>{ page++; refresh(); };
    p.querySelectorAll('[data-srtog]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.srtog, prod=MSCAT.get(id), was=MSCAT.distInRange(id);
      if(cfg.mode==='curated') return;
      MSCAT.distToggle(id); refresh();
      toast(`"${prod?prod.name:'Product'}" ${was?'removed from':'added to'} your range`); });
    p.querySelectorAll('.srchk').forEach(c=>c.onclick=()=>{ if(c.checked)sel.add(c.dataset.srchk); else sel.delete(c.dataset.srchk); syncBulk(); });
    const all=p.querySelector('#srChkAll');
    if(all){ const ids=[...p.querySelectorAll('.srchk')].map(c=>c.dataset.srchk);
      all.checked=ids.length&&ids.every(id=>sel.has(id));
      all.onclick=()=>{ ids.forEach(id=>all.checked?sel.add(id):sel.delete(id)); refresh(); }; }
    syncBulk();
  }
  // Reset is destructive and irreversible, so it is restricted to a distributor Admin
  // or Owner. Other distributor seats (Account Manager, Studio, Production, Finance)
  // see the control, disabled, with the reason — hiding it would just look like a bug.
  function isRangeAdmin(){
    if(!window.MSID) return true;
    if(MSID.current()!=='distributor') return false;
    return /admin|owner/i.test((MSID.get()||{}).role||'');
  }
  function confirmReset(go){
    const st=MSCAT.distStats(), cfg=MSCAT.distConfig();
    const edits=(cfg.added||[]).length+(cfg.removed||[]).length+(cfg.mode==='bespoke'?(cfg.bespoke||[]).length:0);
    let pk=document.getElementById('srResetConfirm');
    if(!pk){ pk=document.createElement('div'); pk.id='srResetConfirm'; pk.className='sr-scrim'; document.body.appendChild(pk); }
    pk.innerHTML=`<div class="sr-confirm" role="dialog" aria-modal="true" aria-labelledby="srRsTitle">
      <h3 id="srRsTitle">Reset your product range?</h3>
      <p>Your store will go back to mirroring the Merchsmith Recommended range.</p>
      <p class="sr-cfwarn"><b>This cannot be undone.</b> ${edits?`All ${edits} of your range ${edits===1?'change is':'changes are'} discarded`:'Your range changes are discarded'} — products you added are removed, products you hid come back, and your store updates for customers straight away.</p>
      <p class="sr-cfnow">Currently <b>${st.count.toLocaleString()}</b> products live on <b>${MODELBL[cfg.mode]}</b>.</p>
      <label class="sr-cftype"><span>Type <b>RESET</b> to confirm</span>
        <input type="text" id="srRsWord" autocomplete="off" spellcheck="false" placeholder="RESET"></label>
      <div class="sr-cfacts"><button class="btn ghost" data-rsno>Cancel</button><button class="btn" data-rsyes disabled>Reset range</button></div>
    </div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const close=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); document.removeEventListener('keydown',k); };
    function k(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown',k);
    pk.addEventListener('click',e=>{ if(e.target===pk) close(); });
    const word=pk.querySelector('#srRsWord'), yes=pk.querySelector('[data-rsyes]');
    word.oninput=()=>{ yes.disabled = word.value.trim().toUpperCase()!=='RESET'; };
    word.onkeydown=e=>{ if(e.key==='Enter'&&!yes.disabled){ close(); go(); } };
    pk.querySelector('[data-rsno]').onclick=close;
    yes.onclick=()=>{ close(); go(); };
    word.focus();
  }

  /* Changing mode rebuilds the storefront, and the edit modes can discard work —
     so it asks first, naming what will actually happen in this direction. */
  function confirmMode(from,to,go){
    const st=MSCAT.distStats(), cfg=MSCAT.distConfig();
    const edits=(cfg.added||[]).length+(cfg.removed||[]).length;
    let body='', warn='';
    if(to==='curated'){
      body='Your store will mirror the Merchsmith Recommended range exactly, and stay in step with it automatically.';
      if(edits) warn=`Your ${edits} edit${edits===1?'':'s'} to the range ${edits===1?'is':'are'} set aside — products you added will no longer appear, and products you hid will come back.`;
    } else if(to==='edited'){
      body='Your store starts from the Merchsmith Recommended range, and you can add or hide products from there.';
      if(from==='bespoke') warn=`Every recommended product will appear in your store again, on top of your ${(cfg.bespoke||[]).length} hand-picked ${(cfg.bespoke||[]).length===1?'product':'products'}.`;
    } else {
      body='Your store will contain only the products you pick yourself.';
      warn='Recommended-range updates will no longer reach your store — new Merchsmith products will not appear, and Merchsmith-promoted products will not be shown.';
    }
    let pk=document.getElementById('srModeConfirm');
    if(!pk){ pk=document.createElement('div'); pk.id='srModeConfirm'; pk.className='sr-scrim'; document.body.appendChild(pk); }
    pk.innerHTML=`<div class="sr-confirm" role="dialog" aria-modal="true" aria-labelledby="srCfTitle">
      <h3 id="srCfTitle">Change your store to “${MODELBL[to]}”?</h3>
      <p>${esc(body)}</p>
      ${warn?`<p class="sr-cfwarn"><b>This changes your live storefront.</b> ${esc(warn)}</p>`
            :'<p class="sr-cfwarn"><b>This changes your live storefront.</b> Customers will see the new range straight away.</p>'}
      <p class="sr-cfnow">Currently <b>${st.count.toLocaleString()}</b> products live on <b>${MODELBL[from]}</b>.</p>
      <div class="sr-cfacts"><button class="btn ghost" data-cfno>Cancel</button><button class="btn" data-cfyes>Change store range</button></div>
    </div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const close=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); document.removeEventListener('keydown',k); };
    function k(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown',k);
    pk.addEventListener('click',e=>{ if(e.target===pk) close(); });
    pk.querySelector('[data-cfno]').onclick=close;
    pk.querySelector('[data-cfyes]').onclick=()=>{ close(); go(); };
    pk.querySelector('[data-cfyes]').focus();
  }

  /* ---------- preview pane (right edge) ----------
     Distributor-scoped: everything about the product that helps a stocking decision,
     plus the range toggle. Merchsmith-owned fields (department, sub-category, tier)
     are shown read-only — they are not the distributor's to change. */
  function openPreview(id){
    const p=MSCAT.get(id); if(!p) return;
    let pk=document.getElementById('srPrev');
    if(!pk){ pk=document.createElement('div'); pk.id='srPrev'; pk.className='sr-scrim'; document.body.appendChild(pk); }
    const inR=MSCAT.distInRange(p.id), ov=(window.MSOV&&MSOV.count(p.id))||0;
    const cur=p.curation||{}, subs=subNames(p);
    const brand=window.MSBRANDS?MSBRANDS.brandOf(p.id):'';
    const cols=(p.colours||[]).map(c=>typeof c==='string'?c:(c&&(c.name||c.base))||'').filter(Boolean);
    const i=lastIds.indexOf(id);
    const locked=MSCAT.distConfig().mode==='curated';
    pk.innerHTML=`<div class="sr-dr">
      <div class="sr-drhd">
        <div class="sr-drthumb">${p.image?`<img src="${esc(p.image)}" alt="" onerror="this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div>
        <div class="sr-drtitle"><h2>${esc(p.name)}</h2><span>${esc(p.supplier)}${p.code?' · '+esc(p.code):''}</span></div>
        <div class="sr-drnav">${i<0?'':`<button class="sr-navbtn" data-srprev ${i<=0?'disabled':''} title="Previous (←)">‹</button><span class="sr-navct">${(i+1).toLocaleString()} / ${lastIds.length.toLocaleString()}</span><button class="sr-navbtn" data-srnext ${i>=lastIds.length-1?'disabled':''} title="Next (→)">›</button>`}</div>
        <button class="sr-drx" data-srx title="Close">×</button>
      </div>
      <div class="sr-drbody">
        <div class="sr-drstats">
          <div class="stat"><b>${p.priceFrom?gbp(p.priceFrom):'POA'}</b><span>From / unit</span></div>
          <div class="stat"><b>${p.moq?p.moq.toLocaleString():'—'}</b><span>MOQ</span></div>
          <div class="stat"><b>${p.lead?p.lead+'d':'—'}</b><span>Lead</span></div>
          <div class="stat"><b>♻ ${p.sustainability||'—'}/10</b><span>Eco</span></div>
        </div>

        <div class="sr-drsec ${inR?'on':''}">
          <h4>Your range</h4>
          <p class="sr-drnote">${inR
            ? (p.curated?'In your range via the Merchsmith Recommended range.':'You added this product to your range'+(MSCAT.distAddedOn(p.id)?' on '+fmtDate(MSCAT.distAddedOn(p.id)):'')+'.')
            : 'Not in your range — customers cannot see it in your store.'}</p>
          ${locked?'<p class="sr-drhint">Your range mirrors the Merchsmith Recommended range, so it cannot be edited product by product. Switch to <b>Recommended + your edits</b> or <b>Fully bespoke</b> to change it.</p>'
            :`<button class="srb-add ${inR?'in':''} wide" data-srtog="${p.id}">${inR?'✓ In your range — remove':'＋ Add to your range'}</button>`}
        </div>

        <div class="sr-drsec">
          <h4>Product detail</h4>
          <div class="sr-kv">
            <span class="k">Brand</span><span class="v">${brand?esc(brand):'—'}</span>
            <span class="k">Sub-category</span><span class="v">${subs.length?subs.map(x=>`<span class="depttag">${esc(x)}</span>`).join(' '):'<span class="subnone">Not filed</span>'}</span>
            <span class="k">Colours</span><span class="v">${cols.length?esc(cols.join(', ')):'—'}</span>
            <span class="k">Branding</span><span class="v">${(p.methods||[]).length?esc((p.methods||[]).join(', ')):'—'}</span>
            ${p.material?`<span class="k">Material</span><span class="v">${esc(p.material)}</span>`:''}
            ${p.dimensions?`<span class="k">Dimensions</span><span class="v">${esc(p.dimensions)}</span>`:''}
            ${p.origin?`<span class="k">Origin</span><span class="v">${esc(p.origin)}</span>`:''}
            ${p.weightGr?`<span class="k">Weight</span><span class="v">${p.weightGr>=1000?(p.weightGr/1000).toFixed(2)+' kg':p.weightGr+' g'}</span>`:''}
            ${p.ean?`<span class="k">EAN</span><span class="v">${esc(p.ean)}</span>`:''}
            ${(p.certifications&&p.certifications.length)?`<span class="k">Certifications</span><span class="v">${p.certifications.map(c=>esc(c)).join(' · ')}</span>`:''}
          </div>
        </div>

        ${p.desc||p.blurb?`<div class="sr-drsec"><h4>Description</h4><p class="sr-drdesc">${esc(p.desc||p.blurb)}</p></div>`:''}

        <div class="sr-drsec">
          <h4>Your tags</h4>
          <div class="sr-drtags">${tagChips(p)}</div>
          <button class="sr-drlink" data-dtag="${p.id}">Edit tags</button>
        </div>

        <div class="sr-drsec" id="srNotes">${window.MSNOTES?MSNOTES.panelHTML(p.id):''}</div>

        <div class="sr-drsec">
          <h4>Record</h4>
          <div class="sr-kv">
            <span class="k">Merchsmith status</span><span class="v">${p.curated?`Recommended${p.promoted?' · featured':''}`:'Not recommended'}</span>
            <span class="k">Created</span><span class="v">${fmtDate(p.created)}</span>
            <span class="k">Updated</span><span class="v">${updatedOf(p)?fmtDate(updatedOf(p)):'—'}</span>
            <span class="k">Added by you</span><span class="v">${inR&&MSCAT.distAddedOn(p.id)?fmtDate(MSCAT.distAddedOn(p.id)):'—'}</span>
            ${ov?`<span class="k">Your edits</span><span class="v">${ov} field${ov===1?'':'s'} overridden</span>`:''}
          </div>
        </div>

        <a class="sr-drstore" href="${storeHref(p)}">Open in the store →</a>
      </div></div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const close=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); document.removeEventListener('keydown',key); };
    const step=d=>{ const n=lastIds.indexOf(id)+d; if(n>=0&&n<lastIds.length){ close(); openPreview(lastIds[n]); } };
    function key(e){ if(e.key==='Escape') close(); else if(e.key==='ArrowLeft') step(-1); else if(e.key==='ArrowRight') step(1); }
    document.addEventListener('keydown',key);
    pk.addEventListener('click',e=>{ if(e.target===pk) close(); });
    pk.querySelector('[data-srx]').onclick=close;
    const pv=pk.querySelector('[data-srprev]'); if(pv) pv.onclick=()=>step(-1);
    const nx=pk.querySelector('[data-srnext]'); if(nx) nx.onclick=()=>step(1);
    const tg=pk.querySelector('[data-srtog]');
    if(tg) tg.onclick=()=>{ const was=MSCAT.distInRange(p.id); MSCAT.distToggle(p.id);
      if(window.MSNOTES) MSNOTES.log(p.id,'dist',was?'removed it from your range':'added it to your range');
      refresh(); close(); openPreview(p.id); };
    if(window.MSNOTES) MSNOTES.wire(pk.querySelector('#srNotes'),p.id,()=>refresh());
    const tagBtn=pk.querySelector('[data-dtag]');
    if(tagBtn) tagBtn.onclick=e=>{ e.preventDefault(); e.stopPropagation(); openTagPicker(p.id,tagBtn); };
  }

  // header controls — bound from BOTH render() and refresh(), since refresh()
  // rewrites the card and would otherwise leave dead buttons behind
  function wireHead(root){
    root.querySelectorAll('.sr-seg button').forEach(b=>b.onclick=()=>{
      const to=b.dataset.mode, from=MSCAT.distConfig().mode;
      if(to===from) return;
      confirmMode(from,to,()=>{ MSCAT.setDistMode(to);
        if(to==='bespoke'&&filt.tag.indexOf('ms:')===0) filt.tag='';   // that filter no longer exists
        render(); toast('Store mode: '+MODELBL[to]); });
    });
    const rs=root.querySelector('#srReset');
    if(rs&&!rs.disabled) rs.onclick=()=>confirmReset(()=>{ MSCAT.setDistMode('curated'); render(); toast('Range reset to the Merchsmith recommended range'); });
    const mt=root.querySelector('#srManageTags'); if(mt) mt.onclick=openTagManager;
    root.querySelectorAll('[data-srsup]').forEach(b=>b.onclick=()=>{ const n=b.dataset.srsup;
      filt.supplier = filt.supplier===n ? '' : n; page=1; refresh(); });
  }

  // re-render just the table, keeping the mode cards and notices untouched
  function refresh(){
    const p=panel(); if(!p) return;
    const cfg=MSCAT.distConfig();
    const host=p.querySelector('.prodtbl-wrap'); if(!host) { render(); return; }
    const card=host.closest('.card');
    // the header was rebuilt as .sr-hd (was .card-h) — fall back so a future rename
    // degrades to a full re-render rather than throwing and freezing the view
    const keep=card.querySelector('.sr-hd')||card.querySelector('.card-h');
    if(!keep){ render(); return; }
    const sum=card.querySelector('.sr-note'), acts=card.querySelector('.sr-actions');
    card.innerHTML=keep.outerHTML+(sum?sum.outerHTML:'')+(acts?acts.outerHTML:'')+tableHTML(cfg);
    wireHead(card);
    wireTable();
  }
  function syncBulk(){
    const bar=document.getElementById('srBulk'); if(!bar) return;
    const cfg=MSCAT.distConfig();
    if(!sel.size||cfg.mode==='curated'){ bar.hidden=true; bar.innerHTML=''; return; }
    const picked=[...sel].map(id=>MSCAT.get(id)).filter(Boolean);
    const nOut=picked.filter(p=>!MSCAT.distInRange(p.id)).length, nIn=picked.length-nOut;
    bar.hidden=false;
    bar.innerHTML=`<span class="bulkn"><b>${sel.size}</b> selected</span><div class="bulkacts">${window.MSDTAGS?`<select class="prod-sel sm" id="srBulkTag"><option value="">Apply your tag…</option>${MSDTAGS.list().map(t=>`<option value="add:${esc(t)}">＋ ${esc(t)}</option>`).join('')}${MSDTAGS.list().map(t=>`<option value="rm:${esc(t)}">− Remove ${esc(t)}</option>`).join('')}<option value="__new">+ New tag…</option></select>`:''}${nOut?`<button class="btn sm" data-sbadd>＋ Add ${nOut} to your range</button>`:''}${nIn?`<button class="btn ghost sm" data-sbrm>Remove ${nIn}</button>`:''}<button class="bulkclear" data-sbclear>Clear</button></div>`;
    const bt=bar.querySelector('#srBulkTag');
    if(bt) bt.onchange=()=>{ const v=bt.value; if(!v) return; const ids=picked.map(p=>p.id); bt.value='';
      if(v==='__new'){ const n=prompt('New tag name:'); if(n&&n.trim()){ MSDTAGS.add(n); const k=MSDTAGS.addBulk(ids,n.trim()); toast(`Tagged ${k} product${k===1?'':'s'} "${n.trim()}"`); refresh(); } return; }
      const [op,...r]=v.split(':'), tag=r.join(':');
      const n=op==='add'?MSDTAGS.addBulk(ids,tag):MSDTAGS.removeBulk(ids,tag);
      toast(op==='add'?`Tagged ${n} product${n===1?'':'s'} "${tag}"`:`Removed "${tag}" from ${n} product${n===1?'':'s'}`); refresh(); };
    const a=bar.querySelector('[data-sbadd]'); if(a)a.onclick=()=>{ picked.forEach(p=>{ if(!MSCAT.distInRange(p.id))MSCAT.distToggle(p.id); }); toast(`Added ${nOut} product${nOut===1?'':'s'} to your range`); refresh(); };
    const r=bar.querySelector('[data-sbrm]'); if(r)r.onclick=()=>{ picked.forEach(p=>{ if(MSCAT.distInRange(p.id))MSCAT.distToggle(p.id); }); toast(`Removed ${nIn} from your range`); refresh(); };
    bar.querySelector('[data-sbclear]').onclick=()=>{ sel.clear(); refresh(); };
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
    /* compact header: title + summary, segmented mode control, actions */
    .sr-hd{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;}
    .sr-hdl{margin-right:auto;min-width:220px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;}
    .sr-hdl h2{font-family:var(--serif);font-weight:500;font-size:21px;margin:0 0 2px;}
    .sr-hdsum{font-size:12.5px;color:var(--ink-3);line-height:1.5;max-width:78ch;}
    .sr-hdsum b{color:var(--ink);font-weight:800;}
    .sr-seg{display:inline-flex;background:var(--paper-2);border-radius:999px;padding:3px;gap:2px;}
    .sr-seg button{font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-3);background:none;border:0;border-radius:999px;padding:7px 14px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,box-shadow .15s;}
    .sr-seg button:not(.on):hover{color:var(--ink);}
    .sr-seg button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);}
    .sr-hdacts{display:flex;gap:8px;}
    @media(max-width:760px){.sr-seg{width:100%;}.sr-seg button{flex:1;}}
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
    .sr-chg{margin-top:16px;}
    .sr-chgall{font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;text-decoration:underline;margin-left:auto;}
    .sr-chgsub{font-size:13px;color:var(--ink-2);margin:0 0 14px;max-width:80ch;}
    .sr-chgrow{display:grid;grid-template-columns:10px 1fr auto;gap:13px;align-items:center;padding:11px 0;border-bottom:1px solid var(--paper-2);}
    .sr-chgrow:last-child{border-bottom:0;}
    .sr-chgdot{width:9px;height:9px;border-radius:50%;background:var(--spearmint,#36C0A0);}
    .sr-chgrow.out .sr-chgdot{background:var(--flare);}
    .sr-chgtx{font-size:13.5px;color:var(--ink-2);}
    .sr-chgtx b{color:var(--ink);}
    .sr-chgmeta{display:block;font-size:11px;color:var(--ink-3);font-weight:600;}
    .sr-chgact{display:flex;align-items:center;gap:9px;}
    .sr-kept{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--green-deep,#1c7a5e);background:var(--tint-green,#e2f6ef);border-radius:999px;padding:3px 10px;}
    .sr-dism{width:24px;height:24px;border:0;background:none;color:var(--ink-3);font-size:16px;line-height:1;cursor:pointer;border-radius:6px;}
    .sr-dism:hover{background:var(--paper-2);color:var(--ink);}
    .sr-tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
    .sr-tbl th{text-align:left;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);padding:9px 10px;border-bottom:1px solid var(--line-soft);}
    .sr-tbl td{padding:11px 10px;border-bottom:1px solid var(--paper-2);}
    .sr-tbl .scell{font-variant-numeric:tabular-nums;}
    .srb-sub{display:block;font-size:11.5px;color:var(--ink-3);}
    .sr-src{font-size:10.5px;font-weight:800;border-radius:6px;padding:2px 8px;}
    .sr-src.cur{background:var(--tint-peri);color:var(--periwinkle-ink,#3C4279);}
    .sr-src.own{background:var(--tint-green);color:#14664a;}
    .sr-src.ov{background:#fdf6e7;color:#9a6b1f;margin-left:5px;}
    .sr-rm{width:30px;height:30px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:16px;line-height:1;color:var(--muted);cursor:pointer;}
    .sr-rm:hover{border-color:var(--flare);color:var(--flare);}
    /* browser */
    .sr-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:200;opacity:0;transition:opacity .2s;}
    .sr-scrim.open{opacity:1;}
    .sr-browser{position:fixed;top:0;right:0;height:100vh;width:min(560px,100%);background:var(--paper);transform:translateX(100%);transition:transform .24s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column;}
    .sr-scrim.open .sr-browser{transform:none;box-shadow:-20px 0 60px rgba(20,22,45,.3);}
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
    /* range table — same vocabulary as the admin product database.
       NB: .statbar/.sb are defined in the admin page's inline <style>, not a shared
       sheet, so they have to be restated here (same as Merchsmith Supplier Portal). */
    .statbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0 6px;}
    .sb{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:16px 18px;}
    .sb b{display:block;font-family:var(--serif);font-weight:500;font-size:26px;line-height:1;}
    .sb span{font-size:12px;color:var(--muted);font-weight:600;}
    .sr-stats{margin:0 0 4px;}
    .sr-stats .sb{padding:14px 16px;}
    .sr-stats .sb b{font-family:var(--serif);font-weight:500;font-size:26px;line-height:1;letter-spacing:-.02em;}
    .sr-stats .sb span{display:block;margin-top:7px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);}
    .sr-supstrip{margin:12px 0 14px;}
    .sr-supline{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:7px;}
    .sr-suplbl{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-right:2px;}
    .sr-sup{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;border-radius:999px;padding:4px 11px;}
    .sr-sup i{font-style:normal;font-size:10.5px;font-weight:800;opacity:.75;}
    .sr-supadd{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;
      color:var(--ink-3);text-decoration:none;border:1px dashed var(--line-soft);
      border-radius:999px;padding:4px 12px;}
    .sr-supadd:hover{color:var(--periwinkle-deep);border-color:var(--periwinkle);border-style:solid;background:var(--tint-peri);}
    .sr-supadd svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;}
    .sr-sup.ok{color:#14664a;background:var(--tint-green,#e2f6ef);}
    .sr-sup.no{color:var(--ink-3);background:var(--paper-2);text-decoration:line-through;cursor:help;}
    button.sr-sup.ok{font-family:inherit;font-size:12px;font-weight:700;line-height:normal;
      border:0;padding:4px 11px;cursor:pointer;}
    button.sr-sup.ok:hover{box-shadow:0 0 0 1.5px var(--spearmint,#36C0A0);}
    button.sr-sup.ok.on{box-shadow:0 0 0 2px #14664a;}
    .sr-scope{font-size:12.5px;color:var(--ink-2);margin:4px 0 0;}
    .sr-locked{background:var(--paper-2);border-radius:12px;padding:12px 15px;font-size:13px;color:var(--ink-2);margin-bottom:14px;}
    .sr-locked b{color:var(--ink);}
    .sr-tools2{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:10px;}
    .sr-tools2 .search{flex:1;min-width:260px;display:flex;align-items:center;gap:8px;border:1.5px solid var(--line-soft);border-radius:11px;padding:8px 12px;background:#fff;}
    .sr-tools2 .search .icn{width:16px;height:16px;stroke:var(--muted);flex:none;}
    .sr-tools2 .search input{border:0;outline:0;font:inherit;font-size:13.5px;width:100%;background:none;}
    .prod-sel{font:inherit;font-size:13px;font-weight:600;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:11px;padding:8px 11px;cursor:pointer;}
    .fbtns{display:flex;background:#fff;border:1.5px solid var(--line-soft);border-radius:11px;overflow:hidden;}
    .fbtn{font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-3);background:none;border:0;padding:8px 13px;cursor:pointer;border-right:1px solid var(--line-soft);}
    .fbtn:last-child{border-right:0;}
    .fbtn:hover{background:var(--paper);color:var(--periwinkle-deep);}
    .fbtn.on{background:var(--periwinkle-deep);color:#fff;}

    /* view toggle — pill track, active state lifts onto a white card (accent icon) */
    .vtoggle{display:inline-flex;align-items:center;gap:2px;background:var(--paper-2);border-radius:999px;padding:3px;}
    .vtoggle button{width:38px;height:32px;display:grid;place-items:center;border:0;background:none;border-radius:999px;cursor:pointer;color:var(--ink-3);transition:background .15s,color .15s,box-shadow .15s;}
    .vtoggle button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
    .vtoggle button:not(.on):hover{color:var(--ink);}
    .vtoggle button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);}
    .sr-chips{display:inline-flex;margin:0 0 10px;}
    .sr-chips.wrap{flex-wrap:wrap;}
    .prodtbl-wrap{background:#fff;border:1px solid var(--line-soft);border-radius:14px;overflow:auto;}
    table.sr-rangetbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;min-width:1580px;}
    .sr-rangetbl thead th{position:sticky;top:0;z-index:2;background:color-mix(in oklab,var(--periwinkle-deep) 18%,#fff);color:var(--ink);text-align:left;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-weight:800;padding:12px 14px;border-bottom:1px solid var(--line-soft);white-space:nowrap;}
    .sr-rangetbl tbody td{padding:10px 14px;border-bottom:1px solid var(--paper-2);color:var(--ink-2);vertical-align:middle;}
    .sr-rangetbl tbody tr:last-child td{border-bottom:0;}
    .sr-rangetbl tbody tr:hover td{background:color-mix(in oklab,var(--periwinkle-deep) 8%,#fff);}
    .sr-rangetbl tbody tr.inrange td{background:rgba(54,192,160,.05);}
    .sr-rangetbl tbody tr.inrange:hover td{background:rgba(54,192,160,.16);}
    .srthumb{width:140px;height:140px;border-radius:12px;font-size:44px;background:#fff;border:1px solid var(--line-soft);flex:none;display:grid;place-items:center;overflow:hidden;font-weight:800;color:var(--muted);}
    .srthumb img{width:100%;height:100%;object-fit:contain;padding:4px;}
    .subcell{display:inline-flex;gap:5px;flex-wrap:wrap;}
    .depttag{display:inline-block;font-size:11px;font-weight:700;color:var(--ink);background:color-mix(in oklab,var(--periwinkle-deep) 22%,#fff);border-radius:7px;padding:3px 9px;cursor:default;}
    .depttag.more{color:var(--muted);}
    .subnone{color:var(--ink-3);font-size:12px;cursor:help;}
    .sr-chips .fbtn i{font-style:normal;font-size:10.5px;font-weight:800;opacity:.65;margin-left:3px;}
    .sr-src.none{background:none;color:var(--ink-3);}
    .sr-poa{color:var(--ink-3);font-weight:700;}
    .sr-actcol{text-align:right;white-space:nowrap;}
    .sr-eye{width:30px;height:30px;vertical-align:middle;margin-left:6px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;cursor:pointer;color:var(--ink-3);display:inline-grid;place-items:center;}
    .sr-eye svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
    .sr-eye:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
    button.sr-gicon{border:0;padding:0;cursor:pointer;}

    /* ---- mode change confirmation ---- */
    .sr-confirm{position:fixed;top:50%;left:50%;transform:translate(-50%,-48%);width:min(460px,calc(100vw - 32px));
      background:#fff;border-radius:18px;padding:26px 28px;box-shadow:0 26px 70px rgba(20,22,45,.3);
      opacity:0;transition:opacity .2s,transform .2s;}
    .sr-scrim.open .sr-confirm{opacity:1;transform:translate(-50%,-50%);}
    .sr-confirm h3{font-family:var(--serif);font-weight:500;font-size:22px;margin:0 0 10px;}
    .sr-confirm p{font-size:13.5px;color:var(--ink-2);line-height:1.6;margin:0 0 11px;}
    .sr-cfwarn{background:#fbeccd;border-radius:11px;padding:12px 14px;color:#6f4d13;}
    .sr-cfwarn b{color:#4a3208;}
    .sr-cfnow{font-size:12.5px;color:var(--ink-3);}
    .sr-cfacts{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;}
    .sr-cfacts .btn:disabled{opacity:.45;cursor:not-allowed;}
    .sr-cftype{display:block;margin-top:16px;}
    .sr-cftype span{display:block;font-size:12.5px;color:var(--ink-2);margin-bottom:6px;}
    .sr-cftype b{color:var(--ink);letter-spacing:.06em;}
    .sr-cftype input{width:100%;font:inherit;font-size:14px;font-weight:700;letter-spacing:.08em;
      border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 12px;background:#fff;}
    .sr-cftype input:focus{outline:0;border-color:var(--periwinkle);}
    .sr-hdacts .btn:disabled{opacity:.5;cursor:not-allowed;}

    /* ---- preview pane ---- */
    .sr-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:150;opacity:0;transition:opacity .2s;}
    .sr-scrim.open{opacity:1;}
    .sr-dr{position:fixed;top:0;right:0;height:100vh;width:min(480px,100%);background:var(--paper);transform:translateX(100%);transition:transform .24s cubic-bezier(.22,.61,.36,1);overflow-y:auto;}
    .sr-scrim.open .sr-dr{transform:none;box-shadow:-20px 0 60px rgba(20,22,45,.3);}
    .sr-drhd{display:flex;align-items:flex-start;gap:13px;padding:18px 22px;border-bottom:1px solid var(--line-soft);background:#fff;position:sticky;top:0;z-index:2;}
    .sr-drthumb{width:60px;height:60px;border-radius:11px;background:var(--paper);border:1px solid var(--line-soft);flex:none;display:grid;place-items:center;overflow:hidden;font-weight:800;color:var(--muted);font-size:20px;}
    .sr-drthumb img{width:100%;height:100%;object-fit:contain;padding:5px;}
    .sr-drtitle{min-width:0;}
    .sr-drtitle h2{font-family:var(--serif);font-weight:500;font-size:19px;margin:0 0 3px;line-height:1.2;}
    .sr-drtitle span{font-size:12px;color:var(--ink-3);font-weight:700;}
    .sr-drnav{display:flex;align-items:center;gap:4px;margin-left:auto;}
    .sr-navbtn{width:26px;height:26px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:14px;line-height:1;color:var(--ink-2);cursor:pointer;}
    .sr-navbtn:disabled{opacity:.35;cursor:default;}
    .sr-navbtn:not(:disabled):hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
    .sr-navct{font-size:10.5px;font-weight:800;color:var(--ink-3);white-space:nowrap;}
    .sr-drx{width:28px;height:28px;border:0;background:none;font-size:21px;line-height:1;color:var(--ink-3);cursor:pointer;}
    .sr-drx:hover{color:var(--flare);}
    .sr-drbody{padding:16px 22px 60px;display:grid;gap:12px;}
    .sr-drstats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
    .sr-drstats .stat{background:#fff;border:1px solid var(--line-soft);border-radius:11px;padding:10px 11px;}
    .sr-drstats .stat b{display:block;font-size:15px;font-weight:800;line-height:1.15;}
    .sr-drstats .stat span{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
    .sr-drsec{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:15px 17px;}
    .sr-drsec.on{border-color:var(--spearmint,#36C0A0);}
    .sr-drsec h4{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px;}
    .sr-drnote{font-size:13px;color:var(--ink-2);line-height:1.5;margin:0 0 11px;}
    .sr-drhint{font-size:12.5px;color:var(--ink-3);line-height:1.5;margin:0;}
    .sr-drdesc{font-size:13px;color:var(--ink-2);line-height:1.6;margin:0;}
    .srb-add.wide{width:100%;justify-content:center;}
    .sr-kv{display:grid;grid-template-columns:auto 1fr;gap:7px 16px;font-size:12.5px;align-items:baseline;}
    .sr-kv .k{color:var(--ink-3);font-weight:700;white-space:nowrap;}
    .sr-kv .v{color:var(--ink);font-weight:700;text-align:right;word-break:break-word;}
    .sr-drtags{margin-bottom:9px;min-height:22px;}
    .sr-drlink{font:inherit;font-size:12.5px;font-weight:800;color:var(--periwinkle-deep);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;}
    .sr-drstore{display:block;text-align:center;font-size:13px;font-weight:800;color:var(--periwinkle-deep);background:#fff;border:1.5px solid var(--line-soft);border-radius:11px;padding:11px;text-decoration:none;}
    .sr-drstore:hover{border-color:var(--periwinkle);}
    .prodtbl-foot{font-size:12.5px;color:var(--ink-3);padding:11px 2px 0;}
    .sr-more{font:inherit;font-size:12.5px;font-weight:800;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;text-decoration:underline;}
    .sr-rangetbl .orgcell{display:flex;align-items:center;gap:14px;}
    .sr-rangetbl .orgcell>span{flex:1 1 auto;min-width:190px;}
    .sr-date{white-space:nowrap;font-size:12px;color:var(--ink-3);}
    .sr-pname{color:var(--ink);font-weight:700;text-decoration:none;display:block;}
    .sr-pname:hover{color:var(--periwinkle-deep);text-decoration:underline;}
    a.srthumb{cursor:pointer;}
    /* gallery */
    .sr-galtools{margin-bottom:10px;}
    .sr-galtools .fbtn{border:1.5px solid var(--line-soft);border-radius:11px;}
    .sr-gal{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;}
    @media(max-width:1050px){.sr-gal{grid-template-columns:repeat(4,minmax(0,1fr));}}
    @media(max-width:860px){.sr-gal{grid-template-columns:repeat(3,minmax(0,1fr));}}
    @media(max-width:660px){.sr-gal{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media(max-width:460px){.sr-gal{grid-template-columns:minmax(0,1fr);}}
    .sr-gcard{position:relative;background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:12px;display:flex;flex-direction:column;}
    .sr-gcard.inrange{border-color:var(--spearmint,#36C0A0);background:rgba(54,192,160,.05);}
    .sr-gchk{position:absolute;top:10px;left:10px;z-index:2;background:#fff;border-radius:6px;padding:2px 3px;line-height:0;box-shadow:0 1px 3px rgba(20,22,45,.14);}
    .sr-gchk input{width:15px;height:15px;cursor:pointer;accent-color:var(--periwinkle-deep);}
    .sr-gimg{aspect-ratio:1;border-radius:10px;background:var(--paper);display:grid;place-items:center;overflow:hidden;font-weight:800;color:var(--muted);font-size:22px;text-decoration:none;}
    .sr-gimg img{width:100%;height:100%;object-fit:contain;padding:10px;}
    .sr-gname{display:block;margin:11px 0 3px;font-size:13.5px;font-weight:700;color:var(--ink);text-decoration:none;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .sr-gname:hover{color:var(--periwinkle-deep);text-decoration:underline;}
    .sr-gsub{font-size:11.5px;color:var(--ink-3);}
    .sr-gfoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:11px;}
    .sr-gfoot b{font-size:13.5px;}
    /* tags: Merchsmith's are read-only (grey), the distributor's own are actionable */
    .tagcell{display:inline-flex;gap:4px;flex-wrap:wrap;align-items:center;}
    .ptagchip{font-size:10.5px;font-weight:700;border-radius:6px;padding:2px 7px;white-space:nowrap;}
    .ptagchip.ms{color:var(--ink-3);background:var(--paper-2);cursor:help;}
    .ptagchip.mine{color:var(--periwinkle-ink,#3C4279);background:var(--tint-peri);}
    .tagbtn{font:inherit;font-size:10.5px;font-weight:800;color:var(--ink-3);background:none;border:1px dashed var(--line-soft);border-radius:6px;padding:2px 7px;cursor:pointer;}
    .tagbtn:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);border-style:solid;}
    .sr-gtags{margin-top:7px;}
    .tagpop{position:absolute;z-index:300;background:#fff;border:1px solid var(--line-soft);border-radius:11px;box-shadow:0 14px 36px rgba(20,22,45,.2);padding:7px;min-width:190px;}
    .tagpop-h{font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding:5px 9px 7px;}
    .tagpop-o{display:block;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--ink);padding:7px 9px;border-radius:7px;cursor:pointer;}
    .tagpop-o:hover{background:var(--paper);}
    .tagpop-o.on{background:var(--tint-peri);color:var(--periwinkle-deep);font-weight:800;}
    .tagpop-o.on::after{content:" ✓";}
    .tagpop-e{font-size:12px;color:var(--muted);padding:4px 9px;margin:0;}
    .tagpop-new{display:block;width:100%;text-align:left;border:0;border-top:1px solid var(--paper-2);margin-top:5px;padding:8px 9px 4px;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;}
    .bm-add{display:flex;gap:8px;margin:12px 0;}
    .bm-add input{flex:1;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 11px;}
    .bm-list{display:flex;flex-direction:column;gap:7px;}
    .bm-row{display:flex;align-items:center;gap:9px;}
    .bm-name{flex:1;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;}
    .bm-ct{font-size:11.5px;color:var(--ink-3);font-weight:700;white-space:nowrap;}
    .bm-del{width:28px;height:28px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;color:var(--muted);font-size:15px;line-height:1;cursor:pointer;flex:none;}
    .bm-del:hover{border-color:var(--flare);color:var(--flare);}
    .bulkacts{flex-wrap:wrap;min-width:0;}
    .bulkbar{flex-wrap:wrap;min-width:0;}
    .bulkbar[hidden]{display:none;}
    .prod-sel.sm{font-size:12px;padding:6px 9px;max-width:190px;}
    /* grouping */
    .sr-grouprow td{padding:0!important;background:var(--paper)!important;border-bottom:1px solid var(--line-soft)!important;}
    .sr-ghd{margin:14px 0 8px;}
    .sr-gtoggle{display:flex;align-items:center;gap:8px;width:100%;font:inherit;font-size:12.5px;font-weight:800;
      color:var(--ink);background:none;border:0;padding:9px 14px;cursor:pointer;text-align:left;}
    .sr-gtoggle em{font-style:normal;font-size:11px;font-weight:800;color:var(--ink);
      background:color-mix(in oklab,var(--periwinkle-deep) 22%,#fff);border-radius:999px;padding:2px 9px;}
    .sr-gtoggle .gcar{transition:transform .15s;display:inline-block;}
    .sr-gtoggle.off .gcar{transform:rotate(-90deg);}
    /* clear all */
    .sr-chiprow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
    .sr-chiprow .vtoggle{margin-left:auto;}
    .sr-clear{font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;}
    .sr-clear:hover{color:var(--flare);}
    /* supplier product code under the name */
    .sr-pref{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--ink-3);margin-top:2px;}
    /* gallery hover: open in store */
    .sr-gimg{position:relative;}
    .sr-gacts{position:absolute;right:8px;bottom:8px;opacity:0;transition:opacity .15s;}
    .sr-gcard:hover .sr-gacts{opacity:1;}
    .sr-gicon{width:28px;height:28px;display:grid;place-items:center;background:#fff;border:1px solid var(--line-soft);
      border-radius:8px;color:var(--ink-3);box-shadow:0 1px 4px rgba(20,22,45,.12);}
    .sr-gcard:hover .sr-gicon{color:var(--periwinkle-deep);border-color:var(--periwinkle);}
    .sr-gicon svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
    `;
    document.head.appendChild(st);
  })();

  let inited=false;
  function init(){ if(inited)return; inited=true; render(); }
  // render when the Store range tab is opened
  document.addEventListener('click',e=>{ if(e.target.closest('.settab[data-panel="storerange"]')) setTimeout(init,0); });
  window.MSDistRange={ render };
})();
