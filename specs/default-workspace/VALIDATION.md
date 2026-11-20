# Validation — default-workspace

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | First login for a membership-less user provisions exactly… | Concurrent first logins provision at most one workspace, Default workspace names the user, Legacy user with no memberships gets a default workspace on login, Login provisions a default workspace for a user with no memberships, Over-long first names cannot break login, Repeat logins do not duplicate the default workspace, Unverified user receives a default workspace on login, Users with existing workspaces get no extra workspace | 1 | DefaultWorkspaceTest.java |
| 2 | Provisioning is idempotent: repeat logins and users who… | Concurrent first logins provision at most one workspace, Default workspace names the user, Legacy user with no memberships gets a default workspace on login, Login provisions a default workspace for a user with no memberships, Over-long first names cannot break login, Repeat logins do not duplicate the default workspace, Unverified user receives a default workspace on login, Users with existing workspaces get no extra workspace | 1 | DefaultWorkspaceTest.java |
| 3 | Legacy users with zero memberships are covered on next login | Concurrent first logins provision at most one workspace, Default workspace names the user, Legacy user with no memberships gets a default workspace on login, Login provisions a default workspace for a user with no memberships, Over-long first names cannot break login, Repeat logins do not duplicate the default workspace, Unverified user receives a default workspace on login, Users with existing workspaces get no extra workspace | 1 | DefaultWorkspaceTest.java |
| 4 | Unverified users still receive the workspace at the data… | Concurrent first logins provision at most one workspace, Default workspace names the user, Legacy user with no memberships gets a default workspace on login, Login provisions a default workspace for a user with no memberships, Over-long first names cannot break login, Repeat logins do not duplicate the default workspace, Unverified user receives a default workspace on login, Users with existing workspaces get no extra workspace | 1 | DefaultWorkspaceTest.java |
| 5 | After login the workspace is active in the UI with no… | Account page lists the default workspace, Dashboard auto-selects the default workspace, Sidebar shows the default workspace as selected | 2 | default-workspace.test.tsx |

## Scenario coverage

- Scenarios: 11 total, 10 with detected test evidence, 1 with weak (token-match) evidence only, 0 without
- ✓ `Login provisions a default workspace for a user with no memberships` (@w1)
- ~ `Default workspace names the user` (@w1)
- ✓ `Over-long first names cannot break login` (@w1)
- ✓ `Repeat logins do not duplicate the default workspace` (@w1)
- ✓ `Users with existing workspaces get no extra workspace` (@w1)
- ✓ `Concurrent first logins provision at most one workspace` (@w1)
- ✓ `Legacy user with no memberships gets a default workspace on login` (@w1)
- ✓ `Unverified user receives a default workspace on login` (@w1)
- ✓ `Dashboard auto-selects the default workspace` (@w2)
- ✓ `Account page lists the default workspace` (@w2)
- ✓ `Sidebar shows the default workspace as selected` (@w2)

## Demo script (manual walkthrough)

1. **Login provisions a default workspace for a user with no memberships** — run the app, perform the scenario, observe the outcome.
2. **Dashboard auto-selects the default workspace** — run the app, perform the scenario, observe the outcome.

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