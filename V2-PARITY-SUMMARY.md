# Summary de paridad V2 — reconciliación síncrona, ronda 2

Fecha: **2026-10-07**. Responsable del Summary: Coordinación. Estado: **reconciliación e implementación de brechas simples realizada; validación automatizada parcial; validación visual en navegador pendiente**.

## 1. Fuentes, alcance y estados

Fuentes persistentes leídas completas:

- `FRONTEND-V2-AUDIT.md` (**F**): inventario de rutas, hallazgos F-01…F-27, contratos y límites de revisión.
- `BACKEND-V2-AUDIT.md` (**B**): contratos B-*, cinco cambios B-SIMPLE-01…05 y dependencias de DB/configuración.
- `REFERENCE-V2-AUDIT.md` (**R**): requisitos con IDs SHELL/PROJ/PM/ORD/etc., páginas vigentes/documentales/anteriores.
- Contraste adicional de código de referencia en ronda 2: `Merchsmith Projects.html:165–241`, `ui-polish.css:550–805`, `Merchsmith Store.html:430–589` y reglas de `components.css`. Todos bajo `Merchsmith Platform Design V2/`.

**Ronda 2:** Frontend y Backend reportaron cambios implementados en el árbol de trabajo. `pnpm typecheck` frontend PASS. Suite amplia frontend: 1.042 tests PASS y 4 FAIL: tres aserciones `ProductModal`/`PriceBuilder` esperan valores económicos en un fixture customer y una expectativa antigua de newsletter; pendientes de reconciliar. Backend reportó typecheck PASS, 33 suites/347 tests focalizados PASS; suite completa 184 suites PASS y 1 fallo baseline en `calendar-google.spec.ts:211`; `git diff --check` PASS. No se ejecutaron migraciones ni pruebas con DB configurada. Playwright abrió `/`→`/admin`; captura desktop 1440×900 en `.playwright-mcp/page-2026-10-07T23-58-28-298Z.png`. Shell/rail68/AdminFooter visibles. El arte de fondo es el wordmark outline multicolor exigido por `Merchsmith Admin.html:288–292`, no un gradiente discrepante. Mobile reprodujo overflow del pipeline (main scrollWidth426/client307); corregido como scroll horizontal interno accesible. Recheck Playwright mobile: document width375, main scrollWidth=clientWidth307, pipeline viewport225/contenido480. Vitest dashboard 8/8 y typecheck PASS. Otros roles, Store y workflows pendientes.

| Estado usado | Qué demuestra |
|---|---|
| **Gap confirmado estático** | Archivo/contrato citado demuestra diferencia concreta; no necesariamente reproducida en browser. |
| **Código/contrato presente** | Existe en árbol local, incluidas carpetas nuevas sin trackear; no equivale a despliegue ni flujo operativo. |
| **Validación pendiente** | No se demostró ausencia; falta contrastar campo, transición, rol o aspecto con runtime. |
| **En curso, evidencia pendiente** | Coordinación asignó implementación; sigue abierto hasta reporte del agente. |
| **DB/config no acreditada** | Schema/migraciones/proveedor existen o se requieren, pero entorno no comprobado. |
| **Documental/decisión aparte** | No es automáticamente una pantalla faltante que implementar ahora. |

### Clasificación de trabajo y responsables

- **S — simple:** CSS, layout, responsive, accesibilidad, URL/tabs, navegación, mensajes veraces y presentación con datos disponibles.
- **API existente:** wiring o corrección de contratos/lógica sobre módulos ya presentes; puede necesitar DB/migraciones previas, **sin nueva tabla por este cambio**.
- **DB-integración:** persistencia/contrato nuevo, despliegue de schema existente o proveedor externo. Distinguir esas tres causas en el handoff.
- **FE:** agente Frontend. **BE:** agente Backend. **COORD:** coordinador de alcance/contratos/aceptación. **OPS:** responsable de despliegue/credenciales/DB. **QA/COORD:** browser coordinado, cuando se autorice. Son asignaciones funcionales, no nuevos agentes lanzados aquí.
- **Prioridades:** P0 autorización/integridad económica; P1 wiring y caminos principales; P2 paridad visual/interacciones secundarias; P3 decisiones o integrations no realizables como patch simple. Gutter y shell se ejecutan antes de ajustes locales aunque etiquetados P2 en F.

## 2. Decisiones cerradas y correcciones de la ronda 1

Estas decisiones son el target para la implementación actual. **No se modifican los informes anteriores**: este documento conserva sus IDs y registra la corrección.

| Decisión | Evidencia y conciliación | Instrucción concreta |
|---|---|---|
| **DEC-01 · Projects KPI** | `projects-page.js:98–104`; R-PROJ-02; F-10 confundía nota histórica con comportamiento actual. | KPI filtra la misma grid. No redirigir KPI a All Products. Mantener filtros, counts y reset coherentes. |
| **DEC-02 · All Products** | R-PROJ-06 / HANDOVER:568 anuncia HTML/JS ausentes; F-09 sí confirma CTA a `/store`. | CTA con etiqueta cross-project no debe llevar al catálogo. Corregir etiqueta/destino a recurso real o retirar promesa; página cross-project separada sólo si COORD la autoriza. Batch API existe (B-PROJ-01), pero la nota documental no impone crear ruta ahora. |
| **DEC-03 · Status final de Projects** | `Merchsmith Projects.html:173` es superado por **216–220**. R-PROJ-03 y parte de F-10 quedan corregidos aquí. | Action: rojo; In progress: naranja; Idea: gris; **Ready: dot verde; Ordered: tick de marca; Delivered: furgoneta gris**. No cambiar Ready a rojo ni Ordered a dot verde como “paridad”. Conservar texto además del icono. |
| **DEC-04 · CSS vigente** | `theme.js:1–5` activa polish global v50; `ui-polish.css` final manda sobre base. | Adoptar polish y overrides finales. No copiar trial switch, caps antiguos ni radios base sin contrastar selector. |
| **DEC-05 · Width/gutter** | `tokens.css:12`; R-SHELL-03; F-23/F-26. | Full-width/left-aligned en app; un gutter `clamp(20px,2.5vw,36px)` en main/breadcrumb/footer. No `95%` más padding ni clamp hasta72px. Máximo de lectura sólo en texto interior. |
| **DEC-06 · Footer** | `components.css:28–37`; R-FOOT-01 corrige HANDOVER deep. | Editorial C, fondo **periwinkle-ink**, columnas/bandas alineadas al gutter. No asumir altura fija846px. Admin usa su barra compacta, no footer marketing. |
| **DEC-07 · Admin buttons/stats** | `ui-polish.css:719–722,732–733` supera decisiones anteriores. | Primario Admin **deep + blanco**, radio8; no mint ni blanco sobre primario para el botón final. `.sb::before` oculto: **sin top accent rule** final de stats `.sb`; R-ADMIN-DASH conserva una descripción histórica superada. Header Admin sí primario periwinkle (`Admin.html:211–212`). |
| **DEC-08 · Gallery** | Redirect `Merchsmith Gallery.html:15`, R-GALL-01; F inventario workspace compartido. | Mantener `/projects/[id]/gallery` si ya es ruta real del mismo `ProjectWorkspace`; no nueva fuente de datos/modal separado ni copia del engine. |
| **DEC-09 · Backend presente** | B §§5–13 y F trabajo local. | No rehacer Basket/Orders/Finance/two-supplier/drafts por no estar en HEAD. Corregir wiring/contratos y verificar migraciones antes de declarar operativo. |
| **DEC-10 · Privacy/cálculo** | B-SIMPLE-01/02/05. | DTO por audiencia; cálculo interno completo aunque customer no vea route/supplier/cost. No ocultar campos internos antes de calcular carriage. Production Manager no pierde dispatch por un gate global finance. |
| **DEC-11 · Datos desconocidos** | B-SIMPLE-03/04; F-06/F-16. | Null/missing ≠ cero; sin coste real no profit ficticio. Sólo métricas de Home/drawer con scope, periodo y definición exactos; no estimar SLA para quitar Soon. |
| **DEC-12 · Simulaciones** | R-INTEGRATIONS, B-INT-01…03, F-07/F-14. | Newsletter sin confirmación falsa; Stripe simulated explícito; placements free/projected MVP. Contabilidad no se vuelve synced con un botón o timer simulado. |

**Corrección adicional:** customer Finance existe como rol, pero R-PERMS y B-FIN-02 no lo autorizan automáticamente a `finance.view`. Approver aparece en copy histórico, no matriz canónica. FE/BE usan permisos recibidos; ampliar grants requiere decisión COORD explícita.

## 3. Medidas y breakpoints concretos para FE/COORD

Medidas **estáticas de referencia**, aún no verificadas con computed styles. Media queries de referencia son de **viewport**, salvo container query o fórmula explícita. No sustituirlas por MUI `md/lg` con umbrales diferentes.

| Componente | Target concreto / fuente | Validación posterior |
|---|---|---|
| Gutter/app | `--page-gutter:clamp(20px,2.5vw,36px)`; width100%, max-width none. | Mismo borde izquierdo main/breadcrumb/footer; tab switch sin cambio de ancho. |
| Rail | 68px fijo; botón44×44, icon21, stroke1.7; padding12/gap4; marker3px. Hover150ms/40ms, focus/touch/Escape. | No reflow; flyout ≥222px (Admin214), z55; sticky debajo header medido. |
| Header | Sticky z50; search max440px, margin32px, padding8px15px; **oculto ≤880px**; avatar36, tools gap22. | No solapamiento de lockup ni anuncios; basket sólo customer/distributor. |
| Controls/cards | Controls8px; cards polish12px; normal40px/14px/600/pad16, small36px/13.5; ring4px accent24%; borders g300/g200. | No doble borde search; disabled/focus/reduced motion. Especiales Basket pueden conservar16px. |
| Tab bars | 14px/600, padding10px14px, gap2, active deep underline2px; baseline inset1px; no wrap, scroll horizontal. `polish:577–581,676–678`. | URL/back/forward + teclado/foco, underline no clipped. |
| Tables comunes | Selectores polish `.ot-tbl/.du-tbl/.au-tbl/.dirtable` headers12px/600, g50/g600, padding vertical12; body14px. | No aplicar regla universal13px a todas; tablas especializadas conservan reglas propias. |
| Customer Projects grid | Gap20; `repeat(auto-fill,minmax(max(300px,calc((100% - 40px)/3)),1fr))`; **1 columna ≤700px**; máximo3. | Entre1/2/3 depende del ancho útil; no fijar md=2/lg=3 por aproximación. |
| Project cards | Padding34px26px24px; title23px; action tiles34px; title right132px/date right128px. KPI min150px/gap10, icon38, count24 serif. | No superponer title/toolbar en cards angostas; 3 cards nunca4. |
| Projects status | Dot10px: action `#d92d20`, progress `#f79009`, idea `#d0d5dd`, ready `#12b76a`; ordered14px tick deep; delivered16×14 van `#344054`. | DEC-03; legend/text no dependen sólo de colour. |
| Workspace Gallery | 4 columnas default;5 **≥2100**;3 **≤1680**;2 **≤1150**;1 **≤600**. | Misma línea/status/modal al alternar; no romper filtros ni scroll. |
| Workspace product cell | Nombre debajo de thumbnail **<1560px**, thumb hasta148; al lado **≥1560**, thumb120. Date pills fixed152px. | Header/fila/modal row alineados por rol y densidad. |
| Inset product modal | Left content edge; top=max(title bottom,header bottom) con cap45vh; right/bottom0; sin scrim, z30; grow360ms, reduced-motion sin animación. Compact scroll>60 / revert<20, thumb48. | Header/rail/título siguen visibles;× limpia estado; no adaptar como Dialog centrado. |
| Proof | Columns `minmax(190px,240px) minmax(0,1fr) minmax(200px,260px)`, gap16; height `min(62vh,600px)`; section title32 serif. | Notas/warnings/posiciones; fullscreen/ESC y aprobado/version. |
| Store listing | 4 cols default,3≤1680,2≤1150,1≤600; gap46px30px. Facets230px+content/gap30,1col≤900. | **No inventar5cols≥2100 para Store listing:** existe en Gallery, no en CSS Store leído. Related `.pgrid4` es excepción propia. |
| Store homepage products | 5 cols default,4≤1100,3≤820,2≤520; gap10px20px. Hero21:9→16:10≤820. | No usar grid listing para best sellers/recent. |
| Store product detail | 1.1fr/1fr, gap46;1col≤900. | Gallery/swatches/price/action; datos distribuidor sólo autorizados. |
| Home dashboard | KPI4/gap14→2≤900; body1.55fr/1fr gap16→1≤980; greeting32 serif. | Cards y periodo/métrica precisos; sin Home mock stats. |
| Basket | Main +330px summary/gap28→1col≤1100; table min1190px/local horizontal scroll; thumb76; sticky header+18. | Browser zoom, quantity variants, address missing, summary sin clipping. |
| Footer editorial | Background ink; hero1.2fr/1fr/1fr gap40→2cols≤1000→1≤620; padding42/38; headline46→36≤620. | Bands/gutter/pagos; texto veraz newsletter. |
| Admin footer | Height51px,left68px, widgets encima; panel bottom padding96px; ocultar secundarios≤1180. | Ningún texto wrap/solapamiento; oculto print. |
| Brand Assets | Base grid min248 gap18, guidelines min320; previews150/doc180/swatch130, overrides polish sobre radios/bordes. | Seis categorías y media real, no artwork tile de demo. |
| Calendar/Calls rails | Bajo≤1100 rails pasan a grid auto-fit **min280px** (último polish686); calendar48px/h de7–20h. | Agenda/free-busy y controles sin overlap. |

**Palette:** base periwinkle `#7B85C5`, deep `#5860A6`, ink `#3C4279`; Mulish UI/EB Garamond display. Polish body g700 `#344054`, headings g900 `#101828`, muted g600 `#475467`/g500 `#667085`, line g300 `#D0D5DD`, line-soft g200 `#EAECF0`. Rondas no deben sustituir todos los colores polish por base `#222222`. Woodland completa y custom4-colour son modelos distintos: usar DTO admitido, no extender schema a ciegas (F-25/B-SET-02).

## 4. Checklist reconciliada por TODOS los componentes/secciones

Cada fila tiene ID de seguimiento **V2-xx**, referencias F/B/R, actualización requerida, dueño y comprobación. Todos los checkboxes siguen abiertos. “Sin gap demostrado” es un criterio de validación, no una tarea para reescribir el módulo.

### 4.1 Shell, navegación, auth, themes, footer y páginas

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-01 · P1 Finance nav** | F-01/F-15; B-FIN-01/B-DASH-01; R-SHELL-08/FINANCE-TABS | Gap: Dashboard link pending y tabs incompletas/active first-match. En curso. Activar destinos reales por rol y match query específico. | S; FE | Dashboard/Integrations/customer Overview seleccionan panel y rail correctos; back/forward. Supplier invoices no enlaza ruta inexistente. |
| [ ] **V2-02 · P1 Global search** | F-02; B-ORD-01; R-SHELL-05 | Gap: sólo products/projects pese Orders API. Añadir grupo Orders en curso, respetando audiencia; listOrders no acredita search remoto ni histórico completo. | API existente; FE/BE | Ref/cliente permitido encuentra pedido y abre detail; customer/supplier no ven recursos externos; empty/error explícitos; indicar límite si se busca sólo subset. |
| [ ] **V2-03 · P1 URL tabs** | F-03/F-22; B-COMMS-01; R-CAL/EMAIL | Gap: Calendar/Emails initializer-only. Sincronizar URL↔tab y rail/back/forward, también navegación en misma ruta. | S; FE | Click actualiza query; rail cambia panel sin reload; back restaura; `?with=` y parámetros existentes conservados. |
| [ ] **V2-04 · P1 Auth rutas** | F-04; B-AUTH-01/02/03; R-SHELL-10 | Gap de redirección proxy, no leak demostrado por sí solo. Incluir rutas protegidas nuevas manteniendo book/pay/auth/standard públicas. | S + API existente; FE/BE | Anónimo redirect antes de UI protegida; deep link vuelve tras login; endpoints siguen autorizados; test significativo de clasificación. |
| [ ] **V2-05 · P2 Shell/gutter** | F-23/F-26; B-STORE-01; R-SHELL-03/05/07 | Gap confirmado tokens/clamp72/95%/canvas literal. En curso. Aplicar medidas §3 una vez en shell. | S; FE | Main/crumb/footer coinciden en4roles/default store; ancho estable al cambiar tab; no negative-bleed doble. |
| [ ] **V2-06 · P2 Polish/themes** | F-08/F-24/F-25; B-SET-01/02; R-SHELL-01/02/04/09/11 | Fuentes duplicadas y theme alias parciales. Adoptar CSS final, body/portal scope y headers definidos. Extender sólo keys ya admitidas; demás pendiente contrato. | S/API existente; FE/BE | Radios/fonts/focus/table12 donde aplica; themes plataforma/tenant aislados y portales tematizados; sin hardcoded canvas. |
| [ ] **V2-07 · P1 Newsletter** | F-07; B-SET-01 (contact enquiry no equivale newsletter); R-FOOT-02/STORE-HOME | Gap: submit no-op o falso éxito. En curso feedback veraz/validación; suscripción real no tiene contrato acreditado. | S ahora; DB-integración aparte; FE/COORD/BE | Sin servicio, no “you're on the list”; ningún dato se dice guardado/enviado. Contact form existente no se reutiliza como suscripción encubierta. |
| [ ] **V2-08 · P2 Footer/content/legal** | F-27/F§4.3; B-SET-01/02; R-FOOT-01…04 | Editorial C ink y11templates sobre API. Operator legal textos pending son gap; no invented law ni reset falso. | S/API existente; FE/COORD | Footer widths/bands/print correctos, content editor guarda admitido; operator terms/privacy sólo reales o indicación pendiente; Support funciona. |

### 4.2 Home, Projects, Create, Brief, workspace y Gallery

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-09 · P1 Home por rol** | F-06; B-DASH-01/03/B-ORD-01; R-HOME-01…04 | Spend YTD ComingSoon confirmado; reutilizar métrica exacta/API, en curso. Supplier Home concilia requests/production sin confundir dashboards. | API existente; FE | YTD realmente Jan1→hoy, no last30days renombrado; scope customer propio; no 500-order subset como total exacto; null no0. |
| [ ] **V2-10 · P2 Customer Projects** | F-10/F-11; B-PROJ-01; R-PROJ-01…03 + DEC-01/03 | Gap4columns; status inicial de R corregido. Grid máximo3 y marks finales; **KPI in-grid ya coincide** y se conserva. Search/select aria-label. | S; FE | Medidas §3, KPI reversible en mismo board, Ready verde/Ordered tick/Delivered van; nombres y pressed states. |
| [ ] **V2-11 · P1 CTA cross-project** | F-09; B-PROJ-01; R-PROJ-06/DEC-02 | CTA `/store` no representa cross-project. Ajustar promesa/destino real; no nueva página impuesta por documental faltante. | S; FE/COORD; API existente si se autoriza vista | CTA no confunde catálogo con line-items; KPI sin redirect. Si hay nueva vista autorizada: batch, scope, filtros/proyecto/group/open y delivered real. |
| [ ] **V2-12 · P1 Delivery por línea** | F-12; B-WORK-01/B-ORD-01/B-R2-02; R-WORK-04/ORD-DELIVERY | Gap: project closed fuerza delivered en todas sus líneas. Acordar mapping real antes de cambiar estado/marks. | API existente; FE/BE/COORD | Pedido parcialmente entregado conserva distintas líneas; archive/close no cambia delivery; no inferir entrega por estado administrativo. |
| [ ] **V2-13 · P1 Master Projects** | F§4.4; B-PROJ-03/B-WORK-01; R-MASTER-01…05 | Board presente, parity de columnas/filters/expand/cascade por validar. Bulk duplicate/project reorder atómico no acreditado. | S/API existente; FE/BE | Comfortable/list expansion, filters+KPIs+Sup/Cus, counts/CSV; no duplicado ficticio. Acciones sin contrato se separan. |
| [ ] **V2-14 · P1 Wizard/drafts/archive** | F§4.4; B-PROJ-01/02; R-CREATE-01…03/PROJ-04/05 | Nuevos módulos presentes, no rehacer. Fullscreen5steps, resume/current/parked hasta10, archive personal vs delete global. | API existente + DB previa; FE/BE/OPS | Draft por user/environment, refresh/resume exacto, create ID nuevo, cancelar no overwrite; migraciones drafts/archive acreditadas. |
| [ ] **V2-15 · P1 Brief/sourcing** | F§4.4; B-PROJ-01/B-WORK-01; R-BRIEF-01…05/STORE-BRIEF | Brief real presente. Comparar3layers/inherit-overrides/multiple candidates/targetbudget/artwork/focus. `brandNotes` ya contrato; handoffAM future aparte. | API existente; FE/BE | Varias candidatas no inflan presupuesto previsto; remove/focus/banner correctos; defaults reflejan overrides por línea, assetIDs reales. |
| [ ] **V2-16 · P1 Workspace/modal** | F§4.4; B-WORK-01/03; R-WORK-01…05/PM-01…03 | Workspace yProductModal presentes. No gap de engine demostrado; geometría inset/clone row/scroll/close por validar y adaptar si difiere. | S/API existente; FE | Header/rail/title visibles, shared row actions, compact/resize/reducedmotion, focus/Escape; ningún loop ni state residual. |
| [ ] **V2-17 · P2 Gallery** | F ruta gallery/§4.4; B-WORK-01; R-GALL-01 | Mismo ProjectWorkspace ya presente. Conservar arquitectura y aplicar breakpoints propios. | S; FE | List/gallery misma línea, modal/status/filter data; no segunda copia de engine. |
| [ ] **V2-18 · P0 Design/Price privacidad** | B-WORK-02/B-SIMPLE-01/02; F§4.4/§6; R-PM-DESIGN/PROOF/PRICE | Gap backend confirmado: fila Prisma/live/locked matrix exponen costes a customer. BE corrige sin tabla nueva, FE adapta nullable/omit. | API existente; BE/FE | Customer payload sin target cost, markup, locks/snapshots internos o supplier data; sell/approval útil; versions/409/actions preservados. |
| [ ] **V2-19 · P1 Visual/proof** | F§4.4/§4.5; B-WORK-03; R-PM-DESIGN/PROOF | Version/approve/requestchanges API presente. Verificar branding→visual gate, warning approval,3cols, snapshots y PDF. | API existente/S; FE/BE/QA | Approve warning tick, changes note/version, no changes una vez approved, product+proof visual real; A3 print/PDF correcto sin chrome. |
| [ ] **V2-20 · P1 Sample/stock/dates** | F§4.4/§4.6; B-WORK-01/B-TWO-01; R-PM-SAMPLE/STOCK/WORK-03 | Lead override/default y stock/quote API presentes; no ausentes por comments ComingSoon. | API existente + DB previa; FE/BE | U/B tabs yoptions porrol; nullable override restaura, lead warning, stock todos chosen variants, Sup/Cus agreements, delivered sample feedback. |

### 4.3 Store, catálogo, producto, marcas y assets

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-21 · P2 Store home/listing** | F-08/F§4.3; B-STORE-01/02; R-STORE-HOME/LIST/FILTER | Layout/filter/home presentes. No confundir grids homepage/listing/Gallery; polish específico y secondary-image hover a contrastar. | S/API existente; FE | Breakpoints §3, counts/search/sort facets, no empty-fallback seed, home config/order editable consistente. |
| [ ] **V2-22 · P1 Product detail** | F§4.3; B-STORE-01/B-WORK-02; R-STORE-PRODUCT/DIST/OVERRIDE/REVIEW | Rich detail/editor/variants/notes/reviews presentes. Mapping canonical fields/POA/customer-vs-dist y storage real por validar. | API existente; FE/BE | Swatches/gallery/zoom/add-project, reviews org-only, unknown fields explícitos; no MOQ/lead/price inventados; authorised cost only. |
| [ ] **V2-23 · P1 Range/Recommended** | F§4.3/§4.9; B-ADMIN-01; R-STORE-CATALOG/ADMIN-CURATION/SUP-PLACEMENT | API rango/mode/change/tags/approvals presente. MVP free/projections deliberado. | API existente; FE/BE | Scope approved suppliers; edited deltas/Keep change/bespoke readonlyplatformtags; supplierpending no Featured live; default store separado. |
| [ ] **V2-24 · P1 Brand Assets/library** | F§4.4/ruta brand-assets; B BrandAssets§15; R-BRAND-ASSET/RIGHTS/PM-LIBRARY | CRUD/download/archive/tags/project artwork presente. `_src` vs `src` es defecto sospechado de **referencia**, no frontend gap confirmado. | API existente; FE/BE | Seis cats/media IDs, upload→brief→builder→proof roundtrip, rights/versions; no demoSVG como archivo real. |
| [ ] **V2-25 · P2 Logos/brands/tags** | F-19/F§4.3; B-SET-01/B-ADMIN-01; R-LOGOS/BRANDS-TAGS | Customer Platform logos panel falta; reutilización editor/modelo admitido en curso si factible. Brand registry yplatform/disttags distintos de orglogo. | S/API existente; FE/BE | `?tab=logos` muestra editor real/scoped; square/full/header/PDF tone/crop disponibles segúncontrato; tenant/plataforma nunca se pisan. |

### 4.4 Basket, checkout, Orders, documentos y logística

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-26 · P1 Basket visual/interacciones** | F§4.5; B-BASKET-01/03; R-BASKET-01/02/SPLIT-01 | Código nuevo presente; no ausencia demostrada. Layout/approved visual/colour×size/apply-all/split/zoom/duplicate/remove por verificar. | S/API existente + DB previa; FE/BE/OPS | Sumas variants/drops exactas, missing address bloquea, groupedexVAT/sticky330, noforzar demoaddress, zoom/navigate/copiar accesibles. |
| [ ] **V2-27 · P0 Checkout DTO/approval** | B-BASKET-02/B-SIMPLE-01/02; F§4.5; R-CHECKOUT-01…03 | Gap: customer basket/checkout incluyen unit_cost/carriage yplace sólo projects.manage. En curso BE projection + orders.approve, FE tipos/messages. | API existente; BE/FE | Customer DTO limpio, authorizedBuyer/Admin place, invoicecontact/PO≤5MB/terms/no-refund/credit/onboarding missing list; transacción order+clearbasket. |
| [ ] **V2-28 · P1 Quote/carriage integrity** | B-TWO-02/03/B-SIMPLE-05; F§4.6; R-PM-PRICE-DATA/ORD-TWO | Gap carriage desaparece por audiencia yBasket cost no lo suma. Corregir ruta interna completa antes de DTO; quotes gate pending/none aún decisión. | API existente; BE/FE/COORD | Mismo coste/sell/order snapshot en dist/customer approval inclcarriage; no identidades supplier al cliente. Partial quote bloqueado; manual vs pending/none acordado. |
| [ ] **V2-29 · P1 Order placed/payment** | F§4.5/F-14; B-BASKET-01/B-INT-01/02; R-CONFIRM-01/CHECKOUT-02 | Confirmation/pago/promo/BACS paths presentes; modo/config runtime no probado. | API existente/DB-integración config; FE/BE/OPS | Ref/PO/items/addresses/AM/totals correctos; approval vsplaced claro; bankpayBy/fees/promo/exVAT/VAT snapshots; no afirmar emails/pago real sin evidencia. |
| [ ] **V2-30 · P1 Orders table** | F§4.6; B-ORD-01/04; R-ORD-LIST/ROLE | Tabla/actions presentes; search/date/route/role/expand/sticky/CSV porvalidar. List500 no histórico total. | S/API existente; FE/BE | Filters combinados ybulkselection respetan scope; customer sin suppliers/profit; supplier sóloPOsent; export declara alcance o servercontract. |
| [ ] **V2-31 · P0 Order actions/permisos** | B-ORD-02/B-AUTH-02/B-SIMPLE-01/02; F§4.6; R-ORD-ROLE/CHECKS/SOCIAL | Gap: tipoorg no rol/permission; finance leak/mutations. En curso BE; FE usa matrix deacciones recibida. | API existente; BE/FE | Unauthorized quote/order/finance rechazadaAPI, ProductionManager production/dispatch permitido; supplier sólo susPOs; comments/docs poraudiencia. |
| [ ] **V2-32 · P1 Supply workflow** | F§4.6; B-ORD-01; R-ORD-DETAIL/CHECKS/DELIVERY |8-step workflow/upload/check/revision/tracking/receipt presente. Validate eachtransition; courierautomation no certificado. | API existente/DB-integración config; FE/BE/QA | OA/proof yes/no/NA con snapshot, reject+note/reconfirm, dispatched/untracked/customerreceipt yfeedbacksample; explicitfiles uploadcomplete. |
| [ ] **V2-33 · P1 Amend/cancel/change supplier** | F§4.6; B-ORD-01/02/B-TWO-03; R-ORD-AMEND/CANCEL/SUPCHANGE | Contratos presentes; no feature ausente. Verify reapproval, oldPOcancel, states/costbalances. | API existente; FE/BE | Variants before/after; amendmentproofapproval; cancel sóloundispatched/keptchargeCN; supplierchange antesproduction yblank-shipped locks; audit/docs. |
| [ ] **V2-34 · P1 Invoice/CN/extraPO/credits** | F§4.6/§4.7; B-ORD-01/B-FIN-01/03; R-ORD-DOCS/FIN-TALLY | Contratos presentes; reconcile amounts acrossorders/registers/documents, no copiar fallbackmathprototype. | API existente; BE/FE | Net+VAT=Gross ysumas con carriage/promo/cardfee/cancel/CN/extra; supplieradjustments invisiblescustomer; payment/refund real distinguishrecorded. |
| [ ] **V2-35 · P1 Split/via-us/blank lanes** | F§4.5/§4.6; B-SHIP-01/02/B-TWO-01/02; R-SPLIT-01/ORD-VIAUS/TWO | Hubs/settings/drops/bookin/twoPO present, DB noacreditada. | API existente + DB previa; FE/BE/OPS | Totals/drop min/max, revisedOA afterchange; hubs real, received/damagedshort holdsproduction; shiptogether/POD; customer no blankidentity. |
| [ ] **V2-36 · P2 Print/PDF** | F§4.5; B-WORK-03/B-ORD-04; R-PM-PROOF/ORD-DOCS/R§18Sheets | Print components yPdfDownloadButton presentes; confirmation/PO/invoice/CN PDF API sí. Project/proof/deliveryPDF propio no confirmado. | S/API existente; FE/BE/COORD | A3summaryportrait/detailedlandscape+cover/proof yA4confirmation segúnoutput; pagination/fonts/nochrome/data approved. No sustituir descargaPDFexistente porwindow.print global. |

### 4.5 Finance, dashboards, targets e integrations

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-37 · P1 Registers/terms/bank** | F§4.7; B-FIN-01/02/03; R-FIN-CUST/SUP/FINANCE-TABS | Registros/ageing/payments/reminders/chase/approve/bank/POterms presentes. Null yscope/grants por verificar. | API existente + DB previa; FE/BE | Customersowninvoices; agreementdelta mandatory; recordpayment no transferencia; bankreference/invoicecontact/POpolicy coherentes; CSVserver disponible yscope. |
| [ ] **V2-38 · P0/P1 Profit desconocido** | B-ORD-03/B-DASH-02/B-SIMPLE-01/03; F§4.7; R-HOME-03/DASH-TARGETS | Gap sell÷1.42 enOrders/Dashboard/Targets yprofit sinfinancegrant. BE corrige, FE nullablecoverage. | API existente; BE/FE | Sin coste real: unknown/noavailable concoverage, no £0 ni margen inventado; totaIs authorised; conocidos suman sin hacer pasar parcial porcompleto. |
| [ ] **V2-39 · P1 Crédito real** | B-PROJ-02/B-SIMPLE-04; F-06/F-16/§4.5; R-CHECKOUT-02 | `customer-account.credit_used=null` aunque helperfinance existe. En curso BE; FE no coalesce0. | API existente; BE/FE | Mismo crédito usado/available enprojectaccount/checkout/finance, customer+tenant correctos; DBmissing no “sin deuda”. |
| [ ] **V2-40 · P2 Dashboards/Targets** | F§4.7; B-DASH-01/02/03; R-DASH-TARGETS | Period/compare/workingday/monthtargetAPIpresentes;5000facts límite, no exactglobal. | API existente + DB previa; FE/BE | Periodo/compare/definitions correctas, pastmonthlock/recurring/fill/holidayoverride; tablelinks; profit roleprojectFinance constraints. |
| [ ] **V2-41 · P1 Stripe disponibilidad** | F-14; B-INT-01/02; R-LIVE-FIN | Real gateway ysimulatedfallback existen. No gap “todo mock”, pero entorno sincertificar. | API existente + DB-integración/config; BE/OPS/FE | Connect/webhookfirmado/payment/refund enmodoactual; UI simulated no paidreal; publicpay token yscope; no redactarsecrets enUI/log. |
| [ ] **V2-42 · P3 Accounting7** | F-13; B-INT-03; R-INTEGRATIONS | **Gap complejo confirmado**: no module/APIconnections/mappings/synclog/reconcile. Noimplementar sólo tarjetasfake. | DB-integración nueva; BE/FE/COORD/OPS | PlanproviderXero/Sage/QBO/FreeAgent/Zoho/KashFlow/ClearBooks; tokens/queue/idempotency/webhooks/mappings/log/retry, reconciledpayments; hastaentonces unavailable+CSVveraz. |

### 4.6 Organisations, People, Team, Profile e invitaciones

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-43 · P1 Org drawers/stats links** | F-16; B-PEOPLE-01/B-ORD-01/B-DASH-03; R-ORG-LIST/DRAWER | Orders &spend/orderedproducts/service Soon confirmados. Wiring exacto encurso; no inventar deliveryaccuracy/acklatency. | API existente; FE/BE | Vieworders deep link realmente filtra customer/supplier; amounts/lastorder/items definidos; insuficientedatos=N/A; no entire500subset asumidocomplete. |
| [ ] **V2-44 · P2 Users/Team reuse** | F-05/F-18; B-PEOPLE-01; R-PEOPLE/PEOPLE-EDIT/ROLES | Routes `/team`/`users/all` missing peseAPI `/team`/orgteam/users. Reutilizar UI si scopeexacto, encurso. TeamcoladminSoon requierefieldreal. | S/API existente; FE/BE | Tenantteam noadminteam;directory incluye sóloallowedscope; edit/invite/deactivate/lastadmin/teams; notas/audit/contact actions; canonical `/users` si equivalente. |
| [ ] **V2-45 · P2 Org Map** | F-17; B-STORE-02/B-PEOPLE-02 singeocontractacreditado; R-ORG-MAP | Gapintegración UI confirmado; lat/lng/geocoder noacreditados. | S mapa si coords existentes + DB-integración para geocode; FE/BE/COORD | Mismosfiltersrows,missingaddresslist,no seedpins;radius/fit/cluster~44,nonUKsupport segúnscope. No añadir nueva DB en ronda simple. |
| [ ] **V2-46 · P1 Profile/AM/addresses/privacy** | F§4.8; B-PEOPLE-01/02; R-ASSIGN/ADDRESS/PRIVACY/PROFILE-INVITE | Profile/address/AM/invite APIs presentes; detail/audit sharedrecord por validar. | API existente; FE/BE | AM porcustomeruser/defaultorg; addresses1default,duplicateemails,lastadmin; nota me/team/org yautor correctos; invalid/revokedinvite/authstates. |

### 4.7 Settings, onboarding, supplier, Admin y feeds

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-47 · P2 Settings porrol** | F-19/F§4.9; B-SET-01/02; R-SETTINGS-DIST/PRICE/APPEAR/LEADS | Paneles mayormente presentes; logos reuse V2-25; mapkeysDTOrequired. Subscription→Finance correcto; no reintroducirBillinglegacy. | S/API existente; FE/BE | URLtab/StorevsSettings grouping,footer/pages/fonts/markupdiscounts yappearance guardanAPIadmitida; theme/customer/supplier scopes, samples/hubsleads. |
| [ ] **V2-48 · P3 Domain** | F-19; B-SET-02 sinDNScontractacreditado; R-DOMAIN | Domain pending/noTABS confirmado; connect/verify/SSL/redirection no APIcertificada. | DB-integración; COORD/BE/FE/OPS | No activarlinkdead ni estadosverifiedfake; canonicalplatformhostname decidido,records/token/swap90dayscuando backendreal. |
| [ ] **V2-49 · P1 Onboarding3roles** | F rutaonboarding/§4.9; B-PEOPLE-01/02; R-CUST-INVITE/ONBOARD/DIST/SUP | Flujosstate/checklist/reminders presentes; billingonboarding no certificadocobro. | API existente + DB-integración config; FE/BE/OPS | Stepsrequired/skip/resume/terms/logo/team dupes,orgvsuserprogress ybasketgate; supplierreview→approve beforevisible;distoffline untilready; no trialni fakepaid. |
| [ ] **V2-50 · P1 Supplier portal/requests** | F rutas supplier/F-05; B-TWO-01/B-ADMIN-01/B-COMMS-01; R-SUP-PORTAL/SCOPE/PLACEMENT | Products/approvals/history/billing/connection/delivery/sample/stock/price/settings/orderspresentes; supplierdistributorsrouteabsent. | API existente; FE/BE | Ownsupplierempty sigueempty,nofallbacklargest; `?f=rec` ya funciona; placementprojected;onlyownsentPO/request; noactivar supplierdistributor listing global. |
| [ ] **V2-51 · P2 Adminconsole** | F rutasadmin/§4.9; B-ADMIN-01/B-PEOPLE-01; R-ADMIN-DASH/DIR/PLANS + DEC-07 | Dashboard/permissions/team/users/suppliers/plans/envorgmanagement presentes; no absence poroldCLAUDE. Camposgrants porvalidar. | S/API existente; FE/BE | Fullwidth/sharedchrome/crop/no.sbaccents/buttondeep;platformguards+matrix;seatsMRRderivedtiers/no featuregates/trial; orgdrawersownscopes. |
| [ ] **V2-52 · P2 Catalog/taxonomy/imports** | F§4.3/rutasplatform/imports; B-ADMIN-01/02; R-ADMIN-PRODUCTS/TAXONOMY/FEED/GAPS | CRUD/tablegallery/bulk/mapping/rawrecords APIs presentes; field/adapterparity no demostrada. | S/API existente/DB-integración feeds; FE/BE | Savedviews/group/shortcuts si UIviable;taxonomybrand/tagownership;PFCmatchedchannels/XooparmoneyarraysFXweightdecoration correctamente;POAhealth noinventados; no borraroperationalroutes sinHTMLequivalente. |
| [ ] **V2-53 · P3 Backup/reset/legal policies** | F-20/F-27; B-SET-01/02; R-ADMIN-SETTINGS/FOOT-03/04 | Backuprestorecodificado; resetemptydisabled gapdeliberadoconDB. Noactivarbotóncomo patchsimple. | S texto; DB-integración/decisión reset; COORD/BE/FE | Download/restore propósito claro; backupsno secrets; resetmultiuser estrategiaautorizada; wordinglegalreal; no clonar localStorageclear. |

### 4.8 Comms/calendar/calls/notifications

| Checklist / prioridad | F / B / ref | Estado y actualización requerida | Tipo / responsable | Aceptación verificable |
|---|---|---|---|---|
| [ ] **V2-54 · P1 Chats/social** | F§4.10; B-COMMS-01; R-CHAT/LIVE/ORD-SOCIAL | LiveMessaging/SSE/FAB/attachments presentes, no simplemock. Privacy/contactgraph/reads/typing/mutes porvalidar. | API existente + config; FE/BE/QA | Customer noothersupplier/customer,distnootherdist; streamauth,attachmentsreal,threadshared/roles,navunread ydrawer audiences. |
| [ ] **V2-55 · P1 Calendar/booking** | F-03/F-22; B-COMMS-01/02; R-CAL/NOTES |5tabs/4views/compare/booking/connections presentes; URLfixV2-03. Providersnotes actualavailability unknown. | S/API existente + integrationsconfig; FE/BE/OPS | Invites/proposals/resetreplies,hours/lunch/holiday/clashes,freebusyprivate≤6,occurrence notes/actions/.ics;bookingpublic/contact `with` real. |
| [ ] **V2-56 · P2 Calls** | F§4.10; B-COMMS-01/02; R-CALLS |TwilioSDK/token/callbacks código presente; number/audio/recording no probados. | API existente + integrationsconfig; FE/BE/OPS | Onlyadmin/dist,recordannouncement/retention,callbar survivesnav,transfer/forward/voicemail/log linked; no demo “recorded” sin mediareal. |
| [ ] **V2-57 · P2 Emails/prefs** | F-21/F-03; B-COMMS-01/02; R-EMAIL/SEND |Composer/drafts/snips/signature/templates/domain/reply presentes; **My emails prefs gap confirmado**. Reusar firma propia, verificarpreferencescontractantesactivar. | S/API existente si payloadadmitido; DB-integración si falta; FE/BE | URLtabs/ref;ToCcBcc/attachments/drafts/schedule;optouts/digestguardados; no sent/bounce/replyreal sinproviderstatus;passwordreset required. |
| [ ] **V2-58 · P2 Notifications/announcements** | F§4.10; B-COMMS-01; R-NOTIF/EVENTS |Liveprovider/preferences/mutes/barpresentes, no gap concreto encontrado. Validate. | S/API existente + config; FE/BE/QA | Unread/readall/snooze/mute/preferences/quiet/digest/audiences yplatform+distbarstack;timechecksserver/eventdedupe,navbadge real. |

## 5. Registro exhaustivo de hallazgos F y cambios simples B

### F-01…F-27: cierre sin perder ni duplicar hallazgos

| Hallazgo F | Seguimiento / decisión |
|---|---|
| F-01 | V2-01: activar Finance Dashboard existente. |
| F-02 | V2-02: order search con rol/scope/límite. |
| F-03 | V2-03/55/57: URL reactiva Calendar/Emails. |
| F-04 | V2-04: proxy rutas; no confundir con leak de datos demostrado. |
| F-05 | V2-01/44/48/50: sólo rutas/paneles reales, reuse si equivalente. |
| F-06 | V2-09: Spend YTD exacto, no estimator ni diferente periodo. |
| F-07 | V2-07: submit/newsletter veraces, integration pendiente. |
| F-08 | V2-06/21/22: polish final, placeholder image legítimo. |
| F-09 | V2-11/DEC-02: CTA incorrecto; cross-project documental aparte, no KPIredirect. |
| F-10 | V2-10/DEC-01/03: gridmax3; **Readygreen ya coincide**, Orderedtheme puede coincidir semánticamente pero debe ser tick final. |
| F-11 | V2-10/03/06: labels/pressed/tecladofocus; rolstab noequivale behavior. |
| F-12 | V2-12: deliveredporlínea, closeproject no entrega. |
| F-13 | V2-42: siete accounting providers nuevo proyecto DB-integración. |
| F-14 | V2-41/29/50: simulated/projections explícitos, runtimeconfiguration. |
| F-15 | V2-01: Finance rail completo según paneles reales. |
| F-16 | V2-43/39: orgstats/orderlinks/creditexactos;serviceaccuracy depende datos. |
| F-17 | V2-45: mapgap, nocontrato geo acreditado. |
| F-18 | V2-44: tenantteam/directory + teamcolumnadmin actualfield. |
| F-19 | V2-25/47/48: logos reusefactible; domain integrationno simpletab. |
| F-20 | V2-53: resetDBdecisión, backuprestore no ausentes. |
| F-21 | V2-57: preferencesMyemails, signatureyaexiste. |
| F-22 | V2-03/54…58: deeplinks y runtimecomms. |
| F-23 | V2-05: guttermax36/singlepadding. |
| F-24 | V2-06: finalpolishgrays/tables, nobasepaletteglobal blindly. |
| F-25 | V2-06/47: Woodland/aliasprovider/DTOactual. |
| F-26 | V2-05/06: themedcanvas/portals. |
| F-27 | V2-08/53: operatorlegal no inventedcontent. |

### B-SIMPLE-01…05: contrato de ejecución sin nuevas tablas

| ID / prioridad | Responsable / actualización | Verificación requerida | Estado |
|---|---|---|---|
| **B-SIMPLE-01 · P0** | BE proyección pública/interna; FE render de campos omitidos/null. Incluye lines list/get/batch, live+locked matrix, basket/checkout, Orders/stats/Targets. | API asserts customer no costs/markup/supplier facts, distributor sinfinance no financialfields; otros sell/status/actions preservados. | En curso según coordinación; evidencia pendiente. |
| **B-SIMPLE-02 · P0** | BE orders.approve yactionfinancial existente en mutaciones; FE permisos recibidos. No grants/roles nuevos. | Checkout/approve/cancel/balance/adjustments según matrix; role tests de permitido/prohibido; production legítima no bloqueada globalmente. | En curso; evidencia pendiente. |
| **B-SIMPLE-03 · P1** | BE quitar sell÷1.42 de Orders/math/Targets; FE unknown/coverage. | Missing-cost nunca realprofit/cost0; agregados explican cobertura, returns compatibles. | En curso; evidencia pendiente. |
| **B-SIMPLE-04 · P1** | BE `finance/credit.ts` para customer-account; FE no null→0. | Mismo criterio checkout/account, isolationtenant/customer; errorDB distinguible de deuda0. | En curso; evidencia pendiente. |
| **B-SIMPLE-05 · P1** | BE route interna real ycarriage costo coherenteapproval/basket/order; FE DTOaudience. | Customer approval mismoquote financial snapshot que distributor, carriageexactounavez; hiddenidentity mantenida. | En curso; evidencia pendiente. |

**Interdependencia:** B-SIMPLE-01 no debe romper B-SIMPLE-05: presentadores públicos después de cálculo. B-SIMPLE-03 cambia nullability en FE; adaptar types/UI antes de cierre. B-SIMPLE-04 no requiere columna nueva. Ninguna tarea nueva acredita que migraciones existentes estén aplicadas.

## 6. Cobertura completa de páginas/rutas y sub-secciones

Cobertura de **inventario**, no declaración de paridad. En cada fila **E**=fuente estática auditada, **V**=validación browser/runtime pendiente. Las rutas agrupadas se enumeran explícitamente; tabs no son páginas adicionales. Código actual referido proviene de F/B, no una reauditoría del diff que agentes están editando ahora.

| Superficie V2 / sección | Rutas reales FE o clasificación | Summary / contratos | Cobertura |
|---|---|---|---|
| Shell/header/rail/account/breadcrumb/theme/ghost | Protected layout/SystemAdminLayout/default-store shell, todas apppages | V2-01…06; B-AUTH/B-SET | E / V |
| Home customer/distributor/supplier; Admin dashboard | `/`; `/admin`, `/admin/overview` | V2-09/51; B-DASH | E / V |
| Customer projects grid/KPI/drafts/archive | `/projects` customer | V2-10…15; B-PROJ | E / V |
| Distributor masterprojects/filter/expand | `/projects` distributor | V2-13; B-PROJ/B-WORK | E / V |
| CreateProject5steps/exactfinder/AM/paymentterms/draft | `/projects/new` | V2-14/15; B-PROJ | E / V |
| Brief campaign/default/request/candidates | `/projects/[projectId]` | V2-15; B-PROJ/B-WORK | E / V |
| Workspace list/status/dates/actions/modal4areas | `/projects/[projectId]` | V2-16/18…20; B-WORK/B-TWO | E / V |
| Gallery sharedworkspace | `/projects/[projectId]/gallery` | V2-17/DEC-08 | E / V |
| AllProducts cross-project | **Documental V2, HTML/JS ausentes; FE ruta noexistente; no confundir `/store/all`** | V2-11/DEC-01/02 | E / decisión aparte |
| Projectsummary/detailed/proof sheets | Workspace export/print/PDFcomponents; sinpageHTMLproductionobligatoria | V2-19/36; B-WORK-03 | E / V |
| Storehomepage/deptlisting/facets | `/store`, `/store/all` | V2-21; B-STORE | E / V |
| Storeproduct/customer-dist/admin fields/editor | `/store/products/[productId]` | V2-22/23/28; B-STORE/B-TWO | E / V |
| Productrange/modes/tags/changes | `/store/range` | V2-23; B-ADMIN | E / V |
| Storehome/layout/appearance/settings | `/store/settings`, `/settings` tabs correspondientes | V2-47/52; B-SET/B-ADMIN | E / V |
| Footer/editorial/content11templates | `/store/settings/footer`, `/settings?tab=footer`, `/store/pages/[slug]` | V2-07/08; B-SET | E / V |
| BrandAssets guidelines/logos/colours/fonts/images/artwork | `/brand-assets?cat=…` | V2-24/25; B§15Assets | E / V |
| Brands/platformtags/disttags/logotypes | Product/range/Admin editors + profile/settingslogos | V2-23…25; B-ADMIN/B-SET | E / V |
| Basket/colour-size/addresses/splits | `/basket` | V2-26/35; B-BASKET/B-SHIP | E / V + DB |
| Checkoutbilling/contact/PO/terms/fees/credit/pay | `/checkout` | V2-27…29/39; B-BASKET/B-INT | E / V + DB/config |
| Orderplaced/confirmation | `/orders/[orderId]/placed`, `/orders/[orderId]/confirmation` | V2-29/36; B-BASKET/B-ORD | E / V |
| Orderslist/stats/targets | `/orders?tab=all|stats|targets` | V2-30/38/40; B-ORD/B-DASH | E / V |
| Orderdetail/workflow/checks/revisions/cancel/receipt | `/orders/[orderId]` | V2-31…34; B-ORD | E / V |
| Supplytwolanes/viaus/goodsin/splitdelivery | Orderdetail/supplierorders +settingsprofiles | V2-28/35; B-TWO/B-SHIP | E / V + DB |
| Proforma/invoice/creditnote/supplierPO/deliverynote | `/orders/[orderId]/pro-forma`, `/invoice/[invoiceNo]`, `/credit-note/[creditNo]`, `/po/[poNo]`, `/delivery-note/[docNo]` bajo orderprefix | V2-34/36; B-ORD/B-FIN | E / V |
| Finance dist6tabs | `/finance` dashboard/subscription/customer-invoices/supplier-invoices/bank/integrations | V2-01/37…42; B-FIN/B-INT | E / V + DB/config |
| Financecustomer3tabs | `/finance` overview/invoices/terms | V2-01/37/39; B-FIN | E / V |
| Financesupplier | `/finance` SupplierFinanceDashboard; `/supplier/billing` placement | V2-01/50; B-DASH/B-ADMIN | E / V |
| Paymentpublictoken | `/pay/[token]` | V2-41; B-INT | E / V + config |
| Organisationscustomers/suppliers/table/cards/detail | `/organisations`, `/organisations/[organisationId]` | V2-43/46; B-PEOPLE | E / V |
| OrgMap/near/radius | Sinmódulo UI integrado acreditado | V2-45 | E gap / V futura |
| TenantUsers/directory/audit | `/users`; `/users/all` ausente | V2-44; B-PEOPLE | E / V |
| TenantTeam/adminteam/teamsmanagement | `/team` ausente; `/admin/team` existe y es distinto | V2-44/51; B `/team`, orgteam | E / V |
| Profile/notifications/security/photo | `/profile` | V2-46; B-PEOPLE | E / V |
| AcceptInvite/password/authstates | `/accept-invitation`, `/login`, `/forgot-password`, `/reset-password`, `/auth/error`, `/auth/verify`, `/change-password` | V2-04/46; B-AUTH/B-PEOPLE | E / V |
| Authcallback | Middleware publicpath `/auth/callback`, sinpage.tsx inventariada | V2-04: comprobar handler/redirection real, no crearpageporinferir | E / V |
| DistributorSettings org/leads/footer/pages/markup/discounts/brand/appearance/announcement/drafts/attributes/delivery | `/settings` | V2-47/53; B-SET | E / V |
| CustomerSettings profile/address/account/platformlogos | `/settings/customer` profile/account; logosgap | V2-25/47; B-SET/B-PEOPLE | E / V |
| Customdomain/SSL/redirect | Settings domainpending, sinTABS actual | V2-48 | E gap / decisiónintegration |
| Onboardingcustomer/distributor/supplier | `/onboarding` roleawarefullscreen | V2-49; B-PEOPLE | E / V |
| Chats/FAB/contacts/threads/attachments | `/chats` +provider app | V2-54; B-COMMS | E / V/config |
| Calendar5tabs/4views/availability/notes/connect | `/calendar` | V2-03/55; B-COMMS | E / V/config |
| Publicbooking | `/book/[slug]` | V2-55; B-COMMS | E / V |
| Calls/dial/history/voicemail/recording/settings | `/calls` +PhoneProvider | V2-56; B-COMMS | E / V/config |
| EmailsSent/Drafts/Snips/Templates/Signature/Domain/Reply/Myemails | `/emails` tabs; Myemailsinactive | V2-03/57; B-COMMS | E / V/config |
| Notificationsinbox/preferences/bars | `/notifications` +provider | V2-58; B-COMMS | E / V |
| Supplierportalproducts/Recommended/approvals/history/billing | `/supplier/products`, `/supplier/approvals`, `/supplier/placement-history`, `/supplier/billing` | V2-50; B-ADMIN | E / V |
| Supplierconnections/delivery/sample/stock/price | `/supplier/connection-requests`, `/supplier/deliveries`, `/supplier/sample-quotes`, `/supplier/stock-checks`, `/supplier/price-quotes` | V2-20/50; B-WORK/B-TWO | E / V |
| Supplierorders/profile/decorating/carriage | `/supplier/orders` redirect `/orders`, `/supplier/settings` | V2-35/50; B-ORD/B-TWO | E / V |
| Supplierdistributors | `/supplier/distributors` ausente | F-05/V2-50: no enlace muerto | E gap |
| Supplier invoiceslegacy | `/finance/invoices` ausente, Financeyaexiste | V2-01: alias sólo a equivalente real autorizado | E gap |
| Adminsettings/profile/logos/colours/backups | `/admin/settings` | V2-06/25/53; B-SET | E / V |
| Adminpermissions/subscriptions/team/users/suppliers | `/admin/permissions`, `/admin/subscriptions`, `/admin/team`, `/admin/users`, `/admin/suppliers` | V2-44/51; B-ADMIN/B-PEOPLE | E / V |
| Platformproducts/Recommended/storelayout/mappings | `/platform/products`, `/platform/curated-range`, `/platform/store-layout`, `/platform/subcategory-mappings` | V2-23/52; B-ADMIN | E / V |
| Distributorenvironments list/create/detail/edit/suppliers/orgs | `/platform/distributors`, `/new`, `/[environmentId]`, `/[environmentId]/edit`, `/[environmentId]/suppliers`, `/[environmentId]/organisations` bajo platformdistributors | V2-51; B-ADMIN | E / V |
| Platformorganisationdetail/edit | `/platform/organisations/[organisationId]`, `/platform/organisations/[organisationId]/edit` | V2-51; B-ADMIN/B-PEOPLE | E / V |
| CategoryCRUD | `/product-categories`, `/product-categories/new`, `/product-categories/[categoryId]`, `/product-categories/[categoryId]/edit` | V2-52; B-ADMIN | E / V |
| ImportCSV/feed/mappings/rawrecords | `/product-imports/csv`, `/product-imports/feed`, `/supplier-category-mappings`, `/supplier-raw-records`, `/supplier-raw-records/[recordId]` | V2-52; B-ADMIN | E / V/config |
| RecommendedStandardpublic | `/recommended-standard` | V2-23/50; freeMVPdocumental vigente | E / V |
| Status/FieldMapping/FeedSpec/OrgUserModel/PlatformBrief/Sitemap/BrandGuide/Logos/TwoSupplierGuide/Xoopar3docs/DeveloperIndex | Documentación V2, sinapp-route obligatoria | R§18; gobernar contracts/labels/flows, noforzar nuevasrutas | E documental |
| HoverRail/PriceMatrixconcepts | Conceptos adoptados, implementacionesactuales mandan | DEC-04/08, V2-05/16/18 | E documental |
| Builder/DesignSplit/SupplierConnections/Orgconcepts, StoreHome2studies/FooterA-B-C/AdminFooteroptions | Exploraciones/no targets paralelos | R§18, usarcurrentHTML+CSS | E documental |
| GalleryPrevious/ProjectPrevious/RailModal/Ordersstandalone/exportsource/Canvas | Históricos/export/auxiliares | No regresionar a ellos ni crearappdestinos | E excluidos |

Auth layouts/loading/error/notfound/providers y frontend sin route handlers locales están incluidos en cobertura transversal (F§3); no se enumeran como nuevas páginas. APIs negocio backend `/api/*`; una ruta frontend existente no implica migración aplicada.

## 7. Dependencias DB/config y preguntas de contrato pendientes

| Dependencia | Evidencia B | Acción/owner y límite de esta ronda |
|---|---|---|
| Orders/finance/bank/basket/payBy | B§18 migrations `...146000`–`...148000`, `...150000`, `...153000`, `...154000` | OPS/BE acreditar appliedschema/grants; no ejecutar DB aquí ni declarar tablas ausentes poruntracked. |
| two-supplier/social/drops/hubs/projectoverride | `...149000`, `...155000`–`...158000` | OPS/BE verificar prerequisites incluso single-supplier checkout; catchesnull/[]/0 no pruebanemptyreal. |
| Drafts/archive/targets | `...151000`, `...152000`, `...159000` | OPS/BE disponibilidad yuser/environmentownership. |
| Stripe | `...160000`, Connect/secret/publicURLs/signedwebhook | OPS/BE modoactualycallbacks; FEsimulatedstate. |
| Email/Twilio/calendar/GCS/feeds | B-COMMS-02/B-ADMIN-02 | OPS/BE config/providertraces; APIpresente no confirmaentrega/audio/media/sync. |
| Accounting7 | B-INT-03 | Nuevo alcanceDB/integraciones; no parchefrontendfalso. |
| Geocode/customdomains/newsletter | F-17/19/07 +R-ORG-MAP/DOMAIN/FOOT-02 | Contrato noacreditado; COORD decideproducto/BE diseña. No nuevas tablas en tarea simple. |

Preguntas para COORD/BE antes de cerrar:

1. Quotes two-supplier: partial nunca debe avanzar; **pending/none** con manual costs no tiene decisión definitiva. Definir required vsmanual enpayload, no inferir porlabel.
2. Delivered porline item: vincular Orders/drops/receipt; projectclosed/archive no fuerza delivered.
3. Home spend: definir net/gross, VAT/credits/cancel, Jan1→hoy yscope. Si API sóloperiodoscerrados, no renombrar comoYTD sinrangeexacto.
4. Org accuracy/ack SLA: timestamps suficientes ydefinición real; mantenerunknown si no hay datos.
5. Bulk duplicate/reorderproject/PDF/export: qué ya soportaAPI, atomicity ylimits500/2000/5000. No añadir endpoints sólo porcomposiciónvisual.
6. CustomerFinancegrants/Approver: matrizrecibida manda; no roles nuevos comoarreglo rápido.
7. Logos/settingskeys/colourways: DTOadmitido +asset IDs; JSONsettings no acepta estructuras arbitrarias.

## 8. Registro de implementación y criterios de cierre

### Trabajo realizado en ronda 2 y aceptación pendiente

| Paquete | Responsable | Estado en este Summary | Evidencia pendiente |
|---|---|---|---|
| Shell/gutter/grid/status/nav/tabURL/search/Home-orgwiring/team-users-logosreuse/newsletterveraz | FE | **Implementado según handoff; typecheck PASS; validación parcial** | Paths y resultados en FRONTEND-V2-AUDIT §10. Quedan 4 tests en conflicto que requieren reconciliación y browser. |
| B-SIMPLE-01…05 sin nuevas tablas | BE | **Implementado según handoff; 33 suites/347 tests focalizados PASS; typecheck PASS** | Paths y resultados en BACKEND-V2-AUDIT §16–19. Requiere despliegue/DB existente antes de declarar flujo operativo. |
| Paridad visual yflujosbrowser | QA/COORD | **Parcial: Admin desktop y pipeline mobile verificados** | Captura desktop `.playwright-mcp/page-2026-10-07T23-58-28-298Z.png`; overflow horizontal móvil corregido y medido. Probar otros roles, Store y workflows. |
| DB/proveedores | OPS/BE | **No acreditado** | Migraciones/grantsconfig/servicestatus, secretsnoexpuestos, pruebasAPI autorizadas. |

**Regla de actualización:** cada fila V2 sigue abierta hasta handoff del agente. Estado “código implementado según agente” sólo con paths/diff/resumen preciso. “Verificado estáticamente”, “tests pasados”, “browser PASS” y “DB/provider operativo” son columnas distintas. Nunca un check `[x]` por intento, promesa, endpoint listado o test MSW preexistente.

### Checklist de aceptación coordinada

- [ ] **AC-01** FE entregó cambios vinculados a F/V2 y aplicó DEC-01…08 (especialmente **Readygreen/Orderedtick/Deliveredvan**, no status anticuado).
- [ ] **AC-02** BE entregó evidencia B-SIMPLE-01…05; FE compilótipos/render de campos omitidos/null compatibles.
- [ ] **AC-03** Checks pertinentes reportados con comando/resultado: navegación/query/authroles, cálculo realcarriage/missingcost/credit, permissionsenAPI; no tests que sólo espejen CSS.
- [ ] **AC-04** Browser posterior mediantePlaywright: cuatro roles, defaultstore/ghost permitido, móvil/desktop/wide, main-crumb-footeralign, tabs/backforward/focus/ESC, portals/scroll/modal/gallery.
- [ ] **AC-05** Viewports boundarychecks:600/601,700/701,820/821,880/881,900/901,980/981,1000/1001,1100/1101,1150/1151,1560±1,1680/1681,2099/2100. Seleccionar parejas aplicables porcomponent, no ejecutar todas para cada screen.
- [ ] **AC-06** Camino real Project→Brief→Storecandidate→Design/Proof/Price/Sample/Stock→Basket→Checkout→Placed→Order→Invoice/PO; partialdelivery/twosupplier/viaus/split/amend/cancel según dataset autorizado.
- [ ] **AC-07** Payload negativo porrole: customer no cost/markup/supplier; distributor noFinance no financials; production legitimate permitted; supplier onlyownsentPO/docs/comments. UIhidden alone insuficiente.
- [ ] **AC-08** Newsletter sinfalseack, simulatedStripe/projectedplacement explícitos; missingDB/provider distinto de “0records/no debt”.
- [ ] **AC-09** Documentos aprobados yprint/PDF correctos, taxes/totalsbalance acrossregister/order/doc; wholehistory límitesdeclarados.
- [ ] **AC-10** Cada diferencia restante se clasifica S/APIexisting/DB-integration/decisiondoc conowner; **ninguna página o sección omitida** de tabla§6.

### Resultado de esta ronda

La cobertura completa por sección/ruta queda trazada en §4 y §6. Frontend cerró por código varios gaps F-01…27 según FRONTEND-V2-AUDIT §10; Backend implementó B-SIMPLE-01…05 según BACKEND-V2-AUDIT §16–19. Se distingue código, tests, browser y despliegue. Frontend typecheck PASS; suite reportó 4 FAIL pendientes. Backend tests focalizados PASS y suite completa tiene fallo baseline de calendario. Playwright Admin desktop y pipeline responsive móvil verificados; las siete etapas quedan disponibles mediante scroll interno y main/document no desbordan. Se rectifica la observación anterior: el wordmark outline multicolor de Admin es el arte requerido por V2, no un gap. Faltan otros roles, Store y workflows. No se ejecutó DB/migraciones. Accounting, domains, geocoding/newsletter real y disponibilidad DB/proveedores conservan alcance separado.
