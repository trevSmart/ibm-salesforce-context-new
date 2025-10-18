import { afterEach, beforeAll, afterAll, beforeEach, describe, expect, it, test, vi } from 'vitest'

import clientModule from '../../src/client.js'
import { addResourceToContent } from '../../src/utils.js'
import { createMcpClient, disconnectMcpClient } from '../testMcpClient.js'
import { logTestResult } from '../testUtils.js'

describe('Server Resources', () => {
        let mcpClient

        beforeAll(async () => {
		try {
			// Get shared MCP client instance once for all tests
			mcpClient = await createMcpClient()
		} catch (error) {
			console.error('Failed to create MCP client:', error)
			// Re-throw to ensure test fails rather than skips
			throw error
		}
        })

        afterAll(async () => {
                await disconnectMcpClient(mcpClient)
        })

        test('should list server resources', async () => {
                // Verify the client is defined
                expect(mcpClient).toBeTruthy()

                // Get the list of available resources from the server
                const resourcesList = await mcpClient.listResources()

		logTestResult('server-resources.test.js', 'List server resources', {}, 'ok', {
			description: 'Tests that server can list available resources',
			output: `Retrieved ${resourcesList.length} resources`
		})

		// Verify we received a resources list
		expect(resourcesList).toBeTruthy()
		expect(Array.isArray(resourcesList)).toBe(true)

		// Verify the structure of resource items if any exist
		if (resourcesList.length > 0) {
			const firstResource = resourcesList[0]
			expect(firstResource).toHaveProperty('uri')
			expect(firstResource).toHaveProperty('name')
			expect(firstResource).toHaveProperty('description')
			expect(firstResource).toHaveProperty('mimeType')
		}

		console.log(`Successfully retrieved ${resourcesList.length} resources from the server`)
	})

        test('should read server resource', async () => {
                // Verify the client is defined
                expect(mcpClient).toBeTruthy()

		// First, get the list of available resources
                const resourcesList = await mcpClient.listResources()

		// If there are resources available, try to read one
		if (resourcesList.length) {
			const resourceToRead = resourcesList[0]

			// Read the resource content
                        const resourceContent = await mcpClient.readResource(resourceToRead.uri)

			logTestResult('server-resources.test.js', 'Read server resource', {
				resourceUri: resourceToRead.uri
			}, 'ok', {
				description: 'Tests that server can read resource content',
				output: `Read resource: ${resourceToRead.name}`
			})

			// Verify we received resource content
			expect(resourceContent).toBeTruthy()
			expect(resourceContent).toHaveProperty('contents')
			expect(Array.isArray(resourceContent.contents)).toBe(true)
			expect(resourceContent.contents.length).toBeGreaterThan(0)

			// Verify the structure of the resource content
			const content = resourceContent.contents[0]
			expect(content).toHaveProperty('uri')
			expect(content).toHaveProperty('text')

			console.log(`Successfully read resource: ${resourceToRead.name}`)
		} else {
			logTestResult('server-resources.test.js', 'Read server resource', {}, 'ok', {
				description: 'Tests that server can read resource content',
				output: 'No resources available to read'
			})
			console.log('No resources available to read')
		}
	})

        test('should detect resource list changes', async () => {
                // Verify the client is defined
                expect(mcpClient).toBeTruthy()

		// Get initial resources list
                const initialResources = await mcpClient.listResources()
		const initialCount = initialResources.length

		// Trigger a resource creation by calling loadRecordPrefixesResource
		// This should create a new resource and trigger a list change
                const result = await mcpClient.callTool('salesforceContextUtils', {
			action: 'loadRecordPrefixesResource',
		})

		logTestResult('server-resources.test.js', 'Detect resource list changes', {
			action: 'loadRecordPrefixesResource'
		}, 'ok', {
			description: 'Tests that server can detect resource list changes',
			output: `Resource count: ${initialCount} -> ${initialCount} (may increase)`
		})

		// Verify the tool call was successful caixa
		expect(result).toBeTruthy()

		// Wait a bit for the resource to be created and notification to be sent
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Get updated resources list
                const updatedResources = await mcpClient.listResources()
		const updatedCount = updatedResources.length

		// Verify that the resource list has changed
		// The count should be greater than or equal to the initial count
		expect(updatedCount).toBeGreaterThanOrEqual(initialCount)

		// Verify that the new resource exists
		const recordPrefixesResource = updatedResources.find(
			resource =>
				resource.uri.includes('record-prefixes') || resource.name.includes('record prefixes'),
		)
		expect(recordPrefixesResource).toBeTruthy()

		console.log(`Resource list changed: ${initialCount} -> ${updatedCount} resources`)
		console.log('Successfully detected resource list changes')
	})

        test('should handle reading non-existent resource', async () => {
                // Verify the client is defined
                expect(mcpClient).toBeTruthy()

		// Try to read a resource with a non-existent URI
		const nonExistentUri = 'mcp://ibm-salesforce-context/non-existent-resource'

		logTestResult('server-resources.test.js', 'Handle non-existent resource', {
			resourceUri: nonExistentUri
		}, 'ok', {
			description: 'Tests that server properly handles requests for non-existent resources',
			output: 'Expected to throw error for non-existent resource'
		})

		// This should throw an error or return an error response
		await expect(async () => {
                        await mcpClient.readResource(nonExistentUri)
		}).rejects.toThrow()

		console.log('Successfully handled non-existent resource request')
	})
})


describe('addResourceToContent', () => {
        let mockContent
        let originalSupportsCapability

        beforeEach(() => {
                mockContent = []
                originalSupportsCapability = clientModule.supportsCapability
        })

        afterEach(() => {
                clientModule.supportsCapability = originalSupportsCapability
        })

        it('should add resource_link when client supports resource_links', () => {
                clientModule.supportsCapability = vi.fn((capability) => {
                        if (capability === 'resource_links') {
                                return true
                        }
                        if (capability === 'resources') {
                                return false
                        }
                        return false
                })

                const resource = {
                        uri: 'mcp://test/resource',
                        name: 'test-resource',
                        mimeType: 'text/plain',
                        description: 'Test resource'
                }

                addResourceToContent(mockContent, resource)

		logTestResult('server-resources.test.js', 'Add resource_link', {
			capability: 'resource_links',
			resourceUri: resource.uri
		}, 'ok', {
			description: 'Tests that addResourceToContent adds resource_link when client supports resource_links',
			output: 'Added resource_link to content'
		})

                expect(mockContent).toHaveLength(1)
                expect(mockContent[0]).toEqual({
                        type: 'resource_link',
                        uri: resource.uri,
                        name: resource.name,
                        mimeType: resource.mimeType,
                        description: resource.description
                })
        })

        it('should add resource attachment when client supports resources but not resource_links', () => {
                clientModule.supportsCapability = vi.fn((capability) => {
                        if (capability === 'resource_links') {
                                return false
                        }
                        if (capability === 'resources') {
                                return true
                        }
                        return false
                })

                const resource = {
                        uri: 'mcp://test/resource',
                        name: 'test-resource',
                        mimeType: 'text/plain',
                        description: 'Test resource'
                }

                addResourceToContent(mockContent, resource)

		logTestResult('server-resources.test.js', 'Add resource attachment', {
			capability: 'resources',
			resourceUri: resource.uri
		}, 'ok', {
			description: 'Tests that addResourceToContent adds resource attachment when client supports resources but not resource_links',
			output: 'Added resource attachment to content'
		})

                expect(mockContent).toHaveLength(1)
                expect(mockContent[0]).toEqual({
                        type: 'resource',
                        resource
                })
        })

        it('should not add anything when client supports neither resources nor resource_links', () => {
                clientModule.supportsCapability = vi.fn(() => false)

                const resource = {
                        uri: 'mcp://test/resource',
                        name: 'test-resource',
                        mimeType: 'text/plain',
                        description: 'Test resource'
                }

                addResourceToContent(mockContent, resource)

		logTestResult('server-resources.test.js', 'No capabilities support', {
			capability: 'none'
		}, 'ok', {
			description: 'Tests that addResourceToContent does not add anything when client supports neither resources nor resource_links',
			output: 'No content added (client supports no capabilities)'
		})

                expect(mockContent).toHaveLength(0)
        })

        it('should rely on global client capabilities when no override is provided', () => {
                clientModule.supportsCapability = vi.fn((capability) => capability === 'resource_links')

                const resource = {
                        uri: 'mcp://test/resource',
                        name: 'test-resource',
                        mimeType: 'text/plain',
                        description: 'Test resource'
                }

                addResourceToContent(mockContent, resource)

		logTestResult('server-resources.test.js', 'Global client capabilities', {
			capability: 'resource_links'
		}, 'ok', {
			description: 'Tests that addResourceToContent relies on global client capabilities when no override is provided',
			output: 'Used global client capabilities'
		})

                expect(clientModule.supportsCapability).toHaveBeenCalledWith('resource_links')
                expect(mockContent).toHaveLength(1)
                expect(mockContent[0]).toEqual({
                        type: 'resource_link',
                        uri: resource.uri,
                        name: resource.name,
                        mimeType: resource.mimeType,
                        description: resource.description
                })
        })
})
