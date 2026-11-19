# Validation — projects-tasks

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Members can CRUD projects inside their workspace… | Assignee must be a workspace member, Cross-workspace isolation on tasks and projects, Delete permissions respect roles, Member can delete tasks but not projects, Member creates a task with full fields, Member creates and manages a project in their workspace, Non-member cannot see or touch workspace projects | 1 | ProjectTaskResourceTest.java |
| 2 | Members can CRUD tasks inside a project with… | Assignee must be a workspace member, Cross-workspace isolation on tasks and projects, Delete permissions respect roles, Member can delete tasks but not projects, Member creates a task with full fields, Member creates and manages a project in their workspace, Non-member cannot see or touch workspace projects | 1 | ProjectTaskResourceTest.java |
| 3 | Task move endpoint updates status + position atomically… | Board groups tasks by status column, Move is rejected for invalid status or foreign task, Moving a task on the board persists status and order | 3 | projects.test.tsx |
| 4 | Projects list page shows workspace projects with task counts | Empty project shows a useful empty state, Project detail shows tasks in list view, Projects list shows workspace projects with counts | 2 | projects.test.tsx |
| 5 | Project detail offers list and board views; board groups… | Board groups tasks by status column, Empty project shows a useful empty state, Move is rejected for invalid status or foreign task, Moving a task on the board persists status and order, Project detail shows tasks in list view, Projects list shows workspace projects with counts | 2, 3 | projects.test.tsx |
| 6 | Board drag (or move control) persists position; columns… | Board groups tasks by status column, Move is rejected for invalid status or foreign task, Moving a task on the board persists status and order | 3 | projects.test.tsx |
| 7 | Members can delete tasks in visible projects; only… | Assignee must be a workspace member, Cross-workspace isolation on tasks and projects, Delete permissions respect roles, Empty project shows a useful empty state, Member can delete tasks but not projects, Member creates a task with full fields, Member creates and manages a project in their workspace, Non-member cannot see or touch workspace projects, Project detail shows tasks in list view, Projects list shows workspace projects with counts | 1, 2 | ProjectTaskResourceTest.java, projects.test.tsx |
| 8 | Workspace isolation: project/task IDs from another… | Assignee must be a workspace member, Cross-workspace isolation on tasks and projects, Delete permissions respect roles, Member can delete tasks but not projects, Member creates a task with full fields, Member creates and manages a project in their workspace, Non-member cannot see or touch workspace projects | 1 | ProjectTaskResourceTest.java |
| 9 | Empty states, loading and error states exist for all new… | Loading and error states are handled, New screens meet the accessibility bar | 4 | projects.test.tsx |
| 10 | All new UI follows tokens/primitives, works in both themes… | Loading and error states are handled, New screens meet the accessibility bar | 4 | projects.test.tsx |

## Scenario coverage

- Scenarios: 15 total, 14 with detected test evidence, 1 with weak (token-match) evidence only, 0 without
- ✓ `Member creates and manages a project in their workspace` (@w1)
- ✓ `Non-member cannot see or touch workspace projects` (@w1)
- ✓ `Member creates a task with full fields` (@w1)
- ✓ `Assignee must be a workspace member` (@w1)
- ✓ `Member can delete tasks but not projects` (@w1)
- ✓ `Cross-workspace isolation on tasks and projects` (@w1)
- ✓ `Delete permissions respect roles` (@w1)
- ✓ `Projects list shows workspace projects with counts` (@w2)
- ✓ `Project detail shows tasks in list view` (@w2)
- ✓ `Empty project shows a useful empty state` (@w2)
- ✓ `Board groups tasks by status column` (@w3)
- ✓ `Moving a task on the board persists status and order` (@w3)
- ~ `Move is rejected for invalid status or foreign task` (@w3)
- ✓ `New screens meet the accessibility bar` (@w4)
- ✓ `Loading and error states are handled` (@w4)

## Demo script (manual walkthrough)

1. **Member creates and manages a project in their workspace** — run the app, perform the scenario, observe the outcome.
2. **Member creates a task with full fields** — run the app, perform the scenario, observe the outcome.
3. **Projects list shows workspace projects with counts** — run the app, perform the scenario, observe the outcome.
4. **Project detail shows tasks in list view** — run the app, perform the scenario, observe the outcome.
5. **Board groups tasks by status column** — run the app, perform the scenario, observe the outcome.
6. **Moving a task on the board persists status and order** — run the app, perform the scenario, observe the outcome.

## Gaps

- none — spec is fully traced

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)