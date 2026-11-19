# task-detail — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: task-detail

  @w1 @happy-path
  Scenario: Member posts a comment on a task in their workspace
    Given a verified member of a workspace with a task
    When they post a comment with a body on that task
    Then the comment is persisted with author identity and timestamp
    And it appears in the task's comment list in chronological order

  @w1 @edge-case
  Scenario: Empty or oversized comment body is rejected
    Given a member of a workspace with a task
    When they post a comment with a blank body or one over 5000 characters
    Then the request is rejected with 400 and nothing is stored

  @w1 @security
  Scenario: Non-member cannot read or post comments on workspace tasks
    Given a user who is not a member of the task's workspace
    When they list or create comments on that task
    Then the response is 403 or 404 and no data is returned

  @w1 @security
  Scenario: Cross-workspace comment isolation
    Given two workspaces each with a task and comments
    When a member of workspace A requests comments for a task in workspace B
    Then the response is 403 or 404 and no data leaks

  @w1 @happy-path
  Scenario: Author edits and deletes their own comment
    Given a member who posted a comment on a task
    When they update the comment body and later delete the comment
    Then the edit is reflected with an updated timestamp
    And the deleted comment no longer appears in the list

  @w1 @security
  Scenario: Non-author cannot edit another member's comment
    Given two members of the same workspace and a comment by the first
    When the second member tries to edit that comment
    Then the request is rejected with 403
    And the original body is unchanged

  @w1 @security
  Scenario: Workspace admin can moderate but not edit comments
    Given a member's comment in a workspace with an admin
    When the admin deletes the comment
    Then the comment is removed
    When the admin tries to edit the comment body first
    Then the request is rejected with 403

  @w2 @happy-path
  Scenario: Task detail shows all fields and links back to the project
    Given a task with title, description, status, priority, assignee and due date
    When a member opens the task detail page
    Then every field is visible
    And a link leads back to the owning project

  @w2 @happy-path
  Scenario: Comments thread renders and posting adds a comment
    Given a task with existing comments
    When a member opens the detail page
    Then comments render chronologically with author and timestamp
    When they submit a new comment through the form
    Then it appears in the thread without a page reload of other data

  @w2 @edge-case
  Scenario: Task with no comments shows an empty state
    Given a task with zero comments
    When a member opens its detail page
    Then an empty state prompts them to start the discussion
    And no error is shown

  @w3 @a11y
  Scenario: Detail and comments screens meet the accessibility bar
    Given the task detail screen in either theme
    When a keyboard user navigates it
    Then all controls are reachable, labeled and show focus indicators

  @w3 @polish
  Scenario: Loading and error states are handled
    Given the task detail and comments screens
    When data is loading or a request fails
    Then a loading indicator or error message with retry is shown
