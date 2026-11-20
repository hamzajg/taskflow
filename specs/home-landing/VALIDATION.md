# Validation — home-landing

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Guests see a landing page at `/` with register/login CTAs | Account management remains reachable, Authenticated user at root is sent to the dashboard, Guest cannot reach the dashboard, Guest sees the landing page at the root | 1 | landing.test.tsx |
| 2 | Authenticated users at `/` redirect to `/dashboard`; guests… | Account management remains reachable, Authenticated user at root is sent to the dashboard, Guest cannot reach the dashboard, Guest sees the landing page at the root | 1 | landing.test.tsx |
| 3 | Dashboard shows correct workspace-scoped stat counts | Dashboard error offers retry, Dashboard follows the sidebar workspace selection, Dashboard handles empty and loading states, Dashboard shows my open tasks for the caller, Dashboard shows workspace stat cards, Summary endpoint enforces membership | 2 | WorkspaceSummaryTest.java, dashboard.test.tsx |
| 4 | Dashboard shows "my open tasks" count for the caller only | Dashboard error offers retry, Dashboard follows the sidebar workspace selection, Dashboard handles empty and loading states, Dashboard shows my open tasks for the caller, Dashboard shows workspace stat cards, Summary endpoint enforces membership | 2 | WorkspaceSummaryTest.java, dashboard.test.tsx |
| 5 | Summary endpoint requires membership; non-members get… | Dashboard error offers retry, Dashboard follows the sidebar workspace selection, Dashboard handles empty and loading states, Dashboard shows my open tasks for the caller, Dashboard shows workspace stat cards, Summary endpoint enforces membership | 2 | WorkspaceSummaryTest.java, dashboard.test.tsx |
| 6 | Dashboard handles loading, empty workspace, and error+retry… | Dashboard error offers retry, Dashboard follows the sidebar workspace selection, Dashboard handles empty and loading states, Dashboard shows my open tasks for the caller, Dashboard shows workspace stat cards, Summary endpoint enforces membership | 2 | WorkspaceSummaryTest.java, dashboard.test.tsx |
| 7 | Existing workspace/profile management remains reachable at… | Account management remains reachable, Authenticated user at root is sent to the dashboard, Guest cannot reach the dashboard, Guest sees the landing page at the root | 1 | landing.test.tsx |
| 8 | Dashboard stats follow the sidebar workspace selection | Dashboard error offers retry, Dashboard follows the sidebar workspace selection, Dashboard handles empty and loading states, Dashboard shows my open tasks for the caller, Dashboard shows workspace stat cards, Summary endpoint enforces membership | 2 | WorkspaceSummaryTest.java, dashboard.test.tsx |
| 9 | Stat cards and section headers follow the design-token… | Reskinned screens meet the accessibility bar in both themes, Stat cards and headers follow the shared design language | 3 | reskin.test.tsx |
| 10 | New screens meet the accessibility bar in both themes | Reskinned screens meet the accessibility bar in both themes, Stat cards and headers follow the shared design language | 3 | reskin.test.tsx |

## Scenario coverage

- Scenarios: 12 total, 8 with detected test evidence, 3 with weak (token-match) evidence only, 1 without
- ✓ `Guest sees the landing page at the root` (@w1)
- ~ `Authenticated user at root is sent to the dashboard` (@w1)
- ~ `Guest cannot reach the dashboard` (@w1)
- ✓ `Account management remains reachable` (@w1)
- ✓ `Dashboard shows workspace stat cards` (@w2)
- ✓ `Dashboard shows my open tasks for the caller` (@w2)
- ✓ `Summary endpoint enforces membership` (@w2)
- ✗ `Dashboard handles empty and loading states` (@w2)
- ✓ `Dashboard follows the sidebar workspace selection` (@w2)
- ~ `Dashboard error offers retry` (@w2)
- ✓ `Reskinned screens meet the accessibility bar in both themes` (@w3)
- ✓ `Stat cards and headers follow the shared design language` (@w3)

## Demo script (manual walkthrough)

1. **Guest sees the landing page at the root** — run the app, perform the scenario, observe the outcome.
2. **Dashboard shows workspace stat cards** — run the app, perform the scenario, observe the outcome.
3. **Dashboard shows my open tasks for the caller** — run the app, perform the scenario, observe the outcome.

## Gaps

- 1 scenario(s) lack detected test evidence — verify manually or add checks

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)