import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useShell } from '../shell/ShellContext'
import { ProjectDto } from './projectTypes'

export default function ProjectsPage() {
  const { workspaces, activeWorkspaceId } = useShell()
  const workspaceId =
    activeWorkspaceId ?? (workspaces.length === 1 ? workspaces[0].id : null)

  const [projects, setProjects] = useState<ProjectDto[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [formError, setFormError] = useState('')

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

  async function create(e: FormEvent) {
    e.preventDefault()
    if (workspaceId === null) return
    setFormError('')
    try {
      await api.post(`/workspaces/${workspaceId}/projects`, {
        name,
        description: description || undefined,
        color: color || undefined,
      })
      setName('')
      setDescription('')
      setColor('')
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Create failed')
    }
  }

  return (
    <>
      <h1>Projects</h1>
      {workspaceId === null ? (
        <Card>
          <p className="muted">
            Select a workspace in the sidebar to see its projects.
          </p>
        </Card>
      ) : (
        <Card
          title="Projects"
          actions={
            <span className="muted">
              {workspaces.find((w) => w.id === workspaceId)?.name}
            </span>
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
          {formError && <Alert>{formError}</Alert>}

          <form className="inline-form" onSubmit={create}>
            <Input
              label="Name"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Description"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              label="Color"
              placeholder="#rrggbb"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <Button type="submit">Create project</Button>
          </form>

          {loading && (
            <p className="muted" role="status">
              Loading…
            </p>
          )}
          {!loading && projects && projects.length === 0 && (
            <p className="muted">No projects yet — create the first one above.</p>
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
    </>
  )
}
