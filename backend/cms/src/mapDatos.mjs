export const KEY_MAP = {
  siteName: 'site_name',
  tagline: 'tagline',
  heroTitle: 'hero_title',
  heroTextColor: 'hero_text_color',
  heroImage: 'hero_image',
  heroImageSize: 'hero_image_size',
  productsTitle: 'products_title',
  logo: 'logo',
  logoSize: 'logo_size',
  whatsapp: 'whatsapp',
  whatsappFooter: 'whatsapp_footer',
}

export const REVERSE_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([jsKey, dbKey]) => [dbKey, jsKey]),
)

export function settingsFromRows(rows) {
  const out = {}
  for (const row of rows) {
    const jsKey = REVERSE_MAP[row.key] || row.key
    out[jsKey] = row.value
  }
  return out
}

export function productToJson(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price),
    category: row.category || '',
    image: row.image || '',
    gallery: row.gallery || [],
    specs: row.specs || '',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}