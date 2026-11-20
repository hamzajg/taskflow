# Waves — ux-polish

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Due dates render relative labels on task surfaces
- Tasks without a due date show no due label

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a workspace admin, I want the workspace summary to include total logged time, so that effort is visible at a glance | S | — | add timeMinutesTotal to WorkspaceSummaryDto via grouped SUM(minutes) over workspace tasks; running entries contribute 0; backend test |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Time section works inside the task drawer
- Account page has a single Workspaces heading
- Board view is deep-linkable via the view param

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a workspace member, I want relative due dates, drawer time tracking, a clean account heading, and shareable board links, so that daily surfaces feel polished | M | US1 | client-side relativeDueLabel + overdue class (TaskItem/BoardView/TaskDetailPage); embed TimeSection in TaskDrawer with onChanged refresh; drop duplicate card heading on /account; ?view= param sync in ProjectDetailPage |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Dashboard shows project identity and time totals
- Time and date UI meet the accessibility bar in both themes

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want the dashboard to show project identity and time totals, so that I see effort without drilling in | S | US1, US2 | project color dot + TagBadges on dashboard rows; "Time logged" StatCard from summary.timeMinutesTotal; both-theme a11y pass on touched UI |
