import fetch from 'node-fetch'
import type { Response } from 'node-fetch'
import type { Readable } from 'node:stream'
import { afterAll, describe, expect, it } from 'vitest'
import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

interface McpResponse {
	jsonrpc: string
	id?: number
	result?: {
		protocolVersion: string
		serverInfo: {
			name: string
		}
		sessionId?: string
		tools?: Array<{ name: string }>
		resources?: Array<unknown>
		prompts?: Array<{ name: string }>
	}
	error?: {
		message: string
	}
}

function tryParseJson(payload: string): McpResponse | null {
        if (!payload.trim()) {
                return null
        }

        try {
                return JSON.parse(payload) as McpResponse
        } catch {
                return null
        }
}

function parseSseEvent(event: string): McpResponse | null {
        const dataLines: string[] = []

        for (const line of event.split(/\r?\n/)) {
                if (line.startsWith('data:')) {
                        dataLines.push(line.slice('data:'.length).trimStart())
                }
        }

        if (dataLines.length === 0) {
                return null
        }

        const payload = dataLines.join('\n')
        return tryParseJson(payload)
}

function extractSseMessageFromBuffer(buffer: string): {
        parsed: McpResponse | null
        remaining: string
} {
        const events = buffer.split(/\r?\n\r?\n/)
        const remaining = events.pop() ?? ''

        for (const event of events) {
                const parsed = parseSseEvent(event)
                if (parsed) {
                        return {
                                parsed,
                                remaining,
                        }
                }
        }

        return { parsed: null, remaining }
}

async function readSseFromWebStream(stream: ReadableStream<Uint8Array>): Promise<McpResponse | null> {
        const reader = stream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let parsed: McpResponse | null = null

        try {
                while (!parsed) {
                        const { value, done } = await reader.read()
                        if (done) {
                                break
                        }

                        buffer += decoder.decode(value, { stream: true })
                        const result = extractSseMessageFromBuffer(buffer)
                        buffer = result.remaining
                        parsed = result.parsed
                }

                if (!parsed) {
                        buffer += decoder.decode()
                        const result = extractSseMessageFromBuffer(buffer)
                        buffer = result.remaining
                        parsed = result.parsed
                }

                if (!parsed && buffer) {
                        parsed = parseSseEvent(buffer) ?? tryParseJson(buffer)
                }
        } finally {
                try {
                        await reader.cancel()
                } catch {
                        // Ignore cancellation failures
                }
                if (typeof reader.releaseLock === 'function') {
                        reader.releaseLock()
                }
        }

        return parsed
}

async function readSseFromNodeStream(stream: Readable & AsyncIterable<Uint8Array>): Promise<McpResponse | null> {
        const decoder = new TextDecoder()
        let buffer = ''
        let parsed: McpResponse | null = null

        try {
                for await (const chunk of stream) {
                        buffer += decoder.decode(chunk, { stream: true })
                        const result = extractSseMessageFromBuffer(buffer)
                        buffer = result.remaining
                        parsed = result.parsed

                        if (parsed) {
                                break
                        }
                }

                if (!parsed) {
                        buffer += decoder.decode()
                        const result = extractSseMessageFromBuffer(buffer)
                        buffer = result.remaining
                        parsed = result.parsed
                }

                if (!parsed && buffer) {
                        parsed = parseSseEvent(buffer) ?? tryParseJson(buffer)
                }
        } finally {
                if (typeof stream.destroy === 'function' && !stream.destroyed) {
                        stream.destroy()
                }
        }

        return parsed
}

async function parseTextResponse(response: Response): Promise<McpResponse | null> {
        const responseText = await response.text()

        const directJson = tryParseJson(responseText)
        if (directJson) {
                return directJson
        }

        const lines = responseText.split(/\r?\n/)

        for (const line of lines) {
                if (line.startsWith('data:')) {
                        const payload = line.slice('data:'.length).trimStart()
                        const parsed = tryParseJson(payload)
                        if (parsed) {
                                return parsed
                        }
                }
        }

        return null
}

// Helper function to parse SSE responses
async function parseSseResponse(response: Response): Promise<McpResponse | null> {
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

        if (contentType.includes('text/event-stream') && response.body) {
                const fallbackResponse = response.clone()
                const body = response.body as ReadableStream<Uint8Array> | (Readable & AsyncIterable<Uint8Array>)

                if (typeof (body as ReadableStream<Uint8Array>).getReader === 'function') {
                        const parsed = await readSseFromWebStream(body as ReadableStream<Uint8Array>)
                        if (parsed) {
                                return parsed
                        }
                } else if (Symbol.asyncIterator in (body as object)) {
                        const parsed = await readSseFromNodeStream(body as Readable & AsyncIterable<Uint8Array>)
                        if (parsed) {
                                return parsed
                        }
                }

                return parseTextResponse(fallbackResponse)
        }

        return parseTextResponse(response)
}

describe('MCP HTTP Connection Test', () => {
	let sessionId: string | null = null
	let client: ReturnType<typeof createMcpClient> extends Promise<infer T> ? T : never = null
	const baseUrl = `http://localhost:${process.env.MCP_HTTP_PORT || '3000'}/mcp`

	afterAll(async () => {
		if (client) {
			await disconnectMcpClient(client)
		}
		if (sessionId) {
			try {
				await fetch(baseUrl, {
					method: 'DELETE',
					headers: {
						'mcp-session-id': sessionId,
					},
				})
			} catch (error) {
				console.warn('Warning: Could not close session:', error)
			}
		}
	})

	// Helper function to make authenticated requests
	async function makeAuthenticatedRequest(method: string, params: unknown) {
		if (!sessionId) {
			throw new Error('No session ID available')
		}

		const request = {
			jsonrpc: '2.0',
			id: Math.floor(Math.random() * 1000),
			method,
			params,
		}

		const response = await fetch(baseUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				'mcp-session-id': sessionId,
			},
			body: JSON.stringify(request),
		})

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		return response
	}

	it('should initialize MCP session successfully', async () => {
		const initRequest = {
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: {
				protocolVersion: '2025-06-18',
				capabilities: {
					logging: {},
					resources: {},
					roots: { listChanged: true },
					sampling: {}
				},
				clientInfo: {
					name: 'vitest-test-client',
					version: '1.0.0'
				}
			}
		}

		const response = await fetch(baseUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify(initRequest),
		})

		expect(response.ok).toBeTruthyAndDump(true)

		// Parse SSE response
		const data = await parseSseResponse(response)
		expect(data).toBeDefined()
		expect(data?.jsonrpc).toBe('2.0')
		expect(data?.result).toBeTruthyAndDump(data?.result)
		expect(data?.result?.protocolVersion).toBe('2025-06-18')
		expect(data?.result?.serverInfo).toBeDefined()
		expect(data?.result?.serverInfo?.name).toBe('IBM Salesforce Context')

		// Extract session ID from response headers
		sessionId = response.headers.get('mcp-session-id') || response.headers.get('session-id')
		expect(sessionId).toBeDefined()
		expect(typeof sessionId).toBe('string')

		// Create MCP client and verify org details
		client = await createMcpClient()
		expect(client).toBeDefined()

		const result = await client.callTool('salesforceContextUtils', {
			action: 'getOrgAndUserDetails',
		})

		const structuredContent = result?.structuredContent as { id: string, alias: string, user: { id: string, username: string } }

		expect(structuredContent).toBeTruthyAndDump(structuredContent)
		expect(structuredContent.id).toBeTruthy()
		expect(structuredContent.alias).toBeTypeOf('string')
		expect(structuredContent.user).toBeTruthyAndDump(structuredContent.user)
		expect(structuredContent.user.username).toBeTruthy()
	}, 20000)

	it('should list available tools', async () => {
		expect(sessionId).toBeDefined()

		const response = await makeAuthenticatedRequest('tools/list', {})
		const data = await parseSseResponse(response)

		expect(data).toBeDefined()
		expect(data?.jsonrpc).toBe('2.0')
		expect(data?.result).toBeDefined()
		expect(data?.result?.tools).toBeDefined()
		expect(Array.isArray(data?.result?.tools)).toBe(true)

		// Check for expected tools
		const toolNames = data?.result?.tools?.map((tool: { name: string }) => tool.name) || []
		expect(toolNames).toContain('salesforceContextUtils')
		expect(toolNames).toContain('executeSoqlQuery')
		expect(toolNames).toContain('describeObject')
		expect(toolNames).toContain('getRecord')

		console.log(`✅ Found ${data?.result?.tools?.length || 0} available tools`)
		console.log('Available tools:', toolNames)
	}, 20000)

	it('should list available resources', async () => {
		expect(sessionId).toBeDefined()

		const response = await makeAuthenticatedRequest('resources/list', {})
		const data = await parseSseResponse(response)

		expect(data).toBeDefined()
		expect(data?.jsonrpc).toBe('2.0')
		expect(data?.result).toBeDefined()
		expect(data?.result?.resources).toBeDefined()
		expect(Array.isArray(data?.result?.resources)).toBe(true)

		console.log(`✅ Found ${data?.result?.resources?.length || 0} available resources`)
	}, 20000)

	it('should list available prompts', async () => {
		expect(sessionId).toBeDefined()

		const response = await makeAuthenticatedRequest('prompts/list', {})
		const data = await parseSseResponse(response)

		expect(data).toBeDefined()
		expect(data?.jsonrpc).toBe('2.0')
		expect(data?.result).toBeDefined()
		expect(data?.result?.prompts).toBeDefined()
		expect(Array.isArray(data?.result?.prompts)).toBe(true)

		// Check for expected prompts
		const promptNames = data?.result?.prompts?.map((prompt: { name: string }) => prompt.name) || []
		expect(promptNames).toContain('apex-run-script')
		expect(promptNames).toContain('tools-basic-run')

		console.log(`✅ Found ${data?.result?.prompts?.length || 0} available prompts`)
		console.log('Available prompts:', promptNames)
	}, 20000)

	it('should handle invalid session ID gracefully', async () => {
		const toolsRequest = {
			jsonrpc: '2.0',
			id: 5,
			method: 'tools/list',
		}

		const response = await fetch(baseUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				'mcp-session-id': 'invalid-session-id',
			},
			body: JSON.stringify(toolsRequest),
		})

		expect(response.status).toBe(400)

		// For error responses, try both SSE and JSON parsing
		const responseClone = response.clone()
		let data = await parseSseResponse(response)
		if (!data) {
			// If SSE parsing fails, try JSON parsing
			try {
				const responseText = await responseClone.text()
				data = JSON.parse(responseText) as McpResponse
			} catch (_e) {
				// If both fail, check the response text
				const responseText = await responseClone.text()
				console.log('Error response text:', responseText)
			}
		}

		expect(data).toBeDefined()
		expect(data?.error).toBeDefined()
		expect(data?.error?.message).toContain('No valid session ID')

		console.log('✅ Invalid session ID handled correctly')
	})
})

/* No waitForServer helper needed: setup.ts ensures server is ready */
