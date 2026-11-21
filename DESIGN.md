# Design System: Nova IA — "Filete"

Este archivo describe lo que está construido. Reemplaza a los mundos "ledger" y
"clásico": desde este rediseño hay una sola hoja de estilos (`src/nova.css`) más
`src/admin.css`, que se apoya en los alias de variables definidos al final de `:root`.

## Idea

Fileteado porteño en **un solo lugar**: el logotipo `novaia` y el letrero de
Inicio y Login, en Shrikhand con sombra dura oro + rojo, más un adorno de volutas
(`src/filete.jsx`). Todo lo demás es una mesa de trabajo sobria: porcelana, tinta
índigo y filetes de 1 px. El marco de la barra lateral es un doble filete rojo y oro.

## Colores

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--ground` | `#f3f5f8` | `#0f1228` | Fondo de página |
| `--surface` | `#ffffff` | `#171b38` | Composer, tarjetas, menús |
| `--sunk` | `#e8ecf2` | `#1e2345` | Hover, pistas de barras |
| `--ink` | `#14183a` | `#eceef8` | Texto y botón primario |
| `--side` | `#14183a` | `#090b1c` | Barra lateral, login |
| `--oro` | `#f2b705` | | **Nova Flash**, saldo de la barra |
| `--celeste` | `#3a8dde` | | **Nova Pro** |
| `--focus` | `#1b5fa6` (`--celeste-ink`) | `#7db7f0` | Anillo de foco (≥ 4.5:1 sobre `--sunk` en ambos temas) |
| `--verde` | `#138a5e` | | **Nova Pro 3.1**, confirmaciones |
| `--rojo` | `#d7263d` | | Error, saldo agotado y sombra del letrero |

Regla: cada color del filete significa una sola cosa. El mapa modelo → color vive
en `COLOR_MODELO` (`src/pages/Home.jsx`) y se aplica con las clases `.m-oro`,
`.m-celeste` y `.m-verde`, que definen `--m` y `--m-ink`.

## Tipografía

- **Shrikhand**: solo `.wordmark` y `.letrero`. Nunca en texto de interfaz.
- **Schibsted Grotesk** (400–800): toda la interfaz. Títulos de página 38 px / 750.
- **JetBrains Mono**: solo bloques de código.
- Sin cifras tabulares: en Schibsted el `tnum` ensancha los puntos de miles.
- Sin etiquetas en mayúsculas ni eyebrows numerados.

## Estructura

- Desktop: barra lateral fija de 272 px (nuevo chat, buscar ⌘K, secciones,
  recientes, saldo del mes y usuario) + contenido de hasta 1040 px.
- ≤ 860 px: barra superior índigo con filete oro; la barra lateral pasa a cajón.
- Chat: columna de 820 px, composer fijo abajo, la pieza (canvas) a la derecha.

## Patrones de interfaz

- **Listas regladas, no tarjetas.** Mini agentes, las sugerencias del chat, Historial
  y los agentes de Inicio son filas separadas por filetes de 1 px. Las tarjetas
  quedan para lo que de verdad se compara lado a lado (los planes) y para
  formularios (Ajustes).
- **Sin cuadraditos de ícono.** Los títulos de sección no llevan un ícono en una
  baldosa; los íconos van en línea, a 20 px, del mismo trazo (`src/icons.jsx`).
  Nada de ✓ ✕ ★ como íconos: se dibujan.
- **Sin franjas laterales en tarjetas.** El único filete grueso es el marco de la
  barra lateral y del login (marcado `impeccable-disable side-tab` en `nova.css`).
  El color de un modelo se muestra con su punto, no con un borde.
- **Navegador:** barra de scroll y cursor de texto con colores de la paleta.

## Movimiento

Una sola entrada orquestada: en Inicio y Login el filete se dibuja y el letrero
cae en su sombra. El resto del movimiento responde a una acción (abrir menús,
paleta, canvas). Todo respeta `prefers-reduced-motion`.

## Funciones de interfaz

- Paleta de comandos (⌘K / Ctrl K): pantallas y búsqueda dentro de los mensajes.
  ⌘⇧O abre un chat nuevo.
- Chat: detener la respuesta (botón o Esc), reintentar una respuesta fallida,
  descargar la charla en Markdown, botón para volver al final y selector de modelo
  con el saldo de cada bolsa.
- La URL toma el id de la conversación apenas se guarda (`#/chat/<id>`).
