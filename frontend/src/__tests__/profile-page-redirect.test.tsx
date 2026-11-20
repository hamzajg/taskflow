import { cleanup, render, screen } from '@testing-library/react'
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

const WORKSPACES = [{ id: 1, name: 'Acme', role: 'owner', memberCount: 3 }]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/auth/me') return Promise.resolve(jsonResponse(USER))
      if (url === '/workspaces') return Promise.resolve(jsonResponse(WORKSPACES))
      if (url === '/workspaces/1/projects') return Promise.resolve(jsonResponse([]))
      if (url === '/workspaces/1/members')
        return Promise.resolve(jsonResponse([]))
      if (url === '/workspaces/1/invites') return Promise.resolve(jsonResponse([]))
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

describe('profile-page — "Legacy account profile anchor redirects to profile page" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('/account#profile lands on /profile with the form visible', async () => {
    renderAt('/account#profile')
    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByLabelText(/first name/i)).toBeTruthy()
    // No workspace admin on the profile page.
    expect(screen.queryByRole('button', { name: 'New workspace' })).toBeNull()
  })
})

describe('profile-page — "Account workspaces anchor still lands on the section" (@w2)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('/account#workspaces stays on account with Workspaces visible', async () => {
    renderAt('/account#workspaces')
    expect((await screen.findAllByRole('heading', { name: 'Workspaces' })).length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: 'Acme' })).toBeTruthy()
    expect(document.getElementById('workspaces')).toBeTruthy()
  })

  it('/account without hash renders workspaces normally', async () => {
    renderAt('/account')
    expect((await screen.findAllByRole('heading', { name: 'Workspaces' })).length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: 'Acme' })).toBeTruthy()
  })
})
