/* ============================================================
   terms-approval.js — credit terms need Finance sign-off.
   New customers start on "Payment on order" with no credit limit. Asking
   for any other payment terms or a credit limit creates a request for the
   Finance team: a notification + email, then Finance approves (as asked or
   changed) or declines. Request + decision go into the organisation's
   history (MSNOTES.log 'org:<id>'). Until approved the customer stays on
   Payment on order.

   Finance = the distributor's Finance team (ORG_DATA.mojoTeams) or anyone
   whose role/title says Finance.
   Store: localStorage 'ms-terms-req' {reqId:{…}}
   window.MSTERMS: request(cust,{payment,credit}) · open(reqId) · pending(custId) · finance()
   ============================================================ */
window.MSTERMS=window.MSTERMS||(function(){
  const KEY='ms-terms-req', D=()=>window.ORG_DATA||{customers:[]};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const TERMS=(window.MSCUSTACCT&&MSCUSTACCT.TERMS)||['Payment on order','7 days','14 days','30 days','30 days end of month','60 days'];
  const num=v=>+String(v||'').replace(/[^0-9.]/g,'')||0;
  const upfront=t=>/pro forma|payment on order/i.test(t||'');
  const acct=cid=>window.MSCUSTACCT?MSCUSTACCT.get(cid):null;
  const DEF='Payment on order';
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const put=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} };
  const gbp=v=>{ const n=+String(v||'').replace(/[^0-9.]/g,''); return n?'£'+n.toLocaleString('en-GB'):''; };
  const fDT=d=>new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const finance=()=>{ const T=D().mojoTeams||[]; const L=T.filter(t=>/finance/i.test(t.name)).flatMap(t=>t.users||[]).concat(T.flatMap(t=>t.users||[]).filter(u=>/finance/i.test((u.role||'')+' '+(u.title||''))));
    return L.filter((u,i)=>u.status!=='deactivated'&&L.findIndex(x=>x.n===u.n)===i); };
  const me=()=>{ const p=(window.MSChat&&MSChat.me&&MSChat.me())||{}; return p.name||'Jess Doyle'; };
  const isFinance=()=>finance().some(u=>u.n===me());
  const pending=cid=>Object.values(all()).find(r=>r.custId===cid&&r.status==='pending')||null;
  // new customer: anything beyond Payment on order. Existing: only more credit, or a move to (different) on-account terms
  const needs=(t,cur)=>cur?(num(t.credit)>num(cur.credit)||(!upfront(t.payment)&&t.payment!==cur.payment)):((t.payment&&!upfront(t.payment))||!!gbp(t.credit));
  const summary=t=>[t.payment||DEF,gbp(t.credit)?gbp(t.credit)+' credit limit':'no credit limit'].join(' · ');
  const hist=(cid,txt)=>{ try{ if(window.MSNOTES) MSNOTES.log('org:'+cid,'terms',txt); }catch(e){} };
  function email(tpl,to,thread,extra){ try{ const k='ms-email-v1', o=JSON.parse(localStorage.getItem(k)||'{}'); o.sent=o.sent||{}; if(!o.sent.mojo) return;
    o.sent.mojo.unshift(Object.assign({id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),tpl,to,at:new Date().toISOString(),status:'delivered',thread,replies:[]},extra||{})); localStorage.setItem(k,JSON.stringify(o)); }catch(e){} }
  function notify(ev,title,body,href){ try{ if(window.MSNOTIF) MSNOTIF.push('distributor',{ev,title,body,href}); }catch(e){} }

  function request(c,t,opt){ opt=opt||{}; const dd=window.MSCUSTDEF&&MSCUSTDEF.get(), base=dd?{payment:dd.payment,credit:gbp(dd.credit)}:null; if(!opt.force&&!needs(t,opt.current||base)) return null; const o=all(), id='tr'+Date.now().toString(36), F=finance();
    o[id]={id,custId:c.id,custName:c.name,requested:{payment:t.payment||DEF,credit:gbp(t.credit)},current:opt.current||null,note:opt.note||'',by:me(),at:new Date().toISOString(),status:'pending',to:F.map(u=>u.n)}; put(o);
    const href='Merchsmith Organisations.html#terms='+id, what=summary(o[id].requested);
    notify('terms_req','Terms to approve: '+c.name,me()+' asked for '+what,href);
    F.forEach(u=>email('terms_req',{name:u.n,org:'Mojo Promotions',email:u.email||''},{type:'org',label:c.name+' · credit terms',href},{vars:{'customer.name':c.name,'terms.requested':what,'requester.name':me()}}));
    hist(c.id,'Credit terms requested by '+me()+': '+what+'. Sent to '+(F.map(u=>u.n).join(', ')||'Finance')+' to approve'+(opt.current?'. Current terms ('+summary(opt.current)+') stay until then.':'. Customer is on '+(base?summary(base):'Payment on order')+' until then.')+(opt.note?' Note: '+opt.note:''));
    return o[id]; }

  function apply(cid,t){ const c=D().customers.find(x=>x.id===cid); const patch={paymentTerms:t.payment,creditLimit:t.credit||''};
    if(c) Object.assign(c,patch);
    if(window.MSCUSTACCT) MSCUSTACCT.set(cid,{terms:t.payment,creditLimit:num(t.credit)});
    try{ const k='ms-cust-new', s=JSON.parse(localStorage.getItem(k)||'{}'); const r=(s.items||[]).find(x=>x.id===cid); if(r){ Object.assign(r,patch); if(r._wiz){ r._wiz.terms.payment=t.payment; r._wiz.terms.credit=String(t.credit||'').replace(/[^0-9.]/g,''); } localStorage.setItem(k,JSON.stringify(s)); } }catch(e){}
    try{ window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:cid}})); }catch(e){} if(window.MSORGTABLE&&MSORGTABLE.redraw) MSORGTABLE.redraw(); }

  function open(id){ const r=all()[id]; if(!r) return toast('That request no longer exists');
    const F=finance(), can=isFinance(), done=r.status!=='pending';
    const w=document.createElement('div'); w.className='ta-scrim'; document.body.appendChild(w);
    const draw=()=>{ const x=all()[id], d=x.decision;
      w.innerHTML=`<div class="ta-m" role="dialog" aria-modal="true" aria-label="Review credit terms"><div class="ta-h"><div><h3>Credit terms for ${esc(x.custName)}</h3><small>Requested by ${esc(x.by)} · ${fDT(x.at)}</small></div><button class="ta-x" data-tax aria-label="Close">×</button></div>
        <div class="ta-b">
          ${x.current?`<div class="ta-req ta-cur"><span>Current</span><b>${esc(x.current.payment)}</b><b>${x.current.credit?esc(x.current.credit)+' credit limit':'No credit limit'}</b></div>`:''}
          <div class="ta-req"><span>Requested</span><b>${esc(x.requested.payment)}</b><b>${x.requested.credit?esc(x.requested.credit)+' credit limit':'No credit limit'}</b>${x.note?`<p class="ta-note" style="width:100%;margin:4px 0 0;font-size:13px">“${esc(x.note)}”</p>`:''}</div>
          ${done?`<div class="ta-dec s-${x.status}"><b>${x.status==='declined'?'Declined':x.status==='changed'?'Approved with changes':'Approved'}</b><span>${esc(d.by)} · ${fDT(d.at)}</span>
              ${x.status!=='declined'?`<p>${esc(d.payment)} · ${d.credit?esc(d.credit)+' credit limit':'no credit limit'}</p>`:`<p>${x.current?'Stays on '+esc(summary(x.current))+'.':'Stays on Payment on order.'}</p>`}${d.note?`<p class="ta-note">“${esc(d.note)}”</p>`:''}</div>`
          :`${can?'':`<div class="ta-info">Waiting for ${esc(F.map(u=>u.n).join(' or ')||'Finance')} to review. <em>Prototype: you can review as Finance below.</em></div>`}
            <div class="ta-grid"><label class="ta-f"><span>Payment terms</span><select data-tp>${TERMS.map(v=>`<option${v===x.requested.payment?' selected':''}>${v}</option>`).join('')}</select></label>
              <label class="ta-f"><span>Credit limit (£)</span><input data-tc value="${esc(String(x.requested.credit||'').replace(/[^0-9.]/g,''))}" placeholder="None" inputmode="decimal"></label></div>
            <label class="ta-f"><span>Note <i>saved to the customer’s history</i></span><textarea data-tn rows="3" placeholder="e.g. Approved after credit check · reviewed again in 6 months"></textarea></label>
            <p class="ta-sm">${x.current?'Until this is approved, '+esc(x.custName)+' stays on its current terms.':'Until this is approved, '+esc(x.custName)+' stays on Payment on order with no credit limit.'}</p>`}
        </div>
        <div class="ta-f2">${done?'<button class="btn" data-tax>Close</button>':`<button class="btn ghost" data-tadecl>Decline</button><span></span><button class="btn" data-taok>Approve</button>`}</div></div>`;
      w.querySelectorAll('[data-tax]').forEach(b=>b.onclick=()=>w.remove());
      const tp=w.querySelector('[data-tp]'), tc=w.querySelector('[data-tc]'), ok=w.querySelector('[data-taok]');
      const lab=()=>{ if(!ok) return; const ch=tp.value!==x.requested.payment||gbp(tc.value)!==x.requested.credit; ok.textContent=ch?'Approve with changes':'Approve'; };
      if(tp){ tp.onchange=lab; tc.oninput=lab; }
      const decide=st=>{ const note=w.querySelector('[data-tn]').value.trim(); if(st==='declined'&&!note){ w.querySelector('[data-tn]').focus(); return toast('Add a note to say why'); }
        const pay=st==='declined'?DEF:tp.value, cr=st==='declined'?'':gbp(tc.value), s2=st==='declined'?'declined':(pay!==x.requested.payment||cr!==x.requested.credit?'changed':'approved');
        const o=all(); o[id].status=s2; o[id].decision={payment:pay,credit:cr,note,by:me(),at:new Date().toISOString()}; put(o);
        if(s2!=='declined') apply(x.custId,{payment:pay,credit:cr});
        const verb=s2==='declined'?'declined':s2==='changed'?'approved with changes':'approved', res=s2==='declined'?(x.current?'Stays on '+summary(x.current)+'.':'Stays on Payment on order.'):summary({payment:pay,credit:cr})+'.';
        hist(x.custId,'Credit terms '+verb+' by '+me()+'. '+res+(note?' Note: '+note:''));
        notify('terms_done','Terms '+verb+': '+x.custName,res+(note?' “'+note+'”':''),'Merchsmith Organisations.html#org='+x.custId);
        email('terms_done',{name:x.by,org:'Mojo Promotions',email:''},{type:'org',label:x.custName+' · credit terms',href:'Merchsmith Organisations.html#org='+x.custId},{vars:{'customer.name':x.custName,'terms.decision':verb,'terms.result':res}});
        toast('Terms '+verb+' for '+x.custName); draw(); };
      if(ok){ ok.onclick=()=>decide('approved'); w.querySelector('[data-tadecl]').onclick=()=>decide('declined'); lab(); } };
    w.addEventListener('mousedown',e=>{ if(e.target===w) w.remove(); }); draw(); }

  /* Edit an existing customer's terms (Organisations → customer drawer → Edit terms).
     Less credit, upfront terms, VAT and PO rules apply straight away. More credit or a change to
     on-account terms goes to Finance (applied directly when the editor is Finance). */
  function edit(c,onDone){ const p=pending(c.id); if(p){ toast('There’s already a request waiting for Finance'); return open(p.id); }
    const a=acct(c.id)||{terms:c.paymentTerms||DEF,creditLimit:num(c.creditLimit),vat:c.vatApplicable!==false,poLevel:'number'};
    const cur={payment:a.terms,credit:gbp(a.creditLimit)}, F=finance(), fin=isFinance(), PO=[['optional','Optional'],['number','PO number'],['upload','PO number + upload']];
    const w=document.createElement('div'); w.className='ta-scrim'; document.body.appendChild(w);
    w.innerHTML=`<div class="ta-m" role="dialog" aria-modal="true" aria-label="Edit trading terms"><div class="ta-h"><div><h3>Trading terms · ${esc(c.name)}</h3><small>Used at checkout, and printed on quotes, orders and invoices</small></div><button class="ta-x" data-tax aria-label="Close">×</button></div>
      <div class="ta-b">
        <div class="ta-grid"><label class="ta-f"><span>Payment terms</span><select data-ep>${(TERMS.includes(a.terms)?TERMS:[a.terms].concat(TERMS)).map(v=>`<option${v===a.terms?' selected':''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="ta-f"><span>Credit limit (£)</span><input data-ec value="${a.creditLimit?Math.round(a.creditLimit).toLocaleString('en-GB'):''}" placeholder="None" inputmode="numeric"></label></div>
        ${a.creditUsed?`<p class="ta-sm">${gbp(a.creditUsed)} currently used.</p>`:''}
        <div class="ta-grid"><div class="ta-f"><span>VAT applicable</span><div class="ta-seg" data-ev>${[['1','Yes'],['0','No']].map(([v,l])=>`<button type="button" data-v="${v}" class="${(a.vat?'1':'0')===v?'on':''}">${l}</button>`).join('')}</div></div>
          <div class="ta-f" data-epow><span>PO for on-account orders</span><select data-epo>${PO.map(([v,l])=>`<option value="${v}"${a.poLevel===v?' selected':''}>${l}</option>`).join('')}</select></div></div>
        <label class="ta-f"><span>Note <i>saved to the customer’s history${F.length?', and sent to Finance if approval is needed':''}</i></span><textarea data-en rows="2" placeholder="e.g. Annual review · order volume up 40%"></textarea></label>
        <div class="ta-info" data-eh></div>
      </div>
      <div class="ta-f2"><button class="btn ghost" data-tax>Cancel</button><span></span><button class="btn" data-eok>Save</button></div></div>`;
    const q=s=>w.querySelector(s), close=()=>w.remove();
    w.querySelectorAll('[data-tax]').forEach(b=>b.onclick=close); w.addEventListener('mousedown',e=>{ if(e.target===w) close(); });
    let vat=a.vat; w.querySelectorAll('[data-ev] button').forEach(b=>b.onclick=()=>{ vat=b.dataset.v==='1'; w.querySelectorAll('[data-ev] button').forEach(x=>x.classList.toggle('on',x===b)); });
    const t=()=>({payment:q('[data-ep]').value,credit:gbp(q('[data-ec]').value)});
    const hint=()=>{ const n=t(), ask=needs(n,cur)&&!fin; q('[data-epow]').style.visibility=upfront(n.payment)?'hidden':'visible';
      q('[data-eh]').innerHTML=ask?`<b>Needs Finance approval.</b> ${esc(F.map(u=>u.n).join(' or ')||'Finance')} will be asked to approve ${esc(summary(n))}. ${esc(c.name)} stays on ${esc(summary(cur))} until then. VAT and PO changes apply now.`
        :(fin&&needs(n,cur)?'You’re in Finance, so this applies straight away.':'Applies straight away. Less credit and upfront payment don’t need approval.');
      q('[data-eok]').textContent=ask?'Send to Finance':'Save'; };
    q('[data-ep]').onchange=hint; q('[data-ec]').oninput=e=>{ const d=e.target.value.replace(/\D/g,''); e.target.value=d?(+d).toLocaleString('en-GB'):''; hint(); }; hint();
    q('[data-eok]').onclick=()=>{ const n=t(), note=q('[data-en]').value.trim(), ask=needs(n,cur)&&!fin, po=q('[data-epo]').value;
      const side={}; if(vat!==a.vat) side.vat=vat; if(po!==a.poLevel) side.poLevel=po;
      if(Object.keys(side).length&&window.MSCUSTACCT){ MSCUSTACCT.set(c.id,side); hist(c.id,'Trading terms changed by '+me()+': '+[side.vat!=null?'VAT '+(vat?'applicable':'not applicable'):'',side.poLevel?'PO '+PO.find(x=>x[0]===po)[1].toLowerCase():''].filter(Boolean).join(', ')+'.'); }
      const changed=n.payment!==cur.payment||n.credit!==cur.credit;
      if(changed&&ask){ request(c,n,{current:cur,note,force:true}); toast('Sent to Finance to approve'); }
      else if(changed){ apply(c.id,n); hist(c.id,'Trading terms changed by '+me()+': '+summary(cur)+' → '+summary(n)+'.'+(note?' Note: '+note:'')); toast('Terms updated for '+c.name); }
      else if(Object.keys(side).length) toast('Terms updated for '+c.name);
      close(); if(window.MSORGTABLE&&MSORGTABLE.redraw) MSORGTABLE.redraw(); if(onDone) onDone(); };
  }

  function toast(m){ const t=document.createElement('div'); t.textContent=m; t.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font:600 13.5px var(--sans);padding:12px 20px;border-radius:12px;z-index:1900'; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
  const hook=()=>{ const m=location.hash.match(/terms=(\w+)/); if(m){ history.replaceState(null,'',location.pathname+location.search); setTimeout(()=>open(m[1]),300); } };
  window.addEventListener('hashchange',hook); document.readyState==='loading'?document.addEventListener('DOMContentLoaded',hook):hook();

  const css=`.ta-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);display:grid;place-items:center;z-index:1400;padding:16px;}
  .ta-m{background:var(--paper);width:min(520px,100%);border-radius:18px;box-shadow:0 30px 80px rgba(20,22,45,.4);display:flex;flex-direction:column;max-height:90vh;}
  .ta-h{display:flex;gap:12px;padding:18px 22px 10px;} .ta-h>div{flex:1;} .ta-h h3{font-family:var(--serif);font-weight:500;font-size:22px;margin:0;} .ta-h small{font-size:12.5px;color:var(--muted);} .ta-x{border:0;background:none;font-size:26px;line-height:1;color:var(--muted);cursor:pointer;}
  .ta-b{padding:6px 22px 16px;display:flex;flex-direction:column;gap:12px;overflow:auto;}
  .ta-req{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:11px 14px;} .ta-req span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);width:100%;} .ta-req b{font-size:15px;}
  .ta-info{font-size:13px;color:var(--ink-2);background:var(--tint-peri);border-radius:10px;padding:10px 12px;line-height:1.5;} .ta-info em{display:block;font-style:normal;color:var(--muted);font-size:12px;}
  .ta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;} @media(max-width:520px){.ta-grid{grid-template-columns:1fr;}}
  .ta-f{display:flex;flex-direction:column;gap:5px;} .ta-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .ta-f>span i{font-style:normal;font-weight:600;color:var(--muted);}
  .ta-f input,.ta-f select,.ta-f textarea{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;resize:vertical;min-width:0;}
  .ta-sm{font-size:12px;color:var(--muted);margin:0;}
  .ta-dec{border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;background:var(--tint-green);} .ta-dec.s-declined{background:var(--tint-red);} .ta-dec.s-changed{background:#fbeccd;}
  .ta-dec b{font-size:14.5px;} .ta-dec span{font-size:12px;color:var(--ink-3);} .ta-dec p{margin:4px 0 0;font-size:13.5px;} .ta-note{color:var(--ink-2);font-style:italic;}
  .ta-f2{display:flex;gap:10px;align-items:center;padding:14px 22px;border-top:1px solid var(--line-soft);} .ta-f2 span{flex:1;} .ta-f2 .btn{white-space:nowrap;}
  .ta-cur{background:transparent;border-style:dashed;} .ta-cur b{color:var(--ink-2);font-weight:600;}
  .ta-seg{display:inline-flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;background:#fff;align-self:flex-start;} .ta-seg button{font:inherit;font-size:13.5px;font-weight:700;border:0;background:none;padding:8px 16px;cursor:pointer;color:var(--ink-2);} .ta-seg button.on{background:var(--periwinkle-deep);color:#fff;}
  .ta-info b{color:var(--ink);}
  .ot-terms{display:inline-block;margin-left:7px;font-size:10.5px;font-weight:800;background:#fbeccd;color:#8a5a12;border-radius:6px;padding:2px 7px;border:0;cursor:pointer;white-space:nowrap;vertical-align:1px;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {request,open,edit,pending,finance,needs,DEF,TERMS};
})();
