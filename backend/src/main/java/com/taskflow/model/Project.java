package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "projects")
public class Project extends PanacheEntity {

    @Column(name = "workspace_id", nullable = false)
    public Long workspaceId;

    @Column(nullable = false)
    public String name;

    @Column(columnDefinition = "text")
    public String description;

    @Column(length = 20)
    public String color;

    @Column(name = "created_by", nullable = false)
    public Long createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();
}
