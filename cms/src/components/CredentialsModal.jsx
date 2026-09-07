import { useRef, useState } from 'react'
import { IconClose, IconLock } from '../../../utils/icons.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'
import { apiChangeCredentials } from '../../../utils/api.js'

export default function CredentialsModal({ currentUsername, onClose, onSaved }) {
  const boxRef = useRef(null)
  useFocusTrap(boxRef, { onEscape: onClose })
  const [currentPassword, setCurrentPassword] = useState('')
  const [username, setUsername] = useState(currentUsername || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setOkMsg('')
    if (!currentPassword) {
      setError('Ingresá tu contraseña actual para confirmar.')
      return
    }
    if (password && password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (username.trim() === (currentUsername || '').toLowerCase() && !username.trim()) {
      setError('Indicá al menos el nuevo usuario o la nueva contraseña.')
      return
    }
    setLoading(true)
    try {
      const data = await apiChangeCredentials({
        currentPassword,
        username: username.trim() || undefined,
        password: password || undefined,
      })
      setOkMsg('Credenciales actualizadas. La sesión sigue activa.')
      if (onSaved) onSaved(data.username)
      setCurrentPassword('')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err.message || 'No se pudieron cambiar las credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box login-modal-cms"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cred-titulo"
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
          <h4 id="cred-titulo">Cambiar usuario o contraseña</h4>
          <p>
            Usuario actual: <strong>{currentUsername}</strong>. Podés cambiar solo uno de los dos.
          </p>
        </div>
        <form className="login-form-cms" onSubmit={submit}>
          <label className="login-field-cms">
            <span>Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
          </label>
          <label className="login-field-cms">
            <span>Nuevo usuario (opcional)</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario"
            />
          </label>
          <label className="login-field-cms">
            <span>Nueva contraseña (opcional)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>
          <label className="login-field-cms">
            <span>Repetir nueva contraseña</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>
          {error && <p className="login-error-cms">{error}</p>}
          {okMsg && <p className="login-ok-cms">{okMsg}</p>}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cerrar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}