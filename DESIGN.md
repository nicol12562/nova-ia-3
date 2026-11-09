---
name: Nova IA
description: Asistente de IA en español rioplatense. Mundo visual "El resumen de cuenta" en las superficies de tarea; el sistema zinc + azul #004de5 sigue vigente en las superficies de persuasión.

colors:
  # ---- capa ledger (:root / body.dark en src/ledger.css) ----
  papel: "#f4f1e8"
  papel-dark: "#141a19"
  ink: "#16211f"
  ink-dark: "#e9e6df"
  ink-2: "#4c5a57"
  ink-2-dark: "#a9b3b0"
  rail: "#0f3b3a"
  rail-dark: "#0a2b2a"
  rail-ink: "#dcece6"
  rail-dim: "#9dc0b8"
  rail-dim-dark: "#85a9a2"
  rule: "#d9d2c1"
  rule-dark: "#2b3634"
  amount: "#175c42"
  amount-dark: "#7fd0a6"
  alert: "#b3261e"
  alert-dark: "#ff8778"
  field: "#fffdf7"
  field-dark: "#1a2120"
  rail-hover: "rgba(220, 236, 230, 0.09)"
  rail-active: "rgba(220, 236, 230, 0.14)"
  rail-button-hover: "rgba(220, 236, 230, 0.12)"
  rail-foot-rule: "rgba(220, 236, 230, 0.18)"
  rail-active-ink: "#ffffff"
  primary-hover: "#14504e"
  suggestion-hover: "rgba(15, 59, 58, 0.05)"
  selection-ledger: "rgba(15, 59, 58, 0.18)"

  # ---- capa incumbente (src/styles.css :root y body.dark) ----
  accent: "#004de5"
  accent-dark: "#4d8bff"
  accent-solid-dark: "#1f5fd6"
  accent-soft: "#e7eefd"
  zinc-text: "#09090b"
  zinc-text-dark: "#fafafa"
  zinc-surface: "#f4f4f5"
  zinc-surface-dark: "#18181b"
  zinc-border: "#e4e4e7"
  zinc-border-dark: "#27272a"
  zinc-muted: "#71717a"
  zinc-muted-dark: "#a1a1aa"
  danger: "#b3261e"
  danger-dark: "#ff6b61"

typography:
  # No hay una escala tipográfica formal: son valores literales por selector.
  display:
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    fontSize: "clamp(36px, 4.6vw, 56px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    fontSize: "27px"
    fontWeight: 600
    letterSpacing: "-0.3px"
  account-figure:
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    fontSize: "44px"
    fontWeight: 650
    lineHeight: 1
  body:
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    fontSize: "16px"
    lineHeight: 1.5
  label-caps:
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.04em"
  mono:
    fontFamily: 'ui-monospace, "Cascadia Code", "SF Mono", Consolas, monospace'
    fontSize: "10.5px"
    letterSpacing: "0.08em"

rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"

components:
  rail-button:
    backgroundColor: "transparent"
    textColor: "{colors.rail-dim}"
    rounded: "{rounded.md}"
    padding: "9px 2px 8px"
  rail-button-hover:
    backgroundColor: "{colors.rail-hover}"
    textColor: "{colors.rail-ink}"
  rail-button-current:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.rail-active-ink}"
  primary-button-app:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
  primary-button-app-hover:
    backgroundColor: "{colors.primary-hover}"
  composer-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "18px 18px 12px"
  guest-banner-app:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  posting-line:
    textColor: "{colors.ink-2}"
  posting-charge:
    textColor: "{colors.amount}"
  account-column:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.ink}"
    width: "320px"
    padding: "20px 18px"
  due-band:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    padding: "9px 20px"
  suggestion-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "11px 2px"
  suggestion-row-hover:
    backgroundColor: "{colors.suggestion-hover}"
  bubble-user-app:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  bubble-ai-app:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Design System: Nova IA

## Overview

**Creative North Star: "El resumen de cuenta"**

Este archivo describe lo que está construido, no lo que se planeó. Hay dos mundos visuales conviviendo en el mismo bundle, y la frontera está en el enrutado, no en los componentes.

El mundo **ledger** (`src/ledger.css`) viste las superficies de tarea: `SUPERFICIE_APP = ["chat", "historial", "mini-agentes", "uso-tokens", "ajustes", "admin"]` (`src/App.jsx:47`). Sobre esas rutas el shell es un riel teal de 108px + campo de lectura color papel + columna de cuenta, con cifras tabulares alineadas a la derecha.

El mundo **incumbente** (`src/styles.css` + `src/polish.css`, zinc + azul `#004de5`) sigue gobernando Inicio, Planes y Login: conservan la barra superior de 60px con `backdrop-filter`, el héroe en azul y el `eyebrow` numerado. No es una degradación provisional documentada como pendiente: es el estado actual del código.

La frontera además es porosa. Las seis superficies de tarea reciben el shell ledger, pero **el interior de cinco de ellas (Historial, Agentes, Uso, Ajustes, Admin) nunca fue re-vestido**: siguen usando `.eyebrow`, `.hero`, `.card`, `.grid-cards`, `.lede`, `.settings-card` del sistema anterior, con `--accent` azul sobre fondo papel. Solo Chat fue convertido por dentro. El resultado observable es riel teal + encabezado con `05 · TU CUENTA` en azul `#004de5` sobre `#f4f1e8`.

**Key Characteristics:**

- Carga en cascada de tres hojas, con orden fijo (`src/main.jsx:4-6`).
- Riel teal oscuro como única superficie de estructura; papel como campo de lectura.
- El dato manda: la cifra de saldo es lo más grande de la pantalla (44px), más que cualquier título.
- Filete de 1px por arriba de cualquier otra jerarquía visual; sin tarjetas anidadas, sin glass, sin degradados en la capa ledger.
- Rojo reservado a un solo significado: modelo agotado.
- Todo número es tabular. Sin excepción en la capa ledger.
- El incumbente sigue entrando dentro del shell: `--danger` en `.mc-warn`, el grano de `body::before`, y el interior completo de cinco páginas de app.

### The Last Layer Rule

**`ledger.css` se carga al final y es la capa que decide el shell de la app.** `main.jsx` importa en este orden: `styles.css` → `polish.css` → `ledger.css`. Ante igual especificidad, gana la última. Por eso `ledger.css` está lleno de reglas `.app-lg …` que no crean nada, sino que deshacen lo que las dos hojas anteriores ya habían puesto: `box-shadow: none`, `background-image: none`, `min-width: 0`.

Regla práctica para quien edite acá: **dentro del shell de app, una propiedad que parezca no tener efecto casi seguro está siendo pisada por una regla posterior en otra hoja.** Antes de agregar una regla, buscar el mismo selector en las tres hojas.

### The Two-World Rule

Hay dos sistemas de nombre en el CSS y no se traducen entre sí. `--lg-*` (ledger) y `--bg / --panel / --surface / --border / --text / --muted / --accent / --danger` (incumbente). Son valores distintos para roles parecidos: el borde ledger es `#d9d2c1` (cálido), el incumbente `#e4e4e7` (frío); el texto ledger es `#16211f` (verdoso), el incumbente `#09090b` (neutro). En oscuro los rojos divergen: `--lg-alert` es `#ff8778`, `--danger` es `#ff6b61`. Un componente del interior de una página de app puede mostrar los dos a la vez.

## Colors

La capa ledger tiene una paleta de 11 tokens propios con set completo en claro y en oscuro; el sistema incumbente tiene 12 con aliases históricos. Ninguna de las dos define una rampa: no existe en el código un `--lg-rule-2` ni equivalentes. Los valores que siguen son los literales declarados.

### Primary (ledger)

- **Ledger Green / verde libro** (`--lg-amount`, `#175c42` claro / `#7fd0a6` oscuro): toda cifra que **es** saldo o descuento. Cinco reglas lo usan en `ledger.css` (seis `var()`): `.saldo-hero`, `.movimientos .m-cargo`, `.asiento .a-cargo`, y dos reglas distintas que ambas apuntan al punto del selector de modelo (`.app-lg .spark` en la línea 370, y el par `.app-lg .model-chip .spark, .app-lg .spark` en la 392). No tiñe el restante de cada bolsa: `.bolsas .b-rest` hereda `--lg-ink`. Es el color de la promesa de producto: "que se vea cuánto queda".
- **Rail Teal / verde estructura** (`--lg-rail`, `#0f3b3a` / `#0a2b2a`): superficie del riel, fondo del botón primario y del `send-btn` dentro de app, y la burbuja del usuario. No es un acento decorativo: es el color de la estructura. Su hover es un teal más claro hardcodeado, `#14504e` (`ledger.css:316`). Con `#ffffff` del estado activo, son los dos únicos hex literales fuera de los bloques de tokens.

### Tertiary (ledger)

- **Alert Red / rojo de modelo agotado** (`--lg-alert`, `#b3261e` / `#ff8778`): reservado a un solo estado. Ver "The Reserved Red Rule" abajo: en el build efectivo solo `.bolsas .b-vacia` ("agotado") lo muestra.

### Neutral (ledger)

- **Papel** (`--lg-papel`, `#f4f1e8` / `#141a19`): fondo de toda la superficie de lectura. Se aplica tres veces por redundancia deliberada — `body.app-cuenta`, `.app-lg`, y `.app-lg .content/.main-chat/.chat` (`ledger.css:285-289`) — porque el comentario de esas líneas registra que sin eso la pantalla quedaba "con riel y cuenta en teal/papel y el centro vestido con el zinc+azul anterior: dos mundos en una captura".
- **Campo / field** (`--lg-field`, `#fffdf7` / `#1a2120`): el fondo donde se escribe o se selecciona. composer, `select` del chip de modelo, `agent-chip`, `guest-bar`.
- **Ink** (`--lg-ink`, `#16211f` / `#e9e6df`) y **Ink-2** (`--lg-ink-2`, `#4c5a57` / `#a9b3b0`): texto y texto secundario. `--lg-ink-2` es el token más usado del archivo (13 `var()`), porque toda la tipografía de apoyo del ledger es secundaria.
- **Rule / filete** (`--lg-rule`, `#d9d2c1` / `#2b3634`): el segundo token más usado (18 `var()`). Separadores de renglones, bordes de campo, `border-top` del asiento, `border-left` de la columna de cuenta.
- **Rail Ink** (`--lg-rail-ink`, `#dcece6` en ambos temas) y **Rail Dim** (`--lg-rail-dim`, `#9dc0b8` / `#85a9a2`): texto sobre teal. `rail-ink` es idéntico en claro y oscuro — el riel no cambia de tema.
- **Band** (`--lg-band`, igual que `--lg-rail` en los dos temas): token separado a propósito, con el mismo valor, para que la banda de vencimiento pueda divergir del riel sin romper nada. Hoy no diverge.

### El mundo incumbente (persuasión, y cuatro filtraciones)

- **Accent Blue** (`--accent`, `#004de5` claro / `#4d8bff` oscuro; `--accent-solid`, `#004de5` / `#1f5fd6`): rige Inicio, Planes, Login y el 100% del interior no re-vestido de las páginas de app. `styles.css:1-3` todavía describe este color como "acento ultraviolet"; el comentario está desactualizado respecto del valor.
- **Danger** (`--danger`, `#b3261e` / `#ff6b61`): en claro coincide con `--lg-alert`; en oscuro es un rojo distinto y convive con él.
- **Zinc**: `--bg` `#ffffff`/`#09090b`, `--panel` `#ffffff`/`#0c0c0e`, `--surface` `#f4f4f5`/`#18181b`, `--border` `#e4e4e7`/`#27272a`, `--border-strong` `#d4d4d8`/`#3f3f46`, `--text` `#09090b`/`#fafafa`, `--muted` `#71717a`/`#a1a1aa`.
- **Aliases históricos** (`--cream`, `--dark`, `--accent-deep`, `--green-bg`, `--green-text`, `--orange-border`, `--orange-text`): declarados en `styles.css:32-38` y re-declarados en `body.dark:66-72` solo porque un `var()` definido en `:root` resuelve siempre contra `:root` y queda sordo al tema. `--orange-text` es literalmente `--danger`; `.guest-bar .tag` lo usaba en claro.

### The Reserved Red Rule

**El rojo significa una sola cosa: modelo sin stock.** `ledger.css:109-110` lo declara y lo justifica con una medición: usado en `.rail-aviso`, ese rojo sobre el riel teal daba **1,88:1**, y "un aviso de cuenta no es un error". Por eso `.rail-aviso` se borde con `--lg-rail-dim`.

En el build la reserva se sostiene, pero por tres razones distintas, y hay que saber cuáles:

- `.bolsas .b-vacia` → `--lg-alert`. **Vivo.** Es el "agotado" de una bolsa de modelo (`Chat.jsx:750`).
- `.movimientos .m-vacia` → definido en rojo (`ledger.css:202`) y **neutralizado** por `.app-lg .movimientos .m-vacia { color: var(--lg-ink-2) }` (`ledger.css:304`, mayor especificidad). Un renglón con cargo 0 no es una alerta.
- `.asiento .a-vacia` (`ledger.css:221`) → **CSS muerto.** `Chat.jsx:535` solo emite `a-cargo` o `a-neutro`; nunca `a-vacia`.

### The Four Leaks Rule

Cuatro reglas del mundo azul siguen tocando las superficies ledger. `ledger.css` las neutraliza dentro de `.app-lg` y nada las toca fuera:

| Fuga | Fuera de `.app-lg` | Dentro de `.app-lg` |
|---|---|---|
| Punto del chip de modelo | `.model-chip .spark` → `var(--accent)` (`styles.css:641`, `1798`) | `background/color: var(--lg-amount)` (`ledger.css:391-392`) |
| Anillo de foco | `outline: 2px solid var(--accent)` + `offset 2px` (`polish.css:28-31`) | solo cambia el color: `outline-color: var(--lg-rail)` (`ledger.css:371`). Grosor y offset quedan azules en forma, teal en color |
| Selección de texto | `color-mix(in srgb, var(--accent) 22%, transparent)` (`polish.css:32-34`) | `rgba(15, 59, 58, 0.18)` (`ledger.css:372`) |
| Grano cinematográfico | `body::before`, `opacity: 0.022`, `mix-blend-mode: multiply`, `z-index: 90`, noise SVG en data-URI (`polish.css:37-50`) | **sin neutralizar.** El grano sigue cubriendo el riel, la banda y la columna de cuenta |

A eso se suma una quinta, sin cubrir: `.model-chip .mc-warn { color: var(--danger) }` (`styles.css:1554`), el aviso de consumo ≥80% (`Chat.jsx:649-653`). `ledger.css` no lo re-define, así que dentro del chat de app el icono de alerta sale con `--danger` (`#b3261e` claro / `#ff6b61` oscuro), no con `--lg-alert`. En oscuro hay dos rojos distintos en la misma pantalla.

## Typography

**Display / Body Font:** Inter, con `"Segoe UI", system-ui, sans-serif` de fallback (`--sans` y `--display`, `styles.css:25-26`). `--display` es Inter: el comentario en la misma línea dice "Launch UI no usa serif en titulares".
**Mono Font:** `ui-monospace, "Cascadia Code", "SF Mono", Consolas, monospace` (`--mono`, `polish.css:19`).
**Serif:** Fraunces (`--serif`, `styles.css:27`) declarada "solo para el monograma de la marca". En el build se usa en **exactamente dos elementos**: `.logo-mark` (la "n" del riel y de la barra, 19px/600) y `.msg-ava.mono` (el avatar de Nova, 15px/600). La tarea pendiente #25 ("Aplicar Fraunces al héroe y a los títulos de sección") no está hecha.

**Character:** no hay una escala tipográfica. No existe `--font-size-*`, no hay rampa, no hay un `text-scale` en ningún archivo. Lo que hay son valores literales por selector, y la capa ledger usa sobre todo tallas chicas con peso 600: la jerarquía se hace por **tamaño de la cifra y por color**, no por un escalón tipográfico.

### Valores reales en uso, capa ledger

Todos son literales de `ledger.css`. El peso 600 es el único reiterado: aparece en diez reglas.

- **`.saldo-hero`** — 44px / 650 / `line-height: 1` / `--lg-amount`. La cifra grande de la columna de cuenta. **650 no está cargado**: Google Fonts pide `Inter:wght@400;500;600;700` (`index.html:28`), así que el navegador resuelve 650 al 700 más cercano. El 650 del código es un peso que el sitio no tiene.
- **Responsive del héroe**: 44px → 36px (`max-width: 1279px`) → 32px (`max-width: 640px`).
- **`.banda-venc`** — 13px, `<b>` y `.bv-cifra` en 600.
- **`.cuenta h2`** — 12px / 600 / `letter-spacing: 0.04em` / `text-transform: uppercase` / `--lg-ink-2`, `margin: 22px 0 8px`. Son las etiquetas del libro ("Saldo del mes", "Bolsas por modelo", "Movimientos").
- **`.saldo-sub`** — 12.5px / `--lg-ink-2`.
- **`.bolsas li`** — 13px, con `.b-up` (el upstream) en 11px secundario y `.b-rest` en 600.
- **`.movimientos`** — tabla 12.5px; `th` 11px / 600 / `0.03em` / uppercase.
- **`.asiento`** — 12.5px / `--lg-ink-2`, `.a-cargo` en 600 verde.
- **`.sugerencia .sg-t`** — 14px / 600 (lo más grande del ledger después del héroe). **`.sg-d`** — 13.5px.
- **`.rail-btn`** — 11.5px / `line-height: 1.15`, 600 en el estado `aria-current`.
- **`.rail-word`** — 12px / 600 / `-0.01em`. **`.rail-saldo`** — 12px / 600. **`.rail-foot`** — 11.5px. **`.rail-aviso`** — 10.5px. **10.5px es lo más chico del sistema.**
- **`.guest-bar .tag`** ("SIN SESIÓN") — `--mono`, 10.5px, `0.08em`, uppercase. La capa ledger le cambia el color pero no la familia: dentro del mundo ledger todavía hay tipografía monoespaciada.

### Valores del incumbente que siguen visibles dentro del shell

- **`h1.hero`** — dos definiciones; gana `polish.css:257` con `clamp(36px, 4.6vw, 56px)` (600, `1.25`, `-0.02em`) sobre la de `styles.css:398` `clamp(30px, 4vw, 40px)`. Historial, Agentes, Uso, Ajustes y Admin lo usan dentro de `.app-lg`, sin override.
- **`.section-h2`** — 21px/700 en `styles.css:450`, 27px/600/`-0.3px` en `polish.css:260`. Gana el segundo.
- **`.lede`** — 15.5px / `--muted` / `max-width: 620px`.
- **`.stat-num`** — `38px !important` / 600 (`polish.css:1089`), en Uso y Admin. Es una cifra grande de la app que **no** es tabular ni verde libro: es `--text` zinc.
- **`.msg-bubble`** — 14.5px (`polish.css:687`); el cuerpo de la respuesta hereda `line-height: 1.65` de `.md` (`polish.css:706`).
- **`.eyebrow`** — 11.5px / 700 / `letter-spacing: 0.16em` / `color: var(--accent)`. Azul. Vive dentro del shell en cinco páginas de app y en los dos modales de Chat.

### The Right Column Rule

**Toda cifra va alineada a la derecha y en la misma columna, siempre.** `.movimientos td:not(:first-child) { text-align: right }`, `.movimientos th { text-align: right }` con la primera columna a la izquierda, `.bolsas` es un `grid` de `minmax(0,1fr) auto` donde el importe es el `auto`. La única cifra alineada a la izquierda del sistema es `.saldo-hero`, y es un titular, no un dato tabular.

## Layout

**Sin escala de espaciado.** No hay `--spacing-*` en ningún archivo. El espaciado es literal, por componente. `ledger.css` usa catorce valores distintos en padding, margin y gap: **2, 4, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20 y 22px** (más `0` para resetear). Los más frecuentes son 8px y 12px (ocho apariciones cada uno), 6px (siete), 10px (seis), 4px (cinco), 2px y 14px (cuatro cada uno), 9px (tres). No hay ninguna regularidad de 4px ni de 8px: 7, 9, 11, 16, 18 y 22 existen porque le sobraron al autor de cada regla. No intentar reducir esto a una escala; anotar el valor que hace falta.

**Grid del shell** (`ledger.css:40-46`): `grid-template-columns: 108px minmax(0, 1fr)` sobre `.app-lg`, `min-height: 100vh`. El riel es `position: sticky; top: 0; align-self: start; height: 100dvh`, con `grid-column: 1`. `.content` ocupa `grid-column: 2`. **El contrato de dirección pedía un riel de 104px; el código tiene 108px.** Es el único número del FIRST VIEWPORT del contrato que cambió sin consecuencia aparente.

**Tres columnas dentro del chat** (`Chat.jsx:461-780` + `ledger.css:142-160`): `.chat-lg` es flex; el `<section class="chat">` es `flex: 1 1 auto` pero está topado por `.chat { max-width: 780px; margin: 0 auto }` de `styles.css:1103`, que la capa ledger no pisa. La `<aside class="cuenta">` es `flex: none; width: 320px; border-left: 1px solid var(--lg-rule); padding: 20px 18px` con `overflow-y: auto` y `overscroll-behavior: contain`.

**El tope de 1220px sigue vivo.** `.main { max-width: 1220px; margin: 0 auto; padding: 36px 44px 48px }` (`styles.css:79`) no está overrideado; `.main-chat` le pisa el padding a `0 24px` (`styles.css:1090-1095`). En una ventana de 1440px: riel 108 + content 1332, y adentro el bloque de app se centra a 1220. La columna de cuenta **no** está pegada al borde derecho de la ventana.

**Breakpoints: dos sistemas que no se alinean.**
- Ledger: `1279px` (cuenta a 272px, héroe a 36px), `1023px` (riel se acuesta, cuenta pasa abajo), `640px` (héroe a 32px).
- Incumbente: `1100`, `1024`, `920`, `900`, `820`, `720`, `700`, `640`, `560`, `420`.
- Consecuencia observable: entre 1024 y 1100px el padding de `.main` ya cambió pero el riel todavía es vertical y la cuenta mide 320px.

**El riel no desaparece en angosto: se acuesta** (`ledger.css:230-267`). Pasa a `flex-direction: row`, `overflow-x: auto`, `padding: 8px 10px`, `border-bottom: 1px solid var(--lg-rail)`, `.rail-btn { min-width: 62px }`, y el `.app-lg` pasa a una sola columna con `.app-lg > .content { grid-column: 1; min-height: 0 }`. El comentario de esa línea registra el bug que arregla: sin el reset de `grid-column`, `.content` pedía la columna 2, el grid creaba una columna implícita y "el hilo desbordaba el teléfono y la banda salía cortada".

Dentro del mismo bloque, `.rail-foot` se declara `display: none` (`ledger.css:267`) después de haberlo re-vestido como tira horizontal en las líneas 252-263: el pie del riel repetía el número que la banda ya decía, y su `white-space: nowrap` ensanchaba la navegación. **En móvil manda la banda.** `.chat-lg` pasa a columna y `.cuenta` a `width: auto; max-height: 40dvh`.

## Elevation & Depth

**La capa ledger es plana. Punto.** No define una sola sombra. Lo que hace es borrar las que el incumbente ya puso: `box-shadow: none` en cuatro reglas (`.app-lg .guest-bar`, `.app-lg .composer`, `.app-lg .bubble-ai/.bubble-user`, `.app-lg .spark`). La profundidad se construye con **color de superficie** (papel `#f4f1e8` → campo `#fffdf7` → riel `#0f3b3a`) y con el **filete de 1px** (`--lg-rule`). Un campo se ve como campo porque es más claro que su fondo y tiene un borde, no porque flote.

El comentario en `ledger.css:359` lo dice en una línea: "Campos reglados, no flotando: sin sombra ambiental ni tarjeta dentro de tarjeta."

**El incumbente tiene 45 declaraciones de `box-shadow`** (15 en `styles.css`, 30 en `polish.css`) y siguen activas fuera del shell y en todo lo que `.app-lg` no pisa. Las que se ven dentro del shell porque nadie las cubrió:

- **`.modal`** — `box-shadow: 0 34px 90px -24px rgba(10, 10, 20, 0.45)`, `border-radius: 12px`, fondo `--panel` zinc (`polish.css:1282-1291`).
- **`.card:hover`** — `translateY(-2px)` + `0 16px 32px -18px rgba(24, 24, 34, 0.24)` (`polish.css:511-513`).
- **`.composer` base** — `0 10px 30px rgba(20, 20, 30, 0.05)` (`styles.css:611`), anulada dentro de app.
- **`.bubble-user` base** — sombra con tinte de acento (`polish.css:694`), anulada dentro de app.

**Motion.** No hay tokens de movimiento en ledger. El incumbente define `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` y duraciones `--dur-1: 140ms`, `--dur-2: 240ms`, `--dur-3: 420ms`, `--dur-4: 760ms` (`polish.css:10-16`). `--ease-spring` tiene overshoot (y₁ > 1) y se usa en la entrada del modal: el detector determinístico la marcó como `bounce-easing`. La capa ledger no la toca.

Las únicas transiciones propias del ledger son los hover del riel y de la fila de sugerencias, y `@media (prefers-reduced-motion: reduce)` (`ledger.css:277-279`) los apaga para `.rail-btn`, `.rail-aviso` y `.banda-venc .bv-burger`. **`.bv-burger` no existe en ningún lado del JS**: selector muerto.

### The Flat Ledger Rule

**Si tiene sombra, no es ledger.** Dentro de `.app-lg`, cualquier superficie nueva que necesite diferenciarse lo hace con `--lg-field` sobre `--lg-papel`, o con 1px de `--lg-rule`. Si hace falta una sombra, la regla está mal o hace falta hablar del tema antes.

## Shapes

- **Radio dominante en ledger: 6px, literal, todas las veces.** Cinco reglas lo escriben y cubren seis superficies: `.rail-btn`, `.rail-aviso`, `.app-lg .guest-bar`, `.app-lg .composer`, y una sola línea para `.app-lg .bubble-ai, .app-lg .bubble-user`. No usa `--radius-md` (que casualmente también vale 6px en `styles.css:20`); escribe `6px`. El `select` del chip de modelo y el `.agent-chip` heredan el radio de las hojas anteriores: ledger solo les cambia color y borde. Los radios de 8, 12 y 16px del incumbente no aparecen escritos en ledger.
- **Radio del incumbente**: `--radius-sm: 4px`, `--radius-md: 6px`, `--radius: 8px` ("sigue siendo el radio de tarjeta"), `--radius-xl: 12px`, `--radius-2xl: 16px`. La `.bubble-user` anterior usaba un radio asimétrico `16px 16px 6px 16px` (`polish.css:693`); ledger lo aplana a 6px parejo.
- **El filete de 1px es la forma del sistema.** Bordes de 1px en `--lg-rule` para separar renglones del libro (`.bolsas li` abajo, `.movimientos td` abajo, `.asiento` arriba, `.sugerencia` abajo, `.sugerencias` arriba, `.cuenta` a la izquierda). El riel usa `border-right: 1px solid var(--lg-rail)` — **del mismo color que su fondo**, o sea un borde que no se ve; existe para que el ancho sea declarable.
- **Nada de glass ni degradados en ledger.** `ledger.css` no tiene `backdrop-filter` ni `linear-gradient` ni `radial-gradient`. El incumbente sí: la topbar con `backdrop-filter: saturate(180%) blur(12px)` (`styles.css:88`), el `.modal-backdrop` con `blur(8px)`, y el `.spot::before` con `radial-gradient(240px circle … color-mix(in srgb, var(--accent) 14%, transparent))`. Adentro de `.app-lg` el spotlight se apaga con `display: none` + `background-image: none` (`ledger.css:373-374`).
- **La geometría del riel en angosto** es la segunda forma del sistema: la misma pila vertical convertida en tira horizontal con scroll propio, sin cambiar de color.

## Components

Lo que sigue es la capa ledger sobre las superficies de tarea. Los componentes del incumbente (`.btn`, `.card`, `.plan-box`, `.chip-suggestion`, `.history-item`) están documentados solo donde tocan el mundo ledger.

### Riel (`ledger.css:48-121` + `App.jsx:274-308`)

Columna de 108px en `--lg-rail`, `padding: 14px 8px 12px`, `gap: 2px`, sticky a `100dvh`. Arriba `.rail-mark` (logo `n` en Fraunces sobre `--lg-rail-ink` con texto en `--lg-rail`, más la palabra `novaia` en 12px), después los botones, y `.rail-foot` empujado abajo con `margin-top: auto`.

- **`.rail-btn`**: flex en columna, `gap: 4px`, ícono de 18px arriba de la etiqueta de 11.5px, `padding: 9px 2px 8px`, radio 6px, `color: --lg-rail-dim`. Hover: `rgba(220, 236, 230, 0.09)` + `--lg-rail-ink`. Estado actual: `[aria-current="page"]` → `rgba(220, 236, 230, 0.14)`, `#ffffff` puro, peso 600. **El blanco puro y `#14504e` son los dos únicos hex literales de todo el archivo.**
- **`.rail-foot`**: cifra tabular (`--lg-rail-ink` 12px/600) + etiqueta + racha (solo si `racha > 1`), separada del riel por un `border-top` de `rgba(220, 236, 230, 0.18)`.
- **`.rail-aviso`**: botón de 10.5px con borde `--lg-rail-dim`, sin fondo. "Plan Plus" / "Sin cuenta" / "Crear cuenta gratis". No usa el rojo reservado.

**La nav del riel (`NAV_APP`) es chat, historial, mini-agentes, uso-tokens, planes, ajustes** — más un séptimo botón "Panel" solo si `role === "admin"`, más el botón "Tema". **`planes` está en el riel pero no en `SUPERFICIE_APP`**: al tocarlo el shell se intercambia — desaparece el riel y aparece la topbar zinc de 60px. Es el comportamiento actual, no un bug conocido.

### Banda de vencimiento (`ledger.css:125-138` + `Chat.jsx:463-479`)

`.banda-venc` — flex `space-between`, `gap: 14px`, `padding: 9px 20px`, fondo `--lg-band` (`#0f3b3a`), texto `--lg-rail-ink` a 13px. Es el único ornamento estructural del sistema y es información, no decoración: `Plan Pro · renueva 01/12` a la izquierda, `5.983.120 de 6.000.000 tokens` a la derecha con la cifra en tabular. Con invitado: `Sin cuenta · 3 mensajes por día, sin tarjeta` / `te quedan 2 hoy`. La fecha se arma a mano desde la cadena ISO (`Chat.jsx:438`, `diaEs`) porque un `Date` → locale en GMT-3 corría el día.

### Columna de cuenta (`ledger.css:150-203` + `Chat.jsx:733-779`)

`aside.cuenta`, 320px, `--lg-papel`, `border-left` de `--lg-rule`, `padding: 20px 18px`, scroll propio, `font-variant-numeric: tabular-nums` declarado en el contenedor y heredado a todo lo que sigue. Adentro, tres bloques separados por `h2` de etiqueta en versalitas:

1. **`.saldo-hero`** (44px/650/lh 1 en verde libro) + `.saldo-sub` con el total del plan.
2. **`.bolsas`** — `ul` sin estilo con `border-top` y cada `li` con `border-bottom`; grilla `minmax(0,1fr) auto`; nombre del modelo arriba, upstream (`--lg-ink-2` 11px) abajo, restante en 600 a la derecha. **`agotado` en `--lg-alert` es el único rojo legítimo del sistema.**
3. **`.movimientos`** — `<table>` con `<caption>` oculto (`display: none`, sigue ahí para lectores de pantalla), columnas **Día / Cargo / Saldo** con `Cargo` y `Saldo` alineadas a la derecha. El cargo se pinta `−1.512` en verde libro; un día sin cargo muestra `0` en `--lg-ink-2`, no en rojo. Se calcula corrido sobre **todos** los días del mes y se muestran los últimos 8, del más reciente al más viejo (`Chat.jsx:447-457`).

### La línea de asiento (`ledger.css:207-221` + `Chat.jsx:533-547`)

`.asiento` es lo que hace este producto distinto y es literalmente un renglón de libro contivo: `margin-top: 10px`, `padding-top: 7px`, `border-top: 1px solid var(--lg-rule)`, 12.5px, `--lg-ink-2`, tabular, con `flex-wrap: wrap` y `gap: 6px 14px`, `justify-content: space-between`.

Izquierda, el cargo en verde libro 600: `−1.512 tokens · saldo 612.480`. Derecha, modelo y upstream: `Nova Pro 3.1 · NVIDIA`. Se pinta solo en la última burbuja del asistente, después de que termina el stream (`!streaming`), y se alimenta del evento SSE `nova` que emite `functions/api/chat.js:417` con `{ model, key, tokens, upstream }`; el frente guarda `model`, `tokens` y `upstream` y descarta `key` (`Chat.jsx:314`).

Los tres estados alternativos:

- `tokens` con `saldo` nulo (invitado) → `−N tokens` sin saldo.
- `tokens: 0` y `fallo` → `sin cargo: no hubo respuesta del modelo`, con `a-neutro` en `--lg-ink-2`.
- `tokens: 0` sin fallo → `sin cargo registrado`.

El saldo del asiento se calcula sobre el total del mes que ya se tenía, porque el backend todavía no descontó esa respuesta (`Chat.jsx:349`, y su comentario). Un asiento de fallo **no inventa saldo**: `asientoCorto()` devuelve todo en cero/nulo (`Chat.jsx:387-389`), en línea con la regla de producto de no afirmar lo que el código no hace.

**Lo que todavía nadie vio renderizado: la línea completa `−N tokens · saldo X` con números cargados.** Los entornos de preview de Cloudflare Pages no llevan `OPENROUTER_API_KEY`, así que en el único lugar donde se probó el chat corrieron los estados de fallback. El mecanismo existe de lado del servidor y de lado del cliente, y las ramas de fallback están observadas; el caso poblado no.

### Sugerencias regladas (`ledger.css:334-357` + `Chat.jsx:496-505`)

Cuatro renglones, no cuatro tarjetas: `.sugerencias` es columna con `gap: 0` y `border-top`; cada `.sugerencia` es una grilla `minmax(140px, 210px) / minmax(0, 1fr)` con `gap: 16px`, `padding: 11px 2px`, `border-bottom` de 1px, `background: none`, `text-align: left`. Hover: `rgba(15, 59, 58, 0.05)`. El título en 14px/600, el prompt en 13.5px secundario. En ≤1023px la grilla colapsa a una columna y `gap: 2px`.

**Estas clases no existen en `styles.css` ni en `polish.css`**: `.sugerencias` / `.sugerencia` son 100% de la capa nueva. La versión anterior del chat usaba `.suggestions` / `.chip-suggestion` (tarjetas). No hay conflicto posible porque no hay duplicado.

### Composer y acciones (`ledger.css:306-311, 360-367`)

`.app-lg .composer` está declarado dos veces y gana la segunda (línea 360): fondo `--lg-field`, `border: 1px solid var(--lg-rule)`, radio 6px, `box-shadow: none`. La primera declaración (línea 306) pedía fondo `--lg-papel` y `border-top` — está muerta por orden de fuente. El `textarea` pasa a `border: 0; background: transparent` porque el campo ya tiene el borde; mantiene `min-height: 84px` del incumbente y el tope de 200px que fija `Chat.jsx:156`.

**`.app-lg .btn-primary` y `.app-lg .send-btn`**: `--lg-rail` con `--lg-rail-ink`, hover `#14504e`. El botón de envío conserva el círculo de 42px del incumbente; lo que cambia es el color. `.btn-ghost` pasa a `--lg-ink` sobre borde `--lg-rule`.

**Burbujas**: la del usuario pasa de azul con sombra de acento y radio asimétrico a `--lg-rail` plano con radio 6px. La del asistente queda transparente sobre papel: **la respuesta no tiene contenedor**, solo el texto y el filete del asiento abajo.

**`.app-lg .guest-bar`**: campo reglado (`--lg-field`, 1px `--lg-rule`, radio 6px, sin sombra) con `.txt { min-width: 0; flex: 1 1 140px }`. El `min-width: 180px` de `styles.css:1196` empujaba el documento más allá de 390px en móvil.

**Efecto lateral no intencional:** `.app-lg .guest-bar .tag` (`ledger.css:377`, especificidad 0,3,0, y más tarde en el orden de carga) gana sobre `.guest-bar.out .tag` de `styles.css:1199`, y `.app-lg .guest-bar` (0,2,0) gana sobre `.guest-bar.out` (0,2,0). **Adentro del shell, el estado `.out` —invitado sin mensajes restantes— se ve idéntico al estado normal excepto por el texto.** El rojo del `--danger` y el borde de alerta desaparecieron para esa superficie.

### Toasts y modales

Ninguno fue convertido. `.toast` y `.modal` viven en el incumbente y aparecen sobre las superficies de app con fondo zinc, `border-radius: 12px`, sombra de 90px de desenfoque y entrada con `--ease-spring`. Los dos modales del chat (`Chat.jsx:668-731`) además reciben `.app-lg .btn-primary`, así que dentro del modal zinc aparece un botón teal. Son el único lugar donde un modal del mundo ledger tiene botón teal y caja zinc al mismo tiempo.

## Do's and Don'ts

Esto es lo que la capa ledger observa hoy en el código, más lo que el build todavía no honra. Está escrito para quien edite estas tres hojas, no como manifiesto.

### Do:

- **Do cargar toda hoja nueva después de `ledger.css`** si tiene que mandar sobre el shell de app, o agregarle un prefijo `.app-lg` a la existente. El orden de `main.jsx` es la única política de cascada del proyecto.
- **Do usar los tokens `--lg-*` por nombre**, no el valor: son 11 y están definidos dos veces (`:root` y `body.dark`). El único caso donde un hex literal está permitido es un estado sobre el riel (`#ffffff`, `#14504e`), y son exactamente dos.
- **Do medir el contraste antes de asignar un color semántico.** El precedente es `.rail-aviso`: el rojo reservado se descartó ahí porque medía 1,88:1 sobre el riel y porque el aviso no era un error (`ledger.css:109-110`).
- **Do alinear toda cifra a la derecha en su columna y declararla `font-variant-numeric: tabular-nums`.** Hereda: basta con ponerla en el contenedor, como hace `.cuenta` (línea 159) y `.asiento` (línea 218).
- **Do distinguir dos rojos en oscuro.** `--lg-alert` es `#ff8778` y `--danger` es `#ff6b61`; son distintos y los dos pintan sobre papel oscuro. Un componente nuevo que necesite alertar dentro de `.app-lg` usa `--lg-alert`.
- **Do respetar la reserva del rojo**: el único estado que hoy lo muestra es `.bolsas .b-vacia` ("agotado"). Si hace falta un segundo significado, se habla primero.
- **Do poner el asiento debajo de toda respuesta, incluso la que falló.** `Chat.jsx:341-351` lo emite siempre; "si no, el libro deja de cuadrar justo cuando algo salió mal".
- **Do no inventar un número en el asiento.** `asientoCorto()` devuelve `tokens: 0, saldo: null` y la UI lo traduce a texto. La regla vinculante del dueño es no afirmar lo que el código no hace, y el asiento es donde más se nota.
- **Do re-vestido completo o ninguno.** El patrón que funciona en `ledger.css` es tocar todos los elementos del hilo a la vez (líneas 285-326: contenido, burbujas, composer, chip de agente, notas). La vez que se hizo a medias quedaron "dos mundos en una captura", que es lo que el comentario de la línea 281 describe.
- **Do alinear los breakpoints nuevos con los existentes o declarar explícitamente que no lo están.** Hoy hay dos juegos (1279/1023/640 contra 1100/1024/900/820/720/700/560/420) y hay una franja entre 1024 y 1100px donde uno cambió y el otro no.

### Don't:

- **Don't agregar una quinta hoja al `main.jsx` sin entender que la última gana** ante igual especificidad, y que hoy hay **68 selectores duplicados** entre `styles.css` y `polish.css` contando los de clase/elemento (71 si se suman `:root`, `*` y `body.dark`). La crítica de 2026-11-09 registró 67 por un conteo apenas distinto. Ejemplos reales donde `polish.css` gana sobre `styles.css`: `h1.hero` (clamp 36-56 vs 30-40), `.section-h2` (27px/600 vs 21px/700), `.composer`, `.card`, `.btn-primary`, `.model-chip` (declarado tres veces). **Nadie puede saber qué regla está viva sin leer las tres hojas a la vez.** La tarea pendiente #24 ("Podar los selectores duplicados") sigue abierta.
- **Don't asumir que una propiedad que agregaste en `styles.css` tiene efecto en una página de app.** `ledger.css:292-293` existe porque una `min-width: 180px` de 200 líneas antes rompía 390px.
- **Don't usar `font-weight: 650` en una cifra nueva.** Inter está cargado en `400;500;600;700` (`index.html:28`). `.saldo-hero` pide 650 y el navegador le resuelve 700. Lo que el código dice y lo que se ve no coinciden, y ya hay un precedente en el archivo.
- **Don't poner un `eyebrow` ni un número de sección en una superficie ledger.** La capa nunca usa `.eyebrow`. **Pero tampoco lo agregues creyendo que estás arreglando algo: hoy hay cinco page-heads con `03 · TU ESPACIO`, `04 · MINI AGENTES`, `05 · TU CUENTA`, `06 · PREFERENCIAS`, `07 · ADMINISTRACIÓN` dentro de `.app-lg`** (Historial, Agentes, Uso, Ajustes, Admin), todos en `--accent` azul, y los dos modales de Chat.jsx emiten `eyebrow="MINI AGENTES"` / `eyebrow="LÍMITE DE INVITADO"` vía `ui.jsx:138`. Eso es un defecto que el build carga, no el estilo de la casa: `ledger.css` nunca lo reproduce y no hay ninguna regla que lo autorice. Lo mismo aplica al gradiente de texto: vive en `polish.css:294-300` y `:1189-1196` sobre `.hero-title .hero-em .reveal-word`, `.chat-hero h1 em` y `.login-left h1 .login-em`, todos en superficies persuasivas. Ninguno entra en el shell.
- **Don't anidar tarjetas dentro del shell.** Ledger no tiene componente tarjeta: tiene columnas, renglones y campos reglados. `.card` del incumbente sí aparece adentro de app (Uso y Admin usan `card static stat-card spot`) con `--panel` zinc, radio 16px, hover con sombra y `--radius` — es la superficie del otro mundo dentro de esta. No se suma más.
- **Don't darle a un número de app `--text` zinc.** `.stat-num { font-size: 38px !important }` en `polish.css:1089` es el caso que hay que no replicar: es la cifra más grande de Uso y Admin, no es tabular y no es verde libro.
- **Don't reutilizar `--lg-band` para otra superficie** sin querer realmente que pueda divergir del riel; hoy tiene el mismo valor en los dos temas y ningún otro uso.
- **Don't dejar reglas muertas en `ledger.css` creyendo que hacen algo.** Hay tres hoy y se pueden borrar con seguridad: `.asiento .a-vacia` (línea 221, ninguna clase JSX la emite), el `--lg-alert` de `.movimientos .m-vacia` (línea 202, neutralizado en 304) y `.banda-venc .bv-burger` (línea 278, selector inexistente). Antes de borrar, verificar que nadie las agregue del lado del JS.
- **Don't declarar el mismo selector dos veces dentro de `ledger.css`** como se hizo con `.app-lg .composer` (306 y 360) y `.rail-foot` (252 y 267): la primera se pierde sin dejar señal. Si es un parche sobre el parche, editar la regla original.
- **Don't afirmar que la línea de asiento poblada está verificada.** Nadie la vio con números reales en un entorno de preview; la verificación requiere un `OPENROUTER_API_KEY` que Cloudflare Pages no pone ahí. Cualquier cambio sobre `Chat.jsx:343-351` o `functions/api/chat.js:417` se comprueba en local o en producción, no en preview.
