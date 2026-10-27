/* ============================================================
   ms-tags.js — admin-managed product tags.

   Unlike brands (exactly one per product), a product may carry
   MANY tags: merchandising labels like "Best seller", "New in",
   "Eco choice", "Gift set". Admin owns the tag list; assignment
   is per product. Persisted to localStorage.

   window.MSTAGS:
     list()                  → [tagName,…]
     add(name) / remove(name) / rename(old,new)
     tagsOf(productId)       → [tagName,…]
     has(productId, tag)     → boolean
     toggle(productId, tag)  → boolean (new state)
     setTags(id, [tags])
     addBulk(ids, tag) / removeBulk(ids, tag)
     productsTagged(tag)     → [productId,…]
     counts()                → { tag: n }
   ============================================================ */
window.MSTAGS = (function(){
  const LKEY='ms-tag-list', TKEY='ms-product-tags';
  const SEED=['Best seller','New in','Eco choice','Gift set','Premium','Budget','Quick turnaround','Exhibition','Staff gift','Limited stock'];

  function list(){ try{ const a=JSON.parse(localStorage.getItem(LKEY)||'null'); if(Array.isArray(a)) return a; }catch(e){}
    saveList(SEED.slice()); return SEED.slice(); }
  function saveList(a){ try{ localStorage.setItem(LKEY,JSON.stringify(a)); }catch(e){} }
  function map(){ try{ return JSON.parse(localStorage.getItem(TKEY)||'{}')||{}; }catch(e){ return {}; } }
  function saveMap(o){ try{ localStorage.setItem(TKEY,JSON.stringify(o)); }catch(e){} }

  function add(name){ name=(name||'').trim(); if(!name) return;
    const a=list(); if(!a.some(x=>x.toLowerCase()===name.toLowerCase())){ a.push(name); a.sort((x,y)=>x.localeCompare(y)); saveList(a); } }
  function remove(name){ saveList(list().filter(x=>x!==name));
    const m=map(); Object.keys(m).forEach(k=>{ m[k]=(m[k]||[]).filter(t=>t!==name); if(!m[k].length) delete m[k]; }); saveMap(m); }
  function rename(oldN,newN){ newN=(newN||'').trim(); if(!newN) return;
    saveList(list().map(x=>x===oldN?newN:x));
    const m=map(); Object.keys(m).forEach(k=>{ m[k]=(m[k]||[]).map(t=>t===oldN?newN:t); }); saveMap(m); }

  function tagsOf(id){ const v=map()[id]; return Array.isArray(v)?v:[]; }
  function has(id,tag){ return tagsOf(id).indexOf(tag)>-1; }
  function setTags(id,arr){ const m=map(); if(arr&&arr.length) m[id]=arr.slice(); else delete m[id]; saveMap(m); }
  function toggle(id,tag){ const m=map(); const cur=Array.isArray(m[id])?m[id]:[];
    const i=cur.indexOf(tag); if(i>-1) cur.splice(i,1); else cur.push(tag);
    if(cur.length) m[id]=cur; else delete m[id]; saveMap(m); return i<0; }
  function addBulk(ids,tag){ const m=map(); let n=0;
    ids.forEach(id=>{ const cur=Array.isArray(m[id])?m[id]:[]; if(cur.indexOf(tag)<0){ cur.push(tag); m[id]=cur; n++; } }); saveMap(m); return n; }
  function removeBulk(ids,tag){ const m=map(); let n=0;
    ids.forEach(id=>{ const cur=Array.isArray(m[id])?m[id]:[]; const i=cur.indexOf(tag);
      if(i>-1){ cur.splice(i,1); n++; if(cur.length) m[id]=cur; else delete m[id]; } }); saveMap(m); return n; }
  function productsTagged(tag){ const m=map(); return Object.keys(m).filter(k=>(m[k]||[]).indexOf(tag)>-1); }
  function counts(){ const m=map(), o={}; Object.keys(m).forEach(k=>(m[k]||[]).forEach(t=>{ o[t]=(o[t]||0)+1; })); return o; }

  /* ---------- one-time demo seeding ----------
     Tags only mean anything once products carry them, so assign a realistic spread
     from the product's own attributes (deterministic — same products every load).
     Runs once; the flag stops it fighting the operator's own edits afterwards. */
  const SKEY='ms-tags-seeded-v2';
  function seedAssign(){
    if(!window.MSCAT||!MSCAT.all) return false;
    try{ if(localStorage.getItem(SKEY)) return false; }catch(e){ return false; }
    const all=MSCAT.all(); if(!all.length) return false;
    // v2 replaces the v1 spread outright rather than stacking on top of it
    const m={};
    const put=(id,tag)=>{ const cur=Array.isArray(m[id])?m[id]:[]; if(cur.indexOf(tag)<0){ cur.push(tag); m[id]=cur; } };
    // stable pseudo-random from the id, so the spread looks hand-made but never shifts
    const h=s=>{ let x=7; for(const c of String(s)) x=(x*31+c.charCodeAt(0))>>>0; return x; };
    all.forEach(p=>{
      const r=h(p.id)%100;
      if(p.promoted) put(p.id,'Best seller');
      else if(p.curated&&r<18) put(p.id,'Best seller');
      if(((p.sustainability||0)>=4||/recycl|organic|bamboo|rpet|grs/i.test(p.material||''))&&r<12) put(p.id,'Eco choice');
      if(p.priceFrom>=18&&r<40) put(p.id,'Premium'); else if(p.priceFrom&&p.priceFrom<=2.5&&r<10) put(p.id,'Budget');
      if(p.lead&&p.lead<=7&&r<25) put(p.id,'Quick turnaround');
      if(p.new||r>96) put(p.id,'New in');
      if(/bag|lanyard|pen|notebook/i.test(p.name||'')&&r%7===0) put(p.id,'Exhibition');
      if(/mug|bottle|hoodie|tee|t-shirt/i.test(p.name||'')&&r%9===0) put(p.id,'Staff gift');
      if((p.stock!=null&&p.stock>0&&p.stock<150)) put(p.id,'Limited stock');
      if(/set|kit|pack/i.test(p.name||'')&&r%5===0) put(p.id,'Gift set');
    });
    saveMap(m);
    try{ localStorage.setItem(SKEY,'1'); }catch(e){}
    return true;
  }
  // catalogue loads asynchronously on some pages, so retry briefly
  (function boot(n){ if(seedAssign()) return; if((n||0)<25) setTimeout(()=>boot((n||0)+1),150); })(0);

  return { list, add, remove, rename, tagsOf, has, setTags, toggle, addBulk, removeBulk, productsTagged, counts, seedAssign };
})();
