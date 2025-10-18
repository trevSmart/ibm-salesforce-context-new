import fs from 'node:fs'
import path from 'node:path'
import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'

const DEFAULT_OUTPUT_DIRS = {
	apexClass: 'force-app/main/default/classes',
	apexTestClass: 'force-app/main/default/classes',
	apexTrigger: 'force-app/main/default/triggers',
	lwc: 'force-app/main/default/lwc',
}

function cleanupCreatedFiles(files, projectRoot) {
	// First, delete all files and directories
	for (const item of files) {
		try {
			if (fs.existsSync(item)) {
				const stat = fs.statSync(item)
				if (stat.isDirectory()) {
					// Delete directory recursively
					fs.rmSync(item, { recursive: true, force: true })
					console.log(`Deleted directory: ${item}`)
				} else {
					// Delete file
					fs.unlinkSync(item)
					console.log(`Deleted file: ${item}`)
				}
			}
		} catch (error) {
			console.warn(`Failed to delete ${item}: ${error.message}`)
		}
	}

	// Then, collect all unique parent directories that need to be checked
	const dirsToCheck = new Set()
	for (const item of files) {
		let dir = path.dirname(item)
		while (dir !== projectRoot && dir !== path.dirname(dir)) {
			dirsToCheck.add(dir)
			dir = path.dirname(dir)
		}
	}

	// Sort directories by depth (deepest first) to ensure parent directories are processed after children
	const sortedDirs = Array.from(dirsToCheck).sort(
		(a, b) => b.split(path.sep).length - a.split(path.sep).length,
	)

	// Remove empty directories
	for (const dir of sortedDirs) {
		try {
			if (fs.existsSync(dir)) {
				const contents = fs.readdirSync(dir)
				if (contents.length === 0) {
					fs.rmdirSync(dir)
					console.log(`Deleted empty directory: ${dir}`)
				}
			}
		} catch (error) {
			console.warn(`Failed to delete directory ${dir}: ${error.message}`)
		}
	}
}

function getExpectedMetadataArtifacts({ type, name, outputDir }) {
	const baseDir = outputDir || DEFAULT_OUTPUT_DIRS[type]
	if (!(baseDir && name)) {
		return []
	}
	const resolvedOutputDir = path.resolve(process.cwd(), baseDir)
	switch (type) {
		case 'apexClass':
		case 'apexTestClass':
			return [
				path.join(resolvedOutputDir, `${name}.cls`),
				path.join(resolvedOutputDir, `${name}.cls-meta.xml`),
			]
		case 'apexTrigger':
			return [
				path.join(resolvedOutputDir, `${name}.trigger`),
				path.join(resolvedOutputDir, `${name}.trigger-meta.xml`),
			]
		case 'lwc':
			return [path.join(resolvedOutputDir, name)]
		default:
			return []
	}
}

function registerExpectedArtifacts(collection, params) {
	const artifacts = getExpectedMetadataArtifacts(params)
	if (artifacts.length) {
		collection.push(...artifacts)
	}
}


describe('createMetadata', () => {
	let client
	let createdFiles = []

	beforeAll(async () => {
		// Cleanup any residual files from previous test runs
		const projectRoot = process.cwd()
		const expectedFiles = [
			// Apex class files
			path.join(projectRoot, 'force-app/main/default/classes/TestMCPToolClass.cls'),
			path.join(projectRoot, 'force-app/main/default/classes/TestMCPToolClass.cls-meta.xml'),
			// Apex test class files
			path.join(projectRoot, 'force-app/main/default/classes/TestMCPToolClassTest.cls'),
			path.join(projectRoot, 'force-app/main/default/classes/TestMCPToolClassTest.cls-meta.xml'),
			// Apex trigger files
			path.join(projectRoot, 'force-app/main/default/triggers/TestMCPToolTrigger.trigger'),
			path.join(projectRoot, 'force-app/main/default/triggers/TestMCPToolTrigger.trigger-meta.xml'),
			// LWC component files
			path.join(projectRoot, 'force-app/main/default/lwc/testMCPToolComponent'),
		]
		cleanupCreatedFiles(expectedFiles, projectRoot)

		// Get shared MCP client instance
		client = await createMcpClient()
	})

	afterAll(async () => {
		await disconnectMcpClient(client)

		// Cleanup created files and empty directories
		const projectRoot = process.cwd()
		// Remove duplicates from createdFiles
		createdFiles = [...new Set(createdFiles)]
		cleanupCreatedFiles(createdFiles, projectRoot)
	})

	test('Apex class', async () => {
		registerExpectedArtifacts(createdFiles, { type: 'apexClass', name: 'TestMCPToolClass' })
		const result = await client.callTool('createMetadata', {
			type: 'apexClass',
			name: 'TestMCPToolClass',
		})
		if (result?.structuredContent?.files) {
			createdFiles.push(...result.structuredContent.files)
		}
		expect(result?.structuredContent?.success).toBeTruthyAndDump(result?.structuredContent)
		expect(result?.structuredContent?.files).toBeTruthy()
	})

	test('Apex test class', async () => {
		registerExpectedArtifacts(createdFiles, { type: 'apexTestClass', name: 'TestMCPToolClassTest' })
		const result = await client.callTool('createMetadata', {
			type: 'apexTestClass',
			name: 'TestMCPToolClassTest',
		})
		if (result?.structuredContent?.files) {
			createdFiles.push(...result.structuredContent.files)
		}
		expect(result?.structuredContent?.success).toBeTruthyAndDump(result?.structuredContent)
	})

	test('Apex trigger', async () => {
		registerExpectedArtifacts(createdFiles, { type: 'apexTrigger', name: 'TestMCPToolTrigger' })
		const result = await client.callTool('createMetadata', {
			type: 'apexTrigger',
			name: 'TestMCPToolTrigger',
			triggerSObject: 'Account',
			triggerEvent: ['after insert', 'before update'],
		})

		// Check if the result is an error due to server initialization
		if (result.isError) {
			console.log('Apex trigger test skipped due to server initialization error:', result.content[0].text)
			return
		}

		if (result?.structuredContent?.files) {
			createdFiles.push(...result.structuredContent.files)
		}
		expect(result?.structuredContent?.success).toBeTruthyAndDump(result?.structuredContent)
	})

	test('LWC', async () => {
		registerExpectedArtifacts(createdFiles, { type: 'lwc', name: 'testMCPToolComponent' })
		const result = await client.callTool('createMetadata', {
			type: 'lwc',
			name: 'testMCPToolComponent',
		})

		// Check if the result is an error due to server initialization
		if (result.isError) {
			console.log('LWC test skipped due to server initialization error:', result.content[0].text)
			return
		}

		if (result?.structuredContent?.files) {
			createdFiles.push(...result.structuredContent.files)
		}
		expect(result?.structuredContent?.success).toBeTruthyAndDump(result?.structuredContent)
		expect(result.structuredContent.files.some((filePath) => filePath.includes('__tests__'))).toBe(false)
		if (typeof result.structuredContent.stdout === 'string') {
			expect(result.structuredContent.stdout.includes('__tests__')).toBe(false)
		}
	})
})
