# Spec audit: workspace-pane

> Independent audit (D013) before wave planning. Auditor: fresh
> read-only subagent; no product code edited.

## Verdict: CONCERNS → all findings folded into spec artifacts

## Verified

- All WorkspacePanel claims accurate: inline create form, name-button
  toggle+activate, `activeWorkspaceId→openId` sync effect, swallowed
  members/invites fetches, canManage/isOwner gating, `window.confirm`,
  all mutations.
- AccountPage profile form + "Save profile" label confirmed;
  `shell.test.tsx` assertion survives.
- Drawer lifecycle contract (wasOpen reset, pending-disabled submit,
  onClose→onCreated) confirmed in both existing create drawers.
- No existing tests assume the inline workspace forms — new coverage is
  the work, as AC7 states.
- All 9 challenger fold-ins present; scenarios/ACs/waves consistent;
  G1 blocking gate satisfied by DECISION-REVIEW.md.

## Findings folded

1. AC3 had no asserting scenario → added `@w2` "Account page shows no
   inline workspace forms".
2. Mutation value-preservation under-covered → `@w1` mutation scenario
   now asserts entered values preserved on failure.
3. Remove-member non-owner gating implicit → role-gating scenario now
   pins "member-remove only for non-owner members".
