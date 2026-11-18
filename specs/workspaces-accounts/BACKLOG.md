# Backlog: workspaces-accounts

## US1 — As a visitor, I want to register and verify my email, so that I have a secure account
- Scenarios: @w1
- Size: M
- Notes: registration endpoint + verification email + verify flow

## US2 — As a user, I want to log in and log out with a token, so that my session is secure
- Scenarios: @w1
- Size: M
- Notes: JWT issue/validate, wrong-password rejection, logout

## US3 — As a user, I want to create and switch workspaces, so that I can organize my teams
- Scenarios: @w2
- Depends: US1, US2
- Size: M
- Notes: workspaces CRUD + active-workspace context

## US4 — As an owner/admin, I want to invite and manage members, so that my team can collaborate
- Scenarios: @w2
- Depends: US3
- Size: L
- Notes: invite by email, accept flow, member list, removal

## US5 — As a workspace admin, I want role-based permissions enforced, so that members can't escalate
- Scenarios: @w3
- Depends: US4
- Size: M
- Notes: owner/admin/member checks on every workspace endpoint

## US6 — As a user, I want to reset my password and update my profile, so that I can manage my account
- Scenarios: @w3
- Depends: US2
- Size: M
- Notes: reset token email flow + profile update
