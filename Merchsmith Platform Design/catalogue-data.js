/* ============================================================
   catalogue-data.js — the shared Merchsmith product database.
   Single source of truth for the master catalogue, read by BOTH
   the platform admin and the distributor store.

   = real store-feed.js products (when present)  +  synthesised
   bulk across all suppliers. Recommended-range membership + usage
   stats persist in localStorage so every surface agrees.

   window.MSCAT API:
     all()            → every product in the database
     get(id)          → one product
     suppliers()      → [{name, count}]
     depts()          → [dept,…]
     curated()        → products in the Merchsmith Recommended range
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
  function build(){ const set=archivedSet(); return buildAll().filter(p=>!set.has(p.id)); }
  function buildAll(){
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
  /* ---------- archive (reversible; replaced hard delete, Sep 2026) ----------
     An archived product stays in the database but is hidden from every normal view,
     the store and distributor ranges. Restoring puts it straight back. */
  const AKEY='ms-archived';
  function archivedIds(){ try{ return JSON.parse(localStorage.getItem(AKEY)||'[]')||[]; }catch(e){ return []; } }
  function archivedSet(){ return new Set(archivedIds()); }
  function saveArchived(a){ try{ localStorage.setItem(AKEY,JSON.stringify([...new Set(a)])); }catch(e){} DB=null; }
  function archiveProducts(ids){ const add=(ids||[]).filter(Boolean); saveArchived(archivedIds().concat(add));
    try{ const cu=JSON.parse(localStorage.getItem(CKEY)||'{}'); let ch=false;
      add.forEach(id=>{ if(cu[id]){ delete cu[id]; ch=true; } });   // archived ⇒ out of the recommended range
      if(ch) saveCurated(cu); }catch(e){}
    return add.length; }
  function restoreProducts(ids){ const set=new Set(ids||[]); const before=archivedIds().length;
    saveArchived(archivedIds().filter(id=>!set.has(id))); return before-archivedIds().length; }
  function isArchived(id){ return archivedSet().has(id); }
  function archivedProducts(){ const set=archivedSet(); return buildAll().filter(p=>set.has(p.id)); }

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

  /* ---------- recommended range membership (persisted) ---------- */
  const CKEY='ms-curated-range';
  function curatedStore(){ let c; try{ c=JSON.parse(localStorage.getItem(CKEY)||'null'); }catch(e){} if(!c) c=seedCurated(); // migration: live store-feed products are always part of the recommended baseline
    let changed=false; (DB||[]).forEach(p=>{ if(p.real && !c[p.id]){ c[p.id]={tier:'standard',since:'2025'}; changed=true; } }); if(changed) saveCurated(c); return c; }

  /* ---------- approved supplier relationships (distributor scope) ----------
     A distributor may only stock suppliers they have an approved relationship with.
     Everything else in the master catalogue is invisible to them — they never browse
     the full unconnected-supplier catalogue. Persisted so it survives a reload. */
  const DSKEY='ms-dist-suppliers';
  function distSuppliers(){
    let v=null; try{ v=JSON.parse(localStorage.getItem(DSKEY)||'null'); }catch(e){}
    if(!Array.isArray(v)){
      // Seed a realistic relationship set: the suppliers with a live imported feed, plus
      // anyone already supplying a recommended product. Smaller unconnected suppliers stay
      // out, so the scoping rule is visible rather than theoretical.
      const big=suppliers().filter(s=>s.count>=10).map(s=>s.name);
      const rec=all().filter(p=>p.curated).map(p=>p.supplier);
      v=[...new Set(big.concat(rec))].filter(n=>n);
      if(v.length<2) v=suppliers().map(s=>s.name);          // never leave them with nothing
      try{ localStorage.setItem(DSKEY,JSON.stringify(v)); }catch(e){}
    }
    return v;
  }
  function setDistSuppliers(list){ try{ localStorage.setItem(DSKEY,JSON.stringify(list||[])); }catch(e){} }
  function distSupplierOk(name){ return distSuppliers().indexOf(name)>-1; }
  // the only pool a distributor can add from
  function distCatalogue(){ const ok=distSuppliers(); return all().filter(p=>ok.indexOf(p.supplier)>-1); }

  /* ---------- placement pricing ----------
     ONE fee per product per month, set by its tier. The tier rates are global and
     editable (Admin → Recommended range); an individual product can override its
     own fee, which then ignores the global rate until it is cleared. */
  const RKEY='ms-cur-rates';
  const RATE_DEF={standard:5,featured:60};
  function curRates(){ let r=null; try{ r=JSON.parse(localStorage.getItem(RKEY)||'null'); }catch(e){}
    return Object.assign({},RATE_DEF,r||{}); }
  function setCurRates(o){ const r=Object.assign(curRates(),o||{});
    try{ localStorage.setItem(RKEY,JSON.stringify(r)); }catch(e){} applyCurated(); return r; }
  // effective monthly fee: per-product override if set, otherwise the tier's global rate
  function feeFor(p){ const m=p&&(p.curation||p); if(!m) return 0;
    if(m.fee!=null&&m.fee!=='') return +m.fee||0;
    const r=curRates(); return +r[m.tier||'standard']||0; }
  function saveCurated(o){ try{ localStorage.setItem(CKEY, JSON.stringify(o)); }catch(e){} }
  // seed: ~30% of the DB pre-listed, a few promoted — so the recommended range isn't empty on first load
  function seedCurated(){ const o={}; const back=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
    (DB||[]).forEach(p=>{ const r=rng('cur-'+p._seed)(); const force=p.real; if(force||r>.7){
      const days=40+Math.floor(r*300), added=back(days);
      // a handful sit unapproved so the supplier's approval queue isn't empty on first load
      const pending=!force&&r>.66&&r<.685;
      o[p.id]={ tier:(r>.85?'featured':'standard'), since:'2025',
        approval:pending?'pending':'approved', requestedAt:back(days+3),
        addedAt:pending?undefined:added,
        history:[{at:back(days+3),act:'proposed',tier:(r>.85?'featured':'standard')}].concat(
          pending?[]:[{at:added,act:'approved',tier:(r>.85?'featured':'standard')}]) };
    } }); return o; }
  // Sep 2026, two migrations in one pass:
  //  · the Spotlight tier was retired — anything saved on it folds up into Featured;
  //  · placement moved from a listing fee + a separate promotion fee to ONE fee driven by
  //    global tier rates, so the old per-product listFee/promoFee pair is dropped.
  function migrateTiers(o){ let ch=false;
    Object.keys(o||{}).forEach(k=>{ const m=o[k]; if(!m) return;
      if(m.tier==='spotlight'){ m.tier='featured'; ch=true; }
      if('listFee' in m||'promoFee' in m){ delete m.listFee; delete m.promoFee; ch=true; }
      if(!m.approval){ m.approval='approved'; ch=true; }
      if(m.approval==='approved'&&!m.addedAt){ m.addedAt=m.requestedAt||new Date(Date.now()-90*86400000).toISOString(); ch=true; }
      if('minUntil' in m){ delete m.minUntil; ch=true; } });
    if(ch) saveCurated(o); return o; }
  const SEEDK='ms-cur-lifecycle-seeded';
  function seedLifecycle(c){
    try{ if(localStorage.getItem(SEEDK)) return c; }catch(e){ return c; }
    const ids=Object.keys(c); if(!ids.length) return c;
    const back=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
    // four proposals still waiting on their supplier
    ids.filter((id,i)=>i%157===3).slice(0,4).forEach((id,i)=>{
      c[id]=Object.assign({},c[id],{approval:'pending',requestedAt:back(2+i*3),addedAt:undefined,
        history:[{at:back(2+i*3),act:'proposed',tier:c[id].tier}]});
      logChange(id,'proposed',c[id]);
    });
    // and a few recent removals, one still inside its minimum month
    const rm=ids.filter((id,i)=>i%211===7).slice(0,3);
    rm.forEach((id,i)=>{ const m=c[id]; const e=logChange(id,'removed',m);
      e.at=back(3+i*9); { const d=new Date(e.at); d.setMonth(d.getMonth()+1); e.billedTo=d.toISOString(); }
      const l=curLog(); l[0]=e; try{ localStorage.setItem(LKEY,JSON.stringify(l)); }catch(err){}
      delete c[id]; });
    saveCurated(c);
    try{ localStorage.setItem(SEEDK,'1'); }catch(e){}
    return c;
  }
  function applyCurated(){ const c=seedLifecycle(migrateTiers(curatedStore())); DB.forEach(p=>{ const m=c[p.id];
    p.curated=!!(m&&m.approval!=='declined'); p.curation=m||null;
    // only an approved placement earns promoted treatment in the store
    p.promoted=!!(m&&m.tier!=='standard'&&m.approval==='approved'); }); }

  function all(){ return build(); }
  function get(id){ return build().find(p=>p.id===id); }
  function suppliers(){ build(); const m={}; DB.forEach(p=>m[p.supplier]=(m[p.supplier]||0)+1); return Object.keys(m).sort().map(name=>({name,count:m[name]})); }
  function depts(){ return DEPTS.slice(); }
  function curated(){ return build().filter(p=>p.curated); }
  function setCurated(id,opts,replace){ build(); const c=curatedStore();
    const prev=c[id];
    c[id]=replace ? Object.assign({tier:'standard',since:'2026'},opts)
                  : Object.assign({tier:'standard',since:'2026'},c[id],opts);
    stamp(c[id],prev,id);
    saveCurated(c); applyCurated(); return get(id); }
  function removeCurated(id){ build(); const c=curatedStore(); const m=c[id]; if(!m) return;
    logChange(id,'removed',m); delete c[id]; saveCurated(c); applyCurated(); }
  // batch versions — ONE localStorage write for large selections
  function setCuratedBulk(ids,opts,force){ build(); const c=curatedStore(); const base=Object.assign({tier:'standard',since:'2026'},opts||{}); let n=0;
    (ids||[]).forEach(id=>{
      if(!c[id]){ c[id]=Object.assign({},base); stamp(c[id],null,id); n++; return; }
      if(force&&opts&&opts.tier&&c[id].tier!==opts.tier){ c[id].tier=opts.tier; logChange(id,'tier',c[id]); n++; }
    }); saveCurated(c); applyCurated(); return n; }
  function removeCuratedBulk(ids){ build(); const c=curatedStore(); let n=0;
    (ids||[]).forEach(id=>{ if(c[id]){ logChange(id,'removed',c[id]); delete c[id]; n++; } }); saveCurated(c); applyCurated(); return n; }

  /* ---------- placement lifecycle: approval, dates, minimum charge ----------
     A product does not simply appear in the range. Merchsmith proposes it, the
     supplier approves the placement and its charge, and only then does it go live.
     Every state change is stamped on the record AND written to a shared change log
     (ms-cur-log) — the record is deleted on removal, so the log is what distributors
     and suppliers read afterwards.
     Billing runs in WHOLE months, and withdrawing costs one further whole month — pull a
     product half way through its third month and four months are charged. */
  const LKEY='ms-cur-log', MINDAYS=30;
  const nowISO=()=>new Date().toISOString();
  function addMonth(iso){ const d=new Date(iso||Date.now()); d.setMonth(d.getMonth()+1); return d.toISOString(); }
  function curLog(){ try{ return JSON.parse(localStorage.getItem(LKEY)||'[]')||[]; }catch(e){ return []; } }
  function logChange(id,act,m){
    const p=(DB||[]).find(x=>x.id===id)||{};
    const e={at:nowISO(),id,name:p.name||id,supplier:p.supplier||'',act,tier:(m&&m.tier)||'standard'};
    if(act==='removed'){ e.billedTo=addMonth(nowISO()); }   // one further whole month
    const l=curLog(); l.unshift(e);
    try{ localStorage.setItem(LKEY,JSON.stringify(l.slice(0,400))); }catch(err){}
    return e;
  }
  // record dates + history on a curation entry as it changes
  function stamp(m,prev,id){
    m.history=Array.isArray(m.history)?m.history:[];
    if(!prev){                                     // brand new placement
      m.requestedAt=m.requestedAt||nowISO();
      if(!m.approval) m.approval='pending';
      m.history.push({at:nowISO(),act:'proposed',tier:m.tier});
      logChange(id,'proposed',m);
    } else {
      if(prev.tier!==m.tier){ m.history.push({at:nowISO(),act:'tier',tier:m.tier}); logChange(id,'tier',m); }
      if(prev.approval!==m.approval&&m.approval){ m.history.push({at:nowISO(),act:m.approval,tier:m.tier}); logChange(id,m.approval,m); }
      ['requestedAt','history','addedAt','minUntil','approval'].forEach(k=>{ if(m[k]===undefined&&prev[k]!==undefined) m[k]=prev[k]; });
    }
    // going live starts the billing clock
    if(m.approval==='approved'&&!m.addedAt){ m.addedAt=nowISO(); }
    return m;
  }
  function approveCurated(id,by){ const c=curatedStore(); const m=c[id]; if(!m) return null;
    return setCurated(id,Object.assign({},m,{approval:'approved',decidedAt:nowISO(),decidedBy:by||'Supplier'})); }
  function declineCurated(id,reason){ const c=curatedStore(); const m=c[id]; if(!m) return null;
    return setCurated(id,Object.assign({},m,{approval:'declined',decidedAt:nowISO(),declineReason:reason||''})); }
  function pendingCurated(){ return build().filter(p=>p.curation&&p.curation.approval==='pending'); }
  // whole months elapsed since go-live, rounded up — the number billed so far
  function monthsBilled(p){ const m=p&&(p.curation||p); if(!m||!m.addedAt) return 0;
    const a=new Date(m.addedAt), n=new Date();
    let mo=(n.getFullYear()-a.getFullYear())*12+(n.getMonth()-a.getMonth());
    if(n.getDate()>=a.getDate()) mo+=1;                    // part month charged in full
    return Math.max(1,mo); }
  // a withdrawn product keeps billing to the end of its extra whole month
  function minChargeActive(p){ const m=p&&(p.curation||p); return !!(m&&m.billedTo&&new Date(m.billedTo)>new Date()); }
  function liveCurated(){ return build().filter(p=>p.curation&&p.curation.approval==='approved'); }
  /* ---------- department overrides (admin move-to-department; persisted) ---------- */
  const DOKEY='ms-dept-overrides';
  function deptOverrides(){ try{ return JSON.parse(localStorage.getItem(DOKEY)||'{}')||{}; }catch(e){ return {}; } }
  function setDeptBulk(ids,dept){ if(!DEPTS.includes(dept)) return 0; const o=deptOverrides(); (ids||[]).forEach(id=>{ o[id]=dept; }); try{ localStorage.setItem(DOKEY, JSON.stringify(o)); }catch(e){} DB=null; return (ids||[]).length; }
  function stats(){ build(); return { products:DB.length, suppliers:suppliers().length, curated:DB.filter(p=>p.curated).length, promoted:DB.filter(p=>p.promoted).length }; }
  // monthly placement revenue, split by tier
  function curatedRevenue(){ build(); let std=0,feat=0;
    DB.forEach(p=>{ if(!p.curation||p.curation.approval!=='approved') return;
      const f=feeFor(p); if(p.curation.tier==='featured') feat+=f; else std+=f; });
    // withdrawn products bill one further whole month
    curLog().filter(e=>e.act==='removed'&&e.billedTo&&new Date(e.billedTo)>new Date()).forEach(e=>{
      const r=curRates(); const f=+r[e.tier]||0; if(e.tier==='featured') feat+=f; else std+=f; });
    return {standard:std,featured:feat,list:std,promo:feat,total:std+feat}; }

  /* ---------- distributor store range (per-distributor; persisted) ---------- */
  // mode: 'curated' (Merchsmith range as-is) | 'edited' (recommended ± edits) | 'bespoke' (own list)
  const DKEY='ms-dist-range';
  function distConfig(){ try{ const c=JSON.parse(localStorage.getItem(DKEY)||'null'); if(c) return c; }catch(e){} return { mode:'curated', added:[], removed:[], bespoke:[] }; }
  function saveDist(c){ try{ localStorage.setItem(DKEY, JSON.stringify(c)); }catch(e){} }
  function setDistMode(m){ const c=distConfig(); c.mode=m; if(m==='bespoke'&&!c.bespoke.length){ /* seed bespoke from current curated so it's not empty */ c.bespoke=curated().map(p=>p.id); } saveDist(c); }
  function distInRange(id){ const c=distConfig(); if(c.mode==='bespoke') return c.bespoke.includes(id); const base=!!(get(id)&&get(id).curated); if(c.mode==='curated') return base; return (base||c.added.includes(id))&&!c.removed.includes(id); }
  function distToggle(id){ const c=distConfig(); const p=get(id); if(!p) return;
    c.addedOn=c.addedOn||{};
    const wasIn=distInRange(id);
    if(c.mode==='bespoke'){ const i=c.bespoke.indexOf(id); if(i>=0)c.bespoke.splice(i,1); else c.bespoke.push(id); }
    else if(c.mode==='edited'){ const inNow=distInRange(id); if(inNow){ if(p.curated){ if(!c.removed.includes(id))c.removed.push(id); } c.added=c.added.filter(x=>x!==id); } else { c.removed=c.removed.filter(x=>x!==id); if(!p.curated&&!c.added.includes(id))c.added.push(id); } }
    if(!wasIn) c.addedOn[id]=nowISO(); else delete c.addedOn[id];   // stamp on add, clear on remove
    saveDist(c); }
  // the date this distributor put the product into their own range (own additions only —
  // products inherited from the Recommended range were not "added by you")
  function distAddedOn(id){ const c=distConfig();
    if(!c.addedOn){ // backfill once so seeded ranges are not blank
      c.addedOn={}; const own=(c.mode==='bespoke'?c.bespoke:c.added)||[];
      own.forEach(x=>{ const d=new Date(); d.setDate(d.getDate()-(10+(Math.abs([...String(x)].reduce((h,ch)=>h*31+ch.charCodeAt(0),7))%140)));
        c.addedOn[x]=d.toISOString(); });
      saveDist(c);
    }
    return c.addedOn[id]||null; }
  function distRange(){ return build().filter(p=>distInRange(p.id)); }
  function distStats(){ const c=distConfig(); const r=distRange(); return { mode:c.mode, count:r.length, added:c.added.length, removed:c.removed.length, bespoke:c.bespoke.length }; }

  return { all, get, suppliers, depts, curated, feeFor, curRates, setCurRates, RATE_DEF,
    curLog, approveCurated, declineCurated, pendingCurated, liveCurated, minChargeActive, monthsBilled, MINDAYS, setCurated, removeCurated, setCuratedBulk, removeCuratedBulk, setDeptBulk, stats, curatedRevenue, DEPTS, METHODS,
    distConfig, setDistMode, distInRange, distToggle, distRange, distStats, distAddedOn,
    distSuppliers, setDistSuppliers, distSupplierOk, distCatalogue,
    ingest, clearIngested, logImport, importLog, noImageCount, removeUnimaged, removeProducts,
    archiveProducts, restoreProducts, archivedProducts, archivedIds, isArchived,
    source:srcMode, setSource, breakdown, importedSuppliers };
})();
