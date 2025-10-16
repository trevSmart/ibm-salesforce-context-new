# Get Recently Viewed Records Tool

Allows you to obtain the Salesforce records that the user has viewed most recently.

---
## Agent Instructions
- **MANDATORY**: When obtaining recently viewed Salesforce records, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, SOQL queries, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- Show each record as a markdown link to its detail URL.
- If the list is empty, indicate it clearly.
- **CRITICAL**: Never transform the body of the request to input parameters.
- **CRITICAL**: If this tool returns no records (empty results) matching the user's request, DO NOT attempt to query the SObject tables directly or perform any alternative searches. Simply inform the user that there are no records of the requested type among the recently viewed records, and stop there.

---
## Usage

### Parameters
This tool does not require any parameters.

---
## Usage Examples

### Example 1: Get recently viewed records
```json
{}
```

---
## Response Structure

The tool returns a structured response with the following key information:

### Structured Content
- `records`: Array of recent records with the following structure:
  - `Id`: Salesforce record Id
  - `Name`: Record name
  - `Type`: SObject type
  - `LastViewedDate`: Date when the record was last viewed
  - `LastReferencedDate`: Date when the record was last referenced
- `totalSize`: Total number of records returned
- `done`: Boolean indicating if all records have been retrieved

### Example Response Structure
```json
{
  "records": [
    {
      "Id": "001XXXXXXXXXXXXXXX",
      "Name": "Acme Corporation",
      "Type": "Account",
      "LastViewedDate": "2024-01-15T10:30:00.000+0000",
      "LastReferencedDate": "2024-01-15T10:30:00.000+0000"
    },
    {
      "Id": "003XXXXXXXXXXXXXXX",
      "Name": "John Doe",
      "Type": "Contact",
      "LastViewedDate": "2024-01-15T09:15:00.000+0000",
      "LastReferencedDate": "2024-01-15T09:15:00.000+0000"
    }
  ],
  "totalSize": 2,
  "done": true
}
```

---
## Notes
- The tool queries the RecentlyViewed object to get the most recently accessed records.
- Records are ordered by LastViewedDate in descending order.
- The tool automatically includes all necessary fields for display and navigation.