# Auditoría de referencia V2 — ronda 1

Fecha: 2026-10-07. Responsable: Subagente Referencia. Estado: **inventario y auditoría estática terminados; pendiente reconciliación con auditoría Frontend y validación visual coordinada**.

Raíz de todas las referencias relativas de este informe: `/Users/AndreBE99/Codes/Merchsmith/Merchsmith Platform Design V2/`.

## 1. Método, alcance y lectura de la evidencia

- Se leyeron `CLAUDE.md` completo, `START-HERE.md` completo, `HANDOVER.md` completo (1–1035), el registro de páginas/historial `CATS` del Developer Index y código/CSS relevante de las superficies principales.
- Se inventarió el directorio V2 y contrastaron rutas, cargadores, selectores, reglas posteriores de CSS y módulos compartidos. **No se abrió navegador, ejecutó referencia, tocó localStorage ni inspeccionó/modificó frontend.** Sólo se crea este informe.
- La cobertura es completa **por superficie/página inventariada**, no una afirmación de haber ejecutado todos los botones o leído byte a byte todos los archivos. Las referencias a `HANDOVER.md` son evidencia documental; las referencias a funciones/selectores son evidencia estática de implementación. Ambas se distinguen donde hay discrepancias.
- El grafo existente es de 2026-09-09 (`graphify-out/GRAPH_REPORT.md`), no contiene coincidencias de `Merchsmith Platform Design V2`; el CLI `graphify` no está disponible. No sirve como fuente vigente para esta auditoría; se utiliza el paquete V2 directamente.
- Precedencia: **HTML actual + módulos cargados + CSS final** > notas recientes específicas > entradas antiguas del historial. Un comentario que dice “trial” no invalida la activación global actual en `theme.js:1–5`.
- Los checkboxes siguientes son **criterios pendientes de comparación con el producto real**, no defectos ya demostrados del frontend.

### Etiquetas de alcance

| Código | Significado para implementación real |
|---|---|
| **S** | Simple: composición visual, CSS, responsive, navegación, estado efímero, filtros sobre datos ya disponibles. |
| **P** | Persistencia/DB: entidades, permisos, versiones, asignaciones, preferencias guardadas, historial o transacciones; requiere API/DB si no existe. |
| **I** | Integración: DB + proveedor externo, eventos, jobs/webhooks, almacenamiento de archivos o sincronización multiusuario. |
| **D** | Documental, concepto, exploración, export o artefacto auxiliar; no crear automáticamente una ruta de producto por existir el HTML. |

Cada sección contiene referencias exactas y una checklist; **S/P/I no son estimaciones de horas**. Una pantalla puede mezclar las tres.

## 2. Vigencia: decisiones que deben orientar la reconciliación

| Tema | Fuente vigente / conclusión | Fuente antigua que NO debe prevalecer |
|---|---|---|
| Pulido | `theme.js:1–5` activa `html.ui-polish`, CSS `?v=50`, iconos outline. | HANDOVER §“TRIAL NOT YET CHOSEN”, comentarios del CSS. |
| Ancho | App full-width y alineada a izquierda; gutter único. `HANDOVER:1014–1017`, HTML actuales. | Caps 1040/1280/1600 y el esquema de tres tiers del historial. |
| Rail | Permanente 68px, flyouts; `sidebar.js:166–190`, Admin inline. | Sidebar expandible/collapsible y drag grip. |
| Footer | Editorial C compartido; **CSS actual usa `--periwinkle-ink`** (`components.css:28–37`). | HANDOVER:196 dice `--periwinkle-deep`; no copiar esa nota literal. |
| Home | Dashboard por rol, distinto de dashboards Orders/Finance. | Confundir el Home mock-seeded con indicadores operativos de `dashboards.js`. |
| Gallery | `Merchsmith Gallery.html:15` redirige a workspace `?view=gallery`, conserva hash. | Índice aún describe una variante separada y modal full-screen. |
| Modal | Inset bajo título/header y a derecha del rail, fila del producto arriba. | `- Rail Modal.html`, `- Previous.html`, full-screen de julio, overview rail. |
| Builder | Branding / Visual / Proof; picker de Brand Assets presente (`product-modal.js:1795–1812,1867–1873`). | START-HERE y HANDOVER:142 dicen wiring no construido. El botón de la biblioteca sigue siendo otro camino, no prueba de wiring completo. |
| Store | `storeProducts()` lee `MSCAT.distRange()` y aplica `MSOV`; platform store tiene su rama. | START-HERE:40 y notas “store todavía store-feed”. |
| Recommended | Vocabulario visible Recommended/Featured, aprobación y log; placement billing **dormant Phase 2**. | Curated/Spotlight visibles, listing+promo fee, cobrar placements en MVP. |
| Suscripciones | Sólo base + asientos; todos los planes incluyen plataforma completa, sin trial. | Planes con feature gating o trial como estado activo del producto. |
| Settings cliente | Organisation profile / Platform logos / Account; terms e invoice contact en **Customer Finance**. `Customer Settings.html:122–133`. | Branding/Account & terms como distribución de navegación anterior. |
| Finance | Página propia; Dashboard/Subscription/Customer invoices/Supplier invoices/Bank details/**Integrations**. `finance-invoices.js:59–65`. | Finance sólo un tab de Distributor Settings; enlaces `#finance` placeholder en notas antiguas. |
| Supplier onboarding | Flujo vigente de invitación/aprobación; ya no sólo concepto. | HANDOVER:48,157–160 y antigua clasificación. |
| All Products | HANDOVER:566–568 lo anuncia; **no existen `Merchsmith All Products.html` ni `all-products.js` en este paquete**. | Dar por disponible una página sólo porque se documentó. |

## 3. Shell, tokens y componentes transversales

**Referencias:** `tokens.css:6–37`; `theme.js:1–48`; `components.css`; `ui-polish.css:11–87,99–193,560–805`; `sidebar.js:60–190,191–321`; `chrome.js:22–110`; `identity.js`, `avatars.js`, `ui-polish-icons.js`. Admin: `Merchsmith Admin.html:201–305` y `SECT` inline.

- [ ] **S · SHELL-01** Palette base: periwinkle `#7B85C5`, deep `#5860A6`, ink `#3C4279`; spearmint `#36C0A0`, flare `#FF2E17`, sky `#0097D8`, blossom `#FFA2A5`, zest `#FFEB3D`, sprout `#9FD792`. Paper `#F4F5F8`, paper-2 `#E9EBF3`, ink `#222222`. Usar estados semánticos y tints, no tintar todo indiscriminadamente.
- [ ] **S · SHELL-02** Tipografía: EB Garamond display/serif, Mulish UI/body; no copiar Fredoka de wordmarks mock como fuente general. Pulido usa grises `g25…g900`, cuerpo g700, secundarios g600/g500 y títulos g900; jerarquía de cards tiende a sans 18px/600 aunque CSS base sea serif.
- [ ] **S · SHELL-03** Gutter `clamp(20px,2.5vw,36px)` en content/breadcrumb/footer. `width:100%;max-width:none` en app. Texto de lectura puede tener max-width propio. Settings, Home y Admin no deben encogerse al cambiar contenido.
- [ ] **S · SHELL-04** Controls: radio 8px; cards 12px en capa polish; botón principal mínimo 40px, 14px/600, padding horizontal 16px; small 36px/13.5px; pills 16px de radio, 12px/500, line-height 18px. Inputs borde g300 y ring de foco 4px con accent al 24%. Search wrapper posee borde, input interno sin segundo borde.
- [ ] **S · SHELL-05** Header sticky z50; búsqueda centrada máximo 440px, márgenes 32px, padding 8px 15px, oculta ≤880px. Tools gap22, iconos 19–20px, avatar 36px. Basket oculto a supplier/admin. Account dropdown 248px, profile/notifications/sign-out.
- [ ] **S · SHELL-06** Header distributor/customer deep tematizado; Admin usa periwinkle primario explícito (`.app .header`). Preservar blanco sobre periwinkle de marca. **No asumir mint como botón final de Admin**: hay decisiones históricas encontradas; comparar CSS ganador del console + polish en ronda visual.
- [ ] **S · SHELL-07** Rail blanco 68px, botones44×44, iconos21px stroke1.7, padding lateral12, gap4; marcador activo3px en borde. Sticky bajo altura de header medida. Flyout z55 min222px (Admin214), radio14, padding12; abre a150ms/40ms entre iconos, bridge invisible, hover/focus, Escape y fallback touch. Click de icono navega; no reflow.
- [ ] **S/P · SHELL-08** Flyouts por rol deben listar secciones realmente existentes y respetar deep links/hashes. Revisar Customer Finance, Platform logos, Store settings y Finance Integrations (tab existe pero no se lista en el flyout actual).
- [ ] **P · SHELL-09** Branding aislado por organización: `ms-platform-logo/theme/pdf-logo` vs `ms-brand-logo/theme/pdf-logo`; customer logo propio; supplier theme plataforma y customer theme distributor. Colorway picker sólo Admin/distributor. Apariencia distributor/customer no debe afectar plataforma/default store.
- [ ] **S/P · SHELL-10** Identity lockup customer × distributor; avatar/tooltip `data-mstip` fijo fuera de overflow; fallback initials. Viewing-as es herramienta demo/ghosting, no mecanismo real de autorización. Preferencias y ghost sessions deben tener equivalente autorizado.
- [ ] **S · SHELL-11** Lucide/outline consistente: dashboard chart, projects cube, products tag, orgs building, suppliers truck, team people, finance doc. SVG symbols con atributos de presentación para print. Conservar sólidos intencionales.

### Footer y contenido

**Referencias:** `components.css:23–101`, `chrome.js` `buildFooter/FOOTER_DEF/footerCfg`, `site-content.js`, `Merchsmith Page.html?p=<slug>`, `HANDOVER:180–205`.

- [ ] **S · FOOT-01** Editorial C: hero grid1.2fr/1fr/1fr gap40, padding42/38; “Let's Talk.”46px serif (36≤620); newsletter banda propia; accred/social strip; regla copyright/legal/payments. Fondo **ink** actual, sin cap. Hero2 cols≤1000,1≤620. No fijar “846px” como altura contractual: es observación antigua del contenido.
- [ ] **P · FOOT-02** Footer configurable: contact, outbound “About … ↗”, columnas, newsletter, acreditaciones/upload, sociales, payments objetos `{t,img,hpx}`, legal/powered toggle; scopes plataforma y distributor separados. Newsletter real necesita **I**, confirmación de envío local sólo **S**.
- [ ] **S/P · FOOT-03** 11 páginas desde un renderer: about, footprint, value chain, people/culture, FAQ, terms, privacy, returns, contact, cookies, accessibility. Templates editorial/legal/faq/contact; legales scaffold “Needs your wording”, no inventar clausulado. Editor por tipo en Settings → Pages; legal TOC sticky, FAQ `<details>`, contact usa detalles footer.
- [ ] **S · FOOT-04** Admin usa barra blossom fija51px desde left68px, footer marketing suprimido, widgets elevados y panels padding-bottom96px. Embeds y print ocultan chrome según contexto.

## 4. Home / Dashboard

**Referencias:** `Merchsmith Home.html:34–80`; `home-page.js:11–97` (`VIEWS`, `greet`); `home-data.js`; `cust-setup-card.js`; `HANDOVER:588–594` sólo para dashboards de Orders/Finance.

- [ ] **S · HOME-01** Greeting por hora + persona/rol/org, CTAs a derecha, título32px serif; KPI grid4 gap14,2≤900; body2 columnas1.55fr/1fr gap16,1≤980. Full-width, cards finales polish.
- [ ] **S/P · HOME-02** Distributor: pipeline, top customers, tasks, activity. Customer: awaiting approval, projects/progress, reorder favourites, deliveries. Supplier: enquiries, production, deadlines. Admin Home seed existe pero console Dashboard es superficie administrativa operativa distinta.
- [ ] **P · HOME-03** Derivar KPIs/tareas/deliveries/actividad de org y usuario actuales; datos `HOME` son mock, no objetivo literal de cifras ni fechas. Setup card customer con progreso/enlace al onboarding.
- [ ] **S/P · HOME-04** Revisar acciones placeholder: supplier enquiries/orders y admin revenue report en `home-page.js` son `#`. No considerarlas flujos completados de referencia.

## 5. Projects cliente (list/grid)

**Referencias:** `Merchsmith Projects.html:170–175,209–241` (overrides finales); `projects-page.js:14–151`; `projects-data.js`; `HANDOVER:9–11,566–568`.

- [ ] **S · PROJ-01** Cards full-width **máximo3 columnas** (`auto-fill,minmax(max(300px,calc((100% - 40px)/3)),1fr)`),1≤700; no copiar base4/3/2 previa. Gap20. Padding final34px26px24px; título23px, flags/archive/comments esquina superior derecha; date debajo.
- [ ] **S/P · PROJ-02** Scope open/delivered/archived + drafts filter, search por project/product; sort recent/deadline/action/name/items; person selector, critical/flag/status filters. KPI tiles con iconos bajo título filtran la **misma grid** en el código actual, no una ruta All Products inexistente.
- [ ] **S/P · PROJ-03** Item dots: action/ready red, progress orange, ordered/delivered green, idea grey; progress ponderado; deadlines “Order within”, today/passed, urgent chip. Member avatars3 + extra/add; product deep links.
- [ ] **P · PROJ-04** Archive/unarchive y selección bulk archive/flag, colaboradores y comments/activity. Diferenciar persistencias reales del mock: archive/team guardados, algunos flags mutan sólo el seed en memoria. Producción debe guardar por project ID y no abrir Autumn para cualquier card.
- [ ] **P · PROJ-05** Drafts dashed primero, nombre/fecha/desc/Step n of5, continue/delete. Current draft + parked hasta10; crear con `?new=1` pregunta y preserva unfinished; resume intercambia current/parked. Draft identity/org ownership real.
- [ ] **D/P · PROJ-06** “All Products” sólo documental aquí. Solicitar al coordinador confirmar si frontend o otro paquete sí contiene página; no clasificar automáticamente como pantalla V2 ejecutable.

## 6. Distributor Projects master table

**Referencias:** `Merchsmith Distributor Projects.html` HTML/JS inline, `dist-projects-data.js`; `HANDOVER:120–134`; `Developer Index:161–169`.

- [ ] **S · MASTER-01** Full-window scrollable table; Customer logo, Client avatar, Project, Status, Items, Value, Profit, All delivered by, Collaborators, Flag, Comments, Brief, Created, Last activity + select/expand. Sortable heads; density comfortable default.
- [ ] **S/P · MASTER-02** Projects Live default/All/Paused/Archived/Urgent siempre; More filters contiene Products, Order-by y Breakdown + applied tokens. Customer/Collaborator/Supplier/search; KPIs filtran. Breakdown combina área Design/Price/Sample/Stock con ownership My/Customer/Waiting/Setback/Done.
- [ ] **S/P · MASTER-03** Expand all/Collapse all; expansión **siempre list**, nunca gallery. Reference iframe del workspace `?embed=1&pid=…`, altura por postMessage; producción puede reutilizar componente sin iframe. Debe mantener modal, comments, reorder, dates y cascada de filtros.
- [ ] **P · MASTER-04** Drag reorder guardado y restorable al quitar sort, flags/comments; row actions brief/add/download; bulk pause/archive/duplicate/PDF. Seed DPROJ no sustituye multi-customer projects real.
- [ ] **P · MASTER-05** Order-by derivado de delivery y lead; supplier confirmado vence estimado; customer supplier deadline−4 working hours. Unificar clocks: standalone demo pin2025 frente embed real es deuda de prototipo, no requisito.

## 7. Create Project y Brief

**Referencias:** `Merchsmith Create Project.html`; `create-project.js:1–65,61–110,showStep/launch`; `project-brief.js:1–80` y `MSBrief/defaultsFor/artworkForItem`; `project-brief.css`; `ui-polish.css:159–164,272–379`; `HANDOVER:100–116`.

- [ ] **S · CREATE-01** Wizard fullscreen separado de shell, header identity + Save & exit; cinco pasos Project/Budget/Brand/Products/Launch; progress dots, back/continue, animaciones transform y safety net1150ms. Theme distributor. No incrustarlo dentro del rail.
- [ ] **P · CREATE-02** Project name/use/description; budget/qty/date/critical-vs-approx/country; product colours14; brand spot/mono/full/none, Pantone, logos/no logo, sample role-gated default unbranded, positions. Productos solicitados con qty×target y customize per-line; review con budget bar y3 cards.
- [ ] **P · CREATE-03** Autosave/current+parked draft; launch genera **nuevo proyecto real**, brief e items, no overwrite `autumn` ni `ms-project-title` global del mock. CTA Find products y focus del primer brief item.
- [ ] **S/P · BRIEF-01** Tres niveles: Campaign (story/use/budget/attachments), Project defaults, Requested items. Click-to-edit prose/title; attachments thumbs+lightbox; defaults tiles; items spacing12, padding16; fact controls40/34px, budget bar6px. Unsourced pill roja y badge de View brief.
- [ ] **P · BRIEF-02** Inherit vs override explícito por delivery, country, colours, brand mode/colours/custom Pantone, logos, positions, artwork, sample, notes. Chips efectivos resaltan overrides. Artwork match general category/specific type; no branding method en defaults de sourcing.
- [ ] **P · BRIEF-03** Una request line admite **varios candidates**; añade tags qty/unit y on/over/under-target, remove quita del project, add another. Budget sigue qty×target de request, no suma candidatos comparativos. `ms-brief-pending` conserva contexto hasta Done/Cancel; retorno `#briefitem=` abre y enfoca línea.
- [ ] **S/P · BRIEF-04** Sustainability filter Phase2 flag off por defecto; tile explica activación. Brief→Builder completo no demostrado: `defaultsFor` existe y color fallback en modal, no asumir resolución integral de overrides por estar disponible API.
- [ ] **D/P · BRIEF-05** Hand over to AM sigue future (`HANDOVER:138–139`): status, assignment, notify y soft lock serían P/I. Mantener en lista de decisión de alcance, no exigir paridad de un CTA que no existe.

## 8. Workspace list + Gallery

**Referencias:** `Merchsmith Project - Autumn Giveaways.html` (`#rows`, `--cols`, `titlerow`, `closeModal`, `#viewSeg`, `#galleryView`); Gallery redirect:17 líneas; `comments.js`, `delivery-confirm.js`, `lead-times.js`; `HANDOVER:402–427,509–522,713–717,1034–1035`.

- [ ] **S · WORK-01** Sticky title y table headers; View brief/alert + Add product + more actions; row Product/Actions/Price/Order by/Delivery/Status/Flag/Comments, progreso por puntos. Density comfortable. Thumbnail/name debajo hasta1560px (thumb hasta148); al lado desde1560 thumb120. Comparar `--cols` final y por rol, no primer bloque de CSS.
- [ ] **S/P · WORK-02** Filtros status/order-by/breakdown, More filters/tokens; qty y sell/profit sincronizados, expand, drag reorder, pause/archive, flag/comment, zoom, deep link `#product=NAME`. Producción referenciar line IDs, no nombres.
- [ ] **S/P · WORK-03** Sup/Cus fechas en dos filas compactas, tints blossom/spearmint, fixed152px (`:3210–3211`); Standard/Critical, calendario hover, confirmation marker y resumen agreed who/when/courier/notes. Trabajar con working days/hours y states waiting/can't meet/urgent/missed.
- [ ] **P · WORK-04** Order gate: visual+proof aprobados o unbranded; price aprobado/vigente; sample approved/not required; stock confirmado para colores elegidos; delivery confirmada. Rollup Idea/In progress/Ready/Ordered/Reorder/Paused/Archived; vocabulary Status Reference.
- [ ] **S · GALL-01** List/Gallery son mismas rows + mismo modal, estado `ms-proj-view`, query view explícito. Cards image/name+supplier/actions/price-status/date pills; flag/comment/expand encima image.4 cols base,5≥2100,3≤1680,2≤1150,1≤600; gallery sin row snap.
- [ ] **S · WORK-05** Un scheduler `__msLayout` at-most-once/frame; cerrar limpia open/compact/stuck/clone observers. No trasladar watchers document-wide acumulados. Modo embed sin chrome; `modalonly` fullscreen lifting a body para Basket.

## 9. Product modal / pop-out (núcleo)

**Referencias:** `product-modal.js` (`priceView:275`, sample calc292–325, `snapSpec:664`, `proofMiniPanel:679`, `supplierPriceModule:731`, picker1795–1812, builder1822–1894); `product-modal.css:897–929,1030…1129`; `pm-inset.js:8–34`; host workspace.

- [ ] **S · PM-01** Inset top=max(title bottom, header bottom), cap45vh; left content edge; right/bottom0, z30, **sin scrim**. Grow clip-path360ms `cubic-bezier(.22,.61,.36,1)`, disabled reduced-motion. Chrome/título quedan visibles.
- [ ] **S/P · PM-02** Fila viva arriba `#pmRowClone`, mismas columnas/acciones; Actions columna es menú vertical4 áreas con tint11%, rail izquierdo3px, label bold y dots semánticos. Scroll>60 compacta, <20 revierte: thumb48px y hide headers/submeta. Título oculta View brief/Add y muestra×.
- [ ] **S · PM-03** Section heading serif32px; sub-tabs full-width underline, status junto primer tab, actions extremo derecho. Last subtab memoria por rol; no volver a overview left rail.
- [ ] **S/P · PM-DESIGN** Branding (dist only)/Visual/Proof. Branding: multi product colours/variants, posiciones/métodos/max-colours/palette, custom position, artwork por posición+provenance, unbranded. Visual locked hasta configuración; stock photo fallback “not your design”; galería/magnify+summary. Versiones visual/proof independientes; aprobado no permite request changes.
- [ ] **S/P · PM-PROOF** Sheet3 cols `minmax(190,240) / minmax(0,1fr) / minmax(200,260)`, gap16, height min62vh/600; izquierda notes/warnings/product colour/dims, centro visual, derecha positions/method/swatches/size. Fullscreen grey,×/Escape; approve dialog warnings+tick+Submit; Do not approve exige nota; log customer actions. PDF A3 landscape/page por visual y aprobación/by/date.
- [ ] **S/P · PM-PRICE** Dist tabs Quote/Price matrix/Overrides/Additional charges/Discounts + Supplier contact; customer Quote/Price table/Additional costs si existen. Sell “£x was £y”, branding summary, qty slider5-unit+single-unit input, price-break step constante entre tiers. Distributor cost/markup/profit, customer sólo sell; supplier sólo supply cost sin margin/retail.
- [ ] **P · PM-PRICE-DATA** Blank+decoration run+setup+delivery; two-supplier carriage; locked prices/revert y quote-check/contact/reply; two-sided additional charges; discounts specificity no stack; expiry/reopen; country cost; supplier order contact/default/PO note. Guardar aprobación/expiry/country/locked/accordion data por project line; feeds deben poblar tablas reales, no METHODS seed.
- [ ] **S/P · PM-SAMPLE** Unbranded/Branded/Options (options hidden customer); fixed/quote/free, request/manual quote y stamps; cost×1.35 **mínimo+£5**, editable custom sell. Lead supplier/cust/per-product y warning si customer menor; two-stage supplier tracker. Received sample→awaiting feedback approve/request changes. No confundir precio default con quote received.
- [ ] **S/P · PM-STOCK** Colour×size stock, API/manual/made-to-order, elegido/proyecto resaltados; confirm todos chosen colours, reservation flow; customer sin confirmation banner; two-supplier blank supplier lleva stock checks.
- [ ] **P · PM-LIBRARY** Picker construido pero parece incompleto: Brand Assets upload escribe `_src` (`brand-assets.js:259`) y picker lee `src` (`product-modal.js:1805,1812`), fallback tile SVG. Verificar roundtrip de archivo real antes de declararlo integrado. Guardar blob/media ID, metadata y source correctamente en producción.

## 10. Store, catálogo y producto

**Referencias:** `Merchsmith Store.html:43–77,181–230,506–589`; `store-page.js:230–350,listingView/productView/distributorPanel/recommendBar`; `store-home.js`, `dist-storehome.js`, `catalogue-data.js`, `store-structure.js`, `colour-map.js`, `ms-brands.js`, `dist-overrides.js`; `HANDOVER:831–856,898–905,999–1009`.

- [ ] **S/P · STORE-HOME** Homepage sections en orden configurable: hero/usps/marquee/statement/bestsellers/ecoband/discover/brands/quotes/recent/steps/faq/newsletter. Edit/show/hide/reorder/duplicate/delete; best sellers hasta2rows, recent1. Spotlight retirado. Hero imagen, CTA, trust blocks, eco band; grid home5/4≤1100/3≤820/2≤520 distinto de listing.
- [ ] **S · STORE-LIST** Taxonomy nav sections/departments/subcategories, hero2cols gap30→1≤900; featured horizontal230px cards; listing facets230px + content gap30→1≤900. Product grid4 gap46px30px,3≤1680,2≤1150,1≤600 en CSS leído: **5-cols≥2100 documentado no localizado en Store CSS; verificar cascade en navegador**. List variant image150→96 container640.
- [ ] **S/P · STORE-FILTER** Search/sort/view, subcategories counts/A-Z/show-more, price bands<1/1–3/3–5/5–10/10+, base colours19 via mapping, brand tags, date/lead/qty según filtros vigentes. Product hover crossfade segunda imagen; descriptions2lines, Recommended/Featured visual según range.
- [ ] **P · STORE-CATALOG** Master DB→supplier relationship→recommended approved→dist range→store. Curated/edited/bespoke internos; visible Recommended. Edited deltas+Keep in my store cuando baseline elimina; fully bespoke oculta platform tags/promotions; distributor sólo catálogo suppliers aprobados. Platform default `?store=merchsmith` separado con scope de operator.
- [ ] **P · STORE-OVERRIDE** `MSOV` preserva original feed, sólo override distributor; Product range toggle editable según mode; fields registry vis customer/dist/both y custom typed fields. Evitar conservar defaults inventados MOQ50/lead10/eco7 si feed real desconocido.
- [ ] **S/P · STORE-PRODUCT** Layout1.1fr/1fr gap46→1≤900: image gallery+zoom/swatches, name/model/description, price-break table, lead/MOQ, colour/size/material/dims, USPs story+quotes, team reviews colapsadas **org-only**, related products, Add to project/existing/new, sample costs.
- [ ] **P · STORE-BRIEF** Brief banner/context prefilters, mark already added, toggle Add to requested item; múltiples candidates, Done back/Cancel. Sample store/modal comparte estado; no perder request al navegar departamentos.
- [ ] **S/P · STORE-DIST** Distributor13 accordions canonical data: identity/description/category/colour-size/material/media/price/sample/decoration/stock/logistics/sustainability/custom/supplier-feed según agrupación actual. “Not supplied”/POA para gaps, thumbnails, original vs override, supplier/two-supplier defaults. Platform mode Recommend/Feature/tier/remove y notes scope merchsmith.
- [ ] **P/I · STORE-REVIEW** Reviews sólo org y autor/fecha, cambios/range/tag/history con permisos; image/media persistente. No convertir seeds de testimonios en reseñas reales.

## 11. Basket → Finance checkout → Confirmation

**Referencias:** `Merchsmith Basket.html`; `basket-view.js`, `basket.css:8–108`; `finance-view.js`; `confirm-view.js`; `order-page.js`, `order-data.js`; `promo-codes.js`, `bacs-deadline.js`, `cust-account.js`, `split-delivery.js`; `HANDOVER:429–452,490–507,689–697`.

- [ ] **S · BASKET-01** Grouped by project/subtotal exVAT; grid main+summary330 gap28, single≤1100; table min1190px scroll local. Thumb76, approved tick/unbranded icon; row qty/price/cost/date/address/actions. Sticky summary header+18; totals orders/samples/total/account.
- [ ] **P · BASKET-02** Colour qty and sized colour×size `grid`, add more colours; qty totals exact. Duplicate/remove/visual zoom1100, project modalonly link. Order-by estimate10 working days, amber≤3/red passed. Address chips/full hover, notes, Apply all, missing address blocks continue.
- [ ] **P · SPLIT-01** Un diseño/proof/run, varias addresses; break pricing usa qty total. Allocator per-variant totals/min units/maxaddresses/duplicates; split evenly/rest/back1; additional carriage markup. Si cambia tras supplier send, revisar OA y notificar. Tracking/drop invoices por delivery con rollups consistentes.
- [ ] **S/P · CHECKOUT-01** Cards numeradas: billing address, invoice contact (Finance user default/Someone else), payment, delivery groups, PO/reference; sticky summary blanco. T&C, invoice email, addresses, PO number/upload condicional≤5MB; required missing list. Customer gate onboarding. No-refund branded goods dialog+ack separado antes de place.
- [ ] **P/I · CHECKOUT-02** VAT por cuenta (noVAT=0), credit used+order+available; upfront vs on-account; overlimit Send for approval. Stripe connected determina card disponible; fee integration UK/nonUK pass/absorb, BACS details/proforma y deadline default4h. Promo percentage/fixed/free-delivery con scopes/eligibility/limits/nonstack, descuento antesVAT y uso guardado atómicamente.
- [ ] **P · CONFIRM-01** Success o Sent for approval, ref/PO/date; timeline esperado, items visual/variants y delivery poraddress; totals VAT/fees/promo, payment state/due/bankref, emailed-to, AM contact, track/downloadA4/all orders/back/new. Snapshot del pedido y limpieza basket sólo tras order creation válida.
- [ ] **I · CHECKOUT-03** PaymentIntent/webhooks, account-credit reservation, order idempotency, BACS reconciliation/deadline jobs, emails y documentos reales. Pantallas prototype no cobran ni envían.

## 12. Orders (lista, operación, documentos)

**Referencias:** `Merchsmith Orders.html` entrada app; `orders-table.js:1–100` y renderer/styles; `order-page.js`; `order-detail.js`; `order-amend.js`; `order-social.js`; `two-supplier.js`; `via-us.js`; `targets.js`; `dashboards.js`; `HANDOVER:454–488,524–594,648–710`.

- [ ] **S/P · ORD-LIST** All orders/Stats/Targets distributor; KPIs filter, Orders chips + More filters, product/sample stages, payment critical/BACS overdue, customer/team/project/supplier, date Placed/Deliver-by from/to inclusive, route direct/via hub/mixed, flag, search/sort. Expand all/collapse all, inner Product/Progress/Price/Sup date/Cus date/Status headers sticky bajo outer header. Bulk CSV/flag, totals, session filter state.
- [ ] **P · ORD-ROLE** Distributor all financial/supplier columns; customer friendly stages sin supplier/cost/profit; supplier sólo work sent a su org y propio cost, blank lane sólo tras blank PO; no customer names. Backend debe filtrar, no sólo esconder columnas.
- [ ] **S/P · ORD-DETAIL** Sticky order header/progress+perline dots, item cards snap/minimize, contacts/customer-AM/supplier/project teams, status next-step.8-step supply flow received/check-send/ack/proof/confirmed/production/dispatched/delivered; revision conserva history y exige customer reconfirm/re-process.
- [ ] **P · ORD-CHECKS** Check OA/proof fullscreen split: archivo izquierdo image/PDF, detalles derecho Yes/No/NA, variants/colour/position/method/Pantone/size/artwork/notes/warnings. Snapshot spec de aprobación (versionado), supplier upload versus distributor verification distinguibles; supplier production ACK.
- [ ] **P · ORD-DOCS** Customer/supplier docs audiencias separadas. PO variants+MojoSKU+product specs+branding+notes/cost breakdown/Sup-Cus dates/contact; repeat/noFail/must-match-sample warnings. VAT invoice poritem aldispatch, diferencia order charges en última para cuadrar; CN/extra invoices/supplier additionalPO/supplier credits con Net/VAT/Gross y numeración.
- [ ] **P/I · ORD-AMEND** Distributor amend hasta delivered, draft/send/note; customer approve/query y nueva proof warnings si artwork/version cambia; before/after/variant grid exacto, persisted amendments, revision after sent, difference balance/refund. Paid increase PaymentIntent/decrease Refund real; unpaid actualiza deuda.
- [ ] **P · ORD-CANCEL** Sólo undispatched; reason/note/confirm irreversible, kept charge, CN y refunddue/deduction. Cancelled card muted+price struck, docs/history retenidos, supplier stop-work PO cancellation. Value/profit/progress/list rollup ignoran cancelados coherentemente.
- [ ] **P · ORD-SUPCHANGE** Antesproduction change single o blank+decorator, cost siempre nuevo, absorb default/pass→invoice/CN; cancel oldPO/archiveOA/proof/reset line y supdate. Blank-only reinicia lane antes blank shipment. Audit reason/by/time y opcional override futureproject.
- [ ] **P/I · ORD-DELIVERY** Edit address antesdispatch, preserve history y revised OA si enviado; split delivery dates/tracking; untracked/hand delivered/collected no track/autodelivered. Customer “I've received it” who/when/note o problem;3 working days tracked-unconfirmed prompts. Courier API/POD/jobs sólo integraciones futuras.
- [ ] **P · ORD-SOCIAL** Flag order/line; audience-separated internal/customer/supplier-perorg comments+activity, notifications; customer nunca supplier y viceversa. Contact buttons/AM/team con identities reales, no TEAMS seed.
- [ ] **P · ORD-VIAUS** Handling default1WD, samples defaultvia/bulkdirect, hubs book. Inbound tracking→goods-in received/damaged pervariant→outbound; ship together sameaddress; supplier PO lleva hub no customer data; branded printabledeliverynote, split poraddress; customer ve normal progress y VAT al outbound dispatch.
- [ ] **P · ORD-TWO** Blank+decorator registry project override>store default>seed; overs3%, transit2WD, decorator5, blankLead6 defaults configurables. BlankPO overs rounded pervariant→OA→tracking→bookin→invoice; short/damaged hold, ready gate bloquea production. Main decoratorPO sólodecorating; blanks+carriage ownPO. Two quote partial hasta ambos, branded sample stages, supplier directory externalstock/goodsin/lead/overs; no customer exposure.

## 13. Gallery, Brand Assets, brands y logos

Gallery vigente cubierto en §8 (no página de negocio independiente).

**Referencias:** `Merchsmith Brand Assets.html`; `brand-assets.js:17–117,238–311`; `brand-assets.css:20–59`; `ms-brands.js`, `ms-tags.js`, `ms-dist-tags.js`; `admin-logos.js`; `org-profile.js`; `Merchsmith Logos.html`, `Merchsmith Brand Guide.html` (documentación).

- [ ] **S/P · BRAND-ASSET**6 secciones guidelines/logos/colours/fonts/images/artwork; grid/list/search/status/select/bulk download/archive/remove, add/upload, drawer/details/history. Base grid min248 gap18 (guidelines320), previews150/document180/swatch130; contrastar polish posterior. Colour hex/Pantone/CMYK, font preview, formats/size/dims, artwork general/specific tags y projects.
- [ ] **P · BRAND-RIGHTS** Status approved/draft/archived y asset versions/storage porcustomerorg. Edit affordances aparecen todos en mock; “Studio customer” no enforcement. Acordar roles reales; no importar permission gap al backend.
- [ ] **P · BRANDS-TAGS** Product brand registry distinto de customerBrandAssets y UI colourway. Platform tags readonly distributor; disttags editable; taxonomy platform-owned; IDs/assignments persistent. Bulk y drawer deben afectar mismo product DB.
- [ ] **S/P · LOGOS** Org square y full logo separados; header/PDF versions+Original/MonoWhite/MonoBlack, crop/pan/zoom/reset/remove. Admin crop viewport480×120 header/480×160PDF,3×PNG, sin duplicated image-slot IDs. Platformfavicon128px. Upload/blob derivado y scope isolation.
- [ ] **D · BRAND-DOC** Brand Guide/logo exports son referencia identidad, no rutas SaaS a crear por defecto. Outlined wordmark como single extremecrop190%height opacity26%, nunca tiled enAdmin; documentación gobierna uso, no mock customercontacts (hay legacy contact canal-and-river en library).

## 14. Comunicaciones: Chats, Calendar, Calls, Emails, Notifications

**Referencias:** HTML homónimos; `chat.js:1–45` + `mount/canChat`, `calendar.js:1–40`, `calls.js:1–35`, `emails.js:1–38`, `notifications.js`; navegación `sidebar.js:42–58,117–162`; `HANDOVER:753–777,782–812`.

- [ ] **S/P · CHAT** Dos paneles: directorio y conversación; launcher de 400×600px limitado al viewport en otras páginas. DM/grupo/proyecto, unread/mute/read receipts/typing, búsqueda de historial, adjuntos y cards de producto/proyecto. Relaciones permitidas: propia org, distributor–sus clientes/proveedores aprobados, plataforma–distributors/suppliers. Prohibidas: customer–otros customers/suppliers y distributor–otro distributor. El roster mock está separado de People: unificar IDs reales.
- [ ] **I · CHAT-LIVE** Persistir mensajes, miembros, lecturas y archivos + websocket/typing. El prototype sólo comparte localStorage entre identidades/tabs. Imágenes JPEG reducidas a 1200px y documentos 1.5MB son límites del prototype; decidir storage real.
- [ ] **S/P · CAL** Day/Week/Month/Agenda, mini-month/Next up, overlay de hasta 6 free/busy; invitaciones accept/decline/propose/use. Horarios, lunch, festivos, vacaciones y bloques; booking link configurable y preview; calendarios conectados. Grid 7–20h a 48px/h; meetings video/phone/presencial, agenda, proyecto/producto, reminder, repeat y `.ics`.
- [ ] **P/I · CAL-NOTES** Otras personas muestran free/busy sin títulos salvo reunión compartida. Notas por occurrence: summary/actions/transcript/search/source/file/doc. Gemini import simulado, parser TXT/VTT/SRT y PDF/DOCX adjuntos. Google/Outlook/Calendly/iCal/OAuth, timezone por usuario y jobs de reminders requieren integración.
- [ ] **S/P/I · CALLS** Sólo Admin/distributor: dial contacts/number, history con filtros/missed badge, voicemail/settings, drawer con player/transcript/summary/project/notes. Call bar sobrevive a navegación: mute/hold/keypad/transfer y forwarding a dos colegas→voicemail. Anuncio de grabación obligatorio, retention/delete. Audio, telefonía y transcripción simulados: requieren proveedor real.
- [ ] **S/P · EMAIL** Sólo Admin/distributor; Sent/Drafts/Saved replies/Templates/Sending domain/Reply by email/My emails. Estados/timeline/bounce/resend, 16 templates en 7 categorías, merge fields y password reset obligatorio; firma y layout snapshot con marca de org. Composer To/Cc/Bcc máximo 20, rich text saneado, entity link, adjuntos 20MB/project files, schedule/draft/autosave.
- [ ] **I · EMAIL-SEND** Delivery/open/bounce/inbound webhooks; SPF/DKIM/DMARC/MX y verificación de dominio; reply address único→thread/audiencia correctos, política unknown sender, digest/preferences/scheduler. El prototype nunca envía realmente.
- [ ] **S/P · NOTIF** Bell badge, dropdown All/Unread agrupado, mark all/per-row/snooze/mute/type off; inbox Unread/Mentions/Snoozed/type/search/day. Grid in-app/popup/email por rol, quiet hours/weekends y digest. Announcements título/audiencia/importancia y brand bar saneada: scheduled/draft/live/ended, gana la más reciente; platform bar encima de distributor bar.
- [ ] **I · NOTIF-EVENTS** Event bus + destinatarios por usuario + deduplicación + jobs/websocket. Comments/proof/quote expiry/payments/stock/orders/meetings deben producir eventos coherentes. Role-wide browser store no es modelo de permisos multiusuario.

## 15. People, Organisations, Team, Profile e invitaciones

**Referencias:** `Merchsmith Organisations.html`, `org-page.js`, `org-table.js`, `org-map.js`, `org-data.js`; `Merchsmith Users.html`, `dist-users.js`, `admin-users.js`; `Merchsmith Team.html`, `team-page.js`; `people.js:29–67` y sharededitors; `names.js`, `address.js`, `org-profile.js`, `acct-manager.js`, `product-notes.js`, `flags.js`; `HANDOVER:225–241,269–294,719–751`.

- [ ] **S/P · ORG-LIST** Customer/supplier views con 6 stats, Table/Cards/Map, search/filter/sort/clear, logo/contact/avatar, unread notes, flags y drawer. Customers: AM stack, project approvals, spend12, credit bar roja ≥80%, since/status. Suppliers: products/range/recommended/feed/import/service. Lead es métrica de producto: excluir supplier lead obsoleto.
- [ ] **P · ORG-DRAWER** Shared details/address book, relationship/trading terms, key contacts, People/teams, range/orders/service reales, notes/comments/history. Org profile usa mismo editor en Settings/Admin; no copias divergentes. Distributor posee terms; cliente posee profile/logos.
- [ ] **S/P/I · ORG-MAP** Mismos resultados filtrados en tabla/mapa. Leaflet/OSM gris, clusters ~44px, colour por flag/status/AM/type/plan, size por valor. Near postcode/town/location 5–100mi, fit y missing-address list. Persistir lat/lng y geocodificar en address save; geocoder internacional es integración, no pins seed.
- [ ] **S/P · PEOPLE** Users: own team + customer users + supplier contacts; filtros type/org/role/AM/status, surname sort, contact buttons, profile panel/flags/notes/audit. Team agrupado por org, cards/table/invite/manage teams; sólo borrar equipos vacíos. Deactivate/reactivate, nunca borrar personas; guard de active Admin/Owner.
- [ ] **P · ROLES** `people.js`: distributor Admin/Account Manager/Studio/Production Manager/Finance; customer Admin/Buyer/**Finance**/Viewer; supplier Admin/Contact; plataforma Owner/Admin/Support/Billing. Customer `PERMS.finance=['Admin']` pese Finance añadido; onboarding menciona Approver que no existe en `ROLES`. Resolver explícitamente estas discrepancias.
- [ ] **P · PEOPLE-EDIT** First/Last/Preferred/title/email/phone/avatar/role/team; user key estable desde seed email, duplicate email intra-org bloqueado y último Admin preservado. Self-edit con rol bloqueado; acciones org admins/AM según PERMS. Audit actor/detail, cap prototype 1500.
- [ ] **P · ASSIGN** AM por customer **user** con default de org; cambios/historial/counts/filter stack. Profile/contact/invoice usan persona asignada, no Jess literal.
- [ ] **P · PRIVACY** Notes de hechos duraderos, comments thread e history merged separados. Visibilidad me/team/org con aislamiento org primero; sólo autor edita/borra. Platform/dist notes aisladas incluso en default store. Price history necesita emisión del importer; no fabricar actividad.
- [ ] **S/P/I · PROFILE-INVITE** My profile: foto/detalles/notifications/security. Accept Invite valida org/email, revoked/used, name/photo/password 8+, active/joined; customer redirige onboarding. Tokens/password/auth/MFA/resend real requieren integración; formulario password mock no demuestra autenticación.
- [ ] **P · ADDRESS** addr1/city/UK postcode required, addr2/county/country; address book con títulos y exactamente un default. Find address prototype = postcode API + calles sample. Billing/delivery comparten modelo canónico.

## 16. Settings, onboarding y supplier

**Referencias:** Distributor/Customer Settings HTML; CustomerFinance HTML; `markup.js`, `discounts.js`, `store-appearance.js`, `store-domain.js`, `lead-times.js`, `billing.js`; `cust-onboard.js`, `onboarding.js`, `cust-setup-card.js`, `terms-approval.js`; `dist-invite.js`, `dist-onboarding.js`, `sup-invite.js`, `sup-onboarding.js`; `supplier-portal.js:19–51`; `HANDOVER:295–394,648–668,839–856`.

- [ ] **S/P · SETTINGS-DIST** Settings: Org profile/Lead times/Footer/Pages/Branding/Domain/Subscription. Store settings: Homepage/Markup/Discounts/Appearance; Product range aparte. Old billing links redirigen a Finance. Hash load/change conserva tab/crumb/rail. Customer Settings profile/logos/account, con link a Finance para terms.
- [ ] **P · SETTINGS-PRICE** Markup por total-cost threshold, multiplier/min-profit: max(cost×markup,cost+min-profit). Discounts product>project>customer>category>site, no combinados. **Binding store/quote incompleto según notas y código buscado**: editor existente no demuestra engine wiring.
- [ ] **P · SETTINGS-APPEAR** 9 fonts curated/upload ≤1.5MB, headings ink/brand, button pill/rounded/square y filled/outline, card/band/image radii; preview/save sólo changed/reset. Aplica dist/customer app, no platform/supplier/default store. Font/media upload debe persistir.
- [ ] **P/I · DOMAIN** Platform subdomain + custom CNAME/TXT, verify states/provider guides/copy/remove. Cambiar dominio live monta nuevo junto al viejo; swap tras verify, redirect 90 días/cancel. DNS simulation necesita SSL/routing host→tenant reales.
- [ ] **P · LEADS** Working days/hours/days in lieu; sample supplier U1/B7 y customer U3/B10 defaults, product overrides, via-us handling/hubs. Product lead, no supplier lead; festivos/calendario canónicos.
- [ ] **P · CUST-INVITE** 4 steps+Review: org/people/brand/terms-delivery. New org vs add existing salta brand/terms; duplicates exact/soft, emails, AM/roles, draft CUS sequence/resume/unsaved-close. Decisión actual elimina customer colour pickers. Payment on order default; credit/non-upfront→Finance approve/changes/decline + notify/history.
- [ ] **P/I · CUST-ONBOARD** Invite org/user, Your details required y notification prefs; admins org/logo/delivery/billing/terms/team/tour/final AM. 6 org steps gate ordering, Skip opcional marcado, progress/who/when/reminders 3/7 días/Home card. Separar progress user/org y jobs de email reales.
- [ ] **P/I · DIST-ONBOARD** Invite 5 steps org/people/plan/brand/review owner+draft. Onboarding welcome/you/company/plan-payment+T&C/brand/domain/team/email-domain/done-contact. Mínimo 1 mes, cargo día1 y monthly advance, seat limits, store offline hasta 5 requisitos completos, active+notify; sin trial. Copy `.store` vs `.shop` discrepa: decidir hostname.
- [ ] **P/I · SUP-ONBOARD** Invite 5 steps org/type/contacts/logo/review; dist request→platform approve/send; admin invite→invited. Onboarding welcome/you/company/type/feed API attachments o CSV/manual/team/terms/done→review. Approve & go live antes de products visibles; draft/checklist/%/reminders/ghost. Full supplier drawer es alternativa; wizard antiguo no primary.
- [ ] **S/P · SUP-PORTAL** Shell + Products/Approvals/History/Finance billing/Profile; products table thumb56px, stats/filter/tier, accept/decline/history; decorating external stock/goods-in/overs/lead/carriage limits. Orders en página compartida; blank stock lanes incoming/outgoing scoped.
- [ ] **P · SUP-SCOPE** `supplier-portal.js:19–27` cae al supplier de catálogo más grande si propio count<10: **demo only**. Login real conserva own scope incluso vacío.
- [ ] **P/I · SUP-PLACEMENT** Placement gratis en MVP, aprobación/historial operativos. Recommended £5/Featured £60 global/override, whole-month + extra month al retirar: modelo retenido pero collection off/Phase2 notice. Direct Debit mandate simulado, no cobro activo.

## 17. Platform Admin, feeds y finanzas

**Referencias:** `Merchsmith Admin.html`; `admin-home/page/data/orgs/panels/users/products/curated/storelayout/supplier/product/import/ logos` módulos; `feed-adapters.js`, `field-registry.js`, `field-manager.js`; `Merchsmith Finance.html`, `finance-invoices.js:59–65`, `finance-tables.js:40–58`, `finance-integrations.js:1–38`; `dashboards.js`, `targets.js`, `demo-orders.js`; HANDOVER secciones administrativas y Finance.

- [ ] **S/P · ADMIN-DASH** Shared header/rail, panels full-width; sin gradient hero. Crop único de outline brand art al 190% height/26% opacity; 5 stats con top rule 3px y EB Garamond38–52. Attention empty state. Orders platform/subscription finance distintos del Home mock; ghost autorizado.
- [ ] **S/P · ADMIN-DIR** Distributors: contact/region/plan/range mode/seats/customers/MRR/revenue/status/joined/activity/domain/onboarding, sortable y filtros. Suppliers: contact/type/feed/products/recommended/used-by/status/since/import/onboarding; drawers People/details/invite/checklist/orders/service. Users con global audit; Team con PERMS.
- [ ] **P · ADMIN-PLANS** Starter £250/mo, 3 seats, +£95; Growth £750/8/+£80; Scale £1200/15/+£65. Cinco roles distributor billables, nunca customer/supplier. Deactivate libera seat; invited/suspended non-bill rules desde `seatInfo/recalc`; MRR derivado. Revenue estimates no son payment history.
- [ ] **S/P · ADMIN-PRODUCTS** Gallery default 6 columnas responsive, table thumbs72/hover enlarge; data health4 metrics, sortable Data, 6 saved presets/custom; search/supplier/dept/brand/tags/subcats/image/listable; group supplier/dept; prev/next drawer/review tray y keyboard J/K/Space/C/Enter. Select-all/bulk range/taxonomy/tag/brand, load-more, sticky header y scroll horizontal local.
- [ ] **P · ADMIN-CURATION** Recommended range/tier/commercial/change log; pending/approved/declined antes de placement visible. Rates/override/reset, notices adopt/dismiss distributor. Fees proyectados, no revenue activa. Mantener modelo dormant.
- [ ] **P · ADMIN-TAXONOMY** Sections/depts/subcategories CRUD/reorder/A-Z/featured images/intros y productos con multi-assignments. Global owned, distributor readonly; brand/tags many-to-many. Registry typed/visibility/custom; connect-time field map conserva keys separados que necesitan migración.
- [ ] **P/I · ADMIN-FEED** Import full-page supplier-anchored Source→Map & normalize→Preview/import. CSV quoted parser/Bio Labs; PF multi-JSON price/print/stock/product join; Xoopar Akeneo values EUR→GBP. Coverage/value category-method-colour maps/warnings/sample/store preview, ingest logs/idempotency/reimport/history. Neutral/Xindao detect-only stubs.
- [ ] **P · FEED-GAPS** PF product CNL1 585 vs price CNL2 2062 con **cero overlap**: no importer bug. Union rich POA/priced-no-image; hace falta matched channel. Listable=image+price+description+branding; gate unlistable range aparcado. Decoration book compartido133 métodos; no inventar MOQ/precio/stock.
- [ ] **S/P · ADMIN-SETTINGS** Org profile/logos/favicon, flags/colourway/product fields/go-live/catalogue source/backup-restore-embed. Seed/blank reversible conserva taxonomy; botón destructivo hace backup y runtime clear. Browser mode no es auth/reset production.
- [ ] **S/P · FINANCE-TABS** Finance6 tabs: Dashboard/Subscription/Customer invoices/Supplier invoices/Bank details/Integrations. Customer Finance3: Overview/Invoices/Terms & invoicing (`Merchsmith Customer Finance.html:122–129`). Bank reference PO/order/prefix, instructions/payment window; subscription card/Bacs/mandate e invoices12months.
- [ ] **P · FIN-CUST** VAT invoice por línea, extra invoice/CN: net/VAT/gross/issued/due y Paid/Overdue/Due soon7/Not due/CN. Ageing Current/1–30/31–60/61–90/90+, filters/sort/date/select/CSV/remind/record payment; drawer contact/order/project/lines/history/pay link. Customer own-org scope.
- [ ] **P · FIN-SUP** Sent PO expected cost/invoice amount/delta/pay-by y Awaiting/To approve/Differs/Approved/Overdue/Paid. Agree variance/approve/pay/chase; additional PO y supplier credits negativos Credit to use/used; old cancelled PO visible. Two-supplier cost split/overs/carriage exactos.
- [ ] **P · FIN-TALLY** Reconciliar charges/cancel/credits/payment balances/card fees/tax rounding con order. Concern estático: `finance-tables.js:48–49` base qty×unit vs extras en última invoice del print documentado. Verificar roundtrip y no copiar matemáticas divergentes.
- [ ] **S/P · DASH-TARGETS** Orders Stats/Finance Dashboard/Admin engine compartido: period/compare/print/table links, order value sin cancelados, profit/margin, on-time agreed-date+1, at-risk≤5days/not production, invoiced/received/outstanding/ageing/cash forecast. AM actual vs target; 12 meses revenue/profit, pasado locked, recurrencia prior-year, working days UK holidays/override y fill open months.
- [ ] **P/I · INTEGRATIONS** Stripe Connect Standard propio, test/live/methods/descriptor/fee pass-or-absorb/pay links; checkout lee connected/fees. 7 packages: **Xero, Sage, QBO, FreeAgent, Zoho, KashFlow, ClearBooks**. Connect simulado; send customers/invoices/CN allocations/payments+fees/approved bills+PDF, pull reconciled payments; auto/from-date/numbering/tracking/account-VAT mapping/sync log/retry.
- [ ] **I · LIVE-FIN** Tokens/secrets/OAuth, webhook queue/retries/idempotency por invoice/PO, adapters por proveedor/currency/tax rules. Modal connect1.6s o hashed synced no prueban integración real. Stripe/Bacs/email/courier/calendar son trabajos independientes.

## 18. Inventario explícito de HTML: vigente / documental / anterior

La tabla cubre **todos los HTML de primer nivel observados en V2**, agrupando familias cuando comparten clasificación. Los assets/screenshots/uploads/share no son pantallas nuevas por sí mismos.

| Archivo(s) exactos | Clasificación / sección de este informe |
|---|---|
| `Merchsmith Home.html` | App vigente, §4. |
| `Merchsmith Projects.html`; `Merchsmith Distributor Projects.html`; `Merchsmith Create Project.html`; `Merchsmith Project - Autumn Giveaways.html` | App vigente, §5–8. |
| `Merchsmith Gallery.html` | Alias redirect vigente, §8. |
| `Merchsmith Project Sheet.html`; `Merchsmith Project Sheet (Detailed).html` | Outputs imprimibles vigentes; summaryA3portrait1123×1587 / detailedA3landscape1587×1123+coverQUOTE, snapshotpayload/validuntil/status, no poweredmark enfooter. S layout; P correctsnapshot; no inferir servicioPDFserver del browserprint. |
| `Merchsmith Store.html`; `Merchsmith Basket.html`; `Merchsmith Orders.html` | App vigente, §10–12. |
| `Merchsmith Brand Assets.html` | App vigente, §13. |
| `Merchsmith Chats.html`; `Merchsmith Calendar.html`; `Merchsmith Calls.html`; `Merchsmith Emails.html`; `Merchsmith Notifications.html` | App vigente con capacidades simuladas, §14. |
| `Merchsmith Organisations.html`; `Merchsmith Users.html`; `Merchsmith Team.html`; `Merchsmith Profile.html`; `Merchsmith Accept Invite.html` | App vigente, §15. |
| `Merchsmith Customer Settings.html`; `Merchsmith Distributor Settings.html`; `Merchsmith Customer Finance.html`; `Merchsmith Finance.html` | App vigente, §16–17. |
| `Merchsmith Customer Onboarding.html`; `Merchsmith Distributor Onboarding.html`; `Merchsmith Supplier Onboarding.html` | Flujos vigentes, §16. Supplier ya no simpleconcepto. |
| `Merchsmith Supplier Portal.html`; `Merchsmith Admin.html` | App vigente, §16–17. |
| `Merchsmith Page.html` | Renderer11contentpages vigente, §3. |
| `Merchsmith Recommended Standard.html` | Explainer vigente Recommendedcriterios/process/2tiers/freetoday, no supplierfeeactive. |
| `Merchsmith Developer Index.html` | D: índice/historial, algunas cards stale (Gallery/caps/AllProducts no listado); no appnav. |
| `Merchsmith Status Reference.html` | D: vocabulario/aprobaciones/ownership/delivery canonical; sí gobierna comportamiento §8–9. |
| `Merchsmith Field Mapping Reference.html`; `Merchsmith Product Feed Spec.html` | D: canonical57fields12groups y feedshape; mappingtools útiles; no confundir57doc con27built-inregistry. |
| `Merchsmith Org and User Model.html` | D: entidades/lifecycle/PERMS live, governance §15. |
| `Merchsmith Platform Brief.html`; `Merchsmith Site Map.html` | D: visión/mapa, contrastar notasde julio con códigoactual. |
| `Merchsmith Brand Guide.html`; `Merchsmith Logos.html` | D: identidad/logoexports, §13. |
| `Merchsmith Two-Supplier Developer Guide.dc.html` | D: guía workflow/API/screenshot; negocio §12, no nuevaappsurface. |
| `Xoopar API Product Preview.html`; `Xoopar Field Map.html`; `Xoopar Single Product Fields.html` | D: validaciónadapter223fullcontent de1188records,107attrs+6recordfields/77singleproduct, tierpricing/moneyarrays/Frenchmethods/weight fixes; no storefrontalternativo. |
| `Merchsmith Sidebar Concept - Hover Rail.html` | D concepto **adoptado** como rail; rationale, implementaciónsidebar/Admin manda. |
| `Price Matrix Concept.html` | D concepto absorbido por Price modal; usarparaexplicarengine, no tab/páginareal extra. |
| `Branding Builder Concept.html`; `Design Split Concept.html`; `Supplier Connections Concept.html`; `Organisations Concept.html` | D exploración; currentbuilder/visualproof/orgs/onboarding prevalecen. |
| `Merchsmith Store Home (Merchery Style).html`; `Merchsmith Store Home (Mockup).html` | D standalone studies; storefrontvigenteStore.html. |
| `Footer Option A.html`; `Footer Option B.html`; `Footer Option C.html` | D comparación;Cchosen incorporadochrome/components, no3footers aimplementar. |
| `Merchsmith Admin Footer Options.html` | D variantesfooterconsole;current51pxbarAdminHTMLmanda. |
| `Merchsmith Gallery - Previous.html`; `Merchsmith Project - Autumn Giveaways - Previous.html`; `Merchsmith Project - Autumn Giveaways - Rail Modal.html` | **Anterior**, excluido como target. Usefulmigrationcontrastonly. |
| `Merchsmith Orders (standalone).html`; `Merchsmith Orders - export source.html` | Export/artefacto; entrycanónicoOrders.html+módulos. No declararquivalenciasdebehavior dearchivos enormes sinruntimeaudit. |
| `Canvas.dc.html` | D auxiliarcanvas/support; no destinoappidentificado ennav/index. |

Otros recursos inventariados: `styles.css` (brand/public primitives, no sustituto de polish), `.image-slots.state.json`, `ms-branding.state.json`, `ms-data.js/ms-mode.js` portability/demo; `design-split-plan.md`, `price-engine-plan.md`, `feed-schema-notes.md` planificación/parser; `od-css.txt`, `probe-helper.txt`, `support.js` auxiliares. No nuevasfeatures inferidas de dichos artefactos.

## 19. Discrepancias y límites que necesitan decisión o prueba

1. **Docs contradictorias:** caps/full-width, mint/periwinkle button Admin, footer deep/ink, Gallery separado/alias y supplier onboarding concepto/flow. Ronda2 debe usar CSS ganador y capturas a viewport acordado, no sumar iteraciones incompatibles.
2. **All Products no incluido** pese `HANDOVER:568`. Cubierto documentalmente, sin runtime file que comparar.
3. **Brand Assets picker `_src` vs `src`:** integración visible existe, pero uploaded artwork podría mostrar tile fallback. Validar upload→brief→builder→proof→order snapshot.
4. **Projects hardcoded `autumn` y title global:** muchas cards abren mismo workspace y wizard escribe Autumn. No trasladar límite a CRUD real.
5. **Roles/permisos incompletos:** Finance en ROLES pero no PERMS.finance; Approver sólo onboarding; projects `isAdmin=…||true`; terms review non-Finance; Brand Assets edits para todos. Acordar reglas reales, no preservar gaps.
6. **Supplier fallback largest catalogue:** rompe ownership real. Supplier vacío debe seguir vacío.
7. **Cifras/tiempo inventados:** Home/Admin stats/service/cost fallback, clock2025, hash sync y courier delivery. Replicar jerarquía, derivar datos reales, no exigir cifras mock.
8. **Invoice totals:** base qty×unit en registro vs extras en última invoice impresa. Verificar carriage/discount/promo/card fee/CN/cancel/extra PO/credits. Pantalla presente no demuestra consistencia financiera.
9. **Empty range fallback:** `store-page.js:334–341` cae a seed si range vacío. App real no debe reintroducir productos ocultos. Acordar también política de missing data/POA.
10. **PF listable gap:** CNL mismatch impide match, no UI bug. No forzar gate que vacíe range; Neutral/Xindao stubs. Reconciliar schema connect/import/doc57/registry27.
11. **Sidebar stale:** Integrations existe pero no flyout; Supplier invoices placeholder. Comparar Cards/Map/type views con rutas reales.
12. **Media:** remote404/fallback supplier no implica backend bug. Imágenes/fonts/proofs/docs reales requieren object storage; data URLs localStorage no modelo production.

## 20. Comparación prioritaria y contrato para ronda 2

| Prioridad | IDs / comparación | Criterio de aceptación a devolver por coordinador |
|---|---|---|
| **P0-A** | SHELL-01…11, FOOT-01/04 | Ruta+rol+viewport; header/rail/gutter/type/radius/palette/tabs. Medidas y posiciones que afectan toda la app. |
| **P0-B** | WORK-01…05, PM-01…03, PM-DESIGN/PROOF/PRICE | Row layout/inset/actions/subtabs, paridad customer/dist, approvals y order gate exacto. |
| **P0-C** | CREATE/BRIEF/STORE-BRIEF/PROJ-05 | Proyecto/draft sin overwrite, defaults/override, multi-candidate y retorno al brief enfocado. |
| **P0-D** | BASKET/CHECKOUT/ORD/FIN-TALLY | Variants/address/proof/price snapshot; workflow y balances net/VAT/gross; place sólo con requisitos cumplidos. |
| **P1-A** | STORE-CATALOG/OVERRIDE/ADMIN-PRODUCTS/CURATION | Catalogue→relationship→range→visibility; gaps de feeds y ningún fallback demo que revele productos. |
| **P1-B** | ORG/PEOPLE/ROLES/PRIVACY/ONBOARD | Un grafo org/user, AM por user, último Admin, comments privados, progress y gates. |
| **P1-C** | ORD-TWO/VIAUS/SPLIT/SUPCHANGE/AMEND | Lanes/gates/POs/history/refunds/invoices: alcance que requiere persistencia. |
| **P2-A** | CHAT/CAL/CALLS/EMAIL/NOTIF/INTEGRATIONS | UI existente vs integración: simulated/backend partial/external working, no sólo “página existe”. |
| **P2-B** | FOOTCONTENT/BRAND/DASH-TARGETS/SETTINGS | Editores consistentes entre páginas, media/docs, targets derivados y legal scaffolds. |

Formato solicitado para reconciliación: **ID referencia → ruta/componente frontend → encontrado/parcial/ausente/no-aplica → evidencia código o browser → delta visual → delta comportamiento → P/I faltante → prioridad**. No marcar checkbox como implementado sin verificar ruta/rol/estado correspondiente.

### Cobertura y trabajo pendiente explícitos

- **Cubierto:** shell/tokens/chrome/footer/content; Home; Projects cliente/master/create/drafts/workspace/brief; Store home/list/catalogue/product; modal Design/Price/Sample/Stock; Basket/checkout/confirmation; Orders list/detail/docs/changes/cancel/split/two-supplier/via-us; Gallery; Brand Assets/brands/tags/logos; Chats/Calendar/Calls/Emails/Notifications; orgs/users/team/profile/invites; settings por audiencia; Admin panels/feed mapping/import/curation/taxonomy/subscriptions; onboarding de las 3 audiencias; supplier portal; Finance customer/distributor/integrations/dashboards/targets; documents/specs/exports/concepts/previous.
- **Pendiente ronda2:** recibir auditoría Frontend, resolver discrepancias y construir matriz comparativa. No se han afirmado gaps frontend en esta ronda.
- **Pendiente runtime/visual:** screenshots/computed styles/interacciones por rol y viewport mediante Playwright en sesión coordinada. Medidas aquí proceden del CSS/código/documentación citado, no de browser.
- **No realizado:** edición referencia/frontend, mutaciones browser, backend execution, agentes adicionales o commits.
