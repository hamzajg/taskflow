# Validation — ux-polish

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Due dates render relative labels (Today/Tomorrow/Overdue/in… | Due dates render relative labels on task surfaces, Tasks without a due date show no due label | 1 | ux-polish.test.tsx |
| 2 | The task drawer shows the same Time section as the detail… | Account page has a single Workspaces heading, Board view is deep-linkable via the view param, Time section works inside the task drawer | 2 | ux-polish.test.tsx |
| 3 | `/account` exposes exactly one "Workspaces" heading | Account page has a single Workspaces heading, Board view is deep-linkable via the view param, Time section works inside the task drawer | 2 | ux-polish.test.tsx |
| 4 | `?view=board` opens the board and toggling updates the URL… | Account page has a single Workspaces heading, Board view is deep-linkable via the view param, Time section works inside the task drawer | 2 | ux-polish.test.tsx |
| 5 | Dashboard project rows show color + tags and a "Time… | Dashboard shows project identity and time totals, Time and date UI meet the accessibility bar in both themes | 3 | WorkspaceSummaryTest.java, dashboard.test.tsx |
| 6 | All touched UI keeps labelled controls in both themes | Dashboard shows project identity and time totals, Time and date UI meet the accessibility bar in both themes | 3 | WorkspaceSummaryTest.java, dashboard.test.tsx |

## Scenario coverage

- Scenarios: 7 total, 5 with detected test evidence, 2 with weak (token-match) evidence only, 0 without
- ✓ `Due dates render relative labels on task surfaces` (@w1)
- ~ `Tasks without a due date show no due label` (@w1)
- ✓ `Time section works inside the task drawer` (@w2)
- ✓ `Account page has a single Workspaces heading` (@w2)
- ✓ `Board view is deep-linkable via the view param` (@w2)
- ✓ `Dashboard shows project identity and time totals` (@w3)
- ~ `Time and date UI meet the accessibility bar in both themes` (@w3)

## Demo script (manual walkthrough)

1. **Due dates render relative labels on task surfaces** — run the app, perform the scenario, observe the outcome.
2. **Time section works inside the task drawer** — run the app, perform the scenario, observe the outcome.
3. **Dashboard shows project identity and time totals** — run the app, perform the scenario, observe the outcome.

## Gaps

- none — spec is fully traced

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)