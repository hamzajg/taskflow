# Validation — app-shell

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | All tokens defined once as CSS custom properties; no… | Design tokens are the single source of styling, Shared primitives replace duplicated markup | 1 | tokens.test.ts |
| 2 | Shared primitives (Button/Input/Card/Badge) used by all… | Design tokens are the single source of styling, Shared primitives replace duplicated markup | 1 | tokens.test.ts |
| 3 | Authenticated routes render inside sidebar+topbar shell… | Authenticated pages render inside the app shell, Sidebar collapses on narrow viewports | 2 | shell.test.tsx |
| 4 | Theme toggle switches light/dark instantly and persists… | First visit honors OS preference, Theme toggle switches and persists | 3 | theme.test.ts |
| 5 | First visit honors OS `prefers-color-scheme` | First visit honors OS preference, Theme toggle switches and persists | 3 | theme.test.ts |
| 6 | Existing functionality unchanged: login, register, verify… | Existing flows still work inside the shell, Keyboard and assistive technology support | 4 | shell.test.tsx |
| 7 | Keyboard focus visible and icon-only controls have… | Existing flows still work inside the shell, Keyboard and assistive technology support | 4 | shell.test.tsx |

## Scenario coverage

- Scenarios: 8 total, 7 with detected test evidence, 1 without
- ✓ `Design tokens are the single source of styling` (@w1)
- ✓ `Shared primitives replace duplicated markup` (@w1)
- ✓ `Authenticated pages render inside the app shell` (@w2)
- ✗ `Sidebar collapses on narrow viewports` (@w2)
- ✓ `Theme toggle switches and persists` (@w3)
- ✓ `First visit honors OS preference` (@w3)
- ✓ `Existing flows still work inside the shell` (@w4)
- ✓ `Keyboard and assistive technology support` (@w4)

## Demo script (manual walkthrough)

1. **Design tokens are the single source of styling** — run the app, perform the scenario, observe the outcome.
2. **Shared primitives replace duplicated markup** — run the app, perform the scenario, observe the outcome.
3. **Authenticated pages render inside the app shell** — run the app, perform the scenario, observe the outcome.
4. **Theme toggle switches and persists** — run the app, perform the scenario, observe the outcome.

## Gaps

- 1 scenario(s) lack detected test evidence — verify manually or add checks

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)