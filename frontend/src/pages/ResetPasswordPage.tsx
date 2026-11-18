import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed')
    }
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Password updated</h1>
        <button onClick={() => navigate('/login')}>Sign in</button>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <h1>Choose a new password</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={onSubmit}>
        <label>
          New password (min 8 chars)
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        <button type="submit">Update password</button>
      </form>
      <p className="muted">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  )
}
