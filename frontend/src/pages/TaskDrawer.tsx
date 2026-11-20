import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import CommentThread from '../components/CommentThread'
import Drawer from '../components/Drawer'
import DueDate from '../components/DueDate'
import TimeSection from '../components/TimeSection'
import { formatMinutes, priorityTone, ProjectDto, statusLabel, TaskDto } from './projectTypes'
import { useShell } from '../shell/ShellContext'

export default function TaskDrawer({
  taskId,
  open,
  onClose,
  onChanged,
}: {
  taskId: number | null
  open: boolean
  onClose: () => void
  onChanged?: () => void
}) {
  const { workspaces } = useShell()
  // keep the last loaded task while the close transition plays
  const [activeId, setActiveId] = useState<number | null>(taskId)
  const [task, setTask] = useState<TaskDto | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (taskId !== null) setActiveId(taskId)
  }, [taskId])

  const load = useCallback(async (id: number) => {
    setLoading(true)
    setError('')
    try {
      const t = await api.get<TaskDto>(`/tasks/${id}`)
      setTask(t)
      setProject(await api.get<ProjectDto>(`/projects/${t.projectId}`))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeId !== null) load(activeId)
  }, [activeId, load])

  return (
    <Drawer open={open} onClose={onClose} title={task?.title ?? 'Task'}>
      {loading && activeId !== null ? (
        <p className="muted" role="status">
          Loading…
        </p>
      ) : error ? (
        <Alert>
          {error}{' '}
          {activeId !== null && (
            <Button variant="link" size="sm" onClick={() => load(activeId)}>
              Retry
            </Button>
          )}
        </Alert>
      ) : task ? (
        <>
          {project && <p className="muted">{project.name}</p>}
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
              <dd>{task.dueDate ? <DueDate task={task} /> : '—'}</dd>
            </div>
          </dl>
          <p>
            <Link to={`/tasks/${task.id}`} className="btn btn-secondary btn-sm">
              Open full page
            </Link>
          </p>
          <Card
            title="Time"
            actions={
              <span className="muted">
                Total: {formatMinutes(task.totalMinutes ?? 0)}
              </span>
            }
          >
            <TimeSection
              taskId={task.id}
              canModerate={
                ['owner', 'admin'].includes(
                  workspaces.find((w) => w.id === project?.workspaceId)?.role ?? '',
                )
              }
              onChanged={onChanged}
            />
          </Card>
          <Card title="Comments">
            <CommentThread taskId={task.id} />
          </Card>
        </>
      ) : null}
    </Drawer>
  )
}
