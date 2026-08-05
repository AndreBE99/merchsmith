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
