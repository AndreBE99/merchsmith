/* ============================================================
   store-domain.js — custom domains for distributor storefronts.

   Every store is always reachable at its platform address
   (<slug>.merchsmith.store). A distributor can connect their own
   domain: they add one CNAME (+ one TXT for ownership), the platform
   checks DNS, issues SSL, and the store goes live on it.

   PROTOTYPE: there is no DNS. "Check now" simulates the lookup:
   pending → verifying (records found) → live (certificate issued).
   Real version = backend + a host that does custom-domain SSL
   (Cloudflare for SaaS / Vercel / Render). See HANDOVER.md.

   window.MSDOMAIN:
     get(id) / all()            saved record {host,status,addedAt,checkedAt,error,token}
     platformHost(d)            e.g. mojo-promotions.merchsmith.store
     records(rec)               DNS records to add
     add(id,host) / check(id) / remove(id)
     validate(host)             '' or an error message
     STATUS                     id → {label,cls}
     distributorPanel(el,d)     full Settings → Domain tab
     adminSection(d)            HTML for the Platform Admin drawer
     wireAdmin(root,d,onChange)
     chip(d)                    small status chip for tables
   ============================================================ */
window.MSDOMAIN=(function(){
  const KEY='ms-store-domains';
  const TARGET='stores.merchsmith.com', PLATFORM='merchsmith.store';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const load=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } };
  const save=o=>{ try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} };
  const tok=()=>Math.random().toString(36).slice(2,10)+Math.random().toString(36).slice(2,6);
  const ago=d=>new Date(Date.now()-d*864e5).toISOString();
  // seeded once so Platform Admin has a realistic spread of states
  function seed(){
    return {
      acme:{host:'shop.mojopromotions.com',status:'live',addedAt:ago(420),checkedAt:ago(0.02),token:tok()},
      brightside:{host:'store.brightsidepromo.com',status:'live',addedAt:ago(300),checkedAt:ago(0.1),token:tok()},
      northstar:{host:'merch.northstarbrand.com',status:'live',addedAt:ago(600),checkedAt:ago(0.2),token:tok()},
      kober:{host:'shop.kober-werbung.de',status:'verifying',addedAt:ago(0.2),checkedAt:ago(0.01),token:tok()},
      limelight:{host:'store.limelightgifts.ie',status:'pending',addedAt:ago(3),checkedAt:ago(0.05),token:tok()},
      pinnacle:{host:'shop.pinnacleswag.com',status:'error',addedAt:ago(40),checkedAt:ago(0.3),token:tok(),error:'The CNAME record points to an old host (shops.oldplatform.io). Change it to '+TARGET+'.'},
      verde:{host:'store.verdeeco.es',status:'live',addedAt:ago(200),checkedAt:ago(0.1),token:tok()},
      tartan:{host:'shop.tartantrade.co.uk',status:'live',addedAt:ago(150),checkedAt:ago(0.4),token:tok()},
      cobalt:{host:'merch.cobaltstudio.com',status:'live',addedAt:ago(500),checkedAt:ago(40),token:tok()}
    }; }
  function db(){ let o=load(); if(!o){ o=seed(); save(o); } return o; }
  const STATUS={
    none:{label:'Not connected',cls:'none'},
    pending:{label:'Waiting for DNS',cls:'pending'},
    verifying:{label:'Verifying',cls:'verifying'},
    live:{label:'Live',cls:'live'},
    error:{label:'Needs fixing',cls:'error'}};
  const slug=s=>String(s||'store').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const platformHost=d=>slug(d&&d.name)+'.'+PLATFORM;
  const get=id=>db()[id]||null;
  const statusOf=id=>{ const r=get(id); return r?r.status:'none'; };
  function split(host){ const p=host.split('.'); const two=/\.(co|org|me|ltd|plc|net|gov|ac)\.[a-z]{2}$/i.test(host);
    const base=p.slice(-(two?3:2)).join('.'); const sub=host.slice(0,Math.max(0,host.length-base.length-1)); return {sub,base}; }
  function records(rec){ if(!rec) return []; const {sub,base}=split(rec.host);
    return [
      {type:'CNAME',name:sub||'@',value:TARGET,why:'Points your domain at your store',apex:!sub},
      {type:'TXT',name:'_merchsmith'+(sub?'.'+sub:''),value:'ms-verify='+rec.token,why:'Proves you own '+base}]; }
  function validate(host,id){
    host=String(host||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
    const mine=id&&db()[id]; if(mine&&mine.host===host) return 'That’s already your domain.';
    if(!host) return 'Enter a domain, for example shop.yourcompany.com.';
    if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return 'That doesn’t look like a domain. Use something like shop.yourcompany.com.';
    if(host.endsWith('.'+PLATFORM)||host.endsWith('merchsmith.com')) return 'That’s a Merchsmith address. Enter a domain your company owns.';
    const taken=Object.entries(db()).find(([k,r])=>r.host===host||(r.next&&r.next.host===host)||(k!==id&&r.redirect&&r.redirect.host===host)); if(taken) return host+' is already connected to another store.';
    return ''; }
  const clean=h=>String(h||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'');
  function add(id,host){ const o=db(); const keep=o[id]&&o[id].redirect; o[id]={host:clean(host),status:'pending',addedAt:new Date().toISOString(),checkedAt:null,token:tok()}; if(keep) o[id].redirect=keep; save(o); emit(id); return o[id]; }
  function step(x){ x.checkedAt=new Date().toISOString();
    if(x.status==='pending'||x.status==='error'){ x.status='verifying'; delete x.error; }
    else if(x.status==='verifying'){ x.status='live'; x.liveAt=x.checkedAt; } }
  // a change in progress is checked instead of the live domain; when it goes live the two swap
  // and the old domain redirects to the new one for 90 days (while its records stay in place)
  function check(id){ const o=db(), r=o[id]; if(!r) return null;
    if(r.next){ step(r.next); r.checkedAt=r.next.checkedAt;
      if(r.next.status==='live'){ const old=r.host, n=r.next;
        o[id]={host:n.host,status:'live',addedAt:n.addedAt,checkedAt:n.checkedAt,liveAt:n.liveAt,token:n.token,
          redirect:{host:old,since:n.liveAt,until:new Date(Date.now()+90*864e5).toISOString()},switched:n.liveAt}; } }
    else step(r);
    save(o); emit(id); return o[id]; }
  // live domain → start a change alongside it; anything not live yet is simply replaced
  function change(id,host){ const o=db(), r=o[id]; if(!r||r.status!=='live') return add(id,host);
    r.next={host:clean(host),status:'pending',addedAt:new Date().toISOString(),checkedAt:null,token:tok()}; save(o); emit(id); return r; }
  function cancelChange(id){ const o=db(); if(o[id]){ delete o[id].next; save(o); emit(id); } }
  function stopRedirect(id){ const o=db(); if(o[id]){ delete o[id].redirect; delete o[id].switched; save(o); emit(id); } }
  function remove(id){ const o=db(); delete o[id]; save(o); emit(id); }
  function emit(id){ try{ window.dispatchEvent(new CustomEvent('ms-domain-change',{detail:{id}})); }catch(e){} }
  const when=iso=>{ if(!iso) return 'never'; const m=Math.round((Date.now()-new Date(iso))/6e4);
    if(m<1) return 'just now'; if(m<60) return m+' min ago'; const h=Math.round(m/60); if(h<24) return h+'h ago'; const d=Math.round(h/24); return d+' day'+(d===1?'':'s')+' ago'; };
const fmtDate=iso=>new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const pill=st=>`<span class="dm-pill dm-${STATUS[st].cls}">${STATUS[st].label}</span>`;
  function chip(d){ const st=statusOf(d.id); return st==='none'?'':`<span class="dm-dot dm-${st}" title="Custom domain: ${STATUS[st].label}"></span>`; }
  const copyBtn=v=>`<button type="button" class="dm-copy" data-dmcopy="${esc(v)}" title="Copy">Copy</button>`;
  function recTable(rec){ return `<div class="dm-recs"><div class="dm-rh"><span>Type</span><span>Name / Host</span><span>Value / Points to</span></div>
    ${records(rec).map(x=>`<div class="dm-rr"><b>${x.type}</b><span><code>${esc(x.name)}</code>${copyBtn(x.name)}</span><span><code>${esc(x.value)}</code>${copyBtn(x.value)}</span><em>${esc(x.why)}${x.apex&&x.type==='CNAME'?' · most providers don’t allow a CNAME on the bare domain; use an ALIAS/ANAME record, or a subdomain like shop.':''}</em></div>`).join('')}</div>`; }
  function steps(st){ const order=['pending','verifying','live'], i=st==='error'?0:order.indexOf(st);
    const L=[['Add DNS records','At your domain provider'],['Verify','We find your records'],['Secure & go live','SSL issued automatically']];
    return `<ol class="dm-steps">${L.map(([a,b],k)=>`<li class="${k<i||st==='live'?'done':k===i?(st==='error'?'err':'on'):''}"><i>${k<i||st==='live'?'✓':k+1}</i><div><b>${a}</b><span>${b}</span></div></li>`).join('')}</ol>`; }
  function wireCopy(root){ root.querySelectorAll('[data-dmcopy]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const v=b.dataset.dmcopy;
    (navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).catch(()=>{}).finally(()=>{ b.textContent='Copied'; setTimeout(()=>b.textContent='Copy',1400); }); }); }

  /* ---------- provider help ---------- */
  const PROVIDERS=[
    ['godaddy','GoDaddy',['Sign in and open <b>My Products</b>.','Next to the domain, choose <b>DNS</b> (or <b>Manage DNS</b>).','Select <b>Add New Record</b>, pick <b>CNAME</b>, and paste the Name and Value from above. Leave TTL at the default.','Add the <b>TXT</b> record the same way, then save.']],
    ['123reg','123-Reg',['Sign in and go to <b>Manage domains</b>, then pick the domain.','Open <b>Manage DNS</b> and switch to <b>Advanced DNS</b>.','Add a <b>CNAME</b> row with the Name as the hostname and the Value as the destination.','Add the <b>TXT</b> row, then save changes.']],
    ['cloudflare','Cloudflare',['Open the domain in the Cloudflare dashboard and go to <b>DNS → Records</b>.','Select <b>Add record</b>, choose <b>CNAME</b>, paste the Name and Target.','Set <b>Proxy status</b> to <b>DNS only</b> (grey cloud). The orange cloud stops us issuing your certificate.','Add the <b>TXT</b> record and save.']],
    ['ionos','IONOS',['Go to <b>Domains &amp; SSL</b> and select the domain.','Open the <b>DNS</b> tab and choose <b>Add record</b>.','Pick <b>CNAME</b>, paste the Host name and Points to value, and save.','Add the <b>TXT</b> record the same way.']],
    ['other','Someone else',['Find the <b>DNS</b>, <b>DNS zone</b> or <b>Name servers</b> settings for your domain. Your IT team or web agency may manage this.','Add a <b>CNAME</b> record using the Name and Value above.','Add the <b>TXT</b> record.','Changes usually appear within an hour, occasionally up to 24 hours.']]];
  function helpHTML(){ return `<div class="dm-help"><div class="dm-provs">${PROVIDERS.map(([k,n],i)=>`<button type="button" class="dm-prov${i?'':' on'}" data-dmprov="${k}">${n}</button>`).join('')}</div>
    ${PROVIDERS.map(([k,n,s],i)=>`<ol class="dm-howto" data-dmhow="${k}"${i?' hidden':''}>${s.map(x=>`<li>${x}</li>`).join('')}</ol>`).join('')}</div>`; }
  function wireHelp(root){ root.querySelectorAll('[data-dmprov]').forEach(b=>b.onclick=()=>{ root.querySelectorAll('[data-dmprov]').forEach(x=>x.classList.toggle('on',x===b));
    root.querySelectorAll('[data-dmhow]').forEach(o=>o.hidden=o.dataset.dmhow!==b.dataset.dmprov); }); }

  /* ---------- distributor: Settings → Domain ---------- */
  function distributorPanel(el,d){
    const PROTO='<p class="dm-proto">Prototype: <b>Check now</b> simulates the DNS lookup. Each check moves the domain to the next stage.</p>';
    const draw=()=>{ const rec=get(d.id), st=rec?(rec.next?'live':rec.status):'none', ph=platformHost(d);
      el.innerHTML=`
      <div class="card">
        <div class="card-h"><h2>Store address</h2><span class="tag">Always on</span></div>
        <p class="lede">Your store is always available at this Merchsmith address, even while a custom domain is being set up. Once your own domain is live, visitors here are redirected to it.</p>
        <div class="dm-addr"><code>https://${esc(ph)}</code>${copyBtn('https://'+ph)}<a class="dm-open" href="Merchsmith Store.html" target="_blank" rel="noopener">Open store ↗</a></div>
      </div>
      <div class="card">
        <div class="card-h"><h2>Custom domain</h2>${pill(st)}</div>
        ${!rec?`<p class="lede">Use your own web address for your store, like <b>shop.yourcompany.com</b>. A subdomain is easiest; you keep your main website exactly as it is.</p>
          <div class="dm-add"><input id="dmHost" placeholder="shop.yourcompany.com" autocomplete="off" spellcheck="false"><button class="btn" id="dmAdd">Connect domain</button></div>
          <p class="dm-err" id="dmErr" hidden></p>`
        :rec.next?`
          <div class="dm-pair">
            <div class="dm-side"><span class="dm-lbl">Current domain</span><b>${esc(rec.host)}</b>${pill('live')}<span class="dm-meta">Stays live until the new domain is ready</span></div>
            <span class="dm-arrow" aria-hidden="true">→</span>
            <div class="dm-side on"><span class="dm-lbl">New domain</span><b>${esc(rec.next.host)}</b>${pill(rec.next.status)}<span class="dm-meta">Switches over automatically once verified</span></div>
          </div>
          ${steps(rec.next.status)}
          ${rec.next.status==='error'?`<div class="dm-alert err"><b>We found a problem</b><span>${esc(rec.next.error||'The records don’t match yet.')}</span></div>`:''}
          ${rec.next.status==='pending'?`<div class="dm-alert"><b>Add these two records for ${esc(rec.next.host)}</b><span>These are new records; the ones for ${esc(rec.host)} won’t work for the new domain. Keep the old records in place for now.</span></div>`:''}
          ${rec.next.status==='verifying'?`<div class="dm-alert info"><b>Records found for ${esc(rec.next.host)}</b><span>We’re issuing its security certificate. Your store switches over as soon as it’s ready.</span></div>`:''}
          ${recTable(rec.next)}
          <div class="dm-acts"><button class="btn" id="dmCheck">Check now</button><button class="btn ghost" id="dmCancel">Cancel change</button><span class="dm-meta">Last checked ${when(rec.next.checkedAt)}</span></div>
          ${PROTO}`
        :`<div class="dm-host"><b>${esc(rec.host)}</b>${st==='live'?`<a class="dm-open" href="Merchsmith Store.html" target="_blank" rel="noopener">https://${esc(rec.host)} ↗</a>`:''}</div>
          ${steps(st)}
          ${rec.switched&&(Date.now()-new Date(rec.switched))<7*864e5?`<div class="dm-alert ok"><b>Switched to ${esc(rec.host)}</b><span>Your store moved over ${when(rec.switched)}.</span></div>`:''}
          ${st==='error'?`<div class="dm-alert err"><b>We found a problem</b><span>${esc(rec.error||'The records don’t match yet.')}</span></div>`:''}
          ${st==='pending'?`<div class="dm-alert"><b>Add these two records at your domain provider</b><span>We check automatically every few minutes. Most changes show up within an hour.</span></div>`:''}
          ${st==='verifying'?`<div class="dm-alert info"><b>Records found</b><span>We’re issuing your security certificate. This usually takes a few minutes.</span></div>`:''}
          ${st==='live'&&!rec.switched?`<div class="dm-alert ok"><b>Your store is live on ${esc(rec.host)}</b><span>Secured with HTTPS. Keep both DNS records in place; removing them takes the store offline on this domain.</span></div>`:''}
          ${recTable(rec)}
          ${rec.redirect?`<div class="dm-redir"><div><span class="dm-lbl">Redirecting</span><b>${esc(rec.redirect.host)} → ${esc(rec.host)}</b><span class="dm-meta">Until ${fmtDate(rec.redirect.until)}, as long as the old DNS records stay in place. After that you can delete them.</span></div><button class="btn ghost" id="dmStopRedir">Stop redirect</button></div>`:''}
          <div class="dm-change" id="dmChangeBox" hidden>
            <span class="dm-lbl">New domain</span>
            <div class="dm-add"><input id="dmNewHost" placeholder="shop.yourcompany.com" autocomplete="off" spellcheck="false"><button class="btn" id="dmChangeGo">Start change</button><button class="btn ghost" id="dmChangeX">Cancel</button></div>
            <p class="dm-meta" style="margin:8px 0 0">${st==='live'?esc(rec.host)+' stays live while you set up the new domain. We switch over automatically once it’s verified, then redirect the old address to the new one.':'This domain isn’t live yet, so it’s simply replaced.'}</p>
            <p class="dm-err" id="dmChangeErr" hidden></p>
          </div>
          <div class="dm-acts" id="dmActs">${st!=='live'?'<button class="btn" id="dmCheck">Check now</button>':''}<button class="btn ghost" id="dmChange">Change domain</button><button class="btn ghost" id="dmRemove">Remove domain</button>
            <span class="dm-meta">Last checked ${when(rec.checkedAt)}</span></div>
          ${st!=='live'?PROTO:''}`}
      </div>
      <div class="card">
        <div class="card-h"><h2>Where to add the records</h2></div>
        <p class="lede">Records are added wherever your domain is managed, usually the company you bought it from. Pick yours for step-by-step instructions.</p>
        ${helpHTML()}
      </div>`;
      wireCopy(el); wireHelp(el);
      const addB=el.querySelector('#dmAdd'); if(addB){ const inp=el.querySelector('#dmHost'), er=el.querySelector('#dmErr');
        const go=()=>{ const m=validate(inp.value,d.id); if(m){ er.textContent=m; er.hidden=false; inp.focus(); return; } add(d.id,inp.value); draw(); };
        addB.onclick=go; inp.onkeydown=e=>{ if(e.key==='Enter') go(); }; }
      const ck=el.querySelector('#dmCheck'); if(ck) ck.onclick=()=>{ ck.disabled=true; ck.textContent='Checking…'; setTimeout(()=>{ check(d.id); draw(); },900); };
      const chB=el.querySelector('#dmChange'), box=el.querySelector('#dmChangeBox');
      if(chB&&box){ chB.onclick=()=>{ box.hidden=false; el.querySelector('#dmActs').hidden=true; el.querySelector('#dmNewHost').focus(); };
        el.querySelector('#dmChangeX').onclick=()=>{ box.hidden=true; el.querySelector('#dmActs').hidden=false; };
        const ni=el.querySelector('#dmNewHost'), ne=el.querySelector('#dmChangeErr');
        const go2=()=>{ const m=validate(ni.value,d.id); if(m){ ne.textContent=m; ne.hidden=false; ni.focus(); return; } change(d.id,ni.value); draw(); };
        el.querySelector('#dmChangeGo').onclick=go2; ni.onkeydown=e=>{ if(e.key==='Enter') go2(); if(e.key==='Escape') el.querySelector('#dmChangeX').click(); }; }
      const cc=el.querySelector('#dmCancel'); if(cc) cc.onclick=()=>{ if(!confirm('Cancel the change to '+get(d.id).next.host+'?\n\n'+get(d.id).host+' stays as your domain.')) return; cancelChange(d.id); draw(); };
      const sr=el.querySelector('#dmStopRedir'); if(sr) sr.onclick=()=>{ if(!confirm('Stop redirecting '+get(d.id).redirect.host+'?\n\nVisitors using the old address will no longer reach your store.')) return; stopRedirect(d.id); draw(); };
      const rm=el.querySelector('#dmRemove'); if(rm) rm.onclick=()=>{ if(!confirm('Remove '+get(d.id).host+'?\n\nYour store stays available at '+platformHost(d)+'. You can reconnect the domain later.')) return; remove(d.id); draw(); };
    };
    draw();
  }

  /* ---------- Platform Admin: drawer section ---------- */
  function adminSection(d){ const rec=get(d.id), st=rec?rec.status:'none';
    return `<div class="dwr-sec dm-adm"><h4>Store domain</h4><div class="kv">
      <span class="k">Platform address</span><span class="v">${esc(platformHost(d))}</span>
      <span class="k">Custom domain</span><span class="v">${rec?esc(rec.host):'<span style="color:var(--muted)">None</span>'}</span>
      <span class="k">Status</span><span class="v">${pill(st)}${rec&&st!=='live'?` <span class="dm-meta">added ${when(rec.addedAt)}</span>`:''}</span>
      ${rec&&rec.next?`<span class="k">Changing to</span><span class="v">${esc(rec.next.host)} ${pill(rec.next.status)} <span class="dm-meta">started ${when(rec.next.addedAt)}</span></span>`:''}
      ${rec&&rec.redirect?`<span class="k">Redirecting</span><span class="v">${esc(rec.redirect.host)} → ${esc(rec.host)} <span class="dm-meta">until ${fmtDate(rec.redirect.until)}</span></span>`:''}
      ${rec?`<span class="k">Last checked</span><span class="v">${when(rec.checkedAt)}</span>`:''}</div>
      ${st==='error'?`<div class="dm-alert err" style="margin-top:10px"><b>Needs fixing</b><span>${esc(rec.error||'')}</span></div>`:''}
      ${st==='pending'&&(Date.now()-new Date(rec.addedAt))>864e5?`<div class="dm-alert" style="margin-top:10px"><b>Stuck for ${when(rec.addedAt).replace(' ago','')}</b><span>No records found yet. They may need help adding them.</span></div>`:''}
      ${rec&&rec.next&&rec.next.status==='error'?`<div class="dm-alert err" style="margin-top:10px"><b>New domain needs fixing</b><span>${esc(rec.next.error||'')}</span></div>`:''}
      ${rec&&(st!=='live'||rec.next)?`<details class="dm-adrecs"><summary>Records they need${rec.next?' for '+esc(rec.next.host):''}</summary>${recTable(rec.next||rec)}</details>
        <div class="dm-acts" style="margin-top:10px"><button class="btn ghost sm" data-dmadmcheck>Re-check now</button></div>`:''}</div>`; }
  function wireAdmin(root,d,onChange){ wireCopy(root); const b=root.querySelector('[data-dmadmcheck]');
    if(b) b.onclick=()=>{ b.disabled=true; b.textContent='Checking…'; setTimeout(()=>{ check(d.id); onChange&&onChange(); },800); }; }

  /* ---------- styles ---------- */
  const css=`
  .dm-pill{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:3px 9px;white-space:nowrap;}
  .dm-none{background:var(--paper-2);color:var(--ink-3);} .dm-pending{background:#fbeccd;color:#9a6b1f;}
  .dm-verifying{background:var(--tint-peri);color:var(--periwinkle-ink);} .dm-live{background:var(--tint-green,#e2f0e9);color:var(--green-deep,#2E7A57);}
  .dm-error{background:var(--tint-red,#fbe3df);color:#b4232c;}
  .dm-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px;}
  .dm-dot.dm-pending{background:#e0a02a;} .dm-dot.dm-verifying{background:var(--periwinkle);} .dm-dot.dm-live{background:var(--spearmint);} .dm-dot.dm-error{background:#d6453d;}
  .dm-addr,.dm-host{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
  .dm-addr code,.dm-rr code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;background:var(--paper);border:1px solid var(--line-soft);border-radius:8px;padding:6px 10px;color:var(--ink);word-break:break-all;}
  .dm-host b{font-size:18px;font-weight:700;}
  .dm-open{font-size:13px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;}
  .dm-open:hover{text-decoration:underline;}
  .dm-copy{font:inherit;font-size:11.5px;font-weight:700;color:var(--periwinkle-deep);background:#fff;border:1.5px solid var(--line-soft);border-radius:7px;padding:4px 9px;cursor:pointer;flex:none;}
  .dm-copy:hover{border-color:var(--periwinkle);}
  .dm-add{display:flex;gap:10px;flex-wrap:wrap;}
  .dm-add input{flex:1;min-width:220px;font:inherit;font-size:14px;border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 12px;}
  .dm-add input:focus{outline:0;border-color:var(--periwinkle);}
  .dm-err{color:#b4232c;font-size:13px;font-weight:600;margin:10px 0 0;}
  .dm-steps{list-style:none;margin:18px 0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
  .dm-steps li{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--line-soft);border-radius:12px;background:#fff;}
  .dm-steps li i{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:800;background:var(--paper-2);color:var(--ink-3);}
  .dm-steps li b{display:block;font-size:13.5px;} .dm-steps li span{font-size:12px;color:var(--muted);}
  .dm-steps li.done i{background:var(--spearmint);color:#fff;} .dm-steps li.on{border-color:var(--periwinkle);} .dm-steps li.on i{background:var(--periwinkle-deep);color:#fff;}
  .dm-steps li.err{border-color:#d6453d;} .dm-steps li.err i{background:#d6453d;color:#fff;}
  @media(max-width:640px){.dm-steps{grid-template-columns:1fr;}}
  .dm-alert{display:flex;flex-direction:column;gap:2px;border-radius:12px;padding:12px 14px;background:#fbeccd;color:#6e4c12;margin-bottom:14px;font-size:13px;}
  .dm-alert b{font-size:13.5px;} .dm-alert.info{background:var(--tint-peri);color:var(--periwinkle-ink);}
  .dm-alert.ok{background:var(--tint-green,#e2f0e9);color:var(--green-deep,#2E7A57);} .dm-alert.err{background:var(--tint-red,#fbe3df);color:#8f1d24;}
  .dm-recs{border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;}
  .dm-rh,.dm-rr{display:grid;grid-template-columns:70px minmax(0,1fr) minmax(0,1.6fr);gap:12px;align-items:center;padding:10px 14px;}
  .dm-rh{background:var(--paper);font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);}
  .dm-rr{border-top:1px solid var(--line-soft);font-size:13px;}
  .dm-rr>span{display:flex;align-items:center;gap:8px;min-width:0;}
  .dm-rr em{grid-column:2/-1;font-style:normal;font-size:12px;color:var(--muted);margin-top:-4px;}
  @media(max-width:640px){.dm-rh{display:none;}.dm-rr{grid-template-columns:1fr;}.dm-rr em{grid-column:1;}}
  .dm-acts{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;}
  .dm-meta{font-size:12px;color:var(--muted);}
  .dm-proto{font-size:12px;color:var(--muted);margin:12px 0 0;}
  .dm-provs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;}
  .dm-prov{font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-3);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:7px 14px;cursor:pointer;}
  .dm-prov.on{background:var(--ink);border-color:var(--ink);color:#fff;}
  .dm-howto{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;line-height:1.55;color:var(--ink-2);max-width:68ch;}
  .dm-howto[hidden]{display:none;}
  .dm-pair{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:12px;align-items:stretch;}
  .dm-side{display:flex;flex-direction:column;align-items:flex-start;gap:6px;border:1px solid var(--line-soft);border-radius:12px;padding:12px 14px;background:#fff;min-width:0;}
  .dm-side b{font-size:15.5px;word-break:break-all;} .dm-side.on{border-color:var(--periwinkle);}
  .dm-arrow{align-self:center;font-size:20px;color:var(--muted);}
  @media(max-width:640px){.dm-pair{grid-template-columns:1fr;}.dm-arrow{transform:rotate(90deg);justify-self:center;}}
  .dm-lbl{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);}
  .dm-redir{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:14px;padding:12px 14px;border:1px dashed var(--line);border-radius:12px;}
  .dm-redir>div{display:flex;flex-direction:column;gap:2px;min-width:0;} .dm-redir b{font-size:14px;word-break:break-all;}
  .dm-change{margin-top:16px;padding:14px;border:1px solid var(--periwinkle);border-radius:12px;background:var(--tint-peri);display:flex;flex-direction:column;gap:8px;}
  .dm-change[hidden],.dm-acts[hidden]{display:none;}
  .dm-adrecs{margin-top:10px;} .dm-adrecs summary{cursor:pointer;font-size:12.5px;font-weight:700;color:var(--periwinkle-deep);margin-bottom:8px;}
  .dm-adm .dm-rh,.dm-adm .dm-rr{grid-template-columns:56px minmax(0,1fr);} .dm-adm .dm-rh span:last-child{display:none;}
  .dm-adm .dm-rr>span:last-of-type{grid-column:2;} .dm-adm .dm-rr em{grid-column:2;}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);

  return { get, all:db, statusOf, platformHost, records, add, check, remove, validate, STATUS, TARGET, PLATFORM,
    distributorPanel, adminSection, wireAdmin, chip, pill };
})();
