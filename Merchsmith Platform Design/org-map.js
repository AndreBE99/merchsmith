/* ============================================================
   org-map.js — Map view for organisation tables (Platform Admin +
   distributors only). Pins from each organisation's address; the caller
   passes exactly the rows its table would show, so search + filters match.

   Leaflet 1.9.4 + OpenStreetMap tiles (loaded on first use, pinned + SRI).
   Coordinates: GEO seed below, else UK postcode lookup via postcodes.io,
   cached in localStorage 'ms-geo'. Map prefs: 'ms-map-prefs'.

   MSMAP.mount(host,{ctx, items, colours:[{k,label,of(item),legend:{key:[label,colour]}}],
                     sizeLabel, onOpen(id)})  → {update(items)}
   item: {id,name,sub,logo,address,place,lat,lng,rows:[[label,html]],status,statusLabel,flag,size}
   ============================================================ */
window.MSMAP=window.MSMAP||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // known seed locations [lat,lng,place]
  const GEO={
    citrix:[51.3870,-0.5080,'Chertsey'], northwind:[53.4826,-2.2498,'Manchester'], volt:[51.5203,-0.0716,'London'], fernlea:[50.7990,-3.1880,'Honiton'],
    brightpath:[51.4505,-2.5985,'Bristol'], meridian:[51.5133,-0.0876,'London'], oakhill:[51.3660,-0.1900,'Sutton'], lumio:[52.1946,0.1375,'Cambridge'],
    bagworks:[53.4845,-2.2255,'Manchester'], printhouse:[52.4797,-1.9087,'Birmingham'], greenstock:[53.8400,-1.5900,'Leeds'], lumen:[51.5259,-0.1156,'London'],
    'd:acme':[53.7970,-1.5530,'Leeds, UK'], 'd:brightside':[50.8225,-0.1372,'Brighton, UK'], 'd:northstar':[44.9778,-93.2650,'Minneapolis, US'], 'd:kober':[50.9375,6.9603,'Cologne, DE'],
    'd:limelight':[53.3498,-6.2603,'Dublin, IE'], 'd:pinnacle':[30.2672,-97.7431,'Austin, US'], 'd:verde':[41.3874,2.1686,'Barcelona, ES'], 'd:tartan':[55.8642,-4.2518,'Glasgow, UK'], 'd:cobalt':[51.4545,-2.5879,'Bristol, UK'],
    's:xd':[51.9244,4.4777,'Rotterdam, NL'], 's:pf':[51.1940,5.9870,'Roermond, NL'], 's:midocean':[52.3676,4.9041,'Amsterdam, NL'], 's:senator':[49.8000,8.8200,'Groß-Bieberau, DE'],
    's:printhouse':[52.4797,-1.9087,'Birmingham, UK'], 's:greenstock':[53.8400,-1.5900,'Leeds, UK']};
  const PC=/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
  const cache=()=>{ try{ return JSON.parse(localStorage.getItem('ms-geo')||'{}'); }catch(e){ return {}; } };
  const putCache=(k,v)=>{ const c=cache(); c[k]=v; try{ localStorage.setItem('ms-geo',JSON.stringify(c)); }catch(e){} };
  function locate(it){ if(it.lat!=null) return Promise.resolve(it); const g=GEO[it.geoKey||it.id]; if(g){ it.lat=g[0]; it.lng=g[1]; it.place=it.place||g[2]; return Promise.resolve(it); }
    const m=String(it.address||'').match(PC); if(!m) return Promise.resolve(it); const pc=(m[1]+' '+m[2]).toUpperCase(), c=cache()[pc];
    if(c){ it.lat=c[0]; it.lng=c[1]; it.place=it.place||c[2]; return Promise.resolve(it); }
    return fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(pc)).then(r=>r.json()).then(j=>{ if(j&&j.result){ const r=j.result; putCache(pc,[r.latitude,r.longitude,r.admin_district||r.region||'']); it.lat=r.latitude; it.lng=r.longitude; it.place=it.place||r.admin_district; } return it; }).catch(()=>it); }
  function place(q){ q=q.trim(); if(!q) return Promise.resolve(null); const m=q.match(PC);
    const url=m?'https://api.postcodes.io/postcodes/'+encodeURIComponent((m[1]+' '+m[2]).toUpperCase()):'https://api.postcodes.io/places?limit=1&q='+encodeURIComponent(q);
    return fetch(url).then(r=>r.json()).then(j=>{ const r=m?j.result:(j.result||[])[0]; return r?{lat:r.latitude,lng:r.longitude,name:m?(r.postcode+(r.admin_district?', '+r.admin_district:'')):r.name_1}:null; }).catch(()=>null); }

  let lp=null; function leaflet(){ if(window.L&&L.map) return Promise.resolve(); if(lp) return lp;
    lp=new Promise((ok,no)=>{ const l=document.createElement('link'); l.rel='stylesheet'; l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; l.integrity='sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H'; l.crossOrigin='anonymous'; document.head.appendChild(l);
      const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.integrity='sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH'; s.crossOrigin='anonymous'; s.onload=ok; s.onerror=no; document.head.appendChild(s); }); return lp; }
  const prefs=()=>{ try{ return JSON.parse(localStorage.getItem('ms-map-prefs')||'{}'); }catch(e){ return {}; } };
  const setPref=(ctx,p)=>{ const a=prefs(); a[ctx]=Object.assign(a[ctx]||{},p); try{ localStorage.setItem('ms-map-prefs',JSON.stringify(a)); }catch(e){} };
  const miles=(a,b)=>{ const R=3958.8, r=x=>x*Math.PI/180, dl=r(b.lat-a.lat), dn=r(b.lng-a.lng); const h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
  const AMPAL=['#5b5fc7','#1d9a7c','#e0723a','#0a84c6','#b0478f','#8a6d1f','#3c8f3a','#c43d4b'];
  const amColour=n=>AMPAL[[...String(n)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%AMPAL.length];

  function mount(host,opt){ const P=Object.assign({colour:(opt.colours[0]||{}).k,size:true,radius:25},prefs()[opt.ctx]||{});
    let items=[], near=null, map=null, layer=null, circle=null, fitted=false;
    host.innerHTML=`<div class="mm">
      <div class="mm-bar"><label class="mm-f">Colour pins by <select data-mmc>${opt.colours.map(c=>`<option value="${c.k}"${P.colour===c.k?' selected':''}>${esc(c.label)}</option>`).join('')}</select></label>
        ${opt.sizeLabel?`<label class="mm-chk"><input type="checkbox" data-mms${P.size?' checked':''}> ${esc(opt.sizeLabel)}</label>`:''}
        <form class="mm-near" data-mmnear><input data-mmq placeholder="Near a town or postcode" aria-label="Near a town or postcode"><select data-mmr aria-label="Radius">${[5,10,25,50,100].map(r=>`<option value="${r}"${+P.radius===r?' selected':''}>${r} miles</option>`).join('')}</select><button class="mm-b" type="submit">Go</button><button class="mm-b ic" type="button" data-mmme title="Near my location" aria-label="Near my location"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg></button></form>
        <button class="mm-b" data-mmfit>Fit to results</button></div>
      <div class="mm-nearbar" data-mmnb hidden></div>
      <div class="mm-wrap"><div class="mm-map" data-mmmap><div class="mm-load">Loading map…</div></div><div class="mm-legend" data-mmleg></div></div>
      <div class="mm-foot" data-mmfoot></div></div>`;
    const q=s=>host.querySelector(s);
    const col=()=>opt.colours.find(c=>c.k===P.colour)||opt.colours[0];
    const colourOf=it=>{ const c=col(), key=c.of(it); if(c.k==='am') return key?amColour(key):'#9aa0a6'; return ((c.legend||{})[key]||[0,'#9aa0a6'])[1]; };
    const shown=()=>items.filter(it=>it.lat!=null&&(!near||miles(near,it)<=near.r));
    const maxS=()=>Math.max(1,...items.map(it=>it.size||0));
    const px=it=>P.size&&opt.sizeLabel?Math.round(16+22*Math.sqrt((it.size||0)/maxS())):22;
    function legend(){ const c=col(), L=shown(); let keys;
      if(c.k==='am'){ keys=[...new Set(L.map(c.of))].map(k=>[k||'Unassigned',k?amColour(k):'#9aa0a6',L.filter(i=>c.of(i)===k).length]); }
      else keys=Object.entries(c.legend||{}).map(([k,[l,cl]])=>[l,cl,L.filter(i=>c.of(i)===k).length]).filter(x=>x[2]);
      q('[data-mmleg]').innerHTML=`<b>${esc(c.label)}</b>${keys.map(([l,cl,n])=>`<span><i style="background:${cl}"></i>${esc(l)}<em>${n}</em></span>`).join('')}${P.size&&opt.sizeLabel?`<small>Larger pins: ${esc(opt.sizeLabel.replace(/^Size by /i,'more '))}</small>`:''}`; }
    function foot(){ const off=items.filter(it=>it.lat==null), n=shown().length;
      q('[data-mmfoot]').innerHTML=`<span><b>${n}</b> on the map${near?` within ${near.r} miles of ${esc(near.name)}`:''}</span>${off.length?`<span class="mm-off">${off.length} without an address: ${off.map(it=>`<button data-mmopen="${esc(it.id)}">${esc(it.name)}</button>`).join('')}</span>`:''}`; }
    function popup(it){ return `<div class="mm-pop"><div class="mm-ph">${it.logo||''}<div><b>${esc(it.name)}</b>${it.sub?`<span>${esc(it.sub)}</span>`:''}</div></div>
      <div class="mm-pl">${esc([it.place,near?Math.round(miles(near,it))+' miles away':''].filter(Boolean).join(' · '))}</div>
      ${(it.rows||[]).filter(r=>r[1]).map(([l,v])=>`<div class="mm-pr"><span>${esc(l)}</span><b>${v}</b></div>`).join('')}
      <button class="mm-open" data-mmopen="${esc(it.id)}">Open details</button></div>`; }
    function draw(){ if(!map) return; legend(); foot(); layer.clearLayers(); const L=shown(), zoom=map.getZoom(), groups=[];
      // cluster pins that sit within ~44px of each other at this zoom
      L.forEach(it=>{ const p=map.project([it.lat,it.lng],zoom); const g=groups.find(g=>g.p.distanceTo(p)<44); if(g){ g.list.push(it); } else groups.push({p,list:[it]}); });
      groups.forEach(g=>{ if(g.list.length===1){ const it=g.list[0], s=px(it), c=colourOf(it), fl=it.flag==='red'||it.flag==='amber';
          const m=window.L.marker([it.lat,it.lng],{icon:window.L.divIcon({className:'mm-pin',html:`<span style="width:${s}px;height:${s}px;background:${c}">${fl?`<i class="f-${it.flag}"></i>`:''}</span>`,iconSize:[s,s],iconAnchor:[s/2,s/2]}),title:it.name,keyboard:true});
          m.bindPopup(popup(it),{maxWidth:280,minWidth:240,className:'mm-popw'}); layer.addLayer(m); }
        else { const lat=g.list.reduce((a,i)=>a+i.lat,0)/g.list.length, lng=g.list.reduce((a,i)=>a+i.lng,0)/g.list.length, n=g.list.length, s=Math.min(52,30+n*3);
          const m=window.L.marker([lat,lng],{icon:window.L.divIcon({className:'mm-cl',html:`<span style="width:${s}px;height:${s}px">${n}</span>`,iconSize:[s,s],iconAnchor:[s/2,s/2]}),title:n+' organisations'});
          m.on('click',()=>{ const b=window.L.latLngBounds(g.list.map(i=>[i.lat,i.lng])); if(map.getZoom()>=15||b.getNorthEast().equals(b.getSouthWest())){ m.bindPopup(`<div class="mm-pop"><b>${n} here</b>${g.list.map(i=>`<button class="mm-li" data-mmopen="${esc(i.id)}">${esc(i.name)}</button>`).join('')}</div>`).openPopup(); } else map.fitBounds(b.pad(.4)); });
          layer.addLayer(m); } }); }
    let pending=false;
    function fit(){ if(!map) return; const el=q('[data-mmmap]'); if(!el.offsetWidth||!el.offsetHeight){ pending=true; return; } pending=false; const L=shown(); if(near&&circle){ map.fitBounds(circle.getBounds().pad(.1)); return; } if(!L.length) return; if(L.length===1) map.setView([L[0].lat,L[0].lng],11); else map.fitBounds(window.L.latLngBounds(L.map(i=>[i.lat,i.lng])).pad(.18)); }
    function setNear(n){ near=n; if(circle){ circle.remove(); circle=null; } const nb=q('[data-mmnb]');
      if(n&&map){ circle=window.L.circle([n.lat,n.lng],{radius:n.r*1609.34,color:'#5b5fc7',weight:1.5,fillOpacity:.06,dashArray:'4 4'}).addTo(map); nb.hidden=false; nb.innerHTML=`Showing organisations within <b>${n.r} miles</b> of <b>${esc(n.name)}</b> <button data-mmclear>Clear</button>`; } else { nb.hidden=true; nb.innerHTML=''; }
      draw(); fit(); }
    host.addEventListener('click',e=>{ const o=e.target.closest('[data-mmopen]'); if(o){ e.preventDefault(); if(map) map.closePopup(); opt.onOpen(o.dataset.mmopen); return; }
      if(e.target.closest('[data-mmfit]')) return fit(); if(e.target.closest('[data-mmclear]')){ q('[data-mmq]').value=''; return setNear(null); }
      if(e.target.closest('[data-mmme]')){ if(!navigator.geolocation) return; navigator.geolocation.getCurrentPosition(p=>setNear({lat:p.coords.latitude,lng:p.coords.longitude,name:'your location',r:+q('[data-mmr]').value}),()=>{ const nb=q('[data-mmnb]'); nb.hidden=false; nb.innerHTML='Location access was blocked. Type a town or postcode instead. <button data-mmclear>OK</button>'; }); } });
    q('[data-mmnear]').onsubmit=e=>{ e.preventDefault(); const v=q('[data-mmq]').value; if(!v.trim()) return setNear(null); place(v).then(p=>{ if(!p){ const nb=q('[data-mmnb]'); nb.hidden=false; nb.innerHTML=`Couldn’t find “${esc(v)}”. Try a UK town or postcode. <button data-mmclear>Clear</button>`; return; } setNear(Object.assign(p,{r:+q('[data-mmr]').value})); }); };
    q('[data-mmr]').onchange=e=>{ P.radius=+e.target.value; setPref(opt.ctx,{radius:P.radius}); if(near) setNear(Object.assign(near,{r:P.radius})); };
    q('[data-mmc]').onchange=e=>{ P.colour=e.target.value; setPref(opt.ctx,{colour:P.colour}); draw(); };
    const sz=q('[data-mms]'); if(sz) sz.onchange=()=>{ P.size=sz.checked; setPref(opt.ctx,{size:P.size}); draw(); };
    leaflet().then(()=>{ const el=q('[data-mmmap]'); el.innerHTML=''; map=window.L.map(el,{scrollWheelZoom:false,zoomControl:true,attributionControl:true}).setView([54,-2.5],6);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);
      el.addEventListener('click',()=>map.scrollWheelZoom.enable(),{once:true});
      layer=window.L.layerGroup().addTo(map); map.on('zoomend',draw); draw(); fit(); fitted=true;
      // mounted while hidden (other tab): once it gets a real size, resize and re-fit
      new ResizeObserver(()=>{ if(!el.offsetWidth||!el.offsetHeight) return; map.invalidateSize(); if(pending){ fit(); draw(); } }).observe(el); }).catch(()=>{ q('[data-mmmap]').innerHTML='<div class="mm-load">The map couldn’t load. Check your connection and try again.</div>'; });
    function update(next){ items=next; Promise.all(items.map(locate)).then(()=>{ draw(); if(map&&!near) fit(); }); legend(); foot(); }
    update(opt.items||[]); return {update}; }

  const css=`
  .mm{margin-top:4px;}
  .mm-bar{display:flex;gap:10px 14px;flex-wrap:wrap;align-items:center;margin:0 0 10px;}
  .mm-f{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--ink-2);} .mm-f select,.mm-near select{font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:6px 10px;cursor:pointer;}
  .mm-chk{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--ink-2);cursor:pointer;} .mm-chk input{accent-color:var(--periwinkle-deep);}
  .mm-near{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-left:auto;} .mm-near input{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:999px;padding:6px 12px;width:190px;}
  .mm-b{font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;color:var(--ink-2);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;} .mm-b:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
  .mm-b.ic{padding:5px 7px;} .mm-b svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;}
  .mm-nearbar{font-size:13px;color:var(--ink-2);background:var(--tint-peri);border-radius:10px;padding:8px 12px;margin:0 0 10px;} .mm-nearbar button{border:0;background:none;font:inherit;font-weight:800;color:var(--periwinkle-deep);cursor:pointer;margin-left:8px;} .mm-nearbar[hidden]{display:none;}
  .mm-wrap{position:relative;isolation:isolate;z-index:0;border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;background:#eef0f4;}
  .mm-map{height:clamp(380px,62vh,640px);width:100%;} .mm-map .leaflet-tile-pane{filter:grayscale(.85) contrast(.92) brightness(1.04);}
  .mm-load{height:100%;display:grid;place-items:center;color:var(--muted);font-size:14px;}
  .mm-legend{position:absolute;left:12px;bottom:12px;z-index:500;background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:5px;font-size:12px;box-shadow:0 6px 20px rgba(20,22,45,.1);max-width:220px;}
  .mm-legend b{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);} .mm-legend span{display:flex;align-items:center;gap:7px;color:var(--ink-2);} .mm-legend i{width:11px;height:11px;border-radius:50%;flex:none;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12);} .mm-legend em{font-style:normal;margin-left:auto;color:var(--muted);font-weight:700;} .mm-legend small{color:var(--muted);font-size:11px;}
  .mm-pin span{display:block;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(20,22,45,.35);position:relative;cursor:pointer;transition:transform .15s;} .mm-pin:hover span{transform:scale(1.12);}
  .mm-pin i{position:absolute;top:-5px;right:-5px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;} .mm-pin i.f-amber{background:#e0a526;} .mm-pin i.f-red{background:#d6453d;}
  .mm-cl span{display:grid;place-items:center;border-radius:50%;background:var(--ink);color:#fff;font:800 13px var(--sans);border:3px solid #fff;box-shadow:0 0 0 4px rgba(20,22,45,.14),0 3px 10px rgba(20,22,45,.3);cursor:pointer;}
  .mm-popw .leaflet-popup-content-wrapper{border-radius:14px;padding:0;} .mm-popw .leaflet-popup-content{margin:14px 16px;font-family:var(--sans);}
  .mm-pop{display:flex;flex-direction:column;gap:6px;min-width:220px;} .mm-ph{display:flex;align-items:center;gap:10px;} .mm-ph b{display:block;font-size:14.5px;color:var(--ink);} .mm-ph span{font-size:12px;color:var(--muted);}
  .mm-pl{font-size:12px;color:var(--ink-3);font-weight:700;} .mm-pr{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;border-top:1px solid var(--paper-2);padding-top:5px;} .mm-pr span{color:var(--muted);} .mm-pr b{color:var(--ink);font-weight:700;text-align:right;}
  .mm-open{margin-top:6px;font:inherit;font-size:13px;font-weight:800;background:var(--periwinkle-deep);color:#fff;border:0;border-radius:10px;padding:9px 12px;cursor:pointer;} .mm-open:hover{filter:brightness(1.08);}
  .mm-li{display:block;width:100%;text-align:left;border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--periwinkle-deep);padding:5px 0;border-top:1px solid var(--paper-2);cursor:pointer;}
  .mm-foot{display:flex;gap:6px 18px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--ink-3);margin-top:10px;} .mm-off button{white-space:nowrap;border:0;background:var(--paper);border-radius:999px;font:inherit;font-size:12px;font-weight:700;color:var(--ink-2);padding:3px 10px;margin-left:5px;cursor:pointer;} .mm-off button:hover{color:var(--periwinkle-deep);}
  .ot-view{display:flex;border:1.5px solid var(--line-soft);border-radius:10px;overflow:hidden;background:#fff;margin-left:auto;flex:none;} .ot-view button{font:inherit;font-size:12.5px;font-weight:700;border:0;background:#fff;color:var(--ink-3);padding:7px 12px;cursor:pointer;display:flex;align-items:center;gap:6px;} .ot-view button+button{border-left:1.5px solid var(--line-soft);} .ot-view button.on{background:var(--ink);color:#fff;}
  .ot-view svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const TOGGLE=(v)=>`<div class="ot-view" role="group" aria-label="View"><button data-mapv="table" class="${v==='table'?'on':''}"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>Table</button><button data-mapv="map" class="${v==='map'?'on':''}"><svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14"/></svg>Map</button></div>`;
  const allowed=()=>{ const r=window.MSID&&MSID.current?MSID.current():(window.MS_SCOPE==='platform'?'admin':'distributor'); return r==='admin'||r==='distributor'; };
  return {mount,TOGGLE,allowed,locate};
})();
