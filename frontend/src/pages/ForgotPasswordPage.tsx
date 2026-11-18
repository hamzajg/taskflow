import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await api.post('/auth/forgot-password', { email }).catch(() => {})
    setSent(true)
  }

  return (
    <div className="auth-card">
      <h1>Reset password</h1>
      {sent ? (
        <p className="muted">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit">Send reset link</button>
        </form>
      )}
      <p className="muted">
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  )
}
