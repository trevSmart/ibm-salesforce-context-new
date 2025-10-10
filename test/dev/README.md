# Salesforce Environment Initialization Test

This directory contains tests for the Salesforce environment initialization scripts.

## startEnvironment.test.sh

A comprehensive test script that validates the `dev/startEnvironment.sh` script works correctly.

### What it tests:

1. **SF_AUTH_SUCCESS**: Verifies the environment variable is set to `true` after successful authentication
2. **SF_ACCESS_TOKEN**: Confirms the OAuth access token is properly exported
3. **SF_INSTANCE_URL**: Validates the Salesforce instance URL is exported
4. **SF CLI Login**: Checks that the Salesforce CLI is logged in successfully
5. **Data Access**: Verifies that we can query Salesforce data

### Usage:

```bash
# Make sure SF credentials are in your environment
export SF_ORG_CLIENT_ID="your_client_id"
export SF_ORG_CLIENT_SECRET="your_client_secret"
export SF_ORG_CLIENT_USERNAME="your_username"
export SF_ORG_CLIENT_PASSWORD="your_password"

# Run the test
bash test/dev/startEnvironment.test.sh
```

### Expected Output:

```
=== Testing startEnvironment.sh ===
...
✅ Test 1 PASSED: SF_AUTH_SUCCESS is set to true
✅ Test 2 PASSED: SF_ACCESS_TOKEN is set (...)
✅ Test 3 PASSED: SF_INSTANCE_URL is set (...)
✅ Test 4 PASSED: SF CLI is logged in
✅ Test 5 PASSED: Can query Salesforce data

=== All Tests Passed! ===
```

### Skipping Tests:

If SF credentials are not available, the test will skip gracefully:

```
❌ SKIPPED: SF credentials not available in environment
   Required: SF_ORG_CLIENT_ID, SF_ORG_CLIENT_SECRET, SF_ORG_CLIENT_USERNAME, SF_ORG_CLIENT_PASSWORD
```

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines by:

1. Setting the required SF credentials as secrets
2. Running the test script as part of the build process
3. Validating that the environment initialization works correctly

## Troubleshooting

If tests fail:

1. Check that all required environment variables are set
2. Verify that the Salesforce credentials are valid
3. Ensure the Salesforce CLI is installed and available in PATH
4. Review the error messages for specific failure reasons
