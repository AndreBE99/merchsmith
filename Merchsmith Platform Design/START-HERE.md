# START HERE — Merchsmith Platform (new-chat handover)

_Written 2 Jul 2026 for a fresh Claude picking up this project. Read this first, then `HANDOVER.md` for the full architecture/status log._

## What this is
**Merchsmith** — a B2B promotional-merchandise SaaS platform, built as a **no-framework, hand-authored HTML/CSS/JS prototype** (vanilla JS, no build step, no React). Three audiences / surfaces:
- **Platform Admin** (the SaaS operator = "Merchsmith") — `Merchsmith Admin.html`
- **Distributor** (e.g. "Mojo Promotions") — store, settings, projects
- **Customer** (e.g. "Citrix") — store product pages, project collaboration

There is **no backend**. All state is `localStorage` (`ms-*` keys), per-browser. See `CLAUDE.md` for the persistence/backup rules — raise backup proactively before risky actions.

## How to work in it
- Edit the `.js` / `.html` files directly. Scripts are loaded with `?v=N` cache-busters in the HTML `<head>`/footer — **bump the version when you change a JS file** or the change won't show.
- Verify by opening the relevant HTML with the preview tools; check console for errors. Many panels render on nav-click and on load.
- **Keep `HANDOVER.md` updated** as you complete work — it's the living source of truth and is very detailed (append notes in the same style).
- Prefer small targeted edits (`str_replace_edit`) over rewrites.

## Key files / entry points
- `Merchsmith Admin.html` — operator admin (directory, suppliers, curated range, store layout, settings). Loads `admin-*.js`.
- `Merchsmith Store.html` + `store-page.js` — the storefront + product page (customer + distributor views).
- `Merchsmith Project - Autumn Giveaways.html` — the flagship project workspace (brief, product candidates, statuses, downloads).
- `Merchsmith Field Mapping Reference.html` — the canonical **product data model** (57 fields / 12 groups) + supplier feed docs + store-preview.
- Data seeds: `admin-data.js` (distributors/suppliers/team), `store-feed.js` (store products), `catalogue-data.js` (`MSCAT` shared catalogue), `store-structure.js` (taxonomy).
- Feed importer: `feed-adapters.js` (`MSFEED`) + `admin-import.js` (wizard).
- Scope/mode plumbing: `ms-mode.js` (blank vs seeded), `theme.js` (colourways, scope-aware), `ms-data.js` (`MSDATA` backup/restore).

## Current state (what's DONE)
- **Multi-feed import**: real adapters for **PF Concept** (3-feed JSON) and **Xoopar** (Akeneo `values{}`, EUR→GBP), plus **Bio Labs** CSV path. Import wizard (upload→detect→map→preview→ingest) genuinely parses real files. **Neutral + Xindao** are detect-only STUBS (deferred — see below).
- **Field Mapping Reference**: canonical master list, supplier filter, editable value-maps, store-preview overlay, build-queue → "add to Distributor view".
- **Distributor view** on the product page: all canonical fields grouped, "Not supplied" fallbacks, image thumbnails, full price matrix.
- **Blank-slate / go-live**: reversible `ms-mode.js` — Admin → Settings → "Reset platform to empty" (keeps taxonomy + 1 distributor + 3 supplier shells; suppresses seed data, nothing deleted). "Restore demo data" reverts.
- **PDF downloads**: project **summary sheet** (A3 portrait grid) + **detailed sheet** (`Merchsmith Project Sheet (Detailed).html`, one product per A3 landscape page — visual left, details/status right). Both from the project's "More actions" menu.
- **Branding scope fix**: Platform-Admin logo (`ms-platform-logo`) and colourway (`ms-platform-theme`, via `window.MS_SCOPE='platform'`) are now SEPARATE from the distributor's `ms-brand-logo`/`ms-theme`.
- **Standalone export** exists: `Merchsmith Admin (Standalone).html` (offline single-file).

## Outstanding / next (from HANDOVER.md §3)
1. **Neutral + Xindao feed adapters** — DEFERRED by user; demo uses PF Concept + Xoopar + Bio Labs. Build when sample feeds arrive (shapes already documented on the Field Mapping page).
2. **"Hand over to account manager"** — the missing stage linking customer ideation → distributor quote/proof/order workflow (biggest functional gap).
3. **Store onto `MSCAT`** — the store still reads `store-feed.js`; wiring it to the shared catalogue makes real imports shoppable.
4. **Brand Assets → Product Builder** wiring; **Brief → Builder** seeding.
5. **More PDF outputs** — proof sheets, order confirmations, price sheets (project sheets done).
6. **Going live** (needs real backend): Stripe, Xero, live API feeds, shared persistence.
7. Roles/permissions enforcement; supplier discontinued-on-disconnect; misc `#` placeholder links.

## Gotchas
- Bump `?v=N` on changed JS or edits won't load.
- Product images from suppliers are external URLs — many 404 → letter-tile fallbacks (not a bug).
- Two data layers: hardcoded JS seed (regenerates on load) vs `localStorage` runtime data — clearing storage alone won't remove seed; use blank mode.
- localStorage is per-browser/per-file; shared/standalone copies start from baked-in data and edits don't sync back.
