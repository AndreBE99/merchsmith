# Prompt de onboarding — Agente de IA para el proyecto Merchsmith

> Copiá todo lo que está debajo de la línea y pegalo como primer mensaje del agente.
> El agente ya tiene abierta la carpeta `/Users/AndreBE99/Codes/Merchsmith` como working directory.

---

Sos un agente de ingeniería trabajando sobre **Merchsmith**. Tu primera tarea es **entender el sistema completo** antes de tocar nada. Seguí este protocolo de lectura, en orden, y no empieces a escribir código hasta terminar la Fase 0.

## 0. Qué es Merchsmith (contexto de dominio)

Plataforma SaaS **B2B de merchandising promocional** que conecta tres audiencias:

- **Platform Admin** — el operador del SaaS (Merchsmith mismo): organizaciones, planes, entornos de distribuidor, registro de proveedores, catálogo global / curated range, store layout.
- **Distributor** — p. ej. "Mojo Promotions": consume catálogos de varios **suppliers** (Mid-Ocean, PF Concept, XD Connects/Xindao, Neutral, Xoopar, Bio Labs) vía adaptadores de feed, aplica reglas de markup y descuentos, cura qué productos se ven en su store, y gestiona proyectos con sus clientes.
- **Customer** — el cliente final (p. ej. "Citrix"): navega la store, ve la matriz de precio por cantidad, configura decoración/branding y colabora en proyectos.

Conceptos centrales del dominio, en este orden de importancia: **feed sync / import de catálogos → catálogo global + curated range → markup & discounts → store (matriz de precios + decoración) → projects (brief → selección → diseño/precio/muestra/stock → aprobación) → administración (orgs, usuarios, roles, permisos, invitaciones)**.

## 1. Topología del repositorio

Este es un **repo sombrilla** con dos git submodules. Backend y frontend son repos independientes que **solo se comunican por HTTP** (no comparten código ni imports).

```
/Users/AndreBE99/Codes/Merchsmith
├── README.md                       # por qué submodules, hooks de graphify, cómo levantar todo
├── Merchsmith Timetable Update.md  # estado real: qué está hecho vs. qué es stub + roadmap
├── Merchsmith Platform Design/     # PROTOTIPO / SPEC del producto (ver §3)
├── merchsmith-backend/             # submodule — NestJS + Prisma
├── merchsmith-frontend/            # submodule — Next.js 16 + React 19
├── graphify-out/                   # grafo de conocimiento FUSIONADO (backend+frontend)
├── Extras/                         # PDFs de referencia del feed Xoopar
└── org-policy-exception.yaml       # excepción de org policy de GCP aplicada
```

**Rama de integración: `dev`** en ambos submodules (`main` y `release` son separadas). Ramas de trabajo: `feat/...` o `fix/...`. El "estado oficial" del producto es el par de commits que la raíz fija como submodules.

## 2. Orden de lectura obligatorio (Fase 0)

Leelos en este orden exacto. Son la fuente de verdad; no asumas nada que contradiga estos archivos.

| # | Archivo | Qué te da |
|---|---------|-----------|
| 1 | `README.md` (raíz) | topología, submodules, sincronización de grafos, cómo levantar cada paquete, convenciones de rama/secretos |
| 2 | `Merchsmith Timetable Update.md` | **el estado real**: qué está construido de verdad, qué es un stub, y el roadmap desde agosto 2026. Lee esto antes de creer que algo "existe" |
| 3 | `Merchsmith Platform Design/START-HERE.md` | qué es el prototipo, cómo trabajarlo, qué está DONE y qué queda pendiente en él |
| 4 | `Merchsmith Platform Design/HANDOVER.md` (~100 KB) | **documento vivo de arquitectura/estado del producto**. Secciones: §1 estructura de la plataforma, §2 el product modal (núcleo de la app), §2b página Master Projects, §4 cadena de "test account" (DIFERIDA), §5 convenciones/gotchas, §6 modelo de estados por producto. Leelo entero o al menos por secciones según la tarea |
| 5 | `merchsmith-backend/CLAUDE.md` | stack, comandos, estructura de `src/` módulo por módulo, flujo de auth, base de datos, GCP, **regla de AI provider-agnostic**, y las 8 reglas de "qué NO hacer sin confirmación" |
| 6 | `merchsmith-frontend/CLAUDE.md` | stack, comandos, estructura de `src/`, patrón `api/ → hooks/ → types/ → index.ts`, `ApiClient`, flujo de auth, convenciones de estilo, testing, y sus 7 reglas |
| 7 | `merchsmith-frontend/AGENTS.md` | aviso crítico: **Next.js 16 tiene breaking changes** respecto a lo que "sabés". Leé `node_modules/next/dist/docs/` antes de escribir código de Next |
| 8 | `Merchsmith Platform Design/CLAUDE.md` | reglas de persistencia/backup del prototipo (localStorage, sin backend) |

## 3. El prototipo como spec del producto

`Merchsmith Platform Design/` es un prototipo **hand-authored HTML/CSS/JS vanilla, sin build step y sin backend** (todo el estado vive en `localStorage` bajo claves `ms-*`). **No es código a portar: es la especificación visual y funcional.** Antes de construir o modificar cualquier UI real, abrí la página equivalente del prototipo y respetá su comportamiento e interacción; después complementá con las funciones y los valores reales del sistema (API, DB, permisos).

Entradas clave del prototipo:

- `Merchsmith Developer Index.html` — **índice maestro** de todas las páginas con descripciones y badges. Empezá por acá para navegar el prototipo.
- `Merchsmith Site Map.html` — mapa de navegación entre surfaces.
- `Merchsmith Platform Brief.html` — brief del producto.
- `Merchsmith Admin.html` (+ `admin-*.js`) — admin del operador: directory, suppliers, curated range, store layout, settings.
- `Merchsmith Store.html` + `store-page.js` — storefront y página de producto (vistas customer y distributor).
- `product-modal.js` + `product-modal.css` — **el product modal, núcleo de la app** (ver HANDOVER §2).
- `Merchsmith Project - Autumn Giveaways.html` — el project workspace insignia (brief, candidatos de producto, estados, descargas).
- `Merchsmith Distributor Projects.html` + `dist-projects-data.js` — página master de proyectos (HANDOVER §2b).
- `Merchsmith Field Mapping Reference.html` — **modelo de datos canónico de producto** (57 campos / 12 grupos) + docs de feeds de supplier.
- `Merchsmith Status Reference.html` — todos los valores de estado y máquinas de estado.
- `Merchsmith Product Feed Spec.html`, `feed-adapters.js`, `admin-import.js`, `feed-schema-notes.md` — spec e implementación del importador multi-feed.
- `Price Matrix Concept.html` + `price-engine-plan.md` — motor de precios / matriz cantidad-precio.
- `Merchsmith Org and User Model.html`, `Organisations Concept.html` — modelo de organizaciones, usuarios y roles.
- `Supplier Connections Concept.html`, `Branding Builder Concept.html`, `Design Split Concept.html` + `design-split-plan.md` — conceptos aún no construidos.
- `tokens.css` — **design tokens, fuente de verdad** de color/espaciado; `styles.css`, `components.css`, `brand-assets.css`.
- Seeds de datos: `admin-data.js`, `store-feed.js`, `catalogue-data.js` (`MSCAT`), `store-structure.js`, `projects-data.js`, `org-data.js`, `home-data.js`, `order-data.js`.
- Plomería: `ms-mode.js` (modo blank vs. seeded), `theme.js` (colourways scope-aware), `ms-data.js` (`MSDATA` backup/restore), `chrome.js`, `sidebar.js`, `identity.js`.
- Referencia Xoopar: `Xoopar Field Map.html`, `Xoopar Single Product Fields.html`, `Xoopar API Product Preview.html` (+ PDFs en `Extras/`).
- `screenshots/` — capturas del comportamiento esperado.
- `price-tab-qa-findings.md` — hallazgos de QA abiertos sobre la pestaña de precio.

Para abrir una página del prototipo correctamente usá el skill `/open-reference-in-browser <archivo>` (sirve por HTTP en `localhost:8642`; con `file://` el CSS/JS no carga).

**Gotchas del prototipo:** los `<script>` llevan cache-buster `?v=N` — si editás un `.js` hay que bumpear la versión o el cambio no se ve. Las imágenes de producto son URLs externas y muchas dan 404 (fallback de tile con letra: no es un bug). Hay dos capas de datos: el seed hardcodeado en JS (se regenera al cargar) y el runtime en `localStorage`.

## 4. Backend — `merchsmith-backend/`

**NestJS 10 + TypeScript + Prisma 5 sobre PostgreSQL en Cloud SQL.** Auth por **Identity Platform** (verificación de ID token con Firebase Admin SDK). Swagger en `/api/docs`. Logging con Pino. Email por Gmail API (OAuth2). pnpm.

```bash
cd merchsmith-backend && pnpm install && pnpm prisma:generate && pnpm start:dev   # :3001
```

- **Estructura de `src/`**: leé la tabla completa en `merchsmith-backend/CLAUDE.md`. Agrupación mental: *catálogo* (`products/`, `product-variants/`, `product-pricing/`, `product-stock/`, `product-images/`, `product-categories/`, `product-attributes*/`, `product-field-definitions/`), *ingesta* (`feed-sync/` + `feed-sync/adapters/`, `supplier-feed-configs/`, `supplier-product-imports/`, `supplier-raw-records/`, `supplier-category-mappings/`, `product-imports/`, `feed-mapping-assistant/`), *comercial* (`markup-rules/`, `discounts/`, `curated-range/`, `decoration/`, `store/`, `store-layout/`, `store-settings/`, `merch-store/`, `distributor-product-overrides/`), *tenancy/identidad* (`auth/`, `organisations/`, `users/`, `roles/`, `invitations/`, `me/`, `platform-*/`), *transversal* (`common/`, `activity-logs/`, `file-assets/`, `email/`, `ai-provider/`, `prisma/`), y `projects/` (fundaciones del Project Workflow).
- **Convención de módulo**: `feature.module.ts` + `feature.controller.ts` + `feature.service.ts` + `dto/` + `*.spec.ts`.
- **Rutas**: prefijo global `/api`. Rutas tenant-scoped con `@UseAppGuards()` (AuthGuard + TenantGuard + PermissionGuard); rutas de plataforma con `@UsePlatformGuards()`. Permisos con `@RequirePermissions(...)`. Los composers viven en `src/common/guards.ts`.
- **Auth** (7 pasos, ver CLAUDE.md): Bearer ID token → verify → carga de usuario de `public.users` por `auth_user_id` → chequeo de estado → roles + memberships → tenant desde el header `X-Distributor-Environment-Id` → `AuthUserContext`.
- **DB**: `prisma/schema.prisma`, ~57 modelos y ~33 enums, todos con `@@map` a los nombres de la Phase A schema original (nunca los renombres). ~29 migraciones aditivas en `prisma/migrations/`. `PrismaService` abre la conexión real por el Cloud SQL Node.js Connector cuando hay `CLOUD_SQL_CONNECTION_NAME`; `DATABASE_URL`/`DIRECT_URL` los usan solo `prisma migrate` / `prisma db execute`.
- **IA**: *cualquier* feature que hable con un modelo DEBE pasar por `src/ai-provider/` (`AiProviderService`). Nunca importes un SDK de vendor fuera de `src/ai-provider/providers/*`. Vendor actual: Anthropic vía env (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`). Ejemplo de referencia: `src/feed-mapping-assistant/`.
- **Auditoría**: toda mutación se registra en `activity_logs` vía `ActivityLoggerService`.
- **Infra**: `infra/PENDIENTES-MIGRACION-GCP.md` (estado de la migración a GCP), `infra/gcp-foundations-setup.sh`, `infra/gcs-bucket-setup.sh`, `infra/pubsub-setup.sh`, `Dockerfile`, `cloudbuild.yaml`. No hay IaC (Terraform/CDK): solo scripts one-off. Storage en GCS (`src/storage-provider/`, `GCS_BUCKET`/`GCP_PROJECT_ID`), credenciales desde la service account de Cloud Run (local: `gcloud auth application-default login`).
- **Scripts útiles**: `scripts/` tiene migraciones de datos (Supabase→Cloud SQL, S3→GCS, usuarios→Identity Platform), verificadores (`verify-gcs-storage.ts`, `verify-pubsub-queue.ts`, `verify-identity-platform-admin.ts`) y seeds (`seed-department-keyword-rules.mjs`, `seed-test-supplier-relationship.js`).
- **Tests**: `pnpm test` (Jest unit), `pnpm test:e2e`.

## 5. Frontend — `merchsmith-frontend/`

**Next.js 16 App Router + React 19 + TypeScript strict.** Server state con **@tanstack/react-query 5**; auth state con `AuthProvider` (React Context). UI: **MUI v9 + Tailwind v4** híbrido. Validación con Zod v4. pnpm.

```bash
cd merchsmith-frontend && pnpm install && pnpm dev   # :3000  (levantá el backend primero)
```

- **Rutas**: `src/app/(auth)/` públicas (login, forgot/reset password, accept-invitation) y `src/app/(protected)/` autenticadas — `admin/`, `platform/`, `organisations/`, `product-categories/`, `product-imports/`, `store/` (incl. `store/products/[productId]/` con tabs Basic/Pricing/Images/Categories/Attributes/Decoration), `supplier-category-mappings/`, `supplier-raw-records/`, `users/`, `settings/`, `chats/`, `gallery/`, `projects/`.
- **Features** (`src/features/<dominio>/`): patrón estricto `api/` (funciones puras `(client, params) → Promise`) → `hooks/` (React Query, obtienen `apiClient` con `useAuth()`) → `types/` → `index.ts`. El `effectiveEnvironmentId` va como prefijo de query key para que todo se refetchee al cambiar de entorno.
- **`src/lib/api/client.ts`** — `ApiClient`: adjunta `Authorization: Bearer <token>` y `X-Distributor-Environment-Id` (excepto en `/api/platform/*` y `/api/me*`). Usalo siempre; nunca hagas `fetch` crudo al backend.
- **Auth**: Identity Platform client-side (`src/lib/auth/identity-platform-auth-client.ts`), sesión en IndexedDB, cookie `ip-has-session` solo como hint grueso para `src/lib/auth/middleware.ts`; la verificación real ocurre en cada llamada al backend. Tras login se llama `GET /api/me` y se guarda `CurrentUser` (incluye `mustChangePassword`).
- **Estilos**: `sx` de MUI (usando `sxArray()` de `src/components/ui/styles.ts`) + utilidades Tailwind + custom properties en `src/app/globals.css`. Tema en `src/lib/theme/theme.ts`. Colores de marca: Periwinkle `#7B85C5`, Spearmint `#36C0A0`, Flare `#FF2E17`, Blossom `#FFA2A5`, Sky `#0097D8`, Zest `#FFEB3D`. Fuentes: EB Garamond (headings) + Mulish (body).
- **Tests**: Vitest + MSW (`src/test/msw/handlers.ts` — agregá handler al agregar endpoint) y Playwright en `tests/e2e/` (arranca el dev server con `MOCK_AUTH=true`). `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm typecheck`.
- **Modo mock auth**: `MOCK_AUTH=true` / `NEXT_PUBLIC_MOCK_AUTH=true` bypassea Identity Platform con un usuario cookie-based.

## 6. Grafo de conocimiento (graphify) — usalo primero

Hay tres grafos: `graphify-out/` en la raíz (fusionado), `merchsmith-backend/graphify-out/` y `merchsmith-frontend/graphify-out/`.

**Para cualquier pregunta sobre el código, empezá por el grafo antes de grepear:**

```bash
graphify query "<pregunta>"        # subgrafo acotado
graphify path "<A>" "<B>"          # relación entre dos cosas
graphify explain "<concepto>"      # concepto puntual
```

`graphify-out/GRAPH_REPORT.md` solo para revisión amplia de arquitectura. Después de modificar código: `graphify update .` (solo AST, sin costo de LLM). Los hooks de git (`post-commit`, `post-checkout`, `post-merge` en `dev`) ya refrescan y pushean los grafos automáticamente; ver README raíz para el detalle y lo que sigue siendo manual.

## 7. Reglas duras (no negociables)

Backend:
1. Nunca corras migraciones contra producción sin pedido explícito.
2. Nunca borres ni truncar datos en ningún entorno sin pedido explícito.
3. Nunca expongas credenciales de service account ni API keys admin en código cliente, logs o mensajes de error.
4. Nunca renombres tablas/columnas mapeadas en `schema.prisma` (los `@@map` apuntan al schema original).
5. Nunca expongas `token_hash` de invitaciones ni ningún token/hash.
6. Nunca deshabilites guards de auth o chequeos de permisos fuera de endpoints dev-only.
7. No toques el schema de Prisma ni crees migraciones sin entender el impacto sobre la DB existente.
8. Nunca importes un SDK de vendor de IA en un módulo de feature — siempre vía `src/ai-provider/`.

Frontend:
9. Nunca expongas secretos ni llames a una API de IA directamente desde el cliente — todo pasa por un endpoint del backend que usa `AiProviderService`.
10. Consultá `Merchsmith Platform Design/` antes de construir UI nueva — el prototipo es la spec.
11. Seguí el patrón `api/ → hooks/ → types/ → index.ts`; usá el `ApiClient` de `useAuth()`.
12. No modifiques la protección de rutas de `src/lib/auth/middleware.ts` sin entender el flujo de auth completo.

Generales:
13. Secretos: `.env` / `.env.local` nunca se versionan (solo `.env.example`).
14. Antes de verificar un fix, **no dispares un sync de feed completo/sin límite** — acotá a 5-10 productos o preguntá.
15. Next.js 16 difiere de lo que tenés en el modelo: consultá `node_modules/next/dist/docs/` antes de escribir código de Next.

## 8. Cómo verificar tu trabajo

- Backend: `pnpm build`, `pnpm test`; probá endpoints contra Swagger en `http://localhost:3001/api/docs`.
- Frontend: `pnpm typecheck` + `pnpm lint` + `pnpm test`; para cambios visibles, levantá el dev server y verificá en el browser (consola sin errores, comportamiento igual al del prototipo). No le pidas al usuario que verifique manualmente.
- Comparación visual: abrí la página equivalente del prototipo lado a lado antes de dar por buena una UI.

## 9. Primer entregable esperado de vos

Después de la Fase 0, devolvé un resumen propio (no una copia de estos docs) que cubra:
1. El mapa de dominio: cómo fluye un producto desde el feed del supplier hasta el precio que ve el customer en la store.
2. Qué está **realmente construido** en backend y frontend vs. qué es stub o está diferido (contrastá `Merchsmith Timetable Update.md` con el código real).
3. Dónde diverge hoy el frontend real del prototipo en `Merchsmith Platform Design/`.
4. Los tres riesgos o deudas técnicas más importantes que detectaste.

Solo después de eso, pedí la tarea concreta o empezá la que se te haya asignado.
