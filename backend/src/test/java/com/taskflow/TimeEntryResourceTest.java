package com.taskflow;

import com.taskflow.model.Project;
import com.taskflow.model.Task;
import com.taskflow.model.TimeEntry;
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
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class TimeEntryResourceTest {

    private static final String PASS = "secret123";

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clearMail() {
        mailbox.clear();
        TimeEntry.deleteAll();
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
        assertFalse(messages.isEmpty());
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

    private long createTask(String auth, long projectId, String title) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"title\":\"" + title + "\"}")
                .when().post("/projects/" + projectId + "/tasks")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    private long logEntry(String auth, long taskId, int minutes, String extra) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"entryDate\":\"" + java.time.LocalDate.now() + "\",\"minutes\":"
                        + minutes + (extra == null ? "" : "," + extra) + "}")
                .when().post("/tasks/" + taskId + "/time-entries")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    // Scenario: Member lists time entries on a task in their workspace
    @Test
    public void member_lists_entries_and_total_minutes_on_task() {
        Response login = registerVerifyLogin("te1@example.com", "Tim", "One");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Time WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "Timed task");

        logEntry(auth, taskId, 45, null);
        logEntry(auth, taskId, 15, "\"description\":\"review\"");

        given().header("Authorization", auth)
                .when().get("/tasks/" + taskId + "/time-entries")
                .then().statusCode(200)
                .body("entries", hasSize(2))
                .body("entries[0].minutes", is(15))
                .body("entries[1].minutes", is(45))
                .body("entries[1].taskTitle", is("Timed task"))
                .body("entries[1].userName", is("Tim One"))
                .body("running", nullValue());

        // task DTOs carry the grouped total
        given().header("Authorization", auth)
                .when().get("/projects/" + projectId + "/tasks")
                .then().statusCode(200)
                .body("[0].totalMinutes", is(60));
    }

    // Scenario: Member logs a manual entry; invalid input rejected
    @Test
    public void member_creates_manual_entry_and_validates_input() {
        Response login = registerVerifyLogin("te2@example.com", "Man", "Ual");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Manual WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "Manual task");

        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"entryDate\":\"" + java.time.LocalDate.now() + "\",\"minutes\":30,"
                        + "\"description\":\"deep work\"}")
                .when().post("/tasks/" + taskId + "/time-entries")
                .then().statusCode(201)
                .body("minutes", is(30))
                .body("running", is(false));

        // zero minutes rejected
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"entryDate\":\"" + java.time.LocalDate.now() + "\",\"minutes\":0}")
                .when().post("/tasks/" + taskId + "/time-entries")
                .then().statusCode(400);

        // over cap rejected
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"entryDate\":\"" + java.time.LocalDate.now() + "\",\"minutes\":1441}")
                .when().post("/tasks/" + taskId + "/time-entries")
                .then().statusCode(400);

        // future date rejected
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"entryDate\":\"2099-01-01\",\"minutes\":30}")
                .when().post("/tasks/" + taskId + "/time-entries")
                .then().statusCode(400);

        // missing date rejected
        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"minutes\":30}")
                .when().post("/tasks/" + taskId + "/time-entries")
                .then().statusCode(400);
    }

    // Scenario: Author edits own entry; others cannot; admin deletes any
    @Test
    public void author_edits_own_entry_member_cannot_admin_can_delete() {
        Response ownerLogin = registerVerifyLogin("te3o@example.com", "Own", "Er");
        String ownerAuth = bearer(ownerLogin);
        long wsId = createWorkspace(ownerAuth, "Authz WS");
        long projectId = createProject(ownerAuth, wsId, "Proj");
        long taskId = createTask(ownerAuth, projectId, "Authz task");
        String memberAuth = addMember(ownerAuth, wsId, "te3m@example.com", "member");

        // member logs an entry
        long entryId = logEntry(memberAuth, taskId, 60, null);

        // member edits own entry
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"minutes\":90}")
                .when().patch("/time-entries/" + entryId)
                .then().statusCode(200)
                .body("minutes", is(90));

        // owner (admin path) deletes the member's entry — but first re-log
        // since PATCH validation below needs a live entry
        long entry2 = logEntry(memberAuth, taskId, 30, null);
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"description\":\"" + "x".repeat(501) + "\"}")
                .when().patch("/time-entries/" + entry2)
                .then().statusCode(400);
        given().header("Authorization", memberAuth)
                .when().delete("/time-entries/" + entry2)
                .then().statusCode(204);

        // owner cannot edit the member's entry
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"minutes\":5}")
                .when().patch("/time-entries/" + entryId)
                .then().statusCode(403);

        // owner (admin path) deletes the member's entry
        given().header("Authorization", ownerAuth)
                .when().delete("/time-entries/" + entryId)
                .then().statusCode(204);
        assertEquals(0, TimeEntry.count());
    }

    // Scenario: Timer start/stop computes minutes; one running timer per user
    @Test
    public void timer_start_stop_computes_minutes_and_running_is_global() {
        Response login = registerVerifyLogin("te4@example.com", "Tim", "Er");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Timer WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskA = createTask(auth, projectId, "Task A");
        long taskB = createTask(auth, projectId, "Task B");

        // no running timer initially (null entity → 204)
        given().header("Authorization", auth)
                .when().get("/time-entries/running")
                .then().statusCode(204);

        // stop with nothing running → 409
        given().header("Authorization", auth).contentType(ContentType.JSON).body("{}")
                .when().post("/time-entries/timer/stop")
                .then().statusCode(409);

        // start on task A
        given().header("Authorization", auth).contentType(ContentType.JSON).body("{}")
                .when().post("/tasks/" + taskA + "/time-entries/timer/start")
                .then().statusCode(201)
                .body("running", is(true))
                .body("taskId", is((int) taskA))
                .body("minutes", nullValue());

        // running timer discoverable globally
        given().header("Authorization", auth)
                .when().get("/time-entries/running")
                .then().statusCode(200)
                .body("taskId", is((int) taskA))
                .body("running", is(true));

        // second start on task B → 409 naming the existing task
        given().header("Authorization", auth).contentType(ContentType.JSON).body("{}")
                .when().post("/tasks/" + taskB + "/time-entries/timer/start")
                .then().statusCode(409)
                .body("taskId", is((int) taskA));

        // stop computes minutes (elapsed ~0s → min 1)
        given().header("Authorization", auth).contentType(ContentType.JSON).body("{}")
                .when().post("/time-entries/timer/stop")
                .then().statusCode(200)
                .body("running", is(false))
                .body("minutes", greaterThanOrEqualTo(1))
                .body("endedAt", notNullValue());

        // running now null
        given().header("Authorization", auth)
                .when().get("/time-entries/running")
                .then().statusCode(204);
    }

    // Scenario: Running timer blocks edit/delete until stopped
    @Test
    public void running_entry_cannot_be_edited_or_deleted() {
        Response login = registerVerifyLogin("te5@example.com", "Run", "Ning");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Run WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "Running task");

        long entryId = ((Number) given().header("Authorization", auth)
                .contentType(ContentType.JSON).body("{}")
                .when().post("/tasks/" + taskId + "/time-entries/timer/start")
                .then().statusCode(201)
                .extract().path("id")).longValue();

        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"minutes\":30}")
                .when().patch("/time-entries/" + entryId)
                .then().statusCode(409);

        given().header("Authorization", auth)
                .when().delete("/time-entries/" + entryId)
                .then().statusCode(409);
    }

    // Scenario: Task deletion cascades time entries
    @Test
    public void deleting_task_removes_its_time_entries() {
        Response login = registerVerifyLogin("te6@example.com", "Cas", "Cade");
        String auth = bearer(login);
        long wsId = createWorkspace(auth, "Cascade WS");
        long projectId = createProject(auth, wsId, "Proj");
        long taskId = createTask(auth, projectId, "Doomed task");
        logEntry(auth, taskId, 10, null);

        given().header("Authorization", auth)
                .when().delete("/tasks/" + taskId)
                .then().statusCode(204);

        assertEquals(0, TimeEntry.count());
    }
}
