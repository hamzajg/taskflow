# Validation — task-drawer

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|

## Scenario coverage

- Scenarios: 13 total, 12 with detected test evidence, 1 with weak (token-match) evidence only, 0 without
- ✓ `Task title opens the drawer from list view` (@w1)
- ~ `Board card opens the drawer` (@w1)
- ✓ `Drawer shows fields and comment thread` (@w1)
- ✓ `Drawer state lives in the URL` (@w1)
- ✓ `Task links keep native navigation semantics` (@w1)
- ✓ `Board drag-and-drop still works` (@w1)
- ✓ `Drawer dismisses via escape, overlay and close button` (@w1)
- ✓ `Open full page reaches the canonical detail view` (@w1)
- ✓ `Detail page still works standalone` (@w1)
- ✓ `List and board interactions still work after decomposition` (@w2)
- ✓ `CommentThread is shared, not duplicated` (@w2)
- ✓ `Drawer meets the accessibility bar in both themes` (@w3)
- ✓ `Slide transition respects reduced motion` (@w3)

## Demo script (manual walkthrough)

1. **Task title opens the drawer from list view** — run the app, perform the scenario, observe the outcome.
2. **Board card opens the drawer** — run the app, perform the scenario, observe the outcome.
3. **Drawer shows fields and comment thread** — run the app, perform the scenario, observe the outcome.
4. **Open full page reaches the canonical detail view** — run the app, perform the scenario, observe the outcome.
5. **CommentThread is shared, not duplicated** — run the app, perform the scenario, observe the outcome.

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