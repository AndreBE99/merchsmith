/* ============================================================
   acct-manager.js — each customer organisation has an Assigned Account
   Manager from the distributor's team; they are the customer's main contact.

   Store: localStorage 'ms-acct-mgr' {customerId: memberName}. Unassigned
   customers get a default (spread across the Account Management team).
   window.MSAM: list() · get(custId) · set(custId,name) · pick(custId,onDone)
                cardHTML(custId) · wireCard(el,custId)
   ============================================================ */
window.MSAM=window.MSAM||(function(){
  const KEY='ms-acct-mgr', D=()=>window.ORG_DATA||{};
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const store=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } };
  const team=()=>(D().mojoTeams||[]).flatMap(t=>t.users||[]).filter(u=>u.status!=='deactivated');
  // people who can be assigned: account managers first, then anyone else on the team
  const list=()=>{ const T=team(); return T.filter(u=>/account/i.test(u.role||'')).concat(T.filter(u=>!/account/i.test(u.role||''))); };
  function get(id){ const L=list(); if(!L.length) return null; const n=store()[id]; const am=L.filter(u=>/account/i.test(u.role||''));
    return L.find(u=>u.n===n)||(am.length?am[hash(id)%am.length]:L[0]); }
  // per USER: each customer user has their own account manager; the company value is only the default for users not yet assigned
  const ukey=(id,u)=>'u:'+id+':'+String((u&&(u.email||u.n))||'').trim().toLowerCase();
  function getUser(id,u){ const L=list(), n=u&&store()[ukey(id,u)]; if(n){ const m=L.find(x=>x.n===n); if(m) return m; }
    const am=L.filter(x=>/account/i.test(x.role||'')); if(!u||!am.length) return get(id); return store()[id]?get(id):am[hash(id+(u.email||u.n))%am.length]; }
  function setUser(id,u,name){ const s=store(); s[ukey(id,u)]=name; try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-am-change',{detail:{id,user:u&&u.n,name}})); }catch(e){} }
  const usersOf=id=>((D().customers||[]).find(c=>c.id===id)||{teams:[]}).teams.flatMap(t=>t.users||[]).filter(u=>u.status!=='deactivated');
  const countU=name=>(D().customers||[]).reduce((n,c)=>n+usersOf(c.id).filter(u=>(getUser(c.id,u)||{}).n===name).length,0);
  function set(id,name){ const s=store(); s[id]=name; try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} try{ window.dispatchEvent(new CustomEvent('ms-am-change',{detail:{id,name}})); }catch(e){} }
  const av=(u,s)=>window.MSPEOPLE&&MSPEOPLE.avHTML?`<span class="am-avw" style="width:${s}px;height:${s}px">${MSPEOPLE.avHTML(u)}</span>`:`<span class="am-avw i" style="width:${s}px;height:${s}px">${esc(u.n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span>`;
  const count=name=>(D().customers||[]).filter(c=>(get(c.id)||{}).n===name).length;

  function pick(id,onDone,u){ const cur=u?getUser(id,u):get(id), c=(D().customers||[]).find(x=>x.id===id)||{name:''}, who=u?u.n:c.name;
    const w=document.createElement('div'); w.className='am-scrim'; w.innerHTML=`<div class="am-modal" role="dialog" aria-modal="true" aria-label="Assign account manager">
      <div class="am-mh"><b>Account manager for ${esc(who)}</b><button class="am-x" data-amx aria-label="Close">×</button></div>
      <p class="am-sm">${u?`They become ${esc(u.n.split(' ')[0])}’s main contact at Mojo Promotions (${esc(c.name)}): shown in their settings and first in their chat list.`:`Used for ${esc(c.name)} users who haven’t been given their own account manager.`}</p>
      <div class="am-list">${list().map(m=>`<button class="am-opt${cur&&cur.n===m.n?' on':''}" data-amp="${esc(m.n)}">${av(m,36)}<span><b>${esc(m.n)}</b><i>${esc(m.title||m.role||'')} · ${countU(m.n)} customer user${countU(m.n)===1?'':'s'}</i></span>${cur&&cur.n===m.n?'<em>Current</em>':''}</button>`).join('')}</div></div>`;
    document.body.appendChild(w); const close=()=>w.remove();
    w.onclick=e=>{ if(e.target===w||e.target.closest('[data-amx]')) return close(); const b=e.target.closest('[data-amp]'); if(!b) return; if(u) setUser(id,u,b.dataset.amp); else set(id,b.dataset.amp); close(); if(onDone) onDone(u?getUser(id,u):get(id)); }; }

  // customer-facing card ("Your account manager")
  const meU=id=>{ const who=((window.MSID&&MSID.get&&MSID.get())||{}).who||''; return usersOf(id).find(x=>x.n===who)||null; };
  function cardHTML(id){ const u=getUser(id,meU(id)); if(!u) return '';
    return `<div class="am-card"><div class="am-ch"><span class="am-lbl">Your account manager</span></div>
      <div class="am-body">${av(u,64)}<div class="am-who"><b>${esc(u.n)}</b><span>${esc(u.title||'Account Manager')} · Mojo Promotions</span>
        <div class="am-ct">${u.email?`<a href="mailto:${esc(u.email)}">${esc(u.email)}</a>`:''}${u.tel?`<a href="tel:${esc(u.tel.replace(/\s/g,''))}">${esc(u.tel)}</a>`:''}</div></div>
      <div class="am-acts"><button class="am-btn" data-amchat>Message</button><button class="am-btn ghost" data-ammeet>Book a meeting</button></div></div>
      <p class="am-sm" style="margin:12px 0 0">${esc(u.n.split(' ')[0])} is your main contact for quotes, proofs, orders and anything else.</p></div>`; }
  function wireCard(el,id){ const u=getUser(id,meU(id)); if(!el||!u) return; const m={name:u.n,email:u.email,title:u.title,orgName:'Mojo Promotions',orgType:'distributor'};
    const c=el.querySelector('[data-amchat]'); if(c) c.onclick=()=>{ if(window.MSChat&&MSChat.chatWith) MSChat.chatWith(m); };
    const b=el.querySelector('[data-ammeet]'); if(b) b.onclick=()=>{ const p=window.MSChat&&MSChat.resolve?MSChat.resolve(m):null; location.href='Merchsmith Calendar.html#tab=cal&with='+encodeURIComponent(p?p.id:''); }; }

  const css=`
  .am-avw{display:grid;place-items:center;border-radius:50%;overflow:hidden;flex:none;background:var(--periwinkle);color:#fff;font-weight:800;font-size:12px;} .am-avw img{width:100%;height:100%;object-fit:cover;} .am-avw>*{width:100%;height:100%;}
  .am-card{background:#fff;border:1px solid var(--line-soft);border-radius:18px;padding:22px 24px;margin-top:22px;box-shadow:0 4px 16px rgba(40,44,80,.04);}
  .am-lbl{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);}
  .am-body{display:flex;align-items:center;gap:16px;margin-top:12px;flex-wrap:wrap;} .am-who{flex:1;min-width:200px;display:flex;flex-direction:column;gap:2px;} .am-who b{font-family:var(--serif);font-weight:500;font-size:22px;} .am-who>span{font-size:13px;color:var(--text-soft);}
  .am-ct{display:flex;gap:14px;flex-wrap:wrap;margin-top:4px;} .am-ct a{white-space:nowrap;font-size:13px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;} .am-ct a:hover{text-decoration:underline;}
  .am-acts{display:flex;gap:8px;flex-wrap:wrap;} .am-btn{font:inherit;font-size:13.5px;font-weight:700;background:var(--periwinkle-deep);color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;white-space:nowrap;} .am-btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line-soft);}
  .am-sm{font-size:12.5px;color:var(--text-soft);line-height:1.5;margin:0 0 12px;}
  .am-scrim{position:fixed;inset:0;background:rgba(20,22,45,.35);z-index:1700;display:grid;place-items:center;padding:16px;}
  .am-modal{background:#fff;border-radius:16px;width:min(460px,100%);max-height:80vh;overflow:auto;padding:18px 20px;box-shadow:0 24px 60px rgba(20,22,45,.3);}
  .am-mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;} .am-mh b{font-family:var(--serif);font-weight:500;font-size:20px;} .am-x{border:0;background:none;font-size:24px;color:var(--muted);cursor:pointer;}
  .am-list{display:flex;flex-direction:column;gap:6px;} .am-opt{display:flex;align-items:center;gap:11px;width:100%;border:1.5px solid var(--line-soft);background:#fff;border-radius:12px;padding:9px 12px;font:inherit;text-align:left;cursor:pointer;} .am-opt:hover{border-color:var(--periwinkle);}
  .am-opt.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);} .am-opt>span:nth-child(2){flex:1;display:flex;flex-direction:column;} .am-opt b{font-size:14px;} .am-opt i{font-style:normal;font-size:12px;color:var(--muted);} .am-opt em{font-style:normal;font-size:11px;font-weight:800;color:var(--periwinkle-deep);}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  return {list,get,set,getUser,setUser,usersOf,pick,cardHTML,wireCard};
})();
