# Spec: task-drawer

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

Opening a task today means leaving the page you were on: list view and
kanban cards link to `/tasks/:id`, which replaces the whole screen with a
detail page. Quick questions — "what's the due date on this?", "did anyone
reply?" — force a full navigation away from project context, and coming
back loses your place (scroll, board column, open edit form). The detail
page also duplicates concerns: `ProjectDetailPage` (~420 lines) owns the
task form, the grouped list, inline editing and the view toggle in one
component, and the comments thread is welded inside `TaskDetailPage` so it
cannot be reused anywhere else.

## Users

- Workspace members working in a project's task list or kanban board who
  want to peek at a task and its discussion without losing context.
- Anyone maintaining the frontend, who needs the task UI decomposed into
  single-responsibility pieces that can be composed (page, drawer, future
  surfaces) instead of duplicated.

## Outcome hypothesis

- Expected user outcome: clicking a task opens a right-side drawer with the
  task's fields and comment thread; the underlying list/board stays
  mounted; the full `/tasks/:id` page remains reachable for deep links and
  focused work.
- Opportunity evidence: assumption — slide-over "peek" panels are the
  category norm (Linear, Height, Jira all do this); derived from the current
  full-navigation cost and the taskifysaas UX baseline showing detail
  views as overlays/drawers. No usage data.
- Signal: qualitative — fewer navigations per task interaction; drawer used
  from both list and board. No numeric target.
- Follow-up owner/date: product owner reviews after the feature ships.

## Scope (in)

- **`Drawer` primitive** (`components/Drawer.tsx`): right-side slide-over —
  dimmed overlay, panel anchored right, slides in/out via CSS transition,
  closes on overlay click and Escape, moves focus into the panel on open,
  traps Tab within the panel, restores focus to the invoking control on
  close, locks body scroll while open, `role="dialog"` +
  `aria-modal="true"` + accessible title, both themes via tokens only.
- **`TaskDrawer`** (`pages/TaskDrawer.tsx` or `components/`): given a task
  id, fetches task + project + comments (same endpoints as the detail
  page), renders task fields and the shared comment thread, plus an "Open
  full page" link to `/tasks/:id`. Loading/error states match existing
  patterns.
- **Shared `CommentThread` component**: the comments list + post/edit/
  delete logic extracted from `TaskDetailPage` so the detail page and the
  drawer render identical comment UI from one implementation.
- **Entry points**: task titles in the project list view and kanban board
  cards stay real `<a href="/tasks/:id">` links; a plain (unmodified) click
  is intercepted to open the drawer instead of navigating, so middle-click,
  ctrl-click and copy-link still reach the canonical page. The drawer's
  "Open full page" action navigates to `/tasks/:id`. Direct `/tasks/:id`
  visits keep working unchanged. Board drag-and-drop must keep working —
  the drag source is the card `<li>`, the link inside it only handles
  plain clicks.
- **SRP decomposition**: `ProjectDetailPage` split into focused
  components — create-task form, task list item (read + edit states), and
  view toggle — each with one job; `TaskDetailPage` consumes the shared
  `CommentThread` (this adoption happens in wave 1, since the drawer needs
  it too). No behavior change. This story is independently cuttable: if it
  slips, waves 1 and 3 still stand.
- **UX polish**: consistent spacing/typography via existing tokens,
  drawer open/close animation (panel stays mounted until the close
  transition ends), focus-visible states, `prefers-reduced-motion`
  respected for the slide transition.

## Scope (out)

- Any backend change — the existing tasks/comments/projects APIs suffice.
- Realtime comment updates, notifications, attachments, mentions,
  activity feed.
- Changing the `/tasks/:id` page's layout beyond adopting `CommentThread`.
- Drawer usage on pages other than project detail (dashboard quick-peek is
  a future feature).
- Mobile-specific drawer behavior beyond the overlay/panel working at all
  viewport sizes.

## Acceptance criteria

1. Clicking a task title in list view or a card in board view opens the (Scenarios: Task title opens the drawer from list view; Board card opens the drawer)
   drawer; the project page stays mounted underneath.
2. The drawer shows the task's title, description, status, priority (Scenarios: Drawer shows fields and comment thread),
   assignee, due date and the full comment thread with post/edit/delete —
   identical behavior to the detail page.
3. Escape, overlay click, and a visible close control all dismiss the (Scenarios: Drawer dismisses via escape, overlay and close button; Drawer meets the accessibility bar in both themes)
   drawer; focus returns to the invoking control; body scroll is locked
   while open and Tab cycles within the panel.
4. "Open full page" in the drawer navigates to `/tasks/:id` (Scenarios: Open full page reaches the canonical detail view; Drawer state lives in the URL), which renders
   the same task and comments. The drawer's open state lives in the URL
   (`/projects/:id?task=<taskId>`) so refresh, share and the browser Back
   button behave correctly.
5. CommentThread is a single shared component used by both the detail page (Scenarios: CommentThread is shared, not duplicated)
   and the drawer — no duplicated comment markup or logic.
6. ProjectDetailPage is decomposed into single-responsibility components (Scenarios: List and board interactions still work after decomposition);
   all existing list/edit/delete/move behaviors still pass their tests.
7. Drawer and reskinned elements meet the accessibility bar in both (Scenarios: Drawer meets the accessibility bar in both themes; Slide transition respects reduced motion)
   themes: labelled controls, visible focus, `role="dialog"`,
   `aria-modal`, keyboard reachable.
8. Tests and build stay green; UI evidence covers both themes (@w1 @w2 @w3).

## Decisions (preliminary — challenged in DECISION-REVIEW.md)

- **D1 — Click opens drawer, page remains canonical.** Task titles become
  drawer triggers; `/tasks/:id` stays the deep-linkable full page. Tradeoff:
  changes existing click behavior; mitigated by the drawer's explicit
  "Open full page" action and unchanged direct-URL behavior.
- **D2 — Drawer owns its data fetching.** `TaskDrawer` fetches
  task/project/comments itself rather than receiving them as props, so any
  surface can open it with just a task id; the comment thread shares the
  detail page's endpoints.
- **D3 — Extract with a thin data wrapper, don't rewrite.** The comments
  fetch is entangled with the page's `load()`; `CommentThread` takes
  `taskId` + comments state as props (or fetches by `taskId` itself) and
  owns post/edit/delete, while `TaskDetailPage` keeps its single `load()`.
  Lowest-risk path to identical UI in page and drawer.
- **D4 — Pure-CSS slide, no animation library.** Transition on
  `transform`/`opacity`; the panel remains mounted during the close
  transition, then unmounts. `prefers-reduced-motion` makes both open and
  close instant. Keeps the bundle lean.
- **D5 — Drawer state is a URL search param.** `ProjectDetailPage` reads
  `?task=<id>`; opening the drawer pushes the param, closing removes it.
  Back/refresh/share all work; the drawer never holds hidden navigation
  state. Cost: drawer-open is a history entry (acceptable — Back closes
  the drawer, which is the expected UX).
