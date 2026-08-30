import { Router } from 'express'
import { getSettingsRows, upsertSettings } from '../storage.mjs'
import { KEY_MAP, settingsFromRows } from '../mapDatos.mjs'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    res.json(settingsFromRows(getSettingsRows()))
  } catch (err) {
    next(err)
  }
})

router.put('/', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const pairs = []
    for (const [jsKey, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue
      const dbKey = KEY_MAP[jsKey] || String(jsKey)
      pairs.push([dbKey, value])
    }
    upsertSettings(pairs)
    res.json(settingsFromRows(getSettingsRows()))
  } catch (err) {
    next(err)
  }
})

export default router