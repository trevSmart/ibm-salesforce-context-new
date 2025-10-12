import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TestMcpClient as MicroscopeClient } from 'microscope-mcp-client'

describe('MCP HTTP Connection Test', () => {
	let client: MicroscopeClient | null = null
	const baseUrl = `http://localhost:${process.env.MCP_HTTP_PORT || '3000'}/mcp`

	beforeAll(async () => {
		// Initialize and connect the client once for all tests
		client = new MicroscopeClient()

		const serverTarget = {
			kind: 'http' as const,
			url: baseUrl,
		}

		await client.connect(serverTarget, { quiet: true })
	})

	afterAll(async () => {
		if (client) {
			await client.disconnect()
		}
	})

	it('should connect to HTTP server and verify org details', async () => {
		expect(client).toBeDefined()

		// Verify connection by calling a tool
		const result = await client?.callTool('salesforceContextUtils', {
			action: 'getOrgAndUserDetails',
		})

		expect(result).toBeDefined()
		expect(result.content).toBeDefined()
		expect(Array.isArray(result.content)).toBe(true)
		expect(result.content.length).toBeGreaterThan(0)

		// Debug: Check what the result contains
		console.log('DEBUG - Full result:', JSON.stringify(result, null, 2))

		// The tool should return structured content directly
		expect(result.structuredContent).toBeDefined()
		const structuredContent = result.structuredContent

		expect(structuredContent).toBeTruthyAndDump(structuredContent)
		expect(structuredContent?.id).toBeTruthy()
		expect(structuredContent?.alias).toBeTypeOf('string')
		expect(structuredContent?.user).toBeTruthyAndDump(structuredContent?.user)
		expect(structuredContent?.username).toBeTruthy()

		console.log('✅ Org details verified successfully')
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

		const toolInfo = client?.describeTool('salesforceContextUtils')

		expect(toolInfo).toBeDefined()
		expect(toolInfo.name).toBe('salesforceContextUtils')
		expect(toolInfo.description).toBeDefined()

		console.log('✅ Tool description retrieved successfully')
	}, 20000)

	it('should successfully call a tool', async () => {
		expect(client).toBeDefined()

		// Call a simple tool to verify it works
		const result = await client?.callTool('salesforceContextUtils', {
			action: 'getState',
		})

		expect(result).toBeDefined()
		expect(result.content).toBeDefined()
		expect(Array.isArray(result.content)).toBe(true)
		expect(result.content.length).toBeGreaterThan(0)

		// Verify we got a valid response (not an error message)
		const responseText = result.content[0]?.text
		expect(responseText).toBeDefined()
		expect(responseText).toBeTruthy()

		// Ensure it's not an error message
		expect(responseText).not.toMatch(/^❌/)
		expect(responseText).not.toMatch(/^Error:/)

		console.log('✅ Tool call successful')
	}, 20000)
})

/* No waitForServer helper needed: setup.ts ensures server is ready */

