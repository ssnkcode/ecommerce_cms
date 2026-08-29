import { useRef, useState } from 'react'
import { IconClose, IconLock } from '../../../utils/icons.jsx'
import { ADMIN_CREDENTIALS } from '../../../utils/datos.js'
import { useFocusTrap } from '../../../utils/a11y.jsx'

export default function AdminLoginModal({ onClose }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, { onEscape: onClose })
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (user.trim() === ADMIN_CREDENTIALS.user && password === ADMIN_CREDENTIALS.password) {
      window.location.href = '/cms/'
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div
        className="cat-modal login-modal"
        role="dialog"
        aria-modal="true"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="cat-modal-close" onClick={onClose} aria-label="Cerrar">
          <IconClose size={18} />
        </button>

        <div className="login-head">
          <span className="login-logo" aria-hidden="true">
            <IconLock size={40} />
          </span>
          <h2>Acceso Administrador</h2>
          <p>Ingresa tus credenciales para acceder al panel.</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label className="login-field">
            <span>Usuario</span>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <div className="login-actions">
            <button type="submit" className="btn-primary login-submit">Entrar</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}