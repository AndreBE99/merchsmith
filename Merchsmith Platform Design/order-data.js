/* order-data.js — basket + orders store, table-format model matching the basket visual. */
(function(){
  'use strict';
  const BKEY='ms-basket4', OKEY='ms-orders';
  const gbp = n => '£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const ADDR = { name:'Jenny Watkins', lines:['Citrix,','The Coachworks,','1st Floor,','21 The Calls,','Leeds,','LS2 7EH'] };
  const ABKEY='ms-address-book';
  const SEED_ADDRESSES = [
    { id:'a1', label:'Head Office', name:'Jenny Watkins', lines:['Citrix,','The Coachworks,','1st Floor,','21 The Calls,','Leeds,','LS2 7EH'] },
    { id:'a2', label:'London Office', name:'Leo Tran', lines:['Citrix,','5 Merchant Square,','Paddington,','London,','W2 1AS'] },
    { id:'a3', label:'Manchester Hub', name:'Priya Shah', lines:['Citrix,','Unit 4, Piccadilly Place,','Manchester,','M1 3BN'] },
    { id:'a4', label:'Event store — NEC Birmingham', name:'Events Team', lines:['Citrix c/o NEC,','Hall 5 Loading Bay,','Birmingham,','B40 1NT'] }
  ];
  function addressBook(){ try{ const s=JSON.parse(localStorage.getItem(ABKEY)||'null'); if(Array.isArray(s)&&s.length) return s; }catch(e){} return SEED_ADDRESSES.slice(); }
  function saveAddressBook(arr){ try{ localStorage.setItem(ABKEY, JSON.stringify(arr)); }catch(e){} }
  function addAddress(a){ const arr=addressBook(); a.id='a'+Date.now(); arr.push(a); saveAddressBook(arr); return a; }
  // split delivery: one line, several addresses (split-delivery.js). Delivery charge = supplier carriage per delivery
  function setLineDrops(id, drops, ch){ const l=basket.find(x=>x.id===id); if(!l) return; if(l.baseDelivery==null) l.baseDelivery=l.deliveryCost||0;
    if(drops&&drops.length>1){ l.drops=drops; l.dropCharges=ch.rows; l.deliveryCost=ch.sell; l.address=drops[0].address?{name:drops[0].address.name,lines:drops[0].address.lines.slice()}:l.address; }
    else { const d0=drops&&drops[0]; delete l.drops; delete l.dropCharges; l.deliveryCost=l.baseDelivery; if(d0&&d0.address) l.address=d0.address; } save(BKEY,basket); }
  function setLineAddress(id, addr){ const l=basket.find(x=>x.id===id); if(l){ l.address=addr?{name:addr.name,lines:addr.lines.slice()}:null; save(BKEY,basket); } }

  // product lines: per-colour (or per-size) quantity rows
  const SEED_BASKET = [
    { id:'b1', kind:'product', name:'Eco Wheat-Straw Charging Cable', img:'cable', project:'Autumn Giveaways',
      proof:'approved', each:8.45, discountPct:10, deliveryCost:20, region:'UK', additional:100, charges:[{label:'Express fee',amt:100},{label:'Origination',amt:35}], deliveryDate:'Fri 16th Oct', orderBy:'Order by Mon 6th Oct, 17:00', address:ADDR,
      rows:[ {c:'Grey',hex:'#8a8a93',qty:100},{c:'Dark Blue',hex:'#2a3550',qty:0},{c:'Black',hex:'#1a1a1e',qty:100},{c:'Aqua',hex:'#7fd4d1',qty:100},{c:'Light grey',hex:'#c8c8cf',qty:0},{c:'White',hex:'#f4f4f0',qty:0} ] },
    { id:'b2', kind:'product', name:'Xoopar Pokket Wireless Mouse', img:'mouse', project:'Autumn Giveaways',
      proof:'unbranded', each:8.45, discountPct:0, deliveryCost:20, region:'UK', additional:0, charges:[{label:'Carriage surcharge',amt:15}], deliveryDate:'ASAP', orderBy:'', address:null,
      rows:[ {c:'Black',hex:'#1a1a1e',qty:100},{c:'White',hex:'#f4f4f0',qty:0} ] },
    { id:'b3', kind:'product', name:'Heavy Weight T-Shirt', img:'clothing', project:'Autumn Giveaways',
      proof:'approved', each:8.45, discountPct:15, deliveryCost:24, region:'UK', additional:250, charges:[{label:'Setup charge',amt:150},{label:'Design service',amt:100}], deliveryDate:'Wed 22nd Oct', orderBy:'Order by Thu 9th Oct, 12:00', address:ADDR, sized:true,
      rows:[ {c:'X-Small',qty:100},{c:'Small',qty:100},{c:'Medium',qty:100},{c:'Large',qty:100},{c:'X-Large',qty:100},{c:'XX-Large',qty:100} ],
      colours:[ {c:'Dark Blue',hex:'#2a3550'},{c:'Black',hex:'#1a1a1e'},{c:'Aqua',hex:'#7fd4d1'},{c:'Light grey',hex:'#c8c8cf'},{c:'White',hex:'#f4f4f0'} ] }
  ];
  const SEED_SAMPLES = [
    { id:'s1', kind:'sample', name:'Eco Wheat-Straw Charging Cable', img:'cable', project:'Autumn Giveaways',
      proof:'approved', each:8.45, additional:35, charges:[{label:'Express sample',amt:35}], lead:'5 working days', address:ADDR,
      rows:[ {c:'Grey',hex:'#8a8a93',qty:2},{c:'Dark Blue',hex:'#2a3550',qty:0},{c:'Black',hex:'#1a1a1e',qty:2},{c:'Aqua',hex:'#7fd4d1',qty:2},{c:'Light grey',hex:'#c8c8cf',qty:0},{c:'White',hex:'#f4f4f0',qty:0} ] },
    { id:'s2', kind:'sample', name:'Desktop Garden', img:'garden', project:'Autumn Giveaways',
      proof:'unbranded', each:8.45, additional:0, charges:[], lead:'10 working days', address:ADDR,
      rows:[ {c:'Grey',hex:'#8a8a93',qty:100},{c:'Dark Blue',hex:'#2a3550',qty:0},{c:'Black',hex:'#1a1a1e',qty:100},{c:'Aqua',hex:'#7fd4d1',qty:100},{c:'Light grey',hex:'#c8c8cf',qty:0},{c:'White',hex:'#f4f4f0',qty:0} ] }
  ];

  const SEED_ORDERS = [
    { id:'o1001', ref:'MS-1042', po:'PO-CRT-2291', placed:'2 Jun 2026', placedBy:'Jenny Watkins',
      project:'Summer Event', status:'delivered', payment:'30 days from delivery', address:'Citrix, The Coachworks, 1st Floor, 21 The Calls, Leeds, LS2 7EH',
      lines:[ {kind:'product',name:'Seed Pencil Set',img:'writing',qty:3000,unit:2.45,variant:'Natural',branding:'Sleeve · Laser',supplier:'GreenStock'} ],
      delivery:'£36.00', stamps:[ {k:'placed',t:'Order placed',d:'2 Jun, 10:12'},{k:'ack',t:'Acknowledged by supplier',d:'2 Jun, 14:40'},{k:'prod',t:'In production',d:'4 Jun'},{k:'dispatch',t:'Dispatched',d:'11 Jun'},{k:'delivered',t:'Delivered',d:'13 Jun'} ] },
    { id:'o1002', ref:'MS-1051', po:'PO-CRT-2304', placed:'9 Jun 2026', placedBy:'Leo Tran',
      project:'Autumn Giveaways', status:'production', payment:'Paid by card', address:'Citrix, The Coachworks, 1st Floor, 21 The Calls, Leeds, LS2 7EH',
      lines:[ {kind:'product',name:'Xoopar Pokket Wireless Mouse',img:'mouse',qty:500,unit:9.60,variant:'Black',branding:'Top · Pad print',supplier:'Lumen Supplies'} ],
      delivery:'£34.00', stamps:[ {k:'placed',t:'Order placed',d:'9 Jun, 09:30'},{k:'ack',t:'Acknowledged by supplier',d:'9 Jun, 11:05'},{k:'prod',t:'In production',d:'11 Jun'},{k:'dispatch',t:'Dispatched',d:'—'},{k:'delivered',t:'Delivered',d:'—'} ] }
  ];

  function load(key,seed){ try{ const v=localStorage.getItem(key); if(v) return JSON.parse(v); }catch(e){} return JSON.parse(JSON.stringify(seed)); }
  function save(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch(e){} }

  let basket = load(BKEY, SEED_BASKET.concat(SEED_SAMPLES));
  let orders = load(OKEY, SEED_ORDERS);

  const lineQty = l => (l.rows||[]).reduce((a,r)=>a+(+r.qty||0),0);
  const lineItemCost = l => lineQty(l)*(l.each||0)*(1-(l.discountPct||0)/100);
  const VAT = 0.2;
  // the customer's account decides whether VAT is charged (Customer Settings → Account & terms)
  const CUST='citrix';
  const account = () => window.MSCUSTACCT ? MSCUSTACCT.get(CUST) : {vat:true,creditLimit:0,creditUsed:0,terms:'30 days from delivery'};
  const vatRate = () => account().vat===false ? 0 : VAT;

  function totals(){
    const prods = basket.filter(l=>l.kind==='product');
    const samps = basket.filter(l=>l.kind==='sample');
    const oNet = prods.reduce((a,l)=>a+lineItemCost(l)+(l.deliveryCost||0)+(l.additional||0),0);
    const sNet = samps.reduce((a,l)=>a+lineItemCost(l)+(l.additional||0),0);
    const r=vatRate();
    // discount code (promo-codes.js): taken off before VAT
    const pr=window.MSPROMO?MSPROMO.calc({prods,samps,lineCost:l=>lineItemCost(l)+(l.additional||0),cust:window.MSOrders&&MSOrders.CUST||'citrix'}):{off:0,delOff:0};
    const pOff=(pr.off||0)+(pr.delOff||0), dNet=Math.max(0,oNet+sNet-pOff);
    return { oNet, oVat:oNet*r, oTot:oNet*(1+r), sNet, sVat:sNet*r, sTot:sNet*(1+r), gNet:oNet+sNet,
      dNet, dVat:dNet*r, dTot:dNet*(1+r), count:basket.length, vatRate:r, promo:pr.code?pr:null, promoOff:pOff };
  }

  const STATUS = { approval:{label:'Awaiting approval',cls:'amber'}, placed:{label:'Order placed',cls:'peri'},ack:{label:'Acknowledged',cls:'peri'},production:{label:'In production',cls:'amber'},dispatch:{label:'Dispatched',cls:'amber'},delivered:{label:'Delivered',cls:'green'},cancelled:{label:'Cancelled',cls:'red'} };

  window.MSOrders = {
    gbp, VAT, ADDR, lineQty, lineItemCost, totals, STATUS, CUST, account, vatRate,
    addressBook, addAddress, setLineAddress, setLineDrops,
    getBasket:()=>basket,
    getProducts:()=>basket.filter(l=>l.kind==='product'),
    getSamples:()=>basket.filter(l=>l.kind==='sample'),
    setRowQty(lineId,ri,qty){ const l=basket.find(x=>x.id===lineId); if(l&&l.rows[ri]){ l.rows[ri].qty=Math.max(0,qty|0); save(BKEY,basket); } },
    removeLine(id){ basket=basket.filter(x=>x.id!==id); save(BKEY,basket); },
    duplicateLine(id){ const l=basket.find(x=>x.id===id); if(l){ const c=JSON.parse(JSON.stringify(l)); c.id='b'+Date.now(); basket.push(c); save(BKEY,basket); } },
    addToBasket(line){ line.id=line.id&&!basket.some(x=>x.id===line.id)?line.id:'b'+Date.now()+Math.random().toString(36).slice(2,6); basket.push(line); save(BKEY,basket); return line.id; },
    clearBasket(){ basket=[]; save(BKEY,basket); },
    getOrders:()=>orders, getOrder:id=>orders.find(o=>o.id===id),
    placeOrder(opts){
      const n=1052+orders.length, id='o'+(1003+orders.length);
      // keep the checkout pro forma number on the order (proforma-doc.js register)
      try{ if(window.MSPRO) MSPRO.adopt('basket:'+basket.map(l=>l.id).join(','),'order:'+id); }catch(e){}
      const o={ id, ref:'MS-'+n, po:opts.po||('PO-'+Date.now().toString().slice(-4)),
        placed:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
        placedBy:opts.placedBy||'Jenny Watkins', project:'Autumn Giveaways', status:opts.status||'placed',
        payment:opts.payment||'30 days from delivery', address:opts.address||'', onAccount:!!opts.onAccount, approval:opts.approval||null,
        net:totals().dNet, vat:totals().dVat, gross:totals().dTot, vatRate:vatRate(), gNet:totals().gNet, promo:(t0=>t0.promo&&!t0.promo.err?{code:t0.promo.code,desc:t0.promo.desc,off:t0.promo.off,delOff:t0.promo.delOff}:null)(totals()), customer:opts.customer||'citrix',
        billing:opts.billing||'', invoiceTo:opts.invoiceTo||null, reference:opts.reference||'', poFile:opts.poFile||null, method:opts.method||'',
        lines: basket.map(l=>({kind:l.kind,name:l.name,img:l.img,visual:l.visual||null,qty:lineQty(l),unit:l.each*(1-(l.discountPct||0)/100),listUnit:l.each,discountPct:l.discountPct||0,variant:(l.rows||[]).filter(r=>r.qty).map(r=>r.c).join(', '),colours:(l.rows||[]).filter(r=>r.qty).map(r=>({c:r.c,hex:r.hex||null,qty:r.qty})),grid:l.grid||null,sized:!!l.sized,branding:l.proof==='unbranded'?'Unbranded':'Branded',supplier:'Lumen Supplies',
          project:l.project||'',address:l.address||null,drops:l.drops||null,dropCharges:l.dropCharges||null,baseDelivery:l.baseDelivery!=null?l.baseDelivery:null,deliveryDate:l.deliveryDate||'ASAP',orderBy:l.orderBy||'',charges:(l.charges||[]).map(c=>({label:c.label,amt:c.amt,qty:c.qty||1,unit:c.unit!=null?c.unit:c.amt})),deliveryCost:l.deliveryCost||0,region:l.region||'UK',
          sku:l.sku||(()=>{ const p=((window.STORE&&STORE.products)||[]).find(x=>x.name===l.name); return p?String(p.id).toUpperCase():''; })(),
          deliveryNotes:(()=>{ try{ return ((JSON.parse(localStorage.getItem('ms-basket-addr-notes')||'{}')[l.id])||[]).map(n=>n.text).concat(l.address&&l.address.note?[l.address.note]:[]); }catch(e){ return []; } })()})),
        delivery: gbp(40),
        stamps:[ {k:'placed',t:'Order placed',d:'Just now'},{k:'ack',t:'Acknowledged by supplier',d:'—'},{k:'prod',t:'In production',d:'—'},{k:'dispatch',t:'Dispatched',d:'—'},{k:'delivered',t:'Delivered',d:'—'} ] };
      orders.unshift(o); save(OKEY,orders); if(window.MSPROMO) MSPROMO.record(o); basket=[]; save(BKEY,basket); return o;
    }
  };
})();
