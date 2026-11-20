# project-tags — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: project-tags

  @w1 @happy-path
  Scenario: Members can list workspace tags
    Given a verified member of workspace W
    When they GET /workspaces/W/tags
    Then they receive the workspace's tags with id, title, and color

  @w1 @happy-path
  Scenario: Owner creates a tag
    Given an owner of workspace W
    When they POST /workspaces/W/tags with title "Client X" and color "#3366ff"
    Then a tag is created, returned with 201, and appears in GET /workspaces/W/tags

  @w1 @authorization
  Scenario: Member cannot mutate tags
    Given a plain member of workspace W
    When they POST /workspaces/W/tags
    Then the response is 403 and no tag is created

  @w1 @validation
  Scenario: Duplicate tag titles are rejected
    Given workspace W already has a tag titled "Client X"
    When an admin POSTs /workspaces/W/tags with title "client x"
    Then the response is 409 (or 400) and only one "Client X" tag exists

  @w1 @validation
  Scenario: Invalid tag input is rejected
    Given an admin of workspace W
    When they POST /workspaces/W/tags with an empty or over-50-char title
    Then the response is 400

  @w1 @happy-path
  Scenario: Assign tags to a project
    Given workspace W has tags T1 and T2
    When an editor updates project P with tagIds [T1, T2]
    Then GET project P returns both tags, and re-sending tagIds [T1] leaves only T1

  @w1 @validation
  Scenario: Reject foreign-workspace tag ids
    Given tag T belongs to workspace V, not W
    When an editor updates a project in W with tagIds [T]
    Then the response is 400 and the project's tags are unchanged

  @w1 @data-integrity
  Scenario: Deleting a tag detaches it from projects
    Given project P has tag T
    When an admin DELETEs /workspaces/W/tags/T
    Then GET project P no longer lists T, and T is gone from the tag list

  @w1 @data-integrity
  Scenario: Deleting a project removes tag assignments
    Given project P has tag T
    When project P is deleted
    Then the project_tags row for (P, T) is gone (no orphans)

  @w2 @happy-path
  Scenario: Project cards show tag badges
    Given project P in workspace W has tags "Client X" (blue) and "Internal"
    When a member opens /projects
    Then P's card shows both tags as colored badges

  @w2 @happy-path
  Scenario: Manage tags from the projects page
    Given a member on /projects
    When they open the Tags drawer, create "Urgent" with a color, and delete an unused tag
    Then the tag list updates and badges reflect the change

  @w2 @happy-path
  Scenario: Filter projects by tag
    Given projects P1 (tagged "Client X") and P2 (untagged) in workspace W
    When a member clicks the "Client X" filter chip
    Then only P1 is listed; clicking it again (or "All") restores the full list

  @w2 @happy-path
  Scenario: Assign tags in the project drawer
    Given the project drawer is open for project P in create mode
    When an admin checks tags "Client X" and "Internal" and saves
    Then the saved project carries both tags and badges appear on its card

  @w2 @happy-path
  Scenario: Edit a project and update its tags
    Given project P exists with tag "Client X"
    When an admin opens P's edit drawer, unchecks "Client X", checks "Internal", and saves
    Then P's tags are exactly ["Internal"] and its card badge updates

  @w3 @accessibility
  Scenario: Tag UI works in both themes
    Given the projects page with tag badges and the Tags drawer open
    When the theme toggles between light and dark
    Then badges, chips, and drawer controls remain legible and correctly labeled
