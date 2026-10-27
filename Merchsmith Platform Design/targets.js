/* targets.js — Orders → Targets tab (Oct 2026). Team sales targets by month, recurring every year.
   Store ms-targets-v2 {metric:'profit'|'revenue', members:[{name, months:{'YYYY-MM':£}}], seeded:true}
   Months before the current month are locked (kept as they were). Next year copies this year's pattern until changed.
   window.MSTGT: mount(el) · members() · metric() · ensure(names,def) · monthT(name,ym) · periodT(name,from,to) · av(name,size) */
window.MSTGT=window.MSTGT||(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const KEY='ms-targets-v2', J=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'null')||{metric:'profit',members:[]}; }catch(e){ return {metric:'profit',members:[]}; } }, P=v=>{ try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){} };
  const gbp=n=>'£'+Math.round(+n||0).toLocaleString('en-GB'), MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ym=(y,m)=>y+'-'+String(m+1).padStart(2,'0'), now=()=>new Date(), curYM=()=>ym(now().getFullYear(),now().getMonth());
  const locked=k=>k<curYM();
  const hue=n=>[...String(n)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%360, ini=n=>String(n).split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const av=(n,s)=>{ s=s||28; if(window.MSPEOPLE&&MSPEOPLE.avHTML){ try{ return `<span class="tg-av" style="width:${s}px;height:${s}px">${MSPEOPLE.avHTML({n},s)}</span>`; }catch(e){} } return `<span class="tg-av ini" style="width:${s}px;height:${s}px;background:hsl(${hue(n)} 40% 48%)">${esc(ini(n))}</span>`; };
  const members=()=>J().members, metric=()=>J().metric||'profit';
  // working days: weekdays minus England bank holidays; the number per month can be changed (wd['YYYY-MM'])
  const BH=['2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28','2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'];
  const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function wdBase(k){ const [y,m]=k.split('-').map(Number), out=[]; const d=new Date(y,m-1,1); while(d.getMonth()===m-1){ if(d.getDay()%6&&!BH.includes(isoD(d))) out.push(new Date(d)); d.setDate(d.getDate()+1); } return out; }
  const wdN=k=>{ const o=(J().wd||{})[k]; return o!=null?+o:wdBase(k).length; };
  // the month's working days, trimmed or extended (into weekends at the end) to the set number
  function wdList(k){ const b=wdBase(k), n=wdN(k); if(n<=b.length) return b.slice(0,Math.max(1,n)); const out=b.slice(), [y,m]=k.split('-').map(Number), d=new Date(y,m-1,1); while(out.length<n&&d.getMonth()===m-1){ if(!out.some(x=>+x===+d)) out.push(new Date(d)); d.setDate(d.getDate()+1); } return out.sort((a,c)=>a-c); }
  const wdIndex=(k,date)=>wdList(k).filter(d=>d<=date).length;
  // a month with no value of its own takes the same month last year (recurring), else 0
  function monthT(name,k){ const m=J().members.find(x=>x.name===name); if(!m) return 0; let [y,mo]=k.split('-').map(Number); for(let i=0;i<6;i++){ const kk=y-i+'-'+String(mo).padStart(2,'0'); if(m.months[kk]!=null) return +m.months[kk]; } return 0; }
  // target over any period, spread across each month's working days
  function periodT(name,from,to){ let t=0; const d=new Date(from.getFullYear(),from.getMonth(),1); while(d<to){ const k=ym(d.getFullYear(),d.getMonth()), W=wdList(k), n=W.filter(x=>x>=from&&x<to).length; if(W.length) t+=monthT(name,k)*n/W.length; d.setMonth(d.getMonth()+1); } return t; }
  function ensure(names,def){ const S=J(); if(S.seeded) return; const y=now().getFullYear(); S.members=(names||[]).map(n=>({name:n,months:Object.fromEntries(MON.map((_,i)=>[ym(y,i),def||1400]))})); S.metric=S.metric||'profit'; S.seeded=true; P(S); }
  const team=()=>{ const T=((window.ORG_DATA&&ORG_DATA.mojoTeams)||[]).flatMap(t=>(t.users||[]).map(u=>Object.assign({team:t.name},u))).filter(u=>u.status!=='deactivated'); return T.length?T:['Jess Doyle','Cara Lyon','Ben Shaw','Will About','Tom Reed'].map(n=>({n,role:'Account Manager'})); };

  function mount(el){ if(!el) return; const st={y:now().getFullYear()};
    const draw=()=>{ const S=J(), y=st.y, ks=MON.map((_,i)=>ym(y,i)), A=window.MSDASH&&MSDASH.actuals?MSDASH.actuals(S.metric):{};
      const avail=team().filter(u=>!S.members.some(m=>m.name===u.n));
      const tot=k=>S.members.reduce((a,m)=>a+monthT(m.name,k),0);
      el.innerHTML=`<div class="tg">
        <div class="tg-hd"><div class="tg-seg" role="group" aria-label="Target type"><span>Target on</span><button type="button" class="${S.metric==='revenue'?'on':''}" data-tm="revenue">Revenue</button><button type="button" class="${S.metric==='profit'?'on':''}" data-tm="profit">Gross profit</button></div>
          <div class="tg-yr"><button type="button" data-ty="-1" aria-label="Previous year">‹</button><b>${y}</b><button type="button" data-ty="1" aria-label="Next year">›</button></div>
          <span class="tg-sp"></span>${avail.length?`<select class="tg-in" data-tadd aria-label="Add a team member"><option value="">+ Add team member…</option>${avail.map(u=>`<option value="${esc(u.n)}">${esc(u.n)}${u.title||u.role?' · '+esc(u.title||u.role):''}</option>`).join('')}</select>`:''}</div>
        <p class="tg-lede">Monthly ${S.metric==='revenue'?'revenue (order value, ex VAT)':'gross profit'} targets for each person, repeating every year: a month without its own figure uses the same month last year. Months that have finished are locked <span class="tg-lk">🔒</span> and keep the target they had. Actuals come from orders placed by each person’s customers.</p>
        <div class="tg-tw"><table class="tg-tbl"><thead><tr><th>Team member</th>${MON.map((m,i)=>`<th class="${locked(ks[i])?'lk':''}${ks[i]===curYM()?' cur':''}">${m}</th>`).join('')}<th class="r">Year</th><th></th></tr></thead><tbody>
          <tr class="tg-wd"><td><b>Working days</b><small>Weekdays minus bank holidays. Change any open month.</small></td>${ks.map(k=>{ const n=wdN(k), own=(S.wd||{})[k]!=null; return `<td class="${locked(k)?'lk':''}${k===curYM()?' cur':''}">${locked(k)?`<span class="tg-ro">${n}</span>`:`<input class="tg-in${own?'':' inh'}" type="number" min="1" max="31" value="${n}" data-twd="${k}" aria-label="Working days ${k}">`}</td>`; }).join('')}<td class="r">${ks.reduce((a,k)=>a+wdN(k),0)} days</td><td></td></tr>
          ${S.members.length?S.members.map((m,ri)=>{ const yr=ks.reduce((a,k)=>a+monthT(m.name,k),0);
            return `<tr><td><span class="tg-who">${av(m.name,30)}<span><b>${esc(m.name)}</b><small>${esc((team().find(u=>u.n===m.name)||{}).title||'')}</small></span></span><span class="tg-fill"><input class="tg-in sm" type="number" min="0" step="100" placeholder="£/month" data-tfill="${ri}" aria-label="Set every open month for ${esc(m.name)}"><button type="button" class="tg-b" data-tfillb="${ri}">Fill open months</button></span></td>
              ${ks.map(k=>{ const v=monthT(m.name,k), own=m.months[k]!=null, a=A[m.name]&&A[m.name][k], lk=locked(k); return `<td class="${lk?'lk':''}${k===curYM()?' cur':''}">${lk?`<span class="tg-ro">${gbp(v)}</span>`:`<input class="tg-in${own?'':' inh'}" type="number" min="0" step="100" value="${Math.round(v)}" data-tv="${ri}|${k}" aria-label="${esc(m.name)} ${k}" title="${own?'':'Repeating from last year'}">`}${a!=null&&(lk||k===curYM())?`<small class="${a>=v?'ok':'no'}">${gbp(a)}</small>`:''}</td>`; }).join('')}
              <td class="r"><b>${gbp(yr)}</b></td><td><button type="button" class="tg-x" data-trm="${ri}" aria-label="Remove ${esc(m.name)} from targets">×</button></td></tr>`; }).join('')
            :`<tr><td colspan="15"><div class="tg-empty">No one has a target yet. Add a team member above.</div></td></tr>`}</tbody>
          ${S.members.length?`<tfoot><tr><td><b>Team total</b></td>${ks.map(k=>`<td class="${locked(k)?'lk':''}${k===curYM()?' cur':''}"><b>${gbp(tot(k))}</b></td>`).join('')}<td class="r"><b>${gbp(ks.reduce((a,k)=>a+tot(k),0))}</b></td><td></td></tr></tfoot>`:''}</table></div>
        <p class="tg-note">Under each finished month: the actual ${S.metric==='revenue'?'revenue':'gross profit'} (green when the target was met). The dashboard’s team cards use these targets.</p></div>`;
      const q=s=>el.querySelectorAll(s), up=fn=>{ const x=J(); fn(x); P(x); draw(); };
      q('[data-tm]').forEach(b=>b.onclick=()=>up(x=>x.metric=b.dataset.tm));
      q('[data-ty]').forEach(b=>b.onclick=()=>{ st.y+=+b.dataset.ty; draw(); });
      const ad=el.querySelector('[data-tadd]'); if(ad) ad.onchange=()=>{ if(!ad.value) return; up(x=>{ x.seeded=true; x.members.push({name:ad.value,months:{}}); }); };
      q('[data-trm]').forEach(b=>b.onclick=()=>{ const m=J().members[+b.dataset.trm]; if(!confirm('Remove '+m.name+' from targets? Their finished months are kept in the history.')) return; up(x=>{ x.members.splice(+b.dataset.trm,1); }); });
      q('[data-twd]').forEach(i=>i.onchange=()=>{ const k=i.dataset.twd; if(locked(k)) return; up(x=>{ x.wd=x.wd||{}; const v=Math.max(1,Math.min(31,+i.value||0)); if(v===wdBase(k).length) delete x.wd[k]; else x.wd[k]=v; }); });
      q('[data-tv]').forEach(i=>i.onchange=()=>{ const [ri,k]=i.dataset.tv.split('|'); if(locked(k)) return; up(x=>{ x.members[+ri].months[k]=Math.max(0,+i.value||0); }); });
      q('[data-tfillb]').forEach(b=>b.onclick=()=>{ const ri=+b.dataset.tfillb, v=+el.querySelector('[data-tfill="'+ri+'"]').value; if(!(v>=0)||el.querySelector('[data-tfill="'+ri+'"]').value==='') return; up(x=>{ ks.forEach(k=>{ if(!locked(k)) x.members[ri].months[k]=v; }); }); }); };
    draw(); }

  const css=`
  .tg{display:flex;flex-direction:column;gap:14px;margin-top:6px;} .tg-hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;} .tg-sp{flex:1;}
  .tg-seg{display:flex;align-items:center;gap:4px;background:var(--g100,#f2f4f7);border-radius:10px;padding:3px;} .tg-seg span{font-size:12px;font-weight:700;color:var(--muted);padding:0 8px;} .tg-seg button{border:0;background:none;font:inherit;font-size:13px;font-weight:700;color:var(--ink-3);padding:7px 14px;border-radius:8px;cursor:pointer;} .tg-seg button.on{background:#fff;color:var(--periwinkle-deep);box-shadow:0 1px 3px rgba(16,24,40,.12);}
  .tg-yr{display:flex;align-items:center;gap:6px;} .tg-yr b{font-size:16px;min-width:46px;text-align:center;} .tg-yr button{width:30px;height:30px;border-radius:9px;border:1.5px solid var(--line-soft);background:#fff;font-size:16px;cursor:pointer;}
  .tg-lede,.tg-note{margin:0;font-size:13px;color:var(--text-soft,#667085);line-height:1.5;max-width:900px;} .tg-lk{font-size:11px;}
  .tg-in{font:inherit;font-size:13px;border:1.5px solid var(--line-soft);border-radius:8px;padding:6px 7px;background:#fff;color:var(--ink);width:100%;min-width:0;text-align:right;font-variant-numeric:tabular-nums;} .tg-in.inh{color:var(--muted);font-style:italic;} .tg-in.sm{width:96px;} select.tg-in{text-align:left;width:auto;padding:8px 10px;}
  .tg-tw{border:1px solid var(--line-soft);border-radius:14px;background:#fff;overflow-x:auto;} .tg-tbl{width:100%;border-collapse:collapse;font-size:13px;min-width:1300px;}
  .tg-tbl th{background:var(--paper,#f6f5f2);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);padding:10px 6px;text-align:center;} .tg-tbl th:first-child{text-align:left;padding-left:14px;width:260px;} .tg-tbl th.cur,.tg-tbl td.cur{background:color-mix(in srgb,var(--periwinkle-deep) 6%,#fff);}
  .tg-tbl td{padding:8px 4px;border-top:1px solid var(--paper-2,#f2f1ec);vertical-align:top;text-align:center;} .tg-tbl td:first-child{text-align:left;padding-left:14px;} .tg-tbl td.lk{background:var(--paper,#f9fafb);} .tg-tbl td small{display:block;font-size:11px;font-weight:700;margin-top:4px;} .tg-tbl td small.ok{color:#067647;} .tg-tbl td small.no{color:#b42318;}
  .tg-tbl .r{text-align:right;padding-right:10px;white-space:nowrap;} .tg-tbl tfoot td{background:var(--paper,#f6f5f2);font-variant-numeric:tabular-nums;font-size:12.5px;padding:10px 4px;}
.tg-wd td{background:#fcfcfd;} .tg-wd small{display:block;font-size:11px;color:var(--muted);font-weight:500;margin-top:2px;max-width:220px;}
  .tg-ro{display:block;padding:6px 2px;color:var(--ink-3);font-variant-numeric:tabular-nums;}
  .tg-who{display:flex;align-items:center;gap:10px;} .tg-who b{display:block;font-size:13.5px;color:var(--ink);} .tg-who small{font-size:11.5px;color:var(--muted);}
  .tg-av{display:inline-grid;place-items:center;border-radius:50%;overflow:hidden;flex:none;} .tg-av>*{width:100%;height:100%;} .tg-av img{width:100%;height:100%;object-fit:cover;} .tg-av.ini{color:#fff;font-size:11px;font-weight:800;}
  .tg-fill{display:flex;gap:6px;margin-top:8px;align-items:center;} .tg-b{border:1.5px solid var(--line-soft);background:#fff;border-radius:8px;font:inherit;font-size:12px;font-weight:700;padding:6px 9px;cursor:pointer;white-space:nowrap;color:var(--ink-2);} .tg-b:hover{border-color:var(--periwinkle);color:var(--periwinkle-deep);}
  .tg-x{border:0;background:none;font-size:20px;line-height:1;color:var(--muted);cursor:pointer;padding:4px 8px;} .tg-x:hover{color:#b42318;} .tg-empty{padding:24px;color:var(--muted);text-align:center;}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {mount,members,metric,ensure,monthT,periodT,av,wdList,wdN,wdIndex,ym};
})();
