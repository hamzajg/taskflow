package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "tasks")
public class Task extends PanacheEntity {

    public static final String STATUS_BACKLOG = "backlog";
    public static final String STATUS_TODO = "todo";
    public static final String STATUS_IN_PROGRESS = "in_progress";
    public static final String STATUS_DONE = "done";
    public static final Set<String> STATUSES = Set.of(
            STATUS_BACKLOG, STATUS_TODO, STATUS_IN_PROGRESS, STATUS_DONE);

    public static final String PRIORITY_LOW = "low";
    public static final String PRIORITY_MEDIUM = "medium";
    public static final String PRIORITY_HIGH = "high";
    public static final String PRIORITY_URGENT = "urgent";
    public static final Set<String> PRIORITIES = Set.of(
            PRIORITY_LOW, PRIORITY_MEDIUM, PRIORITY_HIGH, PRIORITY_URGENT);

    public static final List<String> STATUS_ORDER = List.of(
            STATUS_BACKLOG, STATUS_TODO, STATUS_IN_PROGRESS, STATUS_DONE);

    @Column(name = "project_id", nullable = false)
    public Long projectId;

    /** Denormalized from the project — the composite FK keeps them equal. */
    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(nullable = false)
    public String title;

    @Column(columnDefinition = "text")
    public String description;

    @Column(nullable = false, length = 20)
    public String status = STATUS_TODO;

    @Column(nullable = false, length = 20)
    public String priority = PRIORITY_MEDIUM;

    @Column(name = "assignee_id")
    public Long assigneeId;

    @Column(name = "due_date")
    public LocalDate dueDate;

    @Column(nullable = false)
    public int position = 0;

    @Column(name = "created_by", nullable = false)
    public Long createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    public static Map<Long, Long> countGroupedByProject(Collection<Long> projectIds) {
        if (projectIds.isEmpty()) {
            return Map.of();
        }
        @SuppressWarnings("unchecked")
        List<Object[]> rows = getEntityManager().createQuery(
                        "select projectId, count(id) from Task where projectId in ?1 group by projectId")
                .setParameter(1, projectIds)
                .getResultList();
        Map<Long, Long> counts = new java.util.HashMap<>();
        for (Object[] row : rows) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }
}
