import Button from './Button'

export default function ViewToggle({
  view,
  onChange,
}: {
  view: 'list' | 'board'
  onChange: (view: 'list' | 'board') => void
}) {
  return (
    <div className="view-toggle" role="group" aria-label="Task view">
      <Button
        variant={view === 'list' ? 'secondary' : 'link'}
        size="sm"
        aria-pressed={view === 'list'}
        onClick={() => onChange('list')}
      >
        List
      </Button>
      <Button
        variant={view === 'board' ? 'secondary' : 'link'}
        size="sm"
        aria-pressed={view === 'board'}
        onClick={() => onChange('board')}
      >
        Board
      </Button>
    </div>
  )
}
