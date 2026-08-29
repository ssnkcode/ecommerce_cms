function upsertMeta(keyName, keyValue, content) {
  let el = document.head.querySelector(`meta[${keyName}="${keyValue}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(keyName, keyValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function applySEO({ title, description, image, url, siteName }) {
  const t = title || document.title
  const d = description || ''
  const pageUrl = url || window.location.href

  document.title = t
  if (d) upsertMeta('name', 'description', d)
  if (image) {
    upsertMeta('property', 'og:image', image)
    upsertMeta('name', 'twitter:image', image)
  }
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:title', t)
  upsertMeta('property', 'og:description', d)
  upsertMeta('property', 'og:url', pageUrl)
  if (siteName) upsertMeta('property', 'og:site_name', siteName)
  upsertMeta('name', 'twitter:card', d || image ? 'summary_large_image' : 'summary')
  upsertMeta('name', 'twitter:title', t)
  upsertMeta('name', 'twitter:description', d)
}