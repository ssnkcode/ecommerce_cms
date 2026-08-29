import { useRef, useState } from 'react'
import { IconImage, IconUpload } from '../../../utils/icons.jsx'
import { processImageFile } from '../../../utils/images.js'

function ImageField({ label, value, onChange, placeholder, size, onSizeChange, sizeLabel, sizeUnit = 'px' }) {
  const [url, setUrl] = useState(value || '')
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    try {
      const dataUrl = await processImageFile(file, { maxSize: 1600, quality: 0.82 })
      setUrl(dataUrl)
      onChange(dataUrl)
    } catch (err) {
      console.error('Error al procesar la imagen', err)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUrl = (val) => {
    setUrl(val)
    onChange(val)
  }

  const clear = () => {
    setUrl('')
    onChange('')
  }

  const hasSizeControl = typeof size === 'number' && typeof onSizeChange === 'function'

  return (
    <div className="image-field">
      <label className="image-field-label">{label}</label>

      {(value && value.trim()) ? (
        <div className="image-preview">
          <img
            className="image-preview-img"
            src={value}
            alt={label}
            style={hasSizeControl ? { height: `${size}px` } : undefined}
          />
          <div className="image-preview-actions">
            <button type="button" className="btn-cancel small" onClick={() => fileRef.current && fileRef.current.click()}>
              Cambiar imagen
            </button>
            <button type="button" className="btn-cancel small danger" onClick={clear}>
              Eliminar imagen
            </button>
          </div>
        </div>
      ) : (
        <div className="image-dropzone">
          <span className="drop-ico" aria-hidden="true">
            <IconImage size={40} />
          </span>
          <p>Arrastrá una imagen o elegila desde tu dispositivo</p>
          <button type="button" className="btn-save" onClick={() => fileRef.current && fileRef.current.click()}>
            <IconUpload size={16} />
            Subir desde local
          </button>
        </div>
      )}

      {!value?.trim() && (
        <div className="image-url-row">
          <input
            type="url"
            value={url}
            onChange={(e) => handleUrl(e.target.value)}
            placeholder={placeholder || 'https://ejemplo.com/imagen.jpg'}
          />
        </div>
      )}

      {hasSizeControl && (
        <div className="image-size-control">
          <span className="image-size-label">{sizeLabel || 'Tamaño'}: <strong>{size}{sizeUnit}</strong></span>
          <input
            type="range"
            min="20"
            max="500"
            step="5"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
          />
          <div className="image-size-px">
            <span>{size}{sizeUnit}</span>
            <input
              type="number"
              min="20"
              max="500"
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default ImageField