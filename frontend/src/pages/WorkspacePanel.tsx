import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Select from '../components/Select'
import { WorkspaceDto } from './workspaceTypes'

interface Member {
  userId: number
  displayName: string
  email: string
  role: string
}

interface Invite {
  id: number
  email: string
  role: string
  token: string
}

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
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [renameTo, setRenameTo] = useState('')

  const refreshDetail = useCallback(async (id: number) => {
    const [m, i] = await Promise.all([
      api.get<Member[]>(`/workspaces/${id}/members`),
      api.get<Invite[]>(`/workspaces/${id}/invites`).catch(() => [] as Invite[]),
    ])
    setMembers(m)
    setInvites(i)
  }, [])

  useEffect(() => {
    if (openId !== null) refreshDetail(openId).catch(() => {})
  }, [openId, refreshDetail])

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

  async function invite(e: FormEvent) {
    e.preventDefault()
    if (openId === null) return
    try {
      await api.post(`/workspaces/${openId}/invites`, { email: inviteEmail, role: inviteRole })
      setInviteEmail('')
      await refreshDetail(openId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invite failed')
    }
  }

  async function rename(e: FormEvent) {
    e.preventDefault()
    if (openId === null) return
    try {
      await api.put(`/workspaces/${openId}`, { name: renameTo })
      setRenameTo('')
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Rename failed')
    }
  }

  async function destroy() {
    if (openId === null) return
    if (!window.confirm(`Delete workspace "${openWs?.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/workspaces/${openId}`)
      setOpenId(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed')
    }
  }

  async function removeMember(userId: number) {
    if (openId === null) return
    await api.delete(`/workspaces/${openId}/members/${userId}`).catch((err) =>
      setError(err instanceof ApiError ? err.message : 'Remove failed'),
    )
    await refreshDetail(openId)
    onChanged()
  }

  const openWs = workspaces.find((w) => w.id === openId)
  const canManage = openWs && ['owner', 'admin'].includes(openWs.role)
  const isOwner = openWs?.role === 'owner'

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
            <Button variant="link" onClick={() => setOpenId(openId === w.id ? null : w.id)}>
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
        <div className="subpanel">
          <h3>{openWs.name} — members</h3>
          {canManage && (
            <form className="inline-form" onSubmit={rename}>
              <Input
                label="Rename workspace"
                placeholder="New name"
                value={renameTo}
                onChange={(e) => setRenameTo(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary">
                Rename
              </Button>
            </form>
          )}
          {isOwner && (
            <Button variant="danger" size="sm" onClick={destroy}>
              Delete workspace
            </Button>
          )}
          <ul>
            {members.map((m) => (
              <li key={m.userId}>
                {m.displayName}{' '}
                <span className="muted">
                  {m.email} · {m.role}
                </span>{' '}
                <Badge tone={ROLE_TONES[m.role] ?? 'neutral'}>{m.role}</Badge>{' '}
                {canManage && m.role !== 'owner' && (
                  <Button variant="link" size="sm" onClick={() => removeMember(m.userId)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <>
              <h4>Invite member</h4>
              <form className="inline-form" onSubmit={invite}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <Select
                  label="Role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  options={[
                    { value: 'member', label: 'Member' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
                <Button type="submit">Invite</Button>
              </form>
              {invites.length > 0 && (
                <>
                  <h4>Pending invites</h4>
                  <ul>
                    {invites.map((i) => (
                      <li key={i.id}>
                        {i.email} <Badge>{i.role}</Badge>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}
