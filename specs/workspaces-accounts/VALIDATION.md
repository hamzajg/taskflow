# Validation — workspaces-accounts

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | A visitor can register with name, email, password and… | Log in with valid credentials, Log in with wrong password, Log out invalidates the session, Register and verify a new account | 1 | AuthResourceTest.java |
| 2 | An unverified user cannot use workspace features until… | Log in with valid credentials, Log in with wrong password, Log out invalidates the session, Register and verify a new account | 1 | AuthResourceTest.java |
| 3 | A registered user can log in and receives a token; wrong… | Log in with valid credentials, Log in with wrong password, Log out invalidates the session, Register and verify a new account | 1 | AuthResourceTest.java |
| 4 | A logged-in user can log out, invalidating the token | Log in with valid credentials, Log in with wrong password, Log out invalidates the session, Register and verify a new account | 1 | AuthResourceTest.java |
| 5 | A user can create a workspace and becomes its owner | Create a workspace, Invite and accept a member, Member removal, Switch between workspaces | 2 | WorkspaceResourceTest.java |
| 6 | A user can belong to multiple workspaces and switch the… | Create a workspace, Invite and accept a member, Member removal, Switch between workspaces | 2 | WorkspaceResourceTest.java |
| 7 | An owner/admin can invite a member by email; invitee… | Create a workspace, Invite and accept a member, Member removal, Switch between workspaces | 2 | WorkspaceResourceTest.java |
| 8 | Members can be listed and removed by owner/admin only | Create a workspace, Invite and accept a member, Member removal, Switch between workspaces | 2 | WorkspaceResourceTest.java |
| 9 | A member cannot perform owner/admin actions (rename, remove… | Member cannot escalate privileges, Password reset, Update profile display name, Workspace isolation | 3 | AuthResourceTest.java |
| 10 | Workspace data is isolated: users of workspace A cannot see… | Member cannot escalate privileges, Password reset, Update profile display name, Workspace isolation | 3 | AuthResourceTest.java |
| 11 | A user can request a password reset and set a new password… | Member cannot escalate privileges, Password reset, Update profile display name, Workspace isolation | 3 | AuthResourceTest.java |
| 12 | Profile shows the user's name/email and allows updating… | Member cannot escalate privileges, Password reset, Update profile display name, Workspace isolation | 3 | AuthResourceTest.java |

## Scenario coverage

- Scenarios: 12 total, 3 with detected test evidence, 9 with weak (token-match) evidence only, 0 without
- ~ `Register and verify a new account` (@w1)
- ✓ `Log in with valid credentials` (@w1)
- ~ `Log in with wrong password` (@w1)
- ~ `Log out invalidates the session` (@w1)
- ~ `Create a workspace` (@w2)
- ✓ `Switch between workspaces` (@w2)
- ~ `Invite and accept a member` (@w2)
- ~ `Member removal` (@w2)
- ~ `Member cannot escalate privileges` (@w3)
- ~ `Workspace isolation` (@w3)
- ✓ `Password reset` (@w3)
- ~ `Update profile display name` (@w3)

## Demo script (manual walkthrough)

1. **Register and verify a new account** — run the app, perform the scenario, observe the outcome.
2. **Log in with valid credentials** — run the app, perform the scenario, observe the outcome.
3. **Create a workspace** — run the app, perform the scenario, observe the outcome.
4. **Switch between workspaces** — run the app, perform the scenario, observe the outcome.
5. **Invite and accept a member** — run the app, perform the scenario, observe the outcome.
6. **Password reset** — run the app, perform the scenario, observe the outcome.
7. **Update profile display name** — run the app, perform the scenario, observe the outcome.

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