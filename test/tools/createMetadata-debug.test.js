import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('createMetadata Debug', () => {
	let client

	beforeAll(async () => {
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('Check server state after each test', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getState',
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'salesforceContextUtils getState')

		logTestResult('createMetadata-debug.test.js', 'Check server state', { action: 'getState' }, 'ok', result)
		expect(result.structuredContent?.state?.org?.user?.id).toBeTruthy()
	})

	test('Create Apex class', async () => {
		const result = await client.callTool('createMetadata', {
			type: 'apexClass',
			name: 'DebugTestClass',
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'createMetadata Apex class')

		logTestResult('createMetadata-debug.test.js', 'Create Apex class', { type: 'apexClass', name: 'DebugTestClass' }, 'ok', result)
		expect(result?.structuredContent?.success).toBeTruthy()
	})

	test('Check server state after Apex class', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getState',
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'salesforceContextUtils getState after Apex class')

		logTestResult('createMetadata-debug.test.js', 'Check server state after Apex class', { action: 'getState' }, 'ok', result)
		expect(result.structuredContent?.state?.org?.user?.id).toBeTruthy()
	})

	test('Create Apex trigger', async () => {
		const result = await client.callTool('createMetadata', {
			type: 'apexTrigger',
			name: 'DebugTestTrigger',
			triggerSObject: 'Account',
			triggerEvent: ['after insert'],
		})

		// Validate MCP tool response structure
		validateMcpToolResponse(result, 'createMetadata Apex trigger')

		logTestResult('createMetadata-debug.test.js', 'Create Apex trigger', {
			type: 'apexTrigger',
			name: 'DebugTestTrigger',
			triggerSObject: 'Account',
			triggerEvent: ['after insert']
		}, 'ok', result)
		expect(result?.structuredContent?.success).toBeTruthy()
	})
})
