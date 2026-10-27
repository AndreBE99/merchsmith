---
name: check-updates-from-reference
description: Compares the newest version of the design reference ("Merchsmith Platform Design/") against the last version already reviewed, reads the dated change history in "Merchsmith Developer Index.html" (default window - last 7 days), and produces a clear, detailed, prioritised task list to implement those changes in the real system (merchsmith-backend / merchsmith-frontend). The list lives in a persistent checklist file that is updated as tasks are completed so it can be handed to new sessions. Trigger - /check-updates-from-reference [period], e.g. "/check-updates-from-reference", "/check-updates-from-reference 14d", "/check-updates-from-reference desde 2026-09-15". Also use when the user says "revisa qué cambió en la referencia", "qué hay nuevo en el diseño", "actualiza la lista de tareas de la referencia".
---

Reply to the user in Spanish. Everything written to the task file is also in Spanish (identifiers, file names and code stay as-is).

## Paths

- Reference folder: `/Users/AndreBE99/Codes/Merchsmith/Merchsmith Platform Design/` (called REF below). It is tracked by the umbrella repo (root `/Users/AndreBE99/Codes/Merchsmith`); the user periodically replaces its contents with a newer export.
- Change log source: `REF/Merchsmith Developer Index.html`. Each page has `h:[['YYYY-MM-DD','change'], …]` (newest first) inside `const CATS=[…]`. Page keys: `f` file, `t` title, `d` description, `badge`.
- Persistent task list: `/Users/AndreBE99/Codes/Merchsmith/REFERENCE-UPDATES-TODO.md` (TODO file below). This is the deliverable and the handoff artefact.
- Real system: `merchsmith-backend/`, `merchsmith-frontend/` (submodules). Read `REF/CLAUDE.md`, `REF/START-HERE.md`, `REF/HANDOVER.md` and the project memory index for conventions before mapping tasks.

## Step 0 - Parse the period

Argument is optional. Default: **7 days back from today** (use the real current date, `date +%F`). Accept `Nd`, `Nw`, "desde YYYY-MM-DD", or "desde el último check". The special value "desde el último check" (also the automatic choice if the TODO file has a `Último check` date and the user gave no period) uses that date instead of 7 days. State the resolved window (`from` → `to`) in the first line of your answer.

## Step 1 - Load the current TODO file

If it exists, read it fully. Keep every open task and its state; you will merge into it, never overwrite blindly. Note the `Último check` date, the `Baseline` commit and the list of already-completed items (to avoid re-adding them).

## Step 2 - Collect changes (three independent sources, cross-check them)

1. **Developer Index history (primary).** Extract with a script (node or python, put it in the scratchpad) all `h` entries with date >= `from`, per page: file, title, date, text. Also flag pages that are new (an "Initial build." entry inside the window) and pages whose `badge`/description changed. Do not rely on eyeballing the HTML.
2. **File diff vs last reviewed version.** Baseline = `Baseline` commit in the TODO file, else `HEAD`. Run `git status --short -- "Merchsmith Platform Design"` and `git diff --stat <baseline> -- "Merchsmith Platform Design"` from the repo root. Classify files: added / deleted / renamed / modified. For every modified file relevant to a change-log entry, read `git diff` (skip `.thumbnail`, binaries, and pure whitespace/format churn; use `-w` and `--ignore-blank-lines` first to see if a file really changed). Prefer targeted reads; for very large diffs delegate per-file analysis to an Explore/general-purpose subagent and keep only the conclusion.
3. **Docs.** Diff `HANDOVER.md`, `START-HERE.md`, `CLAUDE.md`, and any spec pages (Field Mapping Reference, Product Feed Spec, Status Reference, Org and User Model, Recommended Standard, Site Map, Emails, Notifications) - these define contract-level changes (data model, statuses, roles, emails) that are easy to miss in UI-only logs.

Reconcile: a log entry with no matching file change (or vice versa) is a finding - mark it "sin evidencia en diff" or "cambio no documentado en el índice" and still include it, with lower confidence noted.

## Step 3 - Understand each change in depth

For every change, open the relevant REF file(s) and read the actual behaviour (JS logic, data shapes, localStorage keys `ms-*`, statuses, copy, layout tokens). Then inspect the real system to establish the delta:

- Find the corresponding real module/route/component/model (use graphify `graphify-out/` if present, Serena or grep). Determine one of: **ya implementado**, **parcial**, **no existe**, **contradice lo implementado** (reference changed a decision).
- Identify layers touched: DB schema/migration, API/service, feed adapters, permissions/roles, emails/notifications, frontend page/component, design tokens, seeds/fixtures, tests, docs.
- Honour project memory rules when writing tasks: new columns on existing models break watch-mode dev until migrated (prefer new tables, call out migration steps); every new email path must respect platform `private_mode_enabled`; DB access goes through Prisma `postgres` role and RLS is enabled on all tables (new tables need RLS); never trigger unbounded supplier syncs when verifying (cap 5-10 products); distributor-scoped data (tags, overrides, discounts) stays per-distributor; check the existing `distributor_product_overrides` guards before writing there.
- Do NOT modify REF or the real system in this skill. It is read-only analysis plus writing the TODO file.

## Step 4 - Build the task list

Each task is one implementable unit (a session should be able to finish it). Fields:

```
- [ ] T-014 · <verbo + resultado corto> · Prioridad P0|P1|P2 · Tamaño S|M|L
  - Origen: <fecha> · <página de la referencia> · <entrada del changelog / archivo diff>
  - Cambio en la referencia: <qué hace ahora, concreto: comportamiento, campos, estados, copy>
  - Estado en el sistema real: ya implementado | parcial | no existe | contradice — <dónde: ruta de archivo>
  - Trabajo a hacer: <backend / frontend / DB / emails / tests, en viñetas, con rutas probables>
  - Dependencias: <T-ids> · Riesgos/notas: <migraciones, private mode, RLS, permisos, datos>
  - Criterio de hecho: <cómo verificar; cuando aplique, verificación en navegador con datos acotados>
```

Rules:
- Task ids are stable and never reused; continue numbering from the highest id in the file.
- Group by area (Storefront, Proyectos, Admin, Ajustes, Feeds/Datos, Emails/Notificaciones, Layout/Tokens, Docs/Specs) and order by priority inside each group. P0 = data model/contract changes and blockers for other tasks; P1 = functional features; P2 = visual polish/copy.
- Merge duplicates: several log entries on the same feature become one task with all sources listed. If a later entry supersedes an earlier one, implement only the final behaviour and mention the superseded one.
- Purely cosmetic reference-only changes (prototype tooling, thumbnails, concept pages with no real-system counterpart) go in a short section "Sin acción (solo prototipo)" with the reason, not as tasks.
- If something is ambiguous or the reference contradicts the real system's deliberate decision, create a task of type **Decisión** ("Decidir: …") with the options, instead of guessing.
- Existing open tasks: if the new analysis shows one is now obsolete, superseded or already done, move it to Completadas / Descartadas with a note; never silently delete.

## Step 5 - Write / update the TODO file

Structure of `REFERENCE-UPDATES-TODO.md`:

```
# Reference updates → sistema real
> Fuente: Merchsmith Platform Design/ · Índice: Merchsmith Developer Index.html
> Último check: YYYY-MM-DD · Ventana analizada: from → to · Baseline: <commit corto> 
> Cómo usar: ver "Handoff" al final. Al terminar una tarea, moverla a Completadas.

## Resumen ejecutivo
<5-10 líneas: qué cambió globalmente, mayores impactos, riesgos, qué hacer primero>

## Tareas abiertas
### <Área>
- [ ] T-…

## Decisiones pendientes
## Sin acción (solo prototipo)
## Completadas
- [x] T-… · <fecha de cierre> · <commit/PR o nota breve>   (colapsado a una línea)
## Descartadas
## Historial de checks
| Fecha | Ventana | Tareas nuevas | Cerradas |
## Handoff para nuevas sesiones
<prompt corto y autocontenido: qué es este archivo, cómo retomar (leer Resumen + primera tarea P0 abierta), reglas del proyecto relevantes, y cómo marcar tareas hechas>
```

Update `Último check`, `Ventana`, `Baseline` (current `HEAD` short hash, plus note if there are uncommitted reference changes - in that case record a content fingerprint: `git diff -w --stat | tail -1`) and the history table. Keep completed tasks as one-liners so the file stays short; the open-task section must be the only long part.

## Step 6 - Marking progress (used on later invocations and by other sessions)

- When the user says a task (or several) is done, or when you verify in code that a task is implemented, move it to **Completadas** with the date and evidence, and update the summary counts. Verify against the real code before closing; do not close on assumption.
- Partial progress: keep the task open, tick sub-bullets, and update "Estado en el sistema real".
- Always end an update by re-printing the current open-task list (ids + titles + priority) so it can be pasted into a new session.

## Step 7 - Final answer (concise, Spanish)

1. Ventana analizada y fuentes usadas (nº de entradas de changelog, nº de archivos cambiados).
2. Conclusión clara: 5-10 líneas con lo más importante (qué cambió, impacto, orden recomendado).
3. Lista de tareas abiertas (id · título · prioridad · tamaño), agrupada por área.
4. Decisiones que necesitan al usuario.
5. Ruta del archivo `REFERENCE-UPDATES-TODO.md` como link, y el bloque de handoff listo para pegar en una sesión nueva.

Do not commit the TODO file unless asked. If the reference folder shows no changes in the window, say so, still update `Último check`, and report the open tasks that remain.
