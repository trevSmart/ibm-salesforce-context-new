import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

describe('apexDebugLogs', () => {
	let client
	let logsList // Shared variable for test dependencies

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

	// status doesn't depend on anything → can run in parallel
	describe.concurrent('read-only', () => {
		test('status', async () => {
			const result = await client.callTool('apexDebugLogs', { action: 'status' })
			expect(result).toBeTruthy()
		})
	})

	test('on', async () => {
		const result = await client.callTool('apexDebugLogs', { action: 'on' })
		expect(result).toBeTruthy()
	})

	test('list', async () => {
		const result = await client.callTool('apexDebugLogs', { action: 'list' })
		expect(result).toBeTruthy()
		expect(result.structuredContent).toBeTruthy()
		expect(Array.isArray(result.structuredContent.logs)).toBe(true)

		// Save the result for other tests
		logsList = result.structuredContent.logs
	})

	test('get', async () => {
		// If logsList is not defined or empty, fail the test
		if (!(logsList && Array.isArray(logsList)) || logsList.length === 0) {
			throw new Error('No logs available for apexDebugLogs get test - this indicates a problem with the test setup or Salesforce org configuration')
		}

		// Use the first available log
		const firstLog = logsList[0]
		expect(firstLog).toBeTruthy()
		expect(firstLog.Id).toBeTruthy()
		const logId = firstLog.Id

		// Now get the specific log content
		const result = await client.callTool('apexDebugLogs', { action: 'get', logId: logId })

		// Check if result is defined and has the expected structure
		expect(result).toBeTruthy()
		expect(result.structuredContent).toBeTruthy()

		// Log content might be undefined if the log is empty or not available yet
		if (result.structuredContent.logContent !== undefined) {
			expect(result.structuredContent.logContent).toBeTruthy()
		} else {
			console.log('Log content is not available yet (log might be empty or still processing)')
		}
	})

	test('off', async () => {
		const result = await client.callTool('apexDebugLogs', { action: 'off' })
		expect(result).toBeTruthy()
	})
})
