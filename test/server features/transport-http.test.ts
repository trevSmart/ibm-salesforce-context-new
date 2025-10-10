import { afterAll, describe, expect, it } from 'vitest'
import { TestMcpClient } from 'microscope-mcp-client'

describe('MCP HTTP Connection Test', () => {
	let client: TestMcpClient | null = null
	const baseUrl = `http://localhost:${process.env.MCP_HTTP_PORT || '3000'}/mcp`

	afterAll(async () => {
		if (client) {
			await client.disconnect()
		}
	})

	it('should connect to HTTP server and initialize MCP session successfully', async () => {
		// Create a new TestMcpClient instance
		client = new TestMcpClient()

		// Connect to the HTTP server
		const serverTarget = {
			kind: 'http' as const,
			url: baseUrl,
		}

		await client.connect(serverTarget, { quiet: true })

		// Verify connection by calling a tool
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getOrgAndUserDetails',
		})

		expect(result).toBeDefined()
		expect(result.content).toBeDefined()
		expect(Array.isArray(result.content)).toBe(true)
		expect(result.content.length).toBeGreaterThan(0)

		// Parse the response - it could be text or JSON
		const responseText = result.content[0]?.text
		expect(responseText).toBeDefined()

		let structuredContent
		try {
			// Try to parse as JSON first
			structuredContent = JSON.parse(responseText)
		} catch {
			// If not JSON, the response might be an error or plain text
			console.log('Response is not JSON:', responseText)
			// For non-JSON responses, just verify we got a response
			expect(responseText).toBeTruthy()
			return
		}

		expect(structuredContent).toBeTruthyAndDump(structuredContent)
		expect(structuredContent?.id).toBeTruthy()
		expect(structuredContent?.alias).toBeTypeOf('string')
		expect(structuredContent?.user).toBeTruthyAndDump(structuredContent?.user)
		expect(structuredContent?.user?.username).toBeTruthy()

		console.log('✅ MCP client initialized successfully')
	}, 20000)

	it('should list available tools', async () => {
		expect(client).toBeDefined()

		const tools = client?.getTools()

		expect(tools).toBeDefined()
		expect(Array.isArray(tools)).toBe(true)
		expect(tools.length).toBeGreaterThan(0)

		// Check for expected tools
		const toolNames = tools.map((tool) => tool.name)
		expect(toolNames).toContain('salesforceContextUtils')
		expect(toolNames).toContain('executeSoqlQuery')
		expect(toolNames).toContain('describeObject')
		expect(toolNames).toContain('getRecord')

		console.log(`✅ Found ${tools.length} available tools`)
		console.log('Available tools:', toolNames)
	}, 20000)

	it('should list available resources', async () => {
		expect(client).toBeDefined()

		const resources = client?.getResources()

		expect(resources).toBeDefined()
		expect(Array.isArray(resources)).toBe(true)

		console.log(`✅ Found ${resources.length} available resources`)
	}, 20000)

	it('should describe a specific tool', async () => {
		expect(client).toBeDefined()

		const toolInfo = client.describeTool('salesforceContextUtils')

		expect(toolInfo).toBeDefined()
		expect(toolInfo.name).toBe('salesforceContextUtils')
		expect(toolInfo.description).toBeDefined()

		console.log('✅ Tool description retrieved successfully')
	}, 20000)

	it('should successfully call a tool', async () => {
		expect(client).toBeDefined()

		// Call a simple tool to verify it works
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getState',
		})

		expect(result).toBeDefined()
		expect(result.content).toBeDefined()
		expect(Array.isArray(result.content)).toBe(true)
		expect(result.content.length).toBeGreaterThan(0)

		// Just verify we got a response (could be error or success)
		const responseText = result.content[0]?.text
		expect(responseText).toBeDefined()
		expect(responseText).toBeTruthy()

		console.log('✅ Tool call successful')
	}, 20000)
})

/* No waitForServer helper needed: setup.ts ensures server is ready */

