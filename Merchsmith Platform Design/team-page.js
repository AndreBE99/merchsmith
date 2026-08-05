/* team-page.js — own Team page (role-aware: customer org OR distributor org) */
(function(){
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const avphoto = u => u.photo || (window.MSAvatar ? MSAvatar.url(u.n) : null);
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const ROLEID = (window.MSID && MSID.current && MSID.current()) || 'customer';
  const IS_DIST = ROLEID==='distributor';

  // ---- distributor's own internal team (Mojo Promotions) ----
  const DIST_ORG = { name:'Mojo Promotions', initials:'MP', since:'2019', standingDiscount:null };
  const DIST_PERMS = {
    Admin:['Manage team &amp; settings','Approve quotes &amp; orders','Set markup &amp; discounts','Manage suppliers &amp; customers','Full financial visibility'],
    'Account Manager':['Own customer accounts','Build &amp; quote projects','Approve proofs','Place orders','Manage own customers'],
    Studio:['Create &amp; edit designs','Upload visuals &amp; proofs','Manage Brand Assets','Comment on projects']
  };
  const DIST_SHORTPERM = { Admin:['Manage all','Approve','Finance'], 'Account Manager':['Quote','Order','Accounts'], Studio:['Design','Proof'] };
  const DIST_TEAMS = [
    { name:'Leadership', users:[
      {n:'Jess Doyle', role:'Admin', title:'Managing Director', email:'jess@mojopromotions.co.uk', tel:'+44 7700 800100', last:'Online', status:'active',
        joined:'2019', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'—', defaultAddress:'Mojo House, Wellington Street, Leeds LS1 4DL',
        stats:{accounts:0,projects:48,quotes:120,won:'£1.2M'}}
    ]},
    { name:'Account Management', users:[
      {n:'Cara Lyon', role:'Account Manager', title:'Senior Account Manager', email:'cara@mojopromotions.co.uk', tel:'+44 7700 800140', last:'1h ago', status:'active',
        joined:'2021', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:14,projects:31,quotes:78,won:'£420k'}},
      {n:'Ben Shaw', role:'Account Manager', title:'Account Manager', email:'ben@mojopromotions.co.uk', tel:'+44 7700 800160', last:'Today', status:'active',
        joined:'2022', site:'Remote', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:11,projects:22,quotes:54,won:'£318k'}},
      {n:'Will About', role:'Account Manager', title:'New Business', email:'will@mojopromotions.co.uk', tel:'', last:'Invited', status:'invited',
        joined:'—', site:'Leeds HQ', twofa:false, sso:false, notify:{email:true,sms:false,weekly:false}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:0,quotes:0,won:'£0'}}
    ]},
    { name:'Studio', users:[
      {n:'Raf Price', role:'Studio', title:'Senior Designer', email:'raf@mojopromotions.co.uk', tel:'+44 7700 800120', last:'15m ago', status:'active',
        joined:'2020', site:'Leeds HQ', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:64,quotes:0,won:'—'}},
      {n:'Nia Patel', role:'Studio', title:'Junior Designer', email:'nia@mojopromotions.co.uk', tel:'', last:'2d ago', status:'active',
        joined:'2024', site:'Leeds HQ', twofa:false, sso:true, notify:{email:true,sms:false,weekly:false}, costCentre:'—', defaultAddress:'—',
        stats:{accounts:0,projects:28,quotes:0,won:'—'}}
    ]}
  ];

  const CUST_ORG = { name:'Citrix', initials:'CX', distributor:'mojo', since:'Mar 2024', standingDiscount:'7.5%' };
  const CUST_PERMS = {
    Admin:['Manage team &amp; members','Approve designs &amp; prices','Place orders','View all projects','Manage addresses &amp; budgets'],
    Buyer:['Approve designs &amp; prices','Place orders','View own team projects'],
    Viewer:['View projects &amp; status','Comment on proofs']
  };
  const CUST_SHORTPERM = { Admin:['Manage team','Approve','Order'], Buyer:['Approve','Order'], Viewer:['View only'] };
  const CUST_TEAMS = [
    { name:'Marketing', users:[
      {n:'Sara Kemp', role:'Admin', title:'Head of Brand', email:'sara.kemp@canalrivertrust.org.uk', tel:'+44 7700 900112', last:'2h ago', status:'active', photo:'assets/avatars/av2.jpg',
        joined:'Mar 2024', site:'Manchester HQ', twofa:true, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'MKT-100', defaultAddress:'Northwind House, 14 Quay Street, Manchester M3 4EN',
        stats:{projects:12,approvals:34,orders:9,spend:'£48,200'}},
      {n:'Leo Tran', role:'Buyer', title:'Marketing Coordinator', email:'leo.tran@canalrivertrust.org.uk', tel:'+44 7700 900145', last:'Yesterday', status:'active',
        joined:'Jun 2024', site:'Manchester HQ', twofa:false, sso:true, notify:{email:true,sms:false,weekly:true}, costCentre:'MKT-100', defaultAddress:'Northwind House, 14 Quay Street, Manchester M3 4EN',
        stats:{projects:6,approvals:11,orders:5,spend:'£17,400'}},
      {n:'Amy Frost', role:'Viewer', title:'Social Media Exec', email:'amy.frost@canalrivertrust.org.uk', tel:'', last:'3d ago', status:'active',
        joined:'Jan 2025', site:'Remote', twofa:false, sso:false, notify:{email:true,sms:false,weekly:false}, costCentre:'MKT-100', defaultAddress:'—',
        stats:{projects:3,approvals:0,orders:0,spend:'£0'}}
    ]},
    { name:'HR & People', users:[
      {n:'Priya Nair', role:'Buyer', title:'People Ops Lead', email:'priya.nair@canalrivertrust.org.uk', tel:'+44 7700 900188', last:'4h ago', status:'active',
        joined:'Sep 2024', site:'London', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'HR-200', defaultAddress:'1 Mission Court, London EC2A 4PT',
        stats:{projects:4,approvals:8,orders:4,spend:'£12,900'}},
      {n:'Owen Doyle', role:'Viewer', title:'HR Assistant', email:'owen.doyle@canalrivertrust.org.uk', tel:'', last:'Invited', status:'invited',
        joined:'—', site:'London', twofa:false, sso:false, notify:{email:true,sms:false,weekly:false}, costCentre:'HR-200', defaultAddress:'—',
        stats:{projects:0,approvals:0,orders:0,spend:'£0'}}
    ]},
    { name:'Events', users:[
      {n:'Marcus Webb', role:'Buyer', title:'Events Manager', email:'marcus.webb@canalrivertrust.org.uk', tel:'+44 7700 900203', last:'1w ago', status:'active',
        joined:'Nov 2023', site:'Bristol', twofa:true, sso:true, notify:{email:true,sms:true,weekly:true}, costCentre:'EVT-300', defaultAddress:'Harbourside Studios, Bristol BS1 5TT',
        stats:{projects:8,approvals:19,orders:7,spend:'£31,600'}}
    ]}
  ];

  // active dataset by viewer role
  const ORG = IS_DIST ? DIST_ORG : CUST_ORG;
  const PERMS = IS_DIST ? DIST_PERMS : CUST_PERMS;
  const SHORTPERM = IS_DIST ? DIST_SHORTPERM : CUST_SHORTPERM;
  const TEAMS = IS_DIST ? DIST_TEAMS : CUST_TEAMS;
  const STATKEYS = IS_DIST ? [['accounts','Accounts'],['projects','Projects'],['quotes','Quotes'],['won','Won']] : [['projects','Projects'],['approvals','Approvals'],['orders','Orders'],['spend','Spend']];
  const ROLE_OPTS = IS_DIST ? ['Admin','Account Manager','Studio'] : ['Admin','Buyer','Viewer'];

  const allUsers = ()=>TEAMS.flatMap(t=>t.users);
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2200); }; })();

  function stats(){
    document.getElementById('stMembers').textContent=allUsers().length;
    document.getElementById('stTeams').textContent=TEAMS.length;
    document.getElementById('stPending').textContent=allUsers().filter(u=>u.status==='invited').length;
    document.getElementById('orgInit').textContent=ORG.initials;
    document.getElementById('orgName').innerHTML=esc(ORG.name);
    document.getElementById('orgMeta').textContent=`${IS_DIST?'distributor since':'customer since'} ${ORG.since} · ${allUsers().length} members`;
    var title=document.querySelector('h1.ptitle'); if(title) title.textContent = IS_DIST ? 'Your Team' : 'Your Team';
    var crumb=document.querySelector('.crumbband .crumb-org'); if(crumb && IS_DIST) crumb.textContent='Mojo Promotions';
    var ps=document.querySelector('.psub'); if(ps && IS_DIST) ps.textContent='Manage your colleagues — account managers, studio designers and admins — and the teams they work in.';
  }

  function urow(u,ti){
    const _ph=avphoto(u); const avi = _ph?`<img src="${_ph}" alt="${esc(u.n)}">`:av(u.n);
    const perms=(SHORTPERM[u.role]||[]).map(p=>`<span class="permchip">${p}</span>`).join('');
    return `<div class="urow" data-t="${ti}" data-n="${esc(u.n)}"><span class="av">${avi}</span>
      <div class="ui"><b>${esc(u.n)}</b><span>${esc(u.title)} · ${u.email?esc(u.email):'no email'}</span></div>
      <span class="rolechip">${esc(u.role)}</span>
      <div class="perm">${perms}</div>
      <span class="um ${u.status==='invited'?'inv':''}">${u.status==='invited'?'Invited':esc(u.last)}</span></div>`;
  }
  function render(filter){
    const f=(filter||'').toLowerCase();
    document.getElementById('teams').innerHTML = TEAMS.map((t,ti)=>{
      const users=t.users.filter(u=>!f || u.n.toLowerCase().includes(f) || (u.title||'').toLowerCase().includes(f));
      if(f && !users.length) return '';
      return `<div class="teamblock">
        <div class="tb-head"><span class="tname">${esc(t.name)}</span><span class="tcount">${t.users.length} ${t.users.length===1?'member':'members'}</span>
          <span class="right"><button class="btn ghost sm" data-addto="${ti}"><svg class="icn" style="width:14px;height:14px"><use href="#t-plus"/></svg>Add</button></span></div>
        ${users.map(u=>urow(u,ti)).join('')}
      </div>`;
    }).join('');
    stats();
  }

  /* drawer */
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  function close(){ scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow=''; }
  scrim.onclick=close;
  function fakeActivity(u){
    if(u.status==='invited') return [{t:'Invitation sent',d:'Pending acceptance'}];
    return [{t:'Approved a proof — Autumn Giveaways',d:'4 hours ago'},{t:'Commented on a visual — Tote bag',d:'2 days ago'},{t:'Added Eco Cable to a project',d:'1 week ago'}];
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
        ${IS_DIST?'':`<div class="dwr-sec"><h4>Ordering defaults</h4><div class="kv">
          <span class="k">Cost centre</span><span class="v">${esc(u.costCentre||'—')}</span>
          <span class="k">Default delivery</span><span class="v">${esc(u.defaultAddress||'—')}</span>
        </div></div>`}
        <div class="dwr-sec"><h4>Notifications</h4><div class="notif-row">
          <span class="notifchip ${u.notify&&u.notify.email?'on':''}">Email</span>
          <span class="notifchip ${u.notify&&u.notify.sms?'on':''}">SMS</span>
          <span class="notifchip ${u.notify&&u.notify.weekly?'on':''}">Weekly digest</span>
        </div></div>
        <div class="dwr-sec"><h4>Recent activity</h4><div class="acts">${acts}</div></div>
        <div class="prof-foot">
          <button class="btn ghost sm" data-x>Edit member</button>
          ${u.status==='invited'?'<button class="btn ghost sm" data-x>Resend invite</button>':'<button class="btn ghost sm danger" data-rm>Remove</button>'}
        </div>
      </div>`;
    drawer.querySelectorAll('[data-x]').forEach(b=>b.onclick=close);
    const rm=drawer.querySelector('[data-rm]'); if(rm) rm.onclick=()=>{ if(confirm('Remove '+u.n+' from the team?')){ const i=TEAMS[ti].users.indexOf(u); TEAMS[ti].users.splice(i,1); close(); render(); toast(u.n+' removed'); } };
    scrim.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow='hidden';
  }

  /* invite form */
  function inviteForm(ti){
    const opts=TEAMS.map((t,i)=>`<option value="${i}" ${i===ti?'selected':''}>${esc(t.name)}</option>`).join('');
    const wrap=document.createElement('div'); wrap.className='fm-scrim';
    wrap.innerHTML=`<div class="fm-modal"><div class="fm-head"><h3>Invite team member</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <label class="fm-f"><span>Full name</span><input id="iN" placeholder="Full name"></label>
        <label class="fm-f"><span>Job title</span><input id="iT" placeholder="e.g. Marketing Coordinator"></label>
        <label class="fm-f"><span>Email</span><input id="iE" type="email" placeholder="name@${IS_DIST?'mojopromotions.co.uk':'canalrivertrust.org.uk'}"></label>
        <label class="fm-f"><span>Team</span><select id="iTeam">${opts}</select></label>
        <label class="fm-f"><span>Role</span><select id="iR">${ROLE_OPTS.map((r,i)=>`<option ${i===Math.min(1,ROLE_OPTS.length-1)?'selected':''}>${r}</option>`).join('')}</select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="iSave">Send invite</button></div></div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    const shut=()=>{ wrap.remove(); document.body.style.overflow=''; };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) shut(); });
    wrap.querySelector('#iSave').onclick=()=>{ const n=wrap.querySelector('#iN').value.trim(); if(!n){ wrap.querySelector('#iN').focus(); return; }
      const t=+wrap.querySelector('#iTeam').value;
      TEAMS[t].users.push({n,role:wrap.querySelector('#iR').value,title:wrap.querySelector('#iT').value.trim()||wrap.querySelector('#iR').value,email:wrap.querySelector('#iE').value.trim(),tel:'',last:'Invited',status:'invited'});
      shut(); render(); toast('Invite sent to '+n);
    };
  }

  document.getElementById('teams').addEventListener('click',e=>{
    const add=e.target.closest('[data-addto]'); if(add){ inviteForm(+add.dataset.addto); return; }
    const row=e.target.closest('.urow'); if(row){ if(e.target.closest('a')) return; openProfile(+row.dataset.t, row.dataset.n); }
  });
  document.getElementById('inviteBtn').onclick=()=>inviteForm(0);
  document.getElementById('addTeamBtn').onclick=()=>{ const n=prompt('New team / department name:'); if(n){ TEAMS.push({name:n.trim(),users:[]}); render(); toast('Team "'+n.trim()+'" added'); } };
  document.getElementById('search').addEventListener('input',e=>render(e.target.value));

  render();
})();
