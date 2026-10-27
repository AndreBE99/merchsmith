/* via-us.js — "Ship via us": the supplier delivers to the distributor's goods-in, the distributor
   books it in and dispatches it on to the customer (samples and bulk). Plus delivery notes.

   Config (Distributor Settings → Lead times → Shipping via us) in localStorage 'ms-via-cfg':
     {handling, samples, bulk, hubs:[{id,name,lines,def}]}
   Per line (order ops state x.lines[i]):
     L.route = {via:true|false, hub:id}        (unset = default: samples → cfg.samples, bulk → cfg.bulk)
     L.via   = {inTrk:{courier,no,at,by}, gin:{at,by,rows,short,dmg,note}}
     L.ship  = shipment id when several items were dispatched together
   While via, L.st stays 'prod' until the distributor dispatches to the customer (then 'dispatch' as normal),
   so the customer only ever sees one flow and invoices still raise at dispatch.
   window.MSVIA: cfg, saveCfg, hubs, hub, defHub, route, sub, mountSettings, dnHTML */
window.MSVIA=window.MSVIA||(function(){
  const KEY='ms-via-cfg';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const DEF={handling:1,samples:true,bulk:false,hubs:[{id:'h1',name:'Mojo Promotions · Warehouse',lines:['Unit 4, Brindley Park','Garforth Road','Leeds','LS10 1JT'],def:true}]};
  function cfg(){ let c=null; try{ c=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){} c=Object.assign({},DEF,c||{}); if(!Array.isArray(c.hubs)||!c.hubs.length) c.hubs=DEF.hubs.slice(); return c; }
  function saveCfg(c){ try{ localStorage.setItem(KEY,JSON.stringify(c)); }catch(e){} }
  const hubs=()=>cfg().hubs;
  const defHub=()=>{ const H=hubs(); return H.find(h=>h.def)||H[0]; };
  const hub=id=>hubs().find(h=>h.id===id)||null;
  const asAddr=h=>h?{label:h.name,name:h.name,lines:(h.lines||[]).slice()}:null;
  function route(o,i,l,L){ L=L||{}; l=l||{}; const c=cfg();
    if(L.route) return {via:!!L.route.via,hub:hub(L.route.hub)||defHub(),set:true,addr:asAddr(hub(L.route.hub)||defHub())};
    const via=l.kind==='sample'?!!c.samples:!!c.bulk; return {via,hub:defHub(),set:false,addr:asAddr(defHub())}; }
  // sub-stage while the item is with us (L.st stays 'prod')
  function sub(L,via){ if(!via||!L||L.st!=='prod') return null; const V=L.via||{}; return V.gin?'atus':V.inTrk?'tous':null; }

  /* ---------- settings card ---------- */
  function mountSettings(el){ if(!el) return; const draw=()=>{ const c=cfg();
      el.innerHTML=`<div class="card">
        <div class="card-h"><h2>Shipping via us</h2><span class="tag">Goods in</span></div>
        <p class="lede">Some orders come to you from the supplier first, so you can check them and send them on. Set where suppliers deliver to, how long you need to turn them round, and what goes via you by default. You can change the route for any item on the order page.</p>
        <div class="lieuctl"><span class="lbl">Handling time</span><div class="stepper"><button data-vh="-1" aria-label="Decrease">−</button><span class="val">${c.handling}</span><button data-vh="1" aria-label="Increase">+</button></div><span class="unit">working day${c.handling===1?'':'s'} to receive and dispatch</span></div>
        <div class="vu-tg"><label><input type="checkbox" data-vt="samples"${c.samples?' checked':''}> <span><b>Samples</b> come via us by default</span></label>
          <label><input type="checkbox" data-vt="bulk"${c.bulk?' checked':''}> <span><b>Bulk orders</b> come via us by default</span></label></div>
        <h4 class="vu-h">Goods-in addresses</h4>
        <div class="vu-hubs">${c.hubs.map(h=>`<div class="vu-hub${h.def?' def':''}" data-vhub="${esc(h.id)}"><div><b>${esc(h.name)}</b><span>${esc((h.lines||[]).join(', '))}</span></div><div class="vu-ha">${h.def?'<em>Default</em>':`<button type="button" class="vu-lk" data-vdef="${esc(h.id)}">Make default</button>`}<button type="button" class="vu-lk" data-vedit="${esc(h.id)}">Edit</button>${c.hubs.length>1?`<button type="button" class="vu-lk del" data-vdel="${esc(h.id)}">Remove</button>`:''}</div></div>`).join('')}</div>
        <button type="button" class="vu-add" data-vadd>+ Add a goods-in address</button>
        <div data-vform hidden></div></div>`;
      el.querySelectorAll('[data-vh]').forEach(b=>b.onclick=()=>{ const c2=cfg(); c2.handling=Math.max(0,c2.handling+(+b.dataset.vh)); saveCfg(c2); draw(); });
      el.querySelectorAll('[data-vt]').forEach(i=>i.onchange=()=>{ const c2=cfg(); c2[i.dataset.vt]=i.checked; saveCfg(c2); });
      el.querySelectorAll('[data-vdef]').forEach(b=>b.onclick=()=>{ const c2=cfg(); c2.hubs.forEach(h=>h.def=h.id===b.dataset.vdef); saveCfg(c2); draw(); });
      el.querySelectorAll('[data-vdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Remove this goods-in address?')) return; const c2=cfg(); const wasDef=(c2.hubs.find(h=>h.id===b.dataset.vdel)||{}).def; c2.hubs=c2.hubs.filter(h=>h.id!==b.dataset.vdel); if(wasDef&&c2.hubs[0]) c2.hubs[0].def=true; saveCfg(c2); draw(); });
      const form=(h)=>{ const f=el.querySelector('[data-vform]'); f.hidden=false; f.innerHTML=`<div class="vu-form"><label><span>Name</span><input data-vn value="${esc(h?h.name:'')}" placeholder="e.g. Mojo Promotions · Leeds warehouse"></label><label><span>Address</span><textarea rows="4" data-vl placeholder="One line per row, ending with the postcode">${esc(h?(h.lines||[]).join('\n'):'')}</textarea></label><p class="vu-err" hidden></p><div class="vu-fa"><button type="button" class="vu-cancel">Cancel</button><button type="button" class="vu-save">${h?'Save':'Add address'}</button></div></div>`;
        f.querySelector('.vu-cancel').onclick=()=>{ f.hidden=true; f.innerHTML=''; };
        f.querySelector('.vu-save').onclick=()=>{ const n=f.querySelector('[data-vn]').value.trim(), ls=f.querySelector('[data-vl]').value.split('\n').map(t=>t.trim()).filter(Boolean); const er=f.querySelector('.vu-err'); if(!n||ls.length<2){ er.textContent='Add a name and at least two address lines.'; er.hidden=false; return; }
          const c2=cfg(); if(h){ const x=c2.hubs.find(y=>y.id===h.id); x.name=n; x.lines=ls; } else c2.hubs.push({id:'h'+Date.now().toString(36),name:n,lines:ls,def:!c2.hubs.length}); saveCfg(c2); draw(); };
        f.querySelector('[data-vn]').focus(); };
      el.querySelector('[data-vadd]').onclick=()=>form(null);
      el.querySelectorAll('[data-vedit]').forEach(b=>b.onclick=()=>form(hub(b.dataset.vedit)));
    };
    draw(); }

  /* ---------- delivery note (one page per delivery) ---------- */
  // pages: [{to:{name,lines}, items:[{name,type,vars:[{c,size,sku,qty}]}], ship:{courier,no,at}|null, n, of}]
  function dnHTML(o,pages,opt){ opt=opt||{}; const from=opt.from||'Mojo Promotions Ltd', dnNo=opt.no||('DN-'+String(o.ref||'').replace(/\D/g,''));
    const dt=d=>{ const x=d?new Date(d):new Date(); return x.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); };
    return pages.map((pg,k)=>{ const units=pg.items.reduce((a,it)=>a+it.vars.reduce((b,v)=>b+(+v.qty||0),0),0);
      return `<div class="dn" style="${k?'page-break-before:always;':''}">
      <div class="top"><div><h1>Delivery note</h1><div class="m">${esc(dnNo)}${pages.length>1?' · delivery '+(k+1)+' of '+pages.length:''} · ${dt(pg.ship&&pg.ship.at)}</div></div><div style="text-align:right"><b>${esc(from)}</b><div class="m">orders@mojopromotions.co.uk · 0113 496 0000</div></div></div>
      <div class="two"><div class="box"><b>Deliver to</b><br>${esc((pg.to&&pg.to.name)||'')}<br>${esc(((pg.to&&pg.to.lines)||[]).map(z=>String(z).replace(/,\s*$/,'')).filter(Boolean).join(', '))}${opt.contact?'<br><span class="m">FAO '+esc(opt.contact)+'</span>':''}</div>
        <div class="box"><b>Order</b> ${esc(o.ref)}${o.po?'<br><b>Your PO</b> '+esc(o.po):''}${o.project?'<br><b>Project</b> '+esc(o.project):''}${pg.ship?'<br><b>Shipped with</b> '+esc(pg.ship.courier||'')+' '+esc(pg.ship.no||''):''}</div></div>
      <table><thead><tr><th>Item</th><th>Colour</th><th>Size</th><th>SKU</th><th class="r">Qty</th><th class="r" style="width:70px">Received</th></tr></thead><tbody>
        ${pg.items.map(it=>it.vars.map((v,j)=>`<tr><td>${j?'':'<b>'+esc(it.name)+'</b>'+(it.type?'<div class="m">'+esc(it.type)+'</div>':'')}</td><td>${esc(v.c||'—')}</td><td>${esc(v.size||'—')}</td><td>${esc(v.sku||'')}</td><td class="r"><b>${(+v.qty||0).toLocaleString('en-GB')}</b></td><td class="r" style="border-bottom:1px solid #c8c8cf"></td></tr>`).join('')).join('')}
      </tbody><tfoot><tr><td colspan="4" class="r"><b>Total units</b></td><td class="r"><b>${units.toLocaleString('en-GB')}</b></td><td></td></tr></tfoot></table>
      <div class="two" style="margin-top:14px"><div class="box"><b>Packages</b> ________ &nbsp;&nbsp; <b>Weight</b> ________</div><div class="box"><b>Notes</b><br>${esc(opt.note||'Please check the goods when they arrive and tell us about anything damaged or missing within 48 hours.')}</div></div>
      <div class="box" style="margin-top:14px"><b>Received in good condition</b><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:22px"><div style="border-top:1px solid #98a2b3;padding-top:4px">Signature</div><div style="border-top:1px solid #98a2b3;padding-top:4px">Print name</div><div style="border-top:1px solid #98a2b3;padding-top:4px">Date</div></div></div>
      </div>`; }).join(''); }

  const css=`
  .vu-tg{display:flex;flex-direction:column;gap:8px;margin:14px 0 4px;} .vu-tg label{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--ink-2,#344054);cursor:pointer;} .vu-tg input{width:17px;height:17px;accent-color:var(--periwinkle-deep);}
  .vu-h{font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3,#667085);margin:18px 0 8px;}
  .vu-hubs{display:flex;flex-direction:column;gap:8px;} .vu-hub{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border:1px solid var(--line-soft,#e4e7ec);border-radius:12px;padding:11px 14px;background:#fff;} .vu-hub.def{border-color:var(--periwinkle);}
  .vu-hub>div:first-child{display:flex;flex-direction:column;gap:2px;min-width:0;} .vu-hub b{font-size:14px;} .vu-hub span{font-size:12.5px;color:var(--muted,#667085);}
  .vu-ha{display:flex;align-items:center;gap:12px;} .vu-ha em{font-style:normal;font-size:11px;font-weight:800;color:var(--periwinkle-deep);background:var(--tint-peri,#eceef9);border-radius:6px;padding:2px 7px;}
  .vu-lk{border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;} .vu-lk.del{color:#b42318;}
  .vu-add{margin-top:10px;border:1.5px dashed var(--line,#d0d5dd);background:#fff;border-radius:12px;padding:10px 14px;font:inherit;font-size:13.5px;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;width:100%;text-align:left;} .vu-add:hover{border-color:var(--periwinkle-deep);}
  .vu-form{display:flex;flex-direction:column;gap:10px;margin-top:10px;border:1px solid var(--line-soft,#e4e7ec);border-radius:12px;padding:14px;background:var(--paper,#f9fafb);} .vu-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;color:var(--ink-2,#344054);}
  .vu-form input,.vu-form textarea{font:inherit;font-size:14px;font-weight:500;border:1px solid var(--line,#d0d5dd);border-radius:9px;padding:9px 11px;background:#fff;resize:vertical;}
  .vu-fa{display:flex;justify-content:flex-end;gap:8px;} .vu-cancel,.vu-save{font:inherit;font-size:13.5px;font-weight:700;border-radius:9px;padding:8px 14px;cursor:pointer;} .vu-cancel{border:1px solid var(--line,#d0d5dd);background:#fff;} .vu-save{border:0;background:var(--periwinkle-deep);color:#fff;}
  .vu-err{margin:0;color:#b42318;font-size:13px;font-weight:600;} .vu-err[hidden]{display:none;}
  .od-route{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--g700,#344054);margin-top:8px;} .od-route .rt{display:inline-flex;align-items:center;gap:6px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--g100,#f2f4f7);}
  .od-route .rt.via{background:color-mix(in srgb,var(--sky,#0a84c6) 12%,#fff);color:#075985;} .od-vtag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.03em;border-radius:6px;padding:1px 7px;margin-left:6px;background:color-mix(in srgb,var(--sky,#0a84c6) 12%,#fff);color:#075985;vertical-align:2px;}
  .od-mates{display:flex;flex-direction:column;gap:6px;border:1px solid var(--g200,#e4e7ec);border-radius:10px;padding:10px 12px;background:var(--g50,#f9fafb);} .od-mates b{font-size:12.5px;} .od-mates label{display:flex;gap:8px;align-items:center;font-size:13px;}
  .od-gin td input{width:72px;font:inherit;font-size:13px;border:1px solid var(--g300,#d0d5dd);border-radius:7px;padding:5px 7px;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {cfg,saveCfg,hubs,hub,defHub,asAddr,route,sub,mountSettings,dnHTML};
})();
