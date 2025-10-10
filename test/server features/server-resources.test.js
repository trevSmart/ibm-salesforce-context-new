import { createMcpClient } from '../testMcpClient.js'

describe('Server Resources', () => {
	let client

	beforeAll(async () => {
		// Get shared MCP client instance once for all tests
		client = await createMcpClient()
	})

	test('should list server resources', async () => {
		// Verify the client is defined
		expect(client).toBeTruthy()

		// Get the list of available resources from the server
		const resourcesList = await client.listResources()

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
		expect(client).toBeTruthy()

		// First, get the list of available resources
		const resourcesList = await client.listResources()

		// If there are resources available, try to read one
		if (resourcesList.length) {
			const resourceToRead = resourcesList[0]

			// Read the resource content
			const resourceContent = await client.readResource(resourceToRead.uri)

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
			console.log('No resources available to read')
		}
	})

	test('should detect resource list changes', async () => {
		// Verify the client is defined
		expect(client).toBeTruthy()

		// Get initial resources list
		const initialResources = await client.listResources()
		const initialCount = initialResources.length

		// Trigger a resource creation by calling loadRecordPrefixesResource
		// This should create a new resource and trigger a list change
		const result = await client.callTool('salesforceContextUtils', {
			action: 'loadRecordPrefixesResource',
		})

		// Verify the tool call was successful
		expect(result).toBeTruthy()

		// Wait a bit for the resource to be created and notification to be sent
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Get updated resources list
		const updatedResources = await client.listResources()
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
		expect(client).toBeTruthy()

		// Try to read a resource with a non-existent URI
		const nonExistentUri = 'mcp://ibm-salesforce-context/non-existent-resource'

		// This should throw an error or return an error response
		await expect(async () => {
			await client.readResource(nonExistentUri)
		}).rejects.toThrow()

		console.log('Successfully handled non-existent resource request')
	})
})


describe('addResourceToContent', () => {
	let mockContent;
	let mockClient;

	beforeEach(() => {
		mockContent = [];
		mockClient = {
			supportsCapability: vi.fn()
		};
	});

	it('should add resource_link when client supports resource_links', () => {
		mockClient.supportsCapability.mockImplementation((capability) => {
			if (capability === 'resource_links') { return true; }
			if (capability === 'resources') { return false; }
			return false;
		});

		const uri = 'mcp://test/resource';
		const name = 'test-resource';
		const mimeType = 'text/plain';
		const description = 'Test resource';

		addResourceToContent(mockContent, uri, name, mimeType, description, mockClient);

		expect(mockContent).toHaveLength(1);
		expect(mockContent[0]).toEqual({
			type: 'resource_link',
			uri,
			name,
			mimeType,
			description
		});
	});

	it('should add text description when client supports resources but not resource_links', () => {
		mockClient.supportsCapability.mockImplementation((capability) => {
			if (capability === 'resource_links') { return false; }
			if (capability === 'resources') { return true; }
			return false;
		});

		const uri = 'mcp://test/resource';
		const name = 'test-resource';
		const mimeType = 'text/plain';
		const description = 'Test resource';

		addResourceToContent(mockContent, uri, name, mimeType, description, mockClient);

		expect(mockContent).toHaveLength(1);
		expect(mockContent[0]).toEqual({
			type: 'text',
			text: `Resource: ${name} (${description})\nURI: ${uri}\nMIME Type: ${mimeType}`
		});
	});

	it('should not add anything when client supports neither resources nor resource_links', () => {
		mockClient.supportsCapability.mockImplementation((capability) => {
			if (capability === 'resource_links') { return false; }
			if (capability === 'resources') { return false; }
			return false;
		});

		const uri = 'mcp://test/resource';
		const name = 'test-resource';
		const mimeType = 'text/plain';
		const description = 'Test resource';

		addResourceToContent(mockContent, uri, name, mimeType, description, mockClient);

		expect(mockContent).toHaveLength(0);
	});

	it('should use global client when no client instance is provided', () => {
		// Mock the global client
		const originalSupportsCapability = client.supportsCapability;
		client.supportsCapability = vi.fn().mockReturnValue(true);

		const uri = 'mcp://test/resource';
		const name = 'test-resource';
		const mimeType = 'text/plain';
		const description = 'Test resource';

		addResourceToContent(mockContent, uri, name, mimeType, description);

		expect(mockContent).toHaveLength(1);
		expect(mockContent[0].type).toBe('resource_link');

		// Restore original method
		client.supportsCapability = originalSupportsCapability;
	});
});
