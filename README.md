# Nova IA — tu versión en código propio

Recreación de novaia.floot.app como proyecto propio: React (Vite) en el front,
Pages Functions como API y D1 (SQLite) como base de datos. Todo sale en un único deploy de Cloudflare.

## Estructura

- `index.html` — punto de entrada
- `src/` — app React (las 8 pantallas, replicadas de Floot)
- `src/data/plans.js` — datos de los 3 planes (fuente de verdad)
- `functions/api/auth.js` — registro e inicio de sesión (PBKDF2)
- `functions/api/chat.js` — proxy SSE a OpenRouter, modelo según plan
- `functions/api/history.js` — conversaciones y mensajes
- `functions/api/usage.js` — consumo de tokens por período
- `schema.sql` — tablas de D1
- `wrangler.toml` — configuración de Cloudflare

## Primer deploy (gratis, sin tarjeta) — ~10 minutos

1. Creá tu cuenta en https://dash.cloudflare.com/sign-up (solo email).
2. En la terminal, dentro de esta carpeta: `npm install`
3. Conectá tu cuenta: `npx wrangler login` (se abre el navegador)
4. Creá la base de datos: `npx wrangler d1 create novaia-db`
   → copiá el `database_id` que te muestra y pegalo en `wrangler.toml`
5. Cargá las tablas: `npx wrangler d1 execute novaia-db --remote --file=schema.sql`
6. Guardá tu key de OpenRouter como secreto (nunca en el código):
   `npx wrangler pages secret put OPENROUTER_API_KEY` (pegala cuando te la pida)
7. Publicá: `npm run deploy` → la app queda en `https://novaia.pages.dev`

## Desarrollo local

- `npm run dev` — frontend con hot-reload (puerto 5173; `/api` se delega al 8788)
- `npm run dev:api` — backend local con `wrangler pages dev`

## Seguridad

- `OPENROUTER_API_KEY` vive solo como secreto de entorno.
- Si la compartiste en un chat, rotala en https://openrouter.ai/keys cuando termines la migración.

## Pendientes de hardening (MVP consciente)

- Sesión en localStorage + `user_id` en las APIs: cómodo pero inseguro → pasar a cookie HttpOnly con token.
- Rate-limit por usuario en `/api/chat` y validación real de cuotas por plan.
- Cobro automático (Mercado Pago) para activar Pro/Plus sin revisión manual.
- La nota de planes sobre "varios nombres de modelo apuntan al mismo proveedor gratuito" quedó desactualizada con la escalera: actualizar el texto al publicar.
