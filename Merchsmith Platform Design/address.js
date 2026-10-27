/* ============================================================
   address.js — one address format for the whole platform.
   Fields: addr1 (required) · addr2 · city (required) · county ·
           postcode (required for UK) · country (default United Kingdom)

   MSADDR.parse(str)            legacy one-line / multi-line text → fields
   MSADDR.lines(a) / text(a)    formatted lines / "a, b, c"
   MSADDR.fieldsHTML(a,opts)    the address form (with "Find address")
   MSADDR.wire(root)            hooks up Find address inside root
   MSADDR.read(root)            form → fields   ·  MSADDR.validate(a) → [errors]
   MSADDR.normalise(rec)        adds fields to a record that only has .address

   PROTOTYPE: "Find address" uses postcodes.io (free, UK) for the town and
   county, then offers sample street addresses in that postcode. Going live:
   Loqate / getAddress.io returns the real Royal Mail PAF list.
   ============================================================ */
window.MSADDR=window.MSADDR||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const F=[['addr1','Address line 1',1],['addr2','Address line 2',0],['city','Town / city',1],['county','County / state',0],['postcode','Postcode',1],['country','Country',1]];
  const KEYS=F.map(f=>f[0]);
  const UK='United Kingdom';
  const COUNTRIES=[UK,'Ireland','France','Germany','Netherlands','Belgium','Spain','Italy','Portugal','Denmark','Sweden','Norway','Poland','Switzerland','Austria','United States','Canada','Australia','New Zealand'];
  const PC=/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;
  const COUNTIES=['Devon','Cornwall','Surrey','Kent','Essex','Sussex','East Sussex','West Sussex','Hampshire','Dorset','Somerset','Yorkshire','West Yorkshire','Lancashire','Cheshire','Norfolk','Suffolk','Oxfordshire','Berkshire','Buckinghamshire','Hertfordshire','Middlesex','Greater London','Greater Manchester','Merseyside','Cumbria','Northumberland','Durham','Derbyshire','Nottinghamshire','Leicestershire','Warwickshire','West Midlands','Gloucestershire','Wiltshire','Cambridgeshire','Lincolnshire','Shropshire','Staffordshire','Worcestershire','Herefordshire'];
  const fmtPC=p=>{ const m=String(p||'').toUpperCase().replace(/\s+/g,'').match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/); return m?m[1]+' '+m[2]:String(p||'').trim().toUpperCase(); };
  const empty=()=>({addr1:'',addr2:'',city:'',county:'',postcode:'',country:UK});

  // "Unit 5, Brick Lane Studios, London, E1 6QL" → fields
  function parse(str){ const a=empty(); let s=String(str||'').trim(); if(!s||s==='—') return a;
    let parts=s.split(/\s*[\n,]\s*/).map(x=>x.trim()).filter(Boolean);
    const last=parts[parts.length-1]||''; const ci=COUNTRIES.findIndex(c=>c.toLowerCase()===last.toLowerCase()||(last.toLowerCase()==='uk'&&c===UK));
    if(ci>=0){ a.country=COUNTRIES[ci]; parts.pop(); }
    // postcode: own part, or the tail of a part ("Leeds LS3 1HS")
    for(let i=parts.length-1;i>=0;i--){ const m=parts[i].match(PC); if(m){ a.postcode=fmtPC(m[1]+m[2]); const rest=parts[i].replace(m[0],'').trim(); if(rest) parts[i]=rest; else parts.splice(i,1); break; } }
    if(parts.length>1&&COUNTIES.some(c=>c.toLowerCase()===parts[parts.length-1].toLowerCase())) a.county=parts.pop();
    if(parts.length>1) a.city=parts.pop();
    // "Unit 4" + "The Tannery" read better together
    if(parts.length>2&&/^(unit|suite|flat|floor|apartment|studio)\b/i.test(parts[0])){ parts[0]=parts[0]+', '+parts[1]; parts.splice(1,1); }
    a.addr1=parts.shift()||''; a.addr2=parts.join(', ');
    if(!a.addr1&&a.city){ a.addr1=a.city; a.city=''; }
    return a; }
  const has=r=>r&&KEYS.some(k=>k!=='country'&&r[k]);
  const pick=r=>{ const a=empty(); KEYS.forEach(k=>{ if(r&&r[k]) a[k]=r[k]; }); return a; };
  const of=r=>has(r)?pick(r):parse(r&&(r.address||r.addressText)||'');
  const lines=a=>{ a=of(a); const c=a.country&&a.country!==UK?a.country:''; return [a.addr1,a.addr2,[a.city,a.county].filter(Boolean).join(', '),a.postcode,c].filter(Boolean); };
  const text=a=>lines(a).join(', ');
  function normalise(r){ if(!r||has(r)) return r; const a=parse(r.address||''); if(a.addr1||a.postcode) Object.assign(r,a); return r; }
  function validate(a,label){ const e=[], p=label?label+': ':''; if(!String(a.addr1||'').trim()) e.push(p+'add the first line of the address.'); if(!String(a.city||'').trim()) e.push(p+'add the town or city.');
    if((a.country||UK)===UK){ if(!String(a.postcode||'').trim()) e.push(p+'add the postcode.'); else if(!PC.test(a.postcode)) e.push(p+'the postcode doesn’t look right.'); } return e; }

  let n=0;
  function fieldsHTML(a,opts){ a=Object.assign(empty(),a||{}); opts=opts||{}; const id='ad'+(++n), req=opts.required!==false;
    return `<div class="ad" data-ad="${id}">
      ${opts.find===false?'':`<div class="ad-find"><input data-adfind placeholder="Find address: enter a UK postcode" aria-label="Find address by postcode" value=""><button type="button" class="ad-fbtn" data-adgo>Find</button></div><div class="ad-res" data-adres hidden></div>`}
      <div class="ad-grid">${F.map(([k,l,r])=>{ const star=req&&r&&(k!=='postcode'||a.country===UK)?' <em>*</em>':'';
        if(k==='country') return `<label class="ad-f"><span>${l}${star}</span><select data-adk="country">${COUNTRIES.concat(COUNTRIES.includes(a.country)?[]:[a.country]).map(c=>`<option${c===a.country?' selected':''}>${esc(c)}</option>`).join('')}</select></label>`;
        return `<label class="ad-f${k==='addr1'||k==='addr2'?' w':''}"><span>${l}${star}</span><input data-adk="${k}" value="${esc(a[k])}"${k==='postcode'?' autocapitalize="characters"':''} autocomplete="${({addr1:'address-line1',addr2:'address-line2',city:'address-level2',county:'address-level1',postcode:'postal-code'})[k]}"></label>`; }).join('')}</div></div>`; }
  function read(root){ const box=root.matches&&root.matches('[data-ad]')?root:root.querySelector('[data-ad]'); const a=empty(); if(!box) return a;
    box.querySelectorAll('[data-adk]').forEach(i=>a[i.dataset.adk]=i.value.trim()); if(a.postcode&&a.country===UK) a.postcode=fmtPC(a.postcode); return a; }
  const STREETS=['High Street','Station Road','Church Lane','Mill Lane','Park Road','Victoria Street','Market Place'];
  function lookup(pc){ return fetch('https://api.postcodes.io/postcodes/'+encodeURIComponent(fmtPC(pc))).then(r=>r.json()).then(j=>j&&j.result?j.result:null).catch(()=>null); }
  function wire(root){ (root.matches&&root.matches('[data-ad]')?[root]:[...root.querySelectorAll('[data-ad]')]).forEach(box=>{ if(box._w) return; box._w=1;
    const fi=box.querySelector('[data-adfind]'), res=box.querySelector('[data-adres]'), set=(k,v)=>{ const i=box.querySelector(`[data-adk="${k}"]`); if(i){ i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); } };
    const pcIn=box.querySelector('[data-adk="postcode"]'); if(pcIn) pcIn.addEventListener('blur',()=>{ const c=box.querySelector('[data-adk="country"]'); if(!c||c.value===UK) pcIn.value=fmtPC(pcIn.value); });
    const cSel=box.querySelector('[data-adk="country"]'); if(cSel) cSel.addEventListener('change',()=>{ const f=box.querySelector('.ad-find'); if(f) f.hidden=cSel.value!==UK; if(res&&cSel.value!==UK) res.hidden=true; });
    if(!fi) return;
    const go=()=>{ const v=fi.value.trim(); if(!PC.test(v)){ res.hidden=false; res.innerHTML='<p class="ad-msg">Enter a full UK postcode, e.g. LS3 1HS.</p>'; return; }
      res.hidden=false; res.innerHTML='<p class="ad-msg">Looking up '+esc(fmtPC(v))+'…</p>';
      lookup(v).then(r=>{ if(!r){ res.innerHTML=`<p class="ad-msg">We couldn’t find ${esc(fmtPC(v))}. Check it, or type the address below.</p>`; return; }
        const town=r.post_town||r.admin_district||'', county=r.admin_county||(r.region&&r.region!=='London'?'':'')||'', pc=r.postcode;
        const seed=[...pc].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7), st=STREETS[seed%STREETS.length], opts=[1,2,3,5,7,8,11,12].map(x=>x+(seed%20));
        res.innerHTML=`<p class="ad-msg">${opts.length} addresses in ${esc(pc)} · sample addresses in the prototype</p><div class="ad-list">${opts.map(no=>`<button type="button" data-adpick="${no} ${esc(st)}">${no} ${esc(st)}, ${esc(town)}</button>`).join('')}<button type="button" class="ad-man" data-adpick="">My address isn’t listed</button></div>`;
        res.querySelectorAll('[data-adpick]').forEach(b=>b.onclick=()=>{ set('country',UK); set('addr1',b.dataset.adpick); if(b.dataset.adpick) set('addr2',''); set('city',town); set('county',county); set('postcode',pc); res.hidden=true; fi.value='';
          const f=box.querySelector(b.dataset.adpick?'[data-adk="addr2"]':'[data-adk="addr1"]'); if(f) f.focus(); }); }); };
    box.querySelector('[data-adgo]').onclick=go; fi.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } }); }); }

  const css=`.ad{display:flex;flex-direction:column;gap:10px;}
  .ad-find{display:flex;gap:6px;} .ad-find[hidden]{display:none;} .ad-find input{flex:1;min-width:0;font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;text-transform:uppercase;} .ad-find input::placeholder{text-transform:none;}
  .ad-find input:focus,.ad-f input:focus,.ad-f select:focus{outline:0;border-color:var(--periwinkle-deep);box-shadow:0 0 0 2px var(--tint-peri);}
  .ad-fbtn{font:inherit;font-size:13.5px;font-weight:700;border:0;border-radius:10px;padding:9px 16px;background:var(--ink);color:#fff;cursor:pointer;white-space:nowrap;}
  .ad-res{background:#fff;border:1px solid var(--line-soft);border-radius:12px;padding:8px;} .ad-res[hidden]{display:none;} .ad-msg{margin:2px 4px 6px;font-size:12px;color:var(--muted);}
  .ad-list{display:flex;flex-direction:column;max-height:210px;overflow:auto;} .ad-list button{border:0;background:none;font:inherit;font-size:13.5px;text-align:left;padding:8px 8px;border-radius:8px;cursor:pointer;color:var(--ink);} .ad-list button:hover{background:var(--tint-peri);}
  .ad-list .ad-man{color:var(--periwinkle-deep);font-weight:700;border-top:1px solid var(--paper-2);border-radius:0 0 8px 8px;}
  .ad-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;} @media(max-width:560px){.ad-grid{grid-template-columns:1fr;}} .ad-f.w{grid-column:1/-1;}
  .ad-f{display:flex;flex-direction:column;gap:5px;min-width:0;} .ad-f>span{font-size:12.5px;font-weight:700;color:var(--ink-2);} .ad-f>span em{color:#c0392b;font-style:normal;}
  .ad-f input,.ad-f select{font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;color:var(--ink);width:100%;min-width:0;}`;
  const st=document.createElement('style'); st.textContent=css; (document.head||document.documentElement).appendChild(st);

  // bring any loaded seed data onto the new fields
  function sweep(){ const D=window.ORG_DATA; if(D) ['customers','suppliers'].forEach(k=>(D[k]||[]).forEach(normalise)); const A=window.ADMIN; if(A) ['distributors','suppliers'].forEach(k=>(A[k]||[]).forEach(normalise)); }
  sweep(); document.readyState==='loading'&&document.addEventListener('DOMContentLoaded',sweep);
  return {KEYS,FIELDS:F,COUNTRIES,UK,parse,of,lines,text,normalise,validate,fieldsHTML,read,wire,fmtPC,empty,has};
})();
