/* ============================================================
   catalogue-data.js — the shared Merchsmith product database.
   Single source of truth for the master catalogue, read by BOTH
   the platform admin and the distributor store.

   = real store-feed.js products (when present)  +  synthesised
   bulk across all suppliers. Curated-range membership + usage
   stats persist in localStorage so every surface agrees.

   window.MSCAT API:
     all()            → every product in the database
     get(id)          → one product
     suppliers()      → [{name, count}]
     depts()          → [dept,…]
     curated()        → products in the Merchsmith Curated range
     setCurated(id,o) / removeCurated(id)
     stats()          → {products, suppliers, curated, promoted}
   ============================================================ */
window.MSCAT = (function(){
  const DEPTS=['Bags','Clothing','Desk','Drinkware','Exhibition','Lifestyle','Notebooks','Outdoor','Tech','Writing'];
  const SUPPLIERS=['XD Connects','PF Concept','Mid Ocean Brands','Lumen Supplies','BagWorks UK','GreenStock','PrintHouse Studio','Senator'];
  const COLOURS=['Black','White','Navy','Grey','Natural','Forest Green','Sky Blue','Burgundy','Sand','Charcoal'];
  const METHODS=['screenprint','pad','transfer','dtf','embroidery','laser'];
  const BANK={
    Bags:{adj:['Recycled','Organic','Canvas','rPET','Jute'],noun:['Tote','Shopper','Backpack','Drawstring','Duffel'],lo:1.2,hi:14},
    Clothing:{adj:['Organic','Heavyweight','Eco','Classic'],noun:['T-Shirt','Polo','Hoodie','Cap'],lo:4,hi:24},
    Desk:{adj:['Bamboo','Recycled','Cork','rPET'],noun:['Desk Tidy','Mouse Mat','Pouch','Charger','Coaster Set'],lo:2,hi:18},
    Drinkware:{adj:['Insulated','Steel','Bamboo','Double-wall'],noun:['Bottle','Travel Mug','Cup','Tumbler'],lo:3,hi:22},
    Exhibition:{adj:['rPET','Recycled','Eco'],noun:['Lanyard','Badge','Banner','Wristband'],lo:0.6,hi:9},
    Lifestyle:{adj:['Bamboo','Plastic-free','Organic'],noun:['Toothbrush Set','Wellness Kit','Soap Bar','Wrap'],lo:2,hi:16},
    Notebooks:{adj:['Recycled','Kraft','Cork','A5'],noun:['Notebook','Journal','Jotter','Planner'],lo:1.4,hi:9},
    Outdoor:{adj:['Recycled','Storm','rPET'],noun:['Umbrella','Blanket','Cooler Bag','Poncho'],lo:4,hi:26},
    Tech:{adj:['Recycled','Wheat-straw','Bamboo','Wireless'],noun:['Charging Cable','Power Bank','Mouse','Earbuds'],lo:3,hi:30},
    Writing:{adj:['Biodegradable','Recycled','Bamboo','Seed'],noun:['Pen','Pencil','Pencil Set','Highlighter'],lo:0.4,hi:4}
  };
  function rng(seed){ let h=2166136261; for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619);} return ()=>{ h+=0x6D2B79F5; let t=Math.imul(h^h>>>15,1|h); t^=t+Math.imul(t^t>>>7,61|t); return ((t^t>>>14)>>>0)/4294967296; }; }
  // a deterministic ISO date N..(N-span) days ago from a seed
  function dateFromSeed(seed,maxAgo,span){ const r=rng('date-'+seed)(); const days=Math.floor((maxAgo-span)+r*span); return new Date(Date.now()-days*86400000).toISOString().slice(0,10); }

  const DEPT_BY_STOREDEPT={bags:'Bags',clothing:'Clothing',desk:'Desk',drinkware:'Drinkware',exhibition:'Exhibition',lifestyle:'Lifestyle',notebooks:'Notebooks',outdoor:'Outdoor',tech:'Tech',writing:'Writing'};

  // ---- catalogue data source mode: 'all' = incl. synthesised sample data · 'real' = live store-feed + imports only ----
  const PSKEY='ms-platform-settings';
  function pset(){ try{ return JSON.parse(localStorage.getItem(PSKEY)||'{}')||{}; }catch(e){ return {}; } }
  function srcMode(){ return pset().catalogueSource==='real'?'real':'all'; }
  function setSource(m){ const o=pset(); o.catalogueSource=(m==='real'?'real':'all'); try{ localStorage.setItem(PSKEY, JSON.stringify(o)); }catch(e){} DB=null; return srcMode(); }
  function breakdown(){ build(); let real=0,sample=0,imported=0; DB.forEach(p=>{ if(p.ingested)imported++; else if(p.real)real++; else sample++; }); return {real,sample,imported,total:DB.length,mode:srcMode()}; }
  function importedSuppliers(){ build(); const m={}; DB.forEach(p=>{ if(p.ingested)m[p.supplier]=(m[p.supplier]||0)+1; }); return Object.keys(m).sort().map(name=>({name,count:m[name]})); }

  let DB=null;
  function build(){
    if(DB) return DB;
    DB=[];
    // 1) real store-feed products (if loaded) — these are the "live" ones (suppressed in blank mode)
    try{ if(!(window.MSMODE&&MSMODE.isBlank()) && window.STORE&&Array.isArray(STORE.products)){ STORE.products.forEach(p=>{
      DB.push({ id:p.id, name:p.name, supplier:p.supplier||'Lumen Supplies', dept:DEPT_BY_STOREDEPT[p.dept]||'Tech', cat:p.cat||'',
        priceFrom:p.priceBreaks&&p.priceBreaks[p.priceBreaks.length-1]?p.priceBreaks[p.priceBreaks.length-1].unit:(p.priceGuide||0),
        moq:p.moq||50, lead:p.lead||10, sustainability:p.sustainability||7, colours:p.colours||[], methods:p.printMethods||[],
        real:true, _seed:p.id, created:dateFromSeed(p.id,540,90) });
    }); } }catch(e){}
    // 2) synthesised bulk per supplier (skipped in 'real imports only' mode AND blank mode)
    if(srcMode()!=='real' && !(window.MSMODE&&MSMODE.isBlank())) SUPPLIERS.forEach((sup,si)=>{
      const r=rng('cat-'+sup); const n=22+Math.floor(r()*10);
      for(let i=0;i<n;i++){
        const dept=DEPTS[Math.floor(r()*DEPTS.length)]; const bk=BANK[dept];
        const name=`${bk.adj[Math.floor(r()*bk.adj.length)]} ${bk.noun[Math.floor(r()*bk.noun.length)]}`;
        const price=Math.round((bk.lo+r()*(bk.hi-bk.lo))*100)/100;
        const cols=[]; const pool=[...COLOURS]; const nc=1+Math.floor(r()*4); for(let c=0;c<nc;c++)cols.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
        const meth=METHODS.filter(()=>r()>.55); 
        DB.push({ id:'cat-'+si+'-'+i, name, supplier:sup, dept, cat:bk.noun[Math.floor(r()*bk.noun.length)]+'s',
          priceFrom:price, moq:[25,50,100,250][Math.floor(r()*4)], lead:5+Math.floor(r()*14), sustainability:5+Math.floor(r()*6),
          colours:cols, methods:meth.length?meth:[METHODS[0]], real:false, _seed:'cat-'+si+'-'+i, created:dateFromSeed('cat-'+si+'-'+i,500,200) });
      }
    });
    // 3) usage stats (deterministic) — some never used, some heavily
    DB.forEach(p=>{ const r=rng('use-'+p._seed); const active=r()>.45; const projects=active?Math.floor(r()*14):0;
      const orders=projects?Math.floor(r()*projects):0; const units=orders?orders*(100+Math.floor(r()*2400)):0;
      p.usage={ projects, orders, units, lastUsed: projects?['this week','2 weeks ago','last month','3 months ago'][Math.floor(r()*4)]:'never' }; });
    // 4) operator-ingested products (real imported feeds) — persisted
    ingestedStore().forEach(p=>{ if(!DB.find(x=>x.id===p.id)){ p.usage=p.usage||{projects:0,orders:0,units:0,lastUsed:'never'}; if(!p.created) p.created=dateFromSeed(p._seed||p.id,400,150); if(!p.imported) p.imported=dateFromSeed('imp-'+(p._seed||p.id),120,90); DB.push(p); } });
    // admin department overrides win over feed-mapped departments
    { const dov=deptOverrides(); DB.forEach(p=>{ if(dov[p.id]) p.dept=dov[p.id]; }); }
    applyCurated();
    return DB;
  }

  /* ---------- operator-ingested products (real imported feeds, persisted) ---------- */
  const IKEY='ms-ingested-products';
  function ingestedStore(){ try{ return JSON.parse(localStorage.getItem(IKEY)||'[]')||[]; }catch(e){ return []; } }
  function ingestSave(arr){ try{ localStorage.setItem(IKEY, JSON.stringify(arr)); }catch(e){} }
  // add a batch of mapped products under a supplier; replaces any prior import from the same supplier
  function ingest(supplier, products){
    let store=ingestedStore().filter(p=>p.supplier!==supplier);
    products.forEach((p,i)=>{ const _seed='ing-'+supplier+'-'+(p.code||i); store.push(Object.assign({ supplier, real:false, ingested:true, _seed, id:_seed, imported:new Date().toISOString().slice(0,10), created:p.created||new Date().toISOString().slice(0,10) }, p)); });
    ingestSave(store); DB=null; return build().filter(p=>p.supplier===supplier).length;
  }
  function clearIngested(supplier){ ingestSave(supplier?ingestedStore().filter(p=>p.supplier!==supplier):[]); if(supplier){ const l=importLogAll().filter(r=>r.supplier!==supplier); try{ localStorage.setItem(LOGKEY, JSON.stringify(l)); }catch(e){} } DB=null; }
  // count / remove ingested products that have no image (optionally scoped to one supplier)
  function noImageCount(supplier){ return ingestedStore().filter(p=>(!supplier||p.supplier===supplier)&&!p.image).length; }
  function removeUnimaged(supplier){ const before=ingestedStore().length;
    ingestSave(ingestedStore().filter(p=>!((!supplier||p.supplier===supplier)&&!p.image))); DB=null; return before-ingestedStore().length; }
  // remove specific ingested products by id (live/sample products are untouched)
  function removeProducts(ids){ const set=new Set(ids||[]); const before=ingestedStore().length;
    ingestSave(ingestedStore().filter(p=>!set.has(p.id))); DB=null;
    try{ const c=JSON.parse(localStorage.getItem(CKEY)||'{}'); let ch=false; set.forEach(id=>{ if(c[id]){ delete c[id]; ch=true; } }); if(ch) saveCurated(c); }catch(e){}
    return before-ingestedStore().length; }

  /* ---------- import log (one record per import, kept under the supplier) ---------- */
  const LOGKEY='ms-import-log';
  function importLogAll(){ try{ return JSON.parse(localStorage.getItem(LOGKEY)||'[]')||[]; }catch(e){ return []; } }
  function logImport(supplier, meta){ const l=importLogAll(); l.unshift(Object.assign({supplier, at:new Date().toISOString()}, meta||{})); try{ localStorage.setItem(LOGKEY, JSON.stringify(l)); }catch(e){} }
  function importLog(supplier){ return importLogAll().filter(r=>!supplier||r.supplier===supplier); }

  /* ---------- curated range membership (persisted) ---------- */
  const CKEY='ms-curated-range';
  function curatedStore(){ let c; try{ c=JSON.parse(localStorage.getItem(CKEY)||'null'); }catch(e){} if(!c) c=seedCurated(); // migration: live store-feed products are always part of the curated baseline
    let changed=false; (DB||[]).forEach(p=>{ if(p.real && !c[p.id]){ c[p.id]={tier:'standard',listFee:25,promoFee:0,since:'2025'}; changed=true; } }); if(changed) saveCurated(c); return c; }
  function saveCurated(o){ try{ localStorage.setItem(CKEY, JSON.stringify(o)); }catch(e){} }
  // seed: ~30% of the DB pre-listed, a few promoted — so the curated range isn't empty on first load
  function seedCurated(){ const o={}; (DB||[]).forEach(p=>{ const r=rng('cur-'+p._seed)(); const force=p.real; if(force||r>.7){ const promo=r>.93; o[p.id]={ tier:promo?'spotlight':(r>.85?'featured':'standard'), listFee:promo?120:(r>.85?60:25), promoFee:promo?340:(r>.85?140:0), since:'2025' }; } }); return o; }
  function applyCurated(){ const c=curatedStore(); DB.forEach(p=>{ const m=c[p.id]; p.curated=!!m; p.curation=m||null; p.promoted=!!(m&&m.tier!=='standard'); }); }

  function all(){ return build(); }
  function get(id){ return build().find(p=>p.id===id); }
  function suppliers(){ build(); const m={}; DB.forEach(p=>m[p.supplier]=(m[p.supplier]||0)+1); return Object.keys(m).sort().map(name=>({name,count:m[name]})); }
  function depts(){ return DEPTS.slice(); }
  function curated(){ return build().filter(p=>p.curated); }
  function setCurated(id,opts){ build(); const c=curatedStore(); c[id]=Object.assign({tier:'standard',listFee:25,promoFee:0,since:'2026'},c[id],opts); saveCurated(c); applyCurated(); return get(id); }
  function removeCurated(id){ build(); const c=curatedStore(); delete c[id]; saveCurated(c); applyCurated(); }
  // batch versions — ONE localStorage write for large selections
  function setCuratedBulk(ids,opts){ build(); const c=curatedStore(); const base=Object.assign({tier:'standard',listFee:25,promoFee:0,since:'2026'},opts||{}); let n=0; (ids||[]).forEach(id=>{ if(!c[id]){ c[id]=Object.assign({},base); n++; } }); saveCurated(c); applyCurated(); return n; }
  function removeCuratedBulk(ids){ build(); const c=curatedStore(); let n=0; (ids||[]).forEach(id=>{ if(c[id]){ delete c[id]; n++; } }); saveCurated(c); applyCurated(); return n; }
  /* ---------- department overrides (admin move-to-department; persisted) ---------- */
  const DOKEY='ms-dept-overrides';
  function deptOverrides(){ try{ return JSON.parse(localStorage.getItem(DOKEY)||'{}')||{}; }catch(e){ return {}; } }
  function setDeptBulk(ids,dept){ if(!DEPTS.includes(dept)) return 0; const o=deptOverrides(); (ids||[]).forEach(id=>{ o[id]=dept; }); try{ localStorage.setItem(DOKEY, JSON.stringify(o)); }catch(e){} DB=null; return (ids||[]).length; }
  function stats(){ build(); return { products:DB.length, suppliers:suppliers().length, curated:DB.filter(p=>p.curated).length, promoted:DB.filter(p=>p.promoted).length }; }
  // revenue from curated listing + promotion fees (monthly)
  function curatedRevenue(){ build(); let list=0,promo=0; DB.forEach(p=>{ if(p.curation){ list+=+p.curation.listFee||0; promo+=+p.curation.promoFee||0; } }); return {list,promo,total:list+promo}; }

  /* ---------- distributor store range (per-distributor; persisted) ---------- */
  // mode: 'curated' (Merchsmith range as-is) | 'edited' (curated ± edits) | 'bespoke' (own list)
  const DKEY='ms-dist-range';
  function distConfig(){ try{ const c=JSON.parse(localStorage.getItem(DKEY)||'null'); if(c) return c; }catch(e){} return { mode:'curated', added:[], removed:[], bespoke:[] }; }
  function saveDist(c){ try{ localStorage.setItem(DKEY, JSON.stringify(c)); }catch(e){} }
  function setDistMode(m){ const c=distConfig(); c.mode=m; if(m==='bespoke'&&!c.bespoke.length){ /* seed bespoke from current curated so it's not empty */ c.bespoke=curated().map(p=>p.id); } saveDist(c); }
  function distInRange(id){ const c=distConfig(); if(c.mode==='bespoke') return c.bespoke.includes(id); const base=!!(get(id)&&get(id).curated); if(c.mode==='curated') return base; return (base||c.added.includes(id))&&!c.removed.includes(id); }
  function distToggle(id){ const c=distConfig(); const p=get(id); if(!p) return; if(c.mode==='bespoke'){ const i=c.bespoke.indexOf(id); if(i>=0)c.bespoke.splice(i,1); else c.bespoke.push(id); }
    else if(c.mode==='edited'){ const inNow=distInRange(id); if(inNow){ if(p.curated){ if(!c.removed.includes(id))c.removed.push(id); } c.added=c.added.filter(x=>x!==id); } else { c.removed=c.removed.filter(x=>x!==id); if(!p.curated&&!c.added.includes(id))c.added.push(id); } }
    saveDist(c); }
  function distRange(){ return build().filter(p=>distInRange(p.id)); }
  function distStats(){ const c=distConfig(); const r=distRange(); return { mode:c.mode, count:r.length, added:c.added.length, removed:c.removed.length, bespoke:c.bespoke.length }; }

  return { all, get, suppliers, depts, curated, setCurated, removeCurated, setCuratedBulk, removeCuratedBulk, setDeptBulk, stats, curatedRevenue, DEPTS, METHODS,
    distConfig, setDistMode, distInRange, distToggle, distRange, distStats,
    ingest, clearIngested, logImport, importLog, noImageCount, removeUnimaged, removeProducts,
    source:srcMode, setSource, breakdown, importedSuppliers };
})();
