# Commerce CMS (SsnkCode)

Panel de administración (CMS) + catálogo digital para el comercio SsnkCode.

## Stack

- **Frontend**: React 18 + Vite 5. **Un solo build** con dos apps: `cms/` (panel, en `/cms/`) y `catalog/` (catálogo público, en `/catalog/catalog.html`).
- **Backend**: Express 4 + PostgreSQL (`pg`), bcryptjs, nodemailer. API en el puerto `3001`.
- **Lenguaje**: todo el UI, comentarios y README están en español. Código ES Modules (`.mjs` / `.jsx`).

## Estructura relevante

- `cms/` — Panel CMS (React). `vite.config.js` está **aquí**, pero la raíz de Vite es la raíz del repo (sirve `cms/index.html` y `catalog/catalog.html` a la vez). El alias de Vite remapea `react`/`react-dom` a `cms/node_modules` a propósito; no los quites.
- `catalog/` — Catálogo público. `data.json` queda **versionado** (es el fallback de datos en frío).
- `utils/` — Lógica compartida entre ambas apps: `api.js` (cliente API + auth Bearer), `datos.js`, `formato.jsx` (render de negrita `**texto**` con `renderBold`), `tokens.css` (variables CSS de ambos temas), `seo.jsx`, `icons.jsx`, `a11y.jsx`, `cachedImage.jsx`, `images.js`.
- `backend/cms/` — API Express: `server.mjs`, `src/app.mjs`, `src/routes/` (auth, products, settings), `src/storage.mjs` (pool de Postgres), `src/db.mjs`, `src/mail.mjs`, `src/mapDatos.mjs`.
- `db/` — `base_completa.sql` es el script **canónico** de la base (uso exclusivo con init-db.mjs). `supabase.sql` es una variante para Supabase.
- `assets/`, `cms/dist/` — se copian al build (`dist`).

## Comandos

```bash
# Frontend (dev) — http://localhost:5178/cms/  y  /catalog/catalog.html
cd cms && npm run dev

# Build de producción — genera cms/dist
cd cms && npm run build

# Backend
cd backend/cms
npm run db:init   # crea/actualiza la base ejecutando db/base_completa.sql vía psql
npm run dev       # API en http://localhost:3001 (node --watch)
```

O ejecutar `iniciar-cms.bat` para levantar todo (PostgreSQL local + API + frontend + navegador) en una sola vez.

**No hay scripts de test ni de lint** en ningún package.json.

## Convenciones y gotchas

- **Flujo de datos**: el frontend consulta primero la API (`GET /api/catalog`); si no hay backend usa `localStorage` y luego `catalog/data.json`. Con sesión iniciada, los cambios se envían con `PUT /api/catalog` (debounce) y "Exportar catálogo" escribe `catalog/data.json`.
- **Auth**: token `Authorization: Bearer` guardado en `localStorage` bajo `cms-admin-token` (`AUTH_STORAGE_KEY` en `utils/api.js`). Sesiones httpOnly en Postgres. **No hay admin por defecto**: el primer admin se registra desde el catálogo (botón ADMIN → Crear cuenta, con verificación por correo) o vía `ADMIN_USER`/`ADMIN_PASSWORD` en el backend.
- **Env del backend**: `backend/cms/.env` (copiado desde `.env.example`). `DATABASE_URL`, `ALLOWED_ORIGINS`, `COOKIE_SECURE`, `SMTP_*`, `FRONTEND_URL`. Sin SMTP configurado el correo se loguea por consola y la API devuelve `devLink`.
- **Env del frontend**: `VITE_API_URL`. Vacío → `http://localhost:3001` (dev). En build de producción se define en Cloudflare Pages.
- **Seed no destructivo**: `npm run db:init` no pisa la contraseña del admin ni duplica productos si la tabla ya tiene datos.
- **Acentos/símbolos**: el código y los textos de UI van con tildes reales (UTF-8); `PGCLIENTENCODING=UTF8` está seteado en el `.bat`.
- **Producción**: frontend en Cloudflare Pages (root `cms`, output `dist`, `VITE_API_URL` apuntando al backend), backend en Vercel (root `backend/cms`, `vercel.json` + `api/index.mjs` como serverless), Postgres en Supabase. La API autentica por token, no por cookie cross-site.