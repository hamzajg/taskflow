# create-pane — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: create-pane

  @w1 @happy-path
  Scenario: Add task opens the creation drawer
    Given a member viewing a project page
    When they activate "Add task"
    Then a right-side drawer opens with the task form fields
    And the task list remains visible behind the overlay

  @w1 @happy-path
  Scenario: Creating a task closes the drawer and updates the list
    Given the task creation drawer is open
    When the member fills the form and submits
    Then the task is created via the API
    And the drawer closes and the new task appears in the correct status group

  @w1 @edge-case
  Scenario: Create errors stay inside the drawer with values preserved
    Given the task creation drawer is open
    When the API rejects the submission
    Then an error alert shows inside the drawer
    And the entered field values are preserved for retry

  @w1 @edge-case
  Scenario: Dismissing the create drawer creates nothing
    Given the task creation drawer is open with partial input
    When the member presses Escape, clicks the overlay, or activates Close/Cancel
    Then no task is created and focus returns to the invoking button

  @w1 @regression
  Scenario: Peek drawer still works alongside create
    Given a project page with the new Add task button
    When the member clicks a task title
    Then the peek drawer opens as before

  @w1 @edge-case
  Scenario: Only one drawer is open at a time
    Given the peek drawer is open on a task
    When the member activates "Add task"
    Then the peek drawer closes and the create drawer opens
    And at most one drawer is open (the closing drawer may finish its exit transition)

  @w1 @edge-case
  Scenario: Create form resets on every open
    Given a member who cancelled a create form with partial input
    When they open "Add task" again
    Then all fields start blank
    And a previous API failure's preserved values do not leak into the new form

  @w2 @happy-path
  Scenario: New project opens the creation drawer
    Given a member viewing the projects page
    When they activate "New project"
    Then a right-side drawer opens with name, description and color fields

  @w2 @happy-path
  Scenario: Creating a project closes the drawer and updates the list
    Given the project creation drawer is open
    When the member submits a valid project
    Then the project is created and appears in the workspace project list
    And empty description/color fields are omitted from the request body

  @w2 @regression
  Scenario: Inline creation forms are gone
    Given the project and projects pages after the change
    Then no permanent inline create-task or create-project form remains
    And creation is only reachable through the drawer buttons

  @w3 @a11y
  Scenario: Creation drawers meet the accessibility bar in both themes
    Given either creation drawer open in light and dark themes
    Then it is a labelled modal dialog with keyboard-reachable labelled fields
    And focus indicators are visible and submitting is reachable by keyboard
