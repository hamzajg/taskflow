# Waves — time-tracking

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Members can list time entries
- Member logs a manual time entry
- Author edits own entry
- Member cannot touch another user's entry
- Admin deletes any entry
- Invalid time entry input is rejected
- Timer start and stop compute minutes
- Second timer start while running is rejected
- Running timer is discoverable across tasks
- Deleting a task removes its time entries
- Task detail shows time total and entries

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a workspace member, I want to log and manage time entries on tasks, so that effort is recorded accurately | M | — | time_entries table + composite-FK tenancy, manual CRUD, author/admin authz, validation, start/stop timer with one-running-per-user, cascades, totalMinutes aggregate |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Time section lists entries and total on task detail
- Member logs time from the UI
- Timer controls run and stop from the UI
- Member sees own-entry controls only

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a team member, I want a Time section on task detail, so that I can log time and see totals without leaving the task | M | US1 | entries list, add-entry form, timer start/stop with elapsed display, own-entry controls, totalMinutes on task rows/detail |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Time section works in both themes

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want the time UI accessible in both themes, so that it works for everyone | S | US2 | verification wave — labelled controls, both-theme evidence |
