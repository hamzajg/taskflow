import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

describe('Reskin — "Stat cards and headers follow the shared design language" (@w3)', () => {
  it('StatCard renders an icon chip, label and value', () => {
    render(<StatCard icon={<svg data-testid="ico" />} label="Projects" value={3} />)
    expect(screen.getByText('Projects')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    const chip = document.querySelector('.stat-card-icon')
    expect(chip).toBeTruthy()
    expect(chip?.getAttribute('aria-hidden')).toBe('true')
  })

  it('PageHeader renders a level-1 title with optional description and actions', () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Workspace overview"
        actions={<button>Action</button>}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeTruthy()
    expect(screen.getByText('Workspace overview')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Action' })).toBeTruthy()
  })

  it('authed pages compose PageHeader for a consistent page header', () => {
    for (const page of [
      'DashboardPage.tsx',
      'ProjectsPage.tsx',
      'ProjectDetailPage.tsx',
      'TaskDetailPage.tsx',
      'AccountPage.tsx',
    ]) {
      expect(read(join('pages', page)), `${page} should use PageHeader`).toContain(
        'components/PageHeader',
      )
    }
  })
})

describe('Reskin — "Reskinned screens meet the accessibility bar in both themes" (@w3)', () => {
  it('form inputs keep a visible keyboard focus indicator', () => {
    const css = read('styles.css')
    // a focus-visible rule for field inputs must exist
    expect(css).toMatch(/\.field-input:focus-visible/)
    // and no rule may strip the outline on plain :focus
    expect(css).not.toMatch(/\.field-input:focus\s*\{[^}]*outline:\s*none/)
  })

  it('icon-only controls carry accessible names', () => {
    for (const f of ['components/AppShell.tsx', 'pages/LandingPage.tsx']) {
      const src = read(f)
      expect(src, `${f} theme/nav toggles need aria-label`).toContain('aria-label')
    }
  })

  it('both themes define the full token set', () => {
    const tokens = read('tokens.css')
    expect(tokens).toContain(':root')
    expect(tokens).toContain("[data-theme='dark']")
    for (const name of ['--color-bg', '--color-surface', '--color-primary', '--color-text']) {
      expect(tokens.match(new RegExp(`${name}:`, 'g'))!.length).toBeGreaterThanOrEqual(2)
    }
  })
})
