# Spec audit: action-a11y

> Independent audit (D013) before wave planning. Small spec; findings
> from the decision challenge were folded and re-verified.

## Verdict: PASS (post-fold)

## Verified

- `TaskItem` Edit/Delete render only in read state; Save/Cancel scoped
  inside the edit form; single `editingId` means one edit form at a time.
- `BoardView` Move toggle is the only per-card action; move-form submit
  correctly excluded (scoped inside one card's form).
- `CommentThread` Edit/Delete confirmed label-less — now in scope.
- Only `/projects` has the PageHeader+Card title collision; dashboard and
  account headings don't collide.
- `Button` spreads `ButtonHTMLAttributes` — `aria-label` passes through.
- Test-migration targets named: `drawer.test.tsx` board-Move query,
  `projects.test.tsx` board-Move query; move-form submit unaffected.
- 6 scenarios across 2 waves; BACKLOG parses; G1 satisfied.

## Notes

- Member `Remove` labels deferred to `workspace-pane` scope-out —
  tracked there, not a gap.
