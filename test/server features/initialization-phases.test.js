/**
 * Tests for the new initialization phases system
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {InitializationPhases, WorkspacePathManager, ClientWorkspaceStrategy} from '../../src/lib/initialization.js';

describe('WorkspacePathManager', () => {
	let manager;

	beforeEach(() => {
		manager = new WorkspacePathManager();
	});

	it('should normalize file:// URIs correctly', () => {
		const testPath = 'file:///home/user/project';
		const normalized = manager.normalizeWorkspacePath(testPath);
		
		expect(normalized).toBe('/home/user/project');
	});

	it('should handle comma-separated paths by taking the first one', () => {
		const testPath = '/home/user/project1,/home/user/project2';
		const normalized = manager.normalizeWorkspacePath(testPath);
		
		expect(normalized).toBe('/home/user/project1');
	});

	it('should handle null and undefined paths', () => {
		expect(manager.normalizeWorkspacePath(null)).toBeNull();
		expect(manager.normalizeWorkspacePath(undefined)).toBeNull();
		expect(manager.normalizeWorkspacePath('')).toBe('');
	});

	it('should set path only once', async () => {
		const path1 = '/home/user/project1';
		const path2 = '/home/user/project2';

		// Mock process.chdir to avoid actual directory changes
		const originalChdir = process.chdir;
		const originalCwd = process.cwd;
		process.chdir = vi.fn();
		process.cwd = vi.fn(() => '/different/dir');

		try {
			await manager.setPath(path1);
			expect(manager.pathValue).toBe(path1);
			expect(manager.pathSet).toBe(true);

			// Second call should be ignored
			await manager.setPath(path2);
			expect(manager.pathValue).toBe(path1); // Still the first path
		} finally {
			process.chdir = originalChdir;
			process.cwd = originalCwd;
		}
	});

	it('should resolve ready promise when path is set', async () => {
		const path = '/home/user/project';
		
		// Mock process.chdir to avoid actual directory changes
		const originalChdir = process.chdir;
		const originalCwd = process.cwd;
		process.chdir = vi.fn();
		process.cwd = vi.fn(() => '/different/dir');

		try {
			const readyPromise = manager.waitForPath();
			await manager.setPath(path);
			
			const result = await readyPromise;
			expect(result).toBe(path);
		} finally {
			process.chdir = originalChdir;
			process.cwd = originalCwd;
		}
	});
});

describe('ClientWorkspaceStrategy', () => {
	let strategy;
	let mockClient;
	let mockMcpServer;
	let mockWorkspaceManager;

	beforeEach(() => {
		mockClient = {
			supportsCapability: vi.fn(),
		};
		
		mockMcpServer = {
			server: {
				listRoots: vi.fn(),
			},
		};
		
		mockWorkspaceManager = {
			setPath: vi.fn(),
		};

		strategy = new ClientWorkspaceStrategy(mockClient, mockMcpServer, mockWorkspaceManager);
	});

	it('should use environment variable when available', async () => {
		const originalEnv = process.env.WORKSPACE_FOLDER_PATHS;
		process.env.WORKSPACE_FOLDER_PATHS = '/home/user/project';

		try {
			await strategy.resolveWorkspacePath();
			expect(mockWorkspaceManager.setPath).toHaveBeenCalledWith('/home/user/project');
		} finally {
			if (originalEnv) {
				process.env.WORKSPACE_FOLDER_PATHS = originalEnv;
			} else {
				delete process.env.WORKSPACE_FOLDER_PATHS;
			}
		}
	});

	it('should use roots API when client supports it', async () => {
		const originalEnv = process.env.WORKSPACE_FOLDER_PATHS;
		delete process.env.WORKSPACE_FOLDER_PATHS;

		mockClient.supportsCapability.mockReturnValue(true);
		mockMcpServer.server.listRoots.mockResolvedValue({
			roots: [
				{uri: 'file:///home/user/project', name: 'project'},
			],
		});

		try {
			await strategy.resolveWorkspacePath();
			expect(mockClient.supportsCapability).toHaveBeenCalledWith('roots');
			expect(mockMcpServer.server.listRoots).toHaveBeenCalled();
			expect(mockWorkspaceManager.setPath).toHaveBeenCalledWith('file:///home/user/project');
		} finally {
			if (originalEnv) {
				process.env.WORKSPACE_FOLDER_PATHS = originalEnv;
			}
		}
	});

	it('should handle roots API timeout gracefully', async () => {
		const originalEnv = process.env.WORKSPACE_FOLDER_PATHS;
		delete process.env.WORKSPACE_FOLDER_PATHS;

		mockClient.supportsCapability.mockReturnValue(true);
		mockMcpServer.server.listRoots.mockRejectedValue(new Error('Timeout'));

		try {
			// Should not throw
			await strategy.resolveWorkspacePath();
			expect(mockWorkspaceManager.setPath).not.toHaveBeenCalled();
		} finally {
			if (originalEnv) {
				process.env.WORKSPACE_FOLDER_PATHS = originalEnv;
			}
		}
	});
});

describe('InitializationPhases', () => {
	let phases;
	let mockMcpServer;
	let mockClient;
	let mockState;

	beforeEach(() => {
		mockMcpServer = {
			server: {},
		};
		
		mockClient = {
			initialize: vi.fn(),
			clientInfo: {name: 'test', version: '1.0.0'},
			capabilities: {},
		};
		
		mockState = {
			currentLogLevel: 'info',
			org: {},
		};

		phases = new InitializationPhases(mockMcpServer, mockClient, mockState);
	});

	it('should handle client connection correctly', async () => {
		const params = {
			clientInfo: {name: 'test-client', version: '1.0.0'},
			capabilities: {roots: true},
			protocolVersion: '2025-06-18',
		};

		const result = await phases.handleClientConnection(params);

		expect(mockClient.initialize).toHaveBeenCalledWith({
			clientInfo: params.clientInfo,
			capabilities: params.capabilities,
		});
		
		expect(result.protocolVersion).toBe('2025-06-18');
		expect(result.clientInfo).toBe(params.clientInfo);
		expect(result.capabilities).toBe(params.capabilities);
	});

	it('should handle workspace setup', async () => {
		// Mock the workspace manager
		const mockSetPath = vi.fn();
		const mockWaitForPath = vi.fn().mockResolvedValue('/test/path');
		
		phases.workspaceManager = {
			setPath: mockSetPath,
			waitForPath: mockWaitForPath,
		};
		
		phases.workspaceStrategy = {
			resolveWorkspacePath: vi.fn(),
		};

		const result = await phases.handleWorkspaceSetup();

		expect(phases.workspaceStrategy.resolveWorkspacePath).toHaveBeenCalled();
		expect(mockWaitForPath).toHaveBeenCalled();
		expect(result).toBe('/test/path');
		expect(mockState.workspacePath).toBe('/test/path');
	});

	it('should handle core initialization', async () => {
		const mockUpdateOrgAndUserDetails = vi.fn();

		await phases.handleCoreInitialization(mockUpdateOrgAndUserDetails);

		expect(mockUpdateOrgAndUserDetails).toHaveBeenCalled();
	});

	// Note: Post-initialization runs asynchronously, so we test its components separately
	it('should start org watcher when org details are available', () => {
		mockState.org.username = 'test@example.com';
		
		const mockTargetOrgWatcher = {
			start: vi.fn(),
		};
		
		const mockUpdateOrgAndUserDetails = vi.fn();

		phases.startOrgWatcher(mockTargetOrgWatcher, mockUpdateOrgAndUserDetails);

		expect(mockTargetOrgWatcher.start).toHaveBeenCalledWith(
			mockUpdateOrgAndUserDetails,
			mockState.org.alias
		);
	});
});