# Delivery audit — project-tags (spec)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/project-tags`
- Generated: 2026-11-20T13:43:13Z
- Phase: **spec**
- Findings: **0 blockers · 2 concerns · 0 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 5
- Scenarios: 15 (3 wave tags)
- Backlog items: 3
- Waves: 0
- Gates: 1
- Validation rows: 0
- Path claims checked: 2
- Changed files: 0
- In-scope paths: none recorded

## Blockers

None. This is not a pass: verify semantics before accepting.

## Concerns

- [scenario-uncovered] `EXAMPLES.feature:85` — scenario `Edit a project and update its tags` is not referenced by any acceptance criterion
- [missing-path] `GATES.md:5` — `LOOP.md` does not exist

## Unverified

None.

## Verdict

```
AUDIT: CONCERNS
PHASE: spec
BLOCKERS: 0
CONCERNS: 1 accepted — `LOOP.md` does not exist yet; it is created by `ship_loop` when wave planning starts, so its absence at spec-audit time is expected, not a defect. The scenario-uncovered finding was fixed by adding the edit-mode scenario to AC5 before this verdict.
UNVERIFIED: none — spec is pre-implementation; all checks are structural.
EVIDENCE: read SPEC.md, EXAMPLES.feature, BACKLOG.md, GATES.md, DECISION-REVIEW.md; verified all 15 scenarios trace to the 5 AC rows; verified every spec path claim against backend/src/main/java/com/taskflow and frontend/src.
```