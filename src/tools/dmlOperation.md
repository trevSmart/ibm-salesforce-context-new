# DML Operation Tool

Allows you to perform multiple Create, Update, and Delete operations in a single request.

---
## Agent Instructions
- **⚠️ MANDATORY**: When executing DML operations in Salesforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, anonymous Apex execution, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.

- Use this tool when you need to perform DML operations. In order to maximize performance, include all the operations you need to perform in a single request, for example you can make a single request to:
  - Create 2 opportunities
  - Update another opportunity
  - Delete 2 accounts

- No server information is needed to run this tool so you don't need to previously retrieve the server information.

- **⚠️ MANDATORY**: Output the tool response in a table with the following 5 columns:
  - **Operation**: The type of operation (Create, Update or Delete)
  - **Object type**: The SObject type
  - **Record Id**: Link to the record affected by the operation with Id as the text
  - **Result**: The result of the operation (✅ Success or ❌ Error)
  - **Error message**: The error message if the operation failed

---
## Usage

### Parameters

- **operations**: Required. Object containing an array of records to create, update or delete

  - **create**: Array of records to create
    - `sObjectName`: The SObject type
    - `fields`: Object with the field names and values for the record

  - **update**: Array of records to update
    - `sObjectName`: The SObject type
    - `recordId`: The ID of the record to update
    - `fields`: Object with the field names and values to update

  - **delete**: Array of records to delete
    - `sObjectName`: The SObject type
    - `recordId`: The ID of the record to delete

- **options**: Optional. Object with the following properties:
  - `allOrNone`: If true, all operations must succeed or none will be committed (default: false)
  - `bypassUserConfirmation`: Whether to require user confirmation for destructive operations (default: false)

---
## Response Structure

```json
{
  "outcome": "success | partial | error | cancelled",
  "statistics": {
    "total": 0,
    "succeeded": 0,
    "failed": 0
  },
  "successes": [
    {
      "index": 0,
      "id": "recordId"
    }
  ],
  "errors": [
    {
      "index": 1,
      "message": "Error message",
      "type": "ValidationError",
      "fields": ["Name"]
    }
  ],
  "cancellationReason": "user_cancelled"
}
```

- `outcome` describes the overall result of the batch.
- `statistics` provides a summary of operations processed.
- `successes` lists successful items with their order index and any returned IDs.
- `errors` lists failed items with their index, message, and optional metadata.
- `cancellationReason` is only present when the operation is cancelled.

---
## Examples

### Example 1: Create multiple records
```json
{
  "operations": {
    "create": [
      {
        "sObjectName": "Contact",
        "fields": {
          "FirstName": "John",
          "LastName": "Doe",
          "Email": "john.doe@example.com"
        }
      },
      {
        "sObjectName": "Account",
        "fields": {
          "Name": "Acme Inc.",
          "Industry": "Technology"
        }
      }
    ]
  }
}
```

### Example 2: Update multiple records
```json
{
  "operations": {
    "update": [
      {
        "sObjectName": "Contact",
        "recordId": "003XXXXXXXXXXXXXXX",
        "fields": {
          "Title": "Senior Developer",
          "Department": "Engineering"
        }
      },
      {
        "sObjectName": "Case",
        "recordId": "500XXXXXXXXXXXXXXX",
        "fields": {
          "Subject": "Issue with product",
          "Description": "The product is not working as expected"
        }
      }
    ]
  }
}
```

### Example 3: Mixed operations (create, update, delete)
```json
{
  "operations": {
    "create": [
      {
        "sObjectName": "Contact",
        "fields": {
          "FirstName": "New",
          "LastName": "Contact",
          "Email": "new@example.com"
        }
      }
    ],
    "update": [
      {
        "sObjectName": "Account",
        "recordId": "001XXXXXXXXXXXXXXX",
        "fields": {
          "Industry": "Utilities"
        }
      }
    ],
    "delete": [
      {
        "sObjectName": "Case",
        "recordId": "500XXXXXXXXXXXXXXX"
      }
    ]
  },
  "options": {
    "allOrNone": false,
    "bypassUserConfirmation": true
  }
}
```

---
## Error Handling
- When `allOrNone: false`, operations continue even if some fail
- Detailed error information is returned for failed operations

---
## Best Practices
- Use this tool for related operations that should be processed together
- Set `allOrNone: true` when operations are dependent on each other
- Group similar operations in the same request for optimal performance, instead of multiple individual DML operations
