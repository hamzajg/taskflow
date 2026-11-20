# Spec: ux-polish

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

A UX walkthrough of the shipped app (all routes, both themes, live
interactions) surfaced a batch of small but real polish gaps: due dates
render as raw ISO strings with no relative or overdue treatment; the task
drawer — the primary task surface — has no time tracking at all; `/account`
renders a duplicate "Workspaces" heading; board/list preference cannot be
deep-linked; and the dashboard ignores the project color/tag data it
already receives while offering no time-tracking visibility. Each item is
small; together they are the difference between "works" and "feels
finished".

## Users

Workspace members scanning task lists for what is overdue or due soon;
anyone tracking time who shouldn't have to leave the task drawer; users
who share links to a project's board vs list view; anyone glancing at the
dashboard for effort signals.

## Outcome hypothesis

- Expected user outcome: due-date urgency is visible at a glance, time
  tracking is reachable from every task surface, navigation state is
  shareable, and the dashboard reflects project identity + effort.
- Opportunity evidence: firsthand walkthrough findings (recorded in the
  feature request); no telemetry exists — this is assumption-backed.
- Signal: none measurable yet; qualitative improvement.
- Follow-up owner/date: product owner review after merge.

## Scope (in)

- Relative due-date formatting + overdue styling on task rows
  (`TaskItem`), board cards (`BoardView`), and the task detail field.
- Time tracking inside the task drawer (`TaskDrawer`) via the existing
  `TimeSection` component.
- `/account` single-heading fix (no duplicate "Workspaces" h1/h3).
- `?view=list|board` URL param on project detail, synced with the toggle
  (localStorage remains the fallback default).
- Dashboard: project rows show color dot + tag chips (data already in
  `ProjectDto`); workspace summary gains `timeMinutesTotal` and the
  dashboard shows a "Time logged" stat.
- Tests for every behavior; both-theme evidence for touched UI.

## Scope (out)

- Global search, notifications, attachments (separate future features).
- Time-entry editing inside the drawer beyond what `TimeSection` already
  provides (it is embedded as-is).
- New backend endpoints beyond the summary field.
- Mobile-specific layout changes (no overflow was found).

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Due dates render relative labels (Today/Tomorrow/Overdue/in N d) and overdue tasks are visually flagged on list rows, board cards, and task detail; tasks without a due date show no label | Due dates render relative labels on task surfaces; Tasks without a due date show no due label |
| 2 | The task drawer shows the same Time section as the detail page — entries, log form, timer controls | Time section works inside the task drawer |
| 3 | `/account` exposes exactly one "Workspaces" heading | Account page has a single Workspaces heading |
| 4 | `?view=board` opens the board and toggling updates the URL; absent param falls back to the saved preference; view and task params coexist | Board view is deep-linkable via the view param |
| 5 | Dashboard project rows show color + tags and a "Time logged" stat reflects workspace totals | Dashboard shows project identity and time totals |
| 6 | All touched UI keeps labelled controls in both themes | Time and date UI meet the accessibility bar in both themes |

## Decisions

- **D1 — Relative dates are computed client-side from `dueDate` only.**
  Context: `dueDate` is a `LocalDate`; "today" depends on the viewer's
  timezone. Options: (a) backend emits `dueLabel`/`isOverdue` per task —
  wrong timezone for travelers, extra DTO churn on every task payload;
  (b) client computes from the ISO date using the browser's local date —
  correct per-user, zero API change. Decision: (b), with three
  challenger-mandated constraints: (i) compare `YYYY-MM-DD` **strings**,
  never `new Date(dueDate)` (which parses as UTC midnight and
  reintroduces the timezone bug); (ii) the ISO date stays visible in the
  rendered text (e.g. `Due in 5 d · 2026-12-01`) because existing tests
  assert on it; (iii) acknowledge divergence — the dashboard's
  server-computed `overdueCount`/`dueSoonCount` (server `LocalDate.now()`)
  can disagree with per-task client flags near midnight; accepted
  because a count is a hint while a per-task flag is display-only, and
  the codebase already splits client/server dates (time-entry
  `entryDate`). Reversibility: two-way.
- **D2 — Drawer embeds `TimeSection` unchanged, with explicit plumbing.**
  Context: the drawer is the quick-glance task surface; duplicating a
  trimmed time UI would fork behavior. Options: (a) compact read-only
  summary + link — hides the primary action; (b) embed the full
  `TimeSection`. Decision: (b), and the spec now names the wiring the
  challenger caught missing: `TaskDrawer` derives `canModerate` itself
  (it already fetches `project.workspaceId`; role comes from
  `useShell().workspaces`), accepts an `onChanged` prop forwarded to
  `TimeSection`, and `ProjectDetailPage` passes its task-list `load` so
  row chips and the project aggregate refresh. `TimeSection` issues
  exactly one request on mount. Reversibility: two-way.
- **D3 — `view` param is authoritative when present; all param writes
  merge.** Options: (a) localStorage-only (status quo); (b) URL param
  wins. Decision: (b) with challenger-mandated detail: every
  `setSearchParams` call in `ProjectDetailPage` — task drawer open/close,
  create drawer, view toggle — must **merge** params so `?view=` and
  `?task=` coexist (today they wipe each other); invalid `?view=` values
  fall back to the localStorage preference; the per-project localStorage
  initializer is re-seeded when `projectId` changes (component reuse
  across `/projects/:id` navigations). Toggle writes via
  `setSearchParams(..., {replace:true})` so history isn't spammed.
  Reversibility: two-way.
- **D4 — Workspace time total joins the existing summary DTO.** Options:
  (a) new endpoint — extra round-trip for one number; (b)
  `timeMinutesTotal` on `WorkspaceSummaryDto` via the same grouped
  `SUM(minutes)` (workspace_id is indexed; running entries contribute
  0). Decision: (b). Consequences: the record's canonical constructor
  changes — the frontend `WorkspaceSummaryDto` interface and ~4 test
  fixtures constructing summary literals must gain the field. Accepted:
  additive, compiler-guided. Reversibility: two-way.
