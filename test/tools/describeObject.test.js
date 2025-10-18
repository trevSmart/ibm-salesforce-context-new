import { createMcpClient, disconnectMcpClient, validateMcpToolResponse } from '../testMcpClient.js'

describe('describeObject', () => {
	let client

	beforeAll(async () => {
		try {
			// Create and connect to the MCP server
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

	describe('reads', () => {
		test('with non-existent object', async () => {
			const result = await client.callTool('describeObject', {
				sObjectName: 'NonExistentObject__c',
			})
			expect(result.isError).toBeTruthy()
			expect(Array.isArray(result?.content)).toBe(true)
			expect(result?.content?.length).toBeGreaterThan(0)
			expect(result?.content?.[0]?.type).toBe('text')
			expect(result?.content?.[0]?.text.toLowerCase()).toContain('error')
		})
	})

	test('Account', async () => {
		const result = await client.callTool('describeObject', {
			sObjectName: 'Account',
		})
		console.log('Result:', JSON.stringify(result, null, 2))

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'describeObject Account')

		// Validate specific content
		expect(result.structuredContent.name).toBe('Account')
		expect(Array.isArray(result.structuredContent.fields)).toBe(true)
		expect(result.structuredContent.fields.length).toBeGreaterThan(0)
	})

	test('with includeFields false', async () => {
		const result = await client.callTool('describeObject', {
			sObjectName: 'Account',
			includeFields: false,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'describeObject with includeFields false')

		// Validate specific content
		expect(result?.structuredContent?.wasCached).toBeTruthy()
	})

	test('withtoolingApi object', async () => {
		const result = await client.callTool('describeObject', {
			sObjectName: 'ApexLog',
			useToolingApi: true,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'describeObject with Tooling API')

		// Validate specific content
		expect(Array.isArray(result?.structuredContent?.fields)).toBe(true)
		expect(result?.structuredContent?.fields.length).toBeGreaterThan(0)
	})
})
