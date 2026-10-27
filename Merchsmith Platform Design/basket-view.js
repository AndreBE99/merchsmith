/* basket-view.js — Your Basket (polished, Sep 2026). Loaded after order-page.js; replaces the basket
   step only (finance + confirmation stay in order-page.js, which calls window.__bkRender when present).
   Table polished like the project list: tinted header bar, lines grouped by project with subtotals,
   approved visual as thumbnail, colour split with editable quantities, order-by warnings, address chips
   with "deliver all to one address", credit + payment terms in the summary, sticky summary, labelled icons. */
(function(){
  'use strict';
  const O=window.MSOrders; if(!O) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=O.gbp;
  // swatch colour for a colour name (lines added from a project may carry names only)
  const HEX={black:'#1a1a1e',white:'#f4f4f0',grey:'#8a8a93',gray:'#8a8a93','light grey':'#c8c8cf','dark grey':'#4b4b52',charcoal:'#3a3a40',navy:'#1f2a4a','dark blue':'#2a3550',blue:'#3d6be0','royal blue':'#2f55c7','light blue':'#9cc3ea',aqua:'#7fd4d1',teal:'#1f8a8a',green:'#2f8f4e','forest green':'#23553a',lime:'#9ccc3d',yellow:'#f2c230',orange:'#f08a24',red:'#d92b2b',burgundy:'#7a1f33',pink:'#f19bbd',purple:'#6b3fa0',brown:'#7a5230',beige:'#d9c7a7',natural:'#e8dfc8',cream:'#f3ecd8',silver:'#c0c3c8',gold:'#c9a54a',terracotta:'#c4623f',transparent:'#eef0f2'};
  const hexOf=(name,hex)=>{ if(hex) return hex; const k=String(name||'').toLowerCase().trim(); if(HEX[k]) return HEX[k]; const hit=Object.keys(HEX).sort((a,c)=>c.length-a.length).find(x=>k.includes(x)); return hit?HEX[hit]:'#c8c8cf'; };
  const sw=(name,hex)=>`<i class="bk-sw" style="background:${esc(hexOf(name,hex))}" title="${esc(name)}"></i>`;
  // one-time demo: a sized line so colour × size variants can be seen
  (function(){ try{ if(localStorage.getItem('ms-bk-variant-demo')) return; const B=O.getBasket(); if(!B.some(l=>l.sized)){ B.push({ id:'b3v', kind:'product', name:'Heavy Weight T-Shirt', img:'clothing', project:'Autumn Giveaways', proof:'approved', each:8.45, discountPct:15, deliveryCost:24, region:'UK', additional:0, charges:[{label:'Setup charge',amt:150}], deliveryDate:'Wed 22nd Oct', orderBy:'Order by Thu 9th Oct, 12:00', address:null, sized:true,
      rows:[{c:'Small',qty:0},{c:'Medium',qty:0},{c:'Large',qty:0},{c:'X-Large',qty:0},{c:'XX-Large',qty:0}],
      colours:[{c:'Black',hex:'#1a1a1e'},{c:'Navy',hex:'#1f2a4a'},{c:'White',hex:'#f4f4f0'},{c:'Grey',hex:'#8a8a93'}],
      grid:{Black:{Small:20,Medium:40,Large:40,'X-Large':20,'XX-Large':10},Navy:{Small:10,Medium:25,Large:25,'X-Large':15,'XX-Large':5}} });
      const l=B[B.length-1]; l.rows.forEach((r,i)=>{ r.qty=Object.values(l.grid).reduce((a,g)=>a+(+g[r.c]||0),0); }); O.setRowQty(l.id,0,l.rows[0].qty); }
    localStorage.setItem('ms-bk-variant-demo','1'); }catch(e){} })();
  // sized lines: quantities per colour × size (l.grid); l.rows keep the per-size totals the rest of the platform uses
  function gridOf(l){ if(!l.grid){ const first=(l.colours&&l.colours[0]||{}).c||'Default'; l.grid={[first]:Object.fromEntries(l.rows.map(r=>[r.c,+r.qty||0]))}; } return l.grid; }
  function setGrid(l,colour,size,qty){ const g=gridOf(l); g[colour]=g[colour]||{}; g[colour][size]=Math.max(0,qty|0); l.rows.forEach((r,i)=>{ const t=Object.values(g).reduce((a,x)=>a+(+x[r.c]||0),0); r.qty=t; }); O.setRowQty(l.id,0,l.rows[0].qty); }
  // approved visuals known to the design (the project page also stores line.visual when a line is added)
  const VIS={'Eco Wheat-Straw Charging Cable':'assets/products/eco-visual-1.png'};
  const MON={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  function parseDay(s){ const m=String(s||'').match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Z][a-z]{2})/); if(!m) return null;
    const now=new Date(), d=new Date(now.getFullYear(),MON[m[2]],+m[1],17,0);
    const t=String(s).match(/(\d{1,2}):(\d{2})/); if(t) d.setHours(+t[1],+t[2]);
    if(d-now<-200*864e5) d.setFullYear(d.getFullYear()+1); return d; }
  const fmtDay=d=>d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  function orderBy(l){ if(l.orderBy){ const d=parseDay(l.orderBy); return d?{d,est:false}:null; }
    const dd=parseDay(l.deliveryDate); if(!dd) return null; const d=new Date(dd); let n=10; while(n>0){ d.setDate(d.getDate()-1); if(d.getDay()%6) n--; } d.setHours(17,0); return {d,est:true}; }
  function obState(l){ const o=orderBy(l); if(!o) return null; const days=(o.d-new Date())/864e5;
    return Object.assign(o,{lvl:days<0?'late':days<=3?'soon':'ok',days}); }
  const lineNet=l=>O.lineItemCost(l)+(l.kind==='product'?(l.deliveryCost||0):0)+(l.additional||0);
  const addrKey=a=>a?(a.name+'|'+a.lines.join('|')):'';
  function addrLabel(a){ const b=O.addressBook().find(x=>addrKey(x)===addrKey(a)); const pc=(a.lines[a.lines.length-1]||'').replace(/,$/,''), town=(a.lines[a.lines.length-2]||'').replace(/,$/,'');
    return {label:b?b.label:(a.name||town), sub:[a.name&&b?a.name:'',town,pc].filter(Boolean).join(' · ')}; }
  function notesCount(id){ try{ return (JSON.parse(localStorage.getItem('ms-basket-addr-notes')||'{}')[id]||[]).length; }catch(e){ return 0; } }

  const IMGFIX={tshirt:'clothing',tee:'clothing',shirt:'clothing',hoodie:'clothing'};
  const imgOf=l=>'assets/products/'+(IMGFIX[l.img]||l.img||'clothing')+'.png';
  function thumb(l){ const vis=l.proof!=='unbranded'&&(l.visual||VIS[l.name]);
    return `<span class="bk-thumb" data-zoom="${l.id}" title="Enlarge"><img src="${esc(vis||imgOf(l))}" alt="" onerror="this.onerror=null;this.src='assets/products/clothing.png'">
      ${vis?'<span class="bk-tag ok" title="Approved visual"><svg class="icn"><use href="#o-check"/></svg></span>':l.proof==='unbranded'?'<span class="bk-tag un" title="Unbranded — no print"><svg class="icn"><use href="#o-noproof"/></svg></span>':''}</span>`; }
  function prodCell(l){ return `<div class="bk-c bk-prod">${thumb(l)}<div class="bk-pmeta"><a class="bk-pn pmlink" data-name="${esc(l.name)}" href="#">${esc(l.name)}</a>
      <span class="bk-psub">${l.proof==='unbranded'?'Unbranded':(l.visual||VIS[l.name])?'Branded · visual approved':'Branded'}</span></div></div>`; }
  // older sample lines saved before colours pulled through: take the colours chosen in the project pop-out
  function fixStd(l){ if(!l||!Array.isArray(l.rows)||l.rows.length!==1||!/^standard$/i.test(l.rows[0].c||'')) return; let S={}; try{ S=JSON.parse(localStorage.getItem('ms-pm-spec')||'{}'); }catch(e){}
    const sp=S[l.name]||{}, cols=(sp.productColours||sp.colours||[]).map(c=>typeof c==='string'?{c}:{c:c.name||c.c,hex:c.hex||''}).filter(c=>c.c);
    if(!cols.length) return; const q=l.rows[0].qty||0, v=sp.variant?' · '+sp.variant:''; l.rows=cols.map((c,i)=>({c:c.c+v,hex:c.hex||'',qty:l.kind==='sample'?q:(i===0?q:0)})); try{ const B=O.getBasket&&O.getBasket(); const x=B&&B.find(y=>y.id===l.id); if(x){ x.rows=l.rows; localStorage.setItem('ms-basket4',JSON.stringify(B)); } }catch(e){} }
  // sample lines: offer every colour in the project (and its sizes) from the pop-out spec
  function specOf(n){ try{ return (JSON.parse(localStorage.getItem('ms-pm-spec')||'{}'))[n]||{}; }catch(e){ return {}; } }
  function saveLine(l){ try{ const B=O.getBasket(), x=B.find(y=>y.id===l.id); if(x){ Object.assign(x,l); localStorage.setItem('ms-basket4',JSON.stringify(B)); } }catch(e){} }
  const HEXN={black:'#1a1a1e',white:'#f4f4f0',navy:'#1f2a4a',natural:'#e9dfc8',stone:'#cfc6b4','sea blue':'#2d6f8f',grey:'#8a8a93',gray:'#8a8a93',red:'#c0392b',green:'#2f7d4f',blue:'#2f5fb3',kraft:'#c9a87a',cork:'#b98a5a',pink:'#e58fb0',yellow:'#f2c94c',orange:'#e67e22',silver:'#c0c0c8',beige:'#d9ccb0',brown:'#7a5230'};
  const hexName=n=>HEXN[String(n).toLowerCase()]||HEXN[String(n).toLowerCase().split(' ').pop()]||'';
  // colours + sizes for a product: the project's (from the pop-out) or the store product's
  function colOpts(name){ const sp=specOf(name); if(sp.projColours&&sp.projColours.length) return sp.projColours;
    const S=window.STORE&&(STORE.products||STORE.items||[]), sp2=(Array.isArray(S)?S:[]).find(x=>x.name===name)||(Array.isArray(S)?S:[]).find(x=>name.toLowerCase().includes(String(x.name).toLowerCase().split(' (')[0]));
    if(!sp2) return []; const sz=(sp2.sizes||[]).length>1?sp2.sizes.slice():[]; return (sp2.colours||[]).map(c=>({name:c,hex:hexName(c),sizes:sz})); }
  function sampleOpts(l){ if(l.kind!=='sample') return; const pcs=colOpts(l.name).filter(c=>c&&c.name); if(!pcs.length) return;
    const sized=pcs.some(c=>c.sizes&&c.sizes.length>1); let ch=false;
    if(sized&&!l.sized){ const sizes=[...new Set(pcs.flatMap(c=>c.sizes||[]))]; const g={};
      (l.rows||[]).filter(r=>r.qty>0).forEach(r=>{ const [cn,sz]=String(r.c).split(' · '); const col=pcs.find(c=>c.name===cn)?cn:pcs[0].name; const s=sizes.includes(sz)?sz:(sizes[1]||sizes[0]); g[col]=g[col]||{}; g[col][s]=(g[col][s]||0)+(+r.qty||0); });
      l.sized=true; l.colours=pcs.map(c=>({c:c.name,hex:c.hex||''})); l.rows=sizes.map(s=>({c:s,qty:Object.values(g).reduce((a,x)=>a+(+x[s]||0),0)})); l.grid=g; ch=true; }
    else if(sized){ pcs.forEach(c=>{ if(!l.colours.some(x=>x.c===c.name)){ l.colours.push({c:c.name,hex:c.hex||''}); ch=true; } }); }
    else { pcs.forEach(c=>{ if(!l.rows.some(r=>String(r.c).split(' · ')[0]===c.name)){ l.rows.push({c:c.name,hex:c.hex||'',qty:0}); ch=true; } }); }
    if(ch) saveLine(l); }
  function qtyCell(l){ fixStd(l); sampleOpts(l); const tot=O.lineQty(l);
    if(l.sized&&l.colours){ const g=gridOf(l), used=l.colours.filter(c=>g[c.c]&&Object.values(g[c.c]).some(v=>v>0)), spare=l.colours.filter(c=>!used.includes(c));
      const block=c=>{ const row=g[c.c]||{}, ct=l.rows.reduce((a,r)=>a+(+row[r.c]||0),0);
        return `<div class="bk-var"><div class="bk-varhd">${sw(c.c,c.hex)}<b>${esc(c.c)}</b><span>${ct.toLocaleString('en-GB')}</span></div><div class="bk-vsz">${l.rows.map(r=>`<label><span>${esc(r.c.replace('X-Small','XS').replace('XX-Large','XXL').replace('X-Large','XL').replace('Small','S').replace('Medium','M').replace('Large','L'))}</span><input class="gin" data-line="${l.id}" data-gc="${esc(c.c)}" data-gs="${esc(r.c)}" value="${+row[r.c]||0}" inputmode="numeric" aria-label="${esc(c.c)} ${esc(r.c)} quantity" title="${esc(r.c)}"></label>`).join('')}</div></div>`; };
      return `<div class="bk-c bk-qty">${(used.length?used:[l.colours[0]]).map(block).join('')}
        ${spare.length?`<details class="bk-more"><summary>+ Add a colour (${spare.length} more)</summary>${spare.filter(c=>!(!used.length&&c===l.colours[0])).map(block).join('')}</details>`:''}
        <span class="bk-qtot">${tot.toLocaleString('en-GB')} units · ${used.length||1} colour${(used.length||1)>1?'s':''}</span></div>`; }
    const on=l.rows.map((r,i)=>[r,i]).filter(([r])=>r.qty>0), off=l.rows.map((r,i)=>[r,i]).filter(([r])=>!(r.qty>0));
    const chip=([r,i])=>`<label class="bk-q">${sw(r.c,r.hex)}<span>${esc(r.c)}</span><input class="qin" data-line="${l.id}" data-ri="${i}" value="${r.qty||0}" inputmode="numeric" aria-label="${esc(r.c)} quantity"></label>`;
    return `<div class="bk-c bk-qty"><div class="bk-qlist">${on.map(chip).join('')||'<span class="bk-muted">No colours chosen</span>'}</div>
      ${off.length?`<details class="bk-more"><summary>+ ${off.length} more colour${off.length>1?'s':''}</summary><div class="bk-qlist">${off.map(chip).join('')}</div></details>`:''}
      ${on.length>1?`<span class="bk-qtot">${tot.toLocaleString('en-GB')} units</span>`:''}</div>`; }
  function priceCell(l){ const unit=l.each*(1-(l.discountPct||0)/100);
    return `<div class="bk-c bk-price"><b>${gbp(unit)}</b>${l.discountPct?`<span class="bk-was">${gbp(l.each)}</span><span class="bk-save">Save ${l.discountPct}%</span>`:''}<span class="bk-muted">${gbp(O.lineItemCost(l))} total</span></div>`; }
  function costsCell(l){ const items=(l.kind==='product'?[[l.drops&&l.drops.length>1?'Delivery · '+l.drops.length+' addresses':'Delivery',l.deliveryCost||0,l.region]]:[]).concat((l.charges||[]).map(c=>[c.label,c.amt]));
    return `<div class="bk-c bk-costs">${items.length?items.map(([k,v,r])=>`<div class="bk-cl"><span>${esc(k)}${r?` <small>${esc(r)}</small>`:''}</span><b>${gbp(v)}</b></div>`).join(''):'<span class="bk-muted">None</span>'}</div>`; }
  function deliveryCell(l){ if(l.kind==='sample') return `<div class="bk-c bk-del"><b>${esc(l.lead||'—')}</b><span class="bk-muted">Est. lead time</span></div>`;
    const s=obState(l), asap=/asap/i.test(l.deliveryDate||'');
    return `<div class="bk-c bk-del"><b>${esc(asap?'ASAP':(parseDay(l.deliveryDate)?fmtDay(parseDay(l.deliveryDate)):l.deliveryDate||'—'))}</b>
      ${s?`<span class="bk-ob ${s.lvl}"><svg class="icn"><use href="#o-clock"/></svg>${s.est?'Order by ~':'Order by '}${fmtDay(s.d)}</span>`:''}
      ${s&&s.lvl==='late'?'<span class="bk-warn late">Order-by date passed. Delivery date at risk.</span>':s&&s.lvl==='soon'?`<span class="bk-warn soon">${Math.max(0,Math.ceil(s.days))===0?'Order today':'Order within '+Math.ceil(s.days)+' day'+(Math.ceil(s.days)>1?'s':'')} to keep this date.</span>`:''}</div>`; }
  function addrCell(l){ const SPL=window.MSSPLIT&&l.kind==='product';
    if(SPL&&l.drops&&l.drops.length>1){ const vars=(l.rows||[]).filter(r=>+r.qty).map(r=>({key:r.c,qty:+r.qty})), bad=MSSPLIT.check(l.drops,vars,MSSPLIT.supplierOf(l.name)).length, n=notesCount(l.id);
      return `<div class="bk-c bk-addr"><button class="bk-chip split${bad?' warn':''}" data-split="${l.id}" title="${esc(l.drops.map((d,k)=>(k+1)+'. '+(d.address?d.address.name:'No address')+' · '+MSSPLIT.dropQty(d)).join('\n'))}"><svg class="icn"><use href="#o-addr"/></svg><span><b>${l.drops.length} addresses</b><i>${bad?'Needs checking':'Split delivery'}</i></span></button><button class="bk-note${n?' has':''}" data-note="${l.id}" data-tip="${n?n+' delivery note'+(n>1?'s':''):'Add delivery note'}" aria-label="Delivery notes"><svg class="icn"><use href="#o-note"/></svg>${n?`<b>${n}</b>`:''}</button></div>`; }
    const splitBtn=SPL?`<button class="bk-note bk-splitb" data-split="${l.id}" data-tip="Split delivery" aria-label="Split delivery across addresses"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h6l4-6h6M14 18l-4-6M16 3l4 3-4 3M16 15l4 3-4 3"/></svg></button>`:'';
    if(!l.address) return `<div class="bk-c bk-addr"><button class="bk-chip add" data-pickaddr="${l.id}"><svg class="icn"><use href="#o-addr"/></svg>Choose address</button>${splitBtn}</div>`;
    const a=addrLabel(l.address), n=notesCount(l.id);
    return `<div class="bk-c bk-addr"><button class="bk-chip" data-pickaddr="${l.id}" title="${esc(l.address.name+', '+l.address.lines.join(' ').replace(/,\s*/g,', '))}"><svg class="icn"><use href="#o-addr"/></svg><span><b>${esc(a.label)}</b><i>${esc(a.sub)}</i></span></button>
      <button class="bk-note${n?' has':''}" data-note="${l.id}" data-tip="${n?n+' delivery note'+(n>1?'s':''):'Add delivery note'}" aria-label="Delivery notes"><svg class="icn"><use href="#o-note"/></svg>${n?`<b>${n}</b>`:''}</button>${splitBtn}</div>`; }
  function acts(l){ return `<div class="bk-c bk-acts"><button data-dup="${l.id}" data-tip="Duplicate line" aria-label="Duplicate line"><svg class="icn"><use href="#o-copy"/></svg></button><button class="rm" data-rm="${l.id}" data-tip="Remove" aria-label="Remove line"><svg class="icn"><use href="#o-trash"/></svg></button></div>`; }
  const row=l=>`<div class="bk-row${l.kind==='sample'?' smp':''}">${prodCell(l)}${qtyCell(l)}${priceCell(l)}${costsCell(l)}${deliveryCell(l)}${addrCell(l)}${acts(l)}</div>`;
  function groups(lines){ const g=[]; lines.forEach(l=>{ const k=l.project||'Other'; let x=g.find(y=>y.k===k); if(!x) g.push(x={k,lines:[]}); x.lines.push(l); }); return g; }
  const projHref=k=>/autumn/i.test(k)?'Merchsmith Project - Autumn Giveaways.html':'Merchsmith Projects.html';
  function table(title,icon,lines,kind){ const G=groups(lines), H=kind==='sample'?['Product','Colours & qty','Price','Add. costs','Lead time','Delivery address','']:['Product','Colours & qty','Unit price','Add. costs','Delivery','Delivery address',''];
    return `<section class="bk-card"><div class="bk-title"><span class="bk-ic ${kind}"><svg class="icn"><use href="#${icon}"/></svg></span><h2>${title}</h2><span class="bk-n">${lines.length}</span><span class="bk-sp"></span>
        ${kind==='product'?`<button class="bk-allbtn" data-pickaddr="__all"><svg class="icn"><use href="#o-addr"/></svg>Deliver everything to one address</button>`:''}</div>
      <div class="bk-scroll"><div class="bk-head">${H.map(h=>`<div>${h}</div>`).join('')}</div>
      ${G.map(g=>`<div class="bk-group"><div class="bk-ghd"><a href="${projHref(g.k)}">${esc(g.k)}</a><span>${g.lines.length} line${g.lines.length>1?'s':''}</span><span class="bk-sp"></span><span class="bk-gsub">Subtotal <b>${gbp(g.lines.reduce((a,l)=>a+lineNet(l),0))}</b> <small>ex VAT</small></span></div>${g.lines.map(row).join('')}</div>`).join('')}</div></section>`; }

  function sumGroup(lbl,net,vat,tot,big){ const r=O.vatRate?O.vatRate():.2;
    return `<div class="bk-sg${big?' big':''}"><div class="bk-sgh">${lbl}</div><div class="bk-sr"><span>Net</span><span>${gbp(net)}</span></div><div class="bk-sr"><span>${r===0?'VAT (not applicable)':'VAT ('+Math.round(r*100)+'%)'}</span><span>${gbp(vat)}</span></div><div class="bk-sr tot"><span>Total</span><span>${gbp(tot)}</span></div></div>`; }
  function account(t){ const a=O.account?O.account():{}; const up=window.MSCUSTACCT&&MSCUSTACCT.upfront?MSCUSTACCT.upfront(a.terms):false;
    const lim=+a.creditLimit||0, used=+a.creditUsed||0, avail=Math.max(0,lim-used), over=lim&&t.dTot>avail, pct=lim?Math.min(100,(used+t.dTot)/lim*100):0, usedPct=lim?Math.min(100,used/lim*100):0;
    return `<div class="bk-acct"><div class="bk-sgh">Your account</div>
      <div class="bk-sr"><span>Payment terms</span><span>${esc(a.terms||'—')}</span></div>
      ${lim&&!up?`<div class="bk-sr"><span>Credit available</span><span>${gbp(avail)} <small>of ${gbp(lim)}</small></span></div>
        <div class="bk-cbar${over?' over':''}" title="Used ${gbp(used)} · this order ${gbp(t.dTot)}"><i style="width:${usedPct}%"></i><em style="left:${usedPct}%;width:${Math.max(0,pct-usedPct)}%"></em></div>
        <p class="bk-anote${over?' over':''}">${over?'This order is over your available credit. You can pay by card, or ask your account manager for approval.':'This order will be placed on account.'}</p>`
      :`<p class="bk-anote">${up?'Payment is taken when you place the order.':'No credit account set up. You’ll pay by card when you place the order.'}</p>`}</div>`; }
  function summary(label,id){ const t=O.totals();
    return `<aside class="summary bk-sum"><div class="bk-sumh">Summary</div>${sumGroup('Orders',t.oNet,t.oVat,t.oTot)}${sumGroup('Samples',t.sNet,t.sVat,t.sTot)}${t.promo&&!t.promo.err?`<div class="bk-sr promo"><span>Code ${esc(t.promo.code)}</span><span>−${gbp(t.promoOff)}</span></div>`:''}${sumGroup('Total due',t.dNet,t.dVat,t.dTot,true)}
      ${account(t)}
      <div class="bk-code"><label for="bkCode">Discount code</label>${t.promo&&!t.promo.err?`<div class="bk-promo"><b>${esc(t.promo.code)}</b><span>${esc(t.promo.desc||'')}${t.promo.partial?' · some items already discounted':''}</span><button type="button" data-bkprx>Remove</button></div>`:`<div><input id="bkCode" placeholder="Enter code" value="${esc(t.promo?t.promo.code:'')}"><button class="bk-apply" type="button">Apply</button></div>${t.promo&&t.promo.err?`<p class="bk-promoerr">${esc(t.promo.err)}</p>`:''}`}</div>
      <button class="contbtn bk-cta" id="${id}">${label}<svg class="icn"><use href="#o-arr"/></svg></button></aside>`; }

  window.__bkRender=function(root,stepsBar,wire,next){ const prods=O.getProducts(), samps=O.getSamples(), t=O.totals();
    if(!t.count){ root.innerHTML=`<div class="wrap"><div class="bk-top"><h1 class="bt">Your Basket</h1></div><div class="bk-empty"><span class="bk-eic"><svg class="icn"><use href="#o-bag"/></svg></span><h2>Your basket is empty</h2><p>Add products from a project once their visuals and prices are approved, or browse the store for something new.</p><div class="bk-eacts"><a class="bk-cta2" href="Merchsmith Projects.html">Go to your projects</a><a class="bk-ghost" href="Merchsmith Store.html">Browse the store</a></div></div></div>`; return; }
    root.innerHTML=`<div class="wrap"><div class="bk-top"><h1 class="bt">Your Basket</h1><span class="bk-count">${t.count} item${t.count>1?'s':''}</span><span class="bk-sp"></span>${stepsBar(0)}</div>
      <div class="bk-layout"><div class="bk-main">${prods.length?table('Orders','o-bag',prods,'product'):''}${samps.length?table('Sample orders','o-dl',samps,'sample'):''}</div>${summary('Continue','toFinance')}</div></div>`;
    wire();
    root.querySelectorAll('[data-split]').forEach(b=>b.onclick=()=>{ const l=O.getBasket().find(x=>x.id===b.dataset.split); if(!l||!window.MSSPLIT) return;
      MSSPLIT.openAllocator({title:'Split delivery · '+l.name,variants:(l.rows||[]).map(r=>({key:r.c,hex:r.hex||null,qty:+r.qty||0})),drops:l.drops,address:l.address,date:l.deliveryDate&&!/asap/i.test(l.deliveryDate)?l.deliveryDate:'',
        book:O.addressBook(),supplier:MSSPLIT.supplierOf(l.name),base:l.baseDelivery!=null?l.baseDelivery:l.deliveryCost,onAddAddress:a=>O.addAddress&&O.addAddress(a),
        onSave:(D,ch)=>{ O.setLineDrops(l.id,D,ch); if(window.__bkRerender) window.__bkRerender(); } }); });
    const badSplit=window.MSSPLIT?O.getBasket().filter(l=>l.drops&&l.drops.length>1&&MSSPLIT.check(l.drops,(l.rows||[]).filter(r=>+r.qty).map(r=>({key:r.c,qty:+r.qty})),MSSPLIT.supplierOf(l.name)).length):[];
    const noAddr=O.getBasket().filter(l=>!l.address), tf=document.getElementById('toFinance');
    if(badSplit.length&&!noAddr.length){ tf.disabled=true; tf.insertAdjacentHTML('afterend',`<p class="bk-block">Check the split delivery for ${badSplit.map(l=>'<b>'+esc(l.name)+'</b>').join(', ')}: quantities or supplier limits no longer match.</p>`); }
    if(noAddr.length){ tf.disabled=true; tf.insertAdjacentHTML('afterend',`<p class="bk-block">Choose a delivery address for ${noAddr.length===1?'<b>'+esc(noAddr[0].name)+'</b>':noAddr.length+' lines'} before you continue.</p>`);
      noAddr.forEach(l=>{ const r=root.querySelector('[data-pickaddr="'+l.id+'"]'); const cell=r&&r.closest('.bk-c'); if(cell) cell.classList.add('bk-needaddr'); }); }
    tf.onclick=()=>{ if(O.getBasket().some(l=>!l.address)) return; next(); };
    root.querySelectorAll('.gin').forEach(inp=>inp.onchange=()=>{ const l=O.getBasket().find(x=>x.id===inp.dataset.line); if(!l) return; setGrid(l,inp.dataset.gc,inp.dataset.gs,+inp.value); window.__bkRender(root,stepsBar,wire,next); });
    root.querySelectorAll('.bk-thumb').forEach(t=>t.addEventListener('click',e=>{ e.stopImmediatePropagation(); const l=O.getBasket().find(x=>x.id===t.dataset.zoom); if(l) bigZoom(l); },true));
    root.querySelectorAll('.bk-more').forEach(d=>d.addEventListener('toggle',()=>{ if(d.open) d.querySelector('input')&&d.querySelector('input').focus(); }));
  };
  window.__bkSummary=summary;
  // discount code box (works wherever the basket summary is shown)
  document.addEventListener('click',e=>{ const a=e.target.closest('.bk-apply'), x=e.target.closest('[data-bkprx]'); if(!a&&!x) return; if(!window.MSPROMO) return;
    if(x) MSPROMO.remove(); else { const i=document.getElementById('bkCode'), v=(i&&i.value||'').trim(); if(!v) return; MSPROMO.apply(v.toUpperCase()); }
    if(window.__bkRerender) window.__bkRerender(); else location.reload(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target&&e.target.id==='bkCode'){ e.preventDefault(); const a=document.querySelector('.bk-apply'); if(a) a.click(); } });
  // large preview, like the project page
  function bigZoom(l){ let lb=document.getElementById('bkZoom'); if(!lb){ lb=document.createElement('div'); lb.id='bkZoom'; lb.className='bk-zoom'; document.body.appendChild(lb);
      lb.addEventListener('click',e=>{ if(e.target===lb||e.target.closest('[data-bzx]')) lb.classList.remove('on'); }); document.addEventListener('keydown',e=>{ if(e.key==='Escape') lb.classList.remove('on'); }); }
    const vis=l.proof!=='unbranded'&&(l.visual||VIS[l.name]);
    lb.innerHTML=`<div class="bk-zcard" role="dialog" aria-label="${esc(l.name)}"><div class="bk-zimg"><img src="${esc(vis||'assets/products/'+l.img+'.png')}" alt="${esc(l.name)}"></div>
      <div class="bk-zcap"><div><b>${esc(l.name)}</b><span>${esc(l.project||'')} · ${vis?'Approved visual':l.proof==='unbranded'?'Unbranded':'Stock photo'}</span></div><button class="bk-zx" data-bzx aria-label="Close"><svg class="icn"><use href="#o-x"/></svg></button></div></div>`;
    lb.classList.add('on'); }
})();
