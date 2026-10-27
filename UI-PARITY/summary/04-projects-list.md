# Summary 04-projects-list (frontend)

Método: auditoría de `ref/04-projects-list.md` (188 literales) contra `src/app/(protected)/projects/{components,new,lib}`. Boards de distribuidor/cliente, tabla expandible, density, wizard con "Leave project setup?" y "Draft saved" ya existen. Los literales que faltan son sobre todo datos demo (actividad/nombres de proyectos) y textos del wizard por verificar.

| # | Referencia | Estado actual (archivo:línea) | Diferencia | Cambio requerido | Prioridad | Estado |
|---|---|---|---|---|---|---|
| 1 | Chip de fecha: `Order deadline passed` / `Order today to keep your dates` / `Order within N day(s) by …` | `projects/lib/customerBoard.ts:35-42` ("Order-by passed · was …", "Order today by …") | textos | textos de la ref (test actualizado) | media | done |
| 2 | Filtro cliente: `Action required` | `CustomerProjectsBoard.tsx:329` "Needs your action" | etiqueta | renombrado | baja | done |
| 3 | Filtro cliente: `Flagged only` | `CustomerProjectsBoard.tsx:333` "Flagged" | etiqueta | renombrado | baja | done |
| 4 | Filtro: checkbox `Idea` y `Drafts only`; contador `<n> project(s)` + botón `Clear` | `CustomerProjectsBoard.tsx:327-340` sin Idea ni Drafts only | faltan 2 filtros | añadir `Idea` (estado de fila) y `Drafts only` (proyectos en borrador, ya existe `DraftProjectCard`) | media | Idea done; Drafts only todo (los borradores se pintan aparte del tablero filtrable) |
| 5 | Buscador distribuidor `Search projects, customers or clients…`, `Expand all ▾`/`Collapse all ▴`, densidad Compact/Comfortable | `ProjectsDistributorBoard.tsx:1379,1443` | coincide | ninguno | - | done |
| 6 | Wizard: `Draft saved`, `Leave project setup?` | `projects/new/page.tsx:837`, `wizardDrafts.tsx:130` | existe | verificar `Save & exit` (title "Your progress is saved…") y hint `Give your project a name to continue` | baja | todo |
| 7 | Modal de colaboradores: `Everyone is already on this project.`, `ON THIS PROJECT`, `Search people` | `features/project-collaborators` | pendiente de comparar | verificar literal | baja | todo |
| 8 | Drawer de comentarios `Add a comment…`, `No activity yet.` | `features/project-comments` | pendiente | verificar literal | baja | todo |

## Fuera de alcance
- Proyectos/actividad demo (Autumn Giveaways, Summer Event 2026, Raf Price…): datos del prototipo.
- Persistencia `DPROJ.*` en localStorage.

## Backend
Verificado en `projects`, `project-drafts`, `project-collaborators`, `project-comments`, `project-activity`. Resultado: **cubierto**, sin cambios de código.

| Necesidad | Endpoint | Estado |
|---|---|---|
| Listado de proyectos (boards distribuidor/cliente) | `GET /api/projects` (`search`, `status` multi: `idea,quote,proof,ordered,prod,delivered,closed`) | cubierto; el filtro `Idea` (fila 4) se resuelve con `status=idea` o en cliente |
| `Drafts only` (fila 4) | `GET/POST/PUT/DELETE /api/project-drafts` (borradores del wizard, separados de `projects`) | cubierto: listar borradores con `GET /project-drafts` |
| Crear proyecto / wizard, `Save & exit`, `Draft saved` | `POST /projects`, `PATCH /projects/:id`, drafts `PUT /project-drafts/:id`, brief `GET/PUT /projects/:id/brief` | cubierto |
| Account manager (candidatos) y cuenta del cliente | `GET /projects/account-manager-candidates`, `GET /projects/customer-account` | cubierto |
| Modal de colaboradores (`ON THIS PROJECT`, `Search people`, "Everyone is already on this project.") | `GET /projects/:id/collaborators`, `/collaborators/candidates`, `POST`, `DELETE :userId`; `GET /project-collaborators` (lista agregada) | cubierto |
| Drawer de comentarios / actividad (`Add a comment…`, `No activity yet.`) | `projects/:id/comments` (GET, `mentionable`, `unread-count`, POST, `mark-read`, DELETE), `projects/:id/activity` | cubierto |

### Fuera de alcance (backend)
- Datos demo y persistencia `DPROJ.*` (localStorage) de la ref: el real usa la API.
