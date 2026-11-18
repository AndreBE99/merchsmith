/* ============================================================
   payments.js — card / bank payments against pro formas and VAT invoices (Oct 2026).
   Rules (agreed with Merchsmith):
   · Distributors only accept COMMERCIAL cards, so every card payment carries the card fee
     (Finance → Integrations → Stripe %; UK/EU vs non-UK).
   · The fee is never added to an issued VAT invoice: each successful card payment raises its
     own fee VAT invoice (INV-1051-F1), tax point = payment date, listing what it paid.
   · Switching an unpaid pro forma from bank transfer to card issues a revision
     (PF-53001-R2, R1 superseded) showing the estimated card fee.
   · Invoices can be part paid; balances carry on, the fee applies only to the card amount.
   · Credit notes against card-paid invoices refund the fee in proportion.
   Stores: ms-payments [payment], ms-pf-rev {orderId:[{rev,at,method,by}]}
   window.MSPAY: outstanding(cust) · paidOn(doc) · pfNo(o) · revise(o,method) · revs(o) · feePct(region)
                 pay({items,method,region,by}) · feeDoc(p) · paymentsFor(doc) · feeShare(doc) · payUrl(cust,doc)
   ============================================================ */
window.MSPAY=window.MSPAY||(function(){
  const J=(k,f)=>{ try{ const v=JSON.parse(localStorage.getItem(k)||'null'); return v==null?f:v; }catch(e){ return f; } };
  const P=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const r2=n=>Math.round((+n||0)*100)/100, pad2=n=>String(n).padStart(2,'0');
  const fD=d=>d?new Date(d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'';
  const O=()=>window.MSOrders;
  const ops=()=>J('ms-order-ops',{});
  const VRo=o=>o.vatRate!=null?+o.vatRate:0.2;
  const onAcc=o=>!!o.onAccount||/\d+\s*days/i.test(o.payment||'');
  const termsDays=o=>{ const m=String(o.payment||'').match(/(\d+)\s*days/i); return m?+m[1]:30; };
  const PROJ_BASE=o=>window.MSPRO?MSPRO.number('order:'+o.id):String(o.ref).replace('MS-','PF-');

  /* ---- card fee ---- */
  function feePct(region){ try{ const s=window.MSINT&&MSINT.stripe(); if(s&&s.fee) return (region==='noneu'?+s.fee.intl:+s.fee.uk)||(region==='noneu'?3:1.5); }catch(e){} return region==='noneu'?3:1.5; }
  const feeFor=(amt,region)=>r2((+amt||0)*feePct(region)/100);

  /* ---- ledger ---- */
  const all=()=>J('ms-payments',[]);
  const paymentsFor=doc=>all().filter(p=>p.status==='paid'&&(p.items||[]).some(i=>i.doc===doc));
  const paidOn=doc=>r2(all().filter(p=>p.status==='paid').reduce((a,p)=>a+(p.items||[]).filter(i=>i.doc===doc).reduce((q,i)=>q+(+i.amount||0),0),0));
  // share of card fees paid against a document (gross), for proportional refunds
  function feeShare(doc){ let s=0; all().filter(p=>p.status==='paid'&&p.method==='card'&&p.fee).forEach(p=>{ const T=(p.items||[]).reduce((a,i)=>a+(+i.amount||0),0); (p.items||[]).filter(i=>i.doc===doc).forEach(i=>{ s+=T?p.fee.gross*(+i.amount||0)/T:0; }); }); return r2(s); }

  /* ---- pro forma revisions ---- */
  const revs=o=>(J('ms-pf-rev',{})[o.id])||[];
  const curRev=o=>{ const R=revs(o); return R.length?R[R.length-1]:null; };
  const pfNo=o=>{ const R=curRev(o); return PROJ_BASE(o)+(R&&R.rev>1?'-R'+R.rev:''); };
  function revise(o,method,by){ const A=J('ms-pf-rev',{}), R=A[o.id]||[]; const prev=R.length?R[R.length-1]:{rev:1,method:o.method||(/card/i.test(o.payment||'')?'card':'bacs')};
    if(prev.method===method) return prev; const rec={rev:(prev.rev||1)+1,at:new Date().toISOString(),method,by:by||'',supersedes:PROJ_BASE(o)+(prev.rev>1?'-R'+prev.rev:'')};
    A[o.id]=R.length?R.concat(rec):[{rev:1,at:o.placedAt||new Date().toISOString(),method:prev.method},rec]; P('ms-pf-rev',A); return rec; }

  /* ---- what an order owes ---- */
  function orderMoney(o){ const VR=VRo(o), L=o.lines||[], x=ops()[o.id]||{lines:[]}, XL=x.lines||[];
    const lnNet=l=>r2((+l.unit||0)*(+l.qty||0)), lnGross=l=>r2(lnNet(l)*(1+VR));
    const exRows=l=>{ const R=(l.charges||[]).filter(c=>+c.amt).map(c=>+c.amt); if(+l.deliveryCost) R.push(+l.deliveryCost); return R; };
    const exGross=l=>r2(exRows(l).reduce((a,v)=>a+v,0)*(1+VR));
    const linesGross=r2(L.filter((l,i)=>!(XL[i]&&XL[i].cancelled)).reduce((a,l)=>a+lnGross(l),0)), delivNet=parseFloat(String(o.delivery||'').replace(/[^0-9.]/g,''))||0;
    const oGross=o.gross!=null&&+o.gross>0?+o.gross:r2(linesGross+delivNet*(1+VR)), extras=Math.max(0,r2(oGross-linesGross));
    const disp=L.map((l,i)=>({l,i,L:XL[i]||{}})).filter(m=>m.L.tracking&&!m.L.cancelled);
    const lastIdx=disp.length&&disp.length===L.filter((l,i)=>!(XL[i]&&XL[i].cancelled)).length?disp.slice().sort((a,b)=>new Date(b.L.tracking.at)-new Date(a.L.tracking.at))[0].i:-1;
    const rest=r2(extras-L.reduce((a,l)=>a+exGross(l),0));
    const inv=disp.map(m=>{ const g=r2(lnGross(m.l)+exGross(m.l)+(m.i===lastIdx&&Math.abs(rest)>0.005?rest:0)), no=String(o.ref).replace('MS-','INV-')+'-'+pad2(m.i+1), due=new Date(new Date(m.L.tracking.at).getTime()+termsDays(o)*864e5);
      return {kind:'vat',doc:no,orderId:o.id,line:m.i,name:m.l.name,project:m.l.project||o.project||'',gross:g,issued:m.L.tracking.at,due:due.toISOString(),flagPaid:!!(m.L.invPaid||x.paid)}; });
    return {oGross,inv,x}; }

  /* ---- outstanding documents for a customer ---- */
  function outstanding(cust){ const L=[]; ((O()&&O().getOrders())||[]).filter(o=>(o.customer||'citrix')===cust&&o.status!=='cancelled').forEach(o=>{ const M=orderMoney(o), x=M.x;
      if(!onAcc(o)){ const pd=!!(x.paid||(x.bacs&&x.bacs.paid)||(/card/i.test(o.payment||'')&&!(curRev(o)&&curRev(o).method!=='card'))||o.method==='card'&&!curRev(o));
        if(!pd){ const no=pfNo(o), paid=paidOn(no)+(curRev(o)&&curRev(o).rev>1?revs(o).slice(0,-1).reduce((a,r)=>a+paidOn(PROJ_BASE(o)+(r.rev>1?'-R'+r.rev:'')),0):0), bal=r2(M.oGross-paid);
          if(bal>0.004) L.push({kind:'pf',doc:no,orderId:o.id,ref:o.ref,project:o.project||'',gross:M.oGross,paid:r2(paid),balance:bal,issued:o.placedAt||o.placed,due:'',status:paid>0?'part':'due',label:'Pro forma'}); } }
      else M.inv.forEach(v=>{ if(v.flagPaid) return; const paid=paidOn(v.doc), bal=r2(v.gross-paid); if(bal<=0.004) return; const od=new Date(v.due)<new Date();
        L.push(Object.assign(v,{ref:o.ref,paid,balance:bal,status:od?'overdue':paid>0?'part':'due',label:'VAT invoice'})); }); });
    return L.sort((a,b)=>(a.status==='overdue'?0:1)-(b.status==='overdue'?0:1)||new Date(a.due||a.issued)-new Date(b.due||b.issued)); }

  /* ---- take a payment ---- */
  function nextFeeNo(ref){ const n=all().filter(p=>p.fee&&p.fee.no&&p.fee.no.indexOf(String(ref).replace('MS-','INV-')+'-F')===0).length+1; return String(ref).replace('MS-','INV-')+'-F'+n; }
  function pay(opt){ const items=(opt.items||[]).filter(i=>+i.amount>0); if(!items.length) return null; const T=r2(items.reduce((a,i)=>a+(+i.amount),0)), card=opt.method==='card';
    const ord=((O()&&O().getOrders())||[]).find(o=>o.id===items[0].orderId)||{ref:'MS-0000'}, now=new Date().toISOString();
    const fg=card?feeFor(T,opt.region):0, fee=card&&fg?{no:nextFeeNo(ord.ref),gross:fg,net:r2(fg/1.2),vat:r2(fg-r2(fg/1.2)),pct:feePct(opt.region)}:null;
    const p={id:'pay'+Date.now().toString(36),at:now,method:opt.method,region:opt.region||'uk',items,total:T,fee,status:card?'paid':'pending',by:opt.by||'',email:opt.email||'',takenBy:opt.takenBy||'',ref:opt.ref||('PAY-'+Date.now().toString().slice(-6)),cust:opt.cust||'citrix'};
    const A=all(); A.unshift(p); P('ms-payments',A);
    if(card){ const X=ops(); items.forEach(i=>{ const o=((O()&&O().getOrders())||[]).find(z=>z.id===i.orderId); if(!o) return; const x=X[o.id]=X[o.id]||{v:2,lines:[]}; const M=orderMoney(o);
        if(i.kind==='pf'){ if(paidOn(i.doc)>=r2(M.oGross)-0.004||+i.amount>=+i.balance-0.004){ x.paid=true; x.paidBy='card'; x.paidAt=now; } }
        else if(i.kind==='vat'){ const v=M.inv.find(z=>z.doc===i.doc); if(v&&paidOn(i.doc)>=v.gross-0.004){ x.lines=x.lines||[]; x.lines[v.line]=Object.assign(x.lines[v.line]||{},{invPaid:true,invPaidAt:now}); } }
        (x.activity=x.activity||[]).unshift({at:now,who:opt.by||'Customer',t:'Paid '+i.doc+' by card · £'+(+i.amount).toFixed(2)+(fee?' · card fee invoice '+fee.no:'')}); });
      P('ms-order-ops',X);
      // accounting software: the fee invoice and the payment (allocated across the documents it paid) sync like any other invoice / payment
      try{ if(window.MSINT&&MSINT.sync){ if(fee) MSINT.sync('inv',fee.no,now); MSINT.sync('pay',p.id,now); } }catch(e){}
      try{ if(window.MSNOTIF) MSNOTIF.push('distributor',{ev:'invoice_paid',title:'Card payment received · £'+T.toFixed(2),body:items.map(i=>i.doc).join(', ')+(fee?' · fee invoice '+fee.no:''),href:'Merchsmith Finance.html#sub=cust'}); }catch(e){} }
    return p; }

  /* ---- card fee VAT invoice ---- */
  function feeDoc(p){ if(!window.MSPRO||!p||!p.fee) return ''; const ord=((O()&&O().getOrders())||[]).find(o=>o.id===p.items[0].orderId)||{};
    const cust=((window.ORG_DATA&&ORG_DATA.customers)||[]).find(c=>c.id===(p.cust||'citrix'))||{name:'Citrix'}, acct=J('ms-cust-account',{})[p.cust||'citrix']||{};
    return MSPRO.render({kind:'vat',no:p.fee.no,date:fD(p.at),dueOn:'',paid:true,paidOn:fD(p.at)+' by card',orderRef:ord.ref||'—',po:ord.po||'',terms:'Paid by card',
      invoiceTo:{name:cust.name||'Citrix',lines:String(ord.billing&&typeof ord.billing==='string'?ord.billing:(ord.address||'')).split(/,\s*/).filter((z,k)=>!(k===0&&z===(cust.name||'Citrix')))},
      customer:Object.assign({name:p.by||ord.placedBy||''},MSPRO.person(p.by||ord.placedBy)),custVat:acct.vatNo||'',
      notes:'Card payment of £'+p.total.toFixed(2)+' on '+fD(p.at)+' for: '+p.items.map(i=>i.doc+' (£'+(+i.amount).toFixed(2)+')').join(', ')+'.',
      items:[{name:'Card payment fee',sku:'',qty:1,unit:p.fee.net,amount:p.fee.net,branding:p.fee.pct+'% of £'+p.total.toFixed(2)+' paid by commercial card',colours:[],subs:[]}],
      net:p.fee.net,vat:p.fee.vat,vatRate:.2,gross:p.fee.gross,payRef:p.ref}); }

  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36);
  const payUrl=(cust,doc,guest)=>'Merchsmith Pay.html?a='+encodeURIComponent(cust||'citrix')+'&k='+hash((cust||'citrix')+'|ms')+(doc?'&d='+encodeURIComponent(doc):'')+(guest?'&guest=1':'');
  const tokenOk=(cust,t)=>t===hash((cust||'citrix')+'|ms');
  return {outstanding,paidOn,pfNo,revise,revs,curRev,feePct,feeFor,pay,feeDoc,paymentsFor,feeShare,payUrl,tokenOk,orderMoney,all};
})();
