import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult } from '../testUtils.js'

describe('apex-run-script', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('prompt', async () => {
		const result = await client.getPrompt('apex-run-script', {
			currentBehavior: 'Current code does nothing',
			desiredBehavior: 'Code should return a greeting message',
			updateTests: 'Yes',
		})
		const hasMessages = result?.messages
		const isArray = Array.isArray(result?.messages)
		const isValidMessages = hasMessages && isArray

		logTestResult('apex-run-script.test.js', 'Prompt', {
			currentBehavior: 'Current code does nothing',
			desiredBehavior: 'Code should return a greeting message',
			updateTests: 'Yes'
		}, 'ok', {
			description: 'Tests that apex-run-script prompt returns valid messages structure'
		})

		expect(isValidMessages).toBe(true)
		expect(result.messages.length).toBeGreaterThan(0)
		expect(['assistant', 'user']).toContain(result.messages[0].role)
		expect(result.messages[0].content?.type).toBeTruthy()
		expect(result.messages[0].content?.text).toBeTruthy()
	})
})
