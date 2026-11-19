package com.taskflow.resource;

import com.taskflow.dto.CommentDtos.CommentDto;
import com.taskflow.dto.CommentDtos.CommentListDto;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.CommentService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Tag(name = "Comments")
@Path("/tasks/{taskId}/comments")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CommentResource {

    @Inject
    CommentService commentService;

    @Inject
    AuthService authService;

    @Inject
    WorkspaceService workspaceService;

    @Inject
    SessionClaims claims;

    public record CreateCommentRequest(String body) {
    }

    @GET
    @Operation(summary = "List comments on a task (newest 200, chronological)")
    public CommentListDto list(@PathParam("taskId") Long taskId) {
        return commentService.list(currentUser(), taskId);
    }

    @POST
    @Operation(summary = "Post a comment on a task")
    public Response create(@PathParam("taskId") Long taskId, CreateCommentRequest req) {
        CommentDto dto = commentService.create(currentUser(), taskId,
                req == null ? null : req.body());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
