package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "tags")
public class Tag extends PanacheEntity {

    public static final int MAX_TITLE_LENGTH = 50;
    public static final int MAX_COLOR_LENGTH = 20;

    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    public String title;

    @Column(length = MAX_COLOR_LENGTH)
    public String color;

    @Column(name = "created_by", nullable = false)
    public Long createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();
}
