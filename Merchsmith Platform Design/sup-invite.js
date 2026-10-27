/* ============================================================
   sup-invite.js — Invite supplier (Platform Admin + distributors) and
   supplier onboarding tracking in Platform Admin.
   Steps: Organisation · Type & specialisms · Contacts · Logo · Review.
   Duplicate checks (name / website / email). Save as draft.
   Distributor invites become requests: Merchsmith approves before the
   invitation is sent (status 'requested' → 'invited').
   Go-live: supplier finishes onboarding → status 'review' → Merchsmith
   approves in the supplier panel → 'active'.
   Store 'ms-sup-new' {items} (merged into ADMIN.suppliers), onboarding 'ms-sonb'.
   Reuses the .di-* wizard styles from dist-invite.js.
   window.MSSINV: open(draftId?) · progress(id) · ready(id)
   ============================================================ */
window.MSSINV=window.MSSINV||(function(){
  const A=window.ADMIN, OD=window.ORG_DATA||{}, isAdmin=!!A, KEY='ms-sup-new', OKEY='ms-sonb';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const db=()=>{ try{ return Object.assign({items:[]},JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return {items:[]}; } };
  const sdb=()=>{ try{ return JSON.parse(localStorage.getItem(OKEY)||'{}'); }catch(e){ return {}; } };
  const LIST=()=>isAdmin?A.suppliers:(OD.suppliers||[]);
  if(isAdmin) db().items.forEach(r=>{ const i=A.suppliers.findIndex(x=>x.id===r.id); if(i>=0) A.suppliers[i]=r; else A.suppliers.unshift(r); });
  const STEPS=[['you','Your details'],['company','Company & logo'],['type','Type & specialisms'],['feed','Product feed'],['team','Team'],['terms','Terms & Conditions']];
  const REQ=['you','company','type','feed','terms'];
  const legacy=id=>{ const s=LIST().find(x=>x.id===id); return !!s&&!s._wiz; };
  const st=id=>sdb()[id]||{steps:{}};
  const ready=id=>legacy(id)||REQ.every(k=>st(id).steps[k]);
  const progress=id=>legacy(id)?100:Math.round(STEPS.filter(([k])=>st(id).steps[k]).length/STEPS.length*100);
  const norm=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]+/g,' ').replace(/\b(the|ltd|limited|plc|bv|gmbh|inc|group|uk|co|company|europe)\b/g,' ').replace(/\s+/g,' ').trim();
  const dom=s=>String(s||'').toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'').trim();
  function lev(a,b){ let p=[...Array(b.length+1).keys()]; for(let i=1;i<=a.length;i++){ const c=[i]; for(let j=1;j<=b.length;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[b.length]; }
  function orgDup(name,web,self){ const a=norm(name), d=dom(web); const pool=LIST().concat(isAdmin?[]:[]); return pool.filter(x=>x.id!==self&&x.status!=='draft').map(x=>{ const b=norm(x.name), xd=dom(x.domain||x.website);
    if(d&&xd&&d===xd) return {x,lv:'exact',why:'same website'}; if(a&&a===b) return {x,lv:'exact',why:'same name'};
    if(a.length>=3&&b.length>=3&&(1-lev(a,b)/Math.max(a.length,b.length)>=.75||a.includes(b)||b.includes(a))) return {x,lv:'similar',why:'similar name'}; return null; }).filter(Boolean); }
  function emailDup(e){ e=String(e||'').trim().toLowerCase(); if(!e) return null; const L=LIST().flatMap(s=>(s.contacts||[]).concat(s.team||[]).concat([{n:s.contact,email:s.contactEmail}]).map(u=>[u,s.name]));
    const C=(OD.customers||[]).flatMap(c=>(c.teams||[]).flatMap(t=>(t.users||[]).map(u=>[u,c.name]))); const hit=L.concat(C).find(([u])=>String(u&&u.email||'').toLowerCase()===e); return hit?hit[1]+(hit[0].n?' ('+hit[0].n+')':''):null; }
  const SPECS=()=>(window.MSPEOPLE&&MSPEOPLE.specList?MSPEOPLE.specList():['Generalist','Pens & writing','Notebooks & stationery','Drinkware','Bags','Apparel','Tech & gadgets','Eco & sustainable']);
  const TYPES=[['product','Product','Supplies blank products'],['branding','Branding','Decorates products (print, embroidery…)'],['both','Product + branding','Supplies and decorates']];
  const merchTeam=()=>((A&&A.team)||[{n:'Morgan Slade'},{n:'Devin Park'}]).filter(u=>u.status!=='deactivated');
  const who=()=>isAdmin?'Merchsmith':'Mojo Promotions';

  function open(draftId){ const ex=draftId&&LIST().find(s=>s.id===draftId);
    const W=ex&&ex._wiz?JSON.parse(JSON.stringify(ex._wiz)):{id:null,name:'',web:'',addr:{},kind:'both',specs:[],first:'',last:'',email:'',tel:'',users:[],logoSq:'',logoFull:'',colours:{primary:'#4E5BA6',secondary:'#E8EAF6',accent:'#FF6A4D',ink:'#1E2033'},contact:merchTeam()[0].n,note:'',dupOk:false};
    if(ex) W.id=ex.id; let step=0; const S=['Organisation','Type','Contacts','Brand','Review'], AD=window.MSADDR;
    const wrap=document.createElement('div'); wrap.className='di-scrim'; document.body.appendChild(wrap); let dirty=false;
    const close=()=>{ if(dirty&&!confirm('Close without saving?')) return; wrap.remove(); };
    wrap.addEventListener('mousedown',e=>{ if(e.target===wrap) close(); });
    const f=(k,l,v,o)=>`<label class="di-f"><span>${l}${o&&o.req?' <em>*</em>':''}</span><input data-k="${k}" value="${esc(v)}"${o&&o.type?` type="${o.type}"`:''} placeholder="${esc((o&&o.ph)||'')}"></label>`;
    const ew=e=>{ const h=emailDup(e); return h?`<p class="di-w">Already a user at ${esc(h)}</p>`:''; };
    function dupHTML(){ const M=orgDup(W.name,W.web,W.id); if(!M.length) return ''; const s=M.some(m=>m.lv==='exact');
      return `<div class="di-dup${s?' s':''}"><b>${s?'This supplier may already be on Merchsmith':'Similar supplier found'}</b>${M.slice(0,3).map(m=>`<span>${esc(m.x.name)} · ${esc(m.why)}${m.x.domain?' · '+esc(m.x.domain):''}</span>`).join('')}${s?`<label class="di-chk"><input type="checkbox" data-dupok${W.dupOk?' checked':''}> It’s a different company, carry on</label>`:''}${!isAdmin&&s?'<span>If it’s the same supplier, use <b>Connect a supplier</b> instead.</span>':''}</div>`; }
    function body(){
      if(step===0) return `<div class="di-g">${f('name','Company name',W.name,{req:1,ph:'e.g. BagWorks UK'})}${f('web','Website',W.web,{req:1,ph:'bagworks.co.uk'})}</div><div data-dup>${dupHTML()}</div><div class="di-sub">Address <small>optional · they confirm it during onboarding</small></div><div data-addr>${AD?AD.fieldsHTML(W.addr,{required:false}):''}</div>`;
      if(step===1) return `<div class="di-plans">${TYPES.map(([k,l,d])=>`<button type="button" class="di-plan${W.kind===k?' on':''}" data-kind="${k}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
        <div class="di-sub">Specialisms</div><div class="si-tags">${SPECS().map(s=>`<button type="button" class="${W.specs.includes(s)?'on':''}" data-spec="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
      if(step===2) return `<div class="di-sub">Main contact</div><div class="di-g">${f('first','First name',W.first,{req:1})}${f('last','Last name',W.last,{req:1})}${f('email','Email',W.email,{req:1,type:'email'})}${f('tel','Phone',W.tel,{type:'tel'})}</div>${ew(W.email)}
        <div class="di-sub">More contacts <small>optional</small></div>${W.users.map((u,i)=>`<div class="di-ur"><input data-u="${i}:email" value="${esc(u.email)}" placeholder="Email" aria-label="Email"><select data-u="${i}:role" aria-label="Role">${['Admin','Sales','Orders','Accounts','Studio'].map(r=>`<option${r===u.role?' selected':''}>${r}</option>`).join('')}</select><button data-urm="${i}" aria-label="Remove">×</button></div>${ew(u.email)}`).join('')}<button class="di-btn ghost sm" data-uadd>+ Add contact</button>`;
      if(step===3){ const LG=W.logoFull||W.logoSq; return `<div class="di-logos">${[['logoSq','Square logo','Lists and avatars','sq'],['logoFull','Full logo','Supplier profile and PDFs','']].map(([k,l,h,c])=>`<div><div class="di-sub">${l}</div><label class="di-drop ${c}">${W[k]?`<img src="${W[k]}" alt="">`:'<span>Upload</span>'}<input type="file" accept="image/*" data-logo="${k}" hidden></label><small class="di-sm">${h}</small></div>`).join('')}</div>
        ${LG?`<div class="di-sub">Mono logo <small>made from the logo</small></div><div class="di-mono"><span class="lt"><img src="${LG}" alt=""></span><span class="dk"><img src="${LG}" alt=""></span></div>`:''}`; }
      return `<div class="di-rev"><div><b>${esc(W.name)}</b><small>${esc(W.web)} · ${esc((TYPES.find(t=>t[0]===W.kind)||[])[1]||'')}${W.specs.length?' · '+esc(W.specs.join(', ')):''}</small></div><div><b>${esc(W.first+' '+W.last)}</b><small>${esc(W.email)}${W.users.length?' + '+W.users.length+' more':''}</small></div></div>
        ${isAdmin?`<label class="di-f"><span>Merchsmith contact <small>owns their onboarding</small></span><select data-k="contact">${merchTeam().map(u=>`<option${u.n===W.contact?' selected':''}>${esc(u.n)}</option>`).join('')}</select></label>
          <p class="di-sm">They’ll get an email to set up their supplier account: details, type and specialisms, product feed, delivery, bank details, placement billing, team and terms. Merchsmith reviews it before they go live.</p>`
        :`<label class="di-f"><span>Why are you inviting them? <small>for Merchsmith</small></span><input data-k="note" value="${esc(W.note)}" placeholder="e.g. We use them for bags and want them on the platform"></label><p class="di-sm">Merchsmith checks new suppliers before they’re invited. You’ll be notified when it’s approved and they’re invited.</p>`}`; }
    function valid(s){ const e=[], E=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(s===0){ if(!W.name.trim()) e.push('Add the company name.'); if(!W.web.trim()) e.push('Add their website.'); if(orgDup(W.name,W.web,W.id).some(m=>m.lv==='exact')&&!W.dupOk) e.push('This looks like a supplier already on Merchsmith. Tick “It’s a different company” to carry on.'); }
      if(s===1&&!W.specs.length) e.push('Choose at least one specialism.');
      if(s===2){ if(!W.first.trim()||!W.last.trim()) e.push('Add the main contact’s first and last name.'); if(!E.test(W.email)) e.push('Add a valid email for the main contact.'); W.users.forEach(u=>{ if(!E.test(u.email)) e.push((u.email||'An extra contact')+' isn’t a valid email.'); }); }
      return e; }
    function draw(){ wrap.innerHTML=`<div class="di-m" role="dialog" aria-modal="true" aria-label="Invite supplier"><div class="di-h"><div><h3>${W.id?'Finish inviting '+esc(W.name):'Invite supplier'}</h3><small>Step ${step+1} of ${S.length} · ${S[step]}${isAdmin?'':' · needs Merchsmith approval'}</small></div><button class="di-x" data-x aria-label="Close">×</button></div>
        <div class="di-p">${S.map((s,i)=>`<button class="${i<step?'d':i===step?'on':''}" data-go="${i}"${i>step?' disabled':''}><span>${s}</span></button>`).join('')}</div>
        <div class="di-b">${body()}${isAdmin&&step===0&&window.MSAddSupplier&&MSAddSupplier.drawer?'<p class="di-sm"><a href="#" data-full>Set up a supplier in full instead ›</a> For suppliers who won’t log in.</p>':''}<p class="di-err" data-err hidden></p></div>
        <div class="di-ft"><button class="di-btn ghost" data-draft>Save as draft</button><span></span>${step?'<button class="di-btn ghost" data-back>Back</button>':''}${step<S.length-1?'<button class="di-btn" data-next>Next</button>':`<button class="di-btn" data-send>${isAdmin?'Send invitation':'Send to Merchsmith'}</button>`}</div></div>`; wire(); }
    const err=L=>{ const e=wrap.querySelector('[data-err]'); e.hidden=!L.length; e.innerHTML=L.map(esc).join('<br>'); };
    function wire(){ const $=s=>wrap.querySelector(s);
      if(AD) AD.wire(wrap); const ab=$('[data-addr]'); if(ab){ const h=()=>{ W.addr=AD.read(ab); dirty=true; }; ab.addEventListener('input',h); ab.addEventListener('change',h); }
      wrap.querySelectorAll('[data-k]').forEach(i=>{ const h=()=>{ W[i.dataset.k]=i.value; dirty=true; if(i.dataset.k==='name'||i.dataset.k==='web'){ W.dupOk=false; const d=$('[data-dup]'); d.innerHTML=dupHTML(); const c=d.querySelector('[data-dupok]'); if(c) c.onchange=()=>W.dupOk=c.checked; } }; i.addEventListener('input',h); i.addEventListener('change',h); });
      const c0=$('[data-dupok]'); if(c0) c0.onchange=()=>W.dupOk=c0.checked;
      wrap.querySelectorAll('[data-k="email"],[data-u$=":email"]').forEach(i=>i.addEventListener('change',draw));
      wrap.querySelectorAll('[data-u]').forEach(i=>{ const h=()=>{ const [x,k]=i.dataset.u.split(':'); W.users[+x][k]=i.value; dirty=true; }; i.addEventListener('input',h); i.addEventListener('change',h); });
      wrap.querySelectorAll('[data-urm]').forEach(b=>b.onclick=()=>{ W.users.splice(+b.dataset.urm,1); draw(); });
      const ua=$('[data-uadd]'); if(ua) ua.onclick=()=>{ W.users.push({email:'',role:'Orders'}); draw(); };
      wrap.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{ W.kind=b.dataset.kind; draw(); });
      wrap.querySelectorAll('[data-spec]').forEach(b=>b.onclick=()=>{ const s=b.dataset.spec; W.specs=W.specs.includes(s)?W.specs.filter(x=>x!==s):W.specs.concat([s]); b.classList.toggle('on'); dirty=true; });
      wrap.querySelectorAll('[data-logo]').forEach(lg=>lg.onchange=()=>{ const fl=lg.files[0]; if(!fl) return; if(fl.size>1.5*1048576) return err(['That image is over 1.5 MB.']); const r=new FileReader(); r.onload=()=>{ W[lg.dataset.logo]=r.result; dirty=true; draw(); }; r.readAsDataURL(fl); });
      wrap.querySelectorAll('[data-col]').forEach(i=>i.oninput=()=>{ W.colours=W.colours||{}; W.colours[i.dataset.col]=i.value; i.parentElement.style.background=i.value; i.closest('label').querySelector('code').textContent=i.value.toUpperCase(); dirty=true; });
      const fu=$('[data-full]'); if(fu) fu.onclick=e=>{ e.preventDefault(); wrap.remove(); MSAddSupplier.drawer(); };
      wrap.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ if(+b.dataset.go<=step){ step=+b.dataset.go; draw(); } });
      $('[data-x]').onclick=close; const bk=$('[data-back]'); if(bk) bk.onclick=()=>{ step--; draw(); };
      const nx=$('[data-next]'); if(nx) nx.onclick=()=>{ const e=valid(step); if(e.length) return err(e); step++; draw(); };
      $('[data-draft]').onclick=()=>{ if(!W.name.trim()){ step=0; draw(); return err(['Add at least the company name to save a draft.']); } commit('draft'); wrap.remove(); toast('Draft saved · '+W.name); };
      const sd=$('[data-send]'); if(sd) sd.onclick=()=>{ for(let s=0;s<3;s++){ const e=valid(s); if(e.length){ step=s; draw(); return err(e); } } commit(isAdmin?'invited':'requested'); wrap.remove(); toast(isAdmin?'Invitation sent to '+W.email:'Sent to Merchsmith for approval'); }; }
    function commit(status){ const o=db(), id=W.id||(norm(W.name).replace(/ /g,'-')||'supplier')+'-'+Date.now().toString(36).slice(-4); W.id=id;
      const ini=W.name.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const rec=Object.assign({},(o.items.find(x=>x.id===id)||{}),{id,name:W.name.trim(),initials:ini,domain:dom(W.web),kind:W.kind,specialisms:W.specs,status,products:0,usedBy:0,feed:'Not connected',contact:(W.first+' '+W.last).trim(),contactEmail:W.email,
        contacts:[{n:(W.first+' '+W.last).trim(),email:W.email,tel:W.tel,role:'Admin',status:'invited'}].concat(W.users.map(u=>({n:u.email.split('@')[0],email:u.email,role:u.role,status:'invited'}))),logo:W.logoFull||W.logoSq,logoSq:W.logoSq,brand:{colours:Object.assign({},W.colours||{})},onboardingOwner:W.contact,
        requestedBy:isAdmin?'':who(),requestNote:W.note,createdAt:new Date().toISOString(),since:new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'}),_wiz:JSON.parse(JSON.stringify(W))},window.MSADDR&&MSADDR.has(W.addr)?Object.assign({},W.addr,{address:MSADDR.text(W.addr)}):{});
      o.items=o.items.filter(x=>x.id!==id); o.items.unshift(rec); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){ alert('Couldn’t save: logo too big for this browser.'); return; }
      if(isAdmin){ const i=A.suppliers.findIndex(x=>x.id===id); if(i>=0) A.suppliers[i]=rec; else A.suppliers.unshift(rec); document.querySelectorAll('#supSearch').forEach(s=>s.dispatchEvent(new Event('input',{bubbles:true}))); }
      if(status==='invited') try{ localStorage.setItem('ms-sonb-latest',id); }catch(e){}
      if(status==='requested') try{ if(window.MSNOTIF) MSNOTIF.push('admin',{ev:'dist_new',title:'Supplier invite to approve: '+rec.name,body:who()+' wants to invite '+rec.name+(W.note?': “'+W.note+'”':''),href:'Merchsmith Admin.html#nav=suppliers'}); }catch(e){} }
    draw(); }
  function toast(m){ const t=document.createElement('div'); t.textContent=m; t.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font:600 13.5px var(--sans);padding:12px 20px;border-radius:12px;z-index:1900'; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
  function saveRec(r){ const o=db(); const i=o.items.findIndex(x=>x.id===r.id); if(i>=0){ o.items[i]=r; localStorage.setItem(KEY,JSON.stringify(o)); } }

  // buttons: Admin "Add supplier" → "Invite supplier"; distributors get "Invite supplier" beside Connect a supplier
  function hookButtons(){ const q=document.getElementById('qInviteSup'); if(q&&!q._si){ q._si=1; q.lastChild.textContent='Invite supplier'; q.addEventListener('click',e=>{ e.preventDefault(); e.stopImmediatePropagation(); open(); },true); }
    const c=document.getElementById('connectSupBtn'); if(c&&!document.getElementById('inviteSupBtn')){ const b=document.createElement('button'); b.className='btn ghost'; b.id='inviteSupBtn'; b.innerHTML='<svg class="icn"><use href="#i-plus"/></svg>Invite supplier'; b.onclick=()=>open(); c.after(b); } }
  document.addEventListener('click',e=>{ const r=e.target.closest('tr[data-sup]'); if(!r||!isAdmin) return; const s=A.suppliers.find(x=>x.id===r.dataset.sup); if(s&&s.status==='draft'){ e.preventDefault(); e.stopImmediatePropagation(); open(s.id); } },true);

  /* ---- Admin tracking ---- */
  function remind(id,auto){ const o=sdb(); const s=o[id]=o[id]||{steps:{}}; (s.reminders=s.reminders||[]).push({at:new Date().toISOString(),auto:!!auto}); localStorage.setItem(OKEY,JSON.stringify(o)); }
  function decorate(){ const tb=document.getElementById('supRows'); if(!tb) return; const hr=tb.closest('table').querySelector('thead tr');
    if(hr&&!hr.querySelector('.si-th')){ const th=document.createElement('th'); th.className='si-th'; th.textContent='Onboarding'; hr.insertBefore(th,hr.lastElementChild&&!hr.lastElementChild.textContent.trim()?hr.lastElementChild:null); }
    const th=hr&&hr.querySelector('.si-th'), idx=th?[...hr.children].indexOf(th):-1;
    tb.querySelectorAll('tr[data-sup]').forEach(r=>{ if(r.querySelector('.si-td')) return; const s=A.suppliers.find(x=>x.id===r.dataset.sup)||{}, p=progress(s.id), td=document.createElement('td'); td.className='si-td';
      td.innerHTML=s.status==='draft'?'<span class="di-pill">Draft</span>':s.status==='requested'?'<span class="di-pill">To approve</span>':s.status==='review'?'<span class="di-pill si-rev">Ready to review</span>':p>=100?'<span class="di-ok">Complete</span>':`<span class="di-pr"><i style="--p:${p}%"></i>${p}%</span>`;
      r.insertBefore(td,idx>=0&&r.children[idx]?r.children[idx]:null); }); }
  function drawerBlock(){ const dr=document.getElementById('drawer'); if(!dr||!dr.dataset.supid||dr.querySelector('.si-onb')) return; const id=dr.dataset.supid, s=A.suppliers.find(x=>x.id===id); if(!s||legacy(id)) return; const body=dr.querySelector('.dwr-body'); if(!body) return;
    const o=st(id), p=progress(id), fd=x=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short'}), last=(o.reminders||[]).slice(-1)[0];
    const el=document.createElement('details'); el.className='dwr-sec si-onb onb-fold'; if(s.status==='requested'||s.status==='review') el.open=true;
    el.innerHTML=`<summary class="sec-hd"><h4>${s.status==='requested'?'Invite request':'Onboarding · '+(s.status==='review'?'ready to review':p+'%')}</h4>${s.status==='invited'&&p<100?'<a class="seclink" href="#" data-sirem>Send reminder ›</a>':''}</summary>
      ${s.status==='requested'?`<p class="di-sm">${esc(s.requestedBy)} asked to invite ${esc(s.name)}${s.requestNote?': “'+esc(s.requestNote)+'”':''}. Contact: ${esc(s.contact)} · ${esc(s.contactEmail)}.</p><div class="si-acts"><button class="di-btn" data-siapprove>Approve & send invitation</button><button class="di-btn ghost" data-sidecline>Decline</button></div>`
      :`${STEPS.map(([k,l])=>{ const x=o.steps[k]; return `<div class="di-or${x&&!x.skipped?' ok':''}"><i>${x&&!x.skipped?'✓':''}</i><span>${esc(l)}${REQ.includes(k)?'':' <small>optional</small>'}</span><small>${x?(x.skipped?'Skipped':esc(x.by||'')+' · '+fd(x.at)):'Not done'}</small></div>`; }).join('')}
        <p class="di-sm">${s.status==='review'?'All required steps are done. Check their details, then approve to make their products visible to distributors.':'Products stay hidden from distributors until they finish and Merchsmith approves.'} Onboarding owner: ${esc(s.onboardingOwner||'—')}.${last?' Last reminder '+fd(last.at)+(last.auto?' (automatic)':'')+'.':''}</p>
        <div class="si-acts">${s.status==='review'?'<button class="di-btn" data-silive>Approve & go live</button>':''}<button class="di-btn ghost" data-sighost>Ghost into ${esc(s.name)}</button></div>`}`;
    const kc=body.querySelector('.kc'), after=kc&&kc.closest('.dwr-sec'); after?after.after(el):body.prepend(el);
    const on=(sel,fn)=>{ const b=el.querySelector(sel); if(b) b.onclick=e=>{ e.preventDefault(); fn(); el.remove(); drawerBlock(); }; };
    on('[data-sirem]',()=>{ remind(id,false); toast('Reminder sent to '+s.contact); });
    on('[data-siapprove]',()=>{ s.status='invited'; saveRec(s); localStorage.setItem('ms-sonb-latest',id); toast('Approved · invitation sent to '+s.contactEmail); try{ if(window.MSNOTIF) MSNOTIF.push('distributor',{ev:'cust_new',title:'Supplier invite approved: '+s.name,body:'Merchsmith approved your request and invited '+s.contact+'.',href:'Merchsmith Organisations.html#tab=suppliers'}); }catch(e){} });
    on('[data-sidecline]',()=>{ const why=prompt('Reason for declining (sent to '+s.requestedBy+'):',''); if(why===null) return; s.status='declined'; s.declineNote=why; saveRec(s); toast('Request declined'); });
    on('[data-silive]',()=>{ s.status='active'; saveRec(s); toast(s.name+' is live'); });
    const gh=el.querySelector('[data-sighost]'); if(gh) gh.onclick=e=>{ e.preventDefault(); if(!confirm('Ghost into '+s.name+'? Every action is logged to the audit trail.')) return; window.open('Merchsmith Supplier Onboarding.html?s='+encodeURIComponent(id)+'&ghost=1','_blank'); }; }
  function autoRemind(){ if(!isAdmin) return; const now=Date.now(), DAY=864e5; A.suppliers.forEach(s=>{ if(s.status!=='invited'||ready(s.id)) return; const o=st(s.id), acts=[s.createdAt].concat(Object.values(o.steps||{}).map(x=>x.at)).filter(Boolean).map(x=>+new Date(x)); if(!acts.length) return;
    const idle=(now-Math.max(...acts))/DAY, sent=(o.reminders||[]).filter(r=>r.auto&&+new Date(r.at)>Math.max(...acts)).length; if((idle>=3&&sent<1)||(idle>=7&&sent<2)) remind(s.id,true); }); }
  const go=()=>{ hookButtons(); if(isAdmin){ decorate(); drawerBlock(); new MutationObserver(()=>{ decorate(); drawerBlock(); hookButtons(); }).observe(document.body,{childList:true,subtree:true}); setTimeout(autoRemind,1500); } };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go();
  const css=`.si-tags{display:flex;flex-wrap:wrap;gap:6px;} .si-tags button{font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;color:var(--ink-2);border-radius:999px;padding:5px 12px;cursor:pointer;} .si-tags button.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);color:var(--periwinkle-deep);}
  .si-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;} .si-rev{border-style:solid!important;background:#fbeccd;color:#8a5a12!important;border-color:#f1d49a!important;}`;
  const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  return {open,progress,ready,STEPS,REQ,legacy};
})();
