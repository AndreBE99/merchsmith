/* ============================================================
   emails.js — platform emails (sending) + reply-by-email.
   Platform Admin and distributors only.

   Tabs: Sent (log of every email sent for your organisation, delivery /
   open / bounce, replies received by email and where they were posted),
   Templates (every email the platform sends; admin edits the platform
   defaults, distributors customise the ones their customers get), Sending
   domain (send from your own domain: SPF / DKIM / DMARC records to add),
   Reply by email (each email gets a unique reply address; replies land in
   the chat, project, order or invoice it was about), My emails (what I
   get and how often).

   PROTOTYPE: nothing is sent. Delivery, opens, DNS checks and inbound
   replies are simulated. Going live = Postmark / SendGrid / Amazon SES
   (outbound + inbound parse webhook). Store: ms-email-v1.
   window.MSEMAIL: mount(root)
   ============================================================ */
window.MSEMAIL=window.MSEMAIL||(function(){
  const KEY='ms-email-v1';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const fDT=d=>new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const role=()=>(window.MSID&&MSID.current?MSID.current():'distributor');
  const ok=()=>['admin','distributor'].includes(role());
  const OWN=()=>role()==='admin'?'merchsmith':'mojo';
  const ORG=()=>OWN()==='merchsmith'?{name:'Merchsmith',domain:'merchsmith.com',key:'merchsmith'}:{name:'Mojo Promotions',domain:'mojopromotions.co.uk',key:'distributor'};
  const isAdmin=()=>role()==='admin';

  /* ---------- templates ---------- */
  const CATS=[['account','Account'],['projects','Projects & proofs'],['orders','Orders'],['invoices','Invoices'],['meetings','Meetings & calls'],['chat','Chat'],['platform','Distributor billing']];
  // aud: who receives it · scope: 'platform' = only Merchsmith sends it (to distributors)
  const TPL=[
    {id:'invite',cat:'account',name:'Invitation to join',when:'Someone is invited to your organisation or store',aud:'Customers, suppliers, your team',subject:'{{sender.org}} has invited you to Merchsmith',body:'Hi {{recipient.first}},\n\n{{sender.name}} has invited you to join {{sender.org}} on Merchsmith, where you can order branded merchandise, approve proofs and track deliveries.',cta:'Accept invitation'},
    {id:'reset',cat:'account',name:'Password reset',when:'Someone asks to reset their password',aud:'Anyone',subject:'Reset your password',body:'Hi {{recipient.first}},\n\nWe received a request to reset your password. The link below works for 60 minutes. If you didn’t ask for this, you can ignore this email.',cta:'Reset password',locked:true},
    {id:'proof',cat:'projects',name:'Proof ready to approve',when:'A proof is added to a project',aud:'Customers',subject:'Proof ready: {{product.name}} for {{project.name}}',body:'Hi {{recipient.first}},\n\nYour proof for {{product.name}} is ready. Please check the artwork, colours and position, then approve it or ask for changes.\n\nYou can reply to this email with any comments and they’ll be added to the project.',cta:'Review proof',reply:true},
    {id:'proofok',cat:'projects',name:'Proof approved',when:'A customer approves a proof',aud:'Your team',subject:'{{recipient.org}} approved {{product.name}}',body:'{{customer.name}} approved the proof for {{product.name}} on {{project.name}}. It’s ready to order.',cta:'Open project'},
    {id:'quote',cat:'projects',name:'Quote sent',when:'A quote is shared with a customer',aud:'Customers',subject:'Your quote for {{project.name}}',body:'Hi {{recipient.first}},\n\nHere’s your quote for {{project.name}}: {{quote.total}} excluding VAT, valid for 30 days.',cta:'View quote',reply:true},
    {id:'order',cat:'orders',name:'Order confirmed',when:'An order is placed',aud:'Customers',subject:'Order {{order.no}} confirmed',body:'Hi {{recipient.first}},\n\nThanks for your order. We’ll let you know when it’s on its way. Expected delivery: {{order.delivery}}.',cta:'Track order',reply:true},
    {id:'dispatch',cat:'orders',name:'Order dispatched',when:'An order is dispatched',aud:'Customers',subject:'Order {{order.no}} is on its way',body:'Hi {{recipient.first}},\n\nYour order has left the warehouse. Tracking: {{order.tracking}}.',cta:'Track delivery',reply:true},
    {id:'delivered',cat:'orders',name:'Order delivered',when:'An order is marked delivered',aud:'Customers',subject:'Order {{order.no}} has been delivered',body:'Hi {{recipient.first}},\n\nYour order was delivered today. If anything isn’t right, reply to this email and we’ll sort it.',cta:'View order',reply:true},
    {id:'terms_req',cat:'invoices',name:'Credit terms to approve',when:'Someone asks for payment terms or a credit limit for a customer',aud:'Your Finance team',subject:'Credit terms to approve: {{customer.name}}',body:'Hi {{recipient.first}},\n\n{{requester.name}} has asked for {{terms.requested}} for {{customer.name}}.\n\nThey stay on Payment on order until you approve. You can approve, change the terms or decline.',cta:'Review terms'},
    {id:'terms_done',cat:'invoices',name:'Credit terms decision',when:'Finance approves, changes or declines requested terms',aud:'The person who asked',subject:'Credit terms {{terms.decision}}: {{customer.name}}',body:'Hi {{recipient.first}},\n\nFinance {{terms.decision}} the credit terms for {{customer.name}}. {{terms.result}}',cta:'Open customer'},
    {id:'invoice',cat:'invoices',name:'Invoice issued',when:'An invoice is raised',aud:'Customers',subject:'Invoice {{invoice.no}} from {{sender.org}}',body:'Hi {{recipient.first}},\n\nInvoice {{invoice.no}} for {{invoice.total}} is attached, due on {{invoice.due}}.',cta:'View invoice',reply:true},
    {id:'overdue',cat:'invoices',name:'Invoice overdue',when:'An invoice passes its due date',aud:'Customers',subject:'Reminder: invoice {{invoice.no}} is overdue',body:'Hi {{recipient.first}},\n\nInvoice {{invoice.no}} for {{invoice.total}} was due on {{invoice.due}}. If you’ve already paid, please ignore this reminder.',cta:'Pay invoice',reply:true},
    {id:'meeting',cat:'meetings',name:'Meeting invitation',when:'Someone is invited to a meeting',aud:'Anyone invited',subject:'Invitation: {{meeting.title}} · {{meeting.when}}',body:'{{sender.name}} has invited you to {{meeting.title}} on {{meeting.when}}.\n\n{{meeting.how}}',cta:'Accept or decline',reply:true},
    {id:'missed',cat:'meetings',name:'Missed call and voicemail',when:'You miss a call or get a voicemail',aud:'Your team',subject:'Missed call from {{caller.name}}',body:'You missed a call from {{caller.name}} ({{caller.number}}) at {{call.time}}.',cta:'Call back'},
    {id:'digest',cat:'chat',name:'Unread messages',when:'Messages are unread for 30 minutes',aud:'Anyone',subject:'{{count}} unread messages on Merchsmith',body:'Hi {{recipient.first}},\n\nYou have {{count}} unread messages, including one from {{sender.name}}:\n\n“{{message.preview}}”\n\nReply to this email to answer in the chat.',cta:'Open chats',reply:true},
    {id:'dinvite',cat:'platform',name:'Distributor invitation',when:'Merchsmith invites a distributor',aud:'Distributors',subject:'Set up {{recipient.org}} on Merchsmith',body:'Hi {{recipient.first}},\n\nYou’ve been invited to set up {{recipient.org}} on Merchsmith. Choose your plan, add your team and open your store.',cta:'Start onboarding',scope:'platform'},
    {id:'receipt',cat:'platform',name:'Subscription receipt',when:'A distributor’s subscription is paid',aud:'Distributors',subject:'Receipt for your {{plan.name}} plan',body:'Thanks, we’ve received {{plan.amount}} for your {{plan.name}} plan. Your next payment is on {{plan.next}}.',cta:'View billing',scope:'platform'},
    {id:'failed',cat:'platform',name:'Payment failed',when:'A distributor’s payment fails',aud:'Distributors',subject:'We couldn’t take your payment',body:'Hi {{recipient.first}},\n\nYour payment of {{plan.amount}} didn’t go through. Please update your payment details to keep your store open.',cta:'Update payment',scope:'platform',reply:true}];
  const SAMPLE={'recipient.first':'Sara','recipient.org':'Citrix','sender.name':'Jess Doyle','sender.org':'Mojo Promotions','customer.name':'Sara Kemp','product.name':'Heavy Weight T-Shirt','project.name':'Autumn Giveaways','quote.total':'£17,840','order.no':'MJ-10482','order.delivery':'Fri 14 Nov','order.tracking':'DPD 1550 7721 0934','invoice.no':'INV-2291','invoice.total':'£4,215.60','invoice.due':'30 Sep','meeting.title':'Proof review','meeting.when':'Tue 29 Sep, 10:00','meeting.how':'Google Meet: meet.google.com/abc-defg-hij','caller.name':'Tom Reed','caller.number':'01772 830 441','call.time':'14:05','count':'3','message.preview':'Can we move the logo up 10mm on the mug?','customer.name':'Harbour Foods','requester.name':'Cara Lyon','terms.requested':'30 days · £10,000 credit limit','terms.decision':'approved','terms.result':'30 days · £10,000 credit limit.','plan.name':'Growth','plan.amount':'£750','plan.next':'1 Nov'};
  const merge=(t,extra)=>String(t||'').replace(/\{\{\s*([\w.]+)\s*\}\}/g,(m,k)=>{ const v=(extra&&extra[k])||SAMPLE[k]; return v!=null?v:m; });
  const FIELDS=t=>[...new Set((t.subject+' '+t.body).match(/\{\{[\w.]+\}\}/g)||[])];

  /* ---------- store ---------- */
  function seedSent(own){ const now=Date.now(), H=36e5, isM=own==='merchsmith';
    const S=(id,tpl,to,org,email,ago,status,thread,extra)=>Object.assign({id,tpl,to:{name:to,org,email},at:new Date(now-ago*H).toISOString(),status,thread,replies:[]},extra||{});
    if(isM) return [
      S('m1','dinvite','Priya Shah','Northbound Merch','priya@northboundmerch.co.uk',3,'opened',{type:'distributor',label:'Northbound Merch',href:'Merchsmith Admin.html#nav=distributors'}),
      S('m2','failed','Liam Ford','Brightside Promo','liam@brightsidepromo.com',20,'opened',{type:'distributor',label:'Brightside Promo · billing',href:'Merchsmith Admin.html#nav=subscriptions'},{replies:[{from:'Liam Ford',email:'liam@brightsidepromo.com',at:new Date(now-18*H).toISOString(),text:'Our card was replaced last week. I’ve updated it now, can you retry the payment?',postedTo:'Chat with Liam Ford'}]}),
      S('m3','receipt','Jess Doyle','Mojo Promotions','jess@mojopromotions.co.uk',46,'delivered',{type:'distributor',label:'Mojo Promotions · billing',href:'Merchsmith Admin.html#nav=subscriptions'}),
      S('m4','dinvite','Owen Price','Coastline Brands','owen@coastlinebrands',70,'bounced',{type:'distributor',label:'Coastline Brands',href:'Merchsmith Admin.html#nav=distributors'},{bounce:'Address doesn’t exist (no domain “coastlinebrands”).'})];
    return [
      S('e1','proof','Sara Kemp','Citrix','sara.kemp@citrix.com',2,'opened',{type:'project',label:'Autumn Giveaways · Heavy Weight T-Shirt proof',href:'Merchsmith Project - Autumn Giveaways.html'},{replies:[{from:'Sara Kemp',email:'sara.kemp@citrix.com',at:new Date(now-1.2*H).toISOString(),text:'Looks great. Can we move the logo up about 10mm on the mug version too?',postedTo:'Autumn Giveaways · proof comments'}]}),
      S('e2','digest','Cara Lyon','Mojo Promotions','cara@mojopromotions.co.uk',5,'delivered',{type:'chat',label:'Chats',href:'Merchsmith Chats.html'}),
      S('e3','dispatch','Priya Nair','Citrix','priya.nair@citrix.com',9,'opened',{type:'order',label:'Order MJ-10479',href:'Merchsmith Orders.html'}),
      S('e4','overdue','Accounts','Harbour Foods','accounts@harbourfoods.co',26,'bounced',{type:'invoice',label:'Invoice INV-2275',href:'Merchsmith Orders.html'},{bounce:'Mailbox full. We’ll try again in 4 hours.'}),
      S('e5','quote','Leo Tran','Citrix','leo.tran@citrix.com',30,'opened',{type:'project',label:'Winter Welcome Packs · quote',href:'Merchsmith Distributor Projects.html'},{replies:[{from:'Leo Tran',email:'leo.tran@citrix.com',at:new Date(now-27*H).toISOString(),text:'Thanks Jess. Can you split the price for 250 and 500 units?',postedTo:'Winter Welcome Packs · project chat'}]}),
      S('e6','meeting','Sara Kemp','Citrix','sara.kemp@citrix.com',48,'delivered',{type:'meeting',label:'Proof review · Calendar',href:'Merchsmith Calendar.html#tab=invites'}),
      S('e7','invoice','Accounts','Citrix','accounts@citrix.com',60,'opened',{type:'invoice',label:'Invoice INV-2291',href:'Merchsmith Orders.html'}),
      S('e8','invite','Priya Nair','Citrix','priya.nair@citrix.com',96,'opened',{type:'org',label:'Citrix · team',href:'Merchsmith Organisations.html'})]; }

  // one-off: align seeded names with the people directory (org-data.js)
  const NAMEMAP=[["Sara Ahmed","Sara Kemp"],["sara.ahmed@citrix.com","sara.kemp@citrix.com"],["Leo Grant","Leo Tran"],["leo.grant@citrix.com","leo.tran@citrix.com"],["Jess Carter","Jess Doyle"],["Cara Doyle","Cara Lyon"],["priya.raman@citrix.com","priya.nair@citrix.com"]];
  function nameFix(o){ if(!o||o.nm2) return o; let s=JSON.stringify(o); NAMEMAP.forEach(([a,b])=>{ s=s.split(a).join(b); }); s=s.replace(/Priya Raman(\\?"[^}]{0,120}Citrix|,\s*Citrix| joined Citrix| · Citrix)/g,m=>m.replace('Priya Raman','Priya Nair')); const x=JSON.parse(s); x.nm2=1; return x; }
  function db(){ let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} if(o&&!o.nm2){ o=nameFix(o); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(x){} } if(!o) o={nm2:1}; ['sent','tpl','domain','reply','prefs','drafts','snips'].forEach(k=>o[k]=o[k]||{}); return o; }
  function save(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function upd(fn){ const o=db(); fn(o); save(o); }
  const sent=()=>{ const o=db(), k=OWN(); if(!o.sent[k]){ o.sent[k]=seedSent(k); save(o); }
    // scheduled emails go out once their time passes
    let ch=false; o.sent[k].forEach(e=>{ if(e.status==='scheduled'&&new Date(e.sendAt)<=new Date()){ e.status='delivered'; e.at=e.sendAt; ch=true; } }); if(ch) save(o);
    return o.sent[k]; };
  const SNIP0=[{id:'s1',name:'Chasing proof approval',body:'Hi {{recipient.first}},\n\nJust checking in on the proof we sent over. Once it’s approved we can get it into production, so we’re on track for your delivery date.\n\nLet me know if you’d like any changes.'},
    {id:'s2',name:'Delivery update',body:'Hi {{recipient.first}},\n\nA quick update on your order: it’s been dispatched and should arrive within 2 working days. I’ll send tracking as soon as I have it.'},
    {id:'s3',name:'Artwork files needed',body:'Hi {{recipient.first}},\n\nCould you send your logo as a vector file (AI, EPS, SVG or PDF)? It keeps the print sharp at every size.'},
    {id:'s4',name:'Thanks for your order',body:'Hi {{recipient.first}},\n\nThanks for your order. I’ll keep you updated at each stage, and you can reply to this email any time.'}];
  const snips=()=>{ const o=db(); if(!o.snips[OWN()]){ o.snips[OWN()]=SNIP0.map(s=>Object.assign({},s)); save(o); } return o.snips[OWN()]; };
  const drafts=()=>db().drafts[OWN()]||[];
  const isCustom=e=>!!e.custom;
  const subjOf=e=>isCustom(e)?e.custom.subject:merge(tplFor(e.tpl).subject);
  // template = platform default ← admin override (o.tpl.merchsmith) ← distributor override (o.tpl.mojo)
  const tplDefault=id=>{ const b=TPL.find(t=>t.id===id), a=(db().tpl.merchsmith||{})[id]; return Object.assign({},b,a||{}); };
  const tplFor=id=>{ const d=tplDefault(id); if(isAdmin()) return d; const c=(db().tpl.mojo||{})[id]; return Object.assign({},d,c||{},{custom:!!c}); };
  const domainOf=()=>Object.assign({fromName:ORG().name,local:isAdmin()?'hello':'orders',status:isAdmin()?'verified':'pending',replySub:'reply',checkedAt:null},db().domain[OWN()]||{});
  const replyCfg=()=>Object.assign({on:true,strip:true,unknown:'hold',forward:false},db().reply[OWN()]||{});
  const prefs=()=>Object.assign({digest:'30',cats:{}},db().prefs[OWN()]||{});
  const replyAddr=id=>{ const d=domainOf(); const host=d.status==='verified'?d.replySub+'.'+ORG().domain:'reply.merchsmith.com'; return 'reply+'+(hash(id+OWN()).toString(36)).slice(0,8)+'@'+host; };
  const fromLine=()=>{ const d=domainOf(); return d.status==='verified'?`${d.fromName} <${d.local}@${ORG().domain}>`:`${d.fromName} via Merchsmith <notifications@merchsmith.com>`; };

  function toast(t){ let el=document.getElementById('emToast'); if(!el){ el=document.createElement('div'); el.id='emToast'; el.className='em-toast'; document.body.appendChild(el); }
    el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2800); }

  // branded email as the recipient sees it
  function renderEmail(t,extra,addr){ const org=ORG(), p=window.MSORG&&MSORG.get?MSORG.get(org.key):{}, logo=p&&(p.logoFull||p.logoSq);
    const body=esc(merge(t.body,extra)).split(/\n{2,}/).map(x=>`<p>${x.replace(/\n/g,'<br>')}</p>`).join('');
    return `<div class="em-mail"><div class="em-mh"><div class="em-mhl">${logo?`<img src="${esc(logo)}" alt="${esc(org.name)}">`:`<b>${esc(org.name)}</b>`}</div></div>
      <div class="em-mb"><h3>${esc(merge(t.subject,extra))}</h3>${body}${t.cta?`<span class="em-cta">${esc(t.cta)}</span>`:''}
      ${t.reply&&replyCfg().on?`<p class="em-rp">You can reply to this email. Your reply goes straight to ${esc(org.name)} on Merchsmith.</p>`:''}</div>
      <div class="em-mf">${esc(org.name)}${isAdmin()?' Ltd · Company no. 14827391':''} · Sent through Merchsmith<br><u>Email preferences</u> · <u>Privacy</u></div></div>
      <div class="em-meta"><span><b>From</b> ${esc(fromLine())}</span>${t.reply&&replyCfg().on?`<span><b>Reply-to</b> ${esc(addr||replyAddr('preview'))}</span>`:''}</div>`; }

  let REDRAW=()=>{};
  const meP=()=>window.MSChat&&MSChat.me?MSChat.me():null;
  /* ----- signature: fields + style (My emails) ----- */
  const SIGD=()=>{ const m=meP()||{}, org=ORG(); return {signoff:'Best wishes,',name:m.name||(isAdmin()?'Morgan Slade':'Jess Doyle'),title:m.title||(isAdmin()?'Platform operations':'Account manager'),company:org.name,phone:m.phone||(isAdmin()?'0113 496 0214':'0161 555 0142'),mobile:'',email:m.email||((isAdmin()?'morgan':'jess')+'@'+org.domain),website:org.domain,address:'',linkedin:'',instagram:'',x:'',
    layout:'logo',accent:'brand',logo:true,photo:false,divider:true,size:'m'}; };
  const sigData=()=>Object.assign(SIGD(),(db().prefs[OWN()]||{}).sigD||{});
  const sigOf=()=>{ const d=sigData(); return [d.name,d.title,d.company,[d.phone,d.mobile].filter(Boolean).join(' · '),d.email,d.website].filter(Boolean).join('\n'); };
  const ACC={brand:'var(--periwinkle-deep)',ink:'#222',grey:'#6b6b76'};
  function sigHTML(d){ d=d||sigData(); const org=ORG(), p=window.MSORG&&MSORG.get?MSORG.get(org.key):{}, logo=p&&(d.layout==='stacked'?(p.logoFull||p.logoSq):(p.logoSq||p.logoFull)), m=meP()||{}, a=ACC[d.accent]||ACC.brand, fs={s:12,m:13,l:14.5}[d.size]||13;
    const pic=d.photo&&m.photo?`<img src="${esc(m.photo)}" alt="" style="width:${fs*4}px;height:${fs*4}px;border-radius:50%;object-fit:cover;display:block">`:'';
    const lg=d.logo&&logo?`<img src="${esc(logo)}" alt="${esc(d.company)}" style="${d.layout==='stacked'?'height:'+fs*2.2+'px;width:auto;max-width:180px':'width:'+fs*4+'px;height:'+fs*4+'px;object-fit:contain'};display:block">`:'';
    const soc=[['linkedin','LinkedIn'],['instagram','Instagram'],['x','X']].filter(([k2])=>d[k2]).map(([k2,l])=>`<a href="${esc(/^https?:/.test(d[k2])?d[k2]:'https://'+d[k2])}" style="color:${a};font-weight:700;text-decoration:none">${l}</a>`).join(' · ');
    const web=d.website?`<a href="https://${esc(d.website.replace(/^https?:\/\//,''))}" style="color:${a};text-decoration:none">${esc(d.website.replace(/^https?:\/\//,''))}</a>`:'';
    const contact=[d.phone&&'T '+esc(d.phone),d.mobile&&'M '+esc(d.mobile),d.email&&`<a href="mailto:${esc(d.email)}" style="color:inherit;text-decoration:none">${esc(d.email)}</a>`,web].filter(Boolean);
    const who=`<div style="font-weight:800;font-size:${fs+2}px;color:#222">${esc(d.name)}</div>${d.title||d.company?`<div style="color:${a};font-weight:700">${esc([d.title,d.company].filter(Boolean).join(' · '))}</div>`:''}`;
    const lines=`<div style="color:#55555f;margin-top:4px">${contact.join(d.layout==='line'?' · ':'<br>')}</div>${d.address?`<div style="color:#8a8a93;margin-top:2px">${esc(d.address).replace(/\n/g,', ')}</div>`:''}${soc?`<div style="margin-top:4px">${soc}</div>`:''}`;
    const so=d.signoff?`<div style="margin-bottom:10px;color:#222">${esc(d.signoff)}</div>`:'';
    const wrap=inner=>`<div class="em-sigh" style="font-size:${fs}px;line-height:1.5;font-family:var(--sans)">${so}${d.divider&&d.layout!=='line'?`<div style="width:44px;height:3px;border-radius:2px;background:${a};margin:0 0 10px"></div>`:''}${inner}</div>`;
    if(d.layout==='line') return wrap(`<div><b style="color:#222">${esc(d.name)}</b>${d.title?' · '+esc(d.title):''}${d.company?' · <span style="color:'+a+';font-weight:700">'+esc(d.company)+'</span>':''}${contact.length?' · '+contact.join(' · '):''}</div>`);
    if(d.layout==='text') return wrap(who+lines);
    if(d.layout==='stacked') return wrap(`${lg?`<div style="margin-bottom:10px">${lg}</div>`:''}${who}${lines}`);
    return wrap(`<div style="display:flex;gap:14px;align-items:flex-start">${pic||lg?`<div style="display:flex;flex-direction:column;gap:6px;flex:none;${d.divider?'padding-right:14px;border-right:2px solid '+a:''}">${pic}${pic&&lg?'':lg}</div>`:''}<div>${who}${lines}</div></div>`); }
  const EMRE=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  function people(){ const cs=window.MSChat&&MSChat.contacts?MSChat.contacts():[]; const orgN=p=>p.orgName||(MSChat.orgOf?((MSChat.orgOf(p)||{}).name||''):'');
    return cs.map(p=>{ const o=orgN(p); return {name:p.name,org:o,email:p.email||(p.name.toLowerCase().replace(/[^a-z ]/g,'').trim().replace(/\s+/g,'.')+'@'+(o||'company').toLowerCase().replace(/[^a-z0-9]/g,'')+(/ltd|uk/i.test(o)?'.co.uk':'.com'))}; }); }
  const RECORDS=()=>isAdmin()?[{type:'distributor',label:'Mojo Promotions',href:'Merchsmith Admin.html#nav=distributors'},{type:'distributor',label:'Northbound Merch',href:'Merchsmith Admin.html#nav=distributors'},{type:'distributor',label:'Brightside Promo · billing',href:'Merchsmith Admin.html#nav=subscriptions'},{type:'supplier',label:'BagWorks UK',href:'Merchsmith Admin.html#nav=suppliers'}]
    :[{type:'project',label:'Autumn Giveaways',href:'Merchsmith Project - Autumn Giveaways.html'},{type:'project',label:'Winter Welcome Packs',href:'Merchsmith Distributor Projects.html'},{type:'project',label:'Staff Onboarding Kits',href:'Merchsmith Distributor Projects.html'},{type:'order',label:'Order MJ-10482',href:'Merchsmith Orders.html'},{type:'order',label:'Order MJ-10479',href:'Merchsmith Orders.html'},{type:'invoice',label:'Invoice INV-2291',href:'Merchsmith Orders.html'},{type:'org',label:'Citrix',href:'Merchsmith Organisations.html'},{type:'org',label:'Harbour Foods',href:'Merchsmith Organisations.html'}];
  const PROJFILES=['Proof · Heavy Weight T-Shirt.pdf','Proof · Ceramic Mug 11oz.pdf','Quote Q-1182 · Autumn Giveaways.pdf','Invoice INV-2291.pdf','Artwork · Citrix autumn logo.svg'];
  function clean(html){ const d=document.createElement('div'); d.innerHTML=html; d.querySelectorAll('*').forEach(n=>{ if(!/^(B|STRONG|I|EM|U|UL|OL|LI|A|BR|P|DIV|SPAN)$/.test(n.tagName)){ n.replaceWith(document.createTextNode(n.textContent)); return; }
      [...n.attributes].forEach(a=>{ if(!(n.tagName==='A'&&a.name==='href'&&/^(https?:|mailto:)/i.test(a.value))) n.removeAttribute(a.name); }); if(n.tagName==='A'){ n.setAttribute('target','_blank'); n.setAttribute('rel','noopener'); } }); return d.innerHTML; }
  const txt2html=t=>esc(t).split(/\n{2,}/).map(x=>'<p>'+x.replace(/\n/g,'<br>')+'</p>').join('');
  function renderCustom(c,addr){ const org=ORG(), p=window.MSORG&&MSORG.get?MSORG.get(org.key):{}, logo=p&&(p.logoFull||p.logoSq);
    const sig=c.layout!=='plain'&&c.sigHtml?`<div class="em-sigr">${c.sigHtml}</div>`:c.sig?`<div class="em-sigr">${esc(c.sig).replace(/\n/g,'<br>')}</div>`:'', att=(c.attach||[]).length?`<div class="em-atts">${c.attach.map(a=>`<span>📎 ${esc(a.name)}</span>`).join('')}</div>`:'';
    const inner=`<div class="em-body">${c.html||''}</div>${sig}${att}`;
    return (c.layout==='plain'?`<div class="em-plain">${inner}</div>`
      :`<div class="em-mail"><div class="em-mh"><div class="em-mhl">${logo?`<img src="${esc(logo)}" alt="${esc(org.name)}">`:`<b>${esc(org.name)}</b>`}</div></div><div class="em-mb">${inner}${replyCfg().on?`<p class="em-rp">You can reply to this email. Your reply goes straight to ${esc(org.name)} on Merchsmith.</p>`:''}</div><div class="em-mf">${esc(org.name)} · Sent through Merchsmith</div></div>`)
      +`<div class="em-meta"><span><b>From</b> ${esc((meP()||{}).name?meP().name+' at '+fromLine():fromLine())}</span>${replyCfg().on?`<span><b>Reply-to</b> ${esc(addr||replyAddr('preview'))}</span>`:''}</div>`; }

  /* ----- compose (works on any page for Admin + distributors) ----- */
  function compose(o){ if(!ok()) return; o=o||{}; const d=o.draft||null;
    const st={to:(d?d.to:o.to)||[],cc:(d&&d.cc)||[],bcc:(d&&d.bcc)||[],showCc:!!(d&&(d.cc.length||d.bcc.length)),attach:(d&&d.attach)||[],layout:(d&&d.layout)||'branded',link:(d?d.link:o.link)||null,sigOn:d?!!d.sig:true,preview:false,when:'now',at:'',id:d?d.id:null};
    let el=document.getElementById('emCompose'); if(!el){ el=document.createElement('div'); el.id='emCompose'; document.body.appendChild(el); }
    const PPL=people(), recs=RECORDS();
    el.className='em-drawer on';
    el.innerHTML=`<div class="em-scrim" data-cx></div><aside class="em-dp em-cp" role="dialog" aria-label="New email">
      <div class="em-dh"><div><b>${d?'Draft':'New email'}</b><span>From ${esc(fromLine())}</span></div><button class="em-x" data-cx aria-label="Close">×</button></div>
      <div class="em-cf" data-rcp="to"><span>To</span><div class="em-chips" data-chips="to"></div><button class="pp-link" data-showcc>${st.showCc?'':'Cc / Bcc'}</button></div>
      <div data-ccrow${st.showCc?'':' hidden'}><div class="em-cf" data-rcp="cc"><span>Cc</span><div class="em-chips" data-chips="cc"></div></div><div class="em-cf" data-rcp="bcc"><span>Bcc</span><div class="em-chips" data-chips="bcc"></div></div></div>
      <datalist id="emPpl">${PPL.map(p=>`<option value="${esc(p.name)} <${esc(p.email)}>">${esc(p.org)}</option>`).join('')}</datalist>
      <div class="em-cf"><span>Subject</span><input data-csub value="${esc(d?d.subject:(o.subject||''))}" placeholder="What’s it about?"></div>
      <div class="em-cf"><span>Link to</span><select data-clink><option value="">Nothing</option>${recs.map((r,i)=>`<option value="${i}"${st.link&&st.link.label===r.label?' selected':''}>${esc(r.label)}</option>`).join('')}</select></div>
      <div class="em-tb"><button type="button" data-cmd="bold" title="Bold"><b>B</b></button><button type="button" data-cmd="italic" title="Italic"><i>I</i></button><button type="button" data-cmd="insertUnorderedList" title="Bulleted list">• List</button><button type="button" data-cmd="link" title="Link">Link</button>
        <select data-csnip><option value="">Insert saved reply…</option>${snips().map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select><span class="em-tbs"></span><button type="button" data-cprev>${'Preview'}</button></div>
      <div class="em-lnk" data-clnk hidden><input data-clurl placeholder="https://…"><button type="button" class="pp-btn sm" data-clok>Add link</button><button type="button" class="pp-link" data-clno>Cancel</button></div>
      <div class="em-ed" contenteditable="true" data-ced>${d?d.html||'':''}</div><div data-cpv hidden></div>
      <div class="em-sigbox"><label class="em-chk" style="margin:0"><input type="checkbox" data-csig${st.sigOn?' checked':''}> Add my signature</label><span class="em-sigp">${esc(sigOf()).replace(/\n/g,' · ')}</span><a class="pp-link" href="Merchsmith Emails.html${location.search}#tab=mine">Edit signature</a></div>
      <div class="em-attrow"><label class="pp-btn ghost sm">Attach file<input type="file" multiple data-cfile hidden></label><select data-cpf><option value="">From a project…</option>${PROJFILES.map(f=>`<option>${esc(f)}</option>`).join('')}</select><div class="em-atts" data-catts></div></div>
      <div class="em-opts"><div class="em-seg" data-clay>${[['branded','Branded'],['plain','Plain text']].map(([k2,l])=>`<button type="button" data-lay="${k2}" class="${st.layout===k2?'on':''}">${l}</button>`).join('')}</div>
        <div class="em-seg" data-cwhen>${[['now','Send now'],['later','Schedule']].map(([k2,l])=>`<button type="button" data-wh="${k2}" class="${st.when===k2?'on':''}">${l}</button>`).join('')}</div><input type="datetime-local" data-cat hidden></div>
      <p class="em-cerr" data-cerr hidden></p>
      <div class="em-cfoot"><span class="em-sm" style="margin:0" data-ccount></span><button class="pp-btn ghost" data-cdraft>Save draft</button><button class="pp-btn" data-csend>Send</button></div></aside>`;
    const q=s=>el.querySelector(s), err=q('[data-cerr]'), fail=t=>{ err.textContent=t; err.hidden=false; };
    const total=()=>st.to.length+st.cc.length+st.bcc.length;
    function chips(kind){ const box=q('[data-chips="'+kind+'"]');
      box.innerHTML=st[kind].map((r,i)=>`<span class="em-chip${EMRE.test(r.email)?'':' bad'}" title="${esc(r.email)}">${esc(r.name||r.email)}<button type="button" data-rm="${kind}:${i}" aria-label="Remove">×</button></span>`).join('')+`<input list="emPpl" data-rin="${kind}" placeholder="${st[kind].length?'':'Name or email address'}">`;
      box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ const [k2,i]=b.dataset.rm.split(':'); st[k2].splice(+i,1); chips(k2); count(); });
      const inp=box.querySelector('input'); const add=()=>{ const v=inp.value.trim().replace(/[,;]$/,''); if(!v) return; const m=v.match(/^(.*)<([^>]+)>$/), p=PPL.find(x=>x.name.toLowerCase()===v.toLowerCase());
          const r=m?{name:m[1].trim(),email:m[2].trim(),org:(PPL.find(x=>x.email===m[2].trim())||{}).org||''}:p?{name:p.name,email:p.email,org:p.org}:{name:'',email:v,org:''};
          if(total()>=20){ fail('You can send to up to 20 people at once. For more, ask Merchsmith about announcements.'); return; }
          if(![...st.to,...st.cc,...st.bcc].some(x=>x.email.toLowerCase()===r.email.toLowerCase())) st[kind].push(r); chips(kind); count(); q('[data-rin="'+kind+'"]').focus(); };
      inp.onkeydown=e=>{ if(e.key==='Enter'||e.key===','||e.key===';'){ e.preventDefault(); add(); } else if(e.key==='Backspace'&&!inp.value&&st[kind].length){ st[kind].pop(); chips(kind); count(); q('[data-rin="'+kind+'"]').focus(); } };
      inp.onchange=add; inp.onblur=()=>{ if(inp.value.trim()) add(); }; }
    const count=()=>{ const n=total(); q('[data-ccount]').textContent=n?n+' of 20 recipients':''; };
    ['to','cc','bcc'].forEach(chips); count();
    const atts=()=>{ q('[data-catts]').innerHTML=st.attach.map((a,i)=>`<span class="em-chip">📎 ${esc(a.name)}<button type="button" data-arm="${i}" aria-label="Remove">×</button></span>`).join('');
      q('[data-catts]').querySelectorAll('[data-arm]').forEach(b=>b.onclick=()=>{ st.attach.splice(+b.dataset.arm,1); atts(); }); }; atts();
    q('[data-cfile]').onchange=e=>{ [...e.target.files].forEach(f=>{ if(f.size>20*1024*1024) return fail(f.name+' is over 20 MB'); st.attach.push({name:f.name,size:f.size}); }); e.target.value=''; atts(); };
    q('[data-cpf]').onchange=e=>{ const v=e.target.value; if(v&&!st.attach.some(a=>a.name===v)) st.attach.push({name:v,fromProject:true}); e.target.value=''; atts(); };
    q('[data-showcc]').onclick=e=>{ st.showCc=true; q('[data-ccrow]').hidden=false; e.target.textContent=''; };
    const ed=q('[data-ced]');
    let crange=null; const clnk=q('[data-clnk]'), clu=q('[data-clurl]');
    el.querySelectorAll('[data-cmd]').forEach(b=>b.onmousedown=e=>{ e.preventDefault(); const c=b.dataset.cmd, sel=getSelection();
      if(c==='link'){ if(!sel.rangeCount||sel.isCollapsed||!ed.contains(sel.anchorNode)) return toast('Select the words you want to link first'); crange=sel.getRangeAt(0).cloneRange(); clnk.hidden=false; clu.value='https://'; setTimeout(()=>{ clu.focus(); clu.select(); },0); return; }
      document.execCommand(c); ed.focus(); });
    const capply=()=>{ let u=clu.value.trim(); if(!u||u==='https://') return toast('Enter a link address'); if(!/^(https?:|mailto:)/i.test(u)) u=/@/.test(u)&&!/\//.test(u)?'mailto:'+u:'https://'+u.replace(/^\/+/,'');
      ed.focus(); const sel=getSelection(); sel.removeAllRanges(); if(crange) sel.addRange(crange); document.execCommand('createLink',false,u); crange=null; clnk.hidden=true; };
    q('[data-clok]').onclick=capply; clu.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); capply(); } if(e.key==='Escape'){ clnk.hidden=true; crange=null; } };
    q('[data-clno]').onclick=()=>{ clnk.hidden=true; crange=null; };
    q('[data-csnip]').onchange=e=>{ const s=snips().find(x=>x.id===e.target.value); e.target.value=''; if(!s) return; const first=(st.to[0]&&(st.to[0].name||'').split(' ')[0])||'there';
      ed.focus(); document.execCommand('insertHTML',false,txt2html(s.body.replace(/\{\{\s*recipient\.first\s*\}\}/g,first))); };
    const data=()=>({to:st.to,cc:st.cc,bcc:st.bcc,subject:q('[data-csub]').value.trim(),html:clean(ed.innerHTML),attach:st.attach,layout:st.layout,sig:q('[data-csig]').checked?sigOf():'',sigHtml:q('[data-csig]').checked?sigHTML():'',link:st.link});
    q('[data-clink]').onchange=e=>{ st.link=e.target.value===''?null:recs[+e.target.value]; };
    el.querySelectorAll('[data-lay]').forEach(b=>b.onclick=()=>{ st.layout=b.dataset.lay; el.querySelectorAll('[data-lay]').forEach(x=>x.classList.toggle('on',x===b)); if(st.preview) q('[data-cpv]').innerHTML=renderCustom(data()); });
    el.querySelectorAll('[data-wh]').forEach(b=>b.onclick=()=>{ st.when=b.dataset.wh; el.querySelectorAll('[data-wh]').forEach(x=>x.classList.toggle('on',x===b)); const a=q('[data-cat]'); a.hidden=st.when!=='later';
      if(!a.value){ const t=new Date(Date.now()+864e5); t.setHours(9,0,0,0); a.value=new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,16); } q('[data-csend]').textContent=st.when==='later'?'Schedule':'Send'; });
    q('[data-cprev]').onclick=e=>{ st.preview=!st.preview; ed.hidden=st.preview; const pv=q('[data-cpv]'); pv.hidden=!st.preview; if(st.preview) pv.innerHTML=renderCustom(data()); e.target.textContent=st.preview?'Edit':'Preview'; };
    const close=()=>{ el.className='em-drawer'; el.innerHTML=''; };
    const saveDraft=()=>{ const v=data(); upd(o2=>{ const L=o2.drafts[OWN()]=o2.drafts[OWN()]||[]; const id=st.id||('d'+Date.now().toString(36)); st.id=id; const i=L.findIndex(x=>x.id===id), rec=Object.assign({id,updated:new Date().toISOString()},v); if(i>=0) L[i]=rec; else L.unshift(rec); }); };
    el.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>{ const v=data(); if((v.subject||ed.textContent.trim()||st.to.length)&&!st.sent){ saveDraft(); toast('Saved to drafts'); } close(); REDRAW(); });
    q('[data-cdraft]').onclick=()=>{ saveDraft(); toast('Draft saved'); REDRAW(); };
    q('[data-csend]').onclick=()=>{ const v=data(); err.hidden=true;
      if(!st.to.length) return fail('Add at least one person to send to.');
      const bad=[...st.to,...st.cc,...st.bcc].find(r=>!EMRE.test(r.email)); if(bad) return fail('“'+bad.email+'” isn’t a valid email address.');
      if(!v.subject) return fail('Add a subject.'); if(!ed.textContent.trim()) return fail('Write a message.');
      let sendAt=null; if(st.when==='later'){ const a=q('[data-cat]').value; sendAt=a?new Date(a):null; if(!sendAt||sendAt<=new Date()) return fail('Pick a time in the future.'); }
      const m=meP()||{}, id='c'+Date.now().toString(36);
      upd(o2=>{ (o2.sent[OWN()]=o2.sent[OWN()]||seedSent(OWN())).unshift({id,tpl:'custom',custom:{subject:v.subject,html:v.html,layout:v.layout,sig:v.sig,sigHtml:v.sigHtml,attach:v.attach,cc:v.cc,bcc:v.bcc},to:v.to[0],toList:v.to,by:m.name||'you',
          at:new Date().toISOString(),sendAt:sendAt?sendAt.toISOString():null,status:sendAt?'scheduled':'delivered',thread:v.link,replies:[]});
        if(st.id) o2.drafts[OWN()]=(o2.drafts[OWN()]||[]).filter(x=>x.id!==st.id); });
      st.sent=true; close(); toast(sendAt?'Scheduled for '+fDT(sendAt):'Sent to '+v.to.map(r=>r.name||r.email).join(', ')+(v.link?' · logged on '+v.link.label:'')); REDRAW(); };
    setTimeout(()=>{ const f=st.to.length?q('[data-csub]'):q('[data-rin="to"]'); if(f) f.focus(); },50); }

  // Email buttons anywhere: <el data-email-to='{"name","email","org"}' data-email-link='{"type","label","href"}'>
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-email-to]'); if(!b) return; e.preventDefault(); e.stopPropagation();
    let to=null, link=null; try{ to=JSON.parse(b.dataset.emailTo); }catch(x){} try{ link=b.dataset.emailLink?JSON.parse(b.dataset.emailLink):null; }catch(x){}
    compose({to:to?[to]:[],link}); },true);

  function mount(root){
    if(!ok()){ root.innerHTML='<div class="em-card" style="margin-top:22px;max-width:560px"><h4>Emails isn’t available</h4><p class="em-sm">Email settings are managed by your distributor and Merchsmith. You can change which emails you get in your profile.</p><div class="em-row"><a class="pp-btn sm" href="Merchsmith Profile.html">Go to my profile</a></div></div>'; return; }
    const S={tab:(location.hash.match(/tab=(\w+)/)||[])[1]||'sent',f:'all',q:'',sel:null,tpl:null,cat:''};
    const TABS=[['sent','Sent'],['drafts','Drafts'],['snips','Saved replies'],['templates','Templates'],['domain','Sending domain'],['reply','Reply by email'],['mine','My emails']];
    function draw(){ const L=sent(), nb=L.filter(e=>e.status==='bounced').length, nr=L.reduce((n,e)=>n+e.replies.filter(r=>!r.seen).length,0);
      root.innerHTML=`<div class="em-tabs">${TABS.map(([k,l])=>`<button class="em-tab${S.tab===k?' on':''}" data-etab="${k}">${l}${k==='sent'&&(nb||nr)?` <b>${nb+nr}</b>`:''}${k==='drafts'&&drafts().length?` <i>${drafts().length}</i>`:''}</button>`).join('')}</div><div data-ebody></div>`;
      root.querySelectorAll('[data-etab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.etab; S.tpl=null; history.replaceState(null,'','#tab='+S.tab); draw(); });
      const body=root.querySelector('[data-ebody]');
      ({sent:drawSent,drafts:drawDrafts,snips:drawSnips,templates:drawTemplates,domain:drawDomain,reply:drawReply,mine:drawMine})[S.tab](body);
      if(S.sel) drawDetail(S.sel); }

    /* ----- sent log ----- */
    const ST={queued:'Queued',scheduled:'Scheduled',delivered:'Delivered',opened:'Opened',bounced:'Bounced'};
    function drawSent(body){ let L=sent().slice().sort((a,b)=>new Date(b.at)-new Date(a.at));
      if(S.f==='replied') L=L.filter(e=>e.replies.length); else if(S.f!=='all') L=L.filter(e=>e.status===S.f);
      if(S.q){ const q=S.q.toLowerCase(); L=L.filter(e=>(e.to.name+' '+e.to.org+' '+e.to.email+' '+subjOf(e)+' '+(e.thread?e.thread.label:'')).toLowerCase().includes(q)); }
      const all=sent(), c=k=>all.filter(e=>e.status===k).length;
      body.innerHTML=`<div class="em-stats">${[['Sent',all.length],['Opened',c('opened')],['Replies',all.reduce((n,e)=>n+e.replies.length,0)],['Bounced',c('bounced')]].map(([l,v])=>`<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
        <div class="em-bar"><div class="em-seg">${[['all','All'],['opened','Opened'],['replied','Replied'],['scheduled','Scheduled'],['bounced','Bounced']].map(([k,l])=>`<button class="${S.f===k?'on':''}" data-ef="${k}">${l}</button>`).join('')}</div>
          <input class="em-search" data-eq value="${esc(S.q)}" placeholder="Search recipient, company, subject or record"></div>
        <div class="em-list">${L.length?L.map(e=>{ const nr=e.replies.filter(r=>!r.seen).length, more=(e.toList||[]).length>1?' +'+((e.toList.length)-1):'';
          return `<button class="em-r${S.sel===e.id?' sel':''}" data-eopen="${esc(e.id)}"><span class="em-st s-${e.status}">${ST[e.status]}</span>
            <span class="em-ri"><b>${esc(subjOf(e))}</b><i>To ${esc(e.to.name)}${more}${e.to.org?' · '+esc(e.to.org):''} · ${isCustom(e)?'Written by '+esc(e.by||'you'):esc(tplFor(e.tpl).name)}</i></span>
            <span class="em-rm">${isCustom(e)?'<span class="em-pill c">Personal</span>':''}${(e.custom&&e.custom.attach||[]).length?`<span class="em-pill">📎 ${e.custom.attach.length}</span>`:''}${e.replies.length?`<span class="em-pill r${nr?' new':''}">${e.replies.length} ${e.replies.length===1?'reply':'replies'}</span>`:''}${e.thread?`<span class="em-pill">${esc(e.thread.label)}</span>`:''}</span>
            <span class="em-rt">${e.status==='scheduled'?'Sends '+fDT(e.sendAt):fDT(e.at)}</span></button>`; }).join(''):'<div class="em-empty">No emails match.</div>'}</div>
        <p class="em-sm" style="margin-top:12px">Prototype: nothing is sent. Delivery, opens and replies are examples.</p>`;
      body.querySelectorAll('[data-ef]').forEach(b=>b.onclick=()=>{ S.f=b.dataset.ef; draw(); });
      const q=body.querySelector('[data-eq]'); q.oninput=()=>{ S.q=q.value; const p=q.selectionStart; draw(); const n=root.querySelector('[data-eq]'); n.focus(); n.setSelectionRange(p,p); };
      body.querySelectorAll('[data-eopen]').forEach(b=>b.onclick=()=>{ S.sel=b.dataset.eopen; upd(o=>{ const x=o.sent[OWN()].find(y=>y.id===S.sel); x.replies.forEach(r=>r.seen=true); }); draw(); }); }
    function drawDetail(id){ const e=sent().find(x=>x.id===id); if(!e){ S.sel=null; return; } const t=isCustom(e)?{subject:e.custom.subject,reply:true}:tplFor(e.tpl), addr=replyAddr(e.id);
      let dr=document.getElementById('emDrawer'); if(!dr){ dr=document.createElement('div'); dr.id='emDrawer'; document.body.appendChild(dr); }
      const steps=[['Sent',e.at,true],['Delivered',e.at,e.status==='delivered'||e.status==='opened'],['Opened',e.at,e.status==='opened']];
      dr.className='em-drawer on'; dr.innerHTML=`<div class="em-scrim" data-edx></div><aside class="em-dp" role="dialog" aria-label="Email details">
        <div class="em-dh"><div><b>${esc(subjOf(e))}</b><span>To ${esc((e.toList||[e.to]).map(r=>r.name||r.email).join(', '))}${e.custom&&e.custom.cc.length?' · Cc '+esc(e.custom.cc.map(r=>r.name||r.email).join(', ')):''}</span></div><button class="em-x" data-edx aria-label="Close">×</button></div>
        <div class="em-tl">${e.status==='bounced'?`<div class="em-bounce"><b>Bounced</b><span>${esc(e.bounce||'The receiving server rejected this email.')}</span><button class="pp-btn sm" data-eresend>Resend</button></div>`
          :e.status==='scheduled'?`<span class="on"><i></i>Scheduled for ${fDT(e.sendAt)}</span><button class="pp-link" data-eunsched>Cancel and move to drafts</button>`
          :steps.map(([l,at,on])=>`<span class="${on?'on':''}"><i></i>${l}${on?` · ${fDT(at)}`:''}</span>`).join('')}</div>
        ${e.thread?`<div class="em-link"><span>About</span><a href="${esc(e.thread.href)}">${esc(e.thread.label)} →</a></div>`:''}
        ${e.replies.length?`<h5>Replies by email</h5>${e.replies.map(r=>`<div class="em-reply"><div class="em-rh"><b>${esc(r.from)}</b><span>${fDT(r.at)}</span></div><p>${esc(r.text)}</p><em>Posted to ${esc(r.postedTo)}</em></div>`).join('')}`:''}
        ${t.reply&&replyCfg().on?`<button class="pp-link" data-esim>Simulate a reply from ${esc(e.to.name.split(' ')[0])}</button>`:''}
        <h5>Email</h5>${isCustom(e)?renderCustom(e.custom,addr):renderEmail(t,{...(e.vars||{}),'recipient.first':window.MSNAME?MSNAME.greet({n:e.to.name}):String(e.to.name||'').split(' ')[0]},addr)}</aside>`;
      const close=()=>{ S.sel=null; dr.className='em-drawer'; dr.innerHTML=''; draw(); };
      dr.querySelectorAll('[data-edx]').forEach(b=>b.onclick=close);
      const us=dr.querySelector('[data-eunsched]'); if(us) us.onclick=()=>{ upd(o=>{ const L=o.sent[OWN()], i=L.findIndex(y=>y.id===id), x=L.splice(i,1)[0]; (o.drafts[OWN()]=o.drafts[OWN()]||[]).unshift(Object.assign({id:'d'+Date.now().toString(36),updated:new Date().toISOString(),to:x.toList,link:x.thread},x.custom)); }); toast('Moved to drafts'); close(); };
      const rs=dr.querySelector('[data-eresend]'); if(rs) rs.onclick=()=>{ upd(o=>{ const x=o.sent[OWN()].find(y=>y.id===id); x.status='delivered'; x.at=new Date().toISOString(); delete x.bounce; }); toast('Resent to '+e.to.email); drawDetail(id); };
      const sm=dr.querySelector('[data-esim]'); if(sm) sm.onclick=()=>{ if(!dr.querySelector('[data-esimbox]')){ sm.insertAdjacentHTML('afterend','<div class="em-lnk" data-esimbox style="margin:8px 0"><input data-esimtx value="Thanks, that works for us."><button type="button" class="pp-btn sm" data-esimok>Receive reply</button></div>'); const i=dr.querySelector('[data-esimtx]'); i.focus(); i.select(); dr.querySelector('[data-esimok]').onclick=()=>sm.onclick(); i.onkeydown=ev=>{ if(ev.key==='Enter') sm.onclick(); }; return; }
        const txt=dr.querySelector('[data-esimtx]').value.trim(); if(!txt) return;
        const where=!e.thread?'Emails · replies':e.thread.type==='chat'?'Chat with '+e.to.name:e.thread.label;
        upd(o=>{ o.sent[OWN()].find(y=>y.id===id).replies.push({from:e.to.name,email:e.to.email,at:new Date().toISOString(),text:txt,postedTo:where,seen:true}); });
        toast('Reply received by email and posted to '+where); drawDetail(id); }; }

    /* ----- drafts ----- */
    function drawDrafts(body){ const L=drafts();
      body.innerHTML=`${L.length?`<div class="em-list">${L.map(d=>`<div class="em-r" style="cursor:default"><span class="em-st">Draft</span><span class="em-ri"><b>${esc(d.subject||'(No subject)')}</b><i>To ${esc((d.to||[]).map(r=>r.name||r.email).join(', ')||'no one yet')} · edited ${fDT(d.updated)}</i></span><span class="em-row" style="margin:0"><button class="pp-btn ghost sm" data-dopen="${esc(d.id)}">Open</button><button class="pp-link danger" data-ddel="${esc(d.id)}">Delete</button></span></div>`).join('')}</div>`:'<div class="em-empty">No drafts. Emails you save without sending appear here.</div>'}`;
      body.querySelectorAll('[data-dopen]').forEach(b=>b.onclick=()=>compose({draft:drafts().find(d=>d.id===b.dataset.dopen)}));
      body.querySelectorAll('[data-ddel]').forEach(b=>b.onclick=()=>{ if(!confirm('Delete this draft?')) return; upd(o=>{ o.drafts[OWN()]=(o.drafts[OWN()]||[]).filter(d=>d.id!==b.dataset.ddel); }); toast('Draft deleted'); draw(); }); }
    /* ----- saved replies ----- */
    function drawSnips(body){ const L=snips();
      body.innerHTML=`<p class="em-lede">Reusable text you can drop into any email you write. Different from Templates, which are the emails the platform sends automatically.</p>
        <div class="em-snips">${L.map(s=>`<div class="em-panel em-snip"><input class="em-sn" data-snn="${esc(s.id)}" value="${esc(s.name)}"><textarea data-snb="${esc(s.id)}" rows="5">${esc(s.body)}</textarea><div class="em-row" style="margin-top:6px"><button class="pp-link danger" data-sndel="${esc(s.id)}">Delete</button></div></div>`).join('')}
          <button class="em-snadd" data-snadd>+ Add saved reply</button></div>
        <div class="em-fields" style="margin-top:12px"><span>Use</span><button type="button" disabled>recipient.first</button><span style="text-transform:none;letter-spacing:0;font-weight:600">to fill in the first name of the person you’re writing to.</span></div>`;
      const put=fn=>{ upd(o=>{ o.snips[OWN()]=o.snips[OWN()]||snips(); fn(o.snips[OWN()]); }); };
      body.querySelectorAll('[data-snn]').forEach(i=>i.onchange=()=>{ put(L2=>{ L2.find(s=>s.id===i.dataset.snn).name=i.value.trim()||'Saved reply'; }); toast('Saved'); });
      body.querySelectorAll('[data-snb]').forEach(i=>i.onchange=()=>{ put(L2=>{ L2.find(s=>s.id===i.dataset.snb).body=i.value; }); toast('Saved'); });
      body.querySelectorAll('[data-sndel]').forEach(b=>b.onclick=()=>{ if(!confirm('Delete this saved reply?')) return; put(L2=>{ L2.splice(L2.findIndex(s=>s.id===b.dataset.sndel),1); }); draw(); });
      body.querySelector('[data-snadd]').onclick=()=>{ put(L2=>L2.push({id:'s'+Date.now().toString(36),name:'New saved reply',body:'Hi {{recipient.first}},\n\n'})); draw(); }; }

    /* ----- templates ----- */
    function drawTemplates(body){ if(S.tpl) return drawTpl(body,S.tpl);
      const list=TPL.filter(t=>isAdmin()||t.scope!=='platform'), cats=CATS.filter(([k])=>list.some(t=>t.cat===k)), off=(db().tpl[OWN()]||{});
      body.innerHTML=`<p class="em-lede">${isAdmin()?'These are the platform defaults. Distributors see the same emails and can change the wording and turn some off for their customers.':'Every email the platform sends for Mojo Promotions. Change the wording, or turn off emails you don’t want sent. Anything you don’t change follows Merchsmith’s default.'}</p>
        ${cats.map(([k,l])=>`<div class="em-cat"><h4>${l}</h4>${list.filter(t=>t.cat===k).map(t0=>{ const t=tplFor(t0.id), on=t.enabled!==false;
          return `<button class="em-tr" data-etpl="${t0.id}"><span class="em-ti"><b>${esc(t.name)}</b><i>${esc(t.when)} · to ${esc(t.aud)}</i></span>
            <span class="em-rm">${t.reply?'<span class="em-pill r">Reply by email</span>':''}${t.custom?'<span class="em-pill c">Customised</span>':''}${!on?'<span class="em-pill off">Off</span>':''}${t.locked?'<span class="em-pill">Required</span>':''}</span><span class="em-chev">›</span></button>`; }).join('')}</div>`).join('')}`;
      body.querySelectorAll('[data-etpl]').forEach(b=>b.onclick=()=>{ S.tpl=b.dataset.etpl; draw(); }); }
    function drawTpl(body,id){ const t=tplFor(id), base=TPL.find(x=>x.id===id);
      body.innerHTML=`<button class="pp-link" data-eback>‹ All templates</button>
        <div class="em-tpl"><div class="em-panel"><div class="em-ph"><h3>${esc(t.name)}</h3>${t.locked?'<span class="em-pill">Required · can’t be turned off</span>':`<label class="em-chk"><input type="checkbox" data-eon${t.enabled!==false?' checked':''}> Send this email</label>`}</div>
          <p class="em-sm" style="margin:0 0 12px">${esc(t.when)} · to ${esc(t.aud)}</p>
          <label class="em-f"><span>Subject</span><input data-es value="${esc(t.subject)}"></label>
          <label class="em-f"><span>Message</span><textarea data-eb rows="9">${esc(t.body)}</textarea></label>
          <label class="em-f"><span>Button label</span><input data-ec value="${esc(t.cta||'')}"></label>
          <div class="em-fields"><span>Insert</span>${FIELDS(base).concat(['{{recipient.first}}','{{sender.org}}']).filter((v,i,a)=>a.indexOf(v)===i).map(f=>`<button type="button" data-eins="${f}">${f.replace(/[{}]/g,'')}</button>`).join('')}</div>
          <div class="em-row" style="margin-top:14px"><button class="pp-btn" data-esave>Save</button><button class="pp-btn ghost" data-etest>Send me a test</button>${!isAdmin()&&t.custom?'<button class="pp-link" data-ereset>Reset to Merchsmith default</button>':''}</div>
          ${isAdmin()?'<p class="em-sm">Changes apply to every distributor who hasn’t customised this email.</p>':''}</div>
        <div><h5 class="em-pvh">Preview <em>with example details</em></h5><div data-epv>${renderEmail(t)}</div></div></div>`;
      const g=s=>body.querySelector(s), live=()=>{ g('[data-epv]').innerHTML=renderEmail(Object.assign({},t,{subject:g('[data-es]').value,body:g('[data-eb]').value,cta:g('[data-ec]').value})); };
      ['[data-es]','[data-eb]','[data-ec]'].forEach(s=>g(s).oninput=live);
      let last=g('[data-eb]'); ['[data-es]','[data-eb]'].forEach(s=>g(s).onfocus=()=>{ last=g(s); });
      body.querySelectorAll('[data-eins]').forEach(b=>b.onclick=()=>{ const el=last, p=el.selectionStart??el.value.length; el.value=el.value.slice(0,p)+b.dataset.eins+el.value.slice(el.selectionEnd??p); el.focus(); el.setSelectionRange(p+b.dataset.eins.length,p+b.dataset.eins.length); live(); });
      g('[data-eback]').onclick=()=>{ S.tpl=null; draw(); };
      g('[data-esave]').onclick=()=>{ const v={subject:g('[data-es]').value.trim()||base.subject,body:g('[data-eb]').value.trim()||base.body,cta:g('[data-ec]').value.trim()}; const on=g('[data-eon]');
        if(on) v.enabled=on.checked; upd(o=>{ o.tpl[OWN()]=o.tpl[OWN()]||{}; o.tpl[OWN()][id]=Object.assign(o.tpl[OWN()][id]||{},v); }); toast(isAdmin()?'Platform default saved':'Saved for Mojo Promotions'); drawTpl(body,id); };
      const on=g('[data-eon]'); if(on) on.onchange=()=>{ upd(o=>{ o.tpl[OWN()]=o.tpl[OWN()]||{}; o.tpl[OWN()][id]=Object.assign(o.tpl[OWN()][id]||{},{enabled:on.checked}); }); toast(on.checked?'This email will be sent':'This email is turned off'); };
      g('[data-etest]').onclick=()=>{ const me=window.MSChat&&MSChat.me?MSChat.me():null; toast('Test sent to '+((me&&me.email)||(isAdmin()?'morgan@merchsmith.com':'jess@mojopromotions.co.uk'))); };
      const rs=g('[data-ereset]'); if(rs) rs.onclick=()=>{ if(!confirm('Go back to Merchsmith’s default wording for this email?')) return; upd(o=>{ delete (o.tpl.mojo||{})[id]; }); toast('Reset to default'); drawTpl(body,id); }; }

    /* ----- sending domain ----- */
    function drawDomain(body){ const d=domainOf(), dom=ORG().domain, v=d.status==='verified';
      const recs=[['TXT','@','v=spf1 include:spf.merchsmith-mail.com ~all','SPF · lets Merchsmith send for your domain'],['CNAME','ms1._domainkey','ms1.dkim.merchsmith-mail.com','DKIM · signs your emails'],['CNAME','ms2._domainkey','ms2.dkim.merchsmith-mail.com','DKIM · second key'],['TXT','_dmarc','v=DMARC1; p=none; rua=mailto:dmarc@merchsmith-mail.com','DMARC · reporting'],['MX',d.replySub,'10 inbound.merchsmith-mail.com','Receives replies at '+d.replySub+'.'+dom]];
      body.innerHTML=`<div class="em-cols"><div class="em-panel"><h3>Who emails come from</h3>
          <div class="em-from"><span>Customers see</span><b>${esc(fromLine())}</b></div>
          <div class="em-grid"><label class="em-f"><span>From name</span><input data-dn value="${esc(d.fromName)}"></label>
            <label class="em-f"><span>From address</span><div class="em-addr"><input data-dl value="${esc(d.local)}"><span>@${esc(dom)}</span></div></label></div>
          <div class="em-row"><button class="pp-btn sm" data-dsave>Save</button></div>
          <p class="em-sm">${v?`Sending from ${esc(dom)} is on. Replies come back through ${esc(d.replySub)}.${esc(dom)}.`:`Until ${esc(dom)} is verified, emails go from notifications@merchsmith.com with your name on them, and replies come back through reply.merchsmith.com.`}</p></div>
        <div class="em-panel"><div class="em-ph"><h3>${esc(dom)}</h3><span class="em-st s-${v?'opened':'pending'}">${v?'Verified':'Not verified yet'}</span></div>
          ${isAdmin()?'<p class="em-sm" style="margin:0">The platform domain. Distributors verify their own domains here in their account.</p>':`<p class="em-sm" style="margin:0 0 10px">Add these records where you manage ${esc(dom)} (the same place as your store domain), then check. It can take up to 48 hours to update.</p>
          <div class="em-dns">${recs.map(([ty,h,val,why])=>`<div class="em-dr"><span class="em-ty">${ty}</span><span class="em-dv"><b>${esc(h)}</b><code>${esc(val)}</code><i>${esc(why)}</i></span><button class="pp-link" data-dcopy="${esc(val)}">Copy</button><span class="em-ok${v?' on':''}">${v?'✓':'…'}</span></div>`).join('')}</div>
          <div class="em-row"><button class="pp-btn sm" data-dcheck>${v?'Check again':'Check records'}</button>${d.checkedAt?`<span class="em-sm" style="margin:0">Last checked ${fDT(d.checkedAt)}</span>`:''}</div>`}</div></div>`;
      const put=p=>upd(o=>{ o.domain[OWN()]=Object.assign(domainOf(),p); });
      body.querySelector('[data-dsave]').onclick=()=>{ const n=body.querySelector('[data-dn]').value.trim(), l=body.querySelector('[data-dl]').value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');
        if(!n||!l) return toast('Add a from name and address'); put({fromName:n,local:l}); toast('Saved'); draw(); };
      body.querySelectorAll('[data-dcopy]').forEach(b=>b.onclick=()=>{ try{ navigator.clipboard.writeText(b.dataset.dcopy); }catch(e){} toast('Copied'); });
      const ck=body.querySelector('[data-dcheck]'); if(ck) ck.onclick=()=>{ ck.disabled=true; ck.textContent='Checking…'; setTimeout(()=>{ put({status:'verified',checkedAt:new Date().toISOString()}); toast(dom+' verified. Emails now come from your domain.'); draw(); },1200); }; }

    /* ----- reply by email ----- */
    function drawReply(body){ const r=replyCfg(), ex=replyAddr('example');
      body.innerHTML=`<div class="em-cols"><div class="em-panel"><div class="em-ph"><h3>Reply by email</h3><button class="em-sw${r.on?' on':''}" data-ron aria-label="Reply by email on or off"></button></div>
          <p class="em-lede">People can reply to platform emails from Outlook, Gmail or any inbox. Their reply goes straight into the right place here, so customers who rarely log in can still take part.</p>
          <ol class="em-how"><li><b>Each email gets its own reply address</b><span>e.g. <code>${esc(ex)}</code></span></li><li><b>Someone replies from their inbox</b><span>We match the address to the chat, project, order or invoice it was about.</span></li><li><b>The reply appears in the platform</b><span>Posted as a message from them, and you’re notified as usual.</span></li></ol>
          <p class="em-sm">Emails that accept replies are marked “Reply by email” in Templates.</p></div>
        <div class="em-panel"><h3>Rules</h3>
          <label class="em-chk"><input type="checkbox" data-rc="strip"${r.strip?' checked':''}> Remove quoted text and signatures from replies</label>
          <label class="em-chk"><input type="checkbox" data-rc="forward"${r.forward?' checked':''}> Also forward replies to the person who sent the email</label>
          <label class="em-f" style="margin-top:6px"><span>Replies from an address we don’t recognise</span><select data-ru><option value="hold"${r.unknown==='hold'?' selected':''}>Hold for an admin to check</option><option value="post"${r.unknown==='post'?' selected':''}>Post them anyway, marked as unverified</option><option value="reject"${r.unknown==='reject'?' selected':''}>Reject and tell the sender</option></select></label>
          <p class="em-sm">Attachments in replies are added to the record, up to 20 MB each. Replies to emails older than 90 days are held for review.</p></div></div>`;
      const put=p=>{ upd(o=>{ o.reply[OWN()]=Object.assign(replyCfg(),p); }); toast('Saved'); draw(); };
      body.querySelector('[data-ron]').onclick=()=>put({on:!r.on});
      body.querySelectorAll('[data-rc]').forEach(c=>c.onchange=()=>put({[c.dataset.rc]:c.checked}));
      body.querySelector('[data-ru]').onchange=e=>put({unknown:e.target.value}); }

    /* ----- my emails ----- */
    function drawMine(body){ let sd=sigData(); const sd0=JSON.stringify(sd); const p=prefs(), mine=[['projects','Proofs, approvals and quotes'],['orders','Orders and deliveries'],['invoices','Invoices and payments'],['meetings','Meeting invitations, missed calls and voicemail'],['chat','Unread chat messages'],...(isAdmin()?[['platform','Distributor sign-ups and billing']]:[])];
      body.innerHTML=`<div class="em-panel em-sigb"><div class="em-ph"><h3>My signature</h3><span class="em-sm" style="margin:0">Added to emails you write. You can leave it off any email.</span></div>
          <div class="em-sigg"><div class="em-sigf">
            <h4 class="em-h4">Details</h4>
            <div class="em-grid2">${[['signoff','Sign-off'],['name','Name'],['title','Job title'],['company','Company'],['phone','Phone'],['mobile','Mobile'],['email','Email'],['website','Website']].map(([k2,l])=>`<label class="em-f"><span>${l}</span><input data-sg="${k2}" value="${esc(sd[k2])}"></label>`).join('')}</div>
            <label class="em-f"><span>Address <em class="em-opt">optional</em></span><input data-sg="address" value="${esc(sd.address)}" placeholder="e.g. 12 Mill Street, Manchester M4 6BY"></label>
            <div class="em-grid2">${[['linkedin','LinkedIn'],['instagram','Instagram'],['x','X']].map(([k2,l])=>`<label class="em-f"><span>${l} <em class="em-opt">optional</em></span><input data-sg="${k2}" value="${esc(sd[k2])}" placeholder="${k2==='linkedin'?'linkedin.com/in/…':k2==='instagram'?'instagram.com/…':'x.com/…'}"></label>`).join('')}</div>
            <h4 class="em-h4">Style</h4>
            <div class="em-so"><span>Layout</span><div class="em-seg">${[['logo','Logo left'],['stacked','Logo on top'],['text','Text only'],['line','One line']].map(([v2,l])=>`<button type="button" data-sgs="layout" data-v="${v2}" class="${sd.layout===v2?'on':''}">${l}</button>`).join('')}</div></div>
            <div class="em-so"><span>Accent</span><div class="em-seg">${[['brand','Brand colour'],['ink','Black'],['grey','Grey']].map(([v2,l])=>`<button type="button" data-sgs="accent" data-v="${v2}" class="${sd.accent===v2?'on':''}">${l}</button>`).join('')}</div></div>
            <div class="em-so"><span>Text size</span><div class="em-seg">${[['s','Small'],['m','Medium'],['l','Large']].map(([v2,l])=>`<button type="button" data-sgs="size" data-v="${v2}" class="${sd.size===v2?'on':''}">${l}</button>`).join('')}</div></div>
            <div class="em-so"><span>Show</span><div class="em-chkrow"><label class="em-chk"><input type="checkbox" data-sgc="logo"${sd.logo?' checked':''}> Company logo</label><label class="em-chk"><input type="checkbox" data-sgc="photo"${sd.photo?' checked':''}> My photo</label><label class="em-chk"><input type="checkbox" data-sgc="divider"${sd.divider?' checked':''}> Accent line</label></div></div>
          </div>
          <div class="em-sigpv"><h5 class="em-pvh">Preview</h5><div class="em-sigcard" data-sgpv>${sigHTML(sd)}</div>
            <p class="em-sm">The logo comes from your organisation profile; your photo from My profile. Plain-text emails use a text version of your signature.</p>
            <div class="em-row"><button class="pp-btn sm" data-sgsave disabled>Save signature</button><button class="pp-link" data-sgreset>Reset</button></div></div></div></div>
        <div class="em-cols"><div class="em-panel"><h3>Emails I get</h3><p class="em-sm" style="margin:0 0 8px">Account and security emails are always sent.</p>
          ${mine.map(([k,l])=>`<label class="em-chk"><input type="checkbox" data-mc="${k}"${p.cats[k]!==false?' checked':''}> ${l}</label>`).join('')}</div>
        <div class="em-panel"><h3>Unread messages</h3><label class="em-f"><span>Email me about unread chat messages</span><select data-md>${[['0','Straight away'],['30','After 30 minutes'],['60','Once an hour'],['day','Once a day, at 8:00'],['off','Never']].map(([v,l])=>`<option value="${v}"${p.digest===v?' selected':''}>${l}</option>`).join('')}</select></label>
          <p class="em-sm">You can reply to these emails to answer in the chat.</p></div></div>`;
      const put=x=>{ upd(o=>{ o.prefs[OWN()]=Object.assign(prefs(),x); }); toast('Saved'); };
      body.querySelectorAll('[data-mc]').forEach(c=>c.onchange=()=>put({cats:Object.assign({},prefs().cats,{[c.dataset.mc]:c.checked})}));
      body.querySelector('[data-md]').onchange=e=>put({digest:e.target.value});
      const pv=()=>{ body.querySelector('[data-sgpv]').innerHTML=sigHTML(sd); body.querySelector('[data-sgsave]').disabled=JSON.stringify(sd)===sd0; };
      body.querySelectorAll('[data-sg]').forEach(i=>i.oninput=()=>{ sd[i.dataset.sg]=i.value; pv(); });
      body.querySelectorAll('[data-sgs]').forEach(b=>b.onclick=()=>{ sd[b.dataset.sgs]=b.dataset.v; body.querySelectorAll('[data-sgs="'+b.dataset.sgs+'"]').forEach(x=>x.classList.toggle('on',x===b)); pv(); });
      body.querySelectorAll('[data-sgc]').forEach(c=>c.onchange=()=>{ sd[c.dataset.sgc]=c.checked; pv(); });
      body.querySelector('[data-sgsave]').onclick=()=>{ upd(o=>{ o.prefs[OWN()]=Object.assign(prefs(),{sigD:sd}); }); toast('Signature saved'); drawMine(body); };
      body.querySelector('[data-sgreset]').onclick=()=>{ upd(o=>{ const x=Object.assign(prefs()); delete x.sigD; o.prefs[OWN()]=x; }); toast('Signature reset'); drawMine(body); }; }

    draw(); REDRAW=()=>{ if(!document.querySelector('#emDrawer.on')) draw(); };
    window.addEventListener('hashchange',()=>{ const t=(location.hash.match(/tab=(\w+)/)||[])[1]; if(t&&t!==S.tab){ S.tab=t; S.tpl=null; draw(); } if(/compose/.test(location.hash)) compose(); });
    if(/compose/.test(location.hash)) setTimeout(()=>compose(),200);
  }

  const css=`
  .em-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(14px);background:var(--ink);color:#fff;font-size:13.5px;font-weight:600;padding:11px 18px;border-radius:11px;opacity:0;transition:opacity .2s,transform .2s;z-index:1600;pointer-events:none;} .em-toast.on{opacity:1;transform:translateX(-50%);}
  .em-tabs{display:flex;gap:4px;border-bottom:1px solid var(--line-soft);margin:22px 0 18px;overflow-x:auto;scrollbar-width:none;} .em-tabs::-webkit-scrollbar{display:none;}
  .em-tab{flex:none;white-space:nowrap;border:0;background:none;font:inherit;font-size:14.5px;font-weight:700;color:var(--ink-3);padding:11px 16px;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px;display:flex;align-items:center;gap:7px;} .em-tab.on{color:var(--periwinkle-deep);border-bottom-color:var(--periwinkle-deep);}
  .em-tab b{background:var(--flare);color:#fff;font-size:10.5px;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;}
  .em-card,.em-panel{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:18px 20px;} .em-card h4,.em-panel h3{font-family:var(--serif);font-weight:500;font-size:21px;margin:0 0 6px;}
  .em-sm{font-size:12.5px;color:var(--text-soft);line-height:1.5;margin:8px 0 0;} .em-lede{font-size:13.5px;color:var(--text-soft);line-height:1.55;margin:0 0 14px;max-width:72ch;}
  .em-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;}
  .em-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px;} @media(max-width:640px){.em-stats{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .em-stats>div{background:#fff;border:1px solid var(--line-soft);border-top:3px solid var(--periwinkle);border-radius:12px;padding:11px 14px;} .em-stats>div:nth-child(2){border-top-color:var(--spearmint);} .em-stats>div:nth-child(3){border-top-color:var(--sky);} .em-stats>div:nth-child(4){border-top-color:var(--flare);}
  .em-stats b{display:block;font-family:var(--serif);font-weight:500;font-size:24px;} .em-stats span{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
  .em-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px;}
  .em-seg{display:flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;background:#fff;} .em-seg button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:7px 12px;cursor:pointer;white-space:nowrap;} .em-seg button+button{border-left:1.5px solid var(--line-soft);} .em-seg button.on{background:var(--ink);color:#fff;}
  .em-search{flex:1;min-width:220px;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;}
  .em-list{background:#fff;border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;}
  .em-r{display:flex;align-items:center;gap:12px;width:100%;border:0;border-top:1px solid var(--paper-2);background:none;font:inherit;text-align:left;padding:12px 16px;cursor:pointer;color:var(--ink);} .em-r:first-child{border-top:0;} .em-r:hover,.em-r.sel{background:var(--paper);}
  .em-st{flex:none;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:6px;padding:3px 8px;width:82px;text-align:center;background:var(--paper-2);color:var(--ink-3);}
  .em-st.s-opened{background:var(--tint-green);color:var(--green-deep);} .em-st.s-delivered{background:var(--tint-peri);color:var(--periwinkle-ink);} .em-st.s-bounced{background:var(--tint-red);color:#b4232c;} .em-st.s-pending{background:#fbeccd;color:#9a6b1f;width:auto;}
  .em-ri{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;} .em-ri b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .em-ri i{font-style:normal;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .em-rm{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:320px;} @media(max-width:760px){.em-rm{display:none;}}
  .em-pill{font-size:11px;font-weight:700;border-radius:6px;padding:3px 8px;background:var(--paper);color:var(--ink-3);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;}
  .em-pill.r{background:#e8f0fe;color:#1a56c4;} .em-pill.r.new::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--flare);margin-right:5px;vertical-align:1px;} .em-pill.c{background:var(--tint-peri);color:var(--periwinkle-ink);} .em-pill.off{background:var(--paper-2);color:var(--muted);}
  .em-rt{width:100px;text-align:right;font-size:12px;color:var(--muted);flex:none;}
  .em-empty{padding:40px;text-align:center;color:var(--muted);font-size:14px;}
  .em-drawer{position:fixed;inset:0;z-index:1400;display:none;} .em-drawer.on{display:block;} .em-scrim{position:absolute;inset:0;background:rgba(20,22,45,.28);}
  .em-dp{position:absolute;top:0;right:0;bottom:0;width:min(580px,100%);background:#fff;overflow:auto;padding:22px 24px 30px;box-shadow:-12px 0 40px rgba(20,22,45,.18);}
  .em-dh{display:flex;gap:12px;align-items:flex-start;} .em-dh>div{flex:1;display:flex;flex-direction:column;gap:4px;} .em-dh b{font-family:var(--serif);font-weight:500;font-size:22px;line-height:1.2;} .em-dh span{font-size:13px;color:var(--muted);} .em-x{border:0;background:none;font-size:26px;color:var(--muted);cursor:pointer;}
  .em-tl{display:flex;gap:6px 18px;flex-wrap:wrap;margin:14px 0;} .em-tl>span{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted);} .em-tl>span i{width:9px;height:9px;border-radius:50%;background:var(--line);} .em-tl>span.on{color:var(--ink-2);font-weight:700;} .em-tl>span.on i{background:var(--green-deep);}
  .em-bounce{flex:1;display:grid;grid-template-columns:1fr auto;gap:2px 12px;align-items:center;background:var(--tint-red);border-radius:12px;padding:11px 13px;} .em-bounce b{color:#b4232c;} .em-bounce span{grid-column:1;font-size:12.5px;color:var(--ink-2);} .em-bounce button{grid-row:1/3;grid-column:2;}
  .em-link{display:flex;gap:10px;font-size:13px;margin-bottom:6px;} .em-link span{color:var(--muted);font-weight:700;} .em-link a{font-weight:700;text-decoration:none;}
  .em-dp h5,.em-pvh{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:20px 0 8px;} .em-pvh{margin-top:0;} .em-pvh em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);margin-left:4px;}
  .em-reply{background:var(--paper);border-radius:12px;padding:11px 13px;margin-bottom:8px;} .em-rh{display:flex;justify-content:space-between;font-size:13px;} .em-rh span{color:var(--muted);font-size:12px;} .em-reply p{margin:6px 0;font-size:13.5px;line-height:1.5;} .em-reply em{font-style:normal;font-size:12px;font-weight:700;color:var(--green-deep);}
  .em-mail{border:1px solid var(--line-soft);border-radius:14px;overflow:hidden;background:#f6f6f8;font-family:var(--sans);}
  .em-mh{background:var(--periwinkle-deep);padding:16px 22px;} .em-mhl img{height:26px;width:auto;display:block;filter:brightness(0) invert(1);} .em-mhl b{color:#fff;font-size:17px;}
  .em-mb{background:#fff;margin:0 14px;padding:22px 24px;font-size:14px;line-height:1.6;color:var(--ink-2);} .em-mb h3{font-family:var(--serif);font-weight:500;font-size:22px;line-height:1.2;color:var(--ink);margin:0 0 12px;} .em-mb p{margin:0 0 12px;}
  .em-cta{display:inline-block;background:var(--periwinkle-deep);color:#fff;font-weight:800;font-size:14px;border-radius:10px;padding:11px 20px;margin:4px 0 8px;}
  .em-rp{font-size:12.5px!important;color:var(--muted);border-top:1px solid var(--paper-2);padding-top:12px;margin-top:10px!important;}
  .em-mf{padding:14px 22px 18px;font-size:11.5px;color:var(--muted);line-height:1.6;text-align:center;}
  .em-meta{display:flex;flex-direction:column;gap:3px;margin-top:8px;font-size:12px;color:var(--ink-3);word-break:break-all;} .em-meta b{color:var(--ink-2);margin-right:4px;}
  .em-cat{margin-bottom:16px;} .em-cat h4{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:0 0 6px;}
  .em-tr{display:flex;align-items:center;gap:12px;width:100%;background:#fff;border:1px solid var(--line-soft);border-radius:12px;font:inherit;text-align:left;padding:12px 14px;margin-bottom:6px;cursor:pointer;color:var(--ink);} .em-tr:hover{border-color:var(--periwinkle);}
  .em-ti{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;} .em-ti b{font-size:14px;} .em-ti i{font-style:normal;font-size:12px;color:var(--muted);} .em-chev{font-size:20px;color:var(--muted);}
  .em-tpl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:12px;align-items:start;} @media(max-width:980px){.em-tpl{grid-template-columns:1fr;}}
  .em-ph{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:4px;}
  .em-f{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;} .em-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .em-f input,.em-f textarea,.em-f select{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;width:100%;} .em-f textarea{resize:vertical;line-height:1.5;}
  .em-fields{display:flex;flex-wrap:wrap;gap:5px;align-items:center;} .em-fields>span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin-right:4px;} .em-fields button{font:inherit;font-size:11.5px;font-weight:700;border:1px dashed var(--periwinkle);background:var(--tint-peri);color:var(--periwinkle-ink);border-radius:7px;padding:3px 8px;cursor:pointer;}
  .em-chk{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--ink-2);margin:8px 0;} .em-chk input{margin-top:3px;accent-color:var(--periwinkle-deep);}
  .em-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;align-items:start;}
  .em-from{display:flex;flex-direction:column;gap:3px;background:var(--paper);border-radius:12px;padding:11px 13px;margin:6px 0 14px;} .em-from span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);} .em-from b{font-size:14px;word-break:break-all;}
  .em-grid{display:grid;grid-template-columns:1fr;gap:0 12px;}
  .em-addr{display:flex;align-items:center;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;} .em-addr input{border:0!important;border-radius:0!important;flex:1;min-width:80px;} .em-addr span{flex:none;padding:0 10px;font-size:13px;color:var(--muted);white-space:nowrap;background:var(--paper);align-self:stretch;display:flex;align-items:center;}
  .em-dns{display:flex;flex-direction:column;border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;}
  .em-dr{display:grid;grid-template-columns:56px minmax(0,1fr) auto 22px;gap:10px;align-items:center;padding:10px 12px;border-top:1px solid var(--paper-2);font-size:12.5px;} .em-dr:first-child{border-top:0;}
  .em-ty{font-weight:800;font-size:11px;background:var(--paper-2);border-radius:6px;padding:3px 6px;text-align:center;} .em-dv{display:flex;flex-direction:column;gap:2px;min-width:0;} .em-dv code{font-size:11.5px;word-break:break-all;color:var(--ink-2);} .em-dv i{font-style:normal;font-size:11.5px;color:var(--muted);}
  .em-ok{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;background:var(--paper-2);color:var(--muted);} .em-ok.on{background:var(--tint-green);color:var(--green-deep);}
  .em-sw{width:46px;height:27px;border-radius:999px;background:var(--line);border:0;cursor:pointer;position:relative;flex:none;} .em-sw::after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.25);} .em-sw.on{background:var(--periwinkle-deep);} .em-sw.on::after{transform:translateX(19px);}
  .em-top{display:flex;justify-content:flex-end;margin:-6px 0 12px;}
  .em-tab i{font-style:normal;font-size:10.5px;background:var(--paper-2);color:var(--ink-3);border-radius:999px;padding:1px 7px;}
  .em-snips{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;} .em-snip{display:flex;flex-direction:column;gap:8px;padding:14px 16px;}
  .em-sn{font:inherit;font-size:15px;font-weight:800;border:0;border-bottom:1.5px solid transparent;padding:2px 0;} .em-sn:focus{outline:0;border-bottom-color:var(--periwinkle);}
  .em-snip textarea,.em-sig{font:inherit;font-size:13.5px;line-height:1.5;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;resize:vertical;width:100%;}
  .em-snadd{border:1.5px dashed var(--line);border-radius:16px;background:none;font:inherit;font-weight:800;color:var(--periwinkle-deep);cursor:pointer;min-height:120px;}
  .em-cp{width:min(680px,100%);display:flex;flex-direction:column;gap:0;}
  .em-cf{display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--paper-2);padding:6px 0;min-height:44px;} .em-cf>span{width:62px;flex:none;font-size:12.5px;font-weight:700;color:var(--muted);}
  .em-cf>input,.em-cf>select{flex:1;min-width:0;font:inherit;font-size:14px;border:0;padding:6px 0;background:none;} .em-cf>input:focus,.em-cf>select:focus{outline:0;}
  .em-chips{flex:1;display:flex;flex-wrap:wrap;gap:5px;align-items:center;min-width:0;} .em-chips input{flex:1;min-width:160px;font:inherit;font-size:14px;border:0;padding:5px 0;background:none;} .em-chips input:focus{outline:0;}
  .em-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:700;background:var(--tint-peri);color:var(--periwinkle-ink);border-radius:999px;padding:3px 5px 3px 10px;max-width:100%;} .em-chip.bad{background:var(--tint-red);color:#b4232c;} .em-chip button{border:0;background:none;cursor:pointer;color:inherit;font-size:14px;line-height:1;}
  .em-tb{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:8px 0;} .em-tb button{font:inherit;font-size:12.5px;border:1px solid var(--line-soft);background:#fff;border-radius:8px;padding:5px 10px;cursor:pointer;color:var(--ink-2);} .em-tb select{font:inherit;font-size:12.5px;border:1px solid var(--line-soft);border-radius:8px;padding:5px 8px;background:#fff;} .em-tbs{flex:1;}
  .em-ed{min-height:220px;border:1.5px solid var(--line-soft);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;outline:0;} .em-ed:focus{border-color:var(--periwinkle);} .em-ed:empty::before{content:"Write your message…";color:var(--muted);}
  .em-ed p,.em-body p{margin:0 0 10px;} .em-ed ul,.em-body ul{margin:0 0 10px;padding-left:20px;}
  .em-sigbox{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0 0;} .em-sigp{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
  .em-attrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;} .em-attrow select{font:inherit;font-size:12.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 8px;background:#fff;} .em-atts{display:flex;flex-wrap:wrap;gap:5px;}
  .em-opts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px;} .em-opts input{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 8px;}
  .em-cerr{color:#b4232c;font-size:13px;font-weight:600;margin:10px 0 0;} .em-cerr[hidden],[data-ccrow][hidden],.em-opts [hidden]{display:none;}
  .em-cfoot{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:16px;padding-top:14px;border-top:1px solid var(--paper-2);} .em-cfoot>span{margin-right:auto!important;}
  .em-plain{border:1px solid var(--line-soft);border-radius:12px;background:#fff;padding:18px 20px;font-size:14px;line-height:1.6;color:var(--ink);}
  .em-sigr{margin-top:14px;font-size:13px;color:var(--ink-3);line-height:1.5;} .em-mb .em-atts,.em-plain .em-atts{margin-top:12px;} .em-atts>span{font-size:12px;font-weight:700;background:var(--paper);border:1px solid var(--line-soft);border-radius:8px;padding:4px 9px;}
  .em-sigb{margin-bottom:16px;} .em-sigg{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:24px;align-items:start;margin-top:10px;} @media(max-width:1000px){.em-sigg{grid-template-columns:1fr;}}
  .em-h4{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:6px 0 10px;} .em-sigf .em-h4:not(:first-child){margin-top:14px;}
  .em-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px;} @media(max-width:560px){.em-grid2{grid-template-columns:1fr;}} .em-opt{font-style:normal;font-weight:500;color:var(--muted);}
  .em-so{display:grid;grid-template-columns:78px 1fr;gap:10px;align-items:center;margin-bottom:10px;} .em-so>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .em-so .em-seg{width:max-content;max-width:100%;flex-wrap:wrap;}
  .em-chkrow{display:flex;gap:4px 16px;flex-wrap:wrap;} .em-chkrow .em-chk{margin:0;}
  .em-sigpv{position:sticky;top:90px;} .em-sigcard{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:22px 24px;min-height:120px;} .em-sigr .em-sigh{margin-top:4px;}
  .em-lnk{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 8px;} .em-lnk[hidden]{display:none;} .em-lnk input{flex:1;min-width:200px;font:inherit;font-size:13.5px;border:1.5px solid var(--periwinkle);border-radius:9px;padding:7px 10px;}
  .em-how{margin:0 0 6px;padding:0;list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:10px;} .em-how li{counter-increment:s;display:grid;grid-template-columns:28px 1fr;gap:2px 10px;} .em-how li::before{content:counter(s);grid-row:1/3;width:28px;height:28px;border-radius:50%;background:var(--periwinkle-deep);color:#fff;font-size:13px;font-weight:800;display:grid;place-items:center;}
  .em-how b{font-size:14px;} .em-how span{font-size:12.5px;color:var(--text-soft);} .em-how code{font-size:11.5px;background:var(--paper);border-radius:5px;padding:1px 5px;word-break:break-all;}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { mount, compose };
})();
