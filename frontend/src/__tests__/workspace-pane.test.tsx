import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { setSession, User } from '../auth'

const USER: User = {
  id: 1,
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@taskflow.local',
  verified: true,
}

const WS_OWNER = { id: 1, name: 'Acme', role: 'owner', memberCount: 2 }
const WS_MEMBER = { id: 2, name: 'Beta', role: 'member', memberCount: 1 }

const MEMBERS_1 = [
  { userId: 1, displayName: 'Demo User', email: 'demo@taskflow.local', role: 'owner' },
  { userId: 2, displayName: 'Mem Ber', email: 'mem@taskflow.local', role: 'member' },
]
const MEMBERS_2 = [
  { userId: 3, displayName: 'Other User', email: 'other@taskflow.local', role: 'member' },
]
const INVITES_1 = [{ id: 9, email: 'new@x.com', role: 'member', token: 'tok' }]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface MockOpts {
  membersFail?: boolean
  postFail?: boolean
}

function mockApi(opts: MockOpts = {}, calls: string[] = []) {
  let workspaces: unknown[] = [WS_OWNER, WS_MEMBER]
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces/1/members': MEMBERS_1,
    '/workspaces/2/members': MEMBERS_2,
    '/workspaces/1/invites': INVITES_1,
    '/workspaces/2/invites': [],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      calls.push(`${method} ${url}`)
      if (url === '/workspaces/1/members' && opts.membersFail)
        return Promise.resolve(jsonResponse({ message: 'members boom' }, 500))
      if (method === 'POST' && url === '/workspaces/1/invites')
        return Promise.resolve(
          opts.postFail
            ? jsonResponse({ message: 'invite rejected' }, 400)
            : jsonResponse({ id: 10, email: 'x@y.z', role: 'member', token: 't' }, 201),
        )
      if (method === 'PUT' && url === '/workspaces/1') {
        const newName = JSON.parse(String(init.body)).name
        workspaces = workspaces.map((w) =>
          (w as { id: number }).id === 1
            ? { ...(w as object), name: newName }
            : w,
        )
        return Promise.resolve(jsonResponse({ ...WS_OWNER, name: newName }))
      }
      if (method === 'DELETE' && url === '/workspaces/1/members/2')
        return Promise.resolve(new Response(null, { status: 204 }))
      if (method === 'DELETE' && url === '/workspaces/1') {
        workspaces = workspaces.filter((w) => (w as { id: number }).id !== 1)
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (url === '/workspaces') return Promise.resolve(jsonResponse(workspaces))
      if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    }),
  )
}

function renderAt(path = '/account') {
  setSession({ token: 'test-token', user: USER })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

async function openWorkspaceDrawer(name = 'Acme') {
  fireEvent.click(await screen.findByRole('button', { name }))
  return screen.findByRole('dialog')
}

describe('workspace-pane — "Workspace name opens the management drawer" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows members with roles inside a labelled dialog', async () => {
    renderAt()
    const dialog = await openWorkspaceDrawer()
    expect(dialog.textContent).toContain('Demo User')
    expect(dialog.textContent).toContain('Mem Ber')
    expect(within(dialog as HTMLElement).getAllByText('owner').length).toBeGreaterThan(0)
    // no inline subpanel left on the page
    expect(document.querySelector('.subpanel')).toBeNull()
  })

  it('member-role workspace hides management controls and never fetches invites', async () => {
    const calls: string[] = []
    mockApi({}, calls)
    renderAt()
    const dialog = await openWorkspaceDrawer('Beta')
    await within(dialog as HTMLElement).findByText('Other User')
    expect(within(dialog as HTMLElement).queryByRole('button', { name: /rename/i })).toBeNull()
    expect(within(dialog as HTMLElement).queryByRole('button', { name: /delete workspace/i })).toBeNull()
    expect(within(dialog as HTMLElement).queryByRole('button', { name: /invite/i })).toBeNull()
    expect(calls.some((c) => c.includes('/workspaces/2/invites'))).toBe(false)
  })
})

describe('workspace-pane — "Manage drawer shows permitted actions per role" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('owner sees rename, delete, invite and remove only for non-owner members', async () => {
    renderAt()
    const dialog = (await openWorkspaceDrawer()) as HTMLElement
    await within(dialog).findByText('Mem Ber')
    expect(within(dialog).getByRole('button', { name: /rename/i })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: /delete workspace/i })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: /invite/i })).toBeTruthy()
    // Remove offered for the member, NOT for the owner row
    const removes = within(dialog).getAllByRole('button', { name: /remove/i })
    expect(removes.length).toBe(1)
    // pending invites listed
    expect(within(dialog).getByText('new@x.com')).toBeTruthy()
  })
})

describe('workspace-pane — "Workspace mutations happen inside the drawer" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('rename posts and refreshes the workspace list', async () => {
    const calls: string[] = []
    mockApi({}, calls)
    renderAt()
    const dialog = (await openWorkspaceDrawer()) as HTMLElement
    await within(dialog).findByText('Mem Ber')
    fireEvent.change(within(dialog).getByLabelText(/rename workspace/i), {
      target: { value: 'Acme Corp' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^rename$/i }))
    await waitFor(() =>
      expect(calls.some((c) => c === 'PUT /workspaces/1')).toBe(true),
    )
    // list refreshes — button name updates to the new workspace name
    expect(await screen.findByRole('button', { name: 'Acme Corp' })).toBeTruthy()
  })

  it('mutation failure alerts inside the drawer and preserves the value', async () => {
    mockApi({ postFail: true })
    renderAt()
    const dialog = (await openWorkspaceDrawer()) as HTMLElement
    await within(dialog).findByText('Mem Ber')
    fireEvent.change(within(dialog).getByLabelText(/email/i), {
      target: { value: 'bad@x.com' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /^invite$/i }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert.textContent).toContain('invite rejected')
    expect(within(dialog).getByLabelText(/email/i)).toHaveProperty('value', 'bad@x.com')
  })
})

describe('workspace-pane — "Dismissing the manage drawer preserves state" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('Escape closes and the active workspace selection is unchanged', async () => {
    renderAt()
    await openWorkspaceDrawer()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // Beta was never activated — sidebar select still shows Acme (opened ws)
    const select = document.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('1')
  })
})

describe('workspace-pane — "Sidebar switching never opens the drawer" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('changing the sidebar workspace does not open a dialog', async () => {
    renderAt()
    await screen.findByRole('button', { name: 'Acme' })
    const select = document.querySelector('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '2' } })
    await waitFor(() => expect(select.value).toBe('2'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('workspace-pane — "Delete uses an inline confirm and resets a dangling selection" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('two-step confirm deletes, closes the drawer and resets active selection', async () => {
    const calls: string[] = []
    mockApi({}, calls)
    renderAt()
    const dialog = (await openWorkspaceDrawer()) as HTMLElement
    await within(dialog).findByText('Mem Ber')
    fireEvent.click(within(dialog).getByRole('button', { name: /delete workspace/i }))
    // inline confirm appears — no window.confirm, no second dialog
    const confirmBtn = await within(dialog).findByRole('button', { name: /confirm delete/i })
    fireEvent.click(confirmBtn)
    await waitFor(() =>
      expect(calls.some((c) => c === 'DELETE /workspaces/1')).toBe(true),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // active selection reset — sidebar no longer points at deleted ws 1
    await waitFor(() => {
      const select = document.querySelector('select') as HTMLSelectElement
      expect(select.value).not.toBe('1')
    })
    // workspace gone from the refreshed list
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Acme' })).toBeNull(),
    )
  })
})

describe('workspace-pane — "Members load failure alerts with retry inside the drawer" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows an alert with retry when members fail to load', async () => {
    mockApi({ membersFail: true })
    renderAt()
    const dialog = (await openWorkspaceDrawer()) as HTMLElement
    const alert = await within(dialog).findByRole('alert')
    expect(alert.textContent).toContain('members boom')
    expect(within(dialog).getByRole('button', { name: /retry/i })).toBeTruthy()
  })
})

describe('workspace-pane — "Sidebar workspace switching still works" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('clicking a workspace name opens its drawer and sets it active', async () => {
    renderAt()
    const dialog = await openWorkspaceDrawer('Beta')
    await within(dialog as HTMLElement).findByText('Other User')
    const select = document.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('2')
  })
})
