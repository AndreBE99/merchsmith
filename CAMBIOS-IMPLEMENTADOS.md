# Cambios implementados (diff de git, sin commit)

Resumen de `git status` / `git diff HEAD` al 2026-10-03. Nada de esto está commiteado. El detalle de cada tarea (qué hace, cómo se verificó, qué falta) está en `REFERENCE-UPDATES-TODO.md` → «Completadas» (73 tareas y decisiones).

## Cifras

| Repo | Archivos modificados | Líneas | Archivos nuevos |
|------|----------------------|--------|-----------------|
| `merchsmith-backend` | 70 (+2 borrados) | +4.297 / −799 | 188 (36 migraciones, 37 specs, 5 docs) |
| `merchsmith-frontend` | 301 | +4.110 / −4.028 | 166 (39 tests) |
| Repo principal | `README.md`, punteros de submódulos, `REFERENCE-UPDATES-TODO.md`, este archivo | — | — |

- El diff bruto del frontend marca ~180.000 líneas, pero ~177.000 son `graphify-out/` (grafo generado). Sin eso son las cifras de arriba.
- `pnpm-lock.yaml` y `package.json` del frontend cambian por una dependencia nueva: `@twilio/voice-sdk` 2.18.5.
- Pruebas al final de la racha: backend jest 1767 (134 suites), frontend vitest 832 (90 archivos), `tsc` limpio en ambos.

## Backend

### Migraciones nuevas (36, todas aplicadas por ti; tablas nuevas con RLS y sin FKs)
`20261001100000_product_tags_rls`, `…110000_retire_spotlight_tier`, `…120000_recommended_range_default_rates`, `…130000_recommended_range_placements`, `…140000_reference_roles`, `…150000_distributor_seat_snapshots`, `…160000_plan_id_from_chosen_plan`, `…170000_subject_notes`, `…180000_subcategory_keyword_rules_rls`, `…190000_drop_trial_signups_enabled`, `…200000_user_profile_photos`, `…210000_supplier_payment_mandates`, `…220000_action_permissions`, `…230000_notifications`, `…240000_onboarding`, `…250000_supplier_onboarding`, `…260000_announcement_bars`, `…270000_email_log`, `…280000_email_templates`, `…290000_email_compose`, `…300000_email_attachments_and_assets`, `…310000_calendar`, `…320000_calendar_availability`, `…330000_calendar_booking_notes`, `…340000_email_delivery_events`, `…350000_email_sending_domains`, `…360000_email_replies`, `…370000_calendar_feed_tokens`, `…380000_calendar_google`, `…390000_calendar_google_sync`, `…400000_calendar_microsoft`, `…410000_calendar_calendly`, `…420000_calls`, `…430000_call_numbers`, `…440000_call_transcriptions`, `…450000_onboarding_reminders`.
`prisma/schema.prisma`: +944 líneas (modelos de todo lo anterior). La siguiente migración empieza en `20261001460000`.

### Módulos nuevos (`src/`)
- `calls/` — llamadas con Twilio: historial, ajustes, política de grabación, números, webhooks firmados, buzón, reenvío, token del navegador, grabaciones (reproducir, transcribir, resumir, borrar, retención), agenda de contactos, transferencia.
- `calendar/` — calendario: reuniones e invitaciones, free/busy, horario laboral, enlace de reserva y notas, feed iCal, Google (OAuth, copias y push), Outlook, Calendly.
- `email/` (ampliado) y `email-compose/`, `email-templates/` — registro de envíos, plantillas por distribuidor, redactor con borradores/firma/adjuntos, envío por Postmark, dominio de envío, responder por email, webhooks de entrega.
- `notifications/` — modelo, bus de eventos, campana y preferencias.
- `onboarding/` — onboarding de clientes, distribuidores y proveedores; recordatorios automáticos y manuales.
- `announcement-bars/`, `subject-notes/` (notas/comentarios/historial polimórficos).
- `common/` — matriz de permisos por acción, invariante del último Admin, puerta de acciones de Merchsmith, catálogo de roles.
- `curated-range/` — portal del proveedor y página pública «Recommended Standard» (`public-recommended-standard.controller`, `supplier-portal.service`, ciclo de vida de placements).
- `me/` (perfil personal y foto), `file-assets/profile-photos`, `platform-plans/` (scheduler de snapshots), `users/organisation-team.controller`, `dev-auth/` (cambio de perfil).
- `docs/`: `postmark-setup.md`, `google-calendar-setup.md`, `outlook-calendar-setup.md`, `calendly-setup.md`, `twilio-setup.md`.

### Archivos existentes modificados (por área)
`users` (8), `organisations` (6), `messaging` (6), `me` (6), `platform-plans` (5), `email` (5), `platform-settings` (4), `file-assets` (4), `curated-range` (4), `store` (3), `roles` (3), `dev-auth` (3), `product-imports` (2), `platform-distributor-environments` (2), `invitations` (2), más `supplier-registration-requests`, `supplier-project-price-quotes`, `store-settings`, `project-price-quotes`, `platform-organisations`, `package.json`.

### Borrados
`src/email/email-drafts.ts` (sustituido por el catálogo de plantillas), `src/organisations/dto/organisation-note.dto.ts` (sustituido por las notas polimórficas).

## Frontend

### Funcionalidades nuevas (`src/features/`, `src/app/`)
- `calls/` (+ `phone/`) y ruta `/calls` — historial, voicemail, ajustes, política, teléfono en el navegador (barra de llamada, marcador, entrante, silenciar, teclado, notas, transferir), panel de números, reproductor, transcripción.
- `calendar/` y rutas `/calendar`, `/book/[slug]` — semana/día, invitaciones, disponibilidad, enlace de reserva, notas, calendarios conectados (iCal, Google, Outlook, Calendly).
- `email-compose/`, `email-log/`, `email-templates/` y ruta `/emails` — redactor global, Sent, plantillas.
- `notifications/` y `/notifications`; `announcement-bars/`; `subject-notes/`; `profile/` y `/profile`.
- `onboarding/` y `/onboarding` — flujo del cliente/distribuidor/proveedor, checklists con «Send reminder».
- `supplier-portal/` y rutas `/supplier/{approvals,billing,placement-history,products,settings}`; `/recommended-standard`; `/admin/permissions` (referencia de permisos); `/settings/customer`.
- `dev-profiles/` (selector de perfil: ahora con Distributor admin); `src/components/icons/`; `lib/utils/useQueryParam.ts`, `useScrollToHash.ts`.

### Modificaciones transversales (301 archivos existentes)
- Rail/menús: `components/layout/Sidebar.navItems.tsx`, `SystemAdminSidebar.navItems.tsx`, `PlatformStoreSidebar.tsx`, `navRailIcons.tsx` (items, orden, flyouts, iconos por rol; contadores de chats y llamadas).
- Estilo «polished look» (ui-polish): tema MUI y `globals.css` alineados, mayúsculas → frase, radios por tokens. Es el grueso de los cambios mecánicos: `app/(protected)` (97 archivos), `features/platform` (52), `features/platform-products` (37), `organisation-brand-assets` (17), `users` (16), `organisations` (15), `components/layout` (12), `components/ui` (6).
- `features/platform` — permisos, planes (MRR, asientos), suscripciones, ajustes con pestañas (`AdminSettingsPage`).
- `features/users`/`organisations` — equipos, People por equipo, drawers de cliente y distribuidor con onboarding y equipos.
- `features/curated-range`, `store-range`, `messaging`, y otros (`briefs`, `brands`, `discounts`, `markup-rules`, etc.) con retoques de estilo.

### Tests nuevos
39 archivos nuevos en `src/__tests__/` (calls, calendar, email-compose, email-log, email-templates, notifications, onboarding, plans, platform, profile, subject-notes, supplier-portal, curated-range, announcement-bars, dev-profiles, mensajería, `useQueryParam`…).

## Repo principal
- Punteros de `merchsmith-backend` y `merchsmith-frontend` modificados (al commitear los submódulos hay que commitear también el puntero).
- `REFERENCE-UPDATES-TODO.md` (nuevo, la lista viva de tareas y su historial) y este archivo.
- Ruido que **no** es de estas sesiones (revisar antes de commitear): `Merchsmith Platform Design/` (273 archivos, la referencia/prototipo), `graphify-out/` (generado), `.claude/*`, `.serena/project.yml`, `.playwright-mcp/`, `AGENT-ONBOARDING-PROMPT.md`, `README.md`.

## Qué falta para cerrar
- Commitear por bloques (sugerencia: migraciones + schema; cada módulo backend con su UI; estilo mecánico aparte).
- Verificación real pendiente de credenciales: Postmark, Google, Microsoft, Calendly, Twilio (cuenta, números, API key, TwiML App, Intelligence Service, `BACKEND_PUBLIC_URL` https), `CALENDAR_TOKEN_KEY`, `FRONTEND_APP_URL`, `AI_API_KEY`, y el primer envío real de email cuando se quite el modo privado.
