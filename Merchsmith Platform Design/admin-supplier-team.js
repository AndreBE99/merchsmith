/* ============================================================
   admin-supplier-team.js — "Supplier team" section for the
   platform-admin supplier drawer. The people at the supplier the
   platform deals with (account manager, data/feeds, customer
   service, decoration). Seeds realistic defaults per supplier on
   first view, then persists edits to localStorage('ms-supplier-teams').
   Renders into the drawer via MSSupplierTeam.section(s); invite /
   remove / role-change handled by delegated clicks + a small modal.
   ============================================================ */
window.MSSupplierTeam=(function(){
  const A=window.ADMIN;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const av=n=>String(n||'?').replace(/[^A-Za-z ]/g,'').split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()||String(n||'?').slice(0,2).toUpperCase();
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2600); }; })();
  const KEY='ms-supplier-teams';
  const ROLES=['Account manager','Data & feeds','Customer service','Decoration','Finance'];

  // realistic seed contacts per known supplier (clearly mock; editable after)
  const SEEDS={
    xd:[ {name:'Sanne de Vries',email:'sanne@xdconnects.com',tel:'+31 20 794 3120',role:'Account manager',status:'active'},
         {name:'Lars Hofman',email:'lars@xdconnects.com',tel:'+31 20 794 3127',role:'Data & feeds',status:'active'} ],
    pf:[ {name:'Émile Dubois',email:'emile@pfconcept.com',tel:'+31 528 239 410',role:'Account manager',status:'active'},
         {name:'Marta Nowak',email:'marta@pfconcept.com',tel:'+31 528 239 452',role:'Data & feeds',status:'active'} ],
    midocean:[ {name:'Joost Smit',email:'joost@midocean.com',tel:'+31 10 205 7718',role:'Account manager',status:'active'} ],
    senator:[ {name:'Anja Keller',email:'anja@senator.com',tel:'+49 7151 4020 36',role:'Account manager',status:'active'} ],
    printhouse:[ {name:'Owen Pryce',email:'owen@printhouse.co',tel:'+44 20 3927 1840',role:'Account manager',status:'active'},
                 {name:'Decoration studio',email:'studio@printhouse.co',tel:'+44 20 3927 1845',role:'Decoration',status:'active'} ],
    inkwell:[ {name:'Priya Shah',email:'priya@inkwellprint.co.uk',tel:'+44 161 870 2291',role:'Account manager',status:'invited'} ],
    greenstock:[ {name:'Tom Hale',email:'tom@greenstock.eco',tel:'+44 117 325 6604',role:'Account manager',status:'active'} ]
  };

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } }
  function save(all){ try{ localStorage.setItem(KEY, JSON.stringify(all)); }catch(e){} }
  function uid(){ return 't'+Math.random().toString(36).slice(2,8); }
  function seedFor(s){
    if(window.MSMODE&&MSMODE.isBlank()) return []; // blank mode — no seeded contacts
    const base=SEEDS[s.id] || [{ name:(s.name||'Supplier')+' contact', email:'hello@'+(s.domain||'supplier.com'), role:'Account manager', status:'active' }];
    return base.map(m=>Object.assign({id:uid()},m));
  }
  function teamOf(s){ const all=load(); if(!all[s.id]){ all[s.id]=seedFor(s); save(all); }
    const seed=SEEDS[s.id]||[]; let ch=false;
    all[s.id].forEach(m=>{ if(m.tel) return; const hit=seed.find(x=>x.email&&m.email&&x.email.toLowerCase()===m.email.toLowerCase()); if(hit&&hit.tel){ m.tel=hit.tel; ch=true; } });
    if(ch) save(all); return all[s.id]; }
  function setTeam(supId,list){ const all=load(); all[supId]=list; save(all); }

  function section(s){
    if(!s || s.kind==null) return '';
    const team=teamOf(s);
    const canInvite = s.canInviteUsers!==false; // suppliers can manage their own people
    const rows=team.map(m=>`<div class="suprow" data-stid="${m.id}">
        <span class="supav">${av(m.name||m.email)}</span>
        <div class="supmeta"><b>${esc(m.name||'—')}</b><span>${m.email?`<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>`:''}</span></div>
        <select class="suproleSel" data-stteam="${s.id}" data-strole="${m.id}">${ROLES.map(r=>`<option ${r===m.role?'selected':''}>${r}</option>`).join('')}</select>
        ${m.status==='invited'?'<span class="stbadge st-invited">Invited</span>':''}
        <button class="as-udel" data-stdel="${s.id}:${m.id}" title="Remove">×</button>
      </div>`).join('');
    return `<div class="dwr-sec"><h4>Supplier team · ${team.length}</h4>
      <p class="supnote" style="margin:0 0 10px">The people at ${esc(s.name)} the platform works with — account management, data/feeds and service contacts.${canInvite?' This supplier can also invite their own users.':''}</p>
      <div class="suplist">${rows||'<p class="as-emptyrow">No team members yet.</p>'}</div>
      <button class="btn ghost sm" data-stinvite="${s.id}" style="margin-top:12px"><svg class="icn" style="width:15px;height:15px"><path d="M12 5v14M5 12h14"/></svg>Invite teammate</button>
    </div>`;
  }

  /* ---- invite modal ---- */
  function invite(supId){
    const s=A.suppliers.find(x=>x.id===supId); if(!s) return;
    let wrap=document.getElementById('stModal'); if(!wrap){ wrap=document.createElement('div'); wrap.id='stModal'; wrap.className='st-scrim'; document.body.appendChild(wrap); }
    wrap.innerHTML=`<div class="st-modal"><div class="st-hd"><b>Invite teammate</b><span>${esc(s.name)}</span><button class="dwr-x" data-stx>×</button></div>
      <div class="st-body">
        <label class="fm-f"><span>Name</span><input id="stName" placeholder="Full name"></label>
        <label class="fm-f"><span>Email</span><input id="stEmail" type="email" placeholder="name@${esc(s.domain||'supplier.com')}"></label>
        <label class="fm-f"><span>Role</span><select id="stRole">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select></label>
      </div>
      <div class="st-foot"><button class="btn ghost" data-stx>Cancel</button><button class="btn" id="stSend">Send invite</button></div></div>`;
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>wrap.remove(),200); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-stx]')) close(); });
    setTimeout(()=>{ const n=document.getElementById('stName'); if(n)n.focus(); },60);
    document.getElementById('stSend').onclick=()=>{
      const name=document.getElementById('stName').value.trim();
      const email=document.getElementById('stEmail').value.trim();
      const role=document.getElementById('stRole').value;
      if(!email){ document.getElementById('stEmail').focus(); toast('Add an email address'); return; }
      const team=teamOf(s); team.push({ id:uid(), name:name||email.split('@')[0], email, role, status:'invited' }); setTeam(supId,team);
      close(); toast(`Invite sent to ${email}`); if(window.__openSupplier) window.__openSupplier(supId);
    };
  }

  /* ---- delegated actions ---- */
  document.addEventListener('click',e=>{
    const inv=e.target.closest('[data-stinvite]'); if(inv){ e.stopPropagation(); invite(inv.dataset.stinvite); return; }
    const del=e.target.closest('[data-stdel]'); if(del){ e.stopPropagation(); const [sid,mid]=del.dataset.stdel.split(':'); const t=load()[sid]||[]; setTeam(sid, t.filter(m=>m.id!==mid)); if(window.__openSupplier) window.__openSupplier(sid); return; }
  });
  document.addEventListener('change',e=>{
    const sel=e.target.closest('[data-strole]'); if(sel){ const sid=sel.dataset.stteam, mid=sel.dataset.strole; const t=load()[sid]||[]; const m=t.find(x=>x.id===mid); if(m){ m.role=sel.value; setTeam(sid,t); toast('Role updated'); } }
  });

  /* ---- styles ---- */
  (function(){ if(document.getElementById('st-style'))return; const st=document.createElement('style'); st.id='st-style';
    st.textContent=`
    .suproleSel{font:inherit;font-size:11.5px;font-weight:600;color:var(--text-soft,#6b6f76);border:1px solid var(--line-soft);border-radius:7px;padding:4px 7px;background:#fff;cursor:pointer;}
    .suprow .as-udel{margin-left:6px;}
    .st-scrim{position:fixed;inset:0;z-index:360;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .16s;}
    .st-scrim.open{opacity:1;}
    .st-modal{background:var(--paper,#fff);border-radius:16px;width:min(420px,100%);box-shadow:0 30px 80px rgba(20,22,45,.35);transform:translateY(10px);transition:transform .18s;overflow:hidden;}
    .st-scrim.open .st-modal{transform:none;}
    .st-hd{display:flex;align-items:baseline;gap:9px;padding:17px 20px 0;}
    .st-hd b{font-family:var(--serif,Georgia);font-weight:500;font-size:18px;} .st-hd span{font-size:12.5px;color:var(--muted);flex:1;}
    .st-hd .dwr-x{border:0;background:none;font-size:23px;line-height:1;color:var(--muted);cursor:pointer;}
    .st-body{padding:14px 20px 4px;display:flex;flex-direction:column;gap:12px;}
    .st-foot{display:flex;justify-content:flex-end;gap:9px;padding:8px 20px 18px;}
    `;
    document.head.appendChild(st);
  })();

  return { section, teamOf, invite, ROLES };
})();
