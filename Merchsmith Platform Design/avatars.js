/* avatars.js — shared seed avatar helper (gender-aware).
   Deterministically maps a person's name to one of the seed photos (~80%)
   or leaves them as coloured initials (~20%). The chosen photo matches the
   likely sex of the first name. Same name → same result.
   API: MSAvatar.url(name) · MSAvatar.initials(name) · MSAvatar.html(name,px) · MSAvatar.paint(root)
*/
(function(){
  'use strict';
  // photo pools by apparent sex of the portrait
  var MALE=['assets/avatars/a1.jpg','assets/avatars/a2.jpg','assets/avatars/a7.jpg'];
  var FEMALE=['assets/avatars/a3.jpg','assets/avatars/a4.jpg','assets/avatars/a5.jpg','assets/avatars/a6.jpg','assets/avatars/a8.jpg'];
  var ALL=MALE.concat(FEMALE);
  var F=['sara','sarah','amy','priya','mia','hannah','dana','ruth','erin','cara','jenny','jess','jessica','jen','leah','nadia','sofia','sophia','emma','olivia','grace','chloe','ella','holly','kate','katie','laura','lucy','megan','rachel','rebecca','hayley','tara','zoe','anna','beth','clare','claire','fiona','gemma','helen','isla','jade','karen','lisa','maria','nina','paula','rosa','tina','vicky','wendy','aisha','fatima','mei','yuki','ling','sun','ada','dawn'];
  var M=['leo','owen','sam','jonah','tom','ben','marco','raf','ade','jess','liam','noah','jack','oscar','george','harry','charlie','james','john','joe','joseph','luke','mark','paul','peter','ryan','sean','steve','will','adam','alex','andrew','dan','daniel','david','ed','edward','frank','greg','ian','karl','kevin','matt','mike','nick','phil','rob','simon','toby','zak','raj','omar','ravi','wei','ken','carl','reed','friar'];
  function hash(s){ s=(s||'').trim().toLowerCase(); var h=0; for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }
  function initials(n){ return (n||'').split(/\s+/).map(function(w){return w[0];}).slice(0,2).join('').toUpperCase(); }
  function sex(n){ var f=(n||'').trim().toLowerCase().split(/\s+/)[0]; if(F.indexOf(f)>=0) return 'f'; if(M.indexOf(f)>=0) return 'm';
    // fallback: many female names end in a/e/i/y
    return /[aeiy]$/.test(f)?'f':'m'; }
  function url(n){ if(!n) return null; var h=hash(n); if(h%10>=8) return null; /* ~20% initials */
    var pool = sex(n)==='f'?FEMALE:MALE; return pool[h%pool.length]; }
  function html(n, px){ px=px||32; var u=url(n); var s='width:'+px+'px;height:'+px+'px;';
    if(u) return '<span class="msav" style="'+s+'"><img src="'+u+'" alt="'+(n||'')+'"></span>';
    return '<span class="msav msav-init" style="'+s+'">'+initials(n)+'</span>'; }
  function paint(root){ (root||document).querySelectorAll('[data-avatar]').forEach(function(el){
    if(el.dataset.avPainted) return; el.dataset.avPainted='1';
    var n=el.getAttribute('data-avatar'); var u=url(n);
    if(u){ el.classList.add('msav-photo'); el.innerHTML='<img src="'+u+'" alt="'+(n||'')+'">'; }
    else if(!el.textContent.trim()){ el.textContent=initials(n); }
  }); }
  if(!document.getElementById('msav-style')){ var st=document.createElement('style'); st.id='msav-style';
    st.textContent='.msav{display:inline-grid;place-items:center;border-radius:50%;overflow:hidden;flex:none;background:var(--periwinkle,#7B85C5);color:#fff;font-weight:800;font-size:.78em;}'+
      '.msav img{width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;}'+
      '.msav-photo img{width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;}'+
      /* platform-wide hover-name tooltip (JS-positioned, fixed → never clipped) */
      '.mstip-bubble{position:fixed;display:none;transform:translate(-50%,-100%);background:#23231f;color:#fff;font-family:var(--sans,system-ui);font-size:11.5px;font-weight:600;line-height:1.2;white-space:nowrap;padding:5px 9px;border-radius:7px;pointer-events:none;z-index:99999;box-shadow:0 6px 20px rgba(20,22,45,.28);opacity:0;transition:opacity .1s;}'+
      '.mstip-bubble.on{display:block;opacity:1;}'+
      '.mstip-bubble::after{content:"";position:absolute;left:50%;top:100%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#23231f;}';
    (document.head||document.documentElement).appendChild(st); }
  // global hover-name tooltip controller for any [data-mstip] element
  (function(){
    var tip;
    function ensure(){ if(!tip){ tip=document.createElement('div'); tip.className='mstip-bubble'; (document.body||document.documentElement).appendChild(tip); } return tip; }
    function show(el){ var t=el.getAttribute('data-mstip'); if(!t) return; var b=ensure(); b.textContent=t; var r=el.getBoundingClientRect(); b.style.left=(r.left+r.width/2)+'px'; b.style.top=(r.top-7)+'px'; b.classList.add('on'); }
    function hide(){ if(tip) tip.classList.remove('on'); }
    document.addEventListener('mouseover', function(e){ var el=e.target.closest&&e.target.closest('[data-mstip]'); if(el) show(el); });
    document.addEventListener('mouseout', function(e){ var el=e.target.closest&&e.target.closest('[data-mstip]'); if(el){ var to=e.relatedTarget; if(!to||!to.closest||!to.closest('[data-mstip]')) hide(); } });
    document.addEventListener('scroll', hide, true);
  })();
  window.MSAvatar={ url:url, initials:initials, html:html, paint:paint, sex:sex, photos:ALL };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ paint(); }); else paint();
})();
