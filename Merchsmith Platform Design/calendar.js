/* ============================================================
   calendar.js — cross-organisation meeting calendar.

   Who you can see and book = the chat contact rules (MSChat.contacts()).
   Other people show as FREE/BUSY only (blocks, no titles), unless you
   are also in that meeting. Your own calendar shows full detail.

   Features: Day / Week / Month / Agenda views, overlay colleagues'
   free/busy, New meeting with "find a time", video link auto-added
   (Meet / Zoom / Teams), link to a project or product, reminders,
   Invitations (accept / decline / propose new time), a personal
   booking link (Calendly-style) and connected calendars (Google,
   Outlook / 365, Calendly, Apple / iCal feed).

   PROTOTYPE: no real calendar APIs. Connections are simulated; other
   people's busy time is generated per person per day. Store:
   ms-cal-v1 {events, links, conns, prefs, fired}.

   window.MSCAL: mount(root) · pendingFor(personId) · events()
   ============================================================ */
window.MSCAL=(function(){
  const KEY='ms-cal-v1', H0=7, H1=20, PX=48;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const C=()=>window.MSChat;
  const day0=d=>{ const x=new Date(d); x.setHours(0,0,0,0); return x; };
  const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
  const monday=d=>{ const x=day0(d); const w=(x.getDay()+6)%7; return addD(x,-w); };
  const same=(a,b)=>day0(a).getTime()===day0(b).getTime();
  const at=(d,h,m)=>{ const x=day0(d); x.setHours(h,m||0,0,0); return x; };
  const fT=d=>new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const fD=(d,o)=>new Date(d).toLocaleDateString('en-GB',o||{weekday:'short',day:'numeric',month:'short'});
  const iso=d=>new Date(d).toISOString();
  const mmss=s=>{ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
  const VIDEO={meet:'Google Meet',zoom:'Zoom',teams:'Microsoft Teams'};
  const MODES=[['video','Video call'],['phone','Phone call'],['person','Face to face']];
  const modeOf=e=>e.mode||(e.video?'video':'person');
  // short label used on calendar blocks, agenda rows and invitations
  const how=e=>{ const m=modeOf(e); return m==='video'?(e.video?VIDEO[e.video.provider]:'Video call'):m==='phone'?'Phone call':(e.location?e.location.split(/[,\n]/)[0]:'Face to face'); };
  const telHref=t=>'tel:'+String(t||'').replace(/[^\d+]/g,'');
  const mapHref=a=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(a||'');
  const vLink=p=>{ const r=Math.random().toString(36); return p==='meet'?'https://meet.google.com/'+r.slice(2,5)+'-'+r.slice(5,9)+'-'+r.slice(9,12)
    :p==='zoom'?'https://zoom.us/j/'+String(Math.floor(1e10+Math.random()*9e10)):p==='teams'?'https://teams.microsoft.com/l/meetup-join/'+r.slice(2,12):''; };
  const PROJECTS=['Autumn Giveaways','Summer Event','Winter Welcome Packs','Staff Onboarding Kits'];

  /* ---------- store ---------- */
  function seed(){ const m=monday(new Date());
    const ev=(id,title,org,att,d,h,mi,dur,extra)=>Object.assign({id,title,organiser:org,attendees:att.map(([p,s])=>({id:p,status:s})),
      start:iso(at(addD(m,d),h,mi)),end:iso(new Date(at(addD(m,d),h,mi).getTime()+dur*6e4)),video:null,project:'',product:'',notes:'',reminder:15},extra||{});
    const V=p=>({provider:p,url:vLink(p)});
    return { events:[
      ev('e1','Autumn Giveaways — proof review','jess',[['sara','accepted'],['cara','accepted']],1,10,0,45,{video:V('meet'),project:'Autumn Giveaways',notes:'Walk through the three open proofs before sign-off.'}),
      ev('e2','Q4 capacity call','tomr',[['jess','pending'],['eve','accepted']],3,14,0,30,{mode:'phone',phone:'01772 830 441',notes:'Bag lead times for November and December.'}),
      ev('e3','Citrix quarterly review','sara',[['jess','accepted'],['leo','pending']],4,11,0,60,{video:V('zoom'),project:'Autumn Giveaways'}),
      ev('e4','Platform onboarding check-in','morgan',[['jess','pending']],2,16,0,30,{video:V('meet')}),
      ev('e5','Sample sign-off: Heavy Weight T-Shirt','cara',[['sara','pending']],7,9,30,30,{mode:'person',location:'Citrix, The Coachworks, 21 The Calls, Leeds LS2 7EH',project:'Autumn Giveaways',product:'Heavy Weight T-Shirt'}),
      ev('e6','Feed mapping walkthrough','tomw',[['emile','accepted'],['tomr','pending']],2,11,0,45,{video:V('meet')}),
      ev('e7','Team stand-up','jess',[['cara','accepted'],['raf','accepted'],['ben','accepted']],0,9,0,15,{video:V('meet'),repeat:'weekdays'})
    ], links:{}, conns:{}, prefs:{}, fired:{} }; }
  // past meetings used to demo "After the meeting" (Gemini notes, upload); added once to any store
  function pastSeed(){ const m=addD(monday(new Date()),-7), mk=(id,title,org,att,d,h,dur,extra)=>Object.assign({id,title,organiser:org,attendees:att.map(p=>({id:p,status:'accepted'})),start:iso(at(addD(m,d),h)),end:iso(new Date(at(addD(m,d),h).getTime()+dur*6e4)),mode:'video',project:'',product:'',notes:'',reminder:15},extra);
    const s0=at(addD(m,2),11).getTime(), T=(min,sec)=>min*60+(sec||0);
    return [mk('e8','Autumn Giveaways kick-off','jess',['sara','cara'],2,11,45,{video:{provider:'meet',url:vLink('meet')},project:'Autumn Giveaways',notes:'Scope, budget and dates.',
        after:{_:{source:'gemini',addedAt:iso(new Date(s0+50*6e4)),docUrl:'https://docs.google.com/document/d/1Gm-autumn-kickoff-notes',
          summary:'Kick-off for Autumn Giveaways. Citrix confirmed 1,500 staff packs for delivery on 14 November: tote, mug and notebook. Budget is £18,000 excluding VAT. Artwork uses the new autumn palette; Sara will share the files.',
          actions:[{t:'Share autumn brand guidelines and logo files',who:'Sara',done:true},{t:'Send first proofs for tote, mug and notebook',who:'Cara',done:false},{t:'Confirm the delivery split across the three offices',who:'Sara',done:false},{t:'Book the proof review meeting',who:'Jess',done:true}],
          transcript:[{who:'Jess',t:T(0,12),text:'Thanks both for joining. Shall we start with numbers and dates?'},{who:'Sara',t:T(0,31),text:'We’re at 1,500 packs. They need to land by the 14th of November.'},{who:'Jess',t:T(1,5),text:'And the pack is still the tote, the mug and the A5 notebook?'},{who:'Sara',t:T(1,14),text:'Yes. Budget is eighteen thousand before VAT.'},{who:'Cara',t:T(3,40),text:'That works. Lead time on the totes is ten working days once proofs are signed off.'},{who:'Sara',t:T(6,2),text:'We’ve got a new autumn palette. I’ll send the guidelines over today.'},{who:'Cara',t:T(6,20),text:'Great, I’ll turn proofs round within two days of getting them.'},{who:'Jess',t:T(9,48),text:'I’ll book a proof review for next week. Delivery split across the three offices, Sara?'},{who:'Sara',t:T(10,3),text:'I’ll confirm numbers per office by Friday.'}]}}}),
      mk('e9','BagWorks supplier onboarding','tomr',['jess'],3,14,30,{video:{provider:'zoom',url:vLink('zoom')},notes:'Feed set-up and pricing tiers.'}),
      mk('e10','Winter Welcome Packs planning','jess',['sara'],4,10,30,{video:{provider:'meet',url:vLink('meet')},project:'Winter Welcome Packs',geminiReady:true})]; }
  function db(){ let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} if(!o||!o.events) o=seed();
    if(!o.pastSeeded){ o.events.push(...pastSeed().filter(p=>!o.events.some(x=>x.id===p.id))); o.pastSeeded=1; save(o); } return o; }
  function save(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function upd(fn){ const o=db(); fn(o); save(o); try{ window.dispatchEvent(new CustomEvent('ms-cal-change')); }catch(e){} }
  const events=()=>db().events;
  // repeating events (weekdays) expand within a range
  function expand(from,to){ const out=[];
    events().forEach(e=>{ if(e.cancelled) return;
      if(e.repeat==='weekdays'){ const s=new Date(e.start), dur=new Date(e.end)-s;
        for(let d=day0(from);d<to;d=addD(d,1)){ if(d.getDay()===0||d.getDay()===6||d<day0(s)) continue;
          const st=at(d,s.getHours(),s.getMinutes()); out.push(Object.assign({},e,{start:iso(st),end:iso(new Date(st.getTime()+dur)),_occ:iso(st)})); } }
      else if(new Date(e.end)>from&&new Date(e.start)<to) out.push(e); });
    return out; }
  const inEv=(e,pid)=>e.organiser===pid||e.attendees.some(a=>a.id===pid&&a.status!=='declined');
  // people's other commitments, generated so free/busy looks real without exposing anything
  function seedBusy(pid,d){ if(d.getDay()===0||d.getDay()===6) return [];
    const k=hash(pid+day0(d).toDateString()), n=k%4, out=[];
    for(let i=0;i<n;i++){ const h=9+((k>>>(i*3))%8), m=((k>>>(i*5))&1)?30:0, dur=[30,60,60,90][(k>>>(i*2))%4];
      out.push({start:at(d,h,m),end:new Date(at(d,h,m).getTime()+dur*6e4),_seed:true}); }
    return out; }
  function busyOf(pid,from,to,meId){ const o=db(), conn=(o.conns[pid]||{});
    const b=expand(from,to).filter(e=>inEv(e,pid)).map(e=>({start:new Date(e.start),end:new Date(e.end),ev:e}));
    // your own external calendar only counts once it's connected; everyone else's is assumed synced
    if(pid!==meId||conn.google||conn.outlook) for(let d=day0(from);d<to;d=addD(d,1)) seedBusy(pid,d).forEach(x=>b.push(Object.assign(x,{ext:pid===meId?(conn.google?'Google Calendar':'Outlook'):''})));
    return b; }
  /* ---------- availability: working hours, lunch, bank holidays, time off, blocked times ---------- */
  const HOL={
    UK:{name:'UK (England & Wales)',d:{'2026-01-01':'New Year’s Day','2026-04-03':'Good Friday','2026-04-06':'Easter Monday','2026-05-04':'Early May bank holiday','2026-05-25':'Spring bank holiday','2026-08-31':'Summer bank holiday','2026-12-25':'Christmas Day','2026-12-28':'Boxing Day (substitute)',
      '2027-01-01':'New Year’s Day','2027-03-26':'Good Friday','2027-03-29':'Easter Monday','2027-05-03':'Early May bank holiday','2027-05-31':'Spring bank holiday','2027-08-30':'Summer bank holiday','2027-12-27':'Christmas Day (substitute)','2027-12-28':'Boxing Day (substitute)'}},
    SCO:{name:'UK (Scotland)',d:{'2026-01-01':'New Year’s Day','2026-01-02':'2nd January','2026-04-03':'Good Friday','2026-05-04':'Early May bank holiday','2026-05-25':'Spring bank holiday','2026-08-03':'Summer bank holiday','2026-11-30':'St Andrew’s Day','2026-12-25':'Christmas Day','2026-12-28':'Boxing Day (substitute)',
      '2027-01-01':'New Year’s Day','2027-01-04':'2nd January (substitute)','2027-03-26':'Good Friday','2027-05-03':'Early May bank holiday','2027-05-31':'Spring bank holiday','2027-08-02':'Summer bank holiday','2027-11-30':'St Andrew’s Day','2027-12-27':'Christmas Day (substitute)','2027-12-28':'Boxing Day (substitute)'}},
    IE:{name:'Ireland',d:{'2026-01-01':'New Year’s Day','2026-02-02':'St Brigid’s Day','2026-03-17':'St Patrick’s Day','2026-04-06':'Easter Monday','2026-05-04':'May bank holiday','2026-06-01':'June bank holiday','2026-08-03':'August bank holiday','2026-10-26':'October bank holiday','2026-12-25':'Christmas Day','2026-12-26':'St Stephen’s Day',
      '2027-01-01':'New Year’s Day','2027-02-01':'St Brigid’s Day','2027-03-17':'St Patrick’s Day','2027-03-29':'Easter Monday','2027-05-03':'May bank holiday','2027-06-07':'June bank holiday','2027-08-02':'August bank holiday','2027-10-25':'October bank holiday','2027-12-25':'Christmas Day','2027-12-27':'St Stephen’s Day (substitute)'}},
    none:{name:'Don’t block bank holidays',d:{}}};
  const ymd=d=>{ const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
  const mins=t=>{ const [h,m]=String(t||'0:0').split(':').map(Number); return h*60+(m||0); };
  function availOf(pid){ const o=db(), a=(o.avail||{})[pid]; if(a) return a; const h=hash(pid);
    return {days:[1,2,3,4,5],from:['08:30','09:00','09:00','09:30'][h%4],to:['16:30','17:00','17:30','17:30'][(h>>>2)%4],lunch:{on:true,from:(h>>>4)%2?'12:30':'13:00',to:(h>>>4)%2?'13:30':'14:00'},
      hol:'UK',away:(h%5===0)?[{id:'s1',from:ymd(addD(monday(new Date()),8)),to:ymd(addD(monday(new Date()),9)),label:'Annual leave'}]:[],blocks:[]}; }
  function setAvail(pid,patch){ upd(o=>{ o.avail=o.avail||{}; o.avail[pid]=Object.assign({},availOf(pid),patch); }); }
  function dayOff(pid,d){ const a=availOf(pid), k2=ymd(d), hn=(HOL[a.hol]||HOL.none).d[k2];
    if(hn) return {kind:'hol',label:hn}; const aw=(a.away||[]).find(x=>k2>=x.from&&k2<=x.to); if(aw) return {kind:'away',label:aw.label||'Away'};
    if(!(a.days||[]).includes(d.getDay())) return {kind:'off',label:'Not working'}; return null; }
  function offBlocks(pid,d){ const a=availOf(pid), out=[], day=dayOff(pid,d);
    if(day) return [{start:at(d,0),end:addD(day0(d),1),kind:day.kind,label:day.label,allDay:true}];
    const f=mins(a.from), t=mins(a.to);
    if(f>0) out.push({start:at(d,0),end:at(d,0,f),kind:'hours',label:'Outside working hours'});
    if(t<24*60) out.push({start:at(d,0,t),end:addD(day0(d),1),kind:'hours',label:'Outside working hours'});
    if(a.lunch&&a.lunch.on) out.push({start:at(d,0,mins(a.lunch.from)),end:at(d,0,mins(a.lunch.to)),kind:'lunch',label:'Lunch'});
    (a.blocks||[]).forEach(b=>{ const hit=b.repeat==='weekly'?String(d.getDay())===String(b.dow):b.date===ymd(d); if(hit) out.push({start:at(d,0,mins(b.from)),end:at(d,0,mins(b.to)),kind:'block',label:b.label||'Blocked'}); });
    return out; }
  const unavailable=(pid,s,e)=>offBlocks(pid,s).find(b=>b.start<e&&b.end>s)||null;
  const free=(pids,s,e,meId)=>pids.every(p=>!unavailable(p,s,e)&&!busyOf(p,addD(day0(s),0),addD(day0(s),1),meId).some(b=>b.start<e&&b.end>s));
  function suggest(pids,mins,meId,fromDate){ const out=[]; let d=day0(fromDate||new Date());
    for(let i=0;i<21&&out.length<8;i++,d=addD(d,1)){
      for(let t=7*60;t+mins<=20*60&&out.length<8;t+=30){ const s=at(d,0,t), e=new Date(s.getTime()+mins*6e4); if(s<new Date()) continue; if(free(pids,s,e,meId)) out.push(s); } }
    return out; }
  function pendingFor(pid){ return events().filter(e=>!e.cancelled&&new Date(e.end)>new Date()&&(e.attendees.some(a=>a.id===pid&&(a.status==='pending'))||(e.organiser===pid&&e.attendees.some(a=>a.status==='proposed')))).length; }

  /* ---------- page ---------- */
  function mount(root){
    const M=C(); if(!M) return;
    const withOrg=p=>p?Object.assign({},p,{orgName:p.orgName||(M.orgOf?M.orgOf(p).name:'')||''}):p;
    const me=withOrg(M.me()), ME=me.id, contacts=M.contacts().map(withOrg);
    const P=id=>id===ME?me:(contacts.find(p=>p.id===id)||withOrg(M.person&&M.person(id))||{id,name:id,accent:'#9A9AA6'});
    const S={view:'week',date:new Date(),overlay:[],tab:(location.hash.match(/tab=(\w+)/)||[])[1]||'cal'};
    try{ const pr=db().prefs[ME]; if(pr&&pr.overlay) S.overlay=pr.overlay.filter(id=>contacts.some(c=>c.id===id)); if(pr&&pr.view) S.view=pr.view; }catch(e){}
    const persistPrefs=()=>upd(o=>{ o.prefs[ME]=Object.assign(o.prefs[ME]||{},{overlay:S.overlay,view:S.view}); });
    const av=(p,s)=>M.avatar?M.avatar(p,s||28):'';
    const toast=t=>{ let el=document.getElementById('calToast'); if(!el){ el=document.createElement('div'); el.id='calToast'; el.className='cal-toast'; document.body.appendChild(el); }
      el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),2600); };

    function range(){ const d=S.date;
      if(S.view==='day') return [day0(d),addD(day0(d),1)];
      if(S.view==='week') return [monday(d),addD(monday(d),7)];
      if(S.view==='month'){ const f=new Date(d.getFullYear(),d.getMonth(),1); return [monday(f),addD(monday(f),42)]; }
      return [day0(d),addD(day0(d),21)]; }
    function label(){ const [a,b]=range();
      if(S.view==='day') return fD(a,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      if(S.view==='month') return S.date.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
      return fD(a,{day:'numeric',month:'short'})+' – '+fD(addD(b,-1),{day:'numeric',month:'short',year:'numeric'}); }
    const mine=(from,to)=>expand(from,to).filter(e=>inEv(e,ME)||(e.organiser===ME));
    const statusOf=e=>{ if(e.organiser===ME) return 'organiser'; const a=e.attendees.find(x=>x.id===ME); return a?a.status:''; };

    function draw(){
      const pend=pendingFor(ME);
      root.innerHTML=`
      <div class="cal-tabs">${[['cal','Calendar'],['invites','Invitations'+(pend?` <b>${pend}</b>`:'')],['avail','Working hours & availability'],['booking','Booking link'],['connect','Connected calendars']].map(([k,l])=>`<button class="cal-tab${S.tab===k?' on':''}" data-ctab="${k}">${l}</button>`).join('')}</div>
      <div data-cbody></div>`;
      root.querySelectorAll('[data-ctab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.ctab; history.replaceState(null,'','#tab='+S.tab); draw(); });
      const body=root.querySelector('[data-cbody]');
      if(S.tab==='invites') return drawInvites(body);
      if(S.tab==='booking') return drawBooking(body);
      if(S.tab==='connect') return drawConnect(body);
      if(S.tab==='avail') return drawAvail(body);
      drawCal(body);
    }

    /* ----- calendar view ----- */
    function drawCal(body){
      const [a,b]=range(), ev=mine(a,b), next=mine(new Date(),addD(new Date(),14)).filter(e=>statusOf(e)!=='declined'&&new Date(e.start)>new Date()).sort((x,y)=>new Date(x.start)-new Date(y.start))[0];
      body.innerHTML=`<div class="cal-wrap">
        <aside class="cal-rail">
          <button class="cal-new" data-cnew>+ New meeting</button>
          ${mini()}
          ${next?`<div class="cal-card"><h5>Next up</h5><button class="cal-next" data-cev="${esc(next.id)}|${esc(next._occ||'')}"><b>${esc(next.title)}</b><span>${fD(next.start)} · ${fT(next.start)}</span>${modeOf(next)==='video'&&next.video?`<a href="${esc(next.video.url)}" target="_blank" rel="noopener" class="cal-join" onclick="event.stopPropagation()">Join ${esc(VIDEO[next.video.provider])}</a>`:modeOf(next)==='phone'?`<span class="cal-join">Phone${next.phone?' · '+esc(next.phone):''}</span>`:`<span class="cal-join">${esc(next.location||'Face to face')}</span>`}</button></div>`:''}
          <div class="cal-card"><h5>Compare calendars <em>free/busy only</em></h5>
            <input class="cal-find" data-cpfind placeholder="Find a person…">
            <div class="cal-people">${contacts.map(p=>`<label class="cal-person" data-cpname="${esc((p.name+' '+(p.orgName||'')).toLowerCase())}"><input type="checkbox" data-cover="${esc(p.id)}"${S.overlay.includes(p.id)?' checked':''}><span class="cal-sw" style="background:${p.accent}"></span><span class="cal-pn"><b>${esc(p.name)}</b><i>${esc(p.orgName||'')}</i></span><button type="button" class="cal-book" data-cbook="${esc(p.id)}" title="Book a meeting with ${esc(p.name)}">Book</button></label>`).join('')}</div></div>
        </aside>
        <section class="cal-main">
          <div class="cal-bar"><button class="cal-btn" data-cnav="today">Today</button><button class="cal-btn ic" data-cnav="-1" aria-label="Previous">‹</button><button class="cal-btn ic" data-cnav="1" aria-label="Next">›</button>
            <h2 class="cal-lbl">${label()}</h2>
            <div class="cal-views">${['day','week','month','agenda'].map(v=>`<button class="${S.view===v?'on':''}" data-cview="${v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div></div>
          ${S.overlay.length?`<div class="cal-ovl">${S.overlay.map(id=>{ const p=P(id); return `<span class="cal-chip"><i style="background:${p.accent}"></i>${esc(p.name)}<button data-cunov="${esc(id)}" aria-label="Remove">×</button></span>`; }).join('')}<span class="cal-hint">Hatched blocks are when they’re busy. You can’t see what they’re doing.</span></div>`:''}
          <div data-cgrid></div>
        </section></div>`;
      const g=body.querySelector('[data-cgrid]');
      if(S.view==='month') g.innerHTML=month(a,ev); else if(S.view==='agenda') g.innerHTML=agenda(a,b,ev); else g.innerHTML=grid(a,S.view==='day'?1:7,ev);
      wireCal(body);
      const sc=body.querySelector('.cal-scroll'); if(sc){ const h=Math.max(H0,Math.min(new Date().getHours()-1,H1-6)); sc.scrollTop=(h-H0)*PX; }
    }
    function mini(){ const d=S.date, f=new Date(d.getFullYear(),d.getMonth(),1), st=monday(f);
      return `<div class="cal-card cal-mini"><div class="cal-mh"><b>${d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</b><span><button data-cmm="-1">‹</button><button data-cmm="1">›</button></span></div>
        <div class="cal-mg">${['M','T','W','T','F','S','S'].map(x=>`<i>${x}</i>`).join('')}${Array.from({length:42},(_,i)=>{ const x=addD(st,i); return `<button data-cgo="${iso(x)}" class="${x.getMonth()!==d.getMonth()?'o ':''}${same(x,new Date())?'t ':''}${same(x,S.date)?'s':''}">${x.getDate()}</button>`; }).join('')}</div></div>`; }
    function evBlock(e,col){ const s=new Date(e.start), en=new Date(e.end), top=((s.getHours()+s.getMinutes()/60)-H0)*PX, h=Math.max(18,(en-s)/36e5*PX), st=statusOf(e);
      const short=h<40;
      return `<button class="cal-ev st-${st}${short?' short':''}" style="top:${top}px;height:${h}px" data-cev="${esc(e.id)}|${esc(e._occ||'')}" title="${esc(e.title)} · ${fT(s)}–${fT(en)}">${short?`<b>${fT(s)} ${esc(e.title)}</b>`:`<b>${esc(e.title)}</b><span>${fT(s)}–${fT(en)} · ${esc(how(e))}</span>`}</button>`; }
    function grid(start,n,ev){ const days=Array.from({length:n},(_,i)=>addD(start,i)), hrs=Array.from({length:H1-H0},(_,i)=>H0+i), now=new Date();
      const lanes=S.overlay.length;
      return `<div class="cal-grid"><div class="cal-gh" style="grid-template-columns:56px repeat(${n},minmax(0,1fr))"><span></span>${days.map(d=>{ const off=dayOff(ME,d); return `<span class="${same(d,now)?'t':''}${d.getDay()%6===0?' we':''}"><i>${fD(d,{weekday:'short'})}</i><b>${d.getDate()}</b>${off&&off.kind!=='off'?`<em class="cal-dayoff k-${off.kind}" title="${esc(off.label)}">${esc(off.kind==='hol'?'Bank holiday':off.label)}</em>`:''}</span>`; }).join('')}</div>
        <div class="cal-scroll"><div class="cal-gb" style="grid-template-columns:56px repeat(${n},minmax(0,1fr));height:${(H1-H0)*PX}px">
          <div class="cal-hrs">${hrs.map(h=>`<span style="top:${(h-H0)*PX}px">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>
          ${days.map(d=>{ const de=ev.filter(e=>same(e.start,d));
            const ov=S.overlay.map((pid,li)=>busyOf(pid,day0(d),addD(day0(d),1),ME).filter(bk=>!(bk.ev&&inEv(bk.ev,ME))).map(bk=>{ const s=bk.start, top=((s.getHours()+s.getMinutes()/60)-H0)*PX, hh=(bk.end-s)/36e5*PX;
              return `<i class="cal-busy" style="top:${top}px;height:${hh}px;left:${li*(100/Math.max(lanes,1))}%;width:${100/Math.max(lanes,1)}%;--c:${P(pid).accent}" title="${esc(P(pid).name)} · busy ${fT(s)}–${fT(bk.end)}"></i>`; }).join('')).join('');
            const ext=busyOf(ME,day0(d),addD(day0(d),1),ME).filter(bk=>bk.ext).map(bk=>{ const s=bk.start; return `<i class="cal-ext" style="top:${((s.getHours()+s.getMinutes()/60)-H0)*PX}px;height:${(bk.end-s)/36e5*PX}px" title="Busy · from ${esc(bk.ext)}">Busy · ${esc(bk.ext)}</i>`; }).join('');
            const clip=b=>{ const s=b.start<at(d,H0)?at(d,H0):b.start, en=b.end>at(d,H1)?at(d,H1):b.end; return en>s?[s,en]:null; };
            const offs=offBlocks(ME,d).map(b=>{ const c=clip(b); if(!c) return ''; return `<i class="cal-off k-${b.kind}" style="top:${((c[0].getHours()+c[0].getMinutes()/60)-H0)*PX}px;height:${(c[1]-c[0])/36e5*PX}px">${b.kind==='hours'?'':esc(b.label)}</i>`; }).join('');
            const ovOff=S.overlay.map((pid,li)=>offBlocks(pid,d).map(b=>{ const c=clip(b); if(!c) return ''; return `<i class="cal-uoff" style="top:${((c[0].getHours()+c[0].getMinutes()/60)-H0)*PX}px;height:${(c[1]-c[0])/36e5*PX}px;left:${li*(100/Math.max(lanes,1))}%;width:${100/Math.max(lanes,1)}%;--c:${P(pid).accent}" title="${esc(P(pid).name)} · unavailable"></i>`; }).join('')).join('');
            const nowL=same(d,now)&&now.getHours()>=H0&&now.getHours()<H1?`<i class="cal-now" style="top:${((now.getHours()+now.getMinutes()/60)-H0)*PX}px"></i>`:'';
            return `<div class="cal-col${d.getDay()%6===0?' we':''}" data-cday="${iso(d)}">${offs}<div class="cal-ovlane">${ovOff}${ov}</div>${ext}${de.map(e=>evBlock(e)).join('')}${nowL}</div>`; }).join('')}
        </div></div></div>`; }
    function month(start,ev){ const d=S.date;
      return `<div class="cal-month"><div class="cal-mhd">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<span>${x}</span>`).join('')}</div><div class="cal-mbody">${Array.from({length:42},(_,i)=>{ const x=addD(start,i), de=ev.filter(e=>same(e.start,x)).sort((p,q)=>new Date(p.start)-new Date(q.start));
        return `<div class="cal-mc${x.getMonth()!==d.getMonth()?' o':''}${same(x,new Date())?' t':''}" data-cmday="${iso(x)}"><b>${x.getDate()}</b>${(()=>{ const off=dayOff(ME,x); return off&&off.kind!=='off'?`<em class="cal-dayoff k-${off.kind}">${esc(off.label)}</em>`:''; })()}${de.slice(0,3).map(e=>`<button class="cal-mev st-${statusOf(e)}" data-cev="${esc(e.id)}|${esc(e._occ||'')}">${fT(e.start)} ${esc(e.title)}</button>`).join('')}${de.length>3?`<span class="cal-more">+${de.length-3} more</span>`:''}</div>`; }).join('')}</div></div>`; }
    function agenda(a,b,ev){ const days=[]; for(let d=a;d<b;d=addD(d,1)){ const de=ev.filter(e=>same(e.start,d)).sort((p,q)=>new Date(p.start)-new Date(q.start)); if(de.length) days.push([d,de]); }
      return days.length?`<div class="cal-agenda">${days.map(([d,de])=>`<div class="cal-ad"><h4>${fD(d,{weekday:'long',day:'numeric',month:'long'})}${same(d,new Date())?' · Today':''}</h4>${de.map(e=>`<button class="cal-ar st-${statusOf(e)}" data-cev="${esc(e.id)}|${esc(e._occ||'')}"><span class="cal-at">${fT(e.start)}<i>${fT(e.end)}</i></span><span class="cal-ai"><b>${esc(e.title)}</b><em>${[e.organiser===ME?'You organised':'From '+esc(P(e.organiser).name),e.attendees.length+1+' people',e.project?esc(e.project):''].filter(Boolean).join(' · ')}</em></span>${statusOf(e)==='pending'?'<span class="cal-pill pend">Needs reply</span>':''}${(e.after||{})[e._occ||'_']?'<span class="cal-pill m-notes">Notes</span>':''}<span class="cal-pill m-${modeOf(e)}">${esc(how(e))}</span></button>`).join('')}</div>`).join('')}</div>`
        :'<div class="cal-empty">No meetings in the next three weeks.</div>'; }
    function wireCal(body){
      body.querySelectorAll('[data-cnav]').forEach(b=>b.onclick=()=>{ const v=b.dataset.cnav; if(v==='today') S.date=new Date(); else { const k=+v; S.date=S.view==='day'?addD(S.date,k):S.view==='month'?new Date(S.date.getFullYear(),S.date.getMonth()+k,1):addD(S.date,7*k); } draw(); });
      body.querySelectorAll('[data-cview]').forEach(b=>b.onclick=()=>{ S.view=b.dataset.cview; persistPrefs(); draw(); });
      body.querySelectorAll('[data-cmm]').forEach(b=>b.onclick=()=>{ S.date=new Date(S.date.getFullYear(),S.date.getMonth()+(+b.dataset.cmm),1); draw(); });
      body.querySelectorAll('[data-cgo]').forEach(b=>b.onclick=()=>{ S.date=new Date(b.dataset.cgo); if(S.view==='month') S.view='day'; draw(); });
      body.querySelectorAll('[data-cover]').forEach(c=>c.onchange=()=>{ const id=c.dataset.cover; S.overlay=c.checked?[...new Set([...S.overlay,id])].slice(0,6):S.overlay.filter(x=>x!==id); if(c.checked&&S.overlay.length===6&&!S.overlay.includes(id)) toast('Compare up to 6 people at once'); persistPrefs(); draw(); });
      body.querySelectorAll('[data-cunov]').forEach(b=>b.onclick=()=>{ S.overlay=S.overlay.filter(x=>x!==b.dataset.cunov); persistPrefs(); draw(); });
      body.querySelectorAll('[data-cbook]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); editor({with:[b.dataset.cbook]}); });
      const f=body.querySelector('[data-cpfind]'); if(f) f.oninput=()=>{ const q=f.value.toLowerCase(); body.querySelectorAll('[data-cpname]').forEach(r=>r.style.display=r.dataset.cpname.includes(q)?'':'none'); };
      body.querySelectorAll('[data-cnew]').forEach(b=>b.onclick=()=>editor({with:S.overlay.slice()}));
      body.querySelectorAll('[data-cev]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const [id,occ]=b.dataset.cev.split('|'); detail(id,occ); });
      body.querySelectorAll('[data-cday]').forEach(col=>col.ondblclick=e=>{ if(e.target.closest('[data-cev]')) return; const r=col.getBoundingClientRect(), y=e.clientY-r.top, mins=Math.floor((y/PX*60)/30)*30;
        editor({with:S.overlay.slice(),start:new Date(new Date(col.dataset.cday).getTime()+(H0*60+mins)*6e4)}); });
      body.querySelectorAll('[data-cmday]').forEach(c=>c.ondblclick=e=>{ if(e.target.closest('[data-cev]')) return; editor({with:S.overlay.slice(),start:at(new Date(c.dataset.cmday),10)}); });
    }

    /* ----- modals ----- */
    function modal(title,html,foot,wide){ const PP=window.MSPEOPLE; if(PP&&PP.modal){ const m=PP.modal(title,html,foot); if(wide) m.root.querySelector('.pp-modal').style.width='min(720px,100%)'; return m; } }
    function editor(o){ o=o||{}; const e=o.edit||null;
      let mode=e?modeOf(e):'video', vprov=e&&e.video?e.video.provider:'meet', phone=e&&e.phone||me.phone||'', loc=e&&e.location||'';
      let att=e?e.attendees.map(a=>a.id):(o.with||[]).filter(id=>id!==ME), dur=e?Math.round((new Date(e.end)-new Date(e.start))/6e4):30, start=e?new Date(e.start):(o.start||null);
      const m=modal(e?'Edit meeting':'New meeting',`<div class="pp-grid" style="grid-template-columns:1fr 1fr">
        <label class="pp-f wide"><span>Title</span><input data-cf="title" value="${esc(e?e.title:'')}" placeholder="e.g. Proof review"></label>
        <div class="pp-f wide"><span>People</span><div class="cal-att" data-catt></div><input data-cfind list="calPpl" placeholder="Add someone you can chat with…" autocomplete="off"><datalist id="calPpl">${contacts.map(p=>`<option value="${esc(p.name)}">${esc(p.orgName||'')}</option>`).join('')}</datalist></div>
        <label class="pp-f"><span>Duration</span><select data-cf="dur">${[15,30,45,60,90,120].map(x=>`<option value="${x}"${x===dur?' selected':''}>${x<60?x+' min':x/60+' hour'+(x>60?'s':'')}</option>`).join('')}</select></label>
        <div class="pp-f"><span>Meeting type</span><div class="cal-mode" data-cmode>${MODES.map(([k,l])=>`<button type="button" data-mo="${k}" class="${mode===k?'on':''}">${l}</button>`).join('')}</div></div>
        <div class="pp-f wide" data-cmx></div>
        <div class="pp-f wide"><span>When</span><div class="cal-slots" data-cslots></div>
          <div class="cal-when"><input type="date" data-cf="date"><input type="time" data-cf="time" step="900"><span class="cal-conf" data-cconf></span></div></div>
        <label class="pp-f"><span>Project <em class="cal-opt">optional</em></span><select data-cf="project"><option value="">None</option>${PROJECTS.map(p=>`<option${e&&e.project===p?' selected':''}>${esc(p)}</option>`).join('')}</select></label>
        <label class="pp-f"><span>Product <em class="cal-opt">optional</em></span><input data-cf="product" value="${esc(e?e.product:'')}" placeholder="e.g. Heavy Weight T-Shirt"></label>
        <label class="pp-f"><span>Reminder</span><select data-cf="rem">${[[0,'None'],[10,'10 minutes before'],[15,'15 minutes before'],[60,'1 hour before'],[1440,'1 day before']].map(([v,l])=>`<option value="${v}"${(e?e.reminder:15)===v?' selected':''}>${l}</option>`).join('')}</select></label>
        <label class="pp-f wide"><span>Notes / agenda</span><textarea data-cf="notes" rows="2">${esc(e?e.notes:'')}</textarea></label></div>
        <p class="pp-note" data-cerr style="color:#b4232c;display:none"></p>`,
        `<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-csave>${e?'Save & update invites':'Send invites'}</button>`,true);
      if(!m) return; const R=m.root, q=k=>R.querySelector('[data-cf="'+k+'"]');
      const setWhen=d=>{ start=d; q('date').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); q('time').value=fT(d); conf(); };
      const conf=()=>{ const c=R.querySelector('[data-cconf]'); if(!start){ c.textContent=''; return; } const end=new Date(start.getTime()+dur*6e4);
        const nm=p=>P(p).name.split(' ')[0];
        const busy=[ME,...att].filter(p=>busyOf(p,day0(start),addD(day0(start),1),ME).some(b=>b.start<end&&b.end>start&&!(e&&b.ev&&b.ev.id===e.id)));
        const out=[ME,...att].map(p=>[p,unavailable(p,start,end)]).filter(x=>x[1]);
        const msg=[...out.map(([p,b])=>p===ME?(b.kind==='hours'?'Outside your working hours':b.kind==='lunch'?'During your lunch break':b.kind==='hol'?'Bank holiday for you ('+b.label+')':'You’re '+(b.kind==='away'?'away':'blocked')+' ('+b.label+')'):nm(p)+' is unavailable'),
          ...busy.filter(p=>!out.some(x=>x[0]===p)).map(p=>p===ME?'You’re busy':nm(p)+' is busy')];
        c.innerHTML=msg.length?`<b class="bad">${esc(msg.join(' · '))}</b>`:'<b class="ok">Everyone’s free</b>'; };
      const drawAtt=()=>{ R.querySelector('[data-catt]').innerHTML=[`<span class="cal-a me">${av(me,22)}<b>You</b></span>`,...att.map(id=>{ const p=P(id); return `<span class="cal-a">${av(p,22)}<b>${esc(p.name)}</b><i>${esc(p.orgName||'')}</i><button type="button" data-crm="${esc(id)}" aria-label="Remove">×</button></span>`; })].join('');
        R.querySelectorAll('[data-crm]').forEach(b=>b.onclick=()=>{ att=att.filter(x=>x!==b.dataset.crm); drawAtt(); slots(); });
        slots(); };
      const slots=()=>{ const s=suggest([ME,...att],dur,ME), el=R.querySelector('[data-cslots]');
        el.innerHTML=s.length?`<em>Suggested times when ${att.length?'everyone is':'you’re'} free</em>${s.map(d=>`<button type="button" data-cslot="${iso(d)}" class="${start&&start.getTime()===d.getTime()?'on':''}">${fD(d)} · ${fT(d)}</button>`).join('')}`:'<em>No shared free time in the next three weeks. Pick a time below.</em>';
        el.querySelectorAll('[data-cslot]').forEach(b=>b.onclick=()=>{ setWhen(new Date(b.dataset.cslot)); slots(); }); conf(); };
      const addrs=(()=>{ try{ return (window.MSOrders&&MSOrders.addressBook?MSOrders.addressBook():[]).map(a=>[a.name,...a.lines].join(' ').replace(/,\s*/g,', ').replace(/\s+/g,' ').trim()); }catch(x){ return []; } })();
      const drawMode=()=>{ R.querySelectorAll('[data-mo]').forEach(b=>b.classList.toggle('on',b.dataset.mo===mode)); const x=R.querySelector('[data-cmx]');
        x.innerHTML=mode==='video'?`<span>Video provider</span><div class="cal-mode sub">${Object.entries(VIDEO).map(([k,l])=>`<button type="button" data-vp="${k}" class="${vprov===k?'on':''}">${l}</button>`).join('')}</div><em class="cal-opt">A joining link is created and added to the invite.</em>`
          :mode==='phone'?`<span>Phone number to call</span><input data-cphone type="tel" value="${esc(phone)}" placeholder="e.g. 0117 330 6120"><em class="cal-opt">Shown to everyone invited. Leave blank if you’ll call them.</em>`
          :`<span>Location</span><input data-cloc list="calLocs" value="${esc(loc)}" placeholder="Address, office or venue"><datalist id="calLocs">${addrs.map(a=>`<option value="${esc(a)}">`).join('')}</datalist><em class="cal-opt">A map link is added to the invite.</em>`;
        x.querySelectorAll('[data-vp]').forEach(b=>b.onclick=()=>{ vprov=b.dataset.vp; drawMode(); });
        const ph=x.querySelector('[data-cphone]'); if(ph) ph.oninput=()=>{ phone=ph.value; };
        const lc=x.querySelector('[data-cloc]'); if(lc) lc.oninput=()=>{ loc=lc.value; }; };
      R.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{ mode=b.dataset.mo; drawMode(); }); drawMode();
      const fi=R.querySelector('[data-cfind]'); fi.onchange=()=>{ const p=contacts.find(x=>x.name.toLowerCase()===fi.value.trim().toLowerCase()); if(p&&!att.includes(p.id)){ att.push(p.id); drawAtt(); } fi.value=''; };
      q('dur').onchange=()=>{ dur=+q('dur').value; slots(); };
      const readWhen=()=>{ const dv=q('date').value, tv=q('time').value; if(dv&&tv){ const [y,mo,dd]=dv.split('-').map(Number), [h,mi]=tv.split(':').map(Number); start=new Date(y,mo-1,dd,h,mi); conf(); } };
      q('date').onchange=readWhen; q('time').onchange=readWhen;
      if(start) setWhen(start); drawAtt();
      const err=R.querySelector('[data-cerr]');
      R.querySelector('[data-csave]').onclick=()=>{ const title=q('title').value.trim();
        if(!title){ err.textContent='Give the meeting a title.'; err.style.display=''; return q('title').focus(); }
        if(!start){ err.textContent='Pick a suggested time or set a date and time.'; err.style.display=''; return; }
        if(mode==='person'&&!loc.trim()){ err.textContent='Add a location for a face-to-face meeting.'; err.style.display=''; const l=R.querySelector('[data-cloc]'); return l&&l.focus(); }
        const end=new Date(start.getTime()+dur*6e4), vp=mode==='video'?vprov:'none';
        const how2={mode,phone:mode==='phone'?phone.trim():'',location:mode==='person'?loc.trim():''};
        upd(o2=>{ if(e){ const x=o2.events.find(y=>y.id===e.id); const moved=x.start!==iso(start)||x.end!==iso(end);
            Object.assign(x,{title,start:iso(start),end:iso(end),project:q('project').value,product:q('product').value.trim(),notes:q('notes').value.trim(),reminder:+q('rem').value,
              video:vp==='none'?null:(x.video&&x.video.provider===vp?x.video:{provider:vp,url:vLink(vp)})},how2);
            const keep=new Map(x.attendees.map(a=>[a.id,a])); x.attendees=att.map(id=>moved?{id,status:'pending'}:(keep.get(id)||{id,status:'pending'})); }
          else o2.events.push({id:'e'+Date.now().toString(36),title,organiser:ME,attendees:att.map(id=>({id,status:'pending'})),start:iso(start),end:iso(end),
            video:vp==='none'?null:{provider:vp,url:vLink(vp)},mode:how2.mode,phone:how2.phone,location:how2.location,project:q('project').value,product:q('product').value.trim(),notes:q('notes').value.trim(),reminder:+q('rem').value}); });
        m.close(); toast(att.length?(e?'Meeting updated — invites re-sent':'Invites sent to '+att.length+' '+(att.length===1?'person':'people')):'Added to your calendar');
        S.date=start; S.tab='cal'; draw(); };
    }
    function detail(id,occ){ const e0=events().find(x=>x.id===id); if(!e0) return;
      const e=occ?Object.assign({},e0,{start:occ,end:iso(new Date(new Date(occ).getTime()+(new Date(e0.end)-new Date(e0.start))))}):e0;
      const st=statusOf(e), org=P(e.organiser), my=e.attendees.find(a=>a.id===ME);
      const SL={accepted:'Accepted',declined:'Declined',pending:'Awaiting reply',proposed:'Proposed a new time'};
      const m=modal(e.title,`<div class="cal-dt">
        <div class="cal-dr"><span>When</span><b>${fD(e.start,{weekday:'long',day:'numeric',month:'long'})} · ${fT(e.start)}–${fT(e.end)}${e.repeat?' · every weekday':''}</b></div>
        <div class="cal-dr"><span>Type</span><b>${esc(MODES.find(x=>x[0]===modeOf(e))[1])}</b></div>
        ${modeOf(e)==='phone'?`<div class="cal-dr"><span>Phone</span><b>${e.phone?(['admin','distributor'].includes(window.MSID&&MSID.current?MSID.current():'distributor')?`<a href="Merchsmith Calls.html${location.search}#dialnum=${encodeURIComponent(e.phone)}">${esc(e.phone)} · Call now</a>`:`<a href="${telHref(e.phone)}">${esc(e.phone)}</a>`):esc(P(e.organiser).name.split(' ')[0])+' will call you'}</b></div>`:''}
        ${modeOf(e)==='person'?`<div class="cal-dr"><span>Where</span><b>${esc(e.location||'To be confirmed')}${e.location?` <a href="${mapHref(e.location)}" target="_blank" rel="noopener">Map ↗</a>`:''}</b></div>`:''}
        ${modeOf(e)==='video'&&e.video?`<div class="cal-dr"><span>Video</span><b><a class="cal-join" href="${esc(e.video.url)}" target="_blank" rel="noopener">Join ${esc(VIDEO[e.video.provider])}</a> <code>${esc(e.video.url.replace(/^https:\/\//,''))}</code></b></div>`:''}
        ${e.project||e.product?`<div class="cal-dr"><span>Linked to</span><b>${e.project?`<a href="Merchsmith Project - Autumn Giveaways.html">${esc(e.project)}</a>`:''}${e.project&&e.product?' · ':''}${e.product?esc(e.product):''}</b></div>`:''}
        ${e.notes?`<div class="cal-dr"><span>Agenda</span><b style="font-weight:500">${esc(e.notes)}</b></div>`:''}
        <div class="cal-dr"><span>People</span><div class="cal-plist"><div>${av(org,26)}<b>${esc(org.name)}${org.id===ME?' (you)':''}</b><i>${esc(org.orgName||'')}</i><em class="cal-pill">Organiser</em></div>
          ${e.attendees.map(a=>{ const p=P(a.id); return `<div>${av(p,26)}<b>${esc(p.name)}${a.id===ME?' (you)':''}</b><i>${esc(p.orgName||'')}</i><em class="cal-pill s-${a.status}">${SL[a.status]}${a.status==='proposed'&&a.proposal?': '+fD(a.proposal)+' '+fT(a.proposal):''}</em>${e.organiser===ME&&a.status==='proposed'?`<button class="pp-btn ghost sm" data-cacc="${esc(a.id)}">Use this time</button>`:''}</div>`; }).join('')}</div></div>
        ${e.reminder&&new Date(e.end)>new Date()?`<div class="cal-dr"><span>Reminder</span><b>${e.reminder>=1440?'1 day':e.reminder>=60?'1 hour':e.reminder+' minutes'} before</b></div>`:''}</div>${afterHTML(e0,occ,e)}`,
        (e.organiser===ME?`<button class="pp-btn ghost danger" data-ccancel>Cancel meeting</button><button class="pp-btn ghost" data-cical>Download .ics</button><button class="pp-btn" data-cedit>Edit</button>`
          :my?`<button class="pp-btn ghost" data-cical>Download .ics</button><button class="pp-btn ghost" data-cprop>Propose new time</button><button class="pp-btn ghost${my.status==='declined'?' on':''}" data-crsvp="declined">Decline</button><button class="pp-btn${my.status==='accepted'?' on':''}" data-crsvp="accepted">${my.status==='accepted'?'Accepted ✓':'Accept'}</button>`:''));
      if(!m) return; const R=m.root;
      const rs=st=>{ upd(o=>{ const x=o.events.find(y=>y.id===id); const a=x.attendees.find(y=>y.id===ME); a.status=st; delete a.proposal; }); m.close(); toast(st==='accepted'?'Accepted — '+org.name.split(' ')[0]+' has been told':'Declined'); draw(); };
      R.querySelectorAll('[data-crsvp]').forEach(b=>b.onclick=()=>rs(b.dataset.crsvp));
      const ed=R.querySelector('[data-cedit]'); if(ed) ed.onclick=()=>{ m.close(); editor({edit:e0}); };
      const cc=R.querySelector('[data-ccancel]'); if(cc) cc.onclick=()=>{ if(!confirm('Cancel "'+e.title+'"? Everyone invited will be told.')) return; upd(o=>{ o.events.find(y=>y.id===id).cancelled=true; }); m.close(); toast('Meeting cancelled'); draw(); };
      const ic=R.querySelector('[data-cical]'); if(ic) ic.onclick=()=>ics(e);
      R.querySelectorAll('[data-cacc]').forEach(b=>b.onclick=()=>{ upd(o=>{ const x=o.events.find(y=>y.id===id), a=x.attendees.find(y=>y.id===b.dataset.cacc), dur=new Date(x.end)-new Date(x.start);
        x.start=a.proposal; x.end=iso(new Date(new Date(a.proposal).getTime()+dur)); x.attendees.forEach(y=>{ if(y.id===a.id) y.status='accepted'; else y.status='pending'; delete y.proposal; }); }); m.close(); toast('Moved — everyone else asked to confirm'); draw(); });
      const pr=R.querySelector('[data-cprop]'); if(pr) pr.onclick=()=>{ m.close(); propose(e0); };
      wireAfter(R,m,e0,occ,e);
    }
    /* ----- after the meeting: Gemini notes / uploaded transcript ----- */
    const NK=occ=>occ||'_';
    const notesOf=(e,occ)=>((e.after||{})[NK(occ)])||null;
    const saveNotes=(id,occ,n)=>upd(o=>{ const x=o.events.find(y=>y.id===id); x.after=x.after||{}; if(n) x.after[NK(occ)]=n; else delete x.after[NK(occ)]; });
    function afterHTML(e0,occ,e){ if(new Date(e.end)>new Date()) return ''; const n=notesOf(e0,occ), g=(db().conns[ME]||{}).google, meet=e.video&&e.video.provider==='meet';
      if(!n) return `<div class="cal-after"><h4>After the meeting</h4><p class="cal-hint" style="margin:0 0 10px">No notes or transcript yet.${meet&&!g?' Connect Google Calendar to bring in Gemini notes automatically.':''}</p>
        <div class="cal-arow">${meet?(g?'<button class="pp-btn sm" data-aimp>Import Gemini notes from Google Meet</button>':'<button class="pp-btn ghost sm" data-aconn>Connect Google</button>'):''}<button class="pp-btn ghost sm" data-aup>Upload notes or transcript</button></div></div>`;
      const SRC={gemini:'Gemini · Google Meet',gdoc:'Google Doc',file:'Uploaded file',paste:'Added by hand'}, tr=n.transcript||[], ac=n.actions||[];
      return `<div class="cal-after"><h4>After the meeting <em class="cal-src s-${n.source}">${SRC[n.source]||''}</em></h4>
        ${n.summary?`<h5>Summary</h5><p class="cal-asum">${esc(n.summary)}</p>`:''}
        ${ac.length?`<h5>Action items <em>${ac.filter(a=>a.done).length} of ${ac.length} done</em></h5><ul class="cal-acts">${ac.map((a,i)=>`<li><label><input type="checkbox" data-aact="${i}"${a.done?' checked':''}><span class="${a.done?'done':''}">${esc(a.t)}</span></label>${a.who?`<em>${esc(a.who)}</em>`:''}</li>`).join('')}</ul>`:''}
        ${tr.length?`<details class="cal-atr"><summary>Transcript · ${tr.length} lines</summary><input class="cal-find" data-atq placeholder="Search the transcript"><div class="cal-atl">${tr.map(l=>`<p data-atx="${esc((l.who+' '+l.text).toLowerCase())}">${l.t!=null?`<span>${mmss(l.t)}</span>`:''}<b>${esc(l.who)}</b><i>${esc(l.text)}</i></p>`).join('')}</div></details>`:''}
        ${n.fileName?`<p class="cal-hint" style="margin:8px 0 0">Attached: <b>${esc(n.fileName)}</b>${tr.length?'':' · text preview isn’t available for this file type in the prototype'}</p>`:''}
        <div class="cal-arow" style="margin-top:12px">${n.docUrl?`<a class="pp-link" href="${esc(n.docUrl)}" target="_blank" rel="noopener">Open in Google Docs ↗</a>`:''}<button class="pp-link" data-aup>Replace</button><button class="pp-link danger" data-arm>Remove</button></div>
        <p class="cal-hint" style="margin:8px 0 0">Only the people in this meeting and their organisation’s admins can see these notes.</p></div>`; }
    function genGemini(e){ const ppl=[e.organiser,...e.attendees.map(a=>a.id)].map(id=>P(id).name.split(' ')[0]), [A,B]=[ppl[0],ppl[1]||ppl[0]], topic=e.project||e.title;
      return {source:'gemini',addedAt:iso(new Date()),docUrl:'https://docs.google.com/document/d/1Gm-'+e.id+'-notes',
        summary:`${topic}: agreed quantities and colours, and a sign-off date. ${B} will confirm final numbers; ${A} will send a costed quote and proofs.`,
        actions:[{t:'Confirm final quantities',who:B,done:false},{t:'Send costed quote and proofs',who:A,done:false},{t:'Book the sign-off call',who:A,done:false}],
        transcript:[{who:A,t:8,text:'Thanks for making time. I wanted to run through '+topic+'.'},{who:B,t:24,text:'Sure. We’re looking at roughly the same numbers as last year.'},{who:A,t:95,text:'Colours stay the same, or are you updating the palette?'},{who:B,t:112,text:'Navy and cream, same as the brand guide.'},{who:A,t:260,text:'I’ll send a costed quote and proofs this week.'},{who:B,t:281,text:'Great. I’ll confirm final numbers once I hear from HR.'}]}; }
    function parseTranscript(txt){ const out=[]; let cur=null;
      String(txt||'').replace(/\r/g,'').split('\n').forEach(raw=>{ const l=raw.trim(); if(!l||/^WEBVTT|^\d+$|-->/.test(l)) { if(/-->/.test(l)){ const t=l.match(/(\d+):(\d+):(\d+)|(\d+):(\d+)/); cur=t?(t[1]?(+t[1])*3600+(+t[2])*60+(+t[3]):(+t[4])*60+(+t[5])):null; } return; }
        let m2=l.match(/^<v ([^>]+)>(.+?)(<\/v>)?$/)||l.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([^:]{2,40}):\s*(.+)$/)||l.match(/^([A-Z][^:]{1,40}):\s+(.+)$/);
        if(m2&&m2.length===4&&/\d:\d/.test(m2[1])){ const p=m2[1].split(':').map(Number); out.push({who:m2[2].trim(),t:p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1],text:m2[3].trim()}); }
        else if(m2) out.push({who:m2[1].trim(),t:cur,text:m2[2].replace(/<\/v>$/,'').trim()});
        else if(out.length) out[out.length-1].text+=' '+l; else out.push({who:'Notes',t:null,text:l}); });
      return out; }
    const parseActions=t=>String(t||'').split('\n').map(s=>s.replace(/^[-*•\s]+/,'').trim()).filter(Boolean).map(s=>{ const m2=s.match(/^([A-Z][a-z]+):\s*(.+)$/); return m2?{t:m2[2],who:m2[1],done:false}:{t:s,who:'',done:false}; });
    function wireAfter(R,m,e0,occ,e){ const reopen=()=>{ m.close(); detail(e0.id,occ); };
      const imp=R.querySelector('[data-aimp]'); if(imp) imp.onclick=()=>{ imp.disabled=true; imp.textContent='Fetching from Google Meet…'; setTimeout(()=>{ saveNotes(e0.id,occ,genGemini(e)); toast('Gemini notes imported from Google Meet'); reopen(); },900); };
      const cn=R.querySelector('[data-aconn]'); if(cn) cn.onclick=()=>{ m.close(); S.tab='connect'; history.replaceState(null,'','#tab=connect'); draw(); };
      R.querySelectorAll('[data-aup]').forEach(b=>b.onclick=()=>{ m.close(); uploadNotes(e0,occ,e); });
      const rm=R.querySelector('[data-arm]'); if(rm) rm.onclick=()=>{ if(!confirm('Remove the notes and transcript from this meeting?')) return; saveNotes(e0.id,occ,null); toast('Notes removed'); reopen(); };
      R.querySelectorAll('[data-aact]').forEach(c=>c.onchange=()=>{ const n=notesOf(events().find(x=>x.id===e0.id),occ); n.actions[+c.dataset.aact].done=c.checked; saveNotes(e0.id,occ,n); c.nextElementSibling.classList.toggle('done',c.checked); });
      const q=R.querySelector('[data-atq]'); if(q) q.oninput=()=>{ const v=q.value.toLowerCase(); R.querySelectorAll('[data-atx]').forEach(p=>p.style.display=p.dataset.atx.includes(v)?'':'none'); }; }
    function uploadNotes(e0,occ,e){ let src='gdoc', file=null;
      const mm=modal('Add notes or transcript',`<p class="pp-note" style="margin:0 0 12px">${esc(e.title)} · ${fD(e.start,{weekday:'short',day:'numeric',month:'short'})}</p>
        <div class="cal-mode" data-usrc>${[['gdoc','Google Doc link'],['file','Upload a file'],['paste','Paste text']].map(([k2,l])=>`<button type="button" data-us="${k2}" class="${k2===src?'on':''}">${l}</button>`).join('')}</div>
        <div data-upane style="margin-top:12px"></div>
        <div class="pp-grid" style="grid-template-columns:1fr;margin-top:12px">
          <label class="pp-f"><span>Summary <em class="cal-opt">optional</em></span><textarea data-usum rows="3" placeholder="Key points and decisions"></textarea></label>
          <label class="pp-f"><span>Action items <em class="cal-opt">optional · one per line, e.g. “Sara: confirm numbers”</em></span><textarea data-uact rows="3"></textarea></label></div>
        <p class="pp-note" data-uerr style="color:#b4232c;display:none"></p>`,
        `<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-usave>Add to meeting</button>`,true);
      if(!mm) return; const R=mm.root, err=R.querySelector('[data-uerr]');
      const pane=()=>{ R.querySelectorAll('[data-us]').forEach(b=>b.classList.toggle('on',b.dataset.us===src)); const p=R.querySelector('[data-upane]');
        p.innerHTML=src==='gdoc'?'<label class="pp-f"><span>Google Doc link</span><input data-ulink placeholder="https://docs.google.com/document/d/…"></label><p class="pp-note" style="margin:6px 0 0">Paste the link to the Gemini notes or transcript doc. Gemini saves these to the organiser’s Google Drive.</p>'
          :src==='file'?`<label class="pp-f"><span>File</span><input type="file" data-ufile accept=".txt,.vtt,.srt,.md,.docx,.pdf"></label><p class="pp-note" style="margin:6px 0 0">TXT, VTT or SRT transcripts are read line by line. DOCX and PDF are attached as files.${file?' Selected: <b>'+esc(file.name)+'</b>':''}</p>`
          :'<label class="pp-f"><span>Transcript or notes</span><textarea data-utext rows="7" placeholder="Jess: Thanks for joining…&#10;Sara: We’re at 1,500 packs…"></textarea></label>';
        const f=p.querySelector('[data-ufile]'); if(f) f.onchange=()=>{ file=f.files[0]||null; }; };
      R.querySelectorAll('[data-us]').forEach(b=>b.onclick=()=>{ src=b.dataset.us; pane(); }); pane();
      R.querySelector('[data-usave]').onclick=async()=>{ const sum=R.querySelector('[data-usum]').value.trim(), acts=parseActions(R.querySelector('[data-uact]').value); let n={source:src,addedAt:iso(new Date()),addedBy:ME,summary:sum,actions:acts,transcript:[]};
        const fail=t=>{ err.textContent=t; err.style.display=''; };
        if(src==='gdoc'){ const u=(R.querySelector('[data-ulink]')||{}).value||''; if(!/^https:\/\/docs\.google\.com\//.test(u.trim())) return fail('Paste a docs.google.com link.');
          const g=genGemini(e); n=Object.assign(g,{source:'gdoc',docUrl:u.trim(),addedBy:ME},sum?{summary:sum}:{},acts.length?{actions:acts}:{}); }
        else if(src==='file'){ if(!file) return fail('Choose a file.'); n.fileName=file.name; if(/\.(txt|vtt|srt|md)$/i.test(file.name)){ const txt=await file.text(); n.transcript=parseTranscript(txt); } }
        else { const t=(R.querySelector('[data-utext]')||{}).value||''; if(!t.trim()&&!sum) return fail('Paste the transcript or notes, or add a summary.'); n.transcript=parseTranscript(t); }
        if(!n.summary&&!n.transcript.length&&!n.actions.length&&!n.fileName) return fail('Nothing to add yet.');
        saveNotes(e0.id,occ,n); mm.close(); toast('Notes added to the meeting'); detail(e0.id,occ); };
    }
    function propose(e){ const dur=Math.round((new Date(e.end)-new Date(e.start))/6e4), s=suggest([ME,e.organiser,...e.attendees.filter(a=>a.id!==ME).map(a=>a.id)],dur,ME);
      const m=modal('Propose a new time',`<p class="pp-note" style="margin:0 0 10px">${esc(P(e.organiser).name)} will see your suggestion and can move the meeting. Times shown are when everyone invited is free.</p>
        <div class="cal-slots">${s.map(d=>`<button type="button" data-pslot="${iso(d)}">${fD(d)} · ${fT(d)}</button>`).join('')||'<em>No shared free time found.</em>'}</div>`,`<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-psend disabled>Send proposal</button>`);
      if(!m) return; let pick=null; const R=m.root;
      R.querySelectorAll('[data-pslot]').forEach(b=>b.onclick=()=>{ pick=b.dataset.pslot; R.querySelectorAll('[data-pslot]').forEach(x=>x.classList.toggle('on',x===b)); R.querySelector('[data-psend]').disabled=false; });
      R.querySelector('[data-psend]').onclick=()=>{ upd(o=>{ const a=o.events.find(y=>y.id===e.id).attendees.find(y=>y.id===ME); a.status='proposed'; a.proposal=pick; }); m.close(); toast('New time proposed to '+P(e.organiser).name.split(' ')[0]); draw(); };
    }
    function ics(e){ const f=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
      const txt=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Merchsmith//Calendar//EN','BEGIN:VEVENT','UID:'+e.id+'@merchsmith','DTSTAMP:'+f(new Date()),'DTSTART:'+f(e.start),'DTEND:'+f(e.end),
        'SUMMARY:'+e.title,'DESCRIPTION:'+(e.notes||'')+(e.video?'\\n'+e.video.url:''),modeOf(e)==='video'&&e.video?'LOCATION:'+e.video.url:modeOf(e)==='person'&&e.location?'LOCATION:'+e.location.replace(/\n/g,', '):modeOf(e)==='phone'&&e.phone?'LOCATION:Phone '+e.phone:'','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/calendar'})); a.download=e.title.replace(/[^\w]+/g,'-')+'.ics'; a.click(); }

    /* ----- invitations ----- */
    function drawInvites(body){ const now=new Date(), list=events().filter(e=>!e.cancelled&&new Date(e.end)>now);
      const inv=list.filter(e=>e.attendees.some(a=>a.id===ME)).sort((a,b)=>new Date(a.start)-new Date(b.start));
      const props=list.filter(e=>e.organiser===ME&&e.attendees.some(a=>a.status==='proposed'));
      const sent=list.filter(e=>e.organiser===ME).sort((a,b)=>new Date(a.start)-new Date(b.start));
      const row=(e,kind)=>{ const a=e.attendees.find(x=>x.id===ME), org=P(e.organiser);
        return `<div class="cal-inv"><div class="cal-invd"><b>${fD(e.start,{day:'numeric'})}</b><span>${fD(e.start,{month:'short'})}</span></div>
          <div class="cal-invi"><b>${esc(e.title)}</b><span>${fT(e.start)}–${fT(e.end)} · ${kind==='sent'?e.attendees.map(x=>esc(P(x.id).name.split(' ')[0])+' '+({accepted:'✓',declined:'✗',pending:'…',proposed:'↻'}[x.status])).join(', '):'From '+esc(org.name)+' · '+esc(org.orgName||'')} · ${esc(how(e))}</span></div>
          <div class="cal-inva">${kind==='in'?(a.status==='pending'?`<button class="pp-btn ghost sm" data-iprop="${esc(e.id)}">Propose time</button><button class="pp-btn ghost sm" data-irsvp="${esc(e.id)}|declined">Decline</button><button class="pp-btn sm" data-irsvp="${esc(e.id)}|accepted">Accept</button>`
            :`<em class="cal-pill s-${a.status}">${{accepted:'Accepted',declined:'Declined',proposed:'You proposed a new time'}[a.status]}</em>`):''}<button class="pp-btn ghost sm" data-iopen="${esc(e.id)}">Open</button></div></div>`; };
      body.innerHTML=`<div class="cal-invs">
        ${props.length?`<div class="cal-sec"><h3>New time proposed <b>${props.length}</b></h3>${props.map(e=>row(e,'sent')).join('')}</div>`:''}
        <div class="cal-sec"><h3>Invitations to you ${(n=>n?`<b>${n}</b>`:'')(inv.filter(e=>e.attendees.find(a=>a.id===ME).status==='pending').length)}</h3>${inv.length?inv.map(e=>row(e,'in')).join(''):'<div class="cal-empty">No invitations.</div>'}</div>
        <div class="cal-sec"><h3>Meetings you organised</h3>${sent.length?sent.map(e=>row(e,'sent')).join(''):'<div class="cal-empty">You haven’t organised any upcoming meetings.</div>'}</div></div>`;
      body.querySelectorAll('[data-irsvp]').forEach(b=>b.onclick=()=>{ const [id,st]=b.dataset.irsvp.split('|'); upd(o=>{ o.events.find(y=>y.id===id).attendees.find(y=>y.id===ME).status=st; }); toast(st==='accepted'?'Accepted':'Declined'); draw(); });
      body.querySelectorAll('[data-iprop]').forEach(b=>b.onclick=()=>propose(events().find(y=>y.id===b.dataset.iprop)));
      body.querySelectorAll('[data-iopen]').forEach(b=>b.onclick=()=>detail(b.dataset.iopen));
    }

    /* ----- booking link ----- */
    function drawBooking(body){ const L=Object.assign({enabled:true,slug:me.name.toLowerCase().replace(/[^a-z]+/g,'-'),types:[{n:'Intro call',d:30},{n:'Project review',d:60}],days:[1,2,3,4,5],from:'09:00',to:'17:00',buffer:15,max:4,video:'meet',modes:['video','phone','person'],location:'',source:'merchsmith'},db().links[ME]||{});
      const url='https://'+((window.MSDOMAIN&&MSDOMAIN.get&&MSDOMAIN.get('acme')&&MSDOMAIN.get('acme').status==='live'&&me.org==='mojo')?MSDOMAIN.get('acme').host:'merchsmith.store')+'/book/'+L.slug, cal=(db().conns[ME]||{}).calendly;
      body.innerHTML=`<div class="cal-cols">
        <div class="cal-panel"><div class="cal-ph"><h3>Your booking link</h3><button class="cal-sw2${L.enabled?' on':''}" data-bon aria-label="Booking link on or off"></button></div>
          <p class="cal-lede">Share this with customers so they can book time with you. They only see the slots you’re free, never what’s in your calendar.</p>
          <div class="cal-url"><code>${esc(url)}</code><button class="pp-btn ghost sm" data-bcopy>Copy</button><button class="pp-btn sm" data-bprev>Preview</button></div>
          ${cal?`<div class="cal-note">Calendly is connected. You can share your Calendly link instead: <code>${esc(cal.url)}</code>. Bookings made there appear here too.</div>`:''}
          <h4>Meeting types</h4><div class="cal-types">${L.types.map((t,i)=>`<div class="cal-type"><input data-btn="${i}" value="${esc(t.n)}"><select data-btd="${i}">${[15,30,45,60,90].map(x=>`<option value="${x}"${x===t.d?' selected':''}>${x} min</option>`).join('')}</select><button data-btx="${i}" aria-label="Remove">×</button></div>`).join('')}</div>
          <button class="pp-link" data-badd>+ Add meeting type</button></div>
        <div class="cal-panel"><h3>Booking rules</h3>
          <div class="cal-note" style="margin:0 0 12px">Bookable times follow your <a href="#tab=avail" data-gotab="avail">working hours &amp; availability</a>: ${(()=>{ const a=availOf(ME); return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_,i)=>a.days.includes(i)).join(', ')+' '+a.from+'–'+a.to+(a.lunch&&a.lunch.on?', lunch '+a.lunch.from+'–'+a.lunch.to:''); })()}.</div>
          <div class="cal-row2"><label>Gap between meetings <select data-bf="buffer">${[0,5,10,15,30].map(x=>`<option${x==L.buffer?' selected':''}>${x}</option>`).join('')}</select> min</label><label>Max per day <select data-bf="max">${[2,3,4,6,8].map(x=>`<option${x==L.max?' selected':''}>${x}</option>`).join('')}</select></label></div>
          <h4>How people can meet you</h4><div class="cal-days">${MODES.map(([k,l])=>`<button class="${L.modes.includes(k)?'on':''}" data-bmode="${k}">${l}</button>`).join('')}</div>
          ${L.modes.includes('video')?`<label class="cal-row1">Video provider <select data-bf="video">${Object.entries(VIDEO).map(([k,l])=>`<option value="${k}"${L.video===k?' selected':''}>${l}</option>`).join('')}</select></label>`:''}
          ${L.modes.includes('person')?`<label class="cal-row1" style="margin-top:8px">Where you meet <input data-bf="location" value="${esc(L.location)}" placeholder="Your office address" style="flex:1;font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 8px"></label>`:''}
          <p class="cal-lede" style="margin-top:14px">Busy time from your connected calendars is always blocked out.</p></div></div>`;
      const put=f=>{ upd(o=>{ o.links[ME]=Object.assign({},L,f); }); drawBooking(body); };
      body.querySelector('[data-bon]').onclick=()=>put({enabled:!L.enabled});
      body.querySelector('[data-bcopy]').onclick=()=>{ try{ navigator.clipboard.writeText(url); }catch(e){} toast('Link copied'); };
      body.querySelector('[data-bprev]').onclick=()=>preview(L,url);
      body.querySelectorAll('[data-gotab]').forEach(a=>a.onclick=ev=>{ ev.preventDefault(); S.tab=a.dataset.gotab; history.replaceState(null,'','#tab='+S.tab); draw(); });
      body.querySelectorAll('[data-bf]').forEach(i=>i.onchange=()=>put({[i.dataset.bf]:i.value}));
      body.querySelectorAll('[data-bmode]').forEach(b=>b.onclick=()=>{ const k2=b.dataset.bmode, on=L.modes.includes(k2); if(on&&L.modes.length<2) return toast('Offer at least one way to meet'); put({modes:on?L.modes.filter(x=>x!==k2):[...L.modes,k2]}); });
      body.querySelectorAll('[data-btn]').forEach(i=>i.onchange=()=>{ const t=L.types.slice(); t[+i.dataset.btn]={...t[+i.dataset.btn],n:i.value.trim()||'Meeting'}; put({types:t}); });
      body.querySelectorAll('[data-btd]').forEach(i=>i.onchange=()=>{ const t=L.types.slice(); t[+i.dataset.btd]={...t[+i.dataset.btd],d:+i.value}; put({types:t}); });
      body.querySelectorAll('[data-btx]').forEach(b=>b.onclick=()=>{ if(L.types.length<2) return toast('Keep at least one meeting type'); put({types:L.types.filter((_,i)=>i!==+b.dataset.btx)}); });
      body.querySelector('[data-badd]').onclick=()=>put({types:[...L.types,{n:'Meeting',d:30}]});
    }
    function preview(L,url){ let ti=0, pick=null, gm=L.modes[0];
      const slotsFor=d=>{ const av2=availOf(ME), mn=L.types[ti].d, out=[];
        if(dayOff(ME,d)) return out;
        for(let t=mins(av2.from);t+mn<=mins(av2.to);t+=30){ const s=at(d,0,t), e=new Date(s.getTime()+mn*6e4); if(s<new Date()) continue; if(unavailable(ME,s,e)) continue;
          const pad=+L.buffer*6e4; if(busyOf(ME,day0(d),addD(day0(d),1),ME).some(b=>b.start<new Date(e.getTime()+pad)&&b.end>new Date(s.getTime()-pad))) continue; out.push(s); }
        return out.slice(0,+L.max*2); };
      let d=day0(new Date()); while(!slotsFor(d).length&&d<addD(new Date(),21)) d=addD(d,1);
      const m=modal('Booking page preview',`<div class="cal-bp" data-bp></div>`,`<span class="cal-hint" style="margin-right:auto">This is what customers see at ${esc(url.replace('https://',''))}</span><button class="pp-btn ghost" data-ppx>Close</button><button class="pp-btn" data-bpbook disabled>Book</button>`,true);
      if(!m) return; const R=m.root;
      const drawBP=()=>{ const sl=slotsFor(d);
        R.querySelector('[data-bp]').innerHTML=`<div class="cal-bph">${av(me,44)}<div><b>${esc(me.name)}</b><span>${esc(me.title||'')} · ${esc(me.orgName||'')}</span></div></div>
          <div class="cal-bpt">${L.types.map((t,i)=>`<button class="${i===ti?'on':''}" data-bpt="${i}">${esc(t.n)}<i>${t.d} min</i></button>`).join('')}</div>
          <div class="cal-mode">${MODES.filter(([k])=>L.modes.includes(k)).map(([k,l])=>`<button type="button" data-bpm="${k}" class="${gm===k?'on':''}">${l}${k==='video'?' · '+esc(VIDEO[L.video]):''}</button>`).join('')}</div>
          ${gm==='person'&&L.location?`<em class="cal-opt">Meeting at ${esc(L.location)}</em>`:''}
          <div class="cal-bpd"><button data-bpd="-1">‹</button><b>${fD(d,{weekday:'long',day:'numeric',month:'long'})}</b><button data-bpd="1">›</button></div>
          <div class="cal-slots">${sl.map(s=>`<button data-bps="${iso(s)}" class="${pick===iso(s)?'on':''}">${fT(s)}</button>`).join('')||'<em>No free times this day.</em>'}</div>
          <div class="pp-grid" style="grid-template-columns:1fr 1fr;margin-top:12px"><label class="pp-f"><span>Your name</span><input data-bpn value="Guest from Citrix"></label><label class="pp-f"><span>Email</span><input data-bpe value="guest@citrix.com"></label>${gm==='phone'?'<label class="pp-f wide"><span>Your phone number</span><input data-bpp type="tel" placeholder="We’ll call you on this"></label>':''}</div>`;
        R.querySelectorAll('[data-bpm]').forEach(b=>b.onclick=()=>{ gm=b.dataset.bpm; drawBP(); });
        R.querySelectorAll('[data-bpt]').forEach(b=>b.onclick=()=>{ ti=+b.dataset.bpt; pick=null; drawBP(); });
        R.querySelectorAll('[data-bpd]').forEach(b=>b.onclick=()=>{ d=addD(d,+b.dataset.bpd); pick=null; drawBP(); });
        R.querySelectorAll('[data-bps]').forEach(b=>b.onclick=()=>{ pick=b.dataset.bps; drawBP(); });
        R.querySelector('[data-bpbook]').disabled=!pick; };
      drawBP();
      R.querySelector('[data-bpbook]').onclick=()=>{ const s=new Date(pick), t=L.types[ti], n=R.querySelector('[data-bpn]').value.trim()||'Guest';
        upd(o=>{ o.events.push({id:'e'+Date.now().toString(36),title:t.n+' with '+n,organiser:ME,attendees:[],guest:{name:n,email:R.querySelector('[data-bpe]').value.trim()},start:iso(s),end:iso(new Date(s.getTime()+t.d*6e4)),
          mode:gm,video:gm==='video'?{provider:L.video,url:vLink(L.video)}:null,phone:gm==='phone'?((R.querySelector('[data-bpp]')||{}).value||'').trim():'',location:gm==='person'?L.location:'',project:'',product:'',notes:'Booked through your booking link.',reminder:15,source:'booking'}); });
        m.close(); toast('Booked — it’s in your calendar'); S.date=s; draw(); };
    }

    /* ----- working hours & availability ----- */
    function drawAvail(body){ const a=availOf(ME), today=ymd(new Date()), DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const hols=Object.entries((HOL[a.hol]||HOL.none).d).filter(([d])=>d>=today).slice(0,6);
      const away=(a.away||[]).filter(x=>x.to>=today).sort((p,q)=>p.from.localeCompare(q.from));
      const fmtR=x=>x.from===x.to?fD(x.from,{weekday:'short',day:'numeric',month:'short'}):fD(x.from,{day:'numeric',month:'short'})+' – '+fD(x.to,{day:'numeric',month:'short',year:'numeric'});
      body.innerHTML=`<p class="cal-lede" style="max-width:70ch">This is when people can meet you. New meetings, suggested times and your booking link all follow it. Others only see that you’re unavailable, never why.</p>
      <div class="cal-cols">
        <div class="cal-panel"><h3>Working hours</h3>
          <div class="cal-days">${[1,2,3,4,5,6,0].map(i=>`<button class="${a.days.includes(i)?'on':''}" data-aday="${i}">${DN[i]}</button>`).join('')}</div>
          <div class="cal-row2"><label>Start <input type="time" data-af="from" value="${a.from}"></label><label>Finish <input type="time" data-af="to" value="${a.to}"></label></div>
          <h4>Lunch break</h4>
          <div class="cal-row2" style="align-items:center"><button class="cal-sw2${a.lunch&&a.lunch.on?' on':''}" data-alon aria-label="Lunch break on or off"></button>
            <label>From <input type="time" data-alf="from" value="${a.lunch.from}"${a.lunch.on?'':' disabled'}></label><label>To <input type="time" data-alf="to" value="${a.lunch.to}"${a.lunch.on?'':' disabled'}></label></div>
          <p class="cal-lede" style="margin:4px 0 0">No meetings can be booked over your lunch break.</p>
          <h4>Bank holidays</h4>
          <label class="cal-row1"><select data-ahol>${Object.entries(HOL).map(([kk,v])=>`<option value="${kk}"${a.hol===kk?' selected':''}>${esc(v.name)}</option>`).join('')}</select></label>
          ${hols.length?`<ul class="cal-hl">${hols.map(([d,n])=>`<li><b>${fD(d,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</b><span>${esc(n)}</span></li>`).join('')}</ul>`:''}
        </div>
        <div class="cal-panel"><h3>Time off</h3>
          <p class="cal-lede">Whole days you’re away: holidays, conferences, training.</p>
          ${away.length?`<ul class="cal-bl">${away.map(x=>`<li><span><b>${esc(x.label||'Away')}</b><i>${fmtR(x)}</i></span><button data-awx="${esc(x.id)}" aria-label="Remove">×</button></li>`).join('')}</ul>`:'<p class="cal-none">No time off booked.</p>'}
          <div class="cal-addrow"><input type="date" data-aw="from" value="${today}"><span>to</span><input type="date" data-aw="to" value="${today}"><input data-aw="label" placeholder="e.g. Annual leave"><button class="pp-btn sm" data-awadd>Add</button></div>
          <h3 style="margin-top:22px">Blocked times</h3>
          <p class="cal-lede">Part of a day when you can’t meet, once or every week.</p>
          ${(a.blocks||[]).length?`<ul class="cal-bl">${a.blocks.map(b=>`<li><span><b>${esc(b.label||'Blocked')}</b><i>${b.repeat==='weekly'?'Every '+['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][b.dow]:fD(b.date,{weekday:'short',day:'numeric',month:'short'})} · ${b.from}–${b.to}</i></span><button data-abx="${esc(b.id)}" aria-label="Remove">×</button></li>`).join('')}</ul>`:'<p class="cal-none">No blocked times.</p>'}
          <div class="cal-addrow"><select data-ab="rep"><option value="once">On</option><option value="weekly">Every</option></select><input type="date" data-ab="date" value="${today}"><select data-ab="dow" hidden>${[1,2,3,4,5,6,0].map(i=>`<option value="${i}">${DN[i]}</option>`).join('')}</select>
            <input type="time" data-ab="from" value="15:00"><span>–</span><input type="time" data-ab="to" value="16:00"><input data-ab="label" placeholder="e.g. School run"><button class="pp-btn sm" data-abadd>Add</button></div>
          <p class="cal-aerr" data-aerr hidden></p>
        </div></div>`;
      const err=body.querySelector('[data-aerr]'), fail=t=>{ err.textContent=t; err.hidden=false; };
      const put=p=>{ setAvail(ME,p); toast('Availability saved'); drawAvail(body); };
      body.querySelectorAll('[data-aday]').forEach(b=>b.onclick=()=>{ const d=+b.dataset.aday, on=a.days.includes(d); if(on&&a.days.length<2) return fail('Keep at least one working day.'); put({days:on?a.days.filter(x=>x!==d):[...a.days,d]}); });
      body.querySelectorAll('[data-af]').forEach(i=>i.onchange=()=>{ const n=Object.assign({},a,{[i.dataset.af]:i.value}); if(mins(n.to)<=mins(n.from)) return fail('Finish time must be after start time.'); put({[i.dataset.af]:i.value}); });
      body.querySelector('[data-alon]').onclick=()=>put({lunch:Object.assign({},a.lunch,{on:!a.lunch.on})});
      body.querySelectorAll('[data-alf]').forEach(i=>i.onchange=()=>{ const l=Object.assign({},a.lunch,{[i.dataset.alf]:i.value}); if(mins(l.to)<=mins(l.from)) return fail('Lunch must end after it starts.'); put({lunch:l}); });
      body.querySelector('[data-ahol]').onchange=e2=>put({hol:e2.target.value});
      body.querySelector('[data-awadd]').onclick=()=>{ const g=n=>body.querySelector('[data-aw="'+n+'"]').value; const f=g('from'), t=g('to')||f;
        if(!f) return fail('Pick the first day off.'); if(t<f) return fail('The last day can’t be before the first.');
        put({away:[...(a.away||[]),{id:'a'+Date.now().toString(36),from:f,to:t,label:g('label').trim()||'Away'}]}); };
      body.querySelectorAll('[data-awx]').forEach(b=>b.onclick=()=>put({away:(a.away||[]).filter(x=>x.id!==b.dataset.awx)}));
      const rep=body.querySelector('[data-ab="rep"]'); rep.onchange=()=>{ body.querySelector('[data-ab="date"]').hidden=rep.value==='weekly'; body.querySelector('[data-ab="dow"]').hidden=rep.value!=='weekly'; };
      body.querySelector('[data-abadd]').onclick=()=>{ const g=n=>body.querySelector('[data-ab="'+n+'"]').value; if(mins(g('to'))<=mins(g('from'))) return fail('The block must end after it starts.');
        if(g('rep')==='once'&&!g('date')) return fail('Pick a date.');
        put({blocks:[...(a.blocks||[]),{id:'b'+Date.now().toString(36),repeat:g('rep'),date:g('rep')==='once'?g('date'):'',dow:g('rep')==='weekly'?+g('dow'):null,from:g('from'),to:g('to'),label:g('label').trim()||'Blocked'}]}); };
      body.querySelectorAll('[data-abx]').forEach(b=>b.onclick=()=>put({blocks:(a.blocks||[]).filter(x=>x.id!==b.dataset.abx)}));
    }

    /* ----- connected calendars ----- */
    function drawConnect(body){ const cn=db().conns[ME]||{}, pr=db().prefs[ME]||{};
      const INT=[['google','Google Calendar','Two-way sync. Merchsmith meetings appear in Google, and your Google events block time here.','G'],
        ['outlook','Microsoft Outlook / 365','Two-way sync with your Outlook or Microsoft 365 calendar.','O'],
        ['calendly','Calendly','Bring in your Calendly event types and bookings, or keep using your Calendly link.','C'],
        ['ical','Apple Calendar / iCal feed','Subscribe to your Merchsmith meetings from Apple Calendar or any app that reads iCal. Read-only.','i']];
      const feed='webcal://merchsmith.store/cal/'+ME+'-'+hash(ME).toString(36)+'.ics';
      body.innerHTML=`<div class="cal-conns">${INT.map(([k,n,d,l])=>{ const c=cn[k]; return `<div class="cal-conn"><span class="cal-logo l-${k}">${l}</span><div class="cal-ci"><b>${n}</b><span>${d}</span>
          ${c?(k==='ical'?`<div class="cal-url"><code>${esc(feed)}</code><button class="pp-btn ghost sm" data-ccopy>Copy</button></div>`
            :k==='calendly'?`<em class="cal-ok">Connected as ${esc(c.url)} · ${c.types} event types imported</em>`
            :`<em class="cal-ok">Connected · ${esc(c.email)}</em><label class="cal-chk"><input type="checkbox" data-ctwo="${k}"${c.twoWay!==false?' checked':''}> Add Merchsmith meetings to ${n.split(' ')[0]} (two-way)</label><label class="cal-chk"><input type="checkbox" checked disabled> Use ${n.split(' ')[0]} busy time when others book with me</label>`):''}</div>
          ${c?`<button class="pp-btn ghost sm" data-cdis="${k}">Disconnect</button>`:`<button class="pp-btn sm" data-ccon="${k}">${k==='ical'?'Get feed link':'Connect'}</button>`}</div>`; }).join('')}</div>
        <div class="cal-panel" style="margin-top:18px"><h3>Reminders &amp; notifications</h3>
          <label class="cal-row1">Default reminder <select data-np="rem">${[[0,'None'],[10,'10 minutes before'],[15,'15 minutes before'],[60,'1 hour before']].map(([v,l])=>`<option value="${v}"${(pr.rem!=null?pr.rem:15)==v?' selected':''}>${l}</option>`).join('')}</select></label>
          ${[['inv','Email me new invitations and replies'],['day','Send me a daily agenda at 8:00'],['pop','Show a pop-up reminder in Merchsmith']].map(([k,l])=>`<label class="cal-chk"><input type="checkbox" data-np="${k}"${pr[k]!==false?' checked':''}> ${l}</label>`).join('')}</div>
        <p class="cal-proto">Prototype: connecting is simulated. The real version signs in with Google or Microsoft (OAuth) and Calendly’s API; see HANDOVER.md.</p>`;
      body.querySelectorAll('[data-ccon]').forEach(b=>b.onclick=()=>connect(b.dataset.ccon));
      body.querySelectorAll('[data-cdis]').forEach(b=>b.onclick=()=>{ upd(o=>{ o.conns[ME]=o.conns[ME]||{}; delete o.conns[ME][b.dataset.cdis]; }); toast('Disconnected'); draw(); });
      body.querySelectorAll('[data-ctwo]').forEach(c=>c.onchange=()=>upd(o=>{ o.conns[ME][c.dataset.ctwo].twoWay=c.checked; }));
      body.querySelectorAll('[data-np]').forEach(c=>c.onchange=()=>upd(o=>{ o.prefs[ME]=Object.assign(o.prefs[ME]||{},{[c.dataset.np]:c.type==='checkbox'?c.checked:+c.value}); }));
      const cp=body.querySelector('[data-ccopy]'); if(cp) cp.onclick=()=>{ try{ navigator.clipboard.writeText(feed); }catch(e){} toast('Feed link copied'); };
    }
    function connect(k){ const email=(me.name.split(' ')[0]+'@'+((me.orgName||'company').toLowerCase().replace(/[^a-z]+/g,'')||'company')+'.com').toLowerCase();
      if(k==='ical'){ upd(o=>{ o.conns[ME]=Object.assign(o.conns[ME]||{},{ical:{on:true}}); }); return draw(); }
      const NM={google:'Google',outlook:'Microsoft',calendly:'Calendly'}[k];
      const m=modal('Connect '+NM,`<div class="cal-oauth"><span class="cal-logo l-${k}" style="width:48px;height:48px;font-size:20px">${k[0].toUpperCase()}</span>
        <p><b>Merchsmith</b> wants to ${k==='calendly'?'read your Calendly event types and scheduled events':'view and edit events on your calendar and see when you’re free'}.</p>
        <label class="pp-f"><span>${k==='calendly'?'Calendly link':'Account'}</span><input data-oa value="${k==='calendly'?'calendly.com/'+me.name.toLowerCase().replace(/[^a-z]+/g,'-'):email}"></label>
        <p class="pp-note">In the real app this opens ${NM}’s own sign-in window.</p></div>`,`<button class="pp-btn ghost" data-ppx>Cancel</button><button class="pp-btn" data-oaok>Allow</button>`);
      if(!m) return; m.root.querySelector('[data-oaok]').onclick=()=>{ const v=m.root.querySelector('[data-oa]').value.trim();
        upd(o=>{ o.conns[ME]=Object.assign(o.conns[ME]||{},{[k]:k==='calendly'?{url:v,types:3}:{email:v,twoWay:true}}); });
        m.close(); toast(NM+' connected'+(k!=='calendly'?' — your busy time now shows in Week view':'')); draw(); }; }

    /* ----- reminders ----- */
    function tick(){ const pr=db().prefs[ME]||{}; if(pr.pop===false) return; const now=Date.now(), o=db();
      mine(new Date(),addD(new Date(),2)).forEach(e=>{ if(statusOf(e)==='declined'||!e.reminder) return; const k=e.id+(e._occ||''), s=new Date(e.start).getTime();
        if(s-now<=e.reminder*6e4&&s>now&&!o.fired[k]){ upd(x=>{ x.fired[k]=1; }); toast('Starting '+(Math.round((s-now)/6e4)<=1?'now':'in '+Math.round((s-now)/6e4)+' min')+': '+e.title); } }); }
    draw(); tick(); setInterval(tick,30000);
    const wm=location.hash.match(/with=([^&]+)/); if(wm){ history.replaceState(null,'',location.pathname+location.search+'#tab=cal'); setTimeout(()=>editor({with:[decodeURIComponent(wm[1])]}),300); }
    window.addEventListener('hashchange',()=>{ const t=(location.hash.match(/tab=(\w+)/)||[])[1]; if(t&&t!==S.tab){ S.tab=t; draw(); } });
  }

  const css=`
  .cal-tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line-soft);margin:22px 0 18px;}
  .cal-tab{white-space:nowrap;flex:none;border:0;background:none;font:inherit;font-size:14.5px;font-weight:700;color:var(--ink-3);padding:11px 16px;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px;display:flex;align-items:center;gap:7px;}
  .cal-tab.on{color:var(--periwinkle-deep);border-bottom-color:var(--periwinkle-deep);}
  .cal-tab b{background:var(--flare);color:#fff;font-size:10.5px;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;}
  .cal-wrap{display:grid;grid-template-columns:270px minmax(0,1fr);gap:18px;align-items:start;}
  @media(max-width:960px){.cal-wrap{grid-template-columns:1fr;}}
  .cal-rail{display:flex;flex-direction:column;gap:12px;}
  @media(min-width:961px){.cal-rail{position:sticky;top:80px;}}
  @media(max-width:960px){.cal-rail{order:2;}.cal-people{max-height:220px;}}
  .cal-new{font:inherit;font-size:14.5px;font-weight:800;color:#fff;background:var(--periwinkle-deep);border:0;border-radius:12px;padding:13px;cursor:pointer;}
  .cal-card{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:14px;}
  .cal-card h5{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);display:flex;justify-content:space-between;}
  .cal-card h5 em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);}
  .cal-mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13.5px;} .cal-mh button{border:0;background:none;font-size:16px;cursor:pointer;color:var(--ink-3);padding:2px 6px;}
  .cal-mg{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;} .cal-mg i{font-style:normal;font-size:10.5px;font-weight:800;color:var(--muted);padding:4px 0;}
  .cal-mg button{border:0;background:none;font:inherit;font-size:12.5px;height:28px;border-radius:8px;cursor:pointer;color:var(--ink);} .cal-mg button:hover{background:var(--paper);}
  .cal-mg button.o{color:var(--muted);} .cal-mg button.t{color:var(--periwinkle-deep);font-weight:800;} .cal-mg button.s{background:var(--periwinkle-deep);color:#fff;}
  .cal-next{display:flex;flex-direction:column;gap:3px;border:0;background:var(--tint-peri);border-radius:10px;padding:10px 12px;text-align:left;font:inherit;cursor:pointer;width:100%;}
  .cal-next b{font-size:13.5px;} .cal-next span{font-size:12px;color:var(--ink-3);}
  .cal-join{font-size:12.5px;font-weight:800;color:var(--periwinkle-deep);text-decoration:none;} .cal-join:hover{text-decoration:underline;}
  .cal-find{width:100%;font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;margin-bottom:8px;}
  .cal-people{max-height:340px;overflow:auto;display:flex;flex-direction:column;}
  .cal-person{display:flex;align-items:center;gap:8px;padding:6px 2px;border-radius:8px;cursor:pointer;} .cal-person:hover{background:var(--paper);}
  .cal-sw{width:10px;height:10px;border-radius:3px;flex:none;} .cal-pn{flex:1;min-width:0;display:flex;flex-direction:column;} .cal-pn b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .cal-pn i{font-style:normal;font-size:11.5px;color:var(--muted);}
  .cal-book{font:inherit;font-size:11.5px;font-weight:800;color:var(--periwinkle-deep);background:none;border:1px solid var(--line-soft);border-radius:7px;padding:3px 8px;cursor:pointer;opacity:0;} .cal-person:hover .cal-book,.cal-book:focus{opacity:1;}
  .cal-main{background:#fff;border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;min-width:0;}
  .cal-bar{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line-soft);flex-wrap:wrap;}
  .cal-btn{font:inherit;font-size:13px;font-weight:700;background:#fff;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 12px;cursor:pointer;} .cal-btn.ic{padding:7px 11px;}
  .cal-lbl{font-family:var(--serif);font-weight:500;font-size:21px;margin:0 8px;flex:1;min-width:200px;}
  .cal-views{display:flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;} .cal-views button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:7px 13px;cursor:pointer;} .cal-views button+button{border-left:1.5px solid var(--line-soft);} .cal-views button.on{background:var(--ink);color:#fff;}
  .cal-ovl{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:9px 14px;border-bottom:1px solid var(--line-soft);background:var(--paper);}
  .cal-chip{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;background:#fff;border:1px solid var(--line-soft);border-radius:999px;padding:3px 6px 3px 9px;} .cal-chip i{width:9px;height:9px;border-radius:3px;} .cal-chip button{border:0;background:none;cursor:pointer;color:var(--muted);font-size:14px;}
  .cal-hint{font-size:12px;color:var(--muted);margin-left:4px;}
  .cal-gh{display:grid;border-bottom:1px solid var(--line-soft);} .cal-gh span{display:flex;flex-direction:column;align-items:center;padding:8px 0;font-size:12px;} .cal-gh i{font-style:normal;color:var(--muted);font-weight:700;} .cal-gh b{font-size:18px;font-weight:600;}
  .cal-gh span.t b{background:var(--periwinkle-deep);color:#fff;border-radius:999px;min-width:30px;height:30px;display:grid;place-items:center;}
  .cal-scroll{height:620px;overflow:auto;}
  .cal-gb{display:grid;position:relative;}
  .cal-hrs{position:relative;border-right:1px solid var(--line-soft);} .cal-hrs span{position:absolute;right:8px;font-size:11px;color:var(--muted);transform:translateY(-6px);}
  .cal-col{position:relative;border-right:1px solid var(--paper-2);background-image:repeating-linear-gradient(to bottom,var(--paper-2) 0 1px,transparent 1px ${PX}px);cursor:cell;}
  .cal-col.we{background-color:#fbfbfd;}
  .cal-ovlane{position:absolute;inset:0;pointer-events:none;}
  .cal-busy{position:absolute;border-radius:4px;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--c) 35%,transparent) 0 5px,color-mix(in srgb,var(--c) 12%,transparent) 5px 10px);border-left:2px solid var(--c);pointer-events:auto;}
  .cal-ext{position:absolute;left:2px;right:2px;border-radius:6px;background:repeating-linear-gradient(135deg,#eceef3 0 6px,#f6f7fa 6px 12px);border:1px dashed #cfd2dc;font-style:normal;font-size:10.5px;color:var(--muted);padding:2px 6px;overflow:hidden;}
  .cal-ev{position:absolute;left:4px;right:4px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;border:0;border-radius:7px;padding:4px 7px;font:inherit;cursor:pointer;overflow:hidden;background:var(--periwinkle-deep);color:#fff;box-shadow:0 1px 3px rgba(20,22,45,.18);}
  .cal-ev b{font-size:12px;line-height:1.2;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;} .cal-ev span{font-size:10.5px;opacity:.85;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none;}
  .cal-ev.short{justify-content:center;padding:1px 7px;} .cal-ev.short b{width:100%;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cal-ev.st-accepted{background:var(--periwinkle);} .cal-ev.st-pending,.cal-ev.st-proposed{background:#fff;color:var(--periwinkle-ink);border:1.5px dashed var(--periwinkle-deep);}
  .cal-ev.st-declined{background:var(--paper-2);color:var(--muted);text-decoration:line-through;}
  .cal-off{position:absolute;left:0;right:0;z-index:0;font-style:normal;font-size:10.5px;font-weight:700;color:var(--muted);padding:3px 6px;pointer-events:none;overflow:hidden;}
  .cal-off.k-hours,.cal-off.k-off{background:rgba(34,34,48,.045);} .cal-off.k-lunch{background:repeating-linear-gradient(135deg,rgba(224,160,42,.14) 0 6px,rgba(224,160,42,.06) 6px 12px);color:#9a6b1f;}
  .cal-off.k-hol,.cal-off.k-away{background:repeating-linear-gradient(135deg,rgba(123,133,197,.16) 0 8px,rgba(123,133,197,.07) 8px 16px);color:var(--periwinkle-ink);font-size:12px;padding:8px;}
  .cal-off.k-block{background:repeating-linear-gradient(135deg,rgba(34,34,48,.1) 0 6px,rgba(34,34,48,.04) 6px 12px);color:var(--ink-3);border-top:1px dashed var(--line);}
  .cal-uoff{position:absolute;background:color-mix(in srgb,var(--c) 7%,transparent);pointer-events:none;}
  .cal-dayoff{font-style:normal;font-size:10px;font-weight:800;border-radius:5px;padding:1px 6px;margin-top:3px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:var(--tint-peri);color:var(--periwinkle-ink);}
  .cal-mc .cal-dayoff{margin:0 0 2px;display:block;}
  .cal-hl,.cal-bl{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;} .cal-hl li,.cal-bl li{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--paper-2);font-size:13px;}
  .cal-hl li b{min-width:150px;font-weight:600;} .cal-hl li span{color:var(--text-soft);} .cal-bl li span{flex:1;display:flex;flex-direction:column;} .cal-bl li i{font-style:normal;font-size:12px;color:var(--muted);} .cal-bl button{border:0;background:none;color:var(--muted);font-size:17px;cursor:pointer;}
  .cal-none{font-size:13px;color:var(--muted);margin:6px 0 0;}
  .cal-addrow{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:12px;font-size:13px;color:var(--muted);} .cal-addrow input,.cal-addrow select{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 8px;background:#fff;} .cal-addrow input[data-aw="label"],.cal-addrow input[data-ab="label"]{flex:1;min-width:120px;} .cal-addrow [hidden]{display:none;}
  .cal-aerr{color:#b4232c;font-size:13px;font-weight:600;margin:10px 0 0;} .cal-aerr[hidden]{display:none;}
  .cal-row2 input:disabled{opacity:.5;}
  .cal-now{position:absolute;left:0;right:0;height:2px;background:var(--flare);z-index:3;} .cal-now::before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--flare);}
  .cal-month .cal-mhd{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--line-soft);} .cal-mhd span{padding:8px;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;}
  .cal-mbody{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:minmax(104px,auto);}
  .cal-mc{border-right:1px solid var(--paper-2);border-bottom:1px solid var(--paper-2);padding:6px;display:flex;flex-direction:column;gap:3px;min-width:0;} .cal-mc>b{font-size:12.5px;font-weight:700;} .cal-mc.o{background:#fbfbfd;} .cal-mc.o>b{color:var(--muted);} .cal-mc.t>b{color:var(--periwinkle-deep);}
  .cal-mev{border:0;border-radius:6px;padding:2px 6px;font:inherit;font-size:11px;text-align:left;background:var(--tint-peri);color:var(--periwinkle-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;}
  .cal-mev.st-pending{background:#fff;border:1px dashed var(--periwinkle-deep);} .cal-more{font-size:11px;color:var(--muted);}
  .cal-agenda{padding:6px 16px 16px;} .cal-ad h4{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin:16px 0 6px;}
  .cal-ar{display:flex;align-items:center;gap:14px;width:100%;border:0;border-top:1px solid var(--paper-2);background:none;font:inherit;text-align:left;padding:11px 4px;cursor:pointer;} .cal-ar:hover{background:var(--paper);}
  .cal-at{width:60px;font-weight:800;font-size:13.5px;display:flex;flex-direction:column;} .cal-at i{font-style:normal;font-weight:500;font-size:12px;color:var(--muted);}
  .cal-ai{flex:1;display:flex;flex-direction:column;min-width:0;} .cal-ai b{font-size:14px;} .cal-ai em{font-style:normal;font-size:12.5px;color:var(--text-soft);}
  .cal-pill{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:6px;padding:3px 7px;background:var(--paper-2);color:var(--ink-3);white-space:nowrap;}
  .cal-pill.pend,.cal-pill.s-pending{background:#fbeccd;color:#9a6b1f;} .cal-pill.s-accepted{background:var(--tint-green);color:var(--green-deep);} .cal-pill.s-declined{background:var(--tint-red);color:#b4232c;} .cal-pill.s-proposed{background:var(--tint-peri);color:var(--periwinkle-ink);}
  .cal-empty{padding:40px;text-align:center;color:var(--muted);font-size:14px;}
  .cal-att{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;} .cal-a{display:inline-flex;align-items:center;gap:6px;background:var(--paper);border:1px solid var(--line-soft);border-radius:999px;padding:3px 6px 3px 3px;font-size:12.5px;} .cal-a i{font-style:normal;color:var(--muted);font-size:11.5px;} .cal-a button{border:0;background:none;cursor:pointer;color:var(--muted);font-size:14px;}
  .cal-a .mc-av,.cal-a>span:first-child{flex:none;}
  .cal-slots{display:flex;flex-wrap:wrap;gap:6px;} .cal-slots em{flex-basis:100%;font-style:normal;font-size:12px;color:var(--muted);}
  .cal-slots button{font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;border-radius:9px;padding:7px 11px;cursor:pointer;} .cal-slots button.on{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;}
  .cal-when{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;} .cal-when input{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;}
  .cal-conf b{font-size:12.5px;} .cal-conf .ok{color:var(--green-deep);} .cal-conf .bad{color:#b4232c;}
  .cal-mode{display:flex;flex-wrap:wrap;gap:0;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;width:max-content;max-width:100%;}
  .cal-mode button{white-space:nowrap;font:inherit;font-size:13px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:8px 13px;cursor:pointer;} .cal-mode button+button{border-left:1.5px solid var(--line-soft);} .cal-mode button.on{background:var(--periwinkle-deep);color:#fff;}
  .cal-mode.sub button.on{background:var(--ink);}
  [data-cmx]{display:grid;gap:5px;} [data-cmx] input{font-family:var(--sans);font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;}
  .cal-pill.m-phone{background:#fbeccd;color:#9a6b1f;} .cal-pill.m-person{background:var(--tint-green);color:var(--green-deep);}
  .cal-after{margin-top:18px;padding-top:16px;border-top:1px solid var(--line-soft);}
  .cal-after h4{margin:0 0 10px;font-family:var(--serif);font-weight:500;font-size:19px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .cal-src{font-family:var(--sans);font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:6px;padding:3px 8px;background:var(--paper-2);color:var(--ink-3);}
  .cal-src.s-gemini,.cal-src.s-gdoc{background:#e8f0fe;color:#1a56c4;}
  .cal-after h5{margin:14px 0 6px;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);} .cal-after h5 em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);margin-left:4px;}
  .cal-asum{margin:0;font-size:13.5px;line-height:1.55;background:var(--tint-peri);color:var(--periwinkle-ink);border-radius:12px;padding:11px 13px;}
  .cal-acts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;} .cal-acts li{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--paper-2);font-size:13.5px;}
  .cal-acts label{flex:1;display:flex;align-items:center;gap:9px;cursor:pointer;} .cal-acts input{width:16px;height:16px;accent-color:var(--periwinkle-deep);} .cal-acts .done{text-decoration:line-through;color:var(--muted);} .cal-acts em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--ink-3);background:var(--paper);border-radius:999px;padding:2px 9px;}
  .cal-atr{margin-top:12px;} .cal-atr summary{cursor:pointer;font-size:13px;font-weight:800;color:var(--periwinkle-deep);} .cal-atr .cal-find{margin:10px 0 6px;}
  .cal-atl{max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:2px;} .cal-atl p{margin:0;display:grid;grid-template-columns:40px 70px 1fr;gap:8px;font-size:13px;padding:5px 2px;border-radius:7px;} .cal-atl p:hover{background:var(--paper);}
  .cal-atl span{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums;padding-top:1px;} .cal-atl b{font-size:12.5px;} .cal-atl i{font-style:normal;line-height:1.45;}
  .cal-arow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;} .pp-link.danger{color:#b4232c;}
  .cal-pill.m-notes{background:#e8f0fe;color:#1a56c4;}
  .cal-opt{font-style:normal;font-weight:500;text-transform:none;letter-spacing:0;color:var(--muted);}
  .cal-dt{display:flex;flex-direction:column;gap:12px;} .cal-dr{display:grid;grid-template-columns:90px 1fr;gap:12px;font-size:13.5px;} .cal-dr>span{color:var(--muted);font-weight:700;font-size:12px;padding-top:2px;}
  .cal-dr code{font-size:11.5px;color:var(--muted);margin-left:6px;} .cal-dr a{color:var(--periwinkle-deep);font-weight:700;text-decoration:none;}
  .cal-plist{display:flex;flex-direction:column;gap:8px;} .cal-plist>div{display:flex;align-items:center;gap:8px;flex-wrap:wrap;} .cal-plist b{font-size:13.5px;} .cal-plist i{font-style:normal;color:var(--muted);font-size:12px;}
  .pp-btn.on{outline:2px solid var(--periwinkle);}
  .cal-invs{display:flex;flex-direction:column;gap:18px;}
  .cal-sec{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:6px 18px 10px;} .cal-sec h3{font-family:var(--serif);font-weight:500;font-size:20px;margin:12px 0 6px;display:flex;align-items:center;gap:8px;} .cal-sec h3 b{font-family:var(--sans);font-size:11px;background:var(--flare);color:#fff;border-radius:999px;padding:2px 7px;}
  .cal-inv{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid var(--paper-2);flex-wrap:wrap;}
  .cal-invd{width:48px;text-align:center;display:flex;flex-direction:column;background:var(--tint-peri);border-radius:10px;padding:6px 0;} .cal-invd b{font-size:18px;color:var(--periwinkle-ink);} .cal-invd span{font-size:10.5px;font-weight:800;text-transform:uppercase;color:var(--periwinkle-deep);}
  .cal-invi{flex:1;min-width:220px;display:flex;flex-direction:column;gap:2px;} .cal-invi b{font-size:14.5px;} .cal-invi span{font-size:12.5px;color:var(--text-soft);}
  .cal-inva{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
  .cal-cols{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:16px;} @media(max-width:900px){.cal-cols{grid-template-columns:1fr;}}
  .cal-panel{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:20px 22px;} .cal-panel h3{font-family:var(--serif);font-weight:500;font-size:21px;margin:0 0 6px;} .cal-panel h4{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:18px 0 8px;}
  .cal-ph{display:flex;align-items:center;justify-content:space-between;}
  .cal-lede{font-size:13.5px;color:var(--text-soft);line-height:1.55;margin:0 0 12px;}
  .cal-url{display:flex;align-items:center;gap:8px;flex-wrap:wrap;} .cal-url code{flex:1;min-width:200px;font-size:12.5px;background:var(--paper);border:1px solid var(--line-soft);border-radius:8px;padding:8px 10px;word-break:break-all;}
  .cal-note{margin-top:12px;font-size:12.5px;background:var(--tint-peri);color:var(--periwinkle-ink);border-radius:10px;padding:10px 12px;}
  .cal-types{display:flex;flex-direction:column;gap:6px;} .cal-type{display:flex;gap:6px;} .cal-type input{flex:1;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;} .cal-type select,.cal-row2 select,.cal-row1 select,.cal-row2 input{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 8px;background:#fff;} .cal-type button{border:0;background:none;color:var(--muted);font-size:17px;cursor:pointer;}
  .cal-days{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 12px;} .cal-days button{font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;border-radius:9px;padding:7px 10px;cursor:pointer;} .cal-days button.on{background:var(--periwinkle-deep);color:#fff;border-color:var(--periwinkle-deep);}
  .cal-row2{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;font-size:13px;color:var(--ink-2);} .cal-row2 label,.cal-row1{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-2);}
  .cal-sw2{width:46px;height:27px;border-radius:999px;background:var(--line);border:0;cursor:pointer;position:relative;} .cal-sw2::after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.25);} .cal-sw2.on{background:var(--periwinkle-deep);} .cal-sw2.on::after{transform:translateX(19px);}
  .cal-bp{display:flex;flex-direction:column;gap:12px;} .cal-bph{display:flex;align-items:center;gap:12px;} .cal-bph b{font-size:16px;display:block;} .cal-bph span{font-size:12.5px;color:var(--muted);}
  .cal-bpt{display:flex;gap:8px;flex-wrap:wrap;} .cal-bpt button{font:inherit;font-weight:700;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:11px;background:#fff;padding:10px 14px;text-align:left;cursor:pointer;display:flex;flex-direction:column;} .cal-bpt button i{font-style:normal;font-size:11.5px;font-weight:600;color:var(--muted);} .cal-bpt button.on{border-color:var(--periwinkle-deep);box-shadow:0 0 0 1px var(--periwinkle-deep) inset;}
  .cal-bpd{display:flex;align-items:center;gap:10px;} .cal-bpd button{border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:15px;}
  .cal-conns{display:flex;flex-direction:column;gap:10px;}
  .cal-conn{display:flex;align-items:flex-start;gap:14px;background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:16px 18px;}
  .cal-logo{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;font-weight:800;color:#fff;flex:none;font-size:17px;}
  .l-google{background:#4285f4;} .l-outlook{background:#0a64c2;} .l-calendly{background:#006bff;} .l-ical{background:#222;}
  .cal-ci{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;} .cal-ci>b{font-size:15px;} .cal-ci>span{font-size:13px;color:var(--text-soft);}
  .cal-ok{font-style:normal;font-size:12.5px;font-weight:700;color:var(--green-deep);} .cal-chk{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--ink-2);margin-top:4px;}
  .cal-oauth{display:flex;flex-direction:column;align-items:flex-start;gap:10px;} .cal-oauth p{margin:0;font-size:14px;}
  .cal-proto{font-size:12px;color:var(--muted);margin:14px 0 0;}
  .cal-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(14px);background:var(--ink);color:#fff;font-size:13.5px;font-weight:600;padding:11px 18px;border-radius:11px;opacity:0;transition:opacity .2s,transform .2s;z-index:1500;pointer-events:none;} .cal-toast.on{opacity:1;transform:translateX(-50%);}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { mount, pendingFor, events };
})();
