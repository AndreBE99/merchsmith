/* ============================================================
   field-registry.js — the canonical platform PRODUCT FIELD
   registry. Single source of truth consumed by:
     • the Add-supplier connect-time schema mapping
     • the import wizard (field coverage + mapping)
     • the Store distributor pull-down pane + customer page
   Built-in fields are code-defined; operators can add CUSTOM
   fields (persisted in localStorage). Each field declares its
   type, who sees it, a unit/format hint and where it displays.

   window.MSFIELDS:
     all()                  → [field]  built-ins + custom, in order
     get(key)               → field | null
     bySection(sec)         → [field]  (distributor-pane section)
     customerFields()       → [field]  vis customer|both, displayCustomer
     addField(def)          → field    (persists; def: {label,type,...})
     updateField(key, patch)
     removeField(key)       (custom only)
     TYPES, SECTIONS, VIS
     format(field, value)   → display string for a value
   ============================================================ */
window.MSFIELDS = (function(){
  'use strict';
  const LS='ms-field-registry-custom';

  // field types → how the value is entered/displayed
  const TYPES={
    text:   {label:'Text'},
    number: {label:'Number'},
    price:  {label:'Price (£)'},
    breaks: {label:'Price breaks'},
    colour: {label:'Colour list'},
    cert:   {label:'Certification list'},
    url:    {label:'URL / link'},
    date:   {label:'Date'},
    list:   {label:'List of values'}
  };
  // distributor pull-down pane sections (the dv-panel accordions)
  const SECTIONS={
    data:'Product data', price:'Price matrix', deco:'Decoration & branding',
    stock:'Stock', pack:'Packaging & logistics', sus:'Sustainability',
    supplier:'Supplier & feed', extra:'Additional attributes'
  };
  const VIS={ both:'Customer + distributor', distributor:'Distributor only', customer:'Customer only' };

  // ---- BUILT-IN canonical fields (reconciles connect-map + import + pane) ----
  // key, label, type, required, vis, section, unit, displayCustomer(bool), prodKey(where it lives on a product)
  const F=(key,label,type,o={})=>Object.assign({key,label,type,required:false,vis:'both',section:'data',unit:'',displayCustomer:false,builtin:true,prodKey:key},o);
  const BUILTIN=[
    F('name','Product name','text',{required:true,displayCustomer:true}),
    F('code','Item / model code','text',{required:true,vis:'distributor'}),
    F('cost','Unit cost','price',{required:true,vis:'distributor',section:'price',unit:'GBP',prodKey:'priceFrom'}),
    F('currency','Currency','text',{required:true,vis:'distributor',section:'price'}),
    F('breaks','Price breaks','breaks',{required:true,vis:'distributor',section:'price',prodKey:'breaks'}),
    F('rrp','RRP / sell guide','price',{vis:'distributor',section:'price',unit:'GBP'}),
    F('category','Category / department','text',{required:true,displayCustomer:true,prodKey:'dept'}),
    F('subcat','Sub-category','text',{displayCustomer:true,prodKey:'cat'}),
    F('moq','Minimum order qty','number',{displayCustomer:true,unit:'units'}),
    F('lead','Lead time','number',{displayCustomer:true,unit:'days'}),
    F('colours','Colours','colour',{displayCustomer:true}),
    F('sizes','Sizes','list',{displayCustomer:true,prodKey:'sizes'}),
    F('material','Material','text',{displayCustomer:true}),
    F('brand','Brand','text',{displayCustomer:true}),
    F('image','Primary image','url',{displayCustomer:true}),
    F('methods','Decoration methods','list',{section:'deco',displayCustomer:true,prodKey:'methods'}),
    F('decoration','Decoration cost book','list',{vis:'distributor',section:'deco',prodKey:'decoration'}),
    F('sustainability','Sustainability score','number',{section:'sus',displayCustomer:true,unit:'/10'}),
    F('certifications','Certifications','cert',{section:'sus',displayCustomer:true}),
    F('origin','Country of origin','text',{section:'pack',displayCustomer:true}),
    F('carton','Carton quantity','number',{vis:'distributor',section:'pack',unit:'units'}),
    F('weightGr','Item weight','number',{vis:'distributor',section:'pack',unit:'g'}),
    F('ean','EAN','text',{vis:'distributor',section:'pack'}),
    F('hsCode','HS code','text',{vis:'distributor',section:'pack'}),
    F('stock','Stock','number',{vis:'distributor',section:'stock',prodKey:'stock'}),
    F('video','Product video','url',{vis:'distributor',section:'data'}),
    F('desc','Description','text',{displayCustomer:true})
  ];

  function loadCustom(){ try{ const a=JSON.parse(localStorage.getItem(LS)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function saveCustom(a){ try{ localStorage.setItem(LS, JSON.stringify(a)); }catch(e){} }
  let CUSTOM=loadCustom();

  function all(){ return BUILTIN.concat(CUSTOM); }
  function get(key){ return all().find(f=>f.key===key)||null; }
  function bySection(sec){ return all().filter(f=>(f.section||'data')===sec); }
  function customerFields(){ return all().filter(f=>(f.vis==='customer'||f.vis==='both')&&f.displayCustomer); }
  function distributorFields(){ return all(); } // distributor sees everything

  function slug(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)||('field_'+Date.now()); }
  function addField(def){
    let key=def.key||slug(def.label); if(all().some(f=>f.key===key)) key=key+'_'+Date.now().toString(36).slice(-3);
    const field={ key, label:def.label||key, type:def.type||'text', required:!!def.required,
      vis:def.vis||'distributor', section:def.section||'extra', unit:def.unit||'',
      displayCustomer:def.vis==='customer'||def.vis==='both'?!!def.displayCustomer:false,
      builtin:false, prodKey:'custom.'+key, source:def.source||'' };
    CUSTOM.push(field); saveCustom(CUSTOM); return field;
  }
  function updateField(key, patch){ const f=CUSTOM.find(x=>x.key===key); if(f){ Object.assign(f,patch); saveCustom(CUSTOM); return f; }
    // built-ins: store an override layer
    return null; }
  function removeField(key){ const i=CUSTOM.findIndex(x=>x.key===key); if(i>=0){ CUSTOM.splice(i,1); saveCustom(CUSTOM); return true; } return false; }

  // read a value off a product by the field's prodKey (supports custom.<key> + dotted paths)
  function valueOf(field, product){ if(!product) return undefined;
    const pk=field.prodKey||field.key;
    if(pk.indexOf('.')>=0){ return pk.split('.').reduce((o,k)=>o==null?undefined:o[k], product); }
    return product[pk];
  }
  // format a value for display per type
  function format(field, v){
    if(v==null||v===''||(Array.isArray(v)&&!v.length)) return '';
    switch(field.type){
      case 'price': return '£'+Number(v).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
      case 'number': return Number(v).toLocaleString('en-GB')+(field.unit&&field.unit!=='units'?(' '+field.unit):(field.unit==='units'?' units':''));
      case 'colour': return (Array.isArray(v)?v:[v]).map(c=>typeof c==='string'?c:(c&&(c.name||c.base))||'').filter(Boolean).join(', ');
      case 'cert': return (Array.isArray(v)?v:String(v).split(',')).filter(Boolean).join(' · ');
      case 'list': return (Array.isArray(v)?v:[v]).filter(Boolean).join(', ');
      case 'url': return v;
      default: return String(v);
    }
  }

  return { all, get, bySection, customerFields, distributorFields, addField, updateField, removeField,
    valueOf, format, reload(){ CUSTOM=loadCustom(); }, TYPES, SECTIONS, VIS, BUILTIN };
})();
