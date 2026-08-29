import { useEffect, useState } from 'react'

const IMAGE_CACHE = 'cms-images-v1'

async function resolveSrc(src) {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src
  try {
    const cache = await caches.open(IMAGE_CACHE)
    const match = await cache.match(src)
    if (match) {
      const blob = await match.blob()
      return URL.createObjectURL(blob)
    }
    const res = await fetch(src, { mode: 'cors' })
    if (!res.ok) return src
    await cache.put(src, res.clone())
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch (e) {
    return src
  }
}

export default function CachedImage({ src, alt = '', ...rest }) {
  const [resolved, setResolved] = useState(null)

  useEffect(() => {
    let active = true
    let objectUrl = null
    setResolved(null)
    resolveSrc(src).then((r) => {
      if (!active) return
      if (r.startsWith('blob:')) objectUrl = r
      setResolved(r)
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!resolved) return null
  return <img src={resolved} alt={alt} {...rest} />
}