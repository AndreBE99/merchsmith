/* ============================================================
   admin-supplier.js — "Add supplier" flows for the Merchsmith
   platform admin. TWO variations to compare:
     A) Guided wizard  (multi-step modal)        → "Add supplier"
     B) Single-form drawer (everything on one)   → "Quick add"
   Both write the same record into window.ADMIN.suppliers and
   re-render via window.__adminRender(). Self-contained mock.
   ============================================================ */
(function(){
  const A = window.ADMIN; if(!A) return;
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const esc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2600); }; })();

  /* ---------- catalogues ---------- */
  const METHODS=[['screenprint','Screenprint'],['pad','Pad print'],['transfer','Transfer'],['dtf','DTF transfer'],['embroidery','Embroidery'],['laser','Laser engrave']];
  const MLBL=Object.fromEntries(METHODS);
  const DEPTS=['Bags','Clothing','Desk','Drinkware','Exhibition','Lifestyle','Notebooks','Outdoor','Tech','Writing'];
  const ADAPTERS=[
    {id:'xindao',  name:'XD Connects',       sub:'Xindao V7 · REST + JSON',  fields:['endpoint','key','secret']},
    {id:'pfconcept',name:'PF Concept',        sub:'Promo-Data nightly feed',  fields:['endpoint','key']},
    {id:'midocean',name:'Mid Ocean Brands',  sub:'REST v2 · OAuth',          fields:['endpoint','key','secret']},
    {id:'promidata',name:'Promidata',         sub:'Standardised PROMIDATA',   fields:['account','key']},
    {id:'generic', name:'Generic REST / JSON',sub:'Custom endpoint + mapping',fields:['endpoint','key','secret']}
  ];
  const ADP=Object.fromEntries(ADAPTERS.map(a=>[a.id,a]));
  const CADENCE=[['15m','Every 15 minutes'],['hourly','Hourly'],['daily','Nightly'],['manual','Manual only']];
  const FIELDLBL={endpoint:'Feed endpoint URL',key:'API key',secret:'API secret',account:'Promidata account'};
  const FIELDPH={endpoint:'https://feed.supplier.com/v7/products.json',key:'pk_live_…',secret:'••••••••',account:'e.g. 12345'};

  /* ---------- shared mutable model ---------- */
  function blank(){ return { name:'',domain:'',region:'UK',kind:'both',cats:new Set(['All']),
    conn:'api',adapter:'xindao',endpoint:'',key:'',secret:'',account:'',cadence:'daily',tested:false,
    csvName:'',csvCount:0, matchDomains:'',
    users:[], notes:'', agreements:[],
    invited:false, _simCount:0 }; }

  function offersProduct(D){ return D.kind==='both'||D.kind==='product'; }
  function offersBranding(D){ return D.kind==='both'||D.kind==='branding'; }
  // branding-only suppliers can't carry an auto product feed
  function connAvailable(D){ return offersProduct(D) ? ['api','csv','manual'] : ['manual']; }

  function simulatedCount(D){
    if(!offersProduct(D)) return 0;
    if(D.conn==='api') return D._simCount || ({xindao:8200,pfconcept:11400,midocean:9700,promidata:3100,generic:1500}[D.adapter]||2000);
    if(D.conn==='csv') return D.csvCount||0;
    return 0;
  }
  function feedLabel(D){
    if(D.conn==='api') return 'API · '+(ADP[D.adapter]?ADP[D.adapter].name:'feed');
    if(D.conn==='csv') return 'CSV · '+(D.csvName||'upload');
    return offersBranding(D)&&!offersProduct(D) ? 'Manual · decoration' : 'Manual';
  }
  function kindLabel(D){ return D.kind==='both'?'Product + Branding':D.kind==='branding'?'Branding only':'Product (blanks)'; }

  function commit(D){
    const id=(D.name||'supplier').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||('sup'+Date.now());
    const isFed = (D.conn==='api'||D.conn==='csv') && offersProduct(D);
    const apiGaps = D.conn==='api' && D.tested && PLATFORM_FIELDS.filter(f=>f[2]&&!(D.fieldMap&&D.fieldMap[f[0]])).length;
    const rec={ id, name:D.name.trim(), initials:av(D.name||'NS'), domain:(D.domain||'').trim()||'—',
      kind:D.kind, feed:D.invited?'Invite sent':feedLabel(D), products:simulatedCount(D),
      status:D.invited?'invited':(apiGaps?'needs_attention':(isFed?'active':'pending')), region:(D.region||'UK').trim(), usedBy:0, lead:'7 working days', since:'2026',
      // richer captured config (shown in the drawer; harmless extras for the table)
      cats:[...D.cats], connection:D.conn, adapter:D.conn==='api'?D.adapter:null,
      cadence:D.conn==='api'?D.cadence:null, tested:!!D.tested, fieldMap:D.conn==='api'?(D.fieldMap||{}):null,
      matchDomains:(D.matchDomains||'').split(/[\s,]+/).filter(Boolean),
      users:(D.users||[]).filter(u=>u.name||u.email), notes:D.notes||'', agreements:D.agreements||[],
      canInviteUsers:!!D.invited };
    A.suppliers.unshift(rec);
    if(window.__adminRender) window.__adminRender();
    return rec;
  }
  // re-derive status after a mapping edit on an existing supplier
  function refreshStatus(rec){ if(rec.status==='suspended'||rec.status==='invited'||rec.status==='pending') return; rec.status = requiredGaps(rec)>0 ? 'needs_attention' : 'active'; }

  /* ---------- small shared field builders ---------- */
  function segHTML(id,opts,cur){ return `<div class="fm-seg" data-seg="${id}">${opts.map(([v,l])=>`<button type="button" data-v="${v}" class="${cur===v?'on':''}">${l}</button>`).join('')}</div>`; }
  function chipsHTML(id,list,sel){ return `<div class="as-chips" data-chips="${id}">${list.map(it=>{const [v,l]=Array.isArray(it)?it:[it,it];const on=sel.has(v);return `<button type="button" class="as-chip ${on?'on':''}" data-v="${v}">${l}</button>`;}).join('')}</div>`; }
  function methodsField(D){ return offersBranding(D)?`<label class="fm-f"><span>Branding methods offered</span></label>${chipsHTML('methods',METHODS,D.methods)}`:''; }
  function catsField(D){ return offersProduct(D)?`<label class="fm-f"><span>Product categories</span></label>${chipsHTML('cats',['All',...DEPTS],D.cats)}`:''; }
  function adapterCards(D){ return `<div class="as-adapters" data-adapters>${ADAPTERS.map(a=>`<button type="button" class="as-adp ${D.adapter===a.id?'on':''}" data-adp="${a.id}"><b>${a.name}</b><span>${a.sub}</span></button>`).join('')}</div>`; }
  function adapterFields(D){ const a=ADP[D.adapter]||ADP.generic; return `<div class="as-credgrid">${a.fields.map(f=>`<label class="fm-f"><span>${FIELDLBL[f]}</span><input data-cred="${f}" value="${esc(D[f]||'')}" placeholder="${FIELDPH[f]||''}" ${f==='secret'?'type="password"':''}></label>`).join('')}</div>
    <label class="fm-f"><span>Sync frequency</span><select data-cred="cadence">${CADENCE.map(([v,l])=>`<option value="${v}" ${D.cadence===v?'selected':''}>${l}</option>`).join('')}</select></label>
    <div class="as-test"><button type="button" class="btn ghost sm" data-test>Test connection</button><span class="as-teststatus" data-teststatus>${D.tested?'<svg class="icn" style="width:14px;height:14px;stroke:var(--green-deep)"><path d="M4 12.5 9.5 18 20 6.5"/></svg> Connected · '+simulatedCount(D).toLocaleString()+' products found':''}</span></div>`; }
  function csvField(D){ return `<div class="as-drop" data-drop><svg class="icn" style="width:26px;height:26px"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg><b data-dropname>${D.csvName?esc(D.csvName):'Drop a product CSV or click to choose'}</b><span data-dropcount>${D.csvCount?D.csvCount.toLocaleString()+' products detected':'Columns auto-mapped: name, category, price breaks, colours, print methods'}</span><input type="file" accept=".csv" hidden data-csv></div>`; }
  function connFields(D){
    if(!offersProduct(D)) return `<div class="as-note"><svg class="icn" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><p>Branding-only suppliers don't carry a product catalogue. You'll define their decoration methods &amp; lead times — distributors apply them to other suppliers' blanks.</p></div>`;
    if(D.conn==='api') return adapterCards(D)+adapterFields(D)+(D.tested?fieldMapBlock(D):'');
    if(D.conn==='csv') return csvField(D);
    return `<div class="as-note"><svg class="icn" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><p>You'll add products to this supplier individually after it's created (single-product form). Good for small or bespoke ranges.</p></div>`;
  }
  function matchField(D){ return `<label class="fm-f"><span>Match domains <em>how distributor searches find this supplier</em></span><input data-f="matchDomains" value="${esc(D.matchDomains||'')}" placeholder="e.g. xdconnects.com, xindao.com"></label>`; }

  /* ---------- field (schema) mapping — at connect time ---------- */
  // platform's canonical product fields the feed must populate
  const PLATFORM_FIELDS=[['name','Product name',true],['code','Item / model code',true],['cost','Unit cost',true],['currency','Currency',true],['priceBreaks','Price breaks',true],['category','Category',false],['colours','Colours',false],['printMethods','Print methods',false],['lead','Lead time',false],['moq','MOQ',false],['images','Images',false]];
  // per-adapter feed schema: prebuilt profiles for known adapters; generic = partial (operator maps the rest)
  const FEED_PROFILES={
    xindao:{prebuilt:true, map:{name:'itemName',code:'itemCode',cost:'priceNet',currency:'currencyCode',priceBreaks:'scalePrices',category:'productClass',colours:'colourDescription',printMethods:'printTechniques',lead:'deliveryDays',moq:'minimumQty',images:'imageUrls'}, extra:['grossWeight','barcode','countryOfOrigin'], sample:{itemName:'Wheat-Straw Charging Cable',itemCode:'P302.171',priceNet:'3.85',currencyCode:'EUR',productClass:'Tech & Charging',colourDescription:'Volcanic Black',deliveryDays:'10',minimumQty:'50'}},
    pfconcept:{prebuilt:true, map:{name:'description',code:'sku',cost:'netPrice',currency:'curr',priceBreaks:'priceScale',category:'mainCategory',colours:'colour',printMethods:'decoMethods',lead:'leadTimeDays',moq:'moq',images:'media'}, extra:['weightKg','hsCode'], sample:{description:'Recycled Cotton Tote',sku:'PF-7741',netPrice:'1.62',curr:'EUR',mainCategory:'Shoppers & Totes',colour:'Natural',leadTimeDays:'6',moq:'100'}},
    midocean:{prebuilt:true, map:{name:'productName',code:'masterCode',cost:'price',currency:'currency',priceBreaks:'priceTiers',category:'category',colours:'colorName',printMethods:'printOptions',lead:'lead',moq:'minOrder',images:'images'}, extra:['dimensions','material'], sample:{productName:'Insulated Steel Cup',masterCode:'MO-2210',price:'4.10',currency:'EUR',category:'Drinkware',colorName:'Navy',lead:'9',minOrder:'50'}},
    promidata:{prebuilt:true, map:{name:'Name',code:'SupplierItemNumber',cost:'Price',currency:'Currency',priceBreaks:'Scales',category:'Category',colours:'Color',printMethods:'PrintingOptions',lead:'DeliveryTime',moq:'MinOrder',images:'Pictures'}, extra:['Weight','Dimensions'], sample:{Name:'Bamboo Notebook A5',SupplierItemNumber:'PD-9930',Price:'2.10',Currency:'EUR',Category:'Notebooks & Journals',Color:'Kraft',DeliveryTime:'12',MinOrder:'100'}},
    generic:{prebuilt:false, map:{name:'title',code:'sku',cost:'price',priceBreaks:'tiers',colours:'colour_options'}, extra:['weight','tags','vendor_ref','status'], sample:{title:'Custom Product',sku:'SKU-0001',price:'4.00',colour_options:'Black; White',tiers:'[…]'}}
  };
  function feedFieldsOf(D){ const p=FEED_PROFILES[D.adapter]||FEED_PROFILES.generic; const fromMap=Object.values(p.map).filter(Boolean); return [...new Set([...fromMap,...(p.extra||[])])]; }
  function initFieldMap(D){ const p=FEED_PROFILES[D.adapter]||FEED_PROFILES.generic; D.fieldMap={}; PLATFORM_FIELDS.forEach(([k])=>{ D.fieldMap[k]=p.map[k]||''; }); }
  function fieldMapStats(D){ const req=PLATFORM_FIELDS.filter(f=>f[2]); const mappedReq=req.filter(f=>D.fieldMap&&D.fieldMap[f[0]]).length; return {reqTotal:req.length, mappedReq, allMapped:PLATFORM_FIELDS.filter(f=>D.fieldMap&&D.fieldMap[f[0]]).length}; }
  // required-field gaps for a saved supplier record (api feeds only)
  function requiredGaps(rec){ if(!rec||rec.connection!=='api'||!rec.fieldMap) return 0; return PLATFORM_FIELDS.filter(f=>f[2]&&!rec.fieldMap[f[0]]).length; }
  function recNeedsAttention(rec){ return requiredGaps(rec)>0; }
  function samplePreview(D){ const p=FEED_PROFILES[D.adapter]||FEED_PROFILES.generic; const s=p.sample||{}; const g=k=>{ const src=D.fieldMap&&D.fieldMap[k]; return src&&s[src]!=null?s[src]:null; }; const name=g('name'),cost=g('cost'),cur=g('currency'),code=g('code'),cat=g('category'); if(!name&&!cost) return ''; return `<div class="as-preview"><span class="as-prevlbl">First product reads as</span><b>${esc(name||'—')}</b><span>${code?esc(code)+' · ':''}${cost?(cur?esc(cur)+' ':'£')+esc(cost):'—'}${cat?' · '+esc(cat):''}</span></div>`; }
  function fieldMapBlock(D){
    const feedFields=feedFieldsOf(D); const p=FEED_PROFILES[D.adapter]||FEED_PROFILES.generic; const st=fieldMapStats(D);
    const ok=st.mappedReq===st.reqTotal;
    const rows=PLATFORM_FIELDS.map(([k,lbl,req])=>{ const val=(D.fieldMap&&D.fieldMap[k])||''; const auto=val&&p.map[k]===val;
      return `<div class="as-fmrow ${req&&!val?'miss':''}"><div class="as-fmpl">${lbl}${req?'<span class="as-req">required</span>':''}</div>
        <svg class="icn as-fmarr" style="width:15px;height:15px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <select class="as-fmsel" data-fmap="${k}"><option value="">— not provided —</option>${feedFields.map(f=>`<option value="${f}" ${val===f?'selected':''}>${f}</option>`).join('')}</select>
        ${val?(auto?'<span class="as-fmtag auto">Auto</span>':'<span class="as-fmtag ok">Set</span>'):(req?'<span class="as-fmtag miss">Map</span>':'<span class="as-fmtag opt">Optional</span>')}</div>`; }).join('');
    return `<div class="as-fmap"><div class="as-fmhd"><div><b>Field mapping</b><span>${p.prebuilt?'Prebuilt profile for '+(ADP[D.adapter]?ADP[D.adapter].name:'this feed')+' — confirm or adjust':'Generic feed — map each platform field to an incoming field'}</span></div><span class="as-fmcount ${ok?'ok':'warn'}">${st.mappedReq}/${st.reqTotal} required</span></div>
      ${samplePreview(D)}
      <div class="as-fmrows">${rows}</div></div>`;
  }
  // team & docs: users housed under the supplier + notes + agreements
  const USER_ROLES=[['owner','Owner'],['member','Member'],['production','Production']];
  function teamField(D){
    const rows=(D.users||[]).map((u,i)=>`<div class="as-urow" data-urow="${i}">
      <input class="as-uin" data-u="${i}:name" value="${esc(u.name||'')}" placeholder="Full name">
      <input class="as-uin" data-u="${i}:email" value="${esc(u.email||'')}" placeholder="name@supplier.com">
      <select class="as-uin as-urole" data-u="${i}:role">${USER_ROLES.map(([v,l])=>`<option value="${v}" ${u.role===v?'selected':''}>${l}</option>`).join('')}</select>
      <button type="button" class="as-udel" data-udel="${i}" title="Remove">×</button></div>`).join('');
    return `<label class="fm-f"><span>Users <em>housed under this supplier — they'll be invited by email</em></span></label>
      <div class="as-users">${rows||'<p class="as-emptyrow">No users yet.</p>'}</div>
      <button type="button" class="as-add" data-adduser><svg class="icn" style="width:15px;height:15px"><path d="M12 5v14M5 12h14"/></svg>Add user</button>
      <label class="fm-f" style="margin-top:14px"><span>Notes <em>internal</em></span><textarea class="as-ta" data-f="notes" rows="3" placeholder="Account notes, contacts, payment terms…">${esc(D.notes||'')}</textarea></label>
      <label class="fm-f"><span>Agreements &amp; documents</span></label>
      <div class="as-docs">${(D.agreements||[]).map((a,i)=>`<span class="as-doc"><svg class="icn" style="width:13px;height:13px"><path d="M7 3h7l4 4v14H7zM14 3v4h4"/></svg>${esc(a.name||a)}<button type="button" class="as-docdel" data-docdel="${i}">×</button></span>`).join('')}</div>
      <button type="button" class="as-add" data-adddoc><svg class="icn" style="width:15px;height:15px"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>Add agreement</button>`;
  }

  /* ---------- shared field wiring (operates on a root + D + onChange) ---------- */
  function wireFields(root,D,onChange){
    root.querySelectorAll('[data-seg]').forEach(seg=>seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const k=seg.dataset.seg,v=b.dataset.v;
      if(k==='kind'){ D.kind=v; if(!connAvailable(D).includes(D.conn))D.conn='manual'; }
      else if(k==='conn'){ D.conn=v; D.tested=false; }
      onChange(); }));
    root.querySelectorAll('[data-chips]').forEach(c=>c.querySelectorAll('.as-chip').forEach(b=>b.onclick=()=>{ const set=D[c.dataset.chips]; const v=b.dataset.v;
      if(c.dataset.chips==='cats'){ if(v==='All'){ set.clear(); set.add('All'); } else { set.delete('All'); if(set.has(v))set.delete(v); else set.add(v); if(!set.size)set.add('All'); } onChange&&onChange('soft'); return; }
      if(set.has(v))set.delete(v); else set.add(v); b.classList.toggle('on',set.has(v)); }));
    // team & docs
    root.querySelectorAll('[data-u]').forEach(el=>el.oninput=el.onchange=()=>{ const [i,k]=el.dataset.u.split(':'); (D.users[+i]=D.users[+i]||{})[k]=el.value; });
    const addU=root.querySelector('[data-adduser]'); if(addU)addU.onclick=()=>{ D.users.push({name:'',email:'',role:'member'}); onChange&&onChange('soft'); };
    root.querySelectorAll('[data-udel]').forEach(b=>b.onclick=()=>{ D.users.splice(+b.dataset.udel,1); onChange&&onChange('soft'); });
    const addD=root.querySelector('[data-adddoc]'); if(addD)addD.onclick=()=>{ const n=prompt('Document / agreement name:','Supply agreement.pdf'); if(n){ D.agreements.push({name:n}); onChange&&onChange('soft'); } };
    root.querySelectorAll('[data-docdel]').forEach(b=>b.onclick=()=>{ D.agreements.splice(+b.dataset.docdel,1); onChange&&onChange('soft'); });
    root.querySelectorAll('[data-adp]').forEach(b=>b.onclick=()=>{ D.adapter=b.dataset.adp; D.tested=false; onChange(); });
    root.querySelectorAll('[data-cred]').forEach(el=>el.oninput=el.onchange=()=>{ D[el.dataset.cred]=el.value; if(el.dataset.cred!=='cadence')D.tested=false; });
    root.querySelectorAll('[data-f]').forEach(el=>el.oninput=()=>{ D[el.dataset.f]=el.value; });
    const drop=root.querySelector('[data-drop]'); if(drop){ const inp=drop.querySelector('[data-csv]');
      drop.onclick=()=>inp.click();
      drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');}; drop.ondragleave=()=>drop.classList.remove('over');
      const handle=name=>{ D.csvName=name; D.csvCount=900+Math.floor(Math.random()*1800); const n=drop.querySelector('[data-dropname]'),c=drop.querySelector('[data-dropcount]'); if(n)n.textContent=name; if(c)c.textContent=D.csvCount.toLocaleString()+' products detected'; drop.classList.add('done'); onChange&&onChange('soft'); };
      drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over'); const f=e.dataTransfer.files[0]; handle(f?f.name:'products.csv');};
      inp.onchange=()=>{ const f=inp.files[0]; handle(f?f.name:'products.csv'); };
    }
    const test=root.querySelector('[data-test]'); if(test){ test.onclick=()=>{ const st=root.querySelector('[data-teststatus]'); test.disabled=true; st.innerHTML='<span class="as-spin"></span> Connecting…'; setTimeout(()=>{ D.tested=true; D._simCount=({xindao:8200,pfconcept:11400,midocean:9700,promidata:3100,generic:1500}[D.adapter]||2000); initFieldMap(D); onChange&&onChange(); },1100); }; }
    root.querySelectorAll('[data-fmap]').forEach(sel=>sel.onchange=()=>{ D.fieldMap[sel.dataset.fmap]=sel.value; onChange&&onChange(); });
  }

  function valid(D){ return !!D.name.trim(); }

  /* ============================================================
     VARIATION A — GUIDED WIZARD (multi-step modal)
     ============================================================ */
  function wizard(){
    const D=blank();
    const STEPS=['Identity','Capability','Connection','Team & docs','Review'];
    let step=0;
    const wrap=document.createElement('div'); wrap.className='fm-scrim as-wizscrim';
    wrap.innerHTML=`<div class="fm-modal as-wiz"><div class="as-wizhead"><div class="as-steps" id="asSteps"></div><button class="dwr-x" data-fx>×</button></div><div class="as-wizbody" id="asBody"></div><div class="as-wizfoot"><button class="btn ghost" id="asBack" style="visibility:hidden">Back</button><span style="flex:1"></span><button class="btn" id="asNext">Continue</button></div></div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); document.body.style.overflow=''; },200); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) close(); });

    function steps(){ document.getElementById('asSteps').innerHTML=STEPS.map((s,i)=>`<div class="as-st ${i<step?'done':i===step?'on':''}"><span class="as-stn">${i<step?'✓':i+1}</span><span class="as-stl">${s}</span></div>${i<STEPS.length-1?'<span class="as-stline"></span>':''}`).join(''); }
    function body(){
      const b=document.getElementById('asBody'); let h='';
      if(step===0){ h=`<h3 class="as-h">Who's the supplier?</h3><p class="as-sub">The organisation behind the products or decoration.</p>
        <label class="fm-f"><span>Supplier name</span><input data-f="name" value="${esc(D.name)}" placeholder="e.g. XD Connects"></label>
        <div class="as-row2"><label class="fm-f"><span>Domain</span><input data-f="domain" value="${esc(D.domain)}" placeholder="supplier.com"></label><label class="fm-f"><span>Region</span><input data-f="region" value="${esc(D.region)}"></label></div>`; }
      else if(step===1){ h=`<h3 class="as-h">What do they provide?</h3><p class="as-sub">Drives where they appear and what you'll configure next.</p>
        <label class="fm-f"><span>Supplier type</span></label>${segHTML('kind',[['both','Product + Branding'],['product','Product'],['branding','Branding']],D.kind)}
        <div id="asCap" style="margin-top:14px">${catsField(D)}</div>`; }
      else if(step===2){ h=`<h3 class="as-h">How does their catalogue arrive?</h3><p class="as-sub">${offersProduct(D)?'Connect a live feed, upload a CSV, or add products by hand.':'Branding-only — no product feed needed.'}</p>
        ${offersProduct(D)?segHTML('conn',[['api','API feed'],['csv','CSV upload'],['manual','Manual']],D.conn):''}
        <div id="asConn" style="margin-top:14px">${connFields(D)}</div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line-soft)">${matchField(D)}</div>`; }
      else if(step===3){ h=`<h3 class="as-h">Team &amp; documents</h3><p class="as-sub">People housed under this supplier, plus internal notes and agreements.</p>${teamField(D)}`; }
      else { h=reviewHTML(D); }
      b.innerHTML=h; wireFields(b,D,()=>{ body(); });
      document.getElementById('asBack').style.visibility=step?'visible':'hidden';
      document.getElementById('asNext').textContent=step===STEPS.length-1?'Add supplier':(step===STEPS.length-2?'Review':'Continue');
      steps();
    }
    document.getElementById('asNext').onclick=()=>{
      if(step===0 && !valid(D)){ const i=document.querySelector('#asBody [data-f="name"]'); if(i)i.focus(); return; }
      if(step<STEPS.length-1){ step++; body(); }
      else { const rec=commit(D); close(); toast(`Supplier “${rec.name}” added`); }
    };
    document.getElementById('asBack').onclick=()=>{ if(step){ step--; body(); } };
    body();
  }

  function reviewHTML(D){
    const rows=[['Name',esc(D.name||'—')],['Domain',esc(D.domain||'—')+' · '+esc(D.region)],['Type',kindLabel(D)]];
    if(offersProduct(D)) rows.push(['Categories',[...D.cats].join(', ')||'—']);
    rows.push(['Connection', feedLabel(D)]);
    if(D.conn==='api') rows.push(['Sync',(CADENCE.find(c=>c[0]===D.cadence)||['',''])[1]+(D.tested?' · tested ✓':' · not tested')]);
    if(D.conn==='api'&&D.tested){ const st=fieldMapStats(D); rows.push(['Field mapping', `${st.mappedReq}/${st.reqTotal} required mapped`]); }
    if(offersProduct(D)) rows.push(['Products', simulatedCount(D)?simulatedCount(D).toLocaleString():'0 (added manually)']);
    if(D.matchDomains) rows.push(['Match domains', esc(D.matchDomains)]);
    const us=(D.users||[]).filter(u=>u.name||u.email); if(us.length) rows.push(['Users', us.length+' to invite']);
    if((D.agreements||[]).length) rows.push(['Agreements', D.agreements.length+' attached']);
    const willActivate=(D.conn==='api'||D.conn==='csv')&&offersProduct(D);
    return `<h3 class="as-h">Review</h3><p class="as-sub">${willActivate?'This supplier will go live with its catalogue immediately.':'This supplier will be saved as <b>pending</b> until products are added.'}</p>
      <div class="as-review">${rows.map(([k,v])=>`<div class="as-rrow"><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
  }

  /* ============================================================
     VARIATION B — SINGLE-FORM DRAWER
     ============================================================ */
  function drawerForm(){
    const D=blank();
    const wrap=document.createElement('div'); wrap.className='as-drawerscrim';
    wrap.innerHTML=`<div class="as-drawer"><div class="as-dhead"><div><h2>Add supplier</h2><span>All on one page — for quick entry</span></div><button class="dwr-x" data-fx>×</button></div>
      <div class="as-dbody" id="asDBody"></div>
      <div class="as-dfoot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="asDSave">Add supplier</button></div></div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); document.body.style.overflow=''; },240); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) close(); });

    function render(){
      document.getElementById('asDBody').innerHTML=`
        <div class="as-sec"><h4>Identity</h4>
          <label class="fm-f"><span>Supplier name</span><input data-f="name" value="${esc(D.name)}" placeholder="e.g. XD Connects"></label>
          <div class="as-row2"><label class="fm-f"><span>Domain</span><input data-f="domain" value="${esc(D.domain)}" placeholder="supplier.com"></label><label class="fm-f"><span>Region</span><input data-f="region" value="${esc(D.region)}"></label></div>
        </div>
        <div class="as-sec"><h4>Type &amp; capability</h4>
          ${segHTML('kind',[['both','Product + Branding'],['product','Product'],['branding','Branding']],D.kind)}
          <div id="asDCap" style="margin-top:12px">${catsField(D)}</div>
        </div>
        <div class="as-sec"><h4>Connection</h4>
          ${offersProduct(D)?segHTML('conn',[['api','API feed'],['csv','CSV upload'],['manual','Manual']],D.conn):''}
          <div id="asDConn" style="margin-top:12px">${connFields(D)}</div>
          <div style="margin-top:14px">${matchField(D)}</div>
        </div>
        <div class="as-sec"><h4>Team &amp; documents</h4>${teamField(D)}</div>`;
      wireFields(document.getElementById('asDBody'),D,()=>render());
    }
    document.getElementById('asDSave').onclick=()=>{ if(!valid(D)){ const i=document.querySelector('#asDBody [data-f="name"]'); if(i)i.focus(); return; } const rec=commit(D); close(); toast(`Supplier “${rec.name}” added`); };
    render();
  }

  /* ============================================================
     INVITE SUPPLIER — self-onboarding, can invite their own users
     ============================================================ */
  function inviteSupplier(){
    const D=blank(); D.invited=true;
    const wrap=document.createElement('div'); wrap.className='fm-scrim as-wizscrim';
    wrap.innerHTML=`<div class="fm-modal as-invite"><div class="fm-head"><h3>Invite supplier</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <div class="as-note"><svg class="icn" style="width:16px;height:16px"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><p>We'll email the supplier an onboarding link. They complete their own profile &amp; catalogue connection, and can <b>invite their own users</b>.</p></div>
        <label class="fm-f"><span>Supplier name</span><input data-f="name" placeholder="e.g. XD Connects"></label>
        <div class="as-row2"><label class="fm-f"><span>Domain</span><input data-f="domain" placeholder="supplier.com"></label><label class="fm-f"><span>Region</span><input data-f="region" value="UK"></label></div>
        <label class="fm-f"><span>Supplier type</span></label>${segHTML('kind',[['both','Product + Branding'],['product','Product'],['branding','Branding']],D.kind)}
        <label class="fm-f"><span>Primary contact name</span><input data-u="0:name" placeholder="Full name"></label>
        <label class="fm-f"><span>Primary contact email <em>the invite goes here</em></span><input data-u="0:email" type="email" placeholder="name@supplier.com"></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="asInviteSend">Send invite</button></div></div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); document.body.style.overflow=''; },200); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) close(); });
    D.users=[{name:'',email:'',role:'owner'}];
    wireFields(wrap,D,()=>{});
    wrap.querySelector('#asInviteSend').onclick=()=>{ if(!valid(D)){ const i=wrap.querySelector('[data-f="name"]'); if(i)i.focus(); return; } const rec=commit(D); close(); toast(`Invite sent to ${esc((D.users[0]&&D.users[0].email)||rec.name)}`); };
  }

  /* ---------- styles ---------- */
  function injectCSS(){
    if(document.getElementById('as-style')) return;
    const s=document.createElement('style'); s.id='as-style';
    s.textContent=`
    .as-chips{display:flex;flex-wrap:wrap;gap:7px;}
    .as-chip{border:1.5px solid var(--line-soft);background:#fff;border-radius:999px;padding:6px 13px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink-2);cursor:pointer;}
    .as-chip.on{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);background:var(--tint-peri);}
    .fm-f>span em{font-style:normal;font-weight:600;color:var(--muted);font-size:11.5px;margin-left:5px;text-transform:none;letter-spacing:0;}
    .as-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .as-note{display:flex;gap:11px;background:var(--tint-peri);border-radius:11px;padding:13px 15px;align-items:flex-start;}
    .as-note svg{stroke:var(--periwinkle-deep);stroke-width:1.7;fill:none;flex:none;margin-top:1px;}
    .as-note p{margin:0;font-size:13px;line-height:1.5;color:var(--periwinkle-ink,#33356b);}
    .as-adapters{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px;}
    .as-users{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;}
    .as-urow{display:grid;grid-template-columns:1fr 1fr auto auto;gap:8px;align-items:center;}
    .as-uin{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:#fff;}
    .as-uin:focus{outline:0;border-color:var(--periwinkle-deep);}
    .as-urole{min-width:104px;}
    .as-udel{width:30px;height:30px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:17px;line-height:1;color:var(--muted);cursor:pointer;}
    .as-udel:hover{border-color:var(--flare);color:var(--flare);}
    .as-emptyrow{margin:0;font-size:12.5px;color:var(--muted);}
    .as-add{display:inline-flex;align-items:center;gap:6px;border:1.5px dashed var(--line);background:none;border-radius:9px;padding:8px 13px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);cursor:pointer;}
    .as-add:hover{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);}
    .as-add svg{stroke:currentColor;stroke-width:1.9;fill:none;}
    .as-ta{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 12px;background:#fff;resize:vertical;}
    .as-ta:focus{outline:0;border-color:var(--periwinkle-deep);}
    .as-docs{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;}
    .as-doc{display:inline-flex;align-items:center;gap:6px;background:var(--paper-2);border-radius:8px;padding:5px 8px 5px 10px;font-size:12.5px;font-weight:600;color:var(--ink);}
    .as-doc svg{stroke:var(--periwinkle-deep);stroke-width:1.6;fill:none;}
    .as-docdel{border:0;background:none;font-size:15px;line-height:1;color:var(--muted);cursor:pointer;padding:0 2px;}
    .as-docdel:hover{color:var(--flare);}
    .as-invite{width:min(460px,100%);}
    .as-fmap{margin-top:16px;padding-top:16px;border-top:1px solid var(--line-soft);}
    .as-fmhd{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;}
    .as-fmhd b{display:block;font-size:14px;color:var(--ink);}
    .as-fmhd span{display:block;font-size:12px;color:var(--muted);max-width:42ch;line-height:1.4;}
    .as-fmcount{font-size:11px;font-weight:800;border-radius:999px;padding:4px 10px;white-space:nowrap;}
    .as-fmcount.ok{background:var(--tint-green);color:var(--green-deep);}
    .as-fmcount.warn{background:#fbeccd;color:#9a6b1f;}
    .as-preview{background:var(--tint-peri);border-radius:10px;padding:10px 13px;margin-bottom:12px;}
    .as-prevlbl{display:block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--periwinkle-deep);margin-bottom:3px;}
    .as-preview b{font-size:14px;color:var(--ink);}
    .as-preview span{font-size:12.5px;color:var(--ink-2);}
    .as-fmrows{display:flex;flex-direction:column;gap:6px;}
    .as-fmrow{display:grid;grid-template-columns:1fr 16px 1.1fr auto;gap:10px;align-items:center;}
    .as-fmpl{font-size:13px;font-weight:600;color:var(--ink);}
    .as-req{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--flare);margin-left:6px;}
    .as-fmarr{stroke:var(--line);stroke-width:2;fill:none;}
    .as-fmsel{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:8px;padding:7px 9px;background:#fff;width:100%;}
    .as-fmsel:focus{outline:0;border-color:var(--periwinkle-deep);}
    .as-fmrow.miss .as-fmsel{border-color:#e7c98f;background:#fffdf6;}
    .as-fmtag{font-size:10px;font-weight:800;border-radius:999px;padding:3px 8px;white-space:nowrap;text-align:center;}
    .as-fmtag.auto{background:var(--tint-peri);color:var(--periwinkle-deep);}
    .as-fmtag.ok{background:var(--tint-green);color:var(--green-deep);}
    .as-fmtag.miss{background:#fbeccd;color:#9a6b1f;}
    .as-fmtag.opt{background:var(--paper-2);color:var(--muted);}
    .as-adp{text-align:left;border:1.5px solid var(--line-soft);background:#fff;border-radius:12px;padding:11px 13px;cursor:pointer;}
    .as-adp b{display:block;font-size:13.5px;color:var(--ink);}
    .as-adp span{display:block;font-size:11.5px;color:var(--muted);margin-top:2px;}
    .as-adp.on{border-color:var(--periwinkle-deep);box-shadow:0 0 0 1.5px var(--periwinkle-deep);}
    .as-credgrid{display:flex;flex-direction:column;gap:12px;}
    .as-test{display:flex;align-items:center;gap:12px;margin-top:12px;}
    .as-teststatus{font-size:12.5px;font-weight:700;color:var(--green-deep);display:inline-flex;align-items:center;gap:6px;}
    .as-spin{width:13px;height:13px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--periwinkle-deep);display:inline-block;animation:asspin .6s linear infinite;}
    @keyframes asspin{to{transform:rotate(360deg)}}
    .as-drop{border:1.6px dashed var(--line);border-radius:13px;padding:24px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;}
    .as-drop svg{stroke:var(--periwinkle-deep);stroke-width:1.7;fill:none;}
    .as-drop b{font-size:13.5px;color:var(--ink);}
    .as-drop span{font-size:12px;color:var(--muted);max-width:42ch;}
    .as-drop.over,.as-drop:hover{border-color:var(--periwinkle-deep);background:var(--tint-peri);}
    .as-drop.done{border-style:solid;border-color:var(--green-deep);background:var(--tint-green);}

    /* wizard */
    .as-wiz{width:min(560px,100%);}
    .as-wizhead{display:flex;align-items:center;gap:12px;padding:16px 20px 14px;border-bottom:1px solid var(--line-soft);}
    .as-steps{display:flex;align-items:center;gap:0;flex:1;overflow:hidden;}
    .as-st{display:flex;align-items:center;gap:7px;}
    .as-stn{width:24px;height:24px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12px;font-weight:800;background:#fff;color:var(--muted);box-shadow:inset 0 0 0 1.5px var(--line);}
    .as-st.on .as-stn{background:var(--periwinkle-deep);color:#fff;box-shadow:none;}
    .as-st.done .as-stn{background:var(--periwinkle-deep);color:#fff;box-shadow:none;}
    .as-stl{font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap;}
    .as-st.on .as-stl,.as-st.done .as-stl{color:var(--ink);}
    .as-stline{flex:1;height:2px;background:var(--line);margin:0 8px;min-width:8px;border-radius:2px;}
    @media(max-width:520px){.as-stl{display:none;}}
    .as-wizbody{padding:20px 22px;max-height:62vh;overflow-y:auto;display:flex;flex-direction:column;gap:13px;}
    .as-h{font-family:var(--serif);font-weight:500;font-size:21px;margin:0;color:var(--ink);}
    .as-sub{margin:-6px 0 4px;font-size:13px;color:var(--muted);line-height:1.5;}
    .as-wizfoot{display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid var(--line-soft);}
    .as-review{display:flex;flex-direction:column;gap:0;border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;}
    .as-rrow{display:flex;justify-content:space-between;gap:16px;padding:10px 14px;font-size:13.5px;border-bottom:1px solid var(--line-soft);}
    .as-rrow:last-child{border-bottom:0;}
    .as-rrow span{color:var(--muted);font-weight:600;}
    .as-rrow b{color:var(--ink);text-align:right;}

    /* drawer */
    .as-drawerscrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:130;opacity:0;transition:opacity .22s;}
    .as-drawerscrim.open{opacity:1;}
    .as-drawer{position:fixed;top:0;right:0;height:100vh;width:min(560px,100%);background:var(--paper);box-shadow:-20px 0 60px rgba(20,22,45,.3);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .26s cubic-bezier(.22,.61,.36,1);}
    .as-drawerscrim.open .as-drawer{transform:none;}
    .as-dhead{display:flex;align-items:flex-start;gap:14px;padding:20px 24px;border-bottom:1px solid var(--line-soft);background:#fff;}
    .as-dhead h2{font-family:var(--serif);font-weight:500;font-size:22px;margin:0;}
    .as-dhead span{font-size:12.5px;color:var(--muted);}
    .as-dhead .dwr-x{margin-left:auto;}
    .as-dbody{flex:1;overflow-y:auto;padding:8px 24px 24px;}
    .as-sec{padding:18px 0;border-bottom:1px solid var(--line-soft);display:flex;flex-direction:column;gap:12px;}
    .as-sec:last-child{border-bottom:0;}
    .as-sec h4{font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);margin:0;}
    .as-dfoot{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid var(--line-soft);background:#fff;}
    `;
    document.head.appendChild(s);
  }

  /* ---------- edit field mapping on an existing supplier (reopen from drawer) ---------- */
  function editFieldMap(supId){
    const s=A.suppliers.find(x=>x.id===supId); if(!s) return;
    if(!s.adapter){ s.adapter='generic'; }
    if(!s.fieldMap){ const D0={adapter:s.adapter}; initFieldMap(D0); s.fieldMap=D0.fieldMap; }
    const D={ adapter:s.adapter, fieldMap:Object.assign({},s.fieldMap), conn:'api', kind:s.kind, tested:true };
    const wrap=document.createElement('div'); wrap.className='fm-scrim as-wizscrim';
    wrap.innerHTML=`<div class="fm-modal as-fmedit"><div class="fm-head"><h3>Field mapping · ${esc(s.name)}</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body" id="fmEditBody"></div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="fmEditSave">Save mapping</button></div></div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); document.body.style.overflow=''; },200); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) close(); });
    function render(){ document.getElementById('fmEditBody').innerHTML=`<p class="as-sub" style="margin:0 0 4px">Map each platform field to an incoming field from the <b>${esc(s.feed)}</b> feed.</p>${fieldMapBlock(D)}`; wireFields(wrap,D,()=>render()); }
    render();
    wrap.querySelector('#fmEditSave').onclick=()=>{ s.fieldMap=Object.assign({},D.fieldMap); refreshStatus(s); if(window.__adminRender)window.__adminRender(); close(); toast(`Field mapping saved for ${esc(s.name)}`); if(window.__openSupplier)window.__openSupplier(supId); };
  }
  // delegated launch from the supplier drawer
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-editfmap]'); if(b){ e.stopPropagation(); editFieldMap(b.dataset.editfmap); } });

  /* ---------- wire entry points ---------- */
  function wire(){
    injectCSS();
    const add=document.getElementById('qInviteSup');
    if(add){ add.onclick=wizard; }
    const head=add&&add.closest('.phead');
    if(head){
      if(!document.getElementById('qInviteSupInvite')){
        const b=document.createElement('button'); b.id='qInviteSupInvite'; b.className='btn ghost sm'; b.style.marginLeft='8px';
        b.innerHTML='Invite supplier'; b.onclick=inviteSupplier; add.after(b);
      }
      if(!document.getElementById('qInviteSupQuick')){
        const q=document.getElementById('qInviteSupInvite');
        const b=document.createElement('button'); b.id='qInviteSupQuick'; b.className='btn ghost sm'; b.style.marginLeft='8px';
        b.innerHTML='Quick add'; b.onclick=drawerForm; q.after(b);
      }
    }
    window.MSAddSupplier={ wizard, drawer:drawerForm, invite:inviteSupplier, editFieldMap };
    window.MSSupplierMap={ requiredGaps, fieldMapStats:rec=>fieldMapStats(rec), PLATFORM_FIELDS };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
