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

const PROJECT = {
  id: 5,
  workspaceId: 1,
  name: 'Website redesign',
  description: 'New marketing site',
  color: null,
  taskCount: 2,
  createdAt: '2026-11-18T00:00:00Z',
}

const TASK = {
  id: 11,
  projectId: 5,
  title: 'Write launch copy',
  description: 'Hero, pricing, FAQ',
  status: 'in_progress',
  priority: 'high',
  assigneeId: 2,
  assigneeName: 'Mem Ber',
  dueDate: '2026-12-01',
  position: 0,
  createdAt: '2026-11-18T00:00:00Z',
}

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

interface MockState {
  comments: typeof COMMENTS
}

function mockApi(state: MockState = { comments: [...COMMENTS] }) {
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces': [WORKSPACE],
    '/projects/5': PROJECT,
    '/tasks/11': TASK,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/tasks/11/comments' && method === 'GET') {
        return Promise.resolve(jsonResponse({ comments: state.comments, hasMore: false }))
      }
      if (url === '/tasks/11/comments' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as { body: string }
        const created = {
          id: 99,
          taskId: 11,
          authorId: USER.id,
          authorName: 'Demo User',
          body: body.body,
          createdAt: '2026-11-18T12:00:00Z',
          updatedAt: '2026-11-18T12:00:00Z',
        }
        state.comments = [...state.comments, created]
        return Promise.resolve(jsonResponse(created, 201))
      }
      const patchMatch = url.match(/^\/comments\/(\d+)$/)
      if (patchMatch && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as { body: string }
        state.comments = state.comments.map((c) =>
          c.id === Number(patchMatch[1]) ? { ...c, body: body.body } : c,
        )
        return Promise.resolve(
          jsonResponse(state.comments.find((c) => c.id === Number(patchMatch[1]))),
        )
      }
      const delMatch = url.match(/^\/comments\/(\d+)$/)
      if (delMatch && method === 'DELETE') {
        state.comments = state.comments.filter((c) => c.id !== Number(delMatch[1]))
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (url in routes) return Promise.resolve(jsonResponse(routes[url]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    }),
  )
  return state
}

function renderAt(path: string) {
  setSession({ token: 'test-token', user: USER })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Task detail — "Task detail shows all fields and links back to the project"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows every task field and a link back to the project', async () => {
    renderAt('/tasks/11')
    expect(await screen.findByText('Write launch copy')).toBeTruthy()
    expect(screen.getByText('Hero, pricing, FAQ')).toBeTruthy()
    expect(screen.getByText('In progress')).toBeTruthy()
    expect(screen.getByText('high')).toBeTruthy()
    expect(screen.getAllByText('Mem Ber').length).toBeGreaterThan(0)
    expect(screen.getByText(/2026-12-01/)).toBeTruthy()
    const back = screen.getByRole('link', { name: /Website redesign/ })
    expect(back.getAttribute('href')).toBe('/projects/5')
  })
})

describe('Task detail — "Comments thread renders and posting adds a comment"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders comments chronologically with author and timestamp', async () => {
    renderAt('/tasks/11')
    const first = await screen.findByText('Draft is in the doc')
    const second = screen.getByText('Looks good, ship it')
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByText('Mem Ber').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Demo User').length).toBeGreaterThan(1)
  })

  it('posts a new comment through the form and appends it to the thread', async () => {
    renderAt('/tasks/11')
    await screen.findByText('Draft is in the doc')
    fireEvent.change(screen.getByLabelText(/comment/i), {
      target: { value: 'Ship it Friday' },
    })
    fireEvent.click(screen.getByRole('button', { name: /post/i }))
    expect(await screen.findByText('Ship it Friday')).toBeTruthy()
  })

  it('lets the author edit and delete their own comment', async () => {
    renderAt('/tasks/11')
    await screen.findByText('Looks good, ship it')
    const own = screen.getByText('Looks good, ship it').closest('li')!
    fireEvent.click(within(own as HTMLElement).getByRole('button', { name: /edit/i }))
    fireEvent.change(within(own as HTMLElement).getByLabelText(/comment/i), {
      target: { value: 'Looks great, ship it' },
    })
    fireEvent.click(within(own as HTMLElement).getByRole('button', { name: /save/i }))
    expect(await screen.findByText('Looks great, ship it')).toBeTruthy()

    const edited = screen.getByText('Looks great, ship it').closest('li')!
    fireEvent.click(within(edited as HTMLElement).getByRole('button', { name: /delete/i }))
    await waitFor(() =>
      expect(screen.queryByText('Looks great, ship it')).toBeNull(),
    )
  })
})

describe('Task detail — "Task with no comments shows an empty state"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ comments: [] })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('prompts to start the discussion without an error', async () => {
    renderAt('/tasks/11')
    expect(await screen.findByText(/no comments yet/i)).toBeTruthy()
    expect(screen.queryByText(/error/i)).toBeNull()
  })
})

describe('Task detail — "Loading and error states are handled"', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows an error alert with retry when the task fails to load', async () => {
    let fail = true
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url === '/tasks/11') {
          if (fail) {
            fail = false
            return Promise.resolve(
              jsonResponse({ message: 'boom' }, 500),
            )
          }
          return Promise.resolve(jsonResponse(TASK))
        }
        if (url === '/projects/5') return Promise.resolve(jsonResponse(PROJECT))
        if (url === '/tasks/11/comments') {
          return Promise.resolve(jsonResponse({ comments: [], hasMore: false }))
        }
        if (url === '/auth/me') return Promise.resolve(jsonResponse(USER))
        if (url === '/workspaces') return Promise.resolve(jsonResponse([WORKSPACE]))
        return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
      }),
    )
    renderAt('/tasks/11')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('boom')
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('Write launch copy')).toBeTruthy()
  })

  it('shows a loading indicator while the task is being fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    renderAt('/tasks/11')
    expect(await screen.findByRole('status')).toBeTruthy()
  })
})

describe('Task detail — "Detail and comments screens meet the accessibility bar"', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('labels every comment control and exposes the thread accessibly', async () => {
    renderAt('/tasks/11')
    await screen.findByText('Draft is in the doc')
    // post form: labelled textarea + named button
    expect(screen.getByLabelText(/add a comment/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /post comment/i })).toBeTruthy()
    // author controls on own comment only
    const own = screen.getByText('Looks good, ship it').closest('li') as HTMLElement
    expect(within(own).getByRole('button', { name: /^edit$/i })).toBeTruthy()
    expect(within(own).getByRole('button', { name: /^delete$/i })).toBeTruthy()
    const other = screen.getByText('Draft is in the doc').closest('li') as HTMLElement
    expect(within(other).queryByRole('button', { name: /^edit$/i })).toBeNull()
    // edit form exposes a labelled field when opened
    fireEvent.click(within(own).getByRole('button', { name: /^edit$/i }))
    expect(within(own).getByLabelText(/^comment$/i)).toBeTruthy()
    expect(within(own).getByRole('button', { name: /^save$/i })).toBeTruthy()
  })
})
