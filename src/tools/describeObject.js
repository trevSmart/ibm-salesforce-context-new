/** biome-ignore-all lint/style/useNamingConvention: SObject fields are not camelCase */
import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {callSalesforceApi} from '../lib/salesforceServices.js';
import {newResource, resources} from '../mcp-server.js';
import {textFileContent} from '../utils.js';

const logger = createModuleLogger(import.meta.url);

export const describeObjectToolDefinition = {
	name: 'describeObject',
	title: 'Describe SObject schema',
	description: await textFileContent('tools/describeObject.md'),
	inputSchema: {
		sObjectName: z.string().describe('The name of the SObject to describe'),
		includeFields: z.boolean().describe('If true, includes fields in the response. If false, excludes fields for faster processing and smaller response.').default(true),
		includePicklistValues: z.boolean().describe('If true, includes picklist values for picklist and multipicklist fields. If false, only field metadata is returned.').default(false),
		useToolingApi: z.boolean().optional().default(false).describe('Whether to use the Tooling API for retrieving the SObject schema (default: false)')
	},
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
		title: 'Describe SObject schema'
	}
};

export async function describeObjectToolHandler({sObjectName, includeFields = true, includePicklistValues = false, useToolingApi = false}) {
	try {
		const resourceName = `mcp://mcp/sobject-ui-schema-${sObjectName.toLowerCase()}.json`;

		// Check cache first
		if (resources[resourceName]) {
			logger.debug('SObject schema already cached, skipping fetch');
			const cached = JSON.parse(resources[resourceName].text);

			// Apply filtering to cached data
			const filteredData = applyFiltering(cached, includeFields, includePicklistValues);

			return {
				content: [
					{
						type: 'text',
						text: `Successfully retrieved from cache the SObject schema for ${sObjectName} with the following data: ${JSON.stringify(filteredData, null, 3)}`
					}
				],
				structuredContent: {wasCached: true, ...filteredData}
			};
		}

		let transformedData;

		if (useToolingApi) {
			// Use Tooling API for Tooling objects
			const response = await callSalesforceApi('GET', 'TOOLING', `/sobjects/${sObjectName}/describe`);

			if (!response || response.isError || response.error) {
				const errorMessage = response?.error?.message || response?.content?.[0]?.text || 'Unknown error calling Tooling API';
				throw new Error(errorMessage);
			}

			// Transform Tooling API response to match our expected format
			transformedData = transformToolingApiResponse(response, includePicklistValues);
		} else {
			// Use UI API for standard objects
			const response = await callSalesforceApi('GET', 'UI', `/object-info/${sObjectName}`);

			if (!response || response.isError || response.error) {
				const errorMessage = response?.error?.message || response?.content?.[0]?.text || 'Unknown error calling UI API';
				throw new Error(errorMessage);
			}

			// Transform UI API response to match our expected format
			transformedData = transformUiApiResponse(response, 'all', includePicklistValues);
		}

		// Apply filtering
		const filteredData = applyFiltering(transformedData, includeFields, includePicklistValues);

		// Cache the result (always cache the full data)
		newResource(resourceName, `${sObjectName} SObject schema`, `${sObjectName} SObject schema`, 'application/json', JSON.stringify(transformedData, null, 3), {audience: ['assistant', 'user']});

		return {
			content: [
				{
					type: 'text',
					text: `Successfully retrieved the SObject schema for ${sObjectName}`
				}
			],
			structuredContent: filteredData
		};
	} catch (error) {
		logger.error(error);

		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: error.message
				}
			],
			structuredContent: {error: true, message: error.message}
		};
	}
}

function applyFiltering(data, includeFields, includePicklistValues) {
	if (includeFields) {
		// Include everything including fields
		const result = {...data};

		// If includePicklistValues is true, ensure picklist values are included
		if (includePicklistValues && result.fields) {
			result.fields = transformFields(result.fields, includePicklistValues);
		}

		return result;
	}

	// Exclude fields when includeFields is false
	const result = {
		name: data.name,
		label: data.label,
		labelPlural: data.labelPlural,
		keyPrefix: data.keyPrefix,
		searchable: data.searchable,
		createable: data.createable,
		custom: data.custom,
		deletable: data.deletable,
		updateable: data.updateable,
		queryable: data.queryable,
		// Include record types and relationships (lightweight)
		recordTypeInfos: data.recordTypeInfos || [],
		childRelationships: data.childRelationships || []
		// Fields are excluded when includeFields is false
	};

	// If includePicklistValues is true, we need to include fields to get picklist values
	// This overrides the includeFields behavior for picklist values
	if (includePicklistValues && data.fields) {
		result.fields = transformFields(data.fields, includePicklistValues);
	}

	return result;
}

function transformUiApiResponse(uiApiResponse, include, includePicklistValues) {
	const result = {
		name: uiApiResponse.apiName,
		label: uiApiResponse.label || '',
		labelPlural: uiApiResponse.labelPlural || '',
		keyPrefix: uiApiResponse.keyPrefix || '',
		searchable: uiApiResponse.searchable,
		createable: uiApiResponse.createable,
		custom: uiApiResponse.custom,
		deletable: uiApiResponse.deletable,
		updateable: uiApiResponse.updateable,
		queryable: uiApiResponse.queryable
	};

	// Include fields if requested
	if (include === 'fields' || include === 'all') {
		result.fields = transformFields(uiApiResponse.fields || {}, includePicklistValues);
	}

	// Include record types if requested
	if (include === 'record types' || include === 'all') {
		result.recordTypeInfos = transformRecordTypes(uiApiResponse.recordTypeInfos || {});
	}

	// Include child relationships if requested
	if (include === 'child relationships' || include === 'all') {
		result.childRelationships = transformChildRelationships(uiApiResponse.childRelationships || []);
	}

	return result;
}

function transformToolingApiResponse(toolingApiResponse, includePicklistValues) {
	const result = {
		name: toolingApiResponse.name || toolingApiResponse.apiName,
		label: toolingApiResponse.label || '',
		labelPlural: toolingApiResponse.labelPlural || '',
		keyPrefix: toolingApiResponse.keyPrefix || '',
		searchable: toolingApiResponse.searchable,
		createable: toolingApiResponse.createable,
		custom: toolingApiResponse.custom,
		deletable: toolingApiResponse.deletable,
		updateable: toolingApiResponse.updateable,
		queryable: toolingApiResponse.queryable
	};

	// Include fields if available
	if (toolingApiResponse.fields) {
		result.fields = transformToolingFields(toolingApiResponse.fields, includePicklistValues);
	}

	// Include record types if available
	if (toolingApiResponse.recordTypeInfos) {
		result.recordTypeInfos = transformToolingRecordTypes(toolingApiResponse.recordTypeInfos);
	}

	// Include child relationships if available
	if (toolingApiResponse.childRelationships) {
		result.childRelationships = transformToolingChildRelationships(toolingApiResponse.childRelationships);
	}

	return result;
}

function transformToolingFields(toolingFields, includePicklistValues) {
	const transformedFields = [];

	for (const fieldInfo of toolingFields) {
		const transformedField = {
			name: fieldInfo.name || '',
			label: fieldInfo.label || '',
			type: mapToolingDataType(fieldInfo.type),
			length: fieldInfo.length || 0,
			custom: fieldInfo.custom,
			relationshipName: fieldInfo.relationshipName || null,
			referenceTo: fieldInfo.referenceTo || [],
			required: fieldInfo.nillable === false,
			unique: fieldInfo.unique,
			externalId: fieldInfo.externalId
		};

		// Include picklist values if requested
		if (includePicklistValues && (fieldInfo.type === 'picklist' || fieldInfo.type === 'multipicklist')) {
			transformedField.picklistValues = transformToolingPicklistValues(fieldInfo.picklistValues || []);
		}

		transformedFields.push(transformedField);
	}

	return transformedFields;
}

function transformToolingRecordTypes(toolingRecordTypes) {
	const transformedRecordTypes = [];

	for (const recordTypeInfo of toolingRecordTypes) {
		transformedRecordTypes.push({
			recordTypeId: recordTypeInfo.recordTypeId || '',
			name: recordTypeInfo.name || '',
			available: recordTypeInfo.available
		});
	}

	return transformedRecordTypes;
}

function transformToolingChildRelationships(toolingChildRelationships) {
	return toolingChildRelationships.map((relationship) => ({
		childSObject: relationship.childSObject || '',
		field: relationship.field || '',
		relationshipName: relationship.relationshipName || ''
	}));
}

function mapToolingDataType(toolingDataType) {
	// Map Tooling API data types to our standard format
	const typeMapping = {
		string: 'string',
		textarea: 'textarea',
		email: 'email',
		phone: 'phone',
		url: 'url',
		boolean: 'boolean',
		currency: 'currency',
		double: 'double',
		int: 'double',
		percent: 'percent',
		date: 'date',
		datetime: 'datetime',
		time: 'time',
		picklist: 'picklist',
		multipicklist: 'multipicklist',
		reference: 'reference',
		id: 'string'
	};

	return typeMapping[toolingDataType] || toolingDataType?.toLowerCase() || 'string';
}

function transformToolingPicklistValues(toolingPicklistValues) {
	const transformedValues = [];

	if (Array.isArray(toolingPicklistValues)) {
		for (const picklistValue of toolingPicklistValues) {
			transformedValues.push({
				value: picklistValue.value || '',
				label: picklistValue.label || picklistValue.value || ''
			});
		}
	}

	return transformedValues;
}

function transformFields(uiFields, includePicklistValues) {
	const transformedFields = [];

	for (const [fieldName, fieldInfo] of Object.entries(uiFields)) {
		const transformedField = {
			name: fieldInfo.apiName || fieldName,
			label: fieldInfo.label || '',
			type: mapDataType(fieldInfo.dataType),
			length: fieldInfo.length || 0,
			custom: fieldInfo.custom,
			relationshipName: fieldInfo.relationshipName || null,
			referenceTo: extractReferenceTo(fieldInfo),
			required: fieldInfo.required,
			unique: fieldInfo.unique,
			externalId: fieldInfo.externalId
		};

		// Include picklist values if requested
		if (includePicklistValues && (fieldInfo.dataType === 'Picklist' || fieldInfo.dataType === 'MultiselectPicklist')) {
			transformedField.picklistValues = transformPicklistValues(fieldInfo.picklistValues || []);
		}

		transformedFields.push(transformedField);
	}
	return transformedFields;
}

function transformRecordTypes(uiRecordTypes) {
	const transformedRecordTypes = [];

	for (const [recordTypeId, recordTypeInfo] of Object.entries(uiRecordTypes)) {
		transformedRecordTypes.push({
			recordTypeId: recordTypeId,
			name: recordTypeInfo.name || '',
			available: recordTypeInfo.available
		});
	}
	return transformedRecordTypes;
}

function transformChildRelationships(uiChildRelationships) {
	return uiChildRelationships.map((relationship) => ({
		childSObject: relationship.childObjectApiName || '',
		field: relationship.fieldName || '',
		relationshipName: relationship.relationshipName || ''
	}));
}

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

function transformPicklistValues(uiPicklistValues) {
	const transformedValues = [];

	// UI API returns picklist values as an array of objects with 'value' and 'label' properties
	if (Array.isArray(uiPicklistValues)) {
		for (const picklistValue of uiPicklistValues) {
			transformedValues.push({
				value: picklistValue.value || '',
				label: picklistValue.label || picklistValue.value || ''
			});
		}
	} else if (typeof uiPicklistValues === 'object' && uiPicklistValues !== null) {
		// Fallback: if it's an object, try to extract values
		for (const [value, label] of Object.entries(uiPicklistValues)) {
			transformedValues.push({
				value: value,
				label: label || value
			});
		}
	}

	return transformedValues;
}
