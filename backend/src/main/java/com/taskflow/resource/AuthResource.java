package com.taskflow.resource;

import com.taskflow.dto.AuthDtos.*;
import com.taskflow.model.User;
import com.taskflow.service.AuthService;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    private static final Logger LOG = Logger.getLogger(AuthResource.class);

    @Inject
    AuthService authService;

    @Inject
    JsonWebToken jwt;

    @POST
    @Path("/register")
    public Response register(@Valid RegisterRequest req) {
        UserDto user = authService.register(req.firstName(), req.lastName(), req.email(), req.password());
        return Response.status(Response.Status.CREATED).entity(user).build();
    }

    @POST
    @Path("/login")
    public AuthResponse login(@Valid LoginRequest req) {
        return authService.login(req.email(), req.password());
    }

    @GET
    @Path("/verify-email")
    public Response verifyEmail(@QueryParam("token") String token) {
        if (token == null || token.isBlank()) {
            throw new WebApplicationException("Missing token", Response.Status.BAD_REQUEST);
        }
        authService.verifyEmail(token);
        return Response.ok(new Message("Email verified successfully")).build();
    }

    @POST
    @Path("/resend-verification")
    @Authenticated
    public Response resendVerification() {
        authService.resendVerification(currentUserId(), currentTokenVersion());
        return Response.ok(new Message("Verification email sent")).build();
    }

    @POST
    @Path("/forgot-password")
    public Response forgotPassword(@Valid ForgotPasswordRequest req) {
        authService.forgotPassword(req.email());
        return Response.ok(new Message("If the email exists, a reset link was sent")).build();
    }

    @POST
    @Path("/reset-password")
    public Response resetPassword(@Valid ResetPasswordRequest req) {
        authService.resetPassword(req.token(), req.password());
        return Response.ok(new Message("Password updated")).build();
    }

    @GET
    @Path("/me")
    @Authenticated
    public UserDto me() {
        return UserDto.of(authService.requireUser(currentUserId(), currentTokenVersion()));
    }

    @PUT
    @Path("/profile")
    @Authenticated
    public UserDto updateProfile(@Valid ProfileUpdateRequest req) {
        return authService.updateProfile(currentUserId(), currentTokenVersion(), req.firstName(), req.lastName());
    }

    @POST
    @Path("/logout")
    @Authenticated
    public Response logout() {
        authService.logout(currentUserId());
        return Response.noContent().build();
    }

    public record Message(String message) {
    }

    private Long currentUserId() {
        try {
            return Long.valueOf(jwt.getSubject());
        } catch (Exception e) {
            LOG.warn("Invalid token subject", e);
            throw new WebApplicationException("Invalid token", Response.Status.UNAUTHORIZED);
        }
    }

    private Long currentTokenVersion() {
        Object tv = jwt.getClaim("tv");
        return tv == null ? null : Long.valueOf(tv.toString());
    }
}
