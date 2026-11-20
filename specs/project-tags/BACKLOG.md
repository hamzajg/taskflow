# Backlog: project-tags

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

## US1 — As a workspace admin, I want to manage colored tags, so that projects can be organized and filtered
- Scenarios: @w1
- Size: M
- Notes: tags + project_tags tables, workspace-scoped CRUD, role-gated mutation, uniqueness, cascade deletes, project tagIds on create/update

## US2 — As a workspace member, I want to see and use tags in the UI, so that I can label and filter projects at a glance
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: badges on cards/detail, tag management drawer on /projects, tag multi-select in project drawer, client-side filter chips

## US3 — As a user, I want tag UI that is accessible in both themes, so that the feature is usable for everyone
- Scenarios: @w3
- Depends: US2
- Size: S
- Notes: verification wave — labelled controls, both-theme evidence, a11y test pass
