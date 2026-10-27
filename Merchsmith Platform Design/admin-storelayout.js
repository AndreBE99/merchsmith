/* ============================================================
   admin-storelayout.js — manage the store taxonomy (sections +
   departments) from the Merchsmith Admin. Reads/writes MSSTORE.
   Renders into #panel-storestructure. Removes the store's dead
   links by making the nav data-driven.
   ============================================================ */
(function(){
  if(!window.MSSTORE) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();
  const prodCount=deptId=>{ try{ if(window.MSCAT) return MSCAT.all().filter(p=>(p.dept||'').toLowerCase()===deptId).length; }catch(e){} return 0; };
  const subCount=(dId,sId)=>{ try{ if(window.MSCAT&&MSSTORE.subcatsForProduct) return MSCAT.all().filter(p=>MSSTORE.subcatsForProduct(p.id).includes(sId)).length; }catch(e){} return 0; };

  let openSec=null, openDept=null;
  function panel(){ return document.getElementById('panel-storestructure'); }
  function render(){
    const p=panel(); if(!p) return;
    const secs=MSSTORE.sections();
    if(openSec===null && secs[0]) openSec=secs[0].id;
    p.innerHTML=`
      <div class="phead"><h1 class="ptitle">Store layout</h1><div style="display:flex;gap:8px"><a class="btn ghost" href="Merchsmith Store.html?store=merchsmith">View default store ↗</a><button class="btn" id="slAddSec">＋ New section</button></div></div>
      <div class="sl-cols">
        <div class="sl-secs">${secs.map((s,i)=>secCard(s,i,secs.length)).join('')}</div>
        <div class="sl-detail" id="slDetail">${detail(openSec)}</div>
      </div>`;
    wire();
  }
  function secCard(s,i,n){
    return `<div class="sl-sec ${s.id===openSec?'on':''}">
      <div class="sl-secmain" data-sec="${s.id}" role="button" tabindex="0"><b>${esc(s.name)}</b><span>${s.deptIds.length} department${s.deptIds.length===1?'':'s'}</span></div>
      <div class="sl-secord"><button class="sl-ord" data-secmove="${s.id}:-1" ${i===0?'disabled':''}>▲</button><button class="sl-ord" data-secmove="${s.id}:1" ${i===n-1?'disabled':''}>▼</button></div>
    </div>`;
  }
  function detail(secId){
    const s=MSSTORE.section(secId); if(!s) return `<div class="sl-empty">Select a section.</div>`;
    const deps=MSSTORE.deptsOf(secId);
    const unassigned=MSSTORE.departments().filter(d=>!s.deptIds.includes(d.id));
    return `<div class="sl-dhd">
        <input class="sl-secname" data-secname="${s.id}" value="${esc(s.name)}">
        <button class="btn ghost sm" data-secdel="${s.id}" ${s.id==='essentials'?'disabled title="Default section cannot be deleted"':''}>Delete section</button>
      </div>
      <textarea class="sl-secintro" data-secintro="${s.id}" rows="2" placeholder="Section intro shown at the top of the store">${esc(s.intro||'')}</textarea>
      <div class="sl-subhd"><h3>Departments</h3><button class="btn sm" data-adddept="${s.id}">＋ Add department</button></div>
      <div class="sl-depts">${deps.length?deps.map((d,i)=>deptRow(d,i,deps.length)).join(''):'<div class="sl-empty">No departments yet. Add one, or move an existing department here.</div>'}</div>
      ${unassigned.length?`<div class="sl-move"><span>Move an existing department here:</span><select id="slMoveSel"><option value="">Choose…</option>${unassigned.map(d=>`<option value="${d.id}">${esc(d.name)} (${MSSTORE.sectionOfDept(d.id)?MSSTORE.sectionOfDept(d.id).name:'—'})</option>`).join('')}</select></div>`:''}`;
  }
  function deptRow(d,i,n){
    return `<div class="sl-dept ${d.id===openDept?'on':''}" data-deptrow="${d.id}">
      <div class="sl-deptord"><button class="sl-ord" data-deptmove="${d.id}:-1" ${i===0?'disabled':''}>▲</button><button class="sl-ord" data-deptmove="${d.id}:1" ${i===n-1?'disabled':''}>▼</button></div>
      <input class="sl-deptname" data-deptname="${d.id}" value="${esc(d.name)}">
      <span class="sl-deptct">${prodCount(d.id)} products</span>
      <button class="sl-deptedit" data-deptedit="${d.id}">${d.id===openDept?'Close':'Edit page'}</button>
      <button class="sl-deptdel" data-deptdel="${d.id}" title="Delete department">×</button>
    </div>${d.id===openDept?deptEditor(d):''}`;
  }
  function deptEditor(d){
    const subs=d.subcats||[];
    return `<div class="sl-depted">
      <label class="sl-fl">Category intro</label>
      <textarea class="sl-din" data-dintro="${d.id}" rows="3" placeholder="Intro paragraph shown at the top of the category page">${esc(d.intro||'')}</textarea>
      <label class="sl-fl">Hero image URL <span>(or drop one on the store page)</span></label>
      <input class="sl-din" data-dhero="${d.id}" value="${esc(d.hero||'')}" placeholder="https://…/hero.jpg">
      <div class="sl-subhd2"><label class="sl-fl" style="margin:0">Sub-categories <span>★ = featured on the page</span></label><div class="sl-subacts">${subs.length>1?`<button class="btn ghost sm" data-sortsub="${d.id}" title="Sort A→Z">A→Z</button>`:''}<button class="btn sm" data-addsub="${d.id}">＋ Add sub-category</button></div></div>
      <div class="sl-subs" data-subwrap="${d.id}">${subs.length?subs.map((s,i)=>`<div class="sl-sub" data-subrow="${d.id}:${s.id}" draggable="true">
        <span class="sl-subgrip" title="Drag to reorder">⠿</span>
        <button class="sl-star ${s.featured?'on':''}" data-substar="${d.id}:${s.id}" title="Feature on the category page">★</button>
        <input class="sl-subname" data-subname="${d.id}:${s.id}" value="${esc(s.name)}">
        <span class="sl-subct ${subCount(d.id,s.id)===0?'zero':''}" title="${subCount(d.id,s.id)===0?'No products — hidden in the store, still editable here':'Products in this sub-category'}">${subCount(d.id,s.id)}</span>
        <input class="sl-subimg" data-subimg="${d.id}:${s.id}" value="${esc(s.img||'')}" placeholder="thumbnail URL">
        <button class="sl-deptdel" data-subdel="${d.id}:${s.id}">×</button>
      </div>`).join(''):'<div class="sl-empty">No sub-categories yet — these become the category filter + featured strip.</div>'}</div>
    </div>`;
  }

  // inline replacements for prompt()/confirm() — these are blocked in the embedded preview
  function askName(title, def, cb){
    let pk=document.getElementById('slAsk'); if(pk)pk.remove();
    pk=document.createElement('div'); pk.id='slAsk'; pk.className='sl-askscrim';
    pk.innerHTML=`<div class="sl-ask"><h4>${esc(title)}</h4><input id="slAskInp" value="${esc(def||'')}"><div class="sl-askbtns"><button class="btn ghost sm" data-cancel>Cancel</button><button class="btn sm" data-ok>Add</button></div></div>`;
    document.body.appendChild(pk);
    const inp=pk.querySelector('#slAskInp'); inp.focus(); inp.select();
    const done=v=>{ pk.remove(); if(v!=null&&v.trim()) cb(v.trim()); };
    pk.querySelector('[data-ok]').onclick=()=>done(inp.value);
    pk.querySelector('[data-cancel]').onclick=()=>{ pk.remove(); };
    inp.onkeydown=e=>{ if(e.key==='Enter')done(inp.value); if(e.key==='Escape')pk.remove(); };
    pk.onclick=e=>{ if(e.target===pk)pk.remove(); };
  }
  function confirmInline(msg, cb){
    let pk=document.getElementById('slAsk'); if(pk)pk.remove();
    pk=document.createElement('div'); pk.id='slAsk'; pk.className='sl-askscrim';
    pk.innerHTML=`<div class="sl-ask"><p class="sl-askmsg">${esc(msg)}</p><div class="sl-askbtns"><button class="btn ghost sm" data-cancel>Cancel</button><button class="btn sm" data-ok>Confirm</button></div></div>`;
    document.body.appendChild(pk);
    pk.querySelector('[data-ok]').onclick=()=>{ pk.remove(); cb(); };
    pk.querySelector('[data-cancel]').onclick=()=>pk.remove();
    pk.onclick=e=>{ if(e.target===pk)pk.remove(); };
  }
  function wire(){
    const p=panel();
    p.querySelector('#slAddSec').onclick=()=>askName('New section name','New section',n=>{ openSec=MSSTORE.addSection(n); render(); toast('Section added'); });
    p.querySelectorAll('[data-sec]').forEach(b=>b.onclick=e=>{ if(e.target.closest('[data-secmove]'))return; openSec=b.dataset.sec; render(); });
    p.querySelectorAll('[data-secmove]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const [id,d]=b.dataset.secmove.split(':'); MSSTORE.moveSection(id,+d); render(); });
    const sn=p.querySelector('[data-secname]'); if(sn)sn.onchange=()=>MSSTORE.updateSection(sn.dataset.secname,{name:sn.value.trim()||'Section'})||render();
    const si=p.querySelector('[data-secintro]'); if(si)si.onchange=()=>MSSTORE.updateSection(si.dataset.secintro,{intro:si.value});
    const sd=p.querySelector('[data-secdel]'); if(sd&&!sd.disabled)sd.onclick=()=>confirmInline('Delete this section? Its departments move to the first section.',()=>{ MSSTORE.deleteSection(sd.dataset.secdel); openSec=null; render(); toast('Section deleted'); });
    const ad=p.querySelector('[data-adddept]'); if(ad)ad.onclick=()=>askName('New department name','New department',n=>{ MSSTORE.addDepartment(n, ad.dataset.adddept); render(); toast('Department added'); });
    p.querySelectorAll('[data-deptmove]').forEach(b=>b.onclick=()=>{ const [id,d]=b.dataset.deptmove.split(':'); MSSTORE.moveDepartment(id,+d); render(); });
    p.querySelectorAll('[data-deptname]').forEach(inp=>inp.onchange=()=>MSSTORE.updateDepartment(inp.dataset.deptname,{name:inp.value.trim()||'Department'}));
    p.querySelectorAll('[data-deptedit]').forEach(b=>b.onclick=()=>{ openDept = openDept===b.dataset.deptedit ? null : b.dataset.deptedit; render(); });
    p.querySelectorAll('[data-deptdel]').forEach(b=>b.onclick=()=>{ const d=MSSTORE.department(b.dataset.deptdel); confirmInline(`Delete "${d?d.name:'department'}"? Products keep their data but the department link is removed.`,()=>{ MSSTORE.deleteDepartment(b.dataset.deptdel); if(openDept===b.dataset.deptdel)openDept=null; render(); toast('Department deleted'); }); });
    // department-page editor
    const di=p.querySelector('[data-dintro]'); if(di)di.onchange=()=>MSSTORE.updateDepartment(di.dataset.dintro,{intro:di.value});
    const dh=p.querySelector('[data-dhero]'); if(dh)dh.onchange=()=>MSSTORE.updateDepartment(dh.dataset.dhero,{hero:dh.value.trim()});
    const asub=p.querySelector('[data-addsub]'); if(asub)asub.onclick=()=>askName('Sub-category name','New sub-category',n=>{ MSSTORE.addSubcat(asub.dataset.addsub,n); render(); });
    p.querySelectorAll('[data-sortsub]').forEach(b=>b.onclick=()=>{ MSSTORE.sortSubcats(b.dataset.sortsub); render(); toast('Sub-categories sorted A→Z'); });
    p.querySelectorAll('[data-substar]').forEach(b=>b.onclick=()=>{ const [dId,sId]=b.dataset.substar.split(':'); const s=MSSTORE.subcatsOf(dId).find(x=>x.id===sId); MSSTORE.updateSubcat(dId,sId,{featured:!(s&&s.featured)}); render(); });
    p.querySelectorAll('[data-subname]').forEach(inp=>inp.onchange=()=>{ const [dId,sId]=inp.dataset.subname.split(':'); MSSTORE.updateSubcat(dId,sId,{name:inp.value.trim()||'Sub-category'}); });
    p.querySelectorAll('[data-subimg]').forEach(inp=>inp.onchange=()=>{ const [dId,sId]=inp.dataset.subimg.split(':'); MSSTORE.updateSubcat(dId,sId,{img:inp.value.trim()}); });
    p.querySelectorAll('[data-submove]').forEach(b=>b.onclick=()=>{ const [dId,sId,dir]=b.dataset.submove.split(':'); MSSTORE.moveSubcat(dId,sId,+dir); render(); });
    wireSubDrag(p);
    p.querySelectorAll('[data-subdel]').forEach(b=>b.onclick=()=>{ const [dId,sId]=b.dataset.subdel.split(':'); MSSTORE.deleteSubcat(dId,sId); render(); });
    const mv=p.querySelector('#slMoveSel'); if(mv)mv.onchange=()=>{ if(mv.value){ MSSTORE.assignDept(mv.value, openSec); render(); toast('Department moved'); } };
  }
  function wireSubDrag(p){
    const wrap=p.querySelector('[data-subwrap]'); if(!wrap) return;
    const deptId=wrap.dataset.subwrap; let dragRow=null;
    wrap.querySelectorAll('[data-subrow]').forEach(row=>{
      row.addEventListener('dragstart',e=>{ dragRow=row; row.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain','');}catch(_){} });
      row.addEventListener('dragend',()=>{ row.classList.remove('dragging'); wrap.querySelectorAll('.drop-above,.drop-below').forEach(x=>x.classList.remove('drop-above','drop-below')); dragRow=null; });
      row.addEventListener('dragover',e=>{ if(!dragRow||dragRow===row) return; e.preventDefault(); const r=row.getBoundingClientRect(); const below=e.clientY>r.top+r.height/2; row.classList.toggle('drop-below',below); row.classList.toggle('drop-above',!below); });
      row.addEventListener('dragleave',()=>row.classList.remove('drop-above','drop-below'));
      row.addEventListener('drop',e=>{ if(!dragRow||dragRow===row) return; e.preventDefault();
        const rows=[...wrap.querySelectorAll('[data-subrow]')]; const r=row.getBoundingClientRect(); const below=e.clientY>r.top+r.height/2;
        let to=rows.indexOf(row)+(below?1:0); const from=rows.indexOf(dragRow); if(from<to) to--;
        const sId=dragRow.dataset.subrow.split(':')[1]; MSSTORE.reorderSubcat(deptId,sId,to); render(); });
    });
  }

  (function(){ if(document.getElementById('sl-style'))return; const st=document.createElement('style'); st.id='sl-style';
    st.textContent=`
    .sl-cols{display:grid;grid-template-columns:280px 1fr;gap:18px;align-items:start;}
    .sl-askscrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:300;display:grid;place-items:center;}
    .sl-ask{background:#fff;border-radius:16px;padding:22px 24px;width:min(400px,92vw);box-shadow:0 24px 60px rgba(20,22,45,.35);}
    .sl-ask h4{margin:0 0 12px;font-family:var(--serif);font-weight:500;font-size:18px;}
    .sl-ask .sl-askmsg{margin:0 0 16px;font-size:14px;line-height:1.5;color:var(--ink-2);}
    .sl-ask input{width:100%;font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 12px;margin-bottom:16px;}
    .sl-ask input:focus{outline:0;border-color:var(--periwinkle-deep);}
    .sl-askbtns{display:flex;gap:10px;justify-content:flex-end;}
    @media(max-width:900px){.sl-cols{grid-template-columns:1fr;}}
    .sl-secs{display:flex;flex-direction:column;gap:8px;}
    .sl-sec{display:flex;align-items:center;gap:10px;text-align:left;border:1.5px solid var(--line-soft);background:#fff;border-radius:12px;padding:13px 14px;cursor:pointer;}
    .sl-sec.on{border-color:var(--periwinkle-deep);box-shadow:0 0 0 1px var(--periwinkle-deep);}
    .sl-secmain{flex:1;}.sl-secmain b{display:block;font-size:14.5px;}.sl-secmain span{font-size:12px;color:var(--muted);}
    .sl-secord{display:flex;flex-direction:column;gap:2px;}
    .sl-ord{width:24px;height:18px;border:1px solid var(--line-soft);background:var(--paper-2);border-radius:5px;font-size:9px;line-height:1;cursor:pointer;color:var(--ink-2);}
    .sl-ord:disabled{opacity:.3;cursor:default;}
    .sl-detail{background:#fff;border:1.5px solid var(--line-soft);border-radius:14px;padding:18px 20px;}
    .sl-dhd{display:flex;gap:12px;align-items:center;margin-bottom:10px;}
    .sl-secname{flex:1;font-family:var(--serif);font-size:22px;font-weight:500;border:1.5px solid transparent;border-radius:8px;padding:4px 8px;margin:-4px -8px;background:none;}
    .sl-secname:hover{border-color:var(--line-soft);}.sl-secname:focus{outline:none;border-color:var(--periwinkle-deep);background:var(--paper);}
    .sl-secintro{width:100%;font:inherit;font-size:13px;line-height:1.5;color:var(--ink-2);border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:var(--paper);resize:vertical;margin-bottom:16px;}
    .sl-subhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
    .sl-subhd h3{font-size:15px;margin:0;}
    .sl-depts{display:flex;flex-direction:column;gap:8px;}
    .sl-dept{display:flex;align-items:center;gap:10px;border:1px solid var(--line-soft);border-radius:10px;padding:8px 10px;background:var(--paper-2);}
    .sl-deptord{display:flex;flex-direction:column;gap:2px;}
    .sl-deptname{flex:1;font:inherit;font-size:14px;font-weight:600;border:1.5px solid transparent;border-radius:7px;padding:5px 8px;background:none;}
    .sl-deptname:hover{border-color:var(--line-soft);background:#fff;}.sl-deptname:focus{outline:none;border-color:var(--periwinkle-deep);background:#fff;}
    .sl-deptct{font-size:12px;color:var(--muted);white-space:nowrap;}
    .sl-deptdel{width:28px;height:28px;border:1.5px solid var(--line-soft);background:#fff;border-radius:7px;font-size:16px;line-height:1;color:var(--muted);cursor:pointer;}
    .sl-deptdel:hover{border-color:var(--flare);color:var(--flare);}
    .sl-deptedit{border:1.5px solid var(--line-soft);background:#fff;border-radius:7px;padding:5px 11px;font:inherit;font-size:12px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;white-space:nowrap;}
    .sl-deptedit:hover{border-color:var(--periwinkle-deep);}
    .sl-depted{margin:2px 0 6px;padding:14px;background:#fff;border:1.5px solid var(--periwinkle);border-radius:11px;}
    .sl-fl{display:block;font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);margin:0 0 6px;}
    .sl-fl span{text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted);}
    .sl-din{width:100%;font:inherit;font-size:13px;line-height:1.5;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:var(--paper);margin-bottom:13px;}
    textarea.sl-din{resize:vertical;}
    .sl-subhd2{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:10px;}
    .sl-subacts{display:flex;align-items:center;gap:8px;flex:none;}
    .sl-subs{display:flex;flex-direction:column;gap:7px;}
    .sl-sub{display:flex;align-items:center;gap:7px;}
    .sl-star{width:30px;height:30px;border:1.5px solid var(--line-soft);background:#fff;border-radius:7px;font-size:14px;line-height:1;color:var(--line);cursor:pointer;flex:none;}
    .sl-star.on{color:#e0a92e;border-color:#e7c98f;background:#fffaf0;}
    .sl-subname{flex:1;font:inherit;font-size:13.5px;font-weight:600;border:1.5px solid var(--line-soft);border-radius:7px;padding:6px 9px;background:#fff;min-width:0;}
    .sl-subimg{width:130px;flex:none;font:inherit;font-size:12px;border:1.5px solid var(--line-soft);border-radius:7px;padding:6px 8px;background:#fff;color:var(--ink-2);}
    .sl-subct{flex:none;min-width:26px;text-align:center;font-size:11.5px;font-weight:700;color:var(--muted);background:var(--paper-2);border-radius:6px;padding:4px 7px;}
    .sl-subct.zero{color:var(--flare);background:rgba(255,46,23,.1);}
    .sl-sub[data-subrow]{padding:2px 0;border-radius:8px;}
    .sl-subgrip{flex:none;width:20px;text-align:center;cursor:grab;color:var(--muted);font-size:15px;line-height:1;user-select:none;}
    .sl-sub.dragging{opacity:.5;}
    .sl-sub.drop-above{box-shadow:inset 0 2px 0 var(--periwinkle-deep);}
    .sl-sub.drop-below{box-shadow:inset 0 -2px 0 var(--periwinkle-deep);}
    @media(max-width:700px){.sl-subimg{display:none;}}
    .sl-move{margin-top:14px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink-2);}
    .sl-move select{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 10px;background:#fff;}
    .sl-empty{color:var(--muted);font-size:13.5px;padding:18px;text-align:center;}
    `;
    document.head.appendChild(st);
  })();

  function init(){ render(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('click',e=>{ if(e.target.closest('[data-nav="storestructure"]')) setTimeout(render,0); });
  window.MSStoreLayout={ render };
})();
