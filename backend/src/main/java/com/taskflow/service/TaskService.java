package com.taskflow.service;

import com.taskflow.dto.ProjectDtos.MoveResult;
import com.taskflow.dto.ProjectDtos.TaskDto;
import com.taskflow.model.Project;
import com.taskflow.model.Task;
import com.taskflow.model.User;
import com.taskflow.model.WorkspaceMember;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.LockModeType;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.taskflow.service.ProjectService.ProjectRef;

@ApplicationScoped
public class TaskService {

    @Inject
    ProjectService projectService;

    @Inject
    WorkspaceService workspaceService;

    private static WebApplicationException badRequest(String msg) {
        return new WebApplicationException(msg, Response.Status.BAD_REQUEST);
    }

    private static void requireStatus(String status) {
        if (status != null && !Task.STATUSES.contains(status)) {
            throw badRequest("Invalid status: " + status);
        }
    }

    private static void requirePriority(String priority) {
        if (priority != null && !Task.PRIORITIES.contains(priority)) {
            throw badRequest("Invalid priority: " + priority);
        }
    }

    /** Assignee must be a member of the task's workspace (or null). */
    private void requireAssignee(Long workspaceId, Long assigneeId) {
        if (assigneeId == null) {
            return;
        }
        boolean member = WorkspaceMember.count("workspaceId = ?1 and userId = ?2", workspaceId, assigneeId) > 0;
        if (!member) {
            throw badRequest("Assignee is not a member of this workspace");
        }
    }

    private ProjectRef requireTaskProject(Long taskId, Long userId) {
        Task t = Task.findById(taskId);
        if (t == null) {
            throw new WebApplicationException("Task not found", Response.Status.NOT_FOUND);
        }
        return projectService.requireProject(t.projectId, userId);
    }

    private List<TaskDto> columnDtos(Long projectId, String status) {
        List<Task> tasks = Task.list("projectId = ?1 and status = ?2 order by position", projectId, status);
        return toDtos(tasks);
    }

    private List<TaskDto> toDtos(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return List.of();
        }
        List<Long> userIds = tasks.stream()
                .map(t -> t.assigneeId).filter(java.util.Objects::nonNull).distinct().toList();
        Map<Long, String> names = new HashMap<>();
        if (!userIds.isEmpty()) {
            for (User u : User.<User>list("id in ?1", userIds)) {
                names.put(u.id, u.displayName());
            }
        }
        return tasks.stream()
                .map(t -> TaskDto.of(t, t.assigneeId == null ? null : names.get(t.assigneeId)))
                .toList();
    }

    public TaskDto get(User user, Long taskId) {
        requireTaskProject(taskId, user.id);
        Task t = Task.findById(taskId);
        return toDtos(List.of(t)).get(0);
    }

    public List<TaskDto> listForProject(User user, Long projectId) {
        projectService.requireProject(projectId, user.id);
        return toDtos(Task.list("projectId = ?1 order by status, position", projectId));
    }

    @Transactional
    public TaskDto create(User user, Long projectId, String title, String description,
                          String status, String priority, Long assigneeId, LocalDate dueDate) {
        ProjectRef ref = projectService.requireProject(projectId, user.id);
        workspaceService.requireVerified(user);
        requireStatus(status);
        requirePriority(priority);
        requireAssignee(ref.project().workspaceId, assigneeId);
        if (title == null || title.isBlank()) {
            throw badRequest("Title is required");
        }

        String st = status == null ? Task.STATUS_TODO : status;
        Task t = new Task();
        t.projectId = projectId;
        t.workspaceId = ref.project().workspaceId;
        t.title = title.trim();
        t.description = description == null ? null : description.trim();
        t.status = st;
        t.priority = priority == null ? Task.PRIORITY_MEDIUM : priority;
        t.assigneeId = assigneeId;
        t.dueDate = dueDate;
        t.createdBy = user.id;
        // Serialize position assignment per project, same as move/delete.
        getEntityManager().find(Project.class, projectId, LockModeType.PESSIMISTIC_WRITE);
        t.position = (int) Task.count("projectId = ?1 and status = ?2", projectId, st);
        t.persist();
        return toDtos(List.of(t)).get(0);
    }

    @Transactional
    public TaskDto update(User user, Long taskId, String title, String description,
                          String status, String priority, Long assigneeId,
                          boolean unassign, LocalDate dueDate) {
        ProjectRef ref = requireTaskProject(taskId, user.id);
        Task t = Task.findById(taskId);
        requireStatus(status);
        requirePriority(priority);
        if (unassign && assigneeId != null) {
            throw badRequest("Provide either assigneeId or unassign, not both");
        }

        // Status changes route through the same column compaction as move().
        boolean statusChanged = status != null && !status.equals(t.status);
        String newStatus = statusChanged ? status : t.status;
        if (assigneeId != null) {
            requireAssignee(ref.project().workspaceId, assigneeId);
        }

        if (title != null) {
            if (title.isBlank()) {
                throw badRequest("Title cannot be blank");
            }
            t.title = title.trim();
        }
        if (description != null) {
            t.description = description.isBlank() ? null : description.trim();
        }
        if (priority != null) {
            t.priority = priority;
        }
        if (unassign) {
            t.assigneeId = null;
        } else if (assigneeId != null) {
            t.assigneeId = assigneeId;
        }
        if (dueDate != null) {
            t.dueDate = dueDate;
        }

        if (statusChanged) {
            Project locked = getEntityManager().find(Project.class, ref.project().id,
                    LockModeType.PESSIMISTIC_WRITE);
            moveWithinTx(locked, t, newStatus, -1);
        }
        t.updatedAt = Instant.now();
        return toDtos(List.of(t)).get(0);
    }

    @Transactional
    public void delete(User user, Long taskId) {
        ProjectRef ref = requireTaskProject(taskId, user.id);
        Task t = Task.findById(taskId);
        String status = t.status;
        getEntityManager().find(Project.class, ref.project().id, LockModeType.PESSIMISTIC_WRITE);
        Task.deleteById(taskId);
        compactColumn(ref.project().id, status);
    }

    /**
     * Move a task to a status column at a position. Position -1 appends.
     * Serializes concurrent moves on the project row (pessimistic write lock).
     */
    @Transactional
    public MoveResult move(User user, Long taskId, String status, int position) {
        ProjectRef ref = requireTaskProject(taskId, user.id);
        requireStatus(status);
        if (status == null) {
            throw badRequest("status is required");
        }
        Project project = getEntityManager().find(Project.class, ref.project().id,
                LockModeType.PESSIMISTIC_WRITE);

        Task t = Task.findById(taskId);
        moveWithinTx(project, t, status, position);
        t.updatedAt = Instant.now();
        return new MoveResult(toDtos(List.of(t)).get(0), columnDtos(project.id, status));
    }

    /** Caller must hold the project row lock when moving between columns. */
    private void moveWithinTx(Project project, Task t, String newStatus, int position) {
        Long projectId = project.id;
        String oldStatus = t.status;

        // Remove from the old column and compact positions above it.
        List<Task> oldColumn = Task.list("projectId = ?1 and status = ?2 order by position",
                projectId, oldStatus);
        int oldIndex = -1;
        for (int i = 0; i < oldColumn.size(); i++) {
            if (oldColumn.get(i).id.equals(t.id)) {
                oldIndex = i;
                break;
            }
        }
        for (int i = oldIndex + 1; i < oldColumn.size(); i++) {
            Task o = oldColumn.get(i);
            o.position = i - 1;
            o.persist();
        }

        if (oldStatus.equals(newStatus)) {
            // Reorder within the same column.
            List<Task> column = Task.list("projectId = ?1 and status = ?2 order by position",
                    projectId, newStatus);
            // column still contains t at oldIndex; remove it mentally
            List<Task> without = new java.util.ArrayList<>(column);
            without.removeIf(x -> x.id.equals(t.id));
            int idx = position < 0 ? without.size() : Math.min(position, without.size());
            without.add(idx, t);
            for (int i = 0; i < without.size(); i++) {
                Task x = without.get(i);
                if (x.position != i) {
                    x.position = i;
                    x.persist();
                }
            }
            return;
        }

        // Append/move into the new column at position (default: end).
        List<Task> target = Task.list("projectId = ?1 and status = ?2 order by position",
                projectId, newStatus);
        int idx = position < 0 ? target.size() : Math.min(position, target.size());
        for (int i = idx; i < target.size(); i++) {
            Task o = target.get(i);
            o.position = i + 1;
            o.persist();
        }
        t.status = newStatus;
        t.position = idx;
        t.persist();
    }

    private void compactColumn(Long projectId, String status) {
        List<Task> column = Task.list("projectId = ?1 and status = ?2 order by position",
                projectId, status);
        for (int i = 0; i < column.size(); i++) {
            if (column.get(i).position != i) {
                column.get(i).position = i;
                column.get(i).persist();
            }
        }
    }

    private static jakarta.persistence.EntityManager getEntityManager() {
        return io.quarkus.hibernate.orm.panache.Panache.getEntityManager();
    }
}
