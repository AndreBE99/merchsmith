/* ============================================================
   org-table.js — Organisations (distributor view): table views for
   Customers and Suppliers at the same depth as Platform Admin → Distributors.

   Per tab: stat bar, Table / Cards toggle, search (reuses the toolbar box),
   filter selects, sortable columns, main contact with avatar, unread-notes
   badge, quick-actions ⋯ menu (open, message, email, call, book a meeting…).
   Rows open the existing org-page.js drawers (by clicking the hidden card).
   Reads ORG_DATA (org-data.js) + MSCAT (store range) + MSNOTES (notes).
   View choice: localStorage 'ms-org-view'.
   ============================================================ */
(function(){
  const D=window.ORG_DATA; if(!D) return;
  const P=window.MSPEOPLE, esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const num=v=>+(String(v||'').replace(/[^\d.]/g,''))||0;
  const gbp=n=>'£'+Math.round(n).toLocaleString('en-GB');
  const users=c=>(c.teams||[]).flatMap(t=>t.users||[]);
  const SEEN='ms-org-notes-seen', seen=()=>{ try{ return JSON.parse(localStorage.getItem(SEEN)||'{}'); }catch(e){ return {}; } };
  const markSeen=id=>{ const m=seen(); m[id]=new Date().toISOString(); try{ localStorage.setItem(SEEN,JSON.stringify(m)); }catch(e){} };
  function unread(id){ if(!window.MSNOTES) return 0; const k='org:'+id, since=seen()[id]||'', me=((window.MSID&&MSID.get&&MSID.get())||{}).who||'';
    try{ return MSNOTES.notes(k).concat(MSNOTES.comments(k)).filter(x=>(!since||x.at>since)&&x.who!==me).length; }catch(e){ return 0; } }
  const region=o=>o.region||o.county||o.city||(String(o.address||'').split(',').map(s=>s.trim()).filter(Boolean).slice(-2,-1)[0]||'').replace(/\s+[A-Z]{1,2}\d.*$/,'')||'—';
  const logo=o=>{ try{ if(window.MSLOGOS&&MSLOGOS.has(o.name)) return `<span class="ot-lg svg">${MSLOGOS.svg(o.name,32)}</span>`; }catch(e){} return `<span class="ot-lg" style="background:${o.kind?'#8246af':'var(--sky)'}">${esc(o.initials||o.name.slice(0,2))}</span>`; };
  const avatar=u=>u?(P&&P.avHTML?`<span class="ot-av">${P.avHTML(u)}</span>`:`<span class="ot-av i">${esc(u.n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`):'';
  const mainCust=c=>{ const L=users(c).filter(u=>u.status!=='deactivated'); return L.find(u=>u.n===c.contactName)||L.find(u=>u.role==='Admin')||L[0]||null; };
  const mainSup=s=>{ const L=(s.contacts||[]).filter(u=>u.status!=='deactivated'); return L.find(u=>u.n===s.contactName)||L[0]||null; };
  const ST={active:'Active',draft:'Draft',invited:'Invited',paused:'Paused',onboarding:'Onboarding',inactive:'Inactive'};
  const credit=c=>{ const l=num(c.creditLimit), u=num(c.creditUsed); return l?Math.round(u/l*100):null; };
  const storeCount=s=>{ if(!window.MSCAT||!MSCAT.all) return null; const m=MSCAT.all().filter(p=>p.supplier===s.name); return {all:m.length,store:m.filter(p=>p.inRange||p.inStore||p.curated).length}; };
  const KIND={product:'Product',branding:'Branding',both:'Product + branding'};
  const conn=s=>/api/i.test(s.feed||'')?'API feed':/csv/i.test(s.feed||'')?'CSV upload':s.kind==='branding'?'Decoration only':'Manual';

  const amsOf=c=>{ if(!window.MSAM) return []; const m=new Map(); MSAM.usersOf(c.id).forEach(u=>{ const a=MSAM.getUser(c.id,u); if(a) m.set(a.n,a); }); return [...m.values()]; };
  const amOf=c=>amsOf(c)[0]||null;
  const fk=o=>'org:'+o.id, isF=o=>window.MSFLAG?MSFLAG.on(fk(o),o.flag):!!o.flag;
  const CCOLS=[['flag','',o=>isF(o)?(MSFLAG.get(fk(o),o.flag).level==='red'?2:1):0],['name','Customer',c=>c.name.toLowerCase()],['contact','Main contact',c=>((mainCust(c)||{}).n||'').toLowerCase()],['am','Account manager',c=>((amOf(c)||{}).n||'').toLowerCase()],['region','Region',region],
    ['projects','Projects',c=>c.projects||0],['orders','Orders',c=>c.totalOrders||0],['spend','Total spend',c=>num(c.totalSpend)],['spend12','Last 12 months',c=>num(c.spend12)],
    ['credit','Credit used',c=>credit(c)??-1],['last','Last order',c=>c.lastOrder?new Date(c.lastOrder).getTime()||0:0],['status','Status',c=>c.status||''],['onb','Onboarding',c=>window.MSONB?MSONB.progress(c.id):100],['since','Since',c=>c.since?new Date('1 '+c.since).getTime()||0:0]];
  const onbCell=o=>{ if(!window.MSONB||o.status==='draft') return '<span class="ot-sub">—</span>'; const p=MSONB.progress(o.id); if(p>=100) return '<span class="ot-onb ok">Complete</span>';
    return `<span class="ot-onb"><i style="--p:${p}%"></i>${p}%</span>`; };
  const SCOLS=[['flag','',o=>isF(o)?(MSFLAG.get(fk(o),o.flag).level==='red'?2:1):0],['name','Supplier',s=>s.name.toLowerCase()],['contact','Main contact',s=>((mainSup(s)||{}).n||'').toLowerCase()],['region','Region',region],['kind','Type',s=>s.kind||''],
    ['conn','Connection',conn],['products','Products',s=>s.products||0],['store','In your store',s=>(storeCount(s)||{}).store||0],['orders','Orders',s=>s.totalOrders||0],['spend','Spend',s=>num(s.totalSpend)],
['svc','Delivery on time',s=>(s.service||{}).deliveryMet||0],['status','Status',s=>s.status||''],['since','Since',s=>num(s.since)]];
  const V={view:'table',cust:{k:'spend',dir:-1,f:{},q:''},sup:{k:'spend',dir:-1,f:{},q:''}};

  function statbar(kind){ if(kind==='cust'){ const L=D.customers, t=L.reduce((a,c)=>a+num(c.totalSpend),0), y=L.reduce((a,c)=>a+num(c.spend12),0);
      return [['Customers',L.length],['Active',L.filter(c=>(c.status||'active')==='active').length],['Total spend',gbp(t)],['Last 12 months',gbp(y)],['Open approvals',L.reduce((a,c)=>a+(c.openApprovals||0),0)],['Need attention',L.filter(c=>c.flag||(credit(c)||0)>=80).length]]; }
    const L=D.suppliers, svc=L.filter(s=>s.service), avg=svc.length?Math.round(svc.reduce((a,s)=>a+s.service.deliveryMet,0)/svc.length):0;
    return [['Suppliers',L.length],['Active',L.filter(s=>(s.status||'active')==='active').length],['Products',L.reduce((a,s)=>a+(s.products||0),0).toLocaleString('en-GB')],['Orders placed',L.reduce((a,s)=>a+(s.totalOrders||0),0)],['Spend',gbp(L.reduce((a,s)=>a+num(s.totalSpend),0))],['Avg on-time delivery',avg+'%']]; }
  function filters(kind){ const f=V[kind].f, L=kind==='cust'?D.customers:D.suppliers, opt=(k,l,vals)=>`<select data-otf="${k}" class="${f[k]?'on':''}"><option value="">${l}: all</option>${vals.map(([v,t])=>`<option value="${esc(v)}"${f[k]===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;
    const sts=[...new Set(L.map(o=>o.status||'active'))].map(s=>[s,ST[s]||s]), regs=[...new Set(L.map(region))].filter(r=>r!=='—').sort().map(r=>[r,r]);
    const ams=window.MSAM?MSAM.list().filter(u=>D.customers.some(c=>amsOf(c).some(a=>a.n===u.n))).map(u=>[u.n,u.n]):[];
    const fl=opt('flagged','Flag',[['on','Any flag'],['amber','Warning'],['red','Action needed'],['off','Not flagged']]);
    const lo=opt('last','Last ordered',[['30','In the last 30 days'],['90','In the last 3 months'],['180','In the last 6 months'],['365','In the last 12 months'],['old','Over 12 months ago'],['never','Never ordered']]);
    const sp=opt('spend','Total spend',[['0-5000','Under £5,000'],['5000-25000','£5,000 – £25,000'],['25000-100000','£25,000 – £100,000'],['100000-','Over £100,000'],['none','No spend yet']]);
    const h=(kind==='cust'?opt('am','Account manager',ams)+opt('status','Status',sts)+opt('region','Region',regs)+lo+sp+opt('attn','Needs',[['approvals','Open approvals'],['credit','Credit over 80%']])
      :opt('kind','Type',Object.entries(KIND))+opt('conn','Connection',[...new Set(L.map(conn))].map(c=>[c,c]))+opt('status','Status',sts)+opt('region','Region',regs)+lo+sp)+fl;
    return h+(Object.values(f).some(Boolean)?'<button class="ot-clear" data-otclear>Clear filters</button>':''); }
  function rows(kind){ const S=V[kind], cols=kind==='cust'?CCOLS:SCOLS, col=cols.find(c=>c[0]===S.k)||cols[0], f=S.f, q=S.q.toLowerCase();
    let L=(kind==='cust'?D.customers:D.suppliers).filter(o=>{ const c=kind==='cust'?mainCust(o):mainSup(o);
      if(q&&!(o.name+' '+(c?c.n+' '+(c.email||''):'')+' '+(o.domain||'')+' '+region(o)).toLowerCase().includes(q)) return false;
      if(f.am&&!amsOf(o).some(a=>a.n===f.am)) return false; if(f.flagged==='on'&&!isF(o)) return false; if(f.flagged==='off'&&isF(o)) return false; if((f.flagged==='amber'||f.flagged==='red')&&!(isF(o)&&MSFLAG.get(fk(o),o.flag).level===f.flagged)) return false; if(f.status&&(o.status||'active')!==f.status) return false; if(f.region&&region(o)!==f.region) return false;
      if(f.last){ const t=o.lastOrder&&o.lastOrder!=='—'?new Date(o.lastOrder).getTime():0, days=t?(Date.now()-t)/864e5:Infinity;
        if(f.last==='never'){ if(t) return false; } else if(f.last==='old'){ if(!t||days<=365) return false; } else if(!(days<=+f.last)) return false; }
      if(f.spend){ const s=num(o.totalSpend); if(f.spend==='none'){ if(s>0) return false; } else { const [a,b]=f.spend.split('-'); if(s<+a||(b&&s>=+b)||s===0&&+a===0&&false) return false; if(f.spend==='0-5000'&&s===0) return false; } }
      if(f.kind&&o.kind!==f.kind) return false; if(f.conn&&conn(o)!==f.conn) return false;
      if(f.attn==='approvals'&&!(o.openApprovals>0)) return false; if(f.attn==='credit'&&!((credit(o)||0)>=80)) return false; if(f.attn==='flag'&&!isF(o)) return false; return true; });
    return L.sort((a,b)=>{ const x=col[2](a), y=col[2](b); return (x>y?1:x<y?-1:0)*S.dir; }); }
  const stPill=s=>`<span class="ot-st s-${esc(s||'active')}">${esc(ST[s||'active']||s)}</span>`;
  // name → that person's profile panel · email → new email (mailto for roles without Emails)
  function contactCell(u,org){ return u?`<div class="ot-ct">${avatar(u)}<span><a class="ot-lk" href="#" data-otuser="${esc(u.n)}" data-otuorg="${esc(org||'')}" data-otuemail="${esc(u.email||'')}">${esc(u.n)}</a>${u.email?`<a class="ot-lk sub" href="mailto:${esc(u.email)}" data-otmail="${esc(u.email)}" data-otmname="${esc(u.n)}" data-otmorg="${esc(org||'')}">${esc(u.email)}</a>`:`<em>${esc(u.title||'')}</em>`}</span></div>`:'<span class="ot-mut">—</span>'; }
  function tableHTML(kind){ const S=V[kind], cols=kind==='cust'?CCOLS:SCOLS, L=rows(kind);
    const head=cols.map(([k,l])=>`<th data-otsort="${k}"${k==='flag'?' class="ot-fh" title="Warning flag"':''}>${k==='flag'?'<svg viewBox="0 0 24 24" aria-label="Flag"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>':l}<span class="ot-arr">${S.k===k?(S.dir>0?'↑':'↓'):''}</span></th>`).join('')+'<th></th>';
    const body=L.length?L.map(o=>{ const n=unread(o.id);
      const first=`<td class="ot-fc">${window.MSFLAG?MSFLAG.cell(fk(o),o.name,o.flag):''}</td><td><div class="ot-org">${logo(o)}<span><span class="ot-nm"><a class="ot-lk nm" href="#" data-otorg="${esc(o.id)}">${esc(o.name)}</a>${kind==='cust'&&window.MSTERMS&&MSTERMS.pending(o.id)?`<button class="ot-terms" data-otterms="${esc(MSTERMS.pending(o.id).id)}" title="Credit terms waiting for Finance">Terms to approve</button>`:''}${n?`<i class="ot-unread" title="${n} unread note${n>1?'s':''}">${n}</i>`:''}</span>${o.website||o.domain?`<a class="ot-lk sub" href="https://${esc(String(o.website||o.domain).replace(/^https?:\/\//,''))}" target="_blank" rel="noopener" data-otweb>${esc(String(o.website||o.domain).replace(/^https?:\/\//,''))} ↗</a>`:''}</span></div></td>`;
      if(kind==='cust'){ const cr=credit(o);
        return `<tr data-otopen="${esc(o.id)}">${first}<td>${contactCell(mainCust(o),o.name)}</td><td>${(()=>{ const L=amsOf(o); return L.length>1?`<div class="ot-ams" title="${esc(L.map(x=>x.n).join(', '))}"><span class="ot-stack">${L.slice(0,3).map(x=>avatar(x)).join('')}</span><b>${L.length} account managers</b></div>`:contactCell(L[0],'Mojo Promotions'); })()}</td><td>${esc(region(o))}</td><td>${o.projects||0}</td><td>${o.totalOrders||0}</td><td><b>${esc(o.totalSpend||'£0')}</b></td><td>${esc(o.spend12||'—')}</td>
          <td>${cr==null?'<span class="ot-mut">No limit</span>':`<div class="ot-cr${cr>=80?' hi':''}"><i style="width:${Math.min(cr,100)}%"></i></div><span class="ot-sub">${cr}% of ${esc(o.creditLimit)}</span>`}</td>
          <td>${esc(o.lastOrder||'—')}</td><td>${stPill(o.status)}</td><td>${onbCell(o)}</td><td>${esc(o.since||'—')}</td><td><button class="ot-more" data-otmenu="${esc(o.id)}" aria-label="Open ${esc(o.name)}" title="Open details">⋯</button></td></tr>`; }
      const sc=storeCount(o), svc=(o.service||{}).deliveryMet;
      return `<tr data-otopen="${esc(o.id)}">${first}<td>${contactCell(mainSup(o),o.name)}</td><td>${esc(region(o))}</td><td><span class="ot-kind k-${esc(o.kind)}">${esc(KIND[o.kind]||'—')}</span></td><td>${esc(conn(o))}</td>
        <td>${(o.products||0).toLocaleString('en-GB')}</td><td>${sc?sc.store.toLocaleString('en-GB'):'—'}</td><td>${o.totalOrders||0}</td><td><b>${esc(o.totalSpend||'£0')}</b></td>
        <td>${svc?`<span class="ot-svc${svc>=95?' ok':svc>=88?'':' lo'}">${svc}%</span>`:'—'}</td><td>${stPill(o.status)}</td><td>${esc(o.since||'—')}</td><td><button class="ot-more" data-otmenu="${esc(o.id)}" aria-label="Open ${esc(o.name)}" title="Open details">⋯</button></td></tr>`; }).join('')
      :`<tr><td colspan="${cols.length+1}"><div class="ot-empty">No ${kind==='cust'?'customers':'suppliers'} match.</div></td></tr>`;
    return `<div class="ot-wrap"><table class="ot-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p class="ot-count">${L.length} of ${(kind==='cust'?D.customers:D.suppliers).length}</p>`; }

  function mount(kind){ const panel=document.getElementById(kind==='cust'?'panel-customers':'panel-suppliers'), grid=document.getElementById(kind==='cust'?'custGrid':'supGrid'); if(!panel||!grid) return;
    let host=panel.querySelector('.ot-host'); if(!host){ host=document.createElement('div'); host.className='ot-host'; grid.before(host);
      const tb=panel.querySelector('.toolbar'), sb=document.createElement('div'); sb.className='ot-stats'; tb.before(sb);
      const fl=document.createElement('div'); fl.className='ot-filters'; tb.after(fl);
      const q=tb.querySelector('.search input'); if(q) q.addEventListener('input',()=>{ V[kind].q=q.value; draw(kind); });
      if(window.MSMAP&&MSMAP.allowed()){ const b=tb.querySelector('.btn'); const t=document.createElement('div'); t.innerHTML=MSMAP.TOGGLE(V.view); b?b.before(t.firstChild):tb.appendChild(t.firstChild); }
      const mh=document.createElement('div'); mh.className='ot-maphost'; mh.hidden=true; host.after(mh); }
    draw(kind); }
  function draw(kind){ const panel=document.getElementById(kind==='cust'?'panel-customers':'panel-suppliers'), grid=document.getElementById(kind==='cust'?'custGrid':'supGrid'), host=panel.querySelector('.ot-host');
    panel.querySelector('.ot-stats').innerHTML=statbar(kind).map(([l,v])=>`<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
    if(V.view!=='map'||!(window.MSMAP&&MSMAP.allowed())) V.view='table';
    panel.querySelectorAll('[data-mapv]').forEach(b=>b.classList.toggle('on',b.dataset.mapv===V.view));
    const mh=panel.querySelector('.ot-maphost'), isMap=V.view==='map'; grid.hidden=true; host.hidden=isMap; if(mh) mh.hidden=!isMap;
    panel.querySelector('.ot-filters').innerHTML=filters(kind);
    if(isMap){ drawMap(kind,mh); return; }
    host.innerHTML=tableHTML(kind); }
  // map view: same rows as the table (search + filters), pins from each address
  const MAPS={};
  function mapItems(kind){ return rows(kind).map(o=>{ const c=kind==='cust'?mainCust(o):mainSup(o), f=isF(o)?MSFLAG.get(fk(o),o.flag):null, am=kind==='cust'?amOf(o):null;
    return {id:o.id,name:o.name,sub:o.website||o.domain||'',logo:logo(o),address:o.address&&o.address!=='—'?o.address:'',status:o.status||'active',flag:f?f.level:'none',am:am?am.n:'',kind:o.kind||'',
      size:num(kind==='cust'?o.totalSpend:o.totalSpend),
      rows:[['Main contact',c?esc(c.n):''],kind==='cust'?['Account manager',am?esc(am.n):'']:['Type',esc(KIND[o.kind]||'')],[kind==='cust'?'Total spend':'Spend with them',esc(o.totalSpend||'£0')],kind==='cust'?['Last 12 months',esc(o.spend12||'')]:['Products',o.products?Number(o.products).toLocaleString('en-GB'):''],['Status',stPill(o.status)],['Flag',f?`<span style="color:${f.level==='red'?'#b4232c':f.level==='amber'?'#9a6b1f':'var(--ink-3)'}">${esc(MSFLAG.LV[f.level]||'Flag')}${f.note?' · '+esc(f.note):''}</span>`:'']]}; }); }
  function drawMap(kind,mh){ const items=mapItems(kind); if(MAPS[kind]) return MAPS[kind].update(items);
    const FL={none:['No flag','#5b5fc7'],amber:['Warning','#e0a526'],red:['Action needed','#d6453d'],grey:['Note','#9aa0a6']};
    const SL={active:['Active','#1d9a7c'],invited:['Invited','#0a84c6'],draft:['Draft','#9aa0a6'],pending:['Pending','#0a84c6'],onboarding:['Onboarding','#0a84c6'],paused:['Paused','#e0a526'],inactive:['Inactive','#9aa0a6']};
    const KL={product:['Product','#0a84c6'],branding:['Branding','#b0478f'],both:['Product + branding','#5b5fc7']};
    const colours=[{k:'flag',label:'Flag',of:i=>i.flag,legend:FL},{k:'status',label:'Status',of:i=>i.status,legend:SL},kind==='cust'?{k:'am',label:'Account manager',of:i=>i.am}:{k:'kind',label:'Type',of:i=>i.kind,legend:KL}];
    MAPS[kind]=MSMAP.mount(mh,{ctx:'org-'+kind,items,colours,sizeLabel:'Size by spend',onOpen:id=>openOrg(kind,id)}); }
  const drawAll=()=>{ mount('cust'); mount('sup'); };

  // open a row → the existing drawer for that organisation
  window.MSORGTABLE={open:(kind,id)=>openOrg(kind,id),redraw:()=>{ draw('cust'); draw('sup'); }};
  // deep link: #org=<id> (from the Users table etc.)
  setTimeout(()=>{ const m=location.hash.match(/org=([\w-]+)/); if(!m) return; const id=m[1], kind=D.suppliers.some(s=>s.id===id)?'sup':'cust'; const t=document.querySelector('[data-tab="'+(kind==='cust'?'customers':'suppliers')+'"]'); if(t) t.click(); setTimeout(()=>openOrg(kind,id),120); },300);
  function openOrg(kind,id){ const o0=kind==='cust'&&D.customers.find(x=>x.id===id); if(o0&&o0.status==='draft'&&window.MSCUSTADD) return MSCUSTADD.open(id);
    if(kind==='cust'&&!document.querySelector(`.ocard[data-kind="cust"][data-id="${id}"]`)){ const g=document.getElementById('custGrid'); if(g&&window.__custCard) g.innerHTML=D.customers.map(window.__custCard).join(''); }
    const card=document.querySelector(`.ocard[data-kind="${kind}"][data-id="${id}"]`); markSeen(id); if(card) card.click(); setTimeout(()=>draw(kind),50); }
  function person(kind,o){ const u=kind==='cust'?mainCust(o):mainSup(o); return u?{name:u.n,email:u.email||'',title:u.title||'',orgName:o.name,orgType:kind==='cust'?'customer':'supplier',phone:u.tel||o.phone||''}:null; }
  function menu(btn,kind,o){ close(); const u=person(kind,o), first=u?u.name.split(' ')[0]:'';
    const role=window.MSID&&MSID.current?MSID.current():'distributor', canCall=role==='distributor'||role==='admin';
    const items=[['open','Open details'],u&&['chat','Message '+first],u&&u.email&&['email','Email '+first],u&&canCall&&['call','Call '+first],u&&['meet','Book a meeting with '+first],'-',
      ...(kind==='cust'?[['users','Account managers by user'],['orders','View orders'],['projects','View projects'],['ghost','Ghost as '+o.name]]:[['products','Browse their products'],['lead','Lead-time settings']])].filter(Boolean);
    const m=document.createElement('div'); m.className='ot-menu'; m.id='otMenu'; m.innerHTML=items.map(i=>i==='-'?'<hr>':`<button data-ota="${i[0]}">${esc(i[1])}</button>`).join('');
    document.body.appendChild(m); const r=btn.getBoundingClientRect(); m.style.top=Math.min(r.bottom+4,innerHeight-m.offsetHeight-8)+'px'; m.style.left=Math.max(8,r.right-m.offsetWidth)+'px';
    m.onclick=e=>{ const b=e.target.closest('[data-ota]'); if(!b) return; e.stopPropagation(); close(); const a=b.dataset.ota;
      if(a==='open') return openOrg(kind,o.id);
      if(a==='chat'&&window.MSChat) return MSChat.chatWith(u);
      if(a==='email'&&window.MSEMAIL) return MSEMAIL.compose({to:[{name:u.name,email:u.email,org:o.name}],link:{type:'org',label:o.name,href:'Merchsmith Organisations.html'}});
      if(a==='call'&&window.MSCALLS){ const p=window.MSChat&&MSChat.resolve?MSChat.resolve(u):null; return p?MSCALLS.dial({pid:p.id}):MSCALLS.dial({number:u.phone}); }
      if(a==='meet'){ const p=window.MSChat&&MSChat.resolve?MSChat.resolve(u):null; location.href='Merchsmith Calendar.html#tab=cal&with='+encodeURIComponent(p?p.id:''); return; }
      if(a==='users'){ location.href='Merchsmith Users.html'; return; }
      if(a==='orders') location.href='Merchsmith Orders.html'; if(a==='projects') location.href='Merchsmith Distributor Projects.html';
      if(a==='products') location.href='Merchsmith Store.html'; if(a==='lead') location.href='Merchsmith Distributor Settings.html#tab=leadtimes';
      if(a==='ghost'){ openOrg(kind,o.id); setTimeout(()=>{ const g=document.querySelector('#drawer [data-ghost]'); if(g) g.click(); },120); } };
    setTimeout(()=>document.addEventListener('click',close,{once:true}),0); }
  function close(){ const m=document.getElementById('otMenu'); if(m) m.remove(); }

  document.addEventListener('click',e=>{ const panel=e.target.closest('#panel-customers,#panel-suppliers'); if(!panel) return; const kind=panel.id==='panel-customers'?'cust':'sup';
    const v=e.target.closest('[data-mapv]'); if(v){ V.view=v.dataset.mapv; localStorage.setItem('ms-org-view',V.view); draw('cust'); draw('sup'); return; }
    const s=e.target.closest('[data-otsort]'); if(s){ const S=V[kind]; if(S.k===s.dataset.otsort) S.dir*=-1; else { S.k=s.dataset.otsort; S.dir=['name','am','contact','region','kind','conn','status'].includes(S.k)?1:-1; } draw(kind); return; }
    if(e.target.closest('[data-otclear]')){ V[kind].f={}; draw(kind); return; }
    const trb=e.target.closest('[data-otterms]'); if(trb&&window.MSTERMS){ e.preventDefault(); e.stopPropagation(); MSTERMS.open(trb.dataset.otterms); return; }
    const mb=e.target.closest('[data-otmenu]'); if(mb){ e.stopPropagation(); openOrg(kind,mb.dataset.otmenu); return; }
    if(e.target.closest('[data-otweb]')){ e.stopPropagation(); return; }
    const on=e.target.closest('[data-otorg]'); if(on){ e.preventDefault(); openOrg(kind,on.dataset.otorg); return; }
    const us=e.target.closest('[data-otuser]'); if(us){ e.preventDefault(); e.stopPropagation(); const q={name:us.dataset.otuser,email:us.dataset.otuemail,org:us.dataset.otuorg};
      const go=()=>window.MSUSER&&MSUSER.open(q); if(window.MSUSER) go(); else { const s=document.createElement('script'); s.src='dist-users.js?v=18'; s.onload=go; document.body.appendChild(s); } return; }
    const ml=e.target.closest('[data-otmail]'); if(ml){ e.stopPropagation(); if(window.MSEMAIL&&MSEMAIL.compose){ e.preventDefault(); MSEMAIL.compose({to:[{name:ml.dataset.otmname,email:ml.dataset.otmail,org:ml.dataset.otmorg}]}); } return; }
    const tr=e.target.closest('[data-otopen]'); if(tr) openOrg(kind,tr.dataset.otopen); });
  document.addEventListener('change',e=>{ const f=e.target.closest('[data-otf]'); if(!f) return; const kind=f.closest('#panel-customers')?'cust':'sup'; V[kind].f[f.dataset.otf]=f.value; draw(kind); });
  // re-draw after org-page.js edits cards (new customer, edits, people changes)
  ['custGrid','supGrid'].forEach(id=>{ const g=document.getElementById(id); if(g) new MutationObserver(()=>{ const k=id==='custGrid'?'cust':'sup'; clearTimeout(g._ot); g._ot=setTimeout(()=>draw(k),60); }).observe(g,{childList:true}); });
  window.addEventListener('ms-flag-change',()=>{ draw('cust'); draw('sup'); });
  const scrim=document.getElementById('scrim'); if(scrim) new MutationObserver(()=>{ if(!scrim.classList.contains('open')){ draw('cust'); draw('sup'); } }).observe(scrim,{attributes:true,attributeFilter:['class']});

  const css=`
  /* stat bars are switched off for now — remove this line to bring them back */
  .ot-stats{display:none!important;}
  .ot-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:22px 0 16px;} @media(max-width:1100px){.ot-stats{grid-template-columns:repeat(3,minmax(0,1fr));}}
  .ot-stats>div{background:#fff;border:1px solid var(--line-soft);border-top:3px solid var(--periwinkle-deep);border-radius:12px;padding:11px 14px;} .ot-stats>div:nth-child(2){border-top-color:var(--spearmint);} .ot-stats>div:nth-child(3){border-top-color:var(--sky);} .ot-stats>div:nth-child(4){border-top-color:var(--blossom);} .ot-stats>div:nth-child(5){border-top-color:var(--zest);} .ot-stats>div:nth-child(6){border-top-color:var(--flare);}
  .ot-stats b{display:block;font-family:var(--serif);font-weight:500;font-size:23px;line-height:1.15;} .ot-stats span{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
  .ot-view{display:flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;background:#fff;margin-left:auto;flex:none;} .ot-view button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:8px 13px;cursor:pointer;} .ot-view button+button{border-left:1.5px solid var(--line-soft);} .ot-view button.on{background:var(--ink);color:#fff;}
  .ot-filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px;} .ot-filters:empty{display:none;}
  .ot-filters select{font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:6px 12px;cursor:pointer;} .ot-filters select.on{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);background:var(--tint-peri);}
  .ot-clear{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;}
  .ot-host[hidden]{display:none;} .ot-wrap{overflow-x:auto;background:#fff;border:1px solid var(--line-soft);border-radius:16px;}
  .ot-tbl{width:100%;min-width:1180px;border-collapse:collapse;font-size:13px;} .ot-tbl th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding:12px 12px;border-bottom:1px solid var(--line-soft);white-space:nowrap;cursor:pointer;user-select:none;background:#fff;position:sticky;top:0;} .ot-tbl th:hover{color:var(--ink);} .ot-tbl th:last-child{cursor:default;width:44px;}
  .ot-arr{margin-left:4px;color:var(--periwinkle-deep);} .ot-tbl td{white-space:nowrap;padding:11px 12px;border-bottom:1px solid var(--paper-2);vertical-align:middle;color:var(--ink-2);} .ot-tbl tbody tr{cursor:pointer;} .ot-tbl tbody tr:hover td{background:var(--paper);} .ot-tbl tbody tr:last-child td{border-bottom:0;}
  .ot-org{display:flex;align-items:center;gap:11px;min-width:200px;} .ot-org>span{display:flex;flex-direction:column;min-width:0;} .ot-nm{display:flex;align-items:center;white-space:nowrap;} .ot-org b{font-size:14px;color:var(--ink);line-height:1.3;} .ot-org em{font-style:normal;font-size:12px;color:var(--muted);}
  .ot-lg{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:800;flex:none;overflow:hidden;} .ot-lg.svg svg{width:32px;height:32px;display:block;}
  .ot-unread{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:999px;background:var(--flare);color:#fff;font-style:normal;font-size:10px;font-weight:800;margin-left:6px;padding:0 4px;vertical-align:2px;}
  .ot-flag{display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px;vertical-align:2px;background:#c9882a;} .ot-flag.fl-red{background:var(--flare);} .ot-flag.fl-grey{background:var(--muted);}
  .ot-ct{display:flex;align-items:center;gap:9px;min-width:170px;} .ot-ct>span:last-child{display:flex;flex-direction:column;min-width:0;} .ot-ct b{font-size:13px;color:var(--ink);} .ot-ct em{font-style:normal;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;}
  .ot-av{width:28px;height:28px;border-radius:50%;overflow:hidden;flex:none;display:grid;place-items:center;background:var(--periwinkle);color:#fff;font-size:10.5px;font-weight:800;} .ot-av img{width:100%;height:100%;object-fit:cover;}
.ot-onb{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:var(--ink-2);white-space:nowrap;} .ot-onb i{width:46px;height:6px;border-radius:6px;background:linear-gradient(90deg,var(--periwinkle-deep) var(--p),var(--paper-2) var(--p));} .ot-onb.ok{color:var(--green-deep,#1d7c4d);}
  .ot-am{border:0;background:none;padding:4px 6px;margin:-4px -6px;border-radius:10px;font:inherit;text-align:left;cursor:pointer;} .ot-am:hover{background:var(--tint-peri);}
  .ot-ams{display:flex;align-items:center;justify-content:flex-start;gap:9px;} .ot-stack{display:flex;align-items:center;} .ot-stack>.ot-av{box-shadow:0 0 0 2px #fff;} .ot-stack>.ot-av+.ot-av{margin-left:-8px;} .ot-ams>b{font-size:13px;color:var(--ink);}
  .ot-fc{width:36px;padding-right:0!important;} .ot-fh svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.8;vertical-align:-2px;}
  .ot-lk{color:var(--ink);text-decoration:none;font-weight:700;font-size:13px;} .ot-lk.nm{font-size:14px;} .ot-lk:hover{color:var(--periwinkle-deep);text-decoration:underline;text-underline-offset:2px;}
  .ot-lk.sub{font-weight:500;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;} .ot-lk.sub:hover{color:var(--periwinkle-deep);}
  .ot-sub{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;} .ot-mut{color:var(--muted);}
  .ot-cr{width:90px;height:6px;border-radius:999px;background:var(--paper-2);overflow:hidden;margin-bottom:4px;} .ot-cr i{display:block;height:100%;background:var(--green-deep);} .ot-cr.hi i{background:var(--flare);}
  .ot-st{font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:999px;padding:3px 9px;white-space:nowrap;background:var(--tint-green);color:var(--green-deep);} .ot-st.s-invited,.ot-st.s-onboarding{background:#fbeccd;color:#8a5a12;} .ot-st.s-paused,.ot-st.s-inactive{background:var(--paper-2);color:var(--ink-3);}
  .ot-kind{font-size:11px;font-weight:700;border-radius:6px;padding:3px 8px;white-space:nowrap;background:var(--tint-peri);color:var(--periwinkle-ink);} .ot-kind.k-branding{background:#efe7f6;color:#6d3b99;} .ot-kind.k-both{background:color-mix(in srgb,var(--sky) 16%,#fff);color:#0a6e9e;}
  .ot-svc{font-weight:800;color:#9a6b1f;} .ot-svc.ok{color:var(--green-deep);} .ot-svc.lo{color:#b4232c;}
  .ot-more{width:30px;height:30px;border-radius:8px;border:1px solid var(--line-soft);background:#fff;cursor:pointer;font-size:16px;color:var(--ink-3);} .ot-more:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
  .ot-empty{padding:36px;text-align:center;color:var(--muted);} .ot-count{font-size:12px;color:var(--muted);margin:8px 2px 0;}
  .ot-menu{position:fixed;z-index:1600;min-width:220px;background:#fff;border:1px solid var(--line-soft);border-radius:12px;box-shadow:0 12px 40px rgba(20,22,45,.2);padding:6px;} .ot-menu button{display:block;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;color:var(--ink);padding:8px 10px;border-radius:8px;cursor:pointer;} .ot-menu button:hover{background:var(--paper);} .ot-menu hr{border:0;border-top:1px solid var(--paper-2);margin:4px 0;}
  .grid[hidden]{display:none!important;} .ot-st.s-draft{background:var(--paper-2);color:var(--ink-3);border:1px dashed var(--line);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  (function go(n){ if(document.querySelector('#custGrid .ocard')||n>40) drawAll(); else setTimeout(()=>go(n+1),100); })(0);
})();
