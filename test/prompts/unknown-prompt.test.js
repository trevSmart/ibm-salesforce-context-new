import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult } from '../testUtils.js'

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
		logTestResult('unknown-prompt.test.js', 'Prompt does not exist', {
			promptName: 'non-existent-prompt',
			argValue: 'argValue'
		}, 'ok', {
			description: 'Tests that requesting a non-existent prompt throws an error as expected'
		})

		await expect(
			client.getPrompt('non-existent-prompt', {
				argValue: 'argValue',
			}),
		).rejects.toThrow()
	})
})
