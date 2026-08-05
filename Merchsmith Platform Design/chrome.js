/* ============================================================
   chrome.js — ONE shared top-chrome (nav + tools) for every page.
   Include after identity.js. Standardises the header's centre nav
   and right-hand tools so navigation is identical platform-wide,
   and drives the account avatar from the shared identity model.
   Leaves the [data-identity-lockup] brand on the left intact.
   ============================================================ */
(function(){
  if(window.__msChrome) return; window.__msChrome=true;

  const path = decodeURIComponent(location.pathname);
  const on = re => re.test(path);
  const NAVDEF = {
    platform:{ label:'Platform', href:'Merchsmith Admin.html', icon:'M4 20h16M7 20v-6M12 20V9M17 20v-10', match:/Admin/i },
    home:{ label:'Dashboard', href:'Merchsmith Home.html', icon:'M4 20h16M7 20v-6M12 20V9M17 20v-10', match:/Home/i },
    merch:{ label:'Your Merch', href:'Merchsmith Projects.html', icon:'M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9', match:/Projects|Dashboard\.html|Gallery/i },
    store:{ label:'Store', href:'Merchsmith Store.html', icon:'M4 9.5 5.5 5h13L20 9.5M4 9.5h16v11H4zM4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0', match:/Store/i },
    orgs:{ label:'Organisations', href:'Merchsmith Organisations.html', icon:'M4 21V6l6-2.5V21M10 21V8.5L20 6v15M4 21h17', match:/Organisations|Distributor Settings/i }
  };
  const svg=(p)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="19" height="19"><path d="${p}"/></svg>`;

  const css=`
  .ms-topnav{display:flex;align-items:center;gap:4px;}
  .ms-topnav a{display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--ink-3,#57544c);font-family:var(--sans);font-weight:600;font-size:14px;padding:8px 14px;border-radius:999px;}
  .ms-topnav a:hover{color:var(--periwinkle-deep);background:var(--paper,#f4f5f8);}
  .ms-topnav a.on{color:var(--periwinkle-deep);font-weight:700;}
  .ms-htools{display:flex;align-items:center;gap:22px;color:#fff;}
  .ms-htools .it{position:relative;cursor:pointer;display:grid;place-items:center;}
  .ms-htools .it:hover{color:rgba(255,255,255,.7);}
  .ms-htools .b{position:absolute;top:-7px;right:-9px;background:var(--flare,#d2453a);color:#fff;font-size:10px;font-weight:700;border-radius:999px;min-width:16px;height:16px;display:grid;place-items:center;padding:0 3px;}
  .ms-htools .ava{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px;cursor:pointer;border:0;}
  .ms-topnav a svg,.ms-htools .it svg{width:19px!important;height:19px!important;display:inline-block!important;stroke:currentColor;fill:none;flex:none;visibility:visible!important;}
  .ms-htools .it{width:22px;height:22px;}
  .header{background:var(--periwinkle-deep)!important;border-bottom:0!important;position:sticky!important;top:0;z-index:50;}
  .header .headtools .it, .header .headtools .it svg, .header .headtools .it .icn,
  .ms-htools .it, .ms-htools a.it, .ms-htools .it svg, .ms-htools .it .icn{color:#fff!important;stroke:#fff!important;}
  .ms-htools .b, .header .headtools .b{stroke:none!important;}
  .ms-htools .ava{display:flex;align-items:center;gap:9px;height:36px;padding:0;border-radius:999px;background:none!important;border:0;box-shadow:none;color:#fff;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;}
  .ms-htools .ava:hover{background:none!important;}
  .ms-htools .ava img{width:36px;height:36px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.5);}
  .am-av img{width:100%;height:100%;border-radius:50%;object-fit:cover;}
  .ms-hsearch{flex:1;max-width:440px;margin:0 32px;display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:8px 15px;color:#fff;transition:background .15s,border-color .15s;}
  .ms-hsearch:focus-within{background:#fff;border-color:#fff;}
  .ms-hsearch svg{flex:none;color:rgba(255,255,255,.85);}
  .ms-hsearch:focus-within svg{color:var(--periwinkle-deep);}
  .ms-hsearch input{flex:1;min-width:0;border:0;background:none;outline:0;font:inherit;font-size:13.5px;color:#fff;}
  .ms-hsearch input::placeholder{color:rgba(255,255,255,.75);}
  .ms-hsearch:focus-within input{color:var(--ink);}
  .ms-hsearch:focus-within input::placeholder{color:var(--muted);}
  .ms-acct{position:relative;}
  .ms-acctmenu{position:absolute;top:calc(100% + 12px);right:0;width:248px;background:#fff;border:1px solid var(--line-soft);border-radius:14px;box-shadow:0 18px 44px rgba(20,22,45,.22);padding:7px;z-index:60;}
  .ms-acctmenu[hidden]{display:none;}
  .am-head{display:flex;align-items:center;gap:11px;padding:10px 11px 12px;border-bottom:1px solid var(--line-soft);margin-bottom:6px;}
  .am-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;flex:none;}
  .am-head b{display:block;font-size:14px;color:var(--ink);}
  .am-head span{font-size:11.5px;color:var(--muted);}
  .am-i{display:flex;align-items:center;gap:11px;padding:9px 11px;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink-2);text-decoration:none;}
  .am-i:hover{background:var(--paper,#f4f5f8);color:var(--periwinkle-deep);}
  .am-i svg{color:var(--muted);flex:none;}
  .am-i:hover svg{color:var(--periwinkle-deep);}
  .am-sep{height:1px;background:var(--line-soft);margin:6px 4px;}
  @media(max-width:880px){.ms-hsearch{display:none;}}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  function build(){
    const header=document.querySelector('.header'); if(!header) return;
    // keep the lockup (brand); remove any existing nav/tools variants
    header.querySelectorAll('.topnav,.ms-topnav,.headtools,.ms-htools,.roleswitch,.storecats').forEach(e=>e.remove());
    header.style.display='flex'; header.style.alignItems='center'; header.style.justifyContent='space-between';

    const idk = window.MSID?MSID.current():'distributor';
    const idObj = window.MSID?MSID.get():null;

    const id=idObj; const who=id?id.who:'JD'; const accent=id?id.accent:'var(--periwinkle)'; const photo=(id&&id.photo)||(window.MSAvatar&&MSAvatar.url(who));
    const avInner = photo ? `<img src="${photo}" alt="${who}">` : (window.MSID?MSID.initial(who):'JD');
    const init=window.MSID?MSID.initial(who):'JD';

    // centered, always-expanded search
    const search=document.createElement('div'); search.className='ms-hsearch';
    search.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input type="text" placeholder="Search products, projects, orders…" aria-label="Search">`;

    const tools=document.createElement('div'); tools.className='ms-htools';
    // suppliers & admin don't have a basket
    const basket = (idk==='supplier'||idk==='admin') ? '' : `<a class="it" title="Basket" href="Merchsmith Basket.html" style="position:relative"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M6 7h12l-1 13H7zM9 7V5a3 3 0 0 1 6 0v2"/></svg><span class="b" id="msBasketCount">0</span></a>`;
    tools.innerHTML=`
      ${basket}
      <span class="it" title="Notifications"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0"/></svg><span class="b">4</span></span>
      <div class="ms-acct">
      <button class="ava" title="${who}" style="background:${accent}">${avInner}</button>
        <div class="ms-acctmenu" hidden>
          <div class="am-head"><span class="am-av" style="background:${accent}">${photo?`<img src="${photo}" alt="${who}">`:init}</span><div><b>${who}</b><span>${id?id.role:''} · ${id?id.label:''}</span></div></div>
          <a class="am-i" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>My profile</a>
          <a class="am-i" href="Merchsmith Distributor Settings.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>Account settings</a>
          <a class="am-i" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>Notifications</a>
          <div class="am-sep"></div>
          <a class="am-i" href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sign out</a>
        </div>
      </div>`;

    // ensure lockup is first
    const lock=header.querySelector('[data-identity-lockup],.brand');
    header.innerHTML='';
    if(lock) header.appendChild(lock);
    header.appendChild(search);
    header.appendChild(tools);
    // account dropdown
    const bc=tools.querySelector('#msBasketCount'); if(bc&&window.MSOrders){ const n=MSOrders.getBasket().length; bc.textContent=n; bc.style.display=n?'grid':'none'; }
    const acct=tools.querySelector('.ms-acct'), menu=tools.querySelector('.ms-acctmenu'), ava=tools.querySelector('.ava');
    if(ava){ ava.addEventListener('click',e=>{ e.stopPropagation(); menu.hidden=!menu.hidden; });
      document.addEventListener('click',e=>{ if(!acct.contains(e.target)) menu.hidden=true; }); }
    buildFooter();
  }
  function buildFooter(){
    if(document.querySelector('.ms-footer')) return;
    if(document.querySelector('footer.foot')) return; // page has its own inline footer
    const idk = window.MSID?MSID.current():'distributor';
    let cobr;
    if(idk==='admin') cobr=`<span class="mojo" style="font-family:var(--serif)">Merchsmith</span>`;
    else if(idk==='supplier') cobr=`<span class="mojo">Mojo Promotions</span><span class="x">×</span><span class="cust"><span class="cdot" style="background:#2f8f5b">BW</span>BagWorks UK</span>`;
    else if(idk==='distributor') cobr=`<span class="mojo">Mojo Promotions</span>`;
    else cobr=`<span class="mojo">Mojo Promotions</span><span class="x">×</span><span class="cust"><span class="cdot">CX</span>Citrix</span>`;
    // footer links — distributor-configurable (Distributor Settings → Footer)
    let cfg=null; try{ cfg=JSON.parse(localStorage.getItem('ms-footer-cfg')||'null'); }catch(e){}
    const def={ left:[{t:'Contact us',h:'#',on:true},{t:'FAQs',h:'#',on:true}],
                right:[{t:'Privacy Policy',h:'#',on:true},{t:'Terms & Conditions',h:'#',on:true},{t:'Cookie Policy',h:'#',on:true},{t:'Accessibility',h:'#',on:true}] };
    cfg=cfg||def;
    const lnk=a=>`<a href="${a.h||'#'}">${(a.t||'').replace(/</g,'&lt;')}</a>`;
    const left=(cfg.left||[]).filter(a=>a.on!==false).map(lnk).join('');
    const right=(cfg.right||[]).filter(a=>a.on!==false).map(lnk).join('');
    const powered = '';
    const f=document.createElement('footer'); f.className='ms-footer';
    const social=`<div class="fsocial">
      <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
      <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7v0M11 17v-4a2 2 0 0 1 4 0v4"/></svg></a>
      <a href="#" aria-label="X"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></a>
      <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V8.5a.5.5 0 0 1 .5-.5z"/></svg></a>
    </div>`;
    f.innerHTML=`
      ${powered}
      <div class="flinks">
        ${social}
        <div class="fcol r">${left}${right}</div>
      </div>`;
    // place inside the content column if a layout exists, else at body end
    const host=document.querySelector('.ms-content')||document.body;
    host.appendChild(f);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build); else build();
  // load shared org chat (launcher + profile pane) once
  if(!document.querySelector('script[data-chat]')){ const s=document.createElement('script'); s.src='chat.js'; s.setAttribute('data-chat','1'); document.body.appendChild(s); }
  window.MSChrome={ buildFooter };
})();
