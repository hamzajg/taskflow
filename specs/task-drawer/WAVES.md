# Waves — task-drawer

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Task title opens the drawer from list view
- Board card opens the drawer
- Drawer shows fields and comment thread
- Drawer state lives in the URL
- Task links keep native navigation semantics
- Board drag-and-drop still works
- Drawer dismisses via escape, overlay and close button
- Open full page reaches the canonical detail view
- Detail page still works standalone

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a member, I want to peek at a task in a side drawer, so that I keep my place in the list or board | L | — | Drawer primitive (focus trap + scroll lock ship here) + TaskDrawer + CommentThread extraction (incl. TaskDetailPage adoption) + entry points from list and board; no backend work. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- List and board interactions still work after decomposition
- CommentThread is shared, not duplicated

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a maintainer, I want the task UI split into single-responsibility components, so that pages stay simple and reusable | M | US1 | Decompose ProjectDetailPage (form, list item, edit state, view toggle); TaskDetailPage adopts shared CommentThread; behavior-preserving. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Drawer meets the accessibility bar in both themes
- Slide transition respects reduced motion

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want the drawer to be accessible and polished in both themes, so that it feels like part of the product | S | US1, US2 | Focus management, Escape/overlay/close, aria-modal dialog, reduced-motion, both-theme evidence. |
