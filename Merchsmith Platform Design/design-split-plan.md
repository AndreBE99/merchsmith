# Design Split + Modal Updates — build plan

## APPROVED: Visual + Proof split (concept in "Design Split Concept.html")

Design becomes TWO stages, each its own approval cycle with independent versioning.

### Decisions (from user)
1. **Visual always required** (cannot skip).
2. **Proof can begin before visual approval** — but the **Order** option must NOT appear until BOTH visual and proof are approved.
3. Visual approval **gates the order** (see #2).
4. **Independent versioning** (Visual vN, Proof vN) — but the studio must **choose which visual version a proof version is paired with**.

### Status vocabulary (shared by both stages)
- `notstarted` — not begun. Cust: "—" ; Dist: "Start visual/proof"
- `withstudio` — studio producing. Cust: "With studio" ; Dist: "Submit for approval"
- `infoneeded` — studio BLOCKED, needs info from customer BEFORE producing. Cust: **"Give feedback"** ; Dist: "Awaiting customer info". (This is the reworked "feedback" — NOT an approval.)
- `awaiting` — artefact produced, needs sign-off. Cust: **"Approve visual/proof"** ; Dist: "Awaiting customer"
- `changes` — customer rejected → back to studio (new version). Cust: "Changes requested" ; Dist: "Revise & resubmit"
- `approved` — signed off.
- `unbranded` — proof n/a (visual still applies? — treat whole Design as unbranded/no-proof).

### Roll-up (dashboard table + rail "Design")
- Show the ACTIVE stage: Visual while in flight, then Proof.
- Per-artefact tag: `Visual vN` / `Proof vN`.
- Design "done" only when **Proof approved** (or unbranded).
- Order gate: needs Visual approved AND Proof approved (or unbranded) + Price approved + Stock instock + delivery ready.

### Modal Design area = Option A (two stacked rows: Visual + Proof), each with status + inline action + its own preview/approve.

## DEFERRED modal updates (apply AFTER split is in):
a) Design section:
- Remove product-colour & branding summary (proof covers these).
- Proof popout: branding colour swatches + PMS per print colour, under each position.
- Visual takes majority of space, proof bar underneath.
- Remove "to-scale technical drawing..." warning from proof bar.
- Don't show "Awaiting Approval" label in proof bar — put the "Review & Approve" action there instead.
- Visual images: add back scroll buttons.
- Proof images: zoom to full window, keep scroll while zoomed.
- Design "not started": placeholder "Visual not started" in visual area; proof bar says "not started".
b) General:
- Page-pager (prev/next) to bottom-right of modal, more subtle.
- Rail: editable Quantity; add total price (like dashboard).
- Rail: full delivery date info + cycle (as table).
- Rail: add order deadline (the deadchip under the main status icon).
- Comments button in modal does not work — wire to window.__openComments(p).
2) Statuses: "Give Feedback" = studio lacks info to produce proof; don't show "feedback required" on proof modal at Approve Design phase.
3) Dashboard: Design action "ver.1" tag (not "Rev1"); ver.1 shows once there's a proof to approve; update Status Reference notes.

## Files
- product-modal.js — Design body (two-row), proof viewer, data model (visual+proof states & versions per product)
- product-modal.css — styles
- Merchsmith Dashboard.html + Merchsmith Gallery.html — actions seed (split design state), roll-up, order gate, rail
- Merchsmith Status Reference.html — reworked Design statuses + visual/proof
