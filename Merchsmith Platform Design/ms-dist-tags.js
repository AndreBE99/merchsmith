/* ============================================================
   ms-dist-tags.js — the DISTRIBUTOR's own product tags.

   Deliberately separate from MSTAGS (Merchsmith's platform tags):
   a distributor organises their own range — "Christmas 2026",
   "Client favourites" — without being able to edit the labels
   Merchsmith applies across every store. Same rule as department
   and sub-category: read Merchsmith's, own your own.

   window.MSDTAGS: same shape as MSTAGS.
   ============================================================ */
window.MSDTAGS = (function(){
  const LKEY='ms-dist-tag-list', TKEY='ms-dist-product-tags';
  const SEED=['Client favourite','Christmas','Onboarding pack','High margin','Fast mover'];

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

  return { list, add, remove, rename, tagsOf, has, toggle, addBulk, removeBulk, productsTagged, counts };
})();
