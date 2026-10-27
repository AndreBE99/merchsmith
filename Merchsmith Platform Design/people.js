/* ============================================================
   people.js — ONE saved store for organisations, teams and users,
   plus the shared editors (user, invite, teams, organisation).

   Pages keep their own seed data (org-data.js, team-page.js, admin-data.js)
   and call hydrate() on load: the store overlays every saved edit onto the
   seed IN PLACE, so existing renderers keep working unchanged. All edits go
   through this module and persist to localStorage('ms-people').

   Rules (agreed Sep 2026):
     · org admins edit anyone in their org; everyone edits their own profile
     · a distributor admin has full edit over their customers' users
     · people are DEACTIVATED, never deleted — kept for history, seat freed
     · distributor roles are the five billable seat roles

   Keys:  orgKey = 'mojo' | customer id | supplier id | 'merchsmith'
          user key = lower-cased seed email || name (stable across edits)
   ============================================================ */
window.MSPEOPLE=(function(){
  const KEY='ms-people';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let S=null;
  function st(){ if(S) return S; try{ S=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
    S=S||{}; ['users','added','teams','orgs','photos','me'].forEach(k=>{ if(!S[k]) S[k]={}; }); return S; }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(st())); }catch(e){ alert('Could not save — browser storage is full. Try a smaller photo.'); } }
  const lk=s=>String(s||'').trim().toLowerCase();
  const ukey=u=>u._ukey||(u._ukey=lk(u.email)||lk(u.n));

  /* ---------- roles & seats ---------- */
  const ROLES={
    distributor:['Admin','Account Manager','Studio','Production Manager','Finance'],
    customer:['Admin','Buyer','Finance','Viewer'],
    supplier:['Admin','Contact'],
    merchsmith:['Owner','Admin','Support','Billing']
  };
  // legacy seed labels → the current role names
  const ROLEMAP={ 'Account Admin':'Admin', 'Studio / Designer':'Studio', 'Designer':'Studio', 'Finance User':'Finance' };
  const normRole=r=>ROLEMAP[r]||r;
  const BILLABLE=ROLES.distributor;
  /* The permissions matrix — the single source for every role check in the app
     and for the reference table on the Org & User Model page. Keyed by org type,
     then action → roles allowed. "Own profile" is always editable by its owner. */
  const ACTIONS=[
    ['invite','Invite people'],['editUsers','Edit other people'],['changeRoles','Change roles'],
    ['deactivate','Deactivate / reactivate'],['manageTeams','Create, rename, delete teams'],
    ['editOrg','Edit organisation details & logo'],['editCustomers','Edit customer users'],
    ['finance','See costs, margin & invoices'],['approveOrders','Approve quotes & orders'],
    ['manageRange','Change the product range'],['resetRange','Reset the product range']];
  const PERMS={
    distributor:{ invite:['Admin'], editUsers:['Admin'], changeRoles:['Admin'], deactivate:['Admin'], manageTeams:['Admin'],
      editOrg:['Admin'], editCustomers:['Admin','Account Manager'], finance:['Admin','Finance'],
      approveOrders:['Admin','Account Manager'], manageRange:['Admin','Account Manager'], resetRange:['Admin'] },
    customer:{ invite:['Admin'], editUsers:['Admin'], changeRoles:['Admin'], deactivate:['Admin'], manageTeams:['Admin'],
      editOrg:['Admin'], finance:['Admin'], approveOrders:['Admin','Buyer'] },
    supplier:{ invite:['Admin'], editUsers:['Admin'], changeRoles:['Admin'], deactivate:['Admin'], manageTeams:['Admin'], editOrg:['Admin'] },
    merchsmith:{ invite:['Owner','Admin'], editUsers:['Owner','Admin'], changeRoles:['Owner'], deactivate:['Owner','Admin'],
      manageTeams:['Owner','Admin'], editOrg:['Owner','Admin'], editCustomers:['Owner','Admin','Support'], finance:['Owner','Billing'],
      manageRange:['Owner','Admin'], resetRange:['Owner'] }
  };
  const TYPE_OF={admin:'merchsmith',distributor:'distributor',customer:'customer',supplier:'supplier'};
  // can the signed-in person do `action`? (Merchsmith operators act across every org)
  function can(action){ const v=viewer(); const t=TYPE_OF[v.id]||'distributor';
    const role=v.id==='admin'?normRole((window.MSID&&MSID.get&&MSID.get().role)==='Operator'?'Owner':v.role):v.role;
    return ((PERMS[t]||{})[action]||[]).includes(role); }          // every distributor role is a paid seat
  function recordSeats(orgKey,teams){ const s=st(); s.seats=s.seats||{}; const n=seatsUsed(teams); if(s.seats[orgKey]!==n){ s.seats[orgKey]=n; save(); } return n; }
  function seatsUsed(teams){
    return (teams||[]).flatMap(t=>t.users||[]).filter(u=>u.status!=='deactivated'&&BILLABLE.includes(normRole(u.role))).length; }

  /* ---------- hydrate: overlay saved edits onto a seed ---------- */
  function hydrate(orgKey,teams){
    const s=st(), T=s.teams[orgKey]||{}, P=s.users[orgKey]||{};
    // team renames / deletions / creations
    teams.forEach(t=>{ if(T.renames&&T.renames[t.name]) t.name=T.renames[t.name]; });
    if(T.deleted&&T.deleted.length){ for(let i=teams.length-1;i>=0;i--) if(T.deleted.includes(teams[i].name)&&!(teams[i].users||[]).length) teams.splice(i,1); }
    (T.created||[]).forEach(n=>{ if(!teams.some(t=>t.name===n)) teams.push({name:n,users:[]}); });
    const byName=n=>teams.find(t=>t.name===n)||(teams.push({name:n,users:[]}),teams[teams.length-1]);
    // user patches, including moves between teams
    const moves=[];
    teams.forEach(t=>(t.users||[]).forEach(u=>{ u._org=orgKey; u.role=normRole(u.role); const p=P[ukey(u)];
      if(!p) return; const {team,...rest}=p; Object.assign(u,rest); if(team&&team!==t.name) moves.push([u,t,team]); }));
    moves.forEach(([u,from,to])=>{ from.users.splice(from.users.indexOf(u),1); byName(to).users.push(u); });
    // people added since the seed
    (s.added[orgKey]||[]).forEach(a=>{ if(teams.some(t=>t.users.some(u=>ukey(u)===a._ukey))) return;
      const u=Object.assign({},a); u._org=orgKey; byName(a.team||'General').users.push(u); });
    return teams;
  }
  // suppliers keep a flat contact list — wrap it as one team
  function hydrateContacts(orgKey,contacts){ const t=[{name:'Contacts',users:contacts}]; hydrate(orgKey,t);
    contacts.splice(0,contacts.length,...t.flatMap(x=>x.users)); return contacts; }
  function hydrateOrg(orgKey,org){ const o=st().orgs[orgKey]; if(o) Object.assign(org,o); return org; }

  /* ---------- activity + audit log ---------- */
  function actor(){ const v=viewer(); return v.name||'Someone'; }
  function log(orgKey,u,action,detail){ const s=st(); s.log=s.log||[];
    s.log.unshift({at:new Date().toISOString(),org:orgKey,user:u?(u.n||''):'',ukey:u?ukey(u):'',actor:actor(),action,detail:detail||''});
    if(s.log.length>1500) s.log.length=1500; }
  const LBL={invited:'Invited',edited:'Details edited',role:'Role changed',team:'Moved team',deactivated:'Deactivated',reactivated:'Reactivated',
    photo:'Photo updated',teamCreated:'Team created',teamRenamed:'Team renamed',teamDeleted:'Team deleted',orgEdited:'Organisation edited',joined:'Accepted invitation'};
  function activity(orgKey,u){ const k=ukey(u); return (st().log||[]).filter(e=>e.org===orgKey&&e.ukey===k); }
  function audit(filter){ let l=st().log||[]; if(filter&&filter.org) l=l.filter(e=>e.org===filter.org); return l; }

  /* ---------- mutations ---------- */
  function isAdded(orgKey,u){ return (st().added[orgKey]||[]).some(a=>a._ukey===ukey(u)); }
  function saveUser(orgKey,u,fields){
    const s=st(); const k=ukey(u);
    { const ch=[]; if(fields.role&&normRole(fields.role)!==normRole(u.role)) log(orgKey,u,'role',normRole(u.role)+' → '+fields.role);
      if(fields.team&&fields.team!==u.team&&u.team!==undefined) log(orgKey,u,'team','→ '+fields.team);
      if(fields.photo!==undefined) log(orgKey,u,'photo',fields.photo?'':'removed');
      ['n','title','email','tel'].forEach(f=>{ if(fields[f]!==undefined&&(fields[f]||'')!==(u[f]||'')) ch.push({n:'name',title:'title',email:'email',tel:'phone'}[f]); });
      if(ch.length) log(orgKey,u,'edited',ch.join(', ')); }
    if(fields.photo!==undefined){ if(fields.photo) s.photos[lk(fields.n||u.n)]=fields.photo; else delete s.photos[lk(u.n)]; }
    if(fields.n&&fields.n!==u.n&&s.photos[lk(u.n)]){ s.photos[lk(fields.n)]=s.photos[lk(u.n)]; delete s.photos[lk(u.n)]; }
    if(isAdded(orgKey,u)){ const a=s.added[orgKey].find(x=>x._ukey===k); Object.assign(a,fields); }
    else { s.users[orgKey]=s.users[orgKey]||{}; s.users[orgKey][k]=Object.assign(s.users[orgKey][k]||{},fields); }
    const {team,...rest}=fields; Object.assign(u,rest); save(); return u;
  }
  function addUser(orgKey,team,f){
    const s=st(); const u=Object.assign({status:'invited',last:'Invited',tel:'',invitedAt:new Date().toISOString()},f,{team});
    u._ukey=lk(u.email)||lk(u.n); s.added[orgKey]=s.added[orgKey]||[]; s.added[orgKey].push(u);
    log(orgKey,u,'invited',(f.role||'')+(team?' · '+team:''));
    if(f.photo) s.photos[lk(f.n)]=f.photo; save(); return Object.assign({},u,{_org:orgKey});
  }
  const setStatus=(orgKey,u,status)=>{ log(orgKey,u,status==='deactivated'?'deactivated':(status==='active'&&u.status==='invited'?'joined':'reactivated'));
    return saveUser(orgKey,u,{status,last:status==='deactivated'?'Deactivated':'Just now'}); };
  function teamOps(orgKey){ const s=st(); return s.teams[orgKey]=s.teams[orgKey]||{renames:{},deleted:[],created:[]}; }
  function createTeam(orgKey,teams,name){ name=name.trim(); if(!name||teams.some(t=>t.name===name)) return false;
    const o=teamOps(orgKey); o.created.push(name); o.deleted=o.deleted.filter(n=>n!==name); teams.push({name,users:[]}); log(orgKey,null,'teamCreated',name); save(); return true; }
  function renameTeam(orgKey,teams,from,to){ to=to.trim(); if(!to||teams.some(t=>t.name===to)) return false;
    const o=teamOps(orgKey); const t=teams.find(x=>x.name===from); if(!t) return false;
    const origin=Object.keys(o.renames).find(k=>o.renames[k]===from)||from;
    if(o.created.includes(from)) o.created[o.created.indexOf(from)]=to; else o.renames[origin]=to;
    // saved patches that pointed at the old name follow the team
    const s=st(); Object.values(s.users[orgKey]||{}).forEach(p=>{ if(p.team===from) p.team=to; });
    (s.added[orgKey]||[]).forEach(a=>{ if(a.team===from) a.team=to; });
    t.name=to; log(orgKey,null,'teamRenamed',from+' → '+to); save(); return true; }
  function deleteTeam(orgKey,teams,name){ const t=teams.find(x=>x.name===name); if(!t||t.users.length) return false;
    const o=teamOps(orgKey); o.created=o.created.filter(n=>n!==name); if(!o.created.includes(name)) o.deleted.push(name);
    teams.splice(teams.indexOf(t),1); log(orgKey,null,'teamDeleted',name); save(); return true; }
  function saveOrg(orgKey,org,fields){ const s=st(); log(orgKey,null,'orgEdited',Object.keys(fields).filter(k=>k!=='initials').join(', ')); s.orgs[orgKey]=Object.assign(s.orgs[orgKey]||{},fields); Object.assign(org,fields); save(); }
  // the signed-in person's own profile (identity key → overrides)
  const me=id=>st().me[id]||{};
  function saveMe(id,fields){ const s=st(); const {photo,...rest}=fields; s.me[id]=Object.assign(s.me[id]||{},rest);
    if(photo!==undefined&&fields.n){ if(photo) s.photos[lk(fields.n)]=photo; else { delete s.photos[lk(fields.n)]; s.me[id].photo=''; } } save(); }

  /* ---------- permissions ---------- */
  function viewer(){ const id=(window.MSID&&MSID.current&&MSID.current())||'distributor';
    const g=(window.MSID&&MSID.get&&MSID.get())||{}; return {id,name:g.who||'',role:normRole(g.role||'')}; }
  const isAdminRole=r=>/admin|owner/i.test(r||'');
  // may the signed-in person edit this user, belonging to orgKey of `kind`?
  function canEdit(kind,u){
    const v=viewer(); if(v.id==='admin') return true;                    // Merchsmith operators
    if(u&&lk(u.n)===lk(v.name)) return true;                           // own profile
    if(v.id==='distributor'&&kind==='cust') return can('editCustomers');
    if(v.id==='distributor'&&kind==='sup') return can('editUsers');
    return can('editUsers');
  }
  const canManage=kind=>{ const v=viewer(); if(v.id==='admin') return true;
    if(v.id==='distributor'&&kind==='cust') return can('editCustomers'); return can('invite'); };

  /* ---------- avatars ---------- */
  function photo(u){ return (u&&(st().photos[lk(u.n)]||u.photo))||(window.MSAvatar&&u?MSAvatar.url(u.n):null); }
  const initials=n=>window.MSNAME?MSNAME.initials(String(n||'?')):String(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  function avHTML(u,px){ px=px||36; const p=photo(u);
    return p?`<img src="${esc(p)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:esc(initials(u&&u.n)); }
  // file → square-cropped JPEG data URL (kept small: it lives in localStorage)
  function readPhoto(file,size){ size=size||240; return new Promise((res,rej)=>{
    if(!file||!/^image\//.test(file.type)) return rej(new Error('Please choose an image file'));
    const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
      const c=document.createElement('canvas'); c.width=c.height=size; const x=c.getContext('2d');
      const s=Math.min(img.width,img.height); x.fillStyle='#fff'; x.fillRect(0,0,size,size);
      x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,size,size); res(c.toDataURL('image/jpeg',.85)); };
      img.onerror=()=>rej(new Error('That image could not be read')); img.src=r.result; };
    r.onerror=()=>rej(new Error('That file could not be read')); r.readAsDataURL(file); }); }
  // logos keep their shape — contain within a square, transparent-safe PNG
  function readLogo(file){ return new Promise((res,rej)=>{
    if(!file||!/^image\//.test(file.type)) return rej(new Error('Please choose an image file'));
    const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
      const m=320, k=Math.min(1,m/Math.max(img.width,img.height)); const c=document.createElement('canvas');
      c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      res(c.toDataURL('image/png')); }; img.onerror=()=>rej(new Error('That image could not be read')); img.src=r.result; };
    r.readAsDataURL(file); }); }

  /* ---------- modal shell ---------- */
  function modal(title,body,foot){
    const w=document.createElement('div'); w.className='pp-scrim';
    w.innerHTML=`<div class="pp-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="pp-hd"><h3>${esc(title)}</h3><button class="pp-x" data-ppx aria-label="Close">×</button></div>
      <div class="pp-bd">${body}</div><div class="pp-ft">${foot||''}</div></div>`;
    document.body.appendChild(w); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>w.classList.add('open'));
    const close=()=>{ w.classList.remove('open'); setTimeout(()=>{ w.remove(); if(!document.querySelector('.pp-scrim')) document.body.style.overflow=''; },180);
      document.removeEventListener('keydown',k); };
    function k(e){ if(e.key==='Escape') close(); }
    document.addEventListener('keydown',k);
    w.addEventListener('click',e=>{ if(e.target===w) close(); });
    w.querySelectorAll('[data-ppx]').forEach(b=>b.onclick=close);
    return {root:w,close};
  }
  const toast=m=>{ let t=document.getElementById('ppToast'); if(!t){ t=document.createElement('div'); t.id='ppToast'; t.className='pp-toast'; document.body.appendChild(t); }
    t.textContent=m; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2400); };

  /* ---------- user editor (edit + invite share one form) ---------- */
  function avatarField(u){ const p=photo(u);
    return `<div class="pp-avf"><span class="pp-av" data-ppav>${p?`<img src="${esc(p)}" alt="">`:esc(initials(u&&u.n||''))}</span>
      <div><div class="pp-avbtns"><label class="pp-btn ghost sm">Upload photo<input type="file" accept="image/*" data-ppfile hidden></label>
      <button type="button" class="pp-btn ghost sm" data-ppclear ${p?'':'hidden'}>Remove</button></div>
      <span class="pp-hint">Square-cropped automatically · JPG or PNG</span></div></div>`; }
  function userForm(opts){
    const u=opts.user||{}, kind=opts.kind||'team';
    const roles=ROLES[opts.orgType||'distributor']||ROLES.distributor;
    const teams=opts.teamNames||[];
    let pic; // undefined = unchanged, '' = removed, data URL = new
    const nKey=(opts.user&&opts.orgKey&&window.MSNOTES)?'user:'+opts.orgKey+':'+ukey(u):'';
    const notesHost=nKey?`<details class="pp-notes"><summary>Notes, comments &amp; history</summary><div data-entkey="${esc(nKey)}">${MSNOTES.panelHTML(nKey)}</div></details>`:'';
    const m=modal(opts.title,`${avatarField(u)}
      <div class="pp-grid">
        <label class="pp-f"><span>Full name</span><input data-f="n" value="${esc(u.n||'')}" autocomplete="off"></label>
        <label class="pp-f"><span>Job title</span><input data-f="title" value="${esc(u.title||'')}"></label>
        <label class="pp-f"><span>Email</span><input data-f="email" type="email" value="${esc(u.email||'')}"></label>
        <label class="pp-f"><span>Telephone</span><input data-f="tel" value="${esc(u.tel||'')}"></label>
        <label class="pp-f"><span>Role</span><select data-f="role" ${opts.lockRole?'disabled':''}>${roles.map(r=>`<option ${normRole(u.role)===r?'selected':''}>${r}</option>`).join('')}</select></label>
        ${teams.length?`<label class="pp-f"><span>${kind==='sup'?'Group':'Team'}</span><select data-f="team">${teams.map(t=>`<option ${opts.team===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`:''}
      </div>
      ${opts.orgType==='distributor'&&!opts.user?`<p class="pp-note">Every distributor role is a billable seat.${opts.seatNote?' '+esc(opts.seatNote):''}</p>`:''}
      ${opts.lockRole?`<p class="pp-note">Only an admin can change your role.</p>`:''}
      ${opts.user&&!opts.self?`<div class="pp-status"><div><b>${u.status==='deactivated'?'Deactivated':u.status==='invited'?'Invitation pending':'Active'}</b>
        <span>${u.status==='deactivated'?'Kept for history. Does not count as a seat and cannot sign in.':'Deactivating keeps their history and frees the seat.'}</span></div>
        ${u.status==='invited'?`${opts.orgKey?`<a class="pp-btn ghost sm" target="_blank" href="Merchsmith Accept Invite.html?org=${encodeURIComponent(opts.orgKey)}&u=${encodeURIComponent(ukey(u))}">Preview invitation ↗</a>`:''}<button type="button" class="pp-btn ghost sm" data-ppresend>Resend invite</button><button type="button" class="pp-btn ghost sm" data-pprevoke>Revoke</button>`:
          u.status==='deactivated'?`<button type="button" class="pp-btn ghost sm" data-ppstatus="active">Reactivate</button>`:
          `<button type="button" class="pp-btn ghost sm danger" data-ppstatus="deactivated">Deactivate</button>`}</div>`:''}${notesHost}`,
      `<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-ppsave>${opts.user?'Save changes':'Send invite'}</button>`);
    if(nKey){ const h=m.root.querySelector('[data-entkey]'); MSNOTES.wire(h,nKey); }
    if(window.MSNAME) MSNAME.upgrade(m.root.querySelector('[data-f="n"]'),{pref:true,prefValue:u.pref||''});
    const R=m.root, av=R.querySelector('[data-ppav]'), clr=R.querySelector('[data-ppclear]');
    R.querySelector('[data-ppfile]').onchange=async e=>{ try{ pic=await readPhoto(e.target.files[0]);
      av.innerHTML=`<img src="${pic}" alt="">`; clr.hidden=false; }catch(err){ toast(err.message); } };
    clr.onclick=()=>{ pic=''; av.textContent=initials(R.querySelector('[data-f="n"]').value); clr.hidden=true; };
    R.querySelectorAll('[data-ppstatus]').forEach(b=>b.onclick=()=>{ const to=b.dataset.ppstatus;
      if(to==='deactivated'&&!confirm('Deactivate '+u.n+'?\n\nTheir history is kept and the seat is freed. You can reactivate them later.')) return;
      if(opts.onStatus) opts.onStatus(to); m.close(); toast(u.n+(to==='deactivated'?' deactivated':' reactivated')); });
    const rs=R.querySelector('[data-ppresend]'); if(rs) rs.onclick=()=>{ if(opts.onResend) opts.onResend(); toast('Invite resent to '+(u.email||u.n)); };
    const rv=R.querySelector('[data-pprevoke]'); if(rv) rv.onclick=()=>{ if(!confirm('Revoke the invitation for '+u.n+'? They will not be able to join.')) return;
      if(opts.onStatus) opts.onStatus('deactivated'); m.close(); toast('Invitation revoked'); };
    R.querySelector('[data-ppsave]').onclick=()=>{
      const get=k=>{ const el=R.querySelector('[data-f="'+k+'"]'); return el?el.value.trim():undefined; };
      const f={n:get('n'),title:get('title'),email:get('email'),tel:get('tel')}; const np=window.MSNAME?MSNAME.parts(R.querySelector('[data-f="n"]')):{};
      if(np.firstName!==undefined){ if(!np.firstName){ R.querySelector('[data-nm="first"]').focus(); toast('Add a first name'); return; } Object.assign(f,np); }
      if(!opts.lockRole) f.role=get('role'); if(teams.length) f.team=get('team');
      if(!f.n){ R.querySelector('[data-f="n"]').focus(); return; }
      if(f.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)){ R.querySelector('[data-f="email"]').focus(); toast('That email address does not look right'); return; }
      if(f.email&&(opts.peers||[]).some(p=>p!==opts.user&&lk(p.email)===lk(f.email))){ R.querySelector('[data-f="email"]').focus(); toast('Someone in this organisation already uses that email'); return; }
      if(pic!==undefined) f.photo=pic;
      if(opts.onSave(f)===false) return; m.close(); toast(opts.user?'Changes saved':'Invite sent to '+(f.email||f.n));
    };
    setTimeout(()=>{ const n=R.querySelector('[data-f="n"]'); if(n&&!opts.user) n.focus(); },60);
    return m;
  }

  /* ---------- teams manager ---------- */
  function manageTeams(orgKey,teams,onChange,label){
    label=label||'Team';
    const draw=()=>`<ul class="pp-teams">${teams.map(t=>`<li><input value="${esc(t.name)}" data-ppteam="${esc(t.name)}" aria-label="${label} name">
      <span class="pp-tn">${t.users.length} ${t.users.length===1?'person':'people'}</span>
      <button class="pp-btn ghost sm" data-ppdel="${esc(t.name)}" ${t.users.length?'disabled title="Move or deactivate everyone first"':''}>Delete</button></li>`).join('')}</ul>
      <div class="pp-addteam"><input placeholder="New ${label.toLowerCase()} name" data-ppnew><button class="pp-btn sm" data-ppadd>Add</button></div>`;
    const m=modal('Manage '+label.toLowerCase()+'s',draw(),`<button class="pp-btn" data-ppx>Done</button>`);
    const wire=()=>{ const R=m.root;
      R.querySelectorAll('[data-ppteam]').forEach(i=>i.onchange=()=>{ const from=i.dataset.ppteam, to=i.value.trim();
        if(to===from) return; if(!renameTeam(orgKey,teams,from,to)){ toast('That name is empty or already used'); i.value=from; return; }
        i.dataset.ppteam=to; onChange&&onChange(); toast(label+' renamed'); });
      R.querySelectorAll('[data-ppdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Delete '+b.dataset.ppdel+'?')) return;
        deleteTeam(orgKey,teams,b.dataset.ppdel); redraw(); onChange&&onChange(); });
      const add=()=>{ const i=R.querySelector('[data-ppnew]'); if(!createTeam(orgKey,teams,i.value)){ toast('That name is empty or already used'); return; }
        redraw(); onChange&&onChange(); toast(label+' added'); };
      R.querySelector('[data-ppadd]').onclick=add;
      R.querySelector('[data-ppnew]').onkeydown=e=>{ if(e.key==='Enter') add(); };
    };
    const redraw=()=>{ m.root.querySelector('.pp-bd').innerHTML=draw(); wire(); };
    wire(); return m;
  }

  /* ---------- organisation editor ---------- */
  // address is held as separate lines; a legacy single-string address seeds line 1
  const ADDR=[['addr1','Address line 1'],['addr2','Address line 2'],['city','Town / city'],['county','County / region'],['postcode','Postcode'],['country','Country']];
  function addrLines(org){ const a={}; ADDR.forEach(([k])=>a[k]=org[k]||'');
    if(!ADDR.some(([k])=>org[k])&&org.address){ if(window.MSADDR) Object.assign(a,MSADDR.parse(org.address)); else a.addr1=org.address; } return a; }
  function addrText(org){ return window.MSADDR?MSADDR.lines(addrLines(org)):ADDR.map(([k])=>addrLines(org)[k]).filter(Boolean); }
  // address book: many titled addresses, exactly one default. A legacy single address
  // (flat fields or a string) becomes the first entry, titled "Head office".
  function addrBook(org){
    if(Array.isArray(org.addresses)&&org.addresses.length) return org.addresses.map(a=>Object.assign({},a));
    const a=addrLines(org); if(!ADDR.some(([k])=>a[k])) return [];
    return [Object.assign({id:'a1',title:'Head office',isDefault:true},a)];
  }
  const defaultAddr=org=>{ const b=addrBook(org); return b.find(a=>a.isDefault)||b[0]||null; };
  const lineText=a=>window.MSADDR?MSADDR.lines(a):ADDR.map(([k])=>a[k]).filter(Boolean);

  /* ---------- merch specialism tags — one shared vocabulary, managed centrally ---------- */
  const SKEY='ms-specialisms';
  const SPEC_DEF=['Generalist','Pens & writing','Notebooks & stationery','Drinkware','Bags','Apparel','Tech & gadgets','Eco & sustainable','Premium gifts','Print & signage','Awards & trophies','Confectionery'];
  function specList(){ try{ const v=JSON.parse(localStorage.getItem(SKEY)||'null'); if(Array.isArray(v)) return v; }catch(e){} return SPEC_DEF.slice(); }
  function specSave(l){ try{ localStorage.setItem(SKEY,JSON.stringify(l)); }catch(e){} }
  function manageSpecialisms(onDone){
    const m=modal('Manage specialism tags',`<p class="pp-hint" style="margin:0 0 12px">These tags describe what a supplier is known for. Renaming or deleting one updates every supplier using it.</p>
      <div class="pp-speclist" data-psl></div>
      <div class="pp-specadd"><input data-psnew placeholder="New tag, e.g. Umbrellas"><button class="pp-btn sm" data-psadd>Add tag</button></div>`,
      `<button class="pp-btn" data-ppx>Done</button>`);
    const R=m.root;
    const draw=()=>{ const l=specList();
      R.querySelector('[data-psl]').innerHTML=l.map((t,i)=>`<div class="pp-specrow"><input value="${esc(t)}" data-psi="${i}"><button class="pp-btn ghost sm" data-psdel="${i}" title="Delete tag">Delete</button></div>`).join('')||'<p class="pp-hint">No tags yet.</p>';
      R.querySelectorAll('[data-psi]').forEach(inp=>inp.onchange=()=>{ const l2=specList(), i=+inp.dataset.psi, was=l2[i], now=inp.value.trim();
        if(!now||l2.includes(now)){ inp.value=was; return; } l2[i]=now; specSave(l2); retag(was,now); toast('Renamed to '+now); });
      R.querySelectorAll('[data-psdel]').forEach(b=>b.onclick=()=>{ const l2=specList(), t=l2[+b.dataset.psdel];
        if(!confirm('Delete the tag “'+t+'”? It will be removed from every supplier using it.')) return;
        l2.splice(+b.dataset.psdel,1); specSave(l2); retag(t,null); draw(); });
    };
    const add=()=>{ const i=R.querySelector('[data-psnew]'), v=i.value.trim(); if(!v) return; const l=specList();
      if(l.some(x=>x.toLowerCase()===v.toLowerCase())){ toast('That tag already exists'); return; } l.push(v); specSave(l); i.value=''; draw(); };
    R.querySelector('[data-psadd]').onclick=add;
    R.querySelector('[data-psnew]').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); add(); } };
    R.querySelector('[data-ppx]').addEventListener('click',()=>onDone&&onDone());
    draw();
  }
  // rename (or remove, when now is null) a tag on every saved organisation
  function retag(was,now){ const s=st(); Object.values(s.orgs||{}).forEach(o=>{ if(!Array.isArray(o.specialisms)) return;
    const i=o.specialisms.indexOf(was); if(i<0) return; if(now) o.specialisms[i]=now; else o.specialisms.splice(i,1); }); save(); }

  // profile fields shared by every organisation — the same record the Settings → Organisation profile screen shows
  const PROFILE=[['legalName','Legal name','text'],['vat','VAT number','text'],['website','Website','text'],['phone','Phone','text'],
    ['about','About','area']];
  // main contact: one of the organisation's people, or someone added here (optionally invited to the team)
  function contactPeople(orgKey,org,opts){
    let L=opts.people||((org.teams||[]).flatMap(t=>(t.users||[]).map(u=>Object.assign({_team:t.name},u))))||[];
    if(!L.length&&Array.isArray(org.contacts)) L=org.contacts.slice();
    (st().added[opts.peopleKey||orgKey]||[]).forEach(a=>{ if(!L.some(u=>ukey(u)===ukey(a))) L.push(a); });
    const seen=new Set(); return L.filter(u=>u&&u.n&&u.status!=='deactivated'&&!seen.has(ukey(u))&&seen.add(ukey(u))); }
  function contactBlock(org,people,orgType){
    const cur=people.find(u=>org.contactUser&&ukey(u)===org.contactUser)||people.find(u=>lk(u.n)===lk(org.contactName)&&(!org.contactEmail||!u.email||lk(u.email)===lk(org.contactEmail)))||people.find(u=>lk(u.n)===lk(org.contactName));
    const sel=cur?ukey(cur):(org.contactName?'__other':(people[0]?ukey(people[0]):'__new'));
    const roles=ROLES[orgType]||ROLES.distributor;
    return `<div class="pp-mc wide" data-ppmc>
      <span class="pp-mch">Main contact</span>
      <div class="pp-mcl">${people.map(u=>`<label class="pp-mcp${sel===ukey(u)?' on':''}"><input type="radio" name="ppmc" value="${esc(ukey(u))}"${sel===ukey(u)?' checked':''}><span class="pp-mcav">${avHTML(u,32)}</span><span class="pp-mct"><b>${esc(u.n)}</b><i>${esc([u.title||u.role,u.email].filter(Boolean).join(' · '))}</i></span></label>`).join('')}
        ${org.contactName&&!cur?`<label class="pp-mcp${sel==='__other'?' on':''}"><input type="radio" name="ppmc" value="__other"${sel==='__other'?' checked':''}><span class="pp-mcav">${esc(initials(org.contactName))}</span><span class="pp-mct"><b>${esc(org.contactName)}</b><i>${esc([org.contactTitle,org.contactEmail].filter(Boolean).join(' · ')||'Not on the team')}</i></span></label>`:''}
        <label class="pp-mcp add${sel==='__new'?' on':''}"><input type="radio" name="ppmc" value="__new"${sel==='__new'?' checked':''}><span class="pp-mcav">+</span><span class="pp-mct"><b>Add a new contact</b><i>Someone not listed, e.g. your accounts team</i></span></label></div>
      <div class="pp-mcnew pp-grid" data-ppmcnew ${sel==='__new'?'':'hidden'}>
        <label class="pp-f"><span>Name</span><input data-mc="n" placeholder="Full name"></label>
        <label class="pp-f"><span>Email</span><input data-mc="email" type="email" placeholder="name@company.com"></label>
        <label class="pp-f"><span>Job title</span><input data-mc="title" placeholder="e.g. Accounts Manager"></label>
        <label class="pp-f"><span>Phone</span><input data-mc="tel" placeholder="Optional"></label>
        <label class="pp-mcinv wide"><input type="checkbox" data-mcinv><span>Also invite them to the team as</span><select data-mcrole>${roles.map(r=>`<option>${esc(r)}</option>`).join('')}</select></label>
      </div></div>`; }
  function editOrg(orgKey,org,onSave,extra,opts){
    extra=extra||[]; opts=opts||{};
    const people=contactPeople(orgKey,org,opts), orgType=opts.orgType||(/^dist/.test(orgKey)?'distributor':/^sup|bagworks/.test(orgKey)?'supplier':orgKey==='merchsmith'?'merchsmith':'customer');
    let logo;
    let book=addrBook(org); const openIdx=new Set();   // cards start collapsed
    let specs=Array.isArray(org.specialisms)?org.specialisms.slice():[];
    const cur=org.logo;
    const m=modal('Edit organisation',`
      <div class="pp-avf"><span class="pp-logo" data-pplogo>${cur?`<img src="${esc(cur)}" alt="">`:esc(org.initials||initials(org.name))}</span>
        <div><div class="pp-avbtns"><label class="pp-btn ghost sm">Upload logo<input type="file" accept="image/*" data-pplfile hidden></label>
        <button type="button" class="pp-btn ghost sm" data-pplclear ${cur?'':'hidden'}>Remove</button></div>
        <span class="pp-hint">PNG with a transparent background works best</span></div></div>
      <div class="pp-grid">
        <label class="pp-f"><span>Organisation name</span><input data-o="name" value="${esc(org.name||'')}"></label>
        <label class="pp-f"><span>Domain</span><input data-o="domain" value="${esc(org.domain||'')}" placeholder="example.com"></label>
        ${opts.kinds?`<label class="pp-f"><span>Supplier type</span><select data-o="kind">${opts.kinds.map(([v,l])=>`<option value="${v}" ${org.kind===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`:''}
        ${opts.companyNo?`<label class="pp-f"><span>Company number</span><input data-o="companyNo" value="${esc(org.companyNo||'')}" placeholder="e.g. 08123456"></label>`:''}
        ${extra.map(x=>`<label class="pp-f"><span>${esc(x.label)}</span><input data-o="${x.k}" value="${esc(org[x.k]||'')}"></label>`).join('')}
        ${PROFILE.map(([k,l,t])=>`<label class="pp-f${t==='area'?' wide':''}"><span>${esc(l)}</span>${t==='area'?`<textarea data-o="${k}" rows="3">${esc(org[k]||'')}</textarea>`:`<input data-o="${k}" type="${t}" value="${esc(org[k]||'')}">`}</label>`).join('')}
        ${contactBlock(org,people,orgType)}
      </div>
      ${opts.specialisms?`<div class="pp-specf"><div class="pp-spechd"><span>Merch specialism</span><button type="button" class="pp-link" data-psmanage>Manage tags</button></div><div class="pp-specpick" data-pspick></div></div>`:''}
      <div class="pp-addrhd"><span>Addresses</span><button type="button" class="pp-link" data-paadd>+ Add address</button></div>
      <div class="pp-abook" data-pabook></div>`,`<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-ppsave>Save</button>`);
    const R=m.root, box=R.querySelector('[data-pplogo]'), clr=R.querySelector('[data-pplclear]');
    R.querySelectorAll('[name="ppmc"]').forEach(r=>r.onchange=()=>{ R.querySelectorAll('.pp-mcp').forEach(l=>l.classList.toggle('on',l.contains(r)&&r.checked)); R.querySelector('[data-ppmcnew]').hidden=r.value!=='__new'; if(r.value==='__new') R.querySelector('[data-mc="n"]').focus(); });
    R.querySelector('[data-pplfile]').onchange=async e=>{ try{ logo=await readLogo(e.target.files[0]); box.innerHTML=`<img src="${logo}" alt="">`; clr.hidden=false; }catch(err){ toast(err.message); } };
    clr.onclick=()=>{ logo=''; box.textContent=org.initials||initials(org.name); clr.hidden=true; };
    // address book editor — reads the DOM back into `book` before every redraw
    const abox=R.querySelector('[data-pabook]');
    const readBook=()=>{ abox.querySelectorAll('[data-paidx]').forEach(card=>{ const a=book[+card.dataset.paidx]; if(!a) return;
      a.title=card.querySelector('[data-pat]').value.trim();
      if(window.MSADDR&&card.querySelector('[data-ad]')) Object.assign(a,MSADDR.read(card)); else ADDR.forEach(([k])=>{ a[k]=card.querySelector('[data-pak="'+k+'"]').value.trim(); }); }); };
    const drawBook=()=>{
      if(!book.length){ abox.innerHTML='<p class="pp-hint" style="margin:0">No addresses yet.</p>'; return; }
      if(!book.some(a=>a.isDefault)) book[0].isDefault=true;
      abox.innerHTML=book.map((a,i)=>`<div class="pp-acard${a.isDefault?' def':''}${openIdx.has(i)?' open':''}" data-paidx="${i}">
        <div class="pp-acardhd">
          <button type="button" class="pp-atog" data-patog="${i}" aria-expanded="${openIdx.has(i)}" aria-label="Show or hide address"></button>
          <input class="pp-atitle" data-pat value="${esc(a.title||'')}" placeholder="Title, e.g. UK Office">
          ${a.isDefault?'<span class="pp-adef">Default</span>':`<button type="button" class="pp-link" data-padef="${i}">Make default</button>`}
          <button type="button" class="pp-arm" data-parm="${i}" title="Remove address" aria-label="Remove address">×</button>
        </div>
        <div class="pp-asum">${esc(lineText(a).join(', ')||'No address entered')}</div>
        ${window.MSADDR?`<div class="pp-abody">${MSADDR.fieldsHTML(a)}</div>`:`<div class="pp-grid pp-abody">${ADDR.map(([k,l])=>`<label class="pp-f${k==='addr1'||k==='addr2'?' wide':''}"><span>${l}</span><input data-pak="${k}" value="${esc(a[k]||'')}"></label>`).join('')}</div>`}
      </div>`).join('');
      if(window.MSADDR) MSADDR.wire(abox);
      abox.querySelectorAll('[data-patog]').forEach(b=>b.onclick=()=>{ readBook(); const i=+b.dataset.patog; openIdx.has(i)?openIdx.delete(i):openIdx.add(i); drawBook(); });
      abox.querySelectorAll('[data-padef]').forEach(b=>b.onclick=()=>{ readBook(); book.forEach((a,i)=>a.isDefault=i===+b.dataset.padef); drawBook(); });
      abox.querySelectorAll('[data-parm]').forEach(b=>b.onclick=()=>{ readBook(); const i=+b.dataset.parm, t=book[i].title||'this address';
        if(!confirm('Remove “'+t+'”?')) return; const wasDef=book[i].isDefault; book.splice(i,1); if(wasDef&&book[0]) book[0].isDefault=true;
        const kept=[...openIdx].filter(x=>x!==i).map(x=>x>i?x-1:x); openIdx.clear(); kept.forEach(x=>openIdx.add(x)); drawBook(); });
    };
    R.querySelector('[data-paadd]').onclick=()=>{ readBook();
      book.push({id:'a'+Date.now(),title:'',isDefault:!book.length,addr1:'',addr2:'',city:'',county:'',postcode:'',country:'United Kingdom'}); openIdx.add(book.length-1);
      drawBook(); const last=abox.querySelector('.pp-acard:last-child [data-pat]'); if(last) last.focus(); };
    drawBook();
    const pick=R.querySelector('[data-pspick]');
    const drawPick=()=>{ if(!pick) return; const l=specList(); specs=specs.filter(t=>l.includes(t));
      pick.innerHTML=l.map(t=>`<button type="button" class="pp-spec${specs.includes(t)?' on':''}" data-pst="${esc(t)}">${esc(t)}</button>`).join('');
      pick.querySelectorAll('[data-pst]').forEach(b=>b.onclick=()=>{ const t=b.dataset.pst; specs=specs.includes(t)?specs.filter(x=>x!==t):specs.concat(t); b.classList.toggle('on'); }); };
    drawPick();
    const mg=R.querySelector('[data-psmanage]'); if(mg) mg.onclick=()=>manageSpecialisms(drawPick);
    R.querySelector('[data-ppsave]').onclick=()=>{ const g=k=>{ const e=R.querySelector('[data-o="'+k+'"]'); return e?e.value.trim():''; };
      readBook();
      const f={name:g('name'),domain:g('domain')};
      f.addresses=book.filter(a=>ADDR.some(([k])=>a[k])).map((a,i)=>Object.assign({},a,{title:a.title||'Address '+(i+1)}));
      if(f.addresses.length&&!f.addresses.some(a=>a.isDefault)) f.addresses[0].isDefault=true;
      if(window.MSADDR){ const errs=f.addresses.flatMap(a=>MSADDR.validate(a,a.title)); if(errs.length){ toast(errs[0].charAt(0).toUpperCase()+errs[0].slice(1)); const bad=book.findIndex(a=>MSADDR.validate(a).length); if(bad>=0){ openIdx.add(bad); drawBook(); } return; } }
      // keep the flat fields + string mirroring the default, for anything that reads the old shape
      const d=f.addresses.find(a=>a.isDefault)||{}; ADDR.forEach(([k])=>f[k]=d[k]||''); f.address=lineText(d).join(', ');
      if(opts.companyNo) f.companyNo=g('companyNo'); if(opts.kinds) f.kind=g('kind'); if(opts.specialisms) f.specialisms=specs.slice();
      extra.forEach(x=>f[x.k]=g(x.k)); PROFILE.forEach(([k])=>f[k]=g(k)); if(!f.name){ R.querySelector('[data-o="name"]').focus(); return; }
      const mc=(R.querySelector('[name="ppmc"]:checked')||{}).value;
      if(mc==='__new'){ const q=k=>R.querySelector('[data-mc="'+k+'"]').value.trim(), nc={n:q('n'),email:q('email'),title:q('title'),tel:q('tel')};
        if(!nc.n){ R.querySelector('[data-mc="n"]').focus(); return toast('Add the contact’s name'); }
        if(nc.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nc.email)){ R.querySelector('[data-mc="email"]').focus(); return toast('That email address doesn’t look right'); }
        Object.assign(f,{contactName:nc.n,contactEmail:nc.email,contactTitle:nc.title,contactPhone:nc.tel,contactUser:''});
        if(R.querySelector('[data-mcinv]').checked){ if(!nc.email){ R.querySelector('[data-mc="email"]').focus(); return toast('An email is needed to send the invitation'); }
          const team=((org.teams||[])[0]||{}).name||people.map(u=>u._team||u.team).find(Boolean)||'Team';
          const u=addUser(opts.peopleKey||orgKey,team,{n:nc.n,email:nc.email,title:nc.title,tel:nc.tel,role:R.querySelector('[data-mcrole]').value}); f.contactUser=ukey(u); } }
      else if(mc==='__other'){ ['contactName','contactEmail','contactTitle','contactPhone'].forEach(k=>f[k]=org[k]||''); f.contactUser=''; }
      else if(mc){ const u=people.find(x=>ukey(x)===mc); if(u) Object.assign(f,{contactName:u.n,contactEmail:u.email||'',contactTitle:u.title||u.role||'',contactPhone:u.tel||u.phone||'',contactUser:ukey(u)}); }
      f.initials=initials(f.name);
      if(logo!==undefined) f.logo=logo;
      saveOrg(orgKey,org,f); onSave&&onSave(); m.close(); toast('Organisation saved'); };
  }
  const orgLogo=(org,fallback)=>org&&org.logo?`<img src="${esc(org.logo)}" alt="" style="width:100%;height:100%;object-fit:contain">`:fallback;

  /* ---------- styles ---------- */
  const css=`
  .pp-mc{display:flex;flex-direction:column;gap:8px;grid-column:1/-1;} .pp-mch{font-size:12.5px;font-weight:700;color:var(--ink-2);}
  .pp-mcl{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-height:236px;overflow:auto;padding:2px;}
  .pp-mcp{display:flex;align-items:center;gap:10px;border:1.5px solid var(--line-soft);border-radius:12px;padding:9px 11px;cursor:pointer;min-width:0;} .pp-mcp.on{border-color:var(--periwinkle-deep);background:var(--tint-peri,#eef0fa);}
  .pp-mcp input{position:absolute;opacity:0;pointer-events:none;} .pp-mcav{width:32px;height:32px;border-radius:50%;background:var(--periwinkle);color:#fff;font-size:11.5px;font-weight:800;display:grid;place-items:center;flex:none;overflow:hidden;}
  .pp-mcp.add .pp-mcav{background:#fff;color:var(--periwinkle-deep);border:1.5px dashed var(--periwinkle);font-size:18px;font-weight:600;}
  .pp-mct{display:flex;flex-direction:column;min-width:0;} .pp-mct b{font-size:13.5px;} .pp-mct i{font-style:normal;font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .pp-mcnew[hidden]{display:none!important;} .pp-mcnew{border:1px solid var(--line-soft);border-radius:12px;padding:12px;background:var(--paper,#fafaf7);} .pp-mcinv{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);grid-column:1/-1;} .pp-mcinv select{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:8px;padding:5px 8px;}
  .pp-scrim{position:fixed;inset:0;z-index:420;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);display:grid;place-items:center;padding:20px;opacity:0;transition:opacity .18s;}
  .pp-scrim.open{opacity:1;}
  .pp-modal{width:min(560px,100%);max-height:calc(100vh - 40px);overflow:auto;background:#fff;border-radius:18px;box-shadow:0 30px 80px rgba(20,22,45,.35);font-family:var(--sans);}
  .pp-hd{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line-soft);}
  .pp-hd h3{font-family:var(--serif);font-weight:500;font-size:21px;margin:0;}
  .pp-x{width:30px;height:30px;border:0;background:none;font-size:22px;line-height:1;color:var(--ink-3);cursor:pointer;}
  .pp-bd{padding:18px 22px;display:grid;gap:14px;}
  .pp-ft{display:flex;gap:10px;justify-content:flex-end;padding:14px 22px;border-top:1px solid var(--line-soft);}
  .pp-btn{font-family:var(--sans);font-size:13.5px;font-weight:800;color:#fff;background:var(--periwinkle-deep);border:0;border-radius:10px;padding:10px 18px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
  .pp-btn:hover{filter:brightness(.95);}
  .pp-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line-soft);}
  .pp-btn.ghost:hover{border-color:var(--periwinkle);}
  a.pp-btn{text-decoration:none;}
  .pp-btn.sm{font-size:12px;padding:6px 12px;border-radius:8px;}
  .pp-btn.danger{color:#b3261e;}
  .pp-btn.danger:hover{border-color:#b3261e;}
  .pp-btn:disabled{opacity:.45;cursor:not-allowed;}
  .pp-avf{display:flex;align-items:center;gap:16px;}
  .pp-av,.pp-logo{width:76px;height:76px;border-radius:50%;background:var(--periwinkle);color:#fff;display:grid;place-items:center;font-size:26px;font-weight:800;overflow:hidden;flex:none;}
  .pp-logo{border-radius:14px;background:var(--paper);color:var(--ink-3);border:1px solid var(--line-soft);}
  .pp-av img{width:100%;height:100%;object-fit:cover;}
  .pp-logo img{width:100%;height:100%;object-fit:contain;padding:8px;}
  .pp-avbtns{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:5px;}
  .pp-f select{width:100%;font:inherit;font-size:13.5px;color:var(--ink);border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;}
  .pp-f select:focus{outline:0;border-color:var(--periwinkle);}
  .pp-addrhd{display:flex;align-items:center;justify-content:space-between;margin:18px 0 8px;}
  .pp-addrhd span{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);}
  .pp-abook{display:grid;gap:10px;}
  .pp-acard{border:1.5px solid var(--line-soft);border-radius:12px;padding:12px;}
  .pp-acard.def{border-color:var(--periwinkle);}
  .pp-acardhd{display:flex;align-items:center;gap:9px;}
  .pp-acard.open .pp-acardhd{margin-bottom:10px;}
  .pp-atog{width:22px;height:22px;flex:none;border:0;background:none;cursor:pointer;position:relative;}
  .pp-atog::before{content:"";position:absolute;left:7px;top:6px;width:7px;height:7px;border-right:2px solid var(--ink-3);border-bottom:2px solid var(--ink-3);transform:rotate(-45deg);transition:transform .15s;}
  .pp-acard.open .pp-atog::before{transform:rotate(45deg);top:4px;}
  .pp-asum{font-size:12px;color:var(--ink-3);margin:4px 0 0 31px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .pp-acard.open .pp-asum{display:none;}
  .pp-acard:not(.open) .pp-abody{display:none;}
  .pp-atitle{flex:1;min-width:0;font:inherit;font-size:14px;font-weight:800;color:var(--ink);border:0;border-bottom:1.5px dashed var(--line-soft);padding:3px 0;background:none;}
  .pp-atitle:focus{outline:0;border-bottom-color:var(--periwinkle);}
  .pp-adef{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--periwinkle-deep);border-radius:999px;padding:2px 9px;white-space:nowrap;}
  .pp-arm{width:26px;height:26px;border:0;border-radius:50%;background:none;font-size:18px;line-height:1;color:var(--ink-3);cursor:pointer;flex:none;}
  .pp-arm:hover{background:var(--paper);color:var(--flare);}
  .pp-specf{margin-top:16px;}
  .pp-spechd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  .pp-spechd span{font-size:12px;font-weight:700;color:var(--ink-2);}
  .pp-link{font:inherit;font-size:12px;font-weight:800;color:var(--periwinkle-deep);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;}
  .pp-specpick{display:flex;flex-wrap:wrap;gap:7px;}
  .pp-spec{font:inherit;font-size:12px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:5px 12px;cursor:pointer;}
  .pp-spec:hover{border-color:var(--periwinkle);}
  .pp-spec.on{background:rgba(0,151,216,.5);border-color:transparent;color:var(--ink);}
  .pp-speclist{display:grid;gap:7px;max-height:320px;overflow-y:auto;margin-bottom:12px;}
  .pp-specrow{display:flex;gap:7px;}
  .pp-specrow input,.pp-specadd input{flex:1;font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;}
  .pp-specrow input:focus,.pp-specadd input:focus{outline:0;border-color:var(--periwinkle);}
  .pp-specadd{display:flex;gap:7px;padding-top:12px;border-top:1px solid var(--line-soft);}
  .pp-hint{font-size:11.5px;color:var(--ink-3);}
  .pp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px;}
  @media(max-width:520px){.pp-grid{grid-template-columns:1fr;}}
  .pp-f{display:grid;gap:5px;}
  .pp-f.wide{grid-column:1/-1;}
  .pp-f span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);}
  .pp-f input,.pp-f select,.pp-f textarea{font-family:var(--sans);font-size:14px;color:var(--ink);border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;resize:vertical;}
  .pp-f input:focus,.pp-f select:focus,.pp-f textarea:focus{outline:0;border-color:var(--periwinkle);}
  .pp-f select:disabled{background:var(--paper);color:var(--ink-3);}
  .pp-note{font-size:12.5px;color:var(--ink-2);margin:0;background:var(--paper);border-radius:10px;padding:9px 12px;}
  .pp-status{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;}
  .pp-status>div{flex:1 1 220px;}
  .pp-status b{display:block;font-size:13.5px;}
  .pp-status span{font-size:12px;color:var(--ink-3);}
  .pp-teams{list-style:none;margin:0;padding:0;display:grid;gap:8px;}
  .pp-teams li{display:flex;align-items:center;gap:10px;}
  .pp-teams input{flex:1;font-family:var(--sans);font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;}
  .pp-teams input:focus{outline:0;border-color:var(--periwinkle);}
  .pp-tn{font-size:12px;color:var(--ink-3);font-weight:700;white-space:nowrap;}
  .pp-addteam{display:flex;gap:8px;}
  .pp-addteam input{flex:1;font-family:var(--sans);font-size:14px;border:1.5px dashed var(--line-soft);border-radius:10px;padding:8px 11px;}
  .pp-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(10px);z-index:500;background:var(--ink);color:#fff;font-family:var(--sans);font-size:13.5px;font-weight:700;padding:11px 18px;border-radius:12px;opacity:0;transition:.2s;pointer-events:none;}
  .pp-toast.on{opacity:1;transform:translateX(-50%);}
  .u-deact{opacity:.55;}
  .u-deact .rolechip,.u-deact .role{text-decoration:line-through;}
  .st-deact{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);background:var(--paper-2);border-radius:999px;padding:2px 8px;}`;
  const tag2=document.createElement('style'); tag2.textContent='.pp-notes{margin-top:16px;border-top:1px solid var(--line-soft);padding-top:12px;}.pp-notes>summary{cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px;}.pp-notes[open]>summary{margin-bottom:12px;}'; document.head.appendChild(tag2);
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);

  return { ROLES, BILLABLE, ACTIONS, PERMS, can, log, activity, audit, LBL, normRole, seatsUsed, recordSeats, hydrate, hydrateContacts, hydrateOrg,
    saveUser, addUser, setStatus, createTeam, renameTeam, deleteTeam, saveOrg, me, saveMe,
    canEdit, canManage, viewer, photo, avHTML, initials, readPhoto, readLogo, userForm, manageTeams, editOrg, orgLogo, toast, modal,
    addrText, addrBook, defaultAddr, lineText, specList, manageSpecialisms };
})();
