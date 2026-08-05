/* ============================================================
   Merchsmith — shared collapsible left sidebar
   Self-contained: injects its own styles, builds the nav,
   wraps page content into a layout, persists collapse state.
   Include on any page:  <script src="sidebar.js"></script>
   ============================================================ */
(function(){
  if(window.__msSidebar) return; window.__msSidebar = true;

  // ---- icons (inline, line style to match the app) ----
  const I = {
    dash:'<path d="M4 20h16M7 20v-6M12 20V9M17 20v-10"/>',
    merch:'<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9"/>',
    store:'<path d="M4 9.5 5.5 5h13L20 9.5M4 9.5h16M4 9.5v10.5h16V9.5M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M9 20v-5h4v5"/>',
    finder:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>',
    brand:'<path d="M14.5 5.5l4 4M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/>',
    leaf:'<path d="M5 19c0-7 5-12 14-12 0 9-5 13-11 13a3.6 3.6 0 0 1-3-1zM7 17c2-4 5-6 9-7"/>',
    gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4"/>',
    doc:'<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 16.5h6"/>',
    org:'<path d="M4 21V6l6-2.5V21M10 21V8.5L20 6v15M4 21h17M8 8H6m4 0H8m-2 3.5H6m4 0H8M6 15h2m6-4.5h2m-2 4h2"/>',
    products:'<path d="M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
    orders:'<path d="M7 3h10l1 4H6zM6 7h12v13H6zM9.5 11h5M9.5 15h3"/>',
    chat:'<path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
    collapse:'<path d="M4 5v14M19 12H9M13 8l-4 4 4 4"/>',
    chevs:'<path d="M13 6l-6 6 6 6M19 6l-6 6 6 6"/>',
    caret:'<path d="M6 9l6 6 6-6"/>'
  };
  const svg = (p,w=20)=>`<svg class="sbi" viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  // ---- which page am I on ----
  const path = decodeURIComponent(location.pathname);
  const onHome = /Home/i.test(path);
  const onDash = /Dashboard/i.test(path);
  const onGallery = /Gallery/i.test(path);
  const onSuppliers = /Suppliers|Distributor Settings/i.test(path);
  const onOrgs = /Organisations/i.test(path);
  const onStore = /Store/i.test(path);
  const onSettings = /(Distributor|Customer) Settings/i.test(path);
  const onProject = onDash || onGallery; // Autumn Giveaways views
  const onProjects = /Projects\.html/i.test(path);
  if(onProjects){ /* expand Your Merch */ }

  // ---- styles ----
  const css = `
  :root{--sb-w:264px;--sb-cw:72px;}
  body{margin:0;}
  .ms-layout{display:flex;align-items:stretch;min-height:100vh;}
  .ms-side{flex:none;width:var(--sb-w);background:#fff;border-right:1px solid var(--line-soft, rgba(34,34,34,.07));
    position:sticky;top:0;height:100vh;overflow-y:auto;overflow-x:hidden;
    display:flex;flex-direction:column;padding:18px 0 14px;transition:width .26s cubic-bezier(.22,.61,.36,1);z-index:20;}
  .ms-sidegrip{position:absolute;top:0;right:-3px;width:7px;height:100%;cursor:col-resize;z-index:40;}
  .ms-sidegrip::after{content:"";position:absolute;top:0;right:3px;width:1px;height:100%;background:transparent;transition:background .14s,width .14s;}
  .ms-sidegrip:hover::after,.ms-sidegrip.dragging::after{background:var(--periwinkle,#7B85C5);width:3px;right:2px;}
  .ms-side.dragging,.ms-side.dragging *{transition:none!important;}
  .ms-side.collapsed{width:var(--sb-cw);}
  .ms-content{flex:1;min-width:0;display:flex;flex-direction:column;}
  .ms-content > .ms-footer{margin-top:auto;}
  .ms-nav{display:flex;flex-direction:column;gap:2px;padding:0 14px;}
  .ms-foot{margin-top:auto;padding:14px 14px 4px;border-top:1px solid var(--line-soft, rgba(34,34,34,.07));}
  .ms-powered{display:flex;flex-direction:column;gap:3px;align-items:flex-start;}
  .ms-pwlabel{font-family:'Mulish',system-ui,sans-serif;font-size:11px;font-weight:600;color:#9a96a6;letter-spacing:.02em;}
  .ms-pwlogo{height:18px;width:auto;display:block;}
  .ms-side.collapsed .ms-powered{align-items:center;}
  .ms-side.collapsed .ms-pwlabel{display:none;}
  .ms-side.collapsed .ms-pwlogo{display:none;}
  .ms-pwmark{display:none;}
  .ms-side.collapsed .ms-pwmark{display:block;}
  .ms-item{display:flex;align-items:center;gap:8px;padding:11px 12px 11px 0;border-radius:11px;cursor:pointer;color:#3b3b44;
    font-family:'Mulish',system-ui,sans-serif;font-weight:600;font-size:15px;text-decoration:none;position:relative;white-space:nowrap;transition:background .14s,color .14s;}
  .ms-item:hover{background:var(--paper,#F4F5F8);color:var(--periwinkle-deep,#5860A6);}
  .ms-item.active{color:var(--periwinkle-deep,#5860A6);font-weight:700;background:var(--paper,#F4F5F8);}
  .ms-item .sbico{flex:none;width:44px;display:flex;align-items:center;justify-content:center;}
  .ms-item .sbi{flex:none;color:var(--periwinkle-deep,#5860A6);}
  .ms-item .lbl{flex:1;overflow:hidden;text-overflow:ellipsis;}
  .ms-item .car{flex:none;color:#aab;transition:transform .2s;width:16px;height:16px;}
  .ms-item.open .car{transform:rotate(180deg);}
  .ms-side.collapsed .lbl,.ms-side.collapsed .car{display:none;}
  .ms-side.collapsed .ms-item{justify-content:center;padding:11px 0;gap:0;}
  .ms-side.collapsed .ms-item .sbico{width:auto;}
  .ms-side.collapsed .ms-sub{display:none !important;}
  .ms-sub{display:flex;flex-direction:column;gap:1px;margin:2px 0 4px;padding-left:30px;overflow:hidden;}
  .ms-sub .ms-item{font-weight:500;font-size:14px;padding:9px 12px;color:var(--ink-3);}
  .ms-sub .ms-item.active{font-weight:700;color:var(--ink,#222);background:var(--paper,#F4F5F8);}
  .ms-sub .ms-item.active::before{content:"";position:absolute;left:-2px;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--periwinkle,#7B85C5);}
  .ms-sub2{padding-left:14px;}
  .ms-collapsed-hide{}
  .ms-top{position:absolute;bottom:16px;right:12px;z-index:5;}
  .ms-toptoggle{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;border:1px solid var(--line-soft,rgba(34,34,34,.07));background:#fff;color:#aab;cursor:pointer;transition:opacity .16s,background .14s,color .14s,border-color .14s;flex:none;opacity:0;pointer-events:none;}
  .ms-side:hover .ms-toptoggle{opacity:1;pointer-events:auto;}
  .ms-toptoggle:hover{background:var(--periwinkle,#7B85C5);border-color:var(--periwinkle,#7B85C5);color:#fff;}
  .ms-toptoggle .sbi{color:currentColor;}
  .ms-side.collapsed .ms-top{right:0;left:0;display:flex;justify-content:center;}
  .ms-side.collapsed .ms-toptoggle .sbi{transform:rotate(180deg);}
  /* tooltip when collapsed */
  .ms-side.collapsed .ms-item[data-tip]:hover::after{content:attr(data-tip);position:absolute;left:calc(100% + 10px);top:50%;transform:translateY(-50%);
    background:var(--ink,#222);color:#fff;font-size:12px;font-weight:600;padding:6px 10px;border-radius:7px;white-space:nowrap;z-index:30;box-shadow:0 4px 12px rgba(0,0,0,.18);}
  @media(max-width:760px){.ms-side{width:var(--sb-cw);} .ms-side .lbl,.ms-side .car{display:none;} .ms-side .ms-item{justify-content:center;padding:11px 0;gap:0;} .ms-side .ms-item .sbico{width:auto;} .ms-side .ms-sub{display:none;}}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  // ---- build sidebar DOM ----
  function item(opts){
    const {icon,label,href,active,caret,tip,sub2} = opts;
    const a = document.createElement(href?'a':'div');
    a.className = 'ms-item'+(active?' active':'')+(sub2?' ms-sub2':'');
    if(href) a.href = href;
    a.setAttribute('data-tip', tip||label);
    a.innerHTML = `${icon?`<span class="sbico">${svg(icon)}</span>`:''}<span class="lbl">${label}</span>${caret?`<svg class="car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I.caret}</svg>`:''}`;
    return a;
  }

  const side = document.createElement('aside');
  side.className = 'ms-side';
  // top collapse toggle (« / »)
  const top = document.createElement('div'); top.className='ms-top';
  const topToggle = document.createElement('button'); topToggle.className='ms-toptoggle'; topToggle.id='msTopToggle';
  topToggle.setAttribute('title','Collapse menu'); topToggle.setAttribute('aria-label','Collapse menu');
  topToggle.innerHTML = svg(I.chevs,18);
  top.appendChild(topToggle);
  side.appendChild(top);
  const nav = document.createElement('nav'); nav.className = 'ms-nav';

  const ROLE = (window.MSID ? MSID.current() : 'distributor');

  // Dashboard (home) — all roles
  nav.appendChild(item({icon:I.dash,label:'Dashboard',href:'Merchsmith Home.html',active:onHome,tip:'Dashboard'}));

  if(ROLE==='supplier'){
    // Supplier: Dashboard · Products · Orders · Customers (distributors) · Chats · Finance · Settings
    nav.appendChild(item({icon:I.products,label:'Products',href:'#',tip:'Products'}));
    nav.appendChild(item({icon:I.orders,label:'Orders',href:'Merchsmith Orders.html',active:/Orders\.html/i.test(path),tip:'Orders'}));
    nav.appendChild(item({icon:I.people,label:'Customers',href:'#',tip:'Customers (distributors)'}));
    nav.appendChild(item({icon:I.chat,label:'Chats',href:'Merchsmith Chats.html',active:/Chats/i.test(path),tip:'Chats'}));
    financeSection(nav,'supplier');
    nav.appendChild(item({icon:I.gear,label:'Settings',href:'#',active:onSettings,tip:'Settings'}));
  } else {
    // Store — top of the menu (distributor + customer)
    if(ROLE==='distributor'){
      const onStoreRange = onSettings && /storerange/i.test(location.hash);
      const onStoreHome = onSettings && /storehome/i.test(location.hash);
      const storeOpen = onStore||onStoreRange||onStoreHome;
      const storeHdr = item({icon:I.store,label:'Store',caret:true,active:storeOpen,tip:'Store'});
      if(storeOpen) storeHdr.classList.add('open');
      nav.appendChild(storeHdr);
      const storeSub = document.createElement('div'); storeSub.className='ms-sub';
      storeSub.style.display = storeOpen?'flex':'none';
      storeSub.appendChild(item({label:'Browse store',href:'Merchsmith Store.html',active:onStore}));
      storeSub.appendChild(item({label:'Store range',href:'Merchsmith Distributor Settings.html#tab=storerange',active:onStoreRange}));
      storeSub.appendChild(item({label:'Store settings',href:'Merchsmith Distributor Settings.html#tab=storehome',active:onStoreHome}));
      nav.appendChild(storeSub);
      window.__msStore=[storeHdr,storeSub];
    } else {
      nav.appendChild(item({icon:I.store,label:'Store',href:'Merchsmith Store.html',active:onStore,tip:'Store'}));
    }

    // Projects: distributor gets the master all-customers table; customer gets their own projects group
    if(ROLE==='distributor'){
      nav.appendChild(item({icon:I.merch,label:'Projects',href:'Merchsmith Distributor Projects.html',active:/Distributor Projects\.html/i.test(path),tip:'All customer projects'}));
    }
    if(ROLE!=='distributor'){
      const projects = item({icon:I.merch,label:'Projects',caret:true,active:onProject||onProjects,tip:'Projects'});
      projects.classList.add('open'); nav.appendChild(projects);
      const projSub = document.createElement('div'); projSub.className='ms-sub';
      projSub.appendChild(item({label:'All projects',href:'Merchsmith Projects.html',active:/Projects\.html/i.test(path)}));
      [['Autumn Giveaways','Merchsmith Project - Autumn Giveaways.html',onProject]]
        .forEach(([l,h,act])=>projSub.appendChild(item({label:l,href:h,active:act})));
      nav.appendChild(projSub);
      nav.appendChild(item({icon:I.orders,label:'Orders',href:'Merchsmith Orders.html',active:/Orders\.html/i.test(path),tip:'Orders'}));
      window.__msProj=[projects,projSub];
    }

    // Customer keeps Brand Assets (Finder + Sustainability removed)
    if(ROLE==='customer'){
      const onBA=/Brand Assets\.html/i.test(path);
      const baHdr=item({icon:I.brand,label:'Brand Assets',caret:true,active:onBA,tip:'Brand Assets'});
      if(onBA) baHdr.classList.add('open');
      nav.appendChild(baHdr);
      const baSub=document.createElement('div'); baSub.className='ms-sub'; baSub.style.display=onBA?'flex':'none';
      const baHash=(location.hash.match(/cat=([a-z]+)/)||[])[1];
      [['Brand Guidelines','guidelines'],['Logo Types','logos'],['Colours','colours'],['Fonts','fonts'],['Images','images'],['Product Artwork','artwork']]
        .forEach(([l,c])=>baSub.appendChild(item({label:l,href:'Merchsmith Brand Assets.html#cat='+c,active:onBA&&baHash===c})));
      nav.appendChild(baSub);
      window.__msBA=[baHdr,baSub];
    }

    if(ROLE==='customer'){
      // Customer: their own Team (not the distributor's Organisations hub)
      nav.appendChild(item({icon:I.people,label:'Team',href:'Merchsmith Team.html',active:/Team\.html/i.test(path),tip:'Team'}));
      nav.appendChild(item({icon:I.chat,label:'Chats',href:'Merchsmith Chats.html',active:/Chats/i.test(path),tip:'Chats'}));
    } else {
      // Distributor: Organisations hub (customers + suppliers)
      const onOrgsExp = onOrgs;
      const orgsHdr = item({icon:I.org,label:'Organisations',caret:true,active:onOrgsExp,tip:'Organisations'});
      if(onOrgsExp) orgsHdr.classList.add('open');
      nav.appendChild(orgsHdr);
      const orgsSub = document.createElement('div'); orgsSub.className='ms-sub';
      orgsSub.style.display = onOrgsExp?'flex':'none';
      [['Overview','Merchsmith Organisations.html',onOrgs&&!onSettings],['Customers','Merchsmith Organisations.html#tab=customers',false],['Suppliers','Merchsmith Organisations.html#tab=suppliers',false]]
        .forEach(([l,h,act])=>orgsSub.appendChild(item({label:l,href:h,active:act})));
      nav.appendChild(orgsSub);
      window.__msOrgs=[orgsHdr,orgsSub];
      nav.appendChild(item({icon:I.people,label:'Team',href:'Merchsmith Team.html',active:/Team\.html/i.test(path),tip:'Your team'}));
      nav.appendChild(item({icon:I.chat,label:'Chats',href:'Merchsmith Chats.html',active:/Chats/i.test(path),tip:'Chats'}));
    }

    // Settings — distributor + customer
    nav.appendChild(item({icon:I.gear,label:'Settings',href:ROLE==='customer'?'Merchsmith Customer Settings.html':'Merchsmith Distributor Settings.html',active:onSettings,tip:'Settings'}));
    // Finance (houses Invoices; customer also gets Credit Limit)
    financeSection(nav, ROLE);
  }

  // Finance collapsible — Invoices for all; Credit Limit added for customers
  function financeSection(nav, role){
    const onFin = /finance|invoices|credit/i.test(location.hash) || /Finance\.html/i.test(path);
    const finHdr = item({icon:I.doc, label:'Finance', caret:true, active:onFin, tip:'Finance'});
    if(onFin) finHdr.classList.add('open');
    nav.appendChild(finHdr);
    const finSub = document.createElement('div'); finSub.className='ms-sub'; finSub.style.display = onFin?'flex':'none';
    finSub.appendChild(item({label:'Invoices', href:'#finance=invoices'}));
    if(role==='customer') finSub.appendChild(item({label:'Credit Limit', href:'#finance=credit'}));
    nav.appendChild(finSub);
    finHdr.addEventListener('click', e=>{ if(e.target.closest('a')&&e.target.closest('a').getAttribute('href')!=='#') return; const open=finSub.style.display!=='none'; finSub.style.display=open?'none':'flex'; finHdr.classList.toggle('open',!open); });
  }

  side.appendChild(nav);

  // footer: Powered by Merchsmith
  const foot = document.createElement('div'); foot.className='ms-foot ms-powered';
  const wm = (window.__resources&&window.__resources.wordmark)||'assets/merchsmith-wordmark.svg';
  foot.innerHTML = `<span class="ms-pwlabel">Powered by</span><img class="ms-pwlogo" src="${wm}" alt="Merchsmith"><span class="ms-pwmark">${(window.MSLOGOS&&MSLOGOS.svg?MSLOGOS.svg('Merchsmith mark',22):'')}</span>`;
  side.appendChild(foot);

  // ---- expandable behaviour ----
  function wireToggle(headerEl, subEl){
    headerEl.addEventListener('click', e=>{
      if(headerEl.tagName==='A' && headerEl.getAttribute('href') && headerEl.getAttribute('href')!=='#') return;
      e.preventDefault();
      const open = headerEl.classList.toggle('open');
      subEl.style.display = open ? 'flex' : 'none';
    });
  }
  if(window.__msMerch) wireToggle(window.__msMerch[0], window.__msMerch[1]);
  if(window.__msStore) wireToggle(window.__msStore[0], window.__msStore[1]);
  if(window.__msProj) wireToggle(window.__msProj[0], window.__msProj[1]);
  if(window.__msOrgs) wireToggle(window.__msOrgs[0], window.__msOrgs[1]);
  if(window.__msBA) wireToggle(window.__msBA[0], window.__msBA[1]);

  // ---- collapse ----
  const KEY='ms-sidebar-collapsed';
  function setCollapsed(c){
    side.classList.toggle('collapsed', c);
    topToggle.setAttribute('title', c ? 'Expand menu' : 'Collapse menu');
    topToggle.setAttribute('aria-label', c ? 'Expand menu' : 'Collapse menu');
    try{ localStorage.setItem(KEY, c?'1':'0'); }catch(e){}
  }
  topToggle.addEventListener('click', ()=> setCollapsed(!side.classList.contains('collapsed')));
  // collapsed: clicking any nav icon expands the menu (instead of navigating/toggling)
  // expanded: clicking exactly the icon (not the label) collapses it again
  nav.addEventListener('click', e=>{
    const it=e.target.closest('.ms-item'); if(!it) return;
    if(side.classList.contains('collapsed')){
      e.preventDefault(); e.stopPropagation();
      setCollapsed(false);
      const sub=it.nextElementSibling;
      if(sub&&sub.classList&&sub.classList.contains('ms-sub')&&!it.classList.contains('open')){ it.classList.add('open'); sub.style.display='flex'; }
      // take the user to that area's top-level page too
      const a=it.tagName==='A'?it:it.querySelector('a');
      const href=a&&a.getAttribute('href');
      if(href&&href!=='#') location.href=href;
      return;
    }
    if(e.target.closest('.sbico') && !it.closest('.ms-sub')){
      e.preventDefault(); e.stopPropagation();
      setCollapsed(true);
    }
  }, true);

  // ---- draggable right-border grip: highlights on hover, drag left to collapse ----
  const grip=document.createElement('div'); grip.className='ms-sidegrip'; grip.title='Drag to collapse'; side.appendChild(grip);
  grip.addEventListener('mousedown', e=>{
    e.preventDefault(); const startX=e.clientX; const startW=side.getBoundingClientRect().width; let moved=false;
    grip.classList.add('dragging'); side.classList.add('dragging'); document.body.style.cursor='col-resize';
    function mv(ev){ if(Math.abs(ev.clientX-startX)>3) moved=true; const w=startW+(ev.clientX-startX); side.style.width=Math.max(60,Math.min(300,w))+'px'; }
    function up(ev){
      document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
      grip.classList.remove('dragging'); side.classList.remove('dragging'); document.body.style.cursor='';
      const w=side.getBoundingClientRect().width; side.style.width='';
      if(!moved){ setCollapsed(!side.classList.contains('collapsed')); }
      else { setCollapsed(w < (startW*0.7)); }
    }
    document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
  });

  // ---- wrap page content (everything after .header) into a flex layout ----
  function build(){
    const header = document.querySelector('.header');
    if(!header){ document.body.prepend(side); return; }
    const layout = document.createElement('div'); layout.className='ms-layout';
    const content = document.createElement('div'); content.className='ms-content';
    // move all siblings after header into content
    let n = header.nextSibling;
    const toMove = [];
    while(n){ toMove.push(n); n = n.nextSibling; }
    toMove.forEach(node=>content.appendChild(node));
    layout.appendChild(side);
    layout.appendChild(content);
    header.after(layout);
    let init=true; try{ const s=localStorage.getItem(KEY); if(s!==null) init = s==='1'; }catch(e){}
    setCollapsed(init);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
