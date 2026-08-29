import { useEffect, useRef, useState } from 'react'
import { IconClose, IconChevronLeft, IconChevronRight, CategoryIcon } from '../../../utils/icons.jsx'
import { formatPrice, specsList } from '../../../utils/datos.js'
import ShareButtons from './ShareButtons.jsx'
import CachedImage from '../../../utils/cachedImage.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'

export default function ProductModal({ product, onClose, onAdd }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef)
  const photos = [
    ...(product.image && product.image.trim() ? [product.image] : []),
    ...(Array.isArray(product.gallery) ? product.gallery.filter((g) => g && g.trim()) : []),
  ]
  const [active, setActive] = useState(0)
  const safeActive = photos.length ? (active >= photos.length ? 0 : active) : -1

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && photos.length > 1) setActive((a) => (a + 1) % photos.length)
      if (e.key === 'ArrowLeft' && photos.length > 1) setActive((a) => (a - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, photos.length])

  const specs = specsList(product)

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal" role="dialog" aria-modal="true" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button className="cat-modal-close" onClick={onClose} aria-label="Cerrar">
          <IconClose size={18} />
        </button>

        <div className="cat-modal-head">
          <div className="cat-modal-emoji" aria-hidden="true">
            {safeActive >= 0 ? (
              <CachedImage className="cat-modal-img" src={photos[safeActive]} alt={product.title} width={84} height={84} decoding="async" />
            ) : (
              <CategoryIcon category={product.category} />
            )}
          </div>
          <div className="cat-modal-title">
            {product.category && <span className="cat-card-category">{product.category}</span>}
            <h2>{product.title}</h2>
            <span className="cat-modal-price">${formatPrice(product.price)}</span>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="cat-gallery">
            <div className="cat-gallery-main">
              {safeActive > 0 && (
                <button
                  className="cat-gallery-nav prev"
                  onClick={() => setActive((a) => (a - 1 + photos.length) % photos.length)}
                  aria-label="Anterior"
                >
                  <IconChevronLeft size={22} />
                </button>
              )}
              <img className="cat-gallery-main-img" src={photos[safeActive]} alt={product.title} width={1000} height={260} decoding="async" />
              {safeActive < photos.length - 1 && (
                <button
                  className="cat-gallery-nav next"
                  onClick={() => setActive((a) => (a + 1) % photos.length)}
                  aria-label="Siguiente"
                >
                  <IconChevronRight size={22} />
                </button>
              )}
            </div>
            {photos.length > 1 && (
              <div className="cat-gallery-thumbs">
                {photos.map((src, i) => (
                  <button
                    key={i}
                    className={`cat-gallery-thumb ${i === safeActive ? 'active' : ''}`}
                    onClick={() => setActive(i)}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <CachedImage src={src} alt={`Foto ${i + 1}`} loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="cat-modal-body">
          {product.description && <p className="cat-modal-desc">{product.description}</p>}

          {specs.length > 0 && (
            <div className="cat-specs">
              <h3>Especificaciones</h3>
              <ul>
                {specs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <ShareButtons product={product} />

        <div className="cat-modal-actions">
          <button className="btn-primary cat-buy" onClick={() => { onAdd(product); onClose() }}>
            Agregar al carrito
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}