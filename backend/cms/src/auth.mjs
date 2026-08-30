import crypto from 'node:crypto'
import { getAdminByUsername, createSession, destroySession, sessionUser } from './storage.mjs'

export const COOKIE_NAME = 'cms_session'

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex')

export function randomToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function sessionTtlHours() {
  return Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 168)
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: sessionTtlHours() * 3600 * 1000,
    path: '/',
  }
}

export { getAdminByUsername }

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  const user = await sessionUser(token)
  if (!user) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión en el panel.' })
  }
  req.admin = user
  next()
}