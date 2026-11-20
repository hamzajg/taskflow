# Decision review brief — Spec: default-workspace

- Source: `specs/default-workspace/SPEC.md (## Decisions)`
- Generated: 2026-11-20T08:42:06Z
- Detected type: ux, api
- Readiness: **READY** (6/6 record elements)
- This brief is input to judgment, not a verdict. The agent fills the scorecard after reading the code.

**Reversibility:** stated

**Alternatives on record (verify they are credible, not strawmen):**
- A GET /workspaces side-effect would violate REST semantics. - Options considered: (a) provision inside AuthService.register; (b) lazy-provision inside GET /work
- An unverified user can log in. - Options considered: (a) skip provisioning until verifiedAt != null; (b) provision for everyone at login. - Decision & why: (b).
- Context & forces: needs to feel personal but never be blank. - Options considered: (a) fixed "My Workspace"; (b) "<firstName>'s Workspace"; (c) "<email-local>'s

## Evidence signals (heuristic — verify before acting)

- no code paths referenced — the review is document-only

## Design moves to test

- Which user journey does this serve, including empty, error, and slow states?
- What is the accessibility and keyboard path?
- Where does the UI hold state that belongs to the domain?
- Is this a public contract or an implementation detail? Who depends on it?
- How will it version, and what is the backward-compatibility promise?
- Are errors part of the contract — consistent shape, codes, retry semantics — or an afterthought?
- Is the contract documented where consumers can find it (OpenAPI, AsyncAPI, schema registry, docs site), and is the doc generated from code or hand-maintained?
- Which fields and operations are stable vs experimental, and what is the deprecation path?
- Is authn/authz explicit per operation with least privilege, and is that visible in the docs?
- Are writes idempotent where clients can retry (idempotency keys, natural keys, upserts)?
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
- Who are the consumers, and what is the deprecation policy?
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

## Scorecard (agent fills; 1 = poor, 5 = strong, evidence required)

| Lens | Score | Evidence (file:line, test, benchmark) | Action |
|------|-------|----------------------------------------|--------|
| Problem & forces | 4 | register→login gap confirmed in AuthService.java:34-62 | none |
| Alternatives & tradeoffs | 4 | D1 compares register/login/GET-side-effect | none |
| Domain fit (DDD) | 4 | workspace+owner membership mirrors WorkspaceService.create | none |
| Architecture & boundaries | 3 | CDI cycle AuthService↔WorkspaceService found by challenger | resolved via D5 dedicated bean |
| Testable design | 3 | concurrency + 403-gating gaps found | resolved: user-row lock, service-level assertion |
| Craftsmanship | 4 | name-length lockout found | resolved: ≤255 truncation rule (D3) |
| Decision record | 5 | D1–D5 with options/consequences/reversibility | none |

## Verdict (agent fills)

```
VERDICT: REVISE → findings folded; post-fold verdict ACCEPT
STEELMAN: lazy provisioning at the single authenticated entry point covers new
  and legacy users in one transactional path with zero schema change.
SMALLEST NEXT STEP (applied): dedicated provisioning bean + user-row lock +
  name truncation + corrected D2 rationale.
REVISIT TRIGGER: if users report unwanted re-provisioning after deleting
  their last workspace (D4), or if onboarding gains a dedicated endpoint.
```

Challenger findings (all folded into SPEC.md/EXAMPLES.feature/BACKLOG.md):
1. GET /workspaces IS 403-gated via currentUser()→requireVerified — D2
   rationale rewritten; unverified scenario asserted at data layer.
2. Race condition unspecified — resolved: pessimistic lock on User row (D-scope,
   no migration).
3. AuthService↔WorkspaceService CDI cycle + requireVerified bypass — resolved
   via D5 DefaultWorkspaceService bean.
4... 6. Name-length lockout (VARCHAR 255) → truncation rule; deleted-last-
   workspace resurrection documented as intended (D4); sidebar auto-select
   gap → US2 now includes the AppShell change; existing-test churn flagged
   in BACKLOG.

Run the review with `/challenge-decision` and the `decision-challenger`
subagent. It is advisory: it never blocks a gate or a merge.
