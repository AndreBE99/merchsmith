/* ============================================================
   admin-logos.js — platform logo upload for Merchsmith Admin →
   Settings → Logos. Mirrors the Distributor Settings logo tool:
   header + PDF logo slots (image-slot), tone toggle (original /
   mono white / mono black), pop-out crop, remove. Persists to the
   same platform-wide keys (ms-brand-logo / ms-pdf-logo + tone), so
   uploads show wherever the lockup is used.
   Self-contained: guards MSTheme / MSID (optional on this page).
   ============================================================ */
(function(){
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return (m)=>{ if(!el)return; if(m)el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2200); }; })();
  // Platform Admin (SaaS operator = Merchsmith) logo — its OWN keys, SEPARATE from
  // the distributor's brand logo (ms-brand-logo/ms-pdf-logo, read by identity.js
  // for the distributor lockup + store). Uploading here must NOT touch the
  // distributor's logo, and vice-versa.
  const LOGO_KEYS={'ms-admin-header-logo':'ms-platform-logo','ms-admin-pdf-logo':'ms-platform-pdf-logo'};
  const TONE_KEYS={'ms-admin-header-logo':'ms-platform-logo-tone','ms-admin-pdf-logo':'ms-platform-pdf-logo-tone'};
  let _reconciling=false; // suppress the change handler while we re-seed a slot from store
  function broadcastLogo(){ applyHeaderLogo(); try{ if(window.MSID&&MSID.relock) MSID.relock(); }catch(e){} try{ if(window.MSTheme&&MSTheme.persist) MSTheme.persist(); }catch(e){} }
  // swap the Admin sidebar brand (mark + wordmark) for the uploaded platform header logo
  let _brandOrig=null;
  function applyHeaderLogo(){
    const brand=document.querySelector('.aside-brand'); if(!brand) return;
    if(_brandOrig==null) _brandOrig=brand.innerHTML;
    let url=null,tone='original'; try{ url=localStorage.getItem('ms-platform-logo'); tone=localStorage.getItem('ms-platform-logo-tone')||'original'; }catch(e){}
    if(url){ const filt= tone==='black'?'filter:brightness(0);' : tone==='original'?'' : 'filter:brightness(0) invert(1);';
      brand.innerHTML=`<img class="aside-logoimg" src="${url}" alt="Platform logo" style="max-height:38px;max-width:185px;width:auto;height:auto;display:block;${filt}">`;
    } else { brand.innerHTML=_brandOrig; }
  }

  injectStyle();

  // The Platform Admin (operator) logo lives in localStorage (ms-platform-logo /
  // ms-platform-pdf-logo) — its own scope, distinct from the distributor's
  // ms-brand-logo. The Admin slots use private sidecar ids (ms-admin-*) so they
  // never share state with the Distributor Settings logo box. seedSlots() makes
  // the box reflect the current platform logo: if the slot's sidecar differs from
  // the store, clear the (private) sidecar and fall back to src= so what you see
  // matches the header.
  function seedSlots(){
    Object.keys(LOGO_KEYS).forEach(id=>{
      const slot=document.getElementById(id); if(!slot) return;
      let url=null,tone='original'; try{ url=localStorage.getItem(LOGO_KEYS[id])||''; tone=localStorage.getItem('ms-logo-tone-'+id)||localStorage.getItem(TONE_KEYS[id])||'original'; }catch(e){}
      const shown=slot._userUrl||slot.getAttribute('src')||'';
      if(url && shown!==url){
        _reconciling=true;
        const rm=slot.shadowRoot&&slot.shadowRoot.querySelector('[data-act="clear"]'); if(rm) rm.click();
        slot.setAttribute('src', url);
        setTimeout(()=>{ _reconciling=false; }, 60);
      } else if(!url && shown){
        _reconciling=true; const rm=slot.shadowRoot&&slot.shadowRoot.querySelector('[data-act="clear"]'); if(rm) rm.click(); slot.removeAttribute('src'); setTimeout(()=>{ _reconciling=false; }, 60);
      }
      // apply saved tone to the drop wrapper
      const dropWrap=slot.closest('.logoslot-drop'); if(dropWrap){ dropWrap.classList.remove('mono-white','mono-black'); if(tone!=='original') dropWrap.classList.add('mono-'+tone); }
    });
  }

  function wire(){
    wireColourways();
    if(!document.getElementById('ms-admin-header-logo')) return; // settings panel not present
    seedSlots();
    // crop buttons → pop-out cropper (shares the slot id, so the crop persists)
    document.querySelectorAll('[data-crop-logo]').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.cropLogo; const slot=document.getElementById(id);
      if(!slot || !slot.hasAttribute('data-filled')){ toast('Upload a logo first'); return; }
      openCrop(id, btn.closest('.logoslot').querySelector('.logoslot-lbl').textContent);
    });
    // persist on upload/change (ignore changes we trigger ourselves while re-seeding)
    document.querySelectorAll('.logoslot image-slot').forEach(slot=>{
      slot.addEventListener('ms-slot-change',e=>{ if(_reconciling)return; const key=LOGO_KEYS[slot.id]; if(!key)return; try{ if(e.detail&&e.detail.url) localStorage.setItem(key,e.detail.url); else localStorage.removeItem(key); }catch(_){} broadcastLogo(); toast('Logo saved'); });
    });
    // remove
    document.querySelectorAll('[data-del-logo]').forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.delLogo; const slot=document.getElementById(id);
      if(slot){ const rm=slot.shadowRoot&&slot.shadowRoot.querySelector('[data-act="clear"]'); if(rm){ rm.click(); } }
      try{ localStorage.setItem(LOGO_KEYS[id],''); localStorage.setItem(TONE_KEYS[id],'original'); localStorage.setItem('ms-logo-tone-'+id,'original'); }catch(e){}
      const grp=document.querySelector('.logomono[data-for="'+id+'"]'); if(grp){ grp.querySelectorAll('.logomono-btn').forEach(x=>x.classList.toggle('on',x.dataset.mono==='original')); }
      const dropWrap=slot?slot.closest('.logoslot-drop'):null; if(dropWrap) dropWrap.classList.remove('mono-white','mono-black');
      broadcastLogo(); toast('Logo removed');
    });
    // tone toggles
    document.querySelectorAll('.logomono').forEach(grp=>{
      const drop=document.querySelector('.logoslot-drop image-slot#'+grp.dataset.for);
      const dropWrap=drop?drop.closest('.logoslot-drop'):null;
      const toneKey=TONE_KEYS[grp.dataset.for]||null;
      grp.querySelectorAll('.logomono-btn').forEach(b=>b.onclick=()=>{
        grp.querySelectorAll('.logomono-btn').forEach(x=>x.classList.toggle('on',x===b));
        if(dropWrap){ dropWrap.classList.remove('mono-white','mono-black'); if(b.dataset.mono!=='original') dropWrap.classList.add('mono-'+b.dataset.mono); }
        try{ localStorage.setItem('ms-logo-tone-'+grp.dataset.for, b.dataset.mono); if(toneKey) localStorage.setItem(toneKey, b.dataset.mono); }catch(e){}
        broadcastLogo(); toast('Tone updated');
      });
      try{ const saved=localStorage.getItem('ms-logo-tone-'+grp.dataset.for); if(saved){ const t=grp.querySelector('[data-mono="'+saved+'"]'); if(t) t.click(); } }catch(e){}
    });
  }

  /* ---- self-contained crop modal (plain <img>+transform; NO image-slot, so it
         can't collide on a duplicate id or loop the component's shared subs) ---- */
  let cropRoot=null, cropId=null, cropView=null, cropImg=null, cropVP={w:480,h:120};
  function openCrop(id, label){
    cropId=id;
    let url=null,tone='original'; try{ url=localStorage.getItem(LOGO_KEYS[id])||''; tone=localStorage.getItem('ms-logo-tone-'+id)||'original'; }catch(e){}
    // fall back to whatever the slot is actually showing if storage diverges
    if(!url){ const slot=document.getElementById(id); if(slot) url=slot._userUrl||slot.getAttribute('src')||''; }
    if(!url){ toast('Upload a logo first'); return; }
    cropVP = id==='ms-admin-header-logo' ? {w:480,h:120} : {w:480,h:160};
    const filt = tone==='white'?'filter:brightness(0) invert(1);':tone==='black'?'filter:brightness(0);':'';
    if(!cropRoot){ cropRoot=document.createElement('div'); cropRoot.className='crop-scrim'; cropRoot.innerHTML='<div class="crop-modal" role="dialog"></div>'; document.body.appendChild(cropRoot); cropRoot.addEventListener('click',e=>{ if(e.target===cropRoot) closeCrop(false); }); }
    cropRoot.querySelector('.crop-modal').innerHTML=`
      <div class="crop-hd"><b>Crop — ${label}</b><button class="crop-x" type="button" aria-label="Close">×</button></div>
      <div class="crop-vp ${tone==='white'?'dark':''}" style="width:${cropVP.w}px;height:${cropVP.h}px"><img class="crop-img" alt="" draggable="false" style="${filt}"></div>
      <p class="crop-hint">Drag to reposition · scroll to zoom. Applies to the logo everywhere it appears.</p>
      <div class="crop-foot"><button class="btn ghost" type="button" id="cropReset">Reset</button><button class="btn" type="button" id="cropDone">Apply crop</button></div>`;
    cropImg=cropRoot.querySelector('.crop-img');
    cropView={scale:1,tx:0,ty:0};
    cropRoot.classList.add('open'); document.body.style.overflow='hidden';
    cropRoot.querySelector('.crop-x').onclick=()=>closeCrop(false);
    cropRoot.querySelector('#cropDone').onclick=()=>closeCrop(true);
    cropRoot.querySelector('#cropReset').onclick=()=>{ cropView={scale:1,tx:0,ty:0}; renderCrop(); };
    cropImg.onload=()=>{ cropView={scale:1,tx:0,ty:0}; renderCrop(); };
    cropImg.src=url;
    if(cropImg.complete && cropImg.naturalWidth) renderCrop();
    bindCropDrag();
  }
  function baseFit(){ const iw=cropImg.naturalWidth||1, ih=cropImg.naturalHeight||1; return Math.min(cropVP.w/iw, cropVP.h/ih); }
  function renderCrop(){ if(!cropImg||!cropView)return; const iw=cropImg.naturalWidth||0, ih=cropImg.naturalHeight||0; if(!iw||!ih)return;
    const k=baseFit()*cropView.scale; const dw=iw*k, dh=ih*k;
    cropImg.style.width=dw+'px'; cropImg.style.height=dh+'px';
    cropImg.style.left=(cropVP.w/2+cropView.tx-dw/2)+'px'; cropImg.style.top=(cropVP.h/2+cropView.ty-dh/2)+'px'; }
  function bindCropDrag(){ const vp=cropRoot.querySelector('.crop-vp');
    vp.onpointerdown=e=>{ if(e.button!==0)return; e.preventDefault(); const sx=e.clientX, sy=e.clientY, ox=cropView.tx, oy=cropView.ty; vp.setPointerCapture(e.pointerId);
      const mv=ev=>{ cropView.tx=ox+(ev.clientX-sx); cropView.ty=oy+(ev.clientY-sy); renderCrop(); };
      const up=()=>{ vp.removeEventListener('pointermove',mv); vp.removeEventListener('pointerup',up); }; vp.addEventListener('pointermove',mv); vp.addEventListener('pointerup',up); };
    vp.onwheel=e=>{ e.preventDefault(); const prev=cropView.scale; const next=Math.max(0.2,Math.min(8, prev*Math.pow(1.0015,-e.deltaY))); if(next===prev)return;
      const r=vp.getBoundingClientRect(); const cx=e.clientX-r.left-cropVP.w/2, cy=e.clientY-r.top-cropVP.h/2; const f=next/prev;
      cropView.tx=cx-(cx-cropView.tx)*f; cropView.ty=cy-(cy-cropView.ty)*f; cropView.scale=next; renderCrop(); };
  }
  function closeCrop(apply){
    if(!cropRoot) return;
    if(apply && cropImg && cropView && cropImg.naturalWidth>0){
      try{
        const iw=cropImg.naturalWidth||1, ih=cropImg.naturalHeight||1; const SCALE=3;
        const k=baseFit()*cropView.scale; const dw=iw*k, dh=ih*k;
        const cv=document.createElement('canvas'); cv.width=Math.round(cropVP.w*SCALE); cv.height=Math.round(cropVP.h*SCALE);
        const ctx=cv.getContext('2d'); ctx.scale(SCALE,SCALE);
        ctx.drawImage(cropImg, cropVP.w/2+cropView.tx-dw/2, cropVP.h/2+cropView.ty-dh/2, dw, dh);
        const out=cv.toDataURL('image/png');
        // only persist a real, non-trivial PNG — never overwrite a logo with a blank
        if(out && out.length>200){ const key=LOGO_KEYS[cropId]; if(key) localStorage.setItem(key,out); }
      }catch(e){}
    }
    cropRoot.classList.remove('open'); document.body.style.overflow='';
    cropImg=null; cropView=null;
    if(apply){ seedSlots(); broadcastLogo(); toast('Crop applied'); }
  }

  function injectStyle(){ if(document.getElementById('admin-logos-style'))return; const st=document.createElement('style'); st.id='admin-logos-style'; st.textContent=`
    .logogrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
    @media(max-width:760px){.logogrid{grid-template-columns:1fr;}}
    .logoslot{display:flex;flex-direction:column;gap:7px;}
    .logoslot-lbl{font-size:12px;font-weight:700;color:var(--ink-3,#6b6f76);}
    .logoslot-drop{height:120px;border:1.5px dashed var(--line-soft);border-radius:12px;overflow:hidden;background:var(--paper,#fff);}
    .logoslot-drop image-slot{width:100%;height:100%;display:block;}
    .logoslot-drop.mono-white{background:var(--ink,#23231f);}
    .logoslot-drop.mono-white image-slot{filter:brightness(0) invert(1);}
    .logoslot-drop.mono-black image-slot{filter:brightness(0);}
    .logoslot-hint{font-size:11.5px;color:var(--muted);line-height:1.45;}
    .logomono{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .logomono>span{font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);margin-right:2px;}
    .logomono-btn{font:inherit;font-size:11.5px;font-weight:700;border:1px solid var(--line-soft);background:#fff;color:var(--ink-2);border-radius:7px;padding:5px 10px;cursor:pointer;}
    .logomono-btn.on{background:var(--periwinkle-deep);border-color:var(--periwinkle-deep);color:#fff;}
    .logodel{font:inherit;font-size:11.5px;font-weight:700;border:0;background:none;color:var(--muted);cursor:pointer;text-decoration:underline;}
    .logodel[data-crop-logo]{margin-left:auto;color:var(--periwinkle-deep);}
    .logodel:hover{color:var(--flare,#c0395f);}
    .crop-scrim{position:fixed;inset:0;background:rgba(22,24,28,.55);backdrop-filter:blur(3px);z-index:340;display:none;align-items:center;justify-content:center;padding:24px;}
    .crop-scrim.open{display:flex;}
    .crop-modal{background:var(--paper,#fff);border-radius:16px;width:min(560px,100%);box-shadow:0 30px 80px rgba(20,22,45,.4);overflow:hidden;}
    .crop-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 0;}
    .crop-hd b{font-family:var(--serif);font-weight:500;font-size:18px;}
    .crop-x{border:0;background:none;font-size:24px;line-height:1;color:var(--muted);cursor:pointer;}
    .crop-vp{position:relative;margin:16px auto 0;border-radius:12px;overflow:hidden;touch-action:none;cursor:grab;background:var(--paper-2,#f6f6fb);background-image:linear-gradient(45deg,#e9e7e1 25%,transparent 25%),linear-gradient(-45deg,#e9e7e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9e7e1 75%),linear-gradient(-45deg,transparent 75%,#e9e7e1 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0;}
    .crop-vp:active{cursor:grabbing;}
    .crop-vp.dark{background:var(--ink,#23231f);}
    .crop-img{position:absolute;left:0;top:0;max-width:none;user-select:none;-webkit-user-drag:none;pointer-events:none;}
    .crop-hint{font-size:12px;color:var(--muted);text-align:center;margin:11px 20px 0;line-height:1.45;}
    .crop-foot{display:flex;justify-content:flex-end;padding:14px 20px 18px;}
    .cwsets{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
    .cwset{border:1.5px solid var(--line-soft);border-radius:13px;padding:14px;cursor:pointer;background:#fff;position:relative;transition:border-color .14s,box-shadow .14s;}
    .cwset:hover{border-color:var(--periwinkle);}
    .cwset.on{border-color:var(--periwinkle-deep);box-shadow:0 0 0 1.5px var(--periwinkle-deep) inset;}
    .cwset-hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;}
    .cwset-hd b{font-size:14px;} .cwset-name{font:inherit;font-size:14px;font-weight:700;border:1px solid transparent;border-radius:6px;padding:2px 5px;background:none;min-width:0;width:100%;}
    .cwset-name:hover{border-color:var(--line-soft);} .cwset-name:focus{outline:none;border-color:var(--periwinkle-deep);}
    .cwset-tick{color:var(--periwinkle-deep);font-weight:800;opacity:0;flex:none;} .cwset.on .cwset-tick{opacity:1;}
    .cwset-sw{display:flex;gap:6px;margin-bottom:9px;} .cwset-sw i{width:26px;height:26px;border-radius:7px;border:1px solid rgba(0,0,0,.1);}
    .cwset-tag{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);}
    .cwset-del,.cwset-edit{position:absolute;top:8px;border:0;background:none;cursor:pointer;font-size:15px;line-height:1;color:var(--muted);opacity:0;transition:opacity .12s;}
    .cwset-del{right:8px;} .cwset-edit{right:30px;font-size:13px;} .cwset:hover .cwset-del,.cwset:hover .cwset-edit{opacity:1;}
    .cwset-del:hover{color:var(--flare,#c0395f);} .cwset-edit:hover{color:var(--periwinkle-deep);}
    .cwform{margin-top:18px;border-top:1px solid var(--line-soft);padding-top:18px;}
    .cwform-h{font-size:14px;font-weight:800;margin-bottom:12px;}
    .cwfrow{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;max-width:320px;}
    .cwfrow label{font-size:12px;font-weight:700;color:var(--ink-2);}
    .cwfrow input{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 11px;background:#fff;}
    .cwfields{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;}
    .cwfield{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--ink-2);}
    .cwfield input[type=color]{width:100%;height:38px;border:1.5px solid var(--line-soft);border-radius:9px;background:#fff;cursor:pointer;padding:3px;}
  `; document.head.appendChild(st); }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ applyHeaderLogo(); wire(); }); else { applyHeaderLogo(); wire(); }
  // re-wire if the settings panel is (re)rendered
  document.addEventListener('click',e=>{ if(e.target.closest('[data-nav="settings"]')) setTimeout(wire,60); });

  /* ============================================================
     Platform colourway — colour set picker (mirrors Distributor)
     ============================================================ */
  function wireColourways(){
    const T=window.MSTheme; const setsEl=document.getElementById('cwSets'); if(!T||!setsEl) return;
    const form=document.getElementById('cwForm');
    const toHex=c=>{ if(!c)return '#5860A6'; if(c[0]==='#')return c; const m=c.match(/\d+/g); return m?'#'+m.slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join(''):'#5860A6'; };
    let editingId=null;
    function render(){
      const cur=T.current(), list=T.allThemes(), customs=T.customThemes();
      setsEl.innerHTML=list.map(t=>{ const isCustom=customs.some(c=>c.id===t.id); const v=t.vars||{};
        const sw=[v['--periwinkle']||t.dot,v['--periwinkle-deep'],v['--periwinkle-ink'],v['--tint-peri']].filter(Boolean);
        return `<div class="cwset ${t.id===cur?'on':''} ${isCustom?'custom':''}" data-id="${t.id}">
          ${isCustom?`<button class="cwset-del" data-del="${t.id}" title="Delete">×</button><button class="cwset-edit" data-edit="${t.id}" title="Edit colours">✎</button>`:''}
          <div class="cwset-hd">${isCustom?`<input class="cwset-name" data-name="${t.id}" value="${(t.name||'').replace(/"/g,'&quot;')}">`:`<b>${t.name}</b>`}<span class="cwset-tick">✓</span></div>
          <div class="cwset-sw">${sw.map(c=>`<i style="background:${c}"></i>`).join('')}</div>
          <div class="cwset-tag">${isCustom?'Custom set':'Built-in'}</div>
        </div>`; }).join('');
      setsEl.querySelectorAll('.cwset').forEach(c=>c.onclick=e=>{ if(e.target.closest('[data-del]')||e.target.closest('[data-edit]')||e.target.closest('[data-name]'))return; T.set(c.dataset.id); render(); toast('Colourway applied'); });
      setsEl.querySelectorAll('[data-edit]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); editSet(b.dataset.edit); });
      setsEl.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this colour set?')){ T.removeCustom(b.dataset.del); render(); toast('Colour set deleted'); } });
      setsEl.querySelectorAll('[data-name]').forEach(inp=>{ inp.onclick=e=>e.stopPropagation(); inp.onchange=()=>{ const arr=T.customThemes(); const t=arr.find(x=>x.id===inp.dataset.name); if(t){ t.name=inp.value.trim()||t.name; try{ localStorage.setItem('ms-custom-themes',JSON.stringify(arr)); if(T.persist)T.persist(); }catch(e){} } render(); }; });
    }
    function setField(id,v){ const e=document.getElementById(id); if(e&&v)e.value=v; }
    function editSet(id){
      const t=T.allThemes().find(x=>x.id===id); if(!t||!form) return; const v=t.vars||{};
      setField('cwName',t.name); setField('cwPrimary',toHex(v['--periwinkle']||t.dot)); setField('cwDeep',toHex(v['--periwinkle-deep'])); setField('cwInk',toHex(v['--periwinkle-ink'])); setField('cwTint',toHex(v['--tint-peri']));
      editingId=id; const h=form.querySelector('.cwform-h'); if(h)h.textContent=T.customThemes().some(c=>c.id===id)?'Edit colour set':'Edit colour set (saves a copy)';
      form.hidden=false; render();
    }
    const addBtn=document.getElementById('cwAdd'); if(addBtn)addBtn.onclick=()=>{ editingId=null; const h=form.querySelector('.cwform-h'); if(h)h.textContent='New colour set'; form.hidden=!form.hidden; };
    const cancel=document.getElementById('cwCancel'); if(cancel)cancel.onclick=()=>{ form.hidden=true; editingId=null; };
    const saveBtn=document.getElementById('cwSave'); if(saveBtn)saveBtn.onclick=()=>{
      const name=(document.getElementById('cwName').value||'').trim()||'Custom set';
      const vars={'--periwinkle':document.getElementById('cwPrimary').value,'--periwinkle-deep':document.getElementById('cwDeep').value,'--periwinkle-ink':document.getElementById('cwInk').value,'--tint-peri':document.getElementById('cwTint').value};
      const isCustomEdit=editingId&&T.customThemes().some(c=>c.id===editingId);
      if(isCustomEdit){ T.updateCustom(editingId,{name,dot:vars['--periwinkle'],vars}); T.set(editingId); }
      else { const id=T.addCustom({name,dot:vars['--periwinkle'],vars}); T.set(id); }
      form.hidden=true; editingId=null; document.getElementById('cwName').value=''; render(); toast('Colour set saved');
    };
    render();
  }
})();
