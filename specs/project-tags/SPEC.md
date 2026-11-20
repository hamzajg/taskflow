# Spec: project-tags

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

Projects in TaskFlow carry only name/description/color — there is no way to
group, label, or filter them. Users running several projects per workspace
cannot answer "show me everything tagged client-X" or visually distinguish
project types at a glance. The product needs a lightweight tagging layer that
matches how teams actually organize work.

## Users

Workspace members. Owners/admins manage tags and edit projects (the existing
authz rule: `ProjectService.update` already requires owner/admin — tag
assignment rides on that same permission). All members view tag badges and
filter the project list. Primary flow: an admin creates tags once per
workspace, labels projects, and the team filters by tag.

## Outcome hypothesis

- Expected user outcome: members can create colored tags per workspace,
  attach them to projects, see tag badges on project cards and the project
  detail page, and filter the `/projects` list by tag.
- Opportunity evidence: legacy product ships workspace-scoped tags with
  title/slug/color and a `project_tag` pivot; current TaskFlow has no tag
  concept anywhere (verified: no `tag` in models, DTOs, migrations, or
  frontend).
- Signal: `GET /workspaces/{id}/tags` returns the workspace's tags and a
  project DTO carries its assigned tags; the projects page filters by tag.
- Follow-up owner/date: agent, at feature finish.

## Scope (in)

- Backend: `tags` table (workspace-scoped: `workspace_id`, `title`,
  `color`) and `project_tags` pivot (`project_id`, `tag_id`), both via a new
  Flyway migration. Tag fields are validated; tag titles are unique per
  workspace case-insensitively.
- REST: `GET/POST /workspaces/{wid}/tags`,
  `PUT/DELETE /workspaces/{wid}/tags/{tagId}`; project create/update
  requests accept `tagIds` and `ProjectDto` returns `tags`. Deleting a tag
  detaches it from all projects; deleting a project removes its assignments.
- Authorization: any workspace member can list tags, view badges, filter,
  and assign tags **at project-create time** (project create itself only
  requires membership). Tag create/rename/recolor/delete and project tag
  assignment **via update** require owner/admin — each assignment path
  inherits the authz of the operation carrying it; members get 403 on tag
  mutation and on project edits that carry `tagIds`.
- Frontend: tag badges on project cards and the project detail header;
  tag multi-select inside the project drawer; a tag management surface
  (list + create + rename/recolor + delete) reachable from `/projects`;
  client-side tag filter chips on the `/projects` list.
- Frontend gap this feature must close: no project *edit* UI exists today
  (only `ProjectCreateDrawer`; nothing calls `PUT /projects/{id}`). The
  project drawer gains an edit mode so name/description/color/tags are
  editable after creation — required for tag assignment to be usable.
- Tests: backend resource tests for CRUD, uniqueness, authorization,
  assignment, cascade; frontend tests for badges, drawer assignment,
  management, and filtering.

## Scope (out)

- Task-level tags (tasks inherit visibility through their project; legacy
  parity is project-level only).
- Tag hierarchies, nesting, or tag groups.
- Tag slug generation or tag pages/routes of their own.
- Tag usage counts/analytics, tag renaming propagation UI beyond the tag
  itself, tag merge.
- Workspace-level tag defaults or auto-tagging rules.
- Changes to task priority/assignee/due-date (already shipped).

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Workspace members can list and create tags; owner/admin can rename, recolor, and delete them; members get 403 on tag mutation | Members can list workspace tags; Owner creates a tag; Member cannot mutate tags |
| 2 | Tag titles are required, length-bounded, and unique per workspace case-insensitively; invalid input returns 400 | Duplicate tag titles are rejected; Invalid tag input is rejected |
| 3 | Projects accept `tagIds` on create/update and return their tags in `ProjectDto`; unknown or foreign-workspace tag ids are rejected | Assign tags to a project; Reject foreign-workspace tag ids |
| 4 | Deleting a tag detaches it everywhere; deleting a project removes its assignments; workspace deletion cascades | Deleting a tag detaches it from projects; Deleting a project removes tag assignments |
| 5 | `/projects` shows tag badges, offers tag management, and filters by tag; the project drawer assigns tags in create AND edit mode; all in both themes | Project cards show tag badges; Manage tags from the projects page; Filter projects by tag; Assign tags in the project drawer; Edit a project and update its tags; Tag UI works in both themes |

## Decisions

### D1 — Tags are workspace-scoped, projects are tagged, tasks inherit

- Context & forces: legacy scopes tags to the tenant (`admin_id`) and pivots
  `project_tag` only — tasks have no tag relation. TaskFlow workspaces map
  to that tenant boundary; tasks already belong to projects.
- Options considered: (a) workspace-scoped `tags` + `project_tags` pivot
  (legacy parity, simple); (b) task-level tags too (more granular but
  doubles UI surface and diverges from legacy); (c) free-text tags typed on
  the project (no entity, but no color/management/uniqueness).
- Decision: (a). A `Tag` entity keyed by `workspaceId` with a
  `project_tags` join table. No task-level tags — a task's tags are its
  project's tags.
- Consequences: tag CRUD lives under `/workspaces/{wid}/tags`; project
  DTOs embed resolved tag objects so the frontend never joins manually.

### D2 — Assignment rides on project create/update, not a sub-resource

- Context & forces: project update is already partial-update style
  (`UpdateProjectRequest` with nullable fields). Tags are a set-valued
  attribute of the project — replacing the whole set atomically is the
  correct semantic.
- Options considered: (a) `tagIds` field on create/update requests;
  (b) dedicated `PUT /projects/{id}/tags` endpoint.
- Decision: (a) — fewer endpoints, atomic with other field updates, and
  matches how the drawer already submits the whole form. An absent
  `tagIds` leaves assignments unchanged; an empty array clears them.
- Consequences: `ProjectService.create/update` resolve and validate tag ids
  against the project's workspace in one transaction.

### D3 — Tag identity is title + color; uniqueness enforced in service + DB

- Context & forces: legacy has `title`, `slug`, `color`. Slug exists only
  for legacy URL routes TaskFlow does not have. Color is optional in the
  UI but stored (default palette color when absent).
- Options considered: (a) title+color only, no slug; (b) keep slug for
  future tag pages.
- Decision: (a) — no speculative columns. Title is `NOT NULL`, trimmed,
  ≤ 50 chars; unique per workspace case-insensitively via a Postgres
  expression index `UNIQUE (workspace_id, lower(title))` plus a service
  pre-check. The race loser catches the constraint violation and maps it
  to 409 CONFLICT — never a 500 (precedent: `WorkspaceService`
  duplicate-name handling).
- Consequences: renaming a tag to an existing title (any case) is rejected;
  two workspaces may reuse titles freely.

### D4 — Deletion semantics: tag delete detaches, project delete cascades

- Context & forces: `project_tags` rows are meaningless without either
  side. Losing a tag should not destroy projects; losing a project should
  not leave orphan assignments.
- Options considered: (a) FK cascade on both sides; (b) soft-delete tags.
- Decision: (a) — `project_tags` carries a denormalized `workspace_id`
  column with composite FKs `(project_id, workspace_id) → projects(id,
  workspace_id)` and `(tag_id, workspace_id) → tags(id, workspace_id)` —
  the same tenancy-by-schema pattern as V3 tasks and V4 comments, so a
  cross-workspace link is impossible at the DB level, not just
  service-checked. `project_id` and `tag_id` are `ON DELETE CASCADE`.
  Tag deletion deletes the tag row (hard delete — tags are cheap to
  recreate; soft-delete taxes every list query). The pivot is write-through
  SQL/native queries with no JPA entity and no surrogate key (unlike the
  legacy pivot's meaningless `id`).
- Consequences: no `deleted_at` columns; workspace deletion cascades tags
  through the existing project/workspace cascade chain — verify V5 wires
  `tags.workspace_id` cascade too.

### D5 — Frontend: badges + drawer assignment + management drawer + filter

- Context & forces: create/edit already lives in drawers (create-pane,
  workspace-pane). Tag management needs a home; `/projects` is the natural
  surface since tags are project-scoped.
- Options considered: (a) manage tags inside the project drawer only;
  (b) separate "Manage tags" drawer launched from `/projects` header;
  (c) dedicated `/tags` page.
- Decision: (b)+(a): a "Tags" button on `/projects` opens a management
  drawer (list/create/rename/recolor/delete, same `Drawer` primitive —
  rename/recolor are owner/admin-gated like the other mutations); the
  project drawer gains an edit mode (name/description/color/tag
  multi-select — checkbox list of workspace tags) alongside create mode.
  Filter = clickable tag chips above the project list, client-side.
  `ProjectDto.tags` is batch-fetched for list endpoints (one grouped
  query, no N+1 — precedent: `Task.countGroupedByProject`).
- Consequences: no new routes; consistent with the drawer pattern; filter
  stays client-side (project lists are small).
