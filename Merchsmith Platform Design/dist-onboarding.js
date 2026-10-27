/* ============================================================
   dist-onboarding.js — Distributor onboarding (Merchsmith Distributor Onboarding.html)
   From the invitation email: owner details → company & billing → plan &
   payment (card via Stripe or Direct Debit) → brand → store domain →
   team → email sending domain → done, ending with "Meet your Merchsmith contact".
   Store stays offline until the required steps are done (MSDINV.REQ).
   Store: 'ms-donb' {distId:{steps:{k:{by,at,skipped}},started,finished,reminders,payment,domain}}
   URL: ?d=<distributorId> (defaults to the newest invited distributor)
   ============================================================ */
(function(){
  const A=window.ADMIN||{distributors:[],team:[]}, KEY='ms-donb';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const put=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){ alert('Couldn’t save: browser storage is full.'); } };
  const q=new URLSearchParams(location.search);
  const d=A.distributors.find(x=>x.id===q.get('d'))||A.distributors.find(x=>x.id===localStorage.getItem('ms-donb-latest'))||A.distributors.find(x=>x.status==='invited');
  const root=document.getElementById('dobRoot'); if(!d){ root.innerHTML='<main class="ob-main"><section class="ob-card"><h2>No invitation found</h2><p class="ob-lede">Open this page from a distributor invitation link. In the prototype, invite a distributor from Platform Admin → Distributors first.</p><div class="ob-row"><a class="ob-btn" href="Merchsmith Admin.html#nav=distributors">Go to Distributors</a></div></section></main>'; return; }
  const W0=d._wiz||{}, AD=window.MSADDR, N=window.MSNAME, REQ=(window.MSDINV&&MSDINV.REQ)||['you','company','plan','brand','domain'];
  const contact=(A.team||[]).find(u=>u.n===d.onboardingOwner)||(A.team||[])[0]||{n:'Merchsmith'};
  const owner={n:d.owner||[W0.first,W0.last].filter(Boolean).join(' '),email:d.ownerEmail||W0.email||'',tel:W0.tel||''};
  const brand=Object.assign({primary:'#4E5BA6',secondary:'#E8EAF6',accent:'#FF6A4D',ink:'#1E2033'},(d.brand&&d.brand.colours)||{});
  const o0=all(); o0[d.id]=o0[d.id]||{steps:{}}; if(!o0[d.id].started) o0[d.id].started=new Date().toISOString(); put(o0);
  const S=()=>all()[d.id];
  const mark=(k,skipped)=>{ const o=all(); o[d.id].steps[k]={by:owner.n,at:new Date().toISOString(),skipped:!!skipped}; put(o); };
  const setS=(k,v)=>{ const o=all(); o[d.id][k]=v; put(o); };
  const PLANS={Starter:['£250',3],Growth:['£750',10],Scale:['£1,200',99]};
  const slug=String(d.name||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').replace(/-?(ltd|limited|uk)$/,'');
  const STEPS=[['welcome','Welcome'],['you','Your details'],['company','Company & billing'],['plan','Plan & payment'],['brand','Brand'],['domain','Store domain'],['team','Your team'],['email','Email sending domain'],['finish','Done']];
  let i=Math.max(0,STEPS.findIndex(s=>!['welcome','finish'].includes(s[0])&&!S().steps[s[0]])); if(!S().steps.you) i=0;
  const W={pay:(S().payment||{}).method||'card',sub:(S().domain||{}).sub||slug,own:(S().domain||{}).own||'',team:[],plan:d.plan||'Growth'};
  const f=(k,l,v,o)=>`<label class="ob-f${o&&o.w?' w':''}"><span>${l}${o&&o.req?' <em>*</em>':''}</span><input data-o="${k}" value="${esc(v)}"${o&&o.type?` type="${o.type}"`:''} placeholder="${esc((o&&o.ph)||'')}"${o&&o.ro?' readonly':''}></label>`;
  const ROLES=[['Admin / Owner','Runs the account: billing, settings, team'],['Account Manager','Looks after customers, quotes and orders'],['Studio / Designer','Artwork and proofs'],['Production Manager','Suppliers, production and delivery'],['Finance User','Invoices, payments and credit terms sign-off']];
  function body(k){ const s=S();
    if(k==='welcome') return `<div class="ob-hero"><span class="ob-kick">Welcome to Merchsmith</span><h1>Let’s get ${esc(d.name)} live.</h1><p>You’re setting up your own branded merchandise platform: your store, your customers and your suppliers in one place. Setup takes about 15 minutes. Your store goes live once your details, plan and payment, brand and domain are done.</p>
      <div class="ob-note"><div class="ob-am"><span class="ob-av">${esc(contact.n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><div><b>${esc(contact.n)}</b><small>${esc(contact.title||'Merchsmith')} · your Merchsmith contact</small></div></div><p>“Welcome! I’ll help you get set up. You’ll find my details at the end if you’d like a call.”</p></div></div>`;
    if(k==='you') return `<h2>Your details</h2><p class="ob-lede">You’re the owner and first Admin for ${esc(d.name)}.</p><div class="ob-grid">${f('n','Full name',owner.n,{req:1,w:1})}${f('title','Job title','',{req:1})}${f('tel','Phone',owner.tel,{req:1,type:'tel'})}${f('email','Email',owner.email,{req:1,type:'email'})}</div>
      ${s.steps.you?'':`<div class="ob-grid">${f('p1','Password','',{req:1,type:'password'})}${f('p2','Confirm password','',{req:1,type:'password'})}</div><p class="ob-sm">At least 8 characters.</p>`}`;
    if(k==='company') return `<h2>Company & billing</h2><p class="ob-lede">Shown on your invoices to customers and on Merchsmith’s invoices to you.</p><div class="ob-grid">${f('cname','Company name',d.name,{req:1})}${f('legal','Legal name',d.legalName||'',{ph:'e.g. Brightside Promo Ltd'})}${f('cno','Company number',d.companyNo||'')}${f('vat','VAT number',d.vat||'')}</div><div class="ob-sub">Billing address</div><div data-addr>${AD?AD.fieldsHTML(AD.of(W0.addr&&AD.has(W0.addr)?W0.addr:d)):''}</div>`;
    if(k==='plan'){ const [pr,seats]=PLANS[W.plan]||PLANS.Growth, tr=+d.trialDays||0;
      return `<h2>Plan & payment</h2><p class="ob-lede">Merchsmith suggested the ${esc(d.plan||'Growth')} plan. You can change it here or later.</p>
      <div class="ob-plans">${Object.entries(PLANS).map(([p,[x,n]])=>`<button type="button" class="ob-plan${W.plan===p?' on':''}" data-plan="${p}"><b>${p}</b><span>${x} / month</span><small>${n>50?'Unlimited':'Up to '+n} seats</small></button>`).join('')}</div>
      <p class="ob-sm">Your first month (${pr}) is charged today, when you set up payment. After that you’re charged ${pr} monthly in advance on the ${new Date().getDate()}${['th','st','nd','rd'][((new Date().getDate()%100-20)%10+10)%10<4&&!(new Date().getDate()>10&&new Date().getDate()<14)?(new Date().getDate()%10):0]||'th'} of each month. 1 month minimum.</p>
      <div class="ob-sub">Payment method</div><div class="ob-seg"><button type="button" class="${W.pay==='card'?'on':''}" data-pay="card">Card</button><button type="button" class="${W.pay==='dd'?'on':''}" data-pay="dd">Direct Debit</button></div>
      ${W.pay==='card'?`<div class="ob-stripe"><div class="ob-grid">${f('cn','Card number','',{req:1,ph:'1234 1234 1234 1234',w:1})}${f('ce','Expiry','',{req:1,ph:'MM / YY'})}${f('cc','CVC','',{req:1,ph:'123'})}</div><small>Secured by Stripe · prototype, no card is charged</small></div>`
        :`<div class="ob-stripe"><div class="ob-grid">${f('an','Account holder','',{req:1,w:1})}${f('sc','Sort code','',{req:1,ph:'00-00-00'})}${f('ac','Account number','',{req:1,ph:'8 digits'})}</div><label class="ob-tog"><input type="checkbox" data-o="ddok"><span><b>I’m the account holder and can authorise Direct Debits on my own</b><small>Protected by the Direct Debit Guarantee · prototype, no mandate is created</small></span></label></div>`}
      <label class="ob-tog"><input type="checkbox" data-o="tcs"${S().terms?' checked':''}><span><b>I agree to the <a href="Merchsmith Page.html?p=terms" target="_blank">Merchsmith Terms &amp; Conditions</a></b><small>Minimum term of 1 month, charged from setup on day 1. Then charged 1 month in advance every month until cancelled.</small></span></label>`; }
    if(k==='brand') return `<h2>Your brand</h2><p class="ob-lede">This styles your whole platform: your store, your customers’ view and your emails.</p>
      <div class="ob-brand"><div><div class="dob-logos">${[['logoSq','Square logo','Lists, chat, avatars','sq'],['logoFull','Full logo','Header, store, PDFs','']].map(([key,l,h,c])=>{ const v=key==='logoSq'?(d.logoSq||(d.brand||{}).logoSq):((d.brand||{}).logoFull||d.logo); return `<div><div class="ob-sub">${l}</div><label class="ob-drop ${c}">${v?`<img src="${esc(v)}" alt="">`:'<span>Upload</span>'}<input type="file" accept="image/*" data-logo="${key}" hidden></label><small class="ob-sm">${h}</small></div>`; }).join('')}</div>
        ${d.logo?`<div class="ob-mono"><span class="lt"><img src="${esc(d.logo)}" alt=""></span><span class="dk"><img src="${esc(d.logo)}" alt=""></span><small>Mono versions, made from your logo</small></div>`:''}
        <div class="ob-sub">Colourway</div><div class="ob-cols">${[['primary','Primary'],['secondary','Secondary'],['accent','Accent'],['ink','Text']].map(([c,l])=>`<label class="ob-col"><span class="sw" style="background:${esc(brand[c])}"><input type="color" data-bc="${c}" value="${esc(brand[c])}"></span><b>${l}</b><code>${esc(brand[c].toUpperCase())}</code></label>`).join('')}</div></div>
        <div><div class="ob-sub">Preview</div><div class="ob-pv" data-pv>${pv()}</div></div></div>`;
    if(k==='domain') return `<h2>Your store address</h2><p class="ob-lede">Your customers will use this to reach your store. You can add your own domain now or later.</p>
      <label class="ob-f"><span>Merchsmith address <em>*</em></span><div class="ob-dom"><input data-o="sub" value="${esc(W.sub)}"><span>.merchsmith.shop</span></div></label><p class="ob-sm" data-subok></p>
      <div class="ob-sub">Your own domain <small>optional</small></div>${f('own','Domain',W.own,{ph:'shop.'+(d.domain||'yourcompany.co.uk').replace(/^shop\./,'')})}<p class="ob-sm">We’ll show you the DNS record to add. Your Merchsmith address keeps working until it’s connected.</p>`;
    if(k==='team') return `<h2>Invite your team</h2><p class="ob-lede">Each person is a seat on your plan. Add a Finance user so credit terms can be signed off.</p>
      ${(d.team||[]).concat(W.team).length?`<div class="ob-addrs">${(d.team||[]).concat(W.team).map(u=>`<div class="ob-addr"><b>${esc(u.email)}</b><span>${esc(u.role)} · invited</span></div>`).join('')}</div>`:''}
      <div class="ob-grid ob-inv">${f('ie','Email','',{type:'email'})}<label class="ob-f"><span>Role</span><select data-o="ir">${ROLES.map(([r])=>`<option>${r}</option>`).join('')}</select></label><button class="ob-btn ghost" data-invite>Invite</button></div><p class="ob-err" data-ierr hidden></p>
      <div class="ob-roles">${ROLES.map(([r,x])=>`<div class="ob-role"><b>${r}</b><small>${x}</small></div>`).join('')}</div>`;
    if(k==='email'){ const dm=(d.domain||slug+'.co.uk').replace(/^shop\./,''); return `<h2>Email sending domain</h2><p class="ob-lede">Send order, proof and invoice emails from your own address instead of Merchsmith’s. You can skip this and do it later in Emails.</p>
      <div class="ob-dns">${[['TXT','@','v=spf1 include:spf.merchsmith-mail.com ~all'],['CNAME','ms1._domainkey','ms1.dkim.merchsmith-mail.com'],['CNAME','ms2._domainkey','ms2.dkim.merchsmith-mail.com'],['TXT','_dmarc','v=DMARC1; p=none']].map(([t,h,v])=>`<div><span>${t}</span><b>${h}</b><code>${v}</code></div>`).join('')}</div><p class="ob-sm">Add these where you manage ${esc(dm)}, then continue. We’ll check them in the background.</p>`; }
    const ready=REQ.every(x=>s.steps[x]);
    return `<div class="ob-hero"><span class="ob-kick">${ready?'You’re live':'Nearly there'}</span><h1>${ready?esc(d.name)+' is live.':'A few steps left before you go live.'}</h1>
      <p>${ready?'Your store is live at <b>'+esc(W.sub)+'.merchsmith.shop</b>'+(W.own?' (and '+esc(W.own)+' once DNS is connected)':'')+'. Next: add products to your range and invite your first customers.':'Your store stays offline until owner details, company, plan and payment, brand and domain are done.'}</p>
      <ul class="ob-sum">${STEPS.filter(x=>!['welcome','finish'].includes(x[0])).map(([x,l])=>{ const v=s.steps[x]; return `<li class="${v&&!v.skipped?'ok':''}"><i>${v&&!v.skipped?'✓':''}</i>${l}${v&&v.skipped?' <small>skipped</small>':''}</li>`; }).join('')}</ul>
      <div class="ob-row"><a class="ob-btn" href="Merchsmith Home.html">Go to your dashboard</a><a class="ob-btn ghost" href="Merchsmith Distributor Settings.html#tab=storerange">Build your product range</a></div>
      <div class="ob-note big"><span class="ob-kick">Meet your Merchsmith contact</span><div class="ob-am"><span class="ob-av">${esc(contact.n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><div><b>${esc(contact.n)}</b><small>${esc(contact.title||'')} · Merchsmith</small></div></div><p>“Book a call and I’ll walk you through building your range and inviting customers.”</p>
        <div class="ob-row"><a class="ob-btn" href="Merchsmith Calendar.html#tab=cal">Book a call</a>${contact.email?`<a class="ob-btn ghost" href="mailto:${esc(contact.email)}">Email ${esc(contact.n.split(' ')[0])}</a>`:''}</div></div></div>`; }
  function pv(){ return `<div class="pvh" style="background:${esc(brand.primary)}">${d.logo?`<img src="${esc(d.logo)}" alt="">`:`<b>${esc(d.name)}</b>`}<i></i><i></i></div><div class="pvb" style="background:${esc(brand.secondary)};color:${esc(brand.ink)}"><span class="pvbd" style="background:${esc(brand.accent)}">New</span><h5 style="color:${esc(brand.ink)}">Branded merch, sorted.</h5><p>${esc(d.name)} store</p><span class="pvbt" style="background:${esc(brand.primary)}">Shop products</span></div>`; }
  const g=k=>{ const e=root.querySelector(`[data-o="${k}"]`); return e?(e.type==='checkbox'?e.checked:e.value.trim()):''; };
  const E=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function val(k){ if(k==='you'){ const np=N?N.parts(root.querySelector('[data-o="n"]')):{}; if(N&&(!np.firstName||!np.lastName)) return 'Add your first and last name.'; if(!g('title')) return 'Add your job title.'; if(g('tel').replace(/\D/g,'').length<7) return 'Add a phone number.'; if(!E.test(g('email'))) return 'Add a valid email.'; if(!S().steps.you){ if(g('p1').length<8) return 'Your password needs at least 8 characters.'; if(g('p1')!==g('p2')) return 'The passwords don’t match.'; } }
    if(k==='company'){ if(!g('cname')) return 'Add your company name.'; if(AD){ const e=AD.validate(AD.read(root.querySelector('[data-addr]')),'Billing address'); if(e.length) return e[0].charAt(0).toUpperCase()+e[0].slice(1); } }
    if(k==='plan'){ if(!g('tcs')) return 'Please agree to the Terms & Conditions to continue.'; if(W.pay==='card'){ if(g('cn').replace(/\D/g,'').length<15) return 'Enter the card number.'; if(!/^\d{2}\s*\/\s*\d{2}$/.test(g('ce'))) return 'Enter the expiry as MM / YY.'; if(!/^\d{3,4}$/.test(g('cc'))) return 'Enter the CVC.'; } else { if(!g('an')) return 'Add the account holder.'; if(g('sc').replace(/\D/g,'').length!==6) return 'The sort code should be 6 digits.'; if(g('ac').replace(/\D/g,'').length!==8) return 'The account number should be 8 digits.'; if(!g('ddok')) return 'Confirm you can authorise the Direct Debit.'; } }
    if(k==='domain'){ if(!/^[a-z0-9](?:[a-z0-9-]{1,40}[a-z0-9])$/.test(W.sub)) return 'Use 3–42 lowercase letters, numbers or hyphens for your address.'; if(A.distributors.some(x=>x.id!==d.id&&String(x.domain||'').startsWith(W.sub+'.'))) return W.sub+' is taken. Try another.'; if(W.own&&!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(W.own)) return 'That domain doesn’t look right.'; }
    return ''; }
  function saveStep(k){ if(k==='you'){ d.owner=g('n'); d.ownerEmail=g('email'); d.ownerTitle=g('title'); d.ownerTel=g('tel'); }
    if(k==='company'){ Object.assign(d,{name:g('cname'),legalName:g('legal'),companyNo:g('cno'),vat:g('vat')},AD?Object.assign(AD.read(root.querySelector('[data-addr]')),{address:AD.text(AD.read(root.querySelector('[data-addr]')))}):{}); }
    if(k==='plan'){ d.plan=W.plan; setS('terms',{accepted:true,by:owner.n,at:new Date().toISOString(),version:'2026-09',minMonths:1,billing:'monthly in advance from day 1'}); setS('payment',W.pay==='card'?{method:'card',last4:g('cn').replace(/\D/g,'').slice(-4),at:new Date().toISOString()}:{method:'dd',last4:g('ac').slice(-4),at:new Date().toISOString()}); }
    if(k==='brand'){ d.brand=Object.assign({},d.brand||{},{colours:Object.assign({},brand)}); }
    if(k==='domain'){ setS('domain',{sub:W.sub,own:W.own}); }
    try{ const s=JSON.parse(localStorage.getItem('ms-dist-new')||'{}'); const r=(s.items||[]).find(x=>x.id===d.id); if(r){ Object.assign(r,d); localStorage.setItem('ms-dist-new',JSON.stringify(s)); } }catch(e){} }
  function finish(){ const o=all(), s=o[d.id]; if(REQ.every(x=>s.steps[x])&&!s.finished){ s.finished=new Date().toISOString(); put(o); d.status='active';
      try{ const x=JSON.parse(localStorage.getItem('ms-dist-new')||'{}'); const r=(x.items||[]).find(y=>y.id===d.id); if(r){ r.status='active'; r.domain=W.sub+'.merchsmith.shop'; localStorage.setItem('ms-dist-new',JSON.stringify(x)); } }catch(e){}
      try{ if(window.MSNOTIF) MSNOTIF.push('admin',{ev:'dist_new',title:d.name+' is live',body:'Onboarding finished by '+owner.n+'. Plan: '+d.plan+'. Onboarding owner: '+contact.n+'.',href:'Merchsmith Admin.html#nav=distributors'}); }catch(e){} } }
  function draw(){ const [k,label]=STEPS[i], n=STEPS.length-1, first=i===0, last=k==='finish', opt=k==='team'||k==='email';
    document.documentElement.style.setProperty('--ob-p',brand.primary); document.documentElement.style.setProperty('--ob-s',brand.secondary);
    root.innerHTML=`<header class="ob-top"><div class="ob-brand-l">${d.logo?`<img src="${esc(d.logo)}" alt="${esc(d.name)}">`:`<b>${esc(d.name)}</b>`}</div>${last?'':`<div class="ob-steps"><span>${first?'Getting started':'Step '+i+' of '+(n-1)+' · '+esc(label)}</span><div class="ob-bar"><i style="width:${Math.round(i/n*100)}%"></i></div></div>`}<span class="ob-by">Powered by Merchsmith</span></header>
      <main class="ob-main"><section class="ob-card">${body(k)}<p class="ob-err" data-err hidden></p></section></main>
      ${last?'':`<footer class="ob-foot"><div class="ob-foot-in">${first?'<span></span>':'<button class="ob-btn ghost" data-back>Back</button>'}<span class="ob-fill"></span>${opt?'<button class="ob-link" data-skip>Skip for now</button>':''}<button class="ob-btn" data-next>${first?'Accept invitation':k==='plan'?(W.pay==='card'?'Save card':'Set up Direct Debit'):k==='email'?'I’ve added these':'Continue'}</button></div></footer>`}`;
    wire(k); scrollTo(0,0); }
  const err=t=>{ const e=root.querySelector('[data-err]'); e.hidden=!t; e.textContent=t||''; };
  function go(x){ i=Math.max(0,Math.min(STEPS.length-1,i+x)); if(STEPS[i][0]==='finish') finish(); draw(); }
  function wire(k){ const $=s=>root.querySelector(s); if(AD) AD.wire(root);
    const nm=$('[data-o="n"]'); if(nm&&N) N.upgrade(nm,{cls:'ob-f'});
    root.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{ W.plan=b.dataset.plan; draw(); });
    root.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>{ W.pay=b.dataset.pay; draw(); });
    const sb=$('[data-o="sub"]'); if(sb){ const chk=()=>{ W.sub=sb.value.toLowerCase().replace(/[^a-z0-9-]/g,''); const ok=$('[data-subok]'); ok.textContent=W.sub?'Your store: '+W.sub+'.merchsmith.shop':''; }; sb.oninput=chk; chk(); }
    const ow=$('[data-o="own"]'); if(ow) ow.oninput=()=>W.own=ow.value.trim().toLowerCase();
    root.querySelectorAll('[data-logo]').forEach(lg=>lg.onchange=()=>{ const fl=lg.files[0]; if(!fl) return; if(fl.size>1.5*1048576) return err('That image is over 1.5 MB.'); const r=new FileReader(); r.onload=()=>{ const key=lg.dataset.logo; d.brand=Object.assign({},d.brand||{},{[key]:r.result}); if(key==='logoSq') d.logoSq=r.result; d.logo=d.brand.logoFull||d.brand.logoSq||r.result; try{ saveStep('brand'); }catch(e){} draw(); }; r.readAsDataURL(fl); });
    root.querySelectorAll('[data-bc]').forEach(inp=>inp.oninput=()=>{ brand[inp.dataset.bc]=inp.value; inp.parentElement.style.background=inp.value; inp.closest('.ob-col').querySelector('code').textContent=inp.value.toUpperCase(); $('[data-pv]').innerHTML=pv(); document.documentElement.style.setProperty('--ob-p',brand.primary); });
    const iv=$('[data-invite]'); if(iv) iv.onclick=()=>{ const e=g('ie'), ie=$('[data-ierr]'); if(!E.test(e)){ ie.hidden=false; ie.textContent='Enter a valid email.'; return; }
      if((d.team||[]).concat(W.team).some(u=>u.email.toLowerCase()===e.toLowerCase())||e.toLowerCase()===owner.email.toLowerCase()){ ie.hidden=false; ie.textContent=e+' is already on your team.'; return; }
      const [pr,seats]=PLANS[W.plan]||PLANS.Growth; if(1+(d.team||[]).length+W.team.length>=seats){ ie.hidden=false; ie.textContent='Your '+W.plan+' plan includes '+seats+' seats. Change plan to add more.'; return; }
      W.team.push({email:e,role:g('ir'),status:'invited'}); d.team=(d.team||[]).concat([{n:e.split('@')[0],email:e,role:g('ir'),status:'invited'}]); W.team=[]; saveStep('team'); draw(); };
    const bk=$('[data-back]'); if(bk) bk.onclick=()=>go(-1);
    const sk=$('[data-skip]'); if(sk) sk.onclick=()=>{ mark(k,true); go(1); };
    const nx=$('[data-next]'); if(nx) nx.onclick=()=>{ const e=val(k); if(e) return err(e); if(k!=='welcome') saveStep(k); if(k!=='welcome') mark(k,false); go(1); }; }
  draw();
})();
