package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "time_entries")
public class TimeEntry extends PanacheEntity {

    public static final int MAX_DESCRIPTION_LENGTH = 500;
    public static final int MAX_MANUAL_MINUTES = 1440;

    @Column(name = "task_id", nullable = false)
    public Long taskId;

    /** Denormalized from the task — the composite FK keeps them equal. */
    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(name = "user_id", nullable = false)
    public Long userId;

    @Column(name = "entry_date", nullable = false)
    public LocalDate entryDate;

    /** Canonical unit; NULL only while a timer is running. */
    @Column
    public Integer minutes;

    @Column(name = "started_at")
    public Instant startedAt;

    @Column(name = "ended_at")
    public Instant endedAt;

    @Column(length = MAX_DESCRIPTION_LENGTH)
    public String description;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    public boolean isRunning() {
        return startedAt != null && endedAt == null;
    }
}
