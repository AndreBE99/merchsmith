/* finance-view.js — Checkout step 2 "Finance" (polished, Sep 2026). order-page.js renderFinance() hands over
   to window.__finRender(ctx) when present; ctx = {root, stepsBar, checkout, back(), place(opts)}.
   Cards: Billing address (from the organisation; editable; "same as a delivery address") · Invoice contact ·
   Payment (on account / pay now: card with live fee, or bank transfer with bank details + pro-forma) ·
   Delivery summary per address · Order reference + PO (required/optional from the customer's account) + PO upload ·
   Terms tick. Summary panel on the right: totals incl. card fee, credit (used / this order / left after). */
(function(){
  const O=window.MSOrders; if(!O) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=O.gbp, CUST=O.CUST||'citrix';
  // card fee: Finance → Integrations → Stripe (pass on / absorb, % per card type); no Stripe = no card option
  const FEEP=m=>{ const s=window.MSINT&&MSINT.stripe(); if(!s) return ({uk:0.015,noneu:0.03,bacs:0})[m]||0; if(m==='bacs'||!s.connected||s.fee.mode==='absorb') return 0; return (m==='noneu'?s.fee.intl:s.fee.uk)/100; };
  const FEE=new Proxy({},{get:(_,m)=>FEEP(m)});
  const CARDS=()=>!window.MSINT||MSINT.cardMethods();
  const BANK=window.MSFIN?MSFIN.bank():{name:'Mojo Promotions Ltd',bank:'Barclays Bank UK PLC',sort:'20-45-77',acc:'43218765',iban:'GB29 BARC 2045 7743 2187 65',bic:'BARCGB22'};
  const org=()=>((window.ORG_DATA&&ORG_DATA.customers)||[]).find(c=>c.id===CUST)||{name:'Citrix'};
  const acctOf=()=>window.MSCUSTACCT?MSCUSTACCT.get(CUST):Object.assign({terms:'30 days from delivery',creditLimit:0,creditUsed:0,poRequired:false},O.account?O.account():{});
  const addrLines=a=>a?[a.name,...(a.lines||[])].map(x=>String(x).replace(/,\s*$/,'')).filter(Boolean):[];
  function orgBilling(){ const c=org(); return {name:c.legalName||c.name,lines:[c.addr1,c.addr2,c.city,c.county,c.postcode,c.country].filter(Boolean)}; }
  const I=n=>`<svg class="icn"><use href="#o-${n}"/></svg>`;

  window.__finRender=function(ctx){ const {root,stepsBar,checkout}=ctx; const t=O.totals(), acct=acctOf();
    const upfront=window.MSCUSTACCT?MSCUSTACCT.upfront(acct.terms):false;
    const avail=Math.max(0,(acct.creditLimit||0)-(acct.creditUsed||0)), over=!!acct.creditLimit&&t.dTot>avail;
    const canAccount=!upfront&&!!acct.creditLimit&&!over;
    if(!checkout.pay||(checkout.pay==='account'&&!canAccount)) checkout.pay=canAccount?'account':'now';
    if(!checkout.method) checkout.method='uk';
    if(!checkout.billing) checkout.billing=orgBilling();
    const FIN=window.MSCUSTACCT&&MSCUSTACCT.financeUsers?MSCUSTACCT.financeUsers(CUST):[];
    if(!checkout.invoice){ const ic=window.MSCUSTACCT&&MSCUSTACCT.invoiceContact?MSCUSTACCT.invoiceContact(CUST):{name:acct.invoiceName||'Accounts payable',email:acct.invoiceEmail||'',user:'manual'}; checkout.invoice={name:ic.name,email:ic.email,user:ic.user}; }
    if(!CARDS()&&checkout.method!=='bacs') checkout.method='bacs';
    const payNow=checkout.pay==='now', fee=payNow?Math.round(t.dTot*(FEE[checkout.method]||0)*100)/100:0, total=t.dTot+fee;
    // delivery summary: lines grouped by address
    const groups=[]; O.getBasket().forEach(l=>{ const key=l.address?addrLines(l.address).join('|'):''; let g=groups.find(x=>x.key===key); if(!g) groups.push(g={key,addr:l.address,lines:[]}); g.lines.push(l); });
    const book=O.addressBook?O.addressBook():[];
    const labelOf=a=>{ if(!a) return 'No address chosen'; const k=addrLines(a).join('|'); const b=book.find(x=>addrLines(x).join('|')===k); return b?b.label:(a.name||'Delivery address'); };
    const onAcc=checkout.pay==='account', lvl=onAcc?(acct.poLevel||'number'):'optional', poReq=lvl!=='optional', fileReq=lvl==='upload', poOk=(!poReq||!!(checkout.po&&checkout.po.trim()))&&(!fileReq||!!checkout.poFile);
    const gateOrg=localStorage.getItem('ms-cust-onboard-latest'), gate=window.MSONB&&gateOrg&&(window.MSID&&MSID.current?MSID.current():'')==='customer'&&!MSONB.orgReady(gateOrg);
    const ready=!gate&&poOk&&!!checkout.tc&&!!(checkout.invoice.email||'').includes('@')&&groups.every(g=>g.addr);
    const lim=acct.creditLimit||0, pUsed=lim?Math.min(100,acct.creditUsed/lim*100):0, pThis=lim&&checkout.pay==='account'?Math.min(100-pUsed,t.dTot/lim*100):0;

    root.innerHTML=`<div class="wrap fn">
      <div class="bk-top"><h1 class="bt">Finance</h1><span class="bk-count">${t.count} item${t.count>1?'s':''}</span><span class="bk-sp"></span>${stepsBar(1)}</div>
      <div class="bk-layout"><div class="fn-main">

        <section class="fn-card"><div class="fn-hd"><span class="fn-n">1</span><h2>Billing address</h2><span class="bk-sp"></span>${checkout.editBill?'':`<button class="fn-link" data-fedit>${I('edit')}Edit</button>`}</div>
          ${checkout.editBill?`<div class="fn-grid">
              <label class="fn-f fn-w2"><span>Organisation / name</span><input data-fb="name" value="${esc(checkout.billing.name)}"></label>
              ${[0,1,2,3,4].map(i=>`<label class="fn-f${i<2?' fn-w2':''}"><span>${['Address line 1','Address line 2','Town / city','Postcode','Country'][i]}</span><input data-fbl="${i}" value="${esc(checkout.billing.lines[i]||'')}"></label>`).join('')}</div>
            <div class="fn-row"><button class="bk-cta2 sm" data-fsave>Save address</button><button class="fn-link" data-fcancel>Cancel</button></div>`
          :`<div class="fn-addr">${addrLines(checkout.billing).map((x,i)=>i?`<span>${esc(x)}</span>`:`<b>${esc(x)}</b>`).join('')}</div>`}
          <div class="fn-row fn-same"><span>Same as a delivery address:</span>${book.slice(0,4).map(b=>`<button class="fn-chip" data-fsame="${esc(b.id)}">${esc(b.label)}</button>`).join('')}<button class="fn-chip" data-forg>Organisation address</button></div>
          ${org().vat?`<p class="fn-muted">VAT number ${esc(org().vat)}</p>`:''}</section>

        <section class="fn-card"><div class="fn-hd"><span class="fn-n">2</span><h2>Invoice contact</h2></div>
          <p class="fn-lede">Who should receive the invoice for this order. ${FIN.length?'Your default is set in Settings → Account &amp; terms.':'No one in your team has the Finance role yet, so enter a contact.'}</p>
          ${FIN.length?`<div class="fn-opts">${FIN.map(u=>`<button class="fn-meth${checkout.invoice.user===u.email?' on':''}" data-finu="${esc(u.email)}"><span class="fn-radio"></span><div><b>${esc(u.n)}</b><span>${esc(u.title||'Finance')} · ${esc(u.email)}</span></div></button>`).join('')}<button class="fn-meth${checkout.invoice.user==='manual'?' on':''}" data-finu="manual"><span class="fn-radio"></span><div><b>Someone else</b><span>Enter a name and email</span></div></button></div>`:''}
          ${!FIN.length||checkout.invoice.user==='manual'?`<div class="fn-grid"${FIN.length?' style="margin-top:12px"':''}><label class="fn-f"><span>Name</span><input data-fi="name" value="${esc(checkout.invoice.name)}"></label>
            <label class="fn-f"><span>Email</span><input data-fi="email" type="email" value="${esc(checkout.invoice.email)}" placeholder="accounts@company.com"></label></div>`:''}</section>

        <section class="fn-card"><div class="fn-hd"><span class="fn-n">3</span><h2>Payment</h2><span class="bk-sp"></span><span class="fn-tag">Terms set by Mojo Promotions</span></div>
          <div class="fn-opts">
            ${upfront?'':`<label class="fn-opt${checkout.pay==='account'?' on':''}${canAccount?'':' dis'}"><input type="radio" name="fpay" data-fpay="account"${checkout.pay==='account'?' checked':''}${canAccount?'':' disabled'}><span class="fn-radio"></span><div><b>On account</b><span>${canAccount?esc(acct.terms)+'. No payment now; invoiced on your terms.':'Not available for this order: it’s over your available credit.'}</span></div></label>`}
            <label class="fn-opt${payNow?' on':''}"><input type="radio" name="fpay" data-fpay="now"${payNow?' checked':''}><span class="fn-radio"></span><div><b>Pay now</b><span>${upfront?esc(acct.terms)+'. Your account pays when you order.':'By card or bank transfer.'}</span></div></label>
          </div>
          ${over&&!upfront?`<div class="fn-warn"><b>This order is over your available credit</b><span>${gbp(t.dTot)} is more than the ${gbp(avail)} left on your account. Pay now, or send it to Mojo Promotions to approve.</span><button class="fn-ghost sm" data-fask>Send for approval</button></div>`:''}
          ${payNow?`<div class="fn-methods">
            ${[...(CARDS()?[['uk','UK / European card',window.MSINT?MSINT.feeLabel('uk'):'1.5% card fee'],['noneu','Non UK / European card',window.MSINT?MSINT.feeLabel('noneu'):'3% card fee']]:[]),['bacs','Bank transfer','No fee']].map(([k,l,f])=>`<button class="fn-meth${checkout.method===k?' on':''}" data-fmeth="${k}"><span class="fn-radio"></span><div><b>${l}</b><span>${f}</span></div>${k!=='bacs'?'<span class="fn-cards"><i>VISA</i><i>MC</i><i>AMEX</i></span>':''}</button>`).join('')}</div>
            ${checkout.method==='bacs'?`<div class="fn-bank"><div class="fn-bgrid">${[['Account name',BANK.name],['Bank',BANK.bank],['Sort code',BANK.sort],['Account number',BANK.acc],['IBAN',BANK.iban],['BIC / SWIFT',BANK.bic],['Reference',window.MSFIN?MSFIN.refFor('',checkout.po):(checkout.po||'Your order reference')]].map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>${BANK.note?`<p class="fn-muted">${esc(BANK.note)}</p>`:''}
                ${(()=>{ const B=window.MSBACS; if(!B) return '<p class="fn-muted">Production starts once payment has cleared.</p>'; const crit=B.critical(O.getBasket()), dl=B.deadline(); return `<div class="fn-warn${crit?' crit':''}" style="margin:12px 0 8px"><b>Pay by ${esc(B.label(dl))}${crit?' · Critical':''}</b><span>${crit?'Your order has a specified or critical delivery date.':''} Payment must clear within ${B.hours()} hour${B.hours()>1?'s':''} to keep the delivery dates agreed on your project. Production starts once payment has cleared.</span></div>`; })()}<button class="fn-ghost sm" data-fproforma>${I('dl')}Download pro-forma invoice</button></div>`
            :`<div class="fn-cardform"><p class="fn-sec">${I('check')}Business (commercial) cards only. Personal debit and credit cards are declined.</p><p class="fn-sec">${I('check')}Your bank may ask you to confirm the payment with a code. They’ll never ask you to share it.</p>
                <div class="fn-grid"><label class="fn-f fn-w2"><span>Card number</span><input data-fcn placeholder="1234 5678 9012 3456" inputmode="numeric"></label><p class="fn-cerr" data-fcerr hidden></p><label class="fn-f fn-w2"><span>Name on card</span><input></label>
                <label class="fn-f"><span>Expiry</span><input placeholder="MM/YY"></label><label class="fn-f"><span>Security code</span><input placeholder="123" inputmode="numeric"></label></div>
                <label class="fn-chk"><input type="checkbox"><span>Save card for future orders</span></label></div>`}
            <p class="fn-muted">We can’t accept personal credit cards or cheques.</p>`:''}
        </section>

        <section class="fn-card"><div class="fn-hd"><span class="fn-n">4</span><h2>Delivery summary</h2><span class="bk-sp"></span><button class="fn-link" data-fbask>Change in basket</button></div>
          ${groups.map(g=>`<div class="fn-dg${g.addr?'':' miss'}"><div class="fn-dgh">${I('addr')}<div><b>${esc(labelOf(g.addr))}</b><span>${g.addr?esc(addrLines(g.addr).slice(1).join(', ')):'Choose an address in the basket before ordering'}</span></div><span class="fn-dgc">${g.lines.length} line${g.lines.length>1?'s':''}</span></div>
            <ul>${g.lines.map(l=>`<li><span>${esc(l.name)}${l.kind==='sample'?' <em>Sample</em>':''}</span><span>${O.lineQty(l).toLocaleString('en-GB')} · ${esc(l.deliveryDate||'ASAP')}</span></li>`).join('')}</ul></div>`).join('')}</section>

        <section class="fn-card"><div class="fn-hd"><span class="fn-n">5</span><h2>Order reference &amp; purchase order</h2></div>
          <div class="fn-grid"><label class="fn-f"><span>Purchase order number ${poReq?'<em class="fn-req">Required</em>':'<em class="fn-opt2">Optional</em>'}</span><input data-fpo value="${esc(checkout.po||'')}" placeholder="e.g. PO-48213"></label>
            <label class="fn-f"><span>Your reference <em class="fn-opt2">Optional</em></span><input data-fref value="${esc(checkout.ref||'')}" placeholder="e.g. Autumn campaign"></label></div>
          ${checkout.poFile?`<div class="fn-file">${/^data:image/.test(checkout.poFile.data)?`<img src="${checkout.poFile.data}" alt="">`:`<span class="fn-fic">${checkout.poFile.name.split('.').pop().toUpperCase().slice(0,4)}</span>`}<div><b>${esc(checkout.poFile.name)}</b><span>${(checkout.poFile.size/1024).toFixed(0)} KB</span></div><button class="fn-link" data-fview>View</button><button class="fn-link danger" data-frm>Remove</button></div>`
          :`<label class="fn-drop${fileReq?' req':''}">${I('up')}<span><b>Upload your purchase order ${fileReq?'<em class="fn-req">Required</em>':'<em class="fn-opt2">Optional</em>'}</b> PDF, Word or image, up to 5 MB</span><input type="file" data-ffile accept=".pdf,.doc,.docx,image/*" hidden></label>`}
          ${poReq&&!poOk?`<p class="fn-need">Orders on account need ${fileReq?'a purchase order number and the PO document':'a purchase order number'}.</p>`:''}</section>

        <section class="fn-card fn-tc"><label class="fn-chk"><input type="checkbox" data-ftc${checkout.tc?' checked':''}><span>I’ve read and agree to the <a href="Merchsmith Page.html?p=terms" target="_blank">terms &amp; conditions of sale</a>, including that delivery dates are held from order acknowledgement.</span></label></section>
      </div>

      <aside class="bk-sum fn-sum"><h3>Summary</h3>
        <div class="bk-sr"><span>Orders</span><span>${gbp(t.oNet)}</span></div>
        ${t.sNet?`<div class="bk-sr"><span>Samples</span><span>${gbp(t.sNet)}</span></div>`:''}
        ${t.promo&&!t.promo.err?`<div class="bk-sr promo"><span>Code ${esc(t.promo.code)}</span><span>−${gbp(t.promoOff)}</span></div>`:''}
        <div class="bk-sr"><span>VAT${t.vatRate?' ('+Math.round(t.vatRate*100)+'%)':''}</span><span>${t.vatRate?gbp(t.dVat):'Not charged'}</span></div>
        ${fee?`<div class="bk-sr fn-fee"><span>Card fee (${(FEE[checkout.method]*100).toFixed(1).replace('.0','')}%)</span><span>${gbp(fee)}</span></div>`:''}
        <div class="bk-sr bk-tot"><span>Total ${payNow?'to pay now':'on account'}</span><span>${gbp(total)}</span></div>
        ${lim?`<div class="fn-credit"><div class="fn-ch"><span>Credit</span><b>${gbp(Math.max(0,avail-(checkout.pay==='account'?t.dTot:0)))} left after</b></div>
          <div class="fn-cbar"><i style="width:${pUsed}%"></i>${pThis?`<i class="this" style="width:${pThis}%"></i>`:''}</div>
          <div class="fn-cleg"><span><i></i>Used ${gbp(acct.creditUsed)}</span>${checkout.pay==='account'?`<span><i class="this"></i>This order ${gbp(t.dTot)}</span>`:''}<span>Limit ${gbp(lim)}</span></div></div>`:''}
        ${gate?'<div class="fn-warn sm"><b>Your account is being set up</b><span>Your main contact needs to finish setting up your organisation before anyone can order.</span></div>':''}
        <button class="contbtn bk-cta" id="placeBtn"${ready?'':' disabled'}>${payNow?(checkout.method==='bacs'?'Place order':'Place order &amp; pay'):'Place order on account'}${I('arr')}</button>
        ${ready?'':`<ul class="fn-todo">${[!checkout.tc&&'Agree to the terms',poReq&&!(checkout.po&&checkout.po.trim())&&'Add a purchase order number',fileReq&&!checkout.poFile&&'Upload your purchase order',!(checkout.invoice.email||'').includes('@')&&'Add an invoice email',!groups.every(g=>g.addr)&&'Choose a delivery address for every line'].filter(Boolean).map(x=>`<li>${x}</li>`).join('')}</ul>`}
        <button class="fn-ghost fn-back" data-fback>‹ Back to basket</button>
      </aside></div></div>`;

    const re=()=>window.__finRender(ctx), q=s=>root.querySelector(s), qa=s=>root.querySelectorAll(s);
    const keep=(sel,fn)=>qa(sel).forEach(el=>el.addEventListener('input',()=>fn(el)));
    const e1=q('[data-fedit]'); if(e1) e1.onclick=()=>{ checkout.editBill=true; re(); };
    const fc=q('[data-fcancel]'); if(fc) fc.onclick=()=>{ checkout.editBill=false; re(); };
    const fs=q('[data-fsave]'); if(fs) fs.onclick=()=>{ const n=q('[data-fb="name"]').value.trim(); const L=[...qa('[data-fbl]')].map(i=>i.value.trim()).filter(Boolean); checkout.billing={name:n||checkout.billing.name,lines:L}; checkout.editBill=false; re(); };
    qa('[data-fsame]').forEach(b=>b.onclick=()=>{ const a=book.find(x=>x.id===b.dataset.fsame); if(a){ checkout.billing={name:org().legalName||org().name,lines:addrLines(a).slice(1).filter(x=>x.toLowerCase()!==String(org().name).toLowerCase())}; checkout.editBill=false; re(); } });
    q('[data-forg]').onclick=()=>{ checkout.billing=orgBilling(); checkout.editBill=false; re(); };
    qa('[data-finu]').forEach(b=>b.onclick=()=>{ const v=b.dataset.finu, u=FIN.find(x=>x.email===v), a=acctOf(); checkout.invoice=u?{name:u.n,email:u.email,user:u.email}:{name:a.invoiceName||'',email:a.invoiceEmail||'',user:'manual'}; re(); });
    keep('[data-fi]',el=>{ checkout.invoice[el.dataset.fi]=el.value; });
    qa('[data-fi="email"]').forEach(el=>el.addEventListener('change',re));
    qa('[data-fpay]').forEach(r=>r.onchange=()=>{ checkout.pay=r.dataset.fpay; re(); });
    qa('[data-fmeth]').forEach(b=>b.onclick=()=>{ checkout.method=b.dataset.fmeth; re(); });
    const po=q('[data-fpo]'); po.addEventListener('input',()=>{ checkout.po=po.value; }); po.addEventListener('change',re);
    const rf=q('[data-fref]'); rf.addEventListener('input',()=>{ checkout.ref=rf.value; });
    const ff=q('[data-ffile]'); if(ff) ff.onchange=()=>{ const f=ff.files[0]; if(!f) return; if(f.size>5*1024*1024){ alert('That file is over 5 MB.'); return; } const r=new FileReader(); r.onload=()=>{ checkout.poFile={name:f.name,size:f.size,data:r.result}; re(); }; r.readAsDataURL(f); };
    const fv=q('[data-fview]'); if(fv) fv.onclick=()=>{ const w=window.open(); if(w) w.document.write(/^data:image/.test(checkout.poFile.data)?`<img src="${checkout.poFile.data}" style="max-width:100%">`:`<iframe src="${checkout.poFile.data}" style="border:0;width:100%;height:100vh"></iframe>`); };
    const fr=q('[data-frm]'); if(fr) fr.onclick=()=>{ checkout.poFile=null; re(); };
    q('[data-ftc]').onchange=e=>{ checkout.tc=e.target.checked; re(); };
    q('[data-fbask]').onclick=ctx.back; q('[data-fback]').onclick=ctx.back;
    const pf=q('[data-fproforma]'); if(pf) pf.onclick=()=>proforma(t,checkout);
    const orderOpts=extra=>Object.assign({ placedBy:O.ADDR.name, address:groups.filter(g=>g.addr).map(g=>addrLines(g.addr).join(', ')).join(' · '), po:checkout.po, reference:checkout.ref,
      billing:addrLines(checkout.billing).join(', '), invoiceTo:checkout.invoice, poFile:checkout.poFile?checkout.poFile.name:null },extra);
    const ask=q('[data-fask]'); if(ask) ask.onclick=()=>ctx.place(orderOpts({payment:'Awaiting credit approval · '+acct.terms,status:'approval',approval:{over:t.dTot-avail}}));
    q('#placeBtn').onclick=()=>{ if(!ready) return;
      // business (commercial) cards only: the card processor reports the card type; prototype: numbers starting 4000 act as personal cards
      const cn=q('[data-fcn]'), ce=q('[data-fcerr]'); if(checkout.pay!=='account'&&checkout.method!=='bacs'&&cn){ const d=(cn.value||'').replace(/\D/g,''); if(/^4000/.test(d)){ ce.textContent='This looks like a personal card. Mojo Promotions can only accept business (commercial) cards. Use a company card or choose bank transfer.'; ce.hidden=false; cn.focus(); return; } ce.hidden=true; }
      ackThen(()=>{
      ctx.place(orderOpts({ ...(checkout.pay!=='account'&&checkout.method==='bacs'&&window.MSBACS?{payBy:MSBACS.deadline().toISOString(),payCrit:MSBACS.critical(O.getBasket())}:{}), payment: checkout.pay==='account'?'On account · '+acct.terms:(checkout.method==='bacs'?'Bank transfer (awaiting payment)':'Paid by card'), onAccount:checkout.pay==='account', method:checkout.pay==='account'?'account':checkout.method, terms:acct.terms, cardFee:fee }));
      if(checkout.pay==='account'&&window.MSCUSTACCT) MSCUSTACCT.useCredit(CUST,t.dTot); }); };
  };

  // last check before an order is placed: branded goods are made to order and can't be refunded
  function ackThen(go){ const w=document.createElement('div'); w.className='fn-ackw';
    w.innerHTML=`<div class="fn-ack" role="dialog" aria-modal="true" aria-labelledby="fnAckT"><div class="fn-ackic">${I('info')}</div><h3 id="fnAckT">Before you place your order</h3>
      <p>Once your order has been placed, we will be unable to offer a refund for any custom branded goods, as these are made to order uniquely for you.</p>
      <label class="fn-chk"><input type="checkbox" data-ackc><span>I acknowledge these terms, please proceed</span></label>
      <div class="fn-ackf"><button class="fn-ghost" data-ackx>Go back</button><button class="bk-cta2" data-ackgo disabled>Place order</button></div></div>`;
    document.body.appendChild(w); const close=()=>w.remove(), c=w.querySelector('[data-ackc]'), g=w.querySelector('[data-ackgo]');
    c.onchange=()=>{ g.disabled=!c.checked; }; w.querySelector('[data-ackx]').onclick=close; w.addEventListener('mousedown',e=>{ if(e.target===w) close(); });
    document.addEventListener('keydown',function k(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown',k); } });
    g.onclick=()=>{ if(!c.checked) return; close(); go(); }; c.focus(); }
  function proforma(t,checkout){ const w=window.open('','_blank'); if(!w) return; const today=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
    const L=O.getBasket(), AL=a=>a?(Array.isArray(a.lines)?a.lines:addrLines(a)):[], ref=checkout.po||checkout.ref||'';
    const no=MSPRO.number('basket:'+L.map(l=>l.id).join(',')), NT=(()=>{ try{ return JSON.parse(localStorage.getItem('ms-basket-addr-notes')||'{}'); }catch(e){ return {}; } })();
    const dq=d=>window.MSSPLIT&&MSSPLIT.dropQty?MSSPLIT.dropQty(d):Object.values(d.alloc||{}).reduce((a,v)=>a+(+v||0),0);
    const items=L.map(l=>{ const q=O.lineQty(l), unit=l.each*(1-(l.discountPct||0)/100), subs=(l.charges||[]).filter(c=>+c.amt).map(c=>({label:c.label,qty:+c.qty||1,unit:c.unit!=null?+c.unit:+c.amt,amount:+c.amt}));
      if(+l.additional&&!subs.length) subs.push({label:'Setup and extras',qty:1,unit:+l.additional,amount:+l.additional});
      if(+l.deliveryCost) subs.push({label:l.drops&&l.drops.length>1?'Delivery · '+l.drops.length+' addresses':'UK mainland delivery',qty:1,unit:+l.deliveryCost,amount:+l.deliveryCost});
      return {project:l.project||'',name:l.name,kind:l.kind,sku:l.sku||'',qty:q,unit,amount:O.lineItemCost(l),branding:l.kind==='sample'?(l.proof==='unbranded'?'Unbranded sample':'Branded sample'):(l.proof==='unbranded'?'Unbranded':(l.brandingText||'Branded to your approved proof')),
        colours:(l.rows||[]).filter(r=>r.qty).map(r=>({c:r.c,qty:r.qty})),deliverBy:l.deliveryDate||'ASAP',subs,
        deliver:(l.drops&&l.drops.length>1?l.drops.map(d=>({name:(d.address||{}).name||'',lines:AL(d.address),qty:dq(d),split:Object.entries(d.alloc||{}).map(([c,q])=>({c,qty:+q||0})),date:d.date||'',notes:[]})):[{name:(l.address||{}).name||'',lines:AL(l.address),notes:((NT[l.id]||[]).map(n=>n.text)).concat(l.address&&l.address.note?[l.address.note]:[])}]).filter(a=>a.lines.length)}; });
    const dAddr=[]; L.forEach(l=>(l.drops&&l.drops.length?l.drops.map(d=>d.address):[l.address]).forEach(ad=>{ if(!ad) return; const ln=AL(ad), key=ln.join('|'); if(!dAddr.some(z=>z.key===key)) dAddr.push({key,name:ad.name||'',lines:ln}); }));
    const sub=items.reduce((a,it)=>a+it.amount+it.subs.reduce((q,s)=>q+s.amount,0),0), off=Math.round((sub-t.dNet)*100)/100, acct=acctOf();
    w.document.write(MSPRO.render({no,date:today,orderRef:'Issued at checkout',po:checkout.po,terms:'Payment before production',contact:null,
      invoiceTo:{name:org().name,lines:addrLines(checkout.billing).filter((z,i)=>!(i===0&&z===org().name)),fao:checkout.invoice&&checkout.invoice.name},
      customer:Object.assign({name:O.ADDR&&O.ADDR.name,email:checkout.invoice&&checkout.invoice.email},MSPRO.person(O.ADDR&&O.ADDR.name)),items,extras:off>0.004?[{label:'Discount',amount:-off}]:[],
      net:t.dNet,vat:t.dVat,vatRate:O.vatRate?O.vatRate():0.2,gross:t.dTot,custVat:acct.vatNo||'',payRef:ref||no,autoPrint:true})); w.document.close(); }
})();
