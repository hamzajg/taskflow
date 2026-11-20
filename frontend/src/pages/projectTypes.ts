export interface TagDto {
  id: number
  title: string
  color: string | null
}

export interface ProjectDto {
  id: number
  workspaceId: number
  name: string
  description: string | null
  color: string | null
  taskCount: number
  tags: TagDto[]
  createdAt: string
}

export interface TaskDto {
  id: number
  projectId: number
  title: string
  description: string | null
  status: string
  priority: string
  assigneeId: number | null
  assigneeName: string | null
  dueDate: string | null
  position: number
  totalMinutes: number
  createdAt: string
}

export interface TimeEntryDto {
  id: number
  taskId: number
  taskTitle: string | null
  userId: number
  userName: string | null
  entryDate: string
  minutes: number | null
  startedAt: string | null
  endedAt: string | null
  running: boolean
  description: string | null
  createdAt: string
}

export interface TimeEntryList {
  entries: TimeEntryDto[]
  running: TimeEntryDto | null
}

export interface CommentDto {
  id: number
  taskId: number
  authorId: number
  authorName: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface CommentList {
  comments: CommentDto[]
  hasMore: boolean
}

export interface MemberDto {
  userId: number
  displayName: string
  email: string
  role: string
}

export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'done'] as const

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export function statusLabel(status: string): string {
  switch (status) {
    case 'backlog':
      return 'Backlog'
    case 'todo':
      return 'Todo'
    case 'in_progress':
      return 'In progress'
    case 'done':
      return 'Done'
    default:
      return status
  }
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function todayLocalISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// YYYY-MM-DD strings compare lexicographically; day diff via UTC-midnight math
// is safe because both operands are date-only (no timezone component).
export function dueDayDiff(dueDate: string, today: string = todayLocalISO()): number {
  const [y, m, d] = dueDate.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

export function isTaskOverdue(task: Pick<TaskDto, 'dueDate' | 'status'>): boolean {
  return task.dueDate !== null && task.dueDate < todayLocalISO() && task.status !== 'done'
}

// null → render the bare ISO date (far-future or completed tasks)
export function relativeDueLabel(
  task: Pick<TaskDto, 'dueDate' | 'status'>,
  today: string = todayLocalISO(),
): string | null {
  if (task.dueDate === null) return null
  if (isTaskOverdue(task)) return 'Overdue'
  const diff = dueDayDiff(task.dueDate, today)
  if (task.status === 'done' || diff > 14) return null
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff} d`
}

// project/tag colors are free-text up to 20 chars server-side; only emit
// values that can't smuggle a url()/expression() into inline styles
export function safeCssColor(color: string | null | undefined): string | undefined {
  return color && /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/.test(color) ? color : undefined
}

export function priorityTone(priority: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' {
  switch (priority) {
    case 'urgent':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'primary'
    case 'low':
      return 'neutral'
    default:
      return 'neutral'
  }
}
