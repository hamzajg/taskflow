import { FormEvent, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Drawer from '../components/Drawer'
import Input from '../components/Input'

const EMPTY_FORM = { name: '', description: '', color: '' }

export default function ProjectCreateDrawer({
  open,
  workspaceId,
  onClose,
  onCreated,
}: {
  open: boolean
  workspaceId: number
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)

  // Drawer stays mounted through its close transition — reset on each open
  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(EMPTY_FORM)
      setError('')
    }
    wasOpen.current = open
  }, [open])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await api.post(`/workspaces/${workspaceId}/projects`, {
        name: form.name,
        description: form.description || undefined,
        color: form.color || undefined,
      })
      setForm(EMPTY_FORM)
      onClose()
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="New project">
      {error && <Alert>{error}</Alert>}
      <form className="task-form" onSubmit={submit}>
        <Input
          label="Name"
          id="create-project-name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <Input
          label="Description"
          id="create-project-description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <Input
          label="Color"
          id="create-project-color"
          placeholder="#rrggbb"
          value={form.color}
          onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
        />
        <div className="drawer-actions">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create project'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
