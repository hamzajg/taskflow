package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "workspace_invites")
public class WorkspaceInvite extends PanacheEntity {

    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(nullable = false)
    public String email;

    @Column(nullable = false)
    public String role = WorkspaceMember.ROLE_MEMBER;

    @Column(nullable = false, unique = true)
    public String token;

    @Column(name = "invited_by", nullable = false)
    public Long invitedBy;

    @Column(name = "expires_at", nullable = false)
    public Instant expiresAt;

    @Column(name = "accepted_at")
    public Instant acceptedAt;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
