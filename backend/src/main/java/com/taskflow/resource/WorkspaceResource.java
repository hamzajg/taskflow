package com.taskflow.resource;

import com.taskflow.dto.AuthDtos.*;
import com.taskflow.model.User;
import com.taskflow.service.AuthService;
import com.taskflow.service.WorkspaceService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.Map;

@Path("/workspaces")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class WorkspaceResource {

    @Inject
    WorkspaceService workspaceService;

    @Inject
    AuthService authService;

    @Inject
    JsonWebToken jwt;

    public record CreateWorkspaceRequest(@NotBlank String name) {
    }

    public record RenameWorkspaceRequest(@NotBlank String name) {
    }

    public record InviteRequest(@NotBlank String email, String role) {
    }

    public record AcceptInviteRequest(@NotBlank String token) {
    }

    @GET
    public List<WorkspaceDto> list() {
        return workspaceService.listFor(currentUser());
    }

    @POST
    public Response create(@Valid CreateWorkspaceRequest req) {
        WorkspaceDto dto = workspaceService.create(currentUser(), req.name());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @GET
    @Path("/{id}")
    public WorkspaceDto get(@PathParam("id") Long id) {
        var mb = workspaceService.requireMembership(id, currentUser().id);
        return new WorkspaceDto(mb.workspace().id, mb.workspace().name, mb.member().role,
                com.taskflow.model.WorkspaceMember.count("workspaceId", id));
    }

    @PUT
    @Path("/{id}")
    public WorkspaceDto rename(@PathParam("id") Long id, @Valid RenameWorkspaceRequest req) {
        return workspaceService.rename(currentUser(), id, req.name());
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        workspaceService.delete(currentUser(), id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/members")
    public List<MemberDto> members(@PathParam("id") Long id) {
        return workspaceService.members(currentUser(), id);
    }

    @DELETE
    @Path("/{id}/members/{userId}")
    public Response removeMember(@PathParam("id") Long id, @PathParam("userId") Long userId) {
        workspaceService.removeMember(currentUser(), id, userId);
        return Response.noContent().build();
    }

    @POST
    @Path("/{id}/invites")
    public Response invite(@PathParam("id") Long id, @Valid InviteRequest req) {
        InviteDto dto = workspaceService.invite(currentUser(), id, req.email(), req.role());
        return Response.status(Response.Status.CREATED).entity(dto).build();
    }

    @GET
    @Path("/{id}/invites")
    public List<InviteDto> pendingInvites(@PathParam("id") Long id) {
        return workspaceService.pendingInvites(currentUser(), id);
    }

    @DELETE
    @Path("/{id}/invites/{inviteId}")
    public Response revokeInvite(@PathParam("id") Long id, @PathParam("inviteId") Long inviteId) {
        workspaceService.revokeInvite(currentUser(), id, inviteId);
        return Response.noContent().build();
    }

    @POST
    @Path("/invites/accept")
    public WorkspaceDto acceptInvite(@Valid AcceptInviteRequest req) {
        return workspaceService.acceptInvite(currentUser(), req.token());
    }

    private User currentUser() {
        Object tv = jwt.getClaim("tv");
        User user = authService.requireUser(Long.valueOf(jwt.getSubject()),
                tv == null ? null : Long.valueOf(tv.toString()));
        workspaceService.requireVerified(user);
        return user;
    }
}
