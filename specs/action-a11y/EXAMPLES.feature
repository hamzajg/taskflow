# action-a11y — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: action-a11y

  @w1 @a11y
  Scenario: Task list actions name their task
    Given a project page in list view with multiple tasks
    When a screen reader encounters the Edit and Delete buttons
    Then each button's accessible name contains its task's title
    And two different tasks produce different action names

  @w1 @a11y
  Scenario: Board move control names its task
    Given a project page in board view
    When a screen reader encounters a card's Move control
    Then its accessible name contains that card's task title

  @w1 @a11y
  Scenario: Comment actions name their author
    Given a task detail page or drawer with comments
    When a screen reader encounters a comment's Edit or Delete button
    Then its accessible name identifies the comment's author

  @w1 @regression
  Scenario: Inline edit actions stay scoped
    Given a task row in edit mode
    When its Save and Cancel buttons are encountered
    Then they keep their existing accessible names
    And the row's Edit/Delete labels are not present while editing

  @w2 @ux
  Scenario: Projects page shows one Projects heading
    Given the projects page
    Then exactly one heading reads "Projects"
    And the projects card carries a distinct title

  @w2 @a11y
  Scenario: Action labels work in both themes
    Given the task list in light and dark themes
    Then the accessible names are identical in both themes
    And no visual change is introduced
