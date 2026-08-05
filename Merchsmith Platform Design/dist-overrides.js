/* ============================================================
   dist-overrides.js — distributor per-product data overrides.
   Layered ON TOP of the feed at read time: the original feed
   data is never mutated and stays viewable next to each field.
   Storage: localStorage('ms-product-overrides') =
     { [productId]: { fields:{key:value}, updated:'stamp' } }
   window.MSOV:
     FIELDS               → group/field registry (all overridable fields)
     get(id)              → {fields,updated} | {}
     val(id,key)          → override value or undefined
     set(id,key,val)      → write one override ('' / null clears)
     clear(id,key)        → remove one override
     clearAll(id)         → remove every override for the product
     count(id)            → number of overridden fields
     apply(p)             → overlay overrides onto a store-shaped
                            product (captures p._feed first so the
                            original values stay displayable)
   ============================================================ */
window.MSOV=(function(){
  const KEY='ms-product-overrides';
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } }
  function save(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }

  // Every overridable field. audience: 'customer' (shows in the storefront)
  // or 'dist' (distributor view only). type drives the editor control.
  const FIELDS=[
    {group:'Product content', fields:[
      {k:'name',     label:'Product name',    type:'text',     aud:'customer'},
      {k:'blurb',    label:'Description',     type:'textarea', aud:'customer'},
      {k:'imgUrl',   label:'Image',           type:'img',      aud:'customer'},
      {k:'brand',    label:'Brand',           type:'text',     aud:'customer'},
      {k:'cat',      label:'Category label',  type:'text',     aud:'customer'},
      {k:'material', label:'Material',        type:'text',     aud:'customer'},
      {k:'colours',  label:'Colours',         type:'csv',      aud:'customer'},
      {k:'sizes',    label:'Variants / sizes',type:'csv',      aud:'customer'},
      {k:'gender',   label:'Gender',          type:'text',     aud:'customer'},
      {k:'dimensions',label:'Dimensions',     type:'text',     aud:'customer'},
      {k:'video',    label:'Video URL',       type:'text',     aud:'customer'},
      {k:'story1',   label:'Story quote 1',   type:'textarea', aud:'customer'},
      {k:'story2',   label:'Story quote 2',   type:'textarea', aud:'customer'}
    ]},
    {group:'Sustainability & origin', fields:[
      {k:'sustainability', label:'Eco score (0–10)', type:'number', aud:'customer'},
      {k:'origin',         label:'Country of origin', type:'text',  aud:'customer'},
      {k:'certifications', label:'Certifications',    type:'csv',   aud:'customer'}
    ]},
    {group:'Commercial', fields:[
      {k:'moq',  label:'Minimum order qty', type:'number', aud:'customer'},
      {k:'lead', label:'Lead time (days)',  type:'number', aud:'customer'}
    ]},
    {group:'Internal — never shown to customers', fields:[
      {k:'alias',  label:'Internal name / alias', type:'text',     aud:'dist'},
      {k:'notes',  label:'Internal notes',        type:'textarea', aud:'dist'},
      {k:'model',  label:'Item code / SKU',       type:'text',     aud:'dist'},
      {k:'ean',    label:'EAN',                   type:'text',     aud:'dist'},
      {k:'hsCode', label:'HS code',               type:'text',     aud:'dist'},
      {k:'weightGr',label:'Weight (g)',           type:'number',   aud:'dist'}
    ]}
  ];
  const ALLKEYS=FIELDS.flatMap(g=>g.fields.map(f=>f.k));
  const DEF=k=>FIELDS.flatMap(g=>g.fields).find(f=>f.k===k);

  function get(id){ return load()[id]||{}; }
  function val(id,key){ const f=get(id).fields; return f?f[key]:undefined; }
  function set(id,key,v){
    const o=load(); const rec=o[id]=o[id]||{fields:{}}; rec.fields=rec.fields||{};
    const empty=(v==null)||(typeof v==='string'&&!v.trim())||(Array.isArray(v)&&!v.length);
    if(empty) delete rec.fields[key]; else rec.fields[key]=v;
    rec.updated=new Date().toLocaleDateString('en-GB');
    if(!Object.keys(rec.fields).length) delete o[id];
    save(o);
  }
  function clear(id,key){ set(id,key,null); }
  function clearAll(id){ const o=load(); delete o[id]; save(o); }
  function count(id){ const f=get(id).fields; return f?Object.keys(f).length:0; }

  // cast a stored override into the product-shape type
  function cast(def,v){
    if(def.type==='number'){ const n=parseFloat(v); return isNaN(n)?null:n; }
    if(def.type==='csv') return Array.isArray(v)?v:String(v).split(',').map(s=>s.trim()).filter(Boolean);
    return v;
  }
  function apply(p){
    const rec=get(p.id); const f=rec.fields||{}; const keys=Object.keys(f);
    if(!p._feed){ p._feed={}; ALLKEYS.forEach(k=>{ p._feed[k]=p[k]; }); } // capture originals once
    // reset to feed first (so cleared overrides fall back live)
    ALLKEYS.forEach(k=>{ if(p._feed && k in p._feed && p._feed[k]!==undefined) p[k]=p._feed[k]; });
    keys.forEach(k=>{ const def=DEF(k); if(!def) return; const v=cast(def,f[k]); if(v!=null) p[k]=v; });
    p._ovCount=keys.length; p._ovUpdated=rec.updated||'';
    return p;
  }

  return { FIELDS, get, val, set, clear, clearAll, count, apply };
})();
