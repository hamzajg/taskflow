import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { User } from '../auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'

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
      <Card className="auth-card">
        <h1>Check your email</h1>
        <p className="muted">
          We sent a verification link to <strong>{form.email}</strong>. Verify your
          email to activate workspace features, then sign in.
        </p>
        <Button onClick={() => navigate('/login')}>Go to sign in</Button>
      </Card>
    )
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <Card className="auth-card">
      <h1>Create your account</h1>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit}>
        <Input
          label="First name"
          autoComplete="given-name"
          value={form.firstName}
          onChange={set('firstName')}
          required
        />
        <Input
          label="Last name"
          autoComplete="family-name"
          value={form.lastName}
          onChange={set('lastName')}
          required
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          required
        />
        <Input
          label="Password"
          hint="Minimum 8 characters"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          minLength={8}
          required
        />
        <Button type="submit">Register</Button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </Card>
  )
}
