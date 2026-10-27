/* ============================================================
   chat.js — platform chat. Loaded on every page by chrome.js.

   · Directory: every person on the platform, by organisation.
   · Contact rules (who may message whom) — see canChat():
       own organisation ............................ always
       distributor ↔ its customers' users ......... yes
       distributor ↔ suppliers it has approved .... yes
       Merchsmith  ↔ distributors and suppliers ... yes (support)
       customer    ↔ other customers / suppliers .. no
       distributor ↔ other distributors .......... no
   · Conversations: 1-to-1, groups, and project threads.
   · Persistence: localStorage('ms-chat-v2'). Because every identity in this
     browser shares that store, switching "Viewing as" shows the other side
     of the same conversation — and two tabs stay in sync live via the
     storage event (which is also what drives the typing indicator).
   · Extras: unread badges, read receipts, typing, attachments, links to a
     product or project, history search, mute.

   window.MSChat: open(), openPerson(id), openConv(id), openProfile(id),
     mount(el) for the full Chats page, me(), contacts(), convs(), people
   ============================================================ */
(function(){
  if(window.MSChat) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------------- directory ---------------- */
  const ORGS={
    ms:        {name:'Merchsmith',       type:'merchsmith'},
    mojo:      {name:'Mojo Promotions',  type:'distributor'},
    nstar:     {name:'NorthStar Merch',  type:'distributor'},
    citrix:    {name:'Citrix',           type:'customer', dist:'mojo'},
    northwind: {name:'Northwind Ltd',    type:'customer', dist:'mojo'},
    bagworks:  {name:'BagWorks UK',      type:'supplier', supplies:['mojo']},
    printhouse:{name:'PrintHouse Studio',type:'supplier', supplies:['mojo','nstar']},
    pf:        {name:'PF Concept',       type:'supplier', supplies:['mojo','nstar']}
  };
  const PEOPLE=[
    {id:'morgan', name:'Morgan Slade',   title:'Platform operator',   org:'ms'},
    {id:'priyar', name:'Priya Raman',    title:'Platform support',    org:'ms'},
    {id:'tomw',   name:'Tom Whitfield',  title:'Supplier success',    org:'ms'},
    {id:'jess',   name:'Jess Doyle',     title:'Account admin',       org:'mojo', photo:'assets/avatars/av1.jpg'},
    {id:'cara',   name:'Cara Lyon',      title:'Account manager',     org:'mojo'},
    {id:'raf',    name:'Raf Price',      title:'Senior designer',     org:'mojo'},
    {id:'ben',    name:'Ben Shaw',       title:'Account manager',     org:'mojo'},
    {id:'mara',   name:'Mara Whitfield', title:'Finance',             org:'mojo'},
    {id:'dana',   name:'Dana Cole',      title:'Managing director',   org:'nstar'},
    {id:'sara',   name:'Sara Kemp',      title:'Brand admin',         org:'citrix', photo:'assets/avatars/av2.jpg'},
    {id:'leo',    name:'Leo Tran',       title:'Marketing Coordinator',    org:'citrix'},
    {id:'hana',   name:'Hana Ito',       title:'Head of brand',       org:'northwind'},
    {id:'tomr',   name:'Tom Reed',       title:'Production',          org:'bagworks', photo:'assets/avatars/av3.jpg'},
    {id:'eve',    name:'Eve Marsh',      title:'Account manager',     org:'bagworks'},
    {id:'sarah',  name:'Sarah Hill',     title:'Account manager',     org:'printhouse'},
    {id:'emile',  name:'Émile Dubois',   title:'Account manager',     org:'pf'}
  ];
  const ME_BY_ROLE={admin:'morgan', distributor:'jess', customer:'sara', supplier:'tomr'};
  // People added from organisation panels (anyone not in the seeded roster) persist here,
  // so their conversations still resolve after a reload.
  const XKEY='ms-chat-extra';
  const slug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  (function(){ try{ const x=JSON.parse(localStorage.getItem(XKEY)||'null'); if(!x) return;
    Object.assign(ORGS,x.orgs||{}); (x.people||[]).forEach(p=>{ if(!PEOPLE.some(q=>q.id===p.id)) PEOPLE.push(p); }); }catch(e){} })();
  function saveExtra(o,p){ try{ const x=JSON.parse(localStorage.getItem(XKEY)||'null')||{orgs:{},people:[]};
    if(o) x.orgs[o.k]=o.v; if(p&&!x.people.some(q=>q.id===p.id)) x.people.push(p);
    localStorage.setItem(XKEY,JSON.stringify(x)); }catch(e){} }
  const ACC=['#7b85c5','#51768c','#c66a4a','#3a9d6b','#8246af','#2f8f5b','#b06f00','#d2453a'];
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  PEOPLE.forEach(p=>{ p.accent=ACC[hash(p.id)%ACC.length]; p.online=hash(p.id+'on')%3!==0; });
  const person=id=>PEOPLE.find(p=>p.id===id);
  const orgOf=p=>ORGS[p&&p.org]||{};
  function meId(){ const r=(window.MSID&&MSID.current&&MSID.current())||'distributor'; return ME_BY_ROLE[r]||'jess'; }
  const me=()=>person(meId());

  function canChat(a,b){
    if(!a||!b||a.id===b.id) return false;
    const A=orgOf(a), B=orgOf(b);
    if(a.org===b.org) return true;
    const pair=(x,y)=>(A.type===x&&B.type===y)||(A.type===y&&B.type===x);
    const [d,o]=A.type==='distributor'?[a,b]:[b,a];
    if(pair('merchsmith','distributor')||pair('merchsmith','supplier')) return true;
    if(pair('distributor','customer')) return orgOf(o).dist===d.org;
    if(pair('distributor','supplier')) return (orgOf(o).supplies||[]).includes(d.org);
    return false;
  }
  const contacts=()=>{ const m=me(); return PEOPLE.filter(p=>canChat(m,p)); };

  /* ---------------- store ---------------- */
  const KEY='ms-chat-v2', TKEY='ms-chat-typing';
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } };
  let S=load(); if(!S){ S=seed(); try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){ toast('Storage is full — try a smaller attachment'); } }
  function seed(){
    const now=Date.now(), m=60000, h=60*m, d=24*h;
    const at=o=>new Date(now-o).toISOString();
    const s={convs:{},msgs:{},reads:{},mutes:{}};
    const add=(id,c,msgs)=>{ s.convs[id]=Object.assign({id,created:msgs.length?msgs[0].at:at(0)},c); s.msgs[id]=msgs.map((x,i)=>Object.assign({id:id+'-'+i},x)); };
    add('dm-jess-cara',{type:'dm',members:['jess','cara']},[
      {from:'jess',t:'Morning — has the studio sent the tote proof back yet?',at:at(3*h)},
      {from:'cara',t:'Just landed. They bumped the logo about 12% like we asked.',at:at(25*m)},
      {from:'cara',t:'Proof’s back from studio 👍',at:at(2*m)}]);
    add('dm-jess-sara',{type:'dm',members:['jess','sara']},[
      {from:'jess',t:'The recycled cotton tote proof is ready for you to approve.',at:at(6*h)},
      {from:'sara',t:'Approved — thanks Jess! Can we push delivery to the 14th?',at:at(5*h)},
      {from:'jess',t:'Yes, confirmed with the supplier for the 14th.',at:at(4*h)}]);
    add('dm-jess-tomr',{type:'dm',members:['jess','tomr']},[
      {from:'jess',t:'Can you hold 500 of the jute bags for us?',at:at(d+2*h)},
      {from:'tomr',t:'Stock confirmed, reserving to Friday.',at:at(d)}]);
    add('dm-jess-priyar',{type:'dm',members:['jess','priyar']},[
      {from:'jess',t:'Is the PF Concept feed syncing? A few prices look stale.',at:at(2*d)},
      {from:'priyar',t:'Looking now — their price file is from a different department. I’ll update you.',at:at(2*d-40*m)}]);
    add('grp-mojo-studio',{type:'group',title:'Mojo studio',members:['jess','cara','raf','ben']},[
      {from:'raf',t:'Uploading v2 of the mouse artwork now.',at:at(50*m)},
      {from:'ben',t:'Nice — Lumen want it by Thursday.',at:at(41*m)},
      {from:'cara',t:'I’ll chase their brand guidelines today.',at:at(35*m)}]);
    add('prj-autumn',{type:'project',title:'Autumn Giveaways',project:'Autumn Giveaways',href:'Merchsmith Project - Autumn Giveaways.html',members:['jess','cara','sara','leo']},[
      {from:'leo',t:'Headcount for the autumn event is now 420, up from 350.',at:at(3*h)},
      {from:'cara',t:'Noted — I’ll update quantities on the drinkware lines.',at:at(2*h)},
      {from:'sara',t:'Can we add a notebook option too?',at:at(18*m)}]);
    add('dm-sara-leo',{type:'dm',members:['sara','leo']},[
      {from:'leo',t:'Did you see the new tote proof?',at:at(7*h)},
      {from:'sara',t:'Yes, approved it this morning.',at:at(5*h)}]);
    add('dm-tomr-eve',{type:'dm',members:['tomr','eve']},[
      {from:'eve',t:'Mojo want 500 jute bags held to Friday.',at:at(d+3*h)},
      {from:'tomr',t:'Done, reserved.',at:at(d+h)}]);
    add('dm-tomr-tomw',{type:'dm',members:['tomr','tomw']},[
      {from:'tomw',t:'Your feed mapping is 95% complete — just two fields left.',at:at(3*d)}]);
    add('dm-morgan-priyar',{type:'dm',members:['morgan','priyar']},[
      {from:'priyar',t:'PF Concept price feed is CNL2, product feed is CNL1 — no overlap.',at:at(2*d)},
      {from:'morgan',t:'Thanks — let’s ask them for a matched set.',at:at(2*d-20*m)}]);
    // everyone has read everything except a little for the demo identities
    Object.keys(s.convs).forEach(id=>{ const c=s.convs[id], last=s.msgs[id].slice(-1)[0];
      c.members.forEach(p=>{ (s.reads[p]=s.reads[p]||{})[id]=last?last.at:c.created; }); });
    s.reads.jess['dm-jess-cara']=at(30*m); s.reads.jess['prj-autumn']=at(h);
    s.reads.sara['prj-autumn']=at(h); s.reads.tomr['dm-tomr-tomw']=at(4*d);
    s.reads.cara['dm-jess-cara']=at(2*m);
    return s;
  }

  /* ---------------- queries ---------------- */
  const convs=()=>{ const id=meId(); return Object.values(S.convs).filter(c=>c.members.includes(id))
    .sort((a,b)=>new Date(lastAt(b))-new Date(lastAt(a))); };
  const msgsOf=id=>S.msgs[id]||[];
  const lastMsg=id=>msgsOf(id).slice(-1)[0];
  const lastAt=c=>{ const l=lastMsg(c.id); return l?l.at:c.created; };
  const readAt=(pid,cid)=>((S.reads[pid]||{})[cid])||'1970-01-01';
  const unreadOf=c=>msgsOf(c.id).filter(m=>!m.sys&&m.from!==meId()&&m.at>readAt(meId(),c.id)).length;
  const isMuted=c=>(S.mutes[meId()]||[]).includes(c.id);
  const totalUnread=()=>convs().filter(c=>!isMuted(c)).reduce((a,c)=>a+unreadOf(c),0);
  function titleOf(c){ if(c.type!=='dm') return c.title||'Group';
    const o=person(c.members.find(x=>x!==meId())); return o?o.name:'Conversation'; }
  const otherOf=c=>c.type==='dm'?person(c.members.find(x=>x!==meId())):null;
  function markRead(c){ const l=lastMsg(c.id); if(!l) return; (S.reads[meId()]=S.reads[meId()]||{})[c.id]=l.at; save(); }
  // rewind the read pointer to just before a message, so it and everything after read as unread
  const before=at=>new Date(new Date(at).getTime()-1).toISOString();
  function markUnreadFrom(c,m){ (S.reads[meId()]=S.reads[meId()]||{})[c.id]=before(m.at); save(); }
  function markConvUnread(c){ const ms=msgsOf(c.id).filter(m=>!m.sys&&!m.deleted);
    const lastOther=[...ms].reverse().find(m=>m.from!==meId())||ms[ms.length-1]; if(lastOther) markUnreadFrom(c,lastOther); }
  // opening a thread: remember where "New" starts before the pointer moves to the end
  function openRead(v,c){ v.newSince=unreadOf(c)?readAt(meId(),c.id):null; v.held=false; markRead(c); }
  // ✓ sent · ✓✓ read by every other member
  const seenByAll=(c,m)=>c.members.filter(p=>p!==m.from).every(p=>readAt(p,c.id)>=m.at);
  function dmWith(pid){ const id=meId();
    let c=Object.values(S.convs).find(x=>x.type==='dm'&&x.members.includes(id)&&x.members.includes(pid));
    if(!c){ const cid='dm-'+[id,pid].sort().join('-')+'-'+Date.now().toString(36);
      c=S.convs[cid]={id:cid,type:'dm',members:[id,pid],created:new Date().toISOString()}; S.msgs[cid]=[]; save(); }
    return c; }

  /* ---------------- formatting ---------------- */
  function when(iso,long){ const d=new Date(iso), now=new Date(); if(isNaN(d)) return '';
    const t=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const day=Math.floor((new Date(now.toDateString())-new Date(d.toDateString()))/86400000);
    if(day===0) return t; if(day===1) return long?'Yesterday, '+t:'Yesterday';
    if(day<7) return d.toLocaleDateString('en-GB',{weekday:long?'long':'short'})+(long?', '+t:'');
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+(long?', '+t:''); }
  function avatar(p,size){ if(!p) return ''; const s=size||40;
    const ph=p.photo||(window.MSAvatar&&MSAvatar.url&&MSAvatar.url(p.name));
    const inner=ph?`<img src="${esc(ph)}" alt="">`:esc(p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase());
    return `<span class="mc-av" data-person="${esc(p.id)}" style="width:${s}px;height:${s}px;background:${p.accent};font-size:${Math.round(s*.33)}px">${inner}${p.online?'<i class="mc-on"></i>':''}</span>`; }
  function convAvatar(c,size){ const s=size||40;
    if(c.type==='dm') return avatar(otherOf(c),s);
    if(c.type==='project') return `<span class="mc-av mc-prj" style="width:${s}px;height:${s}px">${ICN.folder}</span>`;
    const others=c.members.filter(x=>x!==meId()).map(person).filter(Boolean), p=others[0], more=others.length-1;
    const d=Math.round(s*.66), f=Math.round(s*.23);
    return `<span class="mc-stack" style="width:${s}px;height:${s}px" title="${others.length+1} people">${p?`<span class="mc-av" style="width:${d}px;height:${d}px;background:${p.accent};font-size:${f}px">${esc(p.name.split(/\s+/).map(w=>w[0]).slice(0,2).join(''))}</span>`:''}${more>0?`<span class="mc-av mc-more" style="width:${d}px;height:${d}px;font-size:${f}px">+${more}</span>`:''}</span>`; }
  function preview(c){ const l=lastMsg(c.id); if(!l) return 'No messages yet';
    const who=l.from===meId()?'You: ':(c.type!=='dm'?(person(l.from)||{name:''}).name.split(' ')[0]+': ':'');
    const body=l.deleted?'Message deleted':l.t||(l.att?(/^image\//.test(l.att.type)?'📷 Photo':'📎 '+l.att.name):l.link?'🔗 '+l.link.title:'');
    return who+body; }
  function linkify(t){ return esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>'); }
  function toast(msg){ let t=document.getElementById('mcToast'); if(!t){ t=document.createElement('div'); t.id='mcToast'; t.className='mc-toast'; document.body.appendChild(t); }
    t.textContent=msg; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2400); }

  /* ---------------- icons ---------------- */
  const sv=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICN={
    dot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',
    pen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    bin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>',
    chat:sv('<path d="M21 11.5a8 8 0 0 1-11.8 7L4 20l1.5-5.2A8 8 0 1 1 21 11.5z"/>'),
    back:sv('<path d="M15 18l-6-6 6-6"/>'), x:sv('<path d="M6 6l12 12M18 6 6 18"/>'),
    send:sv('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
    clip:sv('<path d="M21 11.5 12.6 20a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>'),
    link:sv('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    plus:sv('<path d="M12 5v14M5 12h14"/>'), search:sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    bell:sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>'),
    belloff:sv('<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l2 2H8M10 20a2 2 0 0 0 4 0M3 3l18 18"/>'),
    folder:sv('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    people:sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>'),
    file:sv('<path d="M14 3H6v18h12V7zM14 3v4h4"/>'), tick:sv('<path d="M4 12.5 9 17.5 20 6.5"/>'),
    ticks:sv('<path d="M2 12.5 6.5 17 16 7M9 15.5l1.5 1.5L22 7"/>'), box:sv('<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9"/>')
  };

  /* ---------------- view ----------------
     One renderer drives both the floating panel (list OR thread) and the
     full Chats page (list AND thread side by side). */
  const views=new Set();
  function View(root,page){
    const v={root,page,cur:null,mode:'list',q:'',pend:null,newKind:null,picked:new Set(),hit:null};
    root.classList.add('mc',page?'mc-page':'mc-panelv');
    v.draw=()=>{ const c=v.cur&&S.convs[v.cur];
      if(v.cur&&!c) v.cur=null;
      if(page){ root.innerHTML=`<div class="mc-col">${listHTML(v)}</div><div class="mc-main">${v.mode==='new'?newHTML(v):c?threadHTML(v,c):emptyHTML()}</div>`; }
      else root.innerHTML=v.mode==='new'?newHTML(v):c?threadHTML(v,c):listHTML(v);
      wire(v); };
    v.open=cid=>{ v.cur=cid; v.mode='thread'; const c=S.convs[cid]; if(c) openRead(v,c); drawAll(); };
    views.add(v); return v;
  }
  function drawAll(){ views.forEach(v=>v.draw()); refreshFab(); }

  function listHTML(v){
    const q=v.q.trim().toLowerCase(), all=convs();
    let rows=v.only==='unread'?all.filter(c=>unreadOf(c)>0):all, hits=[];
    if(q){ rows=all.filter(c=>titleOf(c).toLowerCase().includes(q)||c.members.some(p=>(person(p)||{name:''}).name.toLowerCase().includes(q)));
      all.forEach(c=>msgsOf(c.id).forEach(m=>{ if((m.t||'').toLowerCase().includes(q)) hits.push({c,m}); }));
      hits.sort((a,b)=>b.m.at.localeCompare(a.m.at)); }
    return `<div class="mc-hd">${v.page?(v.only==='unread'?'<h3>Unread</h3>':'<h3>Conversations</h3>'):'<h3>Messages</h3>'}
        ${totalUnread()?'<button class="mc-allread" data-mcallread>Mark all read</button>':''}
        <button class="mc-ib" data-mcnew title="New conversation" aria-label="New conversation">${ICN.plus}</button>
        ${v.page?'':`<button class="mc-ib" data-mcx title="Close" aria-label="Close">${ICN.x}</button>`}</div>
      <div class="mc-search">${ICN.search}<input data-mcq value="${esc(v.q)}" placeholder="Search people and messages…"></div>
      ${v.only==='unread'?'<div class="mc-filt">Showing unread only <button data-mcclr>Show all</button></div>':''}
      <div class="mc-list">
        ${rows.map(c=>{ const u=unreadOf(c);
          return `<button class="mc-row${v.cur===c.id&&v.page?' on':''}${u?' unread':''}" data-mcopen="${c.id}">
          ${convAvatar(c,32)}<span class="mc-meta"><b>${esc(titleOf(c))}${c.type==='project'?'<i class="mc-kind">Project</i>':c.type==='group'?'<i class="mc-kind">Group</i>':''}</b>
          <span class="mc-last">${esc(preview(c))}</span></span>
          <span class="mc-side"><span class="mc-when">${when(lastAt(c))}</span>
          ${msgsOf(c.id).some(m=>!m.sys)?`<span class="mc-rd" role="button" tabindex="0" data-mcrd="${c.id}" title="${u?'Mark as read':'Mark as unread'}" aria-label="${u?'Mark as read':'Mark as unread'}">${u?ICN.tick:ICN.dot}</span>`:''}
          ${isMuted(c)?`<span class="mc-mute" title="Muted">${ICN.belloff}</span>`:''}${u?`<span class="mc-un${isMuted(c)?' m':''}">${u}</span>`:''}</span></button>`; }).join('')
        ||`<p class="mc-empty">${q?'No conversations match.':v.only==='unread'?'You’re all caught up — nothing unread.':'No conversations yet. Start one with the + button.'}</p>`}
        ${hits.length?`<div class="mc-sech">Messages · ${hits.length}</div>${hits.slice(0,30).map(({c,m})=>`<button class="mc-row mc-hit" data-mcopen="${c.id}" data-mchit="${m.id}">
          ${avatar(person(m.from),32)}<span class="mc-meta"><b>${esc(titleOf(c))}</b><span class="mc-last">${esc((person(m.from)||{name:''}).name.split(' ')[0])}: ${highlight(m.t,q)}</span></span>
          <span class="mc-side"><span class="mc-when">${when(m.at)}</span></span></button>`).join('')}`:''}
      </div>`;
  }
  function highlight(t,q){ const i=t.toLowerCase().indexOf(q); if(i<0) return esc(t);
    const s=Math.max(0,i-24); return (s?'…':'')+esc(t.slice(s,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length,i+q.length+60)); }
  const emptyHTML=()=>`<div class="mc-blank">${ICN.chat}<b>Select a conversation</b><span>Or start a new one with the + button.</span></div>`;

  function threadHTML(v,c){
    const o=otherOf(c), ms=msgsOf(c.id), mid=meId();
    const sub=c.type==='dm'&&o?`${esc(o.title)} · ${esc(orgOf(o).name)} · ${o.online?'Online':'Offline'}`
      :c.type==='project'?`<a href="${esc(c.href||'#')}">Open project →</a> · ${c.members.length} people`
      :`${c.members.length} people`;
    let lastDay='';
    let prev=null, newShown=false;
    const body=ms.map(m=>{ const mine=m.from===mid, p=person(m.from), day=new Date(m.at).toDateString();
      const sep=day!==lastDay?`<div class="mc-day">${when(m.at,true).replace(/, \d\d:\d\d$/,'')||'Today'}</div>`:''; lastDay=day;
      if(m.sys){ prev=null; return sep+`<div class="mc-sys">${esc(m.t)}</div>`; }
      const isNew=!newShown&&v.newSince&&m.from!==mid&&m.at>v.newSince; if(isNew) newShown=true;
      const nl=isNew?'<div class="mc-new" role="separator"><span>New</span></div>':'';
      const cont=!sep&&!isNew&&prev&&prev.from===m.from&&(new Date(m.at)-new Date(prev.at))<5*60000; prev=m;
      const tm=new Date(m.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      const att=m.att?(/^image\//.test(m.att.type)?`<a href="${m.att.data}" target="_blank" class="mc-img"><img src="${m.att.data}" alt="${esc(m.att.name)}"></a>`
        :`<a href="${m.att.data}" download="${esc(m.att.name)}" class="mc-file">${ICN.file}<span><b>${esc(m.att.name)}</b><em>${Math.max(1,Math.round(m.att.size/1024))} KB</em></span></a>`):'';
      const lk=m.link?`<a href="${esc(m.link.href)}" class="mc-card">${m.link.image?`<img src="${esc(m.link.image)}" alt="">`:`<span class="mc-cardic">${m.link.kind==='project'?ICN.folder:ICN.box}</span>`}<span><em>${m.link.kind==='project'?'Project':'Product'}</em><b>${esc(m.link.title)}</b>${m.link.sub?`<i>${esc(m.link.sub)}</i>`:''}</span></a>`:'';
      if(m.deleted){ return `${sep}<div class="mc-msg${cont?' cont':''}" data-mcmsg="${m.id}"><span class="mc-gut">${cont?`<span class="mc-gt">${tm}</span>`:avatar(p||{id:'',name:'?',accent:'#9a9aa6'},36)}</span><div class="mc-mbody">${cont?'':`<div class="mc-mh"><b>${esc(p?p.name:'Unknown')}</b><span>${tm}</span></div>`}<div class="mc-bub mc-gone">This message was deleted</div></div></div>`; }
      const acts=!v.editing?`<span class="mc-acts"><button data-mcunread="${m.id}" title="Mark unread from here" aria-label="Mark unread from here">${ICN.dot}</button>${mine&&m.t?`<button data-mcedit="${m.id}" title="Edit" aria-label="Edit message">${ICN.pen}</button>`:''}${mine?`<button data-mcdel="${m.id}" title="Delete" aria-label="Delete message">${ICN.bin}</button>`:''}</span>`:'';
      const editing=v.editing===m.id;
      const txt=editing?`<div class="mc-edit"><textarea data-mceditbox rows="2">${esc(m.t)}</textarea><div class="mc-editacts"><span>Enter to save · Esc to cancel</span><button class="mc-link" data-mceditno>Cancel</button><button class="mc-go sm" data-mcedityes>Save</button></div></div>`
        :m.t?`<div class="mc-bub">${linkify(m.t)}${m.edited?'<span class="mc-edited" title="Edited '+esc(new Date(m.edited).toLocaleString('en-GB'))+'">(edited)</span>':''}RCSLOT</div>`:'';
      const rc=mine?`<span class="mc-rc${seenByAll(c,m)?' seen':''}" title="${seenByAll(c,m)?'Read':'Sent'}">${seenByAll(c,m)?ICN.ticks:ICN.tick}</span>`:'';
      return `${sep}${nl}<div class="mc-msg${cont?' cont':''}${v.hit===m.id?' hit':''}${editing?' editing':''}" data-mcmsg="${m.id}">${acts}
        <span class="mc-gut">${cont?`<span class="mc-gt">${tm}</span>`:avatar(p||{id:'',name:'?',accent:'#9a9aa6'},36)}</span>
        <div class="mc-mbody">${cont?'':`<div class="mc-mh"><b${p?` data-person="${esc(p.id)}"`:''}>${esc(p?p.name:'Unknown')}${mine?' <em>(you)</em>':''}</b><span>${tm}</span>${rc}</div>`}
        ${txt.replace('RCSLOT',cont?rc:'')}${att}${lk}</div></div>`; }).join('');
    const typ=typingIn(c);
    return `<div class="mc-hd mc-thd">${v.page?'':`<button class="mc-ib" data-mcback aria-label="Back">${ICN.back}</button>`}
        ${convAvatar(c,34)}<div class="mc-tt"><h3>${esc(titleOf(c))}</h3><span>${sub}</span></div>
        <button class="mc-ib" data-mcmute title="${isMuted(c)?'Unmute':'Mute'}" aria-label="${isMuted(c)?'Unmute':'Mute'}">${isMuted(c)?ICN.belloff:ICN.bell}</button>
        ${c.type!=='dm'?`<button class="mc-ib" data-mcmembers title="Manage people" aria-label="Manage people">${ICN.people}</button>`:''}
        ${o?`<button class="mc-ib" data-person="${o.id}" title="Profile" aria-label="Profile">${avatar(o,22)}</button>`:''}
        ${v.page?'':`<button class="mc-ib" data-mcx aria-label="Close">${ICN.x}</button>`}</div>
      ${isMuted(c)?'<div class="mc-mutebar">Muted — you won’t get badges for new messages here.</div>':''}
      <div class="mc-thread" data-mcthread>${body||'<p class="mc-empty">No messages yet. Say hello.</p>'}
        <div class="mc-typing" data-mctyping ${typ?'':'hidden'}><span class="mc-dots"><i></i><i></i><i></i></span>${esc(typ||'')}</div></div>
      ${v.pend?`<div class="mc-pend">${v.pend.att?(/^image\//.test(v.pend.att.type)?`<img src="${v.pend.att.data}" alt="">`:ICN.file)+`<span>${esc(v.pend.att.name)}</span>`:`${ICN.link}<span>${esc(v.pend.link.title)}</span>`}<button data-mcunpend aria-label="Remove">${ICN.x}</button></div>`:''}
      <div class="mc-compose">
        <label class="mc-ib" title="Attach a file or image" aria-label="Attach">${ICN.clip}<input type="file" data-mcfile hidden></label>
        <button class="mc-ib" data-mclink title="Link a product or project" aria-label="Link">${ICN.link}</button>
        <textarea data-mcin rows="1" placeholder="Message ${esc(c.type==='dm'&&o?o.name.split(' ')[0]:titleOf(c))}…"></textarea>
        <button class="mc-send" data-mcsend aria-label="Send">${ICN.send}</button></div>`;
  }

  function newHTML(v){
    const k=v.newKind||'dm', cs=contacts(), q=v.q2||'';
    const shown=cs.filter(p=>(v.onlineOnly?p.online:true)&&(!q||p.name.toLowerCase().includes(q)||orgOf(p).name.toLowerCase().includes(q)));
    const byOrg={}; shown.forEach(p=>(byOrg[p.org]=byOrg[p.org]||[]).push(p));
    const orgs=Object.keys(byOrg).sort((a,b)=>(a===me().org?-1:b===me().org?1:ORGS[a].name.localeCompare(ORGS[b].name)));
    const onNote=v.onlineOnly?'<div class="mc-filt">Showing contacts online now <button data-mconclr>Show everyone</button></div>':'';
    return `<div class="mc-hd"><button class="mc-ib" data-mccancel aria-label="Back">${ICN.back}</button><h3>New conversation</h3></div>
      <div class="mc-kinds">${[['dm','Message'],['group','Group'],['project','Project thread']].map(([x,l])=>`<button class="${k===x?'on':''}" data-mckind="${x}">${l}</button>`).join('')}</div>
      ${k==='group'?`<input class="mc-titlein" data-mctitle placeholder="Group name, e.g. Q4 launch" value="${esc(v.gtitle||'')}">`:''}
      ${k==='project'?`<select class="mc-titlein" data-mcproj>${PROJECTS.map(p=>`<option ${v.proj===p.name?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`:''}
      <div class="mc-search">${ICN.search}<input data-mcq2 value="${esc(q)}" placeholder="Search your contacts…"></div>
      <p class="mc-rule">You can message ${esc(ruleText())}.</p>
      ${onNote}
      <div class="mc-list">${orgs.map(o=>`<div class="mc-sech">${esc(ORGS[o].name)}${o===me().org?' · your team':''}</div>${byOrg[o].map(p=>`<button class="mc-row mc-pick${v.picked.has(p.id)?' on':''}" data-mcpick="${p.id}">
          ${avatar(p,34)}<span class="mc-meta"><b>${esc(p.name)}</b><span class="mc-last">${esc(p.title)}</span></span>
          ${k==='dm'?'':`<span class="mc-chk">${v.picked.has(p.id)?ICN.tick:''}</span>`}</button>`).join('')}`).join('')||'<p class="mc-empty">No contacts match.</p>'}</div>
      ${k==='dm'?'':`<div class="mc-newfoot"><span>${v.picked.size} selected</span><button class="mc-go" data-mccreate ${v.picked.size?'':'disabled'}>Create ${k==='group'?'group':'thread'}</button></div>`}`;
  }
  function ruleText(){ const t=orgOf(me()).type;
    return t==='distributor'?'your team, your customers, your approved suppliers and Merchsmith'
      :t==='customer'?'your team and anyone at your distributor'
      :t==='supplier'?'your team, the distributors you supply and Merchsmith'
      :'the Merchsmith team, distributors and suppliers'; }
  const PROJECTS=[{name:'Autumn Giveaways',href:'Merchsmith Project - Autumn Giveaways.html'},{name:'Summer Conference 2026',href:'Merchsmith Projects.html'},
    {name:'New Starter Welcome Packs',href:'Merchsmith Projects.html'},{name:'Christmas Client Gifts',href:'Merchsmith Projects.html'}];

  /* ---------------- typing ---------------- */
  const typingMap=()=>{ try{ return JSON.parse(localStorage.getItem(TKEY)||'{}'); }catch(e){ return {}; } };
  function setTyping(c){ const m=typingMap(); m[c.id]={pid:meId(),at:Date.now()}; try{ localStorage.setItem(TKEY,JSON.stringify(m)); }catch(e){} }
  function typingIn(c){ const t=typingMap()[c.id]; if(!t||t.pid===meId()||Date.now()-t.at>3500) return '';
    const p=person(t.pid); return p?p.name.split(' ')[0]+' is typing…':''; }

  /* ---------------- actions ---------------- */
  function send(v,c,text){
    const t=(text||'').trim(); if(!t&&!v.pend) return;
    const m={id:c.id+'-'+Date.now().toString(36),from:meId(),t,at:new Date().toISOString()};
    if(v.pend&&v.pend.att) m.att=v.pend.att; if(v.pend&&v.pend.link) m.link=v.pend.link;
    (S.msgs[c.id]=S.msgs[c.id]||[]).push(m); v.pend=null; v.held=false; markRead(c); save();
    const tm=typingMap(); delete tm[c.id]; try{ localStorage.setItem(TKEY,JSON.stringify(tm)); }catch(e){}
    drawAll(); }
  function readFile(file){ return new Promise((res,rej)=>{
    if(!file) return rej(new Error('No file'));
    if(file.size>6*1024*1024) return rej(new Error('Files over 6 MB can’t be attached here'));
    const r=new FileReader();
    r.onload=()=>{ if(!/^image\//.test(file.type)) return file.size>1.5*1024*1024?rej(new Error('Documents over 1.5 MB can’t be stored in this prototype')):res({name:file.name,type:file.type||'application/octet-stream',size:file.size,data:r.result});
      const img=new Image(); img.onload=()=>{ const k=Math.min(1,1200/Math.max(img.width,img.height)); const cv=document.createElement('canvas');
        cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k); cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        const data=cv.toDataURL('image/jpeg',.82); res({name:file.name,type:'image/jpeg',size:Math.round(data.length*.75),data}); };
      img.onerror=()=>rej(new Error('That image could not be read')); img.src=r.result; };
    r.onerror=()=>rej(new Error('That file could not be read')); r.readAsDataURL(file); }); }

  function linkPicker(v,anchor){
    let pk=document.getElementById('mcLinkPk'); if(pk){ pk.remove(); return; }
    pk=document.createElement('div'); pk.id='mcLinkPk'; pk.className='mc-pk';
    pk.innerHTML=`<div class="mc-kinds sm"><button class="on" data-lk="product">Product</button><button data-lk="project">Project</button></div>
      <input data-lq placeholder="Search…"><div class="mc-pkl" data-ll></div>`;
    document.body.appendChild(pk);
    const r=anchor.getBoundingClientRect(); pk.style.left=Math.max(10,Math.min(r.left,innerWidth-330))+'px'; pk.style.bottom=(innerHeight-r.top+8)+'px';
    let kind='product';
    const draw=()=>{ const q=pk.querySelector('[data-lq]').value.toLowerCase(); let items=[];
      if(kind==='project') items=PROJECTS.filter(p=>p.name.toLowerCase().includes(q)).map(p=>({kind:'project',title:p.name,href:p.href}));
      else { const all=window.MSCAT&&MSCAT.all?MSCAT.all():[];
        items=all.filter(p=>!q||p.name.toLowerCase().includes(q)||String(p.code||'').toLowerCase().includes(q)).slice(0,40)
          .map(p=>({kind:'product',title:p.name,sub:p.supplier+(p.code?' · '+p.code:''),image:p.image||'',href:'Merchsmith Store.html#product='+encodeURIComponent(p.id)})); }
      pk.querySelector('[data-ll]').innerHTML=items.map((it,i)=>`<button data-li="${i}">${it.image?`<img src="${esc(it.image)}" alt="">`:`<span>${it.kind==='project'?ICN.folder:ICN.box}</span>`}<b>${esc(it.title)}</b>${it.sub?`<em>${esc(it.sub)}</em>`:''}</button>`).join('')
        ||`<p class="mc-empty">${kind==='product'&&!(window.MSCAT&&MSCAT.all)?'Products load on store and admin pages.':'Nothing matches.'}</p>`;
      pk.querySelectorAll('[data-li]').forEach(b=>b.onclick=()=>{ v.pend={link:items[+b.dataset.li]}; pk.remove(); drawAll(); }); };
    pk.querySelectorAll('[data-lk]').forEach(b=>b.onclick=()=>{ kind=b.dataset.lk; pk.querySelectorAll('[data-lk]').forEach(x=>x.classList.toggle('on',x===b)); draw(); });
    pk.querySelector('[data-lq]').oninput=draw; pk.querySelector('[data-lq]').focus(); draw();
    setTimeout(()=>document.addEventListener('mousedown',function h(e){ if(!pk.contains(e.target)){ pk.remove(); document.removeEventListener('mousedown',h); } }),0);
  }
  function sysMsg(c,t){ (S.msgs[c.id]=S.msgs[c.id]||[]).push({id:c.id+'-s'+Date.now().toString(36),from:meId(),sys:true,t,at:new Date().toISOString()}); }
  const first=p=>(p&&p.name||'').split(' ')[0];
  // anyone in a group or project thread can add, remove or rename; everyone can leave
  function membersPop(c,anchor,keep){
    let pk=document.getElementById('mcLinkPk'); if(pk&&!keep){ pk.remove(); return; }
    if(!pk){ pk=document.createElement('div'); pk.id='mcLinkPk'; pk.className='mc-pk mc-mng'; document.body.appendChild(pk); }
    const edit=c.type!=='dm', q=(pk.dataset.q||'').toLowerCase();
    const mem=c.members.map(person).filter(Boolean);
    const addable=contacts().filter(p=>!c.members.includes(p.id)&&(!q||p.name.toLowerCase().includes(q)||orgOf(p).name.toLowerCase().includes(q)));
    pk.innerHTML=`
      ${edit&&c.type==='group'?`<div class="mc-sech" style="margin-top:0">Group name</div>
        <div class="mc-rn"><input data-mcrn value="${esc(c.title||'')}" maxlength="60"><button data-mcrnsave>Save</button></div>`:''}
      <div class="mc-sech"${edit&&c.type==='group'?'':' style="margin-top:0"'}>${mem.length} people</div>
      ${mem.map(p=>`<div class="mc-mrow"><button class="mc-row" data-person="${p.id}">${avatar(p,30)}<span class="mc-meta"><b>${esc(p.name)}${p.id===meId()?' (you)':''}</b><span class="mc-last">${esc(p.title)} · ${esc(orgOf(p).name)}</span></span></button>
        ${edit&&p.id!==meId()?`<button class="mc-rm" data-mcrm="${p.id}" title="Remove ${esc(p.name)} from this conversation" aria-label="Remove ${esc(p.name)}">Remove</button>`:''}</div>`).join('')}
      ${edit?`<div class="mc-sech">Add people</div>
        <div class="mc-search" style="margin:0 0 6px">${ICN.search}<input data-mcaddq value="${esc(pk.dataset.q||'')}" placeholder="Search your contacts…"></div>
        <div class="mc-addl">${addable.slice(0,40).map(p=>`<button class="mc-row" data-mcadd="${p.id}">${avatar(p,28)}<span class="mc-meta"><b>${esc(p.name)}</b><span class="mc-last">${esc(orgOf(p).name)}</span></span><span class="mc-plus">${ICN.plus}</span></button>`).join('')||'<p class="mc-empty" style="padding:8px 0">'+(q?'No contacts match.':'Everyone you can message is already here.')+'</p>'}</div>
        <button class="mc-leave" data-mcleave>Leave ${c.type==='project'?'thread':'group'}</button>`:''}`;
    const r=anchor.getBoundingClientRect();
    const top=Math.max(10,Math.min(r.bottom+6,innerHeight-240));
    pk.style.left=Math.max(10,Math.min(r.right-320,innerWidth-330))+'px'; pk.style.top=top+'px';
    pk.style.maxHeight=(innerHeight-top-14)+'px';
    const done=(msg)=>{ save(); drawAll(); toast(msg); membersPop(S.convs[c.id]||c,anchor,true); };
    pk.querySelectorAll('[data-mcrm]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); const p=person(b.dataset.mcrm);
      if(!confirm('Remove '+(p?p.name:'this person')+' from “'+titleOf(c)+'”? They keep nothing — the conversation disappears from their list.')) return;
      c.members=c.members.filter(x=>x!==b.dataset.mcrm); sysMsg(c,first(me())+' removed '+(p?p.name:'someone')); done((p?p.name:'Person')+' removed'); });
    pk.querySelectorAll('[data-mcadd]').forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); const p=person(b.dataset.mcadd); if(!p) return;
      c.members.push(p.id); const l=lastMsg(c.id); (S.reads[p.id]=S.reads[p.id]||{})[c.id]=l?l.at:new Date().toISOString();
      sysMsg(c,first(me())+' added '+p.name); done(p.name+' added'); });
    const aq=pk.querySelector('[data-mcaddq]'); if(aq){ aq.oninput=()=>{ pk.dataset.q=aq.value; const pos=aq.selectionStart; membersPop(c,anchor,true);
      const n=pk.querySelector('[data-mcaddq]'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } }; }
    const rs=pk.querySelector('[data-mcrnsave]'); if(rs) rs.onclick=ev=>{ ev.stopPropagation(); const v=pk.querySelector('[data-mcrn]').value.trim(); if(!v||v===c.title) return;
      c.title=v; sysMsg(c,first(me())+' renamed the group to “'+v+'”'); done('Group renamed'); };
    const lv=pk.querySelector('[data-mcleave]'); if(lv) lv.onclick=ev=>{ ev.stopPropagation();
      if(!confirm('Leave “'+titleOf(c)+'”? You’ll lose access to its history unless someone adds you back.')) return;
      sysMsg(c,me().name+' left'); c.members=c.members.filter(x=>x!==meId()); save(); pk.remove();
      views.forEach(v=>{ if(v.cur===c.id){ v.cur=null; v.mode='list'; } }); drawAll(); toast('You left '+titleOf(c)); };
    if(!keep) setTimeout(()=>document.addEventListener('mousedown',function h(e){ if(!pk.isConnected){ document.removeEventListener('mousedown',h); return; }
      if(!pk.contains(e.target)&&!e.target.closest('.prof-pane')&&!e.target.closest('.prof-scrim')){ pk.remove(); document.removeEventListener('mousedown',h); } }),0);
  }


  function wire(v){
    const R=v.root, $=s=>R.querySelector(s);
    R.querySelectorAll('[data-mcx]').forEach(b=>b.onclick=close);
    const q=$('[data-mcq]'); if(q) q.oninput=()=>{ v.q=q.value; const p=q.selectionStart; v.draw(); const n=R.querySelector('[data-mcq]'); if(n){ n.focus(); n.setSelectionRange(p,p); } };
    R.querySelectorAll('[data-mcrd]').forEach(b=>{ const go=e=>{ e.preventDefault(); e.stopPropagation();
        const c=S.convs[b.dataset.mcrd]; if(!c) return;
        if(unreadOf(c)){ markRead(c); views.forEach(x=>{ if(x.cur===c.id){ x.held=false; x.newSince=null; } }); }
        else { markConvUnread(c); views.forEach(x=>{ if(x.cur===c.id){ x.held=true; x.newSince=readAt(meId(),c.id); } }); }
        drawAll(); };
      b.onclick=go; b.onkeydown=e=>{ if(e.key==='Enter'||e.key===' ') go(e); }; });
    const ar=$('[data-mcallread]'); if(ar) ar.onclick=()=>{ convs().forEach(c=>{ if(unreadOf(c)) markRead(c); });
      views.forEach(x=>{ x.held=false; x.newSince=null; }); drawAll(); };
    R.querySelectorAll('[data-mcopen]').forEach(b=>b.onclick=()=>{ v.hit=b.dataset.mchit||null; v.open(b.dataset.mcopen); });
    const clr=$('[data-mcclr]'); if(clr) clr.onclick=()=>{ v.only=''; v.draw(); document.dispatchEvent(new CustomEvent('mc-filter-cleared')); };
    const oc=$('[data-mconclr]'); if(oc) oc.onclick=()=>{ v.onlineOnly=false; v.draw(); document.dispatchEvent(new CustomEvent('mc-filter-cleared')); };
    const nw=$('[data-mcnew]'); if(nw) nw.onclick=()=>{ v.onlineOnly=false; v.mode='new'; v.newKind='dm'; v.picked=new Set(); v.q2=''; v.gtitle=''; v.draw(); };
    const bk=$('[data-mcback]'); if(bk) bk.onclick=()=>{ v.cur=null; v.mode='list'; v.hit=null; v.draw(); };
    const cc=$('[data-mccancel]'); if(cc) cc.onclick=()=>{ v.mode=v.cur?'thread':'list'; v.draw(); };
    R.querySelectorAll('[data-mckind]').forEach(b=>b.onclick=()=>{ v.newKind=b.dataset.mckind; v.picked=new Set(); v.draw(); });
    const q2=$('[data-mcq2]'); if(q2) q2.oninput=()=>{ v.q2=q2.value.toLowerCase(); const p=q2.selectionStart; v.draw(); const n=R.querySelector('[data-mcq2]'); if(n){ n.focus(); n.setSelectionRange(p,p); } };
    const gt=$('[data-mctitle]'); if(gt) gt.oninput=()=>{ v.gtitle=gt.value; };
    const pj=$('[data-mcproj]'); if(pj) pj.onchange=()=>{ v.proj=pj.value; };
    R.querySelectorAll('[data-mcpick]').forEach(b=>b.onclick=()=>{ const id=b.dataset.mcpick;
      if((v.newKind||'dm')==='dm'){ const c=dmWith(id); v.open(c.id); return; }
      v.picked.has(id)?v.picked.delete(id):v.picked.add(id); v.draw(); });
    const cr=$('[data-mccreate]'); if(cr) cr.onclick=()=>{ const k=v.newKind, id=(k==='group'?'grp-':'prj-')+Date.now().toString(36);
      const members=[meId(),...v.picked];
      if(k==='group'){ const t=(v.gtitle||'').trim()||members.slice(1).map(p=>person(p).name.split(' ')[0]).join(', ');
        S.convs[id]={id,type:'group',title:t,members,created:new Date().toISOString()}; }
      else { const pr=PROJECTS.find(p=>p.name===(v.proj||PROJECTS[0].name))||PROJECTS[0];
        S.convs[id]={id,type:'project',title:pr.name,project:pr.name,href:pr.href,members,created:new Date().toISOString()}; }
      S.msgs[id]=[]; save(); v.open(id); };
    const c=v.cur&&S.convs[v.cur]; if(!c) return;
    const th=$('[data-mcthread]'); if(th){ const hit=v.hit&&th.querySelector('[data-mcmsg="'+v.hit+'"]');
      if(hit) th.scrollTop=hit.offsetTop-th.clientHeight/3; else th.scrollTop=th.scrollHeight; }
    const inp=$('[data-mcin]');
    if(inp){ const grow=()=>{ inp.style.height='auto'; inp.style.height=Math.min(120,inp.scrollHeight)+'px'; };
      inp.oninput=()=>{ grow(); setTyping(c); };
      inp.onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(v,c,inp.value); } };
      if(!('ontouchstart' in window)) inp.focus(); }
    const sb=$('[data-mcsend]'); if(sb) sb.onclick=()=>send(v,c,inp.value);
    const own=id=>msgsOf(c.id).find(x=>x.id===id&&x.from===meId());
    R.querySelectorAll('[data-mcunread]').forEach(b=>b.onclick=()=>{ const m=msgsOf(c.id).find(x=>x.id===b.dataset.mcunread); if(!m) return;
      markUnreadFrom(c,m); v.held=true; v.newSince=readAt(meId(),c.id); drawAll(); });
    R.querySelectorAll('[data-mcedit]').forEach(b=>b.onclick=()=>{ v.editing=b.dataset.mcedit; v.draw(); });
    R.querySelectorAll('[data-mcdel]').forEach(b=>b.onclick=()=>{ const m=own(b.dataset.mcdel); if(!m) return;
      if(!confirm('Delete this message? Everyone in the conversation will see that it was deleted.')) return;
      m.deleted=new Date().toISOString(); m.t=''; delete m.att; delete m.link; save(); drawAll(); });
    const eb=$('[data-mceditbox]');
    if(eb){ eb.focus(); eb.setSelectionRange(eb.value.length,eb.value.length);
      const done=ok=>{ const m=own(v.editing);
        if(ok&&m){ const t=eb.value.trim(); if(t&&t!==m.t){ m.t=t; m.edited=new Date().toISOString(); save(); } }
        v.editing=null; drawAll(); };
      eb.onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); done(true); } else if(e.key==='Escape'){ e.preventDefault(); done(false); } };
      const y=$('[data-mcedityes]'); if(y) y.onclick=()=>done(true);
      const n=$('[data-mceditno]'); if(n) n.onclick=()=>done(false); }
    const fi=$('[data-mcfile]'); if(fi) fi.onchange=async()=>{ try{ v.pend={att:await readFile(fi.files[0])}; v.draw(); }catch(e){ toast(e.message); } };
    const ln=$('[data-mclink]'); if(ln) ln.onclick=()=>linkPicker(v,ln);
    const up=$('[data-mcunpend]'); if(up) up.onclick=()=>{ v.pend=null; v.draw(); };
    const mu=$('[data-mcmute]'); if(mu) mu.onclick=()=>{ const l=S.mutes[meId()]=S.mutes[meId()]||[];
      const i=l.indexOf(c.id); if(i<0) l.push(c.id); else l.splice(i,1); save(); toast(i<0?'Conversation muted':'Conversation unmuted'); drawAll(); };
    const mb=$('[data-mcmembers]'); if(mb) mb.onclick=()=>membersPop(c,mb);
  }

  /* ---------------- floating launcher ---------------- */
  let panel, fab, pv;
  function build(){
    if(fab) return;
    if(document.querySelector('[data-mcpage]')) return;          // the full Chats page is its own surface
    fab=document.createElement('button'); fab.className='chat-fab'; fab.title='Messages'; fab.setAttribute('aria-label','Messages');
    fab.onclick=()=>panel.classList.contains('on')?close():open(); document.body.appendChild(fab);
    panel=document.createElement('div'); panel.className='chat-panel'; document.body.appendChild(panel);
    pv=View(panel,false); pv.draw(); refreshFab();
  }
  function refreshFab(){ if(!fab) return; const u=totalUnread(); fab.innerHTML=ICN.chat+(u?`<span class="fab-b">${u>99?'99+':u}</span>`:''); }
  function open(){ if(!panel) build(); if(!panel) return; if(pv.cur){ const c=S.convs[pv.cur]; if(c) openRead(pv,c); } pv.draw(); panel.classList.add('on'); refreshFab(); }
  function close(){ if(panel) panel.classList.remove('on'); }
  function openConv(cid){ const pg=[...views].find(x=>x.page); if(pg){ pg.open(cid); return; } if(!panel) build(); pv.open(cid); panel.classList.add('on'); }
  // resolve (or register) someone from an organisation's People list
  function resolve(m){ if(!m||!m.name) return null;
    const nm=m.name.trim().toLowerCase();
    let p=PEOPLE.find(q=>q.name.toLowerCase()===nm); if(p) return p;
    const on=(m.orgName||'').trim().toLowerCase();
    let ok=Object.keys(ORGS).find(k=>ORGS[k].name.toLowerCase()===on);
    if(!ok){ ok='x-'+slug(m.orgName||'org'); const t=m.orgType||'customer';
      ORGS[ok]={name:m.orgName||'Organisation',type:t};
      if(t==='supplier') ORGS[ok].supplies=['mojo']; if(t==='customer') ORGS[ok].dist='mojo';
      saveExtra({k:ok,v:ORGS[ok]}); }
    p={id:'x-'+slug(m.name)+'-'+ok.replace(/^x-/,''),name:m.name.trim(),title:m.title||'',org:ok};
    if(m.photo&&!/^data:/.test(m.photo)) p.photo=m.photo;
    p.accent=ACC[hash(p.id)%ACC.length]; p.online=hash(p.id+'on')%3!==0;
    PEOPLE.push(p); saveExtra(null,{id:p.id,name:p.name,title:p.title,org:p.org,photo:p.photo,accent:p.accent,online:p.online});
    return p; }
  function isMe(m){ const x=me(); return !!(x&&m&&m.name&&x.name.toLowerCase()===m.name.trim().toLowerCase()); }
  function reachable(m){ if(isMe(m)) return false; const p=resolveNoAdd(m); return p?canChat(me(),p):orgReachable(m); }
  // check without registering anyone (used while drawing lists)
  function resolveNoAdd(m){ const nm=(m.name||'').trim().toLowerCase(); return PEOPLE.find(q=>q.name.toLowerCase()===nm)||null; }
  function orgReachable(m){ const on=(m.orgName||'').trim().toLowerCase();
    const k=Object.keys(ORGS).find(k=>ORGS[k].name.toLowerCase()===on);
    const o=k?{org:k}:null; if(o) return canChat(me(),Object.assign({id:'__probe'},o));
    const t=m.orgType||'customer', mt=orgOf(me()).type;
    if(mt==='merchsmith') return t==='distributor'||t==='supplier';
    if(mt==='distributor') return t==='customer'||t==='supplier'||t==='merchsmith';
    if(mt==='supplier') return t==='distributor'||t==='merchsmith';
    return t==='distributor'; }
  function chatWith(m){ if(isMe(m)){ toast('That’s you'); return; }
    const p=resolve(m); if(!p) return; openPerson(p.id); }

  function openPerson(id){ const p=person(id); if(!p) return; if(!canChat(me(),p)){ toast('You can’t message '+p.name.split(' ')[0]+' — they aren’t one of your contacts'); return; }
    openConv(dmWith(id).id); }

  /* live sync: another tab (or identity) wrote to the store */
  window.addEventListener('storage',e=>{
    if(e.key===KEY){ S=load()||S; views.forEach(v=>{ if(v.cur&&S.convs[v.cur]&&(v.page||panel&&panel.classList.contains('on'))) { const c=S.convs[v.cur]; if(v.held) return; if(unreadOf(c)&&!v.newSince) v.newSince=readAt(meId(),c.id); markRead(c); } }); drawAll(); }
    if(e.key===TKEY) views.forEach(v=>{ const c=v.cur&&S.convs[v.cur]; if(!c) return; const el=v.root.querySelector('[data-mctyping]'); if(!el) return;
      const t=typingIn(c); el.hidden=!t; el.lastChild.textContent=t; });
  });
  setInterval(()=>views.forEach(v=>{ const c=v.cur&&S.convs[v.cur]; const el=c&&v.root.querySelector('[data-mctyping]'); if(el&&!el.hidden&&!typingIn(c)) el.hidden=true; }),1500);
  // identity switch: redraw as the new person
  window.addEventListener('ms-identity-change',()=>{ views.forEach(v=>{ v.cur=null; v.mode='list'; }); drawAll(); });

  /* ---------------- profile slide-out ---------------- */
  let scrim, pane;
  function openProfile(id){
    const p=typeof id==='string'?(person(id)||{id:'',name:id,title:'',org:'',accent:'#7b85c5'}):id;
    // the full user panel (dist-users.js) replaces this older card wherever it's loaded
    if(window.MSUSER&&MSUSER.open){ const o=orgOf(p)||{}; if(MSUSER.open({name:p.name,email:p.email,org:o.name||p.orgName||''})){ closeProfile(); return; } }
    if(!pane){ scrim=document.createElement('div'); scrim.className='prof-scrim'; document.body.appendChild(scrim);
      pane=document.createElement('aside'); pane.className='prof-pane'; document.body.appendChild(pane); scrim.onclick=closeProfile; }
    const ok=p.id&&canChat(me(),p);
    pane.innerHTML=`<div class="prof-top"><button class="x" data-px aria-label="Close">×</button>
        <div class="prof-big">${avatar(p,76)}</div><h3>${esc(p.name)}</h3><div class="role">${esc(p.title||'')}</div><div class="org">${esc(orgOf(p).name||p.orgName||'')}</div></div>
      <div class="prof-act">${ok?`<button class="prof-chat" data-pchat>${ICN.chat}Message</button>`:`<p class="prof-no">Not one of your contacts</p>`}</div>
      <div class="prof-body"><div class="prof-sec"><h4>Contact</h4><div class="prof-kv">
        ${p.id?`<span class="k">Status</span><span class="v">${p.online?'Online now':'Offline'}</span>`:''}
        <span class="k">Organisation</span><span class="v">${esc(orgOf(p).name||p.orgName||'—')}</span>
        <span class="k">Role</span><span class="v">${esc(p.title||'—')}</span>
        ${p.team?`<span class="k">Team</span><span class="v">${esc(p.team)}</span>`:''}
        ${p.email?`<span class="k">Email</span><span class="v"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></span>`:''}
        ${p.phone?`<span class="k">Phone</span><span class="v"><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></span>`:''}</div></div></div>`;
    pane.querySelector('[data-px]').onclick=closeProfile;
    const ch=pane.querySelector('[data-pchat]'); if(ch) ch.onclick=()=>{ closeProfile(); openPerson(p.id); };
    scrim.classList.add('on'); pane.classList.add('on');
  }
  function closeProfile(){ if(pane){ pane.classList.remove('on'); scrim.classList.remove('on'); } }
  document.addEventListener('click',e=>{ const a=e.target.closest('[data-person]'); if(a&&person(a.dataset.person)&&!a.closest('.mc-pick')){ e.preventDefault(); e.stopPropagation(); openProfile(a.dataset.person); } },true);

  /* ---- any avatar, anywhere → the profile pane ----
     One delegated handler rather than wiring every renderer. It resolves the person
     from what avatars already carry (img alt, title, "Name · Role" tips, the row's
     name), matches the chat directory first (rich card + Message), then the people
     store (email, phone, team), then falls back to what the page itself says.
     Skipped: the signed-in avatar menu, photo pickers in forms, and rows whose own
     click already opens a fuller user drawer (Team / Organisations / admin team). */
  const AV_SEL='.av,.msav,.mc-av,.cav,.collab-av,.pn-av,.pc-av,.uav,.am-av';
  const AV_SKIP='.mc-stack,.mc-prj,.account,.ms-acct,.ava,.avrow,.pp-modal form,.dwr-head,[data-uid],[data-tm],.urow[data-t],.prof-pane,.mc-pick,label,input';
  const tidy=s=>String(s||'').replace(/\s+/g,' ').trim();
  function nameFrom(el){
    const tip=el.closest('[data-mstip]'); if(tip&&el.contains(tip)||tip===el) return tidy(tip.dataset.mstip.split('·')[0]);
    const own=el.closest('[data-mstip]'); if(own&&own.contains(el)&&own.querySelectorAll(AV_SEL).length<=1) return tidy(own.dataset.mstip.split('·')[0]);
    const img=el.querySelector('img'); if(img&&img.alt&&!/^(avatar|photo|logo)?$/i.test(img.alt)) return tidy(img.alt);
    if(el.title&&!/,/.test(el.title)) return tidy(el.title);
    const row=el.closest('.lrow,.cmt-c,.pn-thread li,.cmt,.msg,.chiprow,.chip');
    if(row){ const b=row.querySelector('b'); if(b&&b!==el){ const t=[...b.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent).join(''); return {n:tidy(t),weak:true}; } }
    return '';
  }
  function findPerson(n){
    const q=n.toLowerCase().replace(/\.$/,''); if(!q) return null;
    let p=PEOPLE.find(x=>x.name.toLowerCase()===q);
    if(!p){ const m=q.match(/^(\S+)\s+(\S)\.?$/);          // "Jess D."
      if(m) p=PEOPLE.find(x=>{ const w=x.name.toLowerCase().split(' '); return w[0]===m[1]&&(w[1]||'')[0]===m[2]; }); }
    return p||null;
  }
  function fromStore(n){
    try{ const s=JSON.parse(localStorage.getItem('ms-people')||'null'); if(!s) return null;
      const q=n.toLowerCase(); let hit=null;
      [s.users||{},s.added||{}].forEach(src=>Object.values(src).forEach(org=>(Array.isArray(org)?org:Object.values(org)).forEach(u=>{
        if(!hit&&u&&String(u.n||'').toLowerCase()===q) hit=u; })));
      return hit; }catch(e){ return null; }
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest(AV_SEL); if(!el||el.closest(AV_SKIP)) return;
    if(el.closest('[data-person]')) return;                 // handled above
    const got=nameFrom(el), weak=!!(got&&got.weak), n=weak?got.n:got;
    if(!n||n.length<2||/^[A-Z]{1,3}$/.test(n)) return;
    const hit=findPerson(n), st=fromStore(hit?hit.name:n);
    if(weak&&!hit&&!st) return;
    e.preventDefault(); e.stopPropagation();
    if(hit){ openProfile(Object.assign({},hit,{online:hit.online},st?{email:st.email,phone:st.phone,team:st.team}:{})); return; }
    const tip=(el.closest('[data-mstip]')||{}).dataset; const role=tip&&tip.mstip&&tip.mstip.split('·')[1];
    openProfile({id:'',name:n,title:(st&&st.title)||tidy(role||''),orgName:'',email:st&&st.email,phone:st&&st.phone,team:st&&st.team});
  },true);

  /* ---------------- styles ---------------- */
  const css=`
  .chat-fab{position:fixed;bottom:24px;right:24px;z-index:130;width:58px;height:58px;border-radius:50%;border:0;background:var(--periwinkle-deep,#5860A6);color:#fff;box-shadow:0 10px 28px rgba(40,44,80,.34);cursor:pointer;display:grid;place-items:center;transition:transform .16s;}
  .chat-fab:hover{transform:scale(1.06);}
  .chat-fab svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;}
  .chat-fab .fab-b{position:absolute;top:-2px;right:-2px;background:var(--flare,#d2453a);color:#fff;font-size:11px;font-weight:800;border-radius:999px;min-width:20px;height:20px;display:grid;place-items:center;border:2px solid #fff;padding:0 4px;}
  .chat-panel{position:fixed;bottom:24px;right:24px;z-index:131;width:min(400px,94vw);height:600px;max-height:calc(100vh - 48px);background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(20,22,45,.3);overflow:hidden;transform:translateY(16px) scale(.98);opacity:0;pointer-events:none;transition:transform .22s cubic-bezier(.4,0,.2,1),opacity .22s;}
  .chat-panel.on{transform:none;opacity:1;pointer-events:auto;}
  .mc{font-family:var(--sans);color:var(--ink);}
  .mc-panelv{display:flex;flex-direction:column;height:100%;}
  .mc-page{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);height:min(720px,calc(100vh - 230px));min-height:480px;background:#fff;border:1px solid var(--line-soft);border-radius:18px;overflow:hidden;}
  @media(max-width:760px){.mc-page{grid-template-columns:1fr;}.mc-page .mc-main{display:none;}}
  .mc-col{display:flex;flex-direction:column;min-height:0;border-right:1px solid var(--line-soft);}
  .mc-main{display:flex;flex-direction:column;min-height:0;min-width:0;}
  .mc svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}
  .mc-hd{display:flex;align-items:center;gap:8px;padding:13px 14px;background:var(--periwinkle-deep,#5860A6);color:#fff;flex:none;}
  .mc-page .mc-hd{background:#fff;color:var(--ink);border-bottom:1px solid var(--line-soft);}
  .mc-hd h3{margin:0;flex:1;min-width:0;font-size:15.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-ib{width:32px;height:32px;flex:none;border:0;border-radius:50%;background:none;color:inherit;display:grid;place-items:center;cursor:pointer;}
  .mc-ib:hover{background:rgba(255,255,255,.16);}
  .mc-page .mc-ib:hover{background:var(--paper);}
  .mc-tt{flex:1;min-width:0;}
  .mc-tt h3{font-size:14.5px;}
  .mc-tt span{display:block;font-size:11.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-page .mc-tt span{color:var(--ink-3);opacity:1;}
  .mc-tt a{color:inherit;font-weight:800;text-decoration:underline;}
  .mc-search{display:flex;align-items:center;gap:8px;margin:10px 12px;border:1.5px solid var(--line-soft);border-radius:10px;padding:7px 10px;flex:none;}
  .mc-search svg{width:15px;height:15px;color:var(--ink-3);}
  .mc-search input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:13px;background:none;}
  .mc-search:focus-within{border-color:var(--periwinkle);}
  .mc-list{flex:1;overflow-y:auto;min-height:0;padding-bottom:6px;}
  .mc-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 14px;border:0;background:none;font:inherit;color:inherit;cursor:pointer;border-bottom:1px solid var(--paper-2);}
  .mc-row:hover{background:var(--paper);}
  .mc-row.on{background:var(--tint-peri,#eceefb);}
  .mc-row.unread .mc-meta b{font-weight:800;}
  .mc-row.unread .mc-last{color:var(--ink);font-weight:700;}
  .mc-av{position:relative;flex:none;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;overflow:visible;}
  .mc-av img{width:100%;height:100%;object-fit:cover;border-radius:50%;}
  .mc-on{position:absolute;right:0;bottom:0;width:26%;height:26%;min-width:8px;min-height:8px;border-radius:50%;background:#3a9d6b;border:2px solid #fff;}
  .mc-prj{background:var(--sky,#0097D8);border-radius:11px;}
  .mc-prj svg{width:55%;height:55%;color:#fff;}
  .mc-stack{position:relative;flex:none;}
  .mc-stack .mc-av{position:absolute;border:2px solid #fff;}
  .mc-stack .mc-av:first-child{top:0;left:0;}
  .mc-stack .mc-av:last-child{right:0;bottom:0;}
  .mc-meta{flex:1;min-width:0;}
  .mc-meta b{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-kind{font-style:normal;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);background:var(--paper-2);border-radius:999px;padding:1px 6px;flex:none;}
  .mc-last{display:block;font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-last mark{background:rgba(255,235,61,.7);color:var(--ink);border-radius:3px;}
  .mc-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none;}
  .mc-when{font-size:11px;color:var(--ink-3);}
  .mc-un{background:var(--periwinkle-deep);color:#fff;font-size:10.5px;font-weight:800;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;}
  .mc-un.m{background:var(--paper-2);color:var(--ink-3);}
  .mc-mute svg{width:13px;height:13px;color:var(--ink-3);}
  .mc-sech{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);padding:12px 14px 6px;}
  .mc-filt{display:flex;align-items:center;gap:8px;margin:0 14px 8px;padding:7px 11px;border-radius:9px;background:rgba(255,235,61,.28);font-size:12px;font-weight:700;color:var(--ink-2);}
  .mc-filt button{margin-left:auto;font:inherit;font-size:12px;font-weight:800;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;text-decoration:underline;}
  .mc-empty{font-size:13px;color:var(--ink-3);padding:24px 16px;text-align:center;margin:0;}
  .mc-blank{flex:1;display:grid;place-content:center;justify-items:center;gap:6px;color:var(--ink-3);text-align:center;padding:30px;}
  .mc-blank svg{width:40px;height:40px;opacity:.5;}
  .mc-blank b{color:var(--ink);font-size:15px;}
  .mc-blank span{font-size:13px;}
  .mc-mutebar{font-size:11.5px;font-weight:700;color:var(--ink-3);background:var(--paper);padding:6px 14px;border-bottom:1px solid var(--line-soft);flex:none;}
  .mc-thread{flex:1;overflow-y:auto;min-height:0;padding:12px 18px;display:flex;flex-direction:column;gap:0;background:#fff;}
  .mc-day{align-self:center;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);background:#fff;border:1px solid var(--line-soft);border-radius:999px;padding:3px 11px;margin:8px 0 4px;}
  .mc-msg{display:flex;gap:10px;align-items:flex-start;flex:none;padding:4px 6px;margin:0 -6px;border-radius:8px;}
  .mc-msg:not(.cont){margin-top:6px;}
  .mc-msg:hover{background:rgba(20,22,45,.035);}
  .mc-gut{width:36px;flex:none;display:flex;justify-content:center;}
  .mc-gt{font-size:10px;color:var(--ink-3);opacity:0;padding-top:3px;white-space:nowrap;}
  .mc-msg.cont:hover .mc-gt{opacity:1;}
  .mc-mbody{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px;}
  .mc-mh{display:flex;align-items:baseline;gap:8px;}
  .mc-mh b{font-size:13.5px;font-weight:800;color:var(--ink);cursor:pointer;white-space:nowrap;}
  .mc-mh span{white-space:nowrap;}
  .mc-mh b:hover{text-decoration:underline;}
  .mc-mh em{font-style:normal;font-weight:600;color:var(--ink-3);font-size:12px;}
  .mc-mh span{font-size:11px;color:var(--ink-3);font-weight:600;}
  .mc-mh .mc-rc{align-self:center;}
  .mc-day,.mc-typing,.mc-thread>.mc-empty,.mc-sys{flex:none;}
  .mc-stack .mc-more{background:var(--paper-2);color:var(--ink-2);font-weight:800;box-shadow:0 0 0 2px #fff;}
  .mc-sys{align-self:center;font-size:11.5px;font-weight:700;color:var(--ink-3);padding:2px 10px;}
  .mc-pk.mc-mng{width:320px;overflow-y:auto;max-height:none;display:block;}
  .mc-mrow{display:flex;align-items:center;gap:4px;}
  .mc-mrow .mc-row{flex:1;min-width:0;}
  .mc-rm{flex:none;font:inherit;font-size:11.5px;font-weight:800;color:#b92a17;background:#fff;border:1.5px solid var(--line-soft);border-radius:8px;padding:5px 9px;cursor:pointer;}
  .mc-rm:hover{border-color:#b92a17;background:rgba(255,46,23,.06);}
  .mc-addl{max-height:220px;overflow-y:auto;}
  .mc-plus{margin-left:auto;color:var(--periwinkle-deep);display:grid;place-items:center;}
  .mc-plus svg{width:15px;height:15px;}
  .mc-rn{display:flex;gap:6px;margin-bottom:4px;}
  .mc-rn input{flex:1;min-width:0;font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;}
  .mc-rn input:focus{outline:0;border-color:var(--periwinkle);}
  .mc-rn button{font:inherit;font-size:12.5px;font-weight:800;color:#fff;background:var(--periwinkle);border:0;border-radius:9px;padding:0 13px;cursor:pointer;}
  .mc-leave{display:block;width:100%;margin-top:10px;font:inherit;font-size:12.5px;font-weight:800;color:#b92a17;background:none;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px;cursor:pointer;}
  .mc-leave:hover{border-color:var(--flare);}
  .mc-msg.hit{background:rgba(255,235,61,.3);}
  .mc-new{display:flex;align-items:center;gap:8px;margin:12px 0 2px;flex:none;}
  .mc-new::before{content:"";flex:1;height:1px;background:var(--flare,#FF2E17);}
  .mc-new span{font-size:11px;font-weight:800;color:#b92a17;}
  .mc-rd{width:22px;height:22px;display:none;place-items:center;border-radius:6px;color:var(--ink-3);cursor:pointer;}
  .mc-rd svg{width:14px;height:14px;}
  .mc-row:hover .mc-rd,.mc-rd:focus{display:grid;}
  .mc-row:hover .mc-when{display:none;}
  .mc-rd:hover{background:var(--paper-2);color:var(--periwinkle-deep);}
  .mc-allread{margin-left:auto;font:inherit;font-size:11.5px;font-weight:800;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;white-space:nowrap;}
  .mc-allread:hover{text-decoration:underline;}
  .mc-allread+.mc-ib{margin-left:4px;}
  .mc-msg{position:relative;}
  .mc-acts{position:absolute;top:-10px;right:8px;display:none;gap:2px;background:#fff;border:1px solid var(--line-soft);border-radius:8px;padding:2px;box-shadow:0 4px 12px rgba(20,22,45,.12);z-index:2;}
  .mc-msg:hover .mc-acts{display:flex;}
  .mc-acts button{width:28px;height:26px;display:grid;place-items:center;border:0;background:none;border-radius:6px;color:var(--ink-3);cursor:pointer;}
  .mc-acts button svg{width:15px;height:15px;}
  .mc-acts button:hover{background:var(--paper);color:var(--ink);}
  .mc-acts button[data-mcdel]:hover{color:#b92a17;}
  .mc-msg.editing{background:rgba(88,96,166,.06);}
  .mc-edit textarea{width:100%;font:inherit;font-size:13.5px;color:var(--ink);border:1.5px solid var(--periwinkle);border-radius:9px;padding:8px 10px;resize:vertical;}
  .mc-edit textarea:focus{outline:0;}
  .mc-editacts{display:flex;align-items:center;gap:10px;margin-top:6px;}
  .mc-editacts span{font-size:11px;color:var(--ink-3);margin-right:auto;}
  .mc-go.sm{padding:6px 14px;font-size:12px;}
  .mc-link{font:inherit;font-size:12px;font-weight:800;color:var(--ink-3);background:none;border:0;cursor:pointer;}
  .mc-edited{font-size:11px;color:var(--ink-3);margin-left:5px;}
  .mc-gone{font-style:italic;color:var(--ink-3);}
  .mc-bub{font-size:13.5px;line-height:1.5;color:var(--ink-2);word-break:break-word;}
  .mc-bub .mc-rc{display:inline-flex;vertical-align:-3px;margin-left:5px;color:var(--ink-3);}
  .mc-bub .mc-rc.seen{color:var(--sky,#0097D8);}
  .mc-t{display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--ink-3);padding:0 4px;}
  .mc-rc svg{width:14px;height:14px;}
  .mc-rc.seen{color:var(--sky,#0097D8);}
  .mc-img img{display:block;max-width:240px;max-height:220px;border-radius:12px;border:1px solid var(--line-soft);}
  .mc-file,.mc-card{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:9px 12px;text-decoration:none;color:var(--ink);max-width:260px;}
  .mc-file svg{width:22px;height:22px;color:var(--periwinkle-deep);flex:none;}
  .mc-file b,.mc-card b{display:block;font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-file em,.mc-card em,.mc-card i{display:block;font-style:normal;font-size:10.5px;color:var(--ink-3);}
  .mc-card em{font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--periwinkle-deep);}
  .mc-card>span:last-child{min-width:0;}
  .mc-card img{width:44px;height:44px;object-fit:contain;border-radius:8px;background:var(--paper);flex:none;}
  .mc-cardic{width:44px;height:44px;border-radius:8px;background:var(--tint-peri,#eceefb);color:var(--periwinkle-deep);display:grid;place-items:center;flex:none;}
  .mc-card:hover,.mc-file:hover{border-color:var(--periwinkle);}
  .mc-typing[hidden]{display:none!important;}
  .mc-typing{align-self:flex-start;display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--ink-3);font-weight:700;padding:4px 2px;}
  .mc-dots{display:inline-flex;gap:3px;background:#fff;border:1px solid var(--line-soft);border-radius:999px;padding:7px 9px;}
  .mc-dots i{width:5px;height:5px;border-radius:50%;background:var(--ink-3);animation:mcdot 1.2s infinite;}
  .mc-dots i:nth-child(2){animation-delay:.15s}.mc-dots i:nth-child(3){animation-delay:.3s}
  @keyframes mcdot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}
  .mc-pend{display:flex;align-items:center;gap:9px;padding:8px 14px;border-top:1px solid var(--line-soft);font-size:12.5px;font-weight:700;flex:none;}
  .mc-pend img{width:36px;height:36px;object-fit:cover;border-radius:7px;}
  .mc-pend span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-pend button{border:0;background:none;cursor:pointer;color:var(--ink-3);}
  .mc-compose{display:flex;align-items:flex-end;gap:2px;padding:10px 10px 12px;border-top:1px solid var(--line-soft);flex:none;background:#fff;}
  .mc-compose .mc-ib{color:var(--ink-3);}
  .mc-compose .mc-ib:hover{background:var(--paper);color:var(--periwinkle-deep);}
  .mc-compose textarea{flex:1;min-width:0;resize:none;border:1.5px solid var(--line-soft);border-radius:18px;padding:8px 13px;font:inherit;font-size:13.5px;line-height:1.4;outline:0;max-height:120px;}
  .mc-compose textarea:focus{border-color:var(--periwinkle);}
  .mc-send{width:38px;height:38px;flex:none;border:0;border-radius:50%;background:var(--periwinkle-deep,#5860A6);color:#fff;display:grid;place-items:center;cursor:pointer;}
  .mc-kinds{display:flex;gap:2px;background:var(--paper-2);border-radius:999px;padding:3px;margin:12px 12px 0;flex:none;}
  .mc-kinds button{flex:1;border:0;background:none;border-radius:999px;padding:7px 8px;font:inherit;font-size:12.5px;font-weight:800;color:var(--ink-3);cursor:pointer;}
  .mc-kinds button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);}
  .mc-kinds.sm{margin:0 0 8px;}
  .mc-titlein{margin:10px 12px 0;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;font:inherit;font-size:13.5px;flex:none;background:#fff;}
  .mc-titlein:focus{outline:0;border-color:var(--periwinkle);}
  .mc-rule{font-size:11.5px;color:var(--ink-3);margin:0 14px 4px;line-height:1.45;}
  .mc-pick .mc-chk{width:20px;height:20px;border-radius:6px;border:1.5px solid var(--line);display:grid;place-items:center;flex:none;}
  .mc-pick.on .mc-chk{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;}
  .mc-pick .mc-chk svg{width:13px;height:13px;}
  .mc-newfoot{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid var(--line-soft);font-size:12.5px;font-weight:700;color:var(--ink-3);flex:none;}
  .mc-go{border:0;border-radius:10px;background:var(--periwinkle-deep);color:#fff;font:inherit;font-weight:800;font-size:13px;padding:9px 16px;cursor:pointer;}
  .mc-go:disabled{opacity:.45;cursor:not-allowed;}
  .mc-pk{position:fixed;z-index:160;width:320px;max-height:360px;overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid var(--line-soft);border-radius:14px;box-shadow:0 18px 46px rgba(20,22,45,.24);padding:10px;font-family:var(--sans);}
  .mc-pk input{border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;font:inherit;font-size:13px;margin-bottom:6px;}
  .mc-pkl{overflow-y:auto;min-height:0;}
  .mc-pkl button{display:grid;grid-template-columns:36px minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;align-items:center;width:100%;text-align:left;border:0;background:none;border-radius:9px;padding:6px;font:inherit;cursor:pointer;}
  .mc-pkl button:hover{background:var(--paper);}
  .mc-pkl img,.mc-pkl button>span{grid-row:span 2;width:36px;height:36px;border-radius:8px;object-fit:contain;background:var(--paper);display:grid;place-items:center;color:var(--periwinkle-deep);}
  .mc-pkl svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;}
  .mc-pkl b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-pkl em{font-style:normal;font-size:11px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mc-pk .mc-row{padding:7px 6px;border-radius:9px;border-bottom:0;}
  .mc-toast{position:fixed;left:50%;bottom:30px;transform:translate(-50%,12px);z-index:400;background:var(--ink);color:#fff;font:600 13px var(--sans);padding:11px 18px;border-radius:12px;opacity:0;pointer-events:none;transition:.22s;}
  .mc-toast.on{opacity:1;transform:translate(-50%,0);}
  .av,.msav,.mc-av,.cav,.collab-av,.pn-av{cursor:pointer;}
  .account .av,.ms-acct .ava,.avrow .av{cursor:inherit;}
  .prof-scrim{position:fixed;inset:0;background:rgba(22,24,28,.4);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .25s;z-index:140;}
  .prof-scrim.on{opacity:1;pointer-events:auto;}
  .prof-pane{position:fixed;top:0;right:0;height:100vh;width:min(380px,92vw);background:#fff;transform:translateX(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);z-index:141;display:flex;flex-direction:column;font-family:var(--sans);}
  .prof-pane.on{transform:none;box-shadow:-14px 0 44px rgba(20,22,45,.2);}
  .prof-top{padding:26px 24px;text-align:center;border-bottom:1px solid var(--line-soft);position:relative;}
  .prof-top .x{position:absolute;top:14px;right:16px;border:0;background:none;font-size:22px;color:var(--ink-3);cursor:pointer;}
  .prof-big{display:flex;justify-content:center;margin-bottom:12px;}
  .prof-top h3{margin:0;font-family:var(--serif);font-weight:500;font-size:22px;}
  .prof-top .role{font-size:13px;color:var(--ink-2);margin-top:3px;}
  .prof-top .org{font-size:12px;color:var(--ink-3);margin-top:1px;}
  .prof-act{display:flex;gap:10px;padding:18px 24px;}
  .prof-chat{flex:1;border:0;border-radius:11px;padding:11px;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--periwinkle-deep);color:#fff;}
  .prof-chat svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;}
  .prof-no{flex:1;text-align:center;font-size:12.5px;font-weight:700;color:var(--ink-3);background:var(--paper);border-radius:11px;padding:11px;margin:0;}
  .prof-body{flex:1;overflow-y:auto;padding:6px 24px 30px;}
  .prof-sec{padding:16px 0;border-top:1px solid var(--line-soft);}
  .prof-sec h4{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);}
  .prof-kv{display:grid;grid-template-columns:100px 1fr;gap:8px 12px;font-size:13.5px;}
  .prof-kv .k{color:var(--ink-3);}.prof-kv .v{font-weight:700;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  /* ---------------- public ---------------- */
  // `people` kept for older callers: my contacts, in the shape the Chats page used to read
  const peopleCompat=()=>contacts().map(p=>{ const c=Object.values(S.convs).find(x=>x.type==='dm'&&x.members.includes(meId())&&x.members.includes(p.id));
    return Object.assign({},p,{role:p.title,orgName:orgOf(p).name,last:c?preview(c):'',when:c?when(lastAt(c)):'',unread:c?unreadOf(c):0}); });
  window.MSChat={ open, close, openPerson, openConv, openProfile, canChat, me, contacts, convs, chatWith, reachable, person, orgOf, resolve,
    unread:totalUnread, titleOf, preview, lastAt, when, avatar, convAvatar, unreadOf,
    mount(el){ el.setAttribute('data-mcpage','1');
      if(fab){ fab.remove(); panel.remove(); views.delete(pv); fab=panel=pv=null; }   // the page is the chat surface here
      const v=View(el,true);
      v.show=function(kind){ v.q='';
        if(kind==='unread'){ v.only='unread'; v.mode=v.cur?'thread':'list'; }
        else if(kind==='all'){ v.only=''; v.mode=v.cur?'thread':'list'; }
        else if(kind==='online'||kind==='contacts'){ v.onlineOnly=kind==='online'; v.mode='new'; v.newKind='dm'; v.picked=new Set(); v.q2=''; v.gtitle=''; }
        v.draw(); };
      if(location.hash==='#new'){ v.mode='new'; v.newKind='dm'; v.picked=new Set(); v.q2=''; v.gtitle=''; }
      v.draw(); return v; },
    get people(){ return peopleCompat(); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
