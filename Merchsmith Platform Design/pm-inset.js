/* pm-inset.js — the product modal opens INSIDE the page (project list + gallery):
   below the project title row and to the right of the left menu, so the header,
   menu and title stay visible. It grows out of the row / card that was clicked. */
(function(){
  const pm=document.getElementById('pmodal'); if(!pm) return;
  let from=null;
  document.addEventListener('pointerdown',e=>{ const el=e.target.closest('#rows .row, .gcard, .gitem, [data-i]'); if(el&&!pm.contains(el)) from=el.getBoundingClientRect(); },true);
  function box(){ if(document.documentElement.classList.contains('modalonly')||document.documentElement.classList.contains('ovmodal')) return null;
    const content=document.querySelector('.ms-content')||document.querySelector('main'), tr=document.querySelector('main .titlerow');
    const left=content?Math.max(0,content.getBoundingClientRect().left):0;
    let top=tr?tr.getBoundingClientRect().bottom:0; const hd=document.querySelector('header.header'); if(hd) top=Math.max(top,hd.getBoundingClientRect().bottom);
    return {top:Math.round(Math.max(0,Math.min(top,innerHeight*.45))),left:Math.round(left)}; }
  function place(){ const b=box(); if(!b){ pm.style.cssText=''; return; } pm.style.top=b.top+'px'; pm.style.left=b.left+'px'; pm.style.right='0'; pm.style.bottom='0'; return b; }
  function grow(b){ const panel=pm.querySelector('.pmodal-panel'); if(!panel||!from||!b||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const W=innerWidth-b.left, H=innerHeight-b.top, t=Math.max(0,from.top-b.top), l=Math.max(0,from.left-b.left), r=Math.max(0,W-(from.right-b.left)), bo=Math.max(0,H-(from.bottom-b.top));
    panel.animate([{clipPath:`inset(${t}px ${r}px ${bo}px ${l}px round 16px)`},{clipPath:'inset(0 0 0 0 round 0)'}],{duration:360,easing:'cubic-bezier(.22,.61,.36,1)'}); from=null; }
  new MutationObserver(()=>{ if(pm.classList.contains('open')){ if(!pm.dataset.inset){ pm.dataset.inset=1; grow(place()); } } else if(pm.dataset.inset){ delete pm.dataset.inset; pm.classList.remove('pm-compact'); } }).observe(pm,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',()=>{ if(pm.classList.contains('open')) place(); });
  // compact mode: scrolled down inside the pop-out → hide the column headings and slim the product row
  // one scroll position for the whole pop-out (whichever of its panels is scrolling), so shrinking and reverting always agree
  const modalY=()=>Math.max(0,...[...pm.querySelectorAll('.pmodal-panel,.pm-body,.pm-main,#pmWork')].map(el=>el.scrollTop||0));
  window.__pmY=modalY;
  const sync=()=>{ const y=modalY(), on=pm.classList.contains('pm-compact'); if(!on&&y>60) pm.classList.add('pm-compact'); else if(on&&y<20) pm.classList.remove('pm-compact');
    const tr=document.querySelector('main .titlerow'); if(tr&&pm.classList.contains('open')){ const st=tr.classList.contains('stuck'); if(!st&&y>40) tr.classList.add('stuck'); else if(st&&y<12) tr.classList.remove('stuck'); } };
  document.addEventListener('scroll',e=>{ const t=e.target; if(!(t instanceof Element)||!t.closest('#pmodal')||t.closest('#pmRowBar')) return; requestAnimationFrame(sync); },{passive:true,capture:true});
  // keep the pop-out's top edge on the title row as it changes (buttons hidden on open, shrink on scroll)
  const trEl=document.querySelector('main .titlerow');
  if(trEl){ const follow=()=>{ if(pm.classList.contains('open')) requestAnimationFrame(place); };
    new ResizeObserver(follow).observe(trEl);
    trEl.addEventListener('transitionend',follow); }
  const st=document.createElement('style'); st.textContent=`
    #pmodal{z-index:30!important;transition:top .18s ease;} #pmodal,#pmodal *{overflow-anchor:none;} #pmodal .pmodal-scrim{display:none;}
    #pmodal .pmodal-panel{border-top:1px solid var(--line-soft)!important;border-left:1px solid var(--line-soft)!important;box-shadow:-8px 0 30px rgba(20,22,45,.06)!important;}`;
  document.head.appendChild(st);
})();
