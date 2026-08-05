/* ============================================================
   admin-curated.js — Merchsmith Curated range management +
   supplier invoicing. Reads the shared catalogue (MSCAT).
   Renders into #panel-curated.
   Suppliers pay a monthly listing fee to appear, and more to be
   promoted (Featured / Spotlight). This is the commercial layer.
   ============================================================ */
(function(){
  if(!window.MSCAT) return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const gbp0=n=>'£'+Number(n||0).toLocaleString('en-GB',{maximumFractionDigits:0});
  const toast=(()=>{ const el=document.getElementById('toast'); let t; return m=>{ if(!el)return; el.textContent=m; el.classList.add('on'); clearTimeout(t); t=setTimeout(()=>el.classList.remove('on'),2400); }; })();
  const TIERLBL={standard:'Standard',featured:'Featured',spotlight:'Spotlight'};
  const TIERS=[['standard','Standard',25,0],['featured','Featured',60,140],['spotlight','Spotlight',120,340]];

  let view='invoicing'; // 'invoicing' (commercial overview, default) | 'range' (tier management)

  function bySupplier(){ const m={}; MSCAT.curated().forEach(p=>{ (m[p.supplier]=m[p.supplier]||[]).push(p); }); return m; }
  function supplierTotals(list){ let list_=0,promo=0; list.forEach(p=>{ list_+=+p.curation.listFee||0; promo+=+p.curation.promoFee||0; }); return {list:list_,promo,total:list_+promo}; }

  function render(){
    const p=document.getElementById('panel-curated'); if(!p) return;
    const cur=MSCAT.curated(); const rev=MSCAT.curatedRevenue(); const sup=bySupplier();
    const promoted=cur.filter(x=>x.promoted).length;
    p.innerHTML=`
      <div class="phead"><h1 class="ptitle">Merchsmith Curated range</h1><div class="cur-tabs"><button class="cur-tab ${view==='invoicing'?'on':''}" data-cv="invoicing">Commercial overview</button><button class="cur-tab ${view==='range'?'on':''}" data-cv="range">Tier management</button></div></div>
      <p class="psub">The commercial layer: suppliers pay to list in the default store, and more to be promoted. Curate <em>which</em> products are in the range from the <a href="#" id="curGoDb">product database</a>.</p>
      <div class="statbar">
        <div class="sb"><b>${cur.length}</b><span>Products in range</span></div>
        <div class="sb"><b>${promoted}</b><span>Promoted</span></div>
        <div class="sb"><b>${Object.keys(sup).length}</b><span>Suppliers paying</span></div>
        <div class="sb"><b>${gbp0(rev.list)}</b><span>Listing / mo</span></div>
        <div class="sb"><b>${gbp0(rev.promo)}</b><span>Promotion / mo</span></div>
        <div class="sb cur-rev"><b>${gbp0(rev.total)}</b><span>Total / mo</span></div>
      </div>
      <div id="curView"></div>`;
    p.querySelectorAll('.cur-tab').forEach(b=>b.onclick=()=>{ view=b.dataset.cv; render(); });
    const gd=p.querySelector('#curGoDb'); if(gd)gd.onclick=e=>{ e.preventDefault(); const n=document.querySelector('.anav[data-nav="products"]'); if(n)n.click(); };
    renderView();
    const nav=document.getElementById('navCur'); if(nav) nav.textContent=cur.length;
  }

  function renderView(){
    const host=document.getElementById('curView'); if(!host) return;
    host.innerHTML = view==='invoicing' ? invoicingHTML() : rangeHTML();
    if(view==='invoicing'){ host.querySelectorAll('[data-invsup]').forEach(b=>b.onclick=()=>openInvoice(b.dataset.invsup)); }
    else {
      host.querySelectorAll('[data-curtier]').forEach(sel=>sel.onchange=()=>{ const def=TIERS.find(t=>t[0]===sel.value); MSCAT.setCurated(sel.dataset.curtier,{tier:sel.value,listFee:def[2],promoFee:def[3]}); render(); });
      host.querySelectorAll('[data-curremove]').forEach(b=>b.onclick=()=>{ const p=MSCAT.get(b.dataset.curremove); MSCAT.removeCurated(b.dataset.curremove); toast(`“${p?p.name:'Product'}” removed from the curated range`); render(); });
      const add=host.querySelector('#curAddBtn'); if(add)add.onclick=()=>{ const n=document.querySelector('.anav[data-nav="products"]'); if(n)n.click(); };
    }
  }

  function rangeHTML(){
    const cur=MSCAT.curated().slice().sort((a,b)=>{ const r={spotlight:0,featured:1,standard:2}; return (r[a.curation.tier]-r[b.curation.tier])||a.name.localeCompare(b.name); });
    if(!cur.length) return `<div class="cur-empty">No products in the curated range yet. <button class="btn sm" id="curAddBtn">Manage in product database →</button></div>`;
    return `<div class="cur-rangehd"><h3>${cur.length} products · set each product's placement tier · promoted tiers sort first</h3><button class="btn ghost sm" id="curAddBtn">Manage range in product database →</button></div>
      <div class="cur-grid">${cur.map(p=>`<div class="cur-card ${p.promoted?'promo':''}">
        ${p.promoted?`<span class="cur-promotag">${TIERLBL[p.curation.tier]}</span>`:''}
        <div class="cur-thumb">${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" onerror="this.remove();this.parentNode.textContent='${esc(p.name.slice(0,1))}'">`:esc(p.name.slice(0,1))}</div>
        <div class="cur-cnm">${esc(p.name)}</div>
        <div class="cur-cmeta">${esc(p.supplier)} · ${p.dept}</div>
        <div class="cur-crow"><b>${gbp(p.priceFrom)}</b><span class="cur-fee">${gbp0(p.curation.listFee)}/mo${p.curation.promoFee?` + ${gbp0(p.curation.promoFee)}`:''}</span></div>
        <div class="cur-cact"><select class="cur-tiersel" data-curtier="${p.id}">${TIERS.map(([v,l,lf,pf])=>`<option value="${v}" ${p.curation.tier===v?'selected':''}>${l}</option>`).join('')}</select><button class="cur-rm" data-curremove="${p.id}" title="Remove">×</button></div>
      </div>`).join('')}</div>`;
  }

  function invoicingHTML(){
    const sup=bySupplier(); const names=Object.keys(sup).sort();
    if(!names.length) return `<div class="cur-empty">No suppliers are paying for curated placement yet.</div>`;
    const rows=names.map(n=>{ const t=supplierTotals(sup[n]); const promo=sup[n].filter(x=>x.promoted).length;
      return `<tr><td><b>${esc(n)}</b></td><td class="scell">${sup[n].length}</td><td class="scell">${promo||'—'}</td><td class="scell">${gbp0(t.list)}</td><td class="scell">${t.promo?gbp0(t.promo):'—'}</td><td class="scell"><b>${gbp0(t.total)}</b></td><td><button class="iconbtn" data-invsup="${esc(n)}"><svg class="icn"><use href="#a-eye"/></svg>Invoice</button></td></tr>`; }).join('');
    const tot=MSCAT.curatedRevenue();
    return `<div class="ovcard" style="margin-top:6px"><div class="ovcard-h"><h3>Monthly supplier billing</h3><span class="cur-period">Period · Jun 2026</span></div>
      <table class="dirtable bare"><thead><tr><th>Supplier</th><th>Listed</th><th>Promoted</th><th>Listing</th><th>Promotion</th><th>Total / mo</th><th></th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr class="cur-totrow"><td>All suppliers</td><td class="scell">${MSCAT.curated().length}</td><td class="scell">${MSCAT.curated().filter(x=>x.promoted).length}</td><td class="scell">${gbp0(tot.list)}</td><td class="scell">${gbp0(tot.promo)}</td><td class="scell"><b>${gbp0(tot.total)}</b></td><td></td></tr></tfoot></table></div>`;
  }

  function openInvoice(name){
    const items=(bySupplier()[name]||[]).slice().sort((a,b)=>(b.curation.listFee+b.curation.promoFee)-(a.curation.listFee+a.curation.promoFee));
    const t=supplierTotals(items);
    let pk=document.getElementById('invDrawer'); if(!pk){ pk=document.createElement('div'); pk.id='invDrawer'; pk.className='prod-scrim'; document.body.appendChild(pk); }
    pk.innerHTML=`<div class="prod-dr inv-dr"><div class="prod-drhd"><div><h2>${esc(name)}</h2><span>Curated placement invoice · Jun 2026</span></div><button class="dwr-x" data-px>×</button></div>
      <div class="prod-drbody">
        <div class="inv-meta"><div><span>Invoice</span><b>MS-CR-${(name.charCodeAt(0)+name.length).toString().padStart(4,'0')}</b></div><div><span>Products listed</span><b>${items.length}</b></div><div><span>Due</span><b>1 Jul 2026</b></div></div>
        <table class="inv-tbl"><thead><tr><th>Product</th><th>Tier</th><th>Listing</th><th>Promo</th><th>Line</th></tr></thead><tbody>
          ${items.map(p=>`<tr><td>${esc(p.name)}</td><td><span class="curbadge ${p.promoted?'promo':''}">${TIERLBL[p.curation.tier]}</span></td><td>${gbp0(p.curation.listFee)}</td><td>${p.curation.promoFee?gbp0(p.curation.promoFee):'—'}</td><td><b>${gbp0(p.curation.listFee+p.curation.promoFee)}</b></td></tr>`).join('')}
        </tbody></table>
        <div class="inv-tot"><div class="inv-totrow"><span>Listing fees</span><b>${gbp0(t.list)}</b></div><div class="inv-totrow"><span>Promotion fees</span><b>${gbp0(t.promo)}</b></div><div class="inv-totrow grand"><span>Total due / month</span><b>${gbp0(t.total)}</b></div></div>
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

  // Defer the curated-range render (large card grid — ~500 cards) until first
  // opened. Only the nav-badge count is set eagerly.
  function initBadge(){ const nav=document.getElementById('navCur'); if(nav&&window.MSCAT){ nav.textContent=MSCAT.curated().length; } }
  function init(){ initBadge(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('click',e=>{ if(e.target.closest('[data-nav="curated"]')) setTimeout(render,0); });
  window.MSCurated={ render };
})();
