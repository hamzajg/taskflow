import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import CommentThread from '../components/CommentThread'
import PageHeader from '../components/PageHeader'
import TimeSection from '../components/TimeSection'
import { useShell } from '../shell/ShellContext'
import { priorityTone, ProjectDto, statusLabel, TaskDto } from './projectTypes'

function formatTotal(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const { workspaces } = useShell()

  const [task, setTask] = useState<TaskDto | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const t = await api.get<TaskDto>(`/tasks/${taskId}`)
      setTask(t)
      const p = await api.get<ProjectDto>(`/projects/${t.projectId}`)
      setProject(p)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  function canModerate(workspaceId: number | undefined): boolean {
    if (workspaceId == null) return false
    const ws = workspaces.find((w) => w.id === workspaceId)
    return ws?.role === 'owner' || ws?.role === 'admin'
  }

  if (loading) {
    return (
      <p className="muted" role="status">
        Loading…
      </p>
    )
  }
  if (error || !task) {
    return (
      <>
        <p>
          <Link to="/projects">← Projects</Link>
        </p>
        <Alert>
          {error || 'Task not found'}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      </>
    )
  }

  return (
    <div className="task-detail">
      <PageHeader
        title={task.title}
        actions={
          <Link to={`/projects/${task.projectId}`} className="muted">
            ← {project?.name ?? 'Back to project'}
          </Link>
        }
      />

      <Card>
        {task.description && <p>{task.description}</p>}
        <dl className="task-fields">
          <div>
            <dt>Status</dt>
            <dd>{statusLabel(task.status)}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>
              <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
            </dd>
          </div>
          <div>
            <dt>Assignee</dt>
            <dd>{task.assigneeName ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{task.dueDate ?? '—'}</dd>
          </div>
          <div>
            <dt>Time logged</dt>
            <dd>{formatTotal(task.totalMinutes)}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Time"
        actions={<span className="muted">Total: {formatTotal(task.totalMinutes ?? 0)}</span>}
      >
        <TimeSection taskId={taskId} canModerate={canModerate(project?.workspaceId)} />
      </Card>

      <Card title="Comments">
        <CommentThread taskId={taskId} />
      </Card>
    </div>
  )
}
