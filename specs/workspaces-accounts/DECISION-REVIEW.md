# Decision review brief — Spec: workspaces-accounts

- Source: `specs/workspaces-accounts/SPEC.md (## Decisions)`
- Generated: 2026-11-18T00:13:01Z
- Detected type: ux, security
- Readiness: **CHALLENGE** (5/6 record elements)
- This brief is input to judgment, not a verdict. The agent fills the scorecard after reading the code.

**Missing before this is reviewable:**
- `alternatives` — list at least two credible alternatives, including the simplest one

**Reversibility:** not stated — one-way doors need more scrutiny

## Evidence signals (heuristic — verify before acting)

- `backend/src/main/java/com/taskflow` — 10 source file(s); not a domain path, so layering checks were skipped
- `frontend/src` — 12 source file(s); not a domain path, so layering checks were skipped

Inspected: `backend/src/main/java/com/taskflow`, `frontend/src`

## Design moves to test

- Which user journey does this serve, including empty, error, and slow states?
- What is the accessibility and keyboard path?
- Where does the UI hold state that belongs to the domain?
- What is the threat model, and which asset is actually being protected?
- Where are secrets stored, rotated, and audited?
- What is the least privilege this component needs?
- Invert a dependency so the unstable thing depends on the stable thing.
- Make an implicit boundary or invariant explicit before adding mechanism.
- Shrink the decision: can half of it ship independently and reversibly?

## Challenge questions

### 1. Problem & forces
- What user/business outcome does this serve, and what breaks if we do nothing?
- Which quality attributes actually drive it (correctness, latency, cost, operability, compliance, time-to-market)? Rank them.
- Which constraints are fixed (budget, deadline, team, contracts) and which are assumed?
- Who owns this decision, and who must live with the consequences?
**Good looks like:** The dominant force is named, and "do nothing" is treated as a real option.

### 2. Alternatives & tradeoffs
- What are at least two credible alternatives, including the simplest thing that could work?
- For each: what does it make easy, what does it make hard, and what does it cost to reverse?
- Is this a one-way or two-way door? If one-way, what evidence justifies it?
- What would have to be true for the chosen option to be wrong?
**Good looks like:** A tradeoff matrix names winners and losers; reversibility is explicit; no strawman options.

### 3. Domain fit (DDD)
- Which bounded context owns this concept, and is the boundary drawn around language or deployment?
- Which terms are overloaded across contexts, and where is the translation (anti-corruption layer)?
- What are the aggregates, their invariants, and the transaction boundary? Does one transaction span aggregates?
- Are domain events the right integration mechanism, or is this a synchronous dependency?
- Does the model carry behavior, or is it an anemic data bag?
**Good looks like:** Ubiquitous language is explicit, invariants are protected at the boundary, external models are translated.

### 4. Architecture & boundaries
- Which direction do dependencies point? Can the core be tested without the framework, DB, or network?
- What is the smallest boundary that isolates this change (module, port, package)?
- What happens when each external dependency is slow, down, or returns garbage?
- Where does data ownership live, and is there a second writer?
- What is the operational story: config, migrations, rollout, rollback, observability?
- What is the blast radius if this control fails?
**Good looks like:** Policy depends on nothing; mechanisms are adapters; failure and migration paths are named.

### 5. Testable design
- Where are the seams? Can time, randomness, IO, and external calls be injected?
- Which behaviors get fast unit tests, which need integration, which need contract tests?
- Does each acceptance criterion map to an observable check, or only to implementation details?
- Are the tests deterministic and independent (no shared state, no sleeps)?
- What is the failure signal when this decision turns out wrong in production?
**Good looks like:** Behavior-first tests, deterministic seams, scenario-to-test traceability, a named failure signal.

### 6. Craftsmanship
- Is this the smallest reversible step, or a big-bang change?
- Are names from the domain, or from the framework/table?
- Is the error model explicit (typed failures vs exceptions vs silent nulls)?
- Is there speculative abstraction (interfaces with one implementation, config nobody sets)?
- Is the migration path documented and rollback-able?
**Good looks like:** Small steps, intention-revealing names, explicit errors, no speculative generality, documented migration.

### 7. Decision record
- Are status, owner, and date recorded?
- Are consequences (positive and negative) written down?
- Is there a revisit trigger (metric, date, event)?
- Are links to evidence, code, and related ADRs present?
**Good looks like:** A future reader can tell why, what was traded, and when to revisit.

## Challenger findings

### Steelman

The decisions are a deliberately boring, industry-standard stack chosen for a
single-developer/learning-scale SaaS foundation: Quarkus + React SPA, one
PostgreSQL schema owned by Flyway, stateless JWT auth, and `workspace_members`
as the single tenancy boundary. The implementation already exists and is
internally consistent: every `/workspaces/{id}/...` endpoint funnels through
`WorkspaceService.requireMembership`/`requireRole`
(`backend/.../service/WorkspaceService.java:42-68`) before touching data, and
all workspace-scoped queries filter by `workspaceId`
(`WorkspaceService.java:47,115,133,150,179,190,206`). The decisions optimize
for: time-to-first-collaboration-feature, one language/toolchain the factory
already provides, and a single isolation mechanism that is easy to audit.
A reasonable team chooses this because the alternative (custom auth, schema
per tenant, server-side sessions) costs weeks and buys nothing at this scale.

### Alternatives considered

- **A1 — Do less / simplify:** session-cookie auth (server-side sessions) or
  an existing auth library (Keycloak) instead of hand-rolled JWT. *Wins:*
  instant logout/revocation for free. *Loses:* another moving part or a second
  auth model; Keycloak is overkill for one repo. *Reversible:* yes, but
  migration is a rewrite of every client's token handling.
- **A2 — Smaller reversible step:** keep JWT but add a per-user `token_version`
  column (or a short denylist) so logout/password-reset actually revoke tokens.
  *Wins:* closes the AC4 gap with one column + one check. *Loses:* a DB read
  per request (already happening via `requireUser`), tiny. *Reversible:* yes.
  This is the recommended step — it is a module-sized change, not a rewrite.
- **A3 — Tenant-per-schema or RLS:** PostgreSQL row-level security or
  schema-per-workspace instead of application-level `workspaceId` filtering.
  *Wins:* DB-enforced isolation, defense in depth. *Loses:* significant
  complexity for a single-service app; every query still needs the filter for
  correctness of joins. *Reversible:* painful — schema changes everywhere.
  Rejected for v1; worth revisiting only if a second service or compliance
  requirement appears.

### Tradeoff matrix (decisive rows)

| Force | D1–D5 as chosen | A1 (sessions/Keycloak) | A2 (token_version) | A3 (RLS/schema-per-tenant) |
|---|---|---|---|---|
| Simplicity | winner — one stack, one auth mechanism | loser — extra infra or library | near-tie — one column | loser — migration + query complexity |
| Correctness of isolation (D4) | winner for v1 — single choke point, tested | n/a | unchanged | winner at scale — DB-enforced |
| Reversibility | winner — all two-way doors so far | session→JWT is a rewrite | winner — additive column | loser — hard to reverse |
| Testability | winner — REST-assured integration tests exist | unverified | unchanged | loser — needs RLS-aware test DB |
| Operability | winner — stateless JWT scales trivially | loser — session store | unchanged | loser — per-tenant ops |

Loser named: A3 loses on every row except defense-in-depth; A1 loses on
simplicity and reversibility.

### Lens notes

- **DDD:** `workspace_members` is the real aggregate boundary; `Workspace`,
  `WorkspaceMember`, `WorkspaceInvite` are anemic Panache entities with public
  fields (`model/WorkspaceMember.java` etc.) — acceptable at this size, but
  invariants (role transitions, "cannot remove owner") live in
  `WorkspaceService`, not the model. Consistent, explicit, testable.
  Ubiquitous language is clean: owner/admin/member, invite, workspace.
- **Architecture:** resources are thin; services hold policy; entities are
  persistence. Dependency direction is correct (resource → service → model).
  Failure mode: mailer failures are swallowed to a WARN
  (`AuthService.java:139-146`, `WorkspaceService.java:163-171`) — deliberate
  for dev, but a production deploy needs alerting on that log line or emails
  silently "send" while never arriving.
- **Testable design:** `@QuarkusTest` + REST-assured + `MockMailbox` give
  real end-to-end coverage of register→verify→login→workspace→invite→isolation
  (`WorkspaceResourceTest`, `AuthResourceTest`). No sleeps, real DB.
  Gaps: no test that a `member` role cannot rename/delete (AC9 partially
  covered — removal-after-removal returns 403, but role-denial on
  `PUT /{id}` untested); no test for logout invalidation; no negative test
  for accepting an invite with a mismatched email.
- **Craft:** names are intention-revealing; error model is `WebApplicationException`
  with HTTP status — explicit enough. One redundancy: `removeMember`
  (`WorkspaceService.java:129-131`) re-checks member role after
  `requireRole` already restricted to owner/admin — dead code, harmless.
  `InviteDto` returns the raw invite `token` to any owner/admin
  (`WorkspaceService.java:172,181`) — the token is also emailed; exposing it
  in list responses widens the blast radius if an admin account is
  compromised (mitigated by the email-match check in `acceptInvite:202`).

### Verified claims vs facts

- D1 stack: verified — Quarkus resources/services/resources layout matches;
  frontend is Vite+React+TS (`frontend/src/api.ts`, `App.tsx`).
- D2 Postgres+Flyway: verified — `db/migration/V1__init.sql`,
  `quarkus.flyway.migrate-at-start=true`, `hibernate-orm.database.generation=none`
  (`application.properties`). Sequence `INCREMENT BY 50` workaround is
  documented in the migration comments — fragile but explicit.
- D3 JWT: verified — RS256 via smallrye-jwt, 3600s expiry
  (`JwtService.java:29`, `application.properties` `lifespan=3600`).
  **Gap:** logout is stateless — `AuthResource.logout` (lines 87-93) only
  returns 204; the token remains valid until expiry. AC4 says "log out,
  invalidating the token"; SPEC.md scope says "logout, token refresh or
  re-login" — re-login was chosen, so this is a *recorded interpretation*,
  but a stolen token is usable for up to 1h with no revocation path.
- D4 tenancy: verified — `requireMembership` gates every workspace-scoped
  endpoint; cross-workspace access returns 403
  (`WorkspaceResourceTest.non_member_cannot_access_workspace`).
  **Gap:** no server-side "active workspace" — switching is client-side
  (`WorkspacePanel` `openId` state); acceptable since every call is
  path-scoped, but AC6's "switch" is a UI concern only.
- D5 naming: verified — no foreign-system references found in inspected files.

## Scorecard (agent fills; 1 = poor, 5 = strong, evidence required)

| Lens | Score | Evidence (file:line, test, benchmark) | Action |
|------|-------|----------------------------------------|--------|
| Problem & forces | 4 | SPEC.md Problem/Users/ACs are concrete; dominant force (collaboration foundation) named; "do nothing" implicitly covered by scope-out list | Record ranked forces + do-nothing cost in Decisions |
| Alternatives & tradeoffs | 3 | Decisions list justifications but no alternatives; brief flags `alternatives` missing; reversibility unstated | Add alternatives + reversibility note per decision |
| Domain fit (DDD) | 4 | Clean bounded context (users/workspaces/membership/invites); invariants enforced in `WorkspaceService.requireRole`/`requireMembership` (lines 42-68, 129-141); anemic entities acceptable at this scale | Consider moving role invariants into `WorkspaceMember` when a second writer appears |
| Architecture & boundaries | 4 | Thin resources → services → Panache entities; tenancy choke point is single and tested (`WorkspaceResourceTest:124-138`); mailer failure swallowed (`AuthService.java:139-146`) | Alert on mail-send WARN in prod; consider token_version for revocation |
| Testable design | 4 | `@QuarkusTest` REST-assured + `MockMailbox`; isolation, unverified-gating, invite flow all covered (`WorkspaceResourceTest`, `AuthResourceTest`); gaps: member-role denial on rename/delete, logout invalidation, invite email-mismatch | Add the three missing negative tests before wave 4 closes AC9/AC10 |
| Craftsmanship | 4 | Small reversible steps already taken; intention-revealing names; explicit error model; minor dead code `WorkspaceService.java:129-131`; invite token exposed in DTOs (`AuthDtos.InviteDto`) | Drop redundant role check; stop returning raw invite token in list/get responses |
| Decision record | 2 | SPEC.md `## Decisions` has no status/owner/date/alternatives/consequences/revisit trigger; brief readiness CHALLENGE (5/6) | This review supplies the missing elements; fold revisit triggers back into SPEC or an ADR |

## Verdict (agent fills)

```
VERDICT: REVISE
STEELMAN: A boring, standard stack (Quarkus+React, Postgres+Flyway, short-lived
  JWT, membership-table tenancy) is the right foundation; the code already
  implements it consistently and the isolation boundary is a single,
  well-tested choke point.
SMALLEST NEXT STEP: Record the missing decision-record elements — for D3
  explicitly state that stateless logout means tokens live until expiry (up to
  1h) and add a revisit trigger; optionally implement the `token_version`
  column (alternative A2) before wave 3 builds session assumptions on it.
  Also add the three missing negative tests (member cannot rename/delete,
  invite email-mismatch, logout behavior) so AC9/AC10 evidence is complete.
REVISIT TRIGGER: reopen D3 if a stolen/expired-session incident occurs, if a
  compliance requirement demands immediate revocation, or at the first release
  review if AC4 is audited as "server-side invalidation required"; reopen D4
  (move to RLS/schema-per-tenant) only if a second service or tenant-count
  growth makes application-level filtering the bottleneck.
```

Run the review with `/challenge-decision` and the `decision-challenger`
subagent. It is advisory: it never blocks a gate or a merge.
