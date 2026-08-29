import { useEffect, useMemo, useRef, useState } from 'react'
import { readData, readCart, saveCart, normalizeData, THEME_KEY, WHATSAPP_NUMBER, STORAGE_KEY, CATALOG_URL, DEFAULT_HERO_IMAGE } from '../utils/datos.js'
import { applySEO } from '../utils/seo.jsx'
import { IconBox } from '../utils/icons.jsx'
import CatalogNavbar from './src/components/CatalogNavbar.jsx'
import CatalogHero from './src/components/CatalogHero.jsx'
import ProductCard from './src/components/ProductCard.jsx'
import ProductModal from './src/components/ProductModal.jsx'
import CartDrawer from './src/components/CartDrawer.jsx'
import AdminLoginModal from './src/components/AdminLoginModal.jsx'
import FloatingButtons from './src/components/FloatingButtons.jsx'
import CatalogToolbar from './src/components/CatalogToolbar.jsx'
import ProductSkeleton from './src/components/ProductSkeleton.jsx'

const PAGE_SIZE = 12

export default function CatalogApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [data, setData] = useState(readData)
  const [status, setStatus] = useState(() => (data.products.length ? 'ready' : 'loading'))
  const [selected, setSelected] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [cart, setCart] = useState(readCart)
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [routeTick, setRouteTick] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef(null)

  const { settings, products } = data
  const q = search.trim().toLowerCase()

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    let mounted = true
    if (localStorage.getItem(STORAGE_KEY) != null) {
      setStatus('ready')
      return () => {
        mounted = false
      }
    }
    fetch(CATALOG_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        if (mounted && json && Array.isArray(json.products) && json.products.length) {
          setData((prev) => {
            const current = readData()
            return current.products.length ? prev : normalizeData(json)
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setStatus('ready')
      })
    return () => {
      mounted = false
    }
  }, [])

  const refresh = () => setData(readData())

  useEffect(() => {
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready') return
    const baseUrl = window.location.origin + window.location.pathname
    const siteName = settings.siteName || 'SsnkCode'
    if (selected) {
      const pid = encodeURIComponent(String(selected.id))
      applySEO({
        title: `${selected.title} — ${siteName}`,
        description: selected.description || settings.tagline || `Conocé ${selected.title} en el catálogo de ${siteName}.`,
        image: selected.image || (Array.isArray(selected.gallery) ? selected.gallery[0] : '') || settings.heroImage || DEFAULT_HERO_IMAGE,
        url: `${baseUrl}#/producto/${pid}`,
        siteName,
      })
      return
    }
    applySEO({
      title: `${siteName} — Catálogo`,
      description: settings.tagline || settings.heroSubtitle || `Catálogo digital de ${siteName}.`,
      image: (products[0] || {}).image || settings.heroImage || DEFAULT_HERO_IMAGE,
      url: baseUrl,
      siteName,
    })
  }, [settings, products, selected, status])

  useEffect(() => {
    const onHash = () => setRouteTick((t) => t + 1)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (status !== 'ready') return
    const m = window.location.hash.match(/^#\/producto\/(.+)$/)
    if (!m) {
      if (selected) setSelected(null)
      return
    }
    const id = decodeURIComponent(m[1])
    const found = products.find((p) => String(p.id) === id)
    if (found) setSelected(found)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, status, routeTick])

  const cartCount = cart.reduce((acc, it) => acc + it.qty, 0)

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const openProduct = (product) => {
    setSelected(product)
    window.location.hash = `#/producto/${encodeURIComponent(String(product.id))}`
  }

  const closeProduct = () => {
    setSelected(null)
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.id === product.id)
      if (existing) {
        return prev.map((it) => (it.id === product.id ? { ...it, qty: it.qty + 1 } : it))
      }
      return [...prev, { id: product.id, title: product.title, price: product.price, image: product.image, category: product.category, qty: 1 }]
    })
    setToast(`${product.title} agregado al carrito`)
  }

  const changeQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((it) => it.id !== id))
      return
    }
    setCart((prev) => prev.map((it) => (it.id === id ? { ...it, qty } : it)))
  }

  const removeFromCart = (id) => setCart((prev) => prev.filter((it) => it.id !== id))
  const clearCart = () => setCart([])

  const categories = useMemo(() => {
    const fromSettings = Array.isArray(settings.categories) ? settings.categories : []
    const fromProducts = products.map((p) => p.category).filter(Boolean)
    return Array.from(new Set([...fromSettings, ...fromProducts]))
  }, [products, settings.categories])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    })
  }, [products, category, q])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [products, category, q])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visible >= filtered.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length))
        }
      },
      { rootMargin: '300px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered, visible])

  const visibleProducts = filtered.slice(0, visible)
  const moreLeft = visible < filtered.length

  return (
    <div className="catalog-app">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <CatalogNavbar
        settings={settings}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogin={() => setShowLogin(true)}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <CatalogHero settings={settings} />

      <main className="catalog-main" id="contenido-principal" tabIndex={-1}>
        <div className="section-header">
          <h2>{settings.productsTitle}</h2>
          <span className="catalog-count">
            {filtered.length} producto{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        <CatalogToolbar
          search={search}
          onSearch={setSearch}
          category={category}
          onCategory={setCategory}
          categories={categories}
        />

        {status === 'loading' ? (
          <ProductSkeleton />
        ) : products.length === 0 ? (
          <div className="catalog-empty">
            <IconBox size={56} />
            <p>El catálogo está vacío. Agrega productos desde el CMS.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="catalog-empty">
            <IconBox size={56} />
            <p>No se encontraron productos con esa búsqueda o filtro.</p>
          </div>
        ) : (
          <>
            <div className="cat-grid">
              {visibleProducts.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={openProduct} onAdd={addToCart} />
              ))}
            </div>

            {moreLeft && (
              <div className="cat-sentinel">
                <span className="cat-sentinel-count">
                  Mostrando {Math.min(visible, filtered.length)} de {filtered.length} productos
                </span>
                <span className="cat-spinner" ref={sentinelRef} aria-hidden="true" />
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} {settings.siteName} — Catálogo.
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

      {selected && (
        <ProductModal product={selected} onClose={closeProduct} onAdd={addToCart} />
      )}
      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
      {cartOpen && (
        <CartDrawer
          items={cart}
          onClose={() => setCartOpen(false)}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onClear={clearCart}
        />
      )}
      {toast && <div className="cart-toast">{toast}</div>}

      <FloatingButtons cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />
    </div>
  )
}