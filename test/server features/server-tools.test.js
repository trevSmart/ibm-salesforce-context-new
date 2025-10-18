import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult } from '../testUtils.js'

describe('Server tools', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance once for all tests
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('should retrieve the list of available tools from the server', async () => {
		// Verify the client is defined
		expect(client).toBeTruthy()

		// Get the list of available tools from the server
		const toolsList = await client.listTools()

		logTestResult('server-tools.test.js', 'Retrieve tools list', {}, 'ok', {
			description: 'Tests that server exposes list of available tools',
			output: `Retrieved ${toolsList.length} tools`
		})

		// Verify we received a tools list
		expect(toolsList).toBeTruthy()
		expect(Array.isArray(toolsList)).toBe(true)
		expect(toolsList.length).toBeGreaterThan(0)

		// Verify the structure of tool items
		const firstTool = toolsList[0]
		expect(firstTool).toHaveProperty('name')
		expect(firstTool).toHaveProperty('description')
		// MCP spec: tools expose `inputSchema` (not `parameters`)
		expect(firstTool).toHaveProperty('inputSchema')

		// Verify some expected tools are present
		const toolNames = toolsList.map(tool => tool.name)
		expect(toolNames).toContain('salesforceContextUtils')
		expect(toolNames).toContain('executeAnonymousApex')
		expect(toolNames).toContain('describeObject')

		console.log(`Successfully retrieved ${toolsList.length} tools from the server`)
	})
})
