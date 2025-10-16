import {createServer} from 'node:http';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const HTTPS_ENDPOINT = 'https://test.salesforce.com';
const HTTP_ENDPOINT = 'http://test.salesforce.com';

async function importModules() {
	const configModule = await import('../../src/config.js');
	const networkUtilsModule = await import('../../src/lib/networkUtils.js');
	return {config: configModule.default, applyFetchSslOptions: networkUtilsModule.applyFetchSslOptions};
}

async function importSalesforceServices() {
	const salesforceServicesModule = await import('../../src/lib/salesforceServices.js');
	return salesforceServicesModule;
}

describe('Salesforce Services SSL Configuration', () => {
	const originalEnv = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

	beforeEach(() => {
		vi.resetModules();
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalEnv;
	});

	afterEach(() => {
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalEnv;
	});

	it('exposes strictSsl configuration parameter', async () => {
		const {config} = await importModules();
		expect(typeof config.strictSsl).toBe('boolean');
	});

	it('does not relax TLS when strictSsl is true', async () => {
		const {config, applyFetchSslOptions} = await importModules();
		config.strictSsl = true;

		// Store the original value before calling applyFetchSslOptions
		const beforeValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		applyFetchSslOptions(HTTPS_ENDPOINT, {});

		// The value should remain unchanged when strictSsl is true
		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe(beforeValue);
	});

	it('relaxes TLS when strictSsl is false', async () => {
		const {config, applyFetchSslOptions} = await importModules();
		config.strictSsl = false;

		applyFetchSslOptions(HTTPS_ENDPOINT, {});

		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
	});

	it('does not change TLS setting for non-HTTPS endpoints', async () => {
		const {config, applyFetchSslOptions} = await importModules();
		config.strictSsl = false;

		// Store the original value before calling applyFetchSslOptions
		const beforeValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		applyFetchSslOptions(HTTP_ENDPOINT, {});

		// The value should remain unchanged for non-HTTPS endpoints
		expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe(beforeValue);
	});
});

describe('Salesforce Services API Types', () => {
	it('validates that AGENT API type is supported', async () => {
		const salesforceServices = await importSalesforceServices();
		const {state} = await import('../../src/mcp-server.js');

		const serverRequests = [];
		const server = createServer((request, response) => {
			serverRequests.push({
				method: request.method,
				url: request.url,
				headers: request.headers
			});

			response.setHeader('Content-Type', 'application/json');
			response.end(
				JSON.stringify({
					receivedUrl: request.url,
					receivedMethod: request.method
				})
			);
		});

		await new Promise((resolve) => {
			server.listen(0, '127.0.0.1', resolve);
		});

		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('Unable to determine test server address');
		}

		const originalOrg = state.org;

		state.org = {
			...originalOrg,
			id: '00D000000000001',
			instanceUrl: `http://127.0.0.1:${address.port}`,
			accessToken: 'test-token',
			apiVersion: '60.0'
		};

		try {
			const result = await salesforceServices.callSalesforceApi('GET', 'AGENT', '/test-service');

			expect(serverRequests).toHaveLength(1);
			expect(serverRequests[0].url).toBe('/services/data/v60.0/agentforce/test-service');
			expect(serverRequests[0].method).toBe('GET');
			expect(serverRequests[0].headers.authorization).toBe('Bearer test-token');
			expect(result).toEqual({
				receivedUrl: '/services/data/v60.0/agentforce/test-service',
				receivedMethod: 'GET'
			});
		} finally {
			await new Promise((resolve, reject) => {
				server.close((error) => {
					error ? reject(error) : resolve();
				});
			});
			state.org = originalOrg;
		}
	});

	it('rejects invalid API types', async () => {
		const salesforceServices = await importSalesforceServices();

		const result = await salesforceServices.callSalesforceApi('GET', 'INVALID', '/test-service');

		expect(result.isError).toBe(true);
		expect(result.content?.[0]?.text).toContain(
			'Invalid API type: INVALID. Must be one of: REST, TOOLING, UI, APEX, AGENT'
		);
	});
});
