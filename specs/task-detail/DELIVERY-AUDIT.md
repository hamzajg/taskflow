# Delivery audit — task-detail
AUDIT: PASS
PHASE: delivery
BLOCKERS: none
CONCERNS: none
UNVERIFIED: none
EVIDENCE:

Commands run (real results):
- `cd backend && JAVA_HOME=/home/kali/factory/.jdk/jdk-17.0.21+9 mvn -q test -Dquarkus.http.test-port=18099` → exit 0; surefire reports: AuthResourceTest 7/7, CommentResourceTest 8/8, ProjectTaskResourceTest 9/9, WorkspaceResourceTest 12/12 = **36 tests, 0 failures** (verified in `backend/target/surefire-reports/*.txt`; Flyway validated 4 migrations incl. V4).
- `cd frontend && npx vitest run` → **35/35 tests pass** (5 files; task-detail.test.tsx 8/8).
- `cd frontend && npm run build` → tsc + vite build clean, dist emitted.

Files read in full:
- SPEC.md (10 acceptance criteria, D1–D5), EXAMPLES.feature (12 scenarios @w1/@w2/@w3)
- Backend: `model/Comment.java`, `service/CommentService.java`, `resource/CommentResource.java`, `resource/CommentItemResource.java`, `dto/CommentDtos.java`, `db/migration/V4__comments.sql`, `test/.../CommentResourceTest.java`
- Frontend: `pages/TaskDetailPage.tsx`, `__tests__/task-detail.test.tsx`, `pages/projectTypes.ts`, `App.tsx`, entry-point links in `ProjectDetailPage.tsx` (L372) and `BoardView.tsx` (L143), `styles.css` task-detail block + global `:focus-visible` rules
- AuthZ chain: `WorkspaceService.requireMembership/requireRole/requireVerified` (L39–65), `ProjectService.requireProject` (L31–38), V3 migration FK pattern

Verification notes per audit checklist:
- **Tenancy/authZ**: every comment op resolves task → project → `requireMembership` (403 for non-members, 404 for missing task/comment); `requireComment` re-checks tenancy before author/moderation checks — no data leak path. Author-only edit enforced in `CommentService.update` (L125–128); delete allows author or owner/admin via `requireRole` (L137–142). Verified-email enforced via `currentUser()` in both resources.
- **Composite FK**: V4 adds `uq_tasks_id_workspace` on tasks then `FOREIGN KEY (task_id, workspace_id) REFERENCES tasks(id, workspace_id) ON DELETE CASCADE` — workspace_id provably equals the task's workspace (which itself equals the project's via V3 FK), so moderation on `c.workspaceId` is sound; task delete cascades comments (test `task_delete_cascades_comments` proves it). Index `(task_id, created_at, id)` and sequence `INCREMENT BY 50` match spec D1/V3 pattern.
- **Contract match**: backend `CommentDto(id, taskId, authorId, authorName, body, createdAt, updatedAt)` + `CommentListDto(comments, hasMore)` match frontend `CommentDto`/`CommentList` in `projectTypes.ts` field-for-field; POST returns 201, PATCH returns updated DTO, DELETE 204 — all consumed correctly by `api.post/patch/delete`.
- **OpenAPI**: `@Tag("Comments")` + `@Operation` on all endpoints in both resources — D5 satisfied.
- **Body validation**: blank/null → 400, >5000 chars → 400, verified for all three cases in `invalid_comment_body_rejected`; `body.trim()` on write.
- **Ordering/window**: `createdAt desc, id desc` + reverse → chronological asc with id tiebreak; newest-200 window with `hasMore = total > newest.size()` — honest truncation signal; frontend renders "Showing the most recent comments" when `hasMore`. (The >200 path is not exercised by a test — logic verified by inspection; no acceptance criterion requires it.)
- **Scenario coverage**: each @w1 security/happy-path scenario maps to a named backend test that asserts the actual behavior (403s, unchanged body, admin edit-403 + delete-204, cascade). @w2/@w3 frontend tests assert rendered fields, project link href, chronological DOM order, post/edit/delete flows, empty state, loading `role="status"`, error alert + working retry, labelled controls, author-only action buttons.
- **No TODO/FIXME** in product code (only `STATUS_TODO` enum constant); no secrets (test password `secret123` is a fixture); plain-text bodies rendered via React text nodes / `white-space: pre-wrap` — XSS-safe per D3.
- **Minor non-blocking observations**: `requireComment` does not null-check the re-fetched `Task` (unreachable — cascade guarantees existence); UI does not surface admin-moderation delete on others' comments (spec scopes moderation to the API; not required in UI).
