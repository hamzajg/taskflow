import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/auth/me') return Promise.resolve(jsonResponse(USER))
      if (url === '/workspaces') return Promise.resolve(jsonResponse(WORKSPACES))
      if (url === '/workspaces/1/summary')
        return Promise.resolve(jsonResponse({ projectCount: 0, memberCount: 1, tasksByStatus: {}, overdueCount: 0, dueSoonCount: 0, myOpenTaskCount: 0 }))
      if (url === '/workspaces/1/projects') return Promise.resolve(jsonResponse([]))
      if (url === '/workspaces/1/members')
        return Promise.resolve(jsonResponse([{ id: 1, userId: 1, email: USER.email, firstName: 'Demo', lastName: 'User', role: 'owner' }]))
      if (url === '/workspaces/1/invites') return Promise.resolve(jsonResponse([]))
      if (url === '/auth/profile' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body))
        return Promise.resolve(jsonResponse({ ...USER, ...body }))
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

describe('profile-page — "Profile page renders the profile form" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows first/last name fields and Save profile on /profile', async () => {
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByLabelText(/first name/i)).toBeTruthy()
    expect(screen.getByLabelText(/last name/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeTruthy()
  })
})

describe('profile-page — "Profile page has a dedicated title" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('header reads Profile and shows no workspace panel', async () => {
    renderAt('/profile')
    await screen.findByRole('heading', { name: 'Profile' })
    expect(screen.queryByRole('button', { name: 'New workspace' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Workspaces' })).toBeNull()
  })
})

describe('profile-page — "Account page shows no profile card" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('account shows Workspaces card only — no profile form', async () => {
    renderAt('/account')
    await screen.findByRole('button', { name: 'Acme' })
    expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull()
    expect(screen.queryByLabelText(/first name/i)).toBeNull()
  })
})

describe('profile-page — "Account page keeps workspace management" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('workspace name opens manage drawer and New workspace opens create drawer', async () => {
    renderAt('/account')
    fireEvent.click(await screen.findByRole('button', { name: 'Acme' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
  })
})

describe('profile-page — "Sidebar links to profile and workspaces routes" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('nav links point to /profile and /account with no hash', async () => {
    renderAt('/dashboard')
    const profile = await screen.findByRole('link', { name: /profile/i })
    const workspaces = screen.getByRole('link', { name: /workspaces/i })
    expect(profile.getAttribute('href')).toBe('/profile')
    expect(workspaces.getAttribute('href')).toBe('/account')
  })
})

describe('profile-page — "Saving profile from the dedicated page updates the shell user" (@w1)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('updated first name appears in the topbar without reload', async () => {
    renderAt('/profile')
    const first = await screen.findByLabelText(/first name/i)
    fireEvent.change(first, { target: { value: 'Renamed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    await screen.findByText('Profile updated.')
    await waitFor(() =>
      expect(screen.getAllByText(/Renamed/).length).toBeGreaterThan(0),
    )
  })
})
