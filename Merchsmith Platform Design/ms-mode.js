/* ============================================================
   ms-mode.js — platform data MODE (reversible blank slate).

   Two modes, stored in localStorage('ms-platform-mode'):
     'seeded' (default) — all the built-in demo data shows.
     'blank'            — seed datasets are SUPPRESSED (not deleted)
                          so you can populate the platform with real
                          data from scratch. Flip back to 'seeded'
                          anytime — nothing is destroyed.

   The seed sources (admin-data.js, store-feed.js, catalogue-data.js,
   admin-supplier-team.js) each consult MSMODE.isBlank() and fall back
   to the minimal blank datasets defined here. Taxonomy
   (store-structure.js) is intentionally KEPT in both modes.

   MUST load BEFORE those data files.

   window.MSMODE:
     get()            → 'seeded' | 'blank'
     isBlank()        → boolean
     set(mode)        → persist (caller reloads)
     BLANK_DISTRIBUTORS / BLANK_SUPPLIERS  → minimal kept records
     RUNTIME_KEYS     → ms-* keys the reset action clears
   ============================================================ */
window.MSMODE = (function(){
  const KEY='ms-platform-mode';
  function get(){ try{ return localStorage.getItem(KEY)==='blank'?'blank':'seeded'; }catch(e){ return 'seeded'; } }
  function isBlank(){ return get()==='blank'; }
  function set(m){ try{ localStorage.setItem(KEY, m==='blank'?'blank':'seeded'); }catch(e){} }

  // ONE real distributor org kept so the distributor + customer store views stay usable.
  const BLANK_DISTRIBUTORS=[
    { id:'acme', name:'Mojo Promotions', initials:'MP', domain:'shop.mojopromotions.com', plan:'Scale', status:'active', since:'Mar 2023',
      mrr:'£1,200', customers:0, suppliers:3, users:1, seats:1, cur:'£', activeProjects:0, gmv:'£0', lastActive:'Online now',
      owner:'Jess Doyle', ownerEmail:'jess@mojopromotions.com', region:'UK', flag:null }
  ];
  // empty supplier shells for the suppliers with a real import path — ready to import into.
  const BLANK_SUPPLIERS=[
    { id:'pf', name:'PF Concept', initials:'PF', domain:'pfconcept.com', kind:'both', feed:'API · JSON feed (product · price · print · stock)', products:0, status:'active', region:'NL', usedBy:0, lead:'9 working days', since:'2026' },
    { id:'xoopar', name:'Xoopar', initials:'XO', domain:'xoopar.com', kind:'both', feed:'API · Akeneo PIM (EUR→GBP)', products:0, status:'active', region:'FR', usedBy:0, lead:'15 working days', since:'2026' },
    { id:'biolabs', name:'Bio Labs', initials:'BL', domain:'bio-labs.co.uk', kind:'both', feed:'CSV · WooCommerce export', products:0, status:'active', region:'UK', usedBy:0, lead:'10 working days', since:'2026' }
  ];
  const BLANK_STATS={ distributors:1, activeDistributors:1, suppliers:3, mrr:'£0', gmv:'£0' };

  // runtime accumulations cleared by "Reset to empty" (NOT taxonomy/identity/theme/brand/logos)
  const RUNTIME_KEYS=['ms-ingested-products','ms-curated-range','ms-dist-range','ms-supplier-teams','ms-dv-extra-fields'];

  return { get, isBlank, set, BLANK_DISTRIBUTORS, BLANK_SUPPLIERS, BLANK_STATS, RUNTIME_KEYS };
})();
