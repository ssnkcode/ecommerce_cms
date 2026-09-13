import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { writeFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { requireAuth } from './auth.mjs'
import authRouter from './routes/auth.mjs'
import settingsRouter from './routes/settings.mjs'
import productsRouter from './routes/products.mjs'
import { getSettingsRows, listProducts, upsertSettings, replaceProducts } from './storage.mjs'
import { KEY_MAP, settingsFromRows, productToJson } from './mapDatos.mjs'

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Orígenes permitidos por CORS:
// - localhost / LAN del entorno de desarrollo.
// - ALLOWED_ORIGINS (separado por comas) para producción. Se admiten dominios
//   exactos ("https://tienda.com") o wildcard de subdominio ("https://*.pages.dev",
//   "https://*.vercel.app").
function buildAllowedOrigins() {
  const patterns = [/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(\.\d{1,3}){3})(:[0-9]{1,5})?$/]
  const extra = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  for (const origin of extra) {
    if (origin.startsWith('*.')) {
      patterns.push(new RegExp(`^https://[a-z0-9-]+\\${escapeRegExp(origin.slice(2))}$`, 'i'))
    } else {
      patterns.push(new RegExp(`^${escapeRegExp(origin)}$`))
    }
  }
  return patterns
}

const ALLOWED_ORIGIN = buildAllowedOrigins()

// Ubicación del snapshot estático que consume el catálogo público.
// Solo se escribe si existe (desarrollo local / build); en producción
// (Vercel) no hay un directorio local y se ignora silenciosamente.
const CATALOG_DATA_DEV = resolve(dirname(fileURLToPath(import.meta.url)), '../../../catalog/data.json')

async function refreshStaticCatalog(data) {
  try {
    await access(CATALOG_DATA_DEV)
    await writeFile(CATALOG_DATA_DEV, JSON.stringify(data, null, 2), 'utf8')
  } catch {
    // No existe el archivo estático: no hacer nada (hosting serverless).
  }
}

async function catalogSnapshot() {
  return {
    settings: settingsFromRows(await getSettingsRows()),
    products: (await listProducts()).map(productToJson),
  }
}

function originAllowed(origin) {
  if (!origin) return false
  return ALLOWED_ORIGIN.some((re) => re.test(origin))
}

const app = express()
app.set('trust proxy', 1)

app.use(express.json({ limit: '30mb' }))
app.use(cookieParser())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || originAllowed(origin)) return callback(null, true)
      return callback(new Error('Origen no permitido por CORS'))
    },
    credentials: true,
  })
)

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'commerce-cms-backend', time: new Date().toISOString() })
})

app.get('/api/catalog', async (req, res, next) => {
  try {
    res.json(await catalogSnapshot())
  } catch (err) {
    next(err)
  }
})

app.put('/api/catalog', requireAuth, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const pairs = []
    const newSettings = body.settings && typeof body.settings === 'object' ? body.settings : {}
    for (const [jsKey, value] of Object.entries(newSettings)) {
      if (value === undefined || value === null) continue
      const dbKey = KEY_MAP[jsKey] || String(jsKey)
      pairs.push([dbKey, value])
    }
    await upsertSettings(pairs)
    const prodList = Array.isArray(body.products) ? body.products : []
    await replaceProducts(prodList)
    // Regenera el data.json del catálogo público con lo recién guardado, para
    // que hasta quien abre por primera vez (sin caché) vea lo último.
    const snapshot = await catalogSnapshot()
    res.json(snapshot)
    refreshStaticCatalog(snapshot)
  } catch (err) {
    next(err)
  }
})

app.use('/api/auth', authRouter)
app.use('/api/settings', requireAuth, settingsRouter)
app.use('/api/products', requireAuth, productsRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

export default app