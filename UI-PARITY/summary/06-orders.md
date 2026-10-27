# Summary 06-orders (frontend)

Método: auditoría de `ref/06-orders.md` (269 literales; ~120 sin coincidencia exacta) contra `src/features/orders/**` y `src/app/(protected)/orders`. El módulo real (lista con KPIs/chips/filtros, order page con líneas, ajustes, cancelaciones, problemas, via-us, impresión PO/delivery note) existe. Los literales ausentes son sobre todo: variantes de estados/CTAs del flujo por producto con redacción propia, textos del confirm-view/delivery-confirm y empty states.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Buscador por rol: `Search order, PO, project, customer or product…` / customer sin `customer` / supplier `Search order, PO or product…` | `features/orders/components/OrdersList.tsx:177` placeholder único largo | placeholder | placeholder por rol (aria-label `Search orders` intacto) | baja | done |
| 2 | Empty: `No orders yet` + `Orders appear here once they’re placed from a project or the store.`; supplier: `No orders for you yet` + `Orders appear here once a distributor sends you a purchase order.` | `OrdersList.tsx:84-90` texto plano | título + cuerpo | implementado | baja | done |
| 3 | Vacío filtrado: `No orders match these filters` + `Try clearing the filters or searching for something else.` + botón `Clear filters` | `OrdersList.tsx:254-260` "Nothing matches these filters." | texto + botón | implementado (limpia filtros y flag) | baja | done |
| 4 | KPIs por rol (6/5/5 tarjetas), chips `All/Open/Needs action/In production/Dispatched/Delivered/Cancelled`, `More filters`, tabla expandible con sub-filas y barra de 8 pasos | `OrdersList.tsx` | existe con variantes | revisión visual pendiente | media | todo |
| 5 | Order page: pill de estado, `‹ All orders`, `Progress`, `Items by delivery address` + `Reorder all`, `Invoice & payment`, `Costs & margin` | `OrderPage.tsx`, `OrderLineCard.tsx` | parcial: faltan `Reorder all`/`Reorder this order`, `Download confirmation`, `Track this order` | añadir acciones si existe flujo de reorder (ver Backend) | media | todo |
| 6 | Modales delivery-confirm (`Can you meet this delivery date?`, `Is this variant in stock?`, `We'll flag back to the distributor…`) | `features/supplier-delivery-confirmations`, `supplier-stock-checks` | redacción propia | alinear textos de los modales de respuesta del proveedor | media | todo |
| 7 | Confirm-view (paso 3): ver 07 | `features/basket/components/OrderPlacedPage.tsx` | ver 07 | ver 07 | media | todo |

## Fuera de alcance
- Datos demo MS-1030..1051, localStorage (`ms-orders`, `ms-order-ops`), PDFs imprimibles vía `window.open`, simulaciones de respuesta del proveedor, Stats/Targets (viven en 08-finance/dashboards).

## Backend
Verificado en `orders` (controladores cliente/distribuidor y `supplier/orders`), `project-delivery-confirmations`, `project-stock-checks` y sus contrapartes de proveedor. Resultado: **cubierto**, sin cambios de código.

| Fila | Necesidad | Endpoint | Estado |
|---|---|---|---|
| 1-4 | Lista, búsqueda, KPIs/filtros por rol | `GET /api/orders`, `GET /supplier/orders` (datos ya filtrados por rol; proveedor sin cliente ni precio) | cubierto |
| 5 | Order page, progreso, direcciones/drops, factura y pago, costes y margen | `GET /orders/:id`, acciones por línea (`/lines/:lineId/actions`, `/address`, `/amend`, `/dates`, `/cancel`, `/drops`), `/invoices`, `/credit-notes`, `/balance/:entryId/settle`, `/bacs-paid`, `/cancel` | cubierto |
| 5 | `Download confirmation` | `GET /orders/:id/confirmation` y `/confirmation/pdf`; también `/pro-forma(/pdf)`, delivery notes, POs y `/purchase-orders/:poNo/pdf` | cubierto |
| 5 | `Track this order` | seguimiento por línea (`tracking` en `GET /orders/:id`) y acciones de despacho | cubierto |
| 5 | `Reorder all` / `Reorder this order` | **no hay endpoint**. Se puede componer en cliente reañadiendo cada línea al basket (`POST /basket/lines`, exige que el producto siga aprobado). Un endpoint dedicado sería azúcar; no se implementa | cubierto por composición (documentar en frontend) |
| 6 | Modales de respuesta del proveedor (fecha, stock) | `supplier/project-delivery-confirmations`, `supplier/project-stock-checks` (GET/POST) | cubierto (solo textos) |
| 7 | Confirm-view | ver 07 | ver 07 |

### Fuera de alcance (backend)
- Simulación de respuesta del proveedor y datos demo `ms-orders` / `ms-order-ops` (localStorage de la ref).
