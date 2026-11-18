const TOKEN_KEY = 'taskflow.token'
const USER_KEY = 'taskflow.user'

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  verified: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as User) : null
}

export function setSession(res: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, res.token)
  localStorage.setItem(USER_KEY, JSON.stringify(res.user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return getToken() !== null
}
