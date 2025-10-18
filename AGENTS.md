# Agent instructions for IBM Salesforce Context MCP Server

## Project description

### Overview

IBM Salesforce Context is a Model Context Protocol (MCP) server built in Node.js that provides context AI agents (usually IDE AI agents) to help the user complete Salesforce related tasks, connecting to the Salesforce org either retrieving the necessary information or perfsorming operations.

- Built in Node.js
- Implements [Model Context Protocol (MCP)](https://modelcontextprotocol.io/specification/) through its official Typescript SDK [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk). Extensive use of the protocol features:
    - Tools
    - Resources and resource links
    - Roots
    - Prompts
    - Elicitation
    - Completion
    - Sampling
    - Progress notifications
    - Logging
- Linting with Biome 2
- Testing with Vitest

### Prerequisites

- Node.js > v22
- Salesforce CLI logged to a Salesforce org
- MCP Client (usually an IDE like VS Code, Cursor or Claude Desktop)

### Features

- Automatic management of Salesforce connection through Salesforce CLI watcher
- Both HTTP and stdio transport support
- Exposes MCP tools and resources to help the IDE AI agent performe Salesforce related tasks like:
    - Performing DML operations
    - Retrieving SObject schema
    - Querying Salesforce data with SOQL
    - Executing anonymous Apex scripts
    - Running Apex tests and retrieving Apex classes test coverage
    - Retriving Setup Audit Trail data
    - Calling Salesforce REST, Tooling and Composite APIs
    - Managing and retrieving Apex debug logs
- Automatic Salesforce CLI version updating
- Automatic daily SObject definition retrieval
- Built-in issue reporting tool

## Development

- All literals including comments and documentation must be in English.
- To run linting run:
    ```
    npm run lint:fix
    ```

### README Management

The project includes automated README management to keep package name references synchronized:

- **Automatic Updates**: GitHub Actions automatically update README.md when package.json changes
- **Manual Updates**: Run `npm run update-readme` to manually update README.md with current package name
- **Placeholder System**: Use `<package-name>` in README.md, which gets replaced with the actual package name
- **Integration**: The update script runs automatically during package publishing

The `dev/updateReadme.js` script handles:
- Replacing `<package-name>` placeholders with the actual package name from package.json
- Updating deeplinks for IDE installations
- Maintaining consistency across all documentation

## Testing

### Testing Philosophy

**All tests must perform real actions on the Salesforce org, without any mocking, stubbing, or skipping.**

Our testing approach is designed to surface real-world issues and ensure that any problems are immediately visible when running the test suite. This means:

- **No Mocking**: Tests must interact with real Salesforce orgs and real MCP servers
- **No Stubbing**: All external dependencies must be real (Salesforce CLI, HTTP servers, etc.)
- **No Skipping**: Tests must never be skipped due to connection issues, timeouts, or other failures
- **Fail Fast**: Connection failures, server startup issues, and other problems must cause test failures, not skips

### Test Failure vs Skip Behavior

**Critical**: When tests encounter issues (connection failures, timeouts, server unavailability), they must **FAIL** rather than be **SKIPPED**. This ensures that:

1. **Parent test suites correctly show as "Failed"** when they contain failed tests
2. **CI/CD pipelines properly detect issues** and don't pass with hidden problems
3. **Developers are immediately alerted** to infrastructure or configuration problems
4. **Test results accurately reflect** the actual state of the system

**Configuration**: Our Vitest configuration enforces this behavior with:
- Extended timeouts (30 seconds) to prevent premature skipping
- Explicit error handling that re-throws connection failures
- Global configuration that treats hook failures as test failures
- No early bailout on first failure to ensure all issues are surfaced

### Test Configuration Requirements

**IMPORTANT**: The following configuration must be maintained in `vitest.config.ts`:

```typescript
export default defineConfig({
	test: {
		testTimeout: 30000,    // Extended timeout to prevent premature skipping
		hookTimeout: 30000,    // Extended hook timeout
		bail: 0,               // Don't bail on first failure
		// ... other config
	},
})
```

**Test Setup Requirements**: The `test/setup.ts` file must include:
- Error handling that re-throws connection failures
- Global timeout configuration
- Explicit error propagation in `beforeAll` hooks

**Individual Test Requirements**: Each test file must:
- Wrap `beforeAll` hooks in try-catch blocks that re-throw errors
- Never silently catch connection failures
- Ensure that infrastructure problems cause test failures, not skips

### Handling Test Failures

When tests fail due to infrastructure issues (connection failures, server unavailability, etc.):

1. **DO NOT** modify tests to skip or mock the failing components
2. **DO** investigate and fix the underlying infrastructure problem
3. **DO** ensure that the test environment is properly configured
4. **DO** verify that all prerequisites are met before running tests

**Common Infrastructure Issues**:
- Salesforce CLI not logged in: Run `sf org display --json` to verify
- MCP server not starting: Check port availability and server configuration
- Network connectivity issues: Verify firewall and proxy settings
- Missing environment variables: Ensure `.env` file is properly configured

### MCP Tool Response Validation

**CRITICAL**: All MCP tools must return both `content` and `structuredContent` fields as required by the MCP protocol. Tests must validate this compliance.

**Tool Response Requirements**:
- **`content`**: Must be present, non-null, and an array with at least one element
- **`structuredContent`**: Must be present, non-null, and an object (not an array)
- **Both fields**: Must always be returned together - never one without the other

**Test Validation Pattern**: All tool tests must use the `validateMcpToolResponse()` helper function:

```javascript
import { validateMcpToolResponse } from '../testUtils.js'

test('tool test', async () => {
    const result = await client.callTool('toolName', { /* args */ })

    // Validate MCP tool response structure
    validateMcpToolResponse(result, 'toolName test description')

    // Then validate specific content
    expect(result.structuredContent.specificField).toBeTruthy()
    // ... other specific validations
})
```

**Why This Matters**:
- Ensures MCP protocol compliance across all tools
- Prevents false positives when tools don't follow the protocol
- Provides clear error messages when validation fails
- Maintains consistency across all test files
- Future-proofs validation rules in one central location

**Implementation Status**: The `validateMcpToolResponse()` function is available in `test/testUtils.js` and must be used in all tool tests. Any test that doesn't validate both fields is incomplete and may miss protocol violations.

### Test Output and Evidence

**CRITICAL**: All tests must provide clear, structured evidence of their execution using the `logTestResult()` function.

**Test Output Requirements**:
- **Structured Evidence**: All tests must use `logTestResult()` to provide clear, readable evidence of test execution
- **Consistent Format**: Test output follows a standardized format with clear sections
- **No Duplication**: Avoid duplicate logging between `logTestResult()` and manual `console.log()`
- **Appropriate Sections**: Only show relevant sections (INPUT, OUTPUT, RESULT) based on test type

**Test Output Pattern**: All tests must use the `logTestResult()` helper function:

```javascript
import { logTestResult } from '../testUtils.js'

// For MCP tool tests
test('tool test', async () => {
    const result = await client.callTool('toolName', { param: 'value' })

    logTestResult('toolName.test.js', 'Test description', { param: 'value' }, 'ok', result)

    // Validate results
    expect(result.structuredContent.field).toBeTruthy()
})

// For non-MCP tests
test('unit test', async () => {
    const output = someFunction(input)

    logTestResult('unit.test.js', 'Test description', {
        description: 'What this test validates',
        output: `Processed ${output.length} items`
    }, 'ok')

    // Validate results
    expect(output).toBeTruthy()
})
```

**Test Output Format**:
- **MCP Tool Tests**: Show INPUT (tool parameters), RESULT (content + structuredContent)
- **Non-MCP Tests**: Show DESCRIPTION, OUTPUT (test results summary)
- **Error Cases**: Show appropriate error messages with ✗ FAIL status
- **Skip Cases**: Show skip reasons with ⏭ SKIP status

**Why This Matters**:
- Provides clear evidence of test execution and results
- Makes test failures easier to debug and understand
- Ensures consistent test output across all test files
- Helps identify issues in CI/CD pipelines
- Improves developer experience when running tests

**Implementation Status**: The `logTestResult()` function is available in `test/testUtils.js` and must be used in all tests. Any test that doesn't provide structured evidence is incomplete.

### Testing prerequisites

- Salesforce CLI needs to be available in the working directory.

  - Check with:

    ```
    sf version
    ```

  - If check fails, run the following command and check again:

    ```
    npm install @salesforce/cli --save-dev
    ```

- Salesforce CLI must be logged to a Salesforce org.

  - Check with:

    ```
    sf org display --json
    ```

  - If check fails, run the following commands and check again:

    ```
    source .env

    response=$(curl -s -X POST "https://test.salesforce.com/services/oauth2/token" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "grant_type=password" \
      -d "client_id=$SF_ORG_CLIENT_ID" \
      -d "client_secret=$SF_ORG_CLIENT_SECRET" \
      -d "username=$SF_ORG_CLIENT_USERNAME" \
      -d "password=$SF_ORG_CLIENT_PASSWORD")

    export SF_ACCESS_TOKEN=$(echo "$response" | jq -r '.access_token')
    export SF_INSTANCE_URL=$(echo "$response" | jq -r '.instance_url')

    sf org login access-token --instance-url $SF_INSTANCE_URL --no-prompt --set-default
    ```

- Some tools requiere the working directory to be the root of a Salesforce project.

  - Check with:
    ```
    [ -f sfdx-project.json ] && [ -d force-app/main/default/ ] && echo "OK" || echo "NOT OK"
    ```
  - If check fails, run the following command and check again:
    ```
    sf project generate --name SalesforceTestProject
    ```

### Running tests

- #### Vitest test scripts

  Tests are written with Vitest and are located in the `test` directory.
  Currently tests only use stdio transport so they are not suitable for testing HTTP transport.

- To run all tests use:

  ```
  npm run test
  ```

- To run specific tests:

  ```
  npm run test -- --run describeObject.test.js executeSoqlQuery.test.js
  ```

#### Interacting with the MCP server in HTTP mode

- Boot the MCP server in HTTP mode working in the Salesforce project directory:
  ```
  echo WORKSPACE_FOLDER_PATHS=<PATH_TO_SALESFORCE_PROJECT> >> .env

  npm run start
  ```

- Use curl to send valid MCP requests with JSON-RPC messages to the server. For example:

  - Initialization request to get the session ID:

    ```
    curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{
      "jsonrpc": "2.0",
      "id": 1,
      "method": "initialize",
      "params": {
        "protocolVersion": "2025-06-18",
        "capabilities": {
          "roots": {"listChanged": true},
          "sampling": {}
        },
        "clientInfo": {
          "name": "curl-test-client",
          "version": "1.0.0"
        }
      }
    }'
    ```

  - Get tools list request
    ```
    curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "mcp-session-id: <SESSION_ID>" \
    -d '{
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/list"
    }'
    ```
  - Disconnect request
    ```
    curl -X DELETE http://localhost:3000/mcp \
    -H "mcp-session-id: <SESSION_ID>"
    ```

- #### Using the MiCroscoPe MCP Client command line interface

  The MiCroscoPe client can be installed as an NPM package (microscope-mcp-client). It can connect to the MCP server through stdio transport and provides an interface command line interface to operate the MCP server.

  You can run it with:
  ```
  microscope --server local_mcp_server.js #For local servers

  ```

## Pull requests

Always run linting after commiting.

## Reference

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)

- [MCP Typescript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

- ["Everything" MCP example server](https://github.com/modelcontextprotocol/servers/tree/main/src/everything)

- [Salesforce CLI command reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference)

- [Playwright library documentation](https://playwright.dev/docs/api/class-playwright)