package com.taskflow.resource;

import com.taskflow.dto.CommentDtos.CommentDto;
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
@Path("/comments")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CommentItemResource {

    @Inject
    CommentService commentService;

    @Inject
    AuthService authService;

    @Inject
    WorkspaceService workspaceService;

    @Inject
    SessionClaims claims;

    public record UpdateCommentRequest(String body) {
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a comment")
    public CommentDto get(@PathParam("id") Long id) {
        return commentService.get(currentUser(), id);
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Edit a comment (author only)")
    public CommentDto update(@PathParam("id") Long id, UpdateCommentRequest req) {
        return commentService.update(currentUser(), id, req == null ? null : req.body());
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a comment (author, or workspace owner/admin)")
    public Response delete(@PathParam("id") Long id) {
        commentService.delete(currentUser(), id);
        return Response.noContent().build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
