import { Router } from 'express'
import { pool } from '../db.mjs'

const router = Router()

const KEY_MAP = {
  siteName: 'site_name',
  tagline: 'tagline',
  heroTitle: 'hero_title',
  heroSubtitle: 'hero_subtitle',
  heroImage: 'hero_image',
  heroImageSize: 'hero_image_size',
  productsTitle: 'products_title',
  logo: 'logo',
  logoSize: 'logo_size',
  whatsapp: 'whatsapp',
  whatsappFooter: 'whatsapp_footer',
}

const REVERSE_MAP = Object.fromEntries(Object.entries(KEY_MAP).map(([jsKey, dbKey]) => [dbKey, jsKey]))

function settingsFromRows(rows) {
  const out = {}
  for (const row of rows) {
    const jsKey = REVERSE_MAP[row.key] || row.key
    out[jsKey] = row.value
  }
  return out
}

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM cms_settings')
    res.json(settingsFromRows(rows))
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    for (const [jsKey, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue
      const dbKey = KEY_MAP[jsKey] || String(jsKey)
      await pool.query(
        `INSERT INTO cms_settings (key, value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [dbKey, JSON.stringify(value)],
      )
    }
    const { rows } = await pool.query('SELECT key, value FROM cms_settings')
    res.json(settingsFromRows(rows))
  } catch (err) {
    next(err)
  }
})

export default router