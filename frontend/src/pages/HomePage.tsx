import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { clearSession, getUser, User } from '../auth'
import { WorkspaceDto } from './workspaceTypes'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(getUser())
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get<User>('/auth/me').then(setUser).catch(() => {})
    api.get<WorkspaceDto[]>('/workspaces').then(setWorkspaces).catch(() => {})
  }, [])

  function logout() {
    api.post('/auth/logout').catch(() => {})
    clearSession()
    navigate('/login')
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
        <h2>Your workspaces</h2>
        {workspaces.length === 0 ? (
          <p className="muted">No workspaces yet — workspace management arrives in the next wave.</p>
        ) : (
          <ul>
            {workspaces.map((w) => (
              <li key={w.id}>
                {w.name} <span className="muted">({w.role})</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
