# TaskFlow — Walkthrough

Current progress: feature **workspaces-accounts** is complete — all 4
waves shipped, validated, and audited (SPEC-AUDIT + DELIVERY-AUDIT: PASS).

## What exists today

### Accounts & sessions
- Register with name/email/password → verification email (token link)
- Email verification gates all workspace features
- Login issues RS256 JWT; wrong password → 401
- **Logout revokes the session server-side** — JWTs carry a
  `token_version` claim; logout and password reset increment it, so old
  tokens die immediately (not just client-side discard)
- Forgot/reset password via emailed token (1h expiry); reset also
  revokes existing sessions
- Profile update (first/last name); display name flows into workspace
  member lists

### Workspaces & roles
- Create / list / rename / delete workspaces
- Roles: `owner`, `admin`, `member` — enforced server-side on every
  endpoint through `WorkspaceService.requireMembership`/`requireRole`
- Permission matrix:
  - member: view workspace, member roster
  - admin: + rename workspace, invite members, remove members,
    revoke invites
  - owner: + delete workspace, remove admins, grant the admin role
- Invite by email (7-day token, MockMailbox/SMTP delivery), accept flow
  bound to the invitee's email — mismatched accounts get 403
- Pending invites visible to owner/admin only (members get 403)
- Workspace isolation: non-members get 403 on every scoped endpoint;
  users only ever see their own workspaces

### Frontend (React + TS, Vite)
- Auth pages: register, verify-email, login, forgot/reset password
- Home: workspace list, member roster, invite form (role select),
  pending invites, member removal — all role-gated in the UI to match
  server rules
- Profile editor on the home page

## Architecture

```
frontend (React SPA :5173) ──► backend (Quarkus :8080) ──► PostgreSQL
                                     │
                          Flyway migrations (V1, V2)
                          smallrye-jwt (RS256, keys in resources/keys)
                          quarkus-mailer (dev: logs mail; tests: MockMailbox)
```

- Backend: Quarkus 3.20, Java 17, Panache/Hibernate, layered
  resource → service → entity. Authorization has a single choke point
  (`requireMembership` + `requireRole`) — no endpoint bypasses it.
- Sessions: stateless JWT + `token_version` revocation counter.
- Tenancy: `workspace_members` table is the isolation boundary; every
  query is workspace-scoped server-side.

## Run it

```bash
# db
docker compose up -d db
# create test db once: docker exec taskflow-db-1 psql -U taskflow -d taskflow -c "CREATE DATABASE taskflow_test;"

# backend  (JDK 17 + Maven)
cd backend && mvn quarkus:dev          # :8080

# frontend
cd frontend && npm install && npm run dev   # :5173, proxies to :8080
```

## Verify

```bash
cd backend && mvn test       # 19/19 — AuthResourceTest 7, WorkspaceResourceTest 12
cd frontend && npm run build # tsc + vite, clean
```

## Spec artifacts

`specs/workspaces-accounts/` — SPEC, EXAMPLES.feature (12 scenarios,
all evidenced), BACKLOG (US1–US6), WAVES (4), GATES (5/5 met),
DECISION-REVIEW (challenger verdict REVISE → D6 implemented),
SPEC-AUDIT PASS, DELIVERY-AUDIT PASS, VALIDATION, PRODUCT map.

## Known limitations / next

- Access tokens live up to 1h; revocation is per-user (all sessions),
  not per-token. Refresh tokens deferred (D3).
- "Switch workspace" is per-request workspace id (no server-side
  active-workspace pointer) — sufficient for the current API shape.
- Emails are logged, not delivered, without SMTP config.
- Next feature candidates: projects/tasks inside workspaces, real-time
  collaboration, audit log.
