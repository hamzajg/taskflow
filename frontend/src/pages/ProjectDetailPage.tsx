import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import PageHeader from '../components/PageHeader'
import Select from '../components/Select'
import BoardView from './BoardView'
import {
  MemberDto,
  priorityTone,
  ProjectDto,
  statusLabel,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskDto,
} from './projectTypes'

interface TaskForm {
  title: string
  description: string
  status: string
  priority: string
  assigneeId: string
  dueDate: string
}

const EMPTY_FORM: TaskForm = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigneeId: '',
  dueDate: '',
}

function formFromTask(t: TaskDto): TaskForm {
  return {
    title: t.title,
    description: t.description ?? '',
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId === null ? '' : String(t.assigneeId),
    dueDate: t.dueDate ?? '',
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)

  const [project, setProject] = useState<ProjectDto | null>(null)
  const [tasks, setTasks] = useState<TaskDto[] | null>(null)
  const [members, setMembers] = useState<MemberDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<TaskForm>(EMPTY_FORM)
  const [view, setView] = useState<'list' | 'board'>(() =>
    localStorage.getItem(`taskflow.view.${projectId}`) === 'board'
      ? 'board'
      : 'list',
  )

  function switchView(next: 'list' | 'board') {
    setView(next)
    localStorage.setItem(`taskflow.view.${projectId}`, next)
  }

  async function moveTask(taskId: number, status: string, position: number) {
    setActionError('')
    try {
      await api.patch(`/tasks/${taskId}/move`, { status, position })
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Move failed')
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const p = await api.get<ProjectDto>(`/projects/${projectId}`)
      setProject(p)
      const [t, m] = await Promise.all([
        api.get<TaskDto[]>(`/projects/${projectId}/tasks`),
        api.get<MemberDto[]>(`/workspaces/${p.workspaceId}/members`).catch(
          () => [] as MemberDto[],
        ),
      ])
      setTasks(t)
      setMembers(m)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const memberOptions = [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: String(m.userId), label: m.displayName })),
  ]
  const statusOptions = TASK_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))
  const priorityOptions = TASK_PRIORITIES.map((p) => ({
    value: p,
    label: p[0].toUpperCase() + p.slice(1),
  }))

  function payload(f: TaskForm) {
    return {
      title: f.title,
      description: f.description,
      status: f.status,
      priority: f.priority,
      assigneeId: f.assigneeId === '' ? undefined : Number(f.assigneeId),
      dueDate: f.dueDate === '' ? undefined : f.dueDate,
    }
  }

  async function createTask(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    try {
      await api.post(`/projects/${projectId}/tasks`, payload(form))
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Create failed')
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (editingId === null) return
    setActionError('')
    try {
      const body: Record<string, unknown> = {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        dueDate: editForm.dueDate === '' ? undefined : editForm.dueDate,
      }
      if (editForm.assigneeId === '') {
        body.unassign = true
      } else {
        body.assigneeId = Number(editForm.assigneeId)
      }
      await api.patch(`/tasks/${editingId}`, body)
      setEditingId(null)
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Update failed')
    }
  }

  async function removeTask(taskId: number) {
    setActionError('')
    try {
      await api.delete(`/tasks/${taskId}`)
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    )
  }
  if (error || !project) {
    return (
      <>
        <p>
          <Link to="/projects">← Projects</Link>
        </p>
        <Alert>
          {error || 'Project not found'}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      </>
    )
  }

  const grouped = TASK_STATUSES.map((status) => ({
    status,
    items: (tasks ?? []).filter((t) => t.status === status),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <Link to="/projects" className="muted">
            ← Projects
          </Link>
        }
      />

      <Card title="New task">
        {formError && <Alert>{formError}</Alert>}
        <form className="task-form" onSubmit={createTask}>
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="task-form-grid">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={statusOptions}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={priorityOptions}
            />
            <Select
              label="Assignee"
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              options={memberOptions}
            />
            <Input
              label="Due date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div>
            <Button type="submit">Add task</Button>
          </div>
        </form>
      </Card>

      <Card
        title="Tasks"
        actions={
          <div className="view-toggle" role="group" aria-label="Task view">
            <Button
              variant={view === 'list' ? 'secondary' : 'link'}
              size="sm"
              aria-pressed={view === 'list'}
              onClick={() => switchView('list')}
            >
              List
            </Button>
            <Button
              variant={view === 'board' ? 'secondary' : 'link'}
              size="sm"
              aria-pressed={view === 'board'}
              onClick={() => switchView('board')}
            >
              Board
            </Button>
          </div>
        }
      >
        {actionError && <Alert>{actionError}</Alert>}
        {tasks === null ? (
          <p className="muted" role="status">
            Loading…
          </p>
        ) : tasks.length === 0 ? (
          <p className="muted">No tasks yet — create the first one above.</p>
        ) : view === 'board' ? (
          <BoardView tasks={tasks} onMove={moveTask} />
        ) : (
          grouped.map((g) => (
            <section key={g.status} className="task-group">
              <h3 className="task-group-title">
                {statusLabel(g.status)}{' '}
                <span className="muted">({g.items.length})</span>
              </h3>
              <ul className="task-list">
                {g.items.map((t) => (
                  <li key={t.id} className="task-item">
                    {editingId === t.id ? (
                      <form className="task-form" onSubmit={saveEdit}>
                        <Input
                          label="Title" id="edit-title"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                          required
                        />
                        <Input
                          label="Description" id="edit-description"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                        />
                        <div className="task-form-grid">
                          <Select
                            label="Status" id="edit-status"
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm({ ...editForm, status: e.target.value })
                            }
                            options={statusOptions}
                          />
                          <Select
                            label="Priority" id="edit-priority"
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm({ ...editForm, priority: e.target.value })
                            }
                            options={priorityOptions}
                          />
                          <Select
                            label="Assignee" id="edit-assignee"
                            value={editForm.assigneeId}
                            onChange={(e) =>
                              setEditForm({ ...editForm, assigneeId: e.target.value })
                            }
                            options={memberOptions}
                          />
                          <Input
                            label="Due date" id="edit-due-date"
                            type="date"
                            value={editForm.dueDate}
                            onChange={(e) =>
                              setEditForm({ ...editForm, dueDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="task-actions">
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="task-main">
                          <strong>
                            <Link to={`/tasks/${t.id}`}>{t.title}</Link>
                          </strong>
                          {t.description && (
                            <p className="muted task-desc">{t.description}</p>
                          )}
                          <div className="task-meta">
                            <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
                            <span className="muted">
                              {t.assigneeName ?? 'Unassigned'}
                            </span>
                            {t.dueDate && <span className="muted">Due {t.dueDate}</span>}
                          </div>
                        </div>
                        <div className="task-actions">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => {
                              setEditingId(t.id)
                              setEditForm(formFromTask(t))
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => removeTask(t.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </Card>
    </>
  )
}
