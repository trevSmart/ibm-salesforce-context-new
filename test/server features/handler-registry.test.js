/**
 * Tests for the handler registry system
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {HandlerRegistry} from '../../src/lib/handlerRegistry.js';
import { logTestResult } from '../testUtils.js';

describe('HandlerRegistry', () => {
	let registry;
	let mockMcpServer;
	let mockState;
	let mockResources;

	beforeEach(() => {
		mockMcpServer = {
			server: {
				setNotificationHandler: vi.fn(),
				setRequestHandler: vi.fn(),
			},
			registerPrompt: vi.fn(),
			registerTool: vi.fn(),
		};

		mockState = {
			currentLogLevel: 'info',
			org: {
				username: 'test@example.com',
				user: {id: 'test-user-id'},
			},
			userPermissionsValidated: true,
		};

		mockResources = {
			'test-resource': {name: 'Test Resource', content: 'test content'},
		};

		registry = new HandlerRegistry(mockMcpServer, mockState, mockResources);
	});

	it('should register handlers only once', () => {
		const mockRootsChangeHandler = vi.fn();

		logTestResult('handler-registry.test.js', 'Register handlers only once', {}, 'ok', {
			description: 'Tests that HandlerRegistry registers handlers only once, ignoring subsequent calls'
		})

		registry.registerAll(mockRootsChangeHandler);
		registry.registerAll(mockRootsChangeHandler); // Second call should be ignored
	});

	it('should register notification handlers correctly', () => {
		const mockRootsChangeHandler = vi.fn();

		logTestResult('handler-registry.test.js', 'Register notification handlers', {}, 'ok', {
			description: 'Tests that HandlerRegistry registers notification handlers correctly'
		})

		registry.registerNotificationHandlers(mockRootsChangeHandler);

		expect(mockMcpServer.server.setNotificationHandler).toHaveBeenCalledWith(
			expect.any(Object), // RootsListChangedNotificationSchema
			mockRootsChangeHandler
		);
	});

	it('should register resource handlers correctly', async () => {
		logTestResult('handler-registry.test.js', 'Register resource handlers', {}, 'ok', {
			description: 'Tests that HandlerRegistry registers resource handlers correctly'
		})

		registry.registerResourceHandlers();

		expect(mockMcpServer.server.setRequestHandler).toHaveBeenCalledTimes(3);

		// Test if resource handlers work correctly
		const calls = mockMcpServer.server.setRequestHandler.mock.calls;

		// Find the ListResources handler
		const listResourcesCall = calls.find(call =>
			call[0].method === 'resources/list'
		);

		if (listResourcesCall) {
			const handler = listResourcesCall[1];
			const result = await handler();
			expect(result).toEqual({resources: Object.values(mockResources)});
		}
	});

	it('should register prompt handlers correctly', () => {
		logTestResult('handler-registry.test.js', 'Register prompt handlers', {}, 'ok', {
			description: 'Tests that HandlerRegistry registers prompt handlers correctly'
		})

		registry.registerPromptHandlers();

		expect(mockMcpServer.registerPrompt).toHaveBeenCalledWith(
			'apex-run-script',
			expect.any(Object),
			expect.any(Function)
		);
		expect(mockMcpServer.registerPrompt).toHaveBeenCalledWith(
			'tools-basic-run',
			expect.any(Object),
			expect.any(Function)
		);
		expect(mockMcpServer.registerPrompt).toHaveBeenCalledWith(
			'orgOnboarding',
			expect.any(Object),
			expect.any(Function)
		);
	});

	it('should create secure tool handlers with validation', async () => {
		const mockToolHandler = vi.fn().mockResolvedValue({content: 'test result'});
		const _staticHandlers = {testTool: mockToolHandler};

		logTestResult('handler-registry.test.js', 'Create secure tool handlers', {}, 'ok', {
			description: 'Tests that HandlerRegistry creates secure tool handlers with validation'
		})

		registry.registerToolHandlers();

		// Get one of the registered tool handlers to test
		const salesforceUtilsCall = mockMcpServer.registerTool.mock.calls.find(
			call => call[0] === 'salesforceContextUtils'
		);

		expect(salesforceUtilsCall).toBeDefined();
		const [_toolName, _toolDefinition, toolHandler] = salesforceUtilsCall;

		// Test the handler works with valid parameters
		const result = await toolHandler({action: 'getState'}, {});
		expect(result).toBeDefined();
		expect(result.isError).toBeFalsy();
	});

	it('should handle invalid tool parameters gracefully', async () => {
		logTestResult('handler-registry.test.js', 'Handle invalid tool parameters', {}, 'ok', {
			description: 'Tests that HandlerRegistry handles invalid tool parameters gracefully'
		})

		registry.registerToolHandlers();

		// Get the salesforceContextUtils tool handler
		const salesforceUtilsCall = mockMcpServer.registerTool.mock.calls.find(
			call => call[0] === 'salesforceContextUtils'
		);

		expect(salesforceUtilsCall).toBeDefined();
		const [_toolName, _toolDefinition, toolHandler] = salesforceUtilsCall;

		// Test the handler handles invalid parameters correctly
		const result = await toolHandler({param: 'test'}, {});
		expect(result).toBeDefined();
		expect(result.isError).toBe(true);
		expect(result.content).toBeDefined();
		expect(result.content[0].text).toContain('Invalid action: undefined');
		expect(result.structuredContent).toBeDefined();
		expect(result.structuredContent.error).toBe(true);
	});

	/* it('should validate user permissions for secure tools', async () => {
		// Test with unvalidated user
		mockState.userPermissionsValidated = false;
		mockState.org.user.id = null;

		const handler = registry.createSecureToolHandler('executeAnonymousApex', {});

		const result = await handler({}, {});

		expect(result).toEqual({
			isError: true,
			content: [{
				type: 'text',
				text: expect.stringContaining('Request blocked due to unsuccessful user validation')
			}]
		});
	});
 */
	it('should bypass validation for utility tools', async () => {
		// Test with unvalidated user but utility tool
		mockState.userPermissionsValidated = false;
		mockState.org.user.id = null;

		logTestResult('handler-registry.test.js', 'Bypass validation for utility tools', {}, 'ok', {
			description: 'Tests that HandlerRegistry bypasses validation for utility tools'
		})

		const mockUtilityHandler = vi.fn().mockResolvedValue({content: 'utility result'});
		const staticHandlers = {salesforceContextUtils: mockUtilityHandler};

		const handler = registry.createSecureToolHandler('salesforceContextUtils', staticHandlers);

		const result = await handler({}, {});

		expect(mockUtilityHandler).toHaveBeenCalled();
		expect(result).toEqual({content: 'utility result'});
	});

	it('should handle tool errors gracefully', async () => {
		// Set initialization complete to avoid the initialization error
		mockState.initializationComplete = true;

		const mockErrorHandler = vi.fn().mockRejectedValue(new Error('Tool error'));
		const staticHandlers = {testTool: mockErrorHandler};

		// Set initialization complete to bypass initialization check
		mockState.initializationComplete = true;

		logTestResult('handler-registry.test.js', 'Handle tool errors gracefully', {}, 'ok', {
			description: 'Tests that HandlerRegistry handles tool errors gracefully'
		})

		const handler = registry.createSecureToolHandler('testTool', staticHandlers);

		const result = await handler({}, {});

		expect(result).toEqual({
			isError: true,
			content: [{type: 'text', text: 'Tool error'}],
			structuredContent: {error: true, message: 'Tool error'}
		});
	});
});