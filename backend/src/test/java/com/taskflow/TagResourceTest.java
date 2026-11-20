package com.taskflow;

import com.taskflow.model.Project;
import com.taskflow.model.Tag;
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

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class TagResourceTest {

    private static final String PASS = "secret123";

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clearMail() {
        mailbox.clear();
        Tag.deleteAll();
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
                .body("{\"name\":\"" + name + "\"}")
                .when().post("/workspaces/" + wsId + "/projects")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    private long createTag(String auth, long wsId, String title, String color) {
        return ((Number) given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"title\":\"" + title + "\",\"color\":\"" + color + "\"}")
                .when().post("/workspaces/" + wsId + "/tags")
                .then().statusCode(201)
                .extract().path("id")).longValue();
    }

    // Scenario: Members can list workspace tags
    @Test
    public void members_can_list_workspace_tags() {
        Response owner = registerVerifyLogin("t1@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        createTag(ownerAuth, wsId, "Client X", "#3366ff");

        String memberAuth = addMember(ownerAuth, wsId, "tm1@example.com", "member");

        given().header("Authorization", memberAuth)
                .when().get("/workspaces/" + wsId + "/tags")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].title", equalTo("Client X"))
                .body("[0].color", equalTo("#3366ff"));
    }

    // Scenario: Owner creates a tag
    @Test
    public void owner_creates_a_tag() {
        Response owner = registerVerifyLogin("t2@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"Internal\",\"color\":null}")
                .when().post("/workspaces/" + wsId + "/tags")
                .then().statusCode(201)
                .body("title", equalTo("Internal"));

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/tags")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].title", equalTo("Internal"));
    }

    // Scenario: Member cannot mutate tags
    @Test
    public void member_cannot_mutate_tags() {
        Response owner = registerVerifyLogin("t3@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        long tagId = createTag(ownerAuth, wsId, "Client X", null);
        String memberAuth = addMember(ownerAuth, wsId, "tm3@example.com", "member");

        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"Nope\"}")
                .when().post("/workspaces/" + wsId + "/tags")
                .then().statusCode(403);

        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"Renamed\"}")
                .when().put("/workspaces/" + wsId + "/tags/" + tagId)
                .then().statusCode(403);

        given().header("Authorization", memberAuth)
                .when().delete("/workspaces/" + wsId + "/tags/" + tagId)
                .then().statusCode(403);

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/tags")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].title", equalTo("Client X"));
    }

    // Scenario: Duplicate tag titles are rejected
    @Test
    public void duplicate_tag_titles_are_rejected() {
        Response owner = registerVerifyLogin("t4@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        createTag(ownerAuth, wsId, "Client X", null);

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"client x\"}")
                .when().post("/workspaces/" + wsId + "/tags")
                .then().statusCode(409);

        // same title in a different workspace is fine
        long ws2 = createWorkspace(ownerAuth, "Other WS");
        createTag(ownerAuth, ws2, "Client X", null);

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/tags")
                .then().statusCode(200)
                .body("$", hasSize(1));
    }

    // Scenario: Invalid tag input is rejected
    @Test
    public void invalid_tag_input_is_rejected() {
        Response owner = registerVerifyLogin("t5@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"\"}")
                .when().post("/workspaces/" + wsId + "/tags")
                .then().statusCode(400);

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"" + "x".repeat(51) + "\"}")
                .when().post("/workspaces/" + wsId + "/tags")
                .then().statusCode(400);
    }

    // Scenario: Assign tags to a project
    @Test
    public void assign_tags_to_a_project() {
        Response owner = registerVerifyLogin("t6@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        long t1 = createTag(ownerAuth, wsId, "Client X", "#111");
        long t2 = createTag(ownerAuth, wsId, "Internal", "#222");
        long p = createProject(ownerAuth, wsId, "Website");

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + t1 + "," + t2 + "]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200)
                .body("tags.title", containsInAnyOrder("Client X", "Internal"));

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + t1 + "]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200)
                .body("tags", hasSize(1))
                .body("tags[0].title", equalTo("Client X"));

        // absent tagIds leaves assignments unchanged
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"Renamed\"}")
                .when().put("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200)
                .body("name", equalTo("Renamed"))
                .body("tags", hasSize(1));

        // empty array clears
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200)
                .body("tags", hasSize(0));
    }

    // Scenario: Reject foreign-workspace tag ids
    @Test
    public void reject_foreign_workspace_tag_ids() {
        Response owner = registerVerifyLogin("t7@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsA = createWorkspace(ownerAuth, "WS A");
        long wsB = createWorkspace(ownerAuth, "WS B");
        long foreignTag = createTag(ownerAuth, wsB, "Foreign", null);
        long p = createProject(ownerAuth, wsA, "In A");

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + foreignTag + "]}")
                .when().put("/workspaces/" + wsA + "/projects/" + p)
                .then().statusCode(400);

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsA + "/projects/" + p)
                .then().statusCode(200)
                .body("tags", hasSize(0));
    }

    // Scenario: Deleting a tag detaches it from projects
    @Test
    public void deleting_a_tag_detaches_it_from_projects() {
        Response owner = registerVerifyLogin("t8@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        long tagId = createTag(ownerAuth, wsId, "Doomed", null);
        long p = createProject(ownerAuth, wsId, "Keeps going");
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + tagId + "]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200);

        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/tags/" + tagId)
                .then().statusCode(204);

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200)
                .body("tags", hasSize(0));

        assertEquals(0, Tag.count("id", tagId));
    }

    // Scenario: Deleting a project removes tag assignments
    @Test
    public void deleting_a_project_removes_tag_assignments() {
        Response owner = registerVerifyLogin("t9@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        long tagId = createTag(ownerAuth, wsId, "Survivor", null);
        long p = createProject(ownerAuth, wsId, "Temp");
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + tagId + "]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(200);

        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/projects/" + p)
                .then().statusCode(204);

        // tag still exists and is assignable to a new project
        long p2 = createProject(ownerAuth, wsId, "New");
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + tagId + "]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p2)
                .then().statusCode(200)
                .body("tags", hasSize(1));

        // and the orphaned pivot row is really gone (re-assign same tag twice would
        // violate PK if the old row survived)
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"tagIds\":[" + tagId + "]}")
                .when().put("/workspaces/" + wsId + "/projects/" + p2)
                .then().statusCode(200)
                .body("tags", hasSize(1));
    }

    // Extra: rename/recolor covered by owner/admin mutation path
    @Test
    public void owner_can_rename_and_recolor_a_tag() {
        Response owner = registerVerifyLogin("t10@example.com", "Tag", "Owner");
        String ownerAuth = bearer(owner);
        long wsId = createWorkspace(ownerAuth, "Tag WS");
        long tagId = createTag(ownerAuth, wsId, "Old", "#000");

        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"title\":\"New\",\"color\":\"#fff\"}")
                .when().put("/workspaces/" + wsId + "/tags/" + tagId)
                .then().statusCode(200)
                .body("title", equalTo("New"))
                .body("color", equalTo("#fff"));

        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/tags/" + tagId)
                .then().statusCode(204);
    }
}
