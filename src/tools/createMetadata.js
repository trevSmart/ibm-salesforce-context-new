import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {generateMetadata} from '../lib/salesforceServices.js';
import {textFileContent} from '../utils.js';

export const createMetadataToolDefinition = {
	name: 'createMetadata',
	title: 'Create Metadata (Apex Class, Apex Test Class, Apex Trigger or LWC)',
	description: await textFileContent('tools/createMetadata.md'),
	inputSchema: {
		type: z.enum(['apexClass', 'apexTestClass', 'apexTrigger', 'lwc']).describe('The metadata type to generate: "apexClass", "apexTestClass", "apexTrigger" or "lwc".'),
		name: z.string().describe('Name of the metadata to generate. For LWC, this will be the component folder name.'),
		outputDir: z.string().optional().describe('Optional. Output directory relative to the workspace. Defaults depend on the type.'),
		triggerSObject: z.string().optional().describe('Required for apexTrigger. The sObject API name the trigger is defined on. For LWC, this will be the component folder name.'),
		triggerEvent: z
			.array(z.enum(['before insert', 'before update', 'before delete', 'after insert', 'after update', 'after delete', 'after undelete']))
			.optional()
			.describe('Required for apexTrigger. Trigger events. Example: ["before insert", "after update"].')
	},
	annotations: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: true,
		title: 'Create Metadata (Apex Class, Apex Test Class, Apex Trigger or LWC)'
	}
};

export async function createMetadataToolHandler({type, name, outputDir, triggerSObject, triggerEvent = []}) {
	const logger = createModuleLogger(import.meta.url);
	try {
		const result = await generateMetadata({type, name, outputDir, triggerSObject, triggerEvent});

		return {
			content: [
				{
					type: 'text',
					text: `Successfully created ${result.files.length} metadata files.`
				}
			],
			structuredContent: result
		};
	} catch (error) {
		logger.error(error, 'Error creating metadata');
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `❌ ${error.message}`
				}
			],
			structuredContent: {success: false, error: error.message}
		};
	}
}
