# Backlog: default-workspace

Items are USER STORIES in the parseable format below — keep the heading
shape `## US<n> — <story>` and the field lines intact so `wave_plan` can
parse them. Write the story as: "As a <role>, I want <goal>, so that
<value>" — the title after the dash IS the story.

## US1 — As a new user, I want a workspace waiting for me at first login, so that I can start working without setup
- Scenarios: @w1
- Size: S
- Notes: Lazy provisioning inside login via a new DefaultWorkspaceService bean (avoids AuthService↔WorkspaceService CDI cycle, bypasses requireVerified per D2/D5); user-row pessimistic lock for concurrency; name = "<firstName>'s Workspace" else "My Workspace", truncated to ≤255 chars. Existing tests asserting hasSize(1)/$[0] after registerVerifyLogin+create WILL break — update them to account for the auto-provisioned workspace.

## US2 — As a new user, I want the app to already feel like mine, so that first-run feels intuitive
- Scenarios: @w2
- Depends: US1
- Size: S
- Notes: Small AppShell change required — auto-setActiveWorkspaceId when exactly one workspace loads so the sidebar switcher shows it (page-level fallbacks already exist); add tests proving dashboard/account/sidebar render the provisioned workspace with no selection action; both-theme evidence of the first-login state.
