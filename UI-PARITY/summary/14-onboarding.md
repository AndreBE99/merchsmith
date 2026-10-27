# Summary 14-onboarding (frontend)

Auditoría de `ref/14-onboarding.md` contra las rutas y features actuales. Customer Onboarding, Distributor Onboarding y Accept Invite no aparecen como rutas dedicadas en el inventario de `src/app`; sí existe el onboarding de supplier enlazado por 12 y la tarjeta/checklist de setup. Add customer/invite flows están presentes dentro de Organisations y Platform.

| # | Referencia | Estado actual (archivo) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Customer Onboarding: welcome, perfil, notificaciones y 6 pasos de organización, tour y finish | No se localizó ruta/montaje de `OnboardingFlow` en `src/app`; `src/features/onboarding/components/OnboardingFlow.tsx` es el flujo real localizado | Existe motor compartido de onboarding, pero flujo completo de customer de la referencia no está localizado | Seguir el montaje real y cotejar pasos, header/progress, card y estados con §§1–2 | alta | todo |
| 2 | Distributor Onboarding: datos, compañía, plan/pago, marca, dominio, equipo, email domain y finish | No se localizó ruta dedicada; no se encontró `dist-onboarding` en features | Flujo de alta posterior a invitación no identificado; formulario de invitación no demuestra onboarding | Localizar ruta/flujo real; cotejar la cadena de pasos y estados offline/live | alta | todo |
| 3 | Checklist Home “Finish setting up your store” | `src/features/onboarding/components/SetupCard.tsx`, `OnboardingChecklist.tsx`; `src/app/(protected)/page.tsx` (validar montaje exacto) | Componentes de checklist presentes; copy/regla 6 pasos y estado de render no cotejados | Comparar tarjeta visible en Home con §4.1 y verificar montaje por rol | alta | todo |
| 4 | Customer onboarding status/progress en drawer y recordatorios | `src/features/organisations/components/drawer/CustomerDrawerBody.tsx`; `src/features/onboarding/hooks.ts`, `api.ts` | Bloque de customer y API de onboarding existen; estados, checklist e interacción de reminder requieren comparación | Cotejar progreso, CTA y estados de onboarding en drawer | media | todo |
| 5 | Add customer wizard (lado distribuidor), cinco pasos | `src/features/organisations/components/AddOrganisationModal.tsx`, `CustomerInviteForm.tsx`; `src/features/organisations/hooks/useCustomerInviteForm.ts` | Modal/form presentes; pasos Brand/Terms/Review, borrador y estados de duplicado no validados frente a ficha | Comparar pasos, validaciones, resumen y confirmaciones con §5 | alta | todo |
| 6 | Invite distributor wizard (lado Platform Admin), cinco pasos | `src/features/platform/distributor-environments/components/InviteOrganisationModal.tsx`, `InviteDistributorForm.tsx` | Form de invitación presente; no se verificó si incluye los pasos Plan/Brand/Review de la ficha | Cotejar flujo completo con §§3 y 5; no asumir que invite form equivale al onboarding | alta | todo |
| 7 | Supplier Onboarding, referencia en sección 12 | `src/features/onboarding/components/OnboardingFlow.tsx` (también `src/features/organisations/components/AddSupplierWizard.tsx`, flujo invitador distinto) | Hay flujo genérico/supplier wizard; identidad exacta con onboarding supplier de prototipo no determinada | Seguir ruta de portal supplier y decidir correspondencia con ficha 12 antes de cambios | media | todo |
| 8 | Accept Invite y activación de cuenta | `src/app/(auth)/accept-invitation/page.tsx`, `AcceptInvitationViews.tsx`, `useAcceptInvitationFlow.ts` | hay pantalla real de validación, aceptación y estados terminales; falta cotejar visualmente con la ficha 10 | comparar copy/layout; conservar la ruta real `/accept-invitation` | alta | todo (cotejo visual pendiente) |

## Fuera de alcance
- Alta de credenciales real, Stripe/Direct Debit, términos contractuales efectivos, verificación DNS y envío de invitaciones requieren auth/servicios externos. Mantener estados y presentación de UI dentro de paridad.
- Los pasos obsoletos del checklist `cust-checklist.js` están declarados sustituidos por SetupCard en la referencia; no reintroducirlos.

## Huecos de auditoría
- No se confirmó el montaje de `SetupCard` en la página Home, ni las rutas de customer/distributor onboarding/Accept Invite.
- `OnboardingFlow.tsx` necesita cotejo del árbol de pasos por rol antes de determinar qué partes del flujo de referencia están cubiertas.

## Backend
Contrastado con `onboarding`, `invitations`, `organisations`, `supplier-registration-requests`, `platform-distributor-environments`, `users` y `me`.

| Flujo | Endpoint / campos existentes | Cobertura backend |
|---|---|---|
| Checklist/progreso customer | `GET /api/onboarding`, `PUT /onboarding/steps/:step`, `PUT /onboarding/billing`; `GET /onboarding/customers`, `/customers/:organisationId`, `/remind/:organisationId`. Retorna pasos, prefill/acuerdos y resumen de recordatorios; atributos billing incluyen contacto, invoice email, PO requirement/notas. | Cubiertos checklist y preferencias facturables/pasos modelados. No asumir que estado UI puede guardar password/foto como secreto. |
| Supplier onboarding | `/api/onboarding/supplier-profile`, `/suppliers`, `/suppliers/:organisationId`, `/steps/:step`, reminder; perfil de supplier y feed elegidos. Registro/invitación vía `supplier-registration-requests`/organisations. | Cubierto parcialmente por flujo actual de pasos y datos existentes. |
| Distributor onboarding | Endpoints platform distributor environments/invitations y `platform/plans`; `GET /onboarding/distributors`/`:environmentId` para seguimiento del checklist. | Seguimiento/invitación/plan cubiertos donde la configuración actual lo persiste; no hay aprobación automática de autenticación/charges por el UI demo. |
| Accept Invite | `GET /api/invitations/check?token=…`, `POST /api/invitations/accept`; valida token, estado/caducidad y acepta invitación. | Cubierta API de aceptación/validación; la ruta/pantalla frontend no implica endpoint ausente. Tokens no se exponen en logs/summary. |

### Fuera de alcance (backend)
- Contraseña/Identity Platform y activación de credenciales, cobros Stripe/GoCardless y pagos; requieren auth/proveedor y credenciales.
- DNS de dominio y verificación SPF/DKIM son integraciones externas; emails de invitación/reminder sujetos a `private_mode_enabled`.
- Pasos que exigirían persistir datos nuevos de prototipo (preferencias/copy, detalles bank/DD, tours/briefs no existentes) quedan fuera para no introducir migraciones/campos.
