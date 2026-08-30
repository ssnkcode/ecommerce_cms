export const SCHEMA_VERSION = 1

export const STORAGE_KEY = 'commerce-cms-data'
export const CART_KEY = 'commerce-cms-cart'
export const THEME_KEY = 'theme'
export const CATALOG_URL = '/catalog/data.json'
export const DEFAULT_HERO_IMAGE =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSGlFWj7phFcPQyubvsKSoiy2fFvZaPpg1MAR8lerbgGg&s=10'
export const WHATSAPP_NUMBER = '543541682310'
export const WHATSAPP_FOOTER =
  'SOLO SE RESERVA CON SEÑA DEL 50% PREVIA!\nSaludos desde polirrubroSSNK!!!'

export const ADMIN_CREDENTIALS = { user: 'admin', password: 'admin123' }

export const defaultSettings = {
  siteName: 'SsnkCode',
  tagline: 'Mirá nuestro catálogo online y consegui precios exclusivos **HOY MISMO**!!!',
  heroTitle: 'Soluciones digitales que necesitas, al mejor precio',
  heroTextColor: '',
  productsTitle: 'Nuestros productos',
  heroImage: '',
  heroImageSize: 420,
  categories: ['Audio', 'Wearables', 'Accesorios', 'Pantallas'],
  pdfBusinessName: '',
  pdfListMode: 'compact',
  pdfShowImages: true,
  pdfShowDate: true,
  pdfGroupByCategory: false,
}

export const defaultProducts = [
  { id: 1, title: 'Auriculares Pro', price: 89, category: 'Audio', description: 'Sonido envolvente con cancelación de ruido activa.', specs: 'Cancelación de ruido activa\nBluetooth 5.3\nBatería 40 h\nCarga USB-C\nPeso 250 g' },
  { id: 2, title: 'Smartwatch Series X', price: 199, category: 'Wearables', description: 'Monitor de salud y notificaciones en tu muñeca.', specs: 'Pantalla AMOLED 1.4"\nResistente al agua 5 ATM\nGPS integrado\nBatería 14 días\nSensor de frecuencia cardíaca' },
  { id: 3, title: 'Teclado Mecánico', price: 59, category: 'Accesorios', description: 'Switches táctiles y retroiluminación RGB.', specs: 'Switches mecánicos rojos\nRetroiluminación RGB\nLayout 60%\nInalámbrico 2.4GHz\nBatería 2000 mAh' },
  { id: 4, title: 'Mouse Gamer', price: 39, category: 'Accesorios', description: '16.000 DPI, 8 botones programables.', specs: 'Sensor 16.000 DPI\n8 botones programables\nIluminación RGB\nCable paracord\nPeso 65 g' },
  { id: 5, title: 'Monitor 27" 4K', price: 349, category: 'Pantallas', description: 'Colores precisos ideales para diseño y gaming.', specs: 'Panel IPS UHD 4K\nTasa de refresco 60Hz\nCobertura 98% DCI-P3\nHDR10\n2x HDMI, 1x DisplayPort' },
  { id: 6, title: 'Cámara Web HD', price: 79, category: 'Accesorios', description: '1080p con corrección de luz automática.', specs: 'Resolución 1080p/60fps\nCorrección de luz automática\nMicrófonos duales\nCobertura de privacidad\nFijación para trípode' },
]

function normalizePrice(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function normalizeProduct(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const specs = Array.isArray(p.specs)
    ? p.specs.map((s) => String(s)).join('\n')
    : typeof p.specs === 'string'
      ? p.specs
      : ''
  return {
    id: p.id != null && p.id !== '' ? p.id : Date.now(),
    title: typeof p.title === 'string' && p.title.trim() ? p.title : 'Producto sin título',
    price: normalizePrice(p.price),
    category: typeof p.category === 'string' ? p.category : '',
    description: typeof p.description === 'string' ? p.description : '',
    specs,
    image: typeof p.image === 'string' && p.image.trim() ? p.image : '',
    gallery: Array.isArray(p.gallery)
      ? p.gallery.filter((g) => typeof g === 'string' && g.trim()).slice(0, 12)
      : [],
  }
}

const HERO_TEXTS_OBSOLETOS = ['Mirá nuestro catálogo online y consegui lo que tanto querés']

function isTextObsoleto(value) {
  return typeof value === 'string' && HERO_TEXTS_OBSOLETOS.includes(value.trim())
}

export function normalizeSettings(raw, base = defaultSettings) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { ...base }
  for (const key of Object.keys(src)) {
    if (key === '_version' || key === 'version') continue
    const value = src[key]
    if (value === undefined || value === null) continue
    if (key === 'heroImageSize') {
      const n = Number(value)
      if (Number.isFinite(n) && n > 0) out[key] = Math.min(Math.max(Math.round(n), 20), 700)
      continue
    }
    if (key === 'categories' && Array.isArray(value)) {
      out[key] = value
        .map((v) => String(v).trim())
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
      continue
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    }
  }
  if (isTextObsoleto(out.tagline)) out.tagline = base.tagline
  if (out.siteName === 'TechStore') {
    out.siteName = defaultSettings.siteName
    out.tagline = defaultSettings.tagline
    out.heroTitle = defaultSettings.heroTitle
  }
  return out
}

function migrateData(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  let data = { settings: source.settings, products: source.products }
  let version = Number(source._version)
  if (!Number.isFinite(version)) version = 0
  if (version < SCHEMA_VERSION) {
    if (version < 1) {
      data = { settings: source.settings, products: source.products }
    }
    data = { ...data, _version: SCHEMA_VERSION }
  }
  return data
}

export function normalizeData(raw) {
  const data = migrateData(raw)
  const sourceProducts = Array.isArray(data.products)
    ? data.products.filter((p) => p != null && typeof p === 'object').map(normalizeProduct)
    : []
  return {
    settings: normalizeSettings(data.settings),
    products: sourceProducts,
  }
}

export function readData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return normalizeData(parsed)
    }
  } catch (e) {
    console.error('Error leyendo catálogo', e)
  }
  return { settings: { ...defaultSettings }, products: [] }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...(data || {}), _version: SCHEMA_VERSION }))
  } catch (e) {
    console.error('Error guardando catálogo', e)
  }
}

export function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((it) => it && typeof it === 'object')
      .map((it) => ({
        id: it.id,
        title: typeof it.title === 'string' && it.title.trim() ? it.title : 'Producto',
        price: normalizePrice(it.price),
        image: typeof it.image === 'string' ? it.image : '',
        category: typeof it.category === 'string' ? it.category : '',
        qty: Math.max(1, Math.round(Number(it.qty) || 1)),
      }))
      .filter((it) => it.id != null)
  } catch (e) {
    console.error('Error leyendo carrito', e)
  }
  return []
}

export function saveCart(items) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Error guardando carrito', e)
  }
}

export function cartCount(items) {
  return (items || []).reduce((acc, it) => acc + Number(it.qty || 0), 0)
}

export function cartTotal(items) {
  return (items || []).reduce((acc, it) => acc + Number(it.price || 0) * Number(it.qty || 0), 0)
}

export function formatPrice(p) {
  const n = Number(p)
  return Number.isFinite(n) ? n.toLocaleString('es-AR') : p
}

export function specsList(product) {
  if (!product || !product.specs) return []
  if (Array.isArray(product.specs)) {
    return product.specs.map((s) => String(s).trim()).filter(Boolean)
  }
  return String(product.specs)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}