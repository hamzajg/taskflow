# Backlog: ux-polish

```
## US1 — As a workspace admin, I want the workspace summary to include total logged time, so that effort is visible at a glance
- Scenarios: @w1
- Size: S
- Notes: add timeMinutesTotal to WorkspaceSummaryDto via grouped SUM(minutes) over workspace tasks; running entries contribute 0; backend test

## US2 — As a workspace member, I want relative due dates, drawer time tracking, a clean account heading, and shareable board links, so that daily surfaces feel polished
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: client-side relativeDueLabel + overdue class (TaskItem/BoardView/TaskDetailPage); embed TimeSection in TaskDrawer with onChanged refresh; drop duplicate card heading on /account; ?view= param sync in ProjectDetailPage

## US3 — As a user, I want the dashboard to show project identity and time totals, so that I see effort without drilling in
- Scenarios: @w3
- Depends: US1, US2
- Size: S
- Notes: project color dot + TagBadges on dashboard rows; "Time logged" StatCard from summary.timeMinutesTotal; both-theme a11y pass on touched UI
```
