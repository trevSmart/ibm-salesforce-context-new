import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterAll, beforeAll, expect } from 'vitest'
import { config } from 'dotenv'

// Load environment variables from .env file before running tests
config()

// Verify that PASSWORD environment variable is loaded
if (!process.env.PASSWORD) {
	console.warn('Warning: PASSWORD environment variable not found. Make sure .env file exists and contains PASSWORD=value')
}

// Determine which server to use based on current working directory and environment
const isRunningFromDist = process.cwd().endsWith('/dist') || process.cwd().endsWith('\\dist')
const serverPath = isRunningFromDist ? './src/mcp-server.js' : '../src/mcp-server.js'
const transportPath = isRunningFromDist ? './src/lib/transport.js' : '../src/lib/transport.js'

// Dynamic imports based on whether we're running from dist or src
const serverModule = await import(serverPath)
const transportModule = await import(transportPath)

const { setupServer, readyPromise, mcpServer } = serverModule
const { stopHttpServer } = transportModule

// Use a fixed port for all workers to share the same server instance
process.env.MCP_HTTP_PORT = '3002'

// Set workspace path to current project directory
process.env.WORKSPACE_FOLDER_PATHS = process.cwd()

// Enable dry-run mode for reportIssue to prevent creating real GitHub issues during tests
process.env.MCP_REPORT_ISSUE_DRY_RUN = 'true'

beforeAll(async () => {
	const artifactsDir = path.join(process.cwd(), '.test-artifacts')
	try {
		if (fs.existsSync(artifactsDir)) {
			fs.rmSync(artifactsDir, { recursive: true, force: true })
		}
	} catch (err) {
		console.error('Could not clean .test-artifacts:', err)
	}

	// Register signal handlers for test environment
	const { registerSignalHandlers } = await import(serverPath)
	registerSignalHandlers()

	const result = await setupServer('http')
	await readyPromise

	// Capture the ACTUAL port that the server is using
	if (result?.transportInfo?.port) {
		process.env.MCP_HTTP_PORT = String(result.transportInfo.port)
		console.log(`✓ Test server started on port ${result.transportInfo.port}`)
	}
})

// Global cleanup handler
const cleanupServer = async () => {
	try {
		const mcpServerModule = await import('../src/mcp-server.js')
		if (mcpServerModule.setServerShuttingDown) {
			mcpServerModule.setServerShuttingDown(true)
		}

		await stopHttpServer()
		await mcpServer.close()

		console.log('✓ Server cleanup completed')
	} catch (error) {
		console.error('Error during server cleanup:', error)
	}
}

afterAll(async () => {
	await cleanupServer()
})

// Note: Signal handlers (SIGINT, SIGTERM) are registered in mcp-server.js
// to prevent duplicate listener warnings. The server module handles cleanup.

// Helper for file names
function slug(s: string) {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
}

// Write artifact to file
function writeArtifact(testName: string, label: string, data: unknown) {
	const dir = path.join(process.cwd(), '.test-artifacts')
	fs.mkdirSync(dir, { recursive: true })
	const file = path.join(dir, `${Date.now()}_${slug(testName)}_${slug(label)}.json`)
	fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
	return file
}

// Custom matcher: if not true, dump `dump` to .test-artifacts
expect.extend({
	toBeTruthyAndDump(received: unknown, dump: unknown) {
		const pass = Boolean(received)
		if (pass) {
			return { pass: true, message: () => 'value was true' }
		}
		// biome-ignore lint/suspicious/noMisplacedAssertion: <it's an expect.extend>
		const testName = expect.getState().currentTestName ?? 'unknown-test'
		// Handle undefined dump gracefully
		const dumpData = dump !== undefined ? dump : { received, error: 'dump was undefined' }
		const file = writeArtifact(testName, 'structuredContent', dumpData)
		return {
			pass: false,
			message: () => `expected true, got ${String(received)}. Dump guardat a: ${file}`,
		}
	},
})

declare module 'vitest' {
	interface Assertion {
		toBeTruthyAndDump(dump: unknown): void
	}
}
