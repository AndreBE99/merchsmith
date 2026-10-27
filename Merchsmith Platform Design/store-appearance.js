/* ============================================================
   store-appearance.js — Distributor Settings → Store appearance.
   Typography (heading + body font, from a list or an uploaded font file),
   heading colour, button shape, main button style and card corners for the
   distributor's storefront. Colours still come from the colourway (Branding).

   Store: localStorage 'ms-store-appearance'
     {head, body, headFile:{name,data}, bodyFile:{name,data},
      headColour:'ink'|'brand', btn:'pill'|'rounded'|'square',
      mainBtn:'filled'|'outline', cards:'soft'|'subtle'|'square'}
   Storefront pages (Store, Page) call MSAPPEAR.apply() on load.
   window.MSAPPEAR: mount(el) · apply() · get()
   ============================================================ */
window.MSAPPEAR=window.MSAPPEAR||(function(){
  const KEY='ms-store-appearance';
  const DEF={head:'EB Garamond',body:'Mulish',headFile:null,bodyFile:null,headColour:'ink',btn:'pill',mainBtn:'filled',cards:'soft'};
  const HEADS=[['EB Garamond','serif'],['Cormorant Garamond','serif'],['Playfair Display','serif'],['Libre Baskerville','serif'],['Lora','serif'],['DM Serif Display','serif'],['Montserrat','sans-serif'],['Poppins','sans-serif'],['Space Grotesk','sans-serif']];
  const BODIES=[['Mulish','sans-serif'],['Inter','sans-serif'],['Lato','sans-serif'],['Nunito Sans','sans-serif'],['Open Sans','sans-serif'],['Source Sans 3','sans-serif'],['Work Sans','sans-serif'],['DM Sans','sans-serif'],['Karla','sans-serif']];
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const get=()=>{ try{ return Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return Object.assign({},DEF); } };
  const put=v=>{ try{ localStorage.setItem(KEY,JSON.stringify(v)); }catch(e){ alert('That font file is too big to save in this browser. Try a WOFF2 file under 1.5 MB.'); return false; } return true; };
  const fallback=(n,list)=>((list.find(x=>x[0]===n)||[])[1])||'serif';
  const UPH='Uploaded ·';
  const famOf=(v,which)=>{ const f=v[which+'File']; if(f) return '"MS '+which+' font"'; const n=v[which]; return '"'+n+'", '+fallback(n,which==='head'?HEADS:BODIES); };
  // load a Google font once
  function gfont(n){ if(!n||document.querySelector('link[data-sa-font="'+n+'"]')) return; const l=document.createElement('link'); l.rel='stylesheet'; l.dataset.saFont=n;
    l.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(n).replace(/%20/g,'+')+':ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap'; document.head.appendChild(l); }
  function faceCSS(v){ return ['head','body'].map(w=>v[w+'File']?`@font-face{font-family:"MS ${w} font";src:url(${v[w+'File'].data});font-display:swap;}`:'').join(''); }
  const RAD={pill:'999px',rounded:'10px',square:'2px'}, CR={soft:'',subtle:'6px',square:'0px'};

  /* ---------- storefront ---------- */
  function apply(){ const v=get(); if(!v.headFile) gfont(v.head); if(!v.bodyFile) gfont(v.body);
    let st=document.getElementById('saStyle'); if(!st){ st=document.createElement('style'); st.id='saStyle'; document.head.appendChild(st); }
    const cards='.pcard .pimg,.hm-pimg,.hm-disc img,.hm-brandtile img,.hm-quotes,.hm-ecoband,.hm-step,.depttile .img,.hm-spot,.pp-gallery .stage,.pp-reviews,.pp-storyimg';
    st.textContent=faceCSS(v)+`:root{--serif:${famOf(v,'head')};--sans:${famOf(v,'body')};}`
      +(v.headColour==='brand'?`main h1,main h2,main h3,.main h1,.main h2,.main h3,.hm-hero h1{color:var(--periwinkle-deep);}`:'')
      +(v.btn!=='pill'?`.hm-btn,.dv-rbtn,.dv-rsel,.pp-btn,.sc-act,.sc-reqquote,.addproj>button,.btn,.cal-new,.sa-save,.sa-reset{border-radius:${RAD[v.btn]}!important;}`:'')
      +(v.mainBtn==='outline'?`.hm-btn.solid{background:transparent!important;color:var(--periwinkle-deep)!important;}`:'')
      +(CR[v.cards]?`${cards}{border-radius:${CR[v.cards]}!important;}`:''); }

  /* ---------- settings panel ---------- */
  function mount(el){ if(!el) return; let v=get(), saved=JSON.stringify(v);
    const seg=(k,opts)=>`<div class="sa-seg">${opts.map(([val,l])=>`<button type="button" data-sa="${k}" data-v="${val}" class="${v[k]===val?'on':''}">${l}</button>`).join('')}</div>`;
    const sel=(w,list)=>{ const f=v[w+'File']; return `<div class="sa-selw"><select data-safont="${w}" style="font-family:${esc(famOf(v,w))}">${f?`<option value="__file" selected>${esc(UPH+' '+f.name)}</option>`:''}${list.map(([n],i)=>`<option value="${esc(n)}"${!f&&v[w]===n?' selected':''} style="font-family:'${esc(n)}'">${esc(n)}${i===0?'  ·  Merchsmith default':''}</option>`).join('')}</select></div>`; };
    const up=w=>`<label class="sa-up"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v4h4M12 17v-6M9.5 13.5 12 11l2.5 2.5"/></svg><span>${v[w+'File']?'Replace font':'Upload your own font'}</span><input type="file" accept=".woff2,.woff,.ttf,.otf" data-saup="${w}" hidden></label>`;
    function draw(){ [v.head,v.body,...HEADS.map(x=>x[0]),...BODIES.map(x=>x[0])].forEach(gfont);
      let st=document.getElementById('saFace'); if(!st){ st=document.createElement('style'); st.id='saFace'; document.head.appendChild(st); } st.textContent=faceCSS(v);
      const dirty=JSON.stringify(v)!==saved, H=famOf(v,'head'), B=famOf(v,'body');
      el.innerHTML=`<div class="sa">
        <div class="sa-col">
          <section class="card sa-card"><div class="card-h"><h2>Typography</h2></div><p class="lede sa-lede">The fonts used across your platform and storefront, for your team and your customers. Merchsmith’s EB Garamond and Mulish are the default. Pick another from the list or upload your own brand font.</p>
            <h4>Headings</h4><div class="sa-frow">${sel('head',HEADS)}${up('head')}</div><p class="sa-hint">Page titles, section headings, the store hero and the Display/H1–H4 text styles.${v.headFile?` <button class="sa-link" data-sarm="head">Remove uploaded font</button>`:''}</p>
            <h4>Body text</h4><div class="sa-frow">${sel('body',BODIES)}${up('body')}</div><p class="sa-hint">Everything else: paragraphs, menus, forms, tables, buttons and product cards.${v.bodyFile?` <button class="sa-link" data-sarm="body">Remove uploaded font</button>`:''}</p>
            <h4>Headings colour</h4>${seg('headColour',[['ink','Ink (default)'],['brand','Brand colour']])}</section>
          <section class="card sa-card"><div class="card-h"><h2>Buttons &amp; corners</h2></div><p class="lede sa-lede">Shapes used across your platform and storefront. Colours follow your colourway in the <a href="#tab=branding" data-sagotab="branding">Branding</a> tab.</p>
            <h4>Button shape</h4>${seg('btn',[['pill','Pill (default)'],['rounded','Rounded'],['square','Square']])}
            <h4>Main button style</h4>${seg('mainBtn',[['filled','Filled (default)'],['outline','Outline']])}
            <h4>Cards, bands &amp; images</h4>${seg('cards',[['soft','Soft (default)'],['subtle','Subtle'],['square','Square']])}</section>
        </div>
        <div class="sa-side">
          <div class="card sa-pv" style="--sa-h:${esc(H)};--sa-b:${esc(B)};--sa-r:${RAD[v.btn]};--sa-c:${CR[v.cards]||'22px'}">
            <span class="sa-eyebrow">Preview</span>
            <h3 class="${v.headColour==='brand'?'brand':''}">Good merch, for brands that mean it.</h3>
            <p>Body copy is set in your body font. Headings, buttons and cards across your platform and storefront follow the choices on the left.</p>
            <div class="sa-btns"><span class="sa-b1${v.mainBtn==='outline'?' ol':''}">Shop all products</span><span class="sa-b2">Start a project</span></div>
            <div class="sa-band"><span class="sa-img"></span><div><b class="${v.headColour==='brand'?'brand':''}">Our story</b><i>“Beautiful merch, beautifully managed.”</i></div></div>
          </div>
          <p class="sa-fonts">${esc(v.headFile?v.headFile.name:v.head)} · ${esc(v.bodyFile?v.bodyFile.name:v.body)}</p>
          <div class="sa-acts"><button class="btn sa-save" data-sasave${dirty?'':' disabled'}>Save appearance</button><button class="btn ghost sa-reset" data-sareset>Reset to Merchsmith defaults</button></div>
          <a class="sa-open" href="Merchsmith Store.html" target="_blank" rel="noopener">Preview store ↗</a>
        </div></div>`;
      el.querySelectorAll('[data-sa]').forEach(b=>b.onclick=()=>{ v[b.dataset.sa]=b.dataset.v; draw(); });
      el.querySelectorAll('[data-safont]').forEach(s=>s.onchange=()=>{ const w=s.dataset.safont; if(s.value==='__file') return; v[w]=s.value; v[w+'File']=null; draw(); });
      el.querySelectorAll('[data-saup]').forEach(i=>i.onchange=()=>{ const f=i.files[0], w=i.dataset.saup; if(!f) return;
        if(!/\.(woff2?|ttf|otf)$/i.test(f.name)) return alert('Use a WOFF2, WOFF, TTF or OTF font file.');
        if(f.size>1.5*1024*1024) return alert('That font is over 1.5 MB. A WOFF2 version is usually much smaller.');
        const r=new FileReader(); r.onload=()=>{ v[w+'File']={name:f.name.replace(/\.(woff2?|ttf|otf)$/i,''),data:r.result}; draw(); }; r.readAsDataURL(f); });
      el.querySelectorAll('[data-sarm]').forEach(b=>b.onclick=()=>{ v[b.dataset.sarm+'File']=null; draw(); });
      el.querySelectorAll('[data-sagotab]').forEach(a=>a.onclick=e=>{ e.preventDefault(); const t=document.querySelector('.settab[data-panel="'+a.dataset.sagotab+'"]'); if(t) t.click(); });
      el.querySelector('[data-sasave]').onclick=()=>{ if(!put(v)) return; saved=JSON.stringify(v); apply(); toast('Appearance saved across your platform and store'); draw(); };
      el.querySelector('[data-sareset]').onclick=()=>{ if(!confirm('Go back to Merchsmith’s default fonts and shapes?')) return; v=Object.assign({},DEF); put(v); saved=JSON.stringify(v); apply(); toast('Reset to Merchsmith defaults'); draw(); };
    }
    draw(); }
  function toast(t){ if(window.MSPEOPLE&&MSPEOPLE.toast) return MSPEOPLE.toast(t); let el=document.getElementById('saToast'); if(!el){ el=document.createElement('div'); el.id='saToast'; el.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;font:600 13.5px var(--sans);padding:11px 18px;border-radius:11px;z-index:1600;transition:opacity .2s;opacity:0;pointer-events:none'; document.body.appendChild(el); } el.textContent=t; el.style.opacity=1; clearTimeout(el._t); el._t=setTimeout(()=>el.style.opacity=0,2400); }

  const css=`
  .sa{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:start;} @media(max-width:1000px){.sa{grid-template-columns:1fr;}}
  .sa-col{display:flex;flex-direction:column;} .sa-lede{margin-bottom:6px;} .sa-lede a{color:var(--periwinkle-deep);font-weight:700;text-decoration:none;}
  .sa-card h4{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin:18px 0 8px;}
  .sa-frow{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:10px;} @media(max-width:560px){.sa-frow{grid-template-columns:1fr;}}
  .sa-selw{position:relative;} .sa-selw::after{content:"";position:absolute;right:14px;top:50%;border:4.5px solid transparent;border-top-color:var(--ink-3);margin-top:-2px;pointer-events:none;}
  .sa-selw select{appearance:none;-webkit-appearance:none;width:100%;font-size:15px;color:var(--ink);background:#fff;border:1.5px solid var(--line-soft);border-radius:10px;padding:10px 34px 10px 13px;cursor:pointer;} .sa-selw select:focus{outline:0;border-color:var(--periwinkle-deep);}
  .sa-up{display:flex;align-items:center;justify-content:center;gap:8px;border:1.5px solid var(--line-soft);border-radius:10px;padding:9px 12px;cursor:pointer;color:var(--ink);font-weight:700;font-size:13.5px;white-space:nowrap;background:#fff;} .sa-up:hover{border-color:var(--periwinkle);}
  .sa-up svg{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  .sa-hint{font-size:12px;color:var(--muted);margin:7px 0 0;line-height:1.45;} .sa-link{border:0;background:none;font:inherit;font-weight:700;color:var(--periwinkle-deep);cursor:pointer;padding:0;margin-left:4px;}
  .sa-seg{display:flex;gap:8px;flex-wrap:wrap;} .sa-seg button{font:inherit;font-size:13px;font-weight:700;color:var(--ink-2);background:#fff;border:1.5px solid var(--line-soft);border-radius:999px;padding:6px 14px;cursor:pointer;white-space:nowrap;}
  .sa-seg button:hover{border-color:var(--periwinkle);} .sa-seg button.on{border-color:var(--periwinkle-deep);background:var(--tint-peri);color:var(--periwinkle-deep);}
  .sa-side{position:sticky;top:90px;display:flex;flex-direction:column;align-items:flex-start;} @media(max-width:1000px){.sa-side{position:static;}}
  .sa-pv{width:100%;padding:26px 28px;}
  .sa-eyebrow{display:block;font-family:var(--sa-b);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-bottom:14px;}
  .sa-pv h3{font-family:var(--sa-h);font-weight:500;font-size:clamp(26px,2.6vw,36px);line-height:1.1;letter-spacing:-.01em;margin:0 0 14px;color:var(--ink);} .sa-pv .brand{color:var(--periwinkle-deep);}
  .sa-pv p{font-family:var(--sa-b);font-size:14.5px;line-height:1.6;color:var(--ink-2);margin:0 0 18px;}
  .sa-btns{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;} .sa-btns span{font-family:var(--sa-b);font-size:14px;font-weight:700;border-radius:var(--sa-r);padding:11px 20px;border:1.5px solid var(--periwinkle-deep);color:var(--periwinkle-deep);}
  .sa-b1{background:var(--periwinkle-deep);color:#fff!important;} .sa-b1.ol{background:transparent;color:var(--periwinkle-deep)!important;}
  .sa-band{display:flex;align-items:center;gap:18px;background:color-mix(in srgb,var(--periwinkle-deep) 9%,#fff);border-radius:var(--sa-c);padding:20px 22px;}
  .sa-img{width:110px;height:78px;flex:none;border-radius:calc(var(--sa-c) * .7);background:linear-gradient(135deg,color-mix(in srgb,var(--periwinkle-deep) 65%,#fff),var(--periwinkle-deep));} @media(max-width:640px){.sa-band{flex-direction:column;align-items:flex-start;}}
  .sa-band b{display:block;font-family:var(--sa-h);font-weight:500;font-size:21px;color:var(--ink);margin-bottom:6px;} .sa-band i{font-family:var(--sa-h);font-size:16px;line-height:1.5;color:var(--periwinkle-deep);}
  .sa-fonts{font-size:12.5px;color:var(--muted);margin:12px 2px 14px;}
  .sa-acts{display:flex;gap:10px;flex-wrap:wrap;} .sa-save{white-space:nowrap;} .sa-save:disabled{background:var(--paper-2);color:var(--muted);cursor:default;} .sa-reset{white-space:nowrap;}
  .sa-open{margin:14px 2px 0;font-size:13.5px;font-weight:700;color:var(--periwinkle-deep);text-decoration:none;} .sa-open:hover{text-decoration:underline;}`;
  const tag=document.createElement('style'); tag.textContent=css; document.head.appendChild(tag);
  return { mount, apply, get };
})();
