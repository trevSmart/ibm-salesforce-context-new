# Get Apex Classes Code Coverage Tool

Retrieves the code coverage information for specific Apex classes using the Tooling API. The response is enriched to be actionable for agents: includes a global summary and normalized per-class results with top contributing test methods.

---
## Agent Instructions

- **MANDATORY**: When retrieving Apex class code coverage information in Salesforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, SOQL queries, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- **Input**: pass the exact class names (case sensitive) as an array.
- **Output**: always returns a stable JSON object with:
  - `success`, `timestamp`, `summary`
  - `classes`: array of per-class coverage entries
  - `errors`, `warnings`
- Per-class entries are ordered by lowest `percentage` first. Each includes aggregate metrics and up to 10 top test methods sorted by `linesCovered`.
- Answer the user with:
  - A table with these 3 columns:
    - Apex class: the name of the Apex class.
    - Coverage (%): the coverage percentage of the Apex class. If coverage not available or 0, show `N/A`.
    - Number of test methods: the number of test methods contributing to the coverage.
  - Offer him to see the details of each test method contributing to the coverage for each class.

---
## Usage

### Parameters
- **`classNames`** (required): Array of case-sensitive Apex class names to get code coverage for. If you pass a single string, it will be treated as an array with a single element.

---
## Usage Examples

### Example 1: Get coverage for two classes
```json
{
  "classNames": [
    "MyClass",
    "MyClass2"
  ]
}
```

### Example 2: Get coverage for a single class
```json
{
  "classNames": ["MyServiceClass"]
}
```

---
## Output Example

```json
{
  "success": true,
  "timestamp": "2025-08-13T10:22:31.123Z",
  "summary": {
    "totalClasses": 2,
    "classesWithCoverage": 1,
    "classesWithoutCoverage": 1,
    "averagePercentage": 44
  },
  "classes": [
    {
      "className": "MyClass",
      "classId": "01p...",
      "numLinesCovered": 77,
      "numLinesUncovered": 12,
      "percentage": 87,
      "coveredLines": 77,
      "uncoveredLines": 12,
      "totalLines": 89,
      "coverageStatus": "partial",
      "aggregateFound": true,
      "testMethods": [
        {
          "testClassName": "MyClass_Test",
          "testMethodName": "testA",
          "numLinesCovered": 23,
          "numLinesUncovered": 0,
          "linesCovered": 23,
          "linesUncovered": 0,
          "totalLines": 23,
          "percentage": 100
        }
      ]
    },
    {
      "className": "MyClass2",
      "classId": "01p...",
      "numLinesCovered": 0,
      "numLinesUncovered": 0,
      "percentage": 0,
      "coveredLines": 0,
      "uncoveredLines": 0,
      "totalLines": 0,
      "coverageStatus": "none",
      "aggregateFound": false,
      "testMethods": []
    }
  ],
  "errors": [],
  "warnings": []
}
```

---
## Notes
- If a class exists but has no recorded coverage aggregate, `aggregateFound` will be `false`, `totalLines` will be `0`, and `testMethods` will be an empty array.
- If any requested class does not exist, the tool throws an error and no results are returned.
- The tool uses the Tooling API to retrieve accurate code coverage data.
