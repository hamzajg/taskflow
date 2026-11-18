# Waves — projects-tasks

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Member creates and manages a project in their workspace
- Non-member cannot see or touch workspace projects
- Member creates a task with full fields
- Assignee must be a workspace member
- Member can delete tasks but not projects
- Cross-workspace isolation on tasks and projects
- Delete permissions respect roles

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a workspace member, I want a projects/tasks API with correct tenancy and roles, so that work data is safe and consistent | L | — | V3 migration (projects, tasks tables + seqs), Project/Task entities, ProjectService/TaskService with requireMembership/requireRole choke points, REST resources, move endpoint (api.ts gains patch helper); composite-FK workspace integrity, FOR UPDATE move serialization, task-delete position compaction, project cascade; backend scenario tests for CRUD, validation, isolation, delete roles. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Projects list shows workspace projects with counts
- Project detail shows tasks in list view
- Empty project shows a useful empty state

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a member, I want a projects list and project detail with a task list, so that I can see and manage work | M | US1 | /projects + /projects/:id routes, ProjectsPage + ProjectDetailPage (list view), task create/edit forms, empty/loading/error states, sidebar Projects nav item; frontend tests. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Board groups tasks by status column
- Moving a task on the board persists status and order
- Move is rejected for invalid status or foreign task

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a member, I want a kanban board with persisted drag ordering, so that I can move work at a glance | M | US2 | Board view toggle (persisted per project), status columns, native HTML5 DnD + keyboard/touch move menu (DnD has no touch path — menu is the fallback), PATCH move calls, order survives reload; frontend tests for grouping/move. |

## Wave 4 — iteration 4

Scenarios proven by this wave:
- New screens meet the accessibility bar
- Loading and error states are handled

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US4 | As a user, I want the new screens polished and accessible, so that they match the product's quality bar | S | US2, US3 | a11y pass on new screens (focus, labels, keyboard+touch move), loading/error/retry states, both-theme screenshot evidence, gap closure from validation. |
