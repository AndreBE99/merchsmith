/* ============================================================
   names.js — people's names as parts: title · first · last · preferred.
   `n` stays the full display name everywhere ("Mary Anne Jones").

   MSNAME.split(n)      "Dr Mary Anne van der Berg" → {title:'Dr',first:'Mary Anne',last:'van der Berg'}
   MSNAME.of(u)         stored parts (firstName / lastName / pref — `last` is taken by 'last seen'), else split(u.n)
   MSNAME.full(p) · greet(u) (preferred → first) · initials(u) · sortKey(u) (last, first)
   MSNAME.upgrade(input,{pref})  turns a "Full name" input into First / Last
                        (/ Preferred) fields; the original input stays in the DOM,
                        hidden, and its .value reads/writes the full name, so
                        existing code keeps working. input._name() → {firstName,lastName,pref}.
   MSNAME.normalise(u)  adds first/last to a record that only has n
   ============================================================ */
window.MSNAME=window.MSNAME||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const TITLES=/^(dr|mr|mrs|ms|miss|mx|prof|professor|sir|dame|rev|lady|lord)\.?$/i;
  const PART=/^(van|von|de|der|den|da|di|du|del|della|le|la|st\.?|mac|ter|ten|bin|al|el)$/i;
  function split(n){ let w=String(n||'').trim().replace(/\s+/g,' ').split(' ').filter(Boolean); const r={title:'',first:'',last:''};
    if(w.length>1&&TITLES.test(w[0])) r.title=w.shift().replace(/\.$/,'');
    if(w.length<=1){ r.first=w[0]||''; return r; }
    let i=w.length-1; while(i>1&&PART.test(w[i-1])) i--; r.last=w.slice(i).join(' '); r.first=w.slice(0,i).join(' '); return r; }
  const full=p=>[p.first,p.last].filter(Boolean).join(' ').trim();
  const of=u=>{ u=u||{}; if(u.firstName||u.lastName) return {title:u.nameTitle||'',first:u.firstName||'',last:u.lastName||'',pref:u.pref||''}; const s=split(u.n||u.name||''); return {title:s.title,first:s.first,last:s.last,pref:u.pref||''}; };
  const greet=u=>{ const p=of(u); return p.pref||p.first||String(u&&u.n||'').split(' ')[0]||'there'; };
  const initials=u=>{ const p=typeof u==='string'?split(u):of(u); return ((p.first||'?')[0]+((p.last||'').replace(/^((van|von|de|der|den|da|di|du|del|le|la)\s)+/i,'')[0]||'')).toUpperCase(); };
  const sortKey=u=>{ const p=of(u); return (p.last+' '+p.first).toLowerCase().trim(); };
  function normalise(u){ if(!u||u.firstName||u.lastName||!u.n) return u; const s=split(u.n); u.firstName=s.first; u.lastName=s.last; if(s.title) u.nameTitle=s.title; return u; }
  // names the split can't be sure about: worth a human check
  const unsure=n=>{ const w=String(n||'').trim().split(/\s+/); return w.length>2||TITLES.test(w[0]||'')||w.some(x=>PART.test(x))||w.length===1; };

  const VAL=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  function upgrade(inp,opts){ if(!inp||inp._name) return inp; opts=opts||{}; const init=of({n:VAL.get.call(inp),pref:opts.prefValue||''});
    const cls=opts.cls||(inp.closest('.pp-f')?'pp-f':inp.closest('.cw-f')?'cw-f':inp.closest('label.f')?'f':inp.closest('.ob-f')?'ob-f':'');
    const host=inp.closest('label')||inp.parentElement; const wrap=document.createElement('div'); wrap.className='nm-row'+(opts.pref?' three':'');
    const fld=(k,l,v,req,ph)=>`<label class="${cls} nm-f"><span>${l}${req?' <em class="nm-req">*</em>':''}</span><input data-nm="${k}" value="${esc(v)}" autocomplete="${k==='first'?'given-name':k==='last'?'family-name':'nickname'}"${ph?` placeholder="${esc(ph)}"`:''}></label>`;
    wrap.innerHTML=fld('first','First name',init.first,1)+fld('last','Last name',init.last,0)+(opts.pref?fld('pref','Preferred name',init.pref,0,'Optional, e.g. Rob'):'');
    host.after(wrap); host.hidden=true; host.style.display='none'; host.classList.add('nm-hidden');
    const get=k=>wrap.querySelector(`[data-nm="${k}"]`);
    Object.defineProperty(inp,'value',{configurable:true,get(){ return full({first:get('first').value.trim(),last:get('last').value.trim()}); },
      set(v){ const s=split(v); get('first').value=s.first; get('last').value=s.last; VAL.set.call(inp,v); }});
    inp.focus=()=>get('first').focus();
    wrap.addEventListener('input',()=>{ VAL.set.call(inp,inp.value); inp.dispatchEvent(new Event('input',{bubbles:true})); });
    inp._name=()=>({firstName:get('first').value.trim(),lastName:get('last').value.trim(),pref:get('pref')?get('pref').value.trim():''});
    return inp; }
  const parts=inp=>inp&&inp._name?inp._name():{};

  const st=document.createElement('style'); st.textContent=`.nm-row{display:grid;grid-template-columns:1fr 1fr;gap:inherit;column-gap:12px;row-gap:12px;grid-column:1/-1;} .nm-row.three{grid-template-columns:1fr 1fr 1fr;} @media(max-width:560px){.nm-row,.nm-row.three{grid-template-columns:1fr;}}
  .nm-req{color:#c0392b;font-style:normal;} .nm-hidden{display:none!important;} .nm-f{min-width:0;} .nm-f input{width:100%;min-width:0;}`; (document.head||document.documentElement).appendChild(st);

  // any "Full name" input anywhere (modals, drawers) gets First / Last automatically
  const AUTO='input[placeholder="Full name"]:not([data-nm-skip]),input[data-nm-auto]';
  function auto(root){ (root.querySelectorAll?root:document).querySelectorAll(AUTO).forEach(i=>{ if(!i._name&&i.closest('label')) upgrade(i,{cls:i.closest('.pp-f')?'pp-f':i.closest('.fm-f')?'fm-f':''}); }); }
  const mo=new MutationObserver(ms=>{ for(const m of ms) for(const x of m.addedNodes) if(x.nodeType===1&&(x.matches&&x.matches(AUTO)||x.querySelector&&x.querySelector(AUTO))) auto(x.parentElement||x); });
  const startAuto=()=>{ auto(document); mo.observe(document.body,{childList:true,subtree:true}); };
  document.body?startAuto():document.addEventListener('DOMContentLoaded',startAuto);
  function sweep(){ const D=window.ORG_DATA; if(!D) return; (D.team||[]).forEach(normalise); (D.mojoTeams||[]).forEach(t=>(t.users||[]).forEach(normalise));
    ['customers','suppliers'].forEach(k=>(D[k]||[]).forEach(o=>(o.teams||[]).forEach(t=>(t.users||[]).forEach(normalise)))); }
  sweep(); document.readyState==='loading'&&document.addEventListener('DOMContentLoaded',sweep);
  return {split,of,full,greet,initials,sortKey,normalise,unsure,upgrade,parts};
})();
