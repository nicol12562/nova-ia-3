---
name: Nova IA
description: Chat de IA en español rioplatense; cada respuesta dice qué modelo contestó y cuánto descontó.
colors:
  side: "#08090a"
  side-ink: "#eceef1"
  side-dim: "#8f949c"
  side-on: "#17191c"
  side-field: "#141618"
  ground: "#111316"
  surface: "#1a1d21"
  raised: "#1f2226"
  sunk: "#222529"
  ink: "#e9eaec"
  ink-2: "#b4b8bf"
  ink-3: "#8b9098"
  line: "#24272c"
  line-strong: "#33373d"
  azul: "#3d8bff"
  azul-ink: "#6aa8ff"
  oro: "#f2b705"
  oro-ink: "#f5c63c"
  celeste: "#5cc2f2"
  celeste-ink: "#86d2f6"
  verde: "#2fc48c"
  verde-ink: "#5ad6a6"
  rojo: "#f0485d"
  rojo-ink: "#ff8595"
  primary: "#2563eb"
  primary-hover: "#1d4fd0"
  on-primary: "#ffffff"
typography:
  wordmark:
    fontFamily: "Shrikhand, Georgia, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1
  display:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(36px, 4.4vw, 52px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.55
  body-answer:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.3
  meta:
    fontFamily: "Space Grotesk, Segoe UI, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.4
  code:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Code, Consolas, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "8px"
  md: "10px"
  r: "12px"
  lg: "14px"
  xl: "16px"
  modal: "18px"
  pill: "99px"
  full: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "56px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-quiet:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "42px"
  button-small:
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "34px"
  icon-button:
    textColor: "{colors.ink-2}"
    rounded: "9px"
    size: "36px"
  icon-button-hover:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.ink}"
  send-button:
    textColor: "{colors.azul}"
    rounded: "{rounded.md}"
    size: "38px"
  composer:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px"
  bubble-user:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r}"
    padding: "11px 16px"
  saldo-pill:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px 0 12px"
    height: "34px"
  chip:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  side-link:
    textColor: "{colors.side-ink}"
    rounded: "{rounded.r}"
    padding: "0 12px"
    height: "40px"
  side-link-active:
    backgroundColor: "{colors.side-on}"
    textColor: "{colors.side-ink}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "42px"
  card-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "18px 18px 16px"
  ledger-modelos:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "4px 20px"
---

# Design System: Nova IA

<!-- Mundo "Grafito". Reemplaza por completo al mundo "Filete" (sobrescrito a pedido del dueño el 2026-11-22). Fuente de verdad: src/nova.css; src/admin.css se apoya en los alias de :root. -->

## Overview

**Creative North Star: "Grafito"**

Un chat de trabajo oscuro y silencioso. Barra lateral casi negra, área de trabajo grafito con un lavado azul frío arriba a la derecha, superficies sin borde que se separan del fondo solo por tono, y un único azul cromático para la acción. Lo que habla es el contenido y el asiento debajo de cada respuesta (modelo, proveedor, tokens, saldo); la interfaz se mantiene en negro, grafito y gris.

El sistema nació guiado por una interfaz de referencia (`.impeccable/reference/voxa-ref.png`), de la que toma la tipografía, la barra oscura, la burbuja grafito del usuario, las respuestas en texto plano y la cita con barra clara. Del mundo anterior sobrevive un solo elemento: el logotipo `novaia` en Shrikhand con sombra dura oro y rojo. Es un activo de identidad, no un recurso del sistema.

El tema oscuro es el de inicio (`body.dark`); el claro existe como opción y redefine los mismos tokens en `:root` (valores en el sidecar, `colorMeta.*.light`). La barra lateral queda oscura en ambos temas.

**Key Characteristics:**
- Barra lateral `side` fija de 272 px, idéntica en tema claro y oscuro.
- Fondo grafito con un solo gradiente radial azul (`--wash`) anclado arriba a la derecha.
- Superficies sin borde en el flujo principal; profundidad por tono.
- Un azul de acción (dos tonos: `primary` para botones con texto, `azul` para íconos y señales); los demás colores son puntos con significado fijo.
- Una sola familia de interfaz (Space Grotesk), pesos 400–600.
- Radio de 12 px como forma por defecto; píldoras para estado.

## Colors

Negro, grafito y gris, con un azul de acción y cuatro puntos de color que significan siempre lo mismo.

### Primary
- **Azul primario** (`primary`, hover `primary-hover`): relleno de todo botón primario, siempre con texto blanco (`on-primary`). Es más profundo que `azul` para que el texto blanco pase AA (5.2:1). En los dos temas el hover baja a `#1d4fd0`, que mantiene el texto blanco por encima de AA.
- **Azul de señal** (`azul`): el ícono de enviar del composer, el cursor de texto, el cursor de escritura en streaming, los puntos de "escribiendo", el ícono y la barra de la tarjeta de saldo, las marcas de la lista del login. Nunca lleva texto blanco encima: no alcanza contraste.
- **Azul tinta** (`azul-ink`): enlaces y texto azul sobre grafito, donde `azul` no alcanza contraste.

### Secondary (puntos de modelo)
- **Oro** (`oro` / `oro-ink`): Nova Flash.
- **Celeste** (`celeste` / `celeste-ink`): Nova Pro.
- **Verde** (`verde` / `verde-ink`): Nova Pro 3.1.
- **Rojo** (`rojo` / `rojo-ink`): error o saldo agotado (píldora `vacio`, bolsa agotada, mensaje fallido, borde de la barra de invitado).

El mapa modelo → color vive en `COLOR_MODELO` (`src/pages/Home.jsx`) y se aplica con `.m-oro`, `.m-celeste`, `.m-verde`, que definen `--m` y `--m-ink`. Los componentes leen `--m`, nunca el color directo.

### Neutral
- **Riel nocturno** (`side`): barra lateral, barra superior móvil y panel izquierdo del login.
- **Tinta del riel** (`side-ink`) y **riel tenue** (`side-dim`): texto e íconos de la barra.
- **Riel activo** (`side-on`): fondo del enlace o chat seleccionado.
- **Campo del riel** (`side-field`): buscador y tarjeta de saldo dentro de la barra.
- **Grafito** (`ground`): fondo de página y del área de trabajo.
- **Superficie** (`surface`): composer, burbuja del usuario, sugerencias, libro de saldos, modales, paleta.
- **Elevada** (`raised`): menú del selector de modelo, hover de sugerencias, botón "al final".
- **Hundida** (`sunk`): hover de botones e íconos, botón quieto, chips, pistas de barras, código en línea.
- **Tinta** (`ink`), **tinta 2** (`ink-2`), **tinta 3** (`ink-3`): texto principal, secundario, metadatos y placeholders.
- **Línea** (`line`) y **línea fuerte** (`line-strong`): separadores de listas regladas, tablas, bordes de menús y campos.

### Named Rules
**The One Blue Rule.** El azul es el único color cromático de acción. Todo botón primario es `primary` con texto blanco; `azul` queda para íconos, foco y lo que está en curso. Nada que no sea actuar, enlazar, enfocar o señalar algo en curso se pinta de azul.

**The Fixed Dot Rule.** Oro, celeste y verde nombran modelos; rojo nombra error o agotamiento. Aparecen como puntos de 7 a 9 px junto al nombre del modelo (selector, píldora de saldo, asiento, libro de saldos de Inicio, bolsas de Uso), nunca como relleno de superficie ni borde de tarjeta.

**The Night Rail Rule.** Los tokens `side-*` no cambian con el tema. La barra lateral es `side` también en tema claro.

## Typography

**Display Font:** Space Grotesk (con Segoe UI, system-ui)
**Body Font:** Space Grotesk
**Label/Mono Font:** JetBrains Mono, solo código
**Logotipo:** Shrikhand, solo `.wordmark`

**Character:** Una grotesca geométrica con carácter propio, usada en pesos contenidos (400 a 600) y con tracking negativo en los tamaños grandes. La voz tipográfica es una sola; la jerarquía sale del tamaño, el peso y el tono de tinta.

### Hierarchy
- **Display** (600, clamp 36–52 px, 1.05, −0.035em): título de Inicio. El título del login sube a clamp 40–60 px con −0.04em sobre el riel.
- **Headline** (600, 34 px, 1.2, −0.03em): títulos de página y saludo del chat vacío (30 px en móvil).
- **Title** (600, 22 px, −0.02em): títulos de sección; 19 px en tarjetas y vacíos, 23 px en modales.
- **Body** (400, 15.5 px, 1.55): interfaz general. Las respuestas de la IA usan 1.7 de interlineado; la burbuja del usuario, 15 px. Textos de apoyo con medida de 56 a 66 ch.
- **Label** (500, 13.5 px): píldora de saldo, selector de modelo, encabezados de la barra.
- **Meta** (400, 12.5 a 13 px, `ink-3`): asiento debajo de cada respuesta, notas al pie, pistas.
- **Code** (JetBrains Mono, 13.5 px, 1.6): bloques de código, la pieza (canvas), código en línea a 0.88em.

### Named Rules
**The One Face Rule.** Space Grotesk para toda la interfaz. Shrikhand existe solo en el logotipo; JetBrains Mono solo en código.

**The Weight Ceiling Rule.** Los títulos llegan a 600, no más. La jerarquía crece por tamaño y tracking negativo, no por negritas pesadas.

**The Sentence Case Rule.** Etiquetas, encabezados de grupo y títulos en minúscula de oración, sin mayúsculas sostenidas ni tracking positivo.

**The Tabular Figures Rule.** Toda cifra que se compara lleva `font-variant-numeric: tabular-nums`: saldo de la barra, píldora de saldo, saldos del selector, asiento, cifras de los modelos en Inicio, cifras y tablas de Uso, topes y precios de planes.

## Layout

- **Escritorio:** barra lateral fija de 272 px (logotipo y nuevo chat, buscar con ⌘K, Secciones, Recientes, tarjeta de saldo, usuario). El contenido ocupa el resto con `main` de hasta 1040 px (1280 px en vistas anchas), relleno 56 / 48 / 72 px.
- **Chat:** columna de 792 px con 16 px de relleno lateral (760 px de texto). Encabezado pegajoso sin caja: título tenue a la izquierda, píldora de saldo a la derecha, fondo desenfocado a todo el ancho que se desvanece hacia abajo. Mensajes separados por 32 px. En ≤ 860 px el velo desenfocado se reemplaza por una franja sólida `ground` con una línea inferior de 1 px `line`, pegada debajo de la barra superior. Composer pegajoso abajo, sobre un degradé al grafito. En chat vacío el saludo y el composer suben al centro (14vh de aire).
- **Ritmo:** pasos de 4, 8, 12, 16, 24, 32 px dentro de componentes; 56 a 80 px entre secciones de página.
- **≤ 1100 px:** grillas de planes y comparación a una columna; la pieza ocupa hasta el ancho total con velo.
- **≤ 860 px:** barra superior de 58 px en `side`; la barra lateral pasa a cajón de min(320 px, 86vw) con velo; `main` a 16 px de margen; sugerencias, modelos y bolsas a una columna; el texto del composer pasa a ocupar una fila propia sobre el selector y enviar.

## Elevation & Depth

Híbrido con preferencia por el tono. Las superficies del flujo principal se separan del grafito por luminosidad (`ground` → `surface` → `raised`) y no llevan borde. La sombra queda para lo que flota sobre el contenido o se escribe: el composer, la caja de pregunta de Inicio, la tarjeta de cuenta, menús, modales, paleta, pieza y avisos. La luz ambiente es el lavado azul radial del área de trabajo, no una sombra.

### Shadow Vocabulary
- **Reposo** (`--shadow`, oscuro: `0 1px 0 rgba(255,255,255,0.02) inset, 0 16px 40px -18px rgba(0,0,0,0.8)`): composer, caja de pregunta, tarjeta de cuenta.
- **Emergente** (`--shadow-pop`, oscuro: `0 28px 70px -20px rgba(0,0,0,0.85)`): selector de modelo, paleta, modales.
- **Contorno interno** (`inset 0 0 0 1px var(--line-strong)`): hover de sugerencias y botón "al final"; reemplaza al borde.

### Named Rules
**The Borderless Flow Rule.** En el chat y en Inicio, las superficies no llevan borde. El borde de 1 px aparece solo en menús flotantes, campos de formulario, tablas, tarjetas de Ajustes y la comparación de planes.

**The Focus Outline Rule.** El foco visible es un contorno de 2 px en `--focus` (azul) con 2 px de separación; los campos de formulario lo pegan al borde.

## Shapes

Esquinas suaves y consistentes. 12 px (`r`) es el radio por defecto para superficies, enlaces de la barra, burbuja, sugerencias y bloques de código. Los controles bajan a 10 px (botones, campos, selector, enviar) y 8 px (botones chicos, acciones de mensaje). Lo que contiene escritura o compara sube: composer y libro de saldos 14 px, caja de pregunta, vacíos, tarjetas y paleta 16 px, modales 18 px. Estado e identidad van en píldora (99 px): píldora de saldo, chips, arranques, chip de agente. Avatar, ícono de saldo, puntos de modelo y botón "al final" son círculos.

La única barra lateral gruesa es la de la cita en Markdown: 3 px en `ink`, con el texto de la cita en `ink` y peso 600, tomada de la referencia. No se traslada a tarjetas ni avisos.

## Components

### Buttons
Discretos y firmes; un empuje de 1 px al presionar.
- **Shape:** esquinas suaves (10 px), alto mínimo 42 px, peso 600.
- **Primary:** relleno `primary` (azul profundo) con texto blanco; al pasar cambia a `primary-hover`. Es el único botón relleno de color: preguntar en Inicio, crear cuenta, modales y acciones de página. No hay variantes azules aparte.
- **Quiet / Ghost:** relleno `sunk`, borde transparente que pasa a `line-strong` al pasar.
- **Small:** 34 px, radio 8 px. **Disabled:** opacidad 0.45; el enviar de Inicio deshabilitado pasa a `sunk` con texto `ink-3`.
- **Icon button:** 36 × 36 px, radio 9 px, ícono `ink-2` que pasa a `ink` sobre `sunk`.

### Chips
- **Style:** píldora `sunk` con texto `ink-2`, 13 px, peso 600. El chip de plan ("Tu plan") es neutro: fondo `ink` con texto `ground`. Es un estado, no una acción, y por eso no va en azul.
- **Arranques y chip de agente:** píldora `surface`, sin borde; los arranques pasan a `sunk` al pasar.

### Cards / Containers
- **Corner Style:** 14 a 16 px.
- **Background:** `surface` sobre `ground`.
- **Shadow Strategy:** sin sombra salvo la tarjeta de cuenta (`--shadow`).
- **Border:** ninguno en Inicio y chat; 1 px `line` en Ajustes, planes y la nota de agentes.
- **Internal Padding:** 18 a 26 px.
- Las listas de agentes, historial y agentes de Inicio son filas regladas por `line`, no tarjetas.

### Libro de saldos (Inicio)
Los tres modelos no son tres tarjetas: una sola superficie `surface` de radio 14 px con una fila por modelo separada por 1 px `line`. A la izquierda, punto y nombre del modelo (16 px, 600), descripción en `ink-2` y proveedor en `ink-3`; a la derecha, la cifra de saldo a 22 px en cifras tabulares, alineada al borde. El color del modelo vive solo en el punto; el proveedor nunca se tiñe.

### Inputs / Fields
- **Style:** borde 1 px `line-strong`, fondo `surface`, radio 10 px, alto 42 px (46 px en login).
- **Focus:** contorno 2 px `--focus`, borde transparente.
- **Buscador del historial:** radio 12 px; el foco oscurece el borde a `ink-3`.
- **Error:** texto `rojo-ink` debajo del formulario.

### Navigation
- **Barra lateral:** fondo `side`. Enlaces y chats de 40 px de alto, radio 12 px, 14.5 px, a 0.82 de opacidad; al pasar, `side-hover` y opacidad plena; activo, fondo `side-on` con el ícono en `side-ink`. Encabezados de grupo a 13 px en `side-dim`. Buscador y tarjeta de saldo en `side-field`.
- **Tarjeta de saldo:** al pie de la barra; ícono circular azul, tokens restantes en `side-ink` 15 px, barra de 4 px en azul.
- **Menú de usuario:** se abre hacia arriba, fondo `#17191c`, borde `side-line`, radio 12 px.
- **Móvil:** barra superior de 58 px en `side` con el logotipo a 25 px; la barra lateral se desliza como cajón (0.24 s).

### Composer
Una sola franja: selector de modelo a la izquierda, texto en el medio, enviar a la derecha. Fondo `surface`, radio 14 px, sombra de reposo; al enfocarse aparece un contorno de 1 px `line-strong`. El selector muestra el punto del modelo y abre un menú `raised` con radio 14 px y sombra emergente, una fila por modelo con su saldo. Enviar es un ícono azul de 38 px que se rellena; al responder cambia a detener sobre `sunk`.

### Mensajes y asiento
El usuario habla en una burbuja `surface` de radio 12 px alineada a la derecha (hasta 560 px). La IA responde en texto plano a ancho completo, interlineado 1.7. Debajo, el asiento en 12.5 px `ink-3`: punto y nombre del modelo, proveedor, tokens y cargo; un fallo se escribe en `rojo-ink`. Las acciones (copiar, reintentar, recordar) son íconos de 32 px en `ink-3`; en el mensaje del usuario aparecen al pasar.

### Píldora de saldo
Arriba a la derecha del chat: píldora de 34 px con borde `line-strong`, punto del modelo y saldo en 13.5 px con cifras tabulares. Agotada, texto y borde pasan a `rojo-ink`.

### Logotipo
`novaia` en Shrikhand 27 px, color `side-ink`, con sombra dura `2px 2px 0 oro, 4px 4px 0 rojo`. Siempre sobre `side`. Es la única sombra dura y el único uso de Shrikhand.

## Do's and Don'ts

### Do:
- **Do** separar superficies del grafito por tono (`ground` → `surface` → `raised`) antes de pensar en un borde.
- **Do** rellenar todo botón primario con `primary` y texto blanco; dejar `azul` para íconos, enlaces, foco y lo que está en curso (streaming, escribiendo, saldo).
- **Do** usar cifras tabulares en saldos, topes, precios y tablas.
- **Do** mostrar saldos comparables como filas regladas en una sola superficie, con la cifra a la derecha.
- **Do** mostrar el modelo con su punto de 7 a 9 px leyendo `--m` desde `.m-oro`, `.m-celeste` o `.m-verde`.
- **Do** dejar la barra lateral en `side` en ambos temas.
- **Do** usar 12 px como radio por defecto y píldora para estado.
- **Do** dibujar los íconos con `src/icons.jsx` (trazo de línea, viewBox 24, `currentColor`).
- **Do** respetar `prefers-reduced-motion`: una sola entrada orquestada (título y composer suben juntos, 0.7 s) y transiciones de estado de 0.15 s.

### Don't:
- **Don't** usar oro, celeste o verde para nada que no sea su modelo, ni rojo para nada que no sea error o agotamiento.
- **Don't** rellenar superficies, bordear tarjetas ni teñir texto (proveedor, descripción) con el color de un modelo.
- **Don't** poner texto blanco sobre `azul`: no pasa AA.
- **Don't** usar Shrikhand ni sombras duras desplazadas fuera del logotipo.
- **Don't** usar otra familia en la interfaz; JetBrains Mono queda para código.
- **Don't** poner etiquetas en mayúsculas, eyebrows ni kickers sobre los títulos.
- **Don't** poner barras laterales gruesas en tarjetas o avisos; la barra de 3 px es exclusiva de la cita.
- **Don't** usar caracteres (✓ ✕ ★ →) como íconos.
- **Don't** pasar de peso 600 en títulos.
