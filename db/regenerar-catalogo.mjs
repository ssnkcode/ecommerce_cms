#!/usr/bin/env node
// ============================================================================
//  REGENERAR-CATALOGO — "Ctrl+Z" del catálogo
//  ----------------------------------------------------------------------------
//  Restaura el catálogo si se borró por accidente. Orden de recuperación:
//
//    1) BASE DE DATOS: si tiene productos, regenera catalog/data.json desde
//       ahí (caso normal: se borró el JSON, o se quiere refrescar).
//    2) WEB PUBLICADA: si la base quedó vacía (ej. "Borrar todo" con sesión),
//       se baja el catálogo desde https://saska-shop.pages.dev/catalog/data.json
//       y se vuelve a escribir en la base Y en catalog/data.json.
//    3) RESPALDO LOCAL: si la web no responde, se usa catalog/data.json.bak.
//
//  Antes de tocar cualquier cosa guarda una copia con marca de tiempo del
//  data.json actual en catalog/data.json.bak-AAAA-MM-DD-HHmmss (conservando el
//  histórico hasta 10 copias).
//
//  Uso:   node ./db/regenerar-catalogo.mjs
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url)) // <proyecto>/db
const root = join(scriptDir, '..')
const DATA_FILE = join(root, 'catalog', 'data.json')
const BAK_FILE = join(root, 'catalog', 'data.json.bak')
const DEPLOYED_URL = 'https://saska-shop.pages.dev/catalog/data.json'
const MAX_BACKUPS = 10

const KEY_MAP = {
  siteName: 'site_name',
  tagline: 'tagline',
  heroTitle: 'hero_title',
  heroTextColor: 'hero_text_color',
  heroImage: 'hero_image',
  heroImageSize: 'hero_image_size',
  productsTitle: 'products_title',
  logo: 'logo',
  logoSize: 'logo_size',
  whatsapp: 'whatsapp',
  whatsappFooter: 'whatsapp_footer',
}

const REVERSE_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([jsKey, dbKey]) => [dbKey, jsKey]),
)

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim()
  }
  const envFile = join(root, 'backend', 'cms', '.env')
  try {
    const text = readFileSync(envFile, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/)
      if (m && m[1]) return m[1].trim().replace(/^['"]|['"]$/g, '')
    }
  } catch (_) {}
  return ''
}

function readJson(path) {
  try {
    if (!existsSync(path)) return null
    const data = JSON.parse(readFileSync(path, 'utf8'))
    if (data && typeof data === 'object') return data
  } catch (_) {}
  return null
}

function saveJson(path, catalog) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
}

function normalize(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || '',
    price: Number(row.price),
    category: row.category || '',
    image: row.image || '',
    gallery: Array.isArray(row.gallery) ? [...row.gallery] : [],
    specs: row.specs || '',
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Copia de seguridad previa (mantiene el histórico con marca de tiempo).
function backupCurrent() {
  const current = readJson(DATA_FILE)
  if (!current || !Array.isArray(current.products) || current.products.length === 0) return
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
  const file = join(root, 'catalog', `data.json.bak-${stamp}`)
  saveJson(file, current)
  console.log(`  Respaldo previo: ${file}`)
  // Limita la cantidad de respaldos viejos.
  try {
    const files = readdirSync(join(root, 'catalog'))
      .filter((f) => /^data\.json\.bak-\d{4}-/.test(f))
      .sort()
    while (files.length > MAX_BACKUPS) {
      rmSync(join(root, 'catalog', files.shift()), { force: true })
    }
  } catch (_) {}
}

async function fetchCatalogFromDb() {
  const url = loadDatabaseUrl()
  if (!url) {
    console.error('  ERROR: no hay DATABASE_URL (variable de entorno o backend/cms/.env).')
    return null
  }
  let pg
  try {
    const require = createRequire(join(root, 'backend', 'cms', 'package.json'))
    pg = require('pg')
  } catch (err) {
    console.error('  ERROR: no se pudo cargar "pg": ' + err.message)
    return null
  }
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  try {
    const [settingsRes, productsRes] = await Promise.all([
      pool.query('SELECT key, value FROM cms_settings'),
      pool.query('SELECT * FROM products ORDER BY id'),
    ])
    const settings = {}
    for (const row of settingsRes.rows) {
      settings[REVERSE_MAP[row.key] || row.key] = row.value
    }
    return { settings, products: productsRes.rows.map(normalize) }
  } catch (err) {
    console.error('  ERROR al leer la base: ' + err.message)
    return null
  } finally {
    await pool.end().catch(() => {})
  }
}

async function fetchDeployed() {
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 15000)
    const res = await fetch(DEPLOYED_URL, { signal: ac.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (data && Array.isArray(data.products)) return data
  } catch (err) {
    console.error('  ERROR al bajar la web publicada: ' + err.message)
  }
  return null
}

// Sube el catálogo recuperado a la base (así la API de producción también vuelve).
async function pushCatalogToDb(catalog) {
  const url = loadDatabaseUrl()
  if (!url) return false
  let pg
  try {
    const require = createRequire(join(root, 'backend', 'cms', 'package.json'))
    pg = require('pg')
  } catch {
    return false
  }
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  const mapped = (catalog.products || [])
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({
      id: p.id != null ? Number(p.id) : undefined,
      title: typeof p.title === 'string' && p.title.trim() ? p.title.trim() : 'Producto sin título',
      description: typeof p.description === 'string' ? p.description : '',
      price: Number(p.price) || 0,
      category: typeof p.category === 'string' ? p.category : '',
      image: typeof p.image === 'string' ? p.image : '',
      gallery: Array.isArray(p.gallery) ? p.gallery.filter((g) => typeof g === 'string' && g.trim()).slice(0, 12) : [],
      specs: Array.isArray(p.specs) ? p.specs.map((s) => String(s)).join('\n') : typeof p.specs === 'string' ? p.specs : '',
      createdAt: p.createdAt || null,
    }))
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const [jsKey, value] of Object.entries(catalog.settings || {})) {
      const dbKey = KEY_MAP[jsKey] || String(jsKey)
      await client.query(
        `INSERT INTO cms_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [dbKey, JSON.stringify(value)],
      )
    }
    await client.query('DELETE FROM products')
    if (mapped.length > 0) {
      const values = []
      const params = []
      let i = 1
      for (const p of mapped) {
        values.push(
          `($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}::jsonb, $${i + 7}, now(), COALESCE($${i + 8}::timestamptz, now()))`,
        )
        params.push(
          p.id ?? null,
          p.title,
          p.description,
          p.price,
          p.category,
          p.image,
          JSON.stringify(p.gallery),
          p.specs,
          p.createdAt || null,
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
    console.log(`  Base de datos restaurada con ${mapped.length} productos.`)
    return true
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('  ERROR al escribir en la base: ' + err.message)
    return false
  } finally {
    client.release()
    await pool.end().catch(() => {})
  }
}

function normalizeCatalogParts(raw) {
  return {
    settings: raw.settings || {},
    products: Array.isArray(raw.products) ? raw.products : [],
  }
}

async function main() {
  console.log('[REGEN] Regenerando catálogo...')
  backupCurrent()

  // 1) Base de datos (fuente principal).
  const fromDb = await fetchCatalogFromDb()
  if (fromDb && fromDb.products.length > 0) {
    saveJson(DATA_FILE, fromDb)
    console.log(`  [1/3] Regenerado desde la base: ${fromDb.products.length} productos.`)
    console.log(`  Archivo: catalog\\data.json`)
    return
  }
  if (fromDb) {
    console.log('  [1/3] La base está vacía (se borró todo). Buscando otra fuente...')
  } else {
    console.log('  [1/3] La base no respondió. Buscando otra fuente...')
  }

  // 2) Web publicada (último despliegue bueno).
  const deployed = await fetchDeployed()
  if (deployed && deployed.products.length > 0) {
    const catalog = normalizeCatalogParts(deployed)
    saveJson(DATA_FILE, catalog)
    console.log(`  [2/3] Recuperado desde la web publicada: ${catalog.products.length} productos.`)
    await pushCatalogToDb(catalog)
    console.log(`  Archivo: catalog\\data.json`)
    return
  }

  // 3) Respaldo local.
  const localBackup = readJson(BAK_FILE)
  if (localBackup && Array.isArray(localBackup.products) && localBackup.products.length > 0) {
    const catalog = normalizeCatalogParts(localBackup)
    saveJson(DATA_FILE, catalog)
    console.log(`  [3/3] Recuperado desde catalog/data.json.bak: ${catalog.products.length} productos.`)
    await pushCatalogToDb(catalog)
    console.log(`  Archivo: catalog\\data.json`)
    return
  }

  console.error('[REGEN] No hay ninguna fuente para regenerar el catálogo.')
  console.error('  - Base vacía o inaccesible.')
  console.error('  - La web publicada no respondió.')
  console.error('  - No hay catalog/data.json.bak con datos.')
  process.exit(1)
}

main().catch((err) => {
  console.error('[REGEN] ERROR:', err.message)
  process.exit(1)
})