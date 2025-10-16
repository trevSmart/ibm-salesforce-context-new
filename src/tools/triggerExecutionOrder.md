# Trigger Execution Order Tool

Allows you to obtain the execution order of triggers for a given SObject.

---
## Agent Instructions
- **MANDATORY**: When obtaining trigger execution order for Salesforce SObjects, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, SOQL queries, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- Pass the SObject name.
- Show the list of triggers and their execution order.
- If there are no triggers, indicate it clearly.

---
## Usage

### Example 1: Get execution order for Account
```json
{
  "sObjectName": "Account"
}
```

### Example 2: Get execution order for Case
```json
{
  "sObjectName": "Case"
}
```