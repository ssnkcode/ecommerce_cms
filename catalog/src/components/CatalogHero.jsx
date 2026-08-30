import { DEFAULT_HERO_IMAGE } from '../../../utils/datos.js'
import CachedImage from '../../../utils/cachedImage.jsx'
import { renderBold } from '../../../utils/formato.jsx'

export default function CatalogHero({ settings }) {
  const hero = settings.heroImage || DEFAULT_HERO_IMAGE
  const heroStyle = settings.heroImageSize ? { minHeight: `${settings.heroImageSize}px` } : undefined

  return (
    <section className="catalog-hero" style={heroStyle}>
      <CachedImage
        className="catalog-hero-img"
        src={hero}
        alt=""
        width={1600}
        height={600}
        fetchPriority="high"
        decoding="async"
        aria-hidden="true"
      />
      <div className="catalog-hero-content" style={settings.heroTextColor ? { color: settings.heroTextColor } : undefined}>
        <span className="tagline">{renderBold(settings.tagline)}</span>
        <h1>{settings.heroTitle}</h1>
      </div>
    </section>
  )
}