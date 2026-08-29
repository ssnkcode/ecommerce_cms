import 'dotenv/config'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Falta DATABASE_URL en .env')
  process.exit(1)
}

const url = new URL(databaseUrl)
const dbName = url.pathname.replace(/^\//, '')
const adminUser = process.env.ADMIN_USER || 'admin'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

async function ensureDatabase() {
  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`)
      console.log(`Base de datos creada: ${dbName}`)
    } else {
      console.log(`La base ${dbName} ya existe.`)
    }
  } finally {
    await client.end()
  }
}

async function runFile(client, file) {
  const path = join(__dirname, 'sql', file)
  if (!existsSync(path)) throw new Error(`No existe el archivo SQL: ${path}`)
  const sql = readFileSync(path, 'utf8')
  console.log(`  - Ejecutando ${file} ...`)
  await client.query(sql)
  console.log(`    -> ${file} OK`)
}

async function ensureAdmin(client) {
  const { rows } = await client.query('SELECT 1 FROM cms_admins WHERE username = $1', [adminUser])
  if (rows.length > 0) {
    console.log(`El admin "${adminUser}" ya existe.`)
    return
  }
  const hash = await bcrypt.hash(adminPassword, 10)
  await client.query('INSERT INTO cms_admins (username, password_hash) VALUES ($1, $2)', [adminUser, hash])
  console.log(`Admin creado: "${adminUser}" (contraseña desde .env)`)
}

async function main() {
  console.log('Inicializando base de datos del Commerce CMS ...')
  console.log(`  Servidor : ${url.host}`)
  console.log(`  Base     : ${dbName}`)

  await ensureDatabase()

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    console.log('  Orden de archivos (una sola base, dos partes):')
    await runFile(client, 'cms.sql')
    await runFile(client, 'catalogo.sql')
    await ensureAdmin(client)
    console.log('Base de datos lista. Próximo paso: npm run dev')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Error inicializando la base:', err.message)
  process.exit(1)
})