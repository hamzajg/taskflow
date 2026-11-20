package com.taskflow.service;

import com.taskflow.dto.AuthDtos.InviteDto;
import com.taskflow.dto.AuthDtos.MemberDto;
import com.taskflow.dto.AuthDtos.WorkspaceDto;
import com.taskflow.dto.AuthDtos.WorkspaceSummaryDto;
import com.taskflow.model.Project;
import com.taskflow.model.Task;
import com.taskflow.model.TimeEntry;
import com.taskflow.model.User;
import com.taskflow.model.Workspace;
import com.taskflow.model.WorkspaceInvite;
import com.taskflow.model.WorkspaceMember;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class WorkspaceService {

    @Inject
    AuthService authService;

    @Inject
    io.quarkus.mailer.Mailer mailer;

    @ConfigProperty(name = "app.base-url", defaultValue = "http://localhost:8080")
    String baseUrl;

    public record Membership(Workspace workspace, WorkspaceMember member) {
    }

    /** Resolve the caller's membership in a workspace or fail. */
    public Membership requireMembership(Long workspaceId, Long userId) {
        Workspace ws = Workspace.findById(workspaceId);
        if (ws == null) {
            throw new WebApplicationException("Workspace not found", Response.Status.NOT_FOUND);
        }
        WorkspaceMember m = WorkspaceMember.find("workspaceId = ?1 and userId = ?2", workspaceId, userId)
                .firstResult();
        if (m == null) {
            throw new WebApplicationException("Not a member of this workspace", Response.Status.FORBIDDEN);
        }
        return new Membership(ws, m);
    }

    /**
     * Dashboard aggregate for one workspace (home-landing D2).
     * All task predicates are scoped to tasks.workspace_id; "open" means
     * status != 'done'. due_date NULL never matches either window.
     */
    public WorkspaceSummaryDto summary(User user, Long workspaceId) {
        requireMembership(workspaceId, user.id);
        requireVerified(user);

        long projectCount = Project.count("workspaceId", workspaceId);
        long memberCount = WorkspaceMember.count("workspaceId", workspaceId);

        Map<String, Long> byStatus = new HashMap<>();
        for (String s : Task.STATUS_ORDER) {
            byStatus.put(s, 0L);
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rows = Task.getEntityManager().createQuery(
                        "select status, count(id) from Task where workspaceId = ?1 group by status")
                .setParameter(1, workspaceId)
                .getResultList();
        for (Object[] row : rows) {
            byStatus.put((String) row[0], (Long) row[1]);
        }

        LocalDate today = LocalDate.now();
        long overdue = Task.count(
                "workspaceId = ?1 and status <> ?2 and dueDate is not null and dueDate < ?3",
                workspaceId, Task.STATUS_DONE, today);
        long dueSoon = Task.count(
                "workspaceId = ?1 and status <> ?2 and dueDate >= ?3 and dueDate <= ?4",
                workspaceId, Task.STATUS_DONE, today, today.plusDays(7));
        long myOpen = Task.count(
                "workspaceId = ?1 and assigneeId = ?2 and status <> ?3",
                workspaceId, user.id, Task.STATUS_DONE);

        // SUM ignores NULL minutes, so running timers contribute 0.
        Long minutes = TimeEntry.getEntityManager().createQuery(
                        "select coalesce(sum(minutes), 0) from TimeEntry where workspaceId = ?1",
                        Long.class)
                .setParameter(1, workspaceId)
                .getSingleResult();

        return new WorkspaceSummaryDto(projectCount, memberCount, byStatus,
                overdue, dueSoon, myOpen, minutes);
    }

    public void requireVerified(User user) {
        if (!user.isVerified()) {
            throw new WebApplicationException("Email verification required", Response.Status.FORBIDDEN);
        }
    }

    public void requireRole(Membership membership, String... allowed) {
        for (String role : allowed) {
            if (membership.member().role.equals(role)) {
                return;
            }
        }
        throw new WebApplicationException("Insufficient role", Response.Status.FORBIDDEN);
    }

    @Transactional
    public WorkspaceDto create(User user, String name) {
        requireVerified(user);
        Workspace ws = new Workspace();
        ws.name = name.trim();
        ws.ownerId = user.id;
        ws.persist();
        WorkspaceMember m = new WorkspaceMember();
        m.workspaceId = ws.id;
        m.userId = user.id;
        m.role = WorkspaceMember.ROLE_OWNER;
        m.persist();
        return toDto(ws, m.role);
    }

    public List<WorkspaceDto> listFor(User user) {
        List<WorkspaceMember> memberships = WorkspaceMember.list("userId", user.id);
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<Long> wsIds = memberships.stream().map(m -> m.workspaceId).toList();
        Map<Long, Workspace> workspaces = Workspace.<Workspace>list("id in ?1", wsIds).stream()
                .collect(Collectors.toMap(w -> w.id, w -> w));
        Map<Long, Long> counts = WorkspaceMember.countGroupedByWorkspace(wsIds);
        return memberships.stream()
                .map(m -> {
                    Workspace ws = workspaces.get(m.workspaceId);
                    return ws == null ? null
                            : new WorkspaceDto(ws.id, ws.name, m.role, counts.getOrDefault(ws.id, 0L));
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional
    public WorkspaceDto rename(User user, Long workspaceId, String name) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        mb.workspace().name = name.trim();
        mb.workspace().updatedAt = Instant.now();
        return toDto(mb.workspace(), mb.member().role);
    }

    @Transactional
    public void delete(User user, Long workspaceId) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER);
        WorkspaceMember.delete("workspaceId", workspaceId);
        WorkspaceInvite.delete("workspaceId", workspaceId);
        Workspace.deleteById(workspaceId);
    }

    public List<MemberDto> members(User user, Long workspaceId) {
        requireMembership(workspaceId, user.id);
        List<WorkspaceMember> rows = WorkspaceMember.list("workspaceId", workspaceId);
        List<Long> userIds = rows.stream().map(m -> m.userId).toList();
        Map<Long, User> users = userIds.isEmpty() ? Map.of()
                : User.<User>list("id in ?1", userIds).stream()
                        .collect(Collectors.toMap(u -> u.id, u -> u));
        return rows.stream()
                .map(m -> {
                    User u = users.get(m.userId);
                    return u == null ? null
                            : new MemberDto(u.id, u.displayName(), u.email, m.role);
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional
    public void removeMember(User user, Long workspaceId, Long targetUserId) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        WorkspaceMember target = WorkspaceMember.find("workspaceId = ?1 and userId = ?2",
                workspaceId, targetUserId).firstResult();
        if (target == null) {
            throw new WebApplicationException("Member not found", Response.Status.NOT_FOUND);
        }
        if (target.role.equals(WorkspaceMember.ROLE_OWNER)) {
            throw new WebApplicationException("Cannot remove the owner", Response.Status.CONFLICT);
        }
        if (target.role.equals(WorkspaceMember.ROLE_ADMIN)
                && !mb.member().role.equals(WorkspaceMember.ROLE_OWNER)) {
            throw new WebApplicationException("Only the owner can remove an admin", Response.Status.FORBIDDEN);
        }
        target.delete();
    }

    @Transactional
    public InviteDto invite(User user, Long workspaceId, String email, String role) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        String normalized = email.toLowerCase();
        String inviteRole = sanitizeRole(role);
        if (inviteRole == null) {
            throw new WebApplicationException("Invalid role", Response.Status.BAD_REQUEST);
        }
        if (WorkspaceMember.ROLE_ADMIN.equals(inviteRole)
                && !mb.member().role.equals(WorkspaceMember.ROLE_OWNER)) {
            throw new WebApplicationException("Only the owner can grant the admin role", Response.Status.FORBIDDEN);
        }
        User invitee = User.findByEmail(normalized);
        boolean alreadyMember = invitee != null && WorkspaceMember.count(
                "workspaceId = ?1 and userId = ?2", workspaceId, invitee.id) > 0;
        if (alreadyMember) {
            throw new WebApplicationException("User is already a member", Response.Status.CONFLICT);
        }
        WorkspaceInvite invite = new WorkspaceInvite();
        invite.workspaceId = workspaceId;
        invite.email = normalized;
        invite.role = inviteRole;
        invite.token = Tokens.newToken();
        invite.invitedBy = user.id;
        invite.expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);
        invite.persist();
        try {
            mailer.send(io.quarkus.mailer.Mail.withText(normalized,
                    "You've been invited to a TaskFlow workspace",
                    "Accept your invitation:\n\n" + baseUrl + "/invites/accept?token=" + invite.token
                            + "\n\nThis link expires in 7 days."));
        } catch (Exception e) {
            org.jboss.logging.Logger.getLogger(WorkspaceService.class)
                    .warnf(e, "Invite email to %s failed; token=%s", normalized, invite.token);
        }
        return new InviteDto(invite.id, invite.email, invite.role, invite.token);
    }

    public List<InviteDto> pendingInvites(User user, Long workspaceId) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        return WorkspaceInvite.<WorkspaceInvite>list(
                "workspaceId = ?1 and acceptedAt is null and expiresAt > ?2 order by id",
                workspaceId, Instant.now()).stream()
                .map(i -> new InviteDto(i.id, i.email, i.role, i.token))
                .toList();
    }

    @Transactional
    public void revokeInvite(User user, Long workspaceId, Long inviteId) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        WorkspaceInvite invite = WorkspaceInvite.findById(inviteId);
        if (invite == null || !invite.workspaceId.equals(workspaceId)) {
            throw new WebApplicationException("Invite not found", Response.Status.NOT_FOUND);
        }
        invite.delete();
    }

    @Transactional
    public WorkspaceDto acceptInvite(User user, String token) {
        WorkspaceInvite invite = WorkspaceInvite.find("token", token).firstResult();
        if (invite == null || invite.acceptedAt != null || invite.expiresAt.isBefore(Instant.now())) {
            throw new WebApplicationException("Invalid or expired invite", Response.Status.BAD_REQUEST);
        }
        if (!invite.email.equalsIgnoreCase(user.email)) {
            throw new WebApplicationException("This invite is for a different email", Response.Status.FORBIDDEN);
        }
        invite.acceptedAt = Instant.now();
        WorkspaceMember m = WorkspaceMember.find("workspaceId = ?1 and userId = ?2",
                invite.workspaceId, user.id).firstResult();
        if (m == null) {
            m = new WorkspaceMember();
            m.workspaceId = invite.workspaceId;
            m.userId = user.id;
            String acceptedRole = sanitizeRole(invite.role);
            m.role = acceptedRole == null ? WorkspaceMember.ROLE_MEMBER : acceptedRole;
            m.persist();
        }
        Workspace ws = Workspace.findById(invite.workspaceId);
        return toDto(ws, m.role);
    }

    /** DTO for an already-resolved membership (used by the GET endpoint). */
    public WorkspaceDto dtoFor(Membership mb) {
        return toDto(mb.workspace(), mb.member().role);
    }

    private WorkspaceDto toDto(Workspace ws, String role) {
        long count = WorkspaceMember.count("workspaceId", ws.id);
        return new WorkspaceDto(ws.id, ws.name, role, count);
    }


    /** Returns the canonical role, or null when the value is not assignable via invite. */
    private static String sanitizeRole(String role) {
        if (role == null || role.isBlank()) {
            return WorkspaceMember.ROLE_MEMBER;
        }
        String normalized = role.trim().toLowerCase();
        return switch (normalized) {
            case WorkspaceMember.ROLE_MEMBER, WorkspaceMember.ROLE_ADMIN -> normalized;
            default -> null;
        };
    }
}
