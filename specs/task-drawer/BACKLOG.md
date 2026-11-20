# Backlog: task-drawer

Items are USER STORIES in the parseable format below — keep the heading
shape `## US<n> — <story>` and the field lines intact so `wave_plan` can
parse them. Write the story as: "As a <role>, I want <goal>, so that
<value>" — the title after the dash IS the story.

```
## US<n> — As a <role>, I want <goal>, so that <value>
- Scenarios: @w1, @w2
- Depends: US1, US3        (optional; omit for wave-1 items)
- Size: S|M|L
- Notes: <one line>
```

Order stories by user value; dependencies express technical order only.

## US1 — As a member, I want to peek at a task in a side drawer, so that I keep my place in the list or board
- Scenarios: @w1
- Size: L
- Notes: Drawer primitive (focus trap + scroll lock ship here) + TaskDrawer + CommentThread extraction (incl. TaskDetailPage adoption) + entry points from list and board; no backend work.

## US2 — As a maintainer, I want the task UI split into single-responsibility components, so that pages stay simple and reusable
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: Decompose ProjectDetailPage (form, list item, edit state, view toggle); TaskDetailPage adopts shared CommentThread; behavior-preserving.

## US3 — As a user, I want the drawer to be accessible and polished in both themes, so that it feels like part of the product
- Scenarios: @w3
- Depends: US1, US2
- Size: S
- Notes: Focus management, Escape/overlay/close, aria-modal dialog, reduced-motion, both-theme evidence.
