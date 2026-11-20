import Input from './Input'
import Select from './Select'
import { MemberDto, statusLabel, TASK_PRIORITIES, TASK_STATUSES } from '../pages/projectTypes'

export interface TaskFormValue {
  title: string
  description: string
  status: string
  priority: string
  assigneeId: string
  dueDate: string
}

export const EMPTY_TASK_FORM: TaskFormValue = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigneeId: '',
  dueDate: '',
}

export const STATUS_OPTIONS = TASK_STATUSES.map((s) => ({
  value: s,
  label: statusLabel(s),
}))

export const PRIORITY_OPTIONS = TASK_PRIORITIES.map((p) => ({
  value: p,
  label: p[0].toUpperCase() + p.slice(1),
}))

export function memberOptions(members: MemberDto[]) {
  return [
    { value: '', label: 'Unassigned' },
    ...members.map((m) => ({ value: String(m.userId), label: m.displayName })),
  ]
}

export default function TaskFormFields({
  value,
  onField,
  members,
  idPrefix = '',
}: {
  value: TaskFormValue
  onField: (field: keyof TaskFormValue, v: string) => void
  members: MemberDto[]
  idPrefix?: string
}) {
  return (
    <>
      <Input
        label="Title"
        id={`${idPrefix}title`}
        value={value.title}
        onChange={(e) => onField('title', e.target.value)}
        required
      />
      <Input
        label="Description"
        id={`${idPrefix}description`}
        value={value.description}
        onChange={(e) => onField('description', e.target.value)}
      />
      <div className="task-form-grid">
        <Select
          label="Status"
          id={`${idPrefix}status`}
          value={value.status}
          onChange={(e) => onField('status', e.target.value)}
          options={STATUS_OPTIONS}
        />
        <Select
          label="Priority"
          id={`${idPrefix}priority`}
          value={value.priority}
          onChange={(e) => onField('priority', e.target.value)}
          options={PRIORITY_OPTIONS}
        />
        <Select
          label="Assignee"
          id={`${idPrefix}assignee`}
          value={value.assigneeId}
          onChange={(e) => onField('assigneeId', e.target.value)}
          options={memberOptions(members)}
        />
        <Input
          label="Due date"
          id={`${idPrefix}due-date`}
          type="date"
          value={value.dueDate}
          onChange={(e) => onField('dueDate', e.target.value)}
        />
      </div>
    </>
  )
}
