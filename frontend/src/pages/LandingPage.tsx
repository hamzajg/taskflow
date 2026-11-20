import { Link } from 'react-router-dom'
import { FolderKanban, KanbanSquare, MessageSquare, Moon, Sun } from 'lucide-react'
import Button from '../components/Button'
import { getTheme, Theme, toggleTheme } from '../theme'
import { useState } from 'react'

const FEATURES = [
  {
    icon: <FolderKanban size={22} />,
    title: 'Projects & tasks',
    text: 'Organize work into projects and move tasks across a kanban board or list view.',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Discuss in context',
    text: 'Every task carries its own comment thread — decisions stay with the work.',
  },
  {
    icon: <KanbanSquare size={22} />,
    title: 'Workspaces for teams',
    text: 'Share projects with your team using owner, admin and member roles.',
  },
]

export default function LandingPage() {
  const [theme, setTheme] = useState<Theme>(getTheme)

  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="landing-brand">
          <FolderKanban size={22} /> TaskFlow
        </span>
        <div className="landing-nav-actions">
          <Button
            variant="link"
            size="sm"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(toggleTheme())}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Link to="/login" className="btn btn-link btn-sm">
            Sign in
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Get started
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1>Ship work, not chaos</h1>
          <p className="landing-sub">
            TaskFlow keeps projects, tasks and the conversations around them in
            one place — for you and your whole team.
          </p>
          <div className="landing-ctas">
            <Link to="/register" className="btn btn-primary btn-lg">
              Get started free
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign in
            </Link>
          </div>
        </section>

        <section className="landing-features" aria-label="Features">
          {FEATURES.map((f) => (
            <article key={f.title} className="landing-feature">
              <span className="landing-feature-icon" aria-hidden="true">
                {f.icon}
              </span>
              <h2>{f.title}</h2>
              <p className="muted">{f.text}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="landing-footer">
        <span className="muted">TaskFlow — work, together.</span>
      </footer>
    </div>
  )
}
