package com.taskflow.service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

/** URL-safe random tokens for verification, password reset and invites. */
public final class Tokens {

    private static final SecureRandom RANDOM = new SecureRandom();

    private Tokens() {
    }

    public static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes) + "-" + UUID.randomUUID();
    }
}
