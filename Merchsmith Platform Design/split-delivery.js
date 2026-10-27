/* split-delivery.js — one product line, several deliveries (Sep 2026).
   A line keeps one design / proof / PO line; only the goods are allocated across addresses.
   Carriage comes from each supplier's rates (first delivery, each extra delivery, markup) and
   suppliers can set limits (minimum quantity per delivery, maximum deliveries).
   Stores: ms-sup-carriage {supplier:{first,extra,markup,minPerDrop,maxDrops,note}}
   window.MSSPLIT: rate(sup) · setRate(sup,obj) · supplierOf(name) · charges(sup,n,base) · check(drops,vars,sup)
                   openAllocator(opts) · openEditor(sup,{onSave}) · dropQty(d) · dropText(d,vars) */
window.MSSPLIT=window.MSSPLIT||(function(){
  const KEY='ms-sup-carriage';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const r2=n=>Math.round((+n||0)*100)/100;
  const SUPMAP={'Recycled Cotton Tote':'BagWorks UK','Tech Travel Bag':'Veloce Print','Xoopar Pokket Wireless Mouse':'Lumen Goods','Prodir Ds8 True Biotic Pen':'Lumen Goods','RPET Document Pouch':'Veloce Print','Ceramic Mug 11oz':'PrintHouse','Heavy Weight T-Shirt':'Greenstock','Eco Wheat-Straw Charging Cable':'Lumen Goods'};
  const SEED={'Lumen Goods':{first:12,extra:9.5,markup:25,minPerDrop:25,maxDrops:6},'Veloce Print':{first:15,extra:11,markup:25,minPerDrop:50,maxDrops:4},'BagWorks UK':{first:10,extra:8,markup:25,minPerDrop:50,maxDrops:5},
    'PrintHouse':{first:14,extra:10,markup:25,minPerDrop:24,maxDrops:5},'Greenstock':{first:12,extra:9,markup:25,minPerDrop:20,maxDrops:8}};
  const DEF={first:12,extra:9.5,markup:25,minPerDrop:25,maxDrops:5,note:''};
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const rate=sup=>Object.assign({},DEF,SEED[sup]||{},all()[sup]||{});
  const setRate=(sup,v)=>{ const a=all(); a[sup]=Object.assign(rate(sup),v); try{ localStorage.setItem(KEY,JSON.stringify(a)); }catch(e){} };
  // two-supplier products ship to the customer from the decorator, so its carriage + limits apply
  const supplierOf=n=>{ const t=window.MSTWO&&MSTWO.get(n); return t?t.brand:(SUPMAP[n]||'Lumen Goods'); };
  // delivery 1 keeps the line's normal delivery charge; every extra delivery is the supplier's extra-drop rate plus markup
  // distributor defaults (Distributor Settings → Lead times): used when a supplier has no extra-delivery rate, and the price-on-request cap
  const DKEY='ms-split-defaults', DDEF={extra:9.5,markup:25,capAt:5};
  const defs=()=>{ try{ return Object.assign({},DDEF,JSON.parse(localStorage.getItem(DKEY)||'{}')); }catch(e){ return Object.assign({},DDEF); } };
  const setDefs=v=>{ try{ localStorage.setItem(DKEY,JSON.stringify(Object.assign(defs(),v))); }catch(e){} };
  const hasRate=sup=>{ const own=all()[sup]||SEED[sup]; return !!own&&+rate(sup).extra>0; };
  // delivery 1 keeps the line's normal delivery charge; each extra is the supplier's rate + markup, or the distributor default (estimated);
  // more addresses than the cap = price on request (distributor confirms the delivery cost)
  const charges=(sup,n,base)=>{ const R=rate(sup), D0=defs(), est=!hasRate(sup), por=n>(+D0.capAt||99), ex=est?r2(D0.extra*(1+D0.markup/100)):r2(R.extra*(1+R.markup/100)), rows=[];
    for(let k=0;k<n;k++) rows.push(k===0?{cost:R.first,sell:r2(base!=null?base:R.first*(1+R.markup/100))}:{cost:est?D0.extra:R.extra,sell:por?0:ex,por});
    return {rows,cost:r2(rows.reduce((a,r)=>a+r.cost,0)),sell:r2(rows.reduce((a,r)=>a+r.sell,0)),extraSell:ex,est,por,capAt:+D0.capAt}; };
  // dates: never before the agreed date unless an earlier date is requested (distributor confirms with the supplier)
  const toISO=v=>{ if(!v||/asap/i.test(v)) return ''; if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; let t; const m=String(v).match(/(\d{1,2})\s+([A-Za-z]{3,})(?:\s+(\d{4}))?/); if(m){ const now=new Date(); t=new Date(m[1]+' '+m[2]+' '+(m[3]||now.getFullYear())); if(!m[3]&&!isNaN(t)&&t<new Date(now.getFullYear(),now.getMonth(),now.getDate()-60)) t.setFullYear(t.getFullYear()+1); } else t=new Date(v); if(isNaN(t)) return ''; return new Date(t.getTime()-t.getTimezoneOffset()*6e4).toISOString().slice(0,10); };
  // no agreed date yet (e.g. in the basket): earliest = today + the product's lead time in working days
  function earliest(opts){ const nm=String(opts.title||'').replace(/^Split delivery · /,''); let lead=+opts.lead||0;
    if(!lead){ try{ const p=((window.STORE&&STORE.products)||[]).find(x=>x.name===nm); if(p) lead=+p.lead||0; }catch(e){} }
    if(!lead) return ''; const d=new Date(); let n=0; while(n<lead){ d.setDate(d.getDate()+1); if(d.getDay()%6) n++; }
    return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); }
  const fmtD=iso=>iso?new Date(iso+'T12:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'';
  const dropQty=d=>Object.values(d.alloc||{}).reduce((a,v)=>a+(+v||0),0);
  const aKey=a=>a?[a.name,...(a.lines||[])].join('|'):'';
  const aTxt=a=>a?[a.name,...(a.lines||[])].map(s=>String(s).replace(/,\s*$/,'')).filter(Boolean).join(', '):'';
  const dropText=(d,vars)=>(d&&d.earlyReq?'[earlier date requested] ':'')+(vars.length>1?vars.filter(v=>+(d.alloc||{})[v.key]).map(v=>(+d.alloc[v.key]).toLocaleString('en-GB')+' '+v.key).join(', '):dropQty(d).toLocaleString('en-GB')+' units');
  function check(drops,vars,sup){ const R=rate(sup), e=[];
    if(drops.length>R.maxDrops) e.push(sup+' delivers to up to '+R.maxDrops+' addresses per product.');
    drops.forEach((d,k)=>{ if(!d.address) e.push('Choose an address for delivery '+(k+1)+'.'); const q=dropQty(d); if(!q) e.push('Delivery '+(k+1)+' has nothing allocated.'); else if(q<R.minPerDrop) e.push('Delivery '+(k+1)+' is '+q+' units; '+sup+'’s minimum is '+R.minPerDrop+' per delivery.'); });
    vars.forEach(v=>{ const s=drops.reduce((a,d)=>a+(+(d.alloc||{})[v.key]||0),0); if(s!==v.qty) e.push((vars.length>1?v.key+': ':'')+(s<v.qty?(v.qty-s)+' left to allocate':(s-v.qty)+' too many allocated')+'.'); });
    const seen=new Set(); drops.forEach(d=>{ const k=aKey(d.address); if(k&&seen.has(k)) e.push(aTxt(d.address).split(',')[0]+' is used twice. Combine them into one delivery.'); seen.add(k); });
    return e; }

  /* new delivery address: same form as the basket (address name, recipient, company, phone, postcode finder, one field per line, instructions) */
  function addrForm(onSave){ const w=document.createElement('div'); w.className='sd-scrim sd-scrim2';
    w.innerHTML=`<div class="sd-modal sd-am" role="dialog" aria-modal="true" aria-label="Add delivery address"><div class="sd-mh"><b>Add delivery address</b><button class="sd-x" data-amx aria-label="Close">×</button></div>
      <div class="sd-mb abk-form2">
        <div class="abk-g2"><label class="ad-f"><span>Address name <em>*</em></span><input data-am="label" placeholder="e.g. Leeds office, Event venue"><small>So you can pick it again next time.</small></label>
        <label class="ad-f"><span>Recipient <em>*</em></span><input data-am="name" placeholder="Person or team receiving it"><small>Printed on the parcel label.</small></label>
        <label class="ad-f"><span>Company</span><input data-am="co" placeholder="Optional"></label>
        <label class="ad-f"><span>Phone</span><input data-am="tel" type="tel" placeholder="For the courier, optional"></label></div>
        ${window.MSADDR?MSADDR.fieldsHTML({}):'<label class="ad-f"><span>Address</span><textarea data-am="lines" rows="4" placeholder="One line per row, ending with the postcode"></textarea></label>'}
        <label class="ad-f"><span>Delivery instructions</span><input data-am="note" placeholder="e.g. Goods in at the rear, open 8am–4pm"></label>
        <p class="abk-err" data-amerr hidden></p></div>
      <div class="sd-mf"><button class="sd-l" data-amx>Cancel</button><button class="sd-b" data-amsave>Save &amp; use</button></div></div>`;
    document.body.appendChild(w); const g=k=>{ const e=w.querySelector('[data-am="'+k+'"]'); return e?e.value.trim():''; }, close=()=>w.remove();
    if(window.MSADDR) MSADDR.wire(w); w.querySelectorAll('[data-amx]').forEach(b=>b.onclick=close); w.addEventListener('mousedown',e=>{ if(e.target===w) close(); });
    const err=m=>{ const e=w.querySelector('[data-amerr]'); e.textContent=m; e.hidden=!m; if(m){ const b=w.querySelector('.sd-mb'); b.scrollTop=b.scrollHeight; } };
    setTimeout(()=>{ const f=w.querySelector('[data-am="label"]'); if(f) f.focus(); },30);
    w.querySelector('[data-amsave]').onclick=()=>{ const label=g('label'), name=g('name'), co=g('co'), tel=g('tel'), note=g('note');
      if(!label){ w.querySelector('[data-am="label"]').focus(); return err('Give the address a name, e.g. Leeds office.'); }
      if(!name){ w.querySelector('[data-am="name"]').focus(); return err('Add who it’s for.'); }
      let lines, fields=null;
      if(window.MSADDR){ fields=MSADDR.read(w); const e=MSADDR.validate(fields); if(e.length) return err(e[0].charAt(0).toUpperCase()+e[0].slice(1)); lines=(co?[co]:[]).concat(MSADDR.lines(fields)); }
      else { lines=g('lines').split('\n').map(t=>t.trim()).filter(Boolean); if(lines.length<2) return err('Add at least two address lines.'); }
      close(); onSave(Object.assign({label,name,lines,company:co,tel,note},fields||{})); }; }
  function defaultsPanel(el){ if(!el) return; const v=defs();
    el.innerHTML='<div class="card"><div class="card-h"><h2>Split deliveries</h2><span class="tag">Default rate</span></div><p class="lede">Used when a product is split across several addresses and its supplier hasn’t set an extra-delivery rate. Customers see these charges as an estimate until you confirm them.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:12px"><label class="sd-f"><span>Each extra address (cost, £)</span><input type="number" min="0" step="0.01" data-sdd="extra" value="'+v.extra+'"></label><label class="sd-f"><span>Markup to customer (%)</span><input type="number" min="0" step="1" data-sdd="markup" value="'+v.markup+'"></label><label class="sd-f"><span>Price on request above (addresses)</span><input type="number" min="1" step="1" data-sdd="capAt" value="'+v.capAt+'"><small>More addresses than this: you confirm the delivery cost before the order goes ahead.</small></label></div></div>';
    el.querySelectorAll('[data-sdd]').forEach(i=>i.onchange=()=>{ setDefs({[i.dataset.sdd]:+i.value||0}); const t=document.getElementById('toast'); if(t){ t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); } }); }
  function modal(title,body){ const w=document.createElement('div'); w.className='sd-scrim'; w.innerHTML=`<div class="sd-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sd-mh"><b>${esc(title)}</b><button class="sd-x" data-sdx aria-label="Close">×</button></div><div class="sd-mb">${body}</div></div>`;
    document.body.appendChild(w); const close=()=>w.remove(); w.addEventListener('mousedown',e=>{ if(e.target===w) close(); }); w.querySelector('[data-sdx]').onclick=close;
    const esc2=e=>{ if(e.key==='Escape'){ close(); document.removeEventListener('keydown',esc2); } }; document.addEventListener('keydown',esc2); return {w,close}; }

  /* opts: {title, variants:[{key,hex,qty}], drops, book:[{label,name,lines}], supplier, base, onSave(drops|null, charges), onAddAddress(a), who:'customer'|'distributor', note} */
  function openAllocator(opts){ const V=opts.variants.filter(v=>v.qty>0), sup=opts.supplier, R=rate(sup);
    let book=(opts.book||[]).slice(), D=(opts.drops&&opts.drops.length?opts.drops:[{address:opts.address||null,alloc:Object.fromEntries(V.map(v=>[v.key,v.qty])),date:opts.date||'',nofail:!!opts.nofail}]).map(d=>JSON.parse(JSON.stringify(d)));
    if(D.length===1) D.push({address:null,alloc:Object.fromEntries(V.map(v=>[v.key,0])),date:D[0].date||'',nofail:D[0].nofail});
    const {w,close}=modal(opts.title||'Split delivery',''), mb=w.querySelector('.sd-mb'); let adding=-1;
    const cust=((window.MSID&&MSID.current&&MSID.current())==='customer'), agreed=toISO(opts.date)||earliest(opts), agreedSrc=toISO(opts.date)?'agreed':'lead';
    if(agreed) D.forEach(d=>{ if(!d.earlyReq&&toISO(d.dateISO||d.date)&&toISO(d.dateISO||d.date)<agreed){ d.dateISO=agreed; d.date=fmtD(agreed); } });
    const draw=()=>{ const left=V.map(v=>v.qty-D.reduce((a,d)=>a+(+d.alloc[v.key]||0),0)), ch=charges(sup,D.length,opts.base), errs=check(D,V,sup);
      mb.innerHTML=`<p class="sd-lede">Same design and one production run. Choose how many go to each address. Price breaks still use the full quantity.</p>
        <div class="sd-lim"><span>${((window.MSID&&MSID.current&&MSID.current())==='customer')?'':'<b>'+esc(sup)+'</b> · '}${((window.MSID&&MSID.current&&MSID.current())==='customer')?'M':'m'}inimum ${R.minPerDrop} per delivery · up to ${R.maxDrops} addresses</span><span>First delivery ${gbp(ch.rows[0].sell)} · each extra address ${ch.por?'price on request':gbp(ch.extraSell)+(ch.est?' (estimated)':'')}</span></div>
        ${ch.por?`<div class="sd-note">More than ${ch.capAt} addresses: ${cust?'the delivery cost will be confirmed by your account manager before the order goes ahead.':'price on request. Confirm the delivery cost before the order goes to the supplier.'}</div>`:ch.est&&D.length>1?`<div class="sd-note">${cust?'Extra delivery charges are an estimate. Your account manager confirms them when they check the order.':esc(sup)+' has no extra-delivery rate, so your default rate is used and shown to the customer as an estimate. Confirm it when you check the order.'}</div>`:''}
        <div class="sd-tw"><table class="sd-t"><thead><tr><th>Delivery to</th>${V.map(v=>`<th class="n">${v.hex?`<i style="background:${esc(v.hex)}"></i>`:''}${esc(V.length>1?v.key:'Quantity')}<small>${v.qty.toLocaleString('en-GB')}</small></th>`).join('')}<th class="n">Total</th><th>Deliver by${agreed?'<small>Earliest '+fmtD(agreed)+'</small>':''}</th><th class="n">Delivery</th><th></th></tr></thead>
        <tbody>${D.map((d,k)=>`<tr><td><div class="sd-ad"><span class="sd-n">${k+1}</span><select data-da="${k}"><option value="">Choose address…</option>${book.map((a,i)=>`<option value="${i}"${aKey(a)===aKey(d.address)?' selected':''}>${esc(a.label||a.name)}</option>`).join('')}<option value="new">New address…</option></select></div>${d.address?`<small class="sd-at">${esc(aTxt(d.address))}</small>`:''}
            </td>
          ${V.map(v=>`<td class="n"><input type="number" min="0" step="1" data-dq="${k}" data-v="${esc(v.key)}" value="${+d.alloc[v.key]||0}" aria-label="${esc(v.key)} for delivery ${k+1}"></td>`).join('')}
          <td class="n"><b>${dropQty(d).toLocaleString('en-GB')}</b></td>
          <td class="sd-dt"><input type="date" data-dd="${k}" value="${esc(toISO(d.dateISO||d.date)||agreed)}"${agreed&&!d.earlyReq?' min="'+agreed+'"':''} aria-label="Deliver by, delivery ${k+1}">
            ${d.earlyReq?'<span class="sd-req">Earlier date requested · to be confirmed</span><button type="button" class="sd-l" data-dnoreq="'+k+'">Cancel request</button>':(agreed?'<button type="button" class="sd-l" data-dreq="'+k+'">Need it sooner?</button>':'')}
            <label class="sd-crit"><input type="checkbox" data-dc="${k}"${d.nofail?' checked':''}> Critical</label></td>
          <td class="n">${k>0&&ch.por?'<i class="sd-por">On request</i>':gbp(ch.rows[k].sell)+(k>0&&ch.est?'<small class="sd-est">est.</small>':'')}</td><td>${D.length>1?`<button class="sd-rm" data-drm="${k}" aria-label="Remove delivery ${k+1}">×</button>`:''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Left to allocate</td>${left.map(n=>`<td class="n ${n===0?'ok':n<0?'bad':'due'}">${n}</td>`).join('')}<td class="n ${left.every(n=>n===0)?'ok':'due'}">${left.reduce((a,n)=>a+n,0)}</td><td></td><td class="n"><b>${ch.por&&D.length>1?gbp(ch.rows[0].sell)+' + on request':gbp(ch.sell)+(ch.est&&D.length>1?' est.':'')}</b></td><td></td></tr></tfoot></table></div>
        <div class="sd-tools"><button class="sd-b" data-dadd${D.length>=R.maxDrops?' disabled':''}>+ Add delivery</button><button class="sd-b" data-deven>Split evenly</button><label class="sd-rest">Send the rest to <select data-drest>${D.map((d,k)=>`<option value="${k}">Delivery ${k+1}${d.address?' · '+esc((d.address.name||'').split(',')[0]):''}</option>`).join('')}</select><button class="sd-b" data-drestgo>Apply</button></label></div>
        ${errs.length?`<ul class="sd-err">${errs.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>`:''}
        ${opts.note?`<p class="sd-note">${opts.note}</p>`:''}
        <div class="sd-ft">${opts.drops&&opts.drops.length>1?'<button class="sd-l" data-done1>Back to one address</button>':'<span></span>'}<div><button class="sd-b" data-sdcancel>Cancel</button><button class="sd-p" data-sdsave${errs.length?' disabled':''}>Save ${D.length} deliveries</button></div></div>`;
      const q=s=>mb.querySelectorAll(s);
      q('[data-dq]').forEach(i=>i.onchange=()=>{ D[+i.dataset.dq].alloc[i.dataset.v]=Math.max(0,parseInt(i.value,10)||0); draw(); });
      q('[data-dd]').forEach(i=>i.onchange=()=>{ const d=D[+i.dataset.dd]; let v=i.value; if(agreed&&v&&v<agreed&&!d.earlyReq){ v=agreed; i.value=agreed; alert('The earliest delivery for this product is '+fmtD(agreed)+(agreedSrc==='lead'?' (its lead time)':'')+'. Use “Need it sooner?” to ask for an earlier date.'); } d.dateISO=v; d.date=fmtD(v); });
      q('[data-dreq]').forEach(b=>b.onclick=()=>{ const d=D[+b.dataset.dreq]; d.earlyReq=true; draw(); const i=mb.querySelector('[data-dd="'+b.dataset.dreq+'"]'); if(i){ i.removeAttribute('min'); i.focus(); try{ i.showPicker&&i.showPicker(); }catch(e){} } });
      q('[data-dnoreq]').forEach(b=>b.onclick=()=>{ const d=D[+b.dataset.dnoreq]; d.earlyReq=false; if(agreed&&(!d.dateISO||d.dateISO<agreed)){ d.dateISO=agreed; d.date=fmtD(agreed); } draw(); });
      q('[data-dc]').forEach(i=>i.onchange=()=>{ D[+i.dataset.dc].nofail=i.checked; });
      q('[data-da]').forEach(s=>s.onchange=()=>{ const k=+s.dataset.da; if(s.value==='new'){ adding=k; draw(); return; } const a=book[+s.value]; D[k].address=a?{name:a.name,lines:(a.lines||[]).slice()}:null; draw(); });
      q('[data-nsave]').forEach(b=>b.onclick=()=>{ const n=mb.querySelector('[data-nn]').value.trim(), ls=mb.querySelector('[data-nl]').value.split('\n').map(t=>t.trim()).filter(Boolean); if(!n||ls.length<2) return alert('Add a name and at least two address lines.');
        const a={label:n,name:n,lines:ls}; if(opts.onAddAddress) opts.onAddAddress(a); book.push(a); D[+b.dataset.nsave].address={name:n,lines:ls}; adding=-1; draw(); });
      q('[data-ncancel]').forEach(b=>b.onclick=()=>{ adding=-1; draw(); });
      if(adding>=0){ const k=adding; adding=-1; addrForm(a=>{ if(opts.onAddAddress) opts.onAddAddress(a); book.push(a); D[k].address={name:a.name,lines:a.lines.slice()}; draw(); }); }
      q('[data-drm]').forEach(b=>b.onclick=()=>{ const k=+b.dataset.drm, gone=D.splice(k,1)[0]; V.forEach(v=>{ D[0].alloc[v.key]=(+D[0].alloc[v.key]||0)+(+gone.alloc[v.key]||0); }); draw(); });
      q('[data-dadd]').forEach(b=>b.onclick=()=>{ D.push({address:null,alloc:Object.fromEntries(V.map(v=>[v.key,0])),date:D[0].date||'',nofail:false}); draw(); });
      q('[data-deven]').forEach(b=>b.onclick=()=>{ V.forEach(v=>{ let acc=0; D.forEach((d,k)=>{ const n=k===D.length-1?v.qty-acc:Math.floor(v.qty/D.length); d.alloc[v.key]=n; acc+=n; }); }); draw(); });
      q('[data-drestgo]').forEach(b=>b.onclick=()=>{ const k=+mb.querySelector('[data-drest]').value; V.forEach((v,j)=>{ const l=v.qty-D.reduce((a,d)=>a+(+d.alloc[v.key]||0),0); D[k].alloc[v.key]=Math.max(0,(+D[k].alloc[v.key]||0)+l); }); draw(); });
      q('[data-sdcancel]').forEach(b=>b.onclick=close);
      q('[data-done1]').forEach(b=>b.onclick=()=>{ if(!confirm('Send everything to one address again?')) return; close(); opts.onSave(null,charges(sup,1,opts.base)); });
      q('[data-sdsave]').forEach(b=>b.onclick=()=>{ if(check(D,V,sup).length) return; const ch2=charges(sup,D.length,opts.base); close(); opts.onSave(D,ch2);
        try{ const ttl=String(opts.title||'').replace(/^Split delivery · /,''), er=D.filter(d=>d.earlyReq).length; if(window.MSNOTIF&&(er||ch2.por||ch2.est)) MSNOTIF.push('distributor',{ev:'action_due',title:'Split delivery to confirm: '+ttl,body:[er?er+' earlier date'+(er>1?'s':'')+' requested':'',ch2.por?'delivery cost on request ('+D.length+' addresses)':'',ch2.est?'estimated extra-delivery charges':''].filter(Boolean).join(' · '),href:'Merchsmith Orders.html'}); }catch(e){} }); };
    draw(); }

  function openEditor(sup,o2){ o2=o2||{}; const R=rate(sup), ro=!!o2.readOnly;
    const f=(k,l,v,st,hint)=>`<label class="sd-f"><span>${l}</span><input type="number" min="0" step="${st}" data-rk="${k}" value="${v}"${ro?' disabled':''}>${hint?`<small>${hint}</small>`:''}</label>`;
    const {w,close}=modal('Carriage & delivery limits · '+sup,`<p class="sd-lede">Used when a product is split across several addresses. The first delivery uses the product’s normal delivery charge.</p>
      <h6 class="sd-h">Carriage</h6><div class="sd-g3">${f('first','First delivery (cost, £)',R.first,'0.01')}${f('extra','Each extra delivery (cost, £)',R.extra,'0.01')}${f('markup','Markup to customer (%)',R.markup,'1','Each extra delivery costs the customer '+gbp(R.extra*(1+R.markup/100)))}</div>
      <h6 class="sd-h">Limits</h6><div class="sd-g3">${f('minPerDrop','Minimum per delivery (units)',R.minPerDrop,'1')}${f('maxDrops','Maximum addresses per product',R.maxDrops,'1')}</div>
      <label class="sd-f"><span>Notes for split deliveries</span><textarea rows="2" data-rn${ro?' disabled':''} placeholder="e.g. Highlands and islands charged at cost">${esc(R.note||'')}</textarea></label>
      <div class="sd-ft"><span></span><div><button class="sd-b" data-sdcancel>${ro?'Close':'Cancel'}</button>${ro?'':'<button class="sd-p" data-rsave>Save</button>'}</div></div>`);
    w.querySelector('[data-sdcancel]').onclick=close;
    const s=w.querySelector('[data-rsave]'); if(s) s.onclick=()=>{ const v={}; w.querySelectorAll('[data-rk]').forEach(i=>v[i.dataset.rk]=Math.max(0,parseFloat(i.value)||0)); v.minPerDrop=Math.round(v.minPerDrop); v.maxDrops=Math.max(1,Math.round(v.maxDrops)); v.note=w.querySelector('[data-rn]').value.trim(); setRate(sup,v); close(); if(o2.onSave) o2.onSave(rate(sup)); }; }

  const css=`
  .sd-note{font-size:12.5px;line-height:1.5;color:#93370d;background:#fffaeb;border-radius:10px;padding:8px 12px;margin:8px 0 2px;} .sd-est{display:block;font-size:10.5px;color:#b54708;font-weight:700;} .sd-por{font-style:normal;font-size:12px;font-weight:700;color:#b54708;white-space:nowrap;} .sd-dt{min-width:170px;} .sd-dt input[type=date]{font:inherit;font-size:13px;width:100%;} .sd-req{display:block;font-size:11.5px;font-weight:700;color:#b54708;margin:4px 0 0;} .sd-dt .sd-l{display:block;font-size:12px;padding:2px 0;margin-top:2px;}
  .sd-scrim2{z-index:2600!important;} .sd-am{width:min(560px,100%)!important;max-height:calc(100vh - 32px);display:flex;flex-direction:column;} .sd-am .sd-mh,.sd-am .sd-mf{flex:none;} .sd-am .sd-mb{overflow-y:auto;min-height:0;flex:1;} .sd-am [data-amsave]{background:var(--periwinkle-deep)!important;border-color:var(--periwinkle-deep)!important;color:#fff!important;} .sd-mf{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--line-soft);}
  .abk-form2{display:flex;flex-direction:column;gap:12px;} .abk-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px;} @media(max-width:560px){.abk-g2{grid-template-columns:1fr;}} .abk-form2 .ad-f{display:flex;flex-direction:column;gap:5px;} .abk-form2 .ad-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);text-transform:none;letter-spacing:0;} .abk-form2 .ad-f em{color:#c0392b;font-style:normal;} .abk-form2 .ad-f small{font-size:11.5px;color:var(--muted);font-weight:500;} .abk-form2 input,.abk-form2 select,.abk-form2 textarea{font:inherit;font-size:14px;font-weight:500;} .abk-form2 input::placeholder{font-weight:400;color:#98a2b3;} .abk-err{margin:0;font-size:13px;color:#b42318;background:#fef3f2;border-radius:10px;padding:8px 12px;}
  .sd-scrim{position:fixed;inset:0;z-index:2100;background:rgba(16,24,40,.5);display:grid;place-items:center;padding:16px;}
  .sd-modal{background:#fff;border-radius:16px;width:min(1040px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(16,24,40,.28);font-family:var(--sans,inherit);}
  .sd-mh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 22px 10px;flex:none;} .sd-mh b{flex:1;min-width:0;height:auto;line-height:1.2;font-family:var(--serif,serif);font-weight:500;font-size:24px;color:var(--g900,#101828);}
  .sd-x{border:0;background:none;font-size:26px;line-height:1;color:var(--g500,#667085);cursor:pointer;} .sd-mb{padding:0 22px 20px;overflow:auto;display:flex;flex-direction:column;gap:12px;min-height:0;} .sd-mb>*{flex-shrink:0;}
  .sd-lede{margin:0;font-size:13.5px;color:var(--g600,#475467);line-height:1.5;}
  .sd-lim{display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;background:var(--g50,#f9fafb);border:1px solid var(--g200,#e4e7ec);border-radius:10px;padding:9px 12px;font-size:12.5px;color:var(--g600,#475467);} .sd-lim b{color:var(--g900,#101828);} .sd-lim>span{white-space:nowrap;}
  .sd-tw{overflow-x:auto;border:1px solid var(--g200,#e4e7ec);border-radius:12px;}
  .sd-t{width:100%;border-collapse:collapse;font-size:13px;min-width:720px;} .sd-t th{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--g500,#667085);text-align:left;padding:9px 10px;background:var(--g50,#f9fafb);border-bottom:1px solid var(--g200,#e4e7ec);white-space:nowrap;}
  .sd-t th i{display:inline-block;width:10px;height:10px;border-radius:50%;border:1px solid rgba(0,0,0,.15);margin-right:5px;vertical-align:-1px;} .sd-t th small{display:block;font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--g400,#98a2b3);}
  .sd-t td{padding:9px 10px;border-bottom:1px solid var(--g100,#f2f4f7);vertical-align:top;} .sd-t .n{text-align:right;} .sd-t tbody tr:last-child td{border-bottom:0;}
  .sd-t input[type=number]{width:72px;text-align:right;font:inherit;font-size:13px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:6px 8px;} .sd-t input[type=text]{width:110px;font:inherit;font-size:13px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:6px 8px;}
  .sd-t select{font:inherit;font-size:13px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:6px 8px;max-width:220px;background:#fff;}
  .sd-ad{display:flex;align-items:center;gap:8px;} .sd-n{width:22px;height:22px;border-radius:50%;background:var(--periwinkle-deep,#4E5BA6);color:#fff;font-size:11.5px;font-weight:700;display:grid;place-items:center;flex:none;}
  .sd-at{display:block;margin:4px 0 0 30px;font-size:11.5px;color:var(--g500,#667085);max-width:260px;line-height:1.35;}
  .sd-crit{display:flex;align-items:center;gap:5px;margin-top:5px;font-size:11.5px;color:var(--g600,#475467);white-space:nowrap;}
  .sd-t tfoot td{background:var(--g50,#f9fafb);font-weight:700;border-top:1px solid var(--g200,#e4e7ec);border-bottom:0;} .sd-t tfoot .ok{color:#067647;} .sd-t tfoot .due{color:#b54708;} .sd-t tfoot .bad{color:#b42318;}
  .sd-rm{border:0;background:none;font-size:18px;color:var(--g400,#98a2b3);cursor:pointer;} .sd-rm:hover{color:#b42318;}
  .sd-new{display:flex;flex-direction:column;gap:6px;margin:8px 0 0 30px;max-width:280px;} .sd-new input,.sd-new textarea{font:inherit;font-size:13px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:7px 9px;} .sd-new>div{display:flex;gap:8px;align-items:center;}
  .sd-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;} .sd-rest{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--g600,#475467);margin-left:auto;} .sd-rest select{font:inherit;font-size:13px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:6px 8px;}
  .sd-b,.sd-p{font:inherit;font-size:13.5px;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s,box-shadow .15s;} .sd-b{background:#fff;color:var(--g700,#344054);border:1px solid var(--g300,#d0d5dd);box-shadow:0 1px 2px rgba(16,24,40,.05);} .sd-b:hover{background:var(--g50,#f9fafb);} .sd-b:disabled{opacity:.5;cursor:default;}
  .sd-p{background:var(--periwinkle-deep,#4E5BA6);color:#fff;border:1px solid var(--periwinkle-deep,#4E5BA6);} .sd-p:hover{filter:brightness(1.08);} .sd-p:disabled{opacity:.45;cursor:default;filter:none;}
  .sd-l{border:0;background:none;font:inherit;font-size:13px;font-weight:600;color:var(--periwinkle-deep,#4E5BA6);cursor:pointer;padding:0;}
  .sd-err{margin:0;padding:10px 12px 10px 28px;background:#fef3f2;border:1px solid #fecdca;border-radius:10px;color:#b42318;font-size:12.5px;line-height:1.5;}
  .sd-note{margin:0;font-size:12.5px;color:var(--g600,#475467);background:#fffaeb;border:1px solid #fedf89;border-radius:10px;padding:9px 12px;line-height:1.45;}
  .sd-ft{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:6px;} .sd-ft>div{display:flex;gap:8px;}
  .sd-h{margin:4px 0 -4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--g500,#667085);}
  .sd-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;} @media(max-width:640px){.sd-g3{grid-template-columns:1fr;}}
  .sd-f{display:flex;flex-direction:column;gap:5px;} .sd-f span{font-size:12.5px;font-weight:600;color:var(--g700,#344054);} .sd-f input,.sd-f textarea{font:inherit;font-size:14px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:8px 10px;} .sd-f small{font-size:11.5px;color:var(--g500,#667085);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {rate,setRate,supplierOf,charges,check,openAllocator,openEditor,dropQty,dropText,aTxt,aKey,defs,setDefs,hasRate,defaultsPanel};
})();
