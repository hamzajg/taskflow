import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { getUser } from '../auth'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  CommentDto,
  priorityTone,
  ProjectDto,
  statusLabel,
  TaskDto,
} from './projectTypes'

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const me = getUser()

  const [task, setTask] = useState<TaskDto | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [comments, setComments] = useState<CommentDto[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const t = await api.get<TaskDto>(`/tasks/${taskId}`)
      setTask(t)
      const [p, cl] = await Promise.all([
        api.get<ProjectDto>(`/projects/${t.projectId}`),
        api.get<{ comments: CommentDto[]; hasMore: boolean }>(
          `/tasks/${taskId}/comments`,
        ),
      ])
      setProject(p)
      setComments(cl.comments)
      setHasMore(cl.hasMore)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  async function postComment(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    setPosting(true)
    setActionError('')
    try {
      const created = await api.post<CommentDto>(`/tasks/${taskId}/comments`, {
        body: draft,
      })
      setComments((prev) => [...(prev ?? []), created])
      setDraft('')
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  async function saveEdit(commentId: number) {
    setActionError('')
    try {
      const updated = await api.patch<CommentDto>(`/comments/${commentId}`, {
        body: editBody,
      })
      setComments((prev) =>
        (prev ?? []).map((c) => (c.id === commentId ? updated : c)),
      )
      setEditingId(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to save comment')
    }
  }

  async function removeComment(commentId: number) {
    setActionError('')
    try {
      await api.delete(`/comments/${commentId}`)
      setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete comment')
    }
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
      <p>
        <Link to={`/projects/${task.projectId}`}>
          ← {project?.name ?? 'Back to project'}
        </Link>
      </p>

      <Card title={task.title}>
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
      </Card>

      <Card title="Comments">
        {actionError && <Alert>{actionError}</Alert>}
        {comments === null ? (
          <p className="muted" role="status">
            Loading…
          </p>
        ) : comments.length === 0 ? (
          <p className="muted">No comments yet — start the discussion below.</p>
        ) : (
          <ul className="comment-list" aria-live="polite">
            {comments.map((c) => (
              <li key={c.id} className="comment-item">
                {editingId === c.id ? (
                  <form
                    className="comment-edit-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveEdit(c.id)
                    }}
                  >
                    <label htmlFor={`edit-comment-${c.id}`}>Comment</label>
                    <textarea
                      id={`edit-comment-${c.id}`}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      required
                    />
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
                    <div className="comment-head">
                      <strong>{c.authorName}</strong>
                      <span className="muted">
                        {new Date(c.createdAt).toLocaleString()}
                        {c.updatedAt !== c.createdAt && ' (edited)'}
                      </span>
                    </div>
                    <p className="comment-body">{c.body}</p>
                    {me && c.authorId === me.id && (
                      <div className="task-actions">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setEditingId(c.id)
                            setEditBody(c.body)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => removeComment(c.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <p className="muted">Showing the most recent comments.</p>
        )}
        <form className="comment-form" onSubmit={postComment}>
          <label htmlFor="new-comment">Add a comment</label>
          <textarea
            id="new-comment"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            required
          />
          <div>
            <Button type="submit" disabled={posting || !draft.trim()}>
              {posting ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
