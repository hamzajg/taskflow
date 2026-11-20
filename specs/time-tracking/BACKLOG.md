# Backlog: time-tracking

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

## US1 — As a workspace member, I want to log and manage time entries on tasks, so that effort is recorded accurately
- Scenarios: @w1
- Size: M
- Notes: time_entries table + composite-FK tenancy, manual CRUD, author/admin authz, validation, start/stop timer with one-running-per-user, cascades, totalMinutes aggregate

## US2 — As a team member, I want a Time section on task detail, so that I can log time and see totals without leaving the task
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: entries list, add-entry form, timer start/stop with elapsed display, own-entry controls, totalMinutes on task rows/detail

## US3 — As a user, I want the time UI accessible in both themes, so that it works for everyone
- Scenarios: @w3
- Depends: US2
- Size: S
- Notes: verification wave — labelled controls, both-theme evidence
