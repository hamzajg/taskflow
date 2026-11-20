# Waves — project-tags

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Members can list workspace tags
- Owner creates a tag
- Member cannot mutate tags
- Duplicate tag titles are rejected
- Invalid tag input is rejected
- Assign tags to a project
- Reject foreign-workspace tag ids
- Deleting a tag detaches it from projects
- Deleting a project removes tag assignments

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a workspace admin, I want to manage colored tags, so that projects can be organized and filtered | M | — | tags + project_tags tables, workspace-scoped CRUD, role-gated mutation, uniqueness, cascade deletes, project tagIds on create/update |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Project cards show tag badges
- Manage tags from the projects page
- Filter projects by tag
- Assign tags in the project drawer
- Edit a project and update its tags

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a workspace member, I want to see and use tags in the UI, so that I can label and filter projects at a glance | M | US1 | badges on cards/detail, tag management drawer on /projects, tag multi-select in project drawer, client-side filter chips |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Tag UI works in both themes

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want tag UI that is accessible in both themes, so that the feature is usable for everyone | S | US2 | verification wave — labelled controls, both-theme evidence, a11y test pass |
