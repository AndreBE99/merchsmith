/* two-supplier.js — two-supplier lines (blank product supplier → branding supplier / decorator). Sep 2026.
   Registry: which lines are two-supplier, set per product in the store (default) and overridable per project.
     get(name,proj) → {blank, brand, overs, transit, brandLead} | null   · ms-two-prod {name:{…}|{off:true}}, ms-two-proj {proj:{name:{…}|{off:true}}}
   Blank lane on the order page (ms-two-lane {orderId:{lineIdx:{st,…}}}):
     todo → sent (blank PO sent, overs %) → ack (blank supplier's acknowledgement + dispatch date) → shipped (tracking to the decorator)
     → booked (decorator counts the stock in; short / damaged can hold production).  ready(orderId,i) gates the decorator's production.
   The customer never sees the blank lane. The blank supplier never sees the customer's name: it delivers to the decorator's goods-in.
   window.MSTWO: get, setProd, setProj, editor, laneHTML, wire, ready, lane, blankPage, printPO */
window.MSTWO=window.MSTWO||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const J=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||d; }catch(e){ return d; } }, W=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  const SEED={'Recycled Cotton Tote':{blank:'BagWorks UK',brand:'Veloce Print'}};
  const DEF={overs:3,transit:2,brandLead:5,blankLead:6};
  const GOODSIN={'Veloce Print':['Goods In · Veloce Print','Unit 7, Lancaster Road','Preston','PR1 4TB'],'PrintHouse Studio':['Goods In · PrintHouse Studio','Unit 12, Riverside Works','Sheffield','S3 8EN'],'Lumen Goods':['Goods In · Lumen Goods','2 Canal Street','Manchester','M1 3HE']};
  const COUR=['DPD','DHL','UPS','Royal Mail','Royal Mail (untracked)','Pallet (Palletways)','Hand delivered','Supplier’s own transport'];
  const UNTR=c=>/untracked|hand delivered|own transport/i.test(String(c||''));
  const CURL={DPD:'https://track.dpd.co.uk/parcels/',DHL:'https://www.dhl.com/gb-en/home/tracking.html?tracking-id=',UPS:'https://www.ups.com/track?tracknum=','Royal Mail':'https://www.royalmail.com/track-your-item#/tracking-results/'};
  const PROJ='autumn';

  /* ---------- registry ---------- */
  function decorEditor(n,onDone){ const cf=decorCfg(n), gi=goodsIn(n);
    const w=modal('Decorating · '+n,`<label class="tw-chk"><input type="checkbox" data-dx${cf.accepts!==false?' checked':''}> Accepts blank stock from other suppliers to decorate</label>
      <label class="tw-f"><span>Goods-in address (one line each)</span><textarea rows="4" data-dgi>${esc(gi.join('\n'))}</textarea><small>Blank suppliers deliver here. The end customer’s name is never shown to them.</small></label>
      <div class="tw-g2"><label class="tw-f"><span>Standard overs %</span><input type="number" min="0" max="25" step="0.5" data-dov value="${cf.overs??DEF.overs}"></label><label class="tw-f"><span>Decorating lead time (working days)</span><input type="number" min="1" max="30" data-dld value="${cf.brandLead??DEF.brandLead}"></label></div>
      <label class="tw-f"><span>Goods-in notes</span><input data-dnt value="${esc(cf.note||'')}" placeholder="e.g. Deliveries Mon–Fri 8:00–15:00, pallets by appointment"></label>`,
      w=>{ const A=J('ms-sup-decor',{}); A[n]={accepts:w.querySelector('[data-dx]').checked,goodsIn:w.querySelector('[data-dgi]').value.split('\n').map(x=>x.trim()).filter(Boolean),overs:+w.querySelector('[data-dov]').value||0,brandLead:+w.querySelector('[data-dld]').value||DEF.brandLead,note:w.querySelector('[data-dnt]').value.trim()}; W('ms-sup-decor',A); toast('Saved'); if(onDone) onDone(); },'Save'); }
  function get(name,proj){ const p=proj==='__store__'?null:(J('ms-two-proj',{})[proj||PROJ]||{})[name], d=J('ms-two-prod',{})[name], v=p||d||SEED[name];
    if(!v||v.off||!v.blank||!v.brand) return null; const cf=decorCfg(v.brand); return Object.assign({},DEF,cf.overs!=null?{overs:cf.overs}:{},cf.brandLead!=null?{brandLead:cf.brandLead}:{},v); }
  function setProd(name,v){ const A=J('ms-two-prod',{}); A[name]=v; W('ms-two-prod',A); }
  function setProj(proj,name,v){ const A=J('ms-two-proj',{}); (A[proj||PROJ]=A[proj||PROJ]||{})[name]=v; W('ms-two-proj',A); }
  function clearProj(proj,name){ const A=J('ms-two-proj',{}); if(A[proj||PROJ]) delete A[proj||PROJ][name]; W('ms-two-proj',A); }
  const suppliers=()=>{ const D=window.ORG_DATA||{}; const n=(D.suppliers||[]).map(s=>s.name); ['BagWorks UK','Veloce Print','Lumen Goods','PrintHouse Studio'].forEach(x=>{ if(!n.includes(x)) n.push(x); }); return n; };
  const decorators=()=>{ const D=window.ORG_DATA||{}; const k=Object.fromEntries((D.suppliers||[]).map(s=>[s.name,s.kind])); return suppliers().filter(n=>k[n]!=='product'&&decorCfg(n).accepts!==false); };
  const decorCfg=n=>(J('ms-sup-decor',{})[n])||{};
  const goodsIn=n=>{ const cf=decorCfg(n); if(cf.goodsIn&&cf.goodsIn.length) return cf.goodsIn; const D=window.ORG_DATA||{}, s=(D.suppliers||[]).find(x=>x.name===n); if(s&&s.goodsIn) return s.goodsIn; if(GOODSIN[n]) return GOODSIN[n]; if(s&&s.address) return ['Goods In · '+n].concat(String(s.address).split(',').map(x=>x.trim()).filter(Boolean)); return ['Goods In · '+n,'Address to be confirmed']; };

  /* ---------- lane store ---------- */
  const laneAll=()=>J('ms-two-lane',{});
  function lane(oid,i){ const A=laneAll(); return (A[oid]&&A[oid][i])||{st:'todo'}; }
  function putLane(oid,i,v){ const A=laneAll(); (A[oid]=A[oid]||{})[i]=v; W('ms-two-lane',A); }
  const ready=(oid,i)=>{ const L=lane(oid,i); return L.st==='booked'&&(!L.book||!L.book.hold); };
  const now=()=>new Date().toISOString();
  const fD=d=>{ if(!d) return '—'; const x=d instanceof Date?d:new Date(d); return isNaN(x)?String(d):x.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); };
  const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  function parseDay(s){ if(!s) return null; if(/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s); const m=String(s).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})/); if(!m) return null; const t=new Date(); let d=new Date(t.getFullYear(),MON[m[2].toLowerCase()],+m[1]); if(d<new Date(t.getTime()-120*864e5)) d.setFullYear(d.getFullYear()+1); return d; }
  const addWD=(d,n)=>{ const x=new Date(d); let k=0; while(k<Math.abs(n)){ x.setDate(x.getDate()+(n<0?-1:1)); if(x.getDay()%6) k++; } return x; };
  const me=()=>(window.MSChat&&MSChat.me&&MSChat.me().name)||'Jess Doyle';
  function activity(oid,t,role){ const A=J('ms-order-ops',{}); if(!A[oid]) return; (A[oid].activity=A[oid].activity||[]).unshift({at:now(),who:role==='supplier'?t.who||'Supplier':me(),t:t.t||t,role:role||'dist'}); W('ms-order-ops',A); }
  const notify=(r,title,body)=>{ try{ if(window.MSNOTIF&&MSNOTIF.push) MSNOTIF.push(r,{ev:'order_placed',title,body,href:location.pathname.split('/').pop()+location.hash}); }catch(e){} };
  const redo=()=>{ if(window.__odRedo) window.__odRedo(); };
  const toast=m=>{ let t=document.getElementById('twToast'); if(!t){ t=document.createElement('div'); t.id='twToast'; t.className='tw-toast'; document.body.appendChild(t); } t.textContent=m; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2600); };

  // quantities to send = ordered + overs (rounded up per variant)
  const withOvers=(vs,ov)=>vs.map(v=>Object.assign({},v,{send:Math.ceil(v.qty*(1+(+ov||0)/100))}));
  const needBy=c=>{ const d=parseDay(c.supDate); return d?addWD(d,-(c.two.brandLead||5)):null; };
  const blankPO=c=>(c.decoPO||c.ref.replace('MS-','PO-'))+'-B';
  function risk(c,L){ const nb=needBy(c); if(!nb||L.st==='booked') return null;
    if(L.st==='shipped'){ const eta=addWD(new Date(L.trk.at),c.two.transit); return eta>nb?`Stock is due at ${esc(c.two.brand)} ${fD(eta)}, after it’s needed (${fD(nb)}).`:null; }
    if(L.oa&&L.oa.dispatch){ const eta=addWD(parseDay(L.oa.dispatch)||new Date(),c.two.transit); return eta>nb?`${esc(c.two.blank)} dispatches ${fD(parseDay(L.oa.dispatch))}, so stock reaches ${esc(c.two.brand)} ${fD(eta)} — after it’s needed (${fD(nb)}).`:null; }
    const latest=addWD(nb,-(c.two.transit+2)); if(new Date()>latest) return L.st==='todo'?`The blank stock PO hasn’t been sent, and stock is needed at ${esc(c.two.brand)} by ${fD(nb)}.`:`${esc(c.two.blank)} hasn’t confirmed a dispatch date and stock is needed at ${esc(c.two.brand)} by ${fD(nb)}.`;
    return null; }

  function blankCost(oid,i,c){ const L=lane(oid,i); return Math.round((withOvers(c.vs,L.overs??c.two.overs).reduce((a,r)=>a+r.send,0)*c.blankUnit+(c.carriage||0))*100)/100; }
  // supplier's Orders list: blank stock they're sending (blank supplier) or receiving (decorator). No customer names.
  const ST_LBL={todo:'Not sent',sent:'To acknowledge',ack:'To ship',shipped:'On its way',booked:'Booked in'};
  function stockListHTML(meS,orders){ const rows=[]; const spec=J('ms-pm-spec',{}), OPS=J('ms-order-ops',{});
    (orders||[]).forEach(o=>(o.lines||[]).forEach((l,i)=>{ if(l.kind==='sample') return; const t=get(l.name); if(!t) return; const L=lane(o.id,i); const role=t.blank===meS?'out':t.brand===meS?'in':null; if(!role||L.st==='todo') return;
      const sp=(spec[l.name]||{}).supply||{}, d=parseDay(String(sp.supDisplay||'').replace(/\b(\d{1,2})(st|nd|rd|th)\b/,'$1')), nb=d?addWD(d,-(t.brandLead||5)):null, dp=((OPS[o.id]||{}).pos||{})[t.brand], po=(dp&&dp.no?dp.no:o.ref.replace('MS-','PO-'))+'-B';
      rows.push({o,i,l,t,L,role,nb,po,qty:Math.ceil((l.qty||0)*(1+(L.overs??t.overs)/100))}); }));
    if(!rows.length) return '';
    const out=rows.filter(r=>r.role==='out'), inn=rows.filter(r=>r.role==='in');
    const tbl=(R,h,who)=>R.length?`<div class="panel tw-list" style="margin-top:22px"><div class="panel-h">${h} <span class="tw-lc">${R.length}</span></div><table class="otbl"><thead><tr><th>PO</th><th>Product</th><th>${who}</th><th class="r">Quantity</th><th>Needed by</th><th>Status</th></tr></thead><tbody>${R.map(r=>`<tr data-o="${esc(r.o.id)}"><td><b>${esc(r.po)}</b></td><td>${esc(r.l.name)} (unbranded)</td><td>${esc(r.role==='out'?r.t.brand:r.t.blank)}</td><td class="r">${r.qty.toLocaleString('en-GB')}</td><td>${fD(r.nb)}</td><td><span class="opill ${r.L.st==='booked'?(r.L.book&&r.L.book.hold?'red':'green'):r.L.st==='shipped'?'peri':'amber'}">${r.L.book&&r.L.book.hold?'Short':ST_LBL[r.L.st]}</span>${r.L.trk&&r.role==='in'?` <small class="tw-m">${esc(r.L.trk.courier)} ${esc(r.L.trk.no)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`:'';
    return tbl(out,'Blank stock you’re sending','Deliver to')+tbl(inn,'Incoming blank stock','From'); }
  function amended(oid,i,what){ const L=lane(oid,i); if(L.st==='todo'||(L.rev&&L.rev.what===what)) return;
    const late=L.st==='shipped'||L.st==='booked', v=Object.assign({},L,{rev:{what,at:now(),late}});
    if(!late){ v.st='sent'; v.oaPrev=L.oa||null; v.oa=null; }
    putLane(oid,i,v); activity(oid,'Order amended ('+what+')'+(late?' · blank stock already shipped: agree the difference with the blank supplier':' · revised blank stock PO needs acknowledging'),'dist');
    notify('supplier',late?'Order quantity changed after dispatch':'Revised blank stock order',what); }

  /* ---------- lane on the order page ---------- */
  const STEPS=[['sent','Blank PO sent'],['ack','Acknowledged'],['shipped','Shipped to decorator'],['booked','Booked in']];
  const SI={todo:-1,sent:0,ack:1,shipped:2,booked:3};
  const CTX={};
  function laneHTML(o,i,role,c){ CTX[o.id+':'+i]=Object.assign({o},c); const L=lane(o.id,i), t=c.two, dist=role==='distributor', deco=role==='supplier';
    const si=SI[L.st]; const B=(txt,a,p)=>`<button type="button" class="${p?'bk-cta2':'fn-ghost'} sm" data-tw="${a}" data-twk="${esc(o.id)}:${i}">${txt}</button>`;
    let nx; const r=risk(c,L), hold=L.book&&L.book.hold;
    if(dist&&L.rev&&L.rev.late&&!L.rev.done) nx=['Order amended after the blank stock shipped',esc(L.rev.what)+'. Agree any extra or returned stock with '+esc(t.blank)+', then mark it sorted.','red',B('Mark sorted','revok',1)+B('Chase','chase')];
    else if(dist) nx=L.st==='sent'&&L.rev&&!L.rev.late?['Revised blank stock order · waiting for '+esc(t.blank),esc(L.rev.what)+'. They need to acknowledge the revised quantities.','amber',B('Upload acknowledgement','oa')+B('Chase','chase')]:L.st==='todo'?['Send the blank stock PO to '+esc(t.blank),'Unbranded stock, delivered to '+esc(t.brand)+'’s goods in. Overs '+(L.overs??t.overs)+'% (you can change this).','amber',B('Send blank stock PO','send',1)]
      :L.st==='sent'?['Waiting for '+esc(t.blank)+' to acknowledge','They confirm their dispatch date to '+esc(t.brand)+'.','',B('Upload acknowledgement','oa')+B('Chase','chase')]
      :L.st==='ack'?['Waiting for '+esc(t.blank)+' to ship','Due to dispatch '+fD(parseDay(L.oa&&L.oa.dispatch))+'. They add tracking here, or you can.','',B('Add tracking','trk')+B('Chase','chase')]
      :L.st==='shipped'?['On its way to '+esc(t.brand),'Expected '+fD(addWD(new Date(L.trk.at),t.transit))+'. '+esc(t.brand)+' books it in when it arrives.','',B('Book in stock','book')+B('Chase','chase')]
      :hold?['Stock booked in short · production on hold',esc(L.book.note||'Waiting for replacement stock from '+t.blank),'red',B('Record replacement received','book',1)+B('Proceed with what arrived','proceed')+B('Chase','chase')]
      :['Blank stock booked in at '+esc(t.brand),(L.book?L.book.recv.toLocaleString('en-GB')+' received':'')+(L.book&&L.book.by?' · by '+esc(L.book.by):''),'green',L.inv?'':B('Upload blank supplier invoice','inv')];
    else if(deco) nx=L.st==='todo'||L.st==='sent'||L.st==='ack'?['Blank stock is being arranged','It comes from '+esc(t.blank)+(L.oa&&L.oa.dispatch?', dispatching '+fD(parseDay(L.oa.dispatch)):'')+'. Book it in when it arrives.','',L.st!=='todo'?B('Book in stock','book'):'']
      :L.st==='shipped'?['Blank stock on its way to you',esc(L.trk.courier)+' '+esc(L.trk.no)+' · expected '+fD(addWD(new Date(L.trk.at),t.transit))+'. Count it in when it arrives.','amber',B('Book in stock','book',1)]
      :hold?['Stock short · production on hold','Mojo Promotions is arranging the rest.','red','']:['Blank stock booked in','You can start production once the proof is approved.','green',''];
    const facts=[['Needed at '+esc(t.brand)+' by',fD(needBy(c))],L.oa&&L.oa.dispatch?['Dispatch confirmed',fD(parseDay(L.oa.dispatch))+(L.oa.ref?' · '+esc(L.oa.ref):'')]:null,L.trk?['Tracking',`${esc(L.trk.courier)} · ${CURL[L.trk.courier]?`<a href="${esc(CURL[L.trk.courier]+L.trk.no)}" target="_blank" rel="noopener">${esc(L.trk.no)}</a>`:esc(L.trk.no)}`]:null,
      L.book?['Booked in',L.book.recv.toLocaleString('en-GB')+' of '+L.book.sent.toLocaleString('en-GB')+(L.book.damaged?' · '+L.book.damaged+' damaged':'')]:null,
      dist&&L.inv?['Blank invoice',esc(L.inv.no)+' · '+gbp(L.inv.amount)+(Math.abs(L.inv.diff)>0.004?` <em class="${L.inv.diff>0?'tw-bad':'tw-ok'}">${L.inv.diff>0?'+':'−'}${gbp(Math.abs(L.inv.diff))} vs PO</em>`:' <em class="tw-ok">matches PO</em>')]:null].filter(Boolean);
    return `<div class="tw-lane${hold?' hold':''}" data-twlane="${esc(o.id)}:${i}">
      <div class="tw-h"><span class="tw-tag">${deco?'Incoming blank stock':'Blank stock'}</span><b>${esc(t.blank)}</b><span class="tw-arr" aria-hidden="true">→</span><b>${esc(t.brand)}</b>${dist||L.st!=='todo'?`<span class="tw-po">${esc(blankPO(c))}</span>`:''}<span class="tw-sp"></span>${dist?`<span class="tw-ov">Overs ${L.overs??t.overs}%</span>${L.st!=='todo'?`<button type="button" class="tw-lk" data-tw="print" data-twk="${esc(o.id)}:${i}">View PO</button>`:''}`:''}</div>
      <ol class="tw-steps">${STEPS.map(([k,lb],n)=>`<li class="${n<=si?'on':''}${n===si+1?' next':''}"><i></i><span>${lb}</span></li>`).join('')}</ol>
      ${r?`<div class="tw-risk"><b>Delivery at risk</b><span>${r}</span>${dist?B('Chase '+esc(t.blank),'chase'):''}</div>`:''}
      <div class="tw-next ${nx[2]}"><div><b>${nx[0]}</b><span>${nx[1]}</span></div>${nx[3]?`<div class="tw-acts">${nx[3]}</div>`:''}</div>
      <div class="tw-facts">${facts.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}</div></div>`; }

  /* ---------- modals ---------- */
  function modal(title,body,ok,okLabel){ const w=document.createElement('div'); w.className='tw-scrim'; w.innerHTML=`<div class="tw-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="tw-mh"><b>${esc(title)}</b><button type="button" class="tw-x" data-twx aria-label="Close">×</button></div><div class="tw-mb">${body}<p class="tw-err" hidden></p></div><div class="tw-mf"><button type="button" class="fn-ghost" data-twx>Cancel</button>${ok?`<button type="button" class="bk-cta2" data-twok>${esc(okLabel||'Save')}</button>`:''}</div></div>`;
    const close=()=>{ w.remove(); document.body.style.overflow=''; }; w.querySelectorAll('[data-twx]').forEach(b=>b.onclick=close); w.addEventListener('mousedown',e=>{ if(e.target===w) close(); });
    const k=w.querySelector('[data-twok]'); if(k) k.onclick=async()=>{ const e=await ok(w); if(typeof e==='string'){ const p=w.querySelector('.tw-err'); p.textContent=e; p.hidden=false; return; } close(); };
    document.body.appendChild(w); document.body.style.overflow='hidden'; return w; }
  const fileToData=f=>new Promise(r=>{ if(!f) return r(null); const fr=new FileReader(); fr.onload=()=>r({name:f.name,type:f.type,data:f.size<1.5e6?fr.result:''}); fr.readAsDataURL(f); });

  function act(a,key,role){ const [oid,si]=key.split(':'), i=+si, c=CTX[key]; if(!c) return; const t=c.two, L=lane(oid,i), who=role==='supplier'?(role==='supplier'&&c.viewer?c.viewer:t.brand):me();
    const save=(v,msg,r2)=>{ putLane(oid,i,v); if(msg) activity(oid,{t:msg,who},r2||(role==='supplier'?'supplier':'dist')); redo(); if(c.onChange) c.onChange(); };
    if(a==='send'){ const ov=L.overs??t.overs; const w=modal('Send blank stock PO · '+c.name,`<p class="tw-lede">Unbranded stock from <b>${esc(t.blank)}</b>, delivered to <b>${esc(t.brand)}</b> for branding. ${esc(t.blank)} doesn’t see who the end customer is.</p>
        <div class="tw-g2"><div class="tw-box"><span>Send to</span><b>${esc(c.blankContact.n)}</b><small>${esc(t.blank)} · ${esc(c.blankContact.email||'')}</small></div><div class="tw-box"><span>Deliver to</span><b>${esc(goodsIn(t.brand)[0])}</b><small>${esc(goodsIn(t.brand).slice(1).join(', '))}</small></div></div>
        <div class="tw-g2"><label class="tw-f"><span>Overs %</span><input type="number" min="0" max="25" step="0.5" value="${ov}" data-tov><small>Extra stock to cover spoilage during branding. Standard is 3%.</small></label><div class="tw-box"><span>Needed at ${esc(t.brand)} by</span><b>${fD(needBy(c))}</b><small>${t.brandLead} working days before the decorator’s delivery date${c.nofail?' · NO FAIL':''}</small></div></div>
        <table class="tw-t" data-tvs><thead><tr><th>Variant</th><th>SKU</th><th class="r">Ordered</th><th class="r">To send</th></tr></thead><tbody></tbody><tfoot></tfoot></table>
        <div class="tw-box"><span>Quotes</span><b>Decorator’s PO ${esc(c.decoPO||'—')}</b><small>So ${esc(t.brand)} can match the stock when it arrives.</small></div>
        <label class="tw-f"><span>Message to ${esc(t.blank)} (optional)</span><textarea rows="2" data-tmsg></textarea></label>
        <button type="button" class="tw-lk" data-tprev>Preview purchase order ${esc(blankPO(c))}</button>`,
        w=>{ const v=+w.querySelector('[data-tov]').value; if(!(v>=0&&v<=25)) return 'Overs should be between 0 and 25%.';
          notify('supplier','New order '+blankPO(c),'Unbranded stock for Mojo Promotions · deliver to '+t.brand);
          save(Object.assign({},L,{st:'sent',overs:v,sentAt:now(),sentBy:me(),msg:w.querySelector('[data-tmsg]').value.trim()}),'Sent blank stock PO '+blankPO(c)+' to '+t.blank+' · overs '+v+'% · deliver to '+t.brand); toast('Blank stock PO sent to '+t.blank); },'Send PO');
      const draw=()=>{ const v=+w.querySelector('[data-tov]').value||0, R=withOvers(c.vs,v); w.querySelector('[data-tvs] tbody').innerHTML=R.map(r=>`<tr><td>${esc(r.c)}${r.size?' · '+esc(r.size):''}</td><td>${esc(r.sku)}</td><td class="r">${r.qty.toLocaleString('en-GB')}</td><td class="r"><b>${r.send.toLocaleString('en-GB')}</b></td></tr>`).join('');
        const q=R.reduce((a,r)=>a+r.qty,0), s=R.reduce((a,r)=>a+r.send,0); w.querySelector('[data-tvs] tfoot').innerHTML=`<tr><td colspan="2">Total · ${gbp(c.blankUnit)} each</td><td class="r">${q.toLocaleString('en-GB')}</td><td class="r"><b>${s.toLocaleString('en-GB')}</b> · ${gbp(s*c.blankUnit+(c.carriage||0))}${c.carriage?' incl. carriage':''}</td></tr>`; };
      w.querySelector('[data-tov]').oninput=draw; draw(); w.querySelector('[data-tprev]').onclick=()=>printPO(Object.assign({},c,{overs:+w.querySelector('[data-tov]').value||0})); return; }
    if(a==='oa'){ modal('Blank stock acknowledgement · '+c.name,`<p class="tw-lede">${role==='supplier'?'Confirm the order and when you’ll dispatch it to '+esc(t.brand)+'.':'Upload the acknowledgement '+esc(t.blank)+' sent for '+esc(blankPO(c))+'.'}</p>
        <label class="tw-f"><span>Acknowledgement file (optional)</span><input type="file" data-tf></label>
        <div class="tw-g2"><label class="tw-f"><span>Their reference</span><input data-tref placeholder="e.g. SO-44821"></label><label class="tw-f"><span>Dispatch date to ${esc(t.brand)}</span><input type="date" data-tdd required></label></div>
        <label class="tw-chk"><input type="checkbox" data-tck> Quantities (with ${L.overs??t.overs}% overs), SKUs, price and the delivery address match ${esc(blankPO(c))}</label>`,
        async w=>{ const d=w.querySelector('[data-tdd]').value; if(!d) return 'Add the dispatch date.'; if(!w.querySelector('[data-tck]').checked) return 'Tick to confirm it matches the PO.';
          const f=await fileToData(w.querySelector('[data-tf]').files[0]); notify('distributor','Blank stock acknowledged',t.blank+' · '+c.name+' · dispatch '+fD(new Date(d)));
          save(Object.assign({},L,{st:'ack',oa:{ref:w.querySelector('[data-tref]').value.trim(),dispatch:d,file:f,at:now(),by:who,checked:true}}),t.blank+' acknowledged '+blankPO(c)+' · dispatch to '+t.brand+' '+fD(new Date(d))); toast('Acknowledgement saved'); },'Save'); return; }
    if(a==='trk'){ modal('Tracking to '+t.brand+' · '+c.name,`<div class="tw-g2"><label class="tw-f"><span>Courier</span><select data-tc>${COUR.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label class="tw-f"><span>Tracking / consignment number</span><input data-tn></label></div>
        <label class="tw-f"><span>Shipped on</span><input type="date" data-tsd value="${new Date().toISOString().slice(0,10)}"></label>`,
        w=>{ const n=w.querySelector('[data-tn]').value.trim(), cr=w.querySelector('[data-tc]').value; if(!n&&!UNTR(cr)) return 'Add the tracking number, or choose Royal Mail (untracked) or Hand delivered.';
          notify('supplier','Blank stock on its way',t.blank+' → '+t.brand+' · '+c.name+' · '+cr+' '+n);
          save(Object.assign({},L,{st:'shipped',trk:{courier:cr,no:n||'',at:w.querySelector('[data-tsd]').value||now(),by:who}}),'Blank stock for '+c.name+' shipped to '+t.brand+' · '+cr+' '+n); toast('Tracking added'); },'Save tracking'); return; }
    if(a==='book'){ const R=withOvers(c.vs,L.overs??t.overs), prev=L.book&&L.book.rows||{};
      const w=modal('Book in blank stock · '+c.name,`<p class="tw-lede">Count the stock from <b>${esc(t.blank)}</b> against ${esc(blankPO(c))}. Production can’t start until it’s booked in.</p>
        <table class="tw-t"><thead><tr><th>Variant</th><th class="r">Ordered</th><th class="r">Sent</th><th class="r">Received</th><th class="r">Damaged</th></tr></thead><tbody>${R.map((r,k)=>`<tr><td>${esc(r.c)}${r.size?' · '+esc(r.size):''}</td><td class="r">${r.qty.toLocaleString('en-GB')}</td><td class="r">${r.send.toLocaleString('en-GB')}</td><td class="r"><input type="number" min="0" data-trv="${k}" value="${prev[k]?prev[k].recv+(L.book&&L.book.hold?0:0):r.send}"></td><td class="r"><input type="number" min="0" data-tdm="${k}" value="${prev[k]?prev[k].dmg:0}"></td></tr>`).join('')}</tbody></table>
        <div class="tw-sum" data-tsum></div>
        <label class="tw-f"><span>Notes</span><textarea rows="2" data-tbn placeholder="Condition, carton count, anything that doesn’t match"></textarea></label>
        <div class="tw-f" data-tshort hidden><span>Not enough good stock to fill the order</span><label class="tw-chk"><input type="radio" name="twh" value="hold" checked> Hold production and ask ${esc(t.blank)} for the rest</label><label class="tw-chk"><input type="radio" name="twh" value="go"> Proceed with what arrived</label></div>`,
        w=>{ const rows={}; let recv=0,dmg=0,short=false; R.forEach((r,k)=>{ const rv=+w.querySelector(`[data-trv="${k}"]`).value||0, dm=+w.querySelector(`[data-tdm="${k}"]`).value||0; rows[k]={recv:rv,dmg:dm}; recv+=rv; dmg+=dm; if(rv-dm<r.qty) short=true; });
          const sent=R.reduce((a,r)=>a+r.send,0), hold=short&&(w.querySelector('input[name="twh"]:checked')||{}).value==='hold', note=w.querySelector('[data-tbn]').value.trim();
          if(short&&hold) notify('distributor','Blank stock short · '+c.name,t.brand+' booked in '+(recv-dmg)+' good of '+R.reduce((a,r)=>a+r.qty,0)+' needed');
          else notify('distributor','Blank stock booked in',c.name+' at '+t.brand);
          save(Object.assign({},L,{st:'booked',book:{rows,recv,dmg,sent,damaged:dmg,short,hold,note:note||(short?'Short by '+(R.reduce((a,r)=>a+r.qty,0)-(recv-dmg))+' good units':''),at:now(),by:who}}),'Blank stock for '+c.name+' booked in at '+t.brand+' · '+recv+' received'+(dmg?' · '+dmg+' damaged':'')+(short?(hold?' · SHORT, production on hold':' · short, proceeding'):'')); toast(short&&hold?'Booked in · production on hold':'Stock booked in'); },'Book in');
      const upd=()=>{ let good=0,need=0,short=false; R.forEach((r,k)=>{ const g=(+w.querySelector(`[data-trv="${k}"]`).value||0)-(+w.querySelector(`[data-tdm="${k}"]`).value||0); good+=g; need+=r.qty; if(g<r.qty) short=true; });
        w.querySelector('[data-tsum]').innerHTML=short?`<b class="tw-bad">Short</b> · ${good.toLocaleString('en-GB')} good units for ${need.toLocaleString('en-GB')} ordered`:`<b class="tw-ok">Enough stock</b> · ${good.toLocaleString('en-GB')} good units for ${need.toLocaleString('en-GB')} ordered`; w.querySelector('[data-tshort]').hidden=!short; };
      w.querySelectorAll('[data-trv],[data-tdm]').forEach(e=>e.oninput=upd); upd(); return; }
    if(a==='revok'){ save(Object.assign({},L,{rev:Object.assign({},L.rev,{done:true,doneAt:now()})}),'Blank stock difference sorted with '+t.blank+' ('+L.rev.what+')'); return; }
    if(a==='proceed'){ save(Object.assign({},L,{book:Object.assign({},L.book,{hold:false,proceedBy:me(),proceedAt:now()})}),'Production for '+c.name+' to proceed with the blank stock that arrived'); notify('supplier','Go ahead with the stock you have',c.name); return; }
    if(a==='inv'){ const exp=withOvers(c.vs,L.overs??t.overs).reduce((a,r)=>a+r.send,0)*c.blankUnit+(c.carriage||0);
      modal('Blank supplier invoice · '+t.blank,`<p class="tw-lede">Matched against ${esc(blankPO(c))}: expected <b>${gbp(exp)}</b> (stock sent incl. overs × ${gbp(c.blankUnit)}${c.carriage?' + '+gbp(c.carriage)+' carriage':''}).</p>
        <div class="tw-g2"><label class="tw-f"><span>Invoice number</span><input data-tin></label><label class="tw-f"><span>Amount (ex VAT, £)</span><input type="number" step="0.01" data-tia value="${exp.toFixed(2)}"></label></div><label class="tw-f"><span>Invoice file (optional)</span><input type="file" data-tif></label>`,
        async w=>{ const no=w.querySelector('[data-tin]').value.trim(), am=+w.querySelector('[data-tia]').value; if(!no) return 'Add the invoice number.'; if(!(am>0)) return 'Add the amount.';
          const f=await fileToData(w.querySelector('[data-tif]').files[0]), diff=Math.round((am-exp)*100)/100;
          save(Object.assign({},L,{inv:{no,amount:am,diff,file:f,at:now()}}),'Blank supplier invoice '+no+' from '+t.blank+' · '+gbp(am)+(Math.abs(diff)>0.004?' · '+(diff>0?'+':'−')+gbp(Math.abs(diff))+' vs PO':' · matches PO'),'internal'); },'Save invoice'); return; }
    if(a==='chase'){ modal('Chase '+t.blank,`<label class="tw-f"><span>Send by</span><select data-tcv><option>Email to ${esc(c.blankContact.email||'')}</option><option>Platform chat</option></select></label><label class="tw-f"><span>Message</span><textarea rows="3" data-tcm>Hi ${esc((c.blankContact.n||'').split(' ')[0])}, please can you confirm ${L.st==='sent'?'your dispatch date':'when the stock'} for ${esc(blankPO(c))} will reach ${esc(t.brand)}? It’s needed there by ${fD(needBy(c))}.</textarea></label>`,
        w=>{ save(Object.assign({},L,{chasedAt:now()}),'Chased '+t.blank+' about '+blankPO(c)); toast('Chased '+t.blank); },'Send'); return; }
    if(a==='print') return printPO(Object.assign({},c,{overs:L.overs??t.overs,sentAt:L.sentAt}));
  }
  function wire(root,role){ root.querySelectorAll('[data-tw]').forEach(b=>b.onclick=e=>{ e.preventDefault(); act(b.dataset.tw,b.dataset.twk,role); }); }

  /* ---------- blank PO print (no customer name) ---------- */
  function printPO(c){ const t=c.two, R=withOvers(c.vs,c.overs??t.overs), gi=goodsIn(t.brand), q=R.reduce((a,r)=>a+r.send,0), w=window.open('','_blank'); if(!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Purchase order ${esc(blankPO(c))}</title><style>@page{size:A4;margin:16mm} body{font:12.5px/1.5 "Mulish",Arial,sans-serif;color:#1e2033;margin:0}
      .top{display:flex;justify-content:space-between;border-bottom:2px solid #4E5BA6;padding-bottom:12px;margin-bottom:14px} h1{font:500 28px "EB Garamond",Georgia,serif;margin:0} .m{color:#667085}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:12px 0} .box{background:#f4f5fb;border-radius:10px;padding:10px 12px} .box b{display:block}
      .warn{border:1.5px solid #f79009;background:#fffaeb;border-radius:10px;padding:10px 12px;margin:10px 0} .warn b{color:#93370d}
      table{width:100%;border-collapse:collapse;margin:10px 0} th,td{text-align:left;padding:7px 6px;border-bottom:1px solid #e4e7ec} th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#667085} .r{text-align:right}</style></head><body>
      <div class="top"><div><h1>Purchase order ${esc(blankPO(c))}</h1><div class="m">To ${esc(c.blankContact.n)} at ${esc(t.blank)} (${esc(c.blankContact.email||'')})${c.sentAt?' · sent '+fD(c.sentAt):''}</div></div><div style="text-align:right"><b>Mojo Promotions Ltd</b><div class="m">orders@mojopromotions.co.uk</div></div></div>
      <div class="warn"><b>UNBRANDED STOCK FOR DECORATION</b> · Deliver to ${esc(t.brand)}, not to the end customer. Quote <b>${esc(c.decoPO||blankPO(c))}</b> on the delivery note. Don’t include any customer-facing paperwork.</div>
      <div class="two"><div class="box"><span class="m">Deliver to</span><b>${gi.map(esc).join('<br>')}</b>${decorCfg(t.brand).note?'<div class="m">'+esc(decorCfg(t.brand).note)+'</div>':''}</div><div class="box"><span class="m">Required at ${esc(t.brand)} by</span><b>${fD(needBy(c))}</b>${c.nofail?'<span class="m">No-fail delivery downstream</span>':''}</div></div>
      <table><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th class="r">Ordered</th><th class="r">Overs</th><th class="r">Send</th><th class="r">Unit</th><th class="r">Total</th></tr></thead><tbody>${R.map(r=>`<tr><td>${esc(c.name)} (unbranded)</td><td>${esc(r.c)}${r.size?' · '+esc(r.size):''}</td><td>${esc(r.sku)}</td><td class="r">${r.qty.toLocaleString('en-GB')}</td><td class="r">${(r.send-r.qty).toLocaleString('en-GB')}</td><td class="r"><b>${r.send.toLocaleString('en-GB')}</b></td><td class="r">${gbp(c.blankUnit)}</td><td class="r">${gbp(r.send*c.blankUnit)}</td></tr>`).join('')}</tbody>
      <tfoot>${c.carriage?`<tr><td colspan="7">Carriage to ${esc(t.brand)}</td><td class="r">${gbp(c.carriage)}</td></tr>`:''}<tr><td colspan="5"><b>Total · overs ${c.overs??t.overs}%</b></td><td class="r"><b>${q.toLocaleString('en-GB')}</b></td><td></td><td class="r"><b>${gbp(q*c.blankUnit+(c.carriage||0))}</b></td></tr></tfoot></table>
      <p class="m">Please upload your order acknowledgement with your dispatch date, then the tracking, in the Merchsmith supplier portal.</p><script>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close(); }

  /* ---------- blank supplier's own view of the order ---------- */
  function blankPage(root,o,cs,viewer){ cs.forEach(c=>{ c.viewer=viewer; CTX[o.id+':'+c.i]=Object.assign({o},c); });
    const B=(txt,a,k,p)=>`<button type="button" class="${p?'bk-cta2':'fn-ghost'} sm" data-tw="${a}" data-twk="${esc(o.id)}:${k}">${txt}</button>`;
    // a blank supplier only sees POs that have actually been sent to them
    const sent=cs.filter(c=>lane(o.id,c.i).st!=='todo'&&lane(o.id,c.i).st);
    if(!sent.length){ root.innerHTML=`<div class="wrap cf od"><a class="od-back" href="Merchsmith Supplier Portal.html">‹ Supplier portal</a><section class="fn-card" style="margin-top:18px;text-align:center;padding:40px 24px"><h2 style="margin:0 0 6px;font:500 26px var(--serif,'EB Garamond',serif)">Nothing to action yet</h2><p class="m" style="margin:0;color:var(--g500,#667085)">Mojo Promotions hasn’t sent you a purchase order for this job yet. You’ll get an email when they do.</p></section></div>`; return; }
    root.innerHTML=`<div class="wrap cf od"><a class="od-back" href="Merchsmith Supplier Portal.html">‹ Supplier portal</a>
      ${sent.map(c=>{ const L=lane(o.id,c.i), t=c.two, R=withOvers(c.vs,L.overs??t.overs), si=SI[L.st], gi=goodsIn(t.brand);
        const nx=L.st==='sent'?['Acknowledge this order','Confirm when you’ll dispatch to '+esc(t.brand)+'.','amber',B('Acknowledge order','oa',c.i,1)+B('View PO','print',c.i)]
          :L.st==='ack'?['Add tracking when it ships','Deliver to '+esc(t.brand)+'’s goods in by '+fD(needBy(c))+'.','amber',B('Add tracking','trk',c.i,1)]
          :L.st==='shipped'?['On its way to '+esc(t.brand),esc(L.trk.courier)+' '+esc(L.trk.no),'',''] :L.st==='booked'?['Booked in by '+esc(t.brand),L.book&&L.book.hold?'Short delivered · Mojo Promotions will be in touch.':'Thank you.',L.book&&L.book.hold?'red':'green','']:['Not sent yet','','',''];
        return `<section class="cf-hero od-hero"><div class="cf-ht"><h1>${esc(blankPO(c))}</h1><p>Mojo Promotions · unbranded stock for decoration by ${esc(t.brand)}</p></div>
          <div class="cf-refs"><div><span>Deliver by</span><b>${fD(needBy(c))}</b></div><div><span>Quantity</span><b>${R.reduce((a,r)=>a+r.send,0).toLocaleString('en-GB')}</b></div><div><span>Value</span><b>${gbp(R.reduce((a,r)=>a+r.send,0)*c.blankUnit+(c.carriage||0))}</b>${c.carriage?`<small>incl. ${gbp(c.carriage)} carriage</small>`:''}</div></div></section>
          <section class="fn-card od-item"><div class="fn-hd"><h2>${esc(c.name)} · unbranded</h2></div>
            <ol class="tw-steps">${STEPS.map(([k,lb],n)=>`<li class="${n<=si?'on':''}${n===si+1?' next':''}"><i></i><span>${lb}</span></li>`).join('')}</ol>
            <div class="tw-next ${nx[2]}"><div><b>${nx[0]}</b><span>${nx[1]}</span></div>${nx[3]?`<div class="tw-acts">${nx[3]}</div>`:''}</div>
            <div class="tw-g2" style="margin-top:12px"><div class="tw-box"><span>Deliver to</span><b>${esc(gi[0])}</b><small>${esc(gi.slice(1).join(', '))}</small></div><div class="tw-box"><span>Quote on the delivery note</span><b>${esc(c.decoPO||blankPO(c))}</b><small>Unbranded stock · no customer paperwork</small></div></div>
            <table class="tw-t"><thead><tr><th>Variant</th><th>SKU</th><th class="r">Ordered</th><th class="r">Overs</th><th class="r">Send</th><th class="r">Unit</th><th class="r">Total</th></tr></thead><tbody>${R.map(r=>`<tr><td>${esc(r.c)}${r.size?' · '+esc(r.size):''}</td><td>${esc(r.sku)}</td><td class="r">${r.qty.toLocaleString('en-GB')}</td><td class="r">${(r.send-r.qty).toLocaleString('en-GB')}</td><td class="r"><b>${r.send.toLocaleString('en-GB')}</b></td><td class="r">${gbp(c.blankUnit)}</td><td class="r">${gbp(r.send*c.blankUnit)}</td></tr>`).join('')}</tbody>${c.carriage?`<tfoot><tr><td colspan="6">Carriage to ${esc(t.brand)}</td><td class="r">${gbp(c.carriage)}</td></tr></tfoot>`:''}</table></section>`; }).join('')}</div>`;
    wire(root,'supplier'); }

  /* ---------- editor (store default + project override) ---------- */
  function editor(name,proj,onDone){ const cur=get(name,proj||'__store__'), hasProj=!!proj&&!!(J('ms-two-proj',{})[proj]||{})[name], S=suppliers(), Dc=decorators();
    const v=cur||Object.assign({},DEF,{blank:S[0],brand:Dc[0]});
    const w=modal('Suppliers · '+name,`<label class="tw-chk"><input type="checkbox" data-eon${cur?' checked':''}> Two suppliers: the blank product from one, the branding from another</label>
      <div data-eb${cur?'':' hidden'}><div class="tw-g2"><label class="tw-f"><span>Blank product supplier</span><select data-ebl>${S.map(n=>`<option${n===v.blank?' selected':''}>${esc(n)}</option>`).join('')}</select></label><label class="tw-f"><span>Branded by (decorator)</span><select data-ebr>${Dc.map(n=>`<option${n===v.brand?' selected':''}>${esc(n)}</option>`).join('')}</select></label></div>
        <div class="tw-g2"><label class="tw-f"><span>Blank supplier lead time (working days)</span><input type="number" min="0" max="60" data-ebll value="${v.blankLead}"></label><div></div></div><div class="tw-g3"><label class="tw-f"><span>Overs %</span><input type="number" min="0" max="25" step="0.5" data-eov value="${v.overs}"></label><label class="tw-f"><span>Transit (working days)</span><input type="number" min="0" max="15" data-etr value="${v.transit}"></label><label class="tw-f"><span>Decorator lead time (days)</span><input type="number" min="1" max="30" data-eld value="${v.brandLead}"></label></div>
        <small class="tw-m">Order-by and delivery dates add the blank supplier’s lead time, the transit and the decorator’s lead time together.</small></div>
      ${proj?'':'<div hidden>'}<div class="tw-f"><span>Apply to</span><label class="tw-chk"><input type="radio" name="twsc" value="proj"${hasProj||proj?' checked':''}> This project only</label><label class="tw-chk"><input type="radio" name="twsc" value="prod"${!hasProj&&!proj?' checked':''}> Store default for this product</label>${hasProj?'<button type="button" class="tw-lk" data-ereset>Use the store default again</button>':''}</div>${proj?'':'</div><small class="tw-m">Saved as the store default. Projects can choose a different decorator.</small>'}`,
      w=>{ const on=w.querySelector('[data-eon]').checked, sc=(w.querySelector('input[name="twsc"]:checked')||{}).value;
        const val=on?{blank:w.querySelector('[data-ebl]').value,brand:w.querySelector('[data-ebr]').value,overs:+w.querySelector('[data-eov]').value||0,transit:+w.querySelector('[data-etr]').value||0,brandLead:+w.querySelector('[data-eld]').value||5,blankLead:+w.querySelector('[data-ebll]').value||0}:{off:true};
        if(on&&val.blank===val.brand) return 'Choose two different suppliers.';
        if(sc==='prod'||!proj) setProd(name,val); else setProj(proj,name,val); toast(on?'Suppliers saved':'Single supplier'); if(onDone) onDone(get(name,proj)); },'Save');
    w.querySelector('[data-eon]').onchange=e=>{ w.querySelector('[data-eb]').hidden=!e.target.checked; };
    const rs=w.querySelector('[data-ereset]'); if(rs) rs.onclick=()=>{ clearProj(proj,name); w.remove(); document.body.style.overflow=''; toast('Using the store default'); if(onDone) onDone(get(name,proj)); }; }

  const css=`.tw-lane{margin-top:14px;border:1px solid #e3e8ef;border-radius:14px;padding:14px 16px;background:#f5f7fa;display:flex;flex-direction:column;gap:12px;} .tw-lane.hold{border-color:#fda29b;}
  .tw-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:14px;} .tw-h b{font-weight:600;color:var(--g900,#101828);} .tw-arr{color:var(--g400,#98a2b3);} .tw-sp{flex:1;}
  .tw-tag{white-space:nowrap;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--g600,#475467);background:var(--g100,#f2f4f7);border-radius:6px;padding:3px 8px;}
  .tw-po{white-space:nowrap;font-size:12px;color:var(--g500,#667085);} .tw-ov{white-space:nowrap;font-size:12px;font-weight:700;color:var(--periwinkle-deep,#4E5BA6);background:var(--tint-peri,#eceef9);border-radius:999px;padding:2px 9px;}
  .tw-lk{border:0;background:none;padding:0;font:inherit;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep,#4E5BA6);cursor:pointer;} .tw-lk:hover{text-decoration:underline;}
  .tw-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;} .tw-steps li>span{white-space:nowrap;line-height:1.3;} .tw-lane .tw-steps li{width:auto!important;min-width:0;} .tw-steps li{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;font-size:12px;color:var(--g500,#667085);}
  .tw-steps li::before{content:"";position:absolute;top:6px;left:-50%;right:50%;height:2px;background:var(--g200,#e4e7ec);} .tw-steps li:first-child::before{display:none;} .tw-steps li.on::before,.tw-steps li.next::before{background:#17b26a;}
  .tw-steps i{position:relative;width:14px;height:14px;border-radius:50%;border:2px solid var(--g300,#d0d5dd);background:#fff;} .tw-steps li.on i{background:#17b26a;border-color:#17b26a;} .tw-steps li.next i{border-color:#f79009;} .tw-steps li.on span{color:var(--g800,#1d2939);font-weight:600;}
  .tw-next{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:var(--tint-peri,#eceef9);border-radius:12px;padding:10px 13px;} .tw-next>div:first-child{flex:1;min-width:200px;display:flex;flex-direction:column;gap:2px;} .tw-next b{font-size:13.5px;} .tw-next span{font-size:12.5px;color:var(--g600,#475467);}
  .tw-next.amber{background:#fffaeb;box-shadow:inset 3px 0 0 #f79009;} .tw-next.red{background:#fef3f2;box-shadow:inset 3px 0 0 #d92d20;} .tw-next.green{background:#ecfdf3;box-shadow:inset 3px 0 0 #17b26a;} .tw-acts{display:flex;gap:6px;flex-wrap:wrap;}
  .tw-risk{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#fef3f2;border:1px solid #fecdca;border-radius:10px;padding:8px 12px;font-size:12.5px;} .tw-risk b{color:#b42318;font-size:11px;letter-spacing:.05em;text-transform:uppercase;} .tw-risk span{flex:1;min-width:200px;color:var(--g700,#344054);}
  .tw-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;} .tw-facts>div{border:1px solid var(--g200,#e4e7ec);border-radius:10px;padding:7px 10px;display:flex;flex-direction:column;gap:2px;} .tw-facts span{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--g500,#667085);} .tw-facts b{font-size:13px;font-weight:600;overflow-wrap:anywhere;} .tw-facts a{color:var(--periwinkle-deep,#4E5BA6);}
  .tw-ok{font-style:normal;color:#067647;font-weight:700;} .tw-bad{font-style:normal;color:#b42318;font-weight:700;}
  .tw-scrim{position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:1400;display:grid;place-items:center;padding:16px;} .tw-modal{background:#fff;border-radius:16px;width:min(640px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(16,24,40,.25);}
  .tw-mh{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 8px;flex:none;} .tw-mh b{flex:1;min-width:0;font-family:var(--serif,serif);font-weight:500;font-size:22px;line-height:1.2;} .tw-x{border:0;background:none;font-size:24px;line-height:1;color:var(--g500,#667085);cursor:pointer;}
  .tw-mb{padding:4px 20px 12px;overflow:auto;display:flex;flex-direction:column;gap:12px;min-height:0;} .tw-mb>*{flex-shrink:0;} .tw-mf{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px 18px;border-top:1px solid var(--g200,#e4e7ec);flex:none;}
  .tw-lede{margin:0;font-size:13.5px;color:var(--g600,#475467);line-height:1.5;} .tw-err{margin:0;color:#b42318;font-size:13px;font-weight:600;} .tw-m{font-size:12px;color:var(--g500,#667085);}
  .tw-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;} .tw-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;} @media(max-width:560px){.tw-g2,.tw-g3{grid-template-columns:1fr;}}
  .tw-box{background:var(--g50,#f9fafb);border:1px solid var(--g200,#e4e7ec);border-radius:10px;padding:9px 12px;display:flex;flex-direction:column;gap:2px;} .tw-box span{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--g500,#667085);} .tw-box b{font-size:13.5px;} .tw-box small{font-size:12px;color:var(--g500,#667085);}
  .tw-f{display:flex;flex-direction:column;gap:5px;font-size:12.5px;} .tw-f>span{font-weight:700;color:var(--g700,#344054);} .tw-f input,.tw-f select,.tw-f textarea{font:inherit;font-size:14px;border:1px solid var(--g300,#d0d5dd);border-radius:8px;padding:8px 10px;} .tw-f small{color:var(--g500,#667085);}
  .tw-chk{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--g700,#344054);} .tw-chk input{accent-color:var(--periwinkle-deep,#4E5BA6);}
  .tw-t{width:100%;border-collapse:collapse;font-size:13px;} .tw-t th,.tw-t td{padding:7px 6px;border-bottom:1px solid var(--g200,#e4e7ec);text-align:left;} .tw-t th{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--g500,#667085);} .tw-t .r{text-align:right;} .tw-t input{width:78px;text-align:right;font:inherit;border:1px solid var(--g300,#d0d5dd);border-radius:6px;padding:4px 6px;} .tw-t tfoot td{font-weight:600;}
  .tw-sum{font-size:13px;} .tw-lc{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:var(--tint-peri,#eceef9);color:var(--periwinkle-deep,#4E5BA6);font-size:11.5px;font-weight:800;padding:0 6px;margin-left:6px;} .tw-list td.r,.tw-list th.r{text-align:right;} .tw-list tr[data-o]{cursor:pointer;} .tw-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:var(--g900,#101828);color:#fff;font-size:13.5px;font-weight:600;padding:10px 16px;border-radius:10px;opacity:0;transition:.2s;z-index:1500;pointer-events:none;} .tw-toast.on{opacity:1;transform:translateX(-50%);}`;
  const css2=`@media(max-width:640px){ .tw-h{flex-wrap:wrap;row-gap:6px;} .tw-steps li span{font-size:10.5px;white-space:normal!important;line-height:1.25;} .tw-next{align-items:stretch;} .tw-acts{width:100%;} .tw-acts>*{flex:1;}
    .tw-t{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;} .tw-t th,.tw-t td{white-space:nowrap;} .tw-facts{grid-template-columns:1fr!important;} .tw-modal{width:calc(100vw - 16px)!important;max-height:calc(100vh - 16px)!important;} }`;
  const st=document.createElement('style'); st.textContent=css+css2; document.head.appendChild(st);
  return {stockListHTML,blankCost,decorEditor,decorCfg,amended,get,setProd,setProj,editor,laneHTML,wire,ready,lane,blankPage,printPO,needBy,blankPO,goodsIn};
})();

(function(){ const st=document.createElement('style'); st.textContent='.pp-twosup{display:flex;align-items:center;gap:14px;flex-wrap:wrap;border:1px solid var(--g200,#e4e7ec);border-radius:14px;padding:12px 16px;margin:18px 0;background:#fff;} .pp-twosup>div{flex:1;min-width:240px;display:flex;flex-direction:column;gap:2px;} .pp-twosup span{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--g500,#667085);} .pp-twosup b{font-size:14px;font-weight:600;} .pp-twosup small{font-size:12px;color:var(--g500,#667085);}'; document.head.appendChild(st); })();
