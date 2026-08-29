import { Router } from 'express'
import { pool } from '../db.mjs'

const router = Router()

const FIELDS = ['title', 'description', 'price', 'category', 'image', 'specs', 'gallery']

function toJson(row) {
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
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id')
    res.json({ products: rows.map(toJson) })
  } catch (err) {
    next(err)
  }
})

router.get('/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [Number(req.params.id)])
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(toJson(rows[0]))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const p = validateProduct(req.body || {})
    if (!p.title) return res.status(400).json({ error: 'El título del producto es obligatorio' })
    if (p.price === null) return res.status(400).json({ error: 'El precio debe ser un número válido' })
    const { rows } = await pool.query(
      `INSERT INTO products (title, description, price, category, image, specs, gallery)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [p.title, p.description, p.price, p.category, p.image, p.specs, JSON.stringify(p.gallery)],
    )
    res.status(201).json(toJson(rows[0]))
  } catch (err) {
    next(err)
  }
})

router.put('/:id(\\d+)', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const p = validateProduct(body)
    const cols = []
    const values = []
    for (const field of FIELDS) {
      if (field in body) {
        values.push(field === 'gallery' ? JSON.stringify(p.gallery) : p[field])
        cols.push(`${field} = $${values.length}`)
      }
    }
    if (cols.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' })
    values.push(Number(req.params.id))
    const { rows } = await pool.query(
      `UPDATE products SET ${cols.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(toJson(rows[0]))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id(\\d+)', async (req, res, next) => {
  try {
    const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [Number(req.params.id)])
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router