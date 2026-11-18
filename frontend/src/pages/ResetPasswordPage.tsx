import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

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
      <Card className="auth-card">
        <h1>Password updated</h1>
        <Button onClick={() => navigate('/login')}>Sign in</Button>
      </Card>
    )
  }

  return (
    <Card className="auth-card">
      <h1>Choose a new password</h1>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit}>
        <Input
          label="New password"
          hint="Minimum 8 characters"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Button type="submit">Update password</Button>
      </form>
      <p className="muted">
        <Link to="/login">Back to sign in</Link>
      </p>
    </Card>
  )
}
