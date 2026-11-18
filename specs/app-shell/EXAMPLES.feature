# app-shell — specifications by example
# Scenario tags @w<N> map items to delivery waves (see WAVES.md / BACKLOG.md).

Feature: app-shell

  @w1 @happy-path
  Scenario: Design tokens are the single source of styling
    Given the frontend source
    When a developer inspects component styles
    Then colors, spacing, radius and shadows come from CSS custom properties
    And no component hard-codes a color value

  @w1 @happy-path
  Scenario: Shared primitives replace duplicated markup
    Given the login, register and home pages
    When they render form fields and buttons
    Then they use the shared Button and Input primitives
    And no page defines its own button or input styling

  @w2 @happy-path
  Scenario: Authenticated pages render inside the app shell
    Given a logged-in user on any authenticated route
    When the page renders
    Then a sidebar with navigation and a top bar are visible
    And the page content sits in the shell's content area

  @w2 @edge-case
  Scenario: Sidebar collapses on narrow viewports
    Given a logged-in user on a viewport narrower than 900px
    When the app shell renders
    Then the sidebar is hidden or collapsed behind a toggle
    And all navigation remains reachable

  @w3 @happy-path
  Scenario: Theme toggle switches and persists
    Given a logged-in user
    When they activate the theme toggle in the top bar
    Then the UI switches between light and dark instantly
    And the choice survives a page reload

  @w3 @edge-case
  Scenario: First visit honors OS preference
    Given a user with no stored theme preference
    And the OS reports dark mode
    When they load the app for the first time
    Then the dark theme is applied before first paint

  @w4 @regression
  Scenario: Existing flows still work inside the shell
    Given a user inside the app shell
    When they log in, switch workspaces, edit their profile and log out
    Then every action succeeds exactly as before the shell existed

  @w4 @a11y
  Scenario: Keyboard and assistive technology support
    Given the app in either theme
    When a keyboard user tabs through the shell and pages
    Then every interactive element shows a visible focus indicator
    And icon-only controls expose accessible names
