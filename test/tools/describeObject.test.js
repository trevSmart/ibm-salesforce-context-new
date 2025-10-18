import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

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

			validateMcpToolResponse(result, 'describeObject with non-existent object')
			logTestResult('describeObject.test.js', 'Non-existent object', { sObjectName: 'NonExistentObject__c' }, 'ok', result)

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

		validateMcpToolResponse(result, 'describeObject Account')
		logTestResult('describeObject.test.js', 'Account', { sObjectName: 'Account' }, 'ok', result)

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

		validateMcpToolResponse(result, 'describeObject with includeFields false')
		logTestResult('describeObject.test.js', 'IncludeFields false', { sObjectName: 'Account', includeFields: false }, 'ok', result)

		// Validate specific content
		expect(result?.structuredContent?.wasCached).toBeTruthy()
	})

	test('withtoolingApi object', async () => {
		const result = await client.callTool('describeObject', {
			sObjectName: 'ApexLog',
			useToolingApi: true,
		})

		validateMcpToolResponse(result, 'describeObject with Tooling API')
		logTestResult('describeObject.test.js', 'Tooling API', { sObjectName: 'ApexLog', useToolingApi: true }, 'ok', result)

		// Validate specific content
		expect(Array.isArray(result?.structuredContent?.fields)).toBe(true)
		expect(result?.structuredContent?.fields.length).toBeGreaterThan(0)
	})
})
