# Summary 01-chrome (frontend)

Fuente: `ref/01-chrome.md`. Código real: `src/components/layout/{Header,NavRail,Sidebar*,Footer,AdminFooterBar,HeaderSearch,GlobalSearch}.tsx`, `src/app/globals.css`, `src/lib/theme/theme.ts`, `src/app/(protected)/layout.tsx`.
Conclusión de la revisión: el chrome real ya reproduce rail 68px + flyout, header 3 columnas con buscador pill, menú de cuenta, footer editorial C, barra admin blossom y colourways (Woodland incluido). Quedan estas diferencias.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Header: icono Basket (`a.it[title=Basket]` -> basket, badge `#msBasketCount` flare 16px; omitido en supplier/admin) | `Header.tsx:366-372` solo NotificationBell + avatar; Basket solo en rail (`Sidebar.navItems.tsx:301`) | falta el acceso al basket en la cabecera | Añadir `HeaderBasketLink` entre buscador y campana para roles distribuidor/cliente (no supplier, no variant admin/store): `NextLink` a `/basket`, icono bolsa 19px, badge con nº de líneas de `useBasket` (solo si >0; para distribuidor sin cliente seleccionado, sin badge) | media | done |
| 2 | Menú de cuenta: My profile · Notifications · sep · Sign out | `Header.tsx:74,496-517` añade "Account settings" con chip "Soon" | fila extra que no existe en la ref | eliminar `ACCOUNT_MENU_PENDING` y su render (y `SOON_CHIP_SX`/imports si quedan sin uso) | baja | done |
| 3 | Tokens extendidos (`tokens.css:28-40`): `--text-soft #6b6b73`, `--slate #6f7390`, `--muted-2 #8a8a92`, `--hair #d7d9e3`, `--brand-black #1a1a1a`, `--shadow-rgb 20,22,45` | `globals.css:3-27` no define ninguno; `dashboardUi.tsx` usa `var(--text-soft, #55555c)` (fallback distinto al de la ref) | tokens ausentes | añadir los 6 tokens a `:root` | media | done |
| 4 | `--tint-peri #eceef8`, `--tint-green #e3f5ee`, `--tint-red #ffe7e3`, `--paper-2` | `globals.css:24-26` usan rgba translúcidos | sólidos vs translúcidos (fondos no blancos se ven distintos) | sustituir por los valores sólidos de la ref. Riesgo bajo; el provider de colourway ya sobreescribe `--ms-color-tint` | baja | done |
| 5 | Header altura 61 (pad 12 + avatar 36 + hairline); avatar chip 36px con `box-shadow 0 0 0 2px rgba(255,255,255,.5)` | `Header.tsx:389-394` avatar 34px | 2px de diferencia | `size={36}`; `WORKSPACE_HEADER_HEIGHT` se mantiene (61) | baja | done |
| 6 | `.ms-htools` gap 22px; iconos 19-20px | `Header.tsx:366-370` `spacing {xs:1, md:2}` (8/16px) | separación menor | `spacing={{ xs: 1.5, md: '22px' }}` | baja | done |
| 7 | Buscador `.ms-hsearch`: flex 1, max-width 440, pill rgba(255,255,255,.16), borde .28, placeholder .75, oculto <=880px | `HeaderSearch.tsx:186-217` (admin 0.16/0.28; workspace 0.14, hover/focus) | workspace usa 0.14 vs 0.16/0.28; breakpoint de ocultación `md` (900) vs 880 | igualar `WORKSPACE_FIELD_SX` a ADMIN (0.16, borde .28) y ocultar a <880px | baja | done (color/foco; ocultado sigue a 900px) |
| 8 | Banda de breadcrumb solo en tienda (`msNoCrumb`) | `(protected)/layout.tsx` + `BreadcrumbBandProvider` | verificar que la banda no se muestre fuera de `/store` | auditar en 02-home..15: sin banda salvo store. Home actual llama `usePageBreadcrumb('Dashboard')` | media | todo (la app usa banda por área con colores configurables; pendiente decidir si se limita a /store) |
| 9 | Rail: iconos Lucide por título (Dashboard=layout-dashboard, Store=store, Projects=box, Orders=clipboard-list, Organisations=building, Users=contact, Team=users, Finance=receipt, Settings=settings, Brand Assets=palette, Chats=message-square...) | `navRailIcons.tsx`, `Sidebar.navItems.tsx` | comprobar icono a icono | comparar mapeo y alinear (Dashboard = 4 rects, Users = contact, Team = users) | baja | done (revisado: coincide) |
| 10 | Flyout `h4`: 10.5px/800 uppercase ls .1em muted | `NavRail.tsx:280-292` 13px/600 sin uppercase | tipografía del título del flyout | fontSize 10.5, weight 800, uppercase, letterSpacing .1em | media | done |
| 11 | Flyout: radius 14 (`.ms-fly`), `.ms-item` radius 9 | `NavRail.tsx:259,417` `--card-r` 12 / `--ctl-r` 8 | 2px/1px | radius 14 y 9 | baja | done |
| 12 | Footer editorial C (hero 3 cols, newsletter, acreditaciones, social, legal, pagos) | `Footer.tsx` (573 L) estructura equivalente | sin diferencias detectadas a nivel de código; falta verificación visual | verificar en navegador (barata) tras impl | baja | todo (verificación visual pendiente) |
| 13 | Footer admin `.adm-bar` blossom 51px, textos exactos | `AdminFooterBar.tsx` | coincide | ninguno | - | done |
| 14 | Colourways default/woodland, custom con 4 vars | `PlatformColourwayProvider.tsx`, `DistributorBrandingProvider.tsx`, `BUILT_IN_COLOURWAYS` | coincide | ninguno | - | done |
| 15 | Rail 68px, sticky bajo header, marcador activo 3px, hover/touch/Escape | `NavRail.tsx` | coincide | ninguno | - | done |
| 16 | Toast `.ms-toast`: fondo ink, 13.5/600, radius 12, centrado inferior | `components/ui/ToastProvider.tsx` | pendiente de revisar | comparar y ajustar medidas | baja | done (revisado: coincide) |
| 17 | Botones `.btn` radius 11 (components.css) / ui-polish radius 8 min-h 40 | `theme.ts` (MuiButton) | ui-polish prevalece en la ref: real = 8 | ninguno | - | done |

## Fuera de alcance
- `identity.js` switcher "Viewing as", `ms-mode.js`, sidecar `ms-branding.state.json`, `.uip-switch`: herramientas de demo.
- Persistencia en localStorage (footer/theme/crumb colours/logos): ya existe equivalente en DB (distributor-settings / platform settings); nuevos campos requerirían columnas.
- Buscador sin lógica en la ref; el real ya tiene búsqueda funcional.
- Contadores de rail de Calendar/Calls leen localStorage en la ref; en real dependen de backend (sección 09).
- Colores de banda de breadcrumb por categoría (`ms-crumb-colours`): requiere configuración persistida (sin tabla); se omite.

## Backend
Verificado: `basket`, `notifications`, `me`. Resultado: **cubierto** tras un cambio mínimo.

| Necesidad del chrome | Endpoint | Estado |
|---|---|---|
| Badge del Basket en cabecera (fila 1) | **`GET /api/basket/count`** -> `{ count }` (añadido; `projects.view`; mismo scope que `GET /basket`: cliente usa su org, distribuidor pasa `customer_organisation_id`, supplier 403). No calcula precios, apto para llamarlo en cada página | implementado + 2 tests jest (`basket.service.spec.ts`) |
| Campana + badge de no leídas | `GET /api/notifications/unread-count`, `GET /api/notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id`, preferencias y mutes | cubierto |
| Menú de cuenta (My profile) | `GET/PATCH /api/me`, `GET /me/profile`, subida de foto | cubierto |
| Buscador global | endpoints de listado existentes por módulo (store, projects, orders); la ref no define lógica | cubierto/sin requisitos |
| Colourways / branding | settings de plataforma y distribuidor ya existentes | cubierto |

### Fuera de alcance (backend)
- Newsletter del footer (la ref no envía nada; el real necesitaría tabla de suscriptores y respetar `private_mode_enabled`).
- Persistencia de colores de banda de breadcrumb y contadores de Calendar/Calls del rail (ver 09-comms).
