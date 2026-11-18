import { createContext, ReactNode, useContext } from 'react'
import { User } from '../auth'
import { WorkspaceDto } from '../pages/workspaceTypes'

export interface ShellState {
  user: User | null
  workspaces: WorkspaceDto[]
  activeWorkspaceId: number | null
  setActiveWorkspaceId: (id: number | null) => void
  refreshWorkspaces: () => void
  setUser: (u: User | null) => void
  logout: () => void
}

export const ShellContext = createContext<ShellState | null>(null)

export function useShell(): ShellState {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used inside AppShell')
  return ctx
}

export function ShellProvider({
  value,
  children,
}: {
  value: ShellState
  children: ReactNode
}) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
