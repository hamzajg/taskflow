# Backlog: projects-tasks

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

## US1 — As a workspace member, I want a projects/tasks API with correct tenancy and roles, so that work data is safe and consistent
- Scenarios: @w1
- Size: L
- Notes: V3 migration (projects, tasks tables + seqs), Project/Task entities, ProjectService/TaskService with requireMembership/requireRole choke points, REST resources, move endpoint (api.ts gains patch helper); composite-FK workspace integrity, FOR UPDATE move serialization, task-delete position compaction, project cascade; backend scenario tests for CRUD, validation, isolation, delete roles.

## US2 — As a member, I want a projects list and project detail with a task list, so that I can see and manage work
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: /projects + /projects/:id routes, ProjectsPage + ProjectDetailPage (list view), task create/edit forms, empty/loading/error states, sidebar Projects nav item; frontend tests.

## US3 — As a member, I want a kanban board with persisted drag ordering, so that I can move work at a glance
- Scenarios: @w3
- Depends: US2
- Size: M
- Notes: Board view toggle (persisted per project), status columns, native HTML5 DnD + keyboard/touch move menu (DnD has no touch path — menu is the fallback), PATCH move calls, order survives reload; frontend tests for grouping/move.

## US4 — As a user, I want the new screens polished and accessible, so that they match the product's quality bar
- Scenarios: @w4
- Depends: US2, US3
- Size: S
- Notes: a11y pass on new screens (focus, labels, keyboard+touch move), loading/error/retry states, both-theme screenshot evidence, gap closure from validation.
