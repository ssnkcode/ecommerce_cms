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
├── backend/      # API Express + capa de almacenamiento (en memoria por ahora)
├── db/           # Recursos de base de datos
├── dist/         # Build de producción (se genera con npm run build en cms/)
└── iniciar-cms.bat  # Lanzador: PostgreSQL + API + Frontend + navegador
```

## Stack

- **React 18** + **Vite 5** (frontend CMS y catálogo en un mismo build).
- **Express 4** + **bcryptjs** (API con autenticación por cookie) — puerto `3001`.
- **Almacenamiento en memoria** por ahora (`backend/cms/src/storage.mjs`): al reiniciar el proceso vuelve a los datos de ejemplo. Está pensada para reemplazarse por **PostgreSQL** sin tocar las rutas (misma forma de datos).
- **jsPDF** para la exportación de catálogo a PDF (chunk `a11y`).

## Funcionalidades

### Panel CMS (`cms/`)
- **Navbar**: logo, nombre, modo claro/oscuro, atajos a "Catálogo", "Vista previa" y "Exportar catálogo".
- **Login**: inicia sesión contra la API (`/api/auth/login`), credenciales por defecto `admin` / `admin123`. Sin sesión el CMS sigue funcionando con datos locales (sin sincronizar); con sesión los cambios se sincronizan con el backend automáticamente (debounce).
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
2. Con **sesión iniciada** (`admin` / `admin123`), todos los cambios del CMS se envían al backend (`PUT /api/catalog`, con debounce) y se cachean en `localStorage`. Sin sesión solo se guarda en `localStorage`.
3. El catálogo público consulta primero la API (`GET /api/catalog`, sin login); si no hay backend, usa `localStorage` y, en su defecto, `catalog/data.json`.
4. "Exportar catálogo" genera `catalog/data.json` para que el catálogo "en frío" (sin datos locales ni backend) muestre los cambios.

> Nota: el almacenamiento del backend es **en memoria** por ahora: al reiniciar `npm run dev` vuelve a los datos de ejemplo. Cuando se conecte PostgreSQL, solo se reemplaza el interior de `backend/cms/src/storage.mjs`.

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
cd cms && npm run build        # genera F:\upc\cms\dist

# Backend
cd backend/cms
npm run dev                    # API en http://localhost:3001  (usuarios: admin/admin123)
```

O simplemente ejecutar `iniciar-cms.bat` para levantar todo (PostgreSQL, API, frontend y abrir el navegador).

## Temas

El tema claro/oscuro se guarda en `localStorage` (clave `theme`) y se aplica a ambos sitios vía atributo `data-theme` sobre el `<html>`. Los colores compartidos están en `utils/tokens.css` (variables CSS, incluidos `--success`, `--amber` e `--indigo` usados en los botones destacados del CMS y el catálogo).