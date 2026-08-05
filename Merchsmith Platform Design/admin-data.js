/* admin-data.js — mock data for the Merchsmith PLATFORM admin (the SaaS operator) */
window.ADMIN = {
  distributors: [
    { id:'acme', name:'Mojo Promotions', initials:'MP', domain:'shop.mojopromotions.com', plan:'Scale', status:'active', since:'Mar 2023',
      mrr:'£1,200', customers:8, suppliers:5, users:6, activeProjects:23, gmv:'£612,400', lastActive:'Online now',
      owner:'Jess Doyle', ownerEmail:'jess@mojopromotions.com', region:'UK', flag:null },
    { id:'brightside', name:'Brightside Promo', initials:'BP', domain:'store.brightsidepromo.com', plan:'Growth', status:'active', since:'Jul 2023',
      mrr:'£750', customers:14, suppliers:7, users:9, activeProjects:31, gmv:'£884,100', lastActive:'12m ago',
      owner:'Marcus Webb', ownerEmail:'marcus@brightsidepromo.com', region:'UK', flag:null },
    { id:'northstar', name:'NorthStar Brand Co', initials:'NS', domain:'merch.northstarbrand.com', plan:'Scale', status:'active', since:'Nov 2022',
      mrr:'£1,200', customers:21, suppliers:9, users:12, activeProjects:47, gmv:'£1,420,000', lastActive:'1h ago',
      owner:'Lena Frost', ownerEmail:'lena@northstarbrand.com', region:'US', flag:null },
    { id:'kober', name:'Köber Werbung', initials:'KW', domain:'shop.kober-werbung.de', plan:'Growth', status:'active', since:'Feb 2024',
      mrr:'€690', customers:11, suppliers:6, users:7, activeProjects:18, gmv:'€512,300', lastActive:'Yesterday',
      owner:'Stefan Köber', ownerEmail:'stefan@kober-werbung.de', region:'DE', flag:null },
    { id:'limelight', name:'Limelight Gifts', initials:'LG', domain:'store.limelightgifts.ie', plan:'Starter', status:'trial', since:'Jun 2026',
      mrr:'£0', customers:2, suppliers:3, users:2, activeProjects:1, gmv:'£3,900', lastActive:'3d ago',
      owner:'Aoife Byrne', ownerEmail:'aoife@limelightgifts.ie', region:'IE', flag:{level:'grey',note:'14-day trial — ends 1 Jul 2026'} },
    { id:'pinnacle', name:'Pinnacle Swag', initials:'PS', domain:'shop.pinnacleswag.com', plan:'Growth', status:'past_due', since:'Sep 2023',
      mrr:'£750', customers:9, suppliers:5, users:5, activeProjects:12, gmv:'£331,800', lastActive:'1w ago',
      owner:'Dwight Carver', ownerEmail:'dwight@pinnacleswag.com', region:'US', flag:{level:'amber',note:'Payment failed — 2 retries remaining'} },
    { id:'verde', name:'Verde Eco Promo', initials:'VE', domain:'store.verdeeco.es', plan:'Scale', status:'active', since:'Apr 2024',
      mrr:'€1,150', customers:17, suppliers:8, users:10, activeProjects:29, gmv:'€701,500', lastActive:'4h ago',
      owner:'Carla Ríos', ownerEmail:'carla@verdeeco.es', region:'ES', flag:null },
    { id:'tartan', name:'Tartan Trade Gifts', initials:'TT', domain:'shop.tartantrade.co.uk', plan:'Starter', status:'active', since:'Jan 2025',
      mrr:'£250', customers:4, suppliers:3, users:3, activeProjects:6, gmv:'£74,200', lastActive:'2d ago',
      owner:'Ruairidh Bain', ownerEmail:'ruairidh@tartantrade.co.uk', region:'UK', flag:null },
    { id:'cobalt', name:'Cobalt Brand Studio', initials:'CB', domain:'merch.cobaltstudio.com', plan:'Growth', status:'suspended', since:'Aug 2023',
      mrr:'£0', customers:6, suppliers:4, users:4, activeProjects:0, gmv:'£198,400', lastActive:'6w ago',
      owner:'Priya Anand', ownerEmail:'priya@cobaltstudio.com', region:'UK', flag:{level:'red',note:'Suspended — account under review'} }
  ],
  suppliers: [
    { id:'xd', name:'XD Connects', initials:'XD', domain:'xdconnects.com', kind:'both', feed:'API · Xindao V7', products:8200, status:'active', region:'NL', usedBy:7, lead:'8 working days', since:'2021' },
    { id:'pf', name:'PF Concept', initials:'PF', domain:'pfconcept.com', kind:'both', feed:'API · feed', products:11400, status:'active', region:'NL', usedBy:6, lead:'9 working days', since:'2021' },
    { id:'midocean', name:'Mid Ocean Brands', initials:'MO', domain:'midocean.com', kind:'both', feed:'API · feed', products:9700, status:'active', region:'NL', usedBy:5, lead:'10 working days', since:'2022' },
    { id:'senator', name:'Senator', initials:'SN', domain:'senator.com', kind:'both', feed:'Manual + API', products:1400, status:'active', region:'DE', usedBy:4, lead:'12 working days', since:'2022' },
    { id:'printhouse', name:'PrintHouse Studio', initials:'PH', kind:'branding', domain:'printhouse.co', feed:'Manual · decoration', products:0, status:'active', region:'UK', usedBy:3, lead:'5 working days', since:'2021' },
    { id:'inkwell', name:'Inkwell Print', initials:'IP', kind:'branding', domain:'inkwellprint.co.uk', feed:'Manual · decoration', products:0, status:'pending', region:'UK', usedBy:1, lead:'7 working days', since:'2026' },
    { id:'greenstock', name:'GreenStock', initials:'GS', kind:'both', domain:'greenstock.eco', feed:'API · feed', products:480, status:'active', region:'UK', usedBy:2, lead:'10 working days', since:'2023' }
  ],
  stats: { distributors:9, activeDistributors:7, suppliers:7, mrr:'£6,840', gmv:'£5.4M', trials:1 },
  plans: [
    { id:'starter', name:'Starter', price:'£250', period:'/mo', tagline:'Solo distributors getting started',
      features:['Up to 5 customer orgs','3 supplier connections','1,000 products','Email support'], count:2, color:'#8a8d8f' },
    { id:'growth', name:'Growth', price:'£750', period:'/mo', tagline:'Growing teams & catalogues', popular:true,
      features:['Up to 25 customer orgs','Unlimited suppliers','25,000 products','Priority support','Custom colourway'], count:4, color:'#7b85c5' },
    { id:'scale', name:'Scale', price:'£1,200', period:'/mo', tagline:'High-volume distributors',
      features:['Unlimited customer orgs','Unlimited suppliers','Full catalogue','Dedicated CSM','SSO & audit logs','API access'], count:3, color:'#2f8f5b' }
  ],
  team: [
    { n:'Morgan Slade', role:'Owner', title:'Platform Operator', email:'morgan@merchsmith.com', last:'Online now', status:'active' },
    { n:'Devin Park', role:'Admin', title:'Head of Ops', email:'devin@merchsmith.com', last:'20m ago', status:'active' },
    { n:'Sasha Hill', role:'Support', title:'Customer Success', email:'sasha@merchsmith.com', last:'1h ago', status:'active' },
    { n:'Theo Mensah', role:'Billing', title:'Finance', email:'theo@merchsmith.com', last:'Yesterday', status:'active' },
    { n:'Ruth Ellory', role:'Support', title:'Onboarding', email:'ruth@merchsmith.com', last:'Invited', status:'invited' }
  ],
  activity: [
    { who:'NorthStar Brand Co', txt:'upgraded to Scale plan', when:'2h ago', kind:'up' },
    { who:'Limelight Gifts', txt:'started a 14-day trial', when:'5h ago', kind:'trial' },
    { who:'Pinnacle Swag', txt:'payment failed — past due', when:'1d ago', kind:'alert' },
    { who:'Verde Eco Promo', txt:'added 3 new customer orgs', when:'1d ago', kind:'info' },
    { who:'XD Connects', txt:'product feed synced (8,200 items)', when:'2d ago', kind:'info' },
    { who:'Cobalt Brand Studio', txt:'suspended — under review', when:'3d ago', kind:'alert' }
  ],
  mrrSeries: [3100,3450,3900,4200,4600,5050,5400,5720,6050,6300,6600,6840]
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
