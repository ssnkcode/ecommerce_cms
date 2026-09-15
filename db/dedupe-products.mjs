#!/usr/bin/env node
// ============================================================================
//  DEDUPE-PRODUCTS — Elimina productos duplicados por nombre en la base
//  ----------------------------------------------------------------------------
//  Detecta filas de products que comparten el mismo título (ignorando
//  mayúsculas, tildes y espacios duplicados) y conserva UNA sola: la de
//  updated_at más reciente. Elimina el resto.
//
//  Por qué pasan los duplicados: se creó el mismo producto 2 veces (mismo
//  nombre, IDs distintos), por ejemplo al volver a crearlo en el CMS en vez de
//  editarlo, o por el sync "union" de deploy-sync.mjs que no borra nunca.
//
//  Seguro de correr: solo toca filas con título repetido, en una transacción.
//  Si no hay duplicados, no borra nada.
//
//  Uso:   node ./db/dedupe-products.mjs
//  Después: node ./db/export-local-json.mjs  (regenera catalog/data.json)
// ============================================================================

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url)) // <proyecto>/db
const root = join(scriptDir, '..')

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
    /* la variable de entorno es la única fuente */
  }
  return ''
}

// Clave de unicidad: minúsculas, sin tildes y con espacios simples.
function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const url = loadDatabaseUrl()
  if (!url) {
    console.error('[DEDUPE] No se encontró DATABASE_URL. Definí la variable de entorno o completá backend/cms/.env')
    process.exit(1)
  }

  let pg
  try {
    const require = createRequire(join(root, 'backend', 'cms', 'package.json'))
    pg = require('pg')
  } catch (err) {
    console.error('[DEDUPE] No se pudo cargar "pg". Corré `npm install` en backend/cms: ' + err.message)
    process.exit(1)
  }

  const { Pool } = pg
  const pool = new Pool({ connectionString: url, max: 5 })

  try {
    // Más recientes primero: el primero de cada grupo es el que se conserva.
    const { rows } = await pool.query(
      'SELECT id, title, updated_at FROM products ORDER BY updated_at DESC, id DESC',
    )

    const groups = new Map()
    for (const row of rows) {
      const key = normalizeTitle(row.title)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    }

    const dupes = [...groups.values()].filter((g) => g.length > 1)
    if (dupes.length === 0) {
      console.log('[DEDUPE] No hay títulos duplicados: no se borró nada.')
      return
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      let deleted = 0
      for (const group of dupes) {
        const keep = group[0]
        const removeIds = group.slice(1).map((x) => x.id)
        const list = removeIds.map((id) => `#${id}`).join(', ')
        console.log(`  "${keep.title}" -> conservo id ${keep.id} (${keep.updated_at}) y borro: ${list}`)
        const { rowCount } = await client.query(
          'DELETE FROM products WHERE id = ANY($1::bigint[])',
          [removeIds],
        )
        deleted += rowCount
      }
      await client.query('COMMIT')
      console.log(`[DEDUPE] OK: ${deleted} duplicado(s) eliminados de ${dupes.length} título(s).`)
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }
  } finally {
    await pool.end().catch(() => {})
  }
}

main().catch((err) => {
  console.error('[DEDUPE] ERROR:', err.message)
  process.exit(1)
})