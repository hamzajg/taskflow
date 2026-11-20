package com.taskflow.resource;

import com.taskflow.dto.TimeEntryDtos.TimeEntryDto;
import com.taskflow.dto.TimeEntryDtos.TimeEntryList;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.TimeEntryService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import java.time.LocalDate;

@Tag(name = "Time Entries")
@Path("/tasks/{taskId}/time-entries")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class TimeEntryResource {

    @Inject
    TimeEntryService timeEntryService;

    @Inject
    AuthService authService;

    @Inject
    WorkspaceService workspaceService;

    @Inject
    SessionClaims claims;

    public record CreateBody(LocalDate entryDate, Integer minutes, String description) {
    }

    @GET
    @Operation(summary = "List time entries on a task plus the caller's running timer")
    public TimeEntryList list(@PathParam("taskId") Long taskId) {
        return timeEntryService.list(currentUser(), taskId);
    }

    @POST
    @Operation(summary = "Log a manual time entry on a task")
    public Response create(@PathParam("taskId") Long taskId, CreateBody body) {
        body = body == null ? new CreateBody(null, null, null) : body;
        TimeEntryDto dto = timeEntryService.create(currentUser(), taskId,
                body.entryDate(), body.minutes(), body.description());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @POST
    @Path("/timer/start")
    @Operation(summary = "Start the caller's timer on this task (one running timer per user)")
    public Response timerStart(@PathParam("taskId") Long taskId) {
        TimeEntryDto dto = timeEntryService.timerStart(currentUser(), taskId);
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
