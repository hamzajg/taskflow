import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { setSession, User } from '../auth'
import { TagDto } from '../pages/projectTypes'

const USER: User = {
  id: 1,
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@taskflow.local',
  verified: true,
}

const OWNER_WS = { id: 1, name: 'Acme', role: 'owner', memberCount: 2 }
const MEMBER_WS = { id: 1, name: 'Acme', role: 'member', memberCount: 2 }

const TAGS: TagDto[] = [
  { id: 7, title: 'Client X', color: '#3366ff' },
  { id: 8, title: 'Internal', color: '#22aa55' },
]

const PROJECTS = [
  {
    id: 5,
    workspaceId: 1,
    name: 'Website redesign',
    description: 'Main site',
    color: '#123456',
    taskCount: 2,
    tags: [TAGS[0]],
    createdAt: '2026-11-18T00:00:00Z',
  },
  {
    id: 6,
    workspaceId: 1,
    name: 'Mobile app',
    description: null,
    color: null,
    taskCount: 0,
    tags: [],
    createdAt: '2026-11-18T00:00:00Z',
  },
]

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
    dueDate: null,
    position: 0,
    createdAt: '2026-11-18T00:00:00Z',
  },
]

const MEMBERS = [
  { userId: 1, displayName: 'Demo User', email: USER.email, role: 'owner' },
  { userId: 2, displayName: 'Mem Ber', email: 'mem@taskflow.local', role: 'member' },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface MockState {
  tags: TagDto[]
  projects: (typeof PROJECTS)[number][]
  posts: { url: string; body: unknown }[]
  puts: { url: string; body: unknown }[]
  deletes: string[]
}

function mockApi(workspace: typeof OWNER_WS = OWNER_WS) {
  const state: MockState = {
    tags: [...TAGS],
    projects: PROJECTS.map((p) => ({ ...p, tags: [...p.tags] })),
    posts: [],
    puts: [],
    deletes: [],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : null

      if (method === 'GET' && url === '/auth/me') return Promise.resolve(jsonResponse(USER))
      if (method === 'GET' && url === '/workspaces') return Promise.resolve(jsonResponse([workspace]))
      if (method === 'GET' && url === '/workspaces/1/members') return Promise.resolve(jsonResponse(MEMBERS))
      if (method === 'GET' && url === '/workspaces/1/tags') return Promise.resolve(jsonResponse(state.tags))
      if (method === 'GET' && url === '/workspaces/1/projects') return Promise.resolve(jsonResponse(state.projects))
      if (method === 'GET' && url === '/projects/5/tasks') return Promise.resolve(jsonResponse(TASKS))
      if (method === 'GET' && url === '/projects/5') {
        const p = state.projects.find((x) => x.id === 5)!
        return Promise.resolve(jsonResponse(p))
      }
      if (method === 'POST' && url === '/workspaces/1/tags') {
        state.posts.push({ url, body })
        const tag: TagDto = {
          id: 90 + state.tags.length,
          title: body.title,
          color: body.color ?? null,
        }
        state.tags.push(tag)
        return Promise.resolve(jsonResponse(tag, 201))
      }
      const tagMatch = url.match(/^\/workspaces\/1\/tags\/(\d+)$/)
      if (tagMatch && method === 'PUT') {
        state.puts.push({ url, body })
        const id = Number(tagMatch[1])
        const t = state.tags.find((x) => x.id === id)!
        if (body.title !== undefined) t.title = body.title
        if (body.color !== undefined) t.color = body.color
        return Promise.resolve(jsonResponse(t))
      }
      if (tagMatch && method === 'DELETE') {
        state.deletes.push(url)
        const id = Number(tagMatch[1])
        state.tags = state.tags.filter((x) => x.id !== id)
        state.projects.forEach((p) => {
          p.tags = p.tags.filter((t) => t.id !== id)
        })
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      const projMatch = url.match(/^\/workspaces\/1\/projects\/(\d+)$/)
      if (projMatch && method === 'PUT') {
        state.puts.push({ url, body })
        const p = state.projects.find((x) => x.id === Number(projMatch[1]))!
        if (body.name !== undefined) p.name = body.name
        if (body.description !== undefined) p.description = body.description
        if (body.color !== undefined) p.color = body.color
        if (body.tagIds !== undefined) {
          p.tags = state.tags.filter((t) => body.tagIds.includes(t.id))
        }
        return Promise.resolve(jsonResponse(p))
      }
      if (method === 'POST' && url === '/workspaces/1/projects') {
        state.posts.push({ url, body })
        const p = {
          id: 50,
          workspaceId: 1,
          name: body.name,
          description: body.description ?? null,
          color: body.color ?? null,
          taskCount: 0,
          tags: state.tags.filter((t) => (body.tagIds ?? []).includes(t.id)),
          createdAt: '2026-11-20T00:00:00Z',
        }
        state.projects.push(p as never)
        return Promise.resolve(jsonResponse(p, 201))
      }
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

describe('project-tags — "Project cards show tag badges" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('project cards render their tags as badges', async () => {
    renderAt('/projects')
    await screen.findByText('Website redesign')
    const card = screen.getByText('Website redesign').closest('li')!
    expect(within(card).getByText('Client X')).toBeTruthy()
    // untagged project shows no badges
    const other = screen.getByText('Mobile app').closest('li')!
    expect(within(other).queryByText('Client X')).toBeNull()
    expect(within(other).queryByText('Internal')).toBeNull()
  })

  it('project detail header shows tag badges', async () => {
    renderAt('/projects/5')
    await screen.findByText('Write copy')
    expect(screen.getAllByText('Client X').length).toBeGreaterThan(0)
  })
})

describe('project-tags — "Manage tags from the projects page" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('opens the tags drawer, creates a tag, and deletes one', async () => {
    const state = mockApi()
    renderAt('/projects')
    await screen.findByText('Website redesign')

    fireEvent.click(screen.getByRole('button', { name: 'Tags' }))
    const dialog = await screen.findByRole('dialog')
    expect(
      (within(dialog).getByLabelText('Rename Client X') as HTMLInputElement).value,
    ).toBe('Client X')
    expect(
      (within(dialog).getByLabelText('Rename Internal') as HTMLInputElement).value,
    ).toBe('Internal')

    // create
    fireEvent.change(within(dialog).getByLabelText('Tag title'), {
      target: { value: 'Urgent' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add tag' }))
    await waitFor(() =>
      expect(state.tags.some((t) => t.title === 'Urgent')).toBe(true),
    )
    await waitFor(() =>
      expect(
        (within(dialog).getByLabelText('Rename Urgent') as HTMLInputElement).value,
      ).toBe('Urgent'),
    )

    // delete
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Internal' }))
    // two-step confirm
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete Internal' }))
    await waitFor(() =>
      expect(state.deletes.some((u) => u.endsWith('/tags/8'))).toBe(true),
    )
    await waitFor(() =>
      expect(within(dialog).queryByLabelText('Rename Internal')).toBeNull(),
    )
  })

  it('members see the tag list but no mutation controls', async () => {
    mockApi(MEMBER_WS)
    renderAt('/projects')
    await screen.findByText('Website redesign')
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Client X')).toBeTruthy()
    expect(within(dialog).queryByLabelText('Tag title')).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /Delete/ })).toBeNull()
  })
})

describe('project-tags — "Filter projects by tag" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('filter chips narrow the project list and restore it', async () => {
    renderAt('/projects')
    await screen.findByText('Website redesign')
    expect(screen.getByText('Mobile app')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Client X' }))
    await waitFor(() => expect(screen.queryByText('Mobile app')).toBeNull())
    expect(screen.getByText('Website redesign')).toBeTruthy()

    // second distinct tag chip also filters
    fireEvent.click(screen.getByRole('button', { name: 'Internal' }))
    await waitFor(() => expect(screen.queryByText('Website redesign')).toBeNull())

    // "All" restores
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    await waitFor(() => {
      expect(screen.getByText('Website redesign')).toBeTruthy()
      expect(screen.getByText('Mobile app')).toBeTruthy()
    })
  })
})

describe('project-tags — "Assign tags in the project drawer" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('create drawer submits selected tagIds', async () => {
    const state = mockApi()
    renderAt('/projects')
    await screen.findByText('Website redesign')
    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Tagged project' },
    })
    fireEvent.click(within(dialog).getByLabelText('Internal'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create project' }))

    await waitFor(() =>
      expect(
        state.posts.some(
          (p) =>
            p.url === '/workspaces/1/projects' &&
            (p.body as { tagIds?: number[] }).tagIds?.includes(8),
        ),
      ).toBe(true),
    )
  })
})

describe('project-tags — "Edit a project and update its tags" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('edit drawer pre-fills fields and PUTs tagIds', async () => {
    const state = mockApi()
    renderAt('/projects/5')
    await screen.findByText('Write copy')

    fireEvent.click(screen.getByRole('button', { name: 'Edit project' }))
    const dialog = await screen.findByRole('dialog')

    // pre-filled
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe(
      'Website redesign',
    )
    // currently tagged: Client X checked, Internal unchecked
    expect((within(dialog).getByLabelText('Client X') as HTMLInputElement).checked).toBe(true)
    expect((within(dialog).getByLabelText('Internal') as HTMLInputElement).checked).toBe(false)

    // swap tags: uncheck Client X, check Internal
    fireEvent.click(within(dialog).getByLabelText('Client X'))
    fireEvent.click(within(dialog).getByLabelText('Internal'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save project' }))

    await waitFor(() =>
      expect(
        state.puts.some(
          (p) =>
            p.url === '/workspaces/1/projects/5' &&
            JSON.stringify((p.body as { tagIds?: number[] }).tagIds) === '[8]',
        ),
      ).toBe(true),
    )
  })
})
