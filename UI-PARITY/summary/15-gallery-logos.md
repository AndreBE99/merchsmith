# Summary 15-gallery-logos (frontend)

Auditoría de `ref/15-gallery-logos.md` contra el frontend real. Gallery es parte de Project page según referencia; Logos demo y Brand Guide son activos/prototipo, no páginas de producto que se deban portar. La página de detalle real existe en `src/app/(protected)/projects/[projectId]/ProjectWorkspace.tsx`; revisar su Gallery allí, no buscar una ruta independiente.

| # | Referencia | Estado actual (archivo) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Gallery: redirect a Project Autumn Giveaways `?view=gallery`; layout de cards/filtros/pop-out depende de Project page | `src/app/(protected)/projects/[projectId]/gallery/page.tsx`, `ProjectWorkspace.tsx`, `components/ProductGallery.tsx` | Vista de cards dedicada y acceso desde workspace implementados; el código identifica el equivalente de referencia | Hecho en implementación de Project page; cotejo visual final pendiente | alta | done (visual pendiente) |
| 2 | Logos: `MSLOGOS` de lettermarks de demo consumido en varias pantallas | `src/features/organisations/` e `src/features/users/` contienen vistas de organización/usuarios; no se localizó módulo global MSLOGOS | No se identificó dependencia común de logos demo; cargas de logos reales están en otras superficies | Verificar fallback de logos por organización (imagen/inicial) en tablas, drawers y headers | media | todo |
| 3 | Logo de plataforma y colourways en Admin Settings | `src/features/platform/components/SettingsLogosSection.tsx`, `SettingsColourwaySection.tsx`; `src/features/organisations/profile/` para perfiles | Superficies reales de logos/colourway presentes; equivalencia de variantes original/white/black y preview no cotejada | Comparar estados de upload/preview/variantes con referencia 01/11/13; registrar solo gaps visuales | media | todo |
| 4 | Brand Guide v1.0, documento estático con logo, color, tipografía, patrón, UI e iconos | No se encontró página/feature Brand Guide en `src/app` ni `src/features` | Documento de referencia no está identificado como UI de producto | No portar como pantalla de producto; conservar tokens/componentes de marca que ya pertenezcan al sistema | baja | done |

## Fuera de alcance
- `Merchsmith Logos.html` y sus logos sintéticos son utilidades de demo, no UI de producto; no portarlos. La persistencia/almacenamiento real de artwork es infraestructura, aunque su estado visual de carga sí se compara.
- La Brand Guide es documentación estática; la referencia indica que sus tokens ya se reflejan en el sistema. No requiere réplica de página para esta paridad.

## Huecos de auditoría
- La vista Gallery existe como ruta `/gallery` (además de compartir workspace); falta verificación visual en navegador.
- No se localizó un módulo global equivalente a `MSLOGOS`; determinar si existe un componente compartido de marca antes de proponer cambios.

## Backend
Contrastado con `projects`, `project line items`, `product-images`, `organisation-brand-assets`, `organisations`, `me/environment/settings` y `file-assets`.

| Superficie | Endpoint / campos existentes | Cobertura backend |
|---|---|---|
| Gallery de proyecto | Project endpoints (`/api/projects`, line-items) entregan entidades/líneas; adjuntos/artwork disponibles vía files/brand assets según entidad. La vista Gallery es frontend de la Project page, no recurso API separado. | No requiere endpoint Gallery; usar datos y permisos actuales de Project page. |
| Logos de organización | `/api/organisations/:id` y profile; ajustes `branding` en `/api/me/environment/settings`; `/api/files` presign/complete y signed URLs; `/api/brand-assets` CRUD/lista, versiones, proyectos, download para librería de marca del cliente. | Cubierto almacenamiento/lectura de logos y assets reales existentes. `MSLOGOS` sintético es fallback demo, no registro backend. |
| Brand Guide | Sin endpoint: es documentación estática y tokens de interfaz. | Cubierto por no requerir datos/API. |

### Fuera de alcance (backend)
- Página mock de logos/lettermarks sintéticos y Brand Guide estática: no son datos del producto que se deban persistir.
- Conversión/variantes mono/crop generadas en UI no implican API/campos nuevos; almacenamiento de artwork requiere file storage configurado. No añadir migraciones.
