/* admin-users.js — Platform Admin → Users: every person across every organisation,
   searchable and editable, plus the platform-wide audit log. Reads the one people
   store (people.js) hydrated over the seeds in org-data.js + admin-data.js. */
(function(){
  const P=window.MSPEOPLE, OD=window.ORG_DATA, A=window.ADMIN;
  if(!P||!OD) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // hydrate every org once, then flatten to rows
  P.hydrate('mojo',OD.mojoTeams);
  OD.customers.forEach(c=>{ P.hydrate(c.id,c.teams); P.hydrateOrg(c.id,c); });
  OD.suppliers.forEach(s=>{ P.hydrateContacts(s.id,s.contacts=s.contacts||[]); P.hydrateOrg(s.id,s); });
  const ORGS=[
    {key:'merchsmith',name:'Merchsmith',type:'merchsmith',teams:()=>[{name:'Operators',users:A.team||[]}]},
    {key:'mojo',name:'Mojo Promotions',type:'distributor',teams:()=>OD.mojoTeams},
    ...OD.customers.map(c=>({key:c.id,name:c.name,type:'customer',org:c,teams:()=>c.teams})),
    ...OD.suppliers.map(s=>({key:s.id,name:s.name,type:'supplier',org:s,teams:()=>[{name:'Contacts',users:s.contacts}]}))
  ];
  // Platform Admin's own distributor + supplier records (people via admin-orgs.js)
  if(window.MSAdminOrgs){
    A.distributors.filter(d=>d.id!=='acme').forEach(d=>{ const o=MSAdminOrgs.orgOf({kind:'dist',rec:d}); ORGS.push({key:o.key,name:d.name,type:'distributor',teams:()=>o.teams}); });
    A.suppliers.filter(s=>!ORGS.some(x=>x.name===s.name)).forEach(s=>{ const o=MSAdminOrgs.orgOf({kind:'sup',rec:s}); ORGS.push({key:o.key,name:s.name,type:'supplier',teams:()=>o.teams}); });
  }
  const TYPELBL={merchsmith:'Merchsmith',distributor:'Distributor',customer:'Customer',supplier:'Supplier'};
  function rows(){ const out=[]; ORGS.forEach(o=>o.teams().forEach(t=>(t.users||[]).forEach(u=>out.push({u,o,team:t.name})))); return out; }

  // company mark: uploaded logo → known brand logo → initials tile tinted by org type
  const TYPEBG={merchsmith:'var(--periwinkle-deep)',distributor:'var(--sky)',customer:'var(--spearmint)',supplier:'#8246af'};
  const initials=n=>String(n||'?').replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  function orgMark(o){ const logo=(o.org&&o.org.logo)||((A.distributors||[]).concat(A.suppliers||[]).find(x=>x.name===o.name)||{}).logo;
    if(logo) return `<span class="au-om img"><img src="${esc(logo)}" alt=""></span>`;
    if(o.type==='merchsmith') return '<span class="au-om" style="background:var(--periwinkle-deep)">M</span>';
    if(window.MSLOGOS&&MSLOGOS.has(o.name)) return `<span class="au-om svg">${MSLOGOS.svg(o.name,28)}</span>`;
    return `<span class="au-om" style="background:${TYPEBG[o.type]||'var(--ink-3)'}">${esc(initials(o.name))}</span>`; }
  // chat / meeting / call — resolves the person into the shared chat directory first
  function contact(kind,r){ const M=window.MSChat; const p=M&&M.resolve?M.resolve({name:r.u.n,email:r.u.email,org:r.o.key,orgName:r.o.name,title:r.u.role}):null;
    if(kind==='chat'){ if(p) M.openPerson(p.id); return; }
    if(kind==='meet'){ location.href='Merchsmith Calendar.html?scope=platform#tab=cal&with='+encodeURIComponent(p?p.id:''); return; }
    if(kind==='email'){ if(window.MSEMAIL) MSEMAIL.compose({to:[{name:r.u.n,email:r.u.email||'',org:r.o.name}]}); return; }
    if(kind==='call'&&window.MSCALLS){ if(p) MSCALLS.dial({pid:p.id}); else if(r.u.phone) MSCALLS.dial({number:r.u.phone}); } }
  let q='', fType='', fRole='', fStatus='', tab='people';
  const statusOf=u=>u.status==='deactivated'?'deactivated':u.status==='invited'?'invited':'active';
  function render(){
    const host=document.getElementById('panel-users'); if(!host) return;
    const all=rows();
    const roles=[...new Set(all.map(r=>P.normRole(r.u.role)))].sort();
    let list=all.filter(r=>(!fType||r.o.type===fType)&&(!fRole||P.normRole(r.u.role)===fRole)&&(!fStatus||statusOf(r.u)===fStatus));
    if(q){ const s=q.toLowerCase(); list=list.filter(r=>(r.u.n||'').toLowerCase().includes(s)||(r.u.email||'').toLowerCase().includes(s)||r.o.name.toLowerCase().includes(s)); }
    list.sort((a,b)=>a.o.name.localeCompare(b.o.name)||(window.MSNAME?MSNAME.sortKey(a.u).localeCompare(MSNAME.sortKey(b.u)):(a.u.n||'').localeCompare(b.u.n||'')));
    const n=k=>all.filter(r=>statusOf(r.u)===k).length;
    const log=P.audit().slice(0,120);
    host.innerHTML=`<div class="phead"><h1 class="ptitle">Users</h1></div>
      <div class="statbar">
        <div class="sb"><b>${all.length.toLocaleString()}</b><span>People</span></div>
        <div class="sb"><b>${n('active')}</b><span>Active</span></div>
        <div class="sb"><b>${n('invited')}</b><span>Invited</span></div>
        <div class="sb"><b>${n('deactivated')}</b><span>Deactivated</span></div>
        <div class="sb"><b>${ORGS.length}</b><span>Organisations</span></div>
      </div>
      <div class="au-tabs"><button class="${tab==='people'?'on':''}" data-autab="people">People</button><button class="${tab==='audit'?'on':''}" data-autab="audit">Audit log <i>${(P.audit()||[]).length}</i></button></div>
      ${tab==='people'?`
      <div class="au-tools">
        <div class="au-search"><svg class="icn"><use href="#a-search"/></svg><input id="auQ" placeholder="Search by name, email or organisation…" value="${esc(q)}"></div>
        <select id="auType"><option value="">All organisation types</option>${Object.keys(TYPELBL).map(k=>`<option value="${k}" ${fType===k?'selected':''}>${TYPELBL[k]}</option>`).join('')}</select>
        <select id="auRole"><option value="">All roles</option>${roles.map(r=>`<option ${fRole===r?'selected':''}>${esc(r)}</option>`).join('')}</select>
        <select id="auStatus"><option value="">All statuses</option>${['active','invited','deactivated'].map(k=>`<option value="${k}" ${fStatus===k?'selected':''}>${k[0].toUpperCase()+k.slice(1)}</option>`).join('')}</select>
      </div>
      <div class="au-wrap"><table class="dirtable au-tbl"><thead><tr><th>Person</th><th>Organisation</th><th>Type</th><th>Team</th><th>Role</th><th>Status</th><th>Last seen</th><th>Contact</th></tr></thead>
      <tbody>${list.length?list.map((r,i)=>`<tr data-au="${all.indexOf(r)}" class="${statusOf(r.u)==='deactivated'?'u-deact':''}">
        <td><div class="au-person"><span class="au-av">${P.avHTML(r.u)}</span><span><b>${esc(r.u.n)}</b><em>${esc(r.u.email||'no email')}</em></span></div></td>
        <td><div class="au-org">${orgMark(r.o)}<span>${esc(r.o.name)}</span></div></td><td><span class="au-type t-${r.o.type}">${TYPELBL[r.o.type]}</span></td>
        <td>${esc(r.team)}</td><td>${esc(P.normRole(r.u.role))}</td>
        <td><span class="au-st s-${statusOf(r.u)}">${statusOf(r.u)[0].toUpperCase()+statusOf(r.u).slice(1)}</span></td>
        <td>${esc(r.u.status==='invited'?'—':r.u.last||'—')}</td>
        <td>${statusOf(r.u)==='deactivated'||r.o.key==='merchsmith'&&r.u.n===(A.me&&A.me.name)?'':`<div class="au-acts"><button data-uact="chat" title="Message ${esc(r.u.n)}" aria-label="Message ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/></svg></button><button data-uact="meet" title="Book a meeting with ${esc(r.u.n)}" aria-label="Book a meeting with ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></button><button data-uact="email" title="Email ${esc(r.u.n)}" aria-label="Email ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg></button><button data-uact="call" title="Call ${esc(r.u.n)}" aria-label="Call ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></button></div>`}</td></tr>`).join('')
        :`<tr><td colspan="8"><div class="au-empty">No one matches those filters.</div></td></tr>`}</tbody></table></div>`
      :`<div class="au-log">${log.length?log.map(e=>{ const o=ORGS.find(x=>x.key===e.org);
          return `<div class="au-lr"><span class="au-lt">${new Date(e.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
            <span class="au-la"><b>${esc(e.actor)}</b> · ${esc(P.LBL[e.action]||e.action)}${e.user?` · <b>${esc(e.user)}</b>`:''}${e.detail?` <span>${esc(e.detail)}</span>`:''}</span>
            <span class="au-lo">${esc(o?o.name:e.org)}</span></div>`; }).join('')
        :'<div class="au-empty">Nothing recorded yet. Invites, edits, role changes, team changes and deactivations across every organisation are logged here.</div>'}</div>`}`;
    host.querySelectorAll('[data-autab]').forEach(b=>b.onclick=()=>{ tab=b.dataset.autab; render(); });
    const qi=host.querySelector('#auQ'); if(qi) qi.oninput=()=>{ q=qi.value; const p=qi.selectionStart; render(); const n2=document.getElementById('auQ'); if(n2){ n2.focus(); n2.setSelectionRange(p,p); } };
    [['#auType',v=>fType=v],['#auRole',v=>fRole=v],['#auStatus',v=>fStatus=v]].forEach(([sel,set])=>{ const el=host.querySelector(sel); if(el) el.onchange=()=>{ set(el.value); render(); }; });
    host.querySelectorAll('[data-uact]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const r=all[+b.closest('[data-au]').dataset.au]; contact(b.dataset.uact,r); });
    // row → the platform-wide user profile panel (dist-users.js); falls back to the edit form
    host.querySelectorAll('[data-au]').forEach(tr=>tr.onclick=()=>{ const r=all[+tr.dataset.au]; if(window.MSUSER&&MSUSER.open({name:r.u.n,email:r.u.email,org:r.o.name})) return; const teams=r.o.teams();
      const peers=teams.flatMap(t=>t.users);
      P.userForm({ title:'Edit '+r.u.n+' · '+r.o.name, user:r.u, kind:'team', orgType:r.o.type, peers, orgKey:r.o.key,
        teamNames:teams.length>1?teams.map(t=>t.name):[], team:r.team,
        onSave:f=>{ P.saveUser(r.o.key,r.u,f);
          if(f.team&&f.team!==r.team){ const from=teams.find(t=>t.name===r.team), to=teams.find(t=>t.name===f.team);
            if(from&&to){ from.users.splice(from.users.indexOf(r.u),1); to.users.push(r.u); P.log(r.o.key,r.u,'team',r.team+' → '+f.team); } }
          render(); },
        onStatus:to=>{ P.setStatus(r.o.key,r.u,to); render(); } }); });
  }
  const css=document.createElement('style'); css.textContent=`
  .au-tabs{display:inline-flex;gap:2px;background:var(--paper-2);border-radius:999px;padding:3px;margin:4px 0 14px;}
  .au-tabs button{font:inherit;font-size:13px;font-weight:800;color:var(--ink-3);background:none;border:0;border-radius:999px;padding:8px 16px;cursor:pointer;}
  .au-tabs button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);}
  .au-tabs i{font-style:normal;font-size:10.5px;background:var(--periwinkle-deep);color:#fff;border-radius:999px;padding:1px 7px;margin-left:4px;}
  .au-tools{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px;}
  .au-search{display:flex;align-items:center;gap:9px;background:#fff;border:1.5px solid var(--line-soft);border-radius:11px;padding:8px 13px;flex:1 1 280px;}
  .au-search .icn{width:17px;height:17px;color:var(--ink-3);}
  .au-search input{border:0;background:none;font:inherit;font-size:13.5px;width:100%;color:var(--ink);}
  .au-search input:focus{outline:0;}
  .au-tools select{font:inherit;font-size:13px;font-weight:600;color:var(--ink);background:#fff;border:1.5px solid var(--line-soft);border-radius:11px;padding:8px 11px;cursor:pointer;}
  .au-wrap{overflow-x:auto;}
  .au-tbl{min-width:1000px;}
  .au-tbl tbody tr{cursor:pointer;}
  .au-person{display:flex;align-items:center;gap:11px;}
  .au-av{width:34px;height:34px;border-radius:50%;background:var(--periwinkle);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800;overflow:hidden;flex:none;}
  .au-person b{display:block;font-size:13.5px;color:var(--ink);}
  .au-person em{font-style:normal;font-size:12px;color:var(--ink-3);}
  .au-type,.au-st{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:3px 9px;white-space:nowrap;}
  .au-type{background:var(--paper-2);color:var(--ink);}
  .au-type.t-merchsmith{background:var(--periwinkle-deep);color:#fff;}
  .au-type.t-distributor{background:color-mix(in srgb,var(--sky) 28%,#fff);}
  .au-type.t-customer{background:color-mix(in srgb,var(--spearmint) 32%,#fff);}
  .au-type.t-supplier{background:color-mix(in srgb,var(--blossom) 55%,#fff);}
  .au-org{display:flex;align-items:center;gap:9px;white-space:nowrap;}
  .au-om{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:#fff;font-size:10.5px;font-weight:800;flex:none;overflow:hidden;}
  .au-om.img{background:#fff;border:1px solid var(--line-soft);} .au-om.img img{width:100%;height:100%;object-fit:contain;padding:2px;} .au-om.svg svg{width:28px;height:28px;}
  .au-acts{display:flex;gap:4px;}
  .au-acts button{width:32px;height:32px;border-radius:9px;border:1px solid var(--line-soft);background:#fff;color:var(--ink-3);display:grid;place-items:center;cursor:pointer;}
  .au-acts button:hover{color:var(--periwinkle-deep);border-color:var(--periwinkle);background:var(--tint-peri,#eceefb);}
  .au-acts svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  .au-st.s-active{background:var(--tint-green);color:var(--green-deep);}
  .au-st.s-invited{background:#fbeccd;color:#8a5a12;}
  .au-st.s-deactivated{background:var(--paper-2);color:var(--ink-3);}
  .au-empty{padding:26px;text-align:center;font-size:13.5px;color:var(--ink-3);}
  .au-log{background:#fff;border:1px solid var(--line-soft);border-radius:14px;}
  .au-lr{display:grid;grid-template-columns:130px minmax(0,1fr) 180px;gap:12px;padding:11px 16px;border-bottom:1px solid var(--paper-2);font-size:13px;align-items:baseline;}
  .au-lr:last-child{border-bottom:0;}
  .au-lt{font-size:12px;font-weight:700;color:var(--ink-3);}
  .au-la{color:var(--ink-2);}
  .au-la b{color:var(--ink);}
  .au-la span{color:var(--ink-3);}
  .au-lo{font-size:12px;font-weight:700;color:var(--ink-3);text-align:right;}
  @media(max-width:760px){.au-lr{grid-template-columns:1fr;}.au-lo{text-align:left;}}`;
  document.head.appendChild(css);
  window.MSAdminUsers={render};
  document.addEventListener('click',e=>{ if(e.target.closest('[data-nav="users"]')) setTimeout(render,0); });
  render();
})();
