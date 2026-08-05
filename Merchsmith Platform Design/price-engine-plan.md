# Price engine — build spec (approved)

Concept: "Price Matrix Concept.html". Wire into the modal **Price tab** behind a **"Show price table"** button under the slider.

## Cost matrix (supplier, distributor-only)
- Per product: unbranded item cost by qty break (50,100,250,500,1000,2500,5000,10000,20000), plus per-method decoration cost by break, rows per print-colour count, + setup charge (per colour or flat).
- Quantity between breaks → use **closest break below** (unit price AND delivery).

## Cost → customer unit sell price
- total cost = (item + decoration)·qty + setup  (setup INSIDE total cost)
- markup = band for total cost (bands keyed on TOTAL cost). Bands: £0→2.20, £60→2.00, £100→1.74, £150→1.67, £250→1.56, £300→1.54, £400→1.49, £500→1.45, £600→1.41, £700→1.39, £800→1.38, £900→1.37, £1000→1.36. Distributor-editable.
- **Min profit floor: £60 only** (smallest band); no floor above.
- total sell = total cost × markup;  unit sell = total sell ÷ qty (setup absorbed into unit, not a line).
- Distributor profit = total sell − total cost (show profit total + per unit, distributor-only).
- Customer sees unit sell price + delivery only. Matrix/markup/profit are distributor-only.

## Delivery (separate line)
- supplierDelivery(qty) scales with qty (closest break below).
- charged = round(supplierDelivery × 1.25) to nearest £/$. Separate from unit price.

## Discounts (distributor) — reduce sell price + profit
- Levels: site-wide, category, per-customer, per-project, per-product. Per-product is a **percentage**.
- Site-wide + category set in Distributor settings; per-customer in customer org; per-project on project; per-product on line.
- Resolution: per-product → per-project → per-customer → category → site-wide (most specific wins; confirm combine vs override at build).

## Locked prices (distributor override)
- Lock specific COSTS for a chosen branding (position+method+colours) across a selected qty window (e.g. 100–1000). Inside window → locked cost overrides matrix; outside → matrix.

## Customer price-break savings table
- Shown UNDER customer prices only. One row for the EXACT branding chosen (position·method·colours).
- Columns: qty, unit price, line total, you save/unit, you save (vs smallest break). No distributor figures.

## Build stages
1. Seed cost matrix + markup bands + delivery breaks per product (data).
2. Price engine fns: pickBreak(closest-below), totalCost, markupFor, unitSell, deliveryCharge, profit.
3. Price tab: live unit price from engine; "Show price table" button → matrix modal (distributor) / savings table (customer).
4. Discounts model + Distributor settings UI (site/category) + per project/product/customer.
5. Locked prices UI + override in engine.
6. Mirror Dashboard↔Gallery; Status/Dev notes update.
