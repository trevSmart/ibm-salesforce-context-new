import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {getRecord} from '../lib/salesforceServices.js';
import {textFileContent} from '../utils.js';

const logger = createModuleLogger(import.meta.url);

export const getRecordToolDefinition = {
	name: 'getRecord',
	title: 'Get Record',
	description: await textFileContent('tools/getRecord.md'),
	inputSchema: {
		sObjectName: z.string().describe('The name of the SObject type of the record to retrieve.'),
		recordId: z.string().describe('The Id of the record to retrieve.')
	},
	annotations: {
		readOnlyHint: true,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Get Record'
	}
};

export async function getRecordToolHandler({sObjectName, recordId}) {
	try {
		if (!(sObjectName && recordId)) {
			throw new Error('SObject name and record ID are required');
		}

		// Retrieve raw record from Salesforce
		const rawRecord = await getRecord(sObjectName, recordId);

		// Check if the response is an error
		if (rawRecord?.isError) {
			return {
				isError: true,
				content: rawRecord.content
			};
		}

		// Normalize into the tool's documented output schema
		const id = rawRecord?.Id || rawRecord?.id || recordId;
		const fields = {};
		if (rawRecord && typeof rawRecord === 'object') {
			for (const [key, value] of Object.entries(rawRecord)) {
				if (key === 'attributes' || key === 'Id' || key === 'id') {
					continue;
				}
				fields[key] = value;
			}
		}

		const structured = {id, sObject: sObjectName, fields};

		return {
			content: [
				{
					type: 'text',
					text: `Successfully retrieved details for the ${sObjectName} record with Id ${id}`
				}
			],
			structuredContent: structured
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
			structuredContent: error
		};
	}
}
