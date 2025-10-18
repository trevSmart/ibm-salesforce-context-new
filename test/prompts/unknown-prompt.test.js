import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

describe('unknown-prompt', () => {
	let client

	beforeAll(async () => {
		try {
			// Get shared MCP client instance
			client = await createMcpClient()
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			// Re-throw to ensure test fails rather than skips
			throw error
		}
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('prompt does not exist', async () => {
		await expect(
			client.getPrompt('non-existent-prompt', {
				argValue: 'argValue',
			}),
		).rejects.toThrow()
	})
})
