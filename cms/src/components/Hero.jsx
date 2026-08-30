import { useState } from 'react'
import ImageField from './ImageField.jsx'
import { IconPencil, IconCart } from '../../../utils/icons.jsx'
import { renderBold } from '../../../utils/formato.jsx'

function Hero({ settings, updateSettings }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(settings)

  const startEdit = () => {
    setForm(settings)
    setEditing(true)
  }

  const save = (e) => {
    e.preventDefault()
    updateSettings({
      siteName: form.siteName,
      tagline: form.tagline,
      heroTitle: form.heroTitle,
      heroTextColor: form.heroTextColor,
      heroImage: form.heroImage,
      heroImageSize: form.heroImageSize,
    })
    setEditing(false)
  }

  return (
    <section className="hero" id="inicio">
      {editing ? (
        <form className="cms-edit-panel hero-edit" onSubmit={save}>
          <h3>Editar contenido de la página</h3>
          <label>
            Nombre del negocio o empresa (se muestra al lado del logo)
            <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
          </label>
          <label>
            Eslogan
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </label>
          <label>
            Título principal
            <input value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} />
          </label>
          <label>
            Color de las letras del hero
            <input type="color" value={form.heroTextColor || '#ffffff'} onChange={(e) => setForm({ ...form, heroTextColor: e.target.value })} />
          </label>
          <ImageField
            key={`hero-img-${form.heroImage || 'none'}`}
            label="Imagen de fondo del catálogo (URL o archivo)"
            value={form.heroImage || ''}
            onChange={(v) => setForm({ ...form, heroImage: v })}
            placeholder="https://ejemplo.com/imagen.jpg (vacío para usar la predeterminada)"
            size={form.heroImageSize ?? 420}
            onSizeChange={(v) => setForm({ ...form, heroImageSize: v })}
            sizeLabel="Altura de la sección"
          />
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>Cancelar</button>
            <button type="submit" className="btn-save">Guardar</button>
          </div>
        </form>
      ) : (
        <div className="hero-content">
          <div className="hero-text" style={settings.heroTextColor ? { color: settings.heroTextColor } : undefined}>
            <span className="tagline">{renderBold(settings.tagline)}</span>
            <h1>{settings.heroTitle}</h1>
            <div className="hero-actions">
              <a href="#productos" className="btn-primary">Ver productos</a>
              <button className="btn-edit" onClick={startEdit}>
                <IconPencil size={16} />
                Editar contenido
              </button>
            </div>
          </div>
          <div className="hero-illustration">
            <div className="floating-card">
              <span className="fl-icon" aria-hidden="true">
                <IconCart />
              </span>
              <p>Nuevos productos cada semana</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Hero