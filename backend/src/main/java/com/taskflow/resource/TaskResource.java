package com.taskflow.resource;

import com.taskflow.dto.ProjectDtos.TaskDto;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.TaskService;
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


import java.time.LocalDate;
import java.util.List;

@Tag(name = "Tasks")
@Path("/projects/{projectId}/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class TaskResource {

    @Inject
    TaskService taskService;

    @Inject
    AuthService authService;

    @Inject
    WorkspaceService workspaceService;

    @Inject
    SessionClaims claims;

    public record CreateTaskRequest(
            @NotBlank String title,
            String description,
            String status,
            String priority,
            Long assigneeId,
            LocalDate dueDate) {
    }

    @GET
    @Operation(summary = "List tasks in a project")
    public List<TaskDto> list(@PathParam("projectId") Long projectId) {
        return taskService.listForProject(currentUser(), projectId);
    }

    @POST
    @Operation(summary = "Create a task")
    public Response create(@PathParam("projectId") Long projectId,
                           @Valid CreateTaskRequest req) {
        TaskDto dto = taskService.create(currentUser(), projectId, req.title(),
                req.description(), req.status(), req.priority(), req.assigneeId(), req.dueDate());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
