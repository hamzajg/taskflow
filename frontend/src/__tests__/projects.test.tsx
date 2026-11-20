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

const WORKSPACE = { id: 1, name: 'Acme', role: 'owner', memberCount: 2 }

const PROJECTS = [
  {
    id: 5,
    workspaceId: 1,
    name: 'Website redesign',
    description: 'New marketing site',
    color: null,
    taskCount: 2,
    createdAt: '2026-11-18T00:00:00Z',
  },
  {
    id: 6,
    workspaceId: 1,
    name: 'Mobile app',
    description: null,
    color: null,
    taskCount: 0,
    createdAt: '2026-11-18T00:00:00Z',
  },
]

const PROJECT_5 = PROJECTS[0]

const TASKS = [
  {
    id: 11,
    projectId: 5,
    title: 'Write copy',
    description: null,
    status: 'todo',
    priority: 'high',
    assigneeId: 1,
    assigneeName: 'Demo User',
    dueDate: '2026-12-01',
    position: 0,
    createdAt: '2026-11-18T00:00:00Z',
  },
  {
    id: 12,
    projectId: 5,
    title: 'Ship landing page',
    description: null,
    status: 'done',
    priority: 'medium',
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    position: 0,
    createdAt: '2026-11-18T00:00:00Z',
  },
]

const MEMBERS = [
  { userId: 1, displayName: 'Demo User', email: 'demo@taskflow.local', role: 'owner' },
  { userId: 2, displayName: 'Mem Ber', email: 'mem@taskflow.local', role: 'member' },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces': [WORKSPACE],
    '/workspaces/1/projects': PROJECTS,
    '/projects/5': PROJECT_5,
    '/projects/6': PROJECTS[1],
    '/projects/5/tasks': TASKS,
    '/projects/6/tasks': [],
    '/workspaces/1/members': MEMBERS,
    ...overrides,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
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

describe('Projects list — "Projects list shows workspace projects with counts"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('lists workspace projects with task counts and links to detail', async () => {
    renderAt('/projects')
    expect(await screen.findByText('Website redesign')).toBeTruthy()
    expect(screen.getByText('Mobile app')).toBeTruthy()
    expect(screen.getByText(/2 tasks/)).toBeTruthy()
    expect(screen.getByText(/0 tasks/)).toBeTruthy()
    const link = screen.getByRole('link', { name: /Website redesign/ })
    expect(link.getAttribute('href')).toBe('/projects/5')
  })

  it('exposes a Projects entry in the sidebar navigation', async () => {
    renderAt('/account')
    await screen.findByText('Welcome, Demo')
    const nav = screen.getAllByRole('link', { name: /Projects/ })
    expect(nav.length).toBeGreaterThan(0)
    expect(nav[0].getAttribute('href')).toBe('/projects')
  })
})

describe('Project detail — "Project detail shows tasks in list view"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('groups tasks by status and shows task fields', async () => {
    renderAt('/projects/5')
    expect(await screen.findByText('Website redesign')).toBeTruthy()
    expect(await screen.findByText('Write copy')).toBeTruthy()
    expect(screen.getByText('Ship landing page')).toBeTruthy()
    // grouped under status headings
    expect(screen.getByRole('heading', { name: /todo/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /^done/i })).toBeTruthy()
    // task fields visible (assignee also appears in topbar/select, so allow many)
    expect(screen.getByText(/high/)).toBeTruthy()
    expect(screen.getAllByText(/Demo User/).length).toBeGreaterThan(1)
    expect(screen.getByText(/2026-12-01/)).toBeTruthy()
  })

  it('creates a task through the create form', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const routes: Record<string, unknown> = {
        '/auth/me': USER,
        '/workspaces': [WORKSPACE],
        '/projects/5': PROJECT_5,
        '/projects/5/tasks': TASKS,
        '/workspaces/1/members': MEMBERS,
      }
      if (url === '/projects/5/tasks' && init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ ...TASKS[0], id: 99, title: 'New task' }, 201))
      }
      if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    })
    vi.stubGlobal('fetch', fetchMock)
    setSession({ token: 'test-token', user: USER })
    render(
      <MemoryRouter initialEntries={['/projects/5']}>
        <App />
      </MemoryRouter>,
    )
    const titleInput = await screen.findByLabelText(/title/i)
    fireEvent.change(titleInput, { target: { value: 'New task' } })
    fireEvent.click(screen.getByRole('button', { name: /add task|create task/i }))
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) => String(u) === '/projects/5/tasks' && i?.method === 'POST',
        ),
      ).toBe(true),
    )
  })
})

describe('Project detail — "Empty project shows a useful empty state"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('prompts to create the first task and shows no error', async () => {
    renderAt('/projects/6')
    expect(await screen.findByText('Mobile app')).toBeTruthy()
    expect(await screen.findByText(/no tasks|first task|empty/i)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('Board view — "Board groups tasks by status column"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows one column per status with its tasks', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    fireEvent.click(screen.getByRole('button', { name: /^board$/i }))
    // status columns
    for (const label of ['Backlog', 'Todo', 'In progress', 'Done']) {
      expect(screen.getByRole('heading', { name: new RegExp(label, 'i') })).toBeTruthy()
    }
    // tasks land in their status column
    const todoCol = screen.getByRole('heading', { name: /^todo/i }).closest('section')!
    expect(todoCol.textContent).toContain('Write copy')
    const doneCol = screen.getByRole('heading', { name: /^done/i }).closest('section')!
    expect(doneCol.textContent).toContain('Ship landing page')
    expect(todoCol.textContent).not.toContain('Ship landing page')
  })

  it('persists the board preference per project', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    fireEvent.click(screen.getByRole('button', { name: /^board$/i }))
    expect(localStorage.getItem('taskflow.view.5')).toBe('board')
  })
})

describe('Board view — "Moving a task on the board persists status and order"', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('taskflow.view.5', 'board')
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('move control calls PATCH /tasks/{id}/move and reloads', async () => {
    const moved = { ...TASKS[0], status: 'done', position: 1 }
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const routes: Record<string, unknown> = {
        '/auth/me': USER,
        '/workspaces': [WORKSPACE],
        '/projects/5': PROJECT_5,
        '/projects/5/tasks': TASKS,
        '/workspaces/1/members': MEMBERS,
      }
      if (url === '/tasks/11/move' && init?.method === 'PATCH') {
        return Promise.resolve(
          jsonResponse({ task: moved, column: [TASKS[1], moved] }, 200),
        )
      }
      if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    })
    vi.stubGlobal('fetch', fetchMock)
    setSession({ token: 'test-token', user: USER })
    render(
      <MemoryRouter initialEntries={['/projects/5']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByText('Write copy')
    // open the move control on the todo task and move it to done
    const card = screen.getByText('Write copy').closest('li')!
    fireEvent.click(card.querySelector('button')!)
    const statusSelect = await screen.findByLabelText(/move to status/i)
    fireEvent.change(statusSelect, { target: { value: 'done' } })
    const form = card.querySelector('form.move-form') as HTMLElement
    fireEvent.click(within(form).getByRole('button', { name: /^move$/i }))
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) =>
            String(u) === '/tasks/11/move' &&
            i?.method === 'PATCH' &&
            JSON.parse(String(i.body)).status === 'done',
        ),
      ).toBe(true),
    )
  })
})

describe('Polish — "Loading and error states are handled"', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('projects page shows an error alert with retry when the request fails', async () => {
    mockApi({ '/workspaces/1/projects': { __status: 500, message: 'boom' } })
    // mockApi stores bodies; emulate failure by wrapping fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/workspaces/1/projects')
          return Promise.resolve(jsonResponse({ message: 'boom' }, 500))
        const routes: Record<string, unknown> = {
          '/auth/me': USER,
          '/workspaces': [WORKSPACE],
        }
        if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
        return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
      }),
    )
    renderAt('/projects')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('boom')
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('project detail shows an error alert with retry when the project fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/projects/5')
          return Promise.resolve(jsonResponse({ message: 'nope' }, 500))
        const routes: Record<string, unknown> = {
          '/auth/me': USER,
          '/workspaces': [WORKSPACE],
        }
        if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
        return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
      }),
    )
    renderAt('/projects/5')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('nope')
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })

  it('exposes a status region while data loads', async () => {
    let resolveProjects: (v: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/workspaces/1/projects')
          return new Promise<Response>((res) => {
            resolveProjects = res
          })
        const routes: Record<string, unknown> = {
          '/auth/me': USER,
          '/workspaces': [WORKSPACE],
        }
        if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
        return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
      }),
    )
    renderAt('/projects')
    const status = await screen.findByRole('status')
    expect(status.textContent).toMatch(/loading/i)
    resolveProjects(jsonResponse(PROJECTS))
    await screen.findByText('Website redesign')
  })
})

describe('Polish — "New screens meet the accessibility bar"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('board cards expose a Move control — the keyboard path for drag', async () => {
    localStorage.setItem('taskflow.view.5', 'board')
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    const card = screen.getByText('Write copy').closest('li')!
    expect(within(card as HTMLElement).getByRole('button', { name: /^move$/i })).toBeTruthy()
  })

  it('view toggle buttons expose pressed state', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    const listBtn = screen.getByRole('button', { name: /^list$/i })
    const boardBtn = screen.getByRole('button', { name: /^board$/i })
    expect(listBtn.getAttribute('aria-pressed')).toBe('true')
    expect(boardBtn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(boardBtn)
    expect(boardBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('every button on the projects screens has an accessible name', async () => {
    const { container } = renderAt('/projects')
    await screen.findByText('Website redesign')
    for (const btn of Array.from(container.querySelectorAll('button'))) {
      const name =
        btn.getAttribute('aria-label') ??
        btn.textContent?.trim() ??
        btn.getAttribute('title')
      expect(name, `button without accessible name: ${btn.outerHTML.slice(0, 80)}`).toBeTruthy()
    }
  })
})
