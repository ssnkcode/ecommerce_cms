// URL base de la API del CMS.
// En producción se define VITE_API_URL en el build (Cloudflare Pages / Vercel);
// si no está, asume el backend local de desarrollo.
const envApiUrl =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim()
    : ''
export const API_BASE_URL = envApiUrl ? envApiUrl.replace(/\/+$/, '') : 'http://localhost:3001'

export const AUTH_STORAGE_KEY = 'cms-admin-token'

export function getToken() {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_STORAGE_KEY, token)
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    /* sin acceso a localStorage */
  }
}

export function clearToken() {
  setToken('')
}

let cachedApiOnline = null

export function isApiReachable() {
  return cachedApiOnline === true
}

export function setApiReachable(value) {
  cachedApiOnline = value
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers,
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
    if (unauthorized) {
      clearToken()
      return { _unauthorized: true, status: 401, error: authError }
    }
  }
  if (res.status === 204) return { ok: true, status: 204 }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (path === '/api/auth/login' && res.ok && data?.token) {
    setToken(data.token)
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

export async function apiRegister({ email, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function apiVerifyEmail(token) {
  return request('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function apiResendVerification(email) {
  return request('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function apiForgotPassword(email) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function apiResetPassword({ token, password }) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function apiLogout() {
  const res = await request('/api/auth/logout', { method: 'POST' })
  clearToken()
  return res
}

export async function apiGetMe() {
  const res = await request('/api/auth/me')
  return res.ok ? { ok: true, ...res.data } : res
}

export async function apiChangeCredentials({ currentPassword, username, password }) {
  const res = await request('/api/auth/credentials', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, username, password }),
  })
  if (!res.ok) throw new Error(res.error || 'No se pudieron cambiar las credenciales')
  return res.data
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