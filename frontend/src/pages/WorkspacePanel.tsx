import { useState } from 'react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { useShell } from '../shell/ShellContext'
import WorkspaceCreateDrawer from './WorkspaceCreateDrawer'
import WorkspaceDrawer from './WorkspaceDrawer'
import { WorkspaceDto } from './workspaceTypes'

const ROLE_TONES: Record<string, 'primary' | 'success' | 'neutral'> = {
  owner: 'primary',
  admin: 'success',
  member: 'neutral',
}

export default function WorkspacePanel({
  workspaces,
  onChanged,
}: {
  workspaces: WorkspaceDto[]
  onChanged: () => void
}) {
  const [openId, setOpenId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  // keep the last opened workspace so the drawer can animate closed
  const [drawerWs, setDrawerWs] = useState<WorkspaceDto | null>(null)
  const { setActiveWorkspaceId } = useShell()

  return (
    <Card
      title="Workspaces"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          New workspace
        </Button>
      }
    >
      <ul className="ws-list">
        {workspaces.map((w) => (
          <li key={w.id}>
            <Button
              variant="link"
              onClick={() => {
                setOpenId(w.id)
                setDrawerWs(w)
                setActiveWorkspaceId(w.id)
              }}
            >
              {w.name}
            </Button>
            <Badge tone={ROLE_TONES[w.role] ?? 'neutral'}>{w.role}</Badge>
            <span className="muted">
              {w.memberCount} member{w.memberCount === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>

      {drawerWs && (
        <WorkspaceDrawer
          workspace={workspaces.find((w) => w.id === drawerWs.id) ?? drawerWs}
          open={openId !== null}
          onClose={() => setOpenId(null)}
          onChanged={onChanged}
        />
      )}
      <WorkspaceCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onChanged}
      />
    </Card>
  )
}
