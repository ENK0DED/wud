Feature: WUD auth API Exposure

  Scenario: WUD must allow to get all available strategies
    When I GET /auth/strategies
    Then response code should be 200
    And response body should be valid json
    And response body path $ should be of type array with length 1
    And response body path $[0] should be basic

  Scenario: WUD must allow to login with basic auth
    When I POST to /auth/login
    Then response code should be 200
    And response body should be valid json
    And response body path $.username should be john

  Scenario: WUD must allow to get current user
    When I GET /auth/user
    Then response code should be 200
    And response body should be valid json
    And response body path $.username should be john

  Scenario: WUD must allow to logout
    When I POST to /auth/logout
    Then response code should be 200
    And response body should be valid json
