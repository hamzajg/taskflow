# Validation — profile-page

## Traceability

| AC | Criterion | Scenarios | Wave(s) | Test evidence |
|----|-----------|-----------|---------|---------------|
| 1 | `/profile` is a dedicated page with its own header and the… | Account page keeps workspace management, Account page shows no profile card, Profile page has a dedicated title, Profile page renders the profile form, Saving profile from the dedicated page updates the shell user, Sidebar links to profile and workspaces routes | 1 | profile-page.test.tsx |
| 2 | `/account` contains only workspace administration | Account page keeps workspace management, Account page shows no profile card, Profile page has a dedicated title, Profile page renders the profile form, Saving profile from the dedicated page updates the shell user, Sidebar links to profile and workspaces routes | 1 | profile-page.test.tsx |
| 3 | Sidebar links are real routes, not hash anchors | Account page keeps workspace management, Account page shows no profile card, Profile page has a dedicated title, Profile page renders the profile form, Saving profile from the dedicated page updates the shell user, Sidebar links to profile and workspaces routes | 1 | profile-page.test.tsx |
| 4 | Legacy hash links keep working | Account workspaces anchor still lands on the section, Legacy account profile anchor redirects to profile page | 2 | profile-page-redirect.test.tsx |

## Scenario coverage

- Scenarios: 8 total, 8 with detected test evidence, 0 without
- ✓ `Profile page renders the profile form` (@w1)
- ✓ `Profile page has a dedicated title` (@w1)
- ✓ `Account page shows no profile card` (@w1)
- ✓ `Account page keeps workspace management` (@w1)
- ✓ `Sidebar links to profile and workspaces routes` (@w1)
- ✓ `Saving profile from the dedicated page updates the shell user` (@w1)
- ✓ `Legacy account profile anchor redirects to profile page` (@w2)
- ✓ `Account workspaces anchor still lands on the section` (@w2)

## Demo script (manual walkthrough)

1. **Profile page renders the profile form** — run the app, perform the scenario, observe the outcome.
2. **Legacy account profile anchor redirects to profile page** — run the app, perform the scenario, observe the outcome.

## Gaps

- none — spec is fully traced

Note: 'no evidence' means neither the scenario name nor a
token match was found in test files — verify by hand before
treating it as a real gap. '~' marks weak token-match evidence.

## Outcome follow-up

Optional; this is a post-release learning record, not a finish gate.
- Status: not yet measured
- Owner and review date: (record when known)
- Signal and observed result: (record after release; do not invent)
- Learning or next action: (record after review)