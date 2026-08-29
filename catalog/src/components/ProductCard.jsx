import { CategoryIcon } from '../../../utils/icons.jsx'
import { formatPrice } from '../../../utils/datos.js'
import CachedImage from '../../../utils/cachedImage.jsx'

export default function ProductCard({ product, onOpen, onAdd }) {
  return (
    <article className="cat-card" onClick={() => onOpen(product)}>
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
        <h3>{product.title}</h3>
        <p>{product.description}</p>
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