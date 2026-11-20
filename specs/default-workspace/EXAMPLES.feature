# default-workspace — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: default-workspace

  @w1 @happy-path
  Scenario: Login provisions a default workspace for a user with no memberships
    Given a verified user with an account and zero workspace memberships
    When they log in with valid credentials
    Then GET /workspaces returns exactly one workspace
    And the user is a member with the owner role

  @w1
  Scenario: Default workspace names the user
    Given a user whose first name is "Ada"
    When they log in for the first time
    Then the default workspace is named "Ada's Workspace"
    And a user with a blank first name gets "My Workspace"

  @w1
  Scenario: Over-long first names cannot break login
    Given a user whose first name is longer than the workspace name column allows
    When they log in for the first time
    Then provisioning still succeeds and the name is truncated to fit

  @w1
  Scenario: Repeat logins do not duplicate the default workspace
    Given a user who already has the auto-provisioned workspace
    When they log in again
    Then GET /workspaces still returns exactly one workspace

  @w1
  Scenario: Users with existing workspaces get no extra workspace
    Given a verified user who already belongs to a workspace they created
    When they log in
    Then their workspace list is unchanged

  @w1
  Scenario: Concurrent first logins provision at most one workspace
    Given a user with zero memberships
    When two login requests for that user run concurrently
    Then exactly one default workspace exists afterwards

  @w1
  Scenario: Legacy user with no memberships gets a default workspace on login
    Given a verified user created before this feature with zero memberships
    When they log in
    Then a default workspace is provisioned with owner role

  @w1
  Scenario: Unverified user receives a default workspace on login
    Given a registered but unverified user with zero memberships
    When they log in with valid credentials
    Then a default workspace membership exists at the data layer
    And GET /workspaces still returns 403 until the email is verified
    And content creation remains blocked by email verification

  @w2 @happy-path
  Scenario: Dashboard auto-selects the default workspace
    Given a user whose only workspace was auto-provisioned at login
    When they open the dashboard
    Then the workspace is selected in the sidebar with no selection action
    And workspace stats render for that workspace

  @w2
  Scenario: Account page lists the default workspace
    Given a user with an auto-provisioned default workspace
    When they open /account
    Then the Workspaces card lists it with the owner role badge
    And the workspace name opens the manage drawer as usual

  @w2
  Scenario: Sidebar shows the default workspace as selected
    Given a user whose only workspace was auto-provisioned at login
    When the app shell loads their workspace list
    Then the workspace switcher displays that workspace instead of the placeholder
