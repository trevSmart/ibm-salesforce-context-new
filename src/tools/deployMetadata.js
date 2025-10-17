import {z} from 'zod';
import client from '../client.js';
import {createModuleLogger} from '../lib/logger.js';
import {deployMetadata} from '../lib/salesforceServices.js';
import {mcpServer} from '../mcp-server.js';
import {state} from '../state.js';
import {getFileNameFromPath, textFileContent} from '../utils.js';

export const deployMetadataToolDefinition = {
	name: 'deployMetadata',
	title: 'Deploy Metadata',
	description: await textFileContent('tools/deployMetadata.md'),
	inputSchema: {
		sourceDir: z.string().describe('The path to the local metadata file to deploy.'),
		validationOnly: z.boolean().optional().describe('If true, only validates the metadata without deploying it to the org.')
	},
	annotations: {
		readOnlyHint: false,
		destructiveHint: true,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Deploy metadata to org'
	}
};

export async function deployMetadataToolHandler({sourceDir, validationOnly = false}) {
	const logger = createModuleLogger(import.meta.url);
	try {
		// Only show elicitation for actual deployments, not for validations
		if (client.supportsCapability('elicitation') && !validationOnly) {
			const metadataName = getFileNameFromPath(sourceDir);
			const elicitResult = await mcpServer.server.elicitInput({
				message: `Please confirm the deployment of ${metadataName} to the org ${state.org.alias}.`,
				requestedSchema: {
					type: 'object',
					title: `Deploy ${metadataName} to ${state.org.alias}?`,
					properties: {
						confirm: {
							type: 'string',
							enum: ['Yes', 'No'],
							enumNames: ['Deploy metadata now', 'Cancel metadata deployment'],
							description: `Deploy ${metadataName} to ${state.org.alias}?`,
							default: 'Yes'
						}
					},
					required: ['confirm']
				}
			});

			if (elicitResult.action !== 'accept' || elicitResult.content?.confirm !== 'Yes') {
				const cancelledResult = {
					success: false,
					cancelled: true,
					reason: 'user_cancelled'
				};
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(cancelledResult, null, 2)
						}
					],
					structuredContent: cancelledResult
				};
			}
		}

		const result = await deployMetadata(sourceDir, validationOnly);

		return {
			isError: !result.success,
			content: [
				{
					type: 'text',
					text: JSON.stringify(result, null, 2)
				}
			],
			structuredContent: result
		};
	} catch (error) {
		logger.error(error, 'Error deploying metadata');

		const errorResult = {
			success: false,
			error: true,
			message: error.message
		};

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
