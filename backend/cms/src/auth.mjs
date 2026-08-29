import crypto from 'node:crypto'
import { pool } from './db.mjs'

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

export async function getAdminByUsername(username) {
  const { rows } = await pool.query(
    'SELECT id, username, password_hash FROM cms_admins WHERE username = $1',
    [username],
  )
  return rows[0]
}

export async function createSession(adminId) {
  const token = randomToken()
  await pool.query(
    `INSERT INTO cms_sessions (token_hash, admin_id, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 hour'))`,
    [sha256(token), adminId, sessionTtlHours()],
  )
  return token
}

export async function destroySession(token) {
  if (!token) return
  await pool.query('DELETE FROM cms_sessions WHERE token_hash = $1', [sha256(token)])
}

export async function sessionUser(token) {
  if (!token) return null
  const { rows } = await pool.query(
    `SELECT s.admin_id, a.username, s.expires_at
     FROM cms_sessions s
     JOIN cms_admins a ON a.id = s.admin_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  )
  return rows[0] || null
}

export async function requireAuth(req, res, next) {
  try {
    const user = await sessionUser(req.cookies?.[COOKIE_NAME])
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Iniciá sesión en el panel.' })
    }
    req.admin = user
    next()
  } catch (err) {
    next(err)
  }
}