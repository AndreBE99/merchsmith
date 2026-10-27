/* bacs-deadline.js — bank-transfer payment deadline (Sep 2026).
   Customers paying by BACS must pay within the distributor's window (default 4 hours) to keep the delivery dates agreed at the project stage.
   Setting: localStorage 'ms-bacs-hours' (Distributor Settings → Finance → Billing & payments → Customer invoices).
   Critical = any line with a customer-specified delivery date or a Critical (no-fail) date; otherwise ASAP → normal "Payment due".
   window.MSBACS: hours() · setHours(h) · deadline(from) · critical(lines) · label(d) · settingsHTML() · wireSettings(el) */
window.MSBACS=window.MSBACS||(function(){
  const K='ms-bacs-hours';
  const hours=()=>{ const v=parseFloat(localStorage.getItem(K)); return v>0?v:4; };
  const setHours=h=>{ try{ localStorage.setItem(K,String(h)); }catch(e){} };
  const deadline=from=>new Date((from?new Date(from):new Date()).getTime()+hours()*36e5);
  const spec=()=>{ try{ return JSON.parse(localStorage.getItem('ms-pm-spec')||'{}'); }catch(e){ return {}; } };
  const critical=lines=>{ const S=spec(); return (lines||[]).some(l=>{ const y=(S[l.name]||{}).supply||{}; return !!(y.nofail||l.nofail)||!/^\s*(asap)?\s*$/i.test(String(y.cusDisplay||l.deliveryDate||'ASAP')); }); };
  const label=d=>{ d=new Date(d); return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+', '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); };
  const settingsHTML=()=>`<section class="card bacs-card" style="margin-bottom:22px"><div class="card-h"><h2>Bank transfer payment window</h2></div>
    <p class="lede">When a customer chooses to pay by bank transfer, they must pay within this time to keep the delivery dates agreed at the project stage. The deadline shows at checkout and on the order.</p>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px"><label for="bacsH" style="font-size:13px;font-weight:700;color:var(--ink-2)">Pay by bank transfer within</label>
      <select id="bacsH" class="fsel" style="font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:8px 11px;background:#fff">${[1,2,4,8,12,24,48].map(h=>`<option value="${h}"${h===hours()?' selected':''}>${h} hour${h>1?'s':''}${h===4?' (default)':''}</option>`).join('')}</select>
      <span id="bacsOk" style="font-size:12.5px;color:var(--green-deep,#1d7c4d);font-weight:700" hidden>Saved</span></div></section>`;
  const wireSettings=el=>{ const s=el.querySelector('#bacsH'); if(!s) return; s.onchange=()=>{ setHours(+s.value); const ok=el.querySelector('#bacsOk'); ok.hidden=false; setTimeout(()=>ok.hidden=true,1600); }; };
  return {hours,setHours,deadline,critical,label,settingsHTML,wireSettings};
})();
