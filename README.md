# Commerce CMS

Panel de administración (CMS) + catálogo digital para el comercio **SsnkCode** (polirrubro).

Sistema para gestionar los productos, categorías y textos de un catálogo online, con exportación a PDF, pedidos por WhatsApp y tema claro/oscuro.

**Autor:** Sasinka Cristian (ssnkcode)

## Estructura

```
cms/
├── cms/          # Panel CMS (React + Vite)  -> http://localhost:5178/cms/
├── catalog/      # Catálogo público (React)  -> http://localhost:5178/catalog/catalog.html
├── utils/        # Lógica compartida (datos, iconos, accesibilidad, formato)
├── backend/      # API Express + PostgreSQL
├── db/           # Recursos de base de datos
├── dist/         # Build de producción (se genera con npm run build en cms/)
└── iniciar-cms.bat  # Lanzador: PostgreSQL + API + Frontend + navegador
```

## Stack

- **React 18** + **Vite 5** (frontend CMS y catálogo en un mismo build).
- **Express 4** + **pg** + **bcryptjs** (API con autenticación y PostgreSQL) — puerto `3001`.
- **jsPDF** para la exportación de catálogo a PDF (chunk `a11y`).

## Funcionalidades

### Panel CMS (`cms/`)
- **Navbar**: logo, nombre, modo claro/oscuro, atajos a "Catálogo", "Vista previa" y "Exportar catálogo".
- **Login**: credenciales por defecto `admin` / `admin123` (solicitables a la API).
- **Hero**: edición de nombre del negocio, eslogan, título y subtítulo, e imagen de fondo. La imagen del hero **solo se aplica al catálogo**; el hero del CMS mantiene su aspecto fijo.
- **Productos**: alta, edición y borrado. Auto-guardado en el navegador (`localStorage`).
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

1. El CMS carga/guarda los datos en `localStorage` (clave `commerce-cms-data`).
2. El catálogo usa **primero** lo guardado en `localStorage`; si no hay nada, obtiene `catalog/data.json`.
3. "Exportar catálogo" genera `catalog/data.json` para que el catálogo "en frío" (sin datos locales) muestre los cambios.

> Nota: si el navegador ya tiene datos guardados, estos prevalecen sobre los defaults de `catalog/data.json`. Para forzar los valores por defecto, borrar los datos guardados en el navegador (localStorage).

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
npm run db:init                # inicializa la base / esquemas (SQL en backend/cms/sql)
npm run dev                    # API en http://localhost:3001
```

O simplemente ejecutar `iniciar-cms.bat` para levantar todo (PostgreSQL, API, frontend y abrir el navegador).

## Temas

El tema claro/oscuro se guarda en `localStorage` (clave `theme`) y se aplica a ambos sitios vía atributo `data-theme` sobre el `<html>`. Los colores compartidos están en `utils/tokens.css` (variables CSS, incluidos `--success`, `--amber` e `--indigo` usados en los botones destacados del CMS y el catálogo).