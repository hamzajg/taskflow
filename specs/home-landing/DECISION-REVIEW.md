# Decision review — Spec: home-landing

- Source: `specs/home-landing/SPEC.md (## Decisions D1–D5)`
- Reviewed against: `frontend/src/App.tsx`, `frontend/src/pages/HomePage.tsx`,
  `frontend/src/components/AppShell.tsx`, `frontend/src/theme.ts`,
  `frontend/index.html`, `frontend/src/shell/ShellContext.tsx`,
  `frontend/src/pages/ProjectsPage.tsx`,
  `backend/.../resource/WorkspaceResource.java`, `ProjectResource.java`,
  `backend/.../service/WorkspaceService.java`, `ProjectService.java`,
  `TaskService.java`, `model/Task.java`,
  `db/migration/V3__projects_tasks.sql`, `V4__comments.sql`.
- Advisory only (D011): this review never blocks a gate, wave, or merge.

## Per-decision challenge

### D1 — Routing split (`/` landing, `/dashboard`, `/account`)

**Steelman.** Conventional URL semantics; the auth boundary stays explicit in
`App.tsx`'s `RequireAuth` layout route (`App.tsx:27-38`). Two-way door —
routes are cheap. HomePage's content (welcome banner, `WorkspacePanel`,
profile form, `#workspaces`/`#profile` anchors — `HomePage.tsx:42-69`) moves
verbatim to `/account`, and the workspace switcher is unaffected because it
lives in `AppShell`'s sidebar fed by `ShellContext` (`AppShell.tsx:109-130`,
`ShellContext.tsx`), not in HomePage.

**Credible alternatives.**
- (b) `/` stays the authed dashboard, landing at `/welcome` — simpler diff
  (no route moves for existing users) but inverts convention; `/` is where
  guests and members both land first.
- (c) Conditional render on `/` — rejected correctly: blurs the auth
  boundary and makes `RequireAuth` semantics fuzzy.
- (d) **Simplest viable variant the spec doesn't mention:** keep HomePage at
  `/` *and* add `/dashboard` as the new member home, i.e. don't move account
  content at all — put "Account" nav → `/` unchanged. This is fewer moving
  parts but leaves `/` dual-purpose (authed account page) which conflicts
  with the public-landing goal; (a) is still right, but the spec should
  acknowledge it considered *not moving* HomePage.

**Real risks / spec gaps.**
- **Hash-link migration is under-specified.** `AppShell.tsx:21-22,96-104`
  builds Workspaces/Profile links as `{ pathname: '/', hash: '#workspaces' }`.
  After D1, `/` renders the *landing* page for guests — but for authed users
  `/` redirects to `/dashboard`, which has no `#workspaces` anchor, so these
  links silently dead-end unless rewritten to `/account#workspaces` /
  `/account#profile`. D1's consequences mention this, but **no acceptance
  criterion or scenario pins the anchor targets** — the @w1 regression
  scenario only says "sidebar links to dashboard, projects and account".
  Fold in: nav entries must be `to="/dashboard"`, `to="/account"` (+hash),
  and a scenario/assertion that the anchors resolve.
- **Catch-all route**: `App.tsx:39` sends `*` → `/`. Post-change, an authed
  user hitting a bad URL bounces landing → `/dashboard` (extra hop, and the
  landing page must not flash). Minor; worth a one-line note or redirect
  `*` to `/dashboard` when authed.
- `RequireAuth` uses synchronous `isLoggedIn()` — unchanged, fine. The
  authed-at-`/` redirect must live in the LandingPage component itself
  (`isLoggedIn() ? <Navigate to="/dashboard"/> : …`); spec implies this but
  doesn't state where the check lives. Minor.

### D2 — `GET /workspaces/{id}/summary` aggregate endpoint

**Steelman.** Server-side `GROUP BY` keeps "overdue"/"due soon" domain rules
in one place; `tasks.workspace_id` is denormalized with a composite FK
(`V3__projects_tasks.sql:39-33`) so aggregation needs no join through
projects. `requireMembership` (`WorkspaceService.java:39-50`) already gives
404-for-missing / 403-for-nonmember — matching the spec's "403 or 404" and
the @w2 security scenario. `@Authenticated` + `currentUser()` +
`requireVerified` pattern is established in both resources.

**Credible alternatives.**
- (b) Client fan-out — correctly rejected (N+1, duplicated date logic).
  Confirmed real: frontend currently has *zero* overdue logic (due dates are
  display-only strings — `BoardView.tsx:156`, `ProjectDetailPage.tsx:382`),
  so there is no existing drift *today*, but the moment any page adds an
  "overdue" badge the summary becomes a second definition. Spec should name
  the owning service (e.g. method on `WorkspaceService` or a small
  `WorkspaceSummaryService`) so the definition has one home.
- (c) Per-widget endpoints — correctly rejected as over-engineered.
- (d) **Fold summary into `GET /workspaces/{id}`** — the DTO already exists
  (`WorkspaceDto` carries `memberCount`); adding counts there avoids a new
  route but couples a hot read path to six aggregates on every workspace
  fetch. Spec's choice of a dedicated endpoint is defensible; not a gap.

**Real risks / spec gaps — this is where REVISE bites:**
- **"Due soon" boundary is ambiguous.** D2 says "due within 7 days, not
  done, not overdue" but never states: (i) is `due_date == today` "due
  soon" or neither? (ii) is the window `[today, today+7]` inclusive of
  both ends? (iii) which clock — `LocalDate.now()` in server TZ vs user TZ
  (`due_date` is `DATE`, `Task.java:58-59`; no timezone is stored anywhere).
  "Overdue = due_date < today" is stated; the due-soon lower bound is not.
  Two implementers can legitimately produce different counts on the
  boundary day. **Pin exact predicates in the contract**, e.g.
  `overdue: dueDate < today`, `dueSoon: today <= dueDate <= today+7`,
  `today = LocalDate.now()` server clock — or explicitly delegate the
  definition.
- **`tasksByStatus` map shape unspecified.** "map (backlog/todo/in_progress/
  done)" — does the JSON object always contain all four keys with `0`, or
  only statuses present? Frontend rendering and tests depend on it. Pin it.
- **`memberCount` duplicates `WorkspaceDto.memberCount`** — fine (different
  endpoint), but note the dashboard could get member count from
  `GET /workspaces` for free if the workspace is already loaded; keeping it
  in the summary is still right for a single-round-trip stat card.
- **Unverified members**: `currentUser()` in `WorkspaceResource` calls
  `requireVerified` → unverified users get 403 on summary even though the
  @w2 scenario only says "member". Consistent with every other endpoint;
  worth one line in the contract so tests don't trip on it.
- Endpoint placement (which `@Path` class hosts it) is unstated — trivial,
  but `/{id}/summary` under `WorkspaceResource` is the obvious home;
  say so.

### D3 — Two-call dashboard composition

**Steelman.** Reuses `GET /workspaces/{id}/projects` which already returns
`ProjectDto` with `taskCount` (`ProjectService.java:41-49`) — names, links,
counts, zero contract duplication. Two parallel fetches on load is cheap.

**Alternatives.** Folding the project list into the summary DTO was
correctly rejected (payload bloat, contract duplication). No credible
simpler option missed.

**Risks.** Low. Note the two calls can resolve out of order / one can fail
while the other succeeds — the spec's error+retry scenario (@w2) should
say whether partial failure renders stats-without-list or full error
state. Minor ambiguity; one line suffices. Also both fetches need the same
`workspaceId` resolution rule (see D1/dashboard gap below).

### D4 — Token reskin + `StatCard`, no new deps

**Steelman.** `tokens.css` already defines both themes via
`[data-theme]` blocks (`tokens.css:62`) and `tokens.test.ts` enforces the
single-source rule; shared primitives (`Card`, `Badge`, `Button`,
`Alert`, `Input`) exist. Incremental page-by-page application is
testable.

**Real risks.**
- **Breadth in one wave.** US3/wave-3 touches landing + dashboard +
  projects + project detail + task detail + account — every page — in a
  single PR-sized wave. Visual regressions are the classic failure mode
  and screenshot evidence is the only check named. Credible mitigation the
  spec doesn't state: an explicit per-page checklist in the wave plan, or
  splitting reskin into "new components only" (wave 2) vs "existing pages"
  (wave 3). Not a design flaw — a planning risk to flag.
- `StatCard` icon chips need icons — `lucide-react` is already a dep
  (`AppShell.tsx:3`), so "no new deps" holds.
- Reskin must not change behavior/copy — stated; good.

### D5 — Landing theme-awareness outside `AppShell`

**Steelman.** Verified: `index.html:7-18` applies `data-theme`
pre-paint from `tf-theme` localStorage → OS pref → light, *before* React
mounts — so the landing page is theme-aware for free with zero code. Only
the toggle is new. `theme.ts` (`getTheme`/`toggleTheme`/`applyTheme`) is
framework-free and reusable; `toggleTheme` persists via `applyTheme`.

**Alternatives.** Always-light or always-dark were correctly rejected —
pre-paint script already honors stored preference, so option (b) would
actually *fight* the existing mechanism (user's stored dark pref would be
overridden only if landing forced light via CSS, not via `data-theme`).

**Risks.** Minor: Login/Register pages have no theme toggle today
(verified — no `theme` imports in `LoginPage.tsx`/`RegisterPage.tsx`), so
the landing toggle sets a new precedent for chrome outside AppShell —
cheap and correct, but the toggle control should be a small shared
component or duplicated minimally, not a one-off. Also: `toggleTheme`
writes localStorage — fine for guests (key is not auth-scoped).

## Cross-cutting spec gap (not owned by any single D)

**Dashboard workspace selection is unspecified.** `/dashboard` has no
workspaceId in its path; the summary endpoint requires one. The codebase
already has the convention — `ProjectsPage.tsx:14-15`:
`activeWorkspaceId ?? (workspaces.length === 1 ? workspaces[0].id : null)`
with a "select a workspace" empty state. The spec never says which
workspace the dashboard summarizes, nor what renders for a user with zero
workspaces or multiple workspaces with no selection. No @w2 scenario
covers it. **This must be pinned in SPEC.md** (recommend: adopt the
ProjectsPage convention verbatim + an empty-state scenario).

## Scorecard

| Lens | Score | Evidence | Action |
|------|-------|----------|--------|
| Problem & forces | 4 | SPEC.md:7-32 — clear problem, users, honest "assumption" evidence label | none |
| Alternatives & tradeoffs | 4 | D1–D5 each list 2–3 options incl. simplest; D1 misses "don't move HomePage" variant | add variant to D1 record |
| Domain fit (DDD) | 3 | Summary rules have no named owner; due-date vocabulary ("open", "due soon") defined only in a contract parenthetical | name owning service + pin predicates |
| Architecture & boundaries | 4 | Endpoint fits existing resource/service/`requireMembership` pattern (`WorkspaceResource.java:63`, `WorkspaceService.java:39`); authZ consistent | state endpoint placement |
| Testable design | 3 | Scenarios good, but due-soon boundary, map shape, workspace-selection, and hash-anchor behaviors are untestable-as-specified | pin contract details + scenarios |
| Craftsmanship | 4 | Small reversible steps, additive endpoint, no new deps; D4 wave breadth is the main smell | per-page reskin checklist |
| Decision record | 4 | Context/options/consequences/reversibility all present; no revisit triggers, no owner/date | add revisit trigger |

## Verdict

```
VERDICT: REVISE
STEELMAN: D1–D5 are all defensible and mostly conventional: public `/` +
authed `/dashboard` + moved `/account` matches URL semantics and keeps
RequireAuth explicit; a single membership-gated SQL aggregate is the right
shape given tasks.workspace_id is denormalized and requireMembership
already exists; reusing GET /workspaces/{id}/projects avoids contract
duplication; token reskin respects the enforced single-source token
system; and the landing page gets theme-awareness for free from the
pre-paint script in index.html — only a toggle is new.
SMALLEST NEXT STEP: Fold the six spec gaps into SPEC.md before wave
planning: (1) pin dashboard workspaceId resolution to the
activeWorkspaceId ?? single-workspace convention + empty/multi-workspace
scenario; (2) pin exact due-date predicates (overdue: dueDate < today;
dueSoon: today <= dueDate <= today+7; server LocalDate clock) and the
tasksByStatus map shape (all four keys, zeros included); (3) state that
summary lives on WorkspaceResource/WorkspaceService and inherits
requireVerified; (4) pin nav anchors to /account#workspaces and
/account#profile with a resolving-anchor assertion; (5) add a revisit
trigger and decision owner/date; (6) note the D4 per-page reskin checklist.
Then proceed to wave_plan — no design changes required.
REVISIT TRIGGER: if "due soon"/"overdue" semantics are later needed
client-side (e.g. task badges), the backend definition must be extracted
into a shared contract or the summary endpoint becomes the sole source —
revisit D2 if a second consumer appears; revisit D1 if a marketing/SEO
requirement appears (landing would need prerendering the SPA can't do).
```

### Concrete gaps to fold into SPEC.md (summary for the spec author)

1. **Dashboard workspace selection** — unspecified; adopt
   `activeWorkspaceId ?? (workspaces.length === 1 ? workspaces[0].id : null)`
   (`ProjectsPage.tsx:14-15`) and add an empty/no-selection scenario.
2. **Due-date predicates ambiguous** — "within 7 days" doesn't state
   inclusivity, whether due-today counts, or which clock/timezone; pin
   `LocalDate.now()` server-side semantics in the D2 contract.
3. **`tasksByStatus` JSON shape** — all four keys always present vs sparse
   map; pick one.
4. **Hash anchors** — `/#workspaces`/`/#profile` (`AppShell.tsx:21-22`)
   must become `/account#…`; add an assertion they resolve (currently no
   scenario covers anchor targets).
5. **Endpoint ownership/placement** — name the resource/service and note
   `requireVerified` applies (unverified members get 403).
6. **Partial-failure semantics (D3)** — one line: does a projects-list
   failure degrade the dashboard or fail it whole?
7. **Decision record hygiene** — add owner/date and a revisit trigger.
