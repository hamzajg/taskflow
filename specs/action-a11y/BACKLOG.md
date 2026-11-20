# Backlog: action-a11y

Items are USER STORIES in the parseable format below — keep the heading
shape `## US<n> — <story>` and the field lines intact so `wave_plan` can
parse them. Write the story as: "As a <role>, I want <goal>, so that
<value>" — the title after the dash IS the story.

```
## US<n> — <story>
- Scenarios: @w1, @w2
- Depends: US1, US3        (optional; omit for wave-1 items)
- Size: S|M|L
- Notes: <one line>
```

Order stories by user value; dependencies express technical order only.

## US1 — As a screen-reader user, I want task actions to name their task, so that I can tell which task I'm editing, deleting or moving
- Scenarios: @w1
- Size: S
- Notes: aria-labels on TaskItem Edit/Delete, BoardView Move toggle, CommentThread Edit/Delete (by author); migrate drawer.test.tsx + projects.test.tsx Move name queries + task-detail.test.tsx comment Edit/Delete anchored-name queries.

## US2 — As a user, I want the projects page to show one Projects heading, so that the page structure reads cleanly
- Scenarios: @w2
- Size: S
- Notes: Card title "Projects" → "All projects"; WorkspaceDrawer member Remove gets aria-label naming the member (audit found workspace-pane delegation never happened); both-theme check that nothing visual regressed.
