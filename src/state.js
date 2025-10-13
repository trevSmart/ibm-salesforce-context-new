/**
 * Global state object for the MCP server.
 * This module exists separately to avoid circular dependencies.
 */
export const state = {
	org: {},
	releaseName: null,
	startedDate: new Date(),
	userPermissionsValidated: false,
	handshakeValidated: false,
	currentLogLevel: process.env.LOG_LEVEL || 'info',
	workspacePath: process.cwd()
};
