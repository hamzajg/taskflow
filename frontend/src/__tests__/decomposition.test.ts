import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

describe('SRP — "List and board interactions still work after decomposition" (@w2)', () => {
  it('ProjectDetailPage delegates task rows to TaskItem and the toggle to ViewToggle', () => {
    const src = read('pages/ProjectDetailPage.tsx')
    expect(src).toContain('components/TaskItem')
    expect(src).toContain('components/ViewToggle')
    expect(src).toContain('components/TaskFormFields')
    // no inlined task-row markup left in the page
    expect(src).not.toContain('className="task-item"')
  })

  it('task form fields are not duplicated between create and edit', () => {
    const page = read('pages/ProjectDetailPage.tsx')
    const item = read('components/TaskItem.tsx')
    const create = read('pages/TaskCreateDrawer.tsx')
    // page delegates creation to the drawer; edit and create share the field set
    expect(page).toContain('TaskCreateDrawer')
    expect(create).toContain('<TaskFormFields')
    expect(item).toContain('<TaskFormFields')
    expect(item).not.toContain('label="Due date"')
  })
})

describe('SRP — "CommentThread is shared, not duplicated" (@w2)', () => {
  it('detail page and drawer both render comments via CommentThread', () => {
    expect(read('pages/TaskDetailPage.tsx')).toContain('components/CommentThread')
    expect(read('pages/TaskDrawer.tsx')).toContain('components/CommentThread')
  })

  it('no comment markup or fetch logic lives outside CommentThread', () => {
    for (const f of ['pages/TaskDetailPage.tsx', 'pages/TaskDrawer.tsx']) {
      const src = read(f)
      expect(src, `${f} must not own comment state`).not.toContain('comment-list')
      expect(src, `${f} must not fetch comments`).not.toContain('/comments')
    }
    const ct = read('components/CommentThread.tsx')
    expect(ct).toContain('/comments')
    expect(ct).toContain('comment-list')
  })

  it('single-responsibility components exist', () => {
    for (const name of ['TaskFormFields', 'TaskItem', 'ViewToggle', 'Drawer', 'CommentThread', 'PageHeader', 'StatCard', 'ProfileForm']) {
      expect(() => read(`components/${name}.tsx`)).not.toThrow()
    }
  })
})

describe('SRP — "AccountPage delegates profile editing to ProfileForm" (@w3)', () => {
  it('ProfilePage contains no form markup or profile submit logic', () => {
    const page = read('pages/ProfilePage.tsx')
    expect(page).not.toContain('<form')
    expect(page).not.toContain('api.put')
    expect(page).toContain('components/ProfileForm')
  })

  it('AccountPage no longer hosts the profile form', () => {
    const page = read('pages/AccountPage.tsx')
    expect(page).not.toContain('ProfileForm')
    expect(page).not.toContain('<form')
  })

  it('ProfileForm owns fields, submit, pending state and messages', () => {
    const form = read('components/ProfileForm.tsx')
    expect(form).toContain('<form')
    expect(form).toContain('/auth/profile')
    expect(form).toContain('Save profile')
    expect(form).toContain('pending')
  })
})
