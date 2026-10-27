/* ============================================================
   dist-invite.js — Platform Admin → Invite distributor (step wizard) +
   onboarding tracking for distributors.
   Steps: Organisation · People · Plan · Brand · Review. Duplicate checks on
   name / website (existing distributors) and emails (any org). Save as draft.
   New records: localStorage 'ms-dist-new' merged into ADMIN.distributors.
   Tracking: Onboarding column on #distRows, checklist in the distributor
   drawer, automatic reminders after 3 / 7 idle days, owner notified on finish.
   Reads onboarding state from 'ms-donb' (dist-onboarding.js).
   window.MSDINV: open(draftId?) · progress(id) · ready(id)
   ============================================================ */
window.MSDINV=window.MSDINV||(function(){
  const A=window.ADMIN||{distributors:[],team:[]}, KEY='ms-dist-new', OKEY='ms-donb';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const db=()=>{ try{ return Object.assign({items:[]},JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return {items:[]}; } };
  const ob=()=>{ try{ return JSON.parse(localStorage.getItem(OKEY)||'{}'); }catch(e){ return {}; } };
  // sample invited distributor, part-way through onboarding (so the invite + onboarding views have something to show)
  (function seedMega(){ if(A.distributors.some(x=>x.id==='mega-merchandise')) return; const now=Date.now(), DAY=864e5, iso=n=>new Date(now-n*DAY).toISOString();
    const W={id:'mega-merchandise',name:'Mega Merchandise',web:'megamerchandise.co.uk',addr:{addr1:'Unit 12, Riverside Park',addr2:'Canal Road',city:'Leeds',county:'West Yorkshire',postcode:'LS12 2DQ',country:'United Kingdom'},first:'Hannah',last:'Price',email:'hannah@megamerchandise.co.uk',tel:'0113 496 0871',
      users:[{email:'raj@megamerchandise.co.uk',role:'Account Manager'},{email:'accounts@megamerchandise.co.uk',role:'Finance User'}],plan:'Growth',trial:'0',brand:{logo:'',logoSq:'',logoFull:'',mono:'auto',colours:{primary:'#E0462F',secondary:'#FDEDEA',accent:'#1F7A8C',ink:'#1B1F2A'}},contact:((A.team||[])[1]||{n:'Devin Park'}).n,dupOk:false};
    A.distributors.push({id:W.id,name:W.name,initials:'MM',domain:W.web,plan:'Growth',status:'invited',since:new Date(now-5*DAY).toLocaleDateString('en-GB',{month:'short',year:'numeric'}),mrr:'£0',customers:0,owner:'Hannah Price',ownerEmail:W.email,trialDays:0,brand:W.brand,
      team:W.users.map(u=>({n:u.email.split('@')[0],email:u.email,role:u.role,status:'invited'})),onboardingOwner:W.contact,createdAt:iso(5),address:'Unit 12, Riverside Park, Canal Road, Leeds, West Yorkshire, LS12 2DQ',_wiz:W,_seed:true});
    try{ const o=JSON.parse(localStorage.getItem(OKEY)||'{}'); if(!o[W.id]){ o[W.id]={steps:{you:{by:'Hannah Price',at:iso(4)},company:{by:'Hannah Price',at:iso(4)}},started:iso(4),reminders:[{at:iso(1),auto:true}]}; localStorage.setItem(OKEY,JSON.stringify(o)); } }catch(e){} })();
  db().items.forEach(r=>{ const i=A.distributors.findIndex(x=>x.id===r.id); if(i>=0) A.distributors[i]=r; else A.distributors.unshift(r); });
  const STEPS_REQ=[['you','Owner details'],['company','Company & billing'],['plan','Plan & payment'],['brand','Brand'],['domain','Store domain'],['team','Team'],['email','Email sending domain']];
  const REQ=['you','company','plan','brand','domain'];
  const legacy=id=>{ const d=A.distributors.find(x=>x.id===id); return !!d&&!d._wiz&&d.status!=='invited'; };
  const st=id=>(ob()[id]||{steps:{}});
  const ready=id=>legacy(id)||REQ.every(k=>st(id).steps[k]);
  const progress=id=>legacy(id)?100:Math.round(STEPS_REQ.filter(([k])=>st(id).steps[k]).length/STEPS_REQ.length*100);
  const norm=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]+/g,' ').replace(/\b(the|ltd|limited|plc|llp|inc|group|uk|co|company|promotions?|promo|merch)\b/g,' ').replace(/\s+/g,' ').trim();
  const dom=s=>String(s||'').toLowerCase().replace(/^https?:\/\//,'').replace(/^(www|shop)\./,'').replace(/\/.*$/,'').trim();
  function lev(a,b){ let p=[...Array(b.length+1).keys()]; for(let i=1;i<=a.length;i++){ const c=[i]; for(let j=1;j<=b.length;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[b.length]; }
  function orgDup(name,web,self){ const a=norm(name), d=dom(web); return A.distributors.filter(x=>x.id!==self&&x.status!=='draft').map(x=>{ const b=norm(x.name), xd=dom(x.domain);
    if(d&&xd&&(d===xd||xd.endsWith('.'+d))) return {x,lv:'exact',why:'same website'}; if(a&&a===b) return {x,lv:'exact',why:'same name'};
    if(a.length>=3&&b.length>=3&&(1-lev(a,b)/Math.max(a.length,b.length)>=.75||a.includes(b)||b.includes(a))) return {x,lv:'similar',why:'similar name'}; return null; }).filter(Boolean); }
  function emailDup(e){ e=String(e||'').trim().toLowerCase(); if(!e) return null; const D=window.ORG_DATA||{};
    const pools=[[A.team||[],'Merchsmith']].concat(A.distributors.map(d=>[[{n:d.owner,email:d.ownerEmail}].concat(d.team||[]),d.name])).concat((D.customers||[]).map(c=>[(c.teams||[]).flatMap(t=>t.users||[]),c.name]));
    for(const [L,org] of pools){ const u=L.find(u=>String(u&&u.email||'').toLowerCase()===e); if(u) return org+(u.n?' ('+u.n+')':''); } return null; }
  const PLANS=[['Starter','£250 / month','Up to 3 seats · 1 store · standard support'],['Growth','£750 / month','Up to 10 seats · priority support'],['Scale','£1,200 / month','Unlimited seats · multiple stores · account manager']];
  const ROLES=['Admin / Owner','Account Manager','Studio / Designer','Production Manager','Finance User'];
  const CW=[['primary','Primary','#4E5BA6'],['secondary','Secondary','#E8EAF6'],['accent','Accent','#FF6A4D'],['ink','Text','#1E2033']];
  const me=()=>((A.team||[])[0]||{n:'Morgan Slade'}).n;

  function open(draftId){ const ex=draftId&&A.distributors.find(d=>d.id===draftId);
    const W=ex&&ex._wiz?JSON.parse(JSON.stringify(ex._wiz)):{id:null,name:'',web:'',addr:{},first:'',last:'',email:'',tel:'',users:[],plan:'Growth',trial:'14',brand:{logo:'',logoSq:'',logoFull:'',mono:'auto',colours:Object.fromEntries(CW.map(c=>[c[0],c[2]]))},contact:me(),dupOk:false};
    if(ex) W.id=ex.id; let step=0; const S=['Organisation','People','Plan','Brand','Review'];
    const wrap=document.createElement('div'); wrap.className='di-scrim'; document.body.appendChild(wrap); let dirty=false;
    const close=()=>{ if(dirty&&!confirm('Close without saving? Use “Save as draft” to keep it.')) return; wrap.remove(); };
    wrap.addEventListener('mousedown',e=>{ if(e.target===wrap) close(); });
    const f=(k,l,v,o)=>`<label class="di-f${o&&o.w?' w':''}"><span>${l}${o&&o.req?' <em>*</em>':''}</span><input data-k="${k}" value="${esc(v)}"${o&&o.type?` type="${o.type}"`:''} placeholder="${esc((o&&o.ph)||'')}"></label>`;
    const AD=window.MSADDR;
    function dupHTML(){ const M=orgDup(W.name,W.web,W.id); if(!M.length) return ''; const s=M.some(m=>m.lv==='exact');
      return `<div class="di-dup${s?' s':''}"><b>${s?'This distributor may already exist':'Similar distributor found'}</b>${M.slice(0,3).map(m=>`<span>${esc(m.x.name)} · ${esc(m.why)}${m.x.domain?' · '+esc(m.x.domain):''} · ${esc(m.x.status)}</span>`).join('')}${s?`<label class="di-chk"><input type="checkbox" data-dupok${W.dupOk?' checked':''}> It’s a different company, carry on</label>`:''}</div>`; }
    const ew=e=>{ const h=emailDup(e); return h?`<p class="di-w">Already a user at ${esc(h)}</p>`:''; };
    function body(){ const b=W.brand;
      if(step===0) return `<div class="di-g">${f('name','Company name',W.name,{req:1,ph:'e.g. Brightside Promo'})}${f('web','Website',W.web,{req:1,ph:'brightsidepromo.com'})}</div><div data-dup>${dupHTML()}</div><div class="di-sub">Billing address</div><div data-addr>${AD?AD.fieldsHTML(W.addr):''}</div>`;
      if(step===1) return `<div class="di-sub">Owner <small>their main contact and first Admin</small></div><div class="di-g">${f('first','First name',W.first,{req:1})}${f('last','Last name',W.last,{req:1})}${f('email','Email',W.email,{req:1,type:'email'})}${f('tel','Phone',W.tel,{type:'tel'})}</div>${ew(W.email)}
        <div class="di-sub">More people <small>optional · each role is a billable seat</small></div>${W.users.map((u,i)=>`<div class="di-ur"><input data-u="${i}:email" value="${esc(u.email)}" placeholder="Email" aria-label="Email"><select data-u="${i}:role" aria-label="Role">${ROLES.map(r=>`<option${r===u.role?' selected':''}>${r}</option>`).join('')}</select><button data-urm="${i}" aria-label="Remove">×</button></div>${ew(u.email)}`).join('')}<button class="di-btn ghost sm" data-uadd>+ Add person</button>`;
      if(step===2) return `<div class="di-plans">${PLANS.map(([p,pr,d])=>`<button type="button" class="di-plan${W.plan===p?' on':''}" data-plan="${p}"><b>${p}</b><span>${pr}</span><small>${d}</small></button>`).join('')}</div>
        <p class="di-sm">1 month minimum. The first month is charged on day 1 when they set up payment, then monthly in advance. They add card or Direct Debit details and accept the terms during onboarding; the store goes live once that’s done.</p>`;
      const LG=b.logoFull||b.logoSq||b.logo;
      if(step===3) return `<div class="di-logos">${[['logoSq','Square logo','Lists, chat and avatars','sq'],['logoFull','Full logo','Header, store and PDFs','']].map(([key,l,h,c])=>`<div><div class="di-sub">${l}</div><label class="di-drop ${c}">${b[key]?`<img src="${b[key]}" alt="">`:'<span>Upload</span>'}<input type="file" accept="image/*" data-logo="${key}" hidden></label><small class="di-sm">${h}</small></div>`).join('')}</div>
        <div class="di-sub">Mono logo</div><div class="di-seg"><button type="button" class="${b.mono!=='upload'?'on':''}" data-mono="auto">Make from logo</button><button type="button" class="${b.mono==='upload'?'on':''}" data-mono="upload">Upload later</button></div>${LG&&b.mono!=='upload'?`<div class="di-mono"><span class="lt"><img src="${LG}" alt=""></span><span class="dk"><img src="${LG}" alt=""></span></div>`:''}
        <div class="di-sub">Platform colourway</div><div class="di-cols">${CW.map(([k,l])=>`<label class="di-col"><span style="background:${esc(b.colours[k])}"><input type="color" data-col="${k}" value="${esc(b.colours[k])}"></span>${l}<code>${esc(b.colours[k].toUpperCase())}</code></label>`).join('')}</div>`;
      return `<div class="di-rev"><div><b>${esc(W.name)}</b><small>${esc(W.web)}${AD?' · '+esc(AD.text(W.addr)):''}</small></div><div><b>${esc(W.first+' '+W.last)}</b><small>${esc(W.email)} · owner${W.users.length?' + '+W.users.length+' more':''}</small></div><div><b>${esc(W.plan)}</b><small>Charged monthly in advance from day 1 · 1 month minimum</small></div></div>
        <label class="di-f"><span>Merchsmith contact <small>owns their onboarding and gets notified</small></span><select data-k="contact">${(A.team||[]).filter(u=>u.status!=='deactivated').map(u=>`<option${u.n===W.contact?' selected':''}>${esc(u.n)}</option>`).join('')}</select></label>
        <p class="di-sm">They’ll get an email with a link to set up their platform: details, plan and payment, brand, store domain, team and email domain.</p>`; }
    function valid(s){ const e=[]; const E=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(s===0){ if(!W.name.trim()) e.push('Add the company name.'); if(!W.web.trim()) e.push('Add their website.'); if(orgDup(W.name,W.web,W.id).some(m=>m.lv==='exact')&&!W.dupOk) e.push('This looks like an existing distributor. Tick “It’s a different company” to carry on.'); if(AD) AD.validate(W.addr,'Billing address').forEach(x=>e.push(x)); }
      if(s===1){ if(!W.first.trim()||!W.last.trim()) e.push('Add the owner’s first and last name.'); if(!E.test(W.email)) e.push('Add a valid owner email.'); W.users.forEach(u=>{ if(!E.test(u.email)) e.push((u.email||'An extra person')+' isn’t a valid email.'); }); }
      return e; }
    function draw(){ wrap.innerHTML=`<div class="di-m" role="dialog" aria-modal="true" aria-label="Invite distributor"><div class="di-h"><div><h3>${W.id?'Finish inviting '+esc(W.name):'Invite distributor'}</h3><small>Step ${step+1} of ${S.length} · ${S[step]}</small></div><button class="di-x" data-x aria-label="Close">×</button></div>
        <div class="di-p">${S.map((s,i)=>`<button class="${i<step?'d':i===step?'on':''}" data-go="${i}"${i>step?' disabled':''}><span>${s}</span></button>`).join('')}</div>
        <div class="di-b">${body()}<p class="di-err" data-err hidden></p></div>
        <div class="di-ft"><button class="di-btn ghost" data-draft>Save as draft</button><span></span>${step?'<button class="di-btn ghost" data-back>Back</button>':''}${step<S.length-1?'<button class="di-btn" data-next>Next</button>':'<button class="di-btn" data-send>Send invitation</button>'}</div></div>`; wire(); }
    const err=L=>{ const e=wrap.querySelector('[data-err]'); e.hidden=!L.length; e.innerHTML=L.map(esc).join('<br>'); };
    function wire(){ const $=s=>wrap.querySelector(s);
      if(AD) AD.wire(wrap); const ab=$('[data-addr]'); if(ab){ const h=()=>{ W.addr=AD.read(ab); dirty=true; }; ab.addEventListener('input',h); ab.addEventListener('change',h); }
      wrap.querySelectorAll('[data-k]').forEach(i=>{ const h=()=>{ W[i.dataset.k]=i.value; dirty=true; if(i.dataset.k==='name'||i.dataset.k==='web'){ W.dupOk=false; const d=$('[data-dup]'); d.innerHTML=dupHTML(); const c=d.querySelector('[data-dupok]'); if(c) c.onchange=()=>W.dupOk=c.checked; } }; i.addEventListener('input',h); i.addEventListener('change',h); });
      const c0=$('[data-dupok]'); if(c0) c0.onchange=()=>W.dupOk=c0.checked;
      wrap.querySelectorAll('[data-k="email"],[data-u$=":email"]').forEach(i=>i.addEventListener('change',draw));
      wrap.querySelectorAll('[data-u]').forEach(i=>{ const h=()=>{ const [x,k]=i.dataset.u.split(':'); W.users[+x][k]=i.value; dirty=true; }; i.addEventListener('input',h); i.addEventListener('change',h); });
      wrap.querySelectorAll('[data-urm]').forEach(b=>b.onclick=()=>{ W.users.splice(+b.dataset.urm,1); draw(); });
      const ua=$('[data-uadd]'); if(ua) ua.onclick=()=>{ W.users.push({email:'',role:'Account Manager'}); draw(); };
      wrap.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{ W.plan=b.dataset.plan; dirty=true; draw(); });
      wrap.querySelectorAll('[data-logo]').forEach(lg=>lg.onchange=()=>{ const fl=lg.files[0]; if(!fl) return; if(fl.size>1.5*1048576) return err(['That image is over 1.5 MB.']); const r=new FileReader(); r.onload=()=>{ W.brand[lg.dataset.logo]=r.result; W.brand.logo=W.brand.logoFull||W.brand.logoSq; dirty=true; draw(); }; r.readAsDataURL(fl); });
      wrap.querySelectorAll('[data-mono]').forEach(b=>b.onclick=()=>{ W.brand.mono=b.dataset.mono; draw(); });
      wrap.querySelectorAll('[data-col]').forEach(i=>i.oninput=()=>{ W.brand.colours[i.dataset.col]=i.value; i.parentElement.style.background=i.value; i.closest('label').querySelector('code').textContent=i.value.toUpperCase(); dirty=true; });
      wrap.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ if(+b.dataset.go<=step){ step=+b.dataset.go; draw(); } });
      $('[data-x]').onclick=close; const bk=$('[data-back]'); if(bk) bk.onclick=()=>{ step--; draw(); };
      const nx=$('[data-next]'); if(nx) nx.onclick=()=>{ const e=valid(step); if(e.length) return err(e); step++; draw(); };
      $('[data-draft]').onclick=()=>{ if(!W.name.trim()){ step=0; draw(); return err(['Add at least the company name to save a draft.']); } commit('draft'); wrap.remove(); toast('Draft saved · '+W.name); };
      const sd=$('[data-send]'); if(sd) sd.onclick=()=>{ for(let s=0;s<2;s++){ const e=valid(s); if(e.length){ step=s; draw(); return err(e); } } commit('invited'); wrap.remove(); toast('Invitation sent to '+W.email); }; }
    function commit(status){ const o=db(), id=W.id||(norm(W.name).replace(/ /g,'-')||'distributor')+'-'+Date.now().toString(36).slice(-4); W.id=id;
      const ini=W.name.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const rec=Object.assign({},A.distributors.find(d=>d.id===id)||{},{id,name:W.name.trim(),initials:ini,domain:dom(W.web),plan:W.plan,status,since:new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'}),mrr:'£0',customers:0,
        owner:(W.first+' '+W.last).trim(),ownerEmail:W.email,trialDays:0,logo:W.brand.logoFull||W.brand.logoSq||W.brand.logo,logoSq:W.brand.logoSq||'',brand:W.brand,team:W.users.map(u=>({n:u.email.split('@')[0],email:u.email,role:u.role,status:'invited'})),onboardingOwner:W.contact,createdAt:new Date().toISOString(),_wiz:JSON.parse(JSON.stringify(W))},AD?{address:AD.text(W.addr)}:{});
      o.items=o.items.filter(x=>x.id!==id); o.items.unshift(rec); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){ alert('Couldn’t save: logo too big for this browser.'); return; }
      const i=A.distributors.findIndex(x=>x.id===id); if(i>=0) A.distributors[i]=rec; else A.distributors.unshift(rec);
      if(status==='invited') try{ localStorage.setItem('ms-donb-latest',id); }catch(e){}
      document.querySelectorAll('#distSearch').forEach(s=>s.dispatchEvent(new Event('input',{bubbles:true}))); }
    draw(); }
  function toast(m){ const t=document.createElement('div'); t.textContent=m; t.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font:600 13.5px var(--sans);padding:12px 20px;border-radius:12px;z-index:1900'; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }

  // replace the old invite form: any "Invite distributor" control opens the wizard
  document.addEventListener('click',e=>{ const b=e.target.closest('button,a'); if(!b||!/^\s*\+?\s*Invite distributor\s*$/i.test(b.textContent)) return; e.preventDefault(); e.stopImmediatePropagation(); open(); },true);
  // drafts reopen the wizard
  document.addEventListener('click',e=>{ const r=e.target.closest('tr[data-dist]'); if(!r) return; const d=A.distributors.find(x=>x.id===r.dataset.dist); if(d&&d.status==='draft'){ e.preventDefault(); e.stopImmediatePropagation(); open(d.id); } },true);

  /* ---- tracking: table column, drawer checklist, reminders ---- */
  function remind(id,auto){ const o=ob(); const s=o[id]=o[id]||{steps:{}}; (s.reminders=s.reminders||[]).push({at:new Date().toISOString(),auto:!!auto}); localStorage.setItem(OKEY,JSON.stringify(o)); }
  function decorate(){ const tb=document.getElementById('distRows'); if(!tb) return; const tbl=tb.closest('table'), hr=tbl&&tbl.querySelector('thead tr');
    if(hr&&!hr.querySelector('.di-th')){ const th=document.createElement('th'); th.className='di-th'; th.textContent='Onboarding'; const last=hr.lastElementChild; hr.insertBefore(th,last&&!last.textContent.trim()?last:null); }
    tb.querySelectorAll('tr[data-dist]').forEach(r=>{ if(r.querySelector('.di-td')) return; const id=r.dataset.dist, d=A.distributors.find(x=>x.id===id); const td=document.createElement('td'); td.className='di-td';
      const p=progress(id); td.innerHTML=d&&d.status==='draft'?'<span class="di-pill">Draft</span>':p>=100?'<span class="di-ok">Complete</span>':`<span class="di-pr"><i style="--p:${p}%"></i>${p}%</span>`;
      const th=hr&&hr.querySelector('.di-th'), idx=th?[...hr.children].indexOf(th):-1; r.insertBefore(td,idx>=0&&r.children[idx]?r.children[idx]:null); }); }
  function drawerBlock(){ const dr=document.getElementById('drawer'); if(!dr||!dr.dataset.distid||dr.querySelector('.di-onb')) return; const id=dr.dataset.distid; if(legacy(id)) return; const body=dr.querySelector('.dwr-body'); if(!body) return;
    const s=st(id), d=A.distributors.find(x=>x.id===id)||{}, fd=x=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short'}), p=progress(id), last=(s.reminders||[]).slice(-1)[0];
    const el=document.createElement('details'); el.className='dwr-sec di-onb onb-fold';
    el.innerHTML=`<summary class="sec-hd"><h4>Onboarding · ${p>=100?'complete':p+'%'}</h4>${p<100?'<a class="seclink" href="#" data-direm>Send reminder ›</a>':''}</summary>${STEPS_REQ.map(([k,l])=>{ const x=s.steps[k]; return `<div class="di-or${x?' ok':''}"><i>${x?'✓':''}</i><span>${esc(l)}${REQ.includes(k)?'':' <small>optional</small>'}</span><small>${x?esc(x.by||'')+' · '+fd(x.at):'Not done'}</small></div>`; }).join('')}
      <p class="di-sm">${ready(id)?'Store is live.':'Store stays offline until owner details, company, plan & payment, brand and domain are done.'} Onboarding owner: ${esc(d.onboardingOwner||'—')}.${last?' Last reminder '+fd(last.at)+(last.auto?' (automatic)':'')+'.':''} Ghost into their account to see their setup as they do.</p>`;
    const kc=body.querySelector('.kc'); const after=kc&&kc.closest('.dwr-sec'); after?after.after(el):body.prepend(el); el.querySelector('[data-direm]')&&(el.querySelector('[data-direm]').onclick=e=>{ e.preventDefault(); remind(id,false); el.remove(); drawerBlock(); toast('Reminder sent to '+(d.owner||d.name)); }); }
  function autoRemind(){ const now=Date.now(), DAY=864e5; A.distributors.forEach(d=>{ if(d.status!=='invited'||ready(d.id)) return; const s=st(d.id); const acts=[d.createdAt].concat(Object.values(s.steps||{}).map(x=>x.at)).filter(Boolean).map(x=>+new Date(x)); if(!acts.length) return;
    const idle=(now-Math.max(...acts))/DAY, sent=(s.reminders||[]).filter(r=>r.auto&&+new Date(r.at)>Math.max(...acts)).length; if((idle>=3&&sent<1)||(idle>=7&&sent<2)) remind(d.id,true); }); }
  const mo=new MutationObserver(()=>{ decorate(); drawerBlock(); });
  const go=()=>{ decorate(); drawerBlock(); mo.observe(document.body,{childList:true,subtree:true}); setTimeout(autoRemind,1500); };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go();

  const css=`.di-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);display:grid;place-items:start center;z-index:1300;overflow-y:auto;padding:5vh 16px;}
  .di-m{background:var(--paper);width:min(720px,100%);border-radius:18px;box-shadow:0 30px 80px rgba(20,22,45,.4);display:flex;flex-direction:column;max-height:90vh;}
  .di-h{display:flex;gap:12px;padding:18px 22px 12px;} .di-h>div{flex:1;} .di-h h3{font-family:var(--serif);font-weight:500;font-size:23px;margin:0;} .di-h small{font-size:12.5px;color:var(--muted);} .di-x{border:0;background:none;font-size:26px;line-height:1;color:var(--muted);cursor:pointer;}
  .di-p{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:0 22px 14px;border-bottom:1px solid var(--line-soft);} .di-p button{border:0;background:none;padding:0;font:inherit;text-align:left;cursor:pointer;color:var(--muted);display:flex;flex-direction:column;gap:6px;} .di-p button:disabled{cursor:default;}
  .di-p button::before{content:"";height:4px;border-radius:4px;background:var(--line-soft);} .di-p .d::before,.di-p .on::before{background:var(--periwinkle-deep);} .di-p span{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .di-p .on span{color:var(--periwinkle-deep);} .di-p .d span{color:var(--ink-2);}
  .di-b{padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px;} .di-b>*{flex-shrink:0;}
  .di-g{display:grid;grid-template-columns:1fr 1fr;gap:12px;} @media(max-width:600px){.di-g{grid-template-columns:1fr;}}
  .di-f{display:flex;flex-direction:column;gap:5px;min-width:0;} .di-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .di-f>span em{color:#c0392b;font-style:normal;} .di-f>span small{font-weight:600;color:var(--muted);}
  .di-f input,.di-f select,.di-ur input,.di-ur select{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;min-width:0;width:100%;}
  .di-sub{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 -4px;display:flex;gap:8px;flex-wrap:wrap;} .di-sub small{text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);}
  .di-ur{display:grid;grid-template-columns:1.5fr 1fr 28px;gap:8px;align-items:center;} .di-ur button{border:0;background:none;font-size:18px;color:var(--muted);cursor:pointer;}
  .di-w{margin:-6px 0 0;font-size:12px;font-weight:600;color:#8a5a12;} .di-sm{font-size:12.5px;color:var(--muted);margin:0;line-height:1.5;}
  .di-dup{display:flex;flex-direction:column;gap:4px;border-radius:12px;padding:10px 13px;background:#fbeccd;font-size:13px;} .di-dup.s{background:var(--tint-red);} .di-dup b{color:#8a5a12;} .di-dup.s b{color:#b4232c;} .di-chk{display:flex;gap:8px;align-items:center;font-size:13px;}
  .di-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;} @media(max-width:600px){.di-plans{grid-template-columns:1fr;}} .di-plan{border:1.5px solid var(--line-soft);background:#fff;border-radius:14px;padding:14px;text-align:left;font:inherit;cursor:pointer;display:flex;flex-direction:column;gap:3px;} .di-plan.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);} .di-plan b{font-size:16px;} .di-plan span{font-size:13px;font-weight:700;color:var(--periwinkle-deep);} .di-plan small{font-size:12px;color:var(--muted);line-height:1.4;}
.di-logos{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;} .di-logos>div{display:flex;flex-direction:column;gap:8px;min-width:0;} .di-drop.sq{width:84px;}
  .di-drop{height:84px;width:100%;border:1.5px dashed var(--line);border-radius:12px;display:grid;place-items:center;cursor:pointer;background:#fff;overflow:hidden;font-size:13px;font-weight:700;color:var(--periwinkle-deep);max-width:260px;} .di-drop img{max-width:85%;max-height:58px;width:auto;height:auto;object-fit:contain;} .di-drop.sq img{max-height:60px;}
  .di-seg{display:flex;background:var(--paper-2);border-radius:10px;padding:3px;width:max-content;} .di-seg button{border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--ink-3);padding:6px 14px;border-radius:8px;cursor:pointer;white-space:nowrap;} .di-seg button.on{background:#fff;color:var(--periwinkle-deep);}
  .di-mono{display:flex;gap:8px;max-width:360px;} .di-mono span{flex:1;height:54px;border-radius:10px;display:grid;place-items:center;border:1px solid var(--line-soft);} .di-mono .lt{background:#fff;} .di-mono .dk{background:var(--ink);} .di-mono img{max-width:78%;max-height:32px;width:auto;height:auto;object-fit:contain;} .di-mono span{overflow:hidden;} .di-mono .lt img{filter:brightness(0);} .di-mono .dk img{filter:brightness(0) invert(1);}
  .di-cols{display:grid;grid-template-columns:1fr 1fr;gap:8px;} .di-col{display:flex;align-items:center;gap:10px;border:1px solid var(--line-soft);border-radius:12px;padding:8px 10px;font-size:13px;font-weight:700;background:#fff;} .di-col>span{width:30px;height:30px;border-radius:8px;position:relative;overflow:hidden;border:1px solid rgba(0,0,0,.1);flex:none;} .di-col input{position:absolute;inset:0;opacity:0;cursor:pointer;} .di-col code{margin-left:auto;font-size:11.5px;color:var(--muted);}
  .di-rev{display:flex;flex-direction:column;gap:8px;} .di-rev>div{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:10px 13px;display:flex;flex-direction:column;} .di-rev b{font-size:14px;} .di-rev small{font-size:12px;color:var(--muted);}
  .di-err{margin:0;color:#b4232c;font-size:13px;font-weight:600;background:var(--tint-red);border-radius:10px;padding:9px 12px;} .di-err[hidden]{display:none;}
  .di-ft{display:flex;gap:10px;align-items:center;padding:14px 22px;border-top:1px solid var(--line-soft);} .di-ft>span{flex:1;}
  .di-btn{font:inherit;font-size:13.5px;font-weight:800;border:0;border-radius:10px;padding:10px 16px;background:var(--periwinkle-deep);color:#fff;cursor:pointer;white-space:nowrap;} .di-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line-soft);} .di-btn.sm{padding:7px 12px;font-size:12.5px;align-self:flex-start;}
  .di-pr{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;white-space:nowrap;} .di-pr i{width:46px;height:6px;border-radius:6px;background:linear-gradient(90deg,var(--periwinkle-deep) var(--p),var(--paper-2) var(--p));} .di-ok{font-size:12.5px;font-weight:700;color:var(--green-deep,#1d7c4d);white-space:nowrap;} .di-pill{font-size:11px;font-weight:800;border:1px dashed var(--line);border-radius:6px;padding:2px 7px;color:var(--ink-3);}
  .di-or{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:center;font-size:13.5px;padding:6px 0;border-top:1px solid var(--paper-2);} .di-or i{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:800;color:#fff;} .di-or.ok i{background:var(--green-deep,#1d7c4d);border-color:var(--green-deep,#1d7c4d);} .di-or small{font-size:12px;color:var(--muted);white-space:nowrap;}
  .di-onb .di-sm{margin-top:8px;} .onb-fold>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;} .onb-fold>summary::-webkit-details-marker{display:none;} .onb-fold>summary h4{margin:0;flex:1;display:flex;align-items:center;gap:8px;} .onb-fold>summary h4::before{content:'';width:7px;height:7px;border-right:2px solid var(--ink-3);border-bottom:2px solid var(--ink-3);transform:rotate(-45deg);transition:transform .15s;} .onb-fold[open]>summary h4::before{transform:rotate(45deg);} .onb-fold[open]>summary{margin-bottom:8px;}`;
  const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  return {open,progress,ready,STEPS:STEPS_REQ,REQ,legacy,remind};
})();
