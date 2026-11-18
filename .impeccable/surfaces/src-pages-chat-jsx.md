---
version: 1
slug: "src-pages-chat-jsx"
primary_target: "src/pages/Chat.jsx"
related_targets: ["src/App.jsx","src/nova.css","src/pages/Home.jsx","src/pages/Planes.jsx"]
---

# Surface brief — chat de Nova IA

Mode: Operate. Device lead: desktop (1440+). Actualizado el 2026-11-18: el dueño
eligió el mundo "Filete" (DESIGN.md) por sobre la dirección anterior "El resumen
de cuenta", que queda retirada.

## Direction contract

THESIS: un chat de trabajo sobrio donde cada respuesta dice qué modelo contestó y
cuánto descontó. La identidad vive en el logotipo y en el marco de filete de la
barra lateral; el hilo es para leer.

OWN-WORLD: porcelana `#f3f5f8`, tinta índigo `#14183a`, barra lateral índigo con
doble filete rojo y oro. Cada color del filete significa una sola cosa: oro =
Nova Flash, celeste = Nova Pro, verde = Nova Pro 3.1, rojo = error o saldo agotado.

STORY: el visitante pregunta, ve la respuesta escribirse, la puede detener, y
debajo lee el asiento (modelo, proveedor, tokens descontados, saldo). El saldo del
mes está siempre en la barra lateral; el de cada modelo, en el selector.

FIRST VIEWPORT: barra lateral (nuevo chat, buscar ⌘K, secciones, recientes, saldo
y usuario). Columna de 820 px: sin conversación, "¿Qué hacemos?" con cuatro
arranques en lista reglada y el composer debajo; con conversación, encabezado con
título, descargar y nuevo chat, el hilo y el composer fijo al pie. Acción
primaria: Enviar (Detener mientras escribe).

FINISH: pulido revisado con el detector de Impeccable en limpio sobre la fuente y
la página renderizada.
