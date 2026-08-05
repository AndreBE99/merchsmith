/* ============================================================
   ms-brands.js — admin-managed brand tags for store products.
   A brand list (admin-curated) + per-product brand assignment.
   Drives the store's "Brand" filter. Persisted to localStorage.

   window.MSBRANDS:
     list()                 → [brandName,…]
     add(name)/remove(name)/rename(old,new)
     brandOf(productId)     → brandName | ''
     setBrand(id, brand)    → tag one product ('' clears)
     setBrandBulk(ids, brand)
     productsTagged(brand)  → [productId,…]
   ============================================================ */
window.MSBRANDS = (function(){
  const LKEY='ms-brand-list', TKEY='ms-product-brands';
  // sensible seed of common promo-merch brands
  const SEED=['Stanley','Chilly\u2019s','Moleskine','BIC','Parker','Senator','Yeti','Adidas','Regatta','Karst','Ocean Bottle','Xoopar'];

  function list(){ try{ const a=JSON.parse(localStorage.getItem(LKEY)||'null'); if(Array.isArray(a)) return a; }catch(e){} saveList(SEED.slice()); return SEED.slice(); }
  function saveList(a){ try{ localStorage.setItem(LKEY, JSON.stringify(a)); }catch(e){} }
  function tags(){ try{ return JSON.parse(localStorage.getItem(TKEY)||'{}')||{}; }catch(e){ return {}; } }
  function saveTags(o){ try{ localStorage.setItem(TKEY, JSON.stringify(o)); }catch(e){} }

  function add(name){ name=(name||'').trim(); if(!name) return; const a=list(); if(!a.some(x=>x.toLowerCase()===name.toLowerCase())){ a.push(name); a.sort((x,y)=>x.localeCompare(y)); saveList(a); } }
  function remove(name){ saveList(list().filter(x=>x!==name)); const t=tags(); Object.keys(t).forEach(k=>{ if(t[k]===name) delete t[k]; }); saveTags(t); }
  function rename(oldN,newN){ newN=(newN||'').trim(); if(!newN) return; saveList(list().map(x=>x===oldN?newN:x)); const t=tags(); Object.keys(t).forEach(k=>{ if(t[k]===oldN) t[k]=newN; }); saveTags(t); }

  function brandOf(id){ return tags()[id]||''; }
  function setBrand(id, brand){ const t=tags(); if(brand) t[id]=brand; else delete t[id]; saveTags(t); }
  function setBrandBulk(ids, brand){ const t=tags(); ids.forEach(id=>{ if(brand) t[id]=brand; else delete t[id]; }); saveTags(t); }
  function productsTagged(brand){ const t=tags(); return Object.keys(t).filter(k=>t[k]===brand); }

  return { list, add, remove, rename, brandOf, setBrand, setBrandBulk, productsTagged };
})();
