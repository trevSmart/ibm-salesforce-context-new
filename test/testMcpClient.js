import { TestMcpClient as MicroscopeClient } from 'microscope-mcp-client'

const BASE_URL = `http://localhost:${process.env.MCP_HTTP_PORT || '3000'}/mcp`

export async function createMcpClient() {
	const client = new MicroscopeClient()

	const serverTarget = {
		kind: 'http',
		url: BASE_URL,
	}

	await client.connect(serverTarget, { quiet: true })

	// Wrap the client to provide compatibility with existing tests
	return {
		listResources: async () => client.getResources(),
		readResource: async uri => {
			// Use the underlying MCP SDK client to read the resource
			const mcpClient = client.client
			if (mcpClient && typeof mcpClient.readResource === 'function') {
				return await mcpClient.readResource({ uri })
			}
			// Fallback to getResource for cached resources
			return client.getResource(uri)
		},
		callTool: async (name, args) => {
			const result = await client.callTool(name, args)
			// Parse the response to match the old API
			if (result?.content && Array.isArray(result.content) && result.content.length > 0) {
				const firstContent = result.content[0]
				if (firstContent?.text) {
					try {
						const structuredContent = JSON.parse(firstContent.text)
						return {
							...result,
							structuredContent,
						}
					} catch (_e) {
						// If parsing fails, return the raw result with text as-is
						return result
					}
				}
			}
			// If the result already has structuredContent (from tools that return it directly), return as-is
			if (result?.structuredContent !== undefined) {
				return result
			}
			// If no content or empty content, return result as-is
			return result
		},
		getPrompt: async (name, args) => {
			// microscope-mcp-client doesn't expose prompts API yet
			// Access the underlying MCP SDK client directly
			// MicroscopeClient stores the SDK client in the 'client' property
			const mcpClient = client.client || client._raw?.client
			if (mcpClient && typeof mcpClient.getPrompt === 'function') {
				return await mcpClient.getPrompt({ name, arguments: args })
			}
			// Fallback if we can't access the underlying client
			throw new Error('Prompts not supported: underlying client not accessible')
		},
		listTools: async () => client.getTools(),
		disconnect: async () => client.disconnect(),
		// Expose the raw client for tests that need it
		// biome-ignore lint/style/useNamingConvention: internal property
		_raw: client,
	}
}

export async function disconnectMcpClient(client) {
	if (client && typeof client.disconnect === 'function') {
		await client.disconnect()
	}
}

export async function listTools(client) {
	return client.listTools()
}
