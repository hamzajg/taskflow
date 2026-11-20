import { FormEvent, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Drawer from '../components/Drawer'
import Input from '../components/Input'

export default function WorkspaceCreateDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)

  // Drawer stays mounted through its close transition — reset on each open
  useEffect(() => {
    if (open && !wasOpen.current) {
      setName('')
      setError('')
    }
    wasOpen.current = open
  }, [open])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await api.post('/workspaces', { name })
      setName('')
      onClose()
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="New workspace">
      {error && <Alert>{error}</Alert>}
      <form className="task-form" onSubmit={submit}>
        <Input
          label="Workspace name"
          id="create-workspace-name"
          placeholder="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="drawer-actions">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create workspace'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
