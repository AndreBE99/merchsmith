/* home-page.js — role-based home dashboards */
(function(){
  const H = window.HOME;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const av = n => n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const main = document.getElementById('main');

  const LOGO = { admin:'Merchsmith', distributor:'mojo', customer:'mojo', supplier:'mojo', user:'mojo' };
  const LOGOSER = { admin:true };

  function kpis(arr){
    return `<div class="kpis">${arr.map(k=>`
      <div class="kpi"><div class="lab">${esc(k.label)}</div><div class="val">${esc(k.value)}</div>
      <span class="delta ${k.warn?'warn':(k.up?'up':'down')}">${k.up&&!k.warn?'<svg class="icn" style="width:12px;height:12px"><use href="#h-up"/></svg>':''}${esc(k.delta)}</span></div>`).join('')}</div>`;
  }
  function tlist(arr){ return `<div class="list">${arr.map(t=>`<div class="lrow"><span class="dot ${t.warn?'warn':''}"></span><span class="lt">${esc(t.t)}</span><span class="tag ${t.warn?'warn':''}">${esc(t.tag)}</span></div>`).join('')}</div>`; }
  function alist(arr){ return `<div class="list">${arr.map(a=>`<div class="lrow"><span class="av">${av(a.who)}</span><span class="lt"><b>${esc(a.who)}</b> ${esc(a.t)}<small>${esc(a.w)}</small></span></div>`).join('')}</div>`; }
  function ranks(arr){ return `<div class="rank">${arr.map(r=>`<div class="r"><span class="n">${esc(r.n)}</span><span class="v">${esc(r.v)}</span><span class="track"><i style="width:${r.pct}%"></i></span></div>`).join('')}</div>`; }
  function progs(arr){ return arr.map(p=>`<div class="prow"><div class="ph"><b>${esc(p.n)}</b><span class="st">${esc(p.stage||p.note||'')} ${p.d?'· '+esc(p.d):''}</span></div><div class="tk"><i style="width:${p.pct!=null?p.pct:100}%"></i></div></div>`).join(''); }

  const VIEWS = {
    admin(d){ return `
      ${greet(d,[btn('h-grid','Open admin console','Merchsmith Admin.html'),btn('h-up','Revenue report','#',1)])}
      ${kpis(d.kpis)}
      <div class="cols"><div>
        <div class="card"><div class="card-h"><h3>Platform revenue</h3><a href="#">Last 12 months ›</a></div>
          <div class="trend">${d.trend.map(v=>`<span class="bar" style="height:${v}%"></span>`).join('')}</div></div>
        <div class="card"><div class="card-h"><h3>Top distributors by GMV</h3><a href="Merchsmith Admin.html">View all ›</a></div>${ranks(d.leaderboard)}</div>
      </div><div>
        <div class="card"><h3>Needs attention</h3><p class="ch-sub">Billing, risk &amp; trials</p>${tlist(d.tasks)}</div>
        <div class="card"><h3>System health</h3><div class="health">${d.health.map(h=>`<div class="hrow"><span>${esc(h.k)}</span><b>${esc(h.v)}</b></div>`).join('')}</div></div>
        <div class="card"><h3>Recent activity</h3>${alist(d.activity)}</div>
      </div></div>`;
    },
    distributor(d){ return `
      ${greet(d,[btn('h-grid','Open project view','Merchsmith Project - Autumn Giveaways.html'),btn('h-store','Browse store','Merchsmith Store.html',1)])}
      ${kpis(d.kpis)}
      <div class="cols"><div>
        <div class="card"><div class="card-h"><h3>Project pipeline</h3><a href="Merchsmith Project - Autumn Giveaways.html">Open projects ›</a></div>
          <div class="pipe">${d.pipeline.map(s=>`<div class="stg"><b>${s.v}</b><span>${esc(s.k)}</span></div>`).join('')}</div></div>
        <div class="card"><div class="card-h"><h3>Top customers</h3><a href="Merchsmith Organisations.html">Organisations ›</a></div>${ranks(d.customers)}</div>
      </div><div>
        <div class="card"><h3>Your tasks</h3><p class="ch-sub">Across active projects</p>${tlist(d.tasks)}</div>
        <div class="card"><h3>Recent activity</h3>${alist(d.activity)}</div>
      </div></div>`;
    },
    customer(d){ return `
      ${greet(d,[btn('h-store','Browse store','Merchsmith Store.html'),btn('h-grid','My projects','Merchsmith Project - Autumn Giveaways.html',1)])}
      ${kpis(d.kpis)}
      <div class="cols"><div>
        <div class="card"><h3>Awaiting your approval</h3><p class="ch-sub">These need a decision to keep moving</p>${tlist(d.approvals)}</div>
        <div class="card"><div class="card-h"><h3>My projects</h3><a href="Merchsmith Project - Autumn Giveaways.html">Open ›</a></div>${progs(d.projects)}</div>
        <div class="card"><h3>Reorder favourites</h3><p class="ch-sub">Quick add to a new project</p><div class="chips">${d.reorder.map(r=>`<span class="c">${esc(r)} +</span>`).join('')}</div></div>
      </div><div>
        <div class="card"><h3>Upcoming deliveries</h3>${progs(d.deliveries)}</div>
      </div></div>`;
    },
    supplier(d){ return `
      ${greet(d,[btn('h-bell','Open enquiries','#'),btn('h-grid','My orders','#',1)])}
      ${kpis(d.kpis)}
      <div class="cols"><div>
        <div class="card"><h3>Enquiries to respond to</h3><p class="ch-sub">Stock, delivery &amp; quote checks</p>${tlist(d.enquiries)}</div>
        <div class="card"><div class="card-h"><h3>Orders in production</h3></div>${progs(d.orders)}</div>
      </div><div>
        <div class="card"><h3>Deadlines</h3>${tlist(d.deadlines.map(x=>({t:x.t,tag:x.d,warn:x.warn})))}</div>
      </div></div>`;
    },
    user(d){ return `
      ${greet(d,[btn('h-grid','My projects','Merchsmith Project - Autumn Giveaways.html'),btn('h-store','Browse store','Merchsmith Store.html',1)])}
      ${kpis(d.kpis)}
      <div class="cols"><div>
        <div class="card"><h3>My tasks</h3><p class="ch-sub">Assigned to you</p>${tlist(d.tasks)}</div>
        <div class="card"><div class="card-h"><h3>My projects</h3><a href="Merchsmith Project - Autumn Giveaways.html">Open ›</a></div>${progs(d.projects)}</div>
      </div><div>
        <div class="card"><h3>My recent activity</h3>${alist(d.activity)}</div>
      </div></div>`;
    }
  };

  function btn(icon,label,href,primary){ return `<a class="btn ${primary?'':'ghost'}" href="${href}"><svg class="icn"><use href="#${icon}"/></svg>${esc(label)}</a>`; }
  function greet(d,actions){
    const hr=new Date().getHours(); const g=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
    return `<div class="greet"><div><h1>${g}, ${esc(d.who.split(' ')[0])}</h1>
      <div class="sub">${esc(d.role)} · ${esc(d.org)} · here's what needs you today.</div></div>
      <div class="actions">${actions.join('')}</div></div>`;
  }

  let role = (window.MSID ? MSID.current() : 'distributor');
  function render(){
    const d=H[role]; if(!d) return;
    const bl=document.getElementById('brandLogo'); if(bl){ bl.textContent=LOGO[role]; bl.style.fontFamily=LOGOSER[role]?'var(--serif)':'"Fredoka",var(--sans)'; }
    const bc=document.getElementById('brandCtx'); if(bc) bc.innerHTML=`${esc(d.org)}<small>${esc(d.role)}</small>`;
    const hv=document.getElementById('hav'); if(hv) hv.textContent=av(d.who);
    main.innerHTML=VIEWS[role](d);
  }
  window.addEventListener('ms-identity-change', ()=>{ role = MSID.current(); render(); });
  render();
})();
