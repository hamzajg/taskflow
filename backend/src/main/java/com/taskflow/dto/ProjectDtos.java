package com.taskflow.dto;

import com.taskflow.model.Project;
import com.taskflow.model.Task;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class ProjectDtos {

    private ProjectDtos() {
    }

    public record ProjectDto(
            Long id,
            Long workspaceId,
            String name,
            String description,
            String color,
            long taskCount,
            Instant createdAt) {
        public static ProjectDto of(Project p, long taskCount) {
            return new ProjectDto(p.id, p.workspaceId, p.name, p.description, p.color,
                    taskCount, p.createdAt);
        }
    }

    public record TaskDto(
            Long id,
            Long projectId,
            String title,
            String description,
            String status,
            String priority,
            Long assigneeId,
            String assigneeName,
            LocalDate dueDate,
            int position,
            Instant createdAt) {
        public static TaskDto of(Task t, String assigneeName) {
            return new TaskDto(t.id, t.projectId, t.title, t.description, t.status,
                    t.priority, t.assigneeId, assigneeName, t.dueDate, t.position, t.createdAt);
        }
    }

    /** Response for PATCH /tasks/{id}/move: the moved task plus its column order. */
    public record MoveResult(TaskDto task, List<TaskDto> column) {
    }
}
