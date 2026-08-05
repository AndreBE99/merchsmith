/* ============================================================
   dist-storehome.js — Distributor "Store settings" panel.
   Lets the distributor show/hide, reorder and edit the copy of
   each section on their customer-facing store HOMEPAGE.
   Reads/writes the shared homepage config (window.MSHOME).
   Renders into #panel-storehome.
   ============================================================ */
(function(){
  if(!window.MSHOME) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast=(()=>{ let el=document.getElementById('toast'); if(!el){ el=document.createElement('div'); el.id='toast'; el.className='toast'; document.body.appendChild(el);} let t; return m=>{ el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();

  // which fields are editable per section, and how to render them
  const FIELDS={
    hero:[
      {k:'headline',t:'text',label:'Headline'},
      {k:'primaryText',t:'text',label:'Primary button label'},
      {k:'primaryHref',t:'text',label:'Primary button link'},
      {k:'ghostText',t:'text',label:'Secondary button label'},
      {k:'ghostHref',t:'text',label:'Secondary button link'},
      {k:'image',t:'text',label:'Hero image URL'},
      {k:'caption',t:'text',label:'Image caption'}
    ],
    usps:[{k:'items',t:'list',add:'trust badge',item:[{k:'icon',t:'icon',label:'Preset icon'},{k:'iconImg',t:'img',label:'Or upload icon'},{k:'b',label:'Title'},{k:'s',label:'Subtitle'}]}],
    marquee:[{k:'logos',t:'brandlogos',label:'Brand logos'}],
    statement:[
      {k:'pre',t:'text',label:'Text before highlight'},
      {k:'hl',t:'text',label:'Highlighted word'},
      {k:'post',t:'text',label:'Text after highlight'},
      {k:'linkText',t:'text',label:'Link label'},
      {k:'linkHref',t:'text',label:'Link URL'}
    ],
    bestsellers:[{k:'heading',t:'text',label:'Heading'},{k:'productIds',t:'curate',label:'Curated products'}],
    spotlight:[{k:'heading',t:'text',label:'Tag line'}],
    ecoband:[
      {k:'heading',t:'text',label:'Heading'},
      {k:'bg',t:'color',label:'Background colour',options:[['','Green (default)','#1f8a5b'],['#5860A6','Periwinkle','#5860A6'],['#222222','Ink','#222222'],['#6f7390','Slate','#6f7390']]},
      {k:'body',t:'textarea',label:'Body copy'},
      {k:'stats',t:'list',add:'stat',item:[{k:'b',label:'Figure'},{k:'s',label:'Label'}]}
    ],
    discover:[
      {k:'heading',t:'text',label:'Heading'},
      {k:'items',t:'list',add:'card',item:[{k:'title',label:'Title'},{k:'desc',label:'Description'},{k:'href',label:'Link'},{k:'img',t:'img',label:'Image'}]}
    ],
    brands:[
      {k:'heading',t:'text',label:'Heading'},
      {k:'items',t:'list',add:'brand',item:[{k:'b',label:'Brand'},{k:'s',label:'Tagline'},{k:'img',t:'img',label:'Image'}]}
    ],
    quotes:[{k:'items',t:'list',add:'quote',item:[{k:'quote',t:'textarea',label:'Quote'},{k:'by',label:'Attribution'}]}],
    recent:[{k:'heading',t:'text',label:'Heading'}],
    steps:[
      {k:'heading',t:'text',label:'Heading'},
      {k:'items',t:'list',add:'step',item:[{k:'b',label:'Step title'},{k:'p',label:'Description'}]}
    ],
    faq:[
      {k:'heading',t:'text',label:'Heading'},
      {k:'intro',t:'textarea',label:'Intro copy'},
      {k:'items',t:'list',add:'question',item:[{k:'q',label:'Question'},{k:'a',t:'textarea',label:'Answer'}]}
    ],
    newsletter:[{k:'heading',t:'text',label:'Heading'}]
  };
  const NOTE={ bestsellers:'Pick the exact products to feature, in order. Leave empty to auto-pick your best sellers by usage — Featured and Spotlight products get a placement boost automatically.',
    spotlight:'Shows products on the Spotlight placement tier (rotating if several). Nothing renders if no product is on Spotlight — or if your range is fully bespoke, which carries no promoted placements.',
    recent:'Products are chosen automatically from your live range (most recently added).' };
  // icon choices for trust badges (store SVG symbols)
  const ICONS=[['s-leaf','Leaf / eco'],['s-print','Proof / print'],['s-truck','Delivery'],['s-check','Check'],['s-bag','Bag'],['s-store','Store'],['s-search','Search'],['s-plus','Plus'],['s-arr','Arrow']];
  // product list for the best-seller curation picker (from the live catalogue)
  function productList(){ try{ if(window.MSCAT){ const r=(MSCAT.distRange?MSCAT.distRange():[])||[]; const src=(r&&r.length)?r:(MSCAT.all?MSCAT.all():[]); return (src||[]).map(p=>({id:p.id,name:p.name})); } }catch(e){} return []; }
  const slugify=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  // resolve a stored image value (data URL, http URL, asset path, or keyword) to a display src
  function imgSrc(v){ if(!v) return ''; if(/^(https?:|data:image\/|assets\/)/.test(v)) return v; return 'assets/products/'+v+'.png'; }

  let open=null; // currently expanded section id
  function panel(){ return document.getElementById('panel-storehome'); }

  function subInput(secId,listKey,i,it,sf){
    const dh=`${secId}:${listKey}:${i}:${sf.k}`; const v=it[sf.k]||'';
    if(sf.t==='textarea') return `<label class="sh-fl sh-flsm">${esc(sf.label)}<textarea class="sh-in" rows="2" data-hl="${dh}">${esc(v)}</textarea></label>`;
    if(sf.t==='icon') return `<label class="sh-fl sh-flsm">${esc(sf.label)}<select class="sh-in" data-hl="${dh}">${ICONS.map(([val,lbl])=>`<option value="${val}"${v===val?' selected':''}>${esc(lbl)}</option>`).join('')}</select></label>`;
    if(sf.t==='img'){ const src=imgSrc(v); return `<label class="sh-fl sh-flsm">${esc(sf.label)}<image-slot class="sh-slot" id="mshome-${secId}-${listKey}-${i}-${sf.k}" data-imgfield="${dh}" ${src?`src="${esc(src)}"`:''} shape="rounded" radius="10" fit="cover" placeholder="Drop image"></image-slot></label>`; }
    return `<label class="sh-fl sh-flsm">${esc(sf.label)}<input class="sh-in" data-hl="${dh}" value="${esc(v)}"></label>`;
  }
  function fieldRow(secId,f,c){
    if(f.t==='text') return `<label class="sh-fl">${esc(f.label)}<input class="sh-in" data-h="${secId}:${f.k}" value="${esc(c[f.k]||'')}"></label>`;
    if(f.t==='textarea') return `<label class="sh-fl">${esc(f.label)}<textarea class="sh-in" rows="3" data-h="${secId}:${f.k}">${esc(c[f.k]||'')}</textarea></label>`;
    if(f.t==='csv'){ const arr=c[f.k]||[]; return `<label class="sh-fl">${esc(f.label)}<textarea class="sh-in" rows="4" data-csv="${secId}:${f.k}">${esc(arr.join('\n'))}</textarea></label>`; }
    if(f.t==='color'){ const v=c[f.k]||''; const opts=f.options||[];
      return `<div class="sh-fl">${esc(f.label)}<div class="sh-colors" data-color="${secId}:${f.k}">${opts.map(([val,lbl,sw])=>`<button type="button" class="sh-sw${v===val?' on':''}" data-val="${esc(val)}" title="${esc(lbl)}"><i style="background:${sw}"></i><span>${esc(lbl)}</span></button>`).join('')}<label class="sh-swc${/^#/.test(v)?' on':''}" title="Custom colour"><i style="background:${/^#/.test(v)?v:'#ffffff'}"></i><input type="color" data-colorcustom value="${/^#/.test(v)?v:'#1f8a5b'}"><span>Custom</span></label></div></div>`;
    }
    if(f.t==='curate'){ const ids=c[f.k]||[]; const prods=productList(); const byId={}; prods.forEach(p=>byId[p.id]=p);
      return `<div class="sh-curate" data-curate="${secId}:${f.k}">
        <div class="sh-fl" style="margin-bottom:2px">${esc(f.label)} <span class="sh-curnote">${ids.length?ids.length+' selected · shown in this order':'Auto — best sellers'}</span></div>
        <div class="sh-curchips">${ids.length?ids.map(id=>`<span class="sh-curchip" data-rmcur="${esc(id)}">${esc(byId[id]?byId[id].name:id)}<b>×</b></span>`).join(''):'<span class="sh-curempty">None selected — auto-picking your best sellers.</span>'}</div>
        <input class="sh-in sh-cursearch" placeholder="Search products to add…">
        <div class="sh-curlist"></div>
      </div>`;
    }
    if(f.t==='brandlogos'){ const logos=c[f.k]||{}; const names=(window.MSBRANDS?MSBRANDS.list():[]);
      return `<div class="sh-fl" style="margin-bottom:2px">${esc(f.label)} <span class="sh-curnote">Drop a logo for any brand — brands without one show as text in the marquee.</span></div>
        ${names.length?`<div class="sh-brandlogos">${names.map(n=>{ const src=logos[n]||''; return `<div class="sh-blrow"><image-slot class="sh-bllogo" id="mshome-brandlogo-${slugify(n)}" data-blsec="${secId}" data-brand="${esc(n)}" ${src?`src="${esc(src)}"`:''} shape="rounded" radius="8" fit="contain" placeholder="Logo"></image-slot><span class="sh-blname">${esc(n)}</span></div>`; }).join('')}</div>`:'<p class="sh-note">No brands yet. Add brands under Organisations to give them logos here.</p>'}`;
    }
    if(f.t==='list'){ const arr=c[f.k]||[];
      return `<div class="sh-list"><div class="sh-listhd">${esc(f.label||'Items')}</div>${arr.map((it,i)=>`<div class="sh-item"><div class="sh-itemfields">${f.item.map(sf=>subInput(secId,f.k,i,it,sf)).join('')}</div><button class="sh-itemdel" data-rmitem="${secId}:${f.k}:${i}" title="Remove">×</button></div>`).join('')}<button class="sh-additem" data-additem="${secId}:${f.k}">＋ Add ${esc(f.add||'item')}</button></div>`;
    }
    return '';
  }
  function card(id,i,n){
    const c=MSHOME.section(id)||{}; const on=MSHOME.isOn(id); const type=MSHOME.typeOf?MSHOME.typeOf(id):id; const fields=FIELDS[type]||[];
    const isOpen=id===open;
    // suffix duplicates so the list distinguishes them (e.g. “Customer quotes · 2”)
    const ord=MSHOME.order(); const sameType=ord.filter(x=>(MSHOME.typeOf?MSHOME.typeOf(x):x)===type); let disp=c.label||type; if(sameType.length>1){ disp += ' · '+(sameType.indexOf(id)+1); }
    return `<div class="sh-card ${on?'':'sh-off'} ${isOpen?'sh-open':''}">
      <div class="sh-hd">
        <div class="sh-ord"><button class="sh-ordb" data-move="${id}:-1" ${i===0?'disabled':''} title="Move up">\u25b2</button><button class="sh-ordb" data-move="${id}:1" ${i===n-1?'disabled':''} title="Move down">\u25bc</button></div>
        <div class="sh-name"><b>${esc(disp)}</b><span>${on?'Shown on the store homepage':'Hidden from the store'}</span></div>
        ${fields.length?`<button class="sh-editbtn" data-edit="${id}">${isOpen?'Close':'Edit'}</button>`:''}
        <button class="sh-dupbtn" data-dup="${id}" title="Duplicate section">Duplicate</button>
        <button class="sh-delbtn" data-del="${id}" title="Delete section">✕</button>
        <button class="sh-tog ${on?'on':''}" data-tog="${id}" role="switch" aria-checked="${on}" title="${on?'Hide section':'Show section'}"></button>
      </div>
      ${isOpen?`<div class="sh-body">${fields.length?fields.map(f=>fieldRow(id,f,c)).join(''):`<p class="sh-note">${esc(NOTE[type]||'Nothing to edit here.')}</p>`}${NOTE[type]&&fields.length?`<p class="sh-note">${esc(NOTE[type])}</p>`:''}<div class="sh-bodyfoot"><button class="btn ghost sm" data-resetsec="${id}">Reset this section</button></div></div>`:''}
    </div>`;
  }
  function render(){
    const p=panel(); if(!p) return;
    const ord=MSHOME.order();
    const shown=ord.filter(id=>MSHOME.isOn(id)).length;
    p.innerHTML=`
      <div class="card">
        <div class="card-h"><h2>Store homepage</h2><span class="tag">${shown} of ${ord.length} sections shown</span></div>
        <p class="sh-intro">Show, hide, reorder and edit each section of your customer-facing store homepage. Changes save instantly and appear on the live store. Use the toggle to hide a section, the arrows to reorder, and <b>Edit</b> to change the copy.</p>
        <div class="sh-prefrow">
          <div class="sh-name"><b>Only show products with an image</b><span>Hides any product without a photo from every store listing until one is added.</span></div>
          <button class="sh-tog ${MSHOME.getPref&&MSHOME.getPref('imgOnly')?'on':''}" id="shImgOnly" role="switch" aria-checked="${!!(MSHOME.getPref&&MSHOME.getPref('imgOnly'))}"></button>
        </div>
        <div class="sh-actions"><a class="btn sm" href="Merchsmith Store.html" target="_blank">Preview store \u2197</a><button class="btn ghost sm" id="shResetAll">Reset homepage to default</button></div>
      </div>
      <div class="sh-cards">${ord.map((id,i)=>card(id,i,ord.length)).join('')}</div>`;
    wire();
  }
  function confirmInline(msg, cb){
    let pk=document.getElementById('shAsk'); if(pk)pk.remove();
    pk=document.createElement('div'); pk.id='shAsk'; pk.className='sh-askscrim';
    pk.innerHTML=`<div class="sh-ask"><p class="sh-askmsg">${esc(msg)}</p><div class="sh-askbtns"><button class="btn ghost sm" data-cancel>Cancel</button><button class="btn sm" data-ok>Confirm</button></div></div>`;
    document.body.appendChild(pk);
    pk.querySelector('[data-ok]').onclick=()=>{ pk.remove(); cb(); };
    pk.querySelector('[data-cancel]').onclick=()=>pk.remove();
    pk.onclick=e=>{ if(e.target===pk)pk.remove(); };
  }
  function wire(){
    const p=panel();
    p.querySelectorAll('[data-tog]').forEach(b=>b.onclick=()=>{ MSHOME.toggle(b.dataset.tog); render(); });
    p.querySelectorAll('[data-dup]').forEach(b=>b.onclick=()=>{ open=MSHOME.duplicate(b.dataset.dup); render(); toast('Section duplicated'); });
    p.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>confirmInline('Delete this section from the homepage? You can bring the default layout back with “Reset homepage to default”.',()=>{ if(open===b.dataset.del)open=null; MSHOME.deleteSection(b.dataset.del); render(); toast('Section deleted'); }));
    p.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{ const [id,d]=b.dataset.move.split(':'); MSHOME.move(id,+d); render(); });
    p.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{ open = open===b.dataset.edit ? null : b.dataset.edit; render(); });
    p.querySelectorAll('[data-resetsec]').forEach(b=>b.onclick=()=>{ MSHOME.resetSection(b.dataset.resetsec); render(); toast('Section reset to default'); });
    // scalar text/textarea
    p.querySelectorAll('[data-h]').forEach(inp=>inp.onchange=()=>{ const [id,k]=inp.dataset.h.split(':'); MSHOME.setField(id,{[k]:inp.value}); });
    // list-item sub-fields
    p.querySelectorAll('[data-hl]').forEach(inp=>inp.onchange=()=>{ const [id,listKey,idx,subKey]=inp.dataset.hl.split(':'); const cur=(MSHOME.section(id)||{})[listKey]||[]; const arr=cur.map(o=>Object.assign({},o)); if(arr[+idx]){ arr[+idx][subKey]=inp.value; MSHOME.setField(id,{[listKey]:arr}); } });
    // add / remove list items
    p.querySelectorAll('[data-additem]').forEach(b=>b.onclick=()=>{ const [id,listKey]=b.dataset.additem.split(':'); const f=(FIELDS[id]||[]).find(x=>x.k===listKey); const cur=((MSHOME.section(id)||{})[listKey]||[]).map(o=>Object.assign({},o)); const blank={}; (f&&f.item||[]).forEach(sf=>blank[sf.k]=sf.t==='icon'?ICONS[0][0]:''); cur.push(blank); MSHOME.setField(id,{[listKey]:cur}); render(); });
    p.querySelectorAll('[data-rmitem]').forEach(b=>b.onclick=()=>{ const [id,listKey,idx]=b.dataset.rmitem.split(':'); const cur=((MSHOME.section(id)||{})[listKey]||[]).map(o=>Object.assign({},o)); cur.splice(+idx,1); MSHOME.setField(id,{[listKey]:cur}); render(); });
    // marquee labels (one per line)
    p.querySelectorAll('[data-csv]').forEach(t=>t.onchange=()=>{ const [id,k]=t.dataset.csv.split(':'); const arr=t.value.split('\n').map(s=>s.trim()).filter(Boolean); MSHOME.setField(id,{[k]:arr}); });
    // colour swatches
    p.querySelectorAll('[data-color]').forEach(box=>{ const [id,k]=box.dataset.color.split(':');
      box.querySelectorAll('[data-val]').forEach(b=>b.onclick=()=>{ MSHOME.setField(id,{[k]:b.dataset.val}); render(); });
      const cust=box.querySelector('[data-colorcustom]'); if(cust){ cust.oninput=()=>{ MSHOME.setField(id,{[k]:cust.value}); const ic=cust.parentElement.querySelector('i'); if(ic)ic.style.background=cust.value; }; cust.onchange=()=>{ MSHOME.setField(id,{[k]:cust.value}); render(); }; }
    });
    // best-seller product curation
    p.querySelectorAll('[data-curate]').forEach(box=>{ const [id,k]=box.dataset.curate.split(':'); const search=box.querySelector('.sh-cursearch'); const listEl=box.querySelector('.sh-curlist'); const prods=productList();
      const getIds=()=>((MSHOME.section(id)||{})[k]||[]).slice();
      const renderList=()=>{ const q=search.value.trim().toLowerCase(); if(!q){ listEl.innerHTML=''; return; } const sel=new Set(getIds()); const matches=prods.filter(pr=>!sel.has(pr.id)&&pr.name.toLowerCase().includes(q)).slice(0,25); listEl.innerHTML=matches.length?matches.map(pr=>`<button class="sh-curopt" data-add="${esc(pr.id)}">${esc(pr.name)}</button>`).join(''):'<div class="sh-curnone">No matching products.</div>'; listEl.querySelectorAll('[data-add]').forEach(bt=>bt.onclick=()=>{ const ids=getIds(); ids.push(bt.dataset.add); MSHOME.setField(id,{[k]:ids}); render(); }); };
      search.oninput=renderList;
      box.querySelectorAll('[data-rmcur]').forEach(ch=>ch.onclick=()=>{ const ids=getIds().filter(x=>x!==ch.dataset.rmcur); MSHOME.setField(id,{[k]:ids}); render(); });
    });
    // uploaded images inside list items (icons, discover/brand images) — capture the data URL into config
    p.querySelectorAll('[data-imgfield]').forEach(sl=>sl.addEventListener('ms-slot-change',e=>{ const [id,listKey,idx,subKey]=sl.dataset.imgfield.split(':'); const cur=((MSHOME.section(id)||{})[listKey]||[]).map(o=>Object.assign({},o)); if(cur[+idx]){ cur[+idx][subKey]=(e.detail&&e.detail.url)||''; MSHOME.setField(id,{[listKey]:cur}); } }));
    // per-brand marquee logo uploads
    p.querySelectorAll('[data-brand][data-blsec]').forEach(sl=>sl.addEventListener('ms-slot-change',e=>{ const secId=sl.dataset.blsec, name=sl.dataset.brand; const logos=Object.assign({},(MSHOME.section(secId)||{}).logos||{}); if(e.detail&&e.detail.url) logos[name]=e.detail.url; else delete logos[name]; MSHOME.setField(secId,{logos}); }));
    const ra=p.querySelector('#shResetAll'); if(ra)ra.onclick=()=>confirmInline('Reset the whole homepage to the default layout and copy? Your show/hide, order and text changes will be cleared.',()=>{ MSHOME.reset(); open=null; render(); toast('Homepage reset to default'); });
    const io=p.querySelector('#shImgOnly'); if(io)io.onclick=()=>{ MSHOME.setPref('imgOnly', !MSHOME.getPref('imgOnly')); render(); toast(MSHOME.getPref('imgOnly')?'Products without images are now hidden':'Showing all products'); };
  }

  (function(){ if(document.getElementById('sh-style'))return; const st=document.createElement('style'); st.id='sh-style';
    st.textContent=`
    .sh-intro{font-size:13.5px;color:var(--ink-2,#55524a);line-height:1.55;margin:6px 0 14px;max-width:70ch;}
    .sh-actions{display:flex;gap:10px;flex-wrap:wrap;}
    .sh-prefrow{display:flex;align-items:center;gap:14px;border:1.5px solid var(--line-soft,#e5e3dd);border-radius:12px;padding:12px 15px;margin:0 0 14px;background:var(--paper,#F4F5F8);}
    .sh-cards{display:flex;flex-direction:column;gap:10px;margin-top:16px;}
    .sh-card{border:1.5px solid var(--line-soft,#e5e3dd);border-radius:14px;background:#fff;overflow:hidden;transition:border-color .14s;}
    .sh-card.sh-open{border-color:var(--periwinkle,#9aa3d8);}
    .sh-card.sh-off{background:var(--paper-2,#f6f6fb);}
    .sh-hd{display:flex;align-items:center;gap:13px;padding:13px 16px;}
    .sh-ord{display:flex;flex-direction:column;gap:2px;flex:none;}
    .sh-ordb{width:26px;height:18px;border:1px solid var(--line-soft,#e5e3dd);background:var(--paper-2,#f6f6fb);border-radius:5px;font-size:9px;line-height:1;cursor:pointer;color:var(--ink-2,#55524a);}
    .sh-ordb:disabled{opacity:.3;cursor:default;}
    .sh-name{flex:1;min-width:0;}
    .sh-name b{display:block;font-size:14.5px;color:var(--ink,#23231f);}
    .sh-name span{font-size:12px;color:var(--muted,#9a9a9f);}
    .sh-card.sh-off .sh-name b{color:var(--muted,#9a9a9f);}
    .sh-editbtn{border:1.5px solid var(--line-soft,#e5e3dd);background:#fff;border-radius:8px;padding:6px 14px;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep,#5860A6);cursor:pointer;flex:none;}
    .sh-editbtn:hover{border-color:var(--periwinkle-deep,#5860A6);}
    .sh-dupbtn{border:1.5px solid var(--line-soft,#e5e3dd);background:#fff;border-radius:8px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2,#55524a);cursor:pointer;flex:none;}
    .sh-dupbtn:hover{border-color:var(--periwinkle-deep,#5860A6);color:var(--periwinkle-deep,#5860A6);}
    .sh-delbtn{width:30px;height:30px;flex:none;border:1.5px solid var(--line-soft,#e5e3dd);background:#fff;border-radius:8px;font-size:13px;line-height:1;color:var(--muted,#9a9a9f);cursor:pointer;}
    .sh-delbtn:hover{border-color:var(--flare,#e0555f);color:var(--flare,#e0555f);}
    .sh-tog{width:44px;height:25px;border-radius:999px;background:var(--line,#cfcbd8);position:relative;cursor:pointer;flex:none;border:0;transition:background .18s;}
    .sh-tog::after{content:"";position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;transition:left .18s;}
    .sh-tog.on{background:var(--periwinkle-deep,#5860A6);}.sh-tog.on::after{left:22px;}
    .sh-body{border-top:1px solid var(--line-soft,#e5e3dd);padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--paper,#F4F5F8);}
    .sh-fl{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:var(--muted,#9a9a9f);}
    .sh-flsm{flex:1;}
    .sh-in{font:inherit;font-size:13.5px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--ink,#23231f);border:1.5px solid var(--line-soft,#e5e3dd);border-radius:9px;padding:9px 11px;background:#fff;width:100%;}
    textarea.sh-in{resize:vertical;line-height:1.5;}
    .sh-in:focus{outline:0;border-color:var(--periwinkle-deep,#5860A6);box-shadow:0 0 0 2px var(--tint-peri,#eceef9);}
    .sh-list{display:flex;flex-direction:column;gap:9px;}
    .sh-listhd{font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:var(--muted,#9a9a9f);}
    .sh-item{display:flex;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid var(--line-soft,#e5e3dd);border-radius:10px;padding:10px 12px;align-items:flex-start;}
    .sh-itemfields{display:flex;gap:10px;flex-wrap:wrap;flex:1;min-width:0;}
    .sh-item .sh-fl{min-width:140px;}
    .sh-itemdel{width:28px;height:28px;flex:none;border:1.5px solid var(--line-soft,#e5e3dd);background:#fff;border-radius:7px;font-size:15px;line-height:1;color:var(--muted,#9a9a9f);cursor:pointer;}
    .sh-itemdel:hover{border-color:var(--flare,#e0555f);color:var(--flare,#e0555f);}
    .sh-additem{align-self:flex-start;border:1.5px dashed var(--line-soft,#cfcbd8);background:none;border-radius:9px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep,#5860A6);cursor:pointer;}
    .sh-additem:hover{border-color:var(--periwinkle-deep,#5860A6);background:var(--tint-peri,#eceef9);}
    select.sh-in{appearance:auto;cursor:pointer;}
    .sh-curate{display:flex;flex-direction:column;gap:8px;}
    .sh-curnote{font-weight:600;letter-spacing:0;text-transform:none;color:var(--periwinkle-deep,#5860A6);font-size:11.5px;}
    .sh-curchips{display:flex;flex-wrap:wrap;gap:6px;}
    .sh-curchip{display:inline-flex;align-items:center;gap:6px;background:var(--tint-peri,#eceef9);color:var(--periwinkle-ink,#3C4279);border-radius:999px;padding:5px 11px;font-size:12.5px;font-weight:700;cursor:pointer;}
    .sh-curchip b{font-weight:800;opacity:.6;}
    .sh-curchip:hover b{opacity:1;color:var(--flare,#e0555f);}
    .sh-curempty{font-size:12.5px;color:var(--muted,#9a9a9f);}
    .sh-curlist{display:flex;flex-direction:column;gap:2px;max-height:210px;overflow-y:auto;}
    .sh-curopt{text-align:left;border:0;background:none;font:inherit;font-size:13px;padding:8px 10px;border-radius:8px;cursor:pointer;color:var(--ink,#23231f);}
    .sh-curopt:hover{background:var(--paper-2,#f6f6fb);color:var(--periwinkle-deep,#5860A6);}
    .sh-curnone{font-size:12.5px;color:var(--muted,#9a9a9f);padding:6px 10px;}
    .sh-slot{width:120px;height:82px;}
    .sh-brandlogos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;}
    .sh-blrow{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line-soft,#e5e3dd);border-radius:10px;padding:8px 10px;}
    .sh-bllogo{width:74px;height:40px;flex:none;}
    .sh-colors{display:flex;flex-wrap:wrap;gap:8px;text-transform:none;letter-spacing:0;font-weight:600;}
    .sh-sw,.sh-swc{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line-soft,#e5e3dd);background:#fff;border-radius:10px;padding:6px 11px 6px 7px;cursor:pointer;font:inherit;font-size:12.5px;color:var(--ink,#23231f);position:relative;}
    .sh-sw.on,.sh-swc.on{border-color:var(--periwinkle-deep,#5860A6);box-shadow:inset 0 0 0 1px var(--periwinkle-deep,#5860A6);}
    .sh-sw i,.sh-swc i{width:20px;height:20px;border-radius:6px;border:1px solid rgba(0,0,0,.12);flex:none;}
    .sh-swc input{position:absolute;inset:0;opacity:0;cursor:pointer;}
    .sh-blname{font-size:12.5px;font-weight:600;color:var(--ink,#23231f);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .sh-note{font-size:12.5px;color:var(--muted,#9a9a9f);line-height:1.5;margin:0;}
    .sh-bodyfoot{display:flex;justify-content:flex-end;}
    .sh-askscrim{position:fixed;inset:0;background:rgba(22,24,28,.5);backdrop-filter:blur(3px);z-index:300;display:grid;place-items:center;}
    .sh-ask{background:#fff;border-radius:16px;padding:22px 24px;width:min(420px,92vw);box-shadow:0 24px 60px rgba(20,22,45,.35);}
    .sh-askmsg{margin:0 0 16px;font-size:14px;line-height:1.5;color:var(--ink-2,#55524a);}
    .sh-askbtns{display:flex;gap:10px;justify-content:flex-end;}
    `;
    document.head.appendChild(st);
  })();

  window.MSStoreHome={ render };
})();
