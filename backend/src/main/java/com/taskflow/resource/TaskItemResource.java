package com.taskflow.resource;

import com.taskflow.dto.ProjectDtos.MoveResult;
import com.taskflow.dto.ProjectDtos.TaskDto;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.TaskService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;


import java.time.LocalDate;

@Tag(name = "Tasks")
@Path("/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class TaskItemResource {

    @Inject
    TaskService taskService;

    @Inject
    AuthService authService;

    @Inject
    WorkspaceService workspaceService;

    @Inject
    SessionClaims claims;

    public record UpdateTaskRequest(
            String title,
            String description,
            String status,
            String priority,
            Long assigneeId,
            Boolean unassign,
            LocalDate dueDate) {
    }

    public record MoveTaskRequest(String status, Integer position) {
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a task")
    public TaskDto get(@PathParam("id") Long id) {
        return taskService.get(currentUser(), id);
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Update a task fields (status change moves to column end)")
    public TaskDto update(@PathParam("id") Long id, @Valid UpdateTaskRequest req) {
        return taskService.update(currentUser(), id, req.title(), req.description(),
                req.status(), req.priority(), req.assigneeId(),
                Boolean.TRUE.equals(req.unassign()), req.dueDate());
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a task")
    public Response delete(@PathParam("id") Long id) {
        taskService.delete(currentUser(), id);
        return Response.noContent().build();
    }

    @PATCH
    @Path("/{id}/move")
    @Operation(summary = "Move a task to a status column at a position")
    public MoveResult move(@PathParam("id") Long id, @Valid MoveTaskRequest req) {
        return taskService.move(currentUser(), id, req.status(),
                req.position() == null ? -1 : req.position());
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
