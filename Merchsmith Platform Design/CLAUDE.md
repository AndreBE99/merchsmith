# Merchsmith Platform — project notes

## Persistence reminder (RAISE THIS PROACTIVELY)
This prototype stores ALL data in the browser's localStorage (`ms-*` keys) — there is no backend.
When the user is about to do any of the following, REMIND them to **Download backup** first (Admin → Settings → Data backup):
- Sharing / exporting the platform to someone else → also point them to **"Copy embed"** so the export opens with their data baked in.
- Doing significant config they'd hate to lose (importing supplier feeds, building the curated range, editing store layout/categories).
- Any browser maintenance, switching devices, or before I do testing that touches localStorage.

Key facts to restate when relevant:
- Backup/restore lives in **Admin → Settings → Data backup** (`ms-data.js` / `window.MSDATA`).
- "Clear site data" CANNOT be blocked by any web page — backup is the only seatbelt.
- Data is per-browser, per-device; recipients of a shared export get the author's data ONLY if their browser has no Merchsmith data yet, and their edits never sync back.
- True shared/permanent persistence needs the backend (the "going-live" phase in HANDOVER.md).

## Source of truth
HANDOVER.md is the living architecture/status doc — keep it updated as work progresses.

## HARD RULE: update the Developer Index with every set of changes
After EVERY set of changes (every turn that edits the platform), add dated entries to `Merchsmith Developer Index.html` before ending the turn:
- Prepend `['YYYY-MM-DD','What changed']` (today's date, plain English) to the `h:[` history of each page affected, newest first.
- New pages get their own `{f,t,d,h}` entry in the right category; retired pages get a "Retired / superseded" entry (don't delete them).
- Changes to shared files (sidebar.js, chrome.js, theme.js, people.js etc.) are logged on the pages where the change is visible.
- Do this alongside the HANDOVER.md update. No exceptions, including small fixes.
