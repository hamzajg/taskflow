package com.taskflow;

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
public class WorkspaceResourceTest {

    private static final String PASS = "secret123";

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    @Transactional
    void clearMail() {
        mailbox.clear();
        WorkspaceInvite.deleteAll();
        WorkspaceMember.deleteAll();
        Workspace.deleteAll();
        User.deleteAll();
    }

    /** Register + verify via the real email-token flow + login. */
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

    @Test
    public void create_workspace_makes_caller_owner() {
        Response login = registerVerifyLogin("owner1@example.com", "Olivia", "Owner");
        String auth = bearer(login);

        given().header("Authorization", auth).contentType(ContentType.JSON)
                .body("{\"name\":\"Acme Team\"}")
                .when().post("/workspaces")
                .then().statusCode(201)
                .body("name", equalTo("Acme Team"))
                .body("role", equalTo("owner"))
                .body("memberCount", equalTo(1));

        given().header("Authorization", auth)
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1));
    }

    @Test
    public void invite_accept_and_member_removal_flow() {
        Response ownerLogin = registerVerifyLogin("boss@example.com", "Bob", "Boss");
        String ownerAuth = bearer(ownerLogin);
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"Studio\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        Response memberLogin = registerVerifyLogin("member@example.com", "Mia", "Member");
        String memberAuth = bearer(memberLogin);

        String inviteToken = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"member@example.com\",\"role\":\"member\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201)
                .extract().path("token");
        assertNotNull(inviteToken);

        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"token\":\"" + inviteToken + "\"}")
                .when().post("/workspaces/invites/accept")
                .then().statusCode(200)
                .body("id", equalTo((int) wsId))
                .body("role", equalTo("member"));

        given().header("Authorization", memberAuth)
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1));

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/members")
                .then().statusCode(200)
                .body("$", hasSize(2));

        long memberId = memberLogin.jsonPath().getLong("user.id");
        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/members/" + memberId)
                .then().statusCode(204);

        given().header("Authorization", memberAuth)
                .when().get("/workspaces/" + wsId + "/members")
                .then().statusCode(403);
    }

    @Test
    public void non_member_cannot_access_workspace() {
        registerVerifyLogin("a@example.com", "Ann", "A");
        Response strangerLogin = registerVerifyLogin("stranger@example.com", "Sid", "Stranger");
        String strangerAuth = bearer(strangerLogin);

        Response ownerLogin = registerVerifyLogin("b@example.com", "Ben", "B");
        long wsId = ((Number) given().header("Authorization", bearer(ownerLogin)).contentType(ContentType.JSON)
                .body("{\"name\":\"Private\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        given().header("Authorization", strangerAuth)
                .when().get("/workspaces/" + wsId)
                .then().statusCode(403);
    }

    @Test
    public void unverified_user_cannot_create_workspace() {
        given().contentType(ContentType.JSON)
                .body("{\"firstName\":\"New\",\"lastName\":\"User\",\"email\":\"unv@example.com\",\"password\":\"secret123\"}")
                .when().post("/auth/register").then().statusCode(201);
        String jwt = given().contentType(ContentType.JSON)
                .body("{\"email\":\"unv@example.com\",\"password\":\"secret123\"}")
                .when().post("/auth/login").then().statusCode(200)
                .extract().path("token");

        given().header("Authorization", "Bearer " + jwt).contentType(ContentType.JSON)
                .body("{\"name\":\"Nope\"}")
                .when().post("/workspaces")
                .then().statusCode(403);
    }

    @Test
    public void member_cannot_escalate_privileges() {
        Response ownerLogin = registerVerifyLogin("esc-owner@example.com", "Eve", "Owner");
        String ownerAuth = bearer(ownerLogin);
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"Escalation\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        Response memberLogin = registerVerifyLogin("esc-member@example.com", "Max", "Member");
        String memberAuth = bearer(memberLogin);
        long memberId = memberLogin.jsonPath().getLong("user.id");

        String inviteToken = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"esc-member@example.com\",\"role\":\"member\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201)
                .extract().path("token");
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"token\":\"" + inviteToken + "\"}")
                .when().post("/workspaces/invites/accept")
                .then().statusCode(200);

        // A plain member cannot rename, delete, invite, or remove anyone.
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"Hijacked\"}")
                .when().put("/workspaces/" + wsId)
                .then().statusCode(403);
        given().header("Authorization", memberAuth)
                .when().delete("/workspaces/" + wsId)
                .then().statusCode(403);
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"x@example.com\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(403);
        given().header("Authorization", memberAuth)
                .when().delete("/workspaces/" + wsId + "/members/" + memberId)
                .then().statusCode(403);

        // Invites cannot mint the owner role or unknown roles either.
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"new1@example.com\",\"role\":\"owner\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(400);
        given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"new2@example.com\",\"role\":\"superadmin\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(400);
    }

    @Test
    public void invite_email_mismatch_is_rejected() {
        Response ownerLogin = registerVerifyLogin("inv-owner@example.com", "Ivy", "Owner");
        String ownerAuth = bearer(ownerLogin);
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"InviteOnly\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        String inviteToken = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"intended@example.com\",\"role\":\"member\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201)
                .extract().path("token");

        // A different verified user must not be able to redeem the invite.
        Response wrongLogin = registerVerifyLogin("wrong@example.com", "Will", "Wrong");
        given().header("Authorization", bearer(wrongLogin)).contentType(ContentType.JSON)
                .body("{\"token\":\"" + inviteToken + "\"}")
                .when().post("/workspaces/invites/accept")
                .then().statusCode(403);
    }

    @Test
    public void workspace_isolation() {
        Response ownerA = registerVerifyLogin("iso-a@example.com", "Ivy", "A");
        long wsA = ((Number) given().header("Authorization", bearer(ownerA)).contentType(ContentType.JSON)
                .body("{\"name\":\"Workspace A\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        Response ownerB = registerVerifyLogin("iso-b@example.com", "Ian", "B");
        String authB = bearer(ownerB);
        long wsB = ((Number) given().header("Authorization", authB).contentType(ContentType.JSON)
                .body("{\"name\":\"Workspace B\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();
        long ownerBId = ownerB.jsonPath().getLong("user.id");

        // B sees only their own workspace.
        given().header("Authorization", authB)
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(1))
                .body("[0].id", equalTo((int) wsB));

        // B cannot read, rename, or list members of A.
        given().header("Authorization", authB)
                .when().get("/workspaces/" + wsA)
                .then().statusCode(403);
        given().header("Authorization", authB).contentType(ContentType.JSON)
                .body("{\"name\":\"Pwned\"}")
                .when().put("/workspaces/" + wsA)
                .then().statusCode(403);
        given().header("Authorization", authB)
                .when().get("/workspaces/" + wsA + "/members")
                .then().statusCode(403);
        given().header("Authorization", authB)
                .when().delete("/workspaces/" + wsA + "/members/" + ownerBId)
                .then().statusCode(403);
    }

    @Test
    public void owner_cannot_be_removed() {
        Response ownerLogin = registerVerifyLogin("own-del@example.com", "Omar", "Owner");
        String ownerAuth = bearer(ownerLogin);
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"OwnerGuard\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();
        long ownerId = ownerLogin.jsonPath().getLong("user.id");

        // Even the owner cannot remove themselves while they hold the owner role.
        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/members/" + ownerId)
                .then().statusCode(409);
    }

    @Test
    public void update_profile_display_name() {
        Response ownerLogin = registerVerifyLogin("disp-owner@example.com", "Dana", "Owner");
        String ownerAuth = bearer(ownerLogin);
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"DisplayCheck\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        Response memberLogin = registerVerifyLogin("disp-member@example.com", "Mona", "Member");
        String memberAuth = bearer(memberLogin);
        long memberId = memberLogin.jsonPath().getLong("user.id");

        String inviteToken = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"disp-member@example.com\",\"role\":\"member\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201)
                .extract().path("token");
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"token\":\"" + inviteToken + "\"}")
                .when().post("/workspaces/invites/accept")
                .then().statusCode(200);

        // Member updates their name; it must surface in the workspace member list.
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"firstName\":\"Monica\",\"lastName\":\"Changed\"}")
                .when().put("/auth/profile")
                .then().statusCode(200);

        given().header("Authorization", ownerAuth)
                .when().get("/workspaces/" + wsId + "/members")
                .then().statusCode(200)
                .body("find { it.userId == " + memberId + " }.displayName", equalTo("Monica Changed"));
    }

    @Test
    public void admin_role_boundaries() {
        Response ownerLogin = registerVerifyLogin("rb-owner@example.com", "Rae", "Owner");
        String ownerAuth = bearer(ownerLogin);
        long ownerId = ownerLogin.jsonPath().getLong("user.id");
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"RBAC\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        // Owner promotes two members to admin.
        Response admin1Login = registerVerifyLogin("rb-admin1@example.com", "Ada", "One");
        Response admin2Login = registerVerifyLogin("rb-admin2@example.com", "Abe", "Two");
        for (Response login : new Response[]{admin1Login, admin2Login}) {
            String email = login.jsonPath().getString("user.email");
            String token = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                    .body("{\"email\":\"" + email + "\",\"role\":\"admin\"}")
                    .when().post("/workspaces/" + wsId + "/invites")
                    .then().statusCode(201)
                    .extract().path("token");
            given().header("Authorization", bearer(login)).contentType(ContentType.JSON)
                    .body("{\"token\":\"" + token + "\"}")
                    .when().post("/workspaces/invites/accept")
                    .then().statusCode(200)
                    .body("role", equalTo("admin"));
        }
        String admin1Auth = bearer(admin1Login);
        long admin2Id = admin2Login.jsonPath().getLong("user.id");

        // Admins can manage members but cannot delete the workspace.
        given().header("Authorization", admin1Auth)
                .when().delete("/workspaces/" + wsId)
                .then().statusCode(403);

        // Admins cannot remove the owner or peer admins.
        given().header("Authorization", admin1Auth)
                .when().delete("/workspaces/" + wsId + "/members/" + ownerId)
                .then().statusCode(409);
        given().header("Authorization", admin1Auth)
                .when().delete("/workspaces/" + wsId + "/members/" + admin2Id)
                .then().statusCode(403);

        // Only the owner may grant the admin role.
        given().header("Authorization", admin1Auth).contentType(ContentType.JSON)
                .body("{\"email\":\"rb-new@example.com\",\"role\":\"admin\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(403);
        given().header("Authorization", admin1Auth).contentType(ContentType.JSON)
                .body("{\"email\":\"rb-new@example.com\",\"role\":\"member\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201);

        // The owner can still remove an admin.
        given().header("Authorization", ownerAuth)
                .when().delete("/workspaces/" + wsId + "/members/" + admin2Id)
                .then().statusCode(204);
    }

    @Test
    public void member_cannot_list_pending_invites() {
        Response ownerLogin = registerVerifyLogin("pi-owner@example.com", "Pia", "Owner");
        String ownerAuth = bearer(ownerLogin);
        long wsId = ((Number) given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"name\":\"PendingInvites\"}")
                .when().post("/workspaces").then().statusCode(201)
                .extract().path("id")).longValue();

        Response memberLogin = registerVerifyLogin("pi-member@example.com", "Pat", "Member");
        String memberAuth = bearer(memberLogin);
        String inviteToken = given().header("Authorization", ownerAuth).contentType(ContentType.JSON)
                .body("{\"email\":\"pi-member@example.com\",\"role\":\"member\"}")
                .when().post("/workspaces/" + wsId + "/invites")
                .then().statusCode(201)
                .extract().path("token");
        given().header("Authorization", memberAuth).contentType(ContentType.JSON)
                .body("{\"token\":\"" + inviteToken + "\"}")
                .when().post("/workspaces/invites/accept")
                .then().statusCode(200);

        // Members see the roster but not pending invite tokens.
        given().header("Authorization", memberAuth)
                .when().get("/workspaces/" + wsId + "/members")
                .then().statusCode(200);
        given().header("Authorization", memberAuth)
                .when().get("/workspaces/" + wsId + "/invites")
                .then().statusCode(403);
    }

    // Scenario: Switch between workspaces
    @Test
    public void switch_between_workspaces() {
        Response login = registerVerifyLogin("switch@example.com", "Sam", "Switch");
        String auth = bearer(login);

        for (String wsName : new String[]{"Alpha", "Beta"}) {
            given().header("Authorization", auth).contentType(ContentType.JSON)
                    .body("{\"name\":\"" + wsName + "\"}")
                    .when().post("/workspaces").then().statusCode(201);
        }

        given().header("Authorization", auth)
                .when().get("/workspaces")
                .then().statusCode(200)
                .body("$", hasSize(2));
    }
}

