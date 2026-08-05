/* ============================================================
   admin-product.js — manual "Add product" flow for a supplier
   (Platform admin). Opens from a supplier drawer's Catalogue
   section. Full product shape (matches the store feed). Stores
   into supplier.catalogue[] on window.ADMIN — self-contained mock.
   ============================================================ */
(function(){
  const A=window.ADMIN; if(!A) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2600); }; })();

  const DEPTS=['Bags','Clothing','Desk','Drinkware','Exhibition','Lifestyle','Notebooks','Outdoor','Tech','Writing'];
  const METHODS=[['screenprint','Screenprint'],['pad','Pad print'],['transfer','Transfer'],['dtf','DTF transfer'],['embroidery','Embroidery'],['laser','Laser engrave']];
  const COMMON_COLOURS=['Black','White','Navy','Grey','Natural','Green','Blue','Red'];

  function blank(){ return { name:'',model:'',brand:'',dept:'Tech',cat:'',blurb:'',
    colours:[], colourInput:'', sizes:['One size'], material:'', dimW:'',dimH:'',dimD:'',
    moq:'50', lead:'10', sustainability:7, isNew:true, recommended:false,
    breaks:[{q:'250',unit:''},{q:'500',unit:''},{q:'1000',unit:''}],
    methods:new Set(['screenprint']) }; }

  function valid(D){ return !!D.name.trim() && D.breaks.some(b=>+b.q>0 && +b.unit>0); }

  function commit(supId,D){
    const s=A.suppliers.find(x=>x.id===supId); if(!s) return null;
    const brks=D.breaks.filter(b=>+b.q>0&&+b.unit>0).map(b=>({q:+b.q,unit:+b.unit})).sort((a,b)=>a.q-b.q);
    const id=(D.name||'product').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Math.random().toString(36).slice(2,5);
    const p={ id, name:D.name.trim(), model:D.model.trim(), brand:D.brand.trim()||s.name,
      dept:D.dept, cat:D.cat.trim(), supplier:s.name, blurb:D.blurb.trim(),
      colours:D.colours.slice(), sizes:D.sizes.slice(), material:D.material.trim(),
      dims:{w:D.dimW,h:D.dimH,d:D.dimD}, moq:+D.moq||0, lead:+D.lead||0,
      sustainability:+D.sustainability, new:!!D.isNew, recommended:!!D.recommended,
      priceBreaks:brks, priceGuide:brks[0]?brks[0].unit:0, priceGuideQty:brks[0]?brks[0].q:0,
      printMethods:[...D.methods], img:'' };
    s.catalogue=s.catalogue||[]; s.catalogue.unshift(p);
    s.products=(s.products||0)+1;
    if(window.__adminRender) window.__adminRender();
    return p;
  }

  /* ---------- field builders ---------- */
  function chips(id,list,sel){ return `<div class="as-chips" data-pchips="${id}">${list.map(it=>{const [v,l]=Array.isArray(it)?it:[it,it];return `<button type="button" class="as-chip ${sel.has(v)?'on':''}" data-v="${v}">${l}</button>`;}).join('')}</div>`; }
  function tagList(D,key){ return `<div class="ap-tags" data-taglist="${key}">${D[key].map((c,i)=>`<span class="ap-tag">${esc(c)}<button type="button" data-tagdel="${key}:${i}">×</button></span>`).join('')}<input class="ap-taginput" data-taginput="${key}" placeholder="${key==='colours'?'Add colour…':'Add size…'}"></div>`; }
  function breaksTable(D){ return `<div class="ap-breaks"><div class="ap-brhead"><span>Qty from</span><span>Unit £ (blank cost)</span><span></span></div>
    ${D.breaks.map((b,i)=>`<div class="ap-brrow" data-brrow="${i}"><input data-br="${i}:q" type="number" min="1" value="${esc(b.q)}" placeholder="250"><input data-br="${i}:unit" type="number" min="0" step="0.01" value="${esc(b.unit)}" placeholder="0.00"><button type="button" class="as-udel" data-brdel="${i}">×</button></div>`).join('')}
    <button type="button" class="as-add" data-braddrow><svg class="icn" style="width:15px;height:15px"><path d="M12 5v14M5 12h14"/></svg>Add break</button></div>`; }

  function open(supId){
    const s=A.suppliers.find(x=>x.id===supId); if(!s) return;
    const D=blank(); if(s.name) D.brand=s.name;
    const wrap=document.createElement('div'); wrap.className='as-drawerscrim ap-scrim';
    wrap.innerHTML=`<div class="as-drawer ap-drawer"><div class="as-dhead"><div><h2>Add product</h2><span>to ${esc(s.name)} · manual entry</span></div><button class="dwr-x" data-fx>×</button></div>
      <div class="as-dbody" id="apBody"></div>
      <div class="as-dfoot"><button class="btn ghost" data-fx>Cancel</button><button class="btn" id="apSave">Add product</button></div></div>`;
    document.body.appendChild(wrap); document.body.style.overflow='hidden';
    requestAnimationFrame(()=>wrap.classList.add('open'));
    const close=()=>{ wrap.classList.remove('open'); setTimeout(()=>{ wrap.remove(); document.body.style.overflow=''; },240); };
    wrap.addEventListener('click',e=>{ if(e.target===wrap||e.target.closest('[data-fx]')) close(); });

    function render(){
      document.getElementById('apBody').innerHTML=`
        <div class="as-sec"><h4>Basics</h4>
          <label class="fm-f"><span>Product name</span><input data-f="name" value="${esc(D.name)}" placeholder="e.g. Recycled Cotton Tote"></label>
          <div class="as-row2"><label class="fm-f"><span>Model / range</span><input data-f="model" value="${esc(D.model)}" placeholder="e.g. GRS Tote"></label><label class="fm-f"><span>Brand</span><input data-f="brand" value="${esc(D.brand)}" placeholder="Brand"></label></div>
          <div class="as-row2"><label class="fm-f"><span>Department</span><select data-f="dept">${DEPTS.map(d=>`<option ${D.dept===d?'selected':''}>${d}</option>`).join('')}</select></label><label class="fm-f"><span>Category</span><input data-f="cat" value="${esc(D.cat)}" placeholder="e.g. Shoppers"></label></div>
          <label class="fm-f"><span>Description</span><textarea class="as-ta" data-f="blurb" rows="2" placeholder="Short marketing blurb…">${esc(D.blurb)}</textarea></label>
        </div>
        <div class="as-sec"><h4>Attributes</h4>
          <label class="fm-f"><span>Colours</span></label>${tagList(D,'colours')}
          <div class="ap-quickcol">${COMMON_COLOURS.map(c=>`<button type="button" class="ap-qc" data-quickcol="${c}">+ ${c}</button>`).join('')}</div>
          <label class="fm-f" style="margin-top:12px"><span>Sizes</span></label>${tagList(D,'sizes')}
          <div class="as-row2"><label class="fm-f"><span>Material</span><input data-f="material" value="${esc(D.material)}" placeholder="e.g. GRS recycled cotton"></label>
            <label class="fm-f"><span>Sustainability score</span><div class="ap-susr"><input type="range" min="0" max="10" data-f="sustainability" value="${D.sustainability}"><b id="apSusV">${D.sustainability}/10</b></div></label></div>
          <label class="fm-f"><span>Dimensions <em>w × h × d</em></span><div class="ap-dims"><input data-f="dimW" value="${esc(D.dimW)}" placeholder="W"><span>×</span><input data-f="dimH" value="${esc(D.dimH)}" placeholder="H"><span>×</span><input data-f="dimD" value="${esc(D.dimD)}" placeholder="D"></div></label>
          <div class="ap-flags"><label class="ap-flag"><input type="checkbox" data-flag="isNew" ${D.isNew?'checked':''}> New</label><label class="ap-flag"><input type="checkbox" data-flag="recommended" ${D.recommended?'checked':''}> Recommended</label></div>
        </div>
        <div class="as-sec"><h4>Pricing</h4>
          <div class="as-row2"><label class="fm-f"><span>MOQ</span><input data-f="moq" type="number" value="${esc(D.moq)}"></label><label class="fm-f"><span>Lead time (days)</span><input data-f="lead" type="number" value="${esc(D.lead)}"></label></div>
          <label class="fm-f"><span>Price breaks <em>supplier blank cost per unit</em></span></label>${breaksTable(D)}
        </div>
        <div class="as-sec"><h4>Branding</h4>
          <label class="fm-f"><span>Print methods available</span></label>${chips('methods',METHODS,D.methods)}
        </div>`;
      wire();
    }
    function wire(){
      const root=document.getElementById('apBody');
      root.querySelectorAll('[data-f]').forEach(el=>el.oninput=()=>{ const k=el.dataset.f; D[k]=el.value; if(k==='sustainability'){ const v=root.querySelector('#apSusV'); if(v)v.textContent=el.value+'/10'; } });
      root.querySelectorAll('[data-flag]').forEach(el=>el.onchange=()=>{ D[el.dataset.flag]=el.checked; });
      root.querySelectorAll('[data-pchips] .as-chip').forEach(b=>b.onclick=()=>{ const v=b.dataset.v; if(D.methods.has(v))D.methods.delete(v); else D.methods.add(v); b.classList.toggle('on',D.methods.has(v)); });
      // tag lists (colours / sizes)
      root.querySelectorAll('[data-taginput]').forEach(inp=>inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); const k=inp.dataset.taginput; const v=inp.value.trim(); if(v){ D[k].push(v); render(); setTimeout(()=>{ const ni=root.querySelector(`[data-taginput="${k}"]`); if(ni)ni.focus(); },0); } } });
      root.querySelectorAll('[data-tagdel]').forEach(b=>b.onclick=()=>{ const [k,i]=b.dataset.tagdel.split(':'); D[k].splice(+i,1); render(); });
      root.querySelectorAll('[data-quickcol]').forEach(b=>b.onclick=()=>{ const c=b.dataset.quickcol; if(!D.colours.includes(c)){ D.colours.push(c); render(); } });
      // price breaks
      root.querySelectorAll('[data-br]').forEach(el=>el.oninput=()=>{ const [i,k]=el.dataset.br.split(':'); D.breaks[+i][k]=el.value; });
      root.querySelectorAll('[data-brdel]').forEach(b=>b.onclick=()=>{ D.breaks.splice(+b.dataset.brdel,1); if(!D.breaks.length)D.breaks.push({q:'',unit:''}); render(); });
      const addrow=root.querySelector('[data-braddrow]'); if(addrow)addrow.onclick=()=>{ D.breaks.push({q:'',unit:''}); render(); };
    }
    document.getElementById('apSave').onclick=()=>{
      if(!valid(D)){ if(!D.name.trim()){ const i=document.querySelector('#apBody [data-f="name"]'); if(i)i.focus(); toast('Add a product name'); } else { toast('Add at least one price break (qty + unit £)'); } return; }
      const p=commit(supId,D); close(); toast(`“${p.name}” added to ${esc(s.name)}`); if(window.__openSupplier) window.__openSupplier(supId);
    };
    render();
  }

  /* ---------- delegated launch + delete from supplier drawer ---------- */
  document.addEventListener('click',e=>{
    const add=e.target.closest('[data-addproduct]'); if(add){ e.stopPropagation(); open(add.dataset.addproduct); return; }
    const del=e.target.closest('[data-delproduct]'); if(del){ e.stopPropagation(); const [sid,pid]=del.dataset.delproduct.split(':'); const s=A.suppliers.find(x=>x.id===sid); if(s&&s.catalogue){ s.catalogue=s.catalogue.filter(p=>p.id!==pid); s.products=Math.max(0,(s.products||1)-1); if(window.__adminRender)window.__adminRender(); if(window.__openSupplier)window.__openSupplier(sid); } return; }
  });

  /* ---------- styles ---------- */
  function injectCSS(){ if(document.getElementById('ap-style'))return; const s=document.createElement('style'); s.id='ap-style';
    s.textContent=`
    .ap-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;border:1.5px solid var(--line-soft);border-radius:10px;padding:7px;background:#fff;}
    .ap-tag{display:inline-flex;align-items:center;gap:5px;background:var(--tint-peri);color:var(--periwinkle-ink);border-radius:7px;padding:4px 6px 4px 9px;font-size:12.5px;font-weight:600;}
    .ap-tag button{border:0;background:none;font-size:14px;line-height:1;color:inherit;cursor:pointer;padding:0;}
    .ap-taginput{border:0;outline:0;font:inherit;font-size:13px;padding:4px;flex:1;min-width:90px;background:none;}
    .ap-quickcol{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;}
    .ap-qc{border:1px dashed var(--line);background:none;border-radius:7px;padding:4px 9px;font:inherit;font-size:11.5px;font-weight:700;color:var(--muted);cursor:pointer;}
    .ap-qc:hover{border-color:var(--periwinkle-deep);color:var(--periwinkle-deep);}
    .ap-susr{display:flex;align-items:center;gap:10px;}
    .ap-susr input{flex:1;accent-color:var(--periwinkle-deep);}
    .ap-susr b{font-size:13px;white-space:nowrap;}
    .ap-dims{display:flex;align-items:center;gap:7px;}
    .ap-dims input{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:9px 10px;background:#fff;width:100%;}
    .ap-dims span{color:var(--muted);}
    .ap-flags{display:flex;gap:18px;margin-top:4px;}
    .ap-flag{display:flex;align-items:center;gap:7px;font-size:13.5px;font-weight:600;color:var(--ink-2);}
    .ap-flag input{width:16px;height:16px;accent-color:var(--periwinkle-deep);}
    .ap-breaks{display:flex;flex-direction:column;gap:7px;}
    .ap-brhead,.ap-brrow{display:grid;grid-template-columns:1fr 1fr 34px;gap:8px;align-items:center;}
    .ap-brhead span{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;}
    .ap-brrow input{font:inherit;font-size:13.5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:8px 10px;background:#fff;}
    .ap-brrow input:focus{outline:0;border-color:var(--periwinkle-deep);}
    /* supplier-drawer catalogue list */
    .supprods{display:flex;flex-direction:column;gap:8px;}
    .supprod{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid var(--line-soft);border-radius:11px;padding:9px 12px;}
    .supprodimg{width:34px;height:34px;border-radius:8px;flex:none;display:grid;place-items:center;background:var(--paper-2);color:var(--ink-3);font-family:var(--serif);font-weight:600;font-size:15px;text-transform:uppercase;}
    .supprodm{flex:1;min-width:0;}
    .supprodm b{display:block;font-size:13.5px;}
    .supprodm span{display:block;font-size:12px;color:var(--muted);}
    .supprodp{font-size:14px;color:var(--ink);white-space:nowrap;}
    `;
    document.head.appendChild(s);
  }
  injectCSS();
  window.MSAddProduct={ open };
})();
