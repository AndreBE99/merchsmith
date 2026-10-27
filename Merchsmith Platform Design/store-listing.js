/* ============================================================
   store-listing.js — the customer-facing store listing for a product,
   as one reusable block (window.MSLISTING).
   Used by the project product pop-out: "Product details" panel (slides in
   over the current step) + a slim summary strip on Design.
   Reads the store record (window.STORE.products) — the same data the store
   product page shows: images, description, specs, colours, branding, eco,
   lead time, reviews. Distributors also get an "Only you see this" strip.
   Project items not matched to a store product can be linked by the
   distributor (ms-pm-storelink {projectProductName: storeId}).
   MSLISTING: resolve(p) · html(p,ctx) · strip(p) · wire(el,p,onChange)
   ============================================================ */
window.MSLISTING=window.MSLISTING||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const LK='ms-pm-storelink', J=()=>{ try{ return JSON.parse(localStorage.getItem(LK)||'{}')||{}; }catch(e){ return {}; } };
  const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const role=()=>{ const r=(window.MSID&&MSID.current&&MSID.current())||'distributor'; return r==='customer'?'cust':'dist'; };
  const ALIAS={tote:'bag',pencil:'writing',notebook:'book',cup:'drinkware',tshirt:'clothing',pouch:'tech',mug:'drinkware',bottle:'drinkware'};
  const MN={screenprint:'Screenprint',pad:'Pad print',dtf:'DTF transfer',screen:'Screen print',emb:'Embroidery',embroidery:'Embroidery',laser:'Laser engrave',digital:'Digital print',uv:'UV print',deboss:'Deboss',emboss:'Emboss',sublimation:'Sublimation',transfer:'Transfer',foil:'Foil block',doming:'Doming',engrave:'Engraving',dtg:'DTG print'};
  const list=()=>(window.STORE&&Array.isArray(STORE.products))?STORE.products:[];
  function resolve(p){ if(!p) return null; const L=list(), ln=J(); if(ln[p.name]) return L.find(x=>x.id===ln[p.name])||null;
    const s=L.find(x=>p.catId&&x.id===p.catId)||L.find(x=>x.name===p.name); if(s) return s;
    const W=t=>new Set(norm(t).replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>2)); const a=W(p.name); let best=null,bs=0;
    L.forEach(x=>{ const b=W(x.name); let n=0; a.forEach(w=>{ if(b.has(w)) n++; }); const sc=n/Math.max(a.size,b.size,1); if(sc>bs){ bs=sc; best=x; } });
    return bs>=.5?best:null; }
  function setLink(name,id){ const o=J(); if(id) o[name]=id; else delete o[name]; try{ localStorage.setItem(LK,JSON.stringify(o)); }catch(e){} }
  function images(sp){ const ok=u=>/^(https?:|data:image\/|assets\/)/.test(u||''); const a=[sp.imgUrl].concat(sp.images||[]).filter(ok);
    if(!a.length&&sp.img) a.push('assets/products/'+(ALIAS[sp.img]||sp.img)+'.png'); return [...new Set(a)].slice(0,8); }
  const hex=n=>{ try{ if(window.MSCOLOUR&&MSCOLOUR.mapOr&&MSCOLOUR.hex){ const h=MSCOLOUR.hex(MSCOLOUR.mapOr(n)); if(h) return h; } }catch(e){} return '#d8d6cf'; };
  const dims=sp=>sp.dimensions||(sp.dims?[sp.dims.w,sp.dims.h,sp.dims.d].filter(v=>v&&v!=='—').join(' × '):'');
  function reviews(sp){ let all={}; try{ all=JSON.parse(localStorage.getItem('ms-product-reviews')||'{}')||{}; }catch(e){} const R=(all[sp.id]||[]).filter(r=>role()==='dist'||r.org==='Citrix');
    if(!R.length) return null; const avg=R.reduce((s,r)=>s+(+r.rating||0),0)/R.length; return {n:R.length,avg,last:R[0]}; }
  function stories(sp){ const S=[];
    if((sp.sustainability||0)>=7||/recycl|bamboo|organic|bio|rpet|cork|wheat|fsc/i.test(sp.material||'')) S.push(['Made with less impact',(sp.material?sp.material+'. ':'')+'Eco score '+(sp.sustainability||'—')+' out of 10.']);
    if(sp.lead) S.push(['Ready in '+sp.lead+' working days','From proof approval to dispatch'+(sp.moq?', from '+sp.moq+' units':'')+'.']);
    if((sp.printMethods||[]).length) S.push(['Branded your way',(sp.printMethods||[]).map(m=>MN[m]||m).join(', ')+(sp.branding&&sp.branding.size?'. Branding area '+sp.branding.size+(/mm/.test(sp.branding.size)?'':' mm')+'.':'.')]);
    return S.slice(0,3); }

  function notLinked(p){ const d=role()==='dist';
    return `<div class="sl-none"><b>Not linked to a store product</b><p>${esc(p.name)} was added without a store listing, so there are no store images or details yet.</p>${d?`<div class="sl-link"><input data-slq placeholder="Search the store to link a product…" autocomplete="off"><div class="sl-linkl" data-sll></div></div>`:'<p>Your account manager can link it to a store product.</p>'}</div>`; }

  function html(p,ctx){ ctx=ctx||{}; const sp=resolve(p); if(!sp) return notLinked(p); const d=role()==='dist';
    const imgs=images(sp), cols=(sp.colours||[]).map(c=>typeof c==='string'?c:c.name).filter(Boolean);
    const meth=(sp.printMethods||[]).map(m=>MN[String(m).toLowerCase()]||m);
    const rows=[['Sizes',(sp.sizes||[]).join(', ')],['Dimensions',dims(sp)],['Material',sp.material],['Country of origin',sp.origin],['Certifications',(sp.certifications||[]).join(' · ')],['Branding methods',meth.join(', ')],['Branding positions',sp.branding&&sp.branding.location],['Branding area',sp.branding&&sp.branding.size?sp.branding.size+(/mm/.test(sp.branding.size)?'':' mm'):'']].filter(r=>r[1]);
    const facts=[sp.moq?['Minimum order',sp.moq.toLocaleString('en-GB')+' units']:null,sp.lead?['Lead time',sp.lead+' working days']:null,sp.sustainability?['Eco score',sp.sustainability+' / 10']:null].filter(Boolean);
    const brk=(ctx.breaks||[]).filter(b=>b&&b.unit);
    const rv=reviews(sp), st=stories(sp);
    const two=d&&window.MSTWO&&MSTWO.get?MSTWO.get(p.name,'autumn'):null; let wn=[]; try{ wn=d&&window.MSWARN?MSWARN.list(p.name)||[]:[]; }catch(e){}
    return `<div class="sl" data-slid="${esc(sp.id)}">
      <div class="sl-gal">
        <div class="sl-stage" data-slstage title="Click to enlarge">${imgs[0]?`<img src="${esc(imgs[0])}" alt="${esc(sp.name)}" data-slmain>`:'<span class="sl-noimg">No image</span>'}<button type="button" class="sl-zoom" data-slzoom aria-label="Enlarge image">⤢</button></div>
        ${imgs.length>1?`<div class="sl-thumbs">${imgs.map((u,i)=>`<button type="button" class="sl-th${i?'':' on'}" data-slth="${esc(u)}" aria-label="Image ${i+1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>`:''}
      </div>
      <div class="sl-info">
        <div class="sl-kick">${esc([sp.brand,sp.model].filter(Boolean).join(' · '))}${sp.id?`<span>SKU ${esc(String(sp.id).toUpperCase())}</span>`:''}</div>
        <h2>${esc(sp.name)}</h2>
        ${sp.blurb?`<p class="sl-blurb">${esc(sp.blurb)}</p>`:''}
        ${facts.length?`<div class="sl-facts">${facts.map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`:''}
        ${cols.length?`<div class="sl-cols"><span class="sl-lbl">Colours <i data-slcn>${esc(cols[0])}</i></span><div>${cols.map((c,i)=>`<button type="button" class="sl-sw${i?'':' on'}" data-slsw="${i}" data-name="${esc(c)}" title="${esc(c)}" style="background:${hex(c)}"></button>`).join('')}</div></div>`:''}
        ${rows.length?`<dl class="sl-spec">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`:''}
        ${brk.length?`<div class="sl-price"><span class="sl-lbl">Price per unit, including branding</span><table><tbody><tr>${brk.map(b=>`<td class="${b.current?'cur':''}">${b.current?'<em>Your quantity</em>':''}<span>${(+b.qty).toLocaleString('en-GB')}</span><b>${gbp(b.unit)}</b></td>`).join('')}</tr></tbody></table><small>Excludes VAT${brk.some(b=>b.delivery)?' and delivery':''}.</small></div>`:''}
        <a class="sl-store" href="Merchsmith Store.html#product=${encodeURIComponent(sp.id)}" target="_blank" rel="noopener">View in store ↗</a>
      </div>
    </div>
    ${st.length?`<div class="sl-stories">${st.map(([h,t])=>`<div><b>${esc(h)}</b><p>${esc(t)}</p></div>`).join('')}</div>`:''}
    ${rv?`<div class="sl-rev"><span class="sl-stars" aria-label="${rv.avg.toFixed(1)} out of 5">${'★'.repeat(Math.round(rv.avg))}${'☆'.repeat(5-Math.round(rv.avg))}</span><b>${rv.avg.toFixed(1)}</b><span>${rv.n} review${rv.n===1?'':'s'}${d?'':' from your organisation'}</span>${rv.last&&rv.last.text?`<q>${esc(rv.last.text)}</q>`:''}</div>`:''}
    ${d?`<div class="sl-dist"><span class="sl-only">Only you see this</span><dl><dt>Supplier</dt><dd>${esc(sp.supplier||'—')}</dd><dt>Supplier code</dt><dd>${esc(sp.code||sp.sku||sp.id)}</dd>${two?`<dt>Two suppliers</dt><dd>${esc(two.blank)} → ${esc(two.brand)}</dd>`:''}<dt>Proof warnings</dt><dd>${wn.length?wn.map(w=>esc(w.text)).join('<br>'):'None saved'}</dd>${J()[p.name]?`<dt>Store link</dt><dd>Linked by hand · <button type="button" class="sl-unlink" data-slunlink>Unlink</button></dd>`:''}</dl></div>`:''}`; }

  function strip(p){ const sp=resolve(p); const d=role()==='dist';
    if(!sp) return `<div class="sl-strip none"><span>Not linked to a store product${d?': open Product details to link one.':'.'}</span><button type="button" class="sl-strbtn" data-pdopen>Product details</button></div>`;
    const im=images(sp)[0], cols=(sp.colours||[]).map(c=>typeof c==='string'?c:c.name).filter(Boolean);
    return `<div class="sl-strip">${im?`<span class="sl-strim"><img src="${esc(im)}" alt=""></span>`:''}<div class="sl-strt"><b>${esc(sp.name)}</b><span>${[sp.moq?'Min '+sp.moq+' units':'',sp.lead?sp.lead+' working days':'',sp.material||''].filter(Boolean).map(esc).join(' · ')}</span></div>${cols.length?`<span class="sl-strc">${cols.slice(0,6).map(c=>`<i title="${esc(c)}" style="background:${hex(c)}"></i>`).join('')}${cols.length>6?`<em>+${cols.length-6}</em>`:''}</span>`:''}<button type="button" class="sl-strbtn" data-pdopen><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>Product details</button></div>`; }

  function wire(el,p,onChange){ if(!el) return;
    el.onclick=e=>{ const th=e.target.closest('[data-slth]'); if(th){ const m=el.querySelector('[data-slmain]'); if(m) m.src=th.dataset.slth; el.querySelectorAll('.sl-th').forEach(x=>x.classList.toggle('on',x===th)); return; }
      const sw=e.target.closest('[data-slsw]'); if(sw){ el.querySelectorAll('.sl-sw').forEach(x=>x.classList.toggle('on',x===sw)); const cn=el.querySelector('[data-slcn]'); if(cn) cn.textContent=sw.dataset.name; const ths=[...el.querySelectorAll('.sl-th')], t=ths[+sw.dataset.slsw]; if(t) t.click(); return; }
      if(e.target.closest('[data-slzoom],[data-slstage]')){ const m=el.querySelector('[data-slmain]'); if(!m) return; const z=document.createElement('div'); z.className='sl-lb'; z.innerHTML=`<img src="${esc(m.src)}" alt=""><button type="button" aria-label="Close">×</button>`; z.onclick=()=>z.remove(); document.body.appendChild(z); return; }
      const un=e.target.closest('[data-slunlink]'); if(un){ setLink(p.name,''); if(onChange) onChange(); return; }
      const pk=e.target.closest('[data-slpick]'); if(pk){ setLink(p.name,pk.dataset.slpick); if(onChange) onChange(); } };
    const q=el.querySelector('[data-slq]'), box=el.querySelector('[data-sll]');
    if(q&&box){ const draw=()=>{ const v=q.value.trim(); const m=window.MSSEARCH&&MSSEARCH.match?MSSEARCH.match:(t,s)=>norm(t).includes(norm(s));
        const L=list().filter(x=>!v||m(x.name+' '+(x.model||'')+' '+(x.supplier||'')+' '+x.id,v)).slice(0,8);
        box.innerHTML=L.map(x=>{ const im=images(x)[0]; return `<button type="button" class="sl-lo" data-slpick="${esc(x.id)}">${im?`<img src="${esc(im)}" alt="">`:'<span></span>'}<span><b>${esc(x.name)}</b><i>${esc([x.supplier,String(x.id).toUpperCase()].filter(Boolean).join(' · '))}</i></span><em>Link</em></button>`; }).join('')||'<p class="sl-nohit">No store products match.</p>'; };
      q.oninput=draw; q.value=p.name.split(/\s+/).slice(0,2).join(' '); draw(); } }

  const css=`.sl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:34px;align-items:start;} @media(max-width:860px){.sl{grid-template-columns:1fr;}}
  .sl-gal{display:flex;flex-direction:column;gap:10px;position:sticky;top:0;} .sl-stage{position:relative;aspect-ratio:1;background:#f6f5f2;border-radius:18px;display:grid;place-items:center;overflow:hidden;cursor:zoom-in;} .sl-stage img{width:86%;height:86%;object-fit:contain;mix-blend-mode:multiply;} .sl-noimg{color:var(--muted);font-size:13px;}
  .sl-zoom{position:absolute;right:12px;bottom:12px;width:34px;height:34px;border-radius:50%;border:1px solid var(--line-soft);background:#fff;cursor:pointer;font-size:16px;}
  .sl-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;} .sl-th{aspect-ratio:1;border:1.5px solid var(--line-soft);border-radius:11px;background:#f6f5f2;padding:4px;cursor:pointer;} .sl-th.on{border-color:var(--periwinkle-deep);} .sl-th img{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;}
  .sl-info{display:flex;flex-direction:column;gap:16px;min-width:0;} .sl-kick{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--periwinkle-deep);} .sl-kick span{color:var(--muted);white-space:nowrap;}
  .sl-info h2{font-family:var(--serif);font-weight:500;font-size:30px;line-height:1.1;margin:-6px 0 0;} .sl-blurb{margin:0;font-size:14.5px;line-height:1.65;color:var(--ink-2);text-wrap:pretty;}
  .sl-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;} .sl-facts div{background:#f7f7fa;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;} .sl-facts span{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;} .sl-facts b{font-size:14.5px;}
  .sl-lbl{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3,#667085);} .sl-lbl i{font-style:normal;text-transform:none;letter-spacing:0;font-weight:700;color:var(--ink);margin-left:6px;}
  .sl-cols{display:flex;flex-direction:column;gap:8px;} .sl-cols>div{display:flex;flex-wrap:wrap;gap:8px;} .sl-sw{width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.18);cursor:pointer;} .sl-sw.on{box-shadow:0 0 0 2px var(--periwinkle-deep);}
  .sl-spec{display:grid;grid-template-columns:auto minmax(0,1fr);gap:0;margin:0;font-size:13.5px;border-top:1px solid var(--line-soft);} .sl-spec dt,.sl-spec dd{padding:9px 0;border-bottom:1px solid #f0f1f4;margin:0;} .sl-spec dt{color:var(--muted);padding-right:20px;white-space:nowrap;} .sl-spec dd{font-weight:600;}
  .sl-price{display:flex;flex-direction:column;gap:8px;} .sl-price table{border-collapse:separate;border-spacing:6px 0;margin:0 -6px;} .sl-price td{background:#f7f7fa;border-radius:12px;padding:10px 12px;text-align:center;vertical-align:bottom;} .sl-price td span{display:block;font-size:12px;color:var(--muted);font-weight:700;} .sl-price td b{font-size:15px;} .sl-price td.cur{background:var(--tint-peri,#eef0fa);box-shadow:inset 0 0 0 1.5px var(--periwinkle-deep);} .sl-price td em{display:block;font-style:normal;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--periwinkle-deep);margin-bottom:2px;} .sl-price small{font-size:12px;color:var(--muted);}
  .sl-store{align-self:flex-start;font-size:13.5px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 14px;} .sl-store:hover{border-color:var(--periwinkle);}
  .sl-stories{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:28px;} .sl-stories div{border:1px solid var(--line-soft);border-radius:14px;padding:16px 18px;} .sl-stories b{font-family:var(--serif);font-weight:500;font-size:19px;} .sl-stories p{margin:6px 0 0;font-size:13.5px;line-height:1.55;color:var(--ink-2);}
  .sl-rev{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px;margin-top:18px;font-size:13.5px;color:var(--ink-2);} .sl-stars{color:#e0a400;letter-spacing:2px;font-size:15px;} .sl-rev q{flex-basis:100%;font-family:var(--serif);font-size:16px;font-style:italic;color:var(--ink);}
  .sl-dist{margin-top:24px;border:1.5px dashed #c9cde6;background:#fafbff;border-radius:14px;padding:14px 18px;} .sl-only{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:var(--periwinkle-deep);color:#fff;border-radius:999px;padding:3px 10px;margin-bottom:8px;} .sl-dist dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 18px;margin:0;font-size:13.5px;} .sl-dist dt{color:var(--muted);} .sl-dist dd{margin:0;font-weight:600;} .sl-unlink{font:inherit;font-size:12.5px;border:0;background:none;color:var(--periwinkle-deep);text-decoration:underline;cursor:pointer;padding:0;}
  .sl-none{border:1.5px dashed var(--line-soft);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:6px;} .sl-none b{font-size:16px;} .sl-none p{margin:0;color:var(--ink-2);font-size:13.5px;}
  .sl-link{margin-top:10px;display:flex;flex-direction:column;gap:8px;} .sl-link input{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 12px;} .sl-linkl{display:flex;flex-direction:column;gap:4px;} .sl-lo{display:flex;align-items:center;gap:12px;text-align:left;font:inherit;border:1px solid var(--line-soft);background:#fff;border-radius:12px;padding:8px 10px;cursor:pointer;} .sl-lo:hover{border-color:var(--periwinkle);} .sl-lo img,.sl-lo>span:first-child{width:44px;height:44px;border-radius:9px;background:#f6f5f2;object-fit:contain;flex:none;} .sl-lo span{display:flex;flex-direction:column;min-width:0;flex:1;} .sl-lo b{font-size:13.5px;} .sl-lo i{font-style:normal;font-size:12px;color:var(--muted);} .sl-lo em{font-style:normal;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);} .sl-nohit{font-size:13px;color:var(--muted);margin:0;}
  .sl-lb{position:fixed;inset:0;z-index:3000;background:rgba(20,22,30,.82);display:grid;place-items:center;cursor:zoom-out;} .sl-lb img{max-width:88vw;max-height:88vh;background:#fff;border-radius:14px;padding:20px;} .sl-lb button{position:absolute;top:18px;right:22px;width:40px;height:40px;border-radius:50%;border:0;background:#fff;font-size:22px;cursor:pointer;}
  .sl-strip{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:10px 12px;margin-bottom:14px;} .sl-strip.none{justify-content:space-between;color:var(--ink-2);font-size:13.5px;} .sl-strim{width:52px;height:52px;border-radius:10px;background:#f6f5f2;flex:none;overflow:hidden;display:grid;place-items:center;} .sl-strim img{width:90%;height:90%;object-fit:contain;mix-blend-mode:multiply;}
  .sl-strt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;} .sl-strt b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .sl-strt span{font-size:12.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .sl-strc{display:flex;align-items:center;gap:4px;flex:none;} .sl-strc i{width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18);} .sl-strc em{font-style:normal;font-size:11.5px;color:var(--muted);margin-left:2px;}
  .sl-strbtn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;color:var(--periwinkle-deep);border-radius:10px;padding:8px 12px;cursor:pointer;white-space:nowrap;flex:none;} .sl-strbtn:hover{border-color:var(--periwinkle);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {resolve,html,strip,wire,images,setLink};
})();
