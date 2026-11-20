# Validation — action-a11y

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Every Edit/Delete button in the task list view has an… | Board move control names its task, Comment actions name their author, Inline edit actions stay scoped, Task list actions name their task | 1 | action-a11y.test.tsx |
| 2 | Every Move toggle in the board view has an accessible name… | Board move control names its task, Comment actions name their author, Inline edit actions stay scoped, Task list actions name their task | 1 | action-a11y.test.tsx |
| 3 | Every comment Edit/Delete button has an accessible name… | Board move control names its task, Comment actions name their author, Inline edit actions stay scoped, Task list actions name their task | 1 | action-a11y.test.tsx |
| 4 | The `/projects` page renders "Projects" as a single heading | Action labels work in both themes, Member remove action names the member, Projects page shows one Projects heading | 2 | action-a11y.test.tsx |
| 5 | Tests and build stay green (existing name queries migrated… | Action labels work in both themes, Member remove action names the member, Projects page shows one Projects heading | 2 | action-a11y.test.tsx |
| 6 | Member remove buttons in the workspace manage drawer name… | Action labels work in both themes, Member remove action names the member, Projects page shows one Projects heading | 2 | action-a11y.test.tsx |

## Scenario coverage

- Scenarios: 7 total, 7 with detected test evidence, 0 without
- ✓ `Task list actions name their task` (@w1)
- ✓ `Board move control names its task` (@w1)
- ✓ `Comment actions name their author` (@w1)
- ✓ `Inline edit actions stay scoped` (@w1)
- ✓ `Projects page shows one Projects heading` (@w2)
- ✓ `Member remove action names the member` (@w2)
- ✓ `Action labels work in both themes` (@w2)

## Demo script (manual walkthrough)

1. **Task list actions name their task** — run the app, perform the scenario, observe the outcome.
2. **Board move control names its task** — run the app, perform the scenario, observe the outcome.
3. **Comment actions name their author** — run the app, perform the scenario, observe the outcome.
4. **Inline edit actions stay scoped** — run the app, perform the scenario, observe the outcome.
5. **Projects page shows one Projects heading** — run the app, perform the scenario, observe the outcome.
6. **Member remove action names the member** — run the app, perform the scenario, observe the outcome.
7. **Action labels work in both themes** — run the app, perform the scenario, observe the outcome.

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