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

const WORKSPACES = [
  { id: 1, name: 'Acme', role: 'owner', memberCount: 3 },
  { id: 2, name: 'Beta', role: 'member', memberCount: 5 },
]

const SUMMARY_1 = {
  projectCount: 2,
  memberCount: 3,
  tasksByStatus: { backlog: 1, todo: 4, in_progress: 2, done: 3 },
  overdueCount: 1,
  dueSoonCount: 2,
  myOpenTaskCount: 2,
  timeMinutesTotal: 95,
}

const SUMMARY_2 = {
  projectCount: 1,
  memberCount: 5,
  tasksByStatus: { backlog: 0, todo: 1, in_progress: 0, done: 0 },
  overdueCount: 0,
  dueSoonCount: 0,
  myOpenTaskCount: 0,
  timeMinutesTotal: 0,
}

const PROJECTS_1 = [
  {
    id: 5,
    workspaceId: 1,
    name: 'Website redesign',
    description: null,
    color: '#7c3aed',
    taskCount: 10,
    tags: [{ id: 1, title: 'Client X', color: '#0ea5e9' }],
    createdAt: '2026-11-18T00:00:00Z',
  },
]

const PROJECTS_2 = [
  {
    id: 9,
    workspaceId: 2,
    name: 'Beta launch',
    description: null,
    color: null,
    taskCount: 1,
    createdAt: '2026-11-18T00:00:00Z',
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface MockOpts {
  workspaces?: typeof WORKSPACES
  failSummary?: boolean
}

function mockApi(opts: MockOpts = {}) {
  const workspaces = opts.workspaces ?? WORKSPACES
  let summaryFails = opts.failSummary ?? false
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces': workspaces,
    '/workspaces/1/projects': PROJECTS_1,
    '/workspaces/2/projects': PROJECTS_2,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/workspaces/1/summary') {
        if (summaryFails) {
          summaryFails = false // fail once, then recover for retry
          return Promise.resolve(jsonResponse({ message: 'boom' }, 500))
        }
        return Promise.resolve(jsonResponse(SUMMARY_1))
      }
      if (url === '/workspaces/2/summary') {
        return Promise.resolve(jsonResponse(SUMMARY_2))
      }
      if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
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

describe('Dashboard — "Dashboard shows workspace stat cards"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ workspaces: [WORKSPACES[0]] })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders stat cards with workspace counts', async () => {
    renderAt('/dashboard')
    // single workspace auto-selects; wait for summary-loaded cards
    expect(await screen.findByText('Backlog tasks')).toBeTruthy()
    const cards = document.querySelectorAll('.stat-card')
    expect(cards.length).toBe(10) // 6 fixed + 4 status
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // projectCount/myOpen
    expect(screen.getByText('My open tasks')).toBeTruthy()
    expect(screen.getByText('Overdue')).toBeTruthy()
    expect(screen.getByText('Due soon')).toBeTruthy()
    // projects widget lists the project with a link
    const link = await screen.findByRole('link', { name: /Website redesign/ })
    expect(link.getAttribute('href')).toBe('/projects/5')
  })

  it('Dashboard handles empty and loading states — shows an empty state when the workspace has no projects', async () => {
    mockApi({
      workspaces: [{ id: 1, name: 'Empty', role: 'owner', memberCount: 1 }],
    })
    // override routes for empty workspace
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/auth/me') return Promise.resolve(jsonResponse(USER))
        if (url === '/workspaces') {
          return Promise.resolve(
            jsonResponse([{ id: 1, name: 'Empty', role: 'owner', memberCount: 1 }]),
          )
        }
        if (url === '/workspaces/1/summary') {
          return Promise.resolve(
            jsonResponse({
              projectCount: 0,
              memberCount: 1,
              tasksByStatus: { backlog: 0, todo: 0, in_progress: 0, done: 0 },
              overdueCount: 0,
              dueSoonCount: 0,
              myOpenTaskCount: 0,
              timeMinutesTotal: 0,
            }),
          )
        }
        if (url === '/workspaces/1/projects') return Promise.resolve(jsonResponse([]))
        return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
      }),
    )
    renderAt('/dashboard')
    expect(await screen.findByText(/no projects yet/i)).toBeTruthy()
    expect(await screen.findByText('Backlog tasks')).toBeTruthy()
    expect(document.querySelectorAll('.stat-card').length).toBe(10)
  })

  it('Dashboard error offers retry — shows an error with retry when the summary request fails', async () => {
    mockApi({ workspaces: [WORKSPACES[0]], failSummary: true })
    renderAt('/dashboard')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('boom')
    fireEvent.click(within(alert as HTMLElement).getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('My open tasks')).toBeTruthy()
  })
})

describe('Dashboard — "Dashboard follows the sidebar workspace selection"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('switching workspace in the sidebar reloads the stats', async () => {
    renderAt('/dashboard')
    // pick workspace 1 in the switcher
    const select = await screen.findByLabelText(/workspace/i)
    fireEvent.change(select, { target: { value: '1' } })
    expect(await screen.findByText('Backlog tasks')).toBeTruthy()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // SUMMARY_1 counts

    fireEvent.change(select, { target: { value: '2' } })
    await waitFor(() => {
      const cards = document.querySelectorAll('.stat-card')
      expect(cards.length).toBeGreaterThanOrEqual(6)
    })
    // SUMMARY_2: projectCount 1, memberCount 5, myOpen 0
    expect(await screen.findByText('Beta launch')).toBeTruthy()
    expect(screen.queryByText('Website redesign')).toBeNull()
  })
})

describe('ux-polish @w3 — "Dashboard shows project identity and time totals"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ workspaces: [WORKSPACES[0]] })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows a Time logged stat and project color/tag identity', async () => {
    renderAt('/dashboard')
    expect(await screen.findByText('Time logged')).toBeTruthy()
    // 95 minutes → 1h 35m
    expect(await screen.findByText('1h 35m')).toBeTruthy()
    // project row carries color swatch + tag badge
    const link = await screen.findByRole('link', { name: /Website redesign/ })
    const row = link.closest('li')!
    expect(row.querySelector('.project-swatch')).toBeTruthy()
    expect(within(row).getByText('Client X')).toBeTruthy()
  })

  it('keeps stat labels and tag badges accessible in both themes', async () => {
    for (const theme of ['light', 'dark']) {
      cleanup()
      localStorage.setItem('tf-theme', theme)
      mockApi({ workspaces: [WORKSPACES[0]] })
      renderAt('/dashboard')
      expect(await screen.findByText('Time logged')).toBeTruthy()
      const link = await screen.findByRole('link', { name: /Website redesign/ })
      const row = link.closest('li')!
      expect(within(row).getByText('Client X')).toBeTruthy()
      expect(screen.getByLabelText(/workspace stats/i)).toBeTruthy()
    }
  })
})
