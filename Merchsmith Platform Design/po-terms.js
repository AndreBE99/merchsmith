/* ============================================================
   po-terms.js — purchasing terms printed on supplier purchase orders.
   Distributor Settings → Purchasing terms. Store: ms-po-terms {on, items[], at, by}
   (legacy ms-po-conditions array is read once as the starting list).
   window.MSPOTERMS: get() → [] when switched off · settings(el) · DEFAULTS
   ============================================================ */
window.MSPOTERMS=window.MSPOTERMS||(function(){
  const KEY='ms-po-terms', esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const DEFAULTS=['For branded products we must approve a proof before production starts, including for repeat orders.','We don’t accept over or under quantities unless we’ve agreed them in writing.','Send goods under plain cover, with no mention of your company (including box labels).'];
  const OLD0='Product and branding quality must match any sample of this product sent to us or to our customer, before or after this order.';
  // stored list still identical to the old defaults → move to the new defaults (term about samples removed Oct 2026)
  const unedited=a=>a.length===DEFAULTS.length+1&&a[0]===OLD0&&a.slice(1).every((t,i)=>t===DEFAULTS[i]);
  function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v&&Array.isArray(v.items)){ if(unedited(v.items)) v.items=DEFAULTS.slice(); return v; } }catch(e){}
    let legacy=null; try{ legacy=JSON.parse(localStorage.getItem('ms-po-conditions')||'null'); }catch(e){}
    return {on:true,items:Array.isArray(legacy)&&legacy.length&&!unedited(legacy)?legacy.slice():DEFAULTS.slice()}; }
  function save(v){ v.at=new Date().toISOString(); try{ v.by=(window.MSChat&&MSChat.me&&MSChat.me().name)||''; }catch(e){} try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} }
  const get=()=>{ const v=load(); return v.on?v.items.map(t=>String(t).trim()).filter(Boolean):[]; };
  function settings(el){ if(!el) return; let v=load();
    const toast=()=>{ const t=document.getElementById('toast'); if(t){ t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1400); } };
    const commit=()=>{ save(v); toast(); };
    const btn='font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:9px;padding:6px 10px;cursor:pointer;color:var(--ink,#23232a)';
    const ico='width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:8px;cursor:pointer;color:var(--ink-2,#475467);font:inherit;font-size:14px';
    function draw(){ const when=v.at?new Date(v.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
      el.innerHTML=`<div class="card"><div class="card-h"><h2>Purchasing terms</h2><span class="tag">Purchase orders</span></div>
        <p class="lede">Printed on the last page of every purchase order you send to a supplier, under “Our purchasing terms”. Changes apply to POs created or re-sent from now on.</p>
        <label style="display:flex;align-items:center;gap:10px;margin:14px 0 4px;font-size:14px;font-weight:700;cursor:pointer"><input type="checkbox" data-pton${v.on?' checked':''} style="width:18px;height:18px;accent-color:var(--periwinkle-deep)"> Include purchasing terms on purchase orders</label>
        ${v.on?`<ol style="list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:10px">${v.items.map((t,i)=>`<li style="display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;align-items:start">
            <span style="width:24px;height:24px;border-radius:50%;background:var(--periwinkle-deep);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800;margin-top:6px">${i+1}</span>
            <textarea data-ptt="${i}" rows="2" aria-label="Term ${i+1}" style="font:inherit;font-size:14px;line-height:1.5;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:10px;padding:8px 11px;resize:vertical;min-height:44px;width:100%">${esc(t)}</textarea>
            <span style="display:flex;gap:4px;margin-top:4px"><button type="button" data-ptup="${i}" title="Move up" style="${ico}"${i?'':' disabled'}>↑</button><button type="button" data-ptdn="${i}" title="Move down" style="${ico}"${i<v.items.length-1?'':' disabled'}>↓</button><button type="button" data-ptdel="${i}" title="Remove term" style="${ico};color:#b42318">✕</button></span></li>`).join('')}</ol>
          ${v.items.length?'':'<p style="margin:12px 0 0;font-size:13.5px;color:var(--muted,#667085)">No terms yet. Add one, or switch the terms off.</p>'}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button type="button" data-ptadd style="${btn}">+ Add a term</button><button type="button" data-ptreset style="${btn}">Reset to the Merchsmith defaults</button></div>`
          :'<p style="margin:12px 0 0;font-size:13.5px;color:var(--muted,#667085)">Purchase orders won’t include a terms page or the “See the next page for our purchasing terms” line.</p>'}
        ${when?`<p style="margin:14px 0 0;font-size:12px;color:var(--muted,#667085)">Last changed ${esc(when)}${v.by?' by '+esc(v.by):''}</p>`:''}</div>`;
      const q=s=>el.querySelectorAll(s);
      el.querySelector('[data-pton]').onchange=e=>{ v.on=e.target.checked; commit(); draw(); };
      q('[data-ptt]').forEach(t=>t.onchange=()=>{ v.items[+t.dataset.ptt]=t.value.trim(); v.items=v.items.filter(Boolean); commit(); draw(); });
      q('[data-ptup]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.ptup; [v.items[i-1],v.items[i]]=[v.items[i],v.items[i-1]]; commit(); draw(); });
      q('[data-ptdn]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.ptdn; [v.items[i+1],v.items[i]]=[v.items[i],v.items[i+1]]; commit(); draw(); });
      q('[data-ptdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Remove term '+(+b.dataset.ptdel+1)+'?')) return; v.items.splice(+b.dataset.ptdel,1); commit(); draw(); });
      const add=el.querySelector('[data-ptadd]'); if(add) add.onclick=()=>{ v.items.push(''); draw(); const t=el.querySelector('[data-ptt="'+(v.items.length-1)+'"]'); if(t) t.focus(); };
      const rs=el.querySelector('[data-ptreset]'); if(rs) rs.onclick=()=>{ if(!confirm('Replace your terms with the Merchsmith defaults?')) return; v.items=DEFAULTS.slice(); commit(); draw(); }; }
    draw(); }
  return {get,settings,DEFAULTS};
})();
