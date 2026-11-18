# Gates: workspaces-accounts

> Preconditions for phase transitions. Each `## G<n> — <title>` block is a
> gate. `ship_loop` refuses to advance past a phase while a blocking gate is
> pending. Definitions live here; status and evidence live in `LOOP.md`.

## G1 — Spec contract complete
- Before: plan
- Type: artifact
- Owner: agent
- Resolver: agent
- Blocking: yes
- Check: file:specs/workspaces-accounts/SPEC.md
- Why: wave planning requires a filled spec (problem, users, AC table,
  decisions) — a scaffold is not a spec.

## G2 — Backend boots and migrates
- Before: wave:1
- Type: technical
- Owner: agent
- Resolver: agent
- Blocking: yes
- Check: command:cd backend && mvn -q -DskipTests compile
- Why: wave 1 cannot land auth on a skeleton that does not build; the
  command proves toolchain + dependencies resolve.

## G3 — Test suite green
- Before: validate
- Type: quality
- Owner: agent
- Resolver: agent
- Blocking: yes
- Check: command:cd backend && mvn -q test
- Why: acceptance criteria are proven by tests; validation requires a
  green suite, not a manual claim.

## G4 — Frontend builds
- Before: finish
- Type: technical
- Owner: agent
- Resolver: agent
- Blocking: yes
- Check: command:cd frontend && npm run build
- Why: the SPA must compile and bundle cleanly before the feature is done.
