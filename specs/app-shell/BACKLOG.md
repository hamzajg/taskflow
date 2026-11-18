# Backlog: app-shell

Items are USER STORIES in the parseable format below — keep the heading
shape `## US<n> — <story>` and the field lines intact so `wave_plan` can
parse them. Write the story as: "As a <role>, I want <goal>, so that
<value>" — the title after the dash IS the story.

```
## US<n> — As a <role>, I want <goal>, so that <value>
- Scenarios: @w1, @w2
- Depends: US1, US3        (optional; omit for wave-1 items)
- Size: S|M|L
- Notes: <one line>
```

## US1 — As a developer, I want design tokens and shared primitives, so that every screen shares one visual language
- Scenarios: @w1
- Size: M
- Notes: CSS custom properties for color/spacing/radius/shadow/type; Button, Input, Select, Card, Badge, Alert primitives (Modal/Toast deferred per decision review); restyle auth + home pages; no hard-coded colors.

## US2 — As a user, I want a consistent app frame with sidebar navigation, so that I can find my way around as features grow
- Scenarios: @w2
- Depends: US1
- Size: M
- Notes: Fixed sidebar + top bar wrapping authenticated routes; workspace switcher and user menu slots; flat declarative NavItem[] (no collapsible groups yet); collapses below ~900px.

## US3 — As a user, I want a light/dark theme that persists, so that the app fits my environment and preference
- Scenarios: @w3
- Depends: US1
- Size: S
- Notes: data-theme attribute + variable swap; toggle in top bar; localStorage; prefers-color-scheme on first visit; pre-paint script to avoid FOUC.

## US4 — As a user, I want the shell to be accessible, so that I can use it by keyboard and with assistive tech
- Scenarios: @w4
- Depends: US2, US3
- Size: S
- Notes: focus-visible styles, aria labels on icon-only controls, contrast check in both themes; verify existing flows unchanged.
