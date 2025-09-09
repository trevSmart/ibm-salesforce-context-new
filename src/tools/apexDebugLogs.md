# Apex Debug Logs Tool

Allows you to manage Apex debug logs in Salesforce.

---
## Agent Instructions
- **MANDATORY**: When managing Apex debug logs in Salesforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- Use only the allowed action values: "status", "on", "off", "list", "get".
- Note: The `analyze` action is temporarily disabled and not available.

---
## Usage

### Available Actions

- `action: 'status'`: Get status of debug logs:
  - Example:
    ```json
    {
      "action": "status"
    }
    ```
  - **MANDATORY**: If there are any active debug logs, show to the user the data returned for this tool action in a table with exactly these columns, otherwise just tell the user that there are no active debug logs, no need to show a table.
    - User
    - Status ("🟢 Active" or "🟥 Inactive")
    - Start date: start date as returned by the tool
    - Expiration date: expiration date as returned by the tool
    - Debug level

- `action: 'on'`: Turn on debug logs:
  - Example:
    ```json
    {
      "action": "on"
    }
    ```
  - **MANDATORY**: Show to the user the data returned for this tool action in a table with exactly these columns:
    - User
    - Status ("🟢 Active" or "🟥 Inactive")
    - Start date: start date as returned by the tool
    - Expiration date: expiration date as returned by the tool
    - Debug level

- `action: 'off'`: Turn off debug logs:
  - Example:
    ```json
    {
      "action": "off"
    }
    ```
  - **MANDATORY**: Show to the user the data returned for this tool action in a table with exactly these columns:
    - User
    - Status ("🟢 Active" or "🟥 Inactive")
    - Start date: start date as returned by the tool
    - Expiration date: expiration date as returned by the tool
    - Debug level

- `action: 'list'`: To list org's last Apex debug logs:

  - **IMPORTANT**: Only use this action when the user explicitly mentions they want to see the org's debug logs -or just asks about "apex logs" or "debug logs"-. If the user asks about **the status** of the logs, use the `action: 'status'` action instead.
  - Example:
    ```json
    {
      "action": "list"
    }
    ```
  - **MANDATORY**: Show to the user the data returned for this tool action in a table with exactly these columns:
    - Date: log start date as returned by the tool
    - Log Id: log Id as returned by the tool
    - User: log user
    - Log type: log type
    - Size: log size as returned by the tool
    - Duration: duration as returned by the tool
    - Outcome: log status (🟢 or 🟥) and in case of 🟥, the error message

- `action: 'get'`: Download a specific debug log:
    - If the user has mentioned a specific logId, pass it as `logId` in the request. Otherwise, the tool will automatically show a selection menu to the user to select from the available logs.

  - Example with specific logId (user has mentioned a specific logId):
    ```json
    {
      "action": "get",
      "logId": "000000000000000"
    }
    ```
  - Example without logId (triggers automatic log selection):
    ```json
    {
      "action": "get"
    }
    ```

- `action: 'analyze'`: Temporarily unavailable.

---
## Examples

### Basic Usage
```json
{
  "action": "status"
}
```

### Get Specific Log
```json
{
  "action": "get",
  "logId": "000000000000000"
}
```

### Analyze (Disabled)
The `analyze` action is temporarily disabled and has been removed from examples until re-enabled.

### List All Available Logs
```json
{
  "action": "list"
}
```

### Turn On Debug Logs
```json
{
  "action": "on"
}
```

### Turn Off Debug Logs
```json
{
  "action": "off"
}
```
