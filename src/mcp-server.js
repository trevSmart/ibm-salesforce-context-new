import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {InitializeRequestSchema} from '@modelcontextprotocol/sdk/types.js';

import client from './client.js';
import config from './config.js';
import {createModuleLogger} from './lib/logger.js';
import targetOrgWatcher from './lib/OrgWatcher.js';
import {executeSoqlQuery, getOrgAndUserDetails} from './lib/salesforceServices.js';
import {connectTransport} from './lib/transport.js';
import {applyFetchSslOptions} from './lib/networkUtils.js';
import {InitializationPhases} from './lib/initialization.js';
import {HandlerRegistry} from './lib/handlerRegistry.js';
import {textFileContent, verifyServerAccess} from './utils.js';

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

const logger = createModuleLogger(import.meta.url, 'app', state.currentLogLevel);

export let resources = {};

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
	icons: [{src: 'src/static/ibm-logo.png', mimeType: 'image/png', sizes: ['48x48']}],
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

// Initialize the new architecture components
const initPhases = new InitializationPhases(mcpServer, client, state);
const handlerRegistry = new HandlerRegistry(mcpServer, state, resources);

/**
 * Register all MCP handlers using the new handler registry
 */
function registerHandlers() {
	const rootsChangeHandler = initPhases.setupRootsChangeHandler();
	handlerRegistry.registerAll(rootsChangeHandler);

	// Register the initialization handler separately for clarity
	mcpServer.server.setRequestHandler(InitializeRequestSchema, async ({params}) => {
		try {
			logger.info(`IBM Salesforce Context (v${config.serverConstants.serverInfo.version})`);

			// Phase 1: Client connection and capability setup
			const _connectionInfo = await initPhases.handleClientConnection(params);

			// Phase 2: Workspace path resolution
			await initPhases.handleWorkspaceSetup();

			// Phase 3: Core server initialization (Salesforce details)
			await initPhases.handleCoreInitialization(updateOrgAndUserDetails);

			// Phase 4: Background post-initialization tasks
			initPhases.handlePostInitialization(targetOrgWatcher, updateOrgAndUserDetails, applyFetchSslOptions);

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
	if (!progressToken) {
		return;
	}

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
