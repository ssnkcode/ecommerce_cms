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
//    3) Sobrescribe el catálogo de producción (PUT /api/catalog).
//
//  Uso:   node deploy-sync.mjs
// ============================================================================

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
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

async function fetchLocalCatalog() {
  // a) API local en funcionamiento (fuente fresca de la base local).
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 2500)
    const res = await fetch('http://localhost:3001/api/catalog', { signal: ac.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      if (data && Array.isArray(data.products)) {
        console.log(`  Fuente: API local (http://localhost:3001)  ->  ${data.products.length} productos`)
        return data
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
      return data
    }
  }
  throw new Error('No hay datos locales: levantá el backend local o exportá el catálogo (catalog/data.json).')
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
  console.log('[SYNC] Sincronizando catálogo LOCAL -> PRODUCCIÓN')
  console.log(`  API    : ${base}`)
  const catalog = await fetchLocalCatalog()

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

  const save = await fetch(`${base}/api/catalog`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginBody.token}` },
    body: JSON.stringify({ settings: catalog.settings, products: catalog.products }),
  })
  const saveBody = await save.json().catch(() => ({}))
  if (!save.ok) {
    console.error(`[SYNC] No se pudo guardar en producción (${save.status}): ${saveBody.error || ''}`)
    process.exit(1)
  }

  const saved = Array.isArray(saveBody.products) ? saveBody.products.length : '?'
  console.log(`[SYNC] OK! ${saved} productos sincronizados a la base de producción.`)
}

main().catch((err) => {
  console.error('[SYNC] ERROR:', err.message)
  process.exit(1)
})