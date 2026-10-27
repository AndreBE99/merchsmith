/* ============================================================
   order-amend.js — distributor order amendments (Sep 2026)
   Orders page: distributor "Amend order" on an item → the product's project
   pop-out opens in amendment mode (#product=NAME&amend=ORDERID:LINE).
   They change any section, then Save amendment (draft) or Resend to customer.
   Customer gets a notification → order page → "Review amendment" → same pop-out
   in review mode (&review=) → Approve amendment or Query it.
   On approval order-detail.js applies it to the order line; if the order was
   already paid, a balance is created: payment due (card/BACS) or refund due.
   Store: ms-order-amend {orderId:{line:{status draft|sent|queried|approved|applied,
     note, query, by, at, sentAt, approvedAt, approvedBy, before{qty,unit,branding}, after{qty,unit,branding}, diffNet}}}
   ============================================================ */
window.MSAMEND=window.MSAMEND||(function(){
  const KEY='ms-order-amend';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>(n<0?'−':'')+'£'+Math.abs(Number(n||0)).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const all=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const get=(oid,li)=>(all()[oid]||{})[li]||null;
  const set=(oid,li,a)=>{ const A=all(); A[oid]=A[oid]||{}; if(a) A[oid][li]=a; else delete A[oid][li]; try{ localStorage.setItem(KEY,JSON.stringify(A)); }catch(e){} };
  const forOrder=oid=>all()[oid]||{};
  const PROJ='Merchsmith Project - Autumn Giveaways.html';
  const url=(oid,li,name,mode)=>PROJ+'#product='+encodeURIComponent(name)+'&'+(mode==='review'?'review':'amend')+'='+encodeURIComponent(oid+':'+li);
  const orderUrl=oid=>'Merchsmith Orders.html#order='+encodeURIComponent(oid);
  const notify=(r,title,body,href,ev)=>{ try{ if(window.MSNOTIF&&MSNOTIF.push) MSNOTIF.push(r,{ev:ev||'order_placed',title,body,href}); }catch(e){} };
  const me=()=>{ try{ return (window.MSChat&&MSChat.me&&MSChat.me().name)||''; }catch(e){ return ''; } };
  const brandTxt=name=>{ try{ const s=JSON.parse(localStorage.getItem('ms-pm-spec')||'{}')[name]; if(!s||!(s.positions||[]).length) return ''; return s.positions.map(p=>[p.name,p.method,p.deco].filter(Boolean).join(' · ')).join(' + '); }catch(e){ return ''; } };

  /* ---------- project page: amendment / review bar on the pop-out ---------- */
  function bar(){
    const h=location.hash, am=(h.match(/[&#]amend=([^&]+)/)||[])[1], rv=(h.match(/[&#]review=([^&]+)/)||[])[1];
    const old=document.getElementById('pmAmendBar'); if(!am&&!rv){ if(old) old.remove(); return; }
    const [oid,liS]=decodeURIComponent(am||rv).split(':'), li=+liS, mode=am?'amend':'review';
    const O=window.MSOrders, o=O&&O.getOrder&&O.getOrder(oid); const line=o&&(o.lines||[])[li]; if(!line) return;
    const pm=document.getElementById('pmodal'); if(!pm||!pm.classList.contains('open')){ setTimeout(bar,300); return; }
    const prod=(typeof ordered!=='undefined'&&Array.isArray(ordered)?ordered:[]).find(p=>p.name===line.name)||{};
    const now=()=>{ const q=+prod.qty||line.qty||0, base=+(prod.each||prod.unit)||line.each||line.unit||0; const disc=+line.discountPct||0; const u=line.unit&&line.each?line.unit*(base/line.each):base*(1-disc/100); const gq=G?G.reduce((t,r)=>t+(+r.qty||0),0):null; const ds=dsig(); return {qty:G?gq:q,unit:Math.round(u*100)/100,branding:brandTxt(line.name)||line.branding||'',grid:G?G.map(x=>Object.assign({},x)):null,gridKind,design:ds,designChg:dChg(d0,ds)}; };
    // colour / size grid (sized lines use rows = sizes; otherwise colours with qty)
    const src0=(line.sized&&line.rows&&line.rows.length)?line.rows:((line.colours||[]).some(c=>c.qty!=null)?line.colours:(line.rows||[]));
    let gridKind=line.sized?'Size':'Colour', grid0=src0.map(r=>({c:r.c,hex:r.hex||'',qty:+r.qty||0}));
    // order line has no breakdown: build one from the product (sizes first, e.g. clothing; else colours), all on the first option
    if(grid0.length<=1){ const P=(window.__PD||{})[line.name], ch=(P&&P.branding&&P.branding.chosen)||{}, col=ch.productColour||((P&&P.colours||[])[0]||{}).name;
      const sz=(P&&P.sizes||[]).filter(x=>!/^one size$/i.test(x)); const cl=(P&&P.colours||[]).map(c=>c.name);
      if(sz.length>1){ gridKind='Size'; grid0=sz.map((z,k)=>({c:(col?col+' · ':'')+z,lbl:z,qty:k===0?(line.qty||0):0})); window.__amGridCol=col||''; }
      else if(cl.length>1){ gridKind='Colour'; const on=col||cl[0]; grid0=cl.map(n=>({c:n,qty:n===on?(line.qty||0):0})); } }
    // design fingerprint: proof version/status, visuals, artwork, proof visuals
    const dsig=()=>{ const d=prod.design||{}, pr=d.proof||{}, bp=pr.byPos||{}; const h=L=>(L||[]).length+':'+(L||[]).map(x=>String(x).slice(-24)).join('|'); return {proofVer:+pr.ver||1,proofSt:pr.st||'',vis:h((d.visual||{}).images),art:h(Object.values(bp).flatMap(x=>x.artwork||[])),pvis:h(Object.values(bp).flatMap(x=>x.visuals||[]))}; };
    const dKey='ms-am-d0:'+oid+':'+li; let d0=null; try{ d0=JSON.parse(sessionStorage.getItem(dKey)||'null'); }catch(e){}
    if(!d0){ const r0=get(oid,li); d0=(r0&&r0.before&&r0.before.design)||dsig(); try{ sessionStorage.setItem(dKey,JSON.stringify(d0)); }catch(e){} }
    const dChg=(A,B)=>{ if(!A||!B) return []; const o=[]; if(A.proofVer!==B.proofVer) o.push('Proof v'+A.proofVer+' → v'+B.proofVer); else if(A.pvis!==B.pvis) o.push('Proof visuals changed'); if(A.art!==B.art) o.push('Artwork changed'); if(A.vis!==B.vis) o.push('Visual changed'); return o; };
    let G=null, gOpen=false; { const r0=get(oid,li); if(r0&&r0.after&&r0.after.grid) G=r0.after.grid.map(x=>Object.assign({},x)); }
    const base0=brandTxt(line.name); const before={qty:line.qty||0,unit:line.unit||0,branding:(get(oid,li)&&get(oid,li).before&&get(oid,li).before.branding)||base0||line.branding||'',grid:grid0,design:d0};
    let a=get(oid,li);
    const draw=()=>{ a=get(oid,li); const after=mode==='review'&&a?a.after:now(), bT=before.qty*before.unit, aT=after.qty*after.unit, d=aT-bT, vr=o.vatRate==null?0.2:o.vatRate;
      let el=document.getElementById('pmAmendBar'); if(!el){ el=document.createElement('div'); el.id='pmAmendBar'; el.className='pm-amendbar'; pm.appendChild(el); }
      const chg=(k,b,x)=>b!==x?`<span class="am-chg"><em>${esc(k)}</em><s>${esc(b)}</s>→<b>${esc(x)}</b></span>`:'';
      const gridChg=(after.grid||[]).map(r=>{ const b=(before.grid||[]).find(x=>x.c===r.c); const bq=b?b.qty:0; return bq!==r.qty?chg(r.lbl||r.c,bq.toLocaleString('en-GB'),(+r.qty).toLocaleString('en-GB')):''; }).join('');
      const designChg=(after.designChg||[]).map(t=>`<span class="am-chg am-dchg"><em>Design</em><b>${esc(t)}</b></span>`).join('');
      const changes=[chg('Qty',before.qty.toLocaleString('en-GB'),after.qty.toLocaleString('en-GB')),gridChg,chg('Unit',gbp(before.unit),gbp(after.unit)),chg('Branding',before.branding||'—',after.branding||'—'),designChg].join('');
      const gridBtn=grid0.length>1?`<button type="button" class="am-gbtn" data-amgrid>${gOpen?'Hide':'Edit'} ${gridKind.toLowerCase()}s</button>`:'';
      const gridHTML=gOpen?`<div class="am-grid"><span class="am-glbl">${gridKind}s${gridKind==='Size'&&window.__amGridCol?' · '+esc(window.__amGridCol):''}<em>Total ${((G||grid0).reduce((t,r)=>t+(+r.qty||0),0)).toLocaleString('en-GB')}</em></span>${(G||grid0).map((r,k)=>`<label class="am-gc">${r.hex?`<i style="background:${esc(r.hex)}"></i>`:''}<span>${esc(r.lbl||r.c)}</span><input type="number" min="0" step="1" data-amg="${k}" value="${+r.qty||0}"></label>`).join('')}</div>`:'';
      const diff=`<span class="am-diff ${d>0.005?'up':d<-0.005?'down':''}">${Math.abs(d)<0.005?'No price change':(d>0?'Increase ':'Decrease ')+gbp(Math.abs(d*(1+vr)))+' inc VAT'}</span>`;
      if(mode==='amend'){
        const st=a&&a.status; const stTxt=st==='sent'?'Sent to customer · awaiting approval':st==='queried'?'Customer queried this':st==='draft'?'Saved, not sent':st==='approved'||st==='applied'?'Approved by the customer':'New amendment';
        el.innerHTML=`<div class="am-l"><span class="am-tag">Amending ${esc(o.ref)}</span><b>${esc(line.name)}</b><span class="am-st">${stTxt}</span></div>
          <div class="am-m">${changes||'<span class="am-none">Make your changes in the sections above</span>'}${diff}${gridBtn}${st==='queried'&&a.query?`<span class="am-q">“${esc(a.query)}”</span>`:''}</div>${gridHTML}
          <div class="am-r"><input class="am-note" placeholder="What’s changed? (shown to the customer)" value="${esc(a&&a.note||'')}"><a class="am-btn" href="${esc(orderUrl(oid))}">Back to order</a><button class="am-btn" data-amsave>Save amendment</button><button class="am-btn pri" data-amsend>Resend to customer</button></div>`;
        const rec=status=>{ const n=el.querySelector('.am-note').value.trim(), af=now(); const r=Object.assign({},a||{},{status,note:n,by:me()||'Jess Doyle',at:new Date().toISOString(),before,after:af,diffNet:af.qty*af.unit-bT}); if(status==='sent'){ r.sentAt=r.at; delete r.query; } set(oid,li,r); return r; };
        const gb=el.querySelector('[data-amgrid]'); if(gb) gb.onclick=()=>{ gOpen=!gOpen; if(gOpen&&!G) G=grid0.map(x=>Object.assign({},x)); draw(); };
        el.querySelectorAll('[data-amg]').forEach(inp=>inp.oninput=()=>{ G[+inp.dataset.amg].qty=Math.max(0,parseInt(inp.value,10)||0); const k=inp.dataset.amg, p=inp.selectionStart; draw(); const n=el.querySelector('[data-amg="'+k+'"]'); if(n){ n.focus(); try{ n.setSelectionRange(p,p); }catch(e){} } });
        el.querySelector('[data-amsave]').onclick=()=>{ rec('draft'); toast('Amendment saved'); draw(); };
        el.querySelector('[data-amsend]').onclick=()=>{ const n=el.querySelector('.am-note').value.trim(); if(!n){ el.querySelector('.am-note').focus(); el.querySelector('.am-note').classList.add('err'); toast('Say what’s changed before sending'); return; }
          const r=rec('sent'); notify('customer','Please approve an amendment to '+o.ref,line.name+' · '+n,orderUrl(oid),'proof_changes'); toast('Amendment sent to the customer'); setTimeout(()=>{ location.href=orderUrl(oid); },900); };
      } else {
        if(!a||a.status!=='sent'){ el.innerHTML=`<div class="am-l"><span class="am-tag">${esc(o.ref)}</span><b>${esc(line.name)}</b><span class="am-st">${a&&(a.status==='approved'||a.status==='applied')?'You approved this amendment':'No amendment waiting'}</span></div><div class="am-m"></div><div class="am-r"><a class="am-btn pri" href="${esc(orderUrl(oid))}">Back to order</a></div>`; return; }
        el.innerHTML=`<div class="am-l"><span class="am-tag">Amendment to ${esc(o.ref)}</span><b>${esc(line.name)}</b><span class="am-st">From ${esc(a.by)}${a.note?' · “'+esc(a.note)+'”':''}</span></div>
          <div class="am-m">${changes}${diff}</div>
          <div class="am-r"><a class="am-btn" href="${esc(orderUrl(oid))}">Back to order</a><button class="am-btn" data-amq>Query it</button><button class="am-btn pri" data-amok>Approve amendment</button></div>`;
        const dc=(a.after&&a.after.designChg)||[];
        if(dc.length){ const vp=document.createElement('button'); vp.type='button'; vp.className='am-btn'; vp.textContent='View new proof'; vp.onclick=()=>{ const t=document.querySelector('#pmRowClone .acts .actrow'); if(t) t.click(); window.__pmDTab='proof'; setTimeout(()=>{ const pt=document.querySelector('.dsg-tab[data-dtab="proof"]'); if(pt) pt.click(); },350); }; el.querySelector('.am-r').prepend(vp); }
        const approve=()=>{ if(dc.length&&prod.design&&prod.design.proof){ prod.design.proof.st='approved'; prod.design.proof.approvedAt=new Date().toISOString(); prod.design.proof.approvedBy=me()||'Sara Kemp'; }
          set(oid,li,Object.assign({},a,{status:'approved',approvedAt:new Date().toISOString(),approvedBy:me()||'Sara Kemp',proofApproved:!!dc.length})); notify('distributor','Amendment approved: '+o.ref,line.name+(Math.abs(d)>0.005?' · '+(d>0?'increase ':'decrease ')+gbp(Math.abs(d*(1+vr))):''),orderUrl(oid)); toast('Amendment approved'); setTimeout(()=>{ location.href=orderUrl(oid); },800); };
        el.querySelector('[data-amok]').onclick=()=>{ if(!dc.length) return approve(); proofGate(a,dc,approve); };
        el.querySelector('[data-amq]').onclick=()=>{ const t=prompt('What would you like to query about this amendment?'); if(!t) return; set(oid,li,Object.assign({},a,{status:'queried',query:t,queriedAt:new Date().toISOString()})); notify('distributor','Amendment queried: '+o.ref,line.name+' · “'+t+'”',orderUrl(oid),'proof_changes'); toast('Sent to Mojo Promotions'); setTimeout(()=>{ location.href=orderUrl(oid); },800); };
      } };
    draw();
    if(mode==='amend'){ clearInterval(window.__amTick); window.__amTick=setInterval(()=>{ if(!document.getElementById('pmAmendBar')){ clearInterval(window.__amTick); return; } const f=document.activeElement; if(f&&f.closest&&f.closest('#pmAmendBar')&&/INPUT|TEXTAREA/.test(f.tagName)) return; draw(); },1500); }
  }
  function proofGate(a,dc,ok){ const w=document.createElement('div'); w.className='am-pg';
    w.innerHTML=`<div class="am-pgb" role="dialog" aria-modal="true" aria-label="Approve the amended design"><h3>This amendment changes the design</h3><p class="am-pgc">${dc.map(esc).join(' · ')}. Please check the new proof before approving.</p>
      <div class="am-pgw"><b>PLEASE READ, TO ENSURE YOU ARE 100% HAPPY WITH YOUR ORDER:</b><ul><li>This proof should only be used to check positioning and content; it cannot be used as an accurate match for colour.</li><li>Have you seen a sample? Please ensure what you are ordering is what you are expecting.</li><li>If a Pantone reference has been chosen by our studio on your behalf, we cannot accept responsibility if you are unhappy with the final print colour.</li><li>When printing in full colour, Pantone references cannot be guaranteed.</li></ul></div>
      <label class="am-pgk"><input type="checkbox" data-pgk> I have checked the new proof and approve it, and the amendment.</label>
      <div class="am-pgf"><button class="am-pgx" data-pgx>Cancel</button><button class="am-pgo" data-pgo disabled>Approve amendment</button></div></div>`;
    document.body.appendChild(w); const k=w.querySelector('[data-pgk]'), o=w.querySelector('[data-pgo]'); k.onchange=()=>{ o.disabled=!k.checked; };
    const close=()=>w.remove(); w.querySelector('[data-pgx]').onclick=close; w.addEventListener('mousedown',e=>{ if(e.target===w) close(); }); o.onclick=()=>{ close(); ok(); }; }
  function toast(m){ if(window.MStoast) return MStoast(m); let t=document.getElementById('amToast'); if(!t){ t=document.createElement('div'); t.id='amToast'; t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#101828;color:#fff;padding:10px 16px;border-radius:10px;font:600 13.5px/1.3 var(--sans,system-ui);z-index:3000'; document.body.appendChild(t); } t.textContent=m; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2600); }
  if(/Project/i.test(decodeURIComponent(location.pathname))){ const go=()=>setTimeout(bar,600); addEventListener('hashchange',go); document.readyState==='loading'?document.addEventListener('DOMContentLoaded',go):go(); }
  const css=document.createElement('style'); css.textContent=`
  .pm-amendbar{position:absolute;left:0;right:0;bottom:0;z-index:60;display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr) auto;align-items:center;gap:10px 18px;background:#fff;border-top:2px solid var(--periwinkle-deep,#4E5BA6);box-shadow:0 -8px 24px rgba(16,24,40,.12);padding:12px 20px;font-family:var(--sans,system-ui);}
  @media(max-width:1100px){.pm-amendbar{grid-template-columns:minmax(0,auto) minmax(0,1fr);} .pm-amendbar .am-r{grid-column:1/-1;}}
  .pm-amendbar .am-l{display:flex;flex-direction:column;gap:2px;min-width:0;} .am-tag{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--periwinkle-deep,#4E5BA6);} .pm-amendbar .am-l b{font-size:14.5px;color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .am-st{font-size:12.5px;color:#667085;}
  .pm-amendbar .am-m{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;min-width:0;}
  .am-chg{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;background:#f2f4f7;border-radius:8px;padding:4px 9px;white-space:nowrap;} .am-chg em{font-style:normal;color:#667085;font-weight:600;} .am-chg s{color:#98a2b3;} .am-chg b{color:#101828;}
  .am-diff{font-size:12.5px;font-weight:700;border-radius:999px;padding:4px 11px;background:#f2f4f7;color:#475467;white-space:nowrap;} .am-diff.up{background:#fef0c7;color:#93370d;} .am-diff.down{background:#dcfae6;color:#067647;}
  .am-none{font-size:12.5px;color:#98a2b3;} .am-q{font-size:12.5px;color:#b42318;font-weight:600;}
  .pm-amendbar .am-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;} .pm-amendbar .am-r a{text-decoration:none;}
  #pmAmendBar .am-btn{display:inline-flex!important;align-items:center;justify-content:center;font:inherit!important;font-size:13px!important;font-weight:600!important;white-space:nowrap;border:1px solid #d0d5dd!important;background:#fff!important;color:#344054!important;border-radius:9px!important;padding:8px 14px!important;cursor:pointer;text-decoration:none!important;box-shadow:0 1px 2px rgba(16,24,40,.05)!important;min-height:0!important;height:auto!important;} #pmAmendBar .am-btn:hover{background:#f9fafb!important;} #pmAmendBar .am-btn.pri{background:var(--periwinkle-deep,#4E5BA6)!important;border-color:var(--periwinkle-deep,#4E5BA6)!important;color:#fff!important;} .am-btn.pri:hover{filter:brightness(1.06);}
  html:has(#pmAmendBar) #pmodal .pm-body{padding-bottom:calc(var(--am-h,80px) + 16px);} 
  .am-dchg{background:#eceef9!important;} .am-dchg em{color:var(--periwinkle-deep,#4E5BA6)!important;}
  .am-gbtn{font:inherit;font-size:12.5px;font-weight:600;color:var(--periwinkle-deep,#4E5BA6);background:none;border:1px dashed var(--periwinkle-deep,#4E5BA6);border-radius:8px;padding:4px 10px;cursor:pointer;white-space:nowrap;}
  .am-grid{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;background:#f9fafb;border:1px solid #eaecf0;border-radius:10px;padding:8px 12px;}
  .am-glbl{display:flex;flex-direction:column;gap:1px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#667085;margin-right:6px;white-space:nowrap;} .am-glbl em{font-style:normal;text-transform:none;letter-spacing:0;font-size:12.5px;font-weight:600;color:#101828;}
  .am-gc{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #eaecf0;border-radius:8px;padding:3px 4px 3px 8px;font-size:12.5px;color:#344054;} .am-gc i{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.15);}
  .am-gc input{width:64px;font:inherit;font-size:13px;border:1px solid #d0d5dd;border-radius:6px;padding:4px 6px;text-align:right;} .am-gc input:focus{outline:0;border-color:var(--periwinkle-deep,#4E5BA6);box-shadow:0 0 0 3px #eceef9;}
  .am-gtot{margin-left:auto;display:inline-flex;align-items:baseline;gap:5px;white-space:nowrap;font-size:12.5px;color:#475467;} .am-gtot b{color:#101828;}
  .am-pg{position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:3000;display:grid;place-items:center;padding:16px;} .am-pgb{background:#fff;border-radius:16px;width:min(560px,100%);max-height:90vh;overflow:auto;padding:20px 22px;box-shadow:0 24px 60px rgba(16,24,40,.3);display:flex;flex-direction:column;gap:12px;font-family:var(--sans,system-ui);}
  .am-pgb h3{margin:0;font-size:18px;font-weight:600;color:#101828;} .am-pgc{margin:0;font-size:13.5px;color:#475467;} .am-pgw{background:#fffaeb;border:1px solid #fedf89;border-radius:10px;padding:10px 12px;font-size:13px;color:#7a2e0e;} .am-pgw ul{margin:6px 0 0;padding-left:18px;line-height:1.5;}
  .am-pgk{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:#344054;} .am-pgk input{margin-top:2px;accent-color:var(--periwinkle-deep,#4E5BA6);}
  .am-pgf{display:flex;justify-content:flex-end;gap:8px;} .am-pgx,.am-pgo{font:inherit;font-size:13px;font-weight:600;border-radius:9px;padding:8px 14px;cursor:pointer;} .am-pgx{background:#fff;border:1px solid #d0d5dd;color:#344054;} .am-pgo{background:var(--periwinkle-deep,#4E5BA6);border:1px solid var(--periwinkle-deep,#4E5BA6);color:#fff;} .am-pgo:disabled{opacity:.45;cursor:not-allowed;}
  .am-note{font:inherit;font-size:13px;border:1px solid #d0d5dd;border-radius:8px;padding:8px 10px;min-width:240px;} .am-note.err{border-color:#f04438;box-shadow:0 0 0 3px #fee4e2;}
  `; document.head.appendChild(css);
  return {all,get,set,forOrder,url,orderUrl,gbp};
})();

;(function(){ /* pop-out bottom padding follows the amendment bar's real height (grid open or closed) */ const set=()=>{ const b=document.getElementById('pmAmendBar'); document.documentElement.style.setProperty('--am-h',(b?b.offsetHeight:0)+'px'); };
  const ro=new ResizeObserver(set); let seen=null; setInterval(()=>{ const b=document.getElementById('pmAmendBar'); if(b!==seen){ if(seen) ro.unobserve(seen); seen=b; if(b) ro.observe(b); set(); } },500); })();
