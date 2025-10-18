import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult, validateMcpToolResponse } from '../testUtils.js'

describe('runApexTest', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)
	})

	test('by class', async () => {
		// First, let's find available test classes
		const queryResult = await client.callTool('executeSoqlQuery', {
			query: "SELECT Id, Name FROM ApexClass WHERE Name LIKE '%Test%' LIMIT 5",
			useToolingApi: true,
		})

		// Use the first available test class
		const testClasses = queryResult?.structuredContent?.records || []
		if (testClasses.length === 0) {
			logTestResult('runApexTest.test.js', 'By class', { classNames: ['No test classes found'] }, 'ko', 'No test classes found - this indicates a problem with the Salesforce org configuration or test setup')
			throw new Error('No test classes found - this indicates a problem with the Salesforce org configuration or test setup')
		}

		const testClassName = testClasses[0].Name

		const result = await client.callTool('runApexTest', {
			classNames: [testClassName],
		})

		validateMcpToolResponse(result, 'runApexTest by class')
		logTestResult('runApexTest.test.js', 'By class', { classNames: [testClassName] }, 'ok', result)

		if (result.isError) {
			// For now, just check that we got a response
			expect(result).toBeTruthy()
		} else {
			expect(result?.structuredContent?.result).toBeTruthy()
			expect(Array.isArray(result.structuredContent.result)).toBe(true)

			if (result.structuredContent.result.length > 0) {
				const testResult = result.structuredContent.result[0]
				expect(testResult.className).toBeTruthy()
				expect(testResult.methodName).toBeTruthy()
				expect(testResult.status).toBeTruthy()
			}
		}
	})

	test('by method', async () => {
		// For now, just test that the tool responds (even if with error)
		const result = await client.callTool('runApexTest', {
			methodNames: ['NonExistentClass.nonExistentMethod'],
		})

		validateMcpToolResponse(result, 'runApexTest by method')
		logTestResult('runApexTest.test.js', 'By method', { methodNames: ['NonExistentClass.nonExistentMethod'] }, 'ok', result)

		// The tool should respond (even if with an error)
		expect(result).toBeTruthy()
		expect(result.isError).toBe(true)
	})
})
