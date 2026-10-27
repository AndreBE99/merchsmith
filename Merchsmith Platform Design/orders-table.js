/* orders-table.js — the Orders list (Sep 2026 rebuild), styled and behaving like the Distributor Projects table.
   MSORDTBL.render(root, orders, role, opts)  role: distributor | admin | customer | supplier
   Per order it summarises the order page's live data (ms-order-ops, ms-order-comments, flags, MSTWO):
   stage + per-product dots, deliver-by, value / profit, payment, suppliers, last activity.
   KPI cards and chips are filters; search + dropdowns; sortable columns; expandable product rows;
   bulk select (Export CSV · Flag); filters kept in sessionStorage 'ms-ordtbl'.
   Suppliers only see orders with work for them, costed at their cost, with no customer names. */
window.MSORDTBL=window.MSORDTBL||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const gbp=n=>'£'+(+n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const gbp0=n=>'£'+Math.round(+n||0).toLocaleString('en-GB');
  const r2=n=>Math.round((+n||0)*100)/100;
  const J=(k,d)=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||d; }catch(e){ return d; } };
  const DAY=86400000, TODAY=(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; })();
  const FL=['received','sent','ack','proof','confirmed','prod','dispatch','delivered'];
  const IMGFIX={tshirt:'clothing',tee:'clothing',shirt:'clothing',hoodie:'clothing'};
  const isUS=l=>l&&l.kind==='sample'&&/unbranded/i.test(l.branding||'');
  function normL(l){ if(!l||!l.grid||typeof l.grid!=='object') return l; const G=l.grid, ks=Object.keys(G).filter(k=>Object.values(G[k]||{}).some(q=>+q>0)); if(!ks.length) return l;
    return Object.assign({},l,{colours:ks.map(k=>{ const sz=Object.fromEntries(Object.entries(G[k]).filter(([,q])=>+q>0).map(([a,q])=>[a,+q])); return {c:k,qty:Object.values(sz).reduce((a,b)=>a+b,0),sizes:sz}; })}); }
  const UNTR=c=>/untracked|hand delivered|collected|own delivery|own transport/i.test(String(c||''));
  const trkTxt=T=>{ if(!T) return ''; const c=String(T.courier||''); if(UNTR(c)){ const base=c.replace(/\s*\(untracked\)\s*/i,'').trim(); return /untracked/i.test(c)?base+' · untracked':base; } return c+(T.no?' · '+T.no:''); }; const FIDX=Object.fromEntries(FL.map((k,i)=>[k,i])); FIDX.revision=4; FIDX.ok=4; FIDX.tous=5; FIDX.atus=5;
  const fromStatus=s=>({placed:'received',approval:'received',ack:'ack',production:'prod',dispatched:'dispatch',delivered:'delivered',cancelled:'received'})[s]||'received';
  const costOf=l=>l.cost!=null?l.cost:Math.round((l.unit||0)/1.42*100)/100;
  const pDate=(s,ref)=>{ if(!s) return null; if(s instanceof Date) return s; if(/asap/i.test(String(s))) return null; const t=String(s).replace(/Sept/g,'Sep').replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\.?,?\s*/i,'').replace(/(\d+)(st|nd|rd|th)/g,'$1').trim(); if(!/\d/.test(t)) return null;
    let d; if(/\b\d{4}\b/.test(t)) d=new Date(t); else { const y=(ref||TODAY).getFullYear(); d=new Date(t+' '+y); if(!isNaN(d)&&ref&&d<ref) d=new Date(t+' '+(y+1)); } return isNaN(d)?null:d; };
  const fD=d=>d?d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
  const fDs=d=>d?d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—';
  const ago=d=>{ if(!d) return '—'; const n=Math.round((TODAY-new Date(new Date(d).setHours(0,0,0,0)))/DAY); return n<=0?'today':n===1?'yesterday':n<31?n+'d ago':fD(d); };
  const ic=(p,s)=>`<svg viewBox="0 0 24 24" width="${s||16}" height="${s||16}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I={search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',chev:'<path d="m9 6 6 6-6 6"/>',flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',dl:'<path d="M12 4v10M8 10.5l4 3.8 4-3.8M5 19.5h14"/>',check:'<path d="M4 12.5 9.5 18 20 6.5"/>',arr:'<path d="M5 12h14M13 6l6 6-6 6"/>',box:'<path d="M3 8 12 3l9 5v8l-9 5-9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'};
  const hue=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%360;
  const ini=s=>String(s||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const logo=(n,sz)=>{ sz=sz||26; if(window.MSLOGOS&&MSLOGOS.has&&MSLOGOS.has(n)) return `<span class="ox-logo" style="width:${sz}px;height:${sz}px">${MSLOGOS.svg(n,sz)}</span>`; return `<span class="ox-logo ini" style="width:${sz}px;height:${sz}px;background:hsl(${hue(n)} 45% 42%)">${esc(ini(n))}</span>`; };
  const av=(n,sz)=>{ sz=sz||26; if(window.MSPEOPLE&&MSPEOPLE.avHTML){ try{ return `<span class="ox-av" style="width:${sz}px;height:${sz}px">${MSPEOPLE.avHTML({n},sz)}</span>`; }catch(e){} } return `<span class="ox-av ini" style="width:${sz}px;height:${sz}px;background:hsl(${hue(n)} 40% 48%)">${esc(ini(n))}</span>`; };
  const supTile=n=>`<span class="ox-sup ox-lk" data-osupp="${esc(n)}" role="button" tabindex="0" title="${esc(n)}" style="background:hsl(${hue(n)} 42% 44%)">${esc(ini(n))}</span>`;
  const custName=o=>o.customerName||(o.billing&&(o.billing.org||o.billing.company))||'Citrix';
  const twoOf=l=>{ if(l.twoOv===false) return null; if(l.twoOv) return l.twoOv; try{ return window.MSTWO&&l.kind!=='sample'?MSTWO.get(l.name,(l.project||'').toLowerCase().includes('autumn')?'autumn':undefined):null; }catch(e){ return null; } };
  const supOfL=l=>{ const t=twoOf(l); if(t) return /unbranded/i.test(l.branding||'')&&l.kind==='sample'?t.blank:t.brand; return l.supOv||l.supplier||'Supplier'; };

  const SLBL={received:'Order received',sent:sup0()?'New order':'Checked & sent',ack:'Acknowledged',proof:'Proof received',confirmed:'Proof approved',prod:'In production',dispatch:'Dispatched',delivered:'Delivered',tous:'To us',atus:'At our warehouse'};
  function sup0(){ try{ return (window.MSID&&MSID.current&&MSID.current())==='supplier'; }catch(e){ return false; } }
  const fDT=v=>{ const d=new Date(v); if(isNaN(d)) return String(v); const t=d.getHours()||d.getMinutes()?' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):''; return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+t; };
  /* ---------- one summary per order ---------- */
  function sum(o,role,me){ const OPS=J('ms-order-ops',{}), x=OPS[o.id]||{}, C=J('ms-order-comments',{})[o.id]||{}, VR=o.vatRate!=null?+o.vatRate:0.2;
    const lines=(o.lines||[]).map((l0,i)=>{ const l=normL(l0); const L=(x.lines&&x.lines[i])||{st:fromStatus(o.status),t:{}}; const st0=L.cancelled?'cancelled':L.st||'received'; const vr=window.MSVIA?MSVIA.route(o,i,l,L):null, via=!!(vr&&vr.via), vsub=via&&role!=='customer'?MSVIA.sub(L,true):null; const st=vsub||st0;
      const probs=(x.problems||[]).filter(q=>q.line===i&&!q.resolved).length;
      let who='wait'; if(L.cancelled||st==='delivered') who='done';
      else if(role==='customer') who=st==='revision'&&!(L.rev&&L.rev.custOk)?'act':'wait';
      else if(role==='supplier') who=['sent'].includes(st)||(st==='ack'&&!L.pf)||(st==='confirmed')||(st0==='prod'&&!(via?(L.via&&L.via.inTrk):L.tracking))?'act':'wait';
      else who=probs||st==='received'||(st==='ack'&&L.oa&&!L.oa.checked)||(st==='proof'&&L.pf&&!L.pf.checked)||(st==='revision'&&L.rev&&L.rev.custOk)||st==='atus'?'act':'wait';
      const d=pDate(l.deliveryDate,pDate(o.placed)); const two=twoOf(l); const sup=supOfL(l);
      return {l,i,L,st,via,hub:vr&&vr.hub,who,d,two,sup,probs,dispatched:!!L.tracking||st==='dispatch'||st==='delivered'}; });
    // blank-stock lines only count for the blank supplier once its blank PO has been sent
    const laneOf=k=>{ try{ return window.MSTWO&&MSTWO.lane?MSTWO.lane(o.id,k.i)||{}:{}; }catch(e){ return {}; } };
    const mine=role==='supplier'?lines.filter(k=>k.sup===me||(k.two&&k.two.blank===me&&k.two.brand!==me&&laneOf(k).sentAt)).map(k=>k.sup===me?k:Object.assign({},k,{blankOnly:true,lane:laneOf(k)})):lines;
    if(role==='supplier') mine.forEach(k=>{ if(k.blankOnly){ const s=k.lane.st; k.who=s==='sent'||(s==='ack'&&!k.lane.trk)?'act':s==='booked'?'done':'wait'; } });
    const act=lines.filter(k=>k.st!=='cancelled'), allCx=lines.length&&!act.length;
    const minI=act.length?Math.min(...act.map(k=>FIDX[k.st]??0)):0, anyRev=act.some(k=>k.st==='revision');
    const nDisp=act.filter(k=>k.dispatched).length, nDel=act.filter(k=>k.st==='delivered').length;
    let stage, cls;
    if(allCx||o.status==='cancelled'||x.cancelled){ stage='Cancelled'; cls='red'; }
    else if(o.status==='approval'){ stage='Awaiting approval'; cls='amber'; }
    else if(anyRev){ stage=role==='customer'?'Please reconfirm':'Changes to confirm'; cls='amber'; }
    else if(act.length&&nDel===act.length){ stage='Delivered'; cls='green'; }
    else if(act.length&&nDisp===act.length){ stage='Dispatched'; cls='sky'; }
    else if(nDisp){ stage='Part dispatched'; cls='sky'; }
    else if(minI>=FIDX.prod){ stage='In production'; cls='violet'; }
    else if(minI>=FIDX.proof){ stage=role==='customer'?'Being checked':'Proof stage'; cls='peri'; }
    else if(minI>=FIDX.sent){ stage=role==='customer'?'Being checked':'With supplier'; cls='peri'; }
    else { stage=role==='customer'?'Order placed':role==='supplier'?'New order':'Order received'; cls='peri'; }
    if(role==='supplier'&&mine.length&&mine.every(k=>k.blankOnly)){ const s=Math.min(...mine.map(k=>['sent','ack','shipped','booked'].indexOf(k.lane.st)));
      [stage,cls]=[['New blank stock order','peri'],['Acknowledged','peri'],['Shipped to decorator','sky'],['Booked in at decorator','green']][Math.max(0,s)]; }
    const open=!['Cancelled','Delivered','Booked in at decorator'].includes(stage);
    const needs=open&&(act.some(k=>k.who==='act')||(role==='customer'&&o.status==='approval'));
    const waitSup=role!=='customer'&&role!=='supplier'&&open&&act.some(k=>['sent','ack','proof','confirmed','prod'].includes(k.st)&&k.who==='wait');
    const ds=act.map(k=>k.d).filter(Boolean).sort((a,b)=>a-b), last=ds[ds.length-1]||null, first=ds[0]||null, asap=act.some(k=>/asap/i.test(k.l.deliveryDate||''));
    const overdue=open&&act.some(k=>k.d&&k.d<TODAY&&!k.dispatched), soon=open&&!overdue&&act.some(k=>k.d&&!k.dispatched&&k.d-TODAY<=7*DAY);
    const gross0=o.gross!=null&&+o.gross>0?+o.gross:r2((o.lines||[]).reduce((a,l)=>a+(l.qty||0)*(l.unit||0)+(+l.deliveryCost||0),0)*(1+VR));
    const credits=r2((x.credits||[]).reduce((a,c)=>a+(+c.gross||0),0)), extra=r2((x.invX||[]).reduce((a,c)=>a+(+c.gross||0),0)), total=r2(gross0+extra-credits);
    const profit=r2(act.reduce((a,k)=>a+(k.l.qty||0)*((k.l.unit||0)-costOf(k.l)),0));
    const sups=[...new Set(act.flatMap(k=>k.two?[k.two.brand,k.two.blank]:[k.sup]))];
    const myCost=r2(mine.filter(k=>k.st!=='cancelled'&&!k.blankOnly).reduce((a,k)=>a+(k.l.qty||0)*costOf(k.l),0));
    const refund=(x.balance||[]).find(b=>b.type==='refund'&&b.status==='open'), due=(x.balance||[]).find(b=>b.type!=='refund'&&b.status==='open');
    const bank=/bank|bacs/i.test(o.payment||''), card=/card/i.test(o.payment||'');
    const pay=refund?['Refund due','red',gbp(refund.amount)]:due?['Payment due','amber',gbp(due.amount)]:x.paid||card?['Paid','green',card?'Card':'Received']:bank?(()=>{ const crit=o.payCrit!=null?o.payCrit:(window.MSBACS?MSBACS.critical(o.lines||[]):false), by=o.payBy?new Date(o.payBy):null, late=by&&by<new Date(); return [crit?'Payment due critical':'Payment due',crit||late?'red':'amber',by?(late?'Overdue · was due ':'Pay by ')+(window.MSBACS?MSBACS.label(by):by.toLocaleString('en-GB')):'Bank transfer']; })():o.onAccount||/days/i.test(o.payment||'')?['On account','peri',(String(o.payment||'').match(/\d+\s*days[^·]*/)||['30 days'])[0].trim()]:['—','',''];
    const times=[o.placed&&pDate(o.placed),...(x.activity||[]).map(a=>a.at&&new Date(a.at)),...act.flatMap(k=>Object.values(k.L.t||{}).map(t=>new Date(t)))].filter(d=>d&&!isNaN(d));
    const lastAct=times.length?new Date(Math.max(...times)):null;
    const cm=Object.values(C).flat().filter(m=>role==='customer'?m.aud==='customer':role==='supplier'?m.aud==='supplier'&&m.sup===me:true).length;
    const fl=role==='distributor'||role==='admin'?(window.MSOSOC&&MSOSOC.orderFlagState?MSOSOC.orderFlagState(o):{level:null}):{level:null};
    const myPO=role==='supplier'?Object.entries(x.pos||{}).filter(([s])=>s===me).map(([,p])=>p.no)[0]||(mine.some(k=>k.blankOnly)?'Blank stock PO':''):'';
    let team={dist:[],cust:[]}; try{ if(window.MSOSOC&&MSOSOC.teamFor&&role!=='supplier') team=MSOSOC.teamFor(o,o.project||'')||team; }catch(e){}
    return {team,o,x,lines,act,mine,stage,cls,open,needs,waitSup,first,last,asap,overdue,soon,total,gross0,credits,profit,sups,myCost,pay,lastAct,cm,fl,nDisp,nDel,myPO,placed:pDate(o.placed),cust:custName(o),cxN:lines.length-act.length}; }

  /* ---------- state ---------- */
  const SK='ms-ordtbl';
  const loadS=()=>Object.assign({fexp:false,kpi:'',chip:'open',pst:'',smp:'',sst:'',route:'',dfld:'placed',dfrom:'',dto:'',q:'',cust:'',proj:'',sup:'',pay:'',contact:'',sort:'placed',dir:-1,exp:[],all:false,sel:[]},J2(sessionStorage.getItem(SK)));
  function J2(s){ try{ return JSON.parse(s||'{}')||{}; }catch(e){ return {}; } }
  const saveS=S=>{ try{ sessionStorage.setItem(SK,JSON.stringify(Object.assign({},S,{sel:[]}))); }catch(e){} };

  document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('[data-oxroot] .ox-lk')){ e.preventDefault(); e.target.click(); } });
  document.addEventListener('mouseover',e=>{ const i=e.target.closest&&e.target.closest('.ox-steps i[data-oxtip]'); const p=i&&i.closest('.ox-sprog'); document.querySelectorAll('.ox-sprog.tipon').forEach(x=>{ if(x!==p) x.classList.remove('tipon'); }); if(!p) return; const tip=p.querySelector('.ox-steptip'); const [a,b]=i.dataset.oxtip.split(' · '); tip.innerHTML='<b>'+esc(a)+'</b><span style="color:var(--ink-3,#5b5f77);font-weight:600">'+esc(b||'')+'</span>'; p.classList.add('tipon'); });
  document.addEventListener('mouseleave',()=>document.querySelectorAll('.ox-sprog.tipon').forEach(x=>x.classList.remove('tipon')));
  function stDetail(k){ const L=k.L||{}, T=L.tracking, V=L.via||{}, fd=d=>{ try{ return new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }catch(e){ return ''; } };
    if(L.cancelled) return 'Cancelled '+fd(L.cancelled.at);
    if(k.st==='delivered'||L.st==='delivered') return T&&T.pod?(T.pod.cust?'Confirmed by ':'Signed for by ')+esc(T.pod.by)+' · '+fd(T.pod.at):'Delivered '+fd(L.t&&L.t.delivered);
    if(L.st==='dispatch'&&T) return `<span title="${esc((T.courier||'')+(T.no?' '+T.no:''))}">${esc(trkTxt(T))}</span>`;
    if(k.st==='atus') return 'Booked in '+fd(V.gin&&V.gin.at)+(V.gin&&(V.gin.short||V.gin.dmg)?' · <b class="over">'+[V.gin.short?V.gin.short+' short':'',V.gin.dmg?V.gin.dmg+' damaged':''].filter(Boolean).join(', ')+'</b>':'');
    if(k.st==='tous') return esc(trkTxt(V.inTrk));
    if(L.st==='prod') return isUS(k.l)?'Awaiting dispatch':(L.oa&&L.oa.dispatch?'Dispatch due '+fd(L.oa.dispatch):'In production');
    if(L.st==='confirmed') return 'Waiting for the supplier to start';
    if(L.st==='proof') return L.pf&&L.pf.checked?'Proof checked':'Proof to check';
    if(L.st==='ack') return L.oa&&L.oa.mismatch?'<b class="over">Doesn’t match the PO</b>':L.oa&&L.oa.checked?'Checked · awaiting proof':'Acknowledgement to check';
    if(L.st==='sent') return L.reOA?'Revised acknowledgement needed':'Sent '+fd(L.t&&L.t.sent);
    if(L.st==='revision') return L.rev&&L.rev.custOk?'Customer reconfirmed':'Waiting for the customer';
    return 'To check &amp; send'; }
  const SMPST=[['send','To check & send'],['sup','With supplier'],['prod','In production'],['disp','Awaiting dispatch'],['wh','At our warehouse'],['out','Dispatched'],['fb','Feedback due'],['done','Reviewed']];
  function smpSt(k){ const L=k.L||{}; if(L.cancelled) return 'cx'; const st=L.st||'received';
    if(st==='received') return 'send'; if(['sent','ack','proof','confirmed','revision'].includes(st)) return 'sup';
    if(st==='prod'){ if(k.st==='atus') return 'wh'; if(k.st==='tous') return 'disp'; return isUS(k.l)?'disp':'prod'; }
    if(st==='dispatch') return 'out';
    if(st==='delivered'){ let M={}; try{ M=JSON.parse(localStorage.getItem('ms-sample-delivered')||'{}'); }catch(e){} const d=M[k.l.name+'|'+(isUS(k.l)?'unbranded':'branded')]; return d&&d.done?'done':'fb'; }
    return 'sup'; }
  function render(root,orders,role,opts){ opts=opts||{}; role=role==='admin'?'distributor':role; const dist=role==='distributor', cust=role==='customer', sup=role==='supplier', me=opts.me||'BagWorks UK';
    const S=loadS(); if(S.chip==='flag') S.chip='open'; const routeOf=r=>{ const L0=r.lines.filter(k=>!(k.L&&k.L.cancelled)), n=L0.filter(k=>k.via).length; return {n,of:L0.length,kind:!n?'direct':n===L0.length?'via':'mixed',hubs:[...new Set(L0.filter(k=>k.via&&k.hub).map(k=>k.hub.id))]}; }; if(S.pst==='pflag') S.pst='';
    let all=orders.map(o=>sum(o,role,me)); if(sup) all=all.filter(r=>r.mine.length&&(r.mine.some(k=>k.blankOnly)||r.mine.some(k=>FIDX[k.st]>=FIDX.sent)));
    const T=r=>({placed:+(r.placed||0),ref:r.o.ref,cust:r.cust,proj:r.o.project||'',items:r.act.length,value:sup?r.myCost:r.total,profit:r.profit,deliv:+(r.last||0)||(r.asap?1:9e15),stage:r.stage,pay:r.pay[0],last:+(r.lastAct||0),by:r.o.placedBy||''});
    const KPIS=dist?[['open','Open orders',r=>r.open],['act','Need your action',r=>r.needs],['sup','Waiting on suppliers',r=>r.waitSup],['week','Due in the next 7 days',r=>r.soon],['late','Overdue',r=>r.overdue,1],['value','Open order value',r=>r.open,0,rs=>gbp0(rs.reduce((a,r)=>a+r.total,0))]]
      :cust?[['open','Open orders',r=>r.open],['act','Need your action',r=>r.needs],['disp','On the way',r=>r.stage==='Dispatched'||r.stage==='Part dispatched'],['del','Delivered',r=>r.stage==='Delivered'],['value','Total spend',r=>r.stage!=='Cancelled',0,rs=>gbp0(rs.reduce((a,r)=>a+r.total,0))]]
      :[['open','Open POs',r=>r.open],['act','Need your action',r=>r.needs],['prod','In production',r=>r.stage==='In production'],['late','Overdue',r=>r.overdue,1],['value','Open PO value',r=>r.open,0,rs=>gbp0(rs.reduce((a,r)=>a+r.myCost,0))]];
    const ofl=r=>{ const f=window.MSFLAG&&MSFLAG.get('order:'+r.o.id); return f&&f.level||''; }, pfl=r=>(r.o.lines||[]).map((l,i)=>{ const f=window.MSFLAG&&MSFLAG.get('oline:'+r.o.id+':'+i); return f&&f.level||''; }).filter(Boolean);
    const CHIPS=[['all','All',()=>true],['open','Open',r=>r.open],['act','Needs action',r=>r.needs],['prod','In production',r=>r.stage==='In production'],['disp','Dispatched',r=>/dispatched/i.test(r.stage)],['del','Delivered',r=>r.stage==='Delivered'],['cx','Cancelled',r=>r.stage==='Cancelled'],...(dist?[['warn','Warning',r=>ofl(r)==='amber'],['actn','Action needed',r=>ofl(r)==='red']]:[])];
    const contacts=[...new Set(all.flatMap(r=>r.team.dist.map(u=>u.n)))].sort(), custs=[...new Set(all.map(r=>r.cust))].sort(), projs=[...new Set(all.map(r=>r.o.project).filter(Boolean))].sort(), suppl=[...new Set(all.flatMap(r=>r.sups))].sort(), pays=[...new Set(['Payment due','Payment due critical',...all.map(r=>r.pay[0]).filter(p=>p&&p!=='—')])];
    // product rows shown inside an expanded order: only those matching the active product / sample / route filters
    const lineMatch=k=>{ if(!k||!k.l) return false;
      if(S.smp||S.sst){ if(k.l.kind!=='sample') return false; if(S.smp&&(S.smp==='un'?!isUS(k.l):isUS(k.l))) return false; if(S.sst&&smpSt(k)!==S.sst) return false; }
      if(S.pst){ if(S.pst==='pwarn'||S.pst==='pactn'||S.pst==='pflag'){ const fl=k.oid&&window.MSFLAG?((MSFLAG.get('oline:'+k.oid+':'+k.i)||{}).level||''):''; if(S.pst==='pwarn'&&fl!=='amber') return false; if(S.pst==='pactn'&&fl!=='red') return false; if(S.pst==='pflag'&&!fl) return false; } else if(!(k.st===S.pst||(S.pst==='confirmed'&&k.st==='ok'))) return false; }
      if(S.route&&('via' in k)){ if(S.route==='via'&&!k.via) return false; if(S.route==='direct'&&k.via) return false; }
      return true; };
    const filtering=()=>!!(S.smp||S.sst||S.pst||S.route);
    function rows(){ const kf=KPIS.find(k=>k[0]===S.kpi), cf=CHIPS.find(c=>c[0]===S.chip)||CHIPS[0], q=S.q.trim().toLowerCase();
      let L=all.filter(r=>(!kf||kf[2](r))&&cf[2](r)&&(!S.cust||r.cust===S.cust)&&(!S.proj||r.o.project===S.proj)&&(!S.sup||r.sups.includes(S.sup))&&(!(S.dfrom||S.dto)||(()=>{ const d=S.dfld==='deliv'?r.last:r.placed; if(!d||!+d) return false; const v=new Date(d); v.setHours(12,0,0,0); if(S.dfrom&&v<new Date(S.dfrom+'T00:00:00')) return false; if(S.dto&&v>new Date(S.dto+'T23:59:59')) return false; return true; })())&&(!S.pay||r.pay[0]===S.pay)&&(!S.route||(()=>{ const ro=routeOf(r); if(S.route==='direct') return ro.kind==='direct'; if(S.route==='mixed') return ro.kind==='mixed'; if(S.route==='via') return ro.n>0; if(S.route.startsWith('via:')) return ro.hubs.includes(S.route.slice(4)); return true; })())&&(!S.contact||r.team.dist.some(u=>u.n===S.contact))&&(!(S.smp||S.sst)||(sup?r.mine:r.lines).some(k=>k.l&&k.l.kind==='sample'&&(!S.smp||(S.smp==='un'?isUS(k.l):!isUS(k.l)))&&(!S.sst||smpSt(k)===S.sst)))&&(!S.pst||(S.pst==='pflag'?pfl(r).length>0:S.pst==='pwarn'?pfl(r).includes('amber'):S.pst==='pactn'?pfl(r).includes('red'):(sup?r.mine:r.lines).some(k=>k.st===S.pst||(S.pst==='confirmed'&&k.st==='ok'))))
        &&(!q||[r.o.ref,r.o.po,r.o.project,sup?'':r.cust,r.o.placedBy,...r.lines.map(k=>k.l.name),...r.sups].join(' ').toLowerCase().includes(q)));
      const k=S.sort; L.sort((a,b)=>{ const A=T(a)[k], B=T(b)[k]; return (typeof A==='number'?A-B:String(A).localeCompare(String(B)))*S.dir; }); return L; }
    const COLS=[...(sup?[]:[['sel','','',0]]),['chev','','',0],...(dist?[['cust','Customer','cust']]:[]),['ref',sup?'Order / PO':'Order','ref'],['proj','Project','proj'],...(sup?[]:[['team','Team','']]),['placed','Placed','placed'],['items','Items','items','num'],['value',sup?'Your value':'Value','value','num'],...(dist?[['profit','Profit','profit','num']]:[]),['stage','Progress','stage'],['deliv','Deliver by','deliv'],...(dist?[['sups','Suppliers','']]:[]),...(sup?[]:[['pay','Payment','pay']]),['social',dist?'Flag · comments':'Comments',''],['last','Last activity','last']];
    const stagePill=r=>`<span class="ox-pill c-${r.cls}">${esc(r.stage)}</span>`;
    const dots=r=>{ const L=sup?r.mine:r.lines; return `<span class="ox-dots">${L.map(k=>`<i class="c-${k.st==='cancelled'?'x':k.who==='act'?'red':k.who==='done'?'green':'amber'}" title="${esc(k.l.name)} · ${k.st==='cancelled'?'Cancelled':k.who==='act'?'Action required':k.who==='done'?'Done':'Waiting'}"></i>`).join('')}</span>`; };
    const progSub=r=>{ const n=r.act.length; if(!n) return ''; if(r.nDel===n) return 'All delivered'; if(r.nDisp) return `${r.nDisp} of ${n} dispatched`; const a=(sup?r.mine:r.act).filter(k=>k.who==='act').length; return a?`${a} need${a===1?'s':''} action`:`${n} item${n>1?'s':''}`; };
    const delivCell=r=>{ if(r.stage==='Cancelled') return '<span class="ox-mut">—</span>'; if(r.stage==='Delivered') return `<span class="ox-ok">${ic(I.check,13)}Delivered</span>`; const d=r.last; if(!d) return r.asap?'<b class="ox-d">ASAP</b>':'<span class="ox-mut">—</span>';
      return `<b class="ox-d${r.overdue?' over':r.soon?' soon':''}">${fD(d)}</b>${r.first&&+r.first!==+d?`<small>from ${fDs(r.first)}</small>`:''}${r.overdue?'<small class="over">Overdue</small>':''}`; };
    const payCell=r=>r.pay[0]==='—'?'<span class="ox-mut">—</span>':`<span class="ox-pay c-${r.pay[1]}">${esc(r.pay[0])}</span>${r.pay[2]?`<small>${esc(r.pay[2])}</small>`:''}`;
    const socialCell=r=>{ if(window.MSOSOC&&MSOSOC.heroHTML) return `<span class="ox-social ox-socb">${MSOSOC.heroHTML(r.o,sup?[me]:r.sups)}</span>`; const fl=dist&&r.fl.level?`<span class="ox-ic flag l-${r.fl.level}" title="Flagged">${ic(I.flag,15)}</span>`:dist?`<span class="ox-ic" title="Not flagged">${ic(I.flag,15)}</span>`:''; return `<span class="ox-social">${fl}<span class="ox-ic${r.cm?' has':''}" title="${r.cm} comment${r.cm===1?'':'s'}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>${r.cm?`<b>${r.cm}</b>`:''}</span></span>`; };
    const cell={sel:r=>`<td class="ox-selc"><span class="ox-chk${S.sel.includes(r.o.id)?' on':''}" data-sel="${esc(r.o.id)}" role="checkbox" aria-checked="${S.sel.includes(r.o.id)}" aria-label="Select ${esc(r.o.ref)}">${ic(I.check,12)}</span></td>`,
      chev:r=>`<td class="ox-chevc"><button type="button" class="ox-chev${S.all||S.exp.includes(r.o.id)?' on':''}" data-exp="${esc(r.o.id)}" aria-label="Show products">${ic(I.chev,14)}</button></td>`,
      cust:r=>`<td><span class="ox-cust ox-lk" data-ocust="${esc(r.o.customer||r.cust)}" role="button" tabindex="0" title="View ${esc(r.cust)}">${logo(r.cust)}<b>${esc(r.cust)}</b></span></td>`,
      ref:r=>`<td><b class="ox-ref">${esc(r.o.ref)}${dist&&window.MSVIA?(ro=>ro.n?`<span class="ox-viaic" title="Via us · ${ro.n} of ${ro.of} item${ro.of===1?'':'s'}">${ic(I.truck||'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',14)}</span>`:'')(routeOf(r)):''}</b><small>${sup?esc(r.myPO||''):r.o.po?'PO '+esc(r.o.po):''}</small></td>`,
      proj:r=>{ const P=[...new Set([r.o.project,...(r.o.lines||[]).map(l=>l.project)].filter(Boolean))]; if(!P.length) return '<td class="ox-proj"><span class="ox-mut">—</span></td>'; const url=p=>/autumn giveaways/i.test(p)?'Merchsmith Project - Autumn Giveaways.html':'Merchsmith Distributor Projects.html?q='+encodeURIComponent(p);
        return `<td class="ox-proj"><a class="ox-plk" href="${esc(url(P[0]))}" title="Open ${esc(P[0])}">${esc(P[0])}</a>${P.length>1?` <span class="ox-pmore" title="${esc(P.join('\n'))}">+${P.length-1} more</span>`:''}</td>`; },
      team:r=>{ const P=[...r.team.dist.map(u=>Object.assign({},u,{side:'d'})),...r.team.cust.map(u=>Object.assign({},u,{side:'c'}))]; if(!P.length) return '<td><span class="ox-mut">—</span></td>';
        return `<td><span class="ox-team" title="${esc(P.map(u=>u.n+(u.prole?' · '+u.prole:'')).join('\n'))}">${P.slice(0,4).map(u=>`<span class="ox-tm ${u.side} ox-lk" data-operson="${esc(u.n)}" data-opem="${esc(u.email||'')}" data-oporg="${esc(u.side==='d'?'Mojo Promotions':r.cust)}" role="button" tabindex="0" title="${esc(u.n)}">${av(u.n,26)}</span>`).join('')}${P.length>4?`<span class="ox-tm more">+${P.length-4}</span>`:''}</span></td>`; },
      placed:r=>`<td><span class="ox-by">${sup||!r.o.placedBy?'':`<span class="ox-lk" data-operson="${esc(r.o.placedBy)}" data-oporg="${esc(r.cust)}" role="button" tabindex="0" title="${esc(r.o.placedBy)}">${av(r.o.placedBy,24)}</span>`}<span><b>${fD(r.placed)}</b>${sup||!r.o.placedBy?'':`<small class="ox-lk ox-lkt" data-operson="${esc(r.o.placedBy)}" data-oporg="${esc(r.cust)}" role="button" tabindex="0">${esc(r.o.placedBy)}</small>`}</span></span></td>`,
      items:r=>`<td class="num">${(sup?r.mine:r.act).length}${r.cxN&&!sup?`<small class="over">${r.cxN} cancelled</small>`:''}</td>`,
      value:r=>`<td class="num"><b>${sup&&!r.myCost&&r.mine.some(k=>k.blankOnly)?'See PO':gbp(sup?r.myCost:r.total)}</b>${!sup&&r.credits?`<small>was ${gbp(r.gross0)}</small>`:''}</td>`,
      profit:r=>`<td class="num ox-profit">${r.stage==='Cancelled'?'<span class="ox-mut">—</span>':gbp0(r.profit)}</td>`,
      stage:r=>`<td><div class="ox-prog">${stagePill(r)}<span class="ox-progr">${dots(r)}<small>${esc(progSub(r))}</small></span></div></td>`,
      deliv:r=>`<td class="ox-delc">${delivCell(r)}</td>`,
      sups:r=>`<td><span class="ox-sups">${r.sups.slice(0,3).map(supTile).join('')}${r.sups.length>3?`<span class="ox-sup more">+${r.sups.length-3}</span>`:''}</span></td>`,
      pay:r=>`<td class="ox-payc">${payCell(r)}</td>`,
      social:r=>`<td>${socialCell(r)}</td>`,
      last:r=>`<td class="ox-last">${esc(ago(r.lastAct))}</td>`};
    // expanded product rows: same room + information as the Projects table's product rows
    const SPEC=J('ms-pm-spec',{});
    const STL={received:'Order received',sent:sup?'New order':'Checked & sent',ack:'Acknowledged',proof:sup?'Proof sent':'Proof received',confirmed:'Proof approved',ok:'Proof approved',prod:'In production',tous:'To us',atus:'At our warehouse',dispatch:'Dispatched',delivered:'Delivered',revision:'Revision',cancelled:'Cancelled'};
    const STC=s=>s==='delivered'?'green':s==='dispatch'||s==='tous'?'sky':s==='atus'?'amber':s==='prod'?'violet':s==='revision'?'amber':s==='cancelled'?'red':'peri';
    const tidy=v=>String(v||'').replace(/^asap$/i,'ASAP').replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\./,'$1').replace(/\b(\d{1,2})(st|nd|rd|th)\b/,'$1');
    const SUBH=[['Product'],['Progress'],['Price','r'],...(cust?[]:[['Supplier date']]),...(sup?[]:[[cust?'Delivery':'Customer date']]),['Status'],['']];
    const subCols=(sup?'minmax(260px,1.5fr) minmax(210px,1.2fr) 150px 170px 150px':cust?'minmax(260px,1.5fr) minmax(210px,1.2fr) 150px 170px 150px':'minmax(260px,1.5fr) minmax(210px,1.2fr) 170px 170px 170px 150px')+' 96px';
    const sub=r=>{ (r.lines||[]).forEach(k=>{ k.oid=r.o.id; }); const L0=sup?r.mine:r.lines, L=filtering()?L0.filter(lineMatch):L0, hid=L0.length-L.length;
      return `<tr class="ox-subtr"><td colspan="${COLS.length}"><div class="ox-subs" style="--oxc:${subCols}"><div class="ox-subh">${SUBH.map(h=>`<span${h[1]?' class="r"':''}>${h[0]}</span>`).join('')}</div>${L.map(k=>{ const l=k.l, y=(SPEC[l.name]||{}).supply||{}, st=k.st, qty=l.qty||0, unit=sup?costOf(l):(l.unit||0), tot=qty*unit, cost=qty*costOf(l);
          const idx=st==='cancelled'?-1:(FIDX[st]??0), dot=st==='cancelled'?'x':k.who==='act'?'red':k.who==='done'?'green':'amber';
          const supD=tidy(y.supDisplay||''), cusD=tidy(y.cusDisplay||l.deliveryDate||'ASAP'), agreed=(y.agreedWith||[]).join(', ');
          const two=k.two&&!cust, li=k.i!=null?k.i:l.i!=null?l.i:(r.o.lines||[]).indexOf(l);
          return `<a class="ox-sub" href="#order=${esc(r.o.id)}&item=${li}" data-open="${esc(r.o.id)}&item=${li}" title="Open ${esc(l.name)} in the order">
            <span class="ox-sp"><span class="ox-th"><img src="${esc(l.visual||('assets/products/'+(IMGFIX[l.img]||l.img||'clothing')+'.png'))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/products/clothing.png'"></span><span class="ox-sn"><b>${esc(l.name)}${l.kind==='sample'?`<em class="ox-smp${isUS(l)?' un':''}">${isUS(l)?'Unbranded sample':'Branded sample'}</em>`:''}${!cust&&k.via?`<em class="ox-via" title="Via us · ${esc(k.hub?k.hub.name+' · '+(k.hub.lines||[]).join(', '):'')}">Via us</em>`:''}</b><small>${cust?esc(l.kind==='sample'?'':(l.branding||'')):two?`<span class="ox-lk ox-lkt" data-osupp="${esc(k.two.blank)}" role="button" tabindex="0">${esc(k.two.blank)}</span> → <span class="ox-lk ox-lkt" data-osupp="${esc(k.two.brand)}" role="button" tabindex="0">${esc(k.two.brand)}</span>`:`<span class="ox-lk ox-lkt" data-osupp="${esc(k.sup)}" role="button" tabindex="0">${esc(k.sup)}</span>`}</small>${(l.colours||[]).length?`<small class="ox-scol">${(l.colours||[]).slice(0,3).map(c=>{ c=typeof c==='string'?{name:c}:c; const nm=c.name||c.c||c.colour||c.label||''; const HX={black:'#1e1e1e',white:'#fff',navy:'#1f2b4d',grey:'#9aa0a6',gray:'#9aa0a6',natural:'#e9dfc9',red:'#c62828',blue:'#1f5fbf',green:'#2e7d32',pink:'#f48fb1',yellow:'#f2c230',orange:'#ef6c00',purple:'#6a3fa0',brown:'#6d4c41',terracotta:'#c8643b',silver:'#c0c0c0'}; const hx=c.hex||HX[String(nm).toLowerCase().split(/\s+/).pop()]||HX[String(nm).toLowerCase()]||'#ccc'; return `<i style="background:${esc(hx)}"></i>${esc(nm)}${c.qty?' '+c.qty:''}${c.sizes?' <span class="ox-szs">('+Object.entries(c.sizes).map(([a,q])=>esc(a)+' '+q).join(', ')+')</span>':''}`; }).join(' · ')}</small>`:''}</span></span>
            <span class="ox-sprog"><span class="ox-steptip" aria-live="polite"></span><span class="ox-steps">${FL.map((s,j)=>{ const ts=(k.L&&k.L.t&&k.L.t[s])||(s==='received'?r.o.placed:null), dn=idx>=0&&j<=idx&&ts; const tip=(SLBL[s]||s)+' · '+(idx<0?'Cancelled':j<idx||(j===idx&&s==='delivered')?(dn?fDT(ts):'Done'):j===idx?(dn?'Since '+fDT(ts):'In progress'):'Not yet'); return `<i class="${idx<0?'x':j<idx?'done':j===idx?(dot==='red'?'act':'cur'):''}" data-oxtip="${esc(tip)}" aria-label="${esc(tip)}"></i>`; }).join('')}</span><small><i class="ox-sdot c-${dot}"></i>${esc(STL[st]||st)}${k.probs?` · <b class="over">${k.probs} problem${k.probs>1?'s':''}</b>`:''}</small></span>
            <span class="ox-spr"><b>${gbp(tot)}</b><small>${qty.toLocaleString('en-GB')} × ${gbp(unit)}</small>${dist?`<span class="ox-pm"><em>Cost ${gbp0(cost)}</em><em class="p">Profit ${gbp0(tot-cost)}</em></span>`:''}</span>
            ${cust?'':`<span class="ox-sdt"><span class="ox-dl sup"><em>Sup</em><b>${esc(supD||'Not agreed')}</b></span>${agreed&&!sup?`<small>Agreed with <span class="ox-lk ox-lkt" data-operson="${esc(agreed)}" data-oporg="${esc(k.sup||'')}" role="button" tabindex="0">${esc(agreed)}</span></small>`:''}</span>`}
            ${sup?'':`<span class="ox-sdt"><span class="ox-dl cus"><em>${cust?'Due':'Cus'}</em><b>${esc(cusD)}</b></span>${cust?'':`<small class="${y.nofail?'crit':''}">${y.nofail?'Critical':'Standard'}</small>`}</span>`}
            <span class="ox-sst"><span class="ox-pill c-${STC(st)}">${esc(STL[st]||st)}</span>${(t2=>t2?`<small class="ox-sstx">${t2}</small>`:'')(stDetail(k))}</span>
            <span class="ox-stool">${window.MSOSOC?MSOSOC.lineHTML(r.o,li,l.name,k.sup||l.sup||''):''}</span></a>`; }).join('')}${hid?`<div class="ox-subhid">${hid} other product${hid>1?'s':''} in this order ${hid>1?'are':'is'} hidden by your filters · <button type="button" class="ox-lk ox-lkt" data-clrpf>Show all</button></div>`:''}</div></td></tr>`; };

    function draw(){ saveS(S); const L=rows(), base=all;
      const kpiHTML=KPIS.map(k=>{ const rs=base.filter(k[2]), v=k[4]?k[4](rs):rs.length; return `<button type="button" class="ox-kpi${S.kpi===k[0]?' on':''}${k[3]&&rs.length?' warn':''}" data-kpi="${k[0]}"><b>${v}</b><span>${k[1]}</span></button>`; }).join('');
      const PST=[['received','Order received'],['sent',sup?'New order':'Checked & sent'],['ack','Acknowledged'],['proof','Proof received'],['confirmed','Proof approved'],['revision','Revision'],['prod','In production'],...(dist?[['tous','To us'],['atus','At our warehouse']]:[]),['dispatch','Dispatched'],['delivered','Delivered'],['cancelled','Cancelled']].filter(p=>!(cust&&['sent','ack','proof'].includes(p[0])));
      const pstHTML=PST.map(p=>{ const n=base.filter(r=>(sup?r.mine:r.lines).some(k=>k.st===p[0]||(p[0]==='confirmed'&&k.st==='ok'))).length; return `<button type="button" class="fchip${S.pst===p[0]?' on':''}${n?'':' zero'}" data-pst="${p[0]}">${p[1]} <span class="n">${n}</span></button>`; }).join('');
      const smpLines=r=>(sup?r.mine:r.lines).filter(k=>k.l&&k.l.kind==='sample'), smpN=f=>base.filter(r=>smpLines(r).some(f)).length;
      const smpAny=base.some(r=>smpLines(r).length);
      const smpRow=dist&&smpAny?`</div><div class="frow ox-smprow"><span class="fgrp">Samples</span><button type="button" class="fchip${!S.smp&&!S.sst?' on':''}" data-smp="">All</button><button type="button" class="fchip${S.smp==='un'?' on':''}" data-smp="un">Unbranded <span class="n">${smpN(k=>isUS(k.l))}</span></button><button type="button" class="fchip${S.smp==='br'?' on':''}" data-smp="br">Branded <span class="n">${smpN(k=>!isUS(k.l))}</span></button><span class="ox-fsep"></span>${SMPST.map(([v,lb])=>{ const n=smpN(k=>smpSt(k)===v&&(!S.smp||(S.smp==='un'?isUS(k.l):!isUS(k.l)))); return `<button type="button" class="fchip${S.sst===v?' on':''}${n?'':' zero'}${v==='fb'&&n?' urg':''}" data-sst="${v}">${lb} <span class="n">${n}</span></button>`; }).join('')}`:'';
      const chipHTML=CHIPS.map(c=>`<button type="button" class="fchip${S.chip===c[0]?' on':''}${/^(flag|warn|actn)$/.test(c[0])?' urg fl-'+c[0]:''}" data-chip="${c[0]}">${/^(flag|warn|actn)$/.test(c[0])?ic(I.flag,13):''}${c[1]} <span class="n">${base.filter(c[2]).length}</span></button>`).join('');
      const sel=(id,lab,list,v)=>`<select class="fsel" data-f="${id}" aria-label="${lab}"><option value="">${lab}</option>${list.map(x=>`<option${x===v?' selected':''}>${esc(x)}</option>`).join('')}</select>`;
      const extraN=(S.pst?1:0)+(S.pay?1:0)+(S.route?1:0)+(S.dfrom||S.dto?1:0);
      const any=S.q||S.cust||S.proj||S.sup||S.pay||S.contact||S.pst||S.route||S.dfrom||S.dto||S.smp||S.sst||S.kpi||S.chip!=='open';
      const head=COLS.map(c=>c[0]==='sel'?`<th class="ox-selc"><span class="ox-chk${L.length&&L.every(r=>S.sel.includes(r.o.id))?' on':''}" data-selall role="checkbox" aria-label="Select all">${ic(I.check,12)}</span></th>`:c[0]==='chev'?'<th class="ox-chevc"></th>':`<th class="${c[2]?'sortable':''}${c[3]?' num':''}${S.sort===c[2]?' on':''}"${c[2]?` data-sort="${c[2]}"`:''}>${c[1]}${S.sort===c[2]?`<span class="dir">${S.dir>0?'▲':'▼'}</span>`:''}</th>`).join('');
      const body=L.length?L.map(r=>`<tr class="ox-tr${S.sel.includes(r.o.id)?' sel':''}${r.stage==='Cancelled'?' cx':''}${r.fl.level?' fl-'+r.fl.level:''}" data-open="${esc(r.o.id)}">${COLS.map(c=>cell[c[0]](r)).join('')}</tr>${S.all||S.exp.includes(r.o.id)?sub(r):''}`).join('')
        :`<tr><td colspan="${COLS.length}"><div class="ox-empty">${ic(I.box,28)}<b>${all.length?'No orders match these filters':sup?'No orders for you yet':'No orders yet'}</b><span>${all.length?'Try clearing the filters or searching for something else.':sup?'Orders appear here once a distributor sends you a purchase order.':'Orders appear here once they’re placed from a project or the store.'}</span>${all.length&&any?'<button type="button" class="ox-link" data-clear>Clear filters</button>':''}</div></td></tr>`;
      const tv=L.reduce((a,r)=>a+(sup?r.myCost:r.total),0), tp=L.reduce((a,r)=>a+(r.stage==='Cancelled'?0:r.profit),0);
      root.querySelector('[data-oxbody]').innerHTML=`<div class="ox-kpis" style="grid-template-columns:repeat(${KPIS.length},minmax(0,1fr))">${kpiHTML}</div>
        <div class="filterchips"><div class="frow"><span class="fgrp">Orders</span>${chipHTML}<button type="button" class="fchip ftog" data-fexp>${S.fexp?'Hide filters':'More filters'}${extraN?` <span class="fbadge">${extraN}</span>`:''}<svg class="icn" viewBox="0 0 24 24" style="stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="${S.fexp?'m6 15 6-6 6 6':'m6 9 6 6 6-6'}"/></svg></button>${S.fexp?smpRow:''}</div>
          ${S.fexp?`<div class="frow"><span class="fgrp">Products</span><button type="button" class="fchip${S.pst?'':' on'}" data-pst="">All</button>${pstHTML}${dist?[['pwarn','Warning',r=>pfl(r).includes('amber')],['pactn','Action needed',r=>pfl(r).includes('red')]].map(([k,l,f])=>{ const n=base.filter(f).length; return `<button type="button" class="fchip urg fl-${k}${S.pst===k?' on':''}${n?'':' zero'}" data-pst="${k}">${ic(I.flag,13)}${l} <span class="n">${n}</span></button>`; }).join(''):''}</div>${sup?'':`<div class="frow"><span class="fgrp">Payment</span><button type="button" class="fchip${S.pay?'':' on'}" data-pay="">Any</button>${pays.map(p=>`<button type="button" class="fchip${S.pay===p?' on':''}${/critical/i.test(p)?' urg':''}" data-pay="${esc(p)}">${esc(p)} <span class="n">${base.filter(r=>r.pay[0]===p).length}</span></button>`).join('')}</div>`}`
            :(extraN?`<div class="frow ftokens"><span class="fgrp">Applied</span>${S.pst?`<button type="button" class="ftok" data-tok="pst">${esc((PST.find(p=>p[0]===S.pst)||[0,S.pst])[1])} <span class="x">&times;</span></button>`:''}${S.pay?`<button type="button" class="ftok" data-tok="pay">${esc(S.pay)} <span class="x">&times;</span></button>`:''}</div>`:'')}</div>
        <div class="tools"><label class="search">${ic(I.search,16)}<input class="ox-qin" style="border:0 none transparent!important;border-radius:0!important;box-shadow:none!important;outline:0!important;padding:0!important;background:transparent!important;height:auto!important" data-q value="${esc(S.q)}" placeholder="${sup?'Search order, PO or product…':'Search order, PO, project'+(dist?', customer':'')+' or product…'}"></label>
          ${dist?sel('cust','All customers',custs,S.cust)+sel('contact','All team members',contacts,S.contact):''}${sel('proj','All projects',projs,S.proj)}${dist?sel('sup','All suppliers',suppl,S.sup):''}<span class="ox-dr"><select class="fsel" data-f="dfld" aria-label="Which date"><option value="placed"${S.dfld!=='deliv'?' selected':''}>Placed</option><option value="deliv"${S.dfld==='deliv'?' selected':''}>Deliver by</option></select><label><span>From</span><input type="date" class="fsel ox-din" data-f="dfrom" value="${esc(S.dfrom)}"${S.dto?` max="${esc(S.dto)}"`:''}></label><label><span>To</span><input type="date" class="fsel ox-din" data-f="dto" value="${esc(S.dto)}"${S.dfrom?` min="${esc(S.dfrom)}"`:''}></label>${S.dfrom||S.dto?'<button type="button" class="ox-dx" data-dclr title="Clear dates" aria-label="Clear dates">×</button>':''}</span>${dist&&window.MSVIA?(()=>{ const H=MSVIA.hubs(); const o=[['','All routes'],['direct','Direct to customer'],['via','Via us'],...(H.length>1?H.map(h=>['via:'+h.id,'Via '+h.name]):[]),['mixed','Mixed']]; return `<select class="fsel" data-f="route" aria-label="Route">${o.map(([v,lb])=>`<option value="${esc(v)}"${S.route===v?' selected':''}>${esc(lb)}</option>`).join('')}</select>`; })():''}
          <button type="button" class="fsel" data-all>${S.all?'Collapse all ▴':'Expand all ▾'}</button>${any?'<button type="button" class="fclear" data-clear>Clear filters</button>':''}</div>
        ${S.sel.length?`<div class="ox-bulk"><span><b>${S.sel.length}</b> selected</span><div class="ox-bulka"><button type="button" data-bulk="csv">${ic(I.dl,15)}Export CSV</button>${dist?`<button type="button" data-bulk="flag">${ic(I.flag,15)}Flag</button>`:''}</div><button type="button" class="ox-bulkx" data-bulk="clear">Clear selection</button></div>`:''}
        <div class="ox-wrap"><table class="ox-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
        <div class="ox-foot">${L.length} order${L.length===1?'':'s'} · ${sup?'your value':'value'} ${gbp0(tv)}${dist?' · profit '+gbp0(tp):''}${L.length!==all.length?` · filtered from ${all.length}`:''}</div>`;
      wire(); }
    function wire(){ const q=s=>root.querySelectorAll(s);
      q('[data-kpi]').forEach(b=>b.onclick=()=>{ S.kpi=S.kpi===b.dataset.kpi?'':b.dataset.kpi; if(S.kpi) S.chip='all'; draw(); });
      q('[data-chip]').forEach(b=>b.onclick=()=>{ S.chip=b.dataset.chip; S.kpi=''; draw(); });
      q('[data-fexp]').forEach(b=>b.onclick=()=>{ S.fexp=!S.fexp; draw(); });
      q('[data-pay]').forEach(b=>b.onclick=()=>{ S.pay=S.pay===b.dataset.pay?'':b.dataset.pay; draw(); });
      q('[data-tok]').forEach(b=>b.onclick=()=>{ S[b.dataset.tok]=''; draw(); });
      q('[data-clrpf]').forEach(b=>b.onclick=e=>{ e.preventDefault(); e.stopPropagation(); S.smp=''; S.sst=''; S.pst=''; S.route=''; draw(); });
      q('[data-smp]').forEach(b=>b.onclick=()=>{ const v=b.dataset.smp; if(!v){ S.smp=''; S.sst=''; } else S.smp=S.smp===v?'':v; S.chip='all'; S.kpi=''; draw(); });
      q('[data-sst]').forEach(b=>b.onclick=()=>{ S.sst=S.sst===b.dataset.sst?'':b.dataset.sst; S.chip='all'; S.kpi=''; draw(); });
      q('[data-pst]').forEach(b=>b.onclick=()=>{ S.pst=S.pst===b.dataset.pst?'':b.dataset.pst; if(S.pst){ S.chip='all'; S.kpi=''; } draw(); });
      q('[data-f]').forEach(s=>s.onchange=()=>{ S[s.dataset.f]=s.value; draw(); });
      const qi=root.querySelector('[data-q]'); if(qi) qi.oninput=()=>{ S.q=qi.value; const p=qi.selectionStart; draw(); const n=root.querySelector('[data-q]'); n.focus(); n.setSelectionRange(p,p); };
      q('[data-dclr]').forEach(b=>b.onclick=()=>{ S.dfrom=''; S.dto=''; draw(); });
      q('[data-clear]').forEach(b=>b.onclick=()=>{ Object.assign(S,{q:'',cust:'',proj:'',sup:'',pay:'',contact:'',pst:'',route:'',smp:'',sst:'',dfrom:'',dto:'',kpi:'',chip:'open'}); draw(); });
      { const th=root.querySelector('.ox-tbl thead'); if(th) root.style.setProperty('--ox-thh',Math.round(th.getBoundingClientRect().height)+'px'); }
      if(!root.__oxPin){ root.__oxPin=1; let q=0;
        const pin=()=>{ q=0; const th=root.querySelector('.ox-tbl thead th'); if(!th) return; const line=th.getBoundingClientRect().bottom, rh=parseFloat(root.style.getPropertyValue('--ox-rowh'))||66, edge=line+rh; let cur=null;
          root.querySelectorAll('.ox-subtr').forEach(s=>{ const r=s.previousElementSibling; if(!r||!r.classList.contains('ox-tr')) return; const rb=r.getBoundingClientRect(), sb=s.getBoundingClientRect();
            if(rb.top<edge-1&&sb.bottom>edge+8) cur=r; });
          root.querySelectorAll('.ox-tr.ox-pin').forEach(r=>{ if(r!==cur) r.classList.remove('ox-pin'); });
          if(cur){ cur.classList.add('ox-pin'); const h0=Math.round(cur.querySelector('td').getBoundingClientRect().height); root.style.setProperty('--ox-rowh',h0+'px'); }
          // snap to product rows once an order's products are under the pinned headings
          const sh=cur&&cur.nextElementSibling&&cur.nextElementSibling.querySelector('.ox-subh'), de=document.documentElement;
          if(false&&cur&&sh&&!root.__kbd){ /* row snap switched off for now (too glitchy); re-enable by removing false&& */ const pad=Math.round(edge+sh.getBoundingClientRect().height)+'px'; if(!de.classList.contains('ox-snap')) de.classList.add('ox-snap'); if(de.style.scrollPaddingTop!==pad) de.style.scrollPaddingTop=pad; }
          else if(de.classList.contains('ox-snap')&&(root.__kbd||!(cur&&sh))){ de.classList.remove('ox-snap'); de.style.scrollPaddingTop=''; } };
        let tq=0; const go=()=>{ if(!q) q=requestAnimationFrame(pin); clearTimeout(tq); tq=setTimeout(pin,120); };
        addEventListener('scroll',go,{passive:true}); addEventListener('resize',go); root.__oxGo=go;
        ['wheel','touchstart','mousedown'].forEach(ev=>addEventListener(ev,()=>{ if(root.__kbd){ root.__kbd=false; go(); } },{passive:true}));
        // ↑ / ↓ step through product rows of expanded orders, landing each just under the pinned headings
        const offFor=row=>{ const th=root.querySelector('.ox-tbl thead th'), tr=row.closest('.ox-subtr'), orow=tr&&tr.previousElementSibling, sh=tr&&tr.querySelector('.ox-subh');
          return (th?th.getBoundingClientRect().height+(parseFloat(getComputedStyle(th).top)||0):0)+(orow?orow.querySelector('td').getBoundingClientRect().height:0)+(sh?sh.getBoundingClientRect().height:0); };
        document.addEventListener('keydown',e=>{ if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return; if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey) return;
          const a=document.activeElement; if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)) return;
          if(!root.isConnected||!root.offsetParent||document.querySelector('.od-scrim,.tw-scrim,.am-scrim,.sq-scrim,.cw-scrim,[role="dialog"][aria-modal="true"]')) return;
          const rows=[...root.querySelectorAll('.ox-subtr .ox-sub')]; if(!rows.length) return;
          const pos=rows.map(r=>r.getBoundingClientRect().top-offFor(r)); let i=pos.findIndex(p=>p>2);
          let k; if(e.key==='ArrowDown'){ k=i<0?-1:(pos[i]<6?i+1:i); } else { k=i<0?rows.length-1:i-1; }
          if(k<0||k>=rows.length) return; e.preventDefault();
          // keyboard steps land exactly: snapping is paused until the next wheel / touch / drag scroll
          root.__kbd=true; document.documentElement.classList.remove('ox-snap'); document.documentElement.style.scrollPaddingTop='';
          const r=rows[k]; window.scrollTo({top:Math.round(scrollY+r.getBoundingClientRect().top-offFor(r)),behavior:'smooth'});
          rows.forEach(x=>x.classList.remove('ox-kf')); r.classList.add('ox-kf'); clearTimeout(r.__kf); r.__kf=setTimeout(()=>r.classList.remove('ox-kf'),1400); });
      }
      if(root.__oxGo) root.__oxGo();
      q('[data-all]').forEach(b=>b.onclick=()=>{ S.all=!S.all; if(!S.all) S.exp=[]; draw(); });
      q('[data-sort]').forEach(th=>th.onclick=()=>{ const k=th.dataset.sort; S.dir=S.sort===k?-S.dir:(['cust','ref','proj','stage','pay','by'].includes(k)?1:-1); S.sort=k; draw(); });
      q('[data-exp]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const id=b.dataset.exp; if(S.all){ S.all=false; S.exp=rows().map(r=>r.o.id).filter(x=>x!==id); } else S.exp=S.exp.includes(id)?S.exp.filter(x=>x!==id):[...S.exp,id]; draw(); });
      q('[data-sel]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const id=b.dataset.sel; S.sel=S.sel.includes(id)?S.sel.filter(x=>x!==id):[...S.sel,id]; draw(); });
      q('[data-selall]').forEach(b=>b.onclick=()=>{ const ids=rows().map(r=>r.o.id), on=ids.every(i=>S.sel.includes(i)); S.sel=on?S.sel.filter(i=>!ids.includes(i)):[...new Set([...S.sel,...ids])]; draw(); });
      q('[data-bulk]').forEach(b=>b.onclick=()=>{ const a=b.dataset.bulk; if(a==='clear'){ S.sel=[]; return draw(); }
        const rs=all.filter(r=>S.sel.includes(r.o.id));
        if(a==='csv'){ const H=['Order','PO','Customer','Project','Placed','Placed by','Items','Value','Profit','Stage','Deliver by','Payment','Suppliers'], cs=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
          const csv=[H,...rs.map(r=>[r.o.ref,r.o.po,sup?'':r.cust,r.o.project,fD(r.placed),r.o.placedBy,r.act.length,(sup?r.myCost:r.total).toFixed(2),dist?r.profit.toFixed(2):'',r.stage,r.last?fD(r.last):r.asap?'ASAP':'',r.pay[0],dist?r.sups.join('; '):''])].map(x=>x.map(cs).join(',')).join('\n');
          const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'})), l=document.createElement('a'); l.href=u; l.download='orders-'+new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); return; }
        if(a==='flag'&&window.MSFLAG&&MSFLAG.open){ const r0=rs[0]; if(rs.length===1) return MSFLAG.open('order:'+r0.o.id,'Order '+r0.o.ref,()=>{ all=orders.map(o=>sum(o,role,me)); draw(); }); }
        if(a==='flag'){ alert('Open an order to flag it, or select one order at a time.'); } });
      q('tr[data-open]').forEach(tr=>tr.onclick=e=>{ if(e.target.closest('button,a,select,input,[data-sel]')) return; location.hash='order='+tr.dataset.open; });
    }
    root.innerHTML=`${opts.note?`<div class="ox-note"><span>${opts.note}</span><a href="Merchsmith Orders.html">Clear ×</a></div>`:''}${opts.above||''}<div data-oxbody></div>`;
    draw();
    const re=()=>{ all=orders.map(o=>sum(o,role,me)); if(sup) all=all.filter(r=>r.mine.length&&(r.mine.some(k=>k.blankOnly)||r.mine.some(k=>FIDX[k.st]>=FIDX.sent))); if(root.isConnected&&root.querySelector('[data-oxbody]')) draw(); };
    window.removeEventListener('ms-flag-change',window.__oxRe||(()=>{})); window.__oxRe=re; window.addEventListener('ms-flag-change',re);
  }

  const css=`
  .ox-note{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:18px 0 0;background:var(--tint-peri,#eceef9);border-radius:12px;padding:10px 14px;font-size:13.5px;color:var(--ink-2,#3b3e55);} .ox-note a{font-weight:800;text-decoration:none;white-space:nowrap;}
  .ox-kpis{display:grid;gap:12px;margin:26px 0 20px;} @media(max-width:1100px){.ox-kpis{grid-template-columns:repeat(3,minmax(0,1fr))!important;}} @media(max-width:620px){.ox-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
  .ox-kpi{border:1.5px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:14px;padding:15px 18px;text-align:left;cursor:pointer;font-family:inherit;transition:border-color .14s,box-shadow .14s,transform .14s;min-width:0;}
  .ox-kpi:hover{border-color:var(--periwinkle,#8b8fe0);transform:translateY(-1px);box-shadow:0 4px 12px rgba(20,22,45,.06);}
  .ox-kpi.on{border-color:var(--periwinkle-deep,#4b50c0);background:var(--tint-peri,#eceef9);box-shadow:0 0 0 1px var(--periwinkle-deep,#4b50c0);}
  .ox-kpi b{display:block;font-family:var(--serif);font-weight:500;font-size:30px;line-height:1.05;color:var(--ink,#1e2033);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .ox-kpi span{display:block;margin-top:4px;font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted,#667085);}
  .ox-kpi.warn b{color:#c0392b;}
  [data-oxroot] .filterchips{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin:0 0 14px;}
  .ox-subhid{padding:10px 14px;font-size:12.5px;color:var(--g500,#667085);border-top:1px dashed var(--g200,#e4e7ec);} .ox-subhid button{border:0;background:none;font:inherit;font-weight:700;padding:0;margin-left:4px;}
  .ox-smp{display:inline-block;font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.02em;border-radius:6px;padding:1px 7px;margin-left:7px;vertical-align:1px;background:color-mix(in srgb,var(--periwinkle,#ff5cb3) 14%,#fff);color:var(--periwinkle-deep,#ec018c);white-space:nowrap;} .ox-smp.un{background:var(--g100,#f2f4f7);color:var(--g700,#344054);}
  .ox-szs{color:var(--g500,#667085);} .ox-sstx{display:block;margin-top:5px;font-size:11px;line-height:1.35;color:var(--g600,#475467);max-width:100%;white-space:normal;overflow-wrap:anywhere;} .ox-sub>.ox-sst{min-width:0;padding-right:10px;box-sizing:border-box;} .ox-sstx .over{color:#b42318;}
  .ox-plk{color:var(--g900,#101828);font-weight:600;text-decoration:none;} .ox-plk:hover{color:var(--periwinkle-deep);text-decoration:underline;text-underline-offset:2px;} .ox-pmore{display:inline-block;font-size:11px;font-weight:700;color:var(--g600,#475467);background:var(--g100,#f2f4f7);border-radius:6px;padding:1px 6px;margin-left:4px;cursor:help;}
  .ox-via{display:inline-block;font-style:normal;font-size:10.5px;font-weight:800;border-radius:6px;padding:1px 7px;margin-left:6px;vertical-align:1px;background:color-mix(in srgb,var(--sky,#0a84c6) 12%,#fff);color:#075985;white-space:nowrap;cursor:help;} .ox-viaic{display:inline-flex;vertical-align:-2px;margin-left:6px;color:#075985;cursor:help;}
  .ox-dr{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;} .ox-dr label{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:var(--g600,#475467);} .ox-din{width:auto;min-width:0;padding-right:8px;} .ox-dx{border:0;background:var(--g100,#f2f4f7);width:26px;height:26px;border-radius:7px;font-size:16px;line-height:1;color:var(--g600,#475467);cursor:pointer;}
  .ox-fsep{width:1px;align-self:stretch;background:var(--g200,#e4e7ec);margin:2px 4px;}
  [data-oxroot] .frow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;height:auto!important;min-height:0!important;max-height:none!important;width:100%;} [data-oxroot] .filterchips{height:auto!important;} [data-oxroot] .frow>.fgrp:first-child{min-width:66px;margin:0;}
  [data-oxroot] .fchip{white-space:nowrap;display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-3);background:#fff;border:1px solid var(--line-soft);border-radius:999px;padding:6px 12px;cursor:pointer;transition:border-color .15s,color .15s;}
  [data-oxroot] .fchip .n{font-weight:700;font-size:11px;color:var(--muted);} [data-oxroot] .fchip:hover{border-color:var(--blossom,#f0569f);color:var(--ink);}
  [data-oxroot] .fchip.on{background:var(--blossom,#f0569f);border-color:var(--blossom,#f0569f);color:#fff;} [data-oxroot] .fchip.on .n{color:#fff;} [data-oxroot] .fchip .icn{width:14px;height:14px;}
  [data-oxroot] .fchip.urg.on{background:var(--flare,#e8552f);border-color:var(--flare,#e8552f);} [data-oxroot] .fchip.zero{opacity:.55;}
  [data-oxroot] .fgrp{align-self:center;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 2px 0 4px;}
  [data-oxroot] .ftog{border-style:dashed;color:var(--muted);} [data-oxroot] .ftog:hover{color:var(--ink);border-color:var(--ink-3);} [data-oxroot] .ftog .icn{width:13px;height:13px;}
  [data-oxroot] .fbadge{display:inline-grid;place-items:center;min-width:17px;height:17px;border-radius:99px;background:var(--blossom,#f0569f);color:#fff;font-size:10.5px;font-weight:800;padding:0 4px;}
  [data-oxroot] .ftok{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12px;font-weight:700;background:var(--tint-peri,#eceefb);color:var(--periwinkle-ink,#3C4279);border:0;border-radius:999px;padding:6px 11px;cursor:pointer;} [data-oxroot] .ftok .x{font-size:13px;opacity:.65;} [data-oxroot] .ftok:hover .x{opacity:1;}
  [data-oxroot] .tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;}
  [data-oxroot] .search{flex:1;min-width:220px;display:flex;align-items:center;gap:9px;border:1.5px solid var(--line-soft);border-radius:11px;padding:9px 13px;background:#fff;color:var(--muted);} [data-oxroot] .search svg{width:16px;height:16px;flex:none;}
  [data-oxroot] .search input{border:0;outline:0;font:inherit;font-size:13.5px;width:100%;background:none;color:var(--ink);}
  [data-oxroot] .fsel{font:inherit;font-size:13px;font-weight:600;border:1.5px solid var(--line-soft);border-radius:11px;padding:9px 12px;background:#fff;color:var(--ink);cursor:pointer;max-width:220px;} [data-oxroot] .fsel:focus{outline:0;border-color:var(--periwinkle-deep);}
  [data-oxroot] .fclear{font:inherit;font-size:12.5px;font-weight:700;color:var(--muted);background:none;border:0;text-decoration:underline;cursor:pointer;}
  .ox-chips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 14px;} .ox-grp{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted,#667085);min-width:66px;}
  .ox-chip{white-space:nowrap;display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12.5px;font-weight:700;color:var(--ink-3,#5b5f77);background:#fff;border:1px solid var(--line-soft,#e4e7ec);border-radius:999px;padding:6px 12px;cursor:pointer;transition:border-color .15s,color .15s,background .15s;}
  .ox-chip .n{font-size:11px;color:var(--muted,#667085);} .ox-chip:hover{border-color:var(--blossom,#f0569f);color:var(--ink,#1e2033);}
  .ox-chip.on{background:var(--blossom,#f0569f);border-color:var(--blossom,#f0569f);color:#fff;} .ox-chip.on .n{color:#fff;} .ox-chip.flag.on{background:var(--flare,#e8552f);border-color:var(--flare,#e8552f);}
  .ox-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px;}
  .ox-search{flex:1;min-width:240px;display:flex;align-items:center;gap:9px;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:11px;padding:9px 13px;background:#fff;color:var(--muted,#667085);} .ox-search:focus-within{border-color:var(--periwinkle-deep,#4b50c0);}
  .ox-search input,html .ox-tools .ox-search input,html.ui-polish .ox-tools .ox-search input{border:0!important;border-radius:0!important;background:none!important;outline:0!important;box-shadow:none!important;padding:0!important;-webkit-appearance:none;appearance:none;font:inherit;font-size:13.5px;width:100%;background:none;color:var(--ink,#1e2033);}
  .ox-sel{font:inherit;font-size:13px;font-weight:600;border:1.5px solid var(--line-soft,#e4e7ec);border-radius:11px;padding:9px 12px;background:#fff;color:var(--ink,#1e2033);cursor:pointer;max-width:220px;} .ox-sel:hover{border-color:var(--periwinkle,#8b8fe0);} .ox-sel:focus{outline:0;border-color:var(--periwinkle-deep,#4b50c0);}
  .ox-link{font:inherit;font-size:12.5px;font-weight:700;color:var(--muted,#667085);background:none;border:0;text-decoration:underline;cursor:pointer;}
  .ox-bulk{display:flex;align-items:center;gap:14px;background:var(--periwinkle-deep,#4b50c0);color:#fff;border-radius:12px;padding:10px 16px;margin:0 0 14px;font-size:14px;flex-wrap:wrap;}
  .ox-bulka{display:flex;gap:8px;flex-wrap:wrap;} .ox-bulk button{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12.5px;font-weight:800;border-radius:8px;padding:7px 13px;cursor:pointer;border:1.5px solid rgba(255,255,255,.5);background:transparent;color:#fff;} .ox-bulk button:hover{background:rgba(255,255,255,.14);}
  .ox-bulk .ox-bulkx{margin-left:auto;border:0;text-decoration:underline;}
  .ox-wrap{border:1px solid var(--line-soft,#e4e7ec);border-radius:14px;background:#fff;overflow-x:auto;}
  .ox-tbl{width:100%;min-width:1360px;border-collapse:separate;border-spacing:0;font-size:13px;}
  .ox-tbl th{position:sticky;top:var(--ms-headh,0px);background:var(--paper,#f6f5f2);text-align:left;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--muted,#667085);padding:11px 12px;box-shadow:0 1px 0 var(--line-soft,#e4e7ec);white-space:nowrap;z-index:1;}
  .ox-tbl th.sortable{cursor:pointer;user-select:none;} .ox-tbl th.sortable:hover,.ox-tbl th.on{color:var(--periwinkle-deep,#4b50c0);} .ox-tbl th .dir{font-size:9px;margin-left:4px;} .ox-tbl th.num,.ox-tbl td.num{text-align:right;font-variant-numeric:tabular-nums;}
  .ox-tbl td{padding:12px;border-bottom:1px solid var(--paper-2,#f2f1ec);vertical-align:middle;color:var(--ink-2,#3b3e55);}
  .ox-tbl td small{display:block;font-size:11.5px;color:var(--muted,#667085);margin-top:2px;white-space:nowrap;font-weight:500;}
  .ox-tr{cursor:pointer;transition:background .12s;} .ox-tr:hover td{background:color-mix(in srgb,var(--periwinkle-deep,#4b50c0) 4%,#fff);} .ox-tr.sel td{background:#f5f5ff;}
  .ox-tr.cx td{color:var(--muted,#667085);} .ox-tr.cx .ox-ref{text-decoration:line-through;text-decoration-color:#d92d20;}
  .ox-tr.fl-red td:first-child{box-shadow:inset 3px 0 0 var(--flare,#e8552f);} .ox-tr.fl-amber td:first-child{box-shadow:inset 3px 0 0 #e0a526;}
  .ox-selc{width:36px;padding-right:0!important;} .ox-chevc{width:36px;padding-left:4px!important;padding-right:0!important;}
  .ox-chk{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--g300,#d0d5dd);display:inline-grid;place-items:center;color:transparent;cursor:pointer;background:#fff;transition:all .12s;} .ox-chk:hover{border-color:var(--periwinkle-deep,#4b50c0);} .ox-chk.on{background:var(--periwinkle-deep,#4b50c0);border-color:var(--periwinkle-deep,#4b50c0);color:#fff;}
  .ox-chev{width:26px;height:26px;border-radius:7px;border:1px solid var(--line-soft,#e4e7ec);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--ink-3,#5b5f77);transition:transform .15s,border-color .15s;} .ox-chev:hover{border-color:var(--periwinkle,#8b8fe0);color:var(--periwinkle-deep,#4b50c0);} .ox-chev.on svg{transform:rotate(90deg);} .ox-chev svg{transition:transform .15s;}
  .ox-lk{cursor:pointer;transition:transform .12s,box-shadow .12s,color .12s;} .ox-lk:focus-visible{outline:2px solid var(--periwinkle-deep);outline-offset:2px;border-radius:6px;}
  .ox-sup.ox-lk:hover,.ox-tm.ox-lk:hover,.ox-by>.ox-lk:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(20,22,45,.18);} .ox-cust.ox-lk:hover b,.ox-lkt:hover{color:var(--periwinkle-deep)!important;text-decoration:underline;text-underline-offset:2px;}
  .ox-cust{display:inline-flex;align-items:center;gap:9px;white-space:nowrap;} .ox-cust b{color:var(--ink,#1e2033);font-weight:700;}
  .ox-logo{display:inline-grid;place-items:center;border-radius:7px;overflow:hidden;flex:none;} .ox-logo svg{width:100%;height:100%;} .ox-logo.ini{color:#fff;font-size:10px;font-weight:800;}
  .ox-av{display:inline-grid;place-items:center;border-radius:50%;overflow:hidden;flex:none;} .ox-av>*{width:100%!important;height:100%!important;} .ox-av img{width:100%;height:100%;object-fit:cover;} .ox-av.ini{color:#fff;font-size:10px;font-weight:800;}
  .ox-ref{color:var(--ink,#1e2033);font-weight:800;white-space:nowrap;} .ox-proj{font-weight:600;color:var(--ink,#1e2033);white-space:nowrap;}
  .ox-by{display:inline-flex;align-items:center;gap:9px;white-space:nowrap;} .ox-by b{font-weight:600;color:var(--ink-2,#3b3e55);}
  .ox-prog{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:150px;}
  .ox-pill{display:inline-block;font-size:11px;font-weight:800;border-radius:999px;padding:4px 11px;white-space:nowrap;}
  .ox-pill.c-peri{background:var(--tint-peri,#eceef9);color:var(--periwinkle-deep,#4b50c0);} .ox-pill.c-amber{background:#fdf6e7;color:#9a6b1f;} .ox-pill.c-violet{background:#f3ecfb;color:#7a4fb0;} .ox-pill.c-sky{background:#e8f4fb;color:#1c6a95;} .ox-pill.c-green{background:var(--tint-green,#e7f5ee);color:var(--green-deep,#1d7c4d);} .ox-pill.c-red{background:#fef3f2;color:#b42318;}
  .ox-progr{display:flex;align-items:center;gap:8px;} .ox-progr small{margin:0!important;}
  .ox-dots{display:inline-flex;gap:3px;} .ox-dots i,.ox-sdot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none;}
  .c-green.ox-sdot,.ox-dots i.c-green{background:#12b76a;} .ox-dots i.c-amber,.ox-sdot.c-amber{background:#f79009;} .ox-dots i.c-red,.ox-sdot.c-red{background:#f04438;} .ox-dots i.c-x,.ox-sdot.c-x{background:#d0d5dd;}
  .ox-d{font-weight:700;color:var(--ink,#1e2033);white-space:nowrap;} .ox-d.over{color:#c0392b;} .ox-d.soon{color:#b06f00;} .ox-tbl td small.over{color:#c0392b;font-weight:700;}
  .ox-ok{display:inline-flex;align-items:center;gap:5px;font-weight:700;color:var(--green-deep,#1d7c4d);white-space:nowrap;}
  .ox-mut{color:var(--muted,#98a2b3);}
  .ox-sups{display:inline-flex;} .ox-sup{width:26px;height:26px;border-radius:7px;display:inline-grid;place-items:center;color:#fff;font-size:9.5px;font-weight:800;border:2px solid #fff;flex:none;} .ox-sups .ox-sup+.ox-sup{margin-left:-6px;} .ox-sup.more{background:var(--g100,#f2f4f7);color:var(--ink-3,#5b5f77);}
  .ox-pay{font-weight:700;white-space:nowrap;} .ox-pay.c-green{color:var(--green-deep,#1d7c4d);} .ox-pay.c-amber{color:#b06f00;} .ox-pay.c-red{color:#b42318;} .ox-pay.c-peri{color:var(--periwinkle-deep,#4b50c0);}
  .ox-profit{color:var(--green-deep,#1d7c4d);font-weight:700;}
  .ox-social{display:inline-flex;align-items:center;gap:12px;} .ox-ic{position:relative;display:inline-flex;color:#c7c7d0;} .ox-ic.has{color:var(--ink,#1e2033);} .ox-ic.flag.l-red{color:var(--flare,#e8552f);} .ox-ic.flag.l-amber{color:#e0a526;} .ox-ic.flag svg{fill:currentColor;} .ox-ic:not(.flag) svg{fill:none;}
  .ox-ic b{position:absolute;top:-7px;right:-9px;min-width:15px;height:15px;border-radius:999px;background:var(--flare,#e8552f);color:#fff;font-size:9px;font-weight:800;display:grid;place-items:center;padding:0 3px;border:1.5px solid #fff;}
  .ox-last{color:var(--muted,#667085);white-space:nowrap;}
  .ox-subtr td{background:#fafafc;padding:6px 12px 14px 48px;border-bottom:1px solid var(--line-soft,#e4e7ec);}
  @media(min-width:1500px){ [data-oxroot] .ox-wrap{overflow:visible!important;} }
   [data-oxroot] .ox-sub.ox-kf{box-shadow:inset 3px 0 0 var(--periwinkle-deep,#4b50c0);background:var(--tint-peri,#eceef9);transition:background .3s;} [data-oxroot] .ox-socb .os-tools{display:inline-flex;gap:8px;} [data-oxroot] .ox-socb .fl-btn,[data-oxroot] .ox-socb .os-cbtn{width:34px!important;height:34px!important;} [data-oxroot] .ox-socb .fl-btn svg,[data-oxroot] .ox-socb .os-cbtn svg{width:16px!important;height:16px!important;}
  [data-oxroot] .fchip.fl-warn,[data-oxroot] .fchip.fl-pwarn{color:#b54708!important;} [data-oxroot] .fchip.fl-actn,[data-oxroot] .fchip.fl-pactn{color:#b42318!important;} [data-oxroot] .fchip.fl-actn.on,[data-oxroot] .fchip.fl-pactn.on{background:#fef3f2!important;border-color:#fda29b!important;} [data-oxroot] .fchip.fl-warn.on,[data-oxroot] .fchip.fl-pwarn.on{background:#fffaeb!important;border-color:#fec84b!important;}
  html.ox-snap [data-oxroot] .ox-sub:not(:last-child){scroll-snap-align:start;} html.ox-snap [data-oxroot] .ox-subtr{scroll-snap-align:none;}
  [data-oxroot] .ox-tr.ox-pin>td{position:sticky;top:calc(var(--ms-headh,0px) + var(--ox-thh,38px));z-index:3;box-shadow:0 1px 0 var(--line-soft,#e4e7ec);}
  [data-oxroot] .ox-tr.ox-pin>td:not([style*=background]){background:#fff;}
  [data-oxroot] .ox-subh{position:sticky;top:calc(var(--ms-headh,0px) + var(--ox-thh,38px) + var(--ox-rowh,0px));z-index:1;box-shadow:0 1px 0 var(--line-soft,#e4e7ec);}
  [data-oxroot] .ox-subs{overflow:visible!important;} [data-oxroot] .ox-subh{border-radius:12px 12px 0 0;} [data-oxroot] .ox-subs>.ox-sub:last-child{border-radius:0 0 12px 12px;}
  .ox-subs{display:flex;flex-direction:column;border:1px solid var(--line-soft,#e4e7ec);border-radius:12px;overflow:hidden;background:#fff;}
  .ox-subh,.ox-sub{display:grid;grid-template-columns:var(--oxc);align-items:center;}
  .ox-subh{background:var(--paper,#f6f5f2);border-bottom:1px solid var(--line-soft,#e4e7ec);} .ox-subh span{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#667085);padding:9px 14px;white-space:nowrap;} .ox-subh span.r{text-align:right;}
  .ox-sub{text-decoration:none;color:inherit;border-top:1px solid var(--paper-2,#f2f1ec);min-height:92px;} .ox-subh+.ox-sub{border-top:0;} .ox-sub:hover{background:color-mix(in srgb,var(--periwinkle-deep,#4b50c0) 4%,#fff);}
  .ox-sub>span{padding:12px 14px;min-width:0;} .ox-sub>.ox-stool{display:flex!important;flex-direction:row!important;align-items:center;justify-content:flex-end!important;padding:12px 12px;}
  .ox-stool .os-tools{display:inline-flex;gap:6px;} .ox-stool .fl-btn,.ox-stool .os-cbtn{width:30px!important;height:30px!important;}
  .ox-sub:has(.fl-btn.on.l-red){box-shadow:inset 3px 0 0 var(--flare,#d6453d);} .ox-sub:has(.fl-btn.on.l-amber){box-shadow:inset 3px 0 0 #e0a526;} .ox-sub>span+span{border-left:1px solid var(--paper-2,#f2f1ec);align-self:stretch;display:flex;flex-direction:column;justify-content:center;}
  .ox-sp{display:flex;align-items:center;gap:12px;} .ox-th{width:68px;height:68px;border-radius:10px;background:#fff;overflow:hidden;display:grid;place-items:center;flex:none;} .ox-th img{max-width:100%;max-height:100%;object-fit:contain;}
  .ox-sn{display:flex;flex-direction:column;gap:3px;min-width:0;} .ox-sn b{color:var(--ink,#1e2033);font-weight:700;font-size:14px;line-height:1.3;} .ox-sn small{margin:0!important;display:block;white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;max-width:none!important;height:auto!important;line-height:1.35!important;} .ox-sn{flex:1;}
  .ox-sub .ox-scol{display:flex!important;align-items:center;gap:4px;flex-wrap:wrap;} .ox-scol i{margin-right:3px;flex:none;vertical-align:-1px;width:10px;height:10px;border-radius:50%;border:1px solid rgba(0,0,0,.15);display:inline-block;}
  .ox-steps i[data-oxtip]{position:relative;cursor:default;} .ox-steps i[data-oxtip]::before{content:"";position:absolute;inset:-6px 0;}
  /* hovering a step swaps the status line underneath for that step's name + date */
  .ox-sprog{position:relative;} .ox-sprog>.ox-steptip{display:none;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink,#1e2033);white-space:nowrap;}
  .ox-sprog.tipon>.ox-steptip{display:flex;} .ox-sprog.tipon>small{display:none!important;}
  .ox-steps i[data-oxtip]:hover{transform:scaleY(1.6);} .ox-steps i{transition:transform .12s;}
  .ox-sprog{display:flex;flex-direction:column;} .ox-sprog>.ox-steps{order:0;} .ox-sprog>small,.ox-sprog>.ox-steptip{order:1;}
  .ox-steps{display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-bottom:7px;} .ox-steps i{height:5px;border-radius:3px;background:#d0d5dd;} .ox-steps i.done{background:#12b76a;} .ox-steps i.cur{background:#f79009;} .ox-steps i.act{background:#f04438;} .ox-steps i.x{background:#fecdca;}
  .ox-sprog small{display:flex!important;align-items:center;gap:6px;font-size:12.5px!important;color:var(--ink-2,#3b3e55)!important;font-weight:600!important;margin:0!important;white-space:nowrap;} .ox-sprog small b.over{color:#c0392b;}
  .ox-spr{align-items:flex-end;text-align:right;} .ox-spr>b{font-size:15px;color:var(--ink,#1e2033);font-variant-numeric:tabular-nums;} .ox-spr small{margin:2px 0 0!important;}
  .ox-pm{display:flex;flex-direction:column;align-items:flex-end;gap:2px;margin-top:5px;} .ox-pm em{font-style:normal;font-size:11.5px;font-weight:700;color:var(--muted,#667085);white-space:nowrap;} .ox-pm em.p{color:var(--green-deep,#1d7c4d);}
  .ox-dl{display:flex;align-items:center;gap:8px;border-radius:8px;padding:6px 9px;width:fit-content;max-width:100%;} .ox-dl em{font-style:normal;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3,#5b5f77);} .ox-dl b{font-size:13px;font-weight:700;color:var(--ink,#1e2033);white-space:nowrap;}
  .ox-dl.sup{background:color-mix(in srgb,var(--blossom,#f0569f) 12%,#fff);} .ox-dl.cus{background:color-mix(in srgb,var(--spearmint,#5fd4b0) 18%,#fff);}
  .ox-sdt small{margin:5px 0 0!important;white-space:normal!important;} .ox-sdt small.crit{color:var(--flare,#e8552f)!important;font-weight:800!important;text-transform:uppercase;font-size:10.5px!important;letter-spacing:.04em;}
  .ox-sst{align-items:flex-start;}
  .ox-chip.zero{opacity:.55;}
  .ox-team{display:inline-flex;align-items:center;} .ox-tm{display:inline-flex;border-radius:50%;box-shadow:0 0 0 2px #fff;} .ox-tm+.ox-tm{margin-left:-7px;} .ox-tm.more{width:26px;height:26px;background:var(--g100,#f2f4f7);color:var(--ink-3,#5b5f77);font-size:10px;font-weight:800;display:inline-grid;place-items:center;}
  .ox-tm.c{box-shadow:0 0 0 2px #fff,0 0 0 3.5px color-mix(in srgb,var(--spearmint,#5fd4b0) 70%,#fff);}
  .ox-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:48px 16px;color:var(--muted,#667085);text-align:center;} .ox-empty b{color:var(--ink,#1e2033);font-size:15px;} .ox-empty span{font-size:13px;}
  .ox-foot{font-size:12.5px;color:var(--muted,#667085);margin-top:10px;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {render,sum};
})();
