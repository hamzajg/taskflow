package com.taskflow.service;

import com.taskflow.model.User;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

@ApplicationScoped
public class JwtService {

    private final PrivateKey privateKey;

    public JwtService() {
        this.privateKey = loadPrivateKey();
    }

    public String issueToken(User user) {
        return Jwt.claims()
                .issuer("taskflow")
                .subject(String.valueOf(user.id))
                .claim("email", user.email)
                .claim("tv", user.tokenVersion)
                .expiresIn(3600)
                .sign(privateKey);
    }

    private static PrivateKey loadPrivateKey() {
        try (InputStream in = JwtService.class.getClassLoader().getResourceAsStream("keys/private.pem")) {
            if (in == null) {
                throw new IllegalStateException("keys/private.pem not found on classpath");
            }
            String pem = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            String b64 = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(b64);
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load JWT private key", e);
        }
    }

    public static String hashPassword(String raw) {
        return BcryptUtil.bcryptHash(raw);
    }

    public static boolean checkPassword(String raw, String hashed) {
        return BcryptUtil.matches(raw, hashed);
    }
}
