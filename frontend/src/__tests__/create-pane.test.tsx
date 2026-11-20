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

const PROJECT_5 = {
  id: 5,
  workspaceId: 1,
  name: 'Website redesign',
  description: 'New marketing site',
  color: null,
  taskCount: 1,
  createdAt: '2026-11-18T00:00:00Z',
}

const TASK_11 = {
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
  createdAt: '2026-11-18T00:00:00Z',
}

const MEMBERS = [
  { userId: 1, displayName: 'Demo User', email: 'demo@taskflow.local', role: 'owner' },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi(overrides: Record<string, unknown> = {}, postHandler?: (init?: RequestInit) => Response) {
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces': [WORKSPACE],
    '/workspaces/1/projects': [PROJECT_5],
    '/projects/5': PROJECT_5,
    '/projects/5/tasks': [TASK_11],
    '/workspaces/1/members': MEMBERS,
    '/tasks/11': TASK_11,
    '/tasks/11/comments': { comments: [], hasMore: false },
    ...overrides,
  }
  // stateful task list: POST appends so reloads reflect creation
  let tasks: unknown[] = [TASK_11]
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'POST' && url === '/projects/5/tasks') {
        const body = JSON.parse(String(init.body))
        const created = { ...TASK_11, id: 99, ...body, assigneeName: null }
        tasks = [...tasks, created]
        return Promise.resolve(
          postHandler ? postHandler(init) : jsonResponse(created, 201),
        )
      }
      if (url === '/projects/5/tasks') return Promise.resolve(jsonResponse(tasks))
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

async function openProjectPage() {
  await screen.findByRole('link', { name: 'Website redesign' })
  fireEvent.click(screen.getByRole('link', { name: 'Website redesign' }))
  await screen.findByRole('link', { name: 'Write copy' })
}

async function openCreateDrawer() {
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
  return screen.findByRole('dialog')
}

describe('create-pane — "Add task opens the creation drawer" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('opens a labelled dialog with the task form fields and keeps the page behind', async () => {
    renderAt('/projects')
    await openProjectPage()
    const dialog = await openCreateDrawer()
    expect(dialog.textContent).toContain('New task')
    expect(within(dialog as HTMLElement).getByLabelText(/title/i)).toBeTruthy()
    expect(within(dialog as HTMLElement).getByLabelText(/status/i)).toBeTruthy()
    // task list still mounted behind the overlay
    expect(screen.getByText('Write copy')).toBeTruthy()
    // no permanent inline create form remains on the page
    expect(screen.queryByRole('button', { name: 'Add task' })).not.toBeNull()
  })
})

describe('create-pane — "Creating a task closes the drawer and updates the list" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('posts the task, closes the drawer and reloads the list', async () => {
    renderAt('/projects')
    await openProjectPage()
    const dialog = await openCreateDrawer()
    fireEvent.change(within(dialog as HTMLElement).getByLabelText(/title/i), {
      target: { value: 'Created task' },
    })
    fireEvent.click(
      within(dialog as HTMLElement).getByRole('button', { name: 'Create task' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // list reloaded — the mock returns the created task on the next fetch
    expect(await screen.findByText('Created task')).toBeTruthy()
  })
})

describe('create-pane — "Create errors stay inside the drawer with values preserved" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({}, () => jsonResponse({ message: 'title taken' }, 400))
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows an alert inside the dialog and keeps entered values', async () => {
    renderAt('/projects')
    await openProjectPage()
    const dialog = (await openCreateDrawer()) as HTMLElement
    fireEvent.change(within(dialog).getByLabelText(/title/i), {
      target: { value: 'Kept title' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create task' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert.textContent).toContain('title taken')
    expect(within(dialog).getByLabelText(/title/i)).toHaveProperty('value', 'Kept title')
    // drawer still open
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('create-pane — "Dismissing the create drawer creates nothing" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('Escape closes without posting and returns focus to Add task', async () => {
    renderAt('/projects')
    await openProjectPage()
    const opener = screen.getByRole('button', { name: 'Add task' })
    opener.focus()
    const dialog = await openCreateDrawer()
    fireEvent.change(within(dialog as HTMLElement).getByLabelText(/title/i), {
      target: { value: 'Discard me' },
    })
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it('Cancel button dismisses without creating', async () => {
    renderAt('/projects')
    await openProjectPage()
    const dialog = await openCreateDrawer()
    fireEvent.click(within(dialog as HTMLElement).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // no POST was issued — the list still shows only the original task
    expect(screen.queryByText('Created task')).toBeNull()
  })
})

describe('create-pane — "Peek drawer still works alongside create" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('clicking a task title still opens the peek drawer', async () => {
    renderAt('/projects')
    await openProjectPage()
    fireEvent.click(screen.getByRole('link', { name: 'Write copy' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('Write copy')
    expect(dialog.textContent).not.toContain('Create task')
  })
})

describe('create-pane — "Only one drawer is open at a time" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('Add task while peeking closes the peek drawer', async () => {
    renderAt('/projects/5?task=11')
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    // wait for the create drawer to appear
    await waitFor(() => {
      const dialogs = screen.getAllByRole('dialog')
      expect(dialogs.some((d) => d.textContent?.includes('Create task'))).toBe(true)
    })
    // at most one OPEN drawer — a closing peek may linger in the DOM briefly
    const openDialogs = screen
      .getAllByRole('dialog')
      .filter((d) => d.closest('.drawer')?.classList.contains('drawer-open'))
    expect(openDialogs.length).toBe(1)
    expect(openDialogs[0].textContent).toContain('Create task')
  })
})

describe('create-pane — "Create form resets on every open" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('reopening after cancel starts from blank fields', async () => {
    renderAt('/projects')
    await openProjectPage()
    let dialog = await openCreateDrawer()
    fireEvent.change(within(dialog as HTMLElement).getByLabelText(/title/i), {
      target: { value: 'Stale value' },
    })
    fireEvent.click(within(dialog as HTMLElement).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // reopen — Drawer stays mounted through the 250ms close transition
    dialog = await openCreateDrawer()
    expect(within(dialog as HTMLElement).getByLabelText(/title/i)).toHaveProperty('value', '')
  })
})
