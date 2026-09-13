import { CategoryIcon } from '../../../utils/icons.jsx'
import { formatPrice } from '../../../utils/datos.js'
import CachedImage from '../../../utils/cachedImage.jsx'

const WIDE_CARD_TITLES = [
  'Aire Acondicionado Portátil Philco 2650w Frío Calor',
  'Mochila Irum',
  'Cortadora de pelo',
]

// La tarjeta SOLO muestra una descripción acotada (puntos suspensivos). El texto
// completo queda siempre en el modal (ProductModal usa product.description).
// El corte por caracteres garantiza que la card nunca se deforme, y el
// line-clamp de CSS (2 líneas) es la segunda capa de seguridad.
const DESCRIPTION_LIMIT = 110

function clampText(text, limit) {
  const s = typeof text === 'string' ? text.trim() : ''
  if (s.length <= limit) return s
  return s.slice(0, limit).trimEnd() + '…'
}

export default function ProductCard({ product, onOpen, onAdd }) {
  const isWideCard = WIDE_CARD_TITLES.some(t => t.toLowerCase() === product.title?.trim().toLowerCase())
  return (
    <article className={`cat-card${isWideCard ? ' width_1' : ''}`} onClick={() => onOpen(product)}>
      <div className="cat-card-emoji" aria-hidden="true">
        {product.image && product.image.trim() ? (
          <CachedImage
            className="cat-card-img"
            src={product.image}
            alt={product.title}
            width={900}
            height={600}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <CategoryIcon category={product.category} />
        )}
      </div>
      <div className="cat-card-body">
        {product.category && <span className="cat-card-category">{product.category}</span>}
        <h3 title={product.title}>{product.title}</h3>
        <p className="cat-card-desc" title={product.description}>{clampText(product.description, DESCRIPTION_LIMIT)}</p>
        <div className="cat-card-footer">
          <span className="cat-card-price">${formatPrice(product.price)}</span>
          <button className="cat-details btn-primary" onClick={(e) => { e.stopPropagation(); onOpen(product) }}>
            Ver detalles
          </button>
        </div>
        <button className="cat-add btn-primary" onClick={(e) => { e.stopPropagation(); onAdd(product) }}>
          Agregar al carrito
        </button>
      </div>
    </article>
  )
}