export interface WorkspaceDto {
  id: number
  name: string
  role: string
  memberCount: number
}

export interface WorkspaceSummaryDto {
  projectCount: number
  memberCount: number
  tasksByStatus: Record<string, number>
  overdueCount: number
  dueSoonCount: number
  myOpenTaskCount: number
}
