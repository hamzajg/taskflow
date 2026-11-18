import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, getTheme, toggleTheme } from '../theme'

function mockOsDark(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

describe('Theme toggle switches and persists', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    mockOsDark(false)
  })

  it('toggles light → dark → light and stores the choice', () => {
    expect(getTheme()).toBe('light')
    expect(toggleTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('tf-theme')).toBe('dark')

    expect(toggleTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('tf-theme')).toBe('light')
  })

  it('stored choice wins over OS preference', () => {
    localStorage.setItem('tf-theme', 'light')
    mockOsDark(true)
    expect(getTheme()).toBe('light')
  })
})

describe('First visit honors OS preference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('returns dark when the OS prefers dark and nothing is stored', () => {
    mockOsDark(true)
    expect(getTheme()).toBe('dark')
  })

  it('applyTheme writes the attribute and storage', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('tf-theme')).toBe('dark')
  })
})
