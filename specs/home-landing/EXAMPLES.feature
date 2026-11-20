# home-landing — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: home-landing

  @w1 @happy-path
  Scenario: Guest sees the landing page at the root
    Given a visitor who is not logged in
    When they open the application root
    Then they see a landing page with a headline, value propositions and calls to action
    And the primary action leads to registration and the secondary to login

  @w1 @edge-case
  Scenario: Authenticated user at root is sent to the dashboard
    Given a logged-in user
    When they open the application root
    Then they are redirected to the dashboard

  @w1 @edge-case
  Scenario: Guest cannot reach the dashboard
    Given a visitor who is not logged in
    When they open the dashboard route directly
    Then they are redirected to login

  @w1 @regression
  Scenario: Account management remains reachable
    Given a logged-in user
    When they open the account page
    Then workspace management and profile editing work as before
    And the #workspaces and #profile anchors still resolve on that page
    And the sidebar links to dashboard, projects and account

  @w2 @happy-path
  Scenario: Dashboard shows workspace stat cards
    Given a member of a workspace with projects and tasks in several statuses
    When they open the dashboard
    Then stat cards show project count, member count and task counts by status
    And overdue and due-soon counts reflect real due dates

  @w2 @happy-path
  Scenario: Dashboard shows my open tasks for the caller
    Given a workspace where the member has open assigned tasks and other members have theirs
    When they open the dashboard
    Then the my-open-tasks count includes only their own unfinished tasks

  @w2 @security
  Scenario: Summary endpoint enforces membership
    Given a user who is not a member of a workspace
    When they request that workspace's summary
    Then the response is 403 or 404 and no counts are returned

  @w2 @edge-case
  Scenario: Dashboard handles empty and loading states
    Given a member of a workspace with no projects
    When they open the dashboard
    Then zero-count stat cards and an inviting empty projects state render without errors
    And a loading indicator shows while data fetches

  @w2 @edge-case
  Scenario: Dashboard follows the sidebar workspace selection
    Given a member of two workspaces with different project and task counts
    When they switch the workspace in the sidebar and open the dashboard
    Then the stat cards and projects list reflect the selected workspace
    And a member with zero workspaces sees an empty state prompting creation

  @w2 @edge-case
  Scenario: Dashboard error offers retry
    Given the summary request fails
    When the dashboard loads
    Then an error message with a retry action is shown

  @w3 @a11y
  Scenario: Reskinned screens meet the accessibility bar in both themes
    Given the landing, dashboard and reskinned pages in either theme
    When a keyboard user navigates them
    Then all controls are reachable, labeled and show focus indicators

  @w3 @polish
  Scenario: Stat cards and headers follow the shared design language
    Given the dashboard and reskinned pages
    When comparing stat cards, section headers and cards across pages
    Then they use the shared tokens, icon-chip stat cards and consistent spacing
