/* ============================================================
   store-feed.js — normalised product feed for the Merchsmith Store.

   PRODUCTION NOTE
   ---------------
   In production this object is produced by an adapter that joins XD
   Connects' five JSON feeds on itemCode/modelCode:
     • Products      → id, name, category, colours, images, dimensions…
     • ProductPrices → priceBreaks[]            (blank cost by qty)
     • PrintData     → printMethods[], positions (branding builder)
     • PrintPrices   → method setup + per-colour cost by qty
     • Stock         → stock levels + incoming
   The Store UI only ever reads THIS normalised shape, so swapping the
   mock for the live adapter is a back-end change with no UI impact.

   window.STORE = { departments:[…], products:[…] }
   ============================================================ */
window.STORE = (function(){
  // Synced image filenames (without .png) live here — the back-end adds names as it
  // syncs from the XD Connects feed/FTP into assets/products/. Listed names render as
  // real images in the Store; anything not listed shows a drag-drop slot.
  const assets = ['bags','clothing','desk','drinkware','outdoor','notebooks','lifestyle','exhibition','tech','writing'];
  // departments mirror the live "Essentials" structure
  const departments = [
    { id:'bags',     name:'Bags',      img:'bags' },
    { id:'clothing', name:'Clothing',  img:'clothing' },
    { id:'desk',     name:'Desk',      img:'desk' },
    { id:'drinkware',name:'Drinkware', img:'drinkware' },
    { id:'exhibition',name:'Exhibition',img:'exhibition' },
    { id:'lifestyle',name:'Lifestyle', img:'lifestyle' },
    { id:'notebooks',name:'Notebooks', img:'notebooks' },
    { id:'outdoor',  name:'Outdoor',   img:'outdoor' },
    { id:'tech',     name:'Tech',      img:'tech' },
    { id:'writing',  name:'Writing',   img:'writing' }
  ];

  // qty-break helper
  const breaks = (a) => a.map(([q,unit])=>({q,unit}));

  const products = [
    { id:'mp34576', model:'Xoopar', name:'Eco Wheat-Straw Charging Cable',
      dept:'tech', cat:'Charging', brand:'Xoopar', supplier:'Lumen Supplies',
      blurb:'Five-connector eco charging cable in wheat-straw bio-plastic, digitally printed in full colour.',
      priceGuide:6.30, priceGuideQty:250, moq:50, lead:10, sustainability:9, new:false, recommended:true,
      colours:['Volcanic Black','Aqua Blue','Green','Grey','White'],
      sizes:['One size'], dims:{w:'80mm',h:'120mm',d:'10mm'}, material:'Wheat-straw bio-plastic',
      img:'cable',
      priceBreaks:breaks([[50,9.40],[250,7.95],[500,5.20],[1000,3.85],[2500,3.15],[5000,2.45]]),
      printMethods:['screenprint','transfer','dtf'] },
    { id:'lm-pen-03', model:'Prodir DS8', name:'Prodir Ds8 True Biotic Pen',
      dept:'writing', cat:'Premium Pens', brand:'Prodir', supplier:'Lumen Supplies',
      blurb:'Swiss-made biodegradable pen, full-colour clip and barrel branding.',
      priceGuide:1.24, priceGuideQty:500, moq:250, lead:12, sustainability:8, new:true, recommended:true,
      colours:['White','Blue','Black'], sizes:['One size'], dims:{w:'12mm',h:'140mm',d:'12mm'}, material:'Biodegradable polymer',
      img:'pen', priceBreaks:breaks([[250,1.20],[500,0.94],[1000,0.71],[2500,0.63],[5000,0.55]]),
      printMethods:['pad','screenprint'] },
    { id:'bw-tote-01', model:'GRS Tote', name:'Recycled Cotton Tote',
      dept:'bags', cat:'Shoppers', brand:'BagWorks', supplier:'BagWorks UK',
      blurb:'GRS-certified recycled cotton shopper, generous print area front & back.',
      priceGuide:1.62, priceGuideQty:1000, moq:100, lead:6, sustainability:9, new:false, recommended:true,
      colours:['Natural','Black'], sizes:['Standard','Large'], dims:{w:'380mm',h:'420mm',d:'—'}, material:'100% recycled cotton',
      img:'tote', priceBreaks:breaks([[100,3.10],[250,2.40],[500,1.95],[1000,1.62],[2500,1.38]]),
      printMethods:['screenprint','dtf','transfer','embroidery'] },
    { id:'gs-seed-02', model:'Sprout', name:'Seed Pencil Set',
      dept:'writing', cat:'Pencils', brand:'Sprout', supplier:'GreenStock',
      blurb:'Plantable pencils that grow into herbs & flowers — set of six.',
      priceGuide:3.40, priceGuideQty:250, moq:100, lead:10, sustainability:10, new:false, recommended:false,
      colours:['Natural'], sizes:['Set of 6'], dims:{w:'90mm',h:'190mm',d:'15mm'}, material:'FSC cedar, seed capsule',
      img:'pencil', priceBreaks:breaks([[100,3.40],[250,2.80],[500,2.45],[1000,2.10]]),
      printMethods:['laser'] },
    { id:'lm-cork-05', model:'Cork', name:'Cork Cover Notebook (2024)',
      dept:'notebooks', cat:'Notebooks', brand:'Lumen', supplier:'Lumen Supplies',
      blurb:'A5 notebook with natural cork cover and recycled paper stock.',
      priceGuide:3.20, priceGuideQty:500, moq:100, lead:8, sustainability:8, new:false, recommended:true,
      colours:['Cork'], sizes:['A5'], dims:{w:'148mm',h:'210mm',d:'14mm'}, material:'Cork, recycled paper',
      img:'notebook', priceBreaks:breaks([[100,4.20],[250,3.80],[500,3.20],[1000,2.78]]),
      printMethods:['laser','screenprint'] },
    { id:'gs-garden-01', model:'Desktop', name:'Desktop Garden',
      dept:'desk', cat:'Plants', brand:'GreenStock', supplier:'GreenStock',
      blurb:'Made-to-order desktop planter with seed kit — a living desk gift.',
      priceGuide:5.20, priceGuideQty:250, moq:100, lead:20, sustainability:9, new:true, recommended:false,
      colours:['Terracotta'], sizes:['One size'], dims:{w:'120mm',h:'90mm',d:'120mm'}, material:'Recycled terracotta',
      img:'garden', priceBreaks:breaks([[100,6.80],[250,5.90],[500,5.20]]),
      printMethods:['dtf'] },
    { id:'xp-mouse', model:'Pokket', name:'Xoopar Pokket Wireless Mouse',
      dept:'tech', cat:'Desktop', brand:'Xoopar', supplier:'Lumen Supplies',
      blurb:'Slimline recycled-plastic wireless mouse with full-colour top print.',
      priceGuide:9.60, priceGuideQty:250, moq:50, lead:12, sustainability:7, new:false, recommended:false,
      colours:['Black','White'], sizes:['One size'], dims:{w:'95mm',h:'58mm',d:'28mm'}, material:'Recycled ABS',
      img:'mouse', priceBreaks:breaks([[50,14.20],[250,12.10],[500,10.90],[1000,9.60],[2500,8.80]]),
      printMethods:['pad','dtf'] },
    { id:'tech-bag', model:'Traveller', name:'Tech Travel Bag',
      dept:'bags', cat:'Tech bags', brand:'BagWorks', supplier:'BagWorks UK',
      blurb:'Padded organiser for cables & devices, embroidered or printed.',
      priceGuide:14.50, priceGuideQty:250, moq:50, lead:9, sustainability:7, new:false, recommended:false,
      colours:['Charcoal','Navy'], sizes:['One size'], dims:{w:'300mm',h:'400mm',d:'120mm'}, material:'rPET',
      img:'bag', priceBreaks:breaks([[100,18.40],[250,16.20],[500,14.50],[1000,12.90]]),
      printMethods:['embroidery','transfer','screenprint'] },
    { id:'rpet-pouch', model:'Pouch', name:'RPET Document Pouch',
      dept:'desk', cat:'Folders', brand:'Lumen', supplier:'Lumen Supplies',
      blurb:'Water-resistant recycled-PET document pouch in A4 or A5.',
      priceGuide:4.10, priceGuideQty:500, moq:100, lead:8, sustainability:8, new:false, recommended:false,
      colours:['Black','Grey'], sizes:['A5','A4'], dims:{w:'250mm',h:'180mm',d:'15mm'}, material:'rPET',
      img:'pouch', priceBreaks:breaks([[100,5.40],[250,4.70],[500,4.10],[1000,3.60]]),
      printMethods:['screenprint','dtf'] },
    { id:'hoton-a5', model:'Hoton', name:'Hoton A5 Kraft Paper Notebook',
      dept:'notebooks', cat:'Notebooks', brand:'Hoton', supplier:'BagWorks UK',
      blurb:'Kraft-cover notebook, recycled pages, screenprinted cover.',
      priceGuide:2.10, priceGuideQty:500, moq:100, lead:15, sustainability:8, new:false, recommended:false,
      colours:['Kraft'], sizes:['A5'], dims:{w:'148mm',h:'210mm',d:'12mm'}, material:'Kraft board, recycled paper',
      img:'notebook', priceBreaks:breaks([[100,2.80],[250,2.40],[500,2.10],[1000,1.85]]),
      printMethods:['screenprint','dtf'] },
    { id:'hw-tee', model:'Classic', name:'Heavy Weight T-Shirt',
      dept:'clothing', cat:'T-Shirts', brand:'Continental', supplier:'PrintHouse Studio',
      blurb:'240gsm organic cotton tee, ethically made, full colour print.',
      priceGuide:7.20, priceGuideQty:250, moq:25, lead:7, sustainability:8, new:false, recommended:true,
      colours:['Grey','Dark Blue','Black','Aqua','Light grey','White'],
      sizes:['X-Small','Small','Medium','Large','X-Large','XX-Large'], dims:{w:'—',h:'—',d:'—'}, material:'240gsm organic cotton',
      img:'tshirt', priceBreaks:breaks([[25,9.20],[100,8.10],[250,7.20],[500,6.40],[1000,5.80]]),
      printMethods:['screenprint','dtf','embroidery'] },
    { id:'yeti-cup', model:'Rambler', name:'Insulated Steel Cup',
      dept:'drinkware', cat:'Cups', brand:'YETI', supplier:'Lumen Supplies',
      blurb:'Double-wall stainless cup, laser-engraved branding.',
      priceGuide:18.90, priceGuideQty:100, moq:25, lead:14, sustainability:6, new:false, recommended:false,
      colours:['Stone','Black','Sea Blue'], sizes:['350ml'], dims:{w:'90mm',h:'110mm',d:'90mm'}, material:'Stainless steel',
      img:'cup', priceBreaks:breaks([[25,22.40],[100,18.90],[250,16.50],[500,14.80]]),
      printMethods:['laser'] },
    { id:'bamboo-brush', model:'Jungle', name:'Bamboo Toothbrush Set',
      dept:'lifestyle', cat:'Wellness', brand:'Jungle Culture', supplier:'GreenStock',
      blurb:'Plastic-free bamboo brushes in recycled card sleeve.',
      priceGuide:2.80, priceGuideQty:250, moq:100, lead:12, sustainability:10, new:true, recommended:false,
      colours:['Natural'], sizes:['Set of 4'], dims:{w:'40mm',h:'190mm',d:'30mm'}, material:'Bamboo',
      img:'lifestyle', priceBreaks:breaks([[100,3.40],[250,2.80],[500,2.45]]),
      printMethods:['laser'] },
    { id:'lanyard', model:'Boost', name:'Recycled Lanyard',
      dept:'exhibition', cat:'Lanyards', brand:'Boost', supplier:'PrintHouse Studio',
      blurb:'rPET lanyard with safety breakaway, full-colour dye-sub print.',
      priceGuide:1.10, priceGuideQty:500, moq:100, lead:7, sustainability:8, new:false, recommended:false,
      colours:['Aqua','Black','Navy'], sizes:['15mm','20mm'], dims:{w:'900mm',h:'20mm',d:'—'}, material:'rPET',
      img:'exhibition', priceBreaks:breaks([[100,1.60],[250,1.30],[500,1.10],[1000,0.92]]),
      printMethods:['dtf','transfer'] },
    { id:'umbrella', model:'Storm', name:'Recycled Golf Umbrella',
      dept:'outdoor', cat:'Umbrellas', brand:'FARE', supplier:'Lumen Supplies',
      blurb:'Storm-proof golf umbrella, rPET canopy, panel print.',
      priceGuide:12.40, priceGuideQty:100, moq:25, lead:14, sustainability:7, new:false, recommended:false,
      colours:['Navy','Black','Multi'], sizes:['One size'], dims:{w:'1300mm',h:'980mm',d:'—'}, material:'rPET canopy',
      img:'outdoor', priceBreaks:breaks([[25,15.90],[100,12.40],[250,10.80]]),
      printMethods:['transfer','screenprint'] }
  ];

  return { departments, products:(window.MSMODE&&MSMODE.isBlank())?[]:products, assets };
})();
