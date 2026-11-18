import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(p, out)
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      out.push(p)
    }
  }
  return out
}

const files = walk(SRC)
const HEX = /#[0-9a-fA-F]{3,8}\b/

describe('Design tokens are the single source of styling', () => {
  it('defines the core tokens in tokens.css', () => {
    const tokens = readFileSync(join(SRC, 'tokens.css'), 'utf8')
    for (const name of [
      '--color-bg',
      '--color-surface',
      '--color-text',
      '--color-primary',
      '--space-4',
      '--radius-md',
      '--shadow-sm',
      '--font-sans',
    ]) {
      expect(tokens).toContain(name)
    }
    // both themes present
    expect(tokens).toContain("[data-theme='dark']")
  })

  it('no component or stylesheet hard-codes a color', () => {
    const offenders = files
      .filter((f) => !f.endsWith('tokens.css'))
      .filter((f) => HEX.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('Shared primitives replace duplicated markup', () => {
  it('every page composes the shared components', () => {
    const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.tsx'))
    expect(pages.length).toBeGreaterThan(0)
    for (const page of pages) {
      const src = readFileSync(join(SRC, 'pages', page), 'utf8')
      expect(src, `${page} should use shared primitives`).toMatch(/components\/(Button|Input|Select|Card|Badge|Alert|AppShell)/)
    }
  })

  it('primitive components exist', () => {
    for (const name of ['Button', 'Input', 'Select', 'Card', 'Badge', 'Alert']) {
      expect(() => readFileSync(join(SRC, 'components', `${name}.tsx`), 'utf8')).not.toThrow()
    }
  })
})
