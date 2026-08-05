/* home-data.js — mock data for the role-based home dashboards */
window.HOME = {
  admin: {
    who:'Morgan Slade', role:'Platform Operator', org:'Merchsmith',
    kpis:[
      {label:'Platform MRR', value:'£6,840', delta:'+8.2%', up:true},
      {label:'GMV (30d)', value:'£512k', delta:'+12%', up:true},
      {label:'Active distributors', value:'7', delta:'+1', up:true},
      {label:'Trials ending', value:'1', delta:'2 days', up:false, warn:true}
    ],
    trend:[38,42,40,48,52,49,58,61,57,64,68,72],
    leaderboard:[
      {n:'NorthStar Brand Co',v:'£1.42M',pct:96},
      {n:'Verde Eco Promo',v:'£701k',pct:62},
      {n:'Brightside Promo',v:'£884k',pct:74},
      {n:'Mojo Promotions',v:'£612k',pct:54},
      {n:'Köber Werbung',v:'€512k',pct:46}
    ],
    tasks:[
      {t:'Pinnacle Swag — payment failed, 2 retries left', tag:'Billing', warn:true},
      {t:'Cobalt Brand Studio — suspended, review account', tag:'Risk', warn:true},
      {t:'Limelight Gifts — trial ends in 2 days', tag:'Trial'},
      {t:'Approve Inkwell Print supplier onboarding', tag:'Supplier'}
    ],
    activity:[
      {who:'NorthStar', t:'upgraded to Scale plan', w:'2h ago'},
      {who:'XD Connects', t:'synced 8,200 products', w:'4h ago'},
      {who:'Verde Eco', t:'added 3 new customers', w:'Yesterday'},
      {who:'Brightside', t:'GMV passed £880k', w:'Yesterday'}
    ],
    health:[{k:'Feed syncs',v:'All green'},{k:'API uptime',v:'99.98%'},{k:'Open incidents',v:'0'}]
  },
  distributor: {
    who:'Jess Doyle', role:'Account Admin', org:'Mojo Promotions',
    kpis:[
      {label:'Open orders', value:'12', delta:'+3', up:true},
      {label:'Awaiting approval', value:'5', delta:'2 urgent', up:false, warn:true},
      {label:'GMV this month', value:'£58,200', delta:'+9%', up:true},
      {label:'Avg. margin', value:'34%', delta:'+1.2pt', up:true}
    ],
    pipeline:[{k:'Idea',v:8},{k:'In progress',v:14},{k:'Ready to order',v:6},{k:'Ordered',v:11},{k:'Delivered',v:23}],
    tasks:[
      {t:'Send proof v2 — Tech Travel Bag (Volt Studios)', tag:'Design', warn:true},
      {t:'Chase quote — Prodir Pen (Lumen Supplies)', tag:'Price'},
      {t:'Confirm critical date — Eco Cable (Northwind)', tag:'Delivery', warn:true},
      {t:'Stock check expiring — Recycled Tote', tag:'Stock'}
    ],
    customers:[
      {n:'Northwind Ltd',v:'£128k',pct:92},
      {n:'Fernlea Foods',v:'£87k',pct:68},
      {n:'Meridian Bank',v:'£64k',pct:52},
      {n:'Volt Studios',v:'£42k',pct:36}
    ],
    activity:[
      {who:'Northwind', t:'approved the design proof — Eco Cable', w:'1h ago'},
      {who:'Lumen Supplies', t:'confirmed stock, reserved to 31 Oct', w:'3h ago'},
      {who:'Cara Lyon', t:'promoted Tote to Ready to Order', w:'Yesterday'},
      {who:'Fernlea Foods', t:'placed an order — £11,600', w:'Yesterday'}
    ]
  },
  customer: {
    who:'Sara Kemp', role:'Brand Admin', org:'Northwind Ltd',
    kpis:[
      {label:'Active projects', value:'7', delta:'+1', up:true},
      {label:'Awaiting your approval', value:'3', delta:'Action needed', up:false, warn:true},
      {label:'In production', value:'4', delta:'on track', up:true},
      {label:'Spend (YTD)', value:'£128,450', delta:'+14%', up:true}
    ],
    approvals:[
      {t:'Approve design proof — Eco Wheat-Straw Cable', tag:'Design', warn:true},
      {t:'Approve price — Recycled Cotton Tote', tag:'Price'},
      {t:'Approve visual — Hoton Notebook', tag:'Visual'}
    ],
    projects:[
      {n:'Autumn Giveaways',stage:'In progress',pct:55},
      {n:'2026 Charity Expo',stage:'Awaiting approval',pct:40},
      {n:'Staff Gifts',stage:'Ready to order',pct:80},
      {n:'VIP Gifts',stage:'Delivered',pct:100}
    ],
    deliveries:[
      {n:'Recycled Cotton Tote',d:'Fri 10 Oct',note:'On track'},
      {n:'Eco Wheat-Straw Cable',d:'Mon 20 Oct',note:'Critical — confirmed'},
      {n:'Seed Pencil Set',d:'Wed 29 Oct',note:'In production'}
    ],
    reorder:['Recycled Cotton Tote','Hoton A5 Notebook','Prodir Pen']
  },
  supplier: {
    who:'Tom Reed', role:'Production Contact', org:'BagWorks UK',
    kpis:[
      {label:'Open enquiries', value:'6', delta:'2 today', up:true, warn:true},
      {label:'Orders to fulfil', value:'9', delta:'+2', up:true},
      {label:'Proofs to upload', value:'3', delta:'1 overdue', up:false, warn:true},
      {label:'On-time rate', value:'97%', delta:'+2pt', up:true}
    ],
    enquiries:[
      {t:'Stock check — Recycled Cotton Tote (Black, Large)', tag:'Stock', warn:true},
      {t:'Delivery date — Eco Cable, qty 5,000', tag:'Delivery'},
      {t:'Quote request — Drawstring Bag GRS', tag:'Quote'}
    ],
    orders:[
      {n:'Recycled Cotton Tote ×7,400',stage:'In production',pct:60},
      {n:'Canvas Shopper XL ×2,400',stage:'Proof approved',pct:35},
      {n:'Drawstring Bag GRS ×8,800',stage:'Dispatched',pct:100}
    ],
    deadlines:[
      {t:'Upload proof — Tote v2',d:'Today 17:00',warn:true},
      {t:'Order acknowledgement — Cable',d:'Tomorrow'},
      {t:'Dispatch — Drawstring Bag',d:'Thu 24 Oct'}
    ]
  },
  user: {
    who:'Leo Tran', role:'Marketing Coordinator', org:'Northwind Ltd · Marketing',
    kpis:[
      {label:'My tasks', value:'4', delta:'1 due today', up:false, warn:true},
      {label:'My approvals', value:'2', delta:'Action needed', up:false, warn:true},
      {label:'My projects', value:'3', delta:'active', up:true},
      {label:'My orders', value:'6', delta:'this year', up:true}
    ],
    tasks:[
      {t:'Approve price — Recycled Cotton Tote', tag:'Price', warn:true},
      {t:'Give feedback — Tech Travel Bag visual', tag:'Design'},
      {t:'Confirm delivery address — Autumn Giveaways', tag:'Delivery'},
      {t:'Review quote — Prodir Pen', tag:'Price'}
    ],
    projects:[
      {n:'Autumn Giveaways',stage:'In progress',pct:55},
      {n:'Staff Gifts',stage:'Ready to order',pct:80},
      {n:'Summer Event',stage:'Idea',pct:15}
    ],
    activity:[
      {who:'You', t:'approved the Tote design proof', w:'2h ago'},
      {who:'Cara Lyon', t:'shared a quote with you', w:'Yesterday'},
      {who:'You', t:'added Prodir Pen to Autumn Giveaways', w:'2 days ago'}
    ]
  }
};
