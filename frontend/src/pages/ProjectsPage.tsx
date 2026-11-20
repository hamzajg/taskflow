import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import ProjectCreateDrawer from './ProjectCreateDrawer'
import { useShell } from '../shell/ShellContext'
import { ProjectDto } from './projectTypes'

export default function ProjectsPage() {
  const { workspaces, activeWorkspaceId } = useShell()
  const workspaceId =
    activeWorkspaceId ?? (workspaces.length === 1 ? workspaces[0].id : null)

  const [projects, setProjects] = useState<ProjectDto[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    if (workspaceId === null) return
    setLoading(true)
    setError('')
    try {
      setProjects(await api.get<ProjectDto[]>(`/workspaces/${workspaceId}/projects`))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    setProjects(null)
    load()
  }, [load])

  return (
    <>
      <PageHeader title="Projects" />
      {workspaceId === null ? (
        <Card>
          <p className="muted">
            Select a workspace in the sidebar to see its projects.
          </p>
        </Card>
      ) : (
        <Card
          title="All projects"
          actions={
            <>
              <span className="muted">
                {workspaces.find((w) => w.id === workspaceId)?.name}
              </span>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                New project
              </Button>
            </>
          }
        >
          {error && (
            <Alert>
              {error}{' '}
              <Button variant="link" size="sm" onClick={load}>
                Retry
              </Button>
            </Alert>
          )}

          {loading && (
            <p className="muted" role="status">
              Loading…
            </p>
          )}
          {!loading && projects && projects.length === 0 && (
            <p className="muted">No projects yet — use “New project” to create the first one.</p>
          )}
          {!loading && projects && projects.length > 0 && (
            <ul className="ws-list project-list">
              {projects.map((p) => (
                <li key={p.id}>
                  {p.color && (
                    <span
                      className="project-swatch"
                      style={{ background: p.color }}
                      aria-hidden="true"
                    />
                  )}
                  <Link className="project-link" to={`/projects/${p.id}`}>
                    {p.name}
                  </Link>
                  {p.description && <span className="muted">{p.description}</span>}
                  <Badge tone="neutral">
                    {p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {workspaceId !== null && (
        <ProjectCreateDrawer
          open={createOpen}
          workspaceId={workspaceId}
          onClose={() => setCreateOpen(false)}
          onCreated={load}
        />
      )}
    </>
  )
}
