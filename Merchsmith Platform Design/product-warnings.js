/* product-warnings.js — saved proof warnings per store product (Oct 2026).
   Distributors save warnings once against the product, then pick them on any future proof.
   Store: ms-prod-warnings {productName: [{id,text,def,by,at,upd}]}. def = added to new proofs automatically.
   Used by: product-modal.js (Proof → Warnings field) and store-page.js (product page, distributor view).
   window.MSWARN: list(name) · add(name,text,def) · update(name,id,patch) · remove(name,id) · defaults(name)
                  pickerHTML(name,current) · wirePicker(root,name,getText,setText) · manager(name,onDone) */
window.MSWARN=window.MSWARN||(function(){
  const KEY='ms-prod-warnings';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const J=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const P=v=>{ try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-warn-change')); }catch(e){} };
  const who=()=>{ try{ return (window.MSChat&&MSChat.me&&MSChat.me().name)||'Jess Doyle'; }catch(e){ return 'Jess Doyle'; } };
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
  const list=n=>(J()[n]||[]).slice();
  // warning drafts: not product specific, set in Distributor Settings, offered on every proof
  const DK='ms-warn-drafts', DJ=()=>{ try{ return JSON.parse(localStorage.getItem(DK)||'[]'); }catch(e){ return []; } }, DP=v=>{ try{ localStorage.setItem(DK,JSON.stringify(v)); }catch(e){} };
  const drafts=()=>DJ();
  function draftAdd(title,text){ text=String(text||'').trim(); if(!text) return null; const L=DJ(); if(L.some(x=>norm(x.text)===norm(text))) return null; const d={id:'d'+Date.now().toString(36),title:String(title||'').trim()||autoTitle(text),text,by:who(),at:new Date().toISOString()}; L.push(d); DP(L); return d; }
  function draftUpd(id,patch){ const L=DJ(), d=L.find(x=>x.id===id); if(!d) return; Object.assign(d,patch,{upd:new Date().toISOString(),updBy:who()}); DP(L); }
  function draftDel(id){ DP(DJ().filter(x=>x.id!==id)); }
  const autoTitle=t=>{ const s=String(t||'').trim().replace(/[.:;,]+$/,''); const w2=s.split(/\s+/); return w2.length<=5?s:w2.slice(0,5).join(' ')+'…'; };
  const titleOf=w=>w.title||autoTitle(w.text);
  function add(n,text,def,title){ text=String(text||'').trim(); if(!text) return null; const A=J(), L=A[n]=A[n]||[]; if(L.some(w=>norm(w.text)===norm(text))) return null; const w={id:'w'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),title:String(title||'').trim()||autoTitle(text),text,def:!!def,by:who(),at:new Date().toISOString()}; L.push(w); P(A); return w; }
  function update(n,id,patch){ const A=J(), w=(A[n]||[]).find(x=>x.id===id); if(!w) return; Object.assign(w,patch,{upd:new Date().toISOString(),updBy:who()}); P(A); }
  function remove(n,id){ const A=J(); A[n]=(A[n]||[]).filter(x=>x.id!==id); P(A); }
  const defaults=n=>list(n).filter(w=>w.def).map(w=>w.text);
  const lines=t=>String(t||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);

  // chips under the proof's Warnings field: click to add / remove; "Save to product" stores lines not saved yet
  const ICP='<svg viewBox="0 0 24 24"><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9"/></svg>', ICD='<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h6M9 15h4"/></svg>';
  function pickerHTML(n,cur){ const L=list(n), D=drafts(), have=new Set(lines(cur).map(norm)), unsaved=lines(cur).filter(t=>!L.some(w=>norm(w.text)===norm(t))&&!D.some(x=>norm(x.text)===norm(t)));
    const onD=D.filter(x=>have.has(norm(x.text))).length, open=localStorage.getItem('ms-warn-drafts-open')!=='0';
    return `<div class="wn-wrap" data-wnpick>
      <div class="wn-pick">
        <div class="wn-ph"><span class="wn-ttl"><i class="wn-ic">${ICP}</i>Saved warnings for this product</span><button type="button" class="wn-lk" data-wnmgr>Manage</button></div>
        ${L.length?`<div class="wn-chips">${L.map(w=>`<button type="button" class="wn-chip${have.has(norm(w.text))?' on':''}" data-wnadd="${esc(w.id)}" title="${esc(w.text)}">${have.has(norm(w.text))?'✓ ':'+ '}${esc(titleOf(w))}${w.def?'<em>default</em>':''}</button>`).join('')}</div>`:'<p class="wn-none">None saved yet. Write a warning above, then save it to the product to reuse it on future proofs.</p>'}
        ${unsaved.length?`<button type="button" class="wn-save" data-wnsave>Save ${unsaved.length>1?unsaved.length+' warnings':'this warning'} to the product</button>`:''}
      </div>
      <details class="wn-drafts" data-wndet${open?' open':''}>
        <summary><span class="wn-ttl"><i class="wn-ic dr">${ICD}</i>Warning drafts <small>· every product</small>${D.length?`<b class="wn-cnt">${onD?onD+' of ':''}${D.length}</b>`:''}</span><svg class="wn-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
        <div class="wn-dbody">${D.length?`<div class="wn-chips">${D.map(x=>`<button type="button" class="wn-chip dr${have.has(norm(x.text))?' on':''}" data-wndr="${esc(x.id)}" title="${esc(x.text)}">${have.has(norm(x.text))?'✓ ':'+ '}${esc(x.title||autoTitle(x.text))}</button>`).join('')}</div>`:'<p class="wn-none">No drafts yet.</p>'}
          <a class="wn-lk" href="Merchsmith Distributor Settings.html#tab=warndrafts" target="_blank" rel="noopener">Edit drafts in Settings ↗</a></div>
      </details></div>`; }
  function wirePicker(root,n,get,set,redraw){ const box=root.querySelector('[data-wnpick]'); if(!box) return;
    box.querySelectorAll('[data-wnadd]').forEach(b=>b.onclick=()=>{ const w=list(n).find(x=>x.id===b.dataset.wnadd); if(!w) return; const L=lines(get()), i=L.findIndex(t=>norm(t)===norm(w.text)); if(i>=0) L.splice(i,1); else L.push(w.text); set(L.join('\n')); redraw(); });
    const det=box.querySelector('[data-wndet]'); if(det) det.addEventListener('toggle',()=>{ try{ localStorage.setItem('ms-warn-drafts-open',det.open?'1':'0'); }catch(e){} });
    box.querySelectorAll('[data-wndr]').forEach(b=>b.onclick=()=>{ const x=drafts().find(z=>z.id===b.dataset.wndr); if(!x) return; const L=lines(get()), i=L.findIndex(t=>norm(t)===norm(x.text)); if(i>=0) L.splice(i,1); else L.push(x.text); set(L.join('\n')); redraw(); });
    const sv=box.querySelector('[data-wnsave]'); if(sv) sv.onclick=()=>{ const L=list(n), todo=lines(get()).filter(t=>!L.some(x=>norm(x.text)===norm(t))); if(!todo.length) return toast('Already saved'); titleAsk(n,todo,redraw); };
    box.querySelector('[data-wnmgr]').onclick=()=>manager(n,redraw); }

  // name the warnings being saved from a proof
  function titleAsk(n,todo,done){ const w=document.createElement('div'); w.className='wn-scrim';
    w.innerHTML=`<div class="wn-modal" role="dialog" aria-modal="true" aria-label="Save warnings"><div class="wn-mh"><div><b>Save to ${esc(n)}</b><span>Give each warning a short title. The title shows on the chips; the full text goes on the proof.</span></div><button type="button" class="wn-x" data-wnx aria-label="Close">×</button></div>
      <div class="wn-list">${todo.map((t,i)=>`<div class="wn-row"><label class="wn-f"><span>Title</span><input data-wtt="${i}" maxlength="40" value="${esc(autoTitle(t))}"></label><p class="wn-full">${esc(t)}</p><label class="wn-def"><input type="checkbox" data-wtd="${i}"> Default on new proofs</label></div>`).join('')}</div>
      <div class="wn-mf"><button type="button" class="wn-btn" data-wnx>Cancel</button><button type="button" class="wn-btn pri" data-wtok>Save ${todo.length>1?todo.length+' warnings':'warning'}</button></div></div>`;
    document.body.appendChild(w); w.querySelectorAll('[data-wnx]').forEach(b=>b.onclick=()=>w.remove()); w.addEventListener('mousedown',e=>{ if(e.target===w) w.remove(); });
    const f=w.querySelector('[data-wtt="0"]'); if(f){ f.focus(); f.select(); }
    w.querySelector('[data-wtok]').onclick=()=>{ let k=0; todo.forEach((t,i)=>{ if(add(n,t,w.querySelector('[data-wtd="'+i+'"]').checked,w.querySelector('[data-wtt="'+i+'"]').value)) k++; }); w.remove(); toast(k+' warning'+(k>1?'s':'')+' saved to '+n); if(done) done(); }; }
  function manager(n,done){ const w=document.createElement('div'); w.className='wn-scrim';
    const draw=()=>{ const L=list(n);
      w.innerHTML=`<div class="wn-modal" role="dialog" aria-modal="true" aria-label="Saved warnings"><div class="wn-mh"><div><b>Saved proof warnings</b><span>${esc(n)}</span></div><button type="button" class="wn-x" data-wnx aria-label="Close">×</button></div>
        <p class="wn-sm">Pick these on any proof for this product. <b>Default</b> warnings are added to new proofs automatically.</p>
        <div class="wn-list">${L.length?L.map(x=>`<div class="wn-row" data-wnid="${esc(x.id)}"><label class="wn-f"><span>Title</span><input data-wnti maxlength="40" value="${esc(titleOf(x))}"></label><label class="wn-f"><span>Warning shown on the proof</span><textarea rows="2" data-wnt>${esc(x.text)}</textarea></label><div class="wn-ra"><label class="wn-def"><input type="checkbox" data-wnd${x.def?' checked':''}> Default</label><button type="button" class="wn-lk del" data-wndel>Delete</button></div><small>${esc(x.updBy||x.by)} · ${new Date(x.upd||x.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small></div>`).join(''):'<p class="wn-none">No saved warnings yet.</p>'}</div>
        <div class="wn-new"><label class="wn-f"><span>Title</span><input data-wnnt maxlength="40" placeholder="e.g. Dark fabrics"></label><label class="wn-f"><span>Warning shown on the proof</span><textarea rows="2" data-wnn placeholder="e.g. Print longevity can’t be guaranteed on dark fabrics"></textarea></label><div class="wn-ra"><label class="wn-def"><input type="checkbox" data-wnnd> Default</label><button type="button" class="wn-btn" data-wnadd2>Add warning</button></div></div>
        <div class="wn-mf"><button type="button" class="wn-btn pri" data-wnx>Done</button></div></div>`;
      w.querySelectorAll('[data-wnx]').forEach(b=>b.onclick=()=>{ w.remove(); if(done) done(); });
      w.querySelectorAll('[data-wnid]').forEach(r=>{ const id=r.dataset.wnid; r.querySelector('[data-wnt]').onchange=e=>{ const v=e.target.value.trim(); if(v) update(n,id,{text:v}); else { remove(n,id); draw(); } }; r.querySelector('[data-wnd]').onchange=e=>update(n,id,{def:e.target.checked}); r.querySelector('[data-wnti]').onchange=e=>update(n,id,{title:e.target.value.trim()||autoTitle(r.querySelector('[data-wnt]').value)}); r.querySelector('[data-wndel]').onclick=()=>{ if(confirm('Delete this saved warning? It stays on proofs that already use it.')){ remove(n,id); draw(); } }; });
      w.querySelector('[data-wnadd2]').onclick=()=>{ const t=w.querySelector('[data-wnn]').value; if(!t.trim()) return; if(!add(n,t,w.querySelector('[data-wnnd]').checked,w.querySelector('[data-wnnt]').value)) toast('That warning is already saved'); draw(); }; };
    draw(); document.body.appendChild(w); w.addEventListener('mousedown',e=>{ if(e.target===w){ w.remove(); if(done) done(); } }); }

  // store product page (distributor): a card listing the product's saved warnings
  function storeCardHTML(n){ const L=list(n); return `<div class="wn-card" data-wncard><div class="wn-ph"><span>Proof warnings</span><button type="button" class="wn-lk" data-wnmgr2>${L.length?'Edit':'Add warnings'}</button></div>${L.length?`<ul>${L.map(w=>`<li><b>${esc(titleOf(w))}</b>${w.def?' <em>default</em>':''}<br><span>${esc(w.text)}</span></li>`).join('')}</ul>`:'<p class="wn-none">Save warnings here to pick them on any proof for this product.</p>'}</div>`; }
  function settings(el){ if(!el) return; const draw=()=>{ const L=drafts();
      el.innerHTML=`<div class="card"><div class="card-h"><h2>Warning drafts</h2><span class="tag">${L.length} draft${L.length===1?'':'s'}</span></div>
        <p class="lede">General warnings you can add to any proof, for every product, when you draw it up. Product-specific warnings are saved on the product in the store instead.</p>
        <div class="wn-list">${L.length?L.map(x=>`<div class="wn-row" data-wdid="${esc(x.id)}"><label class="wn-f"><span>Title</span><input data-wdt maxlength="40" value="${esc(x.title||autoTitle(x.text))}"></label><label class="wn-f"><span>Warning shown on the proof</span><textarea rows="2" data-wdx>${esc(x.text)}</textarea></label><div class="wn-ra"><small>${esc(x.updBy||x.by)} · ${new Date(x.upd||x.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small><button type="button" class="wn-lk del" data-wddel>Delete</button></div></div>`).join(''):'<p class="wn-none">No drafts yet.</p>'}</div>
        <div class="wn-new" style="margin-top:12px"><label class="wn-f"><span>Title</span><input data-wdnt maxlength="40" placeholder="e.g. Colour match"></label><label class="wn-f"><span>Warning shown on the proof</span><textarea rows="2" data-wdn placeholder="e.g. Colours on screen are a guide only and may vary slightly when printed."></textarea></label><div class="wn-ra"><span></span><button type="button" class="wn-btn pri" data-wdadd>Add draft</button></div></div></div>`;
      el.querySelectorAll('[data-wdid]').forEach(r=>{ const id=r.dataset.wdid; r.querySelector('[data-wdt]').onchange=e=>draftUpd(id,{title:e.target.value.trim()}); r.querySelector('[data-wdx]').onchange=e=>{ const v=e.target.value.trim(); if(v) draftUpd(id,{text:v}); else { draftDel(id); draw(); } }; r.querySelector('[data-wddel]').onclick=()=>{ if(confirm('Delete this draft? Proofs that already use it keep the wording.')){ draftDel(id); draw(); } }; });
      el.querySelector('[data-wdadd]').onclick=()=>{ const t=el.querySelector('[data-wdn]').value; if(!t.trim()) return; if(!draftAdd(el.querySelector('[data-wdnt]').value,t)) toast('That draft already exists'); else toast('Draft added'); draw(); }; };
    draw(); }
  function toast(m){ if(window.MStoast) return MStoast(m); }
  const css=`
  .wn-wrap{display:flex;flex-direction:column;gap:10px;margin-top:10px;}
  .wn-pick{border:1px solid var(--line-soft,#e4e7ec);border-radius:12px;padding:11px 13px;background:#fff;display:flex;flex-direction:column;gap:9px;}
  .wn-ttl{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-2,#344054);} .wn-ttl small{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--muted,#667085);}
  .wn-ic{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--tint-peri,#eceef9);color:var(--periwinkle-deep);flex:none;} .wn-ic.dr{background:#f4f3ff;color:#6941c6;} .wn-ic svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
  .wn-drafts{border:1px solid #e9e4fb;border-radius:12px;background:#fbfaff;overflow:hidden;} .wn-drafts summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 13px;cursor:pointer;user-select:none;} .wn-drafts summary::-webkit-details-marker{display:none;}
  .wn-drafts summary:hover{background:#f6f3ff;} .wn-chev{width:18px;height:18px;fill:none;stroke:var(--muted,#667085);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s;} .wn-drafts[open] .wn-chev{transform:rotate(180deg);}
  .wn-cnt{font-size:11px;font-weight:800;letter-spacing:0;text-transform:none;background:#ece8fd;color:#6941c6;border-radius:999px;padding:1px 8px;}
  .wn-dbody{display:flex;flex-direction:column;align-items:flex-start;gap:9px;padding:2px 13px 12px;} .wn-chip.dr{border-style:solid;border-color:#ddd6fe;} .wn-chip.dr.on{background:#f4f3ff;border-color:#7a5af8;color:#5925dc;}
  .wn-ph{display:flex;justify-content:space-between;align-items:center;gap:10px;} .wn-ph>span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted,#667085);}
  .wn-lk{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;} .wn-lk.del{color:#b42318;}
  .wn-chips{display:flex;flex-wrap:wrap;gap:6px;} .wn-chip{font:inherit;font-size:12.5px;text-align:left;border:1px solid var(--line-soft,#d0d5dd);background:#fff;border-radius:999px;padding:5px 11px;cursor:pointer;color:var(--ink-2,#344054);max-width:100%;line-height:1.35;}
  .wn-chip:hover{border-color:var(--periwinkle);} 
  .wn-chip.on{background:var(--tint-peri,#eceef9);border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);font-weight:600;} .wn-chip em,.wn-card em{font-style:normal;font-size:10.5px;font-weight:800;margin-left:6px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;}
  .wn-none{margin:0;font-size:12.5px;color:var(--muted,#667085);line-height:1.45;}
  .wn-save{align-self:flex-start;font:inherit;font-size:12.5px;font-weight:700;border:1px dashed var(--periwinkle-deep);background:#fff;color:var(--periwinkle-deep);border-radius:9px;padding:6px 11px;cursor:pointer;}
  .wn-scrim{position:fixed;inset:0;background:rgba(22,24,28,.45);z-index:3000;display:grid;place-items:center;padding:16px;}
  .wn-modal{background:#fff;border-radius:16px;width:min(560px,100%);max-height:88vh;overflow:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 24px 60px rgba(16,24,40,.3);}
  .wn-mh{display:flex;justify-content:space-between;align-items:flex-start;} .wn-mh>div{display:flex;flex-direction:column;} .wn-mh b{font-family:var(--serif);font-weight:500;font-size:22px;} .wn-mh span{font-size:12.5px;color:var(--muted);} .wn-x{border:0;background:none;font-size:24px;color:var(--muted);cursor:pointer;}
  .wn-sm{margin:0;font-size:13px;color:var(--ink-2,#475467);} .wn-list{display:flex;flex-direction:column;gap:10px;}
  .wn-row,.wn-new{display:flex;flex-direction:column;gap:6px;border:1px solid var(--line-soft,#e4e7ec);border-radius:12px;padding:10px 12px;} .wn-new{border-style:dashed;}
  .wn-row textarea,.wn-new textarea{font:inherit;font-size:13.5px;border:1px solid var(--line-soft,#d0d5dd);border-radius:9px;padding:8px 10px;resize:vertical;}
  .wn-ra{display:flex;justify-content:space-between;align-items:center;gap:10px;} .wn-def{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink-2);} .wn-def input{accent-color:var(--periwinkle-deep);}
  .wn-row small{font-size:11.5px;color:var(--muted);} .wn-mf{display:flex;justify-content:flex-end;}
  .wn-btn{font:inherit;font-size:13px;font-weight:700;border:1.5px solid var(--line-soft,#d0d5dd);background:#fff;border-radius:10px;padding:7px 13px;cursor:pointer;} .wn-btn.pri{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;}
  .wn-f{display:flex;flex-direction:column;gap:4px;} .wn-f>span{font-size:11.5px;font-weight:700;color:var(--ink-2,#344054);} .wn-f input{font:inherit;font-size:13.5px;font-weight:600;border:1px solid var(--line-soft,#d0d5dd);border-radius:9px;padding:7px 10px;}
  .wn-full{margin:0;font-size:12.5px;color:var(--muted,#667085);line-height:1.45;background:var(--paper,#f9fafb);border-radius:8px;padding:7px 9px;} .wn-card li span{color:var(--muted,#667085);font-size:12.5px;}
  .wn-chip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;}
  .wn-card{border:1px solid var(--line-soft,#e4e7ec);border-radius:14px;padding:12px 14px;background:#fff;margin:14px 0;display:flex;flex-direction:column;gap:8px;} .wn-card ul{margin:0;padding-left:18px;font-size:13px;color:var(--ink-2);line-height:1.55;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {settings,drafts,draftAdd,draftUpd,draftDel,titleOf,list,add,update,remove,defaults,pickerHTML,wirePicker,manager,storeCardHTML};
})();
