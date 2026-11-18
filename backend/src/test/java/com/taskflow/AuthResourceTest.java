package com.taskflow;

import com.taskflow.model.User;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class AuthResourceTest {

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clean() {
        mailbox.clear();
        User.deleteAll();
    }

    private static String registerPayload(String email) {
        return """
                {"firstName":"Ana","lastName":"Silva","email":"%s","password":"secret123"}
                """.formatted(email);
    }

    private String extractTokenFromEmail(String to) {
        var messages = mailbox.getMailsSentTo(to);
        assertFalse(messages.isEmpty(), "expected a verification email to " + to);
        String body = messages.get(messages.size() - 1).getText();
        Matcher m = Pattern.compile("token=([A-Za-z0-9_\\-]+)").matcher(body);
        assertTrue(m.find(), "verification link not found in email body");
        return m.group(1);
    }

    @Test
    public void register_sends_verification_and_blocks_workspace_access() {
        given().contentType(ContentType.JSON).body(registerPayload("ana@example.com"))
                .when().post("/auth/register")
                .then().statusCode(201)
                .body("email", equalTo("ana@example.com"))
                .body("verified", equalTo(false));

        String token = extractTokenFromEmail("ana@example.com");

        // Unverified user can log in but not touch workspaces.
        String jwt = given().contentType(ContentType.JSON)
                .body("{\"email\":\"ana@example.com\",\"password\":\"secret123\"}")
                .when().post("/auth/login")
                .then().statusCode(200).extract().path("token");
        assertNotNull(jwt);

        given().header("Authorization", "Bearer " + jwt)
                .when().get("/workspaces")
                .then().statusCode(403);

        // Verify email, then workspace access works.
        given().queryParam("token", token)
                .when().get("/auth/verify-email")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + jwt)
                .when().get("/workspaces")
                .then().statusCode(200);
    }

    @Test
    public void login_rejects_wrong_password() {
        given().contentType(ContentType.JSON).body(registerPayload("bob@example.com"))
                .when().post("/auth/register").then().statusCode(201);

        given().contentType(ContentType.JSON)
                .body("{\"email\":\"bob@example.com\",\"password\":\"wrong-pass\"}")
                .when().post("/auth/login")
                .then().statusCode(401);
    }

    @Test
    public void register_rejects_duplicate_email() {
        given().contentType(ContentType.JSON).body(registerPayload("dup@example.com"))
                .when().post("/auth/register").then().statusCode(201);
        given().contentType(ContentType.JSON).body(registerPayload("dup@example.com"))
                .when().post("/auth/register").then().statusCode(409);
    }

    @Test
    public void me_requires_token_and_returns_user() {
        given().contentType(ContentType.JSON).body(registerPayload("me@example.com"))
                .when().post("/auth/register").then().statusCode(201);
        String jwt = given().contentType(ContentType.JSON)
                .body("{\"email\":\"me@example.com\",\"password\":\"secret123\"}")
                .when().post("/auth/login")
                .then().statusCode(200).extract().path("token");

        given().when().get("/auth/me").then().statusCode(401);

        given().header("Authorization", "Bearer " + jwt)
                .when().get("/auth/me")
                .then().statusCode(200)
                .body("email", equalTo("me@example.com"));
    }

    @Test
    public void forgot_and_reset_password() {
        given().contentType(ContentType.JSON).body(registerPayload("reset@example.com"))
                .when().post("/auth/register").then().statusCode(201);

        given().contentType(ContentType.JSON).body("{\"email\":\"reset@example.com\"}")
                .when().post("/auth/forgot-password")
                .then().statusCode(200);

        String token = extractTokenFromEmail("reset@example.com");
        // token regex grabs first link; for reset email there is only one link.

        given().contentType(ContentType.JSON)
                .body("{\"token\":\"" + token + "\",\"password\":\"new-secret-1\"}")
                .when().post("/auth/reset-password")
                .then().statusCode(200);

        given().contentType(ContentType.JSON)
                .body("{\"email\":\"reset@example.com\",\"password\":\"new-secret-1\"}")
                .when().post("/auth/login")
                .then().statusCode(200);
    }

    @Test
    public void update_profile() {
        given().contentType(ContentType.JSON).body(registerPayload("prof@example.com"))
                .when().post("/auth/register").then().statusCode(201);
        String jwt = given().contentType(ContentType.JSON)
                .body("{\"email\":\"prof@example.com\",\"password\":\"secret123\"}")
                .when().post("/auth/login")
                .then().statusCode(200).extract().path("token");

        given().header("Authorization", "Bearer " + jwt).contentType(ContentType.JSON)
                .body("{\"firstName\":\"Ana Maria\",\"lastName\":\"Silva\"}")
                .when().put("/auth/profile")
                .then().statusCode(200)
                .body("firstName", equalTo("Ana Maria"));
    }
}
