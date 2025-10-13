# Security: Secret Sanitization Implementation

## Overview

This document describes the security improvements implemented to prevent Salesforce org secrets and credentials from being exposed in logs, test artifacts, or MCP resources.

## Security Issues Identified and Fixed

### 1. OAuth Response Exposure in `dev/startEnvironment.sh`

**Issue:** Line 18 echoed the full OAuth response which contains sensitive data including:
- `access_token`: OAuth access token for Salesforce API
- `refresh_token`: Token for refreshing the access token (if present)
- Other OAuth-related sensitive fields

**Fix:** Modified to only extract and display the error message instead of the full response:
```bash
# Before
echo "$response"

# After
error_msg=$(echo "$response" | grep -o '"error_description":"[^"]*"' | cut -d'"' -f4)
if [ -n "$error_msg" ]; then
  echo "Error details: $error_msg"
else
  echo "Authentication failed. Check your credentials."
fi
```

### 2. Access Token Exposure via `sf org display`

**Issue:** Line 51 executed `sf org display` which outputs the access token to stdout:
```json
{
  "id": "00DKN0000000yy52AA",
  "accessToken": "00DKN0000000yy5!AQYA...",
  "instanceUrl": "https://example.salesforce.com/",
  ...
}
```

**Fix:** Redirected output to `/dev/null` and only display success/failure:
```bash
# Before
sf org display

# After
if sf org display --json > /dev/null 2>&1; then
  echo "✓ Successfully verified connection to org '$SF_ORG_ALIAS'"
else
  echo "Warning: Could not verify org connection"
fi
```

### 3. Access Token in MCP Resources

**Issue:** `src/mcp-server.js` lines 59 and 116 exposed `state.org` via `JSON.stringify()`, which included the `accessToken` field returned by `sf org display --json`.

**Fix:** 
1. Created `sanitizeSensitiveData()` utility function in `src/utils.js`
2. Applied sanitization before creating MCP resources:
```javascript
// Before
newResource('mcp://org/orgAndUserDetail.json', 'Org and user details', 
  'Org and user details', 'application/json', 
  JSON.stringify(state.org, null, 3));

// After
const sanitizedOrg = sanitizeSensitiveData(state.org);
newResource('mcp://org/orgAndUserDetail.json', 'Org and user details', 
  'Org and user details', 'application/json', 
  JSON.stringify(sanitizedOrg, null, 3));
```

### 4. Test Artifacts Containing Sensitive Data

**Issue:** `test/setup.ts` wrote test data to `.test-artifacts/` directory without sanitization, potentially exposing secrets in failed test dumps.

**Fix:** Applied sanitization before writing test artifacts:
```typescript
// Before
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')

// After
const sanitizedData = sanitizeSensitiveData(data)
fs.writeFileSync(file, JSON.stringify(sanitizedData, null, 2), 'utf8')
```

## Sanitization Function

The `sanitizeSensitiveData()` function in `src/utils.js` provides comprehensive secret redaction:

**Features:**
- Redacts common sensitive fields by default:
  - `accessToken`
  - `access_token`
  - `password`
  - `client_secret`
  - `clientSecret`
- Recursively sanitizes nested objects and arrays
- Shows redacted value length for debugging: `[REDACTED - length: 42]`
- Does not modify original object (creates a copy)
- Supports custom field lists for different use cases
- Handles null, undefined, and empty string values

**Usage:**
```javascript
import {sanitizeSensitiveData} from './utils.js';

const orgData = {
  username: 'user@example.com',
  accessToken: '00D1234567890ABCD!secret',
  instanceUrl: 'https://test.salesforce.com'
};

const safe = sanitizeSensitiveData(orgData);
// Result: {
//   username: 'user@example.com',
//   accessToken: '[REDACTED - length: 27]',
//   instanceUrl: 'https://test.salesforce.com'
// }
```

## Testing

Comprehensive test suite added in `test/lib/utils.test.js`:

- ✅ Redacts accessToken field
- ✅ Redacts multiple sensitive fields
- ✅ Handles nested objects
- ✅ Handles arrays
- ✅ Preserves non-sensitive fields
- ✅ Handles null and undefined values
- ✅ Handles empty strings
- ✅ Does not modify original object
- ✅ Supports custom field lists

All tests pass successfully.

## Impact

### Before
- OAuth responses with secrets were logged to console
- `sf org display` output exposed access tokens
- MCP resources contained plaintext access tokens
- Test artifacts could contain sensitive credentials
- Logs and artifacts could be accidentally committed or shared

### After
- Only error messages (not full responses) are logged
- `sf org display` output is redirected to prevent exposure
- MCP resources contain sanitized data with redacted tokens
- Test artifacts are sanitized before writing to disk
- Reduced risk of accidental credential exposure

## Additional Security Measures

1. **`.test-artifacts/` in `.gitignore`**: Already present at line 71 to prevent accidental commits
2. **Environment variables**: Sensitive credentials should only be passed via environment variables, never hardcoded
3. **Comments**: Added inline comments explaining security measures for future maintainers

## Recommendations

1. **Regular audits**: Periodically review logging statements and API responses for new sensitive fields
2. **CI/CD scanning**: Consider adding secret scanning tools to CI/CD pipeline
3. **Developer training**: Ensure team members understand importance of not logging sensitive data
4. **Log rotation**: Implement log rotation and retention policies for any persistent logs
5. **Access control**: Restrict access to log files and test artifacts in production environments

## Files Modified

1. `dev/startEnvironment.sh` - Removed OAuth response echoing, redirected `sf org display`
2. `src/utils.js` - Added `sanitizeSensitiveData()` function
3. `src/mcp-server.js` - Applied sanitization to MCP resources
4. `src/lib/salesforceServices.js` - Added comments about token handling
5. `test/setup.ts` - Applied sanitization to test artifacts
6. `test/lib/utils.test.js` - Added comprehensive test suite

## Files Created

1. `docs/SECURITY_SANITIZATION.md` - This documentation
2. `test/lib/utils.test.js` - Test suite for sanitization function
