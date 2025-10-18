import { createMcpClient, disconnectMcpClient } from './testMcpClient.js'

/**
 * Sets up a standard test environment with MCP client
 * @param {object} options - Configuration options
 * @param {string} options.description - Test suite description
 * @param {function} options.beforeAllCallback - Additional beforeAll logic
 * @param {function} options.afterAllCallback - Additional afterAll logic
 * @returns {object} Test configuration object
 */
export function setupMcpTestSuite(options = {}) {
	const { description, beforeAllCallback, afterAllCallback } = options
	let client

	const beforeAll = async () => {
		try {
			client = await createMcpClient()
			if (beforeAllCallback) {
				await beforeAllCallback(client)
			}
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			// Re-throw to ensure test fails rather than skips
			throw error
		}
	}

	const afterAll = async () => {
		if (afterAllCallback) {
			await afterAllCallback(client)
		}
		await disconnectMcpClient(client)
	}

	return {
		description: description || 'MCP Tool Test',
		beforeAll,
		afterAll,
		getClient: () => client
	}
}

/**
 * Validates that a tool response follows MCP protocol requirements:
 * - Both content and structuredContent must be present and non-null
 * - content must be an array
 * - structuredContent must be an object
 * @param {object} result - The MCP tool result
 * @param {string} testName - Name of the test for error messages
 * @throws {Error} If validation fails
 */
export function validateMcpToolResponse(result, testName = 'unknown') {
	if (!result) {
		throw new Error(`${testName}: result should be truthy`)
	}

	// Validate content field
	if (!result.content) {
		throw new Error(`${testName}: content field must be present`)
	}
	if (!Array.isArray(result.content)) {
		throw new Error(`${testName}: content must be an array`)
	}
	if (result.content.length === 0) {
		throw new Error(`${testName}: content array must not be empty`)
	}

	// Validate structuredContent field
	if (!result.structuredContent) {
		throw new Error(`${testName}: structuredContent field must be present`)
	}
	if (typeof result.structuredContent !== 'object') {
		throw new Error(`${testName}: structuredContent must be an object`)
	}
	if (Array.isArray(result.structuredContent)) {
		throw new Error(`${testName}: structuredContent must not be an array`)
	}

	return result
}

/**
 * Logs test result in a flexible format for any type of test
 * @param {string} testFileName - The name of the test file
 * @param {string} testName - The name of the specific test
 * @param {object|string} inputOrOptions - For MCP tools: input object. For other tests: options object
 * @param {string} outcome - Test outcome: 'ok', 'ko', or 'skipped'
 * @param {object|string} resultOrError - The MCP tool result (for 'ok') or error message/object (for 'ko'/'skipped')
 */
export function logTestResult(testFileName, testName, inputOrOptions, outcome, resultOrError = null) {
	// Determine if this is a MCP tool test (has resultOrError) or a flexible test
	const isMcpToolTest = resultOrError !== null && resultOrError !== undefined

	let options = {}
	let description = ''
	let errorMessage = ''
	let skipReason = ''

	if (isMcpToolTest) {
		// MCP tool test: inputOrOptions is the input, resultOrError is the result
		options = { input: inputOrOptions, result: resultOrError }
	} else {
		// Flexible test: inputOrOptions is the options object
		options = inputOrOptions || {}
		description = options.description || ''
		errorMessage = options.errorMessage || ''
		skipReason = options.skipReason || ''
	}

	const { input, output, result } = options

	console.log(`\nTEST RESULT FOR ${testFileName}: ${testName}\n`)

	if (description) {
		console.log(`DESCRIPTION: ${description}\n`)
	}

	console.log('OUTCOME:')
	switch (outcome) {
		case 'ok':
			console.log('    ✓ PASS\n')
			break
		case 'ko':
			console.log('    ✗ FAIL')
			if (errorMessage) {
				console.log(`    Error: ${errorMessage}\n`)
			} else if (resultOrError && !isMcpToolTest) {
				const errorMsg = resultOrError instanceof Error ? resultOrError.message : String(resultOrError)
				console.log(`    Error: ${errorMsg}\n`)
			} else {
				console.log('')
			}
			break
		case 'skipped':
			console.log('    ⏭ SKIP')
			if (skipReason) {
				console.log(`    Reason: ${skipReason}\n`)
			} else if (resultOrError && !isMcpToolTest) {
				const skipMsg = resultOrError instanceof Error ? resultOrError.message : String(resultOrError)
				console.log(`    Reason: ${skipMsg}\n`)
			} else {
				console.log('')
			}
			break
		default:
			console.log(`    ? UNKNOWN (${outcome})\n`)
	}

	// Show input only if provided and not empty
	if (input && Object.keys(input).length > 0) {
		console.log('INPUT:')
		console.log('    {')
		Object.entries(input).forEach(([key, value]) => {
			if (typeof value === 'string') {
				console.log(`      ${key}: '${value}'${Object.keys(input).indexOf(key) < Object.keys(input).length - 1 ? ',' : ''}`)
			} else {
				console.log(`      ${key}: ${JSON.stringify(value)}${Object.keys(input).indexOf(key) < Object.keys(input).length - 1 ? ',' : ''}`)
			}
		})
		console.log('    }\n')
	}

	// Show output only if provided (for non-MCP tests)
	if (output && !isMcpToolTest) {
		console.log('OUTPUT:')
		if (typeof output === 'string') {
			console.log(`    ${output}`)
		} else {
			console.log(`    ${JSON.stringify(output, null, 2).split('\n').join('\n    ')}`)
		}
		console.log('')
	}

	// Show result if provided (for MCP tools)
	if (result && outcome === 'ok' && isMcpToolTest) {
		console.log('RESULT:')

		// Display all fields except content and structuredContent first
		const knownFields = ['content', 'structuredContent']
		const otherFields = Object.keys(result).filter(key => !knownFields.includes(key))

		otherFields.forEach(field => {
			console.log(`    ${field}: ${JSON.stringify(result[field])}`)
		})

		if (otherFields.length > 0) {
			console.log('')
		}

		if (result.content) {
			console.log('    content:')
			console.log(`        ${JSON.stringify(result.content, null, 2).split('\n').join('\n        ')}`)
			console.log('')
		}

		if (result.structuredContent) {
			console.log('    structuredContent:')
			console.log(`        ${JSON.stringify(result.structuredContent, null, 2).split('\n').join('\n        ')}`)
			console.log('')
		}
	}
}
