# Delivery audit — projects-tasks (spec)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/projects-tasks`
- Generated: 2026-11-18T06:20:35Z
- Phase: **spec**
- Findings: **3 blockers · 2 concerns · 0 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 10
- Scenarios: 15 (4 wave tags)
- Backlog items: 4
- Waves: 0
- Gates: 1
- Validation rows: 0
- Path claims checked: 3
- Changed files: 0
- In-scope paths: none recorded

## Blockers

- [unresolved-spec] `SPEC.md:37` — unresolved marker: - **Statuses**: fixed set per product — `backlog`, `todo`, `in_progress`,
- [unresolved-spec] `SPEC.md:95` — unresolved marker: - **D2 — Task status: fixed enum set (`backlog`, `todo`, `in_progress`,
- [unresolved-spec] `EXAMPLES.feature:81` — unresolved marker: Given a task in the "todo" column

## Concerns

- [missing-path] `GATES.md:5` — `LOOP.md` does not exist
- [endpoint-not-found] `SPEC.md:134` — PATCH /tasks/{id}/move was not found in source (expected if still planned)

## Unverified

None.

## Verdict (agent fills after verifying the code)

```
AUDIT: PASS | CONCERNS | BLOCK
PHASE: spec | delivery
BLOCKERS: <confirmed count and why>
CONCERNS: <accepted concerns and why>
UNVERIFIED: <what could not be checked>
EVIDENCE: <commands run, files read, tests observed>
```

Rules: `BLOCK` on any confirmed blocker, hallucinated claim, or
unproven acceptance criterion. `CONCERNS` only when every remaining
item is non-blocking and explicitly accepted. `PASS` only when all
three lists are empty. Never mark `PASS` from this brief alone.

## Auditor verdict (delivery-auditor, 2026-11-18)

```
AUDIT: CONCERNS
PHASE: spec
BLOCKERS: none confirmed — all 3 "unresolved-spec" findings are the literal
  domain value `todo` (status enum / board column), not unfinished work
  (SPEC.md:37, SPEC.md:95, EXAMPLES.feature:81); "endpoint-not-found
  PATCH /tasks/{id}/move" is planned scope recorded in BACKLOG US1, not a
  defect; "LOOP.md missing" is expected pre-start.
CONCERNS: accepted, non-blocking — (1) the task field-update verb and the
  api.ts `patch` helper are named only in BACKLOG US1 notes, not pinned in
  SPEC.md D8 (review verdict asked to name the update method explicitly);
  (2) minor contract tightenings from DECISION-REVIEW not propagated to
  SPEC text: dense/index-in-destination position semantics (D4), D10
  refetch-not-optimistic + single-fetch pins, D2 frontend status
  constant/label map, D1 flat-FK entity style, D6 default view for new
  projects. All are one-line spec additions; none leaves an AC unproven.
UNVERIFIED: none — all path/endpoint claims re-checked against source.
EVIDENCE: read SPEC.md, EXAMPLES.feature (15 scenarios), GATES.md,
  DECISION-REVIEW.md (D1–D12 + scorecard), BACKLOG.md (US1–US4);
  verified WorkspaceService.requireMembership/requireRole
  (WorkspaceService.java:39-65), api.ts get/post/put/delete only
  (api.ts:34-41, no patch — confirms review fact), flat-BIGINT FK style +
  ON DELETE CASCADE (V1__init.sql:25-39), Panache active-record
  WorkspaceMember; WAVES.md/LOOP.md correctly absent at spec phase.
```

Independent re-verification notes:
- REVISE answers ARE reflected: D3/AC-7 contradiction resolved (any member
  may create/edit/delete tasks; owner/admin delete projects — SPEC.md
  scope §in, AC-7, D3, and new @w1 scenario "Member can delete tasks but
  not projects" all agree); VARCHAR+service-validation status (D2);
  composite FK + consistency test (D7); project→task cascade + position
  compaction (D12); FOR UPDATE move serialization (D4); former-member
  assignee rendering (D9); activeWorkspaceId scoping + null-workspace
  empty state (D6); touch/menu fallback noted in BACKLOG US3.
- ACs 1–10 each map to @w tags; all 15 scenarios are behavior-level
  Given/When/Then with no implementation leakage.
- G1 gate is falsifiable: `file:specs/projects-tasks/DECISION-REVIEW.md`
  exists and is a complete D1–D12 review with verdict REVISE + smallest
  next step.
- No legacy/TODO/FIXME references in specs/; WAVES.md absence is expected
  (produced by wave_plan in plan phase; EXAMPLES header mention is a
  forward reference only).
