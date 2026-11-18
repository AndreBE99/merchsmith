/* po-lines.js — one product per purchase order (Oct 2026).
   Converts every order in ms-order-ops to per-line POs on load: x.lpo[lineIndex] = {no:'PO-<ref>-<nn>', sentAt, invoice, dropInv, cx}.
   Same rules as order-detail.js ops(): sentAt carried from the old supplier PO (x.pos[supplier]); a shared supplier invoice is split evenly (no/1, no/2…).
   Load after order-data.js. Supplier of a line: window.__odSupOf when order-detail.js is loaded, else line.supplier. */
window.MSPOL=window.MSPOL||(function(){
  const KEY='ms-order-ops';
  const supOf=l=>(window.__odSupOf?window.__odSupOf(l):(l&&(l.supOv||l.supplier)))||'Supplier';
  const pno=(o,i)=>String(o.ref||'').replace('MS-','PO-')+'-'+String(i+1).padStart(2,'0');
  function convert(o,x){ if(!x||!o) return false; let ch=false; x.pos=x.pos||{};
    if(!x.lpo){ x.lpo={}; const by={}; (o.lines||[]).forEach((l,i)=>{ (by[supOf(l)]=by[supOf(l)]||[]).push(i); });
      (o.lines||[]).forEach((l,i)=>{ const sp=x.pos[supOf(l)]||{}, peers=by[supOf(l)]||[i], k=peers.indexOf(i);
        const inv=sp.invoice?Object.assign({},sp.invoice,peers.length>1?{no:sp.invoice.no+'/'+(k+1),amount:Math.round(sp.invoice.amount/peers.length*100)/100,split:sp.invoice.no}:{}):null, di={};
        Object.entries(sp.dropInv||{}).forEach(([kk,v])=>{ if(+kk.split(':')[0]===i) di[kk]=v; });
        x.lpo[i]={no:pno(o,i),sentAt:sp.sentAt||null,invoice:inv,dropInv:di,cx:sp.cx||null}; }); ch=true; }
    (o.lines||[]).forEach((l,i)=>{ if(!x.lpo[i]){ x.lpo[i]={no:pno(o,i),sentAt:null,invoice:null,dropInv:{}}; ch=true; } });
    return ch; }
  function migrate(){ let A; try{ A=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return; } const O=(window.MSOrders&&MSOrders.getOrders&&MSOrders.getOrders())||[]; let ch=false;
    O.forEach(o=>{ if(A[o.id]&&convert(o,A[o.id])) ch=true; }); if(ch) try{ localStorage.setItem(KEY,JSON.stringify(A)); }catch(e){} }
  migrate(); if(!(window.MSOrders&&MSOrders.getOrders)) document.addEventListener('DOMContentLoaded',migrate);
  return {convert,migrate,pno};
})();
