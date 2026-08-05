/* projects-data.js — mock projects for the Projects home page */
window.PROJECTS = [
  { id:'autumn', name:'Autumn Giveaways', created:'Mon 22 Aug 2025, 10:11am', ts:1724318460000,
    flag:true, comments:3, team:['Jess Doyle','Cara Lyon','Raf Price'],
    items:[
      {n:'Xoopar Mr. Bio Wheat Straw Charging Cable', st:'prog'},
      {n:'Tech Travel Bag', st:'ready', crit:true},
      {n:'Hoton A5 Kraft Paper Notebook', st:'ready'},
      {n:'Xoopar Pokket Wheat Straw Wireless Mouse', st:'prog'},
      {n:'Prodir Ds8 True Biotic Pen', st:'ordered'},
      {n:'Desktop Garden', st:'idea'}
    ]},
  { id:'expo', name:'2026 Charity Expo', created:'Tue 18 Aug 2025, 8:22am', ts:1723969320000,
    flag:false, comments:0, team:['Ben Shaw'],
    items:[
      {n:'Xoopar Mr. Bio Wheat Straw Charging Cable', st:'ordered'},
      {n:'Tech Travel Bag', st:'ordered'},
      {n:'Hoton A5 Kraft Paper Notebook', st:'ordered'},
      {n:'Xoopar Pokket Wheat Straw Wireless Mouse', st:'ordered'},
      {n:'Prodir Ds8 True Biotic Pen', st:'idea'},
      {n:'Recycled Cotton Tote', st:'ordered'},
      {n:'Seed Pencil Set', st:'prog'},
      {n:'Cork Cover Notebook', st:'ready'}
    ]},
  { id:'staff', name:'Staff Gifts', created:'Fri 4 Jul 2025, 11:14am', ts:1719918840000,
    flag:false, comments:0, team:['Cara Lyon'],
    items:[
      {n:'Xoopar Mr. Bio Wheat Straw Charging Cable', st:'prog'},
      {n:'Tech Travel Bag', st:'prog'},
      {n:'Hoton A5 Kraft Paper Notebook', st:'idea'},
      {n:'Xoopar Pokket Wheat Straw Wireless Mouse', st:'idea'}
    ]},
  { id:'vip', name:'VIP Gifts', created:'Mon 27 Jun 2025, 11:14am', ts:1719484440000,
    flag:false, comments:0, team:['Jess Doyle'],
    items:[ {n:'Xoopar Mr. Bio Wheat Straw Charging Cable', st:'ordered'} ]},
  { id:'summer', name:'Summer Event 2026', created:'Wed 4 Jun 2026, 9:02am', ts:1843369320000,
    flag:true, comments:1, team:['Leo Tran','Sara Kemp'],
    items:[
      {n:'Recycled Cotton Tote', st:'action', crit:true},
      {n:'Insulated Steel Cup', st:'idea'},
      {n:'Bamboo Toothbrush Set', st:'idea'}
    ]},
  { id:'welcome', name:'New Starter Welcome Packs', created:'Thu 15 May 2025, 2:40pm', ts:1747316400000,
    flag:false, comments:0, delivered:true, team:['Priya Nair'],
    items:[
      {n:'Cork Cover Notebook', st:'deliver'},
      {n:'Prodir Ds8 True Biotic Pen', st:'deliver'},
      {n:'Recycled Cotton Tote', st:'deliver'}
    ]}
];
