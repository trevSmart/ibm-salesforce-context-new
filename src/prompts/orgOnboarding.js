import {textFileContent} from '../utils.js';

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
export async function orgOnboardingPromptHandler() {
	// Load Apex script content via generalized textFileContent helper.
	// Works in dev (src/static/*.apex) and in packaged builds (src/static/*.apex.pam).
	const orgOnboardingApexScript = await textFileContent('static/orgOnboarding.apex');
	if (!orgOnboardingApexScript) {
		throw new Error('No orgOnboarding.apex(.pam) content found under static');
	}
	return {
		messages: [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `I need comprehensive support and guidance to understand this Salesforce org and provide effective assistance. Please help me discover and analyze the essential information about this org.

- **MANDATORY**: STRICTLY FOLLOW THE FOLLOWING INSTRUCTIONS:
- Only show the results at the end of the analysis. Start the analysis with a "General overview" section containing a point list of insights (both business and technical) based on the data retrieved. Place each insight in a new line.
- Don't mention errors that may occur during the process, not while retrieving the data nor in the final analysis.
- End the analysis sharing your insights. The purpose of this analysis is to provide an initial understanding of the org and the data it contains to a functional/technical analyst that will be working on the org.
- If the org is a sandbox org, you can mention the volume of records but the insight must be based on the relative volume of records between the different objects, not the absolute record count as it probably will be different in a production org.
- Present user roles in a hierarchy tree with a maximum depth of 4 levels and a maximum number of 5 roles per level, level must be represented with a different emoji. Use a monospace font for the tree for example:
 \`\`\`
📊 CaixaBank Salesforce Role Hierarchy Tree

   🏛️ ROOT LEVEL (No Parent)
   │
   ├── 🎯 CoE
   │   │
   │   └── 🔧 Technical Office
   │
   ├── 🚨 COPS
   │
   └── 👥 Mis Clientes
       │
       ├── 🏢 CIB y Empresas
       │   │
       │   ├── 🏦 CIB
       │   │
       │   └── 🏢 EMP
       │       │
       │       └── 📈 Commercial System
       │
       ├── 🎉 Eventos
       │   │
       │   ├── 📈 Eventos Accionista
       │   │   │
       │   │   └── 📊 Promotor Accionista
       │   │
       │   │
       │   └── 🏛️ Promotor Interno
       │
       └── 📈 Commercial System
 \`\`\`

- Use bullet points when mentioning lists of items (only when it makes sense to do so, and when there are 3 objects or more). This is very important, don't use bullet points for lists of 2 or less items. This bullet points must be presented with each point in its own line.

* Data retrieval

- 1. Call the salesforceContextUtils tool to get the org and user details

- 2. Execute exactly once the following Anonymous Apex script using the "executeAnonymousApex" tool with parameter \`mayModify=false\`
\`\`\`apex
${orgOnboardingApexScript}
\`\`\`

- 3. Call the executeSoqlQuery tool (useToolingApi: true) to get the number of custom objects
    - Query: SELECT Count() FROM CustomObject WHERE NamespacePrefix = NULL

- 4. Call the executeSoqlQuery tool (useToolingApi: true) to get the number of Lightning web components
    - Query: SELECT Count() FROM LightningComponentBundle WHERE NamespacePrefix = NULL

This 4 calls will retrieve all the data required for the analysis. Don't perform any other call other than these 2.

* Analysis output format

\`\`\`markdown
# Analysis

## Company name sandbox/production org overview

1. **Initial Org Assessment**
   - Check org type (Production, Sandbox, Developer, etc.)
   - Verify user permissions and access level

2. **Custom Objects Discovery**
   - Enumerate custom objects volume by custom object. Add 2 record examples for each custom object with the record id and the name as a link to the record build the url using the instance url and the record id (\`https://instanceurl.my.salesforce.com/001KN000006JbG5YAK\`)
   - Analyze common prefixes for custom objects in case there is a noticeable pattern

3. **Business Process Analysis**
   - Examine Account record types
   - Analyze Contact record types
   - Analyze Lead record types
   - Review Opportunity record types and sales processes
   - Review Case record types and service processes

4. **Customization Analysis**
   - Analyze the customization of the org
      - Custom objects
      - Apex classes
      - Aura components
      - Lightning web components

5. **Integration Assessment**
   - Summarize known integration points if available
      - Connected Apps
      - External Client Apps
   - Note: Detailed integration inventory may require follow-up specialized tools or metadata queries outside this script

6. **User hierarchy and security analysis**
   - User roles
   - Profiles
   - Permission sets
   - Object sharing model
      - Internal sharing model
      - External sharing model
\`\`\`

Please start the discovery process immediately.
`
				}
			}
		]
	};
}
