/* ============================================================
   discounts.js — distributor discount rules on the SELL price.
   Applied last, never to cost. One discount per product: the most
   specific scope wins (product › project › customer › category ›
   sitewide); rules are never combined.
   Stored in ms-discount-rules [{id,scope,ref,pct}].

   window.MSDISC: rules() / save(l) / SCOPES / best(ctx) / apply(price,ctx) / panel(el)
     ctx = {product, project, customer, category}  (reference ids)
   ============================================================ */
window.MSDISC=(function(){
  const KEY='ms-discount-rules';
  const SCOPES=[['sitewide','Sitewide'],['category','Category'],['customer','Customer'],['project','Project'],['product','Product']];
  const RANK={product:5,project:4,customer:3,category:2,sitewide:1};
  const LBL=Object.fromEntries(SCOPES);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function rules(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function save(l){ try{ localStorage.setItem(KEY,JSON.stringify(l)); }catch(e){} }
  function best(ctx){ ctx=ctx||{}; let b=null;
    rules().forEach(r=>{ const hit=r.scope==='sitewide'||(ctx[r.scope]!=null&&String(ctx[r.scope])===String(r.ref)); if(hit&&(!b||RANK[r.scope]>RANK[b.scope])) b=r; }); return b; }
  function apply(price,ctx){ const r=best(ctx); return r?price*(1-r.pct/100):price; }
  // reference suggestions, where the page has the data loaded
  function refs(scope){ try{
    if(scope==='category'&&window.MSSTORE) return MSSTORE.departments().map(d=>[d.id,d.name]);
    if(scope==='customer'&&window.ORG_DATA) return (ORG_DATA.customers||[]).map(c=>[c.id,c.name]);
    if(scope==='product'&&window.MSCAT) return MSCAT.all().slice(0,400).map(p=>[p.id,p.name]);
  }catch(e){} return []; }
  const nameOf=(scope,ref)=>{ const f=refs(scope).find(x=>String(x[0])===String(ref)); return f?f[1]:''; };

  function panel(el){
    let scope='sitewide';
    const draw=()=>{ const l=rules().slice().sort((a,b)=>RANK[b.scope]-RANK[a.scope]);
      const opts=refs(scope);
      el.innerHTML=`<div class="card">
        <div class="card-h"><h2>Discounts</h2><span class="tag">Most specific wins</span></div>
        <p class="lede">Applied last, only to the marked-up sell price shown to customers — never to cost. Only one discount applies per product: the most specific scope wins (product, then project, then customer, then category, then sitewide), they are never combined.</p>
        <div class="mk-tbl"><div class="ds-h"><span>Scope</span><span>Reference ID</span><span>Discount %</span><span></span></div>
          ${l.length?l.map(r=>`<div class="ds-r"><span class="ds-scope">${LBL[r.scope]}</span>
            <span class="ds-ref">${r.scope==='sitewide'?'<i>All products</i>':`<code>${esc(r.ref)}</code>${nameOf(r.scope,r.ref)?`<em>${esc(nameOf(r.scope,r.ref))}</em>`:''}`}</span>
            <input data-dspct="${esc(r.id)}" value="${esc(r.pct)}" inputmode="decimal" aria-label="Discount %">
            <button class="mk-del" data-dsdel="${esc(r.id)}" title="Delete discount" aria-label="Delete discount"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z"/></svg></button></div>`).join('')
          :`<div class="ds-empty"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>No discount rules yet. Add one below.</div>`}
        </div>
        <div class="mk-add ds-add">
          <label class="ds-sel"><span>Scope</span><select data-dsscope>${SCOPES.map(([k,t])=>`<option value="${k}"${k===scope?' selected':''}>${t}</option>`).join('')}</select></label>
          ${scope==='sitewide'?'':`<input data-dsref list="dsRefs" placeholder="${LBL[scope]} reference ID" autocomplete="off"><datalist id="dsRefs">${opts.map(([id,n])=>`<option value="${esc(id)}">${esc(n)}</option>`).join('')}</datalist>`}
          <input data-dsnewpct placeholder="Discount %" inputmode="decimal">
          <button class="btn" data-dsadd>+ Add discount</button></div>
        <p class="mk-err" data-dserr hidden></p>
      </div>`;
      const err=el.querySelector('[data-dserr]'), fail=t=>{ err.textContent=t; err.hidden=false; };
      const pctOk=v=>{ const n=parseFloat(v); return n>0&&n<100?n:null; };
      el.querySelector('[data-dsscope]').onchange=e=>{ scope=e.target.value; draw(); };
      el.querySelectorAll('[data-dspct]').forEach(inp=>inp.onchange=()=>{ const L=rules(), r=L.find(x=>x.id===inp.dataset.dspct), n=pctOk(inp.value);
        if(n==null){ inp.value=r.pct; return fail('Enter a discount between 0 and 100%.'); } r.pct=n; save(L); err.hidden=true; });
      el.querySelectorAll('[data-dsdel]').forEach(b=>b.onclick=()=>{ const L=rules().filter(x=>x.id!==b.dataset.dsdel); save(L); draw(); });
      el.querySelector('[data-dsadd]').onclick=()=>{ const refEl=el.querySelector('[data-dsref]'), ref=refEl?refEl.value.trim():'', n=pctOk(el.querySelector('[data-dsnewpct]').value), L=rules();
        if(scope!=='sitewide'&&!ref) return fail('Enter the '+LBL[scope].toLowerCase()+' reference ID.');
        if(n==null) return fail('Enter a discount between 0 and 100%.');
        if(L.some(x=>x.scope===scope&&String(x.ref||'')===ref)) return fail(scope==='sitewide'?'There’s already a sitewide discount. Edit it in the table.':'That '+LBL[scope].toLowerCase()+' already has a discount.');
        L.push({id:'d'+Date.now().toString(36),scope,ref:scope==='sitewide'?'':ref,pct:n}); save(L); draw(); };
    };
    draw();
  }
  const css=`
  .ds-h,.ds-r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr) minmax(0,1.4fr) 40px;gap:16px;align-items:center;padding:0 24px;}
  .ds-h{background:var(--paper-2);height:56px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);}
  .ds-r{min-height:68px;border-bottom:1px solid var(--line-soft);}
  .ds-scope{font-size:14.5px;font-weight:600;}
  .ds-ref{display:flex;flex-direction:column;gap:2px;min-width:0;} .ds-ref code{font-size:13px;font-family:ui-monospace,Menlo,monospace;color:var(--ink);word-break:break-all;}
  .ds-ref em,.ds-ref i{font-style:normal;font-size:12.5px;color:var(--muted);}
  .ds-r input{font:inherit;font-size:15px;border:0;border-bottom:1px solid var(--ink-3);background:none;padding:6px 1px;width:100%;max-width:120px;outline:0;}
  .ds-r input:focus{border-bottom:2px solid var(--periwinkle-deep);}
  .ds-empty{display:flex;align-items:center;gap:14px;margin:28px;padding:20px 30px;border-radius:12px;background:var(--paper);color:var(--ink-3);font-size:15px;}
  .ds-empty svg{color:var(--sky,#0097D8);flex:none;}
  .ds-add{border-top:1px solid var(--line-soft);padding-top:28px;margin-top:10px;}
  .ds-sel{position:relative;display:block;}
  .ds-sel span{position:absolute;top:-9px;left:18px;background:#fff;padding:0 6px;font-size:12.5px;color:var(--ink-2);}
  .ds-sel select{font:inherit;font-size:16px;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:13px 16px;width:220px;background:#fff;cursor:pointer;}
  .ds-add input[data-dsref]{width:240px;}
  @media(max-width:760px){.ds-h{display:none;}.ds-r{grid-template-columns:1fr 1fr;padding:12px 14px;}}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { rules, save, SCOPES, best, apply, panel };
})();
