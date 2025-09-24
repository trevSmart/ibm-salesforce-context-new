import {fileURLToPath} from 'node:url';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {InitializeRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ReadResourceRequestSchema, RootsListChangedNotificationSchema, SetLevelRequestSchema} from '@modelcontextprotocol/sdk/types.js';

import client from './client.js';
import config from './config.js';
import {createModuleLogger} from './lib/logger.js';
import targetOrgWatcher from './lib/OrgWatcher.js';
import {executeSoqlQuery, getOrgAndUserDetails} from './lib/salesforceServices.js';
import {connectTransport} from './lib/transport.js';
import {applyFetchSslOptions} from './lib/networkUtils.js';
//Prompts
//import { codeModificationPromptDefinition, codeModificationPrompt } from './prompts/codeModificationPrompt.js';
import {apexRunScriptPrompt, apexRunScriptPromptDefinition} from './prompts/apex-run-script.js';
import {toolsBasicRunPromptDefinition, toolsBasicRunPromptHandler} from './prompts/call-all-tools.js';
import {orgOnboardingPromptDefinition, orgOnboardingPromptHandler} from './prompts/orgOnboarding.js';
//Tools
import {apexDebugLogsToolDefinition} from './tools/apexDebugLogs.js';
import {createMetadataToolDefinition} from './tools/createMetadata.js';
import {deployMetadataToolDefinition, deployMetadataToolHandler} from './tools/deployMetadata.js';
import {describeObjectToolDefinition, describeObjectToolHandler} from './tools/describeObject.js';
import {dmlOperationToolDefinition} from './tools/dmlOperation.js';
import {executeAnonymousApexToolDefinition, executeAnonymousApexToolHandler} from './tools/executeAnonymousApex.js';
import {executeSoqlQueryToolDefinition, executeSoqlQueryToolHandler} from './tools/executeSoqlQuery.js';
import {getApexClassCodeCoverageToolDefinition} from './tools/getApexClassCodeCoverage.js';
import {getRecentlyViewedRecordsToolDefinition} from './tools/getRecentlyViewedRecords.js';
import {getRecordToolDefinition, getRecordToolHandler} from './tools/getRecord.js';
import {getSetupAuditTrailToolDefinition} from './tools/getSetupAuditTrail.js';
import {invokeApexRestResourceToolDefinition} from './tools/invokeApexRestResource.js';
import {runApexTestToolDefinition} from './tools/runApexTest.js';
import {salesforceContextUtilsToolDefinition, salesforceContextUtilsToolHandler} from './tools/salesforceContextUtils.js';
import {textFileContent, verifyServerAccess, withTimeout} from './utils.js';

// Define state object here instead of importing it
export const state = {
	org: {},
	releaseName: null,
	startedDate: new Date(),
	userPermissionsValidated: false,
	handshakeValidated: false,
	currentLogLevel: process.env.LOG_LEVEL || 'info',
	workspacePath: process.cwd()
};

const ORG_COMPANY_DETAILS_QUERY = 'SELECT Name, OrganizationType, PrimaryContact, Phone, Street, City, PostalCode, Country, Division, InstanceName, IsSandbox, CreatedDate FROM Organization LIMIT 1';

const ROOTS_LIST_TIMEOUT_MS = 4000;
const WORKSPACE_PATH_WAIT_TIMEOUT_MS = 5000;

let companyDetailsFetchPromise = null;

async function refreshOrgCompanyDetails() {
	if (companyDetailsFetchPromise) {
		return companyDetailsFetchPromise;
	}

	companyDetailsFetchPromise = (async () => {
		try {
			if (!state.org?.username) {
				return;
			}

			const result = await executeSoqlQuery(ORG_COMPANY_DETAILS_QUERY);
			const organizationRecord = result?.records?.[0];

			if (!organizationRecord) {
				logger.warn('Organization details query returned no records');
				return;
			}

			const companyDetails = {...organizationRecord};
			delete companyDetails.attributes;

			state.org = {
				...state.org,
				companyDetails
			};
			logger.debug('Organization company details refreshed');

			if (state.userPermissionsValidated) {
				newResource('mcp://org/orgAndUserDetail.json', 'Org and user details', 'Org and user details', 'application/json', JSON.stringify(state.org, null, 3));
			}
		} catch (error) {
			logger.warn(error, 'Failed to refresh organization company details');
		} finally {
			companyDetailsFetchPromise = null;
		}
	})();

	return companyDetailsFetchPromise;
}

// import { chatWithAgentforceDefinition } from './tools/chatWithAgentforce.js';
// import { triggerExecutionOrderToolDefinition } from './tools/triggerExecutionOrder.js';
//import {generateSoqlQueryToolDefinition} from './tools/generateSoqlQuery.js';

const logger = createModuleLogger(import.meta.url, 'app', state.currentLogLevel);

export let resources = {};
// Flag to track if workspace path has been set
let workspacePathSet = false;
let workspacePathValue = null;
let resolveWorkspacePathReady;

const workspacePathReadyPromise = new Promise((resolve) => {
	resolveWorkspacePathReady = resolve;
});

async function setWorkspacePath(workspacePath) {
	// If workspace path is already set by env var, don't override it
	if (workspacePathSet) {
		logger.debug('Workspace path already set, ignoring new path');
		return workspacePathValue;
	}

	// Handle multiple workspace paths separated by commas
	let targetPath = workspacePath;
	if (typeof workspacePath === 'string' && workspacePath.includes(',')) {
		// Take the first path if multiple paths are provided
		targetPath = workspacePath.split(',')[0].trim();
	}

	// Normalize file:// URIs to local filesystem paths
	if (typeof targetPath === 'string' && targetPath.startsWith('file://')) {
		try {
			// Robust conversion for any platform
			targetPath = fileURLToPath(targetPath);
		} catch {
			//Fallback: manual URI conversion
			targetPath = decodeURIComponent(targetPath.replace(/^file:\/\//, ''));
			process.platform === 'win32' && (targetPath = targetPath.replace(/^\/([a-zA-Z]):/, '$1:'));
		}
	}
	if (typeof targetPath === 'string') {
		targetPath = targetPath.trim();
	}

	if (targetPath) {
		logger.info(`Workspace path set to: "${targetPath}"`);
		if (targetPath !== process.cwd()) {
			try {
				process.chdir(targetPath);
			} catch (error) {
				logger.error(error, 'Failed to change working directory');
			}
		}
		workspacePathSet = true;
		workspacePathValue = targetPath;
		state.workspacePath = targetPath;
		if (typeof resolveWorkspacePathReady === 'function') {
			resolveWorkspacePathReady(targetPath);
			resolveWorkspacePathReady = null;
		}
	}

	return workspacePathValue;
}

async function waitForWorkspacePath(timeoutMs = WORKSPACE_PATH_WAIT_TIMEOUT_MS) {
	if (workspacePathSet) {
		return workspacePathValue;
	}

	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		return workspacePathReadyPromise;
	}

	try {
		return await withTimeout(workspacePathReadyPromise, timeoutMs, 'Workspace path wait timeout');
	} catch (error) {
		logger.warn(error, 'Workspace path not received before timeout; continuing with current working directory');
		return null;
	}
}

async function updateOrgAndUserDetails() {
	try {
		const currentUsername = state.org?.username;
		const previousCompanyDetails = state.org?.companyDetails;
		const org = await getOrgAndUserDetails(true);
		state.org = {
			...org,
			user: {
				id: null,
				username: org.username,
				profileName: null,
				name: null
			},
			companyDetails: previousCompanyDetails
		};
		const newUsername = (org?.username ?? '').trim();
		if (!newUsername) {
			throw new Error('Invalid username parameter');
		}
		if (currentUsername !== newUsername) {
			clearResources();
			try {
				const permissionSetFilter = config.bypassUserPermissionsValidation ? '' : " AND Id IN (SELECT AssigneeId FROM PermissionSetAssignment WHERE PermissionSet.Name = 'IBM_SalesforceContextUser')";
				const result = await executeSoqlQuery(`SELECT Id, Name, Profile.Name, UserRole.Name
                                        FROM User WHERE Username = '${state.org.username}'${permissionSetFilter}`);

				if (result?.records?.length) {
					const user = result.records[0];
					state.org.user = {
						id: user.Id,
						username: user.Username,
						name: user.Name,
						profileName: user.Profile.Name,
						userRoleName: user.UserRole.Name
					};
					state.userPermissionsValidated = true;

					newResource('mcp://org/orgAndUserDetail.json', 'Org and user details', 'Org and user details', 'application/json', JSON.stringify(state.org, null, 3));
				} else {
					state.userPermissionsValidated = false;
					const errorMessage = config.bypassUserPermissionsValidation ? `User "${newUsername}" not found in org "${state.org.alias}"` : `User "${newUsername}" not found or with insufficient permissions in org "${state.org.alias}"`;
					logger.error(errorMessage);
				}
			} catch (error) {
				state.userPermissionsValidated = false;
				logger.error(error, 'Error validating user permissions');
			}

			refreshOrgCompanyDetails();
		}
		// Update the watcher with the new org alias
		if (targetOrgWatcher && org?.alias) {
			targetOrgWatcher.currentOrgAlias = org.alias;
		}

		logger.info(`Server initialized and running. Target org: ${state.org.alias}`, 'init');
		if (typeof resolveOrgReady === 'function') {
			resolveOrgReady();
		}
	} catch (error) {
		logger.error(error, 'Error updating org and user details');
		// console.error(error);
		state.org = {};
		state.userPermissionsValidated = false;
	}
}

//Create the MCP server instance
const {protocolVersion, serverInfo, capabilities} = config.serverConstants;
const instructions = await textFileContent('static/agentInstructions.md');

const mcpServer = new McpServer(serverInfo, {
	capabilities,
	instructions,
	debouncedNotificationMethods: ['notifications/tools/list_changed', 'notifications/resources/list_changed', 'notifications/prompts/list_changed']
});

// Expose server instance to break import cycles in utility logging
// (utils reads via globalThis.__mcpServer instead of importing this module)
globalThis.__mcpServer = mcpServer;

export function newResource(uri, name, description, mimeType = 'text/plain', content, annotations = {}) {
	try {
		logger.debug(`MCP resource "${uri}" changed.`);
		annotations = {...annotations, lastModified: new Date().toISOString()};
		const resource = {
			uri,
			name,
			description,
			mimeType,
			text: content,
			annotations
		};

		if (Object.keys(resources).length >= config.resources.maxResources) {
			// Remove oldest resource (first key)
			const oldestResourceUri = Object.keys(resources)[0];
			delete resources[oldestResourceUri];
			logger.debug(`Removed oldest resource ${oldestResourceUri} to maintain limit of ${config.resources.maxResources} resources`);
		}

		resources[uri] = resource;
		mcpServer.server.sendResourceListChanged();
		return resource;
	} catch (error) {
		logger.error(error, `Error setting resource ${uri}, stack: ${error.stack}`);
	}
}

export function clearResources() {
	if (Object.keys(resources).length) {
		logger.debug('Clearing resources...');
		resources = {};
		mcpServer.server.sendResourceListChanged();
	}
}

// Register all MCP handlers before connecting to any transport
let handlersRegistered = false;

function registerHandlers() {
	if (handlersRegistered) {
		logger.debug('Handlers already registered, skipping...');
		return;
	}
	
	handlersRegistered = true;
	mcpServer.server.setNotificationHandler(RootsListChangedNotificationSchema, async (listRootsResult) => {
		try {
			try {
				listRootsResult = await withTimeout(mcpServer.server.listRoots(), ROOTS_LIST_TIMEOUT_MS, 'Roots list timeout');
			} catch (error) {
				logger.debug(`Requested roots list but client returned error: ${JSON.stringify(error, null, 3)}`);
			}
			if (!workspacePathSet && listRootsResult?.roots?.length) {
				const rootEntry = listRootsResult.roots.find((root) => typeof root?.uri === 'string' && root.uri.startsWith('file://'));
				if (rootEntry) {
					await setWorkspacePath(rootEntry.uri);
				}
			}
		} catch (error) {
			logger.error(error, 'Failed to request roots from client');
		}
	});

	mcpServer.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
		resources: Object.values(resources)
	}));
	mcpServer.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
		resourceTemplates: []
	}));
	mcpServer.server.setRequestHandler(ReadResourceRequestSchema, async ({params: {uri}}) => ({
		contents: [{uri, ...resources[uri]}]
	}));

	// mcpServer.registerPrompt('code-modification', codeModificationPromptDefinition, codeModificationPrompt);
	mcpServer.registerPrompt('apex-run-script', apexRunScriptPromptDefinition, apexRunScriptPrompt);
	mcpServer.registerPrompt('tools-basic-run', toolsBasicRunPromptDefinition, toolsBasicRunPromptHandler);
	mcpServer.registerPrompt('orgOnboarding', orgOnboardingPromptDefinition, orgOnboardingPromptHandler);

	const StaticToolHandlers = {
		salesforceContextUtils: salesforceContextUtilsToolHandler,
		executeSoqlQuery: executeSoqlQueryToolHandler,
		describeObject: describeObjectToolHandler,
		getRecord: getRecordToolHandler,
		executeAnonymousApex: executeAnonymousApexToolHandler,
		deployMetadata: deployMetadataToolHandler
	};

	const callToolHandler = (tool) => {
		return async (params, args) => {
			try {
				if (tool !== 'salesforceContextUtils') {
					if (!(config.bypassUserPermissionsValidation || state.userPermissionsValidated)) {
						throw new Error(`🚫 Request blocked due to unsuccessful user validation for "${state.org.username}".`);
					}
					if (!state.org.user.id) {
						throw new Error('❌ Org and user details not available. The server may still be initializing.');
					}
				}

				let toolHandler = StaticToolHandlers[tool];
				if (!toolHandler) {
					const toolModule = await import(`./tools/${tool}.js`);
					toolHandler = toolModule?.[`${tool}ToolHandler`];
				}
				if (!toolHandler) {
					throw new Error(`Tool ${tool} module does not export a tool handler.`);
				}
				return await toolHandler(params, args);
			} catch (error) {
				logger.error(error.message, `Error calling tool ${tool}, stack: ${error.stack}`);
				return {
					isError: true,
					content: [{type: 'text', text: error.message}]
				};
			}
		};
	};

	mcpServer.registerTool('salesforceContextUtils', salesforceContextUtilsToolDefinition, callToolHandler('salesforceContextUtils'));
	mcpServer.registerTool('dmlOperation', dmlOperationToolDefinition, callToolHandler('dmlOperation'));
	mcpServer.registerTool('deployMetadata', deployMetadataToolDefinition, callToolHandler('deployMetadata'));
	mcpServer.registerTool('describeObject', describeObjectToolDefinition, callToolHandler('describeObject'));
	mcpServer.registerTool('executeAnonymousApex', executeAnonymousApexToolDefinition, callToolHandler('executeAnonymousApex'));
	mcpServer.registerTool('getRecentlyViewedRecords', getRecentlyViewedRecordsToolDefinition, callToolHandler('getRecentlyViewedRecords'));
	mcpServer.registerTool('getRecord', getRecordToolDefinition, callToolHandler('getRecord'));
	mcpServer.registerTool('getSetupAuditTrail', getSetupAuditTrailToolDefinition, callToolHandler('getSetupAuditTrail'));
	mcpServer.registerTool('executeSoqlQuery', executeSoqlQueryToolDefinition, callToolHandler('executeSoqlQuery'));
	mcpServer.registerTool('runApexTest', runApexTestToolDefinition, callToolHandler('runApexTest'));
	mcpServer.registerTool('apexDebugLogs', apexDebugLogsToolDefinition, callToolHandler('apexDebugLogs'));
	mcpServer.registerTool('getApexClassCodeCoverage', getApexClassCodeCoverageToolDefinition, callToolHandler('getApexClassCodeCoverage'));
	mcpServer.registerTool('createMetadata', createMetadataToolDefinition, callToolHandler('createMetadata'));
	mcpServer.registerTool('invokeApexRestResource', invokeApexRestResourceToolDefinition, callToolHandler('invokeApexRestResource'));
	// mcpServer.registerTool('chatWithAgentforce', chatWithAgentforceDefinition, callToolHandler('chatWithAgentforce'));
	// mcpServer.registerTool('triggerExecutionOrder', triggerExecutionOrderDefinition, callToolHandler('triggerExecutionOrder'));
	// mcpServer.registerTool('generateSoqlQuery', generateSoqlQueryDefinition, callToolHandler('generateSoqlQuery'));

	mcpServer.server.setRequestHandler(SetLevelRequestSchema, async ({params}) => {
		state.currentLogLevel = params.level;
		logger.debug(`Setting log level to ${params.level}`);
		return {};
	});

	mcpServer.server.setRequestHandler(InitializeRequestSchema, async ({params}) => {
		try {
			const {clientInfo, capabilities: clientCapabilities, protocolVersion: clientProtocolVersion} = params;
			client.initialize({clientInfo, capabilities: clientCapabilities});

			logger.info(`IBM Salesforce Context (v${config.serverConstants.serverInfo.version})`);

			const logMsg = {
				name: client.clientInfo.name || 'unknown',
				version: client.clientInfo.version || 'unknown',
				protocolVersion: clientProtocolVersion || 'unknown',
				capabilities: JSON.stringify(client.capabilities, null, 3)
			};
			logger.info(`Connecting with client "${logMsg.name}" (v${logMsg.version}).\nProtocol version: ${logMsg.protocolVersion}\n${logMsg.capabilities}`);

			logger.info(`Current log level: ${state.currentLogLevel}`);

			if (process.env.WORKSPACE_FOLDER_PATHS) {
				await setWorkspacePath(process.env.WORKSPACE_FOLDER_PATHS);
			} else if (client.supportsCapability('roots')) {
				try {
					const listRootsResult = await withTimeout(mcpServer.server.listRoots(), ROOTS_LIST_TIMEOUT_MS, 'Roots list timeout');
					if (!workspacePathSet && listRootsResult?.roots?.length) {
						const rootEntry = listRootsResult.roots.find((root) => typeof root?.uri === 'string' && root.uri.startsWith('file://'));
						if (rootEntry) {
							await setWorkspacePath(rootEntry.uri);
						}
					}
				} catch (error) {
					logger.debug(error, 'Requested roots list during initialization but client returned error');
				}
			}

			await waitForWorkspacePath();

			await updateOrgAndUserDetails();

			// Post-initialization logic
			const postInitialization = async () => {
				try {
					if (!state.org.username) {
						logger.warn('Org details not available, skipping post-initialization logic');
						return;
					}

					// Iniciar el watcher
					try {
						targetOrgWatcher.start(updateOrgAndUserDetails, state.org?.alias);
						logger.debug('OrgWatcher started successfully');
					} catch (watcherError) {
						logger.warn(watcherError, 'Failed to start OrgWatcher, continuing without it');
					}

					// Recupear la release de la org
					try {
						const releasesEndpoint = `${state.org.instanceUrl}/services/data/`;
						const releasesFetchOptions = applyFetchSslOptions(releasesEndpoint, {});
						const releasesResult = await fetch(releasesEndpoint, releasesFetchOptions);
						if (releasesResult.ok) {
							const releases = await releasesResult.json();
							const releaseName = releases.find((r) => r.version === state.org.apiVersion)?.label ?? null;
							state.org = {...state.org, releaseName};
							logger.debug(`Org release name updated: ${releaseName}`);
						} else {
							logger.warn(`Failed to fetch org releases: ${releasesResult.status} ${releasesResult.statusText}`);
						}
					} catch (releaseError) {
						logger.warn(releaseError, 'Failed to retrieve org release information, continuing without it');
					}
				} catch (error) {
					logger.warn(error, 'Post-initialization logic failed, but server will continue running');
				}
			};

			// Execute post-initialization asynchronously without blocking initialization
			postInitialization().catch((error) => {
				logger.warn(error, 'Post-initialization failed completely, some features may be unavailable or may not work as expected');
			});

			if (typeof resolveOrgReady === 'function') {
				resolveOrgReady();
			}

			return {protocolVersion, serverInfo, capabilities};
		} catch (error) {
			logger.error(error, `Error initializing server, stack: ${error.stack}`);
			throw new Error(`Initialization failed: ${error.message}`);
		}
	});
}

// Ready promises for external waiting
let resolveServerReady;
const readyPromise = new Promise((resolve) => (resolveServerReady = resolve)); // transport connected
let resolveOrgReady;
const orgReadyPromise = new Promise((resolve) => (resolveOrgReady = resolve)); // org details loaded/attempted

//Server initialization function
export async function setupServer(transport) {
	await verifyServerAccess();

	registerHandlers();

	const transportInfo = await connectTransport(mcpServer, transport);

	if (typeof resolveServerReady === 'function') {
		resolveServerReady();
	}

	let connectedMessage;
	if (transportInfo.transportType === 'stdio') {
		connectedMessage = '✓ Server started with STDIO transport';
	} else {
		connectedMessage = `Starting server with HTTP transport on port ${transportInfo.port}`;
	}

	logger.info(connectedMessage);
	return {protocolVersion, serverInfo, capabilities};
}

export function sendProgressNotification(progressToken, progress, total, message) {
	mcpServer.server.notification({
		method: 'notifications/progress',
		params: {progressToken, progress, total, message}
	});
}

//Export the ready promise for external use
export {readyPromise};
export {orgReadyPromise};

// Initialize task scheduler
let _taskScheduler;
/*
try {
	taskScheduler = new TaskScheduler();
	logger.info('Task scheduler initialized successfully');
} catch (error) {
	logger.error('Failed to initialize task scheduler:', error);
}
*/

// Handle graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT, cleaning up...');
	await targetOrgWatcher.stop();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM, cleaning up...');
	await targetOrgWatcher.stop();
	process.exit(0);
});

export {mcpServer};
