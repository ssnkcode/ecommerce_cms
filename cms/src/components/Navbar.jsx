import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { IconCart, IconDownload, IconEye, IconSun, IconMoon, IconMenu, IconClose, IconLock } from '../../../utils/icons.jsx'
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

  return createPortal(
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
    </div>,
    document.body,
  )
}

function Navbar({ siteName, logo, theme, onToggleTheme, onExport, onPreview, session, onLogin, onLogout }) {
  const [open, setOpen] = useState(false)
  const checking = session === 'checking'
  const logged = !checking && session && session.username

  return (
    <>
      <header className="navbar">
        <div className="navbar-brand">
          {logo && logo.trim() ? (
            <img className="logo-img" src={logo} alt={`${siteName} logo`} />
          ) : (
            <img className="logo-img" src="/assets/logo/logo.png" alt={`${siteName} logo`} />
          )}
          <span className="site-name">{siteName}</span>
          <span className="badge">CMS</span>
        </div>

        <div className="navbar-actions">
          <a className="btn-catalog-nav" href="/catalog/catalog.html" title="Ver la página del catálogo">
            <IconCart size={16} />
            Catálogo
          </a>
          <button className="btn-preview-nav" onClick={onPreview} title="Vista previa en vivo del catálogo">
            <IconEye size={16} />
            Vista previa
          </button>
          <button className="btn-export" onClick={onExport} title="Exportar los cambios a catalog/data.json">
            <IconDownload size={16} />
            Exportar catálogo
          </button>
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-pressed={theme === 'dark' ? 'false' : 'true'}
          >
            {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            <span>{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
          </button>
          {!checking && !logged && (
            <button className="btn-preview-nav nav-session" onClick={onLogin} title="Iniciar sesión para sincronizar con el backend">
              <IconLock size={16} />
              <span>Iniciar sesión</span>
            </button>
          )}
          {logged && (
            <div className="nav-session nav-session-ok" title="Sincronizado con el backend">
              <span className="nav-session-user">{session.username}</span>
              <button className="nav-session-out" onClick={onLogout}>Salir</button>
            </div>
          )}
        </div>

        <button
          className="menu-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="nav-menu-cms"
        >
          {open ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </header>

      {open && (
        <NavMenuPanel onClose={() => setOpen(false)}>
          <div className="nav-menu-head">
            <span className="nav-menu-title">{siteName}</span>
            <button className="nav-menu-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
              <IconClose size={18} />
            </button>
          </div>
          <nav className="nav-menu-list" aria-label="Acciones del panel">
            <a className="nav-menu-item" href="/catalog/catalog.html" onClick={() => setOpen(false)}>
              <span>Ver catálogo</span>
              <IconCart size={18} />
            </a>
            <button
              className="nav-menu-item"
              onClick={() => {
                setOpen(false)
                onPreview()
              }}
            >
              <span>Vista previa</span>
              <IconEye size={18} />
            </button>
            <button
              className="nav-menu-item"
              onClick={() => {
                setOpen(false)
                onExport()
              }}
            >
              <span>Exportar catálogo</span>
              <IconDownload size={18} />
            </button>
            <button className="nav-menu-item" onClick={onToggleTheme}>
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
            {!checking && !logged && (
              <button
                className="nav-menu-item"
                onClick={() => {
                  setOpen(false)
                  onLogin()
                }}
              >
                <span>Iniciar sesión</span>
                <IconLock size={18} />
              </button>
            )}
            {logged && (
              <button
                className="nav-menu-item"
                onClick={() => {
                  setOpen(false)
                  onLogout()
                }}
              >
                <span>Cerrar sesión ({session.username})</span>
                <IconLock size={18} />
              </button>
            )}
          </nav>
        </NavMenuPanel>
      )}
    </>
  )
}

export default Navbar