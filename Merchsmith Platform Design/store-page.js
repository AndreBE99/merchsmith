/* store-page.js — Merchsmith Store: departments → listing → product */
(function(){
  const S = window.STORE;
  const view = document.getElementById('view');
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const gbp = n => '£'+Number(n).toFixed(2);
  // Assets we have, plus any the back-end syncs in. To make a synced image appear,
  // add its filename (without .png) to window.STORE.assets in store-feed.js — no other change needed.
  const ASSETS = new Set(['cable','pen','garden','mouse','bag','book'].concat((S.assets)||[]));
  // real products whose feed keyword has no PNG yet — alias to the closest synced image
  const IMG_ALIAS={notebook:'book',tote:'bag',pencil:'pen',pouch:'desk',tshirt:'clothing',cup:'drinkware'};
  const imgBase=img=>IMG_ALIAS[img]||img;
  // does this (store-shape) product resolve to a real image?
  function hasImg(p){ const url=p.imgUrl||p.image||''; if(/^(https?:|data:image\/)/.test(url)) return true; return !!p.img && ASSETS.has(imgBase(p.img)); }
  function imgEl(img, cls, ph, url){
    const direct = (url && /^(https?:|data:image\/)/.test(url)) ? url
                 : (typeof img==='string' && /^(https?:|data:image\/)/.test(img)) ? img : '';
    if(direct) return `<img src="${direct}" alt="" loading="lazy" decoding="async">`;
    const base = imgBase(img);
    if(ASSETS.has(base)) return `<img src="assets/products/${base}.png" alt="" loading="lazy" decoding="async">`;
    return `<image-slot id="store-${base}" class="${cls||''}" shape="rect" fit="cover" placeholder="${esc(ph||'Drop image')}"></image-slot>`;
  }
  const SW = {'Volcanic Black':'#1a1a1e','Black':'#1a1a1e','Aqua Blue':'#7fd4d1','Aqua':'#7fd4d1','Green':'#3a9d6b','Grey':'#8a8a93','Light grey':'#c8c8cf','Dark Blue':'#2a3550','White':'#f4f4f0','Natural':'#e9e2d0','Charcoal':'#3a3a40','Navy':'#23304d','Stone':'#d8d2c4','Cork':'#c9a36a','Kraft':'#c8a878','Terracotta':'#c66a4a','Blue':'#2a5cd0','Sea Blue':'#2f6f9e','Multi':'conic-gradient(red,orange,gold,green,blue,violet,red)'};
  const sw = c => `<span class="sw" style="background:${SW[c]||'#bbb'}" title="${esc(c)}"></span>`;
  // brand-builder-styled swatch + variant chips (match the modal)
  const PMS = {'Volcanic Black':'PMS Black 6 C','Black':'PMS Black 6 C','White':'PMS 11-0601 TCX','Natural':'PMS 7527 C','Charcoal':'PMS 425 C','Navy':'PMS 533 C','Grey':'PMS Cool Gray 8 C','Light grey':'PMS Cool Gray 4 C','Light Grey':'PMS Cool Gray 4 C','Kraft':'PMS 7508 C','Aqua Blue':'PMS 7466 C','Aqua':'PMS 7466 C','Green':'PMS 348 C','Dark Blue':'PMS 533 C','Stone':'PMS 7528 C','Cork':'PMS 7510 C','Terracotta':'PMS 7522 C','Sage':'PMS 5635 C','Sand':'PMS 7501 C'};
  const pmsOf = c => PMS[c]||'';
  // show a PMS/Pantone ref only when the feed actually provides one for this colour (pms passed in)
  const bbSw = (c,pms) => `<span class="bb-sw on"><i style="background:${SW[c]||'#bbb'}"></i><span>${esc(c)}${pms?`<small>${esc(pms)}</small>`:''}</span></span>`;
  const bbVar = v => `<span class="bb-var on">${esc(v)}</span>`;
  // ---- shared sample-cost store (same key/shape as product-modal.js) ----
  const SAMPLE_MARKUP=1.35, SAMPLE_MIN_UPLIFT=5;
  function scLoad(){ try{ return JSON.parse(localStorage.getItem('ms-sample-costs')||'{}'); }catch(e){ return {}; } }
  function scSave(o){ try{ localStorage.setItem('ms-sample-costs', JSON.stringify(o)); }catch(e){} }
  function scSet(name,type,patch){ const o=scLoad(); o[name]=o[name]||{}; o[name][type]=Object.assign({}, o[name][type]||{}, patch); scSave(o); }
  function scGet(name){ return scLoad()[name]||{}; }
  function scCalc(s){
    s=s||{};
    const auto=c=>Math.max(c*SAMPLE_MARKUP, c+SAMPLE_MIN_UPLIFT);
    if(s.mode==='free'||s.free) return {mode:'free',cost:0,sell:0};
    const isQuote=s.mode==='quote'||s.mode==='quoted'||s.quote;
    const cost=(s.cost!=null)?s.cost:(s.price!=null?s.price:null);
    if(isQuote){
      // a quote only counts as RECEIVED with a genuine receipt stamp (or legacy 'quoted' records);
      // an inherited default cost must not masquerade as a received quote
      const received=(s.received!=null)||(s.mode==='quoted'&&cost!=null);
      if(!received||cost==null) return {mode:'quote', sub:(s.requested?'pending':'idle'), cost:null, sell:null, requested:s.requested};
      const a=auto(cost); const sell=s.sell!=null?s.sell:a;
      return {mode:'quote', sub:'received', cost, sell, auto:a, custom:s.sell!=null&&Math.abs(s.sell-a)>0.005, received:s.received, source:s.source, lead:s.lead, from:s.from, ref:s.ref};
    }
    if(cost==null) return {mode:'quote', sub:'idle', cost:null, sell:null};
    const a=auto(cost); const sell=s.sell!=null?s.sell:a;
    return {mode:'fixed', cost, sell, auto:a, custom:s.sell!=null&&Math.abs(sell-a)>0.005};
  }
  // default sample cost per product (seed): unbranded item cost; branded via quote
  function scDefaults(p){ const item=(p.priceBreaks&&p.priceBreaks[0]&&p.priceBreaks[0].unit)||5; return { unbranded:{mode:'cost',cost:+(item).toFixed(2)}, branded:{mode:'quote',quote:true} }; }
  function sampleEffective(p){ const ov=scGet(p.name); const def=scDefaults(p); return { unbranded:Object.assign({},def.unbranded,ov.unbranded), branded:Object.assign({},def.branded,ov.branded) }; }
  let scFormOpen=null; // which card's quote-entry form is open ('unbranded'|'branded')
  function sampleCostBody(p){
    const sm=sampleEffective(p);
    const today=()=>new Date().toLocaleDateString('en-GB');
    const card=(type,label)=>{
      const c=scCalc(sm[type]);
      const isFixed=c.mode==='fixed', isQuote=c.mode==='quote', isFree=c.mode==='free';
      const priced=isFixed||(isQuote&&c.sub==='received');
      // cost / markup / sell cells
      const costCell = isFree?'<b>Free</b>':(priced?`<span class="sc-edit"><span class="sc-pound">£</span><input type="number" class="sc-cost" data-type="${type}" step="0.01" min="0" value="${c.cost.toFixed(2)}"></span>`:'<b class="sc-await">—</b>');
      const mkCell = !priced?'<b>—</b>':(c.custom?`<b class="sc-custom">Custom</b><button type="button" class="sc-reset" data-type="${type}" title="Reset to suggested (×${SAMPLE_MARKUP.toFixed(2)}, min +£${SAMPLE_MIN_UPLIFT})">⟳</button>`:`<b>×${SAMPLE_MARKUP.toFixed(2)}</b>`);
      const sellCell = isFree?'<b>£0.00</b>':(priced?`<span class="sc-edit"><span class="sc-pound">£</span><input type="number" class="sc-sell" data-type="${type}" step="0.01" min="0" value="${c.sell.toFixed(2)}"></span>`:'<b>—</b>');
      // quote-state chip + actions
      let chip='', actions='';
      if(isQuote){
        if(c.sub==='idle'){
          actions=`<div class="sc-actions"><button type="button" class="sc-act req" data-screq="${type}">Request from supplier ›</button><button type="button" class="sc-act" data-scenter="${type}">Enter quote manually ›</button></div>`;
        } else if(c.sub==='pending'){
          chip=`<div class="sc-chip pending"><b>Quote requested</b><span>${esc(c.requested||'')} — awaiting supplier. Got the price (e.g. by phone)? Enter it below.</span></div>`;
          actions=`<div class="sc-actions"><button type="button" class="sc-act req" data-scenter="${type}">Enter received quote ›</button><button type="button" class="sc-act quiet" data-sccancel="${type}">Cancel request</button></div>`;
        } else {
          chip=`<div class="sc-chip received"><b>Quoted ${gbp(c.cost)}</b><span>${esc(c.received||'')}${c.source==='phone'?' · by phone':' · supplier reply'}${c.from?` · from ${esc(c.from)}`:''}${c.ref?` · ref ${esc(c.ref)}`:''}${c.lead?` · sample lead ${c.lead}d`:''}</span></div>`;
          actions=`<div class="sc-actions"><button type="button" class="sc-act quiet" data-scenter="${type}">Edit quote details ›</button><button type="button" class="sc-act quiet" data-screq="${type}">Re-request ›</button></div>`;
        }
      }
      // inline quote-entry form (pre-filled when editing an existing quote)
      const form = scFormOpen===type?`<div class="sc-form" data-scform="${type}">
        <label>Cost £<input type="number" class="sc-fcost" step="0.01" min="0" placeholder="0.00" value="${c.sub==='received'&&c.cost!=null?c.cost.toFixed(2):''}"></label>
        <label>Sample lead <input type="number" class="sc-flead" step="1" min="0" placeholder="days" value="${c.sub==='received'&&c.lead?c.lead:''}"></label>
        <label>Via <select class="sc-fsrc"><option value="supplier" ${c.sub==='received'&&c.source!=='phone'?'selected':''}>Supplier reply</option><option value="phone" ${(c.sub==='received'?c.source==='phone':!sm[type].requested)?'selected':''}>Phone / manual</option></select></label>
        <label>From (who) <input type="text" class="sc-ffrom" placeholder="e.g. Dana @ PF Concept" value="${esc(c.from||'')}"></label>
        <label>Quote ref <input type="text" class="sc-fref" placeholder="e.g. Q-48812" value="${esc(c.ref||'')}"></label>
        <label>Date / time <input type="text" class="sc-fwhen" placeholder="DD/MM/YYYY HH:MM" value="${esc(c.sub==='received'&&c.received?c.received:'')}"></label>
        <div class="sc-factions"><button type="button" class="sc-act req" data-scsave="${type}">Save quote</button><button type="button" class="sc-act quiet" data-scclose="${type}">Cancel</button></div>
      </div>`:'';
      // branded grounding hint
      const hint = type==='branded'?(function(){ const deco=(p._cat&&p._cat.decoration&&p._cat.decoration[0])||null; const setup=deco&&deco.setup!=null?+deco.setup:25; return `<p class="sc-hint">Branded samples usually include a decoration setup charge (~${gbp(setup)}) on top of the unit — include it in the cost.</p>`; })():'';
      return `<div class="sc-card" data-type="${type}">
        <div class="sc-h"><b>${label}</b></div>
        <div class="sc-modes">
          <button type="button" class="sc-mode ${isFixed?'on':''}" data-type="${type}" data-mode="fixed">Fixed price</button>
          <button type="button" class="sc-mode ${isQuote?'on':''}" data-type="${type}" data-mode="quote">Supplier quote</button>
          <button type="button" class="sc-mode ${isFree?'on':''}" data-type="${type}" data-mode="free">Free</button>
        </div>
        <div class="sc-grid"><div class="sc-cell"><span>Cost</span>${costCell}</div><div class="sc-cell"><span>Markup</span>${mkCell}</div><div class="sc-cell sell"><span>Sell</span>${sellCell}</div></div>
        ${chip}${form||actions}${hint}
      </div>`;
    };
    return `<p class="sc-intro">Set the sample <b>cost</b> per type: a <b>fixed price</b> you know, a <b>supplier quote</b> (request it, or enter one you took by phone), or <b>free</b>. Sell is suggested at ×${SAMPLE_MARKUP.toFixed(2)} (min +£${SAMPLE_MIN_UPLIFT}) and stays editable — overriding it shows “Custom”. Pulls through to <b>Project → Sample costs</b>.</p>
      <div class="sc-cards">${card('unbranded','Unbranded sample')}${card('branded','Branded sample')}</div>
      <div class="sc-cv"><div class="sc-cvcol"><h5>Available colours</h5><div class="bb-swatches">${(function(){ const raw=(p._cat&&p._cat.colours)||[]; const L={}; raw.forEach(o=>{ if(o&&typeof o==='object'){ const v=o.pms||o.pmsColor||o.PMSColor1||o.pms1; if(v&&o.name) L[o.name]=v; } }); return p.colours.map(n=>bbSw(n,L[n])).join(''); })()}</div></div><div class="sc-cvcol"><h5>Available variants</h5><div class="bb-vars">${p.sizes.map(bbVar).join('')}</div></div></div>`;
  }
  function wireSampleCost(p){
    const refresh=()=>{ const accEl=document.querySelector('.dv-acc [data-acc="sample"]'); const acc=accEl?accEl.parentElement:null; if(acc){ const b=acc.querySelector('.dv-b'); if(b){ b.innerHTML=sampleCostBody(p); } wireSampleCost(p); } };
    const today=()=>new Date().toLocaleDateString('en-GB');
    document.querySelectorAll('.sc-mode').forEach(btn=>btn.onclick=()=>{ const t=btn.dataset.type,m=btn.dataset.mode; const cur=scCalc(sampleEffective(p)[t]); scFormOpen=null;
      if(m==='free') scSet(p.name,t,{mode:'free',free:true,quote:false,quoteNote:null,requested:null});
      else if(m==='quote') scSet(p.name,t,{mode:'quote',quote:true,free:false});
      else scSet(p.name,t,{mode:'cost',quote:false,free:false,cost:(cur.cost!=null?cur.cost:0),sell:null,quoteNote:null,requested:null});
      refresh(); });
    document.querySelectorAll('.sc-cost').forEach(i=>i.onchange=()=>{ const v=parseFloat(i.value); scSet(p.name,i.dataset.type,{cost:isNaN(v)?0:v,sell:null}); refresh(); });
    document.querySelectorAll('.sc-sell').forEach(i=>i.onchange=()=>{ const v=parseFloat(i.value); scSet(p.name,i.dataset.type,{sell:isNaN(v)?null:v}); refresh(); });
    document.querySelectorAll('.sc-reset').forEach(b=>b.onclick=()=>{ scSet(p.name,b.dataset.type,{sell:null}); refresh(); });
    document.querySelectorAll('[data-screq]').forEach(b=>b.onclick=()=>{ const t=b.dataset.screq; scFormOpen=null; scSet(p.name,t,{mode:'quote',quote:true,free:false,cost:null,sell:null,received:null,source:null,lead:null,requested:today(),quoteNote:'Quote requested '+today()+' — awaiting supplier.'}); refresh(); });
    document.querySelectorAll('[data-sccancel]').forEach(b=>b.onclick=()=>{ scSet(p.name,b.dataset.sccancel,{requested:null,quoteNote:null}); refresh(); });
    document.querySelectorAll('[data-scenter]').forEach(b=>b.onclick=()=>{ scFormOpen=b.dataset.scenter; refresh(); });
    document.querySelectorAll('[data-scclose]').forEach(b=>b.onclick=()=>{ scFormOpen=null; refresh(); });
    document.querySelectorAll('[data-scsave]').forEach(b=>b.onclick=()=>{ const t=b.dataset.scsave; const f=document.querySelector(`.sc-form[data-scform="${t}"]`); if(!f)return;
      const cost=parseFloat(f.querySelector('.sc-fcost').value); if(isNaN(cost)){ f.querySelector('.sc-fcost').focus(); return; }
      const lead=parseInt(f.querySelector('.sc-flead').value,10); const src=f.querySelector('.sc-fsrc').value;
      const from=(f.querySelector('.sc-ffrom').value||'').trim(); const ref=(f.querySelector('.sc-fref').value||'').trim();
      const typed=(f.querySelector('.sc-fwhen').value||'').trim();
      const stamp=typed||(new Date().toLocaleDateString('en-GB')+' '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}));
      scFormOpen=null;
      scSet(p.name,t,{mode:'quote',quote:true,free:false,cost:+cost.toFixed(2),sell:null,received:stamp,source:src,lead:isNaN(lead)?null:lead,from:from||null,ref:ref||null,requested:null,
        quoteNote:'Quoted '+gbp(cost)+' · '+stamp+(src==='phone'?' by phone':'')+(from?' · from '+from:'')+(ref?' · ref '+ref:'')+(isNaN(lead)?'':' · lead '+lead+'d')});
      refresh(); });
  }

  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2200); }; })();
  const PROJECTS=['Autumn Giveaways','2026 Charity Expo','Staff Gifts','VIP Gifts'];

  // ---- brief fulfilment context (Stage 3: store ⇄ project brief) ----
  const PROJECT_NAME={autumn:'Autumn Giveaways'};
  const CTRY=['United Kingdom','Ireland (ROI)','France'];
  function briefPending(){ try{ return JSON.parse(localStorage.getItem('ms-brief-pending')||'null'); }catch(e){ return null; } }
  function briefClear(){ try{ localStorage.setItem('ms-brief-pending',''); }catch(e){} }
  function briefStore(){ try{ return JSON.parse(localStorage.getItem('ms-project-brief')||'{}'); }catch(e){ return {}; } }
  function briefSaveStore(o){ try{ localStorage.setItem('ms-project-brief', JSON.stringify(o)); }catch(e){} }
  function briefCtx(){ const pen=briefPending(); if(!pen||!pen.itemId) return null; const o=briefStore(); const proj=o[pen.project]; if(!proj) return null; const it=(proj.items||[]).find(x=>x.id===pen.itemId); return it?{pen,proj,it,defaults:proj.defaults||{}}:null; }
  function unitAtQty(p,q){ let u=p.priceBreaks[0].unit; for(const b of p.priceBreaks){ if(q>=b.q) u=b.unit; } return u; }
  function effColours(ctx){ const it=ctx.it, d=ctx.defaults; const ov=(it.over&&it.over.colour); return ov?[ov]:((d.productColours)||[]); }
  function briefAddedIds(){ const ctx=briefCtx(); return ctx?((ctx.it.added||[]).map(a=>String(a.id))):[]; }
  function addToBrief(p){ const ctx=briefCtx(); if(!ctx) return false; const o=briefStore(); const it=o[ctx.pen.project].items.find(x=>x.id===ctx.pen.itemId); if(!it) return false; it.added=it.added||[]; if(it.added.some(a=>String(a.id)===String(p.id))) return true; it.added.push({id:p.id,name:p.name,img:p.img,unit:+unitAtQty(p,(+it.qty||p.priceGuideQty)).toFixed(2)}); briefSaveStore(o); return true; }
  function removeFromBrief(p){ const ctx=briefCtx(); if(!ctx) return false; const o=briefStore(); const it=o[ctx.pen.project].items.find(x=>x.id===ctx.pen.itemId); if(!it||!it.added) return false; it.added=it.added.filter(a=>String(a.id)!==String(p.id)); if(!it.added.length)delete it.added; briefSaveStore(o); return true; }
  function briefBanner(){ const ctx=briefCtx(); if(!ctx) return ''; const it=ctx.it; const d=ctx.defaults; const cols=effColours(ctx).join(', '); const n=(it.added||[]).length; return `<div class="brief-ctx" id="briefCtx">
      <span class="bc-ic"><svg class="icn"><use href="#s-search"/></svg></span>
      <div class="bc-txt"><b>Adding products for the brief — ${esc(it.type)}${n?` · ${n} added`:''}</b><span>${(+it.qty||0).toLocaleString()} units · target ${gbp(+it.unit||0)}/unit${cols?' · '+esc(cols):''}${d.country!=null?' · ships to '+esc(CTRY[d.country]||'UK'):''}</span></div>
      ${n?`<a class="bc-done" id="bcDone">Done · back to project ›</a>`:''}<a class="bc-cancel" id="bcCancel">${n?'Cancel':'Cancel'}</a></div>`; }
  function wireBrief(){ const c=document.getElementById('bcCancel'); if(c) c.onclick=()=>{ briefClear(); route(); }; const d=document.getElementById('bcDone'); if(d) d.onclick=()=>{ const ctx=briefCtx(); const itemId=ctx?ctx.pen.itemId:''; briefClear(); window.location.href='Merchsmith Project - Autumn Giveaways.html'+(itemId?'#briefitem='+encodeURIComponent(itemId):''); }; }
  // inject brief-context styles once
  (function(){ if(document.getElementById('brief-ctx-style'))return; const s=document.createElement('style'); s.id='brief-ctx-style';
    s.textContent='.brief-ctx{display:flex;align-items:center;gap:14px;background:var(--tint-peri,#eceef9);border:1px solid var(--periwinkle,#9aa3d8);border-radius:13px;padding:13px 16px;margin:0 0 20px;}'+
    '.pp-preview-banner{background:#fff8e6;border:1px solid #e7c98f;border-radius:11px;padding:11px 15px;margin:0 0 18px;font-size:13px;color:#7a5a17;line-height:1.5;}'+
    '.pp-preview-banner b{color:#5a4310;}'+
    '.brief-ctx .bc-ic{width:34px;height:34px;border-radius:9px;background:var(--periwinkle-deep,#4b54a6);color:#fff;display:grid;place-items:center;flex:none;}'+
    '.brief-ctx .bc-ic .icn{width:18px;height:18px;}'+
    '.brief-ctx .bc-txt{flex:1;min-width:0;}'+
    '.brief-ctx .bc-txt b{display:block;font-size:14px;color:var(--ink,#23231f);}'+
    '.brief-ctx .bc-txt span{display:block;font-size:12.5px;color:var(--ink-2,#55524a);}'+
    '.brief-ctx .bc-cancel{font-size:12.5px;font-weight:700;color:var(--periwinkle-deep,#4b54a6);cursor:pointer;text-decoration:underline;flex:none;}'+
    '.btn-fulfil{background:var(--periwinkle-deep,#4b54a6)!important;margin-bottom:10px;}'+
    '.btn-added{background:#fff!important;color:var(--periwinkle-deep,#4b54a6)!important;border:1.5px solid var(--periwinkle-deep,#4b54a6)!important;margin-bottom:10px;}'+
    '.bc-done{font-size:12.5px;font-weight:800;color:var(--periwinkle-deep,#4b54a6);cursor:pointer;flex:none;margin-right:4px;}'+
    '.pcard.bc-added{outline:2px solid var(--periwinkle,#9aa3d8);outline-offset:2px;}'+
    '.pcard .bc-tag{background:transparent!important;color:var(--periwinkle-deep,#4b54a6)!important;border:1px solid currentColor!important;font-weight:600!important;}'+
    '.pcard.bc-match{outline:2px solid var(--periwinkle,#9aa3d8);outline-offset:2px;}';
    document.head.appendChild(s); })();

  // ---- store taxonomy from the shared structure (sections + departments) ----
  function SECTIONS(){ return (window.MSSTORE&&MSSTORE.sections)?MSSTORE.sections():[{id:'essentials',name:'Essentials',intro:'',deptIds:(S.departments||[]).map(d=>d.id)}]; }
  function DEPTS(){ return (window.MSSTORE&&MSSTORE.departments)?MSSTORE.departments():(S.departments||[]); }
  function deptById(id){ return DEPTS().find(d=>d.id===id) || (S.departments||[]).find(d=>d.id===id); }
  function curSectionId(){ const h=new URLSearchParams(location.hash.slice(1)); return h.get('section')||(SECTIONS()[0]?SECTIONS()[0].id:'essentials'); }
  function renderTopNav(activeSectionId){
    const nav=document.getElementById('storecats'); if(!nav) return;
    nav.innerHTML=`<a data-goall class="${activeSectionId==='all'?'active':''}">All Products</a>`
      +SECTIONS().map(s=>`<a data-gosection="${s.id}" class="${s.id===activeSectionId?'active':''}">${esc(s.name)}</a>`).join('');
    const allLink=nav.querySelector('[data-goall]'); if(allLink) allLink.onclick=()=>{ location.hash='all'; };
    nav.querySelectorAll('[data-gosection]').forEach(a=>a.onclick=()=>{ location.hash='section='+a.dataset.gosection; });
  }
  // slugify (matches store-structure.js) — for matching products to sub-categories in all-products mode
  const slugify=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  // every sub-category across all departments, de-duplicated, A→Z (all-products filter)
  function allSubcats(){
    const seen={}, out=[];
    DEPTS().forEach(d=>(d.subcats||[]).forEach(s=>{ if(!seen[s.id]){ seen[s.id]=1; out.push({id:s.id,name:s.name}); } }));
    out.sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'}));
    return out;
  }

  // ---- routing via hash: #dept=writing , #product=mp34576 , #section=treats , else departments ----
  function route(){
    view.classList.remove('home');
    const h=location.hash.slice(1); const p=new URLSearchParams(h);
    if(p.get('product')) return productView(p.get('product'));
    if(p.has('all')) return listingView(null,{all:true});
    if(p.has('dept')) return listingView(p.get('dept'));
    if(p.has('section')) return deptView();
    return homeView();
  }
  window.addEventListener('hashchange', route);
  (function(){ let k=(location.hash.split('&')[0]||''); window.addEventListener('hashchange',()=>{
    const n=(location.hash.split('&')[0]||''); if(n!==k){ k=n; window.scrollTo(0,0); } }); })();

  function crumb(parts){
    document.getElementById('crumb').innerHTML = parts.map((x,i)=> i===parts.length-1
      ? `<span class="here">${esc(x.l)}</span>`
      : `<a ${x.h?`href="${x.h}"`:''}>${esc(x.l)}</a><span>›</span>`).join('');
  }
  function setCats(active){
    document.querySelectorAll('#storecats a').forEach(a=>a.classList.toggle('active', a.textContent===active));
  }

  /* ---------- HOME (merchery-style) ---------- */
  function homeView(){
    view.classList.add('home');
    renderTopNav('');
    crumb([{l:'Home'},{l:'Store'}]);
    const H = (window.MSHOME) ? MSHOME : null;
    const cfg = id => H ? H.section(id) : null;
    const on  = id => H ? H.isOn(id) : true;
    const ord = H ? H.order() : ['hero','usps','marquee','statement','bestsellers','ecoband','discover','brands','quotes','recent','steps','faq','newsletter'];
    const all=storeProducts();
    // Featured products are eligible for best-sellers even without usage history
    const best=all.filter(p=>(p.usage&&p.usage.units)||p._tier).sort((a,b)=>(tierRank(a)-tierRank(b))||(((b.usage&&b.usage.units)||0)-((a.usage&&a.usage.units)||0))).slice(0,10);
    const bestRow=(best.length?best:all.slice(0,10));
    const recent=all.slice().reverse().slice(0,3);
    const brands=(window.MSBRANDS?MSBRANDS.list():[]).slice(0,8);
    const marquee=(brands.length?brands:['Citrix','Mojo','BagWorks','GreenStock','Lumen','Karst','Ocean Bottle','Senator']);
    const pcard=p=>{return `<a class="hm-pc" data-id="${p.id}"><div class="hm-pimg">${p.imgUrl||p.image?`<img src="${esc(p.imgUrl||p.image)}" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0">`:imgEl(p.img,'',p.name)}</div><h3>${esc(p.name)}</h3><div class="hm-from">${gbp(p.priceGuide||p.priceFrom||0)}</div></a>`;};
    const byId={}; all.forEach(p=>byId[p.id]=p);

    // ---- one builder per homepage section (reads MSHOME config, falls back to defaults) ----
    const build={
      hero(c){ c=c||{}; return `<section class="hm-hero">
        <h1>${esc(c.headline||'')}</h1>
        <div class="hm-heroact">${c.primaryText?`<a class="hm-btn solid" href="${esc(c.primaryHref||'#')}">${esc(c.primaryText)}</a>`:''}${c.ghostText?`<a class="hm-btn ghost" href="${esc(c.ghostHref||'#')}">${esc(c.ghostText)}</a>`:''}</div>
        <div class="hm-heroimg"><img src="${esc(c.image||'')}" alt="" onerror="this.style.display='none'">${c.caption?`<div class="hm-herocap">${esc(c.caption)}</div>`:''}</div>
      </section>`; },
      usps(c){ const items=(c||{}).items||[]; const fb=['s-leaf','s-print','s-truck','s-check']; return `<div class="hm-usps">${items.map((it,i)=>{ const ic=it.iconImg?`<img src="${it.iconImg}" alt="">`:`<svg class="icn"><use href="#${esc(it.icon||fb[i%fb.length])}"/></svg>`; return `<div class="hm-usp"><span class="hm-uspic">${ic}</span><div><b>${esc(it.b)}</b><span>${esc(it.s)}</span></div></div>`; }).join('')}</div>`; },
      marquee(c){ const logos=(c||{}).logos||{}; const list=marquee; const cell=n=>logos[n]?`<span class="hm-mlogo"><img src="${logos[n]}" alt="${esc(n)}"></span>`:`<span>${esc(n).toUpperCase()}</span>`; return `<div class="hm-marquee"><div class="hm-mrow">${list.concat(list).map(cell).join('')}</div></div>`; },
      statement(c){ c=c||{}; return `<section class="hm-statement"><h2>${esc(c.pre||'')}<span class="hl">${esc(c.hl||'')}</span>${esc(c.post||'')}</h2>${c.linkText?`<a class="hm-more" href="${esc(c.linkHref||'#')}">${esc(c.linkText)}</a>`:''}</section>`; },
      bestsellers(c){ c=c||{}; const ids=c.productIds||[]; let row=bestRow; if(ids.length){ const r=ids.map(id=>byId[id]).filter(Boolean); if(r.length) row=r; } row=row.slice(0,6); return `<section class="hm-sec"><div class="hm-hd"><h2>${esc(c.heading||'Our best sellers')}</h2><a href="#section=essentials">View all →</a></div><div class="pgrid">${row.map(card).join('')}</div></section>`; },
      ecoband(c){ c=c||{}; const stats=c.stats||[]; const bg=c.bg?` style="background:${c.bg}"`:''; return `<section class="hm-sec"><div class="hm-ecoband" data-editable="ecoband"${bg}>
        <div class="hm-ecocopy"><h2>${esc(c.heading||'')}</h2><p>${esc(c.body||'')}</p></div>
        <div class="hm-ecostats">${stats.map(s=>`<div class="s"><b>${esc(s.b)}</b><span>${esc(s.s)}</span></div>`).join('')}</div>
      </div></section>`; },
      discover(c){ c=c||{}; const items=c.items||[]; return `<section class="hm-sec"><div class="hm-hd"><h2>${esc(c.heading||'Discover')}</h2></div>
        <div class="hm-disc">${items.map(it=>`<a href="${esc(it.href||'#')}">${imgEl(it.img,'','')}<h3>${esc(it.title)}</h3><p>${esc(it.desc)}</p></a>`).join('')}</div></section>`; },
      brands(c){ c=c||{}; const items=c.items||[]; return `<section class="hm-sec"><div class="hm-hd"><h2>${esc(c.heading||'')}</h2><a href="#section=essentials">All brands →</a></div>
        <div class="hm-brandrow">${items.map(it=>`<div class="hm-brandtile">${imgEl(it.img,'','')}<div class="bt"><b>${esc(it.b)}</b><span>${esc(it.s)}</span></div></div>`).join('')}</div></section>`; },
      quotes(c){ c=c||{}; const items=(c.items&&c.items.length)?c.items:[{quote:c.quote||'',by:c.by||''}]; return `<section class="hm-sec"><div class="hm-quotes" data-quotes>
        ${items.map((q,i)=>`<div class="hm-qslide${i===0?' on':''}"><p class="hm-q">${esc(q.quote||'')}</p><div class="hm-by">${esc(q.by||'')}</div></div>`).join('')}
        <div class="hm-qdots">${items.map((_,i)=>`<i class="${i===0?'on':''}" data-qdot="${i}"></i>`).join('')}</div>
      </div></section>`; },
      recent(c){ c=c||{}; return `<section class="hm-sec"><div class="hm-hd"><h2>${esc(c.heading||'Recently added')}</h2><a href="#section=essentials">View all →</a></div><div class="pgrid">${recent.map(card).join('')}</div></section>`; },
      steps(c){ c=c||{}; const items=c.items||[]; return `<section class="hm-sec"><div class="hm-hd"><h2>${esc(c.heading||'How it works')}</h2></div>
        <div class="hm-steps">${items.map((it,i)=>`<div class="hm-step"><span class="hm-stepn">${i+1}</span><b>${esc(it.b)}</b><p>${esc(it.p)}</p></div>`).join('')}</div></section>`; },
      faq(c){ c=c||{}; const items=c.items||[]; return `<section class="hm-sec"><div class="hm-faq">
        <div class="intro"><h2>${esc(c.heading||'')}</h2><p>${esc(c.intro||'')}</p></div>
        <div class="list">${items.map((it,i)=>`<details${i===0?' open':''}><summary>${esc(it.q)}</summary><div class="ans">${esc(it.a)}</div></details>`).join('')}</div>
      </div></section>`; },
      newsletter(c){ c=c||{}; return `<section class="hm-sec"><div class="hm-news"><h2>${esc(c.heading||'')}</h2><form class="hm-newsform" onsubmit="return false"><input type="email" placeholder="you@company.com"><button type="submit">Subscribe</button></form></div></section>`; },
    };

    view.innerHTML = ord.map(id=>{ if(!on(id)) return ''; const sec=H?H.section(id):null; const type=(sec&&sec.type)||id; return build[type]?build[type](sec||{}):''; }).join('\n');
    view.querySelectorAll('.hm-pc').forEach(c=>c.onclick=()=>{ location.hash='product='+c.dataset.id; });
    view.querySelectorAll('.pcard').forEach(c=>c.onclick=()=>{ if(c.dataset.id) location.hash='product='+c.dataset.id; });
    view.querySelectorAll('[data-quotes]').forEach(box=>{
      const slides=[...box.querySelectorAll('.hm-qslide')]; const dots=[...box.querySelectorAll('[data-qdot]')];
      if(slides.length<2) return;
      let idx=0, t; const show=n=>{ idx=(n+slides.length)%slides.length; slides.forEach((s,i)=>s.classList.toggle('on',i===idx)); dots.forEach((d,i)=>d.classList.toggle('on',i===idx)); };
      const restart=()=>{ clearInterval(t); t=setInterval(()=>show(idx+1),5000); };
      dots.forEach((d,i)=>d.onclick=()=>{ show(i); restart(); }); restart();
    });
    { const f=view.querySelector('.hm-newsform'); if(f)f.onsubmit=()=>{ const i=f.querySelector('input'); if(i&&i.value){ i.value=''; const b=f.querySelector('button'); b.textContent='Subscribed ✓'; setTimeout(()=>b.textContent='Subscribe',2000); } return false; }; }
  }

  /* ---------- DEPARTMENTS ---------- */
  function deptView(){
    const secId=curSectionId(); const sec=SECTIONS().find(s=>s.id===secId)||SECTIONS()[0];
    renderTopNav(sec.id);
    crumb([{l:'Home',h:'Merchsmith Project - Autumn Giveaways.html'},{l:'Store'},{l:sec.name}]);
    const deps=(window.MSSTORE&&MSSTORE.deptsOf)?MSSTORE.deptsOf(sec.id):S.departments;
    view.innerHTML = `<h1 class="page">${esc(sec.name)}</h1>
      <p class="intro">${esc(sec.intro||'')}</p>
      <hr class="divider">
      ${deps.length?`<div class="deptgrid">${deps.map(d=>`
        <div class="depttile" data-godept="${d.id}">
          <div class="img" data-editimg="tile:${d.id}">${d.img&&/^https?:/.test(d.img)?`<img src="${esc(d.img)}" alt="">`:imgEl(d.img,'',d.name)}<button class="img-edit" title="Edit image">\u270e</button></div>
          <h3>${esc(d.name)}</h3>
        </div>`).join('')}</div>`:`<div class="store-emptysec"><p>No departments in <b>${esc(sec.name)}</b> yet.</p></div>`}`;
    view.querySelectorAll('[data-godept]').forEach(t=>t.onclick=e=>{ if(e.target.closest('.img-edit'))return; location.hash='dept='+t.dataset.godept; });
    view.querySelectorAll('[data-editimg] .img-edit').forEach(btn=>btn.onclick=e=>{ e.stopPropagation(); e.preventDefault(); editImage(btn.parentElement.dataset.editimg); });
  }

  /* ---------- LISTING ---------- */
  // map a shared-catalogue (MSCAT) product into the store's product shape
  const DEPT_ID={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
  function catToStore(p){
    const existing = S.products.find(x=>x.id===p.id); if(existing) return existing; // keep rich store-feed entries as-is
    const breaks=(p.breaks||[]).filter(b=>b.unit!=null).map(b=>({q:b.q,unit:b.unit}));
    const guide=breaks.length?breaks[Math.min(breaks.length-1,2)]:null;
    // colours arrive from feeds either as plain names or {name,base,hex} objects — normalise to
    // name strings and fold any real hex values into the swatch lookup so they render true-to-feed
    const colObjs=p.colours||[];
    colObjs.forEach(c=>{ if(c&&typeof c==='object'&&c.name&&c.hex&&!SW[c.name]) SW[c.name]='#'+String(c.hex).replace(/^#/,''); });
    const colNames=colObjs.map(c=>typeof c==='string'?c:(c&&(c.name||c.base))||'').filter(Boolean);
    return { id:p.id, model:p.code||'', name:p.name, dept:DEPT_ID[p.dept]||'lifestyle', cat:p.cat||p.dept, brand:p.brand||p.supplier, supplier:p.supplier,
      blurb:p.desc||'', priceGuide:p.priceFrom||(guide?guide.unit:0), priceGuideQty:guide?guide.q:(p.moq||100), moq:p.moq||50, lead:p.lead||10,
      sustainability:p.sustainability||7, colours:colNames.length?colNames:['One colour'], sizes:p.size?[p.size]:['One size'], material:p.material||'', img:'', imgUrl:p.image||'', images:p.images||[], dims:{w:'—',h:'—',d:'—'}, dimensions:p.dimensions||'', branding:p.branding||null,
      priceBreaks:breaks.length?breaks:[{q:p.moq||100,unit:p.priceFrom||0}], printMethods:p.methods||[], _fromCat:true, _poa:p.priceFrom==null,
      origin:p.origin||'', certifications:p.certifications||[], carton:p.carton||null, weightGr:p.weightGr||null,
      ean:p.ean||'', hsCode:p.hsCode||'', video:p.video||'', gender:p.gender||'', subcat:p.subcat||p.cat||'', custom:p.custom||{}, _cat:p };
  }
  // the products the store should show — distributor range from MSCAT, mapped + merged with store-feed
  /* Merchsmith default store (?store=merchsmith): the Recommended range exactly as a
     distributor on "Recommended range" mode receives it — no distributor edits, no
     distributor overrides. Opened from Platform Admin, where the product page swaps
     the "In your range" bar for the product's Recommended / Featured status. */
  const MSDEF=/[?&]store=merchsmith\b/.test(location.search);
  function storeProducts(){
    let list;
    if(MSDEF && window.MSCAT && MSCAT.curated){
      const live=MSCAT.curated().filter(c=>!c.curation||c.curation.approval!=='pending');
      if(live.length) list=live.map(catToStore);
      list=list||S.products;
      list.forEach(p=>{ const c=MSCAT.get(p.id); p._tier=(c&&c.promoted&&c.curation)?c.curation.tier:''; });
      if(window.MSHOME && MSHOME.getPref && MSHOME.getPref('imgOnly')) list=list.filter(hasImg);
      return list;
    }
    if(window.MSCAT && MSCAT.distRange){ const range=MSCAT.distRange(); if(range.length) list=range.map(catToStore); }
    if(!list) list=S.products;
    // Promoted placement (Featured) applies whenever the range is built on the
    // Merchsmith recommended baseline ('curated' or 'edited'). Fully bespoke ranges carry none.
    const promoOn = window.MSCAT && MSCAT.distConfig && MSCAT.distConfig().mode!=='bespoke';
    list.forEach(p=>{ const c=(promoOn&&MSCAT.get)?MSCAT.get(p.id):null; p._tier=(c&&c.promoted&&c.curation)?c.curation.tier:''; });
    if(window.MSOV) list.forEach(p=>MSOV.apply(p)); // distributor per-field overrides (feed untouched)
    if(window.MSHOME && MSHOME.getPref && MSHOME.getPref('imgOnly')) list=list.filter(hasImg);
    return list;
  }
  const tierRank=p=>p._tier==='featured'?0:1;
  let LISTVIEW = (function(){ try{ return localStorage.getItem('ms-store-listview')||'grid'; }catch(e){ return 'grid'; } })();
  let SORTBY='featured';
  const SORTS={
    featured:(a,b)=>tierRank(a)-tierRank(b),
    'price-asc':(a,b)=>(a.priceGuide||1e9)-(b.priceGuide||1e9),
    'price-desc':(a,b)=>(b.priceGuide||0)-(a.priceGuide||0),
    name:(a,b)=>String(a.name).localeCompare(String(b.name)),
    eco:(a,b)=>(b.sustainability||0)-(a.sustainability||0),
    lead:(a,b)=>(a.lead||99)-(b.lead||99),
    new:(a,b)=>(b.new?1:0)-(a.new?1:0)
  };
  const FILT = { sub:new Set(), brand:new Set(), colour:new Set(), price:new Set(), cert:new Set(), stock:new Set(), sus:0, maxLead:Infinity, pMin:0, pMax:Infinity };
  // estimated delivery date = lead working days from today (calendar approximation)
  function delivDays(p){ return Math.ceil((p.lead||10)*7/5); }

  // social accreditations + stock location (from the feed's certifications + warehouse data)
  const certsOf=p=>((p.certifications||[]).map(c=>String(c).trim()).filter(Boolean));
  // split the feed's merged certifications into social vs environmental
  const SOCIAL_CERT_RE=/bsci|amfori|sedex|smeta|sa ?8000|fair ?wear|fair ?trade|fairtrade|wrap\b|social|iso ?45001|ethic/i;
  const socialCertsOf=p=>certsOf(p).filter(c=>SOCIAL_CERT_RE.test(c));
  const envCertsOf=p=>certsOf(p).filter(c=>!SOCIAL_CERT_RE.test(c));
  // branding positions: feed default location + any workspace position library for the kind
  const posOf=p=>{ const s=p.branding&&p.branding.location?String(p.branding.location).trim():''; 
    return s?s.split(/[,;\/]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)):[]; };
  const EU_RE=/austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|ireland|italy|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovenia|spain|sweden/i;
  function stockLocs(p){ const out=new Set();
    const locs=(p._cat&&p._cat.stock&&p._cat.stock.locations)||[];
    locs.forEach(l=>{ const s=String(l); if(/uk|gb|united kingdom/i.test(s)) out.add('uk'); else out.add('eu'); });
    if(!out.size && p.origin){ if(/united kingdom|\buk\b/i.test(p.origin)) out.add('uk'); else if(EU_RE.test(p.origin)) out.add('eu'); }
    return out; }
  // roll specific shades up to a base colour for the filter swatches
  const BASE_COLOURS=[
    ['Black','#1a1a1e',/black|charcoal|jet|onyx/i],
    ['Grey','#9a9a9f',/grey|gray|graphite|slate|gunmetal|silver|ash/i],
    ['White','#f4f4f0',/white|ivory|cream|chalk/i],
    ['Natural','#d8c3a0',/natural|kraft|sand|beige|tan|stone|oat|wheat|bamboo|cork/i],
    ['Blue','#2f5ca8',/blue|navy|cobalt|azure|teal|sky|royal/i],
    ['Green','#3a9d6b',/green|forest|olive|lime|mint|sage|emerald/i],
    ['Red','#c0392b',/red|crimson|scarlet|burgundy|maroon|wine/i],
    ['Pink','#e2a9ac',/pink|rose|blush|fuchsia|magenta|coral/i],
    ['Purple','#7a5ba8',/purple|violet|lilac|plum|lavender/i],
    ['Yellow','#e8c63a',/yellow|gold|mustard|amber/i],
    ['Orange','#e08a3a',/orange|tangerine|rust|terracotta/i],
    ['Brown','#7a5230',/brown|chocolate|coffee|walnut|hazel/i]
  ];
  // shared colour mapping (colour-map.js / MSCOLOUR) — 19 master base colours + persisted overrides;
  // legacy BASE_COLOURS regexes remain only as a fallback if colour-map.js isn't loaded
  function baseColour(name){ if(window.MSCOLOUR) return MSCOLOUR.mapOr(name,'Other');
    for(const [b,,re] of BASE_COLOURS){ if(re.test(name)) return b; } return 'Other'; }
  function baseHex(b){ if(window.MSCOLOUR){ const h=MSCOLOUR.hex(b); if(h) return h; }
    const f=BASE_COLOURS.find(x=>x[0]===b); return f?f[1]:'#bbb'; }
  // price bands
  const PRICE_BANDS=[['<£1',0,1],['£1–£3',1,3],['£3–£5',3,5],['£5–£10',5,10],['£10+',10,1e9]];
  function priceBand(p){ const v=p.priceGuide||0; const b=PRICE_BANDS.find(x=>v>=x[1]&&v<x[2]); return b?b[0]:''; }
  const SUBCAP=14; // sub-category filters shown before “show all”
  function listingView(deptId, opts){
    opts=opts||{};
    const allMode=!!opts.all;
    const dept = allMode?null:deptById(deptId);
    const sec = (!allMode&&window.MSSTORE&&MSSTORE.sectionOfDept)?MSSTORE.sectionOfDept(deptId):null;
    renderTopNav(allMode?'all':(sec?sec.id:curSectionId()));
    let all = storeProducts().filter(p=>allMode||!deptId || p.dept===deptId);
    crumb(allMode
      ? [{l:'Home',h:'Merchsmith Project - Autumn Giveaways.html'},{l:'Store'},{l:'All Products'}]
      : [{l:'Home',h:'Merchsmith Project - Autumn Giveaways.html'},{l:'Store'},{l:sec?sec.name:'Essentials',h:sec?'#section='+sec.id:''},{l:dept?dept.name:'All Products'}]);
    // facet sources
    const adminSubs=(!allMode&&window.MSSTORE&&MSSTORE.subcatsOf)?MSSTORE.subcatsOf(deptId):[];
    const useAssign=allMode?true:adminSubs.length>0;
    // count products per assigned sub-category; hide empties from the store (admin still shows them)
    const subCountOf=id=>{ try{ return all.filter(p=>(MSSTORE.subcatsForProduct?MSSTORE.subcatsForProduct(p.id):[]).includes(id)).length; }catch(e){ return 0; } };
    const nonEmptySubs=useAssign&&!allMode?adminSubs.filter(s=>subCountOf(s.id)>0):adminSubs;
    const subs=allMode?allSubcats():(useAssign?nonEmptySubs.map(s=>({id:s.id,name:s.name})):[...new Set(all.map(p=>p.cat))].sort().map(c=>({id:c,name:c})));
    const featured=nonEmptySubs.filter(s=>s.featured);
    const brands=(window.MSBRANDS?MSBRANDS.list():[]).filter(b=>all.some(p=>MSBRANDS.brandOf(p.id)===b));
    const bases=[...new Set(all.flatMap(p=>(p.colours||[]).map(baseColour)))].filter(b=>b!=='Other');
    bases.sort((a,b)=>window.MSCOLOUR?(MSCOLOUR.order(a)-MSCOLOUR.order(b)):(BASE_COLOURS.findIndex(x=>x[0]===a)-BASE_COLOURS.findIndex(x=>x[0]===b)));
    const prices=all.map(p=>+p.priceGuide||0).filter(v=>v>0);
    const pLo=prices.length?Math.min(...prices):0, pHi=prices.length?Math.max(...prices):0;
    const leads=all.map(p=>+p.lead||10);
    const lLo=leads.length?Math.min(...leads):3, lHi=leads.length?Math.max(...leads):25;
    const certCounts={}; all.forEach(p=>certsOf(p).forEach(c=>{ certCounts[c]=(certCounts[c]||0)+1; }));
    const certs=Object.entries(certCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const stockCounts={uk:all.filter(p=>stockLocs(p).has('uk')).length, eu:all.filter(p=>stockLocs(p).has('eu')).length};
    Object.assign(FILT,{sub:new Set(),brand:new Set(),colour:new Set(),price:new Set(),cert:new Set(),stock:new Set(),sus:0,maxLead:Infinity,pMin:0,pMax:Infinity});
    const introTxt = dept&&dept.intro ? dept.intro : (dept?'Browse our '+esc(dept.name).toLowerCase()+' range — every item scored for sustainability and ready to brand.':'Every product in the store — filter by category, brand, colour, price, sustainability or lead time.');
    const hero = dept ? `<div class="dept-hero" data-editimg="hero:${esc(dept.id)}">${dept.hero?`<img src="${esc(dept.hero)}" alt="">`:`<image-slot id="depthero-${esc(dept.id)}" shape="rect" fit="cover" placeholder="Category hero image"></image-slot>`}<button class="img-edit" title="Edit image">\u270e</button></div>` : '';
    const featStrip = featured.length ? `<div class="featrow"><div class="featrow-hd"><h2>Featured ${esc(dept.name)}</h2></div>
        <div class="featcards">${featured.map(s=>`<button class="featcard" data-gosub="${esc(s.id)}"><div class="featimg" data-editimg="sub:${esc(dept.id)}:${esc(s.id)}">${s.img?`<img src="${esc(s.img)}" alt="">`:imgEl('','',s.name)}<span class="img-edit" title="Edit image">\u270e</span></div><span>${esc(s.name)}</span></button>`).join('')}</div></div>` : '';
    view.innerHTML = `<h1 class="page">${dept?esc(dept.name):'All Products'}</h1>
      ${briefBanner()}
      <div class="dept-head"><p class="intro">${esc(introTxt)}</p>${hero}</div>
      ${featStrip}
      <hr class="divider">
      <div class="listtop"><span class="cnt" id="cnt"></span>
            <span class="listtools">
              <span class="viewseg" id="viewSeg" title="Grid or list view">
                <button type="button" class="vs-b ${LISTVIEW==='grid'?'on':''}" data-view="grid" title="Grid view"><svg class="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></svg></button>
                <button type="button" class="vs-b ${LISTVIEW==='list'?'on':''}" data-view="list" title="List view"><svg class="icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><rect x="4" y="5" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none"/><rect x="4" y="11" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none"/><rect x="4" y="17" width="2.4" height="2.4" rx="0.6" fill="currentColor" stroke="none"/></svg></button>
              </span>
              <label class="sortsel-w">Sort by
                <select class="sortsel" id="sortSel">
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="name">Name A–Z</option>
                  <option value="eco">Sustainability</option>
                  <option value="lead">Fastest delivery</option>
                  <option value="new">Newest</option>
                </select>
              </label>
            </span></div>
      <div class="listing">
        <aside class="filters">
          ${subs.length?`<div class="fgroup"><h4>${esc(allMode?'Category':(dept?dept.name:'Category'))}</h4>${subs.map((s,i)=>`<label class="fopt${i>=SUBCAP?' fsub-extra':''}"${i>=SUBCAP?' style="display:none"':''}><input type="checkbox" data-f="sub" value="${esc(s.id)}">${esc(s.name)}</label>`).join('')}${subs.length>SUBCAP?`<button type="button" class="fmore" id="subMore" data-shown="0">Show all ${subs.length} ›</button>`:''}</div>`:''}
          ${brands.length?`<div class="fgroup"><h4>Brand</h4>${brands.map(b=>`<label class="fopt"><input type="checkbox" data-f="brand" value="${esc(b)}">${esc(b)}</label>`).join('')}</div>`:''}
          ${certs.length?`<div class="fgroup"><h4>Social accreditations</h4>${certs.map(([c,n])=>`<label class="fopt"><input type="checkbox" data-f="cert" value="${esc(c)}">${esc(c)} <span class="fcnt">${n}</span></label>`).join('')}</div>`:''}
          ${(stockCounts.uk||stockCounts.eu)?`<div class="fgroup"><h4>Stock location</h4>${stockCounts.uk?`<label class="fopt"><input type="checkbox" data-f="stock" value="uk">UK stock <span class="fcnt">${stockCounts.uk}</span></label>`:''}${stockCounts.eu?`<label class="fopt"><input type="checkbox" data-f="stock" value="eu">EU stock <span class="fcnt">${stockCounts.eu}</span></label>`:''}</div>`:''}
          <div class="fgroup"><h4>Colour</h4><div class="colswatches">${bases.map(b=>`<button type="button" class="colsw" data-colsw="${esc(b)}" title="${esc(b)}"><i class="${(window.MSCOLOUR&&MSCOLOUR.isMulti(b))?'rainbow':''}" style="background:${baseHex(b)};${b==='White'?'box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)':''}"></i><span>${esc(b)}</span></button>`).join('')}</div></div>
          ${pHi>pLo?`<div class="fgroup"><h4>Price</h4><div class="prange" id="prange"><div class="pr-track"><div class="pr-fill" id="prFill"></div></div><input type="range" id="prMin" min="0" max="1000" value="0"><input type="range" id="prMax" min="0" max="1000" value="1000"><div class="pr-vals"><span id="prMinV"></span><span id="prMaxV"></span></div></div></div>`:''}
          <div class="fgroup"><h4>Sustainability score</h4><div class="srange"><div class="sr-track"></div><input type="range" id="fsus" min="0" max="10" step="1" value="0"><div class="pr-vals"><span>Any</span><span id="fsusV">0+</span></div></div></div>
          ${lHi>lLo?`<div class="fgroup"><h4 style="display:flex;align-items:center;gap:7px">Delivery time <button type="button" class="finfo" id="dlInfo" aria-label="About delivery time">i</button><span class="finote" id="dlNote">Please note: Delivery Time is from the point of placing your order, please allow 1-3 days to get to the Ordering stage</span></h4><div class="srange"><div class="sr-track"></div><input type="range" id="flead" min="${lLo}" max="${lHi}" step="1" value="${lHi}"><div class="pr-vals"><span>${lLo}</span><span id="fleadV">${lHi}</span></div></div></div>`:''}
        </aside>
        <div>
          <div class="pgrid" id="pgrid"></div>
        </div>
      </div>`;
    view.querySelectorAll('[data-gosub]').forEach(b=>b.onclick=()=>{ const cb=view.querySelector(`input[data-f="sub"][value="${b.dataset.gosub.replace(/"/g,'\\"')}"]`); if(cb){ cb.checked=true; FILT.sub.add(b.dataset.gosub); apply(); window.scrollTo({top:document.querySelector('.listing').offsetTop-80,behavior:'smooth'}); } });
    const subMatch=p=>{ if(!FILT.sub.size) return true;
      if(useAssign){ const a=MSSTORE.subcatsForProduct(p.id); if(a.some(id=>FILT.sub.has(id))) return true;
        if(allMode) return FILT.sub.has(slugify(p.subcat))||FILT.sub.has(slugify(p.cat)); return false; }
      return FILT.sub.has(p.cat); };
    const apply=()=>{
      const out=all.filter(p=>
        subMatch(p) &&
        (!FILT.brand.size||FILT.brand.has(window.MSBRANDS?MSBRANDS.brandOf(p.id):'')) &&
        (!FILT.colour.size||(p.colours||[]).some(c=>FILT.colour.has(baseColour(c)))) &&
        ((+p.priceGuide||0)>=FILT.pMin && (FILT.pMax===Infinity||(+p.priceGuide||0)<=FILT.pMax)) &&
        (!FILT.cert.size||certsOf(p).some(c=>FILT.cert.has(c))) &&
        (!FILT.stock.size||[...stockLocs(p)].some(s=>FILT.stock.has(s))) &&
        (!isFinite(FILT.maxLead)||(+p.lead||10)<=FILT.maxLead) &&
        (p.sustainability>=FILT.sus));
      out.sort(SORTS[SORTBY]||SORTS.featured);
      if(SORTBY!=='featured') out.sort((a,b)=>{ const s=(SORTS[SORTBY])(a,b); return s; }); // chosen sort wins outright
      else out.sort((a,b)=>tierRank(a)-tierRank(b)); // featured: promoted products float above the rest
      document.getElementById('cnt').textContent=out.length+' product'+(out.length===1?'':'s');
      const grid=document.getElementById('pgrid');
      grid.classList.toggle('listview', LISTVIEW==='list');
      grid.innerHTML = out.length?out.map(LISTVIEW==='list'?listRow:card).join(''):'<p class="empty">No products match these filters.</p>';
      document.querySelectorAll('#pgrid .pcard').forEach(c=>c.onclick=()=>{ location.hash='product='+c.dataset.id; });
    };
    view.querySelectorAll('.filters .fgroup h4').forEach(h=>h.onclick=()=>h.closest('.fgroup').classList.toggle('closed'));
    const sortSel=document.getElementById('sortSel'); if(sortSel){ sortSel.value=SORTBY; sortSel.onchange=()=>{ SORTBY=sortSel.value; apply(); }; }
    view.querySelectorAll('#viewSeg .vs-b').forEach(b=>b.onclick=()=>{ LISTVIEW=b.dataset.view; try{ localStorage.setItem('ms-store-listview',LISTVIEW); }catch(e){}
      view.querySelectorAll('#viewSeg .vs-b').forEach(x=>x.classList.toggle('on',x===b)); apply(); });
    view.querySelectorAll('input[data-f]').forEach(i=>i.onchange=()=>{ const set=FILT[i.dataset.f]; i.checked?set.add(i.value):set.delete(i.value); apply(); });
    view.querySelectorAll('[data-colsw]').forEach(b=>b.onclick=()=>{ const v=b.dataset.colsw; if(FILT.colour.has(v)){FILT.colour.delete(v);b.classList.remove('on');}else{FILT.colour.add(v);b.classList.add('on');} apply(); });
    view.querySelectorAll('[data-editimg]').forEach(el=>{ const btn=el.querySelector('.img-edit'); if(btn) btn.onclick=e=>{ e.stopPropagation(); e.preventDefault(); editImage(el.dataset.editimg); }; });
    const fsus=document.getElementById('fsus'); fsus.oninput=()=>{ FILT.sus=+fsus.value; document.getElementById('fsusV').textContent=FILT.sus+'+'; apply(); };
    const pr=document.getElementById('prange');
    if(pr){
      const lo=pLo, hi=pHi, span=hi-lo||1;
      const iMin=document.getElementById('prMin'), iMax=document.getElementById('prMax');
      const vMin=document.getElementById('prMinV'), vMax=document.getElementById('prMaxV'), fill=document.getElementById('prFill');
      const toVal=t=>lo+span*(t/1000);
      function paint(){
        let a=+iMin.value, b=+iMax.value; if(a>b){ const t=a; a=b; b=t; }
        FILT.pMin=a<=0?0:toVal(a); FILT.pMax=b>=1000?Infinity:toVal(b);
        vMin.textContent=gbp(a<=0?lo:toVal(a)); vMax.textContent=gbp(b>=1000?hi:toVal(b));
        fill.style.left=(a/10)+'%'; fill.style.right=(100-b/10)+'%';
      }
      paint();
      iMin.oninput=()=>{ paint(); apply(); }; iMax.oninput=()=>{ paint(); apply(); };
    }
    const flead=document.getElementById('flead');
    if(flead){ flead.oninput=()=>{ const v=+flead.value; FILT.maxLead=(v>=lHi)?Infinity:v; document.getElementById('fleadV').textContent=v; apply(); }; }
    const dlInfo=document.getElementById('dlInfo');
    if(dlInfo){ const note=document.getElementById('dlNote');
      dlInfo.onclick=e=>{ e.stopPropagation(); note.classList.toggle('open'); };
      document.addEventListener('click',()=>note.classList.remove('open'),{once:false}); }

    const subMore=document.getElementById('subMore');
    if(subMore) subMore.onclick=()=>{ const shown=subMore.dataset.shown==='1'; view.querySelectorAll('.fsub-extra').forEach(el=>el.style.display=shown?'none':'flex'); subMore.dataset.shown=shown?'0':'1'; subMore.textContent=shown?`Show all ${subs.length} ›`:'Show less ‹'; };
    apply();
    // ---- brief context: pre-set facets from the requested item ----
    wireBrief();
    const ctx=briefCtx();
    if(ctx){
      // sustainability minimum (eco brief)
      const sm=ctx.defaults && ctx.defaults.sustainabilityMin;
      if(sm){ FILT.sus=sm; if(fsus){ fsus.value=sm; document.getElementById('fsusV').textContent=sm+'+'; } }
      // colours — match brief colour names against base-colour swatches
      const wants=effColours(ctx).map(c=>baseColour(c));
      if(wants.length){ view.querySelectorAll('[data-colsw]').forEach(b=>{ if(wants.includes(b.dataset.colsw)){ b.classList.add('on'); FILT.colour.add(b.dataset.colsw); } }); }
      // guard: if colour filter wipes the list, drop it
      const trial=all.filter(p=>(p.sustainability>=FILT.sus)&&(!FILT.colour.size||(p.colours||[]).some(c=>FILT.colour.has(baseColour(c)))));
      if(!trial.length && FILT.colour.size){ FILT.colour.clear(); view.querySelectorAll('[data-colsw]').forEach(b=>b.classList.remove('on')); }
      apply();
    }
  }
  // edit a category hero / featured-subcat / department-tile image (persists to MSSTORE)
  function editImage(ref){
    const [kind,a,b]=ref.split(':');
    let cur='';
    if(kind==='hero'){ const d=MSSTORE.department(a); cur=d?d.hero||'':''; }
    else if(kind==='sub'){ const s=MSSTORE.subcatsOf(a).find(x=>x.id===b); cur=s?s.img||'':''; }
    else if(kind==='tile'){ const d=MSSTORE.department(a); cur=d?d.img||'':''; }
    const url=prompt('Image URL (leave blank to clear):', cur);
    if(url===null) return;
    if(kind==='hero') MSSTORE.updateDepartment(a,{hero:url.trim()});
    else if(kind==='sub') MSSTORE.updateSubcat(a,b,{img:url.trim()});
    else if(kind==='tile') MSSTORE.updateDepartment(a,{img:url.trim()});
    route();
  }
  // second gallery image for the hover crossfade (first http/data image that isn't the primary)
  function altImg(p,shown){
    const prim=shown||p.imgUrl||'';
    const alt=(p.images||[]).filter(u=>/^(https?:|data:image\/)/.test(u)).find(u=>u!==prim);
    return alt?`<img class="pc-alt" src="${alt}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:'';
  }
  // single colour filter → show the product in that colour where the feed carries a matching variant image
  function heroImg(p){
    if(FILT.colour.size!==1) return p.imgUrl||'';
    const want=[...FILT.colour][0];
    const gal=(p.images||[]).filter(u=>/^(https?:|data:image\/)/.test(u));
    if(gal.length<2) return p.imgUrl||'';
    const i=(p.colours||[]).findIndex(c=>baseColour(c)===want);
    return (i>-1&&gal[i])?gal[i]:(p.imgUrl||'');
  }
  function card(p){
    const added = briefAddedIds().includes(String(p.id));
    return `<div class="pcard ${added?'bc-added':''}" data-id="${p.id}">
      <div class="pimg">${added?'<span class="ptag bc-tag">✓ Added</span>':(p._tier?'<span class="ptag promo">Featured</span>':(p.new?'<span class="ptag">New</span>':(p.recommended?'<span class="ptag">Recommended</span>':'')))}${imgEl(p.img,'',p.name,heroImg(p))}${altImg(p,heroImg(p))}</div>
      <h3>${esc(p.name)}</h3>
      <p class="pdesc">${esc(p.blurb)}</p>
      <div class="pmeta"><b>${p.priceGuide?gbp(p.priceGuide):'POA'}</b></div>
    </div>`;
  }

  function listRow(p){
    const added = briefAddedIds().includes(String(p.id));
    return `<div class="pcard prow ${added?'bc-added':''}" data-id="${p.id}">
      <div class="pimg">${imgEl(p.img,'',p.name,heroImg(p))}${altImg(p,heroImg(p))}</div>
      <div class="prow-main">
        <h3>${esc(p.name)}</h3>
        <p class="pdesc">${esc(p.blurb)}</p>
        <div class="pmeta"><b>${p.priceGuide?gbp(p.priceGuide):'POA'}</b></div>
      </div>
      <div class="prow-side">
        ${added?'<span class="ptag bc-tag" style="position:static">✓ Added</span>':(p._tier?'<span class="ptag promo" style="position:static">Featured</span>':'')}
      </div>
    </div>`;
  }
  /* ---------- PRODUCT ---------- */
  const METHOD_NAMES={screenprint:'Screenprint',transfer:'Transfer',dtf:'DTF transfer',embroidery:'Embroidery',pad:'Pad print',laser:'Laser engrave'};
  /* ---- earned selling points: only badges this product actually merits ---- */
  function earnedBadges(p){
    const b=[];
    if(p.sustainability>=8) b.push(['s-leaf',`Eco score ${p.sustainability}/10`, (p.material?esc(p.material)+' — ':'')+'independently scored, no greenwashing.']);
    if(p.certifications&&p.certifications.length) b.push(['s-check','Certified', p.certifications.slice(0,3).map(esc).join(' · ')]);
    if(p.lead&&p.lead<=8) b.push(['s-truck',`${p.lead}-day lead time`,'Faster than most of the range — good for tight deadlines.']);
    if(p.moq&&p.moq<=50) b.push(['s-check',`Low minimum · ${p.moq} units`,'Small runs welcome — ideal for events & VIP gifts.']);
    if(/united kingdom|\buk\b/i.test(p.origin||'')) b.push(['s-store','Made in the UK','Shorter shipping, lower transport footprint.']);
    else if(/france|germany|italy|portugal|spain|netherlands|belgium|austria|poland|czech/i.test(p.origin||'')) b.push(['s-store',`Made in ${esc(p.origin)}`,'EU-made — shorter shipping, lower transport footprint.']);
    if((p.printMethods||[]).length>=3) b.push(['s-print',`${p.printMethods.length} branding methods`, p.printMethods.slice(0,3).map(m=>METHOD_NAMES[m]||m).join(' · ')]);
    if(!b.length) return '';
    const show=b.slice(0,4);
    return `<div class="usps"><div class="usps-grid" style="grid-template-columns:repeat(${show.length},1fr)">${show.map(([ic,t,s])=>`<div class="usp"><span class="ic"><svg class="icn"><use href="#${ic}"/></svg></span><b>${t}</b><span>${s}</span></div>`).join('')}</div></div>`;
  }
  /* ---- USP story blocks (Merchery-style quote + image pairs) ---- */
  function uspStories(p){
    const stories=[];
    if(p.sustainability>=7||/recycl|bamboo|organic|bio|rpet|cork|wheat/i.test(p.material||''))
      stories.push({ q:`“Made to mean it — ${(p.material||'responsibly sourced materials').toLowerCase()}, scored ${p.sustainability}/10 for eco impact.”`, by:'Sustainability, verified per product', img:'assets/products/eco-visual-2.jpg', slot:'usp-eco' });
    else stories.push({ q:`“Built for the long haul — ${(p.material||'quality materials').toLowerCase()}, chosen to survive daily use.”`, by:'Quality first', img:'assets/products/eco-visual-2.jpg', slot:'usp-eco' });
    stories.push({ q:`“Your brand, done properly — ${p.printMethods.length||'multiple'} decoration method${p.printMethods.length===1?'':'s'}, proofed free before you commit.”`, by:'Branded by Merchsmith', img:'assets/products/eco-visual-3.jpg', slot:'usp-brand' });
    // distributor-overridden quotes win (Distributor view → Your product data → Story quote 1/2)
    if(p.story1) stories[0].q='“'+String(p.story1).replace(/^[“"]|[”"]$/g,'')+'”';
    if(p.story2&&stories[1]) stories[1].q='“'+String(p.story2).replace(/^[“"]|[”"]$/g,'')+'”';
    return stories;
  }
  function storySection(p){
    const slug=String(p.id).replace(/[^a-z0-9]/gi,'-').toLowerCase();
    return `<div class="pp-stories">${uspStories(p).map((s,i)=>`
      <div class="pp-story ${i%2?'flip':''}">
        <div class="pp-storyimg"><image-slot id="pps-${slug}-${s.slot}" shape="rounded" radius="18" fit="cover" src="${esc(s.img)}" placeholder="Drop a lifestyle image"></image-slot></div>
        <div class="pp-storycopy"><p class="pp-q">${esc(s.q)}</p><span class="pp-qby">${esc(s.by)}</span></div>
      </div>`).join('')}</div>`;
  }
  /* ---- product reviews: written by customers, visible only inside their organisation ---- */
  function curOrg(){ try{ const r=window.MSID?MSID.current():'customer'; if(r==='distributor')return 'Mojo Promotions'; if(r==='admin')return 'Merchsmith'; return 'Citrix'; }catch(e){ return 'Citrix'; } }
  function rvLoad(){ try{ return JSON.parse(localStorage.getItem('ms-product-reviews')||'{}')||{}; }catch(e){ return {}; } }
  function rvSave(o){ try{ localStorage.setItem('ms-product-reviews', JSON.stringify(o)); }catch(e){} }
  function rvFor(id){ return (rvLoad()[id]||[]).filter(r=>r.org===curOrg()); }
  function rvAdd(id,rev){ const o=rvLoad(); (o[id]=o[id]||[]).unshift(rev); rvSave(o); }
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  function reviewsSection(p){
    const revs=rvFor(p.id); const org=curOrg();
    const avg=revs.length?(revs.reduce((a,r)=>a+r.rating,0)/revs.length):0;
    const open=window.__rvOpen===p.id;
    return `<div class="pp-reviews ${open?'open':''}" id="ppReviews">
      <button type="button" class="pp-revhd" id="rvToggle">
        <h2>Team reviews</h2>
        <span class="pp-revsum">${revs.length?`<b class="pp-revstars">${stars(Math.round(avg))}</b> ${avg.toFixed(1)} · ${revs.length} review${revs.length===1?'':'s'}`:'No reviews yet — be the first'}</span>
        <span class="pp-revpriv" title="Reviews are private to your organisation"><svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>${esc(org)} only</span>
        <svg class="icn pp-revchev"><use href="#s-arr"/></svg>
      </button>
      <div class="pp-revbody">
      ${revs.length?`<div class="pp-revlist">${revs.map(r=>`<div class="pp-rev"><div class="pp-revtop"><b class="pp-revstars">${stars(r.rating)}</b><span class="pp-revwho">${esc(r.name)}${r.role?` · ${esc(r.role)}`:''}</span><span class="pp-revdate">${esc(r.date)}</span></div><p>${esc(r.text)}</p></div>`).join('')}</div>`
        :`<p class="pp-revempty">No reviews from ${esc(org)} yet — ordered this before? Be the first to tell your team how it landed.</p>`}
      <div class="pp-revform" id="rvForm">
        <h4>Add a review <span>seen only by colleagues at ${esc(org)}</span></h4>
        <div class="pp-revstarsin" id="rvStars">${[1,2,3,4,5].map(i=>`<button type="button" data-star="${i}">☆</button>`).join('')}</div>
        <textarea id="rvText" rows="3" placeholder="How did it go down? Print quality, durability, reactions…"></textarea>
        <div class="pp-revrow"><input id="rvName" type="text" placeholder="Your name" value="Sara Kemp"><input id="rvRole" type="text" placeholder="Role / team (optional)" value="Marketing"><button class="btn" id="rvSubmit">Post review</button></div>
      </div>
      </div>
    </div>`;
  }
  function wireReviews(p){
    const box=document.getElementById('ppReviews'); if(!box) return;
    const tog=box.querySelector('#rvToggle'); if(tog)tog.onclick=()=>{ box.classList.toggle('open'); window.__rvOpen=box.classList.contains('open')?p.id:null; };
    let rating=0;
    const paint=()=>box.querySelectorAll('#rvStars [data-star]').forEach(b=>{ b.textContent=+b.dataset.star<=rating?'★':'☆'; b.classList.toggle('on',+b.dataset.star<=rating); });
    box.querySelectorAll('#rvStars [data-star]').forEach(b=>b.onclick=()=>{ rating=+b.dataset.star; paint(); });
    const sub=box.querySelector('#rvSubmit'); if(sub)sub.onclick=()=>{
      const text=box.querySelector('#rvText').value.trim(); const name=box.querySelector('#rvName').value.trim()||'Anonymous';
      if(!rating){ toast('Pick a star rating first'); return; }
      if(!text){ toast('Write a line or two first'); box.querySelector('#rvText').focus(); return; }
      rvAdd(p.id,{ org:curOrg(), name, role:box.querySelector('#rvRole').value.trim(), rating, text, date:new Date().toLocaleDateString('en-GB') });
      window.__rvOpen=p.id;
      toast('Review posted — visible to your organisation only'); productView(p.id);
      setTimeout(()=>{ const el=document.getElementById('ppReviews'); if(el){ const y=el.getBoundingClientRect().top+window.scrollY-80; window.scrollTo(0,y); } },50);
    };
  }
  /* ---- you might also like ---- */
  function alsoLikeSection(p){
    const all=storeProducts();
    let rel=all.filter(x=>x.id!==p.id&&x.dept===p.dept&&hasImg(x));
    if(rel.length<4) rel=rel.concat(all.filter(x=>x.id!==p.id&&x.dept!==p.dept&&hasImg(x)));
    rel=rel.slice(0,4);
    if(!rel.length) return '';
    return `<div class="pp-also"><div class="hm-hd"><h2>You might also like</h2><a href="#dept=${esc(p.dept)}">More in this range →</a></div><div class="pgrid pgrid4">${rel.map(card).join('')}</div></div>`;
  }
  function defaultStoreBanner(){
    if(!MSDEF||document.getElementById('msdefBanner')) return;
    const b=document.createElement('div'); b.id='msdefBanner'; b.className='msdef-banner';
    b.innerHTML='<a href="Merchsmith Admin.html">← Back to Platform Admin</a>';
    view.parentNode.insertBefore(b,view);
  }
  function productView(id){
    // ----- staged store preview (a not-yet-imported feed product, opened from the import wizard) -----
    const hp=new URLSearchParams(location.hash.slice(1));
    let previewMode=false, p=null;
    if(hp.get('preview')){ try{ const raw=JSON.parse(localStorage.getItem('ms-store-preview')||'null'); if(raw){ p=catToStore(raw); previewMode=true; } }catch(e){} }
    if(!p) p=storeProducts().find(x=>x.id===id);
    if(!p&&MSDEF&&window.MSCAT&&MSCAT.get){ const c=MSCAT.get(id); if(c) p=catToStore(c); }
    if(!p) p=S.products.find(x=>x.id===id);
    if(!p){ const q=decodeURIComponent(id); p=storeProducts().find(x=>x.name===q) || storeProducts().find(x=>x.name.toLowerCase().includes(q.toLowerCase().split(' ')[0])); }
    // fall back to ANY catalogue product (e.g. imported POA products not in the distributor range)
    if(!p && window.MSCAT && MSCAT.get){ const c=MSCAT.get(id)||MSCAT.get(decodeURIComponent(id)); if(c) p=catToStore(c); }
    if(!p){ deptView(); return; }
    const dept=deptById(p.dept);
    const sec=(window.MSSTORE&&MSSTORE.sectionOfDept)?MSSTORE.sectionOfDept(p.dept):null;
    renderTopNav(sec?sec.id:curSectionId());
    crumb([{l:'Store'},{l:sec?sec.name:'Essentials',h:sec?'#section='+sec.id:''},{l:dept?dept.name:'',h:dept?'#dept='+dept.id:''},{l:p.name}]);
    view.innerHTML = `
      <button class="ppback" id="ppback"><svg class="icn" style="width:15px;height:15px;transform:rotate(180deg)"><use href="#s-arr"/></svg>Back to ${dept?esc(dept.name):'Store'}</button>
      ${previewMode?`<div class="pp-preview-banner">👁 Store preview — <b>${esc(p.supplier||'feed product')}</b>. This product is <b>not imported</b>; nothing here is saved. Showing the distributor view.${p._poa?' Price is <b>POA</b> (no cost feed matched).':''}</div>`:''}
      ${briefBanner()}
      <div class="pp">
        <div class="pp-gallery">
          <div class="stage" id="ppStage" title="Click to enlarge">${imgEl(p.img,'',p.name,p.imgUrl)}<button class="pp-zoom" id="ppZoom" title="Enlarge image">⤢</button></div>
          ${(function(){ const gal=(p.images||[]).filter(u=>/^(https?:|data:image\/)/.test(u)).slice(0,6); return gal.length>1?`<div class="pp-galrow">${gal.map((u,i)=>`<button type="button" class="pp-galth ${i===0?'on':''}" data-gal="${esc(u)}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>`:''; })()}
        </div>
        <div class="pp-info">
          <h1>${esc(p.name)}</h1>
          <div class="pp-sku">${p.id.toUpperCase()}</div>
          ${briefCtx()?`<button class="btn ${briefAddedIds().includes(String(p.id))?'btn-added':'btn-fulfil'}" id="fulfilBrief"><svg class="icn" style="width:16px;height:16px"><use href="#s-check"/></svg>${briefAddedIds().includes(String(p.id))?'Added to “'+esc(briefCtx().it.type)+'” — remove?':'Add to “'+esc(briefCtx().it.type)+'” brief'}</button>`:''}
          <div class="addproj" id="addproj">
            <button class="btn"><svg class="icn" style="width:16px;height:16px"><use href="#s-plus"/></svg>Add to Project <svg class="icn" style="width:15px;height:15px"><use href="#s-arr"/></svg></button>
            <div class="menu">${PROJECTS.map(pr=>`<button data-proj="${esc(pr)}">${esc(pr)}</button>`).join('')}<button class="new" data-proj="__new">Create new project…</button></div>
          </div>
          <div class="spec">
            <h4>Product info</h4>
            <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6;margin:0 0 16px">${esc(p.blurb)}</p>
            <div class="kv">
              <span class="k">Product colours</span><span class="v swrow">${p.colours.map(sw).join('')}<em class="swname" style="font-style:normal;font-size:12.5px;color:var(--muted);margin-left:6px;align-self:center"></em></span>
              <span class="k">Sizes</span><span class="v">${p.sizes.join(', ')}</span>

              <span class="k">Dimensions</span><span class="v">${p.dimensions?esc(p.dimensions):(p.dims.w+' × '+p.dims.h+(p.dims.d&&p.dims.d!=='—'?' × '+p.dims.d:''))}</span>
              <span class="k">Material</span><span class="v">${esc(p.material)}</span>
              ${p.origin?`<span class="k">Country of origin</span><span class="v">${esc(p.origin)}</span>`:''}
              ${envCertsOf(p).length?`<span class="k">Environmental accreditations</span><span class="v">${envCertsOf(p).map(c=>esc(c)).join(' · ')}</span>`:''}
              ${socialCertsOf(p).length?`<span class="k">Social accreditations</span><span class="v">${socialCertsOf(p).map(c=>esc(c)).join(' · ')}</span>`:''}
            </div>
          </div>
          ${(p.printMethods.length||posOf(p).length||(p.branding&&p.branding.size))?`<div class="spec" style="margin-top:18px">
            <h4>Branding</h4>
            <div class="kv">
              ${p.printMethods.length?`<span class="k">Recommended Method</span><span class="v">${METHOD_NAMES[(p.branding&&p.branding.method)||p.printMethods[0]]||(p.branding&&p.branding.name)||p.printMethods[0]}</span>
              <span class="k">Available Methods</span><span class="v">${p.printMethods.map(m=>METHOD_NAMES[m]||m).join(', ')}</span>`:''}
              ${posOf(p).length?`<span class="k">Positions</span><span class="v">${posOf(p).map(x=>esc(x)).join(' · ')}</span>`:''}
              ${p.branding&&p.branding.size?`<span class="k">Branding Area</span><span class="v">${esc(p.branding.size)}${/mm/i.test(String(p.branding.size))?'':' mm'}</span>`:''}
            </div>
          </div>`:''}
          <div class="spec" style="margin-top:18px">
            <h4>Price &amp; lead time</h4>
            <div class="kv">
              <span class="k">Guide price</span><span class="v">${gbp(p.priceGuide)} <small style="color:var(--muted);font-weight:500">on ${p.priceGuideQty} units</small></span>
              <span class="k">Minimum order</span><span class="v">${p.moq} units</span>
              <span class="k">Lead time</span><span class="v">${p.lead} working days</span>
            </div>
          </div>
        </div>
      </div>
      <!-- earned selling points: only what this product actually merits -->
      ${earnedBadges(p)}
      ${storySection(p)}
      ${reviewsSection(p)}
      ${alsoLikeSection(p)}`;
    document.getElementById('ppback').onclick=()=>{ location.hash='dept='+p.dept; };
    wireBrief();
    wireReviews(p);
    view.querySelectorAll('.pp-also .pcard').forEach(c=>c.onclick=()=>{ if(c.dataset.id){ location.hash='product='+c.dataset.id; window.scrollTo(0,0); } });
    { const fb=document.getElementById('fulfilBrief'); if(fb) fb.onclick=()=>{ const ctx=briefCtx(); if(!ctx)return; const isAdded=briefAddedIds().includes(String(p.id)); if(isAdded){ removeFromBrief(p); toast(`Removed “${p.name}” from the ${ctx.it.type} line`); } else { addToBrief(p); toast(`Added “${p.name}” to the ${ctx.it.type} line — add more or click Done`); } productView(p.id); }; }
    if(isDist()||previewMode){ view.insertAdjacentHTML('beforeend', distributorPanel(p)); wireAccordions(p);
      // two-supplier default for this product (store level; projects can override)
      if(window.MSTWO&&!previewMode){ const box=document.createElement('div'); box.className='pp-twosup'; const paint=()=>{ const t=MSTWO.get(p.name,'__store__');
          box.innerHTML='<div><span>Suppliers</span><b>'+(t?esc(t.blank)+' (blank product) → '+esc(t.brand)+' (branding)':esc(p.supplier||'One supplier')+' supplies and brands this product')+'</b><small>'+(t?'Blank lead '+t.blankLead+' days · overs '+t.overs+'% · '+t.transit+' days transit · decorator lead '+t.brandLead+' days. Projects can use a different decorator.':'Make this a two-supplier product if another supplier does the branding.')+'</small></div><button type="button" class="btn ghost sm">'+(t?'Change':'Set up two suppliers')+'</button>';
          box.querySelector('button').onclick=()=>MSTWO.editor(p.name,null,paint); };
        paint(); const dp=view.querySelector('.dv-panel,.dvp,[data-dvpanel]')||view.lastElementChild; dp.parentNode.insertBefore(box,dp);
        if(window.MSWARN){ const wc=document.createElement('div'); const wp=()=>{ wc.innerHTML=MSWARN.storeCardHTML(p.name); wc.querySelector('[data-wnmgr2]').onclick=()=>MSWARN.manager(p.name,wp); }; wp(); box.after(wc); } } }
    const ap=document.getElementById('addproj');
    ap.querySelector('.btn').onclick=e=>{ e.stopPropagation(); ap.classList.toggle('open'); };
    document.addEventListener('click',()=>ap.classList.remove('open'));
    ap.querySelectorAll('[data-proj]').forEach(b=>b.onclick=()=>{ const v=b.dataset.proj; if(v==='__new'){ window.location.href='Merchsmith Create Project.html'; return; } toast(`Added “${p.name}” to ${v}`); ap.classList.remove('open'); });
    // thumb colour switch — swaps the stage photo when the feed carries a matching variant image
    const gal=(p.images||[]).filter(u=>/^(https?:|data:image\/)/.test(u));
    const setStage=u=>{ const im=document.querySelector('#ppStage img'); if(im&&u){ im.src=u; } view.querySelectorAll('.pp-galth').forEach(g=>g.classList.toggle('on',g.dataset.gal===u)); };
    // product-info colour swatches: highlight + swap the stage image when a variant image exists
    view.querySelectorAll('.pp-info .swrow .sw2, .pp-info .swrow .sw').forEach((s,i)=>{ s.style.cursor='pointer'; s.onclick=()=>{ view.querySelectorAll('.pp-info .swrow .sw2, .pp-info .swrow .sw').forEach(x=>x.classList.remove('on')); s.classList.add('on'); const nm=view.querySelector('.pp-info .swrow .swname'); if(nm) nm.textContent=p.colours[i]||''; if(gal[i]) setStage(gal[i]); }; });
    view.querySelectorAll('.pp-galth').forEach(g=>g.onclick=()=>setStage(g.dataset.gal));
    // zoom / enlarge
    const openZoom=()=>{ const im=document.querySelector('#ppStage img'); const src=im?im.src:(p.imgUrl||''); if(!src) return;
      let z=document.getElementById('ppLightbox'); if(z)z.remove();
      z=document.createElement('div'); z.id='ppLightbox'; z.className='pp-lightbox';
      z.innerHTML=`<button class="pp-lbx" title="Close">×</button><img src="${src}" alt="">`;
      document.body.appendChild(z);
      const close=()=>{ z.remove(); document.removeEventListener('keydown',esc); };
      const esc=e=>{ if(e.key==='Escape') close(); };
      z.onclick=close; document.addEventListener('keydown',esc);
    };
    { const st=document.getElementById('ppStage'); if(st){ st.onclick=e=>{ if(e.target.closest('image-slot'))return; openZoom(); }; } const zb=document.getElementById('ppZoom'); if(zb)zb.onclick=e=>{ e.stopPropagation(); openZoom(); }; }
  }

  /* ---------- DISTRIBUTOR VIEW: grouped pull-down data + price matrix ---------- */
  function isDist(){ try{ return !window.MSID || MSID.current()==='distributor' || MSID.current()==='admin'; }catch(e){ return true; } }
  const MARK=[[0,2.20],[60,2.00],[100,1.74],[250,1.56],[500,1.45],[1000,1.36]];
  const markup=tc=>{ let m=MARK[0][1]; for(const b of MARK){ if(tc>=b[0]) m=b[1]; } return m; };
  function sellUnit(unit,q){ const tc=unit*q; let ts=tc*markup(tc); if(ts-tc<60)ts=tc+60; return ts/q; }
  function decoRun(q){ const t=[[50,0.67],[100,0.43],[250,0.31],[500,0.21],[1000,0.17],[2500,0.15]]; let v=0.13; for(const[qq,u]of t){ if(q>=qq)v=u; } return v; }
  function priceMatrix(p){
    /* Full-depth matrix per the Price Matrix Concept: quantity ladder to 20,000, unbranded row,
       every decoration method with per-colour rows + setup lines, delivery and profit rows,
       cost ↔ sell toggle — organised into tabs (Full matrix / Markup & rules / Worked example). */
    const BR=[50,100,250,500,1000,2500,5000,10000,20000];
    const bks=(p.priceBreaks||[]).filter(b=>b.unit>0).slice().sort((a,b)=>a.q-b.q);
    const poa=!bks.length;
    const unb=q=>{ if(!bks.length) return null; let u=bks[0].unit; for(const b of bks){ if(q>=b.q)u=b.unit; }
      const last=bks[bks.length-1]; if(q>last.q) u=last.unit*Math.pow(0.94,Math.log2(q/last.q)); return u; };
    // decoration book: real per-method feed data when present, else the standard illustrative book
    const c=p._cat||{};
    const feedDeco=(c.decoration||[]).filter(d=>d.breaks&&d.breaks.length);
    const col=k=>q=>decoRun(q)*k;
    const METHODS=feedDeco.length?feedDeco.slice(0,6).map(d=>({
      name:esc(d.impMethod||d.method||d.code||'Decoration'), code:esc(d.code||''), setup:d.setup!=null?+d.setup:25, setupLbl:d.setup!=null?gbp(+d.setup)+' setup':'£25.00 setup (std)',
      rows:[{label:d.dependence==='Size'?'Per unit (size-dep.)':'Per unit', cost:q=>{ let v=+d.breaks[0].price; for(const b of d.breaks){ if(q>=(+b.qty||+b.q||0)) v=+b.price; } return v; }}]
    })):[
      {name:'Screenprint',code:'GPE06',setup:50,setupLbl:'£25.00 / colour setup',rows:[{label:'1 colour',cost:col(1)},{label:'2 colours',cost:col(1.7)},{label:'3 colours',cost:col(2.4)},{label:'4 colours',cost:col(3.1)}]},
      {name:'Pad print',code:'PAD02',setup:44,setupLbl:'£22.00 / colour setup',rows:[{label:'1 colour',cost:col(0.93)},{label:'2 colours',cost:col(1.58)}]},
      {name:'Laser engrave',code:'LAS03',setup:30,setupLbl:'£30.00 setup',rows:[{label:'Single tone',cost:col(1.25)}]},
      {name:'Embroidery',code:'EMB08',setup:34.78,setupLbl:'£34.78 digitising',rows:[{label:'Up to 5,000 st.',cost:q=>decoRun(q)*4.4+0.4}]}
    ];
    const delivC=q=>20*(1+0.35*Math.floor(q/500));
    const roundUp5=n=>Math.ceil(n/5)*5;
    const sUnb=q=>{ const u=unb(q); if(u==null)return null; const tc=u*q; let ts=tc*markup(tc); if(ts-tc<60)ts=tc+60; return ts/q; };
    const sDeco=(m,fn,q)=>{ const u=unb(q)||0; const tc=(u+fn(q))*q+m.setup; let ts=tc*markup(tc); if(ts-tc<60)ts=tc+60; return ts/q - (sUnb(q)||0); };
    const dash='<span style="color:var(--muted)">—</span>', poaTxt='<span style="color:var(--muted)">POA</span>';
    window.__mxTable=window.__mxTable||{};
    window.__mxTable[p.id]=function(mode){
      const sell=mode==='sell';
      const cells=fn=>BR.map(q=>`<td>${fn(q)}</td>`).join('');
      let h=`<thead><tr><th>${sell?'Sell / unit':'Cost / unit'}</th>${BR.map(q=>`<th>${q.toLocaleString()}+</th>`).join('')}</tr></thead><tbody>`;
      h+=`<tr class="mx-unb"><td>Unbranded item</td>${cells(q=>{ const u=sell?sUnb(q):unb(q); return u==null?poaTxt:gbp(u); })}</tr>`;
      METHODS.forEach(m=>{
        h+=`<tr class="mx-method"><td colspan="${BR.length+1}"><b>${m.name}</b>${m.code?` <span class="mx-code">(${m.code})</span>`:''}</td></tr>`;
        m.rows.forEach(r=>{ h+=`<tr><td>${r.label}</td>${cells(q=>gbp(sell?sDeco(m,r.cost,q):r.cost(q)))}</tr>`; });
        h+=`<tr class="mx-setup"><td colspan="${BR.length+1}">${sell?`Setup absorbed into sell price (${m.setupLbl})`:`Setup charge ${m.setupLbl}`}</td></tr>`;
      });
      h+=`<tr class="mx-deliv"><td>Delivery · UK ${sell?'· sell':'· cost'}</td>${cells(q=>sell?('£'+Math.round(delivC(q)*1.25).toLocaleString()):gbp(delivC(q)))}</tr>`;
      h+=`<tr class="mx-profit"><td>Profit / unit ${sell?'':'(sell only)'}</td>${cells(q=>{ if(!sell)return dash; const u=unb(q),s=sUnb(q); return (u==null||s==null)?dash:gbp(s-u); })}</tr>`;
      h+=`<tr class="mx-profit mx-ptotal"><td>Profit total</td>${cells(q=>{ if(!sell)return dash; const u=unb(q),s=sUnb(q); return (u==null||s==null)?dash:'£'+Math.round((s-u)*q).toLocaleString(); })}</tr>`;
      h+='</tbody>';
      return h;
    };
    // worked example at the first ladder qty ≥ MOQ (default 1,000)
    const exQ=BR.find(q=>q>=(p.moq||100)&&q>=250)||1000;
    const exM=METHODS[0], exFn=exM.rows[0].cost;
    const exU=unb(exQ), exD=exFn(exQ);
    const example=(exU==null)?`<p class="dv-note"><b>POA</b> — no cost feed is matched to this product, so a worked example can’t be built. Import the matching price feed to light this up.</p>`
      :(function(){ const goods=(exU+exD)*exQ, tc=goods+exM.setup, mk=markup(tc); let ts=tc*mk; if(ts-tc<60)ts=tc+60; const unit=ts/exQ;
      return `<div class="mx-calc">
        <div class="line"><span class="k">Unbranded item · ${exQ.toLocaleString()} break</span><span class="v">${gbp(exU)} × ${exQ.toLocaleString()} = ${gbp(exU*exQ)}</span></div>
        <div class="line"><span class="k">${exM.name} · ${exM.rows[0].label}</span><span class="v">${gbp(exD)} × ${exQ.toLocaleString()} = ${gbp(exD*exQ)}</span></div>
        <div class="line"><span class="k">Setup</span><span class="v">${gbp(exM.setup)}</span></div>
        <div class="line total"><span class="k">Total supplier cost</span><span class="v">${gbp(tc)}</span></div>
        <div class="line"><span class="k">Markup (band for this total)</span><span class="v">× ${mk.toFixed(2)}${ts-tc<=60.01?' · £60 min-profit floor':''}</span></div>
        <div class="line total"><span class="k">Total sell price</span><span class="v">${gbp(ts)}</span></div>
        <div class="line"><span class="k">Distributor profit</span><span class="v" style="color:var(--green-deep)">${gbp(ts-tc)}</span></div>
        <div class="line"><span class="k">Unit sell price (÷ ${exQ.toLocaleString()})</span><span class="v"><b>${gbp(unit)} / unit</b></span></div>
      </div><p class="dv-note" style="font-family:ui-monospace,Menlo,monospace">unit = ( (item + deco)·qty + setup ) × markup ÷ qty</p>`; })();
    const rules=`<table class="dv-matrix" style="max-width:420px"><thead><tr><th>Total cost over</th><th>Markup ×</th><th>Min profit</th></tr></thead><tbody>
      ${MARK.map(([t,m],i)=>`<tr><td>£${t.toLocaleString()}</td><td><b>${m.toFixed(2)}</b></td><td>${i===0?'£60.00':'—'}</td></tr>`).join('')}</tbody></table>
      <p class="dv-note">Markup bands key on the <b>total cost</b> (item + decoration + setup). A £60 minimum-profit floor protects the smallest orders. Setup is inside the total cost — marked up, then absorbed into the unit sell figure.</p>
      <p class="dv-note"><b>Delivery</b> — separate line, not in the unit price: supplier delivery × 1.25, rounded to the nearest £. Scales with quantity (boxes / pallets).</p>
      <p class="dv-note"><b>Setup sell</b> — × 1.35, rounded up to the nearest £5 (e.g. £25 cost → £35 sell).</p>
      <p class="dv-note"><b>Between breaks</b> — quantities between breaks use the closest break below, for both unit price and delivery.</p>`;
    return `<div class="mx-wrap" data-mxpid="${esc(p.id)}">
      <div class="mx-tabs"><button class="mx-tab on" data-mxtab="matrix">Full matrix</button><button class="mx-tab" data-mxtab="rules">Markup &amp; rules</button><button class="mx-tab" data-mxtab="example">Worked example</button></div>
      <div data-mxpane="matrix">
        <div class="mx-bar"><button class="mx-mode" data-mxmode="cost"><span class="mx-dot"></span><span data-mxmodelbl>Show sell prices</span></button><span class="mx-legend" data-mxlegend>Showing supplier <b>cost</b> per unit</span></div>
        <div style="overflow-x:auto"><table class="dv-matrix mx-deep" data-mxtable>${window.__mxTable[p.id]('cost')}</table></div>
        <p class="dv-note">${poa?'<b>POA</b> — no cost feed is matched to this product: unbranded, sell and profit rows light up once a matching price feed is imported. Decoration, setup and delivery are live. ':''}${feedDeco.length?'Decoration rows come from this product’s <b>print-price feed</b>.':'No print-price feed matched — decoration shows the standard cost book (illustrative).'} The customer never sees this table.</p>
      </div>
      <div data-mxpane="rules" hidden>${rules}</div>
      <div data-mxpane="example" hidden>${example}</div>
    </div>`;
  }
  function acc(id,title,sub,body,open){
    open = open!==false;
    return `<div class="dv-acc ${open?'open':''}"><button class="dv-h" data-acc="${id}"><span><b>${title}</b>${sub?`<span>${sub}</span>`:''}</span><svg class="icn dv-chev"><use href="#s-arr"/></svg></button><div class="dv-b">${body}</div></div>`;
  }
  function kvRows(rows){ return `<div class="dv-kv">${rows.map(([k,v])=>`<span class="k">${k}</span><span class="v">${v}</span>`).join('')}</div>`; }
  /* ---------- distributor per-field overrides editor ---------- */
  function ovFmt(v){ if(v==null||v==='')return '—'; if(Array.isArray(v))return v.join(', '); return String(v); }
  function ovBody(p){
    if(!window.MSOV) return '';
    const n=MSOV.count(p.id);
    const groups=MSOV.FIELDS.map(g=>`<div class="ov-group"><h5>${esc(g.group)}</h5>${g.fields.map(f=>{
      const ov=MSOV.val(p.id,f.k); const has=ov!==undefined;
      const feed=(p._feed&&f.k in p._feed)?p._feed[f.k]:p[f.k];
      const val=has?ov:'';
      let input='';
      if(f.type==='img'){ const cur=has?ov:(feed||''); input=`<div class="ov-imgrow"><image-slot class="ov-img" id="ov-img-${esc(String(p.id))}" data-ovimg="${f.k}" ${cur&&/^(https?:|data:image\/)/.test(cur)?`src="${esc(cur)}"`:''} shape="rounded" radius="9" fit="contain" placeholder="Drop replacement image"></image-slot></div>`; }
      else if(f.type==='textarea') input=`<textarea class="ov-in" rows="2" data-ovk="${f.k}" placeholder="Override…">${esc(Array.isArray(val)?val.join(', '):val)}</textarea>`;
      else input=`<input class="ov-in" type="${f.type==='number'?'number':'text'}" ${f.type==='number'?'step="any"':''} data-ovk="${f.k}" placeholder="Override…" value="${esc(Array.isArray(val)?val.join(', '):val)}">`;
      return `<div class="ov-row ${has?'ov-on':''}">
        <div class="ov-lbl"><b>${esc(f.label)}</b><span class="ov-aud ${f.aud}">${f.aud==='customer'?'Customer-facing':'You only'}</span></div>
        <div class="ov-feedv" title="Original feed value — untouched"><i>Feed</i>${esc(ovFmt(feed))}</div>
        <div class="ov-edit">${input}${has?`<button type="button" class="ov-reset" data-ovreset="${f.k}" title="Reset to feed value">⟳</button>`:''}</div>
      </div>`;
    }).join('')}</div>`).join('');
    return `<div class="ov-wrap" data-ovpid="${esc(String(p.id))}">
      <div class="ov-summary"><span>${n?`<b>${n}</b> field${n===1?'':'s'} overridden · last edit ${esc(p._ovUpdated||'')}`:'No overrides yet — the store shows the feed data as-is.'}</span>${n?`<button type="button" class="ov-clearall" data-ovclearall>Reset all to feed</button>`:''}</div>
      <p class="ov-note">Overrides sit on top of the supplier feed — the original data is never changed and stays visible per field. <b>Customer-facing</b> fields update your storefront; <b>You only</b> fields are private to your team. Leave a field blank to use the feed value.</p>
      ${groups}
    </div>`;
  }
  function wireOverrides(p){
    const w=document.querySelector('.ov-wrap'); if(!w||!window.MSOV) return;
    const rerender=()=>{ window.__ovOpen=p.id; route(); };
    w.querySelectorAll('[data-ovk]').forEach(i=>i.onchange=()=>{ MSOV.set(p.id,i.dataset.ovk,i.value); rerender(); });
    w.querySelectorAll('[data-ovreset]').forEach(b=>b.onclick=()=>{ MSOV.clear(p.id,b.dataset.ovreset); rerender(); });
    const ca=w.querySelector('[data-ovclearall]'); if(ca)ca.onclick=()=>{ if(confirm('Reset every override on this product back to the feed data?')){ MSOV.clearAll(p.id); rerender(); } };
    w.querySelectorAll('[data-ovimg]').forEach(sl=>sl.addEventListener('ms-slot-change',e=>{ MSOV.set(p.id,sl.dataset.ovimg,(e.detail&&e.detail.url)||null); rerender(); }));
  }
  // resolve a build-queue field (added from the Field Mapping page) to a value on this product, else "Not supplied"
  function _dvExtraVal(label,p,c){
    const L=String(label||'').toLowerCase(); const j=a=>(a&&a.length)?a.join(' \u00b7 '):null; const W=p.weightGr||c.weightGr;
    const map=[
      [/apparel size|^sizes/,()=>p.sizes&&p.sizes.length?p.sizes.join(', '):null],
      [/certification/,()=>j(c.certifications||p.certifications)],
      [/material/,()=>p.material],
      [/origin/,()=>p.origin],
      [/barcode|ean/,()=>p.ean],
      [/hs |commodity/,()=>p.hsCode],
      [/gender/,()=>p.gender],
      [/weight/,()=>W?(W>=1000?(W/1000).toFixed(2)+' kg':W+' g'):null],
      [/carton/,()=>(c.carton||p.carton)?((c.carton||p.carton)+' units'):null],
      [/clearance/,()=>c.clearance?'Yes':null],
      [/brand/,()=>p.brand]
    ];
    for(const [re,fn] of map){ if(re.test(L)){ const v=fn(); if(v) return esc(String(v)); } }
    return '<span style="color:var(--muted)">Not supplied</span>';
  }
  // custom (operator-defined) fields with a value on this product → "Additional attributes" accordion
  function customAttrAcc(p){ if(!window.MSFIELDS) return '';
    const src=p._cat||p; const customs=MSFIELDS.all().filter(f=>!f.builtin);
    const rows=customs.map(f=>{ let v=MSFIELDS.valueOf(f, src); if((v==null||v==='')&&p.custom) v=p.custom[f.key];
      if(v==null||v===''||(Array.isArray(v)&&!v.length)) return null;
      return [esc(f.label)+(f.unit?` <small style="color:var(--muted)">(${esc(f.unit)})</small>`:''), esc(MSFIELDS.format(f,v))]; }).filter(Boolean);
    if(!rows.length) return '';
    return acc('extra','Additional attributes',rows.length+' custom field'+(rows.length===1?'':'s'),kvRows(rows));
  }
  (function(){ if(!document.getElementById('dv-extra-style')){ const st=document.createElement('style'); st.id='dv-extra-style'; st.textContent='.dv-thumbs{display:flex;flex-wrap:wrap;gap:8px}.dv-thumb{width:74px;height:74px;border:1px solid var(--line-soft,#e5e3dd);border-radius:9px;overflow:hidden;background:var(--paper-2,#f6f6fb);display:block;flex:none}.dv-thumb img{width:100%;height:100%;object-fit:contain;display:block}.dv-thumb.bad img{opacity:0}.dv-thumb.bad{position:relative}.dv-thumb.bad::after{content:"no img";position:absolute;inset:0;display:grid;place-items:center;font-size:9px;color:var(--muted,#9a9a9f)}.dv-desc{font-size:13px;line-height:1.6;color:var(--ink-2,#444);margin:0 0 10px}.dv-deco-list{display:flex;flex-direction:column;gap:0}.dv-deco-row{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;padding:8px 0;border-bottom:1px solid var(--line-soft,#eee)}.dv-deco-row:last-child{border-bottom:0}'; document.head.appendChild(st); } })();
  // In-store range toggle (distributor only). Mirrors the add/remove action in
  // Settings → Store range; both write through MSCAT.distToggle, so the two stay in step.
  function recommendBar(p){
    const c=MSCAT.get(p.id)||{}, m=c.curation, pend=m&&m.approval==='pending';
    const st=!m?'none':pend?'pend':m.tier==='featured'?'feat':'rec';
    const T={none:['Not recommended','Not in the Merchsmith Recommended range — distributors on the Recommended range will not receive it.'],
      pend:['Awaiting supplier approval','Proposed as '+(m&&m.tier==='featured'?'Featured':'Recommended')+'. It goes live once the supplier accepts the terms.'],
      rec:['Recommended','Live in the Recommended range — every distributor on the Recommended range stocks it.'],
      feat:['Featured','Live and featured — promoted placement in every Recommended-range store.']}[st];
    const rates=MSCAT.curRates?MSCAT.curRates():{standard:5,featured:60};
    return `<div class="dv-range rec-${st} ${st!=='none'?'in':''}">
      <span class="dv-rdot"></span>
      <div class="dv-rtx"><b>${T[0]}</b><span>${T[1]}</span></div>
      <div class="dv-racts">${st==='none'
        ?`<button class="dv-rbtn" data-recadd="standard">＋ Recommend</button><button class="dv-rbtn ghost" data-recadd="featured">＋ Feature</button>`
        :`<select class="dv-rsel" data-rectier aria-label="Placement tier">
            <option value="standard" ${m.tier!=='featured'?'selected':''}>Recommended</option>
            <option value="featured" ${m.tier==='featured'?'selected':''}>Featured</option></select>
          <button class="dv-rbtn ghost" data-recrm>Remove</button>`}</div>
    </div>`;
  }
  function rangeToggle(p){
    if(MSDEF&&window.MSCAT&&MSCAT.curRates) return recommendBar(p);
    if(!window.MSCAT||!MSCAT.distInRange) return '';
    const cfg=MSCAT.distConfig?MSCAT.distConfig():{mode:'curated'};
    const inR=MSCAT.distInRange(p.id), locked=cfg.mode==='curated';
    const why=locked
      ? 'Your store mirrors the Merchsmith Recommended range, so products can\'t be added or removed individually. Change this in Settings → Store range.'
      : (inR?'This product is live in your store.':'This product is not in your store yet.');
    return `<div class="dv-range ${inR?'in':''} ${locked?'locked':''}">
      <span class="dv-rdot"></span>
      <div class="dv-rtx"><b>${inR?'In your range':'Not in your range'}</b><span>${why}</span></div>
      ${locked?'<a class="dv-rlink" href="Merchsmith Distributor Settings.html#tab=storerange">Store range settings →</a>'
        :`<button class="dv-rbtn ${inR?'on':''}" data-rangetog="${esc(p.id)}">${inR?'✓ In your range':'＋ Add to your range'}</button>`}
    </div>`;
  }
  function distributorPanel(p){
    const M={screenprint:'Screenprint',transfer:'Transfer',dtf:'DTF transfer',embroidery:'Embroidery',pad:'Pad print',laser:'Laser engrave'};
    const c=p._cat||{};
    const muted=v=>(v!=null&&v!==''&&!(Array.isArray(v)&&!v.length))?null:'<span style="color:var(--muted)">Not supplied</span>';
    const matrix=priceMatrix(p);
    // images / thumbnails (all feed images)
    const imgs=((c.images&&c.images.length?c.images:(p.imgUrl?[p.imgUrl]:(c.image?[c.image]:[])))||[]).filter(Boolean);
    const mediaBody=(imgs.length?`<div class="dv-thumbs">${imgs.map(u=>`<a class="dv-thumb" href="${esc(u)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(u)}" alt="" onerror="this.closest('.dv-thumb').classList.add('bad')"></a>`).join('')}</div>`:'<p class="dv-note">No images in feed.</p>')+((c.video||p.video)?`<p style="margin-top:10px"><a href="${esc(c.video||p.video)}" target="_blank" style="color:var(--periwinkle-deep)">Product video ↗</a></p>`:'');
    // decoration detail (from print-price feed join)
    const deco=c.decoration||[];
    const decoBody=deco.length
      ? `<div class="dv-deco-list">${deco.map(d=>{ const b0=d.breaks&&d.breaks[0]?d.breaks[0].price:null; return `<div class="dv-deco-row"><span><b>${esc(d.impMethod||d.method||d.code)}</b>${d.method?` · ${esc(M[d.method]||d.method)}`:''}${d.dependence==='Size'?' · size-dependent':''}</span><span>${d.setup?'setup '+gbp(d.setup):''}${b0!=null?(d.setup?' · ':'')+gbp(b0)+'/unit':''}${(d.setup==null&&b0==null)?'<span style=\"color:var(--muted)\">see print feed</span>':''}</span></div>`; }).join('')}</div>`
      : kvRows([
        ['Methods',p.printMethods.length?p.printMethods.map(m=>M[m]||m).join(', '):muted()],
        ['Recommended',p.branding&&p.branding.name?esc(p.branding.name):(p.printMethods.length?(M[p.printMethods[0]]||p.printMethods[0]):'—')],
        ['Default position',p.branding&&p.branding.location?esc(p.branding.location):'<span style="color:var(--muted)">Front / Back per feed</span>'],
        ['Print area',p.branding&&p.branding.size?esc(p.branding.size):muted()],
        ['Max colours',p.branding&&p.branding.maxColours?esc(p.branding.maxColours):muted()],
        ['Setup','<span style="color:var(--muted)">from print-price feed — applied in quote</span>']
      ]);
    // stock
    const stk=c.stock||{};
    const stockRows=p.colours.map((col,i)=>`<tr><td>${esc(col)}</td><td>${(((p.id.length*7+i*53)%48)*100+200).toLocaleString()}</td><td>${i===0?'5,000 due 11/07/26':'—'}</td></tr>`).join('');
    const stockBody=(stk.total!=null?kvRows([['Total on hand',Number(stk.total).toLocaleString()+' units'],['Warehouse',(stk.locations&&stk.locations.length)?stk.locations.join(' / '):muted()]]):'')+`<table class="dv-matrix" style="margin-top:8px"><thead><tr><th>Colour</th><th>On hand</th><th>Incoming</th></tr></thead><tbody>${stockRows}</tbody></table>`;
    const wt=p.weightGr||c.weightGr;
    const _extras=(function(){ try{ return JSON.parse(localStorage.getItem('ms-dv-extra-fields')||'[]')||[]; }catch(e){ return []; } })();
    const extrasAcc=_extras.length?acc('queuefields','Build-queue fields','Added from Field Mapping',kvRows(_extras.map(x=>[esc(x.label)+(x.group?` <small style="color:var(--muted)">(${esc(x.group)})</small>`:''), _dvExtraVal(x.label,p,c)]))):'';
    return `${rangeToggle(p)}
    <div class="dv-panel collapsed">
      <button class="dv-head" data-dvtoggle><svg class="icn"><use href="#s-store"/></svg><div><b>Distributor view</b><span>Full product data &amp; cost/sell pricing — not shown to customers.</span></div><svg class="icn dv-pchev"><use href="#s-arr"/></svg></button>
      <div class="dv-acclist">
      ${acc('override','Your product data',(p._ovCount?`${p._ovCount} field${p._ovCount===1?'':'s'} overridden`:'Override any feed field — feed stays untouched'),ovBody(p),window.__ovOpen===p.id)}
      ${acc('supplier','Supplier & feed','Source & sync',kvRows([
        ['Supplier',esc(p.supplier||'—')],['Source',esc(p.supplier||'—')+(c._src?' · '+esc(c._src):'')],['Feed','API · auto-sync'],
        ['Currency', c.currency?esc(c.currency):'GBP'],['Payment terms','30 days from invoice'],['Last synced','Today 09:00']
      ]))}
      ${acc('identity','Identity & codes','Name, codes, brand',kvRows([
        ['Name',esc(p.name)],['Model / range',esc(p.model||c.code||'—')],['SKU / item code',esc((p.model||p.id).toUpperCase())],
        ['Variants', c.variantCount?c.variantCount+' variant'+(c.variantCount===1?'':'s'):'1'],
        ['Brand', p.brand?esc(p.brand):muted()],['EAN / barcode', p.ean?esc(p.ean):muted()],['HS / commodity code', p.hsCode?esc(p.hsCode):muted()]
      ]),true)}
      ${acc('desc','Description','Marketing copy',`<p class="dv-desc">${esc(c.desc||p.blurb||'No description in feed.')}</p>`+kvRows([
        ['Gender', p.gender?esc(p.gender):muted()],['Clearance', c.clearance?'<b style="color:#b02a4f">Yes — clearance</b>':'No']
      ]))}
      ${acc('cat','Categorisation','Department & sub-category',kvRows([
        ['Department',esc(p.dept)],['Sub-category',esc(p.subcat||p.cat||'—')],['Category code', c.groupDesc?esc(c.groupDesc):muted()]
      ]))}
      ${acc('colour','Colour & sizes',p.colours.length+' colour'+(p.colours.length===1?'':'s'),kvRows([
        ['Colours',p.colours.map(sw).join(' ')],['Sizes',p.sizes.join(', ')]
      ]))}
      ${acc('material','Material & physical','Spec & dimensions',kvRows([
        ['Material', p.material?esc(p.material):muted()],
        ['Dimensions', p.dimensions?esc(p.dimensions):((p.dims&&p.dims.w!=='—')?`${p.dims.w} × ${p.dims.h}${p.dims.d&&p.dims.d!=='—'?' × '+p.dims.d:''}`:muted())],
        ['Net weight', wt?(wt>=1000?(wt/1000).toFixed(2)+' kg':wt+' g'):muted()]
      ]))}
      ${acc('media','Media','Image gallery'+(imgs.length?' · '+imgs.length:''),mediaBody)}
      ${acc('price','Price matrix','Cost → sell by quantity',matrix)}
      ${acc('sample','Sample cost','Cost → markup → sell · pulls to project',sampleCostBody(p))}
      ${acc('deco','Decoration & branding',(deco.length||p.printMethods.length||0)+' method'+((deco.length||p.printMethods.length)===1?'':'s'),decoBody)}
      ${acc('stock','Stock & availability','Live from supplier feed',stockBody)}
      ${acc('pack','Logistics & delivery','Carton & origin for delivery',kvRows([
        ['Carton quantity', (c.carton||p.carton)?(c.carton||p.carton)+' units':muted()],
        ['Net weight', wt?(wt>=1000?(wt/1000).toFixed(2)+' kg':wt+' g'):muted()],
        ['Dimensions', p.dimensions?esc(p.dimensions):muted()],
        ['Country of origin', p.origin?esc(p.origin):muted()],
        ['Lead time', p.lead+' working days'],['MOQ', p.moq+' units']
      ]))}
      ${acc('sus','Sustainability & compliance','Eco score & certifications',kvRows([
        ['Sustainability score',`<b style="color:var(--green-deep)">${p.sustainability}/10</b>`],
        ['Material', p.material?esc(p.material):muted()],
        ['Certifications', (p.certifications&&p.certifications.length)?p.certifications.map(x=>esc(x)).join(' · '):(p.sustainability>=9?'GRS · FSC · OEKO-TEX':(p.sustainability>=7?'GRS · recycled content':'Recycled content'))],
        ['Recyclable', p.sustainability>=7?'Yes':'Partial'],
        ['Carbon data',muted()],
        ['Compliance / GPSR',muted()]
      ]))}
      ${extrasAcc}
      ${customAttrAcc(p)}
    </div></div>
    ${window.MSNOTES?`<div class="dv-notes"><div class="dv-nhd"><svg class="icn"><use href="#s-chat"/></svg><b>Notes, comments &amp; history</b></div><div id="dvNotes">${MSNOTES.panelHTML(p.id)}</div></div>`:''}`;
  }
  function wireAccordions(p){
    if(window.MSNOTES) MSNOTES.wire(document.getElementById('dvNotes'),p.id);
    const tog=document.querySelector('.dv-panel [data-dvtoggle]'); if(tog) tog.onclick=()=>tog.closest('.dv-panel').classList.toggle('collapsed');
    if(MSDEF&&p){
      const redraw=()=>{ const old=document.querySelector('.dv-range'); if(old) old.outerHTML=recommendBar(p); wireAccordions(p); };
      document.querySelectorAll('[data-recadd]').forEach(b=>b.onclick=()=>{
        MSCAT.setCurated(p.id,{tier:b.dataset.recadd});
        if(window.MSNOTES) MSNOTES.log(p.id,'range','proposed it as '+(b.dataset.recadd==='featured'?'Featured':'Recommended'));
        redraw(); });
      const ts=document.querySelector('[data-rectier]');
      if(ts) ts.onchange=()=>{ MSCAT.setCurated(p.id,{tier:ts.value});
        if(window.MSNOTES) MSNOTES.log(p.id,'range','moved it to '+(ts.value==='featured'?'Featured':'Recommended'));
        redraw(); };
      const rm=document.querySelector('[data-recrm]');
      if(rm) rm.onclick=()=>{ if(!confirm('Remove “'+p.name+'” from the Recommended range?\n\nDistributors on the Recommended range will lose it from their stores and be notified.')) return;
        MSCAT.removeCurated(p.id); redraw(); };
    }
    const rt=document.querySelector('[data-rangetog]');
    if(rt) rt.onclick=()=>{ const id=rt.dataset.rangetog, was=MSCAT.distInRange(id);
      MSCAT.distToggle(id);
      const box=rt.closest('.dv-range');
      box.classList.toggle('in',!was);
      rt.classList.toggle('on',!was);
      rt.textContent=was?'＋ Add to your range':'✓ In your range';
      box.querySelector('.dv-rtx b').textContent=was?'Not in your range':'In your range';
      box.querySelector('.dv-rtx span').textContent=was?'This product is not in your store yet.':'This product is live in your store.';
    };
    document.querySelectorAll('.dv-acc .dv-h').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
    if(p) wireOverrides(p);
    // price-matrix tabs + cost/sell toggle
    document.querySelectorAll('.mx-wrap').forEach(w=>{
      w.querySelectorAll('[data-mxtab]').forEach(t=>t.onclick=()=>{ w.querySelectorAll('[data-mxtab]').forEach(x=>x.classList.toggle('on',x===t)); w.querySelectorAll('[data-mxpane]').forEach(pn=>pn.hidden=pn.dataset.mxpane!==t.dataset.mxtab); });
      const mode=w.querySelector('[data-mxmode]');
      if(mode) mode.onclick=()=>{ const next=mode.dataset.mxmode==='cost'?'sell':'cost'; mode.dataset.mxmode=next; mode.classList.toggle('on',next==='sell');
        w.querySelector('[data-mxmodelbl]').textContent=next==='sell'?'Show costs':'Show sell prices';
        w.querySelector('[data-mxlegend]').innerHTML=next==='sell'?'Showing customer <b>sell</b> per unit (cost × markup)':'Showing supplier <b>cost</b> per unit';
        const fn=window.__mxTable&&window.__mxTable[w.dataset.mxpid]; if(fn) w.querySelector('[data-mxtable]').innerHTML=fn(next); };
    });
    if(p) wireSampleCost(p);
  }

  route();
})();
