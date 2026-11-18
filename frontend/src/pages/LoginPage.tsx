import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { AuthResponse, setSession } from '../auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

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
    <Card className="auth-card">
      <h1>TaskFlow</h1>
      <p className="muted">Sign in to your workspace</p>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit">Log in</Button>
      </form>
      <p className="muted">
        <Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link>
      </p>
    </Card>
  )
}
