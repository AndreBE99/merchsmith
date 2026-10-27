/* ============================================================
   dist-users.js — distributor "Users": every person the distributor works
   with — their own team, every customer's users, every supplier contact —
   in one searchable table, like Platform Admin → Users.
   Tabs: People (search, filters, sort, contact buttons, click to edit),
   Audit log (MSPEOPLE.audit for these organisations).
   ============================================================ */
(function(){
  const D=window.ORG_DATA, P=window.MSPEOPLE, host=document.getElementById('usersRoot'); if(!D) return;
  // also the platform-wide user profile panel (window.MSUSER): the Users table only renders when #usersRoot exists
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // Platform Admin already hydrates its own people; doing it again there loops with admin-orgs
  if(P&&!window.ADMIN){ P.hydrate&&P.hydrate('mojo',D.mojoTeams); D.customers.forEach(c=>{ P.hydrate&&P.hydrate(c.id,c.teams); P.hydrateOrg&&P.hydrateOrg(c.id,c); }); D.suppliers.forEach(s=>{ P.hydrateContacts&&P.hydrateContacts(s.id,s.contacts=s.contacts||[]); P.hydrateOrg&&P.hydrateOrg(s.id,s); }); }
  const ORGS=[{key:'mojo',name:'Mojo Promotions',type:'team',teams:()=>D.mojoTeams},...D.customers.map(c=>({key:c.id,name:c.name,type:'customer',org:c,teams:()=>c.teams})),...D.suppliers.map(s=>({key:s.id,name:s.name,type:'supplier',org:s,teams:()=>[{name:'Contacts',users:s.contacts}]}))];
  const TL={team:'Your team',customer:'Customer',supplier:'Supplier'};
  const rows=()=>{ const o=[]; ORGS.forEach(g=>g.teams().forEach(t=>(t.users||[]).forEach(u=>o.push({u,g,team:t.name})))); return o; };
  const st=u=>u.status==='deactivated'?'deactivated':u.status==='invited'?'invited':'active';
  const role=u=>P&&P.normRole?P.normRole(u.role):(u.role||'');
  const av=u=>P&&P.avHTML?P.avHTML(u):esc((u.n||'?').split(' ').map(w=>w[0]).join('').slice(0,2));
  const mark=g=>{ try{ if(g.type!=='team'&&window.MSLOGOS&&MSLOGOS.has(g.name)) return `<span class="du-om svg">${MSLOGOS.svg(g.name,28)}</span>`; }catch(e){} return `<span class="du-om t-${g.type}">${esc((g.org&&g.org.initials)||'MP')}</span>`; };
  const am=(g,u)=>g.type==='customer'&&window.MSAM?MSAM.getUser(g.key,u):null;
  const lastRank=v=>{ v=String(v||''); if(/online|now/i.test(v)) return 0; const m=v.match(/(\d+)\s*(m|h|d|w)/i); if(m) return +m[1]*({m:1,h:60,d:1440,w:10080}[m[2].toLowerCase()]); if(/today/i.test(v)) return 300; if(/yesterday/i.test(v)) return 1440; return 1e9; };
  // spend is per customer user: their own figure if we have it, otherwise their share of the customer's spend
  const num=v=>+(String(v||'').replace(/[^\d.]/g,''))||0, gbp=n=>'£'+Math.round(n).toLocaleString('en-GB');
  const hsh=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  function spend(r){ if(r.g.type!=='customer'||!r.g.org) return null; const c=r.g.org, tot=num(c.totalSpend), y=num(c.spend12), L=users(c).filter(u=>u.status!=='invited');
    if(r.u.status==='invited'||!L.length) return {all:0,y:0};
    // a recorded spend (including £0) always wins; only people with no figure get a share of what's left
    const has=u=>u.stats&&u.stats.spend!=null;
    if(has(r.u)){ const all=num(r.u.stats.spend); return {all,y:tot?Math.round(all*(y/tot)):0}; }
    const left=Math.max(0,tot-L.filter(has).reduce((a,u)=>a+num(u.stats.spend),0)), rest=L.filter(u=>!has(u)), w=u=>(hsh(u.n)%5)+1;
    const all=rest.length?Math.round(w(r.u)/rest.reduce((a,u)=>a+w(u),0)*left):0; return {all,y:tot?Math.round(all*(y/tot)):0}; }
  const users=c=>(c.teams||[]).flatMap(t=>t.users||[]);
  // when the person was added: joined date, or invite date for pending invites; org's "since" as fallback
  function created(r){ const u=r.u, v=u.createdAt||u.invitedAt||u.joined||(r.g.org&&r.g.org.since)||''; if(!v) return {t:'—',at:0};
    const d=/^\d{4}$/.test(v)?new Date(+v,0,1):/^[A-Za-z]{3} \d{4}$/.test(v)?new Date('1 '+v):new Date(v);
    if(isNaN(d)) return {t:String(v),at:0}; const exact=!!(u.createdAt||u.invitedAt);
    return {t:exact?d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):/^\d{4}$/.test(v)?v:d.toLocaleDateString('en-GB',{month:'short',year:'numeric'}),at:d.getTime()}; }
  const ufk=r=>'user:'+(r.g.type==='team'?'mojo':r.g.key)+':'+(String(r.u.email||'').trim().toLowerCase()||String(r.u.n||'').trim().toLowerCase());
  const uF=r=>window.MSFLAG&&MSFLAG.get(ufk(r),r.u.flag);
  const COLS=[['flag','',r=>{ const f=uF(r); return f?(f.level==='red'?2:1):0; }],['person','Person',r=>window.MSNAME?MSNAME.sortKey(r.u):(r.u.n||'').toLowerCase()],['org','Organisation',r=>r.g.name.toLowerCase()],['type','Type',r=>r.g.type],['team','Team',r=>r.team],['role','Role',r=>role(r.u)],['am','Account manager',r=>((am(r.g,r.u)||{}).n||'~')],['spend','All time spend',r=>(spend(r)||{all:-1}).all],['spend12','12 month spend',r=>(spend(r)||{y:-1}).y],['status','Status',r=>st(r.u)],['last','Last seen',r=>lastRank(r.u.last)],['created','Created',r=>created(r).at]];
  const S={tab:'people',q:'',f:{},k:'org',dir:1};

  function draw(){ if(!host) return; const all=rows(), c=k=>all.filter(r=>st(r.u)===k).length;
    host.innerHTML=`<!--tabs-->
      <div class="du-stats">${[['People',all.length],['Active',c('active')],['Invited',c('invited')],['Deactivated',c('deactivated')],['Organisations',ORGS.length]].map(([l,v])=>`<div><b>${v.toLocaleString('en-GB')}</b><span>${l}</span></div>`).join('')}</div>
      <div class="du-tabs"><button class="${S.tab==='people'?'on':''}" data-dt="people">People <i>${all.length}</i></button><button class="${S.tab==='audit'?'on':''}" data-dt="audit">Audit log</button></div>
      <div data-db></div>`;
    host.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.dt; draw(); });
    const body=host.querySelector('[data-db]'); S.tab==='audit'?drawAudit(body):drawPeople(body,all); }
  function drawPeople(body,all){ const f=S.f, q=S.q.toLowerCase(), col=COLS.find(c=>c[0]===S.k)||COLS[0];
    let L=all.filter(r=>(!f.type||r.g.type===f.type)&&(!f.org||r.g.key===f.org)&&(!f.role||role(r.u)===f.role)&&(!f.status||st(r.u)===f.status)&&(!f.am||(am(r.g,r.u)||{}).n===f.am)&&(f.flagged!=='on'||uF(r))&&(f.flagged!=='off'||!uF(r))&&(!(f.flagged==='amber'||f.flagged==='red')||(uF(r)||{}).level===f.flagged)
      &&(!q||((r.u.n||'')+' '+(r.u.email||'')+' '+r.g.name+' '+(r.u.title||'')).toLowerCase().includes(q)));
    L.sort((a,b)=>{ const x=col[2](a), y=col[2](b); return (x>y?1:x<y?-1:0)*S.dir||(window.MSNAME?MSNAME.sortKey(a.u).localeCompare(MSNAME.sortKey(b.u)):(a.u.n||'').localeCompare(b.u.n||'')); });
    const opt=(k,l,vals)=>`<select data-df="${k}" class="${f[k]?'on':''}"><option value="">${l}: all</option>${vals.map(([v,t])=>`<option value="${esc(v)}"${f[k]===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
    const ams=window.MSAM?MSAM.list().filter(m=>all.some(r=>(am(r.g,r.u)||{}).n===m.n)).map(m=>[m.n,m.n]):[];
    const can=['admin','distributor'].includes(window.MSID&&MSID.current?MSID.current():'distributor');
    body.innerHTML=`<div class="du-tools"><div class="du-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input data-dq value="${esc(S.q)}" placeholder="Search by name, email, organisation or job title"></div>
        ${opt('type','Type',Object.entries(TL))}${opt('org','Organisation',ORGS.map(g=>[g.key,g.name]))}${opt('role','Role',[...new Set(all.map(r=>role(r.u)))].sort().map(r=>[r,r]))}${opt('am','Account manager',ams)}${opt('status','Status',[['active','Active'],['invited','Invited'],['deactivated','Deactivated']])}${opt('flagged','Flag',[['on','Any flag'],['amber','Warning'],['red','Action needed'],['off','Not flagged']])}
        ${Object.values(f).some(Boolean)?'<button class="du-clear" data-dclear>Clear filters</button>':''}</div>
      <div class="du-wrap"><table class="du-tbl"><thead><tr>${COLS.map(([k,l])=>`<th data-ds="${k}"${k==='flag'?' title="Warning flag" class="du-fh"':''}>${k==='flag'?'<svg viewBox="0 0 24 24"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>':l}<span>${S.k===k?(S.dir>0?' ↑':' ↓'):''}</span></th>`).join('')}<th>Contact</th></tr></thead><tbody>
      ${L.length?L.map(r=>{ const i=all.indexOf(r), a=am(r.g,r.u), dead=st(r.u)==='deactivated';
        return `<tr data-du="${i}" class="${dead?'dead':''}"><td class="du-fc">${window.MSFLAG?MSFLAG.cell(ufk(r),r.u.n,r.u.flag):''}</td><td><div class="du-p"><span class="du-av">${av(r.u)}</span><span><b>${esc(r.u.n)}</b><em>${esc(r.u.email||r.u.title||'')}</em></span></div></td>
          <td>${r.g.type==='team'?`<div class="du-o">${mark(r.g)}<span>${esc(r.g.name)}</span></div>`:`<a href="#" class="du-o du-lk" data-dorg="${esc(r.g.key)}" title="Open ${esc(r.g.name)}">${mark(r.g)}<span>${esc(r.g.name)}</span></a>`}</td><td><span class="du-type t-${r.g.type}">${TL[r.g.type]}</span></td><td>${esc(r.team)}</td><td>${esc(role(r.u))}</td>
          <td>${a?`<a href="#" class="du-p sm du-lk" data-dam="${esc(a.n)}" title="Open ${esc(a.n)}"><span class="du-av s">${av(a)}</span><span><b>${esc(a.n)}</b></span></a>`:'<span class="du-mut">—</span>'}</td>
          ${(()=>{ const s=spend(r); return s?`<td class="du-n"><a href="Merchsmith Orders.html?customer=${encodeURIComponent(r.g.key)}&user=${encodeURIComponent(r.u.n)}" class="du-lk" data-dspend title="View ${esc(r.u.n)}’s orders"><b>${gbp(s.all)}</b></a></td><td class="du-n">${gbp(s.y)}</td>`:'<td class="du-n du-mut">—</td><td class="du-n du-mut">—</td>'; })()}
          <td><span class="du-st s-${st(r.u)}">${st(r.u)[0].toUpperCase()+st(r.u).slice(1)}</span></td><td>${esc(st(r.u)==='invited'?'—':r.u.last||'—')}</td><td>${esc(created(r).t)}</td>
          <td>${dead?'':`<div class="du-acts"><button data-dc="chat" title="Message ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/></svg></button>${r.u.email&&can?`<button data-dc="email" title="Email ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg></button>`:''}<button data-dc="meet" title="Book a meeting with ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></button>${can?`<button data-dc="call" title="Call ${esc(r.u.n)}"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg></button>`:''}</div>`}</td></tr>`; }).join('')
        :`<tr><td colspan="${COLS.length+1}"><div class="du-empty">No one matches.</div></td></tr>`}</tbody></table></div><p class="du-count">${L.length} of ${all.length} people</p>`;
    const qi=body.querySelector('[data-dq]'); qi.oninput=()=>{ S.q=qi.value; const p=qi.selectionStart; draw(); const n=host.querySelector('[data-dq]'); n.focus(); n.setSelectionRange(p,p); };
    body.querySelectorAll('[data-df]').forEach(s=>s.onchange=()=>{ S.f[s.dataset.df]=s.value; draw(); });
    const cl=body.querySelector('[data-dclear]'); if(cl) cl.onclick=()=>{ S.f={}; draw(); };
    body.querySelectorAll('[data-ds]').forEach(h=>h.onclick=()=>{ if(S.k===h.dataset.ds) S.dir*=-1; else { S.k=h.dataset.ds; S.dir=/spend|created/.test(h.dataset.ds)?-1:1; } draw(); });
    body.querySelectorAll('[data-dc]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); contact(b.dataset.dc,all[+b.closest('[data-du]').dataset.du]); });
    body.querySelectorAll('[data-dspend]').forEach(a=>a.onclick=e=>e.stopPropagation());
    body.querySelectorAll('[data-dam]').forEach(a=>a.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const r=all.find(x=>x.g.type==='team'&&x.u.n===a.dataset.dam)||rows().find(x=>x.u.n===a.dataset.dam); if(r) profile(r); });
    body.querySelectorAll('[data-dorg]').forEach(a=>a.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const id=a.dataset.dorg, kind=(ORGS.find(g=>g.key===id)||{}).type==='supplier'?'sup':'cust';
      if(window.MSORGTABLE){ const t=document.querySelector('[data-tab="'+(kind==='cust'?'customers':'suppliers')+'"]'); if(t) t.click(); setTimeout(()=>MSORGTABLE.open(kind,id),80); } else location.href='Merchsmith Organisations.html#org='+encodeURIComponent(id); });
    body.querySelectorAll('[data-du]').forEach(tr=>tr.onclick=()=>profile(all[+tr.dataset.du])); }
  function contact(k,r){ const m={name:r.u.n,email:r.u.email,title:r.u.title,orgName:r.g.name,orgType:r.g.type==='team'?'distributor':r.g.type}, M=window.MSChat, p=M&&M.resolve?M.resolve(m):null;
    if(k==='chat'){ if(M&&M.chatWith) M.chatWith(m); return; }
    if(k==='email'&&window.MSEMAIL) return MSEMAIL.compose({to:[{name:r.u.n,email:r.u.email,org:r.g.name}]});
    if(k==='meet'){ location.href='Merchsmith Calendar.html#tab=cal&with='+encodeURIComponent(p?p.id:''); return; }
    if(k==='call'&&window.MSCALLS){ if(p) MSCALLS.dial({pid:p.id}); else if(r.u.tel) MSCALLS.dial({number:r.u.tel}); } }
  // opens over the profile panel; after a save the panel refreshes, after cancel it's simply still there
  function edit(r,after){ if(!P||!P.userForm) return; const teams=r.g.teams(), peers=teams.flatMap(t=>t.users||[]);
    P.userForm({title:'Edit '+r.u.n+' · '+r.g.name,user:r.u,kind:r.g.type==='team'?'team':r.g.type==='customer'?'cust':'sup',orgType:r.g.type==='team'?'distributor':r.g.type,peers,orgKey:r.g.key,
      teamNames:teams.length>1?teams.map(t=>t.name):[],team:r.team,
      onSave:f=>{ P.saveUser(r.g.key,r.u,f); if(f.team&&f.team!==r.team){ const a=teams.find(t=>t.name===r.team), b=teams.find(t=>t.name===f.team); if(a&&b){ a.users.splice(a.users.indexOf(r.u),1); b.users.push(r.u); P.log&&P.log(r.g.key,r.u,'team',r.team+' → '+f.team); r.team=f.team; } }
        if(window.MSNOTES&&MSNOTES.log) MSNOTES.log(nkey(r),'edit','Details updated'+(f.role&&f.role!==r.u.role?' · role '+f.role:''));
        draw(); if(after) after(); },
      onStatus:to=>{ P.setStatus(r.g.key,r.u,to); if(window.MSNOTES&&MSNOTES.log) MSNOTES.log(nkey(r),'status','Status changed to '+to); draw(); if(after) after(); }}); }
  /* ----- profile drawer: stats + links ----- */
  function stats(r){ const u=r.u, s=u.stats||{}, h=hsh(u.n||''), c=r.g.org||{};
    if(r.g.type==='customer'&&r.g.org){ const sp=spend(r)||{all:0,y:0}, n=users(c).filter(x=>x.status!=='invited').length||1;
      const orders=s.orders!=null?s.orders:Math.max(0,Math.round((c.totalOrders||0)/n+(h%3)-1)), projects=s.projects!=null?s.projects:Math.max(0,Math.round((c.projects||0)/n+(h%2)));
      return [['Projects',projects],['Orders',orders],['All time spend',gbp(sp.all)],['12 month spend',gbp(sp.y)],['Approvals given',s.approvals!=null?s.approvals:(h%12)+2],['Average order',orders?gbp(sp.all/orders):'—']]; }
    if(r.g.type==='team') return [['Customer accounts',s.accounts!=null?s.accounts:(h%9)+2],['Projects',s.projects!=null?s.projects:(h%30)+5],['Quotes sent',s.quotes!=null?s.quotes:(h%60)+10],['Won',s.won||gbp(((h%40)+10)*10000)],['Open approvals',(h%6)],['Chats this week',(h%25)+3]];
    return [['Orders handled',Math.round((c.totalOrders||0)/Math.max(1,(c.contacts||[]).length))],['Spend through them',gbp(num(c.totalSpend)/Math.max(1,(c.contacts||[]).length))],['Products on feed',(c.products||0).toLocaleString('en-GB')],['Lead time',c.lead||'—'],['On-time delivery',c.service?c.service.deliveryMet+'%':'—'],['Avg response',c.service?c.service.responseSpeed:'—']]; }
  function links(r){ const t=r.g.type, first=(r.u.n||'').split(' ')[0];
    const L=t==='customer'?[['Their projects','Merchsmith Distributor Projects.html'],['Their orders','Merchsmith Orders.html'],['Invoices','Merchsmith Orders.html'],['Their organisation','Merchsmith Organisations.html#tab=customers'],['Emails to '+first,'Merchsmith Emails.html#tab=sent'],['Meetings','Merchsmith Calendar.html#tab=cal'],['Calls','Merchsmith Calls.html#tab=history']]
      :t==='team'?[['Projects they manage','Merchsmith Distributor Projects.html'],['Their customers','Merchsmith Organisations.html#tab=customers'],['Orders','Merchsmith Orders.html'],['Team page','Merchsmith Team.html'],['Their calendar','Merchsmith Calendar.html#tab=cal']]
      :[['Orders with '+r.g.name,'Merchsmith Orders.html'],['Their products','Merchsmith Store.html'],['Supplier details','Merchsmith Organisations.html#tab=suppliers'],['Lead-time settings','Merchsmith Distributor Settings.html#tab=leadtimes'],['Emails to '+first,'Merchsmith Emails.html#tab=sent']];
    return L; }
  function recent(r){ const t=r.g.type, h=hsh(r.u.n||''); const A=t==='customer'?['Approved the proof for Heavy Weight T-Shirt','Placed order MJ-10482','Commented on Autumn Giveaways','Requested a sample of the Navy Tote','Downloaded invoice INV-2291']
      :t==='team'?['Sent quote Q-1182 to Citrix','Uploaded a proof for Ceramic Mug 11oz','Booked Proof review with Sara','Moved Winter Welcome Packs to ordering','Replied to Leo Grant by email']
      :['Confirmed dispatch for PO-5521','Updated prices on Cotton Tote','Uploaded 12 products to the feed','Replied about November capacity'];
    return [0,1,2,3].map(i=>({t:A[(h+i)%A.length],d:['2h ago','Yesterday','3 days ago','Last week'][i]})); }
  // same key as the Organisations page profile, so notes written in either place show in both
  const nkey=r=>'user:'+(r.g.type==='team'?'mojo':r.g.key)+':'+(String(r.u.email||'').trim().toLowerCase()||String(r.u.n||'').trim().toLowerCase());
  function profile(r){ window.__duLast=r; let dr=document.getElementById('duDrawer'); if(!dr){ dr=document.createElement('div'); dr.id='duDrawer'; document.body.appendChild(dr); }
    const u=r.u, a=am(r.g,r.u), s=st(u), cr=created(r), dead=s==='deactivated', can=['admin','distributor'].includes(window.MSID&&MSID.current?MSID.current():'distributor');
    dr.className='du-drawer on'; document.body.classList.add('du-open'); dr.innerHTML=`<div class="du-scrim" data-dx></div><aside class="du-dp" role="dialog" aria-label="${esc(u.n)}">
      <div class="du-dh"><span class="du-av xl">${av(u)}</span><div><b>${esc(u.n)}</b><span>${esc(u.title||role(u))}</span><div class="du-tags">${r.x?(r.ms?'<span class="du-type t-team">Merchsmith</span>':'<span class="du-st s-deactivated">Not in directory</span>'):`<span class="du-type t-${r.g.type}">${TL[r.g.type]}</span><span class="du-st s-${s}">${s[0].toUpperCase()+s.slice(1)}</span>`}</div></div><button class="du-x" data-dx aria-label="Close">×</button></div>
      ${!r.x&&window.MSFLAG?(()=>{ const f=uF(r); return `<div class="du-flag${f?' on l-'+f.level:''}">${f?`<b>${MSFLAG.LV[f.level]}</b><span>${esc(f.note||'')}</span>`:'<span>No warning flag</span>'}<button class="du-link" data-flag="${esc(ufk(r))}" data-flabel="${esc(u.n)}">${f?'Edit flag':'Add flag'}</button></div>`; })():''}
      ${r.x?'':`<div class="du-org">${mark(r.g)}<span><b>${esc(r.g.name)}</b><i>${esc([r.team,role(u)].filter(x=>x&&x!=='—').join(' · '))}</i></span></div>`}
      <div class="du-ci">${u.email?`<a href="mailto:${esc(u.email)}">${esc(u.email)}</a>`:''}${u.tel?`<a href="tel:${esc(u.tel.replace(/\s/g,''))}">${esc(u.tel)}</a>`:''}${r.x?'':`<span>Last seen ${esc(s==='invited'?'never':u.last||'—')} · created ${esc(cr.t)}</span>`}</div>
      ${dead?'':`<div class="du-bar"><button class="du-btn ghost" data-pc="chat">Message</button>${u.email&&can?'<button class="du-btn ghost" data-pc="email">Email</button>':''}<button class="du-btn ghost" data-pc="meet">Book a meeting</button>${can?'<button class="du-btn ghost" data-pc="call">Call</button>':''}</div>`}
      ${r.x?'':`<h5>At a glance</h5><div class="du-kpis">${stats(r).map(([l,v])=>`<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
      ${a?`<h5>Account manager</h5><div class="du-org">${'<span class="du-av">'+av(a)+'</span>'}<span><b>${esc(a.n)}</b><i>${esc(a.title||'Account Manager')} · Mojo Promotions</i></span><button class="du-link" data-pam>Change</button></div>`:''}
      <h5>Go to</h5><div class="du-links">${links(r).map(([l,h])=>`<a href="${esc(h)}">${esc(l)}<span>›</span></a>`).join('')}</div>
      <h5>Recent activity</h5><div class="du-act">${recent(r).map(x=>`<div><span>${esc(x.t)}</span><i>${esc(x.d)}</i></div>`).join('')}</div>`}
      ${window.MSNOTES?`<div class="du-notes" data-duk="${esc(nkey(r))}">${MSNOTES.panelHTML(nkey(r))}</div>`:''}
      ${r.x?(r.ms?'<p class="du-note">Merchsmith platform team. Message them any time for help with the platform.</p>':'<p class="du-note">Not in your directory yet. Add them from Organisations or Team to see their full details.</p>'):'<div class="du-foot"><button class="du-btn ghost" data-pedit>Edit details, role &amp; status</button></div>'}</aside>`;
    const close=()=>{ dr.className='du-drawer'; dr.innerHTML=''; document.body.classList.remove('du-open'); const cp=document.querySelector('.chat-panel.on'); if(cp) cp.classList.remove('on'); };
    dr.querySelectorAll('[data-dx]').forEach(b=>b.onclick=close);
    // chat opens over the panel (body.du-open lifts it) and closing it leaves this profile where it was, like Email
    dr.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>contact(b.dataset.pc,r));
    const nt=dr.querySelector('[data-duk]'); if(nt&&window.MSNOTES) MSNOTES.wire(nt,nt.dataset.duk);
    const pa=dr.querySelector('[data-pam]'); if(pa) pa.onclick=()=>MSAM.pick(r.g.key,a2=>{ if(window.MSNOTES&&MSNOTES.log&&a2) MSNOTES.log(nkey(r),'edit','Account manager changed to '+a2.n); draw(); profile(r); },r.u);
    const pe=dr.querySelector('[data-pedit]'); if(pe) pe.onclick=()=>edit(r,()=>{ if(dr.classList.contains('on')) profile(r); });
    const esc2=e=>{ if(e.key==='Escape'){ close(); document.removeEventListener('keydown',esc2); } }; document.addEventListener('keydown',esc2); }

  function drawAudit(body){ const keys=new Set(ORGS.map(g=>g.key)), L=(P&&P.audit?P.audit():[]).filter(e=>keys.has(e.org)).slice(0,150);
    body.innerHTML=`<div class="du-log">${L.length?L.map(e=>{ const g=ORGS.find(x=>x.key===e.org); return `<div class="du-lr"><span class="du-lt">${new Date(e.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span><span><b>${esc(e.actor)}</b> · ${esc((P.LBL&&P.LBL[e.action])||e.action)}${e.user?` · <b>${esc(e.user)}</b>`:''}${e.detail?` <i>${esc(e.detail)}</i>`:''}</span><span class="du-lo">${esc(g?g.name:e.org)}</span></div>`; }).join('')
      :'<div class="du-empty">Nothing yet. Invites, edits, role changes and deactivations for your team, customers and suppliers are logged here.</div>'}</div>`; }

  const css=`
  .du-tabs{display:inline-flex;gap:2px;background:var(--paper-2);border-radius:999px;padding:3px;margin:22px 0 12px;} .du-tabs button{font:inherit;font-size:13px;font-weight:800;color:var(--ink-3);background:none;border:0;border-radius:999px;padding:8px 16px;cursor:pointer;white-space:nowrap;} .du-tabs button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);} .du-tabs i{font-style:normal;font-size:10.5px;background:var(--periwinkle-deep);color:#fff;border-radius:999px;padding:1px 7px;margin-left:4px;}
  .du-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:22px 0 4px;} @media(max-width:900px){.du-stats{grid-template-columns:repeat(3,minmax(0,1fr));}}
  .du-stats>div{background:#fff;border:1px solid var(--line-soft);border-top:3px solid var(--periwinkle-deep);border-radius:14px;padding:14px 16px;} .du-stats>div:nth-child(2){border-top-color:var(--spearmint);} .du-stats>div:nth-child(3){border-top-color:var(--sky);} .du-stats>div:nth-child(4){border-top-color:var(--blossom);} .du-stats>div:nth-child(5){border-top-color:var(--sprout,#9FD792);}
  .du-stats b{display:block;font-family:var(--serif);font-weight:500;font-size:28px;line-height:1.1;color:var(--ink);} .du-stats span{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
  .du-sum{display:flex;gap:6px 18px;flex-wrap:wrap;font-size:13px;color:var(--ink-3);margin:0 0 14px;} .du-sum b{color:var(--ink);font-size:14px;}
  .du-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;} .du-search{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--line-soft);border-radius:11px;padding:8px 12px;flex:1 1 300px;} .du-search svg{width:17px;height:17px;fill:none;stroke:var(--ink-3);stroke-width:1.8;stroke-linecap:round;} .du-search input{border:0;background:none;font:inherit;font-size:13.5px;width:100%;} .du-search input:focus{outline:0;}
  .du-tools select{font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:7px 12px;cursor:pointer;} .du-tools select.on{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);background:var(--tint-peri);} .du-clear{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;}
  .du-wrap{overflow-x:auto;background:#fff;border:1px solid var(--line-soft);border-radius:16px;} .du-tbl{width:100%;min-width:1380px;border-collapse:collapse;font-size:13px;}
  .du-tbl th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:12px;border-bottom:1px solid var(--line-soft);white-space:nowrap;cursor:pointer;user-select:none;} .du-tbl th:last-child{cursor:default;} .du-tbl th span{color:var(--periwinkle-deep);}
  .du-tbl td{padding:10px 12px;border-bottom:1px solid var(--paper-2);white-space:nowrap;color:var(--ink-2);vertical-align:middle;} .du-tbl tbody tr{cursor:pointer;} .du-tbl tbody tr:hover td{background:var(--paper);} .du-tbl tbody tr:last-child td{border-bottom:0;} .du-tbl tr.dead td{opacity:.55;}
  .du-p{display:flex;align-items:center;gap:10px;} .du-p>span:last-child{display:flex;flex-direction:column;} .du-p b{font-size:13.5px;color:var(--ink);} .du-p em{font-style:normal;font-size:12px;color:var(--muted);} .du-p.sm b{font-size:12.5px;font-weight:700;}
  .du-av{width:32px;height:32px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--periwinkle);color:#fff;font-size:11px;font-weight:800;} .du-av.s{width:24px;height:24px;font-size:9.5px;} .du-av img{width:100%;height:100%;object-fit:cover;} .du-av>*{width:100%;height:100%;}
  .du-o{display:flex;align-items:center;gap:9px;} .du-om{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:#fff;font-size:10px;font-weight:800;flex:none;overflow:hidden;} .du-om svg{width:28px;height:28px;} .du-om.t-team{background:var(--periwinkle-deep);} .du-om.t-customer{background:var(--spearmint);} .du-om.t-supplier{background:#8246af;}
  .du-type{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:3px 9px;} .du-type.t-team{background:var(--tint-peri);color:var(--periwinkle-ink);} .du-type.t-customer{background:color-mix(in srgb,var(--spearmint) 32%,#fff);color:var(--ink);} .du-type.t-supplier{background:color-mix(in srgb,var(--blossom) 55%,#fff);color:var(--ink);}
  .du-st{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:3px 9px;} .du-st.s-active{background:var(--tint-green);color:var(--green-deep);} .du-st.s-invited{background:#fbeccd;color:#8a5a12;} .du-st.s-deactivated{background:var(--paper-2);color:var(--ink-3);}
  .du-acts{display:flex;gap:4px;} .du-acts button{width:30px;height:30px;border-radius:9px;border:1px solid var(--line-soft);background:#fff;color:var(--ink-3);display:grid;place-items:center;cursor:pointer;} .du-acts button:hover{color:var(--periwinkle-deep);border-color:var(--periwinkle);background:var(--tint-peri);} .du-acts svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  .du-mut{color:var(--muted);} .du-n{text-align:right;font-variant-numeric:tabular-nums;} .du-tbl th[data-ds^=spend]{text-align:right;} .du-n b{color:var(--ink);} .du-empty{padding:30px;text-align:center;color:var(--muted);font-size:13.5px;} .du-count{font-size:12px;color:var(--muted);margin:8px 2px 0;}
  .du-drawer{position:fixed;inset:0;z-index:410;display:none;} .du-drawer.on{display:block;} .du-scrim{position:absolute;inset:0;background:rgba(20,22,45,.28);}
  .du-dp{position:absolute;top:0;right:0;bottom:0;width:min(500px,100%);background:#fff;overflow:auto;padding:22px 24px 30px;box-shadow:-12px 0 40px rgba(20,22,45,.18);}
  .du-dh{display:flex;gap:14px;align-items:flex-start;} .du-dh>div{flex:1;display:flex;flex-direction:column;gap:3px;} .du-dh b{font-family:var(--serif);font-weight:500;font-size:24px;line-height:1.15;} .du-dh>div>span{font-size:13px;color:var(--text-soft);} .du-tags{display:flex;gap:6px;margin-top:4px;}
  .du-av.xl{width:60px;height:60px;font-size:18px;} .du-x{border:0;background:none;font-size:26px;color:var(--muted);cursor:pointer;}
  .du-org{display:flex;align-items:center;gap:10px;margin-top:14px;padding:10px 12px;background:var(--paper);border-radius:12px;} .du-org>span:nth-child(2){flex:1;display:flex;flex-direction:column;} .du-org b{font-size:13.5px;} .du-org i{font-style:normal;font-size:12px;color:var(--muted);}
  .du-ci{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:12px;font-size:13px;} .du-ci a{font-weight:700;color:var(--periwinkle-deep);text-decoration:none;white-space:nowrap;} .du-ci span{flex-basis:100%;font-size:12px;color:var(--muted);}
  .du-bar{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;} .du-btn{font:inherit;font-size:13px;font-weight:700;background:var(--periwinkle-deep);color:#fff;border:0;border-radius:10px;padding:9px 14px;cursor:pointer;white-space:nowrap;} .du-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line-soft);}
  .du-btn{transition:background .15s,border-color .15s,color .15s,transform .15s,box-shadow .15s;} .du-btn.ghost:hover,.du-btn.ghost:focus-visible{border-color:var(--periwinkle-deep);background:var(--tint-peri);color:var(--periwinkle-deep);transform:translateY(-1px);box-shadow:0 3px 10px rgba(20,22,45,.08);} .du-btn.ghost:active{transform:none;box-shadow:none;}
  .du-dp h5{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:22px 0 8px;}
  .du-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;} .du-kpis>div{border:1px solid var(--line-soft);border-radius:12px;padding:10px 12px;} .du-kpis b{display:block;font-family:var(--serif);font-weight:500;font-size:20px;line-height:1.2;} .du-kpis span{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);}
  .du-links{display:grid;grid-template-columns:1fr 1fr;gap:6px;} .du-links a{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid var(--line-soft);border-radius:10px;padding:9px 12px;font-size:13px;font-weight:700;color:var(--ink);text-decoration:none;} .du-links a:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);} .du-links span{color:var(--muted);}
  .du-act>div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--paper-2);font-size:13px;} .du-act>div:first-child{border-top:0;} .du-act i{font-style:normal;font-size:12px;color:var(--muted);white-space:nowrap;}
  .du-link{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;}
  body.du-open .chat-panel,body.du-open .chat-fab{z-index:430;}
  .du-fc{width:36px;padding-right:0!important;} .du-fh svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;vertical-align:-2px;}
  .du-flag{display:flex;align-items:center;gap:10px;margin-top:14px;padding:9px 12px;border-radius:12px;background:var(--paper);font-size:13px;color:var(--muted);} .du-flag span{flex:1;} .du-flag.l-amber{background:#fbeccd;color:#6b4a10;} .du-flag.l-red{background:var(--tint-red);color:#8f1c24;} .du-flag b{white-space:nowrap;}
  a.du-lk{text-decoration:none;color:inherit;cursor:pointer;border-radius:8px;} a.du-lk:hover b,a.du-lk:hover>span:last-child{color:var(--periwinkle-deep);text-decoration:underline;}
  .du-notes{margin-top:22px;padding-top:4px;border-top:1px solid var(--paper-2);}
  .du-note{margin:22px 0 0;padding:12px 14px;border-radius:12px;background:var(--paper);font-size:13px;color:var(--text-soft);}
  .du-foot{margin-top:22px;padding-top:14px;border-top:1px solid var(--paper-2);}
  .du-log{background:#fff;border:1px solid var(--line-soft);border-radius:14px;} .du-lr{display:grid;grid-template-columns:130px minmax(0,1fr) 180px;gap:12px;padding:11px 16px;border-bottom:1px solid var(--paper-2);font-size:13px;} .du-lr:last-child{border-bottom:0;} .du-lt,.du-lo{font-size:12px;font-weight:700;color:var(--ink-3);} .du-lo{text-align:right;} .du-lr i{font-style:normal;color:var(--ink-3);}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  const norm=s=>String(s||'').trim().toLowerCase();
  function find(q){ q=typeof q==='string'?{name:q}:(q||{}); const n=norm(q.name), e=norm(q.email), o=norm(q.org); const L=rows();
    const hit=L.find(r=>e&&norm(r.u.email)===e)||L.find(r=>norm(r.u.n)===n&&(!o||norm(r.g.name)===o))||L.find(r=>norm(r.u.n)===n); if(hit) return hit;
    // short forms used on older pages: "Jess D." / "Jess D" / "Jess" — first name + last initial, own team first
    const m=n.match(/^([a-z'’-]+)(?:\s+([a-z])\.?)?$/i); if(!m) return null; const [,f,li]=m;
    const c=L.filter(r=>{ const p=norm(r.u.n).split(/\s+/); return p[0]===f&&(!li||(p[p.length-1]||'')[0]===li); });
    return c.find(r=>r.g.type==='team')||c.find(r=>!o||norm(r.g.name)===o)||c[0]||null; }
  // someone we can't find (e.g. a sample collaborator): still open a basic profile rather than nothing
  function stub(q){ q=typeof q==='string'?{name:q}:(q||{}); let nm=String(q.name||'').trim();
    // Merchsmith staff and anyone else in the chat roster: use what the roster knows
    const C=window.MSChat&&MSChat.contacts?[...(MSChat.me?[MSChat.me()]:[]),...MSChat.contacts()]:[]; const cp=C.find(p=>p&&norm(p.name)===norm(nm));
    if(cp){ const on=MSChat.orgOf?((MSChat.orgOf(cp)||{}).name||''):''; nm=cp.name; q=Object.assign({},q,{title:q.title||cp.title,org:q.org||on,ms:/merchsmith/i.test(on)}); } return {x:true,ms:!!q.ms,u:{n:nm,email:q.email||'',title:q.title||'',status:'active',last:'—'},g:{key:'x-'+norm(nm).replace(/\W+/g,'-'),name:q.org||'Mojo Promotions',type:q.org&&!/mojo/i.test(q.org)?'customer':'team',teams:()=>[],org:null},team:'—'}; }
  window.MSUSER={ find, open:q=>{ const r=find(q)||stub(q); if(!r.u.n) return false; profile(r); return true; }, openRow:profile };
  if(host){ draw(); window.addEventListener('ms-am-change',draw); }
  window.addEventListener('ms-flag-change',()=>{ draw(); const dr=document.getElementById('duDrawer'); if(dr&&dr.classList.contains('on')&&window.__duLast) profile(window.__duLast); });
})();
