# 04-projects-list — Projects (cliente), Distributor Projects (maestra), Create Project (wizard)

Referencia: `/Users/AndreBE99/Codes/Merchsmith/Merchsmith Platform Design V2/` (en adelante `V2/`). Tres pantallas, tres ficheros HTML distintos. Chrome (sidebar, header, footer, identity lockup) = sección 01-chrome; aquí solo se anota cómo se enchufa.

## 0. Fuentes y versiones

| Pantalla | HTML | JS (versión) | Datos |
|---|---|---|---|
| Projects (cliente, "Your Projects") | `Merchsmith Projects.html` (322 l.) | `projects-page.js?v=9`, `order-social.js?v=21`, `ms-comments.js`, `avatars.js`, `org-data.js?v=11`, `sidebar.js?v=23`, `chrome.js?v=3`, `logos.js`, `identity.js` | `projects-data.js` (`window.PROJECTS`, 6 proyectos) |
| Distributor Projects (tabla maestra) | `Merchsmith Distributor Projects.html` (639 l., script inline l.253-631) | `dist-projects-data.js?v=5` (`window.DPROJ`), `ms-data.js`, `seed-identity.js?v=2`, `avatars.js?v=3`, `sidebar.js?v=23`, `chrome.js?v=3`, `comments.js` (l.637) | `dist-projects-data.js` (14 proyectos, 6 clientes) |
| Create Project (wizard 5 pasos) | `Merchsmith Create Project.html` (639 l.) | `create-project.js?v=12`, `store-feed.js?v=2`, `org-data.js?v=11`, `acct-manager.js?v=3`, `cust-account.js?v=7`, `sidebar.js?v=23`, scripts inline l.602-637 | localStorage `ms-project-draft` |

Todas cargan `tokens.css`, (Projects y Distributor: `components.css`), `theme.js` (inyecta `html.ui-polish`, `ui-polish.css?v=50`, `ui-polish-icons.js?v=2`) y Google Fonts: EB Garamond (400/500/600 + italic), Fredoka 500/600, Mulish 300-800.

Qué página ve cada rol (`sidebar.js:122-144`): cliente -> sidebar "Projects" va a `Merchsmith Projects.html` (links: All projects, Autumn Giveaways, Gallery view, Create a project); distribuidor -> `Merchsmith Distributor Projects.html` (All customer projects, ..., Create a project). El distribuidor también abre `Merchsmith Projects.html?customer=<Nombre>` (vista de proyectos de un cliente).

## 1. Tokens (tokens.css; tema por defecto)
`--periwinkle:#7B85C5; --periwinkle-deep:#5860A6; --periwinkle-ink:#3C4279; --spearmint:#36C0A0; --flare:#FF2E17; --blossom:#FFA2A5; --ink:#222; --paper:#F4F5F8; --paper-2:#E9EBF3; --line:rgba(34,34,34,.12); --line-soft:rgba(34,34,34,.07); --muted:#9A9AA6; --ink-2:#44444c; --ink-3:#55555c; --text-soft:#6b6b73; --muted-2:#8a8a92; --hair:#d7d9e3; --green-deep:#1f8a5b; --tint-green:#e3f5ee; --tint-peri:#eceef8; --tint-red:#ffe7e3; --serif:"EB Garamond"; --sans:"Mulish"; --page-gutter:clamp(20px,2.5vw,36px); --shadow-rgb:20,22,45` (tokens.css:8-36). Tema alternativo (verde) en tokens.css:45-54 (theme.js lo conmuta por scope).
ui-polish (html.ui-polish): `--g50:#F9FAFB --g100:#F2F4F7 --g200:#EAECF0 --g300:#D0D5DD --g500:#667085 --g600:#475467 --g700:#344054 --g900:#101828; --sh-xs:0 1px 2px rgba(16,24,40,.05); --sh-lg:0 12px 16px -4px rgba(16,24,40,.08),0 4px 6px -2px rgba(16,24,40,.03); --ctl-r:8px; --card-r:12px; --ring:0 0 0 4px color-mix(in srgb,var(--periwinkle) 24%,transparent)` y `--line-soft:var(--g200); --line:var(--g300)` (ui-polish.css:9-19). Reglas polish relevantes: `.phead h1{font-size:clamp(30px,3.4vw,40px);nowrap}` (584), `.phead .acts a{radius 8px;min-height 40px;padding 0 16px;weight 600}` (586-591), `.filterbar .seg` = grupo segmentado con bordes `--g300` sin gap (595-599), `.pcard{border 1px --g200; radius 12px; shadow xs; hover --sh-lg}` (601-602), `.pc-urgentchip{12px/600, sin uppercase, radius 16px}` (603), `.pc-itemshd` sentence-case 12.5px/600 `--g500` (604), `.fchip` radius 8px, borde `--g300`, `.on` gris `--g100`, `.urg.on` rojo claro `#fdecec`/`#b4232c` (477-481), `.kpi{border 1px --g200;radius 12px; span sentence-case 13.5px/500 --g600}` (487-489), `.seg/.densseg` segmentado gris (131-134), `.rev-card h4`/`.rev-kv span` sentence-case 13px/600 (558, 729), inputs `border 1px --g300 radius 8px` (ui-polish.css:~38), `.cp-exit{nowrap}` (727).

## 2. PROJECTS (cliente) — `Merchsmith Projects.html` + `projects-page.js`

### 2.1 Layout (HTML l.267-315)
```
body (bg --paper)
  .header (white, pad 12/24, border-bottom --line-soft)  .brand[data-identity-lockup]  .headtools: basket(.it title="Basket", badge "3"), search(.it title="Search"), .av "JD"
  .crumbband (bg --blossom, pad 13px var(--page-gutter))  .crumb: span.crumb-org ("Citrix"; script l.306 lo cambia por rol: distributor "Mojo Promotions", customer "Citrix", supplier "BagWorks UK", admin "Merchsmith") › .here "All projects" (color #fff; .crumb color #7a3b32 13.5px/600)
  .main (padding 30px gutter 60px, full-bleed)
    .phead: h1#projTitle.serif 40px/500 "Your Projects" | .acts > a#createBtn.a-primary "+ Create Project" (icono p-plus; bg periwinkle-deep; shadow 0 4px 14px rgba(94,104,176,.32); hover -2px y icono rota 90deg)
    .phairline (1px --line, margin 18 0 0)
    #pmeta.pmeta  (grid repeat(auto-fit,minmax(150px,1fr)) gap 10px, margin 18/0/20) -> 7 tiles .pm-st
    .filterbar (flex space-between, margin 24 0 22)
        .showing "Showing:" + #scopeSeg.seg  [Open projects (on) | All | Delivered | Drafts | Archived]
        #count (display:none!important)
        .tools: select.pj-who#(insertado por JS al principio) | #searchbox.searchbox (oculto; .on = flex) [icono + input#search placeholder "Search projects…" 180px] | #searchBtn.tool title="Search" | #sortBtn.tool title="Sort" | #selBtn.tool title="Select" | #filterBtn.tool title="Filter"
    #pjBulk.pj-bulk (insertado tras .filterbar; solo selMode)
    #grid.grid
  aside#cmtScrim.cmt-scrim ; aside#cmtDrawer.cmt-drawer (comentarios)
```
Footer del HTML: CSS `.footer` definido pero el markup no existe en este fichero (footer lo pone chrome.js/01-chrome).

### 2.2 Grid (l.63, 75-77, 170-171)
`.grid{display:grid;gap:20px;align-items:start;grid-template-columns:repeat(auto-fill,minmax(max(300px,calc((100% - 40px)/3)),1fr))!important}` -> máx 3 columnas; `<=700px` 1 columna. (Reglas antiguas 4/3/2/1 columnas a 1180/880/560 quedan anuladas por el !important.)

### 2.3 Tiles de resumen `#pmeta` (JS `renderMeta`, l.97-105)
Calculados sobre la lista filtrada actual. 7 tiles `<a class="pm-st [on] [nf]" href="#">`: `.pm-ic` (38x38, radius 10, bg `--tint-peri`, icono 18px) + `.pm-tx` (`<b>` serif 24px/500 número + `<span>` 12.5px/700 muted con `i.sdot` opcional + etiqueta).
Orden/etiquetas exactas: 1) icono carpeta, nº proyectos, **"Projects"** (no filtro, `.nf`) 2) caja, nº items, **"Products"** (`.nf`) 3) alerta, **"Need your action"** dot `action` filtro `act` 4) reloj, **"In progress"** dot `prog` filtro `prog` 5) caja, **"Ready to order"** dot `ready` filtro `ready` 6) camión, **"Ordered"** dot `ordered` filtro `ordered` 7) check, **"Delivered"** dot `deliver` filtro `deliver`. Click en tile con filtro: toggle `stF` (`.pm-st.on`: border periwinkle-deep, bg tint-peri, ring 1px). Estilos l.175-185. Tile hover: border periwinkle, translateY(-1px), shadow 0 6px 16px rgba(20,22,45,.07).
`.nf` = sin hover/cursor.

### 2.4 Status dots (l.172-184, 217-220)
`.sdot` 10px circle `#d0d5dd`. `d-action`: `#d92d20` + halo 3px `#fee4e2`. `d-prog`: `#f79009` halo `#fef0c7`. `d-ready`: `#12b76a` halo `#d1fadf` (override final l.217). `d-ordered`: sin fondo, 14x14, tick rosa (borde `--periwinkle-deep` 2.2px rotado 45deg). `d-deliver`: sin fondo, 16x14, icono SVG camión (data URI, stroke `#344054`, 16px). `d-idea`: `#d0d5dd` halo `#f2f4f7`.
Etiquetas de estado (ST, l.14-21): idea "Idea", prog "In progress", ready "Ready to order", ordered "Ordered", deliver "Delivered", action "Action required". Etiqueta `.slbl` (11px/700 uppercase) oculta (`max-width:0;opacity:0`) y aparece al hover del `.pc-item` (max-width 130px). Colores `.slbl.l-*`: idea `#9a6b1f`, prog muted, ready periwinkle-deep, ordered muted, deliver green-deep, action flare.

### 2.5 Tarjeta de proyecto `.pcard` (JS `card()`, l.46-68)
```
.pcard[data-id][.sel]            border 1px --line-soft; radius 16px (polish 12); padding 34px 26px 24px; position:relative; flex column; hover border periwinkle + shadow 0 10px 26px rgba(40,44,80,.09); .sel border periwinkle-deep + bg tint-peri
  .pc-top (absolute top:32px right:26px; gap 8; 3 tiles 34x34 radius 10 bg rgba(255,255,255,.96) border --line-soft shadow 0 1px 3px rgba(20,22,45,.1); icono 16px)
     .pc-flag[.on][data-flag] title "Flag this project" / "Flagged — click to clear" (on: color flare, bg 8% flare, icono relleno)
     .pc-arch[data-arch] title "Archive this project"/"Unarchive this project" (aria-label "Archive <name>")
     .pc-cmt[data-cmt] (icono chat) + .b badge (nº comentarios; 18px, flare, borde 2px blanco, top -6 right -6)
  h3.pc-title[data-open] serif 23px (!important), padding-right 132px, margin-top -11px, hover periwinkle-deep + subrayado
  .pc-date  "Created: <p.created>" [+ " · " <b.pc-archd>Archived</b>]   11.5px muted, padding-right 128px
  .pc-duerow (flex space-between wrap, margin 12 0)
     .pc-due[.a|.r] (pill 28px; icono reloj; texto: "Order deadline passed" | "Order today to keep your dates" | "Order within <b>N day(s)</b>" + span "by Tue 14 Oct" (en-GB weekday short, day numeric, month short)); clase .r si <=3 días (bg #fef3f2 color #b42318), .a si <=7 (bg #fffaeb color #b54708); si no hay fecha: <span></span>
     .pc-urgentchip: si hay items "action": "N action(s) required" (rojo: bg #fef3f2 color #b42318, punto #d92d20 7px); si no y hay "ready": "N ready to order" (inline style green: bg 12% #12b76a, color #067647, punto #12b76a); si nada, vacío
  .pc-prog (6px, bg paper-2) > i (width = progress %, gradient periwinkle->periwinkle-deep) title "<n>% through pipeline"
  .pc-itemshd  "<N> item(s)" | "Status"    (11px/800 uppercase; polish sentence-case)
  ul.pc-items > li.pc-item: .nm (ellipsis) > a.pc-plk[href="Merchsmith Project - Autumn Giveaways.html#product=<enc name>"][data-prod] + (crit) span.pc-crit title "Critical delivery date" texto "Critical" (10px/800 uppercase #b42318 bg #fef3f2 border #fecdca radius 6) ; .pstat > span.slbl.l-<k> + span.sdot.d-<k>[title=label][aria-hidden]
  .pc-foot (margin-top 13; padding-top 12; border-top --line-soft; flex space-between)
     .pc-check[.on][data-check] (20x20 radius 6 borde 1.8px; on = bg periwinkle-deep; check icon)
     .pc-team: hasta 3 .av (28px, border 2px #fff, margin-left -8, color por AVC[(name.length+i)%6], data-tip "<Name> · <Org>" tooltip oscuro #101828 11.5px 600, hover translateY(-3px) scale(1.12)); si >3 .av.more "+N" (bg paper-2, data-tip lista restantes); .add (28px, borde dashed 1.5px, icono plus, title "Add a collaborator", data-addc)
```
Avatares: foto vía `MSAvatar.url(name)` si existe, si no iniciales (2 letras). AVC = `#7b85c5 #51768c #c66a4a #3a9d6b #8246af #d2453a`. Org de persona: `mojo` (ORG_DATA.mojoTeams usuarios) => "Mojo Promotions", si no "Citrix".
Progreso: pesos idea 5, prog 45, ready 70, ordered 90, deliver 100, action 40; media sobre items (l.23-26).
Order-by: si `!p.orderBy && !p.delivered` y hay items idea/prog/ready/action, se genera demo: hoy 17:00 + (2 + hash(id)%14) días (l.40). `left = ceil((orderBy-now)/día)`.

### 2.6 Tarjeta borrador `.pcard.pc-draftc` (l.87-92)
Borde dashed 1.5px `--line`, bg gradient #fff->#fafafa, cursor pointer. Contenido: `.pc-top` solo `.pc-arch[data-ddel]` (icono papelera, title "Delete draft", aria "Delete draft <name|Untitled>"); `.pc-title` nombre o **"Untitled project"**; `.pc-date`: `.pc-dtag` **"Draft"** (10.5px/800 uppercase #b54708 bg #fffaeb borde #fedf89) + " Saved <d MMM | today>"; descripción opcional `.pc-ddesc` (140 chars máx, 13px ink-3); `.pc-dprog`: texto **"Step N of 5 · <Basics|Budget & timing|Brand & finish|Products|Review>"** + `.pc-dbar>i` ancho `(step+1)/5*100%` color `#f5b041`; `.pc-dfoot` botón `.pc-dbtn[data-dres]` **"Continue setup"** + flecha (borde --line, radius 10, 13.5px/700; hover periwinkle-deep + flecha +3px).
Los borradores se muestran SIEMPRE antes que los proyectos (`DR.map(dcard)+list.map(card)`), salvo scope=archived o cualquier filtro de estado/persona/crit/flag/fSts activo (`__pjDrafts=[]`). Fuente: `ms-project-draft` (actual, id 'cur', solo si tiene name o desc) + `ms-project-drafts` (array, máx 10).

### 2.7 Estado vacío
`<p style="color:var(--muted);padding:30px">No projects match.</p>` (sin borradores ni proyectos).

### 2.8 Filtros, orden, selección
- Scope `#scopeSeg`: `open` (no archivados, no delivered), `all` (no archivados), `delivered`, `drafts` (list=[] solo borradores), `archived`. Botón activo `.on` (bg periwinkle, texto blanco; polish: gris `--g100`).
- Filtro por tile `stF`: `act` -> items action; otro -> items con ese estado.
- `select.pj-who#` (aria-label "Filter by person"; primera opción **"Everyone’s projects"**; luego personas únicas de `p.team` ordenadas), insertado como primer hijo de `.tools`.
- Búsqueda: botón lupa togglea `.searchbox`; filtra por nombre de proyecto o nombre de item (case-insens).
- **Sort** (popover `.pj-pop`, cabecera `.pj-ph` **"Sort by"**, items `.pj-pi` con ✓): "Most recent" (ts desc, defecto), "Order deadline (soonest)", "Needs action first", "Name A–Z", "Most products". Tooltip del botón pasa a "Sort: <label>".
- **Select** (`#selBtn` toggle `.on`): modo selección; click en tarjeta marca/desmarca. Barra `#pjBulk.pj-bulk` (bg periwinkle-deep, texto blanco, radius 12, pad 10/16): `<b>N selected</b>`, botón "Select all <N>"/"Clear all", si n>0: "Archive"/"Unarchive" (según scope archived) y "Flag"; spacer; "Done". Toasts: "<n> project(s) archived|unarchived", "<n> flagged".
- **Filter** (popover): cabecera **"Show projects with"**; checkboxes (con sdot) en orden: Action required, In progress, Ready to order, Ordered, Delivered, Idea; hr; "Drafts only", "Critical delivery dates", "Flagged only"; pie: botón "Clear" + contador "<n> project(s)". Con filtros activos el botón lleva `.dot` (punto rojo flare 7px arriba-derecha).
- Botones `.tool`: 38x38 radius 10 borde --line-soft bg blanco; hover/on: borde periwinkle, color periwinkle-deep, translateY(-1px).
- Popover `.pj-pop`: abs z1500, min-width 230, radius 14, shadow 0 14px 40px rgba(20,22,45,.18), pad 8; se posiciona bajo el botón alineado a la derecha; se cierra con mousedown fuera.

### 2.9 Interacciones
- Click título / tarjeta (fuera de controles) -> `Merchsmith Project - Autumn Giveaways.html` (siempre el mismo proyecto en el prototipo). Click en nombre de producto -> mismo HTML con `#product=<nombre>`.
- **Create Project** (`#createBtn`): si hay borrador actual con name/desc -> `confirm("You have an unfinished project “<name|Untitled>”. Start a new one anyway? The draft stays in Your Projects.")`; al aceptar, el borrador actual se mueve a `ms-project-drafts` (id `dr<base36 Date.now>`, `at` ISO, máx 10) y `ms-project-draft=''`; navega a `Merchsmith Create Project.html?new=1`.
- Continuar borrador (`data-dres` o click en `data-draft`): si id != 'cur', el borrador elegido pasa a `ms-project-draft` (el actual, si existe, se aparca en la lista) y navega a `Merchsmith Create Project.html`.
- Borrar borrador: `confirm('Delete this unfinished project?')`, toast "Draft deleted".
- Archivar: toggle en set `ms-proj-archived` (localStorage array de ids); toast "Project archived · find it under Archived" / "Project unarchived".
- Flag: toggle en memoria (`p.flag`), no persiste.
- **Modal "Add collaborators · <proyecto>"** (`.pj-scrim` z2000 + `.pj-modal` 460px): input "Search people", lista de checkboxes (avatar 30px, nombre, org) del pool Citrix teams + Mojo teams excluyendo los del proyecto; mensaje "Everyone is already on this project."; fila `.pj-cur` "ON THIS PROJECT" con tags `.pj-tag` y × (aria "Remove <n>", solo si >1 miembro); botones "Cancel" / "Add"; toast "<n> collaborator(s) added". Persiste en `ms-proj-team` {id:[nombres]}.
- **Drawer de comentarios** `#cmtDrawer` (420px o 92vw, desliza desde la derecha, scrim `rgba(22,24,28,.42)` + blur 2px, z60/70): cabecera h3 "Comments" + sub (nombre proyecto) + botón ✕; tabs "Comments" / "Activity"; lista; compositor input placeholder **"Add a comment…"** + botón **"Post"**. Vacío: "No comments yet. Start the conversation below." / "No activity yet.". Enter envía. Semilla `autumn`: Cara Lyon (2h ago) "Proof for the Tote is back from studio — needs your sign-off."; Jess Doyle (Yesterday) "Tech Travel Bag delivery is critical for the 15th — flagged with supplier."; Raf Price (3d ago) "Updated the Wheat Straw mouse artwork to v2."; `summer`: Sara Kemp (1h ago) "Recycled Tote needs a decision today or we miss the window." Actividad `autumn`: "Cara Lyon approved the price for Tech Travel Bag" 2h ago; "Raf Price uploaded proof v2 for Wheat Straw Mouse" 1d ago; "Jess Doyle confirmed a critical delivery date" 3d ago; "Project Autumn Giveaways created" 22 Aug 2025. `summer`: "Sara Kemp flagged Recycled Tote for action" 1h ago; "Project Summer Event 2026 created" 4 Jun 2026. Al enviar: añade comentario como "Jess Doyle"/"Just now", sube contador y registra en `MSComments.add({text,ctxType:'project',ctxLabel,deepLink})`.
- Toast `tEl`: fixed bottom 24 centrado, bg `#23231f`, 13.5px/600, radius 11, 2s.
- `?customer=<Nombre>` (distribuidor, `ms-role==='dist'`): h1 pasa a "<Nombre> <span 15px/600 text-soft>· Projects</span>" y se inserta banner (bg tint-peri, color periwinkle-ink, 13px/600, radius 10, pad 9/14): "Viewing <b>Nombre</b>'s projects as the distributor. ← Back to Organisations" (link `Merchsmith Organisations.html#tab=customers`). Para cliente solo cambia el título.

### 2.10 Datos semilla (projects-data.js)
6 proyectos (id, name, created, flag, comments, team, items[n, st, crit]):
- `autumn` "Autumn Giveaways", Created "Mon 22 Aug 2025, 10:11am", flag true, 3 comentarios, team Jess Doyle/Cara Lyon/Raf Price; items: Xoopar Mr. Bio Wheat Straw Charging Cable prog; Tech Travel Bag ready+crit; Hoton A5 Kraft Paper Notebook ready; Xoopar Pokket Wheat Straw Wireless Mouse prog; Prodir Ds8 True Biotic Pen ordered; Desktop Garden idea.
- `expo` "2026 Charity Expo" (Tue 18 Aug 2025, 8:22am; team Ben Shaw; 8 items: 5 ordered..., Prodir idea, Seed Pencil Set prog, Cork Cover Notebook ready).
- `staff` "Staff Gifts" (Fri 4 Jul 2025, 11:14am; Cara Lyon; 4 items 2 prog 2 idea).
- `vip` "VIP Gifts" (Mon 27 Jun 2025; Jess Doyle; 1 item ordered).
- `summer` "Summer Event 2026" (Wed 4 Jun 2026, 9:02am; flag, 1 comment; Leo Tran/Sara Kemp; Recycled Cotton Tote action+crit, Insulated Steel Cup idea, Bamboo Toothbrush Set idea).
- `welcome` "New Starter Welcome Packs" (Thu 15 May 2025, 2:40pm; delivered:true; Priya Nair; 3 items deliver).
(Ver projects-data.js:3-49 para el listado completo.)

### 2.11 Responsive
`@media(max-width:700px)` grid 1 col (l.171); header/crumb sin cambios; `.pmeta` auto-fit se reflowa solo; `.cmt-drawer{width:min(420px,92vw)}`.

## 3. DISTRIBUTOR PROJECTS — `Merchsmith Distributor Projects.html`

### 3.1 Layout (l.179-243)
```
.header (white, pad 12/24, shadow 0 4px 10px -2px rgba(40,44,80,.04))  .brand[data-identity-lockup]  .headtools > button.account: .av "JD" + .acc-nm "Jess Doyle"
.crumbband (bg --periwinkle, texto #fff; pad 13px gutter) .crumb: "Mojo Promotions" › .here "Projects"
main.main (pad 30px gutter 90px)
  h1.ptitle "Projects" (serif 38px/500)
  #kpis.kpis (grid 5 cols gap 12, margin 26 0 20; <=900px 2 cols)
  #fchips.filterchips
  .tools (flex gap10 wrap): .search[icono + input#q placeholder "Search projects, customers or clients…"] | select#fCust "All customers" | select#fAm "All collaborators" | select#fSup "All suppliers" | button#tglAll.fsel "Expand all ▾" (title "Expand or collapse every project's product rows") | span#densSeg.seg.densseg title="Row density" [Compact | Comfortable(on)] | button#fClear.fclear "Clear filters" (hidden salvo filtros)
  #pbulk.pbulk[hidden]: "<b id=pbn>0</b> selected" + botones Pause / Archive / Duplicate / Download PDF (iconos SVG) + .bk-clear "Clear selection"
  .tblwrap > table (min-width 1480px, overflow-x auto) thead + tbody#rows
  #tfoot.tfoot
```
Nota: el h1 NO lleva botón "Create Project" en esta pantalla; el acceso es por sidebar "Create a project".

### 3.2 KPIs `#kpis` (l.437-452)
5 botones `.kpi` (border 1.5px --line-soft, radius 14, pad 15/18; `<b>` serif 30px; `<span>` 12px/700 uppercase muted; polish: sentence-case 13.5px): 
1. **N** "Open projects" (filtro `open`)  2. **N** "Awaiting approval" (status proof)  3. **N** "Order by this week" (`.warn`, número rojo `#c0392b`; filtro `ob`: orderBy < 7 días)  4. **£X** "Open pipeline value" (no togglea, solo fija `open`)  5. **N** "Overdue" (`.warn`; open y deadline < ahora). `.kpi.on`: borde periwinkle-deep, bg tint-peri, ring 1px. Click togglea `filt.kpi`.

### 3.3 Chips de filtro `#fchips` (l.342-388)
Fila 1 (siempre): etiqueta `.fgrp` **"Projects"**; chips `.fchip`: "All <n>", **Live** (activo por defecto), **Paused**, **Archived**, **Urgent** (icono bandera, `.urg`; on = flare); botón `.fchip.ftog` **"More filters"/"Hide filters"** (borde dashed) + `.fbadge` con nº de filtros extra + chevron. Multi-selección: un proyecto cumple si alguno de sus buckets está activo. Buckets: `closed` -> archived; todos items `paused` -> paused; resto live; flag -> también urgent.
Si "More filters" abierto, filas adicionales:
- **"Products"**: All, Idea, In Progress, Ready to order, Ordered, Archived, Urgent (cada una con contador). Mapeo: idea->Idea; quote/proof->In Progress; ordered->Ready to order; prod/delivered->Ordered; item.archived->Archived; item.flag->Urgent.
- sep + **"Order by"**: Overdue (`urg`), Today, Tomorrow, This week. Order-by de item = (item.deliv||project.deadline a las 12:00) − `leadDays(name)` (10+hash%15 días); se ignoran items prod/delivered/paused/archived.
- Fila **"Breakdown"**: áreas Design, Price, Sample, Stock (idx 0-3) + sep + lente: My action, Customer action, Waiting, Setback (`urg`), Done. Lógica `BD_OWN`/`bdActs`/`bdClassify` (l.298-331): clasifica estados por área en done/setback/mine/theirs/wait, determinista por hash del nombre.
Con filtros extra y panel cerrado: fila `.ftokens` "Applied" con tokens `.ftok` ("Order: Overdue", "Design", "My action"...) con × y "Clear all".
Estilo chip: pill 999px (polish radius 8px), 12.5px/700; `.on` bg `--blossom #f0569f` (polish: gris); `.n` contador 11px.

### 3.4 Selects y densidad
`fCust`, `fAm` (colaboradores = lead AM + 2, determinista `collabOf`: roster Jess Doyle, Ben Shaw, Cara Lyon, Sara Malik, Ollie Grant, Nina Torres), `fSup` (suppliers: mapa `SUPPLIER_OF` o hash de `Veloce Print, Lumen Goods, Fjord Textiles, Baltic Promo Works, Orchard & Co`). Densidad `compact` añade `body.dense` (td pad 8/12, avatares 24px) y se cascada a los iframes (`dens`).
"Clear filters" restaura: q, selects, kpi, `activeF={live}`, resto vacío.

### 3.5 Tabla (l.222-241, rowCells l.462-482)
Cabeceras (th 11px/800 uppercase; polish sentence-case): [checkbox selAll] · [chevron col] · Customer(sortable) · Client · Project · Items(num) · Value(num) · Profit(num) · All delivered by · Collaborators · Flag · Comments · Brief · Created · Last activity. Sort por `data-k`: customer, client, name, items, value, profit, delivBy, am, created, last; ciclo asc -> desc -> sin orden (flecha ▲/▼ `.dir`).
Celdas por fila `tr.proj[data-pid][data-cust]`:
- `.selchk[data-sel]` (17px radius 5, on periwinkle) title "Select project".
- `.rowh`: `.pgrip` (6 puntos, title "Drag to re-order") + `button.chevbtn[data-exp]` "›" (gira 90deg al abrir; title "Show project table"/"Hide project table").
- Customer: link a `Merchsmith Projects.html?customer=<enc>` con tile `.clogo` 24px radius 6 (MSSEED.logo o monograma hsl por hash).
- Client: `.cwrap` con `.cav` 24px circular foto (MSAvatar; fuerza foto por sexo si no hay) + nombre.
- Project: `b > a` -> `Merchsmith Project - Autumn Giveaways.html` (autumn) o `?pid=<id>`.
- Items (nº), Value `<b>£12,345</b>` (en-GB, 0 decimales), Profit (verde `--green-deep` 700), All delivered by (`d MMM yyyy`; max deliv de items o deadline).
- Collaborators `.amav`: avatares 28px de `assets/avatars/<file>` (Jess Doyle av1.jpg, Ben Shaw av2.jpg, Cara Lyon av3.jpg, Sara Malik a4.jpg, Ollie Grant a5.jpg, Nina Torres a6.jpg), title "<lista> — <AM> leads", + botón `.addav` "+" (title "Add collaborator", sin acción en prototipo).
- Flag `button.rowact[.flag-on][data-flag]` title "Mark project urgent"/"Urgent — click to clear" (relleno flare si on). Persiste `DPROJ.setFlag`.
- Comments `button.rowact[data-cmt]` title "Project comments" + badge `.cb`. Abre drawer del motor compartido `comments.js` (`window.__openComments`; entidades `window.ordered` l.634-636).
- Brief `button.briefbtn[data-brief]` **"View brief ▾"** (pill; `.on` periwinkle-deep) -> postMessage `{msCmd:'brief'}` al iframe del proyecto (lo expande si hace falta).
- Created = `deadline − 90 días`; Last activity "today"/"yesterday"/"Nd ago".
Fila click (fuera de controles) -> `Merchsmith Projects.html?customer=<cust>`. Hover fila bg tint-peri. Fila seleccionada `.sel` bg tint-peri.
Expandir: segunda fila `tr.plrow > td.plcell[colspan=15] > iframe.plframe` con `src="Merchsmith Project - Autumn Giveaways.html?embed=1&view=list&pid=<id>"` (altura inicial 480, ajustada por `postMessage {msEmbedH}`, mínimo 360, máx 4000). Los filtros Order-by / Breakdown / densidad / supplier se envían al iframe (`msCmd:'obFilter'`). Desde un iframe puede abrirse overlay a pantalla completa (`msOverlay`, z9000, backdrop rgba(22,24,28,.45)+blur 3px; Esc cierra).
Estado vacío: fila `td.empty` **"No projects match these filters."**
Pie `#tfoot`: "<n> project(s) · value £X · profit £Y" (+ " · N selected").
Drag-reorder: arrastrar por el grip (deshabilitado con orden activo; toast "Click the sorted column header until the arrow clears to re-order"); guardado en `ms-dist-proj-order`; toast "Order saved as your default".
Bulk bar: Pause/Resume (alterna `paused` en todos los items; toast "Paused n project(s)"/"Resumed ..."), Archive/Unarchive (`DPROJ.setClosed`; "Archived n project(s)"/"Unarchived ..."), Duplicate (`DPROJ.duplicate`, nombre "<name> (copy)"; "Duplicated n project(s)"), Download PDF (ventana nueva con "Projects summary" + tablas por proyecto y `window.print()`; si bloquea popups: toast "Pop-up blocked — allow pop-ups to download").
Estados de status (DPROJ.LABEL): idea "Idea", quote/proof "In Progress", ordered "Ready to Order", prod "Ordered", delivered "Delivered", closed "Archived". Etapas por item derivadas de áreas design/price/sample/stock (`deriveStage`, dist-projects-data.js:25-33).

### 3.6 Persistencia (localStorage)
`ms-dist-projects` (overrides items/flag/closed + `__new` duplicados), `ms-dist-proj-order`, `ms-dash-state-v4::<pid>` (estado del motor del proyecto), eventos `storage` refrescan celdas.

### 3.7 Datos
14 proyectos / 6 clientes (Citrix 5, Bang & Blossom 2, Fieldstone Brewery 2, Nova Health 2, Arlo & Co 2, Kestrel Finance 2) con client, am, profit, deadline, last, flag, comments, items[n,st,qty,val] (dist-projects-data.js:41-93). Fechas 2026.

## 4. CREATE PROJECT (wizard) — `Merchsmith Create Project.html` + `create-project.js?v=12`

### 4.1 Shell (l.396-592)
Pantalla fija (`.cp{position:fixed;inset:0;flex column}`, `body{overflow:hidden}`). Sidebar (`ms-side`) se mantiene a la izquierda bajo la cabecera: `.cp>.cp-stage{margin-left:68px}`, `.ms-side{top:var(--cpTopH,68px)}` (script l.637 mide `.cp-top`).
```
.cp-top (bg periwinkle-deep; pad 15/34)  .brand[data-identity-lockup] | span#cpDraft.cp-draft "Draft saved" (aparece 1.4s tras autosave, punto verde #7ef0b0) | a.cp-exit href="Merchsmith Projects.html" title="Your progress is saved. Pick it up any time from Your Projects." [icono guardar + "Save & exit"] (pill 38px, bg rgba(255,255,255,.14), borde rgba(255,255,255,.35); hover blanco)
#cpSteps.cp-steps (stepper, max 820, centrado) + #cpProg.cp-prog (3px, relleno periwinkle-deep ancho n/4*100%)
.cp-stage > #cpScroll.cp-scroll > 5 × section.cp-panel[data-step=0..4]  (card: max-width 820, padding 44/52/48, radius 20, margin 28px auto 120px; bg blanco por .cp-panel de components/tema)
#cpFoot.cp-foot (absolute bottom; gradient paper) > .cp-foot-inner(max 820): button#btnBack.btn-ghost "Back" (oculto en paso 1) | spacer | span#cpHint.cp-hint | button#btnNext.btn-primary "Continue" (+flecha) ; en el penúltimo paso el texto es "Review project"; en el último paso el footer se oculta.
```
Stepper: etiquetas `STEPS=['Project','Budget','Brand','Products','Launch']`; `.cp-step.done|active`, `.cp-dot` 30px (activo/hecho bg periwinkle-deep, activo con halo 5px tint-peri + pulso), `.cp-line` conecta (relleno animado .5s). Click en un paso salta a él. `<=760px` se ocultan las etiquetas.
Transición: panel entra con `cpInR` (desde derecha) o `cpInL` (volver), .5s `cubic-bezier(.22,.61,.36,1)`; campos `.rise` con delays .04s..; red de seguridad `.shown` a los 1150ms. Confeti (36 piezas, colores `#ec018c #ff5cb3 #12b76a #f5b041 #0a84c6`) al llegar al paso 5 (no con prefers-reduced-motion).
Teclado: Enter (fuera de input/textarea) avanza.
Paso 1: `#btnNext` deshabilitado y hint **"Give your project a name to continue"** hasta que `#fName` tenga texto.

### 4.2 Paso 1 — Project (data-step 0)
Eyebrow **"New project"**; h1 **"Let's start your project."**; sub "Give it a name and tell us what it's for. This becomes the brief your account manager and production team work from."
Campos: `#fName` (label "Project name", `.in-xl` serif 30px, placeholder "e.g. Autumn Giveaways"); `#fUse` (label "What's it for?", placeholder "e.g. Exhibition · NEC"); `#fDesc` textarea (label "Describe the campaign" + `.opt` "— the story, the vibe, the goal"; placeholder "What are you trying to achieve? Who's it for? Any themes, materials or must-haves…").

### 4.3 Paso 2 — Budget & timing (data-step 1)
Eyebrow **"Budget & timing"**; h1 **"The shape of the order."**; sub "Set your overall budget and when you need it. You can fine-tune any of this per product later."
- Fila 2 columnas: **"Total budget"** (`.in-money` "£" + `#fBudget` number step 50, placeholder "5,000"; hint "Excluding VAT, across every product.") | **"Expected quantity" + opt "per item"** (`#fQty`, height 62, placeholder "500"; hint "A ballpark is fine. Prices change with quantity.").
- **"Delivery date"**: `#fDate` date + `#fMode` seg [**No-fail date** (nofail) | **Approximate** (approx)]; hint "Can’t move, like an event? Choose No-fail and we’ll plan production around it."
- **"Ships to"** `#fCountry` seg [United Kingdom | Ireland (ROI) | France] (valores 0,1,2); hint "Sets delivery costs and lead times. You can add more addresses at checkout."
- `#cpTerms` (script l.602-616): **"Your payment terms"**: pill con `MSCUSTACCT.get('citrix').terms` (o "Not set"); si pago por adelantado: nota "Payment is taken when you place an order."; si hay límite de crédito y no es upfront: tarjeta `.pt-card` Credit limit / Used / Available (£), barra (usado gris + presupuesto×1.2 en periwinkle, rojo `#d92d20` si excede disponible), leyenda "Used" / "This budget (inc. VAT) £X", nota: "Orders up to your available credit can be placed on account." o, si excede, "This budget is more than your available credit. You can still go ahead: pay part by card at checkout, or ask your account manager about a higher limit."; sin crédito: "No credit account set up. You’ll pay by card when you place an order."; pie "Set by Mojo Promotions. Ask your account manager if you need to change them." Se redibuja al teclear presupuesto.

### 4.4 Paso 3 — Brand & finish (data-step 2)
Eyebrow **"Brand & finish"**; h1 **"How it should look."**; sub "Your brand defaults. They apply to every product, and you can change them for any item later."
5 tarjetas `.bz` (icono 42px tint-peri + h3 17px/800 + p 13.5px + badge `.bz-n` 1-5):
1. **"Product colours"** — "The general colours you have in mind for the products themselves. Your account manager refines these when sourcing." Chips `#fPcol` (multi): Black, White, Grey, Navy, Blue, Teal, Green, Red, Orange, Yellow, Pink, Purple, Brown, Natural (hex en `PCHEX`, create-project.js:14).
2. **"Branding"** + link "Edit brand colours" (`Merchsmith Brand Assets.html#cat=colours`, `_blank`) — "How your logo is printed. Spot colours match your brand Pantones; mono is a single colour; full colour suits photos and gradients." `#fBmode` seg [Spot colours (defecto) | Mono | Full colour | Unbranded] + `#fBcol`: spot -> chips con Pantone (Black `Black 6 C` #1A1A1E, Sea Blue `2727 C` #2F5CA8, Summer Green `344 C` #6FC5A6, White `11-0601` #FFFFFF, Relaxed Pink `2346 C` #E2A9AC); mono -> "Mono — one colour" / "Single-colour application, no ink colour added" + nota "Choose Mono for laser-engraved or embossed products, where no colour is added to the branding."; full -> "Full-colour (CMYK / digital) print — artwork reproduced in full colour, no spot-colour selection needed."; none -> "Unbranded — products supplied plain, with no decoration."
3. **"Logotypes"** + link "Edit logos" (`...#cat=logos`) — "Pick the logo versions we can use. We’ll choose the best one for each product colour." `#fLogos` grid 3 cols (1 col <=620): tarjetas "Black on white" (#1A1A1E/#FFF), "White on black" (#FFF/#1A1A1E), "White on blue" (#FFF/#2F5CA8) con meta "EPS · SVG · PNG"/"EPS · SVG · PNG"/"EPS · PNG", miniatura 64x44 con wordmark "citrix" serif itálica; + tarjeta **"No logo yet"** / "Product-specific artwork chosen later". Por defecto seleccionados l-black y l-white. (El tick está oculto por CSS #fLogos; el estado `.on` = borde + ring periwinkle-deep.)
4. **"Samples"** + `#fSampWho`: distribuidor "set by you" / cliente "set by your Account Manager" — "See and feel the product before you order. A branded sample shows your logo printed; unbranded is quicker." Distribuidor: `#fSampReq` [Required(on)|Not needed] + `#fSampType` [Branded|Unbranded(on)] (se atenúa si Not needed). Cliente: solo lectura `.samp-read`: "<Branded sample|Unbranded sample|Not required>" + "Your distributor confirms sampling during sourcing". Rol = `MSID.current()==='distributor'`.
5. **"Branding notes" + opt "optional"** — "Anything the studio should know: where the logo should go, sizes, colours to avoid, brand guidelines. It’s added to your Project Brief." `#fBNotes` textarea 4 filas placeholder "Logo centred on the front, no larger than 80mm. Avoid red."

### 4.5 Paso 4 — Products (data-step 3)
Eyebrow **"The shopping list"**; h1 **"What do you need?"**; sub "Describe the types of product you're after, or pick exact products from the store. Add a rough quantity and target price for each."
- `#fItems.items`: cada `.itemwrap[data-id]` = `.item` grid `1fr 88px 104px 36px 36px`: nombre (`input.iname` placeholder "Product type, e.g. Recycled tote", serif 17px) o, si producto exacto, `.iprod` (miniatura `assets/products/<img>.png`, nombre, "<REF> · <supplier>", botón "Change"); qty (number step 25); `.unitwrap` "£ [unit] /u" (step .05, 2 decimales); botón `.icust` (engranaje, title/aria "Product settings"); botón `.idel` "×" (title "Remove"). Debajo `.itemstatus`: etiquetas `.ic-tag` de overrides (colour, "<n> spot|Mono|Full colour|Unbranded", "<n> logo(s)", "Sample"/"No sample", fecha, país, "Positions", "<n> artwork", "Note") o **"Inherits project defaults"**.
- Panel de personalización `.itemcustom` (se abre con engranaje; `S.openItems`): grid 2 col: **Product colour** (chips xs; heredados con borde dashed; texto "Overridden"/"Inheriting project colours"), **Delivery date** (date; "Overridden"/"Default · <fecha>"), **Ships to** (select "Default · <país|not set>" + países), **Sample** (dist: seg [Default|Branded|Unbranded|No sample]; cliente: `.samp-read.sm` "<efectivo>" + "Set by your Account Manager"); luego **Branding** (seg Spot/Mono/Full/None + chips Pantone, atenuados si full/none), **Logotypes** (miniaturas 46px; "Overridden"/"Inheriting project logos"), **Product artwork** + `.ic-deflbl` "from Brand Assets" (tarjetas `artcard` por artwork cuyo `general` coincide con la categoría o `specific` con el tipo; semilla: "Citrix logo — white" .eps·.pdf [Tech], "Anniversary lockup" .ai·.pdf [Bags], "Event wordmark" .svg·.png [Bags, Apparel, Notebooks]; lee `ms-brand-assets.artwork` si existe; vacío: "No artwork tagged for <cat> yet — add it in Brand Assets & tag this category."), **Branding positions** (input placeholder "Default · <fPos>"), **Notes for this product** (textarea placeholder "Finish, packaging, special requests…"), botón "Reset to project defaults" si hay overrides.
- Modo de alta `#fAddMode` (role group, aria-label "How to add a product"): [**Describe product type** (on) | **Choose exact product**]. "Describe": botón `#fAddItem` **"Add an item"** (borde dashed; crea item `{type:'', qty: fQty||500, unit:1.00}` y enfoca el nombre). "Exact": `#fFind` con input `#fFindQ` placeholder "Search the whole store by product name or reference" (aria "Search the store") y resultados `#fFindR` (máx 8, de `STORE.products` store-feed.js: miniatura, nombre, "<REF> · <supplier>[ · MOQ n]", "from £x.xx", botón "Add" -> "Added ✓" 1.2s); sin resultados: "No products match “<q>”."; qty = max(moq, fQty||500), unit = priceGuide.
- `#fRunbar`: izquierda "**£X** across N item(s)" (£0 across 0 items); derecha "£Y left of £B" o `.over-txt` "£Z over £B"; barra `#fRunFill` (periwinkle-deep; rojo flare si excede).

### 4.6 Paso 5 — Launch (data-step 4; footer oculto)
- Finale: círculo 88px tint-green con check animado; h1 `#revTitle` **“<name>” is ready.** (36px; sin nombre: “Untitled project”); sub "Here's your brief. Next, find real products in the store for each item you listed."
- `#rvBudgetBar.rev-budget`: "**£X** allocated · N item(s)" / "£Y left of £B" o over.
- `.rev-grid` (3 col; 1 col <=900): **Campaign** (descripción 4 líneas máx o "No description added."; For; Total budget "Not set" si vacío), **Delivery & sourcing** (Delivery "<Ddd 12th Mon> · no-fail|approx"; Ships to; Expected qty "<n> / item"; Sample "<label>" + " · set by AM" si cliente), **Brand defaults** (Product colours chips o "Not set"; Branding "Full colour|Unbranded|Mono — one colour|<n> spot colour(s)"; Brand colours chips con Pantone / "n/a"; Logotypes miniaturas o "None — artwork chosen later").
- Card **"Requested items · N[ · M customised]"**: líneas "<tipo> <cat> ... <qty> × £unit = £total" + tags.
- **"What happens next"** lista numerada: 1 "Talk to your account manager" — "Book a call or chat to share goals, timings and anything the brief doesn’t cover. Contact options below"; 2 "Source products" — "Find a store product for each item, and compare a few against one line."; 3 "Refine the details" — "Colours, branding and samples are finalised with your account manager."; 4 "Approve & order" — "Sign off designs, pricing and samples, then place the order."; 5 "Delivered" — "Track production and delivery right through to your door."
- **"Let’s talk"** (`#cpTalk`, script l.617-636): icono chat, h3 "Let’s talk", p "Collaborate with your account manager to get this project underway. They’ll help shortlist products, check timings and pricing."; selector de contacto (pills con avatar; el primero lleva " · your account manager") si hay >1; tarjeta con avatar 56px, nombre, "<título|Account Manager> · Mojo Promotions", tel/email; botones **"Book a meeting"** (primario; -> `Merchsmith Calendar.html#tab=cal&with=<id>`), **"Chat"** (`MSChat.chatWith` o `Merchsmith Chats.html`), **"Call"** (`tel:` si hay teléfono). Se oculta si no hay contactos (`MSAM`).
- CTAs: `#ctaFind` **"Find products in the store"** (+flecha; persiste y navega a `Merchsmith Store.html#dept=<dept del primer item>`; sin items -> `Merchsmith Store.html`; guarda `ms-brief-pending {project:'autumn',itemId}`) y `#ctaOpen` **"Open project settings"** (persiste y va a `Merchsmith Project - Autumn Giveaways.html`). `CAT_DEPT`: Pens writing, Bags bags, Drinkware drinkware, Apparel clothing, Notebooks notebooks, Tech tech, Eco lifestyle, Events exhibition.

### 4.7 Borrador y salida
- Autosave debounced 350ms a `ms-project-draft` (`{v:1,step,name,use,desc,budget,qty,date,pos,bnotes,mode,country,bmode,sampReq,sampType,pcol[],bcol[],logos[],items[]}`); indicador "Draft saved". También en `beforeunload`. `?new=1` ignora el borrador y limpia la query.
- Diálogo de salida (captura clics en enlaces `<a href>` fuera de `.cp`, p. ej. sidebar): `.cp-leave` modal 440px: icono guardar, h3 **"Leave project setup?"**, p "We’ll save **<nombre|your project>** as a draft in Your Projects, so you can pick it up where you left off.", botones "Cancel" y "Save draft & continue" (primario); Esc/clic fuera cierran.
- `persist()` (l.297-311) escribe `ms-project-brief[autumn] = {campaign:{description,merchUse,budget,attachments:[]}, defaults:{delivery:{iso,mode},country,productColours,brandMode,brandColours,customColours:[],positions,brandNotes,logos,sample:{required,type},sustainabilityMin:6,expectedQty(def 1000)}, items:[{id,type,cat,qty,unit,over?,notes?,artwork?}]}` y `ms-project-title`; limpia el borrador (`launched=true`).

### 4.8 Responsive
`<=760px` oculta etiquetas del stepper; `<=720px` panel padding 28/22, margin 4/12/100; `<=620px` `.row2`, `.logos`, `.ic-art`, `.ic-grid` a 1 columna, `.item` a 2 columnas con nombre a ancho completo; `<=900px` `.rev-grid` 1 columna; `<=720px` `.lt-card` 2 columnas. Botón footer: height 48, radius 12, 15px/700; primario shadow `0 4px 14px color-mix(periwinkle-deep 35%, transparent)`.

## Solo prototipo / fuera de alcance
- Toda la persistencia es localStorage (`ms-project-draft(s)`, `ms-proj-archived`, `ms-proj-team`, `ms-dist-projects`, `ms-dist-proj-order`, `ms-project-brief`, `ms-project-title`, `ms-brief-pending`); en el sistema real = API/DB existente (no crear tablas/columnas).
- Datos semilla fijos (`PROJECTS`, `DPROJ`); fechas order-by demo con hash; breakdown (Design/Price/Sample/Stock) determinista por hash del nombre (no refleja estado real).
- Tabla maestra: iframe con el motor del proyecto + `postMessage` (arquitectura de prototipo); en real, filas expandibles con datos propios.
- Todos los clics a proyecto abren siempre "Autumn Giveaways"; flag de tarjeta cliente no persiste; botón "+" de colaboradores de la tabla maestra no hace nada; descarga PDF = ventana `window.print()`.
- Contactos "Let's talk" (MSAM/MSChat), términos de pago (`MSCUSTACCT`), catálogo (`STORE`), artwork (`ms-brand-assets`), avatares (assets) dependen de otros módulos del prototipo.
- Sin IA, email ni servicios externos en estas pantallas.

## Changelog reciente relevante
- Oct 2026 (HANDOVER.md:9-11): Create project abre `?new=1` y siempre comienza en paso 1; confirmación si hay borrador (se aparca en `ms-project-drafts`, máx 10); Your Projects muestra borradores como tarjetas dashed "Draft" con "Continue setup" y borrar.
- Oct 2026 (HANDOVER.md:566-567): Your projects refresh — tarjetas a todo el ancho máx 3 por fila, estado de items con puntos de color, tiles de resumen con iconos (filtran), iconos de búsqueda/orden/selección/filtro renovados; enlace "View All Products" (página `Merchsmith All Products.html`, fuera de esta ficha).
- 2026-09-30 (Developer Index l.161): Distributor Projects — "Show all products" renombrado a Expand all / Collapse all; filas expandidas siempre en vista lista.
- 2026-09-20 (Developer Index l.183-184): Projects cliente a ancho completo (antes capado 1080–1320px).
- Sep 2026: ui-polish v45+ aplica estilos a phead/pmeta/filterbar/pcard, Create Project, etc. (HANDOVER.md:13).
- 2026-07-23 y anteriores (Developer Index l.161-170): columnas Delivery/Order by rediseñadas, tiles logo/avatar de Customer/Client (07-09), filtros "More filters" con tokens (07-09), sistema de filtros reconstruido (07-07), Client+Collaborators+densidad+drawer de comentarios (07-06), acciones de fila + bulk bar + drag-reorder (07-04), página creada (07-02). Create Project: build inicial 2026-06-18.
- Nota: la columna Status y las columnas Delivery/Order-by del changelog ya no existen en la tabla actual (Deadline/Next-order-by retirados; ver `<thead>` l.223-239).
