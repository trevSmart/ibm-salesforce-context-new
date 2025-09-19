export const toolsBasicRunPromptDefinition = {
	title: 'Test tools',
	description: 'Test tools prompt for testing purposes',
	argsSchema: {}
};

export function toolsBasicRunPromptHandler() {
	return {
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `Execute a comprehensive test of all safe Salesforce MCP tools. This is a development sanity check that should run automatically without asking the user for any input.

**OBJECTIVE**: Test maximum number of tools with read-only operations that don't persist changes.

**EXECUTION PLAN** (execute in this order):

1. **salesforceContextUtils** - Safe actions only:
   - getCurrentDatetime
   - getOrgAndUserDetails
   - getState
   - loadRecordPrefixesResource

2. **getRecentlyViewedRecords** - Get recent records and save first ID for later use

3. **executeSoqlQuery** - Light read query:
   - Try: "SELECT Id, Name FROM Account ORDER BY LastModifiedDate DESC LIMIT 5"
   - Fallback: "SELECT Id, Name FROM Contact LIMIT 5" or "SELECT Id, Name FROM User LIMIT 5"
   - Save first ID for getRecord test

4. **getRecord** - Use ID from step 2 or 3

5. **describeObject** - Multiple variants:
   - Account with includeFields: false, includePicklistValues: false
   - Account with includeFields: true, includePicklistValues: false
   - Account with includeFields: false, includePicklistValues: true
   - Account with includeFields: true, includePicklistValues: true

6. **describeObject with Tooling API**:
   - sObjectName: "ApexClass", useToolingApi: true

7. **executeSoqlQuery with Tooling API**:
   - "SELECT Id, Name FROM ApexClass LIMIT 3", useToolingApi: true

8. **executeSoqlQuery** - Different objects:
   - "SELECT Id, Name FROM Contact LIMIT 3"
   - "SELECT Id, Name FROM User LIMIT 3"

9. **apexDebugLogs** - Non-mutating actions:
   - action: "status"
   - action: "list"
   - If logs exist, action: "get" with first log ID

10. **getSetupAuditTrail**:
    - lastDays: 7

11. **getApexClassCodeCoverage**:
    - First query: "SELECT Name FROM ApexClass WHERE NamespacePrefix = NULL LIMIT 3"
    - Use returned class names for coverage check

12. **executeAnonymousApex**:
    - apexCode: "System.debug('MCP test ping');"
    - mayModify: false

13. **runApexTest** (if test classes exist):
    - Query: "SELECT Name FROM ApexClass WHERE Status = 'Active' AND NamespacePrefix = NULL AND Body LIKE '%@isTest%' LIMIT 1"
    - Run test with found class name

14. **Cache test** - Repeat describeObject call to verify caching

15. **Error handling test**:
    - describeObject with non-existent object
    - executeSoqlQuery with invalid query

**EXCLUDED TOOLS** (do not execute):
- createMetadata, deployMetadata, dmlOperation
- Any tool that creates/updates/deletes data
- salesforceContextUtils: "reportIssue"

**FINAL REQUIREMENT**: Provide summary with:
- Total tools executed
- Success/error counts
- List of excluded tools with reasons

Execute all steps automatically without asking user for any input or confirmation.`
				}
			}
		]
	};
}
