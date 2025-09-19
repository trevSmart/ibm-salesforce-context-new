/**
 * @fileoverview Prompt for Salesforce org discovery and onboarding support
 */

/**
 * Prompt definition for Salesforce org discovery and onboarding support
 */
export const orgOnboardingPromptDefinition = {
	title: 'Org Discovery & Onboarding Support',
	description: 'Automatically discovers essential information about a Salesforce org to provide effective support and onboarding guidance'
};

/**
 * Prompt handler for Salesforce org discovery and onboarding support
 * This prompt guides the agent to automatically discover essential org information
 */
export function orgOnboardingPromptHandler() {
	return {
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `I need comprehensive support and guidance to understand this Salesforce org and provide effective assistance. Please help me discover and analyze the essential information about this org.

- **MANDATORY**: STRICTLY FOLLW THE FOLLOWING INSTRUCTIONS:
- Don't mention errors that may occur during the process, not while executing the queries neither in the final analysis.
- Please perform the following analysis, only show the results at the end of the analysis. Start the analysis with a "General overview" section containing a point list of insights (both business and technical). Place each insight in a new line.
- When talking about an object relevant to the analysis, provide some examples of records of that object. Every time you mention a record, show its name as a link to the record build the url using the instance url and the record id (\`https://instanceurl.my.salesforce.com/001KN000006JbG5YAK\`)
- End the analysis suggesting the next steps to dive deeper into the analysis. These next steps must be grouped by business and technical insights obtained, don't suggest general actions not related to the insights obtained.
- Is the org is a sandbox org, you can mention the volume of records but the insight must be based on the relative volume of records between the different objects, not the absolute record count as it probably will be different in a production org.
- When an SOQL query is provided, use exactly the query provided, don't modify it and don't add LIMIT or ORDER BY clauses.
- Present user roles in a hierarchy tree, for example:
 \`\`\`markdown
   📊 CaixaBank Salesforce Role Hierarchy Tree

   🏛️ ROOT LEVEL (No Parent)
   │
   ├── 🎯 CoE
   │   └── 🔧 Oficina Técnica
   │
   ├── 📞 Contact Center
   │   ├── 📞 Contact Center sin acceso a Directorio
   │   └── 👤 0013Y00002uzFnj Partner User
   │
   ├── 🚨 COPS
   │
   ├── 👥 Mis Clientes
   │   ├── 🏢 CIB y Empresas
   │   │   ├── 🏦 CIB
   │   │   └── 🏢 EMP
   │   ├── 🎉 Eventos
   │   │   ├── 📈 Eventos Accionista
   │   │   │   └── 📊 Promotor Accionista
   │   │   ├── 👨‍💼 Organizador
   │   │   ├── 🚀 Promotor
   │   │   ├── 🌐 Promotor Externo
   │   │   └── 🏛️ Promotor Interno
   │   └── 📈 Sistemática Comercial
   │
  \`\`\`
- Use bullet points when mentioning lists of items (only when it makes sense to do so, and when there are 3 objects or more). This is very important, don't use bullet points for lists of 2 or less items. This bullet points must be presented with each point in its own line.

1. **Initial Org Assessment**
   - Get org and user details using salesforceContextUtils
   - Check org type (Production, Sandbox, Developer, etc.)
   - Verify user permissions and access level

2. **Data Volume Analysis**
   - Query Account records count: SELECT COUNT() FROM Account
   - Query Opportunity records count: SELECT COUNT() FROM Opportunity
   - Query Contact records count: SELECT COUNT() FROM Contact
   - Query Case records count: SELECT COUNT() FROM Case
   - Query Lead records count: SELECT COUNT() FROM Lead

3. **Custom Objects Discovery**
   - List of custom objects in the org (SELECT Id, DeveloperName, NamespacePrefix FROM CustomObject WHERE ManageableState = 'unmanaged')
   - List of common prefixes for custom objects in case there is a noticeable pattern
   - List of Lightning Components
     - Aura Components (SELECT Name FROM AuraDefinitionBundle ORDER BY Name ASC)
     - Lightning Web Components (SELECT Name FROM LightningWebComponent ORDER BY Name ASC)
   - List of custom Salesforce flows (amb Tooling API: SELECT Id, DeveloperName, ActiveVersion.MasterLabel, ActiveVersion.VersionNumber, ActiveVersion.ProcessType, Description, ActiveVersionId, LastModifiedDate FROM FlowDefinition ORDER BY MasterLabel)

4. **Business Process Analysis**
   - Examine Account types and industries
   - Review Opportunity stages and processes
   - Analyze Contact roles and relationships
   - Check for custom business logic and automation

5. **Integration Assessment** (Use the Tooling API for this)
   - Look for legacy Connected Apps (SELECT Id, Name FROM ConnectedApplication ORDER BY Name ASC)
   - Look for External Client Apps (SELECT Id, MasterLabel, Description FROM ExternalClientApplication ORDER BY MasterLabel ASC)

   6. **User hierarchy analysis**
   - Query active User records to understand org size (SELECT Id, Name FROM User WHERE IsActive = TRUE)
   - Review profiles and permission sets
   - Describe the user roles setup **showing it in a hierarchy tree** (SELECT Id, Name, ParentRoleId FROM UserRole ORDER BY Name ASC)
   - Check sharing settings and security model

Please start the discovery process immediately.`
				}
			}
		]
	};
}
