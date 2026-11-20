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

import java.time.LocalDate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class WorkspaceSummaryTest {

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

    private void createTask(String auth, long projectId, String body) {
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body(body)
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(201);
    }

    private long userId(String auth) {
        return given().header("Authorization", auth)
                .when().get("/auth/me").then().statusCode(200)
                .extract().jsonPath().getLong("id");
    }

    // Scenario: Dashboard shows workspace stat cards
    @Test
    public void summary_returns_workspace_counts() {
        Response owner = registerVerifyLogin("s1@example.com", "Sum", "Mary");
        String auth = bearer(owner);
        long wsId = createWorkspace(auth, "Stats WS");
        long projectId = createProject(auth, wsId, "Proj");
        createProject(auth, wsId, "Proj2");

        LocalDate today = LocalDate.now();
        long ownerId = userId(auth);
        createTask(auth, projectId, "{\"title\":\"backlog task\",\"status\":\"backlog\"}");
        createTask(auth, projectId, "{\"title\":\"todo task\",\"status\":\"todo\"}");
        createTask(auth, projectId, "{\"title\":\"wip task\",\"status\":\"in_progress\"}");
        createTask(auth, projectId, "{\"title\":\"done task\",\"status\":\"done\"}");
        createTask(auth, projectId, "{\"title\":\"overdue\",\"status\":\"todo\",\"dueDate\":\"" + today.minusDays(3) + "\"}");
        createTask(auth, projectId, "{\"title\":\"due today\",\"status\":\"todo\",\"dueDate\":\"" + today + "\"}");
        createTask(auth, projectId, "{\"title\":\"due week\",\"status\":\"in_progress\",\"dueDate\":\"" + today.plusDays(5) + "\"}");
        createTask(auth, projectId, "{\"title\":\"due far\",\"status\":\"todo\",\"dueDate\":\"" + today.plusDays(30) + "\"}");
        createTask(auth, projectId, "{\"title\":\"done overdue\",\"status\":\"done\",\"dueDate\":\"" + today.minusDays(1) + "\"}");
        createTask(auth, projectId, "{\"title\":\"mine\",\"status\":\"todo\",\"assigneeId\":" + ownerId + "}");
        createTask(auth, projectId, "{\"title\":\"mine done\",\"status\":\"done\",\"assigneeId\":" + ownerId + "}");

        given().header("Authorization", auth)
                .when().get("/workspaces/" + wsId + "/summary")
                .then().statusCode(200)
                .body("projectCount", equalTo(2))
                .body("memberCount", equalTo(1))
                .body("tasksByStatus.backlog", equalTo(1))
                .body("tasksByStatus.todo", equalTo(5))
                .body("tasksByStatus.in_progress", equalTo(2))
                .body("tasksByStatus.done", equalTo(3))
                .body("overdueCount", equalTo(1))
                .body("dueSoonCount", equalTo(2))
                .body("myOpenTaskCount", equalTo(1));
    }

    // Scenario: Dashboard shows my open tasks for the caller
    @Test
    public void summary_my_open_tasks_counts_only_caller() {
        Response owner = registerVerifyLogin("s2@example.com", "Own", "Er");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Mine WS");
        long projectId = createProject(ownerAuth, wsId, "Proj");
        long ownerId = userId(ownerAuth);

        String memberAuth = addMember(ownerAuth, wsId, "mm2@example.com", "member");
        long memberId = userId(memberAuth);

        createTask(ownerAuth, projectId, "{\"title\":\"owner open\",\"status\":\"todo\",\"assigneeId\":" + ownerId + "}");
        createTask(ownerAuth, projectId, "{\"title\":\"member open\",\"status\":\"todo\",\"assigneeId\":" + memberId + "}");
        createTask(ownerAuth, projectId, "{\"title\":\"unassigned\",\"status\":\"todo\"}");

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/summary")
                .then().statusCode(200)
                .body("myOpenTaskCount", equalTo(1));

        given().header("Authorization", memberAuth)
                .when().get("/workspaces/" + wsId + "/summary")
                .then().statusCode(200)
                .body("myOpenTaskCount", equalTo(1))
                .body("memberCount", equalTo(2));
    }

    // Scenario: Summary endpoint enforces membership
    @Test
    public void summary_requires_membership() {
        Response owner = registerVerifyLogin("s3@example.com", "Own", "Er");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Private WS");

        Response stranger = registerVerifyLogin("s4@example.com", "Str", "El");
        String strangerAuth = bearer(stranger);

        given().header("Authorization", strangerAuth)
                .when().get("/workspaces/" + wsId + "/summary")
                .then().statusCode(403);

        given().header("Authorization", strangerAuth)
                .when().get("/workspaces/999999/summary")
                .then().statusCode(404);
    }

    // Cross-workspace isolation: counts only reflect the path workspace
    @Test
    public void summary_is_scoped_to_path_workspace() {
        Response owner = registerVerifyLogin("s5@example.com", "Iso", "Late");
        String auth = bearer(owner);
        long wsA = createWorkspace(auth, "WS A");
        long projA = createProject(auth, wsA, "Proj A");
        createTask(auth, projA, "{\"title\":\"task A\",\"status\":\"todo\"}");

        long wsB = createWorkspace(auth, "WS B");
        long projB = createProject(auth, wsB, "Proj B");
        createTask(auth, projB, "{\"title\":\"task B1\",\"status\":\"todo\"}");
        createTask(auth, projB, "{\"title\":\"task B2\",\"status\":\"done\"}");

        given().header("Authorization", auth)
                .when().get("/workspaces/" + wsA + "/summary")
                .then().statusCode(200)
                .body("projectCount", equalTo(1))
                .body("tasksByStatus.todo", equalTo(1))
                .body("tasksByStatus.done", equalTo(0));

        given().header("Authorization", auth)
                .when().get("/workspaces/" + wsB + "/summary")
                .then().statusCode(200)
                .body("projectCount", equalTo(1))
                .body("tasksByStatus.todo", equalTo(1))
                .body("tasksByStatus.done", equalTo(1));
    }
}
