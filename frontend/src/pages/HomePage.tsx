import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { clearSession, getUser, saveUser, User } from '../auth'
import { WorkspaceDto } from './workspaceTypes'
import WorkspacePanel from './WorkspacePanel'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(getUser())
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([])
  const [profile, setProfile] = useState({ firstName: '', lastName: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [profileErr, setProfileErr] = useState('')
  const navigate = useNavigate()

  const loadWorkspaces = () =>
    api.get<WorkspaceDto[]>('/workspaces').then(setWorkspaces).catch(() => {})

  useEffect(() => {
    api.get<User>('/auth/me')
      .then((u) => {
        setUser(u)
        setProfile({ firstName: u.firstName, lastName: u.lastName })
      })
      .catch(() => {})
    loadWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function logout() {
    api.post('/auth/logout').catch(() => {})
    clearSession()
    navigate('/login')
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setProfileMsg('')
    setProfileErr('')
    try {
      const updated = await api.put<User>('/auth/profile', profile)
      setUser(updated)
      saveUser(updated)
      setProfile({ firstName: updated.firstName, lastName: updated.lastName })
      setProfileMsg('Profile updated.')
    } catch (err) {
      setProfileErr(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <strong>TaskFlow</strong>
        <span className="spacer" />
        <span className="muted">{user ? `${user.firstName} ${user.lastName}` : ''}</span>
        <button className="link" onClick={logout}>
          Log out
        </button>
      </header>
      <main className="content">
        <h1>Welcome{user ? `, ${user.firstName}` : ''}</h1>
        {!user?.verified && (
          <p className="error">Please verify your email to use workspace features.</p>
        )}
        <WorkspacePanel workspaces={workspaces} onChanged={loadWorkspaces} />
        <section className="panel">
          <h3>Profile</h3>
          {profileErr && <div className="error">{profileErr}</div>}
          {profileMsg && <p className="muted">{profileMsg}</p>}
          <form className="profile-form" onSubmit={saveProfile}>
            <label>
              First name
              <input
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Last name
              <input
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                required
              />
            </label>
            <button type="submit">Save profile</button>
          </form>
        </section>
      </main>
    </div>
  )
}
