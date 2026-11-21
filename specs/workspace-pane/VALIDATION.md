# Validation — workspace-pane

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | On `/account`, clicking a workspace name opens a right-side… | Manage drawer shows permitted actions per role, Sidebar switching never opens the drawer, Sidebar workspace switching still works, Workspace name opens the management drawer | 1 | workspace-pane.test.tsx |
| 2 | "New workspace" opens a creation drawer (Scenarios: New… | Creating a workspace closes the drawer and updates the list, New workspace opens the creation drawer | 2 | workspace-pane.test.tsx |
| 3 | The inline "New workspace" form and the inline members… | Account page shows no inline workspace forms | 2 | workspace-pane.test.tsx |
| 4 | Delete uses an inline two-step confirm inside the drawer… | Delete uses an inline confirm and resets a dangling selection, Members load failure alerts with retry inside the drawer, Workspace mutations happen inside the drawer | 1 | workspace-pane.test.tsx |
| 5 | Workspace drawer errors (members load failure… | Members load failure alerts with retry inside the drawer, Workspace mutations happen inside the drawer | 1 | workspace-pane.test.tsx |
| 6 | `AccountPage` delegates profile editing to `ProfileForm`… | AccountPage delegates profile editing to ProfileForm | 3 | decomposition.test.ts |
| 7 | Tests and build stay green; evidence covers both themes… | Account page shows no inline workspace forms, AccountPage delegates profile editing to ProfileForm, Creating a workspace closes the drawer and updates the list, Delete uses an inline confirm and resets a dangling selection, Dismissing the manage drawer preserves state, Manage drawer shows permitted actions per role, Members load failure alerts with retry inside the drawer, New workspace opens the creation drawer, Sidebar switching never opens the drawer, Sidebar workspace switching still works, Workspace create errors stay inside the drawer, Workspace drawers meet the accessibility bar in both themes, Workspace mutations happen inside the drawer, Workspace name opens the management drawer | 1, 2, 3 | decomposition.test.ts, workspace-pane.test.tsx |

## Scenario coverage

- Scenarios: 14 total, 14 with detected test evidence, 0 without
- ✓ `Workspace name opens the management drawer` (@w1)
- ✓ `Manage drawer shows permitted actions per role` (@w1)
- ✓ `Workspace mutations happen inside the drawer` (@w1)
- ✓ `Dismissing the manage drawer preserves state` (@w1)
- ✓ `Sidebar switching never opens the drawer` (@w1)
- ✓ `Delete uses an inline confirm and resets a dangling selection` (@w1)
- ✓ `Members load failure alerts with retry inside the drawer` (@w1)
- ✓ `Sidebar workspace switching still works` (@w1)
- ✓ `New workspace opens the creation drawer` (@w2)
- ✓ `Creating a workspace closes the drawer and updates the list` (@w2)
- ✓ `Workspace create errors stay inside the drawer` (@w2)
- ✓ `Account page shows no inline workspace forms` (@w2)
- ✓ `Workspace drawers meet the accessibility bar in both themes` (@w3)
- ✓ `AccountPage delegates profile editing to ProfileForm` (@w3)

## Demo script (manual walkthrough)

1. **Workspace name opens the management drawer** — run the app, perform the scenario, observe the outcome.
2. **Manage drawer shows permitted actions per role** — run the app, perform the scenario, observe the outcome.
3. **New workspace opens the creation drawer** — run the app, perform the scenario, observe the outcome.
4. **Creating a workspace closes the drawer and updates the list** — run the app, perform the scenario, observe the outcome.

## Gaps

- none — spec is fully traced

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence,
which is not proof: ship_loop finish requires strong test
evidence or a `## Manual verification` entry per AC.

## Manual verification

<!-- For ACs without strong automated evidence, one bullet per
     AC: `- AC <n> — <command/check run> → <observed result>`.
     Preserved across ship_validate reruns; the delivery auditor
     still verifies each claim. -->

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)