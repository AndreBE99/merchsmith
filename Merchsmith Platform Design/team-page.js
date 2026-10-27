/* team-page.js — own Team page (role-aware: customer org OR distributor org) */
(function(){
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const avphoto = u => (window.MSPEOPLE ? MSPEOPLE.photo(u) : (u.photo || (window.MSAvatar ? MSAvatar.url(u.n) : null)));
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const ROLEID = (window.MSID && MSID.current && MSID.current()) || 'customer';
  const IS_DIST = ROLEID==='distributor';
  const IS_SUP = ROLEID==='supplier';

  // ---- distributor's own internal team (Mojo Promotions) ----
  const DIST_ORG = { name:'Mojo Promotions', initials:'MP', since:'2019', standingDiscount:null };
  const DIST_PERMS = {
    Admin:['Manage team &amp; settings','Approve quotes &amp; orders','Set markup &amp; discounts','Manage suppliers &amp; customers','Full financial visibility'],
    'Account Manager':['Own customer accounts','Build &amp; quote projects','Approve proofs','Place orders','Manage own customers'],
    Studio:['Create &amp; edit designs','Upload visuals &amp; proofs','Manage Brand Assets','Comment on projects'],
    'Production Manager':['Track orders &amp; production','Confirm delivery dates with suppliers','Manage stock &amp; sample requests','Chase proofs &amp; approvals'],
    Finance:['Invoices &amp; payments','Credit limits &amp; terms','Full financial visibility','Export billing reports']
  };
  const DIST_SHORTPERM = { Admin:['Manage all','Approve','Finance'], 'Account Manager':['Quote','Order','Accounts'], Studio:['Design','Proof'], 'Production Manager':['Production','Delivery'], Finance:['Invoices','Credit'] };


  const CUST_ORG = { name:'Citrix', initials:'CX', distributor:'mojo', since:'Mar 2024', standingDiscount:'7.5%' };
  const CUST_PERMS = {
    Admin:['Manage team &amp; members','Approve designs &amp; prices','Place orders','View all projects','Manage addresses &amp; budgets'],
    Buyer:['Approve designs &amp; prices','Place orders','View own team projects'],
    Viewer:['View projects &amp; status','Comment on proofs']
  };
  const CUST_SHORTPERM = { Admin:['Manage team','Approve','Order'], Buyer:['Approve','Order'], Viewer:['View only'] };


  // ONE source of people: seeds live in org-data.js (shared with Organisations + Admin)
  const OD = window.ORG_DATA || {customers:[],suppliers:[]};
  const DIST_TEAMS = OD.mojoTeams || [];
  const CUST_TEAMS = ((OD.customers||[]).find(c=>c.id==='citrix')||{teams:[]}).teams;
  // supplier's own people (their contact list, one group) — same seed the distributor sees
  const SUP_REC = (OD.suppliers||[]).find(x=>x.id==='bagworks') || {name:'BagWorks UK',initials:'BW',since:'2022',contacts:[]};
  const SUP_ORG = { name:SUP_REC.name, initials:SUP_REC.initials, since:SUP_REC.since };
  const SUP_PERMS = { Admin:['Manage your people','Manage the product feed','Approve Recommended placements','Billing &amp; Direct Debit'],
    Contact:['Reply to stock / delivery / quote enquiries','Receive orders','Upload proofs'] };
  const SUP_SHORTPERM = { Admin:['Manage all','Billing'], Contact:['Enquiries','Orders'] };
  const SUP_TEAMS = [{ name:'Contacts', users:(SUP_REC.contacts=SUP_REC.contacts||[]) }];
  // active dataset by viewer role
  const ORG = IS_DIST ? DIST_ORG : IS_SUP ? SUP_ORG : CUST_ORG;
  const PERMS = IS_DIST ? DIST_PERMS : IS_SUP ? SUP_PERMS : CUST_PERMS;
  const SHORTPERM = IS_DIST ? DIST_SHORTPERM : IS_SUP ? SUP_SHORTPERM : CUST_SHORTPERM;
  const ORGKEY = IS_DIST ? 'mojo' : IS_SUP ? 'bagworks' : 'citrix';
  const TEAMS = IS_DIST ? DIST_TEAMS : IS_SUP ? SUP_TEAMS : CUST_TEAMS;
  const ORGTYPE = IS_DIST ? 'distributor' : IS_SUP ? 'supplier' : 'customer';
  if(window.MSPEOPLE){ MSPEOPLE.hydrate(ORGKEY,TEAMS); MSPEOPLE.hydrateOrg(ORGKEY,ORG); }
  const STATKEYS = IS_DIST ? [['accounts','Accounts'],['projects','Projects'],['quotes','Quotes'],['won','Won']] : [['projects','Projects'],['approvals','Approvals'],['orders','Orders'],['spend','Spend']];
  const ROLE_OPTS = window.MSPEOPLE ? MSPEOPLE.ROLES[ORGTYPE] : ['Admin'];

  const allUsers = ()=>TEAMS.flatMap(t=>t.users);
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2200); }; })();

  function stats(){
    document.getElementById('stMembers').textContent=allUsers().length;
    document.getElementById('stTeams').textContent=TEAMS.length;
    document.getElementById('stPending').textContent=allUsers().filter(u=>u.status==='invited').length;
    document.getElementById('orgInit').textContent=ORG.initials;
    document.getElementById('orgName').innerHTML=esc(ORG.name);
    document.getElementById('orgMeta').textContent=`${ORGTYPE} since ${ORG.since} · ${allUsers().filter(u=>u.status!=='deactivated').length} active · ${allUsers().length} total`;
    var title=document.querySelector('h1.ptitle'); if(title) title.textContent = IS_DIST ? 'Your Team' : 'Your Team';
    var crumb=document.querySelector('.crumbband .crumb-org'); if(crumb) crumb.textContent=ORG.name;
    var ps=document.querySelector('.psub'); if(ps && IS_DIST) ps.textContent='Manage your colleagues — account managers, studio designers and admins — and the teams they work in.';
  }

  function urow(u,ti){
    const _ph=avphoto(u); const avi = _ph?`<img src="${_ph}" alt="${esc(u.n)}">`:av(u.n);
    const perms=(SHORTPERM[u.role]||[]).map(p=>`<span class="permchip">${p}</span>`).join('');
    return `<div class="urow ${u.status==='deactivated'?'u-deact':''}" data-t="${ti}" data-n="${esc(u.n)}"><span class="av">${avi}</span>
      <div class="ui"><b>${esc(u.n)}</b><span>${esc(u.title)} · ${u.email?esc(u.email):'no email'}</span></div>
      <span class="rolechip">${esc(u.role)}</span>
      <div class="perm">${perms}</div>
      <span class="um ${u.status==='invited'?'inv':''}">${u.status==='deactivated'?'<span class="st-deact">Deactivated</span>':u.status==='invited'?'Invited':esc(u.last)}</span></div>`;
  }
  let FR='', FS='';
  function render(filter){
    if(filter!==undefined) render._q=filter;
    const f=(render._q||'').toLowerCase();
    const pass=u=>(!FR||u.role===FR)&&(!FS||(FS==='active'?(u.status!=='invited'&&u.status!=='deactivated'):u.status===FS));
    document.getElementById('teams').innerHTML = TEAMS.map((t,ti)=>{
      const users=t.users.filter(u=>pass(u)&&(!f || u.n.toLowerCase().includes(f) || (u.title||'').toLowerCase().includes(f) || (u.email||'').toLowerCase().includes(f)));
      if((f||FR||FS) && !users.length) return '';
      return `<div class="teamblock">
        <div class="tb-head"><span class="tname">${esc(t.name)}</span><span class="tcount">${t.users.length} ${t.users.length===1?'member':'members'}</span>
          <span class="right"><button class="btn ghost sm" data-addto="${ti}"><svg class="icn" style="width:14px;height:14px"><use href="#t-plus"/></svg>Add</button></span></div>
        ${users.length?users.map(u=>urow(u,ti)).join(''):`<div class="tm-empty">No one in ${esc(t.name)} yet${canManageTeam()?' — use Add to invite someone':''}.</div>`}
      </div>`;
    }).join('') || '<div class="teams-none">No one matches those filters.</div>';
    stats();
    if(IS_DIST&&window.MSPEOPLE) MSPEOPLE.recordSeats(ORGKEY,TEAMS);
  }

  /* drawer */
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  function close(){ scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow=''; }
  scrim.onclick=close;
  const when=iso=>{ const d=new Date(iso), m=(Date.now()-d)/60000; return m<1?'Just now':m<60?Math.round(m)+'m ago':m<1440?Math.round(m/60)+'h ago':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); };
  // recorded history only — no invented activity
  function fakeActivity(u){
    const L=window.MSPEOPLE?MSPEOPLE.activity(ORGKEY,u):[];
    const out=L.map(e=>({t:(MSPEOPLE.LBL[e.action]||e.action)+(e.detail?' — '+e.detail:''),d:when(e.at)+' · by '+e.actor}));
    if(u.joined&&u.joined!=='—') out.push({t:'Joined '+ORG.name,d:u.joined});
    return out.length?out:[{t:'No recorded activity yet',d:'Changes made from now on appear here'}];
  }
  function openProfile(ti,name){
    const u=TEAMS[ti].users.find(x=>x.n===name); if(!u) return;
    const avi=avphoto(u)?`<img src="${avphoto(u)}" alt="${esc(u.n)}">`:av(u.n);
    const perms=(PERMS[u.role]||[]).map(p=>`<li>${p}</li>`).join('');
    const acts=fakeActivity(u).map(a=>`<div class="actrowp"><div class="dot"></div><div><b>${a.t}</b><span>${a.d}</span></div></div>`).join('');
    const st=u.stats||{};
    const dot=on=>`<span class="secdot ${on?'on':'off'}">${on?'On':'Off'}</span>`;
    const statsStrip = u.status==='invited' ? '' : `<div class="prof-stats">
        ${STATKEYS.map(([k,l])=>`<div class="ps"><b>${esc(String(st[k]!=null?st[k]:'—'))}</b><span>${l}</span></div>`).join('')}
      </div>`;
    drawer.innerHTML=`<div class="dwr-head"><span class="av">${avi}</span>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:22px;margin:0">${esc(u.n)}</h2>
      <div style="font-size:13px;color:var(--text-soft)">${esc(u.title)} · <span class="rolechip" style="vertical-align:1px">${esc(u.role)}</span></div></div>
      <button class="dwr-x" data-x>×</button></div>
      <div class="dwr-body">
        <div class="prof-status ${u.status==='invited'?'inv':'act'}">${u.status==='invited'?'Invitation pending':'Active · last seen '+esc(u.last)}</div>
        ${statsStrip}
        <div class="dwr-sec"><h4>Contact</h4><div class="kv">
          <span class="k">Team</span><span class="v">${esc(TEAMS[ti].name)}</span>
          <span class="k">Site</span><span class="v">${esc(u.site||'—')}</span>
          <span class="k">Member since</span><span class="v">${esc(u.joined||'—')}</span>
          <span class="k">Email</span><span class="v">${u.email?`<a href="mailto:${esc(u.email)}" style="color:var(--periwinkle-deep);font-weight:600">${esc(u.email)}</a>`:'—'}</span>
          <span class="k">Telephone</span><span class="v">${u.tel?esc(u.tel):'—'}</span>
        </div></div>
        <div class="dwr-sec"><h4>Permissions · ${esc(u.role)}</h4><ul class="permlist">${perms}</ul></div>
        <div class="dwr-sec"><h4>Access &amp; security</h4><div class="kv">
          <span class="k">Two-factor auth</span><span class="v">${dot(u.twofa)}</span>
          <span class="k">Single sign-on</span><span class="v">${dot(u.sso)}</span>
          <span class="k">Status</span><span class="v">${u.status==='invited'?'Invited — not yet accepted':'Verified'}</span>
        </div></div>
        ${IS_DIST||IS_SUP?'':`<div class="dwr-sec"><h4>Ordering defaults</h4><div class="kv">
          <span class="k">Cost centre</span><span class="v">${esc(u.costCentre||'—')}</span>
          <span class="k">Default delivery</span><span class="v">${esc(u.defaultAddress||'—')}</span>
        </div></div>`}
        <div class="dwr-sec"><h4>Notifications</h4><div class="notif-row">
          <span class="notifchip ${u.notify&&u.notify.email?'on':''}">Email</span>
          <span class="notifchip ${u.notify&&u.notify.sms?'on':''}">SMS</span>
          <span class="notifchip ${u.notify&&u.notify.weekly?'on':''}">Weekly digest</span>
        </div></div>
        ${window.MSNOTES?`<div class="dwr-sec" data-entkey="user:${esc(ORGKEY)}:${esc((String(u.email||'').trim().toLowerCase()||String(u.n||'').trim().toLowerCase()))}">${MSNOTES.panelHTML('user:'+ORGKEY+':'+(String(u.email||'').trim().toLowerCase()||String(u.n||'').trim().toLowerCase()))}</div>`:`<div class="dwr-sec"><h4>Recent activity</h4><div class="acts">${acts}</div></div>`}
        <div class="prof-foot">
          ${canEditU(u)?'<button class="btn ghost sm" data-edit>Edit member</button>':''}
          ${canEditU(u)&&!isSelf(u)?(u.status==='invited'?'<button class="btn ghost sm" data-resend>Resend invite</button>'
            :u.status==='deactivated'?'<button class="btn ghost sm" data-react>Reactivate</button>'
            :'<button class="btn ghost sm danger" data-deact>Deactivate</button>'):''}
        </div>
      </div>`;
    if(window.MSNOTES) drawer.querySelectorAll('[data-entkey]').forEach(h=>MSNOTES.wire(h,h.dataset.entkey));
    drawer.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);
    const ed=drawer.querySelector('[data-edit]'); if(ed) ed.onclick=()=>editMember(ti,u);
    const de=drawer.querySelector('[data-deact]'); if(de) de.onclick=()=>{ if(!guardLastAdmin(u)) return;
      if(!confirm('Deactivate '+u.n+'?\n\nTheir history is kept and the seat is freed. You can reactivate them later.')) return;
      MSPEOPLE.setStatus(ORGKEY,u,'deactivated'); close(); render(); toast(u.n+' deactivated'); };
    const re=drawer.querySelector('[data-react]'); if(re) re.onclick=()=>{ MSPEOPLE.setStatus(ORGKEY,u,'active'); openProfile(ti,u.n); render(); toast(u.n+' reactivated'); };
    const rs=drawer.querySelector('[data-resend]'); if(rs) rs.onclick=()=>toast('Invite resent to '+(u.email||u.n));
    scrim.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow='hidden';
  }

  /* permissions + editing (shared store / editors in people.js) */
  const KIND = 'team';
  const isSelf = u => window.MSPEOPLE && MSPEOPLE.viewer().name && u.n.toLowerCase()===MSPEOPLE.viewer().name.toLowerCase();
  const canEditU = u => !window.MSPEOPLE || MSPEOPLE.canEdit(KIND,u);
  const canManageTeam = () => !window.MSPEOPLE || MSPEOPLE.canManage(KIND);
  // never leave an organisation without an active admin
  function guardLastAdmin(u){ if(u.role!=='Admin') return true;
    const admins=allUsers().filter(x=>x.role==='Admin'&&x.status!=='deactivated');
    if(admins.length<=1){ toast('Make someone else an Admin first — every organisation needs one'); return false; } return true; }
  function editMember(ti,u){
    const self=isSelf(u), adminEditing=MSPEOPLE.canManage(KIND);
    MSPEOPLE.userForm({ title:self?'Edit your details':'Edit '+u.n, user:u, kind:KIND, orgType:ORGTYPE, orgKey:ORGKEY,
      teamNames:TEAMS.map(t=>t.name), team:TEAMS[ti].name, peers:allUsers(), lockRole:self&&!adminEditing, self,
      onSave:f=>{ if(f.role&&f.role!=='Admin'&&u.role==='Admin'&&!guardLastAdmin(u)) delete f.role;
        const from=TEAMS[ti]; MSPEOPLE.saveUser(ORGKEY,u,f);
        if(f.team&&f.team!==from.name){ MSPEOPLE.log(ORGKEY,u,'team',from.name+' → '+f.team); from.users.splice(from.users.indexOf(u),1); TEAMS.find(t=>t.name===f.team).users.push(u); }
        close(); render(); },
      onStatus:to=>{ if(to==='deactivated'&&!guardLastAdmin(u)) return; MSPEOPLE.setStatus(ORGKEY,u,to); close(); render(); },
      onResend:()=>{} });
  }

  /* invite form */
  function inviteForm(ti){
    if(!canManageTeam()){ toast('Only an Admin can invite people'); return; }
    const seats=IS_DIST&&window.MSPEOPLE?MSPEOPLE.seatsUsed(TEAMS):null;
    MSPEOPLE.userForm({ title:'Invite team member', kind:KIND, orgType:ORGTYPE,
      teamNames:TEAMS.map(t=>t.name), team:TEAMS[ti||0].name, peers:allUsers(),
      seatNote:seats!=null?'You are using '+seats+' seat'+(seats===1?'':'s')+' today.':'',
      onSave:f=>{ const t=TEAMS.find(x=>x.name===f.team)||TEAMS[0];
        t.users.push(MSPEOPLE.addUser(ORGKEY,t.name,Object.assign({title:f.title||f.role},f))); render(); } });
  }

  document.getElementById('teams').addEventListener('click',e=>{
    const add=e.target.closest('[data-addto]'); if(add){ inviteForm(+add.dataset.addto); return; }
    const row=e.target.closest('.urow'); if(row){ if(e.target.closest('a')) return; openProfile(+row.dataset.t, row.dataset.n); }
  });
  document.getElementById('inviteBtn').onclick=()=>inviteForm(0);
  document.getElementById('addTeamBtn').onclick=()=>{ if(!canManageTeam()){ toast('Only an Admin can manage teams'); return; }
    MSPEOPLE.manageTeams(ORGKEY,TEAMS,render,'Team'); };
  { const b=document.getElementById('addTeamBtn'); if(b&&/Add team/i.test(b.textContent)) b.lastChild.textContent=' Manage teams'; }
  if(!canManageTeam()){ ['inviteBtn','addTeamBtn'].forEach(id=>{ const b=document.getElementById(id); if(b) b.hidden=true; }); }
  document.getElementById('search').addEventListener('input',e=>render(e.target.value));
  // role + status filters beside the search
  { const tb=document.getElementById('search').closest('.toolbar')||document.getElementById('search').parentNode.parentNode;
    const mk=(id,opts)=>{ const sel=document.createElement('select'); sel.id=id; sel.className='tm-filter';
      sel.innerHTML=opts.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join(''); return sel; };
    const r=mk('fRole',[['','All roles'],...ROLE_OPTS.map(x=>[x,x])]);
    const st=mk('fStatus',[['','All statuses'],['active','Active'],['invited','Invited'],['deactivated','Deactivated']]);
    const anchorEl=document.getElementById('addTeamBtn'); tb.insertBefore(r,anchorEl); tb.insertBefore(st,anchorEl);
    r.onchange=()=>{ FR=r.value; render(); }; st.onchange=()=>{ FS=st.value; render(); };
    const nm=document.getElementById('teams');
    const css=document.createElement('style'); css.textContent='.tm-filter{font:inherit;font-size:13.5px;font-weight:600;color:var(--ink);background:#fff;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 12px;cursor:pointer;}.tm-filter:focus{outline:0;border-color:var(--periwinkle);}.tm-empty{font-size:13px;color:var(--ink-3);padding:14px 18px;}.teams-none{font-size:14px;color:var(--ink-3);padding:26px;text-align:center;background:#fff;border:1px dashed var(--line-soft);border-radius:14px;}';
    document.head.appendChild(css); }

  render();
})();
