import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('getRecentlyViewedRecords', () => {
	let client

	beforeAll(async () => {
		// Create and connect to the MCP server
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('getRecentlyViewedRecords', async () => {
		const result = await client.callTool('getRecentlyViewedRecords', {})

		validateMcpToolResponse(result, 'getRecentlyViewedRecords')
		logTestResult('getRecentlyViewedRecords.test.js', 'Get Recently Viewed Records', {}, 'ok', result)

		const structuredContent = result?.structuredContent

		expect(structuredContent?.records).toBeTruthy(structuredContent)
		expect(Array.isArray(structuredContent.records)).toBe(true)
		expect(typeof structuredContent.totalSize).toBe('number')
		expect(structuredContent.totalSize).toBeGreaterThan(0)
	})
})
