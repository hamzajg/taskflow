package com.taskflow.service;

import com.taskflow.dto.AuthDtos.InviteDto;
import com.taskflow.dto.AuthDtos.MemberDto;
import com.taskflow.dto.AuthDtos.WorkspaceDto;
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

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class WorkspaceService {

    private static final SecureRandom RANDOM = new SecureRandom();

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
        return WorkspaceMember.<WorkspaceMember>list("userId", user.id).stream()
                .map(m -> {
                    Workspace ws = Workspace.findById(m.workspaceId);
                    return ws == null ? null : toDto(ws, m.role);
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
        Membership mb = requireMembership(workspaceId, user.id);
        return WorkspaceMember.<WorkspaceMember>list("workspaceId", workspaceId).stream()
                .map(m -> {
                    User u = User.findById(m.userId);
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
        if (mb.member().role.equals(WorkspaceMember.ROLE_MEMBER)
                && !mb.member().userId.equals(targetUserId)) {
            throw new WebApplicationException("Insufficient role", Response.Status.FORBIDDEN);
        }
        WorkspaceMember target = WorkspaceMember.find("workspaceId = ?1 and userId = ?2",
                workspaceId, targetUserId).firstResult();
        if (target == null) {
            throw new WebApplicationException("Member not found", Response.Status.NOT_FOUND);
        }
        if (target.role.equals(WorkspaceMember.ROLE_OWNER)) {
            throw new WebApplicationException("Cannot remove the owner", Response.Status.CONFLICT);
        }
        target.delete();
    }

    @Transactional
    public InviteDto invite(User user, Long workspaceId, String email, String role) {
        Membership mb = requireMembership(workspaceId, user.id);
        requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        String normalized = email.toLowerCase();
        User invitee = User.find("lower(email) = ?1", normalized).firstResult();
        boolean alreadyMember = invitee != null && WorkspaceMember.count(
                "workspaceId = ?1 and userId = ?2", workspaceId, invitee.id) > 0;
        if (alreadyMember) {
            throw new WebApplicationException("User is already a member", Response.Status.CONFLICT);
        }
        WorkspaceInvite invite = new WorkspaceInvite();
        invite.workspaceId = workspaceId;
        invite.email = normalized;
        invite.role = role == null ? WorkspaceMember.ROLE_MEMBER : role;
        invite.token = newToken();
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
            m.role = invite.role;
            m.persist();
        }
        Workspace ws = Workspace.findById(invite.workspaceId);
        return toDto(ws, m.role);
    }

    private WorkspaceDto toDto(Workspace ws, String role) {
        long count = WorkspaceMember.count("workspaceId", ws.id);
        return new WorkspaceDto(ws.id, ws.name, role, count);
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) + "-" + UUID.randomUUID();
    }
}
