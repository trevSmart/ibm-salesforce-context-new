import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('executeSoqlQuery', () => {
	let client

	beforeAll(async () => {
		try {
			client = await createMcpClient()
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			throw error
		}
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('basic query', async () => {
		const query = 'SELECT Id, Name FROM Account LIMIT 3'
		const result = await client.callTool('executeSoqlQuery', {
			query,
		});

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery basic query')

		// Validate specific content
		const sc = result.structuredContent;
		expect(Array.isArray(sc.records)).toBe(true)
		expect(sc.records.length).toBeGreaterThan(0)

		// Log evidence of what was retrieved
		logTestResult('executeSoqlQuery.test.js', 'Basic query', { query }, 'ok', result)

		const r = sc.records[0]
		expect(r.Id).toBeTruthy()
		expect(r.Name).toBeTruthy()
	})

	test('with no results', async () => {
		const query = "SELECT Id, Name FROM Account WHERE Name = 'NonExistentAccount12345' LIMIT 1"
		const result = await client.callTool('executeSoqlQuery', {
			query,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with no results')

		// Validate specific content
		const sc = result.structuredContent
		expect(Array.isArray(sc.records)).toBe(true)
		expect(sc.records.length).toBe(0)

		// Log evidence of no results
		logTestResult('executeSoqlQuery.test.js', 'No results', { query }, 'ok', result)
	})

	test('with Tooling API', async () => {
		const query = 'SELECT Id, Name FROM ApexClass LIMIT 3'
		const result = await client.callTool('executeSoqlQuery', {
			query,
			useToolingApi: true,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with Tooling API')

		// Validate specific content
		const sc = result.structuredContent
		expect(Array.isArray(sc.records)).toBe(true)

		// Log evidence of what was retrieved
		logTestResult('executeSoqlQuery.test.js', 'Tooling API', { query, useToolingApi: true }, 'ok', result)
	})

	test('with Tooling API and no results', async () => {
		const query = "SELECT Id, Name FROM ApexClass WHERE Name = 'NonExistentApexClass12345' LIMIT 1"
		const result = await client.callTool('executeSoqlQuery', {
			query,
			useToolingApi: true,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with Tooling API and no results')

		// Validate specific content
		const sc = result.structuredContent
		expect(Array.isArray(sc.records)).toBe(true)
		expect(sc.records.length).toBe(0)

		// Log evidence of no results
		logTestResult('executeSoqlQuery.test.js', 'Tooling API (no results)', { query, useToolingApi: true }, 'ok', result)
	})

	test('with invalid SOQL syntax', async () => {
		const query = 'INVALID SOQL SYNTAX'
		const result = await client.callTool('executeSoqlQuery', {
			query,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with invalid syntax')

		// Validate that the response contains an error
		expect(result.isError).toBe(true)
		const sc = result.structuredContent
		expect(sc.error).toBe(true)
		expect(sc.message).toContain('MALFORMED_QUERY')
		expect(sc.message).toContain("unexpected token: 'INVALID'")

		// Log evidence of the error response
		logTestResult('executeSoqlQuery.test.js', 'Invalid SOQL syntax', { query }, 'ok', result)
	})
})
