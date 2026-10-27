# Summary 07-basket-checkout (frontend)

Método: auditoría de `ref/07-basket-checkout.md` (186 literales, 85 sin coincidencia exacta) contra `src/features/basket/**` y `src/app/(protected)/basket|checkout`. El real es funcionalmente completo contra el backend (libreta de direcciones, split delivery, PO upload, código, cuenta/BACS/tarjeta Stripe, orden colocada). Divergencia principal: la referencia usa una **tabla de 7 columnas** (Product · Colours & qty · Unit price · Add. costs · Delivery · Delivery address · acciones) en el Basket, y un checkout de 6 tarjetas numeradas; el real usa tarjetas por línea y 3 tarjetas. Esos rediseños estructurales son costosos y arriesgan 19 tests; se priorizan estilos y copy.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | `.fn-card` radius 16, pad 20/22, `.fn-hd` círculo numerado + h2 serif 22 | `CheckoutPage.tsx` (cards radius 14, títulos sans bold) | estilo | cards 16/20-22 con cabecera numerada serif | media | done |
| 2 | Resumen: `Summary` serif 24, grupo `Orders` | `BasketPage.tsx`/`CheckoutPage.tsx` "Order summary", "Goods" | título/etiqueta | `Summary`, `Orders` | baja | done |
| 3 | Cards de proyecto del Basket: radius 16, cabecera `--paper-2` | `BasketPage.tsx:107-110` | estilo | aplicado | baja | done |
| 4 | Tabla Basket con 7 columnas (`Colours & qty`, `Add. costs`, `Delivery`, chips de dirección, duplicar línea) | `BasketPage.tsx` (tarjeta por línea) | estructura distinta | rediseñar como tabla de ref; añadir `Duplicate line` (requiere endpoint de duplicado: ver Backend) | media | done (sin `Duplicate line`, fuera de alcance) |
| 5 | Botón `Deliver everything to one address` | `BasketPage.tsx` "Deliver all to one address" | texto | renombrar (verificar tests) | baja | done |
| 6 | Orden de tarjetas Finance: 1 Billing, 2 Invoice contact, 3 Payment, 4 Delivery summary, 5 PO & reference, 6 Terms | `CheckoutPage.tsx`: Delivery, Invoicing(billing+contact+PO), Payment | agrupación distinta | separar Billing / Invoice contact / PO & reference en tarjetas propias, con `Same as a delivery address:` chips | media | done (sin campo `Your reference`) |
| 7 | Diálogo `Before you place your order` (no-refund, check `I acknowledge these terms, please proceed`) | casilla de términos en el resumen | falta diálogo | añadir diálogo previo a enviar; conserva `accept_terms` | media | done |
| 8 | CTA `Place order on account` / `Place order & pay` / `Place order` según método; lista `fn-todo` | `CheckoutPage.tsx` botón "Place order" (tests lo fijan) | etiqueta única | cambiar etiquetas y adaptar tests | baja | done |
| 9 | Errores de código promo (`That code isn’t recognised.`…) | `data.code.problem` viene del backend | el texto lo emite el backend | verificar mensajes en backend | baja | todo (ver Backend) |
| 10 | Paso 3 `Order placed`: `What happens next`, `Delivery & items`, `Order summary`, `Track this order`, `Download confirmation` | `OrderPlacedPage.tsx` | por revisar a fondo | comparar y completar | media | done (sin botón Message/Book a call) |
| 11 | Steps bar Basket → Finance → Confirmation | no existe | falta indicador de pasos | componente `StepsBar` en las 3 pantallas | media | done (Basket, Checkout y Order placed) |

## Fuera de alcance
- Formulario de tarjeta decorativo (el real redirige a Stripe), pro-forma/confirmación PDF imprimibles dependientes de plantillas nuevas, emails ("Emails sent to"; deben respetar `private_mode_enabled`), datos bancarios demo.
- Gate de onboarding `ms-cust-onboard-latest` (usa el onboarding real).

## Backend
Verificado en `basket` (BasketController, CheckoutController) y `discount-codes`. Resultado: **cubierto**, con un ajuste de textos implementado.

| Fila | Necesidad | Endpoint | Estado |
|---|---|---|---|
| 4 | Tabla del Basket (precio unitario, costes adicionales, entrega, dirección por línea) | `GET /api/basket` (líneas ya con `unit_price`, `delivery`, `extra_delivery`, `charges`, drops), `PATCH /basket/lines/:id`, `PUT /basket/lines/:id/drops`, `POST /basket/apply-address`, libreta `GET/POST/PUT/DELETE /basket/addresses` | cubierto |
| 4 | `Duplicate line` | **falta; fuera de alcance**: `basket_lines` tiene `@@unique([customer_organisation_id, project_line_item_id, kind])` (`basket_lines_item_key`), un duplicado de la misma línea exige relajar la restricción (migración). Añadir la misma línea la sustituye | fuera de alcance |
| 6 | Tarjetas Billing / Invoice contact / PO & reference | `GET /checkout`, `POST /checkout/po-file/presign` + `/complete`, `POST /checkout` (PlaceOrderDto con facturación, PO, método de pago, `accept_terms`) | cubierto |
| 7 | Diálogo `Before you place your order` | `accept_terms` ya obligatorio en `POST /checkout` | cubierto (diálogo solo UI) |
| 8 | CTA según método (account/pay) | `GET /checkout` expone cuenta, términos, crédito y método disponible | cubierto |
| 9 | Mensajes de código promo | **Implementado**: `codeProblem` (`basket/basket-totals.ts`) ahora devuelve los textos de la ref: `That code isn’t recognised.`, `This code is paused.`, `This code has expired.`, `This code has been fully used.`, `This code isn’t valid for your account.`, `Spend £{min} or more (before VAT) to use this code.` Tests jest actualizados (`basket-totals.spec.ts`, `checkout.service.spec.ts`) | hecho |
| 9 | Mensajes que la ref tiene y el modelo no soporta | `This code starts on {d MMM}.` (no hay `starts_at`), `You’ve already used this code.` (no hay uso por cliente), `There’s no delivery charge…`, `doesn’t apply to anything in your basket`, `can’t be combined with your account discount` (sin reglas de alcance/combinación) | fuera de alcance (requiere columnas/reglas nuevas) |
| 10 | Order placed / Download confirmation / Track | `GET /orders/:id`, `/orders/:id/confirmation(/pdf)`, `/pro-forma(/pdf)` | cubierto |

Añadido antes (01-chrome): `GET /api/basket/count` para el badge de cabecera.

### Fuera de alcance (backend)
- `Duplicate line`, `starts_at` / uso único por cliente en códigos, alcance y combinación de códigos (migración).
- Emails de confirmación: cualquier email nuevo debe respetar `private_mode_enabled`.
