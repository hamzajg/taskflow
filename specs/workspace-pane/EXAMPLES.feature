# workspace-pane — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: workspace-pane

  @w1 @happy-path
  Scenario: Workspace name opens the management drawer
    Given a member viewing the account page
    When they activate a workspace name in the list
    Then a right-side drawer opens showing that workspace's members and roles

  @w1 @happy-path
  Scenario: Manage drawer shows permitted actions per role
    Given the management drawer open for an owned workspace
    Then rename, delete and member-remove controls are available
    And member-remove is offered only for non-owner members
    And for a member-role workspace those controls are absent

  @w1 @edge-case
  Scenario: Workspace mutations happen inside the drawer
    Given the management drawer open
    When the owner renames the workspace or removes a member
    Then the API call succeeds, the drawer content refreshes and the list updates
    And failures surface as an alert inside the drawer with entered values preserved

  @w1 @edge-case
  Scenario: Dismissing the manage drawer preserves state
    Given the management drawer open
    When the member presses Escape, clicks the overlay or activates Close
    Then the drawer closes and the active workspace selection is unchanged

  @w1 @edge-case
  Scenario: Sidebar switching never opens the drawer
    Given the account page with the drawer closed
    When the member switches workspace in the sidebar
    Then no drawer opens and only the active selection changes

  @w1 @edge-case
  Scenario: Delete uses an inline confirm and resets a dangling selection
    Given the management drawer open for the active workspace
    When the owner activates Delete and confirms inline
    Then the workspace is deleted, the drawer closes
    And the active workspace selection resets to a remaining workspace or none

  @w1 @edge-case
  Scenario: Members load failure alerts with retry inside the drawer
    Given the management drawer open
    When the members request fails
    Then an alert with a Retry action shows inside the drawer
    And member-role users never trigger an invites request

  @w1 @regression
  Scenario: Sidebar workspace switching still works
    Given the account page with multiple workspaces
    When a workspace name is clicked
    Then its drawer opens and it becomes the active workspace in the sidebar
    And the projects/dashboard follow the selection as before

  @w2 @happy-path
  Scenario: New workspace opens the creation drawer
    Given a member viewing the account page
    When they activate "New workspace"
    Then a right-side drawer opens with the workspace name field

  @w2 @happy-path
  Scenario: Creating a workspace closes the drawer and updates the list
    Given the workspace creation drawer is open
    When the member submits a valid name
    Then the workspace is created via the API, the drawer closes and the list refreshes

  @w2 @edge-case
  Scenario: Workspace create errors stay inside the drawer
    Given the workspace creation drawer is open
    When the API rejects the submission
    Then an error alert shows inside the drawer and the entered name is preserved

  @w2 @regression
  Scenario: Account page shows no inline workspace forms
    Given the account page after the change
    Then no inline create-workspace form or members subpanel remains
    And workspace management is reachable only through the drawers

  @w3 @a11y
  Scenario: Workspace drawers meet the accessibility bar in both themes
    Given either workspace drawer open in light and dark themes
    Then it is a labelled modal dialog with keyboard-reachable labelled fields
    And focus indicators are visible and dismissal returns focus to the opener

  @w3 @srp
  Scenario: AccountPage delegates profile editing to ProfileForm
    Given the account page source after the change
    Then AccountPage contains no form markup or profile submit logic
    And ProfileForm owns fields, submit, pending state and messages
