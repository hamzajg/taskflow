# projects-tasks — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: projects-tasks

  @w1 @happy-path
  Scenario: Member creates and manages a project in their workspace
    Given a verified member of a workspace
    When they create a project with a name and description
    Then the project appears in the workspace project list
    And its detail endpoint returns the project

  @w1 @edge-case
  Scenario: Non-member cannot see or touch workspace projects
    Given a user who is not a member of the workspace
    When they request the workspace's projects or a project by id
    Then the response is 403 or 404 and no data is returned

  @w1 @happy-path
  Scenario: Member creates a task with full fields
    Given a project in a workspace the member belongs to
    When they create a task with title, description, status, priority, assignee and due date
    Then the task is persisted with all fields
    And an invalid status or priority is rejected with 400

  @w1 @edge-case
  Scenario: Assignee must be a workspace member
    Given a project in a workspace
    When a task is created or updated with an assignee who is not a workspace member
    Then the request is rejected with 400 or 403

  @w1 @security
  Scenario: Member can delete tasks but not projects
    Given a member (non-admin) in a workspace with a project and tasks
    When they delete a task in that project
    Then the task is removed
    When they try to delete the project itself
    Then the request is rejected

  @w1 @security
  Scenario: Cross-workspace isolation on tasks and projects
    Given two workspaces with projects and tasks
    When a member of workspace A requests a project or task id belonging to workspace B
    Then the response is 403 or 404 and no data leaks

  @w1 @security
  Scenario: Delete permissions respect roles
    Given a member (non-admin) in a workspace
    When they try to delete a project
    Then the request is rejected
    And an owner or admin can delete it

  @w2 @happy-path
  Scenario: Projects list shows workspace projects with counts
    Given a workspace with two projects containing tasks
    When a member opens the projects page
    Then both projects are listed with their task counts

  @w2 @happy-path
  Scenario: Project detail shows tasks in list view
    Given a project with tasks in different statuses
    When a member opens the project detail in list view
    Then tasks are grouped or filterable by status
    And each task shows title, status, priority, assignee and due date

  @w2 @edge-case
  Scenario: Empty project shows a useful empty state
    Given a project with no tasks
    When a member opens its detail page
    Then an empty state prompts them to create the first task
    And no error is shown

  @w3 @happy-path
  Scenario: Board groups tasks by status column
    Given a project with tasks across statuses
    When a member switches to board view
    Then each status column shows its tasks in persisted order

  @w3 @happy-path
  Scenario: Moving a task on the board persists status and order
    Given a task in the "todo" column
    When the member drags it to "in_progress" between two tasks
    Then the task's status becomes in_progress
    And its position reflects the drop point after reload

  @w3 @edge-case
  Scenario: Move is rejected for invalid status or foreign task
    Given a task in workspace A
    When a move request targets an unknown status or a task in another workspace
    Then the request fails and state is unchanged

  @w4 @a11y
  Scenario: New screens meet the accessibility bar
    Given the projects and project detail screens in either theme
    When a keyboard user navigates them
    Then all controls are reachable, labeled and show focus indicators
    And drag has an equivalent keyboard move control

  @w4 @polish
  Scenario: Loading and error states are handled
    Given the projects screens
    When data is loading or a request fails
    Then a loading indicator or error message is shown
    And the user can retry
