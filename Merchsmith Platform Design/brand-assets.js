/* ============================================================
   brand-assets.js — Customer Brand Assets library
   One page, hash-routed sub-sections (matches the sidebar):
     #cat=guidelines | logos | colours | fonts | images | artwork
   Renders into #view. Platform styling (tokens.css + brand-assets.css).
   Persists user edits to localStorage('ms-brand-assets').
   NOTE: "Studio" customer role (edit/add rights) is documented only —
   edit affordances show for everyone in this prototype.
   ============================================================ */
(function(){
  'use strict';
  const view=document.getElementById('view');
  const esc=s=>(''+(s==null?'':s)).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2200); }; })();
  window.MStoast = window.MStoast || toast;

  const CATS=[
    {id:'guidelines', name:'Brand Guidelines', add:'Guideline'},
    {id:'logos',      name:'Logo Types',       add:'Logo Type'},
    {id:'colours',    name:'Colours',          add:'Colour'},
    {id:'fonts',      name:'Fonts',            add:'Font'},
    {id:'images',     name:'Images',           add:'Image'},
    {id:'artwork',    name:'Product Artwork',  add:'Artwork'}
  ];

  // ---------- seed (real colours/fonts; placeholder images) ----------
  const SEED={
    colours:[
      {id:'c-black', name:'Black',         hex:'#1A1A1E', pantone:'Pantone Black 6 C', cmyk:'0 / 0 / 0 / 100', status:'approved'},
      {id:'c-sea',   name:'Sea Blue',      hex:'#2F5CA8', pantone:'Pantone 2132 C',    cmyk:'88 / 62 / 0 / 9',  status:'approved'},
      {id:'c-green', name:'Summer Green',  hex:'#6FC5A6', pantone:'Pantone 570 C',     cmyk:'53 / 0 / 28 / 0',  status:'approved'},
      {id:'c-white', name:'White',         hex:'#FFFFFF', pantone:'—',                 cmyk:'0 / 0 / 0 / 0',    status:'approved'},
      {id:'c-pink',  name:'Relaxed Pink',  hex:'#E2A9AC', pantone:'Pantone 4995 C',    cmyk:'0 / 35 / 18 / 0',  status:'draft'}
    ],
    fonts:[
      {id:'f-reg', name:'Gill Sans Regular', stack:'"Gill Sans","Gill Sans MT",Calibri,sans-serif', weight:400, fmt:'.ttf', size:'412 KB', status:'approved'},
      {id:'f-bold',name:'Gill Sans Bold',    stack:'"Gill Sans","Gill Sans MT",Calibri,sans-serif', weight:800, fmt:'.ttf', size:'418 KB', status:'approved'}
    ],
    logos:[
      {id:'l-black', name:'Logo — black on white', img:'brand-logo-1', fmts:['.eps','.svg','.png'], size:'1.47 MB', dims:'310 × 152 px', printColours:[{name:'Black',pantone:'Pantone Black 6 C',cmyk:'0 / 0 / 0 / 100'}], status:'approved'},
      {id:'l-white', name:'Logo — white on black', img:'brand-logo-2', fmts:['.eps','.svg','.png'], size:'1.87 MB', dims:'310 × 152 px', printColours:[{name:'White',pantone:'—',cmyk:'0 / 0 / 0 / 0'},{name:'Black',pantone:'Pantone Black 6 C',cmyk:'0 / 0 / 0 / 100'}], status:'approved'},
      {id:'l-blue',  name:'Logo — white on blue',  img:'brand-logo-3', fmts:['.eps','.png'],        size:'1.87 MB', dims:'310 × 152 px', printColours:[{name:'Sea Blue',pantone:'Pantone 2132 C',cmyk:'88 / 62 / 0 / 9'},{name:'White',pantone:'—',cmyk:'0 / 0 / 0 / 0'}], status:'draft'}
    ],
    images:[
      {id:'im-1', name:'Lifestyle — towpath', img:'brand-img-1', fmts:['.jpg'], size:'3.2 MB', dims:'2400 × 1600 px', status:'approved'},
      {id:'im-2', name:'Lifestyle — volunteers', img:'brand-img-2', fmts:['.jpg'], size:'2.8 MB', dims:'2400 × 1600 px', status:'approved'},
      {id:'im-3', name:'Pattern — ripple', img:'brand-img-3', fmts:['.png','.svg'], size:'640 KB', dims:'1200 × 1200 px', status:'draft'}
    ],
    artwork:[
      {id:'aw-1', name:'Citrix logo — white', product:'Eco Wheat-Straw Charging Cable', img:'brand-aw-1', fmts:['.eps','.pdf'], size:'1.47 MB', dims:'310 × 152 px', general:['Tech'], specific:['Eco Wheat-Straw Charging Cable'], status:'approved'},
      {id:'aw-2', name:'Anniversary lockup', product:'Recycled Cotton Tote', img:'brand-aw-2', fmts:['.ai','.pdf'], size:'2.1 MB', dims:'600 × 300 px', general:['Bags'], specific:['Recycled Cotton Tote'], status:'approved'},
      {id:'aw-3', name:'Event wordmark', product:'Tech Travel Bag', img:'brand-aw-3', fmts:['.svg','.png'], size:'410 KB', dims:'800 × 240 px', general:['Bags','Apparel'], specific:['Tech Travel Bag'], status:'draft'}
    ],
    guidelines:[
      {id:'g-doc', name:'Brand Guidelines 2024', kind:'doc', img:'brand-guide-cover', fmts:['.pdf'], size:'8.4 MB', pages:42, status:'approved'},
      {id:'g-onepage', name:'Quick reference — on-page', kind:'page', status:'approved'}
    ]
  };
  const USAGE={
    do:['Keep clear space equal to the logo height on all sides.','Use approved colourways only.','Place on sufficient contrast.'],
    dont:['Don\u2019t stretch, rotate or recolour the logo.','Don\u2019t add effects, shadows or outlines.','Don\u2019t place on a busy background.']
  };
  const CONTACT={name:'Zak Potter', role:'Head of Communications', email:'zak@canalandrivertrust.org', phone:'01664 234 467', img:'brand-contact'};
  const TAGS_GENERAL=['Pens','Bags','Drinkware','Apparel','Notebooks','Tech','Eco','Events'];
  function store2(k,def){ try{ const o=JSON.parse(localStorage.getItem('ms-brand-tags')||'{}'); return o[k]||def; }catch(e){ return def; } }
  function saveTags(k,arr){ try{ const o=JSON.parse(localStorage.getItem('ms-brand-tags')||'{}'); o[k]=arr; localStorage.setItem('ms-brand-tags',JSON.stringify(o)); }catch(e){} }
  function generalTags(){ return store2('general', TAGS_GENERAL.slice()); }
  function specificTags(){ const ps=(window.STORE&&STORE.products)?STORE.products.map(p=>p.name):['Eco Wheat-Straw Charging Cable','Recycled Cotton Tote','Tech Travel Bag']; return store2('specific', ps); }
  function nowStamp(){ const d=new Date(); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }
  function logHist(it, action){ it.history=it.history||[{action:'Added',who:'Studio',when:'2 Jul 2025 · 16:42'}]; it.history.unshift({action, who:'You', when:nowStamp()}); }

  // ---------- state ----------
  function store(){ try{ return JSON.parse(localStorage.getItem('ms-brand-assets')||'{}'); }catch(e){ return {}; } }
  function save(o){ try{ localStorage.setItem('ms-brand-assets', JSON.stringify(o)); }catch(e){} }
  function items(cat){ const o=store(); let arr=(o[cat]&&Array.isArray(o[cat])) ? o[cat] : (SEED[cat]||[]).slice();
    const seed=SEED[cat]||[]; arr.forEach(it=>{ const s=seed.find(x=>x.id===it.id); if(s) for(const k in s){ if(it[k]==null) it[k]=s[k]; } });
    return arr; }
  function setItems(cat,arr){ const o=store(); o[cat]=arr; save(o); }
  let viewMode='grid', selecting=false, sel=new Set(), query='', statusFilter='live', artFilterG='', artFilterS='', artView='assets';
  const PROJECTS=[
    {id:'autumn', name:'Autumn Giveaways', brief:'Seasonal giveaway kit for supporter events \u2014 warm, autumnal tone using Sea Blue + Summer Green. Eco materials preferred.', imgs:['brand-pa-a1','brand-pa-a2','brand-pa-a3'], artwork:['Citrix logo \u2014 white','Anniversary lockup']},
    {id:'expo', name:'2026 Charity Expo', brief:'Exhibition stand merch \u2014 bold logo usage, high-contrast for booth visibility.', imgs:['brand-pa-e1','brand-pa-e2'], artwork:['Event wordmark']},
    {id:'staff', name:'Staff Gifts', brief:'Internal thank-you gifts \u2014 subtle branding, premium finish.', imgs:['brand-pa-s1'], artwork:[]}
  ];

  // ---------- routing ----------
  function curCat(){ const h=new URLSearchParams(location.hash.slice(1)); const c=h.get('cat'); return CATS.find(x=>x.id===c)?c:'logos'; }
  function render(){
    const cat=curCat(); const meta=CATS.find(c=>c.id===cat);
    sel=new Set(); selecting=false; query='';
    document.querySelectorAll('.ms-side .ms-item[href*="Brand Assets"]').forEach(a=>{ const h=a.getAttribute('href')||''; const m=h.match(/cat=([a-z]+)/); a.classList.toggle('active', !!m && m[1]===cat); });
    view.innerHTML=`
      <div class="ba-head">
        <h1>${meta.name}</h1>
        <button class="ba-add" id="baAdd"><svg class="icn"><use href="#s-plus"/></svg>Add ${esc(meta.add)}</button>
      </div>
      <div class="ba-toolbar">
        <span class="ba-count" id="baCount"></span>
        <div class="ba-tools">
          <div class="ba-filter" id="baFilter"></div>
          <div class="ba-searchwrap"><svg class="icn"><use href="#s-search"/></svg><input type="text" id="baSearch" placeholder="Search ${esc(meta.name.toLowerCase())}…"></div>
          <button class="ba-tbtn" id="baView" title="Grid / list view"><svg class="icn"><use href="#ic-grid"/></svg></button>
          <button class="ba-tbtn" id="baSelect" title="Select"><svg class="icn"><use href="#s-check"/></svg></button>
        </div>
      </div>
      <div id="baSub"></div>
      <div class="ba-grid ${cat==='guidelines'?'ba-grid-guide':''}" id="baGrid"></div>
      <div class="ba-contacts">
        <div class="ba-conhd">Contacts</div>
        <div class="ba-concard2">
          <span class="ba-conav"><span class="ba-coninit">${esc((CONTACT.name||'').split(' ').map(w=>w[0]).slice(0,2).join(''))}</span></span>
          <div class="ba-coninfo2"><b>${esc(CONTACT.name)}</b><span class="ba-conrole">${esc(CONTACT.role)}</span>
            <div class="ba-conlinks"><a href="mailto:${CONTACT.email}"><svg class="icn"><use href="#ic-mail"/></svg>${esc(CONTACT.email)}</a><span><svg class="icn"><use href="#ic-phone"/></svg>${esc(CONTACT.phone)}</span></div></div>
        </div>
      </div>
      <input type="file" id="baFile" hidden>
      <div class="ba-selbar" id="baSelBar" hidden><span id="baSelCount"></span><div class="ba-selacts"><button class="ba-selbtn" id="baSelDl"><svg class="icn"><use href="#ic-download"/></svg>Download selected</button><button class="ba-selbtn" id="baSelArch">Archive</button><button class="ba-selbtn danger" id="baSelDel">Remove</button><button class="ba-selx" id="baSelClear">Cancel</button></div></div>`;
    renderGrid();
    wireHead(cat, meta);
  }

  function statusChip(s){ return s==='draft' ? '<span class="ba-chip draft">Draft</span>' : '<span class="ba-chip ok">Approved</span>'; }
  function fmtPills(f){ return (f||[]).map(x=>`<span class="ba-fmt">${esc(x)}</span>`).join(''); }
  const SWHEX={'Black':'#1A1A1E','White':'#FFFFFF','Sea Blue':'#2F5CA8','Summer Green':'#6FC5A6','Relaxed Pink':'#E2A9AC'};
  function swHex(n){ return SWHEX[n]||'#bbb'; }

  function cardHTML(cat,it){
    const checked=sel.has(it.id);
    const checkbox=`<button class="ba-cardchk ${checked?'on':''} ${selecting?'show':''}" data-id="${it.id}" aria-label="Select">${checked?'<svg class="icn"><use href="#s-check"/></svg>':''}</button>`;
    let media, meta;
    if(cat==='colours'){
      media=`<div class="ba-swatch" style="background:${it.hex};${it.hex.toUpperCase()==='#FFFFFF'?'box-shadow:inset 0 0 0 1px var(--line-soft)':''}"></div>`;
      meta=`<div class="ba-cname">${esc(it.name)}</div><div class="ba-kv"><span>Spot</span><b>${esc(it.pantone)}</b></div><div class="ba-kv"><span>CMYK</span><b>${esc(it.cmyk)}</b></div>`;
    } else if(cat==='fonts'){
      media=`<div class="ba-fontprev" style="font-family:${it.stack};font-weight:${it.weight}">The quick brown fox jumps over the lazy dog.</div>`;
      meta=`<div class="ba-cname">${esc(it.name)}</div><div class="ba-kv"><span>Format</span><b>${esc(it.fmt)} · ${esc(it.size)}</b></div>`;
    } else {
      media=`<div class="ba-media"><image-slot id="ba-${it.img}" shape="rounded" fit="contain" placeholder="Drop ${esc(cat==='logos'?'logo':cat==='artwork'?'artwork':'image')}"></image-slot></div>`;
      const bits=[it.dims, it.size].filter(Boolean).join(' · ');
      let extra='';
      if(cat==='logos' && it.printColours) extra=`<div class="ba-pcolours">${it.printColours.map(c=>`<span class="ba-pc" title="${esc(c.name)} · ${esc(c.pantone)} · CMYK ${esc(c.cmyk)}"><span class="ba-pcsw" style="background:${swHex(c.name)}"></span>${esc(c.pantone!=='—'?c.pantone:'CMYK '+c.cmyk)}</span>`).join('')}</div>`;
      if(cat==='artwork'){ const tg=[].concat(it.general||[],it.specific||[]); if(tg.length) extra=`<div class="ba-tags">${tg.map(x=>`<span class="ba-tag">${esc(x)}</span>`).join('')}</div>`; }
      meta=`<div class="ba-cname">${esc(it.name)}</div>${it.product?`<div class="ba-csub">${esc(it.product)}</div>`:''}<div class="ba-fmts">${fmtPills(it.fmts)}</div>${bits?`<div class="ba-csmall">${esc(bits)}</div>`:''}${extra}`;
    }
    return `<div class="ba-card ${selecting?'selecting':''} ${checked?'sel':''}" data-id="${it.id}">
      ${checkbox}
      <div class="ba-cardmedia">${media}<button class="ba-expand" data-open="${it.id}" title="Open details"><svg class="icn"><use href="#ic-expand"/></svg></button></div>
      <div class="ba-cardbody">${statusChip(it.status)}${meta}</div>
      <div class="ba-cardfoot"><button class="ba-dl" data-dl="${it.id}"><svg class="icn"><use href="#ic-download"/></svg>${(it.fmts&&it.fmts.length>1)?'Download ▾':'Download'}</button></div>
    </div>`;
  }

  function guideCardHTML(it){
    if(it.kind==='page'){
      return `<div class="ba-guidepage"><div class="ba-gp-hd"><b>Quick reference</b>${statusChip(it.status)}</div>
        <div class="ba-gp-grid">
          <div class="ba-gp-block"><h5>Logo</h5><p>Primary lockup; keep clear space; never recolour.</p></div>
          <div class="ba-gp-block"><h5>Colour</h5><p>Use the approved palette (see Colours). Black &amp; Sea Blue are primary.</p></div>
          <div class="ba-gp-block"><h5>Type</h5><p>Gill Sans — Regular for body, Bold for headlines.</p></div>
          <div class="ba-gp-block"><h5>Tone</h5><p>Warm, plain-spoken, community-first.</p></div>
        </div></div>`;
    }
    return `<div class="ba-card" data-id="${it.id}"><div class="ba-cardmedia"><div class="ba-media doc"><image-slot id="ba-${it.img}" shape="rounded" fit="cover" placeholder="Cover"></image-slot></div><button class="ba-expand" data-open="${it.id}"><svg class="icn"><use href="#ic-expand"/></svg></button></div>
      <div class="ba-cardbody">${statusChip(it.status)}<div class="ba-cname">${esc(it.name)}</div><div class="ba-csmall">${it.pages} pages · ${esc(it.size)}</div></div>
      <div class="ba-cardfoot"><button class="ba-dl" data-dl="${it.id}"><svg class="icn"><use href="#ic-download"/></svg>Download PDF</button></div></div>`;
  }

  function renderGrid(){
    const cat=curCat(); const grid=document.getElementById('baGrid'); const count=document.getElementById('baCount'); const subEl=document.getElementById('baSub');
    if(subEl) subEl.innerHTML = cat==='artwork' ? artworkSubBar() : '';
    if(cat==='artwork' && artView==='projects'){ grid.className='ba-grid ba-grid-guide'; grid.innerHTML=projectArtworkHTML(); if(count) count.textContent=PROJECTS.length+' projects'; wireArtSub(); wireProjects(); return; }
    let list=items(cat);
    list=list.filter(it=> statusFilter==='all' ? true : statusFilter==='archived' ? !!it.archived : !it.archived);
    if(query) list=list.filter(it=>(it.name||'').toLowerCase().includes(query.toLowerCase()));
    if(cat==='artwork'){ if(artFilterG) list=list.filter(it=>(it.general||[]).includes(artFilterG)); if(artFilterS) list=list.filter(it=>(it.specific||[]).includes(artFilterS)); }
    grid.className='ba-grid '+(cat==='guidelines'?'ba-grid-guide':'')+(viewMode==='list'?' list':'');
    grid.innerHTML = list.length ? list.map(it=> cat==='guidelines'?guideCardHTML(it):cardHTML(cat,it)).join('')
      : `<div class="ba-empty">No ${statusFilter==='archived'?'archived ':''}${esc(CATS.find(c=>c.id===cat).name.toLowerCase())}${statusFilter==='archived'?'':' yet'}.</div>`;
    if(count) count.textContent=`${list.length} item${list.length===1?'':'s'}`;
    wireGrid(cat); if(cat==='artwork') wireArtSub();
  }
  function artworkSubBar(){
    const tabs=`<div class="ba-arttabs"><button data-av="assets" class="${artView==='assets'?'on':''}">Asset library</button><button data-av="projects" class="${artView==='projects'?'on':''}">Project artwork</button></div>`;
    if(artView==='projects') return tabs;
    const sel=(id,label,opts,cur)=>`<label class="ba-tagsel">${label}<select id="${id}"><option value="">All</option>${opts.map(o=>`<option ${o===cur?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
    return tabs+`<div class="ba-artfilter">${sel('baTagG','General type',generalTags(),artFilterG)}${sel('baTagS','Specific product',specificTags(),artFilterS)}<button class="ba-tagadd" id="baTagAdd">+ New tag</button></div>`;
  }
  function wireArtSub(){
    document.querySelectorAll('.ba-arttabs button').forEach(b=>b.onclick=()=>{ artView=b.dataset.av; renderGrid(); });
    const g=document.getElementById('baTagG'); if(g) g.onchange=()=>{ artFilterG=g.value; renderGrid(); };
    const s=document.getElementById('baTagS'); if(s) s.onchange=()=>{ artFilterS=s.value; renderGrid(); };
    const a=document.getElementById('baTagAdd'); if(a) a.onclick=()=>{ const n=prompt('New general product-type tag:'); if(n){ const arr=generalTags(); if(!arr.includes(n)){ arr.push(n); saveTags('general',arr); } artFilterG=n; renderGrid(); } };
  }
  function projectArtworkHTML(){
    return PROJECTS.map(p=>`<div class="ba-proj"><div class="ba-projhd"><b>${esc(p.name)}</b><span class="ba-chip ok">Live project</span></div>
      <p class="ba-projbrief">${esc(p.brief)}</p>
      <div class="ba-projslides"><button class="ba-slidenav" data-pj="${p.id}" data-dir="-1">\u2039</button><div class="ba-slidestage" id="slide-${p.id}"></div><button class="ba-slidenav" data-pj="${p.id}" data-dir="1">\u203a</button></div>
      <div class="ba-projthumbs">${p.imgs.map((im,i)=>`<button class="ba-projthumb" data-pj="${p.id}" data-i="${i}"><image-slot id="ba-${im}" shape="rounded" fit="cover" placeholder="Image ${i+1}"></image-slot></button>`).join('')}<button class="ba-projadd" data-pj="${p.id}"><span>+</span>Add image</button></div>
      <div class="ba-projaw"><span class="ba-pplbl">Product artwork</span>${p.artwork.length?p.artwork.map(a=>`<span class="ba-tag">${esc(a)}</span>`).join(''):'<span class="ba-csmall">None yet</span>'} <button class="ba-projawadd" data-pj="${p.id}">+ Add artwork</button></div>
    </div>`).join('');
  }
  const slideIdx={};
  function renderSlide(pj){ const p=PROJECTS.find(x=>x.id===pj); const st=document.getElementById('slide-'+pj); if(!st||!p.imgs.length)return; const i=slideIdx[pj]||0; st.innerHTML=`<image-slot id="ba-${p.imgs[i]}" shape="rounded" fit="cover" placeholder="Slide ${i+1}"></image-slot><span class="ba-slidecount">${i+1}/${p.imgs.length}</span>`; }
  function wireProjects(){
    PROJECTS.forEach(p=>{ slideIdx[p.id]=slideIdx[p.id]||0; renderSlide(p.id); });
    document.querySelectorAll('.ba-slidenav').forEach(b=>b.onclick=()=>{ const pj=b.dataset.pj,p=PROJECTS.find(x=>x.id===pj),n=p.imgs.length; if(!n)return; slideIdx[pj]=((slideIdx[pj]||0)+(+b.dataset.dir)+n)%n; renderSlide(pj); });
    document.querySelectorAll('.ba-projthumb').forEach(th=>th.onclick=()=>{ slideIdx[th.dataset.pj]=+th.dataset.i; renderSlide(th.dataset.pj); });
    document.querySelectorAll('.ba-projadd,.ba-projawadd').forEach(b=>b.onclick=()=>toast('Upload flow \u2014 drop files to add'));
  }

  function wireHead(cat, meta){
    { const fl=document.getElementById('baFilter'); if(fl){ fl.innerHTML=['live','archived','all'].map(f=>`<button data-f="${f}" class="${statusFilter===f?'on':''}">${f[0].toUpperCase()+f.slice(1)}</button>`).join(''); fl.querySelectorAll('button').forEach(b=>b.onclick=()=>{ statusFilter=b.dataset.f; fl.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); renderGrid(); }); } }
    { const arch=document.getElementById('baSelArch'); if(arch) arch.onclick=()=>{ const arr=items(cat); arr.forEach(x=>{ if(sel.has(x.id)){ x.archived=(statusFilter!=='archived'); logHist(x, x.archived?'Archived':'Restored'); } }); setItems(cat,arr); selecting=false; sel=new Set(); renderGrid(); updateSelBar(); toast(statusFilter==='archived'?'Restored':'Archived'); }; }
    const s=document.getElementById('baSearch'); if(s) s.oninput=()=>{ query=s.value; renderGrid(); };
    const v=document.getElementById('baView'); if(v) v.onclick=()=>{ viewMode=viewMode==='grid'?'list':'grid'; v.classList.toggle('on',viewMode==='list'); renderGrid(); };
    const sb=document.getElementById('baSelect'); if(sb) sb.onclick=()=>{ selecting=!selecting; sel=new Set(); sb.classList.toggle('on',selecting); renderGrid(); updateSelBar(); };
    const add=document.getElementById('baAdd'); const file=document.getElementById('baFile');
    if(add&&file){ add.onclick=()=>{ if(cat==='colours'||cat==='fonts'){ addMeta(cat); } else { file.value=''; file.onchange=()=>{ const f=file.files&&file.files[0]; if(f) addUpload(cat,f); }; file.click(); } }; }
    const clr=document.getElementById('baSelClear'); if(clr) clr.onclick=()=>{ selecting=false; sel=new Set(); renderGrid(); updateSelBar(); };
    const dl=document.getElementById('baSelDl'); if(dl) dl.onclick=()=>{ toast(`Downloading ${sel.size} asset${sel.size===1?'':'s'} (zip)`); };
    const del=document.getElementById('baSelDel'); if(del) del.onclick=()=>{ const arr=items(cat).filter(x=>!sel.has(x.id)); setItems(cat,arr); selecting=false; sel=new Set(); renderGrid(); updateSelBar(); toast('Removed'); };
    // drag-drop upload onto the grid
    const grid=document.getElementById('baGrid');
    if(grid && cat!=='colours' && cat!=='fonts'){
      grid.addEventListener('dragover',e=>{ e.preventDefault(); grid.classList.add('drop'); });
      grid.addEventListener('dragleave',()=>grid.classList.remove('drop'));
      grid.addEventListener('drop',e=>{ e.preventDefault(); grid.classList.remove('drop'); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) addUpload(cat,f); });
    }
  }
  function wireGrid(cat){
    document.querySelectorAll('#baGrid .ba-expand').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openDetail(cat,b.dataset.open); });
    document.querySelectorAll('#baGrid .ba-cardchk').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const id=b.dataset.id; if(sel.has(id))sel.delete(id);else sel.add(id); renderGrid(); updateSelBar(); });
    document.querySelectorAll('#baGrid .ba-card').forEach(c=>c.onclick=()=>{ if(selecting){ const id=c.dataset.id; if(sel.has(id))sel.delete(id);else sel.add(id); renderGrid(); updateSelBar(); } });
    document.querySelectorAll('#baGrid .ba-dl').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const it=items(cat).find(x=>x.id===b.dataset.dl); dlMenu(b, it); });
  }
  function updateSelBar(){ const bar=document.getElementById('baSelBar'); if(!bar)return; bar.hidden=sel.size===0; document.getElementById('baSelCount').textContent=`${sel.size} selected`; }

  // multi-format download menu
  function dlMenu(btn, it){
    document.querySelectorAll('.ba-dlmenu').forEach(m=>m.remove());
    const fmts=it.fmts||(it.fmt?[it.fmt]:['.png']);
    if(fmts.length<=1){ toast(`Downloading ${it.name} (${fmts[0]||'file'})`); return; }
    const m=document.createElement('div'); m.className='ba-dlmenu';
    m.innerHTML=fmts.map(f=>`<button data-f="${esc(f)}">${esc(f)}</button>`).join('')+`<button data-f="__all">All formats (zip)</button>`;
    document.body.appendChild(m); const r=btn.getBoundingClientRect();
    m.style.left=Math.min(r.left,innerWidth-180)+'px'; m.style.top=(r.bottom+6)+'px';
    m.querySelectorAll('button').forEach(b=>b.onclick=()=>{ toast(`Downloading ${it.name} ${b.dataset.f==='__all'?'(all formats)':b.dataset.f}`); m.remove(); });
    setTimeout(()=>document.addEventListener('click',function h(){ m.remove(); document.removeEventListener('click',h); }),0);
  }

  // add via upload (auto metadata)
  function addUpload(cat,f){
    const rd=new FileReader();
    rd.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const id='u-'+Date.now();
        const ext='.'+(f.name.split('.').pop()||'png').toLowerCase();
        const it={id, name:f.name.replace(/\.[^.]+$/,''), img:id, _src:rd.result, fmts:[ext], size:fmtBytes(f.size), dims:`${img.naturalWidth} × ${img.naturalHeight} px`, status:'draft'};
        if(cat==='artwork') it.product='—';
        const arr=items(cat); arr.unshift(it); setItems(cat,arr); renderGrid();
        // persist dropped image into its slot id
        setTimeout(()=>{ const slot=document.getElementById('ba-'+id); if(slot&&slot.setImage) slot.setImage(rd.result); },60);
        toast('Uploaded · auto-captured '+it.dims);
      };
      img.onerror=()=>{ const id='u-'+Date.now(); const ext='.'+(f.name.split('.').pop()||'').toLowerCase(); const arr=items(cat); arr.unshift({id,name:f.name,img:id,fmts:[ext],size:fmtBytes(f.size),status:'draft'}); setItems(cat,arr); renderGrid(); toast('Uploaded'); };
      img.src=rd.result;
    };
    rd.readAsDataURL(f);
  }
  function fmtBytes(b){ return b>1048576?(b/1048576).toFixed(2)+' MB':Math.round(b/1024)+' KB'; }
  function addMeta(cat){
    if(cat==='colours'){ const name=prompt('Colour name:'); if(!name)return; const hex=prompt('Hex (e.g. #2F5CA8):','#')||'#cccccc'; const arr=items(cat); arr.push({id:'c-'+Date.now(),name,hex,pantone:prompt('Pantone reference:','—')||'—',cmyk:prompt('CMYK (c / m / y / k):','0 / 0 / 0 / 0')||'—',status:'draft'}); setItems(cat,arr); renderGrid(); toast('Colour added'); }
    else { const name=prompt('Font name:'); if(!name)return; const arr=items(cat); arr.push({id:'f-'+Date.now(),name,stack:'system-ui,sans-serif',weight:400,fmt:'.ttf',size:'—',status:'draft'}); setItems(cat,arr); renderGrid(); toast('Font added'); }
  }

  // ---------- detail slide-over ----------
  let drawer=null;
  function openDetail(cat,id){
    const it=items(cat).find(x=>x.id===id); if(!it) return;
    if(!drawer){ drawer=document.createElement('div'); drawer.className='ba-drawer-scrim'; drawer.innerHTML='<div class="ba-drawer" role="dialog"></div>'; document.body.appendChild(drawer);
      drawer.addEventListener('click',e=>{ if(e.target===drawer) closeDetail(); }); }
    const d=drawer.querySelector('.ba-drawer');
    let preview;
    if(cat==='colours') preview=`<div class="ba-dprev" style="background:${it.hex};${it.hex.toUpperCase()==='#FFFFFF'?'box-shadow:inset 0 0 0 1px var(--line-soft)':''}"></div>`;
    else if(cat==='fonts') preview=`<div class="ba-dprev font" style="font-family:${it.stack};font-weight:${it.weight}">Aa Bb Cc 123</div>`;
    else preview=`<div class="ba-dprev img"><image-slot id="ba-${it.img}" shape="rounded" fit="contain" placeholder="Asset"></image-slot></div>`;
    const kv=[];
    if(it.pantone) kv.push(['Pantone',it.pantone]); if(it.cmyk) kv.push(['CMYK',it.cmyk]); if(it.hex) kv.push(['Hex',it.hex]);
    if(it.fmt) kv.push(['Format',it.fmt]); if(it.fmts) kv.push(['Formats',it.fmts.join(', ')]);
    if(it.dims) kv.push(['Dimensions',it.dims]); if(it.size) kv.push(['File size',it.size]); if(it.product) kv.push(['Product',it.product]);
    const showUsage=(cat==='logos'||cat==='artwork'||cat==='guidelines');
    d.innerHTML=`<div class="ba-dhd"><button class="ba-dx" id="baDx"><svg class="icn"><use href="#ic-x"/></svg></button><div><h3>${esc(it.name)}</h3>${statusChip(it.status)}</div></div>
      ${preview}
      <div class="ba-dsection"><h5>Details</h5><div class="ba-dkv">${kv.map(([k,v])=>`<span class="k">${esc(k)}</span><span class="v">${esc(v)}</span>`).join('')}</div></div>
      ${showUsage?`<div class="ba-dsection"><h5>Usage rules</h5><div class="ba-usage"><div class="ba-do"><b>Do</b><ul>${USAGE.do.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="ba-dont"><b>Don\u2019t</b><ul>${USAGE.dont.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div></div>`:''}
      <div class="ba-dsection"><h5>History</h5><div class="ba-versions">${(it.history||[{action:'Added',who:'Studio',when:'2 Jul 2025 · 16:42'}]).map((h,i)=>`<div class="ba-ver ${i?'muted':''}"><b>${esc(h.action)}</b><span>${esc(h.who)} · ${esc(h.when)}</span></div>`).join('')}</div></div>
      <div class="ba-dfoot"><button class="ba-usebuilder" id="baUse"><svg class="icn"><use href="#s-merch"/></svg>Use in Product Builder</button><button class="ba-dl2" id="baDDl"><svg class="icn"><use href="#ic-download"/></svg>Download</button></div>`;
    drawer.classList.add('open'); document.body.style.overflow='hidden';
    d.querySelector('#baDx').onclick=closeDetail;
    d.querySelector('#baUse').onclick=()=>{ toast('Sent to Product Builder — pick a product to apply'); };
    d.querySelector('#baDDl').onclick=(e)=>{ dlMenu(e.currentTarget, it); };
  }
  function closeDetail(){ if(drawer){ drawer.classList.remove('open'); document.body.style.overflow=''; } }

  window.addEventListener('hashchange', render);
  (function(){ let k=(location.hash.split('&')[0]||''); window.addEventListener('hashchange',()=>{
    const n=(location.hash.split('&')[0]||''); if(n!==k){ k=n; window.scrollTo(0,0); } }); })();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', render); else render();
  window.MSBrandAssets={ render };
})();
