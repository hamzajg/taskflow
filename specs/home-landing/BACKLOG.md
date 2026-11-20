# Backlog: home-landing

Items are USER STORIES in the parseable format below — keep the heading
shape `## US<n> — <story>` and the field lines intact so `wave_plan` can
parse them. Write the story as: "As a <role>, I want <goal>, so that
<value>" — the title after the dash IS the story.

```
## US<n> — As a <role>, I want <goal>, so that <value>
- Scenarios: @w1, @w2
- Depends: US1, US3        (optional; omit for wave-1 items)
- Size: S|M|L
- Notes: <one line>
```

Order stories by user value; dependencies express technical order only.

## US1 — As a visitor, I want a public landing page and a clear auth boundary, so that I understand the product and can sign up or log in
- Scenarios: @w1
- Size: M
- Notes: LandingPage at `/` for guests (hero, value props, register/login CTAs, theme-aware), `/dashboard` route stub behind auth, `/account` page hosting existing workspace+profile content, router + nav updates, frontend tests.

## US2 — As a workspace member, I want a dashboard with workspace stats and my open tasks, so that I see what needs attention at a glance
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: `GET /workspaces/{id}/summary` aggregate endpoint (membership-gated, OpenAPI), DashboardPage with StatCard grid + projects list + quick links, loading/empty/error-retry states, backend + frontend tests.

## US3 — As a user, I want the whole app to share one polished visual language, so that pages feel like one product
- Scenarios: @w3
- Depends: US2
- Size: M
- Notes: StatCard/section-header components, token-driven reskin of projects/detail/task-detail/account/landing, a11y pass (labels, focus, keyboard), both-theme screenshot evidence.
