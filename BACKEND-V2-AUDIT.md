# Backend V2 — auditoría y ejecución (rondas 1–2)

Fecha: 2026-10-07. Alcance: `merchsmith-backend/`, consumidores API de `merchsmith-frontend/` y referencia `Merchsmith Platform Design V2/`. Documento preparado para integrar en Summary y contrastar con los informes frontend/referencia de ronda 2.

## Cierre de ronda 2 — implementación y handoff

Leídos `REFERENCE-V2-AUDIT.md` y `FRONTEND-V2-AUDIT.md`. Las secciones de ronda 1 que siguen conservan la evidencia inicial; **este cierre y la checklist B-SIMPLE actualizada describen el estado posterior**. No hubo cambios DB/schema/migraciones, seeds, configuración de proveedores, frontend, browser ni subagentes en esta ejecución.

### Implementado

- **Crédito usado:** `projects/customer-account.ts` llama al cálculo real existente `finance/credit.ts`, en el mismo tenant/customer de checkout. Una cuenta sin pedidos debe devolver `0`; tabla no disponible (`P2021`) devuelve `null`; otros errores siguen siendo errores, no un crédito usado ficticio de cero.
- **Dos proveedores:** `getById` tiene opción interna `internalRoute` (no parámetro HTTP) para el engine. Customer conserva la proyección sin identidades, pero aprobación y cesta calculan carriage con `totalUnitCost` compartido. Carriage no cotizado es `null`, carriage cotizado como cero es `0`. El coste aprobado antiguo se limpia a null si la nueva aprobación no tiene coste completo. Freeze guarda el componente en el JSON snapshot existente; usa carriage total congelado/qty, sin refrescar quotes. Snapshots legacy de ruta doble sin ese componente se presentan con coste desconocido, no se reconstruyen con importes nuevos.
- **Profit honesto:** eliminado `precio / 1.42` de Orders, dashboard math y atribución/targets. Falta de coste contamina profit/margin/actual/diff del agregado a `null`, sin perder revenue o counts. Costes agrupados por supplier/product/customer también llevan null si el grupo contiene coste desconocido; el ranking usa sólo importes conocidos, no promete orden por beneficio real de grupos incompletos.
- **Proyección HTTP activa:** nuevo `FinancialResponseInterceptor`, conectado a controladores de líneas single/batch, diseño, precio, Basket/Checkout y Orders. Separa respuestas de datos internos completos. Customer no recibe supply route/two_supplier ni costes/markup; distributor sin `finance.view` conserva identifiers/fechas/sell/acciones, pero importes internos y listas financieras quedan enmascarados. Snapshots se recorren sin modificar JSON persistido. Stats de Orders usa la misma proyección y vacía team profit cards para caller no financiero. Supplier conserva sus costes propios mediante el scope existente de sus services.
- **Permisos concretos:** checkout place y price approve necesitan `orders.approve` además de `projects.manage` en controller, y service exige orders.approve antes de escritura. Liquidar balances y supplier adjustments requieren finance.view, también en service; PDF de PO distributor requiere finance.view (supplier propio conserva acceso). Targets y edición de dashboard goals requieren finance.view en service. **Orders list/get/act no exige finance.view**: Production conserva operación/dispatch. JSON de PO sigue accesible operacionalmente con importes enmascarados; no confundirlo con el PDF financiero.

### Contratos para el agente frontend (sin editar sus archivos)

| Campo / recurso | Contrato posterior | Tratamiento frontend |
|---|---|---|
| `customer-account.credit_used` | `number \| null`, cálculo persistido; 0 sólo si realmente no debe nada | `null` → no disponible, no £0 |
| `Orders.lines[].profit`, dashboard profit/margin y targets actual/diff | `number \| null` cuando falta coste; métricas restringidas también nullable | Usar `—` / “coste no disponible”, nunca estimar desde sell ni `Number(null)` |
| Price matrix live/frozen `cost`, breakdown y markup; line `target_unit_cost`; sample `cost`; basket `unit_cost` | Nullable en respuesta según audiencia | Customer renderiza sell; evitar casts o cálculos que conviertan null en cero |
| KPIs financieros en Orders Stats sin finance | Objetos conservados con valores null, no un reemplazo del objeto entero; `team_targets.cards=[]` | Mantener pipeline/counts/revenue; ocultar cards/tab financiero por permiso |
| `two_supplier` / `supply_route` customer | null en HTTP; **sí existe internamente** para cálculo | No inferir single supplier a partir de una respuesta customer |
| `two_supplier.carriage_total/per_unit` distributor | `number \| null`; qty usa total congelado cuando locked | null no significa envío gratis |
| Distributor no financiero `invoices/credit_notes/balance/supplier_adjustments` | Listas vacías; importes PO y credit_room enmascarados | No mostrar “sin deuda” por arrays vacíos de una proyección restringida; ocultar acciones finance |
| `/checkout` POST y `/price/approve` | 403 sin orders.approve, aunque projects.manage exista | Buyer/Admin y Admin/AM según permisos reales; no habilitar para Viewer/Studio por permiso grueso |
| Balance settle/supplier adjustments/PO PDF/targets | 403 sin finance.view; lectura operativa Orders conserva acceso | Filtrar los botones concretos, no bloquear toda la página Orders |

Los nullables necesitan reconciliación de tipos/render en frontend por su agente. La compatibilidad aquí preserva paths, sell y estructura operativa; no significa que todos los consumidores TypeScript existentes toleren null antes de esa adaptación.

### Checks ejecutados y baseline separado

- Entorno: `pnpm`/`node` no estaban en PATH del harness; se usó `PATH=/Users/AndreBE99/.nvm/versions/node/v20.19.4/bin:$PATH`.
- **Baseline antes de editar:** `tsc --noEmit` falló por TS2352/TS2345 en dashboard goals de `sales-targets.service.ts`; suite completa: **180 suites PASS, 4 FAIL; 2163 tests PASS, 2 FAIL**, dos suites no compilaban por esos errores. Los otros fallos: `platform-plans.service.spec.ts` por campo `payment_status` adicional y `calendar-google.spec.ts:211` en slots de fecha futura.
- **Final focalizado:** `pnpm test --runInBand --silent --testPathPattern='(customer-account|price-engine|project-line-items.service|basket|orders|dashboard|sales-targets|financial-response)'` → **33 suites y 347 tests PASS**.
- **Final completo:** `pnpm test --runInBand --silent` → **184 suites PASS, 1 FAIL; 2194 tests PASS, 1 FAIL**. Permanece el fallo baseline de `calendar-google.spec.ts:211`; no se modificó calendario para hacerlo pasar. Los fallos baseline de tipos/goals y platform-plans ya no aparecen en el árbol al cierre; sus correcciones concurrentes no se atribuyen a esta implementación financiera.
- **TypeScript:** `pnpm exec tsc --noEmit` PASS. `git diff --check` PASS en backend.
- Tests nuevos/ampliados: scope de crédito/tabla ausente vs outage; coste nulo vs cero, carriage customer y snapshot freeze/qty; unknown profit con revenue intacto; targets revenue/profit; proyección recursive live/frozen, mutation de datos internos prohibida; interceptor activo en controllers reales y PermissionGuard real con Production/Buyer/Finance. Las suites usan mocks de DB/proveedores; no son verificación de despliegue ni DB real.
- **Graphify:** intérprete instalado; `python -m graphify update . --no-cluster` actualizó grafo AST sin LLM ni clustering. El CLI reextrajo 1093 archivos no cacheados y reportó 9445 nodos/28925 edges; guardó backup curado `graphify-out/2026-10-07/`. Avisó que 142 SQL no aportan por falta de `tree_sitter_sql`; no se instaló dependency ni se hizo extracción semántica. La actualización fue de código del repo, no una validación del schema/DB.

### Pendientes de handoff

- [ ] Adaptar nullable types/render y botones por permiso en frontend; validar UI por el coordinador, fuera de esta sesión sin browser.
- [ ] Validar APIs con roles reales y tablas ya desplegadas en una ronda autorizada. Los mocks no certifican grants efectivos ni datos antiguos.
- [ ] No se amplió protección a toda API de catálogo/activity ni a adjuntos arbitrarios: la proyección está aplicada a los contratos confirmados arriba; una auditoría de seguridad exhaustiva de superficies adicionales queda separada.
- [ ] Gate quote pending/none/setup, workflows de approval de over-credit, idempotencia checkout y accounting sync mantienen el alcance pendiente identificado en ronda 1/referencia. No se inventó persistencia ni integración para completarlos.
- [ ] Fallo baseline calendario todavía pendiente; accounting, migraciones/despliegue y proveedores siguen bloqueados/no ejecutados.

## Summary listo para integrar

- **La API disponible en el árbol de trabajo cubre gran parte de V2**: tienda, catálogo y administración, proyectos/briefs, diseño y precios, proveedores, activos de marca, mensajería, notificaciones, onboarding, calendario, llamadas y correo. También hay módulos V2 de pedidos, cesta/checkout, finanzas, Stripe, dos proveedores, logística y objetivos, ya registrados en `src/app.module.ts:194–206`.
- **Código disponible no equivale a funcionalidad desplegada.** Los módulos recientes y 15 carpetas de migraciones aparecen sin seguimiento en git; el schema tiene 698 líneas añadidas. No se comprobó el estado de las tablas, permisos efectivos ni configuración de proveedores en ningún entorno.
- **Frontend puede avanzar reutilizando contratos existentes**, especialmente tablas, filtros, tarjetas, modales, formularios, tabs, impresión desde datos y navegación. No hace falta una API nueva para cada variación visual de la referencia.
- **Cambios backend realmente necesarios, sin nuevas tablas**: proyección segura de respuestas por audiencia/permiso; enforcement de acciones de aprobación y acceso financiero en pedidos/stats; eliminar beneficios calculados con costes ficticios; mantener cálculo interno de dos proveedores independiente de la audiencia; completar `credit_used` reutilizando el cálculo existente.
- **Bloqueo funcional confirmado**: sincronización contable bidireccional con Xero/Sage/QuickBooks/FreeAgent/Zoho Books/KashFlow/Clear Books no tiene módulo/API en el backend revisado. Stripe sí tiene implementación, pero su disponibilidad real depende de tablas, credenciales, Connect y webhook.
- **No se deben copiar semillas ni estados de localStorage como hechos persistidos.** La referencia es un prototipo, y varios estados financieros son simulaciones deliberadas.

## 1. Método, estado y límites de evidencia

- Leídos `merchsmith-backend/CLAUDE.md`, `merchsmith-frontend/AGENTS.md`, referencia V2 `CLAUDE.md`/`START-HERE.md` y entradas del Developer Index. No existe `CLAUDE.md` en la raíz del workspace.
- Primero se intentó `graphify query`; falló el binario del PATH. Fallback exitoso: `/Users/AndreBE99/.local/share/uv/tools/graphifyy/bin/python -m graphify query "projects orders finance basket dashboards supplier permissions" --budget 2000` desde backend. Grafo: 7.923 nodos; subgrafo de 170, salida truncada a 59. Se verificaron los hallazgos importantes contra fuentes; el grafo no demuestra despliegue ni datos reales.
- Inspeccionados `git status --short`, `git diff --stat` y `git diff` de backend. El diff completo incluía grafo y quedó truncado por el harness; los contratos críticos se verificaron leyendo las fuentes actuales. Las carpetas no seguidas no aparecen en el diff ordinario y también se inspeccionaron.
- Trabajo previo encontrado: cambios de schema/app.module, contratos de muestras/plazos, cotizaciones y cuenta de cliente; módulos no seguidos `orders`, `finance`, `basket`, `two-supplier`, `stripe`, `dashboards`, `sales-targets`, `order-social`, `via-us`, `supplier-profiles`, `project-drafts`, `project-archives`, entre otros. Se preservaron.
- **Validación estática**: existencia de rutas, DTOs, consumidores y lógica seleccionada. No se ejecutaron app, tests, llamadas API, browser, seeds, generación Prisma ni operaciones DB. No se afirma paridad visual ni éxito de extremo a extremo.
- Referencia principal reciente: Developer Index líneas 130–242 y 270–276; tienda/proyectos/pedidos/cesta del 30 de septiembre, integraciones y guía logística del 1 de octubre. `START-HERE.md` es de julio y sus pendientes no deben prevalecer sobre esas fuentes recientes.

### Convenciones

Todos los paths HTTP siguientes llevan `/api`. Paths `src/...` corresponden a backend; `src/features/...` citados como consumidor corresponden a frontend. **Cubierto** significa contrato en código; **condicional** añade dependencias nuevas de persistencia/configuración; **parcial** tiene un gap concreto. No se asigna porcentaje de paridad: no existe aún un inventario de requisitos exhaustivo validado por ronda 2.

## 2. Contrato transversal: identidad, tenant y permisos

**Cobertura:** token Identity Platform en `Authorization: Bearer`, tenant mediante `X-Distributor-Environment-Id`; `GET /me`, `/me/permissions`, `/me/environments`. `UseAppGuards` compone auth/tenant/permission; `UsePlatformGuards` significa autenticado sin tenant, no implica permiso de administrador.

**Evidencia:** `src/common/guards.ts`, `src/common/permission.guard.ts:8–27`, `src/me/me.controller.ts:37–89`, backend `CLAUDE.md:135–149`. La matriz de referencia está en V2 `people.js:29–58`; permisos ya definidos en `prisma/migrations/20261001220000_action_permissions/migration.sql:17–89`.

**Gap real:** si una ruta no declara permisos, `PermissionGuard` devuelve `true`. Controlar únicamente tipo de organización no distingue Admin, Studio, Production Manager, Account Manager y Finance. Ejemplos confirmados en secciones 8 y 12. Para operadores, el bypass `platform.admin` requiere considerar `assertMerchsmithAction` cuando aplica Owner/Billing.

- [x] B-AUTH-01 — Usar permisos recibidos por API y contexto de organización; conservar rutas supplier sin tenant.
- [ ] B-AUTH-02 — Aplicar permisos existentes a acciones críticas de pedidos/stats y definir proyecciones de dinero por audiencia; ver B-SIMPLE-01/02.
- [ ] B-AUTH-03 — Ronda 2: contrastar matriz frontend contra acciones efectivamente expuestas, sin asumir que un botón oculto protege la API.

## 3. Tienda, home, producto y navegación

**Cubierto:** `GET /store/products`, `GET /store/products/:id` (UUID/slug; `distributor_preview`), permiso `store.view`; `GET/PATCH /store-settings` (`store.view`/`store.manage`). Home editable y media se resuelven en el controlador. Catálogo, taxonomía, colores, marcas y reviews tienen módulos existentes.

**Evidencia:** `src/store/store.controller.ts:12–30`, `src/store-settings/store-settings.controller.ts:18–66`, `src/app.module.ts:153–176`; consumidores `store-browsing/api/store-browsing.ts`, `store-settings/api/store-settings.ts`, `store-layout/api/store-layout.ts`, `product-reviews/api/product-reviews.ts`. Referencia `Merchsmith Store.html`, `store-page.js`, `store-home.js`, Developer Index:131–140.

**Implementable frontend:** grid/gallery/lista, hover imagen secundaria, filtros y chips con datos recibidos, ficha con variantes y precio, home por secciones, rail, breadcrumbs, footer y estados vacíos. El control Suppliers/two-supplier ya tiene API propia; sección 7.

**Límite:** la tienda usa guards; no convertir su descripción antigua de “public-facing” en garantía de storefront anónimo. Navegación, contraste, anchos y tabs no justifican backend nuevo.

- [x] B-STORE-01 — Reutilizar listing/detail/config existentes para las composiciones V2.
- [ ] B-STORE-02 — Ronda 2: verificar filtros/campos requeridos que no existan realmente en response, y distinguir editor default-store de tenant.

## 4. Plataforma admin, catálogo, feeds, Recommended y estructura

**Cubierto en código:** CRUD `/products` (`products.view/manage/publish`), categorías, variantes, imágenes, stock, pricing, decoración, campos, atributos, tags, overrides, importaciones, feed configs, registros raw y validación. `/store-range/catalogue`, `/changes`, `/items`, `/mode`, `/reset`, `/tags` ya ofrecen catálogo de rango y acciones. Plataformas: `/platform/organisations`, `/platform/distributor-environments`, `/platform/plans`, `/platform/settings`, user-directory y activity.

**Evidencia:** `src/products/products.controller.ts`, `src/store-range/store-range.controller.ts`, `src/app.module.ts:167–192`, `src/platform-plans/platform-plans.controller.ts`; consumidores `products/api/products.ts`, `store-range/api/index.ts`, `platform/*/api/index.ts`, `product-import-data/api/imports.ts`, `supplier-feed-configs/api/feed-configs.ts`. Referencia `Merchsmith Admin.html`, `admin-products.js`, `admin-import.js`, `admin-curated.js`, `admin-storelayout.js`, Developer Index:193–228.

**Implementable frontend:** galerías, panel de detalle, selección/bulk con endpoints disponibles, tags, subcategorías, preview, tabs de import, reordenación de taxonomía y estados Recommended/Featured. Saved views, agrupaciones y shortcuts pueden ser UI si no requieren preferencia compartida entre dispositivos.

**Condicional/integración:** feeds vivos requieren proveedor y credenciales; no asumir que cada adapter del prototipo corresponde a un adapter backend probado. Mapeo y normalización específicos de Xoopar requieren contraste de campos en ronda 2.

**Dormancia deliberada:** `src/curated-range/supplier-curated-range.controller.ts:78–96` describe billing proyectado y mandate stub sin contacto con Stripe. Coincide con MVP gratuito del Developer Index:203. No activar cobros como parte de una adaptación V2.

- [x] B-ADMIN-01 — Mantener Recommended/Featured y sus aprobaciones como flujo existente; dinero de placement como proyección.
- [ ] B-ADMIN-02 — Ronda 2: clasificar campos/feed adapters pendientes individualmente; no usar payloads semilla para rellenar feeds ausentes.

## 5. Proyectos, Create Project, brief, borradores y archivos personales

**Cubierto:** `/projects` list/create, `/:id` get/patch/delete, `/:id/brief` get/put (`projects.view/manage`). `/projects/account-manager-candidates` y `/projects/customer-account` existen antes de `:id`. Brief acepta defaults y requested items; `brandNotes` documentado en DTO. `/project-drafts` ofrece CRUD por usuario/environment, máximo 10; `/project-archives` get/post archiva para el caller, distinto del delete global de proyecto.

**Evidencia:** `src/projects/projects.controller.ts:23–89`, `src/projects/customer-account.ts`, `src/projects/dto/upsert-project-brief.dto.ts`, `src/project-drafts/project-drafts.controller.ts`, `src/project-archives/project-archives.controller.ts`; consumidores `projects/api/projects.ts`, `briefs/api/briefs.ts`, `project-drafts/api.ts`. Referencia `create-project.js`, `cust-account.js`, `projects-page.js`, `dist-projects-data.js`.

**Implementable frontend:** wizard, resumen brief, contactos “Let's talk”, selección AM, tablas cliente/distributor, filtros por estado y vistas expandidas. `GET /project-line-items?project_ids=...` evita N+1 de líneas por proyecto.

**Gap simple confirmado:** `customer-account.ts:90` siempre devuelve `credit_used: null`, aunque ya existe `src/finance/credit.ts:7–16` y checkout lo usa. No renderizar `null` como £0. Reutilizar el cálculo, preservando tenant/customer; depende de disponibilidad de tablas financieras. Sin migración nueva.

**Dependencia:** drafts y archivo personal requieren las tablas de `20261001510000_project_drafts` y `20261001520000_project_user_archives`; aún no se acredita su disponibilidad. Duplicado masivo/reordenación de proyectos no se ha confirmado como operación atómica dedicada; que el UI tenga un botón no acredita contrato.

- [x] B-PROJ-01 — Conectar wizard/brief/AM a contratos actuales.
- [ ] B-PROJ-02 — Completar crédito utilizado real (B-SIMPLE-04); mientras tanto mostrar no disponible.
- [ ] B-PROJ-03 — Ronda 2: decidir alcance de duplicate/reorder/bulk/PDF con consumidores reales; no proponer un endpoint nuevo sin comprobar necesidad.

## 6. Workspace: diseño, precio, sample, stock y fechas

**Cubierto:** `/projects/:projectId/line-items` CRUD/reorder, `/:id/branding-build`, `/:id/sample-cost`; batch `/project-line-items`; diseño versionado `/design/versions`, `/design/:stage/submit`, `/design/versions/:versionId/approve` y request-changes; `/price-matrix`, `/price-locks`, `/price/additional-charges`, `/price/submit`, `/price/approve`, `/price/request-changes`, `/price/expire`, `/lock`, `/unlock`. Cotizaciones/stock/delivery tienen módulos project y supplier separados.

**Evidencia:** `src/project-line-items/project-line-items.controller.ts:27–129`, `src/project-line-items/project-line-item-design.controller.ts`, `src/price-engine/project-line-item-price.controller.ts:31–159`, `src/project-line-items/project-line-items.service.ts:41–117`; consumidor `project-line-items/api/project-line-items.ts:17–294`. Referencia `product-modal.js`, `pm-inset.js`, `delivery-confirm.js`, `price-engine-plan.md`.

**Contratos útiles:** `sample-cost` admite `supplier_lead`, `supplier_lead_blank`, `customer_lead` nullable (0–120 días); las líneas presentan `sample_leads`, fechas derivadas y procedencia; `null` en overrides restaura default. La matriz lleva `method_id`, `technique_code`, `has_value`, breakdown y `all_methods`; no inventar columnas/breaks ni unir técnicas por `method_code`.

**Gap P0 de presentación/privacidad:** list/get/batch propagan la fila de Prisma; `presentOrderBy` devuelve `...item`, no una allowlist para customer. El cliente recibe campos como `target_unit_cost`, JSON de sample cost/locks/snapshot cuando están almacenados. Además `/price-matrix` acepta `projects.view` y `computeForLineItem` devuelve celdas con `cost`, `item_unit_cost`, `deco_unit_cost`, `setup_cost`, `markup_multiplier`; la rama locked también devuelve matriz congelada sin proyección. Referencias: `project-line-items.service.ts:41–117,263–290`, `price-engine.service.ts:103–112,224–266`, `store/price-matrix.util.ts:50–76`. Ocultar la tab no corrige la respuesta.

**Implementable frontend:** reconstrucción modal/inset, tabs Design/Price/Sample/Stock, acciones y mensajes de 409, version history, warnings, layout de proof y print/PDF desde datos aprobados. Los PDF project/proof no se confirmaron como endpoint PDF propio; las rutas de factura/PO sí existen. Exportación local/print puede reutilizar contratos, sin declarar un documento nuevo persistido.

- [x] B-WORK-01 — Consumir estados y approvals backend, no escribir estados de prototipo en paralelo.
- [ ] B-WORK-02 — Proyección customer segura para líneas/matriz, incluyendo frozen snapshots (B-SIMPLE-01).
- [ ] B-WORK-03 — Ronda 2: mapping exacto de visual/proof tabs y payloads, y alcance de PDF server/local.

## 7. Dos proveedores y perfil proveedor

**Condicional, ya implementado:** `/two-supplier/products/:productId` get/put/delete, `/two-supplier/projects/:projectId` get y `.../products/:productId` put/delete; branded sample `.../line-items/:lineItemId/sample-stages` get/post. Read/write `projects.view/manage`; service distributor-only. Perfil `/supplier/profile` get, `/decorating` y `/carriage` put (`organisation.edit`); distributor `/supplier-profiles/decorators`, `/:id`, editing `distributor.suppliers.manage`.

**Evidencia:** `src/two-supplier/two-supplier.controller.ts`, `src/supplier-profiles/supplier-profiles.controller.ts`; consumidores `two-supplier/api.ts`, `supplier-profiles/api.ts`; referencia `two-supplier.js`, `Merchsmith Two-Supplier Developer Guide.dc.html`, Developer Index:171,196,276.

**Flujo cubierto:** default de tienda/override de proyecto, plazo combinado, item quote al blank supplier y decoration/setup al decorator; stock al blank supplier; carriage extras; sample stages; blank lane y PO doble en pedidos. `ProjectLineItemsService` oculta `supply_route` a customer/supplier.

**Gap de cálculo independiente de audiencia:** `PriceEngineService.twoSupplier` depende de `item.supply_route`; el customer recibe ruta null y el engine devuelve `two_supplier: null`. `ProjectLineItemPriceService.approve:131–159` añade carriage al coste sólo si `two_supplier` existe; por tanto una aprobación customer omite ese componente. `BasketService.priceLine:103–106` también obtiene coste de la matriz, sin sumar carriage. La ocultación de nombres de proveedores debe estar en la serialización, no eliminar información del cálculo interno. Corregir reutilizando ruta/quote persistida; sin tablas nuevas, pero requiere las existentes.

**Otro comportamiento a contrastar:** submit sólo bloquea `state === 'partial'` (`project-line-item-price.service.ts:94–102`), no pending/none. `quoteState` agrupa decoration/setup como parte decorator. La referencia dice que el precio no avanza hasta ambas respuestas (`two-supplier-quotes.ts:1–5`). Ronda 2 debe precisar cuándo quotes son obligatorias frente a costes manuales antes de endurecer el gate.

**Bloqueo DB potencial:** tablas de two_supplier/defaults/overrides, supplier profiles, sample stages y quote extras. Hay catches “table not migrated yet” que devuelven vacío/null/0. Un default vacío no acredita que una ruta de dos proveedores no exista.

- [x] B-TWO-01 — UI registry/default/override/perfil puede usar la API actual.
- [ ] B-TWO-02 — Corregir ruta interna/carriage de aprobación y checkout (B-SIMPLE-05).
- [ ] B-TWO-03 — Contrastar gates pending/none/setup con referencia en ronda 2.

## 8. Cesta, checkout y confirmación

**Condicional, contratos emparejados:** `/basket` get, `/lines` post y `/:id` patch/delete, `/:id/drops` put, `/apply-address`, `/addresses` CRUD; `/checkout` get/post, `/po-file/presign`, `/po-file/complete`. Lectura `projects.view`, mutaciones `projects.manage`; scope del customer propio o `customer_organisation_id` explícito del distributor.

**Evidencia:** `src/basket/basket.controller.ts:22–127`, `src/basket/dto/basket.dto.ts`, `src/basket/checkout.service.ts:69–119,198–299`; consumidores `basket/api.ts:9–41`, `basket/types.ts:85–123`. Referencia `basket-view.js`, `finance-view.js`, `confirm-view.js`, Developer Index:145.

**Shape disponible:** lines, totals, account, issues, código válido/off, `po_level: none|number|upload`, invoice contact, account/bacs/card availability, bank info, pay_by; place devuelve ref/id/status y card payment URL. PO máximo 5 MB. Precios quedan congelados en order dentro de una transacción y se limpia la cesta.

**Implementable frontend:** agrupación por proyecto, variants/splits, direcciones/apply-to-all, resumen, avisos order-by, PO según cuenta, aceptación de términos, confirmación y documentos.

**Gaps backend:** `BasketService.priceLine:133–143` devuelve `unit_cost` y carriage interno a todos; `/checkout` reutiliza `b.lines`. Separar cálculo interno de DTO customer. Checkout se autoriza por `projects.manage`, sin `orders.approve` en controller/service place; la matriz V2 dispone ya de ese permiso para Admin/Buyer o Admin/AM. Usarlo para colocar pedido, sin ampliar el acceso al resto de flujos.

**DB/config:** basket_lines/drops, customer_addresses, discount_codes, bank_details, orders/finance, rutas two_supplier y opcional Stripe. `CheckoutService.place:127–130` lee directamente ambas tablas two_supplier incluso para una línea single-supplier; no basta tener sólo las tablas de basket/orders.

- [x] B-BASKET-01 — Emparejamiento de paths y principales payloads frontend/backend disponible.
- [ ] B-BASKET-02 — Proyección de costes y permiso de checkout (B-SIMPLE-01/02).
- [ ] B-BASKET-03 — Confirmar prerequisites DB antes de presentar place como flujo funcional.

## 9. Pedidos, documentos y ajustes

**Condicional, amplia cobertura existente:** `/orders` list/detail (id/ref), `/lines/:lineId/actions`, problems/resolve, amend/address/dates/change-supplier, blank lane, splits/drop actions, route/via receive, cancel línea/order, supplier-adjustments, credit-notes/invoices, balance settle, bacs-paid y files presign/complete/url. Supplier tiene base `/supplier/orders` y scope de sus POs enviados.

**Documentos:** confirmation/pro-forma JSON y PDF; delivery-notes JSON; purchase-orders JSON/PDF; supplier invoice upload/read. No se encontró delivery-note PDF en el controlador revisado: frontend puede imprimir el documento JSON; sólo pedir backend PDF si es requisito confirmado.

**Evidencia:** `src/orders/orders.controller.ts:18–311`, `src/orders/orders.service.ts:67–209`, `src/orders/order-adjustments.service.ts:42–47`; consumidor `orders/api.ts:6–84`. Referencia `order-detail.js`, `order-amend.js`, `orders-table.js`, `order-page.js`.

**Compatibilidad verificada:** cada grupo de acciones principales de `orders/api.ts` tiene ruta equivalente; social endpoints están en otro controller bajo la misma base. Es correcto conservar supplier base sin tenant y hacer encoding de order ref/docNo.

**Permisos insuficientes:** gran parte de acciones/read no lleva `RequirePermissions`. `OrdersService.caller` sólo clasifica org; adjustments requiere distributor, no rol/acción. `finance.view` sí protege addInvoice/creditNote/bacsPaid/invoice-file; no protege por sí mismo todos los balances, PO amounts o `unit_cost`/profit. `OrdersService.list:156` devuelve profit a cualquier distributor, y la matriz V2 limita costes/margen/facturas a Admin/Finance (`people.js:51`). Alinear lectura y acción sin bloquear producción/dispatch legítimos de Production Manager.

**Datos inventados confirmados:** listado calcula profit con `unit_price / 1.42` cuando `unit_cost` es null (`orders.service.ts:156`). Mostrar desconocido o agregar sólo costes conocidos con indicador de cobertura, no beneficio “real”. Lista limitada a 500: filtros/export frontend de esos registros no representan todo el histórico.

- [x] B-ORD-01 — Reutilizar workflow/documentos/acciones en la UI V2.
- [ ] B-ORD-02 — Corregir permisos y proyección financiera por acción (B-SIMPLE-01/02).
- [ ] B-ORD-03 — Eliminar coste ficticio (B-SIMPLE-03).
- [ ] B-ORD-04 — Ronda 2: decidir paginación/export histórico y PDF delivery notes; no necesarios sólo por styling.

## 10. Logística: split delivery, via us, blank stock

**Condicional y existente:** `/shipping-via-us` get, `/settings` put, hubs post/put/delete; `distributor.settings.manage`. Basket/order drops y dispatch/deliver por drop; `/orders/:id/lines/:lineId/via/receive`, `/route`, `/blank`. Incluye plazos de handling, goods-in y delivery notes.

**Evidencia:** `src/via-us/via-us.controller.ts:19–49`, `src/orders/orders.controller.ts:137–164`, `src/basket/basket.controller.ts:43–48`, DTO `basket.dto.ts:223–262`; consumidores `orders/api.ts:36–56`, `basket/api.ts:14`. Referencia `via-us.js`, `split-delivery.js`, guía two-supplier.

**Implementable frontend:** matrices de reparto, warnings de cantidades/direcciones, book-in y estado de ruta. Datos de hub/rates deben venir de API; no usar direcciones de demo como dirección efectiva.

- [x] B-SHIP-01 — Contratos disponibles para settings/hubs/drops y acciones.
- [ ] B-SHIP-02 — Confirmar tablas `goods_in_hubs`, drops y two_supplier antes de habilitar flujo.

## 11. Finanzas distributor/customer

**Condicional, cubierto:** `/finance/bank-details` get/put; `/customer-invoices` register, detail, CSV, payments/reminders/email; `/supplier-invoices` register, detail, CSV, invoice, approve, payments/chase; `/my-invoices`, `/my-terms` get/put; invoice/credit-note-documents JSON/PDF. Todas las rutas del controller usan `finance.view`; services distinguen distributor/customer.

**Evidencia:** `src/finance/finance.controller.ts:31–202`, `src/finance/customer-invoices.service.ts:31–40,130–141`, `src/finance/credit.ts`; consumidores `finance/api.ts:4–39`. Customer admin posee `finance.view` en matriz; customer Finance no lo recibe en la referencia actual: no ampliar grant por el nombre del rol sin decisión explícita.

**Implementable frontend:** registros, KPIs, ageing, filters, drawers, selección/CSV, pagos manuales registrados, recordatorios, terms/PO y print/PDF. Register frontend llama endpoints correctos; existen export por filas POST y CSV GET adicionales, sin necesidad de implementar otra API.

**Límites:** customer register trae hasta 2.000 invoices y 2.000 credits. No equivale a contabilidad exhaustiva. Registrar pago no ejecuta transferencia bancaria. Private mode/disabled email no implica que se haya enviado un correo.

- [x] B-FIN-01 — Rutas y tipos principales frontend son compatibles con registros/acciones V2.
- [ ] B-FIN-02 — Confirmar schema/grants y presentar null/missing como desconocido, no como deuda cero.
- [ ] B-FIN-03 — Ronda 2: contrastar parciales/amendments y cobertura export con el volumen requerido.

## 12. Dashboards, Home y objetivos

**Condicional:** `/dashboards/orders`, `/dashboards/finance`, supplier equivalentes y `/platform/dashboards`; query `per`, `cmp: prev|yoy`, `wday: 1..31`. `/sales-targets` get, metric, members/months/fill/working-days. Plataforma invoca `assertMerchsmithAction(...,'finance')`. Targets read/write están protegidos por `projects.view/manage`, con service distributor-only.

**Evidencia:** `src/dashboards/dashboards.controller.ts:14–90`, `src/dashboards/dashboards.service.ts:132–181`, `src/sales-targets/sales-targets.controller.ts`, `sales-targets.service.ts:35–40,101–124`; consumidores `dashboards/api.ts`, `sales-targets/api.ts`. Referencia `dashboards.js`, `targets.js`, `home-page.js`.

**Gaps confirmados:** orders dashboard distributor devuelve gross_profit/margin/cost sin comprobar `finance.view` en la ruta de orders. Targets puede calcular profit y exponerlo con sólo `projects.view`. El cálculo matemático usa coste fallback `unit / 1.42` (`dashboard-math.ts:100–105`, `sales-targets.service.ts:123`). Corregir audience/permission y missing-cost; no se necesita nuevo almacenamiento para decir “no disponible”.

**Límite:** facts/attribution leen hasta 5.000 orders; no prometer aggregate global exacto si el volumen supera ese límite. Los KPIs Home de tareas/proyectos pueden componerse con contratos actuales; no se confirmó un `/home` agregado único ni es necesario para cambiar layout.

- [x] B-DASH-01 — Contratos disponibles para periodos, comparación y targets.
- [ ] B-DASH-02 — Aplicar finance gate/proyección y quitar fallback ficticio (B-SIMPLE-01/03).
- [ ] B-DASH-03 — Ronda 2: definir si se exige histórico completo o agregados de Home nuevos.

## 13. Stripe e integraciones contables

**Stripe, condicional y real código:** `/stripe` get, settings/connect/disconnect, `/invoices/:id/link`; `finance.view`, settings distributor-only. Públicas `/public/pay/:token` get/start/simulate; callback y webhook Stripe. Simulated gateway cuando falta secret key; real gateway implementa Connect OAuth, Checkout Session, refund REST.

**Evidencia:** `src/stripe/stripe.controller.ts`, `stripe.service.ts:57–101,139–192`, `stripe-gateway.ts:42–130`; consumidor `stripe/api.ts`. `simulated` es parte del contrato; frontend debe reflejarlo. Dependencias: tablas stripe_connections/payments, secret key, Connect client id, public URLs y webhook firmado. No se acreditó conexión/pago vivo.

**Contabilidad, gap complejo confirmado:** referencia `finance-integrations.js:10–13,30–37,56–61,90–93` pide siete proveedores, settings/from/numbering/tracking, sync log/retry y reconciliación bidireccional. El prototipo deriva estados con hash y retry los fuerza a synced en localStorage. No hay módulo contable importado en `app.module.ts`, ni controller/service equivalente a providers, OAuth, mappings, sync queue y payment reconciliation en el código examinado.

**No es un patch simple:** necesita contratos, persistencia de conexiones/tokens/links/estado, adapters, idempotencia, colas/reintentos y manejo de webhooks/polling. Un frontend puede mostrar integración no disponible y conservar CSV, pero no declarar synced ni generar refs contables ficticias.

- [x] B-INT-01 — Reutilizar Stripe settings/link/payment existentes con estado simulated explícito.
- [ ] B-INT-02 — Verificar entorno Stripe y tablas, fuera de esta ronda estática.
- [ ] B-INT-03 — Diseñar y priorizar accounting sync como proyecto DB/integración independiente; bloqueado para paridad funcional V2.

## 14. Organizaciones, usuarios, teams, perfil y onboarding

**Cubierto:** `/organisations` y profile/activity, customer/supplier invite, supplier search/connect, activate, archive/unarchive; `/account-managers` (`customers.manage`), `/supplier-terms` (`distributor.suppliers.manage`). `/users`, `/team`, `/organisations/:organisationId/team`, `/platform/user-directory`; perfil `/me/profile`, patch `/me`, photo upload-url/complete. Onboarding state/steps/billing/supplier-profile y progress/checklists/reminders de los tres tipos.

**Evidencia:** `src/organisations/organisations.controller.ts:32–173`, `src/users/*controller.ts`, `src/me/me.controller.ts:46–73`, `src/onboarding/onboarding.controller.ts:31–95`; consumidores `organisations/api/organisations.ts`, `organisations/profile/api.ts`, `users/team/api.ts`, `profile/api.ts`, `onboarding/api.ts`.

**Implementable frontend:** drawers people/organisations, invite/edit/deactivate, teams, cuenta propia, photos, checklist y recordatorios. Supplier search implementa match ≥80%/domain exacto según descripción controller; no reemplazarlo por listado global de proveedores para customer.

**Límite:** algunos controllers delegan autorización a services (no concluir falta de protección sólo por ausencia de decorator). Se ha demostrado esa insuficiencia específicamente en pedidos/stats, no en todas las rutas. No se confirma que onboarding plan+payment ejecute cobro de suscripción; seat/MRR calculado no demuestra billing live.

- [x] B-PEOPLE-01 — UI puede reutilizar los contratos de directorios/perfil/teams/onboarding.
- [ ] B-PEOPLE-02 — Ronda 2: contrastar permisos por acción, PO settings y contactos AM; no trasladar usuarios demo.

## 15. Brand Assets, comentarios y comunicación

**Brand Assets cubierto:** `/brand-assets` CRUD/files/archive/restore/bulk/projects/download, `/brand-asset-tags`, `/brand-assets-project-artwork`; `brand_assets.view/manage`. Consumidores `organisation-brand-assets/api/*`. Referencia `brand-assets.js`, `brand-assets.css`. Builder/brief pueden enlazar IDs reales; localStorage artwork no es evidencia de archivo almacenado.

**Chats/comentarios/notificaciones cubiertos:** `/messaging` summary/contacts/profile/search/link-search/settings, conversations/messages/attachments y SSE stream; `/notifications` list/unread-count/read-all/preferences/mutes/patch y stream; announcement bars. Person-scoped sin tenant, services limitan participantes. `/orders/:id/comments`, flags/flag y supplier comments existen en `src/order-social/order-social.controller.ts:18–55`; audiencia importa.

**Correo/calendario/llamadas cubiertos en contratos:** `/email-compose` drafts/send/attachments/saved-replies/signature, email log/templates/domain/reply; `/calendar` events/respond/propose/busy/availability/notes/feed y Google/Microsoft/Calendly; `/calls` logs/settings/policy/contacts/token/numbers/recordings/transfer y Twilio callbacks firmados.

**Evidencia:** `src/messaging/messaging.controller.ts`, `src/notifications/notifications.controller.ts`, `src/email-compose/email-compose.controller.ts`, `src/calendar/calendar.controller.ts`, `src/calls/calls.controller.ts`; consumidores `messaging/api/index.ts`, `notifications/api.ts`, `email-compose/api.ts`, `calendar/api.ts`, `calls/api.ts`.

**Implementable frontend:** listas/tabs, thread UI, read states, filtros, preferencias, agendas, composer y logs. Entrega real de correo, telefonía, grabaciones y calendarios externos depende de configuración y servicios; no prometer disponible por existir el endpoint. SSE debe usar auth correctamente. No se observó necesidad concreta de endpoints nuevos para la presentación V2 de estas áreas.

- [x] B-COMMS-01 — Contratos disponibles para interfaces V2.
- [ ] B-COMMS-02 — Ronda 2: distinguir conectores configurados, funcionalidades ausentes y cambios puramente visuales.

## 16. Settings, branding, apariencia, páginas y suscripción

**Cubierto:** `/me/environment/settings` get/patch para configuración JSON validada; `/me/environment/organisation`, `/subscription`, `/email-drafts` y contact-enquiry. Home/range/markup/discounts tienen APIs específicas. Footer/logo media se resuelven por asset ID, no URL temporal persistida. Suscripciones platform plans incluyen subscriptions/MRR-history con action finance.

**Evidencia:** `src/me/me.controller.ts:105–180` y DTO `update-environment-settings.dto.ts`, `src/me/distributor-account.controller.ts:24–70`, `src/platform-plans/platform-plans.controller.ts:25–69`; consumidores `distributor-settings/account/api.ts`, `store-settings/api/store-settings.ts`, `markup-rules/api/markup-rules.ts`, `discounts/api/*`. Referencia `store-appearance.js`, `site-content.js`, `billing.js`, `lead-times.js`.

**Implementable frontend:** configuración de branding/footer/appearance/content sobre campos admitidos, subscription/readout y draft emails. Validar cada key contra DTO; existencia de JSON no significa aceptación arbitraria de cualquier estructura de prototipo. No inventar política legal ni cuota cobrada a partir de proyección.

- [x] B-SET-01 — Reusar stores/API existentes y persistir asset IDs.
- [ ] B-SET-02 — Ronda 2: mapping de nuevas keys appearance/pages a DTO actual antes de reclamar gap backend.

## 17. Cambios simples realmente necesarios (sin nuevas migraciones)

Las tareas siguientes fueron ejecutadas en ronda 2 para los contratos confirmados; ver cierre al inicio para alcance, pruebas y handoff. “Sin migración nueva” no implica independencia de las tablas nuevas ya presentes en trabajo previo.

| ID / prioridad | Cambio preciso | Evidencia / compatibilidad |
|---|---|---|
| B-SIMPLE-01 / P0 | Proyectar DTO público por audiencia/permiso: eliminar costes/markup/supplier-only data de líneas, matriz live/locked, basket/checkout y dinero no autorizado de pedidos/stats/targets. Mantener datos internos completos para cálculo. | Fuentes secciones 6,8,9,12. Tipos frontend ya tienen algunos campos opcionales (`BasketLine.unit_cost`); donde sean obligatorios, actualizar tipo/render a optional/null, conservando sell/status/actions. Nunca resolver sólo ocultando tabs. |
| B-SIMPLE-02 / P0 | Aplicar `orders.approve` donde se coloca/aprueba quote/order y permission/action financiera existente en mutaciones pertinentes; preservar acciones de producción por rol. Para operadores, aplicar matrix gate específico cuando corresponde. | `checkout` usa sólo projects.manage; adjustments sólo distributor; permiso orders.approve ya existe. No crear nuevos roles/grants ni globalmente exigir finance.view a toda la página Orders. |
| B-SIMPLE-03 / P1 | Quitar coste `sell / 1.42` en orders/dashboard/targets; devolver unknown/null o agregados con cobertura explícita cuando falta coste real. | `orders.service.ts:156`, `dashboard-math.ts:100–105`, `sales-targets.service.ts:123`. No escribir un coste estimado como real ni backfill inventado. Requiere adaptar tipos y cards frontend. |
| B-SIMPLE-04 / P1 | Completar customer-account.credit_used con `finance/credit.ts`, compartiendo definición con checkout y guardando tenant/customer. Si persistencia no disponible, no sustituir por cero. | `projects/customer-account.ts:90` frente a `finance/credit.ts:7–16`, checkout:65–75. No hay necesidad de columna credit_used. |
| B-SIMPLE-05 / P1 | Separar resolución interna de supply route de su presentación y añadir carriage al coste usado en aprobación/cesta/order de forma consistente, también si el caller es customer. | `price-engine.service.ts:269–286`, `project-line-item-price.service.ts:131–159`, `basket.service.ts:103–106`; reutilizar datos de ruta/extras reales. No exponer identidades para solucionar cálculo. |

- [x] B-SIMPLE-01 — Proyección público/interno aplicada en líneas/precio/diseño/cesta/checkout/Orders y stats; handoff nullable frontend pendiente.
- [x] B-SIMPLE-02 — Permisos concretos en aprobación/pago/targets, con lectura/acción operativa Production preservada y tests de guard.
- [x] B-SIMPLE-03 — Missing cost propagado como null sin inventar beneficios.
- [x] B-SIMPLE-04 — Crédito real compartido con checkout; unavailable no equivale a cero.
- [x] B-SIMPLE-05 — Ruta interna/carriage consistente con aprobación customer/cesta, incluido freeze/qty y unknown.

## 18. Bloqueos complejos y disponibilidad no demostrada

| Área | Dependencia encontrada | Decisión para Summary |
|---|---|---|
| Pedidos/checkout/finanzas | Migraciones no seguidas `20261001460000_orders_core` a `20261001480000_orders_finance`, bank_details `...150000`, pay_by `...153000`, basket `...154000` | Código listo para integrar, despliegue/DB no certificado; no duplicar módulos. |
| Social/splits/logística/two-supplier | `...149000_two_supplier`, `...155000_order_social`, `...156000_basket_drops`, `...157000_goods_in_hubs`, `...158000_two_supplier_project` | Requiere persistencia y schema/grants compatibles; varias lecturas silencian fallo de tablas. |
| Drafts/archivos/targets | `...151000_project_drafts`, `...152000_project_user_archives`, `...159000_sales_targets` | No sustituir tablas ausentes con una falsa confirmación de guardado. |
| Stripe | `...160000_stripe`, credenciales/Connect/URL/webhook | Integración ya codificada; modo real no validado. |
| Accounting | No módulo/contrato para siete proveedores | Bloqueo funcional nuevo: diseño DB + integraciones; no simple CRUD de settings. |
| Placement/subscription billing | Placement billing intencionalmente dormant; datos seat/MRR no equivalen a cobro | Mantener presentación de proyección; cobro real es alcance separado. |
| Feeds, GCS, email, Twilio, calendars | Proveedores/credenciales/storage/config externas | Contratos permiten UI; comprobar disponibilidad en ronda autorizada posterior. |

Los nombres de carpetas son evidencia de trabajo local, **no de migración aplicada**. Esta auditoría no decide ni ejecuta cambios DB. Fallos ocultos con `catch(() => [])`, `null` o `0` deben tratarse como disponibilidad desconocida; distinguirlos de “no hay registros” puede requerir un cambio de contrato simple, pero habilitar tablas es dependencia de despliegue.

## 19. Checklist de integración con informes ronda 2

- [x] B-R1-01 — Auditar árbol backend actual, diff y contratos frontend seleccionados; documentar fuentes y límites.
- [x] B-R1-02 — Identificar funcionalidades disponibles para frontend y evitar creación duplicada de APIs.
- [x] B-R1-03 — Identificar gaps backend concretos y separar DB/integraciones.
- [x] B-R2-01 — Recibidos informes frontend/referencia; reconciliados los gaps financieros confirmados con IDs B-SIMPLE.
- [ ] B-R2-02 — Reconciliar fields/enum/nullable/output específicos; los paths coincidentes no prueban shape exhaustivo.
- [ ] B-R2-03 — Resolver requisitos abiertos: gates de quote two-supplier, bulk/duplicate/reorder, PDFs project/proof/delivery y export histórico.
- [ ] B-R2-04 — Definir orden de implementación: P0 protección/acciones; P1 integridad monetaria/crédito; UI disponible; persistencia/integraciones sólo con alcance autorizado.
- [ ] B-R2-05 — Actualizar Summary distinguiendo implementado en fuente, validado ejecutando y bloqueado. No marcar checkbox de implementación por presencia de una función o tests preexistentes.

### Conclusión

La prioridad no es ampliar indiscriminadamente el backend: es aprovechar contratos V2 ya existentes, corregir las proyecciones/permisos e integridad monetaria demostradas, y no presentar módulos que dependen de tablas/configuración como flujos operativos confirmados. Accounting sync es el principal gap funcional complejo confirmado. El resto de diferencias específicas de pantalla/campo se cerrará con los informes de ronda 2.
