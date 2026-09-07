import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
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

function originAllowed(origin) {
  if (!origin) return false
  return ALLOWED_ORIGIN.some((re) => re.test(origin))
}

const app = express()
app.set('trust proxy', 1)

app.use(express.json({ limit: '4.5mb' }))
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
    res.json({ settings: settingsFromRows(await getSettingsRows()), products: (await listProducts()).map(productToJson) })
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
    res.json({ settings: settingsFromRows(await getSettingsRows()), products: (await listProducts()).map(productToJson) })
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