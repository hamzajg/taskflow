# Delivery audit — time-tracking (delivery)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/time-tracking`
- Generated: 2026-11-20T17:10:32Z
- Phase: **delivery**
- Findings: **1 blockers · 4 concerns · 1 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 6
- Scenarios: 16 (3 wave tags)
- Backlog items: 3
- Waves: 3
- Gates: 1
- Validation rows: 6
- Path claims checked: 2
- Changed files: 7
- In-scope paths: none recorded

## Blockers

- [placeholder-wave-evidence] `LOOP.md` — wave 3 is done but its evidence is a placeholder: correcting PR ref (was recorded as 0)

## Concerns

- [ac-weak-evidence] `VALIDATION.md` — AC 6 has only weak token-match evidence: (weak) tags.test.tsx, time-tracking.test.tsx
- [unfinished-code] `frontend/src/components/TimeSection.tsx:221` — shipped code contains an unfinished marker: placeholder="What did you work on?"
- [unfinished-code] `frontend/src/pages/BoardView.tsx:32` — shipped code contains an unfinished marker: const [moveStatus, setMoveStatus] = useState('todo')
- [unfinished-code] `frontend/src/pages/projectTypes.ts:75` — shipped code contains an unfinished marker: export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'done'] as const

## Unverified

- [scope-no-paths] `SPEC.md` — scope drift not checked — no in-scope paths recorded

## Verdict (agent fills after verifying the code)

```
AUDIT: CONCERNS
PHASE: delivery
BLOCKERS: 0 confirmed. [placeholder-wave-evidence] rejected — LOOP.md wave-3
  note is garbled bookkeeping ("correcting PR ref (was recorded as 0)"), but the
  real evidence bundle exists and verifies: .openharness/evidence/
  time-tracking/20261120T170947Z-2a3b45b (verdict pass, head 2a3b45b, 7
  screenshots incl. board chips, project totals, dark theme). Wave-3 evidence
  is present; only the LOOP.md pointer text is wrong.
CONCERNS:
  - [new] PATCH /time-entries/{id} does not validate description length:
    TimeEntryService.update (backend/.../service/TimeEntryService.java:94-96)
    calls cleanDescription() without the ≤500 check that create() applies;
    a >500-char PATCH hits VARCHAR(500) and surfaces as a 500 instead of 400.
    Edge-case only; create path and all ACs are correctly validated.
  - [ac-weak-evidence] dismissed — time-tracking.test.tsx:418-455 has a real
    @w3 describe iterating light+dark asserting labelled controls; adequate.
  - [unfinished-code] x3 dismissed — TimeSection.tsx:221 placeholder is a
    legitimate input hint; BoardView.tsx:32 'todo' and projectTypes.ts:75
    TASK_STATUSES are pre-existing domain constants, not wave-3 code.
  - [scope-no-paths] dismissed — drift assessed manually: changed files
    (V6 migration, TimeEntryService/Resources, TaskService totals,
    TimeSection, TaskDetailPage, TaskItem, BoardView, ProjectDetailPage,
    projectTypes) all match SPEC scope; nothing out-of-scope touched.
UNVERIFIED: backend test suite not re-run by auditor (no mvn on PATH); relied
  on surefire report backend/target/surefire-reports/
  com.taskflow.TimeEntryResourceTest.txt (6/6 pass, 2026-11-20 17:42, wave-1
  build). Frontend time-tracking.test.tsx re-run live: 9/9 pass.
EVIDENCE: read SPEC.md, V6__time_entries.sql, TimeEntryService.java,
  TimeEntryResource/TimeEntryItemResource.java, TimeEntryResourceTest.java,
  TaskService.toDtos, ProjectDtos.TaskDto, TimeEntry.tsx/Dtos, TimeSection.tsx,
  time-tracking.test.tsx, TaskDetailPage/ProjectDetailPage/BoardView/
  TaskItem/projectTypes diffs for all 3 wave commits; inspected LOOP.md,
  evidence bundle 20261120T170947Z-2a3b45b; ran
  `vitest run src/__tests__/time-tracking.test.tsx` → 9/9 pass.
  All 6 ACs verified in code + tests: composite-FK tenancy + cascade (V6:18-20),
  partial unique index one-running-timer (V6:33-34), author/admin authz +
  running-entry 409s (TimeEntryService:76-112), minutes 1-1440/future-date/
  desc≤500 create validation (197-221), timer start/stop/running-discovery
  (114-157), totalMinutes grouped aggregation on every TaskDto path
  (TaskService:87-92), project/board time chips + live onChanged refresh.
```

Rules: `BLOCK` on any confirmed blocker, hallucinated claim, or
unproven acceptance criterion. `CONCERNS` only when every remaining
item is non-blocking and explicitly accepted. `PASS` only when all
three lists are empty. Never mark `PASS` from this brief alone.
