# Validation — task-detail

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | Workspace members can list and post comments on tasks in… | Author edits and deletes their own comment, Cross-workspace comment isolation, Empty or oversized comment body is rejected, Member posts a comment on a task in their workspace, Non-author cannot edit another member's comment, Non-member cannot read or post comments on workspace tasks, Workspace admin can moderate but not edit comments | 1 | CommentResourceTest.java |
| 2 | Non-members and cross-workspace task IDs get 403/404 with… | Author edits and deletes their own comment, Cross-workspace comment isolation, Empty or oversized comment body is rejected, Member posts a comment on a task in their workspace, Non-author cannot edit another member's comment, Non-member cannot read or post comments on workspace tasks, Workspace admin can moderate but not edit comments | 1 | CommentResourceTest.java |
| 3 | Comment body is validated (non-blank, length-capped) | Author edits and deletes their own comment, Cross-workspace comment isolation, Empty or oversized comment body is rejected, Member posts a comment on a task in their workspace, Non-author cannot edit another member's comment, Non-member cannot read or post comments on workspace tasks, Workspace admin can moderate but not edit comments | 1 | CommentResourceTest.java |
| 4 | Authors can edit and delete their own comments; others get… | Author edits and deletes their own comment, Cross-workspace comment isolation, Empty or oversized comment body is rejected, Member posts a comment on a task in their workspace, Non-author cannot edit another member's comment, Non-member cannot read or post comments on workspace tasks, Workspace admin can moderate but not edit comments | 1 | CommentResourceTest.java |
| 5 | Workspace owner/admin can delete any comment (moderation) | Author edits and deletes their own comment, Cross-workspace comment isolation, Empty or oversized comment body is rejected, Member posts a comment on a task in their workspace, Non-author cannot edit another member's comment, Non-member cannot read or post comments on workspace tasks, Workspace admin can moderate but not edit comments | 1 | CommentResourceTest.java |
| 6 | Comments return in chronological order with author identity | Author edits and deletes their own comment, Cross-workspace comment isolation, Empty or oversized comment body is rejected, Member posts a comment on a task in their workspace, Non-author cannot edit another member's comment, Non-member cannot read or post comments on workspace tasks, Workspace admin can moderate but not edit comments | 1 | CommentResourceTest.java |
| 7 | Task detail page shows every task field and links back to… | Comments thread renders and posting adds a comment, Task detail shows all fields and links back to the project, Task with no comments shows an empty state | 2 | task-detail.test.tsx |
| 8 | Comments thread renders on the detail page; posting adds a… | Comments thread renders and posting adds a comment, Task detail shows all fields and links back to the project, Task with no comments shows an empty state | 2 | task-detail.test.tsx |
| 9 | Empty comment thread shows a useful empty state; errors… | Comments thread renders and posting adds a comment, Detail and comments screens meet the accessibility bar, Loading and error states are handled, Task detail shows all fields and links back to the project, Task with no comments shows an empty state | 2, 3 | projects.test.tsx, task-detail.test.tsx |
| 10 | New screens meet the accessibility bar in both themes | Detail and comments screens meet the accessibility bar, Loading and error states are handled | 3 | projects.test.tsx, task-detail.test.tsx |

## Scenario coverage

- Scenarios: 12 total, 12 with detected test evidence, 0 without
- ✓ `Member posts a comment on a task in their workspace` (@w1)
- ✓ `Empty or oversized comment body is rejected` (@w1)
- ✓ `Non-member cannot read or post comments on workspace tasks` (@w1)
- ✓ `Cross-workspace comment isolation` (@w1)
- ✓ `Author edits and deletes their own comment` (@w1)
- ✓ `Non-author cannot edit another member's comment` (@w1)
- ✓ `Workspace admin can moderate but not edit comments` (@w1)
- ✓ `Task detail shows all fields and links back to the project` (@w2)
- ✓ `Comments thread renders and posting adds a comment` (@w2)
- ✓ `Task with no comments shows an empty state` (@w2)
- ✓ `Detail and comments screens meet the accessibility bar` (@w3)
- ✓ `Loading and error states are handled` (@w3)

## Demo script (manual walkthrough)

1. **Member posts a comment on a task in their workspace** — run the app, perform the scenario, observe the outcome.
2. **Author edits and deletes their own comment** — run the app, perform the scenario, observe the outcome.
3. **Task detail shows all fields and links back to the project** — run the app, perform the scenario, observe the outcome.
4. **Comments thread renders and posting adds a comment** — run the app, perform the scenario, observe the outcome.

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