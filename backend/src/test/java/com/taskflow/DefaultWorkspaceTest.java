package com.taskflow;

import com.taskflow.model.User;
import com.taskflow.model.Workspace;
import com.taskflow.model.WorkspaceInvite;
import com.taskflow.model.WorkspaceMember;
import com.taskflow.service.JwtService;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class DefaultWorkspaceTest {

    private static final String PASS = "secret123";

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clean() {
        mailbox.clear();
        WorkspaceInvite.deleteAll();
        WorkspaceMember.deleteAll();
        Workspace.deleteAll();
        User.deleteAll();
    }

    private void register(String email, String firstName) {
        given().contentType(ContentType.JSON)
                .body("""
                        {"firstName":"%s","lastName":"T","email":"%s","password":"%s"}
                        """.formatted(firstName, email, PASS))
                .when().post("/auth/register").then().statusCode(201);
    }

    private String verifyToken(String email) {
        var messages = mailbox.getMailsSentTo(email);
        assertFalse(messages.isEmpty(), "expected verification email to " + email);
        String body = messages.get(messages.size() - 1).getText();
        Matcher m = Pattern.compile("token=([A-Za-z0-9_\\-]+)").matcher(body);
        assertTrue(m.find(), "verification link not found in email body");
        return m.group(1);
    }

    private void verify(String email) {
        given().queryParam("token", verifyToken(email))
                .when().get("/auth/verify-email").then().statusCode(200);
    }

    private Response login(String email) {
        return given().contentType(ContentType.JSON)
                .body("{\"email\":\"" + email + "\",\"password\":\"" + PASS + "\"}")
                .when().post("/auth/login");
    }

    private static String bearer(Response login) {
        return "Bearer " + login.jsonPath().getString("token");
    }

    /** register + verify + login — the standard new-user path. */
    private Response registerVerifyLogin(String email, String firstName) {
        register(email, firstName);
        verify(email);
        Response res = login(email);
        assertEquals(200, res.statusCode());
        return res;
    }

    // Scenario: Login provisions a default workspace for a user with no memberships
    @Test
    public void login_provisions_default_workspace_for_new_user() {
        Response res = registerVerifyLogin("ana@example.com", "Ana");

        given().header("Authorization", bearer(res))
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].name", equalTo("Ana's Workspace"))
                .body("[0].role", equalTo("owner"))
                .body("[0].memberCount", equalTo(1));
    }

    // Scenario: Over-long first names cannot break login
    @Test
    public void over_long_first_names_cannot_break_login() {
        String longFirst = "A".repeat(250);
        registerVerifyLogin("long@example.com", longFirst);

        String jwt = login("long@example.com").jsonPath().getString("token");
        String name = given().header("Authorization", "Bearer " + jwt)
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .extract().path("[0].name");
        assertNotNull(name);
        assertTrue(name.length() <= 255, "workspace name exceeds column: " + name.length());
        assertTrue(name.endsWith("'s Workspace"));
    }

    @Test
    public void default_workspace_name_falls_back_when_first_name_blank() {
        // @NotBlank blocks blank names via the API; exercise the naming rule
        // directly against an unpersisted user.
        User blank = new User();
        blank.firstName = "   ";
        assertEquals("My Workspace",
                com.taskflow.service.DefaultWorkspaceService.defaultName(blank));

        User named = new User();
        named.firstName = "Ada";
        assertEquals("Ada's Workspace",
                com.taskflow.service.DefaultWorkspaceService.defaultName(named));
    }

    // Scenario: Repeat logins do not duplicate the default workspace
    @Test
    public void repeat_logins_do_not_duplicate_workspace() {
        registerVerifyLogin("rep@example.com", "Rep");
        String jwt = login("rep@example.com").jsonPath().getString("token");
        assertEquals(200, login("rep@example.com").statusCode());
        assertEquals(200, login("rep@example.com").statusCode());

        given().header("Authorization", "Bearer " + jwt)
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1));
    }

    // Scenario: Users with existing workspaces get no extra workspace
    @Test
    public void user_with_existing_membership_gets_no_extra_workspace() {
        // Legacy-style user: verified account + one membership, created
        // directly so provisioning must observe the membership and skip.
        QuarkusTransaction.requiringNew().run(() -> {
            User u = new User();
            u.email = "legacy@example.com";
            u.password = JwtService.hashPassword(PASS);
            u.firstName = "Leg";
            u.lastName = "Acy";
            u.verifiedAt = Instant.now();
            u.persist();
            Workspace ws = new Workspace();
            ws.name = "Old WS";
            ws.ownerId = u.id;
            ws.persist();
            WorkspaceMember m = new WorkspaceMember();
            m.workspaceId = ws.id;
            m.userId = u.id;
            m.role = WorkspaceMember.ROLE_OWNER;
            m.persist();
        });

        Response res = login("legacy@example.com");
        assertEquals(200, res.statusCode());

        given().header("Authorization", bearer(res))
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].name", equalTo("Old WS"));
    }

    // Scenario: Legacy user with no memberships gets a default workspace on login
    @Test
    public void legacy_user_with_no_memberships_gets_default_on_login() {
        QuarkusTransaction.requiringNew().run(() -> {
            User u = new User();
            u.email = "old@example.com";
            u.password = JwtService.hashPassword(PASS);
            u.firstName = "Old";
            u.lastName = "Timer";
            u.verifiedAt = Instant.now();
            u.persist();
        });

        Response res = login("old@example.com");
        assertEquals(200, res.statusCode());

        given().header("Authorization", bearer(res))
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].name", equalTo("Old's Workspace"))
                .body("[0].role", equalTo("owner"));
    }

    // Scenario: Unverified user receives a default workspace on login
    @Test
    public void unverified_user_gets_workspace_at_data_layer() {
        register("unv@example.com", "Unv");
        Response res = login("unv@example.com");
        assertEquals(200, res.statusCode());

        // API still gated until verification.
        given().header("Authorization", bearer(res))
                .when().get("/workspaces")
                .then().statusCode(403);

        // …but the membership was provisioned at login; it appears after verify.
        verify("unv@example.com");
        given().header("Authorization", bearer(res))
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].name", equalTo("Unv's Workspace"));
    }

    // Scenario: Concurrent first logins provision at most one workspace
    @Test
    public void concurrent_first_logins_provision_at_most_one() throws Exception {
        // Zero-membership user created directly, then two logins race.
        QuarkusTransaction.requiringNew().run(() -> {
            User u = new User();
            u.email = "race2@example.com";
            u.password = JwtService.hashPassword(PASS);
            u.firstName = "Race";
            u.lastName = "Two";
            u.verifiedAt = Instant.now();
            u.persist();
        });

        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        try {
            Future<Response> f1 = pool.submit(() -> {
                ready.countDown();
                go.await();
                return login("race2@example.com");
            });
            Future<Response> f2 = pool.submit(() -> {
                ready.countDown();
                go.await();
                return login("race2@example.com");
            });
            ready.await();
            go.countDown();
            assertEquals(200, f1.get().statusCode());
            assertEquals(200, f2.get().statusCode());
        } finally {
            pool.shutdown();
        }

        Response res = login("race2@example.com");
        given().header("Authorization", bearer(res))
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1));
    }
}
