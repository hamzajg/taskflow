# Validation — create-pane

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | On a project page, "Add task" opens the right drawer with… | Add task opens the creation drawer, Creating a task closes the drawer and updates the list | 1 | create-pane.test.tsx |
| 2 | Create-form validation and API errors display inside the… | Create errors stay inside the drawer with values preserved, Create form resets on every open | 1 | create-pane.test.tsx |
| 3 | Escape, overlay click, close button and Cancel all dismiss… | Dismissing the create drawer creates nothing, Only one drawer is open at a time | 1 | create-pane.test.tsx |
| 4 | On the projects page, "New project" opens the same drawer… | Creating a project closes the drawer and updates the list, New project opens the creation drawer | 2 | create-pane.test.tsx |
| 5 | The inline "New task" card and inline project-create form… | Inline creation forms are gone | 2 | create-pane.test.tsx |
| 6 | Both creation drawers meet the drawer accessibility bar… | Creation drawers meet the accessibility bar in both themes | 3 | create-pane.test.tsx |
| 7 | Tests and build stay green; evidence covers both themes… | Add task opens the creation drawer, Create errors stay inside the drawer with values preserved, Create form resets on every open, Creating a project closes the drawer and updates the list, Creating a task closes the drawer and updates the list, Creation drawers meet the accessibility bar in both themes, Dismissing the create drawer creates nothing, Inline creation forms are gone, New project opens the creation drawer, Only one drawer is open at a time, Peek drawer still works alongside create | 1, 2, 3 | create-pane.test.tsx |

## Scenario coverage

- Scenarios: 11 total, 11 with detected test evidence, 0 without
- ✓ `Add task opens the creation drawer` (@w1)
- ✓ `Creating a task closes the drawer and updates the list` (@w1)
- ✓ `Create errors stay inside the drawer with values preserved` (@w1)
- ✓ `Dismissing the create drawer creates nothing` (@w1)
- ✓ `Peek drawer still works alongside create` (@w1)
- ✓ `Only one drawer is open at a time` (@w1)
- ✓ `Create form resets on every open` (@w1)
- ✓ `New project opens the creation drawer` (@w2)
- ✓ `Creating a project closes the drawer and updates the list` (@w2)
- ✓ `Inline creation forms are gone` (@w2)
- ✓ `Creation drawers meet the accessibility bar in both themes` (@w3)

## Demo script (manual walkthrough)

1. **Add task opens the creation drawer** — run the app, perform the scenario, observe the outcome.
2. **Creating a task closes the drawer and updates the list** — run the app, perform the scenario, observe the outcome.
3. **New project opens the creation drawer** — run the app, perform the scenario, observe the outcome.
4. **Creating a project closes the drawer and updates the list** — run the app, perform the scenario, observe the outcome.

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