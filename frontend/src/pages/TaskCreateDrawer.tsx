import { FormEvent, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Drawer from '../components/Drawer'
import TaskFormFields, {
  EMPTY_TASK_FORM,
  TaskFormValue,
} from '../components/TaskFormFields'
import { MemberDto } from './projectTypes'

function payload(f: TaskFormValue) {
  return {
    title: f.title,
    description: f.description,
    status: f.status,
    priority: f.priority,
    assigneeId: f.assigneeId === '' ? undefined : Number(f.assigneeId),
    dueDate: f.dueDate === '' ? undefined : f.dueDate,
  }
}

export default function TaskCreateDrawer({
  open,
  projectId,
  members,
  onClose,
  onCreated,
}: {
  open: boolean
  projectId: number
  members: MemberDto[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<TaskFormValue>(EMPTY_TASK_FORM)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)

  // Drawer stays mounted through its close transition — reset on each open
  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(EMPTY_TASK_FORM)
      setError('')
    }
    wasOpen.current = open
  }, [open])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await api.post(`/projects/${projectId}/tasks`, payload(form))
      setForm(EMPTY_TASK_FORM)
      onClose()
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="New task">
      {error && <Alert>{error}</Alert>}
      <form className="task-form" onSubmit={submit}>
        <TaskFormFields
          value={form}
          onField={(f, v) => setForm((prev) => ({ ...prev, [f]: v }))}
          members={members}
          idPrefix="create-"
        />
        <div className="drawer-actions">
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create task'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
