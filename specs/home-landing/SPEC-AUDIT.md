# Spec audit — home-landing (re-audit after revision)

AUDIT: PASS

FINDINGS:

All six findings from the first audit are resolved:

1. **Hash-anchor migration — RESOLVED.** SPEC.md:50-56 now states anchors
   are kept on `/account`, sidebar links become `/account#workspaces` /
   `/account#profile`, and explicitly disclaims old `/#…` URLs ("internal
   app links, not a public contract — not guaranteed to resolve"). This is
   honest and implementable: the only required change is rewriting the two
   `Link to={{ pathname: '/', hash }}` entries in `AppShell.tsx:21-22,96-104`
   plus the Dashboard entry (`AppShell.tsx:19` `to: '/'` → `/dashboard`).
   The @w1 regression scenario (EXAMPLES.feature:26-31) asserts anchors
   resolve on the account page and sidebar links — sufficient coverage.

2. **Workspace scoping — RESOLVED.** D2 contract now states "Every task
   predicate is scoped to the path workspace (`tasks.workspace_id =
   {workspaceId}`)" (SPEC.md:149-150); `projectCount`/`memberCount` are
   inherently workspace-scoped by the path. `myOpenTaskCount` is now
   unambiguous.

3. **AC6 tag mismatch — RESOLVED.** Now `@w2` only (SPEC.md:87); matches
   the @w2 scenarios in EXAMPLES.feature:52-70.

4. **Catch-all route — RESOLVED.** D1 consequences now specify `*`
   redirects guests → `/` (landing) and authed → `/dashboard`
   (SPEC.md:122-126). Implementable via `isLoggedIn()` in the `*` route —
   same pattern as `RequireAuth` (`App.tsx:15-17`).

5. **Decision-record gaps — RESOLVED (sufficiently).** D1 and D2 now carry
   explicit revisit triggers (SPEC.md:128-129, 168-169). D3–D6 still lack
   revisit triggers, but each has the required
   context/options/decision/consequences/reversibility structure; the
   review's revisit-trigger recommendation was advisory (D011) and the
   two decisions with real external triggers (routing, summary semantics)
   are covered. The stale "D1–D5" reference in DECISION-REVIEW.md:3
   remains cosmetic only.

6. **due_date NULL — RESOLVED.** D2 states "`due_date` NULL never matches
   either window" (SPEC.md:152-153).

D6 / new @w2 scenario consistency check — VERIFIED:

- D6's mechanism is real: `ShellContext` exposes `workspaces`,
  `activeWorkspaceId`, `setActiveWorkspaceId` (`ShellContext.tsx:5-13`),
  the switcher is a `<select>` in `AppShell.tsx:109-130`, and the
  auto-select convention `activeWorkspaceId ?? (workspaces.length === 1
  ? workspaces[0].id : null)` exists verbatim in `ProjectsPage.tsx:14-15`.
- The scenario (EXAMPLES.feature:59-64) — two workspaces, switch in
  sidebar, stats reflect selection; zero workspaces → creation prompt —
  is implementable and consistent with D6 and the scope's empty-state
  requirement (SPEC.md:43-44).
- Residual nit (non-blocking): the multi-workspace *no-selection* render
  (switcher on "Select a workspace…") is not given its own scenario, but
  D6's "consistent with ProjectsPage behavior" plus the existing
  "Select a workspace in the sidebar" pattern (`ProjectsPage.tsx:65-70`)
  make the intended behavior unambiguous.

Re-verified unchanged (git status: only `specs/home-landing/` untracked;
frontend/backend clean since first audit): all prior code claims —
`Task.dueDate` LocalDate, four statuses, denormalized `tasks.workspace_id`
composite FK (V3:30-35), `requireMembership` 404/403 + `requireVerified`
403 via `currentUser()` (`WorkspaceResource.java:119-123`),
`GET /workspaces/{id}/projects` returning `ProjectDto.taskCount`
(`ProjectService.java:41-49`), pre-paint `data-theme` (`index.html:7-18`,
`tokens.css:62`), lucide-react dep, ~35 frontend `it()` tests, no legacy
product names, full @w1–w3 scenario↔backlog↔AC traceability.

EVIDENCE: specs/home-landing/{SPEC.md,EXAMPLES.feature,BACKLOG.md,
GATES.md,DECISION-REVIEW.md,SPEC-AUDIT.md}; frontend/src/{App.tsx,
shell/ShellContext.tsx, components/AppShell.tsx, pages/{HomePage,
ProjectsPage}.tsx, theme.ts, index.html, tokens.css}; backend
WorkspaceResource/WorkspaceService/Task/WorkspaceMember/
ProjectService/ProjectDtos/V3 migration (unchanged since first audit).
