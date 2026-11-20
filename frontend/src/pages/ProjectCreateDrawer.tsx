import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Drawer from '../components/Drawer'
import Input from '../components/Input'
import TagBadges from '../components/TagBadges'
import { ProjectDto, TagDto } from './projectTypes'

const EMPTY_FORM = { name: '', description: '', color: '' }

export default function ProjectCreateDrawer({
  open,
  workspaceId,
  project = null,
  onClose,
  onCreated,
  onUpdated,
}: {
  open: boolean
  workspaceId: number
  project?: ProjectDto | null
  onClose: () => void
  onCreated: () => void
  onUpdated?: () => void
}) {
  const editing = project !== null
  const [form, setForm] = useState(EMPTY_FORM)
  const [tagIds, setTagIds] = useState<number[]>([])
  const [tags, setTags] = useState<TagDto[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)

  const loadTags = useCallback(async () => {
    try {
      setTags(await api.get<TagDto[]>(`/workspaces/${workspaceId}/tags`))
    } catch {
      setTags([])
    }
  }, [workspaceId])

  // Drawer stays mounted through its close transition — reset on each open
  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(
        project
          ? {
              name: project.name,
              description: project.description ?? '',
              color: project.color ?? '',
            }
          : EMPTY_FORM,
      )
      setTagIds((project?.tags ?? []).map((t) => t.id))
      setError('')
      loadTags()
    }
    wasOpen.current = open
  }, [open, project, loadTags])

  function toggleTag(id: number) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    const body = {
      name: form.name,
      description: form.description || undefined,
      color: form.color || undefined,
      tagIds,
    }
    try {
      if (editing) {
        await api.put(`/workspaces/${workspaceId}/projects/${project.id}`, body)
        setForm(EMPTY_FORM)
        onClose()
        onUpdated?.()
      } else {
        await api.post(`/workspaces/${workspaceId}/projects`, body)
        setForm(EMPTY_FORM)
        setTagIds([])
        onClose()
        onCreated()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={editing ? 'Edit project' : 'New project'}>
      {error && <Alert>{error}</Alert>}
      <form className="task-form" onSubmit={submit}>
        <Input
          label="Name"
          id={editing ? 'edit-project-name' : 'create-project-name'}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <Input
          label="Description"
          id={editing ? 'edit-project-description' : 'create-project-description'}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <Input
          label="Color"
          id={editing ? 'edit-project-color' : 'create-project-color'}
          placeholder="#rrggbb"
          value={form.color}
          onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
        />
        {tags.length > 0 && (
          <fieldset className="tag-fieldset">
            <legend className="field-label">Tags</legend>
            <div className="tag-checkboxes">
              {tags.map((t) => (
                <label key={t.id} className="tag-check">
                  <input
                    type="checkbox"
                    checked={tagIds.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                    aria-label={t.title}
                  />
                  <TagBadges tags={[t]} />
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="drawer-actions">
          <Button type="submit" disabled={pending}>
            {pending
              ? editing
                ? 'Saving…'
                : 'Creating…'
              : editing
                ? 'Save project'
                : 'Create project'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
