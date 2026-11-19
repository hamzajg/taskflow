export interface ProjectDto {
  id: number
  workspaceId: number
  name: string
  description: string | null
  color: string | null
  taskCount: number
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
  createdAt: string
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
