# Commerce CMS

Panel de administración (CMS) + catálogo digital para el comercio **SsnkCode** (polirrubro).

Sistema para gestionar los productos, categorías y textos de un catálogo online, con exportación a PDF, pedidos por WhatsApp y tema claro/oscuro.

**Autor:** Sasinka Cristian (ssnkcode)

## Estructura

```
cms/
├── cms/          # Panel CMS (React + Vite)  -> http://localhost:5178/cms/
├── catalog/      # Catálogo público (React)  -> http://localhost:5178/catalog/catalog.html
├── utils/        # Lógica compartida (datos, iconos, accesibilidad, formato, cliente API)
├── backend/      # API Express + capa de almacenamiento (PostgreSQL)
├── db/           # Script de base de datos (base_completa.sql, canónico)
├── cms/dist/         # Build de producción (se genera con npm run build en cms/)
└── iniciar-cms.bat  # Lanzador: PostgreSQL + API + Frontend + navegador
```

## Stack

- **React 18** + **Vite 5** (frontend CMS y catálogo en un mismo build).
- **Express 4** + **bcryptjs** (API con autenticación por token `Authorization: Bearer`, sesiones en Postgres) — puerto `3001`.
- **PostgreSQL** como almacenamiento real (`backend/cms/src/storage.mjs` usa el pool de `db.mjs`): settings, productos, admins, sesiones e intentos de login. Al reiniciar el backend **no se pierde nada**. La forma de los datos que devuelve es la misma que tenía la versión en memoria, así las rutas no cambiaron su contrato.
- **jsPDF** para la exportación de catálogo a PDF (chunk `a11y`).

## Funcionalidades

### Panel CMS (`cms/`)
- **Navbar**: logo, nombre, modo claro/oscuro, atajos a "Catálogo", "Vista previa" y "Exportar catálogo".
- **Login**: inicia sesión contra la API (`/api/auth/login`) con correo electrónico o nombre de usuario. Las cuentas se crean desde el catálogo (botón ADMIN) con verificación por correo electrónico. Sin sesión el CMS sigue funcionando con datos locales (sin sincronizar); con sesión los cambios se sincronizan con el backend automáticamente (debounce).
- **Hero**: edición de nombre del negocio, eslogan, título y color de las letras, e imagen de fondo. La imagen del hero **solo se aplica al catálogo**; el hero del CMS mantiene su aspecto fijo.
- **Productos**: alta, edición y borrado. Auto-guardado en el navegador (`localStorage`) y sincronizado al backend si hay sesión.
- **Categorías** (CRUD desde el modal "Categorías"):
  - Borrador: los cambios se aplican solo al **Guardar** (Guardar no cierra el modal).
  - **Restaurar**: descarta los cambios pendientes o deshace el último guardado (incluso una eliminación), en cadena.
  - Edición por fila con "Guardar" / "Restaurar al estado anterior" (Enter guarda, Escape cancela).
- **Exportar catálogo**: escribe `catalog/data.json` con los cambios.
- **Exportación a PDF** configurable: nombre del negocio, modo de lista, imágenes, fecha y agrupación por categoría.

### Catálogo (`catalog/`)
- **Hero**: eslogan (con soporte de negrita `**texto**`), título, imagen de fondo (según lo seteado en el CMS) y panel "esmerilado" con `backdrop-filter` en modo claro.
- **Navbar** fija con toggle de tema, contador de carrito e iconos visibles en ambos temas.
- **Productos**: tarjetas con filtros, búsqueda y detalle con galería y especificaciones.
- **Carrito**: drawer lateral, total, vaciar y pedido por **WhatsApp**.
- **SEO**: títulos/descripciones dinámicas por producto.
- **Compartir** en redes y botones flotantes.

## Flujo de datos

1. El CMS carga los datos desde la API (`GET /api/catalog`); si el backend no está disponible, usa `localStorage` y, en su defecto, `catalog/data.json`.
2. Con **sesión iniciada** (tu cuenta creada desde el catálogo), todos los cambios del CMS se envían al backend (`PUT /api/catalog`, con debounce) y se cachean en `localStorage`. Sin sesión solo se guarda en `localStorage`.
3. El catálogo público consulta primero la API (`GET /api/catalog`, sin login); si no hay backend, usa `localStorage` y, en su defecto, `catalog/data.json`.
4. "Exportar catálogo" genera `catalog/data.json` para que el catálogo "en frío" (sin datos locales ni backend) muestre los cambios.

> Nota: el almacenamiento del backend es **PostgreSQL real**. En `backend/cms/src/storage.mjs` se usa el pool de `db.mjs` (settings, productos, admins, sesiones e intentos de login). Para crear/actualizar la base se corre `npm run db:init`, que ejecuta el script canónico `db/base_completa.sql` vía psql. El seed es **no destructivo** y **no crea ningún usuario por defecto**: el primer admin se registra desde el catálogo (botón ADMIN → Crear cuenta, con verificación por correo) o vía `ADMIN_USER`/`ADMIN_PASSWORD` en el entorno. Los productos de ejemplo se insertan solo si la tabla está vacía.

## Formato de textos

En eslogan/títulos que se renderizan con `renderBold` (`utils/formato.jsx`), se puede escribir `**palabra**` para mostrar esa parte en negrita, p. ej.:

```
Mirá nuestro catálogo online y consegui precios exclusivos **HOY MISMO**!!!
```

## Comandos

```bash
# Frontend (desarrollo)
cd cms && npm run dev          # http://localhost:5178/cms/  y  /catalog/catalog.html

# Build de producción
cd cms && npm run build        # genera cms/dist

# Backend
cd backend/cms
npm run db:init                 # Crea/actualiza la base (db/base_completa.sql) vía psql
npm run dev                     # API en http://localhost:3001
```

O simplemente ejecutar `iniciar-cms.bat` para levantar todo (PostgreSQL, API, frontend y abrir el navegador en el **catálogo**). El acceso al panel queda en `http://localhost:5178/cms/`.

## Despliegue (Cloudflare Pages + Vercel + Supabase)

Arquitectura en producción: **frontend estático** en Cloudflare Pages, **API Express** en Vercel (serverless) y **PostgreSQL** en Supabase.

### 0) Correo electrónico (cuentas y recuperación de contraseña)

El registro de usuarios y la recuperación de contraseña envían un correo (verificación / enlace de recuperación). Configurá un SMTP en el backend (`backend/cms/.env`):

- `FRONTEND_URL`: URL pública del catálogo (se usa en los enlaces de los correos). En producción, tu dominio de Cloudflare Pages, p. ej. `https://mi-tienda.pages.dev`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: datos de tu proveedor de correo (Gmail, Resend, Brevo, etc.).

Sin SMTP configurado, el backend **no envía mails reales**: loguea el contenido por consola y devuelve el enlace en la respuesta de la API (`devLink`), que la interfaz muestra en pantalla. Sirve para probar el flujo en desarrollo.

### 1) Base de datos (Supabase)

1. Creá un proyecto gratuito en [supabase.com](https://supabase.com).
2. Abrí **SQL Editor** y pegá/corré el contenido de `db/base_completa.sql` (crea tablas, settings y productos de ejemplo).
   - **No se crea ningún usuario por defecto.** El primer administrador se registra desde el catálogo (`/catalog/catalog.html` → botón **ADMIN** → **Crear cuenta**), con verificación por correo electrónico.
3. Copiá el *connection string* (**Project Settings → Database → Connection strings**, modo que incluya `sslmode=require`). Se usa únicamente como `DATABASE_URL` del backend.

### 2) Backend (Vercel)

1. Importá el proyecto en [vercel.com](https://vercel.com) con **root directory** = `backend/cms`.
2. Variables de entorno del proyecto:
   - `DATABASE_URL=<connection string de Supabase>`
   - `ALLOWED_ORIGINS=https://<tu-proyecto>.pages.dev,https://<tu-dominio.com>`
   - `COOKIE_SECURE=true`
   - `FRONTEND_URL=https://<tu-proyecto>.pages.dev`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (para los correos de cuenta/recovery)
3. El build se auto-configura con `vercel.json` + `api/index.mjs` (Express como serverless function). El panel CMS se autentica por **token** (`Authorization: Bearer`), así funciona entre dominios sin cookies cross-site.

### 3) Frontend (Cloudflare Pages)

1. Importá el repo en [Cloudflare Pages](https://pages.cloudflare.com) con:
   - **Root directory** = `cms`
   - **Build command** = `npm run build`
   - **Build output directory** = `dist`
2. Variable de entorno de build:
   - `VITE_API_URL=https://<tu-backend>.vercel.app`
3. La compilación genera `cms/dist` con `/cms/` (panel), `/catalog/catalog.html` (catálogo) y `_redirects`.

### 4) Verificación

- `GET https://<tu-backend>.vercel.app/api/health` → `{ ok: true, ... }`
- Abrí el catálogo (`/catalog/catalog.html`) y el panel (`/cms/`), creá tu cuenta (botón ADMIN → Crear cuenta) e iniciá sesión para confirmar la sincronización.

> Nota: con `VITE_API_URL` vacío (o sin la variable) el frontend usa `http://localhost:3001` (solo desarrollo).

## Temas

El tema claro/oscuro se guarda en `localStorage` (clave `theme`) y se aplica a ambos sitios vía atributo `data-theme` sobre el `<html>`. Los colores compartidos están en `utils/tokens.css` (variables CSS, incluidos `--success`, `--amber` e `--indigo` usados en los botones destacados del CMS y el catálogo).