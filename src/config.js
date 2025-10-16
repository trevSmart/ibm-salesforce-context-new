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
	bypassUserPermissionsValidation: true,
	tempDir: {
		// Subfolder under workspace to store temp artifacts
		baseSubdir: 'tmp',
		// Remove temp files older than N days
		retentionDays: 7
	},
	apiCache: {
		enabled: true,
		cacheGet: true,
		defaultTtlMs: 10_000,
		maxEntries: 200,
		invalidateOnWrite: true
	},
	resources: {
		maxResources: 30
	},

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
