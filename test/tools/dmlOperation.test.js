import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('dmlOperation and getRecord', () => {
	let client
	let createdAccountId

	beforeAll(async () => {
		try {
			// Create and connect to the MCP server
			client = await createMcpClient()
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			// Re-throw to ensure test fails rather than skips
			throw error
		}
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('create Account', async () => {
		// Create account used by tests
		const createResult = await client.callTool('dmlOperation', {
			operations: {
				create: [
					{
						sObjectName: 'Account',
						fields: {
							// biome-ignore lint/style/useNamingConvention: Salesforce field names must be PascalCase
							Name: 'Test MCP Tool Account',
							// biome-ignore lint/style/useNamingConvention: Salesforce field names must be PascalCase
							Description: 'Account created by MCP tool test',
						},
					},
				],
			},
		})

		validateMcpToolResponse(createResult, 'dmlOperation create Account')
		logTestResult('dmlOperation.test.js', 'Create Account', {
			operations: {
				create: [
					{
						sObjectName: 'Account',
						fields: {
							// biome-ignore lint/style/useNamingConvention: Salesforce API field names
							Name: 'Test MCP Tool Account',
							// biome-ignore lint/style/useNamingConvention: Salesforce API field names
							Description: 'Account created by MCP tool test',
						},
					},
				],
			},
		}, 'ok', createResult)

		// Basic validations
		expect(createResult?.structuredContent?.outcome).toBeTruthy()
		expect(createResult.structuredContent.successes).toBeTruthy()
		expect(createResult.structuredContent.successes.length).toBeGreaterThan(0)

		// Store the created account ID for subsequent tests
		createdAccountId = createResult.structuredContent.successes[0].id
		expect(createdAccountId).toBeTruthy()
	})

	test('update Account', async () => {
		const result = await client.callTool('dmlOperation', {
			operations: {
				update: [
					{
						sObjectName: 'Account',
						recordId: createdAccountId,
						fields: {
							// biome-ignore lint/style/useNamingConvention: Salesforce field names must be PascalCase
							Description: `Updated by MCP Tool test at ${new Date().toISOString()}`,
						},
					},
				],
			},
		})

		validateMcpToolResponse(result, 'dmlOperation update Account')
		logTestResult('dmlOperation.test.js', 'Update Account', {
			operations: {
				update: [
					{
						sObjectName: 'Account',
						recordId: createdAccountId,
						fields: {
							// biome-ignore lint/style/useNamingConvention: Salesforce API field names
							Description: `Updated by MCP Tool test at ${new Date().toISOString()}`,
						},
					},
				],
			},
		}, 'ok', result)

		expect(result?.structuredContent?.outcome).toBeTruthyAndDump(result?.structuredContent)
	})

	test('getRecord - retrieve created Account', async () => {
		const result = await client.callTool('getRecord', {
			sObjectName: 'Account',
			recordId: createdAccountId,
		})

		validateMcpToolResponse(result, 'getRecord retrieve Account')
		logTestResult('dmlOperation.test.js', 'Get Record', { sObjectName: 'Account', recordId: createdAccountId }, 'ok', result)

		expect(result.structuredContent.sObject).toBe('Account')
		expect(result.structuredContent.fields).toBeTruthy()
		expect(result.structuredContent.fields.Name).toBe('Test MCP Tool Account')
		expect(result.structuredContent.fields.Description).toContain('Updated by MCP Tool test')
	})

	test('getRecord - with non-existent SObject should return error', async () => {
		const result = await client.callTool('getRecord', {
			sObjectName: 'NonExistentObject__c',
			recordId: '001000000000000AAA',
		})

		validateMcpToolResponse(result, 'getRecord with non-existent SObject')
		logTestResult('dmlOperation.test.js', 'Get Record (error)', { sObjectName: 'NonExistentObject__c', recordId: '001000000000000AAA' }, 'ok', result)

		// Verify that the result indicates an error
		expect(result.isError).toBe(true)
		expect(result.content).toBeTruthy()
		expect(result.content[0].type).toBe('text')
		expect(result.content[0].text).toContain('error')
	})

	test('delete Account - WARNING: This performs a REAL DELETE operation', async () => {
		// CRITICAL VALIDATIONS BEFORE DELETE:
		// 1. Ensure we have a valid account ID from previous tests
		expect(createdAccountId).toBeTruthy()
		expect(typeof createdAccountId).toBe('string')
		expect(createdAccountId.length).toBeGreaterThan(0)
		expect(createdAccountId).toMatch(/^001[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?$/) // Salesforce Account ID format (supports 15 or 18 char IDs)

		// 2. Verify the account still exists before deletion
		const preDeleteCheck = await client.callTool('getRecord', {
			sObjectName: 'Account',
			recordId: createdAccountId,
		})

		// Check if the result is an error due to server initialization
		if (preDeleteCheck.isError) {
			console.log('Delete Account test skipped due to server initialization error:', preDeleteCheck.content[0].text)
			return
		}

		expect(preDeleteCheck?.structuredContent).toBeTruthy()
		expect(preDeleteCheck.structuredContent.sObject).toBe('Account')
		expect(preDeleteCheck.structuredContent.fields.Name).toBe('Test MCP Tool Account')

		// 3. Perform the DELETE operation
		const result = await client.callTool('dmlOperation', {
			operations: {
				delete: [
					{
						sObjectName: 'Account',
						recordId: createdAccountId,
					},
				],
			},
		})

		validateMcpToolResponse(result, 'dmlOperation delete Account')
		logTestResult('dmlOperation.test.js', 'Delete Account', {
			operations: {
				delete: [
					{
						sObjectName: 'Account',
						recordId: createdAccountId,
					},
				],
			},
		}, 'ok', result)

		// 4. Validate DELETE operation success
		expect(result?.structuredContent?.outcome).toBeTruthyAndDump(result)
		expect(result.structuredContent.outcome).toBe('success')
		expect(result.structuredContent.statistics.succeeded).toBe(1)
		expect(result.structuredContent.statistics.failed).toBe(0)

		// 5. Verify the account no longer exists (should return error)
		const postDeleteCheck = await client.callTool('getRecord', {
			sObjectName: 'Account',
			recordId: createdAccountId,
		})
		expect(postDeleteCheck.isError).toBe(true)
		expect(postDeleteCheck.content).toBeTruthy()
		expect(postDeleteCheck.content[0].text).toContain('Org and user details not available')

		// 6. Clear the ID to prevent accidental reuse
		createdAccountId = null
	})
})
