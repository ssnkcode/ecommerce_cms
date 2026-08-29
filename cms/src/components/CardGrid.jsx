import { useRef, useState } from 'react'
import { CategoryIcon, IconTag, IconCheck, IconPencil, IconTrash, IconClose, IconImage, IconUpload, IconPlus, IconRestore } from '../../../utils/icons.jsx'
import { processImageFile as compressImageFile } from '../../../utils/images.js'
import { useFocusTrap } from '../../../utils/a11y.jsx'

const emptyProduct = { title: '', category: '', price: '', description: '', specs: '', image: '', gallery: [] }

function ProductCard({ product, onEdit, onRemove }) {
  return (
    <div className="card">
      <div className="card-emoji" aria-hidden="true">
        {product.image && product.image.trim() ? (
          <img className="card-img" src={product.image} alt={product.title} loading="lazy" />
        ) : (
          <CategoryIcon category={product.category} size={42} />
        )}
      </div>
      <div className="card-body">
        <span className="card-category">{product.category}</span>
        <h3>{product.title}</h3>
        <p>{product.description}</p>
        <div className="card-footer">
          <span className="card-price">${product.price}</span>
          <button className="btn-buy">Comprar</button>
        </div>
      </div>
      <div className="card-actions">
        <button className="icon-btn" title="Editar" aria-label="Editar" onClick={() => onEdit(product)}>
          <IconPencil size={16} />
        </button>
        <button className="icon-btn danger" title="Eliminar" aria-label="Eliminar" onClick={() => onRemove(product.id)}>
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  )
}

function ProductForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const [drag, setDrag] = useState(false)
  const [galleryDrag, setGalleryDrag] = useState(false)
  const [urlInput, setUrlInput] = useState(initial.image && !initial.image.startsWith('data:') ? initial.image : '')
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const fileInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const processImageFile = (file, callback) => {
    compressImageFile(file, { maxSize: 1200, quality: 0.82 })
      .then(callback)
      .catch((err) => console.error(err))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer?.files?.[0]
    processImageFile(file, (src) => setForm((f) => ({ ...f, image: src })))
  }

  const addGalleryItem = (src) => {
    setForm((f) => ({ ...f, gallery: [...(f.gallery || []), src] }))
  }

  const onGalleryDrop = (e) => {
    e.preventDefault()
    setGalleryDrag(false)
    const files = Array.from(e.dataTransfer?.files || [])
    files.forEach((file) => processImageFile(file, addGalleryItem))
  }

  const removeGalleryItem = (idx) => {
    setForm((f) => ({ ...f, gallery: (f.gallery || []).filter((_, i) => i !== idx) }))
  }

  const submit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form className="cms-edit-panel product-form" onSubmit={submit}>
      <h4>{initial.id ? 'Editar producto' : 'Agregar producto'}</h4>
      <label>
        Título
        <input value={form.title} onChange={set('title')} required />
      </label>
      <label>
        Categoría
        <input value={form.category} onChange={set('category')} list="categoria-list" placeholder="¿Audio, Accesorios, ...?" />
        <datalist id="categoria-list">
          {(categories || []).map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label>
        Precio
        <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} required />
      </label>
      <label>
        Descripción
        <textarea value={form.description} onChange={set('description')} rows="3" />
      </label>

      <div className="image-section">
        <span className="image-label">Imagen del producto</span>

        {form.image && form.image.trim() ? (
          <div className="image-preview-wrap">
            <img className="image-preview" src={form.image} alt="Vista previa" />
          </div>
        ) : (
          <div className="image-placeholder">Sin imagen (se mostrará un ícono)</div>
        )}

        <div
          className={`image-dropzone ${drag ? 'is-drag' : ''} ${form.image && form.image.trim() ? 'has-image' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              processImageFile(e.target.files?.[0], (src) => setForm((f) => ({ ...f, image: src })))
              e.target.value = ''
            }}
          />
          <span className="drop-ico" aria-hidden="true">
            <IconUpload size={30} />
          </span>
          <span>
            <strong>Arrastrá la imagen aquí y soltala</strong>
            <br />
            o hacé clic para elegir un archivo
          </span>
        </div>

        <label className="image-url-field">
          O pegá una URL de imagen:
          <input
            type="url"
            value={urlInput}
            placeholder="https://ejemplo.com/producto.jpg"
            onChange={(e) => {
              setUrlInput(e.target.value)
              setForm({ ...form, image: e.target.value })
            }}
          />
        </label>

        {form.image && form.image.trim() && (
          <button type="button" className="btn-remove-image" onClick={() => setForm({ ...form, image: '' })}>
            <IconTrash size={14} />
            Quitar imagen
          </button>
        )}
      </div>

      <div className="image-section">
        <span className="image-label">Galería de fotos del producto</span>

        {(form.gallery && form.gallery.length) > 0 ? (
          <div className="gallery-grid">
            {form.gallery.map((src, i) => (
              <div className="gallery-item" key={i}>
                <img src={src} alt={`Foto ${i + 1}`} />
                <button
                  type="button"
                  className="gallery-item-remove"
                  title="Quitar foto"
                  aria-label={`Quitar foto ${i + 1}`}
                  onClick={() => removeGalleryItem(i)}
                >
                  <IconClose size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="image-placeholder">Sin fotos adicionales</div>
        )}

        <div
          className={`image-dropzone ${galleryDrag ? 'is-drag' : ''}`}
          onClick={() => galleryInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setGalleryDrag(true) }}
          onDragLeave={() => setGalleryDrag(false)}
          onDrop={onGalleryDrop}
        >
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              files.forEach((file) => processImageFile(file, addGalleryItem))
              e.target.value = ''
            }}
          />
          <span className="drop-ico" aria-hidden="true">
            <IconImage size={30} />
          </span>
          <span>
            <strong>Arrastrá una o varias fotos aquí</strong>
            <br />
            o hacé clic para elegir archivos
          </span>
        </div>

        <label className="image-url-field">
          O agregá por URL y presioná Enter:
          <input
            type="text"
            value={galleryUrlInput}
            placeholder="https://ejemplo.com/foto1.jpg"
            onChange={(e) => setGalleryUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const url = galleryUrlInput.trim()
                if (url) {
                  addGalleryItem(url)
                  setGalleryUrlInput('')
                }
              }
            }}
            onBlur={() => {
              const url = galleryUrlInput.trim()
              if (url) {
                addGalleryItem(url)
                setGalleryUrlInput('')
              }
            }}
          />
        </label>
      </div>

      <label>
        Especificaciones (una por línea)
        <textarea value={form.specs} onChange={set('specs')} rows="4" placeholder="Ej:&#10;Bluetooth 5.3&#10;Batería 40h&#10;USB-C" />
      </label>
      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-save">Guardar</button>
      </div>
    </form>
  )
}

function CategoryManager({ categories, products, onUpdateCategories, onUpdateProduct, onClose, boxRef }) {
  const originalRef = useRef(categories)
  const historyRef = useRef([])
  const [items, setItems] = useState(() => originalRef.current.map((c) => ({ name: c, originalName: c })))
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [editStart, setEditStart] = useState('')

  const hasChanges =
    items.length !== originalRef.current.length ||
    items.some((it, i) => it.name !== originalRef.current[i])
  const canRestoreSaved = historyRef.current.length > 0
  const canRestore = hasChanges || canRestoreSaved

  const add = (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (!items.some((it) => it.name.toLowerCase() === name.toLowerCase())) {
      setItems((prev) => [...prev, { name, originalName: null }])
    }
    setNewName('')
  }

  const startEdit = (index) => {
    setEditing(index)
    setDraft(items[index].name)
    setEditStart(items[index].name)
  }

  const cancelEdit = (index) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, name: editStart } : it)))
    setEditing(null)
    setDraft('')
    setEditStart('')
  }

  const commitEdit = (index) => {
    setEditing(null)
    setDraft('')
    const next = draft.trim()
    const current = items[index].name
    if (!next || next.toLowerCase() === current.toLowerCase()) return
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, name: next } : it)))
  }

  const remove = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    if (editing === index) {
      setEditing(null)
      setDraft('')
      setEditStart('')
    }
  }

  const restore = () => {
    if (hasChanges) {
      setItems(originalRef.current.map((c) => ({ name: c, originalName: c })))
      setNewName('')
      setEditing(null)
      setDraft('')
      setEditStart('')
      return
    }
    const prev = historyRef.current.pop()
    if (!prev) return
    onUpdateCategories(prev.names)
    products.forEach((p) => {
      const entry = prev.products.find((x) => x.id === p.id)
      if (entry && entry.category !== p.category) {
        onUpdateProduct(p.id, { category: entry.category })
      }
    })
    originalRef.current = prev.names
    setItems(prev.names.map((c) => ({ name: c, originalName: c })))
    setNewName('')
    setEditing(null)
    setDraft('')
    setEditStart('')
  }

  const save = () => {
    const finalNames = []
    items.forEach((it) => {
      const n = it.name.trim()
      if (n && !finalNames.some((x) => x.toLowerCase() === n.toLowerCase())) finalNames.push(n)
    })
    historyRef.current.push({
      names: originalRef.current.slice(),
      products: products.map((p) => ({ id: p.id, category: p.category })),
    })
    onUpdateCategories(finalNames)
    products.forEach((p) => {
      const renamed = items.find((it) => it.originalName && it.originalName === p.category)
      const deleted = categories.includes(p.category) && !items.some((it) => it.name === p.category || it.originalName === p.category)
      if (renamed && renamed.name !== p.category) {
        onUpdateProduct(p.id, { category: renamed.name })
      } else if (deleted) {
        onUpdateProduct(p.id, { category: '' })
      }
    })
    originalRef.current = finalNames
    setItems(finalNames.map((c) => ({ name: c, originalName: c })))
    setNewName('')
    setEditing(null)
    setDraft('')
    setEditStart('')
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box cat-manager-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-manager-title"
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="cat-manager-title">Categorías</h4>
        <p>Creá, editá o eliminá las categorías usadas por los productos.</p>

        <form className="cat-manager-add" onSubmit={add}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nueva categoría..."
            aria-label="Nueva categoría"
          />
          <button type="submit" className="btn-save" aria-label="Agregar categoría">
            <IconPlus size={16} />
          </button>
        </form>

        {items.length === 0 ? (
          <p className="cat-manager-empty">Todavía no hay categorías creadas.</p>
        ) : (
          <ul className="cat-manager-list">
            {items.map((it, i) => (
              <li key={`${it.originalName || 'nueva'}-${i}`}>
                {editing === i ? (
                  <input
                    type="text"
                    className="cat-manager-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitEdit(i)
                      }
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        cancelEdit(i)
                      }
                    }}
                    onBlur={() => commitEdit(i)}
                    autoFocus
                  />
                ) : (
                  <span className="cat-manager-name">{it.name}</span>
                )}
                <div className="cat-manager-actions">
                  {editing === i ? (
                    <>
                      <button
                        type="button"
                        className="icon-btn ok"
                        title="Guardar"
                        aria-label="Guardar categoría"
                        onClick={() => commitEdit(i)}
                      >
                        <IconCheck size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Restaurar al estado anterior"
                        aria-label="Restaurar al estado anterior"
                        onClick={() => cancelEdit(i)}
                      >
                        <IconRestore size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar"
                        aria-label={`Editar ${it.name}`}
                        onClick={() => startEdit(i)}
                      >
                        <IconPencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Eliminar"
                        aria-label={`Eliminar ${it.name}`}
                        onClick={() => remove(i)}
                      >
                        <IconTrash size={15} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="cat-manager-note">
          Los cambios se aplican al guardar. Restaurar descarta los cambios pendientes o deshace el último guardado (incluida una eliminación).
        </p>

        <div className="confirm-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Cerrar</button>
          <button
            type="button"
            className="btn-restore-prev"
            onClick={restore}
            disabled={!canRestore}
            title={
              hasChanges
                ? 'Descartar los cambios pendientes'
                : canRestoreSaved
                  ? 'Deshacer el último guardado'
                  : 'No hay cambios para deshacer'
            }
          >
            Restaurar
          </button>
          <button type="button" className="btn-save" onClick={save} disabled={!hasChanges}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function CardGrid({
  products,
  addProduct,
  updateProduct,
  removeProduct,
  onReset,
  clearAll,
  restorePrevious,
  hasPrevious,
  productsTitle,
  categories,
  onUpdateCategories,
}) {
  const [mode, setMode] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [catManager, setCatManager] = useState(false)
  const resetBoxRef = useRef(null)
  const clearBoxRef = useRef(null)
  const catBoxRef = useRef(null)
  useFocusTrap(resetBoxRef, { onEscape: () => setConfirmAction(null) })
  useFocusTrap(clearBoxRef, { onEscape: () => setConfirmAction(null) })
  useFocusTrap(catBoxRef, { onEscape: () => setCatManager(false) })

  const startAdd = () => {
    setEditingProduct(emptyProduct)
    setMode('add')
  }

  const startEdit = (product) => {
    setEditingProduct(product)
    setMode('edit')
  }

  const handleSave = (data) => {
    const payload = { ...data, price: Number(data.price) }
    if (mode === 'add') addProduct(payload)
    else updateProduct(editingProduct.id, payload)
    setMode(null)
    setEditingProduct(null)
  }

  return (
    <section className="products" id="productos">
      <div className="section-header">
        <div>
          <span className="section-kicker">Catálogo</span>
          <h2>{productsTitle || 'Nuestros productos'}</h2>
        </div>
        <div className="section-header-actions">
          <button className="btn-cats" onClick={() => setCatManager(true)}>
            <IconTag size={16} />
            Categorías
          </button>
          <button
            className="btn-restore"
            onClick={() => setConfirmAction('reset')}
            title="Restaurar contenido de ejemplo"
          >
            <IconRestore size={16} />
            Restaurar
          </button>
          <button
            className="btn-clear"
            onClick={() => setConfirmAction('clear')}
            disabled={products.length === 0}
            title="Eliminar todos los productos"
          >
            <IconTrash size={16} />
            Borrar todo
          </button>
          <button className="btn-add" onClick={startAdd}>
            <IconPlus size={16} />
            Agregar tarjeta
          </button>
        </div>
      </div>

      {mode && mode !== 'edit' && (
        <ProductForm
          initial={editingProduct}
          categories={categories}
          onSave={handleSave}
          onCancel={() => { setMode(null); setEditingProduct(null) }}
        />
      )}

      <div className="card-grid">
        {products.map((p) =>
          mode === 'edit' && editingProduct.id === p.id ? (
            <div key={p.id} className="card-edit-wrap">
              <ProductForm
                initial={editingProduct}
                categories={categories}
                onSave={handleSave}
                onCancel={() => { setMode(null); setEditingProduct(null) }}
              />
            </div>
          ) : (
            <ProductCard key={p.id} product={p} onEdit={startEdit} onRemove={removeProduct} />
          ),
        )}
      </div>

      {confirmAction === 'reset' && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div
            className="confirm-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            ref={resetBoxRef}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="confirm-title">¿Restaurar?</h4>
            <p>
              Se van a reemplazar los productos y ajustes actuales. Elegí qué querés restaurar.
            </p>
            <div className="confirm-actions confirm-column">
              <button
                type="button"
                className="btn-restore-prev"
                onClick={() => {
                  restorePrevious()
                  setConfirmAction(null)
                }}
                disabled={!hasPrevious}
                title={hasPrevious ? 'Volver al último cambio guardado' : 'Aún no hay cambios para deshacer'}
              >
                Restaurar al estado anterior
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  onReset()
                  setConfirmAction(null)
                }}
              >
                Restaurar al comienzo
              </button>
              <button type="button" className="btn-cancel" onClick={() => setConfirmAction(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction === 'clear' && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div
            className="confirm-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            ref={clearBoxRef}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="confirm-title">¿Borrar todos los productos?</h4>
            <p>
              Se van a eliminar todos los productos del catálogo. Esta acción no se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn-cancel" onClick={() => setConfirmAction(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  clearAll()
                  setConfirmAction(null)
                }}
              >
                Borrar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {catManager && (
        <CategoryManager
          categories={categories}
          products={products}
          onUpdateCategories={onUpdateCategories}
          onUpdateProduct={updateProduct}
          onClose={() => setCatManager(false)}
          boxRef={catBoxRef}
        />
      )}
    </section>
  )
}

export default CardGrid