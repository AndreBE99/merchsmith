# Supplier feed schemas — parser reference

Durable notes on the real feed shapes (captured from uploaded samples). Drives `feed-adapters.js`.

## PF Concept — 3 feeds, joined on `itemcode`

Nested 4-deep. Product = `modelcode`+`description`; variant = `itemcode`. All GBP.

### 1. Price feed — `PFCPriceFeed`
```
PFCPriceFeed.priceInfo[0].models[0].model[]            // one per product
  modelcode, description
  items[0].item[]                                       // one per variant
    itemcode
    groupDesc        // numeric category code (see GROUP_DESC below)
    currency         // "GBP"
    clearance        // "" or "C" (clearance/discounted)
    decoCharge       // CSV of printCodes e.g. "MR04,DTF02,TRA04" → join to print feed
    minDecoQty       // "25" min decoration order qty
    scales[0].scale[]   // qty-break COST table
      priceBar       // qty threshold (1,50,100,250,500,1000,2500…)
      nettPrice      // supplier COST/unit (flat across bars usually — it's the buy price)
      industryCol    // RRP/sell reference (decreases with volume)
    promotion[]      // optional: standardPrice = the "was" price (clearance/promo)
```

### 2. Print-price feed — `PFCPrintpricefeed`  (the decoration cost book)
```
PFCPrintpricefeed.decoCharges.decoCharge[]
  printCode          // "DTF02","DRD03","DEB01"… matches decoCharge CSV in price feed
  impMethod          // human name e.g. "DTF Transfer 2", "Digital round drinkware 3"
  LTMCharge          // less-than-minimum charge
  priceDependence    // "None" | "Size"
  logoSizes[0].logoSize[]
    logoSizeCm2      // 0 if None; else 100/300/500/750 size bands
    itemCodeId
    amountColors[0].amountColor[]
      amountColorsId // "Full color" | "1" | "2" … (colour count)
      amountSetupCharges[0].amountSetupCharge[]
        setupCharge  // one-off origination £
        decoPrices[0].decoPrice[]
          decoPriceFromQty  // "1","50","100"… run-cost break
          price             // per-unit decoration cost at that break
```
**Decoration cost @ qty Q** = `setupCharge` (one-off) + `price-at-break(Q) × Q` (run). For `Size` dependence pick the logoSize band; for colour pick amountColors entry.

### 3. Stock feed — `PFCStockFeed`
```
PFCStockFeed.stockFeed[0].models[0].model[]
  modelCode, description
  items[0].item[]
    itemCode
    stockDirect      // available now
    stockNextPo      // incoming qty on next PO
    stockDateNextPo  // ISO date (or null = none)
    StockFuture      // further-out incoming
    stockLocation    // "UK" | "PL"  → lead time (UK ~5d, PL ~10d)
```

### GROUP_DESC numeric → department
- `0103` cooler bags → Bags · `0104` waterproof bags → Bags
- `0406` blankets/plaid → Outdoor · `0707` poncho → Outdoor
- `0410` sunglasses/wristbands → Lifestyle
- `0801` insulated tumblers/mugs → Drinkware
- `0803` water/sport bottles → Drinkware · `0804` glass bottles → Drinkware
- `0805` ceramic mugs → Drinkware

### printCode prefix → platform method (6: screenprint/pad/transfer/dtf/embroidery/laser)
- `D3D* DOM* DPRINT* DPP* DHTS* DPS* DST* DRD* SUBM*` → **dtf** (digital)
- `DTF*` → **dtf** (size-dependent)
- `TRA* MR*` → **transfer**
- `PAD*` → **pad**
- `EMB*` → **embroidery**
- `DEB* GPE* LAS* LASR*` → **laser** (engrave/deboss family)

### PF Concept gaps (no product attributes in these 3 feeds)
No colour/material/size/name beyond `description`, no images. A separate **product feed** would carry those — not provided. So PF Concept imports as **cost + decoration + stock** joined on itemcode; name from `description`, dept from `groupDesc`, methods from `decoCharge`.

---

## Bio Labs — CSV (WooCommerce), flat. Already wired (`admin-import.js`). See Field Mapping Reference.
## Neutral / Xindao / Xoopar — JSON. Awaiting sample files. Shapes documented in Field Mapping Reference.
