import { FormEvent, MouseEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import {
  EMPTY_TASK_FORM,
  TaskFormValue,
} from '../components/TaskFormFields'
import TaskItem from '../components/TaskItem'
import ViewToggle from '../components/ViewToggle'
import BoardView from './BoardView'
import TaskCreateDrawer from './TaskCreateDrawer'
import TaskDrawer from './TaskDrawer'
import {
  MemberDto,
  ProjectDto,
  statusLabel,
  TASK_STATUSES,
  TaskDto,
} from './projectTypes'

function formFromTask(t: TaskDto): TaskFormValue {
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
  const [searchParams, setSearchParams] = useSearchParams()
  const taskParam = searchParams.get('task')
  const drawerTaskId =
    taskParam !== null && /^\d+$/.test(taskParam) ? Number(taskParam) : null

  const [project, setProject] = useState<ProjectDto | null>(null)
  const [tasks, setTasks] = useState<TaskDto[] | null>(null)
  const [members, setMembers] = useState<MemberDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [actionError, setActionError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<TaskFormValue>(EMPTY_TASK_FORM)
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState<'list' | 'board'>(() =>
    localStorage.getItem(`taskflow.view.${projectId}`) === 'board'
      ? 'board'
      : 'list',
  )

  function switchView(next: 'list' | 'board') {
    setView(next)
    localStorage.setItem(`taskflow.view.${projectId}`, next)
  }

  // plain clicks open the drawer; modified/middle clicks keep native navigation
  function openTaskDrawer(e: MouseEvent, taskId: number) {
    if (
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return
    }
    e.preventDefault()
    setSearchParams({ task: String(taskId) })
  }

  function closeTaskDrawer() {
    setSearchParams({}, { replace: true })
  }

  // at most one drawer open: creating clears any open peek (?task=)
  function openCreateDrawer() {
    if (drawerTaskId !== null) closeTaskDrawer()
    setCreateOpen(true)
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

      <Card
        title="Tasks"
        actions={
          <>
            <ViewToggle view={view} onChange={switchView} />
            <Button size="sm" onClick={openCreateDrawer}>
              Add task
            </Button>
          </>
        }
      >
        {actionError && <Alert>{actionError}</Alert>}
        {tasks === null ? (
          <p className="muted" role="status">
            Loading…
          </p>
        ) : tasks.length === 0 ? (
          <p className="muted">No tasks yet — use “Add task” to create the first one.</p>
        ) : view === 'board' ? (
          <BoardView
            tasks={tasks}
            onMove={moveTask}
            onTaskClick={openTaskDrawer}
          />
        ) : (
          grouped.map((g) => (
            <section key={g.status} className="task-group">
              <h3 className="task-group-title">
                {statusLabel(g.status)}{' '}
                <span className="muted">({g.items.length})</span>
              </h3>
              <ul className="task-list">
                {g.items.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    editing={editingId === t.id}
                    editForm={editForm}
                    onEditField={(f, v) =>
                      setEditForm((prev) => ({ ...prev, [f]: v }))
                    }
                    onStartEdit={() => {
                      setEditingId(t.id)
                      setEditForm(formFromTask(t))
                    }}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={saveEdit}
                    onDelete={() => removeTask(t.id)}
                    onOpenTask={openTaskDrawer}
                    members={members}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </Card>

      <TaskDrawer
        taskId={drawerTaskId}
        open={drawerTaskId !== null}
        onClose={closeTaskDrawer}
      />
      <TaskCreateDrawer
        open={createOpen}
        projectId={projectId}
        members={members}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
    </>
  )
}
