import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
  taskCount: 1,
  tags: [],
  createdAt: '2026-11-18T00:00:00Z',
}

const TASK = {
  id: 11,
  projectId: 5,
  title: 'Write launch copy',
  description: null,
  status: 'in_progress',
  priority: 'high',
  assigneeId: null,
  assigneeName: null,
  dueDate: null,
  position: 0,
  totalMinutes: 75,
  createdAt: '2026-11-18T00:00:00Z',
}

function entry(partial: Partial<TimeEntryDto>): TimeEntryDto {
  return {
    id: 1,
    taskId: 11,
    taskTitle: 'Write launch copy',
    userId: 1,
    userName: 'Demo User',
    entryDate: '2026-11-19',
    minutes: 30,
    startedAt: null,
    endedAt: null,
    running: false,
    description: null,
    createdAt: '2026-11-19T09:00:00Z',
    ...partial,
  }
}

const ENTRIES: TimeEntryDto[] = [
  entry({ id: 1, minutes: 45, description: 'Hero copy', userName: 'Demo User' }),
  entry({
    id: 2,
    minutes: 30,
    userId: 2,
    userName: 'Mem Ber',
    entryDate: '2026-11-18',
  }),
]

interface MockState {
  entries: TimeEntryDto[]
  running: TimeEntryDto | null
  role: string
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
      if (url === '/projects/5') return Promise.resolve(jsonResponse(PROJECT))
      if (url === '/tasks/11' && method === 'GET') {
        return Promise.resolve(jsonResponse(TASK))
      }
      if (url === '/tasks/11/comments') {
        return Promise.resolve(jsonResponse({ comments: [], hasMore: false }))
      }
      if (url === '/tasks/11/time-entries' && method === 'GET') {
        return Promise.resolve(
          jsonResponse({ entries: state.entries, running: state.running }),
        )
      }
      if (url === '/tasks/11/time-entries' && method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        const created = entry({
          id: 99,
          entryDate: String(body.entryDate),
          minutes: Number(body.minutes),
          description: (body.description as string) ?? null,
        })
        state.entries = [created, ...state.entries]
        return Promise.resolve(jsonResponse(created, 201))
      }
      if (url === '/tasks/11/time-entries/timer/start' && method === 'POST') {
        if (state.running) {
          return Promise.resolve(
            jsonResponse({ error: 'already running', taskId: state.running.taskId }, 409),
          )
        }
        const started = entry({
          id: 77,
          minutes: null,
          startedAt: new Date().toISOString(),
          running: true,
          description: null,
        })
        state.running = started
        state.entries = [started, ...state.entries]
        return Promise.resolve(jsonResponse(started, 201))
      }
      if (url === '/time-entries/timer/stop' && method === 'POST') {
        if (!state.running) {
          return Promise.resolve(jsonResponse({ error: 'no running timer' }, 409))
        }
        const stopped = { ...state.running, running: false, minutes: 12, endedAt: new Date().toISOString() }
        state.running = null
        state.entries = state.entries.map((e) => (e.id === stopped.id ? stopped : e))
        return Promise.resolve(jsonResponse(stopped))
      }
      if (url === '/time-entries/1' && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        state.entries = state.entries.map((e) =>
          e.id === 1
            ? {
                ...e,
                entryDate: String(body.entryDate ?? e.entryDate),
                minutes: Number(body.minutes ?? e.minutes),
                description: (body.description as string | null) ?? e.description,
              }
            : e,
        )
        return Promise.resolve(jsonResponse(state.entries.find((e) => e.id === 1)))
      }
      if (url === '/time-entries/1' && method === 'DELETE') {
        state.entries = state.entries.filter((e) => e.id !== 1)
        return Promise.resolve(new Response(null, { status: 204 }))
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

describe('Time tracking — "Time section lists entries and total on task detail" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ entries: ENTRIES.map((e) => ({ ...e })), running: null, role: 'owner' })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('lists entries with author, formats minutes, and shows the total', async () => {
    renderAt('/tasks/11')
    const section = await screen.findByRole('region', { name: /time tracking/i })
    expect(await within(section).findByText('45m')).toBeTruthy()
    expect(within(section).getByText('30m')).toBeTruthy()
    expect(within(section).getByText(/Hero copy/)).toBeTruthy()
    expect(within(section).getByText(/Mem Ber/)).toBeTruthy()
    // total from task DTO in the card header
    expect(screen.getByText('Total: 1h 15m')).toBeTruthy()
  })
})

describe('Time tracking — "Member logs time from the UI" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ entries: [], running: null, role: 'member' })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('submits the manual entry form and prepends the new entry', async () => {
    renderAt('/tasks/11')
    const section = await screen.findByRole('region', { name: /time tracking/i })
    expect(await within(section).findByText(/no time logged yet/i)).toBeTruthy()

    fireEvent.change(within(section).getByLabelText(/^minutes$/i), {
      target: { value: '45' },
    })
    fireEvent.change(within(section).getByLabelText(/^description$/i), {
      target: { value: 'Pairing session' },
    })
    fireEvent.click(within(section).getByRole('button', { name: /log time/i }))

    expect(await within(section).findByText(/Pairing session/)).toBeTruthy()
    expect(within(section).getByText('45m')).toBeTruthy()
  })
})

describe('Time tracking — "Timer controls run and stop from the UI" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({ entries: [], running: null, role: 'member' })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('starts a timer, shows elapsed state, then stops it into an entry', async () => {
    renderAt('/tasks/11')
    const section = await screen.findByRole('region', { name: /time tracking/i })

    fireEvent.click(within(section).getByRole('button', { name: /start timer/i }))
    expect(await within(section).findByText(/timer running/i)).toBeTruthy()
    expect(within(section).queryByRole('button', { name: /start timer/i })).toBeNull()

    fireEvent.click(within(section).getByRole('button', { name: /stop timer/i }))
    await waitFor(() =>
      expect(within(section).queryByText(/timer running/i)).toBeNull(),
    )
    expect(within(section).getByText('12m')).toBeTruthy()
    expect(within(section).getByRole('button', { name: /start timer/i })).toBeTruthy()
  })

  it('shows a running timer started on another task with a stop control', async () => {
    const other = entry({
      id: 50,
      taskId: 99,
      taskTitle: 'Other task',
      minutes: null,
      startedAt: new Date().toISOString(),
      running: true,
    })
    mockApi({ entries: [other], running: other, role: 'member' })
    renderAt('/tasks/11')
    const section = await screen.findByRole('region', { name: /time tracking/i })
    expect(await within(section).findByText(/timer running on other task/i)).toBeTruthy()
    expect(within(section).getByRole('button', { name: /stop timer/i })).toBeTruthy()
    // cannot start a second timer on this task
    expect(within(section).queryByRole('button', { name: /start timer/i })).toBeNull()
  })
})

describe('Time tracking — "Member sees own-entry controls only" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi({
      entries: ENTRIES.map((e) => ({ ...e })),
      running: null,
      role: 'member',
    })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('member can edit/delete own entries but not another member’s', async () => {
    renderAt('/tasks/11')
    const section = await screen.findByRole('region', { name: /time tracking/i })
    await within(section).findByText(/Hero copy/)

    const own = within(section).getByText(/Hero copy/).closest('li') as HTMLElement
    expect(
      within(own).getByRole('button', { name: 'Edit time entry by Demo User' }),
    ).toBeTruthy()
    expect(
      within(own).getByRole('button', { name: 'Delete time entry by Demo User' }),
    ).toBeTruthy()

    const other = within(section).getByText('30m').closest('li') as HTMLElement
    expect(
      within(other).queryByRole('button', { name: /edit time entry by/i }),
    ).toBeNull()
    expect(
      within(other).queryByRole('button', { name: /delete time entry by/i }),
    ).toBeNull()

    // edit flow updates minutes
    fireEvent.click(
      within(own).getByRole('button', { name: 'Edit time entry by Demo User' }),
    )
    fireEvent.change(within(own).getByLabelText(/^edit minutes$/i), {
      target: { value: '60' },
    })
    fireEvent.click(within(own).getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(within(own).getByText('1h')).toBeTruthy())
  })
})
