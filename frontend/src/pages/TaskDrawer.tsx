import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import CommentThread from '../components/CommentThread'
import Drawer from '../components/Drawer'
import { priorityTone, ProjectDto, statusLabel, TaskDto } from './projectTypes'

export default function TaskDrawer({
  taskId,
  open,
  onClose,
}: {
  taskId: number | null
  open: boolean
  onClose: () => void
}) {
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
              <dd>{task.dueDate ?? '—'}</dd>
            </div>
          </dl>
          <p>
            <Link to={`/tasks/${task.id}`} className="btn btn-secondary btn-sm">
              Open full page
            </Link>
          </p>
          <Card title="Comments">
            <CommentThread taskId={task.id} />
          </Card>
        </>
      ) : null}
    </Drawer>
  )
}
