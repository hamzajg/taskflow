# Spec: projects-tasks

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

Workspaces exist but are empty — there is no way to organize work. The
product's core loop (plan work → track tasks → see it on a board) is
missing, and every workspace member hits this on day one. This is the
first feature that delivers real user value inside a workspace.

## Users

Workspace members (owner/admin/member) who create and track work; owners
and admins who manage project structure.

## Outcome hypothesis

- Expected user outcome: a member can create a project, break it into
  tasks, move tasks across a status board, and see the whole plan at a
  glance — the daily-driver loop of a task tool.
- Opportunity evidence: assumption — derived from the product category
  (workspace task management) and the reference product's IA, not from
  user research. No usage data exists yet.
- Signal: qualitative — projects/tasks created and moved via UI; no
  numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **Projects**: CRUD inside a workspace (name, description, optional
  color), list view, member-count/task-count summaries.
- **Tasks**: CRUD inside a project (title, description, status, priority,
  assignee = workspace member, due date, position within status column).
- **Statuses**: fixed set per product — `backlog`, `todo`, `in_progress`,
  `done` — validated server-side; no per-workspace customization yet.
- **Priorities**: fixed set — `low`, `medium`, `high`, `urgent`.
- **Board view**: kanban columns per status with drag-and-drop (or
  equivalent move affordance) persisting order server-side.
- **List view**: tasks grouped/filterable by status, priority, assignee.
- Authorization: workspace membership required for everything;
  **any member may create/edit/delete tasks** in projects they can see;
  **only owner/admin may delete projects** (D3 — see DECISION-REVIEW).
- Frontend: new routes `/projects` and `/projects/:id`, built on the
  app-shell (sidebar gets a Projects nav item).

## Scope (out)

- Per-workspace custom statuses/priorities, tags, favorites, templates.
- Comments, activity log, notifications, mentions, attachments.
- Time tracking, estimates, invoices, gantt/calendar views, recurring
  tasks, subtasks/checklists.
- Real-time collaboration (websockets/polling) — board updates on
  reload/own actions only.
- Public project sharing, guest access.

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Members can CRUD projects inside their workspace; non-members get 403/404 | @w1 |
| 2 | Members can CRUD tasks inside a project with status/priority/assignee/due-date validation | @w1 |
| 3 | Task move endpoint updates status + position atomically; order survives reload | @w3 |
| 4 | Projects list page shows workspace projects with task counts | @w2 |
| 5 | Project detail offers list and board views; board groups tasks by status | @w2, @w3 |
| 6 | Board drag (or move control) persists position; columns reflect server state | @w3 |
| 7 | Members can delete tasks in visible projects; only owner/admin can delete projects | @w1, @w2 |
| 8 | Workspace isolation: project/task IDs from another workspace are inaccessible | @w1 |
| 9 | Empty states, loading and error states exist for all new screens | @w4 |
| 10 | All new UI follows tokens/primitives, works in both themes, keyboard accessible | @w4 |

## Decisions

> Filled before wave planning; `challenge_decision` reviews this section.

- **D1 — Persistence: relational entity model (Panache), no event
  sourcing.**
  - Context & forces: projects/tasks are classic CRUD aggregates with
    simple lifecycle; the codebase already uses Panache entities +
    Flyway; consistency needs are ordinary (no audit/replay requirements).
  - Options considered: (a) normalized tables + Panache entities
    (simplest, matches existing patterns); (b) event sourcing (overkill —
    adds infrastructure for zero current requirement); (c) document store
    (breaks Postgres-only deployment and relational queries).
  - Decision & why: (a). Two-way door — schema is additive via Flyway.
  - Consequences: + familiar, testable, transactional. − no temporal
    history; revisit only if audit/replay becomes a requirement.
  - Reversibility: two-way door.

- **D2 — Task status: fixed enum set (`backlog`, `todo`, `in_progress`,
  `done`), validated server-side.**
  - Context & forces: the reference product supports per-workspace custom
    statuses, but that adds a statuses table, ordering, rename/archive
    semantics, and UI for zero proven need.
  - Options considered: (a) fixed enum in code + CHECK/validation
    (simplest, reversible); (b) workspace-configurable statuses table
    (matches reference, significant scope); (c) free-text status
    (rejected — breaks board grouping).
  - Decision & why: (a) for v1. The board contract only needs stable
    status keys; custom statuses can be added later without breaking the
    API if keyed by string. Stored as VARCHAR + validated in the service
    layer (not a PG enum/CHECK) so adding a status never needs a migration
    — keeps the two-way-door claim honest.
  - Consequences: + tiny surface, fast board. Frontend keeps a single
    status constant/label map shared by list and board. − less flexible
    than the reference; revisit trigger = first user request for custom
    statuses.
  - Reversibility: two-way door (statuses keyed as strings; a table can
    replace the enum without changing task rows).

- **D3 — Authorization: membership for read/write, owner/admin for
  destructive project ops.**
  - Context & forces: `requireMembership`/`requireRole` is the existing
    choke point; tasks inherit tenancy through their project.
  - Options considered: (a) member can edit any task in workspace
    projects, owner/admin delete projects and others' tasks
    (simplest consistent rule); (b) per-task assignee-only edits
    (complex, unclear value); (c) owner-only everything (too strict for
    collaboration).
  - Decision & why: (a) — mirrors typical team-tool semantics, keeps one
    authorization choke point. **Clarified per DECISION-REVIEW finding 1:**
    any member may create/edit/**delete** tasks in projects they can see
    (no per-task ownership in v1); only owner/admin delete projects.
    No `created_by` column needed.
  - Consequences: + simple mental model, matches team tools. − members
    can delete each other's tasks (accepted for v1; revisit if abuse
    appears or per-task ownership becomes a requirement).
  - Reversibility: two-way door (rule lives in `requireRole` calls).

- **D4 — Task ordering: integer `position` per (project, status)
  column, explicit `PATCH /tasks/{id}/move` (and `PATCH /tasks/{id}`
  for field edits — `api.ts` gains a `patch` helper in wave 2).
  - Context & forces: board order must persist; drag events are
    client-side, so the server needs one unambiguous write.
  - Options considered: (a) `position` int + move endpoint that
    rewrites the affected column's positions in one transaction
    (simple, deterministic); (b) fractional/lexorank positions
    (fewer writes, more complexity); (c) full-list reorder endpoint
    (chatty, race-prone).
  - Decision & why: (a) — correctness first; column sizes are small.
    The move endpoint serializes per project (`SELECT ... FOR UPDATE` on
    the project row or equivalent) so concurrent moves can't silently
    lost-update positions. Positions are dense integers (0..n-1) within
    each (project, status) column — the move response returns the full
    affected column order so the client never re-derives it.
  - Consequences: + simple to test. − O(n) rewrite per move; fine at
    expected scale.
  - Reversibility: two-way door.

- **D5 — Board interaction: native HTML5 drag-and-drop with keyboard
  move fallback, no DnD library.**
  - Context & forces: need drag between status columns; must stay
    accessible and on-token.
  - Options considered: (a) native HTML5 DnD + explicit "move to…"
    menu/buttons as keyboard path (zero deps); (b) `@dnd-kit` (best
    a11y/UX, one dep + sortable complexity); (c) buttons only
    (accessible but poor board UX).
  - Decision & why: (a) — zero deps, the keyboard fallback covers a11y,
    and dnd-kit can be adopted later behind the same move endpoint.
  - Consequences: + no dep, testable move API. − native DnD is fiddly
    cross-browser; fallback menu mitigates.
  - Reversibility: two-way door (interaction layer only; API unchanged).

- **D6 — Frontend routing: `/projects` list + `/projects/:id` detail
  with list/board view toggle persisted per project.**
  - Context & forces: app-shell exists; baseline shows view-switcher
    pattern; must not break existing `/` home.
  - Options considered: (a) dedicated routes + view toggle
    (scalable, matches baseline); (b) sections inside home page
    (dead-end, home becomes a junk drawer); (c) modal-based project
    view (poor for board).
  - Decision & why: (a). Home stays the dashboard; sidebar gains a
    Projects nav item. `/projects` is scoped to
    `ShellContext.activeWorkspaceId`; with no workspace selected the
    page shows a "select a workspace" empty state (never an error).
    New projects default to list view; the toggle persists per project
    in localStorage.
  - Consequences: + clean IA growth. − Home/workspaces panel needs a
    link to projects (small change).
  - Reversibility: two-way door.

- **D7 — Task↔workspace tenancy: denormalize `workspace_id` onto
  `tasks` (and `projects`) for direct membership checks.**
  - Context & forces: authz must resolve "is this task in a workspace I
    belong to" without join traversal on every request.
  - Options considered: (a) `workspace_id` column on both tables +
    composite checks (fast, slight redundancy); (b) resolve via
    project→workspace join each time (normalized, slower, more code).
  - Decision & why: (a) — consistent with `WorkspaceMember`-style flat
    FK design already in the codebase; integrity enforced by FK +
    service checks.
  - Consequences: + simple authz queries. − must keep denormalized id
    correct on create (service-owned, tested). Integrity enforced two
    ways per DECISION-REVIEW finding 3: composite FK
    `(project_id, workspace_id) → projects(id, workspace_id)` where
    Postgres allows, plus a service-level consistency test.
  - Reversibility: two-way door.

- **D8 — API shape: REST under `/workspaces/{id}/projects` and
  `/projects/{id}/tasks`, `PATCH /tasks/{id}/move`.**
  - Context & forces: existing resources use nested workspace scoping;
    task move is a partial update distinct from field edits.
  - Options considered: (a) REST nested + move subresource action
    (consistent); (b) GraphQL (new paradigm, overkill); (c) RPC-style
    `/tasks/{id}:move` (fine but less REST-conventional here).
  - Decision & why: (a).
  - Consequences: + predictable for frontend. − slightly more endpoints.
  - Reversibility: two-way door.

- **D9 — Assignee validation: assignee must be a workspace member;
  unassign allowed (null).**
  - Context & forces: prevents assigning tasks to outsiders;
    `workspace_members` is the source of truth.
  - Options considered: (a) validate membership server-side on write
    (correct); (b) trust client (insecure); (c) allow any user id
    (broken tenancy).
  - Decision & why: (a).
  - Consequences: + closed tenancy. − one extra lookup per write.
    Dangling assignee on member removal is handled per DECISION-REVIEW:
    tasks keep `assignee_id`; the UI renders removed members as
    "former member" (no cascade delete of assignments).
  - Reversibility: two-way door.

- **D10 — Frontend state: React Query–free — fetch on route change +
  local mutation refresh (existing `api.ts` pattern).**
  - Context & forces: current app uses plain fetch + useState; adding
    a data-fetching library is a new paradigm.
  - Options considered: (a) extend existing pattern (consistent, zero
    deps); (b) TanStack Query (better caching/invalidation, new dep +
    provider); (c) Redux/Zustand (overkill).
  - Decision & why: (a) for v1 — mutations refetch affected collections
    (no optimistic UI in v1); revisit if polling/cache needs grow.
  - Consequences: + consistent. − manual invalidation; acceptable at
    this scale.
  - Reversibility: two-way door.

- **D11 — Tests: backend scenario tests (REST-assured style already in
  repo) + frontend vitest for board/list logic; e2e via evidence
  screenshots.**
  - Context & forces: quality bar demands testable seams; frontend now
  has vitest infra from app-shell.
  - Options considered: (a) backend resource tests + frontend unit
    tests + manual UI evidence (matches repo conventions); (b)
    full Playwright e2e suite in CI (valuable but new infra);
    (c) backend-only tests (UI unproven).
  - Decision & why: (a) now; (b) is a candidate follow-up feature
    (test infra), not this spec's scope.
  - Consequences: + real coverage without new CI surface. − no
    automated browser regression.
  - Reversibility: two-way door.

- **D12 — Task delete vs archive: hard delete only in v1.**
  - Context & forces: simplest correct behavior; archive adds a status
    or flag + UI.
  - Options considered: (a) DELETE removes row (simplest);
    (b) `archived_at` soft-delete (recoverable, more queries/UI);
    (c) status `archived` in the enum (pollutes board semantics).
  - Decision & why: (a); `done` already covers "finished" semantics.
  - Consequences: + simple. − no undo; acceptable for v1 tasks.
    Deleting a project cascades to its tasks (FK ON DELETE CASCADE);
    deleting a task compacts the remaining positions in its column
    inside the same transaction.
  - Reversibility: two-way door (add column later).

## Outcome follow-up

- Status: not yet measured
- Owner and review date: product owner, after ship
- Signal and observed result: (record after release)
- Learning or next action: (record after review)
