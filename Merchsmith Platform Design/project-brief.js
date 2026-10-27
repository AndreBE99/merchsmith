/* =========================================================================
   project-brief.js — the Project Brief / control panel
   Three layers:
     1) Campaign      — story, merch use, budget, attachments (qualitative)
     2) Project defaults — apply-to-all settings that cascade onto every
                        product added to the project (each overridable per product)
     3) Requested items — granular line-item wishlist (type · qty · unit · budget),
                        each inheriting the defaults, overridable, later "fulfilled"
                        by a real store product.
   Renders into #briefMount on the project pages. Persists to localStorage.
   Exposes window.MSBrief = { get, render, defaultsFor, save }.
   ========================================================================= */
(function(){
  const KEY='ms-project-brief';
  const PROJECT='autumn';

  // ---- option catalogues (shared shapes with the rest of the platform) ----
  const COUNTRIES=['United Kingdom','Ireland (ROI)','France'];
  // generic product (body) colour set — mirrors the store colour filter
  const PRODUCT_COLOURS=['Black','White','Grey','Navy','Blue','Teal','Green','Red','Orange','Yellow','Pink','Purple','Brown','Natural'];
  const PCHEX={Black:'#1a1a1e',White:'#f4f4f0',Grey:'#8a8a93',Navy:'#2a3550',Blue:'#2f5ca8',Teal:'#2f8f8a',Green:'#3a9d6b',Red:'#c0392b',Orange:'#e08a2b',Yellow:'#e7c14b',Pink:'#e2a9ac',Purple:'#7a5aa6',Brown:'#7a5a44',Natural:'#d8c8a8'};
  // brand (ink) colours — mirrors Brand Assets seed palette (with Pantone refs)
  const BRAND_COLOURS=[
    {name:'Black',hex:'#1A1A1E',pantone:'Pantone Black 6 C'},
    {name:'Sea Blue',hex:'#2F5CA8',pantone:'Pantone 2132 C'},
    {name:'Summer Green',hex:'#6FC5A6',pantone:'Pantone 570 C'},
    {name:'White',hex:'#FFFFFF',pantone:'—'},
    {name:'Relaxed Pink',hex:'#E2A9AC',pantone:'Pantone 4995 C'}
  ];
  const LOGOS=[
    {id:'l-black',name:'Logo — black on white',fg:'#1A1A1E',bg:'#FFFFFF',fmts:['.eps','.svg','.png'],dims:'310 × 152 px',size:'1.47 MB',ink:'Black · Pantone Black 6 C'},
    {id:'l-white',name:'Logo — white on black',fg:'#FFFFFF',bg:'#1A1A1E',fmts:['.eps','.svg','.png'],dims:'310 × 152 px',size:'1.87 MB',ink:'White'},
    {id:'l-blue',name:'Logo — white on blue',fg:'#FFFFFF',bg:'#2F5CA8',fmts:['.eps','.png'],dims:'310 × 152 px',size:'1.87 MB',ink:'Sea Blue · Pantone 2132 C'}
  ];
  const CATEGORIES=['Pens','Bags','Drinkware','Apparel','Notebooks','Tech','Eco','Events'];
  // brief category → store department (for the "Find product" pre-filter)
  const CAT_DEPT={Pens:'writing',Bags:'bags',Drinkware:'drinkware',Apparel:'clothing',Notebooks:'notebooks',Tech:'tech',Eco:'lifestyle',Events:'exhibition'};
  // product artwork — mirrors Brand Assets > Product Artwork (read live from its store, else this seed)
  const ART_SEED=[
    {id:'aw-1', name:'Citrix logo — white', product:'Eco Wheat-Straw Charging Cable', img:'brand-aw-1', fmts:['.eps','.pdf'], general:['Tech'], specific:['Eco Wheat-Straw Charging Cable']},
    {id:'aw-2', name:'Anniversary lockup', product:'Recycled Cotton Tote', img:'brand-aw-2', fmts:['.ai','.pdf'], general:['Bags'], specific:['Recycled Cotton Tote']},
    {id:'aw-3', name:'Event wordmark', product:'Tech Travel Bag', img:'brand-aw-3', fmts:['.svg','.png'], general:['Bags','Apparel'], specific:['Tech Travel Bag']}
  ];
  function brandArtwork(){ try{ const o=JSON.parse(localStorage.getItem('ms-brand-assets')||'{}'); if(o.artwork&&Array.isArray(o.artwork)&&o.artwork.length) return o.artwork; }catch(e){} return ART_SEED; }
  // artwork relevant to an item: matched on its category (general tag) or type name (specific)
  function artworkForItem(it){ const t=(it.type||'').toLowerCase(); return brandArtwork().filter(a=>(a.general||[]).includes(it.cat) || (a.specific||[]).some(s=>s.toLowerCase()===t)); }

  // ---- seed ----
  function seed(){ return {
    campaign:{
      description:"We're launching a bespoke autumn exhibition giveaway campaign to charm attendees and elevate brand recall — an eco-friendly merchandise pack: a premium biodegradable pen, a recycled notebook, an eco tech item, and one innovative surprise. Thoughtful, useful, memorable merch that showcases our commitment to sustainability, creativity and quality.",
      merchUse:'Exhibition · NEC',
      budget:5000,
      attachments:[{id:'a1',name:'Inspirational merch'},{id:'a2',name:'Colour moodboard'},{id:'a3',name:'Event photos'}]
    },
    defaults:{
      delivery:{ iso:'2025-10-23', mode:'nofail' },
      country:0,
      productColours:['Black','White'],
      brandMode:'spot',
      brandColours:['Black','White'],
      customColours:[],
      positions:'Front; back where space allows',
      logos:['l-black','l-white'],
      sample:{ required:true, type:'branded' },
      sustainabilityMin:6,
      expectedQty:1000
    },
    items:[
      { id:'it1', type:'Recycled notebook', cat:'Notebooks', qty:500, unit:3.20 },
      { id:'it2', type:'Biodegradable pen', cat:'Pens', qty:1000, unit:0.50 },
      { id:'it3', type:'Eco mini power bank', cat:'Tech', qty:250, unit:9.40 },
      { id:'it4', type:'Desktop garden (surprise)', cat:'Eco', qty:100, unit:6.80 }
    ]
  }; }

  // ---- platform settings (sustainability filter is a Phase-2 toggle) ----
  function platform(){ try{ return Object.assign({sustainabilityFilter:false}, JSON.parse(localStorage.getItem('ms-platform-settings')||'{}')); }catch(e){ return {sustainabilityFilter:false}; } }

  // ---- persistence ----
  let DATA=null;
  const openItems=new Set();   // which requested-item customise panels are expanded (survives re-render)
  function load(){ if(DATA) return DATA; let saved={}; try{ saved=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){} DATA = (saved&&saved[PROJECT]) ? deepMerge(seed(), saved[PROJECT]) : seed(); return DATA; }
  function save(){ let all={}; try{ all=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){} all[PROJECT]=DATA; try{ localStorage.setItem(KEY, JSON.stringify(all)); }catch(e){} }
  function deepMerge(base, ov){ if(Array.isArray(ov)) return ov.slice(); if(ov&&typeof ov==='object'){ const o=Object.assign({},base); for(const k in ov){ o[k]=deepMerge(base?base[k]:undefined, ov[k]); } return o; } return ov===undefined?base:ov; }

  // ---- helpers ----
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const gbp0=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  function ord(d){ if(d>3&&d<21)return'th'; switch(d%10){case 1:return'st';case 2:return'nd';case 3:return'rd';default:return'th';} }
  function fmtDate(iso){ if(!iso) return '—'; const dt=new Date(iso+'T00:00'); const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${days[dt.getDay()]}. ${dt.getDate()}${ord(dt.getDate())} ${mon[dt.getMonth()]}`; }
  const itemBudget=it=>(+it.qty||0)*(+it.unit||0);   // planned spend = target unit × qty
  const allocated=()=>load().items.reduce((s,it)=>s+itemBudget(it),0);

  // expose default-provider for downstream (store prefill / Builder seeding — stages 2-3)
  function defaultsFor(){ const d=load().defaults; return {
    deliveryISO:d.delivery.iso, deliveryMode:d.delivery.mode, country:COUNTRIES[d.country],
    productColours:d.productColours.slice(), brandMode:d.brandMode||'spot', brandColours:d.brandColours.slice(),
    customColours:(d.customColours||[]).slice(), positions:d.positions, logos:d.logos.slice(),
    sample:Object.assign({},d.sample), sustainabilityMin:platform().sustainabilityFilter?d.sustainabilityMin:null,
    expectedQty:d.expectedQty }; }

  /* =======================================================================
     RENDER
     ======================================================================= */
  function render(){
    const mount=document.getElementById('briefMount'); if(!mount) return;
    const b=load();
    mount.innerHTML = campaignHTML(b) + budgetBarHTML(b) + defaultsHTML(b) + itemsHTML(b);
    wire(mount);
    updateBriefAlert(b);
    // description: 3 lines with "Show more" when longer; full while editing
    const pd=mount.querySelector('.pb-desc .pb-clamp'), mb=mount.querySelector('[data-descmore]');
    if(pd&&mb){ const fit=()=>{ if(pd.classList.contains('open')) return; mb.hidden=pd.scrollHeight<=pd.clientHeight+2; };
      requestAnimationFrame(fit); pd.addEventListener('focus',()=>pd.classList.add('open')); pd.addEventListener('blur',()=>{ if(!mb.dataset.open){ pd.classList.remove('open'); fit(); } });
      mb.onclick=()=>{ const o=!mb.dataset.open; if(o){ mb.dataset.open='1'; pd.classList.add('open'); mb.textContent='Show less'; } else { delete mb.dataset.open; pd.classList.remove('open'); mb.textContent='Show more'; fit(); } }; }
  }
  // not-sourced count → red "!" badge on the View-brief button (seen by customer + distributor)
  function unsourcedCount(b){ b=b||load(); return (b.items||[]).filter(it=>!((it.added&&it.added.length)||it.fulfilledBy)).length; }
  function updateBriefAlert(b){ const n=unsourcedCount(b); const btn=document.getElementById('briefToggle'); if(!btn) return; let badge=btn.querySelector('.brief-alert'); if(n>0){ if(!badge){ badge=document.createElement('span'); badge.className='brief-alert'; btn.appendChild(badge); } badge.textContent=n; badge.title=n+' product'+(n===1?'':'s')+' not yet sourced — pick from the store in the brief'; } else if(badge){ badge.remove(); } }

  function campaignHTML(b){
    const c=b.campaign, att=c.attachments||[];
    // summary strip (merch use · budget · attachments), then the description full width
    return `<section class="pb-block pb-camp">
      <div class="pb-blockhd"><h3>Campaign</h3><span class="pb-blocksub">What we're trying to achieve</span></div>
      <div class="pb-facts">
        <div class="pb-fact"><label class="pb-flbl">Merch use</label>
          <div class="pb-prose sm" contenteditable="true" data-edit="campaign.merchUse" data-ph="Add what the merch is for" spellcheck="false">${esc(c.merchUse)}</div></div>
        <div class="pb-fact"><label class="pb-flbl">Total budget</label>
          <div class="pb-budgetin"><span>£</span><input type="number" min="0" step="50" data-edit="campaign.budget" value="${c.budget}" aria-label="Total budget"></div></div>
        <div class="pb-fact pb-fact-att"><label class="pb-flbl">Attachments <span class="pb-tlnote">${att.length?att.length+' · click to zoom':'drop images'}</span></label>
          <div class="pb-attach">${att.map((a,i)=>`<div class="pb-att" data-attidx="${i}"><image-slot id="pb-att-${esc(a.id||i)}" shape="rounded" fit="cover" placeholder="Drop"></image-slot><button class="pb-att-zoom" data-attzoom="${i}" title="Zoom &amp; browse"><svg class="icn"><use href="#ic-expand"/></svg></button><button class="pb-att-del" data-attdel="${i}" title="Remove">×</button><span class="pb-att-cap">${esc(a.name)}</span></div>`).join('')}<button class="pb-att-add" data-addfile title="Add attachment"><svg class="icn"><use href="#ic-plus"/></svg></button></div></div>
      </div>
      <div class="pb-desc">
        <label class="pb-flbl">Description</label>
        <div class="pb-prose pb-clamp" contenteditable="true" data-edit="campaign.description" data-ph="Add a description: the story, audience and goals for this campaign" spellcheck="false">${esc(c.description)}</div>
        <button class="pb-more" data-descmore hidden>Show more</button>
      </div>
    </section>`;
  }

  function budgetBarHTML(b){
    const total=+b.campaign.budget||0, alloc=allocated(); const pct=total?Math.min(100,Math.round(alloc/total*100)):0; const over=alloc>total;
    return `<div class="pb-budgetbar ${over?'over':''}">
      <div class="pb-bbtop"><span><b>${gbp(alloc)}</b> allocated across ${b.items.length} item${b.items.length===1?'':'s'}</span><span>of <b>${gbp(total)}</b> budget${over?` · <span class="pb-bbover">${gbp(alloc-total)} over</span>`:` · ${gbp(total-alloc)} left`}</span></div>
      <div class="pb-bbtrack"><div class="pb-bbfill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function tile(label, body, opts){ opts=opts||{}; const link=opts.link?`<a class="pb-balink" href="${opts.link.href}">${opts.link.label||'Brand Assets'} ↗</a>`:''; return `<div class="pb-tile ${opts.wide?'wide':''} ${opts.full?'full':''}"><label class="pb-flbl">${label}${link}</label>${body}</div>`; }

  // brand colour palette = Brand Assets seed + project-unique custom colours
  function allBrandColours(d){ return BRAND_COLOURS.concat(d.customColours||[]); }
  function modeLabel(mode,cols){ return mode==='full'?'Full colour (CMYK / digital)':mode==='none'?'Unbranded':mode==='mono'?('Mono — one colour'+((cols||[]).length?' · '+cols[0]:'')):`${(cols||[]).length} spot colour${(cols||[]).length===1?'':'s'}`; }
  function brandModeLabel(d){ return modeLabel(d.brandMode||'spot', d.brandColours); }
  // per-item branding-colours control — same detail/options as project, writing to the item override
  function brandColoursControlItem(it,d){
    const ov=it.over||{}; const overridden = ov.brandMode!=null || ov.brandColours!=null;
    const mode = ov.brandMode || d.brandMode || 'spot';
    const cols = ov.brandColours || d.brandColours || [];
    const seg=`<div class="pb-seg" data-segitem="${it.id}:brandMode"><button type="button" data-v="spot" class="${mode==='spot'?'on':''}">Spot colours</button><button type="button" data-v="mono" class="${mode==='mono'?'on':''}">Mono</button><button type="button" data-v="full" class="${mode==='full'?'on':''}">Full colour</button><button type="button" data-v="none" class="${mode==='none'?'on':''}">Unbranded</button></div>`;
    const swatches=allBrandColours(d).map(c=>{const on=cols.includes(c.name); const custom=!BRAND_COLOURS.some(x=>x.name===c.name); const cls=on?(overridden?'on':'inherit'):''; return `<button type="button" class="pb-bsw ${cls}" data-ibcol="${it.id}:${esc(c.name)}"><i style="background:${c.hex};${String(c.hex).toUpperCase()==='#FFFFFF'?'box-shadow:inset 0 0 0 1px var(--line-soft)':''}"></i><span class="pb-bswn">${esc(c.name)}${custom?'<em>project</em>':''}</span><span class="pb-bswp">${esc(c.pantone||'—')}</span></button>`;}).join('');
    const actions=`<div class="pb-bcact"><button type="button" class="pb-bcadd" data-addcol="${it.id}">+ Project colour</button><a class="pb-bcmanage" href="Merchsmith Brand Assets.html#cat=colours">Manage in Brand Assets ›</a>${overridden?`<button type="button" class="pb-bcreset" data-ibreset="${it.id}">Reset to default</button>`:''}</div>`;
    const cap = overridden ? `Overridden · ${modeLabel(mode,cols)}` : `Inheriting · ${brandModeLabel(d)}`;
    return `<div class="pb-brandcol"><div class="pb-bcmode">${seg}<span class="pb-bccap ${overridden?'ov':''}">${cap}</span></div><div class="pb-bswrow ${(mode==='spot'||mode==='mono')?'':'pb-dim'}">${swatches}</div>${actions}</div>`;
  }
  function sampleDefLabel(s){ s=s||{}; return s.required?(s.type==='unbranded'?'Unbranded sample':'Branded sample'):'Not required'; }
  function brandColoursControl(d){
    const mode=d.brandMode||'spot';
    const seg=`<div class="pb-seg" data-seg="defaults.brandMode"><button type="button" data-v="spot" class="${mode==='spot'?'on':''}">Spot colours</button><button type="button" data-v="mono" class="${mode==='mono'?'on':''}">Mono</button><button type="button" data-v="full" class="${mode==='full'?'on':''}">Full colour</button><button type="button" data-v="none" class="${mode==='none'?'on':''}">Unbranded</button></div>`;
    const swatches=allBrandColours(d).map(c=>{const on=(d.brandColours||[]).includes(c.name); const custom=!BRAND_COLOURS.some(x=>x.name===c.name); return `<button type="button" class="pb-bsw ${on?'on':''}" data-bcol="${esc(c.name)}"><i style="background:${c.hex};${String(c.hex).toUpperCase()==='#FFFFFF'?'box-shadow:inset 0 0 0 1px var(--line-soft)':''}"></i><span class="pb-bswn">${esc(c.name)}${custom?'<em>project</em>':''}</span><span class="pb-bswp">${esc(c.pantone||'—')}</span></button>`;}).join('');
    const actions=`<div class="pb-bcact"><button type="button" class="pb-bcadd" data-addcol>+ Project colour</button><a class="pb-bcmanage" href="Merchsmith Brand Assets.html#cat=colours">Manage in Brand Assets ›</a></div>`;
    return `<div class="pb-brandcol"><div class="pb-bcmode">${seg}<span class="pb-bccap">${brandModeLabel(d)}</span></div><div class="pb-bswrow ${(mode==='spot'||mode==='mono')?'':'pb-dim'}">${swatches}</div>${actions}</div>`;
  }
  function logoPicker(selected, attr){ attr=attr||'logo';
    return `<div class="pb-logocards">${LOGOS.map(l=>{const on=(selected||[]).includes(l.id); return `<div class="pb-logocard ${on?'on':''}">
      <button type="button" class="pb-logosel" data-${attr}="${l.id}">
        <span class="pb-logothumb" style="background:${l.bg};color:${l.fg}">Aa</span>
        <span class="pb-logometa"><b>${esc(l.name)}</b><span>${l.fmts.join(' · ')} · ${l.dims}</span></span>
        <span class="pb-logocheck ${on?'on':''}">${on?'<svg class="icn"><use href="#ic-check"/></svg>':''}</span>
      </button>
      <button type="button" class="pb-logoexp" data-logoexp="${l.id}" aria-label="Details"><svg class="icn"><use href="#ic-caret"/></svg></button>
      <div class="pb-logodetail" id="pbLogoDet-${l.id}" hidden><div><span>Formats</span><b>${l.fmts.join(' · ')}</b></div><div><span>Dimensions</span><b>${l.dims}</b></div><div><span>File size</span><b>${l.size}</b></div><div><span>Ink</span><b>${esc(l.ink)}</b></div></div>
    </div>`;}).join('')}</div>`;
  }

  function defaultsHTML(b){
    const d=b.defaults; const pf=platform();
    const swMulti=(list,vals,attr)=>`<div class="pb-swrow">${list.map(c=>{const name=c.name||c; const hex=c.hex||PCHEX[name]||'#bbb'; const on=vals.includes(name); return `<button type="button" class="pb-sw ${on?'on':''}" data-${attr}="${esc(name)}" title="${esc(name)}"><i style="background:${hex}"></i><span>${esc(name)}</span></button>`;}).join('')}</div>`;
    const countrySel=`<select class="pb-sel" data-edit="defaults.country">${COUNTRIES.map((c,i)=>`<option value="${i}" ${d.country===i?'selected':''}>${c}</option>`).join('')}</select>`;
    const dateTile=`<div class="pb-dater"><input type="date" class="pb-date" data-edit="defaults.delivery.iso" value="${d.delivery.iso}"><div class="pb-seg" data-seg="defaults.delivery.mode"><button type="button" data-v="nofail" class="${d.delivery.mode==='nofail'?'on':''}">No-fail</button><button type="button" data-v="approx" class="${d.delivery.mode==='approx'?'on':''}">Approx.</button></div></div>`;
    const sampleTile=`<div class="pb-sample"><div class="pb-seg" data-seg="defaults.sample.required" data-bool><button type="button" data-v="1" class="${d.sample.required?'on':''}">Required</button><button type="button" data-v="0" class="${!d.sample.required?'on':''}">Not needed</button></div><div class="pb-seg ${d.sample.required?'':'pb-dim'}" data-seg="defaults.sample.type"><button type="button" data-v="branded" class="${d.sample.type==='branded'?'on':''}">Branded</button><button type="button" data-v="unbranded" class="${d.sample.type==='unbranded'?'on':''}">Unbranded</button></div></div>`;
    const qtyTile=`<input type="number" class="pb-num" min="1" step="50" data-edit="defaults.expectedQty" value="${d.expectedQty}">`;
    const susTile = pf.sustainabilityFilter
      ? `<div class="pb-susr"><input type="range" min="0" max="10" step="1" class="pb-range" data-edit="defaults.sustainabilityMin" value="${d.sustainabilityMin}"><b id="pbSusV">${d.sustainabilityMin}+ / 10</b></div>`
      : `<div class="pb-suoff">Off · enable in <a href="Merchsmith Admin.html#nav=settings">Platform settings</a> <span class="pb-phase">Phase 2</span></div>`;
    return `<section class="pb-block">
      <div class="pb-blockhd"><h3>Project defaults</h3></div>
      <div class="pb-grid">
        ${tile('Delivery date', dateTile)}
        ${tile('Delivery country', countrySel)}
        ${tile('Expected quantity', qtyTile)}
        ${tile('Product colours <span class="pb-tlnote">preferred body colours</span>', swMulti(PRODUCT_COLOURS, d.productColours, 'pcol'), {wide:true})}
        ${tile('Branding colours', brandColoursControl(d), {wide:true, link:{href:'Merchsmith Brand Assets.html#cat=colours', label:'Colours'}})}
                ${tile('Logotypes', logoPicker(d.logos), {full:true, link:{href:'Merchsmith Brand Assets.html#cat=logos', label:'Logo Types'}})}
        ${d.brandNotes?tile('Branding notes', `<p class="pb-bnotes">${esc(d.brandNotes)}</p>`, {full:true}):''}
          ${tile('Sample', sampleTile)}
        ${tile('Sustainability minimum', susTile)}
      </div>
    </section>`;
  }

  function itemsHTML(b){
    const d=b.defaults;
    const rows=b.items.map(it=>{
      const ov=it.over||{};
      const added = it.added || (it.fulfilledBy?[{id:it.fulfilledId,name:it.fulfilledBy,unit:it.fulfilledUnit,img:it.fulfilledImg}]:[]);
      const fulfil = (function(){
        const tags = added.map(a=>{
          const tgt=+it.unit, d=(a.unit!=null)?a.unit-tgt:0;
          const dTxt = a.unit==null?'' : (Math.abs(d)<0.005?'on target':(d>0?gbp(d)+' over':gbp(-d)+' under'));
          const dCls = Math.abs(d)<0.005?'on':(d>0?'over':'under');
          return `<span class="pb-prodtag" title="Added to the project from this brief"><svg class="icn"><use href="#ic-check"/></svg><b>${esc(a.name)}</b>${a.unit!=null?` · ${gbp(a.unit)}/unit <span class="pb-delta ${dCls}">${dTxt}</span>`:''}<button type="button" class="pb-untag" data-unadd="${it.id}:${esc(a.id)}" title="Remove from project">×</button></span>`;
        }).join('');
        const btn = `<button type="button" class="pb-find" data-find="${it.id}"><svg class="icn"><use href="#ic-search"/></svg>${added.length?'Add another':'Find &amp; add product'}</button>`;
        return added.length ? `<span class="pb-addedwrap"><span class="pb-addedlbl">${added.length} added</span>${tags}</span>${btn}` : `<span class="pb-nosource" title="No product has been sourced for this item yet"><span class="pb-noscircle">!</span>Product not sourced</span>${btn}`;
      })();
      const noteTag = it.notes ? `<span class="pb-noteflag" title="${esc(it.notes)}"><svg class="icn"><use href="#ic-doc"/></svg>Note</span>` : '';
      const pcolHas=ov.colour!=null;
      const pcolOv=`<div class="pb-swrow sm">${PRODUCT_COLOURS.map(c=>{const on=pcolHas&&ov.colour===c;const inh=!pcolHas&&d.productColours.includes(c);return `<button type="button" class="pb-sw xs ${on?'on':''} ${inh?'inherit':''}" data-ovpcol="${it.id}:${esc(c)}" title="${esc(c)}${inh?' · from defaults':''}"><i style="background:${PCHEX[c]||'#bbb'};${String(PCHEX[c]).toUpperCase()==='#F4F4F0'?'box-shadow:inset 0 0 0 1px var(--line-soft)':''}"></i><span>${esc(c)}</span></button>`;}).join('')}<span class="pb-ovdefnote">${pcolHas?'Overridden':'Inheriting project defaults'}</span></div>`;
      const ovBcol=ov.brandColours||[]; const bcolHas=(ov.brandMode!=null||ov.brandColours!=null);
      const bcolOv=brandColoursControlItem(it,d);
      const ovLogos=ov.logos||[]; const logoHas=ovLogos.length>0;
      const logoOv=`<div class="pb-swrow sm">${LOGOS.map(l=>{const on=logoHas&&ovLogos.includes(l.id);const inh=!logoHas&&d.logos.includes(l.id);return `<button type="button" class="pb-sw xs ${on?'on':''} ${inh?'inherit':''}" data-ovlogo="${it.id}:${l.id}" title="${esc(l.name)}${inh?' · from defaults':''}"><span class="pb-logothumb xs" style="background:${l.bg};color:${l.fg}">Aa</span><span>${esc(l.name.replace('Logo — ',''))}</span></button>`;}).join('')}<span class="pb-ovdefnote">${logoHas?'Overridden':'Inheriting project defaults'}</span></div>`;
      const itArt=artworkForItem(it); const selArt=it.artwork||[];
      const artOv = itArt.length
        ? `<div class="pb-artrow">${itArt.map(a=>{const on=selArt.includes(a.id);const thumb=a._src?`<img src="${a._src}" alt="">`:`<image-slot id="ba-${esc(a.img)}" shape="rounded" fit="contain" placeholder="Artwork"></image-slot>`;return `<button type="button" class="pb-artcard ${on?'on':''}" data-itart="${it.id}:${a.id}"><span class="pb-artthumb">${thumb}</span><span class="pb-artmeta"><b>${esc(a.name)}</b><span>${(a.fmts||[]).join(' · ')}${a.product&&a.product!=='—'?' · '+esc(a.product):''}</span></span><span class="pb-artcheck ${on?'on':''}">${on?'<svg class="icn"><use href="#ic-check"/></svg>':''}</span></button>`;}).join('')}</div>`
        : `<div class="pb-artempty">No artwork tagged for <b>${esc(it.cat)}</b> yet. Add product artwork in Brand Assets and tag it to this category.</div>`;
      const sampleSel=`<select class="pb-sel sm" data-ovedit="${it.id}:sample"><option value="">Default · ${sampleDefLabel(d.sample)}</option><option value="branded" ${ov.sample&&ov.sample.required&&ov.sample.type==='branded'?'selected':''}>Branded sample</option><option value="unbranded" ${ov.sample&&ov.sample.required&&ov.sample.type==='unbranded'?'selected':''}>Unbranded sample</option><option value="none" ${ov.sample&&!ov.sample.required?'selected':''}>Not required</option></select>`;
      // effective values (default unless overridden) — shown on the collapsed row
      const chip=(label,val,isOv)=>`<span class="pb-effchip ${isOv?'ov':''}"><em>${label}</em>${esc(val)}</span>`;
      const effColour = pcolHas?ov.colour:(d.productColours.join(' / ')||'—');
      const effBrand = bcolHas?modeLabel(ov.brandMode||d.brandMode,ov.brandColours||d.brandColours):brandModeLabel(d);
      const effSample = ov.sample?sampleDefLabel(ov.sample):sampleDefLabel(d.sample);
      const effDate = ov.deliveryISO?fmtDate(ov.deliveryISO):fmtDate(d.delivery.iso);
      const effCountry = ov.country!=null?COUNTRIES[ov.country]:COUNTRIES[d.country];
      const effPos = ov.positions||d.positions;
      const effLogos = (logoHas?ovLogos:d.logos).length;
      const effChips = chip('Colour',effColour,pcolHas)+chip('Branding',effBrand,bcolHas)+chip('Logos',effLogos+'',logoHas)+chip('Sample',effSample,!!ov.sample)+chip('Delivery',effDate,!!ov.deliveryISO)+chip('Ships to',effCountry,ov.country!=null)+chip('Positions',effPos,!!ov.positions)+(selArt.length?chip('Artwork',selArt.length+'',true):'');
      return `<div class="pb-item" data-item="${it.id}">
        <div class="pb-itmain">
          <input type="text" class="pb-ittype" data-itedit="${it.id}:type" value="${esc(it.type)}" placeholder="Product type">
          <select class="pb-itcat" data-itedit="${it.id}:cat">${CATEGORIES.map(c=>`<option ${it.cat===c?'selected':''}>${c}</option>`).join('')}</select>
          <div class="pb-itqty"><input type="number" class="pb-num sm" min="1" step="25" data-itedit="${it.id}:qty" value="${it.qty}"><span>units</span></div>
          <div class="pb-itunit"><span>@ £</span><input type="number" class="pb-num sm" min="0" step="0.05" data-itedit="${it.id}:unit" value="${(+it.unit).toFixed(2)}"><span>/unit</span></div>
          <div class="pb-itbud"><b>${gbp(itemBudget(it))}</b><span>line budget</span></div>
          <button class="pb-itcust ${openItems.has(it.id)?'on':''}" data-cust="${it.id}" title="Override defaults for this item"><svg class="icn"><use href="#ic-settings"/></svg></button>
          <button class="pb-itdel" data-del="${it.id}" title="Remove">×</button>
        </div>
        <div class="pb-itstatus">${fulfil}${noteTag}<span class="pb-effrow">${effChips}</span></div>
        ${it.notes?`<p class="pb-itnote"><svg class="icn"><use href="#ic-doc"/></svg><span>${esc(it.notes)}</span></p>`:''}
        <div class="pb-itover" id="pbOver-${it.id}" ${openItems.has(it.id)?'':'hidden'}>
          <div class="pb-ovgrid">
            ${ovField(it,'country','Delivery country', `<select class="pb-sel sm" data-ovedit="${it.id}:country"><option value="">Default · ${esc(COUNTRIES[d.country])}</option>${COUNTRIES.map((c,i)=>`<option value="${i}" ${ov.country===i?'selected':''}>${c}</option>`).join('')}</select>`)}
            ${ovField(it,'deliveryISO','Delivery date', `<input type="date" class="pb-sel sm" data-ovedit="${it.id}:deliveryISO" value="${ov.deliveryISO||''}"><span class="pb-ovdefnote">${ov.deliveryISO?'':'Default · '+fmtDate(d.delivery.iso)}</span>`)}
            ${ovField(it,'sample','Sample', sampleSel)}
            ${ovField(it,'positions','Branding positions', `<input type="text" class="pb-sel sm" data-ovedit="${it.id}:positions" value="${esc(ov.positions||'')}" placeholder="Default · ${esc(d.positions)}">`)}
          </div>
          <div class="pb-ovwide"><label>Product colour</label>${pcolOv}</div>
          <div class="pb-ovwide"><label>Branding colours</label>${bcolOv}</div>
          <div class="pb-ovwide"><label>Logotypes</label>${logoOv}</div>
          <div class="pb-ovwide"><label>Product artwork <a class="pb-balink" href="Merchsmith Brand Assets.html#cat=artwork">Product Artwork ↗</a></label>${artOv}</div>
          <div class="pb-ovwide"><label>Notes for this product</label><textarea class="pb-itnotes" data-itedit="${it.id}:notes" rows="2" placeholder="Add any notes for this product — finish, packaging, special requests…">${esc(it.notes||'')}</textarea></div>
        </div>
      </div>`;
    }).join('');
    return `<section class="pb-block">
      <div class="pb-blockhd"><h3>Requested items</h3><span class="pb-blocksub">The shopping list — each becomes a product to source</span></div>
      <div class="pb-items">${rows}</div>
      <button class="pb-additem" data-additem><svg class="icn"><use href="#ic-plus"/></svg>Add item</button>
    </section>`;
  }
  function ovField(it,key,label,control){ return `<div class="pb-ovf"><label>${label}</label>${control}</div>`; }

  /* =======================================================================
     WIRE
     ======================================================================= */
  function setPath(path, val){ const parts=path.split('.'); let o=load(); for(let i=0;i<parts.length-1;i++) o=o[parts[i]]; o[parts[parts.length-1]]=val; save(); }
  function getItem(id){ return load().items.find(x=>x.id===id); }
  // start a per-item brand override from the current effective values (so existing inherited colours carry over)
  function seedBrandOv(it,d){ it.over=it.over||{}; if(it.over.brandColours==null){ const m=(it.over.brandMode||d.brandMode||'spot'); const inheritCols=(m==='spot'||m==='mono'); it.over.brandColours=inheritCols?(d.brandColours||[]).slice():[]; } if(it.over.brandMode==null) it.over.brandMode=d.brandMode||'spot'; return it.over; }

  function wire(root){
    // prose / inputs (generic data-edit)
    root.querySelectorAll('[data-edit]').forEach(el=>{
      const path=el.dataset.edit;
      if(el.isContentEditable){ el.addEventListener('blur',()=>{ setPath(path, el.innerText.trim()); }); }
      else if(el.type==='range'){ el.addEventListener('input',()=>{ setPath(path,+el.value); const v=document.getElementById('pbSusV'); if(v)v.textContent=el.value+'+ / 10'; }); }
      else if(el.tagName==='SELECT'){ el.addEventListener('change',()=>{ const v=path.endsWith('country')?+el.value:el.value; setPath(path,v); }); }
      else { el.addEventListener('change',()=>{ const v=(el.type==='number')?(+el.value||0):el.value; setPath(path,v); if(path==='campaign.budget') render(); }); }
    });
    // product / brand colour multiselect
    root.querySelectorAll('.pb-sw[data-pcol]').forEach(b=>b.onclick=()=>toggleArr('defaults.productColours', b.dataset.pcol, b));
    root.querySelectorAll('.pb-bsw[data-bcol]').forEach(b=>b.onclick=()=>{ const d=load().defaults; if(d.brandMode==='full'||d.brandMode==='none'){ d.brandMode='spot'; } toggleArrLoose('defaults.brandColours', b.dataset.bcol); save(); render(); });
    // add a project-unique brand colour (shared palette); selects into the project default or the item override depending on origin
    root.querySelectorAll('[data-addcol]').forEach(ac=>ac.onclick=()=>{ const n=prompt('Colour name (unique to this project):'); if(!n) return; const hex=prompt('Hex value:','#')||'#888888'; const pms=prompt('Pantone reference (optional):','')||''; const d=load().defaults; d.customColours=d.customColours||[]; d.customColours.push({name:n,hex:hex,pantone:pms}); const itemId=ac.dataset.addcol; if(itemId){ const it=getItem(itemId); if(it){ const ov=seedBrandOv(it,d); if(!ov.brandColours.includes(n))ov.brandColours.push(n); ov.brandMode='spot'; } } else { if(!d.brandColours.includes(n))d.brandColours.push(n); d.brandMode='spot'; } save(); render(); });
    // logo select (default) + expand details
    root.querySelectorAll('.pb-logosel[data-logo]').forEach(b=>b.onclick=()=>{ const arr=load().defaults.logos; const id=b.dataset.logo; const i=arr.indexOf(id); if(i>=0){ if(arr.length>1)arr.splice(i,1); } else arr.push(id); save(); render(); });
    root.querySelectorAll('[data-logoexp]').forEach(b=>b.onclick=()=>{ const det=document.getElementById('pbLogoDet-'+b.dataset.logoexp); if(det){ det.hidden=!det.hidden; b.classList.toggle('on',!det.hidden); } });
    // segmented toggles (delivery mode, brand mode, sample required/type)
    root.querySelectorAll('.pb-seg[data-seg]').forEach(seg=>seg.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
      const path=seg.dataset.seg; let v=btn.dataset.v; if(seg.hasAttribute('data-bool')) v=(v==='1'); setPath(path,v);
      seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn));
      if(path==='defaults.sample.required'||path==='defaults.brandMode') render();
    }));
    // attachments — add / delete / zoom-browse
    const af=root.querySelector('[data-addfile]'); if(af) af.onclick=()=>{ const n=prompt('Attachment name:','New image'); if(n){ load().campaign.attachments.push({id:'a'+Date.now(),name:n}); save(); render(); } };
    root.querySelectorAll('[data-attdel]').forEach(b=>b.onclick=()=>{ const arr=load().campaign.attachments; arr.splice(+b.dataset.attdel,1); save(); render(); });
    root.querySelectorAll('[data-attzoom]').forEach(b=>b.onclick=()=>openLightbox(+b.dataset.attzoom));

    // ---- requested items ----
    root.querySelectorAll('[data-itedit]').forEach(el=>el.addEventListener('change',()=>{
      const [id,key]=el.dataset.itedit.split(':'); const it=getItem(id); if(!it) return;
      it[key]=(key==='qty'||key==='unit')?(+el.value||0):el.value; save(); render();
    }));
    root.querySelectorAll('[data-cust]').forEach(b=>b.onclick=()=>{ const id=b.dataset.cust; if(openItems.has(id))openItems.delete(id); else openItems.add(id); const ov=document.getElementById('pbOver-'+id); if(ov){ ov.hidden=!openItems.has(id); b.classList.toggle('on',openItems.has(id)); } });
    root.querySelectorAll('[data-ovedit]').forEach(el=>el.addEventListener('change',()=>{
      const [id,key]=el.dataset.ovedit.split(':'); const it=getItem(id); if(!it) return; it.over=it.over||{};
      if(key==='sample'){ if(el.value==='') delete it.over.sample; else if(el.value==='none') it.over.sample={required:false}; else it.over.sample={required:true,type:el.value}; }
      else if(el.value===''){ delete it.over[key]; }
      else { it.over[key]=(key==='country')?+el.value:el.value; }
      save(); render();
    }));
    // per-item product-colour swatch (single-select override; click again to clear)
    root.querySelectorAll('[data-ovpcol]').forEach(b=>b.onclick=()=>{ const [id,name]=b.dataset.ovpcol.split(':'); const it=getItem(id); if(!it)return; it.over=it.over||{}; if(it.over.colour===name) delete it.over.colour; else it.over.colour=name; save(); render(); });
    // per-item branding colours — full control mirroring project (mode segment + detailed swatches + reset)
    root.querySelectorAll('.pb-seg[data-segitem]').forEach(seg=>seg.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
      const [id]=seg.dataset.segitem.split(':'); const it=getItem(id); const d=load().defaults; if(!it)return; it.over=it.over||{};
      const v=btn.dataset.v; it.over.brandMode=v; if(v==='full'||v==='none'){ delete it.over.brandColours; } save(); render();
    }));
    root.querySelectorAll('[data-ibcol]').forEach(b=>b.onclick=()=>{ const [id,name]=b.dataset.ibcol.split(':'); const it=getItem(id); const d=load().defaults; if(!it)return; const ov=seedBrandOv(it,d); if(ov.brandMode!=='spot'&&ov.brandMode!=='mono') ov.brandMode='spot'; const i=ov.brandColours.indexOf(name); if(i>=0)ov.brandColours.splice(i,1); else ov.brandColours.push(name); save(); render(); });
    root.querySelectorAll('[data-ibreset]').forEach(b=>b.onclick=()=>{ const it=getItem(b.dataset.ibreset); if(!it||!it.over)return; delete it.over.brandMode; delete it.over.brandColours; save(); render(); });
    root.querySelectorAll('[data-ovlogo]').forEach(b=>b.onclick=()=>{ const [id,lid]=b.dataset.ovlogo.split(':'); const it=getItem(id); if(!it)return; it.over=it.over||{}; const arr=it.over.logos=it.over.logos||[]; const i=arr.indexOf(lid); if(i>=0)arr.splice(i,1); else arr.push(lid); if(!arr.length)delete it.over.logos; save(); render(); });
    // per-item product artwork (from Brand Assets) — multiselect
    root.querySelectorAll('[data-itart]').forEach(b=>b.onclick=()=>{ const [id,aid]=b.dataset.itart.split(':'); const it=getItem(id); if(!it)return; const arr=it.artwork=it.artwork||[]; const i=arr.indexOf(aid); if(i>=0)arr.splice(i,1); else arr.push(aid); if(!arr.length)delete it.artwork; save(); render(); });
    root.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const id=b.dataset.del; const arr=load().items; const i=arr.findIndex(x=>x.id===id); if(i>=0){ arr.splice(i,1); save(); render(); } });
    root.querySelectorAll('[data-find]').forEach(b=>b.onclick=()=>{ const it=getItem(b.dataset.find); const dep=(it&&CAT_DEPT[it.cat])||'lifestyle'; save(); try{ localStorage.setItem('ms-brief-pending', JSON.stringify({project:PROJECT,itemId:b.dataset.find})); }catch(e){} window.location.href='Merchsmith Store.html#dept='+dep; });
    root.querySelectorAll('[data-unadd]').forEach(b=>b.onclick=()=>{ const [id,pid]=b.dataset.unadd.split(':'); const it=getItem(id); if(!it)return; it.added=(it.added||[]).filter(a=>String(a.id)!==pid); if(!it.added.length)delete it.added; delete it.fulfilledBy; delete it.fulfilledId; delete it.fulfilledUnit; delete it.fulfilledImg; save(); render(); });
    const add=root.querySelector('[data-additem]'); if(add) add.onclick=()=>{ const d=load().defaults; load().items.push({ id:'it'+Date.now(), type:'New item', cat:'Eco', qty:d.expectedQty, unit:1.00 }); save(); render(); };
  }
  function toggleArr(path, name, btn){ const parts=path.split('.'); let o=load(); for(let i=0;i<parts.length-1;i++)o=o[parts[i]]; const arr=o[parts[parts.length-1]]; const i=arr.indexOf(name); if(i>=0){ if(arr.length>1)arr.splice(i,1); else return; } else arr.push(name); save(); if(btn)btn.classList.toggle('on'); }
  function toggleArrLoose(path, name){ const parts=path.split('.'); let o=load(); for(let i=0;i<parts.length-1;i++)o=o[parts[i]]; const arr=o[parts[parts.length-1]]; const i=arr.indexOf(name); if(i>=0)arr.splice(i,1); else arr.push(name); }

  /* ---- attachment lightbox (zoom + browse) ---- */
  let lbIdx=0;
  function attList(){ return load().campaign.attachments||[]; }
  function slotImg(att){ const el=document.getElementById('pb-att-'+(att.id)); if(!el||!el.shadowRoot) return null; const im=[...el.shadowRoot.querySelectorAll('img')].map(i=>i.getAttribute('src')).find(s=>s&&/^data:image\//i.test(s)); return im||null; }
  function ensureLightbox(){ let lb=document.getElementById('pbLightbox'); if(lb) return lb;
    lb=document.createElement('div'); lb.id='pbLightbox'; lb.className='pb-lb'; lb.hidden=true;
    lb.innerHTML=`<div class="pb-lb-scrim" data-lbclose></div>
      <button class="pb-lb-x" data-lbclose aria-label="Close">×</button>
      <button class="pb-lb-nav prev" data-lbprev aria-label="Previous">‹</button>
      <figure class="pb-lb-stage"><img id="pbLbImg" alt=""><div class="pb-lb-empty" id="pbLbEmpty">No image yet — drop one on the thumbnail to preview it here.</div><figcaption id="pbLbCap"></figcaption></figure>
      <button class="pb-lb-nav next" data-lbnext aria-label="Next">›</button>`;
    document.body.appendChild(lb);
    lb.querySelectorAll('[data-lbclose]').forEach(b=>b.onclick=closeLightbox);
    lb.querySelector('[data-lbprev]').onclick=()=>stepLightbox(-1);
    lb.querySelector('[data-lbnext]').onclick=()=>stepLightbox(1);
    document.addEventListener('keydown',e=>{ if(lb.hidden)return; if(e.key==='Escape')closeLightbox(); else if(e.key==='ArrowLeft')stepLightbox(-1); else if(e.key==='ArrowRight')stepLightbox(1); });
    return lb;
  }
  function showLightbox(){ const lb=ensureLightbox(); const list=attList(); if(!list.length){ closeLightbox(); return; } lbIdx=(lbIdx+list.length)%list.length; const att=list[lbIdx]; const src=slotImg(att); const img=lb.querySelector('#pbLbImg'), empty=lb.querySelector('#pbLbEmpty'); if(src){ img.src=src; img.style.display=''; empty.style.display='none'; } else { img.removeAttribute('src'); img.style.display='none'; empty.style.display=''; } lb.querySelector('#pbLbCap').textContent=`${att.name} · ${lbIdx+1} / ${list.length}`; const multi=list.length>1; lb.querySelectorAll('.pb-lb-nav').forEach(n=>n.style.display=multi?'':'none'); }
  function openLightbox(i){ lbIdx=i; ensureLightbox().hidden=false; document.body.style.overflow='hidden'; showLightbox(); }
  function stepLightbox(d){ lbIdx+=d; showLightbox(); }
  function closeLightbox(){ const lb=document.getElementById('pbLightbox'); if(lb){ lb.hidden=true; document.body.style.overflow=''; } }

  /* ---- editable project title (persists; reflects in breadcrumb + document.title) ---- */
  // keyed per project (?pid=…) so renaming one project never leaks into another
  const PIDQ=(()=>{ try{ return new URLSearchParams(location.search).get('pid')||''; }catch(e){ return ''; } })();
  const TITLE_KEY='ms-project-title'+(PIDQ&&PIDQ!=='autumn'?'::'+PIDQ:'');
  function wireTitle(){
    const h1=document.querySelector('h1.ptitle'); if(!h1) return;
    let stored=''; try{ stored=localStorage.getItem(TITLE_KEY)||''; }catch(e){}
    const apply=t=>{ const here=document.querySelector('.crumbband .here'); if(here) here.textContent=t; if(document.title.includes('·')) document.title=document.title.replace(/·[^·]*$/,'· '+t); };
    if(stored){ h1.textContent=stored; apply(stored); }
    h1.setAttribute('contenteditable','true'); h1.setAttribute('spellcheck','false'); h1.classList.add('pb-titleedit'); h1.title='Click to rename this project';
    const commit=()=>{ const t=h1.textContent.trim()||'Untitled project'; h1.textContent=t; try{ localStorage.setItem(TITLE_KEY,t); }catch(e){} apply(t); };
    h1.addEventListener('blur',commit);
    h1.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); h1.blur(); } });
  }

  // deep-link: arriving from the store with #briefitem=<id> opens the brief and focuses that line
  function focusBriefItem(){
    const m=String(location.hash||'').match(/briefitem=([A-Za-z0-9_-]+)/); if(!m) return;
    const id=m[1]; const panel=document.getElementById('brief'); const btn=document.getElementById('briefToggle');
    if(panel && panel.hasAttribute('hidden')){ panel.hidden=false; if(btn) btn.classList.add('open'); }
    const scrollTo=()=>{ const el=document.querySelector('.pb-item[data-item="'+id+'"]'); if(!el) return false; const r=el.getBoundingClientRect(); window.scrollTo(0, Math.max(0, r.top+window.scrollY-120)); return true; };
    let tries=0;
    const tick=()=>{ const el=document.querySelector('.pb-item[data-item="'+id+'"]'); if(el){ el.classList.add('pb-item-focus'); setTimeout(()=>el.classList.remove('pb-item-focus'),2600); scrollTo(); [120,300,600,1000].forEach(t=>setTimeout(scrollTo,t)); try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} } else if(tries++<25){ setTimeout(tick,80); } };
    setTimeout(tick, 180);
  }

  window.MSBrief={ get:load, render, defaultsFor, save, COUNTRIES, BRAND_COLOURS, LOGOS };
  function init(){ render(); wireTitle(); focusBriefItem(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
