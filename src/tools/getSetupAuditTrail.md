# Get Setup Audit Trail changes Tool

Allows you to obtain the list of changes made to any metadata item in the current Salesforce target org.

---
## Agent Instructions
- **MANDATORY**: When obtaining Setup Audit Trail changes in Salesforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, SOQL queries, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- Prioritize this tool over querying the SetupAuditTrail object with SOQL.

---
## Usage

You don't need to select an org -the tool will query the current target org-. Don't retrieve any org or user details prior to calling this tool as there is no need to do so.

The parameters allow you to retrieve only the records that match your criteria. You can use none and all the records will be returned.

### Parameters
- **`lastDays`** (optional, default: 30): If set, only the changes from the last number of days will be returned (must be between 1 and 90)
- **`user`** (optional): If set, only the changes performed by this user will be returned (if not set the changes from all users will be returned). **Note**: You can pass either a username (containing @) or a user name (without @). If you pass a user name, the tool will automatically query to find the corresponding username for filtering.
- **`metadataName`** (optional): If set, only the changes performed in this metadata will be returned (if not set the changes from all metadata will be returned). **Note**: Uses exact word matching to avoid false positives (e.g., searching for "MyApexClass" won't return changes for "MyApexClassTest"). Query the metadata name first to ensure you are using the correct one.

---
## Output Format

Present the output in a table with exactly the following columns:
- Date
- User
- Section
- Action

---
## Usage Examples

### Example 1: Get changes from the last 7 days for all users and all metadata
```json
{
  "lastDays": 7
}
```

### Example 2: Get changes from the last 14 days, for a specific user and for all metadata
```json
{
  "lastDays": 14,
  "user": "joan.garcia@company.com"
}
```

Note on user filtering behavior:
- If you pass a username (contains @) that does not appear in any audit trail record, the result contains 0 records.
- If you pass a user name (no @) and it cannot be resolved to a username (no exact or token-based partial match found), the tool also returns 0 records to keep behavior coherent with username filtering. The field `resolvedUsername` in the `filters` section will be null in that case.

### Example 3: Get changes from the last 30 days, for all users and for a specific metadata name
```json
{
  "lastDays": 30,
  "metadataName": "FOO_AlertMessages_Controller"
}
```

### Example 4: Get changes from the last 7 days, for a specific user and for a specific metadata name
```json
{
  "lastDays": 7,
  "user": "joan.garcia@company.com",
  "metadataName": "FOO_AlertMessages_Controller"
}
```

---
## Response Structure

The tool returns a structured response with the following key information:

### Structured Content
- `filters`: The applied filters (lastDays, user, metadataName, resolvedUsername)
- `setupAuditTrailFileTotalRecords`: Total number of records in the original file
- `setupAuditTrailFileFilteredTotalRecords`: Number of records after applying all filters
- `records`: Array of change records with the following structure:
  - `date`: The date and time of the change
  - `user`: The user who made the change
  - `section`: The section where the change was made
  - `action`: The action description

### Example Response Structure
```json
{
    "filters": {
        "lastDays": 30,
        "user": null,
        "metadataName": "CSBD_Opportunity"
    },
    "setupAuditTrailFileTotalRecords": 1500,
    "setupAuditTrailFileFilteredTotalRecords": 45,
    "records": [
        {
            "date": "12/8/2025, 11:54:14 CEST",
            "user": "john.doe@company.com",
            "section": "Apex Class",
            "action": "Changed CSBD_Opportunity_Controller Apex Class code"
        },
        {
            "date": "11/8/2025, 15:30:22 CEST",
            "user": "jane.smith@company.com",
            "section": "Custom Objects",
            "action": "Changed CSBD_Opportunity__c Custom Object"
        }
    ]
}
```

---
## Notes
- The tool automatically downloads and processes the Setup Audit Trail CSV file.
- Filtering is performed efficiently in memory to provide fast results.
- The tool supports both username and display name resolution for user filtering.
