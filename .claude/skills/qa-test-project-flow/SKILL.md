---
name: qa-test-project-flow
description: End-to-end QA of the Merchsmith order lifecycle (customer project -> quote approval -> basket -> checkout -> distributor -> supplier -> delivery) using fresh QA persona accounts added to admin@platform.com's profile switcher, then a consolidated report of gaps, bugs and observations. Use when the user asks to "validate the full flow", "test the whole project/order flow", "QA end to end", "probar el flujo completo", or invokes /qa-test-project-flow.
---

# qa-test-project-flow

Replays the full user-facing lifecycle as three real roles (customer, distributor, supplier) without logging in/out: the platform admin acts as each one through the **persona switcher** (see memory `dev-profile-switcher`). Ends with a prioritised findings report. Do not fix anything while testing; fixes come after the report, only when the user asks.

Reply in the user's language (this project's user writes Spanish). Local app: frontend `localhost:3000`, backend `localhost:3001`, both normally already running. This is the user's own dev app, so entering test data, accepting its T&Cs and placing test orders is in scope; nothing leaves the dev DB.

## 0. Confirm scope (one short question at most)

Default scope = the happy path that was validated before: **unbranded** products, pay on account, 3 products, one supplier (XD Connects, relationship already approved with Test Distributor / env "Dev Distributor"). Only ask if the user hints at a variant: **branded products** (adds Design/Visual/Proof/Sample/Stock, never exercised yet), pay-now (Stripe test mode), several suppliers, split delivery, credit notes/cancellation.

## 1. Accounts (step 1 of the request)

Reuse the existing QA personas unless the scenario needs something different (another org, another role such as `customer.buyer`, `distributor.account_manager`). They are listed in memory `qa-accounts-global-supplier`. Never use the legacy `admin@customer.com`/`admin@distributor.com`/`admin@supplier.com` unless the user says so.

To list orgs/users and pick `like` references, or to create new personas:

```bash
cd merchsmith-backend
doppler run -p merchsmith-backend -c dev -- env NODE_PATH=$PWD/node_modules node ../.claude/skills/qa-test-project-flow/scripts/qa-accounts.js            # list
doppler run -p merchsmith-backend -c dev -- env NODE_PATH=$PWD/node_modules node ../.claude/skills/qa-test-project-flow/scripts/qa-accounts.js '[{"alias":"QA Customer 2","email":"qa.customer2@testcustomer.test","name":"QA Customer 2","like":"qa.customer@testcustomer.test"}]'
```

Run these with the sandbox disabled (they need Google network access). The script creates the Identity Platform user (random password, never shown), the `users` row, membership + roles (or `user_roles` for global suppliers) and appends the alias to `admin@platform.com`'s `dev_persona_accounts`. It is idempotent. Reading the DB directly: use `scripts/db.js` (Cloud SQL connector); the proxy on :5433 is unreliable. Avoid `information_schema` columns of type `name` (cast to text) and full-table scans of `activity_logs` (hangs).

Rules the script encodes (don't rediscover them): a global supplier org (`distributor_environment_id IS NULL`) cannot have a membership; its users have env NULL and the role in `user_roles`. The backend `AuthGuard` must then select the org from `users.organisation_id`; if a supplier login shows "No distributor environment selected" on `/orders`, check that block still exists in `merchsmith-backend/src/auth/auth.guard.ts`.

## 2. Run the flow (step 2)

Use the built-in browser (`mcp__Claude_Browser__*`). Record an observation the moment something looks off; don't wait for the end.

### Browser mechanics (all learned from failures)
- **Switching profile:** avatar button top-right (`user menu`) -> list under "Switch profile". The menu renders ~3 s late. Always: click avatar, `wait 3`, screenshot, click the profile, `wait 10`, then `navigate` to the target URL. A click before it renders lands on another profile (this switched to Platform Admin once).
- Prefer `read_page`/`find` refs, but a ref click sometimes does nothing in this UI; after any state-changing click **verify** (screenshot, `read_network_requests` for the POST, or the DB). Note the UI often needs a reload to show the new state.
- Dialogs: `form_input` for text/date fields (typing into `<input type=date>` is ignored); then click the dialog's button by ref.
- File inputs: the built-in browser cannot open a file chooser. Inject a File with `javascript_tool` (`DataTransfer` + `change` event) and say in the report that the upload was synthetic.
- Scroll with `scroll_to` on a ref; `scroll_amount` max is 10.
- Verify real state in the DB when the UI is ambiguous (e.g. `project_line_items.price_approval_status`, `status_*`).

### Stages and URLs

| # | Role | Action | Where |
|---|------|--------|-------|
| 1 | Customer | Create project: name, occasion, brief -> budget, qty, delivery date, destination -> brand colours -> "Choose exact product" and add 3 products from the store (search "notebook", "bottle") -> Create | `/projects/new` |
| 2 | Distributor | Per product: open project -> Price -> **Submit for approval** | `/projects/<slug>` |
| 3 | Customer | Per product: Price -> **Approve price**. Also exercise **Request changes** on one product (then Distributor: **Resubmit**; Customer approves) | same |
| 4 | Customer | Approved price -> **Add to basket** (each product) | project, then `/basket` |
| 5 | Customer | Basket: "Deliver everything to one address" -> Continue -> Finance: PO number (required for on-account), tick T&Cs -> Place order on account -> acknowledge modal -> Place order | `/basket`, `/checkout` |
| 6 | Distributor | Order page: per line **Check & send** to supplier | `/orders/<MS-ref>` |
| 7 | Supplier | Per line **Upload acknowledgement** (reference + dispatch date; the file is **required**, the button stays disabled without it) | `/orders/<MS-ref>` |
| 8 | Distributor | Per line **Check acknowledgement** (the 4 points start unanswered; answer each Yes/No/NA), then **Confirm - no proof needed** (unbranded). Branded: **Upload proof** (on behalf of the supplier, check the `on behalf of` trail text) -> **Check proof** (tick the 3 checks) -> Checked & confirmed | same |
| 9 | Supplier | Per line **Start production**, then **Add tracking** (carrier + number) | same |
| 10 | Supplier | **Send invoice** for the PO (number, total, file required) | same |
| 11 | Distributor | Per line **Mark delivered** (Received by) | same |
| 12 | Any | Final check: order status Delivered n/n, customer invoices generated, supplier cost/margin, order shows in each role's list | `/orders`, order page |

Branded items were run once (2026-10-21, MS-1017): Design is its own stage before Price. Distributor adds a branding position (custom position, method, colours), artwork and a position visual (Brand Assets picker), **Start visual** -> **Submit for approval**; customer ticks "I have checked the visual and approve it" and Submit ONCE (after approval a *Request changes* link takes the Submit button's place: a second click reopens the visual). Checkout shows a branded-goods notice dialog instead of a second terms tick.

Not yet exercised, add when scope allows: Sample and Stock steps and their approvals, supplier invoice approval, customer invoice payment / Finance, notifications and emails (must respect private mode), project state after delivery, chat/comments, cancellation/credit notes, pay-now.

### What to look for at every step
- Does the UI confirm the action? Does the status chip/list update without a reload?
- Does each role see exactly what it should, and nothing it shouldn't (e.g. customer never sees cost/margin or supplier date)?
- Console errors, 4xx/5xx in `read_network_requests` (note endpoint + status), slow loads.
- Required data silently missing but flow continues (variants, dates, files, reference numbers).
- Numbers: prices, VAT (20%), totals, credit limit, margin, PO value vs supplier cost, invoice sums.
- Permissions: is the right role able to do each action? Can another role do it unexpectedly?
- Dead ends needing a workaround (page that never loads, button with no effect).

### Gotchas
- DB: the order reference column is `orders.ref` (`orders.reference` is the customer's reference); `order_lines.branding` is a summary string and `order_lines.variants` is empty unless colours are chosen in the basket.
- Dev DB is shared (`max_connections` 50); a leftover second `nest start --watch` causes `EADDRINUSE`. Run a single `pnpm start:dev` and keep `PRISMA_CONNECTION_LIMIT=4`.
- Dialog buttons that animate shut can swallow a click that arrives too early: screenshot/wait before the next click, and verify with `read_network_requests`.

## 3. Report (step 3)

End with one consolidated message (and only then offer next steps). Structure:

1. **Run summary**: accounts used, scenario, order/project references created, what completed, what was not covered.
2. **Confirmed bugs**: what happened, where (URL/endpoint), evidence (status code, DB value, screenshot).
3. **Flow gaps / omissions**: the system allows something it probably shouldn't, or a step is missing.
4. **UX observations**: missing feedback, stale state, confusing labels.
5. **Not validated / open risks**: say plainly what was skipped, simulated (e.g. injected file) or unverified.
6. **Environment notes** that affect testing.
7. **Suggested priority** (impact on a real user first), and test data left behind (project slug, order ref, invoices).

Be honest about confidence: mark each item *confirmed* (reproduced / seen in DB or network) or *suspected*. Don't pad the list; omit things that worked.

Offer to open the top items as separate sessions only after the report. If the user asks for a persistent copy, publish it as a doc/artifact on request, not by default.

## Housekeeping
- Leave the verification state as is at the end (no cleanup navigation, no switching back); see memory `feedback-leave-verification-state`.
- Created data stays in the dev DB; list it in the report. Never delete test data without being asked.
- If you changed code to unblock the test (like the guard fix), say so explicitly, leave it uncommitted and flag it.
- Never run full supplier feed syncs (memory `feedback-limit-sync-scope`).
