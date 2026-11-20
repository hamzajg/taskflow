# Decision Review — project-tags (D1–D5)

Reviewed by decision-challenger subagent, 2026-11-20. Verdict: **REVISE** —
all five decisions confirmed sound in shape; findings were spec-text gaps,
now folded into SPEC.md.

| Decision | Verdict | Notes |
|---|---|---|
| D1 workspace-scoped tags + project_tags pivot | SOUND | Matches tenancy model and legacy parity (tags.admin_id → workspace_id). Alternatives (task tags, free-text) strictly worse. |
| D2 tagIds on project create/update | SOUND (conditional) | Conditional on authz resolution — folded: assignment is owner/admin-only, same as project update. Partial-update semantics (absent=unchanged, []=clear) implementable on the nullable-field request record. |
| D3 title+color, case-insensitive unique | SOUND | No slug = correct YAGNI. Race now maps constraint violation → 409, never 500. |
| D4 hard delete, cascade both ways | SOUND | Pivot now carries workspace_id + composite FKs per V3/V4 tenancy-by-schema; no JPA entity, no surrogate key; sequence-pooling convention applies. |
| D5 badges + manage drawer + multi-select + filter chips | SOUND (conditional) | Conditional on the missing edit UI — folded: project drawer gains edit mode (name/description/color/tags); manage drawer covers rename/recolor; batch-fetch for list endpoints. |

## Findings and resolutions

1. **[blocker] No project edit UI exists** — nothing calls `PUT /projects/{id}`.
   Resolved: scope now includes project-drawer edit mode (SPEC Scope-in +
   D5 + new @w2 scenario "Edit a project and update its tags").
2. **[blocker] "All members assign" contradicted owner/admin-only project
   update** (`ProjectService.update` requires owner/admin). Resolved:
   assignment inherits project-edit authz — owner/admin only; members keep
   view/badge/filter. Users/Scope/AC1 wording corrected.
3. **[concern] Pivot lacked tenancy-by-schema** — `project_tags` now carries
   `workspace_id` + composite FKs to both parents (V3/V4 pattern).
4. **[concern] Uniqueness race → 500** — resolved: catch constraint
   violation, map to 409 (D3).
5. **[nit] N+1 on ProjectDto.tags** — resolved: batch grouped query in
   list endpoints (D5). Sequence `INCREMENT BY 50` convention noted for V5.
   Pivot has no JPA entity (explicit in D4).

## Steelman / alternatives recorded

- Simplest rejected: `TEXT[]`/JSON column on projects — no per-tag
  color/management/uniqueness.
- Most reversible fallback: dedicated `PUT /projects/{id}/tags`
  sub-resource — only needed if member-level tagging is ever required;
  revisit trigger below.
- Split option noted: backend CRUD wave vs frontend wave already matches
  the 3-wave plan.

REVISIT TRIGGER: product owner confirms plain members must re-tag projects
after creation — that breaks D2's single-PUT design and reopens the
sub-resource option.
