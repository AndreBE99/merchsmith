/* Merchsmith — shared colour mapping (window.MSCOLOUR)
   Rolls raw supplier colour names up to the 19 master base colours used by the store filters.
   Rules are ordered — first match wins; manual overrides (per raw name) beat every rule.
   Overrides persist in localStorage 'ms-colour-map' {rawLower: base}.
   Edited via the tool on Merchsmith Field Mapping Reference.html. Loaded by the Store + that page. */
(function(){
  const BASE=[
    // neutrals
    {name:'Black',hex:'#1a1a1e',grp:'Neutrals'},
    {name:'White',hex:'#ffffff',grp:'Neutrals'},
    {name:'Grey',hex:'#a5a5a5',grp:'Neutrals'},
    {name:'Transparent',hex:'#eef0f2',grp:'Neutrals'},
    // brights
    {name:'Red',hex:'#d92b2b',grp:'Brights'},
    {name:'Blue',hex:'#3d6be0',grp:'Brights'},
    {name:'Navy',hex:'#1b2a6b',grp:'Brights'},
    {name:'Green',hex:'#2cb567',grp:'Brights'},
    {name:'Yellow',hex:'#f0e130',grp:'Brights'},
    {name:'Orange',hex:'#f28a00',grp:'Brights'},
    {name:'Purple',hex:'#7a0fae',grp:'Brights'},
    {name:'Pink',hex:'#ef3f96',grp:'Brights'},
    // earth
    {name:'Brown',hex:'#a2703a',grp:'Earth'},
    {name:'Natural',hex:'#cdab77',grp:'Earth'},
    {name:'Olive',hex:'#4a5d1e',grp:'Earth'},
    // finishes
    {name:'Gold',hex:'#b3a12c',grp:'Finishes'},
    {name:'Silver',hex:'#c9c9cd',grp:'Finishes'},
    {name:'Metallic',hex:'#b8b8bd',grp:'Finishes'},
    {name:'Multi-colour',hex:'#e0393e',grp:'Finishes',multi:true},
  ];
  /* Ordered rules — FIRST MATCH WINS. Specific shades before generic words
     (Navy before Blue, Olive before Green, Gold/Silver before Metallic, "rose gold"→Gold not Pink). */
  const RULES=[
    ['Multi-colour', /multi|rainbow|assort|mixed|full[ -]?colou?r/i, 'Multi, Rainbow, Assorted, Mixed, Full colour'],
    ['Transparent',  /transparent|translucent|clear|frost/i,        'Clear, Frosted, Translucent'],
    ['Gold',         /gold|champagne|brass|bronze/i,                'Gold, Rose gold, Champagne, Brass, Bronze'],
    ['Silver',       /silver|stainless|chrome|steel/i,              'Silver, Stainless steel, Chrome'],
    ['Metallic',     /metallic|gunmetal|titanium|copper|pewter/i,   'Metallic, Gunmetal, Titanium, Copper'],
    ['Navy',         /navy|midnight|dark ?blue|indigo/i,            'Navy, Midnight, Dark blue, Indigo'],
    ['Olive',        /olive|khaki|army|military|camo/i,             'Olive, Khaki, Army green'],
    ['Natural',      /natural|beige|cream|ivory|ecru|sand|oat|stone|taupe|kraft|greige|bamboo|cork|wood/i, 'Natural, Beige, Cream, Ivory, Sand, Kraft, Bamboo, Cork'],
    ['Brown',        /brown|chocolate|coffee|walnut|hazel|\btan\b|mocha|espresso|cognac|caramel/i, 'Brown, Chocolate, Coffee, Tan, Caramel'],
    ['Pink',         /pink|\brose\b|fuchsia|magenta|blush|salmon/i, 'Pink, Rose, Fuchsia, Magenta, Blush, Salmon'],
    ['Purple',       /purple|violet|lilac|lavender|plum|aubergine|mauve|berry/i, 'Purple, Violet, Lilac, Lavender, Plum'],
    ['Red',          /\bred\b|burgundy|maroon|crimson|scarlet|wine|cherry|ruby|claret/i, 'Red, Burgundy, Maroon, Wine, Cherry'],
    ['Orange',       /orange|coral|peach|apricot|amber|rust|terracotta/i, 'Orange, Coral, Peach, Amber, Terracotta'],
    ['Yellow',       /yellow|lemon|mustard|canary|sunflower/i,      'Yellow, Lemon, Mustard'],
    ['Green',        /green|\blime\b|mint|forest|emerald|sage|moss|pistachio|apple/i, 'Green, Lime, Mint, Forest, Emerald, Sage'],
    ['Blue',         /blue|azure|cobalt|royal|\bsky\b|aqua|turquoise|teal|cyan|petrol|denim|ocean/i, 'Blue, Sky, Royal, Aqua, Turquoise, Teal, Denim'],
    ['Grey',         /gr[ae]y|charcoal|graphite|slate|anthracite|smoke|\bash\b/i, 'Grey, Charcoal, Graphite, Slate, Anthracite'],
    ['White',        /white|snow|pearl|arctic/i,                    'White, Off-white, Snow, Pearl'],
    ['Black',        /black|onyx|\bjet\b|ebony|volcanic|carbon/i,   'Black, Volcanic black, Onyx, Carbon'],
  ];
  const KEY='ms-colour-map';
  const ov=()=>{ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } };
  const saveOv=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} };
  const norm=s=>String(s||'').trim();
  function map(name){
    const n=norm(name); if(!n) return null;
    const o=ov()[n.toLowerCase()]; if(o) return o;
    for(const [base,re] of RULES){ if(re.test(n)) return base; }
    return null; // unmapped — caller decides (store shows nothing; tool flags it)
  }
  window.MSCOLOUR={
    BASE, RULES,
    names:()=>BASE.map(b=>b.name),
    map,
    mapOr:(name,fb)=>map(name)||fb||'Other',
    via(name){ const n=norm(name); if(!n) return null;
      if(ov()[n.toLowerCase()]) return {base:ov()[n.toLowerCase()],via:'override'};
      for(const [base,re] of RULES){ if(re.test(n)) return {base,via:'rule'}; }
      return null; },
    hex(base){ const b=BASE.find(x=>x.name===base); return b?b.hex:null; },
    isMulti(base){ const b=BASE.find(x=>x.name===base); return !!(b&&b.multi); },
    order(base){ const i=BASE.findIndex(x=>x.name===base); return i<0?999:i; },
    overrides:ov,
    setOverride(raw,base){ const o=ov(); const k=norm(raw).toLowerCase(); if(!k) return; if(base) o[k]=base; else delete o[k]; saveOv(o); },
    clearOverrides(){ saveOv({}); },
  };
})();
