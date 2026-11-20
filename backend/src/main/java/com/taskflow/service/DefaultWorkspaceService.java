package com.taskflow.service;

import com.taskflow.model.User;
import com.taskflow.model.Workspace;
import com.taskflow.model.WorkspaceMember;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;

/**
 * Provisions a default workspace for users with zero memberships.
 * Called from {@link AuthService#login} so every real session guarantees
 * the "every user has at least one workspace" invariant (spec
 * default-workspace D1/D2/D5).
 */
@ApplicationScoped
public class DefaultWorkspaceService {

    private static final int NAME_MAX = 255;
    private static final String SUFFIX = "'s Workspace";

    /** Visible for tests: naming rule, blank-safe and length-safe. */
    public static String defaultName(User user) {
        String first = user.firstName == null ? "" : user.firstName.trim();
        if (first.isEmpty()) {
            return "My Workspace";
        }
        int maxFirst = NAME_MAX - SUFFIX.length();
        if (first.length() > maxFirst) {
            first = first.substring(0, maxFirst);
        }
        return first + SUFFIX;
    }

    /**
     * Create a default workspace for {@code user} iff they have no
     * memberships. The user row is pessimistically locked so concurrent
     * first-logins serialize instead of double-provisioning.
     */
    @Transactional
    public void ensureFor(User user) {
        User locked = User.getEntityManager()
                .find(User.class, user.id, LockModeType.PESSIMISTIC_WRITE);
        if (WorkspaceMember.count("userId", locked.id) > 0) {
            return;
        }
        Workspace ws = new Workspace();
        ws.name = defaultName(locked);
        ws.ownerId = locked.id;
        ws.persist();
        WorkspaceMember m = new WorkspaceMember();
        m.workspaceId = ws.id;
        m.userId = locked.id;
        m.role = WorkspaceMember.ROLE_OWNER;
        m.persist();
    }
}
