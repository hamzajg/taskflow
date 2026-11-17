# Waves — workspaces-accounts

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Warnings

- US4 lands in wave 3 but its scenarios are tagged @w2 — retag EXAMPLES.feature to @w3 or adjust Depends
- US5 lands in wave 4 but its scenarios are tagged @w3 — retag EXAMPLES.feature to @w4 or adjust Depends

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Register and verify a new account
- Log in with valid credentials
- Log in with wrong password
- Log out invalidates the session

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a visitor, I want to register and verify my email, so that I have a secure account | M | — | registration endpoint + verification email + verify flow |
| US2 | As a user, I want to log in and log out with a token, so that my session is secure | M | — | JWT issue/validate, wrong-password rejection, logout |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Create a workspace
- Switch between workspaces
- Invite and accept a member
- Member removal

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want to create and switch workspaces, so that I can organize my teams | M | US1, US2 | workspaces CRUD + active-workspace context |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Member cannot escalate privileges
- Workspace isolation
- Password reset
- Update profile display name

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US4 | As an owner/admin, I want to invite and manage members, so that my team can collaborate | L | US3 | invite by email, accept flow, member list, removal |
| US6 | As a user, I want to reset my password and update my profile, so that I can manage my account | M | US2 | reset token email flow + profile update |

## Wave 4 — iteration 4

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US5 | As a workspace admin, I want role-based permissions enforced, so that members can't escalate | M | US4 | owner/admin/member checks on every workspace endpoint |
