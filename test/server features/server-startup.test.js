import { createMcpClient } from '../testMcpClient.js'

describe('Server Startup', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance once for all tests
		client = await createMcpClient()
	})

	test('should start the MCP server successfully', async () => {
		// Verify the client is defined
		expect(client).toBeTruthy()

		// Test that we can call a simple tool to verify server is working
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getState',
		})
		expect(result).toBeTruthy()
		expect(result.structuredContent).toBeTruthy()

		console.log('Server started successfully and tools are accessible')
	})
})
