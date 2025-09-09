import crypto from 'node:crypto';
import {z} from 'zod';
import {createModuleLogger} from '../lib/logger.js';
import {callSalesforceApi, getOrgAndUserDetails} from '../lib/salesforceServices.js';
import {state} from '../mcp-server.js';
import {textFileContent} from '../utils.js';

let currentSessionId = null;
const logger = createModuleLogger(import.meta.url);

export const chatWithAgentforceToolDefinition = {
	name: 'chatWithAgentforce',
	title: 'Chat with Agentforce',
	description: await textFileContent('tools/chatWithAgentforce.md'),
	inputSchema: {
		message: z.string().describe('The message to send to Agentforce.')
	},
	annotations: {
		readOnlyHint: false,
		idempotentHint: false,
		openWorldHint: true,
		title: 'Chat with Agentforce'
	}
};

async function startSession() {
	try {
		logger.info('Starting Agentforce session...');

		await getOrgAndUserDetails();

		const body = {
			externalSessionKey: crypto.randomUUID(),
			instanceConfig: {
				endpoint: state.org.instanceUrl
			},
			tz: 'America/Los_Angeles',
			variables: [
				{
					name: '$Context.EndUserLanguage',
					type: 'Text',
					value: 'en_US'
				}
			],
			featureSupport: 'Streaming',
			streamingCapabilities: {
				chunkTypes: ['Text']
			},
			bypassUser: true
		};

		const response = await callSalesforceApi('POST', 'REST', `/agents/${process.env.SF_MCP_AGENTFORCE_AGENT_ID}/sessions`, body, {baseUrl: 'https://api.salesforce.com/einstein/ai-agent/v1'});

		if (!response?.sessionId) {
			throw new Error('Invalid response from Agentforce API: missing sessionId');
		}

		currentSessionId = response.sessionId;
		logger.info(`Session started with id: ${currentSessionId}`);
		return response;
	} catch (error) {
		logger.error(error, 'Error starting session');
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

async function sendMessage(message) {
	if (!currentSessionId) {
		await startSession();
	}

	try {
		const response = await callSalesforceApi(
			'POST',
			'REST',
			`/sessions/${currentSessionId}/messages`,
			{
				message: {
					sequenceId: Date.now(),
					type: 'Text',
					text: message
				},
				variables: []
			},
			{baseUrl: 'https://api.salesforce.com/einstein/ai-agent/v1'}
		);

		if (!response) {
			throw new Error('Empty response from Agentforce API');
		}

		return response;
	} catch (error) {
		logger.error(error, 'Error sending message');
		logger.debug(JSON.stringify(error, null, 3), 'Error sending message');
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

export async function chatWithAgentforceToolHandler({message}) {
	if (!message) {
		return {
			isError: true,
			content: [
				{
					type: 'text',
					text: 'Validation error: the "message" field is required'
				}
			]
		};
	}

	if (!process.env.SF_MCP_AGENTFORCE_AGENT_ID) {
		throw new Error('Missing agentforceAgentId environment variable');
	}

	try {
		const response = await sendMessage(message);
		return {
			content: [
				{
					type: 'text',
					text: response.messages?.[0].message || 'No response received from Agentforce'
				}
			],
			data: response,
			structuredContent: response
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
