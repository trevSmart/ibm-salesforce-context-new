import {describe, it, expect, beforeEach, vi} from 'vitest';
import {addResourceToContent} from '../src/utils.js';
import client from '../src/client.js';

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
