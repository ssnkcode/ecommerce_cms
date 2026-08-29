import { createPortal } from 'react-dom'
import { CategoryIcon } from '../../../utils/icons.jsx'
import { formatPrice, specsList } from '../../../utils/datos.js'

function ProductRow({ product, showImages, detailed }) {
  const specs = specsList(product)
  return (
    <div className="pdf-row">
      {showImages && (
        <div className="pdf-row-img">
          {product.image ? (
            <img src={product.image} alt="" />
          ) : (
            <CategoryIcon category={product.category} size={26} />
          )}
        </div>
      )}
      <div className="pdf-row-body">
        <div className="pdf-row-line">
          <span className="pdf-row-name">{product.title}</span>
          <span className="pdf-row-leader" aria-hidden="true" />
          <span className="pdf-row-price">${formatPrice(product.price)}</span>
        </div>
        {detailed && product.description && <p className="pdf-row-desc">{product.description}</p>}
        {detailed && specs.length > 0 && (
          <ul className="pdf-row-specs">
            {specs.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function PrintSheet({ settings, products }) {
  const showImages = settings.pdfShowImages !== false
  const detailed = settings.pdfListMode === 'detailed'
  const showDate = settings.pdfShowDate !== false
  const group = !!settings.pdfGroupByCategory

  const groups = group
    ? Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map((cat) => ({
        category: cat,
        items: products.filter((p) => p.category === cat),
      }))
    : [{ category: null, items: products }]

  const sheet = (
    <div className="pdf-sheet">
      <div className="pdf-header">
        <div className="pdf-brand">
          {settings.logo ? (
            <img className="pdf-logo" src={settings.logo} alt="" />
          ) : (
            <span className="pdf-logo-placeholder" />
          )}
          <span className="pdf-title">
            {settings.pdfBusinessName && settings.pdfBusinessName.trim()
              ? settings.pdfBusinessName
              : settings.siteName}
          </span>
        </div>
        {showDate && (
          <span className="pdf-date">
            {new Date().toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
      <h2 className="pdf-section">{settings.productsTitle}</h2>
      <div className="pdf-list">
        {groups.map((grp) => (
          <div className="pdf-group" key={grp.category || 'todos'}>
            {group && grp.category && <h3 className="pdf-group-title">{grp.category}</h3>}
            {grp.items.map((p) => (
              <ProductRow key={p.id} product={p} showImages={showImages} detailed={detailed} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}