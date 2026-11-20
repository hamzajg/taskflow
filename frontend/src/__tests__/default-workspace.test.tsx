import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

// The auto-provisioned default workspace — exactly one, like a fresh login.
const DEFAULT_WS = [{ id: 7, name: "Demo's Workspace", role: 'owner', memberCount: 1 }]

const SUMMARY = {
  projectCount: 0,
  memberCount: 1,
  tasksByStatus: { backlog: 0, todo: 0, in_progress: 0, done: 0 },
  overdueCount: 0,
  dueSoonCount: 0,
  myOpenTaskCount: 0,
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi(workspaces: unknown = DEFAULT_WS) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/auth/me') return Promise.resolve(jsonResponse(USER))
      if (url === '/workspaces') return Promise.resolve(jsonResponse(workspaces))
      if (url === '/workspaces/7/summary') return Promise.resolve(jsonResponse(SUMMARY))
      if (url === '/workspaces/7/projects') return Promise.resolve(jsonResponse([]))
      if (url.startsWith('/workspaces/7/members'))
        return Promise.resolve(jsonResponse([]))
      if (url.startsWith('/workspaces/7/invites'))
        return Promise.resolve(jsonResponse([]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    }),
  )
}

function renderAt(path: string) {
  setSession({ token: 'test-token', user: USER })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('default-workspace — "Sidebar shows the default workspace as selected" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('workspace switcher displays the single workspace, not the placeholder', async () => {
    renderAt('/dashboard')
    const select = (await screen.findByLabelText(/workspace/i)) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe('7'))
  })
})

describe('default-workspace — "Dashboard auto-selects the default workspace" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders workspace stats without any selection action', async () => {
    renderAt('/dashboard')
    // Stats for workspace 7 render — proof the effective workspace resolved.
    await screen.findByText('Projects')
    await waitFor(() =>
      expect(screen.getByLabelText(/workspace/i)).toHaveProperty('value', '7'),
    )
  })
})

describe('default-workspace — "Account page lists the default workspace" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('lists the provisioned workspace with owner badge', async () => {
    renderAt('/account')
    const opener = await screen.findByRole('button', { name: "Demo's Workspace" })
    expect(opener).toBeTruthy()
    expect(screen.getByText('owner')).toBeTruthy()
  })
})
