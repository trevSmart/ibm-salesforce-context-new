# Salesforce Org Authorization Verification in Copilot Workflow

## Overview

The `copilot-setup-steps.yml` workflow includes comprehensive verification steps to ensure Salesforce org authorization is working correctly.

## Verification Steps

The workflow includes a dedicated step called "Run comprehensive Salesforce org authorization verification" that performs the following checks:

### Test 1: SF_AUTH_SUCCESS Environment Variable
- **Purpose**: Confirms the authentication process completed successfully
- **Verification**: Checks that `SF_AUTH_SUCCESS` is set to `true`
- **Failure Condition**: If the variable is not set or has any value other than `true`

### Test 2: SF_ACCESS_TOKEN Environment Variable
- **Purpose**: Ensures the OAuth access token was obtained and exported
- **Verification**: Checks that `SF_ACCESS_TOKEN` is set and non-empty
- **Output**: Displays the length of the access token (for security, the actual token is not displayed)
- **Failure Condition**: If the variable is not set or is empty

### Test 3: SF_INSTANCE_URL Environment Variable
- **Purpose**: Verifies the Salesforce instance URL was obtained and exported
- **Verification**: Checks that `SF_INSTANCE_URL` is set and non-empty
- **Output**: Displays the actual instance URL
- **Failure Condition**: If the variable is not set or is empty

### Test 4: SF CLI Authentication Status
- **Purpose**: Confirms the Salesforce CLI is properly authenticated with the org
- **Verification**: Executes `sf org display --json` to check CLI connection
- **Output**: Displays org details including:
  - Org ID
  - Username
  - Instance URL
  - Connected Status
- **Failure Condition**: If the `sf org display` command fails

### Test 5: Data Query Capability
- **Purpose**: Validates that authenticated org access allows data queries
- **Verification**: Executes `sf data query` to retrieve a User record
- **Output**: Displays sample query result with User ID and Name
- **Failure Condition**: If the query command fails

## Expected Output

When all tests pass, the workflow will display:

```
=== Comprehensive Authorization Verification ===

✅ Test 1 PASSED: SF_AUTH_SUCCESS is set to true
✅ Test 2 PASSED: SF_ACCESS_TOKEN is set (length: XXX)
✅ Test 3 PASSED: SF_INSTANCE_URL is set (https://example.salesforce.com)
✅ Test 4 PASSED: SF CLI is logged in
Org details:
  Org ID: XXXXXXXXXXXX
  Username: user@example.com
  Instance URL: https://example.salesforce.com
  Connected Status: Connected
✅ Test 5 PASSED: Can query Salesforce data
Sample query result:
  User ID: XXXXXXXXXXXX
  User Name: Sample User

=== All Authorization Verification Tests Passed! ===
```

## Integration with Workflow

The verification step:
- Runs only if `SF_AUTH_SUCCESS == 'true'` (conditional execution)
- Executes after the "Login and verify Salesforce org connection" step
- Provides detailed output for troubleshooting
- Exits with error code 1 if any test fails, stopping the workflow

## Relationship to Existing Tests

This verification matches the test suite in `test/dev/startEnvironment.test.sh`, ensuring consistency between:
- Local development environment setup (`dev/startEnvironment.sh`)
- CI/CD workflow environment setup (`copilot-setup-steps.yml`)

Both use the same 5-test validation approach to ensure reliability.

## Troubleshooting

If any test fails:

1. **Test 1 Failure**: Check the OAuth authentication step for errors in the response
2. **Test 2/3 Failure**: Verify the access token and instance URL were correctly parsed from the OAuth response
3. **Test 4 Failure**: Check that the `sf org login access-token` command executed successfully
4. **Test 5 Failure**: Verify the org is accessible and the user has appropriate permissions

All test failures will display descriptive error messages in the workflow logs.
