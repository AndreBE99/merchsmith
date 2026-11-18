/* finance-invoices.js — Distributor Settings → Finance → Billing & payments (Sep 2026).
   Sub-tabs: Subscription (MSBILL) · Customer invoices · Supplier invoices (tables: finance-tables.js / MSFINT) · Bank details.
   Customer invoices: bank details shown to customers paying by transfer (checkout, pro-forma, order page) +
   the bank transfer payment window (MSBACS) + a register of invoices / credit notes raised on orders.
   Supplier invoices: every supplier PO and its invoice (matched / differs / awaiting), incl. two-supplier blank POs.
   Stores: ms-bank-details {name,bank,sort,acc,iban,bic,ref:'po'|'order'|'prefix',prefix,note}
   Reads:  ms-orders, ms-order-ops, ms-two-lane.  window.MSFIN: bank() · setBank(v) · refFor(o,po) · panel(root,me,sub) */
window.MSFIN=window.MSFIN||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const J=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||d; }catch(e){ return d; } };
  const gbp=n=>'£'+(Math.round((+n||0)*100)/100).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fD=t=>t?new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
  const DEF={name:'Mojo Promotions Ltd',bank:'Barclays Bank UK PLC',sort:'20-45-77',acc:'43218765',iban:'GB29 BARC 2045 7743 2187 65',bic:'BARCGB22',ref:'po',prefix:'MOJO-',note:''};
  const bank=()=>Object.assign({},DEF,J('ms-bank-details',{}));
  const setBank=v=>{ try{ localStorage.setItem('ms-bank-details',JSON.stringify(v)); }catch(e){} };
  const refFor=(orderRef,po)=>{ const b=bank(); return b.ref==='order'?(orderRef||'Your order number'):b.ref==='prefix'?(b.prefix||'')+(orderRef||'').replace(/^MS-/,''):(po||orderRef||'Your PO number'); };

  function custRegister(){ const O=J('ms-orders',[]), X=J('ms-order-ops',{}), rows=[];
    O.forEach(o=>{ const x=X[o.id]||{}, VR=o.vatRate==null?0.2:o.vatRate, lines=o.lines||[];
      lines.forEach((l,i)=>{ const L=(x.lines||[])[i]||{}; if(!L.tracking||L.cancelled) return; const net=(l.unit||0)*(l.qty||0);
        rows.push({no:String(o.ref).replace('MS-','INV-')+'-'+String(i+1).padStart(2,'0'),kind:'Invoice',o,what:l.name,net,gross:net*(1+VR),at:L.t&&L.t.dispatch,st:x.paid||/card/i.test(o.payment||'')?'Paid':o.onAccount?'On account':'Due'}); });
      (x.invX||[]).forEach(v=>rows.push({no:v.no,kind:'Extra invoice',o,what:v.desc||v.reason||'Additional charge',net:v.net,gross:v.gross,at:v.at,st:v.status==='paid'?'Paid':v.status==='due'?'Due':'On account'}));
      (x.credits||[]).forEach(c=>rows.push({no:c.no||'Credit note',kind:'Credit note',o,what:c.desc||c.reason||'Credit',net:-(c.net||0),gross:-(c.gross||c.amount||0),at:c.at,st:'Issued'})); });
    return rows.sort((a,b)=>new Date(b.at||0)-new Date(a.at||0)); }
  // same supplier resolution as the order page (order-detail.js supOf); ported so this works on any page
  const SUPMAP={'Recycled Cotton Tote':'BagWorks UK','Tech Travel Bag':'Veloce Print','Xoopar Pokket Wireless Mouse':'Lumen Goods','Prodir Ds8 True Biotic Pen':'Lumen Goods','RPET Document Pouch':'Veloce Print','Ceramic Mug 11oz':'PrintHouse','Heavy Weight T-Shirt':'Greenstock'};
  const supOf=l=>{ if(window.__odSupOf) return window.__odSupOf(l); const t=window.MSTWO?MSTWO.get(l.name):(l.name==='Recycled Cotton Tote'?{blank:'BagWorks UK',brand:'Veloce Print'}:null);
    if(t) return l.kind==='sample'&&/unbranded/i.test(l.branding||'')?t.blank:t.brand; return (l.supplier&&l.supplier!=='Lumen Supplies'?l.supplier:null)||SUPMAP[l.name]||l.supplier||'Lumen Supplies'; };
  function supRegister(){ const O=J('ms-orders',[]), X=J('ms-order-ops',{}), T=J('ms-two-lane',{}), rows=[];
    O.forEach(o=>{ const x=X[o.id]||{};
      // a supplier's PO counts as sent once any of its lines has been checked & sent (the time lives on the line)
      const sentFor=s=>{ const ts=(o.lines||[]).map((l,i)=>{ const L=(x.lines||[])[i]||{}, sup=supOf(l); return sup===s&&L.t&&L.t.sent?+new Date(L.t.sent):0; }).filter(Boolean); return ts.length?Math.min(...ts):0; };
      if(x.lpo) Object.entries(x.lpo).forEach(([li,p])=>{ const l=(o.lines||[])[+li], L=(x.lines||[])[+li]||{}; if(!p||!l) return; const sent=p.sentAt||(L.t&&L.t.sent)||null; if(!sent&&!p.invoice) return; rows.push({sup:supOf(l),po:p.no,o,inv:p.invoice,sent,item:l.name}); });
      else Object.entries(x.pos||{}).forEach(([s,p])=>{ if(!p) return; const sent=p.sentAt||sentFor(s)||null; if(!sent&&!p.invoice) return; rows.push({sup:s,po:p.no,o,inv:p.invoice,sent}); });
      Object.entries(T[o.id]||{}).forEach(([li,t])=>{ if(!t||t.st==='todo') return; const l=(o.lines||[])[+li]||{}; rows.push({sup:(t.blank||'Blank supplier'),po:String(o.ref).replace('MS-','PO-')+'-'+(+li+1)+'-B',o,inv:t.inv,sent:t.sentAt,blank:l.name,diff:t.inv&&t.inv.diff}); }); });
    return rows.sort((a,b)=>new Date(b.sent||0)-new Date(a.sent||0)); }

  const card=(title,lede,body)=>`<section class="card fi-card"><div class="card-h"><h2>${title}</h2></div>${lede?`<p class="lede">${lede}</p>`:''}${body}</section>`;
  const pill=(t,c)=>`<span class="fi-pill ${c}">${esc(t)}</span>`;

  function bankHTML(){ const b=bank();
    const F=(k,l,ph,w)=>`<label class="fi-f${w?' w2':''}"><span>${l}</span><input data-bk="${k}" value="${esc(b[k])}" placeholder="${esc(ph||'')}"></label>`;
    return card('Bank details','Shown to customers who pay by bank transfer at checkout, on the pro-forma invoice and on their order.',
      `<div class="fi-grid">${F('name','Account name','Mojo Promotions Ltd',1)}${F('bank','Bank','Barclays Bank UK PLC',1)}${F('sort','Sort code','00-00-00')}${F('acc','Account number','12345678')}${F('iban','IBAN','GB00 …',1)}${F('bic','BIC / SWIFT','')}</div>
       <div class="fi-grid" style="margin-top:4px"><label class="fi-f"><span>Payment reference</span><select data-bk="ref"><option value="po"${b.ref==='po'?' selected':''}>Customer’s PO number</option><option value="order"${b.ref==='order'?' selected':''}>Order number (e.g. MS-1059)</option><option value="prefix"${b.ref==='prefix'?' selected':''}>Prefix + order number</option></select></label>
         <label class="fi-f"${b.ref==='prefix'?'':' hidden'} data-bkpre><span>Prefix</span><input data-bk="prefix" value="${esc(b.prefix)}" placeholder="MOJO-"></label></div>
       <label class="fi-f w2"><span>Payment instructions (optional)</span><textarea data-bk="note" rows="2" placeholder="e.g. Please email your remittance advice to accounts@mojopromotions.co.uk">${esc(b.note)}</textarea></label>
       <div class="fi-prev"><span class="fi-lbl">Customers see</span><div class="fi-pgrid">${[['Account name',b.name],['Bank',b.bank],['Sort code',b.sort],['Account number',b.acc],['IBAN',b.iban],['BIC / SWIFT',b.bic],['Reference',refFor('MS-1059','PO-44821')]].map(([k,v])=>`<div><span>${k}</span><b>${esc(v||'—')}</b></div>`).join('')}</div>${b.note?`<p>${esc(b.note)}</p>`:''}</div>
       <div class="fi-acts"><button class="btn" data-bksave>Save bank details</button><span class="fi-ok" data-bkok hidden>Saved</span></div>`)
     +(window.MSBACS?MSBACS.settingsHTML().replace('<section class="card bacs-card" style="margin-bottom:22px">','<section class="card fi-card bacs-card">'):'')
; }

  function supHTML(){ const R=supRegister(), inv=R.filter(r=>r.inv), wait=R.filter(r=>!r.inv), tot=inv.reduce((a,r)=>a+(+r.inv.amount||0),0);
    return card('Supplier invoices','Every purchase order you’ve sent and the supplier’s invoice against it. Upload or replace an invoice from the order’s supplier documents.',
      `<div class="fi-kpis"><div><b>${R.length}</b><span>Purchase orders</span></div><div><b>${inv.length}</b><span>Invoiced</span></div><div><b>${wait.length}</b><span>Awaiting invoice</span></div><div><b>${gbp(tot)}</b><span>Invoiced value</span></div></div>
       ${R.length?`<div class="fi-tw"><table class="fi-tbl"><thead><tr><th>Supplier</th><th>PO</th><th>Order</th><th>Sent</th><th>Invoice</th><th class="r">Amount</th><th>Received</th><th>Status</th></tr></thead><tbody>${R.map(r=>{ const d=r.diff!=null?+r.diff:null, st=!r.inv?['Awaiting invoice','a']:d!=null&&Math.abs(d)>0.5?['Differs by '+gbp(d),'r']:['Received','g'];
          return `<tr><td><b>${esc(r.sup)}</b>${r.blank?`<small>Blank stock · ${esc(r.blank)}</small>`:''}</td><td>${esc(r.po||'—')}</td><td><a href="Merchsmith Orders.html#order=${esc(r.o.id)}">${esc(r.o.ref)}</a></td><td>${fD(r.sent)}</td><td>${r.inv?esc(r.inv.no||'—'):'—'}</td><td class="r">${r.inv?`<b>${gbp(r.inv.amount)}</b>`:'—'}</td><td>${r.inv?fD(r.inv.at):'—'}</td><td>${pill(st[0],st[1])}</td></tr>`; }).join('')}</tbody></table></div>`
        :'<div class="fi-empty">No purchase orders sent yet. They appear here once you Check &amp; send an order to a supplier.</div>'}`); }

  function panel(root,me,sub){ if(!root) return; sub=sub||(location.hash.match(/sub=(\w+)/)||[])[1]||'dash';
    const TABS=[['dash','Dashboard'],['plan','Subscription'],['cust','Customer invoices'],['sup','Supplier invoices'],['bank','Bank details'],['int','Integrations']];
    root.innerHTML=`<div class="settabs fi-tabs">${TABS.map(([k,l])=>`<button class="settab${sub===k?' active':''}" data-fisub="${k}">${l}</button>`).join('')}</div><div class="fi-body" data-fibody></div>`;
    const body=root.querySelector('[data-fibody]');
    if(sub==='dash'){ if(window.MSDASH) MSDASH.mount(body,{page:'finance',role:window.MS_SCOPE==='platform'?'admin':((window.MSID&&MSID.current&&MSID.current())||'distributor'),me:'BagWorks UK'}); else body.innerHTML='<div class="fi-empty">Dashboard isn’t available.</div>'; }
    else if(sub==='plan'){ if(window.MSBILL&&me) MSBILL.panel(body,me); else body.innerHTML='<div class="fi-empty">Subscription details aren’t available.</div>'; }
    else if(sub==='cust'){ if(window.MSFINT) MSFINT.cust(body); else body.innerHTML='<div class="fi-empty">Invoices aren’t available.</div>'; }
    else if(sub==='sup'){ if(window.MSFINT) MSFINT.sup(body); else body.innerHTML=supHTML(); }
    else if(sub==='int'){ if(window.MSINT) MSINT.tab(body); else body.innerHTML='<div class="fi-empty">Integrations aren’t available.</div>'; }
    else if(sub==='bank'){ body.innerHTML=bankHTML();
      if(window.MSBACS) MSBACS.wireSettings(body);
      const pre=body.querySelector('[data-bkpre]'), rs=body.querySelector('select[data-bk="ref"]'); rs.onchange=()=>{ pre.hidden=rs.value!=='prefix'; };
      body.querySelector('[data-bksave]').onclick=()=>{ const v=bank(); body.querySelectorAll('[data-bk]').forEach(i=>v[i.dataset.bk]=i.value.trim()); setBank(v); panel(root,me,'bank'); const ok=root.querySelector('[data-bkok]'); if(ok){ ok.hidden=false; setTimeout(()=>ok.hidden=true,1800); } }; }
    root.querySelectorAll('[data-fisub]').forEach(b=>b.onclick=()=>{ history.replaceState(null,'','#tab=billing&sub='+b.dataset.fisub); panel(root,me,b.dataset.fisub); });
  }
  window.addEventListener('hashchange',()=>{ const m=location.hash.match(/tab=billing&sub=(\w+)/); const r=document.getElementById('billingMount'); if(m&&r&&r.querySelector('.fi-tabs')){ const me=window.ADMIN&&(ADMIN.distributors.find(d=>d.id==='acme')||ADMIN.distributors[0]); panel(r,me,m[1]); } });

  const css=`
  .fi-tabs{margin:18px 0 20px;} .fi-body{display:flex;flex-direction:column;gap:22px;} .fi-card{margin:0;}
  .fi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:6px;} @media(max-width:900px){.fi-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .fi-f{display:flex;flex-direction:column;gap:5px;min-width:0;} .fi-f.w2{grid-column:span 2;} .fi-f[hidden]{display:none;} .fi-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);}
  .fi-f input,.fi-f select,.fi-f textarea{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;color:var(--ink);width:100%;resize:vertical;} .fi-card>.fi-f{margin-top:12px;}
  .fi-prev{margin-top:16px;background:var(--paper);border:1px solid var(--line-soft);border-radius:12px;padding:14px 16px;} .fi-lbl{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
  .fi-pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px 18px;} .fi-pgrid span{display:block;font-size:11.5px;color:var(--muted);} .fi-pgrid b{font-size:14px;color:var(--ink);word-break:break-word;} .fi-prev p{margin:10px 0 0;font-size:13px;color:var(--ink-2);}
  .fi-acts{display:flex;align-items:center;gap:12px;margin-top:16px;} .fi-ok{font-size:13px;font-weight:700;color:var(--green-deep,#1d7c4d);}
  .fi-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:8px 0 16px;} @media(max-width:760px){.fi-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .fi-kpis>div{background:var(--paper);border-radius:12px;padding:12px 14px;} .fi-kpis b{display:block;font-size:20px;color:var(--ink);font-variant-numeric:tabular-nums;} .fi-kpis span{font-size:11.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);}
  .fi-tw{border:1px solid var(--line-soft);border-radius:12px;overflow-x:auto;background:#fff;} .fi-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:720px;} .fi-tbl .fi-pill{white-space:normal;}
  .fi-tbl th{background:var(--paper);text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding:10px 12px;white-space:nowrap;} .fi-tbl td{padding:11px 12px;border-top:1px solid var(--paper-2);vertical-align:top;white-space:nowrap;} .fi-tbl .r{text-align:right;font-variant-numeric:tabular-nums;}
  .fi-tbl td small{display:block;font-size:11.5px;color:var(--muted);margin-top:2px;} .fi-tbl .fi-what{white-space:normal;max-width:220px;} .fi-tbl a{font-weight:700;}
  .fi-pill{display:inline-block;font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;} .fi-pill.g{background:#ecfdf3;color:#067647;} .fi-pill.a{background:#fffaeb;color:#b54708;} .fi-pill.r{background:#fef3f2;color:#b42318;} .fi-pill.p{background:var(--tint-peri,#eceef9);color:var(--periwinkle-ink,#3C4279);} .fi-pill.v{background:#f4f3ff;color:#5925dc;}
  .fi-empty{padding:28px;text-align:center;color:var(--muted);font-size:13.5px;background:var(--paper);border-radius:12px;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {bank,setBank,refFor,panel};
})();
