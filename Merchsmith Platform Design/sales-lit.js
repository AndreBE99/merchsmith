/* ============================================================
   Sales literature — distributor-uploaded A3 landscape pages that are
   appended to the quote PDF (D01) after the product pages.
   Stored in localStorage 'ms-sales-lit' as [{id,title,img,on,at,by}].
   Images are downscaled to 2000px wide JPEG so they fit in storage.
   window.MSSALESLIT: list() · active() · settings(mountEl)
   ============================================================ */
window.MSSALESLIT=(function(){
  const KEY='ms-sales-lit';
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const list=()=>{ try{ return JSON.parse(localStorage.getItem(KEY)||'[]')||[]; }catch(e){ return []; } };
  const save=L=>{ try{ localStorage.setItem(KEY,JSON.stringify(L)); return true; }catch(e){ alert('Not enough browser storage for this page. Try a smaller image, or remove another page first.'); return false; } };
  const active=()=>list().filter(x=>x.on!==false&&x.img);
  const who=()=>{ try{ return (window.MSChat&&MSChat.me&&MSChat.me().name)||'Jess Doyle'; }catch(e){ return 'Jess Doyle'; } };
  function readImg(file){ return new Promise((res,rej)=>{
    if(!file||!/^image\//.test(file.type)) return rej(new Error('Upload a PNG or JPG image of the page.'));
    const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>{
      const W=Math.min(2000,im.naturalWidth), H=Math.round(im.naturalHeight*W/im.naturalWidth);
      const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.drawImage(im,0,0,W,H);
      res({url:c.toDataURL('image/jpeg',.84),ratio:im.naturalWidth/im.naturalHeight}); }; im.onerror=()=>rej(new Error('That image could not be read.')); im.src=r.result; };
    r.readAsDataURL(file); }); }

  const css=`
  .sl-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}
  .sl-row{display:grid;grid-template-columns:auto 168px minmax(0,1fr) auto;align-items:center;gap:16px;border:1px solid var(--line-soft,#e4e7ec);border-radius:14px;padding:12px 14px;background:#fff}
  .sl-row.off{opacity:.55}
  .sl-th{width:168px;aspect-ratio:420/297;border-radius:8px;overflow:hidden;background:var(--paper-2,#f4f3ee);border:1px solid var(--line-soft,#e4e7ec)}
  .sl-th img{width:100%;height:100%;object-fit:cover;display:block}
  .sl-main{display:flex;flex-direction:column;gap:6px;min-width:0}
  .sl-main input{font:inherit;font-size:14px;font-weight:700;border:1px solid transparent;border-radius:8px;padding:6px 8px;margin-left:-8px;background:transparent;color:var(--ink,#23232a)}
  .sl-main input:hover,.sl-main input:focus{border-color:var(--line-soft,#e4e7ec);background:#fff;outline:none}
  .sl-meta{font-size:12px;color:var(--muted,#9a9aa3)}
  .sl-warn{font-size:12px;color:#b54708;font-weight:600}
  .sl-acts{display:flex;gap:6px;align-items:center}
  .sl-ib{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line-soft,#e4e7ec);background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;color:var(--ink,#23232a)}
  .sl-ib:hover{background:var(--paper-2,#f4f3ee)} .sl-ib:disabled{opacity:.35;cursor:default}
  .sl-ib.del:hover{color:#c0395f;border-color:#f3c4d2}
  .sl-mv{display:flex;flex-direction:column;gap:4px}
  .sl-mv .sl-ib{padding:2px 8px;line-height:1}
  .sl-tog{width:38px;height:22px;border-radius:999px;border:0;background:#d0d5dd;position:relative;cursor:pointer;flex:none}
  .sl-tog::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  .sl-tog.on{background:var(--periwinkle-deep,#5860a6)} .sl-tog.on::after{left:19px}
  .sl-empty{border:1.5px dashed var(--line-soft,#d0d5dd);border-radius:14px;padding:26px;text-align:center;color:var(--ink-2,#55555f);font-size:13.5px;margin-top:14px}
  .sl-add{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}
  .sl-hint{font-size:12.5px;color:var(--muted,#9a9aa3)}`;
  let styled=false;
  function settings(el){
    if(!el) return;
    if(!styled){ styled=true; const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s); }
    const draw=()=>{
      const L=list();
      el.innerHTML=`<div class="card">
        <div class="card-h"><h2>Sales literature</h2><span class="tag">Quote PDF</span></div>
        <p style="margin:0;font-size:13.5px;color:var(--ink-2,#55555f);line-height:1.6;max-width:68ch">Extra pages added to the end of every quote, after the product pages. Upload each page as an image at A3 landscape (420 × 297 mm, ideally 4961 × 3508 px or at least 2000 px wide). Switch a page off to leave it out without deleting it.</p>
        ${L.length?`<div class="sl-list">${L.map((x,i)=>{ const ratio=x.ratio||1.414, odd=Math.abs(ratio-1.414)>.06;
          return `<div class="sl-row${x.on===false?' off':''}" data-slid="${esc(x.id)}">
            <div class="sl-mv"><button class="sl-ib" data-slup ${i===0?'disabled':''} title="Move up">↑</button><button class="sl-ib" data-sldn ${i===L.length-1?'disabled':''} title="Move down">↓</button></div>
            <div class="sl-th"><img src="${esc(x.img)}" alt=""></div>
            <div class="sl-main"><input value="${esc(x.title||'')}" placeholder="Page title" data-sltitle>
              <span class="sl-meta">Page ${i+1} of the literature · added by ${esc(x.by||'—')}${x.at?' · '+new Date(x.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):''}</span>
              ${odd?'<span class="sl-warn">Not A3 landscape: edges will be cropped to fit the page.</span>':''}</div>
            <div class="sl-acts"><button class="sl-tog${x.on===false?'':' on'}" data-sltog title="${x.on===false?'Off: not in quotes':'On: included in quotes'}"></button>
              <label class="sl-ib">Replace<input type="file" accept="image/*" hidden data-slrep></label>
              <button class="sl-ib del" data-sldel>Delete</button></div>
          </div>`; }).join('')}</div>`:'<div class="sl-empty">No pages yet. Add brochure pages, case studies, reviews or a “why choose us” page.</div>'}
        <div class="sl-add"><label class="btn" style="cursor:pointer">+ Add page<input type="file" accept="image/*" multiple hidden data-sladd></label><span class="sl-hint">${active().length} of ${L.length} page${L.length===1?'':'s'} included in quotes</span></div>
      </div>`;
      const idOf=t=>t.closest('[data-slid]').dataset.slid;
      const upd=(id,fn)=>{ const L=list(), x=L.find(y=>y.id===id); if(!x) return; fn(x,L); if(save(L)) draw(); };
      el.querySelector('[data-sladd]').onchange=async e=>{ const files=[...e.target.files]; for(const f of files){ try{ const r=await readImg(f); const L=list(); L.push({id:'sl'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),title:f.name.replace(/\.[a-z0-9]+$/i,'').replace(/[-_]+/g,' '),img:r.url,ratio:r.ratio,on:true,at:new Date().toISOString(),by:who()}); if(!save(L)) break; }catch(err){ alert(err.message); } } draw(); };
      el.querySelectorAll('[data-slrep]').forEach(i=>i.onchange=async e=>{ try{ const r=await readImg(e.target.files[0]); upd(idOf(i),x=>{ x.img=r.url; x.ratio=r.ratio; x.at=new Date().toISOString(); x.by=who(); }); }catch(err){ alert(err.message); } });
      el.querySelectorAll('[data-sltitle]').forEach(i=>i.onchange=()=>upd(idOf(i),x=>{ x.title=i.value.trim(); }));
      el.querySelectorAll('[data-sltog]').forEach(b=>b.onclick=()=>upd(idOf(b),x=>{ x.on=x.on===false; }));
      el.querySelectorAll('[data-sldel]').forEach(b=>b.onclick=()=>{ if(!confirm('Delete this page? It will no longer appear in quotes.')) return; const id=idOf(b); if(save(list().filter(x=>x.id!==id))) draw(); });
      const mv=(b,d)=>{ const id=idOf(b), L=list(), i=L.findIndex(x=>x.id===id), j=i+d; if(j<0||j>=L.length) return; [L[i],L[j]]=[L[j],L[i]]; if(save(L)) draw(); };
      el.querySelectorAll('[data-slup]').forEach(b=>b.onclick=()=>mv(b,-1));
      el.querySelectorAll('[data-sldn]').forEach(b=>b.onclick=()=>mv(b,1));
    };
    draw();
  }
  return {list,active,settings};
})();
