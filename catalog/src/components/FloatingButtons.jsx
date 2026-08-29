import { IconCart, IconWhatsApp } from '../../../utils/icons.jsx'
import { WHATSAPP_NUMBER } from '../../../utils/datos.js'

export default function FloatingButtons({ cartCount, onOpenCart }) {
  return (
    <div className="floating-buttons">
      <button className="float-btn float-cart" onClick={onOpenCart} aria-label="Abrir carrito">
        <span className="float-icon">
          <IconCart size={26} />
        </span>
        {cartCount > 0 && <span className="float-badge">{cartCount}</span>}
      </button>
      <a
        className="float-btn float-whatsapp"
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
      >
        <IconWhatsApp size={30} className="wa-svg" />
      </a>
    </div>
  )
}