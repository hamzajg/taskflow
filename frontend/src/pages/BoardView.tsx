import { DragEvent, FormEvent, MouseEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../components/Badge'
import Button from '../components/Button'
import DueDate from '../components/DueDate'
import Input from '../components/Input'
import Select from '../components/Select'
import {
  formatMinutes,
  priorityTone,
  statusLabel,
  TASK_STATUSES,
  TaskDto,
} from './projectTypes'

interface DropTarget {
  status: string
  index: number
}

export default function BoardView({
  tasks,
  onMove,
  onTaskClick,
}: {
  tasks: TaskDto[]
  onMove: (taskId: number, status: string, position: number) => void
  onTaskClick?: (e: MouseEvent, taskId: number) => void
}) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [drop, setDrop] = useState<DropTarget | null>(null)
  const [moveFor, setMoveFor] = useState<number | null>(null)
  const [moveStatus, setMoveStatus] = useState('todo')
  const [movePos, setMovePos] = useState('')

  const statusOptions = TASK_STATUSES.map((s) => ({
    value: s,
    label: statusLabel(s),
  }))

  function indexFromEvent(e: DragEvent, items: TaskDto[], status: string) {
    const el = (e.target as HTMLElement).closest('[data-task-index]')
    if (!el) {
      setDrop({ status, index: items.length })
      return
    }
    const i = Number(el.getAttribute('data-task-index'))
    const rect = el.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    setDrop({ status, index: before ? i : i + 1 })
  }

  function handleDrop(e: DragEvent, status: string) {
    e.preventDefault()
    if (dragId !== null && drop && drop.status === status) {
      onMove(dragId, status, drop.index)
    }
    setDragId(null)
    setDrop(null)
  }

  function submitMove(e: FormEvent, taskId: number) {
    e.preventDefault()
    onMove(taskId, moveStatus, movePos === '' ? -1 : Number(movePos))
    setMoveFor(null)
    setMovePos('')
  }

  return (
    <div className="board">
      {TASK_STATUSES.map((status) => {
        const items = tasks.filter((t) => t.status === status)
        return (
          <section
            key={status}
            className="board-col"
            onDragOver={(e) => {
              e.preventDefault()
              indexFromEvent(e, items, status)
            }}
            onDrop={(e) => handleDrop(e, status)}
          >
            <h3 className="board-col-title">
              {statusLabel(status)}{' '}
              <span className="muted">({items.length})</span>
            </h3>
            <ul className="board-cards">
              {items.map((t, i) => (
                <li
                  key={t.id}
                  className={`board-card${drop?.status === status && drop.index === i ? ' drop-before' : ''}`}
                  draggable
                  data-task-index={i}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(t.id))
                    e.dataTransfer.effectAllowed = 'move'
                    setDragId(t.id)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setDrop(null)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    indexFromEvent(e, items, status)
                  }}
                >
                  {moveFor === t.id ? (
                    <form
                      className="move-form"
                      onSubmit={(e) => submitMove(e, t.id)}
                    >
                      <Select
                        label="Move to status"
                        value={moveStatus}
                        onChange={(e) => setMoveStatus(e.target.value)}
                        options={statusOptions}
                      />
                      <Input
                        label="Position"
                        type="number"
                        min={0}
                        placeholder="end"
                        value={movePos}
                        onChange={(e) => setMovePos(e.target.value)}
                        hint="Leave empty to append"
                      />
                      <div className="task-actions">
                        <Button type="submit" size="sm">
                          Move
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setMoveFor(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="task-main">
                        <strong>
                          <Link
                            to={`/tasks/${t.id}`}
                            onClick={(e) => onTaskClick?.(e, t.id)}
                          >
                            {t.title}
                          </Link>
                        </strong>
                        {t.description && (
                          <p className="muted task-desc">{t.description}</p>
                        )}
                        <div className="task-meta">
                          <Badge tone={priorityTone(t.priority)}>
                            {t.priority}
                          </Badge>
                          <span className="muted">
                            {t.assigneeName ?? 'Unassigned'}
                          </span>
                          {t.dueDate && <DueDate task={t} />}
                          {(t.totalMinutes ?? 0) > 0 && (
                            <span className="muted">
                              {formatMinutes(t.totalMinutes)} logged
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        aria-label={`Move "${t.title}"`}
                        onClick={() => {
                          setMoveFor(t.id)
                          setMoveStatus(status)
                          setMovePos('')
                        }}
                      >
                        Move
                      </Button>
                    </>
                  )}
                </li>
              ))}
              {drop?.status === status && drop.index === items.length && (
                <li className="board-drop-end" aria-hidden="true" />
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
