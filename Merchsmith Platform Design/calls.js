/* ============================================================
   calls.js — phone calls: make / receive, every call recorded, call log.

   Who you can call from the directory = chat contact rules (MSChat.contacts());
   any number can also be dialled. EVERY call is recorded: an announcement plays
   to both sides when the call connects. Recordings + transcript + summary live
   on the call record; retention is set by Platform Admin (Settings tab).

   Loaded on every page (sidebar.js injects it) so the call bar and incoming
   ring work anywhere. A test ring can be scheduled from the Calls page; it's
   stored in localStorage (ms-calls-ring) so it fires on whichever page you're on.

   PROTOTYPE: no telephony. Nothing rings, no audio is recorded; transcripts
   are generated. Going live = Twilio / Vonage / Aircall (see HANDOVER.md).
   Store: ms-calls-v1 {log:{personId:[call]}, prefs:{personId:{}}, policy:{}}.
   window.MSCALLS: mount(root) · dial({pid|number}) · incoming(pid) · unseen()
   ============================================================ */
window.MSCALLS=window.MSCALLS||(function(){
  // Calls is only for Platform Admin and distributors
  const ROLE_OK=()=>{ const r=window.MSID&&MSID.current?MSID.current():'distributor'; return r==='admin'||r==='distributor'; };
  const KEY='ms-calls-v1', RING='ms-calls-ring';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const mmss=s=>{ s=Math.max(0,Math.round(s)); const h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=String(s%60).padStart(2,'0'); return h?h+':'+String(m).padStart(2,'0')+':'+x:m+':'+x; };
  const fT=d=>new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const fD=(d,o)=>new Date(d).toLocaleDateString('en-GB',o||{weekday:'short',day:'numeric',month:'short'});
  const M=()=>window.MSChat;
  const orgName=p=>p?(p.orgName||(M()&&M().orgOf?((M().orgOf(p)||{}).name||''):'')):'';
  const me=()=>{ const m=M(); return m&&m.me?m.me():null; };
  const contacts=()=>{ const m=M(); return m&&m.contacts?m.contacts():[]; };
  const person=id=>{ if(!id) return null; const x=me(); if(x&&x.id===id) return x; return contacts().find(p=>p.id===id)||(M()&&M().person?M().person(id):null)||null; };
  const first=p=>p&&p.name?p.name.split(' ')[0]:'there';
  const phoneOf=p=>{ if(!p) return ''; if(p.phone) return p.phone; const h=hash(p.id); return '01'+String(100+h%900)+' '+String(100+(h>>>4)%900)+' '+String(100+(h>>>9)%900); };
  const isAdmin=()=>!!(window.MSID&&MSID.current&&MSID.current()==='admin');
  const IC={
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    in:'<path d="M17 7 7 17M7 9v8h8"/>', out:'<path d="M7 17 17 7M9 7h8v8"/>', miss:'<path d="M4 8l6 6 4-4 6 6M20 12v4h-4"/>',
    vm:'<circle cx="6.5" cy="12" r="3.5"/><circle cx="17.5" cy="12" r="3.5"/><path d="M6.5 15.5h11"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    hold:'<path d="M9 5v14M15 5v14"/>', pad:'<path d="M6 5h.01M12 5h.01M18 5h.01M6 11h.01M12 11h.01M18 11h.01M6 17h.01M12 17h.01M18 17h.01"/>',
    xfer:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>', note:'<path d="M6 3h8l4 4v14H6zM9 12h6M9 16h4"/>', end:'<path d="M3 14c5-5 13-5 18 0l-2.5 2.5-3-1.5v-2.5a10 10 0 0 0-5 0V15l-3 1.5z"/>',
    play:'<path d="M8 5v14l11-7z" fill="currentColor"/>', pause:'<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/>', rec:'<circle cx="12" cy="12" r="5" fill="currentColor"/>'};
  const ic=(k,s)=>`<svg class="cll-ic" width="${s||18}" height="${s||18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

  const TOPICS=[
    {project:'Autumn Giveaways',a:'It’s about the Autumn Giveaways proofs. We’ve had the tote and the mug back.',b:'The tote looks right. Could the logo on the mug move up about 10mm?',c:'Yes, I’ll get a revised mug proof over today.',d:'Great. If that’s fine we can sign off tomorrow.',sum:'Tote proof approved. Mug logo to move up 10mm; revised proof due today, sign-off expected tomorrow.',vm:'I’ve got a question on the Autumn Giveaways mug proof.'},
    {project:'',a:'I’m checking lead times on the cotton totes for November.',b:'Standard is 10 working days. Over 2,000 units it’s 14.',c:'We’re at 1,500, so 10 days works. Can you hold stock?',d:'I can hold it until Friday.',sum:'Tote lead time 10 working days at 1,500 units. Stock held until Friday.',vm:'I wanted to check lead times on the cotton totes.'},
    {project:'',a:'I’m calling about invoice 2291. The delivery charge looks doubled.',b:'Let me look. Yes, it’s been added twice.',c:'Can you send a credit note?',d:'I’ll issue one today and email it over.',sum:'Duplicate delivery charge on invoice 2291 confirmed. Credit note to be issued today.',vm:'It’s about a delivery charge on our last invoice.'},
    {project:'Winter Welcome Packs',a:'The samples for the Winter Welcome Packs, did they arrive?',b:'They came this morning. The beanie colour is a bit darker than expected.',c:'I’ll ask for the lighter navy and send a photo.',d:'Perfect, then we can confirm quantities.',sum:'Winter Welcome Pack samples received. Beanie too dark; lighter navy photo to follow before confirming quantities.',vm:'I’m following up on the Winter Welcome Pack samples.'},
    {project:'Staff Onboarding Kits',a:'We’d like to reorder the onboarding kits, same spec as last time.',b:'That’s 250 kits with the notebook and bottle?',c:'Yes, and add 50 lanyards this time.',d:'Fine. I’ll send a quote this afternoon.',sum:'Reorder of 250 Staff Onboarding Kits, same spec, plus 50 lanyards. Quote due this afternoon.',vm:'We’d like to reorder the onboarding kits.'}];

  /* ---------- store ---------- */
  function db(){ let o=null; try{ o=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
    if(!o||!o.log) o={log:{},prefs:{},policy:{}}; o.policy=Object.assign({retention:365,announce:'This call is recorded for training and quality purposes.'},o.policy||{}); return o; }
  function save(o){ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-calls-change')); }catch(e){} }
  function script(meP,p,tp,dir,dur,announce){ const A=dir==='out'?'me':'them', B=dir==='out'?'them':'me', nm=w=>w==='me'?meP:p;
    const L=[[A,`Hi ${first(nm(B))}, it’s ${first(nm(A))}${orgName(nm(A))?' at '+orgName(nm(A)):''}. Have you got a minute?`],[B,'Yes, go ahead.'],[A,tp.a],[B,tp.b],[A,tp.c],[B,tp.d],[A,'Perfect. I’ll put that in an email after the call.'],[B,'Thanks, speak soon.']];
    return [{who:'sys',t:0,text:announce},...L.map((x,i)=>({who:x[0],t:Math.round(4+(dur-6)*i/L.length),text:x[1]}))]; }
  function mk(o,meP){ const p=person(o.pid), pol=db().policy, tp=TOPICS[(o.topic||0)%TOPICS.length];
    const e=Object.assign({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),number:p?phoneOf(p):o.number,name:p?p.name:'',org:p?orgName(p):'',notes:'',project:''},o);
    if(e.outcome==='answered'&&e.dur>0){ e.rec=true; e.transcript=script(meP,p||{name:e.number},tp,e.dir,e.dur,pol.announce); e.summary=tp.sum; if(!e.project&&tp.project) e.project=tp.project; }
    if(e.outcome==='voicemail'){ e.rec=true; e.dir='in'; e.dur=e.dur||24; e.transcript=[{who:'sys',t:0,text:pol.announce},{who:'them',t:3,text:`Hi ${first(meP)}, it’s ${first(p)}${orgName(p)?' from '+orgName(p):''}. ${tp.vm} Give me a call back when you can. Thanks.`}]; e.summary='Voicemail. '+tp.vm; }
    return e; }
  function seedLog(meP){ const cs=contacts(); if(!cs.length) return []; const out=[], now=Date.now(), h=hash(meP.id);
    [['in','answered',0.08,312],['out','answered',0.9,185],['in','missed',1.2,0],['out','no-answer',2.1,0],['in','voicemail',2.8,26],['out','answered',4,428],['in','answered',6,251],['out','answered',9,97],['in','missed',12,0],['out','answered',15,366]]
      .forEach(([dir,outcome,ago,dur],i)=>{ const p=cs[(h+i*3)%cs.length], d=new Date(now-ago*864e5); d.setHours(9+(i*2)%8,(i*17)%60,0,0); if(d.getTime()>now) d.setTime(d.getTime()-864e5);
        out.push(mk({dir,outcome,pid:p.id,start:d.toISOString(),dur,topic:i,seen:i>4},meP)); });
    return out; }
  function log(){ const m=me(); if(!m) return []; const o=db(); if(!o.log[m.id]){ const s=seedLog(m); if(!s.length) return []; o.log[m.id]=s; save(o); }
    const cut=Date.now()-o.policy.retention*864e5;
    return o.log[m.id].map(e=>new Date(e.start).getTime()<cut&&e.rec?Object.assign({},e,{rec:false,expired:true,transcript:null}):e); }
  function add(e){ const m=me(), o=db(); o.log[m.id]=o.log[m.id]||seedLog(m); o.log[m.id].unshift(e); save(o); }
  function patch(id,p){ const m=me(), o=db(), x=(o.log[m.id]||[]).find(y=>y.id===id); if(x) Object.assign(x,p); save(o); }
  const prefs=()=>{ const m=me(); return Object.assign({forward:'',vm:true,greeting:'',afterHours:true,fwdOn:false,rings:4,fwd1:'',fwd2:''},(db().prefs||{})[m&&m.id]||{}); };
  const setPrefs=p=>{ const m=me(), o=db(); o.prefs[m.id]=Object.assign(prefs(),p); save(o); };
  const unseen=()=>log().filter(e=>!e.seen&&(e.outcome==='missed'||e.outcome==='voicemail')).length;
  const myNumber=()=>{ const m=me(); if(!m) return ''; const h=hash('num'+m.id); return '0330 '+String(100+h%900)+' '+String(1000+(h>>>5)%9000); };

  function toast(t){ let el=document.getElementById('cllToast'); if(!el){ el=document.createElement('div'); el.id='cllToast'; el.className='cll-toast'; document.body.appendChild(el); }
    el.textContent=t; el.classList.add('on'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('on'),3000); }

  /* ---------- live call bar (any page) ---------- */
  let CALL=null, tick=null;
  const LIVE='ms-calls-live', RING_MS=5000; // one UK ring cycle ≈ 5s in this prototype
  // the live call survives page changes: saved on every change, restored on load
  function persist(){ try{ if(CALL){ const c=Object.assign({},CALL); delete c._t; c.owner=(me()||{}).id; localStorage.setItem(LIVE,JSON.stringify(c)); } else localStorage.removeItem(LIVE); }catch(e){} }
  const chain=()=>{ const p=prefs(); return p.fwdOn?[p.fwd1,p.fwd2].filter(Boolean):[]; };
  const ringMs=()=>Math.max(2,+prefs().rings||4)*RING_MS;
  function arm(){ if(!CALL) return; clearTimeout(CALL._t); const left=t=>Math.max(0,t-(Date.now()-CALL.ringAt));
    if(CALL.state==='out-ring') CALL._t=setTimeout(connect,left(2600));
    else if(CALL.state==='in-ring'||CALL.state==='fwd'){
      // simulated colleague pick-up: the first forward answers on some calls, the second on others
      if(CALL.state==='fwd'&&CALL.fwdAnswers) CALL._t=setTimeout(()=>{ const c=person(CALL.fwdTo); finish('forwarded',{answeredBy:c?c.name:''}); toast((c?c.name:'Your colleague')+' answered the forwarded call'); },left(RING_MS*1.4));
      else CALL._t=setTimeout(nextStage,left(ringMs())); }
    else if(CALL.state==='live'){ clearInterval(tick); tick=setInterval(()=>{ const t=document.querySelector('#cllBar [data-cltime]'); if(t&&CALL&&CALL.start) t.textContent=mmss((Date.now()-CALL.start)/1000); },1000); } }
  function nextStage(){ if(!CALL) return; const ch=chain(), st=CALL.stage||0;
    if(st<ch.length){ CALL.stage=st+1; CALL.fwdTo=ch[st]; CALL.state='fwd'; CALL.ringAt=Date.now(); CALL.fwdAnswers=(hash(CALL.id+CALL.stage)%3===0)||CALL.stage===ch.length&&hash(CALL.id)%2===0;
      const c=person(CALL.fwdTo); toast('No answer. Forwarding to '+(c?c.name:'colleague')+(ch.length>1?' ('+CALL.stage+' of '+ch.length+')':'')); persist(); drawBar(); arm(); return; }
    finish(prefs().vm?'voicemail':'missed',{triedFwd:ch.map(id=>(person(id)||{}).name).filter(Boolean)}); }
  function bar(){ let el=document.getElementById('cllBar'); if(!el){ el=document.createElement('div'); el.id='cllBar'; el.className='cll-bar'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Phone call'); document.body.appendChild(el); } return el; }
  function drawBar(){ const el=bar(); if(!CALL){ el.classList.remove('on'); el.innerHTML=''; return; }
    const p=person(CALL.pid), nm=p?p.name:CALL.number, av=p&&M().avatar?M().avatar(p,46):`<span class="cll-avph">${ic('phone',20)}</span>`;
    const colleagues=contacts().filter(c=>me()&&c.org===me().org);
    const fw=CALL.state==='fwd'?person(CALL.fwdTo):null, nCh=chain().length;
    const st=CALL.state==='fwd'?'Forwarded to '+(fw?fw.name.split(' ')[0]:'colleague')+(nCh>1?' · '+CALL.stage+' of '+nCh:''):CALL.state==='in-ring'?'Incoming call':CALL.state==='out-ring'?'Calling…':CALL.held?'On hold':'';
    el.className='cll-bar on s-'+CALL.state;
    el.innerHTML=`<div class="cll-bh">${av}<div class="cll-bn"><b>${esc(nm)}</b><span>${esc([p?orgName(p):'',CALL.number].filter(Boolean).join(' · '))}</span></div>
        <div class="cll-bs">${CALL.state==='live'?`<span class="cll-recdot">${ic('rec',10)} Recording</span><b data-cltime>${mmss((Date.now()-CALL.start)/1000)}</b>`:''}${st?`<em>${st}</em>`:''}</div></div>
      ${CALL.state==='in-ring'?`<div class="cll-bact"><button class="cll-rb dec" data-cl="decline">${ic('end')}Decline</button><button class="cll-rb" data-cl="vm">${ic('vm')}Voicemail</button><button class="cll-rb ans" data-cl="answer">${ic('phone')}Answer</button></div><p class="cll-bnote">Calls are recorded. The caller hears the recording announcement when you answer.</p>`
      :CALL.state==='fwd'?`<div class="cll-fwd">${fw&&M().avatar?M().avatar(fw,26):''}<span>Ringing <b>${esc(fw?fw.name:'')}</b>…${nCh>CALL.stage?' Then '+esc((person(chain()[CALL.stage])||{name:''}).name.split(' ')[0])+'.':prefs().vm?' Then voicemail.':''}</span></div><div class="cll-bact"><button class="cll-rb ans wide" data-cl="answer">${ic('phone')}Answer here instead</button></div>`
      :CALL.state==='out-ring'?`<div class="cll-bact"><button class="cll-rb dec wide" data-cl="hang">${ic('end')}Cancel call</button></div>`
      :`<div class="cll-ctl">${[['mute','mic',CALL.muted?'Unmute':'Mute',CALL.muted],['hold','hold',CALL.held?'Resume':'Hold',CALL.held],['pad','pad','Keypad',CALL.panel==='pad'],['xfer','xfer','Transfer',CALL.panel==='xfer'],['notes','note','Notes',CALL.panel==='notes']].map(([k,i,l,on])=>`<button class="${on?'on':''}" data-cl="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</div>
        ${CALL.panel==='pad'?`<div class="cll-bpad"><code>${esc(CALL.dtmf||'')}&nbsp;</code><div>${'123456789*0#'.split('').map(d=>`<button data-dtmf="${d}">${d}</button>`).join('')}</div></div>`:''}
        ${CALL.panel==='xfer'?`<div class="cll-bx"><em>Transfer to a colleague</em>${colleagues.length?colleagues.map(c=>`<button data-xto="${esc(c.id)}">${M().avatar?M().avatar(c,24):''}<b>${esc(c.name)}</b></button>`).join(''):'<span>No colleagues to transfer to.</span>'}</div>`:''}
        ${CALL.panel==='notes'?`<textarea class="cll-bnotes" data-clnotes rows="3" placeholder="Notes are saved to the call record">${esc(CALL.notes||'')}</textarea>`:''}
        <div class="cll-bact"><button class="cll-rb dec wide" data-cl="hang">${ic('end')}End call</button></div>`}`;
    el.querySelectorAll('[data-cl]').forEach(b=>b.onclick=()=>act(b.dataset.cl));
    el.querySelectorAll('[data-dtmf]').forEach(b=>b.onclick=()=>{ CALL.dtmf=(CALL.dtmf||'')+b.dataset.dtmf; drawBar(); });
    el.querySelectorAll('[data-xto]').forEach(b=>b.onclick=()=>{ const c=person(b.dataset.xto); finish('answered',{transfer:c?c.name:''}); toast('Transferred to '+(c?c.name:'colleague')); });
    const n=el.querySelector('[data-clnotes]'); if(n){ n.oninput=()=>{ CALL.notes=n.value; persist(); }; n.focus(); n.setSelectionRange(n.value.length,n.value.length); }
  }
  function act(k){ if(!CALL) return;
    if(k==='answer') return connect();
    if(k==='decline') return finish('missed',{declined:true});
    if(k==='vm'){ finish('voicemail'); return toast('Sent to voicemail. The message is in your Voicemail tab.'); }
    if(k==='hang') return finish(CALL.state==='live'?'answered':(CALL.dir==='out'?'no-answer':'missed'));
    if(k==='mute') CALL.muted=!CALL.muted; if(k==='hold') CALL.held=!CALL.held;
    if(k==='pad'||k==='xfer'||k==='notes') CALL.panel=CALL.panel===k?'':k;
    persist(); drawBar(); }
  function dial(t){ t=t||{}; if(!ROLE_OK()) return; if(CALL) return toast('You’re already on a call');
    const p=person(t.pid); const number=(t.number||phoneOf(p)||'').trim(); if(!number) return toast('Enter a number to call');
    const match=!p&&contacts().find(c=>phoneOf(c).replace(/\D/g,'')===number.replace(/\D/g,''));
    CALL={id:'l'+Date.now().toString(36),dir:'out',pid:p?p.id:(match?match.id:null),number,state:'out-ring',ringAt:Date.now(),start:0,notes:'',panel:''}; persist(); drawBar(); arm(); }
  function incoming(pid){ if(CALL||!ROLE_OK()) return; const cs=contacts(); const p=person(pid)||cs[Math.floor(Math.random()*cs.length)]; if(!p) return;
    CALL={id:'l'+Date.now().toString(36),dir:'in',pid:p.id,number:phoneOf(p),state:'in-ring',stage:0,ringAt:Date.now(),start:0,notes:'',panel:''}; persist(); drawBar(); arm(); }
  function connect(){ if(!CALL) return; clearTimeout(CALL._t); CALL.state='live'; CALL.start=Date.now(); CALL.fwdTo=''; persist(); drawBar();
    toast('Recording started. “'+db().policy.announce+'”'); arm(); }
  function finish(outcome,extra){ if(!CALL) return; clearTimeout(CALL._t); clearInterval(tick);
    const m=me(), dur=CALL.start?Math.max(8,Math.round((Date.now()-CALL.start)/1000)):0;
    const e=mk(Object.assign({dir:CALL.dir,outcome,pid:CALL.pid,number:CALL.number,start:new Date(CALL.start||Date.now()).toISOString(),dur,topic:hash(CALL.pid||CALL.number)%TOPICS.length,
      seen:!(outcome==='missed'||outcome==='voicemail'),notes:CALL.notes||'',live:true},extra||{}),m);
    add(e);
    // bell + pop-up (notifications.js is on every page)
    try{ if(window.MSNOTIF){ const r=(window.MSID&&MSID.current?MSID.current():'distributor'), who=e.name||e.number, h='Merchsmith Calls.html'+(r==='admin'?'?scope=platform':'');
      if(outcome==='missed'&&e.dir==='in') MSNOTIF.push(r,{ev:'missed',title:'Missed call from '+who,body:[e.org,e.number].filter(Boolean).join(' · ')+(e.triedFwd&&e.triedFwd.length?' · no answer from '+e.triedFwd.join(' or '):''),href:h+'#tab=history'});
      else if(outcome==='voicemail') MSNOTIF.push(r,{ev:'voicemail',title:'Voicemail from '+who,body:[e.org,mmss(e.dur)].filter(Boolean).join(' · ')+(e.summary?' · '+e.summary.replace(/^Voicemail\.\s*/,''):''),href:h+'#tab=voicemail'});
      else if(outcome==='forwarded') MSNOTIF.push(r,{ev:'call_fwd_out',title:(e.answeredBy||'A colleague')+' answered your call from '+who,body:'Forwarded after '+prefs().rings+' rings',href:h+'#tab=history'});
      else if(outcome==='answered'&&e.rec) MSNOTIF.push(r,{ev:'call_rec',title:'Recording ready: call with '+who,body:mmss(e.dur)+' · transcript and summary saved',href:h+'#tab=history'}); } }catch(x){}
    CALL=null; persist(); drawBar(); if(outcome==='answered'&&!(extra&&extra.transfer)) toast('Call ended · '+mmss(dur)+' · recording saved to Calls'); }

  (function restore(n){ let c=null; try{ c=JSON.parse(localStorage.getItem(LIVE)||'null'); }catch(e){} if(!c) return;
    const m=me(); if(!m){ if(n<60) setTimeout(()=>restore(n+1),100); return; }
    if(c.owner&&c.owner!==m.id) return; if(CALL) return;
    const run=()=>{ CALL=c; drawBar(); arm(); }; document.body?run():document.addEventListener('DOMContentLoaded',run); })(0);

  // test rings scheduled from the Calls page fire on whatever page is open
  function scheduleRing(sec,pid){ const m=me(); localStorage.setItem(RING,JSON.stringify({at:Date.now()+sec*1000,pid:pid||'',for:m?m.id:''})); }
  setInterval(()=>{ try{ const r=JSON.parse(localStorage.getItem(RING)||'null'); if(r&&Date.now()>=r.at){ const m=me(); if(!m) return; localStorage.removeItem(RING); if(!r.for||r.for===m.id) incoming(r.pid); } }catch(e){} },1000);

  /* ---------- Calls page ---------- */
  function mount(root){ if(!ROLE_OK()){ root.innerHTML='<div class="cll-card" style="margin-top:22px;max-width:560px"><h5>Calls isn’t available</h5><p class="cll-sm">Phone calls are available to distributors and Merchsmith. You can still message people in Chats or book a phone meeting in Calendar.</p><div class="cll-row"><a class="pp-btn sm" href="Merchsmith Chats.html">Go to Chats</a><a class="pp-btn ghost sm" href="Merchsmith Calendar.html">Go to Calendar</a></div></div>'; return; }
    if(!me()) return;
    const S={tab:(location.hash.match(/tab=(\w+)/)||[])[1]||'history',filter:'all',q:'',dq:'',sel:null,play:null};
    const av=(p,s)=>p&&M().avatar?M().avatar(p,s):`<span class="cll-avph" style="width:${s}px;height:${s}px">${ic('phone',Math.round(s*.45))}</span>`;
    const OUT={answered:'Answered','no-answer':'No answer',missed:'Missed',voicemail:'Voicemail',forwarded:'Forwarded'};
    const dirIc=e=>e.outcome==='forwarded'?ic('xfer',16):e.outcome==='missed'?ic('miss',16):e.outcome==='voicemail'?ic('vm',16):ic(e.dir==='in'?'in':'out',16);
    const hm=location.hash.match(/dial(num)?=([^&]+)/); if(hm){ const v=decodeURIComponent(hm[2]); history.replaceState(null,'',location.pathname+location.search); setTimeout(()=>dial(hm[1]?{number:v}:{pid:v}),400); }
    function draw(){ const L=log(), vmN=L.filter(e=>e.outcome==='voicemail'&&!e.seen).length, mN=L.filter(e=>e.outcome==='missed'&&!e.seen).length;
      root.innerHTML=`<div class="cll-wrap">
        <aside class="cll-rail">
          <div class="cll-card"><h5>Make a call</h5>
            <div class="cll-dial"><input data-dq value="${esc(S.dq)}" placeholder="Name, company or number" autocomplete="off"><button class="cll-go" data-dgo aria-label="Call">${ic('phone',18)}</button></div>
            <div class="cll-res" data-dres></div>
            <div class="cll-kp">${'123456789*0#'.split('').map(d=>`<button data-kp="${d}">${d}</button>`).join('')}</div></div>
          <div class="cll-card"><h5>Your number</h5><div class="cll-num">${esc(myNumber())}</div><p class="cll-sm">${prefs().forward?'Rings here and on '+esc(prefs().forward)+'.':'Rings here in Merchsmith.'} ${prefs().fwdOn&&prefs().fwd1?'Unanswered calls forward to '+esc([prefs().fwd1,prefs().fwd2].filter(Boolean).map(id=>(person(id)||{name:''}).name.split(' ')[0]).join(', then ')+'.'):''} ${prefs().afterHours?'Outside your working hours calls go to voicemail.':''}</p></div>
          <div class="cll-card cll-test"><h5>Test an incoming call</h5><p class="cll-sm">Prototype only. Schedule a ring, then move to any page.</p><div class="cll-row"><button class="pp-btn ghost sm" data-ring="0">Ring now</button><button class="pp-btn ghost sm" data-ring="10">In 10 seconds</button></div></div>
        </aside>
        <section class="cll-main">
          <div class="cll-tabs">${[['history','History'+(mN?` <b>${mN}</b>`:'')],['voicemail','Voicemail'+(vmN?` <b>${vmN}</b>`:'')],['settings','Settings']].map(([k,l])=>`<button class="cll-tab${S.tab===k?' on':''}" data-ctab="${k}">${l}</button>`).join('')}</div>
          <div data-cbody></div></section></div>`;
      root.querySelectorAll('[data-ctab]').forEach(b=>b.onclick=()=>{ S.tab=b.dataset.ctab; history.replaceState(null,'','#tab='+S.tab); draw(); });
      const dq=root.querySelector('[data-dq]'); const res=()=>{ const q=S.dq.toLowerCase().trim(), cs=contacts();
        const hits=(q?cs.filter(c=>(c.name+' '+orgName(c)+' '+phoneOf(c)).toLowerCase().includes(q)||phoneOf(c).replace(/\D/g,'').includes(q.replace(/\D/g,'')||'§')):cs).slice(0,q?6:5);
        root.querySelector('[data-dres]').innerHTML=(q?'':'<em>People you can call</em>')+hits.map(c=>`<button class="cll-pr" data-dcall="${esc(c.id)}">${av(c,30)}<span><b>${esc(c.name)}</b><i>${esc(orgName(c))} · ${esc(phoneOf(c))}</i></span>${ic('phone',16)}</button>`).join('')
          +(q&&!hits.length&&/\d{5,}/.test(q.replace(/\s/g,''))?`<button class="cll-pr" data-dnum="${esc(S.dq)}"><span class="cll-avph" style="width:30px;height:30px">${ic('phone',14)}</span><span><b>Call ${esc(S.dq)}</b><i>Not in your contacts</i></span>${ic('phone',16)}</button>`:'');
        root.querySelectorAll('[data-dcall]').forEach(b=>b.onclick=()=>dial({pid:b.dataset.dcall}));
        root.querySelectorAll('[data-dnum]').forEach(b=>b.onclick=()=>dial({number:b.dataset.dnum})); };
      dq.oninput=()=>{ S.dq=dq.value; res(); }; dq.onkeydown=e=>{ if(e.key==='Enter') root.querySelector('[data-dgo]').click(); }; res();
      root.querySelector('[data-dgo]').onclick=()=>{ const q=S.dq.trim(); if(!q) return toast('Type a name, company or number'); const c=contacts().find(x=>x.name.toLowerCase()===q.toLowerCase()); dial(c?{pid:c.id}:{number:q}); };
      root.querySelectorAll('[data-kp]').forEach(b=>b.onclick=()=>{ S.dq+=b.dataset.kp; dq.value=S.dq; res(); });
      root.querySelectorAll('[data-ring]').forEach(b=>b.onclick=()=>{ const s=+b.dataset.ring; if(!s) return incoming(); scheduleRing(s); toast('A test call will ring in '+s+' seconds, on whichever page you’re on'); });
      const body=root.querySelector('[data-cbody]');
      if(S.tab==='settings') drawSettings(body); else drawList(body,L,S.tab==='voicemail');
      if(S.sel) drawDetail(S.sel);
    }
    function drawList(body,L,vmOnly){ let rows=vmOnly?L.filter(e=>e.outcome==='voicemail'):L;
      if(!vmOnly&&S.filter!=='all') rows=rows.filter(e=>S.filter==='missed'?e.outcome==='missed':S.filter==='rec'?e.rec:e.dir===S.filter&&e.outcome!=='missed');
      if(S.q){ const q=S.q.toLowerCase(); rows=rows.filter(e=>(e.name+' '+e.org+' '+e.number+' '+(e.summary||'')+' '+(e.notes||'')+' '+(e.project||'')).toLowerCase().includes(q)); }
      rows=rows.slice().sort((a,b)=>new Date(b.start)-new Date(a.start));
      const groups=[]; rows.forEach(e=>{ const k=new Date(e.start).toDateString(); let g=groups.find(x=>x[0]===k); if(!g) groups.push(g=[k,[]]); g[1].push(e); });
      const today=new Date().toDateString(), yest=new Date(Date.now()-864e5).toDateString();
      body.innerHTML=`<div class="cll-bar2">${vmOnly?'<p class="cll-sm" style="margin:0">Voicemails are recorded and transcribed automatically.</p>':`<div class="cll-seg">${[['all','All'],['in','Incoming'],['out','Outgoing'],['missed','Missed'],['rec','Recorded']].map(([k,l])=>`<button class="${S.filter===k?'on':''}" data-flt="${k}">${l}</button>`).join('')}</div>`}
          <input class="cll-search" data-q value="${esc(S.q)}" placeholder="Search name, company, number, notes or project"></div>
        ${groups.length?groups.map(([k,es])=>`<div class="cll-day"><h4>${k===today?'Today':k===yest?'Yesterday':fD(k,{weekday:'long',day:'numeric',month:'long'})}</h4>${es.map(e=>{ const p=person(e.pid);
          return `<button class="cll-r o-${e.outcome}${e.seen?'':' new'}${S.sel===e.id?' sel':''}" data-open="${esc(e.id)}"><span class="cll-dir">${dirIc(e)}</span>${av(p,34)}
            <span class="cll-ri"><b>${esc(e.name||e.number)}</b><i>${esc([e.org,e.number].filter(Boolean).join(' · '))}</i>${e.summary&&!vmOnly?`<em>${esc(e.summary)}</em>`:''}${e.outcome==='forwarded'?`<em>Answered by ${esc(e.answeredBy||'a colleague')}</em>`:''}${e.triedFwd&&e.triedFwd.length?`<em>No answer from ${esc(e.triedFwd.join(' or '))}</em>`:''}${vmOnly&&e.transcript?`<em>“${esc(e.transcript[e.transcript.length-1].text)}”</em>`:''}</span>
            <span class="cll-rm">${e.project?`<span class="cll-pill p">${esc(e.project)}</span>`:''}${e.rec?`<span class="cll-pill r" title="Recording saved">${ic('rec',8)} Rec</span>`:''}<span class="cll-pill o">${e.transfer?'Transferred':OUT[e.outcome]}</span></span>
            <span class="cll-rt"><b>${fT(e.start)}</b><i>${e.dur?mmss(e.dur):'—'}</i></span></button>`; }).join('')}</div>`).join('')
          :`<div class="cll-empty">${vmOnly?'No voicemails.':'No calls match.'}</div>`}`;
      body.querySelectorAll('[data-flt]').forEach(b=>b.onclick=()=>{ S.filter=b.dataset.flt; draw(); });
      const q=body.querySelector('[data-q]'); q.oninput=()=>{ S.q=q.value; const pos=q.selectionStart; draw(); const n=root.querySelector('[data-q]'); n.focus(); n.setSelectionRange(pos,pos); };
      body.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ S.sel=b.dataset.open; patch(S.sel,{seen:true}); draw(); });
    }
    function drawDetail(id){ const e=log().find(x=>x.id===id); if(!e){ S.sel=null; return; } const p=person(e.pid);
      let dr=document.getElementById('cllDrawer'); if(!dr){ dr=document.createElement('div'); dr.id='cllDrawer'; document.body.appendChild(dr); }
      const bars=Array.from({length:72},(_,i)=>20+((hash(e.id+i)%80))*(.55+.45*Math.sin(i/5)**2));
      const tr=e.transcript||[];
      dr.className='cll-drawer on'; dr.innerHTML=`<div class="cll-dscrim" data-dx></div><aside class="cll-dp" role="dialog" aria-label="Call details">
        <div class="cll-dh">${av(p,48)}<div><b>${esc(e.name||e.number)}</b><span>${esc([e.org,e.number].filter(Boolean).join(' · '))}</span></div><button class="cll-x" data-dx aria-label="Close">×</button></div>
        <div class="cll-dmeta"><span>${dirIc(e)} ${e.outcome==='voicemail'?'Voicemail':e.dir==='in'?'Incoming':'Outgoing'}${e.transfer?' · transferred to '+esc(e.transfer):''}${e.outcome==='forwarded'?' · forwarded, answered by '+esc(e.answeredBy||'a colleague'):''}${e.triedFwd&&e.triedFwd.length?' · forwarded to '+esc(e.triedFwd.join(', then '))+', no answer':''}</span><span>${fD(e.start,{weekday:'long',day:'numeric',month:'long'})} · ${fT(e.start)}</span><span>${e.dur?mmss(e.dur):OUT[e.outcome]}</span></div>
        <div class="cll-row" style="margin:12px 0 4px">${p||e.number?`<button class="pp-btn sm" data-back>${ic('phone',15)} Call back</button>`:''}${p&&M().openPerson?`<button class="pp-btn ghost sm" data-chat>Message</button>`:''}${p?`<a class="pp-btn ghost sm" href="Merchsmith Calendar.html${location.search}#tab=cal" data-book>Book a meeting</a>`:''}</div>
        ${e.rec?`<h5>Recording</h5><div class="cll-player"><button class="cll-play" data-play aria-label="Play">${ic(S.play&&S.play.id===e.id&&S.play.on?'pause':'play',18)}</button>
            <div class="cll-wave" data-wave>${bars.map((h,i)=>`<i style="height:${Math.round(h*.4)}px" data-wb="${i}"></i>`).join('')}</div><span class="cll-pt" data-pt>0:00 / ${mmss(e.dur)}</span></div>
            <p class="cll-sm">Prototype: there’s no audio. Recordings are kept for ${db().policy.retention>=365?db().policy.retention/365+' year'+(db().policy.retention>365?'s':''):db().policy.retention+' days'}.</p>`
          :e.outcome==='forwarded'?`<h5>Recording</h5><p class="cll-sm">Recorded. It’s in ${esc(e.answeredBy||'your colleague')}’s call history, as they took the call.</p>`
          :e.expired?`<h5>Recording</h5><p class="cll-sm">Deleted automatically under the retention policy.</p>`:e.recDeleted?`<h5>Recording</h5><p class="cll-sm">Recording deleted on ${fD(e.recDeleted,{day:'numeric',month:'short',year:'numeric'})}.</p>`:''}
        ${e.summary?`<h5>Summary <em>auto-generated</em></h5><p class="cll-sum">${esc(e.summary)}</p>`:''}
        <h5>Linked project</h5><select class="cll-sel" data-proj><option value="">None</option>${['Autumn Giveaways','Summer Event','Winter Welcome Packs','Staff Onboarding Kits'].map(x=>`<option${e.project===x?' selected':''}>${x}</option>`).join('')}</select>
        <h5>Notes</h5><textarea class="cll-notes" data-notes rows="3" placeholder="Add notes to this call">${esc(e.notes||'')}</textarea>
        ${tr.length?`<h5>Transcript</h5><div class="cll-tr">${tr.map((l,i)=>`<button class="cll-tl w-${l.who}" data-seek="${l.t}" data-li="${i}"><span>${mmss(l.t)}</span><b>${l.who==='sys'?'Announcement':l.who==='me'?'You':esc(first(p)||e.number)}</b><p>${esc(l.text)}</p></button>`).join('')}</div>`:''}
        ${e.rec?`<div class="cll-dfoot"><button class="pp-link" data-dl>Download recording</button><button class="pp-link danger" data-del>Delete recording</button></div>`:''}</aside>`;
      const close=()=>{ stop(); S.sel=null; dr.className='cll-drawer'; dr.innerHTML=''; draw(); };
      dr.querySelectorAll('[data-dx]').forEach(b=>b.onclick=close);
      const bk=dr.querySelector('[data-back]'); if(bk) bk.onclick=()=>{ close(); dial(p?{pid:p.id}:{number:e.number}); };
      const ch=dr.querySelector('[data-chat]'); if(ch) ch.onclick=()=>{ close(); M().openPerson(p.id); };
      dr.querySelector('[data-proj]').onchange=ev=>{ patch(e.id,{project:ev.target.value}); toast(ev.target.value?'Linked to '+ev.target.value:'Project link removed'); };
      const nt=dr.querySelector('[data-notes]'); nt.onchange=()=>{ patch(e.id,{notes:nt.value.trim()}); toast('Notes saved'); };
      const dl=dr.querySelector('[data-dl]'); if(dl) dl.onclick=()=>toast('Prototype: no audio file. Live, this downloads an MP3.');
      const de=dr.querySelector('[data-del]'); if(de) de.onclick=()=>{ if(!confirm('Delete this recording and its transcript? The call stays in your history.')) return; patch(e.id,{rec:false,transcript:null,recDeleted:new Date().toISOString()}); stop(); toast('Recording deleted'); drawDetail(e.id); };
      const pb=dr.querySelector('[data-play]'); if(pb){
        const paint=()=>{ const pos=S.play&&S.play.id===e.id?S.play.pos:0, f=pos/e.dur, n=Math.floor(f*72);
          dr.querySelectorAll('[data-wb]').forEach((b,i)=>b.classList.toggle('on',i<n)); const pt=dr.querySelector('[data-pt]'); if(pt) pt.textContent=mmss(pos)+' / '+mmss(e.dur);
          let cur=-1; tr.forEach((l,i)=>{ if(l.t<=pos) cur=i; }); dr.querySelectorAll('[data-li]').forEach(x=>x.classList.toggle('now',+x.dataset.li===cur&&pos>0)); };
        pb.onclick=()=>{ if(S.play&&S.play.id===e.id&&S.play.on){ stop(); } else { S.play={id:e.id,pos:S.play&&S.play.id===e.id?S.play.pos:0,on:true}; clearInterval(S.play.iv);
          S.play.iv=setInterval(()=>{ S.play.pos+=1; if(S.play.pos>=e.dur){ S.play.pos=e.dur; stop(); } paint(); },250); } pb.innerHTML=ic(S.play&&S.play.on?'pause':'play',18); };
        dr.querySelectorAll('[data-seek]').forEach(b=>b.onclick=()=>{ if(!S.play||S.play.id!==e.id) S.play={id:e.id,pos:0,on:false}; S.play.pos=+b.dataset.seek; paint(); });
        dr.querySelector('[data-wave]').onclick=ev=>{ const r=ev.currentTarget.getBoundingClientRect(); if(!S.play||S.play.id!==e.id) S.play={id:e.id,pos:0,on:false}; S.play.pos=Math.round((ev.clientX-r.left)/r.width*e.dur); paint(); };
        paint(); }
      function stop(){ if(S.play){ clearInterval(S.play.iv); S.play.on=false; } const b=dr.querySelector('[data-play]'); if(b) b.innerHTML=ic('play',18); }
    }
    function drawSettings(body){ const pr=prefs(), pol=db().policy, adm=isAdmin(), cols=contacts().filter(c=>c.org===me().org&&c.id!==me().id);
      body.innerHTML=`<div class="cll-set">
        <div class="cll-panel"><h3>Your line</h3>
          <div class="cll-kv"><span>Number</span><b>${esc(myNumber())}</b></div>
          <label class="cll-f"><span>Also ring my mobile</span><input data-pf="forward" value="${esc(pr.forward)}" placeholder="e.g. 07700 900123"></label>
          <label class="cll-chk"><input type="checkbox" data-pc="afterHours"${pr.afterHours?' checked':''}> Send calls to voicemail outside my <a href="Merchsmith Calendar.html${location.search}#tab=avail">working hours</a></label>
          <h4 class="cll-h4">Call forwarding</h4>
          <label class="cll-chk"><input type="checkbox" data-pc="fwdOn"${pr.fwdOn?' checked':''}> Forward calls I don’t answer to a colleague</label>
          <div class="cll-fw${pr.fwdOn?'':' off'}">
            <label class="cll-f"><span>Forward after</span><select data-pn="rings"${pr.fwdOn?'':' disabled'}>${[2,3,4,5,6,8].map(n=>`<option value="${n}"${+pr.rings===n?' selected':''}>${n} rings (about ${n*RING_MS/1000} seconds)</option>`).join('')}</select></label>
            <div class="cll-fwc"><span class="cll-step">1</span><label class="cll-f"><span>First try</span><select data-pf="fwd1"${pr.fwdOn?'':' disabled'}><option value="">Choose a colleague</option>${cols.map(c=>`<option value="${esc(c.id)}"${pr.fwd1===c.id?' selected':''}>${esc(c.name)}${c.title?' · '+esc(c.title):''}</option>`).join('')}</select></label></div>
            <div class="cll-fwc"><span class="cll-step">2</span><label class="cll-f"><span>If they don’t answer after ${pr.rings} rings, try</span><select data-pf="fwd2"${pr.fwdOn&&pr.fwd1?'':' disabled'}><option value="">No one else</option>${cols.filter(c=>c.id!==pr.fwd1).map(c=>`<option value="${esc(c.id)}"${pr.fwd2===c.id?' selected':''}>${esc(c.name)}${c.title?' · '+esc(c.title):''}</option>`).join('')}</select></label></div>
          </div>
          <label class="cll-chk"><input type="checkbox" data-pc="vm"${pr.vm?' checked':''}> If nobody answers, send the caller to voicemail</label>
          <p class="cll-sm" style="margin:0">${(()=>{ const ch=[pr.fwdOn&&pr.fwd1,pr.fwdOn&&pr.fwd2].filter(Boolean).map(id=>(person(id)||{name:''}).name.split(' ')[0]); return 'Rings you for '+pr.rings*RING_MS/1000+' seconds'+ch.map(n=>', then '+esc(n)+' for '+pr.rings*RING_MS/1000+' seconds').join('')+(pr.vm?', then voicemail.':', then the call is missed.'); })()}</p>
          <label class="cll-f"><span>Voicemail greeting</span><textarea data-pf="greeting" rows="2" placeholder="Hi, you’ve reached ${esc(me().name)}. Leave a message and I’ll call you back.">${esc(pr.greeting)}</textarea></label></div>
        <div class="cll-panel"><h3>Call recording</h3>
          <div class="cll-lock">${ic('rec',12)} <b>Every call is recorded</b><span>This is a platform setting and can’t be turned off.</span></div>
          ${adm?`<label class="cll-f"><span>Announcement played when a call connects</span><textarea data-pol="announce" rows="2">${esc(pol.announce)}</textarea></label>
            <label class="cll-f"><span>Keep recordings for</span><select data-pol="retention">${[[90,'90 days'],[180,'6 months'],[365,'1 year'],[730,'2 years'],[2190,'6 years']].map(([v,l])=>`<option value="${v}"${pol.retention==v?' selected':''}>${l}</option>`).join('')}</select></label>
            <p class="cll-sm">After this, recordings and transcripts are deleted automatically. The call record stays.</p>`
          :`<div class="cll-kv"><span>Announcement</span><b>“${esc(pol.announce)}”</b></div><div class="cll-kv"><span>Kept for</span><b>${pol.retention>=365?pol.retention/365+' year'+(pol.retention>365?'s':''):pol.retention+' days'}</b></div>`}
          <div class="cll-kv"><span>Who can play them</span><b>People on the call, and their organisation’s admins</b></div>
          <p class="cll-sm">Anyone on a call can ask for its recording to be deleted from the call’s details.</p></div></div>
        <p class="cll-sm" style="margin-top:14px">Prototype: no calls are placed and nothing is recorded. The live version uses a telephony provider (see HANDOVER.md).</p>`;
      body.querySelectorAll('[data-pf]').forEach(i=>i.onchange=()=>{ const p={[i.dataset.pf]:i.value.trim()}; if(i.dataset.pf==='fwd1'&&(!p.fwd1||p.fwd1===prefs().fwd2)) p.fwd2=''; setPrefs(p); toast('Saved'); draw(); });
      body.querySelectorAll('[data-pc]').forEach(c=>c.onchange=()=>{ const p={[c.dataset.pc]:c.checked}; if(c.dataset.pc==='fwdOn'&&c.checked&&!prefs().fwd1&&cols[0]) p.fwd1=cols[0].id; setPrefs(p); toast('Saved'); draw(); });
      body.querySelectorAll('[data-pn]').forEach(i=>i.onchange=()=>{ setPrefs({[i.dataset.pn]:+i.value}); toast('Saved'); draw(); });
      body.querySelectorAll('[data-pol]').forEach(i=>i.onchange=()=>{ const o=db(); o.policy[i.dataset.pol]=i.dataset.pol==='retention'?+i.value:(i.value.trim()||o.policy.announce); save(o); toast('Recording policy updated for the whole platform'); draw(); });
    }
    draw();
    window.addEventListener('ms-calls-change',()=>{ if(!document.querySelector('#cllDrawer.on')&&document.activeElement&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) draw(); });
    window.addEventListener('hashchange',()=>{ const t=(location.hash.match(/tab=(\w+)/)||[])[1]; if(t&&t!==S.tab){ S.tab=t; draw(); } });
  }

  const css=`
  .cll-ic{flex:none;display:block;}
  .cll-toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(14px);background:var(--ink);color:#fff;font-size:13.5px;font-weight:600;padding:11px 18px;border-radius:11px;opacity:0;transition:opacity .2s,transform .2s;z-index:1600;pointer-events:none;max-width:min(560px,90vw);text-align:center;} .cll-toast.on{opacity:1;transform:translateX(-50%);}
  .cll-bar{position:fixed;right:22px;bottom:22px;width:340px;max-width:calc(100vw - 28px);background:var(--ink);color:#fff;border-radius:18px;padding:16px;z-index:1500;box-shadow:0 18px 50px rgba(20,22,45,.35);display:none;flex-direction:column;gap:12px;font-family:var(--sans);}
  .cll-bar.on{display:flex;} .cll-bar.s-in-ring{animation:cllPulse 1.4s ease-in-out infinite;}
  @keyframes cllPulse{0%,100%{box-shadow:0 18px 50px rgba(20,22,45,.35),0 0 0 0 rgba(123,133,197,.55);}50%{box-shadow:0 18px 50px rgba(20,22,45,.35),0 0 0 10px rgba(123,133,197,0);}}
  .cll-bh{display:flex;align-items:center;gap:12px;} .cll-bn{flex:1;min-width:0;display:flex;flex-direction:column;} .cll-bn b{font-size:16px;} .cll-bn span{font-size:12.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cll-bs{display:flex;flex-direction:column;align-items:flex-end;gap:3px;} .cll-bs b{font-size:15px;font-variant-numeric:tabular-nums;} .cll-bs em{font-style:normal;font-size:12px;opacity:.8;}
  .cll-recdot{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#ff8a8a;} .cll-recdot svg{animation:cllBlink 1.2s steps(2) infinite;} @keyframes cllBlink{50%{opacity:.25;}}
  .cll-avph{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.12);color:inherit;flex:none;}
  .cll-bact{display:flex;gap:8px;} .cll-rb{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font:inherit;font-size:12px;font-weight:700;border:0;border-radius:12px;padding:10px 6px;cursor:pointer;background:rgba(255,255,255,.12);color:#fff;}
  .cll-rb.ans{background:#2f9e62;} .cll-rb.dec{background:#d2434d;} .cll-rb.wide{flex-direction:row;justify-content:center;gap:8px;font-size:13.5px;}
  .cll-bnote{margin:0;font-size:11.5px;opacity:.7;line-height:1.45;}
  .cll-ctl{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;} .cll-ctl button{display:flex;flex-direction:column;align-items:center;gap:4px;font:inherit;font-size:11px;font-weight:700;border:0;border-radius:11px;padding:9px 2px;cursor:pointer;background:rgba(255,255,255,.1);color:#fff;} .cll-ctl button.on{background:#fff;color:var(--ink);}
  .cll-bpad code{display:block;text-align:center;font-size:18px;letter-spacing:.15em;margin-bottom:6px;} .cll-bpad>div{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;} .cll-bpad button{font:inherit;font-size:17px;font-weight:700;border:0;border-radius:10px;padding:8px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;}
  .cll-bx{display:flex;flex-direction:column;gap:4px;max-height:170px;overflow:auto;} .cll-bx em{font-style:normal;font-size:12px;opacity:.75;} .cll-bx span{font-size:12.5px;opacity:.75;} .cll-bx button{display:flex;align-items:center;gap:8px;font:inherit;font-size:13px;border:0;border-radius:9px;background:rgba(255,255,255,.08);color:#fff;padding:6px 8px;cursor:pointer;text-align:left;}
  .cll-bnotes{font:inherit;font-size:13px;border:0;border-radius:10px;padding:9px 10px;resize:vertical;}
  .cll-wrap{display:grid;grid-template-columns:300px minmax(0,1fr);gap:18px;align-items:start;margin-top:22px;} @media(max-width:960px){.cll-wrap{grid-template-columns:1fr;}}
  .cll-rail{display:flex;flex-direction:column;gap:12px;}
  .cll-card{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:14px;} .cll-card h5{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);}
  .cll-dial{display:flex;gap:6px;} .cll-dial input{flex:1;min-width:0;font:inherit;font-size:15px;border:1.5px solid var(--line-soft);border-radius:11px;padding:10px 12px;}
  .cll-go{width:46px;border:0;border-radius:11px;background:#2f9e62;color:#fff;display:grid;place-items:center;cursor:pointer;}
  .cll-res{display:flex;flex-direction:column;margin:8px 0;} .cll-res em{font-style:normal;font-size:11.5px;color:var(--muted);margin:2px 0 4px;}
  .cll-pr{display:flex;align-items:center;gap:9px;border:0;background:none;font:inherit;text-align:left;padding:6px 4px;border-radius:9px;cursor:pointer;color:var(--ink);} .cll-pr:hover{background:var(--paper);} .cll-pr>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column;} .cll-pr b{font-size:13px;} .cll-pr i{font-style:normal;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .cll-pr>svg{color:#2f9e62;}
  .cll-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;} .cll-kp button{font:inherit;font-size:17px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;border-radius:11px;padding:9px;cursor:pointer;} .cll-kp button:hover{background:var(--paper);}
  .cll-num{font-size:19px;font-weight:800;letter-spacing:.02em;} .cll-sm{font-size:12.5px;color:var(--text-soft);line-height:1.5;margin:6px 0 0;} .cll-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
  .cll-test{background:var(--paper);border-style:dashed;}
  .cll-main{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:0 18px 16px;min-width:0;}
  .cll-tabs{display:flex;gap:4px;border-bottom:1px solid var(--line-soft);margin:0 -18px 14px;padding:0 10px;overflow-x:auto;scrollbar-width:none;}
  .cll-tab{white-space:nowrap;flex:none;border:0;background:none;font:inherit;font-size:14.5px;font-weight:700;color:var(--ink-3);padding:13px 14px;cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px;display:flex;align-items:center;gap:7px;} .cll-tab.on{color:var(--periwinkle-deep);border-bottom-color:var(--periwinkle-deep);}
  .cll-tab b{background:var(--flare);color:#fff;font-size:10.5px;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;}
  .cll-bar2{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
  .cll-seg{display:flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;} .cll-seg button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:7px 12px;cursor:pointer;white-space:nowrap;} .cll-seg button+button{border-left:1.5px solid var(--line-soft);} .cll-seg button.on{background:var(--ink);color:#fff;}
  .cll-search{flex:1;min-width:200px;font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;}
  .cll-day h4{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin:16px 0 4px;}
  .cll-r{display:flex;align-items:center;gap:12px;width:100%;border:0;border-top:1px solid var(--paper-2);background:none;font:inherit;text-align:left;padding:11px 6px;cursor:pointer;color:var(--ink);} .cll-r:hover,.cll-r.sel{background:var(--paper);}
  .cll-dir{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:var(--tint-peri);color:var(--periwinkle-deep);flex:none;} .cll-r.o-missed .cll-dir{background:var(--tint-red);color:#b4232c;} .cll-r.o-voicemail .cll-dir{background:#fbeccd;color:#9a6b1f;} .cll-r.o-no-answer .cll-dir{background:var(--paper-2);color:var(--muted);}
  .cll-ri{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;} .cll-ri b{font-size:14px;} .cll-r.new .cll-ri b::after{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--flare);margin-left:7px;vertical-align:middle;}
  .cll-r.o-missed .cll-ri b{color:#b4232c;} .cll-ri i{font-style:normal;font-size:12px;color:var(--muted);} .cll-ri em{font-style:normal;font-size:12.5px;color:var(--text-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .cll-rm{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:260px;} @media(max-width:720px){.cll-rm{display:none;}}
  .cll-pill{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:6px;padding:3px 7px;background:var(--paper-2);color:var(--ink-3);white-space:nowrap;} .cll-pill.r{background:var(--tint-red);color:#b4232c;} .cll-pill.p{background:var(--tint-peri);color:var(--periwinkle-ink);text-transform:none;letter-spacing:0;}
  .cll-rt{width:58px;text-align:right;display:flex;flex-direction:column;} .cll-rt b{font-size:13px;} .cll-rt i{font-style:normal;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;}
  .cll-empty{padding:40px;text-align:center;color:var(--muted);font-size:14px;}
  .cll-drawer{position:fixed;inset:0;z-index:1400;display:none;} .cll-drawer.on{display:block;} .cll-dscrim{position:absolute;inset:0;background:rgba(20,22,45,.28);}
  .cll-dp{position:absolute;top:0;right:0;bottom:0;width:min(520px,100%);background:#fff;overflow:auto;padding:22px 24px 30px;box-shadow:-12px 0 40px rgba(20,22,45,.18);}
  .cll-dh{display:flex;align-items:center;gap:12px;} .cll-dh>div{flex:1;display:flex;flex-direction:column;} .cll-dh b{font-family:var(--serif);font-weight:500;font-size:24px;} .cll-dh span{font-size:13px;color:var(--muted);} .cll-x{border:0;background:none;font-size:26px;color:var(--muted);cursor:pointer;}
  .cll-dmeta{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:12px;font-size:13px;color:var(--ink-2);} .cll-dmeta span{display:inline-flex;align-items:center;gap:6px;}
  .cll-dp h5{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:20px 0 8px;} .cll-dp h5 em{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);margin-left:4px;}
  .cll-player{display:flex;align-items:center;gap:12px;background:var(--paper);border-radius:14px;padding:10px 12px;}
  .cll-play{width:40px;height:40px;border-radius:50%;border:0;background:var(--periwinkle-deep);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;}
  .cll-wave{flex:1;display:flex;align-items:center;gap:2px;height:40px;cursor:pointer;min-width:0;} .cll-wave i{flex:1;min-width:1px;background:var(--line);border-radius:2px;} .cll-wave i.on{background:var(--periwinkle-deep);}
  .cll-pt{font-size:12px;font-variant-numeric:tabular-nums;color:var(--ink-3);white-space:nowrap;}
  .cll-sum{margin:0;font-size:14px;line-height:1.55;background:var(--tint-peri);color:var(--periwinkle-ink);border-radius:12px;padding:12px 14px;}
  .cll-sel,.cll-notes{width:100%;font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;} .cll-notes{resize:vertical;}
  .cll-tr{display:flex;flex-direction:column;gap:2px;} .cll-tl{display:grid;grid-template-columns:44px 90px 1fr;gap:8px;border:0;background:none;font:inherit;text-align:left;padding:7px 6px;border-radius:9px;cursor:pointer;color:var(--ink);} .cll-tl:hover{background:var(--paper);} .cll-tl.now{background:var(--tint-peri);}
  .cll-tl span{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums;padding-top:2px;} .cll-tl b{font-size:12.5px;} .cll-tl p{margin:0;font-size:13.5px;line-height:1.45;} .cll-tl.w-me b{color:var(--periwinkle-deep);} .cll-tl.w-sys p,.cll-tl.w-sys b{color:var(--muted);font-style:italic;}
  .cll-dfoot{display:flex;justify-content:space-between;margin-top:22px;padding-top:14px;border-top:1px solid var(--paper-2);} .cll-dfoot .danger{color:#b4232c;}
  .cll-fwd{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.08);border-radius:11px;padding:9px 11px;font-size:13px;} .cll-fwd b{font-weight:800;}
  .cll-h4{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);margin:8px 0 0;}
  .cll-fw{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:12px;background:var(--paper);} .cll-fw.off{opacity:.55;}
  .cll-fwc{display:grid;grid-template-columns:26px 1fr;gap:10px;align-items:end;} .cll-step{width:26px;height:26px;border-radius:50%;background:var(--periwinkle-deep);color:#fff;font-size:12.5px;font-weight:800;display:grid;place-items:center;margin-bottom:7px;}
  .cll-set{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;}
  .cll-panel{border:1px solid var(--line-soft);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:12px;} .cll-panel h3{font-family:var(--serif);font-weight:500;font-size:21px;margin:0;}
  .cll-kv{display:grid;grid-template-columns:130px 1fr;gap:10px;font-size:13.5px;} .cll-kv span{color:var(--muted);font-weight:700;font-size:12.5px;}
  .cll-f{display:flex;flex-direction:column;gap:5px;} .cll-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .cll-f input,.cll-f textarea,.cll-f select{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;}
  .cll-chk{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--ink-2);}
  .cll-lock{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:center;background:var(--tint-red);color:#b4232c;border-radius:12px;padding:11px 13px;} .cll-lock b{font-size:14px;} .cll-lock span{grid-column:2;font-size:12.5px;color:var(--ink-2);}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { mount, dial, incoming, unseen, phoneOf };
})();
