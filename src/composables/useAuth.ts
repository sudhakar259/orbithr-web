import { ref } from 'vue'
import api, { authApi } from '@/services/api'

const tokenKey = 'orbithr_token'
const userKey = 'orbithr_user'

const token = ref<string | null>(localStorage.getItem(tokenKey))
let _rawUser: string | null = null
try {
  _rawUser = localStorage.getItem(userKey)
} catch {
  _rawUser = null
}
let _parsedUser: Record<string, unknown> | null = null
if (_rawUser && _rawUser !== 'undefined' && _rawUser !== 'null') {
  try {
    _parsedUser = JSON.parse(_rawUser)
  } catch {
    // malformed JSON in storage — ignore and clear bad value
    try { localStorage.removeItem(userKey) } catch { /* ignore */ }
    _parsedUser = null
  }
}
const user = ref<Record<string, unknown> | null>(_parsedUser)

export function useAuth() {
  const isAuthenticated = () => !!token.value

  function setAuth(newUser: Record<string, unknown> | null, newToken: string) {
    user.value  = newUser  || null
    token.value = newToken || null
    if (newToken) {
      localStorage.setItem(tokenKey, newToken)
    } else {
      localStorage.removeItem(tokenKey)
    }
    if (newUser) {
      localStorage.setItem(userKey, JSON.stringify(newUser))
    } else {
      localStorage.removeItem(userKey)
    }
  }

  function roles(): string[] {
    if (!user.value) return []
    if (Array.isArray(user.value.roles))
      return (user.value.roles as unknown[]).map(r => (typeof r === 'string' ? r : (r as Record<string, string>).name))
    if (Array.isArray(user.value.role)) return user.value.role as string[]
    if (typeof user.value.role === 'string') return [user.value.role]
    return (user.value.roles as string[]) || []
  }

  function hasRole(r: string) {
    return roles().includes(r)
  }

  function permissions(): string[] {
    if (!user.value) return []
    const src = (user.value.all_permissions ?? user.value.permissions ?? [])
    if (Array.isArray(src)) {
      return (src as unknown[]).map(p => (typeof p === 'string' ? p : (p as Record<string, string>).name))
    }
    return []
  }

  /**
   * Check if user has a specific permission.
   *
   * Supports three formats:
   *   1. Scoped RBAC  `view.own.leave`     → exact match
   *   2. Module-dot   `leave.requests.view` → exact match
   *   3. Legacy       `view attendance`     → normalised to `view-attendance`
   *
   * Wildcard helper: `hasPermission('view.*.leave')` returns true if the user
   * has view.own.leave OR view.team.leave OR view.all.leave.
   */
  function hasPermission(permission: string) {
    const p = permission.toLowerCase().trim()
    if (p.includes('.*.')  ) {
      const [action, , resource] = p.split('.')
      return ['own', 'team', 'all'].some(
        scope => permissions().some(x => typeof x === 'string' && x.toLowerCase() === `${action}.${scope}.${resource}`)
      )
    }
    if (p.includes('.')) return permissions().some(x => typeof x === 'string' && x.toLowerCase() === p)
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '-').trim()
    return permissions().some(x => typeof x === 'string' && norm(x) === norm(p))
  }

  /**
   * Returns the highest scope the user has for a given action + resource.
   * e.g. `permissionScope('view', 'leave')` → 'all' | 'team' | 'own' | null
   */
  function permissionScope(action: string, resource: string): 'all' | 'team' | 'own' | null {
    for (const scope of ['all', 'team', 'own'] as const) {
      if (hasPermission(`${action}.${scope}.${resource}`)) return scope
    }
    return null
  }

  /** True if user has permission over at least their own data for this action+resource. */
  function canAct(action: string, resource: string) {
    return permissionScope(action, resource) !== null
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
    setAuth(u, t)
    return res
  }

  async function login(payload: { email: string; password: string }) {
    const res = await api.post('auth/login', payload, {
      headers: {
        'X-Tenant-Domain': window.location.hostname,
      },
    })
    if (res.data.redirect_to) {
      window.location.href = res.data.redirect_to
      return
    }
    const { token: t, user: u } = res.data
    setAuth(u, t)
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
    setAuth(u, t)
    return res
  }

  async function registerWithOtp(payload: {
    email: string
    code: string
    password: string
    password_confirmation: string
    organization: string
    plan_id?: string
    name?: string
    selected_modules?: string[]
  }) {
    const res = await authApi.registerWithOtp(payload)
    const { token: t, user: u } = res.data
    setAuth(u, t)
    return res
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(userKey)
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
    permissionScope,
    canAct,
    requestOtp,
    loginWithOtp,
    registerWithOtp,
    sendOtpRequest,
    verifyOtp,
    setAuth,
  }
}
