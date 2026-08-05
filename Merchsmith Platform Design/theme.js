/* ============================================================
   theme.js — shared colourway switcher
   Load in <head> AFTER tokens.css on every page:
     <script src="theme.js"></script>
   Applies the saved theme to <html data-theme> before paint (no flash),
   then injects a switcher into .headtools once the DOM is ready.
   Add a new colourway = add a :root[data-theme="id"] block in tokens.css
   plus an entry in THEMES below.
   ============================================================ */
(function(){
  'use strict';
  const THEMES = [
    { id:'default',  name:'Periwinkle', dot:'#7B85C5', vars:{'--periwinkle':'#7B85C5','--periwinkle-deep':'#5860A6','--periwinkle-ink':'#3C4279','--tint-peri':'#eceef9'} },
    { id:'woodland', name:'Woodland',   dot:'#32706B', vars:{'--periwinkle':'#32706B','--periwinkle-deep':'#295A56','--periwinkle-ink':'#1E423F','--tint-peri':'#e4eeec'} }
  ];
  // SCOPE: the Platform Admin (SaaS operator = Merchsmith) has its OWN colourway,
  // separate from the distributor's. A page opts into platform scope by setting
  // window.MS_SCOPE='platform' BEFORE loading theme.js. Distributor pages leave it
  // unset. Scoped keys keep the two colourways from overwriting each other.
  const SCOPE = (typeof window!=='undefined' && window.MS_SCOPE==='platform') ? 'platform' : 'dist';
  const CT_KEY = SCOPE==='platform' ? 'ms-platform-custom-themes' : 'ms-custom-themes';
  function customThemes(){ try{ return JSON.parse(localStorage.getItem(CT_KEY)||'[]'); }catch(e){ return []; } }
  function saveCustom(arr){ try{ localStorage.setItem(CT_KEY, JSON.stringify(arr)); }catch(e){} }
  function allThemes(){ return THEMES.concat(customThemes()); }
  const KEY = SCOPE==='platform' ? 'ms-platform-theme' : 'ms-theme';
  const valid = id => allThemes().some(t=>t.id===id);
  const current = () => { try{ const v=localStorage.getItem(KEY); return valid(v)?v:'default'; }catch(e){ return 'default'; } };
  const CT_VARS=['--periwinkle','--periwinkle-deep','--periwinkle-ink','--tint-peri'];
  function apply(id){
    const ds=document.documentElement.style; CT_VARS.forEach(v=>ds.removeProperty(v));
    const isCustom = id && id.indexOf('c-')===0;
    if(isCustom){
      document.documentElement.removeAttribute('data-theme');
      const t=customThemes().find(x=>x.id===id);
      if(t&&t.vars){ for(const k in t.vars) ds.setProperty(k, t.vars[k]); }
      return;
    }
    if(id==='default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', id);
  }
  // apply immediately (runs during head parse -> no flash of default)
  apply(current());

  function injectStyle(){
    if(document.getElementById('cwsw-style')) return;
    const s=document.createElement('style'); s.id='cwsw-style';
    s.textContent = `
    .cwsw{position:relative;font-family:var(--sans,sans-serif);}
    .cwsw-btn{display:inline-flex;align-items:center;gap:7px;background:var(--paper-2);border:0;border-radius:999px;padding:6px 11px;cursor:pointer;font-size:12.5px;font-weight:700;color:var(--ink-3);transition:color .15s;}
    .cwsw-btn:hover{color:var(--periwinkle-deep);}
    .cwsw-dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.16);flex:none;}
    .cwsw-chev{width:13px;height:13px;color:var(--muted);transition:transform .18s;}
    .cwsw.open .cwsw-chev{transform:rotate(180deg);}
    .cwsw-menu{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid var(--line-soft);border-radius:12px;box-shadow:0 14px 34px rgba(20,22,45,.16);padding:6px;min-width:176px;display:none;z-index:400;}
    .cwsw.open .cwsw-menu{display:block;}
    .cwsw-head{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:6px 11px 4px;}
    .cwsw-opt{display:flex;align-items:center;gap:9px;width:100%;border:0;background:none;font-family:var(--sans,sans-serif);font-size:13px;font-weight:600;color:var(--ink,#222);padding:9px 11px;border-radius:8px;cursor:pointer;text-align:left;}
    .cwsw-opt:hover{background:var(--paper-2);}
    .cwsw-opt.on{color:var(--periwinkle-deep);}
    .cwsw-opt.on::after{content:'';width:7px;height:7px;border-radius:50%;background:var(--periwinkle-deep);margin-left:auto;}
    @media(max-width:1120px){.cwsw-nm{display:none;}.cwsw-btn{padding:6px 9px;}}
    `;
    document.head.appendChild(s);
  }

  function build(){
    const tools = document.querySelector('.headtools');
    if(!tools || document.getElementById('cwSwitch')) return;
    const cur = current();
    const list = allThemes();
    const curT = list.find(t=>t.id===cur) || list[0];
    const dotOf = t => t.dot || (t.vars&&t.vars['--periwinkle']) || '#7B85C5';
    const wrap = document.createElement('div');
    wrap.className='cwsw'; wrap.id='cwSwitch';
    wrap.innerHTML = `
      <button class="cwsw-btn" aria-haspopup="true" aria-expanded="false" title="Colourway">
        <span class="cwsw-dot" style="background:${dotOf(curT)}"></span>
        <span class="cwsw-nm">${curT.name}</span>
        <svg class="cwsw-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="cwsw-menu" role="menu">
        <div class="cwsw-head">Colourway</div>
        ${list.map(t=>`<button class="cwsw-opt ${t.id===cur?'on':''}" data-id="${t.id}" role="menuitemradio" aria-checked="${t.id===cur}"><span class="cwsw-dot" style="background:${dotOf(t)}"></span>${t.name}</button>`).join('')}
      </div>`;
    const anchor = document.getElementById('roleSwitch');
    if(anchor) tools.insertBefore(wrap, anchor); else tools.insertBefore(wrap, tools.firstChild);

    const btn=wrap.querySelector('.cwsw-btn'), menu=wrap.querySelector('.cwsw-menu');
    btn.addEventListener('click', e=>{ e.stopPropagation(); const open=wrap.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', ()=>{ if(wrap.classList.contains('open')){ wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false'); } });
    menu.querySelectorAll('.cwsw-opt').forEach(o=>o.addEventListener('click', e=>{
      e.stopPropagation();
      const id=o.dataset.id; try{ localStorage.setItem(KEY,id); }catch(err){}
      apply(id); // live recolour — CSS variables cascade instantly
      const t=allThemes().find(x=>x.id===id)||list[0];
      wrap.querySelector('.cwsw-btn .cwsw-dot').style.background=dotOf(t);
      wrap.querySelector('.cwsw-nm').textContent=t.name;
      menu.querySelectorAll('.cwsw-opt').forEach(x=>{ const on=x.dataset.id===id; x.classList.toggle('on',on); x.setAttribute('aria-checked',String(on)); });
      wrap.classList.remove('open'); btn.setAttribute('aria-expanded','false');
    }));
  }

  function init(){ try{ injectStyle(); }catch(e){} try{ build(); }catch(e){} applyCrumbRetry(); }
  // Defer the sync branch to a microtask so the rest of this IIFE finishes first
  // (avoids a TDZ on `_crumbTries`/crumb fns when theme.js is inlined and the
  // document is already loaded, e.g. in a bundled/standalone export).
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init,0);

  // ---- breadcrumb header colour, per menu category ----
  const CRUMB_KEY='ms-crumb-colours';
  const CRUMB_CATS=[
    {id:'dashboard',name:'Dashboard'},{id:'store',name:'Store'},{id:'projects',name:'Projects'},
    {id:'organisations',name:'Organisations'},{id:'team',name:'Team'},{id:'chats',name:'Chats'},
    {id:'brand',name:'Brand Assets'},{id:'orders',name:'Orders'},{id:'settings',name:'Settings'}
  ];
  function crumbColours(){ try{ return JSON.parse(localStorage.getItem(CRUMB_KEY)||'{}'); }catch(e){ return {}; } }
  function setCrumbColour(cat,hex){ const o=crumbColours(); if(hex) o[cat]=hex; else delete o[cat]; try{ localStorage.setItem(CRUMB_KEY,JSON.stringify(o)); }catch(e){} persistSidecar(); applyCrumb(); }
  function crumbCat(path){ path=path||location.pathname;
    if(/Home\.html/i.test(path)) return 'dashboard';
    if(/Store\.html/i.test(path)) return 'store';
    if(/Projects|Project -|Basket/i.test(path)) return 'projects';
    if(/Organisations/i.test(path)) return 'organisations';
    if(/Team\.html/i.test(path)) return 'team';
    if(/Chats\.html/i.test(path)) return 'chats';
    if(/Brand Assets/i.test(path)) return 'brand';
    if(/Orders\.html/i.test(path)) return 'orders';
    if(/Settings/i.test(path)) return 'settings';
    return null;
  }
  function lum(hex){ const m=(hex||'').replace('#','').match(/.{2}/g); if(!m) return 1; const [r,g,b]=m.map(h=>parseInt(h,16)/255); return 0.299*r+0.587*g+0.114*b; }
  function applyCrumb(){ const cat=crumbCat(); if(!cat) return; const col=crumbColours()[cat]; if(!col) return;
    let st=document.getElementById('ms-crumb-style'); if(!st){ st=document.createElement('style'); st.id='ms-crumb-style'; document.head.appendChild(st); }
    const txt = lum(col)<0.62 ? '#fff' : '#3a2420';
    st.textContent='.crumbband{background:'+col+'!important;} .crumbband .crumb,.crumbband .crumb .here,.crumbband .crumb a,.crumbband .crumb .sep,.crumbband .crumb-org{color:'+txt+'!important;}';
    // also set inline (beats page-local CSS) + survive late re-renders
    document.querySelectorAll('.crumbband').forEach(b=>{ b.style.setProperty('background',col,'important'); b.querySelectorAll('.crumb, .crumb .here, .crumb a, .crumb .sep, .crumb-org, .crumb span').forEach(t=>t.style.setProperty('color',txt,'important')); });
  }
  let _crumbTries=0; function applyCrumbRetry(){ try{ applyCrumb(); }catch(e){} if(++_crumbTries<6) setTimeout(applyCrumbRetry, _crumbTries*200); }

  const SIDE='ms-branding.state.json';
  const BKEYS=['ms-theme','ms-custom-themes','ms-platform-theme','ms-platform-custom-themes','ms-crumb-colours','ms-brand-logo','ms-brand-logo-tone','ms-pdf-logo','ms-pdf-logo-tone','ms-platform-logo','ms-platform-logo-tone','ms-platform-pdf-logo','ms-platform-pdf-logo-tone','ms-logo-tone-brand-header-logo','ms-logo-tone-brand-pdf-logo','ms-logo-tone-ms-admin-header-logo','ms-logo-tone-ms-admin-pdf-logo','ms-cust-logo','ms-cust-logo-tone','ms-logo-tone-cust-header-logo'];
  function persistSidecar(){ const w=window.omelette&&window.omelette.writeFile; if(!w)return; const o={}; BKEYS.forEach(k=>{ const v=localStorage.getItem(k); if(v!=null)o[k]=v; }); try{ w(SIDE, JSON.stringify(o)); }catch(e){} }
  // restore from project sidecar when this browser's localStorage is empty
  // (fresh device / cleared storage) — keeps branding with the project itself.
  try{ fetch(SIDE).then(r=>r.ok?r.json():null).then(o=>{ if(!o)return; let changed=false; BKEYS.forEach(k=>{ if(localStorage.getItem(k)==null && o[k]!=null){ try{ localStorage.setItem(k,o[k]); }catch(e){} changed=true; } }); if(changed){ apply(current()); if(window.MSID&&MSID.relock) MSID.relock(); } try{ applyCrumb(); }catch(e){} }).catch(()=>{}); }catch(e){}
  window.MSTheme = {
    builtins:THEMES, customThemes, allThemes, current, persist:persistSidecar,
    apply, set(id){ try{ localStorage.setItem(KEY,id); }catch(e){} apply(id); persistSidecar(); },
    addCustom(t){ const arr=customThemes(); t.id=t.id||('c-'+Date.now()); arr.push(t); saveCustom(arr); persistSidecar(); return t.id; },
    updateCustom(id,patch){ const arr=customThemes(); const t=arr.find(x=>x.id===id); if(t){ Object.assign(t,patch); saveCustom(arr); if(current()===id) apply(id); persistSidecar(); } return !!t; },
    removeCustom(id){ saveCustom(customThemes().filter(t=>t.id!==id)); if(current()===id) this.set('default'); persistSidecar(); },
    crumbCats:CRUMB_CATS, crumbColours, setCrumbColour, applyCrumb
  };
})();
