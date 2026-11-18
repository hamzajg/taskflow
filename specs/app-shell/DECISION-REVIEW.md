# Decision review — app-shell (D1–D5)

- Source: `specs/app-shell/SPEC.md` § Decisions
- Reviewer: decision-challenger (advisory — never blocks a gate or merge)
- Grounded in: `frontend/src/App.tsx`, `frontend/src/styles.css` (167 lines),
  `frontend/src/pages/*.tsx`, `frontend/package.json`,
  `specs/app-shell/{EXAMPLES.feature,BACKLOG.md,GATES.md}`,
  `legacy/taskifysaas-113/evidence/UX-BASELINE.md` (design-language baseline only;
  no code/assets copied).

## Facts vs claims

- **Fact:** the entire frontend is 6 routes — 5 auth pages + one authenticated
  `HomePage` that embeds `WorkspacePanel` (`App.tsx:14-32`,
  `HomePage.tsx:51-92`). There is exactly **one** authenticated route today.
- **Fact:** `styles.css` is 167 lines of flat, ad-hoc rules; ~10 hard-coded
  hex colors; no `:focus-visible`, no media queries, no custom properties
  (`styles.css:1-167`).
- **Fact:** `package.json` has exactly three runtime deps (react, react-dom,
  react-router-dom). No test runner, no lint config, no a11y tooling for the
  frontend (`package.json:11-15`).
- **Claim under review:** five decisions that together set the styling,
  component, theme, layout, and icon architecture for all future features.

---

## D1 — CSS custom properties + hand-rolled classes (no framework)

**Steelman.** The real need is a token layer, not a utility engine. At 167
lines of CSS across ~8 page files, Tailwind would buy ergonomics the codebase
cannot yet spend: every existing class would be rewritten, PostCSS config
added, and the "no hard-coded colors" AC (@w1) is equally enforceable by
review of one stylesheet. CSS variables give dark mode as a pure variable
swap (`[data-theme="dark"] { --bg: ... }`) with zero runtime cost, and tokens
map 1:1 onto any future system — genuinely two-way.

**Challenge.** "Will hand-rolled CSS rot?" — yes, eventually, and the spec's
own revisit trigger (~30 components) is a count, not a quality signal. The
failure mode is not component count; it is **unenforced discipline**: with no
frontend tests or lint, nothing mechanically stops the 8th page from adding
`.my-special-blue`. AC-1 ("no component hard-codes a color value") is verified
by a human/agent grep — fine at this size, fragile at 3x. The honest cost of
Tailwind here is small (Vite + `@tailwindcss/vite` is ~2 deps and one config),
so the "zero deps" argument is weaker than presented — the stronger argument
is **single-file reviewability and no build magic in a repo whose backend
CI deliberately stays stdlib-only**. That holds.

**Verdict on D1: sound.** Keep, but make the token contract explicit: define
semantic tokens (`--color-surface`, `--color-text-muted`), not raw palette
swaps, and add one grep-able convention (e.g. colors only via `var(--*)`) to
BACKLOG notes so wave implementers inherit the rule.

## D2 — Own thin primitives in `src/components/`

**Steelman.** Three pages duplicate label/input/button markup today
(`LoginPage`, `RegisterPage`, `HomePage` profile form — `HomePage.tsx:71-89`);
projects/tasks will multiply it. Thin wrappers over tokens are the smallest
change that kills the duplication. Radix buys focus-trap, keyboard nav, and
ARIA wiring for free — real value — but for Button/Input/Card/Badge the
primitives are ~20 lines each and the dep surface grows for widgets we don't
have yet.

**Challenge — the a11y burden is understated.** SPEC hedges with "Modal?" and
"Toast" in scope, and AC-7/@w3 demands focus-visible + accessible names. But:

- There is **no frontend test infrastructure** (`package.json` — no vitest,
  no testing-library, no axe). "Mitigated by the AC-7 accessibility scenario"
  means a manual tab-through. Hand-rolled `Modal` (focus trap, Escape, scroll
  lock, return-focus) and `Toast` (`aria-live`, timers, stacking) are exactly
  the two widgets where hand-rolling produces the worst a11y bugs.
- SPEC already says "only what existing pages need plus obvious next-feature
  needs" — yet **no existing page needs Modal or Toast**. Including them now
  is speculative abstraction, the thing the craftsmanship lens exists to
  catch.

**Smallest correct step:** ship Button/Input/Select/Card/Badge (+ maybe an
`Alert`/`Error` box, which pages do need) in wave 1; **defer Modal and Toast**
to the first spec that uses them, and let that spec choose Radix vs hand-roll
with evidence. If a Modal is truly needed this spec, that alone justifies
`@radix-ui/react-dialog` — do not hand-roll a focus trap.

**Verdict on D2: REVISE (scope).** Keep own-primitives direction; cut Modal
and Toast from this spec's required set and record "revisit Radix when the
first dialog/combobox ships" as the trigger (already half-written in D2 —
make it binding, not optional).

## D3 — `data-theme` + CSS vars + pre-paint script + localStorage

**Steelman.** This is the standard, correct mechanism: one attribute drives
everything, the inline script in `index.html` runs before first paint (kills
FOUC), React context owns the toggle, `prefers-color-scheme` is the first-
visit default. `next-themes` is genuinely a poor fit (it's Next-oriented);
the ~15-line inline script replaces it entirely.

**Challenge — three correctness details the spec leaves implicit:**

1. **Storage format.** "localStorage persists" doesn't say what's stored.
   Store the literal string `"light"|"dark"` — not JSON, not a `theme:dark`
   key — so the pre-paint script is a one-line read with zero parse failure
   modes.
2. **Blocked storage.** Private-mode/quota-blocked `localStorage` throws.
   The pre-paint script must wrap access in `try/catch` and fall back to
   `matchMedia('(prefers-color-scheme: dark)')`; otherwise first paint
   crashes or defaults light for a dark-OS user — silently failing AC-5.
3. **Theme scope across routes.** The toggle lives in the authenticated
   topbar, but auth pages are also restyled onto tokens (scope §in). Decide
   explicitly: does `data-theme="dark"` apply on `/login`? If yes, a
   dark-preferring user gets dark auth pages with **no way to see or change
   the toggle** — acceptable if intentional, a bug if not. Cheapest answer:
   apply theme app-wide (attribute on `<html>` already is) and don't
   over-think it; just record the choice.

None of this changes the mechanism — it changes whether wave 3 ships a
script that actually satisfies @w3's "before first paint" edge case.

**Verdict on D3: sound mechanism, REVISE the contract.** Add to SPEC/BACKLOG:
store a plain `"light"|"dark"` string; pre-paint script is try/catch +
matchMedia fallback; theme applies app-wide including auth pages.

## D4 — Fixed sidebar + topbar shell, collapse <900px

**Steelman.** The baseline (`UX-BASELINE.md` §3–4) is unambiguous: fixed left
sidebar + top navbar is the reference IA, and the roadmap (projects, tasks,
chat, finance…) maps directly onto grouped sidebar menus. Building the frame
now means each future feature is "add a nav item + a route," not "invent
layout again." Presentational-only, so two-way.

**Challenge — it is premature *as navigation*, and the spec half-knows it.**
There is **one** authenticated route (`App.tsx:22-29`). A collapsible sidebar
whose entire contents are "Dashboard" (and maybe "Profile") is chrome without
content — the classic speculative-shell trap. The collapse-to-overlay
behavior (<900px, required by @w2 edge-case) is real responsive work
(hamburger, overlay, focus management, scroll lock) paid **now** for a nav
that has nowhere to go.

That said, the counter-argument is strong: the shell is *layout*, and layout
is exactly what must exist before feature pages land — retrofitting a
sidebar around pages built topbar-only is the expensive direction. And the
cost is bounded: US2 is size M, one wave.

**The honest smallest version:** build the shell *structure* (sidebar
container, topbar, content column, collapse mechanics) with a **declarative
nav-items array** (`{to, label, icon}`) seeded with the 1–2 real routes.
That makes "premature" nearly free — the day projects ship, nav grows by
data, not by refactor. What to avoid is designing grouped/collapsible
sub-menus (baseline §4) before any second-level item exists.

**Verdict on D4: ACCEPT with a guardrail.** Keep sidebar+topbar; constrain
wave 2 to flat nav items via a route→label→icon map; explicitly defer
collapsible menu groups until a feature needs them. Revisit trigger: if the
nav still has ≤3 items when the *next* feature spec lands, reconsider whether
the collapse mechanics were worth it (they will be — but check).

## D5 — Icons: lucide-react (despite the title saying "own set")

**Steelman.** ~10 icons needed; `lucide-react` is MIT, maintained,
tree-shakeable per-icon, ~consistent stroke language, `aria-hidden` by
default, and immune to hand-drawn inconsistencies across contributors. Icon
fonts (the rejected Boxicons path) add a render-blocking asset and legacy
coupling — correctly rejected on IP grounds (`SPEC.md` scope-out +
`legacy/AGENTS.md` IP rules).

**Challenge — the decision record contradicts itself.** The D5 *title* says
"inline SVG icon components (own set), no icon font" and option (a) is
hand-rolled SVGs; the *decision* picks (b) lucide-react. A future reader
cannot tell which was actually chosen without reading three sentences deep.
That's a decision-record defect, not a design defect — but this spec exists
to produce exactly this kind of artifact, so fix the title to match the
choice ("icon system: lucide-react, hand-rolled SVG fallback").

Substantively: is one more dep justified for 10 icons? Hand-rolled SVGs of
nav/theme glyphs are genuinely easy — but the moment icons need consistent
sizing, `currentColor` inheritance, and a11y defaults across ~10 usages,
lucide's uniformity pays for itself, and the fallback clause ("(a) if
dependency policy objects") already covers the objection. Accept.

**Verdict on D5: ACCEPT after a title fix.** Rename the decision headline to
reflect lucide-react; keep the (a) fallback note.

---

## Cross-cutting findings

1. **No frontend test/a11y tooling exists** (`package.json:11-23`). Every
   AC in EXAMPLES.feature — especially @w1 "no hard-coded colors" and @w3
   keyboard/a11y — is verified manually. That is acceptable for this spec's
   size but should be named: wave plans should budget a grep/script check
   for AC-1 rather than assume review catches it.
2. **Speculative scope in D2** (Modal/Toast) is the only real over-build;
   everything else is appropriately minimal for a 167-line CSS file and one
   authenticated route.
3. **D3's mechanism is right; its edge cases are unwritten.** FOUC-free dark
   mode lives or dies on the pre-paint script's failure modes, not on React.

## Scorecard

| Lens | Score | Evidence | Action |
|------|-------|----------|--------|
| Problem & forces | 4 | Real pain is real (`styles.css` ad-hoc, 1 auth route, roadmap in `UX-BASELINE.md` §8); "do nothing" genuinely worse | Keep; name tokens-not-framework as dominant force |
| Alternatives & tradeoffs | 4 | Options per decision are credible, not strawmen; Tailwind cost slightly overstated but reversibility claims hold | Descope Modal/Toast (D2) |
| Domain fit (DDD) | 3 | N/A-ish for pure presentational work; nav-items-as-data is the only domain-shaped choice and it's unspecified | Specify flat `NavItem[]` in wave 2 |
| Architecture & boundaries | 4 | Tokens→vars→components is clean dependency direction; shell is presentational; no backend coupling | Pin theme scope (app-wide) in D3 |
| Testable design | 2 | No frontend test infra (`package.json`); AC-1/@w3 a11y verified by hand only; pre-paint script untestable post-hoc | Add grep check for AC-1; try/catch contract for script |
| Craftsmanship | 4 | Smallest-step discipline mostly good; D5 title/decision mismatch; Modal/Toast speculative | Fix D5 title; defer Modal/Toast |
| Decision record | 3 | Consequences + reversibility recorded per decision; D5 self-contradictory; no owner/date/status on entries | Fix D5 headline; add revisit triggers to D2/D4 (partially present) |

## Verdict

```
VERDICT: REVISE
STEELMAN: A zero-new-runtime-dep styling foundation — CSS custom-property
tokens, thin local primitives, data-theme + pre-paint script, sidebar shell,
lucide icons — is the smallest change that gives TaskFlow a coherent,
reversible visual language before feature work scales; every piece is a
two-way door and none of it blocks on backend work.
SMALLEST NEXT STEP: Amend D2's scope line — required primitives are
Button/Input/Select/Card/Badge (+Alert); Modal and Toast move to "first spec
that needs them," at which point Radix-vs-hand-roll is decided with evidence.
Also fix the D5 headline to say lucide-react, and write the D3 storage
contract (plain "light"|"dark" string, try/catch, matchMedia fallback,
app-wide theme).
REVISIT TRIGGER: (a) first spec needing a dialog/combobox/toast → re-decide
D2 incl. Radix; (b) stylesheet or component count ~3x current or any page
shipping hard-coded colors → re-open D1 (Tailwind vs enforced token lint);
(c) nav still ≤3 items when the projects/tasks spec lands → sanity-check D4's
collapse mechanics paid early.
```

Residual risks even after revision: hand-rolled CSS discipline is
enforced by review only; the pre-paint script is ~15 lines of untested
inline JS in `index.html` (mitigate with the explicit contract above); the
sidebar ships largely empty until the next feature spec — accepted as the
price of getting the frame right once.

*Advisory review — does not block G1 by itself; the gate owner decides.*

## Alternatives considered (summary)

- **Tailwind instead of D1:** credible; loses on build-config aversion and
  total class rewrite for 167 lines of CSS; wins on long-term ergonomics.
  Rejected now, revisit at scale.
- **Radix primitives instead of D2:** wins on a11y for Modal/Toast/complex
  widgets; loses on dep surface for Button/Card/Badge that are trivial.
  Deferred to first real need — the correct sequencing.
- **Topbar-only nav instead of D4:** simplest today; dead-end the moment
  projects/tasks land; rejected — but constrained to flat nav items to keep
  it honest.
- **Hand-rolled SVGs instead of D5:** zero deps; loses on consistency/a11y
  defaults at ~10 icons; kept as documented fallback.
- **Do nothing / defer whole spec:** cheapest; leaves every future feature
  to invent styling — rejected; this is the right time while surface is tiny.

---

*End of review.*
