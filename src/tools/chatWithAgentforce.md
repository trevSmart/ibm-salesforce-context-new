# Chat With Agentforce Tool

Allows you to chat with Agentforce to get help about Salesforce.

---
## Agent Instructions
- **MANDATORY**: When chatting with Agentforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- Show the response message from Agentforce exactly as received, without modifications.
- Always ask what message the user wants to send if not specified.

---
## Usage

### Parameters
- **`message`** (required): The message to send to Agentforce.

### Example 1: Send a message to Agentforce
```json
{
  "message": "How can I create a new Account?"
}
```

### Example 2: Ask about Apex development
```json
{
  "message": "What are the best practices for writing Apex triggers?"
}
```

### Example 3: Get help with SOQL queries
```json
{
  "message": "How do I write a SOQL query to get all contacts for a specific account?"
}
```

---
## Notes
- The tool requires the `SF_MCP_AGENTFORCE_AGENT_ID` environment variable to be set.
- Each conversation starts a new session with Agentforce.
- The tool automatically handles authentication and session management.