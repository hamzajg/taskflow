import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api'
import Alert from '../components/Alert'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Drawer from '../components/Drawer'
import Input from '../components/Input'
import Select from '../components/Select'
import { useShell } from '../shell/ShellContext'
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

export default function WorkspaceDrawer({
  workspace,
  open,
  onClose,
  onChanged,
}: {
  workspace: WorkspaceDto
  open: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { activeWorkspaceId, setActiveWorkspaceId, workspaces } = useShell()
  const [members, setMembers] = useState<Member[] | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const wasOpen = useRef(false)

  const canManage = ['owner', 'admin'].includes(workspace.role)
  const isOwner = workspace.role === 'owner'

  const load = useCallback(async () => {
    setLoadError('')
    setMembers(null)
    try {
      const m = await api.get<Member[]>(`/workspaces/${workspace.id}/members`)
      setMembers(m)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load members')
      return
    }
    if (canManage) {
      api
        .get<Invite[]>(`/workspaces/${workspace.id}/invites`)
        .then(setInvites)
        .catch(() => setInvites([]))
    }
  }, [workspace.id, canManage])

  // fresh state on every open; Drawer stays mounted through close transition
  useEffect(() => {
    if (open && !wasOpen.current) {
      setActionError('')
      setRenameTo('')
      setInviteEmail('')
      setInviteRole('member')
      setConfirmDelete(false)
      setInvites([])
      load()
    }
    wasOpen.current = open
  }, [open, load])

  // while the inline delete confirm is armed, dismissal cancels it first
  function handleClose() {
    if (confirmDelete) {
      setConfirmDelete(false)
      return
    }
    onClose()
  }

  async function mutate(fn: () => Promise<unknown>, after?: () => void) {
    setActionError('')
    setPending(true)
    try {
      await fn()
      after?.()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed')
    } finally {
      setPending(false)
    }
  }

  function rename(e: FormEvent) {
    e.preventDefault()
    mutate(
      () => api.put(`/workspaces/${workspace.id}`, { name: renameTo }),
      () => {
        setRenameTo('')
        onChanged()
      },
    )
  }

  function invite(e: FormEvent) {
    e.preventDefault()
    mutate(
      () =>
        api.post(`/workspaces/${workspace.id}/invites`, {
          email: inviteEmail,
          role: inviteRole,
        }),
      () => {
        setInviteEmail('')
        load()
      },
    )
  }

  function removeMember(userId: number) {
    mutate(
      () => api.delete(`/workspaces/${workspace.id}/members/${userId}`),
      () => {
        load()
        onChanged()
      },
    )
  }

  function destroy() {
    mutate(
      () => api.delete(`/workspaces/${workspace.id}`),
      () => {
        onClose()
        if (activeWorkspaceId === workspace.id) {
          const remaining = workspaces.filter((w) => w.id !== workspace.id)
          setActiveWorkspaceId(remaining[0]?.id ?? null)
        }
        onChanged()
      },
    )
  }

  return (
    <Drawer open={open} onClose={handleClose} title={workspace.name}>
      {actionError && <Alert>{actionError}</Alert>}

      {loadError ? (
        <Alert>
          {loadError}{' '}
          <Button variant="link" size="sm" onClick={load}>
            Retry
          </Button>
        </Alert>
      ) : members === null ? (
        <p className="muted" role="status">
          Loading…
        </p>
      ) : (
        <>
          <h3 className="drawer-section">Members</h3>
          <ul className="ws-list">
            {members.map((m) => (
              <li key={m.userId}>
                {m.displayName}{' '}
                <span className="muted">{m.email}</span>{' '}
                <Badge tone={ROLE_TONES[m.role] ?? 'neutral'}>{m.role}</Badge>{' '}
                {canManage && m.role !== 'owner' && (
                  <Button
                    variant="link"
                    size="sm"
                    aria-label={`Remove ${m.displayName}`}
                    disabled={pending}
                    onClick={() => removeMember(m.userId)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <>
              <form className="inline-form" onSubmit={rename}>
                <Input
                  label="Rename workspace"
                  placeholder="New name"
                  value={renameTo}
                  onChange={(e) => setRenameTo(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" disabled={pending}>
                  Rename
                </Button>
              </form>

              {isOwner &&
                (confirmDelete ? (
                  <div className="drawer-actions">
                    <span className="muted">Delete this workspace?</span>
                    <Button variant="danger" size="sm" disabled={pending} onClick={destroy}>
                      Confirm delete
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete workspace
                  </Button>
                ))}

              <h3 className="drawer-section">Invite member</h3>
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
                <Button type="submit" disabled={pending}>
                  Invite
                </Button>
              </form>

              {invites.length > 0 && (
                <>
                  <h3 className="drawer-section">Pending invites</h3>
                  <ul className="ws-list">
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
        </>
      )}
    </Drawer>
  )
}
