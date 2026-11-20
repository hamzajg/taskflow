# profile-page — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: profile-page

  @w1 @happy-path
  Scenario: Profile page renders the profile form
    Given an authenticated user
    When they navigate to /profile
    Then they see a Profile card with first name, last name fields
    And the Save profile button submits to /auth/profile as before

  @w1
  Scenario: Profile page has a dedicated title
    Given an authenticated user
    When they open /profile
    Then the page header reads "Profile"
    And it does not show the workspace administration panel

  @w1
  Scenario: Account page shows no profile card
    Given an authenticated user
    When they open /account
    Then the Workspaces card is present
    And no Profile card or profile form is rendered

  @w1
  Scenario: Account page keeps workspace management
    Given an authenticated user with workspaces
    When they open /account
    Then workspace names open the manage drawer as before
    And the New workspace button opens the create drawer

  @w1
  Scenario: Sidebar links to profile and workspaces routes
    Given an authenticated user
    When they inspect the sidebar navigation
    Then the Profile link points to /profile
    And the Workspaces link points to /account
    And neither uses a hash anchor

  @w1
  Scenario: Saving profile from the dedicated page updates the shell user
    Given an authenticated user on /profile
    When they change their first name and save
    Then the sidebar/topbar reflect the updated name without a reload

  @w2 @happy-path
  Scenario: Legacy account profile anchor redirects to profile page
    Given an authenticated user
    When they open /account#profile
    Then they are redirected to /profile
    And the profile form is visible

  @w2
  Scenario: Account workspaces anchor still lands on the section
    Given an authenticated user
    When they open /account#workspaces
    Then they remain on /account with the Workspaces card visible
