import { useEffect, useRef, useState } from 'react'
import { IconCart, IconSun, IconMoon, IconMenu, IconClose, IconLock } from '../../../utils/icons.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'

function NavMenuPanel({ onClose, children }) {
  const ref = useRef(null)
  useFocusTrap(ref, { onEscape: onClose })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])
  return (
    <div className="nav-menu-backdrop" onClick={onClose}>
      <div
        className="nav-menu"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default function CatalogNavbar({ settings, theme, onToggleTheme, onLogin, cartCount, onOpenCart }) {
  const [open, setOpen] = useState(false)
  const logoHeight = settings.logoSize ? { height: `${settings.logoSize}px` } : undefined

  return (
    <header className="catalog-nav">
      <div className="catalog-brand">
        {settings.logo && settings.logo.trim() ? (
          <img className="logo-img" src={settings.logo} alt={`${settings.siteName} logo`} style={logoHeight} />
        ) : (
          <img className="logo-img" src="/assets/logo/logo.png" alt={`${settings.siteName} logo`} style={logoHeight} />
        )}
        <span className="brand-name">{settings.siteName}</span>
        <span className="badge">Catálogo</span>
      </div>
      <div className="catalog-actions">
        <button className="btn-catalog-link" onClick={onLogin}>
          ADMIN
        </button>
        <button className="cart-toggle" onClick={onOpenCart} aria-label="Abrir carrito">
          <IconCart size={20} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-pressed={theme === 'dark' ? 'false' : 'true'}
        >
          {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>
      <button
        className="menu-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        aria-controls="nav-menu-catalogo"
      >
        {open ? <IconClose size={22} /> : <IconMenu size={22} />}
      </button>
      {open && (
        <NavMenuPanel onClose={() => setOpen(false)}>
          <button
            className="nav-menu-item"
            onClick={() => {
              setOpen(false)
              onLogin()
            }}
          >
            <span>Administración</span>
            <IconLock size={18} />
          </button>
          <button
            className="nav-menu-item"
            onClick={() => {
              setOpen(false)
              onOpenCart()
            }}
          >
            <span>Carrito{cartCount > 0 ? ` (${cartCount})` : ''}</span>
            <IconCart size={18} />
          </button>
          <button className="nav-menu-item" onClick={onToggleTheme}>
            <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
        </NavMenuPanel>
      )}
    </header>
  )
}