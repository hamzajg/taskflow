package com.taskflow.resource;

import com.taskflow.dto.ProjectDtos.ProjectDto;
import com.taskflow.model.Task;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.ProjectService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

/** Item-level project lookup; tenancy is resolved from the project itself. */
@Tag(name = "Projects")
@Path("/projects")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class ProjectItemResource {

    @Inject
    ProjectService projectService;

    @Inject
    AuthService authService;

    @Inject
    SessionClaims claims;

    @Inject
    WorkspaceService workspaceService;

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a project by id")
    public ProjectDto get(@PathParam("id") Long id) {
        var ref = projectService.requireProject(id, currentUser().id);
        return ProjectDto.of(ref.project(), Task.count("projectId", id));
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
