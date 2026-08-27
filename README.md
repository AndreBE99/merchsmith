# Merchsmith

Repo raíz (monorepo "sombrilla") que agrupa el backend y el frontend de Merchsmith como git submodules.

## Qué hace el producto

Merchsmith es una plataforma B2B de merchandising promocional que conecta **distribuidores**, sus **proveedores** (suppliers) y las **marcas** para las que producen. En términos de dominio:

- **Catálogo y sincronización de feeds**: cada distribuidor consume catálogos de producto de varios proveedores (Mid-Ocean, PF Concept, XD Connects/Xindao, Neutral, entre otros) a través de adaptadores de feed que normalizan precios, variantes, colores, stock e imágenes en un catálogo único por distribuidor.
- **Catálogo global y curado**: sobre ese catálogo, cada distribuidor aplica reglas de markup, descuentos (por producto, proyecto, cliente, categoría o a nivel de toda la tienda), y decide qué queda visible en su store.
- **Store**: una tienda de cara al cliente final donde se navega el catálogo curado, se ven precios con la matriz de cantidades/precio y se configuran opciones de decoración/branding por producto (posiciones de impresión, métodos, price breaks).
- **Proyectos**: el flujo de trabajo colaborativo alrededor de un pedido de merchandising — brief, selección de producto, diseño/precio/muestra/stock, aprobación — que conecta al distribuidor con su cliente final.
- **Administración de la plataforma**: organizaciones (distribuidor/proveedor/cliente), usuarios, roles y permisos, invitaciones, y configuración a nivel plataforma (planes, entornos, registro de proveedores).

El backend (`merchsmith-backend`, NestJS + Prisma sobre Supabase Postgres) expone la API REST que consume el frontend (`merchsmith-frontend`, Next.js + React). Ambos son proyectos independientes que **solo se comunican por HTTP** — no comparten código ni se importan entre sí.

## Por qué submodules y no un monorepo fusionado

Backend y frontend ya eran dos repos de GitHub independientes, con su propio historial, ramas y pipelines, antes de armar este repo raíz. Fusionarlos en un solo árbol de git habría significado perder ese historial o reescribirlo. Como además **no comparten imports ni código** — solo hablan por API REST — no hay ninguna ventaja real en un monorepo fusionado (no hay refactors atómicos cross-paquete que un monorepo facilitaría). Git submodules deja que cada paquete siga siendo un repo normal, con su propio remoto y su propio ciclo de vida, y el repo raíz simplemente fija qué commit de cada uno compone el estado "actual" del producto.

La contrapartida de los submodules es que cada uno tiene también su **propio grafo de conocimiento de graphify** (`graphify-out/graph.json` dentro de cada paquete) en vez de uno solo combinado — construirlos por separado es más barato (menos costo de clustering/HTML por corrida) sin perder nada real, justamente porque no hay grafo de imports compartido entre ambos. El repo raíz mantiene además un grafo fusionado (`graphify-out/graph.json` en la raíz, generado con `graphify merge-graphs`) para preguntas que cruzan ambos paquetes.

## Cómo funciona la sincronización automática del grafo

Cada paquete (`merchsmith-backend`, `merchsmith-frontend`) tiene instalado [graphify](https://github.com/safishamsi/graphify) con estos git hooks locales (no versionados, viven en `.git/hooks/` de cada paquete):

| Hook | Cuándo dispara | Qué hace |
|---|---|---|
| `post-commit` | Cada `git commit` con cambios de código | Reconstruye el grafo (solo AST, sin LLM) en background, de forma no bloqueante |
| `post-checkout` | Cada cambio de rama | Reconstruye el grafo (solo AST) para reflejar el código de la rama nueva |
| `post-merge` | Cada `git pull` (o `git merge`) que trae cambios, **solo si termina en la rama `dev`** | Ver detalle abajo |
| merge driver | Un merge que toca `graphify-out/graph.json` | Hace union-merge del JSON en vez de generar conflictos de merge de texto |

El `post-merge` es el que cierra el círculo que nos faltó automatizar en el proyecto anterior (Clink): sin él, el grafo queda desactualizado después de cada `pull` porque el `post-commit` de graphify no se dispara con `pull`/`merge`. Cuando el `post-merge` corre en la rama `dev` de un paquete:

1. Corre `graphify update .` (AST-only, sin costo de LLM) para refrescar el grafo con el código recién traído.
2. Espera (con polling de mtime, no un sleep fijo) a que `graphify-out/graph.json` se estabilice.
3. Comitea y pushea el grafo refrescado de vuelta a `origin/dev` del propio paquete.
4. Re-fusiona los grafos de **todos** los paquetes en `graphify-out/graph.json` de esta raíz, usando un lock file (`mkdir` atómico) para serializar la operación si backend y frontend se pulean casi al mismo tiempo.
5. Comitea y pushea ese grafo fusionado a este repo raíz.

**Qué sigue siendo manual:**
- Instalar los hooks en un clon nuevo (`graphify hook install` dentro de cada paquete, más copiar el `post-merge` — ver `merchsmith-backend/.git/hooks/post-merge` como referencia si hace falta reinstalarlo).
- La extracción **semántica** del grafo (la de archivos de documentación, no de código) sigue necesitando un LLM — hoy corre a mano vía `/graphify .` con Claude Code, o se puede automatizar con una `GEMINI_API_KEY`/`GOOGLE_API_KEY`. Los hooks automáticos solo tocan la parte AST (código), que no tiene costo de LLM.
- Actualizar el puntero de submodule en la raíz cuando un paquete avanza — eso lo maneja el `post-merge` cuando re-fusiona el grafo, pero **no** actualiza el gitlink del submodule en sí; eso sigue siendo un `git add <paquete> && git commit` manual en la raíz cuando se quiere fijar una nueva versión "oficial" de un paquete.

## Manos a la obra

### Prerequisitos
- Node.js + pnpm (ambos paquetes lo usan como package manager).
- Acceso SSH configurado a GitHub (los submodules usan URLs `git@github.com:...`).
- Python 3 + [`graphifyy`](https://pypi.org/project/graphifyy/) si vas a reconstruir grafos manualmente (`uv tool install graphifyy`).

### Clonar

```bash
git clone --recurse-submodules git@github.com:AndreBE99/merchsmith.git
```

Si ya clonaste sin `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

### Levantar cada paquete

**Backend** (`merchsmith-backend/`):

```bash
cd merchsmith-backend
pnpm install
cp .env.example .env   # y completar las variables (ver su propio README/CLAUDE.md)
pnpm prisma:generate
pnpm start:dev          # http://localhost:3001, Swagger en /api/docs
```

**Frontend** (`merchsmith-frontend/`):

```bash
cd merchsmith-frontend
pnpm install
cp .env.example .env.local   # y completar las variables
pnpm dev                # http://localhost:3000
```

El frontend llama a `GET /api/me` contra el backend apenas hay login, así que conviene tener el backend corriendo primero.

## Día a día

- Cada paquete se trabaja como un repo normal: `git checkout -b feat/algo` (o `fix/algo`, la convención ya en uso), commits, PR contra `dev`, merge.
- Al hacer `git pull` en la rama `dev` de cualquiera de los dos paquetes, el `post-merge` se dispara solo: refresca el grafo de ese paquete, lo pushea, y re-fusiona+pushea el grafo combinado de la raíz. No hace falta hacer nada manualmente para eso.
- Cuando querés que la raíz apunte al último commit de un paquete (por ejemplo, después de mergear una feature a `dev`), actualizá el submodule desde la raíz:

  ```bash
  cd merchsmith-backend && git pull origin dev && cd ..
  git add merchsmith-backend
  git commit -m "chore: bump merchsmith-backend"
  git push
  ```

- Si tocás código y comiteás localmente (sin hacer pull), el `post-commit` de graphify reconstruye el grafo de ese paquete en background — no necesitás correr nada a mano salvo que quieras forzarlo (`graphify update .`).

## Cosas importantes

- **Secretos**: nunca se versionan `.env` / `.env.local` (solo sus `.env.example`). Cada paquete documenta sus variables en su propio `CLAUDE.md`/`README.md`. `SUPABASE_SERVICE_ROLE_KEY` en particular nunca debe salir del backend.
- **Convención de ramas**: `dev` es la rama de integración en ambos paquetes (con `main` y `release` como ramas separadas). Las ramas de trabajo usan prefijo `feat/` o `fix/` seguido de una descripción corta (ej. `feat/store-filters`, `fix/feed-sync-dedupe-and-single-sync-lock`).
- **Versionado**: no hay versionado semántico formal entre paquetes; el "estado oficial" del producto es simplemente el par de commits (backend, frontend) que la raíz tiene fijados como submodules en un momento dado.
- **graphify-out/**: cada paquete y la raíz versionan `graph.json` (y en los paquetes también `GRAPH_REPORT.md`, `manifest.json`, `.graphify_labels.json` + `.sig`) pero **no** archivos locales a la máquina (`.graphify_python`, `.graphify_root`, `cache/`, `cost.json`, backups diarios) ni `graph.html` (se regenera desde `graph.json` con `graphify export html`).
