import { FormEvent, useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { saveUser, User } from '../auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Input from '../components/Input'

export default function ProfileForm({
  user,
  onSaved,
}: {
  user: User
  onSaved: (u: User) => void
}) {
  const [profile, setProfile] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
  })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setProfile({ firstName: user.firstName, lastName: user.lastName })
  }, [user])

  async function save(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    setErr('')
    setPending(true)
    try {
      const updated = await api.put<User>('/auth/profile', profile)
      saveUser(updated)
      onSaved(updated)
      setProfile({ firstName: updated.firstName, lastName: updated.lastName })
      setMsg('Profile updated.')
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Update failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="profile-form" onSubmit={save}>
      {err && <Alert>{err}</Alert>}
      {msg && <Alert tone="success">{msg}</Alert>}
      <Input
        label="First name"
        autoComplete="given-name"
        value={profile.firstName}
        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
        required
      />
      <Input
        label="Last name"
        autoComplete="family-name"
        value={profile.lastName}
        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
        required
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
