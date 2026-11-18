package com.taskflow.service;

import com.taskflow.dto.AuthDtos.AuthResponse;
import com.taskflow.dto.AuthDtos.UserDto;
import com.taskflow.model.User;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    private static final Logger LOG = Logger.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    @Inject
    Mailer mailer;

    @Inject
    JwtService jwtService;

    @ConfigProperty(name = "app.base-url", defaultValue = "http://localhost:8080")
    String baseUrl;

    @Transactional
    public UserDto register(String firstName, String lastName, String email, String password) {
        if (User.count("lower(email) = ?1", email.toLowerCase()) > 0) {
            throw new WebApplicationException("Email already registered", Response.Status.CONFLICT);
        }
        User user = new User();
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.email = email.toLowerCase();
        user.password = JwtService.hashPassword(password);
        user.verificationToken = newToken();
        user.persist();
        sendVerificationEmail(user);
        return UserDto.of(user);
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        User user = User.find("lower(email) = ?1", email.toLowerCase()).firstResult();
        if (user == null || !JwtService.checkPassword(password, user.password)) {
            throw new WebApplicationException("Invalid email or password", Response.Status.UNAUTHORIZED);
        }
        return new AuthResponse(jwtService.issueToken(user), UserDto.of(user));
    }

    @Transactional
    public void verifyEmail(String token) {
        User user = User.find("verificationToken", token).firstResult();
        if (user == null) {
            throw new WebApplicationException("Invalid verification token", Response.Status.BAD_REQUEST);
        }
        user.verifiedAt = Instant.now();
        user.verificationToken = null;
    }

    @Transactional
    public void resendVerification(Long userId) {
        User user = User.findById(userId);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.NOT_FOUND);
        }
        if (user.isVerified()) {
            throw new WebApplicationException("Email already verified", Response.Status.CONFLICT);
        }
        user.verificationToken = newToken();
        sendVerificationEmail(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = User.find("lower(email) = ?1", email.toLowerCase()).firstResult();
        // Always return success to avoid account enumeration.
        if (user == null) {
            return;
        }
        user.resetToken = newToken();
        user.resetTokenExpiresAt = Instant.now().plus(1, ChronoUnit.HOURS);
        sendMail(user.email, "Reset your TaskFlow password",
                "Use this link to reset your password (valid 1 hour):\n\n"
                        + baseUrl + "/reset-password?token=" + user.resetToken
                        + "\n\nIf you did not request this, ignore this email.");
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = User.find("resetToken", token).firstResult();
        if (user == null || user.resetTokenExpiresAt == null
                || user.resetTokenExpiresAt.isBefore(Instant.now())) {
            throw new WebApplicationException("Invalid or expired reset token", Response.Status.BAD_REQUEST);
        }
        user.password = JwtService.hashPassword(newPassword);
        user.resetToken = null;
        user.resetTokenExpiresAt = null;
    }

    @Transactional
    public UserDto updateProfile(Long userId, String firstName, String lastName) {
        User user = User.findById(userId);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.NOT_FOUND);
        }
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.updatedAt = Instant.now();
        return UserDto.of(user);
    }

    public User requireUser(Long id) {
        User user = User.findById(id);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.NOT_FOUND);
        }
        return user;
    }

    private void sendVerificationEmail(User user) {
        String link = baseUrl + "/verify-email?token=" + user.verificationToken;
        sendMail(user.email, "Verify your TaskFlow email",
                "Welcome to TaskFlow. Verify your email address:\n\n" + link
                        + "\n\nThis link expires when used.");
    }

    private void sendMail(String to, String subject, String body) {
        try {
            mailer.send(Mail.withText(to, subject, body));
        } catch (Exception e) {
            // Dev environments may lack SMTP — log the message so flows remain testable.
            LOG.warnf(e, "Failed to send email to %s (subject: %s). Body: %s", to, subject, body);
        }
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) + "-" + UUID.randomUUID();
    }
}
