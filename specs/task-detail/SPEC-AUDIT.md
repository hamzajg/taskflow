# Delivery audit — task-detail (spec)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/task-detail`
- Generated: 2026-11-19T19:29:34Z
- Phase: **spec**
- Findings: **0 blockers · 1 concerns · 0 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 10
- Scenarios: 12 (3 wave tags)
- Backlog items: 3
- Waves: 0
- Gates: 1
- Validation rows: 0
- Path claims checked: 3
- Changed files: 0
- In-scope paths: none recorded

## Blockers

None. This is not a pass: verify semantics before accepting.

## Concerns

- [endpoint-not-found] `SPEC.md:164` — GET /tasks/{id}/comments was not found in source (expected if still planned)

## Unverified

None.

## Verdict (agent fills after verifying the code)

```
AUDIT: PASS
PHASE: spec
BLOCKERS: 0 — every backticked path/endpoint/command/migration claim in
  SPEC.md was re-verified against the repo (see DISMISSED/EVIDENCE); the
  one brief finding (comments endpoints absent) is planned API defined
  by D5, not a hallucination. AC→@w-tag traceability is complete: all 10
  ACs reference only @w1/@w2/@w3, all 12 EXAMPLES scenarios carry those
  tags, and the 3 BACKLOG stories map 1:1 to the 3 waves.
CONCERNS: 0 accepted non-blocking items.
UNVERIFIED: none for the spec phase. (Delivery-phase proof — tests
  asserting each scenario — is out of scope here.)
DISMISSED:
  - [endpoint-not-found] SPEC.md:164 GET /tasks/{id}/comments not in
    source — DISMISSED: this is a spec-phase contract for planned API.
    D5 (SPEC.md:174-188) explicitly specifies the new nested
    /tasks/{id}/comments + /comments/{id} resources; no comments code
    exists yet by design (grep for comments in backend/src +
    frontend/src returns nothing). Existing endpoints it mirrors are
    real: TaskResource @Path("/projects/{projectId}/tasks")
    (TaskResource.java:24), TaskItemResource @Path("/tasks")/{id}
    GET/PATCH/DELETE (TaskItemResource.java:23,55-76), WorkspaceResource
    /workspaces/{id}/members (WorkspaceResource.java:80-82).
EVIDENCE:
  - Read SPEC.md, EXAMPLES.feature, BACKLOG.md, GATES.md,
    DECISION-REVIEW.md, SPEC-AUDIT.md (specs/task-detail/).
  - Verified V3__projects_tasks.sql: uq_projects_id_workspace UNIQUE
    (id,workspace_id) on projects (line 12), composite FK
    fk_tasks_project_workspace tasks(project_id,workspace_id)→
    projects(id,workspace_id) ON DELETE CASCADE (30-33), tasks has NO
    UNIQUE(id,workspace_id) — confirming D1's stated V4 precondition;
    sequences INCREMENT BY 50 (38-41); created_at TIMESTAMPTZ DEFAULT
    now() (28) supporting D4's now()-is-transaction-time tiebreak claim.
  - Verified choke points: requireMembership (WorkspaceService.java:39-50),
    requireRole (:58-65), requireVerified (:52-56), requireProject
    (ProjectService.java:31-38), requireTaskProject (TaskService.java:60-66),
    currentUser() boilerplate (TaskItemResource.java:86-90),
    TaskService.toDtos batch name resolution via User.list("id in ?1")
    (TaskService.java:73-88).
  - Verified frontend: route convention projects/:id (App.tsx:35 —
    /tasks/:id is the planned analogue), api.patch exists (api.ts:40-41).
  - Verified migrations dir has only V1-V3 (V4 is next, as spec'd);
    backend tests include ProjectTaskResourceTest.java cited by
    DECISION-REVIEW.
  - Verified DECISION-REVIEW.md verdict block filled:
    VERDICT: REVISE (line 288) with SMALLEST NEXT STEP; SPEC.md:86-94
    records all findings folded back into D1/D2/D4/D5.
  - Verified GATES.md G1 check file:specs/task-detail/DECISION-REVIEW.md
    resolves to an existing file; LOOP.md shows G1 met with matching
    evidence.
  - grep TBD|TODO|FIXME over specs/task-detail: no hits.
  - EXAMPLES.feature:2 references WAVES.md which does not yet exist —
    same scaffold comment in all shipped features (projects-tasks,
    workspaces-accounts, app-shell); WAVES.md is produced by wave_plan
    later. Convention, not a defect.
```

Rules: `BLOCK` on any confirmed blocker, hallucinated claim, or
unproven acceptance criterion. `CONCERNS` only when every remaining
item is non-blocking and explicitly accepted. `PASS` only when all
three lists are empty. Never mark `PASS` from this brief alone.
