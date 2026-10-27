/* ============================================================
   Merchsmith — shared left navigation: permanent icon rail
   with hover flyouts (replaces the collapsible sidebar).

   The rail never changes width, so page content never reflows.
   Every section opens a panel on hover/focus — including
   single-destination ones — so the interaction never varies.
   Clicking the icon itself goes straight to the section's main page.

   Include on any page:  <script src="sidebar.js"></script>
   ============================================================ */
(function(){
  if(window.__msSidebar) return; window.__msSidebar = true;

  // ---- icons ----
  const I = {
    dash:'<path d="M4 20h16M7 20v-6M12 20V9M17 20v-10"/>',
    merch:'<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9"/>',
    store:'<path d="M4 9.5 5.5 5h13L20 9.5M4 9.5h16M4 9.5v10.5h16V9.5M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M9 20v-5h4v5"/>',
    brand:'<path d="M14.5 5.5l4 4M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/>',
    gear:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    doc:'<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 16.5h6"/>',
    org:'<path d="M4 21V6l6-2.5V21M10 21V8.5L20 6v15M4 21h17M8 8H6m4 0H8m-2 3.5H6m4 0H8M6 15h2m6-4.5h2m-2 4h2"/>',
    tag:'<path d="M3 12.8V4h8.8l8.7 8.7a1.9 1.9 0 0 1 0 2.7l-6.1 6.1a1.9 1.9 0 0 1-2.7 0zM7.5 7.5v.01"/>',
    orders:'<path d="M7 3h10l1 4H6zM6 7h12v13H6zM9.5 11h5M9.5 15h3"/>',
    chat:'<path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
    truck:'<path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7M7 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01"/>',
    user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    layout:'<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17M9 9v11"/>',
    card:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    cal:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2"/>'
  };

  const path = decodeURIComponent(location.pathname);
  const P = re => re.test(path);
  const ROLE = (window.MSID ? MSID.current() : 'distributor');

  const CAL_ME={admin:'morgan',distributor:'jess',customer:'sara',supplier:'tomr'}[ROLE]||'jess';
  function calPending(){ try{ const o=JSON.parse(localStorage.getItem('ms-cal-v1')||'null'); if(!o) return 0; const now=new Date();
    return o.events.filter(e=>!e.cancelled&&new Date(e.end)>now&&((e.attendees||[]).some(a=>a.id===CAL_ME&&a.status==='pending')||(e.organiser===CAL_ME&&(e.attendees||[]).some(a=>a.status==='proposed')))).length; }catch(e){ return 0; } }
  const calItem=q=>{ const f='Merchsmith Calendar.html'+(q||''); const n=calPending();
    return {k:'cal',ic:I.cal,t:'Calendar',go:f,on:P(/Calendar\.html/i),links:[['My calendar',f+'#tab=cal'],['Invitations',f+'#tab=invites',n||''],['Working hours & availability',f+'#tab=avail'],['Booking link',f+'#tab=booking'],['Connected calendars',f+'#tab=connect']]}; };

  function callsUnseen(){ try{ const o=JSON.parse(localStorage.getItem('ms-calls-v1')||'null'); const l=o&&o.log&&o.log[CAL_ME]; return l?l.filter(e=>!e.seen&&(e.outcome==='missed'||e.outcome==='voicemail')).length:0; }catch(e){ return 0; } }
  const callItem=q=>{ const f='Merchsmith Calls.html'+(q||''); const n=callsUnseen();
    return {k:'calls',ic:I.phone,t:'Calls',go:f,on:P(/Calls\.html/i),links:[['Make a call',f+'#tab=history'],['Call history',f+'#tab=history',n||''],['Voicemail',f+'#tab=voicemail'],['Call settings',f+'#tab=settings']]}; };
  // calls.js on every page so the call bar + incoming ring work anywhere
  const emailItem=q=>{ const f='Merchsmith Emails.html'+(q||'');
    return {k:'email',ic:I.mail,t:'Emails',go:f,on:P(/Emails\.html/i),links:[['New email',f+'#tab=sent&compose'],['Sent',f+'#tab=sent'],['Drafts',f+'#tab=drafts'],['Saved replies',f+'#tab=snips'],['Templates',f+'#tab=templates'],['Sending domain',f+'#tab=domain'],['Reply by email',f+'#tab=reply'],['My emails',f+'#tab=mine']]}; };
  // Calls is for Platform Admin and distributors only
  const CALLS_OK=ROLE==='admin'||ROLE==='distributor';
  // emails.js too, so Email buttons can open the composer on any page
  if(CALLS_OK) document.addEventListener('DOMContentLoaded',()=>{ if(window.MSEMAIL||document.querySelector('script[src*="emails.js"]')) return; const s=document.createElement('script'); s.src='emails.js?v=7'; document.body.appendChild(s); });
  if(CALLS_OK) document.addEventListener('DOMContentLoaded',()=>{ if(window.MSCALLS||document.querySelector('script[src*="calls.js"]')) return; const s=document.createElement('script'); s.src='calls.js?v=6'; document.body.appendChild(s); });

  // ---- nav model: one entry per rail icon, each with its own panel ----
  // active(h) decides the section highlight; links are [label, href, count?]
  function model(){
    const onStoreSettings = P(/Distributor Settings/i) && /storerange|storehome|tab=markup|tab=discounts|tab=appearance/i.test(location.hash);
    const onBilling = P(/Merchsmith Finance/i) || (P(/Distributor Settings/i) && /tab=billing/i.test(location.hash));
    // Platform Admin pages that live outside Merchsmith Admin.html (Calendar, Chats) keep the full admin rail
    if(ROLE==='admin'&&(/[?&]scope=platform\b/.test(location.search)||P(/Calendar\.html|Calls\.html|Emails\.html|Notifications\.html/i))){ const A='Merchsmith Admin.html#nav=';
      const n=(k,ic,t,links)=>({k,ic,t,go:A+k,on:false,links:links||[[t,A+k]]});
      return [
        n('overview',I.dash,'Dashboard',[['Platform overview',A+'overview']]),
        n('distributors',I.org,'Distributors',[['All distributors',A+'distributors']]),
        n('suppliers',I.truck,'Suppliers',[['All suppliers',A+'suppliers']]),
        n('users',I.user,'Users',[['All users',A+'users']]),
        n('products',I.tag,'Products',[['Product database',A+'products']]),
        n('curated',I.star,'Recommended range',[['Recommended range',A+'curated']]),
        n('storestructure',I.layout,'Store layout',[['Store layout',A+'storestructure']]),
        n('subscriptions',I.card,'Subscriptions',[['Subscriptions',A+'subscriptions']]),
        n('team',I.people,'Team',[['All team members',A+'team']]),
        {k:'chat',ic:I.chat,t:'Chats',go:'Merchsmith Chats.html?scope=platform',on:P(/Chats\.html/i),links:[['All conversations','Merchsmith Chats.html?scope=platform'],['New conversation','Merchsmith Chats.html?scope=platform#new']]},
        calItem('?scope=platform'),
        callItem('?scope=platform'),
        emailItem('?scope=platform'),
        n('settings',I.gear,'Settings',[['Platform settings',A+'settings']])
      ]; }
    if(ROLE==='admin'){ const A='Merchsmith Admin.html#nav=';
      return [
      {k:'dash',ic:I.dash,t:'Platform Admin',go:A+'overview',on:false,links:[['Back to Platform Admin',A+'overview']]},
      {k:'store',ic:I.store,t:'Default store',go:'Merchsmith Store.html?store=merchsmith',on:P(/Store\.html/i)&&!P(/Chats/i)&&!/storehome|footer/.test(location.hash),
       links:[['Browse default store','Merchsmith Store.html?store=merchsmith']]},
      {k:'set',ic:I.gear,t:'Store settings',go:'Merchsmith Distributor Settings.html?store=merchsmith#tab=storehome',on:P(/Distributor Settings/i),
       links:[['Homepage','Merchsmith Distributor Settings.html?store=merchsmith#tab=storehome'],['Footer','Merchsmith Distributor Settings.html?store=merchsmith#tab=footer'],['Store layout',A+'storestructure']]}
,
      {k:'chat',ic:I.chat,t:'Chats',go:'Merchsmith Chats.html?scope=platform',on:P(/Chats\.html/i),links:[['All conversations','Merchsmith Chats.html?scope=platform'],['New conversation','Merchsmith Chats.html?scope=platform#new']]},
      calItem('?scope=platform'),
        callItem('?scope=platform'),
        emailItem('?scope=platform')
    ]; }
    if(ROLE==='supplier') return [
      {k:'dash',ic:I.dash,t:'Dashboard',go:'Merchsmith Home.html',on:P(/Home/i),
       links:[['Overview','Merchsmith Home.html']]},
      {k:'prod',ic:I.tag,t:'Products',go:'Merchsmith Supplier Portal.html',on:P(/Supplier Portal/i)&&!/billing/i.test(location.hash),
       links:[['Your products','Merchsmith Supplier Portal.html#tab=products'],
              ['In the Recommended range','Merchsmith Supplier Portal.html#tab=products&f=rec'],
              ['Approvals','Merchsmith Supplier Portal.html#tab=approvals'],
              ['Placement history','Merchsmith Supplier Portal.html#tab=history']]},
      {k:'ord',ic:I.orders,t:'Orders',go:'Merchsmith Orders.html',on:P(/Orders\.html/i),
       links:[['All orders','Merchsmith Orders.html']]},
      {k:'dist',ic:I.org,t:'Distributors',go:'#',on:false,
       links:[['Distributors you supply','#']]},
      {k:'chat',ic:I.chat,t:'Chats',go:'Merchsmith Chats.html',on:P(/Chats/i),
       links:[['All chats','Merchsmith Chats.html']]},
      calItem(),
      {k:'fin',ic:I.doc,t:'Finance',go:'Merchsmith Supplier Portal.html#tab=billing',on:/billing|finance|invoices/i.test(location.hash),
       links:[['Placement billing','Merchsmith Supplier Portal.html#tab=billing'],
              ['Invoices','#finance=invoices']]},
      {k:'set',ic:I.gear,t:'Settings',go:'Merchsmith Supplier Portal.html#tab=profile',on:/tab=profile/.test(location.hash),links:[['Organisation profile','Merchsmith Supplier Portal.html#tab=profile']]}
    ];
    if(ROLE==='customer') return [
      {k:'dash',ic:I.dash,t:'Dashboard',go:'Merchsmith Home.html',on:P(/Home/i),
       links:[['Overview','Merchsmith Home.html']]},
      {k:'store',ic:I.store,t:'Store',go:'Merchsmith Store.html',on:P(/Store\.html/i)||P(/Merchsmith Page/i),
       links:[['Browse store','Merchsmith Store.html']]},
      {k:'proj',ic:I.merch,t:'Projects',go:'Merchsmith Projects.html',on:P(/Projects\.html|Project - |Gallery/i),
       links:[['All projects','Merchsmith Projects.html'],['Autumn Giveaways','Merchsmith Project - Autumn Giveaways.html'],['Create a project','Merchsmith Create Project.html']]},
      {k:'ord',ic:I.orders,t:'Orders',go:'Merchsmith Orders.html',on:P(/Orders\.html/i),
       links:[['All orders','Merchsmith Orders.html'],['Basket','Merchsmith Basket.html']]},
      {k:'ba',ic:I.brand,t:'Brand Assets',go:'Merchsmith Brand Assets.html',on:P(/Brand Assets/i),
       links:[['Brand Guidelines','Merchsmith Brand Assets.html#cat=guidelines'],['Logo Types','Merchsmith Brand Assets.html#cat=logos'],['Colours','Merchsmith Brand Assets.html#cat=colours'],['Fonts','Merchsmith Brand Assets.html#cat=fonts'],['Images','Merchsmith Brand Assets.html#cat=images'],['Product Artwork','Merchsmith Brand Assets.html#cat=artwork']]},
      {k:'team',ic:I.people,t:'Team',go:'Merchsmith Team.html',on:P(/Team\.html/i),
       links:[['Your team','Merchsmith Team.html']]},
      {k:'chat',ic:I.chat,t:'Chats',go:'Merchsmith Chats.html',on:P(/Chats/i),
       links:[['All chats','Merchsmith Chats.html']]},
      calItem(),
      {k:'fin',ic:I.doc,t:'Finance',go:'Merchsmith Customer Finance.html',on:P(/Customer Finance/i),
       links:[['Overview','Merchsmith Customer Finance.html#tab=overview'],['Invoices','Merchsmith Customer Finance.html#tab=invoices'],['Terms & invoicing','Merchsmith Customer Finance.html#tab=terms']]},
      {k:'set',ic:I.gear,t:'Settings',go:'Merchsmith Customer Settings.html',on:P(/Customer Settings/i),
       links:[['Organisation profile','Merchsmith Customer Settings.html#tab=profile'],['Platform logos','Merchsmith Customer Settings.html#tab=logos'],['Account','Merchsmith Customer Settings.html#tab=account']]}
    ];
    return [
      {k:'dash',ic:I.dash,t:'Dashboard',go:'Merchsmith Home.html',on:P(/Home/i),
       links:[['Overview','Merchsmith Home.html']]},
      {k:'store',ic:I.store,t:'Store',go:'Merchsmith Store.html',on:P(/Store\.html/i)||P(/Merchsmith Page/i)||onStoreSettings,
       links:[['Browse store','Merchsmith Store.html'],['Product range','Merchsmith Distributor Settings.html#tab=storerange'],['Store settings','Merchsmith Distributor Settings.html#tab=storehome'],['Markup & pricing','Merchsmith Distributor Settings.html#tab=markup'],['Discounts','Merchsmith Distributor Settings.html#tab=discounts'],['Store appearance','Merchsmith Distributor Settings.html#tab=appearance']]},
      {k:'proj',ic:I.merch,t:'Projects',go:'Merchsmith Distributor Projects.html',on:P(/Projects\.html|Project - |Gallery/i),
       links:[['All customer projects','Merchsmith Distributor Projects.html'],['Autumn Giveaways','Merchsmith Project - Autumn Giveaways.html'],['Create a project','Merchsmith Create Project.html']]},
      {k:'ord',ic:I.orders,t:'Orders',go:'Merchsmith Orders.html',on:P(/Orders\.html|Basket\.html/i),
       links:[['All orders','Merchsmith Orders.html'],['Basket','Merchsmith Basket.html']]},
      {k:'orgs',ic:I.org,t:'Organisations',go:'Merchsmith Organisations.html',on:P(/Organisations/i),
       links:[['Overview','Merchsmith Organisations.html'],['Customers','Merchsmith Organisations.html#tab=customers'],['Suppliers','Merchsmith Organisations.html#tab=suppliers']]},
      {k:'users',ic:I.user,t:'Users',go:'Merchsmith Users.html',on:P(/Users\.html/i),
       links:[['All users','Merchsmith Users.html']]},
      {k:'team',ic:I.people,t:'Team',go:'Merchsmith Team.html',on:P(/Team\.html/i),
       links:[['Your team','Merchsmith Team.html']]},
      {k:'chat',ic:I.chat,t:'Chats',go:'Merchsmith Chats.html',on:P(/Chats/i),
       links:[['All chats','Merchsmith Chats.html']]},
      calItem(),
      callItem(),
      emailItem(),
      {k:'fin',ic:I.doc,t:'Finance',go:'Merchsmith Finance.html#sub=dash',on:onBilling||/finance|invoices|credit/i.test(location.hash),
       links:[['Dashboard','Merchsmith Finance.html#sub=dash'],['Subscription','Merchsmith Finance.html#sub=plan'],['Customer invoices','Merchsmith Finance.html#sub=cust'],['Supplier invoices','Merchsmith Finance.html#sub=sup'],['Bank details','Merchsmith Finance.html#sub=bank']]},
      {k:'set',ic:I.gear,t:'Settings',go:'Merchsmith Distributor Settings.html',
       on:P(/Distributor Settings/i)&&!onStoreSettings&&!onBilling,
       links:[['Organisation profile','Merchsmith Distributor Settings.html#tab=orgprofile'],['Lead times','Merchsmith Distributor Settings.html#tab=leadtimes'],['Footer','Merchsmith Distributor Settings.html#tab=footer'],['Pages','Merchsmith Distributor Settings.html#tab=pages'],['Branding','Merchsmith Distributor Settings.html#tab=branding'],['Announcement bar','Merchsmith Notifications.html#tab=bar'],['Domain','Merchsmith Distributor Settings.html#tab=domain'],['Warning drafts','Merchsmith Distributor Settings.html#tab=warndrafts'],['Subscription','Merchsmith Distributor Settings.html#tab=subscription']]}
    ];
  }

  const css = `
  :root{--sb-w:68px;}
  body{margin:0;}
  .ms-layout{display:flex;align-items:stretch;min-height:100vh;}
  /* --ms-headh is measured from the page's own sticky header at build time, so the rail
     parks beneath it instead of scrolling over it. z-index stays under the header's. */
  .ms-side{flex:none;width:var(--sb-w);background:#fff;border-right:1px solid var(--line-soft,rgba(34,34,34,.07));
    position:sticky;top:var(--ms-headh,0px);height:calc(100vh - var(--ms-headh,0px));
    display:flex;flex-direction:column;padding:14px 0 12px;z-index:40;overflow-y:auto;}
  .ms-content{flex:1;min-width:0;display:flex;flex-direction:column;}
  .ms-content > .ms-footer{margin-top:auto;}
  .ms-nav{display:flex;flex-direction:column;gap:4px;padding:0 12px;}
  .ms-rbtn{position:relative;width:44px;height:44px;border:0;background:none;border-radius:12px;cursor:pointer;
    display:grid;place-items:center;color:var(--ink-3,#6b6b76);text-decoration:none;transition:background .14s,color .14s;}
  .ms-rbtn .sbi{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  .ms-rbtn:hover,.ms-rbtn.hot{background:var(--paper,#F4F5F8);color:var(--periwinkle-deep,#5860A6);}
  .ms-rbtn.active{color:var(--periwinkle-deep,#5860A6);background:var(--tint-peri,#eceefb);}
  /* marker on the rail edge: the only way to read location when labels are hidden */
  .ms-rbtn.active::before{content:"";position:absolute;left:-12px;top:11px;bottom:11px;width:3px;
    border-radius:0 3px 3px 0;background:var(--periwinkle-deep,#5860A6);}
  .ms-fly{position:fixed;left:var(--sb-w);z-index:55;min-width:222px;background:#fff;
    border:1px solid var(--line-soft,rgba(34,34,34,.07));border-radius:14px;box-shadow:0 18px 46px rgba(20,22,45,.17);
    padding:12px;opacity:0;transform:translateX(-6px);pointer-events:none;transition:opacity .15s,transform .15s;}
  .ms-fly.on{opacity:1;transform:none;pointer-events:auto;}
  /* invisible bridge over the gap so a diagonal pointer path keeps the panel open */
  .ms-fly::before{content:"";position:absolute;left:-14px;top:0;width:14px;height:100%;}
  .ms-fly h4{font-family:'Mulish',system-ui,sans-serif;font-size:10.5px;font-weight:800;letter-spacing:.1em;
    text-transform:uppercase;color:var(--muted,#8b8b96);margin:2px 0 8px;padding:0 10px;}
  .ms-fly .ms-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;
    border-radius:9px;font-family:'Mulish',system-ui,sans-serif;font-size:14px;font-weight:600;
    color:var(--ink-2,#3b3b44);text-decoration:none;white-space:nowrap;}
  .ms-fly .ms-item:hover{background:var(--paper,#F4F5F8);color:var(--periwinkle-deep,#5860A6);}
  .ms-fly .ms-item.active{background:var(--paper,#F4F5F8);color:var(--periwinkle-deep,#5860A6);font-weight:700;}
  .ms-fly .sep{height:1px;background:var(--line-soft,rgba(34,34,34,.07));margin:7px 10px;}
  .ms-fly .ms-go{display:block;font-family:'Mulish',system-ui,sans-serif;font-size:12px;font-weight:700;
    color:var(--periwinkle-deep,#5860A6);padding:7px 10px 3px;text-decoration:none;}
  .ms-fly .ms-go:hover{text-decoration:underline;}
  @media print{.ms-side,.ms-fly{display:none!important;}}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

  const NAV=model();
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const side=document.createElement('aside'); side.className='ms-side';
  const nav=document.createElement('nav'); nav.className='ms-nav';
  NAV.forEach(s=>{
    const a=document.createElement('a');
    a.className='ms-rbtn'+(s.on?' active':''); a.href=s.go; a.dataset.k=s.k;
    a.setAttribute('aria-label',s.t); a.title=s.t;
    a.innerHTML=`<svg class="sbi" viewBox="0 0 24 24">${s.ic}</svg>`;
    nav.appendChild(a);
  });
  side.appendChild(nav);
  const fly=document.createElement('div'); fly.className='ms-fly'; fly.setAttribute('role','menu');
  side.appendChild(fly);   // inside .ms-side so embed/print rules that hide the rail hide this too

  // a link is current when its page matches and, where it carries a hash, the hash matches too
  function isHere(href){
    if(!href||href==='#') return false;
    const [file,hash]=href.split('#');
    if(file && !path.endsWith(file)) return false;
    if(!file && !hash) return false;
    if(hash) return location.hash.replace(/^#/,'')===hash;
    return !location.hash;
  }

  let openK=null,tOpen=null,tShut=null;
  function panel(s,btn){
    fly.innerHTML=`<h4>${esc(s.t)}</h4>`+s.links.map(([l,h,c])=>
      `<a class="ms-item${isHere(h)?' active':''}" href="${esc(h)}" role="menuitem">${esc(l)}${c?`<span class="cnt">${esc(c)}</span>`:''}</a>`).join('')
      +(s.go&&s.go!=='#'?`<div class="sep"></div><a class="ms-go" href="${esc(s.go)}">Go to ${esc(s.t)} →</a>`:'');
    const r=btn.getBoundingClientRect();
    fly.style.top='0px'; fly.classList.add('on');
    const h=fly.getBoundingClientRect().height;
    const floor=(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-headh'))||0)+8;
    fly.style.top=Math.round(Math.max(floor,Math.min(r.top-6,window.innerHeight-h-14)))+'px';
    openK=s.k;
    nav.querySelectorAll('.ms-rbtn').forEach(x=>x.classList.toggle('hot',x.dataset.k===s.k));
  }
  function show(k,btn){
    clearTimeout(tShut);
    const s=NAV.find(x=>x.k===k); if(!s) return;
    if(openK===k){ fly.classList.add('on'); return; }
    clearTimeout(tOpen);
    tOpen=setTimeout(()=>panel(s,btn), openK?40:150);   // deliberate first open, instant thereafter
  }
  function hide(){
    clearTimeout(tOpen);
    tShut=setTimeout(()=>{ fly.classList.remove('on'); openK=null;
      nav.querySelectorAll('.ms-rbtn').forEach(x=>x.classList.remove('hot')); },180);
  }
  nav.addEventListener('mouseover',e=>{ const b=e.target.closest('.ms-rbtn'); if(b) show(b.dataset.k,b); });
  nav.addEventListener('mouseleave',hide);
  fly.addEventListener('mouseenter',()=>clearTimeout(tShut));
  fly.addEventListener('mouseleave',hide);
  nav.addEventListener('focusin',e=>{ const b=e.target.closest('.ms-rbtn');
    if(b){ clearTimeout(tOpen); panel(NAV.find(x=>x.k===b.dataset.k),b); } });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ clearTimeout(tOpen); fly.classList.remove('on'); openK=null; } });
  window.addEventListener('resize',()=>{ fly.classList.remove('on'); openK=null; });
  // same-page hash moves (e.g. Settings ↔ Finance → Billing) re-evaluate which section is active
  window.addEventListener('hashchange',()=>{ try{ const M=model(); nav.querySelectorAll('.ms-rbtn').forEach(b=>{ const s=M.find(x=>x.k===b.dataset.k); if(s) b.classList.toggle('active',!!s.on); }); }catch(e){} });

  // touch has no hover: first tap opens the panel, the link inside navigates
  if(matchMedia('(hover:none)').matches){
    nav.addEventListener('click',e=>{ const b=e.target.closest('.ms-rbtn'); if(!b) return;
      if(openK!==b.dataset.k){ e.preventDefault(); clearTimeout(tOpen); panel(NAV.find(x=>x.k===b.dataset.k),b); } });
    document.addEventListener('click',e=>{ if(!e.target.closest('.ms-rbtn')&&!e.target.closest('.ms-fly')){ fly.classList.remove('on'); openK=null; } });
  }

  // ---- wrap page content (everything after .header) into the layout ----
  function measureHead(header){
    const st=header?getComputedStyle(header):null;
    // only offset for a header that actually stays put; a static one scrolls away
    const hh=(st&&(st.position==='sticky'||st.position==='fixed'))?Math.round(header.getBoundingClientRect().height):0;
    document.documentElement.style.setProperty('--ms-headh',hh+'px');
  }
  function build(){
    const header=document.querySelector('.header');
    if(!header){ document.body.prepend(side); return; }
    measureHead(header);
    window.addEventListener('resize',()=>measureHead(header));
    if(window.ResizeObserver) new ResizeObserver(()=>measureHead(header)).observe(header);
    else window.addEventListener('load',()=>measureHead(header));
    const layout=document.createElement('div'); layout.className='ms-layout';
    const content=document.createElement('div'); content.className='ms-content';
    let n=header.nextSibling; const toMove=[];
    while(n){ toMove.push(n); n=n.nextSibling; }
    toMove.forEach(node=>content.appendChild(node));
    layout.appendChild(side); layout.appendChild(content);
    header.after(layout);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();

  // Platform Admin pages outside Admin.html (Calendar, Calls, Chats): wear the admin console's
  // header (Merchsmith wordmark on periwinkle) and slim footer bar, not the store chrome
  if(ROLE==='admin'&&(/[?&]scope=platform\b/.test(location.search)||P(/Calendar\.html|Calls\.html|Emails\.html|Notifications\.html/i))){
    const st=document.createElement('style'); st.textContent=`
      body .header{background:var(--periwinkle)!important;}
      .adm-wm{display:flex;align-items:center;} .adm-wm img{height:22px;width:auto;display:block;}
      .crumbband,.ms-footer{display:none!important;}
      .adm-bar{position:fixed;left:68px;right:0;bottom:0;z-index:38;height:51px;display:flex;align-items:center;background:var(--blossom,#FFA2A5);color:#fff;font-size:12px;}
      .adm-bar-in{width:100%;display:flex;align-items:center;justify-content:space-between;gap:6px 26px;flex-wrap:wrap;padding:0 var(--page-gutter);}
      .adm-bar-g{display:flex;align-items:center;gap:8px 22px;flex-wrap:wrap;} .adm-bar a{color:#fff;text-decoration:none;font-weight:700;} .adm-bar a:hover{text-decoration:underline;} .adm-bar-b{font-weight:700;}
      body:has(.adm-bar) .main{padding-bottom:110px;}
      body:has(.adm-bar) .msid-switch{bottom:65px;} body:has(.adm-bar) .chat-fab{bottom:69px;} body:has(.adm-bar) .cll-bar{bottom:69px;}
      @media print{.adm-bar{display:none;}}`; document.head.appendChild(st);
    const BAR='<footer class="adm-bar"><div class="adm-bar-in"><div class="adm-bar-g"><span>Merchsmith Ltd · Company no. 14827391</span><span>© 2026 Merchsmith</span></div><div class="adm-bar-g"><a href="Merchsmith Page.html?p=terms">Platform terms</a><a href="Merchsmith Page.html?p=privacy">Operator privacy</a><a href="mailto:ops@merchsmith.com">Support</a><span class="adm-bar-b">Build 2026.09.21</span></div></div></footer>';
    const sync=()=>{ const b=document.querySelector('.header [data-identity-lockup]')||document.querySelector('.header .brand');
      if(b&&!b.querySelector('.adm-wm')) b.innerHTML='<a class="adm-wm" href="Merchsmith Admin.html#nav=overview" aria-label="Platform Admin home"><img src="assets/merchsmith-wordmark-white.png" alt="Merchsmith"></a>';
      document.querySelectorAll('.ms-footer,.crumbband').forEach(f=>f.remove());
      if(document.body&&!document.querySelector('.adm-bar')) document.body.insertAdjacentHTML('beforeend',BAR); };
    const go=()=>{ sync(); new MutationObserver(sync).observe(document.body,{childList:true,subtree:true}); };
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go();
  }
})();

/* ms-dl-deeplink: #…&dl=<key> opens a page and starts its download (used by the PDF documents audit page).
   keys: sheet · detailed · print · pfdl · bkdoc · doc:<order doc key> */
(function(){ if(window.__msDL) return; window.__msDL=1; const m=location.hash.match(/[#&]dl=([^&]+)/); if(!m) return; const k=decodeURIComponent(m[1]);
  const sel=k==='sheet'?'#ttDownload':k==='detailed'?'#ttDownloadDetail':k==='print'?'[data-dprint]':k==='pfdl'?'[data-pfdl]':k==='bkdoc'?'[data-dl]':k.startsWith('doc:')?'[data-doc="'+k.slice(4).replace(/"/g,'')+'"]':null; if(!sel) return;
  let n=0; const iv=setInterval(()=>{ const el=document.querySelector(sel); if(el||++n>60){ clearInterval(iv); if(el){ history.replaceState(null,'',location.href.replace(/&?dl=[^&]+/,'').replace(/#$/,'')); el.click(); } } },300); })();
