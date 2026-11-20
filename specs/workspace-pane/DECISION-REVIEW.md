# Decision review: workspace-pane

> Advisory decision-challenge record (D011). The challenger reviewed the
> design in SPEC.md / EXAMPLES.feature / BACKLOG.md against the actual code
> and returned **REVISE**; all findings were folded into the spec before
> wave planning.

## Verdict: REVISE → findings folded

## Steelman (accepted)

The drawer is right for workspace *management* — the members/invites/
rename/delete subpanel is exactly the "focused task on top of a directory"
shape the Drawer primitive already serves. Keeping detail inline and only
drawing create would leave administration buried in an expanding
subpanel; a route adds deep-link surface for an admin view nobody shares.
D2 (no shared abstraction) matches the existing create-drawer split.

## Findings and resolutions

1. **[blocker] Two-way activeWorkspaceId↔openId sync unspecified** → D6
   added: drawer open state is click-driven only; the sync effect is
   deleted; sidebar switching never pops a drawer. Scenario added.
2. **[concern] Delete-while-active leaves dangling selection** → AC4 +
   scenario: after delete the drawer closes and `activeWorkspaceId`
   resets if it pointed at the deleted workspace.
3. **[concern] `window.confirm` inside aria-modal drawer — nested modal +
   Escape conflict** → D7: replaced by inline two-step confirm inside the
   drawer.
4. **[concern] Error semantics undefined; invites fetched for all roles**
   → scope + AC4: members-load failure alerts with retry in drawer;
   invites fetched only when `canManage`; mutation errors alert inside
   the drawer preserving values. Scenario added.
5. **[concern] Double-duty click / context-switch side effect** → scope:
   clicking a name always opens its drawer and sets it active; no
   toggle-close; switching context via drawer is intended.
6. **[nit] US1 bundles read+write at Size L** → kept whole (splitting
   mid-panel-cleanup creates a half-migrated panel).
7. **[nit] ProfileForm borderline YAGNI** → kept: removes last form logic
   from AccountPage; "Save profile" label preserved verbatim (shell test).
8. **[nit] No existing tests assumed inline forms — new coverage is the
   work** → AC7 reworded: new tests cover the drawer flows.
9. **[nit] D5 naming** → confirmed consistent; workspace-name buttons keep
   accessible name = workspace name.

## Revisit trigger

Reopen if product wants shareable workspace-admin URLs (kills D1), if
real workspaces routinely exceed ~50 members (480px drawer wrong
container), or if the sidebar switcher is expected to open the manage
drawer.
