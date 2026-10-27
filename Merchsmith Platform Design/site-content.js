/* ============================================================
   site-content.js — the distributor's own content pages.

   Every footer link points at Merchsmith Page.html?p=<slug>. The page registry
   below defines each page's TYPE, and the type determines its section template:

     editorial  hero + standfirst, body sections (optional image), stat band, CTA
     legal      title + last-reviewed date + numbered clauses + contact note
     faq        grouped question/answer accordions
     contact    intro + enquiry form + contact details + offices

   Defaults ship as scaffolding, NOT finished copy. Legal pages deliberately
   carry no invented legal wording — headings and a note only; the distributor
   (or their solicitor) supplies the text. Edits persist to 'ms-site-pages'.
   Read/written by Merchsmith Page.html and Distributor Settings → Pages.
   ============================================================ */
(function(){
  'use strict';
  const KEY='ms-site-pages';

  const PAGES=[
    {slug:'about',       title:'About us',               type:'editorial', nav:'Company'},
    {slug:'environment', title:'Environmental footprint',type:'editorial', nav:'Company'},
    {slug:'value-chain', title:'Value chain',            type:'editorial', nav:'Company'},
    {slug:'people',      title:'People & culture',       type:'editorial', nav:'Company'},
    {slug:'faq',         title:'FAQ',                    type:'faq',       nav:'Let us help'},
    {slug:'terms',       title:'Terms & conditions',     type:'legal',     nav:'Let us help'},
    {slug:'privacy',     title:'Privacy',                type:'legal',     nav:'Let us help'},
    {slug:'returns',     title:'Returns',                type:'legal',     nav:'Let us help'},
    {slug:'contact',     title:'Contact us',             type:'contact',   nav:'Let us help'},
    {slug:'cookies',     title:'Cookie policy',          type:'legal',     nav:'Legal'},
    {slug:'accessibility',title:'Accessibility',         type:'legal',     nav:'Legal'},
  ];

  const TODO='Replace this with your own wording.';
  const LEGAL_NOTE='This page needs your own wording — legal text should come from you or your solicitor rather than a template.';

  const DEFAULTS={
    about:{
      standfirst:'We source, brand and deliver promotional merchandise for organisations that care what their merch is made of and where it came from.',
      sections:[
        {h:'What we do',body:'Mojo Promotions runs branded merchandise programmes end to end: sourcing the product, managing the branding, holding the stock and getting it to the people who need it. Our clients come to us when buying merch piecemeal has stopped working.',img:true},
        {h:'How we work',body:'Every product in our range is chosen before it is offered, not listed because a supplier sent a feed. That means a smaller catalogue than most, with a known supply chain behind each item.'},
        {h:'Who we work with',body:TODO},
      ],
      stats:[{v:'2009',l:'Founded'},{v:'40+',l:'Team'},{v:'500+',l:'Clients'},{v:'B Corp',l:'Certified'}],
      cta:{h:'Work with us',b:'Tell us what you are trying to achieve and we will tell you honestly whether we can help.',t:"Let's Talk."},
    },
    environment:{
      standfirst:'Promotional merchandise has a material footprint. Here is ours, what we are doing about it, and where we are still falling short.',
      sections:[
        {h:'Our footprint',body:'We measure scope 1, 2 and 3 emissions annually. The overwhelming majority sits in scope 3 — the products themselves and their freight — which is where the work has to happen.',img:true},
        {h:'What we are doing',body:'Product selection is the biggest lever: recycled and bio-based materials, fewer air freight routes, and rejecting products that cannot be made responsibly. We fund certified reduction projects for what remains.'},
        {h:'Where we fall short',body:'Being straight about this matters more than a good-news page. '+TODO},
      ],
      stats:[{v:'Climate positive',l:'Workforce'},{v:'Ecologi',l:'Reduction partner'},{v:'Annual',l:'Reporting'}],
      cta:{h:'Ask us anything',b:'Happy to share our full reporting and methodology.',t:'Get in touch'},
    },
    'value-chain':{
      standfirst:'Who makes our products, where, and how we check. A short catalogue with a known supply chain behind it.',
      sections:[
        {h:'Supplier standards',body:'Every supplier we buy from is audited against recognised social and environmental standards before we list a single product. We publish which standards and hold the certificates on file.',img:true},
        {h:'Traceability',body:'We record country of manufacture, material composition and certification against every product in our range, and pass it through to the store so buyers can see it at the point of choosing.'},
        {h:'Audits and reviews',body:TODO},
      ],
      stats:[{v:'BSCI / Sedex',l:'Audited'},{v:'100%',l:'Origin recorded'},{v:'Annual',l:'Review cycle'}],
      cta:{h:'Request our supplier list',b:'Available to clients on request.',t:'Contact us'},
    },
    people:{
      standfirst:'The team behind the programmes, and the terms we employ them on.',
      sections:[
        {h:'How we hire',body:TODO,img:true},
        {h:'How we pay',body:'We are an accredited Living Wage Employer. Every role, including entry level and contract positions, is paid at or above the real Living Wage for its location.'},
        {h:'Working here',body:TODO},
      ],
      stats:[{v:'Living Wage',l:'Accredited'},{v:'40+',l:'Team'},{v:'Hybrid',l:'Working'}],
      cta:{h:'Open roles',b:'We list vacancies as they come up.',t:'See openings'},
    },
    faq:{
      standfirst:'The questions we get asked most. If yours is not here, ask us directly.',
      groups:[
        {h:'Ordering',items:[
          {q:'Is there a minimum order quantity?',a:'Minimums are set per product by the supplier and shown on every product page. They vary from 25 to 250 units depending on the item and the branding method.'},
          {q:'How do I get a price?',a:'Prices shown in the store are per unit at the minimum quantity, and drop at higher volumes. Add a product to a project and we will confirm the exact price against your quantity and branding.'},
          {q:'Can I order a sample first?',a:'Yes. Samples can be ordered unbranded, or branded as a pre-production proof. Sample costs are quoted per product and are often credited against the bulk order.'},
        ]},
        {h:'Branding',items:[
          {q:'What branding methods are available?',a:'It depends on the product — screen print, pad print, embroidery, laser engraving and digital transfer are the most common. Each product page lists the methods available, the print area and the number of colours.'},
          {q:'What artwork do you need?',a:'Vector artwork is best: EPS, AI or PDF with fonts outlined. We will tell you if what you have sent will not reproduce well before anything goes to print.'},
          {q:'Will I see a proof before production?',a:'Always. Nothing goes to production without your written approval of a visual, and for most products a technical proof as well.'},
        ]},
        {h:'Delivery',items:[
          {q:'How long does an order take?',a:'Lead times are shown per product and start from the point your order and artwork are both approved. Standard is typically two to three weeks; we will tell you the order-by date for any deadline you give us.'},
          {q:'Can you hit a fixed date?',a:'Mark the date as critical and we will confirm it with the supplier before you commit. If they cannot meet it, you will know before the order is placed rather than after.'},
          {q:'Can you deliver to multiple addresses?',a:'Yes — per-line delivery addresses are supported, including direct-to-recipient fulfilment.'},
        ]},
      ],
    },
    contact:{
      standfirst:'Tell us what you need and we will come back within one working day.',
      offices:[
        {h:'Head office',body:'Address line one\nAddress line two\nTown, Postcode\nUnited Kingdom'},
      ],
      hours:'Monday to Friday, 9am to 5.30pm',
    },
    terms:{
      standfirst:LEGAL_NOTE,
      reviewed:'',
      clauses:[
        {h:'Definitions',body:TODO},{h:'Orders and acceptance',body:TODO},
        {h:'Prices and payment',body:TODO},{h:'Artwork and approvals',body:TODO},
        {h:'Delivery',body:TODO},{h:'Cancellation and changes',body:TODO},
        {h:'Liability',body:TODO},{h:'Governing law',body:TODO},
      ],
    },
    privacy:{
      standfirst:LEGAL_NOTE,
      reviewed:'',
      clauses:[
        {h:'Who we are',body:TODO},{h:'What data we collect',body:TODO},
        {h:'How we use it',body:TODO},{h:'Lawful basis',body:TODO},
        {h:'Who we share it with',body:TODO},{h:'How long we keep it',body:TODO},
        {h:'Your rights',body:TODO},{h:'How to contact us or complain',body:TODO},
      ],
    },
    returns:{
      standfirst:LEGAL_NOTE+' Branded goods are made to order, so a returns policy for merchandise usually differs from standard consumer returns.',
      reviewed:'',
      clauses:[
        {h:'Branded and bespoke goods',body:TODO},{h:'Faulty or damaged goods',body:TODO},
        {h:'Shortages and discrepancies',body:TODO},{h:'How to raise a return',body:TODO},
        {h:'Unbranded stock items',body:TODO},
      ],
    },
    cookies:{
      standfirst:LEGAL_NOTE,
      reviewed:'',
      clauses:[
        {h:'What cookies we use',body:TODO},{h:'Essential cookies',body:TODO},
        {h:'Analytics cookies',body:TODO},{h:'Managing your preferences',body:TODO},
      ],
    },
    accessibility:{
      standfirst:'We want this platform to be usable by everyone who needs it. This page states where we are and how to tell us when we get it wrong.',
      reviewed:'',
      clauses:[
        {h:'Standard we aim for',body:'We aim to meet WCAG 2.2 level AA. '+TODO},
        {h:'Known issues',body:'Being specific here is more useful than claiming full compliance. '+TODO},
        {h:'Assistive technology',body:TODO},
        {h:'Reporting a problem',body:'If something on this site is not accessible to you, tell us and we will fix it. '+TODO},
      ],
    },
  };

  function store(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } }
  function save(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }

  const def=slug=>JSON.parse(JSON.stringify(DEFAULTS[slug]||{}));
  function page(slug){
    const meta=PAGES.find(p=>p.slug===slug); if(!meta) return null;
    const saved=store()[slug]||{};
    return Object.assign({},meta,def(slug),saved);
  }
  function setPage(slug,patch){ const o=store(); o[slug]=Object.assign({},o[slug]||{},patch); save(o); }
  function resetPage(slug){ const o=store(); delete o[slug]; save(o); }
  const isEdited=slug=>Object.prototype.hasOwnProperty.call(store(),slug);

  window.MSSITE={ PAGES, page, setPage, resetPage, isEdited, defaults:def,
    url:slug=>'Merchsmith Page.html?p='+encodeURIComponent(slug) };
})();
