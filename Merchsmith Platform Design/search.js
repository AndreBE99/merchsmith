/* ============================================================
   search.js — platform search (spec: Merchsmith Search Spec.dc.html)
   · Header search on every page (chrome.js .ms-hsearch, project page .hsearch):
     dropdown under the bar (full screen on phones), / or Ctrl/⌘K to open,
     grouped results, top result, exact-ref jump, chips, hidden shortcuts
     (in: status: customer: supplier: project:), actions, recents.
   · Full results panel (#search=q&in=type) with type + product filters.
   · One matcher (match/score): case, accents, ref spacing, word starts,
     1 typo (5+ letters), fixed synonyms, colour words, plurals, "under £5".
   · Role-aware: results only for what the signed-in role can open.
   · Search insights (Distributor Settings → Store → Search insights).
   · List boxes: Esc clears, Shift+Enter searches everywhere; Organisations wired.
   Stores: ms-search-recent, ms-search-opened, ms-search-log.
   In the prototype this runs over the browser's demo data; live needs a
   server-side index that applies the same permission rules.
   ============================================================ */
window.MSSEARCH=window.MSSEARCH||(function(){
  const d=document, LS=localStorage;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const J=(k,f)=>{ try{ const v=JSON.parse(LS.getItem(k)||'null'); return v==null?f:v; }catch(e){ return f; } };
  const PUT=(k,v)=>{ try{ LS.setItem(k,JSON.stringify(v)); }catch(e){} };
  const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const refk=s=>norm(s).replace(/[^a-z0-9]/g,'');
  const stem=w=>w.length>4&&/ies$/.test(w)?w.slice(0,-3)+'y':w.length>3&&/ss$/.test(w)?w:w.length>4&&/(sh|ch|x)es$/.test(w)?w.slice(0,-2):w.length>3&&/s$/.test(w)?w.slice(0,-1):w.length>5&&/ing$/.test(w)?w.slice(0,-3):w.length>4&&/ed$/.test(w)?w.slice(0,-2):w;
  const words=s=>norm(s).replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
  const toks=s=>[...new Set(words(s).map(stem))];
  const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const STOP=new Set(['the','a','an','for','of','and','with','my','me','show','find','all','some']);

  /* ---------- fixed synonyms (Merchsmith list) + colour words ---------- */
  const SYN=[['tote','bag','shopper','carrier'],['mug','cup','beaker'],['pen','biro','ballpen','ballpoint'],['hoodie','sweatshirt','hoody','jumper'],['eco','sustainable','recycled','green','organic'],['tshirt','tee'],['notebook','notepad','journal','jotter'],['bottle','flask','tumbler'],['cable','charger','lead'],['lanyard','strap'],['umbrella','brolly'],['usb','flashdrive','memory'],['cap','hat','beanie'],['powerbank','battery'],['speaker','audio'],['sticker','decal'],['lunchbox','lunch'],['jacket','coat','softshell'],['backpack','rucksack']];
  const SYNM={}; SYN.forEach(g=>g.forEach(w=>{ const s=stem(w); SYNM[s]=(SYNM[s]||[]).concat(g.map(stem).filter(x=>x!==s)); }));
  const COLG={navy:['navy','midnight','marine','dark blue'],black:['black','jet','onyx'],grey:['grey','gray','silver','charcoal','graphite','slate'],white:['white','ivory','cream','off white','snow'],red:['red','burgundy','maroon','scarlet','cherry','wine'],blue:['blue','royal','cobalt','sky','aqua','turquoise','teal','cyan'],green:['green','lime','olive','forest','khaki','mint','sage'],yellow:['yellow','mustard','gold','lemon'],orange:['orange','amber','coral','terracotta'],pink:['pink','magenta','fuchsia','rose','blush'],purple:['purple','violet','lilac','plum','lavender'],brown:['brown','tan','kraft','natural','beige','sand','cork','wood','camel']};
  const COLB={}; Object.entries(COLG).forEach(([b,L])=>L.forEach(n=>words(n).forEach(w=>{ COLB[w]=b; })));
  const colBase=name=>{ try{ if(window.MSCOLOUR&&MSCOLOUR.mapOr){ const m=MSCOLOUR.mapOr(name); if(m) return norm(m); } }catch(e){} const w=words(name).find(x=>COLB[x]); return w?COLB[w]:''; };
  function lev1(a,b){ if(a===b) return true; const la=a.length, lb=b.length; if(Math.abs(la-lb)>1) return false; let i=0,j=0,e=0;
    while(i<la&&j<lb){ if(a[i]===b[j]){ i++; j++; continue; } if(++e>1) return false; if(la>lb) i++; else if(lb>la) j++; else { i++; j++; } } return e+(la-i)+(lb-j)<=1; }
  function wmatch(q,T){ let pre=false;
    for(const t of T){ if(t===q) return {s:3}; if(!pre&&t.startsWith(q)) pre=true; } if(pre) return {s:2};
    const alts=(SYNM[q]||[]).concat(COLB[q]?[COLB[q]]:[]);
    for(const a of alts) for(const t of T) if(t===a||t.startsWith(a)) return {s:1.8,syn:1};
    if(q.length>=5) for(const t of T) if(Math.abs(t.length-q.length)<=1&&lev1(q,t)) return {s:1.2,fix:t};
    return {s:0}; }
  /* simple text test, for list boxes: every word must match the text */
  function match(text,q){ const W=words(q).map(stem).filter(w=>!STOP.has(w)); if(!W.length) return true; const T=toks(text), rk=refk(q);
    if(rk.length>=3&&/\d/.test(rk)&&refk(text).includes(rk)) return true; return W.every(w=>wmatch(w,T).s>0); }

  /* ---------- query: hidden shortcuts, price, quantity ---------- */
  const CHIPOF={product:'product',products:'product',store:'product',project:'project',projects:'project',item:'item',items:'item',order:'order',orders:'order',po:'order',pos:'order',invoice:'order',invoices:'order',doc:'order',docs:'order',documents:'order',people:'person',person:'person',contacts:'person',contact:'person',org:'org',orgs:'org',organisations:'org',organisation:'org',customers:'org',supplier:'supplier',suppliers:'supplier',ranges:'supplier',range:'supplier',messages:'msg',message:'msg',chats:'msg',emails:'msg',pages:'page',page:'page',settings:'page',actions:'action'};
  function parse(raw){ let s=' '+String(raw||'')+' '; const f={};
    s=s.replace(/\s(in|type|status|customer|supplier|project):(?:"([^"]+)"|(\S+))/gi,(m,k,a,b)=>{ f[k.toLowerCase()]=(a||b||'').trim(); return ' '; });
    const pm=s.match(/\b(?:under|below|less than|max|up to)\s*£?\s*(\d+(?:\.\d+)?)/i); if(pm){ f.maxPrice=+pm[1]; s=s.replace(pm[0],' '); }
    const qm=s.match(/^\s*(\d{2,5})\s*(?:x\s+)?(?=[a-z]{3,})/i); if(qm){ f.qty=+qm[1]; s=s.replace(qm[0],' '); }
    const chip=f.in||f.type?CHIPOF[norm(f.in||f.type)]||'':'';
    const clean=s.replace(/\s+/g,' ').trim();
    return {f,chip,text:clean,raw:String(raw||''),words:words(clean).filter(w=>!STOP.has(w)).map(stem),rawWords:words(clean).filter(w=>!STOP.has(w)),rk:refk(clean)}; }

  /* ---------- who is searching ---------- */
  function who(){ const id=(window.MSID&&MSID.current&&MSID.current())||'distributor', g=(window.MSID&&MSID.get&&MSID.get())||{};
    return {role:id,sub:String(g.role||''),me:g.who||(id==='customer'?'Sara Kemp':id==='supplier'?'Tom Reed':id==='admin'?'Morgan Slade':'Jess Doyle'),sup:(window.MSID&&MSID.SUPPLIER&&MSID.SUPPLIER.name)||'BagWorks UK'}; }
  const onStore=()=>/Store\.html|Page\.html/i.test(decodeURIComponent(location.pathname));

  /* ---------- data (lazy-loaded where a page doesn't have it) ---------- */
  const NEED=[['ORG_DATA','org-data.js?v=12'],['PROJECTS','projects-data.js'],['STORE','store-feed.js?v=2'],['MSCAT','catalogue-data.js?v=12']];
  const loadJS=src=>new Promise(res=>{ if(d.querySelector('script[src^="'+src.split('?')[0]+'"]')) return setTimeout(res,60); const s=d.createElement('script'); s.src=src; s.onload=s.onerror=()=>res(); d.head.appendChild(s); });
  let dataP=null;
  function ensure(){ if(dataP) return dataP; dataP=(async()=>{ let got=false; for(const [g,src] of NEED) if(!window[g]){ await loadJS(src); got=true; } if(got) IDX=null; })(); return dataP; }

  const TH=[[/cable|charg/i,'cable'],[/mouse/i,'mouse'],[/pen\b|pencil/i,'pen'],[/notebook|journal|paper/i,'book'],[/bag|tote/i,'bag'],[/garden|seed|plant/i,'garden'],[/cup|mug|bottle|tumbler/i,'drinkware'],[/tooth|bamboo/i,'lifestyle'],[/desk/i,'desk']];
  const STL={idea:'Idea',prog:'In progress',ready:'Ready to order',ordered:'Ordered',deliver:'Delivered',action:'Action required'};
  const OST={approval:'Awaiting approval',placed:'Order placed',ack:'Acknowledged',production:'In production',dispatch:'Dispatched',dispatched:'Dispatched',delivered:'Delivered',cancelled:'Cancelled'};
  const PROJ='Merchsmith Project - Autumn Giveaways.html';
  function storeMap(){ const m={}, byName={}; ((window.STORE&&STORE.products)||[]).forEach(p=>{ m[p.id]=p; byName[norm(p.name)]=p; }); return {m,byName}; }
  function imgFor(name,SM){ const p=SM.byName[norm(name)]; if(p&&p.imgUrl) return p.imgUrl; const t=TH.find(([r])=>r.test(name)); return 'assets/products/'+(t?t[1]:'tech')+'.png'; }
  const custName=id=>{ const c=((window.ORG_DATA&&ORG_DATA.customers)||[]).find(x=>x.id===id); return c?c.name:(id?String(id).replace(/^./,x=>x.toUpperCase()):'Citrix'); };
  const amOf=cid=>{ try{ return (window.MSAM&&MSAM.get&&(MSAM.get(cid)||{}).n)||''; }catch(e){ return ''; } };

  const PAGES=[
    ['Home','Merchsmith Home.html','dashboard start','cd'],['Store','Merchsmith Store.html','shop products catalogue browse','cd'],
    ['Your projects','Merchsmith Projects.html','projects briefs','c'],['Projects','Merchsmith Distributor Projects.html','projects master table customers','d'],
    ['Orders','Merchsmith Orders.html','orders track delivery po','cds'],['Order stats','Merchsmith Orders.html#stats','dashboard stats revenue profit report','d'],['Targets','Merchsmith Orders.html#targets','targets sales goals','d'],
    ['Basket','Merchsmith Basket.html','basket cart checkout','cd'],['Brand assets','Merchsmith Brand Assets.html','logos colours fonts artwork brand','cd'],
    ['Chats','Merchsmith Chats.html','messages chat conversations','cdsa'],['Calendar','Merchsmith Calendar.html','meetings diary availability holidays','cdsa'],
    ['Calls','Merchsmith Calls.html','phone calls voicemail dial','da'],['Emails','Merchsmith Emails.html','email templates sent signatures domain','da'],['Notifications','Merchsmith Notifications.html','alerts notifications','cdsa'],
    ['Organisations','Merchsmith Organisations.html','customers suppliers organisations','d'],['Customers','Merchsmith Organisations.html#tab=customers','customers accounts terms credit','d'],['Suppliers','Merchsmith Organisations.html#tab=suppliers','suppliers connections feeds','d'],
    ['Team','Merchsmith Team.html','team colleagues invite members','cd'],['Users','Merchsmith Users.html','users people everyone','d'],
    ['Finance','Merchsmith Finance.html','finance invoices billing bank stripe xero accounting payments','d'],['Customer invoices','Merchsmith Finance.html#sub=cust','invoices customer unpaid','d'],['Supplier invoices','Merchsmith Finance.html#sub=sup','supplier invoices bills credits','d'],
    ['Invoices & payments','Merchsmith Customer Finance.html','invoices pay payments terms credit','c'],['Account & terms','Merchsmith Customer Settings.html#tab=account','terms credit vat payment','c'],['Settings','Merchsmith Customer Settings.html','settings account','c'],
    ['Settings › Organisation profile','Merchsmith Distributor Settings.html#tab=orgprofile','company number vat address main contact profile','d'],
    ['Settings › Lead times','Merchsmith Distributor Settings.html#tab=leadtimes','lead times samples shipping via us goods in','d'],['Settings › Footer','Merchsmith Distributor Settings.html#tab=footer','footer accreditations links social','d'],
    ['Settings › Pages','Merchsmith Distributor Settings.html#tab=pages','pages about content','d'],['Settings › Branding','Merchsmith Distributor Settings.html#tab=branding','branding logo favicon colourway colours','d'],
    ['Settings › Domain','Merchsmith Distributor Settings.html#tab=domain','domain url web address','d'],['Settings › Warning drafts','Merchsmith Distributor Settings.html#tab=warndrafts','proof warnings drafts','d'],
    ['Settings › Sales literature','Merchsmith Distributor Settings.html#tab=saleslit','sales literature brochure quote pages','d'],['Settings › Customer defaults','Merchsmith Distributor Settings.html#tab=custdefaults','default payment terms credit limit new customers','d'],
    ['Settings › Subscription','Merchsmith Distributor Settings.html#tab=subscription','plan seats subscription billing','d'],['Store settings › Homepage','Merchsmith Distributor Settings.html#tab=storehome','store homepage hero spotlight','d'],
    ['Store settings › Markup & pricing','Merchsmith Distributor Settings.html#tab=markup','markup margin pricing','d'],['Store settings › Discounts','Merchsmith Distributor Settings.html#tab=discounts','discounts promo codes','d'],
    ['Store settings › Appearance','Merchsmith Distributor Settings.html#tab=appearance','fonts appearance shapes headings','d'],['Store range','Merchsmith Distributor Settings.html#tab=storerange','range curated products suppliers','d'],
    ['Store settings › Search insights','Merchsmith Distributor Settings.html#tab=searchins','search insights top searches no results','d'],
    ['Your profile','Merchsmith Profile.html','profile photo name password me','cdsa'],['Supplier portal','Merchsmith Supplier Portal.html','products profile carriage decorating goods in','s'],
    ['Platform dashboard','Merchsmith Admin.html#nav=home','dashboard overview','a'],['Distributors','Merchsmith Admin.html#nav=distributors','distributors subscriptions','a'],['Suppliers','Merchsmith Admin.html#nav=suppliers','suppliers feeds','a'],['Product database','Merchsmith Admin.html#nav=products','products catalogue database mapping','a'],['Users','Merchsmith Admin.html#nav=users','users people','a']];
  const ACTIONS=[
    ['New project','Merchsmith Create Project.html?new=1','new create start project brief','cd'],['Invite a colleague','Merchsmith Team.html','invite add colleague team member','c'],
    ['Pay an invoice','Merchsmith Customer Finance.html#tab=invoices','pay invoice payment','c'],['Approve proofs','Merchsmith Projects.html','approve proof proofs','c'],['Add a brand asset','Merchsmith Brand Assets.html','add upload logo asset','c'],
    ['Add customer','Merchsmith Organisations.html#tab=customers','add new create customer','d'],['Invite team member','Merchsmith Team.html','invite add team member colleague','d'],['Connect a supplier','Merchsmith Organisations.html#tab=suppliers','connect add supplier','d'],
    ['Change markup','Merchsmith Distributor Settings.html#tab=markup','change set markup margin','d'],['Create promo code','Merchsmith Distributor Settings.html#tab=discounts','create new promo code discount','d'],['Upload sales literature','Merchsmith Distributor Settings.html#tab=saleslit','upload add sales literature','d'],['Write an email','Merchsmith Emails.html','write new send email compose','d'],
    ['Upload an invoice','Merchsmith Orders.html','upload invoice send bill','s'],['Update carriage rates','Merchsmith Supplier Portal.html','update change carriage delivery rates','s'],['Update products','Merchsmith Supplier Portal.html','update add products feed','s'],
    ['Invite distributor','Merchsmith Admin.html#nav=distributors','invite add new distributor','a'],['Add supplier','Merchsmith Admin.html#nav=suppliers','add new supplier','a'],['Add product','Merchsmith Admin.html#nav=products','add new product','a']];
  const RC={customer:'c',distributor:'d',supplier:'s',admin:'a'};

  let IDX=null, IDXk='';
  function index(){ const W=who(), key=W.role+'|'+W.me; if(IDX&&IDXk===key&&Date.now()-IDX.at<30000) return IDX.items;
    const out=[], SM=storeMap(), R=W.role, isC=R==='customer', isD=R==='distributor', isS=R==='supplier', isA=R==='admin', rc=RC[R]||'d';
    const add=it=>{ it._n=toks(it.n||it.title); it._o=toks(it.o||''); out.push(it); };
    PAGES.filter(p=>p[3].includes(rc)).forEach(([t,h,k])=>add({type:'page',id:'pg:'+h,title:t,sub:h.replace(/^Merchsmith /,'').replace(/\.html.*$/,''),href:h,n:t,o:k}));
    ACTIONS.filter(p=>p[3].includes(rc)).forEach(([t,h,k])=>add({type:'action',id:'ac:'+t,title:t,sub:'Action',href:h,n:t,o:k}));
    const D=window.ORG_DATA||{};
    // projects + items
    if(!isS&&window.PROJECTS) PROJECTS.forEach(p=>{ const mine=(p.team||[]).includes(W.me), cust=p.customer||'Citrix';
      add({type:'project',id:'pj:'+p.id,title:p.name,sub:(p.items||[]).length+' items · '+cust+(p.orderBy?' · order by '+new Date(p.orderBy).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''),href:PROJ,n:p.name,o:[cust,(p.team||[]).join(' '),p.brief||''].join(' '),mine,org:cust,status:''});
      (p.items||[]).forEach(it=>add({type:'item',id:'pi:'+p.id+':'+it.n,title:it.n,sub:'In '+p.name+' · '+(STL[it.st]||'Idea'),href:PROJ+'#product='+encodeURIComponent(it.n),img:imgFor(it.n,SM),n:it.n,o:[p.name,cust,STL[it.st]||''].join(' '),mine:mine||it.st==='action',status:STL[it.st]||'',org:cust,project:p.name,boost:it.st==='action'?6:0})); });
    // orders
    let O=J('ms-orders',null); if(!Array.isArray(O)) O=(window.MSOrders&&MSOrders.getOrders&&MSOrders.getOrders())||[];
    O.forEach(o=>{ const lines=(o.lines||[]); let L=lines; if(isS){ L=lines.filter(l=>l.supplier===W.sup||(l.blankSupplier===W.sup)); if(!L.length) return; }
      const cust=custName(o.customer||'citrix'), st=OST[o.status]||String(o.status||'').replace(/^./,x=>x.toUpperCase()), pc=(String(o.address||'').match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i)||[''])[0];
      const sum=L.slice(0,2).map(l=>(l.qty?l.qty.toLocaleString('en-GB')+' × ':'')+l.name).join(', ')+(L.length>2?' +'+(L.length-2):'');
      const mine=isC?o.placedBy===W.me:isD?amOf(o.customer||'citrix')===W.me:false;
      add({type:'order',id:'or:'+o.id,title:o.ref||o.id,sub:(isS?'':cust+' · ')+sum,href:'Merchsmith Orders.html#order='+o.id,refs:[o.ref,o.po,o.id].concat(L.map(l=>l.tracking||'')),n:[o.ref,sum].join(' '),
        o:[o.project,o.placedBy,pc,isS?'':cust,(isC?'':L.map(l=>l.supplier).join(' ')),o.sample?'sample':'',L.map(l=>l.variant||'').join(' ')].join(' '),status:st,org:cust,project:o.project||'',supplier:L.map(l=>l.supplier).join(' '),mine,boost:/approval|placed/.test(o.status)?3:0}); });
    // organisations
    if(isD||isA){ (D.customers||[]).forEach(c=>add({type:'org',id:'og:'+c.id,title:c.name,sub:'Customer · '+(c.status==='draft'?'Draft':c.status==='active'?'Active':'Invited')+(c.city?' · '+c.city:''),href:isA?'Merchsmith Admin.html#nav=users':'Merchsmith Organisations.html#org='+c.id,
        refs:[c.customerNo,c.companyNo],n:c.name,o:[c.legalName,c.domain,c.city,c.postcode,'customer'].join(' '),mine:isD&&amOf(c.id)===W.me,org:c.name,initials:c.initials||c.name}));
      (D.suppliers||[]).forEach(s=>add({type:'org',id:'os:'+s.id,title:s.name,sub:'Supplier'+(s.region?' · '+s.region:''),href:isA?'Merchsmith Admin.html#nav=suppliers':'Merchsmith Organisations.html#org='+s.id,refs:[s.companyNo],n:s.name,o:[s.domain,s.region,'supplier',(s.specialisms||[]).join(' ')].join(' '),org:s.name,initials:s.name})); }
    if(isA&&window.ADMIN) (ADMIN.distributors||[]).forEach(r=>add({type:'org',id:'od:'+r.id,title:r.name,sub:'Distributor · '+(r.plan||'')+(r.owner?' · '+r.owner:''),href:'Merchsmith Admin.html#nav=distributors',refs:[r.companyNo],n:r.name,o:[r.owner,r.ownerEmail,r.domain,'distributor'].join(' '),org:r.name,initials:r.name}));
    // people
    const ppl=[]; (D.mojoTeams||[]).forEach(t=>(t.users||[]).forEach(u=>ppl.push([u,'Mojo Promotions','mojo'])));
    (D.customers||[]).forEach(c=>(c.teams||[]).forEach(t=>(t.users||[]).forEach(u=>ppl.push([u,c.name,c.id]))));
    (D.suppliers||[]).forEach(s=>(s.contacts||[]).forEach(u=>ppl.push([u,s.name,s.id])));
    const seen=new Set();
    ppl.forEach(([u,org,ok])=>{ if(!u||!u.n||u.status==='deactivated') return; if(isC&&!(ok==='mojo'||ok==='citrix')) return; if(isS&&!(ok==='mojo'||org===W.sup)) return;
      const k=norm(u.email||u.n+org); if(seen.has(k)) return; seen.add(k); let img=''; try{ img=(window.MSPEOPLE&&MSPEOPLE.photo&&MSPEOPLE.photo(u))||''; }catch(e){}
      add({type:'person',id:'pp:'+k,title:u.n,sub:[u.title||u.role,org].filter(Boolean).join(' · '),email:u.email||'',href:'Merchsmith Chats.html',img,n:[u.n,u.pref].join(' '),o:[u.email,u.tel,u.title,u.role,org].join(' '),org,initials:u.n,refs:[u.tel]}); });
    // products + supplier ranges
    if(window.MSCAT){ let P=[]; const inR=id=>{ try{ return MSCAT.distInRange(id); }catch(e){ return true; } };
      try{ P=isC?MSCAT.distRange():isS?MSCAT.all().filter(p=>p.supplier===W.sup):MSCAT.all(); }catch(e){ P=[]; }
      P.forEach(p=>{ const sp=SM.m[p.id]||{}, rng=isD?inR(p.id):true, cb=(p.colours||[]).map(colBase).join(' ');
        add({type:'product',id:'pr:'+p.id,title:p.name,sub:(isC?(p.dept||''):(p.supplier||''))+(p.priceFrom?' · from '+gbp(p.priceFrom):''),href:(rng&&(SM.m[p.id]||isC||isD))?'Merchsmith Store.html#product='+p.id:'Merchsmith Distributor Settings.html#tab=storerange',
          img:sp.imgUrl||p.imgUrl||(p.images&&p.images[0])||(/^(https?:|data:|assets\/)/.test(p.img||'')?p.img:'')||(p.dept?'assets/products/'+String(p.dept).toLowerCase()+'.png':''),refs:[p.id,sp.sku,sp.code,sp.model],n:[p.name,sp.brand||'',sp.model||''].join(' '),o:[isC?'':p.supplier,p.dept,p.cat,(p.colours||[]).join(' '),cb,(p.methods||[]).join(' '),(p.sustainability||0)>=8?'eco sustainable':'',sp.material||'',sp.blurb||''].join(' '),
          tag:isD&&!rng?'Not in your range':'',price:+p.priceFrom||0,colours:p.colours||[],cbase:cb.split(' ').filter(Boolean),methods:p.methods||[],lead:+p.lead||0,eco:(p.sustainability||0)>=8,supplier:p.supplier||'',dept:p.dept||'',breaks:sp.priceBreaks||null,boost:(p.promoted?6:0)+(rng?4:0)}); });
      if(!isC){ let S=[]; try{ S=MSCAT.suppliers(); }catch(e){} if(isS) S=S.filter(s=>s.name===W.sup);
        S.forEach(s=>{ const n=P.filter(p=>p.supplier===s.name), r=isD?n.filter(p=>inR(p.id)).length:null;
          add({type:'supplier',id:'sr:'+s.name,title:s.name,sub:(s.count||n.length).toLocaleString('en-GB')+' products'+(r!=null?' · '+r+' in your range':''),go:()=>openPanel('supplier:"'+s.name+'"','product'),href:'Merchsmith Distributor Settings.html#tab=storerange',n:s.name,o:'supplier range catalogue',initials:s.name,supplier:s.name}); }); } }
    // messages (chats you're in; emails for distributor / admin)
    try{ if(window.MSChat&&MSChat.me){ const C=J('ms-chat-v2',null), me=MSChat.me().id; if(C) Object.values(C.convs||{}).forEach(c=>{ if(!(c.members||[]).includes(me)) return; const t=MSChat.titleOf?MSChat.titleOf(c):c.title||'Conversation';
      (C.msgs[c.id]||[]).slice(-60).forEach(m=>add({type:'msg',id:'ms:'+m.id,title:t,sub:String(m.t||'').slice(0,120),go:()=>MSChat.openConv(c.id),href:'Merchsmith Chats.html',n:t,o:m.t||'',when:m.at})); }); } }catch(e){}
    if(isD||isA){ const E=J('ms-email-v1',{}); ((E.sent||{})[isA?'merchsmith':'mojo']||[]).slice(0,150).forEach(e=>{ const subj=e.subject||(e.thread&&e.thread.label)||e.tpl||'Email', to=(e.to&&e.to.name)||'';
      add({type:'msg',id:'em:'+e.id,title:subj,sub:'Email to '+to+(e.to&&e.to.org?' · '+e.to.org:''),href:'Merchsmith Emails.html',n:subj,o:[to,e.to&&e.to.org,e.tpl,e.body||''].join(' '),when:e.at}); }); }
    const op=(J('ms-search-opened',{})[R]||[]).map(x=>x.id); out.forEach(it=>{ if(op.includes(it.id)) it.recent=1; });
    IDX={at:Date.now(),items:out}; IDXk=key; return out; }

  /* ---------- scoring + search ---------- */
  function score(it,Q){ let sc=0;
    if(Q.rk.length>=3&&it.refs){ for(const r of it.refs){ const k=refk(r); if(!k) continue; if(k===Q.rk) return {s:1000,exact:1}; if(it.type==='order'&&/\d{3}/.test(Q.rk)&&k.includes(Q.rk)) sc=Math.max(sc,300); } }
    if(!Q.words.length) return sc?{s:sc}:(Q.hasF?{s:5}:null);
    let tot=0; const fx=[];
    for(const w of Q.words){ const a=wmatch(w,it._n), b=wmatch(w,it._o), v=Math.max(a.s*3,b.s); if(!v) return sc?{s:sc}:null; tot+=v; const m=a.s*3>=b.s?a:b; fx.push(m.fix?[w,m.fix]:[w,null]); }
    return {s:sc+tot*10+(it.mine?25:0)+(it.recent?15:0)+(it.boost||0),fx}; }
  function filt(it,Q){ const f=Q.f;
    if(f.status&&!norm(it.status||'').includes(norm(f.status))) return false;
    if(f.customer&&!norm(it.org||'').includes(norm(f.customer))) return false;
    if(f.supplier&&!norm(it.supplier||'').includes(norm(f.supplier))) return false;
    if(f.project&&!norm(it.project||it.title||'').includes(norm(f.project))) return false;
    if(f.maxPrice!=null&&it.type==='product'&&!(it.price&&it.price<=f.maxPrice)) return false;
    if((f.maxPrice!=null)&&it.type!=='product') return false;
    return true; }
  const ORD={customer:['product','project','item','order','person','msg','page','action'],distributor:['order','project','item','org','person','product','supplier','msg','page','action'],supplier:['order','product','supplier','person','msg','page','action'],admin:['org','person','product','supplier','project','order','msg','page','action']};
  const LBL={product:'Store products',supplier:'Supplier ranges',project:'Projects',item:'Project items',order:'Orders & documents',org:'Organisations',person:'People',msg:'Messages',page:'Pages & settings',action:'Actions'};
  const CHL={product:'Products',supplier:'Supplier ranges',project:'Projects',item:'Items',order:'Orders',org:'Organisations',person:'People',msg:'Messages',page:'Pages',action:'Actions'};
  function order(){ const W=who(); let o=(ORD[W.role]||ORD.distributor).slice(); if(W.role==='distributor'&&/studio/i.test(W.sub)) o=['item','project'].concat(o.filter(x=>x!=='item'&&x!=='project')); return o; }
  function run(raw){ const Q=parse(raw); Q.hasF=Object.keys(Q.f).some(k=>k!=='in'&&k!=='type'&&k!=='qty');
    const res=[], ok={}; Q.words.forEach(w=>ok[w]=false);
    if(Q.words.length||Q.rk.length>=3||Q.hasF){ index().forEach(it=>{ if(Q.words.length===0&&!Q.hasF&&!/\d/.test(Q.rk)) return; if(Q.raw.trim().length<2&&!/\d/.test(Q.rk)&&it.type!=='page'&&it.type!=='action') return;
      if(!filt(it,Q)) return; const s=score(it,Q); if(!s) return; (s.fx||[]).forEach(([w,f])=>{ if(!f) ok[w]=true; }); res.push(Object.assign({},it,{_s:s.s,_x:s.exact,_fx:s.fx})); }); }
    res.sort((a,b)=>b._s-a._s);
    const fixes=[]; Q.words.forEach(w=>{ if(ok[w]) return; const r=res.find(x=>(x._fx||[]).some(p=>p[0]===w&&p[1])); if(r) fixes.push(r._fx.find(p=>p[0]===w)[1]); });
    const groups={}; res.forEach(r=>(groups[r.type]=groups[r.type]||[]).push(r));
    let top=null; const cand=res.filter(r=>r.type!=='page'&&r.type!=='action'); if(cand[0]&&(cand[0]._x||(cand[0]._s>=40&&(!cand[1]||cand[1]._s<cand[0]._s*0.85||cand[0].mine)))) top=cand[0];
    if(!top&&res[0]&&res[0].type==='action'&&Q.words.length&&/^(new|create|add|invite|pay|approve|upload|change|set|connect|write|update|track)/.test(Q.words[0])) top=res[0];
    return {Q,res,groups,top,fixes}; }

  /* ---------- recents + insights log ---------- */
  const W0=()=>who().role;
  function remember(q){ q=String(q||'').trim(); if(q.length<2) return; const o=J('ms-search-recent',{}), L=(o[W0()]||[]).filter(x=>norm(x)!==norm(q)); L.unshift(q); o[W0()]=L.slice(0,6); PUT('ms-search-recent',o); }
  function opened(it){ const o=J('ms-search-opened',{}), L=(o[W0()]||[]).filter(x=>x.id!==it.id); L.unshift({id:it.id,type:it.type,title:it.title,sub:it.sub,href:it.href,img:it.img||'',initials:it.initials||''}); o[W0()]=L.slice(0,5); PUT('ms-search-opened',o); IDX=null; }
  let logT=null, lastLog=null;
  function logLater(q,n){ clearTimeout(logT); q=String(q||'').trim(); if(q.length<2) return; logT=setTimeout(()=>logNow(q,n),1500); }
  function logNow(q,n){ clearTimeout(logT); const L=J('ms-search-log',[]); const e={q:norm(q).replace(/\s+/g,' ').trim(),at:new Date().toISOString(),role:W0(),n,clicked:false}; if(lastLog&&lastLog.q===e.q&&Date.now()-new Date(lastLog.at)<60000) return; L.unshift(e); PUT('ms-search-log',L.slice(0,400)); lastLog=e; }
  function clicked(q){ const L=J('ms-search-log',[]), k=norm(q).replace(/\s+/g,' ').trim(); const e=L.find(x=>x.q===k); if(e){ e.clicked=true; PUT('ms-search-log',L); } }

  /* ---------- UI ---------- */
  const IC={product:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',project:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',order:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',org:'<path d="M4 21V5l8-3 8 3v16"/><path d="M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/>',person:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',msg:'<path d="M4 5h16v11H8l-4 4z"/>',page:'<path d="M6 3h9l5 5v13H6z"/><path d="M14 3v6h6"/>',action:'<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',supplier:'<path d="M3 7h12v10H3zM15 10h4l2 3v4h-6"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',item:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>'};
  const svg=(k,s)=>'<svg viewBox="0 0 24 24" width="'+(s||16)+'" height="'+(s||16)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(IC[k]||IC.page)+'</svg>';
  const ini=s=>String(s||'?').split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  function hl(text,Q,fixes){ let t=esc(text); const ws=Q.rawWords.concat(fixes||[]).filter(w=>w.length>0).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')); if(!ws.length) return t;
    try{ return t.replace(new RegExp('(^|[^a-z0-9])('+ws.join('|')+')','ig'),'$1<mark>$2</mark>'); }catch(e){ return t; } }
  function priceAt(r,qty){ const B=r.breaks; if(!qty||!Array.isArray(B)||!B.length) return ''; const L=B.map(b=>({q:+(b.qty||b.q||b.min||0),u:+(b.unit||b.price||0)})).filter(b=>b.u).sort((a,b)=>a.q-b.q); let u=null; L.forEach(b=>{ if(qty>=b.q) u=b.u; }); if(u==null&&L[0]) u=L[0].u; return u?gbp(u)+' each at '+qty.toLocaleString('en-GB'):''; }
  function row(r,i,Q,fixes,act){ const th=r.img?'<span class="ss-th"><img src="'+esc(r.img)+'" alt="" loading="lazy" onerror="this.parentNode.textContent=\'\'"></span>':(r.type==='person'||r.type==='org'||r.type==='supplier')&&r.initials?'<span class="ss-th ss-av">'+esc(ini(r.initials))+'</span>':'<span class="ss-th ss-ic">'+svg(r.type)+'</span>';
    const q=Q&&Q.f.qty&&r.type==='product'?priceAt(r,Q.f.qty):'';
    return '<a class="ss-r'+(act?' on':'')+'" data-ssi="'+i+'" href="'+esc(r.href||'#')+'">'+th+'<span class="ss-t"><b>'+(Q?hl(r.title,Q,fixes):esc(r.title))+'</b><i>'+(Q?hl(r.sub||'',Q,fixes):esc(r.sub||''))+(q?' · <em>'+esc(q)+'</em>':'')+'</i></span>'
      +(r.tag?'<span class="ss-tag">'+esc(r.tag)+'</span>':r.status?'<span class="ss-st">'+esc(r.status)+'</span>':'')+(act?'<kbd>Enter</kbd>':'')+'</a>'; }

  let S={q:'',chip:'all',act:0,list:[],open:false,host:null,input:null,dd:null,sheet:false};
  const SUG={customer:[['Track an order','Merchsmith Orders.html'],['Approve proofs','Merchsmith Projects.html'],['Invoices to pay','Merchsmith Customer Finance.html']],distributor:[['Orders needing action','Merchsmith Orders.html'],['Order stats','Merchsmith Orders.html#stats'],['Unpaid customer invoices','Merchsmith Finance.html#sub=cust']],supplier:[['POs to acknowledge','Merchsmith Orders.html'],['Your products','Merchsmith Supplier Portal.html']],admin:[['Distributors','Merchsmith Admin.html#nav=distributors'],['Product database','Merchsmith Admin.html#nav=products']]};

  function css(){ if(d.getElementById('ssCss')) return; const st=d.createElement('style'); st.id='ssCss'; st.textContent=`
  .ss-dd{position:fixed;z-index:1600;background:#fff;border:1px solid var(--line-soft,#e4e7ec);border-radius:16px;box-shadow:0 24px 60px rgba(20,22,45,.28);display:flex;flex-direction:column;max-height:min(72vh,640px);overflow:hidden;font-family:var(--sans,Mulish,sans-serif);color:var(--ink,#23232a);}
  .ss-dd.sheet{inset:0;max-height:none;border-radius:0;border:0;}
  .ss-shead{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line-soft,#e4e7ec);} .ss-shead input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:16px;background:none;color:inherit;}
  .ss-chips{display:flex;gap:6px;padding:10px 12px;flex-wrap:wrap;border-bottom:1px solid #f2f4f7;} .ss-chips button{font:inherit;font-size:12px;font-weight:700;border:1px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer;color:var(--ink-2,#344054);white-space:nowrap;} .ss-chips button.on{background:var(--periwinkle-deep,#5860a6);border-color:var(--periwinkle-deep,#5860a6);color:#fff;} .ss-chips button em{font-style:normal;opacity:.7;margin-left:4px;}
  .ss-body{overflow:auto;padding:6px 8px 8px;flex:1;} .ss-gh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;white-space:nowrap;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#98a2b3;padding:10px 8px 3px;} .ss-gh button{font:inherit;font-size:11.5px;font-weight:700;letter-spacing:0;text-transform:none;border:0;background:none;color:var(--periwinkle-deep,#5860a6);cursor:pointer;}
  .ss-r{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px;text-decoration:none;color:inherit;min-width:0;} .ss-r:hover,.ss-r.on{background:var(--tint-peri,#eef0fa);} .ss-r kbd,.ss-foot kbd{font:inherit;font-size:10.5px;font-weight:800;border:1px solid #d0d5dd;border-bottom-width:2px;border-radius:5px;padding:0 5px;color:#344054;background:#fff;flex:none;}
  .ss-th{width:34px;height:34px;border-radius:9px;background:#f3f2ee;flex:none;display:grid;place-items:center;overflow:hidden;color:var(--periwinkle-deep,#5860a6);} .ss-th img{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;} .ss-av{background:var(--periwinkle,#7b85c5);color:#fff;font-size:11.5px;font-weight:800;border-radius:50%;} .ss-ic{background:#f2f4f7;}
  .ss-t{flex:1;min-width:0;display:flex;flex-direction:column;} .ss-t b{font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .ss-t i{font-style:normal;font-size:12px;color:var(--muted,#667085);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .ss-t em{font-style:normal;color:var(--periwinkle-deep,#5860a6);font-weight:700;}
  .ss-dd mark,.ss-page mark{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px;}
  .ss-st{font-size:11.5px;font-weight:700;color:var(--ink-2,#475467);white-space:nowrap;flex:none;} .ss-tag{font-size:10.5px;font-weight:800;background:#fffaeb;color:#b54708;border-radius:999px;padding:2px 8px;white-space:nowrap;flex:none;}
  .ss-note{font-size:12.5px;color:var(--ink-2,#475467);padding:8px 10px 2px;} .ss-note b{color:var(--ink,#23232a);}
  .ss-empty{padding:22px 14px;text-align:center;font-size:13.5px;color:var(--ink-2,#475467);line-height:1.6;} .ss-empty b{color:var(--ink,#23232a);} .ss-empty div{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px;}
  .ss-btn{font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:9px;padding:7px 12px;cursor:pointer;color:var(--ink,#23232a);text-decoration:none;} .ss-btn.pri{background:var(--periwinkle-deep,#5860a6);border-color:var(--periwinkle-deep,#5860a6);color:#fff;}
  .ss-rec{display:flex;flex-wrap:wrap;gap:6px;padding:4px 8px 6px;} .ss-rec button{font:inherit;font-size:12.5px;border:1px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:999px;padding:4px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;color:var(--ink-2,#344054);}
  .ss-foot{display:flex;justify-content:space-between;gap:10px;padding:9px 14px;border-top:1px solid #f2f4f7;font-size:11.5px;color:var(--muted,#667085);flex-wrap:wrap;} .ss-foot button{white-space:nowrap;font:inherit;font-size:12px;font-weight:700;border:0;background:none;color:var(--periwinkle-deep,#5860a6);cursor:pointer;padding:0;}
  .ss-mbtn{display:none;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;cursor:pointer;place-items:center;} @media(max-width:880px){.ss-mbtn{display:grid;}}
  .ss-page{position:fixed;inset:0;z-index:1500;background:var(--paper,#f6f5f2);overflow:auto;font-family:var(--sans,Mulish,sans-serif);color:var(--ink,#23232a);}
  .ss-ph{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid var(--line-soft,#e4e7ec);padding:14px clamp(16px,3vw,32px);display:flex;align-items:center;gap:12px;} .ss-ph .ss-pin{flex:1;max-width:720px;display:flex;align-items:center;gap:10px;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:999px;padding:9px 16px;color:var(--periwinkle-deep,#5860a6);} html.ui-polish .ss-page .ss-ph .ss-pin input[data-pq],html.ui-polish .ss-dd .ss-shead input[data-ssq],.ss-ph input,.ss-dd .ss-shead input{border:0!important;box-shadow:none!important;padding:0!important;border-radius:0!important;background:none!important;outline:0!important;} .ss-ph input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:15px;color:var(--ink,#23232a);background:none;}
  .ss-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--line-soft,#e4e7ec);background:#fff;cursor:pointer;display:grid;place-items:center;color:var(--ink-2,#344054);margin-left:auto;}
  .ss-pg{display:grid;grid-template-columns:250px minmax(0,1fr);gap:24px;padding:22px clamp(16px,3vw,32px) 60px;max-width:1300px;} @media(max-width:820px){.ss-pg{grid-template-columns:1fr;}}
  .ss-side{display:flex;flex-direction:column;gap:18px;} .ss-side h4{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted,#667085);margin:0 0 8px;} .ss-tl{display:flex;flex-direction:column;gap:2px;} .ss-tl button{font:inherit;font-size:13.5px;text-align:left;border:0;background:none;padding:7px 10px;border-radius:9px;cursor:pointer;display:flex;justify-content:space-between;color:var(--ink,#23232a);} .ss-tl button.on{background:var(--tint-peri,#eef0fa);font-weight:700;color:var(--periwinkle-deep,#5860a6);} .ss-tl button span{white-space:nowrap;} .ss-tl button em{font-style:normal;color:var(--muted,#667085);}
  .ss-side select,.ss-side input[type=number]{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:9px;padding:7px 9px;background:#fff;width:100%;} .ss-cols{display:flex;flex-wrap:wrap;gap:6px;} .ss-cols button{width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line-soft,#d0d5dd);cursor:pointer;} .ss-cols button.on{box-shadow:0 0 0 2px var(--periwinkle-deep,#5860a6);} .ss-chk{display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer;}
  .ss-main{background:#fff;border:1px solid var(--line-soft,#e4e7ec);border-radius:16px;padding:10px;min-width:0;} .ss-mh{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 8px 10px;flex-wrap:wrap;} .ss-mh b{font-size:15px;} .ss-mh select{font:inherit;font-size:13px;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:9px;padding:6px 8px;}
  .ss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;padding:4px;} .ss-card{display:flex;flex-direction:column;gap:6px;text-decoration:none;color:inherit;border:1px solid var(--line-soft,#eef0f3);border-radius:14px;padding:10px;} .ss-card:hover{border-color:var(--periwinkle,#7b85c5);} .ss-card .ss-ci{aspect-ratio:1;border-radius:10px;background:#f3f2ee;display:grid;place-items:center;overflow:hidden;} .ss-card .ss-ci img{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;} .ss-card b{font-size:13.5px;line-height:1.3;} .ss-card i{font-style:normal;font-size:12px;color:var(--muted,#667085);} .ss-dots{display:flex;gap:3px;} .ss-dots span{width:10px;height:10px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15);}
  .ss-more{display:block;margin:12px auto 4px;}
  .ss-ins .card{margin-top:22px;} .ss-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:14px 0 4px;} .ss-kp div{border:1px solid var(--line-soft,#e4e7ec);border-radius:12px;padding:12px 14px;} .ss-kp b{display:block;font-family:var(--serif);font-weight:500;font-size:28px;} .ss-kp span{font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667085);}
  .ss-tb{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:8px;} .ss-tb th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#667085);padding:8px 10px;border-bottom:1.5px solid var(--ink,#23232a);} .ss-tb td{padding:9px 10px;border-bottom:1px solid #f2f4f7;} .ss-tb td.n{text-align:right;font-variant-numeric:tabular-nums;} .ss-seg{display:inline-flex;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:10px;overflow:hidden;} .ss-seg button{font:inherit;font-size:13px;font-weight:700;border:0;background:#fff;padding:7px 14px;cursor:pointer;color:var(--ink-2,#475467);} .ss-seg button.on{background:var(--periwinkle-deep,#5860a6);color:#fff;}
  /* pop-out: more air, clearer hierarchy */
  .ss-dd{border-radius:18px;border-color:#e7e8ee;box-shadow:0 2px 6px rgba(20,22,45,.06),0 28px 70px rgba(20,22,45,.22);max-height:min(76vh,700px);}
  .ss-dd .ss-chips{gap:8px;padding:14px 18px 13px;border-bottom:1px solid #eef0f3;}
  .ss-dd .ss-chips button{font-size:12.5px;padding:6px 13px;display:inline-flex;align-items:center;gap:6px;} .ss-dd .ss-chips button em{margin:0;font-size:11px;font-weight:800;opacity:1;background:#f2f4f7;color:#667085;border-radius:999px;padding:1px 7px;} .ss-dd .ss-chips button.on em{background:rgba(255,255,255,.22);color:#fff;}
  .ss-dd .ss-body{padding:6px 12px 14px;}
  .ss-dd .ss-gh{padding:18px 12px 8px;font-size:11px;letter-spacing:.09em;color:#8a8f9c;} .ss-dd .ss-gh:first-child{padding-top:12px;}
  .ss-dd .ss-gh + .ss-r,.ss-dd .ss-gh + .ss-topw{margin-top:2px;}
  .ss-dd .ss-r + .ss-gh{margin-top:8px;border-top:1px solid #f2f4f7;}
  .ss-dd .ss-r{gap:16px;padding:10px 12px;border-radius:14px;min-height:104px;}
  .ss-dd .ss-r + .ss-r{margin-top:2px;}
  .ss-dd .ss-th{width:84px;height:84px;border-radius:14px;background:#f6f5f2;} .ss-dd .ss-th img{padding:3px;} .ss-dd .ss-av{border-radius:50%;font-size:22px;background:var(--periwinkle,#7b85c5);} .ss-dd .ss-ic{background:#f2f4f7;color:#5860a6;} .ss-dd .ss-ic svg{width:28px;height:28px;} .ss-dd .ss-th img{padding:6px;}
  .ss-dd .ss-t{gap:3px;} .ss-dd .ss-t b{font-size:14px;font-weight:700;letter-spacing:-.005em;} .ss-dd .ss-t i{font-size:12.5px;line-height:1.4;color:#6b7180;}
  .ss-dd .ss-st{font-size:11.5px;background:#f2f4f7;color:#475467;border-radius:999px;padding:3px 10px;}
  .ss-dd .ss-tag{padding:3px 10px;}
  .ss-dd .ss-r kbd{margin-left:2px;}
  .ss-topw{margin:2px 0 4px;} .ss-dd .ss-topw .ss-r{background:#f7f7fc;border:1px solid #e4e6f6;padding:12px 14px;min-height:124px;} .ss-dd .ss-topw .ss-r.on,.ss-dd .ss-topw .ss-r:hover{background:var(--tint-peri,#eef0fa);border-color:#cfd3f0;} .ss-dd .ss-topw .ss-th{width:100px;height:100px;border-radius:16px;} .ss-dd .ss-topw .ss-t b{font-size:15px;}
  .ss-dd .ss-note{padding:12px 12px 2px;font-size:13px;}
  .ss-dd .ss-rec{gap:8px;padding:2px 12px 8px;} .ss-dd .ss-rec button{padding:6px 12px;font-size:13px;}
  .ss-dd .ss-empty{padding:40px 24px 36px;font-size:14px;} .ss-dd .ss-empty div{margin-top:16px;}
  .ss-dd .ss-foot{padding:12px 18px;background:#fafafb;border-top:1px solid #eef0f3;font-size:12px;}
  .ss-exn{font-size:12.5px;background:#fffaeb;color:#93370d;border-radius:10px;padding:9px 12px;margin-top:12px;}`; d.head.appendChild(st); }

  function place(){ if(!S.dd||S.sheet) return; const el=S.host||S.input, r=el.getBoundingClientRect(), w=Math.min(innerWidth-20,Math.max(r.width,620)*1.25);
    S.dd.style.top=(r.bottom+8)+'px'; S.dd.style.left=Math.max(10,Math.min(r.left+(r.width-w)/2,innerWidth-w-10))+'px'; S.dd.style.width=w+'px'; }
  function close(){ if(S.dd){ S.dd.remove(); S.dd=null; } S.open=false; S.sheet=false; }
  function openDD(input,sheet){ css(); S.input=input; S.host=input.closest('.ms-hsearch,.hsearch')||input; S.sheet=!!sheet; if(!S.dd){ S.dd=d.createElement('div'); S.dd.className='ss-dd'+(sheet?' sheet':''); d.body.appendChild(S.dd);
      S.dd.addEventListener('mousedown',e=>{ if(!e.target.closest('input')) e.preventDefault(); }); }
    S.open=true; place(); S.q=input.value; ensure().then(()=>{ if(S.open) draw(); }); draw(); }
  function activate(r,newTab){ if(!r) return; remember(S.q); clicked(S.q); opened(r); const go=r.go; close(); if(S.input&&!S.sheet) S.input.blur();
    if(go&&!newTab) return go(); if(newTab) return window.open(r.href,'_blank'); if(r.href) location.href=r.href; }
  function draw(){ if(!S.dd) return; const W=who(), sheetHead=S.sheet?'<div class="ss-shead">'+svg('search',18)+'<input data-ssq value="'+esc(S.q)+'" placeholder="Search…" autocomplete="off"><button class="ss-btn" data-ssclose>Cancel</button></div>':'';
    const loading=!window.MSCAT||!window.ORG_DATA;
    const q=S.q.trim(); let body='', chips='', list=[];
    if(!q){ const rec=(J('ms-search-recent',{})[W.role]||[]), op=(J('ms-search-opened',{})[W.role]||[]);
      body=(rec.length?'<div class="ss-gh"><span>Recent searches</span><button data-ssclr>Clear</button></div><div class="ss-rec">'+rec.map(x=>'<button data-ssrec="'+esc(x)+'">'+svg('clock',13)+esc(x)+'</button>').join('')+'</div>':'')
        +(op.length?'<div class="ss-gh"><span>Recently opened</span></div>'+op.map(r=>{ list.push(r); return row(r,list.length-1,null,null,false); }).join(''):'')
        +'<div class="ss-gh"><span>Suggestions</span></div>'+(SUG[W.role]||[]).map(([t,h])=>{ const r={type:'page',title:t,sub:'',href:h,id:'sg:'+h}; list.push(r); return row(r,list.length-1,null,null,false); }).join('')
        +'<p class="ss-note">Tip: type an order, PO or SKU number to jump straight to it.</p>';
    } else {
      const R=run(q); if(R.Q.chip&&S.chip!==R.Q.chip) S.chip=R.Q.chip;
      const ord=order(), present=ord.filter(t=>R.groups[t]&&R.groups[t].length);
      chips='<div class="ss-chips"><button class="'+(S.chip==='all'?'on':'')+'" data-sschip="all">All</button>'+present.map(t=>'<button class="'+(S.chip===t?'on':'')+'" data-sschip="'+t+'">'+CHL[t]+'<em>'+R.groups[t].length+'</em></button>').join('')+'</div>';
      const fx=R.fixes.length?'<p class="ss-note">Showing results for <b>'+esc(R.fixes.join(' '))+'</b></p>':'';
      if(!R.res.length){ body='<div class="ss-empty">'+(loading?'Loading…':'No results for <b>“'+esc(q)+'”</b>'+(S.chip!=='all'?' in '+esc(CHL[S.chip]||''):'')+'.<div>'+(S.chip!=='all'?'<button class="ss-btn" data-sschip="all">Search everywhere</button>':'')+(W.role==='customer'?'<a class="ss-btn pri" href="Merchsmith Chats.html">Ask your account manager to find it</a>':'')+'</div>')+'</div>'; }
      else if(S.chip!=='all'){ const L=(R.groups[S.chip]||[]); body=fx+L.slice(0,12).map(r=>{ list.push(r); return row(r,list.length-1,R.Q,R.fixes,list.length-1===S.act); }).join('')+(L.length>12?'<div class="ss-gh"><span></span><button data-ssall="'+S.chip+'">See all '+L.length+' '+esc((CHL[S.chip]||'').toLowerCase())+' →</button></div>':''); }
      else { let g=ord.slice(); const st=onStore()&&W.role==='customer';
        if(R.res[0]&&R.res[0].type==='action'&&R.top&&R.top.type==='action') g=['action'].concat(g.filter(x=>x!=='action'));
        body=fx+(R.top?'<div class="ss-gh"><span>Top result</span></div>'+'<div class="ss-topw">'+(()=>{ list.push(R.top); return row(R.top,0,R.Q,R.fixes,S.act===0); })()+'</div>':'');
        const seen=new Set(R.top?[R.top.id]:[]);
        if(st){ const P=(R.groups.product||[]).filter(r=>!seen.has(r.id)), Y=[].concat(R.groups.project||[],R.groups.order||[]).sort((a,b)=>b._s-a._s).filter(r=>!seen.has(r.id));
          if(P.length) body+='<div class="ss-gh"><span>Store products</span>'+(P.length>5?'<button data-ssall="product">See all '+P.length+' →</button>':'')+'</div>'+P.slice(0,5).map(r=>{ list.push(r); return row(r,list.length-1,R.Q,R.fixes,list.length-1===S.act); }).join('');
          if(Y.length) body+='<div class="ss-gh"><span>Your projects and orders</span></div>'+Y.slice(0,3).map(r=>{ list.push(r); return row(r,list.length-1,R.Q,R.fixes,list.length-1===S.act); }).join('');
          g=g.filter(x=>!['product','project','order'].includes(x)); }
        g.forEach(t=>{ const L=(R.groups[t]||[]).filter(r=>!seen.has(r.id)); if(!L.length) return; const n=t==='page'||t==='action'?2:3;
          body+='<div class="ss-gh"><span>'+LBL[t]+'</span>'+(L.length>n?'<button data-ssall="'+t+'">See all '+(R.groups[t].length)+' →</button>':'')+'</div>'+L.slice(0,n).map(r=>{ list.push(r); return row(r,list.length-1,R.Q,R.fixes,list.length-1===S.act); }).join(''); }); }
      logLater(q,R.res.length);
    }
    S.list=list; if(S.act>=list.length) S.act=Math.max(0,list.length-1);
    S.dd.innerHTML=sheetHead+chips+'<div class="ss-body">'+body+'</div><div class="ss-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</span>'+(q?'<button data-ssall="'+(S.chip)+'">See all results →</button>':'<span>'+esc(({customer:'Customer',distributor:'Distributor',supplier:'Supplier',admin:'Platform admin'})[W.role]||'')+' view</span>')+'</div>';
    wireDD(); }
  function wireDD(){ const D=S.dd; if(!D) return;
    D.querySelectorAll('[data-ssi]').forEach(a=>{ a.onclick=e=>{ e.preventDefault(); activate(S.list[+a.dataset.ssi],e.ctrlKey||e.metaKey); }; a.onmousemove=()=>{ const i=+a.dataset.ssi; if(S.act!==i){ S.act=i; D.querySelectorAll('.ss-r').forEach(x=>x.classList.toggle('on',x===a)); } }; });
    D.querySelectorAll('[data-sschip]').forEach(b=>b.onclick=()=>{ S.chip=b.dataset.sschip; S.act=0; if(S.chip==='all') stripIn(); draw(); refocus(); });
    D.querySelectorAll('[data-ssall]').forEach(b=>b.onclick=()=>{ const q=S.q; remember(q); close(); openPanel(q,b.dataset.ssall||'all'); });
    D.querySelectorAll('[data-ssrec]').forEach(b=>b.onclick=()=>{ setQ(b.dataset.ssrec); });
    const clr=D.querySelector('[data-ssclr]'); if(clr) clr.onclick=()=>{ const o=J('ms-search-recent',{}); o[who().role]=[]; PUT('ms-search-recent',o); draw(); refocus(); };
    const sq=D.querySelector('[data-ssq]'); if(sq){ sq.oninput=()=>{ S.q=sq.value; S.act=0; draw(); const n=S.dd.querySelector('[data-ssq]'); n.focus(); n.setSelectionRange(n.value.length,n.value.length); }; sq.onkeydown=keys; setTimeout(()=>sq.focus(),20); }
    const cx=D.querySelector('[data-ssclose]'); if(cx) cx.onclick=close; }
  function stripIn(){ const v=S.q.replace(/\s*\b(in|type):\S+/gi,'').trim(); if(v!==S.q){ S.q=v; if(S.input) S.input.value=v; } }
  function refocus(){ const i=S.sheet?S.dd&&S.dd.querySelector('[data-ssq]'):S.input; if(i) i.focus(); }
  function setQ(v){ S.q=v; S.act=0; if(S.input) S.input.value=v; const sq=S.dd&&S.dd.querySelector('[data-ssq]'); if(sq) sq.value=v; draw(); refocus(); }
  function keys(e){ if(!S.open) return; const n=S.list.length;
    if(e.key==='ArrowDown'){ e.preventDefault(); S.act=Math.min(n-1,S.act+1); hiAct(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); S.act=Math.max(0,S.act-1); hiAct(); }
    else if(e.key==='Enter'){ e.preventDefault(); e.stopImmediatePropagation(); const q=S.q.trim(); if(!q){ if(S.list[S.act]) activate(S.list[S.act]); return; }
      const R=run(q); if(R.top&&S.act===0&&S.chip==='all') return activate(R.top,e.ctrlKey||e.metaKey); if(S.list[S.act]&&(S.act>0||S.chip!=='all')) return activate(S.list[S.act],e.ctrlKey||e.metaKey);
      remember(q); logNow(q,R.res.length); const c=S.chip; close(); openPanel(q,onStore()&&who().role==='customer'?'product':c); }
    else if(e.key==='Escape'){ e.preventDefault(); close(); if(S.input) S.input.blur(); }
    else if(e.key==='Tab'&&S.dd){ const cs=[...S.dd.querySelectorAll('[data-sschip]')]; if(cs.length){ e.preventDefault(); const i=cs.findIndex(b=>b.classList.contains('on')); const nx=cs[(i+(e.shiftKey?-1:1)+cs.length)%cs.length]; S.chip=nx.dataset.sschip; S.act=0; draw(); refocus(); } } }
  function hiAct(){ if(!S.dd) return; S.dd.querySelectorAll('.ss-r').forEach(x=>{ const on=+x.dataset.ssi===S.act; x.classList.toggle('on',on); const k=x.querySelector('kbd'); if(on&&!k) x.insertAdjacentHTML('beforeend','<kbd>Enter</kbd>'); if(!on&&k) k.remove(); if(on){ const b=S.dd.querySelector('.ss-body'), r=x.getBoundingClientRect(), br=b.getBoundingClientRect(); if(r.bottom>br.bottom) b.scrollTop+=r.bottom-br.bottom+6; if(r.top<br.top) b.scrollTop-=br.top-r.top+6; } }); }

  function attach(input){ if(!input||input._ss) return; input._ss=1; const W=who();
    input.placeholder=W.role==='customer'?(onStore()?'Search products, or your projects and orders…':'Search products, projects, orders…'):W.role==='supplier'?'Search POs, products, people…':W.role==='admin'?'Search distributors, suppliers, products, people…':'Search orders, customers, products, people…';
    input.setAttribute('autocomplete','off'); input.title='Search (/ or Ctrl K)';
    input.addEventListener('focus',()=>openDD(input,false));
    input.addEventListener('input',()=>{ S.q=input.value; S.act=0; if(!S.open) openDD(input,false); else draw(); });
    input.addEventListener('keydown',keys,true);
    input.addEventListener('blur',()=>setTimeout(()=>{ if(S.open&&!S.sheet&&d.activeElement!==input) close(); },120));
    const tools=d.querySelector('.ms-htools'); if(tools&&!tools.querySelector('.ss-mbtn')){ const b=d.createElement('button'); b.className='ss-mbtn'; b.type='button'; b.setAttribute('aria-label','Search'); b.innerHTML=svg('search',18); b.onclick=()=>{ close(); openDD(input,true); }; tools.insertBefore(b,tools.firstChild); } }
  function scan(){ d.querySelectorAll('.ms-hsearch input,.headtools .hsearch input').forEach(attach); }
  window.addEventListener('resize',()=>{ if(S.open) place(); }); window.addEventListener('scroll',()=>{ if(S.open) place(); },true);
  d.addEventListener('keydown',e=>{ const t=e.target, typing=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if((e.key==='k'||e.key==='K')&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); focusSearch(); }
    else if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey){ e.preventDefault(); focusSearch(); } });
  function focusSearch(v){ const i=d.querySelector('.ms-hsearch input,.headtools .hsearch input'); const vis=i&&i.offsetParent!==null;
    if(vis){ if(v!=null) i.value=v; i.focus(); if(v!=null){ S.q=v; draw(); } } else if(i){ if(v!=null) i.value=v; openDD(i,true); } else openPanel(v||'','all'); }

  /* ---------- full results panel ---------- */
  let PS=null;
  function openPanel(q,chip){ css(); close(); if(d.activeElement&&d.activeElement.blur) d.activeElement.blur(); ensure().then(()=>{ PS={q:q||'',chip:chip||'all',pf:{max:'',cols:[],sup:'',meth:'',lead:'',eco:false,sort:'rel'},n:48}; drawPanel(); }); }
  function setHash(){ const h='search='+encodeURIComponent(PS.q)+(PS.chip&&PS.chip!=='all'?'&in='+PS.chip:''); try{ history.replaceState(null,'',location.pathname+location.search+'#'+h); }catch(e){} }
  function closePanel(){ const el=d.getElementById('ssPage'); if(el) el.remove(); d.body.style.overflow=''; PS=null; if(/search=/.test(location.hash)) try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
  function drawPanel(){ if(!PS) return; let el=d.getElementById('ssPage'); if(!el){ el=d.createElement('div'); el.id='ssPage'; el.className='ss-page'; d.body.appendChild(el); d.body.style.overflow='hidden'; }
    setHash(); const W=who(), R=run(PS.q), ord=order(), present=ord.filter(t=>R.groups[t]&&R.groups[t].length);
    const isP=PS.chip==='product'; let L=PS.chip==='all'?R.res:(R.groups[PS.chip]||[]);
    if(isP){ const f=PS.pf; L=L.filter(r=>(!f.max||r.price<=+f.max)&&(!f.cols.length||f.cols.some(c=>(r.cbase||[]).includes(c)))&&(!f.sup||r.supplier===f.sup)&&(!f.meth||(r.methods||[]).includes(f.meth))&&(!f.lead||(r.lead&&r.lead<=+f.lead))&&(!f.eco||r.eco));
      if(f.sort==='plo') L=L.slice().sort((a,b)=>(a.price||9e9)-(b.price||9e9)); else if(f.sort==='phi') L=L.slice().sort((a,b)=>(b.price||0)-(a.price||0)); else if(f.sort==='lead') L=L.slice().sort((a,b)=>(a.lead||99)-(b.lead||99)); }
    const allP=R.groups.product||[], sups=[...new Set(allP.map(r=>r.supplier).filter(Boolean))].sort(), meths=[...new Set(allP.flatMap(r=>r.methods||[]))].sort(), cols=Object.keys(COLG);
    const CHX={navy:'#1f2a4d',black:'#1b1b1f',grey:'#9a9aa3',white:'#ffffff',red:'#c0392b',blue:'#2f5fb3',green:'#3a9d6b',yellow:'#e8c33a',orange:'#e8833a',pink:'#e86aa6',purple:'#7b4fb3',brown:'#9b6b43'};
    const side='<div class="ss-side"><div><h4>Show</h4><div class="ss-tl"><button class="'+(PS.chip==='all'?'on':'')+'" data-pc="all"><span>Everything</span><em>'+R.res.length+'</em></button>'+present.map(t=>'<button class="'+(PS.chip===t?'on':'')+'" data-pc="'+t+'"><span>'+CHL[t]+'</span><em>'+R.groups[t].length+'</em></button>').join('')+'</div></div>'
      +'</div>';
    const fx=R.fixes.length?'<p class="ss-note">Showing results for <b>'+esc(R.fixes.join(' '))+'</b></p>':'';
    const shown=L.slice(0,PS.n);
    const main='<div class="ss-main"><div class="ss-mh"><b>'+L.length.toLocaleString('en-GB')+' result'+(L.length===1?'':'s')+(PS.q?' for “'+esc(PS.q)+'”':'')+'</b>'+(isP?'<select data-pf="sort"><option value="rel">Most relevant</option><option value="plo"'+(PS.pf.sort==='plo'?' selected':'')+'>Price: low to high</option><option value="phi"'+(PS.pf.sort==='phi'?' selected':'')+'>Price: high to low</option><option value="lead"'+(PS.pf.sort==='lead'?' selected':'')+'>Fastest lead time</option></select>':'')+'</div>'+fx
      +(!L.length?'<div class="ss-empty">No results'+(PS.q?' for <b>“'+esc(PS.q)+'”</b>':'')+'.<div>'+(PS.chip!=='all'?'<button class="ss-btn" data-pc="all">Search everywhere</button>':'')+(W.role==='customer'?'<a class="ss-btn pri" href="Merchsmith Chats.html">Ask your account manager to find it</a>':'')+'</div></div>'
        :isP?'<div class="ss-grid">'+shown.map((r,i)=>'<a class="ss-card" data-pi="'+i+'" href="'+esc(r.href)+'"><span class="ss-ci">'+(r.img?'<img src="'+esc(r.img)+'" alt="" loading="lazy">':svg('product',28))+'</span><b>'+hl(r.title,R.Q,R.fixes)+'</b><i>'+esc(r.sub)+'</i>'+(R.Q.f.qty?'<i><em style="font-style:normal;color:var(--periwinkle-deep,#5860a6);font-weight:700">'+esc(priceAt(r,R.Q.f.qty))+'</em></i>':'')+'<span class="ss-dots">'+(r.colours||[]).slice(0,6).map(c=>'<span style="background:'+(CHX[colBase(c)]||'#ddd')+'" title="'+esc(c)+'"></span>').join('')+'</span>'+(r.tag?'<span class="ss-tag" style="align-self:flex-start">'+esc(r.tag)+'</span>':'')+'</a>').join('')+'</div>'
        :shown.map((r,i)=>row(r,i,R.Q,R.fixes,false).replace('data-ssi','data-pi')).join(''))
      +(L.length>PS.n?'<button class="ss-btn ss-more" data-pmore>Show more ('+(L.length-PS.n)+')</button>':'')+'</div>';
    el.innerHTML='<div class="ss-ph"><div class="ss-pin">'+svg('search',18)+'<input data-pq value="'+esc(PS.q)+'" placeholder="Search…" autocomplete="off"></div><button class="ss-x" data-px aria-label="Close search">'+svg('x',18)+'</button></div><div class="ss-pg">'+side+main+'</div>';
    el.querySelector('[data-px]').onclick=closePanel;
    const pq=el.querySelector('[data-pq]'); pq.oninput=()=>{ clearTimeout(pq._t); pq._t=setTimeout(()=>{ PS.q=pq.value; PS.n=48; drawPanel(); const n=d.querySelector('#ssPage [data-pq]'); n.focus(); n.setSelectionRange(n.value.length,n.value.length); },180); };
    pq.onkeydown=e=>{ if(e.key==='Escape') closePanel(); if(e.key==='Enter'){ remember(pq.value); logNow(pq.value,L.length); } };
    el.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>{ PS.chip=b.dataset.pc; PS.n=48; drawPanel(); });
    el.querySelectorAll('[data-pcol]').forEach(b=>b.onclick=()=>{ const c=b.dataset.pcol; PS.pf.cols=PS.pf.cols.includes(c)?PS.pf.cols.filter(x=>x!==c):PS.pf.cols.concat(c); drawPanel(); });
    el.querySelectorAll('[data-pf]').forEach(i=>i.onchange=()=>{ const k=i.dataset.pf; PS.pf[k]=i.type==='checkbox'?i.checked:i.value; drawPanel(); });
    const mo=el.querySelector('[data-pmore]'); if(mo) mo.onclick=()=>{ PS.n+=48; drawPanel(); };
    el.querySelectorAll('[data-pi]').forEach(a=>a.onclick=e=>{ e.preventDefault(); const r=shown[+a.dataset.pi]; if(!r) return; S.q=PS.q; remember(PS.q); clicked(PS.q); opened(r); const nt=e.ctrlKey||e.metaKey; if(nt) return window.open(r.href,'_blank'); if(r.go){ closePanel(); return r.go(); } closePanel(); location.href=r.href; });
    if(!PS._f){ PS._f=1; setTimeout(()=>{ const n=d.querySelector('#ssPage [data-pq]'); if(n&&!PS.q) n.focus(); },30); } }
  d.addEventListener('keydown',e=>{ if(e.key==='Escape'&&d.getElementById('ssPage')&&!(e.target&&e.target.matches&&e.target.matches('[data-pq]'))) closePanel(); });
  function fromHash(){ const m=location.hash.match(/[#&]search=([^&]*)/); if(!m) return; const c=(location.hash.match(/[&]in=(\w+)/)||[])[1]||'all'; openPanel(decodeURIComponent(m[1]),c); }

  /* ---------- list search boxes: shared behaviour ---------- */
  const LISTSEL='#prodSearch,#srQ,#supQ,#search,#auQ,#tmSearch,#distSearch,#supSearch,.nt-search,.cll-search,.em-search,[data-dq],#searchInput,.mc-search input,#baSearch,.pj-q,.toolbar .search input,.du-search input';
  function enhanceLists(root){ (root||d).querySelectorAll(LISTSEL).forEach(i=>{ if(i._ssl||i.closest('.ms-hsearch,.hsearch,.ss-dd,.ss-page')) return; i._ssl=1;
      if(!i.title) i.title='Esc clears · Shift+Enter searches everywhere';
      i.addEventListener('keydown',e=>{ if(e.key==='Escape'&&i.value){ e.preventDefault(); e.stopPropagation(); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('keyup',{bubbles:true})); }
        if(e.key==='Enter'&&e.shiftKey&&i.value.trim()){ e.preventDefault(); e.stopPropagation(); remember(i.value); openPanel(i.value,'all'); } }); });
    // Organisations: wire the customer / supplier boxes (filter the cards + table rows on screen)
    ['panel-customers','panel-suppliers'].forEach(pid=>{ const P=d.getElementById(pid); if(!P) return; const i=P.querySelector('.toolbar .search input'); if(!i||i._ssorg) return; i._ssorg=1;
      const ap=()=>{ const q=i.value; P.querySelectorAll('.ocard,tr[data-otopen]').forEach(el=>{ el.style.display=!q||match(el.textContent,q)?'':'none'; }); let em=P.querySelector('.ss-orgempty'); const any=[...P.querySelectorAll('.ocard,tr[data-otopen]')].some(el=>el.style.display!=='none');
        if(q&&!any){ if(em&&em.dataset.q===q) return; if(!em){ em=d.createElement('p'); em.className='ss-orgempty ss-empty'; P.appendChild(em); } em.dataset.q=q; em.innerHTML='No '+(pid==='panel-customers'?'customers':'suppliers')+' match <b>“'+esc(q)+'”</b>. <button class="ss-btn" type="button">Search everywhere →</button>'; em.querySelector('button').onclick=()=>openPanel(q,'all'); } else if(em) em.remove(); };
      i.placeholder=pid==='panel-customers'?'Search customers by name, domain or town…':'Search suppliers by name, region or speciality…';
      i.addEventListener('input',ap); new MutationObserver(ms=>{ if(!i.value) return; if(ms.every(m=>(m.target.closest&&m.target.closest('.ss-orgempty'))||[...m.addedNodes,...m.removedNodes].every(n=>n.classList&&n.classList.contains('ss-orgempty')))) return; ap(); }).observe(P,{childList:true,subtree:true}); }); }

  /* ---------- search insights (Store settings) ---------- */
  const EX=[['tote bag',31,8,.74],['notebook',16,7,.81],['water bottle',22,6,.68],['bamboo pen',18,4,.61],['hoodie',14,5,.5],['lanyard',12,0,0],['power bank',11,2,.18],['usb',9,3,.22],['hi vis vest',7,0,0],['umbrella',6,0,0],['tech pouch',5,1,0],['keyring',4,0,0]];
  function insightsPanel(el){ if(!el) return; css(); let per=30, aud='customer';
    const draw=()=>{ const since=Date.now()-per*864e5; let L=J('ms-search-log',[]).filter(e=>new Date(e.at)>=since&&(aud==='all'||e.role==='customer'));
      const real=L.length; const ex=real<5; const agg={};
      L.forEach(e=>{ const a=agg[e.q]=agg[e.q]||{q:e.q,n:0,res:0,cl:0,last:e.at}; a.n++; a.res+=e.n||0; if(e.clicked) a.cl++; if(e.at>a.last) a.last=e.at; });
      if(ex) EX.forEach(([q,n,r,c])=>{ if(!agg[q]) agg[q]={q,n,res:n*r,cl:Math.round(n*c),last:new Date(Date.now()-((q.length*7)%per)*864e5).toISOString(),ex:1}; });
      const A=Object.values(agg), tot=A.reduce((s,a)=>s+a.n,0), zero=A.filter(a=>a.res===0), zN=zero.reduce((s,a)=>s+a.n,0), clN=A.reduce((s,a)=>s+a.cl,0);
      const top=A.slice().sort((a,b)=>b.n-a.n).slice(0,10), nz=zero.sort((a,b)=>b.n-a.n).slice(0,10), ncl=A.filter(a=>a.res>0&&a.cl===0).sort((a,b)=>b.n-a.n).slice(0,8);
      const fD=s=>new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short'}), pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
      const fic=q=>'<button class="ss-btn" data-sifind="'+esc(q)+'">Find in catalogue</button>';
      el.innerHTML='<div class="ss-ins"><div class="card"><div class="card-h" style="flex-wrap:wrap"><h2>Search insights</h2><span class="tag">Store</span><span style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap"><span class="ss-seg">'+[[30,'30 days'],[90,'90 days']].map(([v,l])=>'<button class="'+(per===v?'on':'')+'" data-siper="'+v+'">'+l+'</button>').join('')+'</span><span class="ss-seg">'+[['customer','Customers'],['all','Everyone']].map(([v,l])=>'<button class="'+(aud===v?'on':'')+'" data-siaud="'+v+'">'+l+'</button>').join('')+'</span></span></div>'
        +'<p style="margin:0;font-size:13.5px;color:var(--ink-2,#55555f);line-height:1.6;max-width:72ch">What people type into search, and what they don’t find. Use it to spot gaps in your store range: searches with no results are products customers wanted but couldn’t see.</p>'
        +(ex?'<div class="ss-exn">Includes example searches until real ones build up ('+real+' recorded in this browser so far). In the live platform these come from every customer.</div>':'')
        +'<div class="ss-kp"><div><b>'+tot.toLocaleString('en-GB')+'</b><span>Searches</span></div><div><b>'+A.length+'</b><span>Different terms</span></div><div><b>'+pct(zN,tot)+'</b><span>Found nothing</span></div><div><b>'+pct(clN,tot)+'</b><span>Led to a click</span></div></div></div>'
        +'<div class="card"><div class="card-h"><h2>Searches with no results</h2></div><p style="margin:0;font-size:13px;color:var(--muted,#667085)">Products people looked for that aren’t in your range.</p>'+(nz.length?'<table class="ss-tb"><thead><tr><th>Search</th><th class="n">Searches</th><th>Last searched</th><th></th></tr></thead><tbody>'+nz.map(a=>'<tr><td><b>'+esc(a.q)+'</b></td><td class="n">'+a.n+'</td><td>'+fD(a.last)+'</td><td style="text-align:right">'+fic(a.q)+'</td></tr>').join('')+'</tbody></table>':'<p class="ss-empty">Every search found something.</p>')+'</div>'
        +'<div class="card"><div class="card-h"><h2>Top searches</h2></div><table class="ss-tb"><thead><tr><th>Search</th><th class="n">Searches</th><th class="n">Avg results</th><th class="n">Clicked</th><th></th></tr></thead><tbody>'+top.map(a=>'<tr><td><b>'+esc(a.q)+'</b></td><td class="n">'+a.n+'</td><td class="n">'+(a.n?Math.round(a.res/a.n):0)+'</td><td class="n">'+pct(a.cl,a.n)+'</td><td style="text-align:right">'+fic(a.q)+'</td></tr>').join('')+'</tbody></table></div>'
        +(ncl.length?'<div class="card"><div class="card-h"><h2>Found results, nothing clicked</h2></div><p style="margin:0;font-size:13px;color:var(--muted,#667085)">The results may not match what people meant, or prices and images didn’t appeal.</p><table class="ss-tb"><thead><tr><th>Search</th><th class="n">Searches</th><th class="n">Avg results</th><th></th></tr></thead><tbody>'+ncl.map(a=>'<tr><td><b>'+esc(a.q)+'</b></td><td class="n">'+a.n+'</td><td class="n">'+Math.round(a.res/a.n)+'</td><td style="text-align:right">'+fic(a.q)+'</td></tr>').join('')+'</tbody></table></div>':'')+'</div>';
      el.querySelectorAll('[data-siper]').forEach(b=>b.onclick=()=>{ per=+b.dataset.siper; draw(); });
      el.querySelectorAll('[data-siaud]').forEach(b=>b.onclick=()=>{ aud=b.dataset.siaud; draw(); });
      el.querySelectorAll('[data-sifind]').forEach(b=>b.onclick=()=>openPanel(b.dataset.sifind,'product')); };
    draw(); }

  /* ---------- boot ---------- */
  function boot(){ css(); scan(); enhanceLists(); fromHash();
    new MutationObserver(ms=>{ let s=false; for(const m of ms) if(m.addedNodes.length&&!(m.target.closest&&m.target.closest('.ss-dd,.ss-page'))){ s=true; break; } if(s){ clearTimeout(boot._t); boot._t=setTimeout(()=>{ scan(); enhanceLists(); },60); } }).observe(d.body,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>{ if(/[#&]search=/.test(location.hash)&&!d.getElementById('ssPage')) fromHash(); });
    window.addEventListener('ms-identity-change',()=>{ IDX=null; close(); d.querySelectorAll('.ms-hsearch input,.headtools .hsearch input').forEach(i=>{ i._ss=0; attach(i); }); });
    window.addEventListener('storage',()=>{ IDX=null; }); }
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',boot):boot();

  return {match,score:(it,q)=>score(Object.assign({_n:toks(it.n||it.title),_o:toks(it.o||'')},it),parse(q)),run,parse,open:focusSearch,openPanel,closePanel,insightsPanel,index,ensure,SYN,remember};
})();
