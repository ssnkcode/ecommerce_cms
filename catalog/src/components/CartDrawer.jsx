import { useEffect, useRef } from 'react'
import { IconCart, IconClose, IconMinus, IconPlus, IconTrash, CategoryIcon } from '../../../utils/icons.jsx'
import { formatPrice, cartCount, cartTotal, WHATSAPP_NUMBER, WHATSAPP_FOOTER } from '../../../utils/datos.js'
import { useFocusTrap } from '../../../utils/a11y.jsx'

export default function CartDrawer({ items, onClose, onChangeQty, onRemove, onClear }) {
  const drawerRef = useRef(null)
  useFocusTrap(drawerRef, { onEscape: onClose })
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const total = cartTotal(items)
  const count = cartCount(items)

  const checkout = () => {
    const lines = ['Hola! Quiero hacer el siguiente pedido:', '']
    items.forEach((it) => {
      lines.push(`• ${it.title} x${it.qty} — $${formatPrice(Number(it.price || 0) * it.qty)}`)
    })
    lines.push('')
    lines.push(`TOTAL: $${formatPrice(total)}`)
    lines.push('')
    lines.push(WHATSAPP_FOOTER)
    const msg = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
  }

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside className="cart-drawer" ref={drawerRef} onClick={(e) => e.stopPropagation()} aria-label="Carrito de compras">
        <header className="cart-header">
          <h2>
            <IconCart size={22} /> Carrito
          </h2>
          <button className="cart-close" onClick={onClose} aria-label="Cerrar">
            <IconClose size={18} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <IconCart size={56} />
            <p>El carrito está vacío.</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((it) => (
                <div className="cart-item" key={it.id}>
                  <div className="cart-item-emoji" aria-hidden="true">
                    {it.image && it.image.trim() ? (
                      <img src={it.image} alt={it.title} width={54} height={54} loading="lazy" />
                    ) : (
                      <CategoryIcon category={it.category} size={32} />
                    )}
                  </div>
                  <div className="cart-item-info">
                    <span className="cart-item-title">{it.title}</span>
                    <span className="cart-item-price">${formatPrice(it.price)}</span>
                    <div className="cart-item-qty">
                      <button onClick={() => onChangeQty(it.id, it.qty - 1)} aria-label="Restar cantidad">
                        <IconMinus size={16} />
                      </button>
                      <span>{it.qty}</span>
                      <button onClick={() => onChangeQty(it.id, it.qty + 1)} aria-label="Sumar cantidad">
                        <IconPlus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <button className="cart-item-remove" onClick={() => onRemove(it.id)} aria-label="Eliminar producto">
                      <IconTrash size={16} />
                    </button>
                    <span className="cart-item-subtotal">${formatPrice(Number(it.price || 0) * it.qty)}</span>
                  </div>
                </div>
              ))}
            </div>

            <footer className="cart-footer">
              <div className="cart-total">
                <span>
                  Total ({count} item{count === 1 ? '' : 's'})
                </span>
                <strong>${formatPrice(total)}</strong>
              </div>
              <button className="btn-primary cart-checkout" onClick={checkout}>
                Finalizar compra
              </button>
              <button className="btn-secondary cart-clear" onClick={onClear}>
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}