# Summary 12-supplier-portal (frontend)

Método: auditoría de `ref/12-supplier-portal.md` (175 literales; 65 sin coincidencia) contra `src/app/(protected)/supplier/**`, `features/supplier-portal`, `features/onboarding`. Decisión del coordinador: no copiar código muerto de Supplier Onboarding (pasos delivery/bank/dd). Páginas reales: products, approvals, placement-history, billing, orders, price-quotes, sample-quotes, stock-checks, deliveries, connection-requests, settings.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Approvals: botón `Accept placement`; vacío `Nothing waiting on you` + `No placements awaiting approval.` | `supplier/approvals/page.tsx` | título, CTA y empty state para cero solicitudes pendientes alineados | ninguno | baja | done |
| 2 | Lista de aprobación con miniatura 64px, pills de términos (`Featured`/`Recommended`), meta `{code} · {dept} · proposed d MMM yyyy` | `approvals/page.tsx:130-160` (sin miniatura, meta distinta) | estilo | añadir miniatura y meta con código/dept si la API de placements los devuelve (ver Backend) | media | todo |
| 3 | Products: filtro vacío `Nothing matches that filter.` | `supplier/products/page.tsx` | copy previo distinto | alineado el título del empty state; detalle orienta búsqueda/filtro | baja | done |
| 4 | Billing (Placement billing): `Monthly invoice` — `Nothing is being charged today…`, `Whole months only`, `Withdrawal costs one further month`, Direct Debit mandate (`Set up Direct Debit with Stripe`) | `supplier/billing/page.tsx` | UI cubre proyección, política de meses completos y mandato informativo; no recoge datos bancarios ni activa cobros | mantener estado explícito Phase 2; mandato real/cargos fuera de alcance | media | done (UI informativa; cobro real fuera de alcance) |
| 5 | Onboarding supplier: `Finish the steps marked below…`, `Welcome! I’ll review your setup…`, `Choose at least one specialism.`, `Please accept the Supplier Terms & Conditions.`, `Similar supplier found` | `features/onboarding/components/OnboardingFlow.tsx` | copy distinto/ausente | revisar con 14-onboarding (no copiar pasos delivery/bank/dd) | media | todo |
| 6 | Portal home / dashboard del proveedor | `SupplierDashboard.tsx` (ver 02-home) | hecho en 02-home | - | - | done |

## Fuera de alcance
- Direct Debit mandate (Stripe), importación por API/CSV con mapeo (`API · awaiting mapping`), pasos muertos delivery/bank/dd de Supplier Onboarding.
- Invitación de proveedor por email (debe respetar `private_mode_enabled`).

## Backend
Contrastado con controladores `supplier/*`, `supplier-profiles`, `supplier-relationships`, `curated-range`, `supplier-product-imports`, `supplier-feed-configs`, `organisations` y `onboarding`.

| Superficie | Endpoint / campos existentes | Cobertura backend |
|---|---|---|
| Products/catalogue | Catálogo compartido `/api/products` y sus endpoints de variantes; `/api/supplier-product-imports` para jobs/filas/errores; `/api/supplier-feed-configs` para configuración de feed; `/api/supplier/curated-range` para decisiones de placement. | Cubierto por módulos de catálogo/feed existentes; no hay un endpoint independiente `/supplier/products` verificado. Validar qué respuesta de listado expone thumbnail/code/department y datos de billing de la tabla (fila 2) antes de declarar esos campos cubiertos. |
| Approvals/history | `/api/supplier/curated-range` lista y acciones approve/decline; `/api/curated-range` admin operations; eventos/estados y cambios de rango con timestamps. | Cubiertos acciones y lifecycle de Recommended/Featured. Fees son proyección Phase 2, no cobros activos. |
| Billing | `/api/supplier/dashboards`, facturas del supplier en `/api/supplier-invoices` y endpoints de pagos/chase existentes. | Cubierta vista económica/facturas ordinarias; el mandato y cargos de placement del prototipo no están activos. |
| Profile / delivery/decorating | `GET /api/supplier/profile`, `PUT /supplier/profile/{carriage,decorating}`; `/api/supplier-profiles/:id` para relación; campos de carriage (`first/extra`, mínimo/unidades/máx. drops, notas) y decorating (acepta blank stock, goods-in, overs, lead time). | Cubiertos ajustes de portal ya modelados. |
| Orders, approvals y connection | `/api/supplier/orders`, supplier project delivery-confirmations, stock-checks, price-quotes, sample-quotes; `/api/supplier/connection-requests`; relación e invitaciones por organizaciones/platform. | Cubierto en operaciones supplier activas; las acciones se limitan a permisos/estado de relación. |
| Onboarding | `/api/onboarding`, `/steps/:step`, `/supplier-profile`, `/suppliers`, `/suppliers/:organisationId`, `/remind/:organisationId`; `/api/supplier-registration-requests` + invitación platform. Estado de pasos/checklist y perfil/feed disponibles en alcance vigente. | Cubiertos onboarding y seguimiento existentes en el esquema actual; no incluye todos los campos de la maqueta demo. |

### Fuera de alcance (backend)
- Direct Debit de placement/fee y su mandato: Phase 2 no está en cobro; requiere Stripe/credenciales y modelo de suscripción específico.
- Feed API/CSV efectivo, credenciales y ejecuciones de sync/import: aunque hay módulos de configuración/import/sync existentes, no lanzar syncs ni asumir que la pantalla de onboarding incorpora un motor de ejecución nuevo.
- Campos de onboarding Delivery/Bank/DD marcados código muerto en la ficha: no ampliar esquema; migración explícitamente excluida.
- Envíos/recordatorios por email sujetos a `private_mode_enabled`; no activar envíos ni proveedor externo.
