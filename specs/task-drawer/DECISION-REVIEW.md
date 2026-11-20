# Decision review — task-drawer

Reviewed by the `decision-challenger` agent against SPEC.md D1–D4,
EXAMPLES.feature and BACKLOG.md, with the actual frontend/backend code
verified. Verdict: **REVISE** — all findings folded into the spec before
planning.

## Verdict record

```
VERDICT: REVISE
STEELMAN: D1–D4 are individually defensible and evidence-backed —
/tasks/:id is a fat page (~180 of 263 lines are comment state+JSX),
ProjectDetailPage (~420 lines) owns form/edit/view-toggle, D3 extract is
the lowest-risk reuse path, D4 needs no new infra, D2 matches existing
fetch-by-id patterns, and the wave split is nearly honest.
```

## Findings → resolutions

1. **Drawer state not URL-addressable** → new **D5**: `?task=<id>`
   search param on `/projects/:id`; Back closes the drawer, refresh and
   share work. New @w1 scenario "Drawer state lives in the URL".
2. **Focus-trap scope inconsistent** (Scope said open/restore only; @w3
   scenario demanded a trap) → trap + body scroll-lock moved into the
   `Drawer` primitive scope bullet and wave 1; @w3 scenario reworded to
   cover both-theme labels, visible focus and scroll lock verification.
3. **Board card entry point conflicts with drag** → entry points stay real
   `<a href="/tasks/:id">`; only plain unmodified clicks open the drawer.
   New @w1 scenarios: "Task links keep native navigation semantics" and
   "Board drag-and-drop still works".
4. **Losing anchor semantics** → resolved by the same fix as #3
   (progressive enhancement, not button replacement).
5. **D2 fetch waterfall unpriced** → acknowledged: drawer fetches by id
   for freshness (3 requests per open); accepted cost, revisited if the
   dashboard quick-peek surface lands.
6. **Wave boundary US1/US2 muddy** → clarified: `TaskDetailPage` adopts
   `CommentThread` in wave 1 (required by AC5); US2 is explicitly
   cuttable without touching waves 1/3.
7. **D3 "verbatim" overstated** → reworded to "extract with a thin data
   wrapper" (comments fetch is entangled in page `load()`).
8. **D4 exit animation vs testability** → spec now states the panel stays
   mounted until the close transition ends.
9. **Mixed drawer + refactor scope** → accepted: only the list-item/card
   extraction is coupled to the trigger; the rest of US2 is cuttable.

## Revisit triggers

- Drawer wanted on other surfaces (dashboard quick-peek) → re-validate D2
  fetch-by-id and possibly D5 param naming.
- Users need to share/bookmark an open drawer and `?task=` proves wrong.
- Wave-2 decomposition breaks existing list/edit/move behavior → revisit
  the "no behavior change" claim and the mixed-scope decision.
