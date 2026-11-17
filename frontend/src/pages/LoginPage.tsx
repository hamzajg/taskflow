import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { AuthResponse, setSession } from '../auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email, password })
      setSession(res)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    }
  }

  return (
    <div className="auth-card">
      <h1>TaskFlow</h1>
      <p className="muted">Sign in to your workspace</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">Log in</button>
      </form>
      <p className="muted">
        <Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link>
      </p>
    </div>
  )
}
