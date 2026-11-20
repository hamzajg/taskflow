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

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@ApplicationScoped
public class AuthService {

    private static final Logger LOG = Logger.getLogger(AuthService.class);

    @Inject
    Mailer mailer;

    @Inject
    JwtService jwtService;

    @Inject
    DefaultWorkspaceService defaultWorkspaceService;

    @ConfigProperty(name = "app.base-url", defaultValue = "http://localhost:8080")
    String baseUrl;

    @Transactional
    public UserDto register(String firstName, String lastName, String email, String password) {
        if (User.findByEmail(email) != null) {
            throw new WebApplicationException("Email already registered", Response.Status.CONFLICT);
        }
        User user = new User();
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.email = email.toLowerCase();
        user.password = JwtService.hashPassword(password);
        user.verificationToken = Tokens.newToken();
        try {
            user.persist();
            User.getEntityManager().flush();
        } catch (jakarta.persistence.PersistenceException e) {
            // Concurrent registration hit the unique email constraint.
            throw new WebApplicationException("Email already registered", Response.Status.CONFLICT);
        }
        sendVerificationEmail(user);
        return UserDto.of(user);
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        User user = User.findByEmail(email);
        if (user == null || !JwtService.checkPassword(password, user.password)) {
            throw new WebApplicationException("Invalid email or password", Response.Status.UNAUTHORIZED);
        }
        defaultWorkspaceService.ensureFor(user);
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
    public void resendVerification(Long userId, Long tokenVersion) {
        User user = requireUser(userId, tokenVersion);
        if (user.isVerified()) {
            throw new WebApplicationException("Email already verified", Response.Status.CONFLICT);
        }
        user.verificationToken = Tokens.newToken();
        sendVerificationEmail(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = User.findByEmail(email);
        // Always return success to avoid account enumeration.
        if (user == null) {
            return;
        }
        user.resetToken = Tokens.newToken();
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
        user.tokenVersion++;
    }

    @Transactional
    public UserDto updateProfile(Long userId, Long tokenVersion, String firstName, String lastName) {
        User user = requireUser(userId, tokenVersion);
        user.firstName = firstName.trim();
        user.lastName = lastName.trim();
        user.updatedAt = Instant.now();
        return UserDto.of(user);
    }

    public User requireUser(Long id, Long tokenVersion) {
        User user = User.findById(id);
        if (user == null) {
            throw new WebApplicationException("User not found", Response.Status.NOT_FOUND);
        }
        if (tokenVersion == null || tokenVersion != user.tokenVersion) {
            throw new WebApplicationException("Session expired", Response.Status.UNAUTHORIZED);
        }
        return user;
    }

    @Transactional
    public void logout(Long userId) {
        User user = User.findById(userId);
        if (user != null) {
            user.tokenVersion++;
        }
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
}
