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
