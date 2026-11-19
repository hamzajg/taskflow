# Backlog: task-detail

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

## US1 — As a workspace member, I want a comments API on tasks with correct tenancy and authorship rules, so that discussion is safe and consistent
- Scenarios: @w1
- Size: M
- Notes: V4 migration (comments table + seq), Comment entity, CommentService with membership/author/role choke points, nested + item REST resources, OpenAPI annotations; backend scenario tests for CRUD, validation, isolation, edit/delete authZ.

## US2 — As a member, I want a task detail page with its comment thread, so that I can see full context and discuss the work
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: /tasks/:id route, TaskDetailPage (all fields + project link), comments list + post/edit/delete UI, entry points from list rows and board cards; frontend tests.

## US3 — As a user, I want the detail and comments screens polished and accessible, so that they match the product's quality bar
- Scenarios: @w3
- Depends: US2
- Size: S
- Notes: a11y pass (labels, focus, keyboard), loading/error/retry states, both-theme screenshot evidence, gap closure from validation.
