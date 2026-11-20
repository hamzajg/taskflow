# Validation — project-tags

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Workspace members can list and create tags; owner/admin can… | Assign tags to a project, Deleting a project removes tag assignments, Deleting a tag detaches it from projects, Duplicate tag titles are rejected, Invalid tag input is rejected, Member cannot mutate tags, Members can list workspace tags, Owner creates a tag, Reject foreign-workspace tag ids | 1 | TagResourceTest.java |
| 2 | Tag titles are required, length-bounded, and unique per… | Assign tags to a project, Deleting a project removes tag assignments, Deleting a tag detaches it from projects, Duplicate tag titles are rejected, Invalid tag input is rejected, Member cannot mutate tags, Members can list workspace tags, Owner creates a tag, Reject foreign-workspace tag ids | 1 | TagResourceTest.java |
| 3 | Projects accept `tagIds` on create/update and return their… | Assign tags to a project, Deleting a project removes tag assignments, Deleting a tag detaches it from projects, Duplicate tag titles are rejected, Invalid tag input is rejected, Member cannot mutate tags, Members can list workspace tags, Owner creates a tag, Reject foreign-workspace tag ids | 1 | TagResourceTest.java |
| 4 | Deleting a tag detaches it everywhere; deleting a project… | Assign tags to a project, Deleting a project removes tag assignments, Deleting a tag detaches it from projects, Duplicate tag titles are rejected, Invalid tag input is rejected, Member cannot mutate tags, Members can list workspace tags, Owner creates a tag, Reject foreign-workspace tag ids | 1 | TagResourceTest.java |
| 5 | `/projects` shows tag badges, offers tag management, and… | Assign tags in the project drawer, Edit a project and update its tags, Filter projects by tag, Manage tags from the projects page, Project cards show tag badges, Tag UI works in both themes | 2, 3 | tags.test.tsx |

## Scenario coverage

- Scenarios: 15 total, 15 with detected test evidence, 0 without
- ✓ `Members can list workspace tags` (@w1)
- ✓ `Owner creates a tag` (@w1)
- ✓ `Member cannot mutate tags` (@w1)
- ✓ `Duplicate tag titles are rejected` (@w1)
- ✓ `Invalid tag input is rejected` (@w1)
- ✓ `Assign tags to a project` (@w1)
- ✓ `Reject foreign-workspace tag ids` (@w1)
- ✓ `Deleting a tag detaches it from projects` (@w1)
- ✓ `Deleting a project removes tag assignments` (@w1)
- ✓ `Project cards show tag badges` (@w2)
- ✓ `Manage tags from the projects page` (@w2)
- ✓ `Filter projects by tag` (@w2)
- ✓ `Assign tags in the project drawer` (@w2)
- ✓ `Edit a project and update its tags` (@w2)
- ✓ `Tag UI works in both themes` (@w3)

## Demo script (manual walkthrough)

1. **Members can list workspace tags** — run the app, perform the scenario, observe the outcome.
2. **Owner creates a tag** — run the app, perform the scenario, observe the outcome.
3. **Assign tags to a project** — run the app, perform the scenario, observe the outcome.
4. **Project cards show tag badges** — run the app, perform the scenario, observe the outcome.
5. **Manage tags from the projects page** — run the app, perform the scenario, observe the outcome.
6. **Filter projects by tag** — run the app, perform the scenario, observe the outcome.
7. **Assign tags in the project drawer** — run the app, perform the scenario, observe the outcome.
8. **Edit a project and update its tags** — run the app, perform the scenario, observe the outcome.

## Gaps

- none — spec is fully traced

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)