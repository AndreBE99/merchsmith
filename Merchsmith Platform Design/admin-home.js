/* admin-home.js — Merchsmith platform admin: sidebar nav, overview dashboard,
   subscriptions, team, and the invite-organisation modal.
   Complements admin-page.js (login, directory tables, drawer, ghost). */
(function(){
  const A = window.ADMIN;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();

  /* ---------- sidebar nav ---------- */
  function go(nav){
    document.querySelectorAll('.anav').forEach(b=>b.classList.toggle('active',b.dataset.nav===nav));
    document.querySelectorAll('.appmain .panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+nav));
    window.scrollTo({top:0,behavior:'instant'});
  }
  document.addEventListener('click',e=>{
    const n=e.target.closest('[data-nav]'); if(n){ go(n.dataset.nav); return; }
  });
  // deep link from the default store's rail: Merchsmith Admin.html#nav=products
  { const m=location.hash.match(/nav=([\w-]+)/);
    if(m){ const t=m[1]; const tryGo=()=>{ if(document.getElementById('panel-'+t)) go(t); };
      tryGo(); setTimeout(tryGo,600);
      const app=document.getElementById('app');
      if(app&&window.MutationObserver){ const mo=new MutationObserver(()=>{ if(app.classList.contains('on')){ tryGo(); mo.disconnect(); } }); mo.observe(app,{attributes:true,attributeFilter:['class']}); } } }

  /* ---------- overview extras ---------- */
  function renderOverview(){
    // nav counts
    const nd=document.getElementById('navDist'), ns=document.getElementById('navSup');
    if(nd) nd.textContent=A.distributors.length; if(ns) ns.textContent=A.suppliers.length;
    // MRR chart: last 12 months, £ axis on the left, month labels underneath
    const data=(A.mrrSeries||[]).slice(); const w=600,h=180;
    const cur=A.distributors.reduce((s,d)=>s+A.seatInfo(d).total,0); if(data.length) data[data.length-1]=cur;
    const top=Math.max(1000,Math.ceil(Math.max(...data)*1.1/1000)*1000), ticks=[0,.25,.5,.75,1].map(f=>Math.round(top*f));
    const xs=i=>(i+.5)*(w/data.length), ys=v=>h-(v/top)*h;
    const pts=data.map((v,i)=>[xs(i),ys(v)]);
    const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const area=`M${pts[0][0].toFixed(1)} ${h} `+pts.map(p=>'L'+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+` L${pts[pts.length-1][0].toFixed(1)} ${h} Z`;
    const now=new Date(), months=data.map((_,i)=>{ const d=new Date(now.getFullYear(),now.getMonth()-(data.length-1-i),1); return d.toLocaleDateString('en-GB',{month:'short'}).slice(0,3)+(d.getMonth()===0||i===0?' ’'+String(d.getFullYear()).slice(2):''); });
    const fmtK=v=>v>=1000?'£'+(v/1000).toFixed(v%1000?1:0)+'k':'£'+v;
    const sp=document.getElementById('mrrSpark');
    if(sp) sp.innerHTML=`<div class="mrrc">
      <div class="mrrc-y">${ticks.slice().reverse().map(t=>`<span>${fmtK(t)}</span>`).join('')}</div>
      <div class="mrrc-plot">
        ${ticks.map(t=>`<i class="mrrc-grid" style="bottom:${t/top*100}%"></i>`).join('')}
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sparkgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--spearmint)" stop-opacity=".28"/><stop offset="1" stop-color="var(--spearmint)" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#sparkgrad)"/><path d="${line}" fill="none" stroke="var(--spearmint)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
        ${data.map((v,i)=>`<b class="mrrc-pt${i===data.length-1?' last':''}" style="left:${(i+.5)/data.length*100}%;bottom:${v/top*100}%"><em><small>${months[i]}</small>£${v.toLocaleString('en-GB')}</em></b>`).join('')}
      </div>
      <div></div>
      <div class="mrrc-x">${months.map(m=>`<span>${m.split(' ')[0]}</span>`).join('')}</div>
    </div>`;
    const growth=data[0]?Math.round(((data[data.length-1]-data[0])/data[0])*100):0;
    const tr=document.getElementById('mrrTrend'); if(tr) tr.textContent=(growth>=0?'▲ ':'▼ ')+Math.abs(growth)+'% over 12 months';
    const ms=document.getElementById('mrrSplit');
    if(ms) ms.innerHTML=`Currently <b>${A.stats.mrr}</b> — ${A.stats.seatOverage} of it billed seat overage.`;
    // attention
    const attn=A.distributors.filter(d=>d.flag).map(d=>{
      const lv=d.flag.level, cls=lv==='red'?'ai-red':lv==='amber'?'ai-amber':'ai-grey';
      return `<div class="attn-row" data-view="${d.id}"><span class="attn-ic ${cls}"><svg class="icn"><use href="#a-flag"/></svg></span><div><b>${esc(d.name)}</b><span>${esc(d.flag.note)}</span></div></div>`;
    }).join('');
    const al=document.getElementById('attnList'); if(al) al.innerHTML=attn||'<div class="attn-empty"><img src="assets/merchsmith-outline-art.svg" alt=""><p><b>All clear.</b>Nothing across the platform needs your attention today.</p></div>';
    // activity feed
    const fl=document.getElementById('actFeed');
    if(fl) fl.innerHTML=(A.activity||[]).map(a=>`<div class="feed-row"><span class="feed-dot fd-${a.kind}"></span><div><b>${esc(a.who)}</b> <span class="ft">${esc(a.txt)}</span></div><span class="fw">${esc(a.when)}</span></div>`).join('');
    // plan mix
    const total=A.distributors.length;
    const pm=document.getElementById('planMix');
    if(pm) pm.innerHTML=(A.plans||[]).map(p=>{ const pct=Math.round((p.count/total)*100); return `<div class="pm-row"><div class="pm-top"><span>${p.name}</span><span>${p.count} · ${pct}%</span></div><div class="pm-bar"><i style="width:${pct}%;background:${p.color}"></i></div></div>`; }).join('');
  }

  /* "6 / 8 seats" with a fill bar — red once the allowance is exceeded */
  function seatCell(s){
    const pct=Math.min(100,Math.round(s.used/Math.max(1,s.included)*100));
    return `<span class="seatcell" title="${s.used} billable distributor seat${s.used===1?'':'s'} of ${s.included} included on ${s.plan.name}${s.extra?` · ${s.extra} extra at ${s.rateTxt}/seat`:''}">
      <span class="seatbar ${s.extra?'over':''}"><i style="width:${pct}%"></i></span>
      <span class="seatnum ${s.extra?'over':''}">${s.used} / ${s.included}</span></span>`;
  }
  window.__seatCell=seatCell;

  /* ---------- subscriptions ---------- */
  function renderSubs(){
    // Cards carry ONLY what differs between tiers: base price, included seats, per-seat
    // overage. Everything else is identical and lives in the shared panel below.
    const g=document.getElementById('plansGrid');
    if(g) g.innerHTML=(A.plans||[]).map(p=>`
      <div class="plan-card pl-${p.id} ${p.popular?'pop':''}">
        ${p.popular?'<span class="plan-pop">Most popular</span>':''}
        <div class="plan-name">${p.name}</div>
        <div class="plan-tag">${esc(p.tagline)}</div>
        <div class="plan-price">£${p.base.toLocaleString('en-GB')}<span>/mo base</span></div>
        <span class="plan-ct">${p.count} distributor${p.count===1?'':'s'}</span>
        <div class="plan-seats"><b>${p.seats} seats</b><span>Included</span></div>
        <div class="plan-over"><b>£${p.overage}</b><span>per additional seat / month</span></div>
      </div>`).join('');
    const inc=document.getElementById('planIncl');
    if(inc) inc.innerHTML=`<div class="ovcard-h"><h3>Included on every plan</h3></div>
      <p class="incl-note">Nothing below is gated by tier — Starter gets exactly the same platform as Scale. A <b>seat</b> is a billable distributor user: ${(A.seatRoles||[]).join(', ')}. <b>Customer users and supplier users are never billed and never count as seats</b>, on any plan.</p>
      <ul class="incl-grid">${(A.planIncludes||[]).map(f=>`<li>${f}</li>`).join('')}</ul>`;
    const sr=document.getElementById('subRows');
    if(sr) sr.innerHTML=A.distributors.map(d=>{ const s=A.seatInfo(d);
      return `<tr data-dist="${d.id}">
        <td><div class="orgcell"><div class="orglogo dist" style="width:32px;height:32px;font-size:12px">${d.initials}</div><b>${esc(d.name)}</b></div></td>
        <td>${d.plan?`<span class="plan pl-${String(d.plan).toLowerCase()}">${d.plan}</span>`:'<span style="font-size:12px;color:var(--muted)">Not chosen</span>'}</td>
        <td>${seatCell(s)}</td>
        <td class="scell">${s.baseTxt}</td>
        <td>${s.extra?`<span class="overcell">+${s.overageTxt}</span>`:'<span class="overcell none">—</span>'}</td>
        <td class="scell"><b>${s.totalTxt}</b></td>
        <td><span class="stbadge st-${d.status}">${({active:'Active',past_due:'Past due',suspended:'Suspended'})[d.status]}</span></td>
        <td><div class="rowact"><button class="iconbtn" data-plan="${d.id}">Change plan</button></div></td>
      </tr>`; }).join('');
    const st=document.getElementById('subTot');
    if(st) st.textContent=`${A.stats.mrr} MRR · ${A.stats.seatOverage} of that from seat overage`;
  }
  document.addEventListener('click',e=>{
    const pb=e.target.closest('[data-plan]'); if(pb){ e.stopPropagation(); const d=A.distributors.find(x=>x.id===pb.dataset.plan); if(d) planModal(d); }
  });
  function planModal(d){
    const m=modal(`<div class="fm-head"><h3>Change plan</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <p style="font-size:13.5px;color:var(--text-soft);margin:0">${esc(d.name)} is on the <b>${d.plan}</b> plan — ${A.seatInfo(d).totalTxt}/mo.</p>
        <label class="fm-f"><span>New plan</span><select id="npPlan">${A.plans.map(p=>{
          const ex=Math.max(0,(d.seats==null?d.users:d.seats)-p.seats);
          return `<option value="${p.name}" ${p.name===d.plan?'selected':''}>${p.name} · £${p.base.toLocaleString('en-GB')}/mo · ${p.seats} seats${ex?` · +${ex}×£${p.overage}`:''}</option>`; }).join('')}</select></label>
        <p style="font-size:12.5px;color:var(--ink-3);margin:10px 0 0">${esc(d.name)} uses <b>${(d.seats==null?d.users:d.seats)}</b> billable distributor seats. Every plan includes the full platform — only the base price, seat allowance and overage rate change.</p>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="npSave">Update plan</button></div>`);
    m.root.querySelector('#npSave').onclick=()=>{ const v=m.root.querySelector('#npPlan').value;
      d.plan=v; A.recalc();                               // MRR = base + overage on the new tier
      renderSubs(); renderOverview(); if(window.__adminRender) window.__adminRender();
      m.close(); const s=A.seatInfo(d);
      toast(d.name+' moved to '+v+(s.extra?` · ${s.extra} seat${s.extra===1?'':'s'} over, ${s.totalTxt}/mo`:` · ${s.totalTxt}/mo`)); };
  }

  /* ---------- team (Merchsmith operators — shared people store) ---------- */
  const PP=window.MSPEOPLE;
  if(PP&&A.team) PP.hydrateContacts('merchsmith',A.team);
  /* ---------- platform team (Merchsmith operators) ---------- */
  const TM={q:'',role:'',st:''};
  const TMROLE={Owner:'Full control, including billing and who else is an Owner',Admin:'Runs the platform: orgs, users, catalogue, recommended range',Support:'Helps distributors and customers; can edit their users and ghost with consent',Billing:'Subscriptions, invoices and payment issues'};
  const meName=()=>((window.MSID&&MSID.get&&MSID.get())||{}).who||'Morgan Slade';
  const owners=()=>(A.team||[]).filter(x=>x.role==='Owner'&&x.status!=='deactivated');
  const isLastOwner=u=>u.role==='Owner'&&owners().length<=1;
  function tmEdit(u){ if(!PP) return;
    PP.userForm({ title:'Edit '+u.n, user:u, kind:'team', orgType:'merchsmith', orgKey:'merchsmith', peers:A.team, self:u.n===meName(), lockRole:u.n===meName()&&u.role!=='Owner',
      onSave:f=>{ if(f.role&&f.role!=='Owner'&&isLastOwner(u)){ delete f.role; PP.toast('The platform needs at least one Owner'); }
        PP.saveUser('merchsmith',u,f); renderTeam(); },
      onStatus:to=>tmStatus(u,to),
      onResend:()=>{ PP.saveUser('merchsmith',u,{invitedAt:new Date().toISOString()}); PP.log('merchsmith',u,'invited','Invitation resent'); renderTeam(); },
      onRevoke:()=>tmStatus(u,'deactivated') }); }
  function tmStatus(u,to){ if(!PP) return;
    if(to==='deactivated'&&isLastOwner(u)){ PP.toast('The platform needs at least one Owner'); return; }
    if(to==='deactivated'&&u.n===meName()){ PP.toast('You can’t deactivate yourself'); return; }
    PP.setStatus('merchsmith',u,to); renderTeam(); }
  function renderTeam(){
    const host=document.getElementById('teamGrid'); if(!host) return;
    const T=A.team||[], st=u=>u.status==='deactivated'?'deactivated':u.status==='invited'?'invited':'active';
    const cnt={active:T.filter(u=>st(u)==='active').length,invited:T.filter(u=>st(u)==='invited').length,deactivated:T.filter(u=>st(u)==='deactivated').length};
    const roles=(PP&&PP.ROLES&&PP.ROLES.merchsmith)||['Owner','Admin','Support','Billing'];
    const rows=T.map((u,i)=>({u,i})).filter(({u})=>(!TM.role||u.role===TM.role)&&(!TM.st||st(u)===TM.st)&&(u.n+' '+(u.email||'')+' '+(u.title||'')).toLowerCase().includes(TM.q.toLowerCase()))
      .sort((x,y)=>{ const o={active:0,invited:1,deactivated:2}; return o[st(x.u)]-o[st(y.u)]||roles.indexOf(x.u.role)-roles.indexOf(y.u.role)||x.u.n.localeCompare(y.u.n); });
    const perms=(PP&&PP.PERMS&&PP.PERMS.merchsmith)||{}, acts=(PP&&PP.ACTIONS||[]).filter(([k])=>perms[k]);
    const log=PP&&PP.audit?PP.audit({org:'merchsmith'}).slice(0,8):[];
    const ago=iso=>{ const m=Math.round((Date.now()-new Date(iso))/6e4); return m<1?'just now':m<60?m+'m ago':m<1440?Math.round(m/60)+'h ago':Math.round(m/1440)+'d ago'; };
    host.className='';
    host.innerHTML=`
      <div class="tm-stats">
        <div><b>${cnt.active}</b><span>Active</span></div><div><b>${cnt.invited}</b><span>Invited</span></div>
        <div><b>${owners().length}</b><span>Owner${owners().length===1?'':'s'}</span></div><div><b>${cnt.deactivated}</b><span>Deactivated</span></div></div>
      <div class="toolbar">
        <div class="search"><svg class="icn"><use href="#a-search"/></svg><input id="tmSearch" placeholder="Search by name, email or job title…" value="${esc(TM.q)}"></div>
        <div class="fbtns" id="tmRoles"><button class="fbtn${TM.role?'':' on'}" data-tr="">All <span class="ct">${T.length}</span></button>${roles.map(r=>`<button class="fbtn${TM.role===r?' on':''}" data-tr="${r}">${r}</button>`).join('')}</div>
      </div>
      <div class="dfilters"><select id="tmSt" class="${TM.st?'on':''}"><option value="">Status: all</option>${['active','invited','deactivated'].map(s=>`<option value="${s}"${TM.st===s?' selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select>
        ${TM.q||TM.role||TM.st?'<button class="dfclear" id="tmClear">Clear filters</button>':''}</div>
      <div class="tblscroll"><table class="dirtable"><thead><tr><th>Member</th><th>Role</th><th>Job title</th><th>Last active</th><th>2-step</th><th>Status</th><th></th></tr></thead><tbody>
        ${rows.length?rows.map(({u,i})=>`<tr data-tmrow="${i}" class="${st(u)==='deactivated'?'u-deact':''}" style="cursor:pointer">
          <td><div style="display:flex;align-items:center;gap:12px"><span class="tm-av">${PP?PP.avHTML(u,36):av(u.n)}</span><div class="dsub" style="min-width:0;white-space:nowrap"><b style="display:block;font-size:14px;color:var(--ink);font-weight:700">${esc(u.n)}${u.n===meName()?' <i class="tm-you">You</i>':''}</b>${esc(u.email||'')}</div></div></td>
          <td><span class="tm-role r-${esc((u.role||'').toLowerCase())}" title="${esc(TMROLE[u.role]||'')}">${esc(u.role)}</span></td>
          <td style="font-size:13px;color:var(--ink-2)">${esc(u.title||'—')}</td>
          <td style="font-size:13px;color:var(--text-soft);white-space:nowrap">${st(u)==='invited'?(u.invitedAt?'Invited '+ago(u.invitedAt):'Invite pending'):esc(u.last||'—')}</td>
          <td>${st(u)==='active'?(u.mfa===false?'<span class="tm-mfa off">Off</span>':'<span class="tm-mfa">On</span>'):'<span style="color:var(--muted)">—</span>'}</td>
          <td><span class="stbadge st-${st(u)==='deactivated'?'suspended':st(u)}">${st(u)[0].toUpperCase()+st(u).slice(1)}</span></td>
          <td><div class="rowact"><button class="iconbtn dmenu-btn" data-tmmenu="${i}" aria-label="More actions" title="More actions">•••</button></div></td></tr>`).join('')
        :'<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:34px">No team members match.</td></tr>'}
      </tbody></table></div>
      <div class="tm-grid2">
        <div class="tm-card2"><h3>Roles &amp; permissions</h3><p>What each platform role can do. Only Owners can change roles.</p>
          <div class="tm-perm"><div class="tm-ph"><span></span>${roles.map(r=>`<span>${r}</span>`).join('')}</div>
          ${acts.map(([k,l])=>`<div class="tm-pr"><span>${esc(l)}</span>${roles.map(r=>`<span>${(perms[k]||[]).includes(r)?'<i class="yes">✓</i>':'<i class="no">—</i>'}</span>`).join('')}</div>`).join('')}</div>
          <ul class="tm-rdesc">${roles.map(r=>`<li><b>${r}</b> ${esc(TMROLE[r]||'')}</li>`).join('')}</ul></div>
        <div class="tm-card2"><h3>Recent team activity</h3>
          ${log.length?`<ul class="tm-log">${log.map(e=>`<li><b>${esc(e.actor)}</b> ${esc(((PP.LBL&&PP.LBL[e.action])||e.action).toLowerCase())}${e.user&&e.user!==e.actor?' · '+esc(e.user):''}${e.detail?` <em>${esc(e.detail)}</em>`:''}<span>${ago(e.at)}</span></li>`).join('')}</ul>`:'<p>No changes yet. Invites, role changes and deactivations will show here.</p>'}</div>
      </div>`;
    const R=host;
    const si=R.querySelector('#tmSearch'); si.oninput=()=>{ TM.q=si.value; const p=si.selectionStart; renderTeam(); const n=document.getElementById('tmSearch'); n.focus(); n.setSelectionRange(p,p); };
    R.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>{ TM.role=b.dataset.tr; renderTeam(); });
    R.querySelector('#tmSt').onchange=e=>{ TM.st=e.target.value; renderTeam(); };
    const cl=R.querySelector('#tmClear'); if(cl) cl.onclick=()=>{ TM.q='';TM.role='';TM.st=''; renderTeam(); };
    R.querySelectorAll('[data-tmrow]').forEach(tr=>tr.onclick=e=>{ if(e.target.closest('[data-tmmenu]')) return; tmEdit(T[+tr.dataset.tmrow]); });
    R.querySelectorAll('[data-tmmenu]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); tmMenu(b,T[+b.dataset.tmmenu]); });
  }
  function tmMenu(btn,u){
    const old=document.getElementById('dmenu'); if(old){ const same=old.dataset.for==='tm:'+u.n; old.remove(); if(same) return; }
    const s=u.status==='deactivated'?'deactivated':u.status==='invited'?'invited':'active', me=u.n===meName();
    const m=document.createElement('div'); m.id='dmenu'; m.className='dmenu'; m.dataset.for='tm:'+u.n;
    m.innerHTML=`<button data-tma="edit">Edit details<span>Name, title, email, role, photo</span></button>
      ${!me&&s==='active'?`<button data-tma="msg">Message ${esc(u.n.split(' ')[0])}<span>Opens chat</span></button>`:''}
      ${s==='invited'?'<button data-tma="resend">Resend invite<span>'+esc(u.email||'')+'</span></button>':''}
      ${s==='active'&&!me?'<button data-tma="mfa">Reset 2-step verification<span>They set it up again at next sign-in</span></button>':''}
      <hr>${s==='deactivated'?'<button data-tma="react">Reactivate<span>Restores sign-in</span></button>'
        :s==='invited'?'<button data-tma="revoke" class="danger">Revoke invite<span>The link stops working</span></button>'
        :`<button data-tma="deact" class="danger"${me||isLastOwner(u)?' disabled':''}>Deactivate<span>${me?'You can’t deactivate yourself':isLastOwner(u)?'The platform needs at least one Owner':'Keeps their history, removes access'}</span></button>`}`;
    document.body.appendChild(m);
    const r=btn.getBoundingClientRect(), hh=m.offsetHeight, w=m.offsetWidth;
    m.style.left=Math.max(8,r.right-w)+'px'; m.style.top=(r.bottom+6+hh>innerHeight?Math.max(8,r.top-hh-6):r.bottom+6)+'px';
    const close=()=>{ m.remove(); document.removeEventListener('click',out,true); };
    const out=e=>{ if(!m.contains(e.target)&&e.target!==btn) close(); }; setTimeout(()=>document.addEventListener('click',out,true),0);
    m.onclick=e=>{ const b=e.target.closest('[data-tma]'); if(!b||b.disabled) return; close(); const a=b.dataset.tma;
      if(a==='edit') tmEdit(u);
      else if(a==='msg'){ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith({name:u.n,email:u.email,orgName:'Merchsmith',orgType:'merchsmith'}); }
      else if(a==='resend'){ PP.saveUser('merchsmith',u,{invitedAt:new Date().toISOString()}); PP.log('merchsmith',u,'invited','Invitation resent'); PP.toast('Invite resent to '+(u.email||u.n)); renderTeam(); }
      else if(a==='mfa'){ PP.saveUser('merchsmith',u,{mfa:false}); PP.log('merchsmith',u,'edited','2-step verification reset'); PP.toast('2-step verification reset for '+u.n); renderTeam(); }
      else if(a==='deact'){ if(confirm('Deactivate '+u.n+'?\n\nTheir history is kept and they can no longer sign in. You can reactivate them later.')) tmStatus(u,'deactivated'); }
      else if(a==='revoke'){ if(confirm('Revoke the invite for '+u.n+'?')) tmStatus(u,'deactivated'); }
      else if(a==='react') tmStatus(u,'active'); };
  }
  function teamModal(){
    if(PP){ PP.userForm({ title:'Invite team member', kind:'team', orgType:'merchsmith',
      onSave:f=>{ if(f.email&&!/@merchsmith\.com$/i.test(f.email)){ PP.toast('Platform team members need a merchsmith.com email'); return false; }
        A.team.push(PP.addUser('merchsmith','Contacts',Object.assign({title:f.title||f.role},f))); renderTeam(); }, peers:A.team }); return; }
    const m=modal(`<div class="fm-head"><h3>Invite team member</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <label class="fm-f"><span>Full name</span><input id="tmN" placeholder="Full name"></label>
        <label class="fm-f"><span>Work email</span><input id="tmE" type="email" placeholder="name@merchsmith.com"></label>
        <label class="fm-f"><span>Role</span><select id="tmR"><option>Admin</option><option>Support</option><option>Billing</option><option>Owner</option></select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="tmSave">Send invite</button></div>`);
    m.root.querySelector('#tmSave').onclick=()=>{ const n=m.root.querySelector('#tmN').value.trim(); if(!n){m.root.querySelector('#tmN').focus();return;} A.team.push({n,role:m.root.querySelector('#tmR').value,title:m.root.querySelector('#tmR').value,email:m.root.querySelector('#tmE').value.trim(),last:'Invited',status:'invited'}); renderTeam(); m.close(); toast('Invite sent to '+n); };
  }

  /* ---------- invite distributor (organisation + owner only; they choose the rest when onboarding) ---------- */
  const INVKEY='ms-admin-invited-dists';
  // bespoke colourway per distributor — the same four colours as a custom colour set in Branding (theme.js)
  const hexOk=x=>/^#[0-9a-f]{6}$/i.test(x);
  const CW=[['--periwinkle','Primary','#7B85C5'],['--periwinkle-deep','Primary deep','#5860A6'],['--periwinkle-ink','Primary ink','#3C4279'],['--tint-peri','Tint','#ECEEF9']];
  function inviteDistributor(){
    if(!PP||!PP.modal) return inviteModal('distributor');
    const m=PP.modal('Invite distributor',`
      <div class="pp-grid" style="grid-template-columns:1fr">
        <label class="pp-f"><span>Organisation</span><input data-iv="org" placeholder="e.g. Brightside Promo" autocomplete="off"></label>
        <label class="pp-f"><span>Name</span><input data-iv="n" placeholder="Full name" autocomplete="off"></label>
        <label class="pp-f"><span>Email address</span><input data-iv="email" type="email" placeholder="name@company.com" autocomplete="off"></label>
      </div>
      <div style="display:grid;gap:5px;margin-top:14px"><span style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)">Logo</span>
        <div class="pp-avf" style="margin:4px 0 0"><span class="pp-av" data-ivlogo style="border-radius:12px;background:var(--paper-2);color:var(--ink-3)">?</span>
        <div><div class="pp-avbtns"><label class="pp-btn ghost sm">Upload logo<input type="file" accept="image/*" data-ivfile hidden></label>
        <button type="button" class="pp-btn ghost sm" data-ivclear style="display:none">Remove</button></div>
        <span class="pp-hint">Optional · PNG or SVG with a transparent background works best</span></div></div></div>
      <div style="display:grid;gap:5px;margin-top:14px"><span style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)">Platform colourway</span>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${CW.map(([k,lbl,def])=>`
          <label style="display:flex;align-items:center;gap:9px;border:1.5px solid var(--line-soft);border-radius:10px;padding:6px 8px;cursor:pointer">
            <span style="position:relative;width:30px;height:30px;border-radius:8px;overflow:hidden;border:1px solid var(--line-soft);flex:none"><input type="color" data-ivcol="${k}" value="${def}" style="position:absolute;inset:-8px;width:46px;height:46px;border:0;padding:0;cursor:pointer"></span>
            <span style="display:grid;gap:1px;min-width:0"><b style="font-size:12.5px;font-weight:700;color:var(--ink)">${lbl}</b>
            <input data-ivhex="${k}" value="${def}" maxlength="7" spellcheck="false" style="width:84px;font-family:var(--sans);font-size:12.5px;color:var(--ink-3);border:0;padding:0;background:none;text-transform:uppercase;outline:0"></span>
          </label>`).join('')}</div>
        <div data-ivprev style="margin-top:6px;border:1px solid var(--line-soft);border-radius:12px;overflow:hidden">
          <div data-pv="bar" style="height:30px;display:flex;align-items:center;padding:0 12px;gap:8px;color:#fff;font-size:12px;font-weight:800"><span data-pv="nm">Their platform</span></div>
          <div data-pv="body" style="padding:10px 12px;display:flex;gap:8px;align-items:center">
            <span data-pv="btn" style="font-size:12px;font-weight:700;color:#fff;border-radius:8px;padding:6px 11px">Primary button</span>
            <span data-pv="chip" style="font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px">Selected</span>
            <span data-pv="link" style="font-size:12px;font-weight:700">Link text</span>
          </div>
        </div>
        <span class="pp-hint">Set up for this distributor only. They can fine-tune it later in Branding.</span></div>
      <p class="pp-note">They'll get an email to set up their account, and can change the logo and colourway later in Branding. Plan, team and store are chosen during onboarding.</p>
      <p class="pp-note" data-iverr style="color:#b4232c;display:none"></p>`,
      `<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-ivsend>Send invite</button>`);
    const R=m.root, v=k=>R.querySelector('[data-iv="'+k+'"]').value.trim(), err=R.querySelector('[data-iverr]');
    let logo=''; const V={}; CW.forEach(([k,,d])=>V[k]=d.toLowerCase());
    const lg=R.querySelector('[data-ivlogo]'), lc=R.querySelector('[data-ivclear]');
    const initialsPreview=()=>{ if(!logo) lg.textContent=v('org')?av(v('org')):'?'; };
    R.querySelector('[data-iv="org"]').addEventListener('input',initialsPreview);
    R.querySelector('[data-ivfile]').onchange=async e=>{ try{ logo=await PP.readLogo(e.target.files[0]); lg.innerHTML='<img src="'+logo+'" alt="" style="width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box;border-radius:0">'; lg.style.background='#fff'; lc.style.display=''; }catch(x){ PP.toast(x.message); } e.target.value=''; };
    lc.onclick=()=>{ logo=''; lg.style.background='var(--paper-2)'; lc.style.display='none'; initialsPreview(); };
    const paint=()=>{ const q=k=>R.querySelector('[data-pv="'+k+'"]');
      q('bar').style.background=V['--periwinkle']; q('btn').style.background=V['--periwinkle-deep'];
      q('chip').style.background=V['--tint-peri']; q('chip').style.color=V['--periwinkle-ink']; q('link').style.color=V['--periwinkle-deep'];
      q('nm').textContent=v('org')||'Their platform'; };
    CW.forEach(([k])=>{ const ci=R.querySelector('[data-ivcol="'+k+'"]'), hx=R.querySelector('[data-ivhex="'+k+'"]');
      ci.oninput=()=>{ V[k]=ci.value; hx.value=ci.value.toUpperCase(); hx.style.color='var(--ink-3)'; paint(); };
      hx.oninput=()=>{ let x=hx.value.trim(); if(x&&x[0]!=='#') x='#'+x; if(hexOk(x)){ V[k]=x.toLowerCase(); ci.value=V[k]; hx.style.color='var(--ink-3)'; paint(); } else hx.style.color='#b4232c'; }; });
    R.querySelector('[data-iv="org"]').addEventListener('input',paint); paint();
    R.querySelector('[data-iv="org"]').focus();
    const fail=(k,t)=>{ err.textContent=t; err.style.display=''; R.querySelector('[data-iv="'+k+'"]').focus(); };
    R.querySelector('[data-ivsend]').onclick=()=>{
      const org=v('org'), n=v('n'), email=v('email');
      if(!org) return fail('org','Enter the organisation name.');
      if(A.distributors.some(d=>d.name.toLowerCase()===org.toLowerCase())) return fail('org',org+' is already a distributor.');
      if(!n) return fail('n','Enter the name of the person to invite.');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('email','Enter a valid email address.');
      let id=org.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'dist'; while(A.distributors.some(d=>d.id===id)) id+='-2';
      const now=new Date();
      const d={id,name:org,initials:av(org),domain:email.split('@')[1],plan:'',status:'invited',since:now.toLocaleDateString('en-GB',{month:'short',year:'numeric'}),
        joined:now.toISOString().slice(0,10),store:'draft',rangeMode:'curated',country:'',mrr:'£0',customers:0,suppliers:0,users:0,seats:0,cur:'£',activeProjects:0,gmv:'£0',
        lastActive:'Invited',lastLoginAt:null,logo,theme:{name:org+' colourway',dot:V['--periwinkle'],vars:Object.assign({},V)},owner:n,ownerEmail:email,contactName:n,contactEmail:email,region:'',invitedAt:now.toISOString(),
        flag:{level:'grey',note:'Invitation sent to '+email+' — awaiting onboarding'}};
      A.distributors.unshift(d);
      try{ const l=JSON.parse(localStorage.getItem(INVKEY)||'[]'); l.unshift(d); localStorage.setItem(INVKEY,JSON.stringify(l)); }catch(e){}
      if(A.recalc) A.recalc(); if(window.__adminRender) window.__adminRender(); renderOverview(); renderSubs();
      m.close(); toast('Invite sent to '+n+' at '+org);
    };
    R.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('input')) R.querySelector('[data-ivsend]').click(); });
  }

  /* ---------- add supplier (organisation + main contact; they complete their profile when onboarding) ---------- */
  const SUPINVKEY='ms-admin-invited-sups';
  function inviteSupplier(){
    if(!PP||!PP.modal) return inviteModal('supplier');
    const TYPES=[['both','Product + Branding'],['product','Product only'],['branding','Branding only']];
    const m=PP.modal('Add supplier',`
      <div class="pp-grid" style="grid-template-columns:1fr">
        <label class="pp-f"><span>Organisation</span><input data-iv="org" placeholder="e.g. PF Concept" autocomplete="off"></label>
        <label class="pp-f"><span>Name</span><input data-iv="n" placeholder="Full name" autocomplete="off"></label>
        <label class="pp-f"><span>Email address</span><input data-iv="email" type="email" placeholder="name@supplier.com" autocomplete="off"></label>
      </div>
      <div style="display:grid;gap:5px;margin-top:14px"><span style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)">Supplier type</span>
        <div data-ivtypes style="display:flex;gap:8px;flex-wrap:wrap">${TYPES.map(([k,l],i)=>`<button type="button" data-ivtype="${k}" aria-pressed="${i===0}" style="font:inherit;font-size:13px;font-weight:700;color:var(--ink);background:#fff;border:1.5px solid ${i===0?'var(--ink)':'var(--line-soft)'};border-radius:999px;padding:7px 14px;cursor:pointer">${l}</button>`).join('')}</div></div>
      <div style="display:grid;gap:5px;margin-top:14px"><span style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)">Logo</span>
        <div class="pp-avf" style="margin:4px 0 0"><span class="pp-av" data-ivlogo style="border-radius:12px;background:var(--paper-2);color:var(--ink-3)">?</span>
        <div><div class="pp-avbtns"><label class="pp-btn ghost sm">Upload logo<input type="file" accept="image/*" data-ivfile hidden></label>
        <button type="button" class="pp-btn ghost sm" data-ivclear style="display:none">Remove</button></div>
        <span class="pp-hint">Optional · PNG or SVG with a transparent background works best</span></div></div></div>
      <p class="pp-note">They'll get an email to join as the supplier's admin. Address, specialisms and the rest of their team are added during onboarding; the product feed is connected from their panel.</p>
      <p class="pp-note" style="margin-top:4px"><a href="#" data-ivfull style="color:var(--periwinkle-deep);font-weight:700;text-decoration:none">Set up a supplier in full instead ›</a></p>
      <p class="pp-note" data-iverr style="color:#b4232c;display:none"></p>`,
      `<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-ivsend>Send invite</button>`);
    const R=m.root, v=k=>R.querySelector('[data-iv="'+k+'"]').value.trim(), err=R.querySelector('[data-iverr]');
    let logo='', kind='both';
    const lg=R.querySelector('[data-ivlogo]'), lc=R.querySelector('[data-ivclear]');
    const initialsPreview=()=>{ if(!logo) lg.textContent=v('org')?av(v('org')):'?'; };
    R.querySelector('[data-iv="org"]').addEventListener('input',initialsPreview);
    R.querySelector('[data-ivfile]').onchange=async e=>{ try{ logo=await PP.readLogo(e.target.files[0]); lg.innerHTML='<img src="'+logo+'" alt="" style="width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box;border-radius:0">'; lg.style.background='#fff'; lc.style.display=''; }catch(x){ PP.toast(x.message); } e.target.value=''; };
    lc.onclick=()=>{ logo=''; lg.style.background='var(--paper-2)'; lc.style.display='none'; initialsPreview(); };
    R.querySelectorAll('[data-ivtype]').forEach(b=>b.onclick=()=>{ kind=b.dataset.ivtype; R.querySelectorAll('[data-ivtype]').forEach(x=>{ const on=x===b; x.setAttribute('aria-pressed',on); x.style.borderColor=on?'var(--ink)':'var(--line-soft)'; }); });
    R.querySelector('[data-iv="org"]').focus();
    const full=R.querySelector('[data-ivfull]'); if(full) full.onclick=e=>{ e.preventDefault(); m.close(); if(window.MSAddSupplier&&MSAddSupplier.drawer) MSAddSupplier.drawer(); };
    const fail=(k,t)=>{ err.textContent=t; err.style.display=''; R.querySelector('[data-iv="'+k+'"]').focus(); };
    R.querySelector('[data-ivsend]').onclick=()=>{
      const org=v('org'), n=v('n'), email=v('email');
      if(!org) return fail('org','Enter the organisation name.');
      if(A.suppliers.some(s=>s.name.toLowerCase()===org.toLowerCase())) return fail('org',org+' is already a supplier.');
      if(!n) return fail('n','Enter the name of the person to invite.');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('email','Enter a valid email address.');
      let id=org.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'sup'; while(A.suppliers.some(s=>s.id===id)) id+='-2';
      const s={id,name:org,initials:av(org),domain:email.split('@')[1],kind,feed:kind==='branding'?'Manual · decoration':'Not connected',products:0,status:'invited',region:'',usedBy:0,
        since:String(new Date().getFullYear()),logo,contactName:n,contactEmail:email,invitedAt:new Date().toISOString()};
      A.suppliers.unshift(s);
      try{ const l=JSON.parse(localStorage.getItem(SUPINVKEY)||'[]'); l.unshift(s); localStorage.setItem(SUPINVKEY,JSON.stringify(l)); }catch(e){}
      try{ PP.addUser('sup:'+id,'Contacts',{n,email,role:'Admin',title:''}); }catch(e){}
      if(window.__adminRender) window.__adminRender(); renderOverview();
      m.close(); toast('Invite sent to '+n+' at '+org);
    };
    R.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('input')) R.querySelector('[data-ivsend]').click(); });
  }

  /* ---------- invite organisation ---------- */
  function inviteModal(kind){
    const m=modal(`<div class="fm-head"><h3>Invite organisation</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <div class="fm-seg" id="ioType"><button type="button" class="${kind!=='supplier'?'on':''}" data-t="distributor">Distributor</button><button type="button" class="${kind==='supplier'?'on':''}" data-t="supplier">Supplier</button></div>
        <label class="fm-f"><span>Organisation name</span><input id="ioN" placeholder="e.g. Brightside Promo"></label>
        <label class="fm-f"><span>Domain</span><input id="ioD" placeholder="store.example.com"></label>
        <div id="ioDist">
          <label class="fm-f"><span>Owner name</span><input id="ioOwner" placeholder="Full name"></label>
          <label class="fm-f"><span>Owner email</span><input id="ioEmail" type="email" placeholder="name@example.com"></label>
          <label class="fm-f"><span>Plan</span><select id="ioPlan"><option>Starter</option><option selected>Growth</option><option>Scale</option></select></label>
        </div>
        <div id="ioSup" style="display:none">
          <div class="fm-f"><span>Supplier type</span><div class="fm-seg" id="ioKind"><button type="button" class="on" data-k="both">Product + Branding</button><button type="button" data-k="product">Product</button><button type="button" data-k="branding">Branding</button></div></div>
          <label class="fm-f"><span>Region</span><input id="ioRegion" placeholder="e.g. UK" value="UK"></label>
        </div>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="ioSave">Send invite</button></div>`);
    let type=kind==='supplier'?'supplier':'distributor', skind='both';
    const sync=()=>{ m.root.querySelector('#ioDist').style.display=type==='distributor'?'':'none'; m.root.querySelector('#ioSup').style.display=type==='supplier'?'':'none'; };
    sync();
    m.root.querySelectorAll('#ioType button').forEach(b=>b.onclick=()=>{ type=b.dataset.t; m.root.querySelectorAll('#ioType button').forEach(x=>x.classList.toggle('on',x===b)); sync(); });
    m.root.querySelectorAll('#ioKind button').forEach(b=>b.onclick=()=>{ skind=b.dataset.k; m.root.querySelectorAll('#ioKind button').forEach(x=>x.classList.toggle('on',x===b)); });
    m.root.querySelector('#ioSave').onclick=()=>{
      const name=m.root.querySelector('#ioN').value.trim(); if(!name){ m.root.querySelector('#ioN').focus(); return; }
      const dom=m.root.querySelector('#ioD').value.trim()||'—'; const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      if(type==='distributor'){
        const plan=m.root.querySelector('#ioPlan').value;
        A.distributors.unshift({id,name,initials:av(name),domain:dom,plan,status:'active',since:'Jun 2026',mrr:'£0',customers:0,suppliers:0,users:1,seats:1,cur:'£',activeProjects:0,gmv:'£0',lastActive:'Invited',owner:m.root.querySelector('#ioOwner').value.trim()||'New owner',ownerEmail:m.root.querySelector('#ioEmail').value.trim(),region:'UK',flag:{level:'grey',note:'Invitation sent — awaiting onboarding'}});
        if(window.__adminRender) window.__adminRender();
      } else {
        A.suppliers.unshift({id,name,initials:av(name),domain:dom,kind:skind,feed:skind==='branding'?'Manual · decoration':'Manual',products:0,status:'pending',region:m.root.querySelector('#ioRegion').value.trim()||'UK',usedBy:0,lead:'7 working days',since:'2026'});
        if(window.__adminRender) window.__adminRender();
      }
      renderOverview(); renderSubs();
      m.close(); toast((type==='distributor'?'Distributor':'Supplier')+' "'+name+'" invited');
    };
  }

  /* ---------- modal helper ---------- */
  function modal(html){
    const wrap=document.createElement('div'); wrap.className='fm-scrim'; wrap.innerHTML=`<div class="fm-modal">${html}</div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); document.body.style.overflow=''; },200); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) close(); });
    return { root:wrap, close };
  }

  /* ---------- wire quick actions ---------- */
  { const b=document.getElementById('qInvite'); if(b) b.onclick=()=>inviteModal('distributor'); }
  { const b=document.getElementById('qInvite2'); if(b) b.onclick=inviteDistributor; }
  window.__inviteSupplier=inviteSupplier;
  const qs=document.getElementById('qInviteSup'); if(qs) qs.onclick=inviteSupplier;
  const qt=document.getElementById('qInviteTeam'); if(qt) qt.onclick=teamModal;
  document.querySelectorAll('.setcard .toggle').forEach(t=>t.onclick=()=>t.classList.toggle('on'));

  // render static panels now; statbar/dir tables are handled by admin-page.js on login
  renderOverview(); renderSubs(); renderTeam();
  window.__homeRender=()=>{ renderOverview(); renderSubs(); renderTeam(); };
})();
