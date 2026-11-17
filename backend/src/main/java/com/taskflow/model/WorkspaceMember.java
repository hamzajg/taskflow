package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "workspace_members", uniqueConstraints = @UniqueConstraint(columnNames = {"workspace_id", "user_id"}))
public class WorkspaceMember extends PanacheEntity {

    public static final String ROLE_OWNER = "owner";
    public static final String ROLE_ADMIN = "admin";
    public static final String ROLE_MEMBER = "member";

    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(name = "user_id", nullable = false)
    public Long userId;

    @Column(nullable = false)
    public String role = ROLE_MEMBER;

    @Column(name = "joined_at", nullable = false)
    public Instant joinedAt = Instant.now();
}
