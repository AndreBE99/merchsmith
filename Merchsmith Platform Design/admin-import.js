/* ============================================================
   admin-import.js — multi-step feed import wizard.
   Step 1 Source (upload CSV or JSON feeds, or use a sample)
   Step 2 Map & normalise (CSV: field mapping · JSON: adapter
          coverage + editable value-mapping lookups)
   Step 3 Preview & import → MSCAT.ingest.
   CSV path = Bio Labs (WooCommerce). JSON path = MSFEED adapters
   (PF Concept 3-feed today; Neutral/Xindao/Xoopar to follow).
   Launched from Products database ("Import from feed").
   ============================================================ */
(function(){
  if(!window.MSCAT) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2800); }; })();
  const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\uFFFD/g,'£');

  /* ===================== CSV path (Bio Labs / WooCommerce) ===================== */
  function parseCSV(text){ const rows=[]; let row=[],cur='',q=false;
    for(let i=0;i<text.length;i++){ const c=text[i];
      if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; }
      else { if(c==='"')q=true; else if(c===','){row.push(cur);cur='';} else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';} else if(c==='\r'){} else cur+=c; } }
    if(cur.length||row.length){ row.push(cur); rows.push(row); } return rows; }
  const FIELDS=[ ['name','Product name',true],['code','Item / SKU code',true],['breakQty','Price-break quantities',true,'multi'],
    ['breakPrice','Price-break unit prices',true,'multi'],['category','Category source',true],['colours','Colours',false],
    ['eco','Eco credentials',false],['lead','Lead time',false],['methods','Print methods',false],['image','Image URL',false] ];
  const GUESS={ name:[/^title$/i,/product.?name/i,/^name$/i], code:[/^sku$/i,/^reference$/i,/item.?code/i,/^code$/i],
    breakQty:[/customtier_quantity/i,/break.?quantit/i,/tier.?qty/i], breakPrice:[/customtier_price/i,/break.?price/i,/tier.?price/i,/^price$/i],
    category:[/attribute value \(pa_product\)/i,/attribute value \(pa_theme\)/i,/^category$/i,/^type$/i],
    colours:[/attribute value \(pa_colou?rs?\)/i,/^colou?rs?$/i], eco:[/attribute value \(pa_eco/i,/^eco/i,/sustain/i],
    lead:[/attribute value \(pa_lead/i,/^lead.?time/i], methods:[/attribute value \(pa_print-method\)/i,/^print.?method/i,/decorat/i],
    image:[/^image url$/i,/image featured/i,/external product url/i,/^image/i] };
  function autoMap(cols){ const m={}; FIELDS.forEach(([k])=>{ const pats=GUESS[k]||[]; let hit=''; for(const p of pats){ const c=cols.find(col=>p.test(col)); if(c){hit=c;break;} } m[k]=hit; }); return m; }
  const PRODUCT_DEPT=[ [/bag|tote|backpack|pouch|drawstring/i,'Bags'],[/bottle|mug|cup|tumbler|flask|drink/i,'Drinkware'],
    [/pen|pencil|highlighter|stylus|jotter|sticky|card/i,'Writing'],[/notebook|journal|planner|diary/i,'Notebooks'],
    [/desk|mouse|coaster|charger|cable|power|tech|gadget|screen|ear/i,'Tech'],[/umbrella|blanket|cooler|outdoor|festival|sun/i,'Outdoor'],
    [/lanyard|badge|banner|wristband|flag/i,'Exhibition'],[/t-?shirt|polo|hoodie|cap|apparel|cloth|sock/i,'Clothing'] ];
  function toDept(v){ v=decode(v||''); for(const [re,d] of PRODUCT_DEPT){ if(re.test(v)) return d; } return 'Lifestyle'; }
  function ecoScore(v){ v=decode(v||'').toLowerCase(); if(/biodegrad|compost/.test(v))return 9; if(/recycled|part recycled/.test(v))return 8; if(/recyclable|recycle/.test(v))return 7; if(/natural/.test(v))return 7; if(/none|^$/.test(v))return 5; return 6; }
  function leadDays(v){ const m=decode(v||'').match(/(\d+)\s*days?/i); return m?+m[1]:10; }
  const METHOD_MAP=[[/engrav|laser/i,'laser'],[/sublimation/i,'dtf'],[/digital|full colour print|printed label|printed box|printed card/i,'dtf'],[/1 colour|one colour|direct print/i,'pad'],[/transfer/i,'transfer'],[/embroider|sew in/i,'embroidery']];
  function toMethods(v){ const txt=decode(v||''); const out=new Set(); METHOD_MAP.forEach(([re,m])=>{ if(re.test(txt))out.add(m); }); return out.size?[...out]:['dtf']; }
  function splitColours(v){ return decode(v||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean); }
  function transformCsv(row, cols, map){
    const get=k=>{ const c=map[k]; return c?row[cols.indexOf(c)]:''; };
    const name=decode(get('name')); if(!name) return null;
    const qtys=(get('breakQty')||'').split('|').map(s=>+s.trim()).filter(Boolean);
    const prices=(get('breakPrice')||'').split('|').map(s=>parseFloat(s));
    const breaks=qtys.map((q,i)=>({q,unit:isNaN(prices[i])?null:prices[i]})).filter(b=>b.q);
    const priced=breaks.filter(b=>b.unit!=null);
    return { code:decode(get('code'))||name.slice(0,12), name, dept:toDept(get('category')), cat:decode(get('category')).split(/[,;]/)[0].trim(),
      priceFrom:priced.length?priced[priced.length-1].unit:null, breaks, moq:qtys[0]||50, lead:leadDays(get('lead')),
      sustainability:ecoScore(get('eco')), colours:splitColours(get('colours')), methods:toMethods(get('methods')),
      image:(get('image')||'').split(/[|,]/)[0].trim(),
      _gaps:(!priced.length?['price']:[]).concat(breaks.some(b=>b.unit==null)?['partial-price']:[]) }; }

  /* ===================== shared state + modal shell ===================== */
  const S={ mode:null, supplier:'', supId:null, step:1,
    csv:{ RAW:null, COLS:null, ROWS:null, MAP:null },
    js:{ files:[], res:null } };
  const STEPS=['Source','Map & normalise','Preview & import'];

  function open(opts){
    opts=opts||{};
    Object.assign(S,{mode:null,supplier:opts.supplier||'',supId:opts.supId||null,step:1}); S.csv={RAW:null,COLS:null,ROWS:null,MAP:null}; S.js={files:[],res:null};
    let panel=document.getElementById('panel-import');
    if(!panel){ panel=document.createElement('div'); panel.className='panel'; panel.id='panel-import'; (document.querySelector('.appmain')||document.body).appendChild(panel); }
    // activate the import panel (full page within the admin shell), clear sidebar highlight
    document.querySelectorAll('.appmain .panel').forEach(p=>p.classList.toggle('active',p===panel));
    document.querySelectorAll('.anav').forEach(b=>b.classList.remove('active'));
    panel.innerHTML=`<div class="imp-page">
      <div class="imp-pagehd">
        <button class="imp-back" data-ix><svg class="icn" style="width:15px;height:15px;transform:rotate(180deg)"><use href="#a-arr"/></svg>${S.supId?'Back to supplier':'Back to products'}</button>
        <div class="imp-pagetitle"><h1 class="ptitle">Import products</h1><p class="psub">Bring a supplier's catalogue into the platform — upload a feed, map it to the platform fields, preview, and import.</p></div>
      </div>
      <div class="imp-steps" id="impSteps"></div>
      <div class="imp-body" id="impBody"></div>
    </div>`;
    panel.querySelector('[data-ix]').onclick=close;
    window.scrollTo({top:0,behavior:'instant'});
    renderSteps(); step1();
  }
  function close(){
    if(S.supId && window.__openSupplier){ const n=document.querySelector('.anav[data-nav="suppliers"]'); if(n)n.click(); window.__openSupplier(S.supId); }
    else { const n=document.querySelector('.anav[data-nav="products"]'); if(n)n.click(); }
  }
  function renderSteps(){ const el=document.getElementById('impSteps'); if(!el)return;
    el.innerHTML=STEPS.map((s,i)=>`<div class="imp-stp ${i+1===S.step?'on':''} ${i+1<S.step?'done':''}"><b>${i+1}</b><span>${s}</span></div>`).join('<i class="imp-stpsep"></i>'); }
  function go(step){ S.step=step; renderSteps(); }

  /* ===================== STEP 1 — source ===================== */
  function step1(){
    go(1);
    document.getElementById('impBody').innerHTML=`
      ${S.supplier?`<div class="imp-ctx">Importing products for <b>${esc(S.supplier)}</b></div>`:''}
      <p class="imp-sub">Upload a supplier export — a <b>CSV</b> (WooCommerce-style) or one or more <b>JSON feeds</b> (price / print / stock). The platform detects the shape and maps it to the catalogue. <b>API feeds run the same pipeline.</b></p>
      <div class="imp-drop" id="impDrop"><svg class="icn" style="width:26px;height:26px"><use href="#a-box"/></svg><b>Choose feed file(s)</b><span>CSV, or JSON (select all of a multi-feed set together)</span>
        <div class="imp-dropbtns"><label class="btn sm">Browse…<input type="file" accept=".csv,.json,.txt,application/json" id="impFile" multiple hidden></label></div></div>
      <div class="imp-samples"><span class="imp-samlbl">Or use a sample feed</span>
        <div class="imp-sambtns">
          <button class="imp-samp" id="sampPFC"><b>PF Concept</b><span>5-feed JSON · product ×2 · price · print · stock</span></button>
          <button class="imp-samp" id="sampBio"><b>Bio Labs</b><span>411-row WooCommerce CSV</span></button>
        </div></div>
      <div class="imp-err" id="impErr"></div>`;
    document.getElementById('impFile').onchange=e=>onFiles([...e.target.files]);
    const drop=document.getElementById('impDrop');
    drop.ondragover=e=>{e.preventDefault();drop.classList.add('over');}; drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); onFiles([...e.dataTransfer.files]); };
    document.getElementById('sampPFC').onclick=async()=>{ try{ const names=['productfeed-1.json','productfeed-2.json','pricefeed_9dcba4da_ea55_2788_c114_085cd8f5a4cb_v3.json','printpricefeed_9dcba4da_ea55_2788_c114_085cd8f5a4cb_v3.json','stockfeed_9dcba4da_ea55_2788_c114_085cd8f5a4cb_v3.json'];
      const files=await Promise.all(names.map(async n=>({name:n, text:await (await fetch('uploads/'+n)).text()}))); routeFiles(files); }
      catch(err){ document.getElementById('impErr').textContent='Could not load the PF Concept sample.'; } };
    document.getElementById('sampBio').onclick=async()=>{ try{ const text=await (await fetch('uploads/Products-Export-2026-May-22-0932.csv')).text(); routeFiles([{name:'Products-Export-2026-May-22-0932.csv', text}]); }
      catch(err){ document.getElementById('impErr').textContent='Could not load the Bio Labs sample.'; } };
  }
  function onFiles(fileList){ if(!fileList.length)return;
    Promise.all(fileList.map(f=>new Promise(res=>{ const rd=new FileReader(); rd.onload=()=>res({name:f.name,text:rd.result}); rd.readAsText(f); })))
      .then(routeFiles).catch(()=>{ const e=document.getElementById('impErr'); if(e)e.textContent='Could not read the file(s).'; }); }
  // decide CSV vs JSON; parse JSON files; dispatch to the right step 2
  function routeFiles(files){
    const parsed=files.map(f=>{ let json=null; const t=(f.text||'').trim(); if(t[0]==='{'||t[0]==='['){ try{ json=JSON.parse(t); }catch(e){} } return {name:f.name, text:f.text, json}; });
    const jsonFiles=parsed.filter(f=>f.json);
    if(jsonFiles.length && window.MSFEED){ S.mode='json'; S.js.files=jsonFiles; step2json(); return; }
    // CSV
    const csvFile=parsed.find(f=>!f.json) || parsed[0];
    S.mode='csv'; S.supplier=S.supplier||guessSupplier(csvFile.name)||'Bio Labs';
    S.csv.RAW=parseCSV(csvFile.text); S.csv.COLS=S.csv.RAW[0];
    S.csv.ROWS=S.csv.RAW.slice(1).filter(r=>r.length>1);
    S.csv.MAP=autoMap(S.csv.COLS); window.__impFileName=csvFile.name; step2csv();
  }
  function guessSupplier(name){ const n=(name||'').toLowerCase(); if(/bio/.test(n))return 'Bio Labs'; if(/pf|concept/.test(n))return 'PF Concept'; return ''; }

  /* ===================== STEP 2 (CSV) — field mapping ===================== */
  function step2csv(){
    go(2); const {COLS,ROWS,MAP}=S.csv;
    const reqMapped=FIELDS.filter(f=>f[2]&&MAP[f[0]]).length, reqTotal=FIELDS.filter(f=>f[2]).length;
    const optionList=c=>`<option value="">— not mapped —</option>`+COLS.map(col=>`<option value="${esc(col)}" ${MAP[c]===col?'selected':''}>${esc(col.length>46?col.slice(0,44)+'…':col)}</option>`).join('');
    document.getElementById('impBody').innerHTML=`
      <label class="imp-supl"><span>Supplier</span><input id="impSup" value="${esc(S.supplier)}"></label>
      <div class="imp-stat"><div><b>${ROWS.length}</b><span>rows</span></div><div><b>${COLS.length}</b><span>columns</span></div><div class="${reqMapped===reqTotal?'ok':'warn'}"><b>${reqMapped}/${reqTotal}</b><span>required mapped</span></div></div>
      <h4 class="imp-h">Field mapping <span>auto-detected — adjust any row</span></h4>
      <div class="imp-map">${FIELDS.map(([k,lbl,req])=>`<div class="imp-row ${req&&!MAP[k]?'miss':''}"><div class="imp-pl">${lbl}${req?'<i>req</i>':''}</div><svg class="icn imp-arr" style="width:14px;height:14px"><path d="M5 12h14M13 6l6 6-6 6"/></svg><select data-map="${k}">${optionList(k)}</select></div>`).join('')}</div>
      <h4 class="imp-h">Live preview <span>first 3 rows, transformed</span></h4><div id="impPreview"></div>
      <div class="imp-foot"><button class="btn ghost" data-back>← Back</button><button class="btn" id="impGo" ${reqMapped<reqTotal?'disabled':''}>Import ${ROWS.length} products →</button></div>`;
    document.getElementById('impSup').oninput=e=>S.supplier=e.target.value;
    document.querySelectorAll('[data-map]').forEach(sel=>sel.onchange=()=>{ MAP[sel.dataset.map]=sel.value; step2csv(); });
    document.getElementById('impGo').onclick=doImportCsv;
    document.querySelector('[data-back]').onclick=step1;
    previewCsv();
  }
  function previewCsv(){ const host=document.getElementById('impPreview'); if(!host)return;
    const items=S.csv.ROWS.map(r=>transformCsv(r,S.csv.COLS,S.csv.MAP)).filter(Boolean).slice(0,3);
    host.innerHTML=items.length?items.map(p=>`<div class="imp-pv ${p._gaps.length?'gap':''}">
      <div class="imp-pvtop"><b>${esc(p.name)}</b><span class="imp-pvdept">${p.dept}</span></div>
      <div class="imp-pvmeta">SKU ${esc(p.code)} · ${p.priceFrom!=null?'from '+gbp(p.priceFrom):'<span class="imp-nogap">no price</span>'} · ♻ ${p.sustainability} · ${p.lead}d · ${p.methods.join(', ')}</div>
      <div class="imp-pvbreaks">${p.breaks.map(b=>`<span class="${b.unit==null?'imp-bnull':''}">${b.q}: ${b.unit==null?'—':gbp(b.unit)}</span>`).join('')}</div>
      ${p.colours.length?`<div class="imp-pvcol">${p.colours.slice(0,8).map(c=>esc(c)).join(' · ')}</div>`:''}
      ${p._gaps.length?`<div class="imp-pvgap">⚠ ${p._gaps.includes('price')?'No usable price — imports as needs-attention':'Some price tiers blank'}</div>`:''}
    </div>`).join(''):`<p class="imp-warn-txt">No rows transform with the current mapping — check the required fields.</p>`; }
  function doImportCsv(){
    const all=S.csv.ROWS.map(r=>transformCsv(r,S.csv.COLS,S.csv.MAP)).filter(Boolean);
    const good=all.filter(p=>p.priceFrom!=null);
    MSCAT.ingest(S.supplier, all);
    let matched=autoFile(all, S.supplier);
    close();
    const gaps=all.length-good.length; const notes=[];
    if(gaps) notes.push(`${gaps} with no usable price (needs-attention)`);
    notes.push(`${matched} auto-filed to sub-categories`);
    const unmapped=FIELDS.filter(f=>!S.csv.MAP[f[0]]).map(f=>f[1]); if(unmapped.length) notes.push('Unmapped: '+unmapped.join(', '));
    if(MSCAT.logImport) MSCAT.logImport(S.supplier,{ source:(window.__impFileName||'CSV upload'), total:all.length, priced:good.length, gaps, filed:matched, notes });
    toast(`Imported ${all.length} from ${S.supplier} · ${good.length} priced${matched?` · ${matched} auto-filed`:''}`);
    if(window.MSProducts) MSProducts.render();
    if(S.supId && window.__openSupplier) window.__openSupplier(S.supId);
  }

  /* ===================== STEP 2 (JSON) — adapter + value mapping ===================== */
  function reparseJson(){ S.js.res=MSFEED.parse(S.js.files); if(!S.supplier && S.js.res.adapter) S.supplier=S.js.res.adapter.name; }
  function step2json(){
    go(2); if(!S.js.res) reparseJson();
    const r=S.js.res, a=r.adapter;
    if(!a){ document.getElementById('impBody').innerHTML=`<div class="imp-unknown">⚠ ${esc((r.warnings[0]||'Unrecognised feed.'))}</div>
      <div class="imp-foot"><button class="btn ghost" data-back>← Back</button></div>`; document.querySelector('[data-back]').onclick=step1; return; }
    if(a.stub){ document.getElementById('impBody').innerHTML=`<div class="imp-unknown">The <b>${esc(a.name)}</b> feed was recognised, but its adapter isn't built yet.<br><span>${esc(r.warnings[0]||'')}</span></div>
      <div class="imp-foot"><button class="btn ghost" data-back>← Back</button></div>`; document.querySelector('[data-back]').onclick=step1; return; }

    const prods=r.products;
    // distinct category codes + their resolved dept
    const cats={}; prods.forEach(p=>{ const dim=p.group?'prodGroup':'groupDesc'; const c=p.group||p.groupDesc||p.cat||'—'; (cats[c]=cats[c]||{count:0,dept:p.dept,name:p.name,dim}); cats[c].count++; });
    // distinct method-code prefixes from decoration
    const prefixes={}; prods.forEach(p=>(p.decoration||[]).forEach(d=>{ const m=(d.code||'').match(/^[A-Za-z]+/); const pre=m?m[0].toUpperCase():'?'; (prefixes[pre]=prefixes[pre]||{count:0,method:d.method,eg:d.impMethod}); prefixes[pre].count++; }));
    const DEPTS=MSFEED.DEPTS, METHODS=(MSCAT.METHODS||['screenprint','pad','transfer','dtf','embroidery','laser']);
    document.getElementById('impBody').innerHTML=`
      <div class="imp-adapter"><div class="imp-adhd"><span class="imp-adtag">${esc(a.name)}</span><span class="imp-adfmt">${esc(a.format)}</span></div>
        <label class="imp-supl tight"><span>Supplier</span><input id="impSup" value="${esc(S.supplier)}"></label></div>
      <div class="imp-stat">
        <div><b>${r.stats.products}</b><span>products</span></div>
        <div><b>${r.stats.variants}</b><span>variants</span></div>
        <div class="${r.stats.gaps?'warn':'ok'}"><b>${r.stats.priced}/${r.stats.products}</b><span>priced</span></div>
        <div><b>${r.stats.withDeco}</b><span>with decoration</span></div>
        <div><b>${r.stats.withStock}</b><span>with stock</span></div></div>
      ${r.warnings.length?`<div class="imp-warns">${r.warnings.map(w=>`<div>• ${esc(w)}</div>`).join('')}</div>`:''}
      <h4 class="imp-h">Field coverage <span>platform fields this feed fills · <button class="imp-link" id="impManageFields">Manage fields →</button></span></h4>
      <div class="imp-cov">${(window.MSFIELDS?MSFIELDS.all():[]).map(f=>{ const cov=(a.coverage||[]).find(c=>c[0]===f.key); const st=cov?cov[2]:'gap'; const src=cov?cov[1]:(f.builtin?'—':'custom · map below'); return `<div class="imp-covcell ${st}"><b>${esc(f.label)}</b><span>${esc(src)}</span></div>`; }).join('')}</div>
      <h4 class="imp-h">Value mapping · Categories <span>${Object.keys(cats).length} source codes → department</span></h4>
      <div class="imp-vm">${Object.keys(cats).sort().map(c=>{ const o=cats[c]; return `<div class="imp-vmrow"><div class="imp-vmk"><b>${esc(c)}</b><span>${o.count} product${o.count>1?'s':''}</span></div>
        <svg class="icn imp-arr" style="width:13px;height:13px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <select data-vmcat="${esc(c)}" data-vmdim="${cats[c].dim}">${DEPTS.map(d=>`<option ${d===o.dept?'selected':''}>${d}</option>`).join('')}</select></div>`; }).join('')}</div>
      <h4 class="imp-h">Value mapping · Print methods <span>${Object.keys(prefixes).length} code families → platform method</span></h4>
      <div class="imp-vm">${Object.keys(prefixes).sort().map(pre=>{ const o=prefixes[pre]; return `<div class="imp-vmrow"><div class="imp-vmk"><b>${esc(pre)}*</b><span>${esc(o.eg||'')} · ${o.count}</span></div>
        <svg class="icn imp-arr" style="width:13px;height:13px"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        <select data-vmmethod="${esc(pre)}">${METHODS.map(m=>`<option ${m===o.method?'selected':''}>${m}</option>`).join('')}</select></div>`; }).join('')}</div>
      <div class="imp-foot"><button class="btn ghost" data-back>← Back</button><button class="btn" id="impNext">Preview ${r.stats.products} products →</button></div>`;
    document.getElementById('impSup').oninput=e=>S.supplier=e.target.value;
    document.querySelectorAll('[data-vmcat]').forEach(sel=>sel.onchange=()=>{ MSFEED.setValueMap(sel.dataset.vmdim||'groupDesc',sel.dataset.vmcat,sel.value); reparseJson(); step2json(); });
    document.querySelectorAll('[data-vmmethod]').forEach(sel=>sel.onchange=()=>{ MSFEED.setValueMap('methodPrefix',sel.dataset.vmmethod,sel.value); reparseJson(); step2json(); });
    document.querySelector('[data-back]').onclick=step1;
    document.getElementById('impNext').onclick=step3json;
    { const mf=document.getElementById('impManageFields'); if(mf&&window.MSFieldManager) mf.onclick=()=>MSFieldManager.open(()=>step2json()); }
  }

  /* ===================== STEP 3 (JSON) — preview & import ===================== */
  function step3json(){
    go(3); const r=S.js.res, prods=r.products;
    const show=prods.slice(0,12);
    document.getElementById('impBody').innerHTML=`
      <p class="imp-sub">Importing <b>${prods.length} products</b> (${r.stats.variants} variants) from <b>${esc(S.supplier)}</b> into the catalogue. Decoration cost tables and stock join in.</p>
      <div id="impPreview">${show.map(p=>previewCardJson(p)).join('')}</div>
      ${prods.length>show.length?`<p class="imp-more">+ ${prods.length-show.length} more…</p>`:''}
      <div class="imp-foot"><button class="btn ghost" data-back>← Back</button><button class="btn" id="impGo">Import ${prods.length} products →</button></div>`;
    document.querySelector('[data-back]').onclick=step2json;
    document.getElementById('impGo').onclick=doImportJson;
    document.querySelectorAll('[data-prevcode]').forEach(b=>b.onclick=()=>previewInStore(b.dataset.prevcode));
  }
  // stage a not-yet-imported product and open the store product page in an in-page preview
  // overlay (distributor view). Uses an iframe rather than a popup tab (popups are blocked
  // in embedded previews); the store reads the staged product from localStorage.
  function previewInStore(code){
    const prod=(S.js.res&&S.js.res.products||[]).find(p=>String(p.code)===String(code)); if(!prod) return;
    const slim=MSFEED.slim?MSFEED.slim(prod):Object.assign({},prod);
    slim.id='preview-'+code; slim.supplier=S.supplier||(S.js.res.adapter&&S.js.res.adapter.name)||'Feed';
    try{ localStorage.setItem('ms-store-preview', JSON.stringify(slim)); }catch(e){}
    const url='Merchsmith Store.html#product='+encodeURIComponent(slim.id)+'&preview=1';
    let ov=document.getElementById('impPrevOv'); if(!ov){ ov=document.createElement('div'); ov.id='impPrevOv'; ov.className='imp-prevov'; document.body.appendChild(ov); }
    ov.innerHTML=`<div class="imp-prevwin">
      <div class="imp-prevbar"><b>Store preview</b><span>${esc(slim.name)} — distributor view · not imported</span>
        <a class="imp-prevopen" href="${url}" target="_blank">Open in new tab ↗</a>
        <button class="imp-prevx" data-prevclose>×</button></div>
      <iframe class="imp-prevframe" src="${url}" title="Store preview"></iframe>
    </div>`;
    requestAnimationFrame(()=>ov.classList.add('on'));
    ov.onclick=e=>{ if(e.target===ov||e.target.closest('[data-prevclose]')){ ov.classList.remove('on'); setTimeout(()=>ov.remove(),180); } };
  }
  function previewCardJson(p){
    const deco=(p.decoration||[]).map(d=>{ const b0=(d.breaks&&d.breaks[0])?d.breaks[0].price:null;
      return `<span class="imp-decotag ${d.unresolved?'unres':''}">${esc(d.method)}${d.setup?` · setup ${gbp(d.setup)}`:''}${b0!=null?` · ${gbp(b0)}/u`:''}${d.dependence==='Size'?' · size':''}</span>`; }).join('');
    const st=p.stock||{};
    const colours=(p.colours||[]).slice(0,8).map(c=>`<span class="imp-sw" title="${esc(c.name||c)}" style="background:${c.hex?'#'+esc(c.hex):'#ccc'}"></span>`).join('');
    const attrs=[ p.brand, p.material, p.origin, p.carton?('carton '+p.carton):'' ].filter(Boolean).slice(0,4).map(a=>`<span class="imp-attr">${esc(a)}</span>`).join('');
    const thumb=p.image?`<div class="imp-pvthumb"><img src="${esc(p.image)}" alt="" onerror="this.style.display='none';this.parentNode.classList.add('noimg')"></div>`:`<div class="imp-pvthumb noimg">${esc((p.name||'?').slice(0,1))}</div>`;
    return `<div class="imp-pv withthumb ${p._gaps.length?'gap':''}">
      ${thumb}
      <div class="imp-pvmain">
      <div class="imp-pvtop"><b>${esc(p.name)}</b><span class="imp-pvdept">${p.dept}</span>${p.subcat?`<span class="imp-pvsub">${esc(p.subcat)}</span>`:''}${p.clearance?'<span class="imp-clr">clearance</span>':''}</div>
      <div class="imp-pvmeta">${esc(p.code)} · ${p.variantCount||1} variant${(p.variantCount||1)>1?'s':''} · ${p.priceFrom!=null?'cost from '+gbp(p.priceFrom):'<span class="imp-nogap">POA</span>'} · ♻ ${p.sustainability} · ${p.lead}d</div>
      ${attrs?`<div class="imp-pvattrs">${attrs}</div>`:''}
      ${colours?`<div class="imp-pvsw">${colours}${(p.colours||[]).length>8?`<span class="imp-swmore">+${p.colours.length-8}</span>`:''}</div>`:''}
      <div class="imp-pvbreaks">${(p.breaks||[]).map(b=>`<span>${b.q}: ${b.unit==null?'—':gbp(b.unit)}</span>`).join('')}</div>
      ${deco?`<div class="imp-pvdeco">${deco}</div>`:''}
      ${st.total!=null&&st.total?`<div class="imp-pvstock">stock ${Number(st.total).toLocaleString()} ${st.locations&&st.locations.length?'· '+st.locations.join('/'):''}</div>`:''}
      ${p._gaps.length?`<div class="imp-pvgap">⚠ ${p._gaps.includes('price')?'No price (POA)':''}${p._gaps.includes('deco')?' · unresolved decoration code(s)':''}${p._gaps.includes('attrs')&&!p._gaps.includes('price')?' · no product attributes':''}</div>`:''}
      <div class="imp-pvact"><button class="imp-prevbtn" data-prevcode="${esc(p.code)}"><svg class="icn" style="width:14px;height:14px"><use href="#a-eye"/></svg>Preview in store</button></div>
      </div>
    </div>`;
  }
  function doImportJson(){
    const r=S.js.res, prods=r.products;
    // slim each product to a persistence-safe shape (drops 18k+ per-variant arrays) before ingest
    const slim=prods.map(p=>MSFEED.slim?MSFEED.slim(p):p);
    MSCAT.ingest(S.supplier, slim);
    // persist the shared decoration cost book ONCE per supplier (keyed by printCode) for the price engine
    if(r.decoBook){ try{ const k='ms-deco-books'; const all=JSON.parse(localStorage.getItem(k)||'{}'); all[S.supplier]=r.decoBook; localStorage.setItem(k, JSON.stringify(all)); }catch(e){} }
    const matched=autoFile(prods, S.supplier);
    close();
    const notes=[`${r.stats.variants} variants`, `${r.stats.withDeco} with decoration costs`, `${r.stats.withStock} with stock`, `${matched} auto-filed`];
    if(r.stats.gaps) notes.unshift(`${r.stats.gaps} unpriced (needs-attention)`);
    if(MSCAT.logImport) MSCAT.logImport(S.supplier,{ source:S.js.files.map(f=>f.name).join(' + '), total:prods.length, priced:r.stats.priced, gaps:r.stats.gaps, filed:matched, notes });
    toast(`Imported ${prods.length} from ${S.supplier} · ${r.stats.priced} priced · ${r.stats.withDeco} with decoration`);
    if(window.MSProducts) MSProducts.render();
    if(S.supId && window.__openSupplier) window.__openSupplier(S.supId);
  }

  /* ===================== shared: auto-file to sub-categories ===================== */
  function autoFile(all, supplier){ if(!window.MSSTORE) return 0;
    const DEPTID={Bags:'bags',Clothing:'clothing',Desk:'desk',Drinkware:'drinkware',Exhibition:'exhibition',Lifestyle:'lifestyle',Notebooks:'notebooks',Outdoor:'outdoor',Tech:'tech',Writing:'writing'};
    const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); let matched=0;
    all.forEach(p=>{ const pid='ing-'+supplier+'-'+(p.code||''); const did=DEPTID[p.dept]; if(!did)return; const subs=MSSTORE.subcatsOf(did); if(!subs.length)return;
      const hay=norm(p.cat)+' '+norm(p.name); const hits=subs.filter(s=>{ const sn=norm(s.name).replace(/\bbags?\b|\bpens?\b/g,'').trim(); return sn&&(hay.includes(sn)||hay.includes(norm(s.name))); });
      if(hits.length){ MSSTORE.addProductsToSubcat([pid], hits[0].id); matched++; } });
    return matched; }

  /* ===================== styles ===================== */
  (function(){ if(document.getElementById('imp-style'))return; const st=document.createElement('style'); st.id='imp-style';
    st.textContent=`
    .imp-page{max-width:1080px;}
    .imp-pagehd{margin-bottom:22px;}
    .imp-back{display:inline-flex;align-items:center;gap:6px;border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;margin-bottom:14px;}
    .imp-back .icn{stroke:currentColor;fill:none;stroke-width:2;}
    .imp-pagetitle h1{margin:0;}
    .imp-steps{display:flex;align-items:center;gap:10px;padding:0 0 18px;margin-bottom:22px;border-bottom:1px solid var(--line-soft);}
    .imp-stp{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;font-weight:700;}
    .imp-stp b{width:23px;height:23px;border-radius:50%;background:var(--paper-2);border:1.5px solid var(--line-soft);display:flex;align-items:center;justify-content:center;font-size:11.5px;color:var(--muted);}
    .imp-stp.on{color:var(--ink);} .imp-stp.on b{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;}
    .imp-stp.done b{background:var(--green-deep,#1f8a5b);border-color:var(--green-deep,#1f8a5b);color:#fff;}
    .imp-stpsep{flex:0 0 auto;width:48px;height:1.5px;background:var(--line-soft);}
    .imp-body{padding:0;}
    .imp-sub{font-size:14px;color:var(--ink-2);line-height:1.55;margin:0 0 18px;max-width:680px;}
    .imp-ctx{font-size:13px;color:var(--ink-2);background:var(--tint-peri,#eef);border:1px solid var(--line-soft);border-radius:10px;padding:10px 14px;margin:0 0 16px;} .imp-ctx b{color:var(--ink);}
    .imp-supl{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;} .imp-supl.tight{margin:0;}
    .imp-supl span{font-size:12px;font-weight:700;color:var(--ink-2);}
    .imp-supl input{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 12px;background:#fff;}
    .imp-drop{border:1.5px dashed var(--line);border-radius:14px;padding:28px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--muted);transition:border-color .15s,background .15s;}
    .imp-drop.over{border-color:var(--periwinkle-deep);background:var(--tint-peri);}
    .imp-drop .icn{stroke:var(--periwinkle-deep);stroke-width:1.6;fill:none;} .imp-drop b{font-size:15px;color:var(--ink);}
    .imp-dropbtns{display:flex;gap:10px;margin-top:12px;}
    .imp-samples{margin-top:18px;} .imp-samlbl{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);}
    .imp-sambtns{display:flex;gap:10px;margin-top:9px;flex-wrap:wrap;}
    .imp-samp{flex:1;min-width:200px;text-align:left;background:#fff;border:1.5px solid var(--line-soft);border-radius:12px;padding:12px 14px;cursor:pointer;font:inherit;display:flex;flex-direction:column;gap:2px;}
    .imp-samp:hover{border-color:var(--periwinkle-deep);} .imp-samp b{font-size:14px;color:var(--ink);} .imp-samp span{font-size:11.5px;color:var(--muted);}
    .imp-err{color:var(--flare);font-size:13px;margin-top:10px;}
    .imp-stat{display:flex;gap:9px;margin-bottom:16px;flex-wrap:wrap;}
    .imp-stat>div{flex:1;min-width:74px;background:#fff;border:1px solid var(--line-soft);border-radius:11px;padding:10px 12px;}
    .imp-stat b{font-size:17px;display:block;} .imp-stat span{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);}
    .imp-stat .ok b{color:var(--green-deep,#1f8a5b);} .imp-stat .warn b{color:#9a6b1f;}
    .imp-h{font-size:13px;font-weight:800;margin:18px 0 10px;display:flex;align-items:baseline;gap:9px;}
    .imp-h span{font-size:11.5px;font-weight:600;color:var(--muted);text-transform:none;letter-spacing:0;}
    .imp-map{display:flex;flex-direction:column;gap:7px;}
    .imp-row{display:flex;align-items:center;gap:10px;} .imp-row.miss .imp-pl{color:var(--flare);}
    .imp-pl{width:170px;flex:none;font-size:13px;font-weight:600;color:var(--ink);}
    .imp-pl i{font-style:normal;font-size:9.5px;font-weight:800;text-transform:uppercase;color:var(--flare);margin-left:5px;letter-spacing:.04em;}
    .imp-arr{stroke:var(--line);flex:none;}
    .imp-row select,.imp-vmrow select{flex:1;font:inherit;font-size:12.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:#fff;min-width:0;}
    .imp-row.miss select{border-color:var(--flare);}
    .imp-adapter{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:13px 15px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
    .imp-adhd{display:flex;flex-direction:column;gap:3px;}
    .imp-adtag{font-family:var(--serif);font-size:17px;color:var(--ink);}
    .imp-adfmt{font-size:11.5px;color:var(--muted);}
    .imp-adapter .imp-supl{flex-direction:row;align-items:center;gap:8px;min-width:230px;} .imp-adapter .imp-supl input{padding:7px 10px;}
    .imp-warns{background:var(--paper-2);border-radius:10px;padding:10px 13px;font-size:12px;color:var(--ink-2);line-height:1.6;margin-bottom:4px;}
    .imp-cov{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:7px;}
    .imp-covcell{border:1px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:#fff;}
    .imp-covcell b{font-size:12px;display:block;text-transform:capitalize;} .imp-covcell span{font-size:10.5px;color:var(--muted);}
    .imp-covcell.ok{border-left:3px solid var(--green-deep,#1f8a5b);} .imp-covcell.heur{border-left:3px solid #d3a64e;} .imp-covcell.gap{border-left:3px solid #c0395f;opacity:.7;}
    .imp-link{border:0;background:none;color:var(--periwinkle-deep);font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;padding:0;text-decoration:underline;}
    .imp-vm{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:8px;}
    .imp-vmrow{display:flex;align-items:center;gap:10px;}
    .imp-vmk{width:200px;flex:none;display:flex;flex-direction:column;}
    .imp-vmk b{font-size:12.5px;font-family:ui-monospace,monospace;} .imp-vmk span{font-size:10.5px;color:var(--muted);}
    .imp-pv{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;margin-bottom:9px;}
    .imp-pv.gap{border-color:#e7c98f;background:#fffdf6;}
    .imp-pv.withthumb{display:flex;gap:12px;align-items:flex-start;}
    .imp-pvthumb{width:60px;height:60px;flex:none;border-radius:9px;overflow:hidden;background:#fff;border:1px solid var(--line-soft);display:grid;place-items:center;font-family:var(--serif);font-size:22px;color:var(--ink-3);}
    .imp-pvthumb img{width:100%;height:100%;object-fit:contain;} .imp-pvthumb.noimg{background:var(--paper-2);}
    .imp-pvmain{flex:1;min-width:0;}
    .imp-pvsub{font-size:10.5px;color:var(--muted);background:var(--paper-2);border-radius:6px;padding:2px 8px;}
    .imp-pvattrs{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}
    .imp-attr{font-size:11px;color:var(--ink-2);background:var(--paper-2);border-radius:6px;padding:2px 8px;}
    .imp-pvsw{display:flex;gap:5px;align-items:center;margin-top:7px;}
    .imp-sw{width:15px;height:15px;border-radius:50%;border:1px solid rgba(0,0,0,.15);flex:none;}
    .imp-swmore{font-size:11px;color:var(--muted);}
    .imp-pvtop{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;} .imp-pvtop b{font-size:14.5px;}
    .imp-pvdept{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--periwinkle-deep);background:var(--tint-peri);border-radius:6px;padding:2px 8px;}
    .imp-clr{font-size:10px;font-weight:800;text-transform:uppercase;color:#b02a4f;background:#fbe0e6;border-radius:6px;padding:2px 7px;}
    .imp-pvmeta{font-size:12.5px;color:var(--ink-2);margin-top:5px;} .imp-nogap{color:var(--flare);font-weight:700;}
    .imp-pvbreaks{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;}
    .imp-pvbreaks span{background:var(--paper-2);border-radius:6px;padding:2px 8px;font-variant-numeric:tabular-nums;} .imp-pvbreaks .imp-bnull{color:var(--flare);}
    .imp-pvdeco{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
    .imp-decotag{font-size:11px;background:var(--tint-peri,#eef);color:var(--periwinkle-deep);border-radius:6px;padding:2px 8px;font-weight:600;}
    .imp-decotag.unres{background:#fbe0e6;color:#b02a4f;}
    .imp-pvstock{font-size:11.5px;color:var(--muted);margin-top:7px;font-variant-numeric:tabular-nums;}
    .imp-pvcol{font-size:11.5px;color:var(--muted);margin-top:7px;}
    .imp-pvgap{font-size:12px;color:#9a6b1f;margin-top:8px;font-weight:600;}
    .imp-more{font-size:12.5px;color:var(--muted);text-align:center;margin:2px 0 0;}
    .imp-pvact{margin-top:10px;}
    .imp-prevbtn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;font-weight:700;color:var(--periwinkle-deep);background:var(--tint-peri,#eef);border:1px solid var(--line-soft);border-radius:8px;padding:6px 11px;cursor:pointer;}
    .imp-prevbtn:hover{border-color:var(--periwinkle-deep);}
    .imp-prevbtn .icn{stroke:currentColor;fill:none;stroke-width:1.7;}
    .imp-prevov{position:fixed;inset:0;z-index:320;background:rgba(22,24,28,.55);backdrop-filter:blur(3px);opacity:0;transition:opacity .18s;display:flex;align-items:center;justify-content:center;padding:24px;}
    .imp-prevov.on{opacity:1;}
    .imp-prevwin{background:#fff;border-radius:16px;width:min(1100px,100%);height:min(86vh,920px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(20,22,45,.4);}
    .imp-prevbar{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line-soft);flex:none;}
    .imp-prevbar b{font-size:14px;} .imp-prevbar span{font-size:12.5px;color:var(--muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .imp-prevopen{font-size:12px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;white-space:nowrap;}
    .imp-prevx{border:0;background:none;font-size:24px;line-height:1;color:var(--muted);cursor:pointer;}
    .imp-prevframe{flex:1;width:100%;border:0;}
    .imp-unknown{background:#fffdf6;border:1px solid #e7c98f;border-radius:12px;padding:18px;font-size:13.5px;color:var(--ink-2);line-height:1.6;}
    .imp-unknown span{font-size:12px;color:var(--muted);}
    .imp-foot{display:flex;gap:10px;justify-content:space-between;margin-top:24px;padding-top:18px;border-top:1px solid var(--line-soft);}
    #impPreview{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px;}
    #impPreview .imp-pv{margin-bottom:0;}
    .imp-foot .btn:last-child{margin-left:auto;}
    .imp-warn-txt{font-size:13px;color:#9a6b1f;}
    `;
    document.head.appendChild(st);
  })();

  window.MSImport={ open };
})();
