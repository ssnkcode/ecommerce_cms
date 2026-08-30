import 'dotenv/config'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Script canónico: TODAS las tablas (cms_settings, cms_admins, cms_sessions,
// cms_login_attempts, products) + trigger + seeds (settings, admin, productos).
// Vive en db/ y está pensado para ejecutarse con psql (usa \getenv / \connect).
const SCRIPT = join(__dirname, '..', '..', 'db', 'base_completa.sql')

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Falta DATABASE_URL en .env')
  process.exit(1)
}

const url = new URL(databaseUrl)

// El script canónico decide la base con \getenv DBNAME (default commerce_cms).
// El env DBNAME la sobreescribe (útil para testear instalación limpia).
const dbName = process.env.DBNAME || url.pathname.replace(/^\//, '')
const serviceHost = url.hostname || 'localhost'
const servicePort = url.port || '5432'
const serviceUser = url.username || 'postgres'
const servicePassword = decodeURIComponent(url.password || '')
const adminUser = process.env.ADMIN_USER || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

// Localiza el ejecutable de psql: primero la variable PG_BIN, después rutas de
// instalación habituales en Windows, y al final psql en el PATH.
function findPsql() {
  if (process.env.PG_BIN) {
    if (existsSync(process.env.PG_BIN)) return process.env.PG_BIN
  }
  const candidates = []
  const pgRoot = process.env.PGROOT
  if (pgRoot) candidates.push(join(pgRoot, 'bin', 'psql.exe'))
  candidates.push('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe')
  candidates.push('C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe')
  candidates.push('C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe')
  candidates.push('C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe')
  for (const c of candidates) {
    if (c && existsSync(c)) return c
  }
  return 'psql'
}

function main() {
  if (!existsSync(SCRIPT)) {
    console.error(`No existe el script canónico: ${SCRIPT}`)
    process.exit(1)
  }

  const psql = findPsql()
  console.log('Inicializando base de datos del Commerce CMS ...')
  console.log(`  Servidor : ${serviceHost}:${servicePort}`)
  console.log(`  Base     : ${dbName}  (usa DBNAME, ver db/base_completa.sql)`)
  console.log(`  Admin    : ${adminUser} / ${adminPassword}`)
  console.log(`  Script   : ${SCRIPT}`)

  const env = {
    ...process.env,
    PGPASSWORD: servicePassword,
    PGUSER: serviceUser,
    PGHOST: serviceHost,
    PGPORT: servicePort,
    // base_completa.sql lee DBNAME con \getenv para crear/conectar la base.
    DBNAME: dbName,
  }

  const result = spawnSync(psql, ['-U', serviceUser, '-h', serviceHost, '-p', servicePort, '-v', 'ON_ERROR_STOP=1', '-f', SCRIPT], {
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`No se pudo ejecutar psql (${psql}):`, result.error.message)
    console.error('Asegurate de que PostgreSQL 18 esté instalado y corriendo, o seteá PG_BIN.')
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`psql finalizó con código ${result.status}.`)
    process.exit(result.status ?? 1)
  }

  console.log('Base de datos lista. Próximo paso: npm run dev')
}

main()
