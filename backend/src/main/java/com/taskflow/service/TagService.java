package com.taskflow.service;

import com.taskflow.dto.TagDtos.TagDto;
import com.taskflow.model.Project;
import com.taskflow.model.Tag;
import com.taskflow.model.User;
import com.taskflow.model.WorkspaceMember;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.taskflow.service.WorkspaceService.Membership;

@ApplicationScoped
public class TagService {

    @Inject
    WorkspaceService workspaceService;

    /** Tags of a workspace the caller belongs to, ordered by title. */
    public List<TagDto> list(User user, Long workspaceId) {
        workspaceService.requireMembership(workspaceId, user.id);
        return Tag.<Tag>list("workspaceId = ?1 order by lower(title)", workspaceId)
                .stream().map(TagDto::of).toList();
    }

    @Transactional
    public TagDto create(User user, Long workspaceId, String title, String color) {
        Membership mb = workspaceService.requireMembership(workspaceId, user.id);
        workspaceService.requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        String cleanTitle = requireValidTitle(title);
        String cleanColor = requireValidColor(color);
        requireTitleAvailable(workspaceId, cleanTitle, null);

        Tag t = new Tag();
        t.workspaceId = workspaceId;
        t.title = cleanTitle;
        t.color = cleanColor;
        t.createdBy = user.id;
        try {
            t.persist();
            t.getEntityManager().flush();
        } catch (PersistenceException e) {
            throw conflict("A tag with this title already exists");
        }
        return TagDto.of(t);
    }

    @Transactional
    public TagDto update(User user, Long workspaceId, Long tagId, String title, String color) {
        Membership mb = workspaceService.requireMembership(workspaceId, user.id);
        workspaceService.requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        Tag t = requireTag(workspaceId, tagId);

        if (title != null) {
            String cleanTitle = requireValidTitle(title);
            requireTitleAvailable(workspaceId, cleanTitle, tagId);
            t.title = cleanTitle;
        }
        if (color != null) {
            t.color = requireValidColor(color);
        }
        t.updatedAt = Instant.now();
        try {
            t.getEntityManager().flush();
        } catch (PersistenceException e) {
            throw conflict("A tag with this title already exists");
        }
        return TagDto.of(t);
    }

    @Transactional
    public void delete(User user, Long workspaceId, Long tagId) {
        Membership mb = workspaceService.requireMembership(workspaceId, user.id);
        workspaceService.requireRole(mb, WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        Tag t = requireTag(workspaceId, tagId);
        // project_tags rows cascade via the composite FK
        Tag.deleteById(t.id);
    }

    /** Resolve and validate a set of tag ids against a project's workspace. */
    public void requireTagsForWorkspace(Long workspaceId, List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return;
        }
        List<Long> distinct = tagIds.stream().distinct().toList();
        long found = Tag.count("workspaceId = ?1 and id in ?2", workspaceId, distinct);
        if (found != distinct.size()) {
            throw new WebApplicationException("Unknown tag for this workspace",
                    Response.Status.BAD_REQUEST);
        }
    }

    /** Replace a project's tag set (write-through on the pivot table). */
    @Transactional
    public void setProjectTags(Project project, List<Long> tagIds) {
        EntityManager em = Tag.getEntityManager();
        em.createNativeQuery("delete from project_tags where project_id = ?1")
                .setParameter(1, project.id).executeUpdate();
        if (tagIds == null) {
            return;
        }
        for (Long tagId : tagIds.stream().distinct().toList()) {
            em.createNativeQuery(
                            "insert into project_tags (project_id, tag_id, workspace_id)"
                                    + " values (?1, ?2, ?3)")
                    .setParameter(1, project.id)
                    .setParameter(2, tagId)
                    .setParameter(3, project.workspaceId)
                    .executeUpdate();
        }
    }

    /** Tags for one project, ordered by title. */
    public List<TagDto> forProject(Long projectId) {
        return forProjects(List.of(projectId)).getOrDefault(projectId, List.of());
    }

    /** Batch tag lookup for many projects — one query, no N+1. */
    @SuppressWarnings("unchecked")
    public Map<Long, List<TagDto>> forProjects(Collection<Long> projectIds) {
        Map<Long, List<TagDto>> byProject = new HashMap<>();
        if (projectIds == null || projectIds.isEmpty()) {
            return byProject;
        }
        List<Object[]> rows = Tag.getEntityManager().createNativeQuery(
                        "select pt.project_id, t.id, t.title, t.color"
                                + " from project_tags pt join tags t on t.id = pt.tag_id"
                                + " where pt.project_id in (:ids) order by lower(t.title)")
                .setParameter("ids", projectIds)
                .getResultList();
        for (Object[] row : rows) {
            Long projectId = ((Number) row[0]).longValue();
            byProject.computeIfAbsent(projectId, k -> new java.util.ArrayList<>())
                    .add(new TagDto(((Number) row[1]).longValue(),
                            (String) row[2], (String) row[3]));
        }
        return byProject;
    }

    private Tag requireTag(Long workspaceId, Long tagId) {
        Tag t = Tag.find("id = ?1 and workspaceId = ?2", tagId, workspaceId).firstResult();
        if (t == null) {
            throw new WebApplicationException("Tag not found", Response.Status.NOT_FOUND);
        }
        return t;
    }

    private static String requireValidTitle(String title) {
        if (title == null || title.isBlank() || title.trim().length() > Tag.MAX_TITLE_LENGTH) {
            throw new WebApplicationException("Tag title must be 1-50 characters",
                    Response.Status.BAD_REQUEST);
        }
        return title.trim();
    }

    private static String requireValidColor(String color) {
        if (color == null || color.isBlank()) {
            return null;
        }
        if (color.trim().length() > Tag.MAX_COLOR_LENGTH) {
            throw new WebApplicationException("Tag color is too long",
                    Response.Status.BAD_REQUEST);
        }
        return color.trim();
    }

    private static void requireTitleAvailable(Long workspaceId, String title, Long excludeId) {
        long dup = Tag.count("workspaceId = ?1 and lower(title) = lower(?2) and id <> ?3",
                workspaceId, title, excludeId == null ? -1L : excludeId);
        if (dup > 0) {
            throw conflict("A tag with this title already exists");
        }
    }

    private static WebApplicationException conflict(String message) {
        return new WebApplicationException(message, Response.Status.CONFLICT);
    }
}
