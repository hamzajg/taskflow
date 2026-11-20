# Waves — profile-page

Each wave IS an iteration: a time-boxed, independently shippable
increment — one branch, one PR, green tests, demoable outcome.
Do not start wave N+1 until wave N merges.

## Wave 1 — iteration 1

Scenarios proven by this wave:
- Profile page renders the profile form
- Profile page has a dedicated title
- Account page shows no profile card
- Account page keeps workspace management
- Sidebar links to profile and workspaces routes
- Saving profile from the dedicated page updates the shell user

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US1 | As a user, I want profile editing on its own page, so that account settings are easy to find and link to | S | — | New ProfilePage (/profile) reusing ProfileForm; AccountPage drops the profile card and its #profile anchor, PageHeader becomes "Workspaces"; sidebar Profile → /profile, Workspaces → /account (hash anchors removed + dead NavEntry.hash/end={!item.hash} logic deleted); migrate ALL of: shell.test.tsx (profile assertions + every 'Welcome, Demo' sentinel), projects.test.tsx ('Welcome, Demo' sentinel), landing.test.tsx (#profile element + href assertions — rewrite the whole its), decomposition.test.ts (repoint ProfileForm assertion AccountPage→ProfilePage). workspace-pane/default-workspace tests unaffected (workspace UI only). |

## Wave 2 — iteration 2

Scenarios proven by this wave:
- Legacy account profile anchor redirects to profile page
- Account workspaces anchor still lands on the section

| Item | Title | Size | Deps | Notes |
|------|-------|------|------|-------|
| US2 | As a user with old bookmarks, I want my links to keep working, so that nothing breaks silently | S | US1 | Render-time AccountRoute wrapper in App.tsx — hash==='#profile' → <Navigate to="/profile" replace> (NO useEffect: post-paint flash); #workspaces anchor preserved via kept id; both-theme evidence of /profile + /account. |
