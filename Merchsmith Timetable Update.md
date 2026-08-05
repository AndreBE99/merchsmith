# Merchsmith — Timetable Update (July 2026)

*Prepared 10 July 2026, based on a full review of `merchsmith-backend`, `merchsmith-frontend`, and the `Merchsmith-Platform-Design` prototype/documentation.*

*Updated 14 July 2026 — Week 2's tail-closing tasks (Discounts UI, Branding settings tab, Neutral adapter cleanup) have shipped; see the status annotations below.*

---

## Part 1 — Recap: what's actually done vs. what's a stub

### May — Architecture (Organisations, Users, Invitations, Relationships, Security)
**Done.** This is the most mature part of the platform. Auth (Supabase JWT, tenant/permission guards), Organisations (full CRUD across distributor/customer/supplier types), Users & Roles, and Invitations (the single most-developed module — a 1,800+ line service covering send/accept/revoke, org-level and platform-level invite flows) are all solid, tested, and in active use by every other feature. No further work needed here beyond incidental fixes.

### June — Product Imports, Pricing Matrix, Store Built
**Done as of 14 July**, closing out the tail described below:
- **Product Imports**: CSV import (preview/validate/confirm) is solid. Live feed adapters exist and pull real data for **Mid-Ocean, PF Concept, and XD Connects**. **Xindao is the same supplier as XD Connects** (confirmed against the prototype's own supplier/feed references — "Xindao V7" is the feed format name, "XD Connects" the company) — no separate adapter was ever needed there. **Neutral** now reads real currency and dimensions columns and shares its column-lookup helpers with the other adapters, but its field aliases are still best-guess: **no real feed sample has been supplied yet**, so the OAuth2/API-key auth type and token endpoint remain unset. This is blocked on the supplier, not on engineering time.
- **Pricing Matrix**: The underlying model (quantity price breaks, per-distributor price overrides, markup bands) is built and tested on the backend, with a working **Markup & pricing UI**. **Discounts** now also has a full backend module (5-scope cascade: product > project > customer > category > sitewide) integrated into the price matrix, plus a working UI tab under distributor Settings.
- **Store Built**: The customer-facing store (browsing, filters, product pages) is genuinely built and working. Store *settings* (homepage builder) are done. Branding/decoration cost turned out to already be fully built — per-product decoration methods, positions and price breaks, both backend and frontend (the product editor's "Decoration & branding" tab), already feeding the price matrix. The distributor Settings page's "Branding" tab now points to that per-product editor instead of duplicating it, since there's no account-wide branding catalogue in the data model.

### Design-prototype status (for context, not a delivery item)
The separate `Merchsmith-Platform-Design` prototype (browser-only, no backend) is conceptually ahead of the real build — the Price Matrix, four-stage product modal (Design/Price/Sample/Stock), Design/Proof split, Branding Builder, and Supplier Connections flows are all fully worked out there and serve as the spec for what July/August need to build for real. It's a reference, not a substitute for the backend/frontend work below. Note: the Branding Builder concept (positions, print methods, live silhouette preview) is still only a static mock-up in the prototype — the real per-product decoration UI shipped is functionally complete but doesn't yet match that visual design.

---

## Part 2 — Updated Timetable (July Week 2 onward)

> Note on approach: Project Workflow's **backend** foundations (Projects/Briefs Prisma schema, full CRUD, permissions, activity logging) turned out to already exist, ahead of where this schedule expected them. The **frontend** is still a UI shell with demo data behind `ComingSoon` gates — that part of the original plan is unchanged.

### July

- **Week 2 — Done.** Neutral and Xindao/XD Connects feed adapters closed out (Xindao confirmed as the same supplier as XD Connects, already live; Neutral improved as far as possible without a real feed sample — blocked on the supplier). Discounts backend + UI built and shipped (Pricing Matrix UI item). Store settings tabs finalized. Branding settings tab resolved by pointing to the already-complete per-product decoration UI rather than building a duplicate account-wide catalogue. Project Workflow backend foundations (Projects/Briefs data model + CRUD) confirmed already built, ahead of schedule.
- **Week 3** — Project Workflow: Create Project wizard wired to the real backend, project list view, brief editor. Begin wiring the product modal's four stages (Design/Price/Sample/Stock) to real project/product records.
- **Week 4** — Project Workflow: complete the four-stage product modal end-to-end; build the Gallery view (card variant sharing the modal); add the collaborator/comment rail.
- **Week 5** *(spills into Aug Wk 1)* — Project Workflow polish and QA (status transitions, PDF project-sheet export — summary + detailed). Brand Assets: wire the existing (partial) Brand Assets feature into the product builder — currently a placeholder toast — so brand logos/colours/artwork flow into branding decisions.

### August

- **Week 1** — Brand Assets completion (carried from July): DAM-style asset selection fully wired into the branding builder flow.
- **Week 2** — Basket: cart data model, add-to-basket, quantity/qty-break combination handling.
- **Week 3** — Checkout flow; Order creation from basket; Finance groundwork (Stripe payment integration).
- **Week 4** — Order management (status tracking, order history views); begin Production Flow (studio/production status pipeline).

### September

- **Week 1** — Production Flow completion; begin Supplier Flow (fulfilment handoff, PO generation to suppliers).
- **Week 2** — Supplier Flow completion; begin Notifications (real in-app notifications replacing the current bell-icon stub).
- **Week 3** — Chat: real messaging (replacing the current "Coming Soon" shell).
- **Week 4** — Emails/Drafts (transactional templates beyond the existing auth emails); Org Settings completion (admin + distributor settings, closing remaining stubs).

### October

- **Week 1** — Integrations: Finance (Xero), Mailchimp; buffer for anything carried from September.
- **Week 2–3** — Subscriptions: real billing wired to Stripe (replacing the current fully static mock page).
- **Week 4** — UX improvement pass across everything built to date.

### November

- **Week 1–2** — Dashboards: real charting and aggregation endpoints (replacing the current hand-rolled mock chart).
- **Week 3–4** — Testing and fixing: QA pass across the full platform.

### December

- **Week 1–2** — Launch prep for Mojo (data migration, real client onboarding, final fixes).
- **Week 3–4** — Testing and improvements based on real-life usage with Mojo.

### January onwards

- Launch to other distributors.
- Begin Phase 2: Sustainability scoring (Evermerch), AI integrations.

---

## Net schedule impact

Week 2 closed out fully and on time, with the added confirmation that Project Workflow's backend was already further along than planned. That's a positive signal, but it doesn't change the bottleneck: Project Workflow's **frontend** (Weeks 3–5) is still the long pole, and Neutral's adapter is now blocked on the supplier providing a real feed sample rather than on engineering time — worth flagging to whoever owns that supplier relationship. Carrying the realistic July slip through unchanged, the original **December Mojo launch** target still moves to roughly **early-to-mid January** — about a 3–4 week slip overall, assuming no descoping and no additional parallel resourcing. Two levers to pull back time if the original December date matters:
1. **Parallelize** — start Basket/Checkout work in August in parallel with Project Workflow finishing, rather than sequentially, if there's capacity to split the team across the two streams.
2. **Descope** — trim Phase-1 launch scope (e.g. defer Chat or Subscriptions past the Mojo launch) so December stays a hard date for a smaller feature set, with the deferred items following shortly after.
