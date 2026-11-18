package com.taskflow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank String firstName,
            @NotBlank String lastName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 128) String password) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 128) String password) {
    }

    public record ProfileUpdateRequest(
            @NotBlank String firstName,
            @NotBlank String lastName) {
    }

    public record UserDto(long id, String firstName, String lastName, String email, boolean verified) {
        public static UserDto of(com.taskflow.model.User u) {
            return new UserDto(u.id, u.firstName, u.lastName, u.email, u.isVerified());
        }
    }

    public record AuthResponse(String token, UserDto user) {
    }

    public record WorkspaceDto(long id, String name, String role, long memberCount) {
    }

    public record MemberDto(long userId, String displayName, String email, String role) {
    }

    public record InviteDto(long id, String email, String role, String token) {
    }
}
