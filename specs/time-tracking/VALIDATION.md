# Validation — time-tracking

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Members can list and create manual time entries on tasks in… | Admin deletes any entry, Author edits own entry, Deleting a task removes its time entries, Invalid time entry input is rejected, Member cannot touch another user's entry, Member logs a manual time entry, Members can list time entries, Running timer is discoverable across tasks, Second timer start while running is rejected, Task detail shows time total and entries, Timer start and stop compute minutes | 1 | TimeEntryResourceTest.java |
| 2 | Only the entry author can edit/delete their entry… | Admin deletes any entry, Author edits own entry, Deleting a task removes its time entries, Invalid time entry input is rejected, Member cannot touch another user's entry, Member logs a manual time entry, Members can list time entries, Running timer is discoverable across tasks, Second timer start while running is rejected, Task detail shows time total and entries, Timer start and stop compute minutes | 1 | TimeEntryResourceTest.java |
| 3 | Validation rejects bad input: minutes out of range, blank… | Admin deletes any entry, Author edits own entry, Deleting a task removes its time entries, Invalid time entry input is rejected, Member cannot touch another user's entry, Member logs a manual time entry, Members can list time entries, Running timer is discoverable across tasks, Second timer start while running is rejected, Task detail shows time total and entries, Timer start and stop compute minutes | 1 | TimeEntryResourceTest.java |
| 4 | Timer: start creates a running entry, stop closes it and… | Admin deletes any entry, Author edits own entry, Deleting a task removes its time entries, Invalid time entry input is rejected, Member cannot touch another user's entry, Member logs a manual time entry, Members can list time entries, Running timer is discoverable across tasks, Second timer start while running is rejected, Task detail shows time total and entries, Timer start and stop compute minutes | 1 | TimeEntryResourceTest.java |
| 5 | Task and project surfaces show time totals; deleting a task… | Admin deletes any entry, Author edits own entry, Deleting a task removes its time entries, Invalid time entry input is rejected, Member cannot touch another user's entry, Member logs a manual time entry, Member logs time from the UI, Member sees own-entry controls only, Members can list time entries, Running timer is discoverable across tasks, Second timer start while running is rejected, Task detail shows time total and entries, Time section lists entries and total on task detail, Timer controls run and stop from the UI, Timer start and stop compute minutes | 1, 2 | TimeEntryResourceTest.java, time-tracking.test.tsx |
| 6 | Time UI works in both themes with labelled controls | Time section works in both themes | 3 | (weak) tags.test.tsx, time-tracking.test.tsx |

## Scenario coverage

- Scenarios: 16 total, 5 with detected test evidence, 11 with weak (token-match) evidence only, 0 without
- ~ `Members can list time entries` (@w1)
- ~ `Member logs a manual time entry` (@w1)
- ✓ `Author edits own entry` (@w1)
- ~ `Member cannot touch another user's entry` (@w1)
- ~ `Admin deletes any entry` (@w1)
- ~ `Invalid time entry input is rejected` (@w1)
- ~ `Timer start and stop compute minutes` (@w1)
- ~ `Second timer start while running is rejected` (@w1)
- ~ `Running timer is discoverable across tasks` (@w1)
- ~ `Deleting a task removes its time entries` (@w1)
- ~ `Task detail shows time total and entries` (@w1)
- ✓ `Time section lists entries and total on task detail` (@w2)
- ✓ `Member logs time from the UI` (@w2)
- ✓ `Timer controls run and stop from the UI` (@w2)
- ✓ `Member sees own-entry controls only` (@w2)
- ~ `Time section works in both themes` (@w3)

## Demo script (manual walkthrough)

1. **Members can list time entries** — run the app, perform the scenario, observe the outcome.
2. **Member logs a manual time entry** — run the app, perform the scenario, observe the outcome.
3. **Timer start and stop compute minutes** — run the app, perform the scenario, observe the outcome.
4. **Running timer is discoverable across tasks** — run the app, perform the scenario, observe the outcome.
5. **Task detail shows time total and entries** — run the app, perform the scenario, observe the outcome.
6. **Time section lists entries and total on task detail** — run the app, perform the scenario, observe the outcome.
7. **Member logs time from the UI** — run the app, perform the scenario, observe the outcome.
8. **Timer controls run and stop from the UI** — run the app, perform the scenario, observe the outcome.

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