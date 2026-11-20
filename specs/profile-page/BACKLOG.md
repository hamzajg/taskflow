# Backlog: profile-page

Items are USER STORIES in the parseable format below — keep the heading
shape `## US<n> — <story>` and the field lines intact so `wave_plan` can
parse them. Write the story as: "As a <role>, I want <goal>, so that
<value>" — the title after the dash IS the story.

## US1 — As a user, I want profile editing on its own page, so that account settings are easy to find and link to
- Scenarios: @w1
- Size: S
- Notes: New ProfilePage (/profile) reusing ProfileForm; AccountPage drops the profile card and its #profile anchor, PageHeader becomes "Workspaces"; sidebar Profile → /profile, Workspaces → /account (hash anchors removed + dead NavEntry.hash/end={!item.hash} logic deleted); migrate ALL of: shell.test.tsx (profile assertions + every 'Welcome, Demo' sentinel), projects.test.tsx ('Welcome, Demo' sentinel), landing.test.tsx (#profile element + href assertions — rewrite the whole its), decomposition.test.ts (repoint ProfileForm assertion AccountPage→ProfilePage). workspace-pane/default-workspace tests unaffected (workspace UI only).

## US2 — As a user with old bookmarks, I want my links to keep working, so that nothing breaks silently
- Scenarios: @w2
- Depends: US1
- Size: S
- Notes: Render-time AccountRoute wrapper in App.tsx — hash==='#profile' → <Navigate to="/profile" replace> (NO useEffect: post-paint flash); #workspaces anchor preserved via kept id; both-theme evidence of /profile + /account.
