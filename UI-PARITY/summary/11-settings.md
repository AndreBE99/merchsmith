# Summary 11-settings (frontend)

Método: auditoría de `ref/11-settings.md` (168 literales; 51 sin coincidencia exacta) contra `src/app/(protected)/settings/**`, `features/distributor-settings`, `features/discounts`, `features/finance` (Terms), `features/store-range`. El real cubre Organisation profile, Lead times, Footer, Pages, Markup & pricing, Discounts (+ códigos), Branding (logos, crop, colourways), Announcement bar, Store appearance, Drafts, Custom attributes, Delivery y Customer Settings (perfil, logos, Account). Decisión del coordinador: descuentos = `discount_rules` customer-scope y bandas de markup del backend (no se copian los modelos de la ref).

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Pestañas: Organisation profile · Lead times · Footer · Pages · Branding · Domain · Subscription | `settings/page.tsx:31-42` (más Markup, Discounts, Announcement bar, Drafts, Attributes, Delivery, Appearance; Subscription vive en `/finance`) | falta `Domain`; Subscription movida a Finance (como en la ref actual) | `Domain` requiere DNS/SSL: ver Fuera de alcance | media | fuera de alcance |
| 2 | Domain: `Store address` (siempre activa), `Custom domain` con estados Pending/Verifying/Live/Error, registros DNS | no existe | verificación DNS + emisión SSL son servicios externos | fuera de alcance; podría mostrarse solo la card `Store address` (slug del distribuidor) si el backend expone el slug | baja | fuera de alcance |
| 3 | Customer Settings: Organisation profile · Platform logos · Account (tarjeta `Your account manager`, `Trading terms`, `Invoice contact`, descuentos) | `settings/customer/page.tsx`, `CustomerAccountSummary.tsx`, `CustomerFinancePage.tsx` | equivalente; términos viven en Finance | ninguno | - | done |
| 3b | Tarjeta `Your account manager` (avatar, `Message`, `Book a meeting`) en Customer Settings → Account | no existe en `CustomerAccountSummary.tsx` | falta tarjeta | añadir si el backend expone el account manager por organización (ver Backend) | media | todo |
| 4 | Resumen de cliente (`Total orders`, `Total projects`, `Spend last 12 months`) en la ficha de organización | `features/organisations/components/OrganisationDetailDrawer.tsx` | no hay tarjeta de métricas | añadir tarjeta de métricas si el backend expone agregados (ver Backend) | media | todo |
| 5 | Goods-in addresses: `Remove this goods-in address?`, direcciones múltiples (`Location n`) | `features/delivery-countries`, `OrganisationProfileTab` | por verificar | verificar literales | baja | todo |
| 6 | Logos: límite 5 MB, crop de header logo | `OrganisationProfileTab.tsx`, `LogoCropDialog.tsx` | coincide | ninguno | - | done |
| 7 | Discounts: `Override in Price modal`, `Used at checkout` | `features/discounts/*` | parcial (modelo real distinto) | no copiar el modelo; revisar copy visual | baja | todo |

## Fuera de alcance
- Domain (DNS/SSL), Subscription de pago (Stripe/GoCardless), persistencia localStorage de la ref.
- Modelos de markup/descuento duplicados de la ref (se usa el modelo real).

## Backend
Contrastado con `me`, `store-settings`, `organisations`, `markup-rules`, `discounts`, `delivery-countries`, `shipping-via-us`, `supplier-profiles`, `file-assets` y plataforma de planes.

| Superficie | Endpoint / campos existentes | Cobertura backend |
|---|---|---|
| Perfil de organización y marca | `GET/PATCH /api/organisations/:id` (campos permitidos de perfil); `/api/me/environment/settings` GET/PATCH almacena ajustes del entorno, incluidas `branding`, `footer`, páginas/configuración existente; logos resueltos como signed URLs. `/api/files` gestiona cargas. | Cubiertos perfiles, logos y configuración ya persistible en modelos/config JSON existentes. No todos los settings ficticios tienen un campo dedicado. |
| Lead time / delivery | `/api/product-lead-times`, `/api/shipping-via-us`, `/api/delivery-countries`; `/api/organisations/:id/supplier-terms`; `/api/supplier-profiles/:id/carriage` y `/decorating`. | Cubiertos buffers, destinos y ajustes de envío/proveedor expuestos. |
| Markup/discounts | `/api/markup-rules`; `/api/discounts` con reglas por scope, incluidos customer; códigos de descuento en módulo discount-codes y validación checkout. | Cubierto con modelos reales; no migrar a tablas/campos legacy de referencia. |
| Pages/footer/store | `/api/me/environment/settings` persiste los ajustes disponibles, con tratamiento de footer/logo; `GET/PATCH /api/store-settings` para configuración de tienda. | Cubierto donde se guarda en settings existentes; no hay afirmación de CMS genérico completo para páginas editoriales. |
| Domain/subscription | `/api/me/environment/domain` da dominio primario existente; `/api/platform/distributor-environments` administra entornos/dominios disponibles; `/api/platform/plans` y `/subscriptions` dan planes, asientos/MRR; Stripe cubre conexiones/pagos implementados. | Solo cubiertos dominio almacenado/estado y datos de plan actuales; no equivalen a ciclo automático DNS/SSL ni a Direct Debit de placement. |

### Fuera de alcance (backend)
- DNS/SSL y verificación/alta de dominio requieren proveedor DNS/certificados externo; no inventar endpoint DNS ni credenciales.
- Editor CMS con persistencia por página/bloque, colourway/custom theme, overrides de breadcrumb, defaults de samples, footer completo o Subscription billing que no quepan en JSON/modelos actuales: fuera si exige esquema nuevo; no añadir columnas/tablas/migraciones.
- Stripe/GoCardless para cobrar suscripciones/mandatos y newsletter/email marketing externo quedan fuera por credenciales/servicio; emails respetan `private_mode_enabled`.
