# Spec: app-shell

> Spec-driven development artifact. This file is the contract: implementation
> is done when every acceptance criterion maps to a scenario in
> `EXAMPLES.feature` and every scenario has a passing check.

## Problem

TaskFlow's authenticated UI is a minimal single-column shell with ad-hoc
styles: no design tokens, no app navigation frame, no dark mode, and no
shared component primitives. Every new feature (projects, tasks, activity)
would have to invent its own look and layout, producing an inconsistent
product. The workspace needs a coherent application frame and visual
language before feature work scales.

## Users

Workspace members (owner/admin/member) who live in the app daily;
secondary: whoever builds the next features on top of the shell.

## Outcome hypothesis

- Expected user outcome: authenticated screens share one navigation frame
  and visual language; users can switch light/dark theme; the UI feels
  like a coherent product rather than a set of demo pages.
- Opportunity evidence: assumption — derived from the product's roadmap
  (projects/tasks/features pending) and the reference design baseline,
  not from user research. No usage data exists yet.
- Signal: qualitative — every authenticated route renders inside the shell;
  theme choice persists across reloads. No numeric target.
- Follow-up owner/date: product owner reviews after the next feature ships.

## Scope (in)

- Design tokens as CSS custom properties (color, spacing, radius, shadow,
  typography) with light + dark palettes — the single source of truth.
- App shell for authenticated routes: fixed sidebar navigation + top bar
  (workspace switcher, user menu, theme toggle), responsive collapse.
- Shared primitives: Button, Input, Select, Card, Badge, Alert — only what
  existing pages need. Modal/Toast are deferred to the first spec that
  needs them (decision-review finding: hand-rolled modals/toasts are the
  worst a11y offenders; choose Radix-vs-hand-roll then, with evidence).
- Restyle all existing authenticated pages (home, workspace panel,
  profile) and auth pages onto the tokens/primitives.
- Dark/light theme toggle persisted per user (localStorage), respecting
  `prefers-color-scheme` on first visit.
- Accessibility pass: focus-visible states, aria labels on icon-only
  controls, sufficient contrast in both themes.

## Scope (out)

- New product features (projects, tasks, notifications) — later specs.
- Routing changes beyond wrapping existing routes in the shell.
- Backend changes (none required; theme is client-side).
- Real-time updates, command palette, notifications inbox UI.
- Copying any legacy theme CSS/assets verbatim (IP rule).

## Acceptance criteria

<!-- Scenario(s): use scenario names verbatim from EXAMPLES.feature and/or
     @w<N> tags — ship_validate resolves both for traceability. -->

| # | Criterion | Scenario(s) |
|---|-----------|-------------|
| 1 | All tokens defined once as CSS custom properties; no hard-coded colors in components | @w1 |
| 2 | Shared primitives (Button/Input/Card/Badge) used by all pages; no per-page style forks | @w1 |
| 3 | Authenticated routes render inside sidebar+topbar shell; sidebar collapses on narrow viewports | @w2 |
| 4 | Theme toggle switches light/dark instantly and persists across reload | @w3 |
| 5 | First visit honors OS `prefers-color-scheme` | @w3 |
| 6 | Existing functionality unchanged: login, register, verify, reset, workspace CRUD, invites, profile | @w4 |
| 7 | Keyboard focus visible and icon-only controls have accessible names in both themes | @w4 |

## Decisions

> DECISION-REVIEW.md verdict: **REVISE** — answered inline: D2 primitive
> set trimmed (Modal/Toast deferred), D3 edge-case contract added, D4
> constrained to flat NavItem[], D5 record corrected. Direction ACCEPTed.

- **D1 — Styling architecture: CSS custom properties + hand-rolled component
  classes (no framework).**
  - Context & forces: current `styles.css` is ~170 lines of ad-hoc rules;
    the app needs a token system and reusable primitives without adding a
    dependency or build complexity.
  - Options considered: (a) CSS custom properties + BEM-ish classes in one
    stylesheet (simplest, zero deps, reversible); (b) Tailwind utility
    framework (fast but adds build config + rewrites every class);
    (c) CSS Modules per component (more files, same tokens needed anyway).
  - Decision & why: (a). The codebase is small; tokens are the actual need,
    not a utility engine. Reversible — tokens map 1:1 to any future system.
  - Consequences: +: no deps, single source of truth, easy dark mode via
    variable swap. −: less ergonomic than utilities at scale; may revisit
    if the UI grows large.
  - Reversibility: two-way door. Revisit if component count exceeds ~30.

- **D2 — Component strategy: thin primitives in `src/components/`, pages
  compose them. Required set: Button, Input, Select, Card, Badge, Alert.
  Modal/Toast explicitly deferred (see DECISION-REVIEW.md finding 1).**
  - Context & forces: three pages duplicate label/input/button markup;
    next features (projects/tasks) will multiply this.
  - Options considered: (a) shared primitives folder (simplest);
    (b) headless UI library like Radix (adds dep, better a11y out of box);
    (c) keep per-page markup (status quo — rejected).
  - Decision & why: (a) for now — primitives are thin wrappers over tokens;
    revisit Radix if complex widgets (combobox, dialog focus-trap) appear.
  - Consequences: +: consistent look, small surface. −: we own a11y
    details; mitigated by the AC-7 accessibility scenario.
  - Reversibility: two-way door per component.

- **D3 — Theme mechanism: `data-theme` attribute on `<html>` + CSS variable
  swap; React context holds choice; localStorage persists.**
  - Context & forces: dark mode is a headline modernization ask; must not
  flash wrong theme on load (FOUC) and must respect OS preference first.
  - Options considered: (a) `data-theme` + vars + inline pre-paint script
    (simplest, no dep); (b) `prefers-color-scheme` media query only
    (no manual override — fails AC-4); (c) theme library like
    `next-themes` (React-Router app, not Next — poor fit).
  - Decision & why: (a). One attribute drives everything; the pre-paint
    script reads localStorage before React mounts.
  - Edge-case contract (per DECISION-REVIEW.md finding 2): store a plain
    `"light"|"dark"` string (not JSON); wrap localStorage access in
    try/catch with `matchMedia('(prefers-color-scheme: dark)')` fallback
    (private-mode storage throws); theme applies app-wide — auth pages
    get tokens too, they just have no toggle.
  - Consequences: +: instant toggle, no FOUC, testable. −: small inline
    script to maintain.
  - Reversibility: two-way door.

- **D4 — App shell layout: fixed sidebar (collapsible) + top bar, desktop-
  first with mobile collapse.**
  - Context & forces: product IA will grow (projects/tasks/etc.); a top-
  only nav won't scale; baseline shows sidebar as the reference pattern.
  - Options considered: (a) sidebar + topbar shell (matches baseline,
    scalable); (b) keep topbar-only and add dropdown menus (simpler now,
    dead-end for feature growth); (c) full responsive drawer always
    (over-engineered for current 6 routes).
  - Decision & why: (a), with collapse-to-overlay below ~900px.
  - Guardrail (per DECISION-REVIEW.md finding 3): wave 2 ships a flat
    declarative `NavItem[]` (route → label → icon); collapsible menu
    groups are deferred until a feature needs them — one route today
    does not justify nested nav machinery.
  - Consequences: +: room for feature nav; consistent frame. −: layout
    work in wave 2; every page must fit the content column.
  - Reversibility: two-way door (layout is presentational).

- **D5 — Icons: `lucide-react` icon components, no icon font.**
  - Context & forces: need ~10 icons (nav, actions, theme). Icon fonts add
    a render-blocking asset and legacy coupling; SVGs are tree-shakeable.
  - Options considered: (a) hand-rolled SVG React components (zero deps);
    (b) `lucide-react` (MIT, maintained, ~1 dep); (c) copy Boxicons font
    (legacy asset — rejected by IP rules and font-weight).
  - Decision & why: (b) lucide-react — battle-tested a11y (aria-hidden by
    default), tiny, consistent stroke style, avoids hand-drawing
    inconsistencies. (a) hand-rolled SVGs remain the fallback if the dep
    is rejected.
  - Consequences: +: consistent icons, accessible. −: one small dep.
  - Reversibility: two-way door.
