import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

describe('executeAnonymousApex', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('simple', async () => {
		// Verify that the client is defined
		expect(client).toBeTruthy()

		const result = await client.callTool('executeAnonymousApex', {
			apexCode:
				"System.debug('Hello from MCP tool test');\nSystem.debug('Current time: ' + Datetime.now());",
			mayModify: false,
		})
		expect(result).toBeTruthy()

		// Check that the result has the expected structure
		if (result?.structuredContent?.success !== undefined) {
			expect(result.structuredContent.success).toBe(true)
		}

		if (result?.structuredContent?.logs) {
			expect(result.structuredContent.logs).toContain('Hello from MCP tool test')
		}
	})

	test('with modification', async () => {
		const result = await client.callTool('executeAnonymousApex', {
			apexCode:
				"Account acc = new Account(Name='Test Account');\ninsert acc;\nSystem.debug('Created account: ' + acc.Id);",
			mayModify: true,
		})

		expect(result?.structuredContent?.success).toBeTruthy(result?.structuredContent)
	})
})
