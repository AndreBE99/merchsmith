/* ============================================================
   onboarding.js — Customer onboarding (Merchsmith Customer Onboarding.html)
   One flow from the invitation email: accept → set up → first project.
   Full-screen steps with a progress bar, wearing the customer's own brand.

   Who does what: personal steps for everyone; organisation steps (org,
   brand, delivery, billing, terms, team) only for the main contact / Admins.
   Ordering is blocked for the whole organisation until every org step is
   done (MSONB.orgReady(orgId)) — Basket shows why and who needs to finish.
   Brand changes apply straight away and notify the account manager.

   Store: 'ms-onboard-v2' {orgs:{id:{steps:{k:{by,at,skipped}},started,finished,reminders:[]}},
                            users:{orgId|userKey:{steps:{…}}}}
   URL: ?org=<customerId>&u=<email or name>  (defaults to the newest invited customer, else Citrix)
   window.MSONB: orgReady(id) · progress(id) · state(id) · ORG_STEPS · remind(id)
   ============================================================ */
window.MSONB=window.MSONB||(function(){
  const KEY='ms-onboard-v2', D=()=>window.ORG_DATA||{customers:[]};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const db=()=>{ try{ return Object.assign({orgs:{},users:{}},JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return {orgs:{},users:{}}; } };
  const save=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){ alert('Couldn’t save: this browser’s storage is full.'); } };
  const ORG_STEPS=[['org','Organisation details'],['brand','Brand'],['delivery','Delivery addresses'],['billing','Billing & invoices'],['terms','Account terms'],['team','Your team']];
  const state=id=>db().orgs[id]||{steps:{}};
  // seeded customers that were already live before onboarding existed count as set up
  const legacy=id=>{ const c=D().customers.find(x=>x.id===id); return !!c&&!c._wiz&&c.status==='active'; };
  const orgReady=id=>legacy(id)||ORG_STEPS.every(([k])=>state(id).steps[k]);
  const progress=id=>{ if(legacy(id)) return 100; const s=state(id).steps; return Math.round(ORG_STEPS.filter(([k])=>s[k]).length/ORG_STEPS.length*100); };
  function remind(id,auto){ const o=db(); const s=o.orgs[id]=o.orgs[id]||{steps:{}}; (s.reminders=s.reminders||[]).push({at:new Date().toISOString(),auto:!!auto}); save(o);
    const c=D().customers.find(x=>x.id===id); try{ const k='ms-email-v1', e=JSON.parse(localStorage.getItem(k)||'{}'); if(e.sent&&e.sent.mojo&&c){ const u=mainOf(c);
      e.sent.mojo.unshift({id:'r'+Date.now().toString(36),tpl:'invite',to:{name:u?u.n:'',org:c.name,email:u?u.email:''},at:new Date().toISOString(),status:'delivered',thread:{type:'org',label:c.name+' · onboarding reminder',href:'Merchsmith Customer Onboarding.html?org='+id},replies:[]}); localStorage.setItem(k,JSON.stringify(e)); } }catch(x){} }
  const mainOf=c=>{ const L=(c.teams||[]).flatMap(t=>t.users||[]); return L.find(u=>u.n===c.contactName)||L.find(u=>u.main)||L.find(u=>u.role==='Admin')||L[0]; };

  function mount(root){
    const q=new URLSearchParams(location.search), all=D().customers;
    const c=all.find(x=>x.id===q.get('org'))||all.find(x=>x.id===localStorage.getItem('ms-cust-onboard-latest'))||all.find(x=>x.id==='citrix')||all[0];
    if(!c){ root.innerHTML='<p>No customer found.</p>'; return; }
    const people=(c.teams||[]).flatMap(t=>t.users||[]), uq=String(q.get('u')||'').toLowerCase();
    const user=people.find(u=>String(u.email||'').toLowerCase()===uq||String(u.n||'').toLowerCase()===uq)||mainOf(c)||{n:'',role:'Admin'};
    const isOrg=user===mainOf(c)||/admin/i.test(user.role||''), canOrder=/admin|buyer/i.test(user.role||'');
    const P=window.MSPEOPLE, A=window.MSADDR, N=window.MSNAME, AM=window.MSAM&&(MSAM.getUser(c.id,user)||MSAM.get(c.id));
    const ukey=c.id+'|'+String(user.email||user.n).toLowerCase();
    const brand=Object.assign({primary:'#4E5BA6',secondary:'#E8EAF6',accent:'#FF6A4D',ink:'#1E2033'},(function(){ const cs=getComputedStyle(document.documentElement), g=v=>(cs.getPropertyValue(v)||'').trim(); const o={}; [['primary','--periwinkle-deep'],['secondary','--tint-peri'],['accent','--flare'],['ink','--ink']].forEach(([k,v])=>{ if(g(v)) o[k]=g(v); }); return o; })());
    const logo=()=>(c.brand&&(c.brand.logoFull||c.brand.logoSq))||c.logo||'';
    const o0=db(); o0.orgs[c.id]=o0.orgs[c.id]||{steps:{}}; if(!o0.orgs[c.id].started) o0.orgs[c.id].started=new Date().toISOString(); o0.users[ukey]=o0.users[ukey]||{steps:{}}; save(o0);
    const mark=(k,org,skipped)=>{ const o=db(); const tgt=org?o.orgs[c.id]:o.users[ukey]; tgt.steps[k]={by:user.n,at:new Date().toISOString(),skipped:!!skipped}; save(o); if(org&&window.MSNOTES) try{ MSNOTES.log('org:'+c.id,'onboarding',user.n+(skipped?' skipped ':' completed ')+'“'+(ORG_STEPS.find(s=>s[0]===k)||[0,k])[1]+'”'); }catch(e){} };
    const done=(k,org)=>!!(org?state(c.id).steps[k]:(db().users[ukey]||{steps:{}}).steps[k]);
    const notifyAM=(title,body)=>{ try{ if(window.MSNOTIF) MSNOTIF.push('distributor',{ev:'cust_new',title,body,href:'Merchsmith Organisations.html#org='+c.id}); }catch(e){} };

    // [key, label, org-only, required]
    const STEPS=[['welcome','Welcome',0,0],['you','Your details',0,1],['notify','Notifications',0,0],
      ...(isOrg?[['org','Organisation',1,1],['brand','Brand',1,1],['delivery','Delivery addresses',1,1],['billing','Billing & invoices',1,1],['terms','Account terms',1,1],['team','Your team',1,1]]:[]),
      ['tour','Store tour',0,0],['finish','Done',0,0]];
    let i=Math.max(0,STEPS.findIndex(s=>s[0]!=='welcome'&&s[0]!=='finish'&&!done(s[0],s[2]))); if(i<0) i=0; if(!done('welcome',0)&&!done('you',0)) i=0;
    let W={}, tourI=0;
    const addrs=()=>P&&P.addrBook?P.addrBook(c):(c.addresses||[]);
    const fld=(id,l,v,o)=>`<label class="ob-f${o&&o.w?' w':''}"><span>${l}${o&&o.req?' <em>*</em>':''}</span>${o&&o.area?`<textarea data-o="${id}" rows="3" placeholder="${esc(o.ph||'')}">${esc(v)}</textarea>`:`<input data-o="${id}" value="${esc(v)}"${o&&o.type?` type="${o.type}"`:''} placeholder="${esc((o&&o.ph)||'')}">`}</label>`;
    const sel=(id,l,v,L)=>`<label class="ob-f"><span>${l}</span><select data-o="${id}">${L.map(x=>`<option${x===v?' selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
    const tog=(id,l,s,on)=>`<label class="ob-tog"><input type="checkbox" data-o="${id}"${on?' checked':''}><span><b>${l}</b>${s?`<small>${s}</small>`:''}</span></label>`;
    const amCard=()=>AM?`<div class="ob-am"><span class="ob-av">${P?P.avHTML({n:AM.n}):esc(AM.n[0])}</span><div><b>${esc(AM.n)}</b><small>${esc(AM.title||'Account Manager')} · Mojo Promotions</small></div></div>`:'';

    const ROLES=[['Admin','Runs your organisation’s account',['Everything a Buyer and Approver can do','Invite people and change their roles','Edit organisation details, brand and addresses','See invoices and account terms'],[]],
      ['Buyer','Orders for the team',['Place orders and request quotes','Start projects and add delivery addresses','Approve proofs on their own projects','See invoices for their orders'],['Can’t manage people or settings']],
      ['Approver','Signs off artwork and spend',['Approve or reject proofs','Approve orders before they’re placed','Comment on any project'],['Can’t place orders','Can’t manage people or settings']],
      ['Finance','Looks after invoices and payment',['Receives invoices for the organisation','See invoices, statements and account terms','Upload purchase orders'],['Can’t place orders','Can’t manage people or settings']],
      ['Viewer','Keeps an eye on things',['See projects, proofs and order tracking','Comment on projects'],['Can’t order or approve','Can’t see invoices or terms']]];
    function body(k){ const bill=A?A.of(c):{};
      if(k==='welcome') return `<div class="ob-hero"><span class="ob-kick">Welcome to your store</span><h1>Hi ${esc(N?N.greet(user):String(user.n).split(' ')[0])}, let’s get ${esc(c.name)} set up.</h1>
        <p>Mojo Promotions has set up a store for ${esc(c.name)} where you can order branded merchandise, approve proofs and track deliveries.${isOrg?' As the main contact you’ll confirm a few details for your organisation. It takes about 10 minutes.':' It takes about 2 minutes.'}</p>
        ${AM?`<div class="ob-note">${amCard()}<p>“Welcome aboard! I’ll be looking after ${esc(c.name)}. If anything here doesn’t look right, message me any time.”</p></div>`:''}</div>`;
      if(k==='you') return `<h2>Your details</h2><p class="ob-lede">These are shown to your team and to Mojo Promotions.</p>
        <div class="ob-avrow"><span class="ob-av lg" data-av>${P?P.avHTML(user):''}</span><label class="ob-btn ghost">Add a photo<input type="file" accept="image/*" data-photo hidden></label></div>
        <div class="ob-grid">${fld('n','Full name',user.n,{req:1,w:1})}${fld('title','Job title',user.title||'',{req:1})}${fld('tel','Phone',user.tel||'',{type:'tel',req:1})}${fld('email','Email',user.email||'',{type:'email',req:1})}</div>
        ${done('you',0)?'':`<div class="ob-grid">${fld('p1','Password',W.p1||'',{req:1,type:'password'})}${fld('p2','Confirm password',W.p2||'',{req:1,type:'password'})}</div><p class="ob-sm">At least 8 characters.</p>`}`;
      if(k==='notify') return `<h2>How should we keep you posted?</h2><p class="ob-lede">You can change these any time in your profile.</p>
        <div class="ob-togs">${tog('n_proof','Proofs ready to approve','So nothing holds up your order',1)}${tog('n_order','Order updates','Dispatched, delivered or delayed',1)}${tog('n_invoice','Invoices',canOrder?'New and overdue invoices':'',canOrder)}${tog('n_chat','Messages from Mojo','Chat and @mentions',1)}${tog('n_digest','One daily summary email instead of individual emails','',0)}</div>`;
      if(k==='org') return `<h2>Organisation details</h2><p class="ob-lede">Mojo Promotions filled these in. Check they’re right. This is also your billing address.</p>
        <div class="ob-grid">${fld('name','Organisation name',c.name,{req:1})}${fld('website','Website',c.website||c.domain||'')}${fld('companyNo','Company number',c.companyNo||'')}${fld('vatNo','VAT number',c.vatNo||c.vat||'')}</div>
        <div class="ob-sub">Billing address</div><div data-bill>${A?A.fieldsHTML(bill):''}</div>`;
      if(k==='brand'){ const b=c.brand||{}; return `<h2>Your brand</h2><p class="ob-lede">This is how your store looks. Mojo Promotions set it up; change anything that isn’t right. ${AM?esc(AM.n.split(' ')[0])+' will be told about any changes.':''}</p>
        <div class="ob-brand"><div><div class="ob-sub">Logo</div><div class="ob-logos"><label class="ob-drop">${logo()?`<img src="${esc(logo())}" alt="">`:'<span>Upload logo</span>'}<input type="file" accept="image/*" data-blogo hidden></label>
            <div class="ob-mono"><span class="lt">${logo()?`<img src="${esc(b.mono==='upload'&&b.logoMono?b.logoMono:logo())}" alt="">`:'Mono'}</span><span class="dk">${logo()?`<img src="${esc(b.mono==='upload'&&b.logoMono?b.logoMono:logo())}" alt="">`:'Mono'}</span><small>Mono version, made from your logo</small></div></div>
          </div>
          <div><div class="ob-sub">Preview</div><div class="ob-pv" data-pv>${pv()}</div></div></div>`; }
      if(k==='delivery'){ const L=addrs(); return `<h2>Delivery addresses</h2><p class="ob-lede">Where your orders go. Anyone who can order can add more later at checkout.</p>
        <div class="ob-addrs">${L.map((a,j)=>`<div class="ob-addr"><b>${esc(a.title||'Address '+(j+1))}${a.isDefault?' <em>Default</em>':''}</b><span>${esc(A?A.text(a):a.address||'')}</span></div>`).join('')||'<p class="ob-sm">No delivery addresses yet.</p>'}</div>
        <details class="ob-add"${L.length?'':' open'}><summary>+ Add a delivery address</summary><div class="ob-grid">${fld('atitle','Name for this address',W.atitle||'',{ph:'e.g. Leeds office',w:1})}</div><div data-newaddr>${A?A.fieldsHTML({}):''}</div><button class="ob-btn ghost" data-addaddr>Save address</button></details>`; }
      if(k==='billing') return `<h2>Billing & invoices</h2><p class="ob-lede">Who should invoices go to, and is there anything we need to put on them?</p>
        <div class="ob-grid">${fld('bname','Billing contact',c.billingContact||'',{req:1,ph:'e.g. Accounts team'})}${fld('bemail','Invoice email',c.billingEmail||'',{req:1,type:'email',ph:'accounts@'+(c.domain||'company.com')})}</div>
        ${tog('po','We need a purchase order (PO) number on every order','Buyers will be asked for it at checkout',!!c.poRequired)}
        ${fld('binv','Anything else for invoices',c.invoiceNotes||'',{area:1,w:1,ph:'e.g. Include cost centre, send PDF only'})}`;
      if(k==='terms'){ const T=window.MSTERMS&&MSTERMS.pending(c.id); return `<h2>Your account terms</h2><p class="ob-lede">Agreed with Mojo Promotions. Talk to ${AM?esc(AM.n.split(' ')[0]):'your account manager'} if anything needs changing.</p>
        <div class="ob-terms">${[['Discount',c.discountGroup||c.standingDiscount||'Standard'],['Payment terms',c.paymentTerms||'Payment on order'],['Credit limit',c.creditLimit||'None'],['VAT',c.vat===false?'Doesn’t apply':'Applies']].map(([l,v])=>`<div><span>${l}</span><b>${esc(v)}</b></div>`).join('')}</div>
        ${T?`<div class="ob-info">${esc(T.requested.payment)}${T.requested.credit?' with a '+esc(T.requested.credit)+' credit limit':''} is being reviewed by Mojo’s finance team. You’ll hear when it’s agreed.</div>`:''}`; }
      if(k==='team'){ const L=people.filter(u=>u!==user); return `<h2>Invite your team</h2><p class="ob-lede">Add colleagues who order, approve proofs or just need to see what’s happening.</p>
        ${L.length?`<div class="ob-addrs">${L.map(u=>`<div class="ob-addr"><b>${esc(u.n)}</b><span>${esc(u.role)} · ${esc(u.email||'')} · ${esc(u.status==='invited'?'Invited':'Joined')}</span></div>`).join('')}</div>`:''}
        <div class="ob-grid ob-inv">${fld('ie','Email',W.ie||'',{type:'email'})}${sel('ir','Role',W.ir||'Buyer',['Admin','Buyer','Approver','Viewer'])}<button class="ob-btn ghost" data-invite>Invite</button></div>
        <div class="ob-roles">${ROLES.map(([r,d,can,cant])=>`<div class="ob-role${(W.ir||'Buyer')===r?' on':''}" data-rpick="${r}"><b>${r}</b><small>${d}</small><ul>${can.map(x=>`<li>${x}</li>`).join('')}${cant.map(x=>`<li class="no">${x}</li>`).join('')}</ul></div>`).join('')}</div><p class="ob-err" data-ierr hidden></p>`; }
      if(k==='am') return `<h2>Meet your account manager</h2>${AM?`<div class="ob-note big">${amCard()}<p>“Hi ${esc(N?N.greet(user):'')}, I’m your main contact at Mojo Promotions for quotes, proofs, orders and anything else. A short call helps me understand what ${esc(c.name)} needs.”</p>
        <div class="ob-row"><button class="ob-btn" data-ammeet>Book an intro call</button><button class="ob-btn ghost" data-amchat>Send a message</button>${AM.email?`<a class="ob-btn ghost" href="mailto:${esc(AM.email)}">Email</a>`:''}</div></div>`:'<p class="ob-lede">Your account manager will be in touch.</p>'}`;
      if(k==='tour'){ const T=[['Browse your range','Your store shows the products Mojo has picked for '+esc(c.name)+', with your prices.'],['Ask for a quote or start a project','Tell us what you need and we’ll put options together. Everything lives in the project.'],['Approve proofs','See exactly how your logo will look and approve it, or ask for changes, in one click.'],['Track every order','See dispatch, delivery and invoices in Orders. You’ll be told when anything changes.'],['Chat with us','Message your account manager from any page using the chat button.']];
        return `<h2>A quick tour</h2><div class="ob-tour"><span class="ob-tn">${tourI+1} / ${T.length}</span><h3>${T[tourI][0]}</h3><p>${T[tourI][1]}</p><div class="ob-dots">${T.map((x,j)=>`<i class="${j===tourI?'on':''}"></i>`).join('')}</div>
          <div class="ob-row"><button class="ob-btn ghost" data-tprev${tourI?'':' disabled'}>Previous</button><button class="ob-btn ghost" data-tnext${tourI<T.length-1?'':' disabled'}>Next</button></div></div>`; }
      if(k==='project') return `<h2>Start your first project</h2><p class="ob-lede">Tell ${AM?esc(AM.n.split(' ')[0]):'Mojo'} what you’re after and they’ll come back with options. Or skip this for now.</p>
        <div class="ob-grid">${fld('pw','What do you need?',W.pw||'',{req:1,w:1,ph:'e.g. Welcome packs for new starters: tote, mug, notebook'})}${fld('pq','Roughly how many?',W.pq||'',{ph:'e.g. 250'})}${fld('pd','Needed by',W.pd||'',{type:'date'})}${fld('pb','Budget (optional)',W.pb||'',{ph:'e.g. £5,000'})}</div>`;
      const st=state(c.id).steps, ready=orgReady(c.id), skipped=STEPS.filter(s=>s[2]&&st[s[0]]&&st[s[0]].skipped);
      return `<div class="ob-hero"><span class="ob-kick">All set</span><h1>${ready?'You’re ready to order.':'You’re nearly there.'}</h1>
        <p>${ready?esc(c.name)+'’s store is set up. Your team can start ordering.':'Your details are saved. '+esc((mainOf(c)||{}).n||'Your main contact')+' still needs to finish setting up '+esc(c.name)+' before anyone can order.'}</p>
        <ul class="ob-sum">${STEPS.filter(s=>!['welcome','finish'].includes(s[0])).map(s=>{ const d=s[2]?st[s[0]]:(db().users[ukey]||{steps:{}}).steps[s[0]]; return `<li class="${d?(d.skipped?'sk':'ok'):''}"><i>${d&&!d.skipped?'✓':''}</i>${esc(s[1])}${d&&d.skipped?' <small>skipped</small>':''}</li>`; }).join('')}</ul>
        <div class="ob-row"><a class="ob-btn" href="Merchsmith Store.html">Go to your store</a><a class="ob-btn ghost" href="Merchsmith Home.html">Your dashboard</a></div>
        ${AM?`<div class="ob-note big"><span class="ob-kick">Next: meet your account manager</span>${amCard()}<p>“Hi ${esc(N?N.greet(user):'')}, I’m your main contact at Mojo Promotions for quotes, proofs, orders and anything else. A short intro call helps me understand what ${esc(c.name)} needs.”</p><div class="ob-row"><button class="ob-btn" data-ammeet>Book an intro call</button><button class="ob-btn ghost" data-amchat>Send a message</button>${AM.email?`<a class="ob-btn ghost" href="mailto:${esc(AM.email)}">Email</a>`:''}</div></div>`:''}</div>`; }
    function pv(){ const L=logo(); return `<div class="pvh" style="background:${esc(brand.primary)}">${L?`<img src="${esc(L)}" alt="">`:`<b>${esc(c.name)}</b>`}<i></i><i></i></div><div class="pvb" style="background:${esc(brand.secondary)};color:${esc(brand.ink)}"><span class="pvbd" style="background:${esc(brand.accent)}">New</span><h5 style="color:${esc(brand.ink)}">Welcome to your store</h5><p>Branded merchandise for ${esc(c.name)}.</p><span class="pvbt" style="background:${esc(brand.primary)}">Browse products</span></div>`; }

    function val(k){ const g=s=>{ const e=root.querySelector(`[data-o="${s}"]`); return e?e.value.trim():''; };
      if(k==='you'){ const np=N?N.parts(root.querySelector('[data-o="n"]')):{}; if(N&&!np.firstName) return 'Add your first name.'; if(N&&!np.lastName) return 'Add your last name.'; if(!g('n')) return 'Add your name.'; if(!g('title')) return 'Add your job title.'; if(g('tel').replace(/[^0-9]/g,'').length<7) return 'Add a phone number.'; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('email'))) return 'Add a valid email.'; if(!done('you',0)){ if(g('p1').length<8) return 'Your password needs at least 8 characters.'; if(g('p1')!==g('p2')) return 'The two passwords don’t match.'; } }
      if(k==='org'){ if(!g('name')) return 'Add your organisation name.'; if(A){ const e=A.validate(A.read(root.querySelector('[data-bill]')),'Billing address'); if(e.length) return e[0].charAt(0).toUpperCase()+e[0].slice(1); } }
      if(k==='delivery'&&!addrs().length) return 'Add at least one delivery address.';
      if(k==='billing'){ if(!g('bname')) return 'Add a billing contact.'; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g('bemail'))) return 'Add a valid invoice email.'; }
      if(k==='project'&&!g('pw')) return 'Tell us what you need, or skip this for now.';
      return ''; }
    function saveStep(k){ const g=s=>{ const e=root.querySelector(`[data-o="${s}"]`); return e?(e.type==='checkbox'?e.checked:e.value.trim()):''; }, orgKey=c.id;
      if(k==='you'){ const nm=root.querySelector('[data-o="n"]'), f={n:g('n'),title:g('title'),tel:g('tel'),email:g('email')}; if(N&&nm._name) Object.assign(f,N.parts(nm)); if(W.photo!==undefined) f.photo=W.photo;
        if(P&&P.saveUser) P.saveUser(orgKey,user,f); if(P&&P.setStatus&&user.status==='invited') P.setStatus(orgKey,user,'active'); Object.assign(user,f,{status:'active'}); }
      if(k==='notify'){ const o=db(); o.users[ukey].prefs={proof:g('n_proof'),order:g('n_order'),invoice:g('n_invoice'),chat:g('n_chat'),digest:g('n_digest')}; save(o); }
      if(k==='org'){ const b=A?A.read(root.querySelector('[data-bill]')):{}; const f=Object.assign({name:g('name'),website:g('website'),companyNo:g('companyNo'),vatNo:g('vatNo')},b,A?{address:A.text(b)}:{}); if(P&&P.saveOrg) P.saveOrg(orgKey,c,f); else Object.assign(c,f); }
      if(k==='billing'){ const f={billingContact:g('bname'),billingEmail:g('bemail'),poRequired:g('po'),invoiceNotes:g('binv')}; if(P&&P.saveOrg) P.saveOrg(orgKey,c,f); else Object.assign(c,f); }
      if(k==='project'){ try{ const L=JSON.parse(localStorage.getItem('ms-brief-requests')||'[]'); L.unshift({id:'b'+Date.now().toString(36),org:c.id,orgName:c.name,by:user.n,what:g('pw'),qty:g('pq'),by_date:g('pd'),budget:g('pb'),at:new Date().toISOString(),status:'new'}); localStorage.setItem('ms-brief-requests',JSON.stringify(L)); }catch(e){}
        notifyAM('New project brief from '+c.name,user.n+': '+g('pw')); } }
    function brandChanged(){ c.brand=Object.assign({},c.brand||{},{colours:Object.assign({},brand)}); persistBrand(); }
    function persistBrand(){ try{ const k='ms-cust-new', s=JSON.parse(localStorage.getItem(k)||'{}'); const r=(s.items||[]).find(x=>x.id===c.id); if(r){ r.brand=c.brand; localStorage.setItem(k,JSON.stringify(s)); } }catch(e){} if(P&&P.saveOrg) try{ P.saveOrg(c.id,c,{brand:c.brand}); }catch(e){} W.brandTouched=true; }

    function draw(){ const [k,label,org,req]=STEPS[i], n=STEPS.length-1, pct=Math.round(i/n*100), first=i===0, last=k==='finish';
      document.documentElement.style.setProperty('--ob-p',brand.primary); document.documentElement.style.setProperty('--ob-s',brand.secondary);
      root.innerHTML=`<header class="ob-top"><div class="ob-brand-l">${logo()?`<img src="${esc(logo())}" alt="${esc(c.name)}">`:`<b>${esc(c.name)}</b>`}</div>
          ${last?'':`<div class="ob-steps"><span>${first?'Getting started':'Step '+i+' of '+(n-1)+' · '+esc(label)}</span><div class="ob-bar"><i style="width:${pct}%"></i></div></div>`}<span class="ob-by">with Mojo Promotions</span></header>
        <main class="ob-main"><section class="ob-card${first||last?' hero':''}">${org&&!first?'<span class="ob-tag">For '+esc(c.name)+'</span>':''}${body(k)}<p class="ob-err" data-err hidden></p></section></main>
        ${last?'':`<footer class="ob-foot"><div class="ob-foot-in">${first?'<span></span>':'<button class="ob-btn ghost" data-back>Back</button>'}<span class="ob-fill"></span>${!req&&!first&&!last?'<button class="ob-link" data-skip>Skip for now</button>':''}<button class="ob-btn" data-next>${first?(done('you',0)?'Continue':'Accept invitation'):k==='project'?'Send to '+(AM?esc(AM.n.split(' ')[0]):'Mojo'):k==='terms'?'Looks right':'Continue'}</button></div></footer>`}`;
      wire(k); window.scrollTo(0,0); }
    function err(t){ const e=root.querySelector('[data-err]'); e.hidden=!t; e.textContent=t||''; }
    function go(d){ i=Math.max(0,Math.min(STEPS.length-1,i+d)); draw(); if(STEPS[i][0]==='finish') finish(); }
    function finish(){ const o=db(), s=o.orgs[c.id]; if(orgReady(c.id)&&!s.finished&&isOrg){ s.finished=new Date().toISOString(); s.finishedBy=user.n; save(o);
        notifyAM(c.name+' finished setting up','Their store is ready to order. Set up by '+user.n+'.'); try{ if(window.MSNOTES) MSNOTES.log('org:'+c.id,'onboarding','Onboarding complete. Set up by '+user.n+'.'); }catch(e){} } }
    function wire(k){ const $=s=>root.querySelector(s);
      if(A) A.wire(root);
      const nm=$('[data-o="n"]'); if(nm&&N){ N.upgrade(nm,{pref:true,prefValue:user.pref||'',cls:'ob-f'}); const ls=root.querySelector('[data-nm="last"]'); if(ls){ const sp=ls.closest('label').querySelector('span'); if(sp&&!sp.querySelector('em')) sp.insertAdjacentHTML('beforeend',' <em class="nm-req">*</em>'); } }
      const ph=$('[data-photo]'); if(ph) ph.onchange=async()=>{ try{ W.photo=P?await P.readPhoto(ph.files[0]):''; $('[data-av]').innerHTML=`<img src="${W.photo}" alt="">`; }catch(e){ err(e.message); } };
      ['p1','p2','atitle','ie','ir','pw','pq','pd','pb'].forEach(x=>{ const e=$(`[data-o="${x}"]`); if(e) e.addEventListener('input',()=>W[x]=e.value); });
      root.querySelectorAll('[data-bc]').forEach(inp=>inp.oninput=()=>{ brand[inp.dataset.bc]=inp.value; inp.parentElement.style.background=inp.value; inp.closest('.ob-col').querySelector('code').textContent=inp.value.toUpperCase(); $('[data-pv]').innerHTML=pv(); document.documentElement.style.setProperty('--ob-p',brand.primary); W.brandDirty=true; });
      const bl=$('[data-blogo]'); if(bl) bl.onchange=()=>{ const f=bl.files[0]; if(!f) return; if(f.size>1.5*1024*1024) return err('That image is over 1.5 MB.'); const r=new FileReader(); r.onload=()=>{ c.brand=Object.assign({},c.brand||{},{logoFull:r.result,logoSq:(c.brand&&c.brand.logoSq)||r.result}); W.brandDirty=true; persistBrand(); draw(); }; r.readAsDataURL(f); };
      const aa=$('[data-addaddr]'); if(aa) aa.onclick=()=>{ const a=A.read($('[data-newaddr]')), e=A.validate(a); if(e.length) return err(e[0].charAt(0).toUpperCase()+e[0].slice(1));
        const L=addrs().concat([Object.assign({id:'a'+Date.now(),title:W.atitle||'Delivery address',isDefault:!addrs().length},a)]); if(P&&P.saveOrg) P.saveOrg(c.id,c,{addresses:L}); else c.addresses=L; W.atitle=''; draw(); };
      const iv=$('[data-invite]'); if(iv) iv.onclick=()=>{ const e=W.ie||'', r=W.ir||'Buyer', ie=$('[data-ierr]'); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ ie.hidden=false; ie.textContent='Enter a valid email.'; return; }
        const hit=D().customers.flatMap(x=>(x.teams||[]).flatMap(t=>(t.users||[]).map(u=>({u,x})))).find(p=>String(p.u.email||'').toLowerCase()===e.toLowerCase()); if(hit){ ie.hidden=false; ie.textContent=hit.x.id===c.id?e+' is already in your team.':e+' already has an account with another organisation. Ask Mojo to move them.'; return; }
        const n=e.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,x=>x.toUpperCase()), s=N?N.split(n):{}, f={n,firstName:s.first||'',lastName:s.last||'',email:e,role:r,title:r};
        const t=(c.teams||[])[0]; if(P&&P.addUser) P.addUser(c.id,t?t.name:'Team',f); if(t) (t.users=t.users||[]).push(Object.assign({status:'invited',last:'Invited'},f)); people.push(f); W.ie=''; draw(); };
      const am=$('[data-ammeet]'); if(am) am.onclick=()=>{ const p=window.MSChat&&MSChat.resolve?MSChat.resolve({name:AM.n,email:AM.email}):null; location.href='Merchsmith Calendar.html#tab=cal&with='+encodeURIComponent(p?p.id:''); };
      const ac=$('[data-amchat]'); if(ac) ac.onclick=()=>{ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith({name:AM.n,email:AM.email,orgName:'Mojo Promotions',orgType:'distributor'}); else location.href='Merchsmith Chats.html'; };
      root.querySelectorAll('[data-rpick]').forEach(b=>b.onclick=()=>{ W.ir=b.dataset.rpick; const s=$('[data-o="ir"]'); if(s) s.value=W.ir; root.querySelectorAll('[data-rpick]').forEach(x=>x.classList.toggle('on',x===b)); });
      const irs=$('[data-o="ir"]'); if(irs) irs.addEventListener('change',()=>root.querySelectorAll('[data-rpick]').forEach(x=>x.classList.toggle('on',x.dataset.rpick===irs.value)));
      const tp=$('[data-tprev]'), tn=$('[data-tnext]'); if(tp) tp.onclick=()=>{ tourI--; draw(); }; if(tn) tn.onclick=()=>{ tourI++; draw(); };
      const bk=$('[data-back]'); if(bk) bk.onclick=()=>go(-1);
      const sk=$('[data-skip]'); if(sk) sk.onclick=()=>{ mark(k,STEPS[i][2],true); go(1); };
      const nx=$('[data-next]'); if(nx) nx.onclick=()=>{ const e=val(k); if(e) return err(e); saveStep(k);
        if(k==='brand'&&W.brandDirty){ brandChanged(); notifyAM(c.name+' changed their brand',user.n+' updated their logo or colours during setup.'); W.brandDirty=false; }
        mark(k,STEPS[i][2],false); go(1); }; }
    draw(); }

  const css=`
  body.ob{margin:0;min-height:100vh;background:var(--ob-s,#eef0f8);font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;}
  .ob-top{display:flex;align-items:center;gap:22px;padding:16px clamp(18px,4vw,40px);background:#fff;border-bottom:1px solid var(--line-soft);position:sticky;top:0;z-index:5;}
  .ob-brand-l{flex:none;min-width:120px;} .ob-brand-l img{height:30px;max-width:170px;object-fit:contain;display:block;} .ob-brand-l b{font-family:var(--serif);font-weight:500;font-size:20px;}
  .ob-steps{flex:1;display:flex;flex-direction:column;gap:6px;max-width:560px;margin:0 auto;} .ob-steps span{font-size:12.5px;font-weight:700;color:var(--ink-3);text-align:center;} .ob-bar{height:6px;border-radius:6px;background:var(--paper-2);overflow:hidden;} .ob-bar i{display:block;height:100%;background:var(--ob-p,var(--periwinkle-deep));border-radius:6px;transition:width .35s;}
  .ob-by{flex:none;font-size:12px;color:var(--muted);min-width:120px;text-align:right;} @media(max-width:640px){.ob-by{display:none;} .ob-brand-l{min-width:0;}}
  .ob-main{flex:1;display:flex;justify-content:center;padding:clamp(20px,5vw,48px) 16px 120px;}
  .ob-card{width:min(720px,100%);background:#fff;border-radius:22px;padding:clamp(22px,4vw,40px);box-shadow:0 20px 60px rgba(20,22,45,.1);display:flex;flex-direction:column;gap:16px;align-self:flex-start;}
  .ob-card h2{font-family:var(--serif);font-weight:500;font-size:clamp(26px,3vw,32px);margin:0;line-height:1.15;} .ob-card h1{font-family:var(--serif);font-weight:500;font-size:clamp(30px,4vw,42px);margin:0;line-height:1.1;text-wrap:pretty;}
  .ob-hero{display:flex;flex-direction:column;gap:16px;} .ob-hero>p{font-size:16px;line-height:1.6;color:var(--ink-2);margin:0;} .ob-kick{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ob-p,var(--periwinkle-deep));}
  .ob-tag{align-self:flex-start;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;background:var(--paper-2);color:var(--ink-3);border-radius:6px;padding:3px 8px;margin-bottom:-6px;}
  .ob-lede{font-size:14.5px;color:var(--text-soft);line-height:1.55;margin:-6px 0 0;} .ob-sm{font-size:12.5px;color:var(--muted);margin:0;line-height:1.5;} .ob-sub{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 -6px;}
  .ob-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;} .ob-f.w,.ob-grid .nm-row{grid-column:1/-1;} @media(max-width:560px){.ob-grid{grid-template-columns:1fr;}}
  .ob-f{display:flex;flex-direction:column;gap:5px;min-width:0;} .ob-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .ob-f>span em{color:#c0392b;font-style:normal;}
  .ob-f input,.ob-f select,.ob-f textarea{font:inherit;font-size:14.5px;border:1.5px solid var(--line-soft);border-radius:11px;padding:10px 12px;background:#fff;color:var(--ink);width:100%;min-width:0;resize:vertical;} .ob-f input:focus,.ob-f select:focus,.ob-f textarea:focus{outline:0;border-color:var(--ob-p,var(--periwinkle-deep));box-shadow:0 0 0 3px color-mix(in srgb,var(--ob-p,#4E5BA6) 18%,transparent);}
  .ob-btn{font:inherit;font-size:14.5px;font-weight:800;border:0;border-radius:999px;padding:12px 24px;background:var(--ob-p,var(--periwinkle-deep));color:#fff;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:filter .15s,transform .15s;} .ob-btn:hover{filter:brightness(1.08);}
  .ob-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line-soft);padding:10.5px 20px;} .ob-btn.ghost:hover{border-color:var(--ob-p,var(--periwinkle));filter:none;} .ob-btn:disabled{opacity:.4;cursor:default;}
  .ob-link{border:0;background:none;font:inherit;font-size:14px;font-weight:700;color:var(--ink-3);cursor:pointer;white-space:nowrap;} .ob-link:hover{color:var(--ink);}
  .ob-row{display:flex;gap:10px;flex-wrap:wrap;}
  body.ob .msid-switch{bottom:86px!important;left:auto!important;right:18px!important;transform:none!important;}
  .ob-foot{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line-soft);padding:14px 16px;z-index:5;} .ob-foot-in{width:min(720px,100%);margin:0 auto;display:flex;align-items:center;gap:14px;} .ob-fill{flex:1;}
  .ob-err{margin:0;color:#b4232c;font-size:13.5px;font-weight:600;background:var(--tint-red);border-radius:10px;padding:10px 12px;} .ob-err[hidden]{display:none;}
  .ob-note{display:flex;flex-direction:column;gap:10px;background:var(--paper);border-radius:16px;padding:16px 18px;} .ob-note p{margin:0;font-size:14.5px;line-height:1.6;color:var(--ink-2);font-style:italic;} .ob-note.big{padding:20px 22px;}
  .ob-am{display:flex;align-items:center;gap:12px;} .ob-am b{display:block;font-size:15px;} .ob-am small{font-size:12.5px;color:var(--muted);white-space:nowrap;} .ob-am>div{flex:1;min-width:0;}
  .ob-av{width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--paper-2);} .ob-av.lg{width:72px;height:72px;} .ob-av img{width:100%;height:100%;object-fit:cover;}
  .ob-avrow{display:flex;align-items:center;gap:16px;}
  .ob-togs{display:flex;flex-direction:column;gap:8px;} .ob-tog{display:flex;gap:12px;align-items:flex-start;border:1.5px solid var(--line-soft);border-radius:12px;padding:12px 14px;cursor:pointer;} .ob-tog:hover{border-color:var(--ob-p,var(--periwinkle));}
  .ob-tog input{width:19px;height:19px;margin-top:1px;accent-color:var(--ob-p,var(--periwinkle-deep));flex:none;} .ob-tog b{display:block;font-size:14px;} .ob-tog small{font-size:12.5px;color:var(--muted);}
  .ob-brand{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;} @media(max-width:640px){.ob-brand{grid-template-columns:1fr;}}
  .ob-logos{display:flex;flex-direction:column;gap:10px;margin-top:12px;} .ob-drop{height:90px;border:1.5px dashed var(--line);border-radius:14px;display:grid;place-items:center;cursor:pointer;background:#fff;overflow:hidden;font-size:13.5px;font-weight:700;color:var(--ob-p,var(--periwinkle-deep));} .ob-drop:hover{border-color:var(--ob-p);} .ob-drop img{max-width:80%;max-height:70%;object-fit:contain;}
  .ob-mono{display:grid;grid-template-columns:1fr 1fr;gap:8px;} .ob-mono span{height:54px;border-radius:10px;display:grid;place-items:center;border:1px solid var(--line-soft);font-size:12px;color:var(--muted);} .ob-mono .lt{background:#fff;} .ob-mono .dk{background:var(--ink);} .ob-mono img{max-width:78%;max-height:55%;object-fit:contain;} .ob-mono .lt img{filter:brightness(0);} .ob-mono .dk img{filter:brightness(0) invert(1);} .ob-mono small{grid-column:1/-1;font-size:11.5px;color:var(--muted);}
  .ob-cols{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;} .ob-col{display:grid;grid-template-columns:34px 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center;border:1px solid var(--line-soft);border-radius:12px;padding:8px 10px;cursor:pointer;}
  .ob-col .sw{grid-row:1/3;width:34px;height:34px;border-radius:9px;border:1px solid rgba(0,0,0,.1);position:relative;overflow:hidden;} .ob-col input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;} .ob-col b{font-size:13px;} .ob-col code{font-size:11.5px;color:var(--muted);}
  .ob-pv{margin-top:12px;border:1px solid var(--line-soft);border-radius:14px;overflow:hidden;} .pvh{display:flex;align-items:center;gap:8px;padding:12px 14px;} .pvh img{height:22px;max-width:130px;object-fit:contain;filter:brightness(0) invert(1);} .pvh b{color:#fff;flex:1;} .pvh i{width:22px;height:6px;border-radius:4px;background:rgba(255,255,255,.55);} .pvh img+i{margin-left:auto;}
  .pvb{padding:18px 16px 20px;} .pvbd{display:inline-block;color:#fff;font-size:10.5px;font-weight:800;border-radius:6px;padding:2px 7px;} .pvb h5{font-family:var(--serif);font-weight:500;font-size:20px;margin:8px 0 4px;} .pvb p{font-size:12.5px;margin:0 0 12px;opacity:.85;} .pvbt{display:inline-block;color:#fff;font-size:12.5px;font-weight:800;border-radius:999px;padding:8px 14px;white-space:nowrap;}
  .ob-addrs{display:flex;flex-direction:column;gap:8px;} .ob-addr{display:flex;flex-direction:column;gap:2px;border:1px solid var(--line-soft);border-radius:12px;padding:11px 14px;} .ob-addr b{font-size:14px;} .ob-addr b em{font-style:normal;font-size:10.5px;font-weight:800;background:var(--paper-2);color:var(--ink-3);border-radius:5px;padding:1px 6px;margin-left:4px;} .ob-addr span{font-size:13px;color:var(--ink-2);}
  .ob-add{border:1.5px dashed var(--line);border-radius:14px;padding:12px 14px;display:block;} .ob-add summary{font-weight:800;font-size:14px;color:var(--ob-p,var(--periwinkle-deep));cursor:pointer;} .ob-add[open]{display:flex;flex-direction:column;gap:12px;} .ob-add[open] summary{margin-bottom:2px;} .ob-add .ob-btn{align-self:flex-start;}
  .ob-terms{display:grid;grid-template-columns:1fr 1fr;gap:10px;} .ob-terms>div{background:var(--paper);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:3px;} .ob-terms span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);} .ob-terms b{font-family:var(--serif);font-weight:500;font-size:22px;}
  .ob-info{background:#fbeccd;border-radius:12px;padding:12px 14px;font-size:13.5px;color:#6f4a10;line-height:1.5;}
.ob-roles{display:grid;grid-template-columns:1fr 1fr;gap:10px;} @media(max-width:560px){.ob-roles{grid-template-columns:1fr;}} .ob-role{border:1.5px solid var(--line-soft);border-radius:14px;padding:12px 14px;cursor:pointer;display:flex;flex-direction:column;gap:3px;} .ob-role:hover{border-color:var(--ob-p,var(--periwinkle));} .ob-role.on{border-color:var(--ob-p,var(--periwinkle-deep));box-shadow:0 0 0 3px color-mix(in srgb,var(--ob-p,#4E5BA6) 14%,transparent);}
  .ob-role b{font-size:14.5px;} .ob-role small{font-size:12.5px;color:var(--muted);} .ob-role ul{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;} .ob-role li{font-size:12.5px;color:var(--ink-2);padding-left:18px;position:relative;line-height:1.4;} .ob-role li::before{content:'✓';position:absolute;left:0;color:var(--green-deep,#1d7c4d);font-weight:800;} .ob-role li.no{color:var(--muted);} .ob-role li.no::before{content:'–';color:var(--muted);}
  .ob-inv{grid-template-columns:1.6fr 1fr auto;align-items:end;} @media(max-width:560px){.ob-inv{grid-template-columns:1fr;}}
  .ob-tour{background:var(--paper);border-radius:18px;padding:26px 24px;display:flex;flex-direction:column;gap:10px;align-items:flex-start;} .ob-tn{font-size:12px;font-weight:800;color:var(--ob-p,var(--periwinkle-deep));} .ob-tour h3{font-family:var(--serif);font-weight:500;font-size:26px;margin:0;} .ob-tour p{margin:0;font-size:15px;line-height:1.6;color:var(--ink-2);}
  .ob-dots{display:flex;gap:6px;margin:6px 0;} .ob-dots i{width:8px;height:8px;border-radius:50%;background:var(--line);} .ob-dots i.on{background:var(--ob-p,var(--periwinkle-deep));width:22px;border-radius:5px;}
  .ob-sum{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;} @media(max-width:560px){.ob-sum{grid-template-columns:1fr;}} .ob-sum li{display:flex;align-items:center;gap:9px;font-size:14px;color:var(--ink-3);} .ob-sum li i{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:800;color:#fff;flex:none;}
  .ob-sum li.ok{color:var(--ink);} .ob-sum li.ok i{background:var(--green-deep,#1d7c4d);border-color:var(--green-deep,#1d7c4d);} .ob-sum small{color:var(--muted);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  // automatic reminders: 3 and 7 days after the last onboarding activity (checked whenever the distributor opens Organisations)
  function autoRemind(){ const DAY=864e5, now=Date.now(); (D().customers||[]).forEach(c=>{ if(c.status==='draft'||legacy(c.id)||orgReady(c.id)) return; const s=state(c.id);
    const acts=[c.createdAt,s.started].concat(Object.values(s.steps||{}).map(x=>x.at)).filter(Boolean).map(d=>+new Date(d)); if(!acts.length) return; const idle=(now-Math.max(...acts))/DAY, sent=(s.reminders||[]).filter(r=>r.auto&&+new Date(r.at)>Math.max(...acts)).length;
    if((idle>=3&&sent<1)||(idle>=7&&sent<2)) remind(c.id,true); }); }
  if(!document.body||!document.body.classList.contains('ob')) setTimeout(autoRemind,1500);
  return {mount,orgReady,progress,state,ORG_STEPS,remind,legacy,autoRemind};
})();
