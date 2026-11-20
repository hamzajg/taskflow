# Waves — default-workspace

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Login provisions a default workspace for a user with no memberships
- Default workspace names the user
- Over-long first names cannot break login
- Repeat logins do not duplicate the default workspace
- Users with existing workspaces get no extra workspace
- Concurrent first logins provision at most one workspace
- Legacy user with no memberships gets a default workspace on login
- Unverified user receives a default workspace on login

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a new user, I want a workspace waiting for me at first login, so that I can start working without setup | S | — | Lazy provisioning inside login via a new DefaultWorkspaceService bean (avoids AuthService↔WorkspaceService CDI cycle, bypasses requireVerified per D2/D5); user-row pessimistic lock for concurrency; name = "<firstName>'s Workspace" else "My Workspace", truncated to ≤255 chars. Existing tests asserting hasSize(1)/$[0] after registerVerifyLogin+create WILL break — update them to account for the auto-provisioned workspace. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Dashboard auto-selects the default workspace
- Account page lists the default workspace
- Sidebar shows the default workspace as selected

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a new user, I want the app to already feel like mine, so that first-run feels intuitive | S | US1 | Small AppShell change required — auto-setActiveWorkspaceId when exactly one workspace loads so the sidebar switcher shows it (page-level fallbacks already exist); add tests proving dashboard/account/sidebar render the provisioned workspace with no selection action; both-theme evidence of the first-login state. |
