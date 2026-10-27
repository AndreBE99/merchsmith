/* ============================================================
   notifications.js — header bell + Notifications page, every role.

   Bell (chrome.js header): unread count, dropdown with All / Unread,
   grouped rows ("3 new messages from Sara"), mark read/unread, snooze,
   mute a project / conversation. Important events also pop up as toasts
   (not during quiet hours). Page: Inbox (filters, search, categories),
   Settings (per-event grid: In-app / Pop-up / Email, quiet hours, daily
   digest, muted list) and Announcements (Platform Admin writes, everyone
   else receives).

   PROTOTYPE: events are seeded per role; "Simulate" adds new ones.
   Store: ms-notif-v1 {items:{role:[]}, prefs:{role:{}}, ann:[]}.
   window.MSNOTIF: push(role,item) · mount(root) · unread()
   ============================================================ */
window.MSNOTIF=window.MSNOTIF||(function(){
  const KEY='ms-notif-v1';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const role=()=>(window.MSID&&MSID.current?MSID.current():(window.MS_SCOPE==='platform'?'admin':(localStorage.getItem('ms-identity')||'distributor')));
  const qs=()=>(window.MS_SCOPE==='platform'||/[?&]scope=platform\b/.test(location.search)||role()==='admin')?'?scope=platform':'';
  const ago=t=>{ const s=(Date.now()-new Date(t))/1000; if(s<60) return 'Just now'; if(s<3600) return Math.floor(s/60)+'m'; if(s<86400) return Math.floor(s/3600)+'h'; if(s<604800) return Math.floor(s/86400)+'d'; return new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'}); };

  /* ---------- event catalogue ---------- */
  const CATS={projects:'Projects & proofs',orders:'Orders',invoices:'Invoices & billing',chat:'Chat',meetings:'Meetings',calls:'Phone calls',emails:'Email replies',suppliers:'Suppliers & catalogue',people:'Customers & team',platform:'Platform',announce:'Announcements'};
  // r: roles that can get it · imp: pops up as a toast by default · em: emailed by default
  const EVT=[
    {id:'proof_ready',cat:'projects',label:'Proof ready to approve',r:['customer'],imp:1,em:1},
    {id:'proof_ok',cat:'projects',label:'Proof approved',r:['distributor'],imp:1},
    {id:'proof_changes',cat:'projects',label:'Changes requested on a proof',r:['distributor'],imp:1,em:1},
    {id:'proof_wait',cat:'projects',label:'Proof still waiting for approval',r:['customer','distributor'],em:1},
    {id:'quote_ok',cat:'projects',label:'Quote accepted',r:['distributor'],imp:1,em:1},
    {id:'quote_exp',cat:'projects',label:'Quote about to expire',r:['customer','distributor'],em:1},
    {id:'order_placed',cat:'orders',label:'Order placed',r:['distributor','supplier'],em:1},
    {id:'order_dispatched',cat:'orders',label:'Order dispatched',r:['distributor','customer'],em:1},
    {id:'order_delivered',cat:'orders',label:'Order delivered',r:['distributor','customer']},
    {id:'order_delayed',cat:'orders',label:'Order delayed',r:['distributor','customer','supplier'],imp:1,em:1},
    {id:'deadline_risk',cat:'orders',label:'Delivery deadline at risk',r:['distributor','customer'],imp:1,em:1},
    {id:'sample_req',cat:'orders',label:'Sample requested',r:['distributor','supplier']},
    {id:'invoice_issued',cat:'invoices',label:'Invoice issued',r:['customer','supplier'],em:1},
    {id:'invoice_overdue',cat:'invoices',label:'Invoice overdue',r:['distributor','customer'],imp:1,em:1},
    {id:'invoice_paid',cat:'invoices',label:'Invoice paid',r:['distributor','supplier']},
    {id:'terms_req',cat:'invoices',label:'Customer credit terms to approve (Finance)',r:['distributor'],imp:1,em:1},
    {id:'terms_done',cat:'invoices',label:'Decision on credit terms you asked for',r:['distributor'],imp:1,em:1},
    {id:'billing',cat:'invoices',label:'Subscription and billing',r:['distributor'],em:1},
    {id:'credit',cat:'invoices',label:'Credit limit nearly reached',r:['distributor','customer'],imp:1,em:1},
    {id:'chat',cat:'chat',label:'New chat message',r:['admin','distributor','customer','supplier']},
    {id:'mention',cat:'chat',label:'Someone @mentions you',r:['admin','distributor','customer','supplier'],imp:1,em:1},
    {id:'meet_invite',cat:'meetings',label:'Meeting invitation',r:['admin','distributor','customer','supplier'],imp:1,em:1},
    {id:'meet_reply',cat:'meetings',label:'Reply to your meeting',r:['admin','distributor','customer','supplier']},
    {id:'meet_soon',cat:'meetings',label:'Meeting starting soon',r:['admin','distributor','customer','supplier'],imp:1},
    {id:'action_due',cat:'meetings',label:'Meeting action item due',r:['admin','distributor','customer','supplier']},
    {id:'missed',cat:'calls',label:'Missed call',r:['admin','distributor'],imp:1,em:1},
    {id:'voicemail',cat:'calls',label:'New voicemail',r:['admin','distributor'],imp:1,em:1},
    {id:'call_fwd',cat:'calls',label:'A call was forwarded to you',r:['admin','distributor'],imp:1},
    {id:'call_xfer',cat:'calls',label:'A call was transferred to you',r:['admin','distributor'],imp:1},
    {id:'call_fwd_out',cat:'calls',label:'Your call was answered by a colleague',r:['admin','distributor']},
    {id:'call_rec',cat:'calls',label:'Call recording and transcript ready',r:['admin','distributor']},
    {id:'email_reply',cat:'emails',label:'Reply to one of your emails',r:['admin','distributor'],imp:1},
    {id:'email_bounce',cat:'emails',label:'An email couldn’t be delivered',r:['admin','distributor'],em:1},
    {id:'domain',cat:'platform',label:'Store domain or email domain status',r:['admin','distributor'],imp:1,em:1},
    {id:'sup_price',cat:'suppliers',label:'Supplier price change',r:['distributor']},
    {id:'sup_stock',cat:'suppliers',label:'Low stock on a product you sell',r:['distributor'],imp:1},
    {id:'feed_error',cat:'suppliers',label:'Product feed failed',r:['admin','distributor','supplier'],imp:1,em:1},
    {id:'cust_new',cat:'people',label:'New customer or team member joined',r:['admin','distributor','customer']},
    {id:'pay_failed',cat:'platform',label:'Distributor payment failed',r:['admin'],imp:1,em:1},
    {id:'dist_new',cat:'platform',label:'New distributor signed up',r:['admin'],em:1},
    {id:'announce',cat:'announce',label:'Platform announcement',r:['distributor','customer','supplier'],imp:1,em:1}];
  const ICON={projects:'<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9"/>',orders:'<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5M7 19a1.5 1.5 0 1 0 0-.01M17 19a1.5 1.5 0 1 0 0-.01"/>',invoices:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>',
    chat:'<path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/>',meetings:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',calls:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',emails:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    suppliers:'<path d="M4 9.5 5.5 5h13L20 9.5M4 9.5h16v10.5H4z"/>',people:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',platform:'<path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"/>',announce:'<path d="M4 10v4h3l6 4V6L7 10zM17 9a4 4 0 0 1 0 6"/>'};
  const ic=(c,s)=>`<svg viewBox="0 0 24 24" width="${s||18}" height="${s||18}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[c]||ICON.platform}</svg>`;
  const evt=id=>EVT.find(e=>e.id===id)||EVT[0];

  /* ---------- seed ---------- */
  function seed(r){ const now=Date.now(), m=60e3, H=36e5;
    const N=(ev,title,body,ago2,href,extra)=>Object.assign({id:'n'+Math.random().toString(36).slice(2,9),ev,title,body,at:new Date(now-ago2).toISOString(),href,read:false},extra||{});
    const P='Merchsmith Project - Autumn Giveaways.html', O='Merchsmith Orders.html', C='Merchsmith Chats.html', K='Merchsmith Calendar.html', A='Merchsmith Admin.html#nav=';
    if(r==='customer') return [
      N('proof_ready','Proof ready: Ceramic Mug 11oz','Mojo Promotions added a proof to Autumn Giveaways. Please approve it or ask for changes.',25*m,P,{ctx:'project:autumn',ctxLabel:'Autumn Giveaways'}),
      N('chat','Jess Doyle','The revised mug proof is up. I moved the logo up 10mm as you asked.',40*m,C,{group:'chat:jess',ctx:'chat:jess',ctxLabel:'Chat with Jess'}),
      N('chat','Jess Doyle','Also, tote delivery is confirmed for the 14th.',38*m,C,{group:'chat:jess',ctx:'chat:jess',ctxLabel:'Chat with Jess'}),
      N('order_dispatched','Order MJ-10479 is on its way','DPD 1550 7721 0934 · expected Thursday.',5*H,O,{read:true}),
      N('meet_invite','Invitation: Proof review','Jess Doyle · Tue 10:00 · Google Meet',9*H,K+'#tab=invites'),
      N('invoice_issued','Invoice INV-2291 from Mojo Promotions','£4,215.60 · due 30 Sep',26*H,O,{read:true}),
      N('cust_new','Priya Nair joined Citrix','She accepted your invitation and can now order.',50*H,'Merchsmith Team.html',{read:true})];
    if(r==='supplier') return [
      N('order_placed','New order from Mojo Promotions','PO-5521 · 1,500 × Cotton Tote, natural · due 3 Nov',15*m,'Merchsmith Supplier Portal.html'),
      N('feed_error','Your product feed failed','The 09:00 sync couldn’t read 12 rows (missing prices). Fix them to keep products live.',2*H,'Merchsmith Supplier Portal.html#tab=feed'),
      N('chat','Jess Doyle','Can you hold 1,500 totes until Friday?',3*H,C,{group:'chat:jess',ctx:'chat:jess',ctxLabel:'Chat with Jess'}),
      N('meet_invite','Invitation: Q4 capacity call','Jess Doyle · Thu 14:00 · Phone',20*H,K+'#tab=invites'),
      N('invoice_paid','Mojo Promotions paid INV-S-0442','£3,980.00 received',48*H,'Merchsmith Supplier Portal.html#tab=billing',{read:true})];
    if(r==='admin') return [
      N('pay_failed','Payment failed: Brightside Promo','£750 Growth plan · card declined. They’ve been emailed.',30*m,A+'subscriptions'),
      N('dist_new','Northbound Merch signed up','Priya Shah accepted the invitation and chose the Starter plan.',3*H,A+'distributors'),
      N('email_reply','Liam Ford replied by email','“I’ve updated the card now, can you retry the payment?”',4*H,'Merchsmith Emails.html?scope=platform#tab=sent'),
      N('feed_error','Veltex feed failed for 3 distributors','Supplier API returned 401 at 06:00. Supplier notified.',7*H,A+'suppliers'),
      N('chat','Jess Doyle','Quick one on custom domains when you have a minute.',8*H,C+'?scope=platform',{group:'chat:jess',ctx:'chat:jess',ctxLabel:'Chat with Jess'}),
      N('missed','Missed call from Tom Reed','BagWorks UK · 01772 830 441',26*H,'Merchsmith Calls.html?scope=platform',{read:true})];
    return [
      N('proof_changes','Sara asked for changes','Ceramic Mug 11oz · “Can the logo move up about 10mm?”',12*m,P,{ctx:'project:autumn',ctxLabel:'Autumn Giveaways'}),
      N('chat','Sara Kemp','Thanks for the quick turnaround!',18*m,C,{group:'chat:sara',ctx:'chat:sara',ctxLabel:'Chat with Sara'}),
      N('chat','Sara Kemp','Can we also get a sample of the navy tote?',21*m,C,{group:'chat:sara',ctx:'chat:sara',ctxLabel:'Chat with Sara'}),
      N('chat','Sara Kemp','Morning Jess, the proofs look great.',35*m,C,{group:'chat:sara',ctx:'chat:sara',ctxLabel:'Chat with Sara'}),
      N('mention','Cara mentioned you','Winter Welcome Packs · “@Jess can you confirm the beanie colour?”',50*m,'Merchsmith Distributor Projects.html',{ctx:'project:winter',ctxLabel:'Winter Welcome Packs'}),
      N('order_delayed','Order MJ-10482 delayed by 2 days','BagWorks UK moved dispatch to Wed. Delivery still before the 14 Nov deadline.',2*H,O),
      N('email_reply','Leo Tran replied by email','“Can you split the price for 250 and 500 units?”',3*H,'Merchsmith Emails.html#tab=sent'),
      N('missed','Missed call from Tom Reed','BagWorks UK · left a 24s voicemail',4*H,'Merchsmith Calls.html#tab=voicemail'),
      N('sup_stock','Low stock: Ceramic Mug 11oz, white','BagWorks UK has 340 left. 2 open quotes use it.',6*H,'Merchsmith Store.html'),
      N('proof_ok','Leo approved Heavy Weight T-Shirt','Winter Welcome Packs · ready to order',8*H,'Merchsmith Distributor Projects.html',{read:true,ctx:'project:winter',ctxLabel:'Winter Welcome Packs'}),
      N('invoice_overdue','Harbour Foods: INV-2275 is 7 days overdue','£1,860.00 · reminder bounced (mailbox full)',22*H,O),
      N('meet_reply','Sara accepted Proof review','Tue 10:00 · Google Meet',24*H,K,{read:true}),
      N('sup_price','BagWorks UK updated prices','Cotton Tote +4% from 1 Oct. Your sell prices follow your markup rules.',30*H,'Merchsmith Distributor Settings.html#tab=markup',{read:true}),
      N('feed_error','Veltex feed failed','06:00 sync returned an error. Products stay on sale at their last prices.',32*H,'Merchsmith Store.html',{read:true}),
      N('cust_new','Harbour Foods joined your store','Accounts team · 3 people invited',50*H,'Merchsmith Organisations.html',{read:true}),
      N('invoice_paid','Citrix paid INV-2280','£2,140.00 received',52*H,O,{read:true}),
      N('billing','Subscription renewed','Growth plan · £750 · next payment 1 Nov',70*H,'Merchsmith Finance.html#sub=plan',{read:true})]; }

  function seed2(r){ const now=Date.now(), m=60e3, H=36e5, N=(ev,title,body,a,href,x)=>Object.assign({id:'n'+Math.random().toString(36).slice(2,9),ev,title,body,at:new Date(now-a).toISOString(),href,read:!!(x&&x.read)},x||{});
    const CL='Merchsmith Calls.html'+(r==='admin'?'?scope=platform':'');
    if(r==='distributor') return [
      N('voicemail','Voicemail from Priya Nair','Citrix · 0:24 · “Calling about the delivery split for the three offices…”',8*m,CL+'#tab=voicemail'),
      N('call_fwd','Call forwarded to you from Cara','Leo Tran · Citrix · Cara didn’t answer after 4 rings',70*m,CL+'#tab=history'),
      N('call_rec','Recording ready: call with Sara Kemp','5:12 · transcript and summary saved to the call',100*m,CL+'#tab=history',{read:true}),
      N('quote_ok','Citrix accepted quote Q-1182','Autumn Giveaways · £17,840 · ready to order',2.5*H,'Merchsmith Project - Autumn Giveaways.html'),
      N('deadline_risk','Autumn Giveaways may miss 14 Nov','Mug proof still not approved. Latest order date for 14 Nov delivery is Friday.',5*H,'Merchsmith Project - Autumn Giveaways.html',{ctx:'project:autumn',ctxLabel:'Autumn Giveaways'}),
      N('credit','Harbour Foods is at 92% of its credit limit','£9,200 of £10,000 used. New orders over £800 will need payment first.',9*H,'Merchsmith Organisations.html'),
      N('action_due','Action due today: send first proofs','From Autumn Giveaways kick-off · assigned to Cara',12*H,'Merchsmith Calendar.html',{read:true}),
      N('email_bounce','Email to accounts@harbourfoods.co bounced','Invoice overdue reminder · mailbox full, retrying in 4 hours',23*H,'Merchsmith Emails.html#tab=sent',{read:true}),
      N('sample_req','Sample requested: Navy Tote','Sara Kemp · Citrix · 1 × delivered to Leeds',26*H,'Merchsmith Orders.html',{read:true}),
      N('domain','shop.mojopromotions.co.uk is live','SSL certificate issued. Your store now opens on your own domain.',3*24*H,'Merchsmith Distributor Settings.html#tab=domain',{read:true})];
    if(r==='admin') return [
      N('voicemail','Voicemail from Liam Ford','Brightside Promo · 0:31 · “Following up on the failed payment…”',50*m,CL+'#tab=voicemail'),
      N('call_xfer','Call transferred to you','Owen Price · Coastline Brands · from Sam at Merchsmith',5*H,CL+'#tab=history',{read:true}),
      N('domain','SSL renewal failed: shop.brightsidepromo.com','DNS no longer points at Merchsmith. Their store falls back to the Merchsmith address.',6*H,'Merchsmith Admin.html#nav=distributors'),
      N('email_bounce','Invitation to owen@coastlinebrands bounced','The domain doesn’t exist. Check the address and resend.',20*H,'Merchsmith Emails.html?scope=platform#tab=sent',{read:true})];
    if(r==='customer') return [
      N('proof_wait','Proof waiting 3 days: Ceramic Mug 11oz','Approve it by Friday to keep your 14 Nov delivery.',3*H,'Merchsmith Project - Autumn Giveaways.html',{ctx:'project:autumn',ctxLabel:'Autumn Giveaways'}),
      N('quote_exp','Quote Q-1190 expires in 3 days','Winter Welcome Packs · £6,420',10*H,'Merchsmith Projects.html'),
      N('credit','You’ve used 81% of your credit limit','£8,100 of £10,000 with Mojo Promotions',30*H,'Merchsmith Customer Settings.html#tab=account',{read:true}),
      N('action_due','Action due: confirm delivery split','From Autumn Giveaways kick-off · due Friday',32*H,'Merchsmith Calendar.html',{read:true})];
    if(r==='supplier') return [
      N('sample_req','Sample requested by Mojo Promotions','1 × Cotton Tote, navy · ship to Leeds',4*H,'Merchsmith Supplier Portal.html'),
      N('action_due','Action due: confirm November capacity','From Q4 capacity call · due Thursday',28*H,'Merchsmith Calendar.html',{read:true})];
    return []; }

  /* ---------- store ---------- */

  // one-off: align seeded names with the people directory (org-data.js)
  const NAMEMAP=[["Sara Ahmed","Sara Kemp"],["sara.ahmed@citrix.com","sara.kemp@citrix.com"],["Leo Grant","Leo Tran"],["leo.grant@citrix.com","leo.tran@citrix.com"],["Jess Carter","Jess Doyle"],["Cara Doyle","Cara Lyon"],["priya.raman@citrix.com","priya.nair@citrix.com"]];
  function nameFix(o){ if(!o||o.nm2) return o; let s=JSON.stringify(o); NAMEMAP.forEach(([a,b])=>{ s=s.split(a).join(b); }); s=s.replace(/Priya Raman(\\?"[^}]{0,120}Citrix|,\s*Citrix| joined Citrix| · Citrix)/g,m=>m.replace('Priya Raman','Priya Nair')); const x=JSON.parse(s); x.nm2=1; return x; }
  function db(){ let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} if(o&&!o.nm2){ o=nameFix(o); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(x){} } if(!o) o={nm2:1}; o.items=o.items||{}; o.prefs=o.prefs||{}; o.ann=o.ann||[]; o.bars=o.bars||[]; return o; }
  function save(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-notif-change')); }catch(e){} }
  const upd=fn=>{ const o=db(); fn(o); save(o); };
  function items(){ const o=db(), r=role(); if(!o.items[r]){ o.items[r]=seed(r); save(o); }
    o.v2=o.v2||{}; if(!o.v2[r]){ o.items[r].push(...seed2(r)); o.v2[r]=1; save(o); }
    let ch=false; o.items[r].forEach(n=>{ if(n.snoozeUntil&&new Date(n.snoozeUntil)<=new Date()){ delete n.snoozeUntil; n.read=false; n.at=new Date().toISOString(); ch=true; } }); if(ch) save(o);
    return o.items[r]; }
  const prefs=()=>{ const p=db().prefs[role()]||{}; return {grid:p.grid||{},quiet:Object.assign({on:false,from:'18:30',to:'08:00',weekends:true},p.quiet||{}),digest:Object.assign({on:false,time:'08:00'},p.digest||{}),muted:p.muted||[]}; };
  const setPrefs=x=>upd(o=>{ o.prefs[role()]=Object.assign(prefs(),x); });
  const cell=(ev,ch)=>{ const g=prefs().grid[ev]; const e=evt(ev); if(g&&g[ch]!=null) return g[ch]; return ch==='app'?true:ch==='pop'?!!e.imp:!!e.em; };
  const muted=n=>n.ctx&&prefs().muted.some(m=>m.key===n.ctx);
  const visible=()=>items().filter(n=>!n.snoozeUntil&&cell(n.ev,'app')&&!muted(n));
  const unread=()=>visible().filter(n=>!n.read).length;
  function quietNow(){ const q2=prefs().quiet; if(!q2.on) return false; const d=new Date(), t=d.getHours()*60+d.getMinutes(), mm=s=>{ const [h,x]=s.split(':').map(Number); return h*60+x; }, f=mm(q2.from), to=mm(q2.to);
    if(q2.weekends&&(d.getDay()===0||d.getDay()===6)) return true; return f<to?(t>=f&&t<to):(t>=f||t<to); }
  // group consecutive unread items with the same group key
  function grouped(list){ const out=[]; list.forEach(n=>{ const g=n.group&&!n.read?out.find(x=>x.group===n.group&&!x.read&&x.kids):null; if(g){ g.kids.push(n); } else out.push(n.group&&!n.read?Object.assign({},n,{kids:[n]}):n); }); return out; }

  function toast(n){ if(quietNow()||!cell(n.ev,'pop')) return; let w=document.getElementById('ntToasts'); if(!w){ w=document.createElement('div'); w.id='ntToasts'; document.body.appendChild(w); }
    const e=evt(n.ev), t=document.createElement('a'); t.className='nt-toast c-'+e.cat; t.href=n.href||'#'; t.innerHTML=`<span class="nt-ic">${ic(e.cat,18)}</span><span class="nt-tx"><b>${esc(n.title)}</b><i>${esc(n.body||'')}</i></span><button aria-label="Dismiss">×</button>`;
    t.querySelector('button').onclick=ev=>{ ev.preventDefault(); t.remove(); }; t.onclick=()=>markRead(n.id,true); w.appendChild(t); setTimeout(()=>t.classList.add('on'),20); setTimeout(()=>{ t.classList.remove('on'); setTimeout(()=>t.remove(),300); },7000); }
  function push(r,n){ const x=Object.assign({id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),at:new Date().toISOString(),read:false},n); upd(o=>{ (o.items[r]=o.items[r]||seed(r)).unshift(x); });
    if(r===role()&&cell(x.ev,'app')&&!muted(x)) toast(x); paintBell(); return x; }
  const markRead=(id,v)=>upd(o=>{ const L=o.items[role()]||[]; const n=L.find(x=>x.id===id); if(!n) return; if(n.group&&!n.read) L.filter(x=>x.group===n.group&&!x.read).forEach(x=>x.read=v); else n.read=v; });
  const allRead=()=>upd(o=>{ (o.items[role()]||[]).forEach(n=>{ if(!n.snoozeUntil) n.read=true; }); });
  function snooze(id,when){ const d=new Date(); if(when==='1h') d.setTime(d.getTime()+36e5); else if(when==='tom'){ d.setDate(d.getDate()+1); d.setHours(9,0,0,0); } else { d.setDate(d.getDate()+((8-d.getDay())%7||7)); d.setHours(9,0,0,0); }
    upd(o=>{ const L=o.items[role()]; const n=L.find(x=>x.id===id); const ids=n.group&&!n.read?L.filter(x=>x.group===n.group&&!x.read).map(x=>x.id):[id]; L.forEach(x=>{ if(ids.includes(x.id)) x.snoozeUntil=d.toISOString(); }); });
    return d; }
  function mute(n){ if(!n.ctx) return; setPrefs({muted:[...prefs().muted.filter(m=>m.key!==n.ctx),{key:n.ctx,label:n.ctxLabel||n.ctx}]}); }
  const snoozeLbl=d=>d.toLocaleString('en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'});

  function rowHTML(n,menuOk){ const e=evt(n.ev), k=n.kids&&n.kids.length>1;
    const title=k?`${n.kids.length} new messages from ${esc(n.title.split(' ')[0])}`:esc(n.title), body=k?`“${esc(n.kids[0].body)}”`:esc(n.body||'');
    return `<div class="nt-row c-${e.cat}${n.read?'':' unread'}" data-nid="${esc(n.id)}"><a class="nt-main" href="${esc(n.href||'#')}" data-ngo="${esc(n.id)}"><span class="nt-ic">${ic(e.cat,17)}${k?`<b class="nt-cnt">${n.kids.length}</b>`:''}</span>
      <span class="nt-tx"><b>${title}</b><i>${body}</i><em>${ago(n.at)}${n.ctxLabel?' · '+esc(n.ctxLabel):''}${n.snoozeUntil?' · snoozed until '+snoozeLbl(new Date(n.snoozeUntil)):''}</em></span></a>
      ${menuOk?`<span class="nt-acts"><button data-nread="${esc(n.id)}" title="${n.read?'Mark as unread':'Mark as read'}" aria-label="${n.read?'Mark as unread':'Mark as read'}"><i class="nt-dot${n.read?' off':''}"></i></button><button data-nmenu="${esc(n.id)}" title="More" aria-label="More options">⋯</button></span>`:''}</div>`; }
  function openMenu(btn,n,after){ closeMenu(); const m=document.createElement('div'); m.className='nt-menu'; m.id='ntMenu';
    m.innerHTML=`<button data-nm="read">${n.read?'Mark as unread':'Mark as read'}</button><div class="nt-msep">Snooze</div><button data-nm="1h">For 1 hour</button><button data-nm="tom">Until tomorrow, 9:00</button><button data-nm="week">Until next week</button>${n.ctx?`<div class="nt-msep"></div><button data-nm="mute">Mute ${esc(n.ctxLabel||'this')}</button>`:''}<div class="nt-msep"></div><button data-nm="off">Turn off “${esc(evt(n.ev).label)}”</button>`;
    document.body.appendChild(m); const r=btn.getBoundingClientRect(); m.style.top=Math.min(r.bottom+4,innerHeight-m.offsetHeight-8)+'px'; m.style.left=Math.max(8,r.right-m.offsetWidth)+'px';
    m.onclick=e=>{ const b=e.target.closest('[data-nm]'); if(!b) return; e.stopPropagation(); const a=b.dataset.nm;
      if(a==='read') markRead(n.id,!n.read); else if(a==='mute'){ mute(n); ntoast('Muted '+(n.ctxLabel||'')+'. Unmute in notification settings.'); } else if(a==='off'){ const g=Object.assign({},prefs().grid); g[n.ev]=Object.assign({},g[n.ev],{app:false,pop:false}); setPrefs({grid:g}); ntoast('“'+evt(n.ev).label+'” turned off'); }
      else { const d=snooze(n.id,a); ntoast('Snoozed until '+snoozeLbl(d)); } closeMenu(); after(); };
    setTimeout(()=>document.addEventListener('click',closeMenu,{once:true}),0); }
  function closeMenu(){ const m=document.getElementById('ntMenu'); if(m) m.remove(); }
  function ntoast(t){ let el=document.getElementById('ntMsg'); if(!el){ el=document.createElement('div'); el.id='ntMsg'; el.className='nt-msg'; document.body.appendChild(el); } el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2600); }
  function wireRows(root,redraw){ root.querySelectorAll('[data-ngo]').forEach(a=>a.addEventListener('click',()=>markRead(a.dataset.ngo,true)));
    root.querySelectorAll('[data-nread]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const n=items().find(x=>x.id===b.dataset.nread); markRead(n.id,!n.read); redraw(); });
    root.querySelectorAll('[data-nmenu]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); const n=items().find(x=>x.id===b.dataset.nmenu); openMenu(b,n,redraw); }); }

  /* ---------- header bell ---------- */
  let bell=null, panel=null, pTab='all';
  function paintBell(){ if(!bell) return; const n=unread(); let b=bell.querySelector('.nt-badge'); if(!b){ b=document.createElement('b'); b.className='nt-badge'; bell.appendChild(b); } b.textContent=n>99?'99+':n; b.hidden=!n; bell.setAttribute('aria-label','Notifications'+(n?', '+n+' unread':'')); }
  function drawPanel(){ if(!panel) return; const all=visible().slice().sort((a,b)=>new Date(b.at)-new Date(a.at)), list=pTab==='unread'?all.filter(n=>!n.read):all;
    const page='Merchsmith Notifications.html'+qs();
    panel.innerHTML=`<div class="nt-ph"><b>Notifications</b><button class="nt-link" data-nall${unread()?'':' disabled'}>Mark all as read</button></div>
      <div class="nt-tabs"><button class="${pTab==='all'?'on':''}" data-ptab="all">All</button><button class="${pTab==='unread'?'on':''}" data-ptab="unread">Unread${unread()?' · '+unread():''}</button></div>
      <div class="nt-plist">${list.length?grouped(list).slice(0,12).map(n=>rowHTML(n,true)).join(''):`<div class="nt-empty">${pTab==='unread'?'You’re all caught up.':'No notifications yet.'}</div>`}</div>
      <div class="nt-pf"><a href="${page}">View all</a><a href="${page}#tab=settings">Settings</a></div>`;
    panel.querySelectorAll('[data-ptab]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); pTab=b.dataset.ptab; drawPanel(); });
    panel.querySelector('[data-nall]').onclick=e=>{ e.stopPropagation(); allRead(); drawPanel(); paintBell(); };
    wireRows(panel,()=>{ drawPanel(); paintBell(); }); }
  function togglePanel(){ if(panel){ panel.remove(); panel=null; return; } panel=document.createElement('div'); panel.className='nt-panel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Notifications');
    document.body.appendChild(panel); const r=bell.getBoundingClientRect(); panel.style.top=(r.bottom+10)+'px'; panel.style.right=Math.max(8,innerWidth-r.right-12)+'px'; drawPanel();
    panel.addEventListener('click',e=>e.stopPropagation()); setTimeout(()=>document.addEventListener('click',outside),0); }
  function outside(e){ if(panel&&!panel.contains(e.target)&&!(bell&&bell.contains(e.target))&&!e.target.closest('#ntMenu')){ panel.remove(); panel=null; document.removeEventListener('click',outside); } else if(panel) setTimeout(()=>document.addEventListener('click',outside,{once:true}),0); }
  function hook(n){ const b=document.querySelector('.ms-htools [title="Notifications"]'); if(!b){ if(n<60) setTimeout(()=>hook(n+1),120); return; }
    bell=b; bell.classList.add('nt-bell'); bell.setAttribute('role','button'); bell.tabIndex=0; bell.onclick=e=>{ e.stopPropagation(); togglePanel(); }; bell.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); togglePanel(); } };
    paintBell();
    // the account menu's "Notifications" item goes to the page
    document.querySelectorAll('.ms-acctmenu a.am-i').forEach(a=>{ if(a.textContent.trim()==='Notifications') a.href='Merchsmith Notifications.html'+qs(); }); }
  window.addEventListener('ms-notif-change',()=>{ paintBell(); if(panel) drawPanel(); });
  window.addEventListener('storage',e=>{ if(e.key===KEY){ paintBell(); if(panel) drawPanel(); } });
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>hook(0)):hook(0);
  // header logo → that organisation's dashboard (every page)
  const LOGO='.header [data-identity-lockup],.header .brand,.header .adm-brand';
  const dash=()=>role()==='admin'?'Merchsmith Admin.html#nav=overview':'Merchsmith Home.html';
  document.addEventListener('click',e=>{ const l=e.target.closest(LOGO); if(!l||e.target.closest('.nt-abar')) return; e.preventDefault(); e.stopPropagation();
    if(role()==='admin'&&/Admin\.html/i.test(location.pathname)){ const b=document.querySelector('.anav[data-nav="overview"]'); if(b){ b.click(); window.scrollTo({top:0,behavior:'smooth'}); return; } }
    location.href=dash(); },true);
  (function tag(n){ const l=document.querySelector(LOGO); if(!l){ if(n<40) setTimeout(()=>tag(n+1),150); return; } l.style.cursor='pointer'; l.title='Go to your dashboard'; l.setAttribute('role','link'); l.tabIndex=0;
    l.addEventListener('keydown',e=>{ if(e.key==='Enter') l.click(); }); })(0);
  // announcements published since this browser last looked arrive as notifications
  function pullAnn(){ const r=role(); if(r==='admin') return; const o=db(); const seen=(o.prefs[r]||{}).annSeen||[];
    o.ann.filter(a=>a.aud.includes(r)&&!seen.includes(a.id)).forEach(a=>{ push(r,{ev:'announce',title:a.title,body:a.body,href:'Merchsmith Notifications.html#tab=inbox',ann:a.id,imp:a.level==='important'}); upd(x=>{ x.prefs[r]=Object.assign(x.prefs[r]||{},{annSeen:[...((x.prefs[r]||{}).annSeen||[]),a.id]}); }); }); }
  setTimeout(pullAnn,800);

  /* ---------- announcement bar (above the header, every page) ---------- */
  const BARBG=[['var(--periwinkle-deep)','Brand'],['#222222','Ink'],['#FF2E17','Flare'],['#0097D8','Sky'],['#36C0A0','Spearmint'],['#FFEB3D','Zest'],['#FFA2A5','Blossom']];
  const lum=c=>{ const m=String(c).match(/^#?([\da-f]{6})$/i); if(!m) return 0.2; const n=parseInt(m[1],16), f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(n>>16)+.7152*f(n>>8&255)+.0722*f(n&255); };
  const barInk=b=>b.fg||(lum(b.bg)>.45?'#222222':'#ffffff');
  const barState=b=>{ const n=Date.now(); if(b.draft) return 'draft'; if(b.from&&new Date(b.from)>n) return 'scheduled'; if(b.to&&new Date(b.to)<=n) return 'ended'; return 'live'; };
  function cleanBar(html){ const d=document.createElement('div'); d.innerHTML=html; d.querySelectorAll('*').forEach(n=>{ if(!/^(A|B|STRONG|BR)$/.test(n.tagName)){ n.replaceWith(document.createTextNode(n.textContent)); return; }
      [...n.attributes].forEach(a=>{ if(!(n.tagName==='A'&&a.name==='href'&&/^(https?:|mailto:|Merchsmith )/i.test(a.value))) n.removeAttribute(a.name); }); }); return d.innerHTML.replace(/<br>$/,''); }
  function barHTML(b,preview){ const ink=barInk(b); return `<div class="nt-abar${preview?' pv':''}" data-bar="${esc(b.id)}" style="background:${b.bg};color:${ink};--abar-ink:${ink}" role="region" aria-label="Announcement">
      <span class="nt-abar-tx">${cleanBar(b.html||'')}</span>${b.dismiss?`<button class="nt-abar-x" data-barx="${esc(b.id)}" aria-label="Dismiss announcement">×</button>`:''}</div>`; }
  function showBar(){ const r=role(), o=db(), gone=JSON.parse(localStorage.getItem('ms-bar-dismissed')||'[]');
    // distributor bars never reach Platform Admin
    const pick=own=>o.bars.filter(x=>(x.owner||'merchsmith')===own&&barState(x)==='live'&&x.aud.includes(r)&&!(x.dismiss&&gone.includes(x.id))).sort((a,c)=>new Date(c.from||c.created)-new Date(a.from||a.created))[0];
    const want=[pick('merchsmith'),r==='admin'?null:pick('mojo')].filter(Boolean), sig=want.map(b=>b.id+':'+(b.v||0)).join('|');
    const cur=[...document.querySelectorAll('.nt-abar:not(.pv)')]; if(cur.map(e=>e.dataset.bar+':'+e.dataset.v).join('|')===sig) return; cur.forEach(e=>e.remove());
    want.slice().reverse().forEach(b=>{ const w=document.createElement('div'); w.innerHTML=barHTML(b); const el=w.firstElementChild; el.dataset.v=b.v||0; document.body.prepend(el);
      const x=el.querySelector('[data-barx]'); if(x) x.onclick=()=>{ const g=JSON.parse(localStorage.getItem('ms-bar-dismissed')||'[]'); g.push(b.id); localStorage.setItem('ms-bar-dismissed',JSON.stringify(g)); el.remove(); }; }); }
  const barTick=()=>{ if(document.body) showBar(); };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',barTick):barTick();
  setInterval(barTick,30000); window.addEventListener('ms-notif-change',barTick); window.addEventListener('storage',e=>{ if(e.key===KEY) barTick(); });

  /* ---------- Notifications page ---------- */
  function mount(root){ const S={tab:(location.hash.match(/tab=(\w+)/)||[])[1]||'inbox',f:'all',cat:'',q:''}, isA=role()==='admin';
    const isD=role()==='distributor';
    const TABS=[['inbox','Inbox'],['settings','Settings'],...(isA?[['announce','Announcements & bar']]:isD?[['bar','Announcement bar']]:[])];
    function draw(){ root.innerHTML=`<div class="nt-ptabs">${TABS.map(([k,l])=>`<button class="${S.tab===k?'on':''}" data-ntab="${k}">${l}${k==='inbox'&&unread()?` <b>${unread()}</b>`:''}</button>`).join('')}</div><div data-nbody></div>`;
      root.querySelectorAll('[data-ntab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.ntab; history.replaceState(null,'','#tab='+S.tab); draw(); });
      const body=root.querySelector('[data-nbody]'); ({inbox:drawInbox,settings:drawSettings,announce:drawAnn,bar:b=>drawBars(b)})[S.tab](body); }
    function drawInbox(body){ const all=items().filter(n=>cell(n.ev,'app')&&!muted(n)).slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
      let L=S.f==='snoozed'?all.filter(n=>n.snoozeUntil):all.filter(n=>!n.snoozeUntil); if(S.f==='unread') L=L.filter(n=>!n.read); if(S.f==='mentions') L=L.filter(n=>n.ev==='mention');
      if(S.cat) L=L.filter(n=>evt(n.ev).cat===S.cat); if(S.q){ const s=S.q.toLowerCase(); L=L.filter(n=>(n.title+' '+n.body+' '+(n.ctxLabel||'')).toLowerCase().includes(s)); }
      const cats=[...new Set(all.map(n=>evt(n.ev).cat))], day=d=>{ const x=new Date(d), t=new Date(); if(x.toDateString()===t.toDateString()) return 'Today'; t.setDate(t.getDate()-1); if(x.toDateString()===t.toDateString()) return 'Yesterday'; return x.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}); };
      const groups=[]; grouped(L).forEach(n=>{ const k=day(n.at); let g=groups.find(x=>x[0]===k); if(!g) groups.push(g=[k,[]]); g[1].push(n); });
      body.innerHTML=`<div class="nt-bar"><div class="nt-seg">${[['all','All'],['unread','Unread'],['mentions','Mentions'],['snoozed','Snoozed']].map(([k,l])=>`<button class="${S.f===k?'on':''}" data-nf="${k}">${l}</button>`).join('')}</div>
          <input class="nt-search" data-nq value="${esc(S.q)}" placeholder="Search notifications"><button class="pp-btn ghost sm" data-nallp${unread()?'':' disabled'}>Mark all as read</button><button class="pp-btn ghost sm" data-nsim>Simulate a notification</button></div>
        <div class="nt-chips"><button class="${S.cat?'':'on'}" data-nc="">All types</button>${cats.map(c=>`<button class="${S.cat===c?'on':''}" data-nc="${c}">${ic(c,14)}${esc(CATS[c])}</button>`).join('')}</div>
        <div class="nt-box">${groups.length?groups.map(([k,ns])=>`<h4>${k}</h4>${ns.map(n=>rowHTML(n,true)).join('')}`).join(''):`<div class="nt-empty">${S.f==='unread'?'You’re all caught up.':S.f==='snoozed'?'Nothing snoozed.':'No notifications match.'}</div>`}</div>`;
      body.querySelectorAll('[data-nf]').forEach(b=>b.onclick=()=>{ S.f=b.dataset.nf; draw(); });
      body.querySelectorAll('[data-nc]').forEach(b=>b.onclick=()=>{ S.cat=b.dataset.nc; draw(); });
      const qi=body.querySelector('[data-nq]'); qi.oninput=()=>{ S.q=qi.value; const p=qi.selectionStart; draw(); const n=root.querySelector('[data-nq]'); n.focus(); n.setSelectionRange(p,p); };
      body.querySelector('[data-nallp]').onclick=()=>{ allRead(); draw(); };
      body.querySelector('[data-nsim]').onclick=()=>{ const r=role(), pool=seed(r).filter(n=>evt(n.ev).imp); const n=pool[Math.floor(Math.random()*pool.length)]||seed(r)[0]; const x=Object.assign({},n); delete x.id; delete x.at; x.read=false; delete x.group; push(r,x); draw(); };
      wireRows(body,draw); }
    function drawSettings(body){ const p=prefs(), r=role(), ev=EVT.filter(e=>e.r.includes(r)), cats=[...new Set(ev.map(e=>e.cat))];
      body.innerHTML=`<div class="nt-set"><div class="nt-panel2"><h3>What you’re told about</h3><p class="nt-sm">In-app shows it under the bell. Pop-up also shows it on screen as it happens. Email sends it to your inbox, using your email preferences.</p>
          <div class="nt-grid"><div class="nt-gh"><span></span><span>In-app</span><span>Pop-up</span><span>Email</span></div>
          ${cats.map(c=>`<div class="nt-gc">${ic(c,15)} ${esc(CATS[c])}</div>${ev.filter(e=>e.cat===c).map(e=>`<div class="nt-gr"><span>${esc(e.label)}</span>${['app','pop','email'].map(ch=>`<label><input type="checkbox" data-ng="${e.id}:${ch}"${cell(e.id,ch)?' checked':''}${ch!=='app'&&!cell(e.id,'app')?' disabled':''} aria-label="${esc(e.label)} ${ch}"></label>`).join('')}</div>`).join('')}`).join('')}</div></div>
        <div class="nt-side"><div class="nt-panel2"><div class="nt-sh"><h3>Quiet hours</h3><button class="nt-sw${p.quiet.on?' on':''}" data-nqon aria-label="Quiet hours on or off"></button></div><p class="nt-sm">No pop-ups during these hours. Notifications still collect under the bell.</p>
            <div class="nt-row2"><label>From <input type="time" data-nqf="from" value="${p.quiet.from}"${p.quiet.on?'':' disabled'}></label><label>To <input type="time" data-nqf="to" value="${p.quiet.to}"${p.quiet.on?'':' disabled'}></label></div>
            <label class="nt-chk"><input type="checkbox" data-nqw${p.quiet.weekends?' checked':''}${p.quiet.on?'':' disabled'}> All weekend</label>${p.quiet.on&&quietNow()?'<p class="nt-sm nt-now">Quiet hours are on now.</p>':''}</div>
          <div class="nt-panel2"><div class="nt-sh"><h3>Daily digest</h3><button class="nt-sw${p.digest.on?' on':''}" data-ndon aria-label="Daily digest on or off"></button></div><p class="nt-sm">One email a day with everything you haven’t read, instead of an email for each.</p>
            <div class="nt-row2"><label>Send at <input type="time" data-ndt value="${p.digest.time}"${p.digest.on?'':' disabled'}></label></div>${p.digest.on?`<p class="nt-sm">Next digest: tomorrow at ${p.digest.time}.</p>`:''}</div>
          <div class="nt-panel2"><h3>Muted</h3>${p.muted.length?p.muted.map(m=>`<div class="nt-mut"><span>${esc(m.label)}</span><button class="nt-link" data-nun="${esc(m.key)}">Unmute</button></div>`).join(''):'<p class="nt-sm">Nothing muted. Use ⋯ on a notification to mute a project or conversation.</p>'}</div></div></div>`;
      body.querySelectorAll('[data-ng]').forEach(c=>c.onchange=()=>{ const [e,ch]=c.dataset.ng.split(':'), g=Object.assign({},prefs().grid); g[e]=Object.assign({app:cell(e,'app'),pop:cell(e,'pop'),email:cell(e,'email')},g[e],{[ch]:c.checked}); if(ch==='app'&&!c.checked){ g[e].pop=false; } setPrefs({grid:g}); ntoast('Saved'); drawSettings(body); });
      body.querySelector('[data-nqon]').onclick=()=>{ setPrefs({quiet:Object.assign(prefs().quiet,{on:!prefs().quiet.on})}); drawSettings(body); };
      body.querySelectorAll('[data-nqf]').forEach(i=>i.onchange=()=>{ setPrefs({quiet:Object.assign(prefs().quiet,{[i.dataset.nqf]:i.value})}); ntoast('Saved'); drawSettings(body); });
      body.querySelector('[data-nqw]').onchange=e=>{ setPrefs({quiet:Object.assign(prefs().quiet,{weekends:e.target.checked})}); ntoast('Saved'); };
      body.querySelector('[data-ndon]').onclick=()=>{ setPrefs({digest:Object.assign(prefs().digest,{on:!prefs().digest.on})}); drawSettings(body); };
      body.querySelector('[data-ndt]').onchange=e=>{ setPrefs({digest:Object.assign(prefs().digest,{time:e.target.value})}); ntoast('Saved'); drawSettings(body); };
      body.querySelectorAll('[data-nun]').forEach(b=>b.onclick=()=>{ setPrefs({muted:prefs().muted.filter(m=>m.key!==b.dataset.nun)}); ntoast('Unmuted'); drawSettings(body); }); }
    function drawAnn(body){ body.innerHTML='<div data-barsec></div><h3 class="nt-h3">Bell announcements</h3><div data-bellsec></div>'; drawBars(body.querySelector('[data-barsec]')); drawBell(body.querySelector('[data-bellsec]')); }
    function drawBell(body){ const A=db().ann.slice().sort((a,b)=>new Date(b.at)-new Date(a.at)), AUD=[['distributor','Distributors'],['customer','Customers'],['supplier','Suppliers']];
      body.innerHTML=`<div class="nt-set"><div class="nt-panel2"><h3>New announcement</h3><p class="nt-sm">Shown under everyone’s bell and, if marked important, as a pop-up. Emailed to people who have announcement emails on.</p>
          <label class="nt-f"><span>Title</span><input data-at maxlength="90" placeholder="e.g. Scheduled maintenance on Sunday"></label>
          <label class="nt-f"><span>Message</span><textarea data-ab rows="4" maxlength="400" placeholder="What’s happening and what people need to do"></textarea></label>
          <div class="nt-f"><span>Send to</span><div class="nt-chkrow">${AUD.map(([k,l])=>`<label class="nt-chk"><input type="checkbox" data-aa="${k}" checked> ${l}</label>`).join('')}</div></div>
          <div class="nt-f"><span>Priority</span><div class="nt-seg" data-alv><button class="on" data-lv="info">Normal</button><button data-lv="important">Important</button></div></div>
          <p class="nt-err" data-aerr hidden></p><div class="nt-row2"><button class="pp-btn" data-asend>Publish announcement</button></div></div>
        <div class="nt-panel2"><h3>Sent</h3>${A.length?A.map(a=>`<div class="nt-ann"><div><b>${esc(a.title)}</b>${a.level==='important'?'<span class="nt-imp">Important</span>':''}</div><p>${esc(a.body)}</p><em>${new Date(a.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · to ${a.aud.map(x=>AUD.find(y=>y[0]===x)[1]).join(', ')}</em></div>`).join(''):'<p class="nt-sm">No announcements yet.</p>'}</div></div>`;
      let lv='info'; body.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{ lv=b.dataset.lv; body.querySelectorAll('[data-lv]').forEach(x=>x.classList.toggle('on',x===b)); });
      body.querySelector('[data-asend]').onclick=()=>{ const t=body.querySelector('[data-at]').value.trim(), m=body.querySelector('[data-ab]').value.trim(), aud=[...body.querySelectorAll('[data-aa]:checked')].map(c=>c.dataset.aa), err=body.querySelector('[data-aerr]');
        if(!t||!m){ err.textContent='Add a title and a message.'; err.hidden=false; return; } if(!aud.length){ err.textContent='Choose who to send it to.'; err.hidden=false; return; }
        if(!confirm('Publish to every '+aud.join(', ')+' on the platform?')) return;
        upd(o=>{ o.ann.push({id:'a'+Date.now().toString(36),title:t,body:m,aud,level:lv,at:new Date().toISOString(),by:'Merchsmith'}); }); ntoast('Announcement published'); drawBell(body); }; }
    function drawBars(body,editId){ const OWN=isA?'merchsmith':'mojo', L=db().bars.filter(x=>(x.owner||'merchsmith')===OWN).sort((a,b)=>new Date(b.created)-new Date(a.created)),
        AUD=isA?[['distributor','Distributors'],['customer','Customers'],['supplier','Suppliers'],['admin','Platform Admin']]:[['distributor','Your team'],['customer','Your customers'],['supplier','Your suppliers']];
      const ed=editId?L.find(b=>b.id===editId):null, b=Object.assign({html:'',bg:'var(--periwinkle-deep)',fg:'',aud:['distributor','customer','supplier'],dismiss:true,when:'now',from:'',to:'',end:'none'},ed||{}); if(ed){ b.when=ed.draft?'draft':(ed.from&&new Date(ed.from)>new Date()?'later':'now'); b.end=ed.to?'at':'none'; }
      const loc=d=>{ if(!d) return ''; const x=new Date(d); return new Date(x-x.getTimezoneOffset()*6e4).toISOString().slice(0,16); };
      const SL={live:'Live',scheduled:'Scheduled',ended:'Ended',draft:'Draft'};
      const fmt=d=>new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      body.innerHTML=`<div class="nt-set"><div class="nt-panel2"><h3>${ed?'Edit announcement bar':'Announcement bar'}</h3><p class="nt-sm">${isA?'A strip across the very top of every page, above the header. One bar shows at a time; if several are live, the newest wins.':'A strip across the top of every page for your team, your customers and your suppliers, including your store. It sits under any Merchsmith announcement. If several of yours are live, the newest wins.'}</p>
          <div class="nt-f"><span>Message</span><div class="nt-btb"><button type="button" data-bcmd="bold"><b>B</b></button><button type="button" data-bcmd="link">Add link</button><button type="button" data-bcmd="unlink">Remove link</button></div>
            <div class="nt-lnk" data-blnk hidden><input data-blurl placeholder="https://… or a platform page, e.g. Merchsmith Orders.html"><button type="button" class="pp-btn sm" data-blok>Add link</button><button type="button" class="nt-link" data-blno>Cancel</button></div>
            <div class="nt-bed" contenteditable="true" data-bed>${cleanBar(b.html)}</div><em class="nt-sm" style="margin:0">Select text and click Add link. Links can go to a page on the platform or any web address.</em></div>
          <div class="nt-f"><span>Background</span><div class="nt-sws">${BARBG.map(([c,l])=>`<button type="button" class="nt-swc${b.bg===c?' on':''}" data-bbg="${c}" style="background:${c}" title="${l}" aria-label="${l}"></button>`).join('')}<label class="nt-swc cust${BARBG.some(x=>x[0]===b.bg)?'':' on'}" title="Custom colour"><input type="color" data-bbgc value="${/^#/.test(b.bg)?b.bg:'#5860A6'}"><span>Custom</span></label></div></div>
          <div class="nt-f"><span>Text colour</span><div class="nt-seg">${[['','Automatic'],['#ffffff','White'],['#222222','Black']].map(([v,l])=>`<button type="button" data-bfg="${v}" class="${(b.fg||'')===v?'on':''}">${l}</button>`).join('')}</div></div>
          <div class="nt-f"><span>Preview</span><div data-bpv></div></div>
          <div class="nt-f"><span>Show to</span><div class="nt-chkrow">${AUD.map(([k2,l])=>`<label class="nt-chk"><input type="checkbox" data-baud="${k2}"${b.aud.includes(k2)?' checked':''}> ${l}</label>`).join('')}</div></div>
          <label class="nt-chk" style="margin:0 0 12px"><input type="checkbox" data-bdis${b.dismiss?' checked':''}> People can close it (it stays closed for them)</label>
          <div class="nt-f"><span>Goes live</span><div class="nt-seg">${[['now','Straight away'],['later','Schedule'],['draft','Save as draft']].map(([v,l])=>`<button type="button" data-bwhen="${v}" class="${b.when===v?'on':''}">${l}</button>`).join('')}</div><input type="datetime-local" data-bfrom value="${loc(b.from)}"${b.when==='later'?'':' hidden'}></div>
          <div class="nt-f"><span>Ends</span><div class="nt-seg">${[['none','When I turn it off'],['at','At a set time']].map(([v,l])=>`<button type="button" data-bend="${v}" class="${b.end===v?'on':''}">${l}</button>`).join('')}</div><input type="datetime-local" data-bto value="${loc(b.to)}"${b.end==='at'?'':' hidden'}></div>
          <p class="nt-err" data-berr hidden></p>
          <div class="nt-row2"><button class="pp-btn" data-bsave>${ed?'Save changes':'Publish bar'}</button>${ed?'<button class="pp-btn ghost" data-bcancel>Cancel</button>':''}</div></div>
        <div class="nt-panel2"><h3>Bars</h3>${L.length?L.map(x=>{ const s=barState(x); return `<div class="nt-bitem"><div class="nt-bmini" style="background:${x.bg};color:${barInk(x)}">${cleanBar(x.html)}</div>
            <div class="nt-bmeta"><span class="nt-bst s-${s}">${SL[s]}</span><span>${s==='scheduled'?'Starts '+fmt(x.from):x.from?'From '+fmt(x.from):'From '+fmt(x.created)}${x.to?' · ends '+fmt(x.to):''} · ${x.aud.map(a=>AUD.find(y=>y[0]===a)[1]).join(', ')}</span></div>
            <div class="nt-row2"><button class="nt-link" data-bedit="${esc(x.id)}">Edit</button>${s==='live'||s==='scheduled'?`<button class="nt-link" data-bstop="${esc(x.id)}">${s==='live'?'Turn off now':'Cancel schedule'}</button>`:`<button class="nt-link" data-bgo="${esc(x.id)}">Go live now</button>`}<button class="nt-link nt-del" data-bdel="${esc(x.id)}">Delete</button></div></div>`; }).join(''):'<p class="nt-sm">No bars yet.</p>'}</div></div>`;
      const g=s=>body.querySelector(s), bed=g('[data-bed]');
      const cur=()=>({html:cleanBar(bed.innerHTML),bg:b.bg,fg:b.fg}); const pv=()=>{ g('[data-bpv]').innerHTML=barHTML(Object.assign({id:'pv'},b,cur()),true); }; pv();
      bed.oninput=pv;
      // links: remember the selection, ask for the address inline (browser prompts are blocked in some previews)
      let range=null; const lnk=g('[data-blnk]'), lu=g('[data-blurl]');
      body.querySelectorAll('[data-bcmd]').forEach(x=>x.onmousedown=e=>{ e.preventDefault(); const c=x.dataset.bcmd, sel=getSelection();
        if(c==='link'){ if(!sel.rangeCount||sel.isCollapsed||!bed.contains(sel.anchorNode)) return ntoast('Select the words you want to link first'); range=sel.getRangeAt(0).cloneRange(); lnk.hidden=false; lu.value='https://'; setTimeout(()=>{ lu.focus(); lu.select(); },0); return; }
        document.execCommand(c); bed.focus(); pv(); });
      const applyLink=()=>{ let u=lu.value.trim(); if(!u||u==='https://') return ntoast('Enter a link address');
        if(!/^(https?:|mailto:|Merchsmith )/i.test(u)) u=/\.html/i.test(u)?u:'https://'+u.replace(/^\/+/,'');
        bed.focus(); const sel=getSelection(); sel.removeAllRanges(); if(range) sel.addRange(range); document.execCommand('createLink',false,u); range=null; lnk.hidden=true; pv(); };
      g('[data-blok]').onclick=applyLink; lu.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); applyLink(); } if(e.key==='Escape'){ lnk.hidden=true; range=null; } };
      g('[data-blno]').onclick=()=>{ lnk.hidden=true; range=null; };
      body.querySelectorAll('[data-bbg]').forEach(x=>x.onclick=()=>{ b.bg=x.dataset.bbg; body.querySelectorAll('.nt-swc').forEach(y=>y.classList.toggle('on',y===x)); pv(); });
      g('[data-bbgc]').oninput=e=>{ b.bg=e.target.value; body.querySelectorAll('.nt-swc').forEach(y=>y.classList.toggle('on',y.classList.contains('cust'))); pv(); };
      body.querySelectorAll('[data-bfg]').forEach(x=>x.onclick=()=>{ b.fg=x.dataset.bfg; body.querySelectorAll('[data-bfg]').forEach(y=>y.classList.toggle('on',y===x)); pv(); });
      body.querySelectorAll('[data-bwhen]').forEach(x=>x.onclick=()=>{ b.when=x.dataset.bwhen; body.querySelectorAll('[data-bwhen]').forEach(y=>y.classList.toggle('on',y===x)); const f=g('[data-bfrom]'); f.hidden=b.when!=='later'; if(!f.value){ const t=new Date(Date.now()+864e5); t.setHours(9,0,0,0); f.value=loc(t); } g('[data-bsave]').textContent=ed?'Save changes':b.when==='later'?'Schedule bar':b.when==='draft'?'Save draft':'Publish bar'; });
      body.querySelectorAll('[data-bend]').forEach(x=>x.onclick=()=>{ b.end=x.dataset.bend; body.querySelectorAll('[data-bend]').forEach(y=>y.classList.toggle('on',y===x)); const t=g('[data-bto]'); t.hidden=b.end!=='at'; if(!t.value){ const d=new Date(Date.now()+7*864e5); d.setHours(17,0,0,0); t.value=loc(d); } });
      g('[data-bsave]').onclick=()=>{ const err=g('[data-berr]'), fail=t=>{ err.textContent=t; err.hidden=false; }; const c=cur(), aud=[...body.querySelectorAll('[data-baud]:checked')].map(x=>x.dataset.baud);
        if(!bed.textContent.trim()) return fail('Write the message for the bar.'); if(bed.textContent.length>220) return fail('Keep it under 220 characters so it fits on one line on most screens.'); if(!aud.length) return fail('Choose who sees it.');
        let from=b.when==='later'?new Date(g('[data-bfrom]').value):null, to=b.end==='at'?new Date(g('[data-bto]').value):null;
        if(b.when==='later'&&(!from||isNaN(from)||from<=new Date())) return fail('Pick a start time in the future.'); if(to&&(isNaN(to)||to<=(from||new Date()))) return fail('The end time must be after it goes live.');
        const rec={html:c.html,bg:b.bg,fg:b.fg,aud,dismiss:g('[data-bdis]').checked,from:from?from.toISOString():(ed&&!ed.draft&&b.when==='now'?ed.from||'':''),to:to?to.toISOString():'',draft:b.when==='draft',v:((ed&&ed.v)||0)+1};
        upd(o=>{ if(ed) Object.assign(o.bars.find(x=>x.id===ed.id),rec); else o.bars.push(Object.assign({id:'b'+Date.now().toString(36),created:new Date().toISOString(),owner:OWN},rec)); });
        ntoast(rec.draft?'Draft saved':from?'Scheduled for '+fmt(from):'Bar is live'); drawBars(body); showBar(); };
      const cc=g('[data-bcancel]'); if(cc) cc.onclick=()=>drawBars(body);
      body.querySelectorAll('[data-bedit]').forEach(x=>x.onclick=()=>{ drawBars(body,x.dataset.bedit); window.scrollTo({top:0,behavior:'smooth'}); });
      body.querySelectorAll('[data-bstop]').forEach(x=>x.onclick=()=>{ upd(o=>{ const y=o.bars.find(z=>z.id===x.dataset.bstop); if(barState(y)==='scheduled') y.draft=true; else y.to=new Date().toISOString(); y.v=(y.v||0)+1; }); ntoast('Turned off'); drawBars(body); showBar(); });
      body.querySelectorAll('[data-bgo]').forEach(x=>x.onclick=()=>{ upd(o=>{ const y=o.bars.find(z=>z.id===x.dataset.bgo); y.draft=false; y.from=new Date().toISOString(); if(y.to&&new Date(y.to)<=new Date()) y.to=''; y.v=(y.v||0)+1; }); ntoast('Bar is live'); drawBars(body); showBar(); });
      body.querySelectorAll('[data-bdel]').forEach(x=>x.onclick=()=>{ if(!confirm('Delete this bar?')) return; upd(o=>{ o.bars=o.bars.filter(z=>z.id!==x.dataset.bdel); }); drawBars(body); showBar(); }); }
    draw(); window.addEventListener('ms-notif-change',()=>{ if(S.tab==='inbox'&&!document.activeElement.matches('input,textarea')) draw(); });
    window.addEventListener('hashchange',()=>{ const t=(location.hash.match(/tab=(\w+)/)||[])[1]; if(t&&t!==S.tab&&TABS.some(x=>x[0]===t)){ S.tab=t; draw(); } }); }

  const css=`
  .nt-bell{position:relative;cursor:pointer;display:inline-grid;place-items:center;border-radius:50%;transition:background .18s,color .18s;}
  /* header rollovers (every page): bell swings, avatar lifts with a ring */
  .ms-htools .nt-bell::before{content:"";position:absolute;inset:-8px;border-radius:50%;background:currentColor;opacity:0;transform:scale(.6);transition:opacity .2s,transform .2s;pointer-events:none;}
  .ms-htools .nt-bell:hover::before,.ms-htools .nt-bell:focus-visible::before{opacity:.14;transform:scale(1);}
  .ms-htools .nt-bell:hover>svg,.ms-htools .nt-bell:focus-visible>svg{animation:ntRing .7s ease-in-out;transform-origin:50% 12%;}
  .ms-htools .nt-bell:hover .nt-badge{animation:ntPop .35s ease-out;}
  .ms-htools .ava>img,.ms-htools .ava>span:first-child{transition:box-shadow .2s ease,filter .2s ease;}
  .ms-htools .ava:hover>img,.ms-htools .ava:focus-visible>img,.ms-acct.open .ava>img,.ms-htools .ava:hover>span:first-child,.ms-acct.open .ava>span:first-child{box-shadow:0 0 0 2.5px #fff!important;filter:brightness(1.06);}
  @keyframes ntRing{0%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(10deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(3deg)}100%{transform:rotate(0)}}
  @keyframes ntPop{0%{transform:scale(1)}50%{transform:scale(1.25)}100%{transform:scale(1)}}
  @media (prefers-reduced-motion:reduce){.ms-htools .nt-bell:hover>svg,.ms-htools .nt-bell:hover .nt-badge{animation:none;}} .nt-badge{position:absolute;top:-7px;right:-9px;background:var(--flare);color:#fff;font-size:10px;font-weight:800;border-radius:999px;min-width:17px;height:17px;display:grid;place-items:center;padding:0 4px;border:2px solid var(--periwinkle-deep,#fff);font-style:normal;} .nt-badge[hidden]{display:none;}
  .nt-panel{position:fixed;z-index:1500;width:min(420px,calc(100vw - 16px));max-height:min(620px,calc(100vh - 90px));display:flex;flex-direction:column;background:#fff;border:1px solid var(--line-soft);border-radius:16px;box-shadow:0 20px 60px rgba(20,22,45,.22);color:var(--ink);font-family:var(--sans);overflow:hidden;}
  .nt-ph{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 6px;} .nt-ph b{font-family:var(--serif);font-weight:500;font-size:21px;}
  .nt-link{white-space:nowrap;border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;} .nt-link:disabled{color:var(--muted);cursor:default;}
  .nt-tabs{display:flex;gap:4px;padding:0 12px 8px;border-bottom:1px solid var(--line-soft);} .nt-tabs button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:none;color:var(--ink-3);padding:6px 10px;border-radius:999px;cursor:pointer;} .nt-tabs button.on{background:var(--tint-peri);color:var(--periwinkle-deep);}
  .nt-plist{overflow:auto;flex:1;}
  .nt-row{position:relative;display:flex;align-items:flex-start;border-top:1px solid var(--paper-2);} .nt-row:first-child{border-top:0;} .nt-row:hover{background:var(--paper);} .nt-row.unread{background:color-mix(in srgb,var(--tint-peri) 55%,#fff);} .nt-row.unread:hover{background:var(--tint-peri);}
  .nt-main{flex:1;min-width:0;display:flex;gap:11px;padding:12px 8px 12px 14px;text-decoration:none;color:inherit;}
  .nt-ic{position:relative;width:34px;height:34px;border-radius:10px;flex:none;display:grid;place-items:center;background:var(--paper-2);color:var(--ink-3);}
  .c-projects .nt-ic{background:var(--tint-peri);color:var(--periwinkle-deep);} .c-orders .nt-ic{background:color-mix(in srgb,var(--sky) 16%,#fff);color:#0a6e9e;} .c-invoices .nt-ic{background:#fbeccd;color:#9a6b1f;} .c-chat .nt-ic{background:color-mix(in srgb,var(--spearmint) 20%,#fff);color:#1d7c66;}
  .c-meetings .nt-ic{background:color-mix(in srgb,var(--blossom) 32%,#fff);color:#b0474c;} .c-emails .nt-ic{background:#e8f0fe;color:#1a56c4;} .c-suppliers .nt-ic{background:#efe7f6;color:#6d3b99;} .c-platform .nt-ic,.c-announce .nt-ic{background:var(--ink);color:#fff;}
  .nt-cnt{position:absolute;right:-5px;bottom:-5px;background:var(--flare);color:#fff;font-size:9.5px;border-radius:999px;min-width:16px;height:16px;display:grid;place-items:center;border:2px solid #fff;}
  .nt-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;} .nt-tx b{font-size:13.5px;line-height:1.3;} .nt-row.unread .nt-tx b{font-weight:800;} .nt-row:not(.unread) .nt-tx b{font-weight:600;}
  .nt-tx i{font-style:normal;font-size:12.5px;color:var(--text-soft);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;} .nt-tx em{font-style:normal;font-size:11.5px;color:var(--muted);}
  .nt-acts{display:flex;align-items:center;gap:2px;padding:12px 10px 0 0;} .nt-acts button{width:28px;height:28px;border-radius:8px;border:0;background:none;cursor:pointer;display:grid;place-items:center;color:var(--ink-3);font-size:16px;} .nt-acts button:hover{background:#fff;}
  .nt-dot{width:9px;height:9px;border-radius:50%;background:var(--periwinkle-deep);} .nt-dot.off{background:none;border:1.5px solid var(--line);}
  .nt-empty{padding:36px 20px;text-align:center;color:var(--muted);font-size:13.5px;}
  .nt-pf{display:flex;justify-content:space-between;padding:11px 16px;border-top:1px solid var(--line-soft);} .nt-pf a{font-size:13px;font-weight:800;color:var(--periwinkle-deep);text-decoration:none;}
  .nt-menu{position:fixed;z-index:1600;min-width:220px;background:#fff;border:1px solid var(--line-soft);border-radius:12px;box-shadow:0 12px 40px rgba(20,22,45,.2);padding:6px;font-family:var(--sans);}
  .nt-menu button{display:block;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;color:var(--ink);padding:8px 10px;border-radius:8px;cursor:pointer;} .nt-menu button:hover{background:var(--paper);}
  .nt-msep{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:6px 10px 2px;border-top:1px solid var(--paper-2);margin-top:4px;} .nt-msep:empty{padding:0;}
  #ntToasts{position:fixed;right:18px;bottom:18px;z-index:1550;display:flex;flex-direction:column;gap:8px;width:min(360px,calc(100vw - 28px));}
  .nt-toast{display:flex;gap:11px;align-items:flex-start;background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:12px 12px 12px 14px;box-shadow:0 14px 40px rgba(20,22,45,.2);text-decoration:none;color:var(--ink);font-family:var(--sans);opacity:0;transform:translateY(10px);transition:opacity .25s,transform .25s;}
  .nt-toast.on{opacity:1;transform:none;} .nt-toast button{border:0;background:none;font-size:18px;color:var(--muted);cursor:pointer;line-height:1;}
  .nt-msg{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(14px);background:var(--ink);color:#fff;font:600 13.5px var(--sans);padding:11px 18px;border-radius:11px;opacity:0;transition:opacity .2s,transform .2s;z-index:1650;pointer-events:none;} .nt-msg.on{opacity:1;transform:translateX(-50%);}
  .nt-ptabs{display:flex;gap:4px;border-bottom:1px solid var(--line-soft);margin:22px 0 16px;overflow-x:auto;scrollbar-width:none;} .nt-ptabs button{flex:none;white-space:nowrap;border:0;background:none;font:inherit;font-size:14.5px;font-weight:700;color:var(--ink-3);padding:11px 16px;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px;display:flex;align-items:center;gap:7px;}
  .nt-ptabs button.on{color:var(--periwinkle-deep);border-bottom-color:var(--periwinkle-deep);} .nt-ptabs b{background:var(--flare);color:#fff;font-size:10.5px;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;}
  .nt-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px;} .nt-search{flex:1;min-width:200px;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;}
  .nt-seg{display:flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;background:#fff;width:max-content;} .nt-seg button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:7px 12px;cursor:pointer;white-space:nowrap;} .nt-seg button+button{border-left:1.5px solid var(--line-soft);} .nt-seg button.on{background:var(--ink);color:#fff;}
  .nt-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;} .nt-chips button{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;color:var(--ink-2);border-radius:999px;padding:5px 12px;cursor:pointer;} .nt-chips button.on{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);background:var(--tint-peri);}
  .nt-box{background:#fff;border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;} .nt-box h4{margin:0;padding:12px 16px 6px;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);border-top:1px solid var(--line-soft);background:#fff;} .nt-box h4:first-child{border-top:0;}
  .nt-set{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px;align-items:start;} @media(max-width:980px){.nt-set{grid-template-columns:1fr;}} .nt-side{display:flex;flex-direction:column;gap:16px;}
  .nt-panel2{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:18px 20px;} .nt-panel2 h3{font-family:var(--serif);font-weight:500;font-size:21px;margin:0 0 4px;} .nt-sm{font-size:12.5px;color:var(--text-soft);line-height:1.5;margin:4px 0 10px;} .nt-now{color:var(--periwinkle-deep);font-weight:700;}
  .nt-grid{display:flex;flex-direction:column;} .nt-gh,.nt-gr{display:grid;grid-template-columns:minmax(0,1fr) 64px 64px 64px;align-items:center;} .nt-gh span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);text-align:center;padding:4px 0;}
  .nt-gc{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800;color:var(--ink-2);padding:14px 0 4px;border-bottom:1px solid var(--line-soft);} .nt-gr{border-bottom:1px solid var(--paper-2);padding:7px 0;font-size:13.5px;} .nt-gr label{display:grid;place-items:center;} .nt-gr input{width:17px;height:17px;accent-color:var(--periwinkle-deep);cursor:pointer;} .nt-gr input:disabled{opacity:.35;cursor:default;}
  .nt-sh{display:flex;align-items:center;justify-content:space-between;} .nt-sw{width:46px;height:27px;border-radius:999px;background:var(--line);border:0;cursor:pointer;position:relative;flex:none;} .nt-sw::after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.25);} .nt-sw.on{background:var(--periwinkle-deep);} .nt-sw.on::after{transform:translateX(19px);}
  .nt-row2{display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:13px;color:var(--ink-2);} .nt-row2 label{display:flex;align-items:center;gap:8px;} .nt-row2 input{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 8px;} .nt-row2 input:disabled{opacity:.5;}
  .nt-chk{display:flex;gap:8px;align-items:center;font-size:13.5px;color:var(--ink-2);margin-top:10px;} .nt-chkrow{display:flex;gap:4px 16px;flex-wrap:wrap;} .nt-chkrow .nt-chk{margin:0;}
  .nt-mut{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--paper-2);font-size:13.5px;}
  .nt-f{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;} .nt-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .nt-f input,.nt-f textarea{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;resize:vertical;}
  .nt-err{color:#b4232c;font-size:13px;font-weight:600;margin:0 0 10px;} .nt-err[hidden]{display:none;}
  .nt-ann{padding:10px 0;border-top:1px solid var(--paper-2);} .nt-ann:first-of-type{border-top:0;} .nt-ann>div{display:flex;align-items:center;gap:8px;} .nt-ann b{font-size:14px;} .nt-ann p{margin:4px 0;font-size:13px;color:var(--ink-2);line-height:1.5;} .nt-ann em{font-style:normal;font-size:12px;color:var(--muted);}
  .nt-abar{position:relative;z-index:60;display:flex;align-items:center;justify-content:center;gap:12px;min-height:40px;padding:9px 48px;font-family:var(--sans);font-size:13.5px;font-weight:600;line-height:1.4;text-align:center;}
  .nt-abar a{color:var(--abar-ink);text-decoration:underline;text-underline-offset:2px;font-weight:800;} .nt-abar b,.nt-abar strong{font-weight:800;}
  .nt-abar-x{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:inherit;font-size:19px;cursor:pointer;opacity:.8;} .nt-abar-x:hover{opacity:1;background:rgba(255,255,255,.18);}
  .nt-abar.pv{border-radius:10px;} .nt-h3{font-family:var(--serif);font-weight:500;font-size:22px;margin:26px 0 12px;}
  .nt-btb{display:flex;gap:4px;}
  .nt-lnk{display:flex;gap:8px;align-items:center;flex-wrap:wrap;} .nt-lnk[hidden]{display:none;} .nt-lnk input{flex:1;min-width:220px;font:inherit;font-size:13.5px;border:1.5px solid var(--periwinkle);border-radius:9px;padding:7px 10px;} .nt-btb button{white-space:nowrap;flex:none;font:inherit;font-size:12.5px;border:1px solid var(--line-soft);background:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;color:var(--ink-2);}
  .nt-bed{min-height:44px;border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 12px;font-size:14px;outline:0;} .nt-bed:focus{border-color:var(--periwinkle);} .nt-bed:empty::before{content:"e.g. New: book meetings from Calendar. See what’s changed";color:var(--muted);} .nt-bed a{color:var(--periwinkle-deep);}
  .nt-sws{display:flex;gap:8px;flex-wrap:wrap;align-items:center;} .nt-swc{width:32px;height:32px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px var(--line-soft);cursor:pointer;padding:0;} .nt-swc.on{box-shadow:0 0 0 2.5px var(--ink);}
  .nt-swc.cust{white-space:nowrap;flex:none;width:auto;height:32px;border-radius:999px;display:inline-flex;align-items:center;gap:6px;padding:0 10px 0 4px;background:#fff;font-size:12.5px;font-weight:700;color:var(--ink-2);} .nt-swc.cust input{width:24px;height:24px;border:0;padding:0;background:none;cursor:pointer;}
  .nt-f input[type=datetime-local]{width:max-content;margin-top:6px;} .nt-f [hidden]{display:none;}
  .nt-bitem{padding:12px 0;border-top:1px solid var(--paper-2);display:flex;flex-direction:column;gap:6px;} .nt-bitem:first-of-type{border-top:0;}
  .nt-bmini{border-radius:8px;padding:8px 12px;font-size:12.5px;font-weight:600;text-align:center;} .nt-bmini a{color:inherit;text-decoration:underline;}
  .nt-bmeta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted);} .nt-bst{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:6px;padding:2px 7px;background:var(--paper-2);color:var(--ink-3);}
  .nt-bst.s-live{background:var(--tint-green);color:var(--green-deep);} .nt-bst.s-scheduled{background:#fbeccd;color:#9a6b1f;} .nt-del{color:#b4232c;}
  .nt-imp{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;background:var(--tint-red);color:#b4232c;border-radius:6px;padding:2px 7px;}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { push, mount, unread };
})();
