import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { setSession, User } from '../auth'
import { TimeEntryDto } from '../pages/projectTypes'

const USER: User = {
  id: 1,
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@taskflow.local',
  verified: true,
}

const WORKSPACE = { id: 1, name: 'Acme', role: 'owner', memberCount: 2 }

const PROJECT = {
  id: 5,
  workspaceId: 1,
  name: 'Website redesign',
  description: null,
  color: null,
  taskCount: 3,
  tags: [],
  createdAt: '2026-11-18T00:00:00Z',
}

function localISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const TODAY = localISO(new Date())
const TOMORROW = localISO(new Date(Date.now() + 86400000))
const YESTERDAY = localISO(new Date(Date.now() - 86400000))
const IN_FIVE = localISO(new Date(Date.now() + 5 * 86400000))

function task(partial: Record<string, unknown>) {
  return {
    id: 11,
    projectId: 5,
    title: 'Write copy',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    position: 0,
    totalMinutes: 0,
    createdAt: '2026-11-18T00:00:00Z',
    ...partial,
  }
}

const TASKS = [
  task({ id: 11, title: 'Alpha today', dueDate: TODAY, totalMinutes: 30 }),
  task({ id: 12, title: 'Bravo tomorrow', dueDate: TOMORROW, status: 'in_progress' }),
  task({ id: 13, title: 'Charlie overdue', dueDate: YESTERDAY }),
  task({ id: 14, title: 'Delta in five', dueDate: IN_FIVE, status: 'in_progress' }),
  task({ id: 15, title: 'Echo no due' }),
  task({ id: 16, title: 'Foxtrot done', dueDate: YESTERDAY, status: 'done' }),
]

const MEMBERS = [
  { userId: 1, displayName: 'Demo User', email: 'demo@taskflow.local', role: 'owner' },
]

function entry(partial: Partial<TimeEntryDto>): TimeEntryDto {
  return {
    id: 1,
    taskId: 11,
    taskTitle: 'Write copy',
    userId: 1,
    userName: 'Demo User',
    entryDate: TODAY,
    minutes: 30,
    startedAt: null,
    endedAt: null,
    running: false,
    description: null,
    createdAt: '2026-11-19T09:00:00Z',
    ...partial,
  }
}

interface MockState {
  entries: TimeEntryDto[]
  running: TimeEntryDto | null
  role: string
  tasks: ReturnType<typeof task>[]
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi(state: MockState) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/auth/me') return Promise.resolve(jsonResponse(USER))
      if (url === '/workspaces') {
        return Promise.resolve(jsonResponse([{ ...WORKSPACE, role: state.role }]))
      }
      if (url === '/workspaces/1/projects') return Promise.resolve(jsonResponse([PROJECT]))
      if (url === '/workspaces/1/members') return Promise.resolve(jsonResponse(MEMBERS))
      if (url === '/projects/5') return Promise.resolve(jsonResponse(PROJECT))
      if (url === '/projects/5/tasks' && method === 'GET') {
        return Promise.resolve(jsonResponse(state.tasks))
      }
      if (/^\/tasks\/\d+$/.test(url) && method === 'GET') {
        const id = Number(url.split('/')[2])
        const t = state.tasks.find((x) => x.id === id) ?? TASKS[0]
        return Promise.resolve(jsonResponse({ ...t, projectId: 5 }))
      }
      if (/^\/tasks\/\d+\/comments$/.test(url)) {
        return Promise.resolve(jsonResponse({ comments: [], hasMore: false }))
      }
      if (/^\/tasks\/\d+\/time-entries$/.test(url) && method === 'GET') {
        return Promise.resolve(
          jsonResponse({ entries: state.entries, running: state.running }),
        )
      }
      if (/^\/tasks\/\d+\/time-entries$/.test(url) && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        const taskId = Number(url.split('/')[2])
        const created = entry({
          id: 99,
          taskId,
          entryDate: String(body.entryDate),
          minutes: Number(body.minutes),
          description: (body.description as string) ?? null,
        })
        state.entries = [created, ...state.entries]
        const t = state.tasks.find((x) => x.id === taskId)
        if (t) t.totalMinutes += Number(body.minutes)
        return Promise.resolve(jsonResponse(created, 201))
      }
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    }),
  )
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}{loc.search}</div>
}

function renderAt(path: string) {
  setSession({ token: 'test-token', user: USER })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function freshState(overrides: Partial<MockState> = {}): MockState {
  return {
    entries: [],
    running: null,
    role: 'owner',
    tasks: TASKS.map((t) => ({ ...t })),
    ...overrides,
  }
}

describe('ux-polish @w2 — "Due dates render relative labels on task surfaces"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi(freshState())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders Today/Tomorrow/In N d labels with the ISO date kept', async () => {
    renderAt('/projects/5')
    expect(await screen.findByText(new RegExp(`Due today · ${TODAY}`))).toBeTruthy()
    expect(screen.getByText(new RegExp(`Due tomorrow · ${TOMORROW}`))).toBeTruthy()
    expect(screen.getByText(new RegExp(`Due in 5 d · ${IN_FIVE}`))).toBeTruthy()
    // no due date → no due label at all
    const noDue = screen.getByText('Echo no due').closest('li')!
    expect(within(noDue).queryByText(/Due /)).toBeNull()
  })

  it('flags overdue open tasks and leaves done tasks unflagged', async () => {
    renderAt('/projects/5')
    const overdue = (await screen.findByText('Charlie overdue')).closest('li')!
    const flag = within(overdue).getByText(new RegExp(`Overdue · ${YESTERDAY}`))
    expect(flag.className).toContain('due-overdue')
    // done task with a past due date is not flagged
    const done = screen.getByText('Foxtrot done').closest('li')!
    expect(within(done).queryByText(/Overdue/)).toBeNull()
    expect(within(done).getByText(new RegExp(`Due ${YESTERDAY}`))).toBeTruthy()
  })

  it('shows the relative label on board cards and task detail', async () => {
    localStorage.setItem('taskflow.view.5', 'board')
    const { container } = renderAt('/projects/5')
    await waitFor(() => expect(container.querySelector('.board')).toBeTruthy())
    expect(screen.getByText(new RegExp(`Due today · ${TODAY}`))).toBeTruthy()
    cleanup()
    vi.unstubAllGlobals()
    mockApi(freshState())
    renderAt('/tasks/11')
    expect(await screen.findByText(new RegExp(`Due today · ${TODAY}`))).toBeTruthy()
  })
})

describe('ux-polish @w2 — "Time section works inside the task drawer"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi(freshState({ entries: [entry({})] }))
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('loads entries and timer controls inside the drawer without leaving the list', async () => {
    renderAt('/projects/5?task=11')
    const drawer = await screen.findByRole('dialog')
    const section = await within(drawer).findByRole('region', { name: /time tracking/i })
    expect(await within(section).findByText('30m')).toBeTruthy()
    expect(within(section).getByRole('button', { name: /start timer/i })).toBeTruthy()
    // list still rendered behind the drawer
    expect(screen.getAllByRole('link', { name: 'Alpha today' }).length).toBeGreaterThan(0)
  })

  it('refreshes the task list totals after logging time in the drawer', async () => {
    renderAt('/projects/5?task=11')
    const drawer = await screen.findByRole('dialog')
    const section = await within(drawer).findByRole('region', { name: /time tracking/i })
    await within(section).findByText('30m')

    fireEvent.change(within(section).getByLabelText(/^minutes$/i), {
      target: { value: '15' },
    })
    fireEvent.click(within(section).getByRole('button', { name: /log time/i }))

    // row chip + project aggregate refresh via silent reload
    expect(await screen.findByText('45m logged')).toBeTruthy()
    expect(await screen.findByText(/Total time: 45m/)).toBeTruthy()
    // the drawer's own Total header refreshes too (audit fix)
    expect(await within(drawer).findByText('Total: 45m')).toBeTruthy()
  })
})

describe('ux-polish @w2 — "Account page has a single Workspaces heading"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi(freshState())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders exactly one Workspaces heading', async () => {
    renderAt('/account')
    await screen.findByRole('button', { name: /new workspace/i })
    const headings = screen.getAllByRole('heading', { name: 'Workspaces' })
    expect(headings).toHaveLength(1)
  })
})

describe('ux-polish @w2 — "Board view is deep-linkable via the view param"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi(freshState())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('?view=board renders the board; toggling writes ?view=list', async () => {
    const { container } = renderAt('/projects/5?view=board')
    await waitFor(() => expect(container.querySelector('.board')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /^list$/i }))
    await waitFor(() => {
      expect(screen.getByTestId('loc').textContent).toContain('view=list')
    })
    await waitFor(() => expect(container.querySelector('.board')).toBeNull())
  })

  it('keeps ?view and ?task together when the drawer opens and closes', async () => {
    const { container } = renderAt('/projects/5?view=board')
    await waitFor(() => expect(container.querySelector('.board')).toBeTruthy())
    const link = await screen.findByRole('link', { name: 'Alpha today' })
    fireEvent.click(link)
    const drawer = await screen.findByRole('dialog')
    await waitFor(() => {
      const loc = screen.getByTestId('loc').textContent!
      expect(loc).toContain('view=board')
      expect(loc).toContain('task=11')
    })
    fireEvent.click(within(drawer).getByRole('button', { name: /close/i }))
    await waitFor(() => {
      const loc = screen.getByTestId('loc').textContent!
      expect(loc).toContain('view=board')
      expect(loc).not.toContain('task=')
    })
    // still on the board after closing
    await waitFor(() => expect(container.querySelector('.board')).toBeTruthy())
  })

  it('falls back to the saved preference for an invalid view param', async () => {
    localStorage.setItem('taskflow.view.5', 'board')
    const { container } = renderAt('/projects/5?view=bogus')
    await waitFor(() => expect(container.querySelector('.board')).toBeTruthy())
  })

  it('uses the saved preference when no param is present', async () => {
    localStorage.setItem('taskflow.view.5', 'board')
    const { container } = renderAt('/projects/5')
    await waitFor(() => expect(container.querySelector('.board')).toBeTruthy())
  })
})

describe('ux-polish audit — safeCssColor', () => {
  it('accepts hex and named colors, rejects css smuggling', async () => {
    const { safeCssColor } = await import('../pages/projectTypes')
    expect(safeCssColor('#7c3aed')).toBe('#7c3aed')
    expect(safeCssColor('#fff')).toBe('#fff')
    expect(safeCssColor('steelblue')).toBe('steelblue')
    expect(safeCssColor('url(https://evil.example/x)')).toBeUndefined()
    expect(safeCssColor('expression(alert(1))')).toBeUndefined()
    expect(safeCssColor('red; background: url(x)')).toBeUndefined()
    expect(safeCssColor(null)).toBeUndefined()
  })
})
