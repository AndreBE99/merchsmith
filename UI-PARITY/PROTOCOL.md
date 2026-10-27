# UI-PARITY — protocolo de los 3 subagentes

Objetivo: dejar el sistema real (merchsmith-frontend + lo mínimo de merchsmith-backend) visual y funcionalmente igual a `Merchsmith Platform Design V2/`.
Alcance: solo lo visual/funcional que NO requiera migraciones, tablas nuevas, credenciales o servicios externos. Esos puntos se anotan como "Fuera de alcance" con motivo.

## Secciones (orden de trabajo)
01-chrome (sidebar/rail, header, footer, tokens, components.css)
02-home
03-store (Store, Store Home, página de producto, Recommended Standard, price matrix)
04-projects-list (Projects, Distributor Projects, Create Project)
05-project-page (Project Autumn Giveaways, pop-out, Project Sheet, Brand Assets, Branding builder)
06-orders (Orders, order page, delivery-confirm, confirm-view)
07-basket-checkout (Basket)
08-finance (Finance, Customer Finance, billing, dashboards)
09-comms (Chats, Emails, Notifications, Calendar, Calls, comments)
10-orgs-users (Organisations, Users, Team, Profile, Accept Invite, acct-manager)
11-settings (Distributor Settings, Customer Settings)
12-supplier-portal (Supplier Portal, Supplier Onboarding)
13-admin (Admin, admin-*.js)
14-onboarding (Customer/Distributor Onboarding, checklists)
15-gallery-logos (Gallery, Logos, Brand Guide)

## Archivos (cada uno lo escribe SOLO su dueño)
- `UI-PARITY/ref/<sección>.md` — Agente REFERENCIA: ficha detallada de la sección en la referencia (rutas/ficheros de origen, layout, componentes, textos, estados, interacciones, tokens, responsive). Al terminar cada ficha, añade una línea `DONE <sección>` a `UI-PARITY/STATUS.md`.
- `UI-PARITY/summary/<sección>.md` — Agente FRONTEND: Summary de cambios de esa sección, tabla por componente: referencia | estado actual (archivo:línea) | diferencia | cambio requerido | prioridad | estado (todo/doing/done). Se escribe en cuanto exista la ficha ref de la sección.
- Agente BACKEND: añade al final de cada `summary/<sección>.md` un apartado `## Backend` (endpoints/campos que faltan, o "cubierto"), sin tocar el resto del fichero.
- `UI-PARITY/STATUS.md` — registro append-only de eventos (`DONE ref <sec>`, `DONE summary <sec>`, `DONE backend <sec>`, `DONE impl <sec>`, `QUESTION <de→a>: ...`, `ANSWER ...`). Las preguntas entre agentes van aquí; quien deba responder la revisa antes de cada sección.

## Reglas
- Fuente de verdad visual: los HTML/JS/CSS de `Merchsmith Platform Design V2/` (y screenshots/). Abrirlos en el navegador solo por servidor estático (ver skill open-reference-in-browser, puerto 8642); no usar la pestaña "seed".
- Sin columnas nuevas en modelos existentes; sin migraciones; sin credenciales. Todo email nuevo respeta `private_mode_enabled`. IA solo vía AiProviderService. ApiClient: pasar `{ params }`. Leer `node_modules/next/dist/docs` antes de tocar Next. Sin commits, sin git stash/checkout --.
- No lanzar syncs de proveedor. No tocar la sesión/ghost del navegador del usuario.
- No sobrescribir trabajo existente sin commitear: leer el fichero antes de editar; cambios mínimos y localizados.
- Tests: vitest completo solo en segundo plano y desde merchsmith-frontend; jest/tsc en backend. No dejar baselines peores.
