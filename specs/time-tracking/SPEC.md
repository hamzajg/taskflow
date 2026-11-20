# Spec: time-tracking

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

TaskFlow tasks have no way to record how long work took. Teams cannot answer
"how much time went into this project?" — no manual entries, no timer, no
per-person visibility. Time tracking is a core daily-work feature in the
product category and the most-requested gap after task organization.

## Users

Workspace members logging time against tasks they can see (primary); owners/
admins reviewing totals; anyone glancing at a task's time summary.

## Outcome hypothesis

- Expected user outcome: a member opens a task, logs minutes manually or
  runs a start/stop timer, and sees a per-task total plus their entry
  history; the project page shows aggregate time so effort is visible.
- Opportunity evidence: legacy product ships task time entries
  (entry_date, minutes-equivalent via standard/flexible types,
  description, workspace-scoped) plus a timer; TaskFlow has zero time
  concepts (verified: no `time` in models/migrations/frontend).
- Signal: `GET /tasks/{id}/time-entries` returns entries and the task DTO
  carries a total; the task detail page renders the section.
- Follow-up owner/date: agent, at feature finish.

## Scope (in)

- Backend: `time_entries` table — `task_id` + `workspace_id` composite FK
  to tasks (same tenancy-by-schema pattern as comments), `user_id`,
  `entry_date`, `minutes` (manual entries), `started_at`/`ended_at`
  (timer entries), `description`; Flyway migration V6.
- REST: `GET/POST /tasks/{taskId}/time-entries` (list response includes
  the caller's running entry if any), `PATCH/DELETE /time-entries/{id}`,
  `POST /tasks/{taskId}/time-entries/timer/start`,
  `POST /time-entries/timer/stop` (stops the caller's single running
  entry), `GET /time-entries/running` (caller's running entry or null).
  Validation: minutes 1–1440 for manual entries (timers exempt — see
  D4), description ≤ 500, entry_date not future-dated (server date).
- Authorization: writes require a verified user (same as comments).
  Any workspace member can list/create entries on tasks in their
  workspace; users edit/delete only their own entries; owner/admin can
  delete any entry in the workspace. PUT-equivalent mutations on a
  *running* entry are rejected 409 — it must be stopped first.
- Timer semantics: one running timer per user **globally** (decision D3);
  start computes nothing, stop computes minutes; a `GET
  /time-entries/running` lookup lets any surface discover a timer started
  on another task.
- Aggregates: task DTO gains `totalMinutes`; project detail lists per-task
  totals; task detail shows entries + total.
- Frontend: "Time" section on task detail — entries list (user, date,
  duration, description), add-entry form, start/stop timer control with
  live elapsed display, delete (own entries; owner/admin any).
- Tests: backend resource tests for CRUD/authz/validation/timer/cascade;
  frontend tests for the section, form, timer, and totals.

## Scope (out)

- Billable flags, rates, or invoicing (no billing subsystem exists).
- Per-project enable/disable switch for time entries (legacy had one —
  TaskFlow keeps it always-on; revisit if noise becomes an issue).
- Timesheet/report views, calendar views, exports.
- Editing entries logged by other users (owner/admin delete only).
- Retroactive timer edits, pause/resume within a timer.
- Notifications on timer start/stop or time thresholds.
- Time entry approvals/workflows.

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Members can list and create manual time entries on tasks in their workspace; entries carry user, date, minutes, description | Members can list time entries; Member logs a manual time entry |
| 2 | Only the entry author can edit/delete their entry; owner/admin can delete any workspace entry; foreign-workspace access is impossible | Author edits own entry; Member cannot touch another user's entry; Admin deletes any entry |
| 3 | Validation rejects bad input: minutes out of range, blank description handling, future dates | Invalid time entry input is rejected |
| 4 | Timer: start creates a running entry, stop closes it and computes minutes; one running timer per user | Timer start and stop compute minutes; Second timer start while running is rejected; Running timer is discoverable across tasks |
| 5 | Task and project surfaces show time totals; deleting a task cascades its entries | Task detail shows time total and entries; Time section lists entries and total on task detail; Member logs time from the UI; Timer controls run and stop from the UI; Member sees own-entry controls only; Deleting a task removes its time entries |
| 6 | Time UI works in both themes with labelled controls | Time section works in both themes |

## Decisions

### D1 — Entries are task children with composite-FK tenancy

- Context & forces: comments already prove the pattern — child table with
  `(parent_id, workspace_id)` composite FK so cross-workspace references
  are DB-impossible. Time entries are the same shape.
- Options considered: (a) `time_entries(task_id, workspace_id)` composite
  FK to `tasks(id, workspace_id)`; (b) workspace_id denormalized without
  composite FK; (c) entries keyed to project instead of task.
- Decision: (a) — task-level entries (legacy parity), composite FK,
  `ON DELETE CASCADE` so task deletion cleans up. No JPA entity needed
  for anything beyond the entry itself.
- Consequences: `GET /tasks/{id}/time-entries` resolves the task's
  workspace via the existing `requireTask` path; entries inherit task
  visibility (any member who can see the task can see its entries).

### D2 — Minutes is the canonical unit; timer derives it

- Context & forces: legacy stores standard_hours or start/end times —
  two representations of the same thing. TaskFlow needs one canonical
  unit for totals and display.
- Options considered: (a) `minutes INT` for manual + `started_at`/
  `ended_at` for timers (ended_at NULL = running); (b) store only
  start/end and compute display minutes; (c) decimal hours.
- Decision: (a) — `minutes` is always populated for completed entries
  (manual: provided; timer: computed at stop). A running timer row has
  `minutes NULL`, `started_at` set, `ended_at NULL`. `entry_date` is the
  user-facing date (defaults to today for timers, required for manual).
- Consequences: totals are `SUM(minutes)` ignoring running entries;
  a stopped-then-edited entry just updates `minutes`/`description`.

### D3 — One running timer per user, globally, enforced server-side

- Context & forces: the challenger caught that workspace-scoped
  uniqueness makes a timer started on task A undiscoverable/unstoppable
  from task B's UI — the stop endpoint would be task-scoped while the
  invariant is workspace-scoped. Global uniqueness removes the whole
  class: a user has at most one running entry, period.
- Options considered: (a) many running timers; (b) per-workspace
  uniqueness (rejected — unreachable stop state, needs extra discovery
  plumbing per workspace); (c) per-user global uniqueness.
- Decision: (c) — partial unique index `UNIQUE (user_id) WHERE
  ended_at IS NULL`. Start checks for an existing running entry inside
  the transaction and returns **409** with the running entry's task id;
  the unique-index violation on a concurrent start is caught and mapped
  to the same 409 (never a 500). Stop is `POST /time-entries/timer/stop`
  — user-scoped, closes the caller's only possible running entry; a
  second stop returns 409 "no running timer". `GET
  /time-entries/running` returns the caller's running entry (any
  workspace) or null so the UI can show "timer running on X" anywhere.
- Consequences: multi-workspace simultaneous timers are impossible —
  accepted trade-off (revisit trigger below); the running entry is
  always discoverable via `/time-entries/running`.

### D4 — Authz mirrors comments: author edits, admin deletes

- Context & forces: comments set the precedent — author can edit/delete
  own, others read. Time entries are personal records; admins need
  cleanup power without edit rights.
- Options considered: (a) author-only everything; (b) author edit/delete
  + owner/admin delete; (c) owner/admin full control.
- Decision: (b) — matches comment semantics extended with admin delete.
  Manual entries and stopped-timer entries follow the same rule. Item
  update uses **PATCH** (comment convention, not PUT). Consequences:
  `PATCH /time-entries/{id}` requires `user_id = caller`; `DELETE`
  allows author or workspace owner/admin — including a *running* entry,
  which deletes the row and frees the timer slot (admin cleanup power).
  `PATCH`/`DELETE` by the author on a *running* entry returns 409 —
  stop the timer first. Timer minutes are **rounded to the nearest
  minute, minimum 1**; the 1440 cap applies to manual entries only
  (an overnight timer may exceed it). `entry_date` for a timer is the
  start date (server local date); "not future-dated" validation uses
  the same server date.

### D5 — Frontend lives on task detail; totals surface on project page

- Context & forces: task detail already hosts comments — time entries are
  the same shape of sub-record. Project-level totals answer "effort per
  project" without a new page.
- Options considered: (a) time section inside TaskDrawer peek;
  (b) dedicated section on TaskDetailPage + totalMinutes in TaskDto;
  (c) separate /time page.
- Decision: (b) — TaskDetailPage gets a "Time" card after comments;
  `TaskDto.totalMinutes` powers a small "Xh Ym logged" line on task rows
  and the detail header. No drawer changes (peek stays lightweight).
- Consequences: `totalMinutes` is populated on **every** TaskDto-returning
  path (get, list, create, update, move) via one grouped
  `SUM(minutes)` query per call site — running entries contribute NULL
  and are ignored by SUM. Same batch pattern as tags.
