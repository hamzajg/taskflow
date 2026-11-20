import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { getUser } from '../auth'
import Alert from './Alert'
import Button from './Button'
import { CommentDto, CommentList } from '../pages/projectTypes'

export default function CommentThread({ taskId }: { taskId: number }) {
  const me = getUser()
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
      const cl = await api.get<CommentList>(`/tasks/${taskId}/comments`)
      setComments(cl.comments)
      setHasMore(cl.hasMore)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load comments')
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

  return (
    <>
      {actionError && <Alert>{actionError}</Alert>}
      {error ? (
        <Alert>
          {error}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      ) : loading ? (
        <p className="muted" role="status">
          Loading…
        </p>
      ) : comments !== null && comments.length === 0 ? (
        <p className="muted">No comments yet — start the discussion below.</p>
      ) : (
        <ul className="comment-list" aria-live="polite">
          {(comments ?? []).map((c) => (
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
      {hasMore && <p className="muted">Showing the most recent comments.</p>}
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
    </>
  )
}
