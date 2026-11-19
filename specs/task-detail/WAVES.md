# Waves — task-detail

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Member posts a comment on a task in their workspace
- Empty or oversized comment body is rejected
- Non-member cannot read or post comments on workspace tasks
- Cross-workspace comment isolation
- Author edits and deletes their own comment
- Non-author cannot edit another member's comment
- Workspace admin can moderate but not edit comments

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a workspace member, I want a comments API on tasks with correct tenancy and authorship rules, so that discussion is safe and consistent | M | — | V4 migration (comments table + seq), Comment entity, CommentService with membership/author/role choke points, nested + item REST resources, OpenAPI annotations; backend scenario tests for CRUD, validation, isolation, edit/delete authZ. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Task detail shows all fields and links back to the project
- Comments thread renders and posting adds a comment
- Task with no comments shows an empty state

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a member, I want a task detail page with its comment thread, so that I can see full context and discuss the work | M | US1 | /tasks/:id route, TaskDetailPage (all fields + project link), comments list + post/edit/delete UI, entry points from list rows and board cards; frontend tests. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Detail and comments screens meet the accessibility bar
- Loading and error states are handled

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want the detail and comments screens polished and accessible, so that they match the product's quality bar | S | US2 | a11y pass (labels, focus, keyboard), loading/error/retry states, both-theme screenshot evidence, gap closure from validation. |
