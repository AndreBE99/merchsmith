/* ============================================================
   sup-onboarding.js — Supplier onboarding (Merchsmith Supplier Onboarding.html)
   Welcome · Your details · Company & address · Type & specialisms ·
   Product feed (API / CSV / manual) · Delivery regions & carriage ·
   Bank details & invoices · Placement billing (Direct Debit) · Team ·
   Terms & Conditions · Done → "Ready for review", Meet your Merchsmith contact.
   Merchsmith approves before products are visible (sup-invite.js).
   Store 'ms-sonb' {supId:{steps,started,finished,reminders,feed,delivery,bank,dd,terms}}
   URL ?s=<supplierId> (defaults to the newest invited supplier)
   ============================================================ */
(function(){
  const KEY='ms-sonb', A=window.ADMIN||{suppliers:[],team:[]};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const put=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){ alert('Couldn’t save: browser storage is full.'); } };
  let items=[]; try{ items=JSON.parse(localStorage.getItem('ms-sup-new')||'{}').items||[]; }catch(e){}
  const q=new URLSearchParams(location.search), root=document.getElementById('dobRoot');
  const s=items.find(x=>x.id===q.get('s'))||items.find(x=>x.id===localStorage.getItem('ms-sonb-latest'))||items.find(x=>x.status==='invited');
  if(!s){ root.innerHTML='<main class="ob-main"><section class="ob-card"><h2>No invitation found</h2><p class="ob-lede">Open this page from a supplier invitation link. In the prototype, invite a supplier from Platform Admin → Suppliers first.</p><div class="ob-row"><a class="ob-btn" href="Merchsmith Admin.html#nav=suppliers">Go to Suppliers</a></div></section></main>'; return; }
  const W0=s._wiz||{}, AD=window.MSADDR, N=window.MSNAME, REQ=['you','company','type','feed','terms'];
  const contact=(A.team||[]).find(u=>u.n===s.onboardingOwner)||(A.team||[])[0]||{n:s.onboardingOwner||'Merchsmith'};
  const me=(s.contacts||[])[0]||{n:s.contact,email:s.contactEmail};
  const o0=all(); o0[s.id]=o0[s.id]||{steps:{}}; if(!o0[s.id].started) o0[s.id].started=new Date().toISOString(); put(o0);
  const S=()=>all()[s.id], setS=(k,v)=>{ const o=all(); o[s.id][k]=v; put(o); };
  const mark=(k,sk)=>{ const o=all(); o[s.id].steps[k]={by:me.n,at:new Date().toISOString(),skipped:!!sk}; put(o); };
  const saveRec=()=>{ try{ const x=JSON.parse(localStorage.getItem('ms-sup-new')||'{}'); const i=(x.items||[]).findIndex(y=>y.id===s.id); if(i>=0){ x.items[i]=s; localStorage.setItem('ms-sup-new',JSON.stringify(x)); } }catch(e){} };
  const SPECS=(window.MSPEOPLE&&MSPEOPLE.specList?MSPEOPLE.specList():['Generalist','Pens & writing','Notebooks & stationery','Drinkware','Bags','Apparel','Tech & gadgets','Eco & sustainable']);
  const STEPS=[['welcome','Welcome'],['you','Your details'],['company','Company & logo'],['type','Type & specialisms'],['feed','Product feed'],['team','Your team'],['terms','Terms & Conditions'],['finish','Done']];
  let i=Math.max(0,STEPS.findIndex(x=>!['welcome','finish'].includes(x[0])&&!S().steps[x[0]])); if(!S().steps.you) i=0;
  const COL=Object.assign({primary:'#4E5BA6',secondary:'#E8EAF6',accent:'#FF6A4D',ink:'#1E2033'},(s.brand&&s.brand.colours)||{});
  const W={kind:s.kind||'both',specs:(s.specialisms||[]).slice(),feed:(S().feed||{}).mode||'api',regions:(S().delivery||{}).regions||['UK'],team:[]};
  const f=(k,l,v,o)=>`<label class="ob-f${o&&o.w?' w':''}"><span>${l}${o&&o.req?' <em>*</em>':''}</span><input data-o="${k}" value="${esc(v)}"${o&&o.type?` type="${o.type}"`:''} placeholder="${esc((o&&o.ph)||'')}"></label>`;
  const g=k=>{ const e=root.querySelector(`[data-o="${k}"]`); return e?(e.type==='checkbox'?e.checked:e.value.trim()):''; };
  const ini=n=>String(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  if(!W.att) W.att=((S().feed||{}).att||[]).slice();
  const fmtSz=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
  const attHTML=()=>`<div class="sob-att">${W.att.map((a,j)=>`<div class="sob-af"><span>${esc(a.name)}</span><small>${fmtSz(a.size)}</small><button type="button" data-attrm="${j}" aria-label="Remove ${esc(a.name)}">×</button></div>`).join('')}<label class="ob-btn ghost sob-attadd">+ Add files<input type="file" multiple data-att hidden></label></div>`;
  function body(k){ const x=S();
    if(k==='welcome') return `<div class="ob-hero"><span class="ob-kick">Welcome to Merchsmith</span><h1>Let’s get ${esc(s.name)} set up as a supplier.</h1><p>${s.requestedBy?esc(s.requestedBy)+' asked Merchsmith to invite you. ':''}Once you’re set up and approved, distributors on Merchsmith can find your products and order from you. Setup takes about 15 minutes.</p>
      <div class="ob-note"><div class="ob-am"><span class="ob-av">${esc(ini(contact.n))}</span><div><b>${esc(contact.n)}</b><small>${esc(contact.title||'Merchsmith')} · your Merchsmith contact</small></div></div><p>“Welcome! I’ll review your setup when you’re done and help you get your products live.”</p></div></div>`;
    if(k==='you') return `<h2>Your details</h2><p class="ob-lede">You’ll be the main contact and first Admin for ${esc(s.name)}.</p><div class="ob-grid">${f('n','Full name',me.n,{req:1,w:1})}${f('title','Job title','',{req:1})}${f('tel','Phone',me.tel||W0.tel||'',{req:1,type:'tel'})}${f('email','Email',me.email,{req:1,type:'email'})}</div>
      ${x.steps.you?'':`<div class="ob-grid">${f('p1','Password','',{req:1,type:'password'})}${f('p2','Confirm password','',{req:1,type:'password'})}</div><p class="ob-sm">At least 8 characters.</p>`}`;
    if(k==='company') return `<h2>Company & address</h2><div class="ob-grid">${f('cname','Company name',s.name,{req:1})}${f('legal','Legal name',s.legalName||'')}${f('cno','Company number',s.companyNo||'')}${f('vat','VAT number',s.vat||'')}</div>
      <div class="ob-sub">Address <small>where your products ship from</small></div><div data-addr>${AD?AD.fieldsHTML(AD.of(s)):''}</div>
      <div class="ob-sub">Logo</div><div class="dob-logos">${[['logoSq','Square logo','sq'],['logo','Full logo','']].map(([key,l,c])=>`<div><small class="ob-sm">${l}</small><label class="ob-drop ${c}">${s[key]?`<img src="${esc(s[key])}" alt="">`:'<span>Upload</span>'}<input type="file" accept="image/*" data-logo="${key}" hidden></label></div>`).join('')}</div>
      `;
    if(k==='type') return `<h2>What do you supply?</h2><div class="ob-plans">${[['product','Product','Blank products'],['branding','Branding','Decoration only'],['both','Product + branding','Supply and decorate']].map(([v,l,d])=>`<button type="button" class="ob-plan${W.kind===v?' on':''}" data-kind="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <div class="ob-sub">Specialisms <small>distributors use these to find you</small></div><div class="sob-tags">${SPECS.map(t=>`<button type="button" class="${W.specs.includes(t)?'on':''}" data-spec="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
    if(k==='feed') return `<h2>Your products</h2><p class="ob-lede">How should Merchsmith get your product data? You can change this later.</p>
      <div class="ob-seg">${[['api','API feed'],['csv','CSV file'],['manual','Add manually']].map(([v,l])=>`<button type="button" class="${W.feed===v?'on':''}" data-feed="${v}">${l}</button>`).join('')}</div>
      ${W.feed==='api'?`<div class="ob-stripe"><label class="ob-f w"><span>API details <em>*</em></span><textarea data-o="apiinfo" rows="6" placeholder="Endpoint URL, how to get access or a key, sync frequency, who to contact for technical questions…">${esc((x.feed||{}).info||'')}</textarea></label>
          <div class="ob-sub">Attachments <small>API guides, field lists, sample files</small></div>${attHTML()}<small>Merchsmith will set up the connection with you after review. Don’t paste passwords here; we’ll ask for keys securely.</small></div>`
       :W.feed==='csv'?`<div class="ob-stripe"><label class="ob-drop" style="height:80px"><span data-csvname>${esc((x.feed||{}).file||'Upload a CSV or Excel file')}</span><input type="file" accept=".csv,.xlsx,.xls" data-csv hidden></label><small>Download the <a href="#">Merchsmith product template</a> for the columns we need.</small>
          <label class="ob-f w"><span>Notes</span><textarea data-o="csvnotes" rows="4" placeholder="e.g. Prices exclude carriage, we update the file monthly, column H is stock">${esc((x.feed||{}).notes||'')}</textarea></label></div>`
       :`<p class="ob-info">You’ll add products one by one from your supplier portal once you’re approved.</p>`}`;
    if(k==='delivery'){ const d=x.delivery||{}; return `<h2>Delivery & carriage</h2><p class="ob-lede">Where you deliver and what you charge. Distributors see this when they order.</p>
      <div class="ob-sub">Delivery regions</div><div class="sob-tags">${['UK','Ireland','Europe','USA & Canada','Rest of world'].map(r=>`<button type="button" class="${W.regions.includes(r)?'on':''}" data-region="${r}">${r}</button>`).join('')}</div>
      <div class="ob-grid">${f('carr','Carriage charge per order (£)',d.carriage||'',{req:1,ph:'e.g. 12.50'})}${f('free','Free carriage over (£)',d.free||'',{ph:'Optional, e.g. 500'})}${f('lead','Standard delivery time',d.lead||'',{ph:'e.g. 3–5 working days'})}</div><p class="ob-sm">Production lead times are set per product.</p>`; }
    if(k==='bank'){ const b=x.bank||{}; return `<h2>Bank details & invoices</h2><p class="ob-lede">Where distributors pay you, and where to send remittances.</p>
      <div class="ob-grid">${f('bn','Account name',b.name||s.name,{req:1,w:1})}${f('bs','Sort code',b.sort||'',{req:1,ph:'00-00-00'})}${f('ba','Account number',b.acc?'••••'+b.acc:'',{req:1,ph:'8 digits'})}${f('bi','Invoice / remittance email',b.inv||'',{req:1,type:'email',ph:'accounts@'+(s.domain||'company.com')})}${f('bt','Your payment terms',b.terms||'30 days',{})}</div>`; }
    if(k==='dd') return `<h2>Placement billing</h2><p class="ob-lede">Merchsmith charges placement fees for featured products and promotions by Direct Debit. You’re only charged when you choose a placement.</p>
      <div class="ob-stripe"><div class="ob-grid">${f('dn','Account holder','',{req:1,w:1})}${f('ds','Sort code','',{req:1,ph:'00-00-00'})}${f('da','Account number','',{req:1,ph:'8 digits'})}</div><label class="ob-tog"><input type="checkbox" data-o="ddok"><span><b>I can authorise Direct Debits from this account on my own</b><small>Protected by the Direct Debit Guarantee · prototype, no mandate is created</small></span></label></div>`;
    if(k==='team') return `<h2>Invite your team</h2><p class="ob-lede">Add colleagues who handle orders, artwork or accounts.</p>
      ${(s.contacts||[]).slice(1).concat(W.team).length?`<div class="ob-addrs">${(s.contacts||[]).slice(1).concat(W.team).map(u=>`<div class="ob-addr"><b>${esc(u.email)}</b><span>${esc(u.role)} · invited</span></div>`).join('')}</div>`:''}
      <div class="ob-grid ob-inv">${f('ie','Email','',{type:'email'})}<label class="ob-f"><span>Role</span><select data-o="ir">${['Admin','Sales','Orders','Accounts','Studio'].map(r=>`<option>${r}</option>`).join('')}</select></label><button class="ob-btn ghost" data-invite>Invite</button></div><p class="ob-err" data-ierr hidden></p>`;
    if(k==='terms') return `<h2>Supplier Terms & Conditions</h2><p class="ob-lede">Please read and accept to finish.</p>
      <div class="ob-terms2"><p><b>Orders:</b> you fulfil orders placed by distributors at the prices and lead times you publish.</p><p><b>Product data:</b> you keep your prices, stock and product information accurate.</p><p><b>Payments:</b> distributors pay you on your payment terms. Merchsmith charges placement fees only when you choose them.</p><p><b>Approval:</b> Merchsmith reviews new suppliers before products are visible.</p></div>
      <label class="ob-tog"><input type="checkbox" data-o="tcs"${x.terms?' checked':''}><span><b>I agree to the <a href="Merchsmith Page.html?p=terms" target="_blank">Merchsmith Supplier Terms &amp; Conditions</a></b></span></label>`;
    const done=REQ.every(y=>x.steps[y]);
    return `<div class="ob-hero"><span class="ob-kick">${done?'Ready for review':'Nearly there'}</span><h1>${done?'Thanks, '+esc(N?N.greet({n:me.n}):me.n)+'. We’re reviewing '+esc(s.name)+'.':'A few steps left.'}</h1>
      <p>${done?'Merchsmith will check your details, usually within 2 working days. Once approved, distributors can see your products. We’ll email you when you’re live.':'Finish the steps marked below so Merchsmith can review your account.'}</p>
      <ul class="ob-sum">${STEPS.filter(y=>!['welcome','finish'].includes(y[0])).map(([y,l])=>{ const v=x.steps[y]; return `<li class="${v&&!v.skipped?'ok':''}"><i>${v&&!v.skipped?'✓':''}</i>${l}${v&&v.skipped?' <small>skipped</small>':''}</li>`; }).join('')}</ul>
      <div class="ob-row"><a class="ob-btn" href="Merchsmith Supplier Portal.html">Go to your supplier portal</a></div>
      <div class="ob-note big"><span class="ob-kick">Meet your Merchsmith contact</span><div class="ob-am"><span class="ob-av">${esc(ini(contact.n))}</span><div><b>${esc(contact.n)}</b><small>${esc(contact.title||'')} · Merchsmith</small></div></div><p>“Book a call and I’ll walk you through getting your products set up.”</p>
        <div class="ob-row"><a class="ob-btn" href="Merchsmith Calendar.html#tab=cal">Book a call</a>${contact.email?`<a class="ob-btn ghost" href="mailto:${esc(contact.email)}">Email ${esc(contact.n.split(' ')[0])}</a>`:''}</div></div></div>`; }
  const E=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function val(k){ if(k==='you'){ const np=N?N.parts(root.querySelector('[data-o="n"]')):{}; if(N&&(!np.firstName||!np.lastName)) return 'Add your first and last name.'; if(!g('title')) return 'Add your job title.'; if(g('tel').replace(/\D/g,'').length<7) return 'Add a phone number.'; if(!E.test(g('email'))) return 'Add a valid email.'; if(!S().steps.you){ if(g('p1').length<8) return 'Your password needs at least 8 characters.'; if(g('p1')!==g('p2')) return 'The passwords don’t match.'; } }
    if(k==='company'){ if(!g('cname')) return 'Add your company name.'; if(AD){ const e=AD.validate(AD.read(root.querySelector('[data-addr]')),'Address'); if(e.length) return e[0].charAt(0).toUpperCase()+e[0].slice(1); } }
    if(k==='type'&&!W.specs.length) return 'Choose at least one specialism.';
    if(k==='feed'){ if(W.feed==='api'&&g('apiinfo').length<10) return 'Tell us about your API, or choose another option.'; if(W.feed==='csv'&&!(S().feed||{}).file&&!W.csv) return 'Upload your product file, or choose another option.'; }
    if(k==='delivery'){ if(!W.regions.length) return 'Choose at least one delivery region.'; if(g('carr')===''||isNaN(+g('carr').replace(/[£,]/g,''))) return 'Add your carriage charge (0 if free).'; }
    if(k==='bank'){ if(!g('bn')) return 'Add the account name.'; if(g('bs').replace(/\D/g,'').length!==6) return 'The sort code should be 6 digits.'; if(!/^••••/.test(g('ba'))&&g('ba').replace(/\D/g,'').length!==8) return 'The account number should be 8 digits.'; if(!E.test(g('bi'))) return 'Add a valid invoice email.'; }
    if(k==='dd'){ if(!g('dn')) return 'Add the account holder.'; if(g('ds').replace(/\D/g,'').length!==6) return 'The sort code should be 6 digits.'; if(g('da').replace(/\D/g,'').length!==8) return 'The account number should be 8 digits.'; if(!g('ddok')) return 'Confirm you can authorise the Direct Debit.'; }
    if(k==='terms'&&!g('tcs')) return 'Please accept the Supplier Terms & Conditions.';
    return ''; }
  function saveStep(k){ if(k==='you'){ me.n=g('n'); me.email=g('email'); me.tel=g('tel'); me.title=g('title'); s.contact=me.n; s.contactEmail=me.email; }
    if(k==='company'){ const a=AD?AD.read(root.querySelector('[data-addr]')):{}; Object.assign(s,{name:g('cname'),legalName:g('legal'),companyNo:g('cno'),vat:g('vat'),brand:Object.assign({},s.brand||{},{colours:Object.assign({},COL)})},a,AD?{address:AD.text(a)}:{}); }
    if(k==='type'){ s.kind=W.kind; s.specialisms=W.specs.slice(); }
    if(k==='feed'){ setS('feed',{mode:W.feed,info:g('apiinfo')||(S().feed||{}).info||'',att:W.att,notes:g('csvnotes')||(S().feed||{}).notes||'',file:W.csv||(S().feed||{}).file||''}); s.feed=W.feed==='api'?'API · awaiting mapping':W.feed==='csv'?'CSV · awaiting mapping':'Manual'; }
    if(k==='delivery') setS('delivery',{regions:W.regions,carriage:g('carr'),free:g('free'),lead:g('lead')});
    if(k==='bank') setS('bank',{name:g('bn'),sort:g('bs'),acc:(g('ba').replace(/\D/g,'')||'').slice(-4)||((S().bank||{}).acc||''),inv:g('bi'),terms:g('bt')});
    if(k==='dd') setS('dd',{holder:g('dn'),last4:g('da').slice(-4),at:new Date().toISOString()});
    if(k==='terms') setS('terms',{accepted:true,by:me.n,at:new Date().toISOString(),version:'supplier-2026-09'});
    saveRec(); }
  function finish(){ const x=S(); if(REQ.every(y=>x.steps[y])&&s.status==='invited'){ s.status='review'; saveRec(); setS('finished',new Date().toISOString());
    try{ if(window.MSNOTIF) MSNOTIF.push('admin',{ev:'dist_new',title:s.name+' is ready to review',body:'Supplier onboarding finished by '+me.n+'. Onboarding owner: '+contact.n+'.',href:'Merchsmith Admin.html#nav=suppliers'}); }catch(e){} } }
  function draw(){ const [k,label]=STEPS[i], n=STEPS.length-1, first=i===0, last=k==='finish', opt=k==='team';
    root.innerHTML=`<header class="ob-top"><div class="ob-brand-l">${s.logo?`<img src="${esc(s.logo)}" alt="${esc(s.name)}">`:`<b>${esc(s.name)}</b>`}</div>${last?'':`<div class="ob-steps"><span>${first?'Getting started':'Step '+i+' of '+(n-1)+' · '+esc(label)}</span><div class="ob-bar"><i style="width:${Math.round(i/n*100)}%"></i></div></div>`}<span class="ob-by">Supplier setup · Merchsmith</span></header>
      ${q.get('ghost')?'<div class="sob-ghost">Ghost mode: you’re viewing '+esc(s.name)+'’s setup as Merchsmith. Actions are logged.</div>':''}
      <main class="ob-main"><section class="ob-card">${body(k)}<p class="ob-err" data-err hidden></p></section></main>
      ${last?'':`<footer class="ob-foot"><div class="ob-foot-in">${first?'<span></span>':'<button class="ob-btn ghost" data-back>Back</button>'}<span class="ob-fill"></span>${opt?'<button class="ob-link" data-skip>Skip for now</button>':''}<button class="ob-btn" data-next>${first?'Accept invitation':k==='terms'?'Accept and finish':k==='dd'?'Set up Direct Debit':'Continue'}</button></div></footer>`}`;
    wire(k); scrollTo(0,0); }
  const err=t=>{ const e=root.querySelector('[data-err]'); e.hidden=!t; e.textContent=t||''; };
  function go(x){ i=Math.max(0,Math.min(STEPS.length-1,i+x)); if(STEPS[i][0]==='finish') finish(); draw(); }
  function wire(k){ const $=x=>root.querySelector(x); if(AD) AD.wire(root);
    const nm=$('[data-o="n"]'); if(nm&&N) N.upgrade(nm,{cls:'ob-f'});
    root.querySelectorAll('[data-bc]').forEach(inp=>inp.oninput=()=>{ COL[inp.dataset.bc]=inp.value; inp.parentElement.style.background=inp.value; inp.closest('.ob-col').querySelector('code').textContent=inp.value.toUpperCase(); });
    root.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{ W.kind=b.dataset.kind; draw(); });
    root.querySelectorAll('[data-spec]').forEach(b=>b.onclick=()=>{ const t=b.dataset.spec; W.specs=W.specs.includes(t)?W.specs.filter(y=>y!==t):W.specs.concat([t]); b.classList.toggle('on'); });
    root.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{ const t=b.dataset.region; W.regions=W.regions.includes(t)?W.regions.filter(y=>y!==t):W.regions.concat([t]); b.classList.toggle('on'); });
    root.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>{ W.feed=b.dataset.feed; draw(); });
    const at=$('[data-att]'); if(at) at.onchange=()=>{ const inf=$('[data-o="apiinfo"]'); W.apiDraft=inf?inf.value:''; [...at.files].forEach(fl=>{ if(fl.size>10*1048576) return err(fl.name+' is over 10 MB.'); W.att.push({name:fl.name,size:fl.size,type:fl.type}); }); draw(); const i2=$('[data-o="apiinfo"]'); if(i2&&W.apiDraft) i2.value=W.apiDraft; };
    root.querySelectorAll('[data-attrm]').forEach(b=>b.onclick=()=>{ const inf=$('[data-o="apiinfo"]'); const keep=inf?inf.value:''; W.att.splice(+b.dataset.attrm,1); draw(); const i2=$('[data-o="apiinfo"]'); if(i2) i2.value=keep; });
    const cv=$('[data-csv]'); if(cv) cv.onchange=()=>{ const fl=cv.files[0]; if(fl){ W.csv=fl.name; $('[data-csvname]').textContent=fl.name+' · ready'; } };
    root.querySelectorAll('[data-logo]').forEach(lg=>lg.onchange=()=>{ const fl=lg.files[0]; if(!fl) return; if(fl.size>1.5*1048576) return err('That image is over 1.5 MB.'); const r=new FileReader(); r.onload=()=>{ s[lg.dataset.logo]=r.result; if(!s.logo) s.logo=r.result; saveRec(); draw(); }; r.readAsDataURL(fl); });
    const iv=$('[data-invite]'); if(iv) iv.onclick=()=>{ const e=g('ie'), ie=$('[data-ierr]'); if(!E.test(e)){ ie.hidden=false; ie.textContent='Enter a valid email.'; return; } if((s.contacts||[]).some(u=>String(u.email).toLowerCase()===e.toLowerCase())){ ie.hidden=false; ie.textContent=e+' is already on your team.'; return; }
      s.contacts=(s.contacts||[]).concat([{n:e.split('@')[0],email:e,role:g('ir'),status:'invited'}]); saveRec(); draw(); };
    const bk=$('[data-back]'); if(bk) bk.onclick=()=>go(-1);
    const sk=$('[data-skip]'); if(sk) sk.onclick=()=>{ mark(k,true); go(1); };
    const nx=$('[data-next]'); if(nx) nx.onclick=()=>{ const e=val(k); if(e) return err(e); if(k!=='welcome'){ saveStep(k); mark(k,false); } go(1); }; }
  draw();
})();
