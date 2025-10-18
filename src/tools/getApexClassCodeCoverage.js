import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {getApexClassCodeCoverage} from '../lib/salesforceServices.js';
import {textFileContent} from '../utils.js';

export const getApexClassCodeCoverageToolDefinition = {
	name: 'getApexClassCodeCoverage',
	title: 'Get Apex Classes Code Coverage',
	description: await textFileContent('tools/getApexClassCodeCoverage.md'),
	inputSchema: {
		classNames: z.array(z.string()).describe('Case sensitive. Array of names of the Apex classes to get code coverage for. If you pass a single string, it will be treated as an array with a single element.')
	},
	annotations: {
		readOnlyHint: true,
		idempotentHint: true,
		openWorldHint: true,
		title: 'Get Apex Classes Code Coverage'
	}
};

export async function getApexClassCodeCoverageToolHandler({classNames}) {
	const logger = createModuleLogger(import.meta.url);
	try {
		if (!classNames?.length) {
			throw new Error('classNames is required and must be a non-empty array of Apex class names');
		}

		const coverage = await getApexClassCodeCoverage(classNames);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(coverage, null, 2)
				}
			],
			structuredContent: coverage
		};
	} catch (error) {
		logger.error(error, `Error getting code coverage for classes ${Array.isArray(classNames) ? classNames.join(', ') : classNames}`);
		const errorResult = {error: true, message: error.message};
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
