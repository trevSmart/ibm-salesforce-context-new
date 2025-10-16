# Get Record Tool

Allows you to obtain a Salesforce record by its Id and object type.

---
## Agent Instructions
- **MANDATORY**: When retrieving Salesforce records, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, SOQL queries, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- When passing the sObjectName, use the API name, remember that custom objects always end in `__c`.
- Do not return any field that is not explicitly in the response.
- If the field is a lookup, show the link to the related record.
- If the record does not exist, return a clear message indicating so.

---
## Usage

### Parameters
- **`sObjectName`** (required): The name of the SObject type of the record to retrieve.
- **`recordId`** (required): The Id of the record to retrieve.

---
## Usage Examples

### Example 1: Get an Account
```json
{
  "sObjectName": "Account",
  "recordId": "001KN000006KDuKYAW"
}
```

### Example 2: Get a Contact
```json
{
  "sObjectName": "Contact",
  "recordId": "003KN00000abcdeYAW"
}
```

### Example 3: Get a custom object record
```json
{
  "sObjectName": "CustomObject__c",
  "recordId": "a0XXXXXXXXXXXXXXX"
}
```

---
## Response Structure

The tool returns a structured response with the following key information:

### Structured Content
- `id`: Salesforce record Id
- `sObject`: SObject type
- `fields`: Object with all the fields and values of the record

### Example Response Structure
```json
{
  "id": "001XXXXXXXXXXXXXXX",
  "sObject": "Account",
  "fields": {
    "Name": "Acme Corporation",
    "Industry": "Technology",
    "Phone": "+1-555-0123",
    "Website": "www.acme.com",
    "BillingCity": "San Francisco",
    "BillingState": "CA"
  }
}
```

---
## Notes
- The tool automatically handles field relationships and lookups.
- All field values are returned as they appear in Salesforce.
- The tool provides direct access to record details without requiring SOQL queries.