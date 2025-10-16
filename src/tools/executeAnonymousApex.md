# Execute Anonymous Apex Tool

Allows you to execute anonymous Apex code in Salesforce.

---
## Agent Instructions
- **MANDATORY**: When executing anonymous Apex code in Salesforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- ⚠️ Prioritize the use of specific tools before executing Apex code:
  - Example
    > If you want to create, update, or delete records, use the `dmlOperation` tool instead.

  - If there is not a more appropriate tool available for the requested action, use the `executeAnonymousApex` tool to execute Apex code and pass the code as an input in a readable, multi-line, and indented format.

- Always show the code before executing it, but execute it right away. ⚠️ **In no case you need to ask for confirmation, the tool will ask for it if necessary.**
- Always do a System.debug() of the value returned by the function. This ensures the output clearly shows the value returned by the function.
- Show a summary of the result of the anonymous apex script execution.
- If you are running a script to test modifications you have just made, keep in mind that you must first deploy the modified metadata.

---
## Usage

### Parameters
- **`apexCode`** (required): The Apex code to execute
- **`mayModify`** (required): Tells the tool if the Apex code may make persistent modifications to the org. Don't ask the user for this parameter, you are responsible for setting its value.

---
## Usage Examples

### Example 1: Execute a simple debug
```json
{
  "apexCode": "System.debug('Hello World!');",
  "mayModify": false
}
```

### Example 2: Execute a class function
```json
{
  "apexCode": "MyClass.myMethod();",
  "mayModify": true
}
```

### Example 3: Query records and display results
```json
{
  "apexCode": "List<Account> accounts = [SELECT Id, Name FROM Account LIMIT 5]; System.debug('Found ' + accounts.size() + ' accounts'); for(Account acc : accounts) { System.debug('Account: ' + acc.Name); }",
  "mayModify": false
}
```

---
## Notes
- The tool will prompt for user confirmation if `mayModify` is true and the client supports elicitation.
- Execution results include debug logs and any output from the Apex code.
- The tool automatically handles code formatting and execution.