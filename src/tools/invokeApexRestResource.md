# Invoke Apex REST Resource Tool

Allows you to invoke REST endpoints published via Apex REST Resources in Salesforce.

---
## Agent Instructions
- **MANDATORY**: When invoking Apex REST Resources in Salesforce, you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct Salesforce CLI or curl commands, or an Anonymous Apex script execution, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.

- The tool automatically deduces the endpoint URL based on the content of the Apex class, and manages the authentication automatically.

---
## Usage

### Tool Input
- `apexClassOrRestResourceName` (required): The Apex REST Resource class name or the name of its containing Apex class (e.g., "CSBD_WS_AltaOportunidad")
- `operation` (required): The HTTP operation to perform ("GET", "POST", "PUT", "PATCH", "DELETE")
- `bodySerialized` (optional): The request body for POST/PUT/PATCH operations as a JSON string (takes priority over `bodyObject`)
- `bodyObject` (optional): The request body for POST/PUT/PATCH operations as an object (will be serialized to JSON, used only if `bodySerialized` is not provided)
- `urlParams` (optional): URL parameters to append to the endpoint (object)
- `headers` (optional): Additional headers to include in the request (object)

**Note**: Only one body parameter should be used at a time. If both are provided, `bodySerialized` takes precedence.

### Tool Output
**The result of the tool for a successful request has 4 keys:**
- `endpoint`: The constructed endpoint URL
- `request`: Details of the request sent (method, headers, body)
- `responseBody`: The response from the Salesforce REST API
- `status`: HTTP status code

### **IMPORTANT**: Format of your response to the user
- **For a successful request**

  In this case, share as a text a hierarchical representation of the responseBody attribute, without mentioning any other keys.

- **For a failed request**

  In this case, share as a text the error message returned by the tool.
---

## Examples

### Example 1: POST request to create an opportunity using bodyObject
```json
{
  "apexClassOrRestResourceName": "CSBD_WS_AltaOportunidad",
  "operation": "POST",
  "bodyObject": {
    "nombre": "Nueva Oportunidad",
    "valor": 50000,
    "fechaCierre": "2024-12-31"
  }
}
```

### Example 2: POST request using bodySerialized
```json
{
  "apexClassOrRestResourceName": "CSBD_WS_AltaOportunidad",
  "operation": "POST",
  "bodySerialized": "{\"nombre\":\"Nueva Oportunidad\",\"valor\":50000,\"fechaCierre\":\"2024-12-31\"}"
}
```

### Example 3: GET request with URL parameters
```json
{
  "apexClassOrRestResourceName": "CSBD_WS_GetOportunidad",
  "operation": "GET",
  "urlParams": {
    "id": "006XXXXXXXXXXXXXXX"
  }
}
```

### Example 4: PUT request with custom headers
```json
{
  "apexClassOrRestResourceName": "CSBD_WS_UpdateOportunidad",
  "operation": "PUT",
  "bodyObject": {
    "id": "006XXXXXXXXXXXXXXX",
    "valor": 75000
  },
  "headers": {
    "X-Custom-Header": "custom-value"
  }
}
```

### Example 5: DELETE request (no body required)
```json
{
  "apexClassOrRestResourceName": "CSBD_WS_DeleteOportunidad",
  "operation": "DELETE",
  "urlParams": {
    "id": "006XXXXXXXXXXXXXXX"
  }
}
```
