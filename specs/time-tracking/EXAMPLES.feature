# time-tracking — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: time-tracking

  @w1 @happy-path
  Scenario: Members can list time entries
    Given a member of workspace W can see task T
    When they GET /tasks/T/time-entries
    Then they receive T's entries with user, date, minutes, description

  @w1 @happy-path
  Scenario: Member logs a manual time entry
    Given a member of workspace W
    When they POST /tasks/T/time-entries with date, minutes 90, description "Pairing"
    Then a 201 entry is returned and appears in the task's entry list

  @w1 @authorization
  Scenario: Author edits own entry
    Given member M created entry E on task T
    When M PATCHes /time-entries/E with new minutes and description
    Then E is updated and still attributed to M

  @w1 @authorization
  Scenario: Member cannot touch another user's entry
    Given member M2 (not author, not admin) calls PATCH or DELETE on E
    Then the response is 403 and E is unchanged

  @w1 @authorization
  Scenario: Admin deletes any entry
    Given workspace admin A and entry E authored by member M
    When A DELETEs /time-entries/E
    Then E is removed (204) regardless of authorship

  @w1 @validation
  Scenario: Invalid time entry input is rejected
    Given a member of workspace W
    When they POST an entry with minutes 0, minutes 2000, or a future entry_date
    Then each response is 400 and no entry is created

  @w1 @happy-path
  Scenario: Timer start and stop compute minutes
    Given member M on task T
    When M POSTs timer/start then, after time passes, timer/stop
    Then a completed entry exists whose minutes equal the elapsed duration (rounded) and ended_at is set

  @w1 @authorization
  Scenario: Second timer start while running is rejected
    Given M has a running timer on task T1
    When M POSTs timer/start on task T2
    Then the response is 409 and M still has exactly one running entry

  @w1 @happy-path
  Scenario: Running timer is discoverable across tasks
    Given M started a timer on task T1
    When M GETs /time-entries/running
    Then the response identifies the running entry and its task
    And the Time card on task T2 shows the running state

  @w1 @data-integrity
  Scenario: Deleting a task removes its time entries
    Given task T has two time entries
    When T is deleted
    Then both entries are gone (cascade) and totals no longer include them

  @w1 @happy-path
  Scenario: Task detail shows time total and entries
    Given task T has entries totaling 150 minutes
    When a member GETs the task or its project task list
    Then totalMinutes reflects 150 and the detail payload includes the entries

  @w2 @happy-path
  Scenario: Time section lists entries and total on task detail
    Given task T has entries from two users
    When a member opens the task detail page
    Then the Time card shows each entry (author, date, duration, description) and the total

  @w2 @happy-path
  Scenario: Member logs time from the UI
    Given the Time card is open on task T
    When the member fills date, hours/minutes, description and submits
    Then the entry appears in the list and the total updates

  @w2 @happy-path
  Scenario: Timer controls run and stop from the UI
    Given the Time card is open on task T
    When the member clicks Start timer, waits, then clicks Stop timer
    Then a completed entry appears with computed minutes and the button returns to Start

  @w2 @authorization
  Scenario: Member sees own-entry controls only
    Given entries by M and M2 on task T viewed by M
    When the page renders
    Then M sees edit/delete on own entries, no edit on M2's, and delete only if admin

  @w3 @accessibility
  Scenario: Time section works in both themes
    Given the task detail Time card with entries and timer controls
    When the theme toggles between light and dark
    Then all controls remain labelled and legible
