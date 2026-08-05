/* ============================================================
   dist-projects-data.js — seeded master project list for the
   distributor "Projects" area (all customers). Prototype data.
   Each project carries named product lines: {n, st, qty, val}
   (val = line sell value £). Project value = Σ item val.
   Item stages: idea → quote → proof → ordered → prod → delivered
   Project status is DERIVED from items (earliest open stage);
   all-delivered → Delivered; closed:true → Closed.
   ============================================================ */
window.DPROJ=(function(){
  const STAGES=['idea','quote','proof','ordered','prod','delivered'];
  const LABEL={idea:'Idea',quote:'In Progress',proof:'In Progress',ordered:'Ready to Order',prod:'Ordered',delivered:'Delivered',closed:'Archived'};
  const D=(y,m,d)=>new Date(y,m-1,d).getTime();
  const it=(n,st,qty,val)=>({n,st,qty,val});
  /* ---- per-area workflow states (design/price/sample/stock). The item's stage is DERIVED
     from these; the project status is derived from item stages. ---- */
  const AREA_DEFAULTS={
    idea:      {design:'dash',    price:'dash',    sample:'dash', stock:'dash'},
    quote:     {design:'pend',    price:'awaiting',sample:'dash', stock:'dash'},
    proof:     {design:'awaiting',price:'done',    sample:'pend', stock:'pend'},
    ordered:   {design:'approved',price:'done',    sample:'done', stock:'instock'},
    prod:      {design:'approved',price:'done',    sample:'done', stock:'ordered'},
    delivered: {design:'approved',price:'done',    sample:'done', stock:'done'}
  };
  function deriveStage(a){
    if(!a) return 'idea';
    if(a.stock==='done') return 'delivered';
    if(a.stock==='ordered') return 'prod';
    if(a.design==='approved'&&a.price==='done'&&a.stock==='instock') return 'ordered';
    if(a.price==='done') return 'proof';
    if(a.design==='dash'&&a.price==='dash'&&a.sample==='dash'&&a.stock==='dash') return 'idea';
    return 'quote';
  }
  // ensure every item carries areas, and its stage reflects them
  function normalize(i){ if(!i.areas) i.areas=Object.assign({},AREA_DEFAULTS[i.st]||AREA_DEFAULTS.idea); i.st=deriveStage(i.areas); return i; }
  /* ---- AM edits overlay: item changes persist to localStorage('ms-dist-projects')
     as { [projectId]: {items:[…], last:ts} } layered over the seed data ---- */
  const OKEY='ms-dist-projects';
  function ovLoad(){ try{ return JSON.parse(localStorage.getItem(OKEY)||'{}')||{}; }catch(e){ return {}; } }
  function ovSave(o){ try{ localStorage.setItem(OKEY, JSON.stringify(o)); }catch(e){} }
  const P=[
    // ---- Citrix (mirrors the customer-side projects) ----
    { id:'autumn', client:'Amira Patel', customer:'Citrix', name:'Autumn Giveaways', am:'Jess Doyle', profit:6100, deadline:D(2026,9,18), last:D(2026,7,6), flag:true, comments:3, items:[
      it('Xoopar Mr. Bio Wheat Straw Charging Cable','proof',1000,3400), it('Tech Travel Bag','proof',500,4900),
      it('Hoton A5 Kraft Paper Notebook','ordered',1000,3100), it('Xoopar Pokket Wheat Straw Wireless Mouse','quote',500,4200),
      it('Prodir Ds8 True Biotic Pen','quote',2000,1900), it('Desktop Garden','idea',250,900) ]},
    { id:'expo', client:'Amira Patel', customer:'Citrix', name:'2026 Charity Expo', am:'Ben Shaw', profit:7400, deadline:D(2026,8,2), last:D(2026,7,4), flag:false, comments:0, items:[
      it('Xoopar Mr. Bio Wheat Straw Charging Cable','ordered',1500,5100), it('Tech Travel Bag','ordered',600,5800),
      it('Hoton A5 Kraft Paper Notebook','ordered',1500,4650), it('Xoopar Pokket Wheat Straw Wireless Mouse','ordered',600,5000),
      it('Recycled Cotton Tote','ordered',2000,3600), it('Seed Pencil Set','prod',1000,1450),
      it('Cork Cover Notebook','proof',500,2100), it('Prodir Ds8 True Biotic Pen','ordered',1000,950) ]},
    { id:'staff', client:'Douglas Reed', customer:'Citrix', name:'Staff Gifts', am:'Cara Lyon', profit:2050, deadline:D(2026,11,20), last:D(2026,6,28), flag:false, comments:0, items:[
      it('Insulated Steel Cup','proof',300,2700), it('Cork Cover Notebook','proof',300,1250),
      it('Seed Pencil Set','idea',300,450), it('Desktop Garden','idea',300,2000) ]},
    { id:'vip', client:'Amira Patel', customer:'Citrix', name:'VIP Gifts', am:'Jess Doyle', profit:1480, deadline:D(2026,7,30), last:D(2026,6,21), flag:false, comments:0, items:[
      it('Bamboo Toothbrush Set','prod',150,3900) ]},
    { id:'summer', client:'Douglas Reed', customer:'Citrix', name:'Summer Event 2026', am:'Sara Malik', profit:3200, deadline:D(2026,6,26), last:D(2026,7,5), flag:true, comments:1, items:[
      it('Recycled Cotton Tote','proof',2500,4500), it('Insulated Steel Cup','idea',400,3600), it('Trucker Cap — Recycled','idea',600,1700) ]},
    // ---- Bang & Blossom ----
    { id:'bb-launch', client:'Holly Chen', customer:'Bang & Blossom', name:'Store Launch Kit', am:'Ben Shaw', profit:4400, deadline:D(2026,7,24), last:D(2026,7,6), flag:true, comments:5, items:[
      it('Citizen Green Magnum Duffle Bag','ordered',300,4200), it('Kraft Gift Box + Ribbon','ordered',1000,2300),
      it('Boost Lanyard — rPET','ordered',1500,1800), it('A6 Seeded Thank-You Cards','proof',2000,1400), it('Window Decal Set','proof',60,2900) ]},
    { id:'bb-xmas', client:'Holly Chen', customer:'Bang & Blossom', name:'Christmas Hampers', am:'Ben Shaw', profit:5300, deadline:D(2026,11,28), last:D(2026,7,1), flag:false, comments:0, items:[
      it('Wicker Hamper Basket','idea',250,4600), it('Branded Hot Chocolate Tin','idea',250,2100),
      it('Merino Beanie','idea',250,3300), it('Soy Candle — Cedar','idea',250,2700), it('Gift Card Sleeve','idea',250,2500) ]},
    // ---- Fieldstone Brewery ----
    { id:'fs-fest', client:'Marcus Webb', customer:'Fieldstone Brewery', name:'Festival Season Merch', am:'Cara Lyon', profit:9700, deadline:D(2026,7,15), last:D(2026,7,7), flag:true, comments:2, items:[
      it('Festival Tee — Organic Cotton','prod',3000,10400), it('Recycled Bucket Hat','prod',1500,5900),
      it('Steel Pint Cup','prod',2500,6800), it('Tote — Heavy Canvas','prod',2000,3300),
      it('Wristband Multipack','ordered',5000,1200), it('Bar Runner','ordered',80,800) ]},
    { id:'fs-taproom', client:'Ellie Fieldstone', customer:'Fieldstone Brewery', name:'Taproom Refresh', am:'Cara Lyon', profit:1700, deadline:D(2026,9,4), last:D(2026,6,30), flag:false, comments:1, items:[
      it('Slate Coaster Set','quote',400,1900), it('Staff Apron — Waxed','quote',60,1500), it('Chalkboard A-Frame','quote',10,1900) ]},
    // ---- Nova Health ----
    { id:'nh-onboard', client:'Priya Nair', customer:'Nova Health', name:'New Starter Packs', am:'Jess Doyle', profit:3050, deadline:D(2026,8,14), last:D(2026,7,3), flag:false, comments:0, items:[
      it('Laptop Sleeve — rPET Felt','ordered',200,3100), it('Ceramic Mug — Speckle','ordered',200,1700),
      it('Hardback Notebook + Pen','ordered',200,1900), it('Welcome Card — Letterpress','delivered',200,2200) ]},
    { id:'nh-conf', client:'Priya Nair', customer:'Nova Health', name:'MedTech Conference', am:'Sara Malik', profit:4600, deadline:D(2026,6,12), last:D(2026,6,14), flag:false, comments:4, items:[
      it('Conference Tote','delivered',1200,2900), it('Retractable Badge Reel','delivered',1200,1600),
      it('Antibac Stylus Pen','delivered',2000,2400), it('A5 Programme — Recycled','delivered',1200,3800), it('Water Bottle — Tritan','delivered',800,3400) ]},
    // ---- Arlo & Co ----
    { id:'ac-retail', client:'Tom Arlo', customer:'Arlo & Co', name:'Retail Counter Merch', am:'Ben Shaw', profit:1500, deadline:D(2026,8,28), last:D(2026,7,2), flag:false, comments:0, items:[
      it('Counter-top Display — Bamboo','proof',15,1800), it('Branded Tissue Paper','proof',5000,1300), it('Sticker Sheet Pack','quote',3000,1600) ]},
    { id:'ac-team', client:'Tom Arlo', customer:'Arlo & Co', name:'Team Away Day', am:'Jess Doyle', profit:900, deadline:D(2026,6,20), last:D(2026,6,10), flag:false, comments:0, closed:true, items:[
      it('Crew Sweatshirt — Embroidered','delivered',40,1600), it('Enamel Camp Mug','delivered',40,600), it('Dry Bag 10L','delivered',40,400) ]},
    // ---- Kestrel Finance ----
    { id:'kf-client', client:'Ed Kestrel', customer:'Kestrel Finance', name:'Client Gifting Q3', am:'Sara Malik', profit:7100, deadline:D(2026,9,30), last:D(2026,7,7), flag:false, comments:2, items:[
      it('Leather Card Holder','quote',300,5400), it('Whisky Stones Set','quote',300,3600),
      it('Walnut Desk Tray','quote',150,4100), it('Fountain Pen — Gift Boxed','quote',150,4300),
      it('Silk-Finish Gift Wrap','idea',600,1100), it('Handwritten Note Service','idea',600,1100) ]},
    { id:'kf-agm', client:'Rachel Moss', customer:'Kestrel Finance', name:'AGM Delegate Packs', am:'Cara Lyon', profit:2500, deadline:D(2026,7,9), last:D(2026,7,5), flag:true, comments:1, items:[
      it('Delegate Folder — Recycled','proof',400,2600), it('Lanyard + Badge','proof',400,900),
      it('Compact Umbrella','proof',400,3400), it('Mints Tin','ordered',400,900) ]}
  ];
  function itemCount(p){ return p.items.length; }
  function value(p){ return p.items.reduce((a,i)=>a+(i.val||0),0); }
  // merged view: seed project + AM's persisted item edits
  function merged(){ const ov=ovLoad(); const base=P.concat((ov.__new||[]).map(n=>Object.assign({},n)));
    return base.map(p=>{ const o=ov[p.id]; const b=o?Object.assign({},p,{items:(o.items&&o.items.length?o.items:p.items),last:o.last||p.last}):Object.assign({},p); if(o&&('flag' in o)) b.flag=o.flag; if(o&&('closed' in o)) b.closed=o.closed; return Object.assign({},b,{items:b.items.map(i=>normalize(Object.assign({},i,{areas:i.areas?Object.assign({},i.areas):undefined})))}); }); }
  function setItems(id, items){ const o=ovLoad(); o[id]=Object.assign({},o[id],{items:items.map(i=>{ const n=normalize(Object.assign({},i)); return {n:n.n,st:n.st,qty:+n.qty||0,val:+n.val||0,areas:n.areas,flag:!!n.flag,paused:!!n.paused,archived:!!n.archived,cmts:(n.cmtList||[]).length||n.cmts||0,cmtList:n.cmtList||[],deliv:n.deliv||null,nofail:!!n.nofail}; }), last:Date.now()}); ovSave(o); }
  function setFlag(id, on){ const o=ovLoad(); o[id]=Object.assign({},o[id],{flag:!!on}); ovSave(o); }
  function setClosed(id, on){ const o=ovLoad(); o[id]=Object.assign({},o[id],{closed:!!on, last:Date.now()}); ovSave(o); }
  function duplicate(id){ const src=merged().find(x=>x.id===id); if(!src) return null; const o=ovLoad();
    const nid=id+'-copy-'+(Date.now()%100000);
    o.__new=(o.__new||[]).concat([{id:nid, customer:src.customer, client:src.client, name:src.name+' (copy)', am:src.am, profit:src.profit, deadline:src.deadline, last:Date.now(), flag:false, comments:0, items:src.items.map(i=>({n:i.n,st:i.st,qty:i.qty,val:i.val}))}]);
    ovSave(o); return nid; }
  function resetProject(id){ const o=ovLoad(); delete o[id]; if(o.__new) o.__new=o.__new.filter(n=>n.id!==id); ovSave(o); }
  function isEdited(id){ return !!ovLoad()[id]; }
  // derived status: earliest open stage across items; all delivered → Delivered; closed → Closed
  function status(p){
    if(p.closed) return 'closed';
    const stages=p.items.map(i=>i.st);
    if(stages.every(s=>s==='delivered')) return 'delivered';
    let idx=STAGES.length-1;
    stages.forEach(s=>{ const i=STAGES.indexOf(s); if(i>-1&&s!=='delivered') idx=Math.min(idx,i); });
    return STAGES[Math.min(idx, STAGES.length-2)];
  }
  const open=p=>{ const s=status(p); return s!=='delivered'&&s!=='closed'; };
  return { all:()=>merged(), status, label:s=>LABEL[s]||s, itemCount, value, open, setItems, setFlag, setClosed, duplicate, resetProject, isEdited, deriveStage, AREA_DEFAULTS, STAGES, LABEL };
})();
