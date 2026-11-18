/* demo-orders.js — example orders for explaining the system (Oct 2026).
   Adds 12 orders (MS-1030 … MS-1041, flagged o.demo=true) that cover every stage of the order flow and every
   state of the Customer / Supplier invoice tables: paid, overdue, due soon, not yet due, credit notes, extra
   invoices, supplier invoices matched / differing / approved / paid / awaiting, samples, via-us, cancellation.
   Runs once per browser (flag 'ms-demo-orders'); never overwrites an order, its ops or a payment that exists.
   Load straight after order-data.js. window.MSDEMO: seed() · remove() · list */
window.MSDEMO=window.MSDEMO||(function(){
  const FLAG='ms-demo-orders', VER=2;
  const J=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||d; }catch(e){ return d; } };
  const P=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const D=s=>new Date(s+'T10:00:00').toISOString();
  const lbl=s=>new Date(s+'T10:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const ADDR={
    northwind:{name:'Priya Nair',lines:['Northwind Ltd','4 Spinningfields','Manchester','M3 3AP'],c:'Northwind Ltd',who:'Priya Nair'},
    volt:{name:'Sam Okafor',lines:['Volt Studios','27 Shoreditch High St','London','E1 6PN'],c:'Volt Studios',who:'Sam Okafor'},
    fernlea:{name:'Hannah Cole',lines:['Fernlea Farm Foods','Fernlea Lane','Honiton','EX14 2LB'],c:'Fernlea Farm Foods',who:'Hannah Cole'},
    brightpath:{name:'Marcus Webb',lines:['Brightpath Learning','12 Queen Square','Bristol','BS1 4NT'],c:'Brightpath Learning',who:'Marcus Webb'},
    meridian:{name:'Elena Rossi',lines:['Meridian Capital','1 Cornhill','London','EC3V 3ND'],c:'Meridian Capital',who:'Elena Rossi'},
    oakhill:{name:'Tom Bell',lines:['Oakhill School','Cheam Road','Sutton','SM1 2SS'],c:'Oakhill School',who:'Tom Bell'},
    lumio:{name:'Aisha Patel',lines:['Lumio Tech','Cambridge Science Park','Cambridge','CB4 0WS'],c:'Lumio Tech',who:'Aisha Patel'},
    citrix:{name:'Jenny Watkins',lines:['Citrix,','The Coachworks,','1st Floor,','21 The Calls,','Leeds,','LS2 7EH'],c:'Citrix',who:'Jenny Watkins'}};
  const P_={mouse:['Xoopar Pokket Wireless Mouse','mouse','Lumen Goods',12.95,9.12,'Top · Pad print · 1 print colour','Black'],
    tote:['Recycled Cotton Tote','bag','Veloce Print',3.40,2.39,'Front · Screen print · 2 colours','Natural'],
    mug:['Ceramic Mug 11oz','drinkware','PrintHouse',4.85,3.42,'Wrap · Sublimation · Full colour','White'],
    tee:['Heavy Weight T-Shirt','clothing','Greenstock',9.20,6.48,'Front · Screen print · 1 colour','Black'],
    bag:['Tech Travel Bag','bag','Veloce Print',24.50,17.25,'Front · Embroidery · up to 6 colours','Black'],
    pen:['Prodir Ds8 True Biotic Pen','writing','Lumen Goods',1.62,1.14,'Barrel · Pad print · 1 colour','Blue'],
    book:['Cork Cover Notebook','book','Lumen Goods',4.17,2.94,'Cover · Laser engrave','Kraft'],
    cup:['Insulated Steel Cup','drinkware','Lumen Goods',9.00,6.34,'Side · Laser engrave','Black'],
    cable:['Eco Wheat-Straw Charging Cable','cable','Lumen Goods',3.95,2.78,'Cap · Pad print · 1 colour','Natural']};
  const HEX={Black:'#1a1a1e',Natural:'#e9dfc8',White:'#f4f4f0',Blue:'#2f5fb3',Kraft:'#c9a87a',Navy:'#1f2a4a'};
  // line: [key, qty, {kind, branding, colours:[[c,q]], sizes}]
  function line(k,qty,x){ x=x||{}; const p=P_[k]; const cols=(x.colours||[[p[6],qty]]).map(([c,q])=>({c,hex:HEX[c]||null,qty:q}));
    return {kind:x.kind||'product',name:p[0],img:p[1],visual:x.kind==='sample'&&/unbranded/i.test(x.branding||'')?null:'assets/products/'+p[1]+'.png',qty,unit:x.unit||p[3],cost:p[4],listUnit:p[3],discountPct:0,variant:cols[0].c,colours:cols,grid:x.grid||null,sized:!!x.grid,branding:x.branding||p[5],supplier:p[2],project:x.project||'',address:null,deliveryDate:x.deliv||'',charges:[],deliveryCost:20,region:'UK',demoSup:p[2]}; }
  const ORDERS=[
    // [id, ref, cust, placed, project, payment, lines, scenario]
    ['d3030','MS-1030','northwind','2026-07-08','Summer Welcome Packs','card',[line('pen',300),line('mug',150)],'delivered'],
    ['d3031','MS-1031','volt','2026-07-29','Studio Launch','account',[line('tee',120,{colours:[['Black',80],['White',40]]}),line('pen',500)],'delivered-overdue'],
    ['d3032','MS-1032','fernlea','2026-08-05','Harvest Show','account',[line('bag',40)],'delivered-paid-differs'],
    ['d3033','MS-1033','brightpath','2026-09-08','Open Day 2026','account',[line('book',250),line('pen',250)],'dispatched'],
    ['d3034','MS-1034','meridian','2026-09-10','Client Gifts Q4','bacs',[line('cup',100),line('cable',200)],'dispatched-credit-extra'],
    ['d3035','MS-1035','oakhill','2026-09-15','Sports Day','account',[line('tee',300,{colours:[['Navy',300]]})],'production'],
    ['d3036','MS-1036','lumio','2026-09-21','Hackathon','card',[line('mouse',150)],'proof'],
    ['d3037','MS-1037','citrix','2026-09-18','Autumn Giveaways','account',[line('cup',2,{kind:'sample',branding:'Unbranded'}),line('mug',2,{kind:'sample',branding:'Wrap · Sublimation · Full colour'})],'samples'],
    ['d3042','MS-1044','citrix','2026-10-20','Autumn Giveaways','bacs',[line('tote',400,{colours:[['Black',250],['Natural',150]]}),line('cable',200)],'received'],
    ['d3038','MS-1038','northwind','2026-09-29','Winter Kit','account',[line('bag',60),line('tote',200)],'received'],
    ['d3039','MS-1039','volt','2026-08-28','Studio Launch','account',[line('mug',80)],'delivered-duesoon'],
    ['d3040','MS-1040','fernlea','2026-09-16','Christmas Hampers','account',[line('book',120),line('cable',120)],'viaus'],
    ['d3041','MS-1041','brightpath','2026-09-02','Open Day 2026','account',[line('mouse',60)],'cancelled']];
  const PAY={card:['Paid by card',false,'card'],account:['On account · 30 days from invoice',true,'account'],bacs:['Bank transfer · paid before production',false,'bacs']};
  const add=(d,n)=>{ const x=new Date(d+'T10:00:00'); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };

  function build(){ const orders=[], ops={}, paid={}, rem={}, sup={};
    ORDERS.forEach(([id,ref,ck,placed,proj,pay,lines,sc])=>{ const A=ADDR[ck], N=ref.replace('MS-',''); lines.forEach(l=>{ l.project=proj; l.address={name:A.name,lines:A.lines.slice()}; });
      const net=Math.round(lines.reduce((a,l)=>a+l.unit*l.qty,0)*100)/100+40, pm=PAY[pay];
      const st=sc.startsWith('delivered')?'delivered':sc.startsWith('dispatched')||sc==='samples'?'dispatch':sc==='production'||sc==='viaus'?'production':sc==='cancelled'?'cancelled':sc==='proof'?'ack':'placed';
      orders.push({id,ref,po:String(4100+(+N%100)),placed:lbl(placed),placedBy:A.who,project:proj,status:st,payment:pm[0],address:[A.name,...A.lines].join(', '),onAccount:pm[1],method:pm[2],approval:null,
        net:Math.round(net*100)/100,vat:Math.round(net*20)/100,gross:Math.round(net*120)/100,vatRate:0.2,billing:A.c+', '+A.lines.slice(1).join(', '),invoiceTo:{name:A.who,email:A.who.toLowerCase().replace(' ','.')+'@example.com'},reference:'',poFile:null,
        customer:ck,customerName:A.c,lines,delivery:'£40.00',stamps:[],demo:true});
      // ops: one line state per line + POs per supplier
      const T=(k,d)=>({[k]:D(d)}), ln=[], sups={}; let poN=0;
      lines.forEach((l,i)=>{ const s=l.demoSup; if(!sups[s]) sups[s]={no:'PO-'+N+'-'+(++poN),sentAt:null,invoice:null}; });
      const full=(i,days,o)=>{ const p=add(placed,0); const t={received:D(p)}; const L={st:'received',t};
        const step=(k,n)=>{ t[k]=D(add(placed,n)); L.st=k; };
        if(days.sent!=null){ step('sent',days.sent); L.pack={at:t.sent}; }
        if(days.ack!=null){ step('ack',days.ack); L.oa={ref:'OA-'+N+'-'+(i+1),dispatch:add(placed,(days.disp||days.ack+8)),at:t.ack,by:'Supplier',checked:true,checkedBy:'Jess Doyle',checkedAt:t.ack,file:{name:'Order acknowledgement '+N+'.pdf'}}; }
        if(days.proof!=null){ step('proof',days.proof); L.pf={file:{name:'Proof '+N+'-'+(i+1)+'.pdf'},by:'Supplier',at:t.proof,checked:!!days.pfok}; }
        if(days.conf!=null){ step('confirmed',days.conf); }
        if(days.prod!=null){ step('prod',days.prod); }
        if(days.disp!=null&&!o.noDisp){ step('dispatch',days.disp); L.tracking={courier:o.courier||'DPD',no:o.trk||('15'+N+(i+1)+'0047712'),at:add(placed,days.disp),checked:true}; }
        if(days.del!=null){ step('delivered',days.del); L.tracking.pod={by:o.pod||'Reception',at:D(add(placed,days.del))}; }
        return L; };
      const F={sent:1,ack:2,proof:4,pfok:1,conf:5,prod:6,disp:14,del:16};
      const x={v:2,lines:[],pos:sups,chat:[],sup:{},notes:[],activity:[],problems:[],credits:[],invX:[],created:D(placed),demo:true};
      const supInv=(s,amt,daysAfter,extra)=>{ sups[s].invoice=Object.assign({no:'SI-'+s.split(' ')[0].toUpperCase().slice(0,4)+'-'+N,amount:amt,at:D(add(placed,daysAfter)),file:{name:'Invoice '+s+' '+N+'.pdf'},by:'Supplier'},extra||{}); };
      const exp=s=>Math.round(lines.filter(l=>l.demoSup===s).reduce((a,l)=>a+l.cost*l.qty,0)*100)/100;
      if(sc==='delivered'){ lines.forEach((l,i)=>x.lines.push(full(i,F,{pod:'Priya Nair'}))); Object.keys(sups).forEach(s=>{ supInv(s,exp(s),17); sup[sups[s].no]={approved:{at:D(add(placed,18)),by:'Jess Doyle'},paid:{at:add(placed,40),by:'Jess Doyle',ref:'BACS run '+add(placed,40)}}; }); x.paid=true; }
      if(sc==='delivered-overdue'){ lines.forEach((l,i)=>x.lines.push(full(i,F,{pod:'Sam Okafor'}))); Object.keys(sups).forEach(s=>{ supInv(s,exp(s),16); sup[sups[s].no]={approved:{at:D(add(placed,17)),by:'Jess Doyle'},paid:{at:add(placed,45),by:'Jess Doyle',ref:'BACS run'}}; });
        lines.forEach((l,i)=>{ rem['INV-'+N+'-0'+(i+1)]=[{at:D('2026-09-16'),by:'Jess Doyle'}]; }); }
      if(sc==='delivered-paid-differs'){ lines.forEach((l,i)=>x.lines.push(full(i,F,{pod:'Hannah Cole'}))); Object.keys(sups).forEach(s=>supInv(s,Math.round((exp(s)+48)*100)/100,18)); lines.forEach((l,i)=>{ paid['INV-'+N+'-0'+(i+1)]={at:add(placed,36),by:'Jess Doyle',method:'Bank transfer',ref:'FERN-'+N}; }); }
      if(sc==='delivered-duesoon'){ lines.forEach((l,i)=>x.lines.push(full(i,{sent:1,ack:2,proof:3,pfok:1,conf:4,prod:5,disp:6,del:8},{}))); Object.keys(sups).forEach(s=>supInv(s,exp(s),9)); }
      if(sc==='dispatched'){ lines.forEach((l,i)=>x.lines.push(full(i,{sent:1,ack:2,proof:4,pfok:1,conf:5,prod:6,disp:17},{courier:'Royal Mail',trk:'RM'+N+(i+1)+'4471GB'}))); Object.keys(sups).forEach((s,k)=>{ if(k===0) supInv(s,exp(s),18); }); }
      if(sc==='dispatched-credit-extra'){ lines.forEach((l,i)=>x.lines.push(full(i,{sent:1,ack:2,proof:4,pfok:1,conf:5,prod:6,disp:19},{courier:'UPS',trk:'1Z9'+N+(i+1)+'8870461'}))); x.paid=true; x.bacs={paid:true,at:D(add(placed,1))};
        x.invX.push({id:'ax'+N,no:'INV-'+N+'-X1',line:0,desc:'Rush production (5 working days)',reason:'Rush',net:120,gross:144,at:D(add(placed,3)),status:'paid'});
        x.credits.push({id:'cd'+N,no:'CN-'+N+'-01',line:1,kind:'goodwill',net:39.5,vat:7.9,gross:47.4,reason:'Damaged in transit',desc:'10 × Eco Wheat-Straw Charging Cable damaged',by:'Jess Doyle',at:D(add(placed,20))});
        x.problems.push({line:1,type:'damaged',note:'10 cables arrived with crushed packaging',at:D(add(placed,20)),by:'Elena Rossi',photos:[],sup:'Lumen Goods',resolved:{at:D(add(placed,20)),by:'Jess Doyle',how:'Credit note CN-'+N+'-01'}});
        Object.keys(sups).forEach(s=>{ supInv(s,exp(s),20); sup[sups[s].no]={approved:{at:D(add(placed,21)),by:'Jess Doyle'},due:add(placed,50)}; }); }
      if(sc==='production'){ lines.forEach((l,i)=>x.lines.push(full(i,{sent:1,ack:2,proof:3,pfok:1,conf:4,prod:5},{}))); }
      if(sc==='proof'){ lines.forEach((l,i)=>x.lines.push(full(i,{sent:1,ack:2,proof:6},{}))); }
      if(sc==='samples'){ x.lines.push(full(0,{sent:1,ack:2,disp:3,del:5},{courier:'Royal Mail (untracked)',trk:'',pod:'Jenny Watkins'})); x.lines[0].tracking.pod.cust=true; x.lines.push(full(1,{sent:1,ack:2,proof:4,pfok:1,conf:5,prod:6},{})); Object.keys(sups).forEach(s=>supInv(s,exp(s)+12,6)); }
      if(sc==='received'){ lines.forEach(()=>x.lines.push({st:'received',t:{received:D(placed)}})); Object.values(sups).forEach(p=>{ p.sentAt=null; }); }
      if(sc==='viaus'){ lines.forEach((l,i)=>{ const L=full(i,{sent:1,ack:2,proof:3,pfok:1,conf:4,prod:5},{}); L.route={via:true,hub:'h1',auto:true}; L.via={inTrk:{courier:'DPD',no:'15'+N+(i+1)+'99031',at:add(placed,11),by:'Supplier'},gin:i===0?{at:D(add(placed,13)),by:'Jess Doyle',rows:[],short:0,dmg:0,note:''}:null}; if(!L.via.gin) delete L.via.gin; x.lines.push(L); }); Object.keys(sups).forEach(s=>supInv(s,exp(s),12)); }
      if(sc==='cancelled'){ x.lines.push(Object.assign(full(0,{sent:1,ack:2},{}),{cancelled:{at:D(add(placed,4)),by:'Jess Doyle',reason:'Event postponed by the customer'}}));
        x.credits.push({id:'cx'+N,no:'CN-'+N+'-01',line:0,kind:'cancel',qty:60,unit:12.95,net:777,vat:155.4,gross:932.4,reason:'Cancellation',desc:'Cancelled: Xoopar Pokket Wireless Mouse',by:'Jess Doyle',at:D(add(placed,4))}); }
      // PO sent time = first line's sent time
      Object.entries(sups).forEach(([s,p])=>{ const ts=x.lines.map((L,i)=>lines[i].demoSup===s&&L.t&&L.t.sent?L.t.sent:null).filter(Boolean); if(ts.length) p.sentAt=ts.sort()[0]; });
      x.activity.push({at:D(placed),by:A.who,who:'customer',text:'Order placed · '+pm[0]});
      ops[id]=x; });
    return {orders,ops,paid,rem,sup}; }

  function seed(force){ const have=J(FLAG,null); if(have&&have.v>=VER&&!force) return false;
    const B=build(); let O=J('ms-orders',null); const live=window.MSOrders&&MSOrders.getOrders?MSOrders.getOrders():null;
    if(!O&&!live) return false; // first visit and order-data.js isn't on this page: wait for a page that seeds the defaults first
    O=O||live.slice(); let added=0;
    B.orders.forEach(o=>{ if(!O.some(z=>z.id===o.id||z.ref===o.ref)){ O.push(o); added++; if(live&&!live.some(z=>z.id===o.id)) live.push(o); } });
    P('ms-orders',O);
    const X=J('ms-order-ops',{}); Object.entries(B.ops).forEach(([k,v])=>{ if(!X[k]) X[k]=v; }); P('ms-order-ops',X);
    [['ms-fin-paid',B.paid],['ms-fin-rem',B.rem],['ms-fin-sup',B.sup]].forEach(([k,v])=>{ const S=J(k,{}); Object.entries(v).forEach(([a,b])=>{ if(S[a]==null) S[a]=b; }); P(k,S); });
    P(FLAG,{v:VER,at:new Date().toISOString(),ids:B.orders.map(o=>o.id)}); return added; }

  function remove(){ const ids=new Set(ORDERS.map(o=>o[0])), refs=new Set(ORDERS.map(o=>o[1].replace('MS-','')));
    P('ms-orders',J('ms-orders',[]).filter(o=>!ids.has(o.id)));
    const X=J('ms-order-ops',{}); ids.forEach(i=>delete X[i]); P('ms-order-ops',X);
    ['ms-fin-paid','ms-fin-rem','ms-fin-sup'].forEach(k=>{ const S=J(k,{}); Object.keys(S).forEach(a=>{ const m=a.match(/-(\d{4})-/); if(m&&refs.has(m[1])) delete S[a]; }); P(k,S); });
    P(FLAG,{v:VER,removed:true,at:new Date().toISOString()}); return true; }

  seed();
  return {seed,remove,list:ORDERS.map(o=>({id:o[0],ref:o[1],customer:ADDR[o[2]].c,placed:o[3],scenario:o[7]}))};
})();
