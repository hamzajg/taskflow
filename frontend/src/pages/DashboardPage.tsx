import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlarmClock,
  FolderKanban,
  ListTodo,
  Users,
} from 'lucide-react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import { useShell } from '../shell/ShellContext'
import { ProjectDto, statusLabel } from './projectTypes'
import { WorkspaceSummaryDto } from './workspaceTypes'

export default function DashboardPage() {
  const { user, workspaces, activeWorkspaceId } = useShell()
  const workspaceId =
    activeWorkspaceId ?? (workspaces.length === 1 ? workspaces[0].id : null)

  const [summary, setSummary] = useState<WorkspaceSummaryDto | null>(null)
  const [projects, setProjects] = useState<ProjectDto[] | null>(null)
  const [summaryError, setSummaryError] = useState('')
  const [projectsError, setProjectsError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (workspaceId === null) {
      setSummary(null)
      setProjects(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setSummary(null)
    setProjects(null)
    setSummaryError('')
    setProjectsError('')

    // independent fetches: each widget degrades on its own (D3)
    api
      .get<WorkspaceSummaryDto>(`/workspaces/${workspaceId}/summary`)
      .then(setSummary)
      .catch((e) =>
        setSummaryError(e instanceof ApiError ? e.message : 'Failed to load summary'),
      )
    api
      .get<ProjectDto[]>(`/workspaces/${workspaceId}/projects`)
      .then(setProjects)
      .catch((e) =>
        setProjectsError(e instanceof ApiError ? e.message : 'Failed to load projects'),
      )
      .finally(() => setLoading(false))
  }, [workspaceId])

  useEffect(() => {
    load()
  }, [load])

  if (loading && workspaceId !== null) {
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    )
  }

  if (workspaceId === null) {
    return (
      <>
        <h1>Dashboard</h1>
        <Card title="No workspace yet">
          <p className="muted">
            {workspaces.length === 0
              ? 'Create a workspace from the Account page to get started.'
              : 'Select a workspace in the sidebar to see its dashboard.'}
          </p>
          {workspaces.length === 0 && (
            <Link to="/account">Go to account</Link>
          )}
        </Card>
      </>
    )
  }

  const statusEntries = summary
    ? Object.entries(summary.tasksByStatus)
    : []

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">
        Welcome back{user ? `, ${user.firstName}` : ''} — here's{' '}
        {workspaces.find((w) => w.id === workspaceId)?.name ?? 'your workspace'}.
      </p>

      {summaryError ? (
        <Alert>
          {summaryError}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      ) : (
        <div className="stat-grid" aria-label="Workspace stats">
          <StatCard
            icon={<FolderKanban size={20} />}
            label="Projects"
            value={summary?.projectCount ?? '—'}
          />
          <StatCard
            icon={<Users size={20} />}
            label="Members"
            value={summary?.memberCount ?? '—'}
          />
          <StatCard
            icon={<ListTodo size={20} />}
            label="My open tasks"
            value={summary?.myOpenTaskCount ?? '—'}
          />
          <StatCard
            icon={<AlarmClock size={20} />}
            label="Overdue"
            value={summary?.overdueCount ?? '—'}
          />
          <StatCard
            icon={<AlarmClock size={20} />}
            label="Due soon"
            value={summary?.dueSoonCount ?? '—'}
          />
          {statusEntries.map(([status, count]) => (
            <StatCard
              key={status}
              label={`${statusLabel(status)} tasks`}
              value={count}
            />
          ))}
        </div>
      )}

      <Card title="Projects">
        {projectsError ? (
          <Alert>
            {projectsError}{' '}
            <Button variant="link" size="sm" onClick={load}>
              Retry
            </Button>
          </Alert>
        ) : projects === null ? (
          <p className="muted" role="status">
            Loading…
          </p>
        ) : projects.length === 0 ? (
          <p className="muted">No projects yet — create one to get started.</p>
        ) : (
          <ul className="task-list">
            {projects.map((p) => (
              <li key={p.id} className="task-item">
                <div className="task-main">
                  <strong>
                    <Link to={`/projects/${p.id}`}>{p.name}</Link>
                  </strong>
                  <div className="task-meta">
                    <span className="muted">{p.taskCount} tasks</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
