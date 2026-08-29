import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import CardGrid from './components/CardGrid.jsx'
import ExportModal from './components/ExportModal.jsx'
import PreviewModal from './components/PreviewModal.jsx'
import PrintSheet from './components/PrintSheet.jsx'
import { readData, saveData, normalizeData, defaultProducts, defaultSettings, THEME_KEY, CATALOG_URL, WHATSAPP_NUMBER } from '../../utils/datos.js'

function loadLocal() {
  const data = readData()
  if (!data.products.length) return { settings: data.settings, products: defaultProducts }
  return data
}

function preloadImages(products) {
  return Promise.all(
    products
      .map((p) => p.image)
      .filter(Boolean)
      .map(
        (src) =>
          new Promise((resolve) => {
            const img = new window.Image()
            img.onload = img.onerror = resolve
            img.src = src
          }),
      ),
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [data, setData] = useState(loadLocal)
  const [exportChoice, setExportChoice] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [printState, setPrintState] = useState(null)
  const { settings, products } = data
  const undoRef = useRef(null)
  const lastCommittedRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    fetch(CATALOG_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((catalog) => {
        if (catalog && catalog.products) setData(normalizeData(catalog))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    saveData({ settings, products })
    if (lastCommittedRef.current !== null) {
      undoRef.current = lastCommittedRef.current
    }
    lastCommittedRef.current = { settings, products }
  }, [settings, products])

  useEffect(() => {
    if (!printState) return
    const stop = () => setPrintState(null)
    window.addEventListener('afterprint', stop)
    return () => window.removeEventListener('afterprint', stop)
  }, [printState])

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify({ settings, products }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    exportCatalog()
    setExportChoice(false)
  }

  const handleExportPdf = async () => {
    setExportChoice(false)
    setPrintState({})
    if (settings.pdfShowImages !== false) await preloadImages(products)
    await new Promise((r) => setTimeout(r, 150))
    window.print()
  }

  const saveDataActions = useMemo(
    () => ({
      updateSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      addProduct: (product) =>
        setData((d) => ({ ...d, products: [...d.products, { ...product, id: Date.now() }] })),
      updateProduct: (id, patch) =>
        setData((d) => ({
          ...d,
          products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removeProduct: (id) =>
        setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) })),
      clearAll: () => setData((d) => ({ ...d, products: [] })),
      restorePrevious: () => {
        const snapshot = undoRef.current
        if (!snapshot) return
        setData({ settings: snapshot.settings, products: snapshot.products })
      },
      reset: () => setData({ settings: defaultSettings, products: defaultProducts }),
    }),
    [],
  )

  return (
    <div className="app">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <Navbar
        siteName={settings.siteName}
        logo={settings.logo}
        theme={theme}
        onToggleTheme={toggleTheme}
        onExport={() => setExportChoice(true)}
        onPreview={() => setPreviewOpen(true)}
      />
      <main id="contenido-principal" tabIndex={-1}>
        <Hero settings={settings} updateSettings={saveDataActions.updateSettings} />
        <CardGrid
          products={products}
          productsTitle={settings.productsTitle}
          categories={settings.categories}
          onUpdateCategories={(cats) => saveDataActions.updateSettings({ categories: cats })}
          onReset={saveDataActions.reset}
          clearAll={saveDataActions.clearAll}
          restorePrevious={saveDataActions.restorePrevious}
          hasPrevious={!!undoRef.current}
          {...saveDataActions}
        />
      </main>
      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} {settings.siteName} — CMS de contenido.
        </p>
        <p className="footer-cta">
          ¿Querés una página así?{' '}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-wa"
          >
            Presiona aquí: 3541682310
          </a>
        </p>
      </footer>

      {exportChoice && (
        <ExportModal
          settings={settings}
          onUpdate={saveDataActions.updateSettings}
          onExportPdf={handleExportPdf}
          onExportJson={handleExportJson}
          onClose={() => setExportChoice(false)}
        />
      )}

      {previewOpen && <PreviewModal onClose={() => setPreviewOpen(false)} />}

      {printState && <PrintSheet settings={settings} products={products} />}
    </div>
  )
}