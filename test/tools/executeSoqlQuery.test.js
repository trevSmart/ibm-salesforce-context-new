import { createMcpClient, disconnectMcpClient, validateMcpToolResponse } from '../testMcpClient.js'

describe('executeSoqlQuery', () => {
	let client

	beforeAll(async () => {
		try {
			// Get shared MCP client instance
			client = await createMcpClient();
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			// Re-throw to ensure test fails rather than skips
			throw error
		}
	});

	afterAll(async () => {
		await disconnectMcpClient(client);
	});

	test('basic query', async () => {
		const result = await client.callTool('executeSoqlQuery', {
			query: 'SELECT Id, Name FROM Account LIMIT 3',
		});

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery basic query')

		// Validate specific content
		const sc = result.structuredContent;
		expect(Array.isArray(sc.records)).toBe(true)
		expect(sc.records.length).toBeGreaterThan(0)

		const r = sc.records[0]
		expect(r.Id).toBeTruthy()
		expect(r.Name).toBeTruthy()
	})

	test('with no results', async () => {
		const result = await client.callTool('executeSoqlQuery', {
			query: "SELECT Id, Name FROM Account WHERE Name = 'NonExistentAccount12345' LIMIT 1",
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with no results')

		// Validate specific content
		const sc = result.structuredContent
		expect(Array.isArray(sc.records)).toBe(true)
		expect(sc.records.length).toBe(0)
	})

	test('with Tooling API', async () => {
		const result = await client.callTool('executeSoqlQuery', {
			query: 'SELECT Id, Name FROM ApexClass LIMIT 3',
			useToolingApi: true,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with Tooling API')

		// Validate specific content
		const sc = result.structuredContent
		expect(Array.isArray(sc.records)).toBe(true)
	})

	test('with Tooling API and no results', async () => {
		const result = await client.callTool('executeSoqlQuery', {
			query: "SELECT Id, Name FROM ApexClass WHERE Name = 'NonExistentApexClass12345' LIMIT 1",
			useToolingApi: true,
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'executeSoqlQuery with Tooling API and no results')

		// Validate specific content
		const sc = result.structuredContent
		expect(Array.isArray(sc.records)).toBe(true)
		expect(sc.records.length).toBe(0)
	})
})
