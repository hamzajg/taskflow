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
      if (url === '/workspaces') return Promise.resolve(jsonResponse([]))
      return Promise.resolve(jsonResponse({ message: 'not found' }, 404))
    }),
  )
}

function renderAuthed() {
  setSession({ token: 'test-token', user: USER })
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Authenticated pages render inside the app shell', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('renders sidebar navigation and top bar around page content', async () => {
    const { container } = renderAuthed()
    expect(await screen.findByText('Welcome, Demo')).toBeTruthy()
    expect(container.querySelector('.sidebar')).toBeTruthy()
    expect(container.querySelector('.topbar')).toBeTruthy()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Workspaces').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0)
  })

  it('Existing flows still work inside the shell', async () => {
    renderAuthed()
    expect(await screen.findByText('Welcome, Demo')).toBeTruthy()
    expect(screen.getAllByText('Workspaces').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0)
    expect(screen.getByText('Save profile')).toBeTruthy()
  })

  it('collapse control toggles the mobile drawer state', async () => {
    const { container } = renderAuthed()
    await screen.findByText('Welcome, Demo')
    const toggle = screen.getByLabelText('Open navigation')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(container.querySelector('.sidebar')?.className).toContain('open'),
    )
    expect(screen.getByLabelText('Close navigation')).toBeTruthy()
  })
})

describe('Keyboard and assistive technology support', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('every button exposes an accessible name', async () => {
    const { container } = renderAuthed()
    await screen.findByText('Welcome, Demo')
    const buttons = Array.from(container.querySelectorAll('button'))
    expect(buttons.length).toBeGreaterThan(0)
    for (const btn of buttons) {
      const name =
        btn.getAttribute('aria-label') ??
        btn.textContent?.trim() ??
        btn.getAttribute('title')
      expect(name, `button "${btn.outerHTML.slice(0, 80)}" has no accessible name`).toBeTruthy()
    }
  })

  it('skip link targets the main content landmark', async () => {
    const { container } = renderAuthed()
    await screen.findByText('Welcome, Demo')
    const skip = container.querySelector('.skip-link') as HTMLAnchorElement
    expect(skip).toBeTruthy()
    expect(skip.getAttribute('href')).toBe('#main')
    expect(container.querySelector('main#main')).toBeTruthy()
  })
})
