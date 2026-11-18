# Updates / Fixes — checklist (Google Doc "Updates / Fixes", Manual Product Adding → antes de "Connect Up")

Leyenda: `[ ]` pendiente · `[x]` hecho · `[~]` parcial (ver nota)

## Decisiones del cliente (2026-11-10)
- Variantes A5/A4: un solo producto con variantes (SKU y precio por variante).
- Lead time con texto ("10 - 12 Days"): guardar min y max de días + texto original.
- Muestra (sin marca y con marca): el cliente la agrega al basket y la paga.
- Cantidad 1: se oculta para cliente y distribuidor; solo sirve para costo de muestra.
- Ventana de cantidad: el distribuidor aprueba un rango; el cliente escribe cualquier cantidad dentro; precio interpolado entre cortes (también al cotizar cantidades intermedias).
- Stock manual: lleva cantidad; se guarda por producto del distribuidor.
- PO: el distribuidor puede ver y editar los campos antes de enviar.
- Notificaciones al proveedor: in-app + email (email respeta private mode).
- Alta manual del distribuidor: misma pantalla que la del supplier.
- "See Claude" = proyecto Claude Design (`Merchsmith Platform Design/`).

## A. Alta manual de productos
- [x] 1. Price breaks por método de branding × nº de colores (como XD). Tabla cantidad × colores en "Decoration methods", visible por defecto.
- [x] 2. Variantes de producto (A5/A4) con SKU y precio por variante ("Size variants").
- [x] 3. Visibilidad: Merchsmith → todos; distribuidor → solo él (misma pantalla del supplier). Ya implementado (ManualProductForm + product_distributor_owners).

## B. API Field Mapping
- [ ] 4. Verificar que se muestran todos los campos disponibles.
- [x] 5. Dimensiones: campo por dimensión (largo, ancho, alto, diámetro).
- [x] 6. Lead time con texto → se guarda el máximo del rango (lead_time_days); el texto queda en el raw record. (min/max por separado necesitaría columna nueva)
- [x] 7. Verificado en dev tras subir a 2 GiB: la vista previa carga (~30 s, 19.198 × 171). [Cloud Run backend-dev subido a 2 GiB el 2026-11-10, rev 00049; cloudbuild.yaml también] PF Concept: en local la vista previa carga (7 s, 19.198 filas, 171 campos). En dev probable falta de memoria (Cloud Run 1 GiB; local ~1,1 GB).
- [x] 8. Verificado en dev tras subir a 2 GiB: carga (6.493 × 348). [Cloud Run backend-dev subido a 2 GiB el 2026-11-10, rev 00049; cloudbuild.yaml también] XD Connects: en local carga (29 s desde snapshot, 6.493 × 349). Mismo diagnóstico de memoria/tiempo en dev.

## C. Ventana Product API
- [x] 9. Barra de progreso por proveedor durante sync.
- [x] 10. Tabla ordenable (proveedor, nº productos, fecha sync, listables/no listables).
- [x] 11. Impression Europe: (a) caía por memoria cada 10 min → Cloud Run a 2 GiB (rev 00049) y ya sincroniza; (b) categorías con slug inválido → arreglado en category-resolution.service.ts; (c) dimensiones: el feed las manda separadas y en mm (specifications.dimensions.length/width/height/diameter) → mapeo cambiado a dimensions.l/w/h/d con transform nuevo mmToCm (verificado: regla 24 × 3.2 × 1.7 cm). Guardar el mapeo desde la UI conserva el transform (keepSavedTransforms). La vista previa muestra las medidas sin unidad (valor bruto del feed). (b) y (c) necesitan deploy para aplicarse en dev.
- [~] 12. (Lo lanza el usuario.) Resiliencia al sincronizar todos a la vez. Ya existe cola (FeedSyncQueueService) + claim por feed que evita dos syncs del mismo feed; con la cola activa es seguro lanzarlos todos. Sin cola corre en el proceso del backend.

## D. CSV
- [x] 13. Ver/editar mapeo de un CSV ya importado y reimportar (Biolabs). Validación en dev 2026-11-11: la lista ocultaba los imports antiguos sin mapeo guardado (los de Biolabs, 4 nov) → ahora se muestran y se reabren con columnas auto-detectadas (desplegado y verificado en dev 2026-11-11: Biolabs reabre con 411 filas, 188 columnas, 4/4 obligatorios).
- [x] 14. Asistente AI igual que en API: verificado en pantalla, el panel aparece en el paso de mapeo del archivo con las acciones rápidas (Generate full mapping, Fix mapping, Generate error report).
- [x] 15. Quitar error de relación distribuidor–proveedor cuando importa Merchsmith.

## E. Recommended Range
- [x] 16. Platform admin cura el rango sin aprobación del proveedor.

## F. Modal de producto en proyecto
- [x] 17. Verificado vía API con env Mojo (Elowen 3 métodos, VINGA 6, posiciones Front/Back). Falta vista como distribuidor.
- [x] 18. Precio y métodos de branding de XD Connects llegan al producto.
- [x] 19. Posiciones (Front/Back) llegan al modal.
- [x] 20. Flujo completo probado (MS-1022): PO con preview, acknowledgement + check nuevo, proof, producción, tracking, entrega y factura INV-1022-01. Notificación in-app al proveedor verificada al enviar PO-1021-01 (QA Supplier y admin de XD). La entrega ahora muestra "Supplier confirmed dispatch <fecha> · <ref OA>" cuando hay acknowledgement.
- [x] 21. Precio tachado a la derecha del actual.
- [x] 22. Ocultar cantidad 1 (cliente y distribuidor).
- [x] 23. Cliente no ve "cost +25% · scales with quantity".
- [x] 24. Ventana de cantidad aprobada + interpolación. Necesita aplicar la migración 20261110120000_line_item_qty_windows (sin ella la ventana no se guarda; el resto funciona).
- [x] 25. Muestra (sin marca y con marca) al basket y pago.
- [x] 26. Stock manual con cantidad por producto del distribuidor. Requiere migración 20261110130000_distributor_stock_marks.
- [x] 27. Stock automático con feed en vivo.

## G. Platform Admin Settings
- [x] 28. Recorte de imágenes subidas.
- [x] 29. Editar Platform Colourways existentes.

## H. Bugs generales
- [x] 30. Causa: producto en draft; la vista maestra (Merchsmith) ahora abre draft/inactivos. Verificado en navegador.
- [x] 31. Guardado de sub-categorías reemplaza en vez de agregar.
- [x] 32. Avatar no aparece en Comments (y otros lugares).
- [x] Miniaturas (100% recycled aluminium ballpen): ahora muestran la imagen entera (contain), sin recortar. En local, sin subir.
- [ ] PENDIENTE. Logos de proveedor que no salen ("The supplier logos aren't pulling through here (Sow Easy has one)"). Falta saber dónde deben verse; la captura del doc no se puede ver desde aquí.

## I. Basket / Checkout
- [x] 33. Split Delivery apagado por defecto; el distribuidor lo activa en View Brief.
- [x] 34. Texto de confirmación "Order placed / Thank you!".

## J. Pedidos – distribuidor
- [x] 35. Logo del cliente en cabecera del pedido.
- [x] 36. Ver y editar PO (PDF + campos) antes de enviar. Campos editables: mensaje al proveedor e instrucciones del producto.
- [x] 37. Rediseño "Check acknowledgement" según Claude Design.
- [x] 38. Preview de JPEG/PNG/PDF del proveedor.

## K. Proveedor
- [x] 39. Notificaciones de pedidos (in-app + email).
- [x] 40. Cabecera Logo Merchsmith × Logo proveedor.
- [x] 41. Clic en MS-1001 en Supplier > Orders no abre el pedido.
- [x] 42. Mostrar distribuidor y contacto en el detalle del pedido.
- [x] 43. Pedidos de múltiples distribuidores (columna + filtro).
- [x] 44. Cambiar Main Contact al editar proveedor.

## L. Tienda del distribuidor
- [x] 45. Hero banner con múltiples imágenes y auto-scroll.
- [x] 46. Reordenar/cambiar imágenes de producto solo para su tienda.
- [x] 47. Búsqueda ajustada a Claude Design: panel más ancho centrado, miniaturas de 48 px y estado como pastilla, "Top result" siempre en All (exacto o el mejor resultado), sugerencias con icono + "Order stats" + tip de nº de pedido/PO/SKU, y "Also in the catalogue" oculto si es 0. En /store el chip inicial sigue siendo Products a propósito (regla de contexto de la spec). Verificado en navegador.

## M. Create Project
- [x] 48. Fecha de entrega: Standard / Critical / ASAP.
- [x] 49. "Ships To" con todos los países.

## Hallazgos de la prueba del 2026-11-10 (pendientes)
- [x] Precio con dos posiciones de branding: ahora suma artículo + decoración y setup de cada posición, con markup sobre el total (matriz `combined`). Verificado: 300 uds pasa de £5,90 a £6,91. Las aprobaciones anteriores conservan su precio.
- [x] El cliente ve un mensaje interno en Delivery: ahora ve "Delivery is quoted separately — your account manager will confirm the cost." (el distribuidor conserva el mensaje interno). Verificado.
- [x] Cabecera del proveedor: ahora "merchsmith × XD Connects" y pestaña "XD Connects | …" (/api/me devuelve selectedOrganisationName). Verificado.
- [x] Enlaces del proveedor al PO / PO adicional / cancelación / albarán y líneas del listado: ahora usan el id del pedido. Verificado (PO-1022-01 y DN-1022-1 cargan).
- [x] Albarán sin líneas ("0 units") cuando el pedido no tiene colores: ahora usa la cantidad de la línea. Verificado: DN-1022-1 muestra 375 units.
- [x] UI menor: etiquetas del slider ya no se solapan (solo se rotulan los cortes con espacio); el chip de estado se actualiza sin recargar (era lentitud, verificado Expire → Draft → Awaiting Approval); el campo del basket vuelve al valor guardado tras un rechazo. Verificado.
- [x] Nombre del distribuidor: el cliente ya ve el de la organización ("Test Distributor") en cabecera, título, footer, Team y Finance (/api/me añade distributorName a cada membresía). Verificado. Emails: las plantillas ya usaban el nombre de la empresa; corregido el onboarding del cliente, que mostraba el del entorno.

- [x] Email al proveedor al enviar PO: la notificación order_placed tiene email activado para proveedores; en dev no sale porque private mode está activo (correcto, no se desactivó).

## Validación en dev (2026-11-11, tras deploy 36152e2)
OK en dev: 1, 2, 5, 10, 14, 22, 23, 24, 28, 29, 39, 40, 41, 42, 43, 45 (campo carrusel), 47, fecha confirmada del proveedor, mensaje Delivery, precio 2 posiciones, Cloud Run 2 GiB, Impression Europe sin caídas (último sync completo: 353 de 360 errores eran el slug ya arreglado).
Observado: Impression Europe usa como categoría la lista entera unida ("Home & Kitchen, Kitchen, ..."); dos cargas directas se quedaron en "Loading application…" con error IndexedDB de Firebase (se resolvió recargando; posiblemente del navegador embebido).

## Precios "All-IN" (Sow Easy) — 2026-11-11
- [~] Opción "Prices include branding (all-in)" en el mapeo de feeds (+ "Setup cost on the price rows"). Con ella: el método de branding lleva los tramos de precio con su setup, la fila Unbranded se oculta (tienda, Price builder, vista previa) y una línea sin branding se cotiza con el primer método. Activada en el mapeo de Sow Easy (setup = set_up). Probado con 5 productos de la copia guardada del feed y tests (backend 454, frontend 92). Revisado en pantalla (local): el mapeo muestra el interruptor activado y la vista previa enseña "Digital £0.33 + setup £40" sin fila Unbranded (la vista previa del mapeo solo lee un tramo por fila, limitación anterior). Pendiente: commit/deploy y que el próximo sync de Sow Easy aplique el cambio.
