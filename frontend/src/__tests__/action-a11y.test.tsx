import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

const COMMENTS = [
  {
    id: 21,
    taskId: 11,
    authorId: 2,
    authorName: 'Mem Ber',
    body: 'Draft is in the doc',
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  },
  {
    id: 22,
    taskId: 11,
    authorId: 1,
    authorName: 'Demo User',
    body: 'Looks good, ship it',
    createdAt: '2026-11-18T11:00:00Z',
    updatedAt: '2026-11-18T11:00:00Z',
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi() {
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces': [WORKSPACE],
    '/workspaces/1/projects': [
      {
        id: 5,
        workspaceId: 1,
        name: 'Website redesign',
        description: null,
        color: null,
        taskCount: 2,
        createdAt: '2026-11-18T00:00:00Z',
      },
    ],
    '/projects/5': {
      id: 5,
      workspaceId: 1,
      name: 'Website redesign',
      description: null,
      color: null,
      taskCount: 2,
      createdAt: '2026-11-18T00:00:00Z',
    },
    '/projects/5/tasks': TASKS,
    '/workspaces/1/members': [
      { userId: 1, displayName: 'Demo User', email: USER.email, role: 'owner' },
      { userId: 2, displayName: 'Mem Ber', email: 'mem@taskflow.local', role: 'member' },
    ],
    '/tasks/11': { ...TASKS[0], projectName: 'Website redesign' },
    '/tasks/11/comments': { comments: COMMENTS, hasMore: false },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && url in routes) {
        return Promise.resolve(jsonResponse(routes[url]))
      }
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

describe('action-a11y — "Task list actions name their task" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('Edit/Delete buttons carry the task title; two tasks differ', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    expect(
      screen.getByRole('button', { name: 'Edit "Write copy"' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Delete "Write copy"' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Edit "Ship landing page"' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Delete "Ship landing page"' }),
    ).toBeTruthy()
  })
})

describe('action-a11y — "Board move control names its task" (@w1)', () => {
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

  it('Move toggle carries the card task title', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    expect(
      screen.getByRole('button', { name: 'Move "Write copy"' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Move "Ship landing page"' }),
    ).toBeTruthy()
  })
})

describe('action-a11y — "Comment actions name their author" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('comment Edit/Delete identify the author', async () => {
    renderAt('/tasks/11')
    await screen.findByText('Looks good, ship it')
    const own = screen.getByText('Looks good, ship it').closest('li') as HTMLElement
    expect(
      within(own).getByRole('button', { name: 'Edit comment by Demo User' }),
    ).toBeTruthy()
    expect(
      within(own).getByRole('button', { name: 'Delete comment by Demo User' }),
    ).toBeTruthy()
  })
})

describe('action-a11y — "Inline edit actions stay scoped" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('edit form keeps Save/Cancel names; row labels disappear', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    fireEvent.click(screen.getByRole('button', { name: 'Edit "Write copy"' }))
    const row = screen.getByDisplayValue('Write copy').closest('li') as HTMLElement
    expect(within(row).getByRole('button', { name: 'Save' })).toBeTruthy()
    expect(within(row).getByRole('button', { name: 'Cancel' })).toBeTruthy()
    expect(within(row).queryByRole('button', { name: /Edit "/ })).toBeNull()
    expect(within(row).queryByRole('button', { name: /Delete "/ })).toBeNull()
  })
})

describe('action-a11y — "Projects page shows one Projects heading" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('exactly one heading reads Projects; card carries a distinct title', async () => {
    renderAt('/projects')
    await screen.findByText('Website redesign')
    const headings = screen.getAllByRole('heading', { name: 'Projects' })
    expect(headings).toHaveLength(1)
    expect(headings[0].tagName).toBe('H1')
    expect(screen.getByRole('heading', { name: 'All projects' })).toBeTruthy()
  })
})

describe('action-a11y — "Member remove action names the member" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('Remove button in the workspace drawer names the member', async () => {
    renderAt('/account')
    fireEvent.click(await screen.findByRole('button', { name: 'Acme' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(
      await screen.findByRole('button', { name: 'Remove Mem Ber' }),
    ).toBeTruthy()
    // owner row has no Remove (role gate preserved)
    expect(
      screen.queryByRole('button', { name: 'Remove Demo User' }),
    ).toBeNull()
  })
})

describe('action-a11y — "Action labels work in both themes" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('accessible names are identical in light and dark themes', async () => {
    for (const theme of ['light', 'dark']) {
      localStorage.setItem('tf-theme', theme)
      const { unmount } = renderAt('/projects/5')
      await screen.findByText('Write copy')
      expect(
        screen.getByRole('button', { name: 'Edit "Write copy"' }),
      ).toBeTruthy()
      expect(
        screen.getByRole('button', { name: 'Delete "Write copy"' }),
      ).toBeTruthy()
      unmount()
    }
  })
})
