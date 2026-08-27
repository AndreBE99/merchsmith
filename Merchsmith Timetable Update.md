# Merchsmith — Timetable Update (August 2026)

*Prepared 10 July 2026, based on a full review of `merchsmith-backend`, `merchsmith-frontend`, and the `Merchsmith-Platform-Design` prototype/documentation.*

*Updated 14 July 2026 — Week 2's tail-closing tasks (Discounts UI, Branding settings tab, Neutral adapter cleanup) have shipped; see the status annotations below.*

*Updated 20 August 2026 — full re-review of both repos' commit history since 14 July. Substantially more has shipped than the last update captured, including an unplanned architecture rework of the whole feed-import system. Dates below are being tracked loosely per the user's direction ("vamos atrasados") — the point of this update is to re-anchor what's actually done and name the next immediate piece of work, not to re-litigate the calendar.*

---

## Part 1 — Recap: what's actually done vs. what's a stub

### May — Architecture (Organisations, Users, Invitations, Relationships, Security)
**Done.** No change since last update — still solid, tested, in active use.

### June/July — Product Imports, Pricing Matrix, Store, Catalogue globalization
**Done, and then substantially reworked.** What was true on 14 July (Mid-Ocean/PF Concept/XD Connects adapters live, Neutral blocked on a feed sample, Pricing Matrix + Discounts + Store shipped) has since been superseded:
- **Feed engine rebuilt from the ground up (10 Aug).** The five hardcoded per-supplier adapters (generic, Mid-Ocean, Neutral, PF Concept, XD Connects) were **replaced by a single `ConfigurableFeedAdapter`** driven entirely by settings — field mapping, flattening of nested arrays, and value transforms are now configuration, not code. This changes the Neutral story: it's no longer a code-blocked adapter, it's a config that can be built the moment a real feed sample shows up, and building it takes hours not a dev cycle.
- **AI assistants for feed setup (19 Aug).** A shared `AiProviderService` now backs a feed-mapping assistant and a connection assistant that can hand off connection-level fixes to each other — meaningfully lowers the effort of onboarding any new supplier feed, including Neutral once a sample arrives.
- **Scale/reliability pass (31 Jul – 20 Aug).** Feed sync moved to an optional SQS queue for concurrent supplier syncs; batched DB writes and caching cut per-product round trips (~70 sequential queries → batched `createMany`); memory/OOM fixes for large catalogues; sync-lock and dedupe fixes for concurrent syncs; body-size and price-preview bug fixes shipped as late as 20 Aug.
- **Catalogue globalized (22–28 Jul).** Products, store layout, curated range, and file assets moved from per-distributor-environment scoping to one shared canonical catalogue, with per-tenant audit trails preserved on the originating feed config. Subcategory-level keyword mapping replaced department-level mapping.
- **Admin/org tooling.** Admin org activation (set-password flow for admins), resend-invitation flows, org edit modals, distributor-preview mode (platform admin can simulate any distributor's store view), and a full interactive Sample Cost simulator (fixed price / supplier quote request-response / free) all shipped 31 Jul–1 Aug.

### Project Workflow — shell built, builder internals still stubbed
This is the big correction to the last update. As of 14 July the plan still treated Project Workflow frontend as "Weeks 3–5, not started." In fact:
- **Backend** (confirmed already done in the last update) — Projects/Briefs schema, full CRUD, permissions, activity log, plus **collaborators, comments/reads, and supplier-facing delivery confirmations** (22 Jul) — is complete and ahead of where any version of this plan expected it.
- **Frontend shipped a real shell** (22 Jul): projects list, distributor board view, new-project flow, and a project detail page with all four builder tabs (Price/Sample/Stock/Product) plus a comments drawer and collaborator control. A supplier-facing `/supplier/deliveries` portal also shipped.
- **But the builders' actual logic is still `ComingSoon` stubs**, confirmed by grepping the current code: price/discount resolution and per-country delivery cost inside `PriceBuilder`; sample cost editing and supplier quote requests inside `SampleBuilder`; supplier stock-check requests and variant tagging inside `StockBuilder`; variant/position/artwork selection inside `ProductBuilder`; plus board-level sorting, filtering, bulk selection, flagging, and PDF export. The shell is real, the wiring to the pricing matrix/discounts/sample-cost backend pieces (which themselves already exist) is not done yet.

### Still fully unbuilt
- **Basket/Checkout/Order/Finance**: confirmed **zero backend module** exists (no cart, order, or payment models found in `merchsmith-backend`). `SampleBuilder`'s "add to basket" is a stub referencing this gap directly.
- **Chat**: still a full `ComingSoon` shell (messaging, chat settings).
- **Notifications**: still a `ComingSoon` stub behind the bell icon.
- **Brand Assets**: unchanged from last update — still a placeholder toast in the product builder.

### Design-prototype status (for context, not a delivery item)
Unchanged from last update — the `Merchsmith-Platform-Design` prototype remains the visual/UX spec for the Price Matrix, four-stage product modal, Branding Builder, and Supplier Connections flows, not a substitute for the real build.

---

## Part 2 — Updated Timetable (from now, 20 August, onward)

> Dates are being tracked loosely per the user's direction — we're behind the original calendar and re-planning around actual dependencies rather than the original week numbers. What follows is ordered by what genuinely unblocks the next thing, not by a fixed date grid.

### Immediate next development: wire the Project Workflow builders to the backend that already exists

This is the highest-leverage next step, for one reason: almost everything the four builders need (`PriceBuilder`, `SampleBuilder`, `StockBuilder`, `ProductBuilder`) is **already built on the backend** — the pricing matrix, the 5-scope discount cascade, the sample-cost simulator logic (already fully working standalone on the store product page), and stock/variant data. The work left is wiring, not new modeling:
1. **PriceBuilder** — replace the `ComingSoon` stubs with real calls into the existing price-matrix/discount-resolution endpoints; per-country delivery cost is the one piece with no backend model yet and needs scoping.
2. **SampleBuilder** — reuse the interactive sample-cost UI/logic already shipped on the store product detail page (fixed price / supplier quote / free) instead of rebuilding it inside the project context.
3. **StockBuilder** — wire supplier stock-check requests and variant tagging to the existing product/variant/stock data.
4. **ProductBuilder** — wire variant/position/artwork selection to the existing decoration-methods/positions data already feeding the price matrix elsewhere.
5. Board-level polish (sorting, filtering, bulk selection, flagging, PDF export) comes after the four builders work end-to-end — it's UI-only and lower risk to sequence last.

### After Project Workflow builders are wired

- **Brand Assets**: wire the existing (partial) feature into the product builder — currently a placeholder toast — so brand logos/colours/artwork flow into branding decisions. Unchanged from the last plan; still not started.
- **Basket/Checkout/Order/Finance**: this remains the largest genuinely-unbuilt piece of the platform — no backend module exists at all. Sequence: cart data model + add-to-basket + qty-break handling → checkout flow → order creation from basket → Stripe payment integration → order management (status tracking, history views).
  - **Downstream dependency confirmed 25 Aug** (during the Distributor Dashboard stability fix): three of the Distributor Dashboard's KPI cards cannot be wired to real data until this module exists, because they aggregate over *realized orders*, not quotes/projects:
    - **Margin** — needs actual cost vs. sell price on a placed Order line, not the quoted/approved price on a `project_line_items` row (a quote can be approved and never ordered, or the order's terms can differ from the last quote).
    - **Quote-to-Order** — a conversion rate: (# of `project_line_items` reaching `price_approval_status = 'approved'`) → (# that became a real Order). The numerator already exists (`price-engine`); the denominator does not until Orders exist.
    - **Order Volume** — a per-period count/value of real Orders. No Order model, so no volume to count.
  - Until then, the Distributor Dashboard shows these three as `ComingSoon` rather than mock numbers. The other two dashboard cards (**Active Projects**, **Upcoming Deadlines**) are being wired to real `features/projects`/`project-line-items` data as part of this same fix, since they only need data that already exists.
- **Production Flow**: studio/production status pipeline, after Order management.
- **Supplier Flow**: fulfilment handoff, PO generation to suppliers, after Production Flow.
- **Notifications**: replace the current bell-icon stub with real in-app notifications.
- **Chat**: replace the current "Coming Soon" shell with real messaging.
- **Emails/Drafts, Org Settings completion**: transactional templates beyond existing auth emails; close remaining admin/distributor settings stubs.

### Later

- **Integrations**: Finance (Xero), Mailchimp.
- **Subscriptions**: real billing wired to Stripe (replacing the current fully static mock page).
- **UX improvement pass** across everything built to date.
- **Dashboards**: real charting and aggregation endpoints for the order-dependent Distributor Dashboard cards (Margin, Quote-to-Order, Order Volume — see the Basket/Checkout/Order/Finance entry above for why these specifically wait on that module) plus the Platform Admin dashboard's own mock charts.
- **Testing and fixing**: QA pass across the full platform.
- **Launch prep for Mojo**: data migration, real client onboarding, final fixes; then testing/improvements based on real-life Mojo usage.
- **Launch to other distributors**; begin Phase 2 (Sustainability scoring / Evermerch, AI integrations).

---

## Net schedule impact

Since 14 July, the feed-import system got a bigger rework than planned (a full architecture change to a configurable engine plus AI mapping assistants) alongside genuine progress on Project Workflow's frontend shell — more got built than the last update captured, but not the specific things this plan expected next, and the things that were expected (wiring the builders' internals, Basket/Checkout/Order) haven't started. Per the user's direction we're not re-deriving a launch date off the calendar right now — the useful output is the corrected picture above and the immediate next step: **wire the Project Workflow builders (Price/Sample/Stock/Product) to the pricing-matrix, discount, and sample-cost logic that already exists on the backend**, since that's pure wiring against already-built pieces and unblocks the most UI surface for the least new backend work. Basket/Checkout/Order/Finance remains the largest fully-unbuilt piece of the platform and is the next major body of new work after that.
