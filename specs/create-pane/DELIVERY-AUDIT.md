# Delivery audit — create-pane (delivery)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/create-pane`
- Generated: 2026-11-20T07:44:35Z
- Phase: **delivery**
- Findings: **2 blockers · 12 concerns · 1 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 0
- Scenarios: 11 (3 wave tags)
- Backlog items: 3
- Waves: 3
- Gates: 1
- Validation rows: 0
- Path claims checked: 4
- Changed files: 5
- In-scope paths: none recorded

## Blockers

- [no-acceptance-criteria] `specs/create-pane/SPEC.md` — no acceptance-criteria rows parsed
- [no-validation-rows] `VALIDATION.md` — no traceability rows parsed — validation is not evidence

## Concerns

- [scenario-uncovered] `EXAMPLES.feature:7` — scenario `Add task opens the creation drawer` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:14` — scenario `Creating a task closes the drawer and updates the list` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:21` — scenario `Create errors stay inside the drawer with values preserved` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:28` — scenario `Dismissing the create drawer creates nothing` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:34` — scenario `Peek drawer still works alongside create` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:40` — scenario `Only one drawer is open at a time` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:47` — scenario `Create form resets on every open` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:54` — scenario `New project opens the creation drawer` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:60` — scenario `Creating a project closes the drawer and updates the list` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:67` — scenario `Inline creation forms are gone` is not referenced by any acceptance criterion
- [scenario-uncovered] `EXAMPLES.feature:73` — scenario `Creation drawers meet the accessibility bar in both themes` is not referenced by any acceptance criterion
- [unfinished-code] `frontend/src/__tests__/create-pane.test.tsx:32` — shipped code contains an unfinished marker: status: 'todo',

## Unverified

- [scope-no-paths] `SPEC.md` — scope drift not checked — no in-scope paths recorded

## Verdict (agent fills after verifying the code)

```
AUDIT: CONCERNS
PHASE: delivery
BLOCKERS: 0 confirmed — both are parser artifacts, not spec defects.
  [no-acceptance-criteria] SPEC.md has 7 acceptance criteria as a
  numbered list under "## Acceptance criteria" (SPEC.md:75-97). That is
  the canonical format spec_scaffold generates — task-drawer/SPEC.md
  uses the identical format and shipped through the same audit. The
  auditor regex (_AC_RE in review_delivery.py:51) only matches table
  rows `| n | criterion | refs |`, so it parses 0 rows. Same root cause
  empties ship_validate's traceability writer (_AC_ROW_RE in
  ship_validate.py:31), which is why VALIDATION.md's Traceability table
  has a header and no rows.
  [no-validation-rows] VALIDATION.md does contain the ship_validate
  output: scenario coverage shows all 11 scenarios with strong test
  evidence (✓ marks, "0 without") and "Gaps: none — spec is fully
  traced". The empty Traceability table is the same AC-parse miss, not
  missing validation.
CONCERNS: all 13 accepted as tooling false positives.
  - 11x scenario-uncovered: cascade of the same parser miss — with 0 AC
    rows parsed, no scenario can be "referenced". Reality: all 11
    scenarios are covered by 13 tests in create-pane.test.tsx whose
    describe() names cite the scenario verbatim with @w1/@w2/@w3 tags
    (lines 105-427), and the SPEC.md numbered ACs map to them.
  - unfinished-code `status: 'todo'` at create-pane.test.tsx:32: false
    positive. It is the `status` field of the TASK_11 TaskDto fixture
    ('todo' is a valid task-status enum value); _HALLUCINATION_RE
    matched "todo" case-insensitively.
  - scope-no-paths (unverified): resolved by manual diff —
    `git diff --name-only origin/main...HEAD` on this branch plus the
    three feature merge commits (#32 16640d7, #33 6199aec, wave-3
    4e774fd) touch only frontend/src/** and specs/**; zero backend/api
    files changed (frontend-only feature, as scoped). All changed
    product files fall inside the spec's Scope (in).
UNVERIFIED: none remaining. Evidence bundles exist for all 3 waves
  under .openharness/evidence/create-pane/ (20261120T072111Z-b76fa57,
  20261120T073901Z-908e57b, 20261120T074313Z-4e774fd) with evidence.json,
  SUMMARY.md, logs and light/dark screenshots. `harness_evidence
  --action=verify` on wave 3 reports only a commit-mismatch (manifest
  pins wave commit 4e774fd; HEAD is now 5c1ab12, the later validation
  docs commit) — expected drift, not missing evidence.
EVIDENCE:
  - Read SPEC.md (7 numbered ACs, lines 75-97), VALIDATION.md,
    EXAMPLES.feature coverage claims, review_delivery.py parser
    (_parse_acs/_parse_validation/_scope_paths), ship_validate.py
    (_ac_rows), spec_scaffold output format; compared with
    specs/task-drawer/SPEC.md + VALIDATION.md (same formats, same
    empty traceability table).
  - `cd frontend && npx vitest run` — 12 files, 85 tests, all pass.
  - `cd frontend && npm run build` — tsc -b + vite build clean.
  - `git show --name-only` on merge commits 16640d7/6199aec/4e774fd —
    frontend + specs only; no api/ or backend paths.
  - Read TaskCreateDrawer.tsx and ProjectCreateDrawer.tsx — both reuse
    components/Drawer.tsx, own their POST (api.post to
    /projects/:id/tasks and /workspaces/:id/projects), reset form on
    every closed->open transition, preserve values on API error,
    disable submit while pending; ProjectsPage.tsx and
    ProjectDetailPage.tsx contain no inline create forms (grep for
    <form/New task/Create project: no matches).
  - create-pane.test.tsx cites all 11 scenarios by name with @w tags.
```

Rules: `BLOCK` on any confirmed blocker, hallucinated claim, or
unproven acceptance criterion. `CONCERNS` only when every remaining
item is non-blocking and explicitly accepted. `PASS` only when all
three lists are empty. Never mark `PASS` from this brief alone.
