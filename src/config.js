import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/**
 * Configuration object for the MCP server
 * @module config
 */
export default {
	logPrefix: '👁🐝Ⓜ️',
	defaultLogLevel: 'debug',
	bypassHandshakeValidation: true,
	bypassUserPermissionsValidation: false,
	tempDir: {
		// Subfolder under workspace to store temp artifacts
		baseSubdir: 'tmp',
		// Remove temp files older than N days
		retentionDays: 7
	},
	apiCache: {
		// Enable/disable in-memory API response cache globally
		enabled: true,
		// Only cache idempotent reads
		cacheGet: true,
		// Default TTL for cached entries (ms)
		defaultTtlMs: 10_000,
		// Max entries before pruning oldest
		maxEntries: 200,
		// Clear cache after successful non-GET requests
		invalidateOnWrite: true
	},
	resources: {
		// Maximum number of MCP resources to keep in memory
		maxResources: 30
	},
	// Bypass user permission set validation for tools

	serverConstants: {
		protocolVersion: '2025-06-18',
		serverInfo: {
			name: 'IBM Salesforce Context',
			alias: 'ibm-sf-context',
			version: pkg.version
		},
		capabilities: {
			logging: {},
			resources: {listChanged: true},
			tools: {},
			prompts: {},
			completions: {}
		}
		// instructions are retrieved in mcp-server.js
	},
	loginUrl: 'https://ibm-salesforce-context.netlify.app/.netlify/functions/handshake',
	issueReporting: {
		webhookUrl: 'https://ibm-salesforce-context.netlify.app/.netlify/functions/report-issue'
	},
	// SSL certificate validation for API calls
	strictSsl: true
};
