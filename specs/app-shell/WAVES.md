# Waves — app-shell

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Design tokens are the single source of styling
- Shared primitives replace duplicated markup

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a developer, I want design tokens and shared primitives, so that every screen shares one visual language | M | — | CSS custom properties for color/spacing/radius/shadow/type; Button, Input, Select, Card, Badge, Alert primitives (Modal/Toast deferred per decision review); restyle auth + home pages; no hard-coded colors. |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Authenticated pages render inside the app shell
- Sidebar collapses on narrow viewports

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a user, I want a consistent app frame with sidebar navigation, so that I can find my way around as features grow | M | US1 | Fixed sidebar + top bar wrapping authenticated routes; workspace switcher and user menu slots; flat declarative NavItem[] (no collapsible groups yet); collapses below ~900px. |

## Wave 3 — iteration 3

Scenarios proven by this wave:
- Theme toggle switches and persists
- First visit honors OS preference

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US3 | As a user, I want a light/dark theme that persists, so that the app fits my environment and preference | S | US1 | data-theme attribute + variable swap; toggle in top bar; localStorage; prefers-color-scheme on first visit; pre-paint script to avoid FOUC. |

## Wave 4 — iteration 4

Scenarios proven by this wave:
- Existing flows still work inside the shell
- Keyboard and assistive technology support

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US4 | As a user, I want the shell to be accessible, so that I can use it by keyboard and with assistive tech | S | US2, US3 | focus-visible styles, aria labels on icon-only controls, contrast check in both themes; verify existing flows unchanged. |
