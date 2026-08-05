/* order-page.js — basket (table), finance, confirmation, orders list + detail. */
(function(){
  'use strict';
  const O=window.MSOrders; const root=document.getElementById('orderRoot'); if(!root||!O) return;
  const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const page=document.body.getAttribute('data-page');
  const ID=(window.MSID?MSID.current():'distributor');
  let step=0, placedOrder=null;
  const checkout={ terms:'ordering', method:'uk', po:'', notes:'' };

  function crumb(){ return ''; }
  const VIEWER={distributor:'Jess Doyle',customer:'Sara Kemp',supplier:'BagWorks UK',admin:'Merchsmith Admin'}[ID]||'Jess Doyle';
  function addrNotesStore(){ try{ return JSON.parse(localStorage.getItem('ms-basket-addr-notes')||'{}'); }catch(e){ return {}; } }
  function addrNotesSave(o){ try{ localStorage.setItem('ms-basket-addr-notes',JSON.stringify(o)); }catch(e){} }
  function addrNotes(id){ return addrNotesStore()[id]||[]; }
  function addrNotesSet(id,arr){ const o=addrNotesStore(); o[id]=arr; addrNotesSave(o); }
  function stepsBar(active){
    const labels=['Basket','Finance','Confirmation'];
    return `<div class="steps">${labels.map((l,i)=>`<div class="s ${i===active?'on':''} ${i<active?'done':''}"><span class="n">${i<active?'<svg class=\"icn\" style=\"width:13px;height:13px\"><use href=\"#o-check\"/></svg>':(i+1)}</span>${l}</div>${i<labels.length-1?'<span class="bar"></span>':''}`).join('')}</div>`;
  }

  /* ---------- design / proof icon ---------- */
  function proofIcon(p){
    if(p.proof==='unbranded') return `<span class="dz no" title="Unbranded — no proof"><svg class="icn"><use href="#o-noproof"/></svg></span>`;
    if(p.proof==='approved') return `<span class="dz ok" title="Proof approved"><svg class="icn"><use href="#o-dl"/></svg></span>`;
    return `<span class="dz" title="Awaiting proof"><svg class="icn"><use href="#o-dl"/></svg></span>`;
  }
  function qtyRows(l){
    if(l.sized && l.colours){
      return `<div class="qgrid sized">${l.colours.map((c,ci)=>`<div class="qcol"><button class="qcolhd ${ci===0?'open':''}" data-line="${l.id}" data-col="${ci}"><span class="qc"><span class="sw" style="background:${c.hex}"></span>${esc(c.c)}</span><svg class="icn qchev"><use href="#o-chev"/></svg></button><div class="qsizes ${ci===0?'open':''}">${l.rows.map((r,i)=>`<div class="qr"><span class="qsz">${esc(r.c)}</span>${r.qty>0?`<input class="qin" data-line="${l.id}" data-ri="${i}" value="${r.qty}">`:`<span class="qdash">-</span>`}</div>`).join('')}</div></div>`).join('')}</div>`;
    }
    return `<div class="qgrid">${l.rows.map((r,i)=>`<div class="qr"><span class="qc">${r.hex?`<span class="sw" style="background:${r.hex}"></span>`:''}${esc(r.c)}</span>${r.qty>0?`<input class="qin" data-line="${l.id}" data-ri="${i}" value="${r.qty}">`:`<span class="qdash">-</span>`}</div>`).join('')}</div>`;
  }
  function addrCell(l){ if(!l.address) return `<button class="chooseaddr" data-pickaddr="${l.id}"><svg class="icn"><use href="#o-addr"/></svg>Choose Address</button>`;
    const n=addrNotes(l.id).length;
    return `<div class="addrwrap"><div class="addr">${l.address.lines.map((x,i)=>`<div${i===0?' class="an"':''}>${i===0?esc(l.address.name):''}${esc(x)}</div>`).join('')}<button class="addrchange" data-pickaddr="${l.id}"><svg class="icn"><use href="#o-addr"/></svg>Change address</button></div><button class="addrnote ${n?'has':''}" data-note="${l.id}" title="Delivery notes"><svg class="icn"><use href="#o-note"/></svg>${n?`<span class="addrnote-b">${n}</span>`:''}</button></div>`; }
  function rowActions(id){ return `<div class="lacts"><button data-rm="${id}" title="Remove"><svg class="icn"><use href="#o-minus"/></svg></button><button data-dup="${id}" title="Duplicate"><svg class="icn"><use href="#o-copy"/></svg></button></div>`; }

  function thumbCell(l,withProject){
    return `<div class="oc prodc"><span class="pimg" data-zoom="${l.id}"><img src="assets/products/${l.img}.png" alt="">${l.proof==='unbranded'?'<span class="unbadge" title="Unbranded — no print"><svg class="icn"><use href="#o-noproof"/></svg></span>':'<span class="unbadge brand" title="Branded"><svg class="icn"><use href="#o-branded"/></svg></span>'}<span class="pzoom" title="Enlarge"><svg class="icn"><use href="#o-zoom"/></svg></span></span><div class="pmeta"><a class="pn pmlink" data-name="${esc(l.name)}" href="Merchsmith Project - Autumn Giveaways.html#product=${encodeURIComponent(l.name)}">${esc(l.name)}</a>${withProject?`<a class="ppr" href="Merchsmith Project - Autumn Giveaways.html">${esc(l.project)}</a>`:''}</div></div>`;
  }
  function productRow(l){
    const ic=O.lineItemCost(l);
    return `<div class="orow">
      ${thumbCell(l,true)}
      <div class="oc qtyc">${qtyRows(l)}</div>
      <div class="oc costc"><b>${O.gbp(l.each*(1-(l.discountPct||0)/100))}</b>${l.discountPct?`<span class="wasprice">${O.gbp(l.each)}</span><span class="disc">Save ${l.discountPct}%</span>`:''}<span>(${O.gbp(ic)} total)</span></div>
      <div class="oc addcostc"><div class="addc-line"><span>Delivery</span><b>${O.gbp(l.deliveryCost)} <small>(${esc(l.region)})</small></b></div>${(l.charges||[]).map(c=>`<div class="addc-line"><span>${esc(c.label)}</span><b>${O.gbp(c.amt)}</b></div>`).join('')}</div>
      <div class="oc datec"><div class="dd">${esc(l.deliveryDate)}</div>${l.orderBy?`<div class="orderby"><svg class="icn"><use href="#o-clock"/></svg>${esc(l.orderBy)}</div>`:''}</div>
      <div class="oc addrc">${addrCell(l)}</div>
      <div class="oc actc">${rowActions(l.id)}</div>
    </div>`;
  }
  function sampleRow(l){
    return `<div class="orow srow">
      ${thumbCell(l,false)}
      <div class="oc">${esc(l.project)}</div>
      <div class="oc qtyc">${qtyRows(l)}</div>
      <div class="oc costc"><b>${O.gbp(O.lineItemCost(l))}</b></div>
      <div class="oc addcostc">${(l.charges||[]).length?(l.charges||[]).map(c=>`<div class="addc-line"><span>${esc(c.label)}</span><b>${O.gbp(c.amt)}</b></div>`).join(''):'<span style="color:var(--muted);font-size:11.5px">—</span>'}</div>
      <div class="oc">${esc(l.lead)}</div>
      <div class="oc addrc">${addrCell(l)}</div>
      <div class="oc actc">${rowActions(l.id)}</div>
    </div>`;
  }

  function summaryRows(lbl,net,vat,tot,big){
    return `<div class="sgrp ${big?'big':''}"><div class="sh">${lbl}</div>
      <div class="sr"><span>Net:</span><span>${O.gbp(net)}</span></div>
      <div class="sr"><span>VAT (20%):</span><span>${O.gbp(vat)}</span></div>
      <div class="sr tot"><span>Total:</span><span>${O.gbp(tot)}</span></div></div>`;
  }
  function summaryCard(ctaLabel,ctaId){
    const t=O.totals();
    return `<aside class="summary"><div class="sum-h">Summary</div>
      ${summaryRows('Orders Total:',t.oNet,t.oVat,t.oTot)}
      ${summaryRows('Samples Total:',t.sNet,t.sVat,t.sTot)}
      ${summaryRows('Total Due:',t.dNet,t.dVat,t.dTot,true)}
      <div class="sdisc"><label>Discount code</label><div class="dcrow"><input placeholder="Enter code"><button class="btn ghost sm">Apply</button></div></div>
      <button class="contbtn" id="${ctaId}">${ctaLabel}</button></aside>`;
  }

  function renderBasket(){
    const prods=O.getProducts(), samps=O.getSamples(), t=O.totals();
    if(!t.count){ root.innerHTML=`${crumb()}<div class="wrap"><h1 class="bt">Your Basket</h1><div class="empty"><svg class="icn"><use href="#o-bag"/></svg><div>Your basket is empty.</div><a class="contbtn" href="Merchsmith Project - Autumn Giveaways.html" style="display:inline-block;margin-top:16px;text-decoration:none">Back to project</a></div></div>`; return; }
    root.innerHTML=`${crumb()}<div class="wrap">
      <div class="bthead"><h1 class="bt">Your Basket</h1><span class="bcount">${t.count} Items</span><span class="bthead-steps">${stepsBar(0)}</span></div>
      <div class="blayout">
        <div class="bmain">
          <div class="otable card-merged">
            <div class="ot-title"><span class="ot-ic"><svg class="icn"><use href="#o-bag"/></svg></span>Orders<span class="ot-n">${prods.length}</span></div>
            <div class="ohead"><div>Product</div><div>Quantity</div><div>Unit Price</div><div>Add. Costs</div><div>Del. Date</div><div>Del. Address</div><div></div></div>
            ${prods.map(productRow).join('')}
          </div>
          ${samps.length?`<div class="otable stable card-merged" style="margin-top:24px">
            <div class="ot-title"><span class="ot-ic sample"><svg class="icn"><use href="#o-dl"/></svg></span>Sample Orders<span class="ot-n">${samps.length}</span></div>
            <div class="ohead stableh"><div>Product</div><div>Project</div><div>Quantity</div><div>Price</div><div>Additional</div><div>Est Lead Time</div><div>Del. Address</div><div></div></div>
            ${samps.map(sampleRow).join('')}
          </div>`:''}
        </div>
        ${summaryCard('Continue','toFinance')}
      </div></div>`;
    wireRows();
    document.getElementById('toFinance').onclick=()=>{ step=2; renderFinance(); };
  }

  let _undo=null, _undoTimer=null;
  function showUndo(line){
    clearTimeout(_undoTimer);
    let bar=document.getElementById('undoBar');
    if(!bar){ bar=document.createElement('div'); bar.id='undoBar'; bar.className='undobar'; document.body.appendChild(bar); }
    bar.innerHTML=`<span><b>${esc(line.name)}</b> removed</span><button id="undoBtn">Undo</button>`;
    bar.classList.add('on');
    document.getElementById('undoBtn').onclick=()=>{ if(_undo){ O.addToBasket(_undo); _undo=null; } bar.classList.remove('on'); renderBasket(); updateBadge(); };
    _undoTimer=setTimeout(()=>{ bar.classList.remove('on'); _undo=null; },6000);
  }
  function openProductOverlay(name){
    let ov=document.getElementById('pmOverlay');
    if(!ov){ ov=document.createElement('div'); ov.id='pmOverlay'; ov.className='pmov'; ov.innerHTML='<button class="pmov-x" title="Close">&times;</button><iframe></iframe>'; document.body.appendChild(ov);
      ov.querySelector('.pmov-x').onclick=()=>{ ov.classList.remove('on'); document.body.style.overflow=''; ov.querySelector('iframe').src='about:blank'; };
      ov.onclick=e=>{ if(e.target===ov){ ov.classList.remove('on'); document.body.style.overflow=''; ov.querySelector('iframe').src='about:blank'; } };
    }
    ov.querySelector('iframe').src='Merchsmith Project - Autumn Giveaways.html?modalonly=1#product='+encodeURIComponent(name);
    ov.classList.add('on'); document.body.style.overflow='hidden';
  }
  function wireRows(){
    root.querySelectorAll('.pmlink').forEach(a=>a.onclick=e=>{ e.preventDefault(); openProductOverlay(a.dataset.name||a.textContent); });
    root.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
      const l=O.getBasket().find(x=>x.id===b.dataset.rm); if(!l) return;
      if(!confirm('Remove “'+l.name+'” from your basket?')) return;
      _undo=JSON.parse(JSON.stringify(l)); O.removeLine(b.dataset.rm); renderBasket(); updateBadge(); showUndo(l);
    });
    root.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{ O.duplicateLine(b.dataset.dup); renderBasket(); updateBadge(); });
    root.querySelectorAll('.qin').forEach(inp=>{ inp.onchange=()=>{ O.setRowQty(inp.dataset.line,+inp.dataset.ri,+inp.value); renderBasket(); }; });
    root.querySelectorAll('.qcolhd').forEach(h=>h.onclick=()=>{ h.classList.toggle('open'); const sz=h.nextElementSibling; if(sz) sz.classList.toggle('open'); });
    root.querySelectorAll('[data-zoom],[data-prod]').forEach(el=>el.onclick=()=>{ const id=el.dataset.zoom||el.dataset.prod; const l=O.getBasket().find(x=>x.id===id); if(l) openZoom(l); });
    root.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>openAddrNotes(b.dataset.note));
    root.querySelectorAll('[data-pickaddr]').forEach(b=>b.onclick=()=>openAddrBook(b.dataset.pickaddr));
  }
  function openAddrBook(lineId){
    let lb=document.getElementById('addrBookModal');
    if(!lb){ lb=document.createElement('div'); lb.id='addrBookModal'; lb.className='annote-scrim'; lb.innerHTML='<div class="annote abk" role="dialog"></div>'; document.body.appendChild(lb);
      lb.addEventListener('click',e=>{ if(e.target===lb) close(); }); }
    function close(){ lb.classList.remove('open'); document.body.style.overflow=''; }
    const line=O.getBasket().find(x=>x.id===lineId);
    const curKey = line&&line.address ? (line.address.name+'|'+line.address.lines.join('|')) : '';
    function draw(adding){
      const book=O.addressBook();
      if(adding){
        lb.querySelector('.annote').innerHTML=`
          <div class="annote-hd"><b>Add delivery address</b><button class="annote-x" title="Close">×</button></div>
          <div class="abk-form">
            <label>Label <span>e.g. Head Office</span></label><input id="ab_label" type="text" placeholder="Label">
            <label>Contact name</label><input id="ab_name" type="text" placeholder="Recipient name">
            <label>Address</label><textarea id="ab_lines" rows="4" placeholder="One line per row…"></textarea>
          </div>
          <div class="abk-foot"><button class="btn ghost" id="ab_back">‹ Back</button><button class="btn" id="ab_save">Save &amp; use</button></div>`;
        lb.querySelector('.annote-x').onclick=close;
        lb.querySelector('#ab_back').onclick=()=>draw(false);
        lb.querySelector('#ab_save').onclick=()=>{
          const label=val('ab_label')||'Address', name=val('ab_name')||'', lines=val('ab_lines').split('\n').map(s=>s.trim()).filter(Boolean);
          if(!lines.length) return;
          const a=O.addAddress({label,name,lines}); O.setLineAddress(lineId,a); close(); renderBasket();
        };
        return;
      }
      lb.querySelector('.annote').innerHTML=`
        <div class="annote-hd"><b>Choose delivery address</b><button class="annote-x" title="Close">×</button></div>
        <div class="abk-list">${book.map(a=>{ const k=a.name+'|'+a.lines.join('|'); const on=k===curKey;
          return `<button class="abk-item ${on?'on':''}" data-aid="${a.id}"><span class="abk-radio"></span><span class="abk-info"><b>${esc(a.label)}</b><span>${esc(a.name)} · ${esc(a.lines.join(', '))}</span></span></button>`;
        }).join('')}</div>
        <div class="abk-foot"><button class="btn ghost" id="ab_add"><svg class="icn"><use href="#o-addr"/></svg>Add new address</button></div>`;
      lb.querySelector('.annote-x').onclick=close;
      lb.querySelector('#ab_add').onclick=()=>draw(true);
      lb.querySelectorAll('.abk-item').forEach(b=>b.onclick=()=>{ const a=O.addressBook().find(x=>x.id===b.dataset.aid); if(a){ O.setLineAddress(lineId,a); close(); renderBasket(); } });
    }
    draw(false); lb.classList.add('open'); document.body.style.overflow='hidden';
  }
  function openAddrNotes(id){
    let lb=document.getElementById('addrNoteModal');
    if(!lb){ lb=document.createElement('div'); lb.id='addrNoteModal'; lb.className='annote-scrim'; lb.innerHTML='<div class="annote" role="dialog"></div>'; document.body.appendChild(lb);
      lb.addEventListener('click',e=>{ if(e.target===lb) close(); }); }
    function close(){ lb.classList.remove('open'); document.body.style.overflow=''; }
    function draw(){
      const notes=addrNotes(id);
      lb.querySelector('.annote').innerHTML=`
        <div class="annote-hd"><b>Delivery notes</b><button class="annote-x" title="Close">×</button></div>
        <div class="annote-list">${notes.length?notes.map((nt,i)=>`<div class="annote-item"><p>${esc(nt.text)}</p><div class="annote-meta"><span><b>${esc(nt.who)}</b> · ${esc(nt.when)}</span><button class="annote-del" data-i="${i}">Remove</button></div></div>`).join(''):'<div class="annote-empty">No delivery notes yet.</div>'}</div>
        <div class="annote-add"><textarea id="annoteText" placeholder="Add a note for this delivery address…"></textarea><button class="btn" id="annoteSave">Add note</button></div>`;
      lb.querySelector('.annote-x').onclick=close;
      lb.querySelector('#annoteSave').onclick=()=>{ const t=lb.querySelector('#annoteText').value.trim(); if(!t) return;
        const now=new Date(); const when=now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})+' · '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
        const arr=addrNotes(id); arr.push({text:t,who:VIEWER,when}); addrNotesSet(id,arr); draw(); renderBasket(); };
      lb.querySelectorAll('.annote-del').forEach(b=>b.onclick=()=>{ const arr=addrNotes(id); arr.splice(+b.dataset.i,1); addrNotesSet(id,arr); draw(); renderBasket(); });
    }
    draw(); lb.classList.add('open'); document.body.style.overflow='hidden';
  }
  function openZoom(l){
    let lb=document.getElementById('oZoom'); if(!lb){ lb=document.createElement('div'); lb.id='oZoom'; lb.className='ozoom'; document.body.appendChild(lb); lb.onclick=e=>{ if(e.target===lb||e.target.closest('[data-zx]')) lb.classList.remove('open'); }; }
    lb.innerHTML=`<div class="ozbox"><button class="ozx" data-zx><svg class="icn"><use href="#o-x"/></svg></button><div class="ozimg"><img src="assets/products/${l.img}.png" alt=""></div><div class="ozmeta"><div class="ozt">${esc(l.name)}</div><div class="ozs">${esc(l.project)} · ${l.proof==='unbranded'?'Unbranded':'Branded'} · read-only preview</div></div></div>`;
    lb.classList.add('open');
  }

  /* ---------- FINANCE ---------- */
  function renderFinance(){
    const t=O.totals(); const a=O.ADDR;
    root.innerHTML=`${crumb()}<div class="wrap">
      <div class="bthead"><h1 class="bt">Finance</h1><span class="bcount">${t.count} Items</span><span class="bthead-steps">${stepsBar(1)}</span></div>
      <div class="blayout">
        <div class="bmain">
          <div class="fin-sec"><div class="fin-h">Billing Address <button class="ed"><svg class="icn"><use href="#o-edit"/></svg></button></div>
            <div class="addr big">${[a.name,...a.lines].map(x=>`<div>${esc(x)}</div>`).join('')}</div></div>

          <div class="fin-sec"><div class="fin-h">Payment Terms</div>
            <label class="radio"><input type="radio" name="terms" ${checkout.terms==='ordering'?'checked':''} data-terms="ordering"><span>Payment to be made at ordering stage.</span></label>
            <label class="radio"><input type="radio" name="terms" ${checkout.terms==='net30'?'checked':''} data-terms="net30"><span>Payment to be made within 30 Days of Delivery of the goods.</span></label></div>

          <div class="fin-sec"><div class="fin-h">Payment Method</div>
            <div class="paylist">
              <label class="paychoice ${checkout.method==='uk'?'on':''}" data-method="uk"><span class="dot"></span><div><b>UK / European Card</b> <span class="fee">1.5% transaction fee applies</span></div><span class="cards"><b>VISA</b><b>MC</b><b>AMEX</b></span></label>
              <div class="cardform ${checkout.method==='uk'?'':'hide'}">
                <div class="secnote"><b>Security notice</b> To keep you safe, your bank or card provider may ask you to confirm the payment by sending a code by text, email or banking app. They will never ask you to share this code.</div>
                <div class="fld"><label>Card number</label><input placeholder="1234 5678 9012 3456"></div>
                <div class="fld"><label>Name on card (As written on card)</label><input></div>
                <div class="frow"><div class="fld"><label>Expiry date</label><input placeholder="MM/YY"></div><div class="fld"><label>Security code</label><input placeholder="123"><small>This is the last 3 digits on the back of your card</small></div></div>
                <div class="fld"><label>Billing address</label><input value="Mr John Young, Bentley's Yard, 11 Waterfall Way, Market Harborough, LE16"></div>
                <label class="chk"><input type="checkbox">Save card for future purchases</label>
              </div>
              <label class="paychoice ${checkout.method==='noneu'?'on':''}" data-method="noneu"><span class="dot"></span><div><b>Non UK / European Card</b> <span class="fee">3% transaction fee applies</span></div></label>
              <label class="paychoice ${checkout.method==='bacs'?'on':''}" data-method="bacs"><span class="dot"></span><div><b>Bank Transfer</b></div></label>
            </div>
            <p class="note">Note: we cannot accept Personal Credit Cards or Cheques.</p></div>

          <div class="fin-sec"><div class="fin-h">Order Notes</div>
            <div class="ordernote">Payment due prior to production / dispatch.<br>Payment must be received within 24hrs to maintain the Delivery Dates stated.<br>If payment not received, Delivery Date status will require re-approval.<br>A Purchase Order may be required.</div></div>

          <div class="fin-sec"><div class="fin-h">Credit Limit</div><div class="creditbar"><div class="cb-fill" style="width:38%"></div></div><span class="note">£18,200 used of £50,000</span></div>

          <div class="fin-sec"><div class="fin-h">Your Order Reference / Purchase Order</div>
            <div class="fld"><label>Your order reference</label><input id="f_ref" value="${esc(checkout.po)}"></div>
            <div class="fld"><label>Your purchase order</label><input type="file"></div></div>
        </div>
        <div>
          ${summaryCard('Place order &amp; pay','placeBtn')}
          <div class="paywallets"><span>G Pay</span><span> Pay</span><span>bacs</span></div>
          <button class="uploadfile"><svg class="icn"><use href="#o-up"/></svg>Upload File</button>
          <button class="btn ghost sm" id="backBasket" style="width:100%;margin-top:14px">‹ Back to basket</button>
        </div>
      </div></div>`;
    root.querySelectorAll('[data-terms]').forEach(r=>r.onchange=()=>{ checkout.terms=r.dataset.terms; });
    root.querySelectorAll('[data-method]').forEach(m=>m.onclick=()=>{ checkout.method=m.dataset.method; renderFinance(); });
    document.getElementById('backBasket').onclick=()=>{ step=0; renderBasket(); };
    document.getElementById('placeBtn').onclick=()=>{ checkout.po=val('f_ref');
      placedOrder=O.placeOrder({ placedBy:O.ADDR.name, address:[O.ADDR.name,...O.ADDR.lines].join(', '),
        payment: checkout.terms==='net30'?'30 days from delivery':(checkout.method==='bacs'?'Bank transfer':'Paid by card'), po:checkout.po });
      step=3; updateBadge(); renderConfirm(); };
  }
  const val=id=>{ const e=document.getElementById(id); return e?e.value:''; };

  function renderConfirm(){ const o=placedOrder;
    root.innerHTML=`${crumb()}<div class="wrap">${stepsBar(2)}<div class="confirm">
      <div class="tick"><svg class="icn"><use href="#o-check"/></svg></div><h2>Order placed</h2>
      <p>Thanks — your order has been sent to the supplier.</p>
      <div class="refbox"><div><b>${o.ref}</b><span>Order reference</span></div><div><b>${esc(o.po)}</b><span>PO number</span></div><div><b>${o.payment}</b><span>Payment</span></div></div>
      <div style="display:flex;gap:10px;justify-content:center"><a class="contbtn" style="text-decoration:none;display:inline-flex;align-items:center" href="Merchsmith Orders.html#order=${o.id}">Track this order</a><a class="btn ghost" href="Merchsmith Orders.html">All orders</a></div>
    </div></div>`;
  }

  /* ---------- ORDERS list + detail (unchanged structure) ---------- */
  function statusPill(st){ const s=O.STATUS[st]||{label:st,cls:'peri'}; return `<span class="opill ${s.cls}">${s.label}</span>`; }
  function oLine(l){ return `<div class="line"><div class="pic"><img src="assets/products/${l.img}.png" alt=""></div><div class="info"><span class="tag ${l.kind==='sample'?'sample':'prod'}">${l.kind==='sample'?'Sample':'Product'}</span><div class="nm">${esc(l.name)}</div><div class="meta">${esc(l.variant||'')}${l.branding?' · '+esc(l.branding):''} · Qty ${(l.qty||0).toLocaleString()}</div></div><div class="right"><div class="lt">${O.gbp((l.unit||0)*(l.qty||0))}</div></div></div>`; }
  function renderOrders(){
    const m=(location.hash.match(/order=(\w+)/)||[])[1];
    if(m){ const o=O.getOrder(m); if(o){ renderOrderDetail(o); return; } }
    const list=O.getOrders();
    root.innerHTML=`<h1 class="ptitle">Orders</h1><p class="psub">${list.length} order${list.length!==1?'s':''} · ${ID==='supplier'?'received from distributors':'placed through Merchsmith'}</p>
      <div class="panel" style="margin-top:22px"><div class="panel-h">All orders</div>
      <table class="otbl"><thead><tr><th>Reference</th><th>Project</th><th>Placed</th><th>Lines</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(o=>`<tr data-o="${o.id}"><td><b>${o.ref}</b><small>${esc(o.po)}</small></td><td>${esc(o.project)}</td><td>${o.placed}<small>by ${esc(o.placedBy)}</small></td><td>${o.lines.length}</td><td>${statusPill(o.status)}</td><td class="go"><svg class="icn" style="width:17px;height:17px"><use href="#o-arr"/></svg></td></tr>`).join('')}
      </tbody></table></div>`;
    root.querySelectorAll('tr[data-o]').forEach(tr=>tr.onclick=()=>{ location.hash='order='+tr.dataset.o; });
  }
  function renderOrderDetail(o){
    const dist=ID==='distributor'||ID==='admin';
    const leg=dist?`<div class="panel" style="margin-top:18px"><div class="panel-h">Supplier dispatch <span style="font-weight:600;text-transform:none;letter-spacing:0;color:var(--muted)">distributor only</span></div><div class="pad" style="padding-top:6px">${[...new Set(o.lines.map(l=>l.supplier).filter(Boolean))].map(s=>`<div class="suprow"><svg class="icn" style="width:17px;height:17px;color:var(--periwinkle-deep)"><use href="#o-truck"/></svg><div><b>${esc(s)}</b><span>${o.lines.filter(l=>l.supplier===s).length} line(s)</span></div><span class="opill ${o.status==='delivered'?'green':'amber'}">${o.status==='delivered'?'Fulfilled':'Awaiting dispatch'}</span></div>`).join('')}</div></div>`:'';
    root.innerHTML=`<a class="btn ghost sm" href="Merchsmith Orders.html" style="margin-bottom:18px">‹ All orders</a>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><h1 class="ptitle">${o.ref}</h1><p class="psub">${esc(o.project)} · placed ${o.placed} by ${esc(o.placedBy)}</p></div>${statusPill(o.status)}</div>
      <div class="cols" style="margin-top:22px"><div>
        <div class="panel"><div class="panel-h">Status</div><div class="timeline">${o.stamps.map((s,i)=>{ const done=s.d&&s.d!=='—'; return `<div class="tl ${done?'done':''} ${i===o.stamps.findIndex(x=>!x.d||x.d==='—')?'cur':''}"><span class="tldot"></span><div><b>${esc(s.t)}</b><span>${esc(s.d||'Pending')}</span></div></div>`; }).join('')}</div></div>
        <div class="panel" style="margin-top:18px"><div class="panel-h">Lines</div>${o.lines.map(oLine).join('')}</div>${leg}
      </div>
      <div class="panel"><div class="panel-h">Details</div><div class="sum-body"><div class="sum"><div class="row"><span>PO number</span><b>${esc(o.po)}</b></div><div class="row"><span>Payment</span><b>${esc(o.payment)}</b></div><div class="row"><span>Delivery</span><b>${o.delivery}</b></div></div><div style="font-size:12.5px;color:var(--text-soft);margin-top:12px"><b style="color:var(--ink)">Ship to</b><br>${esc(o.address)}</div></div></div>
      </div>`;
  }

  function updateBadge(){ const el=document.getElementById('msBasketCount'); if(el){ const n=O.getBasket().length; el.textContent=n; el.style.display=n?'grid':'none'; } }
  window.addEventListener('hashchange',()=>{ if(page==='orders') renderOrders(); });
  if(page==='orders') renderOrders(); else renderBasket();
  updateBadge();
})();
