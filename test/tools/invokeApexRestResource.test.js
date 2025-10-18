import { TestData } from '../test-data.js'
import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('invokeApexRestResource', () => {
	let client

	beforeAll(async () => {
		try {
			client = await createMcpClient()
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			// Re-throw to ensure test fails rather than skips
			throw error
		}
	})

	afterAll(async () => await disconnectMcpClient(client))

	test('GET', async () => {
		const result = await client.callTool('invokeApexRestResource', {
			apexClassOrRestResourceName:
				TestData.salesforce.testApexRestResourceData.apexClassOrRestResourceName,
			operation: 'GET',
		})

		validateMcpToolResponse(result, 'invokeApexRestResource GET')
		logTestResult('invokeApexRestResource.test.js', 'GET', {
			apexClassOrRestResourceName: TestData.salesforce.testApexRestResourceData.apexClassOrRestResourceName,
			operation: 'GET',
		}, 'ok', result)

		// Validate specific content
		expect(result?.structuredContent?.endpoint).toBeTruthy()
		expect(result.structuredContent.request).toBeTruthy()
		expect(result.structuredContent.request.method).toBeTruthy()
		expect(result.structuredContent.responseBody).toBeTruthy()
		expect(result.structuredContent.request.method).toBe('GET')
		expect(typeof result.structuredContent.status).toBe('number')
	})

	test('POST', async () => {
		const result = await client.callTool('invokeApexRestResource', {
			apexClassOrRestResourceName:
				TestData.salesforce.testApexRestResourceData.apexClassOrRestResourceName,
			operation: 'POST',
			bodyObject: { test: 'data' },
		})

		validateMcpToolResponse(result, 'invokeApexRestResource POST')
		logTestResult('invokeApexRestResource.test.js', 'POST', {
			apexClassOrRestResourceName: TestData.salesforce.testApexRestResourceData.apexClassOrRestResourceName,
			operation: 'POST',
			bodyObject: { test: 'data' },
		}, 'ok', result)

		// Validate specific content
		expect(result?.structuredContent?.endpoint).toBeTruthy()
		expect(result.structuredContent.request).toBeTruthy()
		expect(result.structuredContent.request.method).toBeTruthy()
		expect(result.structuredContent.responseBody).toBeTruthy()
		expect(result.structuredContent.request.method).toBe('POST')
	})
})
