/* org-data.js — mock organisations, users, suppliers for the Organisations area */
window.ORG_DATA = {
  customers: [
    { id:'citrix', name:'Citrix', initials:'CX', domain:'citrix.com', status:'active', since:'Mar 2024',
      legalName:'Citrix Systems UK Ltd', vat:'GB 690 3718 44', website:'citrix.com', phone:'01753 276 200', contactName:'Sara Kemp', contactEmail:'brand@citrix.com', about:'Secure digital workspace software for organisations of every size.',
      address:'Citrix House, 3 Hamilton Place, Chertsey, KT16 9GP', addr1:'Citrix House', addr2:'3 Hamilton Place', city:'Chertsey', county:'', postcode:'KT16 9GP', country:'United Kingdom',
      projects:6, openApprovals:3, standingDiscount:'7.5%', addresses:3,
      totalOrders:21, lastOrder:'12 Sep 2026', totalSpend:'£110,100', spend12:'£68,450', vatApplicable:true, paymentTerms:'30 days from delivery', creditLimit:'£60,000', creditUsed:'£22,400', flag:null,
      service:{ deliveryMet:95, responseSpeed:'3h avg', proofAccuracy:94, ackAccuracy:99 },
      teams:[
    { name:'Finance', users:[
      {n:'Nina Holt', firstName:'Nina', lastName:'Holt', role:'Finance', title:'Finance Manager', email:'nina.holt@citrix.com', tel:'+44 7700 900188', last:'Yesterday', status:'active', joined:'Apr 2024', site:'Chertsey', notify:{email:true,sms:false,weekly:true}, costCentre:'FIN-200'} ]},
    { name:'Marketing', users:[
      {n:'Sara Kemp', firstName:'Sara', lastName:'Kemp', role:'Admin', title:'Head of Brand', email:'sara.kemp@canalrivertrust.org.uk', tel:'+44 7700 900112', last:'2h ago', status:'active', photo:'assets/avatars/av2.jpg',
        joined:'Mar 2024', site:'Manchester HQ', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'MKT-100', defaultAddress:'Northwind House, 14 Quay Street, Manchester M3 4EN',
        stats:{projects:12,approvals:34,orders:9,spend:'£48,200'}},
      {n:'Leo Tran', firstName:'Leo', lastName:'Tran', role:'Buyer', title:'Marketing Coordinator', email:'leo.tran@canalrivertrust.org.uk', tel:'+44 7700 900145', last:'Yesterday', status:'active',
        joined:'Jun 2024', site:'Manchester HQ', twofa:false, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'MKT-100', defaultAddress:'Northwind House, 14 Quay Street, Manchester M3 4EN',
        stats:{projects:6,approvals:11,orders:5,spend:'£17,400'}},
      {n:'Amy Frost', firstName:'Amy', lastName:'Frost', role:'Viewer', title:'Social Media Exec', email:'amy.frost@canalrivertrust.org.uk', tel:'', last:'3d ago', status:'active',
        joined:'Jan 2025', site:'Remote', twofa:false, sso:false, notify:{email:true,sms:false,weekly:false}, costCentre:'MKT-100', defaultAddress:'—',
        stats:{projects:3,approvals:0,orders:0,spend:'£0'}}
    ]},
    { name:'HR & People', users:[
      {n:'Priya Nair', firstName:'Priya', lastName:'Nair', role:'Buyer', title:'People Ops Lead', email:'priya.nair@canalrivertrust.org.uk', tel:'+44 7700 900188', last:'4h ago', status:'active',
        joined:'Sep 2024', site:'London', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'HR-200', defaultAddress:'1 Mission Court, London EC2A 4PT',
        stats:{projects:4,approvals:8,orders:4,spend:'£12,900'}},
      {n:'Owen Doyle', firstName:'Owen', lastName:'Doyle', role:'Viewer', title:'HR Assistant', email:'owen.doyle@canalrivertrust.org.uk', tel:'', last:'Invited', status:'invited',
        joined:'—', site:'London', twofa:false, sso:false, notify:{email:true,sms:false,weekly:false}, costCentre:'HR-200', defaultAddress:'—',
        stats:{projects:0,approvals:0,orders:0,spend:'£0'}}
    ]},
    { name:'Events', users:[
      {n:'Marcus Webb', firstName:'Marcus', lastName:'Webb', role:'Buyer', title:'Events Manager', email:'marcus.webb@canalrivertrust.org.uk', tel:'+44 7700 900203', last:'1w ago', status:'active',
        joined:'Nov 2023', site:'Bristol', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'EVT-300', defaultAddress:'Harbourside Studios, Bristol BS1 5TT',
        stats:{projects:8,approvals:19,orders:7,spend:'£31,600'}}
    ]}
  ],
      products:[ {name:'Recycled Cotton Tote', orders:5, qty:3200, value:'£14,900'}, {name:'Autumn Giveaways bundle', orders:3, qty:1800, value:'£21,600'} ],
      comments:[ {who:'Cara Lyon', role:'Account Manager', when:'4 days ago', text:'Citrix is the demo customer account — the customer view logs in as Sara Kemp.', pinned:true} ]},
    { id:'northwind', name:'Northwind Ltd', initials:'NW', domain:'northwind.com', status:'active', since:'Mar 2024',
      address:'Northwind House, 14 Quay Street, Manchester, M3 4EN', addr1:'Northwind House', addr2:'14 Quay Street', city:'Manchester', county:'', postcode:'M3 4EN', country:'United Kingdom',
      projects:7, openApprovals:2, standingDiscount:'7.5%', addresses:2,
      totalOrders:34, lastOrder:'8 Jun 2026', totalSpend:'£128,450', paymentTerms:'30 days from delivery', creditLimit:'£50,000', creditUsed:'£18,200', flag:null,
      service:{ deliveryMet:96, responseSpeed:'4h avg', proofAccuracy:92, ackAccuracy:98 },
      teams:[
        { name:'Marketing', users:[
      {n:'Hana Ito', firstName:'Hana', lastName:'Ito', role:'Admin', title:'Head of Brand', email:'hana.ito@northwind.com', tel:'+44 161 555 0190', last:'Yesterday', status:'active', joined:'Mar 2024', site:'Manchester', twofa:true, sso:false, notify:{email:true,sms:false,weekly:true}, costCentre:'BR-01', defaultAddress:'Northwind House, 14 Quay Street, Manchester M3 4EN', stats:{projects:4,approvals:11,orders:6,spend:'£21,600'}},
          {n:'Sara Kemp', firstName:'Sara', lastName:'Kemp', role:'Admin', title:'Head of Brand', email:'sara.kemp@northwind.com', tel:'+44 7700 900112', last:'2h ago', status:'active'},
          {n:'Leo Tran', firstName:'Leo', lastName:'Tran', role:'Buyer', title:'Marketing Coordinator', email:'leo.tran@northwind.com', tel:'+44 7700 900145', last:'Yesterday', status:'active'}
        ]},
        { name:'HR', users:[
          {n:'Priya Nair', firstName:'Priya', lastName:'Nair', role:'Buyer', title:'People Ops', email:'priya.nair@northwind.com', tel:'+44 7700 900188', last:'3d ago', status:'active'},
          {n:'Owen Doyle', firstName:'Owen', lastName:'Doyle', role:'Buyer', title:'HR Assistant', email:'owen.doyle@northwind.com', tel:'', last:'Invited', status:'invited'}
        ]}
      ],
      products:[
        {name:'Recycled Cotton Tote', orders:9, qty:7400, value:'£23,800'},
        {name:'Eco Wheat-Straw Cable', orders:6, qty:3100, value:'£19,200'},
        {name:'Hoton A5 Notebook', orders:5, qty:2600, value:'£9,400'}
      ],
      comments:[
        {who:'Cara Lyon', role:'Account Manager', when:'2 days ago', text:'Standing discount reviewed up to 7.5% for FY26 — confirmed with Sara.', pinned:true},
        {who:'Jess Doyle', role:'Admin', when:'1 week ago', text:'Northwind moving more spend to recycled lines — flag eco alternatives.', pinned:false}
      ]},
    { id:'volt', name:'Volt Studios', initials:'VS', domain:'voltstudios.io', status:'active', since:'Jan 2025',
      address:'Unit 5, Brick Lane Studios, London, E1 6QL', addr1:'Unit 5', addr2:'Brick Lane Studios', city:'London', county:'', postcode:'E1 6QL', country:'United Kingdom',
      projects:4, openApprovals:0, standingDiscount:'5%', addresses:1,
      totalOrders:11, lastOrder:'2 Jun 2026', totalSpend:'£41,900', paymentTerms:'Pay at ordering', creditLimit:'£10,000', creditUsed:'£0', flag:null,
      service:{ deliveryMet:100, responseSpeed:'2h avg', proofAccuracy:97, ackAccuracy:100 },
      teams:[ { name:'General', users:[
        {n:'Mia Bell', firstName:'Mia', lastName:'Bell', role:'Admin', title:'Studio Manager', email:'mia@voltstudios.io', tel:'+44 7700 900233', last:'1h ago', status:'active'},
        {n:'Jonah Webb', firstName:'Jonah', lastName:'Webb', role:'Buyer', title:'Producer', email:'jonah@voltstudios.io', tel:'', last:'5d ago', status:'active'}
      ]} ],
      products:[ {name:'Tech Travel Bag', orders:4, qty:900, value:'£18,400'}, {name:'Prodir Pen', orders:3, qty:5000, value:'£12,100'} ],
      comments:[ {who:'Ben Shaw', role:'Account Manager', when:'3 days ago', text:'Volt always pay on order — fast, low-risk account.', pinned:true} ]},
    { id:'fernlea', name:'Fernlea Foods', initials:'FF', domain:'fernleafoods.co.uk', status:'active', since:'Sep 2023',
      address:'Fernlea Park, Honiton, Devon, EX14 1QR', addr1:'Fernlea Park', addr2:'', city:'Honiton', county:'Devon', postcode:'EX14 1QR', country:'United Kingdom',
      projects:6, openApprovals:1, standingDiscount:'10%', addresses:3,
      totalOrders:22, lastOrder:'30 May 2026', totalSpend:'£87,300', paymentTerms:'30 days from delivery', creditLimit:'£40,000', creditUsed:'£12,750', flag:{level:'amber', note:'2 invoices paid late in last 6 months'},
      service:{ deliveryMet:88, responseSpeed:'1d avg', proofAccuracy:90, ackAccuracy:94 },
      teams:[ { name:'Events', users:[
        {n:'Hannah Ross', firstName:'Hannah', lastName:'Ross', role:'Admin', title:'Events Lead', email:'hannah.ross@fernleafoods.co.uk', tel:'+44 7700 900277', last:'Today', status:'active'}
      ]}, { name:'Retail', users:[
        {n:'Sam Okafor', firstName:'Sam', lastName:'Okafor', role:'Buyer', title:'Retail Marketing', email:'sam.okafor@fernleafoods.co.uk', tel:'+44 7700 900290', last:'1w ago', status:'active'}
      ]} ],
      products:[ {name:'Seed Pencil Set', orders:7, qty:12000, value:'£28,900'}, {name:'Desktop Garden', orders:5, qty:1800, value:'£21,400'}, {name:'Recycled Cotton Tote', orders:4, qty:3200, value:'£11,600'} ],
      comments:[ {who:'Cara Lyon', role:'Account Manager', when:'5 days ago', text:'Chased late invoice #4471 — Hannah confirmed payment run on 15th.', pinned:true} ]},
    { id:'brightpath', name:'BrightPath Charity', initials:'BP', domain:'brightpath.org', status:'active', since:'May 2024',
      address:'2 Mission Court, Bristol, BS1 5TF', addr1:'2 Mission Court', addr2:'', city:'Bristol', county:'', postcode:'BS1 5TF', country:'United Kingdom',
      projects:3, openApprovals:0, standingDiscount:'12%', addresses:1,
      totalOrders:8, lastOrder:'12 May 2026', totalSpend:'£19,650', paymentTerms:'30 days from delivery', creditLimit:'£15,000', creditUsed:'£2,300', flag:null,
      service:{ deliveryMet:94, responseSpeed:'6h avg', proofAccuracy:95, ackAccuracy:96 },
      teams:[ { name:'Fundraising', users:[ {n:'Dana Vale', firstName:'Dana', lastName:'Vale', role:'Admin', title:'Fundraising Manager', email:'dana@brightpath.org', tel:'+44 7700 900301', last:'4h ago', status:'active'} ]} ],
      products:[ {name:'Recycled Cotton Tote', orders:4, qty:2000, value:'£7,200'}, {name:'Seed Pencil Set', orders:3, qty:3000, value:'£8,100'} ],
      comments:[ {who:'Jess Doyle', role:'Admin', when:'2 weeks ago', text:'Charity rate — 12% standing discount agreed.', pinned:true} ]},
    { id:'craftly', name:'Craftly Co', initials:'CC', domain:'craftly.co', status:'pending', since:'Jun 2026',
      address:'—',
      projects:0, openApprovals:0, standingDiscount:'—', addresses:0,
      totalOrders:0, lastOrder:'—', totalSpend:'£0', paymentTerms:'Pay at ordering', creditLimit:'£0', creditUsed:'£0', flag:{level:'grey', note:'Invitation pending — not yet onboarded'},
      service:null,
      teams:[ { name:'General', users:[ {n:'Ade Bello', firstName:'Ade', lastName:'Bello', role:'Admin', title:'Founder', email:'ade@craftly.co', tel:'', last:'Invited', status:'invited'} ]} ],
      products:[], comments:[] },
    { id:'meridian', name:'Meridian Bank', initials:'MB', domain:'meridianbank.com', status:'active', since:'Nov 2023',
      address:'1 Cornhill, London, EC3V 3ND', addr1:'1 Cornhill', addr2:'', city:'London', county:'', postcode:'EC3V 3ND', country:'United Kingdom',
      projects:2, openApprovals:0, standingDiscount:'5%', addresses:4,
      totalOrders:17, lastOrder:'21 Apr 2026', totalSpend:'£64,200', paymentTerms:'30 days from delivery', creditLimit:'£75,000', creditUsed:'£8,400', flag:null,
      service:{ deliveryMet:91, responseSpeed:'1d avg', proofAccuracy:93, ackAccuracy:97 },
      teams:[ { name:'Internal Comms', users:[ {n:'Ruth Vance', firstName:'Ruth', lastName:'Vance', role:'Admin', title:'Comms Director', email:'ruth.vance@meridianbank.com', tel:'+44 7700 900345', last:'2d ago', status:'active'} ]} ],
      products:[ {name:'Cork Cover Notebook', orders:6, qty:4200, value:'£24,800'}, {name:'Prodir Pen', orders:5, qty:9000, value:'£18,600'} ],
      comments:[] },
    { id:'oakhill', name:'Oakhill School', initials:'OS', domain:'oakhill.sch.uk', status:'active', since:'Feb 2025',
      address:'Oakhill Road, Sutton, SM1 3AW', addr1:'Oakhill Road', addr2:'', city:'Sutton', county:'', postcode:'SM1 3AW', country:'United Kingdom',
      projects:1, openApprovals:0, standingDiscount:'15%', addresses:1,
      totalOrders:3, lastOrder:'18 Mar 2026', totalSpend:'£6,400', paymentTerms:'Pay at ordering', creditLimit:'£5,000', creditUsed:'£0', flag:null,
      service:{ deliveryMet:100, responseSpeed:'1d avg', proofAccuracy:100, ackAccuracy:100 },
      teams:[ { name:'General', users:[ {n:'Tom Friar', firstName:'Tom', lastName:'Friar', role:'Admin', title:'Business Manager', email:'tfriar@oakhill.sch.uk', tel:'', last:'2w ago', status:'active'} ]} ],
      products:[ {name:'Heavy Weight T-Shirt', orders:3, qty:600, value:'£6,400'} ],
      comments:[] },
    { id:'lumio', name:'Lumio Tech', initials:'LT', domain:'lumio.tech', status:'active', since:'Aug 2025',
      address:'Tech Hub, 30 Station Road, Cambridge, CB1 2JX', addr1:'Tech Hub', addr2:'30 Station Road', city:'Cambridge', county:'', postcode:'CB1 2JX', country:'United Kingdom',
      projects:0, openApprovals:0, standingDiscount:'5%', addresses:1,
      totalOrders:1, lastOrder:'5 Feb 2026', totalSpend:'£2,100', paymentTerms:'Pay at ordering', creditLimit:'£10,000', creditUsed:'£0', flag:null,
      service:{ deliveryMet:100, responseSpeed:'3h avg', proofAccuracy:100, ackAccuracy:100 },
      teams:[ { name:'People', users:[ {n:'Erin Shaw', firstName:'Erin', lastName:'Shaw', role:'Buyer', title:'People Partner', email:'erin@lumio.tech', tel:'', last:'3w ago', status:'active'} ]} ],
      products:[ {name:'Eco Wheat-Straw Cable', orders:1, qty:300, value:'£2,100'} ],
      comments:[] }
  ],
  suppliers: [
    { id:'bagworks', name:'BagWorks UK', initials:'BW', kind:'both', domain:'bagworks.co.uk', status:'active',
      legalName:'BagWorks UK Ltd', vat:'GB 221 8049 17', website:'bagworks.co.uk', phone:'01772 830 441', contactName:'Tom Reed', contactEmail:'orders@bagworks.co.uk', about:'Cotton, jute and recycled bags made to order, with in-house print.',
      address:'BagWorks Mill, Ancoats, Manchester, M4 6DE', addr1:'BagWorks Mill', addr2:'Ancoats', city:'Manchester', county:'', postcode:'M4 6DE', country:'United Kingdom',
      lead:'6 working days', feed:'API feed · 1,240 products', products:1240, since:'2022',
      totalOrders:48, lastOrder:'9 Jun 2026', totalSpend:'£186,400', paymentTerms:'30 days from invoice', flag:null,
      service:{ deliveryMet:97, responseSpeed:'3h avg', proofAccuracy:96, ackAccuracy:99 },
      productList:[
        {name:'Recycled Cotton Tote', sku:'BW-TOTE-01', inStore:true, orders:21, qty:14200, value:'£44,800'},
        {name:'Drawstring Bag GRS', sku:'BW-DRW-04', inStore:true, orders:12, qty:8800, value:'£21,300'},
        {name:'Canvas Shopper XL', sku:'BW-CNV-09', inStore:false, orders:6, qty:2400, value:'£9,100'}
      ],
      contacts:[ {n:'Eve Marsh', firstName:'Eve', lastName:'Marsh', role:'Contact', title:'Account Manager', email:'eve@bagworks.co.uk', tel:'+44 161 555 0121', last:'2h ago', status:'active'},
                 {n:'Tom Reed', firstName:'Tom', lastName:'Reed', role:'Contact', title:'Production', email:'tom@bagworks.co.uk', tel:'+44 161 555 0102', last:'Today', status:'active'},
                 {n:'Dana Vale', firstName:'Dana', lastName:'Vale', role:'Contact', title:'Sales', email:'dana@bagworks.co.uk', tel:'+44 161 555 0144', last:'1w ago', status:'active'} ],
      comments:[ {who:'Jess Doyle', role:'Admin', when:'4 days ago', text:'Reliable on lead times — good go-to for tote blanks.', pinned:true} ]},
    { id:'printhouse', name:'PrintHouse Studio', initials:'PH', kind:'branding', domain:'printhouse.co', status:'active',
      address:'Print House, 8 Maker Street, Birmingham, B1 1AA', addr1:'Print House', addr2:'8 Maker Street', city:'Birmingham', county:'', postcode:'B1 1AA', country:'United Kingdom',
      lead:'5 working days', feed:'Manual · decoration only', products:0, since:'2021',
      totalOrders:39, lastOrder:'7 Jun 2026', totalSpend:'£92,700', paymentTerms:'30 days from invoice', flag:null,
      service:{ deliveryMet:93, responseSpeed:'2h avg', proofAccuracy:89, ackAccuracy:95 },
      productList:[],
      contacts:[ {n:'Sarah Hill', firstName:'Sarah', lastName:'Hill', role:'Contact', title:'Account Manager', email:'sarah@printhouse.co', tel:'+44 121 555 0188', last:'2h ago', status:'active'},
                 {n:'Priya Shah', firstName:'Priya', lastName:'Shah', role:'Contact', title:'Estimating', email:'priya@printhouse.co', tel:'', last:'4d ago', status:'active'} ],
      comments:[ {who:'Raf Price', role:'Studio', when:'1 week ago', text:'Proof accuracy slipped on last 2 jobs — keep an eye on colour matching.', pinned:true} ]},
    { id:'greenstock', name:'GreenStock', initials:'GS', kind:'product', domain:'greenstock.eco', status:'active',
      address:'Green Park, Otley Road, Leeds, LS16 5PS', addr1:'Green Park', addr2:'Otley Road', city:'Leeds', county:'', postcode:'LS16 5PS', country:'United Kingdom',
      lead:'10 working days', feed:'API feed · 480 products', products:480, since:'2023',
      totalOrders:26, lastOrder:'1 Jun 2026', totalSpend:'£74,100', paymentTerms:'Pro-forma', flag:{level:'amber', note:'Longer lead times — confirm stock before promising dates'},
      service:{ deliveryMet:84, responseSpeed:'1d avg', proofAccuracy:94, ackAccuracy:90 },
      productList:[
        {name:'Seed Pencil Set', sku:'GS-SEED-02', inStore:true, orders:14, qty:30000, value:'£38,400'},
        {name:'Desktop Garden', sku:'GS-GARDEN-01', inStore:true, orders:8, qty:3600, value:'£24,900'},
        {name:'Bamboo Cutlery Set', sku:'GS-BAM-07', inStore:false, orders:4, qty:5000, value:'£10,800'}
      ],
      contacts:[ {n:'Marco Diaz', firstName:'Marco', lastName:'Diaz', role:'Contact', title:'Account Manager', email:'marco@greenstock.eco', tel:'+44 113 555 0210', last:'Yesterday', status:'active'} ],
      comments:[] },
    { id:'lumen', name:'Lumen Supplies', initials:'LM', kind:'both', domain:'lumensupplies.com', status:'active',
      address:'Lumen House, 200 Gray’s Inn Road, London, WC1X 8XZ', addr1:'Lumen House', addr2:'200 Gray’s Inn Road', city:'London', county:'', postcode:'WC1X 8XZ', country:'United Kingdom',
      lead:'8 working days', feed:'API feed · 2,010 products', products:2010, since:'2020',
      totalOrders:61, lastOrder:'8 Jun 2026', totalSpend:'£241,900', paymentTerms:'30 days from invoice', flag:null,
      service:{ deliveryMet:95, responseSpeed:'5h avg', proofAccuracy:97, ackAccuracy:98 },
      productList:[
        {name:'Eco Wheat-Straw Cable', sku:'LM-CABLE-11', inStore:true, orders:18, qty:9200, value:'£58,200'},
        {name:'Prodir Pen', sku:'LM-PEN-03', inStore:true, orders:22, qty:48000, value:'£62,400'},
        {name:'Cork Cover Notebook', sku:'LM-CORK-05', inStore:true, orders:9, qty:6200, value:'£34,100'},
        {name:'Wireless Charger', sku:'LM-CHG-12', inStore:false, orders:5, qty:1800, value:'£14,700'}
      ],
      contacts:[ {n:'Aisha Khan', firstName:'Aisha', lastName:'Khan', role:'Contact', title:'Production', email:'aisha@lumensupplies.com', tel:'+44 207 555 0299', last:'3d ago', status:'active'} ],
      comments:[ {who:'Ben Shaw', role:'Account Manager', when:'6 days ago', text:'Biggest supplier by spend — priority support line agreed.', pinned:true} ]},
    { id:'inkwell', name:'Inkwell Print', initials:'IP', kind:'branding', domain:'inkwellprint.co.uk', status:'pending',
      address:'—',
      lead:'7 working days', feed:'Manual · decoration only', products:0, since:'2026',
      totalOrders:0, lastOrder:'—', totalSpend:'£0', paymentTerms:'Pro-forma', flag:{level:'grey', note:'Onboarding — not yet approved for orders'},
      service:null,
      productList:[],
      contacts:[ {n:'Greg Mott', firstName:'Greg', lastName:'Mott', role:'Contact', title:'Owner', email:'greg@inkwellprint.co.uk', tel:'', last:'Invited', status:'invited'} ],
      comments:[] }
  ],
  // Mojo Promotions' own people, grouped by team. The Team page and the Organisations
  // page both read this — there is no second copy.
  mojoTeams: [
    { name:'Leadership', users:[
      {n:'Jess Doyle', firstName:'Jess', lastName:'Doyle', role:'Admin', title:'Managing Director', email:'jess@mojopromotions.co.uk', tel:'+44 7700 800100', last:'Online', status:'active',
        joined:'2019', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'—', defaultAddress:'Mojo House, Wellington Street, Leeds LS1 4DL',
        stats:{accounts:0,projects:48,quotes:120,won:'£1.2M'}}
    ]},
    { name:'Finance', users:[
      {n:'Mara Whitfield', firstName:'Mara', lastName:'Whitfield', role:'Admin', title:'Finance Manager', email:'mara@mojopromotions.co.uk', tel:'+44 7700 800120', last:'3h ago', status:'active',
        joined:'2020', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'FIN-01', defaultAddress:'Mojo House, Wellington Street, Leeds LS1 4DL',
        stats:{accounts:0,projects:6,quotes:0,won:'—'}}
    ]},
    { name:'Account Management', users:[
      {n:'Cara Lyon', firstName:'Cara', lastName:'Lyon', role:'Account Manager', title:'Senior Account Manager', email:'cara@mojopromotions.co.uk', tel:'+44 7700 800140', last:'1h ago', status:'active',
        joined:'2021', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:14,projects:31,quotes:78,won:'£420k'}},
      {n:'Ben Shaw', firstName:'Ben', lastName:'Shaw', role:'Account Manager', title:'Account Manager', email:'ben@mojopromotions.co.uk', tel:'+44 7700 800160', last:'Today', status:'active',
        joined:'2022', site:'Remote', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:11,projects:22,quotes:54,won:'£318k'}},
      {n:'Will About', firstName:'Will', lastName:'About', role:'Account Manager', title:'New Business', email:'will@mojopromotions.co.uk', tel:'', last:'Invited', status:'invited',
        joined:'—', site:'Leeds HQ', twofa:false, sso:false, notify:{email:true,sms:false,weekly:false}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:0,quotes:0,won:'£0'}}
    ]},
    { name:'Studio', users:[
      {n:'Alex Stone', firstName:'Alex', lastName:'Stone', role:'Studio', title:'Artworker', email:'alex@mojopromotions.co.uk', tel:'+44 7700 800175', last:'Today', status:'active',
        joined:'2023', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:22,quotes:0,won:'—'}},
      {n:'Raf Price', firstName:'Raf', lastName:'Price', role:'Studio', title:'Senior Designer', email:'raf@mojopromotions.co.uk', tel:'+44 7700 800120', last:'15m ago', status:'active',
        joined:'2020', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:64,quotes:0,won:'—'}},
      {n:'Nia Patel', firstName:'Nia', lastName:'Patel', role:'Studio', title:'Junior Designer', email:'nia@mojopromotions.co.uk', tel:'', last:'2d ago', status:'active',
        joined:'2024', site:'Leeds HQ', twofa:false, sso:true, notify:{email:true,sms:false,weekly:false}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:28,quotes:0,won:'—'}}
    ]}
  ]
};

