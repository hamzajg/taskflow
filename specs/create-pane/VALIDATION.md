# Validation — create-pane

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|

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
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)