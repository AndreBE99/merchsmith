# Summary 02-home (frontend)

Fuente: `ref/02-home.md`. Rutas reales: `src/app/(protected)/page.tsx` + `components/{Distributor,Customer,Supplier}Dashboard.tsx` + `dashboardUi.tsx`; `features/onboarding/components/SetupCard.tsx`; admin en `src/features/dashboards/components/PlatformDashboard.tsx` (`/admin/overview`).
Base: el Home real ya replica estructura (greet/kpis/cols/cards) con datos reales; las diferencias son de medidas, textos y homogeneidad entre roles.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | `.kpi`/`.card` radius 16 | `dashboardUi.tsx:25` `cardSx.borderRadius: var(--card-r)` = 12px (globals.css:60) | radio 12 vs 16 | `cardSx.borderRadius: '16px'` solo en dashboardUi (no tocar token global; ver 01-chrome) | media | done |
| 2 | `.btn` radius 11, `.btn.ghost` borde 1.5px | `dashboardUi.tsx:63` `var(--ctl-r)` = 8px | radio 8 vs 11 | usar `'11px'` en DashButton | baja | done |
| 3 | `.tag` 10.5px/800 uppercase, ls .02em, pill | `dashboardUi.tsx:385-395` 12px/500 sin uppercase | tipografía de tag | fontSize 10.5, fontWeight 800, textTransform uppercase, letterSpacing .02em, radius 999 | media | done |
| 4 | `.lrow .lt` 13.5px, `small` 11.5px muted | `dashboardUi.tsx:360-440` | coincide | ninguno | - | done |
| 5 | `.greet` título 32px serif | `dashboardUi.tsx:86-95` | coincide (lh 1.15 vs sin definir) | ninguno | - | done |
| 6 | Breakpoints: kpis 2 col <900, cols 1 col <980 | `dashboardUi.tsx:176,193` usan `md` (900) para ambos | cols colapsa a 900 en vez de 980 | `DashColumns`: `gridTemplateColumns: { xs:'1fr', lg:'1.55fr 1fr' }` con breakpoint custom 980 vía `'@media (min-width:980px)'` | baja | done |
| 7 | Cust. "Finish setting up your store" (`.cc`): fondo #fff, borde `--line-soft`, radius 18, pad 18/20, margen 18/0/22, sombra `0 4px 16px rgba(40,44,80,.04)`; título serif 22/500; texto 13px `--text-soft`; barra 6px `--paper-2`/`--periwinkle-deep`; botón `a.btn` | `SetupCard.tsx:33-72` margen `0 24px 24px` (desajusta con DashPage, que ya aplica gutter), borde `--g200`, radius `--card-r`, título sans 18/600, texto 14px, barra 8px | margen/tipografía/radio/barra distintos | margen `18px 0 22px`; radius 18; título `--font-serif` 22/500; texto 13px `--text-soft`; barra 6px; botón con estilo `.btn` (radius 11, 13.5/700). Texto del botón: `Start setup` si 0 pasos hechos, `Continue setup` si >0 | media | done |
| 8 | SetupCard textos "{n} of 6 organisation steps done. You can browse now; ordering opens once setup is finished." | `SetupCard.tsx:20-26` texto dinámico "N steps left: ..." | texto distinto | Mantener lógica real (más informativa); un test existente fija ese texto | baja | done (se mantiene el texto real: decisión) |
| 9 | Customer: acciones `.btn.ghost` Browse store / `.btn` My projects con iconos 15px | `CustomerDashboard.tsx:340-355` MUI `Button` con `borderRadius:3`, sin `DashButton`/`DashGreet` | no reutiliza bloques `dashboardUi`; título `1.6rem/2rem`, no 32px | usar `DashGreet` + `DashButton` (store=ghost, projects=primary) igual que Distributor; sub = `<role> · <org>` (hoy añade "here's what needs you today") | media | done |
| 10 | Customer: KPIs en `.kpis` (gap 14, my 22, 2 col <900) | `CustomerDashboard.tsx:358-390` `Box` grid gap 2 (16px) mb 3 | gap/márgenes | usar `KpiRow` | baja | done |
| 11 | Customer: cards `.card` (h3 serif 18, `ch-sub` 12.5 muted, `card-h` con enlace `Open ›`) | `CustomerDashboard.tsx:396-486` MUI `Card` + `CARD_TITLE_SX`; enlace "Open" sin `›`, con onClick (no `<a>`) | no usa `DashCard`; enlace no accesible | migrar a `DashCard` (title/sub/link `/projects`); mantiene filas `ActionList`/`ProgressRows` | media | done |
| 12 | Customer "Reorder favourites": chips `.chips .c` 13px/600, fondo `--paper-2`, radius 9, pad 8/12, hover `--tint-peri`; ch-sub "Quick add to a new project" | `CustomerDashboard.tsx:440-480` MUI Chip, sub "Your most requested products" (decisión consciente: no hay basket de "quick add") | chip style y subtítulo | restilar chips a la ref (paper-2/radius 9/hover tint). Subtítulo: mantener texto real (la ref promete "quick add"; ver Fuera de alcance). Preguntar a ref si prefiere el literal | baja | done |
| 13 | Customer "Upcoming deliveries" `progs` | `CustomerDashboard.tsx:488-496` | coincide en contenido | solo migrar a `DashCard` (11) | baja | done |
| 14 | Supplier: saludo/acciones `Open enquiries` (ghost h-bell) + `My orders` (primary h-grid); sub `Production Contact · BagWorks UK` | `SupplierDashboard.tsx:119-137` sin acciones; sub "N requests waiting…" ; sin `DashGreet` | falta barra de acciones y sub rol·org | `DashGreet` con sub `<role> · <org>` y acciones `Open enquiries` (-> `/supplier/stock-checks`) y `My orders` (-> `/supplier/deliveries`), rutas existentes | media | done |
| 15 | Supplier KPIs: Open enquiries / Orders to fulfil / Proofs to upload / On-time rate | `SupplierDashboard.tsx:144-170` Connection requests / Delivery confirmations / Sample quotes / Stock checks | etiquetas distintas; sin entidades de proofs/on-time | Mantener KPIs reales (no hay datos de proofs/on-time); alinear solo estilo con `KpiRow` y gap 14 | baja | done |
| 16 | Supplier cards: "Enquiries to respond to" (`tlist`), "Orders in production" (`progs`), "Deadlines" (`tlist`) | `SupplierDashboard.tsx:172-217` MUI `Card` borderRadius 4: "Needs your response" + "Quick links" (botones outlined) | estructura distinta; "Quick links" no existe en la ref | Reemplazar "Needs your response" por `DashCard` "Enquiries to respond to" (sub `Stock, delivery & quote checks`) con `TaskList` (tag Stock/Delivery/Quote, warn si >48h); eliminar "Quick links" y sustituir por card "Deadlines" solo si hay fechas reales (stock check `expires`/delivery date); si no, ocultar la card | media | done |
| 17 | Distributor: ya usa `DashGreet/KpiRow/DashColumns/DashCard/PipelineStrip/RankList/TaskList/ActivityList` | `DistributorDashboard.tsx:218-359` | coincide; `Avg. margin` y `GMV` derivan de datos reales (GMV dim) | ninguno de estructura | - | done |
| 18 | Distributor KPI `Awaiting approval` warn con "2 urgent" | `DistributorDashboard.tsx:268-282` | coincide | ninguno | - | done |
| 19 | Admin: Home (`VIEWS.admin`) en `Merchsmith Home.html` (KPIs MRR/GMV/Distributors/Seat overage, Platform revenue trend, Top distributors, Needs attention, System health, Recent activity) | `/` para operador cae en `DistributorDashboard`; el dashboard de plataforma existe solo en `/admin/overview` (`PlatformDashboard.tsx`) | el Home de operador no es la vista admin de la ref | Si el operador abre `/`, renderizar `PlatformDashboard` envuelto con `DashGreet` ("Open admin console" ghost -> `/admin/overview`, "Revenue report" omitido: `#` en ref) — verificar primero en `page.tsx` si `isPlatformAdmin` está disponible en `useAuth` | media | done (el operador en `/` redirige a `/admin` = overview de plataforma; sin cambios) |
| 20 | Breadcrumb `Dashboard` con org en `.crumb-org` | `page.tsx:11` `usePageBreadcrumb('Dashboard')` | org depende del chrome (01-chrome) | seguimiento en 01-chrome | - | todo |
| 21 | Sin estados vacío/carga en la ref | Dashboards reales muestran `—` / `DashNote` | extensión legítima | ninguno | - | done |

## Fuera de alcance
- Revenue report (`#` en la ref), `System health` (feed syncs, API uptime, incidentes): requieren servicios sin implementar; en admin omitir o mostrar solo lo ya existente en `PlatformDashboard`.
- Vista `user` (Leo Tran): inalcanzable en la ref, no se implementa.
- Datos de prototipo (cifras, fechas hardcodeadas, "Northwind"/"Citrix"): el real usa datos reales.
- Supplier "Proofs to upload" / "On-time rate" / "Orders in production": no hay entidades de proofs/OTD en el modelo actual (requeriría tablas nuevas).
- "Quick add to a new project" en chips de reorder: requiere basket->proyecto, no existe.
- Selector de rol por `localStorage ms-identity`: en real el rol viene de la sesión.

## Backend
Verificado en `merchsmith-backend/src/dashboards` (controlador + `DashboardsService`), `supplier-project-*`, `onboarding`, `activity-logs`. Resultado: **cubierto**; no hay cambios de código necesarios para 02-home.

| Vista | Endpoint existente | Permisos | Cubre |
|---|---|---|---|
| Distributor / Customer | `GET /api/dashboards/orders` (+ `GET /dashboards/finance`) | `UseAppGuards`; finanzas exigen `finance.view` en el servicio; datos filtrados por rol | KPIs, pipeline, top customers, on_the_way, attention (proofs_to_approve, late), delivery_record |
| Admin (operador) | `GET /api/platform/dashboards` | `platform.admin`/`platform.organisations.*` + acción finance (Owner/Billing) | `orders.gmv_12m`, `by_distributor` (Top distributors by GMV), `series` (trend), `subscriptions.kpis.mrr/suspended/past_due`, `largest` |
| Supplier | `GET /api/supplier/dashboards/orders` | `UsePlatformGuards`; solo sus POs, sin cliente ni precio | ver nota abajo |
| Supplier enquiries | `GET /api/supplier/project-stock-checks`, `/project-delivery-confirmations`, `/project-price-quotes`, `/project-sample-quotes` (+ `/supplier/connection-requests`) | `project_*.respond` | lista de peticiones con `requested_at`, item y qty |
| Setup card (customer) | módulo `onboarding` | ya consumido por `SetupCard` | pasos y estado |

Correcciones al summary frontend (filas 15, 16 y "Fuera de alcance"):
- **Supplier "Proofs to upload" y "On-time rate" SÍ existen en backend**: `GET /supplier/dashboards/orders` devuelve `attention.proofs_to_upload` (estado `ack`), `attention.to_acknowledge`, `attention.tracking_to_add`, `performance.on_time_pct` y `kpis.dispatched_on_time_pct` (con periodo anterior). También `kpis.open_pos`, `units_to_produce`, `po_value`. No requieren tablas nuevas.
- **Supplier "Deadlines"** = `dispatch_calendar` (order_id, ref, name, qty, status, date, `late`) próximo a 14 días: sirve para la card "Deadlines" con tag de fecha y warn si `late`.
- **Supplier "Orders in production"** (nombre, qty, estado, % de avance): la lista de líneas con `status` y `stepIndex` está calculada internamente (`by_product` da coste/unidades por producto, no estado). Para el % por línea, usar `dispatch_calendar` (status+qty) como aproximación; si el frontend necesita lista completa de POs en producción, existe `supplier/orders`.
- **Admin "Needs attention"**: derivable con `subscriptions.by_status` (past_due/suspended: recuentos y mrr) pero NO hay lista nominal (qué distribuidor). Hueco pequeño sin migración: añadir `subscriptions.attention` con `{id,name,status,payment_status}` de `subs.distributors` filtrados. No implementado todavía: solo si el frontend lo pide (QUESTION); `System health` queda fuera de alcance.
- **Recent activity**: `activity-logs` existente (lectura con permisos propios); el frontend ya usa datos reales.

### Fuera de alcance (backend)
- `System health` (feed syncs, API uptime, incidentes) y `Revenue report`: servicios de monitorización inexistentes.
- "Quick add" desde chips de reorder: requiere basket->proyecto.
