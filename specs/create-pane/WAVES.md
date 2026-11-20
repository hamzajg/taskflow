# Waves — create-pane

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Add task opens the creation drawer
- Creating a task closes the drawer and updates the list
- Create errors stay inside the drawer with values preserved
- Dismissing the create drawer creates nothing
- Peek drawer still works alongside create
- Only one drawer is open at a time
- Create form resets on every open

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a member, I want to create tasks from a focused side drawer, so that the project page stays clean and creation feels deliberate | M | — | Replace "New task" card with "Add task" button + TaskCreateDrawer reusing TaskFormFields; submit/error/dismiss semantics; peek drawer unaffected. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- New project opens the creation drawer
- Creating a project closes the drawer and updates the list
- Inline creation forms are gone

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a member, I want to create projects from the same drawer pattern, so that creation feels unified across the app | S | — | Replace inline create form on ProjectsPage with "New project" drawer (name/description/color); remove permanent inline forms. Independent of US1 — only the Drawer primitive is shared. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Creation drawers meet the accessibility bar in both themes

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want the creation drawers to be accessible and polished in both themes, so that they feel like part of the product | S | US1, US2 | Inherited Drawer a11y verified for create flows; keyboard submit; both-theme evidence. |
