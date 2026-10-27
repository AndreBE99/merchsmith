/* admin-orgs.js — Platform Admin: every distributor and supplier drawer gets
   (1) its people, grouped by team, with invite / edit / deactivate / manage teams,
   (2) an "Edit organisation" action (name, domain, address, logo, plus region / lead time).
   Uses the shared people store (people.js). Distributor 'acme' IS Mojo Promotions, so
   it reads Mojo's real people; organisations with no people seed start from their
   owner record and grow from there. */
(function(){
  const P=window.MSPEOPLE, A=window.ADMIN, OD=window.ORG_DATA||{customers:[],suppliers:[],mojoTeams:[]};
  if(!P||!A) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const CACHE={};

  // saved organisation edits apply everywhere the record is used
  A.distributors.forEach(d=>P.hydrateOrg('dist:'+d.id,d));
  A.suppliers.forEach(s=>P.hydrateOrg('sup:'+s.id,s));

  function orgOf(ctx){
    const r=ctx.rec, id=(ctx.kind==='dist'?'d:':'s:')+r.id;
    if(CACHE[id]) return CACHE[id];
    let o;
    if(ctx.kind==='dist'&&r.id==='acme') o={key:'mojo',type:'distributor',teams:P.hydrate('mojo',OD.mojoTeams)};
    else if(ctx.kind==='dist'){
      const seed=[{name:'Team',users:r.owner?[{n:r.owner,email:r.ownerEmail||'',role:'Admin',title:'Owner',tel:'',status:'active',last:r.lastActive||'—'}]:[]}];
      o={key:'dist:'+r.id,type:'distributor',teams:P.hydrate('dist:'+r.id,seed)};
    } else {
      const m=(OD.suppliers||[]).find(x=>x.name===r.name);
      if(m) o={key:m.id,type:'supplier',teams:[{name:'Contacts',users:P.hydrateContacts(m.id,m.contacts=m.contacts||[])}]};
      else {
        // the old "Supplier team" list (admin-supplier-team.js) becomes the seed — one list, not two
        let legacy=[]; try{ legacy=(window.MSSupplierTeam&&MSSupplierTeam.teamOf)?MSSupplierTeam.teamOf(r):[]; }catch(e){}
        const users=(legacy||[]).map((m,k)=>({n:m.name||m.email, email:m.email||'', title:m.role||'', tel:m.tel||'',
          role:k===0?'Admin':'Contact', status:m.status==='invited'?'invited':'active', last:m.status==='invited'?'Invited':'—'}));
        o={key:'sup:'+r.id,type:'supplier',teams:P.hydrate('sup:'+r.id,[{name:'Contacts',users}])};
        const seedTel={}; users.forEach(u=>{ if(u.email&&u.tel) seedTel[u.email.toLowerCase()]=u.tel; });
        o.teams.forEach(t=>t.users.forEach(u=>{ if(!u.tel&&u.email&&seedTel[u.email.toLowerCase()]) u.tel=seedTel[u.email.toLowerCase()]; })); }
    }
    return CACHE[id]=o;
  }
  const status=u=>u.status==='deactivated'?'deactivated':u.status==='invited'?'invited':'active';
  const STL={active:'Active',invited:'Invited',deactivated:'Deactivated'};

  function peopleHTML(o){
    const all=o.teams.flatMap(t=>t.users), live=all.filter(u=>u.status!=='deactivated').length;
    const seats=o.type==='distributor'?P.seatsUsed(o.teams):null;
    return `<div class="dwr-sec ao-people"><div class="ao-hd"><h4>People · ${live} active${all.length>live?` of ${all.length}`:''}</h4>
        <div class="ao-acts">${o.teams.length>1||o.type!=='supplier'?`<button class="btn ghost sm" data-aoteams>Manage teams</button>`:''}<button class="btn sm" data-aoinvite>＋ Invite</button></div></div>
      ${seats!=null?`<p class="ao-note">${seats} billable seat${seats===1?'':'s'} in use — active and invited people in distributor roles.</p>`:''}
      ${o.teams.map((t,ti)=>`${o.teams.length>1?`<div class="ao-team">${esc(t.name)} <span>${t.users.length}</span></div>`:''}
        ${t.users.length?t.users.map((u,ui)=>`<button class="ao-row ${status(u)==='deactivated'?'u-deact':''}" data-aou="${ti}:${ui}">
          <span class="ao-av">${P.avHTML(u)}</span><span class="ao-who"><b>${esc(u.n)}</b><em>${esc(u.title||'')}${u.email?' · '+esc(u.email):''}</em>${(u.tel||u.phone)?`<em class="ao-ph"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.8 4.3-2.2 1.4a11 11 0 0 0 6.2 6.2l1.4-2.2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>${esc(u.tel||u.phone)}</em>`:''}</span>
          ${status(u)!=='deactivated'&&window.MSChat?(()=>{ const m={name:u.n,orgName:o.name,orgType:o.type}; const ok=MSChat.reachable(m);
            return (MSChat.me()&&MSChat.me().name===u.n)?'':`<span class="ao-chat${ok?'':' off'}" role="button" tabindex="0" data-aochat="${ti}:${ui}" title="${ok?'Message '+esc(u.n.split(' ')[0]):'Not one of your contacts'}" aria-label="${ok?'Message '+esc(u.n):'Not one of your contacts'}"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z\"/></svg></span>${u.email?`<span class="ao-chat" role="button" tabindex="0" data-email-to="${esc(JSON.stringify({name:u.n,email:u.email,org:o.name}))}" title="Email ${esc(u.n.split(' ')[0])}" aria-label="Email ${esc(u.n)}"><svg viewBox=\\"0 0 24 24\\" aria-hidden=\\"true\\"><rect x=\\"3\\" y=\\"5\\" width=\\"18\\" height=\\"14\\" rx=\\"2.5\\"/><path d=\\"m4 7 8 6 8-6\\"/></svg></span>`:''}`; })():''}
          <span class="ao-role">${esc(P.normRole(u.role))}</span><span class="ao-st s-${status(u)}">${STL[status(u)]}</span></button>`).join('')
        :`<p class="ao-empty">No one here yet.</p>`}`).join('')}
    </div>`;
  }

  function enhance(drawer,ctx,reopen){
    const o=orgOf(ctx), r=ctx.rec; o.name=r.name;
    drawer.classList.add('ao-brand'); drawer.dataset.aokind=ctx.kind;
    // header: uploaded logo + edit action
    const logo=drawer.querySelector('.dwr-head .orglogo');
    if(logo&&r.logo){ logo.innerHTML=`<img src="${esc(r.logo)}" alt="" style="width:100%;height:100%;object-fit:contain;padding:4px">`; logo.style.background='#fff'; logo.style.border='1px solid var(--line-soft)'; }
    // edit = a pencil beside the close ×; the logo itself opens the logo upload
    if(!drawer.querySelector('[data-aoedit]')){
      const x=drawer.querySelector('.dwr-head > .dwr-x');
      if(x) x.insertAdjacentHTML('beforebegin','<button class="ao-hdedit" data-aoedit title="Edit organisation" aria-label="Edit organisation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>');
    }
    if(logo&&!logo.dataset.aologo){
      logo.dataset.aologo='1'; logo.setAttribute('role','button'); logo.setAttribute('tabindex','0');
      logo.title=r.logo?'Change logo':'Upload logo';
      logo.insertAdjacentHTML('beforeend','<span class="ao-logocam" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.3" r="3.3"/></svg></span>');
    }
    // people section, placed right after the first section so it's easy to find
    const body=drawer.querySelector('.dwr-body'); if(!body) return;
    const slot=body.querySelector('[data-aopeople]');
    const holder=document.createElement('div'); holder.innerHTML=peopleHTML(o);
    if(slot) slot.replaceWith(holder.firstElementChild);
    else { const first=body.querySelector('.dwr-sec'); if(first&&first.nextSibling) body.insertBefore(holder.firstElementChild,first.nextSibling); else body.appendChild(holder.firstElementChild); }

    const again=()=>{ if(window.__adminRender) window.__adminRender(); if(window.MSAdminUsers) MSAdminUsers.render(); reopen();
      window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:orgKey}})); };
    const orgKey=ctx.kind==='dist'?'dist:'+r.id:'sup:'+r.id;
    const openEdit=()=>P.editOrg(orgKey,r,again,
      [{k:'region',label:'Region'}],
      ctx.kind==='dist'?{companyNo:true}:{companyNo:true,specialisms:true,
        kinds:[['product','Product (blanks)'],['branding','Branding only'],['both','Product + branding']]});
    drawer.querySelector('[data-aoedit]').onclick=openEdit;
    // clicking the logo opens the editor and goes straight to the file picker
    if(logo){ const pick=()=>{ openEdit(); setTimeout(()=>{ const f=document.querySelector('[data-pplfile]'); if(f) f.click(); },60); };
      logo.onclick=pick; logo.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(); } }; }
    const peers=()=>o.teams.flatMap(t=>t.users);
    const inv=drawer.querySelector('[data-aoinvite]');
    if(inv) inv.onclick=()=>P.userForm({ title:'Invite to '+r.name, kind:'team', orgType:o.type, orgKey:o.key, peers:peers(),
      teamNames:o.teams.map(t=>t.name), team:o.teams[0].name,
      onSave:f=>{ const t=o.teams.find(x=>x.name===f.team)||o.teams[0]; t.users.push(P.addUser(o.key,t.name,Object.assign({title:f.title||f.role},f))); again(); } });
    const mt=drawer.querySelector('[data-aoteams]');
    if(mt) mt.onclick=()=>P.manageTeams(o.key,o.teams,again,o.type==='supplier'?'Group':'Team');
    drawer.querySelectorAll('[data-aochat]').forEach(b=>{ const go=e=>{ e.preventDefault(); e.stopPropagation();
        if(b.classList.contains('off')) return;
        const [ti,ui]=b.dataset.aochat.split(':').map(Number), u=o.teams[ti].users[ui];
        MSChat.chatWith({name:u.n,title:u.title,photo:u.photo,orgName:o.name,orgType:o.type}); };
      b.onclick=go; b.onkeydown=e=>{ if(e.key==='Enter'||e.key===' ') go(e); }; });
    drawer.querySelectorAll('[data-aou]').forEach(b=>b.onclick=()=>{
      const [ti,ui]=b.dataset.aou.split(':').map(Number), t=o.teams[ti], u=t.users[ui];
      const lastAdmin=()=>P.normRole(u.role)==='Admin'&&peers().filter(p=>P.normRole(p.role)==='Admin'&&p.status!=='deactivated').length<=1;
      P.userForm({ title:'Edit '+u.n+' · '+r.name, user:u, kind:'team', orgType:o.type, orgKey:o.key, peers:peers(),
        teamNames:o.teams.length>1?o.teams.map(x=>x.name):[], team:t.name,
        onSave:f=>{ if(f.role&&f.role!=='Admin'&&lastAdmin()){ delete f.role; P.toast('Every organisation needs an active Admin'); }
          P.saveUser(o.key,u,f);
          if(f.team&&f.team!==t.name){ const to=o.teams.find(x=>x.name===f.team); if(to){ t.users.splice(t.users.indexOf(u),1); to.users.push(u); P.log(o.key,u,'team',t.name+' → '+f.team); } }
          again(); },
        onStatus:to=>{ if(to==='deactivated'&&lastAdmin()){ P.toast('Every organisation needs an active Admin'); return; } P.setStatus(o.key,u,to); again(); } });
    });
  }

  const css=document.createElement('style'); css.textContent=`
  .ao-edit{white-space:nowrap;flex:none;}
  .ao-who .ao-ph{display:flex;align-items:center;gap:5px;margin-top:1px;}
  .ao-who .ao-ph svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round;flex:none;}
  #drawer .dwr-head{position:relative;}
  .ao-hdedit{position:absolute;top:18px;right:52px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;display:grid;place-items:center;cursor:pointer;}
  .ao-hdedit:hover{background:rgba(255,255,255,.32);}
  .ao-hdedit svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
  #drawer .dwr-head .orglogo[data-aologo]{position:relative;cursor:pointer;overflow:hidden;}
  .ao-logocam{position:absolute;inset:0;display:grid;place-items:center;background:rgba(20,22,45,.55);color:#fff;opacity:0;transition:opacity .15s;}
  .ao-logocam svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
  #drawer .dwr-head .orglogo[data-aologo]:hover .ao-logocam,#drawer .dwr-head .orglogo[data-aologo]:focus-visible .ao-logocam{opacity:1;}
  #drawer .dwr-head .orglogo[data-aologo]:focus-visible{outline:2px solid #fff;outline-offset:2px;}
  .ao-sechd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}
  .ao-sechd h4{margin:0;}
  #drawer .dwr-head>div:not(.orglogo){flex:1 1 auto;min-width:0;}
  .sd-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:5px;font-size:12.5px;color:var(--ink-3);}
  .sd-sub span{white-space:nowrap;}
  .sd-sub span+span:not(.stbadge)::before{content:"·";margin-right:8px;color:var(--ink-3);}
  .sd-sub .stbadge+span::before{content:none;}
  .sd-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line-soft);border:1px solid var(--line-soft);border-radius:14px;overflow:hidden;margin-bottom:16px;}
  .sd-stats div{background:#fff;padding:13px 14px;}
  .sd-stats b{display:block;font-family:var(--serif);font-weight:500;font-size:22px;line-height:1.05;color:var(--ink);}
  .sd-stats span{display:block;margin-top:4px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
  @media(max-width:560px){.sd-stats{grid-template-columns:minmax(0,1fr);}}
  .sd-group{margin-top:22px;padding-top:18px;border-top:1px solid var(--line-soft);}
  .sd-gh{font-family:var(--serif);font-weight:500;font-size:19px;margin:0 0 10px;}
  .sd-group .dwr-sec{margin-top:0;}
  .sd-fold>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;}
  .sd-fold>summary::-webkit-details-marker{display:none;}
  .sd-fold>summary .sd-gh{margin:0;}
  .sd-fold[open]>summary{margin-bottom:10px;}
  .sd-chev{width:9px;height:9px;border-right:2px solid var(--ink-3);border-bottom:2px solid var(--ink-3);transform:rotate(45deg);transition:transform .18s;margin-right:4px;flex:none;}
  .sd-fold[open] .sd-chev{transform:rotate(-135deg);}
  .sd-fold>summary:hover .sd-chev{border-color:var(--periwinkle-deep);}
  .sd-subfold>summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none;}
  .sd-subfold>summary::-webkit-details-marker{display:none;}
  .sd-subfold>summary h4{margin:0;}
  .sd-subfold[open]>summary{margin-bottom:10px;}
  .sd-fold .sd-subfold:not([open])>summary .sd-chev{transform:rotate(45deg);}
  .sd-fold .sd-subfold[open]>summary .sd-chev{transform:rotate(-135deg);}
  .sd-subfold>summary:hover .sd-chev{border-color:var(--periwinkle-deep);}
  /* Product Feed body: the sections were flush against each other — give each its own band */
  #drawer .sd-foldbody>.dwr-sec{padding:16px 0;border-top:1px solid var(--line-soft);}
  #drawer .sd-foldbody>.dwr-sec:first-child{border-top:0;padding-top:4px;}
  #drawer .sd-foldbody .dwr-sec>h4{margin:0 0 12px;}
  #drawer .sd-foldbody .kv{row-gap:10px;}
  #drawer .sd-foldbody .map-actions{margin-top:16px;gap:10px;flex-wrap:wrap;}
  #drawer .sd-foldbody .dwr-sec .btn{white-space:nowrap;}
  #drawer .sd-foldbody .dwr-sec>div[style*="display:flex"]{gap:10px!important;}
  .sd-subfold>summary h4{flex:1;min-width:0;white-space:nowrap;}
  #drawer .sd-addr{display:flex;flex-direction:column;gap:1px;}
  /* Details list: more air between rows, and value cells allowed to shrink so a long
     address line truncates instead of running off the panel edge */
  #drawer .dwr-sec .kv{row-gap:14px;align-items:start;}
  #drawer .dwr-sec .kv>.v{min-width:0;}
  #drawer .sd-abook{display:grid;gap:14px;padding:2px 0 4px;}
  #drawer .sd-aent{background:var(--paper);border-radius:10px;padding:10px 12px;}
  #drawer .sd-aent[open]{padding-bottom:12px;}
  #drawer .sd-aent>summary em{margin-top:3px;}
  #drawer .sd-aent>span{line-height:1.55;}
  #drawer .sd-aent>summary::before{left:2px;top:6px;}
  #drawer .sd-specs{gap:7px;padding-top:1px;}
  #drawer .sd-aent{display:block;min-width:0;}
  #drawer .sd-aent>span{display:block;padding-left:17px;}
  #drawer .sd-aent>summary{list-style:none;cursor:pointer;position:relative;padding-left:17px;min-width:0;}
  #drawer .sd-aent>summary::-webkit-details-marker{display:none;}
  #drawer .sd-aent>summary::before{content:"";position:absolute;left:2px;top:5px;width:6px;height:6px;border-right:2px solid var(--ink-3);border-bottom:2px solid var(--ink-3);transform:rotate(-45deg);transition:transform .15s;}
  #drawer .sd-aent[open]>summary::before{transform:rotate(45deg);top:3px;}
  #drawer .sd-aent>summary em{display:block;font-style:normal;font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #drawer .sd-aent[open]>summary em{display:none;}
  #drawer .sd-aent>summary b{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--ink);margin-bottom:2px;}
  #drawer .sd-aent>summary b i{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:var(--periwinkle-deep);border-radius:999px;padding:1px 7px;}
  #drawer .sd-specs{display:flex;flex-wrap:wrap;gap:5px;}
  #drawer .sd-spec{font-size:11px;font-weight:700;color:var(--ink);background:rgba(0,151,216,.5);border-radius:999px;padding:2px 9px;white-space:nowrap;}
  #drawer .dwr-body>[data-entkey]{margin-top:22px;padding-top:22px;border-top:1px solid var(--line-soft);}
  #drawer .dwr-body>.dwr-foot{position:sticky;bottom:0;z-index:4;background:#fff;margin:14px -22px 0;padding:12px 22px;border-top:1px solid var(--line-soft);box-shadow:0 -8px 18px rgba(20,22,45,.06);}
  .ao-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;}
  .ao-hd h4{margin:0;}
  .ao-acts{display:flex;gap:6px;flex:none;}
  .ao-acts .btn{white-space:nowrap;flex:none;}
  .ao-note{font-size:12px;color:var(--ink-3);margin:0 0 8px;}
  .ao-team{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:12px 0 4px;}
  .ao-team span{background:var(--paper-2);border-radius:999px;padding:1px 7px;margin-left:4px;}
  .ao-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid var(--paper-2);padding:9px 2px;cursor:pointer;font:inherit;}
  .ao-row:hover{background:var(--paper);}
  .ao-av{width:32px;height:32px;border-radius:50%;background:var(--periwinkle);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:800;overflow:hidden;flex:none;}
  .ao-who{flex:1;min-width:0;}
  .ao-who b{display:block;font-size:13px;color:var(--ink);}
  .ao-who em{display:block;font-style:normal;font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ao-role{font-size:12px;font-weight:700;color:var(--ink-2);white-space:nowrap;}
  .ao-chat{width:30px;height:30px;flex:none;display:grid;place-items:center;border-radius:8px;border:1.5px solid var(--line-soft);background:#fff;color:var(--periwinkle-deep);cursor:pointer;}
  .ao-chat svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;}
  .ao-chat:hover{border-color:var(--periwinkle);background:var(--tint-peri,#eceefb);}
  .ao-chat.off{color:var(--ink-3);opacity:.45;cursor:not-allowed;}
  .ao-chat.off:hover{border-color:var(--line-soft);background:#fff;}
  .ao-st{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:2px 8px;white-space:nowrap;}
  .ao-st.s-active{background:var(--tint-green);color:var(--green-deep);}
  .ao-st.s-invited{background:#fbeccd;color:#8a5a12;}
  .ao-st.s-deactivated{background:var(--paper-2);color:var(--ink-3);}
  .ao-empty{font-size:12.5px;color:var(--ink-3);margin:6px 0;}

  /* ---- Merchsmith brand layer (organisation drawers) ----
     Periwinkle header band carrying a cropped slice of the multi-colour outlined
     wordmark (the brand's pattern device), a stat strip keyed to the four accent
     colours, and serif headings. White type on --periwinkle-deep ≈ 6:1. */
  #drawer.ao-brand .dwr-head{position:relative;overflow:hidden;background:var(--periwinkle-deep,#5860A6);color:#fff;border-bottom:0;}
  #drawer.ao-brand .dwr-head::before{content:"";position:absolute;inset:0;pointer-events:none;
    background:url('assets/merchsmith-outline-art.svg') no-repeat 58% 44%/auto 330%;opacity:.28;mix-blend-mode:screen;}
  #drawer.ao-brand .dwr-head>*{position:relative;}
  #drawer.ao-brand .dwr-head h2{color:#fff;}
  #drawer.ao-brand .dwr-head .orglogo{box-shadow:0 0 0 3px rgba(255,255,255,.35);}
  #drawer.ao-brand .dwr-head .dwr-x{color:#fff;opacity:.85;}
  #drawer.ao-brand .dwr-head .dwr-x:hover{opacity:1;}
  #drawer.ao-brand .dwr-head div[style*="text-soft"],#drawer.ao-brand .sd-sub{color:rgba(255,255,255,.92)!important;}
  #drawer.ao-brand .sd-sub span+span:not(.stbadge)::before{color:rgba(255,255,255,.7);}
  #drawer.ao-brand .sd-sub .stbadge{background:#fff;color:var(--periwinkle-ink,#3C4279);}
  #drawer.ao-brand .sd-stats{border:0;background:none;gap:10px;}
  #drawer.ao-brand .sd-stats div{border-radius:12px;border:1px solid var(--line-soft);border-top:4px solid var(--spearmint,#36C0A0);}
  #drawer.ao-brand .sd-stats div:nth-child(2){border-top-color:var(--sky,#0097D8);}
  #drawer.ao-brand .sd-stats div:nth-child(3){border-top-color:var(--blossom,#FFA2A5);}
  #drawer.ao-brand .sd-stats div:nth-child(4){border-top-color:var(--zest,#FFEB3D);}
  #drawer.ao-brand .dwr-sec>h4,#drawer.ao-brand .ao-hd h4,#drawer.ao-brand .ao-sechd h4{display:flex;align-items:center;gap:8px;}
  #drawer.ao-brand .dwr-sec>h4::before,#drawer.ao-brand .ao-hd h4::before,#drawer.ao-brand .ao-sechd h4::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--periwinkle,#7B85C5);flex:none;}
  #drawer.ao-brand .ao-people h4::before{background:var(--blossom,#FFA2A5);}
  #drawer.ao-brand .ao-sechd h4::before{background:var(--sky,#0097D8);}
  #drawer.ao-brand .sd-gh{display:inline-block;white-space:nowrap;}
  #drawer.ao-brand .ao-av{box-shadow:0 0 0 2px #fff,0 0 0 3.5px var(--blossom,#FFA2A5);}
  #drawer.ao-brand .ao-row:hover{background:rgba(255,162,165,.1);}
  #drawer.ao-brand .ao-acts .btn:not(.ghost){background:var(--periwinkle,#7B85C5);}`;
  document.head.appendChild(css);
  window.MSAdminOrgs={enhance,orgOf};
})();
