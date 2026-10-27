/* ============================================================
   markup.js — distributor markup bands on TOTAL cost.
   Total cost = item + decoration + setup, all at quantity.
   A band applies from its "total cost over" threshold up to the
   next band; sell = cost × markup, never less than cost + min profit.
   Stored in ms-markup-bands (sorted by threshold).

   window.MSMARKUP: bands() / save(list) / bandFor(cost) / sell(cost) / panel(el)
   ============================================================ */
window.MSMARKUP=(function(){
  const KEY='ms-markup-bands';
  const DEF=[[60,2.2,60],[80,1.8,65],[100,1.74,74],[150,1.67,95],[200,1.61,135],[300,1.54,160],[400,1.49,200],[500,1.45,225],[750,1.38,290],[1000,1.33,360],[2000,1.3,600]]
    .map(([over,mk,mp],i)=>({name:String(i+1),over,markup:mk,minProfit:mp}));
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sort=l=>l.slice().sort((a,b)=>a.over-b.over);
  function bands(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(Array.isArray(v)) return sort(v); }catch(e){} return DEF.map(x=>Object.assign({},x)); }
  function save(l){ try{ localStorage.setItem(KEY,JSON.stringify(sort(l))); }catch(e){} }
  function bandFor(cost){ const l=bands(); let b=l[0]; l.forEach(x=>{ if(cost>=x.over) b=x; }); return b; }
  function sell(cost){ const b=bandFor(cost); if(!b) return cost; return Math.max(cost*b.markup, cost+(+b.minProfit||0)); }
  const money=n=>'£'+Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});

  function panel(el){
    const draw=()=>{ const l=bands();
      el.innerHTML=`<div class="card">
        <div class="card-h"><h2>Markup &amp; pricing</h2><span class="tag">Bands on total cost</span></div>
        <p class="lede">Converts a product's total cost (item + decoration + setup, all at quantity) into the sell price shown to customers. Each band applies from its <b>total cost over</b> threshold up to the next band. The lowest band can carry a flat <b>minimum profit</b> floor to protect small orders.</p>
        <div class="mk-tbl"><div class="mk-h"><span>Name</span><span>Total cost over</span><span>Markup ×</span><span>Min. profit (£)</span><span></span></div>
          ${l.map((b,i)=>`<div class="mk-r">
            <input data-mk="${i}:name" value="${esc(b.name)}" aria-label="Band name">
            <input data-mk="${i}:over" value="${esc(b.over)}" inputmode="decimal" aria-label="Total cost over">
            <input data-mk="${i}:markup" value="${esc(b.markup)}" inputmode="decimal" aria-label="Markup">
            <span class="mk-mp">${money(b.minProfit)}</span>
            <button class="mk-del" data-mkdel="${i}" title="Delete band" aria-label="Delete band"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z"/></svg></button></div>`).join('')}
        </div>
        <div class="mk-add">
          <input data-mkn="name" placeholder="Band name"><input data-mkn="over" placeholder="Cost over (£)" inputmode="decimal">
          <input data-mkn="markup" placeholder="Markup ×" inputmode="decimal"><input data-mkn="minProfit" placeholder="Min. profit (£)" inputmode="decimal">
          <button class="btn" data-mkadd>+ Add band</button></div>
        <p class="mk-err" data-mkerr hidden></p>
      </div>`;
      const err=el.querySelector('[data-mkerr]'), fail=t=>{ err.textContent=t; err.hidden=false; };
      el.querySelectorAll('[data-mk]').forEach(inp=>inp.onchange=()=>{ const [i,k]=inp.dataset.mk.split(':'), L=bands(), v=inp.value.trim();
        if(k==='name'){ L[+i].name=v||L[+i].name; }
        else { const n=parseFloat(v); if(!(n>0)){ inp.value=L[+i][k]; return fail(k==='over'?'Enter a cost above £0.':'Enter a markup above 0.'); }
          if(k==='over'&&L.some((x,j)=>j!==+i&&x.over===n)){ inp.value=L[+i][k]; return fail('Another band already starts at £'+n+'.'); }
          L[+i][k]=n; }
        save(L); err.hidden=true; if(k==='over') draw(); flash(); });
      el.querySelectorAll('[data-mkdel]').forEach(b=>b.onclick=()=>{ const L=bands(); if(L.length<=1) return fail('Keep at least one band.');
        const x=L[+b.dataset.mkdel]; if(!confirm('Delete band '+x.name+' (over £'+x.over+')?')) return; L.splice(+b.dataset.mkdel,1); save(L); draw(); flash(); });
      el.querySelector('[data-mkadd]').onclick=()=>{ const g=k=>el.querySelector('[data-mkn="'+k+'"]').value.trim(), L=bands();
        const over=parseFloat(g('over')), mk=parseFloat(g('markup')), mp=parseFloat(g('minProfit')||'0');
        if(!(over>0)) return fail('Enter the total cost this band starts over.');
        if(L.some(x=>x.over===over)) return fail('A band already starts at £'+over+'.');
        if(!(mk>0)) return fail('Enter a markup, e.g. 1.5.');
        if(mp<0||isNaN(mp)) return fail('Minimum profit can’t be negative.');
        L.push({name:g('name')||String(L.length+1),over,markup:mk,minProfit:mp}); save(L); draw(); flash(); };
    };
    const flash=()=>{ const t=document.getElementById('toast'); if(t){ t.classList.add('show'); clearTimeout(t._mk); t._mk=setTimeout(()=>t.classList.remove('show'),1400); } };
    draw();
  }

  const css=`
  .mk-tbl{border-radius:10px;overflow:hidden;margin-top:4px;}
  .mk-h,.mk-r{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) 40px;gap:16px;align-items:center;padding:0 20px;}
  .mk-h{background:var(--paper-2);height:46px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
  .mk-r{height:72px;border-bottom:1px solid var(--line-soft);}
  .mk-r input{font:inherit;font-size:15px;color:var(--ink);border:0;border-bottom:1px solid var(--ink-3);background:none;padding:6px 1px;width:100%;max-width:230px;outline:0;}
  .mk-r input:focus{border-bottom:2px solid var(--periwinkle-deep);padding-bottom:5px;}
  .mk-r input[data-mk$=":over"],.mk-r input[data-mk$=":markup"]{max-width:120px;}
  .mk-mp{font-size:14px;color:var(--ink-2);}
  .mk-del{justify-self:end;border:0;background:none;color:var(--ink-3);cursor:pointer;padding:6px;border-radius:8px;display:grid;place-items:center;}
  .mk-del:hover{color:#b4232c;background:var(--paper);}
  .mk-add{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px;align-items:center;}
  .mk-add input{font:inherit;font-size:14.5px;border:1px solid var(--line);border-radius:10px;padding:12px 16px;width:170px;background:#fff;}
  .mk-add input:first-child{width:210px;} .mk-add input:focus{outline:0;border-color:var(--periwinkle);}
  .mk-add .btn{border-radius:999px;padding:13px 24px;font-size:15px;}
  .mk-err{color:#b4232c;font-size:13px;font-weight:600;margin:12px 0 0;}
  @media(max-width:760px){.mk-h{display:none;}.mk-r{grid-template-columns:1fr 1fr;height:auto;padding:12px 14px;gap:10px;}}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { bands, save, bandFor, sell, panel };
})();
