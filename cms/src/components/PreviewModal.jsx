import { useEffect, useRef } from 'react'
import { IconClose, IconEye } from '../../../utils/icons.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'

export default function PreviewModal({ onClose }) {
  const ref = useRef(null)
  useFocusTrap(ref, { onEscape: onClose })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="preview-backdrop" onClick={onClose}>
      <div
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa del catálogo"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="preview-head">
          <h2>
            <IconEye size={18} />
            Vista previa en vivo
          </h2>
          <button className="preview-close" onClick={onClose} aria-label="Cerrar vista previa">
            <IconClose size={18} />
          </button>
        </div>
        <iframe
          className="preview-frame"
          src="/catalog/catalog.html"
          title="Vista previa del catálogo"
        />
        <p className="preview-note">
          Los cambios guardados se reflejan automáticamente al abrir el catálogo.
        </p>
      </div>
    </div>
  )
}