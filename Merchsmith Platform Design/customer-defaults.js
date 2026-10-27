/* ============================================================
   customer-defaults.js — the distributor's default trading terms for
   NEW customers (Distributor Settings → Customer defaults).
   They pre-fill Add customer → Terms & delivery, and count as already
   agreed: a new customer on (or below) the defaults needs no Finance
   approval. More credit, or different on-account terms, still does.
   Store: localStorage 'ms-cust-defaults' {payment,credit,vat,poLevel,discount,at,by,log:[]}
   window.MSCUSTDEF: get() · set(patch) · settings(mountEl) · TERMS · DISC
   ============================================================ */
window.MSCUSTDEF=(function(){
  const KEY='ms-cust-defaults';
  const TERMS=(window.MSCUSTACCT&&MSCUSTACCT.TERMS)||['Pro forma (pay before production)','Payment on order','7 days from invoice','14 days from invoice','30 days from invoice','30 days from delivery','60 days from invoice','End of month following invoice'];
  const DISC=['Standard (0%)','Bronze (5%)','Silver (7.5%)','Gold (10%)','Platinum (12.5%)'];
  const PO=[['optional','Optional'],['number','PO number'],['upload','PO number + upload']];
  const BASE={payment:'Payment on order',credit:0,vat:true,poLevel:'number',discount:DISC[0]};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num=v=>+String(v==null?'':v).replace(/[^0-9.]/g,'')||0;
  const gbp=n=>n?'£'+Math.round(n).toLocaleString('en-GB'):'';
  const upfront=t=>/pro forma|payment on order/i.test(t||'');
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } };
  const get=()=>Object.assign({},BASE,load());
  const me=()=>{ try{ return (window.MSChat&&MSChat.me&&MSChat.me().name)||'Jess Doyle'; }catch(e){ return 'Jess Doyle'; } };
  const finance=()=>{ const T=(window.ORG_DATA&&ORG_DATA.mojoTeams)||[]; const L=T.filter(t=>/finance/i.test(t.name)).flatMap(t=>t.users||[]).concat(T.flatMap(t=>t.users||[]).filter(u=>/finance/i.test((u.role||'')+' '+(u.title||''))));
    return L.filter((u,i)=>u.status!=='deactivated'&&L.findIndex(x=>x.n===u.n)===i); };
  const summary=d=>[d.payment, d.credit?gbp(d.credit)+' credit limit':'no credit limit', d.vat?'VAT applicable':'no VAT', d.discount].join(' · ');
  function set(patch){ const cur=get(), nx=Object.assign({},cur,patch), o=load();
    const changes=[]; if(nx.payment!==cur.payment) changes.push('payment terms '+cur.payment+' → '+nx.payment); if(num(nx.credit)!==num(cur.credit)) changes.push('credit limit '+(gbp(cur.credit)||'none')+' → '+(gbp(nx.credit)||'none'));
    if(nx.vat!==cur.vat) changes.push('VAT '+(nx.vat?'applicable':'not applicable')); if(nx.poLevel!==cur.poLevel) changes.push('PO '+PO.find(x=>x[0]===nx.poLevel)[1].toLowerCase()); if(nx.discount!==cur.discount) changes.push('discount '+nx.discount);
    if(!changes.length) return false;
    const log=(o.log||[]).slice(0,40); log.unshift({at:new Date().toISOString(),by:me(),txt:changes.join(', ')});
    try{ localStorage.setItem(KEY,JSON.stringify(Object.assign({},nx,{credit:num(nx.credit),at:new Date().toISOString(),by:me(),log}))); }catch(e){ return false; }
    // more risk than before: tell Finance (they own credit decisions)
    const riskier=num(nx.credit)>num(cur.credit)||(!upfront(nx.payment)&&nx.payment!==cur.payment);
    if(riskier&&!finance().some(u=>u.n===me())){ try{ if(window.MSNOTIF) MSNOTIF.push('distributor',{ev:'terms_req',title:'Default customer terms changed',body:me()+' changed the defaults for new customers: '+changes.join(', '),href:'Merchsmith Distributor Settings.html#tab=custdefaults'}); }catch(e){} }
    return true; }

  const css=`.cd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 22px;margin-top:16px;max-width:760px} @media(max-width:720px){.cd-grid{grid-template-columns:1fr}}
  .cd-f{display:flex;flex-direction:column;gap:6px} .cd-f>span{font-size:13px;font-weight:700;color:var(--ink-2,#55555f)} .cd-f small{font-size:12px;color:var(--muted,#9a9aa3);line-height:1.45}
  .cd-f select,.cd-f input{font:inherit;font-size:14px;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:10px;padding:10px 12px;background:#fff;min-width:0}
  .cd-money{display:flex;align-items:center;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:10px;background:#fff;padding-left:12px} .cd-money b{color:var(--muted,#9a9aa3);font-weight:600} .cd-f .cd-money input{border:0!important;box-shadow:none!important;border-radius:0;background:transparent;padding:10px 12px 10px 6px;flex:1;outline:none;min-width:0} .cd-money:focus-within{border-color:var(--periwinkle,#7b85c5)}
  .cd-seg{display:inline-flex;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:10px;overflow:hidden;background:#fff;align-self:flex-start} .cd-seg button{font:inherit;font-size:13.5px;font-weight:700;border:0;background:none;padding:9px 18px;cursor:pointer;color:var(--ink-2,#55555f)} .cd-seg button.on{background:var(--periwinkle-deep,#5860a6);color:#fff}
  .cd-note{margin-top:18px;max-width:760px;font-size:13px;line-height:1.55;color:var(--ink-2,#55555f);background:var(--tint-peri,#eef0fa);border-radius:12px;padding:12px 14px} .cd-note b{color:var(--ink,#23232a)}
  .cd-acts{display:flex;gap:10px;align-items:center;margin-top:18px} .cd-meta{font-size:12.5px;color:var(--muted,#9a9aa3)}
  .cd-log{margin-top:6px;display:flex;flex-direction:column} .cd-log div{display:grid;grid-template-columns:140px 120px minmax(0,1fr);gap:12px;padding:9px 0;border-top:1px solid var(--line-soft,#eef0f3);font-size:13px} .cd-log span{color:var(--muted,#9a9aa3)}`;
  let styled=false;
  function settings(el){ if(!el) return;
    if(!styled){ styled=true; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); }
    const draw=()=>{ const d=get(), o=load(), F=finance(), fN=F.map(u=>u.n).join(' or ')||'your Finance team', fD=x=>new Date(x).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      el.innerHTML=`<div class="card">
        <div class="card-h"><h2>Default terms for new customers</h2><span class="tag">Add customer</span></div>
        <p style="margin:0;font-size:13.5px;color:var(--ink-2,#55555f);line-height:1.6;max-width:72ch">These fill in the Terms step when you add a customer. A new customer on these terms is set up straight away. Anything more generous (a higher credit limit, or different on-account payment terms) goes to ${esc(fN)} to approve.</p>
        <div class="cd-grid">
          <label class="cd-f"><span>Payment terms</span><select data-cdp>${(TERMS.includes(d.payment)?TERMS:[d.payment].concat(TERMS)).map(t=>`<option${t===d.payment?' selected':''}>${esc(t)}</option>`).join('')}</select><small>Printed on quotes, orders and invoices.</small></label>
          <label class="cd-f"><span>Credit limit</span><span class="cd-money"><b>£</b><input data-cdc inputmode="numeric" placeholder="None" value="${d.credit?Math.round(d.credit).toLocaleString('en-GB'):''}"></span><small>Leave empty for no credit: customers pay when they order.</small></label>
          <div class="cd-f"><span>VAT applicable</span><div class="cd-seg" data-cdv>${[['1','Yes'],['0','No']].map(([v,l])=>`<button type="button" data-v="${v}" class="${(d.vat?'1':'0')===v?'on':''}">${l}</button>`).join('')}</div><small>Switch off per customer for VAT-exempt or overseas accounts.</small></div>
          <label class="cd-f" data-cdpow><span>PO for on-account orders</span><select data-cdpo>${PO.map(([v,l])=>`<option value="${v}"${d.poLevel===v?' selected':''}>${l}</option>`).join('')}</select><small>What a customer must give before ordering on account.</small></label>
          <label class="cd-f"><span>Discount group</span><select data-cdd>${DISC.map(x=>`<option${x===d.discount?' selected':''}>${esc(x)}</option>`).join('')}</select></label>
        </div>
        <div class="cd-note" data-cdn></div>
        <div class="cd-acts"><button class="btn" data-cdsave>Save defaults</button><span class="cd-meta">${o.at?'Last changed '+fD(o.at)+' by '+esc(o.by||''):'Not changed yet: using the platform default (Payment on order, no credit).'}</span></div>
      </div>
      ${(o.log||[]).length?`<div class="card"><div class="card-h"><h2>Change history</h2></div><div class="cd-log">${o.log.map(l=>`<div><span>${fD(l.at)}</span><b>${esc(l.by)}</b><span style="color:var(--ink-2,#55555f)">${esc(l.txt.charAt(0).toUpperCase()+l.txt.slice(1))}</span></div>`).join('')}</div></div>`:''}`;
      const q=s=>el.querySelector(s); let vat=d.vat;
      el.querySelectorAll('[data-cdv] button').forEach(b=>b.onclick=()=>{ vat=b.dataset.v==='1'; el.querySelectorAll('[data-cdv] button').forEach(x=>x.classList.toggle('on',x===b)); });
      const note=()=>{ const p=q('[data-cdp]').value, c=num(q('[data-cdc]').value), up=upfront(p);
        q('[data-cdpow]').style.visibility=up?'hidden':'visible';
        q('[data-cdn]').innerHTML=up&&!c?`<b>New customers pay when they order.</b> They can be given credit or account terms later from Organisations → customer → Edit terms, with Finance approval.`
          :`<b>New customers start on ${esc(p)}${c?' with '+gbp(c)+' credit':''}.</b> Agree this with ${esc(fN)} first: every new customer gets it without a separate approval.${F.some(u=>u.n===me())?'':' Finance is notified when you save.'}`; };
      q('[data-cdp]').onchange=note; q('[data-cdc]').oninput=e=>{ const v=e.target.value.replace(/\D/g,''); e.target.value=v?(+v).toLocaleString('en-GB'):''; note(); }; note();
      q('[data-cdsave]').onclick=()=>{ const ok=set({payment:q('[data-cdp]').value,credit:num(q('[data-cdc]').value),vat,poLevel:q('[data-cdpo]').value,discount:q('[data-cdd]').value});
        const t=document.getElementById('toast'); if(t){ t.textContent=ok?'Defaults saved':'No changes to save'; t.classList.add('show'); clearTimeout(t._cd); t._cd=setTimeout(()=>t.classList.remove('show'),1600); }
        draw(); };
    };
    draw(); }
  return {get,set,settings,TERMS,DISC,PO,summary};
})();
