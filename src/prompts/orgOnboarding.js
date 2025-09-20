import { readFileSync } from 'node:fs';

const orgOnboardingApexScript = readFileSync(new URL('../static/orgOnboarding.apex', import.meta.url), 'utf-8').trim();

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

- **MANDATORY**: STRICTLY FOLLOW THE FOLLOWING INSTRUCTIONS:
- **PERFORMANCE OPTIMIZATION**: Run a single Anonymous Apex script that executes all the required queries together (instead of multiple tool calls). This significantly improves performance by reducing round-trips and server/client processing.
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

- Execute exactly once the following Anonymous Apex script using the "executeAnonymousApex" tool with parameter \`mayModify=false\`. Do not change its content. After execution, parse the debug output and use it to conduct the analysis sections below. Prefer the JSON payload emitted after the last "|" on each USER_DEBUG line:

\`\`\`apex
${orgOnboardingApexScript}
\`\`\`

1. **Initial Org Assessment**
   - Get org and user details using salesforceContextUtils
   - Check org type (Production, Sandbox, Developer, etc.)
   - Verify user permissions and access level

2. **Data Volume Analysis**
   - Use Anonymous Apex to execute all count queries together:
     * Account records count: SELECT COUNT() FROM Account
     * Opportunity records count: SELECT COUNT() FROM Opportunity
     * Contact records count: SELECT COUNT() FROM Contact
     * Case records count: SELECT COUNT() FROM Case
     * Lead records count: SELECT COUNT() FROM Lead

3. **Custom Objects Discovery**
   - Use Schema global describe inside the Anonymous Apex script to enumerate custom objects (API names ending with __c)
   - Analyze common prefixes for custom objects in case there is a noticeable pattern

4. **Business Process Analysis**
   - Examine Account types and industries
   - Review Opportunity stages and processes
   - Analyze Contact roles and relationships
   - Check for custom business logic and automation

5. **Integration Assessment**
   - Summarize known integration points if available (Connected Apps, External Client Apps) based on existing knowledge
   - Note: Detailed integration inventory may require follow-up specialized tools or metadata queries outside this script

6. **User hierarchy analysis**
   - Use Anonymous Apex to execute user-related queries together:
     * Active users: SELECT Id, Name FROM User WHERE IsActive = TRUE
     * User roles: SELECT Id, Name, ParentRoleId FROM UserRole ORDER BY Name ASC
   - Review profiles and permission sets
   - Describe the user roles setup **showing it in a hierarchy tree**
   - Check sharing settings and security model

Please start the discovery process immediately.`
                }
            }
        ]
    };
}
