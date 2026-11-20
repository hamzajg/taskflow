# Decision review: create-pane

> Advisory decision-challenge record (D011). The challenger reviewed the
> design in SPEC.md / EXAMPLES.feature / BACKLOG.md against the actual code
> and returned **REVISE**; all findings were folded into the spec before
> wave planning.

## Verdict: REVISE → findings folded

## Steelman (accepted)

Keep task peek URL-driven (`?task=<id>`) because it represents shareable
entity state; keep creation local because an unsubmitted form has no
shareable value and should not create history entries. Reusing `Drawer`
and `TaskFormFields` gives creation the same focus trap, scroll lock,
Escape/overlay dismissal, themes, and reduced-motion behavior as peek.
Drawer-owning-submit matches the `CommentThread` precedent.

## Findings and resolutions

1. **[concern] Create/peek exclusivity unspecified** → D6 added: at most
   one drawer open; "Add task" clears `?task=` first. Scenario added.
2. **[concern] Form reset semantics missing** → lifecycle contract added:
   fresh form on every open, reset on success, preserved on API error,
   discarded on cancel. Scenarios added.
3. **[concern] Submit lifecycle/pending state unspecified** → D3 amended:
   close/reset before `onCreated`, submit disabled in flight.
4. **[concern] Accessible-name collision + stale tests** → D5 added:
   opener "Add task"/"New project" vs submit "Create task"/"Create
   project"; AC7 now explicitly requires migrating `drawer.test.tsx` and
   `projects.test.tsx`.
5. **[nit] D4 placement inconsistency / header crowding** → "New project"
   moved to card header actions; `flex-wrap` on `.card-actions`/`.card-header`.
6. **[nit] Artificial US2→US1 dependency** → removed from BACKLOG.md.
7. **[nit] Payload normalization must survive the move** → spec preserves
   `description || undefined` / `color || undefined`; scenario step added.

## Audit follow-ups (SPEC-AUDIT.md CONCERNS, all folded)

- Mutual-exclusivity wording softened: the closing drawer may finish its
  250ms exit transition (`Drawer.tsx` keeps children mounted); "at most
  one drawer open" is the invariant.
- `flex-wrap` target pinned to `.card-actions`.
- Implementation note recorded: reset-on-open lives in the create-drawer
  component (state resets when `open` goes false→true), leaving `Drawer`
  untouched.

## Revisit trigger

Reopen if the product needs create-while-peeking simultaneously, if form
drafts must survive refresh/navigation, if a third entity makes the
no-abstraction/YAGNI call wrong, or if header crowding proves problematic
on narrow screens.
