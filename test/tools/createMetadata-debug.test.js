import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

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
		console.log('Server state:', JSON.stringify(result.structuredContent, null, 2))
		expect(result.structuredContent?.state?.org?.user?.id).toBeTruthy()
	})

	test('Create Apex class', async () => {
		const result = await client.callTool('createMetadata', {
			type: 'apexClass',
			name: 'DebugTestClass',
		})
		console.log('Apex class result:', JSON.stringify(result, null, 2))
		expect(result?.structuredContent?.success).toBeTruthy()
	})

	test('Check server state after Apex class', async () => {
		const result = await client.callTool('salesforceContextUtils', {
			action: 'getState',
		})
		console.log('Server state after Apex class:', JSON.stringify(result.structuredContent, null, 2))
		expect(result.structuredContent?.state?.org?.user?.id).toBeTruthy()
	})

	test('Create Apex trigger', async () => {
		const result = await client.callTool('createMetadata', {
			type: 'apexTrigger',
			name: 'DebugTestTrigger',
			triggerSObject: 'Account',
			triggerEvent: ['after insert'],
		})
		console.log('Apex trigger result:', JSON.stringify(result, null, 2))
		expect(result?.structuredContent?.success).toBeTruthy()
	})
})
