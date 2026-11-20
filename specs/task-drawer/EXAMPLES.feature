# task-drawer — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: task-drawer

  @w1 @happy-path
  Scenario: Task title opens the drawer from list view
    Given a member viewing a project's task list
    When they activate a task title
    Then a right-side drawer opens showing that task's fields
    And the project page remains visible behind the overlay

  @w1 @happy-path
  Scenario: Board card opens the drawer
    Given a member viewing a project's kanban board
    When they activate a task card's title
    Then the same drawer opens with that task's details

  @w1 @happy-path
  Scenario: Drawer shows fields and comment thread
    Given the drawer is open on a task with comments
    Then it shows title, description, status, priority, assignee and due date
    And the comment thread renders chronologically with post/edit/delete

  @w1 @edge-case
  Scenario: Drawer state lives in the URL
    Given the drawer is open on a task in project 5
    When the user refreshes the page or presses the browser Back button
    Then the drawer reopens for that task or closes respectively
    And the URL shows /projects/5?task=<id> while open

  @w1 @regression
  Scenario: Task links keep native navigation semantics
    Given a task title rendered as a link in list or board view
    When the user middle-clicks, ctrl-clicks or copies the link
    Then it behaves as a normal link to /tasks/:id
    And only a plain unmodified click opens the drawer

  @w1 @regression
  Scenario: Board drag-and-drop still works
    Given a member viewing the kanban board
    When they drag a card to another status column
    Then the task moves exactly as before the drawer entry point was added

  @w1 @edge-case
  Scenario: Drawer dismisses via escape, overlay and close button
    Given the drawer is open
    When the user presses Escape, clicks the overlay, or activates Close
    Then the drawer closes and focus returns to the invoking control
    And Tab focus stays within the panel while it is open

  @w1 @happy-path
  Scenario: Open full page reaches the canonical detail view
    Given the drawer is open on a task
    When the user activates "Open full page"
    Then they navigate to /tasks/:id showing the same task and comments

  @w1 @regression
  Scenario: Detail page still works standalone
    Given a user visiting /tasks/:id directly
    Then the page renders task fields and comments as before

  @w2 @regression
  Scenario: List and board interactions still work after decomposition
    Given a member on the project page
    When they create, edit, delete or move tasks in either view
    Then every operation behaves exactly as before the refactor

  @w2 @happy-path
  Scenario: CommentThread is shared, not duplicated
    Given the codebase after the refactor
    Then TaskDetailPage and TaskDrawer both render comments via one component
    And no comment markup or fetch logic is duplicated between them

  @w3 @a11y
  Scenario: Drawer meets the accessibility bar in both themes
    Given the drawer open in light and dark themes
    Then it is a labelled modal dialog and all controls are keyboard reachable
    And focus indicators are visible and body scroll is locked while open

  @w3 @a11y
  Scenario: Slide transition respects reduced motion
    Given a user with prefers-reduced-motion enabled
    When the drawer opens or closes
    Then it appears without animated transition
