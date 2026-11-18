package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    /** Member counts for many workspaces in one grouped query. */
    @SuppressWarnings("unchecked")
    public static Map<Long, Long> countGroupedByWorkspace(Collection<Long> workspaceIds) {
        List<Object[]> rows = getEntityManager()
                .createQuery("select m.workspaceId, count(m) from WorkspaceMember m "
                        + "where m.workspaceId in :ids group by m.workspaceId", Object[].class)
                .setParameter("ids", workspaceIds)
                .getResultList();
        return rows.stream().collect(Collectors.toMap(
                r -> (Long) r[0], r -> (Long) r[1]));
    }
}
