/* create-project.js — Merchsmith Create Project wizard.
   Collects the brief over animated steps, writes to localStorage('ms-project-brief')
   (+ 'ms-project-title') in the SAME shape project-brief.js reads, then hands off
   to the store to source products. Autosaves a draft ('ms-project-draft'). */
(function(){
  const PROJECT='autumn';
  const DRAFT_KEY='ms-project-draft';
  const STEPS=['Project','Budget','Brand','Products','Launch'];
  const CUSTOMER='Citrix', DISTRIBUTOR='mojo';

  const COUNTRIES=['United Kingdom','Ireland (ROI)','France'];
  const CAT_DEPT={Pens:'writing',Bags:'bags',Drinkware:'drinkware',Apparel:'clothing',Notebooks:'notebooks',Tech:'tech',Eco:'lifestyle',Events:'exhibition'};
  const PRODUCT_COLOURS=['Black','White','Grey','Navy','Blue','Teal','Green','Red','Orange','Yellow','Pink','Purple','Brown','Natural'];
  const PCHEX={Black:'#1a1a1e',White:'#f4f4f0',Grey:'#8a8a93',Navy:'#2a3550',Blue:'#2f5ca8',Teal:'#2f8f8a',Green:'#3a9d6b',Red:'#c0392b',Orange:'#e08a2b',Yellow:'#e7c14b',Pink:'#e2a9ac',Purple:'#7a5aa6',Brown:'#7a5a44',Natural:'#d8c8a8'};
  const BRAND_COLOURS=[
    {name:'Black',hex:'#1A1A1E',pantone:'Black 6 C'},{name:'Sea Blue',hex:'#2F5CA8',pantone:'2727 C'},{name:'Summer Green',hex:'#6FC5A6',pantone:'344 C'},
    {name:'White',hex:'#FFFFFF',pantone:'11-0601'},{name:'Relaxed Pink',hex:'#E2A9AC',pantone:'2346 C'}
  ];
  const BC=Object.fromEntries(BRAND_COLOURS.map(c=>[c.name,c]));
  const pant=name=>BC[name]&&BC[name].pantone?BC[name].pantone:'';
  const LOGOS=[
    {id:'l-black',name:'Black on white',fg:'#1A1A1E',bg:'#FFFFFF',meta:'EPS · SVG · PNG'},
    {id:'l-white',name:'White on black',fg:'#FFFFFF',bg:'#1A1A1E',meta:'EPS · SVG · PNG'},
    {id:'l-blue',name:'White on blue',fg:'#FFFFFF',bg:'#2F5CA8',meta:'EPS · PNG'}
  ];
  const LOGO=Object.fromEntries(LOGOS.map(l=>[l.id,l]));
  const CATEGORIES=['Pens','Bags','Drinkware','Apparel','Notebooks','Tech','Eco','Events'];
  // who's filling this in — sample editability differs for the customer vs the distributor
  const ROLE=(window.MSID&&MSID.current&&MSID.current())||'customer';
  const isDist=ROLE==='distributor';
  // product artwork (mirrors Brand Assets > Product Artwork; read live when present)
  const ART_SEED=[
    {id:'aw-1',name:'Citrix logo — white',img:'brand-aw-1',fmts:['.eps','.pdf'],general:['Tech'],specific:['Eco Wheat-Straw Charging Cable']},
    {id:'aw-2',name:'Anniversary lockup',img:'brand-aw-2',fmts:['.ai','.pdf'],general:['Bags'],specific:['Recycled Cotton Tote']},
    {id:'aw-3',name:'Event wordmark',img:'brand-aw-3',fmts:['.svg','.png'],general:['Bags','Apparel','Notebooks'],specific:[]}
  ];
  function brandArtwork(){ try{ const o=JSON.parse(localStorage.getItem('ms-brand-assets')||'{}'); if(o.artwork&&Array.isArray(o.artwork)&&o.artwork.length) return o.artwork; }catch(e){} return ART_SEED; }
  function artworkForItem(it){ const t=(it.type||'').toLowerCase(); return brandArtwork().filter(a=>(a.general||[]).includes(it.cat)||(a.specific||[]).some(s=>s.toLowerCase()===t)); }

  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  const gbp2=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const $=s=>document.querySelector(s);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function ord(d){ if(d>3&&d<21)return'th'; switch(d%10){case 1:return'st';case 2:return'nd';case 3:return'rd';default:return'th';} }
  function fmtDate(iso){ if(!iso) return '—'; const dt=new Date(iso+'T00:00'); const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${days[dt.getDay()]} ${dt.getDate()}${ord(dt.getDate())} ${mon[dt.getMonth()]}`; }
  // recoloured customer wordmark — a real-looking logo in the chosen colourway
  function logoThumb(l, h){ h=h||34; return `<span class="lgthumb" style="background:${l.bg};color:${l.fg}"><span class="lgwm">${CUSTOMER.toLowerCase()}</span></span>`; }

  // ---- mutable state ----
  const S={
    pcol:new Set(),
    bmode:'spot', bcol:new Set(),
    logos:new Set(['l-black','l-white']),
    sampReq:true, sampType:'unbranded',
    country:null, mode:null,
    openItems:new Set(),
    items:[]
  };
  let step=0, launched=false;

  /* ---------- draft ---------- */
  function serialize(){ return { v:1, step, name:$('#fName').value, use:$('#fUse').value, desc:$('#fDesc').value,
    budget:$('#fBudget').value, qty:$('#fQty').value, date:$('#fDate').value, pos:$('#fPos').value, bnotes:($('#fBNotes')||{}).value||'',
    mode:S.mode, country:S.country, bmode:S.bmode, sampReq:S.sampReq, sampType:S.sampType,
    pcol:[...S.pcol], bcol:[...S.bcol], logos:[...S.logos], items:S.items }; }
  let draftT; function saveDraft(){ clearTimeout(draftT); draftT=setTimeout(()=>{ try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(serialize())); }catch(e){} const n=$('#cpDraft'); if(n){ n.textContent='Draft saved'; n.classList.add('show'); clearTimeout(saveDraft._b); saveDraft._b=setTimeout(()=>n.classList.remove('show'),1400);} },350); }
  // leaving via the left menu: confirm, save the draft, then go
  window.__cpSaveNow=()=>{ if(launched) return; try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(serialize())); }catch(e){} };
  document.addEventListener('click',e=>{ const a=e.target.closest&&e.target.closest('a[href]'); if(!a||launched||a.closest('.cp')||a.closest('.cp-leave')) return; const href=a.getAttribute('href'); if(!href||href==='#'||href.startsWith('#')||a.target==='_blank') return;
    e.preventDefault(); e.stopPropagation(); const nm=($('#fName')&&$('#fName').value.trim())||'your project';
    const w=document.createElement('div'); w.className='cp-leave'; w.innerHTML=`<div class="cp-lv" role="dialog" aria-modal="true" aria-labelledby="cpLvT"><span class="cp-lvi"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></svg></span><h3 id="cpLvT">Leave project setup?</h3><p>We’ll save <b>${String(nm).replace(/</g,'&lt;')}</b> as a draft in Your Projects, so you can pick it up where you left off.</p><div class="cp-lvf"><button type="button" class="cp-lvb" data-lvx>Cancel</button><button type="button" class="cp-lvb pri" data-lvok>Save draft &amp; continue</button></div></div>`;
    document.body.appendChild(w); requestAnimationFrame(()=>w.classList.add('on')); const close=()=>{ w.classList.remove('on'); setTimeout(()=>w.remove(),180); };
    w.querySelector('[data-lvx]').onclick=close; w.addEventListener('mousedown',ev=>{ if(ev.target===w) close(); }); const k=ev=>{ if(ev.key==='Escape'){ close(); document.removeEventListener('keydown',k); } }; document.addEventListener('keydown',k);
    w.querySelector('[data-lvok]').onclick=()=>{ window.__cpSaveNow(); location.href=href; }; w.querySelector('[data-lvok]').focus(); },true);
  function clearDraft(){ launched=true; try{ localStorage.setItem(DRAFT_KEY,''); }catch(e){} }
  function loadDraft(){ try{ const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); return (d&&d.v)?d:null; }catch(e){ return null; } }
  function applyDraft(d){
    $('#fName').value=d.name||''; $('#fUse').value=d.use||''; $('#fDesc').value=d.desc||'';
    if(d.budget!=null)$('#fBudget').value=d.budget; if(d.qty!=null)$('#fQty').value=d.qty;
    if(d.date)$('#fDate').value=d.date; if(d.pos!=null)$('#fPos').value=d.pos; if(d.bnotes!=null&&$('#fBNotes'))$('#fBNotes').value=d.bnotes;
    S.mode=d.mode||null; S.country=d.country==null?null:d.country; S.bmode=d.bmode||'spot';
    S.sampReq=d.sampReq!==false; S.sampType=d.sampType||'unbranded';
    if(d.pcol)S.pcol=new Set(d.pcol); if(d.bcol)S.bcol=new Set(d.bcol); if(d.logos)S.logos=new Set(d.logos);
    if(Array.isArray(d.items)&&d.items.length)S.items=d.items;
    step=Math.min(d.step||0, STEPS.length-1);
  }

  /* ---------- stepper ---------- */
  function renderSteps(){
    $('#cpSteps').innerHTML=STEPS.map((s,i)=>{
      const cls=i<step?'done':(i===step?'active':'');
      const line=i<STEPS.length-1?`<span class="cp-line"></span>`:'';
      return `<div class="cp-step ${cls}" data-goto="${i}" role="button" tabindex="0"><span class="cp-dot">${i+1}</span><span class="cp-slabel">${s}</span></div>${line}`;
    }).join('');
    $('#cpSteps').querySelectorAll('[data-goto]').forEach(d=>{ d.onclick=()=>{ const n=+d.dataset.goto; if(n!==step) showStep(n); }; });
  }

  /* ---------- shared controls ---------- */
  function chipRow(host, list, sel, attr){
    host.innerHTML=list.map(c=>{const name=c.name||c;const hex=c.hex||PCHEX[name]||'#bbb';const on=sel.has(name);const pt=c.pantone?`<small class="chip-pant">${c.pantone}</small>`:'';return `<button type="button" class="chip ${on?'on':''}" data-${attr}="${name}"><i style="background:${hex};${String(hex).toUpperCase()==='#FFFFFF'?'box-shadow:inset 0 0 0 1px var(--hair)':''}"></i><span class="chip-nm">${name}${pt}</span></button>`;}).join('');
    host.querySelectorAll('[data-'+attr+']').forEach(b=>b.onclick=()=>{ const v=b.dataset[attr]; if(sel.has(v)) sel.delete(v); else sel.add(v); b.classList.toggle('on',sel.has(v)); saveDraft(); });
  }
  // brand colours block — reflects the current mode (spot=pick swatches, mono=single black, full/none=info)
  function renderBcol(){
    const host=$('#fBcol'); if(!host) return;
    if(S.bmode==='mono'){
      host.innerHTML=`<div class="mono-row"><span class="mono-sw"></span><div class="mono-meta"><b>Mono — one colour</b><small>Single-colour application, no ink colour added</small></div></div>
        <p class="fld-note">Choose <b>Mono</b> for laser-engraved or embossed products, where no colour is added to the branding.</p>`;
    } else if(S.bmode==='full'){
      host.innerHTML=`<p class="fld-note">Full-colour (CMYK / digital) print — artwork reproduced in full colour, no spot-colour selection needed.</p>`;
    } else if(S.bmode==='none'){
      host.innerHTML=`<p class="fld-note">Unbranded — products supplied plain, with no decoration.</p>`;
    } else {
      chipRow(host, BRAND_COLOURS, S.bcol, 'bcol');
    }
  }
  function logoCards(){
    const host=$('#fLogos');
    const none=S.logos.size===0;
    host.innerHTML=LOGOS.map(l=>{const on=S.logos.has(l.id);return `<button type="button" class="logo ${on?'on':''}" data-logo="${l.id}">${logoThumb(l,56)}<span class="logo-meta"><b>${l.name}</b><small>${l.meta}</small></span>${on?'<span class="logo-tick"><svg class="icn" style="width:14px;height:14px;stroke-width:2.6"><path d="M4 12.5 9.5 18 20 6.5"/></svg></span>':''}</button>`;}).join('')
      +`<button type="button" class="logo logo-none ${none?'on':''}" data-logo="__none"><span class="logo-nonethumb"><svg class="icn" style="width:22px;height:22px"><circle cx="12" cy="12" r="9"/><path d="M6 18 18 6"/></svg></span><span class="logo-meta"><b>No logo yet</b><small>Product-specific artwork chosen later</small></span>${none?'<span class="logo-tick"><svg class="icn" style="width:14px;height:14px;stroke-width:2.6"><path d="M4 12.5 9.5 18 20 6.5"/></svg></span>':''}</button>`;
    host.querySelectorAll('[data-logo]').forEach(b=>b.onclick=()=>{ const id=b.dataset.logo; if(id==='__none'){ S.logos.clear(); } else { if(S.logos.has(id)){ S.logos.delete(id);} else S.logos.add(id); } logoCards(); saveDraft(); });
  }
  function seg(id, cb){
    const el=$('#'+id); el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); cb(b.dataset.v); saveDraft(); });
  }

  function sampleLabel(){ return S.sampReq?(S.sampType==='branded'?'Branded sample':'Unbranded sample'):'Not required'; }
  function renderSample(){
    const who=$('#fSampWho'), ctl=$('#fSampCtl'), read=$('#fSampRead');
    if(!ctl||!read) return;
    if(isDist){ who.textContent='set by you'; ctl.hidden=false; ctl.style.display='flex'; read.hidden=true; }
    else {
      who.textContent='set by your Account Manager';
      ctl.hidden=true; ctl.style.display='none'; read.hidden=false;
      read.innerHTML=`<div class="samp-read"><svg class="icn" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><b>${sampleLabel()}</b><span>Your distributor confirms sampling during sourcing</span></div>`;
    }
  }

  /* ---------- requested items + per-product customise ---------- */
  function brandModeLabel(mode, cols){ return mode==='full'?'Full colour':mode==='none'?'Unbranded':mode==='mono'?'Mono':`${(cols||[]).length} spot`; }
  function customHTML(it){
    const ov=it.over||{};
    const pcolOn=c=> ov.colour===c;
    const pcolInh=c=> ov.colour==null && S.pcol.has(c);
    const pcol=`<div class="ic-chips">${PRODUCT_COLOURS.map(c=>`<button type="button" class="chip xs ${pcolOn(c)?'on':''} ${pcolInh(c)?'inh':''}" data-ovpcol="${it.id}:${c}"><i style="background:${PCHEX[c]};${String(PCHEX[c]).toUpperCase()==='#F4F4F0'?'box-shadow:inset 0 0 0 1px var(--hair)':''}"></i>${c}</button>`).join('')}</div>`;
    const bmode=ov.brandMode||S.bmode; const bcols=ov.brandColours||[...S.bcol]; const bOv=ov.brandMode!=null||ov.brandColours!=null;
    const bseg=`<div class="seg sm" data-ovbmode="${it.id}">${['spot','mono','full','none'].map(m=>`<button data-v="${m}" class="${bmode===m?'on':''}">${m==='spot'?'Spot':m==='mono'?'Mono':m==='full'?'Full':'None'}</button>`).join('')}</div>`;
    const bchips=`<div class="ic-chips ${(bmode==='spot'||bmode==='mono')?'':'dim'}">${BRAND_COLOURS.map(c=>{const on=bcols.includes(c.name);const inh=!bOv&&S.bcol.has(c.name);return `<button type="button" class="chip xs ${on&&bOv?'on':''} ${inh?'inh':''}" data-ovbcol="${it.id}:${c.name}"><i style="background:${c.hex};${String(c.hex).toUpperCase()==='#FFFFFF'?'box-shadow:inset 0 0 0 1px var(--hair)':''}"></i><span class="chip-nm">${c.name}${c.pantone?`<small class="chip-pant">${c.pantone}</small>`:''}</span></button>`;}).join('')}</div>`;
    const ovLogos=ov.logos||null;
    const logos=`<div class="ic-logos">${LOGOS.map(l=>{const on=ovLogos?ovLogos.includes(l.id):false;const inh=!ovLogos&&S.logos.has(l.id);return `<button type="button" class="lgpick ${on?'on':''} ${inh?'inh':''}" data-ovlogo="${it.id}:${l.id}" title="${l.name}">${logoThumb(l,46)}</button>`;}).join('')}</div>`;
    const sampEff=(function(){ const s=ov.sample; if(s)return s.required?(s.type==='branded'?'Branded sample':'Unbranded sample'):'Not required'; return sampleLabel(); })();
    const samp = isDist
      ? `<div class="seg sm" data-ovsample="${it.id}">${[['','Default'],['branded','Branded'],['unbranded','Unbranded'],['none','No sample']].map(([v,lab])=>{const on=(v===''&&!ov.sample)||(v==='branded'&&ov.sample&&ov.sample.required&&ov.sample.type==='branded')||(v==='unbranded'&&ov.sample&&ov.sample.required&&ov.sample.type==='unbranded')||(v==='none'&&ov.sample&&!ov.sample.required);return `<button data-v="${v}" class="${on?'on':''}">${lab}</button>`;}).join('')}</div>`
      : `<div class="samp-read sm"><b>${sampEff}</b><span>Set by your Account Manager</span></div>`;
    const arts=artworkForItem(it), selArt=it.artwork||[];
    const artwork = arts.length
      ? `<div class="ic-art">${arts.map(a=>{const on=selArt.includes(a.id);const thumb=a._src?`<img src="${a._src}" alt="">`:`<image-slot id="ba-${esc(a.img)}" shape="rounded" fit="contain" placeholder="Art"></image-slot>`;return `<button type="button" class="artcard ${on?'on':''}" data-ovart="${it.id}:${a.id}"><span class="artthumb">${thumb}</span><span class="artmeta"><b>${esc(a.name)}</b><small>${(a.fmts||[]).join(' · ')}</small></span>${on?'<span class="art-tick"><svg class="icn" style="width:12px;height:12px;stroke-width:2.8"><path d="M4 12.5 9.5 18 20 6.5"/></svg></span>':''}</button>`;}).join('')}</div>`
      : `<div class="ic-def">No artwork tagged for <b>${esc(it.cat)}</b> yet — add it in Brand Assets &amp; tag this category.</div>`;
    return `<div class="itemcustom" id="ic-${it.id}" ${S.openItems.has(it.id)?'':'hidden'}>
      <div class="ic-grid">
        <div class="ic-f"><label>Product colour</label>${pcol}<span class="ic-def">${ov.colour?'Overridden':'Inheriting project colours'}</span></div>
        <div class="ic-f"><label>Delivery date</label><input type="date" class="ic-in" data-ovdate="${it.id}" value="${ov.deliveryISO||''}"><span class="ic-def">${ov.deliveryISO?'Overridden':'Default · '+fmtDate($('#fDate')?$('#fDate').value:'')}</span></div>
        <div class="ic-f"><label>Ships to</label><select class="ic-in" data-ovcountry="${it.id}"><option value="">Default · ${S.country==null?'not set':COUNTRIES[S.country]}</option>${COUNTRIES.map((c,i)=>`<option value="${i}" ${ov.country===i?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="ic-f"><label>Sample</label>${samp}</div>
      </div>
      <div class="ic-f"><label>Branding</label>${bseg}${bchips}</div>
      <div class="ic-f"><label>Logotypes</label>${logos}<span class="ic-def">${ovLogos?'Overridden':'Inheriting project logos'}</span></div>
      <div class="ic-f"><label>Product artwork <span class="ic-deflbl">from Brand Assets</span></label>${artwork}</div>
      <div class="ic-f"><label>Branding positions</label><input type="text" class="ic-in wide" data-ovpos="${it.id}" value="${esc(ov.positions||'')}" placeholder="Default · ${esc($('#fPos')?$('#fPos').value:'')}"></div>
      <div class="ic-f"><label>Notes for this product</label><textarea class="ic-in wide" rows="2" data-ovnotes="${it.id}" placeholder="Finish, packaging, special requests…">${esc(it.notes||'')}</textarea></div>
      ${(it.over&&Object.keys(it.over).length)||it.notes?`<button type="button" class="ic-reset" data-ovreset="${it.id}">Reset to project defaults</button>`:''}
    </div>`;
  }
  function ovSummary(it){
    const ov=it.over||{}, tags=[];
    if(ov.colour)tags.push(ov.colour);
    if(ov.brandMode!=null||ov.brandColours!=null)tags.push(brandModeLabel(ov.brandMode||S.bmode,ov.brandColours||[...S.bcol]));
    if(ov.logos)tags.push(ov.logos.length+' logo'+(ov.logos.length===1?'':'s'));
    if(ov.sample)tags.push(ov.sample.required?'Sample':'No sample');
    if(ov.deliveryISO)tags.push(fmtDate(ov.deliveryISO));
    if(ov.country!=null)tags.push(COUNTRIES[ov.country]);
    if(ov.positions)tags.push('Positions');
    if(it.artwork&&it.artwork.length)tags.push(it.artwork.length+' artwork');
    if(it.notes)tags.push('Note');
    return tags.length?`<span class="ic-tags">${tags.map(t=>`<span class="ic-tag">${esc(t)}</span>`).join('')}</span>`:'<span class="ic-inherit">Inherits project defaults</span>';
  }
  function getItem(id){ return S.items.find(x=>x.id===id); }
  function renderItems(){
    const host=$('#fItems');
    host.innerHTML=S.items.map(it=>`<div class="itemwrap" data-id="${it.id}">
      <div class="item">
        ${it.prod?`<div class="iprod"><span class="iprod-th" style="background-image:url('assets/products/${esc(it.prod.img)}.png')"></span><span class="iprod-t"><b>${esc(it.prod.name)}</b><small>${esc(it.prod.ref)} · ${esc(it.prod.supplier)}</small></span><button type="button" class="iprod-x" data-unpick title="Change product">Change</button></div>`:`<input class="iin iname" data-k="type" value="${esc(it.type)}" placeholder="Product type, e.g. Recycled tote">`}
        <input class="iin" data-k="qty" type="number" min="1" step="25" value="${it.qty}">
        <div class="unitwrap"><span>£</span><input data-k="unit" type="number" min="0" step="0.05" value="${(+it.unit).toFixed(2)}"><span>/u</span></div>
        <button class="icust ${S.openItems.has(it.id)?'on':''}" title="Product settings" aria-label="Product settings"><svg class="icn" viewBox="0 0 24 24" style="width:17px;height:17px"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        <button class="idel" title="Remove">×</button>
      </div>
      <div class="itemstatus">${ovSummary(it)}</div>
      ${customHTML(it)}
    </div>`).join('');
    host.querySelectorAll('.itemwrap').forEach(row=>{
      const it=getItem(row.dataset.id);
      row.querySelectorAll('.item [data-k]').forEach(inp=>inp.oninput=()=>{ const k=inp.dataset.k; it[k]=(k==='qty'||k==='unit')?(+inp.value||0):inp.value; runbar(); saveDraft(); });
      row.querySelector('.icust').onclick=()=>{ if(S.openItems.has(it.id))S.openItems.delete(it.id); else S.openItems.add(it.id); renderItems(); };
      const un=row.querySelector('[data-unpick]'); if(un) un.onclick=()=>{ it.type=it.prod?it.prod.name:''; delete it.prod; renderItems(); saveDraft(); };
      row.querySelector('.idel').onclick=()=>{ S.items=S.items.filter(x=>x.id!==it.id); S.openItems.delete(it.id); renderItems(); runbar(); saveDraft(); };
      wireCustom(row, it);
    });
    runbar();
  }
  function wireCustom(row, it){
    const re=()=>{ renderItems(); saveDraft(); };
    row.querySelectorAll('[data-ovpcol]').forEach(b=>b.onclick=()=>{ const c=b.dataset.ovpcol.split(':')[1]; it.over=it.over||{}; if(it.over.colour===c)delete it.over.colour; else it.over.colour=c; re(); });
    row.querySelectorAll('[data-ovbmode] button').forEach(b=>b.onclick=()=>{ const v=b.dataset.v; it.over=it.over||{}; it.over.brandMode=v; if(v==='full'||v==='none')delete it.over.brandColours; else if(it.over.brandColours==null)it.over.brandColours=[...S.bcol]; re(); });
    row.querySelectorAll('[data-ovbcol]').forEach(b=>b.onclick=()=>{ const name=b.dataset.ovbcol.split(':')[1]; it.over=it.over||{}; if(it.over.brandColours==null)it.over.brandColours=[...S.bcol]; if(it.over.brandMode==null)it.over.brandMode='spot'; const i=it.over.brandColours.indexOf(name); if(i>=0)it.over.brandColours.splice(i,1); else it.over.brandColours.push(name); if(it.over.brandMode!=='spot'&&it.over.brandMode!=='mono')it.over.brandMode='spot'; re(); });
    row.querySelectorAll('[data-ovlogo]').forEach(b=>b.onclick=()=>{ const id=b.dataset.ovlogo.split(':')[1]; it.over=it.over||{}; if(it.over.logos==null)it.over.logos=[...S.logos]; const i=it.over.logos.indexOf(id); if(i>=0)it.over.logos.splice(i,1); else it.over.logos.push(id); if(!it.over.logos.length)delete it.over.logos; re(); });
    row.querySelectorAll('[data-ovsample] button').forEach(b=>b.onclick=()=>{ const v=b.dataset.v; it.over=it.over||{}; if(v==='')delete it.over.sample; else if(v==='none')it.over.sample={required:false}; else it.over.sample={required:true,type:v}; re(); });
    row.querySelectorAll('[data-ovart]').forEach(b=>b.onclick=()=>{ const aid=b.dataset.ovart.split(':')[1]; it.artwork=it.artwork||[]; const i=it.artwork.indexOf(aid); if(i>=0)it.artwork.splice(i,1); else it.artwork.push(aid); if(!it.artwork.length)delete it.artwork; re(); });
    const dt=row.querySelector('[data-ovdate]'); if(dt)dt.onchange=()=>{ it.over=it.over||{}; if(dt.value)it.over.deliveryISO=dt.value; else delete it.over.deliveryISO; re(); };
    const co=row.querySelector('[data-ovcountry]'); if(co)co.onchange=()=>{ it.over=it.over||{}; if(co.value==='')delete it.over.country; else it.over.country=+co.value; re(); };
    const ps=row.querySelector('[data-ovpos]'); if(ps)ps.oninput=()=>{ it.over=it.over||{}; if(ps.value.trim())it.over.positions=ps.value; else delete it.over.positions; saveDraft(); const st=row.querySelector('.itemstatus'); if(st)st.innerHTML=ovSummary(it); };
    const nt=row.querySelector('[data-ovnotes]'); if(nt)nt.oninput=()=>{ if(nt.value.trim())it.notes=nt.value; else delete it.notes; saveDraft(); const st=row.querySelector('.itemstatus'); if(st)st.innerHTML=ovSummary(it); };
    const rs=row.querySelector('[data-ovreset]'); if(rs)rs.onclick=()=>{ delete it.over; delete it.notes; re(); };
  }
  function runbar(){
    const total=S.items.reduce((s,it)=>s+(+it.qty||0)*(+it.unit||0),0);
    const budget=+$('#fBudget').value||0;
    const over=total>budget;
    $('#fRunL').innerHTML=`<b>${gbp(total)}</b> across ${S.items.length} item${S.items.length===1?'':'s'}`;
    $('#fRunR').innerHTML=over?`<span class="over-txt">${gbp(total-budget)} over ${gbp(budget)}</span>`:`${gbp(Math.max(0,budget-total))} left of ${gbp(budget)}`;
    $('#fRunFill').style.width=(budget?Math.min(100,total/budget*100):0)+'%';
    $('#fRunbar').classList.toggle('over',over);
  }

  /* ---------- navigation ---------- */
  function showStep(n){
    const panels=[...document.querySelectorAll('.cp-panel')];
    const next=panels[n];
    step=n; renderSteps();
    panels.forEach(p=>{ if(p!==next){ p.hidden=true; p.classList.remove('in'); } });
    next.hidden=false;
    const back=n<(showStep._prev==null?n:showStep._prev); showStep._prev=n; next.classList.remove('in','shown','back'); void next.offsetWidth; next.classList.add('in'); if(back) next.classList.add('back');
    (function(){ let pr=document.getElementById('cpProg'); const st=document.getElementById('cpSteps'); if(!pr&&st){ pr=document.createElement('div'); pr.id='cpProg'; pr.className='cp-prog'; pr.innerHTML='<i></i>'; st.after(pr); } if(pr) requestAnimationFrame(()=>{ pr.firstChild.style.width=(n/(STEPS.length-1)*100)+'%'; }); })();
    if(n===STEPS.length-1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){ const cf=document.createElement('div'); cf.className='cp-confetti'; const col=['#ec018c','#ff5cb3','#12b76a','#f5b041','#0a84c6']; for(let k=0;k<36;k++){ const i=document.createElement('i'); i.style.left=(Math.random()*100)+'vw'; i.style.background=col[k%col.length]; i.style.setProperty('--dx',(Math.random()*120-60)+'px'); i.style.setProperty('--r',(Math.random()*720-360)+'deg'); i.style.animationDelay=(Math.random()*.4)+'s'; cf.appendChild(i); } document.body.appendChild(cf); setTimeout(()=>cf.remove(),2300); }
    clearTimeout(showStep._t); showStep._t=setTimeout(()=>next.classList.add('shown'), 1150);
    $('#cpScroll').scrollTop=0;
    $('#btnBack').style.visibility = n===0 ? 'hidden' : 'visible';
    $('#cpFoot').style.display = n===STEPS.length-1 ? 'none' : 'flex';
    const last = n===STEPS.length-2;
    $('#btnNext').innerHTML = (last?'Review project':'Continue')+'<svg class="icn" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    if(n===STEPS.length-1) buildReview();
    hint(); saveDraft();
  }
  function hint(){
    let h='';
    if(step===0 && !$('#fName').value.trim()) h='Give your project a name to continue';
    $('#cpHint').textContent=h;
    $('#btnNext').disabled = (step===0 && !$('#fName').value.trim());
  }
  function next(){ if(step<STEPS.length-1) showStep(step+1); }
  function back(){ if(step>0) showStep(step-1); }

  /* ---------- review + persist ---------- */
  function brandLabel(){ return S.bmode==='full'?'Full colour':S.bmode==='none'?'Unbranded':S.bmode==='mono'?'Mono — one colour':`${S.bcol.size} spot colour${S.bcol.size===1?'':'s'}`; }
  function buildReview(){
    const name=$('#fName').value.trim()||'Untitled project';
    $('#revTitle').textContent=`“${name}” is ready.`;
    $('#rvDesc').textContent=$('#fDesc').value.trim()||'No description added.';
    $('#rvUse').textContent=$('#fUse').value.trim()||'—';
    $('#rvBudget').textContent=$('#fBudget').value?gbp(+$('#fBudget').value):'Not set';
    $('#rvDate').textContent=fmtDate($('#fDate').value)+(S.mode==='nofail'?' · no-fail':' · approx');
    $('#rvCountry').textContent=COUNTRIES[S.country];
    $('#rvQty').textContent=(+$('#fQty').value||0).toLocaleString()+' / item';
    $('#rvPcol').innerHTML=S.pcol.size?`<span class="rev-chips">${[...S.pcol].map(c=>`<span class="rev-chip"><i style="background:${PCHEX[c]||'#bbb'}"></i>${esc(c)}</span>`).join('')}</span>`:'<span style="color:var(--muted)">Not set</span>';
    $('#rvBrand').textContent=brandLabel();
    $('#rvBcol').innerHTML=(S.bmode==='spot')?`<span class="rev-chips">${[...S.bcol].map(c=>`<span class="rev-chip"><i style="background:${(BC[c]||{}).hex||'#bbb'}"></i>${esc(c)}${pant(c)?` <small>${esc(pant(c))}</small>`:''}</span>`).join('')}</span>`
      :(S.bmode==='mono'?'<span class="rev-chips"><span class="rev-chip"><i style="background:#1a1a1e"></i>Mono</span></span>':'<span style="color:var(--muted);font-size:12px">n/a</span>');
    $('#rvPos').textContent=$('#fPos').value.trim()||'—';
    $('#rvLogos').innerHTML=S.logos.size?[...S.logos].map(id=>{const l=LOGO[id];return l?`<span class="rev-lg" style="background:${l.bg};color:${l.fg}">${CUSTOMER.toLowerCase()}</span>`:'';}).join(''):'<span style="color:var(--muted);font-size:12px">None — artwork chosen later</span>';
    $('#rvSample').textContent=sampleLabel()+(isDist?'':' · set by AM');
    // budget bar
    const total=S.items.reduce((s,it)=>s+(+it.qty||0)*(+it.unit||0),0), budget=+$('#fBudget').value||0, over=total>budget;
    $('#rvAlloc').innerHTML=`<b>${gbp(total)}</b> allocated · ${S.items.length} item${S.items.length===1?'':'s'}`;
    $('#rvAllocR').innerHTML=over?`<span class="over-txt">${gbp(total-budget)} over ${gbp(budget)}</span>`:`${gbp(Math.max(0,budget-total))} left of ${gbp(budget)}`;
    $('#rvAllocFill').style.width=(budget?Math.min(100,total/budget*100):0)+'%';
    $('#rvBudgetBar').classList.toggle('over',over);
    // items
    const customCount=S.items.filter(it=>(it.over&&Object.keys(it.over).length)||it.notes||(it.artwork&&it.artwork.length)).length;
    $('#rvItemsH').textContent=`Requested items · ${S.items.length}`+(customCount?` · ${customCount} customised`:'');
    $('#rvItems').innerHTML=S.items.map(it=>{
      const sum=ovSummary(it);
      return `<div class="rev-item"><div class="rev-item-top"><span class="rev-item-nm">${esc(it.type)||'<span style="color:var(--muted)">Unnamed</span>'} <span class="rev-item-cat">${it.cat}</span></span><b>${(+it.qty||0).toLocaleString()} × ${gbp2(it.unit)} = ${gbp((+it.qty||0)*(+it.unit||0))}</b></div><div class="rev-item-sub">${sum}</div></div>`;
    }).join('')||'<div class="rev-item"><span style="color:var(--muted)">No items added</span></div>';
  }

  function persist(){
    const name=$('#fName').value.trim()||'Untitled project';
    const data={
      campaign:{ description:$('#fDesc').value.trim(), merchUse:$('#fUse').value.trim(), budget:+$('#fBudget').value||0, attachments:[] },
      defaults:{ delivery:{iso:$('#fDate').value,mode:S.mode}, country:S.country,
        productColours:[...S.pcol], brandMode:S.bmode, brandColours:[...S.bcol], customColours:[],
        positions:$('#fPos').value.trim(), brandNotes:(($('#fBNotes')||{}).value||'').trim(), logos:[...S.logos],
        sample:{required:S.sampReq,type:S.sampType}, sustainabilityMin:6, expectedQty:+$('#fQty').value||1000 },
      items:S.items.map(it=>{ const o={id:it.id,type:it.type,cat:it.cat,qty:+it.qty||0,unit:+it.unit||0}; if(it.over&&Object.keys(it.over).length)o.over=it.over; if(it.notes)o.notes=it.notes; if(it.artwork&&it.artwork.length)o.artwork=it.artwork; return o; })
    };
    let all={}; try{ all=JSON.parse(localStorage.getItem('ms-project-brief')||'{}'); }catch(e){}
    all[PROJECT]=data;
    try{ localStorage.setItem('ms-project-brief', JSON.stringify(all)); localStorage.setItem('ms-project-title', name); }catch(e){}
    clearDraft();
  }

  /* ---------- header co-brand ---------- */
  function renderBrands(){
    const el=$('#cpBrands'); if(!el||!window.MSLOGOS)return;
    el.innerHTML=`<span class="cb-lbl">For</span>${MSLOGOS.svg(CUSTOMER,26)}<span class="cb-dot">·</span><span class="cb-lbl">by</span>${MSLOGOS.svg(DISTRIBUTOR,24)}`;
  }

  /* ---------- init ---------- */
  function init(){
    const qs=new URLSearchParams(location.search), fresh=qs.has('new'); const draft=fresh?null:loadDraft(); if(draft){ applyDraft(draft); } if(fresh){ step=0; try{ history.replaceState(null,'',location.pathname); }catch(e){} }
    renderSteps();
    chipRow($('#fPcol'), PRODUCT_COLOURS, S.pcol, 'pcol');
    chipRow($('#fBcol'), BRAND_COLOURS, S.bcol, 'bcol');
    logoCards();
    renderItems();
    // reflect restored segmented states
    const setSeg=(id,val)=>{ const el=$('#'+id); if(el)el.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.v===String(val))); };
    setSeg('fMode',S.mode); setSeg('fCountry',S.country); setSeg('fBmode',S.bmode);
    setSeg('fSampReq',S.sampReq?'1':'0'); setSeg('fSampType',S.sampType);
    renderBcol();
    $('#fSampType').classList.toggle('dim',!S.sampReq);
    seg('fMode', v=>S.mode=v);
    seg('fCountry', v=>S.country=+v);
    seg('fBmode', v=>{ S.bmode=v; renderBcol(); });
    seg('fSampReq', v=>{ S.sampReq=(v==='1'); $('#fSampType').classList.toggle('dim',!S.sampReq); });
    seg('fSampType', v=>S.sampType=v);
    renderSample();
    let addMode='describe';
    const am=$('#fAddMode'); if(am) am.querySelectorAll('button').forEach(b=>b.onclick=()=>{ addMode=b.dataset.v; am.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); $('#fFind').hidden=addMode!=='exact'; $('#fAddItem').hidden=addMode!=='describe'; if(addMode==='exact') $('#fFindQ').focus(); });
    $('#fAddItem').onclick=()=>{ const it={id:'it'+Date.now(),type:'',qty:+$('#fQty').value||500,unit:1.00}; S.items.push(it); renderItems(); const rows=document.querySelectorAll('#fItems .itemwrap'); const last=rows[rows.length-1]; if(last){ const n=last.querySelector('.iname'); if(n)n.focus(); } saveDraft(); };
    const PRODS=((window.STORE&&STORE.products)||[]).map(p=>({id:p.id,ref:(p.id||'').toUpperCase(),name:p.name,supplier:p.supplier||'',img:p.img||p.dept||'tech',price:p.priceGuide||0,moq:p.moq||0,cat:p.cat||''}));
    const fq=$('#fFindQ'), fr=$('#fFindR');
    const drawFind=()=>{ const q=fq.value.trim().toLowerCase(); if(!q){ fr.innerHTML=''; fr.hidden=true; return; } fr.hidden=false; const L=PRODS.filter(p=>(p.name+' '+p.ref+' '+p.supplier+' '+p.cat).toLowerCase().includes(q)).slice(0,8);
      fr.innerHTML=L.length?L.map(p=>`<button type="button" class="fres" data-pick="${esc(p.id)}"><span class="fres-th" style="background-image:url('assets/products/${esc(p.img)}.png')"></span><span class="fres-t"><b>${esc(p.name)}</b><small>${esc(p.ref)} · ${esc(p.supplier)}${p.moq?' · MOQ '+p.moq:''}</small></span><em>${p.price?'from £'+(+p.price).toFixed(2):''}</em><i>Add</i></button>`).join(''):'<p class="fres-none">No products match “'+esc(fq.value)+'”.</p>'; };
    if(fq){ fq.oninput=drawFind; drawFind(); fr.onclick=e=>{ const b=e.target.closest('[data-pick]'); if(!b) return; const p=PRODS.find(x=>x.id===b.dataset.pick); const it={id:'it'+Date.now(),type:p.name,qty:Math.max(p.moq||0,+$('#fQty').value||500),unit:+(+p.price||1).toFixed(2),prod:{id:p.id,ref:p.ref,name:p.name,supplier:p.supplier,img:p.img}}; S.items.push(it); renderItems(); saveDraft(); b.classList.add('added'); b.querySelector('i').textContent='Added ✓'; setTimeout(()=>{ b.classList.remove('added'); b.querySelector('i').textContent='Add'; },1200); }; }
    ['#fName','#fUse','#fDesc','#fBudget','#fQty','#fDate','#fPos','#fBNotes'].forEach(s=>{ const el=$(s); if(el)el.addEventListener('input',saveDraft); });
    $('#fBudget').addEventListener('input',runbar);
    $('#fName').addEventListener('input',hint);
    $('#btnNext').onclick=next;
    $('#btnBack').onclick=back;
    $('#ctaFind').onclick=()=>{ persist(); const first=S.items[0]; if(first){ const dep=CAT_DEPT[first.cat]||'lifestyle'; try{ localStorage.setItem('ms-brief-pending', JSON.stringify({project:PROJECT,itemId:first.id})); }catch(e){} window.location.href='Merchsmith Store.html#dept='+dep; } else { window.location.href='Merchsmith Store.html'; } };
    $('#ctaOpen').onclick=()=>{ persist(); window.location.href='Merchsmith Project - Autumn Giveaways.html'; };
    window.addEventListener('beforeunload',()=>{ if(launched)return; try{ localStorage.setItem(DRAFT_KEY, JSON.stringify(serialize())); }catch(e){} });
    document.addEventListener('keydown',e=>{ if(e.key==='Enter' && e.target.tagName!=='TEXTAREA' && e.target.tagName!=='INPUT' && step<STEPS.length-1 && !$('#btnNext').disabled){ e.preventDefault(); next(); } });
    showStep(step);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
