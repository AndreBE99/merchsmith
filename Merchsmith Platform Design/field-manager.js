/* ============================================================
   field-manager.js — "Product fields" manager. Runs down the
   whole canonical field registry (MSFIELDS) grouped by where it
   displays, and lets the operator ADD a custom mapping field
   (label · type · visibility · pane section · unit · required).
   Custom fields are removable; built-ins are read-only.

   window.MSFieldManager.open(onChange?)  — modal dialog.
   ============================================================ */
(function(){
  if(!window.MSFIELDS) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let onChangeCb=null;

  function open(onChange){
    onChangeCb=onChange||null;
    let pk=document.getElementById('fmModal'); if(!pk){ pk=document.createElement('div'); pk.id='fmModal'; pk.className='fm-scrim'; document.body.appendChild(pk); }
    render(pk);
    requestAnimationFrame(()=>pk.classList.add('open'));
    pk.onclick=e=>{ if(e.target===pk||e.target.closest('[data-fmx]')) close(); };
  }
  function close(){ const pk=document.getElementById('fmModal'); if(pk){ pk.classList.remove('open'); setTimeout(()=>pk.remove(),180); } }

  const TYPEBADGE={text:'Text',number:'Number',price:'£',breaks:'Breaks',colour:'Colours',cert:'Certs',url:'URL',date:'Date',list:'List'};
  const VISBADGE={both:'Customer + dist.',distributor:'Distributor',customer:'Customer'};

  function render(pk){
    const SEC=MSFIELDS.SECTIONS; const all=MSFIELDS.all();
    const secBlock=Object.keys(SEC).map(sk=>{
      const fields=all.filter(f=>(f.section||'data')===sk); if(!fields.length) return '';
      return `<div class="fm-sec"><h4>${esc(SEC[sk])} <span>${fields.length}</span></h4>
        <div class="fm-rows">${fields.map(f=>`<div class="fm-row ${f.builtin?'':'cust'}">
          <div class="fm-rmain"><b>${esc(f.label)}</b><code>${esc(f.key)}</code></div>
          <div class="fm-rmeta">
            <span class="fm-tag t-${f.type}">${esc(TYPEBADGE[f.type]||f.type)}</span>
            <span class="fm-tag vis">${esc(VISBADGE[f.vis]||f.vis)}</span>
            ${f.unit?`<span class="fm-unit">${esc(f.unit)}</span>`:''}
            ${f.required?'<span class="fm-req">required</span>':''}
            ${f.builtin?'<span class="fm-builtin">built-in</span>':`<button class="fm-del" data-fmdel="${esc(f.key)}" title="Remove">×</button>`}
          </div></div>`).join('')}</div></div>`;
    }).join('');

    const typeOpts=Object.keys(MSFIELDS.TYPES).map(t=>`<option value="${t}">${esc(MSFIELDS.TYPES[t].label)}</option>`).join('');
    const visOpts=Object.keys(MSFIELDS.VIS).map(v=>`<option value="${v}">${esc(MSFIELDS.VIS[v])}</option>`).join('');
    const secOpts=Object.keys(SEC).map(s=>`<option value="${s}" ${s==='extra'?'selected':''}>${esc(SEC[s])}</option>`).join('');

    pk.innerHTML=`<div class="fm-modal">
      <div class="fm-hd"><div><h3>Product fields</h3><span>The canonical fields every feed maps into, every product carries, and the distributor pane + customer page display.</span></div><button class="fm-x" data-fmx>×</button></div>
      <div class="fm-body">
        <div class="fm-list">${secBlock}</div>
        <div class="fm-add">
          <h4>Add a custom field</h4>
          <p class="fm-addsub">Create a field the platform doesn't have yet. It appears in the import mapping, on products, and in its chosen display location.</p>
          <label class="fm-f"><span>Field name</span><input id="fmLabel" placeholder="e.g. Battery capacity"></label>
          <div class="fm-grid2">
            <label class="fm-f"><span>Type</span><select id="fmType">${typeOpts}</select></label>
            <label class="fm-f"><span>Unit / format hint</span><input id="fmUnit" placeholder="e.g. mAh, cm, kg"></label>
          </div>
          <div class="fm-grid2">
            <label class="fm-f"><span>Who sees it</span><select id="fmVis">${visOpts}</select></label>
            <label class="fm-f"><span>Displays in</span><select id="fmSec">${secOpts}</select></label>
          </div>
          <label class="fm-chk"><input type="checkbox" id="fmReq"> Required for import</label>
          <button class="btn" id="fmAdd">＋ Add field</button>
          <div class="fm-addnote" id="fmAddNote"></div>
        </div>
      </div>
    </div>`;

    pk.querySelectorAll('[data-fmdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Remove the custom field “'+b.dataset.fmdel+'”?'))return; MSFIELDS.removeField(b.dataset.fmdel); render(pk); fire(); });
    pk.querySelector('#fmAdd').onclick=()=>{
      const label=pk.querySelector('#fmLabel').value.trim();
      if(!label){ pk.querySelector('#fmAddNote').textContent='Give the field a name.'; return; }
      const f=MSFIELDS.addField({ label, type:pk.querySelector('#fmType').value, unit:pk.querySelector('#fmUnit').value.trim(),
        vis:pk.querySelector('#fmVis').value, section:pk.querySelector('#fmSec').value, required:pk.querySelector('#fmReq').checked,
        displayCustomer:pk.querySelector('#fmVis').value!=='distributor' });
      render(pk); fire();
      const note=document.getElementById('fmAddNote'); if(note){ note.textContent='Added “'+f.label+'” ('+f.key+'). Map it from a feed field in the import wizard.'; note.classList.add('ok'); }
    };
  }
  function fire(){ if(typeof onChangeCb==='function') try{ onChangeCb(); }catch(e){} }

  (function(){ if(document.getElementById('fm-style'))return; const st=document.createElement('style'); st.id='fm-style'; st.textContent=`
    .fm-scrim{position:fixed;inset:0;background:rgba(22,24,28,.55);backdrop-filter:blur(3px);z-index:300;opacity:0;transition:opacity .2s;display:flex;align-items:flex-start;justify-content:center;padding:34px 20px;overflow-y:auto;}
    .fm-scrim.open{opacity:1;}
    .fm-modal{background:var(--paper,#fff);border-radius:18px;width:min(940px,100%);box-shadow:0 30px 80px rgba(20,22,45,.35);}
    .fm-hd{display:flex;align-items:flex-start;gap:14px;padding:20px 24px 16px;border-bottom:1px solid var(--line-soft);}
    .fm-hd h3{margin:0;font-family:var(--serif);font-weight:500;font-size:22px;}
    .fm-hd span{font-size:12.5px;color:var(--muted);display:block;margin-top:3px;max-width:600px;line-height:1.5;}
    .fm-x{margin-left:auto;border:0;background:none;font-size:24px;line-height:1;color:var(--muted);cursor:pointer;}
    .fm-body{display:grid;grid-template-columns:1fr 320px;gap:0;}
    .fm-list{padding:18px 24px;max-height:70vh;overflow-y:auto;}
    .fm-sec{margin-bottom:18px;}
    .fm-sec h4{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3,#6b6f76);margin:0 0 9px;display:flex;align-items:center;gap:7px;}
    .fm-sec h4 span{background:var(--paper-2,#f0f0f5);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--muted);}
    .fm-rows{display:flex;flex-direction:column;gap:5px;}
    .fm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border:1px solid var(--line-soft);border-radius:9px;padding:8px 12px;}
    .fm-row.cust{border-color:var(--periwinkle,#9aa3d8);background:var(--tint-peri,#f3f4fc);}
    .fm-rmain{display:flex;flex-direction:column;gap:1px;min-width:0;}
    .fm-rmain b{font-size:13px;} .fm-rmain code{font-size:10.5px;color:var(--muted);font-family:ui-monospace,monospace;}
    .fm-rmeta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
    .fm-tag{font-size:10.5px;font-weight:700;border-radius:6px;padding:2px 7px;background:var(--paper-2,#f0f0f5);color:var(--ink-2,#55524a);}
    .fm-tag.vis{background:#eef;color:#4b54a6;}
    .fm-unit{font-size:10.5px;color:var(--muted);font-family:ui-monospace,monospace;}
    .fm-req{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:#b02a4f;}
    .fm-builtin{font-size:9.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;font-weight:700;}
    .fm-del{border:0;background:none;color:#b02a4f;font-size:17px;line-height:1;cursor:pointer;padding:0 2px;}
    .fm-add{padding:18px 22px;border-left:1px solid var(--line-soft);background:var(--paper-2,#faf9fc);border-radius:0 18px 18px 0;}
    .fm-add h4{margin:0 0 4px;font-size:15px;font-family:var(--serif);font-weight:500;}
    .fm-addsub{font-size:12px;color:var(--muted);line-height:1.5;margin:0 0 14px;}
    .fm-f{display:flex;flex-direction:column;gap:4px;margin-bottom:11px;}
    .fm-f span{font-size:11.5px;font-weight:700;color:var(--ink-2,#55524a);}
    .fm-f input,.fm-f select{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:#fff;}
    .fm-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    .fm-chk{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-2);margin:2px 0 14px;}
    .fm-add .btn{width:100%;justify-content:center;}
    .fm-addnote{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5;} .fm-addnote.ok{color:var(--green-deep,#1f8a5b);}
    @media(max-width:760px){.fm-body{grid-template-columns:1fr;}.fm-add{border-left:0;border-top:1px solid var(--line-soft);border-radius:0 0 18px 18px;}}
  `; document.head.appendChild(st); })();

  window.MSFieldManager={ open };
})();
