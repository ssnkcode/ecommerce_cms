// ============================================================================
//  Capa de almacenamiento del backend (COMMERCE CMS)
//  ----------------------------------------------------------------------------
//  Implementación sobre PostgreSQL usando el pool de db.mjs. La forma de los
//  datos que se devuelven es la MISMA que tenía la versión en memoria, así las
//  rutas no cambian su contrato (solo se agrega `await` donde hacía falta).
//
//  Persistencia: real (PostgreSQL). Al reiniciar el proceso NO se pierde nada.
// ============================================================================

import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { pool } from './db.mjs'

// ---------- Configuración por defecto (fallback de seed) --------------------

const DEFAULT_ADMIN_USER = process.env.ADMIN_USER || 'admin'
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

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

const DEFAULT_CATEGORIES = '["Audio", "Vestibles", "Accesorios", "Pantallas"]'

const DEFAULT_PRODUCTS = [
  {
    title: 'Auriculares Pro',
    description: 'Sonido envolvente con cancelación de ruido activa.',
    price: 89,
    category: 'Audio',
    specs: 'Cancelación de ruido activa\nBluetooth 5.3\nBatería 40 h\nCarga USB-C\nPeso 250 g',
  },
  {
    title: 'Smartwatch Series X',
    description: 'Monitor de salud y notificaciones en tu muñeca.',
    price: 199,
    category: 'Vestibles',
    specs: 'Pantalla AMOLED 1.4"\nResistente al agua 5 ATM\nGPS integrado\nBatería 14 días\nSensor de frecuencia cardíaca',
  },
  {
    title: 'Teclado Mecánico',
    description: 'Switches táctiles y retroiluminación RGB.',
    price: 59,
    category: 'Accesorios',
    specs: 'Switches mecánicos rojos\nRetroiluminación RGB\nLayout 60%\nInalámbrico 2.4GHz\nBatería 2000 mAh',
  },
  {
    title: 'Mouse Gamer',
    description: '16.000 DPI, 8 botones programables.',
    price: 39,
    category: 'Accesorios',
    specs: 'Sensor 16.000 DPI\n8 botones programables\nIluminación RGB\nCable paracord\nPeso 65 g',
  },
  {
    title: 'Monitor 27" 4K',
    description: 'Colores precisos ideales para diseño y gaming.',
    price: 349,
    category: 'Pantallas',
    specs: 'Panel IPS UHD 4K\nTasa de refresco 60Hz\nCobertura 98% DCI-P3\nHDR10\n2x HDMI, 1x DisplayPort',
  },
  {
    title: 'Cámara Web HD',
    description: '1080p con corrección de luz automática.',
    price: 79,
    category: 'Accesorios',
    specs: 'Resolución 1080p/60fps\nCorrección de luz automática\nMicrófonos duales\nCobertura de privacidad\nFijación para trípode',
  },
]

// ---------------------- Control de acceso (login) ---------------------------

const LOGIN_MAX_ATTEMPTS = Math.max(1, Number(process.env.LOGIN_MAX_ATTEMPTS) || 3)
const LOGIN_LOCKOUT_MS = Math.max(1, Number(process.env.LOGIN_LOCKOUT_MINUTES) || 10) * 60 * 1000

export async function getLoginLock(username) {
  const key = String(username)
  const { rows } = await pool.query(
    'SELECT failed_count, locked_until FROM cms_login_attempts WHERE username = $1',
    [key],
  )
  if (rows.length === 0) return null
  const { locked_until } = rows[0]
  if (locked_until && new Date(locked_until).getTime() > Date.now()) {
    return { lockedUntil: new Date(locked_until).getTime() }
  }
  return null
}

export async function recordFailedLogin(username) {
  const key = String(username)
  // Leer el estado actual (si existe y no está bloqueado) para poder contar.
  const current = await getLoginLock(key)
  if (current) {
    return { blocked: true, attemptsLeft: 0, lockedUntil: current.lockedUntil }
  }

  const { rows } = await pool.query(
    'SELECT failed_count, locked_until FROM cms_login_attempts WHERE username = $1',
    [key],
  )
  let count = rows.length ? Number(rows[0].failed_count) : 0
  count += 1

  if (count >= LOGIN_MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS).toISOString()
    await pool.query(
      `INSERT INTO cms_login_attempts (username, failed_count, locked_until, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (username) DO UPDATE
         SET failed_count = 0, locked_until = $3, updated_at = now()`,
      [key, count, lockedUntil],
    )
    return { blocked: true, attemptsLeft: 0, lockedUntil: new Date(lockedUntil).getTime() }
  }

  await pool.query(
    `INSERT INTO cms_login_attempts (username, failed_count, locked_until, updated_at)
     VALUES ($1, $2, NULL, now())
     ON CONFLICT (username) DO UPDATE
       SET failed_count = $2, locked_until = NULL, updated_at = now()`,
    [key, count],
  )
  return { blocked: false, attemptsLeft: Math.max(0, LOGIN_MAX_ATTEMPTS - count), lockedUntil: null }
}

export async function clearFailedLogins(username) {
  await pool.query('DELETE FROM cms_login_attempts WHERE username = $1', [String(username)])
}

// ------------------------------ ADMIN / SESIONES ----------------------------

export async function getAdminByUsername(username) {
  const { rows } = await pool.query(
    'SELECT id, username, password_hash, created_at FROM cms_admins WHERE username = $1',
    [String(username)],
  )
  return rows.length ? rows[0] : null
}

export async function createSession(adminId) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString()
  await pool.query(
    `INSERT INTO cms_sessions (admin_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [adminId, tokenHash, expiresAt],
  )
  return token
}

export async function destroySession(token) {
  if (!token) return
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex')
  await pool.query('DELETE FROM cms_sessions WHERE token_hash = $1', [tokenHash])
}

export async function sessionUser(token) {
  if (!token) return null
  const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex')
  const { rows } = await pool.query(
    `SELECT s.admin_id, a.username, s.expires_at
       FROM cms_sessions s
       JOIN cms_admins a ON a.id = s.admin_id
      WHERE s.token_hash = $1`,
    [tokenHash],
  )
  if (rows.length === 0) return null
  const row = rows[0]
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await pool.query('DELETE FROM cms_sessions WHERE token_hash = $1', [tokenHash])
    return null
  }
  return { admin_id: Number(row.admin_id), username: row.username, expires_at: row.expires_at }
}

function sessionTtlMs() {
  return Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 168) * 3600 * 1000
}

// ------------------------------- SETTINGS -----------------------------------

export async function getSettingsRows() {
  const { rows } = await pool.query('SELECT key, value FROM cms_settings')
  return rows.map((r) => ({ key: r.key, value: r.value }))
}

export async function upsertSettings(pairs) {
  for (const [key, value] of pairs) {
    await pool.query(
      `INSERT INTO cms_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [String(key), JSON.stringify(value)],
    )
  }
  return getSettingsRows()
}

// ------------------------------ PRODUCTOS -----------------------------------

function rowToProduct(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description || '',
    price: Number(row.price),
    category: row.category || '',
    image: row.image || '',
    gallery: Array.isArray(row.gallery) ? [...row.gallery] : [],
    specs: row.specs || '',
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listProducts() {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY id')
  return rows.map(rowToProduct)
}

export async function getProductById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id])
  return rows.length ? rowToProduct(rows[0]) : null
}

export async function createProduct(data) {
  const gallery = Array.isArray(data.gallery) ? data.gallery : []
  const { rows } = await pool.query(
    `INSERT INTO products (title, description, price, category, image, gallery, specs, is_active)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      data.title,
      data.description ?? '',
      data.price ?? 0,
      data.category ?? '',
      data.image ?? '',
      JSON.stringify(gallery),
      data.specs ?? '',
      data.is_active ?? true,
    ],
  )
  return rowToProduct(rows[0])
}

export async function updateProduct(id, fields) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id])
  if (rows.length === 0) return null
  return pool
    .query(
      updateProductSql(fields),
      updateProductParams(id, fields),
    )
    .then((r) => rowToProduct(r.rows[0]))
}

function updateProductSql(fields) {
  const settable = []
  if ('title' in fields) settable.push(`title = $${settable.length + 2}`)
  if ('description' in fields) settable.push(`description = $${settable.length + 2}`)
  if ('price' in fields) settable.push(`price = $${settable.length + 2}`)
  if ('category' in fields) settable.push(`category = $${settable.length + 2}`)
  if ('image' in fields) settable.push(`image = $${settable.length + 2}`)
  if ('specs' in fields) settable.push(`specs = $${settable.length + 2}`)
  if ('gallery' in fields) settable.push(`gallery = $${settable.length + 2}::jsonb`)
  if (settable.length === 0) return 'SELECT * FROM products WHERE id = $1'
  settable.push('updated_at = now()')
  return `UPDATE products SET ${settable.join(', ')} WHERE id = $1 RETURNING *`
}

function updateProductParams(id, fields) {
  const params = [id]
  if ('title' in fields) params.push(fields.title)
  if ('description' in fields) params.push(fields.description)
  if ('price' in fields) params.push(fields.price)
  if ('category' in fields) params.push(fields.category)
  if ('image' in fields) params.push(fields.image)
  if ('specs' in fields) params.push(fields.specs)
  if ('gallery' in fields) params.push(JSON.stringify(fields.gallery))
  return params
}

export async function deleteProduct(id) {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id])
  return rowCount > 0
}

export async function replaceProducts(list) {
  const clean = Array.isArray(list) ? list : []
  const mapped = clean
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const specs = Array.isArray(item.specs)
        ? item.specs.map((s) => String(s)).join('\n')
        : typeof item.specs === 'string'
          ? item.specs
          : ''
      const gallery = Array.isArray(item.gallery)
        ? item.gallery.filter((g) => typeof g === 'string' && g.trim()).slice(0, 12)
        : []
      return {
        id: item.id != null ? Number(item.id) : undefined,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Producto sin título',
        description: typeof item.description === 'string' ? item.description : '',
        price: Number(item.price) || 0,
        category: typeof item.category === 'string' ? item.category : '',
        image: typeof item.image === 'string' ? item.image : '',
        gallery,
        specs,
      }
    })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM products')
    for (const p of mapped) {
      await client.query(
        `INSERT INTO products
           (id, title, description, price, category, image, gallery, specs, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, COALESCE(
           (SELECT created_at FROM products WHERE id = $1), now()), now())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           category = EXCLUDED.category,
           image = EXCLUDED.image,
           gallery = EXCLUDED.gallery,
           specs = EXCLUDED.specs,
           updated_at = now()`,
        [p.id ?? null, p.title, p.description, p.price, p.category, p.image, JSON.stringify(p.gallery), p.specs],
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
  return listProducts()
}

// ----------------------- Seed idempotente (fallback) ------------------------
// Garantiza que la base tenga datos mínimos la primera vez que arranca el
// backend, aunque no se haya corrido `npm run db:init` explícitamente.
// No pisa datos existentes: usa ON CONFLICT DO NOTHING.

let seedPromise = null

function ensureSeed() {
  if (!seedPromise) seedPromise = runSeed().catch((err) => {
    console.error('[storage] No se pudo verificar/crear el seed:', err.message)
  })
  return seedPromise
}

async function runSeed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Settings por defecto (si la tabla está vacía)
    const { rows: setRows } = await client.query('SELECT count(*)::int AS n FROM cms_settings')
    if (setRows[0].n === 0) {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await client.query('INSERT INTO cms_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, JSON.stringify(value)])
      }
      await client.query('INSERT INTO cms_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', ['categories', DEFAULT_CATEGORIES])
    }

    // Admin por defecto (si no existe)
    const { rows: admRows } = await client.query('SELECT count(*)::int AS n FROM cms_admins')
    if (admRows[0].n === 0) {
      const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10)
      await client.query('INSERT INTO cms_admins (username, password_hash) VALUES ($1, $2)', [DEFAULT_ADMIN_USER, hash])
    }

    // Productos por defecto (si la tabla está vacía)
    const { rows: prodRows } = await client.query('SELECT count(*)::int AS n FROM products')
    if (prodRows[0].n === 0) {
      for (const p of DEFAULT_PRODUCTS) {
        await client.query(
          'INSERT INTO products (title, description, price, category, image, gallery, specs) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)',
          [p.title, p.description, p.price, p.category, '', '[]', p.specs],
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

// Garantiza el seed al importar el módulo.
ensureSeed()
