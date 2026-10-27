/* ============================================================
   cust-onboard.js — Distributor → Organisations → Add customer.
   Customers only (suppliers use Connect a supplier). Each distributor's
   customers are separate records: no matching against other distributors.

   Steps: 1 Organisation · 2 People · 3 Brand · 4 Terms & delivery · Review
   Finish: Send invitations (status 'invited') or Save as draft ('draft').
   A draft reserves a customer number (CUS-####) and nothing else.
   Ownership: the customer owns its profile (step 1 + 3 are their details,
   editable by them after onboarding); the distributor owns the relationship
   (step 4 terms + account managers).
   Who: distributor Admins and Account Managers only.

   Store: localStorage 'ms-cust-new' {seq, items:[customer records]}.
   Records are merged into ORG_DATA.customers on load (this file must load
   right after org-data.js). Customer-side checklist: cust-checklist.js.
   window.MSCUSTADD: open(draftId?) · canAdd()
   ============================================================ */
window.MSCUSTADD=window.MSCUSTADD||(function(){
  const KEY='ms-cust-new', D=window.ORG_DATA||{customers:[]};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const db=()=>{ try{ return Object.assign({seq:1040,items:[]},JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return {seq:1040,items:[]}; } };
  const save=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); return true; }catch(e){ alert('Couldn’t save: the logo files are too big for this browser. Try smaller images.'); return false; } };
  const initials=n=>String(n||'?').replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
  const month=()=>new Date().toLocaleDateString('en-GB',{month:'short',year:'numeric'});
  const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ROLES=[['Admin','Manages the organisation, team and settings'],['Buyer','Places orders and requests quotes'],['Approver','Approves proofs and orders'],['Viewer','Can see projects and orders only']];
  const DISC=(window.MSCUSTDEF&&MSCUSTDEF.DISC)||['Standard (0%)','Bronze (5%)','Silver (7.5%)','Gold (10%)','Platinum (12.5%)'];
  const TERMS=(window.MSCUSTACCT&&MSCUSTACCT.TERMS)||['Payment on order','7 days','14 days','30 days','30 days end of month','60 days'];
  // the distributor's defaults (Settings → Customer defaults) pre-fill the Terms step and count as agreed
  const DEFT=()=>{ const d=window.MSCUSTDEF?MSCUSTDEF.get():{payment:'Payment on order',credit:0,vat:true,poLevel:'number',discount:DISC[0]}; return d; };
  const defCur=()=>{ const d=DEFT(); return {payment:d.payment,credit:d.credit?'£'+Math.round(d.credit).toLocaleString('en-GB'):''}; };
  const needT=t=>{ const T=window.MSTERMS; return !!T&&T.needs(t,defCur()); };
  const CW=[['primary','Primary','Buttons, links and highlights','#4E5BA6'],['secondary','Secondary','Bands and panels','#E8EAF6'],['accent','Accent','Badges and small highlights','#FF6A4D'],['ink','Text','Headings and body text','#1E2033']];

  // merge saved customers into the seed so every table/page sees them
  (function merge(){ const o=db(); o.items.forEach(c=>{ const i=D.customers.findIndex(x=>x.id===c.id); if(i>=0) D.customers[i]=c; else D.customers.unshift(c); }); })();

  /* ---- duplicate checks (this distributor's own customers only) ---- */
  const normName=s=>String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]+/g,' ').replace(/\b(the|ltd|limited|plc|llp|llc|inc|incorporated|group|holdings|uk|co|company|corp|corporation)\b/g,' ').replace(/\s+/g,' ').trim();
  const normDom=s=>String(s||'').toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'').trim();
  function lev(a,b){ const m=a.length,n=b.length; if(!m||!n) return Math.max(m,n); let p=[...Array(n+1).keys()]; for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[n]; }
  function orgMatches(name,dom,selfId){ const a=normName(name), d=normDom(dom); if(!a&&!d) return [];
    return D.customers.filter(c=>c.id!==selfId&&c.status!=='draft').map(c=>{ const b=normName(c.name), cd=normDom(c.website||c.domain);
      if(d&&cd&&d===cd) return {c,level:'exact',why:'same website ('+cd+')'}; if(a&&b===a) return {c,level:'exact',why:'same name'};
      if(a.length>=3&&b.length>=3){ const r=1-lev(a,b)/Math.max(a.length,b.length); if(r>=0.75||(Math.min(a.length,b.length)>=4&&(a.includes(b)||b.includes(a)))) return {c,level:'similar',why:'similar name'}; } return null; }).filter(Boolean).sort((x,y)=>(x.level==='exact'?0:1)-(y.level==='exact'?0:1)); }
  const allPeople=()=>D.customers.filter(c=>c.status!=='draft').flatMap(c=>(c.teams||[]).flatMap(t=>(t.users||[]).map(u=>({u,org:c})))).concat((D.mojoTeams||[]).flatMap(t=>(t.users||[]).map(u=>({u,org:{id:'mojo',name:'your own team'}}))));
  function personMatch(p,orgId){ const e=String(p.email||'').trim().toLowerCase(), nm=normName(p.n); const L=allPeople();
    const byE=e&&L.find(x=>String(x.u.email||'').toLowerCase()===e); if(byE) return {level:byE.org.id===orgId?'block':'exact',text:(byE.org.id===orgId?'Already in ':'Already a user at ')+byE.org.name+' as '+byE.u.n};
    const byN=nm&&orgId&&L.find(x=>x.org.id===orgId&&normName(x.u.n)===nm); if(byN) return {level:'similar',text:byN.org.name+' already has '+byN.u.n+(byN.u.email?' ('+byN.u.email+')':'')+'. Same person?'}; return null; }
  function me(){ const p=(window.MSChat&&MSChat.me&&MSChat.me())||{}; const T=(D.mojoTeams||[]).flatMap(t=>t.users||[]).concat(D.team||[]); return T.find(u=>u.n===p.name)||T.find(u=>/admin/i.test(u.role||''))||{n:p.name||'You',role:'Admin'}; }
  const canAdd=()=>{ const r=window.MSID&&MSID.current?MSID.current():'distributor'; if(r==='admin') return true; if(r!=='distributor') return false; return /admin|account/i.test(me().role||''); };
  const ams=()=>window.MSAM?MSAM.list():[];

  // customers use their distributor's colourway: preview it, never edit it
  function themeCols(){ const cs=getComputedStyle(document.documentElement), g=(v,f)=>(cs.getPropertyValue(v)||'').trim()||f; return {primary:g('--periwinkle-deep','#4E5BA6'),secondary:g('--tint-peri','#E8EAF6'),accent:g('--flare','#FF6A4D'),ink:g('--ink','#1E2033')}; }
  function blank(){ const m=me(), am=ams().find(u=>u.n===m.n)?m.n:((ams()[0]||{}).n||'');
    return {mode:'new',existingId:'',dupOk:false,id:null,no:null,name:'',domain:'',companyNo:'',address:'',billing:window.MSADDR?MSADDR.empty():{},contact:{n:'',email:'',title:'',role:'Admin',am},users:[],
      brand:{logoSq:'',logoFull:'',mono:'auto',logoMono:'',colours:themeCols()},
      terms:(d=>({discount:d.discount||DISC[0],credit:d.credit?String(Math.round(d.credit)):'',payment:d.payment,vat:d.vat!==false,poLevel:d.poLevel||'number'}))(DEFT()),delivery:[{label:'Head office',sameAsBilling:true,address:'',addr:window.MSADDR?MSADDR.empty():{}}]}; }
  function fromRecord(c){ const w=c._wiz; if(!w) return blank(); const x=JSON.parse(JSON.stringify(w)); const A=window.MSADDR;
    if(A){ if(!x.billing) x.billing=A.parse(x.address||''); (x.delivery||[]).forEach(d=>{ if(!d.addr) d.addr=A.parse(d.address||''); }); } return x; }
  const AD=()=>window.MSADDR, btxt=W=>AD()?AD().text(W.billing):W.address;

  function open(draftId){ if(!canAdd()){ toast('Only admins and account managers can add customers'); return; }
    const ex=draftId?D.customers.find(c=>c.id===draftId):null; const W=ex?fromRecord(ex):blank(); if(ex){ W.id=ex.id; W.no=ex.customerNo; }
    let step=0; const STEPS=['Organisation','People','Brand','Terms & delivery','Review'];
    const wrap=document.createElement('div'); wrap.className='cw-scrim'; wrap.innerHTML='<div class="cw-modal" role="dialog" aria-modal="true" aria-label="Add customer"></div>'; document.body.appendChild(wrap); document.body.style.overflow='hidden';
    const box=wrap.firstChild; requestAnimationFrame(()=>wrap.classList.add('open'));
    const shut=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); if(!document.querySelector('.cw-scrim,.fm-scrim')) document.body.style.overflow=''; },200); };
    let dirty=false; const tryClose=()=>{ if(dirty&&!confirm('Close without saving? Use “Save as draft” to keep what you’ve entered.')) return; shut(); };
    wrap.addEventListener('mousedown',e=>{ if(e.target===wrap) tryClose(); });
    const field=(id,label,val,opts)=>`<label class="cw-f${opts&&opts.cls?' '+opts.cls:''}"><span>${label}${opts&&opts.req?' <em>*</em>':''}</span>${opts&&opts.area?`<textarea data-w="${id}" rows="3" placeholder="${esc(opts.ph||'')}">${esc(val)}</textarea>`:`<input data-w="${id}" value="${esc(val)}" placeholder="${esc((opts&&opts.ph)||'')}"${opts&&opts.type?` type="${opts.type}"`:''}>`}${opts&&opts.hint?`<small>${opts.hint}</small>`:''}</label>`;
    const sel=(id,label,val,list,hint)=>`<label class="cw-f"><span>${label}</span><select data-w="${id}">${list.map(o=>{ const [v,l]=Array.isArray(o)?o:[o,o]; return `<option value="${esc(v)}"${v===val?' selected':''}>${esc(l)}</option>`; }).join('')}</select>${hint?`<small>${hint}</small>`:''}</label>`;
    const amOpts=()=>ams().map(u=>[u.n,u.n+(u.title?' · '+u.title:'')]);
    const roleOpts=ROLES.map(r=>[r[0],r[0]]);

    function body(){ const b=W.brand, t=W.terms;
      const ex=W.mode==='existing'?D.customers.find(c=>c.id===W.existingId):null;
      if(step===0&&W.mode==='existing'){ const q=(W.q||'').toLowerCase(), L=D.customers.filter(c=>c.status!=='draft'&&(!q||(c.name+' '+(c.domain||'')).toLowerCase().includes(q)));
        return modeSeg()+`<p class="cw-lede">Add new people to a customer you already have. Their brand and terms stay as they are.</p>
          <input class="cw-srch" data-exq value="${esc(W.q||'')}" placeholder="Search your customers" aria-label="Search your customers">
          <div class="cw-exl">${L.map(c=>`<button type="button" class="cw-exo${c.id===W.existingId?' on':''}" data-expick="${esc(c.id)}"><span class="cw-exlg">${esc(c.initials||initials(c.name))}</span><span><b>${esc(c.name)}</b><small>${esc(c.domain||'')}${c.domain?' · ':''}${(c.teams||[]).reduce((n,t)=>n+(t.users||[]).length,0)} people</small></span>${c.id===W.existingId?'<em>Selected</em>':''}</button>`).join('')||'<p class="cw-lede">No customers match.</p>'}</div>`; }
      if(step===0) return modeSeg()+`<p class="cw-lede">The customer’s own details. They can update these themselves after they’ve joined.</p>
        <div class="cw-grid">${field('name','Organisation name',W.name,{req:1,ph:'e.g. Harbour Foods'})}${field('domain','Website',W.domain,{req:1,ph:'harbourfoods.co.uk',hint:'Used for their logo and to suggest email addresses.'})}</div>
        <div data-dup>${dupHTML()}</div>
        <div class="cw-grid">${field('companyNo','Company number',W.companyNo,{ph:'Optional'})}<div class="cw-f"><span>Customer number</span><div class="cw-ro">${esc(W.no||'Assigned when you save')}</div><small>Reserved when you save, including drafts.</small></div></div>
        <div class="cw-f"><span>Billing address <em>*</em></span></div>${AD()?`<div data-bill>${AD().fieldsHTML(W.billing)}</div>`:field('address','Billing address',W.address,{area:1,ph:'Street, town, postcode'})}`;
      if(step===1) return `<p class="cw-lede">Everyone added here is invited when you send. The main contact can invite more people straight away.</p>
        <h4 class="cw-h">Main contact</h4>
        <div class="cw-grid">${field('c.n','Full name',W.contact.n,{req:1})}${field('c.email','Email',W.contact.email,{req:1,type:'email',ph:W.domain?'name@'+W.domain:''})}</div>
        ${pw(W.contact)}
        <div class="cw-grid3">${field('c.title','Job title',W.contact.title,{ph:'Optional'})}${sel('c.role','Role',W.contact.role,roleOpts)}${sel('c.am','Account manager',W.contact.am,amOpts())}</div>
        <h4 class="cw-h">More people <em>${W.users.length?W.users.length+' added':'optional'}</em></h4>
        ${W.users.length?`<div class="cw-users"><div class="cw-uh"><span>Email</span><span>Name</span><span>Role</span><span>Account manager</span><span></span></div>${W.users.map((u,i)=>`<div class="cw-ur"><input data-u="${i}:email" value="${esc(u.email)}" aria-label="Email"><input data-u="${i}:n" value="${esc(u.n)}" placeholder="Optional" aria-label="Name"><select data-u="${i}:role" aria-label="Role">${roleOpts.map(([v])=>`<option${v===u.role?' selected':''}>${v}</option>`).join('')}</select><select data-u="${i}:am" aria-label="Account manager">${amOpts().map(([v,l])=>`<option value="${esc(v)}"${v===u.am?' selected':''}>${esc(v)}</option>`).join('')}</select><button class="cw-x" data-urm="${i}" aria-label="Remove">×</button></div>${pw(u)?`<div class="cw-urw">${pw(u)}</div>`:''}`).join('')}</div>`:''}
        <div class="cw-bulk"><textarea data-bulk rows="2" placeholder="Paste email addresses, separated by commas or new lines"></textarea><div class="cw-bulkr"><select data-bulkrole aria-label="Role for these people">${roleOpts.map(([v])=>`<option${v==='Buyer'?' selected':''}>${v}</option>`).join('')}</select><button class="btn ghost sm" data-bulkadd>Add people</button></div></div>
        <div class="cw-roles">${ROLES.map(([r,d])=>`<span><b>${r}</b> ${d}</span>`).join('')}</div>`;
      if(step===2) return `<p class="cw-lede">Set up how their store looks. They’ll be asked to confirm it when they join, and can change it later.</p>
        <div class="cw-brand"><div>
          <h4 class="cw-h">Logos</h4>
          <div class="cw-logos">${[['logoSq','Square logo','Lists, chat and avatars'],['logoFull','Full logo','Store header and PDFs']].map(([k,l,h])=>`<div class="cw-logo"><span class="cw-ll">${l}</span><label class="cw-drop${b[k]?' has':''} ${k==='logoSq'?'sq':''}">${b[k]?`<img src="${b[k]}" alt="">`:`<span>Upload</span>`}<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-logo="${k}" hidden></label><small>${h}${b[k]?` · <button class="cw-link" data-logorm="${k}">Remove</button>`:''}</small></div>`).join('')}</div>
          <h4 class="cw-h">Mono logo <em>for dark backgrounds and one-colour print</em></h4>
          <div class="cw-mono"><div class="cw-seg"><button type="button" class="${b.mono!=='upload'?'on':''}" data-mono="auto">Make from full logo</button><button type="button" class="${b.mono==='upload'?'on':''}" data-mono="upload">Upload a mono logo</button></div>
            ${b.mono==='upload'?`<label class="cw-drop${b.logoMono?' has':''}" style="width:180px">${b.logoMono?`<img src="${b.logoMono}" alt="">`:'<span>Upload</span>'}<input type="file" accept="image/png,image/svg+xml,image/webp" data-logo="logoMono" hidden></label>`:''}
            ${(b.mono==='upload'?b.logoMono:(b.logoFull||b.logoSq))?`<div class="cw-monopv"><span class="lt"><img src="${b.mono==='upload'?b.logoMono:(b.logoFull||b.logoSq)}" alt="Mono logo on light"></span><span class="dk"><img src="${b.mono==='upload'?b.logoMono:(b.logoFull||b.logoSq)}" alt="Mono logo on dark"></span></div>`:`<small class="cw-monoh">${b.mono==='upload'?'Upload a single-colour PNG or SVG with a transparent background.':'Upload a full logo above and we’ll make black and white versions from it.'}</small>`}</div>
          </div>
          <div><h4 class="cw-h">Preview</h4><div class="cw-pv" data-pv></div></div></div>`;
      if(step===3) return `<p class="cw-lede">Your terms with this customer. They can see these but only you can change them.</p>
        <div class="cw-grid">${sel('t.discount','Discount group',t.discount,DISC)}${field('t.credit','Credit limit (£)',t.credit,{ph:'None',hint:(n=>n?'Your default is £'+Math.round(n).toLocaleString('en-GB')+'. More needs Finance approval.':'More than none needs Finance approval.')(DEFT().credit)})}</div>
        ${finNote()}
        <div class="cw-grid">${sel('t.payment','Payment terms',t.payment,TERMS,'Your default is '+DEFT().payment+'. Other on-account terms need Finance approval.')}<div class="cw-f"><span>VAT applicable</span><div class="cw-seg"><button type="button" class="${t.vat?'on':''}" data-vat="1">Yes</button><button type="button" class="${t.vat?'':'on'}" data-vat="0">No</button></div><small>Used at checkout.</small></div></div>
        <h4 class="cw-h">Delivery addresses</h4>
        ${W.delivery.map((d,i)=>`<div class="cw-del"><div class="cw-delh"><input data-d="${i}:label" value="${esc(d.label)}" aria-label="Address name" placeholder="e.g. Leeds office">${W.delivery.length>1?`<button class="cw-link" data-drm="${i}">Remove</button>`:''}</div>
          ${i===0?`<label class="cw-chk"><input type="checkbox" data-dsame${d.sameAsBilling?' checked':''}> Same as billing address</label>`:''}
          ${i===0&&d.sameAsBilling?`<div class="cw-ro">${esc(btxt(W)||'Add a billing address in step 1')}</div>`:(AD()?`<div data-dad="${i}">${AD().fieldsHTML(d.addr)}</div>`:`<textarea data-d="${i}:address" rows="2" placeholder="Street, town, postcode">${esc(d.address)}</textarea>`)}</div>`).join('')}
        <button class="btn ghost sm" data-dadd>Add another address</button>`;
      const all=[W.contact].concat(W.users);
      if(W.mode==='existing') return `<p class="cw-lede">Check the people before sending their invitations.</p><div class="cw-rev"><div class="cw-rc"><div class="cw-rch"><b>Customer</b><button class="cw-link" data-go="0">Change</button></div><div class="cw-org"><span style="background:var(--periwinkle-deep)">${esc(ex?ex.initials||initials(ex.name):'?')}</span><div><b>${esc(ex?ex.name:'')}</b><small>${esc(ex?ex.domain||'':'')}</small></div></div><small>Brand, terms and addresses stay as they are.</small></div>
        <div class="cw-rc"><div class="cw-rch"><b>People · ${all.length}</b><button class="cw-link" data-go="1">Edit</button></div>${all.map(u=>`<div class="cw-rp"><span>${esc(u.n||u.email)}</span><small>${esc(u.role)} · ${esc(u.am||'—')}</small></div>${pw(u)}`).join('')}</div></div>`;
      return `<p class="cw-lede">Check everything before sending. You can also save this as a draft and finish later.</p>
        <div class="cw-rev">
          <div class="cw-rc"><div class="cw-rch"><b>Organisation</b><button class="cw-link" data-go="0">Edit</button></div><div class="cw-org">${b.logoSq?`<img src="${b.logoSq}" alt="">`:`<span style="background:${esc(b.colours.primary)}">${esc(initials(W.name))}</span>`}<div><b>${esc(W.name)}</b><small>${esc(W.domain)}${W.companyNo?' · '+esc(W.companyNo):''}</small></div></div>${btxt(W)?`<p>${esc(AD()?AD().lines(W.billing).join('\n'):W.address)}</p>`:''}</div>
          <div class="cw-rc"><div class="cw-rch"><b>People · ${all.length}</b><button class="cw-link" data-go="1">Edit</button></div>${all.map((u,i)=>`<div class="cw-rp"><span>${esc(u.n||u.email)}${i===0?' <em>Main contact</em>':''}</span><small>${esc(u.role)} · ${esc(u.am||'—')}</small></div>`).join('')}</div>
          <div class="cw-rc"><div class="cw-rch"><b>Brand</b><button class="cw-link" data-go="2">Edit</button></div><small>${b.logoFull||b.logoSq?'Logo added':'No logo yet: they can add one when they join'}</small></div>
          <div class="cw-rc"><div class="cw-rch"><b>Terms & delivery</b><button class="cw-link" data-go="3">Edit</button></div><div class="cw-rp"><span>Discount</span><small>${esc(t.discount)}</small></div><div class="cw-rp"><span>Credit limit</span><small>${t.credit?'£'+Number(String(t.credit).replace(/[^0-9.]/g,'')).toLocaleString('en-GB'):'None'}</small></div><div class="cw-rp"><span>Payment</span><small>${esc(t.payment)} · VAT ${t.vat?'applies':'doesn’t apply'}</small></div>${window.MSTERMS&&MSTERMS.needs(t)?`<div class="cw-rp"><span></span><small class="cw-pend">Sent to Finance to approve · starts on Payment on order</small></div>`:''}<div class="cw-rp"><span>Delivery</span><small>${W.delivery.length} address${W.delivery.length>1?'es':''}</small></div></div>
        </div>
        <div class="cw-next"><b>What happens next</b><span>${esc(W.contact.n||'The main contact')} and ${all.length>1?all.length-1+' other'+(all.length>2?'s':''):'anyone else you add'} get an email invitation. When they log in, a short checklist takes them through confirming their details and brand, inviting their team and starting a first project.</span></div>`; }

    const orgIdNow=()=>W.mode==='existing'?W.existingId:W.id;
    function modeSeg(){ return `<div class="cw-seg cw-mode"><button type="button" class="${W.mode!=='existing'?'on':''}" data-mode="new">New organisation</button><button type="button" class="${W.mode==='existing'?'on':''}" data-mode="existing">Add people to an existing customer</button></div>`; }
    function dupHTML(){ const M=orgMatches(W.name,W.domain,W.id); if(!M.length) return ''; const top=M[0], strong=top.level==='exact';
      return `<div class="cw-dup${strong?' strong':''}"><b>${strong?'This customer may already exist':'Similar customer'+(M.length>1?'s':'')+' found'}</b>${M.slice(0,3).map(m=>`<div class="cw-dupr"><span>${esc(m.c.name)} <small>${esc(m.why)}${m.c.domain?' · '+esc(m.c.domain):''}</small></span><button type="button" class="cw-link" data-useex="${esc(m.c.id)}">Add people to ${esc(m.c.name)} instead</button></div>`).join('')}
        ${strong?`<label class="cw-chk"><input type="checkbox" data-dupok${W.dupOk?' checked':''}> It’s a different organisation, carry on</label>`:''}</div>`; }
    function pw(p){ if(!p||(!p.email&&!p.n)) return ''; const m=personMatch(p,orgIdNow()); return m?`<p class="cw-pw ${m.level}">${esc(m.text)}</p>`:''; }
    const skip=s=>W.mode==='existing'&&(s===2||s===3);
    function finNote(){ const T=window.MSTERMS; if(!T) return ''; const F=T.finance().map(u=>u.n).join(' or ')||'Finance', need=needT(W.terms), dc=defCur();
      return `<div class="cw-fin${need?' on':''}" data-fin>${need?`<b>Needs Finance approval</b><span>${esc(F)} will get a notification and email to review these terms. ${esc(W.name||'The customer')} starts on your default terms (${esc(dc.payment)}${dc.credit?', '+esc(dc.credit)+' credit':''}) until they approve.</span>`:`<b>Your default terms</b><span>Set in Settings → Customer defaults, so no approval is needed. More credit or different on-account terms go to ${esc(F)} to approve.</span>`}</div>`; }
    function pv(){ const el=box.querySelector('[data-pv]'); if(!el) return; const b=W.brand, c=b.colours;
      el.innerHTML=`<div class="cw-pvh" style="background:${esc(c.primary)}">${b.logoFull?`<img src="${b.logoFull}" alt="">`:`<b style="color:#fff">${esc(W.name||'Customer name')}</b>`}<i></i><i></i></div>
        <div class="cw-pvb" style="background:${esc(c.secondary)};color:${esc(c.ink)}"><span class="cw-pvbadge" style="background:${esc(c.accent)}">New</span><h5 style="color:${esc(c.ink)}">Welcome to your store</h5><p>Order branded merchandise, approve proofs and track deliveries.</p><span class="cw-pvbtn" style="background:${esc(c.primary)}">Browse products</span></div>`; }

    function valid(s){ const e=[];
      if(s===0&&W.mode==='existing'){ if(!W.existingId) e.push('Choose the customer to add people to.'); return e; }
      if(s===0&&orgMatches(W.name,W.domain,W.id).some(m=>m.level==='exact')&&!W.dupOk) e.push('This looks like a customer you already have. Add people to them instead, or tick “It’s a different organisation”.');
      if(s===1){ const all=[W.contact].concat(W.users); all.forEach(p=>{ const m=personMatch(p,orgIdNow()); if(m&&m.level==='block') e.push((p.email||p.n)+': '+m.text+'.'); }); }
      if(s===0){ if(!W.name.trim()) e.push('Add the organisation name.'); if(!W.domain.trim()) e.push('Add their website.'); if(AD()) AD().validate(W.billing,'Billing address').forEach(x=>e.push(x.charAt(0).toUpperCase()+x.slice(1))); }
      if(s===1){ if(!W.contact.am) e.push('Assign an account manager. Every customer needs at least one person from your team.'); const noAm=W.users.filter(u=>!u.am).length; if(noAm) e.push(noAm+' person'+(noAm>1?'s need':' needs')+' an account manager.');
        if(!W.contact.n.trim()) e.push('Add the main contact’s name.'); if(!EMAIL.test(W.contact.email.trim())) e.push('Add a valid email for the main contact.');
        const bad=W.users.filter(u=>!EMAIL.test(u.email.trim())); if(bad.length) e.push(bad.length+' email address'+(bad.length>1?'es aren’t':' isn’t')+' valid.');
        const em=[W.contact.email].concat(W.users.map(u=>u.email)).map(x=>x.trim().toLowerCase()).filter(Boolean); if(new Set(em).size!==em.length) e.push('The same email is listed twice.'); }
      if(s===3){ if(W.terms.credit&&isNaN(+String(W.terms.credit).replace(/[,£\s]/g,''))) e.push('The credit limit should be a number.'); W.delivery.forEach((d,i)=>{ if(i===0&&d.sameAsBilling) return; if(AD()) AD().validate(d.addr,d.label||'Delivery address '+(i+1)).forEach(x=>e.push(x)); else if(!d.address.trim()) e.push('Fill in each delivery address, or remove it.'); }); }
      return e; }

    function draw(){ box.innerHTML=`<div class="cw-head"><div><h3>${W.mode==='existing'?'Add people'+(W.existingId?' to '+esc((D.customers.find(c=>c.id===W.existingId)||{}).name||''):''):W.id?'Finish setting up '+esc(W.name||'customer'):'Add customer'}</h3><small>Step ${step+1} of ${STEPS.length} · ${STEPS[step]}</small></div><button class="cw-close" data-close aria-label="Close">×</button></div>
        <div class="cw-prog">${STEPS.map((s,i)=>`<button class="${skip(i)?'skip':i<step?'done':i===step?'on':''}" data-go="${i}" ${i>step||skip(i)?'disabled':''} ${skip(i)?'title="Not needed: the customer already has these"':''}><i>${i<step?'✓':i+1}</i><span>${s}</span></button>`).join('')}</div>
        <div class="cw-body">${body()}<p class="cw-err" data-err hidden></p></div>
        <div class="cw-foot">${W.mode==='existing'?'':'<button class="btn ghost" data-draft>Save as draft</button>'}<span></span>${step?'<button class="btn ghost" data-back>Back</button>':''}${step<STEPS.length-1?'<button class="btn" data-next>Next</button>':'<button class="btn" data-send>Send invitations</button>'}</div>`;
      wire(); pv(); const f=box.querySelector('.cw-body input:not([type=file]):not([type=checkbox]):not([type=color]),.cw-body select'); if(f&&step<4) f.focus(); }
    const setPath=(p,v)=>{ const [a,b2]=p.split('.'); if(!b2) W[a]=v; else if(a==='c') W.contact[b2]=v; else if(a==='t') W.terms[b2]=v; dirty=true; };
    function err(list){ const e=box.querySelector('[data-err]'); e.hidden=!list.length; e.innerHTML=list.map(esc).join('<br>'); if(list.length) e.scrollIntoView&&0; }
    function wire(){
      box.querySelectorAll('[data-w]').forEach(i=>i.addEventListener('input',()=>{ setPath(i.dataset.w,i.value); if(i.dataset.w==='name') pv(); }));
      box.querySelectorAll('[data-w]').forEach(i=>{ if(i.tagName==='SELECT') i.onchange=()=>{ setPath(i.dataset.w,i.value); refFin(); }; });
      const refFin=()=>{ const f=box.querySelector('[data-fin]'); if(f){ const t=document.createElement('div'); t.innerHTML=finNote(); f.replaceWith(t.firstChild); } };
      const cr=box.querySelector('[data-w="t.credit"]'); if(cr) cr.addEventListener('input',refFin);
      box.querySelectorAll('[data-u]').forEach(i=>{ const h=()=>{ const [x,k]=i.dataset.u.split(':'); W.users[+x][k]=i.value; dirty=true; }; i.addEventListener('input',h); i.addEventListener('change',h); });
      box.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{ W.mode=b.dataset.mode; dirty=true; draw(); });
      box.querySelectorAll('[data-expick]').forEach(b=>b.onclick=()=>{ W.existingId=b.dataset.expick; const c=D.customers.find(x=>x.id===W.existingId); if(c&&!W.domain) W.domain=c.domain||''; dirty=true; draw(); });
      const exq=box.querySelector('[data-exq]'); if(exq) exq.oninput=()=>{ W.q=exq.value; const p=exq.selectionStart; draw(); const n=box.querySelector('[data-exq]'); n.focus(); n.setSelectionRange(p,p); };
      box.querySelectorAll('[data-useex]').forEach(b=>b.onclick=()=>{ W.mode='existing'; W.existingId=b.dataset.useex; dirty=true; draw(); });
      const dok=box.querySelector('[data-dupok]'); if(dok) dok.onchange=()=>{ W.dupOk=dok.checked; };
      const dupBox=box.querySelector('[data-dup]'); if(dupBox){ const ref=()=>{ dupBox.innerHTML=dupHTML(); dupBox.querySelectorAll('[data-useex]').forEach(b=>b.onclick=()=>{ W.mode='existing'; W.existingId=b.dataset.useex; draw(); }); const d2=dupBox.querySelector('[data-dupok]'); if(d2) d2.onchange=()=>{ W.dupOk=d2.checked; }; };
        ['name','domain'].forEach(k=>{ const i=box.querySelector(`[data-w="${k}"]`); if(i) i.addEventListener('input',()=>{ W.dupOk=false; ref(); }); }); }
      box.querySelectorAll('[data-w="c.email"],[data-u$=":email"],[data-u$=":n"]').forEach(i=>i.addEventListener('change',()=>draw()));
      box.querySelectorAll('[data-urm]').forEach(b=>b.onclick=()=>{ W.users.splice(+b.dataset.urm,1); draw(); });
      const ba=box.querySelector('[data-bulkadd]'); if(ba) ba.onclick=()=>{ const t=box.querySelector('[data-bulk]').value, role=box.querySelector('[data-bulkrole]').value, have=new Set([W.contact.email].concat(W.users.map(u=>u.email)).map(x=>x.toLowerCase()));
        const found=(t.match(/[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/g)||[]).filter(x=>!have.has(x.toLowerCase())); if(!found.length) return err(['No new email addresses found.']);
        found.forEach(e=>W.users.push({email:e,n:'',role,am:W.contact.am})); dirty=true; draw(); };
      box.querySelectorAll('[data-logo]').forEach(i=>i.onchange=()=>{ const f=i.files[0]; if(!f) return; if(f.size>1.5*1024*1024) return err(['That image is over 1.5 MB. Try a smaller file.']);
        const r=new FileReader(); r.onload=()=>{ W.brand[i.dataset.logo]=r.result; if(i.dataset.logo==='logoFull'&&!W.brand.logoSq) W.brand.logoSq=r.result; dirty=true; draw(); }; r.readAsDataURL(f); });
      box.querySelectorAll('[data-mono]').forEach(b=>b.onclick=()=>{ W.brand.mono=b.dataset.mono; dirty=true; draw(); });
      box.querySelectorAll('[data-logorm]').forEach(b=>b.onclick=e=>{ e.preventDefault(); W.brand[b.dataset.logorm]=''; draw(); });
      box.querySelectorAll('[data-col]').forEach(i=>i.oninput=()=>{ W.brand.colours[i.dataset.col]=i.value; i.parentElement.style.background=i.value; box.querySelector(`[data-hex="${i.dataset.col}"]`).value=i.value.toUpperCase(); dirty=true; pv(); });
      box.querySelectorAll('[data-hex]').forEach(i=>i.oninput=()=>{ let v=i.value.trim(); if(!v.startsWith('#')) v='#'+v; if(/^#[0-9a-f]{6}$/i.test(v)){ W.brand.colours[i.dataset.hex]=v; const c=box.querySelector(`[data-col="${i.dataset.hex}"]`); c.value=v; c.parentElement.style.background=v; dirty=true; pv(); } });
      box.querySelectorAll('[data-vat]').forEach(b=>b.onclick=()=>{ W.terms.vat=b.dataset.vat==='1'; dirty=true; draw(); });
      box.querySelectorAll('[data-d]').forEach(i=>i.addEventListener('input',()=>{ const [x,k]=i.dataset.d.split(':'); W.delivery[+x][k]=i.value; dirty=true; }));
      const cn=box.querySelector('[data-w="c.n"]'); if(cn&&window.MSNAME){ MSNAME.upgrade(cn,{pref:true,prefValue:W.contact.pref||''}); cn.closest('.cw-grid')&&cn.closest('.cw-grid').classList.add('cw-grid-nm');
        box.querySelector('.nm-row').addEventListener('input',()=>{ const np=MSNAME.parts(cn); Object.assign(W.contact,np); W.contact.n=cn.value; dirty=true; }); }
      if(AD()){ AD().wire(box); const bb=box.querySelector('[data-bill]'); if(bb){ const h=()=>{ W.billing=AD().read(bb); W.address=AD().text(W.billing); dirty=true; }; bb.addEventListener('input',h); bb.addEventListener('change',h); }
        box.querySelectorAll('[data-dad]').forEach(el=>{ const h=()=>{ const d=W.delivery[+el.dataset.dad]; d.addr=AD().read(el); d.address=AD().text(d.addr); dirty=true; }; el.addEventListener('input',h); el.addEventListener('change',h); }); }
      const ds=box.querySelector('[data-dsame]'); if(ds) ds.onchange=()=>{ W.delivery[0].sameAsBilling=ds.checked; draw(); };
      box.querySelectorAll('[data-drm]').forEach(b=>b.onclick=()=>{ W.delivery.splice(+b.dataset.drm,1); draw(); });
      const da=box.querySelector('[data-dadd]'); if(da) da.onclick=()=>{ W.delivery.push({label:'',sameAsBilling:false,address:'',addr:AD()?AD().empty():{}}); draw(); };
      box.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ const g=+b.dataset.go; if(g<step||g===step){ step=g; draw(); } });
      box.querySelector('[data-close]').onclick=tryClose;
      const bk=box.querySelector('[data-back]'); if(bk) bk.onclick=()=>{ step--; while(skip(step)) step--; draw(); };
      const nx=box.querySelector('[data-next]'); if(nx) nx.onclick=()=>{ const e=valid(step); if(e.length) return err(e); step++; while(skip(step)) step++; draw(); };
      const dr=box.querySelector('[data-draft]'); if(dr) dr.onclick=()=>{ if(!W.name.trim()){ step=0; draw(); return err(['Add at least the organisation name to save a draft.']); } if(commit('draft')){ shut(); toast('Draft saved · '+W.no); } };
      const sd=box.querySelector('[data-send]'); if(sd) sd.onclick=()=>{ for(let s=0;s<4;s++){ if(skip(s)) continue; const e=valid(s); if(e.length){ step=s; draw(); return err(e); } }
        const n=1+W.users.length; if(W.mode==='existing'){ if(addExisting()){ shut(); toast(n+' invitation'+(n>1?'s':'')+' sent · added to '+(D.customers.find(c=>c.id===W.existingId)||{}).name); } return; }
        if(commit('invited')){ shut(); toast(n+' invitation'+(n>1?'s':'')+' sent · '+W.name+' added'); } };
      box.onkeydown=e=>{ if(e.key==='Escape') tryClose(); };
    }
    function addExisting(){ const c=D.customers.find(x=>x.id===W.existingId); if(!c) return false; const team=((c.teams||[])[0]||{}).name||'Team';
      [W.contact].concat(W.users).forEach(u=>{ const n=u.n||u.email.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,x=>x.toUpperCase()), s=window.MSNAME?MSNAME.split(n):{};
        const f={n,firstName:u.firstName||s.first||'',lastName:u.lastName||s.last||'',pref:u.pref||'',email:u.email,role:u.role,title:u.title||u.role};
        if(window.MSPEOPLE&&MSPEOPLE.addUser) MSPEOPLE.addUser(c.id,team,f); const t=(c.teams||[])[0]; if(t) (t.users=t.users||[]).push(Object.assign({status:'invited',last:'Invited',tel:''},f));
        if(window.MSAM&&u.am) MSAM.setUser(c.id,{n,email:u.email},u.am); });
      try{ if(window.MSNOTES) MSNOTES.log('org:'+c.id,'people',me().n+' invited '+[W.contact].concat(W.users).map(u=>u.n||u.email).join(', ')+' to join.'); }catch(e){}
      try{ window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:c.id}})); }catch(e){} if(window.MSORGTABLE&&MSORGTABLE.redraw) MSORGTABLE.redraw(); return true; }
    function commit(status){ const o=db(); if(!W.no){ o.seq=(o.seq||1040)+1; W.no='CUS-'+o.seq; }
      const id=W.id||(W.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'customer')+'-'+W.no.slice(4); W.id=id;
      const mk=(u,i)=>{ const n=u.n||u.email.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), s=window.MSNAME?MSNAME.split(n):{}; return Object.assign({n,firstName:u.firstName||s.first||'',lastName:u.lastName||s.last||'',pref:u.pref||''},mk0(u,i)); };
      const mk0=(u,i)=>({role:u.role,title:u.title||u.role,email:u.email,tel:'',last:status==='draft'?'Not invited':'Invited',status:status==='draft'?'draft':'invited',main:i===0});
      const people=[W.contact].concat(W.users), num=s=>+String(s||'').replace(/[^0-9.]/g,'')||0;
      const addrOf=d=>d.sameAsBilling?btxt(W):d.address, fieldsOf=d=>AD()?(d.sameAsBilling?W.billing:d.addr):{};
      const rec=Object.assign({},(D.customers.find(c=>c.id===id)||{}),{id,customerNo:W.no,name:W.name.trim(),initials:initials(W.name),domain:W.domain.trim().replace(/^https?:\/\//,'').replace(/\/.*$/,''),website:W.domain.trim(),
        companyNo:W.companyNo,address:btxt(W)||'—',...(AD()?W.billing:{}),status,since:month(),createdAt:new Date().toISOString(),createdBy:me().n,projects:0,openApprovals:0,totalSpend:'£0',spend12:'£0',lastOrder:'—',
        discountGroup:W.terms.discount,standingDiscount:(W.terms.discount.match(/[\d.]+%/)||['0%'])[0],creditLimit:W.terms.credit?'£'+num(W.terms.credit).toLocaleString('en-GB'):'',paymentTerms:W.terms.payment,vat:W.terms.vat,vatApplicable:W.terms.vat!==false,poLevel:W.terms.poLevel||DEFT().poLevel,
        delivery:W.delivery.map(d=>({label:d.label||'Delivery address',address:addrOf(d)})),addresses:W.delivery.map((d,i)=>Object.assign({id:'a'+(i+1),title:d.label||(i?'Delivery address '+(i+1):'Head office'),isDefault:i===0},fieldsOf(d))),brand:W.brand,teams:[{name:'Team',users:people.map(mk)}],_wiz:JSON.parse(JSON.stringify(W))});
      const T=window.MSTERMS, ask=T&&status==='invited'&&needT(W.terms)&&!T.pending(id)&&!rec.termsApproved;
      if(T&&needT(W.terms)&&!rec.termsApproved){ const dc=defCur(); rec.paymentTerms=dc.payment; rec.creditLimit=dc.credit; }
      o.items=o.items.filter(x=>x.id!==id); o.items.unshift(rec); if(!save(o)) return false;
      const i=D.customers.findIndex(x=>x.id===id); if(i>=0) D.customers[i]=rec; else D.customers.unshift(rec);
      if(window.MSAM) people.forEach(u=>{ if(u.am) MSAM.setUser(id,{n:mk(u,0).n,email:u.email},u.am); });
      if(status==='invited'){ try{ const r=JSON.parse(localStorage.getItem('ms-cust-onboard')||'{}'); r[id]={invitedAt:new Date().toISOString(),done:{},brand:{hasLogo:!!(W.brand.logoFull||W.brand.logoSq)},people:people.length}; localStorage.setItem('ms-cust-onboard',JSON.stringify(r)); localStorage.setItem('ms-cust-onboard-latest',id); }catch(e){} }
      if(ask) T.request(rec,W.terms);
      const ct=document.querySelector('.tab[data-tab="customers"] .ct'); if(ct) ct.textContent=D.customers.length;
      try{ window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:id}})); }catch(e){}
      if(window.MSORGTABLE&&MSORGTABLE.redraw) MSORGTABLE.redraw(); return true; }
    draw(); }

  function toast(m){ const t=document.createElement('div'); t.className='fm-toast'; t.textContent=m; t.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font:600 13.5px var(--sans);padding:12px 20px;border-radius:12px;z-index:1800'; document.body.appendChild(t); setTimeout(()=>t.remove(),2800); }

  const css=`
  .cw-scrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);display:grid;place-items:start center;z-index:1300;opacity:0;transition:opacity .2s;overflow-y:auto;padding:5vh 16px;} .cw-scrim.open{opacity:1;}
  .cw-modal{background:var(--paper);width:min(760px,100%);border-radius:18px;box-shadow:0 30px 80px rgba(20,22,45,.4);display:flex;flex-direction:column;max-height:90vh;}
  .cw-head{display:flex;align-items:flex-start;gap:12px;padding:18px 22px 12px;} .cw-head>div{flex:1;} .cw-head h3{font-family:var(--serif);font-weight:500;font-size:23px;margin:0;} .cw-head small{font-size:12.5px;color:var(--muted);}
  .cw-close{border:0;background:none;font-size:26px;line-height:1;color:var(--muted);cursor:pointer;}
  .cw-prog{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;padding:0 22px 14px;border-bottom:1px solid var(--line-soft);}
  .cw-prog button{display:flex;flex-direction:column;align-items:flex-start;gap:6px;border:0;background:none;font:inherit;padding:0;cursor:pointer;text-align:left;color:var(--muted);} .cw-prog button:disabled{cursor:default;}
  .cw-prog button::before{content:"";display:block;width:100%;height:4px;border-radius:4px;background:var(--line-soft);} .cw-prog button.done::before,.cw-prog button.on::before{background:var(--periwinkle-deep);}
  .cw-prog i{display:none;} .cw-prog span{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;} .cw-prog .on span{color:var(--periwinkle-deep);} .cw-prog .done span{color:var(--ink-2);}
  .cw-body{padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;}
  .cw-lede{font-size:13.5px;color:var(--text-soft);margin:0;line-height:1.5;}
  .cw-h{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 -4px;display:flex;flex-wrap:wrap;gap:2px 8px;align-items:baseline;white-space:nowrap;} .cw-h em{white-space:normal;} .cw-h em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);}
  .cw-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;} .cw-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;} @media(max-width:640px){.cw-grid,.cw-grid3{grid-template-columns:1fr;}}
  .cw-grid-nm{grid-template-columns:1fr 1fr!important;} .cw-grid-nm .nm-row.three{grid-template-columns:1fr 1fr 1fr;}
  .cw-f{display:flex;flex-direction:column;gap:5px;min-width:0;} .cw-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .cw-f>span em{color:#c0392b;font-style:normal;} .cw-f small{font-size:11.5px;color:var(--muted);line-height:1.4;}
  .cw-f input,.cw-f select,.cw-f textarea,.cw-ur input,.cw-ur select,.cw-bulk textarea,.cw-bulk select,.cw-del input,.cw-del textarea{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;color:var(--ink);min-width:0;width:100%;resize:vertical;}
  .cw-f input:focus,.cw-f select:focus,.cw-f textarea:focus,.cw-ur input:focus,.cw-bulk textarea:focus{outline:0;border-color:var(--periwinkle-deep);box-shadow:0 0 0 2px var(--tint-peri);}
  .cw-ro{font-size:14px;color:var(--ink-2);background:var(--paper-2);border-radius:10px;padding:9px 11px;white-space:pre-wrap;}
  .cw-users{border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;background:#fff;} .cw-uh,.cw-ur{display:grid;grid-template-columns:1.5fr 1fr .8fr 1fr 28px;gap:6px;align-items:center;padding:6px 8px;}
  .cw-uh{background:var(--paper);font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);} .cw-ur+.cw-ur{border-top:1px solid var(--paper-2);} .cw-ur input,.cw-ur select{padding:6px 8px;font-size:13px;}
  @media(max-width:640px){.cw-uh{display:none;} .cw-ur{grid-template-columns:1fr 1fr;} }
  .cw-x{border:0;background:none;font-size:18px;color:var(--muted);cursor:pointer;} .cw-x:hover{color:#c0392b;}
  .cw-bulk{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;} .cw-bulk textarea{flex:1 1 280px;} .cw-bulkr{display:flex;gap:8px;align-items:center;} .cw-bulkr select{width:auto;padding:7px 9px;font-size:13px;}
  .cw-roles{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--muted);} .cw-roles b{color:var(--ink-2);}
  .cw-brand{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:20px;} @media(max-width:700px){.cw-brand{grid-template-columns:1fr;}}
  .cw-logos{display:grid;grid-template-columns:minmax(150px,auto) 1fr;gap:14px;margin:10px 0 14px;} .cw-logo{display:flex;flex-direction:column;gap:5px;} .cw-ll{font-size:12.5px;font-weight:700;color:var(--ink-2);} .cw-logo small{font-size:11.5px;color:var(--muted);white-space:nowrap;}
  .cw-drop{height:84px;border:1.5px dashed var(--line);border-radius:12px;display:grid;place-items:center;cursor:pointer;background:#fff;overflow:hidden;color:var(--periwinkle-deep);font-size:13px;font-weight:700;} .cw-drop.sq{width:84px;} .cw-drop:hover{border-color:var(--periwinkle-deep);} .cw-drop.has{border-style:solid;border-color:var(--line-soft);} .cw-drop img{max-width:90%;max-height:80%;object-fit:contain;}
.cw-mono{display:flex;flex-direction:column;gap:10px;margin:10px 0 14px;} .cw-monopv{display:flex;gap:8px;} .cw-monopv span{flex:1;height:62px;border-radius:10px;display:grid;place-items:center;border:1px solid var(--line-soft);} .cw-monopv .lt{background:#fff;} .cw-monopv .dk{background:var(--ink);}
  .cw-monopv img{max-width:80%;max-height:60%;object-fit:contain;} .cw-monopv .lt img{filter:brightness(0);} .cw-monopv .dk img{filter:brightness(0) invert(1);} .cw-monoh{font-size:11.5px;color:var(--muted);}
  .cw-mode{width:100%;} .cw-mode button{flex:1;white-space:nowrap;}
  .cw-srch{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;}
  .cw-exl{display:flex;flex-direction:column;gap:6px;max-height:320px;overflow:auto;} .cw-exo{display:flex;align-items:center;gap:11px;border:1.5px solid var(--line-soft);background:#fff;border-radius:12px;padding:9px 12px;font:inherit;text-align:left;cursor:pointer;} .cw-exo:hover{border-color:var(--periwinkle);} .cw-exo.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);}
  .cw-exo>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column;} .cw-exo b{font-size:14px;} .cw-exo small{font-size:12px;color:var(--muted);} .cw-exo em{font-style:normal;font-size:11px;font-weight:800;color:var(--periwinkle-deep);white-space:nowrap;}
  .cw-exlg{width:34px;height:34px;border-radius:9px;background:var(--periwinkle-deep);color:#fff;display:grid;place-items:center;font-size:11.5px;font-weight:800;flex:none;}
  .cw-dup{display:flex;flex-direction:column;gap:6px;border-radius:12px;padding:11px 13px;background:#fbeccd;font-size:13px;} .cw-dup.strong{background:var(--tint-red);} .cw-dup>b{font-size:13px;color:#8a5a12;} .cw-dup.strong>b{color:#b4232c;}
  .cw-dupr{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;} .cw-dupr small{color:var(--ink-3);}
  .cw-pw{margin:-6px 0 0;font-size:12px;font-weight:600;color:#8a5a12;} .cw-pw.block{color:#b4232c;} .cw-urw{padding:0 10px 8px;} .cw-urw .cw-pw{margin:0;}
  .cw-prog button.skip span{color:var(--line);text-decoration:line-through;} .cw-prog button.skip::before{background:var(--paper-2);}
  .cw-fin{display:flex;flex-direction:column;gap:2px;border-radius:12px;padding:10px 13px;background:var(--paper-2);font-size:12.5px;color:var(--ink-2);line-height:1.5;} .cw-fin b{font-size:13px;} .cw-fin.on{background:#fbeccd;} .cw-fin.on b{color:#8a5a12;} .cw-pend{color:#8a5a12!important;font-weight:700;}
  .cw-cols{display:flex;flex-direction:column;gap:8px;margin-top:10px;} .cw-col{display:grid;grid-template-columns:36px 1fr 92px;gap:10px;align-items:center;}
  .cw-sw{width:36px;height:36px;border-radius:10px;border:1px solid rgba(0,0,0,.12);cursor:pointer;position:relative;overflow:hidden;} .cw-sw input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;}
  .cw-col b{display:block;font-size:13.5px;} .cw-col small{font-size:11.5px;color:var(--muted);} .cw-hex{font:600 13px ui-monospace,monospace;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 8px;text-transform:uppercase;width:100%;}
  .cw-pv{margin-top:10px;border:1px solid var(--line-soft);border-radius:14px;overflow:hidden;background:#fff;} .cw-pvh{display:flex;align-items:center;gap:8px;padding:12px 14px;} .cw-pvh img{height:22px;max-width:130px;object-fit:contain;} .cw-pvh b{font-size:14px;flex:1;} .cw-pvh i{width:22px;height:6px;border-radius:4px;background:rgba(255,255,255,.55);} .cw-pvh img+i{margin-left:auto;}
  .cw-pvb{padding:18px 16px 20px;} .cw-pvbadge{display:inline-block;color:#fff;font-size:10.5px;font-weight:800;border-radius:6px;padding:2px 7px;} .cw-pvb h5{font-family:var(--serif);font-weight:500;font-size:20px;margin:8px 0 4px;} .cw-pvb p{font-size:12.5px;margin:0 0 12px;opacity:.85;} .cw-pvbtn{white-space:nowrap;display:inline-block;color:#fff;font-size:12.5px;font-weight:800;border-radius:999px;padding:8px 14px;}
  .cw-seg{display:flex;background:var(--paper-2);border-radius:10px;padding:3px;width:max-content;} .cw-seg button{border:0;background:none;font:inherit;font-size:13.5px;font-weight:700;color:var(--ink-3);padding:6px 18px;border-radius:8px;cursor:pointer;} .cw-seg button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.1);}
  .cw-del{display:flex;flex-direction:column;gap:8px;background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:12px;} .cw-delh{display:flex;gap:10px;align-items:center;} .cw-delh input{font-weight:700;}
  .cw-chk{display:flex;gap:8px;align-items:center;font-size:13.5px;color:var(--ink-2);} .cw-chk input{accent-color:var(--periwinkle-deep);}
  .cw-link{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;white-space:nowrap;}
  .cw-rev{display:grid;grid-template-columns:1fr 1fr;gap:12px;} @media(max-width:640px){.cw-rev{grid-template-columns:1fr;}}
  .cw-rc{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;} .cw-rc p{margin:0;font-size:12.5px;color:var(--ink-2);white-space:pre-wrap;} .cw-rc>small{font-size:12px;color:var(--muted);}
  .cw-rch{display:flex;justify-content:space-between;align-items:center;} .cw-rch b{font-size:13.5px;}
  .cw-org{display:flex;gap:10px;align-items:center;} .cw-org img,.cw-org>span{width:36px;height:36px;border-radius:9px;object-fit:contain;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:800;flex:none;border:1px solid var(--line-soft);} .cw-org b{display:block;font-size:14px;} .cw-org small{font-size:12px;color:var(--muted);}
  .cw-rp{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:13px;} .cw-rp>span{white-space:nowrap;flex:0 0 auto;max-width:65%;overflow:hidden;text-overflow:ellipsis;padding-right:1px;} .cw-rp small{color:var(--muted);text-align:right;min-width:0;} .cw-rp em{white-space:nowrap;font-style:normal;font-size:10.5px;font-weight:800;color:var(--periwinkle-deep);background:var(--tint-peri);border-radius:5px;padding:1px 5px;margin-left:4px;}
  .cw-rsw{display:flex;gap:6px;} .cw-rsw span{width:26px;height:26px;border-radius:7px;border:1px solid rgba(0,0,0,.1);}
  .cw-next{background:var(--tint-peri);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink-2);line-height:1.5;} .cw-next b{color:var(--periwinkle-deep);}
  .cw-err{color:#b4232c;font-size:13px;font-weight:600;margin:0;background:var(--tint-red);border-radius:10px;padding:9px 12px;} .cw-err[hidden]{display:none;}
  .cw-foot{display:flex;gap:10px;align-items:center;padding:14px 22px;border-top:1px solid var(--line-soft);} .cw-foot>span{flex:1;} .cw-foot .btn{white-space:nowrap;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {open,canAdd};
})();
