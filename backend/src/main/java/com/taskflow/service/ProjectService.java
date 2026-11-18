package com.taskflow.service;

import com.taskflow.dto.ProjectDtos.ProjectDto;
import com.taskflow.model.Project;
import com.taskflow.model.Task;
import com.taskflow.model.User;
import com.taskflow.model.WorkspaceMember;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.taskflow.service.WorkspaceService.Membership;

@ApplicationScoped
public class ProjectService {

    @Inject
    WorkspaceService workspaceService;

    public record ProjectRef(Project project, Membership membership) {
    }

    /** Load a project and require the caller's membership in its workspace. */
    public ProjectRef requireProject(Long projectId, Long userId) {
        Project p = Project.findById(projectId);
        if (p == null) {
            throw new WebApplicationException("Project not found", Response.Status.NOT_FOUND);
        }
        Membership mb = workspaceService.requireMembership(p.workspaceId, userId);
        return new ProjectRef(p, mb);
    }

    /** Projects of a workspace the caller belongs to, with task counts. */
    public List<ProjectDto> listFor(User user, Long workspaceId) {
        workspaceService.requireMembership(workspaceId, user.id);
        List<Project> projects = Project.list("workspaceId = ?1 order by name", workspaceId);
        List<Long> ids = projects.stream().map(p -> p.id).toList();
        Map<Long, Long> counts = ids.isEmpty() ? Map.of() : Task.countGroupedByProject(ids);
        return projects.stream()
                .map(p -> ProjectDto.of(p, counts.getOrDefault(p.id, 0L)))
                .toList();
    }

    @Transactional
    public ProjectDto create(User user, Long workspaceId, String name, String description, String color) {
        workspaceService.requireMembership(workspaceId, user.id);
        workspaceService.requireVerified(user);
        Project p = new Project();
        p.workspaceId = workspaceId;
        p.name = name.trim();
        p.description = description == null ? null : description.trim();
        p.color = color;
        p.createdBy = user.id;
        p.persist();
        return ProjectDto.of(p, 0);
    }

    @Transactional
    public ProjectDto update(User user, Long projectId, String name, String description, String color) {
        ProjectRef ref = requireProject(projectId, user.id);
        workspaceService.requireRole(ref.membership(),
                WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        Project p = ref.project();
        if (name != null) {
            p.name = name.trim();
        }
        if (description != null) {
            p.description = description.isBlank() ? null : description.trim();
        }
        if (color != null) {
            p.color = color.isBlank() ? null : color;
        }
        p.updatedAt = Instant.now();
        return ProjectDto.of(p, Task.count("projectId", p.id));
    }

    @Transactional
    public void delete(User user, Long projectId) {
        ProjectRef ref = requireProject(projectId, user.id);
        workspaceService.requireRole(ref.membership(),
                WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        // tasks cascade via the composite FK
        Project.deleteById(projectId);
    }
}
