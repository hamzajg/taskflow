import { safeCssColor, TagDto } from '../pages/projectTypes'

export default function TagBadges({ tags }: { tags: TagDto[] | undefined }) {
  if (!tags || tags.length === 0) return null
  return (
    <span className="tag-badges">
      {tags.map((t) => (
        <span key={t.id} className="tag-badge">
          <span
            className="tag-dot"
            style={{ background: safeCssColor(t.color) ?? 'var(--muted)' }}
            aria-hidden="true"
          />
          {t.title}
        </span>
      ))}
    </span>
  )
}
