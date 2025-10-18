import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('deployMetadata', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance
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

		validateMcpToolResponse(result, 'deployMetadata validation only')
		logTestResult('deployMetadata.test.js', 'Validation only', {
			sourceDir: 'force-app/main/default/classes/TestClass.cls',
			validationOnly: true
		}, 'ok', result)

		expect(result).toBeTruthy()
	})
})
