# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

SPA en React 18 + Vite con enrutado por hash, desplegada en Cloudflare Pages con Pages Functions y D1. Existe además un shell de escritorio para Windows (WebView2, `C:\Users\Administrator\Desktop\nova`) que carga el mismo sitio: es un envoltorio alrededor de la web, no un lenguaje de diseño nativo.

## Users

Confirmado por el dueño: **público mixto, sin un perfil primario que defina la interfaz**. Conviven tres situaciones reales dentro del mismo chat:

- Estudiantes y opositores que piden enunciados resueltos, explicaciones y resúmenes.
- Personas que atienden clientes o venden por WhatsApp y piden mensajes, presupuestos y respuestas concretas.
- Programadores que pegan código y piden dónde falla.

Ninguno es secundario: la interfaz no elige un perfil y no puede estar afinada para uno solo.

**Uso principal: desktop** (confirmado). El diseño lidera en pantalla grande; móvil tiene que funcionar, pero no manda.

## Product Purpose

Un asistente de IA en español rioplatense, con precios en pesos argentinos, que responde rápido, muestra cuánto le queda a cada modelo y se activa por una persona. Existe porque los productos globales cobran en dólares, no explican qué modelo contestó y tratan al usuario de habla hispana como un mercado secundario. Éxito = que alguien lo use todos los días y pague sin fricción.

## Positioning

Mecanismo que un vecino no puede copiar sin cambiar su producto:

- **Saldo visible por modelo.** Cada respuesta dice qué modelo la dio y cuántos tokens quedan del cupo mensual, con contadores reales desde la base de datos.
- **Proveedor upstream declarado.** Debajo de cada modelo se muestra quién lo sirve (NVIDIA, DeepSeek, Gemini vía OpenRouter).
- **Alta manual por persona.** La compra no es un checkout: se pide por WhatsApp y una persona lo activa. Es una limitación real del negocio, no un truco de diseño.
- **Hecho por una persona, dicho así.** La marca no finge un equipo ni una empresa.

## Operating Context

- El canal de venta y soporte es WhatsApp (`5493416116096`); la activación prometida es "en el día", con revisión manual.
- Invitado: 3 mensajes por día sin cuenta, sin tarjeta. Con cuenta gratis: 1.000.000 tokens por mes.
- Cuentas por email y contraseña, o Google OAuth. Sesión en cookie HttpOnly respaldada en D1.
- Memoria del usuario: notas que se inyectan en cada prompt ("que Nova lo recuerde").
- Historial con búsqueda, chats fijados y racha de días.
- Panel de control en `#/admin`, protegido por `ADMIN_KEY`, donde viven el saldo, los quebradores de upstream y los internos que no se muestran al público.
- Página de uso con cupos por modelo y una demo comparativa que corre el mismo prompt en los tres modelos (solo planes pagos).

## Capabilities and Constraints

- Tres roles de modelo: **Nova Flash**, **Nova Pro**, **Nova Pro 3.1**, servidos por OpenRouter. Los IDs upstream reales viven en `functions/_lib/models.js`; si un modelo muere, se cambia ahí.
- Cuota mensual: 1M / 2,5M / 5M tokens (Gratis / Plus / Pro). Largo máximo por respuesta: 2048 / 4096 / 8192 tokens.
- Planes: Gratis, Plus $20.000 ARS/mes, Pro $40.000 ARS/mes. **Pro es el plan más alto.**
- 7 mini agentes con instrucciones propias (Ventas por WhatsApp, Escritor, Programador, Lluvia de ideas, Resumidor, Explicador, Traductor). Solo en planes pagos. El conteo se lee de `AGENTS.length`, nunca se escribe a mano.
- Resiliencia real: timeouts por intento, cortocircuito de upstream con enfriamiento progresivo, y un pool de reserva pago.
- Idioma de la respuesta conmutable; el valor por defecto es español rioplatense.
- **Sin pasarela de pagos**: no hay suscripción automática, ni prórroga, ni facturación.
- Sin app móvil, sin voz, sin imágenes generadas, sin archivos adjuntos grandes, sin colaboración en vivo.
- El free tier de OpenRouter tiene topes diarios (50/1000 requests) que el producto no controla.

## Brand Commitments

- Nombre: **Nova IA**; wordmark `novaia`.
- Voz: rioplatense, directa, segunda persona ("pegá la duda", "armá un presupuesto").
- "Hecho en Argentina" y "Hecho por una persona" son afirmaciones deliberadas de la marca.
- Precios siempre en ARS.
- **Regla vinculante del dueño: no inventar certificados, usuarios, estadísticas, garantías, memoria persistente ni capacidades que no estén implementadas.**
- La paleta actual (zinc + azul #004de5, Inter con un monograma serif) es el sistema vigente en el código. En esta ronda el dueño pidió explícitamente **reemplazar el mundo visual**, así que la paleta deja de ser una restricción para las previews de rediseño; sigue siendo la verdad del sitio publicado.

## Evidence on Hand

- Sitio real funcionando: https://novaia-4ig.pages.dev (build verificado por hash de assets).
- Datos reales en D1: usuarios, `usage_daily`, `model_usage`, `upstream_health`, sesiones, notas de memoria.
- Panel de administración con contadores vivos, usado por el dueño.
- Ejecutable de escritorio nativo de Windows con sesión persistente y login de Google funcionando dentro de la app.
- **No existe y no se puede inventar**: testimonios, cantidad de clientes, benchmarks comparativos, certificaciones, SLA, equipo de soporte, inversión, cifras de uso públicas.

## Product Principles

1. Que se vea qué modelo respondió y cuánto saldo queda; la opacidad es una falla de producto.
2. Cobrar en pesos y con una persona al otro lado; la fricción honesta vale más que un checkout roto.
3. No prometer lo que el código no hace, incluido el copy de los planes.
4. El error se explica: decir por qué falló y qué hacer, no "no disponible".
5. Historial, búsqueda y memoria son la ventaja que retiene; se protegen por encima del decorado.

## Accessibility & Inclusion

- Contraste AA verificado sobre estilos computados (acentos sobre blanco 6,58:1; texto secundario en oscuro 7,76:1).
- Atajos de teclado en el chat (⌘K nuevo chat, Enter manda, Shift+Enter salto de línea).
- Diálogos con foco atrapado, Escape y restauración del foco al trigger.
- Sin certificación de accesibilidad declarada: no se puede afirmar cumplimiento más allá de lo medido.
