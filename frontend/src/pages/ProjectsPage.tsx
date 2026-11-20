import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import ProjectCreateDrawer from './ProjectCreateDrawer'
import TagManageDrawer from './TagManageDrawer'
import TagBadges from '../components/TagBadges'
import { useShell } from '../shell/ShellContext'
import { ProjectDto, safeCssColor, TagDto } from './projectTypes'

export default function ProjectsPage() {
  const { workspaces, activeWorkspaceId } = useShell()
  const workspaceId =
    activeWorkspaceId ?? (workspaces.length === 1 ? workspaces[0].id : null)

  const [projects, setProjects] = useState<ProjectDto[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [tags, setTags] = useState<TagDto[]>([])
  const [activeTag, setActiveTag] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (workspaceId === null) return
    setLoading(true)
    setError('')
    try {
      const [p, t] = await Promise.all([
        api.get<ProjectDto[]>(`/workspaces/${workspaceId}/projects`),
        api.get<TagDto[]>(`/workspaces/${workspaceId}/tags`).catch(() => [] as TagDto[]),
      ])
      setProjects(p)
      setTags(t)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    setProjects(null)
    setActiveTag(null)
    load()
  }, [load])

  const canManage = ['owner', 'admin'].includes(
    workspaces.find((w) => w.id === workspaceId)?.role ?? '',
  )
  const visibleProjects =
    projects && activeTag !== null
      ? projects.filter((p) => (p.tags ?? []).some((t) => t.id === activeTag))
      : projects

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
              <Button size="sm" variant="secondary" onClick={() => setTagsOpen(true)}>
                Tags
              </Button>
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
          {!loading && projects && projects.length > 0 && tags.length > 0 && (
            <div className="tag-chips" role="group" aria-label="Filter by tag">
              <button
                type="button"
                className="tag-chip"
                aria-pressed={activeTag === null}
                onClick={() => setActiveTag(null)}
              >
                All
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="tag-chip"
                  aria-pressed={activeTag === t.id}
                  onClick={() =>
                    setActiveTag(activeTag === t.id ? null : t.id)
                  }
                >
                  <span
                    className="tag-dot"
                    style={{ background: safeCssColor(t.color) ?? 'var(--muted)' }}
                    aria-hidden="true"
                  />
                  {t.title}
                </button>
              ))}
            </div>
          )}
          {!loading && visibleProjects && visibleProjects.length === 0 && projects && projects.length > 0 && (
            <p className="muted">No projects match this tag.</p>
          )}
          {!loading && projects && projects.length === 0 && (
            <p className="muted">No projects yet — use “New project” to create the first one.</p>
          )}
          {!loading && visibleProjects && visibleProjects.length > 0 && (
            <>
            <ul className="ws-list project-list">
              {visibleProjects.map((p) => (
                <li key={p.id}>
                  {p.color && (
                    <span
                      className="project-swatch"
                      style={{ background: safeCssColor(p.color) }}
                      aria-hidden="true"
                    />
                  )}
                  <Link className="project-link" to={`/projects/${p.id}`}>
                    {p.name}
                  </Link>
                  {p.description && <span className="muted">{p.description}</span>}
                  <TagBadges tags={p.tags} />
                  <Badge tone="neutral">
                    {p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                  </Badge>
                </li>
              ))}
            </ul>
            </>
          )}
        </Card>
      )}
      {workspaceId !== null && (
        <>
          <ProjectCreateDrawer
            open={createOpen}
            workspaceId={workspaceId}
            onClose={() => setCreateOpen(false)}
            onCreated={load}
          />
          <TagManageDrawer
            open={tagsOpen}
            workspaceId={workspaceId}
            canManage={canManage}
            onClose={() => setTagsOpen(false)}
            onChanged={load}
          />
        </>
      )}
    </>
  )
}
