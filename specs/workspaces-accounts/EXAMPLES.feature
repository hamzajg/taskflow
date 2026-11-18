# workspaces-accounts — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: workspaces-accounts

  @w1 @happy-path
  Scenario: Register and verify a new account
    Given a visitor on the registration page
    When they submit a valid name, email and password
    Then an account is created and a verification email is queued
    And they cannot access workspace features until the email is verified

  @w1 @happy-path
  Scenario: Log in with valid credentials
    Given a verified user with email "ana@example.com" and password "secret123"
    When they log in with those credentials
    Then they receive an access token and land on their workspace home

  @w1 @edge-case
  Scenario: Log in with wrong password
    Given a verified user exists
    When someone submits that email with an incorrect password
    Then login is rejected with a clear error and no token is issued

  @w1 @edge-case
  Scenario: Log out invalidates the session
    Given a logged-in user holding a valid token
    When they log out
    Then the token no longer authorizes workspace requests

  @w2 @happy-path
  Scenario: Create a workspace
    Given a logged-in verified user with no workspaces
    When they create a workspace named "Acme Team"
    Then they become its owner and it becomes their active workspace

  @w2 @happy-path
  Scenario: Switch between workspaces
    Given a user who belongs to two workspaces
    When they select the second workspace
    Then subsequent requests operate in that workspace's context

  @w2 @happy-path
  Scenario: Invite and accept a member
    Given an owner of workspace "Acme Team"
    When they invite "bob@example.com" as member and Bob accepts
    Then Bob appears in the member list with the member role

  @w2 @edge-case
  Scenario: Member removal
    Given an admin of a workspace with members
    When the admin removes a member
    Then that member loses access to the workspace immediately

  @w3 @security
  Scenario: Member cannot escalate privileges
    Given a plain member of a workspace
    When they try to rename the workspace or remove another member
    Then the request is rejected with a forbidden error

  @w3 @security
  Scenario: Workspace isolation
    Given two workspaces each with private data
    When a user of workspace A requests workspace B's resources
    Then access is denied and no data leaks

  @w3 @happy-path
  Scenario: Password reset
    Given a registered user who forgot their password
    When they request a reset and follow the emailed link
    Then they can set a new password and log in with it

  @w3 @happy-path
  Scenario: Update profile display name
    Given a logged-in user
    When they update their display name
    Then the new name is shown on their profile and member lists
