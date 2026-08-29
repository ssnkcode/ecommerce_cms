import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { COOKIE_NAME, createSession, destroySession, getAdminByUsername, sessionCookieOptions } from '../auth.mjs'
import { requireAuth } from '../auth.mjs'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const { user, password } = req.body || {}
    if (!user || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' })
    }
    const admin = await getAdminByUsername(String(user))
    const ok = admin && (await bcrypt.compare(String(password), admin.password_hash))
    if (!ok) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' })
    }
    const token = await createSession(admin.id)
    res.cookie(COOKIE_NAME, token, sessionCookieOptions())
    res.json({ id: admin.id, username: admin.username })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    await destroySession(req.cookies?.[COOKIE_NAME])
    res.clearCookie(COOKIE_NAME, sessionCookieOptions())
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.admin.admin_id, username: req.admin.username })
})

export default router