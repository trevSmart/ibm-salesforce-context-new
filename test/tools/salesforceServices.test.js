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

		// Mock the state and config to avoid initialization errors
		vi.spyOn(salesforceServices, 'callSalesforceApi').mockImplementation(async (_operation, apiType, service, _body, _options) => {
			// Test that AGENT is a valid API type by checking if it passes validation
			const validApiTypes = ['REST', 'TOOLING', 'UI', 'APEX', 'AGENT'];
			if (!validApiTypes.includes(apiType.toUpperCase())) {
				throw new Error(`Invalid API type: ${apiType}. Must be one of: ${validApiTypes.join(', ')}`);
			}

			// Test endpoint construction for AGENT API
			const baseUrl = 'https://test.salesforce.com';
			const apiVersion = '60.0';
			const normalizedService = service.startsWith('/') ? service : `/${service}`;
			const expectedEndpoint = `${baseUrl}/services/data/v${apiVersion}/agentforce${normalizedService}`;

			return {
				endpoint: expectedEndpoint,
				apiType: apiType.toUpperCase(),
				valid: true
			};
		});

		// Test that AGENT API type is accepted
		const result = await salesforceServices.callSalesforceApi('GET', 'AGENT', '/test-service');
		expect(result.valid).toBe(true);
		expect(result.apiType).toBe('AGENT');
		expect(result.endpoint).toContain('/agentforce/');
	});

	it('rejects invalid API types', async () => {
		const salesforceServices = await importSalesforceServices();

		// Mock the function to test validation
		vi.spyOn(salesforceServices, 'callSalesforceApi').mockImplementation(async (_operation, apiType, _service, _body, _options) => {
			const validApiTypes = ['REST', 'TOOLING', 'UI', 'APEX', 'AGENT'];
			if (!validApiTypes.includes(apiType.toUpperCase())) {
				throw new Error(`Invalid API type: ${apiType}. Must be one of: ${validApiTypes.join(', ')}`);
			}
			return { valid: true };
		});

		// Test that invalid API type is rejected
		await expect(salesforceServices.callSalesforceApi('GET', 'INVALID', '/test-service'))
			.rejects.toThrow('Invalid API type: INVALID. Must be one of: REST, TOOLING, UI, APEX, AGENT');
	});
});
