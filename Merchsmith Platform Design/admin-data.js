/* admin-data.js — mock data for the Merchsmith PLATFORM admin (the SaaS operator) */
window.ADMIN = {
  distributors: [
    { id:'acme', name:'Mojo Promotions', initials:'MP', domain:'shop.mojopromotions.com', plan:'Scale', status:'active', since:'Mar 2023',
      mrr:'£1,200', customers:8, suppliers:5, users:12, seats:12, cur:'£', activeProjects:23, gmv:'£612,400', lastActive:'Online now',
      owner:'Jess Doyle', ownerEmail:'jess@mojopromotions.com', region:'UK', flag:null,
      legalName:'Mojo Promotions Ltd', vat:'GB 947 1203 55', website:'mojopromotions.co.uk', phone:'0117 330 6120',
      contactName:'Jess Doyle', contactEmail:'hello@mojopromotions.co.uk', about:'Sustainable promotional merchandise, branded in-house and delivered on time.' },
    { id:'brightside', name:'Brightside Promo', initials:'BP', domain:'store.brightsidepromo.com', plan:'Growth', status:'active', since:'Jul 2023',
      mrr:'£750', customers:14, suppliers:7, users:9, seats:9, cur:'£', activeProjects:31, gmv:'£884,100', lastActive:'12m ago',
      owner:'Marcus Webb', ownerEmail:'marcus@brightsidepromo.com', region:'UK', flag:null },
    { id:'northstar', name:'NorthStar Brand Co', initials:'NS', domain:'merch.northstarbrand.com', plan:'Scale', status:'active', since:'Nov 2022',
      mrr:'£1,200', customers:21, suppliers:9, users:18, seats:18, cur:'£', activeProjects:47, gmv:'£1,420,000', lastActive:'1h ago',
      owner:'Lena Frost', ownerEmail:'lena@northstarbrand.com', region:'US', flag:null },
    { id:'kober', name:'Köber Werbung', initials:'KW', domain:'shop.kober-werbung.de', plan:'Growth', status:'active', since:'Feb 2024',
      mrr:'€690', customers:11, suppliers:6, users:7, seats:7, cur:'€', activeProjects:18, gmv:'€512,300', lastActive:'Yesterday',
      owner:'Stefan Köber', ownerEmail:'stefan@kober-werbung.de', region:'DE', flag:null },
    { id:'limelight', name:'Limelight Gifts', initials:'LG', domain:'store.limelightgifts.ie', plan:'Starter', status:'active', since:'Jun 2026',
      mrr:'£250', customers:2, suppliers:3, users:2, seats:2, cur:'£', activeProjects:1, gmv:'£3,900', lastActive:'3d ago',
      owner:'Aoife Byrne', ownerEmail:'aoife@limelightgifts.ie', region:'IE', flag:{level:'grey',note:'Recently onboarded — first store still being set up'} },
    { id:'pinnacle', name:'Pinnacle Swag', initials:'PS', domain:'shop.pinnacleswag.com', plan:'Growth', status:'past_due', since:'Sep 2023',
      mrr:'£750', customers:9, suppliers:5, users:8, seats:8, cur:'£', activeProjects:12, gmv:'£331,800', lastActive:'1w ago',
      owner:'Dwight Carver', ownerEmail:'dwight@pinnacleswag.com', region:'US', flag:{level:'amber',note:'Payment failed — 2 retries remaining'} },
    { id:'verde', name:'Verde Eco Promo', initials:'VE', domain:'store.verdeeco.es', plan:'Scale', status:'active', since:'Apr 2024',
      mrr:'€1,150', customers:17, suppliers:8, users:16, seats:16, cur:'€', activeProjects:29, gmv:'€701,500', lastActive:'4h ago',
      owner:'Carla Ríos', ownerEmail:'carla@verdeeco.es', region:'ES', flag:null },
    { id:'tartan', name:'Tartan Trade Gifts', initials:'TT', domain:'shop.tartantrade.co.uk', plan:'Starter', status:'active', since:'Jan 2025',
      mrr:'£250', customers:4, suppliers:3, users:5, seats:5, cur:'£', activeProjects:6, gmv:'£74,200', lastActive:'2d ago',
      owner:'Ruairidh Bain', ownerEmail:'ruairidh@tartantrade.co.uk', region:'UK', flag:null },
    { id:'cobalt', name:'Cobalt Brand Studio', initials:'CB', domain:'merch.cobaltstudio.com', plan:'Growth', status:'suspended', since:'Aug 2023',
      mrr:'£0', customers:6, suppliers:4, users:4, seats:4, cur:'£', activeProjects:0, gmv:'£198,400', lastActive:'6w ago',
      owner:'Priya Anand', ownerEmail:'priya@cobaltstudio.com', region:'UK', flag:{level:'red',note:'Suspended — account under review'} }
  ],
  suppliers: [
    { id:'xd', name:'XD Connects', initials:'XD', domain:'xdconnects.com', kind:'both', feed:'API · Xindao V7', products:8200, status:'active', region:'NL', usedBy:7, lead:'8 working days', since:'2021' },
    { id:'pf', name:'PF Concept', initials:'PF', domain:'pfconcept.com', kind:'both', feed:'API · feed', products:11400, status:'active', region:'NL', usedBy:6, lead:'9 working days', since:'2021' , companyNo:'24394107', addr1:'Voltaweg 2', addr2:'', city:'Hoogeveen', county:'Drenthe', postcode:'7903 AG', country:'Netherlands', addresses:[{id:'a1',title:'European head office',isDefault:true,addr1:'Voltaweg 2',addr2:'',city:'Hoogeveen',county:'Drenthe',postcode:'7903 AG',country:'Netherlands'},{id:'a2',title:'UK office',isDefault:false,addr1:'Unit 4, Brunel Park',addr2:'Vincients Road',city:'Chippenham',county:'Wiltshire',postcode:'SN14 6NQ',country:'United Kingdom'}], specialisms:['Generalist','Drinkware','Bags','Eco & sustainable']},
    { id:'midocean', name:'Mid Ocean Brands', initials:'MO', domain:'midocean.com', kind:'both', feed:'API · feed', products:9700, status:'active', region:'NL', usedBy:5, lead:'10 working days', since:'2022' },
    { id:'senator', name:'Senator', initials:'SN', domain:'senator.com', kind:'both', feed:'Manual + API', products:1400, status:'active', region:'DE', usedBy:4, lead:'12 working days', since:'2022' },
    { id:'printhouse', name:'PrintHouse Studio', initials:'PH', kind:'branding', domain:'printhouse.co', feed:'Manual · decoration', products:0, status:'active', region:'UK', usedBy:3, lead:'5 working days', since:'2021' },
    { id:'inkwell', name:'Inkwell Print', initials:'IP', kind:'branding', domain:'inkwellprint.co.uk', feed:'Manual · decoration', products:0, status:'pending', region:'UK', usedBy:1, lead:'7 working days', since:'2026' },
    { id:'greenstock', name:'GreenStock', initials:'GS', kind:'both', domain:'greenstock.eco', feed:'API · feed', products:480, status:'active', region:'UK', usedBy:2, lead:'10 working days', since:'2023' }
  ],
  stats: { distributors:9, activeDistributors:8, suppliers:7, mrr:'£6,880', gmv:'£5.4M' },
  /* ---------- subscription model: tier + seat overage ----------
     Every tier includes the WHOLE platform. Nothing is feature-gated: customer-org
     count, supplier connections, catalogue size, support, branding, SSO, audit logs
     and API access are identical on all three. Tiers differ ONLY by base price,
     included distributor seats, and the per-seat rate beyond that allowance.

     A SEAT is a billable distributor user — Admin/Owner, Account Manager,
     Studio/Designer, Production Manager, Finance. Customer users and supplier
     users are never billed and never count towards seats, on any tier. */
  plans: [
    { id:'starter', name:'Starter', base:250,  seats:3,  overage:95, price:'£250',   period:'/mo',
      tagline:'Small teams', count:2, color:'var(--blossom)' },
    { id:'growth',  name:'Growth',  base:750,  seats:8,  overage:80, price:'£750',   period:'/mo',
      tagline:'Growing teams', count:4, color:'var(--sky)', popular:true },
    { id:'scale',   name:'Scale',   base:1200, seats:15, overage:65, price:'£1,200', period:'/mo',
      tagline:'Large teams', count:3, color:'var(--spearmint)' }
  ],
  // included on every plan, without exception — the shared panel on Subscriptions
  planIncludes: [
    'Unlimited customer organisations','Unlimited supplier connections','Full product catalogue, no cap',
    'Custom branding &amp; colourway','Own-domain store front','Projects, briefs &amp; approvals',
    'Sample &amp; order management','SSO (SAML / Google)','Audit logs',
    'API access &amp; webhooks','Priority support','Named account manager'
  ],
  // a seat is one of these distributor roles; customer + supplier logins are never billed
  seatRoles: ['Admin / Owner','Account Manager','Studio / Designer','Production Manager','Finance User'],
  team: [
    { n:'Morgan Slade', role:'Owner', title:'Platform Operator', email:'morgan@merchsmith.com', last:'Online now', status:'active'  },
    { n:'Devin Park', role:'Admin', title:'Head of Ops', email:'devin@merchsmith.com', last:'20m ago', status:'active'  },
    { n:'Sasha Hill', role:'Support', title:'Customer Success', email:'sasha@merchsmith.com', last:'1h ago', status:'active'  },
    { n:'Theo Mensah', role:'Billing', title:'Finance', email:'theo@merchsmith.com', last:'Yesterday', status:'active'  },
    { n:'Ruth Ellory', role:'Support', title:'Onboarding', email:'ruth@merchsmith.com', last:'Invited', status:'invited'  }
  ],
  activity: [
    { who:'NorthStar Brand Co', txt:'upgraded to Scale plan', when:'2h ago', kind:'up' },
    { who:'Limelight Gifts', txt:'onboarded on Starter', when:'5h ago', kind:'up' },
    { who:'Pinnacle Swag', txt:'payment failed — past due', when:'1d ago', kind:'alert' },
    { who:'Verde Eco Promo', txt:'added 3 new customer orgs', when:'1d ago', kind:'info' },
    { who:'XD Connects', txt:'product feed synced (8,200 items)', when:'2d ago', kind:'info' },
    { who:'Cobalt Brand Studio', txt:'suspended — under review', when:'3d ago', kind:'alert' }
  ],
  mrrSeries: [3100,3450,3900,4200,4600,5050,5400,5720,6050,6300,6600,6880]
};

/* blank mode — suppress seeded demo data (reversible; see ms-mode.js). Taxonomy kept. */
if(window.MSMODE && MSMODE.isBlank()){
  window.ADMIN.distributors = MSMODE.BLANK_DISTRIBUTORS.slice();
  window.ADMIN.suppliers = MSMODE.BLANK_SUPPLIERS.slice();
  window.ADMIN.team = [];
  window.ADMIN.activity = [];
  window.ADMIN.stats = Object.assign({}, MSMODE.BLANK_STATS);
  window.ADMIN.mrrSeries = [0,0,0,0,0,0,0,0,0,0,0,0];
}

/* invited distributors (Invite distributor form) persist until onboarding */
(function(){ try{ const l=JSON.parse(localStorage.getItem('ms-admin-invited-dists')||'[]');
  l.slice().reverse().forEach(x=>{ if(x&&x.id&&!window.ADMIN.distributors.some(d=>d.id===x.id)) window.ADMIN.distributors.unshift(x); }); }catch(e){}
  try{ const s=JSON.parse(localStorage.getItem('ms-admin-invited-sups')||'[]');
  s.slice().reverse().forEach(x=>{ if(x&&x.id&&!window.ADMIN.suppliers.some(y=>y.id===x.id)) window.ADMIN.suppliers.unshift(x); }); }catch(e){} })();

/* ---------- seat + MRR helpers (derived, never hand-typed) ---------- */
(function(){
  const A=window.ADMIN;
  const NONBILL=['suspended','invited'];                         // paused — nothing collected
  function planFor(dst){ return A.plans.find(p=>p.name===dst.plan)||A.plans[0]; }
  function money(cur,n){ return (cur||'£')+Number(n||0).toLocaleString('en-GB'); }
  // the single place that knows what a distributor is actually charged
  function seatInfo(dst){
    const p=planFor(dst), cur=dst.cur||'£';
    const used=dst.seats==null?(dst.users||0):dst.seats;
    const extra=Math.max(0,used-p.seats);
    const billing=NONBILL.indexOf(dst.status)<0;
    const base=billing?p.base:0, over=billing?extra*p.overage:0;
    return { plan:p, cur, used, included:p.seats, extra, rate:p.overage,
             base, overage:over, total:base+over, billing,
             baseTxt:money(cur,base), overageTxt:money(cur,over),
             totalTxt:money(cur,base+over), rateTxt:money(cur,p.overage) };
  }
  A.planFor=planFor; A.seatInfo=seatInfo; A.money=money;
  // MRR is base + seat overage — recomputed, so the tile can never drift from the model
  A.recalc=function(){
    A.distributors.forEach(dst=>{ dst.mrr=seatInfo(dst).totalTxt; });
    A.stats.mrr=money('£',A.distributors.reduce((s,dst)=>s+seatInfo(dst).total,0));
    A.stats.seatOverage=money('£',A.distributors.reduce((s,dst)=>s+seatInfo(dst).overage,0));
    A.plans.forEach(p=>{ p.count=A.distributors.filter(dst=>dst.plan===p.name).length; });
  };
  A.recalc();
})();

/* Directory fields for the Distributors table: join date, store state, range mode, country,
   last login as a timestamp. Mojo's range mode is read live from ms-dist-range by admin-page.js. */
(function(){
  const X={ acme:['2023-03-14','live','edited'], brightside:['2023-07-03','live','curated'], northstar:['2022-11-21','live','bespoke'],
    kober:['2024-02-08','live','edited'], limelight:['2026-06-17','draft','curated'], pinnacle:['2023-09-26','live','curated'],
    verde:['2024-04-11','live','edited'], tartan:['2025-01-29','live','curated'], cobalt:['2023-08-05','offline','bespoke'] };
  const C={UK:'United Kingdom',US:'United States',DE:'Germany',IE:'Ireland',ES:'Spain',NL:'Netherlands',FR:'France'};
  function ago(s){ s=String(s||'').toLowerCase(); const n=parseInt(s,10)||1, M=60000;
    if(/now/.test(s)) return 0; if(/yesterday/.test(s)) return 1440*M;
    if(/\dm\b|min/.test(s)) return n*M; if(/\dh\b|hour/.test(s)) return n*60*M;
    if(/\dd\b|day/.test(s)) return n*1440*M; if(/\dw\b|week/.test(s)) return n*7*1440*M; return null; }
  const now=Date.now();
  window.ADMIN.distributors.forEach(d=>{ const x=X[d.id]||[];
    if(!d.joined) d.joined=x[0]||null; if(!d.store) d.store=x[1]||'live'; if(!d.rangeMode) d.rangeMode=x[2]||'curated';
    d.country=d.country||C[d.region]||d.region||'';
    const a=ago(d.lastActive); d.lastLoginAt=a==null?null:new Date(now-a).toISOString(); });
  window.ADMIN.countryName=r=>C[r]||r;
})();

/* Seats from real users: Mojo Promotions (id 'acme' here, orgKey 'mojo' in people.js) bills the
   live count of active + invited users in billable roles, recorded by the Team page. */
(function(){ try{ const s=JSON.parse(localStorage.getItem('ms-people')||'null'); const n=s&&s.seats&&s.seats.mojo;
  if(typeof n==='number'){ const d=window.ADMIN.distributors.find(x=>x.id==='acme'); if(d){ d.seats=n; d.users=Math.max(d.users||0,n); } } }catch(e){} })();
