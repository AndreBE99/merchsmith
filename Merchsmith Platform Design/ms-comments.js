/* ============================================================
   ms-comments.js — shared comment store across the platform.
   Every comment spot (project cards, org pane, product modal)
   writes here; the Chats "Comments & mentions" tab reads it.
   Persists to localStorage('ms-comments').
   A comment: { id, author, role, text, ts, ctxType, ctxLabel,
                deepLink, mine, mentions:[] }
   ============================================================ */
(function(){
  if(window.MSComments) return;
  const KEY='ms-comments';
  const ME='Jess Doyle';

  const SEED=[
    { id:'c1', author:'Cara Lyon', role:'Account Manager', text:'Proof for the Tote is back from studio — needs your sign-off.', ts:Date.now()-2*3600e3,
      ctxType:'proof', ctxLabel:'Proof v2 · Recycled Cotton Tote · Autumn Giveaways', deepLink:'Merchsmith Project - Autumn Giveaways.html', mine:false, mentions:[ME] },
    { id:'c2', author:'Jess Doyle', role:'Admin', text:'Tech Travel Bag delivery is critical for the 15th — flagged with supplier.', ts:Date.now()-26*3600e3,
      ctxType:'project', ctxLabel:'Autumn Giveaways', deepLink:'Merchsmith Project - Autumn Giveaways.html', mine:true, mentions:[] },
    { id:'c3', author:'Sara Kemp', role:'Buyer · Northwind', text:'Can we get an eco alternative quote for the next run? @Jess Doyle', ts:Date.now()-3*24*3600e3,
      ctxType:'org', ctxLabel:'Northwind Ltd', deepLink:'Merchsmith Organisations.html#tab=customers', mine:false, mentions:[ME] },
    { id:'c4', author:'Jess Doyle', role:'Admin', text:'Reliable on lead times — good go-to for tote blanks.', ts:Date.now()-4*24*3600e3,
      ctxType:'org', ctxLabel:'BagWorks UK', deepLink:'Merchsmith Organisations.html#tab=suppliers', mine:true, mentions:[] },
    { id:'c5', author:'Raf Price', role:'Studio', text:'Uploaded the Wheat Straw mouse artwork to v2 — @Jess Doyle take a look.', ts:Date.now()-90*60e3,
      ctxType:'proof', ctxLabel:'Visual v2 · Xoopar Mouse · Autumn Giveaways', deepLink:'Merchsmith Project - Autumn Giveaways.html', mine:false, mentions:[ME] }
  ];

  function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v)&&v.length?v:SEED.slice(); }catch(e){ return SEED.slice(); } }
  function save(list){ try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){} }
  let LIST=load();

  function all(){ return LIST.slice().sort((a,b)=>b.ts-a.ts); }
  function mine(){ return all().filter(c=>c.mine); }
  function mentions(){ return all().filter(c=>!c.mine && (c.mentions||[]).includes(ME)); }
  function add(c){
    const item=Object.assign({ id:'c'+Date.now(), author:ME, role:'Admin', ts:Date.now(), mine:true, mentions:[], ctxType:'note', ctxLabel:'', deepLink:'#' }, c);
    LIST.push(item); save(LIST);
    try{ window.dispatchEvent(new CustomEvent('ms-comments-change')); }catch(e){}
    return item;
  }
  function unreadMentions(){ return mentions().length; }
  function relTime(ts){ const s=(Date.now()-ts)/1000; if(s<60)return 'now'; if(s<3600)return Math.floor(s/60)+'m'; if(s<86400)return Math.floor(s/3600)+'h'; const d=Math.floor(s/86400); return d===1?'Yesterday':d+'d'; }

  window.MSComments={ all, mine, mentions, add, unreadMentions, relTime, me:ME };
})();
