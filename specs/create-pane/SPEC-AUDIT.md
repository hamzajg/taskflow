# Spec audit: create-pane

> Independent audit (D013) before wave planning. Auditor: fresh
> read-only subagent; no product code edited.

## Verdict: CONCERNS → all findings folded into spec artifacts

## Verified

- Drawer lifecycle concern was real (`Drawer.tsx` mounts on `open`,
  unmounts 250ms after close; children persist through transition) — the
  spec's reset-on-open contract is implementable in the create-drawer
  component without touching `Drawer`.
- `?task=` mutual exclusivity feasible: `ProjectDetailPage` already clears
  search params on close (`setSearchParams({}, {replace:true})`).
- `TaskFormFields` contract fits task creation (fully controlled).
- Payload normalization (`|| undefined`) preserved and scenario-cited.
- All 7 ACs map to @w-tagged scenarios; BACKLOG parses; G1 blocking gate
  present; naming consistent.

## Findings folded

1. "At no point two dialogs rendered" over-promised vs the 250ms close
   transition → scenario reworded to "at most one drawer open".
2. Test migration not acknowledged → AC7 now names `drawer.test.tsx` /
   `projects.test.tsx`.
3. `flex-wrap` selector pinned to `.card-actions` in SPEC.md.
4. Payload-normalization step added to the w2 create scenario.
