import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { getUser } from '../auth'
import Alert from './Alert'
import Button from './Button'
import Input from './Input'
import { TimeEntryDto, TimeEntryList } from '../pages/projectTypes'

interface Props {
  taskId: number
  canModerate: boolean
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatElapsed(startedAt: string, now: number): string {
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function todayLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function TimeSection({ taskId, canModerate }: Props) {
  const me = getUser()
  const [entries, setEntries] = useState<TimeEntryDto[] | null>(null)
  const [running, setRunning] = useState<TimeEntryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const [date, setDate] = useState(todayLocal())
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editMinutes, setEditMinutes] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get<TimeEntryList>(`/tasks/${taskId}/time-entries`)
      setEntries(data.entries)
      setRunning(data.running ?? null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load time entries')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  async function addEntry(e: FormEvent) {
    e.preventDefault()
    const mins = Number(minutes)
    if (!date || !Number.isInteger(mins) || mins < 1) return
    setSaving(true)
    setActionError('')
    try {
      const created = await api.post<TimeEntryDto>(`/tasks/${taskId}/time-entries`, {
        entryDate: date,
        minutes: mins,
        description: description.trim() || undefined,
      })
      setEntries((prev) => [created, ...(prev ?? [])])
      setMinutes('')
      setDescription('')
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to log time')
    } finally {
      setSaving(false)
    }
  }

  async function startTimer() {
    setActionError('')
    try {
      const created = await api.post<TimeEntryDto>(
        `/tasks/${taskId}/time-entries/timer/start`,
      )
      setRunning(created)
      setEntries((prev) => [created, ...(prev ?? [])])
      setNow(Date.now())
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to start timer')
      await load()
    }
  }

  async function stopTimer() {
    setActionError('')
    try {
      const stopped = await api.post<TimeEntryDto>('/time-entries/timer/stop')
      setRunning(null)
      setEntries((prev) =>
        (prev ?? []).map((en) => (en.id === stopped.id ? stopped : en)),
      )
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to stop timer')
    }
  }

  function beginEdit(entry: TimeEntryDto) {
    setEditingId(entry.id)
    setEditDate(entry.entryDate)
    setEditMinutes(entry.minutes != null ? String(entry.minutes) : '')
    setEditDescription(entry.description ?? '')
  }

  async function saveEdit(entryId: number) {
    const mins = Number(editMinutes)
    if (!Number.isInteger(mins) || mins < 1) return
    setActionError('')
    try {
      const updated = await api.patch<TimeEntryDto>(`/time-entries/${entryId}`, {
        entryDate: editDate,
        minutes: mins,
        description: editDescription.trim() || null,
      })
      setEntries((prev) => (prev ?? []).map((en) => (en.id === entryId ? updated : en)))
      setEditingId(null)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to save entry')
    }
  }

  async function removeEntry(entryId: number) {
    setActionError('')
    try {
      await api.delete(`/time-entries/${entryId}`)
      setEntries((prev) => (prev ?? []).filter((en) => en.id !== entryId))
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete entry')
    }
  }

  const runningHere = running?.taskId === taskId

  return (
    <section aria-label="Time tracking">
      {running && !runningHere && (
        <p className="muted" role="status">
          Timer running on {running.taskTitle ?? 'another task'} —{' '}
          <Button variant="link" size="sm" onClick={stopTimer}>
            Stop timer
          </Button>
        </p>
      )}
      {runningHere && (
        <p role="status">
          Timer running — {formatElapsed(running.startedAt!, now)}{' '}
          <Button variant="secondary" size="sm" onClick={stopTimer}>
            Stop timer
          </Button>
        </p>
      )}
      {!running && (
        <p>
          <Button variant="secondary" size="sm" onClick={startTimer}>
            Start timer
          </Button>
        </p>
      )}

      {actionError && <Alert>{actionError}</Alert>}

      <form className="time-form" onSubmit={addEntry} aria-label="Log time">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Minutes"
          type="number"
          min={1}
          max={1440}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          required
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
        />
        <Button type="submit" disabled={saving || !minutes}>
          {saving ? 'Saving…' : 'Log time'}
        </Button>
      </form>

      {loading ? (
        <p className="muted" role="status">
          Loading time entries…
        </p>
      ) : error ? (
        <Alert>
          {error}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      ) : (entries ?? []).length === 0 ? (
        <p className="muted">No time logged yet.</p>
      ) : (
        <ul className="time-list">
          {(entries ?? []).map((entry) => {
            const isOwn = entry.userId === me?.id
            const canEdit = isOwn && !entry.running
            const canDelete = !entry.running && (isOwn || canModerate)
            return (
              <li key={entry.id} className="time-entry">
                {editingId === entry.id ? (
                  <form
                    className="time-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveEdit(entry.id)
                    }}
                  >
                    <Input
                      id="edit-entry-date"
                      label="Edit date"
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                    <Input
                      id="edit-entry-minutes"
                      label="Edit minutes"
                      type="number"
                      min={1}
                      max={1440}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      required
                    />
                    <Input
                      id="edit-entry-description"
                      label="Edit description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                    <Button type="submit">Save</Button>
                    <Button variant="link" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="time-entry-main">
                      <strong>{entry.entryDate}</strong>{' '}
                      <span>{entry.running ? 'Running' : formatMinutes(entry.minutes)}</span>{' '}
                      {entry.description && <span className="muted">— {entry.description}</span>}
                      <span className="muted"> · {entry.userName}</span>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="time-entry-actions">
                        {canEdit && (
                          <Button
                            variant="link"
                            size="sm"
                            aria-label={`Edit time entry by ${entry.userName}`}
                            onClick={() => beginEdit(entry)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="link"
                            size="sm"
                            aria-label={`Delete time entry by ${entry.userName}`}
                            onClick={() => removeEntry(entry.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
