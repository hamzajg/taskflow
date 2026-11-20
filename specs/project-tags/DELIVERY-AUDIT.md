# Delivery audit — project-tags (delivery)

- Repo: `~/factory/openharness/sources/taskflow`
- Spec: `specs/project-tags`
- Generated: 2026-11-20T14:19:02Z
- Phase: **delivery**
- Findings: **0 blockers · 4 concerns · 1 unverified**
- This is a deterministic evidence brief, not a verdict. The `delivery-auditor` re-verifies it and fills the verdict.

## What was checked

- Acceptance criteria: 5
- Scenarios: 15 (3 wave tags)
- Backlog items: 3
- Waves: 3
- Gates: 1
- Validation rows: 5
- Path claims checked: 2
- Changed files: 3
- In-scope paths: none recorded

## Blockers

None. This is not a pass: verify semantics before accepting.

## Concerns

- [wave-no-pr] `LOOP.md` — wave 1 is done but records no PR reference
- [wave-no-pr] `LOOP.md` — wave 2 is done but records no PR reference
- [wave-no-pr] `LOOP.md` — wave 3 is done but records no PR reference
- [unfinished-code] `frontend/src/__tests__/tags.test.tsx:53` — shipped code contains an unfinished marker: status: 'todo',

## Unverified

- [scope-no-paths] `SPEC.md` — scope drift not checked — no in-scope paths recorded

## Verdict

```
AUDIT: CONCERNS
PHASE: delivery
BLOCKERS: 0 — all 5 ACs and 15 scenarios verified against implementation and real test assertions; composite-FK tenancy, case-insensitive uniqueness + 409 race mapping, cascades, and partial-update tagIds semantics all confirmed in code.
CONCERNS: accepted — (1) member-can-assign-at-create ambiguity: RESOLVED by spec amendment — assignment now explicitly follows the authz of the carrying operation (create=member, update=owner/admin), matching project-create permission; (2) wave-no-pr ×3 bookkeeping gap, non-blocking per D009 (PRs #52/#53 exist); (3) 'todo' unfinished-code flag is fixture enum data; (4) tag-fieldset/tag-checkboxes/tag-check CSS classes added; forProjects now orders by lower(title) for consistency.
UNVERIFIED: auditor could not execute tests (read-only); parent ran backend 58/58 and frontend 131/131 + clean build; evidence bundles verified at each wave HEAD.
EVIDENCE: auditor read V5 migration, Tag/TagDtos/TagService/TagResource, ProjectService/ProjectResource/ProjectItemResource/ProjectDtos, TagBadges/TagManageDrawer/ProjectCreateDrawer/ProjectsPage/ProjectDetailPage/projectTypes/styles.css, TagResourceTest.java, tags.test.tsx, all spec artifacts; cross-checked V3/V4 FK targets and WorkspaceService role helpers.
```