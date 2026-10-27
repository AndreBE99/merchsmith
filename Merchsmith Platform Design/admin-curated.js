/* ============================================================
   admin-curated.js — Merchsmith Recommended range management +
   supplier invoicing. Reads the shared catalogue (MSCAT).
   Renders into #panel-curated.
   PHASE 2 / DORMANT: the fee model below is fully built but NOT charging.
   For MVP, Recommended and Featured are a free curation flag Merchsmith sets
   to influence store visibility — no supplier is invoiced. Every money figure
   here is a PROJECTION of what would bill once Phase 2 is switched on.
   The Change log is unaffected: curation history is real either way.
   ============================================================ */
(function(){
  if(!window.MSCAT) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const gbp0=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();
  // One fee per product per month. The rate comes from the tier (global, editable below);
  // a product may override its own fee, which then ignores the rate.
  const TIERLBL={standard:'Recommended',featured:'Featured'};
  const TIERS=()=>{ const r=MSCAT.curRates(); return [['standard','Recommended',r.standard],['featured','Featured',r.featured]]; };

  let view='invoicing'; // 'invoicing' (commercial overview, default) | 'range' | 'log'

  function bySupplier(){ const m={}; MSCAT.curated().forEach(p=>{ (m[p.supplier]=m[p.supplier]||[]).push(p); }); return m; }
  function supplierTotals(list){ let std=0,feat=0; list.forEach(p=>{ const f=MSCAT.feeFor(p);
    if(p.curation.tier==='featured') feat+=f; else std+=f; }); return {list:std,promo:feat,total:std+feat}; }

  // Shown on Commercial overview and Tier management, not on the Change log —
  // curation history is live regardless of whether money is changing hands.
  const PHASE2=`<div class="p2band">
    <span class="p2tag">Phase 2</span>
    <p><b>Billing is not live.</b> Recommended and Featured placement is <b>free during MVP</b> — a curation flag Merchsmith sets to influence store visibility. No supplier is invoiced. The fees, tiers and per-product overrides below are built and ready; every £ figure is a <b>projection</b> of what would bill once Phase 2 is switched on.</p>
  </div>`;

  function render(){
    const p=document.getElementById('panel-curated'); if(!p) return;
    const cur=MSCAT.curated(); const rev=MSCAT.curatedRevenue(); const sup=bySupplier();
    const promoted=cur.filter(x=>x.promoted).length;
    const pending=(MSCAT.pendingCurated?MSCAT.pendingCurated():[]).length;
    p.innerHTML=`
      <div class="phead"><h1 class="ptitle">Merchsmith Recommended range</h1><div class="cur-tabs"><button class="cur-tab ${view==='invoicing'?'on':''}" data-cv="invoicing">Commercial overview</button><button class="cur-tab ${view==='range'?'on':''}" data-cv="range">Tier management</button><button class="cur-tab ${view==='log'?'on':''}" data-cv="log">Change log</button></div></div>
      <div class="statbar">
        <div class="sb"><b>${cur.length}</b><span>Products in range</span></div>
        <div class="sb"><b>${promoted}</b><span>Featured</span></div>
        <div class="sb ${pending?'cur-pend':''}"><b>${pending}</b><span>Awaiting supplier</span></div>
        <div class="sb"><b>${Object.keys(sup).length}</b><span>Suppliers in range</span></div>
        <div class="sb proj"><b>${gbp0(rev.standard)}</b><span>Recommended / mo <i>projected</i></span></div>
        <div class="sb proj"><b>${gbp0(rev.featured)}</b><span>Featured / mo <i>projected</i></span></div>
        <div class="sb cur-rev proj"><b>${gbp0(rev.total)}</b><span>Total / mo <i>projected</i></span></div>
      </div>
      ${view==='log'?'':PHASE2}
      <div id="curView"></div>`;
    p.querySelectorAll('.cur-tab').forEach(b=>b.onclick=()=>{ view=b.dataset.cv; render(); });
    const gd=p.querySelector('#curGoDb'); if(gd)gd.onclick=e=>{ e.preventDefault(); const n=document.querySelector('.anav[data-nav="products"]'); if(n)n.click(); };
    renderView();
    const nav=document.getElementById('navCur'); if(nav) nav.textContent=cur.length;
  }

  function renderView(){
    const host=document.getElementById('curView'); if(!host) return;
    host.innerHTML = view==='invoicing' ? invoicingHTML() : view==='log' ? logHTML() : rangeHTML();
    if(view==='log'){ return; }
    if(view==='invoicing'){ host.querySelectorAll('[data-invsup]').forEach(b=>b.onclick=()=>openInvoice(b.dataset.invsup)); }
    else {
      host.querySelectorAll('[data-rate]').forEach(inp=>inp.onchange=()=>{
        const v=Math.max(0,Math.round(+inp.value||0));
        MSCAT.setCurRates({[inp.dataset.rate]:v});
        toast(TIERLBL[inp.dataset.rate]+' set to '+gbp0(v)+'/mo'); render(); });
      const co=host.querySelector('#curClearOv'); if(co)co.onclick=()=>{
        MSCAT.curated().forEach(p=>{ if(p.curation.fee!=null){ const m=Object.assign({},p.curation); delete m.fee; MSCAT.setCurated(p.id,m,true); } });
        toast('Overrides cleared — all products back on the tier rate'); render(); };
      host.querySelectorAll('[data-curfeerst]').forEach(b=>b.onclick=()=>{
        const p=MSCAT.get(b.dataset.curfeerst); if(!p) return;
        const m=Object.assign({},p.curation); delete m.fee; MSCAT.setCurated(p.id,m,true);
        toast('Back on the tier rate'); render(); });
      host.querySelectorAll('[data-curfee]').forEach(inp=>inp.onchange=()=>{
        const p=MSCAT.get(inp.dataset.curfee); if(!p||!p.curation) return;
        const v=Math.max(0,Math.round(+inp.value||0));
        const rate=MSCAT.curRates()[p.curation.tier||'standard'];
        const m=Object.assign({},p.curation);
        if(v===rate) delete m.fee; else m.fee=v;              // matching the rate = no override
        MSCAT.setCurated(p.id,m,true);
        toast(v===rate?'Back on the tier rate':'Fee overridden for this product'); render(); });
      host.querySelectorAll('[data-curtier]').forEach(sel=>sel.onchange=()=>{ MSCAT.setCurated(sel.dataset.curtier,{tier:sel.value}); render(); });
      host.querySelectorAll('[data-curremove]').forEach(b=>b.onclick=()=>{ const p=MSCAT.get(b.dataset.curremove); MSCAT.removeCurated(b.dataset.curremove); toast(`“${p?p.name:'Product'}” removed from the recommended range`); render(); });
      const add=host.querySelector('#curAddBtn'); if(add)add.onclick=()=>{ const n=document.querySelector('.anav[data-nav="products"]'); if(n)n.click(); };
    }
  }

  function rangeHTML(){
    const cur=MSCAT.curated().slice().sort((a,b)=>{ const r={featured:0,standard:1}; return ((r[a.curation.tier]||0)-(r[b.curation.tier]||0))||a.name.localeCompare(b.name); });
    if(!cur.length) return `<div class="cur-empty">No products in the recommended range yet. <button class="btn sm" id="curAddBtn">Manage in product database →</button></div>`;
    const rates=MSCAT.curRates(), ov=cur.filter(p=>p.curation.fee!=null).length;
    return `<div class="cur-rates">
      <div class="cur-ratehd"><b>Monthly fee per product</b><span>Phase 2 rates — configured now, charged later. Applies to every product on that tier; override an individual product below.</span></div>
      <label class="cur-rate"><span>Recommended</span><i>£</i><input type="number" min="0" step="1" value="${rates.standard}" data-rate="standard"><em>/mo</em></label>
      <label class="cur-rate"><span>Featured</span><i>£</i><input type="number" min="0" step="1" value="${rates.featured}" data-rate="featured"><em>/mo</em></label>
      ${ov?`<button class="cur-clearov" id="curClearOv">Clear ${ov} override${ov===1?'':'s'}</button>`:'<span class="cur-noov">No per-product overrides</span>'}
    </div>
    <div class="cur-rangehd"><h3>${cur.length} products · set each product's placement tier · Featured sorts first</h3><button class="btn ghost sm" id="curAddBtn">Manage range in product database →</button></div>
      <div class="cur-grid">${cur.map(p=>`<div class="cur-card ${p.promoted?'promo':''}">
        ${p.promoted?`<span class="cur-promotag">${TIERLBL[p.curation.tier]}</span>`:''}
        <div class="cur-thumb">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" onerror="this.remove();this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div>
        ${p.curation.approval==='pending'?'<span class="cur-appr wait">Awaiting supplier</span>':(p.curation.approval==='declined'?'<span class="cur-appr no">Declined</span>':'')}
        <div class="cur-cnm">${esc(p.name)}</div>
        <div class="cur-cmeta">${esc(p.supplier)} · ${p.dept}</div>
        <div class="cur-crow"><b>${gbp(p.priceFrom)}</b><span class="cur-fee ${p.curation.fee!=null?'ovr':''}">${gbp0(MSCAT.feeFor(p))}/mo${p.curation.fee!=null?' ·&nbsp;override':''}</span></div>
        <div class="cur-fees">
          <label title="Monthly fee charged to the supplier for this product. Leave matching the tier rate, or set a different figure to override it."><span>Fee</span><i>£</i><input type="number" min="0" step="1" value="${MSCAT.feeFor(p)}" data-curfee="${p.id}"></label>
          ${p.curation.fee!=null?`<button class="cur-ovrm" data-curfeerst="${p.id}" title="Use the tier rate again">↺</button>`:''}
        </div>
        <div class="cur-since">${p.curation.addedAt?('Live since '+fmtD(p.curation.addedAt)):'Not live yet'}${MSCAT.minChargeActive&&MSCAT.minChargeActive(p)?` · <b class="cur-min">billing to ${fmtD(p.curation.billedTo)}</b>`:''}</div>
        <div class="cur-cact"><select class="cur-tiersel" data-curtier="${p.id}">${TIERS().map(([v,l])=>`<option value="${v}" ${p.curation.tier===v?'selected':''}>${l}</option>`).join('')}</select><button class="cur-rm" data-curremove="${p.id}" title="Remove">×</button></div>
      </div>`).join('')}</div>`;
  }

  function invoicingHTML(){
    const sup=bySupplier(); const names=Object.keys(sup).sort();
    if(!names.length) return `<div class="cur-empty">No suppliers in the recommended range yet.</div>`;
    const rows=names.map(n=>{ const t=supplierTotals(sup[n]); const promo=sup[n].filter(x=>x.promoted).length;
      return `<tr><td><b>${esc(n)}</b></td><td class="scell">${sup[n].length}</td><td class="scell">${promo||'—'}</td><td class="scell">${gbp0(t.list)}</td><td class="scell">${t.promo?gbp0(t.promo):'—'}</td><td class="scell"><b>${gbp0(t.total)}</b></td><td><button class="iconbtn" data-invsup="${esc(n)}"><svg class="icn"><use href="#a-eye"/></svg>Invoice</button></td></tr>`; }).join('');
    const tot=MSCAT.curatedRevenue();
    return `<div class="ovcard" style="margin-top:6px"><div class="ovcard-h"><h3>Projected monthly supplier billing</h3><span class="cur-period">Phase 2 · not charged · Jun 2026</span></div>
      <table class="dirtable bare"><thead><tr><th>Supplier</th><th>Listed</th><th>Promoted</th><th>Listing</th><th>Promotion</th><th>Total / mo</th><th></th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr class="cur-totrow"><td>All suppliers</td><td class="scell">${MSCAT.curated().length}</td><td class="scell">${MSCAT.curated().filter(x=>x.promoted).length}</td><td class="scell">${gbp0(tot.list)}</td><td class="scell">${gbp0(tot.promo)}</td><td class="scell"><b>${gbp0(tot.total)}</b></td><td></td></tr></tfoot></table></div>`;
  }

  const fmtD=iso=>{ if(!iso) return '—'; const d=new Date(iso); return isNaN(d)?'—':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); };
  const fmtS=iso=>{ const d=new Date(iso); return isNaN(d)?'—':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}); };
  function logHTML(){
    const log=(MSCAT.curLog?MSCAT.curLog():[]).slice(0,120);
    const ACT={proposed:['','proposed for'],approved:['ok','went live in'],declined:['no','declined for'],
      tier:['','moved tier in'],removed:['no','removed from']};
    if(!log.length) return '<div class="cur-empty">No placement changes recorded yet.</div>';
    return `    <div class="cur-log">${log.map(e=>{
      const A=ACT[e.act]||['',e.act]; const t=e.tier==='featured'?'Featured':'Recommended';
      const min=e.act==='removed'&&e.billedTo&&new Date(e.billedTo)>new Date();
      return `<div class="cur-logrow">
        <span class="cl-date">${fmtD(e.at)}</span>
        <span class="cl-dot ${A[0]}"></span>
        <span class="cl-tx"><b>${esc(e.name)}</b> ${A[1]} the ${t} range<span class="cl-sup">${esc(e.supplier||'')}</span></span>
        ${min?`<span class="cl-min">Final whole month to ${fmtS(e.billedTo)}</span>`:''}
      </div>`; }).join('')}</div>`;
  }

  function openInvoice(name){
    const items=(bySupplier()[name]||[]).slice().sort((a,b)=>MSCAT.feeFor(b)-MSCAT.feeFor(a));
    const t=supplierTotals(items);
    let pk=document.getElementById('invDrawer'); if(!pk){ pk=document.createElement('div'); pk.id='invDrawer'; pk.className='prod-scrim'; document.body.appendChild(pk); }
    pk.innerHTML=`<div class="prod-dr inv-dr"><div class="prod-drhd"><div><h2>${esc(name)}</h2><span>Projected invoice · Jun 2026 · not issued</span></div><button class="dwr-x" data-px>×</button></div>
      <div class="prod-drbody">
        <div class="inv-meta"><div><span>Invoice</span><b>MS-CR-${(name.charCodeAt(0)+name.length).toString().padStart(4,'0')}</b></div><div><span>Products listed</span><b>${items.length}</b></div><div><span>Due</span><b>1 Jul 2026</b></div></div>
        <table class="inv-tbl"><thead><tr><th>Product</th><th>Tier</th><th>Fee / mo</th></tr></thead><tbody>
          ${items.map(p=>`<tr><td>${esc(p.name)}</td><td><span class="curbadge ${p.promoted?'promo':''}">${TIERLBL[p.curation.tier]}</span></td><td><b>${gbp0(MSCAT.feeFor(p))}</b>${p.curation.fee!=null?' <span class="inv-ovr">override</span>':''}</td></tr>`).join('')}
        </tbody></table>
        <div class="inv-tot"><div class="inv-totrow"><span>Recommended placement</span><b>${gbp0(t.list)}</b></div><div class="inv-totrow"><span>Featured placement</span><b>${gbp0(t.promo)}</b></div><div class="inv-totrow grand"><span>Total due / month</span><b>${gbp0(t.total)}</b></div></div>
        <div class="inv-actions"><button class="btn sm" id="invSend">Send invoice</button><button class="btn ghost sm" data-px>Close</button></div>
      </div></div>`;
    requestAnimationFrame(()=>pk.classList.add('open'));
    const cx=()=>{ pk.classList.remove('open'); setTimeout(()=>pk.remove(),200); };
    pk.addEventListener('click',e=>{ if(e.target===pk||e.target.closest('[data-px]')) cx(); });
    const s=pk.querySelector('#invSend'); if(s)s.onclick=()=>{ toast(`Invoice sent to ${esc(name)}`); cx(); };
  }

  /* ---------- styles ---------- */
  (function(){ if(document.getElementById('cur-style'))return; const st=document.createElement('style'); st.id='cur-style';
    st.textContent=`
    .cur-tabs{display:flex;gap:4px;margin-left:auto;background:var(--paper-2);border-radius:11px;padding:3px;}
    .cur-tab{border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--ink-3);padding:8px 15px;border-radius:8px;cursor:pointer;}
    .cur-tab.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 4px rgba(20,22,45,.1);}
    .statbar .sb.cur-rev b{color:var(--periwinkle-deep);}
    /* projected (Phase 2) figures are visually held back from live counts */
    .statbar .sb.proj b{color:var(--ink-3);}
    .statbar .sb.proj.cur-rev b{color:var(--periwinkle-deep);}
    .statbar .sb.proj span i{font-style:normal;display:block;margin-top:2px;font-size:9.5px;letter-spacing:.06em;color:var(--periwinkle-deep);}
    .p2band{display:flex;align-items:flex-start;gap:13px;background:#fbeccd;border-radius:13px;padding:14px 18px;margin:0 0 16px;}
    .p2tag{flex:none;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:#9a6b1f;border-radius:999px;padding:4px 10px;margin-top:1px;}
    .p2band p{margin:0;font-size:13px;line-height:1.55;color:#6f4d13;}
    .p2band b{color:#4a3208;}
    .cur-rangehd{display:flex;align-items:center;justify-content:space-between;margin:18px 0 14px;}
    .cur-rangehd h3{font-size:15px;margin:0;}
    .cur-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;}
    .cur-card{position:relative;border:1px solid var(--line-soft);background:#fff;border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:6px;}
    .cur-card.promo{border-color:#e7c98f;box-shadow:0 0 0 1px #e7c98f, 0 8px 22px rgba(154,107,31,.12);}
    .cur-promotag{position:absolute;top:10px;right:10px;background:#fbeccd;color:#9a6b1f;font-size:10px;font-weight:800;border-radius:6px;padding:2px 7px;text-transform:uppercase;letter-spacing:.03em;}
    .cur-thumb{height:88px;border-radius:10px;background:var(--paper-2);display:grid;place-items:center;font-family:var(--serif);font-weight:600;font-size:30px;color:var(--ink-3);text-transform:uppercase;overflow:hidden;}
    .cur-thumb img{width:100%;height:100%;object-fit:contain;background:#fff;}
    .cur-cnm{font-size:13.5px;font-weight:700;color:var(--ink);line-height:1.25;}
    .cur-cmeta{font-size:11.5px;color:var(--muted);}
    .cur-crow{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    .cur-crow b{font-size:15px;}
    .cur-fee{font-size:10.5px;font-weight:700;color:var(--periwinkle-deep);text-align:right;}
    .cur-cact{display:flex;gap:7px;align-items:center;margin-top:2px;}
    .cur-rates{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#fff;border:1px solid var(--line-soft);border-radius:13px;padding:13px 16px;margin:0 0 12px;}
    .cur-ratehd{margin-right:auto;}
    .cur-ratehd b{display:block;font-size:13px;}
    .cur-ratehd span{font-size:11.5px;color:var(--muted);}
    .cur-rate{display:flex;align-items:center;gap:5px;border:1.5px solid var(--line-soft);border-radius:9px;padding:6px 10px;}
    .cur-rate span{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
    .cur-rate i,.cur-rate em{font-style:normal;font-size:12px;font-weight:700;color:var(--muted);}
    .cur-rate input{width:52px;font:inherit;font-size:13px;font-weight:800;border:0;background:none;text-align:right;color:var(--ink);}
    .cur-rate input:focus{outline:0;}
    .cur-rate:focus-within{border-color:var(--periwinkle);}
    .cur-clearov{font:inherit;font-size:12px;font-weight:700;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;text-decoration:underline;}
    .cur-noov{font-size:11.5px;color:var(--muted);font-weight:600;}
    .cur-fee.ovr{color:var(--flare);}
    .sb.cur-pend b{color:#9a6b1f;}
    .cur-appr{position:absolute;top:9px;left:9px;font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;padding:3px 9px;}
    .cur-appr.wait{background:#fbeccd;color:#9a6b1f;}
    .cur-appr.no{background:#fbdddd;color:#9a2c2c;}
    .cur-since{font-size:10.5px;color:var(--muted);font-weight:600;margin-top:4px;}
    .cur-min{color:#9a6b1f;font-weight:800;}
    .cur-log{background:#fff;border:1px solid var(--line-soft);border-radius:14px;padding:6px 20px;}
    .cur-logrow{display:grid;grid-template-columns:118px 12px 1fr auto;gap:13px;align-items:center;padding:11px 0;border-bottom:1px solid var(--paper-2);}
    .cur-logrow:last-child{border-bottom:0;}
    .cl-date{font-size:11.5px;font-weight:700;color:var(--muted);}
    .cl-dot{width:9px;height:9px;border-radius:50%;background:var(--periwinkle);}
    .cl-dot.ok{background:var(--spearmint,#36C0A0);}
    .cl-dot.no{background:var(--flare);}
    .cl-tx{font-size:13.5px;color:var(--ink-2);}
    .cl-tx b{color:var(--ink);}
    .cl-sup{display:block;font-size:11px;color:var(--muted);font-weight:600;}
    .cl-min{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#9a6b1f;background:#fbeccd;border-radius:999px;padding:3px 10px;white-space:nowrap;}
    .inv-ovr{font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--flare);}
    .cur-ovrm{width:26px;height:26px;flex:none;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:13px;line-height:1;color:var(--muted);cursor:pointer;}
    .cur-ovrm:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
    .cur-fees{display:flex;gap:6px;margin-top:2px;}
    .cur-fees label{flex:1;display:flex;align-items:center;gap:3px;border:1.5px solid var(--line-soft);border-radius:8px;padding:3px 6px;background:#fff;}
    .cur-fees span{font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);}
    .cur-fees i{font-style:normal;font-size:11.5px;font-weight:700;color:var(--muted);margin-left:auto;}
    .cur-fees input{width:100%;max-width:46px;font:inherit;font-size:12px;font-weight:700;border:0;background:none;padding:2px 0;text-align:right;color:var(--ink);}
    .cur-fees input:focus{outline:0;}
    .cur-fees label:focus-within{border-color:var(--periwinkle);}
    .cur-tiersel{flex:1;font:inherit;font-size:12px;border:1.5px solid var(--line-soft);border-radius:8px;padding:6px 8px;background:#fff;}
    .cur-rm{width:30px;height:30px;border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font-size:16px;line-height:1;color:var(--muted);cursor:pointer;flex:none;}
    .cur-rm:hover{border-color:var(--flare);color:var(--flare);}
    .cur-empty{text-align:center;color:var(--muted);padding:48px;}
    .cur-period{font-size:12.5px;color:var(--muted);}
    .cur-totrow{border-top:2px solid var(--line-soft);font-weight:700;}
    .cur-totrow td{padding-top:12px;}
    /* invoice drawer */
    .inv-dr{width:min(520px,100%);}
    .inv-meta{display:flex;gap:24px;margin-bottom:18px;}
    .inv-meta span{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);}
    .inv-meta b{font-size:15px;}
    .inv-tbl{width:100%;border-collapse:collapse;font-size:13px;}
    .inv-tbl th{text-align:left;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);padding:8px 8px;border-bottom:1px solid var(--line-soft);}
    .inv-tbl td{padding:9px 8px;border-bottom:1px solid var(--line-soft);}
    .inv-tot{margin-top:16px;}
    .inv-totrow{display:flex;justify-content:space-between;padding:7px 0;font-size:14px;}
    .inv-totrow.grand{border-top:2px solid var(--line-soft);margin-top:4px;padding-top:12px;font-weight:800;font-size:16px;}
    .inv-actions{display:flex;gap:10px;margin-top:22px;}
    `;
    document.head.appendChild(st);
  })();

  // Defer the recommended-range render (large card grid — ~500 cards) until first
  // opened. Only the nav-badge count is set eagerly.
  function initBadge(){ const nav=document.getElementById('navCur'); if(nav&&window.MSCAT){ nav.textContent=MSCAT.curated().length; } }
  function init(){ initBadge(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('click',e=>{ if(e.target.closest('[data-nav="curated"]')) setTimeout(render,0); });
  window.MSCurated={ render };
})();
