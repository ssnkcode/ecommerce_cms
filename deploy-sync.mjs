// ============================================================================
//  DEPLOY-SYNC — Sincroniza el catálogo local hacia la base de PRODUCCIÓN
//  ----------------------------------------------------------------------------
//  Flujo "edito en local (computadora) y con el botón de deploy la web se
//  actualiza":
//
//    1) Toma los datos locales desde:
//         a) la API local (http://localhost:3001) si el backend local está
//            corriendo (fuente fresca de la base de datos local), o
//         b) catalog/data.json como respaldo (último "Exportar catálogo").
//    2) Inicia sesión en el backend de producción (Vercel) con las
//       credenciales de deploy-secrets.json (o variables de entorno
//       PROD_API_URL / PROD_ADMIN_USER / PROD_ADMIN_PASSWORD).
//    3) Une el catálogo de producción con lo local (nunca borra) y sobrescribe
//       el catálogo de producción (PUT /api/catalog). Al final deja catalog/data.json
//       fresco para que el próximo deploy no quede desincronizado.
//
//  Uso:   node deploy-sync.mjs
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(root, 'backend', 'cms', 'package.json'))
const SECRETS_FILE = join(root, 'deploy-secrets.json')

function loadSecrets() {
  const fromEnv = {
    apiUrl: process.env.PROD_API_URL || '',
    username: process.env.PROD_ADMIN_USER || '',
    password: process.env.PROD_ADMIN_PASSWORD || '',
  }
  if (existsSync(SECRETS_FILE)) {
    try {
      const s = JSON.parse(readFileSync(SECRETS_FILE, 'utf8'))
      return {
        apiUrl: s.apiUrl || fromEnv.apiUrl,
        username: s.username || fromEnv.username,
        password: s.password || fromEnv.password,
      }
    } catch (_) {
      return fromEnv
    }
  }
  return fromEnv
}

async function loadDatabaseUrl() {
  // La base de producción y la local comparten el MISMO Supabase: se lee
  // DATABASE_URL de backend/cms/.env para escribir directo (rápido, sin pasar
  // por la función de Vercel ni su límite de tiempo).
  const envFile = join(root, 'backend', 'cms', '.env')
  try {
    const text = readFileSync(envFile, 'utf8')
    const line = text.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l))
    if (!line) return ''
    return line.replace(/^\s*DATABASE_URL\s*=\s*/, '').replace(/^['"]|['"]$/g, '').trim()
  } catch (_) {
    return ''
  }
}

// Escribe el catálogo DIRECTO en la base (1 solo INSERT en lote). Es la vía que
// evita el timeout (504) de la función serverless de Vercel con muchos productos.
// Si la tabla está bloqueada (por un PUT viejo del backend que tarda), reintenta.
async function writeCatalogDirect(settings, products) {
  const url = await loadDatabaseUrl()
  if (!url) return null
  let pg
  try {
    pg = require('pg')
  } catch (_) {
    return null
  }
  const { Pool } = pg
  const keyMap = {
    siteName: 'site_name',
    tagline: 'tagline',
    heroTitle: 'hero_title',
    productsTitle: 'products_title',
    heroTextColor: 'hero_text_color',
    heroImage: 'hero_image',
    heroImageSize: 'hero_image_size',
    logo: 'logo',
    logoSize: 'logo_size',
    whatsapp: 'whatsapp',
    whatsappFooter: 'whatsapp_footer',
    categories: 'categories',
    pdfShowImages: 'pdf_show_images',
    pdfGroupByCategory: 'pdf_group_by_category',
  }

  const list = Array.isArray(products) ? products : []
  const mapped = list
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const specs = Array.isArray(item.specs)
        ? item.specs.map((s) => String(s)).join('\n')
        : typeof item.specs === 'string' ? item.specs : ''
      const gallery = Array.isArray(item.gallery)
        ? item.gallery.filter((g) => typeof g === 'string' && g.trim()).slice(0, 12)
        : []
      return {
        id: item.id != null ? Number(item.id) : undefined,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Producto sin título',
        description: typeof item.description === 'string' ? item.description : '',
        price: Number(item.price) || 0,
        category: typeof item.category === 'string' ? item.category : '',
        image: typeof item.image === 'string' ? item.image : '',
        gallery,
        specs,
      }
    })

  for (let attempt = 1; attempt <= 3; attempt++) {
    const pool = new Pool({ connectionString: url })
    try {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        // Settings: mapeo igual que el backend (KEY_MAP).
        const settingsEntries = Object.entries(settings || {}).filter(([, v]) => v !== undefined && v !== null)
        for (const [jsKey, value] of settingsEntries) {
          const dbKey = keyMap[jsKey] || String(jsKey)
          await client.query(
            `INSERT INTO cms_settings (key, value, updated_at) VALUES ($1, $2, now())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
            [dbKey, JSON.stringify(value)],
          )
        }

        await client.query('DELETE FROM products')

        if (mapped.length > 0) {
          const { rows: existing } = await client.query('SELECT id, created_at FROM products')
          const createdBy = new Map(existing.map((r) => [String(r.id), r.created_at]))
          const values = []
          const params = []
          let i = 1
          for (const p of mapped) {
            values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}::jsonb, $${i + 7}, now(), $${i + 8})`)
            params.push(
              p.id ?? null,
              p.title,
              p.description,
              p.price,
              p.category,
              p.image,
              JSON.stringify(p.gallery),
              p.specs,
              createdBy.get(String(p.id)) || 'now()',
            )
            i += 9
          }
          await client.query(
            `INSERT INTO products
               (id, title, description, price, category, image, gallery, specs, updated_at, created_at)
             VALUES ${values.join(', ')}
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               price = EXCLUDED.price,
               category = EXCLUDED.category,
               image = EXCLUDED.image,
               gallery = EXCLUDED.gallery,
               specs = EXCLUDED.specs,
               updated_at = now()`,
            params,
          )
        }

        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
      console.log(`  Base directa: ${mapped.length} productos escritos en 1 lote.`)
      return { direct: true, count: mapped.length }
    } catch (err) {
      const msg = String(err.message || err)
      const locked = /timeout|lock|busy|deadlock|prepared statement/i.test(msg)
      console.warn(`  Intento directo ${attempt}/3 falló (${msg}).`)
      if (attempt < 3 && locked) {
        await new Promise((r) => setTimeout(r, 8000))
        continue
      }
      await pool.end().catch(() => {})
      return null
    } finally {
      await pool.end().catch(() => {})
    }
  }
  return null
}

async function fetchLocalCatalog() {
  // a) API local en funcionamiento (fuente fresca de la base local).
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 10000)
    const res = await fetch('http://localhost:3001/api/catalog', { signal: ac.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.products)) {
        console.log(`  Fuente: API local (http://localhost:3001)  ->  ${data.products.length} productos`)
        return { source: 'api', data }
      }
    }
  } catch (_) {
    /* backend local no disponible */
  }

  // b) Respaldo: catalog/data.json (último "Exportar catálogo" del CMS).
  const dataFile = join(root, 'catalog', 'data.json')
  if (existsSync(dataFile)) {
    const data = JSON.parse(readFileSync(dataFile, 'utf8'))
    if (data && Array.isArray(data.products)) {
      console.log(`  Fuente: catalog/data.json (respaldo)        ->  ${data.products.length} productos`)
      return { source: 'data.json', data }
    }
  }
  throw new Error('No hay datos locales: levantá el backend local o exportá el catálogo (catalog/data.json).')
}

// Une el catálogo de PRODUCCIÓN con el LOCAL sin borrar nada:
// - producción es la base (nunca se pierde un producto publicado).
// - los productos que existan SOLO en lo local (ej. respaldo con ediciones que
//   todavía no subieron) se conservan y se AGREGAN a la web.
// De esta manera un respaldo viejo NO destruye estado y los cambios locales
// terminan desplegados, en vez de abortar todo.
function unionCatalogs(prod, local) {
  const byId = new Map()
  for (const p of Array.isArray(prod.products) ? prod.products : []) {
    if (p && p.id != null) byId.set(String(p.id), p)
  }
  const added = []
  for (const p of Array.isArray(local.products) ? local.products : []) {
    if (!p || p.id == null || p.id === '') continue
    if (!byId.has(String(p.id))) added.push(p)
  }
  const settings =
    prod.settings && Object.keys(prod.settings).length ? prod.settings : local.settings || prod.settings
  return { settings, products: [...(Array.isArray(prod.products) ? prod.products : []), ...added], added }
}

async function main() {
  const { apiUrl, username, password } = loadSecrets()
  const base = (apiUrl || '').trim().replace(/\/+$/, '')
  if (!base || !username || !password) {
    console.error('[SYNC] Falta configuracion. Creamos el archivo deploy-secrets.json con:')
    console.error('  { "apiUrl": "https://TU-BACKEND.vercel.app", "username": "TU_ADMIN", "password": "TU_CONTRASENA" }')
    console.error('  O definí las variables PROD_API_URL / PROD_ADMIN_USER / PROD_ADMIN_PASSWORD.')
    process.exit(1)
  }

  console.log()
  console.log('[SYNC] Sincronizando catálogo LOCAL <-> PRODUCCIÓN')
  console.log(`  API    : ${base}`)
  const { source: catalogSource, data: localCatalog } = await fetchLocalCatalog()

  // Trae el catálogo actual de producción para unir (nunca borrar) con lo local.
  let catalog = localCatalog
  try {
    const prodRes = await fetch(`${base}/api/catalog`)
    const prod = await prodRes.json().catch(() => ({}))
    if (prodRes.ok && Array.isArray(prod.products)) {
      const union = unionCatalogs(prod, localCatalog)
      if (union.added.length) {
        console.log(`  Producción actual : ${prod.products.length} productos`)
        console.log(`  Locales SOLO en el respaldo: ${union.added.length} producto(s) → se agregan a la web.`)
      } else {
        console.log(`  Producción actual : ${prod.products.length} productos (respaldo local sin cambios nuevos).`)
      }
      catalog = { settings: union.settings, products: union.products }
    }
  } catch (_) {
    console.error(
      '\n[SYNC] No se pudo consultar producción para hacer la unión.\n  Se aborta la parte de datos para NO arriesgar una sobrescritura incorrecta (el deploy del código continúa).',
    )
    process.exit(1)
  }

  // 1) Vía directa (rápida, evita el 504 de Vercel): escribir directo a la base.
  let directSave = null
  try {
    directSave = await writeCatalogDirect(catalog.settings, catalog.products)
  } catch (err) {
    console.warn(`  Aviso: la escritura directa a la base falló (${err.message}). Se usa la API con reintentos.`)
  }

  if (!directSave) {
    // 2) Respaldo: API (login + PUT), con reintentos por 504/timeout pasajeros.
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username, password }),
    })
    const loginBody = await login.json().catch(() => ({}))
    if (!login.ok || !loginBody.token) {
      console.error(`[SYNC] No se pudo iniciar sesión (${login.status}): ${loginBody.error || 'revisá las credenciales en deploy-secrets.json'}`)
      process.exit(1)
    }

    let saveRes = null
    let saveBody = {}
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`${base}/api/catalog`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginBody.token}` },
        body: JSON.stringify({ settings: catalog.settings, products: catalog.products }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        saveRes = res
        saveBody = body
        break
      }
      console.warn(`  PUT vía API intento ${attempt}/3 falló (${res.status}): ${body.error || ''}`)
      await new Promise((r) => setTimeout(r, 2000))
    }
    if (!saveRes || !saveRes.ok) {
      console.error(`[SYNC] No se pudo guardar en producción (vía API). Revisá el backend.`)
      process.exit(1)
    }
    const saved = Array.isArray(saveBody.products) ? saveBody.products.length : '?'
    console.log(`[SYNC] OK! ${saved} productos sincronizados a la base de producción (vía API).`)
  }

  // Mantiene catalog/data.json fresco: se respalda la unión resultante, así el
  // próximo deploy parte de la base y no vuelve a quedar desincronizado.
  try {
    const dataFile = join(root, 'catalog', 'data.json')
    writeFileSync(dataFile, JSON.stringify({ settings: catalog.settings, products: catalog.products }, null, 2), 'utf8')
    console.log(`  catalog/data.json actualizado a ${catalog.products.length} productos.`)
  } catch (err) {
    console.warn(`  Aviso: no se pudo actualizar catalog/data.json (${err.message}).`)
  }
}

main().catch((err) => {
  console.error('[SYNC] ERROR:', err.message)
  process.exit(1)
})