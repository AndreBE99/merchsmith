# 02-home — Home / Dashboard por rol (referencia V2)

Carpeta referencia: `Merchsmith Platform Design V2/` (abreviada `V2/`). Todo vanilla JS, sin backend.

## 1. Ficheros fuente
| Fichero | Papel |
|---|---|
| `V2/Merchsmith Home.html` (144 líneas) | Shell: CSS inline (L12-111), sprite SVG (L114-120), `<header class="header">` (L122-129), banda breadcrumb (L131), `<div class="main" id="main">` (L133) |
| `V2/home-page.js` (sin `?v`) | Renderiza `#main` según rol: `VIEWS.admin/distributor/customer/supplier/user` (L21-78), helpers `kpis/tlist/alist/ranks/progs` (L11-19), `greet` (L81-86), `render` (L89-95) |
| `V2/home-data.js` (sin `?v`) | `window.HOME` = datos mock por rol (L2-136). 100% estático (no lee localStorage) |
| `V2/cust-setup-card.js?v=1` | Solo rol customer: tarjeta "Finish setting up your store" inyectada tras el `<h1>` |
| `V2/sidebar.js?v=23` | Rail izquierdo (chrome, ver 01-chrome). Item activo "Dashboard" (`go:'Merchsmith Home.html'`, sidebar.js:98,118,139; sublink "Overview") |
| `V2/chrome.js?v=3` | Reescribe `.header` (búsqueda centrada, basket, campana, avatar+menú) y footer; ELIMINA `.headtools` y `.roleswitch` de Home.html (chrome.js:70) |
| `V2/identity.js`, `logos.js`, `theme.js` | Lockup de marca (`[data-identity-lockup]`), rol (`ms-identity`), colourway |
| `V2/tokens.css`, `V2/components.css` | Tokens + footer (`.msf-*`) |
| `V2/dashboards.js`, `V2/admin-home.js` | NO se cargan en Home. `dashboards.js` (MSDASH) es el dashboard de Orders/Finance; `admin-home.js` el de Admin.html. Home = solo `home-page.js` |

Orden de scripts (Home.html L135-142): logos.js, identity.js, IIFE crumb-org (L137), sidebar.js?v=23, home-data.js, home-page.js, chrome.js?v=3, cust-setup-card.js?v=1. Título: `Merchsmith — Dashboard`. Fuentes Google: EB Garamond 400/500/600 (+ital), Fredoka 500/600, Mulish 300-800.

## 2. Selección de rol
- Rol = `MSID.current()` (identity.js:35): lee `localStorage['ms-identity']` ∈ `admin|distributor|customer|supplier` (default `distributor`); si `window.MS_SCOPE==='platform'` fuerza `admin`.
- Se re-renderiza en el evento `ms-identity-change` (home-page.js:96).
- La vista `user` (Leo Tran, Marketing Coordinator) EXISTE en el código pero NO es alcanzable (no hay identidad `user`): código muerto; opcional.
- Identidades (identity.js:19-28): Platform Admin = Morgan Slade/Operator (land `Merchsmith Admin.html`); Distributor = Jess Doyle/Account Admin (land Home); Customer = Sara Kemp/Brand Admin; Supplier = Tom Reed/Production. Nav del header: distributor `home,store,orgs`; customer `home,merch,store`; supplier `home`; admin `platform`.
- ATENCIÓN: el saludo usa `d.who` de `HOME[role]` (nombres de home-data), que NO siempre coinciden con identity.js: distributor Jess Doyle, customer Sara Kemp, supplier Tom Reed, admin Morgan Slade (coinciden). Org de customer en Home = "Northwind Ltd" pero el crumb muestra "Citrix" (ver 4).

## 3. Layout (todas las vistas)
Estructura DOM:
```
body
 svg(sprite h-up,h-plus,h-store,h-grid,h-bell)
 header.header  > .brand[data-identity-lockup] (+ .headtools estático que chrome.js elimina)
 .crumbband > .crumb > span.crumb-org · span.sep "›" · span.here "Dashboard"
 .main#main
   [section.cc#ccList  (solo customer, cust-setup-card.js)]
   .greet > div(h1 "<Good morning|afternoon|evening>, <Nombre>" + .sub "<role> · <org>") + .actions(2× a.btn)
   .kpis (grid 4 col) > 4× .kpi (.lab .val .delta)
   .cols (grid 1.55fr 1fr) > div[col izq] + div[col der] > .card…
```
- Saludo: hora local `<12` "Good morning", `<18` "Good afternoon", si no "Good evening" + `", "` + primer nombre (home-page.js:82).
- `.sub` = `"<role> · <org>"` (home-data `role`/`org`).
- Breadcrumb: `.crumb-org` se sobreescribe por IIFE (Home.html:137) con mapa `{distributor:'Mojo Promotions', customer:'Citrix', supplier:'BagWorks UK', admin:'Merchsmith'}` según `MSID.current()`; `.here` = "Dashboard".
- Header Home.html (L122-129, antes de chrome.js): lockup + campana (title "Notifications", badge "4") + avatar `#hav` (iniciales). Tras chrome.js se reemplaza por: lockup, `.ms-hsearch` (placeholder `Search products, projects, orders…`), `.ms-htools` (basket `a.it[title="Basket"]` -> `Merchsmith Basket.html` con `#msBasketCount`, SOLO si rol no supplier/admin; campana `title="Notifications"`; `.ms-acct` con menú). Detalle en 01-chrome. Header fondo `--periwinkle-deep` sticky z50 (chrome.js:34).
- Ancho: `.main{width:100%;max-width:none;padding:26px var(--page-gutter) 80px}` full-bleed, alineado a la izquierda (changelog 2026-09-20). `--page-gutter:clamp(20px,2.5vw,36px)`.

## 4. Vistas por rol: textos EXACTOS y datos (home-data.js)
Botones `.actions`: `btn(icon,label,href,primary)` -> `a.btn.ghost` salvo `primary=1` -> `a.btn` (sólido). Icono `.icn` 15px + label.

### 4.1 admin (L3-32) — "Morgan Slade · Platform Operator · Merchsmith"
- Acciones: [ghost, icon h-grid] `Open admin console` -> `Merchsmith Admin.html`; [primary, h-up] `Revenue report` -> `#`.
- KPIs: Platform MRR `£6,880` `+8.2%` up | GMV (30d) `£512k` `+12%` up | Active distributors `8` `+1` up | Seat overage `£530` `4 distributors` up.
- Col izq: card "Platform revenue" (card-h con enlace `Last 12 months ›` -> `#`): `.trend` 12 barras con alturas % `[38,42,40,48,52,49,58,61,57,64,68,72]` (última barra color `--flare`). Card "Top distributors by GMV" (enlace `View all ›` -> Admin.html): ranks `NorthStar Brand Co £1.42M 96` · `Verde Eco Promo £701k 62` · `Brightside Promo £884k 74` · `Mojo Promotions £612k 54` · `Köber Werbung €512k 46` (el orden es el del array, NO ordenado por valor).
- Col der: card "Needs attention" (ch-sub `Billing, risk & onboarding`): tlist — `Pinnacle Swag — payment failed, 2 retries left` tag `Billing` (warn) · `Cobalt Brand Studio — suspended, review account` `Risk` (warn) · `Limelight Gifts — finish store setup with Aoife` `Onboarding` · `Approve Inkwell Print supplier onboarding` `Supplier`. Card "System health": `Feed syncs` `All green` · `API uptime` `99.98%` · `Open incidents` `0` (valor en `--green-deep`). Card "Recent activity" (alist, avatar = iniciales): `NorthStar upgraded to Scale plan 2h ago` · `XD Connects synced 8,200 products 4h ago` · `Verde Eco added 3 new customers Yesterday` · `Brightside GMV passed £880k Yesterday`.

### 4.2 distributor (L33-60) — "Jess Doyle · Account Admin · Mojo Promotions"
- Acciones: [ghost, h-grid] `Open project view` -> `Merchsmith Project - Autumn Giveaways.html`; [primary, h-store] `Browse store` -> `Merchsmith Store.html`.
- KPIs: Open orders `12` `+3` up | Awaiting approval `5` `2 urgent` (warn) | GMV this month `£58,200` `+9%` up | Avg. margin `34%` `+1.2pt` up.
- Izq: card "Project pipeline" (enlace `Open projects ›` -> Project Autumn Giveaways): `.pipe` 5 `.stg`: `8 Idea` · `14 In progress` · `6 Ready to order` · `11 Ordered` · `23 Delivered`. Card "Top customers" (enlace `Organisations ›` -> `Merchsmith Organisations.html`): `Northwind Ltd £128k 92` · `Fernlea Foods £87k 68` · `Meridian Bank £64k 52` · `Volt Studios £42k 36`.
- Der: card "Your tasks" (ch-sub `Across active projects`): `Send proof v2 — Tech Travel Bag (Volt Studios)` `Design` warn · `Chase quote — Prodir Pen (Lumen Supplies)` `Price` · `Confirm critical date — Eco Cable (Northwind)` `Delivery` warn · `Stock check expiring — Recycled Tote` `Stock`. Card "Recent activity": `Northwind approved the design proof — Eco Cable 1h ago` · `Lumen Supplies confirmed stock, reserved to 31 Oct 3h ago` · `Cara Lyon promoted Tote to Ready to Order Yesterday` · `Fernlea Foods placed an order — £11,600 Yesterday`.

### 4.3 customer (L61-86) — "Sara Kemp · Brand Admin · Northwind Ltd"
- Acciones: [ghost, h-store] `Browse store` -> Store.html; [primary, h-grid] `My projects` -> Project Autumn Giveaways.
- KPIs: Active projects `7` `+1` up | Awaiting your approval `3` `Action needed` (warn) | In production `4` `on track` up | Spend (YTD) `£128,450` `+14%` up.
- Izq: card "Awaiting your approval" (ch-sub `These need a decision to keep moving`): `Approve design proof — Eco Wheat-Straw Cable` `Design` warn · `Approve price — Recycled Cotton Tote` `Price` · `Approve visual — Hoton Notebook` `Visual`. Card "My projects" (enlace `Open ›`): progs — `Autumn Giveaways · In progress 55%` · `2026 Charity Expo · Awaiting approval 40%` · `Staff Gifts · Ready to order 80%` · `VIP Gifts · Delivered 100%`. Card "Reorder favourites" (ch-sub `Quick add to a new project`): chips `Recycled Cotton Tote +` · `Hoton A5 Notebook +` · `Prodir Pen +` (sin acción click, solo hover).
- Der: card "Upcoming deliveries": progs (pct no definido => barra 100%) — `Recycled Cotton Tote` st `On track · Fri 10 Oct` · `Eco Wheat-Straw Cable` `Critical — confirmed · Mon 20 Oct` · `Seed Pencil Set` `In production · Wed 29 Oct`. (Texto `st` = `note + ' · ' + d`; fechas hardcodeadas.)
- Extra: `cust-setup-card.js` (ver 5).

### 4.4 supplier (L87-110) — "Tom Reed · Production Contact · BagWorks UK"
- Acciones: [ghost, h-bell] `Open enquiries` -> `#`; [primary, h-grid] `My orders` -> `#`.
- KPIs: Open enquiries `6` `2 today` (warn=true, up=true -> clase warn) | Orders to fulfil `9` `+2` up | Proofs to upload `3` `1 overdue` (warn) | On-time rate `97%` `+2pt` up.
- Izq: card "Enquiries to respond to" (ch-sub `Stock, delivery & quote checks`): `Stock check — Recycled Cotton Tote (Black, Large)` `Stock` warn · `Delivery date — Eco Cable, qty 5,000` `Delivery` · `Quote request — Drawstring Bag GRS` `Quote`. Card "Orders in production" (card-h solo título): `Recycled Cotton Tote ×7,400 · In production 60%` · `Canvas Shopper XL ×2,400 · Proof approved 35%` · `Drawstring Bag GRS ×8,800 · Dispatched 100%`.
- Der: card "Deadlines": tlist mapeando `d`→tag: `Upload proof — Tote v2` tag `Today 17:00` warn · `Order acknowledgement — Cable` `Tomorrow` · `Dispatch — Drawstring Bag` `Thu 24 Oct`.

### 4.5 user (L111-135; inalcanzable) — "Leo Tran · Marketing Coordinator · Northwind Ltd · Marketing"
KPIs My tasks 4 / My approvals 2 / My projects 3 / My orders 6; cards My tasks, My projects, My recent activity. Omitir salvo que se quiera paridad total.

### 4.6 Detalle de render de componentes
- `.kpi .delta`: clase `warn` si `k.warn`, si no `up` si `k.up`, si no `down`; icono flecha `#h-up` 12px solo si up y no warn. `note` de KPI (MRR) no se renderiza.
- `.lrow` tareas: `.dot` (`.warn` -> `--flare`), `.lt`, `.tag` (`.warn` ámbar). Actividad: `.av` con iniciales (primeras letras de 2 palabras) + `<b>quién</b> texto` + `<small>cuándo</small>`.
- `ranks`: `.r` grid `1fr auto`; `.track` 7px, `i` ancho `pct%` color `--periwinkle`.
- `progs`: `.prow` > `.ph` (`<b>nombre</b>` + `.st` "stage|note · d") + `.tk i` ancho `pct` (default 100).
- Escape HTML mínimo (`&` y `<`).

## 5. Tarjeta "Finish setting up your store" (customer) — cust-setup-card.js
- Condición: rol customer y existe `localStorage['ms-cust-onboard-latest']` (org id). Lee `ms-onboard-v2` → `.orgs[org].steps` con pasos `org, brand, delivery, billing, terms, team` (6). Si los 6 completos, elimina la tarjeta.
- DOM: `section#ccList.cc` insertada tras el `h1` (L11). Contenido: `<b>Finish setting up your store</b>` + `<span>{n} of 6 organisation steps done. You can browse now; ordering opens once setup is finished.</span>` + `.cc-bar > i` (ancho % = n/6) + botón `a.btn` `Continue setup` (si n>0) / `Start setup` -> `Merchsmith Customer Onboarding.html?org=<org>`.
- CSS inline (L13): `.cc` flex, gap 18, fondo #fff, borde `--line-soft`, radius 18, padding 18/20, margen 18/0/22, sombra `0 4px 16px rgba(40,44,80,.04)`; `b` serif 22/500; `span` 13px `--text-soft`; `.cc-bar` 6px `--paper-2`, `i` `--periwinkle-deep`. Se dibuja con setTimeout 50ms tras DOMContentLoaded.
- HANDOVER L357, L390: sustituye al antiguo `cust-checklist.js` ("Get set up" checklist: accept invite, confirm details, confirm brand, invite team, first project; Start / Mark done / Hide) — ya NO se carga en Home.

## 6. Tokens y medidas (Home.html CSS inline L13-110)
- Body: `background:var(--paper)` (#F4F5F8), `font-family:var(--sans)` (Mulish), color `--ink` #222.
- `.crumbband`: fondo `--periwinkle` (#7B85C5), texto #fff, padding `13px var(--page-gutter)`; `.crumb` 14px/600, gap 9, `.sep` opacity .6.
- `.greet h1`: `--serif` (EB Garamond) 32px/500, letter-spacing -.01em; `.sub` 13.5px `--text-soft`, mt 5; `.greet` mb 4, flex, wrap, gap 20.
- `.btn`: inline-flex gap 8, fondo `--periwinkle-deep` (#5860A6), #fff, radius 11, padding 10/16, 13.5px/700; hover `brightness(1.06)`. `.btn.ghost`: fondo #fff, color `--periwinkle-deep`, borde `1.5px solid var(--line-soft)`.
- `.kpis`: grid 4 col gap 14, margen 22/0; `.kpi`: #fff, borde `1px solid --line-soft`, radius 16, padding 17/18, sombra `0 4px 14px rgba(40,44,80,.04)`; `.lab` 12.5px/600 `--text-soft`; `.val` serif 30px/500, margen 6/0/7, lh 1; `.delta` 12px/700 pill (radius 999, padding 3/9): up `--green-deep` sobre `--tint-green`; down `--ink-3` sobre `--paper-2`; warn `#9a6b1f` sobre `#fbeccd`.
- `.cols`: grid `1.55fr 1fr` gap 16. `.card`: #fff, borde 1px `--line-soft`, radius 16, padding 18/20, misma sombra, mb 16; `h3` serif 18/500 mb 4; `.ch-sub` 12.5px `--muted` mb 14; `.card-h` flex space-between mb 14, enlace 12.5px/700 `--periwinkle-deep`.
- `.trend`: flex gap 6 height 120; `.bar` flex 1, gradiente `--periwinkle`→`--periwinkle-deep`, radius `5px 5px 0 0`, min-height 6, opacity .9; última `--flare`.
- `.rank` gap 13; `.n` 13.5/600; `.v` 13/800.
- `.pipe` flex gap 10; `.stg` flex 1, fondo `--paper`, radius 12, padding 14/10, centrado; `b` serif 24/500; `span` 11px/600 `--muted`.
- `.lrow` padding 11/0, borde superior `1px --paper-2` (menos el primero), gap 12; `.dot` 8px `--periwinkle` (`.warn` `--flare`); `.lt` 13.5px; `small` 11.5px `--muted`; `.tag` 10.5px/800 uppercase, ls .02em, `--periwinkle-deep` sobre `--tint-peri`, pill, padding 3/9 (`.warn`: #9a6b1f sobre #fbeccd); `.av` 30px círculo `--periwinkle` blanco 11px/800.
- `.prow` padding 11/0; `.ph` 13.5px, `b` 600, `.st` 12px/600 `--muted`; `.tk` 7px `--paper-2`, `i` `--periwinkle`.
- `.chips .c` 13px/600, fondo `--paper-2`, radius 9, padding 8/12, cursor pointer; hover fondo `--tint-peri` color `--periwinkle-deep`.
- `.health .hrow` 13.5px, padding 10/0; `b` `--green-deep`.
- Colourway Woodland (`data-theme="woodland"`) cambia todos los tokens (tokens.css:46-57).

## 7. Responsive
- `@media(max-width:900px)`: `.kpis` -> 2 columnas (Home.html:46).
- `@media(max-width:980px)`: `.cols` -> 1 columna (L57).
- Header chrome: `@media(max-width:880px){.ms-hsearch{display:none}}` (chrome.js:62).
- Sin otros breakpoints; `.greet` hace wrap.

## 8. Estados
- Sin estado vacío/carga/error: datos mock siempre presentes; no hay modo blank vs seeded (home-data.js no lee `ms-mode`). El real deberá derivar de datos reales y definir vacíos (la referencia no los especifica).
- Roles: ver 4. Persistencia: solo `ms-identity` (rol) y los de onboarding (`ms-cust-onboard-latest`, `ms-onboard-v2`).
- Interacciones: solo navegación por enlaces; botón `Revenue report`, `Last 12 months ›`, `Open enquiries`, `My orders` apuntan a `#` (placeholders); chips de reorder inertes; sin modales/drawers/atajos.
- Dashboards numéricos "reales" (Orders Stats, Finance Dashboard, Admin Dashboard con MSDASH/admin-home.js) NO son Home: ver fichas 06/08/13.

## Solo prototipo / fuera de alcance
- Todos los números/listas son literales en `home-data.js` (sin DB); el sistema real debe calcularlos desde datos reales (ya existentes) o mostrar vacío. Fechas ("Fri 10 Oct", "Thu 24 Oct") hardcodeadas.
- Rol por `localStorage ms-identity` (switcher de demo) → en real, por sesión/rol.
- Vista `user` y enlaces `#` sin destino.
- Datos del customer "Northwind Ltd" vs crumb "Citrix": incoherencia del prototipo; en real usar la organización del usuario.
- `Revenue report`, `System health` (feeds/API uptime/incidentes) requieren servicios que pueden no existir.

## Changelog reciente relevante
- 2026-09-20 (Developer Index L142-144): Home full-width y alineado a la izquierda como Chats (antes tope 1600px centrado); tiers de ancho con padding fluido.
- Sep 2026 (HANDOVER L357): `cust-setup-card.js` sustituye al checklist `cust-checklist.js`.
- Sep 2026 chrome: header unificado `chrome.js` (búsqueda centrada, basket oculto para supplier/admin); `sidebar.js?v=23`; ítem "Dashboard" con icono de gráfico de barras compartido por los 4 roles (changelog 2026-09-21).
- 2026-06-15: build inicial.
