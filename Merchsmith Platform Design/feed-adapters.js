/* ============================================================
   feed-adapters.js — pluggable supplier-feed adapters.
   Each adapter knows how to DETECT its feed shape, FLATTEN the
   raw (often deeply-nested, multi-file) JSON into platform
   products, and report which platform fields it fills + gaps.

   Genuinely parses real uploaded files (no mock). Consumed by
   the multi-step import wizard (admin-import.js) which calls
   MSFEED.parse(files) → {adapter, products, warnings, stats}.

   window.MSFEED API:
     adapters()                  → [{id,name,format,files}]
     detect(files)               → adapter | null   (files = [{name,json}])
     parse(files)                → {adapter, products[], warnings[], stats, join}
     VALUEMAP                    → editable lookup tables (category/method/colour/eco)
   ============================================================ */
window.MSFEED = (function(){
  'use strict';
  const decode=s=>String(s==null?'':s).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#?\w+;/g,m=>({'&trade;':'™','&reg;':'®'}[m]||m)).replace(/\uFFFD/g,'£').trim();
  const num=v=>{ let s=String(v==null?'':v).trim(); if(s.indexOf(',')>=0&&s.indexOf('.')<0) s=s.replace(',','.'); const n=parseFloat(s.replace(/[^0-9.\-]/g,'')); return isNaN(n)?null:n; };
  // first array under a node whose first element is an object/array (PF Concept wraps everything in singleton arrays)
  const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);

  /* ---------------- shared value-mapping lookups (editable, persisted) ---------------- */
  // these are the normalisation tables the value-mapping screens edit.
  const VM_KEY='ms-value-maps';
  const DEFAULT_VM={
    // PF Concept numeric groupDesc → platform department (full taxonomy from the live feed: 42 codes)
    groupDesc:{
      // 01xx bags
      '0101':'Bags','0102':'Bags','0103':'Bags','0104':'Bags','0105':'Bags','0106':'Bags','0107':'Bags',
      // 02xx / 03xx tech
      '0201':'Tech','0301':'Tech','0302':'Tech','0303':'Tech',
      // 04xx mixed lifestyle/accessories
      '0401':'Lifestyle','0402':'Lifestyle','0405':'Drinkware','0406':'Outdoor','0407':'Bags',
      '0410':'Lifestyle','0412':'Lifestyle','0414':'Clothing',
      // 07xx writing / notebooks / drinkware / outdoor
      '0701':'Writing','0703':'Notebooks','0704':'Lifestyle','0706':'Drinkware','0707':'Outdoor','0708':'Lifestyle',
      // 08xx drinkware
      '0801':'Drinkware','0803':'Drinkware','0804':'Drinkware','0805':'Drinkware',
      // 11xx-14xx apparel
      '1101':'Clothing','1102':'Clothing','1104':'Clothing','1105':'Clothing','1108':'Clothing','1109':'Clothing',
      '1201':'Clothing','1202':'Clothing','1301':'Clothing','1303':'Clothing','1304':'Clothing','1401':'Clothing',
      // 96xx stationery
      '9603':'Writing' },
    // printCode prefix → platform method
    methodPrefix:{ DTF:'dtf', D3D:'dtf', DOM:'dtf', DPRINT:'dtf', DPP:'dtf', DHTS:'dtf', DPS:'dtf', DST:'dtf', DRD:'dtf', SUBM:'dtf',
      TRA:'transfer', MR:'transfer', PAD:'pad', EMB:'embroidery', DEB:'laser', GPE:'laser', LAS:'laser', LASR:'laser' },
    // PF Concept product-feed categoryData.groupDesc (TEXT) → platform department
    prodGroup:{ 'Drinkware':'Drinkware','Umbrellas':'Outdoor','Home & Kitchen':'Lifestyle','Bags':'Bags',
      'Technology':'Tech','Sports & Leisure':'Outdoor','Giveaways':'Lifestyle','Health & Personal Care':'Lifestyle',
      'Pens & Writing':'Writing','Clothing':'Clothing','Tools & Car Accessories':'Outdoor' },
    // FX rates → GBP (Xoopar feed is EUR). Editable in value maps.
    fx:{ EUR:0.86, USD:0.79, GBP:1 }
  };
  // base URL for PF Concept product images (filename comes from imageData.imageMain)
  const PF_IMG_BASE='https://images.pfconcept.com/ProductImages_All/JPG/500x500/';
  function loadVM(){ try{ const v=JSON.parse(localStorage.getItem(VM_KEY)||'null'); if(v) return Object.assign({},DEFAULT_VM,v,{groupDesc:Object.assign({},DEFAULT_VM.groupDesc,v.groupDesc),methodPrefix:Object.assign({},DEFAULT_VM.methodPrefix,v.methodPrefix),prodGroup:Object.assign({},DEFAULT_VM.prodGroup,v.prodGroup),fx:Object.assign({},DEFAULT_VM.fx,v.fx)}); }catch(e){} return JSON.parse(JSON.stringify(DEFAULT_VM)); }
  function saveVM(v){ try{ localStorage.setItem(VM_KEY, JSON.stringify(v)); }catch(e){} }
  let VM=loadVM();

  const DEPTS=(window.MSCAT&&MSCAT.DEPTS)||['Bags','Clothing','Desk','Drinkware','Exhibition','Lifestyle','Notebooks','Outdoor','Tech','Writing'];

  // closest break at or below qty in an array of {q,...}
  function pickBreak(breaks, qty){ let hit=breaks[0]; for(const b of breaks){ if(b.q<=qty) hit=b; else break; } return hit; }
  // department from a numeric/keyword category, with keyword fallback
  function deptFromGroup(code, name){
    if(VM.groupDesc[code]) return VM.groupDesc[code];
    const v=(name||'').toLowerCase();
    if(/bottle|flask|tumbler|mug|cup|drink|sip|brew|jug/.test(v)) return 'Drinkware';
    if(/bag|tote|backpack|pouch|cooler/.test(v)) return 'Bags';
    if(/blanket|poncho|umbrella|outdoor|picnic|beach/.test(v)) return 'Outdoor';
    if(/sunglass|wristband|lanyard|keyring/.test(v)) return 'Lifestyle';
    return 'Lifestyle';
  }
  function methodFromCode(code){
    const m=String(code).match(/^[A-Za-z]+/); const pre=m?m[0].toUpperCase():'';
    // longest-prefix match (LASR before LAS)
    let best=''; for(const k in VM.methodPrefix){ if(pre.indexOf(k)===0 && k.length>best.length) best=k; }
    return best?VM.methodPrefix[best]:'dtf';
  }
  // sustainability heuristic from product name (no eco field in PF Concept feeds)
  function ecoFromName(name){ const v=(name||'').toLowerCase();
    if(/\brcs\b|recycled|rpet|rcs certified/.test(v)) return 8;
    if(/bamboo|glass|cork|wheat|organic/.test(v)) return 7;
    if(/stainless steel|copper vacuum|tritan/.test(v)) return 6;
    return 5; }
  const leadFromLocation=loc=>loc==='UK'?5:10;

  // ---- PF Concept product-feed helpers ----
  function deptFromProdGroup(groupDesc, fallbackName){
    if(groupDesc && VM.prodGroup[groupDesc]) return VM.prodGroup[groupDesc];
    return deptFromGroup(null, fallbackName);
  }
  // sustainability score boosted by real certifications / green points (product feed)
  function ecoFromProduct(p, name){
    let s=ecoFromName(name);
    if(p.certifications && p.certifications.length) s=Math.max(s, 7+Math.min(2,p.certifications.length-1));
    if(/fsc|oeko|gots|grs|rcs/i.test((p.certifications||[]).join(' '))) s=Math.max(s,8);
    if(p.material && /bamboo|cork|organic|recycled|rpet|wheat|glass/i.test(p.material)) s=Math.max(s,7);
    return Math.min(9,s);
  }
  const csv=v=>String(v==null?'':v).split(',').map(s=>s.trim()).filter(Boolean);
  // PF Concept decoration method NAME (product feed) → platform method
  function methodFromName(name){ const v=String(name||'').toLowerCase();
    if(/pad/.test(v)) return 'pad';
    if(/screen/.test(v)) return 'screenprint';
    if(/embroid/.test(v)) return 'embroidery';
    if(/laser|engrav|deboss/.test(v)) return 'laser';
    if(/transfer/.test(v)) return 'transfer';
    return 'dtf'; // digital / doming / sublimation / print
  }
  // build a dimensions string from PF measurements (handles "," decimals + Ø diameter)
  function dimsFromMeasurements(mm){ if(!mm) return '';
    const fix=s=>String(s||'').replace(',','.').trim();
    if(mm.SizeCombined) return fix(mm.SizeCombined);
    const parts=[mm.lengthCm,mm.widthCm,mm.heightCm].map(fix).filter(Boolean);
    if(parts.length) return parts.join(' × ')+' cm';
    if(mm.diameterCm) return 'Ø '+fix(mm.diameterCm)+' cm';
    return '';
  }

  // assemble a platform product from price-side fields + optional product-feed record (pr)
  function buildProduct(o){
    const pr=o.pr||null;
    const name = (pr&&pr.name) || o.priceName || o.code;
    const dept = pr&&pr.group ? deptFromProdGroup(pr.group, name) : deptFromGroup(o.groupDesc, name);
    const priceFrom = o.breaks.length ? Math.min(...o.breaks.map(b=>b.unit).filter(x=>x!=null)) : null;
    const gaps=[]; if(o.unpriced||priceFrom==null) gaps.push('price'); if((o.decoration||[]).some(d=>d.unresolved)) gaps.push('deco'); if(!pr) gaps.push('attrs');
    return {
      _src:'pfconcept', code:o.code, name,
      dept, cat: pr?pr.subcat:'', groupDesc:o.groupDesc||'', group: pr?pr.group:'',
      priceFrom, breaks:o.breaks.map(b=>({q:b.q,unit:b.unit})), rrp:o.rrp, moq:o.moq,
      lead:o.lead, sustainability: pr?ecoFromProduct(pr,name):ecoFromName(name),
      colours: pr?pr.colours:[], methods:(o.methods&&o.methods.length)?o.methods:((pr&&pr.methods)||[]),
      clearance:o.clearance, variants:o.variants, variantCount:(o.variants||[]).length||(pr?pr.itemCodes.length:0),
      decoration:o.decoration||[], stock:o.stock, currency:o.currency||'GBP',
      // product-feed enrichment
      image: pr?pr.image:'', images: pr?pr.images:[], brand: pr?pr.brand:'',
      material: pr?pr.material:'', origin: pr?pr.origin:'', certifications: pr?pr.certifications:[],
      carton: pr?pr.carton:null, weightGr: pr?pr.weightGr:null, dimensions: pr?pr.dimensions:'', branding: pr?pr.branding:null,
      size: pr?pr.size:'', gender: pr?pr.gender:'', ean: pr?pr.ean:'', hsCode: pr?pr.hsCode:'', video: pr?pr.video:'',
      desc: pr?pr.extDesc:'', subcat: pr?pr.subcat:'',
      unpriced:!!o.unpriced, _gaps:gaps
    };
  }

  /* ================= PF Concept adapter ================= */
  const pfconcept={
    id:'pfconcept', name:'PF Concept', format:'JSON · up to 4 feeds (product · price · print-price · stock)',
    files:[ {key:'product',label:'Product feed',root:'pfcProductfeed',required:false},
            {key:'price',label:'Price feed',root:'PFCPriceFeed',required:false},
            {key:'print',label:'Print-price feed',root:'PFCPrintpricefeed',required:false},
            {key:'stock',label:'Stock feed',root:'PFCStockFeed',required:false} ],
    detect(files){ return files.some(f=>f.json&&(f.json.PFCPriceFeed||f.json.PFCPrintpricefeed||f.json.PFCStockFeed||f.json.pfcProductfeed)); },
    // classify each uploaded file to a feed slot by its root key; MERGE multi-part files
    // of the same feed (e.g. a product feed split into two for upload-size limits)
    classify(files){ const slot={};
      const mergeInto=(target,src,path)=>{ // deep-merge the models array at path
        let a=target,b=src; for(const k of path){ a=a&&a[k]; b=b&&b[k]; if(!a||!b)return; }
        if(Array.isArray(a)&&Array.isArray(b)) a.push(...b); };
      files.forEach(f=>{ if(!f.json)return;
        if(f.json.PFCPriceFeed){ if(!slot.price)slot.price=f.json; else mergeInto(slot.price,f.json,['PFCPriceFeed','priceInfo']); }
        else if(f.json.PFCPrintpricefeed){ if(!slot.print)slot.print=f.json; else mergeInto(slot.print.PFCPrintpricefeed.decoCharges,f.json.PFCPrintpricefeed.decoCharges,['decoCharge']); }
        else if(f.json.PFCStockFeed){ if(!slot.stock)slot.stock=f.json; else mergeInto(slot.stock,f.json,['PFCStockFeed','stockFeed']); }
        else if(f.json.pfcProductfeed){ if(!slot.product)slot.product=f.json; else mergeInto(slot.product.pfcProductfeed.productfeed,f.json.pfcProductfeed.productfeed,['models']); }
      });
      return slot; },

    // build a printCode → decoration-cost lookup from the print feed
    buildPrintIndex(printJson){
      const idx={}; if(!printJson) return idx;
      const list=arr(((printJson.PFCPrintpricefeed||{}).decoCharges||{}).decoCharge);
      list.forEach(d=>{
        const sizes=arr(d.logoSizes).flatMap(ls=>arr(ls.logoSize));
        const bands=sizes.map(sz=>{
          const ac=arr(sz.amountColors).flatMap(a=>arr(a.amountColor))[0]||{};
          const sc=arr(ac.amountSetupCharges).flatMap(a=>arr(a.amountSetupCharge))[0]||{};
          const breaks=arr(sc.decoPrices).flatMap(p=>arr(p.decoPrice)).map(p=>({q:num(p.decoPriceFromQty)||1,price:num(p.price)})).sort((a,b)=>a.q-b.q);
          return { sizeCm2:num(sz.logoSizeCm2)||0, colours:ac.amountColorsId||'Full color', setup:num(sc.setupCharge)||0, breaks };
        });
        idx[d.printCode]={ code:d.printCode, method:methodFromCode(d.printCode), impMethod:decode(d.impMethod),
          dependence:d.priceDependence||'None', ltm:num(d.LTMCharge)||0, bands };
      });
      return idx;
    },
    // stock index keyed by itemCode → {direct,nextPo,nextPoDate,future,location}
    buildStockIndex(stockJson){
      const idx={}; if(!stockJson) return idx;
      arr((stockJson.PFCStockFeed||{}).stockFeed).forEach(feed=>{
        arr(feed.models).forEach(ms=>arr(ms.model).forEach(m=>{
          arr(m.items).forEach(it=>arr(it.item).forEach(v=>{
            idx[v.itemCode]={ direct:num(v.stockDirect)||0, nextPo:num(v.stockNextPo)||0,
              nextPoDate:v.stockDateNextPo||null, future:num(v.StockFuture)||0, location:v.stockLocation||'PL' };
          }));
        }));
      });
      return idx;
    },
    // product index from the product feed, keyed by modelCode. Extracts rich attributes,
    // colours, images, category, certifications, carton/weight, origin, sizes.
    buildProductIndex(prodJson){
      const idx={}; if(!prodJson) return idx;
      arr((prodJson.pfcProductfeed||{}).productfeed).forEach(pf=>arr(pf.models).forEach(mw=>{
        const m=mw.model||mw; if(!m||!m.modelCode) return;
        // model-level attributes (pa_* bag)
        const attrs={}; arr((m.attributes||{}).attribute).forEach(x=>{ if(x&&x.productAttributeCode) attrs[x.productAttributeCode]=x.attributeSetting; });
        const certs=[]; ['pa_certifications_environmental','pa_certifications_social','pa_oekoStandard'].forEach(k=>csv(attrs[k]).forEach(c=>{ if(c && !/^no$/i.test(c)) certs.push(c); }));
        const items=arr(m.items).map(w=>w.item||w).filter(Boolean);
        const colours=[]; const seen=new Set();
        items.forEach(i=>arr((i.colors||{}).color).forEach(c=>{ const d=decode(c.colorDesc||c.baseColor||''); if(d&&!seen.has(d)){ seen.add(d); colours.push({name:d, base:c.baseColor||'', hex:(c.hexColor||'').replace(/^#/,'')}); } }));
        const first=items[0]||{};
        const cd=first.categoryData||{};
        const imgFile=s=>String(s||'').split(',')[0].trim(); // imageMain can be a CSV of filenames
        const img=imgFile(first.imageData&&first.imageData.imageMain);
        const allImgs=items.map(i=>imgFile(i.imageData&&i.imageData.imageMain)).filter(Boolean);
        // decoration default (product feed) → platform method + branding detail
        const dd=(first.decorationSettings||{}).decoDefault||{};
        const methods=dd.method?[methodFromName(dd.method)]:[];
        const branding=dd.method?{ method:methodFromName(dd.method), name:decode(dd.method),
          location:dd.impLocationDefault||'', size:dd.impSizeDefaultMm||'', maxColours:dd.maxColoursDefault||'', leadTime:dd.leadTime||'' }:null;
        const gp=(first.greenPoints&&num(first.greenPoints.greenPointsTotal))||null;
        idx[String(m.modelCode)]={
          name:decode(m.description), extDesc:decode(m.extDesc), keywords:decode(m.keywords),
          brand:first.brand||'', material:decode(first.material||(first.simpleMaterial&&first.simpleMaterial.join?first.simpleMaterial.join(', '):'')),
          origin:first.countryOfOrigin||'', group:cd.groupDesc||'', subcat:cd.catDesc||'',
          colours, certifications:[...new Set(certs)],
          image: img?PF_IMG_BASE+img:'', images:[...new Set(allImgs)].map(f=>PF_IMG_BASE+f),
          dimensions:dimsFromMeasurements(first.measurements), methods, branding, greenPoints:gp,
          carton:num(first.qtyPerCarton), weightGr:num((first.measurements||{}).weightGr)||num(first.nettWeightKg)*1000||null,
          size:first.size||'', gender:first.gender&&first.gender!=='None'?first.gender:'',
          ean:first.eanCode||'', hsCode:first.hsCode||'', video:first.videoUrl1||first.videoUrl2||'',
          itemCodes:items.map(i=>String(i.itemCode)),
          attrs };
      }));
      return idx;
    },

    flatten(files, warnings){
      const slot=this.classify(files);
      if(!slot.price && !slot.product){ warnings.push('No PF Concept price or product feed found — nothing to build.'); return []; }
      const printIdx=this.buildPrintIndex(slot.print);
      this._book=printIdx; // shared decoration cost book, persisted once per supplier (not per product)
      const stockIdx=this.buildStockIndex(slot.stock);
      const prodIdx=this.buildProductIndex(slot.product);
      const out=[]; const pricedCodes=new Set();

      // 1) priced models (from price feed), enriched with product-feed attributes where modelcode matches
      arr((slot.price||{}).PFCPriceFeed&&slot.price.PFCPriceFeed.priceInfo).forEach(pi=>{
        arr(pi.models).forEach(ms=>arr(ms.model).forEach(m=>{
          const variants=[]; let firstItem=null; const decoSet=new Set();
          arr(m.items).forEach(it=>arr(it.item).forEach(v=>{
            firstItem=firstItem||v;
            (v.decoCharge||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(c=>decoSet.add(c));
            const st=stockIdx[v.itemcode]||null;
            variants.push({ code:v.itemcode, clearance:v.clearance==='C',
              cost:num((arr(arr(v.scales)[0]&&arr(v.scales)[0].scale)[0]||{}).nettPrice), stock:st });
          }));
          if(!firstItem) return;
          pricedCodes.add(String(m.modelcode));
          const scale=arr(arr(firstItem.scales)[0]&&arr(firstItem.scales)[0].scale);
          const breaks=scale.map(s=>({ q:num(s.priceBar)||1, unit:num(s.nettPrice), rrp:num(s.industryCol) })).sort((a,b)=>a.q-b.q);
          const decoration=[...decoSet].map(code=>{
            const d=printIdx[code];
            if(!d) return { code, method:methodFromCode(code), impMethod:code, unresolved:true };
            const band=d.bands[0]||{setup:0,breaks:[]};
            return { code, method:d.method, impMethod:d.impMethod, dependence:d.dependence,
              setup:band.setup, breaks:band.breaks, sizeBands:d.bands.length>1?d.bands.map(b=>b.sizeCm2):null };
          });
          const methods=[...new Set(decoration.map(d=>d.method))];
          const totalStock=variants.reduce((s,v)=>s+((v.stock&&v.stock.direct)||0),0);
          const locs=[...new Set(variants.map(v=>v.stock&&v.stock.location).filter(Boolean))];
          const pr=prodIdx[String(m.modelcode)]||null;
          out.push(buildProduct({
            code:m.modelcode, priceName:decode(m.description), groupDesc:firstItem.groupDesc,
            breaks, rrp:breaks.length?breaks[0].rrp:null,
            moq:num(firstItem.minDecoQty)||(breaks[0]&&breaks[0].q)||50,
            lead:leadFromLocation(locs[0]||'PL'), methods, decoration,
            clearance:variants.some(v=>v.clearance), variants:variants.map(v=>v.code),
            stock:{ total:totalStock, locations:locs }, currency:firstItem.currency||'GBP', pr
          }));
        }));
      });

      // 2) product-only models (in product feed, NOT priced) — rich attributes + images, price=POA
      Object.keys(prodIdx).forEach(code=>{ if(pricedCodes.has(code)) return;
        const pr=prodIdx[code];
        const st=pr.itemCodes.map(ic=>stockIdx[ic]).filter(Boolean);
        const totalStock=st.reduce((s,x)=>s+(x.direct||0),0);
        const locs=[...new Set(st.map(x=>x.location).filter(Boolean))];
        out.push(buildProduct({
          code, priceName:'', groupDesc:'', breaks:[], rrp:null, moq:null,
          lead:leadFromLocation(locs[0]||'PL'), methods:[], decoration:[],
          clearance:false, variants:pr.itemCodes, stock:{ total:totalStock, locations:locs },
          currency:'GBP', pr, unpriced:true
        }));
      });

      // assemble warnings
      if(slot.product) warnings.push(Object.keys(prodIdx).length+' products read from the product feed (names, colours, images, categories).');
      if(slot.price&&slot.product){ const enriched=out.filter(p=>p.priceFrom!=null && p.image).length; warnings.push(enriched+' priced products matched to product-feed attributes/images.'); if(enriched===0) warnings.push('⚠ No priced products matched the product feed — they may be different catalogues (e.g. CNL1 vs CNL2).'); }
      if(slot.print&&Object.keys(printIdx).length) warnings.push(Object.keys(printIdx).length+' decoration methods loaded from the print-price feed.');
      else if(slot.price&&!slot.print) warnings.push('No print-price feed — decoration costs unavailable (methods inferred from codes only).');
      if(slot.price&&!slot.stock) warnings.push('No stock feed — availability/lead unknown (defaulted).');
      if(slot.product&&!slot.price) warnings.push('No price feed — product-feed items import as POA (needs-attention) until priced.');
      return out;
    },
    // which platform fields PF Concept can fill (for the mapping/preview UI)
    coverage:[
      ['name','product feed / description','ok'],['code','modelCode','ok'],['breaks','scales → nettPrice','ok'],
      ['dept','categoryData / groupDesc','ok'],['category','categoryData.catDesc','ok'],
      ['colours','colors[].colorDesc','ok'],['image','imageData → images.pfconcept.com','ok'],
      ['material','material','ok'],['origin','countryOfOrigin','ok'],['certifications','pa_certifications_*','ok'],
      ['methods','decoCharge → print feed','heur'],['decoration','print-price feed','ok'],
      ['stock','stock feed','ok'],['carton','qtyPerCarton','ok'],['sustainability','certs + material','heur']
    ]
  };

  /* ================= Xoopar adapter (Akeneo PIM values{} bag) ================= */
  // FX → GBP. Xoopar prices are EUR. Editable via VM.fx.
  const DEFAULT_FX={EUR:0.86, USD:0.79, GBP:1};
  function fxRate(cur){ const f=(VM.fx&&VM.fx[cur])||DEFAULT_FX[cur]; return f||1; }
  // Xoopar free-text type_of_product (en/fr/es) → platform department
  function deptFromXoopar(t){ const v=String(t||'').toLowerCase();
    if(/cable|powerbank|charg|adapter|speaker|earbud|bluetooth|hub|lamp|lampe|rfid|nfc|tag|popsocket|tech|usb|wireless|charge|enceinte|altavoz|thermometer|light/.test(v)) return 'Tech';
    if(/bag|sac|backpack|sleeve|pouch|wallet|laptop|bolsa|mochila/.test(v)) return 'Bags';
    if(/cap|hat|casquette|gorra|apparel|t-?shirt|polo|hoodie/.test(v)) return 'Clothing';
    if(/bottle|mug|cup|tumbler|drink|botella|gourde|taza/.test(v)) return 'Drinkware';
    if(/pen|pencil|notebook|stylo|carnet|cuaderno/.test(v)) return 'Writing';
    if(/umbrella|outdoor|parapluie|sport|fitness/.test(v)) return 'Outdoor';
    return 'Tech'; // Xoopar is predominantly a tech-gadget catalogue
  }
  const XO_METHOD={'digital printing':'dtf','pad printing':'pad','laser engraving':'laser','screen printing':'screenprint','embroidery':'embroidery','transfer':'transfer','doming':'dtf','uv printing':'dtf'};
  function xMethod(name){ const v=String(name||'').toLowerCase().trim(); return XO_METHOD[v]||(/(laser|engrav)/.test(v)?'laser':/pad/.test(v)?'pad':/screen/.test(v)?'screenprint':/embro/.test(v)?'embroidery':'dtf'); }
  const xoopar={
    id:'xoopar', name:'Xoopar (Akeneo PIM)', format:'JSON · Akeneo values{} attribute bag · EUR→GBP',
    files:[ {key:'products',label:'Products export',root:'(array of {values})',required:true} ],
    detect(files){ return files.some(f=>f.json&&Array.isArray(f.json)&&f.json[0]&&f.json[0].values); },
    // pull a value from the Akeneo bag: prefer requested locale, then null-locale, then first
    val(r,key,locale){ const a=r.values&&r.values[key]; if(!a||!a.length) return undefined;
      if(locale){ const m=a.find(x=>x.locale===locale); if(m) return m.data; }
      const n=a.find(x=>x.locale===null); return (n||a[0]).data; },
    txt(r,key,locale){ const d=this.val(r,key,locale); return d==null?'':decode(Array.isArray(d)?d.join(', '):String(d)); },
    measure(r,key){ const d=this.val(r,key); if(d==null) return null; if(typeof d==='object'&&d.amount!=null) return num(d.amount); return num(d); },
    flatten(files, warnings){
      const file=files.find(f=>f.json&&Array.isArray(f.json)); if(!file){ warnings.push('No Xoopar product array found.'); return []; }
      const recs=file.json.filter(r=>r&&r.values); const out=[];
      let eurCt=0;
      recs.forEach(r=>{
        const V=this.val.bind(this), T=this.txt.bind(this), MZ=this.measure.bind(this);
        const code=String(r.identifier||T(r,'family_article_code')||r.uuid||'').trim();
        const name=T(r,'retail_name','en_US')||T(r,'retail_name')||T(r,'designation','en_US')||T(r,'designation')||code;
        const typ=T(r,'type_of_product','en_US')||T(r,'type_of_product','fr_FR')||T(r,'type_of_product');
        const dept=deptFromXoopar(typ);
        // price (EUR → GBP)
        const priceArr=V(r,'price'); const pe=Array.isArray(priceArr)?priceArr[0]:null;
        const cur=(pe&&pe.currency)||'EUR'; if(cur==='EUR') eurCt++;
        const rawAmt=pe?num(pe.amount):null; const unit=rawAmt!=null?+(rawAmt*fxRate(cur)).toFixed(2):null;
        const moq=MZ(r,'minimum_printing_quantity')||num(T(r,'minimum_printing_quantity'))||50;
        const breaks=unit!=null?[{q:moq||1,unit}]:[];
        // colours
        let colsRaw=V(r,'product_colors'); colsRaw=Array.isArray(colsRaw)?colsRaw:(colsRaw?[colsRaw]:[]);
        const colours=colsRaw.map(c=>({name:decode(String(c).replace(/\b\w/g,m=>m.toUpperCase())), base:'', hex:''}));
        // images (direct celaneo URLs — embeddable). Drive links are NOT (need re-host).
        const imgs=[]; const main=T(r,'main_photo'); if(main) imgs.push(main);
        for(let i=1;i<=6;i++){ const im=T(r,'image_'+i); if(im && !imgs.includes(im)) imgs.push(im); }
        // decoration — per-method run cost + shared technical setup fee
        const setup=MZ(r,'printing_technical_fees')||MZ(r,'setting_fees_front_and_back_printing')||0;
        let prints=V(r,'type_of_printing'); prints=Array.isArray(prints)?prints:(prints?[prints]:[]);
        const RUNKEY={dtf:'digital_print_price_position',pad:'pad_print_price_position',screenprint:'screen_print_price',laser:'laser_engraving_price'};
        const decoration=prints.map(pn=>{ const method=xMethod(pn); const run=MZ(r,RUNKEY[method]); const breaksD=run!=null?[{q:moq||1,price:run}]:[];
          return { code:method.toUpperCase(), method, impMethod:decode(pn), dependence:'None', setup:setup||0, breaks:breaksD, unresolved:false }; });
        const methods=[...new Set(decoration.map(d=>d.method))];
        // dimensions
        const dims=[MZ(r,'length_cm'),MZ(r,'width_cm'),MZ(r,'height_cm')].filter(x=>x!=null);
        const dimensions=dims.length?dims.join(' × ')+' cm':(T(r,'size')||'');
        // certifications / eco
        const certs=[]; ['certification','ce_eu','rohs_eu','reach_eu','ukca_eu'].forEach(k=>{ const d=V(r,k); if(d===true) certs.push(k.replace(/_eu$/,'').toUpperCase()); else if(typeof d==='string'&&d&&!/^no$/i.test(d)) certs.push(decode(d)); });
        const co2=MZ(r,'carbon_footprint');
        const features=[]; ['nfc','rfid_protection','magnetic','bluetooth'].forEach(k=>{ if(V(r,k)===true) features.push(k.toUpperCase().replace('_',' ')); });
        let eco=5; const mat=T(r,'material'); if(/recycl|rpet|bamboo|organic|cork/i.test(name+' '+mat)) eco=8; else if(certs.length) eco=7; else if(co2) eco=6;
        const stock=num(T(r,'stock'))||0;
        const newFlag=V(r,'new')===true;
        const driveLinks=[]; ['template','hd_image_link','link_image1','technical_sheet_url','video_link'].forEach(k=>{ const d=T(r,k); if(d) driveLinks.push(d); });
        out.push({
          _src:'xoopar', code, name, dept, cat:typ, groupDesc:'', group:'',
          priceFrom:unit, breaks, rrp:null, moq, lead:15, sustainability:eco,
          colours, methods, clearance:false, variants:[code], variantCount:1,
          decoration, stock:{ total:stock, locations:[] }, currency:'GBP', srcCurrency:cur,
          image:imgs[0]||'', images:imgs, brand:T(r,'brand'), material:mat,
          origin:T(r,'manufacturing_country'), certifications:[...new Set(certs)],
          carton:null, weightGr:MZ(r,'weight_g'), dimensions, branding:decoration[0]?{method:decoration[0].method,name:decoration[0].impMethod,location:'',size:T(r,'printing_zone_size'),maxColours:''}:null,
          size:T(r,'size'), gender:'', ean:T(r,'ean')||T(r,'upc'), hsCode:T(r,'hs_customs_code'),
          video:T(r,'video_link'), desc:T(r,'long_description','en_US')||T(r,'long_description'), subcat:T(r,'collection'),
          features, co2, driveLinks, newArrival:newFlag,
          _gaps:(unit==null?['price']:[]).concat(imgs.length?[]:['image'])
        });
      });
      if(eurCt) warnings.push(eurCt+' products priced in EUR → converted to GBP at '+fxRate('EUR')+' (editable in value maps · fx.EUR).');
      const noImg=out.filter(p=>!p.image).length; if(noImg) warnings.push(noImg+' products have only Google-Drive image links (not directly embeddable — need re-hosting).');
      warnings.push(out.length+' Xoopar products parsed from the Akeneo export.');
      return out;
    },
    coverage:[
      ['name','retail_name (en_US)','ok'],['code','identifier','ok'],['price','price EUR → GBP','heur'],
      ['dept','type_of_product keyword','heur'],['colours','product_colors','ok'],['image','main_photo / image_1-6','ok'],
      ['material','material','ok'],['origin','manufacturing_country','ok'],['ean','ean / upc','ok'],
      ['methods','type_of_printing','ok'],['decoration','*_print_price + technical_fees','heur'],
      ['dimensions','length/width/height_cm','ok'],['weight','weight_g','ok'],['stock','stock','ok'],
      ['certifications','certification + CE/RoHS','heur'],['features','nfc/rfid/bluetooth','ok'],['carbon','carbon_footprint','newf']
    ]
  };

  /* ================= stubs for other suppliers (filled when samples land) ================= */
  function stub(id,name,format,rootHint){ return { id,name,format, stub:true,
    detect(files){ return rootHint?files.some(f=>f.json&&rootHint(f.json)):false; },
    flatten(){ return []; }, coverage:[] }; }
  const neutral=stub('neutral','Neutral (via PF Concept)','JSON · nested parent→variants', j=>Array.isArray(j)&&j[0]&&(j[0].parentSKU||j[0].skus));
  const xindao =stub('xindao','Xindao','JSON · 5 joined feeds', j=>Array.isArray(j)&&j[0]&&(j[0].ModelCode||j[0].ItemCode));

  const ADAPTERS=[pfconcept, xoopar, neutral, xindao];

  function detect(files){ return ADAPTERS.find(a=>!a.stub&&a.detect&&a.detect(files)) || ADAPTERS.find(a=>a.detect&&a.detect(files)) || null; }
  function parse(files){
    const warnings=[]; const a=detect(files);
    if(!a) return { adapter:null, products:[], warnings:['Could not recognise the feed shape. Supported: PF Concept (3-feed JSON). Others coming.'], stats:{} };
    if(a.stub) return { adapter:a, products:[], warnings:[a.name+' adapter not built yet — sample feed needed.'], stats:{} };
    const products=a.flatten(files, warnings)||[];
    const priced=products.filter(p=>p.priceFrom!=null);
    const stats={ products:products.length, priced:priced.length, gaps:products.length-priced.length,
      variants:products.reduce((s,p)=>s+(p.variantCount||0),0),
      methods:[...new Set(products.flatMap(p=>p.methods||[]))].length,
      withDeco:products.filter(p=>(p.decoration||[]).length).length,
      withStock:products.filter(p=>p.stock&&p.stock.total).length,
      withImage:products.filter(p=>p.image).length,
      withColour:products.filter(p=>(p.colours||[]).length).length };
    return { adapter:a, products, warnings, stats, decoBook:a._book||null };
  }

  // slim a parsed product to a persistence-safe shape. Decoration becomes LIGHT code
  // references (code/method/impMethod/dependence) — the full cost tables (setup + qty
  // breaks) live ONCE in the shared deco book (res.decoBook), not duplicated per product.
  function slim(p){
    return { _src:p._src, code:p.code, name:p.name, dept:p.dept, cat:p.cat, groupDesc:p.groupDesc,
      priceFrom:p.priceFrom, breaks:p.breaks, rrp:p.rrp, moq:p.moq, lead:p.lead, sustainability:p.sustainability,
      colours:p.colours, methods:p.methods, clearance:p.clearance, variantCount:p.variantCount, currency:p.currency,
      decoration:(p.decoration||[]).map(d=>({ code:d.code, method:d.method, impMethod:d.impMethod, dependence:d.dependence })),
      stock: p.stock?{ total:p.stock.total, locations:p.stock.locations }:null,
      image:p.image||'', images:p.images||[], brand:p.brand||'', material:p.material||'', origin:p.origin||'',
      certifications:p.certifications||[], carton:p.carton||null, weightGr:p.weightGr||null, dimensions:p.dimensions||'', branding:p.branding||null,
      size:p.size||'', gender:p.gender||'', ean:p.ean||'', hsCode:p.hsCode||'', video:p.video||'', desc:p.desc||'', subcat:p.subcat||'', unpriced:!!p.unpriced,
      features:p.features||[], co2:p.co2||null, driveLinks:p.driveLinks||[], newArrival:!!p.newArrival, srcCurrency:p.srcCurrency||'',
      _gaps:p._gaps };
  }
  // resolve decoration cost from a stored book: setup (one-off) + run price at qty
  function decoCostAt(book, code, qty){ const d=book&&book[code]; if(!d) return null; const band=(d.bands&&d.bands[0])||{setup:0,breaks:[]};
    const b=pickBreak(band.breaks||[{q:1,price:0}], qty); return { setup:band.setup||0, unit:(b&&b.price)||0, method:d.method, impMethod:d.impMethod }; }

  return {
    adapters:()=>ADAPTERS.map(a=>({id:a.id,name:a.name,format:a.format,stub:!!a.stub,files:a.files||null})),
    detect, parse, slim, decoCostAt,
    get VALUEMAP(){ return VM; },
    reloadValueMaps(){ VM=loadVM(); return VM; },
    setValueMap(dim,key,val){ VM[dim]=VM[dim]||{}; VM[dim][key]=val; saveVM(VM); },
    DEFAULT_VM, DEPTS, helpers:{ deptFromGroup, methodFromCode, pickBreak, ecoFromName, decode, num }
  };
})();
