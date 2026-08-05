/* org-data.js — mock organisations, users, suppliers for the Organisations area */
window.ORG_DATA = {
  customers: [
    { id:'northwind', name:'Northwind Ltd', initials:'NW', domain:'northwind.com', status:'active', since:'Mar 2024',
      address:'Northwind House, 14 Quay Street, Manchester, M3 4EN',
      projects:7, openApprovals:2, standingDiscount:'7.5%', addresses:2,
      totalOrders:34, lastOrder:'8 Jun 2026', totalSpend:'£128,450', paymentTerms:'30 days from delivery', creditLimit:'£50,000', creditUsed:'£18,200', flag:null,
      service:{ deliveryMet:96, responseSpeed:'4h avg', proofAccuracy:92, ackAccuracy:98 },
      teams:[
        { name:'Marketing', users:[
          {n:'Sara Kemp', role:'Admin', title:'Head of Brand', email:'sara.kemp@northwind.com', tel:'+44 7700 900112', last:'2h ago', status:'active'},
          {n:'Leo Tran', role:'Buyer', title:'Marketing Coordinator', email:'leo.tran@northwind.com', tel:'+44 7700 900145', last:'Yesterday', status:'active'}
        ]},
        { name:'HR', users:[
          {n:'Priya Nair', role:'Buyer', title:'People Ops', email:'priya.nair@northwind.com', tel:'+44 7700 900188', last:'3d ago', status:'active'},
          {n:'Owen Doyle', role:'Buyer', title:'HR Assistant', email:'owen.doyle@northwind.com', tel:'', last:'Invited', status:'invited'}
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
      address:'Unit 5, Brick Lane Studios, London, E1 6QL',
      projects:4, openApprovals:0, standingDiscount:'5%', addresses:1,
      totalOrders:11, lastOrder:'2 Jun 2026', totalSpend:'£41,900', paymentTerms:'Pay at ordering', creditLimit:'£10,000', creditUsed:'£0', flag:null,
      service:{ deliveryMet:100, responseSpeed:'2h avg', proofAccuracy:97, ackAccuracy:100 },
      teams:[ { name:'General', users:[
        {n:'Mia Bell', role:'Admin', title:'Studio Manager', email:'mia@voltstudios.io', tel:'+44 7700 900233', last:'1h ago', status:'active'},
        {n:'Jonah Webb', role:'Buyer', title:'Producer', email:'jonah@voltstudios.io', tel:'', last:'5d ago', status:'active'}
      ]} ],
      products:[ {name:'Tech Travel Bag', orders:4, qty:900, value:'£18,400'}, {name:'Prodir Pen', orders:3, qty:5000, value:'£12,100'} ],
      comments:[ {who:'Ben Shaw', role:'Account Manager', when:'3 days ago', text:'Volt always pay on order — fast, low-risk account.', pinned:true} ]},
    { id:'fernlea', name:'Fernlea Foods', initials:'FF', domain:'fernleafoods.co.uk', status:'active', since:'Sep 2023',
      address:'Fernlea Park, Honiton, Devon, EX14 1QR',
      projects:6, openApprovals:1, standingDiscount:'10%', addresses:3,
      totalOrders:22, lastOrder:'30 May 2026', totalSpend:'£87,300', paymentTerms:'30 days from delivery', creditLimit:'£40,000', creditUsed:'£12,750', flag:{level:'amber', note:'2 invoices paid late in last 6 months'},
      service:{ deliveryMet:88, responseSpeed:'1d avg', proofAccuracy:90, ackAccuracy:94 },
      teams:[ { name:'Events', users:[
        {n:'Hannah Ross', role:'Admin', title:'Events Lead', email:'hannah.ross@fernleafoods.co.uk', tel:'+44 7700 900277', last:'Today', status:'active'}
      ]}, { name:'Retail', users:[
        {n:'Sam Okafor', role:'Buyer', title:'Retail Marketing', email:'sam.okafor@fernleafoods.co.uk', tel:'+44 7700 900290', last:'1w ago', status:'active'}
      ]} ],
      products:[ {name:'Seed Pencil Set', orders:7, qty:12000, value:'£28,900'}, {name:'Desktop Garden', orders:5, qty:1800, value:'£21,400'}, {name:'Recycled Cotton Tote', orders:4, qty:3200, value:'£11,600'} ],
      comments:[ {who:'Cara Lyon', role:'Account Manager', when:'5 days ago', text:'Chased late invoice #4471 — Hannah confirmed payment run on 15th.', pinned:true} ]},
    { id:'brightpath', name:'BrightPath Charity', initials:'BP', domain:'brightpath.org', status:'active', since:'May 2024',
      address:'2 Mission Court, Bristol, BS1 5TF',
      projects:3, openApprovals:0, standingDiscount:'12%', addresses:1,
      totalOrders:8, lastOrder:'12 May 2026', totalSpend:'£19,650', paymentTerms:'30 days from delivery', creditLimit:'£15,000', creditUsed:'£2,300', flag:null,
      service:{ deliveryMet:94, responseSpeed:'6h avg', proofAccuracy:95, ackAccuracy:96 },
      teams:[ { name:'Fundraising', users:[ {n:'Dana Vale', role:'Admin', title:'Fundraising Manager', email:'dana@brightpath.org', tel:'+44 7700 900301', last:'4h ago', status:'active'} ]} ],
      products:[ {name:'Recycled Cotton Tote', orders:4, qty:2000, value:'£7,200'}, {name:'Seed Pencil Set', orders:3, qty:3000, value:'£8,100'} ],
      comments:[ {who:'Jess Doyle', role:'Admin', when:'2 weeks ago', text:'Charity rate — 12% standing discount agreed.', pinned:true} ]},
    { id:'craftly', name:'Craftly Co', initials:'CC', domain:'craftly.co', status:'pending', since:'Jun 2026',
      address:'—',
      projects:0, openApprovals:0, standingDiscount:'—', addresses:0,
      totalOrders:0, lastOrder:'—', totalSpend:'£0', paymentTerms:'Pay at ordering', creditLimit:'£0', creditUsed:'£0', flag:{level:'grey', note:'Invitation pending — not yet onboarded'},
      service:null,
      teams:[ { name:'General', users:[ {n:'Ade Bello', role:'Admin', title:'Founder', email:'ade@craftly.co', tel:'', last:'Invited', status:'invited'} ]} ],
      products:[], comments:[] },
    { id:'meridian', name:'Meridian Bank', initials:'MB', domain:'meridianbank.com', status:'active', since:'Nov 2023',
      address:'1 Cornhill, London, EC3V 3ND',
      projects:2, openApprovals:0, standingDiscount:'5%', addresses:4,
      totalOrders:17, lastOrder:'21 Apr 2026', totalSpend:'£64,200', paymentTerms:'30 days from delivery', creditLimit:'£75,000', creditUsed:'£8,400', flag:null,
      service:{ deliveryMet:91, responseSpeed:'1d avg', proofAccuracy:93, ackAccuracy:97 },
      teams:[ { name:'Internal Comms', users:[ {n:'Ruth Vance', role:'Admin', title:'Comms Director', email:'ruth.vance@meridianbank.com', tel:'+44 7700 900345', last:'2d ago', status:'active'} ]} ],
      products:[ {name:'Cork Cover Notebook', orders:6, qty:4200, value:'£24,800'}, {name:'Prodir Pen', orders:5, qty:9000, value:'£18,600'} ],
      comments:[] },
    { id:'oakhill', name:'Oakhill School', initials:'OS', domain:'oakhill.sch.uk', status:'active', since:'Feb 2025',
      address:'Oakhill Road, Sutton, SM1 3AW',
      projects:1, openApprovals:0, standingDiscount:'15%', addresses:1,
      totalOrders:3, lastOrder:'18 Mar 2026', totalSpend:'£6,400', paymentTerms:'Pay at ordering', creditLimit:'£5,000', creditUsed:'£0', flag:null,
      service:{ deliveryMet:100, responseSpeed:'1d avg', proofAccuracy:100, ackAccuracy:100 },
      teams:[ { name:'General', users:[ {n:'Tom Friar', role:'Admin', title:'Business Manager', email:'tfriar@oakhill.sch.uk', tel:'', last:'2w ago', status:'active'} ]} ],
      products:[ {name:'Heavy Weight T-Shirt', orders:3, qty:600, value:'£6,400'} ],
      comments:[] },
    { id:'lumio', name:'Lumio Tech', initials:'LT', domain:'lumio.tech', status:'active', since:'Aug 2025',
      address:'Tech Hub, 30 Station Road, Cambridge, CB1 2JX',
      projects:0, openApprovals:0, standingDiscount:'5%', addresses:1,
      totalOrders:1, lastOrder:'5 Feb 2026', totalSpend:'£2,100', paymentTerms:'Pay at ordering', creditLimit:'£10,000', creditUsed:'£0', flag:null,
      service:{ deliveryMet:100, responseSpeed:'3h avg', proofAccuracy:100, ackAccuracy:100 },
      teams:[ { name:'People', users:[ {n:'Erin Shaw', role:'Buyer', title:'People Partner', email:'erin@lumio.tech', tel:'', last:'3w ago', status:'active'} ]} ],
      products:[ {name:'Eco Wheat-Straw Cable', orders:1, qty:300, value:'£2,100'} ],
      comments:[] }
  ],
  suppliers: [
    { id:'bagworks', name:'BagWorks UK', initials:'BW', kind:'both', domain:'bagworks.co.uk', status:'active',
      address:'BagWorks Mill, Ancoats, Manchester, M4 6DE',
      lead:'6 working days', feed:'API feed · 1,240 products', products:1240, since:'2022',
      totalOrders:48, lastOrder:'9 Jun 2026', totalSpend:'£186,400', paymentTerms:'30 days from invoice', flag:null,
      service:{ deliveryMet:97, responseSpeed:'3h avg', proofAccuracy:96, ackAccuracy:99 },
      productList:[
        {name:'Recycled Cotton Tote', sku:'BW-TOTE-01', inStore:true, orders:21, qty:14200, value:'£44,800'},
        {name:'Drawstring Bag GRS', sku:'BW-DRW-04', inStore:true, orders:12, qty:8800, value:'£21,300'},
        {name:'Canvas Shopper XL', sku:'BW-CNV-09', inStore:false, orders:6, qty:2400, value:'£9,100'}
      ],
      contacts:[ {n:'Tom Reed', role:'Contact', title:'Production', email:'tom@bagworks.co.uk', tel:'+44 161 555 0102', last:'Today', status:'active'},
                 {n:'Dana Vale', role:'Contact', title:'Sales', email:'dana@bagworks.co.uk', tel:'+44 161 555 0144', last:'1w ago', status:'active'} ],
      comments:[ {who:'Jess Doyle', role:'Admin', when:'4 days ago', text:'Reliable on lead times — good go-to for tote blanks.', pinned:true} ]},
    { id:'printhouse', name:'PrintHouse Studio', initials:'PH', kind:'branding', domain:'printhouse.co', status:'active',
      address:'Print House, 8 Maker Street, Birmingham, B1 1AA',
      lead:'5 working days', feed:'Manual · decoration only', products:0, since:'2021',
      totalOrders:39, lastOrder:'7 Jun 2026', totalSpend:'£92,700', paymentTerms:'30 days from invoice', flag:null,
      service:{ deliveryMet:93, responseSpeed:'2h avg', proofAccuracy:89, ackAccuracy:95 },
      productList:[],
      contacts:[ {n:'Sarah Hill', role:'Contact', title:'Account Manager', email:'sarah@printhouse.co', tel:'+44 121 555 0188', last:'2h ago', status:'active'},
                 {n:'Priya Shah', role:'Contact', title:'Estimating', email:'priya@printhouse.co', tel:'', last:'4d ago', status:'active'} ],
      comments:[ {who:'Raf Price', role:'Studio', when:'1 week ago', text:'Proof accuracy slipped on last 2 jobs — keep an eye on colour matching.', pinned:true} ]},
    { id:'greenstock', name:'GreenStock', initials:'GS', kind:'product', domain:'greenstock.eco', status:'active',
      address:'Green Park, Otley Road, Leeds, LS16 5PS',
      lead:'10 working days', feed:'API feed · 480 products', products:480, since:'2023',
      totalOrders:26, lastOrder:'1 Jun 2026', totalSpend:'£74,100', paymentTerms:'Pro-forma', flag:{level:'amber', note:'Longer lead times — confirm stock before promising dates'},
      service:{ deliveryMet:84, responseSpeed:'1d avg', proofAccuracy:94, ackAccuracy:90 },
      productList:[
        {name:'Seed Pencil Set', sku:'GS-SEED-02', inStore:true, orders:14, qty:30000, value:'£38,400'},
        {name:'Desktop Garden', sku:'GS-GARDEN-01', inStore:true, orders:8, qty:3600, value:'£24,900'},
        {name:'Bamboo Cutlery Set', sku:'GS-BAM-07', inStore:false, orders:4, qty:5000, value:'£10,800'}
      ],
      contacts:[ {n:'Marco Diaz', role:'Contact', title:'Account Manager', email:'marco@greenstock.eco', tel:'+44 113 555 0210', last:'Yesterday', status:'active'} ],
      comments:[] },
    { id:'lumen', name:'Lumen Supplies', initials:'LM', kind:'both', domain:'lumensupplies.com', status:'active',
      address:'Lumen House, 200 Gray\u2019s Inn Road, London, WC1X 8XZ',
      lead:'8 working days', feed:'API feed · 2,010 products', products:2010, since:'2020',
      totalOrders:61, lastOrder:'8 Jun 2026', totalSpend:'£241,900', paymentTerms:'30 days from invoice', flag:null,
      service:{ deliveryMet:95, responseSpeed:'5h avg', proofAccuracy:97, ackAccuracy:98 },
      productList:[
        {name:'Eco Wheat-Straw Cable', sku:'LM-CABLE-11', inStore:true, orders:18, qty:9200, value:'£58,200'},
        {name:'Prodir Pen', sku:'LM-PEN-03', inStore:true, orders:22, qty:48000, value:'£62,400'},
        {name:'Cork Cover Notebook', sku:'LM-CORK-05', inStore:true, orders:9, qty:6200, value:'£34,100'},
        {name:'Wireless Charger', sku:'LM-CHG-12', inStore:false, orders:5, qty:1800, value:'£14,700'}
      ],
      contacts:[ {n:'Aisha Khan', role:'Contact', title:'Production', email:'aisha@lumensupplies.com', tel:'+44 207 555 0299', last:'3d ago', status:'active'} ],
      comments:[ {who:'Ben Shaw', role:'Account Manager', when:'6 days ago', text:'Biggest supplier by spend — priority support line agreed.', pinned:true} ]},
    { id:'inkwell', name:'Inkwell Print', initials:'IP', kind:'branding', domain:'inkwellprint.co.uk', status:'pending',
      address:'—',
      lead:'7 working days', feed:'Manual · decoration only', products:0, since:'2026',
      totalOrders:0, lastOrder:'—', totalSpend:'£0', paymentTerms:'Pro-forma', flag:{level:'grey', note:'Onboarding — not yet approved for orders'},
      service:null,
      productList:[],
      contacts:[ {n:'Greg Mott', role:'Contact', title:'Owner', email:'greg@inkwellprint.co.uk', tel:'', last:'Invited', status:'invited'} ],
      comments:[] }
  ],
  team: [
    {n:'Jess Doyle', role:'Admin', title:'Managing Director', email:'jess@acmemerch.co.uk', tel:'+44 7700 800100', last:'Online', status:'active'},
    {n:'Raf Price', role:'Studio', title:'Senior Designer', email:'raf@acmemerch.co.uk', tel:'+44 7700 800120', last:'15m ago', status:'active'},
    {n:'Cara Lyon', role:'Account Manager', title:'Account Manager', email:'cara@acmemerch.co.uk', tel:'+44 7700 800140', last:'1h ago', status:'active'},
    {n:'Ben Shaw', role:'Account Manager', title:'Account Manager', email:'ben@acmemerch.co.uk', tel:'+44 7700 800160', last:'Today', status:'active'},
    {n:'Nia Patel', role:'Studio', title:'Junior Designer', email:'nia@acmemerch.co.uk', tel:'', last:'2d ago', status:'active'},
    {n:'Will About', role:'Account Manager', title:'New Business', email:'will@acmemerch.co.uk', tel:'', last:'Invited', status:'invited'}
  ]
};
