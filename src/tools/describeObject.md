# Describe Object Tool

Allows you to obtain SObject schema information.

⚠️ **CRITICAL**: Display the response putting every single reference to an API name between backticks (including all references to the object name), for example:
```markdown
`CustomObject__c`
```
instead of:
```markdown
CustomObject__c
```

⚠️ **CRITICAL**: Maximum 20 lines response if no specific information is requested.
- **Standard response**: Maximum 20 lines.
- **Detailed response**: Only when user explicitly requests specific details.

For example, if the user asks for the schema of the Account object, the response should be a concise summary of the Account object with at most 20 lines:

```markdown
## Description of the `Account` object

The `Account` object is the standard Salesforce object for managing **accounts** and **companies**.

**General information:**
- API Name: `Account`
- Label: "Account"
- Prefix: `001`
- Type: Standard object

**Main fields:**
- `Name`: Account name (required)
- `AccountNumber`: Account number
- `Type`: Account type (picklist)
- `Industry`: Industry sector
- `Rating`: Account rating
- `Phone`: Phone number
- `Website`: Website URL
- `Description`: Account description
- `AnnualRevenue`: Annual revenue
- `NumberOfEmployees`: Number of employees

**Addresses:**
- `BillingAddress`: Billing address
- `ShippingAddress`: Shipping address

**Relationships:**
- `ParentId`: Parent account
- `OwnerId`: Account owner

**Features:** Creatable, updatable, deletable, queryable and searchable.
```

---
## Agent Instructions

### Output Format Rules (⚠️ MANDATORY)

#### LENGTH OF YOUR RESPONSE
If you exceed 15 lines without specific user request, your response is INCORRECT:

  - **DEFAULT RESPONSE**: When user asks general schema info (e.g., "describe Account"), provide ONLY a concise summary of **at most 20 lines** (⚠️ CRITICAL)

  - **DETAILED RESPONSE**: Only when user explicitly requests specific details (e.g., "What fields does Case have for status tracking?")

#### FORMATTING
Display the response putting all API names between backticks (e.g., `CustomObject__c`).

#### QUALITY CONTROL
Do not hallucinate or make assumptions: every element you mention must be based on the response from this tool.

---
## Usage

**CRITICAL**: Call this tool ONLY ONCE per SObject. The response contains ALL the information you need about the SObject. DO NOT call this tool multiple times for the same SObject unless the user explicitly requests different information with different parameters.

### Parameters
- **`sObjectName`** (required): The name of the SObject to describe
- **`includeFields`** (optional, default: true): If true, includes fields in the response. If false, excludes fields for faster processing and smaller response.
- **`includePicklistValues`** (optional, default: false): If true, includes picklist values for picklist and multipicklist fields. If false, only field metadata is returned.
- **`useToolingApi`** (optional, default: false): If true, uses the Tooling API instead of the UI API. Use this for Tooling API objects like ApexClass, ApexTrigger, etc.

**Note**: The default behavior (`includeFields: true`) is recommended for most use cases where you need field details. Set `includeFields: false` only when you specifically want to exclude fields for better performance. Use `includePicklistValues: true` when you need the actual values available in picklist fields.

---
## Examples

### Get complete SObject schema including fields (default) for `Account` object
```json
{
  "sObjectName": "Account"
}
```

### Get only metadata (no fields) for faster processing for `Account` object
```json
{
  "sObjectName": "Account",
  "includeFields": false
}
```

### Get metadata with picklist values for `Account` object
```json
{
  "sObjectName": "Account",
  "includePicklistValues": true
}
```

### Get only picklist values without other field metadata for `Account` object
```json
{
  "sObjectName": "Account",
  "includeFields": false,
  "includePicklistValues": true
}
```

### Get metadata for `Case` object
```json
{
  "sObjectName": "Case",
  "includeFields": false
}
```

### Get metadata for Tooling API object (e.g., `ApexCodeCoverageAggregate`)
```json
{
  "sObjectName": "ApexCodeCoverageAggregate",
  "useToolingApi": true
}
```