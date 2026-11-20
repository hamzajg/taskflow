import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Drawer from '../components/Drawer'
import Input from '../components/Input'
import TagBadges from '../components/TagBadges'
import { TagDto } from './projectTypes'

export default function TagManageDrawer({
  open,
  workspaceId,
  canManage,
  onClose,
  onChanged,
}: {
  open: boolean
  workspaceId: number
  canManage: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [tags, setTags] = useState<TagDto[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newColor, setNewColor] = useState('')
  const [editDrafts, setEditDrafts] = useState<Record<number, { title: string; color: string }>>({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const wasOpen = useRef(false)

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const list = await api.get<TagDto[]>(`/workspaces/${workspaceId}/tags`)
      setTags(list)
      setEditDrafts(
        Object.fromEntries(
          list.map((t) => [t.id, { title: t.title, color: t.color ?? '' }]),
        ),
      )
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load tags')
    }
  }, [workspaceId])

  useEffect(() => {
    if (open && !wasOpen.current) {
      setNewTitle('')
      setNewColor('')
      setError('')
      setConfirmDeleteId(null)
      load()
    }
    wasOpen.current = open
  }, [open, load])

  async function run(fn: () => Promise<unknown>) {
    setError('')
    setPending(true)
    try {
      await fn()
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed')
    } finally {
      setPending(false)
    }
  }

  function createTag(e: FormEvent) {
    e.preventDefault()
    run(async () => {
      await api.post(`/workspaces/${workspaceId}/tags`, {
        title: newTitle,
        color: newColor || undefined,
      })
      setNewTitle('')
      setNewColor('')
    })
  }

  function saveTag(t: TagDto) {
    const d = editDrafts[t.id]
    if (!d) return
    run(() =>
      api.put(`/workspaces/${workspaceId}/tags/${t.id}`, {
        title: d.title,
        color: d.color || null,
      }),
    )
  }

  function removeTag(t: TagDto) {
    if (confirmDeleteId !== t.id) {
      setConfirmDeleteId(t.id)
      return
    }
    setConfirmDeleteId(null)
    run(() => api.delete(`/workspaces/${workspaceId}/tags/${t.id}`))
  }

  return (
    <Drawer open={open} onClose={onClose} title="Tags">
      {loadError && (
        <Alert>
          {loadError}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}

      {canManage && (
        <form className="task-form" onSubmit={createTag}>
          <div className="task-form-grid">
            <Input
              label="Tag title"
              id="new-tag-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              maxLength={50}
            />
            <Input
              label="Color"
              id="new-tag-color"
              placeholder="#rrggbb"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              maxLength={20}
            />
          </div>
          <div className="drawer-actions">
            <Button type="submit" size="sm" disabled={pending || !newTitle.trim()}>
              Add tag
            </Button>
          </div>
        </form>
      )}

      {tags === null ? (
        !loadError && (
          <p className="muted" role="status">
            Loading…
          </p>
        )
      ) : tags.length === 0 ? (
        <p className="muted">No tags yet{canManage ? ' — create one above' : ''}.</p>
      ) : (
        <ul className="ws-list">
          {tags.map((t) => {
            const d = editDrafts[t.id] ?? { title: t.title, color: t.color ?? '' }
            const dirty = d.title !== t.title || d.color !== (t.color ?? '')
            return (
              <li key={t.id} className="tag-manage-row">
                {canManage ? (
                  <>
                    <input
                      className="field-input tag-title-input"
                      aria-label={`Rename ${t.title}`}
                      value={d.title}
                      maxLength={50}
                      onChange={(e) =>
                        setEditDrafts((p) => ({
                          ...p,
                          [t.id]: { ...d, title: e.target.value },
                        }))
                      }
                    />
                    <input
                      className="field-input tag-color-input"
                      aria-label={`Color for ${t.title}`}
                      placeholder="#rrggbb"
                      value={d.color}
                      maxLength={20}
                      onChange={(e) =>
                        setEditDrafts((p) => ({
                          ...p,
                          [t.id]: { ...d, color: e.target.value },
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending || !dirty || !d.title.trim()}
                      onClick={() => saveTag(t)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="link"
                      disabled={pending}
                      aria-label={
                        confirmDeleteId === t.id ? `Confirm delete ${t.title}` : `Delete ${t.title}`
                      }
                      onClick={() => removeTag(t)}
                    >
                      {confirmDeleteId === t.id ? 'Sure?' : 'Delete'}
                    </Button>
                  </>
                ) : (
                  <span className="tag-title">
                    <TagBadges tags={[t]} />
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}
