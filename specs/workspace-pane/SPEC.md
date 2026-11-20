# Spec: workspace-pane

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

The account page's workspace management is a single 242-line panel that
mixes four responsibilities: the workspace list, an always-visible
"New workspace" form, and a members/invites/rename/delete subpanel that
expands inline beneath the list. Creating a workspace costs permanent
vertical space whether or not the user is creating one, and managing a
workspace buries member administration inside the list card. The product
already has a right-side drawer pattern (`Drawer` primitive, used by task
peek and both create flows) that is the natural home for focused
workspace management — but workspaces still bypass it. The profile form
on the same page works but lives inline in `AccountPage`, which owns
profile state, workspace rendering, and alerts in one component.

## Users

- Workspace owners/admins who manage members and invites and want a
  focused surface instead of an expanding inline subpanel.
- Any user who wants the account page to read as a clean directory of
  workspaces plus a compact profile card.

## Outcome hypothesis

- Expected user outcome: "New workspace" and workspace names open the
  right-side drawer; members, invites, rename and delete live inside it;
  the account page shows only the workspace list and profile card.
- Opportunity evidence: assumption — the drawer pattern is now the
  product's single overlay surface (peek, task create, project create);
  extending it to workspace management completes the unification.
- Signal: qualitative — one overlay component serves every focused flow;
  `WorkspacePanel` shrinks to list + orchestration. No numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **Workspace management drawer**: clicking a workspace name in the
  account list opens a right-side drawer showing the workspace's members
  (with role badges and Remove for permitted roles), pending invites,
  rename (owner/admin), and delete (owner only). All existing API calls
  and permission checks (`canManage`, `isOwner`) are preserved; the
  `window.confirm` delete guard is replaced by an inline two-step confirm
  inside the drawer (Escape in the confirm must not close the drawer).
- **Workspace creation drawer**: the inline "New workspace" form is
  replaced by a "New workspace" button (in the Workspaces card header
  actions) opening a drawer with the name field; same submit/error/
  dismiss semantics as the task/project create drawers.
- **Profile form extraction**: the profile form moves out of
  `AccountPage` into a `ProfileForm` component owning its fields, submit,
  pending state, and success/error messages. `AccountPage` keeps only
  orchestration (user context, anchors, panel composition). The "Save
  profile" submit label stays verbatim.
- **Drawer lifecycle contract** (same as create-pane): at most one
  drawer open; fresh form state on every open; values preserved on API
  error; submit disabled in flight; focus returns to the opener.
- **Open-state ownership**: drawer open state is driven ONLY by
  workspace-name clicks — the existing `activeWorkspaceId → openId`
  sync effect is removed, so switching workspace in the sidebar never
  pops a drawer. Clicking a name always opens that workspace's drawer
  and sets it active (no toggle-close); viewing another workspace's
  drawer intentionally switches the sidebar selection.
- **Delete semantics**: after a successful delete the drawer closes; if
  the deleted workspace was the active one, `activeWorkspaceId` resets
  (to null or the first remaining workspace) so the sidebar never points
  at a deleted workspace.
- **Error surfacing**: members-load failure shows an alert with retry
  inside the drawer; invites are fetched only when `canManage` (member-
  role users never see invite errors); mutation failures (invite, rename,
  remove, delete) show an alert inside the drawer with form values
  preserved.

## Scope (out)

- Any backend change — existing workspace/member/invite endpoints suffice.
- Changing invite acceptance flow (lives elsewhere — register/invite
  pages are untouched).
- Workspace switching UI in the sidebar (unchanged).
- Task/project drawers (already shipped).
- Password/email management (no such UI exists today; out of scope).

## Acceptance criteria

1. On `/account`, clicking a workspace name opens a right-side drawer
   with that workspace's members, roles, pending invites, and the
   permitted management actions (rename for owner/admin, delete for
   owner, remove-member for owner/admin on non-owners). Clicking a name
   also sets that workspace active; sidebar switching never opens a
   drawer.
2. "New workspace" opens a creation drawer; submitting creates the
   workspace, closes the drawer and the list refreshes.
3. The inline "New workspace" form and the inline members subpanel are
   removed; the account page shows only the workspace list, profile card
   and drawers.
4. Delete uses an inline two-step confirm inside the drawer; after
   deleting the active workspace the selection resets. Members-load
   failure alerts with retry inside the drawer; mutation errors alert
   inside the drawer with values preserved; member-role users never see
   invite fetch errors.
5. Workspace drawer errors (members load failure, invite/rename/delete
   failures) surface inside the drawer without losing context.
6. `AccountPage` delegates profile editing to `ProfileForm`; the page
   itself contains no form markup and the "Save profile" label is
   unchanged.
7. Tests and build stay green; evidence covers both themes; new tests
   cover the drawer flows (no existing tests assumed the inline forms).

## Decisions (preliminary — challenged in DECISION-REVIEW.md)

- **D1 — Workspace detail is a manage drawer, not a route.** Workspace
  administration is contextual to the account page; a drawer matches the
  product's overlay model and avoids new routes/deep-link questions.
  Tradeoff: workspace management is not URL-shareable (acceptable — it
  was never linkable before either).
- **D2 — One drawer component per concern.** `WorkspaceDrawer` (detail +
  actions) and `WorkspaceCreateDrawer` (name only) mirror the
  task/project split; no shared "entity drawer" abstraction (YAGNI).
- **D3 — Profile stays on the page, form extracted.** Profile is a
  single always-visible card, not an overlay flow; only its internals
  move into `ProfileForm` for SRP.
- **D4 — Drawer owns its API calls.** Members/invites fetch and all
  mutations live in `WorkspaceDrawer`; the panel refreshes via
  `onChanged` after mutations, same contract as the create drawers.
- **D5 — Opener/submit naming.** "New workspace" opens,
  "Create workspace" submits; workspace names open the manage drawer
  (their accessible name stays the workspace name).
- **D6 — Drawer open state is click-driven only.** The
  `activeWorkspaceId → openId` sync effect is deleted; the sidebar
  switcher sets context but never opens a drawer.
- **D7 — Inline two-step delete confirm.** `window.confirm` is replaced
  by a confirm/cancel pair inside the drawer so Escape and focus behave
  like every other drawer action.
- **D8 — Scoped invite fetch.** Invites load only for owner/admin;
  members see members list only — no hidden 403 noise.
