import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomToken } from '../auth.mjs'
import {
  findAdminForLogin,
  getAdminByUsername,
  getAdminByEmail,
  createAdmin,
  setAdminVerifyToken,
  getAdminByVerifyToken,
  verifyAdminEmail,
  setAdminResetToken,
  getAdminByResetToken,
  resetAdminPassword,
  createSession,
  destroySession,
  destroyOtherSessions,
  updateAdminCredentials,
  getLoginLock,
  recordFailedLogin,
  clearFailedLogins,
} from '../storage.mjs'
import { COOKIE_NAME, sessionCookieOptions, bearerToken, requireAuth } from '../auth.mjs'
import { sendMail, buildVerificationEmail, buildResetEmail } from '../mail.mjs'

const router = Router()

const LOCKOUT_MINUTES = Math.max(1, Number(process.env.LOGIN_LOCKOUT_MINUTES) || 10)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function tokenExpiry(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

router.post('/login', async (req, res, next) => {
  try {
    const { user, password } = req.body || {}
    if (!user || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' })
    }

    const lock = await getLoginLock(String(user))
    if (lock) {
      const minsLeft = Math.max(1, Math.ceil((lock.lockedUntil - Date.now()) / 60000))
      return res.status(429).json({
        error: `Cuenta bloqueada por demasiados intentos fallidos. Volvé a intentar en ${minsLeft} min.`,
      })
    }

    const admin = await findAdminForLogin(String(user))
    const ok = admin && (await bcrypt.compare(String(password), admin.password_hash))
    if (!ok) {
      const info = await recordFailedLogin(String(user))
      if (info.blocked) {
        return res.status(429).json({
          error: `Cuenta bloqueada por demasiados intentos fallidos. Volvé a intentar en ${LOCKOUT_MINUTES} min.`,
        })
      }
      return res.status(401).json({
        error: `Usuario o contraseña incorrectos. Te quedan ${info.attemptsLeft} intento${info.attemptsLeft === 1 ? '' : 's'}.`,
      })
    }

    if (admin.email && !admin.email_verified) {
      return res.status(403).json({ error: 'Confirmá tu correo electrónico antes de entrar. Revisá tu casilla de correo.' })
    }

    await clearFailedLogins(String(user))
    const token = await createSession(admin.id)
    res.cookie(COOKIE_NAME, token, sessionCookieOptions())
    res.json({ id: admin.id, username: admin.username, email: admin.email || '', token })
  } catch (err) {
    next(err)
  }
})

router.post('/register', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Ingresá un correo electrónico válido.' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    const existing = await getAdminByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Ese correo ya tiene una cuenta. Probá iniciar sesión o recuperar la contraseña.' })
    }

    // Username generado a partir del email (el login acepta email o username).
    const local = email.split('@')[0].replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 16) || 'usuario'
    let username = local
    let suffix = Math.floor(Math.random() * 9000) + 1000
    while (await getAdminByUsername(username)) {
      username = `${local}${suffix}`
      suffix = Math.floor(Math.random() * 9000) + 1000
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const token = randomToken()
    const admin = await createAdmin({ username, email, passwordHash })
    await setAdminVerifyToken(admin.id, token, tokenExpiry(24))

    const mail = await sendMail(buildVerificationEmail(email, token))
    res.status(201).json({
      ok: true,
      message: `Te enviamos un correo a ${email}. Confirmá el enlace para activar tu cuenta.`,
      devLink: mail.dev ? mail.devLink : undefined,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/resend-verification', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Ingresá un correo electrónico válido.' })
    }

    const admin = await getAdminByEmail(email)
    // Respuesta uniforme para no revelar si el correo existe o ya está verificado.
    if (!admin || admin.email_verified) {
      return res.json({ ok: true, message: 'Si ese correo existe y está pendiente de confirmación, te lo reenviamos.' })
    }

    const token = randomToken()
    await setAdminVerifyToken(admin.id, token, tokenExpiry(24))
    const mail = await sendMail(buildVerificationEmail(email, token))
    res.json({
      ok: true,
      message: `Te reenviamos el correo a ${email}. Revisá tu bandeja de entrada (y la de spam).`,
      devLink: mail.dev ? mail.devLink : undefined,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body || {}
    if (!token) return res.status(400).json({ error: 'Falta el código de verificación.' })

    const admin = await getAdminByVerifyToken(String(token))
    if (!admin) {
      return res.status(400).json({ error: 'El enlace de confirmación no es válido o ya fue usado.' })
    }
    if (new Date(admin.verify_token_expiry).getTime() < Date.now()) {
      return res.status(400).json({ error: 'El enlace de confirmación venció. Pedí uno nuevo.' })
    }

    await verifyAdminEmail(admin.id)
    res.json({ ok: true, message: 'Correo confirmado. Ya podés iniciar sesión.' })
  } catch (err) {
    next(err)
  }
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {}
    const cleanEmail = typeof email === 'string' ? email.trim() : ''
    if (!EMAIL_RE.test(cleanEmail)) {
      return res.status(400).json({ error: 'Ingresá un correo electrónico válido.' })
    }

    const admin = await getAdminByEmail(cleanEmail)
    // Respuesta uniforme para no revelar si el correo existe.
    if (!admin) {
      return res.json({ ok: true, message: 'Si ese correo existe, te enviamos un enlace para recuperar la contraseña.' })
    }

    const token = randomToken()
    await setAdminResetToken(admin.id, token, tokenExpiry(1))
    const mail = await sendMail(buildResetEmail(admin.email, token))
    res.json({
      ok: true,
      message: 'Si ese correo existe, te enviamos un enlace para recuperar la contraseña.',
      devLink: mail.dev ? mail.devLink : undefined,
    })
  } catch (err) {
    next(err)
  }
})

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {}
    if (!token) return res.status(400).json({ error: 'Falta el código de recuperación.' })
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    const admin = await getAdminByResetToken(String(token))
    if (!admin) {
      return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya fue usado.' })
    }
    if (new Date(admin.reset_token_expiry).getTime() < Date.now()) {
      return res.status(400).json({ error: 'El enlace de recuperación venció. Pedí uno nuevo.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await resetAdminPassword(admin.id, passwordHash)
    await destroySession(await bearerToken(req))
    res.json({ ok: true, message: 'Contraseña actualizada. Ya podés iniciar sesión.' })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    await destroySession(await bearerToken(req))
    res.clearCookie(COOKIE_NAME, sessionCookieOptions())
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.admin.admin_id, username: req.admin.username })
})

router.put('/credentials', requireAuth, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const adminId = req.admin.admin_id

    const current = await getAdminByUsername(req.admin.username)
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const ok = current && (await bcrypt.compare(currentPassword, current.password_hash))
    if (!ok) return res.status(400).json({ error: 'La contraseña actual es incorrecta' })

    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!username && !password) {
      return res.status(400).json({ error: 'Indicá al menos el nuevo usuario o la nueva contraseña' })
    }
    if (username && (username.length < 3 || /[^A-Za-z0-9_.-]/.test(username))) {
      return res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres y solo letras, números, . _ -' })
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }
    if (username) {
      const existing = await getAdminByUsername(username)
      if (existing && Number(existing.id) !== adminId) {
        return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' })
      }
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined
    const updated = await updateAdminCredentials(adminId, { username: username || undefined, passwordHash })
    await destroyOtherSessions(adminId, await bearerToken(req))
    res.json({ id: updated.id, username: updated.username })
  } catch (err) {
    next(err)
  }
})

export default router