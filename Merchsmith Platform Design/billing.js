/* ============================================================
   billing.js — how a distributor pays Merchsmith for their plan.

   Two payment methods, both designed around Stripe:
     · Card            — Stripe Payment Element / SetupIntent
     · Direct Debit    — Stripe Bacs Direct Debit (UK) mandate
   (GoCardless is the usual alternative for Direct Debit; the
   screens are the same, only the provider behind them changes.)

   PROTOTYPE: no real Stripe calls. Card and bank details are never
   stored — only what Stripe would hand back (brand, last 4, expiry,
   mandate reference). Amounts come from ADMIN.seatInfo so they match
   the Subscription tab and Platform Admin.

   window.MSBILL:
     get(id) / setMethod(id,m) / setDetails(id,f)
     invoices(d)            generated history + the upcoming one
     next(d)                {date, net, vat, gross, method}
     methodText(m)          "Visa ···· 4242" / "Direct Debit ···· 6789"
     panel(el,d)            Distributor Settings → Billing tab
     adminLines(d)          kv rows for the Platform Admin drawer
   ============================================================ */
window.MSBILL=(function(){
  const KEY='ms-billing', VAT=0.2;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } };
  const save=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} };
  const A=()=>window.ADMIN;
  const ref=()=>'MSM-'+Math.random().toString(36).slice(2,8).toUpperCase();
  function seed(){ return {
    acme:{method:{type:'card',brand:'Visa',last4:'4242',exp:'08/28',name:'Jess Doyle',addedAt:'2025-02-11'}},
    brightside:{method:{type:'bacs',last4:'6789',sortEnd:'10',name:'Brightside Promo Ltd',mandate:ref(),mandateStatus:'active',addedAt:'2023-07-03'}},
    northstar:{method:{type:'card',brand:'Mastercard',last4:'5100',exp:'11/27',name:'Lena Frost',addedAt:'2022-11-21'}},
    kober:{method:{type:'card',brand:'Visa',last4:'1881',exp:'03/27',name:'Stefan Köber',addedAt:'2024-02-08'}},
    limelight:{method:{type:'bacs',last4:'2231',sortEnd:'44',name:'Limelight Gifts',mandate:ref(),mandateStatus:'pending',addedAt:'2026-06-17'}},
    pinnacle:{method:{type:'card',brand:'Visa',last4:'0341',exp:'09/26',name:'Dwight Carver',addedAt:'2023-09-26'},failed:true},
    verde:{method:{type:'bacs',last4:'9012',sortEnd:'21',name:'Verde Eco Promo SL',mandate:ref(),mandateStatus:'active',addedAt:'2024-04-11'}},
    tartan:{method:{type:'bacs',last4:'4410',sortEnd:'83',name:'Tartan Trade Gifts',mandate:ref(),mandateStatus:'active',addedAt:'2025-01-29'}},
    cobalt:{method:{type:'card',brand:'Amex',last4:'0005',exp:'01/26',name:'Priya Anand',addedAt:'2023-08-05'}}
  }; }
  function db(){ let o=load(); if(!o){ o=seed(); save(o); } return o; }
  const get=id=>db()[id]||{};
  function put(id,patch){ const o=db(); o[id]=Object.assign(o[id]||{},patch); save(o); try{ window.dispatchEvent(new CustomEvent('ms-billing-change',{detail:{id}})); }catch(e){} }
  const setMethod=(id,m)=>put(id,{method:m,failed:false});
  const setDetails=(id,f)=>put(id,{details:f});
  const money=(d,n)=>(d.cur||'£')+Number(n).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtD=x=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  function methodText(m){ if(!m) return 'No payment method';
    return m.type==='bacs'?`Direct Debit ···· ${m.last4}`:`${m.brand||'Card'} ···· ${m.last4}`; }
  function expired(m){ if(!m||m.type!=='card'||!m.exp) return false; const [mm,yy]=m.exp.split('/').map(Number); return new Date(2000+yy,mm,1)<=new Date(); }
  // billing date = join day each month; Direct Debit collects on it but is requested 3 working days before
  function next(d){ const s=A().seatInfo(d), j=new Date(d.joined||Date.now()), now=new Date(), day=j.getDate();
    let n=new Date(now.getFullYear(),now.getMonth(),day); if(n<=now) n=new Date(now.getFullYear(),now.getMonth()+1,day);
    const net=s.total, vat=Math.round(net*VAT*100)/100; return {date:n, net, vat, gross:net+vat, method:get(d.id).method, billing:s.billing}; }
  function invoices(d){ const out=[], s=A().seatInfo(d), j=new Date(d.joined||Date.now()), day=j.getDate(), now=new Date(), b=get(d.id);
    for(let i=1;i<=12;i++){ const dt=new Date(now.getFullYear(),now.getMonth()-i+(now.getDate()>=day?1:0),day); if(dt<j) break;
      const net=d.status==='suspended'&&i<3?0:s.plan.base+s.overage, vat=Math.round(net*VAT*100)/100;
      const st=d.status==='past_due'&&i===1?'failed':'paid';
      out.push({no:'MS-'+dt.getFullYear()+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(d.id).slice(0,4).toUpperCase(),date:dt,net,vat,gross:net+vat,status:st,
        lines:[[s.plan.name+' plan · base',s.plan.base],...(s.extra?[[s.extra+' additional seat'+(s.extra===1?'':'s')+' × '+s.rateTxt,s.overage]]:[])],method:b.method}); }
    return out.filter(x=>x.net>0||x.status==='failed'); }

  /* ---------- invoice view (printable) ---------- */
  function openInvoice(d,inv){ const b=get(d.id), det=b.details||{};
    const w=window.open('','_blank'); if(!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.no)}</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#222;margin:48px auto;max-width:720px;padding:0 24px;font-size:14px;}
      h1{font-size:28px;margin:0 0 4px;font-weight:600} .mut{color:#777} table{width:100%;border-collapse:collapse;margin:28px 0}
      td,th{padding:10px 0;border-bottom:1px solid #eee;text-align:left} th{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#888}
      .r{text-align:right} .tot td{font-weight:700;border-bottom:0} .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}
      .st{display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;border-radius:6px;padding:3px 8px;background:${inv.status==='paid'?'#e2f0e9;color:#2E7A57':'#fbe3df;color:#b4232c'}}
      @media print{.noprint{display:none}}</style></head><body>
      <p class="noprint"><button onclick="print()">Print / save as PDF</button></p>
      <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h1>Invoice</h1><div class="mut">${esc(inv.no)} · ${fmtD(inv.date)}</div></div><span class="st">${inv.status}</span></div>
      <div class="cols"><div><b>From</b><br>Merchsmith Ltd<br>Unit 4, The Tannery, 91 Kirkstall Road<br>Leeds LS3 1HS<br><span class="mut">VAT GB 412 7390 21</span></div>
        <div><b>Bill to</b><br>${esc(det.company||d.legalName||d.name)}<br>${esc(det.address||'').replace(/\n/g,'<br>')}${det.vat?`<br><span class="mut">VAT ${esc(det.vat)}</span>`:''}${det.po?`<br><span class="mut">PO ${esc(det.po)}</span>`:''}</div></div>
      <table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>
        ${inv.lines.map(([l,v])=>`<tr><td>${esc(l)}</td><td class="r">${money(d,v)}</td></tr>`).join('')}
        <tr><td class="mut">Subtotal</td><td class="r">${money(d,inv.net)}</td></tr><tr><td class="mut">VAT 20%</td><td class="r">${money(d,inv.vat)}</td></tr>
        <tr class="tot"><td>Total</td><td class="r">${money(d,inv.gross)}</td></tr></tbody></table>
      <p class="mut">${inv.status==='paid'?'Paid by '+esc(methodText(inv.method)):'Payment failed on '+esc(methodText(inv.method))+'. Please update your payment method.'}</p>
      </body></html>`); w.document.close(); }

  /* ---------- payment method forms ---------- */
  const digits=v=>String(v||'').replace(/\D/g,'');
  function brandOf(n){ n=digits(n); return /^4/.test(n)?'Visa':/^(5[1-5]|2[2-7])/.test(n)?'Mastercard':/^3[47]/.test(n)?'Amex':'Card'; }
  function luhn(n){ n=digits(n); let s=0,alt=false; for(let i=n.length-1;i>=0;i--){ let x=+n[i]; if(alt){ x*=2; if(x>9)x-=9; } s+=x; alt=!alt; } return n.length>=12&&s%10===0; }
  function methodModal(d,onDone){
    const P=window.MSPEOPLE; if(!P||!P.modal) return;
    const cur=get(d.id).method; let type=cur&&cur.type==='bacs'?'bacs':'card';
    const m=P.modal('Payment method',`<div class="bl-seg" data-blseg>
        <button type="button" data-bt="card">Card</button><button type="button" data-bt="bacs">Direct Debit</button></div>
      <div data-blform></div><p class="pp-note" data-blerr style="color:#b4232c;display:none"></p>`,
      `<span class="bl-secure">Secured by Stripe</span><button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-blsave>Save</button>`);
    const R=m.root, F=R.querySelector('[data-blform]'), err=R.querySelector('[data-blerr]');
    let step='form', bacs={};
    const draw=()=>{ R.querySelectorAll('[data-bt]').forEach(b=>b.classList.toggle('on',b.dataset.bt===type)); err.style.display='none';
      const sv=R.querySelector('[data-blsave]');
      if(type==='card'){ step='form'; sv.textContent='Save card';
        F.innerHTML=`<div class="pp-grid" style="grid-template-columns:1fr 1fr">
          <label class="pp-f wide"><span>Name on card</span><input data-bf="name" autocomplete="cc-name" value="${esc(d.owner||'')}"></label>
          <label class="pp-f wide"><span>Card number</span><input data-bf="num" inputmode="numeric" autocomplete="cc-number" placeholder="1234 1234 1234 1234" maxlength="23"></label>
          <label class="pp-f"><span>Expiry</span><input data-bf="exp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" maxlength="7"></label>
          <label class="pp-f"><span>Security code</span><input data-bf="cvc" inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" maxlength="4"></label></div>
          <p class="pp-note">Your card is charged ${money(d,next(d).gross)} on each billing date. Card details go straight to Stripe; Merchsmith never sees or stores them.</p>
          <p class="pp-note" style="margin-top:2px">Prototype: any valid test number works, e.g. 4242 4242 4242 4242.</p>`;
        const num=F.querySelector('[data-bf="num"]'), exp=F.querySelector('[data-bf="exp"]');
        num.oninput=()=>{ num.value=digits(num.value).slice(0,19).replace(/(.{4})/g,'$1 ').trim(); };
        exp.oninput=()=>{ const v=digits(exp.value).slice(0,4); exp.value=v.length>2?v.slice(0,2)+' / '+v.slice(2):v; }; }
      else if(step==='form'){ sv.textContent='Continue';
        F.innerHTML=`<div class="pp-grid" style="grid-template-columns:1fr 1fr">
          <label class="pp-f wide"><span>Account holder name</span><input data-bf="name" value="${esc(bacs.name||d.legalName||d.name)}"></label>
          <label class="pp-f"><span>Sort code</span><input data-bf="sort" inputmode="numeric" placeholder="00-00-00" maxlength="8" value="${esc(bacs.sort||'')}"></label>
          <label class="pp-f"><span>Account number</span><input data-bf="acc" inputmode="numeric" placeholder="8 digits" maxlength="8" value="${esc(bacs.acc||'')}"></label>
          <label class="pp-f wide"><span>Billing email</span><input data-bf="email" type="email" value="${esc(bacs.email||(get(d.id).details||{}).email||d.ownerEmail||'')}"></label></div>
          <label class="bl-chk"><input type="checkbox" data-bf="auth"${bacs.auth?' checked':''}> I am the account holder and the only person required to authorise Direct Debits from this account.</label>
          <p class="pp-note">UK bank accounts only. Payments are collected on your billing date and you’re emailed at least 3 working days before each one.</p>`;
        const so=F.querySelector('[data-bf="sort"]'); so.oninput=()=>{ const v=digits(so.value).slice(0,6); so.value=v.replace(/(\d{2})(?=\d)/g,'$1-'); }; }
      else { sv.textContent='Confirm Direct Debit';
        F.innerHTML=`<div class="bl-confirm"><h4>Confirm your Direct Debit</h4>
          <div class="bl-kv"><span>Account holder</span><b>${esc(bacs.name)}</b><span>Sort code</span><b>${esc(bacs.sort)}</b><span>Account number</span><b>···· ${esc(bacs.acc.slice(-4))}</b>
          <span>Collected by</span><b>Merchsmith Ltd, via Stripe</b><span>First payment</span><b>${money(d,next(d).gross)} on ${fmtD(next(d).date)}</b><span>Notifications to</span><b>${esc(bacs.email)}</b></div>
          <div class="bl-guar"><b>The Direct Debit Guarantee</b><span>You’re protected by the Direct Debit Guarantee. If an error is made in the payment of your Direct Debit, you’re entitled to a full and immediate refund from your bank. You can cancel at any time by contacting your bank.</span></div>
          <button type="button" class="pp-link" data-blback>‹ Edit details</button></div>`;
        F.querySelector('[data-blback]').onclick=()=>{ step='form'; draw(); }; }
    };
    R.querySelectorAll('[data-bt]').forEach(b=>b.onclick=()=>{ type=b.dataset.bt; step='form'; draw(); });
    const fail=t=>{ err.textContent=t; err.style.display=''; };
    const val=k=>{ const e=F.querySelector('[data-bf="'+k+'"]'); return e?(e.type==='checkbox'?e.checked:e.value.trim()):''; };
    R.querySelector('[data-blsave]').onclick=()=>{
      if(type==='card'){ const n=digits(val('num')), [mm,yy]=digits(val('exp')).match(/.{1,2}/g)||[];
        if(!val('name')) return fail('Enter the name on the card.');
        if(!luhn(n)) return fail('That card number isn’t valid.');
        if(!mm||!yy||+mm<1||+mm>12||new Date(2000+ +yy,+mm,1)<=new Date()) return fail('Enter an expiry date in the future.');
        if(digits(val('cvc')).length<3) return fail('Enter the 3 or 4 digit security code.');
        setMethod(d.id,{type:'card',brand:brandOf(n),last4:n.slice(-4),exp:mm+'/'+yy,name:val('name'),addedAt:new Date().toISOString()});
        m.close(); P.toast('Card saved'); onDone&&onDone(); return; }
      if(step==='form'){ bacs={name:val('name'),sort:val('sort'),acc:digits(val('acc')),email:val('email'),auth:val('auth')};
        if(!bacs.name) return fail('Enter the account holder name.');
        if(digits(bacs.sort).length!==6) return fail('Enter a 6-digit sort code.');
        if(bacs.acc.length!==8) return fail('Enter an 8-digit account number.');
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bacs.email)) return fail('Enter an email for payment notifications.');
        if(!bacs.auth) return fail('Only the account holder can set up this Direct Debit. If more than one person must authorise payments, use a card instead.');
        step='confirm'; draw(); return; }
      setMethod(d.id,{type:'bacs',last4:bacs.acc.slice(-4),sortEnd:digits(bacs.sort).slice(-2),name:bacs.name,email:bacs.email,mandate:ref(),mandateStatus:'pending',addedAt:new Date().toISOString()});
      m.close(); P.toast('Direct Debit set up — confirmation emailed to '+bacs.email); onDone&&onDone(); };
    draw();
  }
  function detailsModal(d,onDone){
    const P=window.MSPEOPLE; if(!P||!P.modal) return; const x=get(d.id).details||{};
    const org=(window.MSORG&&MSORG.get&&MSORG.get('distributor'))||{};
    const v={company:x.company||org.legalName||d.legalName||d.name,email:x.email||d.ownerEmail||'',vat:x.vat||org.vat||d.vat||'',address:x.address||org.address||'',po:x.po||''};
    const m=P.modal('Billing details',`<div class="pp-grid" style="grid-template-columns:1fr 1fr">
      <label class="pp-f wide"><span>Company name on invoices</span><input data-bd="company" value="${esc(v.company)}"></label>
      <label class="pp-f"><span>Billing email</span><input data-bd="email" type="email" value="${esc(v.email)}"></label>
      <label class="pp-f"><span>VAT number</span><input data-bd="vat" value="${esc(v.vat)}"></label>
      <label class="pp-f wide"><span>Billing address</span><textarea data-bd="address" rows="3">${esc(v.address)}</textarea></label>
      <label class="pp-f wide"><span>PO / reference <em style="font-style:normal;text-transform:none;letter-spacing:0;font-weight:500;color:var(--muted)">· optional, shown on every invoice</em></span><input data-bd="po" value="${esc(v.po)}"></label></div>
      <p class="pp-note">Invoices and receipts are emailed to the billing email.</p>`,
      `<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-bdsave>Save</button>`);
    m.root.querySelector('[data-bdsave]').onclick=()=>{ const f={}; m.root.querySelectorAll('[data-bd]').forEach(e=>f[e.dataset.bd]=e.value.trim());
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)){ m.root.querySelector('[data-bd="email"]').focus(); return; }
      setDetails(d.id,f); m.close(); P.toast('Billing details saved'); onDone&&onDone(); };
  }

  /* ---------- Distributor Settings → Billing ---------- */
  function panel(el,d){
    const draw=()=>{ const b=get(d.id), mt=b.method, n=next(d), inv=invoices(d), det=b.details||{};
      const failed=b.failed||d.status==='past_due', exp=expired(mt);
      el.innerHTML=`
      ${failed||exp?`<div class="bl-banner"><b>${failed?'Your last payment failed':'Your card has expired'}</b><span>${failed?'We’ll retry automatically. Update your payment method to avoid your account being suspended.':'Add a new payment method before your next billing date.'}</span><button class="btn" data-blmethod>Update payment method</button></div>`:''}
      <div class="card">
        <div class="card-h"><h2>Next payment</h2></div>
        ${n.billing?`<div class="bl-next"><div><b>${money(d,n.gross)}</b><span>on ${fmtD(n.date)}</span></div>
          <div class="bl-break"><span>Plan and seats</span><b>${money(d,n.net)}</b><span>VAT 20%</span><b>${money(d,n.vat)}</b></div></div>
          <p class="lede" style="margin:14px 0 0">${mt?(mt.type==='bacs'?`Collected by Direct Debit. You’ll get an email at least 3 working days before.`:`Charged to your ${esc(mt.brand)} card automatically.`):'Add a payment method so your next payment can be taken.'} The amount follows your seats; see <a href="#tab=subscription" data-bltab="subscription" style="color:var(--periwinkle-deep);font-weight:700;text-decoration:none">Subscription</a>.</p>`
        :`<p class="lede" style="margin:0">Your account isn’t being billed at the moment.</p>`}
      </div>
      <div class="card">
        <div class="card-h"><h2>Payment method</h2></div>
        ${mt?`<div class="bl-pm"><span class="bl-pmicon ${mt.type}">${mt.type==='bacs'?'DD':esc((mt.brand||'Card').slice(0,4).toUpperCase())}</span>
          <div class="bl-pmtxt"><b>${esc(methodText(mt))}</b><span>${mt.type==='bacs'
            ?`${esc(mt.name)} · sort code ··-··-${esc(mt.sortEnd||'··')} · mandate ${esc(mt.mandate||'')} · <i class="bl-ms ${mt.mandateStatus}">${mt.mandateStatus==='active'?'Active':'Being set up (up to 3 working days)'}</i>`
            :`${esc(mt.name||'')} · expires ${esc(mt.exp||'')}${exp?' · <i class="bl-ms failed">Expired</i>':''}`}</span></div>
          <button class="btn ghost" data-blmethod>Change</button></div>`
        :`<p class="lede">No payment method yet.</p><button class="btn" data-blmethod>Add payment method</button>`}
        <p class="bl-foot">Pay by card or Direct Debit. Payments are processed by Stripe.</p>
      </div>
      <div class="card">
        <div class="card-h"><h2>Billing details</h2><button class="btn ghost" data-bldetails style="margin-left:auto">Edit</button></div>
        <div class="bl-kv"><span>Company</span><b>${esc(det.company||d.legalName||d.name)}</b>
          <span>Billing email</span><b>${esc(det.email||d.ownerEmail||'—')}</b>
          <span>VAT number</span><b>${esc(det.vat||d.vat||'—')}</b>
          <span>Address</span><b>${esc(det.address||'—').replace(/\n/g,'<br>')}</b>
          ${det.po?`<span>PO / reference</span><b>${esc(det.po)}</b>`:''}</div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Invoices</h2></div>
        ${inv.length?`<div class="bl-inv"><div class="bl-ih"><span>Invoice</span><span>Date</span><span>Amount</span><span>Status</span><span></span></div>
          ${inv.map((x,i)=>`<div class="bl-ir"><b>${esc(x.no)}</b><span>${fmtD(x.date)}</span><span>${money(d,x.gross)}</span><span><i class="bl-st ${x.status}">${x.status==='paid'?'Paid':'Failed'}</i></span><button class="dm-copy" data-blinv="${i}">View</button></div>`).join('')}</div>`
        :'<p class="lede" style="margin:0">No invoices yet.</p>'}
      </div>`;
      el.querySelectorAll('[data-blmethod]').forEach(b=>b.onclick=()=>methodModal(d,draw));
      const de=el.querySelector('[data-bldetails]'); if(de) de.onclick=()=>detailsModal(d,draw);
      el.querySelectorAll('[data-blinv]').forEach(b=>b.onclick=()=>openInvoice(d,inv[+b.dataset.blinv]));
      el.querySelectorAll('[data-bltab]').forEach(a=>a.onclick=e=>{ e.preventDefault(); location.hash='tab='+a.dataset.bltab; });
    };
    draw();
  }

  /* ---------- Platform Admin ---------- */
  function adminLines(d){ const b=get(d.id), mt=b.method, exp=expired(mt);
    return `<span class="k">Payment method</span><span class="v">${mt?esc(methodText(mt)):'<span style="color:#b4232c">None</span>'}${mt&&mt.type==='bacs'?` <i class="bl-ms ${mt.mandateStatus}">${mt.mandateStatus==='active'?'Mandate active':'Mandate pending'}</i>`:''}${exp?' <i class="bl-ms failed">Expired</i>':''}${b.failed||d.status==='past_due'?' <i class="bl-ms failed">Last payment failed</i>':''}</span>`; }

  const css=`
  .bl-seg{display:flex;gap:0;border:1.5px solid var(--line-soft);border-radius:11px;overflow:hidden;margin-bottom:16px;}
  .bl-seg button{flex:1;font:inherit;font-size:13.5px;font-weight:700;color:var(--ink-3);background:#fff;border:0;padding:10px;cursor:pointer;}
  .bl-seg button+button{border-left:1.5px solid var(--line-soft);} .bl-seg button.on{background:var(--ink);color:#fff;}
  .bl-secure{margin-right:auto;font-size:12px;font-weight:700;color:var(--muted);}
  .bl-chk{display:flex;gap:9px;align-items:flex-start;font-size:13px;color:var(--ink-2);margin-top:14px;line-height:1.45;cursor:pointer;}
  .bl-chk input{margin-top:3px;flex:none;}
  .bl-confirm h4{font-family:var(--serif);font-weight:500;font-size:19px;margin:0 0 12px;}
  .bl-kv{display:grid;grid-template-columns:minmax(120px,max-content) 1fr;gap:8px 18px;font-size:13.5px;}
  .bl-kv span{color:var(--muted);} .bl-kv b{font-weight:600;color:var(--ink);}
  .bl-guar{margin:16px 0 10px;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink-2);line-height:1.5;background:var(--paper);}
  .bl-banner{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;background:var(--tint-red,#fbe3df);color:#8f1d24;border-radius:14px;padding:14px 18px;margin-top:22px;}
  .bl-banner b{font-size:14.5px;} .bl-banner span{flex:1;min-width:220px;font-size:13px;} .bl-banner .btn{background:#b4232c;}
  .bl-next{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:18px;margin-top:8px;}
  .bl-next>div:first-child b{display:block;font-family:var(--serif);font-weight:500;font-size:40px;line-height:1;}
  .bl-next>div:first-child span{font-size:13px;color:var(--text-soft);}
  .bl-break{display:grid;grid-template-columns:auto auto;gap:4px 22px;font-size:13px;} .bl-break span{color:var(--muted);} .bl-break b{text-align:right;font-weight:600;}
  .bl-pm{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:6px;}
  .bl-pmicon{width:52px;height:36px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:800;letter-spacing:.04em;background:var(--ink);color:#fff;flex:none;}
  .bl-pmicon.bacs{background:var(--tint-peri);color:var(--periwinkle-ink);}
  .bl-pmtxt{flex:1;min-width:200px;display:flex;flex-direction:column;gap:2px;} .bl-pmtxt b{font-size:15px;} .bl-pmtxt span{font-size:12.5px;color:var(--text-soft);}
  .bl-ms{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:5px;padding:2px 6px;white-space:nowrap;}
  .bl-ms.active{background:var(--tint-green,#e2f0e9);color:var(--green-deep,#2E7A57);} .bl-ms.pending{background:#fbeccd;color:#9a6b1f;} .bl-ms.failed{background:var(--tint-red,#fbe3df);color:#b4232c;}
  .bl-foot{font-size:12px;color:var(--muted);margin:14px 0 0;}
  .bl-inv{border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;margin-top:6px;}
  .bl-ih,.bl-ir{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.8fr) auto;gap:12px;align-items:center;padding:10px 14px;font-size:13px;}
  .bl-ih{background:var(--paper);font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);}
  .bl-ir{border-top:1px solid var(--line-soft);} .bl-ir b{font-weight:600;}
  .bl-st{font-style:normal;font-size:10.5px;font-weight:800;text-transform:uppercase;border-radius:5px;padding:2px 7px;}
  .bl-st.paid{background:var(--tint-green,#e2f0e9);color:var(--green-deep,#2E7A57);} .bl-st.failed{background:var(--tint-red,#fbe3df);color:#b4232c;}
  @media(max-width:640px){.bl-ih{display:none;}.bl-ir{grid-template-columns:1fr 1fr;}}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);

  return { get, setMethod, setDetails, invoices, next, methodText, expired, panel, adminLines, openInvoice };
})();
