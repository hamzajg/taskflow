import { FormEvent, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import Badge from './Badge'
import Button from './Button'
import TaskFormFields, { TaskFormValue } from './TaskFormFields'
import { MemberDto, priorityTone, TaskDto } from '../pages/projectTypes'

export default function TaskItem({
  task,
  editing,
  editForm,
  onEditField,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onOpenTask,
  members,
}: {
  task: TaskDto
  editing: boolean
  editForm: TaskFormValue
  onEditField: (field: keyof TaskFormValue, v: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (e: FormEvent) => void
  onDelete: () => void
  onOpenTask: (e: MouseEvent, taskId: number) => void
  members: MemberDto[]
}) {
  return (
    <li className="task-item">
      {editing ? (
        <form className="task-form" onSubmit={onSaveEdit}>
          <TaskFormFields
            value={editForm}
            onField={onEditField}
            members={members}
            idPrefix="edit-"
          />
          <div className="task-actions">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="task-main">
            <strong>
              <Link to={`/tasks/${task.id}`} onClick={(e) => onOpenTask(e, task.id)}>
                {task.title}
              </Link>
            </strong>
            {task.description && (
              <p className="muted task-desc">{task.description}</p>
            )}
            <div className="task-meta">
              <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
              <span className="muted">{task.assigneeName ?? 'Unassigned'}</span>
              {task.dueDate && <span className="muted">Due {task.dueDate}</span>}
            </div>
          </div>
          <div className="task-actions">
            <Button variant="link" size="sm" onClick={onStartEdit}>
              Edit
            </Button>
            <Button variant="link" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </>
      )}
    </li>
  )
}
