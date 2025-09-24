import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

describe('deployMetadata', () => {
	let client

	beforeAll(async () => {
		// Create and connect to the MCP server
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('validation only', async () => {
		// Verify that the client is defined
		expect(client).toBeTruthy()

		// This test only validates the tool exists and can be called
		// Actual deployment is not tested to avoid destructive operations
		const result = await client.callTool('deployMetadata', {
			sourceDir: 'force-app/main/default/classes/TestClass.cls',
			validationOnly: true
		})

		expect(result).toBeTruthy()
	})
})
