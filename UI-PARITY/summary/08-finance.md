# Summary 08-finance (frontend)

Método: auditoría de `ref/08-finance.md` (225 literales; 132 sin coincidencia exacta) contra `src/app/(protected)/finance/page.tsx`, `src/features/finance/**`, `src/features/dashboards/components/FinanceDashboard.tsx`, `features/stripe`, `features/discounts`. La estructura coincide: 6 pestañas (Dashboard · Subscription · Customer invoices · Supplier invoices · Bank details · Integrations), Finance del cliente (Overview · Invoices · Terms & invoicing), dashboards por rol con KPIs/needs attention/cash forecast/ageing/etc. Los literales ausentes son principalmente de Integrations contables (7 paquetes + Sync log), Subscription (Direct Debit/tarjeta del distribuidor), códigos promo extendidos y validaciones de formularios.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Cash forecast: leyenda `Due in from customers` / `Due out to suppliers`, sub `From invoice due dates and approved bills. Overdue amounts sit in this week.` | `FinanceDashboard.tsx:47,59` ("Money in/out", otro sub) | copy | textos de la ref | baja | done |
| 2 | Payment methods sub `Paid invoices, by how they were paid.` | `FinanceDashboard.tsx:73` | copy | texto de la ref | baja | done |
| 3 | Credit notes mini: `Issued` / `Value` | `FinanceDashboard.tsx:77` ("Issued in the period") | copy | `Issued` | baja | done |
| 4 | Needs attention distribuidor: Invoices 60+ days overdue · Overdue invoices · Supplier invoices to approve (`N differ from the PO`) · Bills to pay · Not sent to accounts | `FinanceDashboard.tsx` / `dashUi.tsx` | añadido sub `N differ from the PO` desde `attention.bills_differ`; Not sent to accounts depende de integración contable | ningún cambio adicional sin estado de sync | media | done (Not sent to accounts fuera de alcance) |
| 5 | Accounts sync card (`In accounts / Waiting / Errors`, `No accounting software connected`) y pestaña Integrations con 7 paquetes contables + `Sync log` | `features/stripe` IntegrationsTab (solo Stripe) | falta contabilidad | fuera de alcance: requiere credenciales/servicios externos (Xero, etc.) | - | fuera de alcance |
| 6 | Subscription: método de pago (tarjeta/Direct Debit), `Next payment`, `Your last payment failed` | `settings/components/SubscriptionTab.tsx` | parcial | pagos de suscripción requieren Stripe/GoCardless: fuera de alcance salvo lo ya cubierto | - | fuera de alcance |
| 7 | Customer Finance: `Invoices due next` con `Pay by card`; `Spend by month`, `By project`, `Credits and refunds` | `FinanceDashboard.tsx:90-115`, `features/stripe/components/PayByCardButton.tsx` | el panel de resumen no enlaza cada factura; el pago por tarjeta sí existe en la tabla/detalle de facturas cuando Stripe está conectado | mantener acción en la superficie de factura; sin cambio aquí | media | done (acción disponible en facturas; no mostrada en resumen) |
| 8 | Barra del dashboard (`This month … Year to date`, `Compare with`, botón `Targets`, `Print / PDF`) | `features/dashboards/components/dashUi.tsx`; Targets en dashboard de Orders | Compare with y Print / PDF están en la barra; Targets se edita desde Orders, no desde Finance | no duplicar Targets en Finance | baja | done |
| 9 | Códigos de descuento (`No codes yet…`, validaciones, `Min £500 · Ends…`) | `features/discounts/components/DiscountCodesPanel.tsx` | parcial | revisar literales de validación (backend valida) | baja | todo |

## Fuera de alcance
- Integraciones contables (Xero/QuickBooks/…), Sync log, mapeos de cuentas: credenciales y servicios externos.
- Direct Debit / tarjeta de suscripción del distribuidor y reintentos de pago.
- Persistencia localStorage de la ref y datos demo (MS-1030..1041).

## Backend
Verificado en `finance` (FinanceController), `dashboards` (`/dashboards/finance`), `stripe`, `discount-codes`. Resultado: **cubierto**, con un campo añadido para la fila 4.

| Fila | Necesidad | Endpoint / campo | Estado |
|---|---|---|---|
| 1-3, 8 | Dashboard por rol (cash forecast, ageing, who owes most, métodos de pago, credit notes, comparar con periodo, Targets) | `GET /api/dashboards/finance` (`per`, comparación incluida), `PUT /dashboards/targets`, `GET /platform/dashboards` | cubierto |
| 4 | Needs attention: `Invoices 60+ days overdue`, `Supplier invoices to approve`, `Bills to pay` | `attention.overdue_60_plus`, `attention.bills_to_approve`, `attention.bills_overdue` | cubierto |
| 4 | Sub `N differ from the PO` | **añadido** `attention.bills_differ` (facturas de proveedor con diferencia sobre el PO; subconjunto de `bills_to_approve`) en `DashboardsService.distributorFinance`; test jest en `dashboards.service.spec.ts` | hecho |
| 4 | `Not sent to accounts` | requiere integración contable (no hay estado de sync) | fuera de alcance |
| 7 | `Pay by card` en `Invoices due next` | `POST /api/stripe/invoices/:id/link` (permiso `finance.view`; distribuidor o cliente sobre su propia factura) + páginas públicas `public/pay/:token` | cubierto |
| 9 | Códigos de descuento | módulo `discount-codes`; mensajes de validación ver 07 (`codeProblem`) | cubierto |
| — | Pestañas Customer invoices / Supplier invoices / Bank details / Terms | `finance/customer-invoices(.csv)`, `/:id/detail`, `/payments`, `/reminders`, `/email`; `supplier-invoices` (invoice/approve/payments/chase/csv); `bank-details`; `my-invoices`, `my-terms`; PDFs `invoice-documents/:no/pdf`, `credit-note-documents/:no/pdf` | cubierto |

### Fuera de alcance (backend)
- Integraciones contables (Xero/QuickBooks…), `Sync log`, `Accounts sync` y `Not sent to accounts`: credenciales y servicios externos.
- Direct Debit / tarjeta de suscripción del distribuidor y reintentos (Stripe/GoCardless de suscripción).
