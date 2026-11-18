package com.taskflow.model;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User extends PanacheEntity {

    @Column(nullable = false, unique = true)
    public String email;

    @Column(nullable = false)
    public String password;

    @Column(name = "first_name", nullable = false)
    public String firstName;

    @Column(name = "last_name", nullable = false)
    public String lastName;

    @Column(name = "verified_at")
    public Instant verifiedAt;

    @Column(name = "verification_token")
    public String verificationToken;

    @Column(name = "reset_token")
    public String resetToken;

    @Column(name = "reset_token_expires_at")
    public Instant resetTokenExpiresAt;

    @Column(name = "token_version", nullable = false)
    public int tokenVersion;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt = Instant.now();

    public boolean isVerified() {
        return verifiedAt != null;
    }

    public static User findByEmail(String email) {
        return find("lower(email) = ?1", email.toLowerCase()).firstResult();
    }

    public String displayName() {
        return (firstName + " " + lastName).trim();
    }
}
