/* ============================================================
   product-notes.js — per-product NOTES, TEAM COMMENTS and HISTORY,
   shared by Platform Admin and the Distributor.

   Scoping rule (decided Sep 2026): notes and comments are
   **fully private to the org that wrote them** — Merchsmith never
   sees a distributor's notes and vice versa. Every record carries
   an `org` key and reads are filtered by it, so the two never mix.
   The composer says so on screen; do not "helpfully" widen this.

   Notes vs comments are deliberately SEPARATE:
     · Notes    — standing facts about the product, pinned, editable,
                  no replies. "Supplier confirmed 6-week lead in Aug."
     · Comments — a dated discussion thread, append-only.

   History is a MERGED read-only feed, not its own store. It reads:
     · MSCAT.curLog()   recommended-range add / remove / tier
     · MSCAT.importLog() feed imports
     · MSOV             distributor field overrides
     · its own event log (data edits, range moves, price changes)
   …so events logged elsewhere appear here automatically.

   window.MSNOTES:
     org()                     'merchsmith' | 'distributor'
     notes(id) / comments(id)  org-scoped, newest first
     addNote / editNote / deleteNote / addComment
     history(id)               merged, newest first
     log(id, type, text)       record an event
     count(id)                 notes + comments for the current org
     panelHTML(id, opts)       the whole UI as a string
     wire(root, id, onChange)  bind it
   ============================================================ */
window.MSNOTES=(function(){
  const KEY='ms-product-notes';     // {id:{notes:[],comments:[]}}
  const EKEY='ms-product-events';   // {id:[{at,type,text,org,who}]}
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const load=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'{}')||{}; }catch(e){ return {}; } };
  const save=(k,o)=>{ try{ localStorage.setItem(k,JSON.stringify(o)); }catch(e){} };

  /* ---------- who and where ---------- */
  function org(){
    // The operator console has its own login and does not drive the "Viewing as"
    // pill, so MS_SCOPE decides first — MSID would otherwise report 'distributor'
    // there and file Merchsmith's private notes into the distributor's thread.
    if(window.MS_SCOPE==='platform') return 'merchsmith';
    const r=(window.MSID&&MSID.current&&MSID.current())||'distributor';
    // 'admin' is the real MSID key for the Merchsmith operator identity
    return (r==='admin'||r==='platform'||r==='merchsmith') ? 'merchsmith'
         : r==='supplier' ? 'supplier' : r==='customer' ? 'customer' : 'distributor';
  }
  const ORGNAME={merchsmith:'Merchsmith',distributor:'Mojo Promotions',customer:'Citrix',supplier:'BagWorks UK'};
  function me(){
    const id=(window.MSID&&MSID.get&&MSID.get())||{};
    return {name:id.who||id.user||id.name||'You', role:id.role||''};
  }
  // the signed-in person's team: found in the seeded org data where possible,
  // otherwise a sensible default for their organisation
  function myTeam(){
    const n=String(me().name).toLowerCase(), OD=window.ORG_DATA||{}, o=org();
    const inTeams=ts=>{ for(const t of (ts||[])) if((t.users||[]).some(u=>String(u.n||u.name||'').toLowerCase()===n)) return t.name; return ''; };
    let t='';
    if(o==='distributor') t=inTeams(OD.mojoTeams);
    if(o==='customer') (OD.customers||[]).some(c=>(t=inTeams(c.teams)));
    return t||{merchsmith:'Operations',distributor:'Account Management',customer:'Marketing',supplier:'Sales'}[o];
  }
  // who can read an entry: always same org; then only-me / my team / whole org
  const VISLBL={me:'Only me',team:'My team',org:'Whole organisation'};
  function canSee(x){
    if(x.org!==org()) return false;
    const v=x.vis||'org';
    if(v==='me') return x.who===me().name;
    if(v==='team') return !x.team||x.team===myTeam()||x.who===me().name;
    return true;
  }
  const visText=v=>v==='me'?'Only you':v==='team'?myTeam()+' team':ORGNAME[org()];
  // teammates available to @mention — same org only
  function team(){
    const o=org();
    if(o==='merchsmith') return ['Priya Raman','Tom Whitfield','Sana Iqbal','Dan Okafor'];
    return ['Mara Whitfield','Alex Stone','Jon Reeve','Priya Shah','Cal Docherty'];
  }
  function fmt(iso){ const d=new Date(iso); if(isNaN(d)) return '';
    const now=new Date(), day=86400000, diff=(now-d)/day;
    const t=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    if(diff<1&&now.getDate()===d.getDate()) return 'Today, '+t;
    if(diff<2) return 'Yesterday, '+t;
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:d.getFullYear()===now.getFullYear()?undefined:'numeric'})+', '+t;
  }
  // @mentions become chips; everything else is escaped first
  function rich(text){
    const names=team();
    let h=esc(text);
    names.forEach(n=>{ const re=new RegExp('@'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g');
      h=h.replace(re,'<span class="pn-at">@'+esc(n)+'</span>'); });
    return h.replace(/\n/g,'<br>');
  }

  /* ---------- store ---------- */
  function rec(id){ const o=load(KEY); return o[id]||{notes:[],comments:[]}; }
  function put(id,r){ const o=load(KEY); o[id]=r; save(KEY,o); }
  const mineOnly=a=>(a||[]).filter(canSee);
  function notes(id){ return mineOnly(rec(id).notes).slice().sort((a,b)=>new Date(b.at)-new Date(a.at)); }
  function comments(id){ return mineOnly(rec(id).comments).slice().sort((a,b)=>new Date(a.at)-new Date(b.at)); }
  function count(id){ return notes(id).length+comments(id).length; }

  function addNote(id,text,vis){
    const t=String(text||'').trim(); if(!t) return null;
    const r=rec(id); r.notes=r.notes||[];
    const u=me(), e={nid:'n'+Date.now()+Math.random().toString(36).slice(2,6),at:new Date().toISOString(),
      text:t,org:org(),who:u.name,role:u.role,vis:vis||'org',team:myTeam()};
    r.notes.push(e); put(id,r); log(id,'note','added a note'); return e;
  }
  function editNote(id,nid,text){
    const r=rec(id); const n=(r.notes||[]).find(x=>x.nid===nid&&x.org===org()&&x.who===me().name); if(!n) return;
    n.text=String(text||'').trim(); n.edited=new Date().toISOString(); put(id,r); log(id,'note','edited a note');
  }
  function deleteNote(id,nid){
    const r=rec(id); r.notes=(r.notes||[]).filter(x=>!(x.nid===nid&&x.org===org()&&x.who===me().name)); put(id,r); log(id,'note','deleted a note');
  }
  function addComment(id,text,vis){
    const t=String(text||'').trim(); if(!t) return null;
    const r=rec(id); r.comments=r.comments||[];
    const u=me(), e={at:new Date().toISOString(),text:t,org:org(),who:u.name,role:u.role,vis:vis||'org',team:myTeam()};
    r.comments.push(e); put(id,r); log(id,'comment','commented'); return e;
  }

  /* ---------- events ---------- */
  function log(id,type,text){
    const o=load(EKEY); const l=o[id]=o[id]||[];
    l.unshift({at:new Date().toISOString(),type,text,org:org(),who:me().name});
    o[id]=l.slice(0,200); save(EKEY,o);
  }
  const ICON={import:'⤓',data:'✎',range:'★',dist:'◧',price:'£',note:'✎',comment:'💬',override:'◧'};
  // merged, newest first. Other-org entries are kept ONLY where they are a
  // platform-level fact (imports, curation); their notes never leak.
  // Entity keys are "org:<orgKey>" and "user:<orgKey>:<userKey>". Their change
  // history comes from the people audit log (people.js), so edits, role changes,
  // invites and deactivations made anywhere show up here without extra wiring.
  const isEntity=id=>String(id).indexOf(':')>0;
  function entityHistory(id){
    if(!window.MSPEOPLE||!MSPEOPLE.audit) return [];
    const [kind,orgKey,...rest]=String(id).split(':'), uk=rest.join(':');
    const LBL=MSPEOPLE.LBL||{};
    return MSPEOPLE.audit({org:orgKey}).filter(e=>kind==='org'||e.ukey===uk).map(e=>({
      at:e.at,type:'data',who:e.actor,mine:true,
      text:(LBL[e.action]||e.action).toLowerCase()+(kind==='org'&&e.user?' — '+e.user:'')+(e.detail?' ('+e.detail+')':'')}));
  }
  function history(id){
    const out=[]; const o=org();
    (load(EKEY)[id]||[]).forEach(e=>{
      const priv=e.type==='note'||e.type==='comment';
      if(priv&&e.org!==o) return;
      out.push({at:e.at,type:e.type,text:e.text,who:e.who,mine:e.org===o});
    });
    if(isEntity(id)) return out.concat(entityHistory(id)).filter(e=>e.at).sort((a,b)=>new Date(b.at)-new Date(a.at));
    if(window.MSCAT&&MSCAT.curLog){
      const ACT={proposed:'proposed for the Recommended range',approved:'went live in the Recommended range',
        declined:'declined for the Recommended range',tier:'moved tier in the Recommended range',
        removed:'withdrawn from the Recommended range'};
      MSCAT.curLog().filter(e=>e.id===id).forEach(e=>
        out.push({at:e.at,type:'range',text:(ACT[e.act]||e.act)+(e.tier?' ('+(e.tier==='featured'?'Featured':'Recommended')+')':''),who:'Merchsmith',mine:o==='merchsmith'}));
    }
    const p=window.MSCAT&&MSCAT.get?MSCAT.get(id):null;
    if(p&&p.imported) out.push({at:p.imported,type:'import',text:'imported from the '+(p.supplier||'supplier')+' feed',who:'Merchsmith',mine:o==='merchsmith'});
    if(p&&p.created&&p.created!==p.imported) out.push({at:p.created,type:'import',text:'created in the catalogue',who:'Merchsmith',mine:o==='merchsmith'});
    // distributor field overrides — only the distributor sees these
    if(o!=='merchsmith'&&window.MSOV){
      const r=MSOV.get(id)||{}; const ks=Object.keys(r.fields||{});
      if(ks.length&&r.updated) out.push({at:isoOf(r.updated),type:'override',
        text:'overrode '+ks.length+' field'+(ks.length===1?'':'s')+' ('+ks.slice(0,3).join(', ')+(ks.length>3?'…':'')+')',who:me().name,mine:true});
    }
    if(o!=='merchsmith'&&window.MSCAT&&MSCAT.distAddedOn){
      const d=MSCAT.distAddedOn(id);
      if(d) out.push({at:isoOf(d),type:'dist',text:'added to your range',who:me().name,mine:true});
    }
    return out.filter(e=>e.at).sort((a,b)=>new Date(b.at)-new Date(a.at));
  }
  // MSOV stamps en-GB dd/mm/yyyy, which Date() misreads
  function isoOf(s){ if(!s) return ''; if(/^\d{4}-/.test(s)) return s;
    const m=String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m?new Date(+m[3],+m[2]-1,+m[1]).toISOString():s; }

  /* ---------- UI ---------- */
  function panelHTML(id,opts){
    opts=opts||{}; const tab=opts.tab||'notes';
    const ns=notes(id), cs=comments(id), hs=history(id);
    const ent=isEntity(id), subj=!ent?'this product':String(id).indexOf('user:')===0?'this person':'this organisation';
    const who=ORGNAME[org()];
    const lock='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/></svg>';
    // products stay org-wide; people and organisations choose who can read each entry
    const visSel=k=>ent?`<label class="pn-vis">${lock}<select data-pnvis="${k}">
        <option value="me">Only me</option>
        <option value="team">My team · ${esc(myTeam())}</option>
        <option value="org" selected>Whole organisation · ${esc(who)}</option></select></label>`
      :`<p class="pn-priv">${lock}Visible to ${esc(who)} only</p>`;
    const badge=x=>ent?`<span class="pn-vb v-${esc(x.vis||'org')}">${esc(visText(x.vis||'org'))}</span>`:'';
    const mine=x=>x.who===me().name;
    return `<div class="pn" data-pn="${esc(id)}">
      <div class="pn-tabs" role="tablist">
        <button class="pn-tab ${tab==='notes'?'on':''}" data-pntab="notes">Notes${ns.length?` <i>${ns.length}</i>`:''}</button>
        <button class="pn-tab ${tab==='comments'?'on':''}" data-pntab="comments">Comments${cs.length?` <i>${cs.length}</i>`:''}</button>
        <button class="pn-tab ${tab==='history'?'on':''}" data-pntab="history">History</button>
      </div>
      <div class="pn-body">
        <div class="pn-pane" data-pnpane="notes" ${tab==='notes'?'':'hidden'}>
          ${ent?'':visSel('note')}
          ${ns.length?`<ul class="pn-notes">${ns.map(n=>`<li data-pnid="${esc(n.nid)}">
            <div class="pn-ntx">${rich(n.text)}</div>
            <div class="pn-nmeta"><b>${esc(n.who)}</b>${n.role?` · ${esc(n.role)}`:''} · ${fmt(n.at)}${n.edited?' · edited':''}${badge(n)}
              ${mine(n)?`<span class="pn-nacts"><button data-pnedit="${esc(n.nid)}">Edit</button><button data-pndel="${esc(n.nid)}">Delete</button></span>`:''}</div>
          </li>`).join('')}</ul>`:`<p class="pn-empty">No notes yet. Notes are standing facts about ${subj} that the team should know.</p>`}
          <div class="pn-compose"><textarea data-pnnew="note" rows="2" placeholder="Add a note… use @ to mention a teammate"></textarea>
            <div class="pn-cacts">${ent?visSel('note'):'<span class="pn-hint">@ mentions your team</span>'}<button class="pn-post" data-pnpost="note">Add note</button></div></div>
        </div>
        <div class="pn-pane" data-pnpane="comments" ${tab==='comments'?'':'hidden'}>
          ${ent?'':visSel('comment')}
          ${cs.length?`<ul class="pn-thread">${cs.map(c=>`<li><span class="pn-av">${esc((c.who||'?').split(' ').map(x=>x[0]).join('').slice(0,2))}</span>
            <div><div class="pn-cmeta"><b>${esc(c.who)}</b>${c.role?` <em>${esc(c.role)}</em>`:''}<span>${fmt(c.at)}</span>${badge(c)}</div>
            <div class="pn-ctx">${rich(c.text)}</div></div></li>`).join('')}</ul>`:`<p class="pn-empty">No comments yet. Start a discussion your team can pick up.</p>`}
          <div class="pn-compose"><textarea data-pnnew="comment" rows="2" placeholder="Write a comment… use @ to mention a teammate"></textarea>
            <div class="pn-cacts">${ent?visSel('comment'):'<span class="pn-hint">@ mentions your team</span>'}<button class="pn-post" data-pnpost="comment">Comment</button></div></div>
        </div>
        <div class="pn-pane" data-pnpane="history" ${tab==='history'?'':'hidden'}>
          ${hs.length?`<ul class="pn-hist">${hs.map(e=>`<li><span class="pn-hi ${esc(e.type)}">${ICON[e.type]||'•'}</span>
            <div><div class="pn-htx"><b>${esc(e.who||'—')}</b> ${esc(e.text)}</div><div class="pn-hat">${fmt(e.at)}</div></div></li>`).join('')}</ul>`
          :`<p class="pn-empty">No recorded changes yet.</p>`}
        </div>
      </div>
    </div>`;
  }

  function wire(root,id,onChange){
    if(!root) return;
    const pn=root.querySelector('[data-pn]'); if(!pn) return;
    const redraw=tab=>{ const host=pn.parentNode;
      host.innerHTML=panelHTML(id,{tab}); wire(host,id,onChange); if(onChange) onChange(); };
    pn.querySelectorAll('[data-pntab]').forEach(b=>b.onclick=()=>{
      pn.querySelectorAll('[data-pntab]').forEach(x=>x.classList.toggle('on',x===b));
      pn.querySelectorAll('[data-pnpane]').forEach(x=>x.hidden=x.dataset.pnpane!==b.dataset.pntab); });
    pn.querySelectorAll('[data-pnpost]').forEach(b=>b.onclick=()=>{
      const kind=b.dataset.pnpost;
      const ta=pn.querySelector('[data-pnnew="'+kind+'"]'); const v=ta.value.trim(); if(!v) return;
      const vs=pn.querySelector('[data-pnvis="'+kind+'"]'), vis=vs?vs.value:'org';
      if(kind==='note') addNote(id,v,vis); else addComment(id,v,vis);
      redraw(kind==='note'?'notes':'comments');
    });
    pn.querySelectorAll('[data-pnedit]').forEach(b=>b.onclick=()=>{
      const li=b.closest('[data-pnid]'); const cur=notes(id).find(n=>n.nid===b.dataset.pnedit); if(!cur) return;
      li.querySelector('.pn-ntx').innerHTML=`<textarea class="pn-editbox" rows="2">${esc(cur.text)}</textarea>
        <div class="pn-cacts"><button class="pn-post sm" data-pnsave>Save</button><button class="pn-link" data-pncancel>Cancel</button></div>`;
      const box=li.querySelector('.pn-editbox'); box.focus();
      li.querySelector('[data-pnsave]').onclick=()=>{ editNote(id,cur.nid,box.value); redraw('notes'); };
      li.querySelector('[data-pncancel]').onclick=()=>redraw('notes');
    });
    pn.querySelectorAll('[data-pndel]').forEach(b=>b.onclick=()=>{
      if(!confirm('Delete this note? It cannot be recovered.')) return;
      deleteNote(id,b.dataset.pndel); redraw('notes');
    });
    // @mention autocomplete
    pn.querySelectorAll('[data-pnnew]').forEach(ta=>{
      ta.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){
        const kind=ta.dataset.pnnew; const vs=pn.querySelector('[data-pnvis="'+kind+'"]'), vis=vs?vs.value:'org';
        if(ta.value.trim()){ if(kind==='note') addNote(id,ta.value,vis); else addComment(id,ta.value,vis); redraw(kind==='note'?'notes':'comments'); } } });
      ta.addEventListener('input',()=>{
        const m=ta.value.slice(0,ta.selectionStart).match(/@([\w ]*)$/);
        let menu=pn.querySelector('.pn-mentions');
        if(!m){ if(menu) menu.remove(); return; }
        const q=m[1].toLowerCase(), hits=team().filter(n=>n.toLowerCase().includes(q)).slice(0,5);
        if(!hits.length){ if(menu) menu.remove(); return; }
        if(!menu){ menu=document.createElement('div'); menu.className='pn-mentions'; ta.parentNode.appendChild(menu); }
        menu.innerHTML=hits.map(n=>`<button data-pnm="${esc(n)}">${esc(n)}</button>`).join('');
        menu.querySelectorAll('[data-pnm]').forEach(b=>b.onclick=()=>{
          const before=ta.value.slice(0,ta.selectionStart).replace(/@([\w ]*)$/,'@'+b.dataset.pnm+' ');
          ta.value=before+ta.value.slice(ta.selectionStart); menu.remove(); ta.focus(); });
      });
    });
  }

  /* ---------- styles ---------- */
  const css=`
  .pn-tabs{display:flex;gap:2px;background:var(--paper-2);border-radius:999px;padding:3px;margin-bottom:12px;}
  .pn-tab{flex:1;font-family:var(--sans);font-size:12px;font-weight:800;color:var(--ink-3);background:none;border:0;border-radius:999px;padding:7px 10px;cursor:pointer;}
  .pn-tab.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.14);}
  .pn-tab i{font-style:normal;font-size:10px;background:var(--periwinkle-deep);color:#fff;border-radius:999px;padding:1px 6px;margin-left:3px;}
  .pn-tab.on i{background:var(--periwinkle-deep);}
  .pn-priv{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--ink-3);margin:0 0 10px;}
  .pn-priv svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.8;}
  .pn-empty{font-size:12.5px;color:var(--ink-3);line-height:1.55;margin:0 0 12px;}
  .pn-notes,.pn-thread,.pn-hist{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:9px;}
  .pn-notes li{background:var(--paper);border:1px solid var(--line-soft);border-left:3px solid var(--zest,#FFEB3D);border-radius:10px;padding:10px 12px;}
  .pn-ntx{font-size:13px;color:var(--ink);line-height:1.5;}
  .pn-nmeta{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10.5px;color:var(--ink-3);font-weight:700;margin-top:6px;}
  .pn-nacts{margin-left:auto;display:flex;gap:8px;}
  .pn-nacts button{font:inherit;font-size:10.5px;font-weight:800;color:var(--periwinkle-deep);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;}
  .pn-nacts button[data-pndel]{color:var(--flare);}
  .pn-thread li{display:flex;gap:9px;}
  .pn-av{width:26px;height:26px;border-radius:50%;background:var(--periwinkle);color:#fff;font-size:10px;font-weight:800;display:grid;place-items:center;flex:none;}
  .pn-cmeta{display:flex;align-items:baseline;gap:7px;font-size:11px;color:var(--ink-3);font-weight:700;margin-bottom:2px;}
  .pn-cmeta b{font-size:12.5px;color:var(--ink);}
  .pn-cmeta em{font-style:normal;font-size:10px;}
  .pn-ctx{font-size:13px;color:var(--ink-2);line-height:1.5;background:var(--paper);border:1px solid var(--line-soft);border-radius:10px;padding:8px 11px;}
  .pn-at{background:var(--tint-peri,#eceefb);color:var(--periwinkle-deep);border-radius:5px;padding:0 4px;font-weight:700;}
  .pn-hist li{display:flex;gap:9px;align-items:flex-start;}
  .pn-hi{width:22px;height:22px;border-radius:50%;background:var(--paper-2);color:var(--ink-3);font-size:11px;display:grid;place-items:center;flex:none;}
  .pn-hi.range{background:var(--tint-peri,#eceefb);color:var(--periwinkle-deep);}
  .pn-hi.import{background:var(--tint-green,#e2f6ef);color:var(--green-deep,#1c7a5e);}
  .pn-hi.override,.pn-hi.dist{background:rgba(255,235,61,.35);color:#7a6400;}
  .pn-htx{font-size:12.5px;color:var(--ink-2);line-height:1.45;}
  .pn-htx b{color:var(--ink);}
  .pn-hat{font-size:10.5px;color:var(--ink-3);font-weight:700;}
  .pn-vis{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:var(--ink-3);}
  .pn-vis svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.8;flex:none;}
  .pn-vis select{font-family:var(--sans);font-size:11.5px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:8px;padding:5px 7px;cursor:pointer;max-width:210px;}
  .pn-vis select:focus{outline:0;border-color:var(--periwinkle);}
  .pn-vb{font-size:9.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:1px 7px;white-space:nowrap;background:var(--paper-2);color:var(--ink-3);}
  .pn-vb.v-me{background:rgba(255,46,23,.1);color:#b3240f;}
  .pn-vb.v-team{background:var(--tint-peri,#eceefb);color:var(--periwinkle-deep);}
  .pn-compose{position:relative;}
  .pn-compose textarea{width:100%;font-family:var(--sans);font-size:13px;color:var(--ink);border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;resize:vertical;background:#fff;}
  .pn-compose textarea:focus{outline:0;border-color:var(--periwinkle);}
  .pn-cacts{display:flex;align-items:center;gap:9px;margin-top:7px;}
  .pn-hint{font-size:10.5px;color:var(--ink-3);font-weight:700;}
  .pn-post{margin-left:auto;font-family:var(--sans);font-size:12.5px;font-weight:800;color:#fff;background:var(--periwinkle);border:0;border-radius:9px;padding:8px 15px;cursor:pointer;}
  .pn-post:hover{background:var(--periwinkle-deep);}
  .pn-post.sm{padding:5px 11px;font-size:11.5px;margin-left:0;}
  .pn-link{font:inherit;font-size:11.5px;font-weight:800;color:var(--ink-3);background:none;border:0;cursor:pointer;text-decoration:underline;}
  .pn-editbox{width:100%;font-family:var(--sans);font-size:13px;border:1.5px solid var(--periwinkle);border-radius:8px;padding:7px 9px;resize:vertical;}
  .pn-mentions{position:absolute;left:8px;bottom:calc(100% + 4px);z-index:5;background:#fff;border:1px solid var(--line-soft);border-radius:10px;box-shadow:0 10px 26px rgba(20,22,45,.18);padding:4px;min-width:180px;}
  .pn-mentions button{display:block;width:100%;text-align:left;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);background:none;border:0;border-radius:7px;padding:6px 9px;cursor:pointer;}
  .pn-mentions button:hover{background:var(--paper);color:var(--periwinkle-deep);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  return { org, notes, comments, count, addNote, editNote, deleteNote, addComment,
    history, log, panelHTML, wire, team };
})();
