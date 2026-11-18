package com.taskflow.security;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

/** Parsed claims of the caller's JWT — single place that knows the token shape. */
@ApplicationScoped
public class SessionClaims {

    private static final Logger LOG = Logger.getLogger(SessionClaims.class);

    @Inject
    JsonWebToken jwt;

    public Long userId() {
        try {
            return Long.valueOf(jwt.getSubject());
        } catch (Exception e) {
            LOG.warn("Invalid token subject", e);
            throw new WebApplicationException("Invalid token", Response.Status.UNAUTHORIZED);
        }
    }

    /** Token version claim; null for tokens issued before revocation existed. */
    public Long tokenVersion() {
        Object tv = jwt.getClaim("tv");
        return tv == null ? null : Long.valueOf(tv.toString());
    }
}
