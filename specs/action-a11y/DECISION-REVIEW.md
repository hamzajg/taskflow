# Decision review: action-a11y

> Advisory decision-challenge record (D011). The challenger reviewed the
> design in SPEC.md / EXAMPLES.feature / BACKLOG.md against the actual code
> and returned **REVISE**; all findings were folded into the spec before
> wave planning.

## Verdict: REVISE → findings folded

## Steelman (accepted)

`aria-label` is the right fix — visible text stays compact, matches the
existing `aria-label="Close"` precedent, and `Button` already spreads
`ButtonHTMLAttributes` so labels pass through with zero component
changes. Quoting the title satisfies WCAG Label-in-Name (accessible name
still contains the visible text). "All projects" is a minimal,
non-destructive heading fix.

## Findings and resolutions

1. **[medium] Spec would silently break two tests** — `aria-label`
   replaces the accessible name; `drawer.test.tsx` and `projects.test.tsx`
   exact-match `Move` queries would fail → spec now names both tests as
   expected-to-update; move-form submit keeps bare "Move" (scoped).
2. **[medium] Same defect in `CommentThread`** — per-comment Edit/Delete
   have no labels on task detail + drawer → pulled into scope:
   `Edit/Delete comment by <author>`; scenario added.
3. **[low] `WorkspacePanel` member `Remove` has the same problem** →
   scope-out delegates it to `workspace-pane`, whose drawer rebuild
   owns that UI.
4. **[low] Artificial US2→US1 dependency** → removed from BACKLOG.
5. **[trivial] @w2 both-themes scenario near-zero signal** → kept; AC5
   covers the real check (no visual regression).

## Revisit trigger

Reopen if member `Remove` labels fall through the workspace-pane gap,
or if move-form submit / edit-form Save-Cancel labels are later wanted.
