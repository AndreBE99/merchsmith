/* ============================================================
   org-profile.js — one ORGANISATION PROFILE per organisation,
   the same screen for all four types (Sep 2026).

   Each organisation owns its record: only its own admins edit it
   (Merchsmith operators can also edit any, to support/overrule).
   Everywhere the organisation appears reads from here.

   Org keys follow the demo's one-organisation-per-role model:
     merchsmith · distributor (Mojo) · customer (Citrix) · supplier
   The full logo WRITES THROUGH to the keys the header lockup
   already reads (ms-brand-logo / ms-cust-logo / ms-sup-logo /
   ms-ms-logo), so Branding and Profile never disagree.

   window.MSORG:
     key()            this user's org key
     get(k) / set(k,patch)
     name(k)          trading name, falling back to the seeded name
     canEdit(k)
     logoSq(k,size)   square logo (or initials) as HTML
     panelHTML(k) / wire(el,k,onSave)
   Emits 'ms-org-updated' on window with {detail:{key}}.
   ============================================================ */
window.MSORG=(function(){
  const KEY='ms-org-profiles';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // Full logo = the SAME key each org's existing logo tool already writes. Where a
  // richer editor exists (crop, tone, PDF logo) the profile shows the logo and links
  // to it rather than offering a second uploader — one editor per logo.
  const LOGOKEY={merchsmith:'ms-platform-logo',distributor:'ms-brand-logo',customer:'ms-cust-logo',supplier:'ms-sup-logo'};
  const TONEKEY={merchsmith:'ms-platform-logo-tone',distributor:'ms-brand-logo-tone',customer:'ms-cust-logo-tone'};
  const MANAGED={
    distributor:{label:'Change in Branding',all:true,go(){ const t=document.querySelector('.settab[data-panel="branding"]'); if(t) t.click(); }},
  };
  const FAVKEY='ms-platform-favicon';
  const fav=()=>{ try{ return localStorage.getItem(FAVKEY)||''; }catch(e){ return ''; } };
  function applyFav(){ const u=(window.MSFavPick&&MSFavPick())||fav()||'favicon.svg'; let l=document.querySelector('link[rel="icon"]'); if(!l){ l=document.createElement('link'); l.rel='icon'; document.head.appendChild(l); } l.type=/^data:image\/svg|\.svg$/.test(u)?'image/svg+xml':'image/png'; l.href=u; }
  function toneOf(k){ try{ return (TONEKEY[k]&&localStorage.getItem(TONEKEY[k]))||'original'; }catch(e){ return 'original'; } }
  const toneCss=t=>t==='white'?'filter:brightness(0) invert(1);':t==='black'?'filter:brightness(0);':'';
  const TYPE={merchsmith:'Platform operator',distributor:'Distributor',customer:'Customer',supplier:'Supplier'};
  const ACC={merchsmith:'#3C4279',distributor:'#ec018c',customer:'#51768c',supplier:'#2f8f5b'};
  const SEED={
    merchsmith:{tradingName:'Merchsmith',legalName:'Merchsmith Ltd',companyNo:'14827391',vat:'GB 412 7390 21',
      address:'Unit 4, The Tannery\n91 Kirkstall Road\nLeeds LS3 1HS',website:'merchsmith.com',
      contactName:'Morgan Slade',contactEmail:'ops@merchsmith.com',phone:'0113 496 0214',
      about:'The platform behind branded merchandise ordering for distributors, their customers and suppliers.'},
    distributor:{tradingName:'Mojo Promotions',legalName:'Mojo Promotions Ltd',companyNo:'06715832',vat:'GB 947 1203 55',
      address:'12 Pritchard Street\nBristol BS2 8RH',website:'mojopromotions.co.uk',
      contactName:'Jess Doyle',contactEmail:'hello@mojopromotions.co.uk',phone:'0117 330 6120',
      about:'Sustainable promotional merchandise, branded in-house and delivered on time.'},
    customer:{tradingName:'Citrix',legalName:'Citrix Systems UK Ltd',companyNo:'03040613',vat:'GB 690 3718 44',
      address:'Chalfont Park\nGerrards Cross SL9 0BG',website:'citrix.com',
      contactName:'Sara Kemp',contactEmail:'brand@citrix.com',phone:'01753 276 200',
      about:'Secure digital workspace software for organisations of every size.'},
    supplier:{tradingName:'BagWorks UK',legalName:'BagWorks UK Ltd',companyNo:'09182740',vat:'GB 221 8049 17',
      address:'Arkwright Way\nPreston PR1 8SB',website:'bagworks.co.uk',
      contactName:'Tom Reed',contactEmail:'orders@bagworks.co.uk',phone:'01772 830 441',
      about:'Cotton, jute and recycled bags made to order, with in-house print.'}
  };
  const FIELDS=[
    ['tradingName','Trading name','text'],['legalName','Legal name','text'],
    ['companyNo','Company number','text'],['vat','VAT number','text'],
    ['website','Website','text'],['phone','Phone','text'],
    ['contactName','Main contact','text'],['contactEmail','Contact email','email'],
    ['address','Registered address','area'],['about','About','area']];

  // ONE record per organisation: the people store's org record (people.js orgs[orgKey]),
  // which Platform Admin's "Edit organisation" window also edits. KEY is only read once,
  // to carry over profiles saved before the two were merged.
  const ORGKEY={merchsmith:'merchsmith',distributor:'dist:acme',customer:'citrix',supplier:'bagworks'};
  const P=()=>window.MSPEOPLE;
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){ return {}; } };
  const REC={};   // live org objects handed to the editor, one per key
  function baseRecord(k){
    if(k==='distributor'&&window.ADMIN) return (ADMIN.distributors||[]).find(d=>d.id==='acme')||null;
    if(k==='customer'&&window.ORG_DATA) return (ORG_DATA.customers||[]).find(c=>c.id==='citrix')||null;
    if(k==='supplier'&&window.ORG_DATA) return (ORG_DATA.suppliers||[]).find(s=>s.id==='bagworks')||null;
    return null; }
  function rec(k){
    if(!REC[k]){ const s=SEED[k]||{}, b=baseRecord(k);
      const r=REC[k]={};
      if(b) ['name','initials','domain','region','address','addresses','addr1','addr2','city','county','postcode','country','companyNo','logo','legalName','vat','website','phone','contactName','contactEmail','about'].forEach(f=>{ if(b[f]!=null&&b[f]!=='') r[f]=Array.isArray(b[f])?b[f].map(x=>Object.assign({},x)):b[f]; });
      if(!r.name) r.name=s.tradingName;
      if(!b){ r.address=(s.address||'').replace(/\n/g,', '); if(window.MSADDR) Object.assign(r,MSADDR.parse(s.address||'')); r.domain=s.website; }   // Merchsmith has no other record
      // profile-only fields: seed values, then anything saved before the merge
      // Merchsmith has no other record, so its details come from the local seed; everyone else's come only from their real record
      if(!b) ['legalName','companyNo','vat','website','phone','contactName','contactEmail','about'].forEach(f=>{ if(r[f]==null||r[f]==='') r[f]=s[f]; });
      const old=load()[k]; if(old){ ['legalName','vat','website','phone','contactName','contactEmail','about'].forEach(f=>{ if(old[f]) r[f]=old[f]; }); if(old.logoSq&&!r.logo) r.logo=old.logoSq; } }
    if(P()) P().hydrateOrg(ORGKEY[k],REC[k]);
    return REC[k]; }
  function key(){ const r=(window.MSID&&MSID.current&&MSID.current())||'distributor'; return r==='admin'?'merchsmith':r; }
  function get(k){ const r=rec(k); const out=Object.assign({},r,{tradingName:r.name,logoSq:r.logo||''});
    if(P()&&P().addrText){ const t=P().addrText(r); out.addressText=Array.isArray(t)?t.filter(Boolean).join(', '):(t||''); }
    try{ out.logoFull=localStorage.getItem(LOGOKEY[k])||''; }catch(e){ out.logoFull=''; }
    return out; }
  function set(k,patch){ const f={}; Object.keys(patch).forEach(x=>{ if(x==='logoFull') return; f[x==='tradingName'?'name':x==='logoSq'?'logo':x]=patch[x]; });
    if(Object.keys(f).length&&P()) P().saveOrg(ORGKEY[k],rec(k),f);
    if('logoFull' in patch){ try{ patch.logoFull?localStorage.setItem(LOGOKEY[k],patch.logoFull):localStorage.removeItem(LOGOKEY[k]); }catch(e){} }
    window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:k}})); }
  const name=k=>{ const r=rec(k); return r.name||(SEED[k]||{}).tradingName||''; };
  function canEdit(k){
    const me=key(); if(me==='merchsmith') return true;           // operator can support any org
    if(me!==k) return false;
    const role=((window.MSID&&MSID.get&&MSID.get())||{}).role||'';
    return /admin|owner|operator/i.test(role);
  }
  function initials(n){ return String(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
  function logoSq(k,size){ const s=size||40, p=get(k);
    return p.logoSq?`<span class="op-sq" style="width:${s}px;height:${s}px"><img src="${esc(p.logoSq)}" alt=""></span>`
      :`<span class="op-sq op-init" style="width:${s}px;height:${s}px;background:${ACC[k]||'#5860A6'};font-size:${Math.round(s*.36)}px">${esc(initials(name(k)))}</span>`; }

  // downscale uploads so the record fits in localStorage
  function readLogo(file,max){ return new Promise((res,rej)=>{
    if(!file) return rej(); if(file.size>5*1024*1024) return rej(new Error('Logos over 5 MB can’t be stored here'));
    const r=new FileReader(); r.onload=()=>{
      if(/svg/.test(file.type)) return res(r.result);
      const img=new Image(); img.onload=()=>{ const k=Math.min(1,max/Math.max(img.width,img.height));
        const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height); res(c.toDataURL('image/png')); };
      img.onerror=()=>rej(new Error('That file isn’t an image')); img.src=r.result; };
    r.readAsDataURL(file); }); }

  function panelHTML(k){
    const p=get(k), ed=canEdit(k), mine=key()===k;
    const who=mine?'your organisation':name(k);
    return `<div class="op" data-op="${esc(k)}">
      <div class="op-hd">
        ${logoSq(k,64)}
        <div class="op-hdt"><h2>${esc(name(k))}</h2><span>${esc(TYPE[k]||'')}${p.website?' · '+esc(p.website):''}</span></div>
        ${ed?'':'<span class="op-ro">View only</span>'}
      </div>
      <p class="op-lede">${ed?`This is how ${esc(who)} appears across the platform — in the header, organisation lists, chat and on invoices. ${mine?'Only your organisation’s admins can change it.':'You are editing on Merchsmith’s behalf.'}`
        :'Only this organisation’s admins can change these details. Ask an admin on your team if something is out of date.'}</p>

      ${MANAGED[k]&&MANAGED[k].all?`<div class="op-lstrip">
        <div class="op-drop sq">${p.logoSq?`<img src="${esc(p.logoSq)}" alt="">`:`<span>${esc(initials(name(k)))}</span>`}</div>
        <div class="op-drop full${toneOf(k)==='white'?' dark':''}">${p.logoFull?`<img src="${esc(p.logoFull)}" alt="" style="${toneCss(toneOf(k))}">`:`<span class="op-wm">${esc(name(k))}</span>`}</div>
        <div class="op-lst"><b>Logos</b><span>Square, header and PDF logos are all managed in Branding.</span>${ed?`<button class="op-btn" data-opmanage>${MANAGED[k].label} →</button>`:''}</div>
      </div>`:`<div class="op-logos">
        <div class="op-logo">
          <span class="op-lbl">Square logo</span>
          <div class="op-drop sq">${p.logoSq?`<img src="${esc(p.logoSq)}" alt="">`:`<span>${esc(initials(name(k)))}</span>`}</div>
          <span class="op-hint">Used in lists, chat and avatars. Square, at least 256 × 256 px.</span>
          ${ed?`<div class="op-lacts"><label class="op-btn">Upload<input type="file" accept="image/*" data-oplogo="logoSq" hidden></label>${p.logoSq?'<button class="op-link" data-oprm="logoSq">Remove</button>':''}</div>`:''}
        </div>
        <div class="op-logo">
          <span class="op-lbl">Full logo</span>
          <div class="op-drop full${toneOf(k)==='white'?' dark':''}">${p.logoFull?`<img src="${esc(p.logoFull)}" alt="" style="${toneCss(toneOf(k))}">`:`<span class="op-wm">${esc(name(k))}</span>`}</div>
          ${k==='merchsmith'||k==='customer'?`<span class="op-hint">Used in the site header and on PDFs (proofs, quotes and invoices). Wide, transparent PNG or SVG, around 320 × 80 px.</span>`:`<span class="op-hint">Used in the header. ${MANAGED[k]?'Cropping, tone and the PDF version are managed with your other logos.':'Wide, transparent PNG or SVG, around 320 × 80 px.'}</span>`}
          ${ed?(MANAGED[k]?`<div class="op-lacts"><button class="op-btn" data-opmanage>${MANAGED[k].label} →</button></div>`
            :`${(k==='merchsmith'||k==='customer')&&p.logoFull?`<div class="op-tone" role="radiogroup" aria-label="Logo tone"><span>Tone</span>${[['original','Original'],['white','Mono white'],['black','Mono black']].map(([v,l])=>`<button type="button" role="radio" aria-checked="${toneOf(k)===v}" class="${toneOf(k)===v?'on':''}" data-optone="${v}">${l}</button>`).join('')}</div>`:''}<div class="op-lacts"><label class="op-btn">Upload<input type="file" accept="image/*" data-oplogo="logoFull" hidden></label>${p.logoFull?'<button class="op-link" data-oprm="logoFull">Remove</button>':''}</div>`):''}
        </div>
        ${k==='merchsmith'?`<div class="op-logo">
          <span class="op-lbl">Favicon</span>
          <div class="op-drop fav">${fav()?`<img src="${esc(fav())}" alt="">`:'<img src="favicon.svg" alt="">'}</div>
          <span class="op-hint">Shown in the browser tab, bookmarks and home-screen shortcuts across the platform. Square PNG or SVG, at least 64 × 64 px.</span>
          ${ed?`<div class="op-lacts"><label class="op-btn">Upload<input type="file" accept="image/*" data-opfav hidden></label>${fav()?'<button class="op-link" data-opfavrm>Remove</button>':''}</div>`:''}`:''}
        </div>
      </div>`}

      <div class="op-view">${VIEW.filter(([f])=>f!=='contactPhone'||p.contactPhone).map(([f,l,wide])=>{ const v=f==='address'?(p.addressText||p.address):f==='contactName'&&p.contactName&&p.contactTitle?p.contactName+' · '+p.contactTitle:p[f];
        return `<div class="op-vr${wide?' wide':''}"><span>${l}</span><b>${v?esc(v).replace(/\n/g,'<br>'):'<i>Not set</i>'}</b></div>`; }).join('')}</div>
      ${ed?`<div class="op-foot"><span class="op-saved" hidden>Saved</span><button class="op-save" data-opedit>Edit organisation</button></div>`:''}
    </div>`;
  }

  // the organisation's own people, for the Main contact picker (saved edits + invites overlaid)
  const PKEY={merchsmith:'merchsmith',distributor:'mojo',customer:'citrix',supplier:'bagworks'};   // the key the Team / Users pages store people under
  function peopleOf(k){ const D=window.ORG_DATA||{}; let teams=[];
    try{ if(k==='distributor') teams=JSON.parse(JSON.stringify(D.mojoTeams||[]));
      else if(k==='customer') teams=JSON.parse(JSON.stringify(((D.customers||[]).find(c=>c.id==='citrix')||{}).teams||[]));
      else if(k==='supplier') teams=[{name:'Contacts',users:JSON.parse(JSON.stringify(((D.suppliers||[]).find(s=>s.id==='bagworks')||{}).contacts||[]))}];
      if(P()&&P().hydrate&&teams.length) P().hydrate(PKEY[k],teams); }catch(e){}
    return teams.flatMap(t=>(t.users||[]).map(u=>Object.assign({_team:t.name},u))); }
  const VIEW=[['name','Trading name'],['legalName','Legal name'],['companyNo','Company number'],['vat','VAT number'],
    ['domain','Domain'],['website','Website'],['phone','Phone'],['region','Region'],['contactName','Main contact'],['contactEmail','Contact email'],['contactPhone','Contact phone'],
    ['address','Default address',true],['about','About',true]];
  function wire(el,k,onSave){
    if(!el) return;
    const redraw=()=>{ el.innerHTML=panelHTML(k); wire(el,k,onSave); };
    el.querySelectorAll('[data-oplogo]').forEach(inp=>inp.onchange=async()=>{
      const f=inp.dataset.oplogo;
      try{ const url=await readLogo(inp.files[0],f==='logoSq'?512:900); set(k,{[f]:url}); redraw(); if(onSave) onSave(); }
      catch(e){ if(e&&e.message) alert(e.message); } });
    const fi=el.querySelector('[data-opfav]'); if(fi) fi.onchange=async()=>{ try{ const url=await readLogo(fi.files[0],128); localStorage.setItem(FAVKEY,url); applyFav(); redraw(); if(onSave) onSave(); }catch(e){ if(e&&e.message) alert(e.message); } };
    const fr=el.querySelector('[data-opfavrm]'); if(fr) fr.onclick=()=>{ try{ localStorage.removeItem(FAVKEY); }catch(e){} applyFav(); redraw(); if(onSave) onSave(); };
    el.querySelectorAll('[data-optone]').forEach(b=>b.onclick=()=>{ try{ localStorage.setItem(TONEKEY[k],b.dataset.optone); }catch(e){} window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:k}})); redraw(); if(onSave) onSave(); });
    el.querySelectorAll('[data-oprm]').forEach(b=>b.onclick=()=>{ set(k,{[b.dataset.oprm]:''}); redraw(); if(onSave) onSave(); });
    const eo=el.querySelector('[data-opedit]');
    if(eo) eo.onclick=()=>{ if(!P()) return; P().editOrg(ORGKEY[k],rec(k),()=>{ window.dispatchEvent(new CustomEvent('ms-org-updated',{detail:{key:k}})); redraw(); if(onSave) onSave(); },
      [{k:'region',label:'Region'}],{companyNo:true,people:peopleOf(k),peopleKey:PKEY[k],orgType:k==='merchsmith'?'merchsmith':k}); };
    const sv=el.querySelector('[data-opsave]');
    if(sv) sv.onclick=()=>{ const patch={};
      el.querySelectorAll('[data-opf]').forEach(i=>patch[i.dataset.opf]=i.value.trim());
      if(!patch.tradingName){ alert('Trading name can’t be empty'); return; }
      set(k,patch); redraw(); const s=el.querySelector('.op-saved'); if(s){ s.hidden=false; setTimeout(()=>s.hidden=true,1800); }
      if(onSave) onSave(); };
    const rs=el.querySelector('[data-opreset]'); if(rs) rs.onclick=redraw;
    const mg=el.querySelector('[data-opmanage]'); if(mg&&MANAGED[k]) mg.onclick=()=>MANAGED[k].go();
  }

  const css=`
  .op{background:#fff;border:1px solid var(--line-soft);border-radius:16px;padding:22px 24px;max-width:980px;}
  .op-hd{display:flex;align-items:center;gap:15px;margin-bottom:10px;}
  .op-hdt h2{font-family:var(--serif);font-weight:500;font-size:24px;margin:0 0 2px;}
  .op-hdt span{font-size:12.5px;color:var(--ink-3);font-weight:700;}
  .op-ro{margin-left:auto;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);background:var(--paper-2);border-radius:999px;padding:4px 10px;}
  .op-lede{font-size:13.5px;color:var(--ink-2);line-height:1.55;margin:0 0 18px;max-width:72ch;}
  .op-sq{display:inline-grid;place-items:center;border-radius:12px;overflow:hidden;flex:none;background:#fff;border:1px solid var(--line-soft);}
  .op-sq img{width:100%;height:100%;object-fit:contain;}
  .op-init{color:#fff;font-weight:800;border:0;}
  .op-lstrip{display:grid;grid-template-columns:72px 200px minmax(0,1fr);gap:14px;align-items:center;border:1px solid var(--line-soft);border-radius:13px;padding:12px 14px;margin-bottom:18px;}
  .op-lstrip .op-drop{height:72px;} .op-lstrip .op-drop.sq{width:72px;} .op-lstrip .op-drop.sq span{font-size:22px;} .op-lstrip .op-drop.full{width:auto;min-width:0;} .op-lstrip .op-drop.dark{background:var(--periwinkle-ink,#3C4279)!important;} .op-lst{display:flex;flex-direction:column;gap:3px;align-items:flex-start;} .op-lst b{font-size:14px;} .op-lst span{font-size:12.5px;color:var(--muted);} .op-lst .op-btn{margin-top:6px;}
  @media(max-width:640px){.op-lstrip{grid-template-columns:72px minmax(0,1fr);} .op-lstrip .op-lst{grid-column:1/-1;}}
  .op-logos{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px;margin-bottom:18px;}
  @media(max-width:760px){.op-logos{grid-template-columns:1fr;}}
  .op-logo{border:1px solid var(--line-soft);border-radius:13px;padding:14px;display:flex;flex-direction:column;gap:8px;}
  .op-lbl{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);}
  .op-drop{height:110px;border-radius:10px;background:var(--paper);display:grid;place-items:center;overflow:hidden;}
  .op-drop.sq{width:110px;}
  .op-drop.dark{background:var(--periwinkle-ink,#3C4279);}
  .op-drop img{max-width:100%;max-height:100%;object-fit:contain;padding:8px;}
  .op-drop span{font-weight:800;font-size:30px;color:var(--ink-3);}
  .op-drop .op-wm{font-family:var(--serif);font-weight:500;font-size:24px;}
  .op-hint{font-size:11.5px;color:var(--ink-3);line-height:1.45;}
  .op-lacts{display:flex;align-items:center;gap:10px;}
  .op-drop.fav{width:88px;height:88px;} .op-drop.fav img{width:48px;height:48px;object-fit:contain;}
  .op-tone{display:flex;align-items:center;gap:6px;flex-wrap:wrap;} .op-tone>span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin-right:2px;}
  .op-tone button{font:inherit;font-size:12.5px;font-weight:700;border:1.5px solid var(--line-soft);background:#fff;color:var(--ink-2);border-radius:999px;padding:5px 11px;cursor:pointer;} .op-tone button.on{border-color:var(--periwinkle-deep);background:var(--tint-peri,#eceefb);color:var(--periwinkle-deep);}
  .op-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;}
  @media(max-width:760px){.op-grid{grid-template-columns:1fr;}}
  .op-f{display:flex;flex-direction:column;gap:5px;}
  .op-f.wide{grid-column:1/-1;}
  .op-f span{font-size:11.5px;font-weight:800;color:var(--ink-2);}
  .op-f input,.op-f textarea{font:inherit;font-size:13.5px;color:var(--ink);border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 11px;background:#fff;resize:vertical;}
  .op-f input:focus,.op-f textarea:focus{outline:0;border-color:var(--periwinkle);}
  .op-f [readonly]{background:var(--paper);color:var(--ink-2);}
  .op-foot{display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:16px;border-top:1px solid var(--line-soft);}
  .op-saved{font-size:12.5px;font-weight:800;color:var(--green-deep,#1c7a5e);margin-right:auto;}
  .op-btn{font:inherit;font-size:12.5px;font-weight:800;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:9px;padding:7px 14px;cursor:pointer;}
  .op-btn:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
  .op-link{font:inherit;font-size:12px;font-weight:800;color:#b92a17;background:none;border:0;cursor:pointer;text-decoration:underline;}
  .op-save{font:inherit;font-size:13px;font-weight:800;color:#fff;background:var(--periwinkle-deep);border:0;border-radius:9px;padding:9px 18px;cursor:pointer;}
  .op-save:hover{filter:brightness(.92);}
  .op-view{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 22px;}
  @media(max-width:760px){.op-view{grid-template-columns:1fr;}}
  .op-vr{display:flex;flex-direction:column;gap:3px;padding-bottom:10px;border-bottom:1px solid var(--paper-2);}
  .op-vr.wide{grid-column:1/-1;}
  .op-vr span{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);}
  .op-vr b{font-size:13.5px;font-weight:600;color:var(--ink);line-height:1.5;}
  .op-vr i{font-style:normal;color:var(--ink-3);font-weight:600;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  return {key,get,set,name,canEdit,logoSq,panelHTML,wire,TYPE,ORGKEY,readLogo};
})();
