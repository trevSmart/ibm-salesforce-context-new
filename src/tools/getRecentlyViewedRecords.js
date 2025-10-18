import {createModuleLogger} from '../lib/logger.js';
import {executeSoqlQuery} from '../lib/salesforceServices.js';
import {textFileContent} from '../utils.js';

export const getRecentlyViewedRecordsToolDefinition = {
	name: 'getRecentlyViewedRecords',
	title: 'Get Recently Viewed Records',
	description: await textFileContent('tools/getRecentlyViewedRecords.md'),
	inputSchema: {},
	annotations: {
		readOnlyHint: true,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Get Recently Viewed Records'
	}
};

export async function getRecentlyViewedRecordsToolHandler() {
	const logger = createModuleLogger(import.meta.url);
	try {
		// Use executeSoqlQuery to get all recently viewed records
		const query = 'SELECT Id, Name, Type, LastViewedDate, LastReferencedDate FROM RecentlyViewed ORDER BY LastViewedDate DESC';
		const response = await executeSoqlQuery(query, false);

		// Extract records from the SOQL response
		const records = response?.records || [];

		const result = {
			records: records,
			totalSize: response?.totalSize || 0,
			done: true
		};

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2)
				}
			],
			structuredContent: result
		};
	} catch (error) {
		logger.error(error, 'Error getting recently viewed records');
		const errorResult = {error: true, message: error?.message};
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: JSON.stringify(errorResult, null, 2)
				}
			],
			structuredContent: errorResult
		};
	}
}
