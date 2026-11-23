---
version: 1
slug: "src-pages-chat-jsx"
primary_target: "src/pages/Chat.jsx"
related_targets: ["src/App.jsx","src/nova.css","src/pages/Home.jsx","src/pages/Planes.jsx","src/pages/Login.jsx"]
---

# Surface brief — chat de Nova IA

Mode: Operate. Device lead: desktop (1440+). Actualizado el 2026-11-22: el dueño
pidió rehacer toda la estética guiándose por una interfaz de referencia (chat
oscuro "Voxa", `.impeccable/reference/voxa-ref.png`). Reemplaza al mundo "Filete";
del Filete solo queda el logotipo `novaia` (Shrikhand con sombra oro y rojo).
Tema oscuro por defecto, claro como opción.

## Direction contract

THESIS: un chat de trabajo oscuro y silencioso donde cada respuesta dice qué
modelo contestó y cuánto descontó. Rechaza el panel con tarjetas y colores: la
interfaz es negro, grafito y un solo azul de acción.

OWN-WORLD: barra lateral casi negra `#08090a`, área de trabajo grafito `#111316`
con un lavado azul frío arriba a la derecha, superficies `#1a1d21` de radio 12 px
sin bordes, texto `#e9eaec`, secundario `#8b9098`, azul de acción `#3d8bff`.
Space Grotesk en toda la interfaz (es la letra de la referencia). Puntos de color
por modelo (oro Flash, celeste Pro, verde Pro 3.1), rojo = error o agotado.

STORY: el visitante pregunta, ve la respuesta escribirse, la detiene si quiere y
lee debajo el asiento (modelo, proveedor, tokens, saldo). El saldo del mes vive en
la tarjeta al pie de la barra; el del modelo, en la píldora del encabezado.

FIRST VIEWPORT: barra lateral de 272 px (logotipo + nuevo chat, buscar ⌘K,
Secciones, Recientes, tarjeta de saldo, usuario). Columna de 760 px: mensajes del
usuario en burbuja grafito a la derecha, respuestas en texto plano, citas con
barra blanca, íconos de acción debajo. Composer de una línea: modelo, texto,
enviar en azul.

FORM: seed: none (pinned) — "usa la repo de imeccable para mejorar toda la estetica de la pagina guiate por esta interfaz" + la imagen de referencia.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
