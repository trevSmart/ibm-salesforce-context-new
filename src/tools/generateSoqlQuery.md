# Generate SOQL Query Tool

Allows you to generate a well-formed, valid SOQL query instruction from a description provided by the user.

---
## Agent Instructions
- **MANDATORY**: When generating SOQL queries from descriptions, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- Use the description and the list of involved fields to build the most appropriate SOQL query.
- Return the generated query as a markdown fenced block, for example:

```soql
SELECT Name, Account.Name, Account.Estado__c
FROM Contact
WHERE Account.Name = 'Acme'
```

---
## Usage

### Parameters
- **`soqlQueryDescription`** (required): The description of the SOQL query to generate
- **`involvedFields`** (required): The fields involved in the query (e.g. ["Case.AccountId", "Case.Account.Birthdate", "Contact.CreatedBy.Name"])

---
## Usage Examples

### Example 1: Generate query to get active accounts
```json
{
  "soqlQueryDescription": "Get active accounts with their Id and Name",
  "involvedFields": ["Account.Id", "Account.Name", "Account.Active__c"]
}
```

### Example 2: Query with relationship
```json
{
  "soqlQueryDescription": "Get contacts created by a specific user and their account name",
  "involvedFields": ["Contact.Id", "Contact.Name", "Contact.Account.Name", "Contact.CreatedById", "Contact.CreatedBy.Name"]
}
```

### Example 3: Complex query with multiple conditions
```json
{
  "soqlQueryDescription": "Find all cases that are open, have high priority, and belong to accounts in the technology industry",
  "involvedFields": ["Case.Id", "Case.CaseNumber", "Case.Status", "Case.Priority", "Case.AccountId", "Case.Account.Name", "Case.Account.Industry"]
}
```

---
## Notes
- The tool analyzes the SObject schema to generate accurate queries.
- Generated queries include proper field relationships and syntax.
- The tool ensures all required fields (Id, Name) are included automatically.