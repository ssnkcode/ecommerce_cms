#!/usr/bin/env node
// ============================================================================
//  EXPORT-LOCAL-JSON — Flujo "local-first" de publicación
//  ----------------------------------------------------------------------------
//  Exporta el catálogo desde PostgreSQL (la base local/supabase que apunta
//  DATABASE_URL) hacia un único JSON estático listo para desplegar.
//
//  Datos de salida:
//    - catalog/data.json   (RAÍZ del catálogo: el frontend lo consume en
//                           /catalog/data.json, ver utils/datos.js).
//    - Se puede redefinir con la variable CATALOG_JSON_PATH (ruta absoluta o
//      relativa a la raíz del proyecto).
//
//  Conexión (en orden de prioridad):
//    1) variable de entorno DATABASE_URL
//    2) backend/cms/.env   (configuración local del proyecto)
//
//  El script se resuelve siempre desde su propia ubicación (import.meta.url),
//  por lo que es totalmente portable: funciona sin importar en qué carpeta o
//  unidad de disco esté el proyecto.
//
//  Comportamiento ante error de base de datos:
//    - Si ya existe catalog/data.json, avisa y continúa usando la exportación
//      previa (ideal para builds offline / CI sin acceso a la base).
//    - Si no existe, sale con error (código != 0) para abortar el build.
//
//  Uso:   node ./db/export-local-json.mjs
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname, isAbsolute, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url)) // <proyecto>/db
const root = join(scriptDir, '..')
const DEFAULT_OUTPUT = join(root, 'catalog', 'data.json')

// Mapeo snake_case (base de datos) <-> camelCase (JSON/frontend).
// Mismo contrato que backend/cms/src/mapDatos.mjs (KEY_MAP / REVERSE_MAP).
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

function settingsFromRows(rows) {
  const out = {}
  for (const row of rows) {
    const jsKey = REVERSE_MAP[row.key] || row.key
    out[jsKey] = row.value
  }
  return out
}

function productToJson(row) {
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

// Resuelve la ruta de salida: absoluta tal cual, relativa al root del proyecto.
function resolveOutput() {
  const p = process.env.CATALOG_JSON_PATH
  if (!p) return DEFAULT_OUTPUT
  return isAbsolute(p) ? p : join(root, p)
}

// DATABASE_URL: variable de entorno o backend/cms/.env.
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim()
  }
  const envFile = join(root, 'backend', 'cms', '.env')
  try {
    const text = readFileSync(envFile, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/)
      if (m && m[1]) {
        return m[1].trim().replace(/^['"]|['"]$/g, '')
      }
    }
  } catch (_) {
    /* el archivo .env puede no existir: se usa solo la variable de entorno */
  }
  return ''
}

function resolvePg() {
  // pg no está en el root del proyecto; se resuelve desde el backend
  // (backend/cms/node_modules) usando la config de ese package como ancla.
  const require = createRequire(join(root, 'backend', 'cms', 'package.json'))
  return require('pg')
}

async function main() {
  const outputFile = resolveOutput()
  console.log('[EXPORT] Exportando catálogo desde PostgreSQL hacia JSON...')

  const url = loadDatabaseUrl()
  if (!url) {
    throw new Error(
      'No se encontró DATABASE_URL. Definí la variable de entorno o completá backend/cms/.env',
    )
  }

  let pg
  try {
    pg = resolvePg()
  } catch (err) {
    throw new Error(
      'No se pudo cargar "pg". Ejecutá `npm install` dentro de backend/cms (' +
        err.message +
        ')',
    )
  }

  const { Pool } = pg
  const pool = new Pool({ connectionString: url, max: 5 })

  let settings
  let products
  try {
    const [settingsRes, productsRes] = await Promise.all([
      pool.query('SELECT key, value FROM cms_settings'),
      pool.query('SELECT * FROM products ORDER BY id'),
    ])
    settings = settingsFromRows(settingsRes.rows)
    products = productsRes.rows.map(productToJson)
  } finally {
    await pool.end().catch(() => {})
  }

  // Formato idéntico al que genera el CMS / deploy-sync.mjs (utils/datos.js lo
  // consume y la build lo copia tal cual a dist/catalog/data.json).
  const catalog = {
    settings,
    products,
  }

  mkdirSync(dirname(outputFile), { recursive: true })
  writeFileSync(outputFile, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
  console.log(`  OK: ${products.length} productos exportados.`)
  console.log(`  Archivo: ${relative(root, outputFile)}`)
}

main().catch((err) => {
  const outputFile = resolveOutput()
  console.error(`[EXPORT] ERROR: ${err.message}`)
  // Fallback local-first: si hubo una exportación previa, la conservamos y
  // seguimos (el build mantiene el catálogo publicado; la web no queda vacía).
  if (existsSync(outputFile)) {
    console.warn(
      `  Aviso: la base no está disponible. Se usa la exportación previa de ${relative(root, outputFile)}.`,
    )
    process.exit(0)
  }
  process.exit(1)
})