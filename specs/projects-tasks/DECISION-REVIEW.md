# Decision review — projects-tasks (D1–D12)

- Source: `specs/projects-tasks/SPEC.md` § Decisions
- Reviewer: decision-challenger (advisory — never blocks a gate or merge)
- Grounded in: `backend/src/main/java/com/taskflow/service/WorkspaceService.java`,
  `model/{Workspace,WorkspaceMember,WorkspaceInvite,User}.java`,
  `resource/WorkspaceResource.java`,
  `backend/src/main/resources/db/migration/V1__init.sql`,
  `frontend/src/{api.ts,shell/ShellContext.tsx,components/AppShell.tsx,pages/WorkspacePanel.tsx}`,
  `frontend/package.json`, `specs/projects-tasks/{EXAMPLES.feature,GATES.md}`,
  `specs/app-shell/DECISION-REVIEW.md` (format precedent).

## Facts vs claims

- **Fact:** the authorization choke point is real and tiny:
  `requireMembership` does exactly 2 indexed queries (workspace by PK,
  member by `(workspace_id, user_id)` — `WorkspaceService.java:39-50`,
  unique constraint at `V1__init.sql:29`), and `requireRole` is a pure
  role-string check (`WorkspaceService.java:58-65`). Every resource call
  funnels through `currentUser()` → `requireVerified` + `claims`
  (`WorkspaceResource.java:116-120`). There is **no** per-resource
  authorization precedent beyond workspace scope — projects/tasks will be
  the first nested resources.
- **Fact:** all existing FK columns are flat `BIGINT` + `REFERENCES`
  (`V1__init.sql:25-38`); `WorkspaceMember` mirrors this with plain
  `workspaceId`/`userId` columns (`WorkspaceMember.java:23-27`). There is
  **no** JPA `@ManyToOne` association anywhere — the codebase deliberately
  avoids entity relations.
- **Fact:** the frontend fetch wrapper exposes only `get/post/put/delete`
  (`api.ts:34-41`). **There is no `patch` method.** D8's `PATCH
  /tasks/{id}/move` and any field-level PATCH updates have no client
  helper today.
- **Fact:** `frontend/package.json:12-17` has 4 runtime deps (react,
  react-dom, react-router-dom, lucide-react). `@dnd-kit` would be dep #5;
  vitest + testing-library already exist (`package.json:18-28`), so D11's
  "frontend vitest" claim is grounded, not aspirational.
- **Fact:** the nav is a flat `NAV` array of 3 entries
  (`AppShell.tsx:16-20`) — D6's "sidebar gains a Projects nav item" is a
  one-line data change, consistent with the app-shell review's flat-nav
  guardrail.
- **Claim under review:** twelve decisions covering persistence,
  statuses, authorization, ordering, DnD, routing, tenancy, API shape,
  assignee rules, frontend state, tests, and delete semantics — i.e. the
  entire domain model of the product's core loop.

---

## D1 — Persistence: relational entity model (Panache), no event sourcing

**Steelman.** Projects/tasks are textbook CRUD aggregates; the codebase's
entire persistence story is Panache active-record + hand-written Flyway
(`V1__init.sql`, `V2__token_version.sql`). Event sourcing would import an
infrastructure paradigm (event store, projections, replay tooling) to
solve a problem — temporal audit — that no requirement states. Document
store breaks the Postgres-only deployment and every relational query the
board needs (group-by-status ordering, counts). Option (a) is not just
simplest, it is the *only* option consistent with D006-style
agent-agnostic, convention-matching minimalism.

**Challenge.** The honest question is not event sourcing (correctly
rejected) but **whether Panache active-record is the right entity style
for a many-to-one graph**. `Workspace`/`WorkspaceMember` are flat
single-table entities; tasks introduce the first real parent→child chain
(project → task, both → workspace). Active-record works, but the
spec never says whether `Task`/`Project` will be `@ManyToOne`-free flat
FK entities like `WorkspaceMember` (consistent, but every "get project
with tasks" becomes manual joins) or actual associations (idiomatic JPA,
but a new pattern in this codebase). D7's denormalization decision
implicitly assumes flat FKs — fine — but the spec should say so once, not
let each wave re-derive it. Also: "no temporal history" consequence is
understated for a *task tool* — "who moved this task / when did status
change" is the first feature users ask for after shipping. Accepted for
v1, but the revisit trigger ("audit/replay becomes a requirement") is
vaguer than it should be — name it: first request for task history /
activity feed.

**Verdict on D1: sound.** Add one line fixing the entity style (flat FK
columns, no `@ManyToOne`, matching `WorkspaceMember`) so wave implementers
don't invent associations ad hoc.

## D2 — Task status: fixed enum set, validated server-side

**Steelman.** Four statuses cover the canonical kanban loop; the
reference product's customizable statuses are real scope (a statuses
table, per-workspace ordering, rename/archive semantics, migration of
existing tasks) bought for an unproven need. The reversibility argument
is the strong one: **if the column is `VARCHAR` + app-level validation
(not a Postgres `ENUM` type), adding statuses later is an INSERT into a
lookup table or a widened validation set — zero task-row migration.** The
decision text says "statuses keyed as strings" but never says *how* —
this is the load-bearing detail.

**Challenge — three gaps:**

1. **Storage type unspecified.** "Validated server-side" + "CHECK"
   mentioned in options, but CHECK constraints are painful to widen
   (every new status = ALTER). The reversible path is: `status
   VARCHAR(20) NOT NULL` + validation in the service layer only, or a
   lookup table from day one. Pick one and write it down — a CHECK
   constraint quietly converts this "two-way door" into a migration
   event.
2. **Frontend hardcoding risk.** The board renders 4 columns; if the
   frontend hardcodes `['backlog','todo','in_progress','done']` as a
   literal, then the day statuses become dynamic the UI silently drops
   unknown statuses. Cheapest insurance: the status list is a single
   shared constant/endpoint the board maps over, and unknown statuses
   render rather than crash. One line in the spec prevents a future
   rewrite.
3. **"in_progress" naming.** Snake_case is fine for a key, but the
   reference product and most tools use display labels ("In Progress").
   Ensure the API returns/accepts keys while the UI owns labels — a
   `STATUS_LABELS` map. Trivial, but wave 3 will otherwise inline
   `'in_progress'` strings in JSX.

The customizable-statuses revisit trigger ("first user request") is
honest — there's no usage data yet, so this is assumption-driven scope
control, correctly labeled as such in the outcome hypothesis.

**Verdict on D2: ACCEPT with contract tightening.** Specify: VARCHAR +
service validation (no CHECK, no PG enum); single frontend status
constant; key/label separation. All three are ~free now, expensive to
retrofit.

## D3 — Authorization: membership for read/write, owner/admin for destructive ops

**Steelman.** `requireMembership` + `requireRole` is a proven,
2-query choke point (`WorkspaceService.java:39-65`) used identically by
every workspace endpoint. "Member can edit any task in a project they can
see" is how every team task tool behaves (Linear, Todoist team
environments) — assignee-scoped edits would be *stricter* than the
reference and confusing ("I can see it but can't fix a typo").
Per-task creator permissions add a `created_by` column and a fourth
rule branch for zero demonstrated need.

**Challenge — the spec contradicts itself on task deletion.** This is
the sharpest finding in the review:

- Scope §in (SPEC.md:43-45): "project/task delete restricted to
  owner/admin; members can manage tasks they can see."
- AC-7 (SPEC.md:72): "Only owner/admin can delete projects **or tasks
  they don't own**; members keep edit rights."
- EXAMPLES @w1 "Delete permissions respect roles" (EXAMPLES.feature:38-43):
  tests only *project* deletion by a member — **no scenario covers task
  deletion by role at all.**

"Tasks they don't own" implies a per-task ownership concept — presumably
creator — that appears nowhere in the task field list (SPEC.md:35-36:
title, description, status, priority, assignee, due date, position — no
`created_by`) and nowhere in D3's rule. Three readings are possible:

- (a) Only owner/admin may delete *any* task → members can create tasks
  they can never delete. Hostile UX, and contradicts "members can manage
  tasks they can see."
- (b) Members may delete tasks (any? their own?) → needs `created_by` to
  implement "their own," which the schema doesn't have.
- (c) "Own" means "assigned to" → then assignee-gated delete, a fourth
  permission rule not in D3.

Whichever is intended, **wave 1 will implement whichever reading the
implementer guesses**, and no scenario will catch a wrong guess. This is
a spec defect, not a D3 defect — but D3 is where the fix belongs.

**Smallest correct step:** amend D3 (or AC-7) to one unambiguous rule.
The cheapest consistent option: *"any member may create/edit/delete tasks
in projects they can see; owner/admin additionally may delete projects."
* That needs no `created_by`, matches scope §in's plain reading, and makes
AC-7's "tasks they don't own" clause deletable. If product intent really
is creator-scoped task delete, add `created_by BIGINT` to the task schema
*now* (it's free at creation time, expensive to backfill) and write the
rule explicitly.

Secondary challenge: "members can edit any task" also means a member can
reassign, retitle, or delete-move a task an admin considers theirs.
Accepted for v1 — typical team-tool semantics — but the consequence
("members can edit others' tasks") should also mention *delete* once the
rule above is settled, since delete is the destructive case.

**Verdict on D3: REVISE.** Direction is right; the delete-permission
matrix is undefined and untested. Resolve before wave planning.

## D4 — Task ordering: integer `position` per (project, status), `PATCH /tasks/{id}/move`

**Steelman.** Integer positions with a single transactional move
endpoint is the simplest scheme that is *correct*: the server owns one
unambiguous write (new status + index), the client never computes
positions, and "order survives reload" (AC-3) is trivially testable. The
rejected alternatives are honestly assessed — fractional/lexorank
ordering optimizes for write volume this app doesn't have (columns are
tens of tasks, not thousands), and full-list reorder is genuinely
race-prone. "Correctness first; column sizes are small" is the right
priority ordering.

**Challenge — concurrency is unaddressed.** "Rewrites the affected
column's positions in one transaction" prevents *partial* writes but not
*interleaved* writes: two members dragging tasks in the same column
simultaneously both read positions [0..n], both write [0..n+1] — last
committer wins, first drag silently lost. Options, cheapest first:

- `SELECT ... FOR UPDATE` on the project's task set (or a project-level
  advisory lock / `pg_advisory_xact_lock(project_id)`) inside the move
  transaction — serializes moves per project, ~3 lines, correct.
- Optimistic check: move request carries expected position/version;
  409 on mismatch, client refetches — more code, better UX under
  contention, but single-user-per-project reality makes it overkill.
- Accept last-writer-wins — defensible *if stated*, since scope-out
  already excludes realtime collab; but then AC-3's "order survives
  reload" should be read as "survives *sequential* operations."

Recommend the advisory-lock/`FOR UPDATE` option — it's nearly free and
turns a silent data-loss race into correct serialization. Also
underspecified: **position semantics on status change.** Moving to a new
column needs a position in *that* column (append? insert-at-index?); the
API contract should say `position` is the target index within the
destination column, clamped server-side. And integer rewrite means gaps
are impossible by construction — fine — but specify whether positions
are 0- or 1-based and whether they're dense after every move (dense =
simpler client math, same O(n) cost already paid).

**Verdict on D4: ACCEPT with two contract additions** — per-project
serialization in the move transaction, and explicit position semantics
(index-in-destination-column, dense, base). Both are spec-text changes,
not design changes.

## D5 — Board interaction: native HTML5 DnD + keyboard fallback, no library

**Steelman.** Zero new deps (`package.json` stays at 4 runtime deps); the
move endpoint (D4) is the real contract and is fully testable regardless
of drag implementation; the "move to…" menu required by @w4's keyboard
scenario doubles as the touch-device path and the no-JS-degradation
path. `@dnd-kit` is genuinely good — but it's ~1 dep + sortable-state
machinery + its own a11y announcements to maintain, bought before any
user has touched the board. The reversibility claim is the clincher:
DnD is purely client-side; swapping the interaction layer later touches
zero API and zero backend code.

**Challenge — two honest costs the spec waves past:**

1. **Touch is not keyboard.** Native HTML5 drag-and-drop does not work on
   touch devices *at all* — not "fiddly," absent. The keyboard fallback
   menu covers a11y (@w4) and incidentally covers touch (a "Move to…"
   menu is tappable), so the mitigation exists — but the spec should say
   so explicitly, because "keyboard fallback" framing undersells that
   it's also the *mobile* path. If the product ever targets phones, this
   decision quietly becomes "menu-only board on mobile," which may be
   fine — but decide it, don't discover it.
2. **Native DnD is untestable in vitest/jsdom.** D11 promises "frontend
   vitest for board/list logic" — fine for grouping, ordering math, and
   the move-menu component — but HTML5 drag events (`dragstart`,
   `dataTransfer`, drop targets) do not fire meaningfully in jsdom. The
   drag path will be verified *only* by manual evidence screenshots
   (which the harness evidence policy already requires for UI waves —
   see `docs/plans/evidence-v2.md` per repo conventions). That's
   acceptable, but D5's consequence line ("testable move API") should be
   read as "the API is testable; the drag gesture is not." Wave plans
   should budget screenshot evidence for @w3's drag scenario, not assume
   vitest covers it.

Also worth one line: native DnD gives no drag-preview/autoscroll
polish; if the board feels bad in wave-3 dogfooding, that's the trigger
to revisit dnd-kit — earlier than "never," and that's okay because the
API boundary makes it cheap.

**Verdict on D5: ACCEPT.** Add explicit notes: move-menu is the touch
path too; drag gesture verified by evidence screenshots, not unit tests;
revisit trigger = board UX dogfood failure, not a hypothetical.

## D6 — Frontend routing: `/projects` + `/projects/:id` with persisted view toggle

**Steelman.** Two new routes + a view toggle is the minimal IA that keeps
`/` as dashboard; it matches the flat `NAV` array pattern the app-shell
review already constrained (`AppShell.tsx:16-20` — nav grows by data,
one line). "Persisted per project" (localStorage keyed by project id)
is a nice touch that costs ~5 lines. Alternatives are correctly
rejected: home-page sections make `/` a junk drawer (the app-shell
review already fought this battle), modals can't host a board.

**Challenge — thin, but two seams to name.** (1) "Persisted per project"
needs a storage key convention (`taskflow:project-view:{id}`) and a
decision on what happens for a *new* project (default list or board —
specify; board is the differentiating view but list is safer for
first-run). (2) The workspace context: `/projects` lists projects across
*which* workspace — the `ShellContext.activeWorkspaceId` or all
workspaces? SPEC says "workspace projects" (AC-4) implying active
workspace, but doesn't say the page reads `activeWorkspaceId` or has its
own workspace switcher. If it silently uses `activeWorkspaceId`, a user
with no active workspace sees an empty page with no explanation — needs
a defined empty/no-workspace state (folds into AC-9 @w4, but name it).

**Verdict on D6: ACCEPT.** Add: default view for new projects; projects
page scope = `activeWorkspaceId` with explicit empty state when null.

## D7 — Task↔workspace tenancy: denormalize `workspace_id` onto tasks and projects

**Steelman.** Every authz check becomes `requireMembership(task.
workspaceId, user.id)` — one call, identical shape to today's workspace
endpoints, no join traversal, no "which workspace does this task belong
to" resolution code in every resource method. It matches the codebase's
deliberately flat FK style (`WorkspaceMember.java:23-27` — no
associations anywhere). And it's genuinely two-way: dropping a
redundant column later is a trivial migration.

**Challenge — the integrity story is asserted, not designed.** "FK +
service checks" is doing heavy lifting:

- `projects.workspace_id → workspaces.id` is a plain FK — fine, the
  value is set once at creation and projects (per scope) never move
  between workspaces.
- `tasks.workspace_id` is redundant with `tasks.project_id →
  projects.workspace_id`. A plain FK on `tasks.workspace_id →
  workspaces.id` does **not** enforce that it equals the project's
  workspace — a service bug (or a future "move project to another
  workspace" feature) silently creates a task whose denormalized
  workspace disagrees with its project, and authz then checks the wrong
  workspace. The *correct* enforcement is a composite FK:
  `FOREIGN KEY (project_id, workspace_id) REFERENCES projects(id,
  workspace_id)` — requires `UNIQUE(project_id... )` i.e.
  `UNIQUE(id, workspace_id)` on projects — standard Postgres, ~2 extra
  lines of DDL. The spec should either specify the composite FK or
  explicitly accept service-only invariant + a test that creates a task
  and asserts `task.workspaceId == project.workspaceId`.
- Minor: is `workspace_id` denormalized onto `projects` too, or do
  projects *define* it? Reading D7 again — "denormalize `workspace_id`
  onto `tasks` (and `projects`)" — for projects it's not denormalization,
  it's the primary tenancy column. Wording nit; the design is right.

Also the motivation slightly overstates: `requireMembership` is already
just 2 indexed queries; resolving task→project→workspace is one extra
indexed lookup. The real win isn't speed, it's **uniform authz** — every
resource method calls the same choke point with a `workspaceId` it
already has. That's worth saying, because it means the alternative (join
traversal) was never actually expensive — the decision is about code
uniformity, and it's still correct.

**Verdict on D7: ACCEPT with an integrity contract.** Specify composite
FK (preferred — database-enforced, self-documenting) or service-check +
consistency test. Do not leave it to "FK + service checks" hand-waving.

## D8 — API shape: REST under `/workspaces/{id}/projects` + `/projects/{id}/tasks`, `PATCH /tasks/{id}/move`

**Steelman.** Nested workspace scoping for project CRUD
(`/workspaces/{id}/projects`) makes tenancy explicit in the URL — the
workspace id is right there for `requireMembership`, matching
`WorkspaceResource`'s existing `/workspaces/{id}/members` pattern
(`WorkspaceResource.java:77-108`). Task routes hang off `/projects/{id}`
because tasks belong to projects; the denormalized `workspace_id` (D7)
then lets task methods authz without re-resolving the project. `PATCH
.../move` as a distinct subresource action correctly separates "change
status+position" (board semantics, atomic) from field PATCHes. GraphQL
and RPC-style are correctly rejected as paradigm/imports for zero gain.

**Challenge — the frontend literally cannot call PATCH today.**
`api.ts:34-41` exposes `get/post/put/delete` only. Two clean fixes:
add a `patch` helper (5 lines, obviously correct — PATCH will be needed
for task field edits anyway, since PUT-replace semantics are wrong for
partial task updates), or make move a `POST /tasks/{id}/move` (also
fine — it's an action, not a resource patch; many APIs prefer POST for
non-idempotent-feeling actions, though move *is* idempotent). Either
works; **the spec must pick one**, because wave 2's frontend work
silently assumes a helper that doesn't exist. Recommend: add `patch` to
`api.ts` (task updates need it regardless) and keep `PATCH
/tasks/{id}/move` — or if minimizing wrapper churn matters, `POST
/tasks/{id}/move` + keep PATCH for edits later. Small, but it's exactly
the kind of seam that produces a wave-2 surprise.

Secondary: task field updates — spec says CRUD but only names the move
endpoint. Presumably `PATCH /tasks/{id}` for edits; say it, since PUT vs
PATCH choice matters for partial updates (title-only edit shouldn't
require resending status/position).

**Verdict on D8: ACCEPT with a client-contract note.** Add `patch` to
the `api.ts` wrapper (or switch move to POST) and name the task-update
method explicitly.

## D9 — Assignee validation: must be workspace member, null = unassign

**Steelman.** Server-side membership validation on write is the only
correct option — trusting the client (b) is an IDOR hole, any-user-id
(c) breaks tenancy. One extra indexed lookup per write
(`WorkspaceMember.find("workspaceId = ?1 and userId = ?2")` — same query
shape as `requireMembership`, `WorkspaceService.java:44`) is negligible.
Null-unassign is the right escape hatch. This is a small, correct,
well-scoped decision.

**Challenge — almost nothing; two footnotes.** (1) Validation must run
on *both* create and update, and reassignment edge case: what happens
to tasks assigned to a user later *removed* from the workspace?
`WorkspaceService.removeMember` (`WorkspaceService.java:137-153`) deletes
the member row — tasks keep a dangling `assignee_id` pointing at a
non-member. Options: ON DELETE SET NULL FK (clean, declarative —
`assignee_id BIGINT REFERENCES users(id) ON DELETE SET NULL`, but note
removal deletes the *member row*, not the user — the user row persists,
so the FK won't fire; you'd need service code in `removeMember` to null
out assignments, or a DB trigger — ugly), or leave dangling assignee and
render "former member" in UI (simplest, honest), or block removal while
tasks assigned (hostile). Spec is silent; **smallest correct: leave the
assignee id, render gracefully, revisit if it confuses users** — but
write that down, because wave implementers will otherwise each guess.
(2) Assignee display needs a users lookup per task list — N+1 risk if
done naively; the projects list already solves this pattern with
`countGroupedByWorkspace`-style batch queries (`WorkspaceMember.java:37-45`).
Note "batch-resolve assignees for task lists" so wave 3 doesn't ship
N+1.

**Verdict on D9: ACCEPT.** Add: removed-member assignee behavior
(render-as-former-member, no cascade) + batch assignee resolution note.

## D10 — Frontend state: fetch on route change + local mutation refresh, no React Query

**Steelman.** The existing pattern is genuinely established —
`WorkspacePanel.tsx:49-60` does exactly fetch-on-open + refresh-after-
mutation via `api.get`/`api.post` + `useState`, and `api.ts` is a 41-line
wrapper. TanStack Query would add provider + cache-invalidation paradigm
+ dep for an app with ~6 routes and no polling. Board moves refetch the
project's tasks — one GET — trivially cheap. Consistency argument is
real: two data-fetching paradigms in one 4-page app is worse than either
alone.

**Challenge — the board is where this pattern creaks first.** After a
drag, "local mutation refresh" means either refetch-all-tasks (simple,
one GET, correct) or optimistic local reorder (fast feel, but then you
own rollback-on-409 logic D4's concurrency fix might produce). Spec
should say **refetch-after-move, no optimistic UI** for v1 — it keeps D4's
serialization invisible to the client and avoids building undo logic for
a race that's already rare. Also: list view + board view both need the
same task data — fetch once per project-detail mount, share via the
page component, don't double-fetch when toggling views (specify the
toggle doesn't refetch). Minor but wave 3 will otherwise fetch twice.

**Verdict on D10: ACCEPT.** Pin: refetch-not-optimistic after moves;
single fetch shared by list/board toggle.

## D11 — Tests: backend scenario tests + frontend vitest + evidence screenshots, no Playwright

**Steelman.** Matches repo conventions exactly: backend has
`AuthResourceTest`/`WorkspaceResourceTest` scenario-style tests; frontend
has vitest + testing-library already configured
(`package.json:10,19-21`); the harness evidence policy already requires
UI screenshots for UI-touching waves, so "manual UI evidence" isn't a
testing gap so much as the *existing* verification channel. Playwright
in CI is real infrastructure (browser download, flake management,
selectors) — correctly deferred as a follow-up feature, not silently
dropped.

**Challenge — coverage honesty.** What this plan *cannot* verify:
HTML5 drag gestures (jsdom doesn't fire them — see D5), actual visual
themes/contrast (screenshots help but aren't assertions), and the
position-rewrite concurrency from D4 (scenario tests are sequential —
the advisory-lock fix will be verified by code review, not a test, unless
a concurrent test is written; acceptable, but don't claim the race is
tested). What it *can* verify well: every @w1/@w2/@w3-backend scenario
maps to a REST test; board grouping/ordering math and the move-menu are
vitest-able; a11y (@w4) is partially testable via testing-library
queries (roles/labels) even without axe-core — recommend adding
`jest-axe` or axe-core assertions to the vitest setup since the infra
already exists (~1 dev dep, huge a11y signal). That's a small upgrade
to an already-accepted decision, not a scope change.

**Verdict on D11: ACCEPT.** Suggest (non-blocking) axe-core in vitest
for @w4; explicitly scope what screenshots must evidence (drag move,
both themes, empty/loading/error states).

## D12 — Task delete vs archive: hard delete only in v1

**Steelman.** Hard delete is the simplest correct v1: `done` already
covers "finished," archive adds a flag + filtered-everywhere queries +
UI for a recovery need nobody's stated. Two-way door claim is accurate —
`archived_at TIMESTAMPTZ` is an additive Flyway migration later, and
existing hard deletes don't block adding soft-delete semantics
prospectively.

**Challenge — cascade behavior is unspecified, and it's the part that
actually bites.** "DELETE removes row" — but:

- **Project delete must delete its tasks.** Does the spec rely on FK
  `ON DELETE CASCADE` (consistent with `workspace_members`'s cascade at
  `V1__init.sql:25`) or service-level deletion? Either works; pick one
  and test it — a project delete that orphans tasks is a data-integrity
  bug no scenario currently covers (EXAMPLES has no "delete project
  removes tasks" scenario).
- **Workspace delete already cascades** members/invites via FK
  (`WorkspaceService.java:111-117` deletes member/invite rows manually,
  interestingly — *not* relying on cascade; inconsistent with the FK
  cascade that also exists. Whatever the new code does, match one
  pattern deliberately.)
- **Hard delete + D4 positions:** deleting a task leaves a gap in
  `position` sequence. If positions must stay dense (per D4 contract
  suggestion), delete should rewrite the column — O(n) again, fine, but
  *say* whether delete compacts positions or leaves gaps and whether
  the move endpoint tolerates them. Simplest consistent answer: delete
  compacts like move does (same code path).
- **No undo, stated.** Accepted — but note the UI already uses
  `window.confirm` for workspace delete (`WorkspacePanel.tsx:107`); task/
  project delete should reuse that pattern (no Toast/Modal exists — see
  app-shell review's deferred-primitives decision — so `confirm()` is
  the *only* undo-adjacent UX available; that's consistent, just name it).

**Verdict on D12: ACCEPT with cascade/compaction contract.** Specify
project→task cascade mechanism + tested scenario, and whether delete
compacts positions.

---

## Cross-cutting findings

1. **D3's task-delete rule is the only true spec defect.** Scope §in,
   AC-7, and D3 give three different readings and zero scenarios cover
   member task deletion. Everything else is contract-tightening on sound
   decisions.
2. **Two client-contract gaps will surface in wave 2/3:** `api.ts` has
   no `patch` (D8), and D6 doesn't say which workspace scopes `/projects`.
   Both are one-line spec fixes.
3. **Integrity-by-convention appears twice** (D7's denormalized
   workspace_id, D9's dangling assignee) — the codebase's flat-FK style
   means the database won't catch these; each needs either a composite
   FK or an explicit test. This is the recurring craftsmanship risk of
   the chosen architecture: service-layer invariants must be *written
   down*, because nothing mechanical enforces them.
4. **Every decision is honestly two-way** — the spec's reversibility
   claims survive scrutiny. The risk isn't lock-in; it's that several
   "two-way" claims depend on contracts (VARCHAR status, composite FK,
   PATCH helper) that are currently implicit.

## Scorecard

| Lens | Score | Evidence | Action |
|------|-------|----------|--------|
| Problem & forces | 5 | Core-loop gap is real (`SPEC.md:9-12`); workspaces ship empty; every decision serves the daily-driver loop | Keep |
| Alternatives & tradeoffs | 4 | Options per decision are credible with honest costs; D5 touch gap and D4 concurrency underweighted | Add touch note (D5), serialization (D4) |
| Domain fit (DDD) | 4 | Aggregate boundaries correct (project→task, workspace tenancy); D7 denormalization serves authz uniformly; flat-FK style consistent with `WorkspaceMember.java:23-27` | Specify composite FK (D7) |
| Architecture & boundaries | 4 | Choke-point authz reused (`WorkspaceService.java:39-65`); REST nesting mirrors `WorkspaceResource.java:77-108`; no vendor/dep creep | Add `patch` to api.ts (D8); name task-update verb |
| Testable design | 3 | Backend scenarios map cleanly to REST tests; vitest infra exists (`package.json:10`); but drag untestable in jsdom, D4 race untested, D3 delete rule has no scenario | Add task-delete scenario; axe-core suggestion; screenshot scope for @w3 |
| Craftsmanship | 3 | Mostly smallest-step discipline; but D3/AC-7 contradiction, implicit VARCHAR-status and composite-FK contracts, unspecified cascades | Resolve D3 rule; write the four contracts |
| Decision record | 4 | Every entry has context/options/why/consequences/reversibility — above repo norm; revisit triggers present but some vague (D1 audit, D5 none) | Tighten D1/D5 triggers; fix D3 scope contradiction |

## Verdict

```
VERDICT: REVISE
STEELMAN: Twelve mostly-small, mostly-reversible decisions that correctly
reuse the existing choke-point authz (WorkspaceService.requireMembership/
requireRole), flat-FK Panache style, REST conventions, and dep-free
frontend — the spec's real strength is that nothing here requires new
infrastructure, and every "two-way door" claim survives scrutiny when the
implicit contracts (VARCHAR status, composite FK, PATCH helper, cascade
behavior) are made explicit.
SMALLEST NEXT STEP: Fix the D3/AC-7 task-delete contradiction — pick one
rule (recommended: any member may create/edit/delete tasks in visible
projects; owner/admin delete projects; no created_by needed) and add a
matching @w1 scenario — then write four one-line contracts into the spec:
status column is VARCHAR + service validation (no CHECK/PG enum),
tasks carry composite-FK or tested workspace invariant (D7), api.ts gains
`patch` or move becomes POST (D8), project delete cascades tasks and
delete compacts positions (D12).
REVISIT TRIGGER: (a) first user request for custom statuses or per-task
permissions → re-open D2/D3 with usage evidence; (b) board UX fails
dogfooding (native DnD friction, touch usage) → re-decide D5 incl.
@dnd-kit behind the unchanged move endpoint; (c) task history/activity
feed requested → re-open D1's "no temporal history" consequence; (d) a
task/project actually needs cross-workspace moves or undo → re-open D7
integrity and D12 soft-delete together.
```

Residual risks even after revision: member-can-edit-anything (D3) will
eventually produce "who changed my task" confusion — mitigated only by
the deferred activity log, so track it as product feedback; integer
position rewrite is O(n) per move and fine today but becomes a hotspot
if a project grows to hundreds of tasks per column — watch, don't
pre-optimize; and every authz invariant lives in service code with flat
FKs, so the composite-FK/test discipline above is the only thing standing
between a refactor and a tenancy bug.

*Advisory review — does not block G1 by itself; the gate owner decides.*

## Alternatives considered (summary)

- **Customizable statuses now (reference parity) instead of D2:** real
  scope (statuses table + ordering + archive + migration); rejected
  correctly for v1 — but only stays cheap if status is VARCHAR +
  service-validated, not CHECK/PG-enum.
- **Assignee-scoped task permissions instead of D3:** stricter than the
  reference product and adds rule branches; rejected — but the
  delete-permission ambiguity must be resolved regardless.
- **Fractional/lexorank ordering instead of D4:** fewer writes per move;
  loses on complexity for column sizes measured in tens; integer+rewrite
  is right — pending the concurrency contract.
- **@dnd-kit instead of D5:** better UX/a11y out of box; loses on dep +
  paradigm for a gesture that's one of several move paths; correctly
  deferred behind the stable move API — revisit on dogfood failure.
- **TanStack Query instead of D10:** better caching; loses on new
  paradigm for ~6 routes with no polling; correctly deferred — revisit
  when realtime/polling or multi-view cache invalidation arrives.
- **Playwright e2e now instead of D11:** real regression safety for drag
  UI; loses on CI infra scope; correctly deferred — but budget
  screenshot evidence per UI wave to compensate.

---

*End of review.*
