# Waves — workspace-pane

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Workspace name opens the management drawer
- Manage drawer shows permitted actions per role
- Workspace mutations happen inside the drawer
- Dismissing the manage drawer preserves state
- Sidebar switching never opens the drawer
- Delete uses an inline confirm and resets a dangling selection
- Members load failure alerts with retry inside the drawer
- Sidebar workspace switching still works

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a workspace owner/admin, I want to manage members, invites, rename and delete from a focused drawer, so that administration doesn't expand inline under the workspace list | L | — | WorkspaceDrawer owns members/invites fetch + all mutations; preserves canManage/isOwner gating; window.confirm replaced by inline two-step confirm; activeWorkspaceId→openId sync effect removed; delete resets dangling active selection; invites fetched only when canManage; members-load failure alerts+retry inside drawer. WorkspacePanel shrinks to list + orchestration. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- New workspace opens the creation drawer
- Creating a workspace closes the drawer and updates the list
- Workspace create errors stay inside the drawer
- Account page shows no inline workspace forms

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a member, I want to create a workspace from the same drawer pattern, so that creation feels unified across the app | S | — | Replace inline New workspace form with button + WorkspaceCreateDrawer (name field only); same lifecycle contract as task/project create drawers. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Workspace drawers meet the accessibility bar in both themes
- AccountPage delegates profile editing to ProfileForm

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a maintainer, I want AccountPage to delegate profile editing to a focused component, so that the page only orchestrates | S | US1, US2 | Extract ProfileForm (fields, submit, pending, messages); a11y verification of both workspace drawers in both themes. |
