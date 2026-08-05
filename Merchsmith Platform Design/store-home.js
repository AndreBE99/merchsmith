/* ============================================================
   store-home.js — shared config for the customer store HOMEPAGE.
   Single source of truth read by the customer store (to render
   the homepage sections) and the distributor's Store settings
   (to show/hide, reorder and edit each section's content).
   Persists to localStorage('ms-store-home').

   window.MSHOME:
     order()               → ['hero','usps',…] section ids in display order
     sections()            → [{id,label,on,…fields}] merged, in order
     section(id)           → merged section object (defaults + overrides)
     isOn(id)              → boolean (show/hide)
     label(id)             → admin-facing section name
     setField(id, patch)   → merge fields into a section's override
     toggle(id)            → flip show/hide
     move(id, dir)         → reorder (dir = -1 up / +1 down)
     reset()               → clear all overrides (back to defaults)
   Editing copy never removes the defaults — overrides are layered
   on top, so a "reset" always restores the shipped homepage.
   ============================================================ */
window.MSHOME = (function(){
  const KEY='ms-store-home';

  // ---- shipped defaults: these mirror the store's original homepage exactly ----
  const DEFAULT_ORDER=['hero','usps','marquee','statement','bestsellers','spotlight','ecoband','discover','brands','quotes','recent','steps','faq','newsletter'];
  const DEFAULTS={
    hero:{ label:'Hero banner', on:true,
      headline:'Good merch, for brands that mean it.',
      primaryText:'Shop all products', primaryHref:'#section=essentials',
      ghostText:'Start a project', ghostHref:'Merchsmith Create Project.html',
      image:'assets/products/eco-visual-1.jpg', caption:'Recycled Cotton Tote · Citrix' },
    usps:{ label:'Trust badges', on:true, items:[
      {b:'Every product eco-scored', s:'0–10 sustainability rating', icon:'s-leaf'},
      {b:'Free virtual proofs', s:'See it before you buy', icon:'s-print'},
      {b:"On-time or it's free", s:'No-fail delivery option', icon:'s-truck'},
      {b:'Dedicated account team', s:'Real people, real help', icon:'s-check'} ] },
    marquee:{ label:'Brand marquee', on:true, logos:{} },
    statement:{ label:'Brand statement', on:true,
      pre:'We brand the most beautiful, ', hl:'sustainable', post:' products so your brand shines in real life.',
      linkText:'View all products', linkHref:'#section=essentials' },
    bestsellers:{ label:'Best sellers', on:true, heading:'Our best sellers', productIds:[] },
    spotlight:{ label:'Spotlight product', on:true, heading:'In the spotlight' },
    ecoband:{ label:'Sustainability band', on:true, bg:'',
      heading:'Merch that means it.',
      body:'Every product carries a sustainability score so you can choose with confidence — recycled, biodegradable and responsibly made, with the impact made clear.',
      stats:[
        {b:'1,400+', s:'eco-scored products'},
        {b:'72%', s:'recycled or biodegradable'},
        {b:'UK', s:'made options'},
        {b:'0', s:'greenwashing'} ] },
    discover:{ label:'Discover cards', on:true, heading:'Discover', items:[
      {title:'The Eco range', desc:'Recycled, biodegradable and responsibly made — every item eco-scored.', href:'#dept=lifestyle', img:'garden'},
      {title:'Bespoke projects', desc:'Fully custom brief? Our team builds it with you, end to end.', href:'Merchsmith Create Project.html', img:'exhibition'},
      {title:'Summer selection', desc:"Sun's out. Stand out. Bottles, caps and outdoor kit.", href:'#dept=drinkware', img:'drinkware'} ] },
    brands:{ label:'Featured brands', on:true, heading:'Our best-selling brands', items:[
      {b:'Stanley', s:'Iconic drinkware, branded for you.', img:'drinkware'},
      {b:'Moleskine', s:'The most premium notebooks.', img:'book'},
      {b:'Ocean Bottle', s:'Every bottle funds ocean clean-up.', img:'bag'} ] },
    quotes:{ label:'Customer quotes', on:true, items:[
      {quote:'"The perfect combination of beautiful and sustainable merch."', by:'Sara Kemp — Citrix'} ] },
    recent:{ label:'Recently added', on:true, heading:'Recently added' },
    steps:{ label:'How it works', on:true, heading:'How it works', items:[
      {b:'Brief & browse', p:'Set your goal, budget, colours and deadline — or browse the range.'},
      {b:'Proof & price', p:'Free virtual proof and transparent pricing from your account team.'},
      {b:'Approve', p:'Sign off design, sample and price online — no email chains.'},
      {b:'Delivered', p:'We produce and ship to your deadline, with a no-fail option.'} ] },
    faq:{ label:'FAQ', on:true, heading:'Frequently asked questions',
      intro:'Everything on pricing, lead times, sampling and delivery — the things that matter before you order.',
      items:[
        {q:'Why do prices vary within a range?', a:'Unit price depends on quantity and branding — more units and simpler decoration lower the per-unit cost. Every product shows a live price matrix so you see exactly where you land.'},
        {q:"What's the minimum order quantity?", a:"MOQ varies by product and supplier — typically from 25–250 units. It's shown on every product and in the database."},
        {q:'Can you shorten the production lead time?', a:'Often yes. Standard lead times are listed per product; ask your account team about our no-fail express option for tight deadlines.'},
        {q:'Can you ship to multiple addresses?', a:'Yes — split delivery across sites or individuals, with per-address tracking.'},
        {q:'How sustainable are the products?', a:'Every product carries a 0–10 sustainability score based on materials and origin, so you can choose with confidence — no greenwashing.'} ] },
    newsletter:{ label:'Newsletter signup', on:true, heading:'Be the first to know.' }
  };

  let OV=null; // overrides { order?:[], sections:{ id:{on?,…} } }
  function load(){ if(OV) return OV; try{ const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s&&typeof s==='object') OV=s; }catch(e){} if(!OV) OV={sections:{}}; if(!OV.sections)OV.sections={};
    // migration m1: 'spotlight' section shipped after some stores saved a custom order — insert it once
    if(OV.order&&OV.order.length&&!OV._m1){ OV._m1=1; if(!OV.order.some(id=>String(id).split('~')[0]==='spotlight')){ const i=OV.order.indexOf('bestsellers'); OV.order.splice(i<0?Math.min(5,OV.order.length):i+1,0,'spotlight'); } save(); }
    return OV; }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(load())); }catch(e){} }

  // display order: stored order wins verbatim (respects deletions/duplicates/reorder);
  // only a never-customised store falls back to the shipped default order.
  const typeOf=id=>String(id).split('~')[0];
  function order(){ const o=load(); if(o.order&&o.order.length) return o.order.filter(id=>DEFAULTS[typeOf(id)]); return DEFAULT_ORDER.slice(); }
  function section(id){ const type=typeOf(id); const d=DEFAULTS[type]; if(!d) return null; const ov=(load().sections||{})[id]||{}; return Object.assign({id,type}, d, ov); }
  function sections(){ return order().map(section); }
  function isOn(id){ const s=section(id); return !!(s&&s.on); }
  function label(id){ const s=section(id); return s?s.label:id; }

  function setField(id, patch){ const o=load(); o.sections[id]=Object.assign({}, o.sections[id]||{}, patch); save(); }
  function toggle(id){ setField(id,{on:!isOn(id)}); }
  function move(id, dir){ const o=load(); const cur=order(); const i=cur.indexOf(id); const j=i+dir; if(i<0||j<0||j>=cur.length) return; [cur[i],cur[j]]=[cur[j],cur[i]]; o.order=cur; save(); }
  // duplicate a section instance (copies its current content) and insert it right after
  function duplicate(id){ const o=load(); const type=typeOf(id); const cur=order(); let n=2; while(cur.includes(type+'~'+n)) n++; const newId=type+'~'+n;
    const src=section(id); const clone={}; Object.keys(src).forEach(k=>{ if(k!=='id'&&k!=='type') clone[k]=JSON.parse(JSON.stringify(src[k])); });
    o.sections=o.sections||{}; o.sections[newId]=clone;
    const arr=cur.slice(); const i=arr.indexOf(id); arr.splice(i<0?arr.length:i+1,0,newId); o.order=arr; save(); return newId; }
  function deleteSection(id){ const o=load(); o.order=order().filter(x=>x!==id); if(o.sections) delete o.sections[id]; save(); }
  function resetSection(id){ const o=load(); if(o.sections) delete o.sections[id]; save(); }
  // store-wide display prefs (kept through homepage resets)
  function getPref(k){ const o=load(); return (o.prefs||{})[k]; }
  function setPref(k,v){ const o=load(); o.prefs=o.prefs||{}; o.prefs[k]=v; save(); }
  function reset(){ const prefs=load().prefs; OV={sections:{},prefs:prefs||{}}; save(); }

  return { order, sections, section, isOn, label, setField, toggle, move, duplicate, deleteSection, resetSection, reset, getPref, setPref,
    DEFAULTS, DEFAULT_ORDER, typeOf };
})();
