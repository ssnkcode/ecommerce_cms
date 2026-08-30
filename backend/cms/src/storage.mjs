// ============================================================================
//  Capa de almacenamiento del backend (COMMERCE CMS)
//  ----------------------------------------------------------------------------
//  IMPORTANTE: por ahora la implementación es EN MEMORIA, así el API funciona
//  sin necesidad de PostgreSQL. La forma de los datos es la MISMA que tendrá
//  la base: cuando se conecte PostgreSQL, solo se reemplaza el interior de
//  estas funciones por queries, sin cambiar las rutas.
//
//  Persistencia actual: nada (al reiniciar el proceso vuelve al seed).
// ============================================================================

import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

// ---------- Configuración por defecto (mismos valores que el frontend) -------

const DEFAULT_ADMIN_USER = process.env.ADMIN_USER || 'admin'
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

const ADMIN_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10)

const DEFAULT_SETTINGS = {
  site_name: 'SsnkCode',
  tagline: 'Mirá nuestro catálogo online y consegui precios exclusivos **HOY MISMO**!!!',
  hero_title: 'Variedad, calidad y los mejores precios para tu día a día',
  products_title: 'Nuestros productos',
  hero_text_color: '',
  hero_image: '',
  hero_image_size: 420,
  logo: '',
  logo_size: 64,
  whatsapp: '543541682310',
  whatsapp_footer: 'SOLO SE RESERVA CON SEÑA DEL 50% PREVIA!\nSaludos desde polirrubroSSNK!!!',
}

const DEFAULT_PRODUCTS = [
  {
    title: 'Auriculares Pro',
    description: 'Sonido envolvente con cancelación de ruido activa.',
    price: 89,
    category: 'Audio',
    image: '',
    gallery: [],
    specs: 'Cancelación de ruido activa\nBluetooth 5.3\nBatería 40 h\nCarga USB-C\nPeso 250 g',
  },
  {
    title: 'Smartwatch Series X',
    description: 'Monitor de salud y notificaciones en tu muñeca.',
    price: 199,
    category: 'Wearables',
    image: '',
    gallery: [],
    specs: 'Pantalla AMOLED 1.4"\nResistente al agua 5 ATM\nGPS integrado\nBatería 14 días\nSensor de frecuencia cardíaca',
  },
  {
    title: 'Teclado Mecánico',
    description: 'Switches táctiles y retroiluminación RGB.',
    price: 59,
    category: 'Accesorios',
    image: '',
    gallery: [],
    specs: 'Switches mecánicos rojos\nRetroiluminación RGB\nLayout 60%\nInalámbrico 2.4GHz\nBatería 2000 mAh',
  },
  {
    title: 'Mouse Gamer',
    description: '16.000 DPI, 8 botones programables.',
    price: 39,
    category: 'Accesorios',
    image: '',
    gallery: [],
    specs: 'Sensor 16.000 DPI\n8 botones programables\nIluminación RGB\nCable paracord\nPeso 65 g',
  },
  {
    title: 'Monitor 27" 4K',
    description: 'Colores precisos ideales para diseño y gaming.',
    price: 349,
    category: 'Pantallas',
    image: '',
    gallery: [],
    specs: 'Panel IPS UHD 4K\nTasa de refresco 60Hz\nCobertura 98% DCI-P3\nHDR10\n2x HDMI, 1x DisplayPort',
  },
  {
    title: 'Cámara Web HD',
    description: '1080p con corrección de luz automática.',
    price: 79,
    category: 'Accesorios',
    image: '',
    gallery: [],
    specs: 'Resolución 1080p/60fps\nCorrección de luz automática\nMicrófonos duales\nCobertura de privacidad\nFijación para trípode',
  },
]

// ---------------------- Estado en memoria --------------------------------

let seq = 1

function makeRow(data, id) {
  const now = new Date()
  const row = {
    id: id != null ? Number(id) : seq++,
    title: data.title,
    description: data.description ?? '',
    price: Number(data.price) || 0,
    category: data.category ?? '',
    image: data.image ?? '',
    gallery: data.gallery ?? [],
    specs: data.specs ?? '',
    is_active: data.is_active ?? true,
    created_at: now,
    updated_at: now,
  }
  if (row.id >= seq) seq = row.id + 1
  return row
}

const admins = [
  { id: 1, username: DEFAULT_ADMIN_USER, password_hash: ADMIN_PASSWORD_HASH, created_at: new Date() },
]

const sessions = new Map() // token_hash -> { admin_id, username, expires_at }

// ---------------------- CONTROL DE ACCESO (login) --------------------------
// Tras N intentos fallidos consecutivos, la cuenta queda bloqueada por X min.

const LOGIN_MAX_ATTEMPTS = Math.max(1, Number(process.env.LOGIN_MAX_ATTEMPTS) || 3)
const LOGIN_LOCKOUT_MS = Math.max(1, Number(process.env.LOGIN_LOCKOUT_MINUTES) || 10) * 60 * 1000
const loginAttempts = new Map() // username -> { count, lockedUntil }

export function getLoginLock(username) {
  const key = String(username)
  const rec = loginAttempts.get(key)
  if (!rec) return null
  if (rec.lockedUntil && rec.lockedUntil > Date.now()) {
    return { lockedUntil: rec.lockedUntil }
  }
  if (rec.lockedUntil) loginAttempts.delete(key)
  return null
}

export function recordFailedLogin(username) {
  const key = String(username)
  const rec = loginAttempts.get(key) || { count: 0, lockedUntil: 0 }
  rec.count += 1
  if (rec.count >= LOGIN_MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS
    rec.count = 0
  } else {
    rec.lockedUntil = 0
  }

  loginAttempts.set(key, rec)
  const blocked = rec.lockedUntil > Date.now()
  return {
    blocked,
    attemptsLeft: blocked ? 0 : Math.max(0, LOGIN_MAX_ATTEMPTS - rec.count),
    lockedUntil: rec.lockedUntil || null,
  }
}

export function clearFailedLogins(username) {
  loginAttempts.delete(String(username))
}

const settings = new Map(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => [k, structuredClone(v)]))
const products = DEFAULT_PRODUCTS.map((p) => ({ ...p, gallery: [...p.gallery] })).map(makeRow)

// ------------------------- ADMIN / SESIONES -------------------------------

export function getAdminByUsername(username) {
  return admins.find((a) => a.username === username) || null
}

export function createSession(adminId) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const admin = admins.find((a) => a.id === adminId)
  sessions.set(tokenHash, {
    admin_id: adminId,
    username: admin?.username,
    expires_at: new Date(Date.now() + sessionTtlMs()),
  })
  return token
}

export function destroySession(token) {
  if (!token) return
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  sessions.delete(tokenHash)
}

export function sessionUser(token) {
  if (!token) return null
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const session = sessions.get(tokenHash)
  if (!session) return null
  if (session.expires_at <= new Date()) {
    sessions.delete(tokenHash)
    return null
  }
  return session
}

function sessionTtlMs() {
  return Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 168) * 3600 * 1000
}

// ---------------------------- SETTINGS -------------------------------------

export function getSettingsRows() {
  return Array.from(settings.entries()).map(([key, value]) => ({ key, value }))
}

export function upsertSettings(pairs) {
  for (const [key, value] of pairs) {
    settings.set(key, structuredClone(value))
  }
  return getSettingsRows()
}

// ---------------------------- PRODUCTOS ------------------------------------

export function listProducts() {
  return products.map((p) => ({ ...p, gallery: [...p.gallery] }))
}

export function getProductById(id) {
  const row = products.find((p) => p.id === id)
  return row ? { ...row, gallery: [...row.gallery] } : null
}

export function createProduct(data) {
  const row = makeRow(data)
  products.push(row)
  return { ...row, gallery: [...row.gallery] }
}

export function updateProduct(id, fields) {
  const row = products.find((p) => p.id === id)
  if (!row) return null
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) row[key] = key === 'gallery' ? [...value] : value
  }
  row.updated_at = new Date()
  return { ...row, gallery: [...row.gallery] }
}

export function deleteProduct(id) {
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return false
  products.splice(idx, 1)
  return true
}

export function replaceProducts(list) {
  const clean = Array.isArray(list) ? list : []
  products.length = 0
  for (const item of clean) {
    if (!item || typeof item !== 'object') continue
    const specs = Array.isArray(item.specs)
      ? item.specs.map((s) => String(s)).join('\n')
      : typeof item.specs === 'string'
        ? item.specs
        : ''
    const gallery = Array.isArray(item.gallery)
      ? item.gallery.filter((g) => typeof g === 'string' && g.trim()).slice(0, 12)
      : []
    products.push(
      makeRow(
        {
          title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Producto sin título',
          description: typeof item.description === 'string' ? item.description : '',
          price: Number(item.price) || 0,
          category: typeof item.category === 'string' ? item.category : '',
          image: typeof item.image === 'string' ? item.image : '',
          gallery,
          specs,
        },
        item.id,
      ),
    )
  }
  return listProducts()
}