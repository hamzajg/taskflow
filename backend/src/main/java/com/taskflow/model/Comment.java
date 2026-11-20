package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "comments")
public class Comment extends PanacheEntity {

    @Column(name = "task_id", nullable = false)
    public Long taskId;

    /** Denormalized from the task — the composite FK keeps them equal. */
    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(name = "author_id", nullable = false)
    public Long authorId;

    @Column(nullable = false, columnDefinition = "text")
    public String body;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();
}
