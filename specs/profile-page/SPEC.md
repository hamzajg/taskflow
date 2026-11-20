# Spec: profile-page

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

`/account` is a grab-bag: the Workspaces administration panel and the
Profile editing card are stacked on one page, reached through two sidebar
links that only differ by a `#hash` anchor (`/account#workspaces` vs
`/account#profile`). Users can't link to "my profile" cleanly, the two
concerns share one scroll, and the page title ("Welcome, X") describes
neither. Separating them gives each concern its own route, title, and
sidebar entry — consistent with the rest of the app's one-page-per-surface
structure.

## Users

Every authenticated user managing their own profile or workspaces.

## Outcome hypothesis

- Expected user outcome: "Profile" in the sidebar opens a dedicated
  `/profile` page with just the profile form; "Workspaces" opens `/account`
  with just workspace administration. Deep links, refresh, and Back behave
  per-route instead of per-anchor.
- Opportunity evidence: user direction ("separate the profile from the
  workspace"); current `AccountPage.tsx` renders both cards and
  `AppShell.tsx:21-22` navigates via hash anchors.
- Signal: `/profile` renders the profile form; `/account` renders no profile
  card; sidebar hrefs are `/profile` and `/account`.
- Follow-up owner/date: agent, at feature finish.

## Scope (in)

- New `/profile` route + `ProfilePage` (PageHeader + Profile card +
  `ProfileForm`, reusing the existing component unchanged).
- `/account` becomes workspaces-only: profile card and `#profile` anchor
  removed.
- Sidebar: Profile → `/profile`, Workspaces → `/account` (hash anchors
  removed).
- Backwards compatibility: `/account#profile` redirects to `/profile`;
  `/account#workspaces` still lands on the workspaces section.
- Migrate affected tests — full list: `shell.test.tsx` (profile assertions
  AND every `Welcome, Demo` sentinel since the /account header changes),
  `projects.test.tsx` (`Welcome, Demo` sentinel), `landing.test.tsx`
  (`#profile` element + href assertions), `decomposition.test.ts`
  (repoint the ProfileForm-import assertion from AccountPage to
  ProfilePage). `workspace-pane.test.tsx` and `default-workspace.test.tsx`
  only assert workspace UI on `/account` — unaffected.
- Delete now-dead nav-hash logic: `NavEntry.hash` field and
  `end={!item.hash}` in AppShell.
- Keep `<div id="workspaces" className="anchor">` verbatim on `/account`.
- Verify-email warning banner stays on `/account` only — intended: profile
  editing does not require verification, so `/profile` shows no banner.

## Scope (out)

- Backend changes (profile API unchanged).
- New profile fields (email display, avatar, password change UI) —
  `ProfileForm` keeps its current fields.
- Renaming `/account` to `/workspaces` — route stability beats label purity;
  the page title will say what it is.
- Account-level security/session actions (logout stays in the shell).

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | `/profile` is a dedicated page with its own header and the profile form; saving updates the shell user without reload | Profile page renders the profile form; Profile page has a dedicated title; Saving profile from the dedicated page updates the shell user |
| 2 | `/account` contains only workspace administration | Account page shows no profile card; Account page keeps workspace management |
| 3 | Sidebar links are real routes, not hash anchors | Sidebar links to profile and workspaces routes |
| 4 | Legacy hash links keep working | Legacy account profile anchor redirects to profile page; Account workspaces anchor still lands on the section |

## Decisions

### D1 — `/profile` route, `/account` keeps workspaces

- Context & forces: two sidebar destinations already exist conceptually
  ("Workspaces", "Profile") but share one route. Options: (a) split into
  `/workspaces` + `/profile` and drop `/account`; (b) keep `/account` for
  workspaces, add `/profile`.
- Decision & why: (b). `/account` is already linked externally (sidebar,
  landing page, emails potentially) and "account" reasonably means
  "workspace/account administration"; renaming the route adds redirect
  complexity for zero user benefit. `/profile` is the obvious name for the
  other half.
- Consequences: + minimal diff, no route migration. − `/account` name is
  slightly broader than its content (mitigated: PageHeader title will read
  "Workspaces" or "Account").
- Reversibility: two-way door — a `/workspaces` alias can be added later.

### D2 — Hash-anchor redirect for `/account#profile` (render-time, no flash)

- Context & forces: old links/bookmarks may carry `#profile`. React Router
  does not match on hash, so `/account#profile` renders `AccountPage` —
  the redirect must live in the matched route element. A `useEffect` +
  `navigate` fires AFTER paint → visible flash of the wrong page.
- Options considered: (a) ignore the hash; (b) `useEffect` redirect;
  (c) render-time `<Navigate>` wrapper.
- Decision & why: (c). A small `AccountRoute` wrapper —
  `hash === '#profile' ? <Navigate to="/profile" replace /> :
  <AccountPage />` — redirects during render, zero flash, matches the
  existing `RequireAuth` wrapper pattern in App.tsx, and is unit-testable
  via `MemoryRouter initialEntries={['/account#profile']}`.
  `#workspaces` needs no redirect — the anchor id stays on the page.
- Consequences: + zero broken bookmarks, no flash. − one tiny wrapper
  component.
- Reversibility: two-way door — remove the wrapper once links age out.

### D3 — PageHeader titles

- `/profile` → "Profile" (description optional).
- `/account` → keep "Welcome, <firstName>"? The welcome header belongs to a
  personal landing, not workspace admin — but removing it is cosmetic churn.
  Decision: `/account` PageHeader becomes "Workspaces" for honesty; the
  welcome greeting moves… actually keep it simple: `/account` header =
  "Workspaces"; `/profile` header = "Profile". The verify-email warning
  banner stays on `/account` (it gates workspace features).
- Reversibility: two-way door — copy tweak.
