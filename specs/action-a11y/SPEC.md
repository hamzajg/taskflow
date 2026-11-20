# Spec: action-a11y

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

A UX walkthrough of the shipped product found that task action buttons
carry no accessible context: every task row renders identical "Edit" and
"Delete" buttons, and every board card renders an identical "Move"
control — all with `aria-label: null`. Assistive technology announces a
list of indistinguishable "Edit, Delete, Edit, Delete…" with no way to
know which task each controls. The same walkthrough found a duplicate
"Projects" heading on the projects page (PageHeader H1 + card H3) and a
member-role double label in the workspace subpanel (role shown as text
and again as a badge). The workspace-side items are handled by the
`workspace-pane` feature; this spec covers the task-side action labels
and the heading dedupe.

## Users

- Screen-reader and keyboard users navigating task lists and boards who
  need to know which task an action targets.
- Anyone scanning the projects page who sees "Projects" twice.

## Outcome hypothesis

- Expected user outcome: every task action announces its target
  ("Edit Write copy", "Delete Write copy", "Move Write copy"), and the
  projects page shows one "Projects" heading.
- Opportunity evidence: direct observation — DOM audit confirmed
  `aria-label: null` on all Edit/Delete buttons and repeated identical
  accessible names; heading duplication confirmed in rendered output.
- Signal: qualitative — action names become unique and descriptive.
  No numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **Task action labels**: `TaskItem`'s Edit and Delete buttons get
  `aria-label`s including the task title (e.g. `Edit "Write copy"`,
  `Delete "Write copy"`). Save/Cancel inside the inline edit form keep
  their existing names (they are scoped inside the editing row).
- **Board move labels**: the board card "Move" toggle gets an
  `aria-label` including the task title (e.g. `Move "Write copy"`). The
  move-form's submit "Move" keeps its bare name — it is scoped inside
  one card's form.
- **Comment action labels**: `CommentThread`'s per-comment Edit/Delete
  buttons get `aria-label`s including the comment author's name (e.g.
  `Edit comment by Demo User`) — the same repeated-name defect on the
  task detail page and inside the task drawer.
- **Heading dedupe**: the `/projects` page shows "Projects" once — the
  PageHeader keeps the H1; the card title changes to a non-duplicative
  label (e.g. "All projects") or is removed if redundant.
- **Member remove label**: the workspace manage drawer's per-member
  "Remove" button gets an `aria-label` naming the member (e.g.
  `Remove Demo User`) — the same repeated-name defect. Pulled into scope
  after audit found the workspace-pane delegation never happened
  (WorkspaceDrawer renders a bare "Remove").
- **Test migration**: `drawer.test.tsx` (board Move name query) and
  `projects.test.tsx` (board Move name query) are updated to match the
  new accessible names — `aria-label` replaces the accessible name, so
  exact-match queries must change.
- Tests asserting the new accessible names, including that two
  different tasks produce distinguishable labels.

## Scope (out)

- Other workspace/account changes — the member-Remove label is the only
  workspace-side item pulled in (delegation to workspace-pane was found
  not to have happened); everything else stays out.
- Drawer, form, or routing changes — none needed.
- Visible button text changes (labels are `aria-label` only; sighted
  users keep the compact Edit/Delete/Move text).
- Board move-form submit and inline-edit Save/Cancel labels (scoped
  inside a single open form).
- Any backend change.

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Every Edit/Delete button in the task list view has an accessible name containing the task's title; two different tasks yield different names | Task list actions name their task; Inline edit actions stay scoped |
| 2 | Every Move toggle in the board view has an accessible name containing the task's title; the move-form submit keeps its bare "Move" name | Board move control names its task |
| 3 | Every comment Edit/Delete button has an accessible name identifying the comment's author | Comment actions name their author |
| 4 | The `/projects` page renders "Projects" as a single heading | Projects page shows one Projects heading |
| 5 | Tests and build stay green (existing name queries migrated — drawer.test.tsx, projects.test.tsx, task-detail.test.tsx); no visual regression (visible text unchanged); labels identical in both themes | Action labels work in both themes |
| 6 | Member remove buttons in the workspace manage drawer name their member | Member remove action names the member |

## Decisions (preliminary)

- **D1 — `aria-label`, not visible text.** Compact Edit/Delete/Move
  stays visually; the label carries context for AT. Matches existing
  `aria-label="Close"` precedent in `Drawer`.
- **D2 — Title in the label, quoted.** `Edit "<title>"` keeps names
  parseable and unambiguous even with punctuation in titles.
- **D3 — Card title becomes "All projects".** Keeps the card header
  informative without duplicating the H1; alternative (removing the
  title) loses the section landmark.
