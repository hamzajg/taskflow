package com.taskflow.resource;

import com.taskflow.dto.TimeEntryDtos.TimeEntryDto;
import com.taskflow.model.User;
import com.taskflow.security.SessionClaims;
import com.taskflow.service.AuthService;
import com.taskflow.service.TimeEntryService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
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
@Path("/time-entries")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class TimeEntryItemResource {

    @Inject
    TimeEntryService timeEntryService;

    @Inject
    AuthService authService;

    @Inject
    WorkspaceService workspaceService;

    @Inject
    SessionClaims claims;

    public record UpdateBody(LocalDate entryDate, Integer minutes, String description) {
    }

    @GET
    @Path("/running")
    @Operation(summary = "The caller's running timer across all workspaces, or null")
    public TimeEntryDto running() {
        return timeEntryService.running(currentUser());
    }

    @POST
    @Path("/timer/stop")
    @Operation(summary = "Stop the caller's running timer")
    public TimeEntryDto timerStop() {
        return timeEntryService.timerStop(currentUser());
    }

    @PATCH
    @Path("/{id}")
    @Operation(summary = "Edit a time entry (author only, completed entries)")
    public TimeEntryDto update(@PathParam("id") Long id, UpdateBody body) {
        body = body == null ? new UpdateBody(null, null, null) : body;
        return timeEntryService.update(currentUser(), id,
                body.entryDate(), body.minutes(), body.description());
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a time entry (author, or owner/admin moderation)")
    public Response delete(@PathParam("id") Long id) {
        timeEntryService.delete(currentUser(), id);
        return Response.noContent().build();
    }

    private User currentUser() {
        User user = authService.requireUser(claims.userId(), claims.tokenVersion());
        workspaceService.requireVerified(user);
        return user;
    }
}
