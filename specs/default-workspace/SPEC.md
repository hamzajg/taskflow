# Spec: default-workspace

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

A newly registered user who verifies their email and logs in lands on an
empty product: no workspace exists, so the dashboard shows nothing and the
only path forward is discovering and using "New workspace". For an
intuitive-mode product this first-run friction is the single biggest
activation blocker — the user must perform setup before seeing any value.

## Users

New registrants (primary); also legacy users who registered before this
feature and still have zero workspace memberships.

## Outcome hypothesis

- Expected user outcome: after register → verify → login, the user sees a
  named default workspace already selected in the sidebar and usable
  dashboard/projects data — zero setup actions.
- Opportunity evidence: user direction ("UX intuitive mode… default
  workspace created by default, no additional action required"); current
  code confirms `register` creates only a `User` row and `login` does no
  provisioning (`AuthService.java`).
- Signal: a fresh verified login returns ≥1 workspace from `GET /workspaces`
  and the dashboard renders stats without any create/select action.
- Follow-up owner/date: agent, at feature finish.

## Scope (in)

- Backend: on successful `POST /auth/login`, when the user has zero
  workspace memberships, transactionally create a default workspace with the
  user as `owner` member.
- Idempotency mechanism: pessimistic lock on the `User` row inside the login
  transaction so concurrent first-logins cannot double-provision (no schema
  migration required).
- Default workspace naming rule with length guard (see D3).
- Coverage for legacy users (zero memberships at next login).
- Frontend: auto-select the provisioned workspace in the sidebar when it is
  the user's only workspace (currently only page-level fallbacks exist).

## Scope (out)

- Changing email-verification requirements (`requireVerified` still gates
  content creation).
- Template/sample data inside the default workspace.
- Any change to `POST /workspaces` or the create drawer.
- Provisioning at registration time (register issues no session; login is
  the single provisioning point).
- Multiple default workspaces, per-role defaults, or an `is_default` flag —
  the provisioned workspace is an ordinary workspace.
- Guarding against re-provisioning after a user deletes their last
  workspace — intended behavior: every user always has ≥1 workspace (D4).

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | First login for a membership-less user provisions exactly one default workspace with owner role; name is personal, blank-safe and length-safe | Login provisions a default workspace for a user with no memberships; Default workspace names the user; Over-long first names cannot break login |
| 2 | Provisioning is idempotent: repeat logins and users who already have workspaces are untouched; concurrent first-logins are serialized by a user-row lock | Repeat logins do not duplicate the default workspace; Users with existing workspaces get no extra workspace; Concurrent first logins provision at most one workspace |
| 3 | Legacy users with zero memberships are covered on next login | Legacy user with no memberships gets a default workspace on login |
| 4 | Unverified users still receive the workspace at the data layer (API stays 403-gated until verification) | Unverified user receives a default workspace on login |
| 5 | After login the workspace is active in the UI with no selection action | Dashboard auto-selects the default workspace; Account page lists the default workspace; Sidebar shows the default workspace as selected |

## Decisions

### D1 — Provision at login, lazily, not at register

- Context & forces: `register` returns only a `UserDto` and no session — the
  user must verify email then call `login` anyway. Provisioning at register
  would create workspace rows for abandoned signups and still miss legacy
  users. A `GET /workspaces` side-effect would violate REST semantics.
- Options considered: (a) provision inside `AuthService.register`; (b)
  lazy-provision inside `GET /workspaces`; (c) lazy-provision inside
  `AuthService.login` when membership count is zero.
- Decision & why: (c). Login is the single authenticated entry point every
  real session passes through; it covers new AND legacy users in one
  transactional code path; no REST violation; register stays a pure
  account-creation call.
- Consequences: + one place, full coverage, trivially testable. − a user who
  never logs in has no workspace (irrelevant — they can't use the app).
- Reversibility: two-way door — provisioning could later move to register or
  an onboarding endpoint without schema change.

### D2 — Provision regardless of verification status

- Context & forces: `WorkspaceResource.currentUser()` calls
  `requireVerified`, so ALL workspace endpoints — including `GET
  /workspaces` — return 403 for unverified users. An unverified user CAN
  log in, but cannot observe the workspace via the API until verified.
- Options considered: (a) skip provisioning until `verifiedAt != null`;
  (b) provision for everyone at login.
- Decision & why: (b). The workspace row itself is not sensitive; skipping
  would create a second code path ("provision on first verified action") and
  an inconsistent DB state. The unverified scenario is asserted at the
  service/entity level (or after verify-then-login), NOT via `GET
  /workspaces` which correctly 403s.
- Consequences: + simplest rule — "every user row always has ≥1 workspace
  membership in the DB". − the workspace is invisible to unverified users
  via API (they see the existing verify banner instead — coherent UX).
- Reversibility: two-way door — a `verifiedAt` check can be added later.

### D3 — Default workspace name with length guard

- Context & forces: `RegisterRequest.firstName` is `@NotBlank` with no
  `@Size`; `workspaces.name` is `VARCHAR(255)`. An unbounded
  `"<firstName>'s Workspace"` can overflow the column and roll back the
  login transaction — a lockout bug.
- Options considered: (a) fixed "My Workspace"; (b)
  `"<firstName>'s Workspace"`; (c) `"<email-local>'s Workspace"`.
- Decision & why: (b) — `firstName.trim()` capped so the final name is
  ≤ 255 chars (truncate the first-name portion), falling back to "My
  Workspace" when blank after trim. Personal without leaking the email
  address; the cap makes the lockout impossible.
- Consequences: + friendly default, no login failure mode. − name is
  immutable unless user renames (rename already exists in the drawer).
- Reversibility: two-way door — naming rule is one helper method.

### D4 — Deleted-last-workspace resurrection is intended

- Context & forces: an owner can delete their only workspace; the next
  login would re-provision a default.
- Decision & why: intended. The invariant "every user always has ≥1
  workspace" is simpler than tracking deletion intent, and a user who
  deletes their last workspace almost certainly wants a fresh start, not a
  broken empty state. Documented so it isn't "fixed" later by accident.
- Reversibility: two-way door — a `never_provisioned` flag could be added
  if this proves surprising.

### D5 — Provisioning lives in a dedicated bean, not WorkspaceService

- Context & forces: `WorkspaceService` already injects `AuthService`; having
  `AuthService.login` call `WorkspaceService` would create a CDI circular
  dependency. `WorkspaceService.create()` also calls `requireVerified`,
  which must be bypassed for unverified provisioning (D2).
- Options considered: (a) `AuthService` persists `Workspace` +
  `WorkspaceMember` entities directly; (b) new `DefaultWorkspaceService`
  bean injected into `AuthService` (no back-edge → no cycle); (c) lazy
  `Instance<WorkspaceService>` injection.
- Decision & why: (b). Keeps provisioning logic in one SRP-focused,
  independently testable bean; entities stay an implementation detail;
  `WorkspaceService.create()` and its verification gate remain untouched.
- Consequences: + no cycle, no gate bypass hacks, unit-testable in
  isolation. − one more small class.
- Reversibility: two-way door — internal refactor only.
