package com.taskflow.service;

import com.taskflow.dto.CommentDtos.CommentDto;
import com.taskflow.dto.CommentDtos.CommentListDto;
import com.taskflow.model.Comment;
import com.taskflow.model.Task;
import com.taskflow.model.User;
import com.taskflow.model.WorkspaceMember;
import com.taskflow.service.WorkspaceService.Membership;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.taskflow.service.ProjectService.ProjectRef;

@ApplicationScoped
public class CommentService {

    /** D4: newest-N window; hasMore signals truncation explicitly. */
    private static final int MAX_COMMENTS = 200;
    private static final int MAX_BODY = 5000;

    @Inject
    ProjectService projectService;

    @Inject
    WorkspaceService workspaceService;

    private static WebApplicationException badRequest(String msg) {
        return new WebApplicationException(msg, Response.Status.BAD_REQUEST);
    }

    private static void requireBody(String body) {
        if (body == null || body.isBlank()) {
            throw badRequest("Comment body is required");
        }
        if (body.length() > MAX_BODY) {
            throw badRequest("Comment body must be at most " + MAX_BODY + " characters");
        }
    }

    /** Load the task's project ref — membership in the task's workspace. */
    private ProjectRef requireTaskProject(Long taskId, Long userId) {
        Task t = Task.findById(taskId);
        if (t == null) {
            throw new WebApplicationException("Task not found", Response.Status.NOT_FOUND);
        }
        return projectService.requireProject(t.projectId, userId);
    }

    private Comment requireComment(Long commentId, Long userId) {
        Comment c = Comment.findById(commentId);
        if (c == null) {
            throw new WebApplicationException("Comment not found", Response.Status.NOT_FOUND);
        }
        // tenancy first: the caller must belong to the comment's workspace
        Task task = Task.findById(c.taskId);
        projectService.requireProject(task.projectId, userId);
        return c;
    }

    private List<CommentDto> toDtos(List<Comment> comments) {
        if (comments.isEmpty()) {
            return List.of();
        }
        List<Long> authorIds = comments.stream().map(c -> c.authorId).distinct().toList();
        Map<Long, String> names = new HashMap<>();
        for (User u : User.<User>list("id in ?1", authorIds)) {
            names.put(u.id, u.displayName());
        }
        return comments.stream()
                .map(c -> CommentDto.of(c, names.get(c.authorId)))
                .toList();
    }

    /** Newest MAX_COMMENTS window, returned chronological asc + hasMore. */
    public CommentListDto list(User user, Long taskId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new WebApplicationException("Task not found", Response.Status.NOT_FOUND);
        }
        projectService.requireProject(task.projectId, user.id);

        long total = Comment.count("taskId", taskId);
        List<Comment> newest = Comment.find(
                "taskId = ?1 order by createdAt desc, id desc", taskId)
                .page(0, MAX_COMMENTS)
                .list();
        boolean hasMore = total > newest.size();
        java.util.Collections.reverse(newest); // desc -> chronological asc
        return new CommentListDto(toDtos(newest), hasMore);
    }

    @Transactional
    public CommentDto create(User user, Long taskId, String body) {
        ProjectRef ref = requireTaskProject(taskId, user.id);
        workspaceService.requireVerified(user);
        requireBody(body);

        Comment c = new Comment();
        c.taskId = taskId;
        c.workspaceId = ref.project().workspaceId;
        c.authorId = user.id;
        c.body = body.trim();
        c.persist();
        return toDtos(List.of(c)).get(0);
    }

    public CommentDto get(User user, Long commentId) {
        Comment c = requireComment(commentId, user.id);
        return toDtos(List.of(c)).get(0);
    }

    @Transactional
    public CommentDto update(User user, Long commentId, String body) {
        Comment c = requireComment(commentId, user.id);
        requireBody(body);
        if (!c.authorId.equals(user.id)) {
            throw new WebApplicationException("Only the author can edit a comment",
                    Response.Status.FORBIDDEN);
        }
        c.body = body.trim();
        c.updatedAt = Instant.now();
        return toDtos(List.of(c)).get(0);
    }

    @Transactional
    public void delete(User user, Long commentId) {
        Comment c = requireComment(commentId, user.id);
        if (!c.authorId.equals(user.id)) {
            // moderation path: workspace owner/admin may delete any comment
            Membership mb = workspaceService.requireMembership(c.workspaceId, user.id);
            workspaceService.requireRole(mb,
                    WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        }
        Comment.deleteById(commentId);
    }
}
