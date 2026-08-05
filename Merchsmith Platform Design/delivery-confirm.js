/* Merchsmith — supplier confirmation flow for CRITICAL delivery dates.
   Two modals, both shared by Dashboard + Gallery:
     MSConfirm.openRequest(opts)  distributor asks the supplier to check a date
     MSConfirm.openReply(opts)    simulated supplier reply form (enquiries dashboard)

   openRequest(opts):
     opts = { productName, supplierName, customerDate, customerDateObj, data, now,
              onSend(data), onWithdraw() }
     data = { supplierDeliveryISO, contacts:[ids], courier, notes }
     onSend receives { supplierDeliveryISO, supplierDeliveryDisplay, contacts:[ids],
                       contactNames:[...], courier, notes }

   openReply(opts):
     opts = { productName, supplierName, supplierDeliveryDisplay, suggestOrderISO,
              suggestProofISO, now, onReply(r) }
     onReply receives { achievable, orderRequiredISO, orderRequiredDisplay,
                        proofISO, proofDisplay }
*/
(function(){
  if(window.MSConfirm) return;
  const ML = ()=>window.MSLead;

  const css = `
  .cmodal{position:fixed;inset:0;z-index:140;display:none;font-family:var(--sans);}
  .cmodal.open{display:block;}
  .cmodal-scrim{position:absolute;inset:0;background:rgba(60,66,121,.55);backdrop-filter:blur(2px);}
  .cmodal-panel{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(660px,94vw);max-height:92vh;overflow:auto;
    background:#fff;border:1px solid var(--line-soft);border-radius:20px;box-shadow:0 26px 70px rgba(40,44,80,.34);padding:30px 32px 26px;}
  .cm-x{position:absolute;top:20px;right:20px;width:36px;height:36px;border-radius:50%;border:1.5px solid var(--line);background:#fff;color:var(--ink);
    display:grid;place-items:center;cursor:pointer;transition:background .15s,color .15s,transform .2s;}
  .cm-x:hover{background:var(--flare);color:#fff;border-color:var(--flare);transform:rotate(90deg);}
  .cm-x .icn{width:17px;height:17px;}
  .cm-eyebrow{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--periwinkle-deep);}
  .cm-eyebrow.crit{color:#d33a22;}
  .cm-title{font-family:var(--serif);font-weight:500;font-size:26px;line-height:1.1;margin:6px 0 4px;color:var(--ink);}
  .cm-sub{font-size:13.5px;color:var(--text-soft);font-weight:500;margin-bottom:20px;}
  .cm-sub b{color:var(--ink);font-weight:700;}
  .cm-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px;}
  .cm-field{display:flex;flex-direction:column;gap:6px;}
  .cm-field.full{grid-column:1 / -1;}
  .cm-field label{font-size:12.5px;font-weight:700;color:var(--ink);display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;}
  .cm-field .hint{font-size:11px;font-weight:500;color:var(--muted);}
  .cm-field input,.cm-field select,.cm-field textarea{font-family:var(--sans);font-size:13.5px;font-weight:600;color:var(--ink);
    background:var(--paper-2);border:1.5px solid transparent;border-radius:10px;padding:10px 12px;width:100%;transition:border-color .15s,background .15s;}
  .cm-field input:focus,.cm-field select:focus,.cm-field textarea:focus{outline:none;background:#fff;border-color:var(--periwinkle);}
  .cm-field textarea{resize:vertical;min-height:60px;font-weight:500;line-height:1.5;}
  /* contacts */
  .cm-contacts{grid-column:1/-1;display:flex;flex-direction:column;gap:8px;}
  .cm-clabel{font-size:12.5px;font-weight:700;color:var(--ink);}
  .cm-contact{display:flex;align-items:center;gap:12px;border:1.5px solid var(--line-soft);border-radius:12px;padding:11px 14px;cursor:pointer;transition:border-color .14s,background .14s;}
  .cm-contact:hover{border-color:var(--periwinkle);}
  .cm-contact.on{border-color:var(--periwinkle);background:rgba(123,133,197,.07);}
  .cm-check{width:20px;height:20px;border-radius:6px;border:2px solid var(--line);flex:none;display:grid;place-items:center;color:#fff;transition:background .14s,border-color .14s;}
  .cm-contact.on .cm-check{background:var(--periwinkle);border-color:var(--periwinkle);}
  .cm-check .icn{width:13px;height:13px;opacity:0;}
  .cm-contact.on .cm-check .icn{opacity:1;}
  .cm-cinfo b{display:block;font-size:13.5px;font-weight:700;color:var(--ink);}
  .cm-cinfo span{font-size:12px;color:var(--text-soft);}
  .cm-addlink{align-self:flex-start;font-size:12px;font-weight:700;color:var(--periwinkle-deep);background:none;border:0;cursor:pointer;padding:2px 0;text-decoration:underline;text-underline-offset:2px;}
  .cm-addlink:hover{color:var(--periwinkle);}
  .cm-addrow{display:none;gap:8px;}
  .cm-addrow.open{display:flex;flex-wrap:wrap;}
  .cm-addrow input{flex:1;min-width:120px;}
  .cm-addrow button{flex:none;background:var(--periwinkle);color:#fff;border:0;border-radius:9px;padding:0 14px;font-weight:700;font-size:12.5px;cursor:pointer;}
  /* yes/no segmented */
  .cm-seg{display:inline-flex;gap:8px;}
  .cm-seg button{font-family:var(--sans);font-size:13.5px;font-weight:700;border:1.5px solid var(--line);background:#fff;color:var(--ink-3);border-radius:10px;padding:10px 20px;cursor:pointer;transition:all .14s;}
  .cm-seg button.on[data-v="yes"]{background:var(--spearmint);border-color:var(--spearmint);color:#fff;}
  .cm-seg button.on[data-v="no"]{background:var(--flare);border-color:var(--flare);color:#fff;}
  .cm-foot{display:flex;align-items:center;gap:14px;margin-top:24px;flex-wrap:wrap;}
  .cm-primary{display:inline-flex;align-items:center;gap:9px;background:var(--periwinkle);color:#fff;border:0;border-radius:999px;padding:12px 26px;
    font-family:var(--sans);font-weight:700;font-size:14.5px;cursor:pointer;box-shadow:0 6px 16px rgba(88,96,166,.34);transition:transform .15s,filter .15s,opacity .15s;}
  .cm-primary:hover{transform:translateY(-1px);filter:brightness(1.05);}
  .cm-primary.green{background:var(--spearmint);box-shadow:0 6px 16px rgba(54,192,160,.4);}
  .cm-primary[disabled]{opacity:.45;cursor:not-allowed;transform:none;filter:none;box-shadow:none;}
  .cm-primary .icn{width:17px;height:17px;}
  .cm-link{background:none;border:0;color:var(--text-soft);font-weight:700;font-size:13px;cursor:pointer;font-family:var(--sans);text-decoration:underline;text-underline-offset:2px;}
  .cm-link:hover{color:var(--flare);}
  .cm-cancel{margin-left:auto;background:none;border:0;color:var(--muted);font-weight:600;font-size:13px;cursor:pointer;font-family:var(--sans);}
  .cm-cancel:hover{color:var(--ink);}
  .cm-note{grid-column:1/-1;font-size:12.5px;color:var(--text-soft);background:var(--paper-2);border-radius:10px;padding:11px 13px;line-height:1.5;}
  .cm-when{display:none;}
  .cm-when.show{display:contents;}
  .cm-branding{font-size:13px;color:var(--ink);line-height:1.5;background:var(--paper,#f6f4ee);border-radius:9px;padding:10px 12px;}
  .cm-branding .bpos{display:block;margin-bottom:3px;}
  .cm-branding .bpos:last-child{margin-bottom:0;}
  .cm-branding .bsw{display:inline-block;width:11px;height:11px;border-radius:3px;border:1px solid rgba(0,0,0,.15);vertical-align:-1px;margin-right:3px;}
  .cm-addlink{color:var(--periwinkle-deep);font-weight:600;font-size:13px;text-decoration:underline;cursor:pointer;}
  @media(max-width:560px){.cm-grid{grid-template-columns:1fr;}}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  function panel(html){
    const root=document.createElement('div'); root.className='cmodal';
    root.innerHTML = `<div class="cmodal-scrim" data-close="1"></div><div class="cmodal-panel" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click', ()=>close(root)));
    return root;
  }
  function open(root){ root.classList.add('open'); document.body.style.overflow='hidden'; }
  function close(root){ root.classList.remove('open'); document.body.style.overflow=''; }
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') document.querySelectorAll('.cmodal.open').forEach(close); });

  function dtLocal(d){ d=new Date(d); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); }

  // ---------- REQUEST modal ----------
  let reqRoot=null, reqCur=null, reqSel=new Set();
  function buildRequest(){
    reqRoot = panel(`
      <button class="cm-x" data-close="1" aria-label="Close"><svg class="icn"><use href="#ic-x"/></svg></button>
      <div id="rqMain">
      <div class="cm-eyebrow crit">Critical delivery date</div>
      <div class="cm-title">Ask the supplier to confirm</div>
      <div class="cm-sub" id="rqSub"></div>
      <div class="cm-grid">
        <div class="cm-contacts">
          <span class="cm-clabel">Notify supplier contacts to check this date</span>
          <div id="rqContacts"></div>
          <button type="button" class="cm-addlink" id="rqAddLink">+ Add a contact</button>
        </div>
        <div class="cm-field">
          <label>Delivery date requested of supplier <span class="hint">days-in-lieu earlier by default</span></label>
          <button type="button" id="rqSupDateBtn" style="display:flex;align-items:center;gap:9px;font-family:var(--sans);font-size:13.5px;font-weight:600;color:var(--ink);background:var(--paper-2);border:1.5px solid transparent;border-radius:10px;padding:10px 12px;width:100%;cursor:pointer;text-align:left;"><svg class="icn" style="width:17px;height:17px;color:var(--periwinkle-deep);flex:none"><use href="#ic-cal"/></svg><span id="rqSupDateLbl">Choose date</span></button>
          <input type="hidden" id="rqSupDate">
        </div>
        <div class="cm-field"><label>Stock — colour</label><select id="rqColour"></select></div>
        <div class="cm-field"><label>Stock — size / variant</label><select id="rqSize"></select></div>
        <div class="cm-field"><label>Quantity</label><input type="text" id="rqQty" placeholder="e.g. 250"></div>
        <div class="cm-field full"><label>Branding — positions, methods &amp; colours</label><div id="rqBranding" class="cm-branding"></div></div>
        <div class="cm-field">
          <label>Special courier service</label>
          <select id="rqCourier">
            <option value="">Standard (none)</option>
            <option value="Pre-10">Pre-10:00 delivery</option>
            <option value="Pre-12">Pre-12:00 delivery</option>
            <option value="Saturday">Saturday delivery</option>
          </select>
        </div>
        <div class="cm-field full"><label>Notes for the supplier</label><textarea id="rqNotes" placeholder="Anything the supplier should know…"></textarea></div>
      </div>
      <div class="cm-foot">
        <button class="cm-primary" id="rqSend"><svg class="icn"><use href="#ic-arrow"/></svg><span id="rqSendLbl">Send request</span></button>
        <button class="cm-link" id="rqWithdraw" style="display:none">Withdraw request</button>
        <button class="cm-cancel" data-close="1">Cancel</button>
      </div>
      </div>
      <div id="rqAddPane" style="display:none">
        <div class="cm-eyebrow">New contact</div>
        <div class="cm-title">Add a contact</div>
        <div class="cm-sub" id="rqAddSub"></div>
        <div class="cm-grid">
          <div class="cm-field"><label>Full name</label><input type="text" id="acName" placeholder="e.g. Marco Bellini"></div>
          <div class="cm-field"><label>Role</label><input type="text" id="acRole" placeholder="e.g. Production manager"></div>
          <div class="cm-field"><label>Email</label><input type="email" id="acEmail" placeholder="name@company.com"></div>
          <div class="cm-field"><label>Phone <span class="hint">optional</span></label><input type="tel" id="acPhone" placeholder="07700 900000"></div>
        </div>
        <div class="cm-foot">
          <button class="cm-primary green" id="acSave"><svg class="icn"><use href="#ic-check"/></svg>Save contact</button>
          <button class="cm-cancel" id="acCancel">Back</button>
        </div>
      </div>`);
    const $=id=>reqRoot.querySelector('#'+id);
    function showAdd(){ $('rqMain').style.display='none'; $('rqAddPane').style.display=''; $('rqAddSub').innerHTML=`Adding a contact at <b>${reqCur.supplierName}</b>.`; ['acName','acRole','acEmail','acPhone'].forEach(k=>$(k).value=''); setTimeout(()=>$('acName').focus(),30); }
    function showMain(){ $('rqAddPane').style.display='none'; $('rqMain').style.display=''; }
    reqRoot.__showMain=showMain;
    $('rqAddLink').addEventListener('click', showAdd);
    $('acCancel').addEventListener('click', showMain);
    $('acSave').addEventListener('click', ()=>{
      const n=$('acName').value.trim(); if(!n){ $('acName').focus(); return; }
      const c = ML() ? ML().addContact(reqCur.supplierName, {name:n, email:$('acEmail').value.trim(), role:$('acRole').value.trim()||'Contact'}) : {id:'tmp'+Date.now(), name:n};
      if(c) reqSel.add(c.id);
      showMain(); renderContacts(); updateSend();
    });
    $('rqSupDateBtn').addEventListener('click', e=>{ e.stopPropagation(); openSupCal(); });
    $('rqSend').addEventListener('click', ()=>{
      if(reqSel.size===0) return;
      const o=reqCur; const list = (ML()?ML().contacts(o.supplierName):[]).filter(c=>reqSel.has(c.id));
      const out = { supplierDeliveryISO:$('rqSupDate').value, supplierDeliveryDisplay: $('rqSupDate').value && ML()?ML().fmtDate($('rqSupDate').value+'T00:00'):'',
        contacts:[...reqSel], contactNames:list.map(c=>c.name), colour:$('rqColour').value, size:$('rqSize').value, qty:$('rqQty').value.trim(), courier:$('rqCourier').value, notes:$('rqNotes').value.trim() };
      close(reqRoot); if(o.onSend) o.onSend(out);
    });
    $('rqWithdraw').addEventListener('click', ()=>{ const o=reqCur; close(reqRoot); if(o.onWithdraw) o.onWithdraw(); });
  }
  function renderContacts(){
    const wrap=reqRoot.querySelector('#rqContacts'); const list = ML()?ML().contacts(reqCur.supplierName):[];
    wrap.innerHTML = list.map(c=>`<div class="cm-contact ${reqSel.has(c.id)?'on':''}" data-id="${c.id}">
      <span class="cm-check"><svg class="icn"><use href="#ic-check"/></svg></span>
      <span class="cm-cinfo"><b>${c.name}</b><span>${c.role} · ${c.email}</span></span></div>`).join('');
    wrap.querySelectorAll('.cm-contact').forEach(el=>el.addEventListener('click', ()=>{
      const id=el.dataset.id; if(reqSel.has(id)) reqSel.delete(id); else reqSel.add(id);
      el.classList.toggle('on'); updateSend();
    }));
  }
  function updateSend(){ const b=reqRoot.querySelector('#rqSend'); const lbl=reqRoot.querySelector('#rqSendLbl');
    b.disabled = reqSel.size===0; lbl.textContent = reqSel.size? `Send request to ${reqSel.size} contact${reqSel.size>1?'s':''}` : 'Select a contact'; }

  // ---- supplier-date calendar (Standard / Critical, like the customer picker) ----
  let supCal=null, supY, supM, supCritMode=false, supDocBound=false;
  function openSupCal(){
    if(!supCal){ supCal=document.createElement('div'); supCal.className='datepop'; supCal.style.position='fixed'; supCal.style.zIndex='200'; document.body.appendChild(supCal); }
    if(!supDocBound){ document.addEventListener('click', e=>{ if(supCal && supCal.classList.contains('open') && !supCal.contains(e.target) && !e.target.closest('#rqSupDateBtn')) supCal.classList.remove('open'); }); supDocBound=true; }
    const cur=reqRoot.querySelector('#rqSupDate').value; const now=(reqCur&&reqCur.now)||(ML()&&ML().NOW)||new Date();
    const base= cur? new Date(cur+'T00:00') : now; supY=base.getFullYear(); supM=base.getMonth(); supCritMode=false;
    renderSupCal();
    const r=reqRoot.querySelector('#rqSupDateBtn').getBoundingClientRect();
    supCal.style.top=(r.bottom+6)+'px'; supCal.style.left=Math.min(r.left, window.innerWidth-262)+'px'; supCal.classList.add('open');
  }
  function renderSupCal(){
    const ML2=ML(); const now=(reqCur&&reqCur.now)||(ML2&&ML2.NOW)||new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const lead=(reqCur&&reqCur.leadDays)||0;
    const earliest= ML2? ML2.addWorkingDays(now, lead) : today;
    const earlyD=new Date(earliest.getFullYear(),earliest.getMonth(),earliest.getDate());
    const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ord=n=>{const s=['th','st','nd','rd'],v=n%100;return s[(v-20)%10]||s[v]||s[0];};
    const first=new Date(supY,supM,1).getDay(), days=new Date(supY,supM+1,0).getDate();
    let g=WD.map(w=>`<span class="wd">${w[0]}</span>`).join('');
    for(let i=0;i<first;i++) g+='<span class="day empty"></span>';
    for(let d=1;d<=days;d++){ const c=new Date(supY,supM,d); let cls='day'; if(c<=today) cls+=' disabled'; else if(c<earlyD){ cls += supCritMode?' rush':' disabled'; } g+=`<button class="${cls}" data-d="${d}">${d}</button>`; }
    const toggle=`<div class="dp-mode"><button class="dp-modeopt ${supCritMode?'':'on'}" data-m="std">Standard</button><button class="dp-modeopt ${supCritMode?'on':''}" data-m="crit">Critical</button></div><div class="dp-modehint">${supCritMode?'Any future date — earlier than the standard lead time is a rush.':'On or after the standard lead time.'}</div>`;
    const legend= supCritMode?`<div class="dp-legend"><span class="dot"></span>Earlier than standard lead time</div>`:'';
    supCal.innerHTML=`${toggle}<div class="dp-head"><button data-nav="-1"><svg class="icn"><use href="#ic-arrow-l"/></svg></button><span class="dp-title">${MON[supM]} ${supY}</span><button data-nav="1"><svg class="icn"><use href="#ic-arrow"/></svg></button></div><div class="dp-grid">${g}</div>${legend}`;
    supCal.querySelectorAll('.dp-modeopt').forEach(b=>b.onclick=e=>{ e.stopPropagation(); supCritMode=b.dataset.m==='crit'; renderSupCal(); });
    supCal.querySelectorAll('[data-nav]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); supM+=+b.dataset.nav; if(supM<0){supM=11;supY--;} if(supM>11){supM=0;supY++;} renderSupCal(); });
    supCal.querySelectorAll('.day:not(.empty):not(.disabled)').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const d=+b.dataset.d, picked=new Date(supY,supM,d), wd=WD[picked.getDay()]; reqRoot.querySelector('#rqSupDate').value= ML2?ML2.isoDate(picked):''; reqRoot.querySelector('#rqSupDateLbl').textContent= ML2?ML2.fmtDate(picked):`${wd}. ${d}${ord(d)} ${MON[supM]}`; supCal.classList.remove('open'); });
  }

  function openRequest(opts){
    if(!reqRoot) buildRequest();
    reqCur=opts; reqSel = new Set((opts.data&&opts.data.contacts)||[]);
    const $=id=>reqRoot.querySelector('#'+id);
    reqRoot.querySelector('#rqSub').innerHTML = `<b>${opts.productName}</b> · ${opts.supplierName} · customer needs delivery by <b>${opts.customerDate}</b>.`;
    // default supplier date = customer date minus lieu working days
    let supISO = (opts.data&&opts.data.supplierDeliveryISO) || '';
    if(!supISO && opts.customerDateObj && ML()){ const lieu=ML().lieuFor(opts.supplierName); supISO = ML().isoDate(ML().subWorkingDays(opts.customerDateObj, lieu)); }
    $('rqSupDate').value = supISO;
    $('rqSupDateLbl').textContent = supISO && ML() ? ML().fmtDate(supISO+'T00:00') : 'Choose date';
    const rc=reqRoot.querySelector('#rqColour'), rz=reqRoot.querySelector('#rqSize');
    rc.innerHTML=(opts.colours||['Standard']).map(c=>`<option>${c}</option>`).join('');
    rz.innerHTML=(opts.sizes||['One size']).map(s=>`<option>${s}</option>`).join('');
    if(opts.data&&opts.data.colour) rc.value=opts.data.colour;
    if(opts.data&&opts.data.size) rz.value=opts.data.size;
    $('rqCourier').value = (opts.data&&opts.data.courier)||'';
    $('rqNotes').value = (opts.data&&opts.data.notes)||'';
    $('rqQty').value = (opts.data&&opts.data.qty) || (opts.qty!=null?opts.qty:'') || '';
    const bw=reqRoot.querySelector('#rqBranding');
    bw.innerHTML = opts.brandingSummary ? opts.brandingSummary : '<a href="#" id="rqAddBranding" class="cm-addlink">Not set — add branding positions &amp; colours</a>';
    const ab=reqRoot.querySelector('#rqAddBranding'); if(ab) ab.onclick=(e)=>{ e.preventDefault(); close(reqRoot); if(opts.onAddBranding) opts.onAddBranding(); };
    if(supCal) supCal.classList.remove('open');
    if(reqRoot.__showMain) reqRoot.__showMain();
    $('rqWithdraw').style.display = opts.sent ? '' : 'none';
    renderContacts(); updateSend();
    open(reqRoot);
  }

  // ---------- REPLY modal (simulated supplier) ----------
  let repRoot=null, repCur=null, repAch=null, repStock=null;
  function buildReply(){
    repRoot = panel(`
      <button class="cm-x" data-close="1" aria-label="Close"><svg class="icn"><use href="#ic-x"/></svg></button>
      <div class="cm-eyebrow">Supplier enquiries · response form</div>
      <div class="cm-title">Can you meet this delivery date?</div>
      <div class="cm-sub" id="rpSub"></div>
      <div class="cm-grid">
        <div class="cm-field full">
          <label>Can you achieve this delivery date?</label>
          <div class="cm-seg" id="rpSeg">
            <button type="button" data-v="yes">Yes, we can</button>
            <button type="button" data-v="no">No, we can't</button>
          </div>
        </div>
        <div class="cm-when" id="rpWhen">
          <div class="cm-field"><label>We need the order by <span class="hint">date &amp; time</span></label><input type="datetime-local" id="rpOrder"></div>
          <div class="cm-field"><label>We need proof sign-off by <span class="hint">date &amp; time</span></label><input type="datetime-local" id="rpProof"></div>
        </div>
        <div class="cm-field full"><label>Is this variant in stock?</label>
          <div class="cm-seg" id="rpStockSeg"><button type="button" data-v="yes">In stock</button><button type="button" data-v="no">Out of stock</button></div>
        </div>
        <div class="cm-when" id="rpStockWhen">
          <div class="cm-field full"><label>We can reserve it until <span class="hint">date &amp; time</span></label><input type="datetime-local" id="rpReserve"></div>
        </div>
        <div class="cm-note" id="rpNoNote" style="display:none">We'll flag back to the distributor that this date can't be met, for them to handle manually.</div>
      </div>
      <div class="cm-foot">
        <button class="cm-primary green" id="rpSubmit" disabled><svg class="icn"><use href="#ic-check"/></svg>Submit response</button>
        <button class="cm-cancel" data-close="1">Cancel</button>
      </div>`);
    repRoot.querySelectorAll('#rpSeg button').forEach(b=>b.addEventListener('click', ()=>{
      repAch = b.dataset.v==='yes';
      repRoot.querySelectorAll('#rpSeg button').forEach(x=>x.classList.toggle('on', x===b));
      repRoot.querySelector('#rpWhen').classList.toggle('show', repAch);
      repRoot.querySelector('#rpNoNote').style.display = repAch ? 'none' : '';
      repRoot.querySelector('#rpSubmit').disabled = false;
    }));
    repRoot.querySelectorAll('#rpStockSeg button').forEach(b=>b.addEventListener('click', ()=>{
      repStock = b.dataset.v==='yes';
      repRoot.querySelectorAll('#rpStockSeg button').forEach(x=>x.classList.toggle('on', x===b));
      repRoot.querySelector('#rpStockWhen').classList.toggle('show', repStock);
    }));
    repRoot.querySelector('#rpSubmit').addEventListener('click', ()=>{
      if(repAch===null) return; const o=repCur;
      let r={achievable:repAch};
      if(repAch){
        const oi=repRoot.querySelector('#rpOrder').value, pi=repRoot.querySelector('#rpProof').value;
        r.orderRequiredISO=oi; r.proofISO=pi;
        r.orderRequiredDisplay = oi && ML()?ML().fmtDateTime(oi, o.now):'';
        r.proofDisplay = pi && ML()?ML().fmtDateTime(pi, o.now):'';
      }
      r.stockAvailable = repStock;
      if(repStock){ const ru=repRoot.querySelector('#rpReserve').value; r.reservedUntilISO=ru; r.reservedUntilDisplay = ru && ML()?ML().fmtDateTime(ru,o.now):''; }
      close(repRoot); if(o.onReply) o.onReply(r);
    });
  }
  function openReply(opts){
    if(!repRoot) buildReply();
    repCur=opts; repAch=null;
    repRoot.querySelector('#rpSub').innerHTML = `<b>${opts.productName}</b> for ${opts.supplierName} · requested delivery <b>${opts.supplierDeliveryDisplay||opts.customerDate}</b>.`;
    repRoot.querySelectorAll('#rpSeg button').forEach(x=>x.classList.remove('on'));
    repRoot.querySelectorAll('#rpStockSeg button').forEach(x=>x.classList.remove('on'));
    repRoot.querySelector('#rpStockWhen').classList.remove('show');
    repStock=null;
    repRoot.querySelector('#rpReserve').value = opts.suggestReserveISO || '';
    repRoot.querySelector('#rpWhen').classList.remove('show');
    repRoot.querySelector('#rpNoNote').style.display='none';
    repRoot.querySelector('#rpSubmit').disabled = true;
    repRoot.querySelector('#rpOrder').value = opts.suggestOrderISO || (opts.now? dtLocal(opts.now): '');
    repRoot.querySelector('#rpProof').value = opts.suggestProofISO || '';
    open(repRoot);
  }

  // ---------- STOCK: request + reply (mirrors the delivery flow) ----------
  let sqRoot=null, sqCur=null, sqSel=new Set();
  function buildStockReq(){
    sqRoot = panel(`
      <button class="cm-x" data-close="1" aria-label="Close"><svg class="icn"><use href="#ic-x"/></svg></button>
      <div class="cm-eyebrow">Stock check</div>
      <div class="cm-title">Ask production to confirm stock</div>
      <div class="cm-sub" id="sqSub"></div>
      <div class="cm-grid">
        <div class="cm-contacts">
          <span class="cm-clabel">Notify contacts to confirm availability</span>
          <div id="sqContacts"></div>
        </div>
        <div class="cm-field"><label>Colour</label><select id="sqColour"></select></div>
        <div class="cm-field"><label>Size / variant</label><select id="sqSize"></select></div>
        <div class="cm-field"><label>Quantity to reserve</label><input type="text" id="sqQty" readonly></div>
        <div class="cm-field full"><label>Notes</label><textarea id="sqNotes" placeholder="Anything to flag to production"></textarea></div>
      </div>
      <div class="cm-foot">
        <button class="cm-primary" id="sqSend"><svg class="icn"><use href="#ic-arrow"/></svg><span id="sqSendLbl">Send request</span></button>
        <button class="cm-cancel" data-close="1">Cancel</button>
      </div>`);
    sqRoot.querySelector('#sqSend').addEventListener('click', ()=>{
      if(sqSel.size===0) return; const o=sqCur;
      const list=(ML()?ML().contacts(o.supplierName):[]).filter(c=>sqSel.has(c.id));
      const out={ contacts:[...sqSel], contactNames:list.map(c=>c.name), colour:sqRoot.querySelector('#sqColour').value, size:sqRoot.querySelector('#sqSize').value, notes:sqRoot.querySelector('#sqNotes').value.trim() };
      close(sqRoot); if(o.onSend) o.onSend(out);
    });
  }
  function sqRenderContacts(){ const wrap=sqRoot.querySelector('#sqContacts'); const list=ML()?ML().contacts(sqCur.supplierName):[];
    wrap.innerHTML=list.map(c=>`<div class="cm-contact ${sqSel.has(c.id)?'on':''}" data-id="${c.id}"><span class="cm-check"><svg class="icn"><use href="#ic-check"/></svg></span><span class="cm-cinfo"><b>${c.name}</b><span>${c.role} \u00b7 ${c.email}</span></span></div>`).join('');
    wrap.querySelectorAll('.cm-contact').forEach(el=>el.addEventListener('click',()=>{ const id=el.dataset.id; if(sqSel.has(id))sqSel.delete(id);else sqSel.add(id); el.classList.toggle('on'); sqUpd(); }));
  }
  function sqUpd(){ const b=sqRoot.querySelector('#sqSend'),l=sqRoot.querySelector('#sqSendLbl'); b.disabled=sqSel.size===0; l.textContent=sqSel.size?`Send request to ${sqSel.size} contact${sqSel.size>1?'s':''}`:'Select a contact'; }
  function openStockReq(opts){
    if(!sqRoot) buildStockReq(); sqCur=opts; sqSel=new Set((opts.data&&opts.data.contacts)||[]);
    sqRoot.querySelector('#sqSub').innerHTML=`<b>${opts.productName}</b> \u00b7 ${opts.supplierName} \u00b7 confirm availability &amp; reservation.`;
    const col=sqRoot.querySelector('#sqColour'), sz=sqRoot.querySelector('#sqSize');
    col.innerHTML=(opts.colours||['Standard']).map(c=>`<option>${c}</option>`).join('');
    sz.innerHTML=(opts.sizes||['One size']).map(s=>`<option>${s}</option>`).join('');
    if(opts.data&&opts.data.colour) col.value=opts.data.colour;
    if(opts.data&&opts.data.size) sz.value=opts.data.size;
    sqRoot.querySelector('#sqQty').value=opts.qty!=null?(opts.qty+' units'):'';
    sqRoot.querySelector('#sqNotes').value=(opts.data&&opts.data.notes)||'';
    sqRenderContacts(); sqUpd(); open(sqRoot);
  }

  let srRoot=null, srCur=null, srAv=null;
  function buildStockReply(){
    srRoot=panel(`
      <button class="cm-x" data-close="1" aria-label="Close"><svg class="icn"><use href="#ic-x"/></svg></button>
      <div class="cm-eyebrow">Supplier enquiries \u00b7 stock response</div>
      <div class="cm-title">Can you supply &amp; reserve this stock?</div>
      <div class="cm-sub" id="srSub"></div>
      <div class="cm-grid">
        <div class="cm-field full"><label>Is this variant in stock?</label>
          <div class="cm-seg" id="srSeg"><button type="button" data-v="yes">Yes, in stock</button><button type="button" data-v="no">No, out of stock</button></div>
        </div>
        <div class="cm-when" id="srWhen">
          <div class="cm-field full"><label>We can reserve it until <span class="hint">date &amp; time</span></label><input type="datetime-local" id="srUntil"></div>
        </div>
        <div class="cm-note" id="srNoNote" style="display:none">We'll flag back to the distributor that this variant is out of stock.</div>
      </div>
      <div class="cm-foot"><button class="cm-primary green" id="srSubmit" disabled><svg class="icn"><use href="#ic-check"/></svg>Submit response</button><button class="cm-cancel" data-close="1">Cancel</button></div>`);
    srRoot.querySelectorAll('#srSeg button').forEach(b=>b.addEventListener('click',()=>{ srAv=b.dataset.v==='yes'; srRoot.querySelectorAll('#srSeg button').forEach(x=>x.classList.toggle('on',x===b)); srRoot.querySelector('#srWhen').classList.toggle('show',srAv); srRoot.querySelector('#srNoNote').style.display=srAv?'none':''; srRoot.querySelector('#srSubmit').disabled=false; }));
    srRoot.querySelector('#srSubmit').addEventListener('click',()=>{ if(srAv===null)return; const o=srCur; let r={available:srAv}; if(srAv){ const u=srRoot.querySelector('#srUntil').value; r.reservedUntilISO=u; r.reservedUntilDisplay=u&&ML()?ML().fmtDateTime(u,o.now):''; } close(srRoot); if(o.onReply)o.onReply(r); });
  }
  function openStockReply(opts){
    if(!srRoot) buildStockReply(); srCur=opts; srAv=null;
    srRoot.querySelector('#srSub').innerHTML=`<b>${opts.productName}</b> for ${opts.supplierName}${opts.variant?' \u00b7 '+opts.variant:''}`;
    srRoot.querySelectorAll('#srSeg button').forEach(x=>x.classList.remove('on'));
    srRoot.querySelector('#srWhen').classList.remove('show'); srRoot.querySelector('#srNoNote').style.display='none';
    srRoot.querySelector('#srSubmit').disabled=true;
    srRoot.querySelector('#srUntil').value=opts.suggestUntilISO||'';
    open(srRoot);
  }

  window.MSConfirm = { openRequest, openReply, openStockReq, openStockReply };
})();
