/* ============================================================
   admin-products.js — Merchsmith master product DATABASE view.
   Reads the shared catalogue (window.MSCAT). Browse every
   supplier's products in one place, see usage data, and see /
   toggle Curated-range membership. Renders into #panel-products.
   ============================================================ */
(function(){
  if(!window.MSCAT) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const gbp0=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();
  const TIERS=[['standard','Standard',25,0],['featured','Featured',60,140],['spotlight','Spotlight',120,340]];
  const TIERLBL={standard:'Standard',featured:'Featured',spotlight:'Spotlight'};
  const TIERFEES={standard:[25,0],featured:[60,140],spotlight:[120,340]};

  let filt={q:'',supplier:'',dept:'',sub:'',brand:'',view:'',img:'',sort:'name',dir:1};
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
  // hideable columns (Product, checkbox and actions are always shown)
  const COLS=[
    {k:'supplier',label:'Supplier',sort:'supplier',cell:p=>esc(p.supplier)},
    {k:'dept',label:'Dept',sort:'dept',cell:p=>`<span class="deptpill">${p.dept}</span>`},
    {k:'sub',label:'Sub-categories',cell:p=>subcatCell(p)},
    {k:'brand',label:'Brand',sort:'brand',cell:p=>{const b=window.MSBRANDS?MSBRANDS.brandOf(p.id):'';return b?`<span class="brandtag">${esc(b)}</span>`:'<span class="prod-never">—</span>';}},
    {k:'price',label:'From',sort:'price',cls:'scell',cell:p=>`<b>${p.priceFrom?gbp(p.priceFrom):'<span class="prod-never">POA</span>'}</b>`},
    {k:'moq',label:'MOQ',sort:'moq',cls:'scell',cell:p=>p.moq?p.moq.toLocaleString():'—'},
    {k:'lead',label:'Lead',sort:'lead',cls:'scell',cell:p=>p.lead?p.lead+'d':'—'},
    {k:'eco',label:'Eco',sort:'eco',cls:'scell',cell:p=>`<span class="ecobadge ${p.sustainability>=8?'hi':p.sustainability<=5?'lo':''}">♻ ${p.sustainability}</span>`},
    {k:'usage',label:'Used in',sort:'usage',cls:'scell',cell:p=>p.usage.projects?`<span class="usecell"><b>${p.usage.units.toLocaleString()}</b><span>${p.usage.projects} proj · ${p.usage.orders} ord</span></span>`:'<span class="prod-never">never</span>'},
    {k:'created',label:'Created',sort:'created',cls:'scell datecell',cell:p=>fmtD(p.created)},
    {k:'imported',label:'Imported',sort:'imported',cls:'scell datecell',cell:p=>p.imported?fmtD(p.imported):'<span class="prod-never">—</span>'},
    {k:'curated',label:'Curated',sort:'curated',cell:p=>p.curated
      ?`<span class="curcell"><select class="curtier-tbl ${p.promoted?'promo':''}" data-tblcurtier="${p.id}" onclick="event.stopPropagation()">${Object.keys(TIERLBL).map(v=>`<option value="${v}" ${ (p.curation&&p.curation.tier)===v?'selected':''}>${TIERLBL[v]}</option>`).join('')}</select><button class="curq rm" data-tblcurrm="${p.id}" onclick="event.stopPropagation()" title="Remove from curated range">×</button></span>`
      :`<button class="curq add" data-tblcuradd="${p.id}" onclick="event.stopPropagation()">＋ Add</button>`}
  ];
  const visCols=()=>COLS.filter(c=>!hiddenCols.has(c.k));
  function panel(){ return document.getElementById('panel-products'); }

  function render(){
    const p=panel(); if(!p) return;
    const st=MSCAT.stats(); const rev=MSCAT.curatedRevenue();
    p.innerHTML=`
      <div class="phead"><h1 class="ptitle">Product database</h1><div class="phead-acts"><button class="btn ghost" id="prodBrands">Manage brands</button><button class="btn" id="prodImport">＋ Import from feed</button></div></div>
      <p class="psub">Every supplier product Merchsmith ingests — one master catalogue. Browse, track usage, and manage the Curated range.</p>
      <div class="statbar">
        <div class="sb" data-v=""><b>${st.products.toLocaleString()}</b><span>Products</span></div>
        <div class="sb" data-v=""><b>${st.suppliers}</b><span>Suppliers</span></div>
        <div class="sb pv" data-v="curated"><b>${st.curated.toLocaleString()}</b><span>In curated range</span></div>
        <div class="sb pv" data-v="promoted"><b>${st.promoted.toLocaleString()}</b><span>Promoted</span></div>
        <div class="sb"><b>${gbp0(rev.total)}</b><span>Curated rev / mo</span></div>
      </div>
      <div class="toolbar">
        <div class="search"><svg class="icn"><use href="#a-search"/></svg><input id="prodSearch" placeholder="Search by name, SKU code, supplier…" value="${esc(filt.q)}"></div>
        <select class="prod-sel" id="prodSup"><option value="">All suppliers</option>${MSCAT.suppliers().map(s=>`<option value="${esc(s.name)}" ${filt.supplier===s.name?'selected':''}>${esc(s.name)} (${s.count})</option>`).join('')}</select>
        <select class="prod-sel" id="prodDept"><option value="">All departments</option>${MSCAT.depts().map(d=>`<option value="${d}" ${filt.dept===d?'selected':''}>${d}</option>`).join('')}</select>
        <select class="prod-sel" id="prodSub"><option value="">All sub-categories</option>${(window.MSSTORE?MSSTORE.departments():[]).map(d=>{const subs=MSSTORE.subcatsOf(d.id);return subs.length?`<optgroup label="${esc(d.name)}">${subs.map(s=>`<option value="${d.id}:${s.id}" ${filt.sub===d.id+':'+s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</optgroup>`:'';}).join('')}</select>
        <select class="prod-sel" id="prodBrand"><option value="">All brands</option><option value="__none" ${filt.brand==='__none'?'selected':''}>— Untagged —</option>${(window.MSBRANDS?MSBRANDS.list():[]).map(b=>`<option ${filt.brand===b?'selected':''}>${esc(b)}</option>`).join('')}</select>
        <div class="fbtns" id="prodViews">
          <button class="fbtn ${filt.view===''?'on':''}" data-v="">All</button>
          <button class="fbtn ${filt.view==='curated'?'on':''}" data-v="curated">Curated</button>
          <button class="fbtn ${filt.view==='promoted'?'on':''}" data-v="promoted">Promoted</button>
          <button class="fbtn ${filt.view==='unused'?'on':''}" data-v="unused">Never used</button>
        </div>
        <div class="fbtns" id="prodImgViews">
          <button class="fbtn ${filt.img==='yes'?'on':''}" data-img="yes">With image</button>
          <button class="fbtn ${filt.img==='no'?'on':''}" data-img="no">No image</button>
        </div>
        <div class="fbtns">
          <button class="fbtn" id="prodCols">Columns ▾</button>
          <button class="fbtn ${density==='compact'?'on':''}" id="prodDensity">Compact</button>
        </div>
      </div>
      <div id="prodChips">${chipsHtml()}</div>
      <div id="prodBulk" class="bulkbar" hidden></div>
      <div class="prodtbl-wrap"><table class="dirtable prodtbl ${density==='compact'?'compact':''}"><thead><tr>
        <th class="chkcol"><input type="checkbox" id="prodChkAll" aria-label="Select all"></th>
        <th class="sortable" data-sort="name">Product</th>
        ${visCols().map(c=>`<th class="${c.sort?'sortable ':''}${c.cls||''}" ${c.sort?`data-sort="${c.sort}"`:''}>${c.label}</th>`).join('')}
        <th></th>
      </tr></thead><tbody id="prodRows"></tbody></table></div>
      <div class="prodtbl-foot" id="prodFoot"></div>`;
    renderRows();
    p.querySelector('#prodSearch').oninput=e=>{ filt.q=e.target.value; page=1; renderRows(); };
    p.querySelector('#prodSup').onchange=e=>{ filt.supplier=e.target.value; page=1; renderRows(); };
    p.querySelector('#prodDept').onchange=e=>{ filt.dept=e.target.value; page=1; renderRows(); };
    const sub=p.querySelector('#prodSub'); if(sub)sub.onchange=e=>{ filt.sub=e.target.value; page=1; renderRows(); };
    const br=p.querySelector('#prodBrand'); if(br)br.onchange=e=>{ filt.brand=e.target.value; page=1; renderRows(); };
    p.querySelectorAll('#prodViews .fbtn').forEach(b=>b.onclick=()=>{ filt.view=b.dataset.v; page=1; render(); });
    p.querySelectorAll('#prodImgViews .fbtn').forEach(b=>b.onclick=()=>{ filt.img=(filt.img===b.dataset.img?'':b.dataset.img); page=1; render(); });
    p.querySelectorAll('.statbar .pv').forEach(b=>b.onclick=()=>{ filt.view=b.dataset.v; page=1; render(); });
    p.querySelectorAll('.prodtbl th.sortable').forEach(th=>{ const k=th.dataset.sort; if(k===filt.sort) th.classList.add('sorted-'+(filt.dir>0?'asc':'desc')); th.onclick=()=>{ if(filt.sort===k) filt.dir=-filt.dir; else { filt.sort=k; filt.dir=1; } page=1; render(); }; });
    const imp=p.querySelector('#prodImport'); if(imp)imp.onclick=()=>{ if(window.MSImport)MSImport.open(); };
    const mb=p.querySelector('#prodBrands'); if(mb)mb.onclick=openBrandManager;
    // pinned header: position:sticky on table cells is broken in some Chromium builds,
    // so we pin by translating the thead with the wrap's scroll offset (works everywhere)
    const wrapEl=p.querySelector('.prodtbl-wrap'), theadEl=p.querySelector('.prodtbl thead');
    if(wrapEl&&theadEl) wrapEl.onscroll=()=>{ theadEl.style.transform='translateY('+wrapEl.scrollTop+'px)'; };
    const cbtn=p.querySelector('#prodCols'); if(cbtn)cbtn.onclick=e=>{ e.stopPropagation(); openColMenu(); };
    const dbtn=p.querySelector('#prodDensity'); if(dbtn)dbtn.onclick=()=>{ density=density==='compact'?'comfy':'compact'; setPref({density}); render(); };
    p.querySelectorAll('[data-chip]').forEach(b=>{}); // (chip clicks are delegated below)
    const chipBox=p.querySelector('#prodChips');
    if(chipBox) chipBox.onclick=e=>{ const b=e.target.closest('[data-chip]'); if(!b) return; const k=b.dataset.chip; if(k==='all'){ filt.q='';filt.supplier='';filt.dept='';filt.sub='';filt.brand='';filt.view='';filt.img=''; } else filt[k]=''; page=1; render(); };
    const nav=document.getElementById('navProd'); if(nav) nav.textContent=st.products>999?'1k+':st.products;
  }
  function chipsHtml(){
    const VIEWLBL={curated:'Curated',promoted:'Promoted',unused:'Never used'};
    const chips=[];
    if(filt.q)chips.push(['q','“'+esc(filt.q)+'”']);
    if(filt.supplier)chips.push(['supplier',esc(filt.supplier)]);
    if(filt.dept)chips.push(['dept',esc(filt.dept)]);
    if(filt.sub&&window.MSSTORE){ const [did,sid]=filt.sub.split(':'); const s=MSSTORE.subcatsOf(did).find(x=>x.id===sid); chips.push(['sub',esc(s?s.name:'Sub-category')]); }
    if(filt.brand)chips.push(['brand',filt.brand==='__none'?'Untagged':esc(filt.brand)]);
    if(filt.view)chips.push(['view',VIEWLBL[filt.view]||filt.view]);
    if(filt.img)chips.push(['img',filt.img==='yes'?'With image':'No image']);
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
    if(filt.brand&&window.MSBRANDS){ const b=MSBRANDS.brandOf(p.id); if(filt.brand==='__none'){ if(b) return false; } else if(b!==filt.brand) return false; }
    if(filt.img==='yes'&&!p.image) return false;
    if(filt.img==='no'&&p.image) return false;
    if(filt.view==='curated'&&!p.curated) return false;
    if(filt.view==='promoted'&&!p.promoted) return false;
    if(filt.view==='unused'&&p.usage.projects>0) return false;
    if(filt.q){ const q=filt.q.toLowerCase(); if(!(p.name.toLowerCase().includes(q)||p.supplier.toLowerCase().includes(q)||String(p.code||'').toLowerCase().includes(q)||String(p.ean||'').toLowerCase().includes(q)||String(p.id||'').toLowerCase().includes(q))) return false; }
    return true;
  }
  const COLHEX={Black:'#1a1a1e',White:'#f4f4f0',Navy:'#2a3550',Grey:'#8a8a93',Natural:'#d8c3a0',Green:'#3a9d6b','Forest Green':'#2f6f4e','Sky Blue':'#7fb5e6',Burgundy:'#7a2233',Sand:'#d8c8a8',Charcoal:'#3a3a40',Blue:'#2f5ca8',Red:'#c0392b',Pink:'#e2a9ac',Yellow:'#e8c63a',Orange:'#e08a3a',Brown:'#7a5230',Purple:'#7a5ba8'};
  const DEPTID3={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
  function fmtD(iso){ if(!iso) return '<span class="prod-never">—</span>'; const d=new Date(iso+'T00:00'); const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${d.getDate()} ${mon[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; }
  function sortVal(p,k){ switch(k){ case 'name':return p.name.toLowerCase(); case 'supplier':return p.supplier.toLowerCase(); case 'dept':return p.dept; case 'brand':return (window.MSBRANDS?MSBRANDS.brandOf(p.id):'').toLowerCase(); case 'price':return p.priceFrom||0; case 'moq':return p.moq||0; case 'lead':return p.lead||0; case 'eco':return p.sustainability||0; case 'usage':return p.usage.units||0; case 'created':return p.created||''; case 'imported':return p.imported||''; case 'curated':return p.curated?(p.promoted?2:1):0; default:return 0; } }
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
    const imgs=_lazyScope.querySelectorAll('.prodthumb img[data-src]');
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
    const imgs=[...scope.querySelectorAll('.prodthumb img[data-src]')];
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
  function renderRows(){
    let rows=MSCAT.all().filter(match);
    rows.sort((a,b)=>{ const va=sortVal(a,filt.sort), vb=sortVal(b,filt.sort); if(va<vb)return -1*filt.dir; if(va>vb)return 1*filt.dir; return 0; });
    const body=document.getElementById('prodRows'); if(!body) return;
    const totalPages=Math.max(1,Math.ceil(rows.length/perPage));
    if(page>totalPages)page=totalPages; if(page<1)page=1;
    const start=(page-1)*perPage;
    const shown=rows.slice(start,start+perPage);
    lastRowIds=rows.map(p=>p.id); shownIds=shown.map(p=>p.id); lastChkIdx=null;
    const chipBox=document.getElementById('prodChips'); if(chipBox) chipBox.innerHTML=chipsHtml();
    body.innerHTML=shown.length?shown.map(p=>`<tr data-prod="${p.id}">
      <td class="chkcol"><input type="checkbox" class="prodchk" data-chk="${p.id}" ${sel.has(p.id)?'checked':''}></td>
      <td><div class="orgcell"><div class="prodthumb">${p.image?`<img data-src="${esc(p.image)}" alt="" decoding="async" onerror="this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div><div><b>${esc(p.name)}</b><span>${colourDots(p)}${p.real?' <em class="livetag">live</em>':p.ingested?' <em class="ingtag">imported</em>':''}</span></div></div></td>
      ${visCols().map(c=>`<td class="${c.cls||''}">${c.cell(p)}</td>`).join('')}
      <td><div class="rowact"><a class="iconbtn" href="Merchsmith Store.html#product=${encodeURIComponent(p.id)}" title="Open in store" onclick="event.stopPropagation()"><svg class="icn"><use href="#a-external"/></svg></a><button class="iconbtn" data-viewprod="${p.id}" title="Quick view"><svg class="icn"><use href="#a-eye"/></svg></button></div></td>
    </tr>`).join(''):`<tr><td colspan="${3+visCols().length}" style="text-align:center;color:var(--muted);padding:34px">No products match.</td></tr>`;
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
      const go=n=>{ page=n; renderRows(); const wrap=panel().querySelector('.prodtbl-wrap'); if(wrap)wrap.scrollTop=0; };
      foot.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(+b.dataset.page));
      const pv=foot.querySelector('#prodPrev'); if(pv)pv.onclick=()=>go(page-1);
      const nx=foot.querySelector('#prodNext'); if(nx)nx.onclick=()=>go(page+1);
      const pp=foot.querySelector('#prodPP'); if(pp)pp.onchange=()=>{ perPage=+pp.value; setPref({perPage}); page=1; renderRows(); };
    }
    { const rm=document.getElementById('prodRmNoImg'); if(rm) rm.onclick=()=>{ const sup=filt.supplier||''; const n=MSCAT.noImageCount(sup); if(!confirm('Remove '+n+' product'+(n===1?'':'s')+' that have no image'+(sup?(' from '+sup):'')+'? Back up first if unsure — this cannot be undone.'))return; const removed=MSCAT.removeUnimaged(sup); toast(`Removed ${removed} product${removed===1?'':'s'} with no image`); render(); }; }
    body.querySelectorAll('[data-viewprod]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openProduct(b.dataset.viewprod); });
    body.querySelectorAll('.prodchk').forEach((c,idx)=>c.onclick=e=>{ e.stopPropagation(); const id=c.dataset.chk;
      if(e.shiftKey && lastChkIdx!=null){ // shift-click: apply the clicked box's state to the whole range
        const [a,b]=[Math.min(lastChkIdx,idx),Math.max(lastChkIdx,idx)];
        for(let i=a;i<=b;i++){ const rid=shownIds[i]; if(c.checked)sel.add(rid); else sel.delete(rid); }
        renderRows();
      } else { if(c.checked)sel.add(id); else sel.delete(id); }
      lastChkIdx=idx; syncBulk(); });
    body.querySelectorAll('tr[data-prod]').forEach(r=>r.onclick=e=>{ if(e.target.closest('.chkcol'))return; openProduct(r.dataset.prod); });
    lazyThumbs(body);
    // inline curated controls (tier / add / remove)
    body.querySelectorAll('[data-tblcurtier]').forEach(s=>s.onchange=()=>{ const f=TIERFEES[s.value]; MSCAT.setCurated(s.dataset.tblcurtier,{tier:s.value,listFee:f[0],promoFee:f[1]}); toast(`Tier set to ${TIERLBL[s.value]}`); renderRows(); });
    body.querySelectorAll('[data-tblcuradd]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); MSCAT.setCurated(b.dataset.tblcuradd,{tier:'standard',listFee:25,promoFee:0}); toast('Added to curated range'); renderRows(); });
    body.querySelectorAll('[data-tblcurrm]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); MSCAT.removeCurated(b.dataset.tblcurrm); toast('Removed from curated range'); renderRows(); });
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
    bar.hidden=false;
    const pageAllSelected=shownIds.length&&shownIds.every(id=>sel.has(id));
    const moreAvailable=lastRowIds.filter(id=>!sel.has(id)).length;
    bar.innerHTML=`<span class="bulkn"><b>${sel.size.toLocaleString()}</b> selected${pageAllSelected&&moreAvailable?` <button class="bulkall" data-bulkall>Select all ${lastRowIds.length.toLocaleString()} matching</button>`:''}</span>
      <div class="bulkacts">
        <button class="btn sm" data-bulkadd ${nOut?'':'disabled title="Everything selected is already in the curated range"'}>＋ Add ${nOut.toLocaleString()} to curated range</button>
        <button class="btn ghost sm" data-bulkrm ${nIn?'':'disabled title="Nothing selected is in the curated range"'}>Remove ${nIn.toLocaleString()} from range</button>
        <select class="prod-sel sm" id="bulkDeptSel"><option value="">Move to department…</option>${MSCAT.depts().map(d=>`<option>${d}</option>`).join('')}</select>
        <select class="prod-sel sm" id="bulkBrandSel"><option value="">Tag brand…</option>${(window.MSBRANDS?MSBRANDS.list():[]).map(b=>`<option>${esc(b)}</option>`).join('')}<option value="__clear">— Clear brand —</option><option value="__new">+ New brand…</option></select>
        ${subOpts?`<select class="prod-sel sm" id="bulkSubSel"><option value="">Add to sub-category…</option>${subOpts}</select>`:''}
        ${nIng?`<button class="btn ghost sm bulkdanger" data-bulkdel>Delete ${nIng.toLocaleString()} imported…</button>`:''}
        <button class="bulkclear" data-bulkclear>Clear</button>
      </div>`;
    const ba=bar.querySelector('[data-bulkall]'); if(ba)ba.onclick=()=>{ lastRowIds.forEach(id=>sel.add(id)); renderRows(); syncBulk(); };
    const ds=bar.querySelector('#bulkDeptSel'); if(ds)ds.onchange=()=>{ const d=ds.value; if(!d)return; const ids=[...sel];
      const n=MSCAT.setDeptBulk?MSCAT.setDeptBulk(ids,d):0;
      // clear sub-category filings from the old department so they don't go stale
      if(window.MSSTORE&&MSSTORE.subcatsForProduct&&MSSTORE.toggleProductSubcat) ids.forEach(id=>MSSTORE.subcatsForProduct(id).forEach(sid=>MSSTORE.toggleProductSubcat(id,sid)));
      toast(`Moved ${Number(n).toLocaleString()} product${n===1?'':'s'} to ${d}`); render(); };
    const add=bar.querySelector('[data-bulkadd]'); if(add)add.onclick=()=>{ if(!nOut)return; const ids=picked.filter(p=>!p.curated).map(p=>p.id); const n=MSCAT.setCuratedBulk?MSCAT.setCuratedBulk(ids,{tier:'standard',listFee:25,promoFee:0}):(ids.forEach(id=>MSCAT.setCurated(id,{tier:'standard',listFee:25,promoFee:0})),ids.length); toast(`Added ${Number(n).toLocaleString()} product${n===1?'':'s'} to the curated range`); render(); };
    const rm=bar.querySelector('[data-bulkrm]'); if(rm)rm.onclick=()=>{ if(!nIn)return; const ids=picked.filter(p=>p.curated).map(p=>p.id); const n=MSCAT.removeCuratedBulk?MSCAT.removeCuratedBulk(ids):(ids.forEach(id=>MSCAT.removeCurated(id)),ids.length); toast(`Removed ${Number(n).toLocaleString()} product${n===1?'':'s'} from the curated range`); render(); };
    const del=bar.querySelector('[data-bulkdel]'); if(del)del.onclick=()=>{ const ids=picked.filter(p=>p.ingested).map(p=>p.id);
      if(!confirm(`Delete ${ids.length.toLocaleString()} imported product${ids.length===1?'':'s'} from the database? Live and sample products in your selection are unaffected. This cannot be undone — back up first if unsure (Settings → Data backup).`)) return;
      const n=MSCAT.removeProducts?MSCAT.removeProducts(ids):0; ids.forEach(id=>sel.delete(id));
      toast(`Deleted ${Number(n).toLocaleString()} imported product${n===1?'':'s'}`); render(); };
    bar.querySelector('[data-bulkclear]').onclick=()=>{ sel.clear(); renderRows(); };
    const bs=bar.querySelector('#bulkBrandSel'); if(bs)bs.onchange=()=>{ let v=bs.value; if(!v)return; if(v==='__new'){ const n=prompt('New brand name:'); if(n){ MSBRANDS.add(n); v=n.trim(); } else { bs.value=''; return; } } if(v==='__clear')v=''; MSBRANDS.setBrandBulk([...sel], v); toast(v?`Tagged ${sel.size} product${sel.size===1?'':'s'} as ${v}`:`Cleared brand on ${sel.size} product${sel.size===1?'':'s'}`); render(); };
    const ss=bar.querySelector('#bulkSubSel'); if(ss)ss.onchange=()=>{ const v=ss.value; if(!v)return; const [did,subId]=v.split(':'); const ids=picked.filter(p=>(DEPT_ID[p.dept]||(p.dept||'').toLowerCase())===did).map(p=>p.id); MSSTORE.addProductsToSubcat(ids,subId); const s=MSSTORE.subcatsOf(did).find(x=>x.id===subId); toast(`Added ${ids.length} product${ids.length===1?'':'s'} to ${s?s.name:'sub-category'}`); ss.value=''; };
  }

  const DEPT_ID2={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
  function deptIdOf(p){ return DEPT_ID2[p.dept]||(p.dept||'').toLowerCase(); }
  function subcatPicker(p){
    if(!window.MSSTORE) return '—';
    const did=deptIdOf(p); const subs=MSSTORE.subcatsOf(did);
    if(!subs.length) return `<span class="prod-never">No sub-categories in ${esc(p.dept)} yet</span>`;
    const on=MSSTORE.subcatsForProduct(p.id);
    return `<div class="subchips">${subs.map(s=>`<button type="button" class="subchip ${on.includes(s.id)?'on':''}" data-subtoggle="${did}:${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
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
    pk.innerHTML=`<div class="prod-dr"><div class="prod-drhd"><div class="prodthumb lg">${p.image?`<img src="${esc(p.image)}" alt="" onerror="this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div><div><h2>${esc(p.name)}</h2><span>${esc(p.supplier)} · ${p.dept}${p.cat?' · '+esc(p.cat):''}${p.real?' · live product':''}</span></div><button class="dwr-x" data-px>×</button></div>
      <div class="prod-drbody">
        <div class="prod-stats"><div class="stat"><b>${p.priceFrom?gbp(p.priceFrom):'POA'}</b><span>From / unit</span></div><div class="stat"><b>${p.lead}d</b><span>Lead</span></div><div class="stat"><b>♻ ${p.sustainability}/10</b><span>Eco</span></div><div class="stat"><b>${p.moq?p.moq.toLocaleString():'—'}</b><span>MOQ</span></div></div>
        <div class="dwr-sec"><h4>Usage across the platform</h4>
          <div class="prod-stats"><div class="stat"><b>${p.usage.projects}</b><span>Projects</span></div><div class="stat"><b>${p.usage.orders}</b><span>Orders</span></div><div class="stat"><b>${p.usage.units.toLocaleString()}</b><span>Units ordered</span></div></div>
          <p class="prod-lastused">Last used: <b>${p.usage.lastUsed}</b></p>
        </div>
        <div class="dwr-sec"><h4>Attributes</h4><div class="kv">
          <span class="k">Brand</span><span class="v"><select id="prodBrandSel" class="prod-sel sm"><option value="">— none —</option>${(window.MSBRANDS?MSBRANDS.list():[]).map(b=>`<option ${MSBRANDS.brandOf(p.id)===b?'selected':''}>${esc(b)}</option>`).join('')}<option value="__new">+ New brand…</option></select></span>
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
        <div class="dwr-sec prod-curatebox ${inRange?'on':''}">
          <h4>Merchsmith Curated range</h4>
          ${inRange?`<div class="prod-curstat"><svg class="icn" style="width:15px;height:15px;stroke:var(--green-deep)"><path d="M4 12.5 9.5 18 20 6.5"/></svg>In the curated range · <b>${TIERLBL[cur.tier]||'Standard'}</b> tier</div>
            <div class="prod-fees"><div><span>Listing fee</span><b>${gbp0(cur.listFee||0)}/mo</b></div><div><span>Promotion</span><b>${cur.promoFee?gbp0(cur.promoFee)+'/mo':'—'}</b></div></div>
            <label class="prod-tierf"><span>Placement tier</span><select id="prodTier">${TIERS.map(([v,l,lf,pf])=>`<option value="${v}" ${cur.tier===v?'selected':''}>${l} — ${gbp0(lf)}/mo${pf?` + ${gbp0(pf)} promo`:''}</option>`).join('')}</select></label>
            <div class="prod-curactions"><button class="btn ghost sm" id="prodRemove">Remove from range</button></div>`
            :`<p class="prod-curhint">Not in the curated range. Suppliers pay a listing fee to appear, and more to be promoted.</p>
            <label class="prod-tierf"><span>Add at tier</span><select id="prodTier">${TIERS.map(([v,l,lf,pf])=>`<option value="${v}">${l} — ${gbp0(lf)}/mo${pf?` + ${gbp0(pf)} promo`:''}</option>`).join('')}</select></label>
            <div class="prod-curactions"><button class="btn sm" id="prodAdd">Add to curated range</button></div>`}
        </div>
      </div></div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-px]')) cx(); });
    const tierSel=()=>{ const t=document.getElementById('prodTier').value; const def=TIERS.find(x=>x[0]===t); return {tier:t,listFee:def[2],promoFee:def[3]}; };
    const add=pk.querySelector('#prodAdd'); if(add)add.onclick=()=>{ MSCAT.setCurated(id,tierSel()); toast(`“${p.name}” added to the curated range`); render(); openProduct(id); };
    const bsel=pk.querySelector('#prodBrandSel'); if(bsel)bsel.onchange=()=>{ let v=bsel.value; if(v==='__new'){ const n=prompt('New brand name:'); if(n){ MSBRANDS.add(n); v=n.trim(); } else { bsel.value=MSBRANDS.brandOf(id); return; } } MSBRANDS.setBrand(id, v); toast(v?`Tagged as ${v}`:'Brand cleared'); render(); openProduct(id); };
    const dsel=pk.querySelector('#prodDeptSel'); if(dsel)dsel.onchange=()=>{ const d=dsel.value; if(d===p.dept)return; if(MSCAT.setDeptBulk){ MSCAT.setDeptBulk([id],d); if(window.MSSTORE&&MSSTORE.subcatsForProduct&&MSSTORE.toggleProductSubcat) MSSTORE.subcatsForProduct(id).forEach(sid=>MSSTORE.toggleProductSubcat(id,sid)); toast(`Moved to ${d}`); render(); openProduct(id); } };
    pk.querySelectorAll('[data-subtoggle]').forEach(b=>b.onclick=()=>{ const [,subId]=b.dataset.subtoggle.split(':'); MSSTORE.toggleProductSubcat(id, subId); b.classList.toggle('on'); });
    const rem=pk.querySelector('#prodRemove'); if(rem)rem.onclick=()=>{ MSCAT.removeCurated(id); toast(`“${p.name}” removed from the curated range`); render(); openProduct(id); };
    const ts=pk.querySelector('#prodTier'); if(ts&&inRange)ts.onchange=()=>{ MSCAT.setCurated(id,tierSel()); render(); openProduct(id); };
  }

  /* ---------- styles ---------- */
  (function(){ if(document.getElementById('prod-style'))return; const st=document.createElement('style'); st.id='prod-style';
    st.textContent=`
    .prod-sel{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;color:var(--ink);}
    .chkcol{width:38px;text-align:center;}
    .chkcol input{width:16px;height:16px;cursor:pointer;accent-color:var(--periwinkle-deep);}
    .bulkbar{display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--periwinkle-deep);color:#fff;border-radius:12px;padding:11px 16px;margin-bottom:12px;}
    .bulkbar[hidden]{display:none;}
    .bulkn b{font-size:16px;}
    .bulkacts{display:flex;align-items:center;gap:9px;}
    .bulkbar .btn{background:#fff;color:var(--periwinkle-deep);}
    .bulkbar .btn.ghost{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5);}
    .bulkbar .btn:disabled{opacity:.45;cursor:default;}
    .bulkclear{background:none;border:0;color:#fff;font:inherit;font-size:13px;font-weight:700;text-decoration:underline;cursor:pointer;opacity:.85;}
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
    .brandtag{font-size:11px;font-weight:700;color:var(--ink-2);background:var(--paper-2);border-radius:6px;padding:2px 8px;}
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
    .prodtbl.compact tbody td{padding-top:5px;padding-bottom:5px;font-size:12.5px;}
    .prodtbl.compact .prodthumb{width:32px;height:32px;font-size:13px;border-radius:7px;}
    .prodtbl.compact .orgcell b{font-size:12.5px;}
    .prodtbl.compact .usecell b{font-size:12px;}
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
    .prodtbl tbody tr:hover{background:var(--paper-2);}
    .cdots{display:inline-flex;align-items:center;gap:3px;}
    .cdots i{width:10px;height:10px;border-radius:50%;display:inline-block;}
    .cdots em{font-style:normal;font-size:10px;color:var(--muted);margin-left:2px;}
    .livetag,.ingtag{font-style:normal;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;border-radius:4px;padding:1px 5px;margin-left:5px;}
    .livetag{background:var(--tint-green);color:var(--green-deep);}
    .ingtag{background:var(--tint-peri);color:var(--periwinkle-deep);}
    .deptpill{font-size:11.5px;font-weight:600;background:var(--paper-2);border-radius:6px;padding:2px 9px;white-space:nowrap;}
    .subcell{display:inline-flex;gap:4px;flex-wrap:wrap;}
    .subpill{font-size:10.5px;font-weight:600;color:var(--periwinkle-deep);background:var(--tint-peri);border-radius:6px;padding:2px 7px;white-space:nowrap;}
    .subpill.more{color:var(--muted);background:var(--paper-2);}
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
    #bulkBrandSel{font-size:12.5px;padding:6px 8px;}
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
    .prod-dr{position:fixed;top:0;right:0;height:100vh;width:min(480px,100%);background:var(--paper);box-shadow:-20px 0 60px rgba(20,22,45,.3);transform:translateX(100%);transition:transform .24s cubic-bezier(.22,.61,.36,1);overflow-y:auto;}
    .prod-scrim.open .prod-dr{transform:none;}
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
  function openSupplier(name){ filt={q:'',supplier:name,dept:'',sub:'',brand:'',view:'',img:'',sort:'imported',dir:-1};
    const nav=document.querySelector('.anav[data-nav="products"]'); if(nav) nav.click(); setTimeout(render,30); }
  window.MSProducts={ render, openSupplier };
})();
