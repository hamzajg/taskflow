# Spec: create-pane

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

Creating entities today means inline forms embedded in page content: the
project page carries a permanent "New task" card above the task list, and
the projects page carries an inline create-project form inside the list
card. These forms consume vertical space whether or not the user is
creating anything, push the actual work (task list, project list) below
the fold, and read as page furniture rather than an action. The product
now has a right-side drawer (`task-drawer` feature) that is the natural
home for focused create/edit flows — but creation still bypasses it.

## Users

- Workspace members who add tasks to a project or projects to a workspace
  frequently and want a focused, dismissible creation surface.
- Anyone scanning the project/projects pages who wants the lists to start
  at the top, not below a form.

## Outcome hypothesis

- Expected user outcome: "Add task" / "New project" open the right-side
  drawer with a focused form; submitting creates the entity, closes the
  drawer and refreshes the list; cancelling loses nothing.
- Opportunity evidence: assumption — the drawer pattern shipped in
  `task-drawer` is already the product's overlay surface; extending it to
  creation unifies the interaction model (peek AND create in one pane).
  No usage data.
- Signal: qualitative — one overlay component serves read and write flows;
  pages get shorter. No numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **Task creation via drawer**: the "New task" card on the project page is
  replaced by an "Add task" button (in the Tasks card header actions,
  beside the view toggle) that opens a drawer containing the shared
  `TaskFormFields` + a "Create task" submit. On success the drawer closes
  and resets, then the list reloads and the new task appears. Create
  form errors (validation, API) surface inside the drawer with the fields
  preserved; submit is disabled while the request is in flight.
- **Project creation via drawer**: the inline create form on the projects
  page is replaced by a "New project" button in the Projects card header
  actions that opens a drawer with name/description/color fields + a
  "Create project" submit; same close/reload/error semantics and the same
  payload normalization as today (`description`/`color` empty → omitted).
- **Unified pane behavior**: both drawers reuse the `Drawer` primitive —
  same overlay, focus trap, scroll lock, Escape/close dismissal, both
  themes, reduced-motion. Drawer open state for creation is local
  component state (not a URL param — creation is transient, not
  shareable content; see D1).
- **Drawer lifecycle contract**: at most one drawer is open on a page —
  activating "Add task" while the peek drawer is open (`?task=` present)
  closes the peek drawer first. Every closed→open transition starts the
  form from defaults; a successful submit resets the form; an API failure
  preserves entered values; cancel/dismiss discards them.
- **Empty-state coherence**: a project with zero tasks shows the empty
  message plus the "Add task" affordance still reachable.

## Scope (out)

- Editing existing entities in drawers (task edit stays inline; project
  edit doesn't exist).
- Bulk creation, templates, import.
- Any backend change — existing POST endpoints suffice.
- Changing the task-drawer peek behavior or `/tasks/:id`.
- Workspace/member management forms on `/account` (out of scope — admin
  surfaces, not daily creation).

## Acceptance criteria

1. On a project page, "Add task" opens the right drawer with the task
   form; submitting creates the task, closes and resets the drawer, and
   the task appears in the list (correct status group).
2. Create-form validation and API errors display inside the drawer;
   entered values are preserved on failure; submit is disabled while in
   flight; reopening the drawer always starts from a blank form.
3. Escape, overlay click, close button and Cancel all dismiss without
   creating; focus returns to the invoking button. Only one drawer can be
   open at a time — opening create while peek is open closes peek.
4. On the projects page, "New project" opens the same drawer pattern with
   name/description/color; submitting creates and the project appears in
   the workspace project list with the same payload normalization as
   before (empty optional fields omitted).
5. The inline "New task" card and inline project-create form are removed;
   pages contain no permanent creation forms.
6. Both creation drawers meet the drawer accessibility bar (they inherit
   the `Drawer` primitive) and work in both themes.
7. Tests and build stay green; evidence covers both themes. Existing
   tests that assume inline forms (`drawer.test.tsx` "New task" card text,
   `projects.test.tsx` create-form flow) are migrated to open the drawer
   first.

## Decisions (preliminary — challenged in DECISION-REVIEW.md)

- **D1 — Creation drawer state is local, not URL.** Unlike task peek
  (`?task=<id>`), an open create form is transient UI state; putting it
  in the URL adds history noise for no shareable value. Tradeoff:
  refresh closes an in-progress form (acceptable — forms are short).
- **D2 — Reuse `TaskFormFields`, not a new form.** Task creation reuses the
  exact field set extracted in `task-drawer` wave 2; project creation is
  three fields rendered directly (no shared abstraction warranted yet —
  YAGNI until a third entity needs it).
- **D3 — Drawer owns submit, page owns refresh.** The create drawer calls
  the POST endpoint itself and, on success, closes/resets first and then
  invokes `onCreated` so the page reloads its list. Submit stays disabled
  while in flight. Keeps the drawer self-contained and testable.
- **D4 — Button placement.** "Add task" lives in the Tasks card header
  actions next to the view toggle; "New project" lives in the Projects
  card header actions beside the workspace name — consistent placement,
  with `flex-wrap` added to `.card-actions` (and `.card-header` for narrow
  widths) in styles.css.
- **D5 — Opener and submit names differ.** "Add task" opens, "Create task"
  submits (same for project) so queries and tests never collide.
- **D6 — Create and peek are mutually exclusive.** Activating "Add task"
  clears `?task=` (peek closes) before opening create; the project page
  never renders two dialogs.
