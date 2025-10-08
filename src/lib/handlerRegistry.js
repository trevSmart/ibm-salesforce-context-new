/**
 * Handler registration system for IBM Salesforce Context MCP Server
 *
 * This module separates the concern of registering MCP handlers (tools, prompts, resources)
 * from the server initialization logic.
 */

import {ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ReadResourceRequestSchema, RootsListChangedNotificationSchema, SetLevelRequestSchema} from '@modelcontextprotocol/sdk/types.js';

import config from '../config.js';
import {createModuleLogger} from './logger.js';

// Import prompt definitions and handlers
import {apexRunScriptPrompt, apexRunScriptPromptDefinition} from '../prompts/apex-run-script.js';
import {toolsBasicRunPromptDefinition, toolsBasicRunPromptHandler} from '../prompts/call-all-tools.js';
import {orgOnboardingPromptDefinition, orgOnboardingPromptHandler} from '../prompts/orgOnboarding.js';

// Import tool definitions
import {apexDebugLogsToolDefinition} from '../tools/apexDebugLogs.js';
import {chatWithAgentforceToolDefinition} from '../tools/chatWithAgentforce.js';
import {createMetadataToolDefinition} from '../tools/createMetadata.js';
import {deployMetadataToolDefinition, deployMetadataToolHandler} from '../tools/deployMetadata.js';
import {describeObjectToolDefinition, describeObjectToolHandler} from '../tools/describeObject.js';
import {dmlOperationToolDefinition} from '../tools/dmlOperation.js';
import {executeAnonymousApexToolDefinition, executeAnonymousApexToolHandler} from '../tools/executeAnonymousApex.js';
import {executeSoqlQueryToolDefinition, executeSoqlQueryToolHandler} from '../tools/executeSoqlQuery.js';
import {getApexClassCodeCoverageToolDefinition} from '../tools/getApexClassCodeCoverage.js';
import {getRecentlyViewedRecordsToolDefinition} from '../tools/getRecentlyViewedRecords.js';
import {getRecordToolDefinition, getRecordToolHandler} from '../tools/getRecord.js';
import {getSetupAuditTrailToolDefinition} from '../tools/getSetupAuditTrail.js';
import {invokeApexRestResourceToolDefinition} from '../tools/invokeApexRestResource.js';
import {runApexTestToolDefinition} from '../tools/runApexTest.js';
import {salesforceContextUtilsToolDefinition, salesforceContextUtilsToolHandler} from '../tools/salesforceContextUtils.js';

const logger = createModuleLogger(import.meta.url);

/**
 * Registry for MCP server handlers
 */
export class HandlerRegistry {
	constructor(mcpServer, state, resources) {
		this.mcpServer = mcpServer;
		this.state = state;
		this.resources = resources;
		this.handlersRegistered = false;
	}

	/**
	 * Register all handlers - prevents double registration
	 */
	registerAll(rootsChangeHandler) {
		if (this.handlersRegistered) {
			logger.debug('Handlers already registered, skipping...');
			return;
		}

		this.registerNotificationHandlers(rootsChangeHandler);
		this.registerResourceHandlers();
		this.registerPromptHandlers();
		this.registerToolHandlers();
		this.registerRequestHandlers();

		this.handlersRegistered = true;
		logger.debug('All MCP handlers registered successfully');
	}

	/**
	 * Register notification handlers
	 */
	registerNotificationHandlers(rootsChangeHandler) {
		this.mcpServer.server.setNotificationHandler(RootsListChangedNotificationSchema, rootsChangeHandler);
	}

	/**
	 * Register resource-related handlers
	 */
	registerResourceHandlers() {
		this.mcpServer.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
			resources: Object.values(this.resources)
		}));

		this.mcpServer.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
			resourceTemplates: []
		}));

		this.mcpServer.server.setRequestHandler(ReadResourceRequestSchema, async ({params: {uri}}) => ({
			contents: [{uri, ...this.resources[uri]}]
		}));
	}

	/**
	 * Register prompt handlers
	 */
	registerPromptHandlers() {
		this.mcpServer.registerPrompt('apex-run-script', apexRunScriptPromptDefinition, apexRunScriptPrompt);
		this.mcpServer.registerPrompt('tools-basic-run', toolsBasicRunPromptDefinition, toolsBasicRunPromptHandler);
		this.mcpServer.registerPrompt('orgOnboarding', orgOnboardingPromptDefinition, orgOnboardingPromptHandler);
	}

	/**
	 * Register tool handlers
	 */
	registerToolHandlers() {
		// Static tool handlers for performance
		const staticToolHandlers = {
			salesforceContextUtils: salesforceContextUtilsToolHandler,
			executeSoqlQuery: executeSoqlQueryToolHandler,
			describeObject: describeObjectToolHandler,
			getRecord: getRecordToolHandler,
			executeAnonymousApex: executeAnonymousApexToolHandler,
			deployMetadata: deployMetadataToolHandler
		};

		// Tool definitions to register
		const toolDefinitions = [
			{name: 'salesforceContextUtils', definition: salesforceContextUtilsToolDefinition},
			{name: 'chatWithAgentforce', definition: chatWithAgentforceToolDefinition},
			{name: 'dmlOperation', definition: dmlOperationToolDefinition},
			{name: 'deployMetadata', definition: deployMetadataToolDefinition},
			{name: 'describeObject', definition: describeObjectToolDefinition},
			{name: 'executeAnonymousApex', definition: executeAnonymousApexToolDefinition},
			{name: 'getRecentlyViewedRecords', definition: getRecentlyViewedRecordsToolDefinition},
			{name: 'getRecord', definition: getRecordToolDefinition},
			{name: 'getSetupAuditTrail', definition: getSetupAuditTrailToolDefinition},
			{name: 'executeSoqlQuery', definition: executeSoqlQueryToolDefinition},
			{name: 'runApexTest', definition: runApexTestToolDefinition},
			{name: 'apexDebugLogs', definition: apexDebugLogsToolDefinition},
			{name: 'getApexClassCodeCoverage', definition: getApexClassCodeCoverageToolDefinition},
			{name: 'createMetadata', definition: createMetadataToolDefinition},
			{name: 'invokeApexRestResource', definition: invokeApexRestResourceToolDefinition}
		];

		// Register each tool with the secure call handler
		for (const {name, definition} of toolDefinitions) {
			this.mcpServer.registerTool(name, definition, this.createSecureToolHandler(name, staticToolHandlers));
		}
	}

	/**
	 * Create a secure tool handler with validation
	 */
	createSecureToolHandler(toolName, staticToolHandlers) {
		return async (params, args) => {
			try {
				// Security validation (except for utility tool and chatWithAgentforce)
				if (toolName !== 'salesforceContextUtils' && toolName !== 'chatWithAgentforce') {
					if (!(config.bypassUserPermissionsValidation || this.state.userPermissionsValidated)) {
						throw new Error(`🚫 Request blocked due to unsuccessful user validation for "${this.state.org.username}".`);
					}
					if (!this.state.org.user.id) {
						throw new Error('❌ Org and user details not available. The server may still be initializing.');
					}
				}

				// Get tool handler
				let toolHandler = staticToolHandlers[toolName];
				if (!toolHandler) {
					// Validate tool name to prevent path traversal attacks
					if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(toolName)) {
						throw new Error(`Invalid tool name format: "${toolName}". Tool names must be alphanumeric with underscores.`);
					}

					try {
						const toolModule = await import(`../tools/${toolName}.js`);
						toolHandler = toolModule?.[`${toolName}ToolHandler`];
					} catch (importError) {
						throw new Error(`Failed to import tool module for "${toolName}": ${importError.message}`);
					}
				}

				if (!toolHandler) {
					throw new Error(`Tool "${toolName}" module does not export a handler function named "${toolName}ToolHandler".`);
				}

				return await toolHandler(params, args);
			} catch (error) {
				logger.error(error.message, `Error calling tool ${toolName}, stack: ${error.stack}`);
				return {
					isError: true,
					content: [{type: 'text', text: error.message}]
				};
			}
		};
	}

	/**
	 * Register other request handlers
	 */
	registerRequestHandlers() {
		this.mcpServer.server.setRequestHandler(SetLevelRequestSchema, async ({params}) => {
			this.state.currentLogLevel = params.level;
			logger.debug(`Setting log level to ${params.level}`);
			return {};
		});
	}
}
