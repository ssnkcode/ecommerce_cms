import { useEffect, useRef, useState } from 'react'
import { IconClose, IconEye, IconEyeOff, IconLock, IconMail, IconUser } from '../../../utils/icons.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'
import {
  apiLogin,
  apiRegister,
  apiForgotPassword,
  apiResetPassword,
  apiResendVerification,
  apiVerifyEmail,
} from '../../../utils/api.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VIEWS = {
  login: 'login',
  register: 'register',
  forgot: 'forgot',
  reset: 'reset',
  sent: 'sent',
  verify: 'verify',
  resend: 'resend',
}

export default function AdminAuthModal({ onClose, initialView = 'login', initialToken = '' }) {
  const modalRef = useRef(null)
  useFocusTrap(modalRef, { onEscape: onClose })

  const [view, setView] = useState(initialView in VIEWS ? initialView : 'login')
  const [user, setUser] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [devLink, setDevLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Arranca el token según la vista inicial
  const startingToken = useRef(initialToken)

  useEffect(() => {
    if (view === 'reset' && !token && startingToken.current) {
      setToken(startingToken.current)
    }
    if (view === 'verify' && startingToken.current) {
      runVerify(startingToken.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const runVerify = async (tok) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiVerifyEmail(String(tok).split('/').pop())
      if (res.ok) {
        setInfo(res.data?.message || 'Correo confirmado. Ya podés iniciar sesión.')
      } else {
        setError(res.error || 'El enlace no es válido o venció.')
      }
    } catch {
      setError('No se pudo confirmar el correo. Volvé a intentar.')
    } finally {
      setLoading(false)
      setView('login')
    }
  }

  const switchView = (v) => {
    setView(v)
    setError('')
    setInfo('')
    setDevLink('')
  }

  const submitLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiLogin(user.trim(), password)
      if (res.ok) {
        window.location.href = '/cms/'
      } else if (res.error) {
        setError(res.error)
      } else {
        setError('Usuario o contraseña incorrectos.')
      }
    } catch {
      setError('Ocurrió un error inesperado. Volvé a intentar.')
    } finally {
      setLoading(false)
    }
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email.trim())) {
      setError('Ingresá un correo electrónico válido.')
      return
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const res = await apiRegister({ email: email.trim(), password })
    setLoading(false)
    if (res.ok) {
      setInfo(res.data?.message || 'Te enviamos un correo para confirmar tu cuenta.')
      setDevLink(res.data?.devLink || '')
      setView('sent')
    } else {
      setError(res.error || 'No se pudo crear la cuenta.')
    }
  }

  const submitForgot = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email.trim())) {
      setError('Ingresá un correo electrónico válido.')
      return
    }
    setLoading(true)
    const res = await apiForgotPassword(email.trim())
    setLoading(false)
    if (res.ok) {
      setInfo(res.data?.message || 'Si ese correo existe, te enviamos un enlace para recuperar la contraseña.')
      setDevLink(res.data?.devLink || '')
      setView('sent')
    } else {
      setError(res.error || 'No se pudo procesar el pedido.')
    }
  }

  const submitResend = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email.trim())) {
      setError('Ingresá un correo electrónico válido.')
      return
    }
    setLoading(true)
    const res = await apiResendVerification(email.trim())
    setLoading(false)
    if (res.ok) {
      setInfo(res.data?.message || 'Te reenviamos el correo de confirmación.')
      setDevLink(res.data?.devLink || '')
      setView('sent')
    } else {
      setError(res.error || 'No se pudo reenviar el correo.')
    }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    setError('')
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const res = await apiResetPassword({ token: token.trim(), password })
    setLoading(false)
    if (res.ok) {
      setInfo(res.data?.message || 'Contraseña actualizada. Ya podés iniciar sesión.')
      switchView('login')
    } else {
      setError(res.error || 'No se pudo cambiar la contraseña.')
    }
  }

  const headIcon = (current) => {
    if (current === 'register' || current === 'forgot' || current === 'sent' || current === 'resend') return 'mail'
    if (current === 'reset') return 'lock'
    return 'user'
  }

  const titles = {
    login: 'Acceso Administrador',
    register: 'Crear cuenta',
    forgot: 'Recuperar contraseña',
    reset: 'Crear contraseña nueva',
    sent: 'Revisá tu correo',
    verify: 'Confirmar correo',
    resend: 'Reenviar verificación',
  }

  const icon = headIcon(view)
  const head = (
    <div className="login-head">
      <span className="login-logo" aria-hidden="true">
        {icon === 'mail' ? (
          <IconMail size={40} />
        ) : icon === 'lock' ? (
          <IconLock size={40} />
        ) : (
          <IconUser size={40} />
        )}
      </span>
      <h2>{titles[view]}</h2>
      <p>
        {view === 'login' && 'Ingresá con tu correo o usuario para acceder al panel.'}
        {view === 'register' && 'Creá tu cuenta con tu correo y una contraseña.'}
        {view === 'forgot' && 'Te enviamos un enlace a tu correo para crear una clave nueva.'}
        {view === 'reset' && 'Elegí tu nueva contraseña.'}
        {view === 'verify' && 'Confirmando tu correo...'}
        {view === 'resend' && 'Ingresá tu correo para reenviar el enlace de confirmación.'}
        {view === 'sent' && 'El correo con el enlace ya debería estar llegando.'}
      </p>
    </div>
  )

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

        {head}

        {view === 'verify' && (
          <div className="auth-sent">
            {loading && <p className="login-ok">Confirmando tu correo...</p>}
            {!loading && !error && info && <p className="login-ok">{info}</p>}
          </div>
        )}

        {view === 'login' && (
          <form className="login-form" onSubmit={submitLogin}>
            <label className="login-field">
              <span>Correo o usuario</span>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="usuario o correo"
                autoFocus
              />
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <div className="pw-field">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPw ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </label>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions">
              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            </div>

            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('forgot')}>
                ¿Olvidaste tu contraseña?
              </button>
              <button type="button" className="auth-link" onClick={() => switchView('resend')}>
                ¿No te llegó el correo de verificación?
              </button>
              <button type="button" className="auth-link" onClick={() => switchView('register')}>
                Crear cuenta
              </button>
            </div>
          </form>
        )}

        {view === 'register' && (
          <form className="login-form" onSubmit={submitRegister}>
            <label className="login-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoFocus
              />
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            <label className="login-field">
              <span>Repetir contraseña</span>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions">
              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </div>

            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Ya tengo cuenta · Iniciar sesión
              </button>
            </div>
          </form>
        )}

        {view === 'forgot' && (
          <form className="login-form" onSubmit={submitForgot}>
            <label className="login-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoFocus
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions">
              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </div>

            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

        {view === 'sent' && (
          <div className="auth-sent">
            {info && <p className="login-ok">{info}</p>}
            {devLink && (
              <p className="login-dev-link">
                <strong>Modo desarrollo:</strong> sin SMTP configurado, este es el enlace
                (también aparece en la consola del backend):
                <br />
                <a href={devLink} target="_blank" rel="noopener noreferrer">{devLink}</a>
              </p>
            )}
            <div className="login-actions">
              <button type="button" className="btn-primary login-submit" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        )}

        {view === 'resend' && (
          <form className="login-form" onSubmit={submitResend}>
            <label className="login-field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoFocus
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions">
              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? 'Reenviando...' : 'Reenviar enlace'}
              </button>
            </div>

            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

        {view === 'reset' && (
          <form className="login-form" onSubmit={submitReset}>
            <label className="login-field">
              <span>Contraseña nueva</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </label>

            <label className="login-field">
              <span>Repetir contraseña</span>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions">
              <button type="submit" className="btn-primary login-submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </div>

            <div className="auth-links">
              <button type="button" className="auth-link" onClick={() => switchView('login')}>
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}