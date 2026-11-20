# Backlog: workspace-pane

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

## US1 — As a workspace owner/admin, I want to manage members, invites, rename and delete from a focused drawer, so that administration doesn't expand inline under the workspace list
- Scenarios: @w1
- Size: L
- Notes: WorkspaceDrawer owns members/invites fetch + all mutations; preserves canManage/isOwner gating; window.confirm replaced by inline two-step confirm; activeWorkspaceId→openId sync effect removed; delete resets dangling active selection; invites fetched only when canManage; members-load failure alerts+retry inside drawer. WorkspacePanel shrinks to list + orchestration.

## US2 — As a member, I want to create a workspace from the same drawer pattern, so that creation feels unified across the app
- Scenarios: @w2
- Size: S
- Notes: Replace inline New workspace form with button + WorkspaceCreateDrawer (name field only); same lifecycle contract as task/project create drawers.

## US3 — As a maintainer, I want AccountPage to delegate profile editing to a focused component, so that the page only orchestrates
- Scenarios: @w3
- Depends: US1, US2
- Size: S
- Notes: Extract ProfileForm (fields, submit, pending, messages); a11y verification of both workspace drawers in both themes.
