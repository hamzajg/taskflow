import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { User } from '../auth'

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post<User>('/auth/register', form)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed')
    }
  }

  if (done) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p className="muted">
          We sent a verification link to <strong>{form.email}</strong>. Verify your
          email to activate workspace features, then sign in.
        </p>
        <button onClick={() => navigate('/login')}>Go to sign in</button>
      </div>
    )
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={onSubmit}>
        <label>
          First name
          <input value={form.firstName} onChange={set('firstName')} required />
        </label>
        <label>
          Last name
          <input value={form.lastName} onChange={set('lastName')} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Password (min 8 chars)
          <input type="password" value={form.password} onChange={set('password')} minLength={8} required />
        </label>
        <button type="submit">Register</button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
