# Validation — task-drawer

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Clicking a task title in list view or a card in board view… | Board card opens the drawer, Task title opens the drawer from list view | 1 | drawer.test.tsx |
| 2 | The drawer shows the task's title, description, status… | Drawer shows fields and comment thread | 1 | drawer.test.tsx |
| 3 | Escape, overlay click, and a visible close control all… | Drawer dismisses via escape, overlay and close button, Drawer meets the accessibility bar in both themes | 1, 3 | drawer-a11y.test.tsx, drawer.test.tsx |
| 4 | "Open full page" in the drawer navigates to `/tasks/:id`… | Drawer state lives in the URL, Open full page reaches the canonical detail view | 1 | drawer.test.tsx |
| 5 | CommentThread is a single shared component used by both the… | CommentThread is shared, not duplicated | 2 | decomposition.test.ts |
| 6 | ProjectDetailPage is decomposed into single-responsibility… | List and board interactions still work after decomposition | 2 | decomposition.test.ts |
| 7 | Drawer and reskinned elements meet the accessibility bar in… | Drawer meets the accessibility bar in both themes, Slide transition respects reduced motion | 3 | drawer-a11y.test.tsx |
| 8 | Tests and build stay green; UI evidence covers both themes… | Board card opens the drawer, Board drag-and-drop still works, CommentThread is shared, not duplicated, Detail page still works standalone, Drawer dismisses via escape, overlay and close button, Drawer meets the accessibility bar in both themes, Drawer shows fields and comment thread, Drawer state lives in the URL, List and board interactions still work after decomposition, Open full page reaches the canonical detail view, Slide transition respects reduced motion, Task links keep native navigation semantics, Task title opens the drawer from list view | 1, 2, 3 | decomposition.test.ts, drawer-a11y.test.tsx, drawer.test.tsx |

## Scenario coverage

- Scenarios: 13 total, 13 with detected test evidence, 0 without
- ✓ `Task title opens the drawer from list view` (@w1)
- ✓ `Board card opens the drawer` (@w1)
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