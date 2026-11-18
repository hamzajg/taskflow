import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setState('error')
      setMessage('Missing verification token.')
      return
    }
    api
      .get<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => {
        setState('ok')
        setMessage(r.message)
      })
      .catch((err) => {
        setState('error')
        setMessage(err instanceof ApiError ? err.message : 'Verification failed')
      })
  }, [params])

  return (
    <div className="auth-card">
      <h1>Email verification</h1>
      {state === 'loading' && <p className="muted">Verifying…</p>}
      {state === 'ok' && (
        <>
          <p>{message}</p>
          <Link to="/login">Continue to sign in</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <div className="error">{message}</div>
          <Link to="/login">Back to sign in</Link>
        </>
      )}
    </div>
  )
}
