/* finance-integrations.js — Finance → Integrations (Oct 2026, PROTOTYPE: connections are simulated).
   Stripe (card payments via Stripe Connect, the distributor's own account) + accounting software
   (two-way sync for reconciliation). Store: ms-integrations {stripe:{…}, acct:{…}}, ms-int-sync {key:{st,at,ref,err}}.
   window.MSINT: tab(el) · stripe() · cardFee(method,amount) · feeLabel(method) · cardMethods() · acct() · provider()
                 sync(kind,key,issuedAt) → {st:'synced'|'pending'|'error'|'skipped', ref, err} · syncIcon(s) · payLink(no) · retry(key) */
window.MSINT=window.MSINT||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const J=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||d; }catch(e){ return d; } };
  const P=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const KEY='ms-integrations', SK='ms-int-sync';
  const PROV=[['xero','Xero','#13b5ea','The most popular cloud accounting app for UK small businesses. Making Tax Digital ready.'],
    ['sage','Sage Accounting','#00a650','Sage Business Cloud Accounting (Sage 50 via Sage’s cloud connector).'],
    ['qbo','QuickBooks Online','#2ca01c','Intuit QuickBooks Online, UK edition.'],
    ['freeagent','FreeAgent','#0b7a75','Popular with UK micro businesses, free with some business bank accounts.'],
    ['zoho','Zoho Books','#e42527','Zoho Books, UK edition, MTD ready.'],
    ['kashflow','KashFlow','#ff7a00','UK accounting for small businesses (part of IRIS).'],
    ['clearbooks','Clear Books','#2d5be3','UK online accounting, HMRC recognised.']];
  const DEF={stripe:{connected:true,acct:'acct_1Q9xMOJOdemo',mode:'test',at:'2026-09-01T10:00:00Z',methods:{cards:true,amex:true,wallets:true},statement:'MOJO PROMOTIONS',fee:{mode:'pass',uk:1.5,intl:3.0,fixed:0.20},links:true},
    acct:{provider:'xero',org:'Mojo Promotions Ltd',at:'2026-09-01T10:00:00Z',auto:true,from:'2026-07-01',numbering:'merchsmith',tracking:'project',push:{customers:true,invoices:true,credits:true,payments:true,bills:true,billPdf:true},pull:{payments:true,billPayments:true,contacts:false},
      map:{sales:'200 · Sales',delivery:'210 · Delivery income',purchases:'310 · Cost of goods sold',cardFees:'404 · Bank & card fees',bankCard:'090 · Stripe clearing',bankBacs:'091 · Barclays current account',vatStd:'20% (VAT on income)',vatZero:'Zero rated income',vatEx:'Exempt income'}}};
  const cfg=()=>{ const c=J(KEY,null)||{}; return {stripe:Object.assign({},DEF.stripe,c.stripe||{},{fee:Object.assign({},DEF.stripe.fee,(c.stripe||{}).fee||{}),methods:Object.assign({},DEF.stripe.methods,(c.stripe||{}).methods||{})}),acct:c.acct===null?null:Object.assign({},DEF.acct,c.acct||{},{map:Object.assign({},DEF.acct.map,(c.acct||{}).map||{}),push:Object.assign({},DEF.acct.push,(c.acct||{}).push||{}),pull:Object.assign({},DEF.acct.pull,(c.acct||{}).pull||{})})}; };
  const save=c=>P(KEY,c);
  const stripe=()=>cfg().stripe, acct=()=>cfg().acct, provider=()=>{ const a=acct(); return a&&a.provider?PROV.find(p=>p[0]===a.provider):null; };
  const on=()=>!!stripe().connected;
  // card fee charged to the customer at checkout (0 when the distributor absorbs it or Stripe isn't connected)
  function cardFee(method,amt){ const s=stripe(); if(!s.connected||s.fee.mode==='absorb'||method==='bacs') return 0; const pct=method==='noneu'?s.fee.intl:s.fee.uk; return Math.round(((+amt||0)*pct/100)*100)/100; }
  function feeLabel(method){ const s=stripe(); if(method==='bacs') return 'No fee'; if(s.fee.mode==='absorb') return 'No card fee'; return (method==='noneu'?s.fee.intl:s.fee.uk)+'% card fee'; }
  const cardMethods=()=>on();
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  function sync(kind,key,issued){ const a=acct(); if(!a||!a.provider) return null; const S=J(SK,{}), r=S[key];
    if(r) return r; if(issued&&a.from&&new Date(issued)<new Date(a.from)) return {st:'skipped'};
    const h=hash(key)%11, pref=a.provider==='xero'?'':a.provider.toUpperCase().slice(0,3)+'-';
    return h===3||h===9?{st:'error',err:kind==='bill'?'Supplier not found in '+provider()[1]+' · create the contact or map it':'VAT rate “Zero rated” isn’t mapped'}:h===7?{st:'pending'}:{st:'synced',ref:pref+key,at:issued||null}; }
  function syncIcon(s,prov){ if(!s) return ''; const P2=prov||provider(), n=P2?P2[1]:'accounts';
    const m={synced:['ok','✓','In '+n+(s.ref?' as '+s.ref:'')],pending:['wait','⟳','Waiting to send to '+n],error:['bad','!','Not sent to '+n+': '+(s.err||'error')],skipped:['skip','–','Before the sync start date, not sent']}[s.st];
    return `<span class="int-sy ${m[0]}" title="${esc(m[2])}" aria-label="${esc(m[2])}">${m[1]}</span>`; }
  function retry(key){ const S=J(SK,{}); S[key]={st:'synced',ref:key,at:new Date().toISOString(),retried:true}; P(SK,S); }
  const payLink=no=>'https://pay.merchsmith.com/mojo/'+encodeURIComponent(no);

  /* ---------- Integrations tab ---------- */
  function tab(el){ if(!el) return; const c=cfg(), s=c.stripe, a=c.acct, pv=provider();
    const tile=(p,big)=>`<span class="int-logo${big?' big':''}" style="background:${p[2]}">${esc(p[1].split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`;
    const sel=(k,v,opts)=>`<select class="int-in" data-am="${k}">${opts.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
    const errs=window.MSFINT&&a&&a.provider?[...MSFINT.custRows().map(r=>sync('inv',r.no,r.issued)),...MSFINT.supRows().filter(r=>r.inv&&r.ap).map(r=>sync('bill',r.po,r.inv.at))].filter(z=>z&&z.st==='error'):[];
    el.innerHTML=`<div class="int">
      <section class="card int-card"><div class="card-h"><h2>Card payments · Stripe</h2>${s.connected?`<span class="int-st ok">Connected${s.mode==='test'?' · test mode':''}</span>`:'<span class="int-st">Not connected</span>'}</div>
        <p class="lede">Customers pay by card at checkout and from a <b>Pay by card</b> link on any unpaid invoice. Payments go straight into your own Stripe account, and paid invoices update by themselves.</p>
        ${s.connected?`<div class="int-acc"><span class="int-logo big" style="background:#635bff">S</span><div><b>${esc(c.acct&&c.acct.org||'Mojo Promotions Ltd')}</b><span>${esc(s.acct)} · connected ${new Date(s.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span></div><div class="int-sp"></div><label class="int-tg"><span>Test mode</span><input type="checkbox" data-st="mode"${s.mode==='test'?' checked':''}></label><a class="int-lk" href="https://dashboard.stripe.com" target="_blank" rel="noopener">Stripe dashboard ↗</a><button type="button" class="int-lk dang" data-sdis>Disconnect</button></div>
          <div class="int-g3"><div class="int-blk"><h4>Accept</h4><label class="int-chk"><input type="checkbox" data-sm="cards"${s.methods.cards?' checked':''}> Visa, Mastercard and debit cards</label><label class="int-chk"><input type="checkbox" data-sm="amex"${s.methods.amex?' checked':''}> American Express</label><label class="int-chk"><input type="checkbox" data-sm="wallets"${s.methods.wallets?' checked':''}> Apple Pay and Google Pay</label></div>
            <div class="int-blk"><h4>Card fee</h4><div class="int-seg"><button type="button" class="${s.fee.mode==='pass'?'on':''}" data-fm="pass">Pass on to the customer</button><button type="button" class="${s.fee.mode==='absorb'?'on':''}" data-fm="absorb">We absorb it</button></div>
              ${s.fee.mode==='pass'?`<div class="int-fees"><label>UK / European cards <span><input class="int-in sm" type="number" step="0.1" min="0" data-ff="uk" value="${s.fee.uk}">%</span></label><label>Non UK / European cards <span><input class="int-in sm" type="number" step="0.1" min="0" data-ff="intl" value="${s.fee.intl}">%</span></label></div><p class="int-sm">Added to the total at checkout and on card payment links. Stripe charges you about 1.5% + 20p for UK cards, and 3.25% + 20p for international cards.</p>`:'<p class="int-sm">Customers pay the invoice amount only. Stripe’s fees come off your payout and are posted to your card fees account.</p>'}</div>
            <div class="int-blk"><h4>On statements</h4><input class="int-in" data-ss maxlength="22" value="${esc(s.statement)}"><p class="int-sm">Shown on the customer’s card statement (max 22 characters).</p><label class="int-chk"><input type="checkbox" data-sl${s.links?' checked':''}> Add a <b>Pay by card</b> link to invoices and reminders</label></div></div>`
          :`<div class="int-empty"><span class="int-logo big" style="background:#635bff">S</span><div><b>Connect your Stripe account</b><span>You’ll sign in to Stripe (or create an account) and come straight back. Until then, customers can pay by bank transfer or on account only.</span></div><button type="button" class="btn" data-scon>Connect Stripe</button></div>`}
      </section>
      <section class="card int-card"><div class="card-h"><h2>Accounting software</h2>${a&&pv?`<span class="int-st ok">${esc(pv[1])} connected</span>`:'<span class="int-st">Not connected</span>'}</div>
        <p class="lede">Two-way sync for reconciliation. Customers, invoices, credit notes, card payments and approved supplier bills go to your accounts as they happen. Payments you reconcile there come back and mark invoices paid here.</p>
        ${a&&pv?`<div class="int-acc">${tile(pv,1)}<div><b>${esc(a.org)}</b><span>${esc(pv[1])} · connected ${new Date(a.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span></div><div class="int-sp"></div><button type="button" class="btn ghost sm" data-anow>Sync now</button><button type="button" class="int-lk dang" data-adis>Disconnect</button></div>
          <div class="int-g2"><div class="int-blk"><h4>Send to ${esc(pv[1])}</h4>${[['customers','New customers as contacts'],['invoices','Customer invoices when they’re raised'],['credits','Credit notes, allocated to their invoice'],['payments','Card payments, with Stripe fees'],['bills','Supplier invoices as bills once approved'],['billPdf','Attach the supplier’s invoice PDF to the bill']].map(([k,l])=>`<label class="int-chk"><input type="checkbox" data-ap="${k}"${a.push[k]?' checked':''}> ${l}</label>`).join('')}
              <label class="int-chk"><input type="checkbox" data-aa${a.auto?' checked':''}> Send automatically (otherwise invoices wait in the sync log)</label></div>
            <div class="int-blk"><h4>Bring back from ${esc(pv[1])}</h4>${[['payments','Customer payments you reconcile there (marks invoices paid)'],['billPayments','Supplier bill payments (marks supplier invoices paid)'],['contacts','Contact and address changes']].map(([k,l])=>`<label class="int-chk"><input type="checkbox" data-al="${k}"${a.pull[k]?' checked':''}> ${l}</label>`).join('')}
              <div class="int-row"><label class="int-f"><span>Only sync from</span><input type="date" class="int-in" data-af value="${esc(a.from)}"></label><label class="int-f"><span>Invoice numbers</span><select class="int-in" data-an><option value="merchsmith"${a.numbering==='merchsmith'?' selected':''}>Keep Merchsmith numbers</option><option value="acct"${a.numbering==='acct'?' selected':''}>Use ${esc(pv[1])}’s numbering</option></select></label><label class="int-f"><span>Tracking category</span><select class="int-in" data-at><option value="project"${a.tracking==='project'?' selected':''}>Project</option><option value="customer"${a.tracking==='customer'?' selected':''}>Customer</option><option value="none"${a.tracking==='none'?' selected':''}>None</option></select></label></div></div></div>
          <div class="int-blk"><h4>Account mapping</h4><div class="int-map">${[['sales','Sales',['200 · Sales','201 · Sales · merchandise','260 · Other revenue']],['delivery','Delivery charges',['210 · Delivery income','200 · Sales']],['purchases','Supplier costs',['310 · Cost of goods sold','300 · Purchases']],['cardFees','Card fees',['404 · Bank & card fees','400 · Advertising']],['bankCard','Card payments into',['090 · Stripe clearing','091 · Barclays current account']],['bankBacs','Bank transfers into',['091 · Barclays current account','092 · Savings']],['vatStd','Standard rated VAT',['20% (VAT on income)']],['vatZero','Zero rated',['Zero rated income']],['vatEx','Exempt',['Exempt income','No VAT']]].map(([k,l,o])=>`<label class="int-f"><span>${l}</span>${sel(k,a.map[k],o)}</label>`).join('')}</div></div>`
          :`<div class="int-provs">${PROV.map(p=>`<button type="button" class="int-prov" data-acon="${p[0]}">${tile(p,1)}<span><b>${esc(p[1])}</b><small>${esc(p[3])}</small></span><em>Connect</em></button>`).join('')}</div>`}
      </section>
      ${a&&pv?`<section class="card int-card"><div class="card-h"><h2>Sync log</h2>${errs.length?`<span class="int-st bad">${errs.length} need attention</span>`:'<span class="int-st ok">All up to date</span>'}</div>
        <p class="lede">Anything that couldn’t be sent shows here and on its row in Customer and Supplier invoices. Fix the cause, then retry.</p>
        <div class="int-log" data-alog></div></section>`:''}
    </div>`;
    const c2=()=>cfg(), put=fn=>{ const x=c2(); fn(x); save(x); tab(el); };
    const q=s2=>el.querySelectorAll(s2), q1=s2=>el.querySelector(s2);
    const conn=(title,brand,col,done)=>{ const w=document.createElement('div'); w.className='int-scrim'; w.innerHTML=`<div class="int-modal"><span class="int-logo big" style="background:${col}">${esc(brand[0])}</span><b>Connecting to ${esc(brand)}…</b><span>You’d sign in to ${esc(brand)} and approve access for Merchsmith, then come straight back here.</span><div class="int-bar"><i></i></div></div>`; document.body.appendChild(w); setTimeout(()=>{ w.remove(); done(); },1600); };
    const sc=q1('[data-scon]'); if(sc) sc.onclick=()=>conn('Stripe','Stripe','#635bff',()=>put(x=>{ x.stripe=Object.assign({},x.stripe,{connected:true,acct:'acct_1Q9x'+Math.random().toString(36).slice(2,8),mode:'test',at:new Date().toISOString()}); }));
    const sd=q1('[data-sdis]'); if(sd) sd.onclick=()=>{ if(confirm('Disconnect Stripe? Customers won’t be able to pay by card until you reconnect.')) put(x=>{ x.stripe.connected=false; }); };
    q('[data-st="mode"]').forEach(i=>i.onchange=()=>put(x=>{ x.stripe.mode=i.checked?'test':'live'; }));
    q('[data-sm]').forEach(i=>i.onchange=()=>put(x=>{ x.stripe.methods[i.dataset.sm]=i.checked; }));
    q('[data-fm]').forEach(b=>b.onclick=()=>put(x=>{ x.stripe.fee.mode=b.dataset.fm; }));
    q('[data-ff]').forEach(i=>i.onchange=()=>put(x=>{ x.stripe.fee[i.dataset.ff]=Math.max(0,Math.min(10,+i.value||0)); }));
    const ss=q1('[data-ss]'); if(ss) ss.onchange=()=>put(x=>{ x.stripe.statement=ss.value.toUpperCase().slice(0,22); });
    const sl=q1('[data-sl]'); if(sl) sl.onchange=()=>put(x=>{ x.stripe.links=sl.checked; });
    q('[data-acon]').forEach(b=>b.onclick=()=>{ const p=PROV.find(z=>z[0]===b.dataset.acon); conn(p[1],p[1],p[2],()=>put(x=>{ x.acct=Object.assign({},DEF.acct,{provider:p[0],at:new Date().toISOString()}); })); });
    const ad=q1('[data-adis]'); if(ad) ad.onclick=()=>{ if(confirm('Disconnect '+pv[1]+'? Nothing already sent is removed from your accounts.')) put(x=>{ x.acct=null; }); };
    const an=q1('[data-anow]'); if(an) an.onclick=()=>{ an.textContent='Syncing…'; an.disabled=true; setTimeout(()=>{ const S=J(SK,{}); Object.keys(S).forEach(k=>{ if(S[k].st==='pending') S[k]={st:'synced',ref:k,at:new Date().toISOString()}; }); P(SK,S); tab(el); },900); };
    q('[data-ap]').forEach(i=>i.onchange=()=>put(x=>{ x.acct.push[i.dataset.ap]=i.checked; }));
    q('[data-al]').forEach(i=>i.onchange=()=>put(x=>{ x.acct.pull[i.dataset.al]=i.checked; }));
    const aa=q1('[data-aa]'); if(aa) aa.onchange=()=>put(x=>{ x.acct.auto=aa.checked; });
    const af=q1('[data-af]'); if(af) af.onchange=()=>put(x=>{ x.acct.from=af.value; });
    const anb=q1('[data-an]'); if(anb) anb.onchange=()=>put(x=>{ x.acct.numbering=anb.value; });
    const at=q1('[data-at]'); if(at) at.onchange=()=>put(x=>{ x.acct.tracking=at.value; });
    q('[data-am]').forEach(s2=>s2.onchange=()=>put(x=>{ x.acct.map[s2.dataset.am]=s2.value; }));
    // sync log: everything the tables would send
    const lg=q1('[data-alog]'); if(lg&&window.MSFINT){ const rows=[...MSFINT.custRows().map(r=>({k:r.no,kind:r.kind==='Credit note'?'Credit note':'Invoice',who:r.cust,amt:r.gross,at:r.issued,s:sync('inv',r.no,r.issued)})),...MSFINT.supRows().filter(r=>r.inv&&r.ap).map(r=>({k:r.po,kind:'Bill',who:r.sup,amt:+r.inv.amount||0,at:r.inv.at,s:sync('bill',r.po,r.inv.at)}))].filter(r=>r.s&&r.s.st!=='skipped').sort((x,y)=>({error:0,pending:1,synced:2}[x.s.st]-{error:0,pending:1,synced:2}[y.s.st])||new Date(y.at||0)-new Date(x.at||0));
      const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
      lg.innerHTML=rows.length?`<table class="int-tbl"><thead><tr><th></th><th>Record</th><th>Type</th><th>Customer / supplier</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>${rows.slice(0,40).map(r=>`<tr><td>${syncIcon(r.s,pv)}</td><td><b>${esc(r.k)}</b></td><td>${esc(r.kind)}</td><td>${esc(r.who)}</td><td class="r">${gbp(r.amt)}</td><td>${r.s.st==='error'?`<span class="int-err">${esc(r.s.err)}</span>`:r.s.st==='pending'?'Waiting to send':'In '+esc(pv[1])+(r.s.ref?' as '+esc(r.s.ref):'')}</td><td>${r.s.st!=='synced'?`<button type="button" class="btn ghost sm" data-aret="${esc(r.k)}">${r.s.st==='error'?'Retry':'Send now'}</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<p class="int-sm">Nothing to sync yet.</p>';
      lg.querySelectorAll('[data-aret]').forEach(b=>b.onclick=()=>{ retry(b.dataset.aret); tab(el); }); }
  }

  const css=`
  .int{display:flex;flex-direction:column;gap:22px;} .int-card{margin:0;} .int-st{font-size:12px;font-weight:800;border-radius:999px;padding:4px 10px;background:var(--g100,#f2f4f7);color:var(--g700,#344054);} .int-st.ok{background:#ecfdf3;color:#067647;} .int-st.bad{background:#fef3f2;color:#b42318;}
  .int-logo{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:9px;color:#fff;font-weight:800;font-size:13px;flex:none;} .int-logo.big{width:44px;height:44px;border-radius:12px;font-size:16px;}
  .int-acc,.int-empty{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--paper,#f6f5f2);border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;margin:6px 0 16px;} .int-acc>div:nth-child(2),.int-empty>div{display:flex;flex-direction:column;gap:2px;min-width:0;} .int-acc b,.int-empty b{font-size:14.5px;color:var(--ink);} .int-acc span,.int-empty span{font-size:12.5px;color:var(--muted);} .int-sp{flex:1;} .int-empty>div{flex:1;}
  .int-lk{font:inherit;font-size:13px;font-weight:700;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;text-decoration:none;} .int-lk.dang{color:#b42318;}
  .int-tg{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--ink-2);} .int-tg input{accent-color:var(--periwinkle-deep);width:16px;height:16px;}
  .int-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;} .int-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:14px;} @media(max-width:980px){.int-g3,.int-g2{grid-template-columns:1fr;}}
  .int-blk{border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;background:#fff;display:flex;flex-direction:column;gap:8px;} .int-blk h4{margin:0 0 2px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
  .int-chk{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--ink-2);line-height:1.4;} .int-chk input{accent-color:var(--periwinkle-deep);width:16px;height:16px;margin-top:2px;flex:none;}
  .int-seg{display:flex;background:var(--g100,#f2f4f7);border-radius:10px;padding:3px;} .int-seg button{flex:1;border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-3);padding:7px 8px;border-radius:8px;cursor:pointer;} .int-seg button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 3px rgba(16,24,40,.12);}
  .int-fees{display:flex;flex-direction:column;gap:6px;} .int-fees label{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--ink-2);} .int-fees span{display:inline-flex;align-items:center;gap:5px;font-weight:700;}
  .int-in{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:#fff;color:var(--ink);width:100%;} .int-in.sm{width:72px;text-align:right;}
  .int-sm{margin:0;font-size:12px;color:var(--muted);line-height:1.45;}
  .int-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:6px;} @media(max-width:760px){.int-row{grid-template-columns:1fr;}}
  .int-f{display:flex;flex-direction:column;gap:5px;min-width:0;} .int-f>span{font-size:12px;font-weight:700;color:var(--ink-2);}
  .int-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 14px;} @media(max-width:900px){.int-map{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .int-provs{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;} .int-prov{display:flex;align-items:center;gap:12px;text-align:left;border:1.5px solid var(--line-soft);background:#fff;border-radius:12px;padding:12px 14px;cursor:pointer;font:inherit;}
  .int-prov:hover{border-color:var(--periwinkle);} .int-prov>span{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;} .int-prov b{font-size:14px;color:var(--ink);} .int-prov small{font-size:12px;color:var(--muted);line-height:1.35;} .int-prov em{font-style:normal;font-size:12.5px;font-weight:800;color:var(--periwinkle-deep);}
  .int-tbl{width:100%;border-collapse:collapse;font-size:13px;} .int-tbl th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding:8px 10px;background:var(--paper);} .int-tbl td{padding:9px 10px;border-top:1px solid var(--paper-2,#f2f1ec);} .int-tbl .r{text-align:right;font-variant-numeric:tabular-nums;} .int-err{color:#b42318;font-weight:600;}
  .int-sy{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;font-size:11px;font-weight:800;cursor:help;flex:none;} .int-sy.ok{background:#ecfdf3;color:#067647;} .int-sy.wait{background:#eff8ff;color:#175cd3;} .int-sy.bad{background:#fef3f2;color:#b42318;} .int-sy.skip{background:var(--g100,#f2f4f7);color:var(--g500,#667085);}
  .int-scrim{position:fixed;inset:0;background:rgba(22,24,28,.45);z-index:2100;display:grid;place-items:center;} .int-modal{background:#fff;border-radius:16px;padding:26px 28px;width:min(400px,92vw);display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;box-shadow:0 24px 60px rgba(16,24,40,.3);} .int-modal b{font-size:16px;} .int-modal span{font-size:13px;color:var(--muted);}
  .int-bar{width:100%;height:5px;border-radius:5px;background:var(--g100,#f2f4f7);overflow:hidden;margin-top:6px;} .int-bar i{display:block;height:100%;width:40%;background:var(--periwinkle-deep);border-radius:5px;animation:intbar 1.2s ease-in-out infinite;} @keyframes intbar{0%{transform:translateX(-100%);}100%{transform:translateX(250%);}}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {tab,stripe,acct,provider,cardFee,feeLabel,cardMethods,sync,syncIcon,retry,payLink,PROV};
})();
