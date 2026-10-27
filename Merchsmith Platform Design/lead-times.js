/* Merchsmith — shared lead-time + supplier registry.
   Used by the product views (Dashboard / Gallery) AND the Suppliers settings page.
   Persists to localStorage so settings made on one page reflect everywhere.

   window.MSLead exposes:
     NOW                              app "today" (Date)
     globalLieu() / setGlobalLieu(n)  default days-in-lieu (working days)
     lieuFor(supplierName)            effective lieu for a supplier (override or global)
     setSupplierLieu(name, n|null)    per-supplier override (null = use global)
     all()                            { supplierName: {lieu, contacts:[...]} }
     supplier(name) / contacts(name)
     addContact(name, {name,email})   -> returns the new contact
     custLead(supLeadDays, name)      supplier lead + lieu  (working days)
     addWorkingDays(date, n) / subWorkingDays(date, n)
     fmtDate(date)                    -> "Fri. 10th Oct"
     fmtDateTime(iso, NOW)            -> "Thu. 9th Oct, 17:00"
     save()
*/
window.MSLead = (function(){
  const LS = 'ms-suppliers-v1';
  const NOW = new Date(2025,9,9,12,0); // Thu 9 Oct 2025, 12:00

  const DEFAULT = {
    globalLieu: 3,
    suppliers: {
      'Veloce Print': { lieu:null, contacts:[
        {id:'vp1', name:'Marco Bellini', email:'marco@veloceprint.it', role:'Account manager'},
        {id:'vp2', name:'Sofia Conti',   email:'sofia@veloceprint.it', role:'Production'}
      ]},
      'GreenStock': { lieu:null, contacts:[
        {id:'gs1', name:'Lena Fischer', email:'lena@greenstock.de', role:'Account manager'},
        {id:'gs2', name:'Tomas Vogel',  email:'tomas@greenstock.de', role:'Logistics'}
      ]},
      'Lumen Goods': { lieu:2, contacts:[
        {id:'lg1', name:'Priya Nair',  email:'priya@lumengoods.co', role:'Account manager'},
        {id:'lg2', name:'Dan Okafor',  email:'dan@lumengoods.co',   role:'Sampling'}
      ]}
    }
  };

  let data = load();
  function load(){
    try{ const s=JSON.parse(localStorage.getItem(LS)); if(s && s.suppliers) return s; }catch(e){}
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  function save(){ try{ localStorage.setItem(LS, JSON.stringify(data)); }catch(e){} }

  const globalLieu = ()=> data.globalLieu;
  function setGlobalLieu(n){ data.globalLieu = Math.max(0, n|0); save(); }
  function supplier(name){ return data.suppliers[name]; }
  function all(){ return data.suppliers; }
  function lieuFor(name){ const s=data.suppliers[name]; return (s && s.lieu!=null) ? s.lieu : data.globalLieu; }
  function setSupplierLieu(name, n){ const s=data.suppliers[name]; if(s){ s.lieu = (n==null||n==='') ? null : Math.max(0,n|0); save(); } }
  function contacts(name){ return ((data.suppliers[name]||{}).contacts)||[]; }
  function addContact(name, c){
    const s=data.suppliers[name]; if(!s) return null;
    const id = (name.replace(/\W/g,'').slice(0,2).toLowerCase()||'c') + Date.now().toString(36).slice(-4);
    const nc = {id, name:c.name, email:c.email||'', role:c.role||'Contact'};
    s.contacts.push(nc); save(); return nc;
  }
  const custLead = (supLeadDays, name)=> (supLeadDays|0) + lieuFor(name);

  function addWorkingDays(date, n){ const d=new Date(date); let a=0; while(a<n){ d.setDate(d.getDate()+1); const w=d.getDay(); if(w!==0&&w!==6) a++; } return d; }
  function subWorkingDays(date, n){ const d=new Date(date); let s=0; while(s<n){ d.setDate(d.getDate()-1); const w=d.getDay(); if(w!==0&&w!==6) s++; } return d; }
  // subtract working HOURS (working day = 09:00–17:00, 8 hrs). Used for the customer's 0.5-working-day-earlier deadline.
  function subWorkingHours(date, hours){
    const START=9, END=17; let d=new Date(date);
    const wk=()=>{ while(d.getDay()===0||d.getDay()===6){ d.setDate(d.getDate()-1); d.setHours(END,0,0,0); } };
    wk(); let h=d.getHours()+d.getMinutes()/60; if(h>END){ d.setHours(END,0,0,0); } else if(h<START){ d.setDate(d.getDate()-1); d.setHours(END,0,0,0); wk(); }
    let rem=hours;
    while(rem>1e-9){ h=d.getHours()+d.getMinutes()/60; const avail=h-START; if(rem<=avail+1e-9){ d=new Date(d.getTime()-rem*3600000); rem=0; } else { rem-=avail; d.setDate(d.getDate()-1); d.setHours(END,0,0,0); wk(); } }
    return d;
  }

  const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ord = n => { const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
  function fmtDate(d){ d=new Date(d); return `${WD[d.getDay()]}. ${ord(d.getDate())} ${MON[d.getMonth()]}`; }
  function fmtDateTime(iso, now){
    const d=new Date(iso); if(isNaN(d)) return '';
    const same = now && d.toDateString()===now.toDateString();
    const day = same ? 'Today' : fmtDate(d);
    const hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
    return `${day}, ${hh}:${mm}`;
  }
  // Date -> "YYYY-MM-DD" for <input type=date>
  function isoDate(d){ d=new Date(d); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

  // sample lead times: supplier side per supplier (defaults 1 unbranded / 7 branded),
  // customer side account-wide (defaults 3 / 10 working days, Distributor Settings → Lead times)
  const SMP_SUP={unbranded:1,branded:7}, SMP_CUST={unbranded:3,branded:10};
  function supSampleLead(name,type){ const s=data.suppliers[name], k=type==='branded'?'smpB':'smpU'; return (s&&s[k]!=null)?s[k]:SMP_SUP[type==='branded'?'branded':'unbranded']; }
  function supSampleIsDefault(name,type){ const s=data.suppliers[name]; return !(s&&s[type==='branded'?'smpB':'smpU']!=null); }
  function setSupSampleLead(name,type,n){ data.suppliers[name]=data.suppliers[name]||{lieu:null,contacts:[]}; data.suppliers[name][type==='branded'?'smpB':'smpU']=(n==null?null:Math.max(0,n|0)); save(); }
  function custSampleLead(type){ const c=data.custSample||{}; const k=type==='branded'?'branded':'unbranded'; return c[k]!=null?c[k]:SMP_CUST[k]; }
  function setCustSampleLead(type,n){ data.custSample=data.custSample||{}; data.custSample[type==='branded'?'branded':'unbranded']=Math.max(0,n|0); save(); }
  return { NOW, globalLieu, supSampleLead, supSampleIsDefault, setSupSampleLead, custSampleLead, setCustSampleLead, SMP_SUP, SMP_CUST, setGlobalLieu, supplier, all, lieuFor, setSupplierLieu, contacts, addContact,
           custLead, addWorkingDays, subWorkingDays, subWorkingHours, fmtDate, fmtDateTime, isoDate, save, reload:()=>{data=load();} };
})();
