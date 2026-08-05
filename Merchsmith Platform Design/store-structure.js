/* ============================================================
   store-structure.js — shared store taxonomy (sections + departments).
   Single source of truth read by BOTH the Merchsmith Admin (to
   create / edit / delete / reorder) and the customer store (to
   render the top nav + department grid as live links).
   Persists to localStorage('ms-store-structure').

   window.MSSTORE:
     sections()                  → [{id,name,intro,deptIds:[]}]
     departments()               → [{id,name,img,blurb}] (flat, ordered)
     section(id) / department(id)
     deptsOf(sectionId)          → departments in that section (ordered)
     sectionOfDept(deptId)
     addSection/updateSection/deleteSection/moveSection
     addDepartment/updateDepartment/deleteDepartment/moveDepartment
     assignDept(deptId, sectionId)
     reset()
   ============================================================ */
window.MSSTORE = (function(){
  const KEY='ms-store-structure';
  const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||('x'+Date.now());

  // seed: real departments from store-feed all under Essentials; the other nav tabs as real (empty) sections
  function seed(){
    const deps = (window.STORE&&STORE.departments)? STORE.departments.map(d=>({id:d.id,name:d.name,img:d.img,blurb:'',intro:'',hero:'',subcats:[]}))
      : ['Bags','Clothing','Desk','Drinkware','Exhibition','Lifestyle','Notebooks','Outdoor','Tech','Writing'].map(n=>({id:slug(n),name:n,img:slug(n),blurb:'',intro:'',hero:'',subcats:[]}));
    const writing=deps.find(d=>d.id==='writing');
    if(writing){ writing.intro='Put your brand at the forefront of eco-conscious thinking with our Sustainable Writing Range — beautifully crafted pens, pencils and notebooks made from recycled, renewable and responsibly sourced materials.';
      writing.subcats=['Gel Pens','Highlighter Pens','Marker Pens','Metal Pens','Refillable Pens','Rollerballs','Pencils','Pencil Cases','Gift Pen Sets','Novelty Pens','Recycled Pens & Pencils','Wooden Pens'].map((n,i)=>({id:slug(n),name:n,img:'',featured:i<4})); }
    const bags=deps.find(d=>d.id==='bags');
    if(bags){ bags.intro='Arguably one of the most used and visible forms of promotional merchandise — we love a personalised bag. Shopping, gifts, business or sports, with material choices from paper to leather and branding areas to suit every budget, there\u2019s something here for every campaign.';
      bags.subcats=[
        'Backpacks','Briefcases','Carrier Bags','Conference Bags','Cooler Bags','Cotton Bags','Document Bags',
        'Drawstring Bags','Eco Bags','Exhibition Bags','Foldable Shopping Bags','Gift Bags','iPad Bags','Jute Bags',
        'Laptop Bags','Paper Bags','Plastic Carrier Bags','Rucksacks','Shoe Bags','Shopping Bags','Sports Bags',
        'Tote Bags','Travel Bags'
      ].map((n,i)=>({id:slug(n),name:n,img:'',featured:['Backpacks','Cotton Bags','Jute Bags','Tote Bags'].includes(n)})); }
    const lifestyle=deps.find(d=>d.id==='lifestyle');
    if(lifestyle){ lifestyle.subcats=[
        'Armbands','Balls','Beach balls','Beach Products','Exercise Bands','Football Products','Frisbees','Health & Fitness','Rugby Products','Pedometers','Sports Products','Stopwatches','Towels',
        'Antibac Products','First Aid Kits','Hand Sanitiser','Lip Balm','Manicure Sets','Personal Alarm','Plasters','Tissues'
      ].map(n=>({id:slug(n),name:n,img:'',featured:false})); }
    return {
      sections:[
        {id:'essentials', name:'Essentials', intro:'Eco-friendly promotional products to showcase your brand with purpose — from recycled notebooks and wheat-straw tech to organic cotton totes and long-lasting pens.', deptIds:deps.map(d=>d.id)},
        {id:'treats', name:'Treats', intro:'Memorable gifts and sweet extras that delight.', deptIds:[]},
        {id:'packaging', name:'Packaging', intro:'Branded boxes, wraps and finishing touches.', deptIds:[]},
        {id:'inspiration', name:'Inspiration', intro:'Curated ideas and campaign starting points.', deptIds:[]}
      ],
      departments:deps
    };
  }

  let DATA=null;
  function load(){ if(DATA) return DATA; try{ const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s&&s.sections&&s.departments) DATA=s; }catch(e){} if(!DATA) DATA=seed(); return DATA; }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(DATA)); }catch(e){} }

  const sections=()=>load().sections;
  const departments=()=>load().departments;
  const section=id=>load().sections.find(s=>s.id===id);
  const department=id=>load().departments.find(d=>d.id===id);
  function deptsOf(sectionId){ const s=section(sectionId); if(!s) return []; return s.deptIds.map(id=>department(id)).filter(Boolean); }
  function sectionOfDept(deptId){ return load().sections.find(s=>s.deptIds.includes(deptId)); }

  // sections
  function addSection(name){ const d=load(); const id=slug(name); if(d.sections.find(s=>s.id===id)) return id; d.sections.push({id,name:name.trim()||'New section',intro:'',deptIds:[]}); save(); return id; }
  function updateSection(id,patch){ const s=section(id); if(s){ Object.assign(s,patch); save(); } }
  function deleteSection(id){ const d=load(); const s=section(id); if(!s) return; // orphaned depts move to first remaining section
    const rest=d.sections.filter(x=>x.id!==id); if(rest[0]) rest[0].deptIds=[...new Set([...rest[0].deptIds,...s.deptIds])]; d.sections=rest; save(); }
  function moveSection(id,dir){ const a=load().sections; const i=a.findIndex(s=>s.id===id); const j=i+dir; if(i<0||j<0||j>=a.length) return; [a[i],a[j]]=[a[j],a[i]]; save(); }

  // departments
  function addDepartment(name, sectionId){ const d=load(); const id=slug(name); if(d.departments.find(x=>x.id===id)) return id;
    d.departments.push({id,name:name.trim()||'New department',img:id,blurb:'',intro:'',hero:'',subcats:[]}); const s=section(sectionId)||d.sections[0]; if(s) s.deptIds.push(id); save(); return id; }
  function updateDepartment(id,patch){ const dp=department(id); if(dp){ Object.assign(dp,patch); save(); } }
  function deleteDepartment(id){ const d=load(); d.departments=d.departments.filter(x=>x.id!==id); d.sections.forEach(s=>s.deptIds=s.deptIds.filter(x=>x!==id)); save(); }
  function moveDepartment(id,dir){ const s=sectionOfDept(id); if(!s) return; const a=s.deptIds; const i=a.indexOf(id); const j=i+dir; if(j<0||j>=a.length) return; [a[i],a[j]]=[a[j],a[i]]; save(); }
  function assignDept(deptId, sectionId){ const d=load(); d.sections.forEach(s=>s.deptIds=s.deptIds.filter(x=>x!==deptId)); const s=section(sectionId); if(s)s.deptIds.push(deptId); save(); }

  // sub-categories (within a department) — admin-defined; drive the filter + featured strip
  function subcatsOf(deptId){ const d=department(deptId); return (d&&d.subcats)||[]; }
  function addSubcat(deptId,name){ const d=department(deptId); if(!d) return; d.subcats=d.subcats||[]; const id=slug(name); if(d.subcats.find(s=>s.id===id))return id; d.subcats.push({id,name:name.trim()||'New sub-category',img:'',featured:false}); save(); return id; }
  function updateSubcat(deptId,subId,patch){ const d=department(deptId); if(!d||!d.subcats)return; const s=d.subcats.find(x=>x.id===subId); if(s){ Object.assign(s,patch); save(); } }
  function deleteSubcat(deptId,subId){ const d=department(deptId); if(!d||!d.subcats)return; d.subcats=d.subcats.filter(x=>x.id!==subId); save(); if(window.MSSTORE&&MSSTORE._pruneSubcat)MSSTORE._pruneSubcat(subId); }
  function moveSubcat(deptId,subId,dir){ const d=department(deptId); if(!d||!d.subcats)return; const a=d.subcats; const i=a.findIndex(x=>x.id===subId); const j=i+dir; if(i<0||j<0||j>=a.length)return; [a[i],a[j]]=[a[j],a[i]]; save(); }
  function sortSubcats(deptId){ const d=department(deptId); if(!d||!d.subcats)return; d.subcats.sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'})); save(); }
  function reorderSubcat(deptId,subId,toIndex){ const d=department(deptId); if(!d||!d.subcats)return; const a=d.subcats; const from=a.findIndex(x=>x.id===subId); if(from<0)return; let to=Math.max(0,Math.min(a.length-1,toIndex)); const [it]=a.splice(from,1); a.splice(to,0,it); save(); }

  function reset(){ DATA=seed(); save(); }

  /* ---------- product ↔ sub-category assignment (a product can be in several) ---------- */
  const PKEY='ms-product-subcats';
  function pmap(){ try{ return JSON.parse(localStorage.getItem(PKEY)||'{}')||{}; }catch(e){ return {}; } }
  function psave(o){ try{ localStorage.setItem(PKEY, JSON.stringify(o)); }catch(e){} }
  function subcatsForProduct(id){ return pmap()[id]||[]; }                 // → [subId,…]
  function setProductSubcats(id, subIds){ const o=pmap(); if(subIds&&subIds.length) o[id]=[...new Set(subIds)]; else delete o[id]; psave(o); }
  function toggleProductSubcat(id, subId){ const o=pmap(); const a=o[id]||[]; const i=a.indexOf(subId); if(i>=0)a.splice(i,1); else a.push(subId); if(a.length)o[id]=a; else delete o[id]; psave(o); }
  function addProductsToSubcat(ids, subId){ const o=pmap(); ids.forEach(id=>{ const a=o[id]||[]; if(!a.includes(subId))a.push(subId); o[id]=a; }); psave(o); }
  function removeProductsFromSubcat(ids, subId){ const o=pmap(); ids.forEach(id=>{ if(o[id]){ o[id]=o[id].filter(s=>s!==subId); if(!o[id].length)delete o[id]; } }); psave(o); }
  function productsInSubcat(subId){ const o=pmap(); return Object.keys(o).filter(id=>o[id].includes(subId)); }
  // when a subcat is deleted, clean references
  function _pruneSubcat(subId){ const o=pmap(); let ch=false; Object.keys(o).forEach(id=>{ if(o[id].includes(subId)){ o[id]=o[id].filter(s=>s!==subId); if(!o[id].length)delete o[id]; ch=true; } }); if(ch)psave(o); }

  return { sections, departments, section, department, deptsOf, sectionOfDept,
    addSection, updateSection, deleteSection, moveSection,
    addDepartment, updateDepartment, deleteDepartment, moveDepartment, assignDept,
    subcatsOf, addSubcat, updateSubcat, deleteSubcat, moveSubcat, sortSubcats, reorderSubcat,
    subcatsForProduct, setProductSubcats, toggleProductSubcat, addProductsToSubcat, removeProductsFromSubcat, productsInSubcat,
    reset, _save:save };
})();
