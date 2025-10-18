import { describe, test, expect } from 'vitest'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { logTestResult } from '../testUtils.js'

const execAsync = promisify(exec)

describe('Server Cleanup', () => {
	test('should not leave orphan processes after tests', async () => {
		// Count MCP server processes
		const { stdout } = await execAsync(
			'ps aux | grep "node index.js" | grep -v grep | wc -l'
		)

		const processCount = Number.parseInt(stdout.trim(), 10)

		logTestResult('server-cleanup.test.js', 'No orphan processes', {}, 'ok', {
			description: 'Tests that no orphan MCP server processes are left running after tests',
			output: `Found ${processCount} processes (should be ≤ 1)`
		})

		// Should be 0 or 1 (only the current test server)
		expect(processCount).toBeLessThanOrEqual(1)
	}, 10000)
})
