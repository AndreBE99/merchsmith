/* ============================================================
   cust-checklist.js — customer's first-login checklist (Home page).
   Shown to customer users while any step is open; hides when done or
   dismissed. Steps: accept invite · confirm details · confirm brand ·
   invite team · first project. Store: 'ms-cust-onboard'[orgId].done
   ============================================================ */
(function(){
  const role=window.MSID&&MSID.current?MSID.current():localStorage.getItem('ms-identity');
  if(role!=='customer') return;
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const all=()=>{ try{ return JSON.parse(localStorage.getItem('ms-cust-onboard')||'{}'); }catch(e){ return {}; } };
  const org=localStorage.getItem('ms-cust-onboard-latest')||'citrix';
  const rec=()=>Object.assign({done:{},people:1},all()[org]||{});
  const put=r=>{ const a=all(); a[org]=r; try{ localStorage.setItem('ms-cust-onboard',JSON.stringify(a)); }catch(e){} };
  const STEPS=[['invite','Accept your invitation','You’re in.',null],
    ['details','Confirm your organisation details','Check your address and company details are right.','Merchsmith Customer Settings.html#tab=profile'],
    ['brand','Confirm your brand','Your distributor has set up your logo and colours. Change them if you need to.','Merchsmith Customer Settings.html#tab=branding'],
    ['team','Invite your team','Add colleagues who order, approve proofs or need to see projects.','Merchsmith Team.html'],
    ['project','Start your first project','Tell your account manager what you need and they’ll put together options.','Merchsmith Projects.html']];
  function draw(){ const r=rec(); r.done.invite=true; if(r.dismissed) return; const left=STEPS.filter(s=>!r.done[s[0]]);
    let el=document.getElementById('ccList'); if(!left.length){ if(el) el.remove(); return; }
    const main=document.querySelector('main, .main'); if(!main) return;
    if(!el){ el=document.createElement('section'); el.id='ccList'; el.className='cc'; const h=main.querySelector('h1'); (h?h.nextSibling:main.firstChild)?main.insertBefore(el,h?h.nextSibling:main.firstChild):main.appendChild(el); }
    const n=STEPS.length-left.length, next=left[0][0];
    el.innerHTML=`<div class="cc-h"><div><b>Get set up</b><span>${n} of ${STEPS.length} done</span></div><button class="cc-x" data-ccx aria-label="Hide checklist">Hide</button></div>
      <div class="cc-bar"><i style="width:${n/STEPS.length*100}%"></i></div>
      <ol class="cc-l">${STEPS.map(([k,t,d,href])=>{ const ok=!!r.done[k]; return `<li class="${ok?'ok':''}${k===next?' next':''}"><span class="cc-dot">${ok?'✓':''}</span><div><b>${esc(t)}</b>${!ok?`<small>${esc(d)}</small>`:''}</div>${!ok&&href?`<span class="cc-a"><a class="btn${k===next?'':' ghost'} sm" href="${href}" data-ccgo="${k}">${k===next?'Start':'Open'}</a><button class="cc-skip" data-ccdone="${k}">Mark done</button></span>`:''}</li>`; }).join('')}</ol>`;
    el.querySelectorAll('[data-ccgo]').forEach(a=>a.addEventListener('click',()=>{ const x=rec(); x.done[a.dataset.ccgo]=true; put(x); }));
    el.querySelectorAll('[data-ccdone]').forEach(b=>b.onclick=()=>{ const x=rec(); x.done[b.dataset.ccdone]=true; put(x); draw(); });
    el.querySelector('[data-ccx]').onclick=()=>{ const x=rec(); x.dismissed=true; put(x); el.remove(); }; put(r); }
  const css=`.cc{background:#fff;border:1px solid var(--line-soft);border-radius:18px;padding:18px 20px;margin:18px 0 22px;box-shadow:0 4px 16px rgba(40,44,80,.04);}
  .cc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;} .cc-h b{font-family:var(--serif);font-weight:500;font-size:22px;display:block;} .cc-h span{font-size:12.5px;color:var(--muted);}
  .cc-x{border:0;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--muted);cursor:pointer;} .cc-x:hover{color:var(--ink);}
  .cc-bar{height:5px;border-radius:5px;background:var(--paper-2);margin:12px 0 6px;overflow:hidden;} .cc-bar i{display:block;height:100%;background:var(--periwinkle-deep);border-radius:5px;transition:width .3s;}
  .cc-l{list-style:none;margin:0;padding:0;} .cc-l li{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--paper-2);} .cc-l li:first-child{border-top:0;}
  .cc-l li>div{flex:1;min-width:0;} .cc-l b{font-size:14px;} .cc-l small{display:block;font-size:12.5px;color:var(--text-soft);margin-top:1px;} .cc-l li.ok b{color:var(--muted);font-weight:600;text-decoration:line-through;}
  .cc-dot{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;flex:none;font-size:12px;font-weight:800;color:#fff;} .cc-l li.ok .cc-dot{background:var(--green-deep,#1d7c4d);border-color:var(--green-deep,#1d7c4d);} .cc-l li.next .cc-dot{border-color:var(--periwinkle-deep);}
  .cc-a{display:flex;align-items:center;gap:10px;flex:none;} .cc-a .btn{white-space:nowrap;text-decoration:none;} .cc-skip{border:0;background:none;font:inherit;font-size:12px;font-weight:700;color:var(--muted);cursor:pointer;white-space:nowrap;} .cc-skip:hover{color:var(--periwinkle-deep);}
  @media(max-width:560px){.cc-l li{flex-wrap:wrap;} .cc-a{width:100%;padding-left:36px;}}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(draw,50)):setTimeout(draw,50);
})();
