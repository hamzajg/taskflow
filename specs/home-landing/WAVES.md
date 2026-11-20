# Waves — home-landing

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Guest sees the landing page at the root
- Authenticated user at root is sent to the dashboard
- Guest cannot reach the dashboard
- Account management remains reachable

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a visitor, I want a public landing page and a clear auth boundary, so that I understand the product and can sign up or log in | M | — | LandingPage at `/` for guests (hero, value props, register/login CTAs, theme-aware), `/dashboard` route stub behind auth, `/account` page hosting existing workspace+profile content, router + nav updates, frontend tests. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Dashboard shows workspace stat cards
- Dashboard shows my open tasks for the caller
- Summary endpoint enforces membership
- Dashboard handles empty and loading states
- Dashboard follows the sidebar workspace selection
- Dashboard error offers retry

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a workspace member, I want a dashboard with workspace stats and my open tasks, so that I see what needs attention at a glance | M | US1 | `GET /workspaces/{id}/summary` aggregate endpoint (membership-gated, OpenAPI), DashboardPage with StatCard grid + projects list + quick links, loading/empty/error-retry states, backend + frontend tests. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Reskinned screens meet the accessibility bar in both themes
- Stat cards and headers follow the shared design language

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want the whole app to share one polished visual language, so that pages feel like one product | M | US2 | StatCard/section-header components, token-driven reskin of projects/detail/task-detail/account/landing, a11y pass (labels, focus, keyboard), both-theme screenshot evidence. |
