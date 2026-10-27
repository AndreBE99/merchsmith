/* ============================================================
   promo-codes.js — distributor discount codes (Store settings → Discounts → Codes).
   Store: ms-promo-codes [{id,code,type:'pct'|'amount'|'delivery',value,applies:'order'|'orders'|'products',
            products:[names],who:'all'|'selected'|'one',customers:[ids],start,end,min,maxUses,oncePer,stack,active,uses:[{cust,order,at,off}]}]
          ms-promo-applied {code}  (the code on the current basket)
   Totals: order-data.js totals() calls MSPROMO.calc({prods,samps,lineCost,cust}) → {off, delOff, code, err}.
   window.MSPROMO: list/save/find/check(code,ctx)/calc(ctx)/applied()/apply(code)/remove()/record(order)/panel(el)
   ============================================================ */
window.MSPROMO=window.MSPROMO||(function(){
  const KEY='ms-promo-codes', AKEY='ms-promo-applied';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const iso=d=>d.toISOString().slice(0,10);
  const SEED=()=>{ const t=new Date(), e=new Date(t); e.setMonth(e.getMonth()+2); const p=new Date(t); p.setMonth(p.getMonth()-2); const pe=new Date(t); pe.setDate(pe.getDate()-5);
    return [
      {id:'pc1',code:'AUTUMN10',type:'pct',value:10,applies:'orders',products:[],who:'all',customers:[],start:iso(t),end:iso(e),min:500,maxUses:100,oncePer:true,stack:false,active:true,uses:[{cust:'northwind',order:'MS-1049',at:'12 Sept 2026',off:86.4}]},
      {id:'pc2',code:'CITRIXSHIP',type:'delivery',value:0,applies:'order',products:[],who:'one',customers:['citrix'],start:'',end:'',min:0,maxUses:0,oncePer:false,stack:true,active:true,uses:[]},
      {id:'pc3',code:'WELCOME50',type:'amount',value:50,applies:'order',products:[],who:'all',customers:[],start:iso(p),end:iso(pe),min:250,maxUses:0,oncePer:true,stack:true,active:true,uses:[]}]; };
  function list(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(Array.isArray(v)) return v; }catch(e){} const s=SEED(); save(s); return s; }
  function save(l){ try{ localStorage.setItem(KEY,JSON.stringify(l)); }catch(e){} }
  const find=c=>list().find(x=>x.code.toUpperCase()===String(c||'').trim().toUpperCase());
  const applied=()=>{ try{ return (JSON.parse(localStorage.getItem(AKEY)||'{}')||{}).code||''; }catch(e){ return ''; } };
  const setApplied=c=>{ try{ c?localStorage.setItem(AKEY,JSON.stringify({code:c})):localStorage.removeItem(AKEY); }catch(e){} };
  const custName=id=>(((window.ORG_DATA&&ORG_DATA.customers)||[]).find(c=>c.id===id)||{}).name||id;
  const status=p=>{ const t=iso(new Date()); if(!p.active) return ['Paused','off']; if(p.end&&p.end<t) return ['Expired','off']; if(p.start&&p.start>t) return ['Scheduled','sch']; if(p.maxUses&&p.uses.length>=p.maxUses) return ['Used up','off']; return ['Active','on']; };
  const describe=p=>(p.type==='pct'?p.value+'% off':p.type==='amount'?gbp(p.value)+' off':'Free delivery')+(p.type==='delivery'?'':p.applies==='orders'?' orders (not samples)':p.applies==='products'?' selected products':' the whole order');

  // ctx: {prods, samps, lineCost(l), cust}
  function check(p,ctx){ if(!p) return 'That code isn’t recognised.'; const [st]=status(p); const t=iso(new Date());
    if(!p.active) return 'This code is paused.'; if(p.start&&p.start>t) return 'This code starts on '+new Date(p.start).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'.';
    if(p.end&&p.end<t) return 'This code has expired.'; if(p.maxUses&&p.uses.length>=p.maxUses) return 'This code has been fully used.';
    if(p.who!=='all'&&!(p.customers||[]).includes(ctx.cust)) return 'This code isn’t valid for your account.';
    if(p.oncePer&&p.uses.some(u=>u.cust===ctx.cust)) return 'You’ve already used this code.';
    const net=[...ctx.prods,...ctx.samps].reduce((a,l)=>a+ctx.lineCost(l),0); if(p.min&&net<p.min) return 'Spend '+gbp(p.min)+' or more (before VAT) to use this code.';
    return ''; }
  function calc(ctx){ const c=applied(); if(!c) return {off:0,delOff:0,code:''}; const p=find(c), err=check(p,ctx); if(err) return {off:0,delOff:0,code:c,err};
    const pool=(p.applies==='orders'||p.type==='delivery')?ctx.prods:p.applies==='products'?[...ctx.prods,...ctx.samps].filter(l=>(p.products||[]).includes(l.name)):[...ctx.prods,...ctx.samps];
    const elig=p.stack?pool:pool.filter(l=>!(l.discountPct>0));
    if(p.type==='delivery'){ const d=ctx.prods.reduce((a,l)=>a+(l.deliveryCost||0),0); return d?{off:0,delOff:d,code:p.code,desc:describe(p)}:{off:0,delOff:0,code:c,err:'There’s no delivery charge on this order.'}; }
    if(!elig.length) return {off:0,delOff:0,code:c,err:p.stack?'This code doesn’t apply to anything in your basket.':'This code can’t be combined with your account discount.'};
    const base=elig.reduce((a,l)=>a+ctx.lineCost(l),0); const off=p.type==='pct'?base*p.value/100:Math.min(p.value,base);
    return {off:Math.round(off*100)/100,delOff:0,code:p.code,desc:describe(p),partial:elig.length<pool.length}; }
  function record(order){ const c=order&&order.promo&&order.promo.code; if(!c) return; const l=list(), p=l.find(x=>x.code===c); if(!p) return;
    p.uses.push({cust:order.customer||'citrix',order:order.ref,at:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),off:(order.promo.off||0)+(order.promo.delOff||0)}); save(l); setApplied(''); }

  /* ---------- distributor panel ---------- */
  function panel(el){ if(!el) return; let edit=null;
    const custs=()=>((window.ORG_DATA&&ORG_DATA.customers)||[]).filter(c=>c.status!=='draft');
    const prodNames=[...new Set(((window.STORE_FEED&&STORE_FEED.products)||window.STORE_PRODUCTS||[]).map(p=>p.name).filter(Boolean))].slice(0,400);
    const draw=()=>{ const L=list();
      el.innerHTML=`<div class="card pc-card"><div class="card-h"><h2>Discount codes</h2><span class="tag">${L.filter(p=>status(p)[1]==='on').length} active</span><span style="flex:1"></span><button class="btn sm" data-pcnew>New code</button></div>
        <p class="lede">Codes customers type in at checkout. Choose who can use each one, what it takes off and any limits. Codes come off the sell price before VAT.</p>
        <div class="pc-tbl"><div class="pc-h"><span>Code</span><span>Discount</span><span>Who</span><span>Limits</span><span>Uses</span><span>Status</span><span></span></div>
        ${L.length?L.map(p=>{ const [s,c]=status(p); return `<div class="pc-r"><span><code class="pc-code">${esc(p.code)}</code></span><span>${esc(describe(p))}${p.stack?'':'<em>Not with account discount</em>'}</span>
          <span>${p.who==='all'?'All customers':esc((p.customers||[]).map(custName).join(', ')||'No customers yet')}</span>
          <span class="pc-lim">${[p.min?'Min '+gbp(p.min):'',p.end?'Ends '+new Date(p.end).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'',p.oncePer?'Once per customer':''].filter(Boolean).join(' · ')||'—'}</span>
          <span>${p.uses.length}${p.maxUses?' / '+p.maxUses:''}</span><span><i class="pc-st ${c}">${s}</i></span>
          <span class="pc-acts"><button class="mk-del pc-ed" data-pced="${esc(p.id)}" title="Edit code" aria-label="Edit code"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></span></div>`; }).join('')
        :'<div class="ds-empty">No codes yet. Create one to give customers a discount at checkout.</div>'}</div></div>`;
      el.querySelector('[data-pcnew]').onclick=()=>form(null);
      el.querySelectorAll('[data-pced]').forEach(b=>b.onclick=()=>form(L.find(p=>p.id===b.dataset.pced))); };
    function form(p0){ const p=Object.assign({code:'',type:'pct',value:10,applies:'order',products:[],who:'all',customers:[],start:'',end:'',min:0,maxUses:0,oncePer:false,stack:false,active:true,uses:[]},p0?JSON.parse(JSON.stringify(p0)):{});
      const w=document.createElement('div'); w.className='pc-scrim';
      const d=()=>{ w.innerHTML=`<div class="pc-modal" role="dialog" aria-modal="true" aria-label="Discount code">
        <div class="pc-mh"><b>${p0?'Edit '+esc(p0.code):'New discount code'}</b><button class="pc-x" data-pcx aria-label="Close">×</button></div>
        <div class="pc-body">
          <label class="pc-f"><span>Code</span><div class="pc-row"><input data-f="code" value="${esc(p.code)}" placeholder="e.g. AUTUMN10" style="text-transform:uppercase"><button class="btn ghost sm" data-pcgen type="button">Generate</button></div></label>
          <div class="pc-f"><span>Discount</span><div class="pc-seg">${[['pct','Percentage'],['amount','Fixed amount'],['delivery','Free delivery']].map(([k,l])=>`<button type="button" class="${p.type===k?'on':''}" data-ty="${k}">${l}</button>`).join('')}</div>
            ${p.type==='delivery'?'<small>Removes the delivery charge from product lines.</small>':`<div class="pc-row"><input data-f="value" type="number" min="0" step="${p.type==='pct'?'0.5':'1'}" value="${esc(p.value)}" style="max-width:140px"><em>${p.type==='pct'?'% off':'£ off'}</em></div>`}</div>
          ${p.type==='delivery'?'':`<div class="pc-f"><span>Applies to</span><div class="pc-seg">${[['order','Whole order'],['orders','Orders only (not samples)'],['products','Selected products']].map(([k,l])=>`<button type="button" class="${p.applies===k?'on':''}" data-ap="${k}">${l}</button>`).join('')}</div>
            ${p.applies==='products'?`<div class="pc-picks">${(p.products||[]).map(n=>`<span>${esc(n)}<button type="button" data-rmp="${esc(n)}" aria-label="Remove">×</button></span>`).join('')}<input list="pcProds" data-addp placeholder="Add a product…"><datalist id="pcProds">${prodNames.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></div>`:''}</div>`}
          <div class="pc-f"><span>Who can use it</span><div class="pc-seg">${[['all','All customers'],['selected','Selected customers'],['one','One customer']].map(([k,l])=>`<button type="button" class="${p.who===k?'on':''}" data-wh="${k}">${l}</button>`).join('')}</div>
            ${p.who==='all'?'':`<div class="pc-custs">${custs().length?'':'<span class="pc-none">No customers yet.</span>'}${custs().map(c=>`<label><input type="${p.who==='one'?'radio':'checkbox'}" name="pcc" value="${esc(c.id)}"${(p.customers||[]).includes(c.id)?' checked':''}> ${esc(c.name)}</label>`).join('')}</div>`}</div>
          <div class="pc-grid"><label class="pc-f"><span>Starts</span><input data-f="start" type="date" value="${esc(p.start)}"></label><label class="pc-f"><span>Ends</span><input data-f="end" type="date" value="${esc(p.end)}"></label>
            <label class="pc-f"><span>Minimum order (£, before VAT)</span><input data-f="min" type="number" min="0" value="${esc(p.min||'')}" placeholder="None"></label><label class="pc-f"><span>Total uses</span><input data-f="maxUses" type="number" min="0" value="${esc(p.maxUses||'')}" placeholder="Unlimited"></label></div>
          <label class="pc-chk"><input type="checkbox" data-f="oncePer"${p.oncePer?' checked':''}> One use per customer</label>
          <label class="pc-chk"><input type="checkbox" data-f="stack"${p.stack?' checked':''}> Can be used on top of the customer’s account discount</label>
          <label class="pc-chk"><input type="checkbox" data-f="active"${p.active?' checked':''}> Active</label>
          ${p0&&p0.uses.length?`<div class="pc-uses"><b>Used ${p0.uses.length} time${p0.uses.length>1?'s':''}</b>${p0.uses.slice(-5).reverse().map(u=>`<span>${esc(custName(u.cust))} · ${esc(u.order)} · ${esc(u.at)} · ${gbp(u.off)}</span>`).join('')}</div>`:''}
          <p class="pc-err" data-pcerr hidden></p></div>
        <div class="pc-ft">${p0?'<button class="btn ghost sm pc-delb" data-pcdel type="button">Delete</button>':''}<span style="flex:1"></span><button class="btn ghost sm" data-pcx type="button">Cancel</button><button class="btn sm" data-pcsave type="button">Save code</button></div></div>`;
        const g=k=>w.querySelector('[data-f="'+k+'"]'), keep=()=>{ ['code','value','start','end','min','maxUses'].forEach(k=>{ const e=g(k); if(e) p[k]=e.type==='number'?(+e.value||0):e.value.trim(); }); ['oncePer','stack','active'].forEach(k=>{ const e=g(k); if(e) p[k]=e.checked; }); if(p.who!=='all') p.customers=[...w.querySelectorAll('[name="pcc"]:checked')].map(x=>x.value); };
        w.querySelectorAll('[data-ty]').forEach(b=>b.onclick=()=>{ keep(); p.type=b.dataset.ty; if(p.type==='pct'&&p.value>100) p.value=10; d(); });
        w.querySelectorAll('[data-ap]').forEach(b=>b.onclick=()=>{ keep(); p.applies=b.dataset.ap; d(); });
        w.querySelectorAll('[data-wh]').forEach(b=>b.onclick=()=>{ keep(); p.who=b.dataset.wh; if(p.who==='one') p.customers=p.customers.slice(0,1); d(); });
        w.querySelectorAll('[data-rmp]').forEach(b=>b.onclick=()=>{ keep(); p.products=p.products.filter(n=>n!==b.dataset.rmp); d(); });
        const ap=w.querySelector('[data-addp]'); if(ap) ap.onchange=()=>{ const v=ap.value.trim(); if(v&&!p.products.includes(v)){ keep(); p.products.push(v); d(); w.querySelector('[data-addp]').focus(); } };
        w.querySelector('[data-pcgen]').onclick=()=>{ keep(); p.code=Math.random().toString(36).slice(2,8).toUpperCase(); d(); };
        w.querySelectorAll('[data-pcx]').forEach(b=>b.onclick=()=>w.remove());
        const del=w.querySelector('[data-pcdel]'); if(del) del.onclick=()=>{ if(!confirm('Delete '+p0.code+'? Past orders keep their discount.')) return; save(list().filter(x=>x.id!==p0.id)); w.remove(); draw(); };
        w.querySelector('[data-pcsave]').onclick=()=>{ keep(); const err=w.querySelector('[data-pcerr]'); p.code=p.code.toUpperCase().replace(/\s+/g,'');
          const bad=!/^[A-Z0-9-]{3,20}$/.test(p.code)?'Use 3–20 letters, numbers or dashes for the code.':list().some(x=>x.code===p.code&&(!p0||x.id!==p0.id))?'That code already exists.':p.type!=='delivery'&&!(p.value>0)?'Enter how much the code takes off.':p.type==='pct'&&p.value>100?'A percentage can’t be over 100.':p.who!=='all'&&!p.customers.length?'Choose at least one customer.':p.applies==='products'&&p.type!=='delivery'&&!p.products.length?'Add at least one product.':p.start&&p.end&&p.end<p.start?'The end date is before the start date.':'';
          if(bad){ err.textContent=bad; err.hidden=false; return; }
          const L=list(); if(p0){ const i=L.findIndex(x=>x.id===p0.id); L[i]=p; } else { p.id='pc'+Date.now().toString(36); L.unshift(p); } save(L); w.remove(); draw(); }; };
      d(); w.addEventListener('mousedown',e=>{ if(e.target===w) w.remove(); }); document.body.appendChild(w); setTimeout(()=>{ const c=w.querySelector('[data-f="code"]'); if(c&&!p0) c.focus(); },30); }
    draw();
    // customer names may arrive after the panel first draws
    if(!custs().length){ let n=0; const t=setInterval(()=>{ if(custs().length||++n>40){ clearInterval(t); if(custs().length&&el.isConnected) draw(); } },150); }
    window.addEventListener('ms-org-updated',()=>{ if(el.isConnected) draw(); }); }

  const css=`
  .pc-card{margin-top:22px;} .pc-card .card-h{display:flex;align-items:center;gap:10px;}
  .pc-tbl{border:1px solid var(--line-soft);border-radius:14px;overflow:hidden;background:#fff;margin-top:12px;}
  .pc-h,.pc-r{display:grid;grid-template-columns:minmax(110px,1fr) minmax(0,1.6fr) minmax(0,1.3fr) minmax(0,1.5fr) 64px 90px 40px;gap:10px;align-items:center;padding:11px 14px;}
  .pc-h{background:var(--paper-2,#f4f5f7);font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);} .pc-r{border-top:1px solid var(--line-soft);font-size:13px;} .pc-r>span{min-width:0;}
  .pc-r em{display:block;font-style:normal;font-size:11.5px;color:var(--muted);} .pc-lim{font-size:12px;color:var(--ink-3);}
  @media(max-width:1100px){.pc-h{display:none;} .pc-r{grid-template-columns:1fr 1fr;} }
  .pc-code{font:700 12.5px ui-monospace,Menlo,monospace;background:var(--tint-peri,#eceef9);color:var(--periwinkle-deep);border-radius:6px;padding:3px 8px;white-space:nowrap;}
  .pc-st{font-style:normal;font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 9px;white-space:nowrap;} .pc-st.on{background:#ecfdf3;color:#067647;} .pc-st.off{background:var(--paper-2,#f2f4f7);color:var(--ink-3);} .pc-st.sch{background:#eff8ff;color:#175cd3;}
  .pc-acts{display:flex;justify-content:flex-end;}
  .pc-scrim{position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:2000;display:grid;place-items:center;padding:16px;}
  .pc-modal{background:#fff;border-radius:16px;width:min(620px,100%);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(16,24,40,.3);}
  .pc-mh{display:flex;align-items:center;padding:16px 20px;border-bottom:1px solid var(--line-soft);} .pc-mh b{flex:1;font-size:18px;} .pc-x{border:0;background:none;font-size:24px;line-height:1;color:var(--muted);cursor:pointer;}
  .pc-body{padding:16px 20px;overflow:auto;display:flex;flex-direction:column;gap:14px;}
  .pc-f{display:flex;flex-direction:column;gap:6px;min-width:0;} .pc-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .pc-f small{font-size:12px;color:var(--muted);}
  .pc-f input,.pc-picks input{font:inherit;font-size:14px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;min-width:0;} .pc-f input:focus{outline:0;border-color:var(--periwinkle-deep);box-shadow:0 0 0 3px var(--tint-peri,#eceef9);}
  .pc-row{display:flex;gap:8px;align-items:center;} .pc-row input{flex:1;} .pc-row em{font-style:normal;color:var(--ink-3);font-size:13px;}
  .pc-seg{display:flex;flex-wrap:wrap;background:var(--paper-2,#f2f4f7);border-radius:10px;padding:3px;gap:2px;width:max-content;max-width:100%;} .pc-seg button{border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--ink-3);padding:6px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;} .pc-seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(16,24,40,.1);}
  .pc-picks{display:flex;flex-wrap:wrap;gap:6px;align-items:center;} .pc-picks span{display:inline-flex;align-items:center;gap:4px;background:var(--tint-peri,#eceef9);color:var(--periwinkle-deep);font-size:12.5px;font-weight:600;border-radius:999px;padding:3px 4px 3px 10px;} .pc-picks button{border:0;background:none;color:inherit;font-size:15px;cursor:pointer;line-height:1;}
  .pc-custs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:4px 12px;max-height:170px;overflow:auto;border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;} .pc-none{font-size:12.5px;color:var(--muted);} .pc-custs label{display:flex;gap:7px;align-items:center;font-size:13px;}
  .pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;} @media(max-width:560px){.pc-grid{grid-template-columns:1fr;}}
  .pc-chk{display:flex;gap:8px;align-items:center;font-size:13.5px;color:var(--ink-2);} .pc-chk input,.pc-custs input{accent-color:var(--periwinkle-deep);}
  .pc-uses{background:var(--paper,#f9fafb);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--ink-3);} .pc-uses b{color:var(--ink);font-size:13px;}
  .pc-err{margin:0;color:#b42318;font-size:13px;font-weight:600;} .pc-err[hidden]{display:none;}
  .pc-ft{display:flex;gap:8px;align-items:center;padding:14px 20px;border-top:1px solid var(--line-soft);} .pc-delb{color:#b42318!important;}
  .bk-promo{display:flex;align-items:center;gap:8px;background:#ecfdf3;border:1px solid #abefc6;border-radius:10px;padding:8px 10px;font-size:13px;color:#067647;} .bk-promo b{font-family:ui-monospace,Menlo,monospace;} .bk-promo span{flex:1;min-width:0;} .bk-promo button{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:#067647;text-decoration:underline;cursor:pointer;}
  .bk-promoerr{font-size:12.5px;color:#b42318;font-weight:600;margin:6px 0 0;}
  .bk-sr.promo span{color:#067647;font-weight:600;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {list,save,find,check,calc,applied,apply:setApplied,remove:()=>setApplied(''),record,describe,panel};
})();
