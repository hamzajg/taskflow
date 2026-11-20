package com.taskflow;

import com.taskflow.model.Project;
import com.taskflow.model.Task;
import com.taskflow.model.User;
import com.taskflow.model.Workspace;
import com.taskflow.model.WorkspaceInvite;
import com.taskflow.model.WorkspaceMember;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class CommentResourceTest {

    private static final String PASS = "secret123";

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clearMail() {
        mailbox.clear();
        com.taskflow.model.Comment.deleteAll();
        Task.deleteAll();
        Project.deleteAll();
        WorkspaceInvite.deleteAll();
        WorkspaceMember.deleteAll();
        Workspace.deleteAll();
        User.deleteAll();
    }

    private Response registerVerifyLogin(String email, String first, String last) {
        given().contentType(ContentType.JSON)
                .body("""
                        {"firstName":"%s","lastName":"%s","email":"%s","password":"%s"}
                        """.formatted(first, last, email, PASS))
                .when().post("/auth/register").then().statusCode(201);

        var messages = mailbox.getMailsSentTo(email);
        assertFalse(messages.isEmpty(), "expected verification email for " + email);
        String body = messages.get(messages.size() - 1).getText();
        Matcher m = Pattern.compile("token=([A-Za-z0-9_\\-]+)").matcher(body);
        assertTrue(m.find());
        given().queryParam("token", m.group(1))
                .when().get("/auth/verify-email").then().statusCode(200);

        return given().contentType(ContentType.JSON)
                .body("{\"email\":\"" + email + "\",\"password\":\"" + PASS + "\"}")
                .when().post("/auth/login").then().statusCode(200)
                .extract().response();
    }

    private static String bearer(Response login) {
        return "Bearer " + login.jsonPath().getString("token");
    }

    private long createWorkspace(String auth, String name) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();
    }

    private String addMember(String ownerAuth, long wsId, String email, String role) {
        Response memberLogin = registerVerifyLogin(email, "Mem", "Ber");
        String memberAuth = bearer(memberLogin);
        String token = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"" + email + "\",\"role\":\"" + role + "\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201)
                .extract().path("token");
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"token\":\"" + token + "\"}")
                .when().post("/workspaces/invites/accept").then().statusCode(200);
        return memberAuth;
    }

    private long createProject(String auth, long wsId, String name) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\",\"description\":\"desc\"}")
                .when().post("/workspaces/" + wsId + "/projects")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    private long createTask(String auth, long projectId, String body) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body(body)
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    private long postComment(String auth, long taskId, String body) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"body\":\"" + body + "\"}")
                .when().post("/tasks/" + taskId + "/comments")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    // Scenario: Member posts a comment on a task in their workspace
    @Test
    public void member_posts_comment_and_lists_chronologically() {
        Response login = registerVerifyLogin("c1@example.com", "Cat", "One");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Comments WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "{\"title\":\"Discuss me\"}");

        long c1 = postComment(auth, taskId, "first thought");
        long c2 = postComment(auth, taskId, "second thought");

        given().header("Authorization", auth)
                .when().get("/tasks/" + taskId + "/comments")
                .then().statusCode(200)
                .body("comments", hasSize(2))
                .body("comments[0].id", equalTo((int) c1))
                .body("comments[1].id", equalTo((int) c2))
                .body("comments[0].body", equalTo("first thought"))
                .body("comments[0].authorName", notNullValue())
                .body("comments[0].createdAt", notNullValue())
                .body("hasMore", equalTo(false));
    }

    // Scenario: Empty or oversized comment body is rejected
    @Test
    public void invalid_comment_body_rejected() {
        Response login = registerVerifyLogin("c2@example.com", "Val", "Idate");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Valid WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "{\"title\":\"T\"}");

        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"body\":\"\"}")
                .when().post("/tasks/" + taskId + "/comments")
                .then().statusCode(400);

        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"body\":\"   \"}")
                .when().post("/tasks/" + taskId + "/comments")
                .then().statusCode(400);

        String huge = "x".repeat(5001);
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"body\":\"" + huge + "\"}")
                .when().post("/tasks/" + taskId + "/comments")
                .then().statusCode(400);

        given().header("Authorization", auth)
                .when().get("/tasks/" + taskId + "/comments")
                .then().statusCode(200)
                .body("comments", hasSize(0));
    }

    // Scenario: Non-member cannot read or post comments on workspace tasks
    @Test
    public void non_member_cannot_read_or_post_comments() {
        Response owner = registerVerifyLogin("co@example.com", "Own", "Er");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Private WS");
        long projectId = createProject(ownerAuth, wsId, "Proj");
        long taskId = createTask(ownerAuth, projectId, "{\"title\":\"T\"}");
        postComment(ownerAuth, taskId, "secret thread");

        Response stranger = registerVerifyLogin("cs@example.com", "Str", "Anger");
        String strangerAuth = bearer(stranger);

        given().header("Authorization", strangerAuth)
                .when().get("/tasks/" + taskId + "/comments")
                .then().statusCode(403);

        given().header("Authorization", strangerAuth).contentType(ContentType.JSON)
                .body("{\"body\":\"intrusion\"}")
                .when().post("/tasks/" + taskId + "/comments")
                .then().statusCode(403);
    }

    // Scenario: Cross-workspace comment isolation
    @Test
    public void cross_workspace_comment_isolation() {
        Response ownerA = registerVerifyLogin("ca@example.com", "A", "ye");
        String authA = bearer(ownerA);
        long wsA = createWorkspace(authA, "WS A");
        long projA = createProject(authA, wsA, "Proj A");
        long taskA = createTask(authA, projA, "{\"title\":\"Task A\"}");
        postComment(authA, taskA, "comment A");

        Response ownerB = registerVerifyLogin("cb@example.com", "B", "ee");
        String authB = bearer(ownerB);
        long wsB = createWorkspace(authB, "WS B");
        long projB = createProject(authB, wsB, "Proj B");
        long taskB = createTask(authB, projB, "{\"title\":\"Task B\"}");

        // member of B cannot touch A's task comments
        given().header("Authorization", authB)
                .when().get("/tasks/" + taskA + "/comments")
                .then().statusCode(403);
        given().header("Authorization", authB).contentType(ContentType.JSON)
                .body("{\"body\":\"cross post\"}")
                .when().post("/tasks/" + taskA + "/comments")
                .then().statusCode(403);

        // member of A cannot touch B's task comments either
        given().header("Authorization", authA)
                .when().get("/tasks/" + taskB + "/comments")
                .then().statusCode(403);
    }

    // Scenario: Author edits and deletes their own comment
    @Test
    public void author_edits_and_deletes_own_comment() {
        Response login = registerVerifyLogin("ce@example.com", "Ed", "Itor");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Edit WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "{\"title\":\"T\"}");
        long commentId = postComment(auth, taskId, "original body");

        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"body\":\"revised body\"}")
                .when().patch("/comments/" + commentId)
                .then().statusCode(200)
                .body("id", equalTo((int) commentId))
                .body("body", equalTo("revised body"))
                .body("updatedAt", notNullValue());

        given().header("Authorization", auth)
                .when().delete("/comments/" + commentId)
                .then().statusCode(204);

        given().header("Authorization", auth)
                .when().get("/tasks/" + taskId + "/comments")
                .then().statusCode(200)
                .body("comments", hasSize(0));
    }

    // Scenario: Non-author cannot edit another member's comment
    @Test
    public void non_author_cannot_edit_comment() {
        Response owner = registerVerifyLogin("on@example.com", "Own", "Er");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "AuthZ WS");
        long projectId = createProject(ownerAuth, wsId, "Proj");
        long taskId = createTask(ownerAuth, projectId, "{\"title\":\"T\"}");
        long commentId = postComment(ownerAuth, taskId, "owner says hi");

        String memberAuth = addMember(ownerAuth, wsId, "mm@example.com", "member");

        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"body\":\"hijacked\"}")
                .when().patch("/comments/" + commentId)
                .then().statusCode(403);

        given().header("Authorization", memberAuth)
                .when().get("/comments/" + commentId)
                .then().statusCode(200)
                .body("body", equalTo("owner says hi"));

        // member also cannot delete the owner's comment
        given().header("Authorization", memberAuth)
                .when().delete("/comments/" + commentId)
                .then().statusCode(403);
    }

    // Scenario: Workspace admin can moderate but not edit comments
    @Test
    public void admin_moderates_but_cannot_edit() {
        Response owner = registerVerifyLogin("mo@example.com", "Mod", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Mod WS");
        long projectId = createProject(ownerAuth, wsId, "Proj");
        long taskId = createTask(ownerAuth, projectId, "{\"title\":\"T\"}");
        long commentId = postComment(ownerAuth, taskId, "to be moderated");

        String adminAuth = addMember(ownerAuth, wsId, "ad@example.com", "admin");

        // admin cannot edit the member's comment body
        given().header("Authorization", adminAuth).contentType(ContentType.JSON)
                .body("{\"body\":\"admin rewrite\"}")
                .when().patch("/comments/" + commentId)
                .then().statusCode(403);

        // admin can delete it (moderation)
        given().header("Authorization", adminAuth)
                .when().delete("/comments/" + commentId)
                .then().statusCode(204);

        given().header("Authorization", ownerAuth)
                .when().get("/tasks/" + taskId + "/comments")
                .then().statusCode(200)
                .body("comments", hasSize(0));
    }

    // Deleting a task removes its comments (composite FK cascade)
    @Test
    public void task_delete_cascades_comments() {
        Response login = registerVerifyLogin("cc@example.com", "Cas", "Cade");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Cascade WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "{\"title\":\"T\"}");
        postComment(auth, taskId, "doomed comment");

        given().header("Authorization", auth)
                .when().delete("/tasks/" + taskId)
                .then().statusCode(204);

        assertEquals(0, com.taskflow.model.Comment.count());
    }
}
