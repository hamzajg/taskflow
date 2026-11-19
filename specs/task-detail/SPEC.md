# Spec: task-detail

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

Tasks today are rows on a board — there is nowhere to see a task's full
context or to talk about it. The daily loop stalls at "what did we decide
on this task?" Members currently have no way to leave a durable note,
ask a question, or record reasoning attached to the work item itself.
Every workspace member hits this as soon as real work lands on the board.

## Users

Workspace members (owner/admin/member) who execute and discuss work;
project owners who need the discussion to live with the task, not in
chat silos.

## Outcome hypothesis

- Expected user outcome: a member opens a task, sees its complete state
  at a glance, and reads or adds comments — the discussion becomes part
  of the work item instead of disappearing into side channels.
- Opportunity evidence: assumption — derived from the reference
  product's feature set (comments on tasks is table stakes for this
  category) and from projects-tasks explicitly scoping comments out.
  No usage data exists yet.
- Signal: qualitative — task detail views and comments created via UI;
  no numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **Task detail page** at `/tasks/:id`: all task fields (title,
  description, status, priority, assignee, due date, project link),
  reachable from list and board views.
- **Comments**: workspace members can read and post comments on any
  task in a workspace they belong to; comments render chronologically
  with author name and timestamp.
- **Comment editing**: authors can edit their own comment body;
  authors can delete their own comment.
- **Moderation**: workspace owner/admin can delete any comment in their
  workspace (cannot edit another member's comment).
- **Task field editing stays where it is**: the detail page links back
  to the project screens for edits; a dedicated edit surface on the
  detail page is out of scope for this feature.
- Frontend: new route, entry points from the project list view and
  board cards.

## Scope (out)

- @mentions and any notification delivery (needs the notifications
  feature).
- Comment attachments, images, rich text/markdown.
- Activity/audit log of task changes (separate feature candidate).
- Real-time comment updates (polling/reload only, consistent with
  projects-tasks).
- Editing task fields from the detail page.
- Comment reactions, threading/replies, pinning.
- Pagination beyond a sane cap (see D4).

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Workspace members can list and post comments on tasks in their workspace | @w1 |
| 2 | Non-members and cross-workspace task IDs get 403/404 with no data leak | @w1 |
| 3 | Comment body is validated (non-blank, length-capped) | @w1 |
| 4 | Authors can edit and delete their own comments; others get 403 | @w1 |
| 5 | Workspace owner/admin can delete any comment (moderation) | @w1 |
| 6 | Comments return in chronological order with author identity | @w1 |
| 7 | Task detail page shows every task field and links back to its project | @w2 |
| 8 | Comments thread renders on the detail page; posting adds a comment | @w2 |
| 9 | Empty comment thread shows a useful empty state; errors offer retry | @w2, @w3 |
| 10 | New screens meet the accessibility bar in both themes | @w3 |

## Decisions

> Filled before wave planning; `challenge_decision` reviews this section.
>
> **DECISION-REVIEW outcome: REVISE — answered.** `DECISION-REVIEW.md`
> (verdict REVISE) found one substantive gap — the composite-FK target
> on `tasks` did not exist — plus contract ambiguities. All are folded
> back: D1 now specifies the `uq_tasks_id_workspace` precondition and
> cascade/index/sequence details; D2 clarifies membership-is-still-
> required and batch name resolution; D4 specifies the `created_at, id`
> tiebreak and the `hasMore` truncation signal; D5 notes the
> `CommentListDto` wrapper. Advisory verdict never blocked; spec
> amended before wave planning.

- **D1 — Persistence: relational `comments` table (Panache entity),
  Flyway V4 migration.**
  - Context & forces: comments are classic CRUD child records of tasks;
    the codebase already uses Panache + Flyway and denormalizes
    `workspace_id` onto tasks for tenancy checks.
  - Options considered: (a) normalized `comments` table with
    `(task_id, workspace_id)` composite FK mirroring the tasks→projects
    pattern (consistent, testable); (b) event sourcing / activity
    stream (overkill — no replay requirement); (c) JSON blob on the task
    row (breaks per-comment authZ and ordering).
  - Decision & why: (a). Two-way door — additive migration.
  - Schema contract (per DECISION-REVIEW): `tasks` currently lacks the
    composite-FK *target*, so V4 first adds
    `uq_tasks_id_workspace UNIQUE (id, workspace_id)` on `tasks`, then
    creates `comments(id, task_id, workspace_id, author_id, body,
    created_at, updated_at)` with
    `FOREIGN KEY (task_id, workspace_id) REFERENCES tasks(id,
    workspace_id) ON DELETE CASCADE` — task deletion removes its
    comments, matching the projects→tasks cascade. Index
    `(task_id, created_at, id)`; sequence `INCREMENT BY 50` like V3.
  - Consequences: + same tenancy choke points, simple queries, DB-level
    guarantee that `comments.workspace_id` equals the task's workspace.
    − no history beyond updated_at.
  - Reversibility: two-way door.

- **D2 — Authorization: membership for read/write; author-only edit;
  author-or-owner/admin delete.**
  - Context & forces: `requireProject`/`requireMembership`/`requireRole`
    are the existing choke points; comments inherit tenancy through
    their task's project.
  - Options considered: (a) author edits own, author deletes own,
    owner/admin deletes any (moderation without edit rights — mirrors
    team-tool norms); (b) author-only for everything (no moderation —
    abuse has no recourse); (c) admin can edit anything (too powerful,
    invites tampering).
  - Decision & why: (a) — least privilege that still gives workspace
    admins a cleanup path.
  - Clarifications (per DECISION-REVIEW): author operations still
    require workspace membership — comment authZ never bypasses
    tenancy; comment author display names are batch-resolved in one
    query (no N+1), following the `TaskService.toDtos` assignee-name
    pattern.
  - Consequences: + simple mental model. − members can't remove others'
    spam unless they're admin (accepted; revisit if abuse appears).
  - Reversibility: two-way door (rule lives in service checks).

- **D3 — Comment body: plain text, `@NotBlank` + `@Size(max=5000)`,
  rendered as text (React escapes by default).**
  - Context & forces: rich text/markdown needs sanitization and a
  renderer; mentions need a notification feature to mean anything.
  - Options considered: (a) plain text with server-side length cap
    (simplest, XSS-safe by construction); (b) markdown with sanitizer
    (dependency + rendering risk); (c) rich text editor (heavy).
  - Decision & why: (a) for v1 — reversible; markdown can be layered on
  later without schema change.
  - Consequences: + zero deps, safe. − no formatting; revisit trigger =
    first user request for formatted comments.
  - Reversibility: two-way door.

- **D4 — Comment ordering & volume: `created_at, id` ascending
  (id tiebreak — Postgres `now()` is transaction-time, so same-tx
  comments tie), newest-200 window, explicit truncation signal.**
  - Context & forces: threads are expected to stay small; unbounded
  lists degrade the detail page; silent truncation hides data.
  - Options considered: (a) return all asc (simplest, unbounded);
    (b) cursor pagination (correct but heavy for v1); (c) newest-200
    window (bounded, simple, acceptable UX).
  - Decision & why: (c) — a documented cap beats an unbounded query.
  - Contract (per DECISION-REVIEW): `GET /tasks/{id}/comments` returns
    `CommentListDto { comments: CommentDto[], hasMore: boolean }` —
    `hasMore` is true when more than 200 comments exist, so truncation
    is never silent. Ordering inside `comments` is chronological asc.
  - Consequences: + predictable payload, honest contract. − very long
    threads lose the oldest comments in the UI until pagination lands.
  - Reversibility: two-way door (cursor pagination can replace the
    window without schema change; revisit trigger = first thread >200
    comments or a paging request).

- **D5 — API shape: nested collection `/tasks/{id}/comments`
  (GET list, POST create) + item `/comments/{id}` (GET, PATCH, DELETE)
  with OpenAPI annotations, matching existing resource conventions.**
  - Context & forces: comments belong to exactly one task; item ops
  need stable ids independent of the parent path.
  - Options considered: (a) nested + item resources (consistent with
    `/projects/{id}/tasks` + `/tasks/{id}`); (b) flat `/comments?taskId=`
    (weaker contract); (c) embed comments in task GET (chatty, no
    independent authZ).
  - Decision & why: (a) — mirrors the shipped task API exactly.
  - Consequences: + discoverable via generated OpenAPI. − two resource
    classes; list response uses the `CommentListDto` wrapper from D4
    rather than a bare array (documented deviation for the hasMore
    signal).
  - Reversibility: two-way door (additive endpoints).
