/**
 * Initialization system for IBM Salesforce Context MCP Server
 *
 * This module provides a clean separation of initialization phases:
 * 1. Client connection and capability detection
 * 2. Workspace path resolution with client-specific strategies
 * 3. Core server setup (Salesforce org details, user validation)
 * 4. Background post-initialization tasks
 */

import {fileURLToPath} from 'node:url';
import {createModuleLogger} from './logger.js';
import {withTimeout} from '../utils.js';

const logger = createModuleLogger(import.meta.url);

// Configuration constants
const ROOTS_LIST_TIMEOUT_MS = 4000;
const WORKSPACE_PATH_WAIT_TIMEOUT_MS = 5000;

/**
 * Workspace path management with client-specific strategies
 */
export class WorkspacePathManager {
	constructor() {
		this.pathSet = false;
		this.pathValue = null;
		this.resolveReady = null;
		this.readyPromise = new Promise((resolve) => {
			this.resolveReady = resolve;
		});
	}

	/**
	 * Set workspace path from various sources
	 */
	async setPath(workspacePath) {
		if (this.pathSet) {
			logger.debug('Workspace path already set, ignoring new path');
			return this.pathValue;
		}

		const targetPath = this.normalizeWorkspacePath(workspacePath);

		if (targetPath) {
			logger.info(`Workspace path set to: "${targetPath}"`);
			await this.applyWorkspacePath(targetPath);
		}

		return this.pathValue;
	}

	/**
	 * Wait for workspace path to be set
	 */
	async waitForPath(timeoutMs = WORKSPACE_PATH_WAIT_TIMEOUT_MS) {
		if (this.pathSet) {
			return this.pathValue;
		}

		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
			return this.readyPromise;
		}

		try {
			return await withTimeout(this.readyPromise, timeoutMs, 'Workspace path wait timeout');
		} catch (error) {
			logger.warn(error, 'Workspace path not received before timeout; continuing with current working directory');
			return null;
		}
	}

	/**
	 * Normalize workspace path from different sources
	 */
	normalizeWorkspacePath(workspacePath) {
		let targetPath = workspacePath;

		// Handle multiple workspace paths separated by commas
		if (typeof workspacePath === 'string' && workspacePath.includes(',')) {
			targetPath = workspacePath.split(',')[0].trim();
		}

		// Normalize file:// URIs to local filesystem paths
		if (typeof targetPath === 'string' && targetPath.startsWith('file://')) {
			try {
				targetPath = fileURLToPath(targetPath);
			} catch {
				// Fallback: manual URI conversion
				targetPath = decodeURIComponent(targetPath.replace(/^file:\/\//, ''));
				if (process.platform === 'win32') {
					targetPath = targetPath.replace(/^\/([a-zA-Z]):/, '$1:');
				}
			}
		}

		return typeof targetPath === 'string' ? targetPath.trim() : null;
	}

	/**
	 * Apply the workspace path by changing directory and updating state
	 */
	async applyWorkspacePath(targetPath) {
		if (targetPath !== process.cwd()) {
			try {
				process.chdir(targetPath);
			} catch (error) {
				logger.error(error, 'Failed to change working directory');
			}
		}

		this.pathSet = true;
		this.pathValue = targetPath;

		if (typeof this.resolveReady === 'function') {
			this.resolveReady(targetPath);
			this.resolveReady = null;
		}
	}
}

/**
 * Client-specific workspace path strategies
 */
export class ClientWorkspaceStrategy {
	constructor(client, mcpServer, workspaceManager) {
		this.client = client;
		this.mcpServer = mcpServer;
		this.workspaceManager = workspaceManager;
	}

	/**
	 * Resolve workspace path based on client capabilities and environment
	 */
	async resolveWorkspacePath() {
		// Strategy 1: Environment variable (Cursor and similar clients)
		if (process.env.WORKSPACE_FOLDER_PATHS) {
			logger.debug('Using workspace path from environment variable');
			await this.workspaceManager.setPath(process.env.WORKSPACE_FOLDER_PATHS);
			return;
		}

		// Strategy 2: Roots API (VS Code and compatible clients)
		if (this.client.supportsCapability('roots')) {
			logger.debug('Attempting to get workspace path from client roots API');
			try {
				const listRootsResult = await withTimeout(this.mcpServer.server.listRoots(), ROOTS_LIST_TIMEOUT_MS, 'Roots list timeout');

				if (listRootsResult?.roots?.length) {
					const rootEntry = listRootsResult.roots.find((root) => typeof root?.uri === 'string' && root.uri.startsWith('file://'));

					if (rootEntry) {
						await this.workspaceManager.setPath(rootEntry.uri);
						return;
					}
				}
			} catch (error) {
				logger.debug(error, 'Failed to get workspace path from roots API');
			}
		}

		// Strategy 3: No specific workspace, use current directory
		logger.debug('No workspace path provided, using current working directory');
	}
}

/**
 * Initialization phases manager
 */
export class InitializationPhases {
	constructor(mcpServer, client, state) {
		this.mcpServer = mcpServer;
		this.client = client;
		this.state = state;
		this.workspaceManager = new WorkspacePathManager();
		this.workspaceStrategy = new ClientWorkspaceStrategy(client, mcpServer, this.workspaceManager);
	}

	/**
	 * Phase 1: Client connection and capability setup
	 */
	async handleClientConnection(params) {
		const {clientInfo, capabilities: clientCapabilities, protocolVersion: clientProtocolVersion} = params;

		// Initialize client with capabilities
		this.client.initialize({clientInfo, capabilities: clientCapabilities});

		// Log connection details
		const logMsg = {
			name: this.client.clientInfo.name || 'unknown',
			version: this.client.clientInfo.version || 'unknown',
			protocolVersion: clientProtocolVersion || 'unknown',
			capabilities: JSON.stringify(this.client.capabilities, null, 3)
		};

		logger.info(`Connecting with client "${logMsg.name}" (v${logMsg.version}).\nProtocol version: ${logMsg.protocolVersion}\n${logMsg.capabilities}`);
		logger.info(`Current log level: ${this.state.currentLogLevel}`);

		return {protocolVersion: clientProtocolVersion, clientInfo, capabilities: clientCapabilities};
	}

	/**
	 * Phase 2: Workspace path resolution
	 */
	async handleWorkspaceSetup() {
		await this.workspaceStrategy.resolveWorkspacePath();
		const workspacePath = await this.workspaceManager.waitForPath();

		if (workspacePath) {
			this.state.workspacePath = workspacePath;
		}

		return workspacePath;
	}

	/**
	 * Phase 3: Core server initialization (Salesforce details)
	 */
	async handleCoreInitialization(updateOrgAndUserDetails) {
		await updateOrgAndUserDetails();
	}

	/**
	 * Phase 4: Background post-initialization tasks
	 */
	handlePostInitialization(targetOrgWatcher, updateOrgAndUserDetails, applyFetchSslOptions) {
		// Run asynchronously to avoid blocking server startup
		setImmediate(async () => {
			try {
				if (!this.state.org.username) {
					logger.warn('Org details not available, skipping post-initialization logic');
					return;
				}

				// Start OrgWatcher
				this.startOrgWatcher(targetOrgWatcher, updateOrgAndUserDetails);

				// Fetch org release information
				await this.fetchOrgReleaseInfo(applyFetchSslOptions);

				// Refresh exposed MCP resource with latest org details (including release info)
				// Uses existing update function which sanitizes and republishes the resource
				await updateOrgAndUserDetails();
			} catch (error) {
				logger.warn(error, 'Post-initialization logic failed, but server will continue running');
			}
		});
	}

	/**
	 * Start organization watcher
	 */
	startOrgWatcher(targetOrgWatcher, updateOrgAndUserDetails) {
		try {
			targetOrgWatcher.start(updateOrgAndUserDetails, this.state.org?.alias);
			logger.debug('OrgWatcher started successfully');
		} catch (watcherError) {
			logger.warn(watcherError, 'Failed to start OrgWatcher, continuing without it');
		}
	}

	/**
	 * Fetch organization release information
	 */
	async fetchOrgReleaseInfo(applyFetchSslOptions) {
		try {
			const releasesEndpoint = `${this.state.org.instanceUrl}/services/data/`;
			const releasesFetchOptions = applyFetchSslOptions(releasesEndpoint, {});
			const releasesResult = await fetch(releasesEndpoint, releasesFetchOptions);

			if (releasesResult.ok) {
				const releases = await releasesResult.json();
				const releaseName = releases.find((r) => r.version === this.state.org.apiVersion)?.label ?? null;
				this.state.org = {...this.state.org, releaseName};
				logger.debug(`Org release name updated: ${releaseName}`);
			} else {
				logger.warn(`Failed to fetch org releases: ${releasesResult.status} ${releasesResult.statusText}`);
			}
		} catch (releaseError) {
			logger.warn(releaseError, 'Failed to retrieve org release information, continuing without it');
		}
	}

	/**
	 * Setup notification handler for dynamic roots changes
	 */
	setupRootsChangeHandler() {
		return async (listRootsResult) => {
			try {
				// Only handle if workspace path isn't already set
				if (this.workspaceManager.pathSet) {
					return;
				}

				try {
					listRootsResult = await withTimeout(this.mcpServer.server.listRoots(), ROOTS_LIST_TIMEOUT_MS, 'Roots list timeout');
				} catch (error) {
					logger.debug(`Requested roots list but client returned error: ${JSON.stringify(error, null, 3)}`);
				}

				if (listRootsResult?.roots?.length) {
					const rootEntry = listRootsResult.roots.find((root) => typeof root?.uri === 'string' && root.uri.startsWith('file://'));
					if (rootEntry) {
						await this.workspaceManager.setPath(rootEntry.uri);
						this.state.workspacePath = this.workspaceManager.pathValue;
					}
				}
			} catch (error) {
				logger.error(error, 'Failed to request roots from client');
			}
		};
	}
}
