# Create Metadata (Apex Class, Apex Test Class, Apex Trigger or LWC) Tool

Generate a new Apex Class, a new Apex Test Class, a new Apex Trigger or a new LWC.

## Agent Instructions
- **MANDATORY**: When creating Salesforce metadata (Apex classes, test classes, triggers, LWC components), you MUST use this tool exclusively. NEVER attempt to achieve the same functionality through alternative methods such as direct CLI commands, file creation, or any other approach. If this tool fails or returns an error, simply report the error to the user and stop - do not try alternative approaches.
- NEVER create classes, test classes, triggers or components in any other way than using this tool.
- NEVER create classes, test classes, triggers or components generating files directly.
- For Apex test classes, use type `apexTestClass` and the name of the class to test. Do not use `apexClass` for test classes.
- Use the exact fields according to the tool input schema.
- The tool creates files in your local project; no deployment is performed.
- Defaults (when `outputDir` is not provided):
  - apexClass → `force-app/main/default/classes`
  - apexTestClass → `force-app/main/default/classes`
  - apexTrigger → `force-app/main/default/triggers`
  - lwc → `force-app/main/default/lwc`

---
## Usage

### Parameters
- **`type`** (required): The metadata type to generate: "apexClass", "apexTestClass", "apexTrigger" or "lwc".
- **`name`** (required): Name of the metadata to generate. For LWC, this will be the component folder name.
- **`outputDir`** (optional): Output directory relative to the workspace. Defaults depend on the type.
- **`triggerSObject`** (optional): Required for apexTrigger. The sObject API name the trigger is defined on.
- **`triggerEvent`** (optional): Required for apexTrigger. Trigger events. Example: ["before insert", "after update"].

---
## Usage Examples

### Example 1: Create an Apex Class
```json
{
  "type": "apexClass",
  "name": "MyNewService"
}
```

### Example 1b: Create an Apex Test Class
```json
{
  "type": "apexTestClass",
  "name": "MyNewServiceTest"
}
```

### Example 2: Create an Apex Trigger for all possible events
```json
{
  "type": "apexTrigger",
  "name": "AccountAfterInsert",
  "triggerSObject": "Account",
  "triggerEvent": ["before insert", "before update", "before delete", "after insert", "after update", "after delete", "after undelete"]
}
```

### Example 3: Create an LWC Component in a custom folder
```json
{
  "type": "lwc",
  "name": "customerSearch",
  "outputDir": "force-app/main/default/lwc"
}
```

---
## Response
The tool returns a JSON object with details about the generated files (paths and stdout).
