# Auditoría Frontend ↔ Referencia V2 — Ronda 1

Fecha: 2026-10-07. Repositorio: `/Users/AndreBE99/Codes/Merchsmith/merchsmith-frontend`. Referencia: `/Users/AndreBE99/Codes/Merchsmith/Merchsmith Platform Design V2`.

> **Actualización ronda 2:** implementación frontend realizada tras leer `REFERENCE-V2-AUDIT.md` y `BACKEND-V2-AUDIT.md`. Las secciones 1–9 conservan evidencia histórica de la ronda de auditoría; la sección 10 registra ejecución, correcciones de requisitos, checks y pendientes. No se utilizó navegador ni se cambiaron backend, DB o migraciones.

## 1. Alcance, evidencia y estado

- Auditoría estática, sin modificar código, iniciar aplicaciones, usar navegador ni lanzar otros agentes. Única escritura: este informe mediante `apply_patch`.
- Leídos `merchsmith-frontend/AGENTS.md`, `merchsmith-frontend/CLAUDE.md`, `Merchsmith Platform Design V2/CLAUDE.md`; consultadas las guías instaladas `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` y `01-app/02-guides/css-in-js.md`. Antes de implementar, ampliar las guías a las APIs concretas que se cambien.
- Primero se intentó `graphify query "AppLayout Sidebar Header routes pages shared UI components theme tokens" --budget 1800`: CLI ausente (`command not found`). Fallback: lectura del JSON y recorrido de adyacencias de profundidad 1, expandiendo los nombres a `Sidebar()`, `Header()`, `ThemeProvider()`, `Container()` y `BreadcrumbBandProvider()`.
- El grafo conecta `Sidebar()` y `Header()` con `src/app/(protected)/layout.tsx`; `Container()` con `ContentWidthProvider`; `ThemeProvider()` con `providers.tsx`; `usePageBreadcrumb()` con páginas de proyectos/organizaciones/home. Fuentes del grafo: `Sidebar.tsx:L32`, `Header.tsx:L213`, `Container.tsx:L19`, `ThemeProvider.tsx:L7`, `BreadcrumbBandProvider.tsx:L44/L116`. Se contrastaron con código actual: el grafo no sustituye al árbol de trabajo.
- Inspeccionados `git status --short`, `git diff --stat`, `git diff` del frontend. Hay 52 archivos tracked modificados en el snapshot inicial, además de muchas carpetas sin trackear. El diff grande quedó truncado por el harness; los hallazgos relevantes se verificaron leyendo los archivos actuales.
- Trabajo local existente incluye Basket/Checkout, Orders, Finance, Stripe, Dashboards, Targets, drafts/archives, dos proveedores, via-us, perfiles de proveedor, account managers y nueva creación de proyecto. **No son funcionalidades ausentes por no estar en HEAD.** Los tests locales también incluyen estos módulos.
- El repositorio raíz tiene trabajo previo de renombrado/separación de la referencia (carpeta antigua borrada, V1/V2 nuevas), configuración, documentos y ambos subrepositorios modificados. No se revirtieron ni normalizaron esos cambios.
- Referencia preliminar consultada: inventario de V2, `HANDOVER.md` (secciones Basket, Checkout, Orders, Finance, Targets, Dashboards, sample leads, two suppliers, Organisations, Calendar, Emails), `tokens.css`, `ui-polish.css`. El informe del coordinador debe resolver prioridades y contradicciones de la referencia antes de ejecutar.
- **Cobertura**: inventario de todas las entradas `src/app/**/page.tsx`, asociaciones a componentes/features y revisión transversal de shell, navegación, tokens y placeholders. Profundidad mayor en proyectos, organizaciones, home, finanzas, pedidos, store y settings. Las páginas auxiliares de CRUD/importación/documentos están cubiertas a nivel de entrada/módulo; no se afirma revisión línea por línea de todos sus componentes internos.
- No se ejecutaron tests/build/lint ni validaciones visuales en esta ronda. “Implementado” significa código y conexión frontend presentes, no éxito de una API, despliegue o paridad visual demostrados.

## 2. Resumen ejecutivo

La migración V2 ya tiene una base considerable en el árbol local. La mayor oportunidad inmediata es **conectar superficies antiguas a los módulos nuevos**, además de corregir navegación y coherencia visual. Las brechas confirmadas más relevantes:

1. Finance Dashboard existe, pero su enlace del rail sigue `pending`.
2. Búsqueda global sólo busca productos/proyectos; Orders existe pero no está conectado.
3. Home del cliente conserva Spend YTD en ComingSoon; organizaciones conservan Orders & spend/Products ordered/Service performance en Soon.
4. “View All Products” en proyectos cliente lleva a `/store`, no a productos de todos sus proyectos. La cuadrícula usa cuatro columnas grandes frente al máximo de tres de V2.
5. Calendar/Emails toman `?tab=` sólo al montar; un cambio de query en la misma ruta puede dejar el panel anterior seleccionado.
6. Accounting software es un placeholder explícito: faltan las siete conexiones y su UI de sincronización.
7. Newsletter del Store hace `preventDefault()` sin operación; Footer muestra “you're on the list” sólo cambiando estado React.
8. Rutas anunciadas sin página: `/team`, `/users/all`, `/supplier/distributors`, `/finance/invoices`; settings Domain y customer Platform logos siguen pendientes.
9. El theme está parcialmente alineado con `ui-polish`, pero hay múltiples fuentes de tokens, gutter diferente, colorways parciales y background de shell fijo.
10. La lista explícita de paths protegidos del proxy no incluye varias rutas reales añadidas. AuthProvider/backend siguen siendo relevantes; no se concluye acceso a datos sin autorización.

## 3. Inventario de rutas reales y cobertura por páginas

Convenciones de archivos: **P** = `src/app/(protected)`, **A** = `src/app/(auth)`, **R** = `src/app`. Cada sufijo de la columna archivo existe en el árbol local; los grupos enumeran explícitamente cada entrada. Las query tabs no son páginas adicionales de Next.

| Rutas | Archivos reales de entrada | Implementación / referencia / pendiente |
|---|---|---|
| `/` | `P/page.tsx` | Selecciona `components/{DistributorDashboard,CustomerDashboard,SupplierDashboard}.tsx`; Home V2. Spend cliente pendiente; revisar uso de Orders en home. |
| `/login` | `A/login/page.tsx` | Identity Platform email/password; shell auth. Sin brecha V2 demostrada. |
| `/forgot-password` | `A/forgot-password/page.tsx` | Recuperación real mediante auth client. |
| `/reset-password` | `A/reset-password/page.tsx` | Reset con parámetros URL. |
| `/accept-invitation` | `A/accept-invitation/page.tsx` | `useAcceptInvitationFlow.ts`, `AcceptInvitationViews.tsx`; Accept Invite V2. |
| `/auth/error`, `/auth/verify` | `A/auth/error/page.tsx`, `A/auth/verify/page.tsx` | Estados de auth/acción. `/auth/callback` figura público en middleware pero no hay `page.tsx` correspondiente. |
| `/change-password` | `P/change-password/page.tsx` | Flujo obligatorio de usuarios migrados; layout bloquea otras pantallas. |
| `/onboarding` | `P/onboarding/page.tsx` | `features/onboarding/OnboardingFlow`; cliente/distribuidor/proveedor, fullscreen. Referencias de tres onboardings. |
| `/profile` | `P/profile/page.tsx` | `features/profile/ProfilePage`; Profile V2, breadcrumbs. |
| `/recommended-standard` | `R/recommended-standard/page.tsx`, `standard.module.css` | Página pública editorial; Recommended Standard V2. |
| `/book/[slug]` | `R/book/[slug]/page.tsx` | `features/calendar/components/BookingPage.tsx`, params Promise + `use`. |
| `/pay/[token]` | `R/pay/[token]/page.tsx` | `features/stripe/components/PayPage.tsx`; pago público con token. Dependencia Stripe/backend. |
| `/store` | `P/store/page.tsx` | `StoreHome`, `StoreListing`, navegación de departamentos; Store/Home V2. Newsletter sin backend. |
| `/store/all` | `P/store/all/page.tsx` | Catálogo de Store, no productos de todos los proyectos del cliente. |
| `/store/range` | `P/store/range/page.tsx` | `features/store-range/StoreRangeScreen`; catálogo/range distribuidor. Operador redirigido a settings. |
| `/store/products/[productId]` | `P/store/products/[productId]/page.tsx` | Detalle/editor + componentes Basic/Pricing/Images/Categories/Attributes/Decoration; producto, notas/reviews, two-supplier local. |
| `/store/settings` | `P/store/settings/page.tsx` | Store home/layout configuration. Settings back office excluido del canvas blanco. |
| `/store/settings/footer` | `P/store/settings/footer/page.tsx` | Entrada auxiliar de footer; reconciliar con `/settings?tab=footer`. |
| `/store/pages/[slug]` | `P/store/pages/[slug]/page.tsx` | `resolveSitePage`, formularios con `useSendContactEnquiry`; Page V2. Plantillas legales pueden necesitar wording, no son newsletter. |
| `/projects` | `P/projects/page.tsx`, `page-client.tsx` | Distribuidor: `ProjectsDistributorBoard`; cliente: `CustomerProjectsBoard`. Projects/Distributor Projects V2. CTA All Products incorrecto. |
| `/projects/new` | `P/projects/new/page.tsx` | Wizard; `ExactProductFinder`, `LetsTalkCard`, `PaymentTermsBlock`, `wizardDrafts`; drafts, account manager, brand notes presentes localmente. |
| `/projects/[projectId]` | `P/projects/[projectId]/page.tsx`, `ProjectWorkspace.tsx` | Brief, tabla, ProductModal, Design/Price/Sample/Stock, comentarios, flags, equipo, print/CSV. No es shell ComingSoon. |
| `/projects/[projectId]/gallery` | `P/projects/[projectId]/gallery/page.tsx` | Mismo `ProjectWorkspace` con cards; Gallery V2. |
| `/brand-assets` | `P/brand-assets/page.tsx`, `page-client.tsx` | `features/organisation-brand-assets`; `?cat=` por categoría, compartido con Brief/Design. Brand Assets/Logos V2. |
| `/basket` | `P/basket/page.tsx` | `features/basket/components/BasketPage.tsx`; agrupación, cantidades, direcciones, resumen. Código nuevo sin trackear. |
| `/checkout` | `P/checkout/page.tsx` | `features/basket/components/CheckoutPage.tsx`; preview backend, validaciones, PO upload, métodos de pago. |
| `/orders` | `P/orders/page.tsx` | `OrdersList`, `OrdersDashboard`, `TargetsTab`; `?tab=all/stats/targets`, hash legacy. Targets sólo distribuidor. |
| `/orders/[orderId]` | `P/orders/[orderId]/page.tsx` | `features/orders/components/OrderPage.tsx`; acciones, documentos, supplier/customer/dist. |
| `/orders/[orderId]/placed` | `P/orders/[orderId]/placed/page.tsx` | `features/basket/OrderPlacedPage`; confirmación post-checkout. |
| `/orders/[orderId]/confirmation` | `P/orders/[orderId]/confirmation/page.tsx` | `features/finance/OrderDocumentPrint`; documento cliente. |
| `/orders/[orderId]/pro-forma` | `P/orders/[orderId]/pro-forma/page.tsx` | `OrderDocumentPrint`, tipo pro forma. |
| `/orders/[orderId]/invoice/[invoiceNo]` | `P/orders/[orderId]/invoice/[invoiceNo]/page.tsx` | `features/finance/InvoicePrint`. |
| `/orders/[orderId]/credit-note/[creditNo]` | `P/orders/[orderId]/credit-note/[creditNo]/page.tsx` | `features/finance/CreditNotePrint`. |
| `/orders/[orderId]/po/[poNo]` | `P/orders/[orderId]/po/[poNo]/page.tsx` | `features/orders/PurchaseOrderPrint`; supplier-specific data. |
| `/orders/[orderId]/delivery-note/[docNo]` | `P/orders/[orderId]/delivery-note/[docNo]/page.tsx` | `features/orders/DeliveryNotePrint`; via-us/split deliveries. |
| `/finance` | `P/finance/page.tsx` | Distribuidor: dashboard/subscription/customer-invoices/supplier-invoices/bank/integrations. Cliente: overview/invoices/terms. Proveedor: FinanceDashboard. No rutas `/finance/invoices` separadas. |
| `/organisations` | `P/organisations/page.tsx`, `components/OrganisationResults.tsx` | Customers/Suppliers, filtros/sort/paginación, drawers/invites/ghost. Map V2 sin integración detectada. |
| `/organisations/[organisationId]` | `P/organisations/[organisationId]/page.tsx` | Detalle organización; comparte features y perfil con drawers. |
| `/users` | `P/users/page.tsx` | `features/users/UsersPage`; usuarios del ámbito distribuidor. `/users/all` no existe. |
| `/settings` | `P/settings/page.tsx` | orgprofile, leadtimes, footer, pages, markup, discounts, branding, announcement, drafts, attributes, delivery, appearance; Subscription migra a Finance. Domain no existe en TABS. |
| `/settings/customer` | `P/settings/customer/page.tsx` | Perfil + AddressBook; `?tab=account` = CustomerAccountSummary. `?tab=logos` sin panel dedicado. |
| `/chats` | `P/chats/page.tsx` | Messaging/ChatSurface; chat compartido con FAB y SSE. Chats V2. |
| `/calendar` | `P/calendar/page.tsx` | `features/calendar/CalendarPage`; cinco tabs activos, cuatro vistas, invitaciones/free-busy/conexiones/booking. Query tabs sólo inicialización. |
| `/calls` | `P/calls/page.tsx` | `features/calls`; Twilio Voice SDK, historial/settings/dialer/phone provider. Calls V2. |
| `/emails` | `P/emails/page.tsx` | email-log/templates/compose; sent/drafts/snips/templates/signature/domain/reply; My emails deshabilitado. Query tabs sólo inicialización. |
| `/notifications` | `P/notifications/page.tsx` | notifications + announcement-bars; settings/inbox/live provider. Notifications V2. |
| `/supplier/products` | `P/supplier/products/page.tsx` | Productos y placement; `?f=rec` sí traduce a live, no es un bug de query. |
| `/supplier/approvals` | `P/supplier/approvals/page.tsx` | Aceptar/rechazar placements vía curated-range. |
| `/supplier/placement-history` | `P/supplier/placement-history/page.tsx` | Historial real, módulo supplier-portal. |
| `/supplier/billing` | `P/supplier/billing/page.tsx` | Billing/mandatos; importes proyectados MVP (`PHASE2_NOTE`), no cobros activos garantizados. |
| `/supplier/connection-requests` | `P/supplier/connection-requests/page.tsx` | Solicitudes de conexión/decisión. |
| `/supplier/deliveries` | `P/supplier/deliveries/page.tsx` | Respuestas de confirmación de delivery de proyectos. |
| `/supplier/sample-quotes` | `P/supplier/sample-quotes/page.tsx` | Cotizar samples. |
| `/supplier/stock-checks` | `P/supplier/stock-checks/page.tsx` | Responder stock por variantes. |
| `/supplier/price-quotes` | `P/supplier/price-quotes/page.tsx` | Cotización de precio + carriage local two-supplier. |
| `/supplier/orders` | `P/supplier/orders/page.tsx` | Redirect server a `/orders`, usa vista supplier allí. |
| `/supplier/settings` | `P/supplier/settings/page.tsx` | OrganisationSettingsPage + SupplierProfileCards (Decorating & delivery). |
| `/admin`, `/admin/overview` | `P/admin/page.tsx`, `P/admin/overview/page.tsx` | Entry/overview de consola; dashboard platform, MRR, activity, attention, invites. |
| `/admin/settings` | `P/admin/settings/page.tsx` | `features/platform/components/AdminSettingsPage.tsx`; profile/logos/colourways/data/backups. Reset vacío deshabilitado. |
| `/admin/permissions` | `P/admin/permissions/page.tsx` | `features/platform/permissions/PermissionsPageClient`; PlatformGuard. |
| `/admin/suppliers` | `P/admin/suppliers/page.tsx` | `AdminSuppliersList`; proveedores globales y drawers. |
| `/admin/subscriptions` | `P/admin/subscriptions/page.tsx` | `features/platform/plans/SubscriptionsPageClient`; planes/subscriptions. |
| `/admin/team` | `P/admin/team/page.tsx` | `PlatformTeamPageClient`; no equivale a `/team` tenant. |
| `/admin/users` | `P/admin/users/page.tsx` | `features/platform/user-directory/UsersPageClient`; columna Team todavía Soon. |
| `/platform/products` | `P/platform/products/page.tsx` | Catálogo admin, table/gallery, columnas, bulk, pagination, import mapping, brands/supplier drawers. |
| `/platform/curated-range` | `P/platform/curated-range/page.tsx` | `CuratedRangePageClient`; placements/recommended range. |
| `/platform/store-layout` | `P/platform/store-layout/page.tsx` | `StoreLayoutPageClient`; departamentos/sections/subcategorías. |
| `/platform/subcategory-mappings` | `P/platform/subcategory-mappings/page.tsx` | `SubcategoryMappingsPageClient`; mappings auxiliares. |
| `/platform/distributors` | `P/platform/distributors/page.tsx` | `DistributorEnvironmentList`; management global. |
| `/platform/distributors/new` | `P/platform/distributors/new/page.tsx` | `DistributorEnvironmentForm`; create environment. |
| `/platform/distributors/[environmentId]` | `P/platform/distributors/[environmentId]/page.tsx` | `DistributorEnvironmentDetail`. |
| `/platform/distributors/[environmentId]/edit` | `P/platform/distributors/[environmentId]/edit/page.tsx` | `DistributorEnvironmentForm` edición. |
| `/platform/distributors/[environmentId]/suppliers` | `P/platform/distributors/[environmentId]/suppliers/page.tsx` | `DistributorEnvironmentSuppliersPage`. |
| `/platform/distributors/[environmentId]/organisations` | `P/platform/distributors/[environmentId]/organisations/page.tsx` | `EnvironmentOrganisationsList`. |
| `/platform/organisations/[organisationId]` | `P/platform/organisations/[organisationId]/page.tsx` | `PlatformOrganisationDetail`. |
| `/platform/organisations/[organisationId]/edit` | `P/platform/organisations/[organisationId]/edit/page.tsx` | `PlatformOrganisationEditForm`. |
| `/product-categories` | `P/product-categories/page.tsx` | CRUD categorías real, permisos/tenant y selección distribuidor. |
| `/product-categories/new` | `P/product-categories/new/page.tsx` | Crear categoría. |
| `/product-categories/[categoryId]` | `P/product-categories/[categoryId]/page.tsx` | Detalle categoría. |
| `/product-categories/[categoryId]/edit` | `P/product-categories/[categoryId]/edit/page.tsx` | Editar categoría. |
| `/product-imports/csv` | `P/product-imports/csv/page.tsx` | CSV upload/mapping/import, API existente. |
| `/product-imports/feed` | `P/product-imports/feed/page.tsx` | Supplier feeds/config/test/mapping; asistente por backend. |
| `/supplier-category-mappings` | `P/supplier-category-mappings/page.tsx` | Mappings categorías proveedor, ruta auxiliar. |
| `/supplier-raw-records` | `P/supplier-raw-records/page.tsx` | Listado raw records ingestados. |
| `/supplier-raw-records/[recordId]` | `P/supplier-raw-records/[recordId]/page.tsx` | Detalle raw record, auditoría de importación. |

No se encontraron `src/app/**/route.ts`. Las APIs de negocio se consumen del backend, no de route handlers locales. `loading.tsx`, `error.tsx`, `not-found.tsx` y layouts/providers completan estados compartidos, no nuevas rutas.

## 4. Discrepancias por sección

### 4.1 Shell, navegación, búsqueda y deep links

**Existe:** root Providers (Query/Theme/Toast), AuthProvider, rail permanente 68 px con hover/focus/touch, Header/Search, Footer, BreadcrumbBandProvider, ContentWidthProvider; consola SystemAdminLayout y shell del default store separados. Messaging/Notifications/Compose/Phone son providers de larga vida.

**F-01 [P1, confirmado]** `Sidebar.navItems.tsx:627`: `pending('finance-dashboard',...)` sin `isImplemented:true`, frente a `finance/page.tsx:128` que renderiza FinanceDashboard. `Sidebar.tsx:137` convierte esa entrada en `href:undefined`. Habilitar enlace y revisar estados activos; actualmente los primeros enlaces sin activeQuery pueden ganar sobre tabs por “first match wins”.

**F-02 [P1, confirmado]** `GlobalSearch.tsx:14–16,43–65`: sólo Products/Projects y comentario “no orders module yet”. V2 chrome incluye Orders. `features/orders/api.ts:9` ya tiene listOrders. Añadir grupo respetando rol/permisos; revisar search frontend vs contrato backend (listOrders no acepta query en este archivo).

**F-03 [P1, confirmado estáticamente; reproducir después]** `CalendarPage.tsx:41–45` y `EmailsPage.tsx:95–99` leen window.location en initializer `useState`; no sincronizan la tab con cambios de query del router. Navegar desde rail a otra tab de la misma página puede conservar estado previo. Además botones de tabs sólo cambian estado, no URL. Reutilizar el patrón reactivo de Orders/Finance/Settings; no requiere DB.

**F-04 [P1, UX de auth]** `lib/auth/middleware.ts:29–42` enumera rutas antiguas y omite projects, orders, basket, checkout, finance, supplier, chats, calendar, calls, emails, notifications, profile, onboarding, brand-assets, change-password. El layout monta AuthProvider y el backend valida autorización: esto es una divergencia en la redirección inicial del proxy, no evidencia de lectura de datos no autorizada. Revisar contrato/matcher y ampliar con un test significativo de rutas; mantener públicas book/pay/recommended-standard/auth.

**F-05 [P2, confirmado]** Sidebar mantiene inertes `/supplier/distributors`, `/users/all`, `/team`, `/finance/invoices`, `settings-domain` y `customer-settings-logos`. No existen páginas para las cuatro primeras. No crear enlaces muertos ni equiparar admin team con team tenant. Supplier FinanceDashboard existe en `/finance`, pero el enlace supplier invoices sigue apuntando a un destino ausente.

### 4.2 Home / dashboards

**Existe:** home por rol y nuevos dashboards en Orders, Finance y Platform Admin (`features/dashboards/api.ts` apunta a `/api/dashboards/*`, `/api/supplier/dashboards/*`, `/api/platform/dashboards`). Targets ya es un módulo local.

**F-06 [P1, confirmado]** `CustomerDashboard.tsx:379–389`: Spend (YTD) muestra `—` y ComingSoon “needs Orders”, aunque Orders existe. Conectar la métrica correcta del dashboard o de pedidos, sin inventar totales. Home supplier también debe reconciliar el nuevo módulo de órdenes con su enfoque previo de delivery/sample/stock requests; pendiente revisión del informe Referencia para definir esa paridad.

### 4.3 Store, catálogo, producto, range y content pages

**Existe:** browsing/filter/listing, tarjetas, navegación, detalle/editor, imágenes, variantes, precios, decoración, notas/reviews, range y layout configurables; páginas editoriales/contacto y personalización de apariencia. El detalle local ya incorpora two-supplier, no proponer implementarlo desde cero.

**F-07 [P1, confirmado]** `StoreHome.tsx:201–204` newsletter no hace nada tras submit. `Footer.tsx:370–375` cambia `joined` y dice “you're on the list” sin persistencia/envío. Unificar comportamiento/feedback y validar email; la suscripción real necesita contrato existente o proveedor/backend, por lo que no presentarla como sólo UI.

**F-08 [P2, pendiente reconciliación]** `store/prototypeTokens.ts` usa neutrales/radios/shadow y títulos anteriores mezclados con global polish. Revisar product cards, bandejas y settings contra estilos activos V2, no sólo contra tokens.css base. `store/products/[productId]/page.tsx` tiene fallback `/images/product-placeholder.svg`: es fallback legítimo, no un módulo ficticio.

Las rutas de imports/categories/raw records son herramientas reales de operación sin necesariamente una HTML V2 dedicada. Su aceptación debe ser funcional, no eliminarse por ausencia del mockup. No se detectó una discrepancia concluyente de sus flujos mediante esta revisión de entradas.

### 4.4 Proyectos cliente/distribuidor, creación, workspace y gallery

**Existe:** boards por rol, filtros/sort, drafts servidor y archive por usuario; wizard exact product, payment terms, Let's talk, Brand & finish; workspace con brief real y line-items reales, export CSV/print sheet, gallery, comments/collaborators/flags, builders Design/Price/Sample/Stock. El `CLAUDE.md:71` todavía dice comments/flags/collaborators/gallery ComingSoon: descripción obsoleta.

**F-09 [P1, confirmado]** `projects/page-client.tsx:91–93`: CTA “View All Products” enlaza `/store`. V2 HANDOVER:566–568 exige productos **de todos los proyectos**, filtro de status/proyecto, agrupación y apertura en proyecto. No existe ruta dedicada para esto. `getProjectLineItemsBatch` ya permite reunir los datos sin DB nueva. Decidir ruta canónica con coordinador.

**Resolución R2:** el informe Referencia confirma que la página All Products no existe en V2. Se descarta crearla por esta nota histórica; se conserva el enlace real al Store y se renombra su CTA **Browse store**. Los KPIs siguen filtrando la grid existente.

**F-10 [P2, confirmado]** `CustomerProjectsBoard.tsx:268,284,289` usa `lg:3` en Grid de 12 columnas = cuatro cards/row. V2 exige máximo tres. Los stat items filtran proyectos in situ (`179–183`) en lugar de abrir All Products filtrado. Referencia agrupa ready/action como rojo; actual usa ready verde y ordered periwinkle. Conservar diferencia entre alerta y progreso y resolver la semántica acordada antes de cambiar colores.

**F-11 [P2, confirmado]** IconButtons Search y selección (`217,223–229`) no tienen aria-label, mientras Sort/Filter sí. Agregar nombres, aria-pressed cuando proceda, relación tab↔panel y navegación de teclado a las tab bars manuales (Finance/Orders/Settings/Calendar/Emails tienen roles pero no implementan por eso automáticamente comportamiento completo de tabs).

**F-12 [P1, reconciliación de datos]** `CustomerProjectsBoard.tsx:115–118` dice que delivered es a nivel proyecto y fuerza todas las líneas a delivered al cerrar proyecto. Orders ya tiene estados por línea. Comprobar con coordinador/backend cómo se reflejan entregas parciales; no cambiarlo a una estimación sin contrato.

**Ya presente en diff, no brecha:** sample lead overrides/defaults, warning customer shorter, carriage/two-supplier en PriceBuilder, Supply route en ProductTableRow, Brand notes reemplazando campo libre branding positions, exact product finder, reunión `?with=`. `SampleBuilder.tsx` conserva comentario ComingSoon histórico; no contar el comentario como un botón realmente bloqueado.

### 4.5 Basket, checkout, order placed y documentos

**Existe:** BasketPage, CheckoutPage, AddressBook, AddressDialog, SplitDeliveryDialog, AddToBasketButton, OrderPlacedPage; API para cantidades/variantes/drops/dirección global/PO upload/place order. `PO_MAX_BYTES` = 5 MB. Checkout consulta preview backend y bloquea por `missing`; payment methods dependen de disponibilidad backend. Las referencias V2 incluyen split deliveries, crédito y aprobación/T&Cs.

**Brecha de validación [P1]** Todos estos archivos son trabajo local nuevo. Antes de dar paridad por completa, reconciliar por item: subtotales por proyecto, lightbox visual aprobada, duplicate/remove, desglose colour×size, warnings order-by, sticky summary, PO policy number/upload, invoice finance contact, no-refund acknowledgement, pending approval, BACS deadline y card fees. No afirmar ausencia de estas funciones sólo porque no se probaron.

**Interacción sin DB:** abrir imagen/zoom, copiar ref bancaria, navegar al proyecto/line item, expandir variantes/direcciones, mostrar razones de bloqueo y focus en primer error; usar el preview backend para cálculos, no duplicar reglas económicas en React.

**Documentos:** existen tanto print components como `PdfDownloadButton`. No sustituir toda descarga PDF por window.print ni afirmar que todo es sólo impresión. Validar posteriormente formato/paginación y exclusión de chrome por cada tipo de documento.

### 4.6 Orders, supply workflow, samples, two-supplier y via-us

**Existe:** list/detail/acciones por rol; `orders/api.ts` contiene actOnLine, BACS paid, problems/resolve, invoices/credits, supplier adjustments, cancel, balance settlement, edit address, amendment, dates, change supplier, blank lane, comments/flags, drops, route, warehouse receive y documentos; upload firmado/complete y supplier invoice. Módulos locales `two-supplier`, `supplier-profiles`, `via-us` están conectados a producto/settings/drawers y pedidos.

**Brecha de validación [P1]** Confirmar paridad con V2 por flujo: acknowledgment/proof split-check, supplier lane visibility, customer receipt, untracked shipments, cambio proveedor y cancelación PO, amendments/reconfirm/balance/refund, adicionales proveedor, documentos/customer isolation, ship-together, warehouse damage y sample delivered→feedback. Los métodos frontend existen; esta auditoría no prueba que cada transición backend esté desplegada ni que la automatización de courier/Stripe sea real.

**Interacciones sin DB:** filters/date range/route/persistencia de vista, orden de columnas, CSV de vista/selección, fold variants, document previews, enlaces de contacto. Mantener supplier/customer/distributor como vistas de recursos con autorización backend, no datos semilla V2.

### 4.7 Finance, subscription, bank, integraciones y targets

**Existe:** tabs separados, CustomerInvoicesTab/SupplierInvoicesTab, pagos/reminders/chase/approve, bank details, customer own invoices/terms, dashboards, Stripe Connect/settings y payment page. Settings Subscription ya redirige a Finance, como V2.

**F-13 [P1, confirmado, dependencia backend]** `features/stripe/components/IntegrationsTab.tsx:135–139`: “No accounting package can be connected yet.” V2 `HANDOVER.md:596–616` exige Xero, Sage, QuickBooks Online, FreeAgent, Zoho Books, KashFlow y Clear Books, estados/filters/panel actions/sync log/settings/account/VAT mappings. Es un conjunto de integración OAuth/API/queues/webhooks, no una tarjeta clicable realizable sólo frontend. Reconciliar con informe de backend antes de construir una conexión simulada.

**F-14 [P2, confirmado]** Stripe puede ser `state.simulated`; UI lo expresa (`IntegrationsTab.tsx:26–29`, `CheckoutPage` test payment). Esto es dependencia de configuración y servicios, no promesa de cobro real. Supplier billing `PHASE2_NOTE` también usa proyecciones MVP. Separar configuración de Stripe y despliegue de infraestructura de los cambios UI simples.

**F-15 [P2, confirmado]** `/finance` tiene Integrations y Dashboard pero rail sólo anuncia parte de sus tabs; Dashboard además inerte (F-01). Customer overview existe pero rail sólo invoices/terms. Reconciliar navegación por rol con Reference Sidebar, evitando activar entradas sin panel.

### 4.8 Organisations, users, teams y profiles

**Existe:** organizaciones reales, filtros/paginación, drawers, invitations/activation, notas, onboarding checklist, ghost customer; nuevos account managers por customer/person, AddressBook embedded y SupplierProfileCards. Users/admin users/platform team son módulos distintos.

**F-16 [P1, confirmado]** `CustomerDrawerBody.tsx:107–129,154–174` y `SupplierDrawerBody.tsx:678–700`: Orders & spend con `—`, View all orders como span sin href (cliente), Products ordered SoonTable y delivery/ack service Soon. Orders/Finance existen. Conectar totales/último pedido/productos y un deep link de orders filtrado; distinguir métricas calculables de accuracy sin datos suficientes.

**F-17 [P2, confirmado a nivel de integración]** V2 Map switch/near/radius/legend (HANDOVER:719–724) no está integrado en `organisations/page.tsx` → `OrganisationResults.tsx`, ni hay módulo geográfico/dependencia Leaflet en package.json. La función de geocoding/lat-lng persistentes necesita backend o contrato externo; no confundir `Array.map` con mapa UI. Table/Cards/Map y estadísticas completas deben reconciliarse por separado.

**F-18 [P2, confirmado]** `features/platform/user-directory/components/UsersPageClient.tsx:420–435` columna Team = Soon. Rail tenant Team `/team` y All users `/users/all` inertes. V2 users distingue toda la gente con quien trabaja el distribuidor, teams y audit log. Verificar alcance de la lista `features/users` antes de reutilizarla como directory completo.

### 4.9 Settings por rol y admin

**Existe:** distribuidores: organisation profile, lead times/samples/via-us, footer/pages, markup/discount rules+codes, branding/appearance/announcement/drafts/custom attributes/delivery. Cliente: profile/address book/account summary. Supplier: profile + decoration/goods-in/carriage. Admin: profile/logos/colourways/backups/catalogue/permissions/plans/team.

**F-19 [P2, confirmado]** Sidebar Domain `?tab=domain` pendiente, pero Settings TABS ni lo acepta. Customer Platform logos también pendiente y `settings/customer/page.tsx` sólo discrimina account. V2 tiene custom domain, branded settings y logo management: decidir si se resuelve en branding existente o panel independiente. DNS/domain verification requiere backend.

**F-20 [P3, confirmado]** `features/platform/components/SettingsDataSections.tsx:215–218`: reset platform empty deshabilitado + Soon. El prototype localStorage backup/reset no debe transcribirse literalmente a una DB multiusuario. El download/restore ya tiene código distinto del reset; no tratarlos todos como ausentes.

### 4.10 Calendar, calls, chats, emails, notifications

**Existe:** Calendar tiene las cinco tabs `live:true` (la rama Soon es código condicional sin tab pendiente actual), booking y compare/freebusy; Calls tiene Twilio/browser phone; Chats live messaging/SSE, FAB, attachments; Emails compose/drafts/signature/templates/domain/reply; Notifications live provider y announcement bars compartidas.

**F-21 [P2, confirmado]** Emails “My emails” `live:false` (`EmailsPage.tsx:74`) y rail `emails-mine` pending. V2 pide per-category opt-outs/digest y signature allí. Signature ya existe como tab propia: falta unir preferencias según API disponible, no rehacer todo Compose.

**F-22 [P1/P2]** Deep links y persistencia: F-03 Calendar/Emails. `CalendarTab` añadió `useSearchParams('?with=')`, demostrando que el patrón reactivo está disponible. Calls/notifications/chats requieren validación posterior de contact actions/unread por rol y supervivencia durante navegación; ningún defecto visible se da por confirmado sin browser.

**Dependencias operativas:** Twilio numbers/Voice/recordings; calendarios Google/Microsoft/Calendly/iCal; email delivery/domain verification/inbound parsing; SSE de chats/notificaciones. No son módulos “sólo mock” por parecerse a la referencia localStorage.

### 4.11 Tokens, typography, spacing, polish y componentes compartidos

**Existe:** EB Garamond/Mulish, paleta base, MUI overrides, Lucide (`components/icons`), controls 8 px/cards 12 px, focus rings/reduced motion; colourway providers y StoreAppearanceScope. `components/ui` real contiene Button, ComingSoon, ConfirmModal, EmptyState, ErrorDisplay, LoadingSpinner, ToastProvider, SlideOverPanel, logo/avatar/selectors; no hay Table/Dialog/Tabs/Input/Select propios como sugiere el CLAUDE: muchos controles vienen directamente de MUI.

**F-23 [P2, confirmado]** Gutter V2 `tokens.css:12` y NavRail `PAGE_GUTTER` = `clamp(20px,2.5vw,36px)`; `theme.ts:191` = `clamp(20px,5vw,72px)`; Container wide = 95% + padding adicional y shell white bleed replica cálculos negativos (`layout.tsx:464–475`). Unificar alineación main/breadcrumb/footer antes de ajustes page-by-page.

**F-24 [P2, confirmado]** Globals usa ink `#222226`, ink2 `#3A3A44`, ink3 `#6B6B73` y tints rgba; `prototypeTokens.ts` y V2 base usan `#222222`, `#44444c`, `#55555c`, tints sólidos. `ui-polish.css` sobrescribe line/line-soft y tablas: no son discrepancias automáticamente todos los valores distintos de tokens.css. Sí existe multiplicidad de fuentes y reglas globales `th !important` de 13 px frente a algunas reglas V2 polish de 12 px. Resolver el estilo activo final y reducir duplicación.

**F-25 [P2, confirmado]** Woodland en V2 `tokens.css:44–54` cambia toda la paleta, paper/neutrals y sombras. `ColourwayOverride` sólo transporta primary/deep/ink/tint; providers no aplican todos los tokens Woodland. PlatformColourwayProvider sólo espeja `--ms-color-*`, mientras DistributorBrandingProvider también `--periwinkle*`/`--tint-peri`; componentes que usan nombres base pueden quedar con paleta original en admin. Verificar extensión permitida por configuración de colourways antes de aplicar una paleta entera.

**F-26 [P2, confirmado]** `layout.tsx:214–215,493–494` background tiene periwinkle/paper literales pese a branding provider. El theme puede variar, pero el canvas declara gradiente fijo. Usar tokens acordados; validar también portales/body scopes al cambiar tema.

**F-27 [P2, confirmado]** `AdminFooterBar.tsx:74–79`: Platform terms/Operator privacy son texto Coming soon, Support sí mailto. Las páginas legales del storefront no implican páginas legales operator. Requiere wording/config acordado; puede implementarse como contenido reutilizable sin nueva DB si se suministran textos.

## 5. Inventario de placeholders y falsos positivos

| Elemento | Evidencia | Estado / dependencia |
|---|---|---|
| Finance Dashboard link | Sidebar nav:627 | UI existente, flag de navegación obsoleto. |
| Orders en búsqueda | GlobalSearch:14–16 | Módulo existente, integración pendiente. |
| Spend YTD | CustomerDashboard:381 | Datos de Orders/Dashboards disponibles en frontend, wiring pendiente. |
| Orders & spend / Products ordered / delivery & ack service | CustomerDrawerBody / SupplierDrawerBody / drawerUi | Datos parciales y métricas por reconciliar. |
| Accounting connection | IntegrationsTab:138 | Backend/integraciones nuevas; no siete providers actuales. |
| Newsletter store | StoreHome:203 | Submit sin acción. |
| Newsletter footer | Footer:374 | Éxito sólo local React. |
| Team admin-directory | UsersPageClient:424 | Teams sin implementación en ese listado. |
| My emails | EmailsPage TABS mine live:false | Preferencias ausentes, Signature sí implementada. |
| Team/All users/Supplier distributors/Supplier invoices | Sidebar.navItems | Destinos inertes/sin página. |
| Domain/customer logos | Sidebar + Settings TABS | Sin panel dedicado. |
| Reset platform empty | SettingsDataSections:216 | Acción deshabilitada. |
| Operator legal pages | AdminFooterBar | Contenido pendiente. |
| Stripe simulated / supplier placement projections | StripeState / PHASE2_NOTE | Modo explícito/configuración y fase de negocio, no test de cobro real. |
| Product image placeholder | Product editor PLACEHOLDER_IMAGE | Fallback legítimo por falta de media. |
| HTML `placeholder=` en inputs | Múltiples formularios | Ayuda de entrada; no contar como funcionalidad ausente. |
| Calendar Soon branch | CalendarPage:93 | Ninguna tab actual está live:false; no brecha. |
| SampleBuilder comentario ComingSoon | SampleBuilder:223 | Comentario histórico; no evidencia suficiente de control inerte. |
| CLAUDE comments/gallery ComingSoon | CLAUDE:71 | Guía desactualizada respecto al código actual. |

## 6. Dependencias y contratos reutilizables

- Stack instalado declarado: Next **16.2.7**, React **19.2.4**, MUI **9.4**, TanStack Query **5.101**, virtual **3.14**, Firebase **12.17**, Lucide **1.48**, Zod **4.4**, Emotion **11.14**, Tailwind **4**, Twilio Voice **2.18**. pnpm **10.34.5**. Tests: Vitest **4.1**, MSW **2.14**, Playwright **1.60**.
- ApiClient/useAuth agregan token y contexto environment; hooks/query keys deben mantener separación tenant/rol. No incorporar vendor SDK de IA directo en frontend.
- Auth backend `/api/me`; endpoints frontend existentes de Basket/Checkout `/api/basket`, `/api/checkout`, direcciones y PO presign/complete.
- Orders `/api/orders` y supplier `/api/supplier/orders`; contienen operaciones económicas y archivos presigned. Finance `/api/finance/*` para registers/documents/payment/terms/bank.
- Dashboards `/api/dashboards/{orders,finance}`, supplier equivalentes y platform; reutilizables para métricas, sujetos a payload/definiciones del backend.
- Projects API + `getProjectLineItemsBatch` para vista cross-project; drafts/archives ya servidor. No usar localStorage como source of truth de proyectos/pedidos.
- Uploads dependen de presign/complete y object storage; correo, Twilio, calendarios y Stripe dependen de configuración backend. Accounting sync/map geocoding/domain management necesitan reconciliación de contratos.
- La referencia V2 usa localStorage y simulaciones. Eso permite especificar UX, pero no prueba que un endpoint backend exista. No copiar `ms-*` como persistencia de negocio.
- E2E registrados en `tests/e2e`: sólo `smoke.spec.ts`, `organisations.spec.ts`. Hay muchas pruebas de módulo en `src/__tests__` (incluidas nuevas locales de basket/orders/finance/stripe/dashboards/targets/two-supplier/via-us), pero no validación browser V2 completa comprobada en esta ronda.

## 7. Interacciones simples realizables sin DB nueva

| Prioridad | Acción propuesta | Reutiliza | Límite |
|---|---|---|---|
| P1 | Habilitar Finance Dashboard y corregir activeQuery de tabs | Página Finance y NavRail | Revisar rol y enlace supplier finance. |
| P1 | Sincronizar Calendar/Emails tabs con search params; back/forward | `useSearchParams`, router, patrón Finance | Sin endpoints nuevos. |
| P1 | Orders en búsqueda global | listOrders + HeaderSearch groups | Filtrado/permiso y volumen; no inventar búsqueda backend. |
| P1 | All Products across projects, group/filter/sort/open item | projects + line-items batch + deriveRowStatus | Ruta canónica y semántica partial delivery por acordar. |
| P1 | Order deep links desde drawers + spend/home | Orders/Dashboard data | Totales y scope exactos; no métricas estimadas. |
| P2 | Tres columnas, status palette y stat links | CustomerProjectsBoard / tokens | Reconciliar estados con Reference. |
| P2 | aria-label icon actions, tabs teclado, focus/escape | MUI/shared components | UI local. |
| P2 | Normalizar gutter/background/tokens | theme/Container/NavRail/providers | Verificar múltiples scopes y responsive. |
| P2 | CSV, expand rows/variants, copy bank ref, zoom/proof preview | Recursos/listas existentes | No altera reglas económicas. |
| P2 | Estados empty/error/loading coherentes | EmptyState/ErrorDisplay/LoadingSpinner | Evitar skeleton infinito si hay error API. |
| P3 | Limpieza de guías/comentarios obsoletos | CLAUDE y comentarios verificados | Tras reconciliación; no tocar ahora. |

No entran como “simple sin backend”: OAuth accounting, courier delivered webhooks, newsletter subscription real, geocoding guardado, DNS custom domains, cobros/refunds reales, equipos persistentes si falta modelo/API.

## 8. Propuesta priorizada y aceptación posterior

### P0 — Reconciliación síncrona antes de ejecución

- [ ] Integrar informe Referencia del coordinador; fijar HTML/CSS activo frente a páginas Previous/Concept/standalone.
- [ ] Registrar baseline del árbol local y confirmar qué módulos nuevos están desplegados en backend; no sobrescribir el trabajo previo.
- [ ] Acordar ruta All Products, nomenclatura de estados, delivered por línea vs proyecto y papel de home por rol.
- [ ] Resolver contradicciones HANDOVER: “ui-polish trial NOT YET CHOSEN” vs “polished platform-wide”; supplier lead removed vs tabla histórica que aún lo menciona; referencias a All Products HTML que no está en el inventario V2 actual.

### P1 — Navegación y superficies funcionales ya respaldadas

- [ ] F-01/F-15: Finance navigation y active states.
- [ ] F-03: URL ↔ tabs Calendar/Emails.
- [ ] F-04: lista de protección del proxy coherente con rutas reales/públicas.
- [ ] F-02: global order search.
- [ ] F-09/F-12: cross-project products y estados consistentes.
- [ ] F-06/F-16: métricas/pedidos en home y organisation drawers.
- [ ] Validación por rol del camino project → basket → checkout → placed → order → invoice/PO/delivery, usando datos reales permitidos y browser coordinado.

### P2 — Paridad visual/accesibilidad y huecos de páginas

- [ ] F-10/F-11: grid/colores/nombres accesibles y tabs teclado.
- [ ] F-23–26: gutter, canvas, tokens y colourways completos según configuración acordada.
- [ ] F-05/F-18/F-19/F-21/F-27: directory/team/domain/logos/email prefs/legal, discriminando reutilización de UI de dependencia backend.
- [ ] F-17: mapa y contrato de ubicaciones, si el coordinador confirma prioridad.
- [ ] F-07: decidir contrato newsletter y mostrar respuesta veraz.

### P3 / bloque dependiente de integración

- [ ] F-13: siete accounting providers + sync status/log/filter/retry/settings, coordinado backend.
- [ ] F-14: configuración Stripe/Voice/calendar/email y diferenciación de modos simulated/projection.
- [ ] F-20: decisión de producto sobre reset plataforma; no activar sólo el botón.
- [ ] Actualizar CLAUDE a V2/rutas/features reales tras cambios aceptados.

### Criterios de cierre de la siguiente ronda

1. Cada cambio vinculado a hallazgo y referencia reconciliada; hooks/api/types/barrels existentes respetados.
2. Checks focalizados de navegación/query/rol/cálculos/transiciones pertinentes; no escribir tests que sólo espejen CSS trivial.
3. Validación visual/funcional **con Playwright MCP**, cuando el coordinador libere la sesión browser: cuatro roles, default store/ghost, móvil y desktop, focus/tabs/portal/scroll/print. Esta ronda no la ejecutó.
4. No considerar “Done” las integraciones por renderizar un botón ni las APIs por existir mocks/MSW. Documentar por separado disponibilidad backend y configuración.

## 9. Handoff al coordinador

Informe preparado para reconciliación síncrona. Hallazgos confirmados F-01–27 se anclan a archivos actuales; las listas de validación no se etiquetan como funciones ausentes. La cobertura de rutas es exhaustiva a nivel de inventario, con profundidad estática indicada al inicio y validación browser pendiente por instrucción del usuario.

**No se modificó código frontend, tests, configuración, grafo ni referencia.**

## 10. Ronda 2 — ejecución y handoff

### 10.1 Reconciliación

- Leídos ambos informes completos en su contenido pertinente; se adoptó la precedencia HTML/módulos/CSS activos. V2 activa polish, full-width y gutter común. F-09 y la propuesta de enlaces KPI a All Products quedan **descartadas**: no hay nueva ruta All Products.
- Leídas las guías Next instaladas `layouts-and-pages`, `css-in-js`, `Link` y `use-search-params`: las URL de tabs son fuente de estado, las rutas client quedan dentro de Suspense y se preserva navegación Next.
- Se preservó trabajo previo en archivos modificados/no seguidos. Los cambios se aplicaron con `apply_patch`. Sin browser ni agentes adicionales.

### 10.2 Checklist ejecutado

- [x] **F-23/F-26 · SHELL-03:** Container siempre `width:100%; maxWidth:none`, gutter `clamp(20px,2.5vw,36px)`; DashPage ya no compensa un contenedor 95% mediante offsets negativos. Breadcrumb y Footer usan el mismo gutter. Store conserva canvas blanco mediante bleed exacto de un gutter, sin porcentajes acumulados.
- [x] **F-24/F-25 parcial:** neutrales ink/ink2/ink3 alineados con V2; theme pageGutter común; canvas neutral paper (tint sólo como acento), shell sin gradiente literal. PlatformColourwayProvider también publica `--periwinkle*` y `--tint-peri` para componentes custom/portales. Store/range, organisation profile y supplier settings sin caps administrativos antiguos.
- [x] **F-10/F-11 · PROJ-01/03:** máximo tres columnas grandes (también drafts), dots action/ready rojos, progress naranja, ordered/delivered verdes; card padding/título V2. Search/select/flag/comments con nombres accesibles. KPIs permanecen filtros de la misma grid.
- [x] **F-09:** CTA honesto **Browse store**, sin nueva página asumida.
- [x] **F-01/F-15:** Finance Dashboard y Integrations activos; Overview cliente disponible; supplier Finance apunta a `/finance` Overview y Placement billing conserva `/supplier/billing`. No enlace a `/finance/invoices` inexistente. Sidebar prioriza coincidencias de query sobre entradas overview; tabs Calendar/Emails/Customer settings y query links pendientes conocen sus query keys.
- [x] **F-03/F-11:** Calendar y Emails usan `useUrlTab`; click actualiza URL, cambios de query/back/forward actualizan panel y legacy hash se importa/conserva parámetros ajenos. Compose `?compose=1` se consume con router preservando tab. `PageTabs` MUI aporta arrows/Home/End, focus roving, tab IDs/aria-controls y panel etiquetado. También reutilizado por Finance y Customer settings.
- [x] **F-02:** búsqueda Orders sobre lista existente, referencia/PO/proyecto/customer/productos; request diferido hasta query activa, role/permission-gated y supplier hook con su endpoint propio. Default Store no busca Orders. **Límite:** listado actual del backend (hasta 500), no búsqueda histórica exhaustiva.
- [x] **F-06:** Spend YTD cliente desde `GET /api/dashboards/finance?per=ytd&cmp=prev`, `role=customer`, `kpis.spent_this_year.value` (importe facturado del año). Sólo con `finance.view`; error/missing/null = `—`, sin permiso = acceso requerido. No muestra cached money tras perder permiso.
- [x] **F-16 parcial:** CustomerOrdersSummary filtra por `customer_organisation_id`, nunca por nombre; count/latest/order value del **registro actual** (hasta 500), excluye cancelados del valor, link real `/orders?customer=<id>` y productos recientes. OrdersList aplica ese ID y ofrece quitar el scope. SupplierOrdersSummary filtra register de Finance por supplier ID y muestra PO count/expected value/latest, sin confundir coste previsto con pagos, con `finance.view`. No se inventan all-time spend/accuracy ni se suman registros de otro customer con igual nombre.
- [x] **F-18 parcial:** `/users/all` reutiliza UsersListTable tenant + DistributorGuard. Copy especifica usuarios activos del environment; supplier contacts sin membership siguen en Organisations. `/users` conserva Team distribuidor. No se reutilizó directory global platform para un tenant.
- [x] **F-19 parcial:** Customer settings tiene tabs profile/logos/account reales. Platform logos reutiliza upload/remove square logo autorizado (`square_logo_file_asset_id`); comunica que las versiones header/PDF separadas no están disponibles. Perfil no se mezcla con terms (account summary ya existente).
- [x] **F-07:** newsletter Store/Footer deja feedback explícito de no disponibilidad y email no guardado. Footer ya no dice “you're on the list” sin operación persistida. Store email tiene nombre accesible.
- [x] **F-04:** proxy enumera las rutas protegidas reales añadidas; book/pay/recommended-standard siguen fuera de esa lista. Sin cambios a guards/auth del backend.
- [x] **B-SIMPLE-01/03 compatibilidad frontend:** tipos monetarios de Orders permiten null; gbp(null/undefined) = `—`; totals/KPIs/profit/CSV no convierten missing/withheld en cero. Profit incompleto se presenta desconocido; payment ausente no se etiqueta Paid. SeriesPoint value/profit nullable y chart no dibuja beneficio desconocido a cero.
- [x] Corrección de HTML anidado detectada al comprobar AddressBook: Typography que contiene Chip usa `component="div"`.
- [x] `merchsmith-frontend/CLAUDE.md` referencia V2 y describe workspace/galería/comments reales; documenta full-width/KPIs/current-spec precedence.

### 10.3 Paths de implementación de esta ronda

Paths relativos a `merchsmith-frontend/` (sin atribuir a esta ronda todo el diff previo):

- Shell/theme: `src/components/layout/{Container,Sidebar,Sidebar.navItems,GlobalSearch,Footer,PlatformColourwayProvider}.tsx`, `src/app/(protected)/layout.tsx`, `src/app/(protected)/components/dashboardUi.tsx`, `src/app/globals.css`, `src/lib/theme/theme.ts`, `src/lib/auth/middleware.ts`.
- Tabs: **nuevos** `src/lib/utils/useUrlTab.ts`, `src/components/ui/PageTabs.tsx`; `src/features/calendar/components/CalendarPage.tsx`, `src/features/email-log/components/EmailsPage.tsx`, `src/app/(protected)/finance/page.tsx`, `src/app/(protected)/settings/customer/page.tsx`.
- Projects/Store/settings: `src/app/(protected)/projects/components/{CustomerProjectCard,CustomerProjectsBoard}.tsx`, `projects/page-client.tsx`, `store/components/StoreHome.tsx`, `store/prototypeTokens.ts`, `settings/components/OrganisationProfileTab.tsx`, `supplier/settings/page.tsx`.
- Home/orders/orgs: `src/app/(protected)/components/CustomerDashboard.tsx`, `src/features/orders/{hooks,types}.ts`, `orders/lib/{ordersTable,orderUi}.ts`, `orders/components/OrdersList.tsx`, `src/features/dashboards/{hooks,types}.ts`, `dashboards/components/dashUi.tsx`, `src/features/finance/hooks.ts`, `src/features/organisations/components/drawer/{CustomerDrawerBody,SupplierDrawerBody}.tsx`; **nuevos** `CustomerOrdersSummary.tsx`, `SupplierOrdersSummary.tsx` en ese drawer directory; `src/features/basket/components/AddressBook.tsx`.
- Users: **nuevo** `src/app/(protected)/users/all/page.tsx`.
- Testing: **nuevo** `src/test/navigation.ts`; **nuevos** `src/__tests__/lib/useUrlTab.test.tsx`, `features/layout/GlobalSearch.test.tsx`, `features/organisations/CustomerOrdersSummary.test.tsx`, `features/orders/unknown-money.test.ts`. Actualizadas pruebas existentes CalendarPage, EmailsPage, CustomerDashboard, OrdersList, sidebar-nav-items y Dashboards. El test router informa same-route URL changes, no sustituye una validación browser.
- Guía: `CLAUDE.md`. Informe: `../FRONTEND-V2-AUDIT.md`.

### 10.4 Checks y baseline separado

Entorno shell inicial sin Node/pnpm en PATH; se usó la instalación existente agregando `/Users/AndreBE99/.nvm/versions/node/v20.19.4/bin` a PATH. Sin instalar dependencias.

| Check | Resultado |
|---|---|
| Typecheck inicial, antes de ediciones | **FAIL baseline**, 7 diagnósticos: FinanceDashboard (3 nullable), OrdersDashboard (Stack prop + target shape), PlatformDashboard (2 nullable). Esos archivos reflejaron correcciones durante el trabajo compartido; no se atribuyen sus arreglos preexistentes/externos a este patch. |
| Lint inicial | **FAIL baseline**, 33 errores + 4 warnings; hooks effects/refs/purity, keys, unused/any en archivos previos. |
| Typecheck tras implementación | **PASS**, `pnpm typecheck` (también tras nullable chart). |
| ESLint focalizado archivos de esta ronda | **PASS**, sin diagnósticos. |
| ESLint global final | **FAIL baseline**, 33 errores + 3 warnings. Mismos errores iniciales; se eliminó el warning `no-unused-expressions` de CustomerProjectsBoard al cambiar toggle a if/else. El unused import introducido en SupplierDrawerBody fue corregido. |
| Tests afectados principales | **PASS 229 tests / 31 archivos**: layout, CalendarPage, EmailsPage, CustomerDashboard, CustomerProjectsBoard, organisation drawers/summary, Finance, Orders, Basket y useUrlTab. |
| Dashboard nullable charts | Primera pasada **PASS 5 / 1 archivo**; se añadieron 2 casos financieros de unknown/withheld y se registra su pasada final al cerrar esta sección. |
| `git diff --check` | **PASS**. El diff incluye trabajo previo; no equivale a changelog exclusivo de esta ronda. |
| Browser/E2E/build producción | Browser no ejecutado por instrucción (coordinador valida). No se ejecutó build ni E2E. |

Regresiones nuevas corregidas durante checks: mocks de App Router para componentes ahora reactivos, expectativas obsoletas de nav/Spend, nullable test fixture noUncheckedIndexedAccess y unused StatGrid. Los tests originales de estas superficies vuelven a pasar. Warning jsdom `window.scrollTo not implemented` en Finance es previo, no fallo de test ni prueba de scroll visual.

Baseline lint restante: `SupplierPortal.test.tsx`, `PriceBuilder.tsx`, `VisualProofSection.tsx`, `ProjectsDistributorBoard.tsx`, `StoreListing.tsx`, `LogisticsDeliverySection.tsx`, store product page, auth-provider/ghost-session/simulated-context, DeliveryCountriesTab/DiscountsTab/MarkupPricingTab, CustomFieldRows/ImportDistributorViewPreview/ManageFeedConfigsDrawer/NewFeedConfigurationDialog/ProductDetailDrawer/useFeedFieldMappingDialog/useFeedMappingWorkspace, supplier-category-mappings hooks y users api. No se silenció globalmente ninguna regla.

### 10.5 Pendientes explícitos

- [ ] **Browser coordinado**: gutter real a mobile/desktop, focus/keyboard/flyouts/portales, scroll main vs window, full-width Settings/Home/Admin y palette de Projects. Esta ronda prueba componentes/lógica, no paridad visual ejecutada.
- [ ] **Team cliente**: backend `TeamController`/`TeamService.resolveOrg` exige `distributor.users.manage` incluso para own-team. No se activó un enlace que produciría 403 para clientes ni se alteraron permisos backend.
- [ ] **Directory completo**: All users disponible como lista tenant activa, pero API `/users` no cubre supplier contacts sin membership, deactivated/history y todos los filtros/audit V2. No se presenta como paridad completa.
- [ ] **Customer logos completos**: square logo cubierto; header/PDF versions/crop/tone requieren contrato cliente, distinto del distributor branding. No se escribió branding de otro tenant.
- [ ] **Orders/spend históricos/service metrics**: los resúmenes usan registros limitados e IDs exactos. No hay aggregate all-time para org ni accuracy rates confiables en los contratos comprobados; delivery/ack accuracy siguen pendientes, no sustituidos por cifras inventadas.
- [ ] **B-SIMPLE contratos financieros finales**: backend agent implementa proyecciones/gates/costs. Frontend tolera null de Orders/Fig/Series y no supone missing=0; reconciliar el resto de shapes finales de targets/rankings/matrix antes de certificar ejecución end-to-end.
- [ ] **Domain, My emails prefs, operator legal content, reset platform vacío, mapa geocoding**, accounting y proveedores externos siguen pendientes por contrato/integración/contenido/alcance. Newsletter persistida requiere API/proveedor, no éxito React.
- [ ] **Woodland completo**: configuración actual sólo primary/deep/ink/tint; paleta ampliada/paper/neutrals de la referencia requiere definir su shape. Se aplican correctamente los tokens disponibles, no se atribuye soporte a campos inexistentes.
- [ ] Reconciliar otras composiciones V2 extensas (wizard fullscreen, modal/proof/print, Home por rol) con validación visual antes de declarar paridad completa. No se reescribió el workflow local previo como parte del ajuste de shell/nav.

Graphify: se localizó la instalación Python fuera de PATH. Se intentará únicamente actualización AST incremental de los archivos de esta ronda, preservando el grafo semántico y sin `--force`/extracción masiva; resultado se registra a continuación.

## 11. Validación responsive posterior — Admin móvil

- Playwright a viewport 390×844 en `/admin` reprodujo overflow horizontal de `Pipeline` del dashboard (7 pasos, grid intrínseco mayor que tarjeta). `documentElement.scrollWidth` no crecía, pero `main.scrollWidth` era 426px vs `clientWidth` 307px y las últimas etapas rebasaban el viewport.
- Ajuste en `src/features/dashboards/components/dashUi.tsx`: el pipeline ahora es región horizontalmente desplazable con nombre accesible y foco por teclado; columnas con mínimos definidos y min-width local únicamente bajo breakpoint móvil. El scroll queda dentro de la tarjeta.
- Revalidación Playwright 390px: documento width375, `main.scrollWidth===clientWidth===307`, pipeline viewport225 / contenido480 y tabIndex0; las siete etapas siguen disponibles sin desplazar la página.
- Checks posteriores: `pnpm typecheck` PASS; Vitest dirigido `src/__tests__/features/dashboards/Dashboards.test.tsx` PASS (8/8); `git diff --check` PASS. La suite amplia frontend conserva los cuatro fallos documentados en §10.4 (tres expectativas económicas y una expectativa vieja de newsletter), no relacionados con este ajuste.
- Captura móvil previa a completar carga: `.playwright-mcp/page-2026-10-08T02-24-47-589Z.png`; evidencia final verificada por mediciones DOM Playwright. Otras pantallas/roles y flujos siguen pendientes.
