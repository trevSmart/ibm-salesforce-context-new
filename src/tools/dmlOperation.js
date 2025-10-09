import {z} from 'zod';
import client from '../client.js';
import {createModuleLogger} from '../lib/logger.js';
import {dmlOperation} from '../lib/salesforceServices.js';
import {mcpServer, state} from '../mcp-server.js';
import {textFileContent} from '../utils.js';

export const dmlOperationToolDefinition = {
	name: 'dmlOperation',
	title: 'DML Operations (Create, Update or Delete)',
	description: await textFileContent('tools/dmlOperation.md'),
	inputSchema: {
		operations: z
			.object({
				create: z
					.array(
						z.object({
							sObjectName: z.string().describe('The SObject type for the record to create'),
							fields: z.record(z.any()).describe('Field values for the record to create')
						})
					)
					.optional()
					.describe('Array of records to create'),
				update: z
					.array(
						z.object({
							sObjectName: z.string().describe('The SObject type for the record to update'),
							recordId: z.string().describe('The ID of the record to update'),
							fields: z.record(z.any()).describe('Field values to update')
						})
					)
					.optional()
					.describe('Array of records to update'),
				delete: z
					.array(
						z.object({
							sObjectName: z.string().describe('The SObject type for the record to delete'),
							recordId: z.string().describe('The ID of the record to delete')
						})
					)
					.optional()
					.describe('Array of records to delete')
			})
			.describe('DML operations to perform'),
		options: z
			.object({
				allOrNone: z.boolean().default(false).describe('If true, all operations must succeed or none will be committed'),
				bypassUserConfirmation: z.boolean().default(false).describe('Whether to bypass user confirmation for destructive operations')
			})
			.optional()
			.describe('Additional options for the request')
	},
	annotations: {
		destructiveHint: true,
		idempotentHint: false,
		openWorldHint: true,
		title: 'DML Operations (Create, Update or Delete)'
	}
};

export async function dmlOperationToolHandler({operations, options = {}}) {
	const logger = createModuleLogger(import.meta.url);
	try {
		// Check for destructive operations and require confirmation if needed
		if (options.bypassUserConfirmation !== true && (operations.delete?.length || operations.update?.length) && client.supportsCapability('elicitInput')) {
			const deleteCount = operations.delete?.length || 0;
			const updateCount = operations.update?.length || 0;

			const elicitResult = await mcpServer.server.elicitInput({
				message: `Please confirm the operation in ${state.org.alias}. The request includes ${deleteCount} delete(s) and ${updateCount} update(s).`,
				requestedSchema: {
					type: 'object',
					title: `Confirm DML operations in ${state.org.alias}?`,
					properties: {
						confirm: {
							type: 'string',
							enum: ['Yes', 'No'],
							enumNames: ['✅ Execute DML operations now', '❌ Cancel DML operations'],
							description: `Execute DML operations in ${state.org.alias}?`,
							default: 'Yes'
						}
					},
					required: ['confirm']
				}
			});

			if (elicitResult.action !== 'accept' || elicitResult.content?.confirm !== 'Yes') {
				return {
					content: [
						{
							type: 'text',
							text: 'User has cancelled the operations'
						}
					],
					structuredContent: {
						outcome: 'cancelled',
						statistics: {total: 0, succeeded: 0, failed: 0},
						cancellationReason: 'user_cancelled'
					}
				};
			}
		}

		const response = await dmlOperation(operations, options);
		const stats = response.statistics;

		const errorSummaryText = `DML request completed with ${stats.failed} error(s). ${stats.succeeded} operation(s) succeeded, ${stats.failed} failed.`;
		const successSummaryText = `DML request completed successfully. All ${stats.succeeded} operation(s) succeeded.`;

		if (response.outcome !== 'success') {
			return {
				isError: true,
				content: [
					{
						type: 'text',
						text: `❌ ${errorSummaryText}`
					}
				],
				structuredContent: response
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: successSummaryText
				}
			],
			structuredContent: response
		};
	} catch (error) {
		logger.error(`Error in dmlOperationTool: ${error.message}`);

		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: `❌ Error in DML operation request: ${error.message}`
				}
			],
			structuredContent: {
				outcome: 'error',
				statistics: {total: 0, succeeded: 0, failed: 0},
				errors: [{index: -1, message: error.message}]
			}
		};
	}
}
