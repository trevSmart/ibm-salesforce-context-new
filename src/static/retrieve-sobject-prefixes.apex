List<EntityDefinition> defs = new List<EntityDefinition>();
String lastApiName = '';

Boolean moreDefs = addMoreDefs(defs, lastApiName);
while (moreDefs) {
    lastApiName = defs[defs.size() - 1].QualifiedApiName;
    moreDefs = addMoreDefs(defs, lastApiName);
}

for (EntityDefinition entityDefinition : defs) {
    if (!entityDefinition.QualifiedApiName.endsWith('ChangeEvent')
    && !entityDefinition.QualifiedApiName.endsWith('History')
    && !entityDefinition.QualifiedApiName.endsWith('Share')
    && !entityDefinition.QualifiedApiName.endsWith('Feed')) {
        System.debug(entityDefinition.QualifiedApiName + ',' + entityDefinition.KeyPrefix);
    }
}

private static Boolean addMoreDefs(List<EntityDefinition> defs, String lastApiName) {
    List<EntityDefinition> newDefs = [SELECT QualifiedApiName, KeyPrefix FROM EntityDefinition
                                        WHERE QualifiedApiName != NULL
                                        AND KeyPrefix != NULL
                                        AND QualifiedApiName > :lastApiName
                                        AND (NOT QualifiedApiName LIKE '%ChangeEvent')
                                        ORDER BY QualifiedApiName ASC LIMIT 2000];
    defs.addAll(newDefs);
    return newDefs.size() == 2000;
}
