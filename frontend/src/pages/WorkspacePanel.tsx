import { FormEvent, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useShell } from '../shell/ShellContext'
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
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const { setActiveWorkspaceId } = useShell()
  const openWs = workspaces.find((w) => w.id === openId)

  async function create(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api.post('/workspaces', { name })
      setName('')
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed')
    }
  }

  return (
    <Card title="Workspaces">
      {error && <Alert>{error}</Alert>}
      <form className="inline-form" onSubmit={create}>
        <Input
          label="New workspace"
          placeholder="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Button type="submit">Create</Button>
      </form>

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
    </Card>
  )
}
