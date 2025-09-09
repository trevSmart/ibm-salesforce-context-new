// biome-ignore-all lint/style/useNamingConvention: A la resposta de la API no estan en camelCase
import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {callSalesforceApi} from '../lib/salesforceServices.js';
import {mcpServer} from '../mcp-server.js';
import {getAgentInstructions, textFileContent} from '../utils.js';

// Helper functions for UI API data transformation
function mapDataType(uiDataType) {
	// Map UI API data types to describe object format
	const typeMapping = {
		Text: 'string',
		TextArea: 'textarea',
		LongTextArea: 'textarea',
		RichTextArea: 'textarea',
		Email: 'email',
		Phone: 'phone',
		Url: 'url',
		Checkbox: 'boolean',
		Currency: 'currency',
		Number: 'double',
		Percent: 'percent',
		Date: 'date',
		DateTime: 'datetime',
		Time: 'time',
		Picklist: 'picklist',
		MultiselectPicklist: 'multipicklist',
		Reference: 'reference',
		MasterDetail: 'reference',
		Lookup: 'reference',
		AutoNumber: 'string',
		Formula: 'string'
	};

	return typeMapping[uiDataType] || uiDataType?.toLowerCase() || 'string';
}

function extractReferenceTo(fieldInfo) {
	if (!fieldInfo.referenceToInfos || fieldInfo.referenceToInfos.length === 0) {
		return [];
	}

	return fieldInfo.referenceToInfos.map((ref) => ref.apiName);
}

export const generateSoqlQueryToolDefinition = {
	name: 'generateSoqlQuery',
	title: 'Generate SOQL Query',
	description: await textFileContent('tools/generateSoqlQuery.md'),
	inputSchema: {
		soqlQueryDescription: z.string().describe('The description of the SOQL query to generate'),
		/*
		involvedSObjects: z
			.array(z.string())
			.describe('The SObjects involved in the query (e.g. ["Account", "Contact"])')
		*/
		involvedFields: z.array(z.string()).describe('The fields involved in the query (e.g. ["Case.AccountId", "Case.Account.Birthdate", "Contact.CreatedBy.Name"])')
	},
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
		title: 'Generate SOQL Query'
	}
};

export async function generateSoqlQueryToolHandler({soqlQueryDescription, involvedFields}) {
	const logger = createModuleLogger(import.meta.url);

	try {
		if (!soqlQueryDescription) {
			throw new Error('soqlQueryDescription is required');
		}

		if (!(involvedFields && Array.isArray(involvedFields)) || involvedFields.length === 0) {
			throw new Error('involvedFields array is required and must contain at least one field');
		}

		// Extract SObject names from involvedFields
		const sObjectNames = [
			...new Set(
				involvedFields.map((field) => {
					const parts = field.split('.');
					return parts[0];
				})
			)
		];

		const descObjResults = await Promise.all(
			sObjectNames.map(async (sObjectName) => {
				const uiApiResponse = await callSalesforceApi('GET', 'UI', `/object-info/${sObjectName}`);

				if (!uiApiResponse?.fields) {
					throw new Error(`The 'fields' property was not found in the object description for ${sObjectName}`);
				}

				// Transform child relationships from UI API format
				const childRelationships = (uiApiResponse.childRelationships || []).map((childRelationship) => ({
					childSObject: childRelationship.childObjectApiName || '',
					field: childRelationship.fieldName || ''
				}));

				// Transform fields from UI API format
				const fields = [];
				for (const [fieldName, fieldInfo] of Object.entries(uiApiResponse.fields)) {
					const field = {
						label: fieldInfo.label || '',
						name: fieldInfo.apiName || fieldName,
						type: mapDataType(fieldInfo.dataType),
						referenceTo: extractReferenceTo(fieldInfo),
						relationshipName: fieldInfo.relationshipName || null,
						calculated: fieldInfo.calculated,
						sortable: fieldInfo.sortable,
						encrypted: fieldInfo.encrypted,
						filterable: fieldInfo.filterable,
						polymorphic: fieldInfo.polymorphicForeignKey
					};
					if (fieldInfo.picklistValues?.length) {
						field.picklistValues = fieldInfo.picklistValues;
					}
					fields.push(field);
				}

				// Transform record types from UI API format
				const recordTypeInfos = [];
				for (const [, recordTypeInfo] of Object.entries(uiApiResponse.recordTypeInfos || {})) {
					if (recordTypeInfo.available) {
						recordTypeInfos.push({
							name: recordTypeInfo.name || '',
							developerName: recordTypeInfo.developerName || ''
						});
					}
				}

				return {
					name: uiApiResponse.apiName,
					label: uiApiResponse.label || '',
					childRelationships,
					fields,
					recordTypeInfos
				};
			})
		);

		// Build the prompt using soqlQueryDescription and the schema information
		let samplingPrompt = `## Query Description ##\n${soqlQueryDescription}\n\n## Schema Information ##\n`;

		descObjResults.forEach((describeResult, index) => {
			const sObjectName = sObjectNames[index];

			//Start building the samplingPrompt with the new agreed format
			samplingPrompt += `## ${sObjectName} schema ##`;

			samplingPrompt += '\n\n### Child Relationships ###';
			for (const child of describeResult.childRelationships) {
				samplingPrompt += `\n  - \`${child.field}\`: "${child.field}" → \`${child.childSObject}\``;
			}

			samplingPrompt += '\n\n### Fields ###';

			const fieldGroups = {
				Lookup: [],
				Text: [],
				Numeric: [],
				Picklist: [],
				Boolean: [],
				'Date/Time': []
			};

			//Group fields by type
			for (const field of describeResult.fields) {
				const fieldLineBase = `    - \`${field.name}\`: "${field.label}"`;
				if (field.type === 'reference') {
					fieldGroups.Lookup.push(`${fieldLineBase} → \`${field.referenceTo.join(' / ')}\``);
				} else if (['string', 'textarea', 'email', 'phone', 'url'].includes(field.type)) {
					fieldGroups.Text.push(`${fieldLineBase} [${field.type}]`);
				} else if (['int', 'double', 'currency', 'percent'].includes(field.type)) {
					fieldGroups.Numeric.push(`${fieldLineBase}`);
				} else if (field.type === 'picklist') {
					let picklistValues = '';
					if (field.picklistValues) {
						const values = field.picklistValues.map((v) => `"${v.value}"`).join(', ');
						picklistValues = `\n        Values: ${values}`;
					}
					fieldGroups.Picklist.push(`${fieldLineBase}${picklistValues}`);
				} else if (field.type === 'boolean') {
					fieldGroups.Boolean.push(`${fieldLineBase}`);
				} else if (['date', 'datetime'].includes(field.type)) {
					fieldGroups['Date/Time'].push(`${fieldLineBase}`);
				}
			}

			//Append grouped fields
			for (const [groupName, fields] of Object.entries(fieldGroups)) {
				if (fields.length > 0) {
					samplingPrompt += `\n- #### ${groupName} ####`;
					for (const line of fields) {
						samplingPrompt += `\n${line}`;
					}
				}
			}

			samplingPrompt += '\n\n### Record Types ###';
			for (const recordType of describeResult.recordTypeInfos) {
				samplingPrompt += `\n  - \`${recordType.developerName}\`: "${recordType.name}"`;
			}
		});

		const samplingResponse = await mcpServer.server.createMessage({
			messages: [{role: 'user', content: {type: 'text', text: samplingPrompt}}],
			systemPrompt: getAgentInstructions('generateSoqlQueryToolSampling'),
			modelPreferences: {speedPriority: 0, intelligencePriority: 1},
			maxTokens: 3000
		});

		return {
			content: [
				{
					type: 'text',
					text: samplingResponse.content.text
				}
			],
			structuredContent: samplingResponse
		};
	} catch (error) {
		logger.error(error);
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `❌ Error: ${error.message}`
				}
			]
		};
	}
}
