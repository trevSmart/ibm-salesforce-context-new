/**
 * Global state object for the MCP server.
 *
 * This module exists as a separate file to break the circular dependency that existed
 * between mcp-server.js and lib/logger.js:
 * - mcp-server.js imports createModuleLogger from lib/logger.js
 * - lib/logger.js needs access to the state object (specifically state.currentLogLevel)
 *
 * By moving state to its own module:
 * - Both mcp-server.js and logger.js can import state without creating a cycle
 * - JavaScript obfuscation tools can properly handle the dependency graph
 * - The code remains modular and maintainable
 *
 * Note: mcp-server.js re-exports state for backward compatibility with existing code.
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
