# Decision review brief — Spec: profile-page

- Source: `specs/profile-page/SPEC.md (## Decisions)`
- Generated: 2026-11-20T10:01:45Z
- Detected type: ux, data
- Readiness: **CHALLENGE** (6/6 record elements)
- This brief is input to judgment, not a verdict. The agent fills the scorecard after reading the code.

**Reversibility:** stated

**Alternatives on record (verify they are credible, not strawmen):**
- /account is a grab-bag: the Workspaces administration panel and the Profile editing card are stacked on one page, reached through two sidebar links that only di
- /account#profile).
- Options: (a) split into /workspaces + /profile and drop /account; (b) keep /account for workspaces, add /profile. - Decision & why: (b). /account is already lin
- Context & forces: old links/bookmarks may carry #profile. - Options considered: (a) ignore the hash (lands on workspaces — silent wrong page); (b) client-side r

## Evidence signals (heuristic — verify before acting)

- no code paths referenced — the review is document-only

## Design moves to test

- Which user journey does this serve, including empty, error, and slow states?
- What is the accessibility and keyboard path?
- Where does the UI hold state that belongs to the domain?
- Which invariant spans more than one aggregate, and does the transaction span it too?
- Can the write model be separated from read shapes without splitting the database?
- What is the migration and rollback path for existing data?
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
- Which consistency guarantee is required, and which can be eventual?
**Good looks like:** Ubiquitous language is explicit, invariants are protected at the boundary, external models are translated.

### 4. Architecture & boundaries
- Which direction do dependencies point? Can the core be tested without the framework, DB, or network?
- What is the smallest boundary that isolates this change (module, port, package)?
- What happens when each external dependency is slow, down, or returns garbage?
- Where does data ownership live, and is there a second writer?
- What is the operational story: config, migrations, rollout, rollback, observability?
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
| Problem & forces | 4 | AccountPage.tsx stacks both cards; hash-only nav | none |
| Alternatives & tradeoffs | 4 | /account vs /workspaces rename weighed (D1) | keep /account |
| Domain fit (DDD) | 4 | profile vs workspace-admin are distinct bounded contexts | none |
| Architecture & boundaries | 4 | route-level split, no backend change | none |
| Testable design | 3 | challenger found 3 unlisted breaking test files | folded into BACKLOG |
| Craftsmanship | 4 | render-time redirect avoids flash; dead hash logic removed | folded |
| Decision record | 5 | D1–D3 with options/consequences/reversibility | none |
| Problem & forces | | | |
| Alternatives & tradeoffs | | | |
| Domain fit (DDD) | | | |
| Architecture & boundaries | | | |
| Testable design | | | |
| Craftsmanship | | | |
| Decision record | | | |

## Verdict (agent fills)

```
VERDICT: REVISE → findings folded; post-fold ACCEPT
STEELMAN: dedicated /profile route + workspaces-only /account matches the
  app's one-page-per-surface structure with minimal churn.
SMALLEST NEXT STEP (applied): render-time Navigate wrapper, full test-
  migration list, retag shell-state scenario to @w1, delete dead hash logic.
REVISIT TRIGGER: if /account proves confusing as a name for workspaces-only,
  add a /workspaces alias later (two-way door).
```

Run the review with `/challenge-decision` and the `decision-challenger`
subagent. It is advisory: it never blocks a gate or a merge.
