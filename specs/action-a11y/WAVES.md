# Waves — action-a11y

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Task list actions name their task
- Board move control names its task
- Comment actions name their author
- Inline edit actions stay scoped

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a screen-reader user, I want task actions to name their task, so that I can tell which task I'm editing, deleting or moving | S | — | aria-labels on TaskItem Edit/Delete, BoardView Move toggle, CommentThread Edit/Delete (by author); migrate drawer.test.tsx + projects.test.tsx Move name queries. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Projects page shows one Projects heading
- Action labels work in both themes

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a user, I want the projects page to show one Projects heading, so that the page structure reads cleanly | S | — | Card title "Projects" → "All projects"; both-theme check that nothing visual regressed. |
