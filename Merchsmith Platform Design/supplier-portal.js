/* ============================================================
   supplier-portal.js — the supplier's own area inside the app
   shell. Sections are hash-driven so the left rail can deep-link:
     #tab=products  (default) · #tab=approvals · #tab=history
     #tab=billing   → Finance
   Reads the shared catalogue (window.MSCAT) and writes approvals
   back through it, so platform admin sees the same record.
   The products table deliberately mirrors the admin product
   database (statbar → toolbar → .prodtbl) so the two read alike.
   ============================================================ */
(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp0=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return;
    el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2600); }; })();
  const fmtD=iso=>{ if(!iso) return '—'; const d=new Date(iso); return isNaN(d)?'—':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); };
  const fmtS=iso=>{ const d=new Date(iso); return isNaN(d)?'—':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); };

  // Which supplier is signed in. The demo identity (BagWorks UK) carries only a handful of
  // sample products, so when it is that thin we sign in as the largest real feed supplier
  // instead — otherwise the portal shows a design nobody can judge.
  function me(){
    const subs=MSCAT.suppliers();
    const pref=(window.MSID&&MSID.SUPPLIER&&MSID.SUPPLIER.name)||'BagWorks UK';
    const hit=subs.find(s=>s.name===pref);
    if(hit&&hit.count>=10) return hit.name;
    return (subs.slice().sort((a,b)=>b.count-a.count)[0]||{name:pref}).name;
  }
  let SUP='';
  const mine=()=>MSCAT.all().filter(p=>p.supplier===SUP);
  const myLog=()=>MSCAT.curLog().filter(e=>e.supplier===SUP);

  const KEY='ms-sup-mandate';
  const mandate=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } };
  const saveMandate=m=>{ try{ localStorage.setItem(KEY,JSON.stringify(m)); }catch(e){} };

  /* ---------- hash routing (the rail deep-links into these) ---------- */
  const TITLES={products:'Your products',approvals:'Placement approvals',history:'Placement history',billing:'Placement billing',profile:'Organisation profile'};
  function route(){
    const h=location.hash.replace(/^#/,''), q={};
    h.split('&').forEach(kv=>{ const [k,v]=kv.split('='); if(k) q[k]=decodeURIComponent(v||''); });
    return {tab:TITLES[q.tab]?q.tab:'products', f:q.f||''};
  }
  let filt='';

  const badge=p=>{
    const c=p.curation;
    if(!c) return '<span class="badge b-none">Not in range</span>';
    if(c.approval==='pending') return '<span class="badge b-pend">Awaiting you</span>';
    if(c.approval==='declined') return '<span class="badge b-dec">Declined</span>';
    return c.tier==='featured' ? '<span class="badge b-feat">Featured</span>'
                               : '<span class="badge b-rec">Recommended</span>';
  };
  const thumb=(p,cls)=>p.image
    ? `<span class="${cls}"><img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.textContent='${esc(p.name.slice(0,1))}'"></span>`
    : `<span class="${cls}">${esc(p.name.slice(0,1))}</span>`;

  const NOTICE=`<div class="notice"><svg><use href="#s-warn"/></svg>
    <p><b>Placement is free — nothing is being charged.</b> Recommended and Featured placement costs you nothing during MVP. The fees shown throughout are a <b>Phase 2</b> model, displayed so you can see exactly how billing will work when it is switched on. You will be told well before any first collection.</p></div>`;

  /* ---------- products ---------- */
  let q='';
  function productsHTML(){
    const all=mine();
    const live=all.filter(p=>p.curation&&p.curation.approval==='approved');
    const feat=live.filter(p=>p.curation.tier==='featured');
    const pend=all.filter(p=>p.curation&&p.curation.approval==='pending');
    const monthly=live.reduce((s,p)=>s+MSCAT.feeFor(p),0);
    const F={'':()=>true,
      rec:p=>p.curation&&p.curation.approval==='approved'&&p.curation.tier!=='featured',
      feat:p=>p.curation&&p.curation.approval==='approved'&&p.curation.tier==='featured',
      pend:p=>p.curation&&p.curation.approval==='pending',
      out:p=>!p.curated};
    let rows=all.filter(F[filt]||F['']);
    if(q){ const s=q.toLowerCase(); rows=rows.filter(p=>p.name.toLowerCase().includes(s)||String(p.code||'').toLowerCase().includes(s)); }
    // Raw catalogue order buries everything a supplier cares about: on a 2,647-product
    // feed the placed and imaged records can all sit past index 2000, so a hard slice
    // shows 300 unplaced, image-less rows. Rank before slicing — Featured, then
    // Recommended, then anything with a photo, then alphabetical.
    const rank=p=>{ const c=p.curation;
      if(c&&c.approval==='approved') return c.tier==='featured'?0:1;
      if(c&&c.approval==='pending') return 2;
      return p.image?3:4; };
    rows=rows.slice().sort((a,b)=>(rank(a)-rank(b))||((b.image?1:0)-(a.image?1:0))||a.name.localeCompare(b.name));
    const shown=rows.slice(0,300);
    const CH=[['','All',all.length],['rec','Recommended',live.length-feat.length],['feat','Featured',feat.length],
      ['pend','Awaiting you',pend.length],['out','Not in range',all.filter(p=>!p.curated).length]];
    return `${NOTICE}
    <div class="statbar">
      <div class="sb"><b>${all.length.toLocaleString()}</b><span>Products ingested</span></div>
      <div class="sb"><b>${live.length.toLocaleString()}</b><span>In the range</span></div>
      <div class="sb"><b>${feat.length.toLocaleString()}</b><span>Featured</span></div>
      <div class="sb"><b>${gbp0(monthly)}</b><span>Projected fee / mo · Phase 2</span></div>
    </div>
    <div class="toolbar">
      <div class="search"><svg class="icn"><use href="#s-search"/></svg><input id="supQ" placeholder="Search your products by name or code…" value="${esc(q)}"></div>
      <div class="fbtns">${CH.map(([k,l,n])=>`<button class="fbtn ${filt===k?'on':''}" data-f="${k}">${l} · ${n.toLocaleString()}</button>`).join('')}</div>
    </div>
    <div class="prodtbl-wrap"><table class="prodtbl">
      <thead><tr><th>Product</th><th>Code</th><th>Department</th><th>Placement</th><th class="num">Fee / mo</th><th>Live since</th><th class="num">Months billed</th></tr></thead>
      <tbody>${shown.length?shown.map(p=>{
        const c=p.curation, livep=c&&c.approval==='approved';
        return `<tr>
        <td><span class="orgcell">${thumb(p,'prodthumb')}<span><span class="pname">${esc(p.name)}</span><span class="pmeta">${esc(p.brand||p.supplier)}</span></span></span></td>
        <td class="mono">${esc(p.code||'—')}</td>
        <td>${esc(p.dept||'—')}</td>
        <td>${badge(p)}</td>
        <td class="num">${livep?`<b>${gbp0(MSCAT.feeFor(p))}</b>`:'—'}</td>
        <td>${livep?fmtD(c.addedAt):'—'}</td>
        <td class="num">${livep?MSCAT.monthsBilled(p):'—'}</td>
      </tr>`; }).join('')
      :`<tr><td colspan="7"><div class="empty">Nothing matches that filter.</div></td></tr>`}</tbody>
    </table></div>
    ${rows.length>300?`<p class="tblfoot">Showing the first 300 of ${rows.length.toLocaleString()}.</p>`:''}`;
  }

  /* ---------- approvals ---------- */
  function approvalsHTML(){
    const pend=mine().filter(p=>p.curation&&p.curation.approval==='pending');
    const r=MSCAT.curRates();
    if(!pend.length) return `${NOTICE}<div class="card" style="margin-top:18px"><h2>Nothing waiting on you</h2>
      <div class="empty">No placements awaiting approval.</div></div>`;
    return `${NOTICE}<div class="card" style="margin-top:18px">
      <h2>${pend.length} placement${pend.length===1?'':'s'} awaiting your approval</h2>
      <p class="ch">Each of these has passed assessment. Accepting adds it to the Recommended range every distributor trades from. <b>Placement is free during MVP</b> — the fee shown is the Phase 2 rate, given for transparency; nothing is charged today. When billing is switched on it runs in whole months, and withdrawing a product costs one further whole month. Declining changes nothing else in your account.</p>
      <div class="appr">${pend.map(p=>{
        const t=p.curation.tier, fee=t==='featured'?r.featured:r.standard;
        return `<div class="apprrow">
          ${thumb(p,'apprthumb')}
          <div class="apprmain">
            <b>${esc(p.name)}</b>
            <span class="meta">${esc(p.code||'')}${p.code?' · ':''}${esc(p.dept||'')} · proposed ${fmtD(p.curation.requestedAt)}</span>
            <div class="apprterms">
              <span class="pill ${t==='featured'?'feat':''}">${t==='featured'?'Featured placement':'Recommended placement'}</span>
              <span class="pill fee">${gbp0(fee)} / month <em style="font-style:normal;opacity:.75">from Phase 2</em></span>
              <span class="pill">Free during MVP</span>
              <span class="pill">Whole months only</span>
              <span class="pill">Withdrawal costs one further month</span>
            </div>
          </div>
          <div class="apprbtns">
            <button class="btn2 go" data-appr="${p.id}">Accept placement</button>
            <button class="btn2 gh" data-decl="${p.id}">Decline</button>
          </div>
        </div>`; }).join('')}</div>
    </div>`;
  }

  /* ---------- history ---------- */
  function historyHTML(){
    const log=myLog().slice(0,80);
    const ACT={proposed:['','proposed for'],approved:['ok','went live in'],declined:['rm','declined for'],
      tier:['','moved tier in'],removed:['rm','withdrawn from']};
    return `<div class="card">
      <h2>Placement history</h2>
      ${log.length?`<div class="tl">${log.map(e=>{
        const a=ACT[e.act]||['',e.act]; const tierL=e.tier==='featured'?'Featured':'Recommended';
        const bill=e.act==='removed'&&e.billedTo&&new Date(e.billedTo)>new Date();
        return `<div class="tlrow">
          <div class="tldate">${fmtD(e.at)}</div>
          <div class="tlmark ${a[0]}"><i></i></div>
          <div class="tltx"><b>${esc(e.name)}</b> ${a[1]} the ${tierL} range${bill?`<span class="tlmin">Final whole month billed to ${fmtS(e.billedTo)}</span>`:''}</div>
        </div>`; }).join('')}</div>`
      :`<div class="empty">No placement changes recorded yet.</div>`}
    </div>`;
  }

  /* ---------- billing (Finance) ---------- */
  function billingHTML(){
    const live=mine().filter(p=>p.curation&&p.curation.approval==='approved');
    const feat=live.filter(p=>p.curation.tier==='featured');
    const r=MSCAT.curRates();
    const stdTot=live.filter(p=>p.curation.tier!=='featured').reduce((s,p)=>s+MSCAT.feeFor(p),0);
    const featTot=feat.reduce((s,p)=>s+MSCAT.feeFor(p),0);
    const closing=myLog().filter(e=>e.act==='removed'&&e.billedTo&&new Date(e.billedTo)>new Date());
    const closeTot=closing.reduce((s,e)=>s+(+r[e.tier]||0),0);
    const m=mandate();
    const next=(()=>{ const d=new Date(); d.setMonth(d.getMonth()+1,1); return d; })();
    return `${NOTICE}
    <div class="bill" style="margin-top:18px">
      <div class="card">
        <h2>Monthly invoice</h2>
        <p class="ch"><b>Nothing is being charged today.</b> This is the invoice you would receive once Phase 2 billing is switched on. It is <b>charged in whole months</b>: a part month is billed in full, and withdrawing a product costs one further whole month.</p>
        <div class="kv">
          <span class="k">Recommended placements</span><span class="v">${live.length-feat.length} product${live.length-feat.length===1?'':'s'} · ${gbp0(stdTot)}</span>
          <span class="k">Featured placements</span><span class="v">${feat.length} product${feat.length===1?'':'s'} · ${gbp0(featTot)}</span>
          ${closing.length?`<span class="k">Withdrawn · final whole month</span><span class="v">${closing.length} · ${gbp0(closeTot)}</span>`:''}
        </div>
        <div class="invtot"><span class="lbl">Projected · not charged</span><b>${gbp0(stdTot+featTot+closeTot)}</b></div>
        <p class="ch" style="margin:14px 0 0">If billing were live, the next collection would be <b>${next.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</b>.</p>
      </div>
      <div class="card">
        <h2>Direct Debit mandate</h2>
        <div class="mandate ${m?'set':''}">
          <div class="mrow">
            <span class="st"><svg class="icn"><use href="#${m?'s-check':'s-card'}"/></svg></span>
            <div><b>${m?'Mandate active':'No mandate set up'}</b>
            <span>${m?`${esc(m.bank)} ending ${esc(m.last4)} · set up ${fmtD(m.at)}`:'Required before the first collection'}</span></div>
          </div>
          ${m?`<div class="kv">
              <span class="k">Account name</span><span class="v">${esc(m.name)}</span>
              <span class="k">Reference</span><span class="v">${esc(m.ref)}</span>
              <span class="k">Collection day</span><span class="v">1st of the month</span>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn2 gh" id="mdChange">Replace mandate</button>
              <button class="btn2 gh" id="mdCancel">Cancel mandate</button>
            </div>`
          :`<button class="btn2 go" id="mdSet" style="width:100%;margin-top:4px">Set up Direct Debit with Stripe</button>`}
          <span class="stripe"><svg class="icn" style="width:14px;height:14px"><use href="#s-lock"/></svg>Handled by Stripe · Merchsmith never sees your bank details</span>
        </div>
      </div>
    </div>`;
  }

  /* ---------- render ---------- */
  function render(){
    const {tab,f}=route();
    if(f&&f!==filt) filt=f;
    const root=document.getElementById('supRoot'); if(!root) return;
    const pend=mine().filter(p=>p.curation&&p.curation.approval==='pending').length;
    const SUBS={products:'Every product we have ingested from your feed, and where each one stands in the Recommended range.',
      approvals:'Placements Merchsmith has proposed, with the tier, charge and terms attached to each.',
      history:'A dated record of every placement change affecting your products.',
      billing:'What you would be charged each month once Phase 2 billing starts, and the Direct Debit mandate it would be collected against. Nothing is charged today.'};
    root.innerHTML=`<div class="phead"><div>
        <h1 class="ptitle">${TITLES[tab]}</h1>
        <p class="psub"><a href="Merchsmith Recommended Standard.html">How products are chosen →</a></p>
      </div></div>
      ${tab==='profile'?'<div id="orgProfileMount"></div>':tab==='products'?productsHTML():tab==='approvals'?approvalsHTML():tab==='history'?historyHTML():billingHTML()}`;
    if(tab==='profile'&&window.MSORG){ const el=document.getElementById('orgProfileMount'); el.innerHTML=MSORG.panelHTML('supplier')+(window.MSSPLIT?(()=>{ const sn=(MSORG.name&&MSORG.name('supplier'))||'Lumen Goods', R=MSSPLIT.rate(sn); return `<section class="sp-carr"><div><h3>Carriage &amp; delivery limits</h3><p>Used when a distributor splits one product across several addresses. First delivery £${(+R.first).toFixed(2)} · each extra £${(+R.extra).toFixed(2)} · minimum ${R.minPerDrop} per delivery · up to ${R.maxDrops} addresses.</p></div><button type="button" class="btn ghost" data-spcarr="${sn.replace(/"/g,'&quot;')}">Edit</button></section>`; })():'')+(window.MSTWO?(()=>{ const sn=(MSORG.name&&MSORG.name('supplier'))||'Lumen Goods', cf=MSTWO.decorCfg(sn), gi=MSTWO.goodsIn(sn); return `<section class="sp-carr"><div><h3>Decorating &amp; goods in</h3><p>${cf.accepts===false?'You don’t accept blank stock from other suppliers.':'You accept blank stock from other suppliers to decorate.'} Goods in: ${gi.slice(0,3).join(', ')} · overs ${cf.overs??3}% · decorating lead ${cf.brandLead??5} days.</p></div><button type="button" class="btn ghost" data-spdecor="${sn.replace(/"/g,'&quot;')}">Edit</button></section>`; })():'');
      const db=el.querySelector('[data-spdecor]'); if(db) db.onclick=()=>MSTWO.decorEditor(db.dataset.spdecor,()=>render()); const cb=el.querySelector('[data-spcarr]'); if(cb) cb.onclick=()=>MSSPLIT.openEditor(cb.dataset.spcarr,{onSave:()=>render()}); MSORG.wire(el,'supplier'); }
    const ch=document.getElementById('crumbHere'); if(ch) ch.textContent=TITLES[tab];
    const cs=document.getElementById('crumbSup'); if(cs) cs.textContent=SUP;
    document.title='Merchsmith — '+TITLES[tab];

    const wrapEl=root.querySelector('.prodtbl-wrap'), theadEl=root.querySelector('.prodtbl thead');
    if(wrapEl&&theadEl) wrapEl.onscroll=()=>{ theadEl.style.transform='translateY('+wrapEl.scrollTop+'px)'; };
    root.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ filt=b.dataset.f; render(); });
    const qi=root.querySelector('#supQ');
    if(qi) qi.oninput=()=>{ q=qi.value; const p=qi.selectionStart; render();
      const n=document.getElementById('supQ'); if(n){ n.focus(); n.setSelectionRange(p,p); } };
    root.querySelectorAll('[data-appr]').forEach(b=>b.onclick=()=>{
      const p=MSCAT.get(b.dataset.appr); MSCAT.approveCurated(b.dataset.appr,SUP);
      toast(`“${p?p.name:'Product'}” is live in the Recommended range`); render(); });
    root.querySelectorAll('[data-decl]').forEach(b=>b.onclick=()=>{
      const p=MSCAT.get(b.dataset.decl);
      if(!confirm(`Decline the placement for “${p?p.name:'this product'}”?\n\nIt stays in the Merchsmith catalogue and nothing is charged. Merchsmith may propose it again later.`)) return;
      MSCAT.declineCurated(b.dataset.decl,'Declined by supplier'); toast('Placement declined'); render(); });

    const set=root.querySelector('#mdSet')||root.querySelector('#mdChange');
    if(set) set.onclick=()=>{                       // stand-in for Stripe's hosted mandate flow
      const name=prompt('Account holder name:', (mandate()||{}).name||SUP); if(name===null) return;
      const last4=prompt('Last 4 digits of the account number:', (mandate()||{}).last4||''); if(last4===null) return;
      saveMandate({name:name.trim()||SUP, bank:'Barclays', last4:String(last4).replace(/\D/g,'').slice(-4)||'0000',
        ref:'MS-DD-'+String(Math.abs([...SUP].reduce((h,c)=>h*31+c.charCodeAt(0),7))%900000+100000), at:new Date().toISOString()});
      toast('Direct Debit mandate set up'); render(); };
    const can=root.querySelector('#mdCancel');
    if(can) can.onclick=()=>{ if(!confirm('Cancel the Direct Debit mandate?\n\nYou will need to set one up again before charging begins.')) return;
      try{ localStorage.removeItem(KEY); }catch(e){} toast('Mandate cancelled'); render(); };

    if(pend&&tab!=='approvals'){ /* the rail carries the count; nothing else to do here */ }
  }

  function boot(){
    if(!window.MSCAT||!MSCAT.all().length){ setTimeout(boot,120); return; }
    SUP=me();
    // sign the shell in as the supplier being shown, so the header lockup, breadcrumb and
    // page content cannot disagree (session-only — other pages keep the demo default)
    if(window.MSID&&MSID.setSupplier) MSID.setSupplier(SUP);
    render();
    window.addEventListener('hashchange',render);
    (function(){ let k=(location.hash.split('&')[0]||''); window.addEventListener('hashchange',()=>{
    const n=(location.hash.split('&')[0]||''); if(n!==k){ k=n; window.scrollTo(0,0); } }); })();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
