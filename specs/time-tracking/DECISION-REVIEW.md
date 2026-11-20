# Decision Review — time-tracking (D1–D5)

Reviewed by decision-challenger subagent, 2026-11-20. Verdict: **REVISE** —
D1/D2/D4/D5 confirmed sound; D3 redesigned after a real reachability flaw.
All findings folded into SPEC.md / EXAMPLES.feature.

| Decision | Verdict | Notes |
|---|---|---|
| D1 composite-FK tenancy | SOUND | Third use of the proven pattern (tasks→projects, comments→tasks, project_tags). |
| D2 minutes canonical | SOUND | Avoids legacy's dual standard/flexible representation; NULL minutes for running rows ignored by SUM. |
| D3 one timer per user | REVISED | Was per-workspace — challenger showed a timer on task A is unreachable from task B's UI. Now **global per user** + `GET /time-entries/running` discovery + user-scoped stop + 409 race mapping. |
| D4 author edit, admin delete | SOUND (extended) | PATCH (comment convention); running-entry mutations 409; admin may delete running entries; timer rounding/cap/entry_date rules specified. |
| D5 task-detail Time card + totalMinutes | SOUND | totalMinutes now specified on every TaskDto path via grouped SUM. |

## Findings and resolutions

1. **[concern] Timer stop unreachable across tasks** — workspace-scoped
   uniqueness + task-scoped stop = dead end. Resolved: global per-user
   uniqueness, `POST /time-entries/timer/stop` (user-scoped),
   `GET /time-entries/running` for discovery; new @w1 scenario.
2. **[concern] Start race → 500** — unique-index violation now explicitly
   mapped to 409 with running entry's task id.
3. **[concern] Stop idempotency / running-entry mutations unspecified** —
   second stop → 409; PATCH/DELETE on running entry → 409 (author) /
   allowed (admin delete frees slot).
4. **[concern] Timer math undefined** — nearest minute, min 1; 1440 cap is
   manual-only; entry_date = start date, server local.
5. **[nit] PUT vs PATCH** — switched to PATCH (comment convention).
6. **[nit] Timezone** — server local date documented for entry_date and
   future-check.
7. **[nit] requireVerified** — now explicit for all writes.
8. **[nit] totalMinutes ripple** — specified on all TaskDto paths; SUM
   ignores NULL minutes.

## Alternatives recorded

- Auto-stop on second start: rejected (silent mutation) — 409 chosen.
- Per-workspace uniqueness: rejected (unreachable stop) — global chosen.
- Store only start/end: rejected — minutes column keeps totals simple.
- Manual entries only (no timer): rejected — legacy parity + core outcome.

REVISIT TRIGGER: multi-workspace simultaneous timers become a real user
need, or a dedicated timesheet/report view is requested.
