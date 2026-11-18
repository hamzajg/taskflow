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
public class ProjectTaskResourceTest {

    private static final String PASS = "secret123";

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clearMail() {
        mailbox.clear();
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

    /** Owner invites + member accepts; returns the member's auth header. */
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

    // Scenario: Member creates and manages a project in their workspace
    @Test
    public void member_creates_and_manages_a_project() {
        Response login = registerVerifyLogin("p1@example.com", "Pat", "One");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Proj WS");

        long projectId = createProject(auth, wsId, "Website Redesign");

        given().header("Authorization", auth)
                .when().get("/workspaces/" + wsId + "/projects")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].name", equalTo("Website Redesign"))
                .body("[0].taskCount", equalTo(0));

        given().header("Authorization", auth)
                .when().get("/workspaces/" + wsId + "/projects/" + projectId)
                .then().statusCode(200)
                .body("name", equalTo("Website Redesign"));
    }

    // Scenario: Non-member cannot see or touch workspace projects
    @Test
    public void non_member_cannot_see_projects() {
        Response owner = registerVerifyLogin("o2@example.com", "Ola", "Two");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Secret WS");
        long projectId = createProject(ownerAuth, wsId, "Hidden");

        Response stranger = registerVerifyLogin("s2@example.com", "Sam", "Stranger");
        String strangerAuth = bearer(stranger);

        given().header("Authorization", strangerAuth)
                .when().get("/workspaces/" + wsId + "/projects")
                .then().statusCode(403);

        given().header("Authorization", strangerAuth)
                .when().get("/workspaces/" + wsId + "/projects/" + projectId)
                .then().statusCode(403);
    }

    // Scenario: Member creates a task with full fields
    @Test
    public void member_creates_task_with_full_fields() {
        Response login = registerVerifyLogin("p3@example.com", "Tom", "Task");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Tasks WS");
        long projectId = createProject(auth, wsId, "App");
        long memberId = login.jsonPath().getLong("user.id");

        long taskId = createTask(auth, projectId,
                "{\"title\":\"Build login\",\"description\":\"OAuth flow\","
                        + "\"status\":\"in_progress\",\"priority\":\"high\","
                        + "\"assigneeId\":" + memberId + ",\"dueDate\":\"2026-12-01\"}");

        given().header("Authorization", auth)
                .when().get("/projects/" + projectId + "/tasks")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].title", equalTo("Build login"))
                .body("[0].status", equalTo("in_progress"))
                .body("[0].priority", equalTo("high"))
                .body("[0].assigneeId", equalTo((int) memberId))
                .body("[0].dueDate", equalTo("2026-12-01"));

        // invalid status / priority rejected
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"title\":\"Bad status\",\"status\":\"bogus\"}")
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(400);
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"title\":\"Bad prio\",\"priority\":\"mega\"}")
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(400);
        assertNotNull(taskId);
    }

    // Scenario: Assignee must be a workspace member
    @Test
    public void assignee_must_be_workspace_member() {
        Response owner = registerVerifyLogin("o4@example.com", "Oli", "Four");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Assign WS");
        long projectId = createProject(ownerAuth, wsId, "Proj");

        Response outsider = registerVerifyLogin("out4@example.com", "Out", "Sider");
        long outsiderId = outsider.jsonPath().getLong("user.id");

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"Task\",\"assigneeId\":" + outsiderId + "}")
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(400);

        // a real member assignee is accepted
        String memberAuth = addMember(ownerAuth, wsId, "in4@example.com", "member");
        long memberUserId = given().header("Authorization", memberAuth)
                .when().get("/auth/me").then().statusCode(200)
                .extract().jsonPath().getLong("id");

        long taskId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"Task\",\"assigneeId\":" + memberUserId + "}")
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(201)
                .extract().path("id")).longValue();

        // updating to a non-member assignee is rejected
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"assigneeId\":" + outsiderId + "}")
                .when().patch("/tasks/" + taskId)
                .then().statusCode(400);
    }

    // Scenario: Member can delete tasks but not projects
    @Test
    public void member_can_delete_tasks_but_not_projects() {
        Response owner = registerVerifyLogin("o5@example.com", "Own", "Five");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Del WS");
        long projectId = createProject(ownerAuth, wsId, "Del Proj");

        String memberAuth = addMember(ownerAuth, wsId, "m5@example.com", "member");
        long taskId = createTask(memberAuth, projectId, "{\"title\":\"Temp task\"}");

        given().header("Authorization", memberAuth)
                .when().delete("/tasks/" + taskId)
                .then().statusCode(204);

        given().header("Authorization", memberAuth)
                .when().get("/projects/" + projectId + "/tasks")
                .then().statusCode(200)
                .body("$", hasSize(0));

        given().header("Authorization", memberAuth)
                .when().delete("/workspaces/" + wsId + "/projects/" + projectId)
                .then().statusCode(403);
    }

    // Scenario: Cross-workspace isolation on tasks and projects
    @Test
    public void cross_workspace_isolation() {
        Response ownerA = registerVerifyLogin("oa@example.com", "A", "One");
        String authA = bearer(ownerA);
        long wsA = createWorkspace(authA, "WS A");
        long projA = createProject(authA, wsA, "Proj A");
        long taskA = createTask(authA, projA, "{\"title\":\"Task A\"}");

        Response ownerB = registerVerifyLogin("ob@example.com", "B", "Two");
        String authB = bearer(ownerB);
        long wsB = createWorkspace(authB, "WS B");
        long projB = createProject(authB, wsB, "Proj B");
        long taskB = createTask(authB, projB, "{\"title\":\"Task B\"}");

        // member of B cannot reach A's resources
        given().header("Authorization", authB)
                .when().get("/workspaces/" + wsA + "/projects")
                .then().statusCode(403);
        given().header("Authorization", authB)
                .when().get("/workspaces/" + wsA + "/projects/" + projA)
                .then().statusCode(403);
        given().header("Authorization", authB)
                .when().get("/projects/" + projA + "/tasks")
                .then().statusCode(403);
        given().header("Authorization", authB)
                .when().get("/tasks/" + taskA)
                .then().statusCode(403);
        given().header("Authorization", authB).contentType(ContentType.JSON)
                .body("{\"status\":\"done\"}")
                .when().patch("/tasks/" + taskA + "/move")
                .then().statusCode(403);
        given().header("Authorization", authB)
                .when().delete("/tasks/" + taskA)
                .then().statusCode(403);
        assertNotEquals(projA, projB);
        assertNotEquals(taskA, taskB);
    }

    // Scenario: Delete permissions respect roles
    @Test
    public void delete_permissions_respect_roles() {
        Response owner = registerVerifyLogin("o7@example.com", "Ol", "Seven");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Role WS");

        // member cannot delete a project
        long projMember = createProject(ownerAuth, wsId, "Member del");
        String memberAuth = addMember(ownerAuth, wsId, "m7@example.com", "member");
        given().header("Authorization", memberAuth)
                .when().delete("/workspaces/" + wsId + "/projects/" + projMember)
                .then().statusCode(403);

        // admin can delete a project
        long projAdmin = createProject(ownerAuth, wsId, "Admin del");
        String adminAuth = addMember(ownerAuth, wsId, "a7@example.com", "admin");
        given().header("Authorization", adminAuth)
                .when().delete("/workspaces/" + wsId + "/projects/" + projAdmin)
                .then().statusCode(204);

        // owner can delete a project (cascades tasks)
        long projOwner = createProject(ownerAuth, wsId, "Owner del");
        createTask(ownerAuth, projOwner, "{\"title\":\"child\"}");
        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/projects/" + projOwner)
                .then().statusCode(204);
        given().header("Authorization", ownerAuth)
                .when().get("/projects/" + projOwner + "/tasks")
                .then().statusCode(404);
    }
}
