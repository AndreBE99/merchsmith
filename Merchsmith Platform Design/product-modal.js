/* ============================================================
   product-modal.js  —  shared product-modal data + renderers
   Loaded by Merchsmith Dashboard.html and Merchsmith Gallery.html.
   Owns the rich body of each workflow tab (Design / Price / Sample /
   Stock); the status-card pill + CTA stay with the host page.

   Host calls:
     MSModal.body(p, tabKey, ctx)  -> HTML string for the tab info body
     MSModal.wire(p, tabKey, ctx)  -> attach interactivity after render
   ctx = { role:'dist'|'cust', gbp, refresh(), persist(), log(msg) }
   ============================================================ */
(function(){
  'use strict';

  // ---- colour swatches (name -> hex) ----
  const SW = {
    'Volcanic Black':'#1a1a1e','Black':'#1a1a1e','Aqua Blue':'#7fd4d1','Aqua':'#7fd4d1',
    'Green':'#3a9d6b','Grey':'#8a8a93','Dark Blue':'#2a3550','Light Grey':'#c8c8cf',
    'White':'#f4f4f0','Natural':'#e9e2d0','Charcoal':'#3a3a40','Navy':'#23304d',
    'Stone':'#d8d2c4','Cork':'#c9a36a','Birch':'#e6d2a8','Kraft':'#c8a878',
    'Wheat':'#e3d6b0','Orange':'#e8893a','Terracotta':'#c66a4a'
  };
  const hex = n => SW[n] || '#bbb';
  // nearest Pantone for colours without an explicit PMS
  const NEAREST_PMS = {
    'Volcanic Black':'PMS Black 6 C','Black':'PMS Black 6 C','White':'PMS 11-0601 TCX','Natural':'PMS 7527 C',
    'Charcoal':'PMS 425 C','Navy':'PMS 533 C','Grey':'PMS Cool Gray 8 C','Light Grey':'PMS Cool Gray 4 C',
    'Kraft':'PMS 7508 C','Cork':'PMS 7510 C','Birch':'PMS 7501 C','Terracotta':'PMS 7522 C',
    'Aqua Blue':'PMS 7466 C','Aqua':'PMS 7466 C','Green':'PMS 348 C','Sprout':'PMS 360 C',
    'Blue':'PMS 285 C','Dark Blue':'PMS 533 C','Wheat':'PMS 7501 C','Stone':'PMS 7528 C','Orange':'PMS 1585 C'
  };
  const pmsOf = c => (c && c.pms && c.pms!=='PMS NA') ? c.pms : (NEAREST_PMS[c&&c.name]||'PMS Cool Gray 4 C');
  function decoLabel(m, n){
    if(!m || m.basis==='unbranded') return 'Unbranded';
    if(m.maxColours>1) return (n||1)+' print colour'+((n||1)>1?'s':'');
    if(m.name==='Laser engrave') return 'Single tone';
    return 'Full colour';
  }
  // migrate older {method, positions:[{code,colours:[]}]} model -> per-position {method,numColours} + productColour
  function normChosen(d){
    if(!d || d._normed) return; d._normed=true;
    const ch=d.branding.chosen;
    if(!ch.productColour) ch.productColour = (d.colours[0]||{}).name || '';
    ch.positions = (ch.positions||[]).map(pos=>{
      if(pos.method) return pos;
      const n = (pos.colours||[]).filter(c=>c && c!=='Full colour').length || 1;
      return { code:pos.code, method: ch.method || (d.branding.methods[0]||'none'), numColours:n };
    });
  }

  // ---- branding method catalogue ----
  // unit = setup (per colour / fixed); from = headline 'from' unit price; deco = per-unit decoration run cost by colour-count row × DECO_BREAKS column
  const DECO_BREAKS=[50,100,250,500,1000,2500,5000,10000,20000];
  const METHODS = {
    screenprint:{name:'Screenprint', maxColours:4, unit:25.00, from:0.28, lead:5, basis:'per colour',
      deco:{1:[0.67,0.43,0.31,0.21,0.17,0.15,0.13,0.13,0.13],2:[1.18,0.70,0.51,0.37,0.28,0.25,0.21,0.20,0.20],3:[1.69,0.97,0.76,0.49,0.43,0.42,0.30,0.29,0.26],4:[2.22,1.32,0.98,0.63,0.51,0.50,0.42,0.37,0.37]}},
    transfer:{name:'Transfer', maxColours:1, unit:25.00, from:0.90, lead:2, basis:'full colour',
      deco:{1:[1.18,1.02,0.92,0.90,0.88,0.86,0.85,0.84,0.84]}},
    dtf:{name:'DTF Transfer', maxColours:99, unit:25.00, from:0.86, lead:2, basis:'full colour',
      deco:{1:[1.05,0.94,0.86,0.86,0.86,0.85,0.84,0.83,0.83]}},
    embroidery:{name:'Embroidery fixed', maxColours:12, unit:34.78, from:1.62, lead:5, basis:'per 1000 stitches',
      deco:{1:[2.95,2.40,2.10,1.85,1.62,1.48,1.35,1.28,1.22]}},
    pad:{name:'Pad print', maxColours:2, unit:22.00, from:0.29, lead:3, basis:'per colour',
      deco:{1:[0.62,0.40,0.29,0.22,0.18,0.16,0.14,0.13,0.12],2:[1.05,0.66,0.47,0.35,0.29,0.26,0.22,0.20,0.19]}},
    laser:{name:'Laser engrave', maxColours:1, unit:30.00, from:0.27, lead:4, basis:'single tone',
      deco:{1:[0.84,0.58,0.44,0.33,0.27,0.24,0.21,0.19,0.18]}},
    none:{name:'No decoration', maxColours:0, unit:0, from:0, lead:0, basis:'unbranded'}
  };
  function decoBreakIdx(q){ let i=0; for(let k=0;k<DECO_BREAKS.length;k++){ if(q>=DECO_BREAKS[k]) i=k; } return i; }
  function decoCost(methodKey, colours, q){ const m=METHODS[methodKey]; if(!m||methodKey==='none') return 0; if(!m.deco) return m.from||0; const maxRow=Object.keys(m.deco).length; const c=Math.max(1,Math.min(colours||1,maxRow)); const arr=m.deco[c]||m.deco[1]; return arr[decoBreakIdx(Math.max(1,q))]; }
  function methodSetup(methodKey, colours){ const m=METHODS[methodKey]; if(!m||methodKey==='none') return 0; const c=Math.max(1,colours||1); return m.basis==='per colour'? m.unit*c : m.unit; }

  // deterministic stock filler so we don't hand-type every cell
  function genMatrix(colours, sizes, seed){
    const m={}; let s=seed||7;
    const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
    colours.forEach(c=>{ m[c.name]={}; sizes.forEach(sz=>{
      const r=rnd(); m[c.name][sz]= r<0.12?0 : Math.round((100+r*4900)/50)*50;
    }); });
    return m;
  }

  // ---- per-product modal data ----
  // chosen.positions: [{code, method, colours:[names]}]
  const PD = {};
  function def(name, o){
    const colours=o.colours.map(c=> typeof c==='string'?{name:c,pms:''}:c);
    PD[name]=Object.assign({
      colours, sizes:o.sizes,
      stockSource:o.stockSource||'api',
      stock:o.stock||genMatrix(colours,o.sizes,o.seed||name.length*13),
      incoming:o.incoming||[],
      dims:o.dims||{w:'—',h:'—',d:'—'},
      branding:o.branding,
      price:o.price,
      sample:o.sample||{unbranded:{price:8.45,lead:3}, branded:{price:45.00,lead:10}},
      proofVer:o.proofVer||'1', proofDate:o.proofDate||'02/07/25 16:42',
      productNotes:o.productNotes||'', warnings:o.warnings||'',
      twoSupplier:o.twoSupplier||null
    }, {});
  }

  const PB_STD=[{q:0,unit:9.40},{q:250,unit:7.95},{q:500,unit:5.20},{q:1000,unit:3.85},{q:2000,unit:3.15},{q:3750,unit:2.78},{q:5000,unit:2.45}];

  def('Eco Wheat-Straw Charging Cable',{
    colours:[{name:'Volcanic Black',pms:'PMS 345c'},{name:'Aqua Blue',pms:'PMS 561c'},{name:'Green',pms:'PMS 361c'}],
    sizes:['Small','Medium','Large','X-Large'], stockSource:'api', seed:31,
    incoming:[{colour:'Volcanic Black',size:'X-Large',qty:100,due:'11/11/25'},{colour:'Aqua Blue',size:'Medium',qty:5000,due:'11/11/25'}],
    dims:{w:'50mm',h:'100mm',d:'20mm'},
    branding:{ methods:['screenprint','transfer','dtf','embroidery'], rec:'screenprint',
      positions:[{code:'front',name:'Front',w:30,h:8},{code:'back',name:'Back',w:30,h:8}],
      chosen:{ method:'screenprint', positions:[{code:'front',colours:['Orange','White']},{code:'back',colours:['White']}] } },
    price:{ breaks:PB_STD, itemCost:8.45, delivery:20.00, discountPct:10, additional:[{label:'Express fee',desc:'1-week turnaround vs standard 3 weeks',qty:1,unit:200.00},{label:'Additional design services',desc:'Bespoke artwork origination — 2 hrs',qty:2,unit:45.00}], supplierAdditional:[{label:'Rush production',desc:'Pull-forward on the press schedule',qty:1,unit:120.00},{label:'Courier upgrade',desc:'Pre-10:30 next-day on the blanks',qty:1,unit:38.00}] },
    sample:{unbranded:{price:8.45,lead:3}, branded:{price:45.00,lead:10}},
    proofVer:'1', proofDate:'02/07/25 16:42',
    productNotes:'This product is supplied individually boxed in Xoopar branded packaging.',
    warnings:'We cannot guarantee the longevity of print on this product due to the nature of the item.'
  });

  def('Xoopar Pokket Wireless Mouse',{
    colours:[{name:'Black',pms:'PMS NA'},{name:'White',pms:'PMS NA'}], sizes:['One size'], stockSource:'api', seed:5,
    dims:{w:'95mm',h:'58mm',d:'28mm'},
    branding:{ methods:['pad','dtf'], rec:'pad', positions:[{code:'top',name:'Top',w:40,h:18}],
      chosen:{ method:'pad', positions:[{code:'top',colours:['White']}] } },
    price:{ breaks:[{q:0,unit:14.20},{q:250,unit:12.10},{q:500,unit:10.90},{q:1000,unit:9.60},{q:2500,unit:8.80}], itemCost:9.60, delivery:20.00, discountPct:0, additional:[] }
  });

  def('Tech Travel Bag',{
    colours:[{name:'Charcoal',pms:'PMS NA'},{name:'Navy',pms:'PMS NA'}], sizes:['One size'], stockSource:'manual', seed:12,
    incoming:[{colour:'Navy',size:'One size',qty:300,due:'24/11/25'}],
    dims:{w:'300mm',h:'400mm',d:'120mm'},
    branding:{ methods:['embroidery','transfer','screenprint'], rec:'embroidery', positions:[{code:'front',name:'Front',w:180,h:180}],
      chosen:{ method:'embroidery', positions:[{code:'front',colours:['White','Navy','Orange']}] } },
    price:{ breaks:[{q:0,unit:18.40},{q:100,unit:16.20},{q:250,unit:14.50},{q:500,unit:12.90}], itemCost:14.50, delivery:24.00, discountPct:0, additional:[] }
  });

  def('RPET Document Pouch',{
    colours:[{name:'Black',pms:'PMS NA'},{name:'Grey',pms:'PMS NA'}], sizes:['A5','A4'], stockSource:'api', seed:9,
    dims:{w:'250mm',h:'180mm',d:'15mm'},
    branding:{ methods:['screenprint','dtf'], rec:'screenprint', positions:[{code:'front',name:'Front',w:120,h:60}],
      chosen:{ method:'screenprint', positions:[{code:'front',colours:['White']}] } },
    price:{ breaks:PB_STD, itemCost:4.10, delivery:20.00, discountPct:0, additional:[] }
  });

  // Recycled Cotton Tote — TWO-SUPPLIER example (blank from one supplier, print from another)
  def('Recycled Cotton Tote',{
    colours:[{name:'Natural',pms:'PMS NA'},{name:'Black',pms:'PMS NA'}], sizes:['Standard','Large'], stockSource:'api', seed:21,
    incoming:[{colour:'Black',size:'Large',qty:1000,due:'18/11/25'}],
    dims:{w:'380mm',h:'420mm',d:'—'},
    branding:{ methods:['screenprint','dtf','transfer','embroidery'], rec:'screenprint',
      positions:[{code:'front',name:'Front',w:300,h:300},{code:'back',name:'Back',w:300,h:300}],
      chosen:{ method:'screenprint', positions:[{code:'front',colours:['Black','Orange','White','Navy']}] } },
    price:{ breaks:[{q:0,unit:3.10},{q:250,unit:2.40},{q:500,unit:1.95},{q:1000,unit:1.62},{q:2500,unit:1.38}], itemCost:1.62, delivery:20.00, discountPct:0, additional:[] },
    twoSupplier:{
      product:{ supplier:'BagWorks UK', role:'Product only', detail:'Supplies the blank GRS-certified tote, dispatched to the decorator (not the customer).', lead:6 },
      branding:{ supplier:'PrintHouse Studio', role:'Branding only', detail:'Receives blank stock, screen-prints to the approved proof, then dispatches finished goods.', lead:5 },
      carriage:'Distributor', insurance:'Distributor'
    }
  });

  def('Prodir Ds8 True Biotic Pen',{
    colours:[{name:'White',pms:'PMS NA'},{name:'Blue',pms:'PMS 285c'},{name:'Black',pms:'PMS NA'}], sizes:['One size'], stockSource:'api', seed:3,
    dims:{w:'12mm',h:'140mm',d:'12mm'},
    branding:{ methods:['pad','screenprint'], rec:'pad', positions:[{code:'clip',name:'Clip',w:30,h:6},{code:'barrel',name:'Barrel',w:45,h:7}],
      chosen:{ method:'pad', positions:[{code:'clip',colours:['White']}] } },
    price:{ breaks:[{q:0,unit:1.20},{q:250,unit:0.94},{q:500,unit:0.82},{q:1000,unit:0.71},{q:2500,unit:0.63}], itemCost:0.71, delivery:20.00, discountPct:0, additional:[] }
  });

  def('Seed Pencil Set',{
    colours:[{name:'Natural',pms:'PMS NA'}], sizes:['Set of 6'], stockSource:'mto', seed:1,
    dims:{w:'90mm',h:'190mm',d:'15mm'},
    branding:{ methods:['laser'], rec:'laser', positions:[{code:'sleeve',name:'Sleeve',w:80,h:30}],
      chosen:{ method:'laser', positions:[{code:'sleeve',colours:['Natural']}] } },
    price:{ breaks:[{q:0,unit:3.40},{q:250,unit:2.80},{q:500,unit:2.45}], itemCost:2.45, delivery:20.00, discountPct:0, additional:[] }
  });

  def('Hoton A5 Kraft Paper Notebook',{
    colours:[{name:'Kraft',pms:'PMS NA'}], sizes:['A5'], stockSource:'manual', seed:6,
    dims:{w:'148mm',h:'210mm',d:'12mm'},
    branding:{ methods:['screenprint','dtf'], rec:'screenprint', positions:[{code:'cover',name:'Cover',w:90,h:90}],
      chosen:{ method:'screenprint', positions:[{code:'cover',colours:['Black']}] } },
    price:{ breaks:PB_STD, itemCost:2.10, delivery:20.00, discountPct:0, additional:[] }
  });

  def('Desktop Garden',{
    colours:[{name:'Terracotta',pms:'PMS NA'}], sizes:['One size'], stockSource:'mto', seed:2,
    dims:{w:'120mm',h:'90mm',d:'120mm'},
    branding:{ methods:['dtf'], rec:'dtf', positions:[{code:'front',name:'Front label',w:60,h:40}],
      chosen:{ method:'dtf', positions:[{code:'front',colours:['Full colour']}] } },
    price:{ breaks:[{q:0,unit:6.80},{q:100,unit:5.90},{q:250,unit:5.20}], itemCost:5.20, delivery:20.00, discountPct:0, additional:[] }
  });

  def('Cork Cover Notebook (2024)',{
    colours:[{name:'Cork',pms:'PMS NA'}], sizes:['A5'], stockSource:'api', seed:8,
    dims:{w:'148mm',h:'210mm',d:'14mm'},
    branding:{ methods:['laser'], rec:'laser', positions:[{code:'cover',name:'Cover',w:80,h:80}],
      chosen:{ method:'laser', positions:[{code:'cover',colours:['Natural']}] } },
    price:{ breaks:PB_STD, itemCost:3.20, delivery:20.00, discountPct:0, additional:[] }
  });

  const data = p => { const d=PD[p.name]; if(d) normChosen(d); return d||null; };
  const money = (ctx,n)=> ctx && ctx.gbp ? ctx.gbp(n) : ('£'+Number(n||0).toFixed(2));

  // live quantity per product (kept on the product so it survives tab switches)
  function qtyOf(p){ const d=data(p); if(!d) return p.qty||0; if(!p._mqty){ const bs=d.price.breaks; const firstReal=bs.find(b=>b.q>0)||bs[Math.floor(bs.length/2)]; p._mqty=(p.qty&&p.qty>0)?p.qty:(bs[Math.floor(bs.length/2)].q||firstReal.q); } return p._mqty; }
  function breakFor(breaks,q){ let b=breaks[0]; breaks.forEach(x=>{ if(q>=x.q) b=x; }); return b; }
  // slider uses real (q>0) breaks; the matrix keeps the full set incl. the "from" tier
  function sliderBreaks(d){ const b=d.price.breaks; return b[0].q===0?b.slice(1):b; }
  function fullIdxForQ(d,q){ let idx=0; d.price.breaks.forEach((b,i)=>{ if(q>=b.q) idx=i; }); return idx; }

  // ---- unit sell price incl. decoration (setup absorbed into unit for the customer) ----
  function decoPerUnit(d, q){
    // sum of selected decoration components + setups spread across qty (per-position method)
    let run=0, setup=0;
    (d.branding.chosen.positions||[]).forEach(pos=>{
      const m=METHODS[pos.method]||METHODS.none;
      const colours = m.maxColours>1 ? (pos.numColours||1) : 1;
      run += decoCost(pos.method, colours, q);   // per-unit decoration run cost (qty + colour aware)
      setup += methodSetup(pos.method, colours);
    });
    return { run, setupPerUnit: q>0 ? setup/q : 0, setupTotal:setup };
  }
  const MARKUP_BANDS=[[0,2.20],[60,2.00],[100,1.74],[150,1.67],[250,1.56],[300,1.54],[400,1.49],[500,1.45],[600,1.41],[700,1.39],[800,1.38],[900,1.37],[1000,1.36]];
  function markupFor(totalCost){ let m=MARKUP_BANDS[0][1]; for(let i=0;i<MARKUP_BANDS.length;i++){ if(totalCost>=MARKUP_BANDS[i][0]) m=MARKUP_BANDS[i][1]; } return m; }
  // ---- delivery countries (cost multiplier vs UK) ----
  const PRICE_COUNTRIES=[{name:'United Kingdom',mult:1},{name:'Ireland (ROI)',mult:1.8},{name:'France',mult:2.3}];
  function countriesFor(d){ if(!d.price._countries) d.price._countries=PRICE_COUNTRIES.map(c=>Object.assign({},c)); return d.price._countries; }
  function selCountry(d){ const cs=countriesFor(d); let i=d.price.country||0; if(i>=cs.length){ i=0; d.price.country=0; } return { i, c:cs[i] }; }
  function deliverySupplier(d, q, mult){ const base=d.price.delivery||20; return base*(1+0.35*Math.floor(q/500))*(mult==null?1:mult); }
  function deliveryCharge(d, q, mult){ const m=(mult==null?selCountry(d).c.mult:mult); return Math.round(deliverySupplier(d,q,m)*1.25); }
  function roundUp5(n){ return Math.ceil(n/5)*5; }
  // ---- distributor discounts: site-wide / category / per-customer / per-project / per-product (most-specific active wins) ----
  const DISC_KEY='ms-discounts';
  const DISC_CTX={ customer:'Citrix', project:'Autumn Giveaways' };
  function discDefaults(){ return { sitewide:5, category:{Tech:10}, customer:{Citrix:7.5}, project:{'Autumn Giveaways':10} }; }
  function discountsConfig(){ try{ const j=JSON.parse(localStorage.getItem(DISC_KEY)||'null'); if(j&&typeof j==='object') return Object.assign(discDefaults(), j); }catch(e){} return discDefaults(); }
  function saveDiscountsConfig(c){ try{ localStorage.setItem(DISC_KEY, JSON.stringify(c)); }catch(e){} }
  function numActive(v){ const n=(v==null||v==='')?NaN:+v; return (!isNaN(n)&&n>0)?n:null; }
  function resolveDiscount(d){
    const cfg=discountsConfig(); const cat=d.category||null;
    const chain=[
      {level:'product',  pct:numActive(d.price.discountPct),                 label:'This product line'},
      {level:'project',  pct:numActive(cfg.project&&cfg.project[DISC_CTX.project]),   label:'Project · '+DISC_CTX.project},
      {level:'customer', pct:numActive(cfg.customer&&cfg.customer[DISC_CTX.customer]),label:'Customer · '+DISC_CTX.customer},
      {level:'category', pct:cat?numActive(cfg.category&&cfg.category[cat]):null,      label:'Category · '+(cat||'—')},
      {level:'sitewide', pct:numActive(cfg.sitewide),                        label:'Site-wide'}
    ];
    const applied=chain.find(x=>x.pct!=null)||{level:null,pct:0,label:'No discount'};
    return { pct:applied.pct||0, source:applied.label, level:applied.level, chain };
  }
  function discountPctOf(d){ return resolveDiscount(d).pct||0; }
  // full cost -> customer sell engine (closest break below; setup inside total cost; £60 min profit; markup banded on total cost)
  function priceCalc(d, q){
    q=Math.max(1,q);
    const blank=breakFor(d.price.breaks, q).unit;
    const dec=decoPerUnit(d, q);
    const totalCost=(blank+dec.run)*q + dec.setupTotal;
    const markup=markupFor(totalCost);
    let totalSell=totalCost*markup;
    if(totalSell-totalCost < 60) totalSell=totalCost+60;
    let unit=totalSell/q;
    const disc=discountPctOf(d);
    if(disc){ unit=unit*(1-disc/100); totalSell=unit*q; }
    return { unit, blank, dec, totalCost, totalSell, markup, profit:totalSell-totalCost, delivery:deliveryCharge(d,q) };
  }
  function unitSell(d, q){ const c=priceCalc(d,q); return { unit:c.unit, blank:c.blank, dec:c.dec, calc:c }; }
  // ---- break-hold pricing: the unit sell price holds across a tier and only steps at the next break ----
  function repQty(d,q){ const breaks=d.price.breaks; const bi=fullIdxForQ(d,q); const t=breaks[bi].q; if(t>0) return t; const firstReal=breaks.find(b=>b.q>0); return firstReal?firstReal.q:Math.max(1,Math.round(q)); }
  function priceView(d,q){
    q=Math.max(1,Math.round(q));
    const actual=priceCalc(d,q);                 // actual cost & delivery for this quantity
    const hc=priceCalc(d, repQty(d,q));          // unit & markup held at the tier's break threshold
    const unit=hc.unit, disc=resolveDiscount(d).pct||0;
    const preUnit=disc?unit/(1-disc/100):unit;
    const lineSell=unit*q, preLineSell=preUnit*q;
    const setupPerUnit=actual.dec.setupTotal/q;
    return { qty:q, unit, preUnit, lineSell, preLineSell, totalCost:actual.totalCost, markup:hc.markup, delivery:actual.delivery,
             profit:lineSell-actual.totalCost, preProfit:preLineSell-actual.totalCost, discPct:disc,
             // cost breakdown for this specific branding (per unit unless noted)
             blank:actual.blank, decoRun:actual.dec.run, setupTotal:actual.dec.setupTotal, setupPerUnit,
             costUnit:actual.totalCost/q, delivCost:deliverySupplier(d,q,selCountry(d).c.mult) };
  }
  // compact summary for external surfaces (e.g. the modal's left rail) — same engine, current modal qty
  function priceSummary(p){ const d=data(p); if(!d) return null; const v=priceView(d, qtyOf(p)); return { qty:v.qty, unitSell:v.unit, lineSell:v.lineSell, totalCost:v.totalCost, profit:v.profit, delivery:v.delivery, markup:v.markup, approved:!!(p.actions[1]&&p.actions[1].st==='approved') }; }
  // ---- sample pricing: cost (£ | quote | free) → markup → sell ----
  const SAMPLE_MARKUP=1.35, SAMPLE_MIN_UPLIFT=5;
  function sampleMarkupSell(cost){ let sell=cost*SAMPLE_MARKUP; if(sell-cost<SAMPLE_MIN_UPLIFT) sell=cost+SAMPLE_MIN_UPLIFT; return sell; }
  function sampleCalc(s){
    if(!s) return null;
    if(s.mode==='free'||s.free) return {mode:'free', cost:0, markup:0, sell:0, quoteNote:s.quoteNote};
    const isQuote = s.mode==='quote'||s.quote;
    const cost = (s.cost!=null)?s.cost : (s.price!=null?s.price:null);
    if(isQuote && cost==null) return {mode:'quote', cost:null, markup:SAMPLE_MARKUP, sell:(s.sell!=null?s.sell:null), quoteNote:s.quoteNote};
    if(cost==null) return {mode:'quote', cost:null, markup:SAMPLE_MARKUP, sell:null, quoteNote:s.quoteNote};
    const sell = s.sell!=null ? s.sell : sampleMarkupSell(cost);
    return {mode:isQuote?'quoted':'priced', cost, markup:SAMPLE_MARKUP, sell, quoteNote:s.quoteNote};
  }
  // shared sample-cost store — edits flow between Store product page and project modal
  function sampleStoreLoad(){ try{ return JSON.parse(localStorage.getItem('ms-sample-costs')||'{}'); }catch(e){ return {}; } }
  function sampleStoreSave(o){ try{ localStorage.setItem('ms-sample-costs', JSON.stringify(o)); }catch(e){} }
  function sampleOverride(name){ return sampleStoreLoad()[name]||{}; }
  function sampleFor(p, d){
    const ov=sampleOverride(p.name); const m=(b,o)=>Object.assign({}, b||{}, o||{});
    return { unbranded:m(d.sample.unbranded, ov.unbranded), branded:m(d.sample.branded, ov.branded) };
  }
  function sampleSet(name, type, patch){ const o=sampleStoreLoad(); o[name]=o[name]||{}; o[name][type]=Object.assign({}, o[name][type]||{}, patch); sampleStoreSave(o); }
  window.MSSampleCost = { calc:sampleCalc, markupSell:sampleMarkupSell, load:sampleStoreLoad, set:sampleSet, override:sampleOverride, MARKUP:SAMPLE_MARKUP, MIN_UPLIFT:SAMPLE_MIN_UPLIFT };
  // sell unit for a specific method + colour count at qty (customer full matrix)
  function methodSellAt(d, methodKey, numColours, q){
    q=Math.max(1,q);
    const blank=breakFor(d.price.breaks,q).unit;
    const m=METHODS[methodKey]||METHODS.none;
    let run=0,setup=0;
    if(methodKey!=='none'){ const colours=m.maxColours>1?(numColours||1):1; run=decoCost(methodKey,colours,q); setup=methodSetup(methodKey,colours); }
    const totalCost=(blank+run)*q+setup;
    let totalSell=totalCost*markupFor(totalCost);
    if(totalSell-totalCost<60) totalSell=totalCost+60;
    let unit=totalSell/q;
    { const disc=discountPctOf(d); if(disc) unit=unit*(1-disc/100); }
    return unit;
  }
  function custFullMatrix(d,ctx,curIdx){
    const breaks=d.price.breaks;
    const head=`<tr><th>Sell / unit</th>${breaks.map((b,i)=>`<th class="${i===curIdx?'on':''}">${b.q.toLocaleString()}+</th>`).join('')}</tr>`;
    const unbr=`<tr class="fm-unbr"><td>Unbranded</td>${breaks.map((b,i)=>`<td class="${i===curIdx?'on':''}">${money(ctx,methodSellAt(d,'none',0,b.q))}</td>`).join('')}</tr>`;
    const methodRows=(d.branding.methods||[]).map(mk=>{ const m=METHODS[mk]||{}; const maxC=m.maxColours>1?Math.min(m.maxColours,4):1;
      const head=`<tr class="fm-mhd"><td colspan="${breaks.length+1}"><b>${m.name||mk}</b></td></tr>`;
      const rows=[];
      for(let n=1;n<=maxC;n++){ const lbl=m.maxColours>1?`${n} colour${n>1?'s':''}`:decoLabel(m,1);
        rows.push(`<tr><td>${lbl}</td>${breaks.map((b,i)=>`<td class="${i===curIdx?'on':''}">${money(ctx,methodSellAt(d,mk,n,b.q))}</td>`).join('')}</tr>`); }
      if(m.unit) rows.push(`<tr class="fm-setup"><td colspan="${breaks.length+1}">Setup ${m.basis==='per colour'?money(ctx,m.unit)+' / colour':money(ctx,m.unit)} · one-off, absorbed into unit price</td></tr>`);
      return head+rows.join('');
    }).join('');
    return `<table class="pr-matrix fm-matrix">${head}${unbr}${methodRows}</table>`;
  }

  /* =========================================================
     TAB BODIES
     ========================================================= */
  function ts(where,d){
    const t=d.twoSupplier; if(!t) return '';
    const lines={ design:'This line uses two suppliers — the blank product from one, the branding from another. The proof below is produced by the branding supplier.',
      stock:'Stock shown is held by the product supplier, who dispatches blanks to the decorator — not direct to the customer.',
      price:'This price combines two cost sources: the blank product and the decoration, from separate suppliers.' };
    return `<div class="ts-banner"><svg class="icn"><use href="#ic-bang"/></svg><div><b>Two-supplier line.</b><p>${lines[where]||''}</p></div></div>
      <div class="pm-section"><div class="ts-pair">
        <div class="ts-card"><span class="ts-role">${t.product.role}</span><b>${t.product.supplier}</b><p>${t.product.detail} · lead ${t.product.lead} days</p></div>
        <div class="ts-card"><span class="ts-role">${t.branding.role}</span><b>${t.branding.supplier}</b><p>${t.branding.detail} · lead ${t.branding.lead} days</p></div>
      </div></div>`;
  }

  function body(p, tabKey, ctx){
    const d=data(p); if(!d) return '';
    ctx=ctx||{}; const role=ctx.role||'dist';
    if(tabKey==='design') return designBody(p,d,ctx,role);
    if(tabKey==='price')  return priceBody(p,d,ctx,role);
    if(tabKey==='sample') return sampleBody(p,d,ctx,role);
    if(tabKey==='stock')  return stockBody(p,d,ctx,role);
    return '';
  }

  // ---------- DESIGN ----------
  function methodCard(d, code, role, active){
    const m=METHODS[code]; if(!m) return '';
    const rec = d.branding.rec===code;
    const meta = code==='none' ? 'Unbranded' :
      `Max. ${m.maxColours>=99?'Full':m.maxColours} ${m.maxColours>=99?'colour':'colour(s)'} · from ${('£'+m.from.toFixed(2))} · ${('£'+m.unit.toFixed(2))} setup`;
    return `<button class="bm-card ${active?'on':''}" data-method="${code}" ${role!=='dist'?'disabled':''}>
        <div class="bm-top"><span class="bm-name">${m.name}</span>${rec?'<span class="bm-rec">Recommended</span>':''}${active?'<svg class="icn bm-tick"><use href="#ic-check"/></svg>':''}</div>
        <div class="bm-meta">${meta}</div>
        ${code!=='none'?`<div class="bm-lead">${m.lead} days</div>`:''}
      </button>`;
  }
  function posDims(d,code){ const pos=(d.branding.positions||[]).find(x=>x.code===code); return pos?`${pos.w} mm × ${pos.h} mm`:''; }
  // ===== Visual + Proof split =====
  const D_META = {
    notstarted:{cls:'studio',icon:'ic-clock',lbl:'Not started'},
    withstudio:{cls:'awaiting',icon:'ic-clock',lbl:'With studio'},
    infoneeded:{cls:'feedback',icon:'ic-bang',lbl:'Information needed'},
    awaiting:{cls:'awaiting',icon:'ic-hourglass',lbl:'Awaiting approval'},
    changes:{cls:'feedback',icon:'ic-cross',lbl:'Changes requested'},
    approved:{cls:'approved',icon:'ic-check',lbl:'Approved'},
    unbranded:{cls:'studio',icon:'ic-ban',lbl:'Unbranded — no proof'}
  };
  const DESIGN_SEED = {
    'Eco Wheat-Straw Charging Cable':{visual:{st:'approved',ver:1},proof:{st:'awaiting',ver:1,paired:1}},
    'Prodir Ds8 True Biotic Pen':{visual:{st:'awaiting',ver:1},proof:{st:'notstarted',ver:0,paired:null}}
  };
  function deriveDesign(st){
    const m={
      approved:{visual:{st:'approved',ver:1},proof:{st:'approved',ver:1,paired:1}},
      awaiting:{visual:{st:'approved',ver:1},proof:{st:'awaiting',ver:1,paired:1}},
      feedback:{visual:{st:'infoneeded',ver:0},proof:{st:'notstarted',ver:0,paired:null}},
      notapproved:{visual:{st:'approved',ver:1},proof:{st:'changes',ver:2,paired:1}},
      unbranded:{visual:{st:'approved',ver:1},proof:{st:'unbranded',ver:0,paired:null}},
      withacm:{visual:{st:'withstudio',ver:0},proof:{st:'notstarted',ver:0,paired:null}}
    };
    return JSON.parse(JSON.stringify(m[st]||m.withacm));
  }
  function mapRoll(st){ return ({notstarted:'withacm',withstudio:'withacm',infoneeded:'feedback',awaiting:'awaiting',changes:'notapproved',approved:'approved'})[st]||'withacm'; }
  function seedDesign(p){
    if(p.design) return;
    p.design = DESIGN_SEED[p.name] ? JSON.parse(JSON.stringify(DESIGN_SEED[p.name])) : deriveDesign(p.actions[0].st);
    p.actions[0].st = rollDesign(p);
  }
  function rollDesign(p){
    const dz=p.design; if(!dz) return p.actions[0].st;
    const v=dz.visual, pr=dz.proof;
    if(v.st!=='approved'){ p._dstage='visual'; return mapRoll(v.st); }
    if(pr.st!=='approved' && pr.st!=='unbranded'){ p._dstage='proof'; return mapRoll(pr.st); }
    p._dstage='done'; return pr.st==='unbranded'?'unbranded':'approved';
  }
  function designVerb(p, baseSub){
    if(!p.design) return baseSub;
    const stage=p._dstage;
    if(baseSub==='Approve design') return stage==='visual'?'Approve visual':'Approve proof';
    return baseSub;
  }

  function stageAction(p,stage,role){
    const st=p.design[stage].st;
    if(role==='cust'){
      if(st==='awaiting') return stage==='visual'?'Review &amp; approve visual':'Review &amp; approve proof';
      if(st==='infoneeded') return 'Give feedback';
      if(st==='approved'||st==='changes') return 'View';
      return null;
    }
    if(st==='notstarted'||st==='withstudio') return 'Submit for approval';
    if(st==='changes') return 'Revise &amp; resubmit';
    if(stage==='visual' && (st==='approved'||st==='awaiting'||st==='infoneeded')) return null;
    if(st==='approved'||st==='awaiting'||st==='infoneeded') return 'View';
    return null;
  }
  function stageWait(p,stage,role){
    const st=p.design[stage].st;
    if(st==='unbranded') return 'Not applicable';
    if(role==='cust'){
      if(st==='withstudio'||st==='notstarted') return 'With studio';
      if(st==='changes') return 'With studio';
      return '';
    }
    if(st==='awaiting') return 'Awaiting customer';
    if(st==='infoneeded') return 'Awaiting customer info';
    return '';
  }

  function designBody(p,d,ctx,role){
    seedDesign(p);
    const dz=p.design;
    const card=(stage)=>{
      const s=dz[stage]; const meta=D_META[s.st]||D_META.notstarted;
      const unbr = d.branding.chosen && d.branding.chosen.unbranded;
      const ver = unbr ? `<span class="ds-ver">Stock image</span>` : (s.ver ? `<span class="ds-ver">${stage==='visual'?'Visual':'Proof'} v${s.ver}</span>` : '');
      const paired = (stage==='proof' && s.paired && s.st!=='unbranded' && s.st!=='notstarted') ? ` · paired with Visual v${s.paired}` : '';
      const act = unbr ? '' : stageAction(p,stage,role);
      const wait = unbr ? '' : stageWait(p,stage,role);
      const foot = unbr
        ? `<span class="ds-wait"><svg class="icn"><use href="#ic-ban"/></svg>Unbranded — stock image</span>`
        : (act
        ? `<button class="pm-cta sm ds-open${act==='View'?' ghost':''}" data-stage="${stage}"><span>${act}</span>${act==='View'?'':'<svg class="icn"><use href="#ic-arrow"/></svg>'}</button>`
        : (wait?`<span class="ds-wait"><svg class="icn"><use href="#ic-clock"/></svg>${wait}</span>`:''));
      return `<div class="ds-card ${stage}">
        <div class="ds-head">
          <span class="ds-ico ${unbr?'studio':meta.cls}"><svg class="icn"><use href="#${unbr?'ic-ban':meta.icon}"/></svg></span>
          <div class="ds-txt"><b>${stage==='visual'?'Visual':'Proof'}</b><span>${unbr?'Stock image':meta.lbl+paired}</span></div>
          ${ver}
        </div>
        <div class="ds-foot">${foot}</div>
      </div>`;
    };
    const __slug=p.name.replace(/[^a-z0-9]/gi,'-').toLowerCase();
    const unbr = d.branding.chosen && d.branding.chosen.unbranded;
    const vSt=dz.visual.st;
    const vReady=['awaiting','changes','approved'].includes(vSt) && !unbr;
    let hero;
    if(unbr){
      hero = `<div class="pm-vis-stage"><div class="pm-vis-notstart unbr"><svg class="icn"><use href="#ic-ban"/></svg><span>Unbranded product</span><small>No artwork or proof — supplied plain. Untick “unbranded” in the builder to restore.</small></div></div>`;
    } else if(vReady){
      hero = `<div class="pm-vis-stage has-visual" id="pmVisStage" data-slug="${__slug}" data-img="${p.img}">
        <button class="pm-vis-magnify" id="pmVisMag" title="Magnify"><svg class="icn"><use href="#ic-magnify"/></svg><span>Magnify</span></button>
        <button class="pm-vis-nav prev" data-dir="-1" aria-label="Previous visual"><svg class="icn"><use href="#ic-arrow-l"/></svg></button>
        <div class="pm-vis-frame" id="pmVisFrame"></div>
        <button class="pm-vis-nav next" data-dir="1" aria-label="Next visual"><svg class="icn"><use href="#ic-arrow"/></svg></button>
        <div class="pm-vis-dots" id="pmVisDots"></div>
        <div class="pv-lens" id="pmVisLens"></div>
      </div>
      <p class="pm-viscap">Indicative visual — not an exact match for colour, scale or finish.</p>`;
    } else {
      hero = `<div class="pm-vis-stage"><div class="pm-vis-notstart"><svg class="icn"><use href="#ic-image"/></svg><span>Visual not started</span><small>Studio will share visuals once the brief is ready.</small></div></div>`;
    }
    const vv=dz.visual.ver;
    const visualHd=`<div class="dsv-mini-hd"><b>Visual</b>${(!unbr&&vv&&['awaiting','approved','changes'].includes(vSt))?`<span class="ds-ver">v${vv}</span>`:(unbr?'<span class="ds-ver">Stock image</span>':'')}</div>`;
    if(role==='cust'){
      return ts('design',d) + `<div class="pm-designwrap"><div class="dsv-split">
        <div class="dsv-col">${visualHd}${hero}<div class="dsv-colfoot">${visualApproveInline(p)}</div></div>
        <div class="dsv-col">${proofMiniPanel(p,d)}</div>
      </div></div>`;
    }
    const builder = brandingBuilderHTML(p,d);
    return ts('design',d) + `<div class="pm-designwrap"><div class="dsv-split">
        <div class="dsv-col">${visualHd}${hero}<div class="dsv-colfoot">${card('visual')}</div></div>
        <div class="dsv-col">${proofMiniPanel(p,d)}</div>
      </div>${builder}</div>`;
  }
  function visualApproveInline(p){
    const st=p.design.visual.st, ver=p.design.visual.ver;
    if(st==='approved') return `<div class="dsv-approve"><div class="pv-done approved" style="flex:1"><svg class="icn"><use href="#ic-check"/></svg>Visual approved</div><button class="pm-cta-sec sm" id="dsvVisUnappr">Request changes</button></div>`;
    if(st==='changes') return `<div class="pv-done"><svg class="icn"><use href="#ic-clock"/></svg>Changes requested — the studio is reworking the visual.</div>`;
    if(st==='withstudio'||st==='notstarted') return `<div class="pv-done"><svg class="icn"><use href="#ic-clock"/></svg>Visual with studio.</div>`;
    if(st==='infoneeded') return `<div class="dsv-approve"><p class="pv-prompt">The studio needs information from you before producing the visual.</p><div class="pv-resp show"><textarea id="dsvResp" placeholder="Provide the details the studio asked for…"></textarea></div><button class="pm-cta" id="dsvSend"><span>Send to studio</span><svg class="icn"><use href="#ic-arrow"/></svg></button></div>`;
    return `<div class="dsv-approve">
      <div class="dsv-aphd"><b>Approve visual</b><span class="ds-ver">Visual v${ver||1}</span></div>
      <label class="pv-check rev"><input type="checkbox" id="dsvRev"><span>I do not approve — please revise as follows:</span></label>
      <div class="pv-resp" id="dsvRespWrap"><textarea id="dsvResp" placeholder="Write response…"></textarea></div>
      <label class="pv-check"><input type="checkbox" id="dsvAppr"><span>I have checked the visual and approve it.</span></label>
      <button class="pm-cta" id="dsvSubmit" disabled><span>Submit</span><svg class="icn"><use href="#ic-arrow"/></svg></button>
    </div>`;
  }
  function proofMiniPanel(p,d){
    const slug=p.name.replace(/[^a-z0-9]/gi,'-').toLowerCase();
    const st=p.design.proof.st, ver=p.design.proof.ver;
    const ch=d.branding.chosen, pc=d.colours.find(c=>c.name===ch.productColour)||d.colours[0];
    const imgs=visualImgs(p); const src=imgs?imgs[0]:('assets/products/'+p.img+'.png');
    let preview;
    if(st==='notstarted'||st==='withstudio'){ preview=`<div class="dsv-mini-empty"><svg class="icn"><use href="#ic-doc"/></svg><span>Proof not started</span><small>The studio is preparing the technical proof.</small></div>`; }
    else if(st==='unbranded'){ preview=`<div class="dsv-mini-empty"><svg class="icn"><use href="#ic-ban"/></svg><span>Unbranded — no proof</span></div>`; }
    else {
      const pos=(ch.positions||[]).slice(0,2).map(po=>{ const meta=(d.branding.positions||[]).find(x=>x.code===po.code)||{name:po.code}; const m=METHODS[po.method]||{}; return `<div class="dsv-mini-spec"><b>${meta.name}</b><span>${(m.name||po.method)} · ${decoLabel(m,po.numColours)}</span></div>`; }).join('');
      preview=`<div class="dsv-mini-img"><img src="${src}" alt="Proof preview"></div>
        <div class="dsv-mini-meta"><div class="dsv-mini-swatch" style="background:${hex(pc.name)}"></div><div><b>${pc.name}</b><span>${pmsOf(pc)}</span></div></div>
        ${pos}`;
    }
    let action;
    if(st==='approved') action=`<div class="pv-done approved" style="flex:1"><svg class="icn"><use href="#ic-check"/></svg>Proof approved</div><button class="pm-cta-sec sm" id="dsvProofUnappr">Request changes</button>`;
    else if(st==='changes') action=`<div class="pv-done"><svg class="icn"><use href="#ic-clock"/></svg>Changes requested — studio reworking.</div>`;
    else if(st==='awaiting') action=`<button class="pm-cta" id="dsvProofOpen" data-stage="proof"><span>Review &amp; approve proof</span><svg class="icn"><use href="#ic-arrow"/></svg></button>`;
    else if(st==='infoneeded') action=`<button class="pm-cta sm" id="dsvProofOpen" data-stage="proof"><svg class="icn"><use href="#ic-chat"/></svg><span>Give feedback</span></button>`;
    else action=`<span class="ds-wait"><svg class="icn"><use href="#ic-clock"/></svg>With studio</span>`;
    const viewBtn = ['approved','changes'].includes(st) ? `<button class="pm-cta-sec sm" id="dsvProofView" data-stage="proof">View full proof</button>` : '';
    return `<div class="dsv-mini">
      <div class="dsv-mini-hd"><b>Proof</b>${ver&&['awaiting','approved','changes'].includes(st)?`<span class="ds-ver">v${ver}</span>`:''}</div>
      <div class="dsv-mini-body">${preview}</div>
      <div class="dsv-mini-foot">${viewBtn}${action}</div>
    </div>`;
  }
  function priceBody(p,d,ctx,role){
    const q=qtyOf(p); const us=unitSell(d,q); const breaks=d.price.breaks;
    if(role==='cust') return ts('price',d) + custPriceModule(p,d,ctx);
    if(role==='dist') return ts('price',d) + distPriceModule(p,d,ctx);
    // any other role (e.g. supplier) — no access to distributor cost/markup/profit internals
    return ts('price',d) + supplierPriceModule(p,d,ctx);
  }
  // restricted price view for non-cust/non-dist roles — shows only what that party is entitled to see
  function supplierPriceModule(p,d,ctx){
    const q=qtyOf(p); const cal=priceCalc(d,q);
    const pst=p.actions[1]?p.actions[1].st:'awaiting';
    const statusLine = pst==='approved'
      ? `<div class="cu-apprbar approved"><span><svg class="icn"><use href="#ic-check"/></svg>Price agreed with the customer · valid until ${fmtDate(expiryDate(d))}</span></div>`
      : `<div class="cu-apprbar"><span><svg class="icn"><use href="#ic-clock"/></svg>Pricing in progress with the distributor</span></div>`;
    return `<div class="pm-cust pm-suppprice">
      <p class="pr-savlbl">${brandingLabelShort(d)}</p>
      ${statusLine}
      <div class="pm-cmod">
        <div class="pm-cmodh">Your supply cost</div>
        <div class="dp-calc">
          <div class="dp-cl"><span>Unbranded item · ${q.toLocaleString()} units</span><b>${money(ctx,cal.blank)} / unit</b></div>
          <div class="dp-cl"><span>Decoration · ${brandingDecoLabel(d)}</span><b>${money(ctx,cal.dec.run)} / unit</b></div>
          <div class="dp-cl"><span>Setup · one-off</span><b>${money(ctx,cal.dec.setupTotal)}</b></div>
          <div class="dp-cl total"><span>Total supply cost · ${q.toLocaleString()} units</span><b>${money(ctx,cal.totalCost)}</b></div>
        </div>
      </div>
      <p class="pr-costnote">The distributor's markup, sell prices and profit are not shown to suppliers. You see only your own supply cost and the agreed status.</p>
    </div>`;
  }
  function dpAcc(id,title,sub,bodyHTML,open){
    return `<div class="dp-acc${open?' open':''}" data-accwrap="${id}">
      <button type="button" class="dp-acc-hd" data-acc="${id}" aria-expanded="${open?'true':'false'}"><span class="dp-acc-caret">›</span><span class="dp-acc-title">${title}</span>${sub?`<span class="dp-acc-sub">${sub}</span>`:''}</button>
      <div class="dp-acc-body" id="dpAcc-${id}" ${open?'':'hidden'}>${bodyHTML}</div>
    </div>`;
  }
  function distPriceModule(p,d,ctx){
    const breaks=d.price.breaks; const sb=sliderBreaks(d); const q=qtyOf(p);
    d.price._accOpen=d.price._accOpen||{}; const acc=id=>!!d.price._accOpen[id];
    const qmin=Math.min(sb[0].q, Math.max(5, Math.floor(q/5)*5)); const qmax=Math.max(sb[sb.length-1].q, Math.ceil(q/5)*5); const span=(qmax-qmin)||1;
    const idx=fullIdxForQ(d, q);
    const selBq=breakFor(breaks,q).q;
    const ticks=sb.map(b=>{ const f=(b.q-qmin)/span; return `<button type="button" class="dp-tick${b.q===selBq?' on':''}" data-q="${b.q}" style="left:calc(9px + ${(f*100).toFixed(3)}% - ${(f*18).toFixed(2)}px)">${b.q.toLocaleString()}</button>`; }).join('');
    const matrixBody=`<div class="dp-mxtog" id="dpMxTog"><button class="on" data-m="cost">Cost</button><button data-m="sell">Sell</button></div>
      <div id="dpMatrixHost">${distFullMatrix(d,ctx,idx,'cost')}</div>
      <p class="pr-costnote">The branding chosen in Design is highlighted. <b>Cost view</b> shows the unbranded item, each branding method as a per-unit <b>decoration charge</b>, and setup as a one-off row; <b>Sell view</b> shows the full branded sell price. Click a delivery country row to switch, expand to add more. Distributor-only.</p>`;
    const calculations=`<div class="dp-group">
      <div class="dp-grouphd"><span class="dp-grouptag">Calculations</span><span class="dp-groupnote">Editable inputs that build the price</span></div>
      ${dpAcc('matrix','Price matrix',brandingLabelShort(d),matrixBody,acc('matrix'))}
      ${dpAcc('override','Override prices','Lock a quantity window',lockedEditorHTML(p,d,ctx,idx),acc('override'))}
      ${dpAcc('charges','Additional charges','Supplier &amp; customer line items',additionalChargesHTML(p,d,ctx),acc('charges'))}
      ${dpAcc('discount','Distributor discounts',resolveDiscount(d).pct?resolveDiscount(d).pct+'% · '+resolveDiscount(d).source:'None applied',discountEditorHTML(p,d,ctx),acc('discount'))}
    </div>`;
    const results=`<div class="dp-group dp-results">
      <div class="dp-grouphd"><span class="dp-grouptag">Results</span><span class="dp-groupnote">Calculated outcome — read-only</span></div>
      <div class="pm-cmod">
        <div class="pm-cmodh">1 · Quantity</div>
        <div class="dp-qrow">
          <div class="dp-qslider"><input type="range" id="dpRange" min="${qmin}" max="${qmax}" step="5" value="${Math.min(qmax,Math.max(qmin,q))}"><div class="dp-ticks" id="dpTicks">${ticks}</div></div>
          <input type="number" id="dpQty" class="dp-qty-in" min="1" step="1" value="${q}" aria-label="Quantity">
        </div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">2 · Customer sell price</div>
        <div class="cu-priceline"><span class="cu-was" id="dpWas"></span><span class="cu-now" id="dpUnit"></span><span class="cu-each">/ unit sell</span><span class="cu-disc" id="dpDiscBadge"></span></div>
        <div class="cu-linetotal">Line sell total <b id="dpTotal"></b> <span class="dp-wasline" id="dpTotalWas"></span></div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">3 · Your margin</div>
        <div class="dp-calc" id="dpCalc"></div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">4 · Delivery</div>
        <div class="cu-priceline"><span class="cu-now" style="font-size:24px" id="dpDeliv"></span><span class="cu-each">cost +25%, rounded</span></div>
        <div class="cu-linetotal pr-corow">to ${countrySelectHTML(d,'dpCo')}</div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">5 · Discount</div>
        <div class="cu-priceline"><span class="cu-now" style="font-size:24px" id="dpDiscPct"></span><span class="cu-each" id="dpDiscSrc"></span></div>
        <div class="cu-linetotal" id="dpDiscSaveLine">Reduces this line by <b id="dpDiscSave"></b></div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">6 · Additional charges</div>
        <div id="dpResAddl">${distResultAddlHTML(d,ctx)}</div>
      </div>
    </div>`;
    return `<div class="pm-cust pm-distprice">
      <p class="pr-savlbl">${brandingLabelShort(d)}</p>
      ${results}
      ${calculations}
      <div id="dpStatusBar" class="dp-statusbar">${distStatusBar(p,d)}</div>
    </div>`;
  }
  // ---- price expiry helpers ----
  function expiryDate(d){ const days=d.price.expiryDays||30; const base=d.price._approvedAt?new Date(d.price._approvedAt):new Date(); const e=new Date(base.getTime()+days*86400000); return e; }
  function fmtDate(dt){ return String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+String(dt.getFullYear()).slice(2); }
  function daysLeft(d){ const e=expiryDate(d); return Math.max(0,Math.ceil((e-new Date())/86400000)); }
  function expiryLink(d){ const days=d.price.expiryDays||30; return `<button type="button" class="dp-explink" id="dpExpEdit" title="Set how long this price stays valid for this product in this project">${days} days</button>`; }
  function distStatusBar(p,d){
    const pst=p.actions[1]?p.actions[1].st:'awaiting';
    if(pst==='approved'){
      return `<div class="cu-apprbar approved"><span><svg class="icn"><use href="#ic-check"/></svg>Price approved · expires ${fmtDate(expiryDate(d))} (valid ${expiryLink(d)}) · locked unless re-approved</span><span class="dp-barbtns"><button class="pm-cta-sec sm" id="dpExpire" title="Demo: force expiry">Expire now</button><button class="pm-cta-sec sm" id="dpReopen">Reopen / re-quote</button></span></div>`;
    }
    const exp = d.price._expired ? `<div class="cu-apprbar expired"><span><svg class="icn"><use href="#ic-clock"/></svg>Price expired — returned to <b>being checked</b>. Re-quote and resubmit to the customer.</span></div>` : '';
    return exp+`<div class="cu-apprbar"><span>Awaiting customer approval · valid ${expiryLink(d)} from submission</span><button class="pm-cta sm" id="dpSubmit"><svg class="icn"><use href="#ic-arrow"/></svg>Submit for approval</button></div>`;
  }
  function countrySelectHTML(d,id){ const cs=countriesFor(d); const sel=d.price.country||0; return `<select class="pr-cosel" id="${id}">${cs.map((c,i)=>`<option value="${i}" ${i===sel?'selected':''}>${c.name}</option>`).join('')}<option value="__add">+ Add country…</option></select>`; }
  // ---- distributor discount editor (Calculations) ----
  function discountEditorHTML(p,d,ctx){
    const r=resolveDiscount(d); const lineOv=d.price.discountPct;
    const rows=r.chain.map(x=>`<tr class="${x.level===r.level?'dp-discon':''}"><td>${x.label}</td><td>${x.pct!=null?x.pct+'%':'<span class="lk-mut">—</span>'}</td><td>${x.level===r.level?'<span class="dp-discpill">Applied</span>':''}</td></tr>`).join('');
    return `<div class="pm-cmod pm-disc" id="dpDiscMod">
      <p class="pr-costnote" style="margin:0 0 12px">Discounts reduce the customer sell price and your profit. The <b>most-specific active level wins</b>. Site-wide, category &amp; per-customer levels are set in <b>Customer settings</b>; per-project on the project; override this line below.</p>
      <table class="pr-matrix dp-disctable"><thead><tr><th>Level · set where</th><th>Discount</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <div class="dp-discset">
        <label>Override · this product line</label>
        <span class="dp-discin"><input type="number" id="dpDiscIn" min="0" max="100" step="0.5" value="${lineOv!=null&&lineOv>0?lineOv:''}" placeholder="inherit"><span>%</span></span>
        <button class="pm-cta-sec sm" id="dpDiscClear">Clear · inherit</button>
      </div>
    </div>`;
  }
  // ---- two-sided additional charges (supplier→dist cost, dist→cust sell) ----
  function acRows(list,ctx,side){
    if(!list.length) return `<tr class="pm-ac-empty"><td colspan="6">No ${side==='cost'?'supplier':'additional'} charges.</td></tr>`;
    return list.map((c,i)=>{ const lc=(+c.qty||0)*(+c.unit||0); return `<tr data-i="${i}">
      <td><input class="pm-ac-in" data-k="label" value="${(c.label||'').replace(/"/g,'&quot;')}" placeholder="Title"></td>
      <td><input class="pm-ac-in" data-k="desc" value="${(c.desc||'').replace(/"/g,'&quot;')}" placeholder="Description"></td>
      <td><input class="pm-ac-in pm-ac-num" data-k="qty" type="number" min="1" value="${c.qty!=null?c.qty:1}"></td>
      <td><input class="pm-ac-in pm-ac-num" data-k="unit" type="number" min="0" step="0.01" value="${c.unit!=null?c.unit:0}"></td>
      <td class="pm-ac-lt">${money(ctx,lc)}</td>
      <td><button class="pm-ac-del" title="Remove">&times;</button></td></tr>`; }).join('');
  }
  function acTotal(list){ return list.reduce((s,c)=>s+(+c.qty||0)*(+c.unit||0),0); }
  // read-only Results view of additional charges (both sides)
  function distResultAddlHTML(d,ctx){
    const sell=d.price.additional||[], cost=d.price.supplierAdditional||[];
    const lines=arr=>arr.map(a=>`<div class="cu-acline"><div class="cu-acmeta"><b>${a.label||'—'}</b>${a.desc?`<span>${a.desc}</span>`:''}${a.unit!=null?`<span class="cu-acqty">${a.qty!=null?a.qty:1} × ${money(ctx,a.unit)}</span>`:''}</div><b class="cu-aclt">${money(ctx,(+a.qty||0)*(+a.unit||0))}</b></div>`).join('');
    if(!sell.length && !cost.length) return '<p class="pr-costnote" style="margin:0">No additional charges — add them in Calculations.</p>';
    let h='';
    if(sell.length) h+=`<div class="dp-addl-grp"><div class="dp-addl-h">Charged to customer <span class="pm-ac-tag sell">Sell</span></div>${lines(sell)}<div class="cu-linetotal" style="margin-top:8px">Customer total <b>${money(ctx,acTotal(sell))}</b></div></div>`;
    if(cost.length) h+=`<div class="dp-addl-grp"><div class="dp-addl-h">From supplier <span class="pm-ac-tag cost">Cost</span></div>${lines(cost)}<div class="cu-linetotal" style="margin-top:8px">Supplier cost total <b>${money(ctx,acTotal(cost))}</b></div></div>`;
    return h;
  }
  function updateResultAddl(d,ctx){ const el=document.getElementById('dpResAddl'); if(el) el.innerHTML=distResultAddlHTML(d,ctx); }
  function additionalChargesHTML(p,d,ctx){
    d.price.supplierAdditional=d.price.supplierAdditional||[];
    d.price.additional=d.price.additional||[];
    const tbl=(list,side,addLbl)=>`<table class="pm-ac" data-side="${side}">
        <thead><tr><th>Charge</th><th>Description</th><th>Qty</th><th>${side==='cost'?'Unit cost':'Unit price'}</th><th>${side==='cost'?'Line cost':'Line total'}</th><th></th></tr></thead>
        <tbody data-acbody="${side}">${acRows(list,ctx,side)}</tbody>
        <tfoot><tr><td colspan="4">${side==='cost'?'Supplier charges total':'Additional charges total'}</td><td class="pm-ac-foot" data-acfoot="${side}">${money(ctx,acTotal(list))}</td><td></td></tr></tfoot>
      </table>
      <button class="pm-cta-sec sm pm-ac-add" data-side="${side}">+ ${addLbl}</button>`;
    return `<div class="pm-cmod">
      <div class="pm-ac-grp">
        <div class="pm-ac-hd">Supplier → distributor <span class="pm-ac-tag cost">Cost</span></div>
        ${tbl(d.price.supplierAdditional,'cost','Add supplier charge')}
        <p class="pr-costnote">The supplier enters these costs; they feed your cost view, not the customer's.</p>
      </div>
      <div class="pm-ac-grp">
        <div class="pm-ac-hd">Distributor → customer <span class="pm-ac-tag sell">Sell</span></div>
        ${tbl(d.price.additional,'sell','Add charge')}
        <p class="pr-costnote">The customer sees these agreed line items and the total on their quote.</p>
      </div>
    </div>`;
  }
  // ---- inline locked-price editor ----
  function lockedDefaults(d){
    // per-break cost defaults from the matrix + chosen branding
    const dec=decoPerUnit(d,1000);
    return d.price.breaks.map(b=>({
      cUnb: breakFor(d.price.breaks,b.q).unit,
      cDeco: dec.run,
      cSetup: dec.setupTotal,
      cDeliv: deliverySupplier(d,b.q,selCountry(d).c.mult)
    }));
  }
  function lockedState(d){
    if(!d.price.locked){ d.price.locked={ cols:{}, vals:{}, quote:null, two:false }; }
    return d.price.locked;
  }
  function lockedCell(d,r,ci,def){ const lk=lockedState(d); const v=lk.vals[r+'_'+ci]; return v!=null&&v!==''?v:def; }
  function lockedEditorHTML(p,d,ctx,curIdx){
    const breaks=d.price.breaks; const lk=lockedState(d); const defs=lockedDefaults(d);
    const span=breaks.length+1;
    const two=!!d.twoSupplier && lk.two;
    const gp=n=>money(ctx,n);
    const colHead=breaks.map((b,i)=>`<th class="${lk.cols[i]?'lk-on':''}"><label class="lk-colsel"><input type="checkbox" class="lk-colchk" data-col="${i}" ${lk.cols[i]?'checked':''}> ${b.q.toLocaleString()}+</label></th>`).join('');
    const editRow=(r,label,cls)=>`<tr class="lk-edit ${cls||''}" data-r="${r}"><td>${label}</td>${breaks.map((b,i)=>{ const def=defs[i][r]; const on=lk.cols[i]; const val=lockedCell(d,r,i,def);
        return `<td class="${on?'lk-on':''}">${on?`<input class="lk-in" data-r="${r}" data-col="${i}" type="text" value="${typeof val==='number'?val.toFixed(2):val}" placeholder="${typeof def==='number'?def.toFixed(2):def}">`:'<span class="lk-mut">—</span>'}</td>`; }).join('')}</tr>`;
    const calcRow=(r,label,cls)=>`<tr class="${cls||''}" data-r="${r}"><td>${label}</td>${breaks.map((b,i)=>`<td class="${lk.cols[i]?'lk-on':''}" data-r="${r}" data-col="${i}">${lk.cols[i]?'—':'<span class="lk-mut">—</span>'}</td>`).join('')}</tr>`;
    const appliesRow=`<tr class="lk-applies"><td>Applies</td>${breaks.map((b,i)=>`<td data-applies="${i}">${lk.cols[i]?'Locked':'Matrix'}</td>`).join('')}</tr>`;
    const prodHdr = two?`<tr class="lk-suphdr prod"><td colspan="${span}">Product supplier · <b>${d.twoSupplier.product.supplier}</b>${lk.quote&&lk.quote.product?` — quote by ${lk.quote.product.name} · ${lk.quote.product.stamp} · ${lk.quote.product.ref}`:''}</td></tr>`:'';
    const brandHdr = two?`<tr class="lk-suphdr brand"><td colspan="${span}">Branding supplier · <b>${d.twoSupplier.branding.supplier}</b>${lk.quote&&lk.quote.branding?` — quote by ${lk.quote.branding.name} · ${lk.quote.branding.stamp} · ${lk.quote.branding.ref}`:''}</td></tr>`:'';
    return `<div class="pm-cmod pm-locked" id="dpLockedMod">
      <p class="pr-costnote" style="margin:0 0 12px">Lock specific prices against this product's costs for the chosen branding across a quantity window. Within the window the locked prices override the matrix; quantities outside still use the matrix. The customer only sees the locked quantities. Applies to <b>this project, product &amp; branding</b> only.</p>
      <div class="lk-tools">
        <span class="pr-savlbl" style="margin:0">${brandingLabelShort(d)}</span>
        <span class="lk-corow">Delivery ${countrySelectHTML(d,'lkCo')}</span>
        ${d.twoSupplier?`<label class="lk-2sup"><input type="checkbox" id="lk2sup" ${lk.two?'checked':''}> Two-supplier</label>`:''}
        <button class="pm-cta-sec sm" id="lkRevert">↺ Revert</button>
        <button class="pm-cta-sec sm" id="lkReq">Request quote check</button>
      </div>
      <div class="lk-reqstatus" id="lkReqStatus" ${lk.reqState?'':'hidden'}>${lockedReqStatusHTML(d)}</div>
      <div class="lk-tablewrap"><table class="pr-matrix lk-table" id="lkTable">
        <thead><tr><th>Cost component</th>${colHead}</tr></thead>
        <tbody>
          ${prodHdr}
          ${editRow('cUnb','Unbranded item / unit')}
          ${calcRow('sUnb','↳ sell / unit','lk-sell')}
          ${brandHdr}
          ${editRow('cDeco',brandingDecoLabel(d)+' / unit')}
          ${calcRow('sDeco','↳ sell / unit','lk-sell')}
          ${editRow('cSetup','Setup · one-off (spread into unit)')}
          ${calcRow('sSetup','↳ sell (×1.35, ↑£5)','lk-sell')}
          ${editRow('cDeliv','Delivery · selected country')}
          ${calcRow('sDeliv','↳ sell (×1.25)','lk-sell')}
          <tr class="lk-locked" data-r="tCost"><td>Locked total / unit · cost</td>${breaks.map((b,i)=>`<td class="${lk.cols[i]?'lk-on':''}" data-r="tCost" data-col="${i}">${lk.cols[i]?'<b>—</b>':'<span class="lk-mut">—</span>'}</td>`).join('')}</tr>
          <tr class="lk-locked lk-sell" data-r="tSell"><td>Locked total / unit · sell</td>${breaks.map((b,i)=>`<td class="${lk.cols[i]?'lk-on':''}" data-r="tSell" data-col="${i}">${lk.cols[i]?'<b>—</b>':'<span class="lk-mut">—</span>'}</td>`).join('')}</tr>
          ${calcRow('pUnit','Profit / unit','lk-profit')}
          ${calcRow('pTot','Profit total','lk-profit')}
          ${appliesRow}
        </tbody>
      </table></div>
    </div>`;
  }
  function brandingDecoLabel(d){ const ch=d.branding.chosen; const pos=(ch.positions||[])[0]; if(!pos) return 'Decoration'; const m=METHODS[pos.method]||{}; return (m.name||pos.method)+' · '+decoLabel(m,pos.numColours); }
  function marginBandFloor(tc){ let f=0; for(const b of MARKUP_BANDS){ if(tc>=b[0]) f=b[0]; } return f; }
  // worked-example calc panel for the "Your margin" section (built per quantity)
  function marginCalcHTML(d,ctx,q){
    const rq=repQty(d,q); const hc=priceCalc(d,rq);
    const blank=hc.blank, dec=hc.dec, run=dec.run, setupTotal=dec.setupTotal;
    const totalCost=hc.totalCost, markup=hc.markup;
    let preTotalSell=totalCost*markup; if(preTotalSell-totalCost<60) preTotalSell=totalCost+60;
    const r=resolveDiscount(d), disc=r.pct||0;
    const netTotalSell=preTotalSell*(1-disc/100);
    const preUnit=preTotalSell/rq, netUnit=netTotalSell/rq;
    const preProfit=preTotalSell-totalCost, netProfit=netTotalSell-totalCost;
    const gp=n=>money(ctx,n); const brk=rq.toLocaleString();
    const setupDesc=(d.branding.chosen.positions||[]).map(pos=>{ const m=METHODS[pos.method]||{}; const c=m.maxColours>1?(pos.numColours||1):1; return m.basis==='per colour'?`${gp(m.unit)} × ${c}`:gp(m.unit); }).join(' + ')||'—';
    const bandFloor=marginBandFloor(totalCost);
    const row=(k,v,cls)=>`<div class="dp-cl ${cls||''}"><span>${k}</span><b>${v}</b></div>`;
    let h='';
    h+=row(`Unbranded item · ${brk} break`, `${gp(blank)} × ${brk} = ${gp(blank*rq)}`);
    h+=row(`Decoration · ${brandingDecoLabel(d)} · ${brk} break`, `${gp(run)} × ${brk} = ${gp(run*rq)}`);
    h+=row(`Setup · ${setupDesc}`, gp(setupTotal));
    h+=row(`Total supplier cost`, gp(totalCost), 'total');
    h+=row(`Markup (${bandFloor>0?'total cost over '+gp(bandFloor)+' band':'base band'})`, `× ${markup.toFixed(2)}`);
    h+=row(`Total sell price${disc?' (list)':''}`, gp(preTotalSell), 'total');
    if(disc){ h+=row(`Discount · ${Number.isInteger(disc)?disc:disc.toFixed(1)}% · ${r.source}`, '− '+gp(preTotalSell-netTotalSell), 'disc'); h+=row(`Net sell price`, gp(netTotalSell), 'total'); }
    h+=row(`Distributor profit (sell − cost)`, gp(disc?netProfit:preProfit), 'profit');
    h+=row(`Unit sell price (÷ ${brk})`, `${gp(disc?netUnit:preUnit)} / unit`, 'unit');
    h+=row(`Profit / unit`, gp((disc?netProfit:preProfit)/rq), 'profit');
    return h;
  }
  function lockedReqStatusHTML(d){
    const lk=lockedState(d); if(!lk.reqState) return '';
    if(lk.reqState==='awaiting'){ return `<svg viewBox="0 0 24 24" class="lk-i"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Awaiting quote from ${lk.reqNames||'production'} · <button class="lk-link" id="lkViewReply">View / simulate supplier reply</button>`; }
    return `<svg viewBox="0 0 24 24" class="lk-i"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Quote received from ${lk.quote&&lk.quote.branding?lk.quote.branding.name:'supplier'} · ${lk.quote&&lk.quote.branding?lk.quote.branding.stamp:''} — locked prices updated`;
  }
  function chosenBrandingRows(d){ const map={}; (d.branding.chosen.positions||[]).forEach(pos=>{ const m=METHODS[pos.method]||{}; const n=m.maxColours>1?(pos.numColours||1):1; (map[pos.method]=map[pos.method]||new Set()).add(n); }); return map; }
  function methodCostAt(d, methodKey, numColours, q){
    q=Math.max(1,q); const blank=breakFor(d.price.breaks,q).unit; const m=METHODS[methodKey]||METHODS.none;
    let run=0; if(methodKey!=='none'){ run=m.from; }
    return blank+run;
  }
  // decoration-only additional charge per unit (run + setup amortised over the break qty) — NOT incl. the blank item
  function methodDecoCostAt(d, methodKey, numColours, q){
    q=Math.max(1,q); const m=METHODS[methodKey]||METHODS.none; if(methodKey==='none') return 0;
    const colours=m.maxColours>1?(numColours||1):1;
    return decoCost(methodKey,colours,q);   // decoration run cost / unit (setup shown as its own row)
  }
  function distFullMatrix(d,ctx,curIdx,mode){
    const breaks=d.price.breaks; const sell=mode==='sell';
    const useTwo=!!d.twoSupplier && d.price._mxTwo!==false;
    const cell=(v,on)=>`<td class="${on?'on':''}">${money(ctx,v)}</td>`;
    const span=breaks.length+1;
    const head=`<tr><th>${sell?'Sell / unit':'Cost / unit'}</th>${breaks.map((b,i)=>`<th class="${i===curIdx?'on':''}">${b.q.toLocaleString()}+</th>`).join('')}</tr>`;
    let body='';
    // product (unbranded) supplier section
    if(useTwo){ const t=d.twoSupplier; body+=`<tr class="fm-suphdr prod"><td colspan="${span}">Product supplier · <b>${t.product.supplier}</b> — supplies the blank, dispatched to the decorator</td></tr>`; }
    const unbrChosen=!!(d.branding.chosen&&d.branding.chosen.unbranded);
    body+=`<tr class="fm-unbr${unbrChosen?' fm-chosen':''}"><td>${unbrChosen?'<span class="fm-chosendot"></span>':''}Unbranded item</td>${breaks.map((b,i)=>cell(sell?methodSellAt(d,'none',0,b.q):methodCostAt(d,'none',0,b.q),i===curIdx)).join('')}</tr>`;
    if(useTwo){ body+=`<tr class="fm-deliv prod"><td>Delivery — blanks to decorator${sell?' · sell':' · cost'}</td>${breaks.map((b,i)=>cell(sell?Math.round(deliverySupplier(d,b.q,1)*0.6*1.25):deliverySupplier(d,b.q,1)*0.6,i===curIdx)).join('')}</tr>`; }
    // branding supplier section
    if(useTwo){ const t=d.twoSupplier; body+=`<tr class="fm-suphdr brand"><td colspan="${span}">Branding supplier · <b>${t.branding.supplier}</b> — decorates &amp; dispatches finished goods</td></tr>`; }
    const chMap=chosenBrandingRows(d);
    body+=(d.branding.methods||[]).map(mk=>{ const m=METHODS[mk]||{}; const maxC=m.maxColours>1?Math.min(m.maxColours,4):1;
      const methodChosen=!!chMap[mk];
      let h=`<tr class="fm-mhd${methodChosen?' fm-mchosen':''}"><td colspan="${span}"><b>${m.name||mk}</b>${methodChosen?' <span class="fm-chip">Chosen in Design</span>':''}</td></tr>`;
      for(let n=1;n<=maxC;n++){ const lbl=m.maxColours>1?`${n} colour${n>1?'s':''}`:decoLabel(m,1);
        const rowChosen=methodChosen && chMap[mk].has(n);
        h+=`<tr class="${rowChosen?'fm-chosen':''}"><td>${rowChosen?'<span class="fm-chosendot"></span>':''}${lbl}${sell?'':' <span class="fm-addtag">+ branding</span>'}</td>${breaks.map((b,i)=>cell(sell?methodSellAt(d,mk,n,b.q):methodDecoCostAt(d,mk,n,b.q),i===curIdx)).join('')}</tr>`; }
      if(m.unit) h+=`<tr class="fm-setup"><td colspan="${span}">Setup ${m.basis==='per colour'?money(ctx,m.unit)+' / colour':money(ctx,m.unit)} · one-off${sell?', absorbed into the sell prices above':', charged once per order (separate from the per-unit rows)'}</td></tr>`;
      return h;
    }).join('');
    // delivery — selected country (clickable to expand) + other countries
    const cs=countriesFor(d); const sel=selCountry(d).i; const exp=!!d.price._mxExp;
    const delRow=(co,idx,isHead)=>{ const on=idx===sel; const caret=isHead?`<span class="fm-caret">${exp?'▾':'▸'}</span>`:'<span class="fm-caret"></span>';
      return `<tr class="fm-deliv fm-corow${on?' fm-selco':''}${isHead?' fm-delhead':''}" data-co="${idx}"><td>${caret}Delivery · ${co.name}${idx===0?' (default)':''}${on?' · selected':''}${sell?' · sell':' · cost'}</td>${breaks.map((b,i)=>cell(sell?deliveryCharge(d,b.q,co.mult):deliverySupplier(d,b.q,co.mult),i===curIdx)).join('')}</tr>`; };
    body+=delRow(cs[sel],sel,true);
    if(exp){ cs.forEach((co,idx)=>{ if(idx!==sel) body+=delRow(co,idx,false); }); body+=`<tr class="fm-addco"><td colspan="${span}"><button type="button" class="fm-addco-btn" data-mxaddco="1">+ Add delivery country</button></td></tr>`; }
    // profit per unit + total
    body+=`<tr class="fm-profit"><td>Profit / unit</td>${breaks.map((b,i)=>`<td class="${i===curIdx?'on':''}">${sell?money(ctx,priceCalc(d,b.q).profit/b.q):'—'}</td>`).join('')}</tr>`;
    body+=`<tr class="fm-profit fm-ptot"><td>Profit total</td>${breaks.map((b,i)=>`<td class="${i===curIdx?'on':''}">${sell?money(ctx,priceCalc(d,b.q).profit):'—'}</td>`).join('')}</tr>`;
    return `<table class="pr-matrix fm-matrix">${head}${body}</table>`;
  }
  function wireDistPrice(p,d,ctx){
    const rg=document.getElementById('dpRange'); if(!rg) return;
    const qIn=document.getElementById('dpQty');
    const breaks=d.price.breaks; const sb=sliderBreaks(d); const gbp=ctx.gbp||(n=>'£'+(+n).toFixed(2));
    const qmin=+rg.min, qmax=+rg.max;
    const tickEls=[...document.querySelectorAll('#dpTicks .dp-tick')];
    let mxMode='cost';
    function curQ(){ return Math.max(1, p._mqty||+rg.value); }
    function renderMatrix(){ const host=document.getElementById('dpMatrixHost'); if(host && host.firstChild) host.innerHTML=distFullMatrix(d,ctx,fullIdxForQ(d,curQ()),mxMode); }
    function renderDeliv(){ const el=document.getElementById('dpDeliv'); if(el) el.textContent=gbp(priceCalc(d,curQ()).delivery); }
    function render(q){
      q=Math.max(1,Math.round(q)); p._mqty=q; const v=priceView(d,q);
      if(qIn && document.activeElement!==qIn) qIn.value=q;
      rg.value=Math.min(qmax,Math.max(qmin,q));
      const set=(id,t)=>{ const el=document.getElementById(id); if(el)el.textContent=t; };
      const show=(id,on)=>{ const el=document.getElementById(id); if(el)el.style.display=on?'':'none'; };
      const disc=v.discPct;
      // 2 · sell price (pre-discount struck → post)
      set('dpUnit',gbp(v.unit)); set('dpTotal',gbp(v.lineSell));
      if(disc){ set('dpWas',gbp(v.preUnit)); show('dpWas',true); set('dpDiscBadge','−'+(Number.isInteger(disc)?disc:disc.toFixed(1))+'%'); show('dpDiscBadge',true); set('dpTotalWas','was '+gbp(v.preLineSell)); show('dpTotalWas',true); }
      else { show('dpWas',false); show('dpDiscBadge',false); show('dpTotalWas',false); }
      // 3 · margin — worked-example calc panel
      { const cc=document.getElementById('dpCalc'); if(cc) cc.innerHTML=marginCalcHTML(d,ctx,q); }
      set('dpDeliv',gbp(v.delivery));
      const selBq=breakFor(breaks,q).q;
      tickEls.forEach(t=>t.classList.toggle('on',+t.dataset.q===selBq));
      // step 5 · discount
      const r=resolveDiscount(d);
      set('dpDiscPct', r.pct?('−'+(Number.isInteger(r.pct)?r.pct:r.pct.toFixed(1))+'%'):'None');
      set('dpDiscSrc', r.pct?r.source:'No discount applied');
      const saveLine=document.getElementById('dpDiscSaveLine');
      if(r.pct){ set('dpDiscSave',gbp(v.preLineSell-v.lineSell)); if(saveLine)saveLine.style.display=''; }
      else if(saveLine){ saveLine.style.display='none'; }
      renderMatrix();
      if(ctx.onQty) ctx.onQty(q);
    }
    rg.addEventListener('input',()=>render(+rg.value));
    if(qIn){ qIn.addEventListener('input',()=>render(+qIn.value||1)); qIn.addEventListener('change',()=>{ render(+qIn.value||1); if(ctx.persist)ctx.persist(); }); }
    tickEls.forEach(t=>t.addEventListener('click',()=>render(+t.dataset.q)));
    if(ctx.persist) rg.addEventListener('change',()=>ctx.persist());
    render(curQ());
    // collapsible Calculations sections (collapsed by default; open-state persists across refresh)
    document.querySelectorAll('.pm-distprice .dp-acc-hd').forEach(hd=>hd.onclick=()=>{ const body=document.getElementById('dpAcc-'+hd.dataset.acc); if(!body) return; const open=body.hidden; body.hidden=!open; hd.setAttribute('aria-expanded',open?'true':'false'); hd.closest('.dp-acc').classList.toggle('open',open); d.price._accOpen=d.price._accOpen||{}; d.price._accOpen[hd.dataset.acc]=open; });
    document.querySelectorAll('#dpMxTog button').forEach(btn=>btn.onclick=()=>{ mxMode=btn.dataset.m; document.querySelectorAll('#dpMxTog button').forEach(x=>x.classList.toggle('on',x===btn)); renderMatrix(); });
    // matrix delivery country interactions (click row to select / expand head / add country)
    { const host=document.getElementById('dpMatrixHost'); if(host) host.addEventListener('click',e=>{
        if(e.target.closest('[data-mxaddco]')){ addCountry(d); d.price._mxExp=true; renderMatrix(); syncCountrySelects(); return; }
        const row=e.target.closest('tr.fm-corow'); if(!row) return;
        if(row.classList.contains('fm-delhead')){ d.price._mxExp=!d.price._mxExp; }
        else { d.price.country=+row.dataset.co; d.price._mxExp=false; }
        renderMatrix(); renderDeliv(); syncCountrySelects();
      }); }
    // §4 delivery country select
    function syncCountrySelects(){ ['dpCo','lkCo'].forEach(id=>{ const s=document.getElementById(id); if(s){ rebuildCountryOptions(s,d); s.value=String(d.price.country||0); } }); }
    wireCountrySelect('dpCo',d,()=>{ renderDeliv(); render(curQ()); syncCountrySelects(); });
    wireDistStatusBar(p,d,ctx);
    wireAdditional(d,ctx);
    wireLocked(p,d,ctx);
    wireDiscount(p,d,ctx);
  }
  function wireDiscount(p,d,ctx){
    const inp=document.getElementById('dpDiscIn');
    if(inp) inp.onchange=()=>{ const v=parseFloat(inp.value); d.price.discountPct=(!isNaN(v)&&v>0)?v:null; if(ctx.persist)ctx.persist(); if(ctx.refresh)ctx.refresh('price'); };
    const clr=document.getElementById('dpDiscClear');
    if(clr) clr.onclick=()=>{ d.price.discountPct=null; if(ctx.persist)ctx.persist(); if(ctx.refresh)ctx.refresh('price'); };
  }
  function wireDistStatusBar(p,d,ctx){
    { const s=document.getElementById('dpSubmit'); if(s&&ctx.setStatus) s.onclick=()=>{ d.price._expired=false; p.actions[1].st='awaiting'; ctx.setStatus(p,1,'awaiting','submitted the price for approval'); if(ctx.refresh)ctx.refresh('price'); }; }
    { const r=document.getElementById('dpReopen'); if(r&&ctx.setStatus) r.onclick=()=>{ p.actions[1].st='withacm'; ctx.setStatus(p,1,'withacm','reopened the price to re-quote'); if(ctx.refresh)ctx.refresh('price'); }; }
    { const x=document.getElementById('dpExpire'); if(x&&ctx.setStatus) x.onclick=()=>{ d.price._expired=true; d.price._approvedAt=null; p.actions[1].st='withacm'; ctx.setStatus(p,1,'withacm','price expired — returned to being checked'); if(ctx.refresh)ctx.refresh('price'); }; }
    { const e=document.getElementById('dpExpEdit'); if(e) e.onclick=()=>{ const cur=d.price.expiryDays||30; const v=parseInt(prompt('Price stays valid for how many days?\\n(Applies to this product in this project only.)',cur),10); if(v>0){ d.price.expiryDays=v; if(ctx.persist)ctx.persist(); const bar=document.getElementById('dpStatusBar'); if(bar){ bar.innerHTML=distStatusBar(p,d); wireDistStatusBar(p,d,ctx); } } }; }
  }
  // ---- delivery country select wiring ----
  function rebuildCountryOptions(sel,d){ const cs=countriesFor(d); sel.innerHTML=cs.map((c,i)=>`<option value="${i}">${c.name}</option>`).join('')+'<option value="__add">+ Add country…</option>'; }
  function addCountry(d){ const n=prompt('Delivery country name:'); if(!n) return null; const m=parseFloat(prompt('Cost multiplier vs UK (e.g. 1.8):','2'))||2; const cs=countriesFor(d); cs.push({name:n.trim(),mult:m}); d.price.country=cs.length-1; return cs[cs.length-1]; }
  function wireCountrySelect(id,d,onChange){ const sel=document.getElementById(id); if(!sel) return; sel.onchange=()=>{ if(sel.value==='__add'){ const added=addCountry(d); if(!added){ sel.value=String(d.price.country||0); return; } } else { d.price.country=+sel.value; } onChange&&onChange(); }; }
  // ---- additional charges wiring ----
  function wireAdditional(d,ctx){
    const wrap=document.querySelector('.pm-distprice'); if(!wrap) return;
    const listFor=side=> side==='cost'?d.price.supplierAdditional:d.price.additional;
    const redraw=side=>{ const body=wrap.querySelector('[data-acbody="'+side+'"]'); if(body) body.innerHTML=acRows(listFor(side),ctx,side); const foot=wrap.querySelector('[data-acfoot="'+side+'"]'); if(foot) foot.textContent=money(ctx,acTotal(listFor(side))); updateResultAddl(d,ctx); };
    wrap.querySelectorAll('table.pm-ac').forEach(tbl=>{
      const side=tbl.dataset.side; const list=listFor(side);
      tbl.addEventListener('input',e=>{ const tr=e.target.closest('tr[data-i]'); if(!tr)return; const i=+tr.dataset.i,k=e.target.dataset.k; if(!list[i])return; list[i][k]=e.target.classList.contains('pm-ac-num')?(parseFloat(e.target.value)||0):e.target.value; if(k==='qty'||k==='unit'){ const lt=tr.querySelector('.pm-ac-lt'); if(lt)lt.textContent=money(ctx,(+list[i].qty||0)*(+list[i].unit||0)); const foot=wrap.querySelector('[data-acfoot="'+side+'"]'); if(foot)foot.textContent=money(ctx,acTotal(list)); updateResultAddl(d,ctx); } if(ctx.persist)ctx.persist(); });
      tbl.addEventListener('click',e=>{ const del=e.target.closest('.pm-ac-del'); if(del){ const tr=del.closest('tr[data-i]'); if(tr){ list.splice(+tr.dataset.i,1); redraw(side); if(ctx.persist)ctx.persist(); } } });
    });
    wrap.querySelectorAll('.pm-ac-add').forEach(btn=>btn.onclick=()=>{ const side=btn.dataset.side; listFor(side).push({label:'',desc:'',qty:1,unit:0}); redraw(side); });
  }
  // ---- locked-price editor wiring ----
  function wireLocked(p,d,ctx){
    const mod=document.getElementById('dpLockedMod'); if(!mod) return;
    const lk=lockedState(d);
    function rebuild(){ const live=document.getElementById('dpLockedMod'); if(!live) return; const holder=document.createElement('div'); holder.innerHTML=lockedEditorHTML(p,d,ctx,0); const fresh=holder.firstElementChild; live.replaceWith(fresh); wireLocked(p,d,ctx); lockedRecompute(d,ctx); if(ctx.persist)ctx.persist(); }
    mod.querySelectorAll('.lk-colchk').forEach(cb=>cb.onchange=()=>{ const ci=+cb.dataset.col; if(cb.checked) lk.cols[ci]=true; else delete lk.cols[ci]; rebuild(); });
    const tbl=document.getElementById('lkTable');
    if(tbl) tbl.addEventListener('input',e=>{ if(e.target.classList.contains('lk-in')){ lk.vals[e.target.dataset.r+'_'+e.target.dataset.col]=e.target.value; lockedRecompute(d,ctx); if(ctx.persist)ctx.persist(); } });
    wireCountrySelect('lkCo',d,()=>{ // delivery defaults change → refresh placeholders
      lockedRecompute(d,ctx);
      const s=document.getElementById('dpCo'); if(s){ rebuildCountryOptions(s,d); s.value=String(d.price.country||0); }
    });
    { const t=document.getElementById('lk2sup'); if(t) t.onchange=()=>{ lk.two=t.checked; rebuild(); }; }
    { const r=document.getElementById('lkRevert'); if(r) r.onclick=()=>{ lk.vals={}; lk.cols={}; lk.quote=null; lk.reqState=null; lk.reqNames=null; rebuild(); }; }
    { const q=document.getElementById('lkReq'); if(q) q.onclick=()=>openLockQuoteModal(p,d,ctx,()=>{ const st=document.getElementById('lkReqStatus'); if(st){ st.hidden=false; st.innerHTML=lockedReqStatusHTML(d); wireLockReply(p,d,ctx); } }); }
    wireLockReply(p,d,ctx);
    lockedRecompute(d,ctx);
  }
  function wireLockReply(p,d,ctx){ const v=document.getElementById('lkViewReply'); if(v) v.onclick=()=>openLockReplyModal(p,d,ctx,()=>{ const st=document.getElementById('lkReqStatus'); if(st){ st.hidden=false; st.innerHTML=lockedReqStatusHTML(d); } const live=document.getElementById('dpLockedMod'); if(live){ const holder=document.createElement('div'); holder.innerHTML=lockedEditorHTML(p,d,ctx,0); const fresh=holder.firstElementChild; live.replaceWith(fresh); wireLocked(p,d,ctx); lockedRecompute(d,ctx); } }); }
  function lockedRecompute(d,ctx){
    const tbl=document.getElementById('lkTable'); if(!tbl) return;
    const lk=lockedState(d); const breaks=d.price.breaks; const defs=lockedDefaults(d);
    const num=s=>{ if(s==null)return NaN; const m=String(s).replace(/[^0-9.]/g,''); return m===''?NaN:parseFloat(m); };
    const getVal=(r,ci)=>{ const n=num(lk.vals[r+'_'+ci]); return isNaN(n)?defs[ci][r]:n; };
    const gp=n=>money(ctx,n);
    const setCell=(r,ci,txt,bold)=>{ const td=tbl.querySelector('td[data-r="'+r+'"][data-col="'+ci+'"]'); if(!td)return; td.innerHTML=bold?'<b>'+txt+'</b>':txt; };
    Object.keys(lk.cols).forEach(k=>{ const ci=+k; const qty=breaks[ci]&&breaks[ci].q; if(!qty)return;
      const unb=getVal('cUnb',ci),deco=getVal('cDeco',ci),setup=getVal('cSetup',ci),deliv=getVal('cDeliv',ci);
      const goodsUnit=unb+deco+setup/qty; const totalCost=goodsUnit*qty; const mk=markupFor(totalCost);
      const unbSell=unb*mk, decoSell=deco*mk, setupSell=roundUp5(setup*1.35), delivSell=Math.round(deliv*1.25);
      const sellUnit=unbSell+decoSell+setupSell/qty; const profitUnit=sellUnit-goodsUnit;
      setCell('sUnb',ci,gp(unbSell)); setCell('sDeco',ci,gp(decoSell)); setCell('sSetup',ci,gp(setupSell)); setCell('sDeliv',ci,gp(delivSell));
      setCell('tCost',ci,gp(goodsUnit),true); setCell('tSell',ci,gp(sellUnit),true);
      setCell('pUnit',ci,gp(profitUnit)); setCell('pTot',ci,gp(profitUnit*qty));
    });
  }
  function slugMail(name){ return name.toLowerCase().replace(/[^a-z0-9]+/g,'')+'.co'; }
  function nowStamp(){ const n=new Date(); return String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0')+'/'+String(n.getFullYear()).slice(2)+' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); }
  function lockContacts(d){
    const lk=lockedState(d);
    if(d.twoSupplier && lk.two){ const ps=d.twoSupplier.product.supplier, bs=d.twoSupplier.branding.supplier; return [
      {n:'Tom Reed',r:'Production',e:'tom@'+slugMail(ps),s:'product',sup:ps},
      {n:'Dana Vale',r:'Sales',e:'dana@'+slugMail(ps),s:'product',sup:ps},
      {n:'Sarah Hill',r:'Account Manager',e:'sarah@'+slugMail(bs),s:'branding',sup:bs},
      {n:'Priya Shah',r:'Estimating',e:'priya@'+slugMail(bs),s:'branding',sup:bs}]; }
    const sup=d.twoSupplier?d.twoSupplier.branding.supplier:'MerchCo Supplies';
    return [{n:'Sarah Hill',r:'Account Manager',e:'sarah@'+slugMail(sup),s:'branding',sup},{n:'Priya Shah',r:'Estimating',e:'priya@'+slugMail(sup),s:'branding',sup}];
  }
  function lockQuantitiesLabel(d){ const lk=lockedState(d); const sel=Object.keys(lk.cols).map(k=>d.price.breaks[+k].q).sort((a,b)=>a-b); return sel.length?sel.map(q=>q.toLocaleString()).join(', '):d.price.breaks.slice(0,4).map(b=>b.q.toLocaleString()).join(', '); }
  function ensureLockScrim(){ let s=document.getElementById('pmLockScrim'); if(!s){ s=document.createElement('div'); s.className='pm-qreq-scrim'; s.id='pmLockScrim'; s.innerHTML='<div class="pm-qreq-modal" id="pmLockModal"></div>'; document.body.appendChild(s); s.addEventListener('click',e=>{ if(e.target===s) closeLockScrim(); }); } return s; }
  function closeLockScrim(){ const s=document.getElementById('pmLockScrim'); if(s){ s.classList.remove('open'); document.body.style.overflow=''; } }
  function lockSpecHTML(d){ const ch=d.branding.chosen; const pc=(d.colours.find(c=>c.name===ch.productColour)||d.colours[0]||{}); return `<div class="pm-qreq-spec"><div class="pm-qreq-srow"><span>Product colour</span><b>${pc.name||'—'}${pc.pms&&pc.pms!=='PMS NA'?' ('+pc.pms+')':''}</b></div><div class="pm-qreq-srow"><span>Branding</span><b>${brandingDecoLabel(d)}</b></div><div class="pm-qreq-srow"><span>Window</span><b>${lockQuantitiesLabel(d)}</b></div></div>`; }
  function openLockQuoteModal(p,d,ctx,onSent){
    const lk=lockedState(d); const scrim=ensureLockScrim(); const modal=document.getElementById('pmLockModal');
    const contacts=lockContacts(d); const sel=new Set();
    const groupHTML=()=>{ const two=d.twoSupplier&&lk.two;
      if(two){ const ps=contacts.filter(c=>c.s==='product'), bs=contacts.filter(c=>c.s==='branding');
        const block=(arr,title)=>`<div class="pm-qreq-sup">${title}</div>`+arr.map(c=>{ const i=contacts.indexOf(c); return `<label class="pm-qreq-contact"><input type="checkbox" data-c="${i}"><span><b>${c.n}</b><span>${c.r} · ${c.e}</span></span></label>`; }).join('');
        return block(ps,'Product supplier · '+d.twoSupplier.product.supplier)+block(bs,'Branding supplier · '+d.twoSupplier.branding.supplier); }
      return contacts.map((c,i)=>`<label class="pm-qreq-contact"><input type="checkbox" data-c="${i}"><span><b>${c.n}</b><span>${c.r} · ${c.e}</span></span></label>`).join('');
    };
    modal.innerHTML=`<button class="pm-qreq-x" data-x>×</button><div class="pm-qreq-eyebrow">Quote check</div><div class="pm-qreq-title">Request a price quote from production</div>
      <div class="pm-qreq-subt">${p.name}</div>${lockSpecHTML(d)}
      <div class="pm-qreq-clabel">Notify contacts to provide the quote</div>
      <div class="pm-qreq-contacts">${groupHTML()}</div>
      <div class="pm-qreq-field"><label>Quantities to quote</label><input type="text" value="${lockQuantitiesLabel(d)}"></div>
      <div class="pm-qreq-field"><label>Notes for production</label><textarea placeholder="Anything to flag…"></textarea></div>
      <div class="pm-qreq-foot"><button class="pm-qreq-send" id="pmQSend" disabled>Send request</button><button class="pm-qreq-cancel" data-x>Cancel</button></div>`;
    modal.querySelectorAll('[data-c]').forEach(cb=>cb.addEventListener('change',()=>{ const i=+cb.dataset.c; if(cb.checked)sel.add(i);else sel.delete(i); cb.closest('.pm-qreq-contact').classList.toggle('on',cb.checked); const s=modal.querySelector('#pmQSend'); s.disabled=!sel.size; s.textContent=sel.size?('Send request to '+sel.size+' contact'+(sel.size>1?'s':'')):'Send request'; }));
    modal.querySelector('#pmQSend').onclick=()=>{ lk.reqState='awaiting'; lk.reqNames=[...sel].map(i=>contacts[i].n).join(', '); closeLockScrim(); onSent&&onSent(); };
    modal.querySelectorAll('[data-x]').forEach(b=>b.onclick=closeLockScrim);
    scrim.classList.add('open'); document.body.style.overflow='hidden';
  }
  function openLockReplyModal(p,d,ctx,onDone){
    const lk=lockedState(d); const scrim=ensureLockScrim(); const modal=document.getElementById('pmLockModal');
    const cols=Object.keys(lk.cols).map(k=>+k).sort((a,b)=>a-b); const breaks=d.price.breaks;
    const colsUse=cols.length?cols:breaks.map((b,i)=>i).slice(0,4);
    const defs=lockedDefaults(d);
    const fields=colsUse.map(ci=>`<div class="pm-qreq-field"><label>${breaks[ci].q.toLocaleString()}+ deco / unit</label><input data-col="${ci}" value="£${defs[ci].cDeco.toFixed(2)}"></div>`).join('');
    modal.innerHTML=`<button class="pm-qreq-x" data-x>×</button><div class="pm-qreq-eyebrow">Supplier enquiries · quote response</div><div class="pm-qreq-title">Provide your price quote</div>
      <div class="pm-qreq-subt">${(d.twoSupplier?d.twoSupplier.branding.supplier:'MerchCo Supplies')} · ${p.name}</div>${lockSpecHTML(d)}
      <div class="pm-qreq-grid">${fields}</div>
      <div class="pm-qreq-field"><label>Setup charge</label><input id="pmQSetup" value="£${defs[colsUse[0]].cSetup.toFixed(2)}"></div>
      <div class="pm-qreq-grid"><div class="pm-qreq-field"><label>Your name</label><input id="pmQName" value="Sarah Hill"></div><div class="pm-qreq-field"><label>Quote ref</label><input id="pmQRef" value="Q-48817"></div></div>
      <div class="pm-qreq-foot"><button class="pm-qreq-send" id="pmQSubmit">Submit quote</button><button class="pm-qreq-cancel" data-x>Cancel</button></div>`;
    modal.querySelector('#pmQSubmit').onclick=()=>{
      const num=s=>{ const m=String(s).replace(/[^0-9.]/g,''); return m===''?NaN:parseFloat(m); };
      modal.querySelectorAll('[data-col]').forEach(inp=>{ const v=num(inp.value); if(!isNaN(v)) lk.vals['cDeco_'+inp.dataset.col]=v.toFixed(2); });
      const setup=num(modal.querySelector('#pmQSetup').value); colsUse.forEach(ci=>{ if(!isNaN(setup)) lk.vals['cSetup_'+ci]=setup.toFixed(2); });
      const name=modal.querySelector('#pmQName').value||'Sarah Hill'; const ref='Quote #'+(modal.querySelector('#pmQRef').value||'Q-0000'); const stamp=nowStamp();
      lk.reqState='quoted'; lk.quote={ branding:{name,stamp,ref} };
      if(d.twoSupplier&&lk.two) lk.quote.product={name:'Tom Reed',stamp:nowStamp(),ref:'Quote #Q-48790'};
      closeLockScrim(); onDone&&onDone();
    };
    modal.querySelectorAll('[data-x]').forEach(b=>b.onclick=closeLockScrim);
    scrim.classList.add('open'); document.body.style.overflow='hidden';
  }
  function brandingLabelShort(d){ const ch=d.branding.chosen; if(!ch||!ch.positions||!ch.positions.length) return 'Unbranded'; return ch.positions.map(pos=>{ const meta=(d.branding.positions||[]).find(x=>x.code===pos.code)||{name:pos.code}; const m=METHODS[pos.method]||{}; return meta.name+' · '+(m.name||pos.method)+' · '+decoLabel(m,pos.numColours); }).join('  |  '); }
  function buildSavings(p,d,ctx){
    const breaks=d.price.breaks; const base=priceCalc(d,breaks[0].q).unit; const cq=qtyOf(p);
    const rows=breaks.map(b=>{ const u=priceCalc(d,b.q).unit; const save=base-u; const on=cq>=b.q && cq<(breaks[breaks.indexOf(b)+1]?breaks[breaks.indexOf(b)+1].q:Infinity);
      return `<tr class="${on?'on':''}"><td>${b.q.toLocaleString()}${on?' (current)':''}</td><td><b>${money(ctx,u)}</b></td><td>${money(ctx,u*b.q)}</td><td>${save>0.0001?money(ctx,save):'—'}</td><td>${save>0.0001?money(ctx,save*b.q):'—'}</td></tr>`; }).join('');
    return `<div class="pm-section"><h4>Price-break savings</h4><p class="pr-savlbl">${brandingLabelShort(d)}</p>
      <table class="pr-matrix"><thead><tr><th>Qty</th><th>Unit</th><th>Total</th><th>Save / unit</th><th>You save</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---------- customer-facing price module (slider · discount · savings) ----------
  function custDelivery(p,d,ctx){
    const cal=unitSell(d,qtyOf(p)).calc;
    return `<div class="pm-section"><h4>Delivery</h4><p>Delivery <b id="cuDeliv">${money(ctx,cal.delivery)}</b> per UK address — scales with quantity. <a href="#" class="pm-link">Change country</a>.</p></div>`;
  }
  function custPriceModule(p,d,ctx){
    const breaks=d.price.breaks; const sb=sliderBreaks(d); const q=qtyOf(p);
    let si=0; sb.forEach((b,i)=>{ if(q>=b.q) si=i; });
    const idx=fullIdxForQ(d, sb[si].q);
    const ticks=sb.map((b,i)=>`<span class="${i===si?'on':''}">${b.q.toLocaleString()}</span>`).join('');
    const disc=Math.round(discountPctOf(d));
    const pst=p.actions[1]?p.actions[1].st:'awaiting';
    const expNote = (pst!=='approved' && d.price._expired) ? `<div class="cu-apprbar expired"><span><svg class="icn"><use href="#ic-clock"/></svg>This price has expired — your distributor is re-checking it.</span></div>` : '';
    const apprBar = pst==='approved'
      ? `<div class="cu-apprbar approved"><span><svg class="icn"><use href="#ic-check"/></svg>Price approved · valid until ${fmtDate(expiryDate(d))}</span><button class="pm-cta-sec sm" id="cuUnappr">Request changes</button></div>`
      : expNote+`<div class="cu-apprbar"><span>Happy with the price?</span><button class="pm-cta sm" id="cuAppr"><svg class="icn"><use href="#ic-check"/></svg>Approve price</button></div>`;
    return `<div class="pm-cust" data-disc="${disc}">
      ${apprBar}
      <p class="pr-savlbl">${brandingLabelShort(d)}</p>
      <div class="pm-cmod">
        <div class="pm-cmodh">1 · Quantity</div>
        <div class="cu-sliderrow"><input type="range" id="cuRange" min="0" max="${sb.length-1}" step="1" value="${si}"><output id="cuQty" class="cu-qty">${sb[si].q.toLocaleString()}</output></div>
        <div class="cu-ticks" id="cuTicks">${ticks}</div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">2 · Your unit price</div>
        <div class="cu-priceline">${disc?`<span class="cu-was" id="cuWas"></span>`:''}<span class="cu-now" id="cuNow"></span><span class="cu-each">/ unit</span>${disc?`<span class="cu-disc">${disc}% off</span>`:''}</div>
        <div class="cu-linetotal">Line total <b id="cuTotal"></b></div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">3 · The more you order, the more you save</div>
        <div class="cu-saverow">
          <div class="cu-savebox"><span id="cuSaveUnit">—</span><small id="cuSaveUnitLbl">saved / unit</small></div>
          <div class="cu-savebox big"><span id="cuSaveTot">—</span><small>total saving</small></div>
          <div class="cu-savebox next" id="cuNextBox"><span id="cuNext"></span><small id="cuNextLbl"></small></div>
        </div>
      </div>
      <div class="pm-cmod">
        <div class="pm-cmodh">4 · Delivery</div>
        <div class="cu-priceline"><span class="cu-now" style="font-size:24px" id="cuDeliv"></span><span class="cu-each">cost +25% · scales with quantity</span></div>
        <div class="cu-linetotal pr-corow">to ${countrySelectHTML(d,'cuCo')}</div>
      </div>
      ${(d.price.additional&&d.price.additional.length)?`<div class="pm-cmod">
        <div class="pm-cmodh">5 · Additional costs</div>
        ${d.price.additional.map(a=>{ const amt=a.amt!=null?a.amt:(+a.qty||1)*(+a.unit||0); const q=a.qty!=null?a.qty:1; const u=a.unit!=null?a.unit:amt; return `<div class="cu-acline"><div class="cu-acmeta"><b>${a.label}</b>${a.desc?`<span>${a.desc}</span>`:''}${a.unit!=null?`<span class="cu-acqty">${q} × ${money(ctx,u)}</span>`:''}</div><b class="cu-aclt">${money(ctx,amt)}</b></div>`; }).join('')}
        <div class="cu-linetotal" style="margin-top:10px">Additional total <b>${money(ctx,d.price.additional.reduce((s,a)=>s+(a.amt!=null?a.amt:(+a.qty||1)*(+a.unit||0)),0))}</b></div>
      </div>`:''}
      <div class="pm-cmod" style="border-top:1px solid var(--line-soft)">
        <button class="pm-cta-sec sm" id="cuShowMatrix">View full price table</button>
        <div id="cuMatrixWrap" style="display:none;margin-top:14px">
          ${custFullMatrix(d,ctx,idx)}
          <p class="pr-costnote">Sell prices for every method &amp; colour count. Delivery &amp; any additional costs are added on top.</p>
        </div>
      </div>
    </div>`;
  }
  function wireCustPrice(p,d,ctx){
    const rg=document.getElementById('cuRange'); if(!rg) return;
    const breaks=d.price.breaks; const sb=sliderBreaks(d); const disc=discountPctOf(d)/100;
    const gbp=ctx.gbp||(n=>'£'+(+n).toFixed(2)); const g0=n=>'£'+Math.round(n).toLocaleString();
    const ticks=[...document.querySelectorAll('#cuTicks span')];
    const baseNet=priceCalc(d,sb[0].q).unit; // smallest slider-break unit (already net of discount)
    function render(){
      const i=+rg.value, b=sb[i], q=b.q;
      p._mqty=q;
      const net=priceCalc(d,q).unit;            // discounted unit
      const was=disc?net/(1-disc):net;          // pre-discount
      document.getElementById('cuQty').textContent=q.toLocaleString();
      const nowEl=document.getElementById('cuNow'); if(nowEl)nowEl.textContent=gbp(net);
      const wasEl=document.getElementById('cuWas'); if(wasEl)wasEl.textContent=gbp(was);
      const tot=document.getElementById('cuTotal'); if(tot)tot.textContent=gbp(net*q);
      const dEl=document.getElementById('cuDeliv'); if(dEl)dEl.textContent=gbp(unitSell(d,q).calc.delivery);
      const su=baseNet-net, st=su*q;
      document.getElementById('cuSaveUnit').textContent=su>0.0001?gbp(su):'—';
      document.getElementById('cuSaveUnitLbl').textContent='saved / unit vs '+sb[0].q.toLocaleString();
      document.getElementById('cuSaveTot').textContent=st>0.0001?g0(st):'—';
      const nb=document.getElementById('cuNextBox');
      if(i<sb.length-1){ nb.style.display=''; const dd=net-priceCalc(d,sb[i+1].q).unit; document.getElementById('cuNext').textContent=(dd>0?gbp(dd):gbp(0))+' less / unit'; document.getElementById('cuNextLbl').textContent='if you order '+sb[i+1].q.toLocaleString(); }
      else nb.style.display='none';
      ticks.forEach((t,k)=>t.classList.toggle('on',k===i));
      if(ctx.onQty) ctx.onQty(q);
    }
    rg.addEventListener('input',render);
    if(ctx.persist) rg.addEventListener('change',()=>ctx.persist());
    render();
    wireCountrySelect('cuCo',d,()=>{ const dEl=document.getElementById('cuDeliv'); if(dEl)dEl.textContent=gbp(unitSell(d,sb[+rg.value].q).calc.delivery); });
    { const ab=document.getElementById('cuAppr'); if(ab&&ctx.setStatus) ab.onclick=()=>{ d.price._approvedAt=Date.now(); d.price._expired=false; p.actions[1].st='approved'; ctx.setStatus(p,1,'approved','approved the price'); if(ctx.refresh) ctx.refresh('price'); }; }
    { const ub=document.getElementById('cuUnappr'); if(ub&&ctx.setStatus) ub.onclick=()=>{ p.actions[1].st='awaiting'; ctx.setStatus(p,1,'awaiting','reopened the price for changes'); if(ctx.refresh) ctx.refresh('price'); }; }
    { const b=document.getElementById('cuShowMatrix'); if(b) b.onclick=()=>{ const w=document.getElementById('cuMatrixWrap'); const sh=w.style.display==='none'; w.style.display=sh?'':'none'; b.textContent=sh?'Hide full price table':'View full price table'; }; }
  }

  // ---------- SAMPLE ----------
  function sampleBody(p,d,ctx,role){
    const designApproved = p.actions[0].st==='approved';
    const sm=sampleFor(p,d); const u=sm.unbranded, b=sm.branded;
    const typeCard=(s, label, idx, locked, lockNote)=>{
      const c=sampleCalc(s);
      const sellLine = c.mode==='free' ? '<span class="sm-sell free">Free</span>'
        : (c.mode==='quote') ? '<span class="sm-sell quote">Price on request</span>'
        : `<span class="sm-sell">${money(ctx,c.sell)} <small>/ sample</small></span>`;
      const quoteInfo = (role==='dist' && c.quoteNote) ? `<div class="sm-quote"><svg class="icn"><use href="#ic-clock"/></svg><div><b>Supplier quote</b><span>${(''+c.quoteNote).replace(/</g,'&lt;')}</span></div></div>` : '';
      // distributor breakdown: cost → markup → sell (cost & sell editable)
      let distRow='';
      if(role==='dist'){
        const costEditable = c.mode==='priced'||c.mode==='quoted';
        const costCell = c.mode==='free' ? '<b>Free</b>'
          : (c.mode==='quote') ? '<b class="sm-await">Awaiting quote</b>'
          : `<span class="sm-edit"><span class="sm-pound">£</span><input type="number" class="sm-cost" step="0.01" min="0" value="${c.cost.toFixed(2)}"></span>`;
        const sellCell = (c.mode==='quote') ? '<b>—</b>'
          : c.mode==='free' ? `<b>${money(ctx,0)}</b>`
          : `<span class="sm-edit"><span class="sm-pound">£</span><input type="number" class="sm-sell-in" step="0.01" min="0" value="${c.sell.toFixed(2)}"></span>`;
        distRow=`<div class="sm-breakdown">
            <div class="sm-bd"><span>Cost</span>${costCell}</div>
            <div class="sm-bd"><span>Markup</span><b>${(c.mode==='quote'||c.mode==='free')?'—':'×'+c.markup.toFixed(2)}</b></div>
            <div class="sm-bd sell"><span>Sell</span>${sellCell}</div>
          </div>
          <div class="sm-pricectl" data-type="${idx}">
            <div class="sm-modes">
              <button type="button" class="sm-mode ${(c.mode==='priced'||c.mode==='quoted')&&!s.quote?'on':''}" data-mode="cost">Cost price</button>
              <button type="button" class="sm-mode ${(c.mode==='quote'||c.mode==='quoted')||s.quote?'on':''}" data-mode="quote">Supplier quote</button>
              <button type="button" class="sm-mode ${c.mode==='free'?'on':''}" data-mode="free">Free</button>
            </div>
            ${(c.mode==='quote'||c.mode==='quoted'||s.quote)?`<button type="button" class="pm-cta-sec sm sm-reqquote">${c.mode==='quoted'?'Re-request quote ›':'Request quote from supplier ›'}</button>`:''}
          </div>`;
      }
      return `<div class="sm-type ${idx===0?'on':''} ${locked?'locked':''}">
        <div class="sm-th"><span class="sm-dot ${idx===0?'on':''}"></span><b>${label}</b>${lockNote?`<span class="sm-lock">${lockNote}</span>`:''}</div>
        <div class="sm-meta">${sellLine} · lead ${s.lead} working days</div>
        ${quoteInfo}
        ${distRow}
      </div>`;
    };
    const scfg=(p.design&&p.design.sampleCfg)||{};
    const mode = sampleMode(scfg);
    const mto = d.stockSource==='mto';
    const slug=p.name.replace(/[^a-z0-9]/gi,'-').toLowerCase();
    const stockOf=(colour,variant)=> (d.stock&&d.stock[colour]) ? d.stock[colour][variant] : null;
    const colourOOS=(colour)=> mto?false:d.sizes.every(sz=>stockOf(colour,sz)===0);
    const sampleImg=(kind)=>{
      if(kind==='unbranded') return `<div class="sm-img"><image-slot id="smu-${slug}" shape="rounded" fit="contain" src="assets/products/${p.img}.png" placeholder="Store product image"></image-slot></div>`;
      const proof=proofImgList(p);
      const inner = proof[0] ? `<img src="${proof[0]}" alt="Proof">` : `<image-slot id="proof-${slug}-v1-0" shape="rounded" fit="contain" placeholder="Proof artwork"></image-slot>`;
      return `<div class="sm-img sm-img-proof">${inner}<span class="sm-imgtag">Proof</span></div>`;
    };
    const sel = p.sampleSel || (p.sampleSel={colour:(d.colours[0]||{}).name, variant:d.sizes[0]});
    if(colourOOS(sel.colour)){ const ok=d.colours.find(c=>!colourOOS(c.name)); if(ok) sel.colour=ok.name; }
    const chooser=()=>{
      const ord=p.sampleOrder;
      const colours=`<div class="sm-chgrp"><h5>Colour</h5><div class="bb-swatches">${d.colours.map(c=>{const oos=colourOOS(c.name);return `<button type="button" class="bb-sw ${sel.colour===c.name?'on':''} ${oos?'oos':''}" data-smcol="${c.name}" ${oos?'disabled':''}><i style="background:${hex(c.name)}"></i><span>${c.name}<small>${oos?'Out of stock':pmsOf(c)}</small></span></button>`;}).join('')}</div></div>`;
      const vars=`<div class="sm-chgrp"><h5>Variant</h5><div class="bb-vars">${d.sizes.map(sz=>{const oos=mto?false:(stockOf(sel.colour,sz)===0);return `<button type="button" class="bb-var ${sel.variant===sz?'on':''} ${oos?'oos':''}" data-smvar="${sz}" ${oos?'disabled':''}>${sz}${oos?' · out of stock':''}</button>`;}).join('')}</div></div>`;
      const added = ord ? `<div class="sm-added"><svg class="icn"><use href="#ic-check"/></svg><div><b>In your sample basket</b><span>${ord.colour} · ${ord.variant} · ×${ord.qty} — adjust the quantity in the basket.</span></div></div>` : '';
      return `<div class="sm-choose"><div class="sm-chrow">${colours}${vars}</div><button type="button" class="pm-cta sm sm-addorder"><svg class="icn"><use href="#ic-bag"/></svg>Add sample to order</button>${added}</div>`;
    };
    const brandedChooser=()=>{
      const ord=p.brandedSampleOrder;
      const added = ord ? `<div class="sm-added"><svg class="icn"><use href="#ic-check"/></svg><div><b>In your sample basket</b><span>Branded sample (to approved proof) · ×${ord.qty} — adjust the quantity in the basket.</span></div></div>` : '';
      return `<div class="sm-choose"><p class="sm-bsamp">Made to your approved proof. <a href="#" class="pm-link sm-viewproof">View proof ›</a></p><button type="button" class="pm-cta sm sm-addbranded"><svg class="icn"><use href="#ic-bag"/></svg>Add branded sample to order</button>${added}</div>`;
    };
    const card=(kind)=>{
      const isU=kind==='unbranded';
      const s=isU?u:b; const c=sampleCalc(s);
      const locked=!isU&&!designApproved;
      const lockNote=(!isU&&!designApproved)?'Needs design approval':'';
      const sellLine = c.mode==='free' ? '<span class="sm-sell free">Free</span>'
        : (c.mode==='quote') ? '<span class="sm-sell quote">Price on request</span>'
        : `<span class="sm-sell">${money(ctx,c.sell)} <small>/ sample</small></span>`;
      const quoteInfo = (role==='dist' && c.quoteNote) ? `<div class="sm-quote"><svg class="icn"><use href="#ic-clock"/></svg><div><b>Supplier quote</b><span>${(''+c.quoteNote).replace(/</g,'&lt;')}</span></div></div>` : '';
      let distRow='';
      if(role==='dist'){
        const costCell = c.mode==='free' ? '<b>Free</b>' : (c.mode==='quote') ? '<b class="sm-await">Awaiting quote</b>'
          : `<span class="sm-edit"><span class="sm-pound">£</span><input type="number" class="sm-cost" step="0.01" min="0" value="${c.cost.toFixed(2)}"></span>`;
        const sellCell = (c.mode==='quote') ? '<b>—</b>' : c.mode==='free' ? `<b>${money(ctx,0)}</b>`
          : `<span class="sm-edit"><span class="sm-pound">£</span><input type="number" class="sm-sell-in" step="0.01" min="0" value="${c.sell.toFixed(2)}"></span>`;
        distRow=`<div class="sm-breakdown">
            <div class="sm-bd"><span>Cost</span>${costCell}</div>
            <div class="sm-bd"><span>Markup</span><b>${(c.mode==='quote'||c.mode==='free')?'—':'×'+c.markup.toFixed(2)}</b></div>
            <div class="sm-bd sell"><span>Sell</span>${sellCell}</div>
          </div>
          <div class="sm-pricectl" data-type="${isU?0:1}">
            <div class="sm-modes">
              <button type="button" class="sm-mode ${(c.mode==='priced'||c.mode==='quoted')&&!s.quote?'on':''}" data-mode="cost">Cost price</button>
              <button type="button" class="sm-mode ${(c.mode==='quote'||c.mode==='quoted')||s.quote?'on':''}" data-mode="quote">Supplier quote</button>
              <button type="button" class="sm-mode ${c.mode==='free'?'on':''}" data-mode="free">Free</button>
            </div>
            ${(c.mode==='quote'||c.mode==='quoted'||s.quote)?`<button type="button" class="pm-cta-sec sm sm-reqquote">${c.mode==='quoted'?'Re-request quote ›':'Request quote from supplier ›'}</button>`:''}
          </div>`;
      }
      return `<div class="sm-type sm-card2 on ${locked?'locked':''}">
        ${sampleImg(kind)}
        <div class="sm-cardbody">
          <div class="sm-th"><span class="sm-dot on"></span><b>${isU?'Unbranded sample':'Branded sample'}</b>${lockNote?`<span class="sm-lock">${lockNote}</span>`:''}</div>
          <div class="sm-meta">${sellLine} · lead ${s.lead} working days</div>
          ${quoteInfo}
          ${isU?chooser():(locked?'':brandedChooser())}
          ${distRow}
        </div>
      </div>`;
    };
    const optSel = '';
    let typesInner;
    if(mode==='none'){
      typesInner=`<div class="sm-notreq"><svg class="icn"><use href="#ic-ban"/></svg><div><b>No sample required</b><span>No sample needs approving before this product can move to Ready to order.</span></div></div>`;
    } else {
      const showBranded = (mode==='branded' || mode==='both' || scfg.includeBranded) && !(d.branding&&d.branding.chosen&&d.branding.chosen.unbranded);
      typesInner=`${card('unbranded')}${showBranded?card('branded'):''}`;
    }
    const note=(role==='dist'&&mode!=='none')?'<p class="sm-pricenote">Cost pulled from the product\u2019s <b>Sample cost</b> (Store \u2192 product Edit); cost &amp; sell editable here (\u00d7'+SAMPLE_MARKUP.toFixed(2)+' markup, min +'+money(ctx,SAMPLE_MIN_UPLIFT)+').</p>':'';
    return `<div class="pm-section">${optSel}<div class="sm-types sm-types2">${typesInner}</div>${note}</div>`;
  }
  function sampleMode(cfg){ cfg=cfg||{}; if(cfg.mode) return cfg.mode; if(cfg.notRequired) return 'none'; if(cfg.includeBranded) return cfg.unbrandedOff?'branded':'both'; return 'unbranded'; }
  function wireSample(p,d,ctx){
    const refresh=()=>{ if(ctx.refresh) ctx.refresh('sample'); if(ctx.persist) ctx.persist(); };
    // 4-way sample mode selector (No sample / Unbranded / Branded / Both)
    document.querySelectorAll('.sm-opt').forEach(btn=>btn.onclick=()=>{
      const m=btn.dataset.smmode; p.design=p.design||{}; const cfg=p.design.sampleCfg=p.design.sampleCfg||{};
      cfg.mode=m; cfg.notRequired=(m==='none'); cfg.includeBranded=(m==='branded'||m==='both'); cfg.unbrandedOff=(m==='branded');
      if(typeof recomputeProductStatus==='function') recomputeProductStatus(p);
      refresh();
    });
    // unbranded colour / variant chooser + add to order
    document.querySelectorAll('.sm-choose [data-smcol]').forEach(b=>b.onclick=()=>{ p.sampleSel=p.sampleSel||{}; p.sampleSel.colour=b.dataset.smcol; refresh(); });
    document.querySelectorAll('.sm-choose [data-smvar]').forEach(b=>b.onclick=()=>{ p.sampleSel=p.sampleSel||{}; p.sampleSel.variant=b.dataset.smvar; refresh(); });
    { const add=document.querySelector('.sm-addorder'); if(add) add.onclick=()=>{ const sel=p.sampleSel||{}; p.sampleOrder={colour:sel.colour,variant:sel.variant,qty:(p.sampleOrder&&p.sampleOrder.qty)||1}; if(window.addProductToBasket) window.addProductToBasket(p,'sample'); if(window.MStoast) MStoast('Unbranded sample added to your order'); refresh(); }; }
    { const addb=document.querySelector('.sm-addbranded'); if(addb) addb.onclick=()=>{ p.brandedSampleOrder={qty:(p.brandedSampleOrder&&p.brandedSampleOrder.qty)||1}; if(window.addProductToBasket) window.addProductToBasket(p,'sample'); if(window.MStoast) MStoast('Branded sample added to your order'); refresh(); }; }
    { const vp=document.querySelector('.sm-viewproof'); if(vp) vp.onclick=(e)=>{ e.preventDefault(); if(ctx.openProof) ctx.openProof(p); else if(window.MSModal&&MSModal.openProof) MSModal.openProof(p,d,ctx); }; }
    document.querySelectorAll('.sm-pricectl').forEach(ctl=>{
      const type = ctl.dataset.type==='0' ? 'unbranded' : 'branded';
      const cur = sampleFor(p,d)[type];
      ctl.querySelectorAll('.sm-mode').forEach(btn=>btn.onclick=()=>{
        const m=btn.dataset.mode;
        if(m==='free') sampleSet(p.name,type,{mode:'free',free:true,quote:false});
        else if(m==='quote') sampleSet(p.name,type,{mode:'quote',quote:true,free:false});
        else sampleSet(p.name,type,{mode:'cost',quote:false,free:false,cost:(cur.cost!=null?cur.cost:(cur.price!=null?cur.price:0)),sell:null});
        refresh();
      });
      const ci=ctl.parentElement.querySelector('.sm-cost');
      if(ci) ci.onchange=()=>{ const v=parseFloat(ci.value); sampleSet(p.name,type,{cost:isNaN(v)?0:v,sell:null,free:false}); refresh(); };
      const si=ctl.parentElement.querySelector('.sm-sell-in');
      if(si) si.onchange=()=>{ const v=parseFloat(si.value); sampleSet(p.name,type,{sell:isNaN(v)?null:v}); refresh(); };
      const rq=ctl.querySelector('.sm-reqquote');
      if(rq) rq.onclick=()=>{ sampleSet(p.name,type,{mode:'quoted',quote:true,free:false,cost:(cur.cost!=null?cur.cost:24.00),quoteNote:'Quote requested '+new Date().toLocaleDateString('en-GB')+' — supplier to confirm cost & lead.'}); refresh(); };
    });
  }

  // ---------- STOCK ----------
  function stockBody(p,d,ctx,role){
    const src=d.stockSource;
    if(src==='mto'){
      return `<div class="pm-section"><h4>Stock</h4><div class="st-mto"><svg class="icn"><use href="#ic-check"/></svg><div><b>Made to order</b><span>Produced to your quantity — always available, no reservation needed.</span></div></div></div>
        <div class="pm-section"><h4>Available colours</h4><div class="sm-cols">${d.colours.map(c=>`<span class="sm-col"><span class="sw" style="background:${hex(c.name)}"></span>${c.name}</span>`).join('')}</div></div>`;
    }
    const srcTag = src==='api'
      ? '<span class="st-src api"><svg class="icn"><use href="#ic-check"/></svg>Live supplier feed</span>'
      : '<span class="st-src manual"><svg class="icn"><use href="#ic-clock"/></svg>Manual stock check</span>';
    const today='12/10/25';
    const ch=d.branding.chosen||{}; const pc=projColours(p,d);
    const inProject=(colour,sz)=> pc.colours.includes(colour) && (pc.variants[colour]||d.sizes).includes(sz);
    const colInProject=(colour)=> pc.colours.includes(colour);
    const designCol = ch.unbranded?null:ch.productColour;
    const grid = d.colours.map(c=>{
      const inc=d.incoming.filter(x=>x.colour===c.name);
      const colPicked = designCol===c.name;
      const relevant = colInProject(c.name);
      const rows=d.sizes.map(sz=>{
        const qv=(d.stock[c.name]||{})[sz];
        const due=inc.find(x=>x.size===sz);
        const sel = colPicked && (ch.variant===sz || d.sizes.length<=1);
        const rel = inProject(c.name,sz);
        return `<div class="st-row ${sel?'sel':''} ${rel?'':'st-dim'}"><span class="st-sz">${sz}${sel?' <span class="st-pick">design</span>':(rel?' <span class="st-rel">in project</span>':'')}</span><span class="st-qty ${qv===0?'zero':''}">${qv==null?'—':qv.toLocaleString()}</span><span class="st-due">${due?`${due.qty.toLocaleString()} due ${due.due}`:''}</span></div>`;
      }).join('');
      return `<div class="st-colour ${colPicked?'sel':''} ${relevant?'':'st-dim'}"><div class="st-ch"><span class="sw" style="background:${hex(c.name)}"></span><b>${c.name}</b>${colPicked?' <span class="st-pick">design</span>':(relevant?' <span class="st-rel">in project</span>':'')}${c.pms&&c.pms!=='PMS NA'?`<small>${c.pms}</small>`:''}</div>${rows}</div>`;
    }).join('');
    const selLine = (designCol) ? `<div class="st-sel-banner"><svg class="icn"><use href="#ic-check"/></svg>Design uses <b>${designCol}${ch.variant?' · '+ch.variant:''}</b>. <b>In-project</b> colours/variants are tagged; others are dimmed.</div>` : `<div class="st-sel-banner"><svg class="icn"><use href="#ic-check"/></svg><b>In-project</b> colours/variants are tagged; others are dimmed.</div>`;
    return ts('stock',d) + `<div class="pm-section"><div class="st-head"><h4>Stock levels at ${today}</h4>${srcTag}</div>${selLine}<div class="st-grid">${grid}</div></div>`;
  }

  /* =========================================================
     WIRING (interactivity)
     ========================================================= */
  function wire(p, tabKey, ctx){
    const d=data(p); if(!d) return; ctx=ctx||{}; const role=ctx.role||'dist';
    if(tabKey==='price') wirePrice(p,d,ctx);
    if(tabKey==='price' && role==='cust') wireCustPrice(p,d,ctx);
    if(tabKey==='price' && role==='dist') wireDistPrice(p,d,ctx);
    if(tabKey==='design') wireDesign(p,d,ctx);
    if(tabKey==='sample') wireSample(p,d,ctx);
  }

  function wirePrice(p,d,ctx){
    { const b=document.getElementById('prShowTable'); if(b) b.onclick=()=>{ const w=document.getElementById('prTableWrap'); if(w){ const sh=w.style.display==='none'; w.style.display=sh?'':'none'; b.textContent=sh?'Hide price table':'Show price table'; } }; }
    const qIn=document.getElementById('prQty'), rg=document.getElementById('prRange');
    if(!qIn||!rg) return;
    const apply=(q)=>{ q=Math.max(1,Math.round(q/50)*50); p._mqty=q; const us=unitSell(d,q); const tot=us.unit*q;
      qIn.value=q; rg.value=Math.min(+rg.max,Math.max(+rg.min,q));
      const u=document.getElementById('prUnit'); if(u)u.textContent=(ctx.gbp?ctx.gbp(us.unit):('£'+us.unit.toFixed(2)))+' ea';
      const ic=document.getElementById('prItemCost'); if(ic)ic.textContent=ctx.gbp?ctx.gbp(us.unit):('£'+us.unit.toFixed(2));
      const it=document.getElementById('prItemTotal'); if(it)it.textContent=ctx.gbp?ctx.gbp(tot):('£'+tot.toFixed(2));
      // highlight matrix row
      document.querySelectorAll('.pr-matrix tbody tr').forEach((tr,i)=>{ const bs=d.price.breaks; const next=bs[i+1]?bs[i+1].q:Infinity; tr.classList.toggle('on', q>=bs[i].q && q<next); });
    };
    rg.oninput=()=>apply(+rg.value);
    qIn.onchange=()=>apply(+qIn.value);
    if(ctx.persist){ rg.onchange=()=>ctx.persist(); }
  }

  function wireDesign(p,d,ctx){
    document.querySelectorAll('.ds-open').forEach(b=>b.onclick=()=>openStage(p,d,ctx,b.dataset.stage));
    { const a=document.getElementById('dsvProofOpen'); if(a) a.onclick=()=>openStage(p,d,ctx,'proof'); }
    { const v=document.getElementById('dsvProofView'); if(v) v.onclick=()=>openStage(p,d,ctx,'proof'); }
    { const u=document.getElementById('dsvProofUnappr'); if(u&&ctx.setStatus) u.onclick=()=>{ p.design.proof.st='awaiting'; const rolled=rollDesign(p); ctx.setStatus(p,0,rolled,'reopened the proof for changes'); if(ctx.refresh) ctx.refresh('design'); }; }
    { const vu=document.getElementById('dsvVisUnappr'); if(vu&&ctx.setStatus) vu.onclick=()=>{ p.design.visual.st='awaiting'; const rolled=rollDesign(p); ctx.setStatus(p,0,rolled,'reopened the visual for changes'); if(ctx.refresh) ctx.refresh('design'); }; }
    wireBrandingBuilder(p,d,ctx);
    const stage=document.getElementById('pmVisStage');
    if(stage){
      const slug=stage.dataset.slug, img=stage.dataset.img;
      const frame=document.getElementById('pmVisFrame'), dots=document.getElementById('pmVisDots');
      if(window.__pmVisIdx==null) window.__pmVisIdx={};
      const imgs=visualImgs(p); const n=imgs?imgs.length:3; const bg=visualBg(p);
      const cur=()=>Math.min(window.__pmVisIdx[slug]||0, n-1);
      const positionTrack=(i)=>{ const track=frame.querySelector('.pm-vis-track'); if(!track) return; const fh=frame.clientHeight, fw=frame.clientWidth; if(!fh||!fw) return; const sw=Math.min(fh, fw*0.78), gap=14; track.querySelectorAll('.pm-vis-slide').forEach((s,k)=>{ s.style.width=sw+'px'; s.style.height=sw+'px'; s.classList.toggle('on',k===i); }); track.style.transform=`translateX(${(fw/2)-(i*(sw+gap)+sw/2)}px)`; };
      const render=()=>{ const i=cur();
        if(imgs){
          frame.innerHTML = `<div class="pm-vis-one" style="background:${bg}"><img class="pm-vis-img" src="${imgs[i]}" alt="Visual ${i+1}"></div>`;
        } else {
          frame.innerHTML = `<image-slot id="vis-${slug}-${i}" style="width:100%;height:100%" shape="rounded" fit="contain" src="assets/products/${img}.png" placeholder="Drop indicative visual ${i+1} of ${n}"></image-slot>`;
        }
        if(dots) dots.innerHTML=Array.from({length:n}).map((_,k)=>`<span class="${k===i?'on':''}"></span>`).join('');
      };
      stage.querySelectorAll('.pm-vis-nav').forEach(b=>b.onclick=()=>{ window.__pmVisIdx[slug]=(cur()+(+b.dataset.dir)+n)%n; render(); });
      render();
      // hero magnifier lens
      const mag=document.getElementById('pmVisMag'), lens=document.getElementById('pmVisLens'), vframe=document.getElementById('pmVisFrame');
      if(mag&&lens&&vframe){ let on=false;
        mag.onclick=()=>{ on=!on; mag.classList.toggle('on',on); if(!on) lens.style.display='none'; };
        vframe.addEventListener('mousemove',e=>{ if(!on){return;} const img=vframe.querySelector('img'); if(!img||!img.naturalWidth){ lens.style.display='none'; return; } const rect=img.getBoundingClientRect(); const x=e.clientX-rect.left,y=e.clientY-rect.top; if(x<0||y<0||x>rect.width||y>rect.height){ lens.style.display='none'; return; } const sc=Math.min(rect.width/img.naturalWidth,rect.height/img.naturalHeight); const dw=img.naturalWidth*sc,dh=img.naturalHeight*sc; const ix=x-(rect.width-dw)/2,iy=y-(rect.height-dh)/2; if(ix<0||iy<0||ix>dw||iy>dh){ lens.style.display='none'; return; } const Z=2.4,L=200; lens.style.display='block'; lens.style.position='fixed'; lens.style.zIndex='2000'; lens.style.width=lens.style.height=L+'px'; lens.style.left=(e.clientX-L/2)+'px'; lens.style.top=(e.clientY-L/2)+'px'; lens.style.backgroundImage='url("'+(img.currentSrc||img.src)+'")'; lens.style.backgroundSize=(dw*Z)+'px '+(dh*Z)+'px'; lens.style.backgroundPosition='-'+(ix*Z-L/2)+'px -'+(iy*Z-L/2)+'px'; });
        vframe.addEventListener('mouseleave',()=>{ lens.style.display='none'; });
      }
      // inline visual approval (customer)
      const dRev=document.getElementById('dsvRev'), dAppr=document.getElementById('dsvAppr'), dSub=document.getElementById('dsvSubmit'), dWrap=document.getElementById('dsvRespWrap');
      const commitV=(msg)=>{ const rolled=rollDesign(p); if(ctx.setStatus) ctx.setStatus(p,0,rolled,msg); if(ctx.refresh) ctx.refresh('design'); if(ctx.persist) ctx.persist(); };
      if(dSub){ const upd=()=>{ if(dWrap) dWrap.classList.toggle('show',dRev.checked); dSub.disabled=!(dRev.checked||dAppr.checked); };
        dRev.onchange=()=>{ if(dRev.checked) dAppr.checked=false; upd(); };
        dAppr.onchange=()=>{ if(dAppr.checked) dRev.checked=false; upd(); };
        dSub.onclick=()=>{ if(dAppr.checked){ p.design.visual.st='approved'; commitV('approved the visual'); } else if(dRev.checked){ p.design.visual.st='changes'; commitV('requested visual changes'); } };
      }
      const dSend=document.getElementById('dsvSend'); if(dSend) dSend.onclick=()=>{ p.design.visual.st='withstudio'; commitV('provided visual information'); };
    }
  }

  /* =========================================================
     STAGE VIEWER — shared Visual / Proof approval (versioned, paired)
     ========================================================= */
  const BRAND_PALETTE = [
    {name:'White', pms:'PMS 11-0601 TCX'},{name:'Orange', pms:'PMS 1585 C'},
    {name:'Black', pms:'PMS Black 6 C'},{name:'Navy', pms:'PMS 533 C'},{name:'Green', pms:'PMS 348 C'}
  ];
  function paletteFor(pos){
    if(pos.colours && pos.colours.length) return pos.colours.map(c=>typeof c==='string'?{name:c,pms:NEAREST_PMS[c]||''}:c);
    return BRAND_PALETTE.slice(0, Math.max(1, pos.numColours||1));
  }
  const VISUAL_IMAGES = {
    'Eco Wheat-Straw Charging Cable':['assets/products/eco-visual-1.png','assets/products/eco-visual-2.png','assets/products/eco-visual-3.png']
  };
  function visualImgs(p){ if(p.design&&p.design.visual&&Array.isArray(p.design.visual.images)) return p.design.visual.images.length?p.design.visual.images:null; return VISUAL_IMAGES[p.name] || ['assets/products/'+p.img+'.png']; }
  function visualList(p){ // ensure a mutable array exists for studio editing
    p.design=p.design||{}; p.design.visual=p.design.visual||{};
    if(!Array.isArray(p.design.visual.images)) p.design.visual.images = (VISUAL_IMAGES[p.name] || ['assets/products/'+p.img+'.png']).slice();
    return p.design.visual.images;
  }
  function visualBg(p){ try{ return (p.design&&p.design.visual&&p.design.visual.bg) || '#ffffff'; }catch(e){ return '#ffffff'; } }
  const BG_PRESETS = ['#ffffff','#f3f1ec','#e9e6df','#1a1a1e'];
  const PROOF_FRAMES = 3;
  let svRoot=null, svP=null, svD=null, svCtx=null, svStage='proof', svIdx=0, svZoom=false, svPair=null;

  // ---- Pantone sample library (coated + uncoated) ----
  const PANTONE = [
    {ref:'PMS 1585 C',hex:'# e8893a'.replace(' ','')},{ref:'PMS 1585 U',hex:'#eda05a'},
    {ref:'PMS 485 C',hex:'#d52b1e'},{ref:'PMS 485 U',hex:'#e0473a'},
    {ref:'PMS Black 6 C',hex:'#101820'},{ref:'PMS Black 6 U',hex:'#2b2f33'},
    {ref:'PMS 11-0601 TCX',hex:'#f4f4f0'},{ref:'PMS Cool Gray 8 C',hex:'#8a8d8f'},
    {ref:'PMS 533 C',hex:'#1f2a44'},{ref:'PMS 286 C',hex:'#0033a0'},{ref:'PMS 286 U',hex:'#2453b0'},
    {ref:'PMS 348 C',hex:'#00843d'},{ref:'PMS 348 U',hex:'#2a9457'},
    {ref:'PMS 7466 C',hex:'#00a3ad'},{ref:'PMS 116 C',hex:'#ffcd00'},
    {ref:'PMS 2587 C',hex:'#8246af'},{ref:'PMS 199 C',hex:'#d50032'},{ref:'PMS 376 C',hex:'#84bd00'}
  ];
  function methodKind(m){ if(!m||m.basis==='unbranded') return 'none'; if(m.basis==='full colour'||m.maxColours>=99) return 'full'; if(m.maxColours>1) return 'spot'; return 'tone'; }
  function ensureColours(pos){ const m=METHODS[pos.method]||METHODS.none; const k=methodKind(m); let n=1; if(k==='spot') n=Math.max(1,pos.numColours||1); else if(k==='full') n=1; else if(k==='tone') n=1; else n=0;
    pos.colours = pos.colours||[]; while(pos.colours.length<n) pos.colours.push({mode:'pantone',label:'PMS 11-0601 TCX',hex:'#f4f4f0'}); pos.colours.length=n; return pos.colours; }

  function brandingBuilderHTML(p,d){
    const ch=d.branding.chosen;
    const hasVar = (d.sizes||[]).length>1;
    // migrate single -> selections array [{colour, variants:[]}] ; variants empty = all
    if(!ch.selections){ ch.selections = ch.productColour ? [{colour:ch.productColour, variants: ch.variant?[ch.variant]:[]}] : []; }
    const isSel = name => ch.selections.some(s=>s.colour===name);
    const positions=d.branding.positions||[];
    const unbrStep=`<div class="bb-stephd bb-grouphd2"><span class="bb-n">7</span>Other</div><div class="bb-unbrbox ${ch.unbranded?'on':''}"><label class="bb-unbranded ${ch.unbranded?'on':''}"><input type="checkbox" class="bb-unbtog" ${ch.unbranded?'checked':''}> This product is <b>unbranded</b> (no decoration / proof)</label>${ch.unbranded?'<p class="bb-unbrnote">Unticking this will restore the option to brand the item (positions, methods &amp; proof).</p>':''}</div>`;
    const scfg=(p.design&&p.design.sampleCfg)||{};
    const sampleStep=`<div class="bb-stephd bb-grouphd2"><span class="bb-n">6</span>Sample options</div><div class="bb-samplebox">
        <label class="bb-sampopt"><input type="checkbox" class="bb-incsamp" ${scfg.includeBranded?'checked':''} ${scfg.notRequired?'disabled':''}> Include a <b>branded sample</b><span class="bb-sampnote">Shows a branded sample option on the Sample tab.</span></label>
        <label class="bb-sampopt"><input type="checkbox" class="bb-nosamp" ${scfg.notRequired?'checked':''}> <b>Sample not required</b><span class="bb-sampnote">Removes the sample step — it won't need approval before the product can move to Ready to order.</span></label>
      </div>`;
    const pc = projColours(p,d);
    if(!ch.productColour && pc.colours[0]) ch.productColour = pc.colours[0];
    if(ch.productColour && !pc.colours.includes(ch.productColour)) ch.productColour = pc.colours[0]||'';
    const projStep=`<div class="bb-step"><div class="bb-stephd"><span class="bb-n">1</span>Product colours / variants required for this project</div>
      <p class="bb-hint">Choose which colours${hasVar?' and variants':''} are available for this product within this project. All are included by default.</p>
      <div class="bb-swatches">${d.colours.map(c=>{const on=pc.colours.includes(c.name);return `<button type="button" class="bb-sw ${on?'on':''}" data-pcol="${c.name}"><i style="background:${hex(c.name)}"></i><span>${c.name}<small>${pmsOf(c)}</small></span>${on?'<svg class="icn bb-swtick"><use href="#ic-check"/></svg>':''}</button>`;}).join('')}</div>
      ${hasVar?pc.colours.map(cn=>`<div class="bb-varrow" data-pvcol="${cn}"><label>${cn} variants</label><div class="bb-vars">${d.sizes.map(sz=>{const on=(pc.variants[cn]||d.sizes).includes(sz);return `<button type="button" class="bb-var ${on?'on':''}" data-pvcol="${cn}" data-pvar="${sz}">${sz}</button>`;}).join('')}</div></div>`).join(''):''}</div>`;
    const colourStep=`<div class="bb-step"><div class="bb-stephd"><span class="bb-n">2</span>Product colour for the design</div>
      <p class="bb-hint">Select the single product colour the design is applied to.</p>
      <div class="bb-swatches">${d.colours.filter(c=>pc.colours.includes(c.name)).map(c=>`<button type="button" class="bb-sw ${ch.productColour===c.name?'on':''}" data-dcolour="${c.name}"><i style="background:${hex(c.name)}"></i><span>${c.name}<small>${pmsOf(c)}</small></span>${ch.productColour===c.name?'<svg class="icn bb-swtick"><use href="#ic-check"/></svg>':''}</button>`).join('')}</div>
      ${hasVar?`<div class="bb-varrow"><label>Variant</label><div class="bb-vars">${(pc.variants[ch.productColour]||d.sizes).map(sz=>`<button type="button" class="bb-var ${ch.variant===sz?'on':''}" data-dvar="${sz}">${sz}</button>`).join('')}</div></div>`:''}</div>`;
    const posStep=`<div class="bb-step"><div class="bb-stephd"><span class="bb-n">3</span>Branding positions</div>
      <div id="bbPositions">${positions.map((pos,j)=>{
        const cfg=ch.positions.find(x=>x.code===pos.code); const on=!!cfg;
        const method=cfg?cfg.method:d.branding.rec; const m=METHODS[method]||METHODS.none; const kind=methodKind(m);
        const n=cfg?(cfg.numColours||1):1;
        let colourUI='';
        if(on){
          if(kind==='spot'){ const cols=ensureColours(cfg); colourUI=`<div class="bb-colours">${cols.map((c,ci)=>`<button type="button" class="bb-chip" data-pos="${pos.code}" data-ci="${ci}"><span class="bb-chipsw" style="background:${c.hex}"></span><span class="bb-chiplbl">${c.label}</span></button>`).join('')}</div>`; }
          else if(kind==='full'){ const cols=ensureColours(cfg); colourUI=`<div class="bb-colours"><button type="button" class="bb-chip" data-pos="${pos.code}" data-ci="0"><span class="bb-chipsw" style="background:${cols[0].hex}"></span><span class="bb-chiplbl">${cols[0].label}</span></button><span class="bb-fc">Full colour / digital</span></div>`; }
          else if(kind==='tone'){ colourUI=`<div class="bb-colours"><span class="bb-fc">Single tone</span></div>`; }
        }
        return `<div class="bb-pos ${on?'on':''}" data-pos="${pos.code}">
          <label class="bb-poshd"><input type="checkbox" class="bb-tog" ${on?'checked':''}><span class="bb-postitle"><b>${pos.name}</b><span>${pos.w} mm × ${pos.h} mm</span></span></label>
          ${on?`<div class="bb-posbody">
            <div class="bb-fld"><label>Method</label><select class="bb-method">${d.branding.methods.map(mc=>`<option value="${mc}" ${mc===method?'selected':''}>${METHODS[mc].name}${d.branding.rec===mc?' · recommended':''}</option>`).join('')}</select></div>
            <div class="bb-fld"><label>Print colours</label>${kind==='spot'?`<div class="bb-stepper"><button type="button" class="bb-dec" ${n<=1?'disabled':''}>−</button><span class="bb-num">${n}</span><button type="button" class="bb-inc" ${n>=m.maxColours?'disabled':''}>+</button><span class="bb-max">max ${m.maxColours}</span></div>`:`<span class="bb-fixed">${kind==='full'?'Full colour':(kind==='tone'?'Single tone':'—')}</span>`}</div>
            ${colourUI}
          </div>`:''}
        </div>`;
      }).join('')}</div>
      <button type="button" class="bb-addpos" id="bbAddPos">+ Add custom position</button></div>`;
    const list=visualList(p);
    const imgStep=`<div class="bb-step"><div class="bb-stephd"><span class="bb-n">4</span>Visuals</div>
      <div class="bb-imgs">${list.map((src,i)=>`<div class="bb-thumb"><img src="${src}" alt="Visual ${i+1}"><button type="button" class="bb-imgdel" data-i="${i}" title="Remove">×</button></div>`).join('')}<button type="button" class="bb-imgadd"><span>+</span>Add</button></div>
      <input type="file" accept="image/png,image/jpeg" class="bb-imgfile" hidden>
      <p class="bb-imgnote">Add or remove indicative visuals for this product. PNG or JPG.</p></div>`;
    const proofList=proofImgList(p);
    const proofPosBlocks=(ch.positions||[]).map(pos=>{
      const meta=(d.branding.positions||[]).find(x=>x.code===pos.code)||{name:pos.code};
      const pp=proofPos(p,pos.code);
      const pm=METHODS[pos.method]||METHODS.none;
      const ppal=paletteFor(pos);
      const methodLine=`<div class="bb-ppmeta"><span class="bb-ppmethod">${pm.name} · ${decoLabel(pm,pos.numColours||ppal.length)}</span><span class="bb-ppswatches">${ppal.map(c=>{const bg=c.hex||hex(c.name);const lbl=c.label||c.name||'';const ref=c.pms||(c.name?pmsOf({name:c.name}):'');return `<span class="bb-ppchip"><span class="bb-ppsw" style="background:${bg}"></span><span class="bb-ppchiptxt">${lbl}${ref?` <small>${ref}</small>`:''}</span></span>`;}).join('')}</span></div>`;
      const cell=(kind,arr,label)=>`<div class="bb-ppcol"><span class="bb-pplbl">${label}</span><div class="bb-imgs">${arr.map((src,i)=>`<div class="bb-thumb"><img src="${src}" alt="${label} ${i+1}"><button type="button" class="bb-ppdel" data-pos="${pos.code}" data-kind="${kind}" data-i="${i}" title="Remove">×</button></div>`).join('')}<button type="button" class="bb-ppadd" data-pos="${pos.code}" data-kind="${kind}"><span>+</span>Add</button></div>${kind==='artwork'?`<div class="bb-ppsize"><span class="bb-pplbl">Branding size (actual)</span><div class="bb-sizerow"><input type="number" class="bb-ppw" data-pos="${pos.code}" value="${pp.size&&pp.size.w!=null?pp.size.w:''}" min="0" placeholder="W"><span class="bb-x">×</span><input type="number" class="bb-pph" data-pos="${pos.code}" value="${pp.size&&pp.size.h!=null?pp.size.h:''}" min="0" placeholder="H"><span class="bb-mm">mm</span></div></div>`:''}</div>`;
      return `<div class="bb-pppos"><div class="bb-ppposhd"><b>${meta.name}</b><span>${meta.w} mm × ${meta.h} mm</span></div>${methodLine}<div class="bb-ppgrid">${cell('artwork',pp.artwork,'Product artwork')}${cell('visuals',pp.visuals,'Proof visuals')}</div></div>`;
    }).join('') || '<p class="bb-imgnote" style="margin:0">Add a branding position above to attach artwork &amp; proof visuals.</p>';
    const proofStep=`<div class="bb-step"><div class="bb-stephd"><span class="bb-n">5</span>Proof</div>
      <div class="bb-ppwrap">${proofPosBlocks}</div>
      <input type="file" accept="image/png,image/jpeg" class="bb-ppfile" hidden>
      <div class="bb-fld" style="margin-top:14px"><label>Notes <span style="font-weight:500;color:var(--muted);text-transform:none;letter-spacing:0">(shown on the proof)</span></label><textarea class="bb-notes" rows="2" placeholder="e.g. supplied individually boxed…">${(d.productNotes||'').replace(/</g,'&lt;')}</textarea></div>
      <div class="bb-fld" style="margin-top:12px"><label>Warnings <span style="font-weight:500;color:var(--muted);text-transform:none;letter-spacing:0">(shown on the proof)</span></label><textarea class="bb-warn" rows="2" placeholder="e.g. print longevity cannot be guaranteed…">${(d.warnings||'').replace(/</g,'&lt;')}</textarea></div>
      </div>`;
    return `<div class="pm-section bb-wrap"><h4>Product Builder</h4>${projStep}${ch.unbranded?'':`${colourStep}${posStep}${imgStep}${proofStep}`}${sampleStep}${unbrStep}</div>`;
  }
  function projColours(p,d){ if(!p.projectColours){ p.projectColours={colours:d.colours.map(c=>c.name), variants:{}}; d.colours.forEach(c=>p.projectColours.variants[c.name]=d.sizes.slice()); } return p.projectColours; }
  function proofImgList(p){ p.design=p.design||{}; p.design.proof=p.design.proof||{}; if(!Array.isArray(p.design.proof.images)) p.design.proof.images=[]; return p.design.proof.images; }
  function proofPos(p,code){ p.design=p.design||{}; p.design.proof=p.design.proof||{}; p.design.proof.byPos=p.design.proof.byPos||{}; const bp=p.design.proof.byPos; if(!bp[code]) bp[code]={artwork:[],visuals:[]}; if(!Array.isArray(bp[code].artwork)) bp[code].artwork=[]; if(!Array.isArray(bp[code].visuals)) bp[code].visuals=[]; return bp[code]; }

  function wireBrandingBuilder(p,d,ctx){
    const ch=d.branding.chosen;
    const refresh=()=>{ if(ctx.refresh) ctx.refresh('design'); if(ctx.persist) ctx.persist(); };
    const pc=projColours(p,d);
    // project-scope colours/variants (multi-select; keep at least one colour)
    document.querySelectorAll('.bb-sw[data-pcol]').forEach(b=>b.onclick=()=>{ const name=b.dataset.pcol; const i=pc.colours.indexOf(name); if(i>=0){ if(pc.colours.length>1) pc.colours.splice(i,1); } else { pc.colours.push(name); if(!pc.variants[name]) pc.variants[name]=d.sizes.slice(); } refresh(); });
    document.querySelectorAll('.bb-var[data-pvar]').forEach(b=>b.onclick=()=>{ const cn=b.dataset.pvcol, v=b.dataset.pvar; pc.variants[cn]=pc.variants[cn]||d.sizes.slice(); const i=pc.variants[cn].indexOf(v); if(i>=0){ if(pc.variants[cn].length>1) pc.variants[cn].splice(i,1); } else pc.variants[cn].push(v); refresh(); });
    // design product colour (single select) + variant
    document.querySelectorAll('.bb-sw[data-dcolour]').forEach(b=>b.onclick=()=>{ if(ch.unbranded) return; ch.productColour=b.dataset.dcolour; if(!(pc.variants[ch.productColour]||d.sizes).includes(ch.variant)) ch.variant=(pc.variants[ch.productColour]||d.sizes)[0]; refresh(); });
    document.querySelectorAll('.bb-var[data-dvar]').forEach(b=>b.onclick=()=>{ ch.variant=b.dataset.dvar; refresh(); });
    { const u=document.querySelector('.bb-unbtog'); if(u) u.onchange=()=>{ ch.unbranded=u.checked; if(u.checked){ p.design=p.design||{}; if(p.design.proof) p.design.proof.st='unbranded'; } refresh(); }; }
    { p.design=p.design||{}; p.design.sampleCfg=p.design.sampleCfg||{};
      const inc=document.querySelector('.bb-incsamp'); if(inc) inc.onchange=()=>{ p.design.sampleCfg.includeBranded=inc.checked; refresh(); };
      const no=document.querySelector('.bb-nosamp'); if(no) no.onchange=()=>{ p.design.sampleCfg.notRequired=no.checked; if(no.checked) p.design.sampleCfg.includeBranded=false; refresh(); };
    }
    document.querySelectorAll('#bbPositions .bb-pos').forEach(el=>{
      const code=el.dataset.pos; const arr=ch.positions; const cfg=()=>arr.find(x=>x.code===code);
      const tog=el.querySelector('.bb-tog');
      if(tog) tog.onchange=()=>{ const ix=arr.findIndex(x=>x.code===code); if(tog.checked&&ix<0){ const np={code,method:d.branding.rec,numColours:1,colours:[]}; ensureColours(np); arr.push(np);} else if(!tog.checked&&ix>=0) arr.splice(ix,1); refresh(); };
      const sel=el.querySelector('.bb-method');
      if(sel) sel.onchange=()=>{ const c=cfg(); if(c){ c.method=sel.value; const m=METHODS[c.method]||METHODS.none; if(methodKind(m)!=='spot') c.numColours=1; else if(c.numColours>m.maxColours) c.numColours=m.maxColours; ensureColours(c); } refresh(); };
      const dec=el.querySelector('.bb-dec'), inc=el.querySelector('.bb-inc');
      if(dec) dec.onclick=()=>{ const c=cfg(); if(c&&(c.numColours||1)>1){ c.numColours--; ensureColours(c); refresh(); } };
      if(inc) inc.onclick=()=>{ const c=cfg(); const m=METHODS[c.method]||METHODS.none; if(c&&(c.numColours||1)<m.maxColours){ c.numColours++; ensureColours(c); refresh(); } };
      el.querySelectorAll('.bb-chip').forEach(chip=>chip.onclick=(e)=>{ e.stopPropagation(); openColourPicker(chip, cfg(), +chip.dataset.ci, refresh); });
    });
    const fileInput=document.querySelector('.bb-imgfile');
    if(fileInput){
      const readFile=(file)=>new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
      fileInput.onchange=async()=>{ const f=fileInput.files&&fileInput.files[0]; if(!f) return; const url=await readFile(f); visualList(p).push(url); fileInput.value=''; refresh(); };
      const ia=document.querySelector('.bb-imgadd'); if(ia) ia.onclick=()=>fileInput.click();
      document.querySelectorAll('.bb-imgdel').forEach(b=>b.onclick=()=>{ const l=visualList(p); if(l.length<=1){ alert('Keep at least one visual.'); return; } l.splice(+b.dataset.i,1); refresh(); });
    }
    const add=document.getElementById('bbAddPos');
    if(add) add.onclick=()=>{ const name=prompt('Custom position name (added store-side, pulls through on refresh):'); if(!name) return; const code='custom-'+Date.now(); d.branding.positions.push({code,name:name.trim(),w:40,h:40,custom:true}); const np={code,method:d.branding.rec,numColours:1,colours:[]}; ensureColours(np); ch.positions.push(np); refresh(); };
    // Step 4 — Proof: artwork upload, notes, warnings, per-position size
    const pf=document.querySelector('.bb-ppfile');
    if(pf){ const rd=(file)=>new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
      let target=null;
      pf.onchange=async()=>{ const f=pf.files&&pf.files[0]; if(!f||!target)return; const url=await rd(f); const pp=proofPos(p,target.pos); (target.kind==='artwork'?pp.artwork:pp.visuals).push(url); pf.value=''; target=null; refresh(); };
      document.querySelectorAll('.bb-ppadd').forEach(b=>b.onclick=()=>{ target={pos:b.dataset.pos,kind:b.dataset.kind}; pf.click(); });
      document.querySelectorAll('.bb-ppdel').forEach(b=>b.onclick=()=>{ const pp=proofPos(p,b.dataset.pos); (b.dataset.kind==='artwork'?pp.artwork:pp.visuals).splice(+b.dataset.i,1); refresh(); });
      document.querySelectorAll('.bb-ppw').forEach(inp=>inp.onchange=()=>{ const pp=proofPos(p,inp.dataset.pos); pp.size=pp.size||{}; pp.size.w=inp.value===''?null:+inp.value; if(ctx.persist)ctx.persist(); });
      document.querySelectorAll('.bb-pph').forEach(inp=>inp.onchange=()=>{ const pp=proofPos(p,inp.dataset.pos); pp.size=pp.size||{}; pp.size.h=inp.value===''?null:+inp.value; if(ctx.persist)ctx.persist(); });
    }
    const nt=document.querySelector('.bb-notes'); if(nt) nt.onchange=()=>{ d.productNotes=nt.value.trim(); if(ctx.persist)ctx.persist(); };
    const wn=document.querySelector('.bb-warn'); if(wn) wn.onchange=()=>{ d.warnings=wn.value.trim(); if(ctx.persist)ctx.persist(); };
    document.querySelectorAll('.bb-sizerow').forEach(row=>{ const meta=(d.branding.positions||[]).find(x=>x.code===row.dataset.pos); if(!meta)return; row.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{ meta[inp.dataset.dim]=+inp.value||0; if(ctx.persist)ctx.persist(); }); });
  }

  let cpRoot=null, cpAnchor=null, cpPos=null, cpCi=null, cpRefresh=null, cpTab='pantone';
  function openColourPicker(anchor, pos, ci, refresh){
    if(!pos) return; cpAnchor=anchor; cpPos=pos; cpCi=ci; cpRefresh=refresh; cpTab='pantone';
    if(!cpRoot){ cpRoot=document.createElement('div'); cpRoot.className='cp-pop'; document.body.appendChild(cpRoot);
      document.addEventListener('click',e=>{ if(cpRoot.classList.contains('open') && !cpRoot.contains(e.target) && (!cpAnchor||!cpAnchor.contains(e.target))) cpRoot.classList.remove('open'); });
    }
    renderColourPicker(); cpRoot.classList.add('open');
    const r=anchor.getBoundingClientRect(); cpRoot.style.top=(window.scrollY+r.bottom+6)+'px'; cpRoot.style.left=(window.scrollX+Math.min(r.left, window.innerWidth-330))+'px';
  }
  function setColour(c){ cpPos.colours[cpCi]=c; cpRoot.classList.remove('open'); if(cpRefresh) cpRefresh(); }
  function renderColourPicker(){
    const m=METHODS[cpPos.method]||METHODS.none; const allowCMYK=methodKind(m)==='full';
    const tabs=`<div class="cp-tabs"><button type="button" data-t="pantone" class="${cpTab==='pantone'?'on':''}">Pantone</button>${allowCMYK?`<button type="button" data-t="cmyk" class="${cpTab==='cmyk'?'on':''}">CMYK</button>`:''}<button type="button" data-t="free" class="${cpTab==='free'?'on':''}">Free type</button></div>`;
    let body='';
    if(cpTab==='pantone'){
      body=`<input type="text" class="cp-search" placeholder="Search PMS (coated / uncoated)…"><div class="cp-list">${PANTONE.map(pn=>`<button type="button" class="cp-pms" data-hex="${pn.hex}" data-ref="${pn.ref}"><span class="sw" style="background:${pn.hex}"></span>${pn.ref}</button>`).join('')}</div>`;
    } else if(cpTab==='cmyk'){
      body=`<div class="cp-cmyk"><label>C<input type="number" min="0" max="100" value="0" data-k="c"></label><label>M<input type="number" min="0" max="100" value="0" data-k="m"></label><label>Y<input type="number" min="0" max="100" value="0" data-k="y"></label><label>K<input type="number" min="0" max="100" value="0" data-k="k"></label></div><button type="button" class="cp-apply">Use CMYK colour</button>`;
    } else {
      body=`<p class="cp-warn">Free-type is a last resort — Pantone is strongly preferred for accurate colour.</p><input type="text" class="cp-free" placeholder="e.g. #E8893A or 'brand orange'"><button type="button" class="cp-apply">Use this colour</button>`;
    }
    cpRoot.innerHTML=tabs+'<div class="cp-body">'+body+'</div>';
    cpRoot.querySelectorAll('.cp-tabs button').forEach(b=>b.onclick=()=>{ cpTab=b.dataset.t; renderColourPicker(); });
    cpRoot.querySelectorAll('.cp-pms').forEach(b=>b.onclick=()=>setColour({mode:'pantone',label:b.dataset.ref,hex:b.dataset.hex}));
    const search=cpRoot.querySelector('.cp-search'); if(search) search.oninput=()=>{ const q=search.value.toLowerCase(); cpRoot.querySelectorAll('.cp-pms').forEach(b=>{ b.style.display=b.dataset.ref.toLowerCase().includes(q)?'':'none'; }); };
    const cmykBtn=cpRoot.querySelector('.cp-cmyk ~ .cp-apply');
    if(cpTab==='cmyk'){ cpRoot.querySelector('.cp-apply').onclick=()=>{ const v={}; cpRoot.querySelectorAll('.cp-cmyk input').forEach(i=>v[i.dataset.k]=+i.value||0); const hex=cmykToHex(v.c,v.m,v.y,v.k); setColour({mode:'cmyk',label:`CMYK ${v.c}/${v.m}/${v.y}/${v.k}`,hex}); }; }
    if(cpTab==='free'){ cpRoot.querySelector('.cp-apply').onclick=()=>{ const val=(cpRoot.querySelector('.cp-free').value||'').trim(); if(!val) return; const hex=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)?val:'#cccccc'; setColour({mode:'free',label:val,hex}); }; }
  }
  function cmykToHex(c,m,y,k){ c/=100;m/=100;y/=100;k/=100; const r=Math.round(255*(1-c)*(1-k)),g=Math.round(255*(1-m)*(1-k)),b=Math.round(255*(1-y)*(1-k)); const h=x=>x.toString(16).padStart(2,'0'); return '#'+h(r)+h(g)+h(b); }

  function studioManageHTML(p){
    const list=visualList(p);
    const thumbs = list.map((src,i)=>`<div class="vm-thumb" data-i="${i}"><img src="${src}" alt="Visual ${i+1}"><div class="vm-actions"><button type="button" class="vm-rep" data-i="${i}" title="Replace">↻</button><button type="button" class="vm-del" data-i="${i}" title="Remove">×</button></div></div>`).join('');
    return `<div class="pv-block pv-studio"><h5>Studio — manage visuals</h5>
      <div class="vm-grid">${thumbs}<button type="button" class="vm-add"><span>+</span>Add image</button></div>
      <input type="file" accept="image/png,image/jpeg" class="vm-file" hidden>
      <p class="pv-bgnote">Studio can add, replace or remove visuals. PNG or JPG; transparent PNGs use the background colour above.</p></div>`;
  }
  function wireStudioManage(p, ctx){
    const fileInput=svRoot.querySelector('.vm-file'); if(!fileInput) return;
    let pendingReplace=null;
    const readFile=(file)=>new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
    fileInput.onchange=async()=>{ const f=fileInput.files&&fileInput.files[0]; if(!f) return; const url=await readFile(f); const list=visualList(p);
      if(pendingReplace!=null && pendingReplace<list.length){ list[pendingReplace]=url; } else { list.push(url); }
      pendingReplace=null; fileInput.value='';
      try{ if(ctx.persist) ctx.persist(); }catch(e){}
      svIdx=Math.min(svIdx, list.length-1); renderStage();
    };
    svRoot.querySelectorAll('.vm-add').forEach(b=>b.onclick=()=>{ pendingReplace=null; fileInput.click(); });
    svRoot.querySelectorAll('.vm-rep').forEach(b=>b.onclick=()=>{ pendingReplace=+b.dataset.i; fileInput.click(); });
    svRoot.querySelectorAll('.vm-del').forEach(b=>b.onclick=()=>{ const list=visualList(p); const i=+b.dataset.i; if(list.length<=1){ alert('Keep at least one visual.'); return; } list.splice(i,1); if(svIdx>=list.length) svIdx=list.length-1; try{ if(ctx.persist) ctx.persist(); }catch(e){} renderStage(); });
  }
  function openStage(p,d,ctx,stage){
    svP=p; svD=d; svCtx=ctx; svStage=stage||'proof'; svIdx=0; svZoom=false;
    if(svRoot){ svRoot.classList.remove('magnify','zoom'); const _l=svRoot.querySelector('#pvLens'); if(_l)_l.style.display='none'; const _z=svRoot.querySelector('.pv-zlbl'); if(_z)_z.textContent='Magnify'; }
    svPair = (p.design.proof.paired) || (p.design.visual.ver||1);
    if(!svRoot) buildStage();
    renderStage();
    svRoot.classList.add('open'); svRoot.classList.remove('zoom'); document.body.style.overflow='hidden';
  }
  function openProof(p,d,ctx){ openStage(p,d,ctx,'proof'); }
  function closeStage(){ if(svRoot){ svRoot.classList.remove('open','zoom'); svZoom=false; document.body.style.overflow=''; } }
  function buildStage(){
    svRoot=document.createElement('div'); svRoot.className='pv-scrim'; svRoot.id='pvScrim';
    svRoot.innerHTML=`<div class="pv-modal" role="dialog" aria-modal="true">
      <div class="pv-head"><button class="pv-back" id="pvBack"><svg class="icn"><use href="#ic-arrow-l"/></svg></button>
        <div class="pv-title"><h2 id="pvName"></h2><span id="pvSku"></span></div>
        <div class="pv-ver"><span id="pvVer"></span><button class="pv-dl" title="Download"><svg class="icn"><use href="#ic-download"/></svg></button></div>
      </div>
      <div class="pv-body">
        <div class="pv-spec" id="pvSpec"></div>
        <div class="pv-art">
          <div class="pv-artstage" id="pvArtStage">
            <button class="pm-cta-sec pv-zoom" id="pvZoom" title="Magnify"><svg class="icn"><use href="#ic-magnify"/></svg><span class="pv-zlbl">Magnify</span></button>
            <button class="pv-artnav prev" data-dir="-1" aria-label="Previous"><svg class="icn"><use href="#ic-arrow-l"/></svg></button>
            <div class="pv-artframe" id="pvArtFrame"></div>
            <button class="pv-artnav next" data-dir="1" aria-label="Next"><svg class="icn"><use href="#ic-arrow"/></svg></button>
            <div class="pv-lens" id="pvLens"></div>
          </div>
          <div class="pv-artdots" id="pvArtDots"></div>
        </div>
      </div>
      <div class="pv-disc-wrap" id="pvDisc"></div>
      <div class="pv-approve" id="pvApprove"></div>
    </div>`;
    document.body.appendChild(svRoot);
    svRoot.addEventListener('click',e=>{ if(e.target===svRoot) closeStage(); });
    svRoot.querySelector('#pvBack').onclick=closeStage;
    const pvLens=svRoot.querySelector('#pvLens'); const pvFrame=svRoot.querySelector('#pvArtFrame'); const pvStageEl=svRoot.querySelector('#pvArtStage');
    function setMag(on){ svZoom=on; svRoot.classList.toggle('magnify',on); const l=svRoot.querySelector('.pv-zlbl'); if(l) l.textContent=on?'Stop magnify':'Magnify'; if(!on) pvLens.style.display='none'; }
    svRoot.querySelector('#pvZoom').onclick=()=>setMag(!svZoom);
    pvFrame.addEventListener('mousemove', e=>{
      if(!svZoom){ return; }
      const img=pvFrame.querySelector('img');
      if(!img || !img.naturalWidth){ pvLens.style.display='none'; return; }
      const rect=img.getBoundingClientRect();
      const x=e.clientX-rect.left, y=e.clientY-rect.top;
      if(x<0||y<0||x>rect.width||y>rect.height){ pvLens.style.display='none'; return; }
      const natW=img.naturalWidth, natH=img.naturalHeight;
      const scale=Math.min(rect.width/natW, rect.height/natH); // object-fit: contain
      const dispW=natW*scale, dispH=natH*scale;
      const ix=x-(rect.width-dispW)/2, iy=y-(rect.height-dispH)/2;
      if(ix<0||iy<0||ix>dispW||iy>dispH){ pvLens.style.display='none'; return; }
      const zoom=2.4, L=220; const sr=pvStageEl.getBoundingClientRect();
      pvLens.style.display='block';
      pvLens.style.width=pvLens.style.height=L+'px';
      pvLens.style.left=(e.clientX-sr.left-L/2)+'px';
      pvLens.style.top=(e.clientY-sr.top-L/2)+'px';
      pvLens.style.backgroundImage='url("'+(img.currentSrc||img.src)+'")';
      pvLens.style.backgroundSize=(dispW*zoom)+'px '+(dispH*zoom)+'px';
      pvLens.style.backgroundPosition='-'+(ix*zoom-L/2)+'px -'+(iy*zoom-L/2)+'px';
    });
    pvFrame.addEventListener('mouseleave', ()=>{ pvLens.style.display='none'; });
    svRoot.querySelectorAll('.pv-artnav').forEach(b=>b.onclick=()=>{ const n=stageFrames(); svIdx=(svIdx+(+b.dataset.dir)+n)%n; renderArt(); });
    document.addEventListener('keydown',e=>{ if(!svRoot.classList.contains('open'))return; if(e.key==='Escape'){ if(svZoom){svZoom=false;svRoot.classList.remove('zoom');} else closeStage(); } else if(e.key==='ArrowLeft'){ const n=stageFrames(); svIdx=(svIdx-1+n)%n; renderArt(); } else if(e.key==='ArrowRight'){ const n=stageFrames(); svIdx=(svIdx+1)%n; renderArt(); } });
  }
  function stageFrames(){ return visualImgs(svP) ? visualImgs(svP).length : PROOF_FRAMES; }
  function renderArt(){
    const slug=svP.name.replace(/[^a-z0-9]/gi,'-').toLowerCase();
    const ver=svD&&svP.design[svStage].ver||1;
    const imgs = svStage==='visual' ? visualImgs(svP) : null;
    const n = stageFrames(); if(svIdx>=n) svIdx=0;
    svRoot.querySelector('#pvArtFrame').innerHTML = imgs
      ? `<div class="pv-imgwrap" style="background:${visualBg(svP)}"><img class="pv-img" src="${imgs[svIdx]}" alt="Visual ${svIdx+1}"></div>`
      : `<image-slot id="${svStage}-${slug}-v${ver}-${svIdx}" class="pv-slot" shape="rounded" fit="contain" placeholder="Drop ${svStage} artwork ${svIdx+1} of ${n}"></image-slot>`;
    const dots=svRoot.querySelector('#pvArtDots');
    if(dots) dots.innerHTML=Array.from({length:n}).map((_,i)=>`<span class="${i===svIdx?'on':''}"></span>`).join('');
  }
  function renderStage(){
    const p=svP,d=svD,ctx=svCtx,role=(ctx&&ctx.role)||'dist',stage=svStage;
    const s=p.design[stage]; const ch=d.branding.chosen;
    svRoot.querySelector('#pvName').textContent=p.name;
    svRoot.querySelector('#pvSku').textContent = stage==='visual'?'Indicative visual':'Technical proof';
    svRoot.querySelector('#pvVer').textContent = (stage==='visual'?'Visual v':'Proof v')+(s.ver||1);
    svRoot.classList.toggle('visual-stage', stage==='visual');
    svRoot.classList.toggle('proof-stage', stage==='proof');
    renderArt();
    const pc=d.colours.find(c=>c.name===ch.productColour)||d.colours[0];
    const posBlock = ch.positions.map((pos,j)=>{
      const meta=d.branding.positions.find(x=>x.code===pos.code)||{w:'—',h:'—',name:pos.code};
      const m=METHODS[pos.method]||METHODS.none; const pal=paletteFor(pos);
      const pp=proofPos(p,pos.code);
      const gal=(arr,label)=> arr.length ? `<div class="pv-ppgal"><span class="pv-pplbl">${label}</span><div class="pv-ppimgs">${arr.map((src,i)=>`<div class="pv-ppthumb"><img src="${src}" alt="${label} ${i+1}"></div>`).join('')}</div></div>` : '';
      const files=(pp.artwork.length||pp.visuals.length)?`<div class="pv-ppfiles">${gal(pp.visuals,'Proof visuals')}${gal(pp.artwork,'Product artwork')}</div>`:'';
      const actualSz=(pp.size&&pp.size.w&&pp.size.h)?`<div class="pv-sz">Branding size: ${pp.size.w} mm × ${pp.size.h} mm</div>`:'';
      return `<div class="pv-block"><h5>Branding Position ${j+1}: ${meta.name}</h5>
        <p class="pv-method">${m.name} · ${decoLabel(m,pos.numColours||pal.length)}</p>
        <div class="pv-palette">${pal.map(c=>`<div class="pv-pi"><span class="sw" style="background:${hex(c.name)}"></span><div><b>${c.name}</b><span>${c.pms||pmsOf(c)}</span></div></div>`).join('')}</div>
        <div class="pv-sz">Branding area: ${meta.w} mm × ${meta.h} mm</div>${actualSz}${files}</div>`;
    }).join('');
    const colourBlock = `<div class="pv-block"><h5>Product colour</h5><div class="pv-cols"><span class="pv-col"><span class="sw" style="background:${hex(pc.name)}"></span>${pc.name} (${pmsOf(pc)})</span></div></div>`;
    if(stage==='visual'){
      const posBlockV = ch.positions.map((pos,j)=>{
        const meta=d.branding.positions.find(x=>x.code===pos.code)||{name:pos.code};
        const m=METHODS[pos.method]||METHODS.none;
        return `<div class="pv-block"><h5>Branding Position ${j+1}: ${meta.name}</h5>
          <p class="pv-method">${m.name} · ${decoLabel(m,pos.numColours)}</p></div>`;
      }).join('');
      const notesV = d.productNotes ? d.productNotes : 'Add any notes about this visual here.';
      const bgv = visualBg(p);
      const bgCtl = role==='dist' ? `<div class="pv-block pv-bgctl"><h5>Image background</h5>
        <div class="bgrow"><div class="bgswatches">${BG_PRESETS.map(c=>`<button type="button" class="bgsw ${c.toLowerCase()===bgv.toLowerCase()?'on':''}" data-bg="${c}" style="background:${c}"></button>`).join('')}</div><input type="text" class="bghex" value="${bgv}" maxlength="7"></div>
        <button type="button" class="pm-cta-sec sm bgdefault">Set as default for this client</button>
        <p class="pv-bgnote">Transparent PNGs show this colour through; JPGs keep their own background.</p></div>` : '';
      svRoot.querySelector('#pvSpec').innerHTML=`
        <div class="pv-block"><h5>What this is</h5><p>An indicative render of how the product &amp; branding will look. Not an exact match for colour, scale or finish — the proof covers exact specification.</p></div>
        ${colourBlock}
        ${posBlockV}
        <div class="pv-block"><h5>Notes</h5><p>${notesV}</p></div>
        ${bgCtl}
        ${role==='dist'?studioManageHTML(p):''}`;
      if(role==='dist'){
        const setBg=(c)=>{ if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) return; p.design.visual=p.design.visual||{}; p.design.visual.bg=c; renderArt(); svRoot.querySelectorAll('.bgsw').forEach(b=>b.classList.toggle('on', b.dataset.bg.toLowerCase()===c.toLowerCase())); if(ctx.persist)ctx.persist(); };
        svRoot.querySelectorAll('.bgsw').forEach(b=>b.onclick=()=>{ const c=b.dataset.bg; const hx=svRoot.querySelector('.bghex'); if(hx)hx.value=c; setBg(c); });
        const hx=svRoot.querySelector('.bghex'); if(hx) hx.onchange=()=>setBg(hx.value.trim());
        const df=svRoot.querySelector('.bgdefault'); if(df) df.onclick=()=>{ try{ localStorage.setItem('ms-visual-bg-default', visualBg(p)); df.textContent='Saved as client default'; setTimeout(()=>{df.textContent='Set as default for this client';},1600);}catch(e){} };
        wireStudioManage(p, ctx);
      }
    } else {
      svRoot.querySelector('#pvSpec').innerHTML=`
        ${colourBlock}
        <div class="pv-block"><h5>Product dimensions</h5><p>Width: ${d.dims.w} · Height: ${d.dims.h} · Depth: ${d.dims.d}</p></div>
        ${d.productNotes?`<div class="pv-block"><h5>Notes</h5><p>${d.productNotes}</p></div>`:''}
        ${d.warnings?`<div class="pv-block pv-warn"><h5>Warnings</h5><p>${d.warnings}</p></div>`:''}
        ${posBlock}`;
    }
    const discEl=svRoot.querySelector('#pvDisc');
    if(discEl){
      discEl.innerHTML = (stage==='proof') ? `<b>PLEASE READ, TO ENSURE YOU ARE 100% HAPPY WITH YOUR ORDER:</b>
        <ul><li>This proof should only be used to check positioning and content; it cannot be used as an accurate match for colour.</li>
        <li>Have you seen a sample? Please ensure what you are ordering is what you are expecting.</li>
        <li>If a Pantone reference has been chosen by our studio on your behalf, we cannot accept responsibility if you are unhappy with the final print colour.</li>
        <li>When printing in full colour, Pantone references cannot be guaranteed.</li></ul>
        <p class="pv-disc-strong">The visual is a representation of the approximate size, ratio and position of the artwork &amp; product. Once approved we can take no responsibility for an inaccurately branded order.</p>` : '';
      discEl.style.display = (stage==='proof') ? '' : 'none';
    }
    renderApprove();
  }
  function bumpVer(s){ s.ver=(s.ver||0)+1; }
  function commit(msg){
    const p=svP, ctx=svCtx;
    const rolled=rollDesign(p);
    if(ctx.setStatus) ctx.setStatus(p,0,rolled,msg);
    closeStage(); if(ctx.refresh) ctx.refresh('design'); if(ctx.persist) ctx.persist();
  }
  function renderApprove(){
    const p=svP,d=svD,ctx=svCtx,role=(ctx&&ctx.role)||'dist',stage=svStage;
    const s=p.design[stage]; const ap=svRoot.querySelector('#pvApprove'); const other=stage==='visual'?'visual':'proof';
    // pairing selector (distributor submitting a proof)
    const pairSel = (stage==='proof' && role==='dist' && (s.st==='notstarted'||s.st==='withstudio'||s.st==='changes'))
      ? `<div class="pv-pair"><label>Pair this proof with visual version</label><select id="pvPairSel">${Array.from({length:(p.design.visual.ver||1)},(_,i)=>i+1).reverse().map(v=>`<option value="${v}" ${v===svPair?'selected':''}>Visual v${v}${v===(p.design.visual.ver||1)?' (latest)':''}</option>`).join('')}</select></div>` : '';

    if(s.st==='approved'){
      ap.innerHTML=`<div class="pv-done approved"><svg class="icn"><use href="#ic-check"/></svg>${stage==='visual'?'Visual':'Proof'} approved${stage==='proof'&&s.paired?` — paired with Visual v${s.paired}`:''}.</div>`; return;
    }
    if(s.st==='unbranded'){ ap.innerHTML=`<div class="pv-done"><svg class="icn"><use href="#ic-ban"/></svg>Unbranded — no proof required.</div>`; return; }

    if(role==='cust'){
      if(s.st==='awaiting'){
        ap.innerHTML=`
          <label class="pv-check rev"><input type="checkbox" id="pvRev"><span>I do not approve — please revise as follows:</span></label>
          <div class="pv-resp" id="pvRespWrap"><textarea id="pvResp" placeholder="Write response…"></textarea></div>
          <label class="pv-check"><input type="checkbox" id="pvAppr"><span>I have checked the ${stage} and approve it.</span></label>
          <button class="pm-cta" id="pvSubmit" disabled><span>Submit</span><svg class="icn"><use href="#ic-arrow"/></svg></button>`;
        const rev=ap.querySelector('#pvRev'),appr=ap.querySelector('#pvAppr'),sub=ap.querySelector('#pvSubmit'),wrap=ap.querySelector('#pvRespWrap');
        const upd=()=>{ wrap.classList.toggle('show',rev.checked); sub.disabled=!(rev.checked||appr.checked); };
        rev.onchange=()=>{ if(rev.checked)appr.checked=false; upd(); };
        appr.onchange=()=>{ if(appr.checked)rev.checked=false; upd(); };
        sub.onclick=()=>{ if(appr.checked){ s.st='approved'; commit('approved the '+stage); } else if(rev.checked){ s.st='changes'; if(stage==='proof' && p.design.visual){ p.design.visual.st='changes'; } commit('requested '+stage+' changes'); } };
      } else if(s.st==='infoneeded'){
        ap.innerHTML=`<p class="pv-prompt">The studio needs information from you before they can produce the ${stage}.</p>
          <div class="pv-resp show"><textarea id="pvResp" placeholder="Provide the information / artwork details the studio asked for…"></textarea></div>
          <button class="pm-cta" id="pvSubmit"><span>Send to studio</span><svg class="icn"><use href="#ic-arrow"/></svg></button>`;
        ap.querySelector('#pvSubmit').onclick=()=>{ s.st='withstudio'; commit('provided '+stage+' information to studio'); };
      } else {
        ap.innerHTML=`<div class="pv-done"><svg class="icn"><use href="#ic-clock"/></svg>${s.st==='changes'?'Changes requested — the studio is reworking.':'With studio.'}</div>`;
      }
    } else { // distributor
      if(s.st==='notstarted'||s.st==='withstudio'){
        ap.innerHTML=pairSel+`<button class="pm-cta" id="pvSubmit"><span>Submit ${stage} for approval</span><svg class="icn"><use href="#ic-arrow"/></svg></button>`;
        wirePair(ap);
        ap.querySelector('#pvSubmit').onclick=()=>{ if(!s.ver) bumpVer(s); s.st='awaiting'; if(stage==='proof') s.paired=svPair; commit('submitted '+stage+' v'+s.ver+' for approval'); };
      } else if(s.st==='changes'){
        ap.innerHTML=pairSel+`<button class="pm-cta" id="pvSubmit"><span>Revise &amp; resubmit (new version)</span><svg class="icn"><use href="#ic-arrow"/></svg></button>`;
        wirePair(ap);
        ap.querySelector('#pvSubmit').onclick=()=>{ bumpVer(s); s.st='awaiting'; if(stage==='proof') s.paired=svPair; commit('resubmitted '+stage+' v'+s.ver); };
      } else if(s.st==='awaiting'){
        ap.innerHTML=`<div class="pv-done"><svg class="icn"><use href="#ic-clock"/></svg>Released to the customer for approval.</div>`;
      } else if(s.st==='infoneeded'){
        ap.innerHTML=`<div class="pv-done"><svg class="icn"><use href="#ic-clock"/></svg>Awaiting information from the customer.</div>`;
      }
    }
  }
  function wirePair(ap){ const sel=ap.querySelector('#pvPairSel'); if(sel) sel.onchange=()=>{ svPair=+sel.value; }; }

  // ---- price-state persistence (mutable fields on d.price that must survive reload) ----
  const PRICE_PERSIST_KEYS=['_approvedAt','_expired','expiryDays','country','_countries','discountPct','additional','supplierAdditional','locked','_mxExp','_accOpen'];
  function priceState(p){ const d=data(p); if(!d||!d.price) return null; const o={}; PRICE_PERSIST_KEYS.forEach(k=>{ if(d.price[k]!==undefined) o[k]=d.price[k]; }); return o; }
  function restorePriceState(p,o){ const d=data(p); if(!d||!d.price||!o) return; PRICE_PERSIST_KEYS.forEach(k=>{ if(o[k]!==undefined) d.price[k]=o[k]; }); }

  window.MSModal = { def, body, wire, openProof, openStage, rollDesign, seedDesign, designVerb, data:p=>data(p), priceSummary, priceState, restorePriceState, resolveDiscount, discountsConfig, saveDiscountsConfig, METHODS, hex };
})();
