import { useRef, useState } from 'react'
import { IconDownload, IconPdf } from '../../../utils/icons.jsx'
import { useFocusTrap } from '../../../utils/a11y.jsx'

export default function ExportModal({ settings, onUpdate, onExportPdf, onExportJson, onClose }) {
  const boxRef = useRef(null)
  useFocusTrap(boxRef, { onEscape: onClose })

  const [form, setForm] = useState({
    pdfBusinessName: settings.pdfBusinessName || '',
    pdfListMode: settings.pdfListMode === 'detailed' ? 'detailed' : 'compact',
    pdfShowImages: settings.pdfShowImages !== false,
    pdfShowDate: settings.pdfShowDate !== false,
    pdfGroupByCategory: !!settings.pdfGroupByCategory,
  })

  const commit = (patch) => {
    const next = { ...form, ...patch }
    setForm(next)
    onUpdate(next)
  }

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div
        className="confirm-box export-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="export-title">Exportar catálogo</h4>
        <p>Configurá cómo se verá el PDF y luego exportá.</p>

        <div className="export-field">
          <label htmlFor="pdf-business-name">Empresa / negocio del encabezado del PDF</label>
          <input
            id="pdf-business-name"
            type="text"
            value={form.pdfBusinessName}
            placeholder={settings.siteName}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => commit({ pdfBusinessName: e.target.value })}
          />
          <small>Si lo dejás vacío, se usa por defecto «{settings.siteName}».</small>
        </div>

        <fieldset className="export-field export-legend">
          <legend>Formato de lista</legend>
          <label className="export-radio">
            <input
              type="radio"
              name="pdf-mode"
              value="compact"
              checked={form.pdfListMode !== 'detailed'}
              onChange={() => commit({ pdfListMode: 'compact' })}
            />
            Solo precios (listado compacto)
          </label>
          <label className="export-radio">
            <input
              type="radio"
              name="pdf-mode"
              value="detailed"
              checked={form.pdfListMode === 'detailed'}
              onChange={() => commit({ pdfListMode: 'detailed' })}
            />
            Detallado (con descripción y especificaciones)
          </label>
        </fieldset>

        <div className="export-checks">
          <label className="export-check">
            <input
              type="checkbox"
              checked={form.pdfShowImages}
              onChange={(e) => commit({ pdfShowImages: e.target.checked })}
            />
            Incluir imágenes
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={form.pdfShowDate}
              onChange={(e) => commit({ pdfShowDate: e.target.checked })}
            />
            Mostrar fecha en el encabezado
          </label>
          <label className="export-check">
            <input
              type="checkbox"
              checked={form.pdfGroupByCategory}
              onChange={(e) => commit({ pdfGroupByCategory: e.target.checked })}
            />
            Agrupar por categoría
          </label>
        </div>

        <div className="confirm-actions confirm-column">
          <button type="button" className="btn-save" onClick={onExportPdf}>
            <IconPdf size={16} />
            Exportar en PDF
          </button>
          <button type="button" className="btn-restore-prev" onClick={onExportJson}>
            <IconDownload size={16} />
            Exportar en JSON (.json)
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}