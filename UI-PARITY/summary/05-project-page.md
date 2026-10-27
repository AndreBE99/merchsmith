# Summary 05-project-page (frontend)

Método: auditoría de literales de `ref/05-project-page.md` (473 comprobados, ~187 sin coincidencia exacta) contra `src/app/(protected)/projects/[projectId]/**`, `features/project-*`, `features/organisation-brand-assets`. El workspace real (tabla/galería, ProductModal con pestañas Design/Price/Sample/Stock/Branding, StageStatusPill, builders, Project Sheet, Brand Assets) ya está construido contra V2. Los "missing" son en su mayoría: referencias `PROJ:nnn` (números de línea de la ficha), datos demo (Dan Okafor, Priya Nair, "Anniversary lockup", "Brand Guidelines 2024"…), y divergencias deliberadas de redacción (el real usa sentence case: `Submit for approval`, `With studio`, `Give feedback`). No se reescribe copy que ya expresa el mismo estado.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Verbos de etapa (`Send to Studio`, `Request Quote`, `Order Sample`, `Request Stock Check`, `Approve Design`, `Confirm In Stock`…) | `lib/product-status.ts:306-316` (verbos en sentence case, propios) | redacción distinta, semántica equivalente | mantener (decisión: copy real más consistente) | - | done (sin cambio) |
| 2 | Modal de fecha crítica `CRITICAL DELIVERY DATE · Ask the supplier to confirm` + `Notify supplier contacts to check this date` + contactos | `features/project-delivery-confirmations`, `features/supplier-delivery-confirmations` | flujo existe; textos del modal por verificar uno a uno | revisar modal contra la ficha §delivery-confirm (06-orders §6) | media | todo |
| 3 | `Flag stock issue`, `Re-check Stock`, `Is this variant in stock?`, `Notify contacts to confirm availability` | `StockBuilder.tsx` (Re-check existe) | faltan `Flag stock issue` y el modal de consulta de stock a producción | pendiente de decidir; requiere endpoint de enquiry de stock (hay `features/supplier-stock-checks`) | media | todo |
| 4 | Servicios de entrega: `Saturday delivery`, `Pre-10:00 delivery`, `Pre-12:00 delivery`, `Courier upgrade`, `Express fee` | no existen | cargos adicionales de la ref (Additional charges) | depende del modelo de cargos adicionales (fuera de alcance si necesita tabla) | media | todo (ver Backend) |
| 5 | Proof: `I have checked the proof and approve it`, `Proof download`, `Send to Studio`, hoja A3 | `VisualProofSection.tsx`, `ProofViewer.tsx` | confirmación de checkbox del proof no encontrada | verificar el flujo de aprobación de proof y añadir el checkbox literal si falta | media | todo |
| 6 | Sample options: `Sample not required` + `Removes the sample step…` | `SampleBuilder.tsx` | literal ausente | verificar y añadir la opción en Branding/Sample | baja | done |
| 7 | Project actions (menú), `Hand over to account manager`, AI `Find product` | no existen | la propia ficha los marca como pendientes/IA | fuera de alcance (IA solo vía AiProviderService) | - | done (fuera de alcance) |
| 8 | Brand assets: moodboard, guidelines, tipografías, patrones, lifestyle imagery | `features/organisation-brand-assets`, `app/(protected)/brand-assets` | existe; textos demo | ninguno | - | done |
| 9 | Descripción del proyecto `Add a description: the story, audience and goals for this campaign` | `BriefPanel.tsx` | placeholder distinto | alinear placeholder | baja | done |

## Fuera de alcance
- Datos demo y persistencia `DPROJ.*` / localStorage.
- `Hand over to account manager`, `Find product` (IA), sustentabilidad Phase 2.
- Simulación de respuesta de proveedor (`View / simulate supplier reply`).

## Backend
Verificado en `project-line-items` (+ design, batch), `price-engine` (additional-charges), `project-stock-checks`, `project-delivery-confirmations`, `projects`. Resultado: **cubierto**, sin cambios de código.

| Fila | Necesidad | Endpoint / campo | Estado |
|---|---|---|---|
| 2 | Fecha crítica / notificar contactos del proveedor | `GET/POST /projects/:id/delivery-confirmations` (+ lado proveedor `supplier/project-delivery-confirmations`) | cubierto |
| 3 | Consulta de stock a producción (`Is this variant in stock?`) / Re-check | `GET/POST /projects/:id/line-items/:id/stock-checks` (+ `supplier/project-stock-checks`). `Flag stock issue` no tiene endpoint propio: se modela como un stock-check con nota | cubierto (flag = UI sobre stock-check) |
| 4 | Servicios de entrega (Saturday, Pre-10:00, Courier upgrade, Express fee) | `price_additional_charges` (JSON en la línea, `{customer:[{label,amount}], ...}`) con su DTO en `price-engine/dto/additional-charges.dto.ts`: cargos con etiqueta libre y importe, sin tabla nueva | cubierto como cargos adicionales etiquetados; un catálogo predefinido de servicios (importes por defecto) sí requeriría tabla -> fuera de alcance |
| 5 | Aprobación de proof (checkbox, descarga) | `POST .../design/versions/:versionId/approve`, `/request-changes`, `POST :stage/submit` (visual/proof) | cubierto; el checkbox es solo validación de UI |
| 6 | `Sample not required` | `PATCH /line-items/:id/sample-cost` con `sample_requirement: 'none'` | cubierto |
| 9 | Descripción del proyecto | `PUT /projects/:id/brief` / `PATCH /projects/:id` | cubierto |
| 8 | Brand assets / moodboard | módulo `organisation-brand-assets` | cubierto |

### Fuera de alcance (backend)
- `Hand over to account manager`, `Find product` (IA vía AiProviderService, sin diseño de herramienta), simulación de respuesta de proveedor (solo prototipo).
- Catálogo de servicios de entrega con precios por defecto (tabla nueva).
