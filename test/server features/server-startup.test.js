import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('Server Startup', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance once for all tests
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('should start the MCP server successfully', async () => {
		// Verify the client is defined
		expect(client).toBeTruthy()

		// Test that we can call a simple tool to verify server is working
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getState',
		})

		validateMcpToolResponse(result, 'server startup test')

		// Simple logging for server test - just show what we verified
		logTestResult('server-startup.test.js', 'Start MCP server', {
			description: 'Tests that MCP server starts successfully and tools are accessible'
		}, 'ok')

		expect(result).toBeTruthy()
		expect(result.structuredContent).toBeTruthy()
	})
})

