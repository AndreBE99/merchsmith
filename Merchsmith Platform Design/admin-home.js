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

  /* ---------- overview extras ---------- */
  function renderOverview(){
    // nav counts
    const nd=document.getElementById('navDist'), ns=document.getElementById('navSup');
    if(nd) nd.textContent=A.distributors.length; if(ns) ns.textContent=A.suppliers.length;
    // sparkline
    const data=A.mrrSeries||[]; const w=560,h=120,pad=8;
    const max=Math.max(...data),min=Math.min(...data);
    const xs=i=>pad+i*((w-pad*2)/(data.length-1));
    const ys=v=>h-pad-((v-min)/(max-min||1))*(h-pad*2-10);
    const pts=data.map((v,i)=>[xs(i),ys(v)]);
    const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const area=`M${pts[0][0]} ${h} `+pts.map(p=>'L'+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+` L${pts[pts.length-1][0]} ${h} Z`;
    const last=pts[pts.length-1];
    const sp=document.getElementById('mrrSpark');
    if(sp) sp.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="sparkgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--periwinkle)" stop-opacity=".28"/><stop offset="1" stop-color="var(--periwinkle)" stop-opacity="0"/></linearGradient></defs><path class="area" d="${area}"/><path class="line" d="${line}"/><circle class="dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4"/></svg>`;
    const growth=Math.round(((data[data.length-1]-data[0])/data[0])*100);
    const tr=document.getElementById('mrrTrend'); if(tr) tr.textContent='▲ '+growth+'% over 12 months';
    // attention
    const attn=A.distributors.filter(d=>d.flag).map(d=>{
      const lv=d.flag.level, cls=lv==='red'?'ai-red':lv==='amber'?'ai-amber':'ai-grey';
      return `<div class="attn-row" data-view="${d.id}"><span class="attn-ic ${cls}"><svg class="icn"><use href="#a-flag"/></svg></span><div><b>${esc(d.name)}</b><span>${esc(d.flag.note)}</span></div></div>`;
    }).join('');
    const al=document.getElementById('attnList'); if(al) al.innerHTML=attn||'<p style="font-size:13px;color:var(--muted);margin:0">Nothing needs attention. 🎉</p>';
    // activity feed
    const fl=document.getElementById('actFeed');
    if(fl) fl.innerHTML=(A.activity||[]).map(a=>`<div class="feed-row"><span class="feed-dot fd-${a.kind}"></span><div><b>${esc(a.who)}</b> <span class="ft">${esc(a.txt)}</span></div><span class="fw">${esc(a.when)}</span></div>`).join('');
    // plan mix
    const total=A.distributors.length;
    const pm=document.getElementById('planMix');
    if(pm) pm.innerHTML=(A.plans||[]).map(p=>{ const pct=Math.round((p.count/total)*100); return `<div class="pm-row"><div class="pm-top"><span>${p.name}</span><span>${p.count} · ${pct}%</span></div><div class="pm-bar"><i style="width:${pct}%;background:${p.color}"></i></div></div>`; }).join('');
  }

  /* ---------- subscriptions ---------- */
  function renderSubs(){
    const g=document.getElementById('plansGrid');
    if(g) g.innerHTML=(A.plans||[]).map(p=>`
      <div class="plan-card ${p.popular?'pop':''}">
        ${p.popular?'<span class="plan-pop">Most popular</span>':''}
        <div class="plan-name">${p.name}</div>
        <div class="plan-tag">${esc(p.tagline)}</div>
        <div class="plan-price">${p.price}<span>${p.period}</span></div>
        <span class="plan-ct">${p.count} distributor${p.count===1?'':'s'}</span>
        <ul class="plan-feats">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul>
      </div>`).join('');
    const sr=document.getElementById('subRows');
    const PL={'£250':'Starter','£750':'Growth','£1,200':'Scale'};
    if(sr) sr.innerHTML=A.distributors.map(d=>`
      <tr data-dist="${d.id}">
        <td><div class="orgcell"><div class="orglogo dist" style="width:32px;height:32px;font-size:12px">${d.initials}</div><b>${esc(d.name)}</b></div></td>
        <td><span class="plan">${d.plan}</span></td>
        <td class="scell">${d.mrr}</td>
        <td><span class="stbadge st-${d.status}">${({active:'Active',trial:'Trial',past_due:'Past due',suspended:'Suspended'})[d.status]}</span></td>
        <td><div class="rowact"><button class="iconbtn" data-plan="${d.id}">Change plan</button></div></td>
      </tr>`).join('');
  }
  document.addEventListener('click',e=>{
    const pb=e.target.closest('[data-plan]'); if(pb){ e.stopPropagation(); const d=A.distributors.find(x=>x.id===pb.dataset.plan); if(d) planModal(d); }
  });
  function planModal(d){
    const m=modal(`<div class="fm-head"><h3>Change plan</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <p style="font-size:13.5px;color:var(--text-soft);margin:0">${esc(d.name)} is on the <b>${d.plan}</b> plan.</p>
        <label class="fm-f"><span>New plan</span><select id="npPlan">${A.plans.map(p=>`<option value="${p.name}" ${p.name===d.plan?'selected':''}>${p.name} · ${p.price}${p.period}</option>`).join('')}</select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="npSave">Update plan</button></div>`);
    m.root.querySelector('#npSave').onclick=()=>{ const v=m.root.querySelector('#npPlan').value; d.plan=v; d.mrr=({Starter:'£250',Growth:'£750',Scale:'£1,200'})[v]||d.mrr; renderSubs(); renderOverview(); m.close(); toast(d.name+' moved to '+v); };
  }

  /* ---------- team ---------- */
  function renderTeam(){
    const g=document.getElementById('teamGrid');
    if(g) g.innerHTML=(A.team||[]).map(u=>`
      <div class="tm-card ${u.status==='invited'?'inv':''}"><span class="av">${av(u.n)}</span>
        <div><b>${esc(u.n)}</b><span>${esc(u.title)} · ${u.status==='invited'?'Invited':esc(u.last)}</span></div>
        <span class="tm-role">${esc(u.role)}</span></div>`).join('');
  }
  function teamModal(){
    const m=modal(`<div class="fm-head"><h3>Invite team member</h3><button class="dwr-x" data-fx>×</button></div>
      <div class="fm-body">
        <label class="fm-f"><span>Full name</span><input id="tmN" placeholder="Full name"></label>
        <label class="fm-f"><span>Work email</span><input id="tmE" type="email" placeholder="name@merchsmith.com"></label>
        <label class="fm-f"><span>Role</span><select id="tmR"><option>Admin</option><option>Support</option><option>Billing</option><option>Owner</option></select></label>
      </div>
      <div class="fm-foot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="tmSave">Send invite</button></div>`);
    m.root.querySelector('#tmSave').onclick=()=>{ const n=m.root.querySelector('#tmN').value.trim(); if(!n){m.root.querySelector('#tmN').focus();return;} A.team.push({n,role:m.root.querySelector('#tmR').value,title:m.root.querySelector('#tmR').value,email:m.root.querySelector('#tmE').value.trim(),last:'Invited',status:'invited'}); renderTeam(); m.close(); toast('Invite sent to '+n); };
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
        A.distributors.unshift({id,name,initials:av(name),domain:dom,plan,status:'trial',since:'Jun 2026',mrr:'£0',customers:0,suppliers:0,users:1,activeProjects:0,gmv:'£0',lastActive:'Invited',owner:m.root.querySelector('#ioOwner').value.trim()||'New owner',ownerEmail:m.root.querySelector('#ioEmail').value.trim(),region:'UK',flag:{level:'grey',note:'Invitation sent — awaiting onboarding'}});
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
  ['qInvite','qInvite2'].forEach(id=>{ const b=document.getElementById(id); if(b) b.onclick=()=>inviteModal('distributor'); });
  const qs=document.getElementById('qInviteSup'); if(qs) qs.onclick=()=>inviteModal('supplier');
  const qt=document.getElementById('qInviteTeam'); if(qt) qt.onclick=teamModal;
  document.querySelectorAll('.setcard .toggle').forEach(t=>t.onclick=()=>t.classList.toggle('on'));

  // render static panels now; statbar/dir tables are handled by admin-page.js on login
  renderOverview(); renderSubs(); renderTeam();
  window.__homeRender=()=>{ renderOverview(); renderSubs(); renderTeam(); };
})();
