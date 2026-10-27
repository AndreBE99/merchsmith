/* ============================================================
   flags.js — warning flags on any organisation or user, switchable on/off.
   Key: 'org:<id>' or 'user:<orgKey>:<email|name>'. Seed flags from data
   (e.g. ORG_DATA customer.flag) show until someone changes them.
   Store: localStorage 'ms-flags' {key:{on,level,note,by,at} | {on:false}}
   window.MSFLAG: get(key,seed) · set(key,v) · edit(key,label,seed,onDone)
                  cell(key,label,seed) · on(key,seed)
   ============================================================ */
window.MSFLAG=window.MSFLAG||(function(){
  const KEY='ms-flags', esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const LV={amber:'Warning',red:'Action needed'};
  function get(key,seed){ const s=all()[key]; if(s) return s.on?s:null; return seed&&seed.level!=='grey'?{on:true,level:seed.level||'amber',note:seed.note||'',seed:true}:null; }
  const on=(key,seed)=>!!get(key,seed);
  const hist=key=>(all()[key]||{}).history||[];
  function saveHist(key,H){ const s=all(); s[key]=Object.assign(s[key]||{on:false},{history:H}); try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-flag-change',{detail:{key}})); }catch(e){} }
  function set(key,v,entry){ const s=all(), H=(s[key]||{}).history||[]; if(entry) H.unshift(Object.assign({id:'h'+Date.now().toString(36),at:new Date().toISOString(),by:who()},entry)); s[key]=Object.assign(v?Object.assign({on:true},v):{on:false},{history:H}); try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-flag-change',{detail:{key}})); }catch(e){} }
  const who=()=>((window.MSID&&MSID.get&&MSID.get())||{}).who||'You';
  const ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>';
  function cell(key,label,seed){ const f=get(key,seed);
    return `<button class="fl-btn${f?' on l-'+f.level:''}" data-flag="${esc(key)}" data-flabel="${esc(label||'')}" title="${f?esc(LV[f.level]+(f.note?': '+f.note:'')):'Add a warning flag'}" aria-label="${f?'Flagged: '+esc(LV[f.level]):'Add a warning flag for '+esc(label||'')}">${ICON}</button>`; }
  function edit(key,label,seed,done){ const f=get(key,seed)||{level:'amber',note:''};
    const w=document.createElement('div'); w.className='fl-scrim'; w.innerHTML=`<div class="fl-modal" role="dialog" aria-modal="true" aria-label="Warning flag">
      <div class="fl-mh"><b>Warning flag${label?' · '+esc(label):''}</b><button class="fl-x" data-flx aria-label="Close">×</button></div>
      <label class="fl-row"><span>Flag this</span><button class="fl-sw${get(key,seed)?' on':''}" data-flon role="switch" aria-checked="${!!get(key,seed)}"></button></label>
      <div class="fl-body"><div class="fl-lv"${get(key,seed)?'':' hidden'} data-fllvw>${Object.entries(LV).map(([k,l])=>`<button class="${f.level===k?'on':''} l-${k}" data-fllv="${k}">${ICON}${l}</button>`).join('')}</div>
        <label class="fl-f"><span>Warning note</span><textarea data-flnote rows="3" maxlength="240" placeholder="e.g. Payment 30 days overdue, hold new orders">${esc(f.note||'')}</textarea></label>
        <div class="fl-hist" data-flhist></div>
        ${f.by?`<p class="fl-sm">Flagged by ${esc(f.by)}${f.at?' · '+new Date(f.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''}</p>`:''}</div>
      <div class="fl-foot"><button class="fl-b ghost" data-flx>Cancel</button><button class="fl-b" data-flsave>Save</button></div></div>`;
    document.body.appendChild(w); let onv=!!get(key,seed), lv=f.level;
    const q=s=>w.querySelector(s); const close=()=>w.remove();
    w.onclick=e=>{ if(e.target===w||e.target.closest('[data-flx]')) close(); };
    q('[data-flon]').onclick=e=>{ onv=!onv; e.currentTarget.classList.toggle('on',onv); e.currentTarget.setAttribute('aria-checked',onv); q('[data-fllvw]').hidden=!onv; };
    const WH={added:'Flag added',updated:'Flag updated',removed:'Flag removed',note:'Note added'};
    const fmt=d=>new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
    function drawHist(){ const H=hist(key), box=q('[data-flhist]');
      box.innerHTML=`<h6>Warning history</h6>${H.length?H.map(h=>`<div class="fl-h" data-hid="${esc(h.id)}"><div class="fl-hh"><b class="${h.level?'l-'+h.level:''}">${esc(WH[h.action]||h.action)}${h.level&&h.action!=='removed'?' · '+esc(LV[h.level]):''}</b><span>${esc(fmt(h.at))} · ${esc(h.by||'')}${h.edited?' · edited':''}</span></div>
        <p data-htx>${esc(h.note||'')||'<i>No note</i>'}</p><div class="fl-ha"><button data-hedit>Edit</button><button data-hdel>Delete</button></div></div>`).join(''):'<p class="fl-sm">Nothing yet. Saving a flag or a note adds it here.</p>'}`;
      box.querySelectorAll('[data-hedit]').forEach(b=>b.onclick=()=>{ const row=b.closest('[data-hid]'), id=row.dataset.hid, h=hist(key).find(x=>x.id===id);
        row.querySelector('[data-htx]').outerHTML=`<textarea class="fl-hta" rows="2" maxlength="240">${esc(h.note||'')}</textarea>`; b.textContent='Save'; b.onclick=()=>{ const H=hist(key); const x=H.find(y=>y.id===id); x.note=row.querySelector('.fl-hta').value.trim(); x.edited=new Date().toISOString(); saveHist(key,H); drawHist(); }; });
      box.querySelectorAll('[data-hdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Delete this history entry?')) return; saveHist(key,hist(key).filter(x=>x.id!==b.closest('[data-hid]').dataset.hid)); drawHist(); }); }
    drawHist();
    w.querySelectorAll('[data-fllv]').forEach(b=>b.onclick=()=>{ lv=b.dataset.fllv; w.querySelectorAll('[data-fllv]').forEach(x=>x.classList.toggle('on',x===b)); });
    q('[data-flsave]').onclick=()=>{ const note=q('[data-flnote]').value.trim(), was=get(key,seed);
      const action=onv?(was?(was.level!==lv||(was.note||'')!==note?'updated':null):'added'):(was?'removed':(note?'note':null));
      set(key,onv?{level:lv,note,by:who(),at:new Date().toISOString()}:null,action?{action,level:onv?lv:(was&&was.level),note}:null); close(); if(done) done(get(key)); }; }
  // any [data-flag] button on any page opens the editor
  document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-flag]'); if(!b) return; e.preventDefault(); e.stopPropagation(); edit(b.dataset.flag,b.dataset.flabel,null); },true);
  const css=`
  .fl-btn{width:28px;height:28px;border-radius:8px;border:1px solid transparent;background:none;display:grid;place-items:center;cursor:pointer;color:var(--line);} .fl-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;}
  .fl-btn:hover{border-color:var(--line-soft);color:var(--ink-3);background:#fff;} .fl-btn.on svg{fill:currentColor;} .fl-btn.l-amber{color:#c9882a;} .fl-btn.l-red{color:var(--flare);}
  .fl-scrim{position:fixed;inset:0;z-index:1750;background:rgba(20,22,45,.35);display:grid;place-items:center;padding:16px;}
  .fl-modal{background:#fff;border-radius:16px;width:min(420px,100%);padding:18px 20px;box-shadow:0 24px 60px rgba(20,22,45,.3);font-family:var(--sans);}
  .fl-mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;} .fl-mh b{font-family:var(--serif);font-weight:500;font-size:20px;} .fl-x{border:0;background:none;font-size:24px;color:var(--muted);cursor:pointer;}
  .fl-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:700;padding:6px 0 12px;}
  .fl-sw{width:44px;height:26px;border-radius:999px;background:var(--line);border:0;cursor:pointer;position:relative;} .fl-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.25);} .fl-sw.on{background:var(--flare);} .fl-sw.on::after{transform:translateX(18px);}
  .fl-body[hidden]{display:none;} .fl-lv{display:flex;gap:8px;margin-bottom:12px;} .fl-lv button{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;font:inherit;font-size:13px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;border-radius:10px;padding:9px;cursor:pointer;white-space:nowrap;}
  .fl-lv svg{width:14px;height:14px;fill:currentColor;stroke:currentColor;stroke-width:1.6;} .fl-lv .l-amber{color:#9a6b1f;} .fl-lv .l-red{color:#b4232c;} .fl-lv button.on.l-amber{border-color:#c9882a;background:#fbeccd;} .fl-lv button.on.l-red{border-color:var(--flare);background:var(--tint-red);}
  .fl-f{display:flex;flex-direction:column;gap:5px;} .fl-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .fl-f textarea{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;resize:vertical;}
  .fl-hist{margin-top:14px;border-top:1px solid var(--paper-2);padding-top:10px;max-height:240px;overflow:auto;} .fl-hist h6{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
  .fl-h{padding:8px 0;border-top:1px solid var(--paper-2);} .fl-h:first-of-type{border-top:0;} .fl-hh{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12.5px;} .fl-hh b.l-amber{color:#9a6b1f;} .fl-hh b.l-red{color:#b4232c;} .fl-hh span{color:var(--muted);font-size:11.5px;}
  .fl-h p{margin:4px 0;font-size:13px;color:var(--ink-2);line-height:1.45;} .fl-h p i{color:var(--muted);} .fl-hta{width:100%;font:inherit;font-size:13px;border:1.5px solid var(--periwinkle);border-radius:8px;padding:6px 8px;margin:4px 0;}
  .fl-ha{display:flex;gap:10px;} .fl-ha button{border:0;background:none;font:inherit;font-size:12px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;} .fl-ha button+button{color:#b4232c;}
  .fl-modal{max-height:90vh;overflow:auto;}
  .fl-sm{font-size:12px;color:var(--muted);margin:8px 0 0;} .fl-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;}
  .fl-b{font:inherit;font-size:13.5px;font-weight:700;background:var(--periwinkle-deep);color:#fff;border:0;border-radius:10px;padding:9px 16px;cursor:pointer;} .fl-b.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line-soft);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {get,set,on,edit,cell,LV,history:hist};
})();
