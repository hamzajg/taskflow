import { ReactNode, useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FolderKanban, LayoutDashboard, ListTodo, LogOut, Menu, Moon, Sun, User as UserIcon, X } from 'lucide-react'
import { api } from '../api'
import { clearSession, getUser, saveUser, User } from '../auth'
import Button from './Button'
import { ShellProvider, ShellState } from '../shell/ShellContext'
import { getTheme, Theme, toggleTheme } from '../theme'
import { WorkspaceDto } from '../pages/workspaceTypes'

interface NavEntry {
  label: string
  icon: ReactNode
  to: string
}

const NAV: NavEntry[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { label: 'Projects', icon: <ListTodo size={18} />, to: '/projects' },
  { label: 'Workspaces', icon: <FolderKanban size={18} />, to: '/account' },
  { label: 'Profile', icon: <UserIcon size={18} />, to: '/profile' },
]

export default function AppShell() {
  const [user, setUser] = useState<User | null>(getUser())
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getTheme)
  const navigate = useNavigate()

  const refreshWorkspaces = useCallback(() => {
    api.get<WorkspaceDto[]>('/workspaces').then(setWorkspaces).catch(() => {})
  }, [])

  // A user with exactly one workspace (e.g. the auto-provisioned default)
  // always has it active — no selection step on first run.
  useEffect(() => {
    if (workspaces.length === 1 && activeWorkspaceId !== workspaces[0].id) {
      setActiveWorkspaceId(workspaces[0].id)
    }
  }, [workspaces, activeWorkspaceId])

  useEffect(() => {
    api.get<User>('/auth/me')
      .then((u) => {
        setUser(u)
        saveUser(u)
      })
      .catch(() => {})
    refreshWorkspaces()
  }, [refreshWorkspaces])

  function logout() {
    api.post('/auth/logout').catch(() => {})
    clearSession()
    navigate('/login')
  }

  const shell: ShellState = {
    user,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refreshWorkspaces,
    setUser,
    logout,
  }

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : ''

  return (
    <div className="app-shell">
      <aside className={`sidebar${navOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <FolderKanban size={20} />
          <span>TaskFlow</span>
          <Button
            variant="link"
            size="sm"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <X size={18} />
          </Button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to !== '/account'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {workspaces.length > 0 && (
          <div className="sidebar-workspaces">
            <label className="field-label" htmlFor="ws-switcher">
              Workspace
            </label>
            <select
              id="ws-switcher"
              className="field-input"
              value={activeWorkspaceId ?? ''}
              onChange={(e) =>
                setActiveWorkspaceId(e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <option value="">Select a workspace…</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {user && (
          <div className="sidebar-user">
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="sidebar-user-info">
              <strong>{`${user.firstName} ${user.lastName}`}</strong>
              <span className="muted">{user.email}</span>
            </div>
            <Button
              variant="link"
              size="sm"
              aria-label="Log out"
              onClick={logout}
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </aside>

      {navOpen && (
        <div className="sidebar-overlay" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      <div className="shell-main">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="topbar">
          <Button
            variant="link"
            size="sm"
            className="nav-toggle"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <span className="topbar-title">TaskFlow</span>
          <span className="spacer" />
          <Button
            variant="link"
            size="sm"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            onClick={() => setTheme(toggleTheme())}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {user && <span className="muted topbar-user">{`${user.firstName} ${user.lastName}`}</span>}
        </header>
        <main className="content" id="main">
          <ShellProvider value={shell}>
            <Outlet />
          </ShellProvider>
        </main>
      </div>
    </div>
  )
}
