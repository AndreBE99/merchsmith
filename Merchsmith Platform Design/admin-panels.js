/* admin-panels.js — extra sections for Platform Admin distributor + supplier panels,
   matching the distributor view's customer/supplier panels. Figures that the
   prototype doesn't store yet (orders, GMV, service) are derived from the id so
   they stay stable. window.MSADMP: supGlance, supContacts, orders, service, products */
window.MSADMP=(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const H=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const gbp=n=>'£'+Math.round(n).toLocaleString('en-GB');
  const bar=p=>`<span class="adp-bar"><i style="width:${p}%;background:${p>=90?'var(--green-deep,#1d7c4d)':p>=80?'#e0a526':'#d6453d'}"></i></span>`;
  function figs(kind,o){ const h=H(kind+o.id), live=o.status==='active'||o.status==='past_due';
    if(!live) return {orders:0,gmv:0,aov:0,last:'—',prev:0};
    const orders=kind==='sup'?18+h%160:40+h%420, aov=kind==='sup'?600+h%2400:900+h%3100, gmv=orders*aov, prev=Math.round(gmv*(.72+(h%50)/100));
    const d=new Date(); d.setDate(d.getDate()-(1+h%12)); return {orders,gmv,aov,prev,last:d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}; }
  function css(){ if(!document.getElementById('adGlCss')){ const g=document.createElement('style'); g.id='adGlCss'; g.textContent='.ad-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;} .ad-kpis>*{display:block;text-decoration:none;color:var(--ink);border:1px solid var(--line-soft);border-radius:12px;padding:10px 12px;background:#fff;} .ad-kpis>a:hover{border-color:var(--periwinkle);box-shadow:0 4px 14px rgba(40,44,80,.08);} .ad-kpis>a:hover span{color:var(--periwinkle-deep);} .ad-kpis b{display:block;font-family:var(--serif);font-weight:500;font-size:20px;line-height:1.2;} .ad-kpis span{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-3);} .kc{display:flex;flex-direction:column;gap:6px;} .kc-row{display:flex;align-items:center;gap:11px;border:1px solid var(--line-soft);border-radius:12px;padding:9px 12px;background:#fff;} .kc-row .av{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;background:var(--paper-2);font-size:11.5px;font-weight:800;color:var(--ink-3);overflow:hidden;} .kc-row .av img{width:100%;height:100%;object-fit:cover;} .kc-t{flex:1;min-width:0;display:flex;flex-direction:column;} .kc-t b{font-size:14px;} .kc-t i{font-style:normal;font-size:12px;color:var(--muted);} .kc-t a{color:var(--periwinkle-deep);text-decoration:none;} .kc-row em{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;border-radius:6px;padding:3px 8px;white-space:nowrap;background:var(--paper-2);color:var(--ink-3);} .kc-row.cust{border-color:color-mix(in srgb,var(--spearmint) 55%,#fff);background:color-mix(in srgb,var(--spearmint) 8%,#fff);} .kc-row.cust em{background:color-mix(in srgb,var(--spearmint) 30%,#fff);color:#1d6b58;} .kc-row.dist{border-color:var(--periwinkle);background:var(--tint-peri);} .kc-row.dist em{background:var(--periwinkle-deep);color:#fff;} @media(max-width:420px){.ad-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}}'; document.head.appendChild(g); }
    if(document.getElementById('adpCss')) return; const s=document.createElement('style'); s.id='adpCss'; s.textContent=`
    .adp-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
    #drawer .sec-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;} #drawer .sec-hd h4{margin:0;}
    #drawer .seclink{font-size:13px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;white-space:nowrap;} #drawer .seclink:hover{text-decoration:underline;}
    #drawer .sd-sumr{display:flex;align-items:center;gap:10px;margin-left:auto;}
    .adp-stats>div{background:var(--paper);border-radius:12px;padding:10px 12px;} .adp-stats b{display:block;font-family:var(--serif);font-weight:500;font-size:20px;white-space:nowrap;} .adp-stats span{font-size:11px;color:var(--muted);font-weight:700;}
    .adp-trend{font-size:12px;font-weight:700;margin:8px 0 0;} .adp-trend.up{color:var(--green-deep,#1d7c4d);} .adp-trend.dn{color:#b4232c;}
    .adp-svc{display:flex;flex-direction:column;gap:9px;} .adp-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 44px;gap:10px;align-items:center;font-size:13px;color:var(--ink-2);}
    .adp-row>b{text-align:right;font-size:13px;} .adp-bar{height:7px;border-radius:7px;background:var(--paper-2);overflow:hidden;} .adp-bar i{display:block;height:100%;border-radius:7px;}
    .adp-ptbl{width:100%;border-collapse:collapse;font-size:13px;} .adp-ptbl th{font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);text-align:left;padding:6px 6px;border-bottom:1px solid var(--line-soft);} .adp-ptbl td{padding:8px 6px;border-bottom:1px solid var(--paper-2);} .adp-ptbl td small{display:block;color:var(--muted);font-size:11.5px;} .adp-ptbl td:nth-child(n+2),.adp-ptbl th:nth-child(n+2){text-align:right;white-space:nowrap;}
    .adp-empty{font-size:13px;color:var(--muted);margin:0;}`; document.head.appendChild(s); }
  const sec=(t,link,body)=>{ css(); return `<div class="dwr-sec"><div class="sec-hd"><h4>${t}</h4>${link||''}</div>${body}</div>`; };

  function supGlance(s,prods){ css(); const f=figs('sup',s), K=[[prods?prods.toLocaleString('en-GB'):'—',prods?'Products':'Manual / decoration','#nav=products'],[s.usedBy||0,'Distributors using','#nav=distributors'],[f.orders,'Orders · 12 months',null],[gbp(f.gmv),'GMV · 12 months',null],[esc(s.since||'—'),'Supplier since',null],[s.kind==='branding'?'—':(s.rec||0),'In Recommended','#nav=curated']];
    return `<div class="dwr-sec"><div class="sec-hd"><h4>At a glance</h4></div><div class="ad-kpis">${K.map(([v,l,h])=>h?`<a href="${h}"><b>${esc(v)}</b><span>${esc(l)} ›</span></a>`:`<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div></div>`; }
  function supContacts(s,c,team){ const mc=(team||[]).find(u=>u.n===s.onboardingOwner)||(team||[]).find(u=>/admin/i.test(u.role||''))||(team||[])[0];
    const ph=n=>window.MSPEOPLE&&MSPEOPLE.photo?MSPEOPLE.photo({n}):'', ini=n=>String(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const row=(n,sub,tag,cls)=>`<div class="kc-row ${cls}"><span class="av">${ph(n)?`<img src="${esc(ph(n))}" alt="">`:esc(ini(n))}</span><span class="kc-t"><b>${esc(n)}</b><i>${sub}</i></span><em>${esc(tag)}</em></div>`;
    return `<div class="dwr-sec"><div class="sec-hd"><h4>Key contacts</h4></div><div class="kc">${c&&c.name&&c.name!=='—'?row(c.name,[esc(c.role||''),esc(s.name),c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''].filter(Boolean).join(' · '),'Supplier main contact','cust'):'<p class="adp-empty">No contact yet.</p>'}${mc?row(mc.n,esc(mc.title||mc.role||'')+' · Merchsmith','Your main contact','dist'):''}</div></div>`; }
  function orders(kind,o){ css(); const f=figs(kind,o); if(!f.orders) return sec('Orders &amp; spend','',`<p class="adp-empty">No orders yet.</p>`);
    const up=f.gmv>=f.prev, pct=f.prev?Math.round(Math.abs(f.gmv-f.prev)/f.prev*100):0;
    return sec('Orders &amp; spend',`<a class="seclink" href="#nav=overview">Platform revenue ›</a>`,`<div class="adp-stats"><div><b>${f.orders}</b><span>Orders · 12 months</span></div><div><b>${gbp(f.gmv)}</b><span>GMV · 12 months</span></div><div><b>${gbp(f.aov)}</b><span>Average order</span></div><div><b>${esc(f.last)}</b><span>Last order</span></div></div><p class="adp-trend ${up?'up':'dn'}">${up?'▲':'▼'} ${pct}% on the previous 12 months${kind==='sup'?' · across '+(o.usedBy||0)+' distributors':''}</p>`); }
  function service(kind,o){ const h=H('svc'+kind+o.id); if(!(o.status==='active'||o.status==='past_due')) return '';
    const R=kind==='sup'?[['Delivery dates met',84+h%15],['Proof accuracy',86+h%13],['Enquiries answered on time',80+h%19],['Orders without issues',90+h%9]]
      :[['Quotes sent within 24 hours',78+h%21],['Proofs approved first time',72+h%24],['Customer messages answered same day',82+h%17]];
    const resp=kind==='sup'?'':`<div class="adp-row"><span>Average reply to customers</span><span></span><b>${1+h%5}h</b></div>`;
    return sec(kind==='sup'?'Service performance':'Responsiveness','',`<div class="adp-svc">${R.map(([l,p])=>`<div class="adp-row"><span>${l}</span>${bar(p)}<b>${p}%</b></div>`).join('')}${resp}</div>`); }
  function products(s){ if(s.kind==='branding') return ''; const L=window.MSCAT?MSCAT.all().filter(p=>p.supplier===s.name).slice(0,6):[];
    if(!L.length) return sec('Product list','',`<p class="adp-empty">No products imported yet.</p>`);
    const rows=L.map(p=>{ const h=H(p.id||p.name), o=3+h%60; return {p,o,v:o*(120+h%900)}; }).sort((a,b)=>b.o-a.o);
    return sec('Product list',`<a class="seclink" href="#nav=products">All products ›</a>`,`<table class="adp-ptbl"><thead><tr><th>Product</th><th>Orders</th><th>Value</th></tr></thead><tbody>${rows.map(({p,o,v})=>`<tr><td>${esc(p.name)}<small>${esc(p.sku||p.code||'')}</small></td><td>${o}</td><td>${gbp(v)}</td></tr>`).join('')}</tbody></table>`); }
  return {supGlance,supContacts,orders,service,products};
})();
