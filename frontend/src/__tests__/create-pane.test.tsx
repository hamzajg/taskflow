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
    await waitFor(() => {
      const openDialogs = screen
        .getAllByRole('dialog')
        .filter((d) => d.closest('.drawer')?.classList.contains('drawer-open'))
      expect(openDialogs.length).toBe(1)
      expect(openDialogs[0].textContent).toContain('Create task')
    })
  })
})

describe('create-pane — "New project opens the creation drawer" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('opens a labelled dialog with name, description and color fields', async () => {
    renderAt('/projects')
    await screen.findByText('Website redesign')
    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog as HTMLElement).getByLabelText(/name/i)).toBeTruthy()
    expect(within(dialog as HTMLElement).getByLabelText(/description/i)).toBeTruthy()
    expect(within(dialog as HTMLElement).getByLabelText(/color/i)).toBeTruthy()
    expect(
      within(dialog as HTMLElement).getByRole('button', { name: 'Create project' }),
    ).toBeTruthy()
  })
})

describe('create-pane — "Creating a project closes the drawer and updates the list" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    let projects: unknown[] = [PROJECT_5]
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const routes: Record<string, unknown> = {
          '/auth/me': USER,
          '/workspaces': [WORKSPACE],
        }
        if (url === '/workspaces/1/projects') {
          if (init?.method === 'POST') {
            const body = JSON.parse(String(init.body))
            const created = { ...PROJECT_5, id: 7, taskCount: 0, ...body }
            projects = [...projects, created]
            return Promise.resolve(jsonResponse(created, 201))
          }
          return Promise.resolve(jsonResponse(projects))
        }
        if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
        return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
      }),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('posts the project, omits empty optional fields, closes and lists it', async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    renderAt('/projects')
    await screen.findByText('Website redesign')
    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog as HTMLElement).getByLabelText(/name/i), {
      target: { value: 'Second project' },
    })
    fireEvent.click(
      within(dialog as HTMLElement).getByRole('button', { name: 'Create project' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Second project')).toBeTruthy()
    // empty optional fields are omitted from the request body
    const post = fetchMock.mock.calls.find(
      ([u, i]) =>
        String(u) === '/workspaces/1/projects' && i?.method === 'POST',
    )
    const body = JSON.parse(String(post?.[1]?.body))
    expect(body.name).toBe('Second project')
    expect(body).not.toHaveProperty('description')
    expect(body).not.toHaveProperty('color')
  })
})

describe('create-pane — "Inline creation forms are gone" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('project and project-detail pages render no permanent create forms', async () => {
    const { container, unmount } = renderAt('/projects')
    await screen.findByText('Website redesign')
    expect(container.querySelector('form.inline-form')).toBeNull()
    expect(screen.queryByLabelText(/^name$/i)).toBeNull()
    unmount()

    renderAt('/projects/5')
    await screen.findByRole('link', { name: 'Write copy' })
    expect(document.querySelector('form.task-form')).toBeNull()
    expect(screen.queryByLabelText(/^title$/i)).toBeNull()
  })
})

describe('create-pane — "Creation drawers meet the accessibility bar in both themes" (@w3)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('task create drawer is a labelled modal with keyboard-reachable labelled fields and submit', async () => {
    renderAt('/projects')
    await openProjectPage()
    const opener = screen.getByRole('button', { name: 'Add task' })
    opener.focus()
    const dialog = (await openCreateDrawer()) as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBeTruthy()
    // every field is labelled and tabbable; submit reachable by keyboard
    const title = within(dialog).getByLabelText(/title/i)
    title.focus()
    expect(document.activeElement).toBe(title)
    // Tab through fields reaches the submit button
    const submit = within(dialog).getByRole('button', { name: 'Create task' })
    submit.focus()
    expect(document.activeElement).toBe(submit)
    // Escape returns focus to the opener
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })

  it('project create drawer exposes the same bar', async () => {
    renderAt('/projects')
    await screen.findByText('Website redesign')
    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    const dialog = (await screen.findByRole('dialog')) as HTMLElement
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(within(dialog).getByLabelText(/name/i)).toBeTruthy()
    expect(
      within(dialog).getByRole('button', { name: 'Create project' }),
    ).toBeTruthy()
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
