# Delivery audit — projects-tasks (delivery)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/projects-tasks`
- Generated: 2026-11-19T19:10:57Z
- Phase: **delivery**
- Findings: **3 blockers · 11 concerns · 1 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 10
- Scenarios: 15 (4 wave tags)
- Backlog items: 4
- Waves: 4
- Gates: 1
- Validation rows: 10
- Path claims checked: 3
- Changed files: 8
- In-scope paths: none recorded

## Blockers

- [unresolved-spec] `SPEC.md:37` — unresolved marker: - **Statuses**: fixed set per product — `backlog`, `todo`, `in_progress`,
- [unresolved-spec] `SPEC.md:95` — unresolved marker: - **D2 — Task status: fixed enum set (`backlog`, `todo`, `in_progress`,
- [unresolved-spec] `EXAMPLES.feature:81` — unresolved marker: Given a task in the "todo" column

## Concerns

- [ac-weak-evidence] `VALIDATION.md` — AC 3 has only weak token-match evidence: (weak) ProjectTaskResourceTest.java
- [ac-weak-evidence] `VALIDATION.md` — AC 4 has only weak token-match evidence: (weak) ProjectTaskResourceTest.java, WorkspaceResourceTest.java
- [ac-weak-evidence] `VALIDATION.md` — AC 5 has only weak token-match evidence: (weak) ProjectTaskResourceTest.java, WorkspaceResourceTest.java
- [ac-weak-evidence] `VALIDATION.md` — AC 6 has only weak token-match evidence: (weak) ProjectTaskResourceTest.java
- [ac-no-evidence] `VALIDATION.md` — AC 9 has no test evidence
- [ac-no-evidence] `VALIDATION.md` — AC 10 has no test evidence
- [validation-gap] `VALIDATION.md` — unresolved validation gap: 6 scenario(s) lack detected test evidence — verify manually or add checks
- [unfinished-code] `frontend/src/__tests__/projects.test.tsx:46` — shipped code contains an unfinished marker: status: 'todo',
- [unfinished-code] `frontend/src/pages/BoardView.tsx:28` — shipped code contains an unfinished marker: const [moveStatus, setMoveStatus] = useState('todo')
- [unfinished-code] `frontend/src/pages/ProjectDetailPage.tsx:33` — shipped code contains an unfinished marker: status: 'todo',
- [unfinished-code] `frontend/src/pages/ProjectsPage.tsx:93` — shipped code contains an unfinished marker: placeholder="Project name"

## Unverified

- [scope-no-paths] `SPEC.md` — scope drift not checked — no in-scope paths recorded

## Auditor verdict (delivery-auditor, 2026-11-19)

```
AUDIT: CONCERNS
PHASE: delivery
BLOCKERS: none confirmed — all 3 "unresolved-spec" findings and all 4
  "unfinished-code" findings are false positives: `todo` is the fixed task
  status enum value (SPEC.md:37, SPEC.md:95, EXAMPLES.feature:81,
  Task.java:20, projectTypes.ts:32), and `placeholder="Project name"`
  (ProjectsPage.tsx:93) is a real input placeholder attribute, not an
  unfinished marker. BoardView.tsx:28 and ProjectDetailPage.tsx:33 use
  'todo' as the default status value. The ac-weak/no-evidence and
  validation-gap findings are stale mechanical token matches; real tests
  asserting every scenario outcome exist and pass (see EVIDENCE).
CONCERNS: accepted, non-blocking —
  (1) VALIDATION.md traceability is stale: it reports weak/no test
      evidence for ACs 3-6, 9, 10 and 6 scenarios, but
      ProjectTaskResourceTest.java (9 tests incl. move/position math,
      isolation, delete roles) and projects.test.tsx (14 tests incl.
      board grouping, move control PATCH, loading/error/empty, a11y)
      cover them; doc-only inaccuracy, product code is proven.
  (2) frontend/tsconfig.app.tsbuildinfo (tracked build artifact) churns
      in the diff; pre-existing repo pattern since app-shell waves.
  (3) Project update is restricted to owner/admin
      (ProjectService.java:68-69), stricter than the letter of D3 which
      names only project delete; consistent with team-tool semantics and
      does not contradict any AC.
UNVERIFIED: none blocking — evidence bundles under
  .openharness/evidence/projects-tasks/ (screenshots) were not
  re-executed; both-theme rendering is instead proven by
  tokens.test.ts (asserts tokens.css defines both themes) and
  theme.test.ts (toggle persistence), both passing.
DISMISSED: all 3 unresolved-spec blockers and all 4 unfinished-code
  concerns (false positives, reasons above); ac-weak-evidence /
  ac-no-evidence / validation-gap findings (real asserting tests exist —
  VALIDATION.md's token matching missed them); scope-no-paths (SPEC.md
  has no in-scope path list; scope verified manually — all changed
  files are feature-scoped frontend pages/tests/styles + spec docs).
EVIDENCE:
  - git diff main...HEAD --stat: 8 files (BoardView, ProjectDetailPage,
    ProjectsPage, projects.test.tsx, styles.css, tsbuildinfo, LOOP.*);
    waves 1-2 already merged to main via PRs #13/#14/#15.
  - Read: SPEC.md, EXAMPLES.feature, VALIDATION.md, WAVES.md, BACKLOG.md,
    GATES.md, SPEC-AUDIT.md, DECISION-REVIEW.md (VERDICT: REVISE, filled),
    LOOP.md/state; backend Project/Task/Workspace entities+resources+
    services (ProjectResource, ProjectItemResource, TaskResource,
    TaskItemResource, ProjectService, TaskService, ProjectDtos,
    V3__projects_tasks.sql); frontend App.tsx routes, AppShell nav,
    api.ts (patch helper), projectTypes.ts, ProjectsPage,
    ProjectDetailPage, BoardView, projects.test.tsx, tokens/theme tests.
  - AC->test map verified by opening tests: AC1/2/7/8 ->
    ProjectTaskResourceTest (member CRUD, 403 non-member, 400 invalid
    status/priority, assignee membership, member-delete-task vs
    owner/admin-delete-project, cross-workspace 403s, dense position
    rewrite + same-column reorder); AC3/6 -> move_rewrites_positions_
    dense + cross-workspace move 403 + frontend PATCH /tasks/{id}/move
    assertion; AC4/5 -> projects.test.tsx list counts/links, grouped
    list view, board columns, per-project view persistence; AC9/10 ->
    error+retry alerts, role=status loading, empty states, Move keyboard
    control, aria-pressed toggle, token-only styling tests.
  - Ran: `cd backend && JAVA_HOME=... mvn -q test
    -Dquarkus.http.test-port=18099` -> surefire: AuthResourceTest 7/7,
    ProjectTaskResourceTest 9/9, WorkspaceResourceTest 12/12 (28 total,
    0 failures). `cd frontend && npm run build` clean (tsc+vite);
    `npm test` -> vitest 27/27 across 4 files.
  - No skipped/ignored tests, no mocked-unit-under-test, no constant
    assertions found in the cited tests.
```

Rules: `BLOCK` on any confirmed blocker, hallucinated claim, or
unproven acceptance criterion. `CONCERNS` only when every remaining
item is non-blocking and explicitly accepted. `PASS` only when all
three lists are empty. Never mark `PASS` from this brief alone.
