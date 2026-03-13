import { ref } from 'vue'
import api, { authApi } from '@/services/api'

const tokenKey = 'orbithr_token'
const userKey = 'orbithr_user'

const token = ref<string | null>(localStorage.getItem(tokenKey))
let _rawUser: string | null = null
try {
  _rawUser = localStorage.getItem(userKey)
} catch (e) {
  _rawUser = null
}
let _parsedUser: any = null
if (_rawUser && _rawUser !== 'undefined' && _rawUser !== 'null') {
  try {
    _parsedUser = JSON.parse(_rawUser)
  } catch (e) {
    // malformed JSON in storage — ignore and clear bad value
    try { localStorage.removeItem(userKey) } catch (err) {}
    _parsedUser = null
  }
}
const user = ref<any>(_parsedUser)

export function useAuth() {
  const isAuthenticated = () => !!token.value

  // Removed manual setAuthToken logic, interceptor handles it
  function setAuth(newUser: any, newToken: string) {
    user.value = newUser
    token.value = newToken
    localStorage.setItem(tokenKey, newToken)
    localStorage.setItem(userKey, JSON.stringify(newUser))
  }

  /** Extract user roles (if needed) */
  function roles() {
    if (!user.value) return []
    if (Array.isArray(user.value.roles))
      return user.value.roles.map((r: any) => (typeof r === 'string' ? r : r.name))
    if (Array.isArray(user.value.role)) return user.value.role
    if (typeof user.value.role === 'string') return [user.value.role]
    return user.value.roles || []
  }

  function hasRole(r: string) {
    return roles().includes(r)
  }

  /** ✅ New: Extract user permissions */
  function permissions() {
    if (!user.value) return []
    const src = (user.value.all_permissions ?? user.value.permissions ?? [])
    if (Array.isArray(src)) {
      return src.map((p: any) => (typeof p === 'string' ? p : p.name))
    }
    return []
  }

  /** ✅ New: Check if user has a specific permission */
  function hasPermission(permission: string) {
    return permissions().includes(permission)
  }

  async function register(payload: {
    name: string
    email: string
    password: string
    organization: string
    plan?: string
  }) {
    const res = await api.post('/auth/register', payload)
    const { token: t, user: u } = res.data
    setAuth(u, t) // Use the new, simplified setAuth
    return res
  }

  async function login(payload: { email: string; password: string}) {
    const res = await api.post('auth/login', payload, {
      headers: {
        'X-Tenant-Domain': window.location.hostname, // e.g. test.orbithr.test
      },
    })
      // Check if backend wants to redirect
    if (res.data.redirect_to) {
      window.location.href = res.data.redirect_to;
      return; // stop further execution
    }
    const { token: t, user: u } = res.data
    setAuth(u, t) // Use the new, simplified setAuth
    return res
  }

  async function requestOtp(email: string, purpose: 'login' | 'register') {
    return authApi.requestOtp(email, purpose)
  }

  async function sendOtpRequest(email: string) {
    return authApi.sendOtp(email)
  }

  async function verifyOtp(email: string, code: string) {
    return authApi.verifyOtp(email, code)
  }

  async function loginWithOtp(email: string, code: string) {
    const res = await authApi.verifyOtp(email, code)
    const { token: t, user: u } = res.data
    setAuth(u, t) // Use the new, simplified setAuth
    return res
  }

  async function registerWithOtp(payload: { email: string; code: string; password: string; password_confirmation:string; organization: string; plan_id?: string; name?: string, selected_modules?: string[] }) {
    const res = await authApi.registerWithOtp(payload)
    const { token: t, user: u } = res.data
    setAuth(u, t) // Use the new, simplified setAuth
    return res
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(userKey)
    // No need to explicitly call setAuthToken(null), as interceptor will read null from storage
  }

  function getUser() {
    return user.value
  }

  return {
    token,
    user,
    register,
    login,
    logout,
    isAuthenticated,
    getUser,
    roles,
    hasRole,
    permissions,
    hasPermission,
    requestOtp,
    loginWithOtp,
    registerWithOtp,
    sendOtpRequest,
    verifyOtp,
    setAuth
  }
}
