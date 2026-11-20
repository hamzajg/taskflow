import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { clearSession, setSession, User } from '../auth'

const USER: User = {
  id: 1,
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@taskflow.local',
  verified: true,
}

const WORKSPACE = { id: 1, name: 'Acme', role: 'owner', memberCount: 2 }

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
    '/workspaces/1/projects': [],
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
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Landing page — "Guest sees the landing page at the root"', () => {
  beforeEach(() => {
    localStorage.clear()
    clearSession()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows headline, value props and register/login CTAs to guests', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy()
    expect(
      screen.getAllByRole('link', { name: /get started|sign up|register/i }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: /sign in|log in/i }).length,
    ).toBeGreaterThan(0)
  })

  it('redirects authenticated users from / to the dashboard', async () => {
    setSession({ token: 'test-token', user: USER })
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }),
    ).toBeTruthy()
    expect(screen.queryByRole('link', { name: /get started/i })).toBeNull()
  })

  it('redirects guests hitting /dashboard to login', async () => {
    renderAt('/dashboard')
    expect(await screen.findByLabelText(/email/i)).toBeTruthy()
  })
})

describe('Account page — "Account management remains reachable"', () => {
  beforeEach(() => {
    localStorage.clear()
    setSession({ token: 'test-token', user: USER })
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('keeps workspace management at /account and profile editing at /profile', async () => {
    renderAt('/account')
    expect((await screen.findAllByText('Acme')).length).toBeGreaterThan(0)
    expect(document.getElementById('workspaces')).toBeTruthy()
    expect(document.getElementById('profile')).toBeNull()
    expect(screen.queryByLabelText(/first name/i)).toBeNull()

    cleanup()
    renderAt('/profile')
    expect(await screen.findByLabelText(/first name/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeTruthy()
  })

  it('sidebar links point to dashboard, projects, account and profile', async () => {
    renderAt('/account')
    await screen.findAllByText('Acme')
    const nav = document.querySelector('.sidebar-nav')!
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/projects')
    expect(hrefs).toContain('/account')
    expect(hrefs).toContain('/profile')
  })
})
