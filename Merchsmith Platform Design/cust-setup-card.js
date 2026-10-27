/* cust-setup-card.js — Home: "Finish setting up your store" card for customers whose
   organisation hasn't finished onboarding (Merchsmith Customer Onboarding.html). Reads 'ms-onboard-v2'.
   Replaces the old cust-checklist.js checklist. */
(function(){
  const role=window.MSID&&MSID.current?MSID.current():localStorage.getItem('ms-identity'); if(role!=='customer') return;
  const org=localStorage.getItem('ms-cust-onboard-latest'); if(!org) return;
  const STEPS=['org','brand','delivery','billing','terms','team'];
  function draw(){ let s={}; try{ s=(JSON.parse(localStorage.getItem('ms-onboard-v2')||'{}').orgs||{})[org]||{}; }catch(e){}
    const n=STEPS.filter(k=>(s.steps||{})[k]).length; let el=document.getElementById('ccList'); if(n===STEPS.length){ if(el) el.remove(); return; }
    const main=document.querySelector('main, .main'); if(!main) return;
    if(!el){ el=document.createElement('section'); el.id='ccList'; el.className='cc'; const h=main.querySelector('h1'); h?h.after(el):main.prepend(el); }
    el.innerHTML='<div><b>Finish setting up your store</b><span>'+n+' of '+STEPS.length+' organisation steps done. You can browse now; ordering opens once setup is finished.</span><div class="cc-bar"><i style="width:'+Math.round(n/STEPS.length*100)+'%"></i></div></div><a class="btn" href="Merchsmith Customer Onboarding.html?org='+encodeURIComponent(org)+'">'+(n?'Continue setup':'Start setup')+'</a>'; }
  const st=document.createElement('style'); st.textContent='.cc{display:flex;align-items:center;gap:18px;flex-wrap:wrap;background:#fff;border:1px solid var(--line-soft);border-radius:18px;padding:18px 20px;margin:18px 0 22px;box-shadow:0 4px 16px rgba(40,44,80,.04);} .cc>div{flex:1;min-width:240px;display:flex;flex-direction:column;gap:4px;} .cc b{font-family:var(--serif);font-weight:500;font-size:22px;} .cc span{font-size:13px;color:var(--text-soft);} .cc-bar{height:6px;border-radius:6px;background:var(--paper-2);overflow:hidden;margin-top:6px;} .cc-bar i{display:block;height:100%;background:var(--periwinkle-deep);} .cc .btn{white-space:nowrap;text-decoration:none;}'; document.head.appendChild(st);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(draw,50)):setTimeout(draw,50);
})();
