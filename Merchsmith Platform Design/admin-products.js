/* ============================================================
   admin-products.js — Merchsmith master product DATABASE view.
   Reads the shared catalogue (window.MSCAT). Browse every
   supplier's products in one place, see usage data, and see /
   toggle Recommended-range membership. Renders into #panel-products.
   ============================================================ */
(function(){
  if(!window.MSCAT) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const gbp0=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();
  // Two placement tiers only. Fees are defaults for newly-added products; the charge on any
  // individual product is editable per-product on the Recommended range panel.
  // Two tiers, one monthly fee each. Rates are global and set on the Recommended range
  // panel, so they are read live rather than baked in here.
  const TIERLBL={standard:'Recommended',featured:'Featured'};
  const TIERS=()=>{ const r=MSCAT.curRates(); return [['standard','Recommended',r.standard],['featured','Featured',r.featured]]; };

  let filt={q:'',supplier:'',dept:'',sub:'',brand:'',tag:'',colour:'',view:'',img:'',comp:'',sort:'name',dir:1};
  // persisted table prefs (columns / density / page size)
  const PREFKEY='ms-prodtbl';
  function pref(){ try{ return JSON.parse(localStorage.getItem(PREFKEY)||'{}')||{}; }catch(e){ return {}; } }
  function setPref(patch){ const o=Object.assign(pref(),patch); try{ localStorage.setItem(PREFKEY, JSON.stringify(o)); }catch(e){} }
  let hiddenCols=new Set(pref().hidden||[]);
  let density=pref().density||'comfy';
  let page=1, perPage=pref().perPage||100;   // pagination
  let lastRowIds=[], shownIds=[];   // full filtered set + current page (for select-all)
  let lastChkIdx=null;              // shift-click range anchor
  const sel=new Set();
  let viewMode=pref().viewMode||'gallery';   // 'gallery' | 'table'
  let groupBy=pref().groupBy||'';            // '' | 'supplier' | 'dept'
  let collapsed=new Set(pref().collapsed||[]);
  let cursor=-1;                             // keyboard-triage cursor into shownIds

  /* ---------- data completeness ----------
     PRODUCT DATA only — the fields a supplier feed is responsible for. Filing a
     product into a store sub-category is a store-layout job, not a data gap, so
     it is kept OUT of the score and offered as its own "Not filed" view instead
     (including it meant nothing in the catalogue could ever read as complete). */
  const COMP=[
    ['image','Image',p=>!!p.image],
    ['price','Price',p=>!!p.priceFrom],
    ['desc','Description',p=>!!(p.desc||p.blurb||p.description)],
    ['branding','Branding data',p=>!!(p.methods&&p.methods.length)],
    ['sub','Sub-category',p=>!!(window.MSSTORE&&MSSTORE.subcatsForProduct(p.id).length)],
  ];
  const compParts=p=>COMP.map(([k,label,fn])=>({k,label,ok:!!fn(p)}));
  const compScore=p=>compParts(p).filter(x=>x.ok).length;
  function compDots(p){
    const parts=compParts(p), n=parts.filter(x=>x.ok).length;
    const tip=parts.map(x=>(x.ok?'\u2713 ':'\u2717 ')+x.label).join(' \u00b7 ');
    return `<span class="compdots ${n===COMP.length?'full':(n<=1?'low':'')}" title="${esc(tip)}">${parts.map(x=>`<i class="${x.ok?'on':''}"></i>`).join('')}<b>${n}/${COMP.length}</b></span>`;
  }

  /* ---------- saved views ---------- */
  const VIEWSKEY='ms-prodviews';
  const FILTKEYS=['q','supplier','dept','sub','brand','tag','colour','view','img','comp'];
  function savedViews(){ try{ return JSON.parse(localStorage.getItem(VIEWSKEY)||'[]')||[]; }catch(e){ return []; } }
  function setSavedViews(v){ try{ localStorage.setItem(VIEWSKEY,JSON.stringify(v)); }catch(e){} }
  const PRESETS=[
    {id:'p-noprice',name:'No price',f:{comp:'noprice'}},
    {id:'p-listable',name:'Listable',f:{comp:'listable'}},
    {id:'p-unlistable',name:'Unlistable',f:{comp:'unlistable'}},
  ];
  function applyView(f){ FILTKEYS.forEach(k=>filt[k]=''); Object.keys(f||{}).forEach(k=>filt[k]=f[k]); page=1; cursor=-1; render(); }
  // hideable columns (Product, checkbox and actions are always shown)
  const COLS=[
    {k:'supplier',label:'Supplier',sort:'supplier',cell:p=>`<button class="suplink" data-supname="${esc(p.supplier)}" onclick="event.stopPropagation()" title="Open ${esc(p.supplier)}">${esc(p.supplier)}</button>`},
    {k:'dept',label:'Dept',sort:'dept',cell:p=>`<span class="deptpill">${p.dept}</span>`},
    {k:'sub',label:'Sub-categories',cell:p=>subcatCell(p)},
    {k:'brand',label:'Brand',sort:'brand',cell:p=>{const b=window.MSBRANDS?MSBRANDS.brandOf(p.id):'';return b?`<span class="brandtag">${esc(b)}</span>`:'<span class="prod-never">—</span>';}},
    {k:'tags',label:'Tags',cell:p=>{ const t=window.MSTAGS?MSTAGS.tagsOf(p.id):[];
      if(!t.length) return '<span class="prod-never">—</span>';
      return `<span class="tagcell">${t.slice(0,2).map(x=>`<span class="ptagchip">${esc(x)}</span>`).join('')}${t.length>2?`<span class="ptagchip more">+${t.length-2}</span>`:''}</span>`; }},
    {k:'complete',label:'Data',sort:'complete',cls:'scell',cell:p=>compDots(p)},
    {k:'price',label:'From',sort:'price',cls:'scell',cell:p=>`<b>${p.priceFrom?gbp(p.priceFrom):'<span class="prod-never">POA</span>'}</b>`},
    {k:'moq',label:'MOQ',sort:'moq',cls:'scell',cell:p=>p.moq?p.moq.toLocaleString():'—'},
    {k:'lead',label:'Lead',sort:'lead',cls:'scell',cell:p=>p.lead?p.lead+'d':'—'},
    {k:'eco',label:'Eco',sort:'eco',cls:'scell',cell:p=>`<span class="ecobadge ${p.sustainability>=8?'hi':p.sustainability<=5?'lo':''}">♻ ${p.sustainability}</span>`},
    {k:'usage',label:'Used in',sort:'usage',cls:'scell',cell:p=>p.usage.projects?`<span class="usecell"><b>${p.usage.units.toLocaleString()}</b><span>${p.usage.projects} proj · ${p.usage.orders} ord</span></span>`:'<span class="prod-never">never</span>'},
    {k:'created',label:'Created',sort:'created',cls:'scell datecell',cell:p=>fmtD(p.created)},
    {k:'imported',label:'Imported',sort:'imported',cls:'scell datecell',cell:p=>p.imported?fmtD(p.imported):'<span class="prod-never">—</span>'},
    {k:'curated',label:'Recommended',sort:'curated',cell:p=>p.curated
      ?`<span class="curcell"><select class="curtier-tbl ${p.promoted?'promo':''}" data-tblcurtier="${p.id}" onclick="event.stopPropagation()">${Object.keys(TIERLBL).map(v=>`<option value="${v}" ${ (p.curation&&p.curation.tier)===v?'selected':''}>${TIERLBL[v]}</option>`).join('')}</select><button class="curq rm" data-tblcurrm="${p.id}" onclick="event.stopPropagation()" title="Remove from curated range">×</button></span>`
      :`<button class="curq add" data-tblcuradd="${p.id}" onclick="event.stopPropagation()">＋ Add</button>`}
  ];
  const visCols=()=>COLS.filter(c=>!hiddenCols.has(c.k));
  function panel(){ return document.getElementById('panel-products'); }

  function render(){
    const p=panel(); if(!p) return;
    const st=MSCAT.stats(); const rev=MSCAT.curatedRevenue();
    p.innerHTML=`
      <div class="phead"><h1 class="ptitle">Product database</h1><div class="phead-acts"><a class="btn ghost" href="Merchsmith Store.html?store=merchsmith" title="The Recommended range as distributors on Recommended mode receive it">View default store ↗</a><button class="btn ghost" id="prodBrands">Manage brands</button><button class="btn ghost" id="prodTags">Manage tags</button><button class="btn" id="prodImport">＋ Import from feed</button></div></div>
      <div class="statbar">
        <div class="sb" data-v=""><b>${st.products.toLocaleString()}</b><span>Products</span></div>
        <div class="sb" data-v=""><b>${st.suppliers}</b><span>Suppliers</span></div>
        <div class="sb pv" data-v="curated"><b>${st.curated.toLocaleString()}</b><span>In recommended range</span></div>
        <div class="sb pv" data-v="promoted"><b>${st.promoted.toLocaleString()}</b><span>Featured</span></div>
        <div class="sb" title="Phase 2 — placement billing is not live. Recommended and Featured are free during MVP."><b>${gbp0(rev.total)}</b><span>Projected rev / mo <i style="font-style:normal;display:block;margin-top:2px;font-size:9.5px;letter-spacing:.06em;color:var(--periwinkle-deep)">Phase 2</i></span></div>
      </div>
      <div class="toolbar">
        <div class="search"><svg class="icn"><use href="#a-search"/></svg><input id="prodSearch" placeholder="Search by name, SKU code, supplier…" value="${esc(filt.q)}"></div>
        <select class="prod-sel" id="prodSup"><option value="">All suppliers</option>${MSCAT.suppliers().map(s=>`<option value="${esc(s.name)}" ${filt.supplier===s.name?'selected':''}>${esc(s.name)} (${s.count})</option>`).join('')}</select>
        <select class="prod-sel" id="prodDept"><option value="">All departments</option>${MSCAT.depts().map(d=>`<option value="${d}" ${filt.dept===d?'selected':''}>${d}</option>`).join('')}</select>
        <select class="prod-sel" id="prodSub"><option value="">All sub-categories</option>${(window.MSSTORE?MSSTORE.departments():[]).map(d=>{const subs=MSSTORE.subcatsOf(d.id);return subs.length?`<optgroup label="${esc(d.name)}">${subs.map(s=>`<option value="${d.id}:${s.id}" ${filt.sub===d.id+':'+s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</optgroup>`:'';}).join('')}</select>
        <select class="prod-sel" id="prodBrand"><option value="">All brands</option><option value="__none" ${filt.brand==='__none'?'selected':''}>— Untagged —</option>${(window.MSBRANDS?MSBRANDS.list():[]).map(b=>`<option ${filt.brand===b?'selected':''}>${esc(b)}</option>`).join('')}</select>
        <select class="prod-sel" id="prodTag"><option value="">All tags</option><option value="__none" ${filt.tag==='__none'?'selected':''}>— Untagged —</option>${(function(){
          if(!window.MSTAGS) return ''; const c=MSTAGS.counts();
          return MSTAGS.list().map(t=>`<option value="${esc(t)}" ${filt.tag===t?'selected':''}>${esc(t)} (${c[t]||0})</option>`).join('');
        })()}</select>
        <select class="prod-sel" id="prodColour"><option value="">All colours</option>${(function(){
          if(!window.MSCOLOUR) return '';
          const counts={}; MSCAT.all().forEach(p=>baseColoursOf(p).forEach(b=>{ counts[b]=(counts[b]||0)+1; }));
          return MSCOLOUR.BASE.filter(b=>counts[b.name]).map(b=>`<option value="${esc(b.name)}" ${filt.colour===b.name?'selected':''}>${esc(b.name)} (${counts[b.name].toLocaleString()})</option>`).join('');
        })()}</select>
        <div class="fbtns" id="prodViews">
          <button class="fbtn ${filt.view===''?'on':''}" data-v="">All</button>
          <button class="fbtn ${filt.view==='curated'?'on':''}" data-v="curated">Recommended</button>
          <button class="fbtn ${filt.view==='promoted'?'on':''}" data-v="promoted">Featured</button>
        </div>
        <select class="prod-sel" id="prodGroup" title="Group products">
          <option value="" ${groupBy===''?'selected':''}>No grouping</option>
          <option value="supplier" ${groupBy==='supplier'?'selected':''}>Group by supplier</option>
          <option value="sub" ${groupBy==='sub'?'selected':''}>Group by sub-category</option>
        </select>
        <select class="prod-sel" id="prodSort" title="Sort">
          ${[['name','Name'],['complete','Data completeness'],['price','Price'],['moq','MOQ'],['lead','Lead time'],['eco','Eco score'],['usage','Usage'],['supplier','Supplier'],['created','Created'],['imported','Imported'],['curated','Recommended tier']].map(([k,l])=>`<option value="${k}" ${filt.sort===k?'selected':''}>${l} ${filt.sort===k?(filt.dir>0?'↑':'↓'):''}</option>`).join('')}
        </select>
        <div class="fbtns">
          <button class="fbtn" id="prodCols" ${viewMode==='gallery'?'hidden':''}>Columns ▾</button>
          <button class="fbtn" id="prodKeys" title="Keyboard shortcuts">⌨</button>
        </div>
      </div>
      <div class="savedviews" id="prodSaved"></div>
      <div id="prodChips">${chipsHtml()}</div>
      <div id="prodBulk" class="bulkbar" hidden></div>
      ${viewMode==='gallery'
        ? `<div class="prodgal-wrap" id="prodGrid"></div>`
        : `<div class="prodtbl-wrap"><table class="dirtable prodtbl"><thead><tr>
        <th class="chkcol"><input type="checkbox" id="prodChkAll" aria-label="Select all"></th>
        <th class="sortable" data-sort="name">Product</th>
        ${visCols().map(c=>`<th class="${c.sort?'sortable ':''}${c.cls||''}" ${c.sort?`data-sort="${c.sort}"`:''}>${c.label}</th>`).join('')}
        <th></th>
      </tr></thead><tbody id="prodRows"></tbody></table></div>`}
      <div class="prodtbl-foot" id="prodFoot"></div>`;
    renderRows();
    p.querySelector('#prodSearch').oninput=e=>{ filt.q=e.target.value; page=1; renderRows(); };
    p.querySelector('#prodSup').onchange=e=>{ filt.supplier=e.target.value; page=1; renderRows(); };
    p.querySelector('#prodDept').onchange=e=>{ filt.dept=e.target.value; page=1; renderRows(); };
    { const tg=p.querySelector('#prodTag'); if(tg)tg.onchange=e=>{ filt.tag=e.target.value; page=1; renderRows(); }; }
    { const cl=p.querySelector('#prodColour'); if(cl)cl.onchange=e=>{ filt.colour=e.target.value; page=1; renderRows(); }; }
    const sub=p.querySelector('#prodSub'); if(sub)sub.onchange=e=>{ filt.sub=e.target.value; page=1; renderRows(); };
    const br=p.querySelector('#prodBrand'); if(br)br.onchange=e=>{ filt.brand=e.target.value; page=1; renderRows(); };
    p.querySelectorAll('#prodViews .fbtn').forEach(b=>b.onclick=()=>{ filt.view=b.dataset.v; page=1; render(); });
    p.querySelectorAll('#prodImgViews .fbtn').forEach(b=>b.onclick=()=>{ filt.img=(filt.img===b.dataset.img?'':b.dataset.img); page=1; render(); });
    p.querySelectorAll('.statbar .pv').forEach(b=>b.onclick=()=>{ filt.view=b.dataset.v; page=1; render(); });
    p.querySelectorAll('.prodtbl th.sortable').forEach(th=>{ const k=th.dataset.sort; if(k===filt.sort) th.classList.add('sorted-'+(filt.dir>0?'asc':'desc')); th.onclick=()=>{ if(filt.sort===k) filt.dir=-filt.dir; else { filt.sort=k; filt.dir=1; } page=1; render(); }; });
    const imp=p.querySelector('#prodImport'); if(imp)imp.onclick=()=>{ if(window.MSImport)MSImport.open(); };
    const mb=p.querySelector('#prodBrands'); if(mb)mb.onclick=openBrandManager;
    const mt=p.querySelector('#prodTags'); if(mt)mt.onclick=openTagManager;
    // pinned header: position:sticky on table cells is broken in some Chromium builds,
    // so we pin by translating the thead with the wrap's scroll offset (works everywhere)
    const wrapEl=p.querySelector('.prodtbl-wrap'), theadEl=p.querySelector('.prodtbl thead');
    if(wrapEl&&theadEl) wrapEl.onscroll=()=>{ theadEl.style.transform='translateY('+wrapEl.scrollTop+'px)'; };
    const cbtn=p.querySelector('#prodCols'); if(cbtn)cbtn.onclick=e=>{ e.stopPropagation(); openColMenu(); };
    const gsel=p.querySelector('#prodGroup'); if(gsel)gsel.onchange=()=>{ groupBy=gsel.value; setPref({groupBy}); collapsed.clear(); setPref({collapsed:[]}); render(); };
    const ssel=p.querySelector('#prodSort'); if(ssel)ssel.onchange=()=>{ if(filt.sort===ssel.value) filt.dir=-filt.dir; else { filt.sort=ssel.value; filt.dir=(ssel.value==='complete'?1:1); } page=1; render(); };
    const kb=p.querySelector('#prodKeys'); if(kb)kb.onclick=openKeyHelp;
    p.querySelectorAll('[data-dhview]').forEach(b=>b.onclick=()=>applyView({comp:b.dataset.dhview}));
    renderSaved();
    p.querySelectorAll('[data-chip]').forEach(b=>{}); // (chip clicks are delegated below)
    const chipBox=p.querySelector('#prodChips');
    if(chipBox) chipBox.onclick=e=>{ const b=e.target.closest('[data-chip]'); if(!b) return; const k=b.dataset.chip; if(k==='all'){ FILTKEYS.forEach(x=>filt[x]=''); } else filt[k]=''; page=1; cursor=-1; render(); };
    const nav=document.getElementById('navProd'); if(nav) nav.textContent=st.products>999?'1k+':st.products;
  }
  function chipsHtml(){
    const VIEWLBL={curated:'Recommended',promoted:'Featured',unused:'Never used'};
    const chips=[];
    if(filt.q)chips.push(['q','“'+esc(filt.q)+'”']);
    if(filt.supplier)chips.push(['supplier',esc(filt.supplier)]);
    if(filt.dept)chips.push(['dept',esc(filt.dept)]);
    if(filt.sub&&window.MSSTORE){ const [did,sid]=filt.sub.split(':'); const s=MSSTORE.subcatsOf(did).find(x=>x.id===sid); chips.push(['sub',esc(s?s.name:'Sub-category')]); }
    if(filt.brand)chips.push(['brand',filt.brand==='__none'?'Untagged':esc(filt.brand)]);
    if(filt.tag)chips.push(['tag',filt.tag==='__none'?'No tags':esc(filt.tag)]);
    if(filt.colour)chips.push(['colour',esc(filt.colour)]);
    if(filt.view)chips.push(['view',VIEWLBL[filt.view]||filt.view]);
    if(filt.img)chips.push(['img',filt.img==='yes'?'With image':'No image']);
    if(filt.comp)chips.push(['comp',{incomplete:'Incomplete data',complete:'Full data',thin:'Thin data (≤2/4)',rich:'Best data (≥3/4)',noprice:'No price',nolist:'Not listable',nosub:'No sub-category',nodesc:'No description',nobrand:'No branding data',listable:'Listable',unlistable:'Unlistable'}[filt.comp]||filt.comp]);
    if(!chips.length) return '';
    return `<div class="fchips">${chips.map(([k,l])=>`<button class="fchip" data-chip="${k}">${l}<b>×</b></button>`).join('')}${chips.length>1?'<button class="fchip clearall" data-chip="all">Clear all</button>':''}</div>`;
  }
  function openColMenu(){
    let m=document.getElementById('colMenu'); if(m){ m.remove(); return; }
    m=document.createElement('div'); m.id='colMenu'; m.className='colmenu';
    m.innerHTML=`<div class="colmenu-hd">Show columns</div>`+COLS.map(c=>`<label><input type="checkbox" data-col="${c.k}" ${hiddenCols.has(c.k)?'':'checked'}>${c.label}</label>`).join('')+`<button class="colreset" id="colReset">Show all</button>`;
    document.body.appendChild(m);
    const btn=document.getElementById('prodCols'); const r=btn.getBoundingClientRect();
    m.style.top=(r.bottom+6)+'px'; m.style.left=Math.max(10,Math.min(r.left, innerWidth-m.offsetWidth-10))+'px';
    m.querySelectorAll('[data-col]').forEach(cb=>cb.onchange=()=>{ if(cb.checked)hiddenCols.delete(cb.dataset.col); else hiddenCols.add(cb.dataset.col); setPref({hidden:[...hiddenCols]}); const mm=document.getElementById('colMenu'); if(mm)mm.remove(); render(); openColMenu(); });
    m.querySelector('#colReset').onclick=()=>{ hiddenCols.clear(); setPref({hidden:[]}); const mm=document.getElementById('colMenu'); if(mm)mm.remove(); render(); openColMenu(); };
    setTimeout(()=>{ const close=e=>{ if(!m.contains(e.target)&&e.target.id!=='prodCols'){ m.remove(); document.removeEventListener('click',close,true); } }; document.addEventListener('click',close,true); },0);
  }
  function match(p){
    if(filt.supplier&&p.supplier!==filt.supplier) return false;
    if(filt.dept&&p.dept!==filt.dept) return false;
    if(filt.sub&&window.MSSTORE){ const subId=filt.sub.split(':')[1]; if(!MSSTORE.subcatsForProduct(p.id).includes(subId)) return false; }
    if(filt.colour&&baseColoursOf(p).indexOf(filt.colour)<0) return false;
    if(filt.tag&&window.MSTAGS){ const ts=MSTAGS.tagsOf(p.id);
      if(filt.tag==='__none'){ if(ts.length) return false; } else if(ts.indexOf(filt.tag)<0) return false; }
    if(filt.brand&&window.MSBRANDS){ const b=MSBRANDS.brandOf(p.id); if(filt.brand==='__none'){ if(b) return false; } else if(b!==filt.brand) return false; }
    if(filt.img==='yes'&&!p.image) return false;
    if(filt.img==='no'&&p.image) return false;
    if(filt.view==='curated'&&!p.curated) return false;
    if(filt.view==='promoted'&&!p.promoted) return false;
    if(filt.view==='archived') { /* pool is already the archive */ }
    if(filt.view==='unused'&&p.usage.projects>0) return false;
    if(filt.comp==='incomplete'&&compScore(p)===COMP.length) return false;
    if(filt.comp==='complete'&&compScore(p)!==COMP.length) return false;
    if(filt.comp==='thin'&&compScore(p)>2) return false;
    if(filt.comp==='rich'&&compScore(p)<3) return false;
    if(filt.comp==='noprice'&&p.priceFrom) return false;
    if(filt.comp==='nolist'&&(p.image&&p.priceFrom)) return false;
    if(filt.comp==='listable'&&compScore(p)!==COMP.length) return false;
    if(filt.comp==='unlistable'&&compScore(p)===COMP.length) return false;
    if(filt.comp==='nodesc'&&(p.desc||p.blurb||p.description)) return false;
    if(filt.comp==='nobrand'&&(p.methods&&p.methods.length)) return false;
    if(filt.comp==='nosub'&&!(window.MSSTORE&&!MSSTORE.subcatsForProduct(p.id).length)) return false;
    if(filt.q){ const q=filt.q.toLowerCase(); if(!(p.name.toLowerCase().includes(q)||p.supplier.toLowerCase().includes(q)||String(p.code||'').toLowerCase().includes(q)||String(p.ean||'').toLowerCase().includes(q)||String(p.id||'').toLowerCase().includes(q))) return false; }
    return true;
  }
  const COLHEX={Black:'#1a1a1e',White:'#f4f4f0',Navy:'#2a3550',Grey:'#8a8a93',Natural:'#d8c3a0',Green:'#3a9d6b','Forest Green':'#2f6f4e','Sky Blue':'#7fb5e6',Burgundy:'#7a2233',Sand:'#d8c8a8',Charcoal:'#3a3a40',Blue:'#2f5ca8',Red:'#c0392b',Pink:'#e2a9ac',Yellow:'#e8c63a',Orange:'#e08a3a',Brown:'#7a5230',Purple:'#7a5ba8'};
  const DEPTID3={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
  function fmtD(iso){ if(!iso) return '<span class="prod-never">—</span>'; const d=new Date(iso+'T00:00'); const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${d.getDate()} ${mon[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; }
  function sortVal(p,k){ switch(k){ case 'name':return p.name.toLowerCase(); case 'supplier':return p.supplier.toLowerCase(); case 'dept':return p.dept; case 'brand':return (window.MSBRANDS?MSBRANDS.brandOf(p.id):'').toLowerCase(); case 'price':return p.priceFrom||0; case 'moq':return p.moq||0; case 'lead':return p.lead||0; case 'eco':return p.sustainability||0; case 'usage':return p.usage.units||0; case 'created':return p.created||''; case 'imported':return p.imported||''; case 'curated':return p.curated?(p.promoted?2:1):0; default:return 0; } }
  const baseColoursOf=p=>{ if(!window.MSCOLOUR) return [];
    const out=[]; (p.colours||[]).forEach(c=>{ const n=(typeof c==='string')?c:(c&&(c.name||c.base))||'';
      const b=MSCOLOUR.map(n); if(b&&out.indexOf(b)<0) out.push(b); }); return out; };
  function colourDots(p){ const cols=(p.colours||[]).slice(0,5); if(!cols.length) return '<span class="prod-never">—</span>';
    const nm=c=>typeof c==='string'?c:(c&&(c.name||c.base))||''; const hx=c=>{ if(c&&typeof c==='object'&&c.hex) return '#'+String(c.hex).replace(/^#/,''); const n=nm(c); return COLHEX[n]||'#bbb'; };
    const title=(p.colours||[]).map(nm).filter(Boolean).join(', ');
    return `<span class="cdots" title="${esc(title)}">${cols.map(c=>{ const h=hx(c); return `<i style="background:${h}${h.toUpperCase()==='#F4F4F0'||h.toUpperCase()==='#FFFFFF'?';box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)':''}"></i>`; }).join('')}${(p.colours||[]).length>5?`<em>+${(p.colours||[]).length-5}</em>`:''}</span>`; }
  function subcatCell(p){ if(!window.MSSTORE)return '<span class="prod-never">—</span>'; const did=DEPTID3[p.dept]||(p.dept||'').toLowerCase(); const ids=MSSTORE.subcatsForProduct(p.id); if(!ids.length) return '<span class="prod-never">—</span>'; const subs=MSSTORE.subcatsOf(did); const names=ids.map(id=>{const s=subs.find(x=>x.id===id);return s?s.name:null;}).filter(Boolean); return `<span class="subcell">${names.slice(0,2).map(n=>`<span class="subpill">${esc(n)}</span>`).join('')}${names.length>2?`<span class="subpill more">+${names.length-2}</span>`:''}</span>`; }
  // Manual lazy-load for the product-table thumbnails. Native loading="lazy"
  // AND IntersectionObserver both misbehave in the admin's nested-iframe /
  // panel scroll context (callbacks never fire → thumbnails stay blank). So we
  // drive it ourselves off scroll + getBoundingClientRect, which is reliable
  // everywhere. Loads only rows near the viewport instead of all 200 external
  // images at once — the fix for slow Products-panel loads.
  let _lazyScope=null, _lazyLast=0, _lazyTimer=null, _lazyBound=false;
  function _lazyCheck(){
    _lazyLast=Date.now();
    if(!_lazyScope || !document.body.contains(_lazyScope)) return;
    // Don't run when the Products panel isn't visible — otherwise every hidden
    // row reports a zero-rect (reads as "in view") and we'd fire all 200 image
    // loads at once on any scroll from another page (Settings etc) → freeze.
    const panel=_lazyScope.closest('.panel'); if(panel && !panel.classList.contains('active')) return;
    if(!_lazyScope.getClientRects().length) return;
    const vh=window.innerHeight||document.documentElement.clientHeight||800; const M=600;
    const imgs=_lazyScope.querySelectorAll('img[data-src]');
    if(!imgs.length) return;
    imgs.forEach(im=>{ const r=im.getBoundingClientRect(); if((r.width||r.height) && r.bottom>-M && r.top<vh+M){ im.src=im.dataset.src; im.removeAttribute('data-src'); } });
  }
  // time-throttled (NOT rAF — rAF is suspended in background iframes, so the
  // check would never run when the tab/preview isn't focused)
  function _lazySchedule(){
    const now=Date.now();
    if(now-_lazyLast>=90){ _lazyCheck(); }
    else { clearTimeout(_lazyTimer); _lazyTimer=setTimeout(_lazyCheck, 90); }
  }
  function lazyThumbs(scope){
    _lazyScope=scope;
    const imgs=[...scope.querySelectorAll('img[data-src]')];
    if(!imgs.length) return;
    if(!_lazyBound){
      // capture:true catches scrolls from the window or any inner scroller
      window.addEventListener('scroll', _lazySchedule, {passive:true, capture:true});
      window.addEventListener('resize', _lazySchedule, {passive:true});
      _lazyBound=true;
    }
    // initial passes as layout settles
    _lazyCheck(); setTimeout(_lazyCheck, 160); setTimeout(_lazyCheck, 500);
  }
  function rowHTML(p){
    return `<tr data-prod="${p.id}">
      <td class="chkcol"><input type="checkbox" class="prodchk" data-chk="${p.id}" ${sel.has(p.id)?'checked':''}></td>
      <td><div class="orgcell"><div class="prodthumb" data-zoom="${p.image?esc(p.image):''}">${p.image?`<img data-src="${esc(p.image)}" alt="" decoding="async" onerror="this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div><div><b><a class="prodlink" href="Merchsmith Store.html?store=merchsmith#product=${encodeURIComponent(p.id)}" onclick="event.stopPropagation()" title="Open “${esc(p.name)}” in the store">${esc(p.name)}</a></b>${p.code?`<span class="prodref">${esc(p.code)}</span>`:''}<span>${colourDots(p)}${p.real?' <em class="livetag">live</em>':''}</span></div></div></td>
      ${visCols().map(c=>`<td class="${c.cls||''}">${c.cell(p)}</td>`).join('')}
      <td><div class="rowact"><a class="iconbtn" href="Merchsmith Store.html?store=merchsmith#product=${encodeURIComponent(p.id)}" title="Open in store" onclick="event.stopPropagation()"><svg class="icn"><use href="#a-external"/></svg></a><button class="iconbtn" data-viewprod="${p.id}" title="Quick view"><svg class="icn"><use href="#a-eye"/></svg></button></div></td>
    </tr>`;
  }
  const curatedCell=p=>COLS.find(c=>c.k==='curated').cell(p);
  function cardHTML(p){
    const b=window.MSBRANDS?MSBRANDS.brandOf(p.id):'';
    return `<div class="pgcard ${sel.has(p.id)?'sel':''}" data-prod="${p.id}">
      <label class="pgchk" onclick="event.stopPropagation()"><input type="checkbox" class="prodchk" data-chk="${p.id}" ${sel.has(p.id)?'checked':''}></label>
      ${p.real?'<span class="pgtag livetag">live</span>':''}
      <div class="pgimg"><span class="pgacts" onclick="event.stopPropagation()">
        <button class="iconbtn" data-viewprod="${p.id}" title="Quick view"><svg class="icn"><use href="#a-eye"/></svg></button>
        <a class="iconbtn" href="Merchsmith Store.html?store=merchsmith#product=${encodeURIComponent(p.id)}" title="Open in store" onclick="event.stopPropagation()"><svg class="icn"><use href="#a-external"/></svg></a>
      </span>${p.image?`<img data-src="${esc(p.image)}" alt="" decoding="async" onerror="this.parentNode.innerHTML='<span class=&quot;pgnone&quot;>Image failed</span>'">`:'<span class="pgnone">No image</span>'}</div>
      <div class="pgbody">
        <a class="pgname" href="Merchsmith Store.html?store=merchsmith#product=${encodeURIComponent(p.id)}" onclick="event.stopPropagation()" title="Open “${esc(p.name)}” in the store">${esc(p.name)}</a>
        <div class="pgmeta"><span class="pgsup">${esc(p.supplier)}</span>${b?`<span class="brandtag">${esc(b)}</span>`:''}${(function(){
          const t=window.MSTAGS?MSTAGS.tagsOf(p.id):[]; if(!t.length) return '';
          return t.slice(0,2).map(x=>`<span class="ptagchip">${esc(x)}</span>`).join('')+(t.length>2?`<span class="ptagchip more">+${t.length-2}</span>`:'');
        })()}</div>
        <div class="pgsubs">${subcatCell(p)}</div>
        <div class="pgfoot"><span class="pgprice">${p.priceFrom?gbp(p.priceFrom):'<span class="prod-never">POA</span>'}</span><span class="pgml">MOQ ${p.moq?p.moq.toLocaleString():'—'} · ${p.lead?p.lead+'d':'—'}</span></div>
        <div class="pgbot">${compDots(p)}${curatedCell(p)}</div>
      </div>
    </div>`;
  }
  function groupsOf(shown){
    if(!groupBy) return [{key:'',label:null,items:shown}];
    const map=new Map();
    const push=(k,p)=>{ if(!map.has(k))map.set(k,[]); map.get(k).push(p); };
    shown.forEach(p=>{
      if(groupBy==='supplier'){ push(p.supplier||'—',p); return; }
      const did=DEPTID3[p.dept]||(p.dept||'').toLowerCase();
      const ids=(window.MSSTORE?MSSTORE.subcatsForProduct(p.id):[])||[];
      const subs=(window.MSSTORE?MSSTORE.subcatsOf(did):[])||[];
      const names=ids.map(id=>{ const m=subs.find(x=>x.id===id); return m?(p.dept+' › '+m.name):null; }).filter(Boolean);
      if(names.length) names.forEach(n=>push(n,p)); else push('Not filed',p);
    });
    return [...map.entries()].sort((a,b)=>{
      if(a[0]==='Not filed') return 1; if(b[0]==='Not filed') return -1;   // unfiled last
      return String(a[0]).localeCompare(String(b[0]));
    }).map(([k,items])=>({key:k,label:k,items}));
  }
  const gHdr=g=>`<button class="gtoggle ${collapsed.has(g.key)?'off':''}" data-group="${esc(g.key)}"><span class="gcar">▾</span>${esc(g.label)}<em>${g.items.length}</em></button>`;

  function renderRows(){
    let rows=(filt.view==='archived'&&MSCAT.archivedProducts?MSCAT.archivedProducts():MSCAT.all()).filter(match);
    const SV=(p,k)=>k==='complete'?compScore(p):sortVal(p,k);
    rows.sort((a,b)=>{ const va=SV(a,filt.sort), vb=SV(b,filt.sort); if(va<vb)return -1*filt.dir; if(va>vb)return 1*filt.dir; return 0; });
    const body=document.getElementById('prodRows'), grid=document.getElementById('prodGrid');
    const scope=body||grid; if(!scope) return;
    const totalPages=Math.max(1,Math.ceil(rows.length/perPage));
    if(page>totalPages)page=totalPages; if(page<1)page=1;
    const start=(page-1)*perPage;
    const shown=rows.slice(start,start+perPage);
    lastRowIds=rows.map(p=>p.id); shownIds=shown.map(p=>p.id); lastChkIdx=null;
    if(cursor>=shownIds.length) cursor=shownIds.length-1;
    const chipBox=document.getElementById('prodChips'); if(chipBox) chipBox.innerHTML=chipsHtml();
    renderSaved();
    const gs=groupsOf(shown);
    if(body){
      const ncols=3+visCols().length;
      body.innerHTML=shown.length?gs.map(g=>(g.label?`<tr class="grouprow"><td colspan="${ncols}">${gHdr(g)}</td></tr>`:'')+(collapsed.has(g.key)?'':g.items.map(rowHTML).join(''))).join('')
        :`<tr><td colspan="${ncols}" style="text-align:center;color:var(--muted);padding:34px">No products match.</td></tr>`;
    } else {
      grid.innerHTML=shown.length?gs.map(g=>(g.label?`<div class="ggrouphd">${gHdr(g)}</div>`:'')+(collapsed.has(g.key)?'':`<div class="pgal">${g.items.map(cardHTML).join('')}</div>`)).join('')
        :'<p class="galempty">No products match.</p>';
    }
    const foot=document.getElementById('prodFoot'); if(foot){
      const from=rows.length?start+1:0, to=start+shown.length;
      // compact page list: 1 … p-1 p p+1 … last
      const pages=[]; for(let i=1;i<=totalPages;i++){ if(i===1||i===totalPages||Math.abs(i-page)<=1) pages.push(i); else if(pages[pages.length-1]!=='…') pages.push('…'); }
      foot.innerHTML=`<span class="pf-count">Showing <b>${from.toLocaleString()}–${to.toLocaleString()}</b> of <b>${rows.length.toLocaleString()}</b> product${rows.length===1?'':'s'}</span>
        ${filt.img==='no'&&rows.length?`<button class="btn ghost sm" id="prodRmNoImg">Remove ${rows.length.toLocaleString()} with no image</button>`:''}
        <div class="pager">
          <label class="pp">Per page <select id="prodPP">${[50,100,200].map(n=>`<option ${perPage===n?'selected':''}>${n}</option>`).join('')}</select></label>
          <button class="pgbtn" id="prodPrev" ${page<=1?'disabled':''}>‹</button>
          ${pages.map(pn=>pn==='…'?'<span class="pgell">…</span>':`<button class="pgbtn ${pn===page?'on':''}" data-page="${pn}">${pn}</button>`).join('')}
          <button class="pgbtn" id="prodNext" ${page>=totalPages?'disabled':''}>›</button>
        </div>`;
      const go=n=>{ page=n; cursor=-1; renderRows(); const wrap=panel().querySelector('.prodtbl-wrap'); if(wrap&&wrap.scrollHeight>wrap.clientHeight+1) wrap.scrollTop=0; else window.scrollTo(0,0); };
      foot.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(+b.dataset.page));
      const pv=foot.querySelector('#prodPrev'); if(pv)pv.onclick=()=>go(page-1);
      const nx=foot.querySelector('#prodNext'); if(nx)nx.onclick=()=>go(page+1);
      const pp=foot.querySelector('#prodPP'); if(pp)pp.onchange=()=>{ perPage=+pp.value; setPref({perPage}); page=1; renderRows(); };
    }
    { const rm=document.getElementById('prodRmNoImg'); if(rm) rm.onclick=()=>{ const sup=filt.supplier||''; const n=MSCAT.noImageCount(sup); if(!confirm('Remove '+n+' product'+(n===1?'':'s')+' that have no image'+(sup?(' from '+sup):'')+'? Back up first if unsure — this cannot be undone.'))return; const removed=MSCAT.removeUnimaged(sup); toast(`Removed ${removed} product${removed===1?'':'s'} with no image`); render(); }; }
    // supplier name → the same right-edge supplier drawer the directory uses
    scope.querySelectorAll('[data-supname]').forEach(b=>b.onclick=e=>{ e.stopPropagation();
      const nm=b.dataset.supname;
      const rec=(window.ADMIN&&ADMIN.suppliers||[]).find(x=>x.name===nm);
      if(rec&&window.__openSupplier) window.__openSupplier(rec.id);
      else { filt.supplier=nm; page=1; render(); }        // not an onboarded supplier — filter instead
    });
    scope.querySelectorAll('[data-viewprod]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openProduct(b.dataset.viewprod); });
    scope.querySelectorAll('[data-group]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const k=b.dataset.group;
      if(collapsed.has(k))collapsed.delete(k); else collapsed.add(k); setPref({collapsed:[...collapsed]}); renderRows(); });
    scope.querySelectorAll('.prodchk').forEach((c,idx)=>c.onclick=e=>{ e.stopPropagation(); const id=c.dataset.chk;
      if(e.shiftKey && lastChkIdx!=null){ // shift-click: apply the clicked box's state to the whole range
        const [a,b]=[Math.min(lastChkIdx,idx),Math.max(lastChkIdx,idx)];
        for(let i=a;i<=b;i++){ const rid=shownIds[i]; if(c.checked)sel.add(rid); else sel.delete(rid); }
        renderRows();
      } else { if(c.checked)sel.add(id); else sel.delete(id); }
      lastChkIdx=idx; syncBulk(); });
    scope.querySelectorAll('[data-prod]').forEach(r=>r.onclick=e=>{ if(e.target.closest('.chkcol,.pgchk,select,button,a'))return; openProduct(r.dataset.prod); });
    lazyThumbs(scope);
    wireZoom(scope);
    paintCursor();
    // inline recommended-range controls (tier / add / remove)
    scope.querySelectorAll('[data-tblcurtier]').forEach(s=>s.onchange=()=>{ MSCAT.setCurated(s.dataset.tblcurtier,{tier:s.value}); toast(`Tier set to ${TIERLBL[s.value]}`); renderRows(); });
    scope.querySelectorAll('[data-tblcuradd]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); MSCAT.setCurated(b.dataset.tblcuradd,{tier:'standard'}); toast('Added to recommended range'); renderRows(); });
    scope.querySelectorAll('[data-tblcurrm]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); MSCAT.removeCurated(b.dataset.tblcurrm); toast('Removed from recommended range'); renderRows(); });
    const all=document.getElementById('prodChkAll'); if(all){ all.checked=shownIds.length>0&&shownIds.every(id=>sel.has(id)); all.onclick=()=>{ if(all.checked)shownIds.forEach(id=>sel.add(id)); else lastRowIds.forEach(id=>sel.delete(id)); renderRows(); syncBulk(); }; }
    syncBulk();
    const c=document.getElementById('prodCount'); if(c)c.textContent=rows.length;
  }
  function syncBulk(){
    const bar=document.getElementById('prodBulk'); if(!bar) return;
    if(!sel.size){ bar.hidden=true; bar.innerHTML=''; return; }
    const picked=[...sel].map(id=>MSCAT.get(id)).filter(Boolean);
    const nIn=picked.filter(p=>p.curated).length, nOut=picked.length-nIn;
    const nIng=picked.filter(p=>p.ingested).length;
    // sub-categories available across the selected products' departments
    const DEPT_ID={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
    let subOpts='';
    if(window.MSSTORE){ const deptIds=[...new Set(picked.map(p=>DEPT_ID[p.dept]||(p.dept||'').toLowerCase()))];
      deptIds.forEach(did=>{ const dep=MSSTORE.department(did); const subs=MSSTORE.subcatsOf(did); if(dep&&subs.length){ subOpts+=`<optgroup label="${esc(dep.name)}">${subs.map(s=>`<option value="${did}:${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>`; } }); }
    const noSubDepts=[...new Set(picked.map(p=>p.dept).filter(Boolean))]
      .filter(d=>{ const did=DEPT_ID[d]||(d||'').toLowerCase(); return !(MSSTORE&&MSSTORE.subcatsOf(did)||[]).length; });
    const noSubMsg=noSubDepts.length
      ? 'No sub-categories in '+noSubDepts.slice(0,2).join(' / ')+(noSubDepts.length>2?' +'+(noSubDepts.length-2):'')+' — add them in Store layout'
      : 'No sub-categories available';
    bar.hidden=false;
    const nFeat=picked.filter(p=>!(p.curation&&p.curation.tier==='featured')).length;
    const pageAllSelected=shownIds.length&&shownIds.every(id=>sel.has(id));
    const moreAvailable=lastRowIds.filter(id=>!sel.has(id)).length;
    bar.innerHTML=`<span class="bulkn"><b>${sel.size.toLocaleString()}</b> selected${pageAllSelected&&moreAvailable?` <button class="bulkall" data-bulkall>Select all ${lastRowIds.length.toLocaleString()} matching</button>`:''}</span>
      <div class="bulkacts">
        <button class="btn sm" data-bulkadd ${nOut?'':'disabled title="Everything selected is already in the recommended range"'}>＋ Add ${nOut.toLocaleString()} to recommended range</button>
        <button class="btn sm" data-bulkfeat ${nFeat?'':'disabled title="Everything selected is already Featured"'}>★ Add ${nFeat.toLocaleString()} to Featured</button>
        <button class="btn ghost sm" data-bulkrm ${nIn?'':'disabled title="Nothing selected is in the recommended range"'}>Remove ${nIn.toLocaleString()} from range</button>
        <select class="prod-sel sm" id="bulkTagSel"><option value="">Apply tag…</option>${(window.MSTAGS?MSTAGS.list():[]).map(t=>`<option value="add:${esc(t)}">＋ ${esc(t)}</option>`).join('')}${(window.MSTAGS?MSTAGS.list():[]).map(t=>`<option value="rm:${esc(t)}">− Remove ${esc(t)}</option>`).join('')}<option value="__new">+ New tag…</option></select>
        <select class="prod-sel sm" id="bulkBrandSel"><option value="">Apply brand…</option>${(window.MSBRANDS?MSBRANDS.list():[]).map(b=>`<option>${esc(b)}</option>`).join('')}<option value="__clear">— Clear brand —</option><option value="__new">+ New brand…</option></select>
        ${subOpts
          ? `<select class="prod-sel sm" id="bulkSubSel"><option value="">Add to sub-category…</option>${subOpts}</select>`
          : `<select class="prod-sel sm" disabled title="${esc(noSubMsg)}"><option>${esc(noSubMsg)}</option></select>`}
        ${filt.view==='archived'
          ? `<button class="btn sm" data-bulkrestore>Restore ${sel.size.toLocaleString()}</button>`
          : `<button class="btn ghost sm" data-bulkarch>Archive ${sel.size.toLocaleString()}…</button>`}
        <button class="bulkclear" data-bulkclear>Clear</button>
        <button class="bulktray" data-bulktray>Review selection →</button>
      </div>`;
    const tr=bar.querySelector('[data-bulktray]'); if(tr)tr.onclick=openTray;
    const ba=bar.querySelector('[data-bulkall]'); if(ba)ba.onclick=()=>{ lastRowIds.forEach(id=>sel.add(id)); renderRows(); syncBulk(); };
    const add=bar.querySelector('[data-bulkadd]'); if(add)add.onclick=()=>{ if(!nOut)return; const ids=picked.filter(p=>!p.curated).map(p=>p.id); const n=MSCAT.setCuratedBulk?MSCAT.setCuratedBulk(ids,{tier:'standard'}):(ids.forEach(id=>MSCAT.setCurated(id,{tier:'standard'})),ids.length); toast(`Added ${Number(n).toLocaleString()} product${n===1?'':'s'} to the recommended range`); render(); };
    const ft=bar.querySelector('[data-bulkfeat]'); if(ft)ft.onclick=()=>{ if(!nFeat)return;
      const ids=picked.filter(p=>!(p.curation&&p.curation.tier==='featured')).map(p=>p.id);
      // Featured implies being in the range, so this adds and promotes in one step
      const n=MSCAT.setCuratedBulk?MSCAT.setCuratedBulk(ids,{tier:'featured'},true):(ids.forEach(id=>MSCAT.setCurated(id,{tier:'featured'})),ids.length);
      toast(`${Number(n).toLocaleString()} product${n===1?'':'s'} set to Featured`); render(); };
    const rm=bar.querySelector('[data-bulkrm]'); if(rm)rm.onclick=()=>{ if(!nIn)return; const ids=picked.filter(p=>p.curated).map(p=>p.id); const n=MSCAT.removeCuratedBulk?MSCAT.removeCuratedBulk(ids):(ids.forEach(id=>MSCAT.removeCurated(id)),ids.length); toast(`Removed ${Number(n).toLocaleString()} product${n===1?'':'s'} from the curated range`); render(); };
    const rst=bar.querySelector('[data-bulkrestore]'); if(rst)rst.onclick=()=>{ const ids=[...sel];
      const n=MSCAT.restoreProducts?MSCAT.restoreProducts(ids):0; sel.clear();
      toast(`Restored ${Number(n).toLocaleString()} product${n===1?'':'s'}`); render(); };
    const arch=bar.querySelector('[data-bulkarch]'); if(arch)arch.onclick=()=>{ const ids=[...sel];
      if(!confirm(`Archive ${ids.length.toLocaleString()} product${ids.length===1?'':'s'}?\n\nThey are hidden from the database, the store and every distributor range, and drop out of the recommended range. You can restore them from the Archived view at any time.`)) return;
      const n=MSCAT.archiveProducts?MSCAT.archiveProducts(ids):0; sel.clear();
      toast(`Archived ${Number(n).toLocaleString()} product${n===1?'':'s'}`); render(); };
    bar.querySelector('[data-bulkclear]').onclick=()=>{ sel.clear(); renderRows(); };
    const tsel=bar.querySelector('#bulkTagSel');
    if(tsel) tsel.onchange=()=>{ const v=tsel.value; if(!v) return; const ids=picked.map(p=>p.id);
      if(v==='__new'){ const n=prompt('New tag name:'); tsel.value='';
        if(n&&n.trim()){ MSTAGS.add(n); const k=MSTAGS.addBulk(ids,n.trim()); toast(`Tagged ${k.toLocaleString()} product${k===1?'':'s'} "${n.trim()}"`); render(); } return; }
      const [op,...rest]=v.split(':'); const tag=rest.join(':'); tsel.value='';
      const n=op==='add'?MSTAGS.addBulk(ids,tag):MSTAGS.removeBulk(ids,tag);
      toast(op==='add'?`Tagged ${n.toLocaleString()} product${n===1?'':'s'} "${tag}"`:`Removed "${tag}" from ${n.toLocaleString()} product${n===1?'':'s'}`);
      render(); };
    const bs=bar.querySelector('#bulkBrandSel'); if(bs)bs.onchange=()=>{ let v=bs.value; if(!v)return; if(v==='__new'){ const n=prompt('New brand name:'); if(n){ MSBRANDS.add(n); v=n.trim(); } else { bs.value=''; return; } } if(v==='__clear')v=''; MSBRANDS.setBrandBulk([...sel], v); toast(v?`Tagged ${sel.size} product${sel.size===1?'':'s'} as ${v}`:`Cleared brand on ${sel.size} product${sel.size===1?'':'s'}`); render(); };
    const ss=bar.querySelector('#bulkSubSel'); if(ss)ss.onchange=()=>{ const v=ss.value; if(!v)return; const [did,subId]=v.split(':'); const ids=picked.filter(p=>(DEPT_ID[p.dept]||(p.dept||'').toLowerCase())===did).map(p=>p.id); MSSTORE.addProductsToSubcat(ids,subId); const s=MSSTORE.subcatsOf(did).find(x=>x.id===subId); toast(`Added ${ids.length} product${ids.length===1?'':'s'} to ${s?s.name:'sub-category'}`); ss.value=''; };
  }

  const DEPT_ID2={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
  function deptIdOf(p){ return DEPT_ID2[p.dept]||(p.dept||'').toLowerCase(); }
  function tagPicker(p){
    if(!window.MSTAGS) return '—';
    const all=MSTAGS.list(); if(!all.length) return '<span class="prod-never">No tags defined yet</span>';
    const on=MSTAGS.tagsOf(p.id);
    return `<div class="subchips">${all.map(t=>`<button type="button" class="subchip ${on.indexOf(t)>-1?'on':''}" data-tagtoggle="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
  }
  function subcatPicker(p){
    if(!window.MSSTORE) return '—';
    const did=deptIdOf(p); const subs=MSSTORE.subcatsOf(did);
    if(!subs.length) return `<span class="prod-never">No sub-categories in ${esc(p.dept)} yet</span>`;
    const on=MSSTORE.subcatsForProduct(p.id);
    return `<div class="subchips">${subs.map(s=>`<button type="button" class="subchip ${on.includes(s.id)?'on':''}" data-subtoggle="${did}:${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
  }

  /* ---------- tag list manager ----------
     Tags are many-per-product (unlike brand), so the manager only owns the LIST;
     assignment happens in the product drawer and the bulk bar. */
  function openTagManager(){
    let pk=document.getElementById('tagMgr'); if(!pk){ pk=document.createElement('div'); pk.id='tagMgr'; pk.className='prod-scrim'; document.body.appendChild(pk); }
    function draw(){
      const tags=window.MSTAGS?MSTAGS.list():[], c=window.MSTAGS?MSTAGS.counts():{};
      pk.innerHTML=`<div class="prod-dr" style="width:min(440px,100%)"><div class="prod-drhd"><div><h2>Tags</h2><span>Merchandising labels — a product can carry several</span></div><button class="dwr-x" data-tx>×</button></div>
        <div class="prod-drbody">
          <div class="bm-add"><input id="tmNew" placeholder="New tag name…"><button class="btn sm" id="tmAdd">Add</button></div>
          <div class="bm-list">${tags.length?tags.map(t=>`<div class="bm-row"><input class="bm-name" data-tmname="${esc(t)}" value="${esc(t)}"><span class="bm-ct">${(c[t]||0).toLocaleString()} tagged</span><button class="bm-del" data-tmdel="${esc(t)}" title="Remove">×</button></div>`).join(''):'<p class="prod-curhint">No tags yet. Add your first above.</p>'}</div>
          <p class="prod-curhint" style="margin-top:14px">Apply tags from a product\u2019s drawer, or select several products and use <b>Tag</b> in the bulk bar.</p>
        </div></div>`;
      const add=()=>{ const v=pk.querySelector('#tmNew').value.trim(); if(v){ MSTAGS.add(v); draw(); } };
      pk.querySelector('#tmAdd').onclick=add;
      pk.querySelector('#tmNew').onkeydown=e=>{ if(e.key==='Enter')add(); };
      pk.querySelectorAll('[data-tmname]').forEach(inp=>inp.onchange=()=>{ const o=inp.dataset.tmname, n=inp.value.trim(); if(n&&n!==o){ MSTAGS.rename(o,n); draw(); } });
      pk.querySelectorAll('[data-tmdel]').forEach(b=>b.onclick=()=>{ const nm=b.dataset.tmdel, ct=MSTAGS.productsTagged(nm).length;
        if(!ct||confirm(`Remove "${nm}"? It will be cleared from ${ct} product${ct===1?'':'s'}.`)){ MSTAGS.remove(nm); draw(); } });
    }
    draw();
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); render(); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-tx]')) cx(); });
  }

  /* ---------- brand list manager ---------- */
  function openBrandManager(){
    let pk=document.getElementById('brandMgr'); if(!pk){ pk=document.createElement('div'); pk.id='brandMgr'; pk.className='prod-scrim'; document.body.appendChild(pk); }
    function draw(){
      const brands=window.MSBRANDS?MSBRANDS.list():[];
      pk.innerHTML=`<div class="prod-dr" style="width:min(440px,100%)"><div class="prod-drhd"><div><h2>Brands</h2><span>Add, rename or remove brand tags</span></div><button class="dwr-x" data-bx>×</button></div>
        <div class="prod-drbody">
          <div class="bm-add"><input id="bmNew" placeholder="New brand name…"><button class="btn sm" id="bmAdd">Add</button></div>
          <div class="bm-list">${brands.length?brands.map(b=>`<div class="bm-row"><input class="bm-name" data-bmname="${esc(b)}" value="${esc(b)}"><span class="bm-ct">${MSBRANDS.productsTagged(b).length} tagged</span><button class="bm-del" data-bmdel="${esc(b)}" title="Remove">×</button></div>`).join(''):'<p class="prod-curhint">No brands yet. Add your first above.</p>'}</div>
        </div></div>`;
      const add=()=>{ const v=pk.querySelector('#bmNew').value.trim(); if(v){ MSBRANDS.add(v); draw(); } };
      pk.querySelector('#bmAdd').onclick=add;
      pk.querySelector('#bmNew').onkeydown=e=>{ if(e.key==='Enter')add(); };
      pk.querySelectorAll('[data-bmname]').forEach(inp=>inp.onchange=()=>{ const o=inp.dataset.bmname, n=inp.value.trim(); if(n&&n!==o){ MSBRANDS.rename(o,n); draw(); } });
      pk.querySelectorAll('[data-bmdel]').forEach(b=>b.onclick=()=>{ const nm=b.dataset.bmdel; const ct=MSBRANDS.productsTagged(nm).length; if(!ct||confirm(`Remove "${nm}"? It will be cleared from ${ct} product${ct===1?'':'s'}.`)){ MSBRANDS.remove(nm); draw(); } });
    }
    draw();
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); render(); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-bx]')) cx(); });
  }

  /* ---------- product detail drawer ---------- */
  function openProduct(id){
    const p=MSCAT.get(id); if(!p) return;
    let pk=document.getElementById('prodDrawer'); if(!pk){ pk=document.createElement('div'); pk.id='prodDrawer'; pk.className='prod-scrim'; document.body.appendChild(pk); }
    const cur=p.curation||{}; const inRange=p.curated;
    pk.innerHTML=`<div class="prod-dr"><div class="prod-drhd"><div class="prodthumb lg">${p.image?`<img src="${esc(p.image)}" alt="" onerror="this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div><div><h2>${esc(p.name)}</h2><span>${esc(p.supplier)} · ${p.dept}${p.cat?' · '+esc(p.cat):''}${p.real?' · live product':''}</span></div><div class="drnav">${(()=>{ const i=lastRowIds.indexOf(id); return i<0?'':`<button class="drnavbtn" data-drprev ${i<=0?'disabled':''} title="Previous (←)">‹</button><span class="drnavct">${(i+1).toLocaleString()} / ${lastRowIds.length.toLocaleString()}</span><button class="drnavbtn" data-drnext ${i>=lastRowIds.length-1?'disabled':''} title="Next (→)">›</button>`; })()}</div><button class="dwr-x" data-px>×</button></div>
      <div class="prod-drbody">
        <div class="prod-stats"><div class="stat"><b>${p.priceFrom?gbp(p.priceFrom):'POA'}</b><span>From / unit</span></div><div class="stat"><b>${p.lead}d</b><span>Lead</span></div><div class="stat"><b>♻ ${p.sustainability}/10</b><span>Eco</span></div><div class="stat"><b>${p.moq?p.moq.toLocaleString():'—'}</b><span>MOQ</span></div></div>
        <div class="dwr-sec"><h4>Usage across the platform</h4>
          <div class="prod-stats"><div class="stat"><b>${p.usage.projects}</b><span>Projects</span></div><div class="stat"><b>${p.usage.orders}</b><span>Orders</span></div><div class="stat"><b>${p.usage.units.toLocaleString()}</b><span>Units ordered</span></div></div>
          <p class="prod-lastused">Last used: <b>${p.usage.lastUsed}</b></p>
        </div>
        <div class="dwr-sec"><h4>Attributes</h4><div class="kv">
          <span class="k">Brand</span><span class="v"><select id="prodBrandSel" class="prod-sel sm"><option value="">— none —</option>${(window.MSBRANDS?MSBRANDS.list():[]).map(b=>`<option ${MSBRANDS.brandOf(p.id)===b?'selected':''}>${esc(b)}</option>`).join('')}<option value="__new">+ New brand…</option></select></span>
          <span class="k">Tags</span><span class="v">${tagPicker(p)}</span>
          <span class="k">Department</span><span class="v"><select id="prodDeptSel" class="prod-sel sm">${MSCAT.depts().map(d=>`<option ${p.dept===d?'selected':''}>${d}</option>`).join('')}</select></span>
          <span class="k">Sub-categories</span><span class="v">${subcatPicker(p)}</span>
          <span class="k">Colours</span><span class="v">${(p.colours||[]).map(c=>typeof c==='string'?c:(c&&(c.name||c.base))||'').filter(Boolean).join(', ')||'—'}</span>
          <span class="k">Branding</span><span class="v">${(p.methods||[]).join(', ')||'—'}</span>
          ${p.material?`<span class="k">Material</span><span class="v">${esc(p.material)}</span>`:''}
          ${p.dimensions?`<span class="k">Dimensions</span><span class="v">${esc(p.dimensions)}</span>`:''}
          ${p.origin?`<span class="k">Country of origin</span><span class="v">${esc(p.origin)}</span>`:''}
          ${(p.certifications&&p.certifications.length)?`<span class="k">Certifications</span><span class="v">${p.certifications.map(c=>esc(c)).join(' · ')}</span>`:''}
          ${p.weightGr?`<span class="k">Item weight</span><span class="v">${p.weightGr>=1000?(p.weightGr/1000).toFixed(2)+' kg':p.weightGr+' g'}</span>`:''}
          ${p.carton?`<span class="k">Carton qty</span><span class="v">${p.carton} units</span>`:''}
          ${p.ean?`<span class="k">EAN</span><span class="v">${esc(p.ean)}</span>`:''}
        </div></div>
        <div class="dwr-sec" id="prodNotes">${window.MSNOTES?MSNOTES.panelHTML(p.id):''}</div>
        <div class="dwr-sec prod-curatebox ${inRange?'on':''}">
          <h4>Merchsmith Recommended range</h4>
          ${inRange?`<div class="prod-curstat"><svg class="icn" style="width:15px;height:15px;stroke:var(--green-deep)"><path d="M4 12.5 9.5 18 20 6.5"/></svg>In the recommended range · <b>${TIERLBL[cur.tier]||'Standard'}</b> tier</div>
            <div class="prod-fees"><div><span>Monthly fee</span><b>${gbp0(MSCAT.feeFor(p))}/mo</b></div><div><span>Rate</span><b>${cur.fee!=null?'Overridden':'Tier rate'}</b></div></div>
            <label class="prod-tierf"><span>Placement tier</span><select id="prodTier">${TIERS().map(([v,l,f])=>`<option value="${v}" ${cur.tier===v?'selected':''}>${l} — ${gbp0(f)}/mo</option>`).join('')}</select></label>
            <div class="prod-curactions"><button class="btn ghost sm" id="prodRemove">Remove from range</button></div>`
            :`<p class="prod-curhint">Not in the recommended range. Suppliers pay a monthly fee per product to appear, and more for featured placement.</p>
            <label class="prod-tierf"><span>Add at tier</span><select id="prodTier">${TIERS().map(([v,l,f])=>`<option value="${v}">${l} — ${gbp0(f)}/mo</option>`).join('')}</select></label>
            <div class="prod-curactions"><button class="btn sm" id="prodAdd">Add to recommended range</button></div>`}
        </div>
      </div></div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); document.removeEventListener('keydown',dk); };
    // step through the filtered set without closing (prev/next + arrow keys)
    const step=d=>{ const i=lastRowIds.indexOf(id), n=i+d; if(i<0||n<0||n>=lastRowIds.length) return;
      const nid=lastRowIds[n]; const ci=shownIds.indexOf(nid); if(ci>=0){ cursor=ci; paintCursor(); }
      pk.classList.remove('open'); pk.remove(); document.removeEventListener('keydown',dk); openProduct(nid); };
    const dk=e=>{ if(e.key==='ArrowLeft'){ e.preventDefault(); step(-1); } else if(e.key==='ArrowRight'){ e.preventDefault(); step(1); } else if(e.key==='Escape'){ cx(); } };
    document.addEventListener('keydown',dk);
    if(window.MSNOTES) MSNOTES.wire(pk.querySelector('#prodNotes'),p.id,()=>renderRows());
    const pv=pk.querySelector('[data-drprev]'); if(pv)pv.onclick=e=>{ e.stopPropagation(); step(-1); };
    const nx=pk.querySelector('[data-drnext]'); if(nx)nx.onclick=e=>{ e.stopPropagation(); step(1); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-px]')) cx(); });
    const tierSel=()=>({tier:document.getElementById('prodTier').value});
    const add=pk.querySelector('#prodAdd'); if(add)add.onclick=()=>{ MSCAT.setCurated(id,tierSel()); toast(`“${p.name}” added to the recommended range`); render(); openProduct(id); };
    const bsel=pk.querySelector('#prodBrandSel'); if(bsel)bsel.onchange=()=>{ let v=bsel.value; if(v==='__new'){ const n=prompt('New brand name:'); if(n){ MSBRANDS.add(n); v=n.trim(); } else { bsel.value=MSBRANDS.brandOf(id); return; } } MSBRANDS.setBrand(id, v); toast(v?`Tagged as ${v}`:'Brand cleared'); render(); openProduct(id); };
    const dsel=pk.querySelector('#prodDeptSel'); if(dsel)dsel.onchange=()=>{ const d=dsel.value; if(d===p.dept)return; if(MSCAT.setDeptBulk){ MSCAT.setDeptBulk([id],d); if(window.MSSTORE&&MSSTORE.subcatsForProduct&&MSSTORE.toggleProductSubcat) MSSTORE.subcatsForProduct(id).forEach(sid=>MSSTORE.toggleProductSubcat(id,sid)); toast(`Moved to ${d}`); render(); openProduct(id); } };
    pk.querySelectorAll('[data-tagtoggle]').forEach(b=>b.onclick=()=>{ MSTAGS.toggle(id,b.dataset.tagtoggle); b.classList.toggle('on');
      if(window.MSNOTES) MSNOTES.log(id,'data',(b.classList.contains('on')?'tagged it ':'untagged it ')+b.dataset.tagtoggle); renderRows(); });
    pk.querySelectorAll('[data-subtoggle]').forEach(b=>b.onclick=()=>{ const [,subId]=b.dataset.subtoggle.split(':'); MSSTORE.toggleProductSubcat(id, subId); b.classList.toggle('on'); });
    const rem=pk.querySelector('#prodRemove'); if(rem)rem.onclick=()=>{ MSCAT.removeCurated(id); toast(`“${p.name}” removed from the recommended range`); render(); openProduct(id); };
    const ts=pk.querySelector('#prodTier'); if(ts&&inRange)ts.onchange=()=>{ MSCAT.setCurated(id,tierSel()); render(); openProduct(id); };
  }

  /* ---------- data health ----------
     Reports what is actually true of the catalogue rather than assuming. The
     listable count is the one that matters: a product needs BOTH an image and a
     price to go in the store, and right now the two arrive from different
     records in the supplier feeds. */
  function health(){
    const all=MSCAT.all(); const n=all.length;
    let img=0,price=0,both=0,desc=0,brand=0,sub=0; const dist={};
    all.forEach(p=>{ const sc=compScore(p); dist[sc]=(dist[sc]||0)+1;
      if(p.image)img++; if(p.priceFrom)price++;
      if(sc===COMP.length)both++;                       // "listable" = every metric met
      if(p.desc||p.blurb||p.description)desc++; if(p.methods&&p.methods.length)brand++;
      if(window.MSSTORE&&MSSTORE.subcatsForProduct(p.id).length)sub++; });
    return {n,img,price,both,desc,brand,sub,dist};
  }
  // Shown as a chip in the Views row, not a panel: it is reference information, so it
  // should carry no more weight than the filters beside it. The detail that used to fill
  // the panel lives in the tooltip; clicking filters to the products that fail the test.
  function healthChip(){
    const h=health(); if(!h.n) return '';
    const pc=Math.round(h.both/h.n*100), blocked=h.both===0;
    const tip=blocked
      ? `A product needs an image AND a price to be listed. None has both yet — ${h.img.toLocaleString()} have an image but no price, ${h.price.toLocaleString()} have a price but no image. Click to see the products that fail.`
      : `${h.both.toLocaleString()} of ${h.n.toLocaleString()} products have both an image and a price, so they can be listed in the store. Click to see the ${(h.n-h.both).toLocaleString()} that cannot.`;
    return `<button class="dhchip ${blocked?'bad':''}" id="dhChip" title="${esc(tip)}" aria-expanded="false">
      <i class="dhmeter"><u style="width:${pc}%"></u></i><span><b>${h.both.toLocaleString()}</b> of ${h.n.toLocaleString()} listable</span></button>`;
  }
  // the detail the old panel carried, opened from the chip
  function openHealth(anchor){
    const old=document.getElementById('dhPop'); if(old){ old.remove(); anchor.setAttribute('aria-expanded','false'); return; }
    const h=health(); if(!h.n) return;
    const pc=v=>Math.round(v/h.n*100);
    const pop=document.createElement('div'); pop.id='dhPop'; pop.className='dhpop';
    pop.innerHTML=`<div class="dhpop-hd"><b>${h.both.toLocaleString()}</b><span>of ${h.n.toLocaleString()} products are listable<em>a product needs all five: image, price, description, branding data and a sub-category</em></span></div>
      <div class="dhpop-bars">${[['Image',h.img,'no'],['Price',h.price,'noprice'],['Description',h.desc,'nodesc'],['Branding',h.brand,'nobrand'],['Sub-category',h.sub,'nosub']].map(([l,v,f])=>
        `<div class="dh-bar"><span>${l}</span><i><u style="width:${pc(v)}%"></u></i><b>${v.toLocaleString()}</b></div>`).join('')}</div>
      ${h.both===0?`<p class="dhpop-note">The feeds deliver images and prices on different records, so no product has both yet — ${h.img.toLocaleString()} have an image but no price, ${h.price.toLocaleString()} have a price but no image. Joining them is an import job, not a data-entry one.</p>`:''}
      <div class="dhpop-acts">
        <button data-dhf="nolist">Show not listable</button>
        <button data-dhf="noprice">No price</button>
        <button data-dhimg="no">No image</button>
      </div>`;
    document.body.appendChild(pop);
    const r=anchor.getBoundingClientRect();
    pop.style.top=(window.scrollY+r.bottom+8)+'px';
    pop.style.left=Math.max(12,Math.min(window.scrollX+r.right-pop.offsetWidth, window.scrollX+window.innerWidth-pop.offsetWidth-12))+'px';
    anchor.setAttribute('aria-expanded','true');
    pop.querySelectorAll('[data-dhf]').forEach(b=>b.onclick=()=>{ pop.remove(); applyView({comp:b.dataset.dhf}); });
    pop.querySelectorAll('[data-dhimg]').forEach(b=>b.onclick=()=>{ pop.remove(); applyView({img:b.dataset.dhimg}); });
    const away=e=>{ if(!pop.contains(e.target)&&e.target!==anchor&&!anchor.contains(e.target)){ pop.remove(); anchor.setAttribute('aria-expanded','false'); document.removeEventListener('mousedown',away); } };
    setTimeout(()=>document.addEventListener('mousedown',away),0);
  }

  /* ---------- saved views bar ---------- */
  function currentFilterSig(){ const o={}; FILTKEYS.forEach(k=>{ if(filt[k]) o[k]=filt[k]; }); return o; }
  function sameFilt(a,b){ const ka=Object.keys(a||{}), kb=Object.keys(b||{}); return ka.length===kb.length&&ka.every(k=>a[k]===b[k]); }
  function renderSaved(){
    const host=document.getElementById('prodSaved'); if(!host) return;
    const cur=currentFilterSig(), mine=savedViews();
    const active=[...PRESETS,...mine].find(v=>sameFilt(v.f,cur));
    const chip=v=>`<button class="svchip ${active&&active.id===v.id?'on':''}" data-sv="${esc(v.id)}">${esc(v.name)}${v.own?`<b data-svdel="${esc(v.id)}" title="Delete this view">×</b>`:''}</button>`;
    const hasFilters=Object.keys(cur).length>0;
    host.innerHTML=`<span class="svlbl">Views</span>
      <button class="svchip ${hasFilters?'':'on'}" data-sv="__all">All products</button>
      <button class="svchip ${filt.img==='no'?'on':''}" data-img="no">No image</button>
      ${(function(){ const n=(MSCAT.archivedIds?MSCAT.archivedIds():[]).length;
        return n?`<button class="svchip ${filt.view==='archived'?'on':''}" data-arch="1">Archived · ${n.toLocaleString()}</button>`:''; })()}
      <button class="svchip ${filt.comp==='nodesc'?'on':''}" data-comp="nodesc">No description</button>
      <button class="svchip ${filt.comp==='nobrand'?'on':''}" data-comp="nobrand">No branding data</button>
      <button class="svchip ${filt.comp==='nosub'?'on':''}" data-comp="nosub">No sub-category</button>
      ${PRESETS.map(chip).join('')}
      ${mine.map(v=>chip(Object.assign({own:true},v))).join('')}
      ${hasFilters&&!active?`<button class="svsave" id="svSave">+ Save this view</button>`:''}
      ${healthChip()}
      <div class="vtoggle" id="prodViewMode" role="group" aria-label="Switch layout">
        <button class="${viewMode==='gallery'?'on':''}" data-vm="gallery" title="Gallery view" aria-label="Gallery view" aria-pressed="${viewMode==='gallery'}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg></button>
        <button class="${viewMode==='table'?'on':''}" data-vm="table" title="List view" aria-label="List view" aria-pressed="${viewMode==='table'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
      ${viewMode==='gallery'?`<button class="svsave" id="svPage">Select all on page</button>`:''}`;
    const dc=host.querySelector('#dhChip'); if(dc) dc.onclick=()=>openHealth(dc);
    host.querySelectorAll('#prodViewMode [data-vm]').forEach(b=>b.onclick=()=>{ viewMode=b.dataset.vm; setPref({viewMode}); cursor=-1; render(); });
    host.querySelectorAll('[data-arch]').forEach(b=>b.onclick=()=>{
      applyView(filt.view==='archived'?{}:{view:'archived'}); });
    host.querySelectorAll('[data-comp]').forEach(b=>b.onclick=()=>{
      filt.comp = filt.comp===b.dataset.comp ? '' : b.dataset.comp; page=1; render(); });
    host.querySelectorAll('[data-img]').forEach(b=>b.onclick=()=>{
      filt.img = filt.img===b.dataset.img ? '' : b.dataset.img; page=1; render(); });
    host.querySelectorAll('[data-sv]').forEach(b=>b.onclick=e=>{
      if(e.target.closest('[data-svdel]')) return;
      const id=b.dataset.sv;
      if(id==='__all'){ applyView({}); return; }
      const v=[...PRESETS,...savedViews()].find(x=>x.id===id); if(v) applyView(v.f);
    });
    host.querySelectorAll('[data-svdel]').forEach(b=>b.onclick=e=>{ e.stopPropagation();
      const id=b.dataset.svdel; setSavedViews(savedViews().filter(v=>v.id!==id)); renderSaved(); });
    const sv=host.querySelector('#svSave'); if(sv)sv.onclick=()=>{
      const name=prompt('Name this view:'); if(!name) return;
      const list=savedViews(); list.push({id:'v'+Date.now(),name:name.trim(),f:currentFilterSig()}); setSavedViews(list);
      toast(`Saved view “${name.trim()}”`); renderSaved(); };
    const sp=host.querySelector('#svPage'); if(sp)sp.onclick=()=>{ shownIds.forEach(id=>sel.add(id)); renderRows(); syncBulk(); };
  }

  /* ---------- table thumbnail: hover to enlarge ---------- */
  let _zoomEl=null;
  function wireZoom(scope){
    if(viewMode!=='table') return;
    scope.querySelectorAll('.prodthumb[data-zoom]').forEach(t=>{
      const url=t.dataset.zoom; if(!url) return;
      t.onmouseenter=()=>{
        if(!_zoomEl){ _zoomEl=document.createElement('div'); _zoomEl.className='thumbzoom'; document.body.appendChild(_zoomEl); }
        _zoomEl.innerHTML=`<img src="${esc(url)}" alt="">`;
        const r=t.getBoundingClientRect(); const W=320, H=320;
        let left=r.right+14; if(left+W>innerWidth-10) left=r.left-W-14;
        let top=r.top+r.height/2-H/2; top=Math.max(10,Math.min(top,innerHeight-H-10));
        _zoomEl.style.left=left+'px'; _zoomEl.style.top=top+'px';
        requestAnimationFrame(()=>_zoomEl&&_zoomEl.classList.add('on'));
      };
      t.onmouseleave=()=>{ if(_zoomEl){ _zoomEl.classList.remove('on'); } };
    });
  }

  /* ---------- keyboard triage ---------- */
  function paintCursor(){
    const scope=document.getElementById('prodRows')||document.getElementById('prodGrid'); if(!scope) return;
    scope.querySelectorAll('.kbcur').forEach(e=>e.classList.remove('kbcur'));
    if(cursor<0||!shownIds[cursor]) return;
    const el=scope.querySelector(`[data-prod="${shownIds[cursor]}"]`);
    if(el){ el.classList.add('kbcur');
      const wrap=el.closest('.prodtbl-wrap,.prodgal-wrap');
      const scrollable=wrap&&wrap.scrollHeight>wrap.clientHeight+1;
      if(scrollable){ const r=el.getBoundingClientRect(), wr=wrap.getBoundingClientRect();
        if(r.top<wr.top+40) wrap.scrollTop-=(wr.top+40-r.top);
        else if(r.bottom>wr.bottom-10) wrap.scrollTop+=(r.bottom-wr.bottom+10); }
      else { // gallery: the page is the scroller
        const r=el.getBoundingClientRect(), vh=window.innerHeight||800;
        if(r.top<80) window.scrollBy(0,r.top-80);
        else if(r.bottom>vh-20) window.scrollBy(0,r.bottom-vh+20); }
    }
  }
  function moveCursor(d){
    if(!shownIds.length) return;
    cursor=cursor<0?0:Math.max(0,Math.min(shownIds.length-1,cursor+d));
    paintCursor();
  }
  document.addEventListener('keydown',e=>{
    const p=panel(); if(!p||!p.classList.contains('active')) return;
    if(document.querySelector('.prod-scrim.open')) return;            // drawer has its own keys
    const t=e.target; if(t&&/input|select|textarea/i.test(t.tagName)) return;
    const k=e.key.toLowerCase();
    if(k==='j'||e.key==='ArrowDown'){ e.preventDefault(); moveCursor(1); }
    else if(k==='k'||e.key==='ArrowUp'){ e.preventDefault(); moveCursor(-1); }
    else if(e.key===' '){ if(cursor<0)return; e.preventDefault(); const id=shownIds[cursor];
      if(sel.has(id))sel.delete(id); else sel.add(id); renderRows(); syncBulk(); }
    else if(k==='c'){ if(cursor<0)return; e.preventDefault(); const id=shownIds[cursor]; const pr=MSCAT.get(id); if(!pr)return;
      if(pr.curated){ MSCAT.removeCurated(id); toast('Removed from recommended range'); }
      else { MSCAT.setCurated(id,{tier:'standard'}); toast('Added to recommended range'); }
      renderRows(); }
    else if(e.key==='Enter'||k==='o'){ if(cursor<0)return; e.preventDefault(); openProduct(shownIds[cursor]); }
    else if(k==='a'&&!e.metaKey&&!e.ctrlKey){ e.preventDefault(); shownIds.forEach(id=>sel.add(id)); renderRows(); syncBulk(); }
    else if(e.key==='Escape'){ if(sel.size){ sel.clear(); renderRows(); } else { cursor=-1; paintCursor(); } }
    else if(k==='?'){ openKeyHelp(); }
  });
  function openKeyHelp(){
    let m=document.getElementById('kbHelp'); if(m){ m.remove(); return; }
    m=document.createElement('div'); m.id='kbHelp'; m.className='kbhelp';
    m.innerHTML=`<div class="kbhelp-hd">Keyboard triage</div>`+[
      ['J / ↓','Next product'],['K / ↑','Previous product'],['Space','Select / deselect'],
      ['C','Add to ↔ remove from recommended range'],['Enter','Open the product'],['A','Select everything on this page'],['Esc','Clear selection'],
    ].map(([k,l])=>`<div class="kbrow"><kbd>${k}</kbd><span>${l}</span></div>`).join('');
    document.body.appendChild(m);
    setTimeout(()=>{ const close=e=>{ if(!m.contains(e.target)&&e.target.id!=='prodKeys'){ m.remove(); document.removeEventListener('click',close,true); } }; document.addEventListener('click',close,true); },0);
  }

  /* ---------- selection tray ---------- */
  function openTray(){
    let pk=document.getElementById('prodTray'); if(!pk){ pk=document.createElement('div'); pk.id='prodTray'; pk.className='prod-scrim'; document.body.appendChild(pk); }
    function draw(){
      const picked=[...sel].map(id=>MSCAT.get(id)).filter(Boolean);
      const nOut=picked.filter(p=>!p.curated).length;
      pk.innerHTML=`<div class="prod-dr" style="width:min(560px,100%)">
        <div class="prod-drhd"><div><h2>Selection</h2><span>${picked.length.toLocaleString()} product${picked.length===1?'':'s'} · review before you commit</span></div><button class="dwr-x" data-tx>×</button></div>
        <div class="prod-drbody">
          ${picked.length?`<div class="trayacts">
            <button class="btn sm" id="trayAdd" ${nOut?'':'disabled'}>＋ Add ${nOut.toLocaleString()} to recommended range</button>
            <button class="btn ghost sm" id="trayClear">Clear all</button>
          </div>
          <div class="traygrid">${picked.map(p=>`<div class="trayitem">
            <div class="trayimg">${p.image?`<img src="${esc(p.image)}" alt="" onerror="this.remove()">`:'<span class="pgnone">No image</span>'}</div>
            <b title="${esc(p.name)}">${esc(p.name)}</b>
            <span>${esc(p.supplier)}</span>
            <div class="traymeta">${compDots(p)}${p.curated?'<span class="curbadge">In range</span>':''}</div>
            <button class="trayrm" data-trayrm="${p.id}" title="Remove from selection">×</button>
          </div>`).join('')}</div>`
          :'<p class="prod-curhint">Nothing selected. Tick products in the gallery or table to build a set here.</p>'}
        </div></div>`;
      pk.querySelectorAll('[data-trayrm]').forEach(b=>b.onclick=()=>{ sel.delete(b.dataset.trayrm); renderRows(); syncBulk(); draw(); });
      const ta=pk.querySelector('#trayAdd'); if(ta)ta.onclick=()=>{ const ids=picked.filter(p=>!p.curated).map(p=>p.id); if(!ids.length)return;
        const n=MSCAT.setCuratedBulk?MSCAT.setCuratedBulk(ids,{tier:'standard'}):(ids.forEach(id=>MSCAT.setCurated(id,{tier:'standard'})),ids.length);
        toast(`Added ${Number(n).toLocaleString()} product${n===1?'':'s'} to the recommended range`); render(); draw(); };
      const tc=pk.querySelector('#trayClear'); if(tc)tc.onclick=()=>{ sel.clear(); renderRows(); draw(); };
    }
    draw();
    requestAnimationFrame(()=>pk.classList.add('open'));
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-tx]')){ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); } });
  }

  /* ---------- styles ---------- */
  (function(){ if(document.getElementById('prod-style'))return; const st=document.createElement('style'); st.id='prod-style';
    st.textContent=`
    .prod-sel{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;color:var(--ink);}
    .chkcol{width:38px;text-align:center;}
    .chkcol input{width:16px;height:16px;cursor:pointer;accent-color:var(--periwinkle-deep);}
    .bulkbar{display:flex;align-items:center;justify-content:space-between;gap:10px 14px;flex-wrap:wrap;min-width:0;background:var(--zest,#FFEB3D);color:var(--ink);border-radius:12px;padding:11px 16px;margin-bottom:12px;}
    .bulkbar[hidden]{display:none;}
    .bulkn b{font-size:16px;}
    .bulkacts{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0;justify-content:flex-end;}
    .bulkacts>*{flex:0 1 auto;min-width:0;}
    .bulkacts .prod-sel{max-width:200px;}
    .bulkbar .btn{background:var(--ink);color:#fff;}
    .bulkbar .btn.ghost{background:transparent;color:var(--ink);border:1.5px solid rgba(34,34,34,.38);}
    .bulkbar .btn.ghost:hover{border-color:var(--ink);}
    .bulkbar .btn:disabled{opacity:.45;cursor:default;}
    .bulkclear{background:none;border:0;color:var(--ink);font:inherit;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;opacity:.85;}

    /* view toggle — pill track, active state lifts onto a white card (accent icon) */
    .vtoggle{display:inline-flex;align-items:center;gap:2px;background:var(--paper-2);border-radius:999px;padding:3px;}
    .vtoggle button{width:38px;height:32px;display:grid;place-items:center;border:0;background:none;border-radius:999px;cursor:pointer;color:var(--ink-3);transition:background .15s,color .15s,box-shadow .15s;}
    .vtoggle button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
    .vtoggle button:not(.on):hover{color:var(--ink);}
    .vtoggle button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);}
    .statbar .sb.pv{cursor:pointer;}.statbar .sb.pv:hover{border-color:var(--periwinkle);}
    .prodthumb{width:34px;height:34px;border-radius:8px;flex:none;display:grid;place-items:center;background:var(--paper-2);color:var(--ink-3);font-family:var(--serif);font-weight:600;font-size:15px;text-transform:uppercase;overflow:hidden;}
    .prodtbl .prodthumb{width:52px;height:52px;font-size:20px;border-radius:9px;}
    .datecell{font-size:12px;color:var(--ink-2);white-space:nowrap;}
    .prodtbl .rowact{display:flex;gap:4px;}
    .prodtbl .rowact a.iconbtn{display:inline-grid;place-items:center;text-decoration:none;}
    .prodthumb img{width:100%;height:100%;object-fit:contain;background:#fff;display:block;}
    .prodthumb.lg{width:56px;height:56px;font-size:24px;}
    .ecobadge{font-size:11px;font-weight:700;color:var(--green-deep);background:var(--tint-green);border-radius:6px;padding:2px 7px;}
    .curbadge{font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 9px;background:var(--tint-peri);color:var(--periwinkle-deep);}
    .curcell{display:inline-flex;align-items:center;gap:5px;}
    .curtier-tbl{font:inherit;font-size:12px;font-weight:600;border:1.5px solid var(--line-soft);border-radius:8px;padding:4px 6px;background:#fff;color:var(--ink);cursor:pointer;}
    .curtier-tbl.promo{border-color:#e7c98f;background:#fdf6e7;}
    .curq{border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;color:var(--periwinkle-deep);padding:4px 10px;}
    .curq:hover{border-color:var(--periwinkle-deep);}
    .curq.rm{width:26px;height:26px;padding:0;color:var(--muted);font-size:14px;line-height:1;}
    .curq.rm:hover{border-color:var(--flare);color:var(--flare);}
    .curbadge.promo{background:#fbeccd;color:#9a6b1f;}
    .brandtag{font-size:11px;font-weight:600;color:var(--ink);background:rgba(0,151,216,.25);border-radius:6px;padding:2px 8px;white-space:nowrap;display:inline-block;}
    .ptagchip{font-size:10.5px;font-weight:600;color:var(--ink);background:rgba(0,151,216,.25);border-radius:6px;padding:2px 7px;white-space:nowrap;display:inline-block;}
    .ptagchip.more{color:var(--ink-3);background:var(--paper-2);}
    .tagcell{display:inline-flex;gap:4px;flex-wrap:wrap;}
    .subchips{display:flex;flex-wrap:wrap;gap:6px;}
    .subchip{font-size:11.5px;font-weight:600;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:4px 11px;cursor:pointer;}
    .subchip:hover{border-color:var(--periwinkle);}
    .subchip.on{background:var(--periwinkle-deep);color:#fff;border-color:var(--periwinkle-deep);}
    .prod-dr .kv{grid-template-columns:120px 1fr;align-items:start;}
    /* richer product table */
    .prodtbl-wrap{overflow:auto;border:1px solid var(--line-soft);border-radius:12px;max-height:calc(100vh - 150px);background:#fff;}
    .prodtbl{min-width:1100px;margin:0;border-collapse:separate;border-spacing:0;}
    .prodtbl thead{position:relative;z-index:3;will-change:transform;}
    .prodtbl thead th{background:var(--paper);box-shadow:0 1px 0 var(--line-soft);}
    .fchips{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px;}
    .fchip{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-ink,#3C4279);background:var(--tint-peri);border:0;border-radius:999px;padding:6px 12px;cursor:pointer;}
    .fchip b{font-weight:800;opacity:.55;}
    .fchip:hover b{opacity:1;}
    .fchip.clearall{background:none;color:var(--muted);text-decoration:underline;}
    .colmenu{position:fixed;z-index:400;background:#fff;border:1px solid var(--line-soft);border-radius:12px;box-shadow:0 16px 44px rgba(20,22,45,.18);padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:170px;}
    .colmenu-hd{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:2px 4px 6px;}
    .colmenu label{display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 4px;border-radius:7px;cursor:pointer;}
    .colmenu label:hover{background:var(--paper-2);}
    .colmenu input{accent-color:var(--periwinkle-deep);}
    .colreset{margin-top:6px;border:0;background:none;font:inherit;font-size:12px;font-weight:700;color:var(--periwinkle-deep);text-decoration:underline;cursor:pointer;align-self:flex-start;padding:2px 4px;}
    .bulkbar .btn.bulkdanger{color:#c0392b;}
    .prodtbl th.sortable{cursor:pointer;user-select:none;white-space:nowrap;}
    .prodtbl th.sortable:hover{color:var(--periwinkle-deep);}
    .prodtbl th.sortable::after{content:"\\2195";opacity:.25;margin-left:4px;font-size:10px;}
    .prodtbl th.sorted-asc::after{content:"\\2191";opacity:1;color:var(--periwinkle-deep);}
    .prodtbl th.sorted-desc::after{content:"\\2193";opacity:1;color:var(--periwinkle-deep);}
    .prodtbl tbody tr{cursor:default;}
    .prodtbl tbody tr:hover{background:rgba(255,235,61,.08);}
    .cdots{display:inline-flex;align-items:center;gap:3px;}
    .cdots i{width:10px;height:10px;border-radius:50%;display:inline-block;}
    .cdots em{font-style:normal;font-size:10px;color:var(--muted);margin-left:2px;}
    .livetag,.ingtag{font-style:normal;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;border-radius:4px;padding:1px 5px;margin-left:5px;}
    .livetag{background:var(--tint-green);color:var(--green-deep);}
    .ingtag{background:var(--tint-peri);color:var(--periwinkle-deep);}
    .deptpill{font-size:11.5px;font-weight:600;background:rgba(0,151,216,.25);color:var(--ink);border-radius:6px;padding:2px 9px;white-space:nowrap;}
    .subcell{display:inline-flex;gap:4px;flex-wrap:wrap;}
    .subpill{font-size:10.5px;font-weight:600;color:var(--ink);background:rgba(0,151,216,.25);border-radius:6px;padding:2px 7px;white-space:nowrap;}
    .subpill.more{color:var(--ink-3);background:var(--paper-2);}
    .ecobadge{white-space:nowrap;}
    .ecobadge.hi{background:#dcf0e4;color:#1f7a4d;}
    .ecobadge.lo{background:#fbeccd;color:#9a6b1f;}
    .usecell{display:inline-flex;flex-direction:column;line-height:1.2;}
    .usecell b{font-size:13px;}
    .usecell span{font-size:10.5px;color:var(--muted);}
    .prodtbl-foot{font-size:12px;color:var(--muted);margin-top:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
    .pf-count{margin-right:auto;}
    .pf-count b{color:var(--ink-2);}
    .pager{display:flex;align-items:center;gap:5px;}
    .pager .pp{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-right:8px;}
    .pager .pp select{font:inherit;font-size:12.5px;border:1.5px solid var(--line-soft);border-radius:8px;padding:5px 7px;background:#fff;color:var(--ink);}
    .pgbtn{min-width:30px;height:30px;padding:0 8px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);cursor:pointer;}
    .pgbtn:hover:not(:disabled){border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);}
    .pgbtn.on{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;cursor:default;}
    .pgbtn:disabled{opacity:.35;cursor:default;}
    .pgell{padding:0 3px;color:var(--muted);}
    .bulkall{background:none;border:0;color:#fff;font:inherit;font-size:12.5px;font-weight:800;text-decoration:underline;cursor:pointer;margin-left:10px;}
    .prodtbl .rowact .iconbtn{padding:5px 8px;}
    .phead-acts{display:flex;gap:10px;align-items:center;}
    .bm-add{display:flex;gap:8px;margin-bottom:16px;}
    .bm-add input{flex:1;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;}
    .bm-list{display:flex;flex-direction:column;gap:7px;}
    .bm-row{display:flex;align-items:center;gap:9px;}
    .bm-name{flex:1;font:inherit;font-size:13.5px;font-weight:600;border:1.5px solid var(--line-soft);border-radius:8px;padding:7px 9px;background:#fff;min-width:0;}
    .bm-ct{font-size:11.5px;color:var(--muted);white-space:nowrap;}
    .bm-del{width:28px;height:28px;border:1.5px solid var(--line-soft);background:#fff;border-radius:7px;font-size:16px;line-height:1;color:var(--muted);cursor:pointer;}
    .bm-del:hover{border-color:var(--flare);color:var(--flare);}
    .prod-never{color:var(--line);}
    /* drawer */
    .prod-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:150;opacity:0;transition:opacity .2s;}
    .prod-scrim.open{opacity:1;}
    .prod-dr{position:fixed;top:0;right:0;height:100vh;width:min(480px,100%);background:var(--paper);transform:translateX(100%);transition:transform .24s cubic-bezier(.22,.61,.36,1);overflow-y:auto;}
    .prod-scrim.open .prod-dr{transform:none;box-shadow:-20px 0 60px rgba(20,22,45,.3);}
    .prod-drhd{display:flex;align-items:flex-start;gap:14px;padding:20px 24px;border-bottom:1px solid var(--line-soft);background:#fff;}
    .prod-drhd h2{font-family:var(--serif);font-weight:500;font-size:21px;margin:0;}
    .prod-drhd span{font-size:12.5px;color:var(--muted);}
    .prod-drhd .dwr-x{margin-left:auto;}
    .prod-drbody{padding:18px 24px 50px;}
    .prod-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:6px;}
    .prod-stats .stat{background:#fff;border:1px solid var(--line-soft);border-radius:11px;padding:11px 12px;}
    .prod-stats .stat b{font-size:16px;}
    .prod-lastused{font-size:13px;color:var(--ink-2);margin:10px 0 0;}
    .prod-curatebox{background:#fff;border:1.5px solid var(--line-soft);border-radius:14px;padding:16px 18px;}
    .prod-curatebox.on{border-color:var(--periwinkle);}
    .prod-curstat{display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--ink);margin-bottom:12px;}
    .prod-fees{display:flex;gap:24px;margin-bottom:12px;}
    .prod-fees span{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);}
    .prod-fees b{font-size:15px;}
    .prod-curhint{font-size:13px;color:var(--ink-2);line-height:1.5;margin:0 0 12px;}
    .prod-tierf{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
    .prod-tierf span{font-size:12.5px;font-weight:700;color:var(--ink-2);}
    .prod-tierf select{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;}
    .prod-curactions{display:flex;gap:10px;}

    /* ---- data health chip (sits in the Views row, matched to .svchip) ---- */
    #prodSaved #prodViewMode{margin-left:8px;}
    .dhchip{margin-left:auto;display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:12.5px;
      font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);
      border-radius:999px;padding:6px 13px;cursor:pointer;}
    .dhchip:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
    .dhchip b{font-weight:800;color:var(--ink);}
    .dhchip.bad b{color:#d33a22;}
    .dhmeter{width:34px;height:5px;border-radius:99px;background:var(--paper-2);overflow:hidden;flex:none;}
    .dhmeter u{display:block;height:100%;background:var(--periwinkle-deep);text-decoration:none;}
    .dhchip.bad .dhmeter u{background:#d33a22;}
    .dhchip[aria-expanded="true"]{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);}
    .dhpop{position:absolute;z-index:120;width:min(420px,calc(100vw - 24px));background:#fff;
      border:1px solid var(--line-soft);border-radius:14px;box-shadow:0 18px 46px rgba(20,22,45,.18);padding:16px 18px;}
    .dhpop-hd{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
    .dhpop-hd b{font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1;}
    .dhchip.bad ~ .dhpop .dhpop-hd b{color:#d33a22;}
    .dhpop-hd span{font-size:12.5px;color:var(--ink-2);font-weight:600;line-height:1.35;}
    .dhpop-hd em{display:block;font-style:normal;font-size:11px;color:var(--muted);}
    .dhpop-bars{display:grid;gap:6px;}
    .dh-bar{display:flex;align-items:center;gap:9px;font-size:11.5px;}
    .dh-bar span{color:var(--muted);font-weight:700;width:74px;flex:none;}
    .dh-bar i{flex:1;height:5px;background:var(--paper-2);border-radius:99px;overflow:hidden;}
    .dh-bar u{display:block;height:100%;background:var(--periwinkle-deep);text-decoration:none;}
    .dh-bar b{font-size:11.5px;font-weight:800;color:var(--ink-2);width:46px;text-align:right;flex:none;}
    .dhpop-note{font-size:12px;color:var(--ink-2);line-height:1.55;margin:12px 0 0;}
    .dhpop-acts{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px;padding-top:12px;border-top:1px solid var(--line-soft);}
    .dhpop-acts button{font:inherit;font-size:12px;font-weight:700;color:var(--ink-2);background:#fff;
      border:1.5px solid var(--line-soft);border-radius:999px;padding:5px 12px;cursor:pointer;}
    .dhpop-acts button:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}

    /* ---- gallery view ---- */
    /* Flowing grid — deliberately NO inner scroller. The page itself scrolls; the
       table needs one only because its thead is pinned by scroll offset. Lazy
       thumbnails still load: the loader listens for window scroll and measures
       against innerHeight. */
    .prodgal-wrap{padding:2px 2px 6px;}
    .pgal{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px;margin-bottom:6px;}
    @media(max-width:1600px){.pgal{grid-template-columns:repeat(5,minmax(0,1fr));}}
    @media(max-width:1320px){.pgal{grid-template-columns:repeat(4,minmax(0,1fr));}}
    @media(max-width:1040px){.pgal{grid-template-columns:repeat(3,minmax(0,1fr));}}
    @media(max-width:760px){.pgal{grid-template-columns:repeat(2,minmax(0,1fr));}}
    .pgacts{position:absolute;right:8px;bottom:8px;z-index:3;display:flex;gap:5px;opacity:0;transition:opacity .15s;}
    .pgcard:hover .pgacts,.pgacts:focus-within{opacity:1;}
    .pgacts .iconbtn{width:28px;height:28px;display:grid;place-items:center;padding:0;background:#fff;
      border:1px solid var(--line-soft);border-radius:8px;color:var(--ink-3);cursor:pointer;box-shadow:0 1px 4px rgba(20,22,45,.12);}
    .pgacts .iconbtn:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
    .pgacts .icn{width:15px;height:15px;}
    .pgcard{position:relative;background:#fff;border:1px solid var(--line-soft);border-radius:13px;overflow:hidden;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s;}
    .pgcard:hover{border-color:var(--periwinkle);box-shadow:0 6px 20px rgba(20,22,45,.09);}
    .pgcard.sel{border-color:var(--periwinkle-deep);box-shadow:0 0 0 2px var(--periwinkle-deep) inset;}
    .pgcard.kbcur{border-color:var(--flare);box-shadow:0 0 0 2px var(--flare);}
    .pgimg{position:relative;aspect-ratio:1;background:#fff;border-bottom:1px solid var(--paper-2);display:grid;place-items:center;overflow:hidden;}
    .pgimg img{position:absolute;inset:12px;width:calc(100% - 24px);height:calc(100% - 24px);object-fit:contain;margin:auto;}
    .pgnone{font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--line);}
    .pgchk{position:absolute;top:8px;left:8px;z-index:2;background:rgba(255,255,255,.94);border-radius:7px;padding:4px;display:grid;place-items:center;box-shadow:0 1px 4px rgba(20,22,45,.12);}
    .pgchk input{width:15px;height:15px;cursor:pointer;accent-color:var(--periwinkle-deep);display:block;}
    .pgtag{position:absolute;top:9px;right:9px;z-index:2;}
    .pgbody{padding:11px 12px 12px;display:flex;flex-direction:column;gap:6px;}
    .pgname{font-family:var(--serif);font-weight:500;font-size:14px;line-height:1.25;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;;color:var(--ink);text-decoration:none;}
    .pgname:hover{color:var(--periwinkle-deep);text-decoration:underline;}
    .pgmeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .pgsup{font-size:11px;font-weight:700;color:var(--muted);}
    .pgsubs{min-height:19px;}
    .pgfoot{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
    .pgprice{font-size:14.5px;font-weight:800;color:var(--ink);}
    .pgml{font-size:10.5px;color:var(--muted);font-weight:600;white-space:nowrap;}
    .pgbot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid var(--paper-2);}
    .galempty{text-align:center;color:var(--muted);padding:40px;font-size:13.5px;}

    /* ---- completeness dots ---- */
    .compdots{display:inline-flex;align-items:center;gap:3px;cursor:help;}
    .compdots i{width:6px;height:6px;border-radius:50%;background:var(--line);display:block;}
    .compdots i.on{background:var(--green-deep);}
    .compdots b{font-size:10.5px;font-weight:800;color:var(--muted);margin-left:3px;}
    .compdots.full b{color:var(--green-deep);}
    .compdots.low i{background:#f0c9c9;}
    .compdots.low i.on{background:#d33a22;}
    .compdots.low b{color:#d33a22;}

    /* ---- bigger table thumb + hover enlarge ---- */
    .orgcell span.prodref{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--ink-3);margin:2px 0 3px;}
    .prodtbl .orgcell span{color:var(--ink-3);}
    .prodlink{color:inherit;text-decoration:none;}
    .prodlink:hover{color:var(--periwinkle-deep);text-decoration:underline;}
    .suplink{font:inherit;font-size:inherit;color:var(--ink);background:none;border:0;padding:0;text-align:left;cursor:pointer;text-decoration:none;}
    .suplink:hover{color:var(--periwinkle-deep);text-decoration:underline;}
    .prodtbl tbody td{padding-top:25px;padding-bottom:25px;}
    .prodtbl .prodthumb{width:162px;height:162px;font-size:48px;border-radius:14px;}
    .prodtbl .prodthumb[data-zoom]:not([data-zoom=""]){cursor:zoom-in;}
    /* Spearmint header row — the exact brand swatch, so the type is ink, not white */
    .prodtbl thead th{background:var(--spearmint,#36C0A0);color:var(--ink);border-bottom:0;box-shadow:none;}
    .prodtbl thead th .sortbtn,.prodtbl thead th .icn,.prodtbl thead th svg{color:var(--ink);opacity:.8;}
    .prodtbl thead th:hover{color:var(--ink);}
    .prodtbl thead th input[type="checkbox"]{accent-color:var(--ink);}
    .thumbzoom{position:fixed;z-index:400;width:320px;height:320px;background:#fff;border:1px solid var(--line-soft);border-radius:14px;box-shadow:0 18px 50px rgba(20,22,45,.24);padding:14px;opacity:0;transform:scale(.97);transition:opacity .12s,transform .12s;pointer-events:none;}
    .thumbzoom.on{opacity:1;transform:none;}
    .thumbzoom img{width:100%;height:100%;object-fit:contain;display:block;}
    .prodtbl tr.kbcur td{background:#fff7f5;box-shadow:inset 2px 0 0 var(--flare);}

    /* ---- saved views ---- */
    .savedviews{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 12px;}
    .svlbl{font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-right:2px;}
    .svchip{position:relative;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:6px 13px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;}
    .svchip:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
    .svchip.on{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;}
    .svchip b{font-size:14px;line-height:1;opacity:.55;font-weight:600;}
    .svchip b:hover{opacity:1;color:var(--flare);}
    .svchip.on b:hover{color:#fff;}
    .svsave{font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);background:none;border:1.5px dashed var(--line);border-radius:999px;padding:6px 13px;cursor:pointer;}
    .svsave:hover{border-color:var(--periwinkle-deep);border-style:solid;}

    /* ---- grouping ---- */
    .grouprow td{background:var(--paper-2)!important;padding:0!important;}
    .gtoggle{display:flex;align-items:center;gap:8px;width:100%;font:inherit;font-size:12.5px;font-weight:800;color:var(--ink);background:none;border:0;padding:9px 14px;cursor:pointer;text-align:left;}
    .gtoggle em{font-style:normal;font-size:10.5px;font-weight:800;color:var(--muted);background:#fff;border-radius:999px;padding:2px 8px;}
    .gcar{font-size:10px;color:var(--muted);transition:transform .15s;}
    .gtoggle.off .gcar{transform:rotate(-90deg);}
    .ggrouphd{margin:4px 0 10px;border-bottom:1px solid var(--line-soft);}
    .ggrouphd .gtoggle{padding:8px 2px;font-size:13.5px;}

    /* ---- keyboard help ---- */
    .kbhelp{position:fixed;right:26px;bottom:26px;z-index:400;background:#fff;border:1px solid var(--line-soft);border-radius:14px;box-shadow:0 18px 50px rgba(20,22,45,.2);padding:14px 16px;width:250px;}
    .kbhelp-hd{font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:9px;}
    .kbrow{display:flex;align-items:center;gap:10px;padding:4px 0;font-size:12.5px;color:var(--ink-2);}
    .kbrow kbd{font-family:var(--sans);font-size:10.5px;font-weight:800;background:var(--paper-2);border-radius:5px;padding:3px 7px;color:var(--ink);white-space:nowrap;min-width:52px;text-align:center;}

    /* ---- selection tray ---- */
    .bulktray{background:#fff;color:var(--periwinkle-deep);border:0;border-radius:9px;font:inherit;font-size:12.5px;font-weight:800;padding:7px 12px;cursor:pointer;}
    .trayacts{display:flex;gap:9px;margin-bottom:16px;}
    .traygrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
    .trayitem{position:relative;background:#fff;border:1px solid var(--line-soft);border-radius:11px;padding:9px;}
    .trayimg{aspect-ratio:1;background:#fff;border-radius:7px;display:grid;place-items:center;overflow:hidden;margin-bottom:7px;}
    .trayimg img{width:100%;height:100%;object-fit:contain;}
    .trayitem b{display:block;font-size:12px;font-weight:700;line-height:1.3;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .trayitem>span{font-size:10.5px;color:var(--muted);font-weight:600;}
    .traymeta{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap;}
    .trayrm{position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:50%;border:0;background:rgba(255,255,255,.95);box-shadow:0 1px 4px rgba(20,22,45,.16);font-size:14px;line-height:1;color:var(--muted);cursor:pointer;}
    .trayrm:hover{color:var(--flare);}

    /* ---- drawer prev/next ---- */
    .drnav{display:flex;align-items:center;gap:4px;margin-left:auto;}
    .drnavbtn{width:28px;height:28px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:15px;line-height:1;color:var(--ink-2);cursor:pointer;}
    .drnavbtn:hover:not(:disabled){border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);}
    .drnavbtn:disabled{opacity:.35;cursor:default;}
    .drnavct{font-size:10.5px;font-weight:700;color:var(--muted);padding:0 3px;white-space:nowrap;}
    `;
    document.head.appendChild(st);
  })();

  // Defer the heavy products-table render (200 rows + thumbnails) until the
  // panel is first opened — keeps ~3k nodes + 200 <img> out of the initial DOM.
  // Only the cheap nav-badge count is set eagerly; the nav-click listener below
  // renders on first (and every) open.
  function initBadge(){ const nav=document.getElementById('navProd'); if(nav&&window.MSCAT){ const n=MSCAT.stats().products; nav.textContent=n>999?'1k+':n; } }
  function init(){ initBadge(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('click',e=>{ if(e.target.closest('[data-nav="products"]')) setTimeout(render,0); });
  // deep-link from a supplier drawer: show the database filtered to that supplier
  function openSupplier(name){ filt={q:'',supplier:name,dept:'',sub:'',brand:'',tag:'',colour:'',view:'',img:'',comp:'',sort:'imported',dir:-1};
    const nav=document.querySelector('.anav[data-nav="products"]'); if(nav) nav.click(); setTimeout(render,30); }
  window.MSProducts={ render, openSupplier };
})();
