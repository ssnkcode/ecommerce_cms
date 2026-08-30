import { Router } from 'express'
import { listProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../storage.mjs'
import { productToJson } from '../mapDatos.mjs'

const router = Router()

const FIELDS = ['title', 'description', 'price', 'category', 'image', 'specs', 'gallery']

function validateProduct(body) {
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null
  const price = Number(body.price)
  return {
    title,
    price: Number.isFinite(price) && price >= 0 ? price : null,
    description: typeof body.description === 'string' ? body.description : '',
    category: typeof body.category === 'string' ? body.category : '',
    image: typeof body.image === 'string' ? body.image : '',
    specs: typeof body.specs === 'string' ? body.specs : '',
    gallery: Array.isArray(body.gallery)
      ? body.gallery.filter((g) => typeof g === 'string' && g.trim()).slice(0, 12)
      : [],
  }
}

router.get('/', async (req, res, next) => {
  try {
    res.json({ products: listProducts().map(productToJson) })
  } catch (err) {
    next(err)
  }
})

router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const row = getProductById(Number(req.params.id))
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(productToJson(row))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const p = validateProduct(req.body || {})
    if (!p.title) return res.status(400).json({ error: 'El título del producto es obligatorio' })
    if (p.price === null) return res.status(400).json({ error: 'El precio debe ser un número válido' })
    const row = createProduct(p)
    res.status(201).json(productToJson(row))
  } catch (err) {
    next(err)
  }
})

router.put('/:id(\\d+)', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const p = validateProduct(body)
    const fields = {}
    for (const field of FIELDS) {
      if (field in body) fields[field] = field === 'gallery' ? p.gallery : p[field]
    }
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })
    const row = updateProduct(Number(req.params.id), fields)
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(productToJson(row))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id(\\d+)', async (req, res, next) => {
  try {
    const ok = deleteProduct(Number(req.params.id))
    if (!ok) return res.status(404).json({ error: 'Producto no encontrado' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router