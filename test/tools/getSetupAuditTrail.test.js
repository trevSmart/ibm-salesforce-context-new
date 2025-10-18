import fs from 'node:fs'
import path from 'node:path'
import { TestData } from '../test-data.js'
import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('getSetupAuditTrail', () => {
	let client

	function deleteAuditTrailFile() {
		// Delete tmp/SetupAuditTrail.csv if it exists
		const tmpFilePath = path.join('tmp', 'SetupAuditTrail.csv')
		try {
			fs.unlinkSync(tmpFilePath)
		} catch {
			// File doesn't exist or other error, continue
		}
	}

	beforeAll(async () => {
		client = await createMcpClient()
		deleteAuditTrailFile()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
		deleteAuditTrailFile()
	})

	test.skipIf(process.env.SKIP_OPTIONAL_TESTS === 'true')(
		'basic',
		async () => {
			// Verify that the client is defined
			expect(client).toBeTruthy()

			const result = await client.callTool('getSetupAuditTrail', { lastDays: 7 })

			validateMcpToolResponse(result, 'getSetupAuditTrail basic')
			logTestResult('getSetupAuditTrail.test.js', 'Basic', { lastDays: 7 }, 'ok', result)

			expect(result).toBeTruthy()

			// If result is an error, fail the test instead of skipping
			if (result.isError) {
				throw new Error(`Server error: ${result.content?.[0]?.text}`)
			}

			expect(result?.structuredContent?.filters).toBeTruthy()
			expect(typeof result.structuredContent.setupAuditTrailFileTotalRecords).toBe('number')
			expect(Array.isArray(result.structuredContent.records)).toBe(true)
		},
		30_000,
	)

	test.skipIf(process.env.SKIP_OPTIONAL_TESTS === 'true')('cached with user filter', async () => {
		// Skip this test if MCP_TEST_USER is not properly set
		if (!process.env.MCP_TEST_USER || process.env.MCP_TEST_USER.includes('missing test user')) {
			logTestResult('getSetupAuditTrail.test.js', 'Cached with user filter', { lastDays: 14, user: TestData.salesforce.testUser }, 'skipped', 'MCP_TEST_USER not properly configured')
			console.log('Skipping test: MCP_TEST_USER not properly configured')
			return
		}

		const result = await client.callTool('getSetupAuditTrail', {
			lastDays: 14,
			user: TestData.salesforce.testUser,
		})

		validateMcpToolResponse(result, 'getSetupAuditTrail cached with user filter')
		logTestResult('getSetupAuditTrail.test.js', 'Cached with user filter', { lastDays: 14, user: TestData.salesforce.testUser }, 'ok', result)

		expect(result).toBeTruthy()

		// If result is an error, fail the test instead of skipping
		if (result.isError) {
			throw new Error(`Server error: ${result.content?.[0]?.text}`)
		}

		expect(result?.structuredContent?.filters).toBeTruthy()
		expect(result.structuredContent.filters.user).toBe(TestData.salesforce.testUser)
	}, 10_000)
})
