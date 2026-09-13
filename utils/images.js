import axios from 'axios'

export function processImageFile(file, { maxSize = 1400, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Archivo de imagen no válido'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const candidates = [
          ['image/avif', quality],
          ['image/webp', quality],
          ['image/jpeg', quality],
        ]
        let out = ''
        for (const [mime, q] of candidates) {
          out = canvas.toDataURL(mime, q)
          if (out.startsWith(`data:${mime}`)) break
          out = ''
        }
        resolve(out || canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Convierte un nombre (por ej. el título del producto) en un nombre de archivo válido:
// minúsculas, sin tildes, espacios y caracteres inválidos reemplazados por guiones.
export function sanitizeFilename(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Descarga una imagen por URL con axios (modo binario), la redimensiona a una
// resolución fija exacta (ancho × alto) y la convierte a data URL embebida.
// Parámetros:
//   url        – URL de origen de la imagen
//   dimensions – { width, height } resolución fija exacta en px
//   filename   – nombre del archivo (nombre del producto, sin extensión)
//   folder     – carpeta destino (opcional, por defecto 'assets')
// Retorna { dataUrl, path, width, height, filename, folder } o lanza Error.
export async function downloadProductImage(url, { width = 800, height = 691 } = {}, filename = 'producto', folder = 'assets') {
  if (!url || typeof url !== 'string') {
    throw new Error('URL de imagen no válida')
  }
  const targetW = Math.max(1, Math.round(Number(width) || 800))
  const targetH = Math.max(1, Math.round(Number(height) || 691))

  let blob
  try {
    const res = await axios.get(url, { responseType: 'blob', timeout: 30000 })
    blob = res.data
  } catch (err) {
    const status = err?.response?.status
    throw new Error(status ? `URL no accesible (HTTP ${status})` : 'No se pudo descargar la imagen desde la URL')
  }

  // Tipos MIME de imagen aceptados
  const imageMime = /^image\/(?:jpe?g|png|webp|avif|gif|bmp|svg\+xml|ico)$/i
  const mime = blob?.type
  if (!mime || !imageMime.test(mime)) {
    throw new Error('El archivo descargado no es una imagen válida')
  }

  // Carga la imagen desde el blob para validar bytes y redimensionarla en canvas
  const loaded = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('El archivo descargado no es una imagen válida'))
    img.src = URL.createObjectURL(blob)
  })

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  // Ajuste "cover": recorta para llenar las dimensiones exactas
  const imgRatio = loaded.width / loaded.height
  const targetRatio = targetW / targetH
  let sx, sy, sw, sh
  if (imgRatio > targetRatio) {
    sh = loaded.height
    sw = sh * targetRatio
    sy = 0
    sx = (loaded.width - sw) / 2
  } else {
    sw = loaded.width
    sh = sw / targetRatio
    sx = 0
    sy = (loaded.height - sh) / 2
  }
  ctx.drawImage(loaded, sx, sy, sw, sh, 0, 0, targetW, targetH)
  URL.revokeObjectURL(loaded.src)

  const candidates = [
    ['image/webp', 0.85],
    ['image/avif', 0.85],
    ['image/jpeg', 0.85],
  ]
  let dataUrl = ''
  let ext = 'webp'
  for (const [mimeType, q] of candidates) {
    dataUrl = canvas.toDataURL(mimeType, q)
    if (dataUrl.startsWith(`data:${mimeType}`)) {
      ext = mimeType.split('/')[1]
      break
    }
    dataUrl = ''
  }
  if (!dataUrl) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    ext = 'jpg'
  }

  // Nombre de archivo sanitizado (nombre del producto) + ruta folder/producto.ext
  const safeName = sanitizeFilename(filename) || 'producto'
  const path = `${folder || 'assets'}/${safeName}.${ext}`

  return {
    dataUrl,
    path,
    width: targetW,
    height: targetH,
    filename: safeName,
    folder: folder || 'assets',
    ext,
  }
}