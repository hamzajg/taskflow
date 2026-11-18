# Spec: workspaces-accounts

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

Teams need a shared space to collaborate: people must be able to create an
account, sign in securely, organize themselves into workspaces (companies,
teams, or projects), invite members, and control what each member can do.
Without this foundation no collaboration feature (projects, tasks, billing)
can exist.

## Users

- **Workspace owner** — creates a workspace, invites members, manages roles.
- **Workspace admin** — manages members and settings inside a workspace.
- **Workspace member** — uses the workspace within granted permissions.

## Outcome hypothesis

- Expected user outcome: a new user can register, verify email, create or
  join a workspace, and see only what their role permits — in one sitting.
- Opportunity evidence: assumption — derived from standard SaaS onboarding
  expectations; no direct user research conducted.
- Signal: time-to-first-workspace (register → workspace created) and
  login success rate; baseline unknown, instrument after launch.
- Follow-up owner/date: product owner, first release review.

## Scope (in)

- Email + password registration and login (JWT access tokens).
- Email verification flow.
- Password reset flow.
- User profile (name, avatar optional).
- Workspaces: create, list, switch active workspace, rename, delete.
- Workspace membership: invite by email, accept/decline, remove member,
  member list.
- Roles per workspace: owner, admin, member — enforced server-side on
  every workspace-scoped endpoint.
- Session handling: logout, token refresh or re-login.

## Scope (out)

- Projects, tasks, time tracking, and all other product modules.
- Client/portal accounts (separate actor type — later feature).
- Billing, subscriptions, plans.
- Social/OAuth login, MFA.
- Real-time presence, chat, notifications beyond auth emails.
- Workspace-level settings beyond name (branding, locale) — later feature.

## Acceptance criteria

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | A visitor can register with name, email, password and receives a verification email | @w1 |
| 2 | An unverified user cannot use workspace features until email is verified | @w1 |
| 3 | A registered user can log in and receives a token; wrong credentials are rejected | @w1 |
| 4 | A logged-in user can log out, invalidating the token | @w1 |
| 5 | A user can create a workspace and becomes its owner | @w2 |
| 6 | A user can belong to multiple workspaces and switch the active one | @w2 |
| 7 | An owner/admin can invite a member by email; invitee accepts and joins | @w2 |
| 8 | Members can be listed and removed by owner/admin only | @w2 |
| 9 | A member cannot perform owner/admin actions (rename, remove members, delete workspace) | @w3 |
| 10 | Workspace data is isolated: users of workspace A cannot see workspace B data | @w3 |
| 11 | A user can request a password reset and set a new password via emailed token | @w3 |
| 12 | Profile shows the user's name/email and allows updating display name | @w3 |

## Decisions

- **D1 — Stack:** Quarkus (Java 17, RESTEasy Reactive or REST) backend +
  React/TypeScript (Vite) frontend. Justification: factory toolchain
  already provides Temurin 17 + Node; Quarkus gives fast startup, small
  footprint, and first-class OpenAPI for the SPA contract.
- **D2 — Data store:** PostgreSQL via Docker Compose for dev/test; schema
  managed by Flyway migrations (no ORM magic beyond Jakarta Persistence).
- **D3 — Auth:** JWT (smallrye-jwt) access tokens, short-lived; refresh
  via re-login for v1 (refresh tokens deferred).
- **D4 — Tenancy model:** workspace membership table is the isolation
  boundary; every workspace-scoped resource carries `workspace_id` and
  all queries are filtered by it server-side.
- **D5 — Naming:** product is "TaskFlow"; no references to any prior
  system anywhere in this repo.
