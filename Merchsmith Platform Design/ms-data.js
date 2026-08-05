/* ============================================================
   ms-data.js — data portability for the Merchsmith prototype.
   - Backup ALL ms-* localStorage keys to a JSON file
   - Restore from that file (recovers a "clear site data" wipe)
   - Snapshot helper used by exports so a shared HTML opens with
     the author's configured data baked in.

   window.MSDATA:
     keys()            → the ms-* keys we manage
     snapshot()        → { "ms-…": value, … } of current data
     download(name?)   → save snapshot as a .json file
     restore(obj,opts) → write a snapshot back into localStorage
     pickFile()        → open file dialog, restore on choose
     applyEmbedded()   → on first run, seed from window.__MS_SNAPSHOT__

   EXPORT SNAPSHOT: a bundled HTML can include
       <script>window.__MS_SNAPSHOT__ = { … };</script>
   and call MSDATA.applyEmbedded() — recipients with no saved
   data get the author's data; their own edits are never clobbered.
   ============================================================ */
window.MSDATA = (function(){
  // every key the platform persists (extend here if new ones appear)
  const KEYS=[
    'ms-store-structure','ms-curated-range','ms-dist-range','ms-ingested-products',
    'ms-project-brief','ms-project-title','ms-platform-settings','ms-brand-assets',
    'ms-dash-state-v4','ms-theme','ms-identity','ms-lead-times','ms-store-home','ms-prodtbl','ms-dept-overrides','ms-product-overrides','ms-product-reviews','ms-dist-projects'
  ];
  function keys(){ return KEYS.slice(); }
  // also sweep any other ms-* key actually present, so nothing is missed
  function allPresentKeys(){ const s=new Set(KEYS); for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&/^ms-/.test(k)) s.add(k); } return [...s]; }

  function snapshot(){ const o={}; allPresentKeys().forEach(k=>{ const v=localStorage.getItem(k); if(v!=null&&v!=='') o[k]=v; }); return o; }

  function download(name){
    const data=JSON.stringify({ _merchsmith_backup:true, savedAt:new Date().toISOString(), data:snapshot() }, null, 2);
    const blob=new Blob([data],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=(name||'merchsmith-backup-'+new Date().toISOString().slice(0,10))+'.json';
    document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },100);
  }

  // restore: opts.merge=false (default) overwrites; opts.merge=true only fills missing keys
  function restore(payload, opts){
    opts=opts||{}; const data=(payload&&payload.data)?payload.data:payload; if(!data||typeof data!=='object') return 0;
    let n=0; Object.keys(data).forEach(k=>{ if(!/^ms-/.test(k)) return; if(opts.merge && localStorage.getItem(k)!=null) return; try{ localStorage.setItem(k, data[k]); n++; }catch(e){} });
    return n;
  }

  function pickFile(cb){
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const rd=new FileReader();
      rd.onload=()=>{ try{ const payload=JSON.parse(rd.result); const n=restore(payload,{merge:false}); cb&&cb(n,null); }catch(e){ cb&&cb(0,e); } };
      rd.readAsText(f); };
    inp.click();
  }

  // first-run seed from an embedded snapshot baked into an exported HTML
  function applyEmbedded(){
    const snap=window.__MS_SNAPSHOT__; if(!snap||typeof snap!=='object') return false;
    // only seed if this browser has no Merchsmith data yet (don't clobber a real user)
    const fresh=!allPresentKeys().some(k=>localStorage.getItem(k));
    if(!fresh) return false;
    return restore(snap,{merge:true})>0;
  }

  return { keys, snapshot, download, restore, pickFile, applyEmbedded, _allKeys:allPresentKeys };
})();
// auto-apply any embedded snapshot as early as possible
try{ MSDATA.applyEmbedded(); }catch(e){}
