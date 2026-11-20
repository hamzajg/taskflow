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
  const { setActiveWorkspaceId } = useShell()
  const openWs = workspaces.find((w) => w.id === openId)

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

      {openWs && (
        <WorkspaceDrawer
          workspace={openWs}
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
