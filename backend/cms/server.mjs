import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { requireAuth } from './src/auth.mjs'
import authRouter from './src/routes/auth.mjs'
import settingsRouter from './src/routes/settings.mjs'
import productsRouter from './src/routes/products.mjs'
import { getSettingsRows, listProducts, upsertSettings, replaceProducts } from './src/storage.mjs'
import { KEY_MAP, settingsFromRows, productToJson } from './src/mapDatos.mjs'

const ALLOWED_ORIGIN = /^https?:\/\/(localhost|\d{1,3}(\.\d{1,3}){3}):517[0-9]$/

const app = express()
app.set('trust proxy', 1)

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGIN.test(origin)) return callback(null, true)
    return callback(new Error('Origen no permitido por CORS'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'commerce-cms-backend', time: new Date().toISOString() })
})

app.get('/api/catalog', (req, res) => {
  res.json({ settings: settingsFromRows(getSettingsRows()), products: listProducts().map(productToJson) })
})

app.put('/api/catalog', requireAuth, (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const pairs = []
    const newSettings = body.settings && typeof body.settings === 'object' ? body.settings : {}
    for (const [jsKey, value] of Object.entries(newSettings)) {
      if (value === undefined || value === null) continue
      const dbKey = KEY_MAP[jsKey] || String(jsKey)
      pairs.push([dbKey, value])
    }
    upsertSettings(pairs)
    const prodList = Array.isArray(body.products) ? body.products : []
    replaceProducts(prodList)
    res.json({ settings: settingsFromRows(getSettingsRows()), products: listProducts().map(productToJson) })
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

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`CMS API escuchando en http://localhost:${PORT}`)
  console.log(`  Health: http://localhost:${PORT}/api/health`)
})