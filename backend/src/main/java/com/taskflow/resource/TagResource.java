package com.taskflow.resource;

import com.taskflow.dto.TagDtos.TagDto;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.TagService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Tag(name = "Tags")
@Path("/workspaces/{workspaceId}/tags")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class TagResource {

    @Inject
    TagService tagService;

    @Inject
    AuthService authService;

    @Inject
    SessionClaims claims;

    @Inject
    WorkspaceService workspaceService;

    public record CreateTagRequest(@NotBlank @Size(max = 50) String title, @Size(max = 20) String color) {
    }

    public record UpdateTagRequest(@Size(max = 50) String title, @Size(max = 20) String color) {
    }

    @GET
    @Operation(summary = "List tags in a workspace")
    public List<TagDto> list(@PathParam("workspaceId") Long workspaceId) {
        return tagService.list(currentUser(), workspaceId);
    }

    @POST
    @Operation(summary = "Create a tag (owner/admin)")
    public Response create(@PathParam("workspaceId") Long workspaceId,
                           @Valid CreateTagRequest req) {
        TagDto dto = tagService.create(currentUser(), workspaceId, req.title(), req.color());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @PUT
    @Path("/{tagId}")
    @Operation(summary = "Rename or recolor a tag (owner/admin)")
    public TagDto update(@PathParam("workspaceId") Long workspaceId,
                         @PathParam("tagId") Long tagId,
                         @Valid UpdateTagRequest req) {
        return tagService.update(currentUser(), workspaceId, tagId, req.title(), req.color());
    }

    @DELETE
    @Path("/{tagId}")
    @Operation(summary = "Delete a tag (owner/admin, detaches from projects)")
    public Response delete(@PathParam("workspaceId") Long workspaceId,
                           @PathParam("tagId") Long tagId) {
        tagService.delete(currentUser(), workspaceId, tagId);
        return Response.noContent().build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
