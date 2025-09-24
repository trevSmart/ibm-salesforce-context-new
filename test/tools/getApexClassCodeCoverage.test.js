import { createMcpClient } from '../testMcpClient.js'

describe('getApexClassCodeCoverage', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance
		client = await createMcpClient()
	})

	test('getApexClassCodeCoverage', async () => {
		const result = await client.callTool('getApexClassCodeCoverage', {
			classNames: ['TestMCPTool'],
		})
		expect(result?.structuredContent?.classes).toBeTruthy()
		expect(Array.isArray(result.structuredContent.classes)).toBe(true)

		if (result.structuredContent.classes.length > 0) {
			const classCoverage = result.structuredContent.classes[0]
			expect(classCoverage.className).toBeTruthy()
			expect(typeof classCoverage.percentage).toBe('number')
		}
	})
})
