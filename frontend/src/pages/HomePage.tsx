import { FormEvent, useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { saveUser, User } from '../auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useShell } from '../shell/ShellContext'
import WorkspacePanel from './WorkspacePanel'

export default function HomePage() {
  const { user, workspaces, refreshWorkspaces, setUser } = useShell()
  const [profile, setProfile] = useState({ firstName: '', lastName: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')

  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName, lastName: user.lastName })
  }, [user])

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setProfileMsg('')
    setProfileErr('')
    try {
      const updated = await api.put<User>('/auth/profile', profile)
      saveUser(updated)
      setUser(updated)
      setProfile({ firstName: updated.firstName, lastName: updated.lastName })
      setProfileMsg('Profile updated.')
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  return (
    <>
      <h1>Welcome{user ? `, ${user.firstName}` : ''}</h1>
      {!user?.verified && (
        <Alert tone="warning">Please verify your email to use workspace features.</Alert>
      )}
      <div id="workspaces" className="anchor">
        <WorkspacePanel workspaces={workspaces} onChanged={refreshWorkspaces} />
      </div>
      <div id="profile" className="anchor">
        <Card title="Profile">
          {profileErr && <Alert>{profileErr}</Alert>}
          {profileMsg && <Alert tone="success">{profileMsg}</Alert>}
          <form className="profile-form" onSubmit={saveProfile}>
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
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}
