export const API_BASE_URL = 'http://localhost:3001'

let cachedApiOnline = null

export function isApiReachable() {
  return cachedApiOnline === true
}

export function setApiReachable(value) {
  cachedApiOnline = value
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 401) {
    let unauthorized = false
    let authError = 'No autorizado'
    try {
      const body = await res.json()
      authError = body?.error || authError
      unauthorized = !body?.error || /no autorizado|incorrectos|bloqueada/i.test(authError)
    } catch {
      unauthorized = true
    }
    if (unauthorized) return { _unauthorized: true, status: 401, error: authError }
  }
  if (res.status === 204) return { ok: true, status: 204 }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    return { _error: true, status: res.status, error: data?.error || `Error ${res.status}`, data }
  }
  return { ok: true, status: res.status, data }
}

async function ping() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { credentials: 'include' })
    setApiReachable(res.ok)
    return res.ok
  } catch {
    setApiReachable(false)
    return false
  }
}

export async function checkApi() {
  if (typeof cachedApiOnline === 'boolean') return cachedApiOnline
  return ping()
}

export async function apiLogin(user, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ user, password }),
  })
  return res
}

export async function apiLogout() {
  return request('/api/auth/logout', { method: 'POST' })
}

export async function apiGetMe() {
  const res = await request('/api/auth/me')
  return res.ok ? { ok: true, ...res.data } : res
}

export async function apiFetchCatalog() {
  return request('/api/catalog')
}

export async function apiSaveCatalog({ settings, products }) {
  return request('/api/catalog', {
    method: 'PUT',
    body: JSON.stringify({ settings, products }),
  })
}

export async function apiGetSettings() {
  const res = await request('/api/settings')
  if (!res.ok) throw new Error(res.error || 'No se pudieron obtener los ajustes')
  return res.data
}

export async function apiSaveSettings(patch) {
  const res = await request('/api/settings', { method: 'PUT', body: JSON.stringify(patch) })
  if (!res.ok) throw new Error(res.error || 'No se pudieron guardar los ajustes')
  return res.data
}

export async function apiGetProducts() {
  const res = await request('/api/products')
  if (!res.ok) throw new Error(res.error || 'No se pudieron obtener los productos')
  return res.data?.products || []
}

export async function apiCreateProduct(product) {
  const res = await request('/api/products', { method: 'POST', body: JSON.stringify(product) })
  if (!res.ok) throw new Error(res.error || 'No se pudo crear el producto')
  return res.data
}

export async function apiUpdateProduct(id, patch) {
  const res = await request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
  if (!res.ok) throw new Error(res.error || 'No se pudo actualizar el producto')
  return res.data
}

export async function apiDeleteProduct(id) {
  const res = await request(`/api/products/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(res.error || 'No se pudo eliminar el producto')
  return res.data
}