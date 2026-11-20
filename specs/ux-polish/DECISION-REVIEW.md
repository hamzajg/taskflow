# Decision review — ux-polish

- Reviewer: decision-challenger (independent subagent)
- Verdict: **REVISE** — all four decisions directionally sound; spec text
  tightened for implementation traps. No decision re-thought required.
- Reviewed: 2026-11-20

## Findings and resolutions

### 1. MEDIUM — `?view=` vs `?task=` param collision (D3)

`ProjectDetailPage`'s existing `setSearchParams` calls (drawer open/close,
create drawer) replace the whole query string — a naive `?view=`
implementation would be wiped whenever a task drawer opens, and toggling
view would slam the drawer shut. Also: the localStorage view initializer
runs once, leaking project A's preference into project B on `:id`
navigations; invalid `?view=` values unspecified.

**Resolution (folded into D3 + scenario):** all param writes must merge;
invalid values fall back to saved preference; initializer re-seeds on
`projectId` change; coexistence scenario added to EXAMPLES.feature.

### 2. MEDIUM — client/server date divergence + test breakage (D1)

(a) Dashboard's server-computed `overdueCount` can disagree with
client-side per-task flags near midnight — understates the consequence.
(b) `projects.test.tsx:164` and `task-detail.test.tsx:154` assert the raw
ISO date as text; putting ISO only in `title=` breaks them.
(c) `new Date('YYYY-MM-DD')` parses as UTC — reintroduces the timezone
bug D1 avoids. (d) The backend already enforces server dates for
time-entry `entryDate`, so the client/server split is an existing
pattern, not a new one.

**Resolution (folded into D1):** string-compare `YYYY-MM-DD`, never
`new Date()`; ISO stays visible in rendered text; divergence with the
server stat explicitly acknowledged and accepted.

### 3. LOW — `canModerate`/`onChanged` plumbing missing in TaskDrawer (D2)

`TaskDrawer` has no `useShell()` access and receives no refresh callback
— a lazy port would silently drop Delete buttons for moderators and
leave row chips/aggregate stale after drawer mutations. Also corrected:
`TimeSection` fires exactly one request, not two.

**Resolution (folded into D2):** spec now names the wiring — drawer
derives `canModerate` from `project.workspaceId` + shell role, accepts
and forwards `onChanged`, and `ProjectDetailPage` passes its `load`.

### 4. LOW — `WorkspaceSummaryDto` record-ctor + fixture churn (D4)

Adding a field changes the canonical constructor; ~4 test fixtures
construct summary literals and will need updating. Confirmed
`workspace_id` is indexed and running entries contribute 0 via
`SUM(minutes)` — no N+1, tenancy already gated.

**Resolution (accepted, documented in D4):** additive field,
compiler-guided fixture updates.

## Verified clean by reviewer

- `ProjectDto` already carries `color` + `tags` — dashboard claim accurate.
- `dueDate` flows as ISO `YYYY-MM-DD` end-to-end.
- Keeping localStorage writes preserves existing view-preference tests.
- Drawer remount semantics give `TimeSection` a fresh fetch per open.

## Outcome

All findings folded into SPEC.md decisions and EXAMPLES.feature before
planning. Proceed to spec audit + wave plan.
