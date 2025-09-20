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
// Consolidated Org Discovery Anonymous Apex (read-only)
// Emits a single JSON snapshot via System.debug for fast downstream parsing

public class OrgDiscoverySnapshot {
    public class RoleNode {
        public String id;
        public String name;
        public String parentId;
    }
}

Map<String, Object> snapshot = new Map<String, Object>();

// 1) Organization and current user details
Organization orgRec = [
    SELECT Id, Name, OrganizationType, InstanceName, IsSandbox, CreatedDate
    FROM Organization LIMIT 1
];
User me = [
    SELECT Id, Name, Username, Profile.Name, UserRole.Name
    FROM User WHERE Id = :UserInfo.getUserId()
];

Map<String, Object> orgInfo = new Map<String, Object>();
orgInfo.put('id', orgRec.Id);
orgInfo.put('name', orgRec.Name);
orgInfo.put('type', orgRec.OrganizationType);
orgInfo.put('instanceName', orgRec.InstanceName);
orgInfo.put('isSandbox', orgRec.IsSandbox);
orgInfo.put('createdDate', String.valueOf(orgRec.CreatedDate));

Map<String, Object> meInfo = new Map<String, Object>();
meInfo.put('id', me.Id);
meInfo.put('name', me.Name);
meInfo.put('username', me.Username);
meInfo.put('profileName', me.Profile != null ? me.Profile.Name : null);
meInfo.put('userRoleName', me.UserRole != null ? me.UserRole.Name : null);

snapshot.put('organization', orgInfo);
snapshot.put('currentUser', meInfo);

// 2) Data volume: counts of key standard objects
Map<String, Integer> counts = new Map<String, Integer>();
counts.put('Account', [SELECT COUNT() FROM Account]);
counts.put('Opportunity', [SELECT COUNT() FROM Opportunity]);
counts.put('Contact', [SELECT COUNT() FROM Contact]);
counts.put('Case', [SELECT COUNT() FROM Case]);
counts.put('Lead', [SELECT COUNT() FROM Lead]);
snapshot.put('counts', counts);

// 3) Custom objects discovery via Schema
List<String> customObjects = new List<String>();
Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
for (Schema.SObjectType t : gd.values()) {
    Schema.DescribeSObjectResult d = t.getDescribe();
    if (d.isCustom()) {
        customObjects.add(d.getName());
    }
}
customObjects.sort();
snapshot.put('customObjects', customObjects);

// Optional: detect common prefixes in custom object API names (before __)
Map<String, Integer> customPrefixes = new Map<String, Integer>();
for (String apiName : customObjects) {
    Integer idx = apiName.indexOf('__');
    if (idx > 0) {
        String prefix = apiName.substring(0, idx);
        customPrefixes.put(prefix, (customPrefixes.containsKey(prefix) ? customPrefixes.get(prefix) : 0) + 1);
    }
}
snapshot.put('customObjectPrefixes', customPrefixes);

// 4) Business process hints: selected picklists
Map<String, Object> business = new Map<String, Object>();
List<String> oppStages = new List<String>();
for (Schema.PicklistEntry pe : Schema.SObjectType.Opportunity.fields.StageName.getDescribe().getPicklistValues()) {
    oppStages.add(pe.getLabel());
}
business.put('opportunityStages', oppStages);

List<String> accountIndustries = new List<String>();
Schema.DescribeFieldResult indField = Schema.SObjectType.Account.fields.Industry;
if (indField != null && indField.getDescribe() != null) {
    for (Schema.PicklistEntry pe : indField.getDescribe().getPicklistValues()) {
        accountIndustries.add(pe.getLabel());
    }
}
business.put('accountIndustries', accountIndustries);
snapshot.put('business', business);

// 5) User and security: active user count, role listing, and tree-ready edges
Integer activeUsers = [SELECT COUNT() FROM User WHERE IsActive = true];
snapshot.put('activeUsers', activeUsers);

List<OrgDiscoverySnapshot.RoleNode> roles = new List<OrgDiscoverySnapshot.RoleNode>();
for (UserRole r : [SELECT Id, Name, ParentRoleId FROM UserRole ORDER BY Name ASC]) {
    OrgDiscoverySnapshot.RoleNode rn = new OrgDiscoverySnapshot.RoleNode();
    rn.id = r.Id; rn.name = r.Name; rn.parentId = r.ParentRoleId;
    roles.add(rn);
}
snapshot.put('roles', roles);

// Emit single JSON blob for easy parsing (take text after last '|')
System.debug('SNAPSHOT|' + JSON.serialize(snapshot));
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
