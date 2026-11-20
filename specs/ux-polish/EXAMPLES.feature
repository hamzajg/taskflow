# ux-polish — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: ux-polish

  @w1 @happy-path
  Scenario: Due dates render relative labels on task surfaces
    Given a task due today, one due tomorrow, one overdue, and one due in 5 days
    When I view the project task list, the board, and the task detail page
    Then the due dates read "Due today", "Due tomorrow", "Overdue", and "Due in 5 d"
    And the overdue task carries a visual overdue marker in list and board views

  @w1
  Scenario: Tasks without a due date show no due label
    Given a task with no due date
    When I view it in the task list
    Then no due-date text is rendered for it

  @w2 @happy-path
  Scenario: Time section works inside the task drawer
    Given a task with logged time entries
    When I open the task drawer from the project page
    Then the drawer shows the Time section with the entries, total, log form, and timer controls
    And logging an entry inside the drawer updates the list without closing it

  @w2
  Scenario: Account page has a single Workspaces heading
    Given I am on the account page
    When the page renders
    Then exactly one heading reads "Workspaces" (the page header)
    And no card repeats the same heading text

  @w2
  Scenario: Board view is deep-linkable via the view param
    Given a project with tasks
    When I open /projects/{id}?view=board
    Then the board view is shown
    When I click the List toggle
    Then the URL updates to ?view=list and the list renders
    When I open /projects/{id} with no param after previously choosing board
    Then the board view is shown (saved preference)
    And opening a task drawer from ?view=board keeps both params (?view=board&task={id})
    And an invalid ?view=bogus falls back to the saved preference

  @w3 @happy-path
  Scenario: Dashboard shows project identity and time totals
    Given a workspace with projects that have tags, colors, and logged time
    When I open the dashboard
    Then each project row shows its color indicator and tag chips
    And a "Time logged" stat shows the workspace's total logged minutes

  @w3
  Scenario: Time and date UI meet the accessibility bar in both themes
    Given the light and dark themes
    When I view task rows with relative due dates and the drawer Time section
    Then all controls keep their accessible names and the overdue marker is not color-only
