package com.taskflow.resource;

import com.taskflow.dto.ProjectDtos.ProjectDto;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.ProjectService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.util.List;

@Tag(name = "Projects")
@Path("/workspaces/{workspaceId}/projects")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class ProjectResource {

    @Inject
    ProjectService projectService;

    @Inject
    AuthService authService;

    @Inject
    SessionClaims claims;

    @Inject
    WorkspaceService workspaceService;

    public record CreateProjectRequest(@NotBlank String name, String description, String color) {
    }

    public record UpdateProjectRequest(String name, String description, String color) {
    }

    @GET
    @Operation(summary = "List projects in a workspace")
    public List<ProjectDto> list(@PathParam("workspaceId") Long workspaceId) {
        return projectService.listFor(currentUser(), workspaceId);
    }

    @POST
    @Operation(summary = "Create a project")
    public Response create(@PathParam("workspaceId") Long workspaceId,
                           @Valid CreateProjectRequest req) {
        ProjectDto dto = projectService.create(currentUser(), workspaceId,
                req.name(), req.description(), req.color());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a project")
    public ProjectDto get(@PathParam("id") Long id) {
        var ref = projectService.requireProject(id, currentUser().id);
        return ProjectDto.of(ref.project(), com.taskflow.model.Task.count("projectId", id));
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update a project (owner/admin)")
    public ProjectDto update(@PathParam("id") Long id, @Valid UpdateProjectRequest req) {
        return projectService.update(currentUser(), id, req.name(), req.description(), req.color());
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a project (owner/admin, cascades tasks)")
    public Response delete(@PathParam("id") Long id) {
        projectService.delete(currentUser(), id);
        return Response.noContent().build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
