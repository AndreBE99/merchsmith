/* confirm-view.js — Checkout step 3 "Order placed" (polished, Sep 2026). order-page.js renderConfirm() hands over
   to window.__cfRender({root, stepsBar, order}).
   Layout: success header across the top; left = what happens next (timeline with expected dates), delivery per
   address, items; right = order summary (totals incl. VAT + card fee), payment block (terms + due date / bank
   details / card receipt), emails sent to, account manager, actions, Download confirmation (printable PDF).
   Also handles the "Sent for approval" (over credit) state. */
(function(){
  const O=window.MSOrders; if(!O) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=O.gbp, I=n=>`<svg class="icn"><use href="#o-${n}"/></svg>`;
  const BANK={name:'Mojo Promotions Ltd',bank:'Barclays Bank UK PLC',sort:'20-45-77',acc:'43218765',iban:'GB29 BARC 2045 7743 2187 65',bic:'BARCGB22'};
  const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  const today=()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; };
  const addWD=(d,n)=>{ const x=new Date(d); let k=0; while(k<Math.abs(n)){ x.setDate(x.getDate()+(n<0?-1:1)); if(x.getDay()%6) k++; } return x; };
  function parseDay(s){ const m=String(s||'').match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})/); if(!m) return null; const t=today(); let d=new Date(t.getFullYear(),MON[m[2].toLowerCase()],+m[1]); if(isNaN(d)) return null; if(d<addWD(t,-60)) d.setFullYear(d.getFullYear()+1); return d; }
  const fD=d=>d?d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'—';
  const fL=d=>d?d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'—';
  const addrLines=a=>a?[a.name,...(a.lines||[])].map(x=>String(x).replace(/,\s*$/,'')).filter(Boolean):[];
  const me=()=>{ const p=(window.MSChat&&MSChat.me&&MSChat.me())||{}; const U=((window.ORG_DATA&&ORG_DATA.customers||[]).find(c=>c.id===(O.CUST||'citrix'))||{teams:[]}).teams.flatMap(t=>t.users||[]); const u=U.find(x=>x.n===p.name); return {name:p.name||O.ADDR.name,email:(u&&u.email)||p.email||'orders@citrix.com'}; };

  function plan(o){ const t=today(); const dates=(o.lines||[]).map(l=>parseDay(l.deliveryDate)).filter(Boolean);
    const last=dates.length?new Date(Math.max(...dates)):addWD(t,10), first=dates.length?new Date(Math.min(...dates)):last;
    const ack=addWD(t,1), prod=addWD(ack,1), disp=addWD(first,-2);
    return {ack,prod,disp:disp<prod?addWD(prod,2):disp,first,last,est:!dates.length}; }
  function dueDate(o,p){ const t=String(o.terms||o.payment||''); const n=+(t.match(/(\d+)\s*days/)||[])[1]||0;
    if(/end of month/i.test(t)){ const d=new Date(p.disp); d.setMonth(d.getMonth()+2,0); return d; }
    const base=/deliver/i.test(t)?p.last:p.disp; if(!n) return null; const d=new Date(base); d.setDate(d.getDate()+n); return d; }

  // split lines (split-delivery.js) become one portion per delivery, with that delivery's quantities
  const portions=o=>(o.lines||[]).flatMap(l=>{ const D=l.drops&&l.drops.length>1?l.drops:null; if(!D) return [{l,addr:l.address,qty:l.qty||0,cols:l.colours||[],date:l.deliveryDate,nofail:!!l.nofail}];
    return D.map((d,k)=>{ const al=d.alloc||{}, cols=(l.colours||[]).filter(c=>+al[c.c]).map(c=>({c:c.c,hex:c.hex,qty:+al[c.c]})), q=Object.values(al).reduce((a,v)=>a+(+v||0),0);
      return {l,addr:d.address,qty:q,cols,date:d.date||l.deliveryDate,nofail:!!d.nofail,k,n:D.length}; }); });
  function itemRow(pt){ const l=pt.l, img=l.visual||('assets/products/'+l.img+'.png'), split=pt.n>1;
    return `<div class="cf-it"><span class="cf-th">${l.visual||l.img?`<img src="${esc(img)}" alt="">`:''}</span>
      <div class="cf-in"><b>${esc(l.name)}${l.kind==='sample'?' <em class="cf-smp">Sample</em>':''}</b><span>${esc([l.kind==='sample'?'':l.branding,l.project].filter(Boolean).join(' · '))}</span>
        ${split?`<span class="cf-split">${I('addr')}Delivery ${pt.k+1} of ${pt.n} · ${l.qty.toLocaleString('en-GB')} in total across ${pt.n} addresses</span>`:''}
        ${pt.cols.length?`<div class="cf-cols">${pt.cols.map(c=>`<span><i style="background:${esc(c.hex||'#c8c8cf')}"></i>${esc(c.c)} ${c.qty.toLocaleString('en-GB')}</span>`).join('')}</div>`:''}</div>
      <div class="cf-ip">${split?`<b>${pt.qty.toLocaleString('en-GB')}</b><span>of ${(l.qty||0).toLocaleString('en-GB')} · ${gbp(l.unit||0)} each</span>`:`<b>${gbp((l.unit||0)*(l.qty||0))}</b><span>${(l.qty||0).toLocaleString('en-GB')} × ${gbp(l.unit||0)}</span>${l.discountPct?`<em>Save ${l.discountPct}%</em>`:''}`}</div></div>`; }
  function itemRowOld(l){ const img=l.visual||('assets/products/'+l.img+'.png');
    return `<div class="cf-it"><span class="cf-th"><img src="${esc(img)}" alt="">${l.visual?`<i class="cf-ok" title="Approved visual">${I('check')}</i>`:''}</span>
      <div class="cf-in"><b>${esc(l.name)}${l.kind==='sample'?' <em class="cf-smp">Sample</em>':''}</b><span>${esc([l.kind==='sample'?'':l.branding,l.project,l.deliveryDate&&l.deliveryDate!=='ASAP'?'Delivery '+l.deliveryDate:'Delivery ASAP'].filter(Boolean).join(' · '))}</span>
        ${(l.colours||[]).length?`<div class="cf-cols">${l.colours.map(c=>`<span><i style="background:${esc(c.hex||'#c8c8cf')}"></i>${esc(c.c)} ${c.qty.toLocaleString('en-GB')}</span>`).join('')}</div>`:''}</div>
      <div class="cf-ip"><b>${gbp((l.unit||0)*(l.qty||0))}</b><span>${(l.qty||0).toLocaleString('en-GB')} × ${gbp(l.unit||0)}</span>${l.discountPct?`<em>Save ${l.discountPct}%</em>`:''}</div></div>`; }
  window.__cfRender=function(ctx){ const {root,stepsBar,order:o}=ctx; const p=plan(o), appr=o.status==='approval';
    const meth=o.method||(o.onAccount?'account':/bank/i.test(o.payment)?'bacs':'card'), fee=o.cardFee||0;
    const buyer=me(), inv=o.invoiceTo||null;
    const groups=[]; portions(o).forEach(pt=>{ const k=pt.addr?addrLines(pt.addr).join('|'):''; let g=groups.find(x=>x.k===k); if(!g) groups.push(g={k,addr:pt.addr,lines:[],pts:[]}); g.pts.push(pt); if(!g.lines.includes(pt.l)) g.lines.push(pt.l); });
    const splitN=(o.lines||[]).filter(l=>l.drops&&l.drops.length>1);
    const book=O.addressBook?O.addressBook():[], labelOf=a=>{ if(!a) return 'Delivery address'; const k=addrLines(a).join('|'), b=book.find(x=>addrLines(x).join('|')===k); return b?b.label:(a.name||'Delivery address'); };
    const am=window.MSAM&&MSAM.get?MSAM.get(O.CUST||'citrix'):null;
    const steps=appr?[['Sent for approval','Now',true],['Approved by Mojo Promotions','Usually within 1 working day'],['Checked by our Production Team','After approval'],['In production',''],['Delivered','']]
      :[['Order placed','Today, '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),true],['Checked by our Production Team','Any problems, we’ll let you know · expected '+fD(p.ack)],['In production','Expected from '+fD(p.prod)],['Dispatched','Expected '+fD(p.disp)],['Delivered',(p.est?'Estimated ':'By ')+fD(p.last)]];
    const payBlock=appr?`<p class="cf-p">No payment is taken until Mojo Promotions approves the order.</p>`
      :meth==='account'?`<div class="cf-kv"><span>Payment</span><b>On account</b></div><div class="cf-kv"><span>Terms</span><b>${esc(o.terms||o.payment.replace(/^On account ·\s*/,''))}</b></div>${dueDate(o,p)?`<div class="cf-kv"><span>Payment due</span><b>${fL(dueDate(o,p))}</b></div>`:''}<p class="cf-p">You’ll be invoiced ${/deliver/i.test(o.terms||o.payment)?'on delivery':'when the order is dispatched'}.</p>`
      :meth==='bacs'?`<div class="cf-warn"><b>Awaiting your bank transfer</b><span>Pay ${gbp(o.gross)} within 24 hours to keep your delivery dates.</span></div><div class="cf-bank">${[['Account name',BANK.name],['Sort code',BANK.sort],['Account no.',BANK.acc],['IBAN',BANK.iban],['Reference',o.ref]].map(([k,v])=>`<div class="cf-kv"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`
      :`<div class="cf-kv"><span>Paid by card</span><b>${gbp(o.gross)}</b></div>${fee?`<div class="cf-kv"><span>Includes card fee</span><b>${gbp(fee)}</b></div>`:''}<div class="cf-kv"><span>Paid on</span><b>${fL(today())}</b></div><p class="cf-p">A card receipt has been emailed to you.</p>`;

    root.innerHTML=`<div class="wrap cf">
      <div class="bk-top"><span class="bk-sp"></span>${stepsBar(2)}</div>
      <section class="cf-hero${appr?' appr':''}"><div class="cf-tick">${I(appr?'clock':'check')}</div>
        <div class="cf-ht"><h1>${appr?'Sent for approval':'Order placed'}</h1><p>${appr?'Your order is over your available credit, so Mojo Promotions will review it. We’ll email you as soon as it’s approved.':'Thank you. Your order has been sent to the supplier and we’ll keep you updated at every step.'}</p></div>
        <div class="cf-refs"><div><span>Order</span><b>${esc(o.ref)}</b></div>${o.po?`<div><span>PO number</span><b>${esc(o.po)}</b></div>`:''}${o.reference?`<div><span>Your reference</span><b>${esc(o.reference)}</b></div>`:''}<div><span>Placed</span><b>${esc(o.placed)}</b></div></div></section>

      <div class="bk-layout"><div class="fn-main">
        <section class="fn-card"><div class="fn-hd"><h2>What happens next</h2></div>
          <ol class="cf-tl">${steps.map(([t,d,on],i)=>`<li class="${on?'on':''}${i===1&&!appr?' next':''}"><i>${on?I('check'):''}</i><div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ol>
          ${p.est&&!appr?'<p class="fn-muted">Some items are ASAP, so their dates are estimates until the supplier confirms.</p>':''}</section>

        <section class="fn-card"><div class="fn-hd"><h2>Delivery &amp; items</h2><span class="bk-sp"></span><span class="fn-tag">${(o.lines||[]).length} line${(o.lines||[]).length>1?'s':''} · ${groups.length} address${groups.length>1?'es':''}</span></div>
          ${splitN.length?`<p class="cf-splitn">${splitN.map(l=>`<b>${esc(l.name)}</b> is split across ${l.drops.length} addresses`).join(' · ')}. It’s one design and one production run; each address gets its own delivery and tracking.</p>`:''}
          ${groups.map((g,gi)=>{ const ds=g.pts.map(pt=>parseDay(pt.date)).filter(Boolean), dd=ds.length?new Date(Math.max(...ds)):null, crit=g.pts.some(pt=>pt.nofail);
            return `<div class="fn-dg"><div class="fn-dgh"><span class="cf-dn">${gi+1}</span><div><b>${esc(labelOf(g.addr))}</b><span>${esc(addrLines(g.addr).join(', '))}</span></div><span class="cf-dd">${dd?'By '+fD(dd):'ASAP'}${crit?' <em class="cf-crit">Critical</em>':''}</span></div>
              <div class="cf-items">${g.pts.map(itemRow).join('')}</div></div>`; }).join('')}</section>


      </div>

      <aside class="fn-sum cf-side"><h3>Order summary</h3>
        ${o.promo?`<div class="bk-sr"><span>Items</span><span>${gbp(o.gNet||o.net+(o.promo.off||0)+(o.promo.delOff||0))}</span></div><div class="bk-sr promo"><span>Code ${esc(o.promo.code)}</span><span>−${gbp((o.promo.off||0)+(o.promo.delOff||0))}</span></div>`:''}
        <div class="bk-sr"><span>Subtotal</span><span>${gbp(o.net)}</span></div>
        <div class="bk-sr"><span>VAT${o.vatRate?' ('+Math.round(o.vatRate*100)+'%)':''}</span><span>${o.vatRate?gbp(o.vat):'Not charged'}</span></div>
        ${fee?`<div class="bk-sr"><span>Card fee</span><span>${gbp(fee)}</span></div>`:''}
        <div class="bk-sr bk-tot"><span>Total</span><span>${gbp(o.gross)}</span></div>
        <div class="cf-blk"><h4>Payment</h4>${payBlock}</div>
        <div class="cf-blk"><h4>Emails sent to</h4><div class="cf-mail">${I('mail')}<div><b>${esc(buyer.name)}</b><span>${esc(buyer.email)} · order confirmation</span></div></div>
          ${inv&&inv.email&&inv.email!==buyer.email?`<div class="cf-mail">${I('mail')}<div><b>${esc(inv.name||'Invoice contact')}</b><span>${esc(inv.email)} · ${appr?'copied on approval':'invoice'}</span></div></div>`:''}</div>
        ${am?`<div class="cf-blk cf-am"><h4>Questions about this order?</h4><div class="cf-amr"><span class="cf-av">${window.MSPEOPLE&&MSPEOPLE.avHTML?MSPEOPLE.avHTML(am,38):(am.photo?`<img src="${esc(am.photo)}" alt="">`:esc((am.n||'').split(' ').map(w=>w[0]).join('').slice(0,2)))}</span><div><b>${esc(am.n)}</b><span>${esc(am.title||'Account Manager')} · Mojo Promotions</span></div></div>
          <div class="cf-amb"><button class="fn-ghost sm" data-cfmsg>${I('chat')}Message</button><button class="fn-ghost sm" data-cfmeet>${I('cal')}Book a call</button></div></div>`:''}
        <div class="cf-acts"><a class="bk-cta2" href="Merchsmith Orders.html#order=${esc(o.id)}">${appr?'View order':'Track this order'}</a>
          <button class="fn-ghost" data-cfpdf>${I('dl')}Download confirmation</button>
          <div class="cf-links"><a href="Merchsmith Orders.html">All orders</a><a href="Merchsmith Project - Autumn Giveaways.html">Back to project</a><a href="Merchsmith Projects.html">Start a new order</a></div></div>
      </aside></div></div>`;
    const q=s=>root.querySelector(s);
    q('[data-cfpdf]').onclick=()=>pdf(o,p,groups,labelOf,buyer,inv,meth,payBlock);
    const m=q('[data-cfmsg]'); if(m&&am) m.onclick=()=>{ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith({name:am.n,email:am.email,title:am.title,orgName:'Mojo Promotions',orgType:'distributor'}); };
    const b=q('[data-cfmeet]'); if(b&&am) b.onclick=()=>{ const pp=window.MSChat&&MSChat.resolve?MSChat.resolve({name:am.n,email:am.email,orgName:'Mojo Promotions',orgType:'distributor'}):null; location.href='Merchsmith Calendar.html#tab=cal&with='+encodeURIComponent(pp?pp.id:''); };
    window.scrollTo(0,0);
  };

  function pdf(o,p,groups,labelOf,buyer,inv,meth,payBlock){ const w=window.open('','_blank'); if(!w) return;
    const rows=portions(o).map(pt=>{ const l=pt.l; return `<tr><td><b>${esc(l.name)}</b>${pt.n>1?` <span class="m">· delivery ${pt.k+1} of ${pt.n}</span>`:''}<div class="m">${esc([l.kind==='sample'?'Sample':l.branding,pt.cols.map(c=>c.c+' '+c.qty).join(', ')].filter(Boolean).join(' · '))}</div></td><td>${esc(labelOf(pt.addr))}<div class="m">${esc(pt.date||'ASAP')}${pt.nofail?' · Critical':''}</div></td><td>${pt.qty.toLocaleString('en-GB')}</td><td>${gbp(l.unit||0)}</td><td>${gbp((l.unit||0)*pt.qty)}</td></tr>`; }).join('');
    const plain=payBlock.replace(/<div class="cf-kv"><span>([^<]*)<\/span><b>([^<]*)<\/b><\/div>/g,'<div class="kv"><span>$1</span><b>$2</b></div>').replace(/class="cf-(p|warn|bank)"/g,'class="$1"');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Order confirmation ${esc(o.ref)}</title><style>
      @page{size:A4;margin:16mm} body{font:12.5px/1.5 "Mulish",Arial,sans-serif;color:#1e2033;margin:0}
      .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4E5BA6;padding-bottom:14px;margin-bottom:16px} h1{font:500 30px "EB Garamond",Georgia,serif;margin:0}
      .muted,.m{color:#667085} .m{font-size:11px} .refs{display:flex;gap:26px;margin:0 0 16px} .refs span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#667085} .refs b{font-size:14px}
      table{width:100%;border-collapse:collapse;margin:8px 0 16px} th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e4e7ec;vertical-align:top} th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#667085} td:nth-child(n+3),th:nth-child(n+3){text-align:right}
      .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px} .box{background:#f4f5fb;border-radius:10px;padding:12px 14px} .box h4{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#667085}
      .kv{display:flex;justify-content:space-between;gap:10px;padding:2px 0} .kv span{color:#667085} .tot{margin-left:auto;width:260px} .tot .kv{padding:3px 0} .g{font-weight:800;font-size:15px;border-top:2px solid #1e2033;margin-top:6px;padding-top:8px}
      .p,.warn{margin:6px 0 0;color:#475467} .warn b{display:block;color:#93370d}</style></head><body>
      <div class="top"><div><h1>${o.status==='approval'?'Order sent for approval':'Order confirmation'}</h1><div class="muted">${esc(o.ref)} · placed ${esc(o.placed)} by ${esc(buyer.name)}</div></div><div style="text-align:right"><b>Mojo Promotions Ltd</b><div class="muted">orders@mojopromotions.co.uk</div></div></div>
      <div class="refs">${o.po?`<div><span>PO number</span><b>${esc(o.po)}</b></div>`:''}${o.reference?`<div><span>Your reference</span><b>${esc(o.reference)}</b></div>`:''}<div><span>Expected delivery</span><b>${fD(p.last)}</b></div></div>
      <table><thead><tr><th>Item</th><th>Deliver to</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot">${o.promo?`<div class="kv"><span>Discount code ${esc(o.promo.code)}</span><b>−${gbp((o.promo.off||0)+(o.promo.delOff||0))}</b></div>`:''}<div class="kv"><span>Subtotal</span><b>${gbp(o.net)}</b></div><div class="kv"><span>VAT</span><b>${o.vatRate?gbp(o.vat):'Not charged'}</b></div>${o.cardFee?`<div class="kv"><span>Card fee</span><b>${gbp(o.cardFee)}</b></div>`:''}<div class="kv g"><span>Total</span><b>${gbp(o.gross)}</b></div></div>
      <div class="cols" style="margin-top:18px"><div class="box"><h4>Billing</h4>${esc(o.billing||'')}${inv&&inv.email?`<div class="m" style="margin-top:6px">Invoices to ${esc(inv.name||'')} · ${esc(inv.email)}</div>`:''}</div><div class="box"><h4>Payment</h4>${plain}</div></div>
      <div class="box" style="margin-top:14px"><h4>Delivery addresses</h4>${groups.map(g=>`<div style="margin-top:6px"><b>${esc(labelOf(g.addr))}</b> <span class="m">${esc(addrLines(g.addr).join(', '))}</span></div>`).join('')}</div>
      <p class="muted" style="margin-top:18px">Custom branded goods are made to order and can’t be refunded once the order is placed.</p>
      <script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close(); }
})();
