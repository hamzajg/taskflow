import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
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

const PROJECT_5 = {
  id: 5,
  workspaceId: 1,
  name: 'Website redesign',
  description: 'New marketing site',
  color: null,
  taskCount: 2,
  createdAt: '2026-11-18T00:00:00Z',
}

const TASK_11 = {
  id: 11,
  projectId: 5,
  title: 'Write copy',
  description: 'Hero + pricing page copy',
  status: 'todo',
  priority: 'high',
  assigneeId: 1,
  assigneeName: 'Demo User',
  dueDate: '2026-12-01',
  position: 0,
  createdAt: '2026-11-18T00:00:00Z',
}

const TASK_12 = {
  ...TASK_11,
  id: 12,
  title: 'Ship landing page',
  status: 'done',
  priority: 'medium',
  description: null,
  dueDate: null,
}

const COMMENTS = {
  comments: [
    {
      id: 1,
      taskId: 11,
      authorId: 1,
      authorName: 'Demo User',
      body: 'First pass done',
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    },
  ],
  hasMore: false,
}

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
    '/workspaces/1/projects': [PROJECT_5],
    '/projects/5': PROJECT_5,
    '/projects/5/tasks': [TASK_11, TASK_12],
    '/workspaces/1/members': [
      { userId: 1, displayName: 'Demo User', email: 'demo@taskflow.local', role: 'owner' },
    ],
    '/tasks/11': TASK_11,
    '/tasks/12': TASK_12,
    '/tasks/11/comments': COMMENTS,
    '/tasks/12/comments': { comments: [], hasMore: false },
    ...overrides,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'POST' && url === '/tasks/11/comments') {
        return Promise.resolve(
          jsonResponse({
            id: 2,
            taskId: 11,
            authorId: 1,
            authorName: 'Demo User',
            body: JSON.parse(String(init.body)).body,
            createdAt: '2026-11-19T10:00:00Z',
            updatedAt: '2026-11-19T10:00:00Z',
          }, 201),
        )
      }
      if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    }),
  )
}

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname + loc.search}</div>
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

function loc() {
  return screen.getByTestId('loc').textContent
}

async function openListView() {
  await screen.findByRole('link', { name: 'Website redesign' })
  fireEvent.click(screen.getByRole('link', { name: 'Website redesign' }))
  await screen.findByRole('link', { name: 'Write copy' })
}

describe('Task drawer — "Task title opens the drawer from list view" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('clicking a task title opens the drawer and keeps the page mounted', async () => {
    renderAt('/projects')
    await openListView()
    const link = screen.getByRole('link', { name: 'Write copy' })
    expect(link.getAttribute('href')).toBe('/tasks/11')
    fireEvent.click(link)
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('Write copy')
    // project page still mounted behind the overlay
    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy()
    // URL carries the drawer state
    expect(loc()).toBe('/projects/5?task=11')
  })

  it('board card title opens the same drawer', async () => {
    renderAt('/projects')
    await openListView()
    fireEvent.click(screen.getByRole('button', { name: 'Board' }))
    const link = await screen.findByRole('link', { name: 'Write copy' })
    fireEvent.click(link)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect((await screen.findAllByText('Write copy')).length).toBeGreaterThan(0)
  })
})

describe('Task drawer — "Drawer shows fields and comment thread" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders task fields and the shared comment thread', async () => {
    renderAt('/projects/5?task=11')
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('Hero + pricing page copy')
    expect(dialog.textContent).toContain('high')
    expect(dialog.textContent).toContain('Demo User')
    expect(await screen.findByText('First pass done')).toBeTruthy()
    // posting works through the shared thread
    fireEvent.change(screen.getByLabelText(/add a comment/i), {
      target: { value: 'Looks good' },
    })
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }))
    expect(await screen.findByText('Looks good')).toBeTruthy()
  })
})

describe('Task drawer — "Drawer state lives in the URL" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('deep link with ?task= opens the drawer directly', async () => {
    renderAt('/projects/5?task=11')
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect((await screen.findAllByText('Write copy')).length).toBeGreaterThan(0)
  })

  it('closing removes the task param', async () => {
    renderAt('/projects/5?task=11')
    await screen.findByRole('dialog')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(loc()).toBe('/projects/5')
  })
})

describe('Task drawer — "Drawer dismisses via escape, overlay and close button" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('Escape closes and returns focus to the invoking link', async () => {
    renderAt('/projects')
    await openListView()
    const link = screen.getByRole('link', { name: 'Write copy' })
    link.focus()
    fireEvent.click(link)
    await screen.findByRole('dialog')
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(link)
  })

  it('overlay click closes the drawer', async () => {
    renderAt('/projects/5?task=11')
    await screen.findByRole('dialog')
    fireEvent.click(document.querySelector('.drawer-overlay')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('close button dismisses the drawer', async () => {
    renderAt('/projects/5?task=11')
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog as HTMLElement).getByRole('button', { name: /close/i }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('Task drawer — "Task links keep native navigation semantics" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('keeps href and only intercepts plain clicks', async () => {
    renderAt('/projects')
    await openListView()
    const link = screen.getByRole('link', { name: 'Write copy' })
    expect(link.getAttribute('href')).toBe('/tasks/11')
    // ctrl+click must NOT open the drawer — native navigation semantics
    fireEvent.click(link, { ctrlKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(link, { metaKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
    // plain click opens it
    fireEvent.click(link)
    expect(await screen.findByRole('dialog')).toBeTruthy()
  })
})

describe('Task drawer — "Board drag-and-drop still works" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('board cards keep href links and the Move control', async () => {
    renderAt('/projects')
    await openListView()
    fireEvent.click(screen.getByRole('button', { name: 'Board' }))
    const link = await screen.findByRole('link', { name: 'Write copy' })
    expect(link.getAttribute('href')).toBe('/tasks/11')
    // keyboard-accessible move path still present on every card
    const moveButtons = screen.getAllByRole('button', { name: 'Move' })
    expect(moveButtons.length).toBeGreaterThan(0)
    // card is still a drag source
    const card = link.closest('.board-card') as HTMLElement
    expect(card.getAttribute('draggable')).toBe('true')
  })
})

describe('Task drawer — "Detail page still works standalone" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('direct /tasks/:id visit renders fields and comments without a drawer', async () => {
    renderAt('/tasks/11')
    expect(await screen.findByText('First pass done')).toBeTruthy()
    expect(screen.getByText('Hero + pricing page copy')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    // shared thread: posting works on the standalone page too
    fireEvent.change(screen.getByLabelText(/add a comment/i), {
      target: { value: 'Standalone comment' },
    })
    fireEvent.click(screen.getByRole('button', { name: /post comment/i }))
    expect(await screen.findByText('Standalone comment')).toBeTruthy()
  })
})

describe('Task drawer — "Open full page reaches the canonical detail view" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('navigates to /tasks/:id showing the same task and comments', async () => {
    renderAt('/projects/5?task=11')
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('link', { name: /open full page/i }))
    await waitFor(() => expect(loc()).toBe('/tasks/11'))
    expect(await screen.findByText('First pass done')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    // canonical detail page header (PageHeader back-link), not the drawer
    expect(screen.getByRole('link', { name: /website redesign/i })).toBeTruthy()
  })
})
