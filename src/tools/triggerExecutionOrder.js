//import {executeSoqlQuery} from '../salesforceServices.js';

import {z} from 'zod';
import {textFileContent} from '../utils.js';

export const triggerExecutionOrderDefinition = {
	name: 'triggerExecutionOrder',
	title: 'Trigger Execution Order',
	description: await textFileContent('tools/triggerExecutionOrder.md'),
	inputSchema: {
		sObjectName: z.string().describe('The name of the SObject to retrieve the trigger execution order for.')
	},
	annotations: {
		readOnlyHint: true,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Trigger Execution Order'
	}
};

/*
export async function triggerExecutionOrder(args) {
	try {
		const sObjectName = args.sObjectName;
		const operation = args.operation.toLowerCase();

		//1. Get triggers
		const triggersQuery = `SELECT Name, NamespacePrefix, Body FROM ApexTrigger WHERE TableEnumOrId = '${sObjectName}' AND (Status = 'Active') AND (NamespacePrefix = '' OR NamespacePrefix = NULL) ORDER BY Name`;
		const triggersRes = await executeSoqlQuery(triggersQuery);
		const triggers = triggersRes.records;

		//2. Get Process Builders
		let soql = 'SELECT Id, DeveloperName, LastModifiedDate, ProcessType, Status, ';
		soql += 'TriggerType, Description, VersionNumber, NamespacePrefix ';
		soql += 'FROM Flow WHERE ProcessType = \'Workflow\' AND Status = \'Active\' ';
		soql += 'AND (TableEnumOrId = \'${sObjectName}\' OR TableEnumOrId = null) ';
		soql += 'ORDER BY LastModifiedDate DESC';
		soql = soql.replace('${sObjectName}', sObjectName);
		const processesRes = await executeSoqlQuery(soql);
		const processes = processesRes.records;

		//3. Get Flows
		const recordTriggerType = {
			insert: '(\'Create\', \'CreateAndUpdate\')',
			update: '(\'Update\', \'CreateAndUpdate\')',
			upsert: '(\'Create\', \'Update\', \'CreateAndUpdate\')',
			delete: '(\'Delete\')'
		}[operation];

		let flowQuery = 'SELECT Id, ApiName, Label, TriggerType, TriggerOrder, TriggerObjectOrEventLabel, TriggerObjectOrEventId, RecordTriggerType, Description, VersionNumber, LastModifiedBy.Name, LastModifiedDate';
		florQuery += ` FROM FlowDefinitionView WHERE IsActive = TRUE AND ProcessType = 'AutoLaunchedFlow' AND NamespacePrefix = NULL AND TriggerObjectOrEventId.QualifiedApiName = '${sObjectName}'`;
		flowQuery += ` AND TriggerType IN ('RecordBeforeSave', 'RecordAfterSave', 'RecordBeforeDelete') AND RecordTriggerType IN ${recordTriggerType} AND IsTemplate = FALSE`;
		const flowsRes = await executeSoqlQuery(flowQuery);
		const flows = flowsRes.records;

		//4. Get Validation Rules
		const validationRulesQuery = `SELECT Id, Active, ErrorDisplayField, ErrorMessage, Description, EntityDefinition.QualifiedApiName, ValidationName FROM ValidationRule WHERE Active = true AND EntityDefinition.QualifiedApiName = '${sObjectName}'`;
		const validationRulesRes = await executeSoqlQuery(validationRulesQuery);
		const validationRules = validationRulesRes.records;

		//5. Get Workflow Rules
		const workflowRulesQuery = `SELECT Id, Name, TableEnumOrId, Active, Description, TriggerType FROM WorkflowRule WHERE Active = true AND TableEnumOrId = '${sObjectName}'`;
		const workflowRulesRes = await executeSoqlQuery(workflowRulesQuery);
		const workflowRules = workflowRulesRes.records;

		//Analyze the trigger code to detect dependencies
		const triggerAnalysis = triggers.map(trigger => {
			const body = trigger.Body || '';
			const dependencies = {
				flows: [],
				processes: [],
				apex: []
			};

			//Find calls to Flow.Interview
			const flowMatches = body.match(/Flow\.Interview\.[A-Za-z0-9_]+/g) || [];
			dependencies.flows = [...new Set(flowMatches.map(m => m.split('.')[2]))];

			//Find calls to Apex classes
			const apexMatches = body.match(/[A-Za-z0-9_]+\.[A-Za-z0-9_]+/g) || [];
			dependencies.apex = [...new Set(apexMatches.map(m => m.split('.')[0]))];

			return {
				name: trigger.Name,
				dependencies
			};
		});

		//Order the components according to Salesforce execution order
		const executionOrder = [];

		//1. System Validation Rules
		executionOrder.push({
			step: 1,
			name: 'System Validation Rules',
			description: 'System validations (required fields, lookup filters, etc.)'
		});

		//2. Before Triggers
		const beforeTriggers = triggers.filter(t => t.Body && t.Body.includes('before'));
		if (beforeTriggers.length > 0) {
			executionOrder.push({
				step: 2,
				name: 'Before Triggers',
				components: beforeTriggers.map(t => {
					const analysis = triggerAnalysis.find(ta => ta.name === t.Name);
					return {
						name: t.Name,
						dependencies: analysis ? analysis.dependencies : null
					};
				})
			});
		}

		//3. Custom Validation Rules
		if (validationRules.length > 0) {
			executionOrder.push({
				step: 3,
				name: 'Custom Validation Rules',
				components: validationRules.map(vr => ({
					name: vr.ValidationName,
					description: vr.Description,
					errorMessage: vr.ErrorMessage,
					errorField: vr.ErrorDisplayField
				}))
			});
		}

		//4. Before Save Flow
		const beforeSaveFlows = flows.filter(f => f.TriggerType === 'RecordBeforeSave');
		if (beforeSaveFlows.length > 0) {
			executionOrder.push({
				step: 4,
				name: 'Before Save Flows',
				components: beforeSaveFlows.map(f => ({
					name: f.DeveloperName,
					description: f.Description,
					version: f.VersionNumber,
					lastModifiedBy: f.LastModifiedBy ? f.LastModifiedBy.Name : null,
					lastModifiedDate: f.LastModifiedDate
				}))
			});
		}

		//5. Assignment Rules, Auto-Response Rules, Escalation Rules
		executionOrder.push({
			step: 5,
			name: 'Assignment/Auto-Response/Escalation Rules',
			description: 'If configured for the SObject'
		});

		//6. Duplicate Rules
		executionOrder.push({
			step: 6,
			name: 'Duplicate Rules',
			description: 'If configured for the SObject'
		});

		//7. Save Record
		executionOrder.push({
			step: 7,
			name: 'Save Record to Database',
			description: 'Salesforce saves the record to the database'
		});

		//8. After Save Flow
		const afterSaveFlows = flows.filter(f => f.TriggerType === 'RecordAfterSave');
		if (afterSaveFlows.length > 0) {
			executionOrder.push({
				step: 8,
				name: 'After Save Flows',
				components: afterSaveFlows.map(f => ({
					name: f.DeveloperName,
					description: f.Description,
					version: f.VersionNumber,
					lastModifiedBy: f.LastModifiedBy ? f.LastModifiedBy.Name : null,
					lastModifiedDate: f.LastModifiedDate
				}))
			});
		}

		//9. After Triggers
		const afterTriggers = triggers.filter(t => t.Body && t.Body.includes('after'));
		if (afterTriggers.length > 0) {
			executionOrder.push({
				step: 9,
				name: 'After Triggers',
				components: afterTriggers.map(t => {
					const analysis = triggerAnalysis.find(ta => ta.name === t.Name);
					return {
						name: t.Name,
						dependencies: analysis ? analysis.dependencies : null
					};
				})
			});
		}

		//10. Processes (Process Builder)
		if (processes.length > 0) {
			executionOrder.push({
				step: 10,
				name: 'Process Builder Processes',
				components: processes.map(p => ({
					name: p.DeveloperName,
					description: p.Description,
					version: p.VersionNumber,
					lastModifiedDate: p.LastModifiedDate
				}))
			});
		}

		//11. Workflow Rules
		if (workflowRules.length > 0) {
			executionOrder.push({
				step: 11,
				name: 'Workflow Rules',
				components: workflowRules.map(wr => ({
					name: wr.Name,
					description: wr.Description,
					triggerType: wr.TriggerType
				}))
			});
		}

		return {
			content: [{
				type: 'text',
				text: `Execution order for ${sObjectName} (${operation}):\n${JSON.stringify(executionOrder, null, 2)}`
			}],
			structuredContent: executionOrder
		};

    } catch (error) {
        const logger = createModuleLogger(import.meta.url);
        logger.error(error);
		/* return {
			isError: true,
			content: [{
				type: 'text',
				text: `Error in calling Salesforce Tooling API (${method} ${endpoint}): ${error.message}`
			}]
		};
	}
}
*/
