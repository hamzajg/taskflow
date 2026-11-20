# Spec: home-landing

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

The app opens on a "Welcome" page that is really an account form — there is
no landing experience for visitors and no at-a-glance view of workspace
health for members. A new user hitting `/` while logged out is bounced to a
bare login form with no context about what the product does; a member logging
in lands on profile/workspace admin forms instead of seeing their work. Both
moments are the product's front door and today they say nothing.

## Users

- Prospective users (guests) evaluating the product before signup.
- Workspace members (owner/admin/member) who want a daily dashboard: what
  needs attention, what's overdue, what's mine.

## Outcome hypothesis

- Expected user outcome: guests see a credible product landing page with a
  clear path to sign up; members land on a dashboard that answers "what's
  going on in my workspace" in one screen.
- Opportunity evidence: assumption — derived from the reference product's
  UX baseline (public front page + widget-grid dashboard is the category
  norm) and from the current HomePage being a form dump. No usage data.
- Signal: qualitative — dashboard is the default post-login destination;
  landing page drives register clicks. No numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **Public landing page** at `/` for guests: hero, short value propositions,
  primary CTA to register and secondary to log in. Authenticated users
  visiting `/` are redirected to `/dashboard`.
- **Dashboard** at `/dashboard` (authenticated): scoped to the workspace
  selected in the sidebar switcher (see D6), showing stat cards
  (projects, tasks by status, overdue, due soon, open tasks assigned to
  me, members), a projects summary list, and quick links into existing
  screens. Zero workspaces → an inviting empty state with a create
  workspace action.
- **Dashboard summary API**: `GET /workspaces/{workspaceId}/summary` —
  single authenticated aggregate endpoint returning the counts the
  dashboard renders (see D2). Lives on the workspace resource; requires
  membership **and** a verified email, matching the other workspace
  endpoints.
- **Account page** at `/account`: the existing workspace-management and
  profile content moves here unchanged, keeping the `#workspaces` and
  `#profile` anchors. Sidebar links become `/account#workspaces` /
  `/account#profile`. Old `/#…` URLs were internal app links, not a
  public contract — they are **not** guaranteed to resolve after the
  move (guests see the landing page, members get redirected); the
  in-app nav is the supported path (see D1).
- **UX reskin pass**: apply the product's design tokens consistently —
  stat-card component with icon chips, card/section-header polish, spacing
  and typography normalization across existing pages (projects list,
  project detail, task detail, account, landing). Behavior and copy stay
  the same.
- Navigation update: Dashboard → `/dashboard`, Account → `/account`
  (sidebar hash links become `/account#workspaces` / `/account#profile`).

## Scope (out)

- Charts/graphs (CSS-based status bars are fine; no chart library).
- Notifications, activity feed, announcements, chat, calendar, gantt,
  time tracking, invoices/expenses — all separate future features.
- Marketing analytics, SEO meta beyond a sane title/description.
- Real-time dashboard updates (fetch on load + manual refresh only).
- New task/project creation from the dashboard (links to existing screens).
- i18n, public docs, pricing page.

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | Guests see a landing page at `/` with register/login CTAs | @w1 |
| 2 | Authenticated users at `/` redirect to `/dashboard`; guests at `/dashboard` redirect to login | @w1 |
| 3 | Dashboard shows correct workspace-scoped stat counts | @w2 |
| 4 | Dashboard shows "my open tasks" count for the caller only | @w2 |
| 5 | Summary endpoint requires membership; non-members get 403/404 | @w2 |
| 6 | Dashboard handles loading, empty workspace, and error+retry states | @w2 |
| 7 | Existing workspace/profile management remains reachable at `/account`, including `#workspaces`/`#profile` anchors | @w1 |
| 8 | Dashboard stats follow the sidebar workspace selection | @w2 |
| 9 | Stat cards and section headers follow the design-token reskin across pages | @w3 |
| 10 | New screens meet the accessibility bar in both themes | @w3 |

## Decisions

> Filled before wave planning; `challenge_decision` reviews this section.
>
> **DECISION-REVIEW outcome: REVISE — answered.** `DECISION-REVIEW.md`
> (verdict REVISE) confirmed all five decisions defensible and found
> contract gaps, all folded back: D2 now pins the due-date boundary
> definitions, the zero-filled `tasksByStatus` shape, endpoint ownership
> (`WorkspaceService`/`WorkspaceResource`), and `requireVerified`; D3
> specifies independent partial-failure behavior; D6 (new) pins dashboard
> workspace selection to the sidebar switcher; scope now covers the
> `#workspaces`/`#profile` anchor migration to `/account#…` and the
> zero/multi-workspace dashboard states. Advisory verdict never blocked;
> spec amended before wave planning.

- **D1 — Routing: `/` is the public landing; `/dashboard` is the authed
  home; account management moves to `/account`.**
  - Context & forces: today `/` requires auth and renders HomePage
    (welcome + workspaces + profile). The product needs a guest-facing
    front door and a member-facing home, and the old HomePage content must
    remain reachable.
  - Options considered: (a) `/` public landing + `/dashboard` authed home +
    `/account` for the old content (clean separation, conventional);
    (b) `/` stays authed dashboard, landing at `/welcome` (inverts
    convention — `/` is the natural landing URL); (c) landing and dashboard
    share `/` with conditional render (blurs the auth boundary, harder to
    reason about and test).
  - Decision & why: (a). Conventional URL semantics; the auth boundary
    stays explicit in the router.
  - Consequences: + clear mental model, deep-linkable pages. − one more
    route; the `*` catch-all redirects guests to `/` (landing) and
    authed users to `/dashboard` so unknown URLs don't bounce through
    the landing page. Old `/#…` deep links are internal-only and not
    preserved (see Scope).
  - Reversibility: two-way door (routes are cheap to move).
    Revisit trigger: if the product later needs SEO/prerendering or a
    separate marketing site, revisit the `/` vs `/welcome` split.

- **D2 — Dashboard data: dedicated aggregate endpoint
  `GET /workspaces/{workspaceId}/summary`.**
  - Context & forces: the dashboard needs counts across ALL projects in a
  workspace (tasks by status, overdue, due-soon, my-open). The existing
  API only exposes per-project task lists — a client-side fan-out is N+1
  requests and re-implements aggregation in the UI.
  - Options considered: (a) `GET /workspaces/{id}/summary` returning one
    DTO with server-side SQL `GROUP BY` aggregation (single round trip,
    OpenAPI-documented, testable); (b) client-side fan-out over
    projects/tasks endpoints (no backend change, but N+1 and duplicated
    "today/overdue" logic in the frontend); (c) per-widget endpoints
    (chatty, over-engineered for six numbers).
  - Decision & why: (a) — matches the API-contract rules (documented,
    authZ'd, single call) and keeps domain rules (what counts as
    "overdue"/"due soon") server-side where they belong.
  - Contract: response is a flat DTO — `projectCount`, `memberCount`,
    `tasksByStatus` map with **all four keys always present**
    (backlog/todo/in_progress/done, zero-filled), `overdueCount`,
    `dueSoonCount`, `myOpenTaskCount`. Every task predicate is scoped to
    the path workspace (`tasks.workspace_id = {workspaceId}`).
    Definitions (server-local date, consistent with the rest of the app
    which has no TZ handling; `due_date` NULL never matches either
    window):
    - overdue = `due_date < today` AND status != 'done'
    - due soon = `today <= due_date <= today + 7 days` AND status != 'done'
      (due-today counts as due soon, not overdue; the windows are
      inclusive and disjoint)
    - my open tasks = `assignee_id = caller` AND status != 'done'
  - AuthZ: `requireMembership` + `requireVerified` — non-members get 403,
    unknown workspace 404, unverified users 403. Implemented in
    `WorkspaceService`/`WorkspaceResource` alongside the other
    workspace-scoped endpoints.
  - Consequences: + one request, one test surface, rules stay in the
    service layer. − new endpoint to maintain; summary definition lives in
    backend (good — single source of truth). If a second consumer needs
    due-date semantics, extract a shared rule rather than duplicating.
  - Reversibility: two-way door (additive endpoint).
    Revisit trigger: a second consumer of overdue/due-soon semantics, or
    a need for per-project breakdowns → extend or split the contract.

- **D3 — Dashboard composition: server summary + existing list endpoints.**
  - Context & forces: stat cards come from D2; the projects list widget
    needs names/links — `GET /workspaces/{id}/projects` already returns
    exactly that with task counts.
  - Options considered: (a) summary endpoint + projects endpoint (two
    calls, both cached by React state); (b) fold project list into the
    summary response (bigger payload, duplicates an existing contract);
    (c) fetch everything client-side (rejected in D2).
  - Decision & why: (a) — reuse existing contracts, keep payloads small.
  - Partial failure (per DECISION-REVIEW): the two fetches fail
    independently — if the summary fails, stat cards show an inline
    error+retry while the projects widget still renders; if projects
    fail, only that widget errors. The page never blanks entirely.
  - Consequences: + no contract duplication, graceful degradation. − two
    parallel fetches on dashboard load (both fast, indexed).
  - Reversibility: two-way door.

- **D6 — Dashboard workspace selection: follows the sidebar workspace
  switcher; auto-selects the only workspace; zero workspaces shows an
  empty state.**
  - Context & forces: `/dashboard` has no workspaceId param; the app
    already has a workspace switcher in `AppShell` backed by
    `ShellContext`, and `ProjectsPage` auto-selects when exactly one
    workspace exists.
  - Options considered: (a) reuse the shell's active-workspace context —
    dashboard always reflects the switcher, switching reloads stats;
    (b) `/dashboard/:workspaceId` route param (duplicates switcher state,
    two sources of truth); (c) dashboard aggregates across ALL
    workspaces (blurs tenancy boundaries, "my tasks" gets ambiguous).
  - Decision & why: (a) — single source of truth for "current
    workspace", consistent with ProjectsPage behavior.
  - Consequences: + consistent UX, no new state. − dashboard depends on
    ShellContext (already required by AppShell anyway).
  - Reversibility: two-way door.

- **D4 — UX reskin: extend the existing token system; new `StatCard`
  component; no new dependencies.**
  - Context & forces: `tokens.css` already defines color/spacing/radius/
  typography for both themes; pages share `Card`, `Badge`, `Button`.
    The reskin must modernize visuals without breaking 35 passing tests
    or adding bundle weight.
  - Options considered: (a) token-driven restyle + `StatCard` (icon chip
    + label + value + optional sub-line) + section-header component,
    applied page by page (incremental, testable); (b) adopt a CSS
    framework or component library (bundle cost, fights existing
    primitives); (c) per-page one-off styles (inconsistent — the problem
    we're solving).
  - Decision & why: (a) — consistent with the design-token single-source
    rule already enforced by `tokens.test.ts`.
  - Consequences: + cohesive visual language, both themes free. − visual
    changes are broad; each page needs a screenshot check.
  - Reversibility: two-way door (CSS/components are replaceable).

- **D5 — Landing page is unauthenticated and theme-aware via the existing
  `data-theme` mechanism.**
  - Context & forces: `theme.ts` already toggles `data-theme` on the root
    element and persists preference; the landing page lives outside
    `AppShell` but can still respect the stored theme.
  - Options considered: (a) landing respects stored theme, includes its
    own small theme toggle; (b) landing always light (simpler but jarring
    for dark-theme users); (c) landing always dark/branded (hides the
    product's theming).
  - Decision & why: (a) — consistent with app behavior; small cost.
  - Consequences: + coherent experience. − landing needs its own toggle
    control (AppShell isn't mounted there).
  - Reversibility: two-way door.
