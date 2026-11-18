import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await api.post('/auth/forgot-password', { email }).catch(() => {})
    setSent(true)
  }

  return (
    <Card className="auth-card">
      <h1>Reset password</h1>
      {sent ? (
        <p className="muted">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit">Send reset link</Button>
        </form>
      )}
      <p className="muted">
        <Link to="/login">Back to sign in</Link>
      </p>
    </Card>
  )
}
