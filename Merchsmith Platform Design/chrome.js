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
    const header=document.querySelector('.header');
    if(!header){ buildFooter(); return; }   // no standard header (e.g. content pages) — still footer them
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
          <a class="am-i" href="Merchsmith Profile.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>My profile</a>
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
  /* ---------- footer ----------
     One footer, every page (embeds hide it via html.embed). Everything here is
     distributor-editable from Distributor Settings → Footer, persisted in
     'ms-footer-cfg'. Colour comes from --periwinkle-deep, so the footer follows
     whatever colourway the distributor has chosen. */
  // the Merchsmith default store keeps its own footer, separate from any distributor's
  const FOOTER_KEY = window.MS_SCOPE==='platform' ? 'ms-footer-cfg:platform' : 'ms-footer-cfg';
  const PG='Merchsmith Page.html?p=';
  const FOOTER_DEF={
    blurb:'Sustainable promotional merchandise, branded in-house and delivered on time.',
    talk:{t:"Let's Talk.",h:PG+'contact',on:true},
    exit:{t:'Visit Mojo Promotions',h:'https://www.mojopromotions.co.uk',on:true},
    cols:[
      {h:'Company',links:[
        {t:'About us',h:PG+'about',on:true},
        {t:'Environmental footprint',h:PG+'environment',on:true},
        {t:'Value chain',h:PG+'value-chain',on:true},
        {t:'People & culture',h:PG+'people',on:true},
      ]},
      {h:'Let us help',links:[
        {t:'FAQ',h:PG+'faq',on:true},
        {t:'Terms & conditions',h:PG+'terms',on:true},
        {t:'Privacy',h:PG+'privacy',on:true},
        {t:'Returns',h:PG+'returns',on:true},
        {t:'Contact us',h:PG+'contact',on:true},
      ]},
    ],
    news:{on:true,h:'Stay in touch',b:'Product drops, sustainability news and the occasional good idea. No more than monthly.',ph:'Your work email',cta:'Sign up'},
    contact:{email:'hello@mojopromotions.co.uk',phone:'+44 1234 567 890',on:true},
    // mark = a built-in placeholder emblem (seal/leaf/globe/rosette/shield). Real accreditation
    // logos are third-party trademarks — drop the actual files in via Settings → Footer (img)
    // and the emblem is replaced by the artwork.
    accred:[
      {t:'Certified',s:'B Corporation',mark:'seal',img:'assets/accred-01.png',hpx:52,on:true},
      {t:'Climate positive',s:'Ecologi workforce',mark:'leaf',img:'assets/accred-02.png',hpx:30,on:true},
      {t:'Member',s:'bpma',mark:'rosette',img:'assets/accred-04.png',hpx:28,on:true},
      {t:'Accredited',s:'Living Wage Employer',mark:'shield',img:'assets/accred-03.png',hpx:46,on:true},
    ],
    social:[
      {k:'x',t:'X',h:'',on:true},
      {k:'facebook',t:'Facebook',h:'',on:true},
      {k:'instagram',t:'Instagram',h:'',on:true},
      {k:'linkedin',t:'LinkedIn',h:'',on:true},
      {k:'youtube',t:'YouTube',h:'',on:true},
    ],
    pay:{on:true,label:'Secured by Stripe',cards:[
      {t:'Visa',img:'assets/pay-visa.png',hpx:15},
      {t:'Mastercard',img:'assets/pay-mastercard.png',hpx:22},
      {t:'American Express',img:'assets/pay-amex.png',hpx:22},
    ]},
    legal:[
      {t:'Cookie policy',h:PG+'cookies',on:true},
      {t:'Accessibility',h:PG+'accessibility',on:true},
    ],
    copyright:'© 2026 Mojo Promotions',
    powered:true,
  };
  const SOCIAL_SVG={
    x:'<path d="M5 5l14 14M19 5L5 19" stroke-linecap="round"/>',
    facebook:'<path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V8.5a.5.5 0 0 1 .5-.5z"/>',
    instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
    linkedin:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7v0M11 17v-4a2 2 0 0 1 4 0v4"/>',
    youtube:'<rect x="2.5" y="6" width="19" height="12" rx="3.5"/><path d="M11 10l4 2-4 2z" fill="currentColor" stroke="none"/>',
  };
  // Guess an emblem + qualifier/name split from an accreditation's label, so configs
  // saved before those keys existed still render a distinct, correct-looking badge.
  const ACC_RULES=[
    [/b ?corp/i,                        'seal',   'Certified',      'B Corporation'],
    [/ecologi|tree|forest/i,            'leaf',   'Climate action', null],
    [/climate|carbon|net ?zero/i,       'globe',  'Climate positive',null],
    [/bpma|member|association|chamber/i,'rosette','Member',         null],
    [/living wage|wage|accredit/i,      'shield', 'Accredited',     null],
    [/iso|certif/i,                     'seal',   'Certified',      null],
  ];
  function accFill(a){
    if(!a||typeof a!=='object') return a;
    if(a.mark&&(a.s||a.t)) return a;                       // already in the new shape
    const label=String(a.t||'').trim();
    const hit=ACC_RULES.find(r=>r[0].test(label));
    const mark=a.mark||(hit?hit[1]:'seal');
    if(a.s) return Object.assign({},a,{mark});
    // split the label into a small-caps qualifier + the body name
    let q=hit&&hit[2], name=(hit&&hit[3])||label;
    if(q&&hit[3]==null){
      // only strip the qualifier where it prefixes the label, so nothing is said twice
      // and mid-label words are left alone ("Climate positive workforce" → "Workforce")
      const re=new RegExp('^'+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b[\\s,:-]*','i');
      const stripped=label.replace(re,'').trim();
      name=(stripped&&stripped!==label)?stripped.charAt(0).toUpperCase()+stripped.slice(1):label;
    }
    if(!q){ q='Accredited'; name=label; }
    return Object.assign({},a,{mark,t:q,s:name});
  }
  function footerCfg(){
    let c=null; try{ c=JSON.parse(localStorage.getItem(FOOTER_KEY)||'null'); }catch(e){}
    const d=JSON.parse(JSON.stringify(FOOTER_DEF));
    if(!c||!c.cols) return d;                              // pre-redesign config is discarded
    const out=Object.assign({},d,c);                       // fresh target — d must stay pristine
    // saved copies predate later keys — merge per-object rather than replacing wholesale
    ['talk','exit','news','contact'].forEach(k=>{ out[k]=Object.assign({},d[k],c[k]||{});
      if(c[k]&&c[k].t===(FOOTER_DEF_V1[k]||{}).t) out[k].t=d[k].t; });   // stale label → take the new default
    // a saved list with no logo on any entry predates the real artwork → adopt the defaults
    const savedAcc=c.accred&&c.accred.length?c.accred:null;
    out.accred=(savedAcc&&savedAcc.some(a=>a&&a.img)?savedAcc:d.accred).map(accFill);
    // saved card lists were plain strings before the artwork existed → adopt the defaults
    // Restore the defaults when the saved card list predates the artwork (bare strings) or was
    // emptied by the old editor, which flattened the objects away on every save. A list of real
    // card objects is left alone, so a deliberate selection still sticks.
    if(out.pay&&(!Array.isArray(out.pay.cards)||!out.pay.cards.length||out.pay.cards.some(x=>typeof x==='string'))) out.pay.cards=d.pay.cards;
    return out;
  }
  // labels shipped by the previous footer revision: if a saved config still carries one
  // verbatim, the distributor never edited it, so the current default should win.
  const FOOTER_DEF_V1={ exit:{t:'About Mojo Promotions'} };
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function buildFooter(){
    const old=document.querySelector('.ms-footer'); if(old) old.remove();
    if(document.querySelector('footer.foot')) return;   // page has its own inline footer
    const c=footerCfg();
    const on=a=>a&&a.on!==false;
    const lnk=a=>`<a href="${esc(a.h||'#')}">${esc(a.t)}</a>`;
    const isAdmin=(window.MSID&&MSID.current()==='admin');

    const cols=(c.cols||[]).map(col=>{
      const ls=(col.links||[]).filter(on); if(!ls.length&&!col.h) return '';
      return `<div class="msf-col"><h4>${esc(col.h)}</h4>${ls.map(lnk).join('')}</div>`;
    }).join('');

    const news=on(c.news)?`<div class="msf-newsband">
      <div class="msf-newstext"><h4>${esc(c.news.h)}</h4><p>${esc(c.news.b)}</p></div>
      <form class="msf-form" novalidate>
        <input type="email" required placeholder="${esc(c.news.ph)}" aria-label="Email address">
        <button type="submit">${esc(c.news.cta)}</button>
      </form>
      <p class="msf-newsok" hidden>Thanks — you're on the list.</p>
    </div>`:'';

    const ct=c.contact||{};
    const contact=on(ct)?`<div class="msf-contact">
      ${ct.email?`<a class="msf-cline" href="mailto:${esc(ct.email)}"><svg viewBox="0 0 24 24"><path d="M3 7l9 6 9-6M3 7h18v10H3z"/></svg>${esc(ct.email)}</a>`:''}
      ${ct.phone?`<a class="msf-cline" href="tel:${esc(String(ct.phone).replace(/\s/g,''))}"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a15 15 0 0 1-15-15z"/></svg>${esc(ct.phone)}</a>`:''}
    </div>`:'';

    const exit=on(c.exit)?`<a class="msf-exit" href="${esc(c.exit.h||'#')}" target="_blank" rel="noopener">${esc(c.exit.t)}
      <svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg></a>`:'';

    const MARKS={
      seal:'<circle cx="12" cy="12" r="9"/><path d="M12 7.6h2.2a2.1 2.1 0 0 1 0 4.2H12zM12 11.8h2.5a2.3 2.3 0 0 1 0 4.6H12zM12 7.6v8.8"/>',
      leaf:'<path d="M4.5 19.5c0-7 5-12 15-12 0 9.5-5.5 13.5-11.5 13.5a4 4 0 0 1-3.5-1.5z"/><path d="M7 17c2-4.5 5.5-7 9.5-8.5"/>',
      globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18z"/>',
      rosette:'<circle cx="12" cy="9.5" r="5.5"/><path d="M8.6 14.3 7 21l5-2.4L17 21l-1.6-6.7"/>',
      shield:'<path d="M12 3.2 20 6v6.2c0 4.4-3.3 7.4-8 8.6-4.7-1.2-8-4.2-8-8.6V6z"/><path d="M8.8 12.2l2.3 2.3 4.1-4.6"/>'
    };
    const accred=(c.accred||[]).filter(on);
    const accredRow=accred.length?`<div class="msf-accred">${accred.map(a=>a.img
      ? `<span class="msf-acc has"><img src="${esc(a.img)}" alt="${esc([a.t,a.s].filter(Boolean).join(' '))}"${a.hpx?` style="height:${+a.hpx}px"`:''} onerror="this.parentNode.classList.remove('has');this.parentNode.innerHTML=this.parentNode.dataset.fb" data-fb="${esc(a.t)}"></span>`
      : `<span class="msf-acc"><svg class="msf-mark" viewBox="0 0 24 24" aria-hidden="true">${MARKS[a.mark]||MARKS.seal}</svg><span class="msf-acctx"><b>${esc(a.t)}</b>${a.s?`<i>${esc(a.s)}</i>`:''}</span></span>`).join('')}</div>`:'';

    const social=(c.social||[]).filter(on);
    const socialRow=social.length?`<div class="msf-social">${social.map(s=>
      `<a href="${esc(s.h||'#')}" aria-label="${esc(s.t)}"${s.h?' target="_blank" rel="noopener"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">${SOCIAL_SVG[s.k]||''}</svg></a>`).join('')}</div>`:'';

    const pay=on(c.pay)?`<div class="msf-pay">${c.pay.label?`<span class="msf-stripe">${esc(c.pay.label)}</span>`:''}${(c.pay.cards||[]).map(x=>{ const o=(typeof x==='string')?{t:x}:(x||{});
      return o.img
        ? `<img class="msf-cardimg" src="${esc(o.img)}" alt="${esc(o.t)}"${o.hpx?` style="height:${+o.hpx}px"`:''} onerror="this.outerHTML='<span class=\\'msf-card\\'>'+this.alt+'</span>'">`
        : `<span class="msf-card">${esc(o.t)}</span>`; }).join('')}</div>`:'';

    const legal=(c.legal||[]).filter(on).map(lnk).join('');

    const f=document.createElement('footer'); f.className='ms-footer';
    f.innerHTML=`<div class="msf-in">
      <div class="msf-hero">
        <div class="msf-lead">
          ${on(c.talk)?`<span class="msf-talkbig">${esc(c.talk.t)}</span>`:''}
          ${c.blurb?`<p class="msf-blurb">${esc(c.blurb)}</p>`:''}
          ${contact}
          ${exit}
        </div>
        ${cols}
      </div>
      ${news}
      ${(accredRow||socialRow)?`<div class="msf-strip">${accredRow}${socialRow}</div>`:''}
      <div class="msf-bot">
        <div class="msf-legal">${c.copyright?`<span>${esc(c.copyright)}</span>`:''}${legal}${c.powered!==false?'<span>Powered by Merchsmith</span>':''}</div>
        ${pay}
      </div>
    </div>`;

    const form=f.querySelector('.msf-form');
    if(form) form.addEventListener('submit',e=>{ e.preventDefault();
      const i=form.querySelector('input'); if(!i.value||!i.checkValidity()){ i.focus(); return; }
      form.hidden=true; const ok=f.querySelector('.msf-newsok'); if(ok) ok.hidden=false; });

    (document.querySelector('.ms-content')||document.body).appendChild(f);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', build); else build();
  // load shared org chat (launcher + profile pane) once
  if(!document.querySelector('script[data-chat]')){ const s=document.createElement('script'); s.src='chat.js?v=2'; s.setAttribute('data-chat','1'); document.body.appendChild(s); }
  window.MSChrome={ FOOTER_KEY, buildFooter, FOOTER_DEF, footerCfg, accFill, ACC_MARKS:['seal','leaf','globe','rosette','shield'] };
})();
