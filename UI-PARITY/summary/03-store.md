# Summary 03-store (frontend)

Método: auditoría de textos/estructuras de `ref/03-store.md` contra `src/app/(protected)/store/**`, `features/store-range`, `features/store-settings`, `src/app/recommended-standard`. La Store real ya implementa casi todo (home editable, listado con filtros/sort/grid-list, ficha, Distributor view, Price matrix 3 pestañas, Store range, reviews, notas). De 328 literales de la ficha, solo ~77 faltan y la mayoría son datos de prototipo (mocks, nombres demo, errores de formularios locales). Decisión coordinador: modelos de descuento/markup de la ref NO se copian (se mantiene `discount_rules` customer-scope y las bandas del backend); solo lo visual.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Etiquetas de sección de home: `Sustainability band`, `Featured brands`, `Customer quotes` | `store/homeSections.ts:55-59` ("Eco impact band", "Brand row", "Customer quote") | etiquetas distintas | renombrar | baja | done |
| 2 | `You might also like` | `products/[productId]/page.tsx:1588` "You May Also Like" | capitalización | texto de la ref | baja | done |
| 3 | `Distributor view` | `page.tsx:821` "Distributor View" | capitalización | texto de la ref | baja | done |
| 4 | Branding: `Branding Area` | `page.tsx:1216` "Branding area" | capitalización | texto de la ref | baja | done |
| 5 | Delivery time: nota `Please note: Delivery Time is from the point of placing your order…` | `StoreFiltersPanel.tsx:521-540` sin nota | falta nota informativa | añadida bajo el slider (texto literal; sin botón `i` colapsable) | baja | done |
| 6 | Filtro `Stock location` (UK/EU stock con contador) | `StoreFiltersPanel.tsx` no lo tiene | falta filtro | requiere campo de ubicación de stock filtrable en el listado; ver Backend | media | fuera de alcance (Backend: sin ubicación de stock filtrable) |
| 7 | Orden de sort, vista grid/list, filtros Category/Brand/Social accreditations/Colour/Price/Sustainability/Delivery time | `StoreListing.tsx`, `StoreFiltersPanel.tsx` | coincide (más `Tags`) | ninguno | - | done |
| 8 | Home: hero, usps, marquee, statement, bestsellers(6), ecoband, discover, brands, quotes, recent, steps, faq, newsletter | `StoreHome.tsx`, `storeContent.ts` | textos por defecto idénticos | ninguno | - | done |
| 9 | Ficha: galería, Product info, Branding, Price & lead time, USP badges, stories, reviews, "Add to Project", zoom | `products/[productId]/page.tsx` + componentes | coincide | ninguno | - | done |
| 10 | Distributor view: acordeones, Price matrix (Full matrix / Markup & rules / Worked example), Sample cost, overrides, notas | `products/[productId]/components/*` | coincide; bandas/descuentos siguen el modelo real (decisión 1) | ninguno | - | done |
| 11 | Barra de rango (`In your range`, `Store range settings →`) y recommendBar | `RecommendedRangeBar.tsx`, `features/store-range` | textos de estado difieren parcialmente ("Awaiting supplier · tier") | alinear textos con la ref: `Awaiting supplier approval` (+ `Proposed as {tier}. It goes live once the supplier accepts the terms.`) | baja | done (título alineado; el texto detalle ya existía) |
| 12 | Store range: modos `Recommended range / Recommended + edits / Bespoke`, confirmaciones, bulk bar, drawer | `features/store-range/*` | coincide ("Recommended + edits") | ninguno | - | done |
| 13 | Recommended Standard (página estática) | `src/app/recommended-standard` | existe | revisión visual pendiente | baja | todo |
| 14 | Store appearance (tipografía, botones, cards) | `settings/components/StoreAppearanceTab.tsx` | existe | ninguno | - | done |
| 15 | Banda de tienda `--slate`, breadcrumbs `Home › Store › …` | `StoreBreadcrumbNav.tsx`, `BreadcrumbBandProvider` | pendiente de verificación visual | verificar | baja | todo |

## Fuera de alcance
- Toda la persistencia localStorage de la ref (home, range, overrides, reviews, notas, sample costs): el real ya usa API/DB.
- Cobros Recommended/Featured (Phase 2), newsletter real (requiere `private_mode_enabled` y tabla), subida de fuentes propias/storage nuevo, `prompt()` de imágenes de tile/hero, lightbox del prototipo.
- Modelos duplicados de bandas de markup y descuentos: se mantiene el modelo real.
- Mockups históricos (Merchery, Store Home Mockup), Price Matrix Concept (solo especificación).

## Backend
Verificado en `store`, `store-range`, `store-settings`, `curated-range`, `product-reviews`, `subject-notes`. Resultado: **cubierto**, salvo el filtro Stock location.

| Necesidad | Endpoint | Estado |
|---|---|---|
| Listado con búsqueda/filtros/sort | `GET /api/store/products` (`search`, `ids`, `category_id`, `department_id`, `subcategory_id`, supplier, etc.; sort `name/created_at/updated_at/sort_order/lead_time_days`) | cubierto |
| Ficha + variantes + price matrix + stock | `GET /api/store/products/:id` (stock por variante y agregado, `distributor_preview` para operador) | cubierto |
| Store range (modo, items, tags, reset, cambios) | `GET /store-range/catalogue`, `/changes`, `POST /items`, `/mode`, `/reset`, `/tags` | cubierto |
| Home editable / apariencia | `GET/PATCH /store-settings` | cubierto |
| Reviews / notas privadas | `store/products/:productId/reviews` (GET/POST/DELETE), `subject-notes/*` | cubierto |
| Row 11 "Awaiting supplier approval" | `curated_range_items.tier` + 409 "already awaiting the supplier's approval" en `curated-range.service.ts:384`; el estado se deriva ahí | cubierto (solo textos en frontend) |
| **Row 6 Stock location (UK/EU)** | no existe | **falta; fuera de alcance** (ver abajo) |

### Fuera de alcance (backend)
- **Filtro Stock location UK/EU**: el listado no expone ni filtra ubicación de stock. Existen `product_stock_levels.warehouse_code/warehouse_name` (por variante) y `products.origin_country`, pero (a) los feed adapters NO rellenan `warehouse_*` (solo se escriben por la API manual `product-stock`), y (b) `origin_country` es país de fabricación, no ubicación de stock. Para soportarlo haría falta que los adaptadores de feed clasifiquen el almacén (UK/EU) y persistan un campo/regla, es decir cambio de feed-sync y posiblemente columna nueva. No implementado; el frontend debe dejarlo como fuera de alcance.
- Newsletter real, cobros Recommended/Featured (Phase 2): sin tabla/servicio.
