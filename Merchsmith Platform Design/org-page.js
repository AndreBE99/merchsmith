/* org-page.js — renders the Organisations hub + detail drawer */
(function(){
  const D = window.ORG_DATA;
  const av = n => { const u=window.MSAvatar&&MSAvatar.url(n); return u?`<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(); };
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const chip = st => st==='active'
    ? '<span class="statuschip sc-active">Active</span>'
    : '<span class="statuschip sc-pending">Pending</span>';
  const userCount = o => o.teams ? o.teams.reduce((a,t)=>a+t.users.length,0) : (o.contacts?o.contacts.length:0);
  const supKind = k => k==='branding'?'Branding':(k==='both'?'Product + Branding':'Product');
  const supLogo = k => k==='branding'?'l-brand':(k==='both'?'l-both':'l-prod');
  const orgMark = (name,init) => (window.MSLOGOS&&MSLOGOS.svg) ? MSLOGOS.svg(name,40) : esc(init||'');
  const allUsers = o => o.teams ? o.teams.flatMap(t=>t.users) : (o.contacts||[]);

  // ---- user registry: stamp every user with a uid + org context so rows open a profile ----
  const UREG = {};
  let _uidN = 0;
  function reg(u, ctx){ if(!u._uid){ u._uid = 'u'+(++_uidN); } UREG[u._uid] = {u, ctx}; return u._uid; }
  function indexUsers(){
    D.team.forEach(u=>reg(u,{orgName:'Mojo Promotions', orgType:'Distributor (your team)', kind:'team', team:'Internal team'}));
    D.customers.forEach(c=>c.teams.forEach(t=>t.users.forEach(u=>reg(u,{orgName:c.name, orgType:'Customer', kind:'cust', org:c, team:t.name}))));
    D.suppliers.forEach(s=>s.contacts.forEach(u=>reg(u,{orgName:s.name, orgType:supKind(s.kind)+' supplier', kind:'sup', org:s, team:'Contacts'})));
  }
  indexUsers();

  // ---- tabs ----
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===t));
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id==='panel-'+t.dataset.tab));
  });
  // deep-link a tab via #tab=customers|suppliers|team
  function applyTabHash(){ const m=(location.hash.match(/tab=(\w+)/)||[])[1]; if(!m) return; const t=document.querySelector('.tab[data-tab="'+m+'"]'); if(t) t.onclick(); }
  window.addEventListener('hashchange', applyTabHash); applyTabHash();

  // ---- customer cards ----
  function custCard(c){
    const us=allUsers(c).slice(0,4);
    return `<div class="ocard" data-kind="cust" data-id="${c.id}">
      <div class="ocard-top"><div class="ologo brandmark">${orgMark(c.name,c.initials)}</div>
        <div style="flex:1"><h3>${esc(c.name)}</h3><div class="otype">Customer · ${esc(c.domain)}</div></div>${chip(c.status)}</div>
      <div class="obody">
        <div class="orow"><span class="k">Projects</span><span class="v">${c.projects}</span></div>
        <div class="orow"><span class="k">Open approvals</span><span class="v">${c.openApprovals||'—'}</span></div>
        <div class="orow"><span class="k">Standing discount</span><span class="v">${c.standingDiscount}</span></div>
        <div class="orow"><span class="k">Teams</span><span class="v">${c.teams.map(t=>t.name).join(', ')}</span></div>
      </div>
      <div class="oavs">${us.map(u=>`<span class="av">${av(u.n)}</span>`).join('')}<span class="more">${userCount(c)} ${userCount(c)===1?'user':'users'}</span></div>
    </div>`;
  }
  document.getElementById('custGrid').innerHTML = D.customers.map(custCard).join('');

  // ---- supplier cards ----
  function supCard(s){
    return `<div class="ocard" data-kind="sup" data-id="${s.id}">
      <div class="ocard-top"><div class="ologo brandmark">${orgMark(s.name,s.initials)}</div>
        <div style="flex:1"><h3>${esc(s.name)}</h3><div class="otype">Supplier · ${supKind(s.kind)}</div></div>${chip(s.status)}</div>
      <div class="obody">
        <div class="orow"><span class="k">Lead time</span><span class="v">${s.lead}</span></div>
        <div class="orow"><span class="k">Product feed</span><span class="v">${s.products?s.products.toLocaleString()+' products':'Manual'}</span></div>
        <div class="orow"><span class="k">Contacts</span><span class="v">${s.contacts.length}</span></div>
      </div>
      <div class="oavs">${s.contacts.slice(0,4).map(u=>`<span class="av">${av(u.n)}</span>`).join('')}<span class="more">${s.contacts.length} ${s.contacts.length===1?'contact':'contacts'}</span></div>
    </div>`;
  }
  document.getElementById('supGrid').innerHTML = D.suppliers.map(supCard).join('');

  // ---- team ----
  function urow(u, ctx){
    const uid = (ctx && typeof ctx==='object') ? reg(u, ctx) : (u._uid||'');
    return `<div class="urow urow-link" data-uid="${uid}"><span class="av">${av(u.n)}</span>
      <div class="ui"><b>${esc(u.n)}</b><span>${esc(u.title)} · ${u.email?esc(u.email):'no email'}</span></div>
      <span class="rolechip">${esc(u.role)}</span>
      <span class="um">${u.status==='invited'?'Invited':esc(u.last)}</span></div>`;
  }
  document.getElementById('teamWrap').innerHTML =
    `<div class="teamblock"><div class="th"><b>Mojo Promotions · internal team</b><span>${D.team.length} members</span></div>
      ${D.team.map(urow).join('')}
      <button class="addline"><svg class="icn" style="width:15px;height:15px"><use href="#i-plus"/></svg>Invite team member</button></div>`;

  // ---- detail drawer ----
  const scrim=document.getElementById('scrim'), drawer=document.getElementById('drawer');
  function openDrawer(html){ drawer.innerHTML=html; scrim.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow='hidden';
    drawer.querySelectorAll('[data-x]').forEach(b=>b.onclick=close); }
  function close(){ scrim.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow=''; }
  scrim.onclick=close;

  function custDrawer(c){
    return `<div class="dwr-head"><div class="ologo brandmark">${orgMark(c.name,c.initials)}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(c.name)}</h2>
      <div style="font-size:13px;color:var(--text-soft);margin-top:2px">Customer organisation · since ${c.since}</div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      <div class="dwr-sec"><div class="sec-hd"><h4>Overview</h4><div style="display:flex;gap:8px"><button class="editbtn ghostbtn" data-ghost="${c.id}">Ghost customer</button><button class="editbtn" data-editorg="cust:${c.id}">Edit</button></div></div>${flagBanner(c)}<div class="kv">
        <span class="k">Domain</span><span class="v">${esc(c.domain)}</span>
        <span class="k">Address</span><span class="v">${esc(c.address||'—')}</span>
        <span class="k">Status</span><span class="v">${c.status==='active'?'Active':'Pending invite'}</span>
        <span class="k">Projects</span><span class="v">${c.projects}</span>
        <span class="k">Standing discount</span><span class="v">${c.standingDiscount}</span>
        <span class="k">Payment terms</span><span class="v">${esc(c.paymentTerms||'—')}</span>
        <span class="k">Credit limit</span><span class="v">${esc(c.creditLimit||'—')} ${c.creditUsed?`<small style="color:var(--muted)">(${esc(c.creditUsed)} used)</small>`:''}</span>
        <span class="k">Delivery addresses</span><span class="v">${c.addresses}</span>
      </div></div>
      ${ordersBlock(c,'cust')}
      <div class="dwr-sec"><a class="btn" style="display:flex;align-items:center;justify-content:center;gap:8px;background:var(--periwinkle-deep);color:#fff;border-radius:11px;padding:12px;font-weight:700;text-decoration:none" href="Merchsmith Projects.html?customer=${encodeURIComponent(c.name)}">View ${esc(c.name)}'s projects ›</a></div>
      ${serviceBlock(c)}
      ${productsBlock(c.products,'Products ordered')}
      <div class="dwr-sec"><h4>Teams &amp; users</h4>
        ${c.teams.map(t=>`<div class="teamblock"><div class="th"><b>${esc(t.name)}</b><span>${t.users.length} ${t.users.length===1?'user':'users'}</span></div>
          ${t.users.map(urow).join('')}
          <button class="addline"><svg class="icn" style="width:15px;height:15px"><use href="#i-plus"/></svg>Add user to ${esc(t.name)}</button></div>`).join('')}
        <button class="addline"><svg class="icn" style="width:15px;height:15px"><use href="#i-plus"/></svg>Add team</button>
      </div>
      ${commentsBlock(c,'cust:'+c.id)}
    </div>`;
  }
  function supDrawer(s){
    return `<div class="dwr-head"><div class="ologo brandmark">${orgMark(s.name,s.initials)}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(s.name)}</h2>
      <div style="font-size:13px;color:var(--text-soft);margin-top:2px">${supKind(s.kind)} supplier · since ${s.since}</div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      <div class="dwr-sec"><div class="sec-hd"><h4>Overview</h4><button class="editbtn" data-editorg="sup:${s.id}">Edit</button></div>${flagBanner(s)}<div class="kv">
        <span class="k">Domain</span><span class="v">${esc(s.domain)}</span>
        <span class="k">Address</span><span class="v">${esc(s.address||'—')}</span>
        <span class="k">Type</span><span class="v">${s.kind==='branding'?'Branding only':(s.kind==='both'?'Product + Branding':'Product (blanks)')}</span>
        <span class="k">Lead time</span><span class="v">${s.lead}</span>
        <span class="k">Days in lieu</span><span class="v">${supLieuLabel(s)}</span>
        <span class="k">Payment terms</span><span class="v">${esc(s.paymentTerms||'—')}</span>
        <span class="k">Product feed</span><span class="v">${s.products?s.products.toLocaleString()+' products (API)':'Manual — decoration only'}</span>
        <span class="k">Status</span><span class="v">${s.status==='active'?'Active':'Pending invite'}</span>
      </div></div>
      ${ordersBlock(s,'sup')}
      ${serviceBlock(s)}
      ${supProductListBlock(s)}
      <div class="dwr-sec"><h4>Days in lieu (delivery buffer)</h4>
        <p style="font-size:13px;color:var(--text-soft);margin:0 0 12px">Working days added to this supplier's lead time to form the customer lead time. Leave on default to follow the distributor's global setting.</p>
        <div class="lieuctl-row">
          <div class="mini-step" data-suplieu="${s.id}"><button data-d="-1">−</button><span class="v">${supLieuEff(s)}</span><button data-d="1">+</button></div>
          <span class="lieuwd">working days</span>
          ${s.lieu==null?'<span class="lieudef">Default</span>':`<button class="useoverride" data-suplieudef="${s.id}">Use default</button>`}
        </div></div>
      <div class="dwr-sec"><h4>What this supplier does</h4>
        <div style="background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:6px 16px">
          <div class="feedline"><span>Manage product feed &amp; manual products</span><b>${s.products?'API + manual':'Manual'}</b></div>
          <div class="feedline"><span>Receive orders</span><b>Yes</b></div>
          <div class="feedline"><span>Upload proofs for distributor</span><b>${s.kind==='branding'||s.kind==='both'?'Yes':'—'}</b></div>
          <div class="feedline"><span>Reply to stock / delivery / quote enquiries</span><b>Yes</b></div>
        </div>
      </div>
      <div class="dwr-sec"><h4>Contacts</h4>
        <div class="teamblock">${s.contacts.map(urow).join('')}
          <button class="addline"><svg class="icn" style="width:15px;height:15px"><use href="#i-plus"/></svg>Add contact</button></div>
        <div class="todo">⚑ To revisit: whether the customer side can add a supplier contact, and what suppliers may see.</div>
      </div>
      ${commentsBlock(s,'sup:'+s.id)}
    </div>`;
  }

  document.addEventListener('click', e=>{
    const card=e.target.closest('.ocard'); if(!card) return;
    if(card.dataset.kind==='cust'){ const c=D.customers.find(x=>x.id===card.dataset.id); if(c) openDrawer(custDrawer(c)); }
    else { const s=D.suppliers.find(x=>x.id===card.dataset.id); if(s) openDrawer(supDrawer(s)); }
  });

  /* ---------- forms (add org / add user / add contact) ---------- */
  const ROLES = { customer:['Admin','Buyer'], team:['Admin','Account Manager','Studio'], supplier:['Contact'] };
  function modal(html){
    const wrap=document.createElement('div'); wrap.className='fm-scrim'; wrap.innerHTML=`<div class="fm-modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const shut=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); if(!document.querySelector('.fm-scrim')&&!drawer.classList.contains('open')) document.body.style.overflow=''; },200); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) shut(); });
    return { wrap, shut };
  }
  const field = (label,id,attrs='',hint='') => `<label class="fm-f"><span>${label}</span><input id="${id}" ${attrs}>${hint?`<small>${hint}</small>`:''}</label>`;
  const toast = msg => { const t=document.createElement('div'); t.className='fm-toast'; t.textContent=msg; document.body.appendChild(t); requestAnimationFrame(()=>t.classList.add('on')); setTimeout(()=>{ t.classList.remove('on'); setTimeout(()=>t.remove(),300); },2600); };

  function addOrgForm(){
    const m=modal(`<div class="fm-head"><h3>Add organisation</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <div class="fm-seg" id="ftype">
          <button type="button" class="on" data-t="customer">Customer</button>
          <button type="button" data-t="supplier">Supplier</button>
        </div>
        ${field('Organisation name','foName','placeholder="e.g. Northwind Ltd"')}
        ${field('Domain','foDom','placeholder="northwind.com"')}
        <div id="fsupextra" style="display:none">
          <div class="fm-f"><span>Supplier type</span><div class="fm-seg sm" id="fskind"><button type="button" class="on" data-k="product">Product</button><button type="button" data-k="branding">Branding</button></div></div>
          ${field('Default lead time (working days)','foLead','type="number" value="7" min="1"')}
        </div>
        <div id="fcustextra">${field('Standing discount %','foDisc','type="number" value="5" min="0" max="100"','Optional — applied to this customer&rsquo;s prices')}</div>
        <div class="fm-head2">First user</div>
        ${field('Full name','foUserN','placeholder="Sara Kemp"')}
        ${field('Email','foUserE','type="email" placeholder="name@company.com"')}
        <label class="fm-f"><span>Role</span><select id="foUserR"></select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="foSave">Send invite</button></div>`);
    let type='customer', skind='product';
    const roleSel=m.wrap.querySelector('#foUserR');
    const fillRoles=()=>{ roleSel.innerHTML=ROLES[type].map(r=>`<option>${r}</option>`).join(''); };
    fillRoles();
    m.wrap.querySelectorAll('#ftype button').forEach(b=>b.onclick=()=>{ type=b.dataset.t; m.wrap.querySelectorAll('#ftype button').forEach(x=>x.classList.toggle('on',x===b)); m.wrap.querySelector('#fsupextra').style.display=type==='supplier'?'':'none'; m.wrap.querySelector('#fcustextra').style.display=type==='customer'?'':'none'; m.wrap.querySelector('#foSave').textContent=type==='supplier'?'Add supplier':'Send invite'; fillRoles(); });
    m.wrap.querySelectorAll('#fskind button').forEach(b=>b.onclick=()=>{ skind=b.dataset.k; m.wrap.querySelectorAll('#fskind button').forEach(x=>x.classList.toggle('on',x===b)); });
    m.wrap.querySelector('#foSave').onclick=()=>{
      const name=m.wrap.querySelector('#foName').value.trim(); if(!name){ m.wrap.querySelector('#foName').focus(); return; }
      const dom=m.wrap.querySelector('#foDom').value.trim()||'—';
      const uN=m.wrap.querySelector('#foUserN').value.trim()||'New user', uE=m.wrap.querySelector('#foUserE').value.trim(), uR=roleSel.value;
      const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      const u={n:uN,role:uR,title:uR,email:uE,tel:'',last:'Invited',status:'invited'};
      if(type==='customer'){
        D.customers.unshift({id,name,initials:av(name),domain:dom,status:'pending',since:'Jun 2026',projects:0,openApprovals:0,standingDiscount:(m.wrap.querySelector('#foDisc').value||'0')+'%',addresses:0,teams:[{name:'General',users:[u]}]});
        document.getElementById('custGrid').innerHTML=D.customers.map(custCard).join('');
        document.querySelector('.tab[data-tab="customers"] .ct').textContent=D.customers.length;
      } else {
        D.suppliers.unshift({id,name,initials:av(name),kind:skind,domain:dom,status:'pending',lead:(m.wrap.querySelector('#foLead').value||'7')+' working days',feed:'Manual',products:0,since:'2026',contacts:[u]});
        document.getElementById('supGrid').innerHTML=D.suppliers.map(supCard).join('');
        document.querySelector('.tab[data-tab="suppliers"] .ct').textContent=D.suppliers.length;
      }
      m.shut(); toast((type==='customer'?'Customer':'Supplier')+' "'+name+'" added · invite sent to '+(uE||'user'));
    };
  }

  function addUserForm(opts){
    // opts: {scope:'customer'|'team'|'supplier', org, team, onAdd}
    const m=modal(`<div class="fm-head"><h3>${opts.title}</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        ${field('Full name','fuN','placeholder="Full name"')}
        ${field('Job title','fuT','placeholder="e.g. Marketing Coordinator"')}
        ${field('Email','fuE','type="email" placeholder="name@company.com"')}
        ${field('Telephone','fuP','placeholder="+44 …"')}
        <label class="fm-f"><span>Role</span><select id="fuR">${(ROLES[opts.scope]||['Buyer']).map(r=>`<option>${r}</option>`).join('')}</select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="fuSave">Send invite</button></div>`);
    m.wrap.querySelector('#fuSave').onclick=()=>{
      const n=m.wrap.querySelector('#fuN').value.trim(); if(!n){ m.wrap.querySelector('#fuN').focus(); return; }
      opts.onAdd({n,role:m.wrap.querySelector('#fuR').value,title:m.wrap.querySelector('#fuT').value.trim()||m.wrap.querySelector('#fuR').value,email:m.wrap.querySelector('#fuE').value.trim(),tel:m.wrap.querySelector('#fuP').value.trim(),last:'Invited',status:'invited'});
      m.shut(); toast('Invite sent to '+n);
    };
  }

  // header + toolbar "add" buttons
  document.getElementById('addOrgBtn').onclick=addOrgForm;
  document.querySelectorAll('.toolbar .btn.ghost').forEach(b=>{ if(/Add customer|Add supplier|Invite team/.test(b.textContent)) b.onclick=e=>{ e.preventDefault();
    if(/customer/i.test(b.textContent)) addOrgForm();
    else if(/team/i.test(b.textContent)) addUserForm({scope:'team',title:'Invite team member',onAdd:u=>{ D.team.push(u); document.getElementById('teamWrap').innerHTML=teamWrapHTML(); wireTeamAdds(); document.querySelector('.tab[data-tab="team"] .ct').textContent=D.team.length; }});
  }; });

  // delegated: add-user / add-contact / add-team inside drawers + team panel
  document.addEventListener('click', e=>{
    const a=e.target.closest('.addline'); if(!a) return;
    const txt=a.textContent.trim();
    if(/Invite team member/.test(txt)){ addUserForm({scope:'team',title:'Invite team member',onAdd:u=>{ D.team.push(u); document.getElementById('teamWrap').innerHTML=teamWrapHTML(); wireTeamAdds(); document.querySelector('.tab[data-tab="team"] .ct').textContent=D.team.length; }}); return; }
    const cust=currentCust();
    if(cust && /Add user to/.test(txt)){ const tname=txt.replace('Add user to ','').trim(); const team=cust.teams.find(t=>t.name===tname); addUserForm({scope:'customer',title:'Add user to '+tname,onAdd:u=>{ team.users.push(u); openDrawer(custDrawer(cust)); refreshCustCards(); }}); return; }
    if(cust && /Add team/.test(txt)){ const name=prompt('Team / department name:'); if(name){ cust.teams.push({name:name.trim(),users:[]}); openDrawer(custDrawer(cust)); } return; }
    const sup=currentSup();
    if(sup && /Add contact/.test(txt)){ addUserForm({scope:'supplier',title:'Add contact',onAdd:u=>{ sup.contacts.push(u); openDrawer(supDrawer(sup)); refreshSupCards(); }}); return; }
  });

  let _curCustId=null,_curSupId=null;
  function currentCust(){ return _curCustId?D.customers.find(c=>c.id===_curCustId):null; }
  function currentSup(){ return _curSupId?D.suppliers.find(s=>s.id===_curSupId):null; }

  /* ---------- user profile drawer ---------- */
  const PERMS = {
    Admin:['Manage organisation &amp; users','Approve designs &amp; prices','Place orders','View all projects','Manage addresses'],
    Buyer:['Approve designs &amp; prices','Place orders','View own team projects'],
    'Account Manager':['Manage customer accounts','Promote workflow stages','Confirm delivery dates','Request supplier quotes'],
    Studio:['Upload visuals &amp; proofs','Manage branding builds','Respond to design feedback'],
    Contact:['Reply to stock / delivery / quote enquiries','Receive orders','Upload proofs (branding)','Manage product feed']
  };
  function initials(n){ return av(n); }
  function uhash(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))&0x7fffffff; return h; }
  function userStatsBlock(u,ctx){
    if(u.status==='invited') return '';
    const h=uhash(u.n);
    if(ctx.kind==='sup'){
      const enq=4+h%18, proofs=2+h%9;
      return `<div class="dwr-sec"><h4>Activity summary</h4><div class="statgrid">
        <div class="stat"><b>${enq}</b><span>Enquiries handled</span></div>
        <div class="stat"><b>${proofs}</b><span>Proofs uploaded</span></div>
        <div class="stat"><b>${u.last==='Online'||/h ago|Today|Yesterday/.test(u.last)?'Active':esc(u.last)}</b><span>Last active</span></div>
      </div></div>`;
    }
    const orders=2+h%22, spend='£'+((3+h%48)*1000).toLocaleString(), appr=1+h%9;
    return `<div class="dwr-sec"><div class="sec-hd"><h4>Orders &amp; activity</h4><a class="seclink" href="#" data-orders="user:${u.n}">View orders ›</a></div><div class="statgrid">
      <div class="stat"><b>${orders}</b><span>Orders placed</span></div>
      <div class="stat"><b>${spend}</b><span>Spend influenced</span></div>
      <div class="stat"><b>${appr}</b><span>Approvals given</span></div>
    </div></div>`;
  }
  function userServiceBlock(u,ctx){
    if(u.status==='invited') return '';
    const h=uhash(u.n+'svc');
    const resp=['1h avg','2h avg','4h avg','same day','1d avg'][h%5];
    if(ctx.kind==='sup'){
      const onTime=82+h%17, acc=88+h%11;
      return `<div class="dwr-sec"><h4>Service performance</h4><div class="svc">
        <div class="svc-row"><span class="svc-k">Enquiries on time</span>${bar(onTime)}<span class="svc-v">${onTime}%</span></div>
        <div class="svc-row"><span class="svc-k">Proof accuracy</span>${bar(acc)}<span class="svc-v">${acc}%</span></div>
        <div class="svc-row"><span class="svc-k">Response speed</span><span class="svc-resp">${resp}</span></div>
      </div></div>`;
    }
    const turn=80+h%19;
    return `<div class="dwr-sec"><h4>Responsiveness</h4><div class="svc">
      <div class="svc-row"><span class="svc-k">Approvals turned around on time</span>${bar(turn)}<span class="svc-v">${turn}%</span></div>
      <div class="svc-row"><span class="svc-k">Avg. response to comments</span><span class="svc-resp">${resp}</span></div>
    </div></div>`;
  }
  function userProducts(u,ctx){
    if(u.status==='invited') return [];
    const org=ctx.org;
    const src = ctx.kind==='sup' ? (org&&org.productList) : (org&&org.products);
    if(!src||!src.length) return [];
    const h=uhash(u.n+'prod');
    // attribute a deterministic slice of the org's products to this user
    return src.slice(0, 1+(h%Math.min(3,src.length))).map(p=>({name:p.name, orders:1+((h+p.name.length)%6), qty:Math.round((p.qty||1000)/(2+h%3)), value:p.value}));
  }
  function userCommentsBlock(u,uid){
    u._comments=u._comments||[];
    const pinned=u._comments.filter(c=>c.pinned), rest=u._comments.filter(c=>!c.pinned);
    const row=c=>`<div class="cmt ${c.pinned?'pinned':''}"><div class="cmt-h"><span class="cmt-av">${av(c.who)}</span><b>${esc(c.who)}</b><span class="cmt-role">${esc(c.role||'')}</span><span class="cmt-when">${esc(c.when)}</span><button class="cmt-pin" data-upin="${uid}:${u._comments.indexOf(c)}" title="${c.pinned?'Unpin':'Pin'}">${c.pinned?'★':'☆'}</button></div><p>${esc(c.text)}</p></div>`;
    return `<div class="dwr-sec"><h4>Comments &amp; notes</h4>
      ${pinned.length?`<div class="cmt-pinhd">Pinned</div>${pinned.map(row).join('')}`:''}
      ${rest.map(row).join('')}
      ${u._comments.length?'':'<p style="font-size:13px;color:var(--muted);margin:0 0 12px">No notes on this user yet.</p>'}
      <div class="cmt-add"><input type="text" class="cmt-input" placeholder="Add a note about this user…" data-ucmtkey="${uid}"><button class="btn sm" data-ucmtsend="${uid}">Post</button></div></div>`;
  }
  function fakeActivity(u, ctx){
    if(u.status==='invited') return [{t:'Invitation sent',d:'Pending acceptance'}];
    if(ctx.kind==='sup') return [
      {t:'Replied to a stock enquiry — Eco Wheat-Straw Cable',d:'2 days ago'},
      {t:'Uploaded proof v2 — Recycled Cotton Tote',d:'1 week ago'},
      {t:'Updated product feed (480 lines)',d:'3 weeks ago'}];
    if(ctx.kind==='team') return [
      {t:'Promoted Tech Travel Bag to Ready to Order',d:'1 hour ago'},
      {t:'Confirmed delivery date with Lumen Supplies',d:'Yesterday'},
      {t:'Requested a quote — Prodir Pen',d:'3 days ago'}];
    return [
      {t:'Approved the design proof — Eco Wheat-Straw Cable',d:'4 hours ago'},
      {t:'Left feedback on a visual — Tote bag',d:'2 days ago'},
      {t:'Created project “Autumn Giveaways”',d:'2 weeks ago'}];
  }
  function profileDrawer(uid){
    const rec=UREG[uid]; if(!rec) return '';
    const {u,ctx}=rec;
    const perms=PERMS[u.role]||[];
    const acts=fakeActivity(u,ctx);
    const logoCls = ctx.kind==='cust'?'l-cust':(ctx.kind==='sup'?supLogo(rec.ctx.org&&rec.ctx.org.kind):'l-cust');
    return `<div class="dwr-head"><div class="ologo ${logoCls}" style="border-radius:50%">${initials(u.n)}</div>
      <div><h2 style="font-family:var(--serif);font-weight:500;font-size:23px;margin:0">${esc(u.n)}</h2>
      <div style="font-size:13px;color:var(--text-soft);margin-top:2px">${esc(u.title)} · ${esc(u.role)}</div></div>
      <button class="dwr-x" data-x>×</button></div>
    <div class="dwr-body">
      <div class="prof-status ${u.status==='invited'?'inv':'act'}">${u.status==='invited'?'Invitation pending':'Active · '+esc(u.last)}</div>
      <div class="dwr-sec"><h4>Organisation</h4><div class="kv">
        <span class="k">Organisation</span><span class="v">${esc(ctx.orgName)}</span>
        <span class="k">Type</span><span class="v">${esc(ctx.orgType)}</span>
        <span class="k">${ctx.kind==='sup'?'Group':'Team'}</span><span class="v">${esc(ctx.team)}</span>
        <span class="k">Role</span><span class="v">${esc(u.role)}</span>
      </div></div>
      <div class="dwr-sec"><h4>Contact</h4><div class="kv">
        <span class="k">Email</span><span class="v">${u.email?`<a href="mailto:${esc(u.email)}" class="proflink">${esc(u.email)}</a>`:'—'}</span>
        <span class="k">Telephone</span><span class="v">${u.tel?esc(u.tel):'—'}</span>
      </div>
      <div class="prof-actions">
        ${u.email?`<a class="btn ghost sm" href="mailto:${esc(u.email)}"><svg class="icn" style="width:15px;height:15px"><use href="#i-mail"/></svg>Email</a>`:''}
        ${u.tel?`<a class="btn ghost sm" href="tel:${esc(u.tel.replace(/\s/g,''))}"><svg class="icn" style="width:15px;height:15px"><use href="#i-phone"/></svg>Call</a>`:''}
      </div></div>
      <div class="dwr-sec"><h4>Permissions · ${esc(u.role)}</h4>
        <ul class="permlist">${perms.map(p=>`<li>${p}</li>`).join('')}</ul></div>
      ${userStatsBlock(u,ctx)}
      ${userServiceBlock(u,ctx)}
      ${productsBlock(userProducts(u,ctx), ctx.kind==='sup'?'Products handled':'Products ordered')}
      <div class="dwr-sec"><h4>Recent activity</h4>
        <div class="acts">${acts.map(a=>`<div class="actrowp"><div class="dot"></div><div><b>${a.t}</b><span>${a.d}</span></div></div>`).join('')}</div></div>
      ${userCommentsBlock(u,uid)}
      <div class="dwr-sec prof-foot">
        <button class="btn ghost sm" data-editu="${uid}">Edit user</button>
        ${u.status==='invited'?`<button class="btn ghost sm" data-resend="${uid}">Resend invite</button>`:`<button class="btn ghost sm danger" data-removeu="${uid}">Remove from org</button>`}
        <button class="btn ghost sm" data-backu="${uid}">‹ Back to ${esc(ctx.orgName)}</button>
      </div>
    </div>`;
  }
  function openProfile(uid){
    openDrawer(profileDrawer(uid));
    const back=drawer.querySelector('[data-backu]'); if(back) back.onclick=()=>{ const rec=UREG[uid]; if(rec.ctx.kind==='cust') openDrawer(custDrawer(rec.ctx.org)); else if(rec.ctx.kind==='sup') openDrawer(supDrawer(rec.ctx.org)); else close(); };
    const rm=drawer.querySelector('[data-removeu]'); if(rm) rm.onclick=()=>{ const rec=UREG[uid]; if(!confirm('Remove '+rec.u.n+' from '+rec.ctx.orgName+'?')) return; removeUser(uid); };
    const ed=drawer.querySelector('[data-editu]'); if(ed) ed.onclick=()=>toast('Edit user — form would open here');
    const rs=drawer.querySelector('[data-resend]'); if(rs) rs.onclick=()=>toast('Invite resent to '+UREG[uid].u.n);
  }
  function removeUser(uid){
    const rec=UREG[uid]; if(!rec) return; const {ctx}=rec;
    if(ctx.kind==='team'){ const i=D.team.indexOf(rec.u); if(i>=0)D.team.splice(i,1); document.getElementById('teamWrap').innerHTML=teamWrapHTML(); document.querySelector('.tab[data-tab="team"] .ct').textContent=D.team.length; close(); }
    else if(ctx.kind==='cust'){ const t=ctx.org.teams.find(t=>t.name===ctx.team); if(t){ const i=t.users.indexOf(rec.u); if(i>=0)t.users.splice(i,1);} refreshCustCards(); openDrawer(custDrawer(ctx.org)); }
    else { const i=ctx.org.contacts.indexOf(rec.u); if(i>=0)ctx.org.contacts.splice(i,1); refreshSupCards(); openDrawer(supDrawer(ctx.org)); }
    toast(rec.u.n+' removed');
  }
  // delegated row click → profile
  document.addEventListener('click', e=>{
    const upin=e.target.closest('[data-upin]'); if(upin){ const parts=upin.dataset.upin.split(':'); const idx=+parts.pop(); const uid=parts.join(':'); const rec=UREG[uid]; if(rec&&rec.u._comments&&rec.u._comments[idx]){ rec.u._comments[idx].pinned=!rec.u._comments[idx].pinned; openProfile(uid); } return; }
    const usend=e.target.closest('[data-ucmtsend]'); if(usend){ const uid=usend.dataset.ucmtsend; const inp=document.querySelector(`.cmt-input[data-ucmtkey="${uid}"]`); const v=inp&&inp.value.trim(); if(!v) return; const rec=UREG[uid]; if(rec){ rec.u._comments=rec.u._comments||[]; rec.u._comments.push({who:'Jess Doyle',role:'Admin',when:'Just now',text:v,pinned:false}); openProfile(uid); toast('Note added'); } return; }
    const row=e.target.closest('.urow-link'); if(!row) return;
    if(e.target.closest('a')) return; // let mailto/tel links work
    if(row.dataset.uid) openProfile(row.dataset.uid);
  });

  /* ---------- enrichment render blocks ---------- */
  const FLAGTXT={amber:'Warning',red:'Action needed',grey:'Onboarding'};
  function flagBanner(o){ if(!o.flag) return ''; const lv=o.flag.level||'amber'; return `<div class="flagbar fb-${lv}"><svg class="icn"><use href="#i-flag"/></svg><div><b>${FLAGTXT[lv]||'Flag'}</b><span>${esc(o.flag.note||'')}</span></div></div>`; }
  function ordersBlock(o,kind){
    if(!o.totalOrders) return `<div class="dwr-sec"><h4>Orders</h4><p style="font-size:13px;color:var(--muted);margin:0">No orders yet.</p></div>`;
    return `<div class="dwr-sec"><div class="sec-hd"><h4>Orders &amp; spend</h4><a class="seclink" href="#" data-orders="${kind}:${o.id}">View all orders ›</a></div>
      <div class="statgrid">
        <div class="stat"><b>${o.totalOrders}</b><span>Total orders</span></div>
        <div class="stat"><b>${esc(o.totalSpend||'—')}</b><span>Total spend</span></div>
        <div class="stat"><b>${esc(o.lastOrder||'—')}</b><span>Last order</span></div>
      </div></div>`;
  }
  function bar(pct,good){ const col = good===false?'var(--flare)':(pct>=95?'var(--green-deep)':(pct>=88?'var(--periwinkle-deep)':'#c9882a')); return `<div class="svc-bar"><i style="width:${pct}%;background:${col}"></i></div>`; }
  function serviceBlock(o){
    if(!o.service) return '';
    const s=o.service;
    return `<div class="dwr-sec"><h4>Service performance</h4>
      <div class="svc">
        <div class="svc-row"><span class="svc-k">Delivery dates met</span>${bar(s.deliveryMet)}<span class="svc-v">${s.deliveryMet}%</span></div>
        <div class="svc-row"><span class="svc-k">Proof accuracy</span>${bar(s.proofAccuracy)}<span class="svc-v">${s.proofAccuracy}%</span></div>
        <div class="svc-row"><span class="svc-k">Order ack. accuracy</span>${bar(s.ackAccuracy)}<span class="svc-v">${s.ackAccuracy}%</span></div>
        <div class="svc-row"><span class="svc-k">Response speed</span><span class="svc-resp">${esc(s.responseSpeed)}</span></div>
      </div></div>`;
  }
  function productsBlock(list,title){
    if(!list||!list.length) return '';
    return `<div class="dwr-sec"><h4>${title}</h4>
      <table class="ptbl"><thead><tr><th>Product</th><th>Orders</th><th>Qty</th><th>Value</th></tr></thead>
      <tbody>${list.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.orders}</td><td>${(p.qty||0).toLocaleString()}</td><td>${esc(p.value)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function supProductListBlock(s){
    if(!s.productList||!s.productList.length) return s.kind==='branding'?'':`<div class="dwr-sec"><h4>Product list</h4><p style="font-size:13px;color:var(--muted);margin:0">No products on feed yet.</p></div>`;
    return `<div class="dwr-sec"><div class="sec-hd"><h4>Product list</h4><a class="seclink" href="#">Open full feed ›</a></div>
      <table class="ptbl"><thead><tr><th>Product / SKU</th><th>Orders</th><th>Value</th><th>Store</th></tr></thead>
      <tbody>${s.productList.map((p,i)=>`<tr><td>${esc(p.name)}<small>${esc(p.sku)}</small></td><td>${p.orders}</td><td>${esc(p.value)}</td><td>${p.inStore?'<span class="instore">In store</span>':`<button class="addstore" data-addstore="${s.id}:${i}">+ Add to store</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function commentsBlock(o,key){
    o.comments=o.comments||[];
    const pinned=o.comments.filter(c=>c.pinned), rest=o.comments.filter(c=>!c.pinned);
    const row=(c,idx)=>`<div class="cmt ${c.pinned?'pinned':''}"><div class="cmt-h"><span class="cmt-av">${av(c.who)}</span><b>${esc(c.who)}</b><span class="cmt-role">${esc(c.role||'')}</span><span class="cmt-when">${esc(c.when)}</span><button class="cmt-pin" data-pin="${key}:${o.comments.indexOf(c)}" title="${c.pinned?'Unpin':'Pin'}">${c.pinned?'★':'☆'}</button></div><p>${esc(c.text)}</p></div>`;
    return `<div class="dwr-sec"><h4>Comments &amp; activity</h4>
      ${pinned.length?`<div class="cmt-pinhd">Pinned</div>${pinned.map(row).join('')}`:''}
      ${rest.map(row).join('')}
      ${o.comments.length?'':'<p style="font-size:13px;color:var(--muted);margin:0 0 12px">No comments yet.</p>'}
      <div class="cmt-add"><input type="text" class="cmt-input" placeholder="Add a comment…" data-cmtkey="${key}"><button class="btn sm" data-cmtsend="${key}">Post</button></div></div>`;
  }
  function orgByKey(key){ const [k,id]=key.split(':'); return k==='cust'?D.customers.find(x=>x.id===id):D.suppliers.find(x=>x.id===id); }
  function reopen(o){ if(D.customers.includes(o)) openDrawer(custDrawer(o)); else openDrawer(supDrawer(o)); }
  document.addEventListener('click', e=>{
    const pin=e.target.closest('[data-pin]'); if(pin){ const parts=pin.dataset.pin.split(':'); const idx=+parts.pop(); const o=orgByKey(parts.join(':')); if(o&&o.comments[idx]){ o.comments[idx].pinned=!o.comments[idx].pinned; reopen(o); } return; }
    const send=e.target.closest('[data-cmtsend]'); if(send){ const key=send.dataset.cmtsend; const inp=document.querySelector(`.cmt-input[data-cmtkey="${key}"]`); const v=inp&&inp.value.trim(); if(!v) return; const o=orgByKey(key); if(o){ o.comments=o.comments||[]; o.comments.push({who:'Jess Doyle',role:'Admin',when:'Just now',text:v,pinned:false}); if(window.MSComments){ const isC=key.split(':')[0]==='cust'; MSComments.add({text:v, ctxType:'org', ctxLabel:o.name, deepLink:'Merchsmith Organisations.html#tab='+(isC?'customers':'suppliers')}); } reopen(o); toast('Comment added'); } return; }
    const ast=e.target.closest('[data-addstore]'); if(ast){ const [sid,i]=ast.dataset.addstore.split(':'); const s=D.suppliers.find(x=>x.id===sid); if(s&&s.productList[+i]){ s.productList[+i].inStore=true; openDrawer(supDrawer(s)); toast(s.productList[+i].name+' added to store'); } return; }
    const ords=e.target.closest('[data-orders]'); if(ords){ e.preventDefault(); toast('Orders list would open here'); return; }
  });

  /* ---------- supplier days-in-lieu ---------- */
  const globalLieu = ()=> (window.MSLead ? MSLead.globalLieu() : 3);
  function supLieuEff(s){ return s.lieu==null ? globalLieu() : s.lieu; }
  function supLieuLabel(s){ return s.lieu==null ? globalLieu()+' (default)' : s.lieu+' (override)'; }
  document.addEventListener('click', e=>{
    const step=e.target.closest('.mini-step'); 
    if(step){ const s=currentSup(); if(!s) return; const btn=e.target.closest('button'); if(!btn) return;
      const cur=supLieuEff(s); s.lieu=Math.max(0, cur + (+btn.dataset.d)); openDrawer(supDrawer(s)); refreshSupCards(); toast(s.name+' days in lieu: '+s.lieu); return; }
    const def=e.target.closest('[data-suplieudef]'); if(def){ const s=currentSup(); if(s){ s.lieu=null; openDrawer(supDrawer(s)); refreshSupCards(); toast(s.name+' uses default'); } return; }
  });

  /* ---------- edit organisation ---------- */
  document.addEventListener('click', e=>{
    const b=e.target.closest('[data-editorg]'); if(b){
      const [kind,id]=b.dataset.editorg.split(':');
      if(kind==='cust'){ const c=D.customers.find(x=>x.id===id); if(c) editCustForm(c); }
      else { const s=D.suppliers.find(x=>x.id===id); if(s) editSupForm(s); }
      return;
    }
    const g=e.target.closest('[data-ghost]'); if(g){ const c=D.customers.find(x=>x.id===g.dataset.ghost); if(c) ghostCustomerFlow(c); }
  });
  function ghostCustomerFlow(c){
    const m=modal(`<div class="fm-head"><h3>Ghost ${esc(c.name)}</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <div class="ghost-note"><svg class="icn" style="width:18px;height:18px;color:var(--periwinkle-deep)"><use href="#i-eye"/></svg><p>Ghosting lets you view and act in the platform <b>as ${esc(c.name)}</b> — their projects, basket and approvals. This requires the customer's <b>permission</b> and every ghosted session is <b>logged</b>.</p></div>
        <label class="fm-f"><span>Reason for access</span><select id="gReason"><option>Assisting with an order</option><option>Troubleshooting an issue</option><option>Placing an order on their behalf</option><option>Training / onboarding</option></select></label>
        <label class="gchk"><input type="checkbox" id="gConsent"> I confirm <b>${esc(c.name)}</b> has granted permission for this ghosted session.</label>
        <p class="note" style="font-size:11.5px">A consent request can also be sent to the customer's admin to approve in-app.</p>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="gStart" disabled>Enter ghost mode</button></div>`);
    const cb=m.wrap.querySelector('#gConsent'), btn=m.wrap.querySelector('#gStart');
    cb.onchange=()=>{ btn.disabled=!cb.checked; };
    btn.onclick=()=>{ try{ localStorage.setItem('ms-ghost-cust', c.name); localStorage.setItem('ms-identity','customer'); }catch(e){}
      m.shut(); toast('Entered ghost mode as '+c.name); setTimeout(()=>{ location.href='Merchsmith Project - Autumn Giveaways.html'; }, 700); };
  }
  function editCustForm(c){
    const m=modal(`<div class="fm-head"><h3>Edit customer</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        ${field('Organisation name','ecN','value="'+esc(c.name)+'"')}
        ${field('Domain','ecD','value="'+esc(c.domain)+'"')}
        ${field('Standing discount %','ecDisc','type="number" min="0" max="100" value="'+(parseFloat(c.standingDiscount)||0)+'"')}
        <label class="fm-f"><span>Status</span><select id="ecS"><option value="active"${c.status==='active'?' selected':''}>Active</option><option value="pending"${c.status!=='active'?' selected':''}>Pending invite</option></select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="ecSave">Save changes</button></div>`);
    m.wrap.querySelector('#ecSave').onclick=()=>{
      const nm=m.wrap.querySelector('#ecN').value.trim(); if(!nm){ m.wrap.querySelector('#ecN').focus(); return; }
      c.name=nm; c.initials=av(nm); c.domain=m.wrap.querySelector('#ecD').value.trim()||'—';
      const d=m.wrap.querySelector('#ecDisc').value; c.standingDiscount=(d===''?'0':d)+'%'; c.status=m.wrap.querySelector('#ecS').value;
      refreshCustCards(); openDrawer(custDrawer(c)); m.shut(); toast('Customer updated');
    };
  }
  function editSupForm(s){
    const m=modal(`<div class="fm-head"><h3>Edit supplier</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        ${field('Supplier name','esN','value="'+esc(s.name)+'"')}
        ${field('Domain','esD','value="'+esc(s.domain)+'"')}
        <div class="fm-f"><span>Supplier type</span><div class="fm-seg sm" id="esK"><button type="button" class="${s.kind==='product'?'on':''}" data-k="product">Product</button><button type="button" class="${s.kind==='branding'?'on':''}" data-k="branding">Branding</button></div></div>
        ${field('Lead time (working days)','esLead','type="number" min="1" value="'+(parseInt(s.lead)||7)+'"')}
        <label class="fm-f"><span>Status</span><select id="esS"><option value="active"${s.status==='active'?' selected':''}>Active</option><option value="pending"${s.status!=='active'?' selected':''}>Pending invite</option></select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="esSave">Save changes</button></div>`);
    let kind=s.kind;
    m.wrap.querySelectorAll('#esK button').forEach(b=>b.onclick=()=>{ kind=b.dataset.k; m.wrap.querySelectorAll('#esK button').forEach(x=>x.classList.toggle('on',x===b)); });
    m.wrap.querySelector('#esSave').onclick=()=>{
      const nm=m.wrap.querySelector('#esN').value.trim(); if(!nm){ m.wrap.querySelector('#esN').focus(); return; }
      s.name=nm; s.initials=av(nm); s.domain=m.wrap.querySelector('#esD').value.trim()||'—'; s.kind=kind;
      s.lead=(m.wrap.querySelector('#esLead').value||'7')+' working days'; s.status=m.wrap.querySelector('#esS').value;
      refreshSupCards(); openDrawer(supDrawer(s)); m.shut(); toast('Supplier updated');
    };
  }


  function refreshCustCards(){ document.getElementById('custGrid').innerHTML=D.customers.map(custCard).join(''); }
  function refreshSupCards(){ document.getElementById('supGrid').innerHTML=D.suppliers.map(supCard).join(''); }
  function teamWrapHTML(){ return `<div class="teamblock"><div class="th"><b>Mojo Promotions · internal team</b><span>${D.team.length} members</span></div>${D.team.map(urow).join('')}<button class="addline"><svg class="icn" style="width:15px;height:15px"><use href="#i-plus"/></svg>Invite team member</button></div>`; }
  function wireTeamAdds(){}

  /* ---------- Connect a supplier (search · 80% name OR domain match · Path A/B) ---------- */
  // discoverable Merchsmith suppliers NOT yet connected to this distributor
  const DISCOVER=[
    {id:'d-veltex', name:'Veltex Textiles Ltd', domain:'veltex.co.uk', kind:'product', products:760},
    {id:'d-inkwell', name:'Inkwell Print Co', domain:'inkwellprint.com', kind:'branding', products:0},
    {id:'d-novapen', name:'NovaPen Manufacturing', domain:'novapen.de', kind:'product', products:1430},
    {id:'d-claritee', name:'ClariTee Apparel', domain:'claritee.co', kind:'both', products:540}
  ];
  function normName(s){ return (s||'').toLowerCase().replace(/\b(ltd|limited|uk|co|inc|gmbh|plc|llp|the|company|manufacturing|mfg)\b/g,' ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean); }
  function nameScore(q,name){ const a=normName(q),b=normName(name); if(!a.length||!b.length) return 0; const setB=new Set(b); let hit=0; a.forEach(w=>{ if(setB.has(w)) hit++; }); const inter=a.filter(w=>setB.has(w)).length; return Math.round(100*inter/Math.max(a.length,b.length)); }
  function domainHit(q,dom){ q=(q||'').toLowerCase().trim(); if(!dom) return false; if(q.includes('@')) q=q.split('@')[1]; return q.length>3 && (q===dom || dom.includes(q) || q.includes(dom)); }
  function matchSuppliers(q){ if(!q || q.trim().length<2) return []; return DISCOVER.map(s=>({s, score:nameScore(q,s.name), dom:domainHit(q,s.domain)})).filter(r=>r.score>=80||r.dom).sort((a,b)=>b.score-a.score); }

  function openConnect(){
    const m=modal(`<button class="fm-x" data-fx>&times;</button>
      <h3 class="fm-h">Connect a supplier</h3>
      <p class="fm-sub">Search for a supplier you already work with. They'll only appear if your query matches their registered name (≥80%) or email domain — this keeps other distributors' suppliers private.</p>
      <label class="fm-f"><span>Supplier name or email domain</span><input id="cnQ" placeholder="e.g. Veltex Textiles  ·  hello@veltex.co.uk" autocomplete="off"></label>
      <div class="cn-or"><span>or</span></div>
      <div class="cn-csv"><button class="btn ghost sm" id="cnCsvBtn"><svg class="icn"><use href="#i-plus"/></svg>Upload a supplier list (CSV)</button><small>Match every row against Merchsmith in one go.</small><input type="file" id="cnCsv" accept=".csv" hidden></div>
      <div id="cnResults" class="cn-results"></div>`);
    const q=m.wrap.querySelector('#cnQ'), res=m.wrap.querySelector('#cnResults');
    // CSV bulk match (simulated) — lists found (bulk request) + not-found (Path A/B)
    const csvBtn=m.wrap.querySelector('#cnCsvBtn'), csv=m.wrap.querySelector('#cnCsv');
    if(csvBtn&&csv){ csvBtn.onclick=()=>csv.click(); csv.onchange=()=>{ const f=csv.files&&csv.files[0]; drawCsv(f?f.name:'supplier-list.csv'); }; }
    function drawCsv(fname){
      q.value='';
      const foundRows=DISCOVER.slice(0,2), miss=[{name:'Acme Promo Co'},{name:'Halden Print Ltd'}];
      res.innerHTML=`<div class="cn-csvhd">Matched <b>${fname}</b> · ${foundRows.length} found, ${miss.length} not found</div>`
        +'<div class="cn-lbl ok">Found — connect in bulk</div>'
        +`<div class="cn-bulk"><span>${foundRows.length} suppliers matched</span><button class="btn sm" id="cnBulk">Request all</button></div>`
        +foundRows.map(s=>`<div class="cn-row"><span class="cn-logo ${s.kind}">${av(s.name)}</span><div class="cn-info"><b>${s.name}</b><span>${s.domain} · ${s.products?s.products+' products':'decoration only'}</span></div><button class="btn sm ghost" data-conn="${s.id}">Request</button></div>`).join('')
        +'<div class="cn-lbl no" style="margin-top:14px">Not found — add manually or request onboarding</div>'
        +miss.map(s=>`<div class="cn-row"><span class="cn-logo" style="background:var(--muted)">${av(s.name)}</span><div class="cn-info"><b>${s.name}</b><span>No Merchsmith match</span></div><button class="btn sm ghost" data-missself="${s.name}">Add myself</button><button class="btn sm" data-missonboard="${s.name}">Onboard</button></div>`).join('');
      res.querySelectorAll('[data-conn]').forEach(b=>b.onclick=()=>{ const s=DISCOVER.find(x=>x.id===b.dataset.conn); m.shut(); addPendingSupplier(s,'requested'); toast('Connection request sent to '+s.name); });
      const bulk=res.querySelector('#cnBulk'); if(bulk) bulk.onclick=()=>{ const n=foundRows.length; foundRows.forEach(s=>addPendingSupplier(s,'requested')); m.shut(); toast(n+' connection requests sent — awaiting supplier confirmation'); };
      res.querySelectorAll('[data-missself]').forEach(b=>b.onclick=()=>{ m.shut(); addManualSupplier(b.dataset.missself); });
      res.querySelectorAll('[data-missonboard]').forEach(b=>b.onclick=()=>{ m.shut(); toast('Onboarding request sent to Merchsmith for "'+b.dataset.missonboard+'"'); });
    }
    function draw(){
      const v=q.value.trim();
      if(v.length<2){ res.innerHTML='<div class="cn-hint">Start typing a supplier name or email domain…</div>'; return; }
      const found=matchSuppliers(v);
      if(found.length){
        res.innerHTML='<div class="cn-lbl ok">Found on Merchsmith</div>'+found.map(r=>`<div class="cn-row"><span class="cn-logo ${r.s.kind}">${av(r.s.name)}</span><div class="cn-info"><b>${r.s.name}</b><span>${r.dom?'domain '+r.s.domain+' ✓':''}${r.dom&&r.score>=80?' · ':''}${r.score>=80?r.score+'% name':''} · ${r.s.products?r.s.products+' products':'decoration only'}</span></div><button class="btn sm" data-conn="${r.s.id}">Request connection</button></div>`).join('');
      } else {
        res.innerHTML=`<div class="cn-lbl no">Not on Merchsmith</div>
          <div class="cn-notfound"><p>No supplier matches "<b>${v.replace(/</g,'&lt;')}</b>". Bring them on board:</p>
          <div class="cn-paths">
            <div class="cn-path"><b>Add it yourself</b><span>Manual product uploads only — no live feed.</span><button class="btn ghost sm" data-addself>Add supplier myself</button></div>
            <div class="cn-path b"><b>Request Merchsmith onboards them</b><span>Formal setup with API feed &amp; their own account.</span><button class="btn sm" data-reqonboard>Request onboarding</button></div>
          </div></div>`;
      }
      res.querySelectorAll('[data-conn]').forEach(b=>b.onclick=()=>{ const s=DISCOVER.find(x=>x.id===b.dataset.conn); m.shut(); addPendingSupplier(s,'requested'); toast('Connection request sent to '+s.name+' — awaiting their confirmation'); });
      res.querySelector('[data-addself]') && (res.querySelector('[data-addself]').onclick=()=>{ m.shut(); addManualSupplier(v); });
      res.querySelector('[data-reqonboard]') && (res.querySelector('[data-reqonboard]').onclick=()=>{ m.shut(); toast('Onboarding request sent to Merchsmith for "'+v+'" — we\u2019ll invite & verify them'); });
    }
    q.oninput=draw; draw(); setTimeout(()=>q.focus(),60);
  }
  function addPendingSupplier(s,status){
    D.suppliers.unshift({id:s.id,name:s.name,initials:av(s.name),kind:s.kind,domain:s.domain,status:'pending',lead:'—',feed:status==='requested'?'Awaiting supplier confirmation':'Manual',products:0,since:'2026',address:'—',totalOrders:0,lastOrder:'—',totalSpend:'£0',paymentTerms:'—',flag:{level:'grey',note:'Connection requested — awaiting supplier confirmation'},service:null,productList:[],contacts:[],comments:[]});
    refreshSupCards(); document.querySelector('.tab[data-tab="suppliers"] .ct').textContent=D.suppliers.length;
    const i=DISCOVER.findIndex(x=>x.id===s.id); if(i>=0) DISCOVER.splice(i,1);
  }
  function addManualSupplier(name){
    const id='sup-'+Date.now();
    D.suppliers.unshift({id,name,initials:av(name),kind:'product',domain:'',status:'pending',lead:'—',feed:'Manual catalogue (self-added)',products:0,since:'2026',address:'—',totalOrders:0,lastOrder:'—',totalSpend:'£0',paymentTerms:'—',flag:{level:'grey',note:'Self-added — manual uploads only, no live feed'},service:null,productList:[],contacts:[],comments:[]});
    refreshSupCards(); document.querySelector('.tab[data-tab="suppliers"] .ct').textContent=D.suppliers.length;
    toast('Supplier "'+name+'" added — upload products manually to publish them');
  }
  { const cb=document.getElementById('connectSupBtn'); if(cb) cb.onclick=openConnect; }

  // track which org a drawer is showing
  const _openDrawer=openDrawer;
  document.addEventListener('click', e=>{ const card=e.target.closest('.ocard'); if(!card) return; if(card.dataset.kind==='cust'){_curCustId=card.dataset.id;_curSupId=null;} else {_curSupId=card.dataset.id;_curCustId=null;} });
})();
