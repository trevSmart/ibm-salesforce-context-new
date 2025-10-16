Map<String, Object> response = new Map<String, Object>();

Map<String, Integer> recordCount = new Map<String, Integer>();
recordCount.put('Account', [SELECT Id FROM Account].size());
recordCount.put('Contact', [SELECT Id FROM Contact].size());
recordCount.put('Lead', [SELECT Id FROM Lead].size());
recordCount.put('Opportunity', [SELECT Id FROM Opportunity].size());
recordCount.put('Case', [SELECT Id FROM Case].size());
recordCount.put('User', [SELECT Id FROM User WHERE IsActive = TRUE].size());
response.put('recordCount', recordCount);

List<UserRole> userRoles = [SELECT Id, Name, ParentRoleId FROM UserRole ORDER BY Name ASC];
response.put('userRoles', userRoles);

List<Profile> profiles = [SELECT Name FROM Profile ORDER BY Name ASC];
response.put('profiles', profiles);

List<PermissionSet> permissionSets = [SELECT Name FROM PermissionSet WHERE IsCustom = TRUE AND Type = 'Regular' AND NamespacePrefix = NULL ORDER BY Name ASC];
response.put('permissionSets', permissionSets);

List<EntityDefinition> sharingSettings = [SELECT DeveloperName, InternalSharingModel, ExternalSharingModel FROM EntityDefinition WHERE DeveloperName IN ('Account', 'Contact', 'Lead', 'Opportunity', 'Case')];
response.put('sharingSettings', sharingSettings);

Map<String, List<BusinessProcess>> businessProcesses = new Map<String, List<BusinessProcess>>();
businessProcesses.put('Opportunity', [SELECT Name FROM BusinessProcess WHERE IsActive = TRUE AND TableEnumOrId = 'Opportunity']);
businessProcesses.put('Case', [SELECT Name FROM BusinessProcess WHERE IsActive = TRUE AND TableEnumOrId = 'Case']);
response.put('businessProcesses', businessProcesses);

Map<String, List<RecordType>> recordTypes = new Map<String, List<RecordType>>();
recordTypes.put('Account', [SELECT Name FROM RecordType WHERE IsActive = TRUE AND SObjectType = 'Account' AND NamespacePrefix = NULL]);
recordTypes.put('Contact', [SELECT Name FROM RecordType WHERE IsActive = TRUE AND SObjectType = 'Contact' AND NamespacePrefix = NULL]);
recordTypes.put('Lead', [SELECT Name FROM RecordType WHERE IsActive = TRUE AND SObjectType = 'Lead' AND NamespacePrefix = NULL]);
recordTypes.put('Opportunity', [SELECT Name FROM RecordType WHERE IsActive = TRUE AND SObjectType = 'Opportunity' AND NamespacePrefix = NULL]);
recordTypes.put('Case', [SELECT Name FROM RecordType WHERE IsActive = TRUE AND SObjectType = 'Case' AND NamespacePrefix = NULL]);
response.put('recordTypes', recordTypes);

Map<String, Integer> customization = new Map<String, Integer>();
customization.put('Apex classes', [SELECT Count() FROM ApexClass WHERE NamespacePrefix = NULL]);
customization.put('Aura components', [SELECT Count() FROM AuraDefinitionBundle WHERE NamespacePrefix = NULL]);
response.put('customization', customization);

Map<String, List<SObject>> externalApps = new Map<String, List<SObject>>();
externalApps.put('connectedApps', [SELECT Name FROM ConnectedApplication]);
externalApps.put('externalClientApps', [SELECT DeveloperName FROM ExternalClientApplication WHERE NamespacePrefix = NULL]);
response.put('externalApps', externalApps);

System.debug(response);