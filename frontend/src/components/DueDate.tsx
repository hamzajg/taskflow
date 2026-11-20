import { isTaskOverdue, relativeDueLabel, TaskDto } from '../pages/projectTypes'

export default function DueDate({ task }: { task: TaskDto }) {
  if (task.dueDate === null) return null
  const label = relativeDueLabel(task)
  const overdue = isTaskOverdue(task)
  return (
    <span className={overdue ? 'due-overdue' : 'muted'}>
      {label ? `${label} · ${task.dueDate}` : `Due ${task.dueDate}`}
    </span>
  )
}
