import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getAdminByUsername, createSession, destroySession, getLoginLock, recordFailedLogin, clearFailedLogins } from '../storage.mjs'
import { COOKIE_NAME, sessionCookieOptions, requireAuth } from '../auth.mjs'

const router = Router()

const LOCKOUT_MINUTES = Math.max(1, Number(process.env.LOGIN_LOCKOUT_MINUTES) || 10)

router.post('/login', async (req, res, next) => {
  try {
    const { user, password } = req.body || {}
    if (!user || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' })
    }

    const lock = getLoginLock(user)
    if (lock) {
      const minsLeft = Math.max(1, Math.ceil((lock.lockedUntil - Date.now()) / 60000))
      return res.status(429).json({
        error: `Cuenta bloqueada por demasiados intentos fallidos. Volvé a intentar en ${minsLeft} min.`,
      })
    }

    const admin = await getAdminByUsername(String(user))
    const ok = admin && (await bcrypt.compare(String(password), admin.password_hash))
    if (!ok) {
      const info = recordFailedLogin(String(user))
      if (info.blocked) {
        return res.status(429).json({
          error: `Cuenta bloqueada por demasiados intentos fallidos. Volvé a intentar en ${LOCKOUT_MINUTES} min.`,
        })
      }
      return res.status(401).json({
        error: `Usuario o contraseña incorrectos. Te quedan ${info.attemptsLeft} intento${info.attemptsLeft === 1 ? '' : 's'}.`,
      })
    }

    clearFailedLogins(String(user))
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