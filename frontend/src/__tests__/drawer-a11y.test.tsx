import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import App from '../App'
import { setSession, User } from '../auth'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

const USER: User = {
  id: 1,
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@taskflow.local',
  verified: true,
}

const PROJECT_5 = {
  id: 5,
  workspaceId: 1,
  name: 'Website redesign',
  description: null,
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
  priority: 'high',
  assigneeId: 1,
  assigneeName: 'Demo User',
  dueDate: null,
  position: 0,
  createdAt: '2026-11-18T00:00:00Z',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockApi() {
  const routes: Record<string, unknown> = {
    '/auth/me': USER,
    '/workspaces': [{ id: 1, name: 'Acme', role: 'owner', memberCount: 2 }],
    '/workspaces/1/projects': [PROJECT_5],
    '/projects/5': PROJECT_5,
    '/projects/5/tasks': [TASK_11],
    '/workspaces/1/members': [],
    '/tasks/11': TASK_11,
    '/tasks/11/comments': { comments: [], hasMore: false },
    '/tasks/11/time-entries': { entries: [], running: null },
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
  setSession({ token: 'test-token', user: USER })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Drawer a11y — "Drawer meets the accessibility bar in both themes" (@w3)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    localStorage.clear()
    document.body.style.overflow = ''
  })

  it('is a labelled modal dialog and locks body scroll', async () => {
    renderAt('/projects/5?task=11')
    const dialog = await screen.findByRole('dialog', { name: 'Write copy' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    // scroll locked while open
    await waitFor(() =>
      expect(document.body.style.overflow).toBe('hidden'),
    )
    // scroll restored after close
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(document.body.style.overflow).not.toBe('hidden'),
    )
  })

  it('moves focus into the panel and traps Tab within it', async () => {
    renderAt('/projects/5?task=11')
    const dialog = (await screen.findByRole('dialog')) as HTMLElement
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    // wait for async content (task + comments + time) so the focusable count is stable
    await within(dialog).findByText('Open full page')

    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])',
    )
    expect(focusables.length).toBeGreaterThan(1)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    // Tab on the last element wraps to the first
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    // Shift+Tab on the first wraps to the last
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('all drawer controls are keyboard reachable and labelled', async () => {
    renderAt('/projects/5?task=11')
    const dialog = (await screen.findByRole('dialog')) as HTMLElement
    await screen.findByLabelText(/add a comment/i)
    expect(
      dialog.querySelector('button[aria-label="Close"]'),
    ).toBeTruthy()
    const openFull = screen.getByRole('link', { name: /open full page/i })
    openFull.focus()
    expect(document.activeElement).toBe(openFull)
  })
})

describe('Drawer a11y — "Slide transition respects reduced motion" (@w3)', () => {
  it('drawer styles disable the transition under prefers-reduced-motion', () => {
    const css = readFileSync(join(SRC, 'styles.css'), 'utf8')
    const block = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.drawer-panel\s*\{[^}]*transition:\s*none/,
    )
    expect(block).toBeTruthy()
  })

  it('drawer uses token colors only (both themes)', () => {
    const css = readFileSync(join(SRC, 'styles.css'), 'utf8')
    const drawerBlock = css.slice(css.indexOf('/* ---------- drawer'))
    expect(drawerBlock).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
    expect(drawerBlock).toContain('var(--color-overlay)')
    expect(drawerBlock).toContain('var(--color-surface)')
  })
})
