# Backlog: create-pane

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

## US1 — As a member, I want to create tasks from a focused side drawer, so that the project page stays clean and creation feels deliberate
- Scenarios: @w1
- Size: M
- Notes: Replace "New task" card with "Add task" button + TaskCreateDrawer reusing TaskFormFields; submit/error/dismiss semantics; peek drawer unaffected.

## US2 — As a member, I want to create projects from the same drawer pattern, so that creation feels unified across the app
- Scenarios: @w2
- Size: S
- Notes: Replace inline create form on ProjectsPage with "New project" drawer (name/description/color); remove permanent inline forms. Independent of US1 — only the Drawer primitive is shared.

## US3 — As a user, I want the creation drawers to be accessible and polished in both themes, so that they feel like part of the product
- Scenarios: @w3
- Depends: US1, US2
- Size: S
- Notes: Inherited Drawer a11y verified for create flows; keyboard submit; both-theme evidence.
