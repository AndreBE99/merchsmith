/* ============================================================
   identity.js — ONE shared identity model + global switcher.
   Include on every live page (after tokens.css / theme.js).
   - Single source of truth for "who am I logged in as".
   - Renders the co-brand lockup consistently (customer × distributor,
     or the Merchsmith mark for the platform admin).
   - Injects a floating "Viewing as" switcher so the whole platform
     reflects one identity. Persists in localStorage('ms-identity').
   Pages can read window.MSID.current() and listen to 'ms-identity-change'.
   ============================================================ */
(function(){
  if(window.MSID) return;

  const DISTRIBUTOR = { name:'Mojo Promotions' };                          // the distributor brand running this instance
  const CUSTOMER    = { name:'Citrix', short:'CX' }; // the demo customer org (buyer of merch)
  const SUPPLIER    = { name:'BagWorks UK', short:'BW' };          // the demo supplier org

  // nav keys: home, merch, store, orgs, platform  (chrome.js renders these)
  const IDENTITIES = {
    admin:       { label:'Platform Admin', who:'Morgan Slade', role:'Operator',      land:'Merchsmith Admin.html', accent:'#23231f',
                   nav:['platform'] },
    distributor: { label:'Distributor',    who:'Jess Doyle',   role:'Account Admin', photo:'assets/avatars/av1.jpg', land:'Merchsmith Home.html',  accent:'var(--periwinkle-deep)',
                   nav:['home','store','orgs'] },
    customer:    { label:'Customer',       who:'Sara Kemp',    role:'Brand Admin',   photo:'assets/avatars/av2.jpg', land:'Merchsmith Home.html',  accent:'var(--slate,#51768c)',
                   nav:['home','merch','store'] },
    supplier:    { label:'Supplier',       who:'Tom Reed',     role:'Production',    photo:'assets/avatars/av3.jpg', land:'Merchsmith Home.html',  accent:'#2f8f5b',
                   nav:['home'] }   // suppliers get NO Your Merch / Store
  };
  // Prefer bundled blob URLs (standalone export) when present; else the file path.
  (function(){ const R=window.__resources||{}; const map={'assets/avatars/av1.jpg':'av1','assets/avatars/av2.jpg':'av2','assets/avatars/av3.jpg':'av3'};
    Object.values(IDENTITIES).forEach(d=>{ if(d.photo && R[map[d.photo]]) d.photo=R[map[d.photo]]; }); })();
  const ORDER = ['admin','distributor','customer','supplier'];
  const KEY = 'ms-identity';

  function current(){ if(window.MS_SCOPE==='platform') return 'admin';
    try{ const v=localStorage.getItem(KEY); return IDENTITIES[v]?v:'distributor'; }catch(e){ return 'distributor'; } }
  function set(id){ if(!IDENTITIES[id]) return; try{ localStorage.setItem(KEY,id); }catch(e){}
    // keep legacy per-page role flags in sync so existing views pick it up
    try{ if(id==='customer'||id==='distributor') localStorage.setItem('ms-role', id==='customer'?'cust':'dist'); }catch(e){}
    window.dispatchEvent(new CustomEvent('ms-identity-change',{detail:id}));
  }

  // ---- co-brand lockup HTML (role-aware) ----
  function mark(name, h, fallbackCls){
    return `<span class="${fallbackCls}">${name}</span>`;
  }
  // organisation names come from the Organisation profile when one has been saved
  const orgName=(k,fb)=>{ try{ return (window.MSORG&&MSORG.name(k))||fb; }catch(e){ return fb; } };
  function imgMark(key,alt,h){ try{ const url=localStorage.getItem(key); if(url) return `<img class="msid-logoimg" src="${url}" alt="${alt}" style="height:${h}px;width:auto;display:block">`; }catch(e){} return ''; }
  function distMark(h){
    // distributor's uploaded platform logo (with mono tone) overrides the wordmark
    try{
      const url=localStorage.getItem('ms-brand-logo');
      if(url){ const tone=localStorage.getItem('ms-brand-logo-tone')||'original';
        const filt = tone==='white' ? 'filter:brightness(0) invert(1);' : tone==='black' ? 'filter:brightness(0);' : '';
        return `<img class="msid-logoimg" src="${url}" alt="${DISTRIBUTOR.name}" style="height:${h}px;width:auto;display:block;${filt}">`;
      }
    }catch(e){}
    return mark(orgName('distributor',DISTRIBUTOR.name), h, 'msid-mojo');
  }
  function custMark(h){
    try{
      const url=localStorage.getItem('ms-cust-logo');
      if(url){ const tone=localStorage.getItem('ms-cust-logo-tone')||'original';
        const filt = tone==='white' ? 'filter:brightness(0) invert(1);' : tone==='black' ? 'filter:brightness(0);' : '';
        return `<img class="msid-logoimg" src="${url}" alt="${CUSTOMER.name}" style="height:${h}px;width:auto;display:block;${filt}">`;
      }
    }catch(e){}
    return mark(orgName('customer',CUSTOMER.name), h, 'msid-custname');
  }
  function lockupHTML(id){
    id = id||current();
    if(id==='admin'){
      return `<span class="msid-lock"><img class="msid-mslogo" src="assets/merchsmith-wordmark-white.png" alt="Merchsmith"></span>`;
    }
    if(id==='customer'){ // distributor mark first, then the customer they're housed under
      return `<span class="msid-lock"><span class="msid-logo">${distMark(28)}</span><span class="msid-x">×</span><span class="msid-logo">${custMark(26)}</span></span>`;
    }
    if(id==='supplier'){ // distributor first, then the supplier
      return `<span class="msid-lock"><span class="msid-logo">${distMark(28)}</span><span class="msid-x">×</span><span class="msid-logo">${imgMark('ms-sup-logo',SUPPLIER.name,26)||mark(orgName('supplier',SUPPLIER.name),26,'msid-custname')}</span></span>`;
    }
    // distributor: their own brand
    return `<span class="msid-lock"><span class="msid-logo">${distMark(28)}</span></span>`;
  }

  // ---- styles ----
  const css = `
  .msid-lock{display:inline-flex;align-items:center;gap:11px;font-family:var(--sans);}
  .msid-mslogo{height:22px;width:auto;display:block;}
  .msid-logo{display:inline-flex;align-items:center;}
  .msid-logo svg{display:block;}
  .msid-custname,.msid-mojo,.msid-merch{font-family:var(--serif,"EB Garamond",Georgia,serif);font-weight:500;font-size:23px;line-height:1;color:#fff;letter-spacing:-.01em;}
  .msid-x{color:#fff;font-size:17px;opacity:.7;font-family:var(--serif,Georgia,serif);}
  .msid-merch{font-family:var(--serif);font-weight:600;font-size:26px;color:var(--periwinkle-deep);letter-spacing:-.01em;}
  .msid-admintag{font-size:9.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#fff;background:#23231f;border-radius:5px;padding:3px 8px;margin-left:9px;}

  .msid-switch{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:1500;font-family:var(--sans);}
  .msid-btn{display:inline-flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(20,22,45,.12);border-radius:999px;
    padding:8px 14px 8px 10px;font-size:12.5px;font-weight:700;color:var(--ink,#23231f);cursor:pointer;box-shadow:0 8px 26px rgba(20,22,45,.16);}
  .msid-btn .swatch{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:9px;font-weight:800;}
  .msid-btn .cap{opacity:.6;font-weight:600;}
  .msid-btn .chev{width:14px;height:14px;color:var(--muted,#999);transition:transform .18s;}
  .msid-switch.open .chev{transform:rotate(180deg);}
  .msid-menu{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#fff;border:1px solid rgba(20,22,45,.1);border-radius:14px;
    box-shadow:0 18px 44px rgba(20,22,45,.22);padding:7px;min-width:248px;display:none;}
  .msid-switch.open .msid-menu{display:block;}
  .msid-head{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#999);padding:7px 11px 5px;}
  .msid-opt{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;font:inherit;font-size:13.5px;font-weight:600;
    color:var(--ink,#23231f);padding:9px 11px;border-radius:9px;cursor:pointer;text-align:left;}
  .msid-opt:hover{background:var(--paper,#f4f5f8);}
  .msid-opt.on{color:var(--periwinkle-deep);}
  .msid-opt .swatch{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;color:#fff;font-size:10px;font-weight:800;flex:none;}
  .msid-opt .meta{flex:1;line-height:1.2;}
  .msid-opt .meta small{display:block;font-size:11px;color:var(--muted,#999);font-weight:600;}
  .msid-opt .tick{color:var(--periwinkle-deep);font-weight:800;opacity:0;}
  .msid-home{flex:none;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--muted,#999);}
  .msid-home svg{width:15px;height:15px;}
  .msid-home:hover{background:var(--tint-peri,#eceef9);color:var(--periwinkle-deep);}
  .msid-opt.on .tick{opacity:1;}
  .msid-foot{font-size:10.5px;color:var(--muted,#999);padding:6px 11px 4px;border-top:1px solid rgba(20,22,45,.07);margin-top:4px;}
  @media(max-width:640px){.msid-btn .cap,.msid-btn .lbl{display:none;}}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  const initial = c => c.split(/[\s&]+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();

  // ---- build the floating switcher ----
  function build(){
    // populate any lockup placeholders on the page
    document.querySelectorAll('[data-identity-lockup]').forEach(el=>{ el.innerHTML=lockupHTML(); });

    const cur=current();
    const wrap=document.createElement('div'); wrap.className='msid-switch'; wrap.id='msidSwitch';
    const c=IDENTITIES[cur];
    wrap.innerHTML=`
      <button class="msid-btn" id="msidBtn">
        <span class="swatch" style="background:${c.accent}">${initial(c.who)}</span>
        <span class="cap">Viewing as</span> <span class="lbl">${c.label}</span>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="msid-menu" role="menu">
        <div class="msid-head">Viewing the platform as</div>
        ${ORDER.map(k=>{ const i=IDENTITIES[k]; return `<button class="msid-opt ${k===cur?'on':''}" data-id="${k}">
          <span class="swatch" style="background:${i.accent}">${initial(i.who)}</span>
          <span class="meta">${i.label}<small>${i.who} · ${i.role}</small></span>
          <span class="msid-home" data-home="${k}" title="Go to ${i.label} home page" role="button" tabindex="0"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg></span>
          <span class="tick">✓</span></button>`; }).join('')}
        <div class="msid-foot">Prototype control — switches the whole platform's perspective.</div>
      </div>`;
    document.body.appendChild(wrap);

    const btn=wrap.querySelector('#msidBtn');
    btn.addEventListener('click',e=>{ e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click',()=>wrap.classList.remove('open'));
    // home shortcut: jump straight to that identity's home page (switching to it first)
    wrap.querySelectorAll('.msid-home').forEach(h=>h.addEventListener('click',e=>{
      e.stopPropagation(); const id=h.dataset.home; if(id!==cur) set(id); location.href=IDENTITIES[id].land;
    }));
    wrap.querySelectorAll('.msid-opt').forEach(o=>o.addEventListener('click',(e)=>{
      if(e.target.closest('.msid-home')) return;
      const id=o.dataset.id; if(id===cur){ wrap.classList.remove('open'); return; }
      set(id);
      // customer & distributor share the same pages — stay on the current page; otherwise go to the role's landing context
      const sharePair = (a,b)=>[a,b].every(x=>x==='customer'||x==='distributor');
      if(sharePair(cur,id)){ location.reload(); }
      else { location.href = IDENTITIES[id].land; }
    }));
  }

  // the signed-in person's own profile edits (My profile) override the seed identity
  function withProfile(k){ const base=IDENTITIES[k]; try{ const s=JSON.parse(localStorage.getItem('ms-people')||'null');
      const m=s&&s.me&&s.me[k]; if(!m) return base; const o=Object.assign({},base);
      if(m.n) o.who=m.n; if(m.title) o.title=m.title; if(m.email) o.email=m.email; if(m.tel) o.tel=m.tel;
      const p=s.photos&&s.photos[(o.who||'').toLowerCase()]; if(p) o.photo=p; else if(m.photo==='') delete o.photo;
      return o; }catch(e){ return base; } }
  window.addEventListener('ms-org-updated',()=>{ document.querySelectorAll('[data-identity-lockup],.header .brand').forEach(b=>{ if(b.querySelector('.msid-lock')) b.innerHTML=lockupHTML(); }); });
  window.MSID = { current, set, get:()=>withProfile(current()), all:IDENTITIES, lockupHTML, initial, SUPPLIER,
    setSupplier(name){ if(!name) return SUPPLIER.name; SUPPLIER.name=name;
      SUPPLIER.short=name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
      this.relock(); return SUPPLIER.name; },
    relock(){ document.querySelectorAll('[data-identity-lockup]').forEach(el=>{ el.innerHTML=lockupHTML(); }); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
