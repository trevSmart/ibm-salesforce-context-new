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
