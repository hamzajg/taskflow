import { FormEvent, useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api'
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

  return (
    <section>
      <h2>Workspaces</h2>
      {error && <div className="error">{error}</div>}
      <form className="inline-form" onSubmit={create}>
        <input
          placeholder="New workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit">Create</button>
      </form>

      <ul className="ws-list">
        {workspaces.map((w) => (
          <li key={w.id}>
            <button className="link" onClick={() => setOpenId(openId === w.id ? null : w.id)}>
              {w.name}
            </button>{' '}
            <span className="muted">
              {w.role} · {w.memberCount} member{w.memberCount === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>

      {openWs && (
        <div className="panel">
          <h3>{openWs.name} — members</h3>
          <ul>
            {members.map((m) => (
              <li key={m.userId}>
                {m.displayName} <span className="muted">{m.email} · {m.role}</span>{' '}
                {canManage && m.role !== 'owner' && (
                  <button className="link" onClick={() => removeMember(m.userId)}>
                    remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <>
              <h4>Invite member</h4>
              <form className="inline-form" onSubmit={invite}>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <button type="submit">Invite</button>
              </form>
              {invites.length > 0 && (
                <>
                  <h4>Pending invites</h4>
                  <ul>
                    {invites.map((i) => (
                      <li key={i.id}>
                        {i.email} <span className="muted">{i.role}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
