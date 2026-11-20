import { Link } from 'react-router-dom'
import { useShell } from '../shell/ShellContext'
import Card from '../components/Card'

export default function DashboardPage() {
  const { user } = useShell()

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">
        Welcome back{user ? `, ${user.firstName}` : ''}. Your workspace
        overview lives here.
      </p>
      <div className="dashboard-quick">
        <Card title="Projects">
          <p className="muted">Browse and manage your projects and tasks.</p>
          <Link to="/projects">Open projects</Link>
        </Card>
        <Card title="Account">
          <p className="muted">Manage workspaces and your profile.</p>
          <Link to="/account">Account settings</Link>
        </Card>
      </div>
    </>
  )
}
