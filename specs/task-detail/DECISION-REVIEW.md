# Decision review — task-detail (D1–D5)

- Source: `specs/task-detail/SPEC.md` § Decisions
- Reviewer: decision-challenger (advisory — never blocks a gate or merge)
- Grounded in: `backend/src/main/java/com/taskflow/{model/Task.java,
  service/{TaskService,ProjectService,WorkspaceService}.java,
  resource/{TaskResource,TaskItemResource}.java}`,
  `backend/src/main/resources/db/migration/V3__projects_tasks.sql`,
  `backend/src/test/java/com/taskflow/ProjectTaskResourceTest.java`,
  `frontend/src/{api.ts,pages/ProjectDetailPage.tsx}`,
  `specs/{task-detail/EXAMPLES.feature,task-detail/GATES.md,
  projects-tasks/DECISION-REVIEW.md}`.

## Facts vs claims

- **Fact:** the authz choke points D2 names are real and reused verbatim
  by every resource: `requireProject` loads the project then calls
  `workspaceService.requireMembership` (`ProjectService.java:31-38`);
  `requireMembership` is 2 indexed queries (`WorkspaceService.java:39-50`);
  `requireRole` is a pure role check (`WorkspaceService.java:58-65`);
  every resource funnels through `currentUser()` = `requireUser` +
  `requireVerified` (`TaskItemResource.java:86-90`). Comment authZ can
  reuse all of it unchanged.
- **Fact:** the tenancy denormalization precedent is stronger than the
  spec implies — the prior review's "composite FK" recommendation was
  implemented: `tasks` carries `(project_id, workspace_id)` with a
  composite FK to `projects(id, workspace_id)` enforced by
  `uq_projects_id_workspace` (`V3__projects_tasks.sql:12,30-33`), and
  `tasks.workspace_id` is provably equal to the project's
  (`Task.java:39-41` comment). **But `tasks` has no `UNIQUE(id,
  workspace_id)`** — the composite-FK target D1 wants for comments does
  not exist yet; V4 must add it (or reference `tasks(id)` alone).
- **Fact:** `TaskService.requireTaskProject` (`TaskService.java:60-66`)
  already demonstrates the exact lookup pattern comments need: find
  child by id → resolve parent → `requireProject` → membership. A
  comment service can mirror it via `comment.taskId` → `requireTaskProject`.
- **Fact:** the frontend contract gap flagged in the projects-tasks
  review is closed: `api.ts:40-41` now exposes `patch`, used by
  `ProjectDetailPage.tsx:79,161`. D5's PATCH comment update has a client
  helper today.
- **Fact:** test conventions support every @w1 scenario:
  `ProjectTaskResourceTest` is REST-assured `@QuarkusTest` with
  register→verify→login helpers and `MockMailbox`
  (`ProjectTaskResourceTest.java:26-80`); frontend has vitest/jsdom +
  testing-library. No Playwright.
- **Fact:** comments have no `position` column concept anywhere; the
  only ordering precedent is `created_at`/`position` on tasks
  (`Task.java:61-71`). D4's "chronological created_at asc" is a new but
  trivially simple ordering rule.
- **Claim under review:** five decisions covering persistence, authZ,
  body validation, read-window semantics, and REST shape — the entire
  backend contract of a child-aggregate feature whose parent aggregate
  (task→project→workspace) already shipped.

---

## D1 — Persistence: `comments` table via Panache + Flyway V4

**Steelman.** Comments are the canonical child CRUD record; the stack
(Panache active-record + hand-written Flyway) is proven across V1–V3.
D1's strongest move is copying the *shipped* tenancy pattern rather than
inventing one: denormalize `workspace_id` onto comments so every authz
check is a direct `requireMembership(comment.workspaceId, user.id)` —
no task→project→workspace traversal per request. The rejected
alternatives are correctly rejected: event sourcing has no replay
requirement; a JSON blob on the task row breaks per-comment authZ,
ordering, and the 200-cap query. Two-way door is accurate — additive
table.

**Challenge — the composite FK it promises doesn't exist yet.** D1 says
"(task_id, workspace_id) composite FK mirroring the tasks→projects
pattern." The tasks→projects pattern works because V3 created
`UNIQUE(id, workspace_id)` on `projects` as the FK target
(`V3__projects_tasks.sql:12`). `tasks` has **no** such unique constraint —
only indexes (`V3__projects_tasks.sql:34-36`). So V4 must either:

- add `CONSTRAINT uq_tasks_id_workspace UNIQUE (id, workspace_id)` on
  tasks, then `FOREIGN KEY (task_id, workspace_id) REFERENCES
  tasks(id, workspace_id)` on comments — DB-enforced "comment's
  workspace == task's workspace," the strongest option, ~3 lines; or
- reference `task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE`
  alone and rely on service-set `workspace_id` — cheaper DDL but the
  same integrity-by-convention risk the prior review flagged for D7,
  now one level down.

This is a spec-text gap, not a design flaw — but it is exactly the kind
of implicit contract that produced wave-level surprises last feature.
Two smaller holes ride along: **cascade on task delete** — if comments
FK to `tasks(id)`, does `ON DELETE CASCADE` apply (comments die with the
task — almost certainly desired, and `TaskService.delete` at
`TaskService.java:181-188` currently deletes the row without touching
children; the composite-FK path makes cascade declarative like
`fk_tasks_project_workspace`'s `ON DELETE CASCADE`)? And **the read
index** — D4's "newest 200" query is
`WHERE task_id=? ORDER BY created_at DESC LIMIT 200`; without
`INDEX(task_id, created_at)` on comments it's a seq scan per detail
view. Both belong in V4's DDL, both are one line each.

**Verdict on D1: sound direction; write the V4 contract.** Specify the
unique constraint + composite FK (preferred, consistent with the D7
precedent the team already chose) or accept plain FK + a consistency
test; state task-delete cascade; add the `(task_id, created_at)` index.

## D2 — Authorization: membership for read/write; author-edit; author-or-admin-delete

**Steelman.** This is the least-privilege version of standard team-tool
comment semantics (Linear/Slack behave this way): read/write gated by
workspace membership, edit restricted to the author *even for admins*
— preserving comment integrity as a record — while delete is open to
author-or-moderator, giving admins a spam-cleanup path without edit
tampering rights. Every mechanism exists: membership via
`requireMembership`, role check via `requireRole(ROLE_OWNER,
ROLE_ADMIN)` (`WorkspaceService.java:58-65`), author check is a field
compare on `comment.authorId`. EXAMPLES @w1 already encodes the subtle
part — "admin can moderate but not edit" (`EXAMPLES.feature:46-51`) —
so the spec and scenarios agree; the prior feature's D3
contradiction does not repeat here.

**Challenge — three seams to name, none blocking:**

1. **Membership-loss edge.** If a comment author's workspace
   membership is later removed (`WorkspaceService.removeMember`,
   `WorkspaceService.java:137-153` deletes the member row), they can no
   longer pass `requireMembership` — so they cannot edit or delete
   their own comment. Correct by construction (comments belong to the
   workspace, not the person), but worth one line so no implementer
   "helpfully" adds an author-bypass that skips membership.
2. **Author identity resolution.** AC-6 requires "author name" in the
   response. The established pattern is batch-resolve users then map
   (`TaskService.toDtos`, `TaskService.java:73-88` — collect distinct
   `assigneeId`s, one `User.list("id in ?1")`, map names). Comments need
   the same for `authorId`; note it so wave planning doesn't ship N+1
   per comment.
3. **404-vs-403 leak surface.** AC-2 accepts "403 or 404"; the existing
   convention resolves existence-then-membership
   (`requireProject` throws 404 for missing project, 403 for
   non-member — `ProjectService.java:31-38`), which *does* leak task
   existence to non-members (403 vs 404 distinguishes). That is the
   shipped behavior for tasks; comments inherit it. Consistent — but
   the spec should say comments follow the same convention rather than
   implying uniform 404.

**Verdict on D2: ACCEPT.** Add: author edits/deletes still require
membership (no author bypass); batch author-name resolution note;
404/403 convention inherited from `requireProject`.

## D3 — Body: plain text, `@NotBlank` + `@Size(max=5000)`, text rendering

**Steelman.** Server-side length cap + bean validation is the smallest
correct validation story; `@Size`/`@NotBlank` already appear on request
records (`TaskResource.java:42-49` uses `@NotBlank`). Plain text is
XSS-safe by construction because React escapes — no sanitizer
dependency, no renderer. "Markdown can be layered on later without
schema change" is the accurate reversibility claim: the column is TEXT,
formatting is a render-time concern. Correctly rejects markdown/rich
text as unproven scope (same discipline as projects-tasks D2's fixed
enum).

**Challenge — thin; two footnotes.** (1) Where does validation live —
bean validation on the request record (like `CreateTaskRequest`)
versus service check (like `TaskService`'s manual `title.isBlank()` at
`TaskService.java:109-111`)? Both exist in the codebase; spec should
say `@NotBlank @Size(max=5000)` on the request DTO and mirror the
blank-check in the service for defense in depth, matching how
`create`/`update` double-check title. (2) 5000 chars — Postgres TEXT
has no limit, so the cap is purely app-level; that's fine, but note
`@Size` counts UTF-16 code units, so emoji-heavy comments hit the cap
earlier than users expect. Non-issue at this size; don't gold-plate.

**Verdict on D3: ACCEPT.** One line: validation on request DTO +
service mirror, matching existing task-field precedent.

## D4 — Ordering & volume: `created_at` asc, newest-200 window

**Steelman.** The honest framing — "a documented cap beats an unbounded
query" — is right. Threads are expected small; returning-all is the
classic unbounded-list bug waiting for the first viral task; cursor
pagination is real machinery (opaque cursors, stable-sort guarantees,
client merge logic) for a v1 that doesn't need it. The chosen window is
the smallest bounded option: one query,
`ORDER BY created_at DESC LIMIT 200` reversed to asc, or
`ORDER BY created_at DESC LIMIT 200` then flip client-side. API-stays-
append-only means the window is stable under new comments — the newest
slice doesn't reshuffle.

**Challenge — three precision gaps:**

1. **Tie-break.** `created_at TIMESTAMPTZ DEFAULT now()`
   (`V3__projects_tasks.sql:28`) has microsecond precision — collisions
   are rare but possible (bulk inserts, tests seeding rows in one
   transaction share `now()`? No — `now()` is transaction-start time in
   Postgres, so **two comments inserted in one transaction get identical
   `created_at`**). Order must be `created_at DESC, id DESC` (then flip)
   or ordering is nondeterministic within a tx. One line in the spec.
2. **Truncation signal.** If a thread exceeds 200, the API silently
   returns the newest 200 — the UI can't distinguish "200 comments" from
   "200 of 450." Options: a `truncated`/`hasMore` boolean on the list
   response (requires wrapping the bare array in an envelope — a small
   API-shape change vs. the flat `List<TaskDto>` convention at
   `TaskResource.java:53`), or a `?before=` cursor param reserved for
   later, or accept silence. Cheapest honest option: keep the flat list
   but document that >200 threads are out of scope until pagination —
   the consequence is already acknowledged in D4; just make sure the
   *frontend* empty/error states don't imply completeness. Alternatively
   the envelope is ~10 lines and future-proofs pagination. Either is
   defensible; pick one.
3. **Window edge semantics.** "Newest 200" then rendered asc means the
   *oldest visible* comment is mid-thread with no "earlier comments
   exist" marker — users may think the thread starts there. If (2)
   resolves to a flag, the UI can show "showing latest 200" — free UX
   honesty. If not, accept it.

**Verdict on D4: ACCEPT with contract tightening.** Specify the
`(created_at, id)` ordering tiebreak and decide the truncation signal
(flag or documented silence). Both are spec-text changes.

## D5 — API shape: nested `/tasks/{id}/comments` + item `/comments/{id}`

**Steelman.** Mirrors the shipped convention exactly:
`TaskResource` is `@Path("/projects/{projectId}/tasks")` for collection
ops (`TaskResource.java:24`) and `TaskItemResource` is
`@Path("/tasks")` + `/{id}` for item ops (`TaskItemResource.java:23,55`).
Comments get `TaskCommentsResource` (`/tasks/{taskId}/comments`) +
`CommentItemResource` (`/comments/{id}`) — two thin JAX-RS classes, one
service, same `currentUser()` boilerplate. GET item endpoint earns its
place (edit-form hydration, deep-linking). OpenAPI `@Tag`/`@Operation`
annotations match. Flat `?taskId=` and embed-in-task-GET are correctly
rejected — the former weakens the tenancy-in-URL property, the latter
couples comment volume to every task fetch.

**Challenge — almost nothing; verify the seams.** (1) PATCH body shape:
edit is body-only (`{body}`), delete returns 204 — consistent with
`TaskItemResource` (`delete` → `Response.noContent()`,
`TaskItemResource.java:73-76`). Say it. (2) The nested collection needs
the task-existence + membership check — reuse
`requireTaskProject`-equivalent (`TaskService.java:60-66`) so a
nonexistent task 404s before membership is even consulted, matching
`/projects/{id}/tasks` behavior. (3) `GET /comments/{id}` on the item
resource resolves comment → task → project → membership — same chain
as PATCH/DELETE; one service method `requireComment(commentId, userId)`
returning `(comment, ProjectRef)` serves all three, mirroring
`requireTaskProject`. Fine as designed; naming it prevents three
slightly-different authz paths.

**Verdict on D5: ACCEPT.** Note the shared `requireComment` resolver and
the PATCH/DELETE response shapes.

---

## Cross-cutting findings

1. **D1's composite FK is the only real spec gap.** The prior feature's
   review converted "FK + service checks" hand-waving into a shipped
   `uq_projects_id_workspace` + composite FK (`V3__projects_tasks.sql:12,
   30-33`). D1 gestures at repeating that for comments but the required
   `UNIQUE(id, workspace_id)` on `tasks` doesn't exist — V4 must create
   it or downgrade to plain FK + test. Decide in the spec, not in the
   migration author's head.
2. **AuthZ is uniformly strong.** D2 composes three proven choke points
   (`requireMembership`, `requireRole`, author-field compare) and the
   scenario suite already covers the subtle admin-cannot-edit case.
   Residual: membership-loss edge and the inherited 403-vs-404 existence
   leak — both consistent with shipped behavior, both worth one line.
3. **D4's two gaps are contract-level, not design-level:** deterministic
   ordering needs the `id` tiebreak (Postgres `now()` is
   transaction-time — same-tx comments tie), and the 200-cap needs a
   truncation story or explicit acceptance of silent truncation.
4. **Every reversibility claim survives scrutiny.** Comments table is
   additive; authZ lives in service checks; plain-text→markdown is a
   render-layer change; the 200-cap→cursor-page path is additive. No
   decision creates lock-in.

## Scorecard

| Lens | Score | Evidence | Action |
|------|-------|----------|--------|
| Problem & forces | 5 | Real gap (SPEC.md:9-13); comments scoped out of projects-tasks explicitly; daily-loop discussion need | Keep |
| Alternatives & tradeoffs | 5 | Each decision names 3 credible options with honest costs; simplest option (do-less: no comments / embed in description) implicitly covered by scope-out list | Keep |
| Domain fit (DDD) | 4 | Comments correctly modeled as task child aggregate; tenancy denormalization matches shipped `tasks.workspace_id` pattern (`Task.java:39-41`); but D1's FK target constraint missing | Specify V4 unique constraint + composite FK |
| Architecture & boundaries | 4 | Reuses `requireMembership`/`requireRole`/`requireProject` verbatim (`WorkspaceService.java:39-65`, `ProjectService.java:31-38`); REST shape mirrors `TaskResource`/`TaskItemResource`; `api.patch` exists (`api.ts:40`) | Name shared `requireComment` resolver; state PATCH/DELETE shapes |
| Testable design | 4 | Every @w1 authZ/validation scenario maps to REST-assured `@QuarkusTest` (`ProjectTaskResourceTest.java:26-80` precedent); vitest infra exists; cap/window logic unit-testable; concurrency N/A (append-only, no position rewrite) | Add scenario or note for >200 truncation behavior |
| Craftsmanship | 3 | Smallest-step discipline excellent; but implicit contracts recur: composite-FK target, cascade on task delete, ordering tiebreak, truncation signal, validation-location convention | Write 4 one-line contracts into spec |
| Decision record | 5 | Context/options/why/consequences/reversibility all present per decision; revisit triggers concrete (markdown on first request; pagination when threads exceed cap; admin-edit if abuse) | Keep |

## Verdict

```
VERDICT: REVISE
STEELMAN: Five small, honest, reversible decisions that compose the
proven authz choke points (requireMembership/requireRole/
requireProject), replicate the shipped tenancy-denormalization pattern,
match the REST conventions of TaskResource/TaskItemResource exactly,
and defer every heavy alternative (event sourcing, markdown, cursor
pagination, rich text) behind explicit revisit triggers — the spec's
real strength is that nothing here needs new infrastructure and every
"two-way door" claim survives scrutiny once the implicit contracts are
written down.
SMALLEST NEXT STEP: Amend D1 with the V4 schema contract — add
UNIQUE(id, workspace_id) on tasks (V3 lacks it) + composite FK from
comments(task_id, workspace_id), or downgrade to plain
task_id REFERENCES tasks(id) ON DELETE CASCADE + a consistency test;
state task-delete cascade and the (task_id, created_at) index — then add
two one-liners to D4 (ordering tiebreak `created_at, id`; truncation
flag-or-silence decision) and one to D2 (author ops still require
membership; batch author-name resolution).
REVISIT TRIGGER: (a) first thread exceeding 200 comments or first user
request for older-history paging → re-open D4 with cursor pagination;
(b) first request for formatted/@-mentioned comments → re-open D3/D-scope
with the notifications feature; (c) comment abuse patterns showing
member-spam with no admin recourse → re-open D2 (already flagged);
(d) any need for comment history/edits audit → re-open D1's
"no history beyond updated_at" consequence alongside the deferred
activity-log feature.
```

Residual risks even after revision: the 200-cap silently hides oldest
comments on long threads — acceptable v1, but the truncation-signal
decision determines whether users can even tell; comment author names
require batch user resolution (N+1 risk is one `User.list("id in ?1")`
away if implementers don't follow `TaskService.toDtos`); and like the
parent feature, every authz invariant lives in service code — the
composite FK is the only mechanical enforcement, so the D1 contract is
the load-bearing line in this whole review.

*Advisory review — does not block G1 by itself; the gate owner decides.*

## Alternatives considered (summary)

- **Comments as JSON blob / embedded in task description:** zero schema
  work; loses catastrophically on per-comment authZ, ordering, edit
  timestamps, and the 200-cap query — correctly rejected by D1.
- **Event-sourced activity stream:** gives history/audit for free;
  loses on infrastructure paradigm (event store, projections, replay)
  for a CRUD feature with no replay requirement — correctly rejected;
  revisit only if the deferred activity-log feature materializes.
- **Do nothing / comments in a separate tool:** simplest possible;
  loses on the stated problem (discussion must live with the work item)
  — the feature exists because side channels already failed.
- **Author-only permissions, no admin moderation:** simpler rule set;
  loses on abuse recourse — a spammed workspace has no cleanup path;
  correctly rejected by D2.
- **Admin-can-edit-anything:** one fewer rule branch; loses on comment
  integrity (moderation ≠ tampering) — correctly rejected; EXAMPLES
  @w1 already pins the intended semantics.
- **Return-all comments, no cap:** simplest query; loses on unbounded
  payload degradation — the classic latent bug; correctly rejected by D4.
- **Cursor pagination now:** future-proof; loses on real machinery
  (opaque cursors, stable sort, client merge) for expected-small
  threads — correctly deferred; the `(created_at, id)` ordering chosen
  in D4 is exactly what a future cursor needs, so the door stays open.
- **Flat `/comments?taskId=` or embed-in-task-GET:** fewer resource
  classes; loses on tenancy-in-URL consistency and independent comment
  authZ/fetch granularity — correctly rejected by D5.
- **Markdown/rich text now:** matches reference-product polish; loses on
  sanitizer dependency + renderer risk + scope — correctly deferred;
  TEXT column makes it a render-layer change later.

---

*End of review.*
