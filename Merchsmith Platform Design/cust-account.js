/* ============================================================
   cust-account.js — a customer's commercial terms with their
   distributor, used at the ORDERING stage:
     · VAT applicable (yes/no)   → whether VAT is added at checkout
     · Credit limit (currency)   → orders beyond available credit need pro forma / approval
     · Payment terms             → printed on the order and invoice
   Set by the DISTRIBUTOR; the customer sees them read-only.
   Plus account totals (projects, orders, spend, last 12 months).
   Stored in ms-cust-account {custId:{vat,creditLimit,terms}}.

   window.MSCUSTACCT: get(id) / set(id,patch) / TERMS / available(id) / panel(el,cust,canEdit,distName)
   ============================================================ */
window.MSCUSTACCT=(function(){
  const KEY='ms-cust-account';
  const TERMS=['Pro forma (pay before production)','Payment on order','7 days from invoice','14 days from invoice','30 days from invoice','30 days from delivery','60 days from invoice','End of month following invoice'];
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num=s=>parseFloat(String(s==null?'':s).replace(/[^\d.]/g,''))||0;
  const gbp=n=>'£'+Math.round(n).toLocaleString('en-GB');
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } };
  const seedOf=id=>((window.ORG_DATA&&ORG_DATA.customers)||[]).find(c=>c.id===id)||{};
  function get(id){ const s=seedOf(id), o=load()[id]||{};
    return { vat:o.vat!=null?o.vat:(s.vatApplicable!=null?s.vatApplicable:true),
      creditLimit:o.creditLimit!=null?o.creditLimit:num(s.creditLimit),
      terms:o.terms||s.paymentTerms||'30 days from invoice',
      creditUsed:o.creditUsed!=null?o.creditUsed:num(s.creditUsed), poLevel:o.poLevel||(o.poRequired===false?'optional':o.poRequired===true?'number':(s.poLevel||'number')),
      invoiceUser:o.invoiceUser!=null?o.invoiceUser:null, invoiceName:o.invoiceName||s.invoiceName||'Accounts payable', invoiceEmail:o.invoiceEmail||s.invoiceEmail||('accounts@'+(s.domain||'customer.com')), updated:o.updated||null, by:o.by||'' }; }
  // an on-account order uses up credit (orders are placed as the customer, not a settings change)
  function useCredit(id,amt){ const all=load(); all[id]=Object.assign(all[id]||{}); all[id].creditUsed=get(id).creditUsed+(+amt||0); try{ localStorage.setItem(KEY,JSON.stringify(all)); }catch(e){} }
  const upfront=t=>/pro forma|payment on order/i.test(t||'');
  function set(id,patch,by){ const all=load(); all[id]=Object.assign(all[id]||{},patch,{updated:new Date().toISOString(),by:by||((window.MSChat&&MSChat.me&&MSChat.me())||{}).name||((window.MSID&&MSID.get&&MSID.get())||{}).who||''});
    try{ localStorage.setItem(KEY,JSON.stringify(all)); }catch(e){} syncOrg(id); try{ window.dispatchEvent(new CustomEvent('ms-cust-account',{detail:{id}})); }catch(e){} }
  // ms-cust-account is the one record for terms: mirror it onto the organisation record the drawer + Customers table read
  function syncOrg(only){ const L=(window.ORG_DATA&&ORG_DATA.customers)||[], all=load();
    Object.keys(all).forEach(id=>{ if(only&&id!==only) return; const c=L.find(x=>x.id===id); if(!c) return; const a=get(id);
      c.paymentTerms=a.terms; c.creditLimit=a.creditLimit?gbp(a.creditLimit):''; c.creditUsed=a.creditUsed?gbp(a.creditUsed):''; c.vatApplicable=a.vat; c.poLevel=a.poLevel; }); }
  const available=id=>{ const a=get(id); return Math.max(0,a.creditLimit-a.creditUsed); };

  // people at the customer with the Finance role (people.js store first, then seed)
  function financeUsers(id){ const s=seedOf(id); let L=[];
    try{ if(window.MSPEOPLE&&MSPEOPLE.users) L=MSPEOPLE.users(id)||[]; }catch(e){}
    if(!L.length) L=(s.teams||[]).flatMap(t=>t.users||[]);
    return L.filter(u=>/finance/i.test(u.role||'')&&u.status!=='deactivated'); }
  // who gets invoices: a chosen Finance user, else the first Finance user, else the manual name/email
  function invoiceContact(id){ const a=get(id), F=financeUsers(id); const u=a.invoiceUser==='manual'?null:(F.find(x=>x.email===a.invoiceUser)||F[0]);
    return u?{name:u.n,email:u.email,user:u.email,title:u.title||'Finance',fromUser:true}:{name:a.invoiceName,email:a.invoiceEmail,user:'manual',fromUser:false}; }
  function invoiceCard(c){ const a=get(c.id), F=financeUsers(c.id), ic=invoiceContact(c.id);
    return `<div class="card" data-cainv><div class="card-h"><h2>Invoice contact</h2><span class="tag">Used at checkout</span></div>
      <p class="lede">Who receives invoices for ${esc(c.name)}. ${F.length?'Pick one of your Finance team, or enter someone else.':'Add someone with the Finance role to your team to choose them here, or enter a contact below.'}</p>
      ${F.length?`<div class="ca-inv">${F.map(u=>`<label class="ca-invu${ic.user===u.email?' on':''}"><input type="radio" name="cainv" value="${esc(u.email)}"${ic.user===u.email?' checked':''}><span><b>${esc(u.n)}</b><small>${esc(u.title||'Finance')} · ${esc(u.email)}</small></span></label>`).join('')}
        <label class="ca-invu${ic.user==='manual'?' on':''}"><input type="radio" name="cainv" value="manual"${ic.user==='manual'?' checked':''}><span><b>Someone else</b><small>Enter a name and email</small></span></label></div>`:''}
      ${!F.length||ic.user==='manual'?`<div class="ca-invm"><label><span>Name</span><input data-cainvn value="${esc(a.invoiceName)}"></label><label><span>Email</span><input data-cainve type="email" value="${esc(a.invoiceEmail)}"></label></div>`:''}</div>`; }
  function panel(el,c,canEdit,distName,opts){ opts=opts||{};
    const wireInv=()=>{ const fl=()=>{ const t=document.getElementById('toast'); if(t){ t.classList.add('show'); clearTimeout(t._ca); t._ca=setTimeout(()=>t.classList.remove('show'),1400); } };
      el.querySelectorAll('[name="cainv"]').forEach(r=>r.onchange=()=>{ set(c.id,{invoiceUser:r.value}); draw(); fl(); });
      const ivn=el.querySelector('[data-cainvn]'), ive=el.querySelector('[data-cainve]'); if(ivn) ivn.onchange=()=>{ set(c.id,{invoiceName:ivn.value.trim()}); fl(); }; if(ive) ive.onchange=()=>{ set(c.id,{invoiceEmail:ive.value.trim()}); fl(); }; };
    const draw=()=>{ const a=get(c.id), used=a.creditUsed, pct=a.creditLimit?Math.min(100,Math.round(used/a.creditLimit*100)):0;
      const st=[['Total projects',c.projects!=null?c.projects:'—'],['Total orders',c.totalOrders!=null?c.totalOrders:'—'],['Total spend',c.totalSpend||'—'],['Spend last 12 months',c.spend12||'—']];
      el.innerHTML=`
      <div class="card">
        <div class="card-h"><h2>Account summary</h2>${c.lastOrder?`<span class="tag">Last order ${esc(c.lastOrder)}</span>`:''}</div>
        <div class="ca-stats">${st.map(([l,v])=>`<div><b>${esc(v)}</b><span>${l}</span></div>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Trading terms</h2>${canEdit?`<a class="btn ghost" href="Merchsmith Organisations.html#org=${esc(c.id)}">Edit in Organisations</a>`:`<span class="tag">Set by ${esc(distName||'your distributor')}</span>`}</div>
        <p class="lede">${canEdit?'These apply when '+esc(c.name)+' places an order. Change them from '+esc(c.name)+'’s profile in Organisations: more credit or longer payment terms go to your Finance team to approve.'
          :'Your distributor sets these. They apply when you place an order. Contact '+esc(distName||'your distributor')+' if something needs changing.'}</p>
        <div class="ca-rows">
          <div class="ca-row"><div class="ca-l"><b>VAT applicable</b><span>Used at checkout. Choose No for VAT-exempt or overseas customers.</span></div>
            <div class="ca-v">${false?`<div class="ca-seg" data-cavat><button type="button" data-v="1" class="${a.vat?'on':''}">Yes</button><button type="button" data-v="0" class="${a.vat?'':'on'}">No</button></div>`:`<b>${a.vat?'Yes':'No'}</b>`}</div></div>
          <div class="ca-row"><div class="ca-l"><b>Credit limit</b><span>Used at checkout. Orders that take the balance over this limit need pro forma payment or your approval.</span></div>
            <div class="ca-v">${false?`<label class="ca-money"><span>£</span><input data-cacredit inputmode="numeric" value="${a.creditLimit?Math.round(a.creditLimit).toLocaleString('en-GB'):''}" placeholder="0"></label>`:`<b>${a.creditLimit?gbp(a.creditLimit):'No credit'}</b>`}</div></div>
          ${a.creditLimit?`<div class="ca-credit"><div class="ca-bar${pct>=90?' hot':''}"><i style="width:${pct}%"></i></div><span><b>${gbp(used)}</b> used · <b>${gbp(Math.max(0,a.creditLimit-used))}</b> available of ${gbp(a.creditLimit)}</span></div>`:''}
          <div class="ca-row"><div class="ca-l"><b>Payment terms</b><span>Printed on orders and invoices.</span></div>
            <div class="ca-v">${false?`<select data-caterms>${(TERMS.includes(a.terms)?TERMS:[a.terms,...TERMS]).map(t=>`<option${t===a.terms?' selected':''}>${esc(t)}</option>`).join('')}</select>`:`<b>${esc(a.terms)}</b>`}</div></div>
          ${upfront(a.terms)?'':`<div class="ca-row ca-sub"><div class="ca-l"><b>Purchase order for on-account orders</b><span>What ${esc(c.name)} must give before placing an order on account.</span></div>
            <div class="ca-v">${false?`<div class="ca-seg" data-capo>${[['optional','Optional'],['number','PO number'],['upload','PO number + upload']].map(([v,l])=>`<button type="button" data-v="${v}" class="${a.poLevel===v?'on':''}">${l}</button>`).join('')}</div>`:`<b>${{optional:'Optional',number:'PO number required',upload:'PO number and PO document required'}[a.poLevel]}</b>`}</div></div>`}
        </div>
        ${a.updated?`<p class="ca-meta">Last changed ${new Date(a.updated).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}${a.by?' by '+esc(a.by):''}</p>`:''}
      </div>`+invoiceCard(c);
      if(opts.only){ el.querySelectorAll(':scope > .card').forEach(cd=>{ const h=(cd.querySelector('.card-h h2')||{}).textContent||''; const isSum=/Account summary/i.test(h); cd.hidden=opts.only==='summary'?!isSum:isSum; }); }
      wireInv();
      return;
      const flash=()=>{ const t=document.getElementById('toast'); if(t){ t.classList.add('show'); clearTimeout(t._ca); t._ca=setTimeout(()=>t.classList.remove('show'),1400); } };
      el.querySelectorAll('[data-cavat] button').forEach(b=>b.onclick=()=>{ set(c.id,{vat:b.dataset.v==='1'}); draw(); flash(); });
      el.querySelectorAll('[data-capo] button').forEach(b=>b.onclick=()=>{ set(c.id,{poLevel:b.dataset.v}); draw(); flash(); });
      const cr=el.querySelector('[data-cacredit]'); cr.oninput=()=>{ const d=cr.value.replace(/\D/g,''); cr.value=d?(+d).toLocaleString('en-GB'):''; };
      cr.onchange=()=>{ set(c.id,{creditLimit:num(cr.value)}); draw(); flash(); };
      el.querySelector('[data-caterms]').onchange=e=>{ set(c.id,{terms:e.target.value}); draw(); flash(); };
    };
    draw();
  }
  const css=`
  .ca-row.ca-sub{margin-left:18px;padding-left:14px;border-left:2px solid var(--line-soft);} .ca-sub .ca-seg{flex-wrap:wrap;}
  .ca-inv{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;margin-top:10px;} .ca-invu{display:flex;gap:10px;align-items:flex-start;border:1.5px solid var(--line-soft);border-radius:12px;padding:11px 13px;cursor:pointer;} .ca-invu.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);} .ca-invu input{margin-top:3px;accent-color:var(--periwinkle-deep);} .ca-invu span{display:flex;flex-direction:column;gap:1px;min-width:0;} .ca-invu b{font-size:14px;} .ca-invu small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;}
  .ca-invm{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;} .ca-invm label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;color:var(--ink-2);} .ca-invm input{font:inherit;font-size:14px;font-weight:400;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;} @media(max-width:600px){.ca-invm{grid-template-columns:1fr;}}
  .ca-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:10px;}
  .ca-stats>div{border:1px solid var(--line-soft);border-radius:13px;padding:14px 16px;background:var(--paper);}
  .ca-stats b{display:block;font-family:var(--serif);font-weight:500;font-size:30px;line-height:1.05;}
  .ca-stats span{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);}
  @media(max-width:760px){.ca-stats{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .ca-rows{display:flex;flex-direction:column;}
  .ca-row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0;border-top:1px solid var(--paper-2);flex-wrap:wrap;}
  .ca-row:first-child{border-top:0;}
  .ca-l{display:flex;flex-direction:column;gap:3px;max-width:56ch;} .ca-l b{font-size:14.5px;} .ca-l span{font-size:12.5px;color:var(--text-soft);line-height:1.45;}
  .ca-v b{font-size:15px;}
  .ca-seg{display:inline-flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;}
  .ca-seg button{font:inherit;font-size:13.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:8px 18px;cursor:pointer;}
  .ca-seg button+button{border-left:1.5px solid var(--line-soft);} .ca-seg button.on{background:var(--periwinkle-deep);color:#fff;}
  .ca-money{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 12px;background:#fff;}
  .ca-money span{font-weight:700;color:var(--muted);} .ca-money input{border:0;font:inherit;font-size:15px;font-weight:700;width:120px;text-align:right;outline:0;}
  .ca-money:focus-within{border-color:var(--periwinkle);}
  .ca-v select{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 12px;background:#fff;min-width:260px;}
  .ca-credit{display:flex;flex-direction:column;gap:6px;padding:0 0 16px;font-size:12.5px;color:var(--text-soft);}
  .ca-bar{height:8px;border-radius:5px;background:var(--paper-2);overflow:hidden;max-width:420px;} .ca-bar i{display:block;height:100%;background:var(--spearmint);border-radius:5px;}
  .ca-bar.hot i{background:#e0a02a;}
  .ca-meta{font-size:12px;color:var(--muted);margin:10px 0 0;}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  syncOrg();
  return { get, set, TERMS, available, panel, useCredit, upfront, financeUsers, invoiceContact, syncOrg };
})();
