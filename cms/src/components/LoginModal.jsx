import { useRef, useState } from 'react'
import { IconClose, IconLock } from '../../../utils/icons.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'
import { apiLogin } from '../../../utils/api.js'

export default function LoginModal({ onClose, onSuccess }) {
  const boxRef = useRef(null)
  useFocusTrap(boxRef, { onEscape: onClose })
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await apiLogin(user.trim(), password)
    setLoading(false)
    if (res.ok) {
      if (onSuccess) onSuccess(res.data)
      onClose()
      return
    }
    setError(res.error || 'No se pudo iniciar sesión.')
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box login-modal-cms"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-titulo"
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="btn-cancel login-close-cms" onClick={onClose} aria-label="Cerrar">
          <IconClose size={16} />
        </button>
        <div className="login-head-cms">
          <span className="login-logo-cms" aria-hidden="true">
            <IconLock size={34} />
          </span>
          <h4 id="login-titulo">Iniciar sesión</h4>
          <p>Necesitás sesión para sincronizar los cambios con el backend.</p>
        </div>
        <form className="login-form-cms" onSubmit={submit}>
          <label className="login-field-cms">
            <span>Usuario</span>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="usuario o correo"
              autoFocus
            />
          </label>
          <label className="login-field-cms">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {error && <p className="login-error-cms">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}